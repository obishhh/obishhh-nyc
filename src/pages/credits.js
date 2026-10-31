import { credits } from '../components/credits.js';
import { masthead } from '../components/masthead.js';
import { notice } from '../components/notice.js';
import { cardBackArt } from '../data/card-back.js';
import { tabsArt } from '../data/tabs-art.js';
import { loadBinder } from '../lib/cards.js';
import { h } from '../lib/dom.js';
import { revealWhenReady } from '../lib/reveal.js';

const main = h('main', { class: 'page' });
const top = masthead();

document.body.append(top, main);

try {
  main.append(credits({ cards: await loadBinder(), back: cardBackArt, tabs: tabsArt }));
} catch {
  main.append(notice('The credits are stuck in the binder. Refresh to try again.'));
}
// Shown in one go once it's all there; the thumbnails load into their boxes after.
revealWhenReady(top);
