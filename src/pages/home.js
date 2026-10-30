import { binder } from '../components/binder.js';
import { colophon } from '../components/colophon.js';
import { dividers } from '../components/dividers.js';
import { masthead } from '../components/masthead.js';
import { notice } from '../components/notice.js';
import { loadBinder } from '../lib/cards.js';
import { h } from '../lib/dom.js';
import { enableFlip } from '../lib/flip.js';
import { enableReading } from '../lib/reading.js';
import { trackPointer } from '../lib/pointer.js';
import { revealWhenReady } from '../lib/reveal.js';
import { sections } from '../lib/sections.js';

const POCKETS = 9;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const sleeve = () =>
  h('li', { class: 'binder__pocket', 'aria-hidden': 'true', style: { '--tilt': '0deg' } }, h('span', { class: 'binder__sleeve' }));

// Hangs the tabs off the binder: All, then one per section. Picking one hides every other card, sealed ones included,
// and empty sleeves fill out the page so it's as tall as the tabs.
function tabbed(page, cards) {
  const tabs = [{ value: 'all', label: 'All', count: cards.length }, ...sections(cards)];
  const asked = new URLSearchParams(location.search).get('filed');
  const pockets = [...page.children];
  const sleeves = Array.from({ length: POCKETS - 1 }, sleeve);
  page.append(...sleeves);

  function show(value) {
    pockets.forEach((pocket, index) => (pocket.hidden = value !== 'all' && (cards[index].sealed || cards[index].stats.filed !== value)));
    const empty = (POCKETS - (pockets.filter((pocket) => !pocket.hidden).length % POCKETS)) % POCKETS;
    sleeves.forEach((each, index) => (each.hidden = index >= empty));
  }

  const start = tabs.some((tab) => tab.value === asked) ? asked : 'all';
  const index = dividers(tabs, {
    active: start,
    onSelect(value) {
      index.select(value);
      show(value);
      if (!reducedMotion.matches) page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      const query = new URLSearchParams(location.search);
      if (value === 'all') query.delete('filed');
      else query.set('filed', value);
      const search = query.toString();
      history.replaceState(history.state, '', search ? `?${search}` : location.pathname);
    },
  });
  show(start);
  return h('div', { class: 'tabbed' }, index.root, page);
}

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
  enableReading(page, cards);
  enableFlip(page, '.binder__flip');
  return tabbed(page, cards);
}

const main = h('main', { class: 'page' });

document.body.append(
  masthead({ heading: true }),
  main,
  colophon(),
);

main.append(await binderPage());
revealWhenReady(document.body);
