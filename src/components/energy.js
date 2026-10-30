import { knownType, typeName } from '../data/types.js';
import { h, svg } from '../lib/dom.js';
import { energyGlyphs } from '../lib/glyphs.js';

// A type's symbol on its coloured coin. Its own tooltip names the type, unless the caller has something better to say.
export function energy(type, size = 'regular', { title } = {}) {
  const kind = knownType(type);
  return h('span', { class: 'energy', dataset: { type: kind, size }, title: title ?? `${typeName(kind)} Type` }, svg(energyGlyphs[kind]));
}
