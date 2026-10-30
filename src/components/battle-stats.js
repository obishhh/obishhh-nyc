import { knownType, retreatOf, typeName, weaknessOf } from '../data/types.js';
import { h } from '../lib/dom.js';
import { energy } from './energy.js';

function stat(label, ...value) {
  return h('div', { class: 'stat' }, h('dt', { class: 'stat__label' }, label), h('dd', { class: 'stat__value' }, ...value));
}

// Weakness, resistance and retreat, in icons like the real ones: on the card, and under the article.
// As on the real cards, what it does goes up with the label, and the icons sit on their own below.
export function battleStats(data, { size = 'small', className = 'card__stats' } = {}) {
  const weak = weaknessOf(data);
  const resist = data.stats.resistance && knownType(data.stats.resistance);
  const retreat = retreatOf(data.minutes);
  const icon = (kind, title) => energy(kind, size, { title });
  return h('dl', { class: className },
    stat('weakness ×2', icon(weak, `Weak to ${typeName(weak)}`)),
    stat(resist ? 'resistance −30' : 'resistance', resist && icon(resist, `Resists ${typeName(resist)}`)),
    stat('retreat', ...Array.from({ length: retreat }, () => icon('plain', `${retreat} to retreat`))),
  );
}
