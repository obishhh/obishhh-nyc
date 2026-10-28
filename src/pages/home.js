import { binder } from '../components/binder.js';
import { colophon } from '../components/colophon.js';
import { masthead } from '../components/masthead.js';
import { cards } from '../data/cards.js';
import { h } from '../lib/dom.js';
import { enableFlip } from '../lib/flip.js';
import { enableReading } from '../lib/reading.js';
import { trackPointer } from '../lib/pointer.js';
import { revealWhenReady } from '../lib/reveal.js';

const page = binder(cards, { label: 'Binder page 1' });

trackPointer(page, '.card');
enableReading(page, cards);
enableFlip(page, '.binder__flip');

document.body.append(
  masthead({ heading: true, door: true }),
  h('main', { class: 'page' }, page),
  colophon(),
);

revealWhenReady(document.body);
