// The seven types, by the names people know them by. The keys are older than the
// names and stay as they are in the data.
export const TYPES = [
  { value: 'wire', label: 'Grass' },
  { value: 'ember', label: 'Fire' },
  { value: 'ink', label: 'Water' },
  { value: 'spark', label: 'Electric' },
  { value: 'stone', label: 'Ground' },
  { value: 'ghost', label: 'Psychic' },
  { value: 'plain', label: 'Normal' },
];

export const typeName = (type) => TYPES.find(({ value }) => value === type)?.label ?? type;

// Who each type is weak to, as on the real cards. A card that hasn't picked its own weakness gets this one.
const WEAK_TO = { wire: 'ember', ember: 'ink', ink: 'spark', spark: 'stone', stone: 'wire', ghost: 'ghost', plain: 'stone' };
export const weaknessOf = ({ type, stats }) => stats?.weakness || WEAK_TO[type] || 'plain';

// Longer reads are harder to put down: a circle more to retreat from one.
export const retreatOf = (minutes) => (minutes < 3 ? 0 : minutes < 6 ? 1 : minutes < 11 ? 2 : 3);
