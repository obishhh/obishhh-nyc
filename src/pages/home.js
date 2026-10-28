import { binder } from '../components/binder.js';
import { colophon } from '../components/colophon.js';
import { masthead } from '../components/masthead.js';
import { cards } from '../data/cards.js';
import { h } from '../lib/dom.js';
import { enableFlip } from '../lib/flip.js';
import { trackPointer } from '../lib/pointer.js';

const page = binder(cards, { label: 'Binder page 1' });

trackPointer(page, '.card');
enableFlip(page, '.binder__flip');

document.body.append(
  masthead({ heading: true }),
  h('main', { class: 'page' }, page),
  colophon(),
);
