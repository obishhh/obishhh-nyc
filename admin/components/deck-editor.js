import { deckCard, SNAPSHOT_RULE } from '../../src/components/deck-cards.js';
import { h, svg } from '../../src/lib/dom.js';
import { trackPointer } from '../../src/lib/pointer.js';
import { LOOKS } from '../../src/lib/looks.js';
import { TYPES } from '../data/options.js';
import { readForm, writeForm } from '../lib/form.js';
import { formatDate } from '../lib/format.js';
import { ARROW_LEFT } from '../lib/icons.js';
import { button, row, section, select, text, textarea } from './fields.js';
import { focusPicker } from './focus-picker.js';

const STATUS = { new: 'New', draft: 'Draft', published: 'Live' };
const NAMES = { note: 'note', snapshot: 'Snapshot' };
// A note is written big in marker, so it fits less; a Snapshot's caption box holds about 200 characters.
const MAX_TEXT = { note: 140, snapshot: 200 };
// The preview's handwriting waits for a pause in the typing, rather than redrawing on every key.
const PREVIEW_PAUSE = 60;
// What the form edits; the rest of a record (its id, status and times) is the server's.
const EDITABLE = ['kind', 'number', 'type', 'title', 'text', 'rule', 'place', 'photo', 'date'];

const today = () => new Date().toLocaleDateString('en-CA');
const editable = (data) => JSON.stringify(EDITABLE.map((key) => data[key]));
const trim = (value) => (typeof value === 'string' ? value.trim() : value);

