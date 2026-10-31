import { h } from '../lib/dom.js';
import { safeImage } from '../lib/urls.js';
import { card } from './card.js';

const ART_WAIT = 1200;

// Painted in the editor when the card is saved. Older cards fall back to blurring the live card.
function face(data) {
  const painted = safeImage(data.art.sealed);
  if (painted) return h('img', { class: 'sealed__image', src: painted, alt: '', width: 300, height: 400, decoding: 'async' });
  return h('div', { class: 'sealed__blur' }, card(data));
}

// A little "not yet" head-shake, never quite the same twice: which way it starts, how far, how much it
// twists and how many times it goes back and forth all change. Added on top of the card's own tilt and
// size, so it shakes about its middle rather than swinging from where the box sits.
function notYet() {
  const way = Math.random() < 0.5 ? 1 : -1;
  const reach = 3.5 + Math.random() * 3;
  const twist = 0.6 + Math.random() * 1.2;
  const swings = 3 + Math.floor(Math.random() * 3);
  const frames = [{ transform: 'translateX(0px) rotate(0deg)' }];
  for (let swing = 0; swing < swings; swing += 1) {
    const fade = 1 - swing / swings;
    const side = (swing % 2 ? -1 : 1) * way;
    frames.push({ transform: `translateX(${(side * reach * fade).toFixed(2)}px) rotate(${(side * twist * fade).toFixed(2)}deg)` });
  }
  frames.push({ transform: 'translateX(0px) rotate(0deg)' });
  return { frames, duration: 340 + swings * 30 + Math.random() * 60 };
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// The blur says it's not out yet; screen readers get it said out loud. Tap it and it shakes its head.
export function sealed(data) {
  const wrapper = h('div', { class: 'sealed__face', inert: true }, face(data));
  // Fade in once the art is decoded, or after a beat on a slow connection; late art lands in place.
  const art = wrapper.querySelector('img')?.decode().catch(() => {});
  Promise.race([art, new Promise((resolve) => setTimeout(resolve, ART_WAIT))]).then(() => wrapper.classList.add('is-ready'));
  const root = h('div', { class: 'sealed', role: 'img', 'aria-label': 'Sealed card. Not printed yet.' }, wrapper);
  root.addEventListener('click', () => {
    if (reducedMotion.matches || root.getAnimations().length) return;
    const { frames, duration } = notYet();
    // On top of its own tilt and size, written into every frame: a shake that adds to them can't run off the page.
    const own = getComputedStyle(root).transform;
    const on = own === 'none' ? '' : `${own} `;
    root.animate(frames.map(({ transform }) => ({ transform: `${on}${transform}` })), { duration, easing: 'ease-out' });
  });
  return root;
}
