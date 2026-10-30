import { typeName } from '../data/types.js';
import { h, svg } from '../lib/dom.js';
import { energyGlyphs } from '../lib/glyphs.js';

export function energy(type, size = 'regular') {
  return h('span', { class: 'energy', dataset: { type, size }, title: `${typeName(type)} Type` }, svg(energyGlyphs[type]));
}
