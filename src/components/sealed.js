import { h } from '../lib/dom.js';
import { card } from './card.js';

export function sealed(data, { label = 'Not printed yet' } = {}) {
  return h('div', { class: 'sealed', role: 'img', 'aria-label': `Sealed card. ${label}.` },
    h('div', { class: 'sealed__card', inert: true }, card(data)),
    h('span', { class: 'sealed__label', 'aria-hidden': 'true' }, label),
  );
}
