import { licenses } from '../data/licenses.js';
import { h } from '../lib/dom.js';
import { safeImage, safeLink } from '../lib/urls.js';

// The art as the card shows it. A sealed card only shares its blurred picture, which is the whole card: its thumbnail
// is the art's window in it, so it lines up with the rest (or an empty one, before it's been painted).
function thumb({ src: given, sealed }) {
  const src = safeImage(given);
  if (sealed) return h('span', { class: 'credits__thumb credits__thumb--sealed' }, src && h('img', { src, alt: '', loading: 'lazy', decoding: 'async' }));
  return h('img', { class: 'credits__thumb', src, alt: '', width: 202, height: 128, loading: 'lazy', decoding: 'async' });
}

function entry({ label, src, sealed, title, author, license, source, changes = 'cropped' }) {
  return h('li', { class: 'credits__entry' },
    thumb({ src, sealed }),
    h('div', { class: 'credits__text' },
      h('p', { class: 'credits__card' }, label),
      h('p', { class: 'credits__work' }, safeLink(source) ? h('a', { href: source }, title) : title, ` by ${author}`),
      h('p', { class: 'credits__license' }, h('a', { href: licenses[license] }, license), ` · ${changes}`),
    ),
  );
}

// One entry per licensed work, in binder order. Your own photos need no credit.
function cardWorks(cards) {
  const works = new Map();
  for (const { title, number, sealed, art } of cards) {
    const key = art.source || art.src;
    if (key && art.license && !works.has(key)) {
      works.set(key, { label: sealed ? `Sealed card · ${number}` : title, ...art, sealed, src: sealed ? art.sealed : art.src });
    }
  }
  return [...works.values()];
}

export function credits({ cards, back, tabs }) {
  const works = [
    ...cardWorks(cards),
    ...back.map((work) => ({ label: 'Card back', ...work })),
    { label: 'Binder tabs', ...tabs },
  ];
  return h('section', { class: 'credits' },
    h('h1', { class: 'credits__title' }, 'Credits'),
    h('p', { class: 'credits__intro' }, 'The card art and the binder tabs are cropped from Creative Commons and public-domain works. Thank you to the artists.'),
    h('ol', { class: 'credits__list' }, works.map(entry)),
  );
}
