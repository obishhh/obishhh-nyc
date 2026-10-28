import { licenses } from '../data/licenses.js';
import { h } from '../lib/dom.js';

function entry({ label, src, title, author, license, source, changes = 'cropped' }) {
  return h('li', { class: 'credits__entry' },
    h('img', { class: 'credits__thumb', src, alt: '', width: 202, height: 128, loading: 'lazy', decoding: 'async' }),
    h('div', { class: 'credits__text' },
      h('p', { class: 'credits__card' }, label),
      h('p', { class: 'credits__work' }, h('a', { href: source }, title), ` by ${author}`),
      h('p', { class: 'credits__license' }, h('a', { href: licenses[license] }, license), ` · ${changes}`),
    ),
  );
}

// One entry per licensed work, in binder order. Your own photos need no credit.
function cardWorks(cards) {
  const works = new Map();
  for (const { title, sealed, art } of cards) {
    if (art.src && art.license && !works.has(art.src)) {
      works.set(art.src, { label: sealed ? 'Sealed card' : title, ...art });
    }
  }
  return [...works.values()];
}

export function credits({ cards, back }) {
  const works = [
    ...cardWorks(cards),
    ...back.map((work) => ({ label: 'Card back', ...work })),
  ];
  return h('section', { class: 'credits' },
    h('h1', { class: 'credits__title' }, 'Credits'),
    h('p', { class: 'credits__intro' }, 'The card art is cropped from Creative Commons and public-domain works. Thank you to the artists.'),
    h('ol', { class: 'credits__list' }, works.map(entry)),
  );
}