// A fresh card for the deck: today's date and the next number along.
function blankDeckCard(kind, deck) {
  const numbers = deck.map(({ number }) => parseInt(number, 10)).filter(Number.isFinite);
  const next = String(Math.max(0, ...numbers) + 1).padStart(3, '0');
  const set = deck.find(({ number }) => number.includes('/'))?.number.split('/')[1] ?? '100';
  return { kind, number: `${next}/${set}`, type: 'plain', title: '', text: '', rule: '', place: '', photo: { src: '', alt: '', position: '', look: '' }, date: today() };
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
  const upload = uploader({ uploadPhoto, onError, name: 'photo.second.src', empty: 'Add a second photo…', filled: 'Change the second photo…' });
  const position = h('input', { type: 'hidden', name: 'photo.second.position' });
  const drop = h('button', { class: 'button button--quiet', type: 'button' }, 'Remove');
  upload.src.addEventListener('uploaded', () => (position.value = ''));
  drop.addEventListener('click', () => {
    upload.src.value = '';
    position.value = '';
    upload.src.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const shown = row('Second photo', h('div', { class: 'inline' }, upload.button, drop, upload.src, position),
    'Two photos split the picture down the middle. Drag either half in the preview to line it up.');
  return {
    rows: [shown],
    show(first, second) {
      shown.hidden = !first;
      drop.hidden = !second;
      upload.show(second);
    },
  };
}

// The photo: upload one, then pick what stays in frame.
function photoRows({ uploadPhoto, onError }) {
  const focus = focusPicker('photo.position');
  const src = h('input', { type: 'hidden', name: 'photo.src' });
  const file = h('input', { class: 'visually-hidden', type: 'file', accept: 'image/*' });
  const label = h('span', {}, 'Upload a photo…');
  const focusRow = row('Focus', focus.root);
  const lookRow = select('photo.look', 'Filter', LOOKS, { hint: 'Drawn on the card as it shows.' });
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
    rows: [row('Photo', h('div', {}, h('label', { class: 'button button--quiet art__upload' }, file, label), src)), focusRow, lookRow],
    show(value) {
      focusRow.hidden = !value;
      lookRow.hidden = !value;
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
  let second;

  trackPointer(preview, '.card');

  // Drag a photo in the preview to slide it within its frame: either half of a split Snapshot, or the whole photo.
  // The preview is redrawn as the form changes, so the frame is found again on every move.
  let dragging = null;
  const frameAt = (half) => preview.querySelector(half === null ? '.snapshot__art' : `.snapshot__half[data-half="${half}"]`);
  const fieldFor = (half) => form.elements.namedItem(half === '1' ? 'photo.second.position' : 'photo.position');
  preview.addEventListener('pointerdown', (event) => {
    const frame = event.target.closest('.snapshot__half, .snapshot__art');
    const picture = frame?.querySelector('img, canvas');
    if (!frame || !picture || kind !== 'snapshot') return;
    event.preventDefault();
    preview.setPointerCapture(event.pointerId);
    const [x = 50, y = 50] = (fieldFor(frame.dataset.half ?? null).value.match(/\d+(\.\d+)?/g) ?? []).map(Number);
    dragging = { half: frame.dataset.half ?? null, x, y, from: [event.clientX, event.clientY] };
  });
  preview.addEventListener('pointermove', (event) => {
    if (!dragging || !preview.hasPointerCapture(event.pointerId)) return;
    const frame = frameAt(dragging.half);
    const picture = frame?.querySelector('img, canvas');
    if (!picture) return;
    // How far the photo overhangs its frame when it covers it: that's the room it has to slide.
    const box = frame.getBoundingClientRect();
    const [wide, tall] = picture instanceof HTMLImageElement ? [picture.naturalWidth, picture.naturalHeight] : [picture.width, picture.height];
    if (!wide || !tall) return;
    const scale = Math.max(box.width / wide, box.height / tall);
    const [spareX, spareY] = [wide * scale - box.width, tall * scale - box.height];
    const [dx, dy] = [event.clientX - dragging.from[0], event.clientY - dragging.from[1]];
    const clamp = (v) => Math.min(100, Math.max(0, v));
    const x = spareX > 0.5 ? clamp(dragging.x - (dx / spareX) * 100) : 50;
    const y = spareY > 0.5 ? clamp(dragging.y - (dy / spareY) * 100) : 50;
    const value = `${Math.round(x)}% ${Math.round(y)}%`;
    picture.style.setProperty('object-position', value);
    const field = fieldFor(dragging.half);
    if (field.value !== value) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  const stopDragging = () => {
    if (!dragging) return;
    dragging = null;
    photo?.focus.sync();
  };
  preview.addEventListener('pointerup', stopDragging);
  preview.addEventListener('pointercancel', stopDragging);

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
    const onError = (error) => flash(`Upload failed. ${error.message}`, true);
    photo = kind === 'snapshot' ? photoRows({ uploadPhoto, onError }) : null;
    second = kind === 'snapshot' ? secondRows({ uploadPhoto, onError }) : null;
    form.replaceChildren(
      kind === 'note'
        ? section('Note',
          select('type', 'Type', TYPES),
          textarea('text', 'Words', { ...words, placeholder: 'Two pigeons fought over one fry. Both lost.' }),
        )
        : section('Snapshot',
          ...photo.rows,
          ...second.rows,
          text('photo.alt', 'Alt text', { placeholder: 'Describe the photo', maxlength: 160 }),
          text('title', 'Title', { placeholder: 'Bodega Cat', maxlength: 24 }),
          textarea('text', 'Caption', { ...words, placeholder: 'Search your deck for a cat. He’s already on the counter.' }),
          text('rule', 'Rule line', { placeholder: SNAPSHOT_RULE, maxlength: 60, hint: 'Left blank, it says the usual line.' }),
          text('place', 'Place', { placeholder: 'Union Sq', maxlength: 18, hint: 'Short, so the copyright stays in the middle.' }),
        ),
      section('Small print',
        text('date', 'Posted', { type: 'date', hint: 'Left blank, it’s today.' }),
        text('number', 'Number', { placeholder: '012/100', maxlength: 9 }),
      ),
    );
  }

  // What's in the form, tidied: trimmed, with a blank date read as today.
  function current() {
    const values = { photo: { src: '', alt: '', position: '', look: '', second: { src: '', position: '' } }, ...readForm(form) };
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
    data.photo = { src: '', alt: '', position: '', look: '', ...data.photo };
    data.photo.second = { src: '', position: '', ...data.photo.second };
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
