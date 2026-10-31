import { safeImage, safeLink } from './urls.js';

// Posts are a small Markdown: ## headings, > quotes, lists, ``` code, photos, **bold**, *italic*, `code`, [links](url).
// It parses to plain data, so nothing in a post can become HTML.

// Spans are capped in length so a stray marker can't send a pattern searching the whole post.
const INLINE = [
  { type: 'code', pattern: /`([^`\n]{1,400})`/g },
  { type: 'escape', pattern: /\\([\\`*_[\]()#>!-])/g },
  { type: 'link', pattern: /\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g },
  { type: 'strong', pattern: /\*\*(?=\S)(.{0,400}?\S)\*\*/g },
  { type: 'em', pattern: /\*(?=[^\s*])([^*]{0,400}?[^\s*])\*/g },
];

export function inline(text) {
  const tokens = [];
  const pushText = (value) => {
    if (!value) return;
    if (tokens.at(-1)?.type === 'text') tokens.at(-1).value += value;
    else tokens.push({ type: 'text', value });
  };

  // Each rule's next match is kept until the text before it is used up.
  const upcoming = new Map();
  let at = 0;
  const next = (rule) => {
    const known = upcoming.get(rule);
    if (known === null || (known && known.index >= at)) return known;
    rule.pattern.lastIndex = at;
    const match = rule.pattern.exec(text);
    upcoming.set(rule, match);
    return match;
  };

  while (at < text.length) {
    // The earliest match wins; on a tie, the rule listed first.
    let found = null;
    for (const rule of INLINE) {
      const match = next(rule);
      if (match && (!found || match.index < found.match.index)) found = { rule, match };
    }
    if (!found) {
      pushText(text.slice(at));
      break;
    }
    const { rule, match } = found;
    pushText(text.slice(at, match.index));
    if (rule.type === 'code') tokens.push({ type: 'code', value: match[1] });
    else if (rule.type === 'escape') pushText(match[1]);
    else if (rule.type === 'link') {
      const href = safeLink(match[2]);
      if (href) tokens.push({ type: 'link', href, children: inline(match[1]) });
      else inline(match[1]).forEach((token) => (token.type === 'text' ? pushText(token.value) : tokens.push(token)));
    } else tokens.push({ type: rule.type, children: inline(match[1]) });
    at = match.index + match[0].length;
  }
  return tokens;
}

const FENCE = /^```/;
const HEADING = /^#{1,3}\s+(.+)$/;
const QUOTE = /^>\s?(.*)$/;
const BULLET = /^[-*]\s+(.+)$/;
const NUMBERED = /^\d+[.)]\s+(.+)$/;
const PHOTO = /^!\[([^\]\n]*)\]\((\S+?)(?:\s+"([^"\n]*)")?\)$/;
const STARTS_BLOCK = [FENCE, HEADING, QUOTE, BULLET, NUMBERED, PHOTO];

const isBlank = (line) => !line.trim();

function until(lines, start, keepGoing) {
  let end = start;
  while (end < lines.length && keepGoing(lines[end].trim())) end += 1;
  return end;
}

export function parse(source = '') {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    const photo = line.match(PHOTO);

    if (!line) {
      index += 1;
    } else if (FENCE.test(line)) {
      const end = until(lines, index + 1, (each) => !FENCE.test(each));
      blocks.push({ type: 'code', value: lines.slice(index + 1, end).join('\n') });
      index = end + 1;
    } else if (HEADING.test(line)) {
      blocks.push({ type: 'heading', children: inline(line.match(HEADING)[1]) });
      index += 1;
    } else if (photo && safeImage(photo[2])) {
      blocks.push({ type: 'photo', alt: photo[1], src: photo[2], caption: photo[3] || null });
      index += 1;
    } else if (QUOTE.test(line)) {
      const end = until(lines, index, (each) => QUOTE.test(each));
      const inner = lines.slice(index, end).map((each) => each.trim().match(QUOTE)[1]);
      blocks.push({ type: 'quote', children: parse(inner.join('\n')) });
      index = end;
    } else if (BULLET.test(line) || NUMBERED.test(line)) {
      const pattern = BULLET.test(line) ? BULLET : NUMBERED;
      const end = until(lines, index, (each) => pattern.test(each));
      const items = lines.slice(index, end).map((each) => inline(each.trim().match(pattern)[1]));
      blocks.push({ type: 'list', ordered: pattern === NUMBERED, items });
      index = end;
    } else {
      const end = until(lines, index + 1, (each) => !isBlank(each) && !STARTS_BLOCK.some((pattern) => pattern.test(each)));
      const text = lines.slice(index, end).map((each) => each.trim()).join(' ');
      blocks.push({ type: 'paragraph', children: inline(text) });
      index = end;
    }
  }
  return blocks;
}
