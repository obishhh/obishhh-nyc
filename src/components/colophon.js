import { h } from '../lib/dom.js';

export function colophon() {
  return h('footer', { class: 'colophon' },
    h('a', { class: 'colophon__link', href: '/credits/' }, 'Credits'),
  );
}
