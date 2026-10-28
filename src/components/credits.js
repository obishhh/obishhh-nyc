import { h } from '../lib/dom.js';

const LICENSES = {
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'Public domain': 'https://creativecommons.org/publicdomain/mark/1.0/',
};

function entry({ label, src, title, author, license, source, changes = 'cropped' }) {
  return h('li', { class: 'credits__entry' },
    h('img', { class: 'credits__thumb', src, alt: '', width: 202, height: 128, loading: 'lazy', decoding: 'async' }),
    h('div', { class: 'credits__text' },
      h('p', { class: 'credits__card' }, label),
      h('p', { class: 'credits__work' }, h('a', { href: source }, title), ` by ${author}`),
      h('p', { class: 'credits__license' }, h('a', { href: LICENSES[license] }, license), ` · ${changes}`),
    ),
  );
}

export function credits({ cards, back }) {
  const works = [
    ...cards.map(({ title, art }) => ({ label: title, ...art })),
    ...back.map((work) => ({ label: 'Card back', ...work })),
  ];
  return h('section', { class: 'credits' },
    h('h1', { class: 'credits__title' }, 'Credits'),
    h('p', { class: 'credits__intro' }, 'The card art is cropped from Creative Commons and public-domain works. Thank you to the artists.'),
    h('ol', { class: 'credits__list' }, works.map(entry)),
  );
}
