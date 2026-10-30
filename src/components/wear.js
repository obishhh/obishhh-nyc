import { h } from '../lib/dom.js';
import { seeded } from '../lib/seeded.js';

// About half the cards have a crease, and only ever across a corner: a small dog-ear, or a longer bend. The wear's
// flipped at random too, so it can be any corner.
const CREASES = ['none', 'none', 'corner', 'tip'];

// The handling a card's had: grain all over, worn edges and corners, maybe scratches, maybe a crease.
// Picked from the card itself, so each one's a little different but the same every time it's drawn.
export function wear(seed) {
  const roll = (key) => seeded(`${seed}:wear:${key}`);
  const between = (key, low, high) => (low + roll(key) * (high - low)).toFixed(2);
  const flip = (key) => (roll(key) < 0.5 ? '-1' : '1');
  return h('span', {
    class: 'wear',
    'aria-hidden': 'true',
    dataset: {
      crease: CREASES[Math.floor(roll('crease') * CREASES.length)],
      scratched: String(roll('scratched') < 0.5),
    },
    style: {
      '--wear-x': `${Math.round(roll('x') * 180)}px`,
      '--wear-y': `${Math.round(roll('y') * 180)}px`,
      '--wear-flip-x': flip('flip-x'),
      '--wear-flip-y': flip('flip-y'),
      '--wear-edge': between('edge', 0.12, 0.38),
      '--wear-corner': between('corner', 0.25, 0.6),
      '--wear-fade': between('fade', 0, 0.1),
      '--wear-fade-angle': `${Math.round(roll('angle') * 360)}deg`,
    },
  });
}
