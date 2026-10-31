import { deckCard, linkTo, SNAPSHOT_RULE } from '../../src/components/deck-cards.js';
import { h, svg } from '../../src/lib/dom.js';
import { trackPointer } from '../../src/lib/pointer.js';
import { LOOKS } from '../../src/lib/looks.js';
import { TYPES } from '../data/options.js';
import { readForm, writeForm } from '../lib/form.js';
import { formatDate } from '../lib/format.js';
import { ARROW_LEFT } from '../lib/icons.js';
import { button, row, section, select, text, textarea } from './fields.js';
import { photoGestures } from '../lib/photo-gestures.js';
import { focusPicker, zoomControl } from './focus-picker.js';

const STATUS = { new: 'New', draft: 'Draft', published: 'Live' };
const NAMES = { note: 'note', snapshot: 'Snapshot' };
// A note is written big in marker, so it fits less; a Snapshot's caption box holds about 200 characters.
const MAX_TEXT = { note: 140, snapshot: 200 };
// The preview's handwriting waits for a pause in the typing, rather than redrawing on every key.
const PREVIEW_PAUSE = 60;
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

// An upload button that puts the uploaded photo's address in a hidden field and says what it did.
function uploader({ uploadPhoto, onError, name, empty, filled }) {
  const src = h('input', { type: 'hidden', name });
  const file = h('input', { class: 'visually-hidden', type: 'file', accept: 'image/*' });
  const label = h('span', {}, empty);
  let uploading = false;
  file.addEventListener('change', async () => {
    const [picked] = file.files;
    if (!picked) return;
    uploading = true;
    label.textContent = 'Uploading…';
    try {
      src.value = await uploadPhoto(picked);
      src.dispatchEvent(new Event('uploaded'));
      src.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (error) {
      onError(error);
    } finally {
      uploading = false;
      label.textContent = src.value ? filled : empty;
      file.value = '';
    }
  });
  return {
    src,
    file,
    button: h('label', { class: 'button button--quiet art__upload' }, file, label),
    show(value) {
      if (!uploading) label.textContent = value ? filled : empty;
    },
  };
}

// The second photo, for a Snapshot split down the middle: add one, swap it, or take it away again.
function secondRows({ uploadPhoto, onError }) {
  const upload = uploader({ uploadPhoto, onError, name: 'photo.second.src', empty: 'Add…', filled: 'Replace…' });
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
function photoRows({ uploadPhoto, onError }) {
  const upload = uploader({ uploadPhoto, onError, name: 'photo.src', empty: 'Upload…', filled: 'Replace…' });
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

// Write or edit one card in the deck box. The preview redraws as you type.
export function deckEditor({ deck, uploadPhoto, onSave, onDelete, onDone }) {
  const state = h('p', { class: 'editor__state', role: 'status', 'aria-live': 'polite' });
  const preview = h('div', { class: 'binder__pocket', style: { '--tilt': '0deg' } });
  const form = h('form', { class: 'editor__form', novalidate: true });
  const remove = button('Delete', 'button--danger', destroy);
  const unpublish = button('Unpublish', '', () => commit('draft', 'Unpublished.'));
  const save = button('Save draft', '', () => keep());
  const publish = button('Publish', 'button--primary', () => commit('published', 'Published.'));
  const actions = [remove, unpublish, save, publish];
  let flashTimer;
  let previewTimer;
  let record = null;
  let kind = null;
  let snapshot = '';
  let dirty = false;
  let saving = false;
  let counter;
  let photo;
  let second;

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
    h('div', { class: 'editor__bar' },
      h('a', { class: 'editor__back', href: '#/' }, svg(ARROW_LEFT), 'All cards'),
      state,
      h('div', { class: 'editor__actions' }, actions),
    ),
    h('div', { class: 'editor__body' },
      form,
      h('aside', { class: 'editor__preview', 'aria-label': 'Preview' },
        h('div', { class: 'preview' }, h('div', { class: 'preview__stage' }, preview)),
      ),
    ),
  );

  function flash(message, bad = false) {
    clearTimeout(flashTimer);
    state.textContent = message;
    state.classList.toggle('is-bad', bad);
    flashTimer = setTimeout(renderState, bad ? 6000 : 2500);
  }

  // The form for one kind of card. Only rebuilt when the kind changes, so saving never yanks it out from under you.
  function build() {
    counter = h('span');
    const words = { rows: 3, maxlength: MAX_TEXT[kind], hint: counter };
    const onError = (error) => flash(`Upload failed. ${error.message}`, true);
    photo = kind === 'snapshot' ? photoRows({ uploadPhoto, onError }) : null;
    second = kind === 'snapshot' ? secondRows({ uploadPhoto, onError }) : null;
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

  function renderState() {
    clearTimeout(flashTimer);
    const status = record?.status ?? 'new';
    state.classList.remove('is-bad');
    state.classList.toggle('is-dirty', dirty);
    state.textContent = [
      `${STATUS[status]} ${NAMES[kind]}`,
      dirty ? 'Unsaved changes' : record && `Saved ${formatDate(record.updated_at)}`,
    ].filter(Boolean).join(' · ');
    remove.hidden = !record;
    unpublish.hidden = status !== 'published';
    publish.hidden = status === 'published';
    save.textContent = status === 'published' ? 'Save changes' : 'Save draft';
    save.classList.toggle('button--primary', status === 'published');
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
    renderState();
    clearTimeout(previewTimer);
    if (now) drawPreview();
    else previewTimer = setTimeout(drawPreview, PREVIEW_PAUSE);
  }

  function ready(data) {
    const missing = kind === 'note'
      ? !data.text && [form.elements.namedItem('text'), 'Write something before publishing.']
      : (!data.photo.src && [photo.file, 'Add a photo before publishing.']) || (!data.title && [form.elements.namedItem('title'), 'Add a title before publishing.']);
    if (!missing) return true;
    flash(missing[1], true);
    missing[0]?.focus();
    return false;
  }

  function linkOk({ link }) {
    if (!link || (linkTo(link) && !/\s/.test(link) && link.length <= 512)) return true;
    flash(link.length > 512 ? 'That link’s too long.' : 'That link doesn’t look like a web address.', true);
    form.elements.namedItem('link')?.focus();
    return false;
  }

  function busy(on) {
    actions.forEach((action) => (action.disabled = on));
  }

  // The buttons save and head back to the binder; ⌘S saves and stays, for mid-writing.
  async function commit(status, message, { stay = false } = {}) {
    const data = current();
    if (saving || !linkOk(data) || (status === 'published' && !ready(data))) return;
    saving = true;
    busy(true);
    try {
      // The form already shows what's being saved, and may have moved on since: leave it be, and note what's saved.
      record = await onSave(data, status, record?.id);
      snapshot = editable(data);
      refresh({ now: true });
      if (stay || dirty) flash(message);
      else onDone(message);
    } catch (error) {
      flash(error.message, true);
    } finally {
      saving = false;
      busy(false);
    }
  }

  function keep(options) {
    const live = record?.status === 'published';
    return commit(live ? 'published' : 'draft', 'Saved.', options);
  }

  async function destroy() {
    if (!record || !confirm('Delete this card?')) return;
    busy(true);
    try {
      await onDelete(record);
    } catch (error) {
      flash(error.message, true);
    } finally {
      busy(false);
    }
  }

  function load(next, newKind = 'note') {
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
    save: () => keep({ stay: true }),
  };
}
