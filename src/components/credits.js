import { licenses } from '../data/licenses.js';
import { h } from '../lib/dom.js';
import { safeLink } from '../lib/markdown.js';

function entry({ label, src, title, author, license, source, changes = 'cropped' }) {
  return h('li', { class: 'credits__entry' },
    h('img', { class: 'credits__thumb', src, alt: '', width: 202, height: 128, loading: 'lazy', decoding: 'async' }),
    h('div', { class: 'credits__text' },
      h('p', { class: 'credits__card' }, label),
      h('p', { class: 'credits__work' }, safeLink(source) ? h('a', { href: source }, title) : title, ` by ${author}`),
      h('p', { class: 'credits__license' }, h('a', { href: licenses[license] }, license), ` · ${changes}`),
    ),
  );
}

// One entry per licensed work, in binder order. Your own photos need no credit.
// Sealed cards only share their blurred picture, so that stands in as the thumbnail.
function cardWorks(cards) {
  const works = new Map();
  for (const { title, sealed, art } of cards) {
    const key = art.source || art.src;
    if (key && art.license && !works.has(key)) {
      works.set(key, { label: sealed ? 'Sealed card' : title, ...art, src: art.src || art.sealed });
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
