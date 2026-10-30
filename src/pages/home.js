import { binder } from '../components/binder.js';
import { colophon } from '../components/colophon.js';
import { deckBox } from '../components/deck-box.js';
import { deckCard } from '../components/deck-cards.js';
import { dividers, WIDE } from '../components/dividers.js';
import { masthead } from '../components/masthead.js';
import { notice } from '../components/notice.js';
import { loadBinder, loadDeck } from '../lib/cards.js';
import { h } from '../lib/dom.js';
import { enableFlip } from '../lib/flip.js';
import { enableReading } from '../lib/reading.js';
import { trackPointer } from '../lib/pointer.js';
import { revealWhenReady } from '../lib/reveal.js';
import { sections } from '../lib/sections.js';

const POCKETS = 9;
const ROWS = 3;
// The smallest the cards get to fit a short window, and the space left under them.
const SMALLEST = 0.5;
const ROOM = 32;
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

// On a computer, shrink the cards until a whole page of them fits the window. Narrower screens just scroll.
function fitToWindow(page) {
  const root = document.documentElement;
  const wide = matchMedia(WIDE);
  const fit = () => {
    root.style.removeProperty('--fit');
    if (!wide.matches) return;
    const top = page.getBoundingClientRect().top + scrollY;
    const scale = (innerHeight - top - ROOM) / (ROWS * 352 + (ROWS - 1) * 28);
    root.style.setProperty('--fit', Math.max(SMALLEST, scale).toFixed(3));
  };
  let frame;
  addEventListener('resize', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  });
  fit();
}

// The deck box only turns up once something's in it. A deck that won't load just stays away.
async function deck() {
  const entries = await loadDeck().catch(() => []);
  if (!entries.length) return null;
  // Notes are written in marker, so wait for its font (but not forever).
  await Promise.race([document.fonts.load('40px "Reenie Beanie"'), new Promise((resolve) => setTimeout(resolve, 3000))]);
  return deckBox(entries, { make: deckCard });
}

async function binderPage() {
  const decking = deck();
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
  const holder = tabbed(page, cards);
  const box = await decking;
  if (box) holder.append(box);
  return holder;
}

const main = h('main', { class: 'page' });

document.body.append(
  masthead({ heading: true }),
  main,
  colophon(),
);

main.append(await binderPage());
const page = main.querySelector('.binder');
if (page) fitToWindow(page);
revealWhenReady(document.body);
