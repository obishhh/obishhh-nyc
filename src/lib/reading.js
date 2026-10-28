import { reader } from '../components/reader.js';

const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Open published cards as articles over the binder, at their own address (?card=slug).
export function enableReading(binder, cards) {
  let open = null;

  const pocketOf = (data) => binder.querySelector(`[data-slug="${data.slug}"]`);

  // Fly the reader's card from where it sits in the binder to where it sits in the article.
  function fly(view, from, reverse = false) {
    if (reducedMotion.matches || !from) return Promise.resolve();
    const start = from.getBoundingClientRect();
    const end = view.pocket.getBoundingClientRect();
    const lifted = `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width})`;
    const frames = [{ transform: lifted }, { transform: 'none' }];
    const sheet = [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }];
    const fade = [{ opacity: 0 }, { opacity: 1 }];
    const options = { duration: reverse ? 320 : 520, easing: EASE, fill: 'both', direction: reverse ? 'reverse' : 'normal' };
    const animations = [
      view.pocket.animate(frames, options),
      view.sheet.animate(sheet, { ...options, duration: reverse ? 240 : 380 }),
      view.backdrop.animate(fade, { ...options, duration: reverse ? 240 : 380 }),
    ];
    view.pocket.style.zIndex = '2';
    return Promise.all(animations.map((animation) => animation.finished));
  }

  function show(data, { push = true } = {}) {
    if (open || !data?.body) return;
    const view = reader(data);
    const from = pocketOf(data);
    const returnFocus = document.activeElement;
    document.body.append(view.root);
    document.documentElement.classList.add('is-reading');
    if (from) from.style.visibility = 'hidden';
    if (push) history.pushState({ card: data.slug }, '', `?card=${data.slug}`);
    fly(view, from).then(() => view.close.focus());

    const close = async ({ pop = false } = {}) => {
      if (open !== view) return;
      open = null;
      removeEventListener('keydown', onKey);
      if (!pop) history.back();
      view.sheet.scrollTo({ top: 0 });
      await fly(view, from, true);
      view.root.remove();
      if (from) from.style.visibility = '';
      document.documentElement.classList.remove('is-reading');
      returnFocus?.focus?.();
    };
    const onKey = (event) => event.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    view.close.addEventListener('click', () => close());
    view.backdrop.addEventListener('click', () => close());
    view.closeFromHistory = () => close({ pop: true });
    open = view;
  }

  binder.addEventListener('click', (event) => {
    const target = event.target.closest('[data-slug]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    show(cards.find((data) => data.slug === target.dataset.slug));
  });

  binder.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest('[data-slug]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    target.click();
  });

  addEventListener('popstate', () => {
    const slug = new URLSearchParams(location.search).get('card');
    if (open && !slug) open.closeFromHistory();
    else if (!open && slug) show(cards.find((data) => data.slug === slug), { push: false });
  });

  const slug = new URLSearchParams(location.search).get('card');
  if (slug) show(cards.find((data) => data.slug === slug), { push: false });
}
