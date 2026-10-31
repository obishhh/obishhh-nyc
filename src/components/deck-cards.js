import { knownType, typeName } from '../data/types.js';
import { h, svg } from '../lib/dom.js';
import { energyGlyphs } from '../lib/glyphs.js';
import { photo } from '../lib/looks.js';
import { safeImage } from '../lib/markdown.js';
import { HAND, scribble } from '../lib/scrawl.js';
import { seeded } from '../lib/seeded.js';
import { energy } from './energy.js';
import { smallPrint } from './small-print.js';
import { wear } from './wear.js';

// Notes come in three printings, like energy cards across the years: a flame-like wisp off the
// orb, a beam fanning down from it, or rays all round. Each card keeps the one its number picks.
const LOOKS = ['wisp', 'beam', 'rays'];

// Each one gets its own gradient ids: a page shows many notes, and a repeated id points every copy at the first.
let wisps = 0;
function wisp() {
  const id = `note-card-wisp-${(wisps += 1)}`;
  return `<svg class="note-card__wisp" viewBox="0 0 60 90" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset="0.65" stop-color="#fff" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${id}-shimmer" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#ffd1f0"/>
      <stop offset="0.35" stop-color="#c7f3ff"/>
      <stop offset="0.7" stop-color="#fff6b0"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke-linecap="round">
    <path d="M20 88C12 70 28 58 25 40C22 27 30 15 38 4" stroke="url(#${id})" stroke-width="7"/>
    <path d="M29 88C25 72 39 62 35 46C33 34 41 23 48 11" stroke="url(#${id})" stroke-width="4.5"/>
    <path d="M14 86C8 74 16 63 14 50C13 43 17 37 20 33" stroke="url(#${id})" stroke-width="3.2"/>
    <path d="M37 86C37 76 46 69 44 57C43 50 47 45 51 40" stroke="url(#${id})" stroke-width="2.6"/>
    <path d="M24 70C20 58 31 50 29 38C27 29 33 20 40 13" stroke="url(#${id}-shimmer)" stroke-width="1.6" opacity="0.9"/>
  </g>
  <g fill="#fff">
    <circle cx="41" cy="19" r="1.5"/><circle cx="47" cy="29" r="1.1"/><circle cx="33" cy="12" r="1"/>
    <circle cx="51" cy="20" r="0.9"/><circle cx="44" cy="40" r="1.2"/><circle cx="29" cy="25" r="0.8"/>
    <circle cx="54" cy="33" r="0.7"/><circle cx="37" cy="5" r="0.7"/><circle cx="23" cy="18" r="0.6"/>
    <circle cx="49" cy="8" r="0.8"/><circle cx="40" cy="31" r="0.6"/>
  </g>
</svg>`;
}

// Notes are written as big as they'll fit on the card, the way you would: shorter ones bigger. A little room is left
// around the edges.
const MARKER = { size: 46, width: 200, height: 236 };
// Dates come as 'YYYY-MM-DD'. Midday, so no timezone tips them into the day before.
const day = (date, options) => (date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', options) : '');

// A note: a blank energy card somebody wrote on in marker. Silver bars top and bottom, the type's
// symbol glowing in the middle. The writing is a picture, so it carries the words for screen readers.
export function noteCard({ type: given, text, date, number }) {
  const type = knownType(given);
  const ink = text ? scribble(text, { hand: HAND, ...MARKER }) : null;
  ink?.classList.add('note-card__ink');
  ink?.setAttribute('role', 'img');
  ink?.setAttribute('aria-label', text);
  const posted = day(date, { month: 'short', day: 'numeric', year: 'numeric' });
  const look = LOOKS[Math.floor(seeded(number || text || type) * LOOKS.length)];
  return h('article', { class: 'card note-card', dataset: { type, finish: 'standard', look }, 'aria-label': `${typeName(type)} Type note` },
    h('div', { class: 'card__panel' },
      h('header', { class: 'note-card__bar' }, h('span', { class: 'note-card__label' }, 'Basic Note'), energy(type)),
      h('div', { class: 'note-card__energy', 'aria-hidden': 'true' },
        h('span', { class: 'note-card__trace' }, look === 'wisp' && svg(wisp())),
        h('span', { class: 'note-card__orb' }, svg(energyGlyphs[type])),
      ),
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
