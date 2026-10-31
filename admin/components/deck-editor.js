import { deckCard, linkTo, SNAPSHOT_RULE } from '../../src/components/deck-cards.js';
import { h } from '../../src/lib/dom.js';
import { LOOKS } from '../../src/lib/looks.js';
import { trackPointer } from '../../src/lib/pointer.js';
import { TYPES } from '../data/options.js';
import { readForm, writeForm } from '../lib/form.js';
import { photoGestures } from '../lib/photo-gestures.js';
import { row, section, select, text, textarea } from './fields.js';
import { focusPicker, zoomControl } from './focus-picker.js';
import { PREVIEW_PAUSE } from './preview.js';
import { saveBar } from './save-bar.js';
import { uploadButton } from './upload-button.js';

const STATUS = { new: 'New', draft: 'Draft', published: 'Live' };
const NAMES = { note: 'note', snapshot: 'Snapshot' };
// A note is written big in marker, so it fits less; a Snapshot's caption box holds about 200 characters.
const MAX_TEXT = { note: 140, snapshot: 200 };
// What the form edits for each kind; the rest of a record (its id, status and times, and the other kind's fields,
// blank until it's first saved) isn't anything to save.
const EDITABLE = {
  note: ['kind', 'number', 'type', 'text', 'link', 'date'],
  snapshot: ['kind', 'number', 'title', 'text', 'rule', 'place', 'photo', 'date'],
};

const today = () => new Date().toLocaleDateString('en-CA');
const editable = (data) => JSON.stringify(EDITABLE[data.kind].map((key) => data[key]));

// A fresh card for the deck: today's date and the next number along.
function blankDeckCard(kind, deck) {
  const numbers = deck.map(({ number }) => parseInt(number, 10)).filter(Number.isFinite);
  const next = String(Math.max(0, ...numbers) + 1).padStart(3, '0');
  const set = deck.find(({ number }) => number.includes('/'))?.number.split('/')[1] ?? '100';
  return { kind, number: `${next}/${set}`, type: 'plain', date: today() };
}

