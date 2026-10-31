import { card } from '../../src/components/card.js';
import { h, svg } from '../../src/lib/dom.js';
import { plural } from '../../src/lib/words.js';
import { GRIP } from '../lib/icons.js';
import { sortable } from '../lib/sortable.js';
import { tile, tiles } from './tile.js';

let shelves = 0;

// A shelf's name, pressed to fold its cards away or bring them back. They start folded, so every shelf's buttons are
// near the top of the room.
export function shelfTitle(heading, title, grid) {
  grid.id ||= `shelf-${++shelves}`;
  grid.hidden = true;
  const fold = h('button', { class: 'shelf__fold', type: 'button', 'aria-expanded': 'false', 'aria-controls': grid.id }, title);
  fold.addEventListener('click', () => {
    grid.hidden = !grid.hidden;
    fold.setAttribute('aria-expanded', String(!grid.hidden));
  });
  return h(heading, { class: 'shelf__title' }, fold);
}

// The handle a tile's dragged by.
export const grip = (name) => h('button', { class: 'tile__grip', type: 'button', 'aria-label': `Move ${name}. Use the arrow keys.` }, svg(GRIP));

function cardTile(data) {
  const title = data.title || 'Untitled';
  return tile({
    href: `#/card/${data.id}`, name: title, status: data.status, card: card(data), seed: data.number, data: { id: data.id, title },
    extra: grip(title),
  });
}

// Every card in binder order, drafts included. Drag (or arrow-key the handle) to reorder. The binder's unless told
// otherwise: what it's called, its heading, its button for a new one, and how its cards are drawn.
export function shelf({
  onSort,
  title = 'Binder',
  heading = 'h1',
  add = { href: '#/new', label: '+ Card' },
  label = 'Cards in binder order',
  make = cardTile,
  className = '',
}) {
  const grid = h('ol', { class: 'shelf__grid', 'aria-label': label });
  const summary = h('p', { class: 'shelf__summary' });
  const status = h('p', { class: 'shelf__status', role: 'status', 'aria-live': 'polite' });
  const tilesFor = tiles(make);
  let flashTimer;

  const root = h('section', { class: `shelf ${className}`.trim() },
    h('header', { class: 'shelf__header' },
      shelfTitle(heading, title, grid),
      h('a', { class: 'button button--primary', href: add.href }, add.label),
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
      summary.textContent = `${plural(cards.length, 'card')}, ${live} live.`;
      grid.replaceChildren(...tilesFor(cards));
    },
  };
}
