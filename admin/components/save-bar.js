import { h, svg } from '../../src/lib/dom.js';
import { formatDate } from '../lib/format.js';
import { ARROW_LEFT } from '../lib/icons.js';
import { button } from './fields.js';

// The bar across the top of an editor: back to all the cards, how the card stands (or what just happened to it), and
// its buttons. Saving goes through here: one save at a time, and `busy` while a save or an upload is out, so the room
// can keep you from leaving until it's landed.
//   title(status): what to call the card, as 'new', 'draft' or 'published'.
//   check(status): whether it's ready to save that way (saying why not, if it isn't).
//   save(status): saves it; resolves false if the card was put away meanwhile.
//   remove(): deletes it, after asking.
export function saveBar({ title, check = () => true, save, remove, onDone }) {
  const state = h('p', { class: 'editor__state', role: 'status', 'aria-live': 'polite' });
  const deleteButton = button('Delete', 'button--danger', destroy);
  const unpublish = button('Unpublish', '', () => commit('draft', 'Unpublished.'));
  const keepButton = button('Save draft', '', () => keep());
  const publish = button('Publish', 'button--primary', () => commit('published', 'Published.'));
  const actions = [deleteButton, unpublish, keepButton, publish];
  let record = null;
  let dirty = false;
  let saving = false;
  let uploads = 0;
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

  // The buttons save and head back to all the cards; ⌘S saves and stays, for mid-writing. Changes made while it
  // saved keep it here, still to be saved.
  async function commit(status, message, { stay = false } = {}) {
    if (saving || !check(status)) return;
    saving = true;
    disable(true);
    try {
      if ((await save(status)) === false) return;
      if (stay || dirty) flash(message);
      else onDone(message);
    } catch (error) {
      flash(error.message, true);
    } finally {
      saving = false;
      disable(false);
    }
  }

  const keep = (options) => commit(record?.status === 'published' ? 'published' : 'draft', 'Saved.', options);

  async function destroy() {
    disable(true);
    try {
      await remove();
    } catch (error) {
      flash(error.message, true);
    } finally {
      disable(false);
    }
  }

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
    // An upload on its way: the card isn't left until it's in.
    track(upload) {
      uploads += 1;
      return upload.finally(() => (uploads -= 1));
    },
    get busy() {
      return saving || uploads > 0;
    },
    save: () => keep({ stay: true }),
  };
}
