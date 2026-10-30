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
