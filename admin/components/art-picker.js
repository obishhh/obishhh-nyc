import { licenses } from '../../src/data/licenses.js';
import { h } from '../../src/lib/dom.js';
import { dropdown, row, text } from './fields.js';
import { focusPicker } from './focus-picker.js';

const NO_CREDIT = { alt: '', illustrator: 'obishhh', title: '', author: '', license: '', source: '' };
const CREDIT_KEYS = Object.keys(NO_CREDIT);

const LICENSE_CHOICES = [
  { value: '', label: 'My own (no credit needed)' },
  ...Object.keys(licenses).map((name) => ({ value: name, label: name })),
];

function option(src, label) {
  return h('label', { class: 'art__option', title: label },
    h('input', { class: 'art__input', type: 'radio', name: 'art.src', value: src, 'aria-label': label }),
    h('img', { class: 'art__image', src, alt: '', loading: 'lazy', draggable: 'false' }),
  );
}

// Choose the card art from the library or your own uploads. Picking a piece fills
// in its credit; the focus dot decides the crop.
export function artPicker({ library, loadUploads, upload, creditFor, onError }) {
  const focus = focusPicker('art.position');
  const grid = h('div', { class: 'art__grid' }, library.map((work) => option(work.src, work.title)));
  const file = h('input', { class: 'visually-hidden', type: 'file', accept: 'image/*' });
  const uploadLabel = h('span', {}, 'Upload an image…');
  const uploader = h('label', { class: 'button button--quiet art__upload' }, file, uploadLabel);
  const license = dropdown('art.license', LICENSE_CHOICES);
  const focusRow = row('Focus', focus.root);
  const root = h('div', { class: 'art' }, grid, uploader);

  const rows = [
    row('Image', root),
    focusRow,
    text('art.alt', 'Alt text', { placeholder: 'Describe the picture' }),
    text('art.illustrator', 'Illustrator', { placeholder: 'obishhh', maxlength: 40 }),
    text('art.title', 'Work', { placeholder: 'Title of the original' }),
    text('art.author', 'Author'),
    row('License', license, 'Licensed art is listed on the credits page.'),
    text('art.source', 'Source', { type: 'url', placeholder: 'https://' }),
  ];
  const control = (key) => rows.map((each) => each.querySelector(`[name="art.${key}"]`)).find(Boolean);

  const radios = () => [...grid.querySelectorAll('.art__input')];
  const find = (src) => radios().find((radio) => radio.value === src);

  // Uploads go first, newest at the front, ahead of the library.
  function addUpload(src) {
    const existing = find(src);
    if (existing) return existing;
    const tile = option(src, 'Your upload');
    grid.prepend(tile);
    return tile.querySelector('input');
  }

  function showFocus(src) {
    focusRow.hidden = !src;
    focus.show(src);
  }

  // New art brings its own credit: from the library, from another card using it, or none.
  function pick(radio) {
    const src = radio.value;
    const known = library.find((work) => work.src === src) ?? creditFor(src) ?? NO_CREDIT;
    for (const key of CREDIT_KEYS) control(key).value = known[key] ?? '';
    showFocus(src);
    focus.clear();
    radio.dispatchEvent(new Event('input', { bubbles: true }));
  }

  grid.addEventListener('change', ({ target }) => {
    if (target.name === 'art.src') pick(target);
  });

  file.addEventListener('change', async () => {
    const [chosen] = file.files;
    file.value = '';
    if (!chosen) return;
    uploader.classList.add('is-busy');
    uploadLabel.textContent = 'Uploading…';
    try {
      const radio = addUpload(await upload(chosen));
      radio.checked = true;
      pick(radio);
    } catch (error) {
      onError(error);
    } finally {
      uploader.classList.remove('is-busy');
      uploadLabel.textContent = 'Upload an image…';
    }
  });

  // Uploads are listed once signed in, the first time a card opens. A failed list tries again next time.
  let uploads = null;
  function listUploads() {
    uploads ??= loadUploads().then((sources) => sources.reverse().forEach(addUpload), () => (uploads = null));
  }

  return {
    rows,
    // Before the form is filled: make sure the card's art and license have options to select.
    prepare({ src, license: name }) {
      listUploads();
      if (src && !find(src)) addUpload(src);
      if (name && ![...license.options].some((choice) => choice.value === name)) {
        license.append(h('option', { value: name }, name));
      }
      showFocus(src);
    },
    // After the form is filled.
    sync() {
      focus.sync();
    },
    focus() {
      (radios().find((radio) => radio.checked) ?? file).focus();
      root.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  };
}
