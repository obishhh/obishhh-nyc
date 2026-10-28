import { card } from '../../src/components/card.js';
import { h, svg } from '../../src/lib/dom.js';
import { seeded } from '../../src/lib/seeded.js';
import { GRIP, PLUS } from '../lib/icons.js';
import { sortable } from '../lib/sortable.js';

const MAX_TILT = 0.8;
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function tile(data) {
  const title = data.title || 'Untitled';
  const live = data.status === 'published';
  const tilt = (seeded(data.number) * 2 - 1) * MAX_TILT;
  return h('li', { class: 'tile', dataset: { id: data.id, title, status: data.status }, style: { '--tilt': `${tilt.toFixed(2)}deg` } },
    h('a', { class: 'tile__open', href: `#/card/${data.id}`, draggable: 'false', 'aria-label': `Edit ${title}` },
      h('div', { class: 'binder__pocket' }, card(data)),
    ),
    h('div', { class: 'tile__meta' },
      h('span', { class: `chip chip--${data.status}` }, live ? 'Live' : 'Draft'),
      h('span', { class: 'tile__title' }, title),
      h('button', { class: 'tile__grip', type: 'button', 'aria-label': `Move ${title}. Use the arrow keys.` }, svg(GRIP)),
    ),
  );
}

const newTile = () =>
  h('li', { class: 'shelf__new' },
    h('a', { class: 'shelf__new-link', href: '#/new' },
      h('span', { class: 'shelf__new-plus' }, svg(PLUS)),
      'New card',
    ),
  );

// Every card in binder order, drafts included. Drag (or arrow-key the handle) to reorder.
export function shelf({ onSort }) {
  const grid = h('ol', { class: 'shelf__grid', 'aria-label': 'Cards in binder order' });
  const summary = h('p', { class: 'shelf__summary' });
  const announcer = h('p', { class: 'visually-hidden', 'aria-live': 'assertive' });

  const root = h('section', { class: 'shelf' },
    h('header', { class: 'shelf__header' },
      h('div', {},
        h('h1', { class: 'shelf__title' }, 'The binder'),
        summary,
      ),
      h('a', { class: 'button button--primary', href: '#/new' }, svg(PLUS), 'New card'),
    ),
    h('p', { class: 'shelf__help' }, 'Drag cards to reorder the binder. Drafts show up sealed on the site: blurred, with their words kept secret until you publish.'),
    grid,
    announcer,
  );

  sortable(grid, {
    item: '.tile',
    handle: '.tile__grip',
    onSort,
    onMove: (target, index, total) => {
      announcer.textContent = `${target.dataset.title} moved to spot ${index + 1} of ${total}.`;
    },
  });

  return {
    root,
    update(cards) {
      const live = cards.filter(({ status }) => status === 'published').length;
      summary.textContent = `${plural(cards.length, 'card')} · ${live} live · ${cards.length - live} sealed`;
      grid.replaceChildren(...cards.map(tile), newTile());
    },
  };
}
