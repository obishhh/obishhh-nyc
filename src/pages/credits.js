import { credits } from '../components/credits.js';
import { masthead } from '../components/masthead.js';
import { notice } from '../components/notice.js';
import { cardBackArt } from '../data/card-back.js';
import { loadBinder } from '../lib/cards.js';
import { h } from '../lib/dom.js';

const main = h('main', { class: 'page' });

document.body.append(masthead(), main);

try {
  main.append(credits({ cards: await loadBinder(), back: cardBackArt }));
} catch {
  main.append(notice('The credits are stuck in the binder. Refresh to try again.'));
}
