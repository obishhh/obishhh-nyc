import { card } from '../../src/components/card.js';
import { h, svg } from '../../src/lib/dom.js';
import { plural } from '../../src/lib/words.js';
import { GRIP } from '../lib/icons.js';
import { sortable } from '../lib/sortable.js';
import { tile } from './tile.js';

function cardTile(data) {
  const title = data.title || 'Untitled';
  return tile({
    href: `#/card/${data.id}`, name: title, status: data.status, card: card(data), seed: data.number, data: { id: data.id, title },
    extra: h('button', { class: 'tile__grip', type: 'button', 'aria-label': `Move ${title}. Use the arrow keys.` }, svg(GRIP)),
  });
}

const newTile = () =>
  h('li', { class: 'shelf__new' }, h('a', { class: 'shelf__new-link', href: '#/new' }, 'New card'));

// Every card in binder order, drafts included. Drag (or arrow-key the handle) to reorder.
export function shelf({ onSort }) {
  const grid = h('ol', { class: 'shelf__grid', 'aria-label': 'Cards in binder order' });
  const summary = h('p', { class: 'shelf__summary' });
  const status = h('p', { class: 'shelf__status', role: 'status', 'aria-live': 'polite' });
  let flashTimer;

  const root = h('section', { class: 'shelf' },
    h('header', { class: 'shelf__header' },
      h('h1', { class: 'shelf__title' }, 'Cards'),
      h('a', { class: 'button button--primary', href: '#/new' }, 'New card'),
    ),
    summary,
    status,
    grid,
  );

  function flash(message, bad = false) {
    clearTimeout(flashTimer);
    status.textContent = message;
    status.classList.toggle('is-bad', bad);
    flashTimer = setTimeout(() => (status.textContent = ''), bad ? 6000 : 2500);
  }

  sortable(grid, {
    item: '.tile',
    handle: '.tile__grip',
    onSort,
    onMove: (target, index, total) => flash(`${target.dataset.title} moved to spot ${index + 1} of ${total}.`),
  });

  return {
    root,
    flash,
    update(cards) {
      const live = cards.filter(({ status: state }) => state === 'published').length;
      summary.textContent = `${plural(cards.length, 'card')}, ${live} live. Drag to reorder. Drafts show up sealed on the site.`;
      grid.replaceChildren(...cards.map(cardTile), newTile());
    },
  };
}
