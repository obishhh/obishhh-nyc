import { reader } from '../components/reader.js';

const CARD = { width: 252, height: 352 };
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

// Focus only goes back to the card for keyboard users; a mouse or finger doesn't need the ring.
let usingKeyboard = false;
addEventListener('keydown', () => (usingKeyboard = true), true);
addEventListener('pointerdown', () => (usingKeyboard = false), true);

const slugInUrl = () => new URLSearchParams(location.search).get('card');

// Where a card sits on screen: its centre, scale and tilt. The centre holds still
// under a tilt, where the corners don't.
function place(element, scale, turn = 0) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2, scale, turn };
}

const number = (element, property) => parseFloat(getComputedStyle(element).getPropertyValue(property)) || 0;

const transform = ({ x, y, scale, turn }) =>
  `translate(${x - CARD.width / 2}px, ${y - CARD.height / 2}px) scale(${scale}) rotate(${turn}deg)`;

// A copy of the card flies between the binder and the article on its own layer, so
// nothing it passes over can clip or fade it.
function fly(face, from, to, duration) {
  const ghost = document.createElement('div');
  ghost.className = 'reader-ghost';
  ghost.append(face.cloneNode(true));
  document.body.append(ghost);
  const flight = ghost.animate([{ transform: transform(from) }, { transform: transform(to) }], { duration, easing: EASE, fill: 'both' });
  return flight.finished.then(() => ghost.remove());
}

// Open published cards as articles over the binder, each at its own address (?card=slug).
export function enableReading(binder, cards) {
  let current = null;

  const find = (slug) => cards.find((data) => data.slug === slug && data.body);
  const pocketOf = (data) => binder.querySelector(`[data-slug="${data.slug}"]`);
  // In the binder: its pocket's scale and tilt. In the article: its holder's width.
  const inBinder = (pocket) => place(pocket, number(pocket, '--scale') || 1, number(pocket, '--turn'));
  const inArticle = (view) => place(view.pocket, view.pocket.offsetWidth / CARD.width);

  function show(data, { pushed }) {
    if (current || !data) return;
    const view = reader(data);
    const pocket = pocketOf(data);
    const returnFocus = document.activeElement;
    const outside = [...document.body.children];
    const state = { view, pushed, closing: null };
    current = state;

    // Lay the article out and paint it once, unseen, so the first frames of the
    // flight don't have to.
    view.root.style.opacity = '0';
    document.body.append(view.root);
    document.documentElement.classList.add('is-reading');
    outside.forEach((element) => (element.inert = true));
    state.ready = nextFrame().then(() => {
      if (current === state && !state.closing) animateIn(state, view, pocket);
    });
    state.close = () => (state.closing ??= state.ready.then(() => finish(state, pocket, returnFocus, outside)));
    view.close.addEventListener('click', () => leave());
    view.backdrop.addEventListener('click', () => leave());
  }

  function animateIn(state, view, pocket) {
    const still = reducedMotion.matches || !pocket;
    // Measure both ends before anything moves, or the landing spot drifts with the sheet.
    const from = still ? null : inBinder(pocket);
    const to = still ? null : inArticle(view);
    const fadeIn = { duration: still ? 160 : 360, easing: EASE, fill: 'both' };
    view.root.style.opacity = '';
    view.backdrop.animate([{ opacity: 0 }, { opacity: 1 }], fadeIn);
    view.sheet.animate([{ opacity: 0, transform: still ? 'none' : 'translateY(28px)' }, { opacity: 1, transform: 'none' }], fadeIn);
    view.text.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { ...fadeIn, duration: still ? 160 : 420, delay: still ? 0 : 90 });

    if (still) {
      state.opening = Promise.resolve();
    } else {
      // The card leaves its pocket and lands in the article; the real one appears when it lands.
      view.pocket.style.visibility = 'hidden';
      pocket.style.visibility = 'hidden';
      state.opening = fly(pocket.querySelector('.card'), from, to, 540).then(() => (view.pocket.style.visibility = ''));
    }
    state.opening.then(() => current === state && !state.closing && view.close.focus({ preventScroll: true }));
  }

  async function finish(state, pocket, returnFocus, outside) {
    const { view } = state;
    // Closed before it ever appeared: nothing to animate.
    const seen = Boolean(state.opening);
    await state.opening;
    const still = !seen || reducedMotion.matches || !pocket;
    const fadeOut = { duration: still ? 140 : 260, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'both' };
    const fades = [
      view.backdrop.animate([{ opacity: 1 }, { opacity: 0 }], fadeOut),
      view.sheet.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: still ? 'none' : 'translateY(16px) scale(0.99)' }], fadeOut),
    ];
    let flight = Promise.resolve();
    if (!seen) fades.forEach((animation) => animation.finish());
    else if (!still) {
      // Back into the pocket it came from, at its usual tilt.
      const from = inArticle(view);
      const to = inBinder(pocket);
      view.pocket.style.visibility = 'hidden';
      flight = fly(view.pocket.querySelector('.card'), from, to, 460);
    }
    await Promise.all([flight, ...fades.map((animation) => animation.finished)]);
    view.root.remove();
    if (pocket) pocket.style.visibility = '';
    outside.forEach((element) => (element.inert = false));
    document.documentElement.classList.remove('is-reading');
    if (usingKeyboard) (pocket ?? returnFocus)?.focus?.({ preventScroll: true });
    if (current === state) current = null;
    // History moved on while this was closing (Forward pressed mid-animation): follow it.
    if (slugInUrl()) show(find(slugInUrl()), { pushed: false });
  }

  // Closing from the page: step back if we added the history entry, otherwise just
  // drop ?card= so a shared link doesn't send people off the site.
  function leave() {
    if (!current || current.closing) return;
    if (current.pushed) history.back();
    else {
      history.replaceState(null, '', location.pathname);
      current.close();
    }
  }

  binder.addEventListener('click', (event) => {
    const target = event.target.closest('[data-slug]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (current) return;
    const data = find(target.dataset.slug);
    if (!data) return;
    history.pushState({ card: data.slug }, '', `?card=${data.slug}`);
    show(data, { pushed: true });
  });

  binder.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest('[data-slug]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    target.click();
  });

  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current) leave();
  });

  addEventListener('popstate', () => {
    const slug = slugInUrl();
    if (current && !slug) current.close();
    else if (!current && slug) show(find(slug), { pushed: false });
  });

  if (slugInUrl()) show(find(slugInUrl()), { pushed: false });
}
