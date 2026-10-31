import { h } from '../../src/lib/dom.js';
import { MAX_TABS, sections } from '../../src/lib/sections.js';
import { blankCard, FINISHES, RARITIES, TYPES } from '../data/options.js';
import { readForm, writeForm } from '../lib/form.js';
import { photoGestures } from '../lib/photo-gestures.js';
import { recall, store } from '../lib/prefs.js';
import { artPicker } from './art-picker.js';
import { composer } from './composer.js';
import { checkbox, dropdown, number, row, section, select, text, textarea } from './fields.js';
import { preview, PREVIEW_PAUSE } from './preview.js';
import { saveBar } from './save-bar.js';

const STATUS = { new: 'New card', draft: 'Draft', published: 'Live' };
const WRITING_KEY = 'obishhh.editor.writing';

const slugify = (text) =>
  text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// The form's values, tidied into the shape the card component draws.
function tidy(data) {
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
  );
}

// The binder only has so many tabs: a section past them only shows under All.
function outOfTabs(value, others) {
  if (!value) return '';
  const ranked = sections([...others, { stats: { filed: value } }]);
  return ranked.findIndex((section) => section.value === value) >= MAX_TABS - 1 ? 'Out of tabs: only under All.' : '';
}

// Edit one card. The preview redraws as you type, once you pause.
export function editor({ cards, art: artOptions, uploadPhoto, onSave, onDelete, onDone }) {
  const bar = saveBar({
    title: (status) => STATUS[status],
    check: (status) => status !== 'published' || ready(current()),
    save: persist,
    remove: async () => {
      if (confirm(`Delete “${record.title || 'Untitled'}”?`)) await onDelete(record);
    },
    onDone,
  });
  const filedHint = h('span');
  const sectionList = h('datalist', { id: 'editor-sections' });
  const art = artPicker({
    ...artOptions,
    upload: (file) => bar.track(artOptions.upload(file)),
    onError: (error) => bar.flash(`Upload failed. ${error.message}`, true),
  });
  const view = preview();

  const articleSection = section('Article',
    row('Text', composer('body', {
      rows: 12,
      uploadPhoto: (file) => bar.track(uploadPhoto(file)),
      onError: (error) => bar.flash(`Photo upload failed. ${error.message}`, true),
    })),
    text('slug', 'Address', { placeholder: 'from the title', maxlength: 60 }),
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
      textarea('move.text', 'Text', { placeholder: 'Write 600 words about one font. If heads, write 600 more.', maxlength: 80 }),
      costRow(),
    ),
    section('Small print',
      text('dex', 'Dex strip', { placeholder: 'Essay. Length: 640 words. Filed: Oct 28, 2026.', maxlength: 64 }),
      select('stats.weakness', 'Weakness', [{ value: '', label: 'Usual for its type' }, ...TYPES]),
      select('stats.resistance', 'Resistance', [{ value: '', label: 'None' }, ...TYPES]),
      textarea('flavor', 'Flavor', { maxlength: 80 }),
    ),
    articleSection,
    sectionList,
  );

  const focusToggle = h('button', { class: 'editor__fold', type: 'button', 'aria-pressed': 'false' });

  const root = h('div', { class: 'editor' },
    bar.root,
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
  let previewTimer;
  // Counts the cards opened, so a save that lands after another one's been opened leaves that one be.
  let opened = 0;

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

  function refresh({ now = false } = {}) {
    const data = current();
    filedHint.textContent = outOfTabs(data.stats.filed, others);
    dirty = JSON.stringify(data) !== snapshot;
    bar.show(record, dirty);
    clearTimeout(previewTimer);
    if (now) view.update(data);
    else previewTimer = setTimeout(() => view.update(current()), PREVIEW_PAUSE);
  }

  // Fills the form with a card: one being opened, or the one just saved.
  function fill(next) {
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
    refresh({ now: true });
    if (fresh) writing(recall(WRITING_KEY), { remember: false });
  }

  function load(next) {
    opened += 1;
    fill(next);
  }

  function ready(data) {
    if (!data.title) {
      bar.flash('Add a title before publishing.', true);
      unfold(form.elements.namedItem('title'));
      form.elements.namedItem('title').focus();
      return false;
    }
    if (!data.art.src) {
      bar.flash('Pick an image before publishing.', true);
      unfold(art.rows[0]);
      art.focus();
      return false;
    }
    return true;
  }

  async function persist(status) {
    const data = current();
    const at = opened;
    const saved = await onSave(data, status, record?.id);
    if (at !== opened) return false;
    // Words typed while it saved stay put: the form only catches up with the saved card if it hasn't moved on.
    if (JSON.stringify(current()) === JSON.stringify(data)) fill(saved);
    else {
      record = saved;
      snapshot = JSON.stringify(data);
      refresh();
    }
  }

  // Drag the picture on the preview's card to slide it in its frame, or pinch it to zoom.
  photoGestures(view.root, {
    frames: '.card__art',
    fields: () => ['art.position', 'art.zoom'].map((name) => form.elements.namedItem(name)),
    onChange: () => art.sync(),
  });

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
    get busy() {
      return bar.busy;
    },
    flash: bar.flash,
    save: bar.save,
  };
}
