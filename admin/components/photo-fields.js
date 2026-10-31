import { h } from '../../src/lib/dom.js';
import { LOOKS } from '../../src/lib/looks.js';
import { row, select } from './fields.js';
import { focusPicker } from './focus-picker.js';
import { uploadButton } from './upload-button.js';

// An upload button that puts the uploaded photo's address in a hidden field.
export function uploader({ upload, onError, name, empty, filled }) {
  const src = h('input', { type: 'hidden', name });
  const button = uploadButton({
    label: empty,
    upload,
    onError,
    onUploaded(address) {
      src.value = address;
      src.dispatchEvent(new Event('uploaded'));
      src.dispatchEvent(new Event('input', { bubbles: true }));
    },
  });
  return {
    src,
    file: button.file,
    button: button.root,
    show(value) {
      button.label(value ? filled : empty);
    },
  };
}

// The photo: upload one, then pick what stays in frame (and with `turn`, how far it's turned to stand up straight)
// and, unless `look` is off, how it's drawn.
export function photoRows({ upload: send, onError, look = true, turn = false }) {
  const upload = uploader({ upload: send, onError, name: 'photo.src', empty: 'Upload…', filled: 'Replace…' });
  const focus = focusPicker('photo.position', { turn });
  upload.src.addEventListener('uploaded', () => focus.clear());
  const focusRow = row('Focus', focus.root);
  const lookRow = look && select('photo.look', 'Filter', LOOKS);
  return {
    file: upload.file,
    focus,
    rows: [row('Photo', h('div', {}, upload.button, upload.src)), focusRow, lookRow].filter(Boolean),
    show(value) {
      focusRow.hidden = !value;
      if (lookRow) lookRow.hidden = !value;
      focus.show(value);
      upload.show(value);
    },
  };
}
