import { h } from '../lib/dom.js';
import { safeImage } from '../lib/markdown.js';
import { card } from './card.js';

const ART_WAIT = 1200;

// Painted in the editor when the card is saved. Older cards fall back to blurring the live card.
function face(data) {
  const painted = safeImage(data.art.sealed ?? '');
  if (painted) return h('img', { class: 'sealed__image', src: painted, alt: '', width: 300, height: 400, decoding: 'async' });
  return h('div', { class: 'sealed__blur' }, card(data));
}

// A little "not yet" wobble. On top of the card's own tilt, so it shakes from wherever it sits.
const NOT_YET = [
  { translate: '0', rotate: '0deg' },
  { translate: '-5px', rotate: '-1.2deg' },
  { translate: '4px', rotate: '1deg' },
  { translate: '-3px', rotate: '-0.6deg' },
  { translate: '2px', rotate: '0.3deg' },
  { translate: '0', rotate: '0deg' },
];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// The blur says it's not out yet; screen readers get it said out loud. Tap it and it shakes its head.
export function sealed(data) {
  const wrapper = h('div', { class: 'sealed__face', inert: true }, face(data));
  // Fade in once the art is decoded, or after a beat on a slow connection; late art lands in place.
  const art = wrapper.querySelector('img')?.decode().catch(() => {});
  Promise.race([art, new Promise((resolve) => setTimeout(resolve, ART_WAIT))]).then(() => wrapper.classList.add('is-ready'));
  const root = h('div', { class: 'sealed', role: 'img', 'aria-label': 'Sealed card. Not printed yet.' }, wrapper);
  root.addEventListener('click', () => {
    if (!reducedMotion.matches) root.animate(NOT_YET, { duration: 420, easing: 'ease-out' });
  });
  return root;
}
