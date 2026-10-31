import { h } from '../lib/dom.js';
import { jitter } from '../lib/seeded.js';
import { card } from './card.js';
import { flipCard } from './card-back.js';
import { sealed } from './sealed.js';

const MAX_TILT = 0.8;

// A card with an article opens it; one without just turns over, so only that one is a button that stays pressed.
function flippable(data) {
  const label = data.body ? `Read ${data.title}` : `${data.title}. Flip card.`;
  return flipCard(card(data), { class: 'binder__flip', 'aria-pressed': !data.body && 'false', 'aria-label': label, dataset: data.body && { slug: data.slug } });
}

function pocket(data) {
  const tilt = jitter(data.number) * MAX_TILT;
  return h('li', { class: 'binder__pocket', style: { '--tilt': `${tilt.toFixed(2)}deg` } },
    data.sealed ? sealed(data) : flippable(data),
  );
}

// An empty pocket, so a short section still fills the page.
export const sleeve = () =>
  h('li', { class: 'binder__pocket', 'aria-hidden': 'true', style: { '--tilt': '0deg' } }, h('span', { class: 'binder__sleeve' }));

export function binder(cards, { label = 'Binder page' } = {}) {
  return h('ol', { class: 'binder', 'aria-label': label }, cards.map(pocket));
}
