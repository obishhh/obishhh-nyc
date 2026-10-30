import { h } from '../../src/lib/dom.js';
import { seeded } from '../../src/lib/seeded.js';

const MAX_TILT = 0.8;

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
