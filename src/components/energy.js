import { h, svg } from '../lib/dom.js';
import { energyGlyphs } from '../lib/glyphs.js';

export function energy(type, size = 'regular') {
  return h('span', { class: 'energy', dataset: { type, size }, title: type }, svg(energyGlyphs[type]));
}
