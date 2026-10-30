export { TYPES } from '../../src/data/types.js';

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

export const STAGES = ['Basic Post', 'Basic Note', 'Basic Link', 'Featured Post', 'Standing Page'];

// A fresh card takes the next number in the set.
export function blankCard(cards) {
  const numbers = cards.map(({ number }) => parseInt(number, 10)).filter(Number.isFinite);
  const next = String(Math.max(0, ...numbers) + 1).padStart(3, '0');
  const set = cards.find(({ number }) => number.includes('/'))?.number.split('/')[1] ?? '120';
  return {
    number: `${next}/${set}`,
    title: '',
    stage: 'Basic Post',
    type: 'plain',
    finish: 'standard',
    rarity: 'common',
    minutes: 1,
    firstPrint: true,
    dex: '',
    move: { name: '', text: '', score: 10, cost: ['plain', 'plain'] },
    stats: { reads: '0', replies: '0', filed: '' },
    flavor: null,
    slug: '',
    body: '',
    art: { src: '', alt: '', illustrator: '', position: '', title: '', author: '', license: '', source: '' },
  };
}
