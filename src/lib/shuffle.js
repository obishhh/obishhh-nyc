// Re-sorting the binder for another tab: cards that go fade and sink out of their pockets, cards that stay slide
// across to their new ones, and cards that come in are dealt into place one after another. Where the browser can't
// animate between two layouts, the page fades out and back in instead; asked for less motion, it just changes.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const LEAVE = 170;
const DEAL = 300;
const STAGGER = 40;
// Past this many, the rest are dealt together, so a big tab doesn't keep you waiting.
const MOST_STAGGERED = 8;
// How far past the window's edges a pocket still counts as on screen.
const MARGIN = 200;

let running = null;

// `cards` are the pockets that come and go with the tab; `fill` the empty sleeves that pad the page out. `change`
// hides and shows them.
export function shuffle({ cards, fill = [] }, change) {
  if (reducedMotion.matches) return change();
  if (!document.startViewTransition) return fade(cards[0]?.parentElement, change);

  // A tab picked mid-shuffle cuts straight to the next one.
  running?.skipTransition();
  const root = document.documentElement;
  const pockets = [...cards, ...fill];
  const showing = () => new Set(cards.filter((card) => !card.hidden));
  // Only pockets on screen, before or after, take part: one far off either way has nothing to show, and every one
  // that takes part is captured as a picture, which adds up in a big binder.
  const named = new Set();
  const nameOnScreen = () => pockets.forEach((pocket, at) => {
    if (pocket.hidden || named.has(pocket)) return;
    const { top, bottom } = pocket.getBoundingClientRect();
    if (bottom < -MARGIN || top > innerHeight + MARGIN) return;
    pocket.style.setProperty('view-transition-name', `shuffle-${at}`);
    named.add(pocket);
  });
  // Names left by a shuffle that was cut short go first, so only this one's pockets take part.
  pockets.forEach((pocket) => pocket.style.removeProperty('view-transition-name'));
  const before = showing();
  nameOnScreen();
  root.classList.add('is-shuffling');

  const transition = document.startViewTransition(() => {
    change();
    nameOnScreen();
  });
  running = transition;
  transition.ready
    .then(() => {
      const after = showing();
      let dealt = 0;
      cards.forEach((card, at) => {
        if (!named.has(card)) return;
        const name = `shuffle-${at}`;
        if (before.has(card) && !after.has(card)) {
          root.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(0.96)' }], {
            pseudoElement: `::view-transition-old(${name})`, duration: LEAVE, easing: 'ease-in', fill: 'forwards',
          });
        } else if (after.has(card) && !before.has(card)) {
          root.animate([{ opacity: 0, transform: 'translateY(-16px) scale(1.03)' }, { opacity: 1, transform: 'none' }], {
            pseudoElement: `::view-transition-new(${name})`, duration: DEAL, easing: EASE, fill: 'backwards',
            delay: LEAVE * 0.6 + Math.min(dealt, MOST_STAGGERED) * STAGGER,
          });
          dealt += 1;
        }
      });
    })
    .catch(() => {});
  transition.finished.finally(() => {
    if (running !== transition) return;
    running = null;
    root.classList.remove('is-shuffling');
    named.forEach((each) => each.style.removeProperty('view-transition-name'));
  });
}

async function fade(page, change) {
  if (!page) return change();
  await page.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in' }).finished.catch(() => {});
  change();
  page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: EASE });
}
