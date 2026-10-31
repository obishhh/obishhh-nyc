import { deckCard } from '../../src/components/deck-cards.js';
import { h } from '../../src/lib/dom.js';
import { plural } from '../../src/lib/words.js';
import { tile } from './tile.js';

// A note's name on the shelf is its first few words.
const nameOf = (data) => (data.kind === 'snapshot' ? data.title : data.text.split(/\s+/).slice(0, 5).join(' ')) || 'Untitled';

const deckTile = (data) =>
  tile({ href: `#/deck/${data.id}`, name: nameOf(data), status: data.status, card: deckCard(data), seed: data.id, showName: false });

// The deck box's cards, newest first. They go in by date, so there's nothing to drag.
export function deckShelf() {
  const grid = h('ol', { class: 'shelf__grid', 'aria-label': 'Deck box, newest first' });
  const summary = h('p', { class: 'shelf__summary' });
  const root = h('section', { class: 'shelf deck-shelf' },
    h('header', { class: 'shelf__header' },
      h('h2', { class: 'shelf__title' }, 'Deck box'),
      h('span', { class: 'deck-shelf__actions' },
        h('a', { class: 'button button--primary', href: '#/deck/new-note' }, '+ Note'),
        h('a', { class: 'button button--primary', href: '#/deck/new-snapshot' }, '+ Snapshot'),
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
        ? `${plural(entries.length, 'card')}, ${live} live.`
        : 'Empty.';
      grid.replaceChildren(...entries.map(deckTile));
    },
  };
}
