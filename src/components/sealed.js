import { h } from '../lib/dom.js';
import { card } from './card.js';

export function sealed(data, { label = 'Not printed yet' } = {}) {
  const face = h('div', { class: 'sealed__card', inert: true }, card(data));
  // Safari blurs a half-decoded image with hard edges, so the card waits for its art.
  const art = face.querySelector('img');
  (art ? art.decode().catch(() => {}) : Promise.resolve()).then(() => face.classList.add('is-ready'));
  return h('div', { class: 'sealed', role: 'img', 'aria-label': `Sealed card. ${label}.` },
    face,
    h('span', { class: 'sealed__label', 'aria-hidden': 'true' }, label),
  );
}
