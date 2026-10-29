import { h, svg } from '../../src/lib/dom.js';
import { CODE, LINK, PHOTO, QUOTE } from '../lib/icons.js';
import { code, link, photo, quote, wrap } from '../lib/text-edit.js';

const MOD = /Mac|iP(hone|ad)/.test(navigator.platform) ? '⌘' : 'Ctrl+';

const TOOLS = [
  { label: 'Bold', key: 'b', face: h('b', {}, 'B'), run: (field) => wrap(field, '**', 'bold') },
  { label: 'Italic', key: 'i', face: h('i', {}, 'I'), run: (field) => wrap(field, '*', 'italic') },
  { label: 'Code', key: 'e', face: CODE, run: code },
  { label: 'Quote', face: QUOTE, run: quote },
  { label: 'Link', key: 'k', face: LINK, run: link },
];

function tool(label, key, face) {
  const title = key ? `${label} (${MOD}${key.toUpperCase()})` : label;
  const element = h('button', { class: 'composer__tool', type: 'button', title, 'aria-label': label },
    typeof face === 'string' ? svg(face) : face.cloneNode(true));
  // Keep the text box's selection when a tool is clicked.
  element.addEventListener('mousedown', (event) => event.preventDefault());
  return element;
}

// The article's text box, with a toolbar for the formatting the site understands.
export function composer(name, { uploadPhoto, onError, ...attrs }) {
  const field = h('textarea', { class: 'input composer__field', name, ...attrs });
  const buttons = TOOLS.map((each) => {
    const element = tool(each.label, each.key, each.face);
    element.addEventListener('click', () => each.run(field));
    return element;
  });

  const picker = h('input', { class: 'visually-hidden', type: 'file', accept: 'image/*', tabindex: -1 });
  const photoButton = tool('Add a photo', null, PHOTO);
  let spot = null;

  photoButton.addEventListener('click', () => {
    spot = [field.selectionStart, field.selectionEnd];
    picker.click();
  });

  picker.addEventListener('change', async () => {
    const [chosen] = picker.files;
    picker.value = '';
    if (!chosen) return;
    photoButton.disabled = true;
    photoButton.classList.add('is-busy');
    try {
      const url = await uploadPhoto(chosen);
      field.setSelectionRange(...spot);
      photo(field, url);
    } catch (error) {
      onError(error);
    } finally {
      photoButton.disabled = false;
      photoButton.classList.remove('is-busy');
    }
  });

  field.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
    const shortcut = TOOLS.find((each) => each.key === event.key.toLowerCase());
    if (!shortcut) return;
    event.preventDefault();
    shortcut.run(field);
  });

  return h('div', { class: 'composer' },
    h('div', { class: 'composer__tools', role: 'toolbar', 'aria-label': 'Formatting' }, buttons, photoButton, picker),
    field,
  );
}
