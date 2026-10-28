import { formatDate, parseTags, slugify } from '../lib/format.js';

export function mountEditor(root, actions) {
  const form = root.querySelector('form');
  const fields = form.elements;
  const state = root.querySelector('[data-state]');
  const notice = root.querySelector('[data-flash]');
  const button = (action) => root.querySelector(`[data-action="${action}"]`);
  let post = null;
  let slugTouched = false;
  let dirty = false;
  let flashTimer;

  function render() {
    const live = post?.status === 'published';
    state.textContent = !post
      ? 'New draft'
      : live
        ? `Published ${formatDate(post.published_at)}`
        : `Draft · saved ${formatDate(post.updated_at)}`;
    button('save').textContent = live ? 'Update live post' : 'Save draft';
    button('publish').hidden = live;
    button('unpublish').hidden = !live;
    button('remove').hidden = !post;
  }

  function values() {
    const title = fields.title.value.trim();
    return {
      title,
      slug: fields.slug.value.trim() || slugify(title),
      kind: fields.kind.value,
      tags: parseTags(fields.tags.value),
      excerpt: fields.excerpt.value.trim() || null,
      body: fields.body.value,
    };
  }

  form.addEventListener('input', ({ target }) => {
    dirty = true;
    if (target === fields.slug) slugTouched = true;
    if (target === fields.title && !slugTouched) fields.slug.value = slugify(fields.title.value);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    actions.save(values());
  });

  root.addEventListener('click', ({ target }) => {
    const action = target.closest('[data-action]')?.dataset.action;
    if (action) actions[action](values());
  });

  return {
    get post() {
      return post;
    },
    get dirty() {
      return dirty;
    },
    load(next) {
      post = next;
      fields.title.value = next?.title ?? '';
      fields.slug.value = next?.slug ?? '';
      fields.kind.value = next?.kind ?? 'post';
      fields.tags.value = (next?.tags ?? []).join(', ');
      fields.excerpt.value = next?.excerpt ?? '';
      fields.body.value = next?.body ?? '';
      slugTouched = Boolean(next);
      dirty = false;
      render();
    },
    flash(message, bad = false) {
      clearTimeout(flashTimer);
      notice.textContent = message;
      notice.classList.toggle('bad', bad);
      if (!bad) flashTimer = setTimeout(() => (notice.textContent = ''), 2500);
    },
    focus() {
      fields.title.focus();
    },
    submit() {
      form.requestSubmit();
    },
  };
}
