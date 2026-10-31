import { h, svg } from '../../src/lib/dom.js';
import { formatDate } from '../lib/format.js';
import { ARROW_LEFT } from '../lib/icons.js';
import { button } from './fields.js';

// The bar across the top of an editor: back to all the cards, how the card stands (or what just happened to it), and
// its buttons. Saving and deleting go through here, one at a time, and `busy` while one or an upload is out, so the
// room can keep you from leaving until it's landed.
//   title(status): what to call the card, as 'new', 'draft' or 'published'.
//   check(status): whether it's ready to save that way (saying why not, if it isn't).
//   save(status): saves it.
//   remove(): deletes it, after asking.
export function saveBar({ title, check = () => true, save, remove, onDone }) {
  const state = h('p', { class: 'editor__state', role: 'status', 'aria-live': 'polite' });
  const deleteButton = button('Delete', 'button--danger', () => run(remove));
  const unpublish = button('Unpublish', '', () => commit('draft', 'Unpublished.'));
  const keepButton = button('Save draft', '', () => keep());
  const publish = button('Publish', 'button--primary', () => commit('published', 'Published.'));
  const actions = [deleteButton, unpublish, keepButton, publish];
  const uploads = new Set();
  let record = null;
  let dirty = false;
  let working = false;
  let flashTimer;

  function render() {
    clearTimeout(flashTimer);
    const status = record?.status ?? 'new';
    state.classList.remove('is-bad');
    state.classList.toggle('is-dirty', dirty);
    state.textContent = [title(status), dirty ? 'Unsaved changes' : record && `Saved ${formatDate(record.updated_at)}`]
      .filter(Boolean).join(' · ');
    deleteButton.hidden = !record;
    unpublish.hidden = status !== 'published';
    publish.hidden = status === 'published';
    keepButton.textContent = status === 'published' ? 'Save changes' : 'Save draft';
    keepButton.classList.toggle('button--primary', status === 'published');
  }

  function flash(message, bad = false) {
    clearTimeout(flashTimer);
    state.textContent = message;
    state.classList.toggle('is-bad', bad);
    flashTimer = setTimeout(render, bad ? 6000 : 2500);
  }

  const disable = (on) => actions.forEach((action) => (action.disabled = on));

  // One save or delete at a time, with the buttons off until it's done.
  async function run(work) {
    if (working) return;
    working = true;
    disable(true);
    try {
      await work();
    } catch (error) {
      flash(error.message, true);
    } finally {
      working = false;
      disable(false);
    }
  }

  // The buttons save and head back to all the cards; ⌘S saves and stays, for mid-writing. A photo still uploading goes
  // in with the save, and changes made while it saved keep it here, still to be saved.
  const commit = (status, message, { stay = false } = {}) => run(async () => {
    while (uploads.size) await Promise.allSettled(uploads);
    if (!check(status)) return;
    await save(status);
    if (stay || dirty) flash(message);
    else onDone(message);
  });

  const keep = (options) => commit(record?.status === 'published' ? 'published' : 'draft', 'Saved.', options);

  return {
    root: h('div', { class: 'editor__bar' },
      h('a', { class: 'editor__back', href: '#/' }, svg(ARROW_LEFT), 'All cards'),
      state,
      h('div', { class: 'editor__actions' }, actions),
    ),
    flash,
    // The card as saved, and whether the form has moved on from it.
    show(next, isDirty) {
      record = next;
      dirty = isDirty;
      render();
    },
    // An upload on its way: the card isn't left, or saved, until it's in.
    track(upload) {
      const out = upload.finally(() => uploads.delete(out));
      uploads.add(out);
      return out;
    },
    get busy() {
      return working || uploads.size > 0;
    },
    save: () => keep({ stay: true }),
  };
}
