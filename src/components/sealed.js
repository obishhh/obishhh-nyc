import { h } from '../lib/dom.js';
import { card } from './card.js';

const ART_WAIT = 1200;

export function sealed(data, { label = 'Not printed yet' } = {}) {
  const face = h('div', { class: 'sealed__face', inert: true }, h('div', { class: 'sealed__blur' }, card(data)));
  // Fade in once the art is decoded, or after a beat on a slow connection; late art lands under the blur.
  const art = face.querySelector('img')?.decode().catch(() => {});
  Promise.race([art, new Promise((resolve) => setTimeout(resolve, ART_WAIT))]).then(() => face.classList.add('is-ready'));
  return h('div', { class: 'sealed', role: 'img', 'aria-label': `Sealed card. ${label}.` },
    face,
    h('span', { class: 'sealed__label', 'aria-hidden': 'true' }, label),
  );
}
