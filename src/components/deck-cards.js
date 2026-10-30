import { typeName } from '../data/types.js';
import { h, svg } from '../lib/dom.js';
import { energyGlyphs } from '../lib/glyphs.js';
import { safeImage } from '../lib/markdown.js';
import { HAND, scribble } from '../lib/scrawl.js';
import { energy } from './energy.js';

const COPYRIGHT = '©2026 obishhh.nyc';
// Shorter notes get written bigger, the way you would on a card.
const markerSize = (text) => (text.length <= 32 ? 40 : text.length <= 72 ? 31 : text.length <= 110 ? 26 : 22);
// Dates come as 'YYYY-MM-DD'. Midday, so no timezone tips them into the day before.
const day = (date, options) => (date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', options) : '');

function footer(left, number) {
  return h('footer', { class: 'card__footer' },
    h('span', {}, left),
    h('span', {}, COPYRIGHT),
    h('span', { class: 'card__number' }, number),
  );
}

// A note: a blank energy card somebody wrote on in marker. Silver bars top and bottom, the type's
// symbol glowing in the middle. The writing is a picture, so it carries the words for screen readers.
export function noteCard({ type, text, date, number }) {
  const ink = text ? scribble(text, { hand: HAND, size: markerSize(text), width: 200 }) : null;
  ink?.classList.add('note-card__ink');
  ink?.setAttribute('role', 'img');
  ink?.setAttribute('aria-label', text);
  const posted = day(date, { month: 'short', day: 'numeric', year: 'numeric' });
  return h('article', { class: 'card note-card', dataset: { type, finish: 'standard' }, 'aria-label': `${typeName(type)} Type note` },
    h('div', { class: 'card__panel' },
      h('header', { class: 'note-card__bar' }, h('span', { class: 'note-card__label' }, 'Basic Note'), energy(type)),
      h('div', { class: 'note-card__symbol' }, svg(energyGlyphs[type])),
      h('div', { class: 'note-card__writing' }, ink),
      h('p', { class: 'note-card__base' }, posted && `Posted ${posted}`),
    ),
    footer('', number),
  );
}

// A Snapshot: a photo as a trainer card. Silver frame, a banner across the top, the caption as its rule.
export function snapshotCard({ title, photo, text, place, date, number }) {
  const when = day(date, { month: 'short', day: 'numeric' });
  const { src, alt, position } = photo && typeof photo === 'object' ? photo : {};
  const picture = safeImage(src ?? '');
  return h('article', { class: 'card snapshot', dataset: { finish: 'standard' }, 'aria-label': title },
    h('div', { class: 'card__panel' },
      h('p', { class: 'snapshot__banner' }, 'Snapshot'),
      h('h2', { class: 'card__title' }, title),
      h('figure', { class: 'card__art snapshot__art' },
        picture && h('img', { src: picture, alt: alt || title || '', decoding: 'async', style: position && { 'object-position': position } })),
      h('p', { class: 'snapshot__text' }, text),
      h('p', { class: 'snapshot__rule' }, 'Play as many Snapshots as you like. Nobody’s counting.'),
    ),
    footer(['Photo.', place && ` ${place},`, when && ` ${when}.`].filter(Boolean).join(''), number),
  );
}

export const deckCard = (entry) => (entry.kind === 'snapshot' ? snapshotCard(entry) : noteCard(entry));
