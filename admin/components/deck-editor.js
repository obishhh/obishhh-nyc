import { deckCard } from '../../src/components/deck-cards.js';
import { h, svg } from '../../src/lib/dom.js';
import { trackPointer } from '../../src/lib/pointer.js';
import { TYPES } from '../data/options.js';
import { readForm, writeForm } from '../lib/form.js';
import { formatDate } from '../lib/format.js';
import { ARROW_LEFT } from '../lib/icons.js';
import { button, row, section, select, text, textarea } from './fields.js';
import { focusPicker } from './focus-picker.js';

const STATUS = { new: 'New', draft: 'Draft', published: 'Live' };
const NAMES = { note: 'note', snapshot: 'Snapshot' };
// Notes are the whole card, so they get more room than a Snapshot's caption.
const MAX_TEXT = { note: 140, snapshot: 110 };
// The preview's handwriting waits for a pause in the typing, rather than redrawing on every key.
const PREVIEW_PAUSE = 60;
// What the form edits; the rest of a record (its id, status and times) is the server's.
const EDITABLE = ['kind', 'number', 'type', 'title', 'text', 'place', 'photo', 'date'];

const today = () => new Date().toLocaleDateString('en-CA');
const editable = (data) => JSON.stringify(EDITABLE.map((key) => data[key]));
const trim = (value) => (typeof value === 'string' ? value.trim() : value);

// A fresh card for the deck: today's date and the next number along.
function blankDeckCard(kind, deck) {
  const numbers = deck.map(({ number }) => parseInt(number, 10)).filter(Number.isFinite);
  const next = String(Math.max(0, ...numbers) + 1).padStart(3, '0');
  const set = deck.find(({ number }) => number.includes('/'))?.number.split('/')[1] ?? '100';
  return { kind, number: `${next}/${set}`, type: 'plain', title: '', text: '', place: '', photo: { src: '', alt: '', position: '' }, date: today() };
}

// The photo: upload one, then pick what stays in frame.
function photoRows({ uploadPhoto, onError }) {
  const focus = focusPicker('photo.position');
  const src = h('input', { type: 'hidden', name: 'photo.src' });
  const file = h('input', { class: 'visually-hidden', type: 'file', accept: 'image/*' });
  const label = h('span', {}, 'Upload a photo…');
  const focusRow = row('Focus', focus.root);
  let uploading = false;
  file.addEventListener('change', async () => {
    const [picked] = file.files;
    if (!picked) return;
    uploading = true;
    label.textContent = 'Uploading…';
    try {
      src.value = await uploadPhoto(picked);
      focus.clear();
      src.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (error) {
      onError(error);
    } finally {
      uploading = false;
      label.textContent = src.value ? 'Upload a different photo…' : 'Upload a photo…';
      file.value = '';
    }
  });
  return {
    file,
    focus,
    rows: [row('Photo', h('div', {}, h('label', { class: 'button button--quiet art__upload' }, file, label), src)), focusRow],
    show(value) {
      focusRow.hidden = !value;
      focus.show(value);
      if (!uploading) label.textContent = value ? 'Upload a different photo…' : 'Upload a photo…';
    },
  };
}

// Write or edit one card in the deck box. The preview redraws as you type.
export function deckEditor({ deck, uploadPhoto, onSave, onDelete, onDone }) {
  const state = h('p', { class: 'editor__state', role: 'status', 'aria-live': 'polite' });
  const preview = h('div', { class: 'binder__pocket', style: { '--tilt': '0deg' } });
  const form = h('form', { class: 'editor__form', novalidate: true });
  const remove = button('Delete', 'button--danger', destroy);
  const unpublish = button('Unpublish', '', () => commit('draft', 'Unpublished. It’s out of the box.'));
  const save = button('Save draft', '', () => keep());
  const publish = button('Publish', 'button--primary', () => commit('published', 'Published. It’s in the box.'));
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

  trackPointer(preview, '.card');

  const root = h('div', { class: 'editor deck-editor' },
    h('div', { class: 'editor__bar' },
      h('a', { class: 'editor__back', href: '#/' }, svg(ARROW_LEFT), 'All cards'),
      state,
      h('div', { class: 'editor__actions' }, actions),
    ),
    h('div', { class: 'editor__body' },
      form,
      h('aside', { class: 'editor__preview', 'aria-label': 'Preview' },
        h('div', { class: 'preview' },
          h('div', { class: 'preview__stage' }, preview),
          h('p', { class: 'preview__hint' }, 'How it looks when the deck box is tipped out.'),
        ),
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
    photo = kind === 'snapshot' ? photoRows({ uploadPhoto, onError: (error) => flash(`Upload failed. ${error.message}`, true) }) : null;
    form.replaceChildren(
      kind === 'note'
        ? section('Note',
          select('type', 'Type', TYPES),
          textarea('text', 'Words', { ...words, placeholder: 'Two pigeons fought over one fry. Both lost.' }),
        )
        : section('Snapshot',
          ...photo.rows,
          text('photo.alt', 'Alt text', { placeholder: 'Describe the photo', maxlength: 160 }),
          text('title', 'Title', { placeholder: 'Bodega Cat', maxlength: 24 }),
          textarea('text', 'Caption', { ...words, placeholder: 'Search your deck for a cat. He’s already on the counter.' }),
          text('place', 'Place', { placeholder: 'Union Sq', maxlength: 13, hint: 'Short, so the copyright stays in the middle.' }),
        ),
      section('Small print',
        text('date', 'Posted', { type: 'date', hint: 'Left blank, it’s today.' }),
        text('number', 'Number', { placeholder: '012/100', maxlength: 9 }),
      ),
    );
  }

  // What's in the form, tidied: trimmed, with a blank date read as today.
  function current() {
    const values = { photo: { src: '', alt: '', position: '' }, ...readForm(form) };
    const data = { ...record, ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, trim(value)])), kind };
    data.photo = Object.fromEntries(Object.entries(values.photo).map(([key, value]) => [key, trim(value)]));
    data.date ||= today();
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
    counter.textContent = `${data.text.length} of ${MAX_TEXT[kind]}.${kind === 'note' ? ' Shorter gets written bigger.' : ''}`;
    photo?.show(data.photo.src);
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

  function busy(on) {
    actions.forEach((action) => (action.disabled = on));
  }

  // The buttons save and head back to the binder; ⌘S saves and stays, for mid-writing.
  async function commit(status, message, { stay = false } = {}) {
    const data = current();
    if (saving || (status === 'published' && !ready(data))) return;
    saving = true;
    busy(true);
    try {
      // The form already shows what's being saved, and may have moved on since: leave it be, and note what's saved.
      record = await onSave(data, status, record?.id);
      snapshot = editable(data);
      refresh({ now: true });
      if (stay) flash(message);
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
    return commit(live ? 'published' : 'draft', live ? 'Saved. The box is updated.' : 'Saved. Still a draft.', options);
  }

  async function destroy() {
    if (!record || !confirm('Take this card out of the deck for good? This can’t be undone.')) return;
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
    const data = next ? structuredClone(next) : blankDeckCard(kind, deck());
    data.photo = { src: '', alt: '', position: '', ...data.photo };
    writeForm(form, data);
    photo?.focus.sync();
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
