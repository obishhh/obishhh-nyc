import { credits } from '../components/credits.js';
import { masthead } from '../components/masthead.js';
import { cardBackArt } from '../data/card-back.js';
import { cards } from '../data/cards.js';
import { h } from '../lib/dom.js';

document.body.append(
  masthead(),
  h('main', { class: 'page' }, credits({ cards, back: cardBackArt })),
);
