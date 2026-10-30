import { h, svg } from '../../src/lib/dom.js';
import { MAX_TABS, sections } from '../../src/lib/sections.js';
import { plural } from '../../src/lib/words.js';
import { blankCard, FINISHES, RARITIES, TYPES } from '../data/options.js';
import { readForm, writeForm } from '../lib/form.js';
import { formatDate } from '../lib/format.js';
import { ARROW_LEFT } from '../lib/icons.js';
import { recall, store } from '../lib/prefs.js';
import { artPicker } from './art-picker.js';
import { composer } from './composer.js';
import { button, checkbox, dropdown, number, row, section, select, text, textarea } from './fields.js';
import { preview } from './preview.js';

const STATUS = { new: 'New card', draft: 'Draft', published: 'Live' };
const WRITING_KEY = 'obishhh.editor.writing';

function trim(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(trim);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, trim(inner)]));
  return value;
}

const slugify = (text) =>
  text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// The form's values, tidied into the shape the card component draws.
function tidy(values) {
  const data = trim(values);
  // An article needs an address; borrow one from the title if it has none.
  data.slug = slugify(data.slug || (data.body ? data.title : '')) || null;
  data.minutes ??= 0;
  data.move.score ??= 0;
  data.move.cost = data.move.cost.filter(Boolean);
  data.flavor ||= null;
  return data;
}

function costRow() {
  const none = [{ value: '', label: 'None' }];
  return row('Cost',
    h('span', { class: 'inline' },
      dropdown('move.cost.0', TYPES, { 'aria-label': 'First energy' }),
      dropdown('move.cost.1', [...none, ...TYPES], { 'aria-label': 'Second energy' }),
    ),
    'The first energy follows the type until you change it.',
  );
}

// Which binder tab "filed under" puts the card behind, among the other live cards'. Sealed cards only show under All.
function whereFiled(value, live, others) {
  if (!value) return 'Its tab in the binder. Left blank, it only shows under All.';
  const ranked = sections([...others, { stats: { filed: value } }]);
  const place = ranked.findIndex((section) => section.value === value);
  const company = ranked[place].count - 1;
  const where = place >= MAX_TABS - 1 ? 'it only shows under All, since the binder’s out of tabs'
    : company ? `it goes behind the “${value}” tab, with ${plural(company, 'other card')}`
    : `it gets a “${value}” tab to itself`;
  return live ? `${where[0].toUpperCase()}${where.slice(1)}.` : `Once it’s live, ${where}.`;
}

