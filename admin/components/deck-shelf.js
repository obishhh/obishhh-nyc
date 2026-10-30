import { deckCard } from '../../src/components/deck-cards.js';
import { h } from '../../src/lib/dom.js';
import { seeded } from '../../src/lib/seeded.js';

const MAX_TILT = 0.8;
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
// A note's name on the shelf is its first few words.
const nameOf = (data) => (data.kind === 'snapshot' ? data.title : data.text.split(' ').slice(0, 5).join(' ')) || 'Untitled';

function tile(data) {
  const name = nameOf(data);
  const tilt = (seeded(data.id) * 2 - 1) * MAX_TILT;
  const live = data.status === 'published';
  return h('li', { class: 'tile', dataset: { status: data.status } },
    h('a', { class: 'tile__open', href: `#/deck/${data.id}`, 'aria-label': `Edit ${name}${live ? '' : ' (draft)'}` },
      h('div', { class: 'binder__pocket', style: { '--tilt': `${tilt.toFixed(2)}deg` } }, deckCard(data)),
    ),
    h('div', { class: 'tile__meta' },
      h('span', { class: 'tile__title' }, name),
      h('span', { class: 'tile__status' }, live ? 'Live' : 'Draft'),
    ),
  );
}

// The deck box's cards, newest first. They go in by date, so there's nothing to drag.
export function deckShelf() {
  const grid = h('ol', { class: 'shelf__grid', 'aria-label': 'Deck box, newest first' });
  const summary = h('p', { class: 'shelf__summary' });
  const root = h('section', { class: 'shelf deck-shelf' },
    h('header', { class: 'shelf__header' },
      h('h2', { class: 'shelf__title' }, 'Deck box'),
      h('span', { class: 'deck-shelf__actions' },
        h('a', { class: 'button', href: '#/deck/new-note' }, 'New note'),
        h('a', { class: 'button button--primary', href: '#/deck/new-snapshot' }, 'New Snapshot'),
      ),
    ),
    summary,
    grid,
  );

  return {
    root,
    update(entries) {
      const live = entries.filter(({ status }) => status === 'published').length;
      summary.textContent = entries.length
        ? `${plural(entries.length, 'card')}, ${live} live. Only live ones go in the box; drafts stay here.`
        : 'Empty. Notes and Snapshots you publish go in the deck box beside the binder.';
      grid.replaceChildren(...entries.map(tile));
    },
  };
}
