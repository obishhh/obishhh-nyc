import { energy } from '../../src/components/energy.js';
import { rarity } from '../../src/components/rarity.js';
import { h, svg } from '../../src/lib/dom.js';
import { blankCard, FINISHES, RARITIES, STAGES, TYPES } from '../data/options.js';
import { readForm, writeForm } from '../lib/form.js';
import { formatDate } from '../lib/format.js';
import { ARROW_LEFT } from '../lib/icons.js';
import { artPicker } from './art-picker.js';
import { choice, number, options, section, text, textarea, toggle } from './fields.js';
import { preview } from './preview.js';
import { toast } from './toast.js';

const CHIPS = { new: 'New', draft: 'Draft', published: 'Live' };

function trim(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(trim);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, trim(inner)]));
  return value;
}

// The form's values, tidied into the shape the card component draws.
function tidy(values) {
  const data = trim(values);
  data.minutes ??= 0;
  data.move.score ??= 0;
  data.move.cost = data.move.cost.filter(Boolean);
  data.flavor ||= null;
  return data;
}

function costPicker() {
  const slot = (index, ...first) =>
    h('select', { class: 'input', name: `move.cost.${index}`, 'aria-label': `Energy ${index + 1}` }, first, options(TYPES));
  return h('fieldset', { class: 'cost', dataset: { span: '6' } },
    h('legend', { class: 'field__label' }, 'Energy cost'),
    h('div', { class: 'cost__slots' }, slot(0), slot(1, h('option', { value: '' }, 'None'))),
    h('p', { class: 'field__hint' }, 'The little circles beside the move. The first one follows the card’s type until you change it.'),
  );
}

function button(label, variant, onClick) {
  const element = h('button', { class: `button ${variant}`.trim(), type: 'button' }, label);
  element.addEventListener('click', onClick);
  return element;
}

