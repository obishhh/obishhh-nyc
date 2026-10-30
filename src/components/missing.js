import { h } from '../lib/dom.js';
import { cardBack } from './card-back.js';

// For an address that isn't in the binder: a card left face down in an empty pocket.
export function missing() {
  return h('section', { class: 'missing' },
    h('div', { class: 'missing__pocket' }, cardBack()),
    h('h1', { class: 'missing__title' }, 'Nothing in this pocket'),
    h('p', { class: 'missing__text' }, 'That page isn’t in the binder. Maybe it never got printed.'),
    h('a', { class: 'missing__back', href: '/' }, 'Back to the binder'),
  );
}
