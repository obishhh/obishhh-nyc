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
import { handwriting } from '../lib/scrawl.js';
import { sections } from '../lib/sections.js';

const POCKETS = 9;
// On a computer the window shows two rows and a peek of the third, so the cards stay a good size.
const ROWS_SHOWN = 2.25;
// The smallest the cards get to fit a short window.
const SMALLEST = 0.5;
// The All tab's value: blank, which no section can be, so a section called "all" can't clash with it.
const ALL = '';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const sleeve = () =>
  h('li', { class: 'binder__pocket', 'aria-hidden': 'true', style: { '--tilt': '0deg' } }, h('span', { class: 'binder__sleeve' }));

// Hangs the tabs off the binder: All, then one per section. Picking one hides every other card, sealed ones included,
// and empty sleeves fill out the page so it's as tall as the tabs.
function tabbed(page, cards) {
  const tabs = [{ value: ALL, label: 'All', count: cards.length }, ...sections(cards)];
  const asked = new URLSearchParams(location.search).get('filed');
  const pockets = [...page.children];
  const sleeves = Array.from({ length: POCKETS - 1 }, sleeve);
  page.append(...sleeves);

  function show(value) {
    pockets.forEach((pocket, at) => (pocket.hidden = value !== ALL && (cards[at].sealed || String(cards[at].stats?.filed ?? '') !== value)));
    const empty = (POCKETS - (pockets.filter((pocket) => !pocket.hidden).length % POCKETS)) % POCKETS;
    sleeves.forEach((each, at) => (each.hidden = at >= empty));
  }

  const start = tabs.some((tab) => tab.value === asked) ? asked : ALL;
  const strip = dividers(tabs, {
    active: start,
    onSelect(value) {
      strip.select(value);
      show(value);
      if (!reducedMotion.matches) page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      const query = new URLSearchParams(location.search);
      if (value === ALL) query.delete('filed');
      else query.set('filed', value);
      const search = query.toString();
      history.replaceState(history.state, '', search ? `?${search}` : location.pathname);
    },
  });
  show(start);
  return { root: h('div', { class: 'tabbed' }, strip.root, page), ready: strip.ready };
}

// On a computer, size the cards so two rows and a bit of the third fill the window. Narrower screens just scroll.
// Sized to the window's own height, so a toolbar sliding in and out doesn't rescale the binder mid-scroll.
function fitToWindow(page) {
  const root = document.documentElement;
  const wide = matchMedia(WIDE);
  const full = Math.floor(ROWS_SHOWN);
  const fit = () => {
    if (!wide.matches) return root.style.removeProperty('--fit');
    // The cards' top doesn't move with their size, so it's safe to read with --fit already set.
    const top = page.getBoundingClientRect().top + scrollY;
    const scale = (root.clientHeight - top) / (full * (352 + 28) + (ROWS_SHOWN - full) * 352);
    const value = Math.max(SMALLEST, scale).toFixed(3);
    if (root.style.getPropertyValue('--fit') !== value) root.style.setProperty('--fit', value);
  };
  let frame;
  addEventListener('resize', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  });
  fit();
}

// The deck box only turns up once something's in it. A deck that won't load, or won't draw, just stays away.
async function deck() {
  try {
    const entries = await loadDeck();
    if (!entries.length) return null;
    await handwriting();
    return deckBox(entries, { make: deckCard });
  } catch {
    return null;
  }
}

async function binderPage() {
  let cards;
  try {
    cards = await loadBinder();
  } catch {
    return { root: notice('The binder is stuck shut. Refresh to try again.') };
  }
  if (!cards.length) return { root: notice('The binder is empty. Fresh cards soon.') };

  const page = binder(cards, { label: 'Binder page 1' });
  trackPointer(page, '.card');
  enableFlip(page, '.binder__flip');
  return { ...tabbed(page, cards), page, cards };
}

const main = h('main', { class: 'page' });

document.body.append(
  masthead({ heading: true }),
  main,
  colophon(),
);

const decking = deck();
const shelf = await binderPage();
main.append(shelf.root);
if (shelf.page) {
  fitToWindow(shelf.page);
  decking.then((box) => box && shelf.root.append(box));
}
await revealWhenReady(document.body, [shelf.ready]);
// Once it's all on screen and sized, so a ?card= link flies its card from the right spot.
if (shelf.page) enableReading(shelf.page, shelf.cards);
