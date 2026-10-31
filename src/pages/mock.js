import { binder } from '../components/binder.js';
import { colophon } from '../components/colophon.js';
import { deckBox } from '../components/deck-box.js';
import { deckCard } from '../components/deck-cards.js';
import { dividers } from '../components/dividers.js';
import { masthead } from '../components/masthead.js';
import { mockCards, mockNotes, mockSnaps } from '../data/mock.js';
import { h } from '../lib/dom.js';
import { enableFlip } from '../lib/flip.js';
import { trackPointer } from '../lib/pointer.js';
import { revealWhenReady } from '../lib/reveal.js';
import { sections } from '../lib/sections.js';

const POCKETS = 9;

const tabsFor = (cards) => [{ value: 'all', label: 'All', count: cards.length }, ...sections(cards)];

const inSection = (value) => (value === 'all' ? mockCards : mockCards.filter((card) => !card.sealed && card.stats.filed === value));

// A page of the binder: the section's cards, then empty sleeves to the end of the page.
function page(cards) {
  const grid = binder(cards, { label: 'Binder page' });
  const sleeves = (POCKETS - (cards.length % POCKETS)) % POCKETS;
  for (let index = 0; index < sleeves; index += 1) {
    grid.append(h('li', { class: 'binder__pocket', style: { '--tilt': '0deg' } }, h('span', { class: 'mock__sleeve', 'aria-hidden': 'true' })));
  }
  trackPointer(grid, '.card');
  enableFlip(grid, '.binder__flip');
  return grid;
}

const tabs = tabsFor(mockCards);
const asked = new URLSearchParams(location.search).get('filed');
const start = tabs.some((tab) => tab.value === asked) ? asked : 'all';
// Mock only: ?hand=grace or ?hand=slop to try the other marker hands.
const HANDS = { grace: 'Covered By Your Grace', slop: 'Just Me Again Down Here' };
const hand = HANDS[new URLSearchParams(location.search).get('hand')];

// The deck box's cards: notes and Snapshots together, newest first.
const deck = [...mockNotes, ...mockSnaps].sort((a, b) => b.date.localeCompare(a.date));

// Notes are written in marker, so wait for its font (but not forever).
await Promise.race([document.fonts.load('40px "Reenie Beanie"'), new Promise((resolve) => setTimeout(resolve, 3000))]);

const holder = h('div', { class: 'tabbed' });
let current = page(inSection(start));
const index = dividers(tabs, {
  active: start,
  hand,
  onSelect(value) {
    index.select(value);
    const next = page(inSection(value));
    current.replaceWith(next);
    current = next;
    const query = new URLSearchParams(location.search);
    if (value === 'all') query.delete('filed');
    else query.set('filed', value);
    const search = query.toString();
    history.replaceState(null, '', search ? `?${search}` : location.pathname);
  },
});
holder.append(index.root, current, deckBox(deck, { make: deckCard }));

document.body.append(
  masthead({ heading: true }),
  h('main', { class: 'page' }, holder),
  colophon(),
);

revealWhenReady(document.body);
