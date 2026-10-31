import { h, svg } from '../lib/dom.js';

const BOUNCE = 'dy="0 -4 7 -6 7 -6 4" rotate="-6 4 -3 5 -4 3 -2"';

const LOGO = `<svg class="card-back__logo" viewBox="0 0 252 110" aria-hidden="true">
  <g transform="rotate(-8 126 56)">
    <text class="card-back__word card-back__word--shadow" x="127" y="64" ${BOUNCE}>obishhh</text>
    <text class="card-back__word card-back__word--edge" x="126" y="61" ${BOUNCE}>obishhh</text>
    <text class="card-back__word" x="126" y="58" ${BOUNCE}>obishhh</text>
    <text class="card-back__tagline" x="126" y="86">SHITTY PERSONAL WEBSITE</text>
  </g>
</svg>`;

export function cardBack() {
  return h('div', { class: 'card-back', 'aria-hidden': 'true' }, svg(LOGO));
}

// A card that turns over to this back: a button for it, face up to start with (see flip.js).
export function flipCard(face, props) {
  return h('div', { role: 'button', tabindex: 0, 'aria-pressed': 'false', ...props }, face, cardBack());
}
