import { h } from '../lib/dom.js';
import { parse } from '../lib/markdown.js';

function spans(tokens) {
  return tokens.map((token) => {
    if (token.type === 'text') return token.value;
    if (token.type === 'code') return h('code', {}, token.value);
    if (token.type === 'link') return h('a', { href: token.href }, spans(token.children));
    return h(token.type, {}, spans(token.children));
  });
}

function block(token) {
  switch (token.type) {
    case 'heading':
      return h('h2', {}, spans(token.children));
    case 'quote':
      return h('blockquote', {}, token.children.map(block));
    case 'list':
      return h(token.ordered ? 'ol' : 'ul', {}, token.items.map((item) => h('li', {}, spans(item))));
    case 'code':
      return h('pre', {}, h('code', {}, token.value));
    case 'photo':
      return h('figure', {},
        h('img', { src: token.src, alt: token.alt, loading: 'lazy', decoding: 'async' }),
        token.caption && h('figcaption', {}, token.caption),
      );
    default:
      return h('p', {}, spans(token.children));
  }
}

// A post's text, set as an article. `end` is tucked onto the last paragraph, like a full stop.
export function prose(source, { end } = {}) {
  const blocks = parse(source).map(block);
  const last = blocks.at(-1);
  if (end) last?.tagName === 'P' ? last.append(end) : blocks.push(h('p', {}, end));
  return h('div', { class: 'prose' }, blocks);
}
