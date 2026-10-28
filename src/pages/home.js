import { binder } from '../components/binder.js';
import { colophon } from '../components/colophon.js';
import { masthead } from '../components/masthead.js';
import { notice } from '../components/notice.js';
import { loadBinder } from '../lib/cards.js';
import { h } from '../lib/dom.js';
import { enableFlip } from '../lib/flip.js';
import { trackPointer } from '../lib/pointer.js';

async function binderPage() {
  let cards;
  try {
    cards = await loadBinder();
  } catch {
    return notice('The binder is stuck shut. Refresh to try again.');
  }
  if (!cards.length) return notice('The binder is empty. Fresh cards soon.');

  const page = binder(cards, { label: 'Binder page 1' });
  trackPointer(page, '.card');
  enableFlip(page, '.binder__flip');
  return page;
}

const main = h('main', { class: 'page' });

document.body.append(
  masthead({ heading: true, door: true }),
  main,
  colophon(),
);

main.append(await binderPage());
