import { colophon } from '../components/colophon.js';
import { noteCard, snapshotCard } from '../components/deck-cards.js';
import { masthead } from '../components/masthead.js';
import { mockNotes, mockSnaps } from '../data/mock.js';
import { h } from '../lib/dom.js';
import { trackPointer } from '../lib/pointer.js';
import { revealWhenReady } from '../lib/reveal.js';

// Mock only: the deck box's two kinds of card, tried across every type and from one line to a paragraph.
const NOTES = [
  ...mockNotes,
  { kind: 'note', type: 'stone', text: 'Walked the whole High Line to find the one bench in the shade. Somebody was on it. Walked back. Great day honestly.', date: '2026-10-19', number: '000/040' },
];

const pocket = (card) => h('li', { class: 'binder__pocket', style: { '--tilt': '0deg' } }, card);

const set = (title, about, cards) =>
  h('section', { class: 'deck-mock__set' },
    h('h2', { class: 'deck-mock__title' }, title),
    h('p', { class: 'deck-mock__about' }, about),
    h('ol', { class: 'deck-mock__cards' }, cards.map(pocket)),
  );

// The marker needs its font before it writes, but don't hold the page hostage to a slow one.
await Promise.race([document.fonts.load('40px "Reenie Beanie"'), new Promise((resolve) => setTimeout(resolve, 3000))]);

const main = h('main', { class: 'page deck-mock' },
  set('Notes', 'Blank energy cards, written on in marker. Every type, from four words to a paragraph.', NOTES.map(noteCard)),
  set('Snapshots', 'A photo as a trainer card, in a silver frame. The last one has a long caption.', mockSnaps.map(snapshotCard)),
);
trackPointer(main, '.card');

document.body.append(masthead(), main, colophon());
revealWhenReady(document.body);
