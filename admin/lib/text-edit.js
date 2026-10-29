// Edits go through the browser's own insert where it can, so ⌘Z still undoes them.
function insert(field, start, end, text) {
  field.focus();
  field.setSelectionRange(start, end);
  if (!document.execCommand('insertText', false, text)) {
    field.setRangeText(text, start, end, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function wrap(field, marker, placeholder) {
  const { selectionStart: start, selectionEnd: end, value } = field;
  const chosen = value.slice(start, end) || placeholder;
  insert(field, start, end, `${marker}${chosen}${marker}`);
  field.setSelectionRange(start + marker.length, start + marker.length + chosen.length);
}

export function link(field) {
  const { selectionStart: start, selectionEnd: end, value } = field;
  const label = value.slice(start, end) || 'link text';
  insert(field, start, end, `[${label}](https://)`);
  const url = start + label.length + 3;
  field.setSelectionRange(url, url + 'https://'.length);
}

// A block on its own lines, a blank line either side. `pick` selects part of it afterwards.
function block(field, text, pick = [text.length, text.length]) {
  const { selectionStart: start, selectionEnd: end, value } = field;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const tail = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  insert(field, start, end, lead + text + tail);
  const at = start + lead.length;
  field.setSelectionRange(at + pick[0], at + pick[1]);
}

// Quote the lines the selection touches, or unquote them if they all already are.
export function quote(field) {
  const { selectionStart, selectionEnd, value } = field;
  const start = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const lineEnd = value.indexOf('\n', selectionEnd);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(start, end).split('\n');
  const quoted = lines.every((line) => line.startsWith('>'));
  const text = lines.map((line) => (quoted ? line.replace(/^>\s?/, '') : `> ${line}`)).join('\n');
  insert(field, start, end, text);
  field.setSelectionRange(start, start + text.length);
}

export function code(field) {
  const { selectionStart: start, selectionEnd: end, value } = field;
  const chosen = value.slice(start, end);
  if (chosen.includes('\n')) block(field, `\`\`\`\n${chosen}\n\`\`\``);
  else wrap(field, '`', 'code');
}

export function photo(field, url) {
  block(field, `![](${url})`, [2, 2]);
}
