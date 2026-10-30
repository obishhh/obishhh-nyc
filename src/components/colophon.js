import { h } from '../lib/dom.js';
import { fadeOut } from '../lib/fade.js';

export function colophon() {
  return h('footer', { class: 'colophon' },
    h('a', { class: 'colophon__link', href: '/credits/' }, 'Credits'),
    fadeOut(h('a', { class: 'colophon__link', href: '/admin/' }, 'Editor’s room')),
  );
}
