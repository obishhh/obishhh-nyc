import { h } from '../lib/dom.js';
import { seeded } from '../lib/seeded.js';
import { card } from './card.js';
import { cardBack } from './card-back.js';
import { sealed } from './sealed.js';

const MAX_TILT = 0.8;

// A card with an article opens it; one without just turns over, so only that one is a button that stays pressed.
function flippable(data) {
  const label = data.body ? `Read ${data.title}` : `${data.title}. Flip card.`;
  return h('div', { class: 'binder__flip', role: 'button', tabindex: 0, 'aria-pressed': !data.body && 'false', 'aria-label': label, dataset: data.body && { slug: data.slug } },
    card(data),
    cardBack(),
  );
}

function pocket(data) {
  const tilt = (seeded(data.number) * 2 - 1) * MAX_TILT;
  return h('li', { class: 'binder__pocket', style: { '--tilt': `${tilt.toFixed(2)}deg` } },
    data.sealed ? sealed(data) : flippable(data),
  );
}

export function binder(cards, { label = 'Binder page' } = {}) {
  return h('ol', { class: 'binder', 'aria-label': label }, cards.map(pocket));
}
