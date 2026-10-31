export { TYPES } from '../../src/data/types.js';

// How a card stands, on the shelves and in an editor's bar.
export const STATUS = { new: 'New', draft: 'Draft', published: 'Live' };

// How a note's drawn: over its type's painting, or plain like the first energy cards.
export const DESIGNS = [
  { value: 'painted', label: 'Painted' },
  { value: 'classic', label: 'Classic' },
];

export const FINISHES = [
  { value: 'standard', label: 'Standard' },
  { value: 'reverse', label: 'Reverse holo' },
  { value: 'holo', label: 'Holo' },
];

export const RARITIES = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
];

// The number after the highest so far, in the set the others are numbered in (or `set`, for the first).
export function nextNumber(cards, set) {
  const numbers = cards.map(({ number }) => parseInt(number, 10)).filter(Number.isFinite);
  const next = String(Math.max(0, ...numbers) + 1).padStart(3, '0');
  return `${next}/${cards.find(({ number }) => number.includes('/'))?.number.split('/')[1] ?? set}`;
}

// A fresh card takes the next number in the set.
export function blankCard(cards) {
  return {
    number: nextNumber(cards, '120'),
    title: '',
    type: 'plain',
    finish: 'standard',
    rarity: 'common',
    minutes: 1,
    firstPrint: true,
    dex: '',
    move: { name: '', text: '', score: 10, cost: ['plain', 'plain'] },
    stats: { weakness: '', resistance: '', filed: '' },
    flavor: null,
    slug: '',
    body: '',
    art: { src: '', alt: '', illustrator: '', position: '', zoom: '', look: '', title: '', author: '', license: '', source: '' },
  };
}
