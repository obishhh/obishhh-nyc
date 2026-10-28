import { formatDate } from '../lib/format.js';

const EMPTY = { all: 'No posts yet.', draft: 'No drafts.', published: 'Nothing published yet.' };

export function mountPostList(root, { onSelect }) {
  const list = root.querySelector('[data-list]');
  const tabs = [...root.querySelectorAll('[data-filter]')];
  let posts = [];
  let filter = 'all';
  let selectedId = null;

  function item(post) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    const title = document.createElement('strong');
    const meta = document.createElement('small');
    button.type = 'button';
    button.setAttribute('aria-current', String(post.id === selectedId));
    title.textContent = post.title || 'Untitled';
    meta.textContent = `${post.kind} · ${post.status} · ${formatDate(post.updated_at)}`;
    button.append(title, meta);
    button.addEventListener('click', () => onSelect(post.id));
    li.append(button);
    return li;
  }

  function empty() {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = EMPTY[filter];
    return li;
  }

  function render() {
    const shown = posts.filter((post) => filter === 'all' || post.status === filter);
    list.replaceChildren(...(shown.length ? shown.map(item) : [empty()]));
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      filter = tab.dataset.filter;
      tabs.forEach((other) => other.setAttribute('aria-pressed', String(other === tab)));
      render();
    });
  }

  return {
    update(next) {
      posts = next;
      render();
    },
    select(id) {
      selectedId = id;
      render();
    },
  };
}
