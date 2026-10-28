import { licenses } from '../../src/data/licenses.js';
import { h, svg } from '../../src/lib/dom.js';
import { PLUS } from '../lib/icons.js';
import { focusPicker } from './focus-picker.js';
import { select, text } from './fields.js';

const NO_CREDIT = { alt: '', illustrator: 'obishhh', title: '', author: '', license: '', source: '' };
const CREDIT_KEYS = Object.keys(NO_CREDIT);

const LICENSE_CHOICES = [
  { value: '', label: 'My own work (no credit needed)' },
  ...Object.keys(licenses).map((name) => ({ value: name, label: name })),
];

function option(src, label) {
  return h('label', { class: 'art-option', title: label },
    h('input', { class: 'art-option__input', type: 'radio', name: 'art.src', value: src, 'aria-label': label }),
    h('img', { class: 'art-option__image', src, alt: '', loading: 'lazy', draggable: 'false' }),
  );
}

// Choose the card art: the built-in library or your own uploads. Picking a piece
// fills in its credit; the focus dot decides the crop.
export function artPicker({ library, loadUploads, upload, creditFor, onError }) {
  const focus = focusPicker('art.position');
  const file = h('input', { class: 'visually-hidden', type: 'file', accept: 'image/*' });
  const uploadLabel = h('span', { class: 'art-option__label' }, 'Upload');
  const uploader = h('label', { class: 'art-option art-option--upload' }, file, svg(PLUS), uploadLabel);
  const uploads = h('div', { class: 'art-picker__grid' }, uploader);
  const shelf = h('div', { class: 'art-picker__grid' }, library.map((work) => option(work.src, work.title)));

  const credit = {
    alt: text('art.alt', 'Alt text', { placeholder: 'Describe the picture', hint: 'Read out by screen readers.', span: 6 }),
    illustrator: text('art.illustrator', 'Illustrator', { placeholder: 'obishhh', maxlength: 40, hint: 'Printed on the card as “Illus. …”.', span: 6 }),
    title: text('art.title', 'Work title', { span: 3 }),
    author: text('art.author', 'Author', { span: 3 }),
    license: select('art.license', 'License', LICENSE_CHOICES, { span: 3 }),
    source: text('art.source', 'Source link', { type: 'url', placeholder: 'https://', span: 3 }),
  };
  const control = (key) => credit[key].querySelector('input, select');

  const root = h('div', { class: 'art-picker', dataset: { span: '6' } },
    h('div', { class: 'art-picker__group' }, h('p', { class: 'field__label' }, 'Your uploads'), uploads),
    h('div', { class: 'art-picker__group' }, h('p', { class: 'field__label' }, 'Library'), shelf),
    h('div', { class: 'art-picker__detail' },
      focus.root,
      h('div', { class: 'form-grid' }, credit.alt, credit.illustrator),
    ),
    h('details', { class: 'art-picker__credit' },
      h('summary', {}, 'Credit on the credits page'),
      h('p', { class: 'field__hint' }, 'Licensed art is listed on /credits/. Your own photos aren’t.'),
      h('div', { class: 'form-grid' }, credit.title, credit.author, credit.license, credit.source),
    ),
  );

  const radios = () => [...root.querySelectorAll('.art-option__input')];
  const find = (src) => radios().find((radio) => radio.value === src);

  function addUpload(src) {
    const existing = find(src);
    if (existing) return existing;
    const tile = option(src, 'Your upload');
    uploader.after(tile);
    return tile.querySelector('input');
  }

  // A new piece of art brings its own credit: from the library, from another card using it, or none.
  function pick(radio) {
    const src = radio.value;
    const known = library.find((work) => work.src === src) ?? creditFor(src) ?? NO_CREDIT;
    for (const key of CREDIT_KEYS) control(key).value = known[key] ?? '';
    focus.show(src);
    focus.clear();
    radio.dispatchEvent(new Event('input', { bubbles: true }));
  }

  root.addEventListener('change', ({ target }) => {
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
      uploadLabel.textContent = 'Upload';
    }
  });

  loadUploads().then((sources) => sources.reverse().forEach(addUpload), () => {});

  return {
    root,
    // Before the form is filled: make sure the card's current art has a tile to check.
    prepare({ src, license }) {
      if (src && !find(src)) addUpload(src);
      const licenses = control('license');
      if (license && ![...licenses.options].some((choice) => choice.value === license)) {
        licenses.append(h('option', { value: license }, license));
      }
      focus.show(src);
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