// Edit one card. Every field redraws the preview as you type.
export function editor({ cards, art: artOptions, onSave, onDelete }) {
  const art = artPicker({ ...artOptions, onError: (error) => toast(`Couldn’t upload that one. ${error.message}`, { tone: 'bad' }) });
  const view = preview();

  const form = h('form', { class: 'editor__form', novalidate: true },
    section('Name', 'The top line of the card.',
      text('title', 'Title', { placeholder: 'Bodega Cat #14', maxlength: 32, span: 4, hint: 'Long titles get cut off. Watch the preview.' }),
      number('minutes', 'Read time', { min: 0, max: 999, suffix: 'min', span: 2 }),
      text('stage', 'Stage', { list: 'editor-stages', placeholder: 'Basic Post', maxlength: 24, span: 3 }),
      text('number', 'Card number', { placeholder: '012/120', maxlength: 9, span: 3 }),
    ),
    section('Look', 'Colour, shine and how rare it is.',
      choice('type', 'Type', TYPES.map(({ value, label }) => ({ value, label, icon: energy(value), dataset: { type: value } })), { variant: 'types' }),
      choice('finish', 'Finish', FINISHES),
      choice('rarity', 'Rarity', RARITIES.map(({ value, label }) => ({ value, label, icon: rarity(value) }))),
      toggle('firstPrint', 'First print badge', { hint: 'The little “1” at the start of the dex strip.' }),
    ),
    section('Art', 'Pick something from the library or upload your own.', art.root),
    section('Move', 'The attack in the middle of the card.',
      text('move.name', 'Move name', { placeholder: 'Overthink', maxlength: 24, span: 4 }),
      number('move.score', 'Damage', { min: 0, max: 999, span: 2 }),
      textarea('move.text', 'Move text', { placeholder: 'Write 600 words about one font. If heads, write 600 more.', maxlength: 80, hint: 'About 70 characters fit.' }),
      costPicker(),
    ),
    section('Small print', 'Everything under the art and along the bottom.',
      text('dex', 'Dex strip', { placeholder: 'Essay. Length: 640 words. Filed: Oct 28, 2026.', maxlength: 64 }),
      text('stats.reads', 'Reads', { placeholder: '1.2k', maxlength: 8, span: 2 }),
      text('stats.replies', 'Replies', { placeholder: '14', maxlength: 8, span: 2 }),
      text('stats.filed', 'Filed under', { placeholder: 'type', maxlength: 12, span: 2 }),
      textarea('flavor', 'Flavor text', { placeholder: 'Fed by nobody. Somehow 19 pounds.', maxlength: 80, hint: 'Optional. The italic box at the bottom.' }),
    ),
    h('datalist', { id: 'editor-stages' }, STAGES.map((value) => h('option', { value }))),
  );

  const chip = h('span', { class: 'chip' });
  const state = h('span', { class: 'editor__state-text' });
  const remove = button('Delete', 'button--danger', destroy);
  const unpublish = button('Unpublish', '', () => commit('draft', 'Unpublished. It’s sealed again.'));
  const save = button('Save draft', '', keep);
  const publish = button('Publish', 'button--publish', () => commit('published', 'Published. It’s face up in the binder.'));
  const actions = [remove, unpublish, save, publish];

  const root = h('div', { class: 'editor' },
    h('div', { class: 'editor__bar' },
      h('a', { class: 'editor__back', href: '#/' }, svg(ARROW_LEFT), h('span', {}, 'All cards')),
      h('p', { class: 'editor__state' }, chip, state),
      h('div', { class: 'editor__actions' }, actions),
    ),
    h('div', { class: 'editor__body' },
      form,
      h('aside', { class: 'editor__preview', 'aria-label': 'Preview' }, view.root),
    ),
  );

  let record = null;
  let snapshot = '';
  let dirty = false;
  let shownType = '';

  const current = () => tidy(readForm(form));

  function renderState() {
    const status = record?.status ?? 'new';
    chip.className = `chip chip--${status}`;
    chip.textContent = CHIPS[status];
    state.textContent = dirty
      ? 'Unsaved changes'
      : status === 'new'
        ? 'Not saved yet'
        : `${status === 'draft' ? 'Sealed on the site' : 'Face up in the binder'} · saved ${formatDate(record.updated_at)}`;
    state.classList.toggle('is-dirty', dirty);
    remove.hidden = !record;
    unpublish.hidden = status !== 'published';
    publish.hidden = status === 'published';
    save.textContent = status === 'published' ? 'Save changes' : 'Save draft';
    save.classList.toggle('button--primary', status === 'published');
  }

  function refresh() {
    const data = current();
    view.update(data);
    dirty = JSON.stringify(data) !== snapshot;
    renderState();
  }

  function load(next) {
    if (!next || next.id !== record?.id) view.reset();
    record = next;
    const data = structuredClone(next ?? blankCard(cards()));
    data.move.cost ??= [data.type, 'plain'];
    art.prepare(data.art);
    writeForm(form, data);
    art.sync();
    shownType = data.type;
    snapshot = JSON.stringify(current());
    refresh();
  }

  function ready(data) {
    if (!data.title) {
      toast('Give it a title before it goes out.', { tone: 'bad' });
      form.elements.namedItem('title').focus();
      return false;
    }
    if (!data.art.src) {
      toast('Pick some art before it goes out.', { tone: 'bad' });
      art.focus();
      return false;
    }
    return true;
  }

  function busy(on) {
    actions.forEach((action) => (action.disabled = on));
  }

  async function commit(status, message) {
    const data = current();
    if (status === 'published' && !ready(data)) return;
    busy(true);
    try {
      load(await onSave(data, status, record?.id));
      toast(message);
    } catch (error) {
      toast(error.message, { tone: 'bad' });
    } finally {
      busy(false);
    }
  }

  function keep() {
    const live = record?.status === 'published';
    return commit(live ? 'published' : 'draft', live ? 'Saved. The live card is updated.' : 'Saved. Still sealed on the site.');
  }

  async function destroy() {
    if (!record || !confirm(`Delete “${record.title || 'Untitled'}”? This can’t be undone.`)) return;
    busy(true);
    try {
      await onDelete(record);
      toast('Deleted. Into the bin it goes.');
    } catch (error) {
      toast(error.message, { tone: 'bad' });
    } finally {
      busy(false);
    }
  }

  form.addEventListener('input', ({ target }) => {
    // The first energy follows the type, unless it's been set to something else.
    if (target.name === 'type') {
      const cost = form.elements.namedItem('move.cost.0');
      if (cost.value === shownType) cost.value = target.value;
      shownType = target.value;
    }
    refresh();
  });

  form.addEventListener('submit', (event) => event.preventDefault());

  return {
    root,
    load,
    get dirty() {
      return dirty;
    },
    save: keep,
  };
}
