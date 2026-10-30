import { h } from '../lib/dom.js';

export const COPYRIGHT = '©2026 obishhh.nyc';

// The line along the bottom of every card: who made it on the left, the copyright in the middle, its number on the
// right with any rarity mark after.
export function smallPrint(left, number, mark) {
  return h('footer', { class: 'card__footer' },
    h('span', {}, left),
    h('span', {}, COPYRIGHT),
    h('span', { class: 'card__number' }, h('span', { class: 'card__digits' }, number), mark),
  );
}
