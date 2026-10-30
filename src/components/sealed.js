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

export function sealed(data, { label = 'Not printed yet' } = {}) {
  const wrapper = h('div', { class: 'sealed__face', inert: true }, face(data));
  // Fade in once the art is decoded, or after a beat on a slow connection; late art lands in place.
  const art = wrapper.querySelector('img')?.decode().catch(() => {});
  Promise.race([art, new Promise((resolve) => setTimeout(resolve, ART_WAIT))]).then(() => wrapper.classList.add('is-ready'));
  return h('div', { class: 'sealed', role: 'img', 'aria-label': `Sealed card. ${label}.` },
    wrapper,
    h('span', { class: 'sealed__label', 'aria-hidden': 'true' }, label),
  );
}
