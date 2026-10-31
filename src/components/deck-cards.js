import { knownType, typeName } from '../data/types.js';
import { h, svg } from '../lib/dom.js';
import { energyGlyphs } from '../lib/glyphs.js';
import { photo } from '../lib/looks.js';
import { safeImage } from '../lib/markdown.js';
import { HAND, scribble } from '../lib/scrawl.js';
import { energy } from './energy.js';
import { smallPrint } from './small-print.js';
import { wear } from './wear.js';

// Each type's energy, painted (scripts/energy-art.mjs): water's ripples, fire's flames, and so on.
const energyArt = (type) => `url('/assets/energy/${type}.webp')`;

// Notes are written as big as they'll fit on the card, the way you would: shorter ones bigger. A little room is left
// around the edges.
const MARKER = { size: 46, width: 200, height: 236 };
// Where a note links to, if it's a web address: the address, and the site's name without its www.
export function linkTo(url) {
  if (!/^https?:\/\//i.test(url ?? '')) return null;
  try {
    const { hostname } = new URL(url);
    return hostname ? { href: url, site: hostname.replace(/^www\./, '') } : null;
  } catch {
    return null;
  }
}
// Dates come as 'YYYY-MM-DD'. Midday, so no timezone tips them into the day before.
const day = (date, options) => (date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', options) : '');

// A note: a blank energy card somebody wrote on in marker. Silver bars top and bottom, the type's
// symbol glowing in the middle. The writing is a picture, so it carries the words for screen readers.
// One with a link is a Special Note, the way an energy that does more than the basics is a Special Energy; the link
// itself comes up under it when it's raised (see deck-box.js).
export function noteCard({ type: given, text, date, number, link }) {
  const type = knownType(given);
  const ink = text ? scribble(text, { hand: HAND, ...MARKER }) : null;
  ink?.classList.add('note-card__ink');
  ink?.setAttribute('role', 'img');
  ink?.setAttribute('aria-label', text);
  const posted = day(date, { month: 'short', day: 'numeric', year: 'numeric' });
  return h('article', { class: 'card note-card', dataset: { type, finish: 'standard' }, 'aria-label': `${typeName(type)} Type note` },
    h('div', { class: 'card__panel', style: { '--energy-art': energyArt(type) } },
      h('header', { class: 'note-card__bar' }, h('span', { class: 'note-card__label' }, linkTo(link) ? 'Special Note' : 'Basic Note'), energy(type)),
      h('div', { class: 'note-card__energy', 'aria-hidden': 'true' }, h('span', { class: 'note-card__orb' }, svg(energyGlyphs[type]))),
      h('span', { class: 'note-card__wear', 'aria-hidden': 'true' }),
      // The card's handling goes under the writing: the marker went on after, over the top of it.
      wear(number || text),
      h('div', { class: 'note-card__writing' }, ink),
      h('p', { class: 'note-card__base' }, posted && `Posted ${posted}`),
      smallPrint('', number),
    ),
  );
}

// What a Snapshot says under its caption when it hasn't been given a line of its own.
export const SNAPSHOT_RULE = 'Play as many Snapshots as you like. Nobody’s counting.';

// A Snapshot's picture: one photo, or two side by side, each half cropped to its own position. The halves are
// numbered, so the editor can tell which one is being dragged.
function snapshotPicture({ src, alt, position, zoom, look, baked, second }) {
  const first = safeImage(src ?? '');
  const other = safeImage(second?.src ?? '');
  const firstBaked = safeImage(baked ?? '');
  if (!first) return null;
  if (!other) return photo(first, { alt, position, zoom, look, baked: firstBaked });
  return h('div', { class: 'snapshot__halves', role: 'img', 'aria-label': alt },
    h('div', { class: 'snapshot__half', dataset: { half: '0' } }, photo(first, { alt: '', position, zoom, look, baked: firstBaked })),
    h('div', { class: 'snapshot__half', dataset: { half: '1' } },
      photo(other, { alt: '', position: second.position, zoom: second.zoom, look, baked: safeImage(second.baked ?? '') })),
  );
}

// A Snapshot: a photo as a trainer card. Silver frame, a banner across the top, the caption as its rule.
export function snapshotCard({ title, photo: picked, text, rule, place, date, number }) {
  const when = day(date, { month: 'short', day: 'numeric' });
  const shot = picked && typeof picked === 'object' ? picked : {};
  return h('article', { class: 'card snapshot', dataset: { finish: 'standard' }, 'aria-label': title },
    h('div', { class: 'card__panel' },
      h('p', { class: 'snapshot__banner' }, 'Snapshot'),
      h('h2', { class: 'card__title' }, title),
      h('figure', { class: 'card__art snapshot__art' }, snapshotPicture({ ...shot, alt: shot.alt || title || '' })),
      h('p', { class: 'snapshot__text' }, text),
      h('p', { class: 'snapshot__rule' }, rule || SNAPSHOT_RULE),
      smallPrint([place, when].filter(Boolean).join(', '), number),
    ),
    wear(number || title),
  );
}

export const deckCard = (entry) => (entry.kind === 'snapshot' ? snapshotCard(entry) : noteCard(entry));
