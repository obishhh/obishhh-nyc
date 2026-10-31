import { pullAbout, pullSleeve } from '../../src/components/pokedex-binder.js';
import { h } from '../../src/lib/dom.js';
import { STATUS } from '../data/options.js';
import { readForm, writeForm } from '../lib/form.js';
import { photoGestures } from '../lib/photo-gestures.js';
import { number, reveal, section, text, textarea } from './fields.js';
import { photoRows } from './photo-fields.js';
import { PREVIEW_PAUSE } from './preview.js';
import { saveBar } from './save-bar.js';

const MAX_NOTE = 200;
// What the form edits; the rest of a record (its id, status, place and times) isn't anything to save.
const EDITABLE = ['name', 'dex', 'set', 'number', 'note', 'photo'];
const BLANK = { name: '', dex: null, set: '', number: '', note: '', photo: { src: '', position: '', zoom: '', turn: '' } };

const editable = (data) => JSON.stringify(EDITABLE.map((key) => data[key]));

// Put a pulled card in the Pokédex, or change one: its photo, cut to a card by dragging and pinching it in the
// preview (or with the focus and zoom) and turned to stand it up straight, and what it is. The preview is the card out of its pocket in its sleeve, as the
// site shows it. It redraws as you type, once you pause.
export function pokedexEditor({ uploadPhoto, onSave, onDelete, onDone }) {
  const bar = saveBar({
    title: (status) => `${STATUS[status]} Pokédex card`,
    check: (status) => {
      const data = current();
      return dexOk(data) && (status !== 'published' || ready(data));
    },
    save: persist,
    remove: async () => {
      if (confirm('Take this card out of the Pokédex?')) await onDelete(record);
    },
    onDone,
  });
  const counter = h('span');
  const photo = photoRows({
    upload: (file) => bar.track(uploadPhoto(file)),
    onError: (error) => bar.flash(`Upload failed. ${error.message}`, true),
    look: false,
    turn: true,
  });
  const form = h('form', { class: 'editor__form', novalidate: true },
    section('Photo', ...photo.rows),
    section('Card',
      text('name', 'Name', { placeholder: 'Gengar', maxlength: 40 }),
      number('dex', 'Pokédex no.', { min: 1, max: 9999, placeholder: '94' }),
      text('set', 'Set', { placeholder: 'Surging Sparks', maxlength: 40 }),
      text('number', 'Number', { placeholder: '078/129', maxlength: 20 }),
      textarea('note', 'Note', { rows: 3, maxlength: MAX_NOTE, hint: counter, placeholder: 'Pulled it on the train. Screamed a bit.' }),
    ),
  );
  const preview = h('div', { class: 'pull-preview' });
  let previewTimer;
  let record = null;
  // What the form held as last saved, to tell when it's moved on.
  let baseline = '';
  let dirty = false;

  // Drag the photo in the preview to slide it within the card's shape, or pinch it to zoom.
  photoGestures(preview, {
    frames: '.pull',
    fields: () => ['position', 'zoom'].map((field) => form.elements.namedItem(`photo.${field}`)),
    onChange: () => photo.focus.sync(),
  });

  const root = h('div', { class: 'editor' },
    bar.root,
    h('div', { class: 'editor__body' },
      form,
      h('aside', { class: 'editor__preview', 'aria-label': 'Preview' }, h('div', { class: 'preview' }, preview)),
    ),
  );

  const current = () => ({ ...record, ...readForm(form) });

  function drawPreview() {
    clearTimeout(previewTimer);
    const data = current();
    preview.replaceChildren(pullSleeve(data), pullAbout(data));
  }

  function refresh({ now = false } = {}) {
    const data = current();
    counter.textContent = `${data.note.length}/${MAX_NOTE}`;
    photo.show(data.photo.src);
    dirty = editable(data) !== baseline;
    bar.show(record, dirty);
    clearTimeout(previewTimer);
    if (now) drawPreview();
    else previewTimer = setTimeout(drawPreview, PREVIEW_PAUSE);
  }

  // The Pokédex only counts in whole numbers, and none of them is past 9999.
  function dexOk({ dex }) {
    if (dex == null || (Number.isInteger(dex) && dex >= 1 && dex <= 9999)) return true;
    bar.flash('A Pokédex number is a whole number from 1 to 9999.', true);
    reveal(form.elements.namedItem('dex'));
    return false;
  }

  function ready(data) {
    const missing = (!data.photo.src && [photo.file, 'Add a photo before publishing.'])
      || (!data.name && [form.elements.namedItem('name'), 'Name it before publishing.']);
    if (!missing) return true;
    bar.flash(missing[1], true);
    reveal(missing[0]);
    return false;
  }

  async function persist(status) {
    const data = current();
    record = await onSave(data, status, record?.id);
    baseline = editable(data);
    refresh({ now: true });
  }

  function load(next) {
    record = next;
    writeForm(form, next ?? BLANK);
    photo.focus.sync();
    baseline = editable(current());
    refresh({ now: true });
  }

  form.addEventListener('input', () => refresh());
  form.addEventListener('submit', (event) => event.preventDefault());

  return {
    root,
    load,
    get dirty() {
      return dirty;
    },
    get busy() {
      return bar.busy;
    },
    flash: bar.flash,
    save: bar.save,
  };
}
