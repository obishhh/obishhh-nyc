import { h, svg } from '../lib/dom.js';
import { rarityGlyphs } from '../lib/glyphs.js';

export function rarity(level) {
  return h('span', { class: 'rarity', title: level }, svg(rarityGlyphs[level]));
}