// An upload button that puts the uploaded photo's address in a hidden field.
function uploader({ upload, onError, name, empty, filled }) {
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

// The second photo, for a Snapshot split down the middle: add one, swap it, or take it away again.
function secondRows({ upload: send, onError }) {
  const upload = uploader({ upload: send, onError, name: 'photo.second.src', empty: 'Add…', filled: 'Replace…' });
  const position = h('input', { type: 'hidden', name: 'photo.second.position' });
  const zoom = zoomControl('photo.second.zoom');
  const drop = h('button', { class: 'button button--quiet', type: 'button' }, 'Remove');
  const forget = () => {
    position.value = '';
    zoom.clear();
  };
  upload.src.addEventListener('uploaded', forget);
  drop.addEventListener('click', () => {
    upload.src.value = '';
    forget();
    upload.src.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const shown = row('Second photo', h('div', {}, h('div', { class: 'inline' }, upload.button, drop, upload.src, position), zoom.root));
  return {
    zoom,
    rows: [shown],
    show(first, second) {
      shown.hidden = !first;
      drop.hidden = !second;
      zoom.root.hidden = !second;
      upload.show(second);
    },
  };
}

// The photo: upload one, then pick what stays in frame and how it's drawn.
function photoRows({ upload: send, onError }) {
  const upload = uploader({ upload: send, onError, name: 'photo.src', empty: 'Upload…', filled: 'Replace…' });
  const focus = focusPicker('photo.position');
  upload.src.addEventListener('uploaded', () => focus.clear());
  const focusRow = row('Focus', focus.root);
  const lookRow = select('photo.look', 'Filter', LOOKS);
  return {
    file: upload.file,
    focus,
    rows: [row('Photo', h('div', {}, upload.button, upload.src)), focusRow, lookRow],
    show(value) {
      focusRow.hidden = !value;
      lookRow.hidden = !value;
      focus.show(value);
      upload.show(value);
    },
  };
}

// Write or edit one card in the deck box. The preview redraws as you type, once you pause.
export function deckEditor({ deck, uploadPhoto, onSave, onDelete, onDone }) {
  const bar = saveBar({
    title: (status) => `${STATUS[status]} ${NAMES[kind]}`,
    check: (status) => {
      const data = current();
      return linkOk(data) && (status !== 'published' || ready(data));
    },
    save: persist,
    remove: async () => {
      if (confirm('Delete this card?')) await onDelete(record);
    },
    onDone,
  });
  const preview = h('div', { class: 'binder__pocket', style: { '--tilt': '0deg' } });
  const form = h('form', { class: 'editor__form', novalidate: true });
  let previewTimer;
  let record = null;
  let kind = null;
  let snapshot = '';
  let dirty = false;
  let counter;
  let photo;
  let second;
  // Counts the cards opened, so a save that lands after another one's been opened leaves that one be.
  let opened = 0;

  trackPointer(preview, '.card');

  // Drag a photo in the preview to slide it within its frame, or pinch it to zoom: either half of a split Snapshot, or
  // the whole photo.
  photoGestures(preview, {
    frames: '.snapshot__half, .snapshot__art',
    keyOf: (frame) => frame.dataset.half ?? '',
    fields: (half) => ['position', 'zoom'].map((field) => form.elements.namedItem(half === '1' ? `photo.second.${field}` : `photo.${field}`)),
    enabled: () => kind === 'snapshot',
    onChange: () => {
      photo?.focus.sync();
      second?.zoom.sync();
    },
  });

  const root = h('div', { class: 'editor deck-editor' },
    bar.root,
    h('div', { class: 'editor__body' },
      form,
      h('aside', { class: 'editor__preview', 'aria-label': 'Preview' },
        h('div', { class: 'preview' }, h('div', { class: 'preview__stage' }, preview)),
      ),
    ),
  );

  // The form for one kind of card. Only rebuilt when the kind changes, so saving never yanks it out from under you.
  function build() {
    counter = h('span');
    const words = { rows: 3, maxlength: MAX_TEXT[kind], hint: counter };
    const upload = (file) => bar.track(uploadPhoto(file));
    const onError = (error) => bar.flash(`Upload failed. ${error.message}`, true);
    photo = kind === 'snapshot' ? photoRows({ upload, onError }) : null;
    second = kind === 'snapshot' ? secondRows({ upload, onError }) : null;
    form.replaceChildren(
      kind === 'note'
        ? section('Note',
          select('type', 'Type', TYPES),
          textarea('text', 'Words', { ...words, placeholder: 'Two pigeons fought over one fry. Both lost.' }),
          text('link', 'Link', { placeholder: 'nytimes.com/…', maxlength: 512, inputmode: 'url', autocapitalize: 'off', spellcheck: 'false' }),
        )
        : section('Snapshot',
          ...photo.rows,
          ...second.rows,
          text('photo.alt', 'Alt text', { placeholder: 'Describe the photo', maxlength: 160 }),
          text('title', 'Title', { placeholder: 'Bodega Cat', maxlength: 24 }),
          textarea('text', 'Caption', { ...words, placeholder: 'Search your deck for a cat. He’s already on the counter.' }),
          text('rule', 'Rule line', { placeholder: SNAPSHOT_RULE, maxlength: 60 }),
          text('place', 'Place', { placeholder: 'Union Sq', maxlength: 18 }),
        ),
      section('Small print',
        text('date', 'Posted', { type: 'date' }),
        text('number', 'Number', { placeholder: '012/100', maxlength: 9 }),
      ),
    );
  }

  // What's in the form, with a blank date read as today.
  function current() {
    const data = { ...record, ...readForm(form), kind };
    data.date ||= today();
    // An address typed without its https:// gets one.
    data.link = data.link && !/^https?:\/\//i.test(data.link) ? `https://${data.link}` : data.link ?? '';
    return data;
  }

  function drawPreview() {
    clearTimeout(previewTimer);
    preview.replaceChildren(deckCard(current()));
  }

  function refresh({ now = false } = {}) {
    const data = current();
    counter.textContent = `${data.text.length}/${MAX_TEXT[kind]}`;
    photo?.show(data.photo.src);
    second?.show(data.photo.src, data.photo.second?.src);
    dirty = editable(data) !== snapshot;
    bar.show(record, dirty);
    clearTimeout(previewTimer);
    if (now) drawPreview();
    else previewTimer = setTimeout(drawPreview, PREVIEW_PAUSE);
  }

  function ready(data) {
    const missing = kind === 'note'
      ? !data.text && [form.elements.namedItem('text'), 'Write something before publishing.']
      : (!data.photo.src && [photo.file, 'Add a photo before publishing.']) || (!data.title && [form.elements.namedItem('title'), 'Add a title before publishing.']);
    if (!missing) return true;
    bar.flash(missing[1], true);
    missing[0]?.focus();
    return false;
  }

  function linkOk({ link }) {
    if (!link || (linkTo(link) && !/\s/.test(link) && link.length <= 512)) return true;
    bar.flash(link.length > 512 ? 'That link’s too long.' : 'That link doesn’t look like a web address.', true);
    form.elements.namedItem('link')?.focus();
    return false;
  }

  async function persist(status) {
    const data = current();
    const at = opened;
    const saved = await onSave(data, status, record?.id);
    if (at !== opened) return false;
    // The form already shows what's being saved, and may have moved on since: leave it be, and note what's saved.
    record = saved;
    snapshot = editable(data);
    refresh({ now: true });
  }

  function load(next, newKind = 'note') {
    opened += 1;
    record = next;
    const wanted = next?.kind ?? newKind;
    if (wanted !== kind) {
      kind = wanted;
      build();
    }
    writeForm(form, next ?? blankDeckCard(kind, deck()));
    photo?.focus.sync();
    second?.zoom.sync();
    snapshot = editable(current());
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