// Edit one card. Every field redraws the preview as you type.
export function editor({ cards, art: artOptions, uploadPhoto, onSave, onDelete, onDone }) {
  const state = h('p', { class: 'editor__state', role: 'status', 'aria-live': 'polite' });
  let flashTimer;

  function flash(message, bad = false) {
    clearTimeout(flashTimer);
    state.textContent = message;
    state.classList.toggle('is-bad', bad);
    flashTimer = setTimeout(renderState, bad ? 6000 : 2500);
  }

  const filedHint = h('span');
  const sectionList = h('datalist', { id: 'editor-sections' });
  const art = artPicker({ ...artOptions, onError: (error) => flash(`Upload failed. ${error.message}`, true) });
  const view = preview();

  const articleSection = section('Article',
    row('Text', composer('body', {
      rows: 12,
      placeholder: 'Leave a blank line between paragraphs.',
      uploadPhoto,
      onError: (error) => flash(`Photo upload failed. ${error.message}`, true),
    }), 'Tapping a published card opens this. Leave it empty and the card just flips.'),
    text('slug', 'Address', { placeholder: 'from the title', maxlength: 60, hint: 'The end of its link: obishhh.nyc/?card=…' }),
  );

  const form = h('form', { class: 'editor__form', novalidate: true },
    section('Card',
      text('title', 'Title', { placeholder: 'Bodega Cat #14', maxlength: 32 }),
      text('stats.filed', 'Filed under', { list: 'editor-sections', placeholder: 'nyc', maxlength: 12, hint: filedHint }),
      text('number', 'Number', { placeholder: '012/120', maxlength: 9 }),
      number('minutes', 'Read time', { min: 0, max: 999, unit: 'min' }),
    ),
    section('Look',
      select('type', 'Type', TYPES),
      select('finish', 'Finish', FINISHES),
      select('rarity', 'Rarity', RARITIES),
      checkbox('firstPrint', 'First print', 'Show the “1” badge'),
    ),
    section('Art', ...art.rows),
    section('Move',
      text('move.name', 'Name', { placeholder: 'Overthink', maxlength: 24 }),
      number('move.score', 'Damage', { min: 0, max: 999 }),
      textarea('move.text', 'Text', { placeholder: 'Write 600 words about one font. If heads, write 600 more.', maxlength: 80, hint: 'About 70 characters fit.' }),
      costRow(),
    ),
    section('Small print',
      text('dex', 'Dex strip', { placeholder: 'Essay. Length: 640 words. Filed: Oct 28, 2026.', maxlength: 64 }),
      select('stats.weakness', 'Weakness', [{ value: '', label: 'Usual for its type' }, ...TYPES]),
      select('stats.resistance', 'Resistance', [{ value: '', label: 'None' }, ...TYPES], { hint: 'Retreat comes from the read time.' }),
      textarea('flavor', 'Flavor', { placeholder: 'Optional', maxlength: 80 }),
    ),
    articleSection,
    sectionList,
  );

  const remove = button('Delete', 'button--danger', destroy);
  const unpublish = button('Unpublish', '', () => commit('draft', 'Unpublished. It’s sealed again.'));
  const save = button('Save draft', '', () => keep());
  const publish = button('Publish', 'button--primary', () => commit('published', 'Published.'));
  const actions = [remove, unpublish, save, publish];
  const focusToggle = h('button', { class: 'editor__fold', type: 'button', 'aria-pressed': 'false' });

  const root = h('div', { class: 'editor' },
    h('div', { class: 'editor__bar' },
      h('a', { class: 'editor__back', href: '#/' }, svg(ARROW_LEFT), 'All cards'),
      state,
      h('div', { class: 'editor__actions' }, actions),
    ),
    h('div', { class: 'editor__body' },
      h('div', { class: 'editor__main' }, focusToggle, form),
      h('aside', { class: 'editor__preview', 'aria-label': 'Preview' }, view.root),
    ),
  );

  let record = null;
  let snapshot = '';
  let dirty = false;
  let shownType = '';
  let others = [];

  const current = () => tidy(readForm(form));

  // Writing mode folds every section but the article, and is remembered between visits.
  const otherSections = () => [...form.querySelectorAll('.form-section')].filter((each) => each !== articleSection);

  function syncFocusToggle() {
    const on = otherSections().every((each) => !each.open);
    focusToggle.setAttribute('aria-pressed', String(on));
    const label = on ? 'Show all sections' : 'Collapse all but the article';
    focusToggle.setAttribute('aria-label', label);
    focusToggle.title = label;
  }

  function writing(on, { remember = true } = {}) {
    otherSections().forEach((each) => (each.open = !on));
    articleSection.open = true;
    view.setView(on ? 'article' : 'revealed');
    if (remember) store(WRITING_KEY, on);
    syncFocusToggle();
  }

  const unfold = (element) => (element.closest('.form-section').open = true);

  function renderState() {
    clearTimeout(flashTimer);
    const status = record?.status ?? 'new';
    state.classList.remove('is-bad');
    state.classList.toggle('is-dirty', dirty);
    state.textContent = [
      STATUS[status],
      dirty ? 'Unsaved changes' : record && `Saved ${formatDate(record.updated_at)}`,
    ].filter(Boolean).join(' · ');
    remove.hidden = !record;
    unpublish.hidden = status !== 'published';
    publish.hidden = status === 'published';
    save.textContent = status === 'published' ? 'Save changes' : 'Save draft';
    save.classList.toggle('button--primary', status === 'published');
  }

  function refresh() {
    const data = current();
    view.update(data);
    filedHint.textContent = whereFiled(data.stats.filed, record?.status === 'published', others);
    dirty = JSON.stringify(data) !== snapshot;
    renderState();
  }

  function load(next) {
    const fresh = !next || next.id !== record?.id;
    if (fresh) view.reset();
    record = next;
    const rest = cards().filter(({ id }) => id !== next?.id);
    others = rest.filter(({ status }) => status === 'published');
    sectionList.replaceChildren(...sections(rest).map(({ value }) => h('option', { value })));
    const data = structuredClone(next ?? blankCard(cards()));
    data.move.cost ??= [data.type, 'plain'];
    art.prepare(data.art);
    writeForm(form, data);
    art.sync();
    shownType = data.type;
    snapshot = JSON.stringify(current());
    refresh();
    if (fresh) writing(recall(WRITING_KEY), { remember: false });
  }

  function ready(data) {
    if (!data.title) {
      flash('Add a title before publishing.', true);
      unfold(form.elements.namedItem('title'));
      form.elements.namedItem('title').focus();
      return false;
    }
    if (!data.art.src) {
      flash('Pick an image before publishing.', true);
      unfold(art.rows[0]);
      art.focus();
      return false;
    }
    return true;
  }

  function busy(on) {
    actions.forEach((action) => (action.disabled = on));
  }

  // One save at a time: a second ⌘S while the first is out would save a new card twice.
  let saving = false;

  // The buttons save and head back to the binder; ⌘S saves and stays, for mid-writing.
  async function commit(status, message, { stay = false } = {}) {
    const data = current();
    if (saving || (status === 'published' && !ready(data))) return;
    saving = true;
    busy(true);
    try {
      load(await onSave(data, status, record?.id));
      if (stay) flash(message);
      else onDone(message);
    } catch (error) {
      flash(error.code === '23505' ? 'Another card already uses that address.' : error.message, true);
    } finally {
      saving = false;
      busy(false);
    }
  }

  function keep(options) {
    const live = record?.status === 'published';
    return commit(live ? 'published' : 'draft', live ? 'Saved. The live card is updated.' : 'Saved. Still sealed on the site.', options);
  }

  async function destroy() {
    if (!record || !confirm(`Delete “${record.title || 'Untitled'}”? This can’t be undone.`)) return;
    busy(true);
    try {
      await onDelete(record);
    } catch (error) {
      flash(error.message, true);
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
  form.addEventListener('toggle', syncFocusToggle, true);

  focusToggle.addEventListener('click', () => {
    const on = focusToggle.getAttribute('aria-pressed') !== 'true';
    writing(on);
    if (!on) return;
    articleSection.scrollIntoView({ block: 'start' });
    form.elements.namedItem('body').focus({ preventScroll: true });
  });

  return {
    root,
    load,
    get dirty() {
      return dirty;
    },
    save: () => keep({ stay: true }),
  };
}
