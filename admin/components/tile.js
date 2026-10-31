import { h } from '../../src/lib/dom.js';
import { seeded } from '../../src/lib/seeded.js';

const MAX_TILT = 0.8;

// Tiles for the cards on a shelf, kept from one look at the shelf to the next: a card's only drawn again once it's
// been saved since.
export function tiles(make) {
  const kept = new Map();
  return (cards) => {
    const next = new Map(cards.map((data) => {
      const was = kept.get(data.id);
      return [data.id, was?.stamp === data.updated_at ? was : { stamp: data.updated_at, tile: make(data) }];
    }));
    kept.clear();
    next.forEach((value, id) => kept.set(id, value));
    return cards.map(({ id }) => kept.get(id).tile);
  };
}

// A card on the editor's shelf: the card itself, a little askew in its pocket, with its name and whether it's live.
// The name can stay off when the card already says it all.
export function tile({ href, name, status, card, seed, data = {}, extra, showName = true }) {
  const tilt = (seeded(seed) * 2 - 1) * MAX_TILT;
  const live = status === 'published';
  return h('li', { class: 'tile', dataset: { status, ...data }, style: { '--tilt': `${tilt.toFixed(2)}deg` } },
    h('a', { class: 'tile__open', href, draggable: 'false', 'aria-label': `Edit ${name}${live ? '' : ' (draft)'}` },
      h('div', { class: 'binder__pocket' }, card),
    ),
    h('div', { class: 'tile__meta' },
      showName && h('span', { class: 'tile__title' }, name),
      h('span', { class: 'tile__status' }, live ? 'Live' : 'Draft'),
      extra,
    ),
  );
}
