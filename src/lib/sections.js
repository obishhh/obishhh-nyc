// How many tabs the binder's photo has: All, then the sections that fit.
export const MAX_TABS = 8;

// The binder's sections: one per "filed under", fullest first. Sealed cards, and ones left blank, only show under All.
export function sections(cards) {
  const counts = new Map();
  for (const { sealed, stats } of cards) {
    const filed = String(stats?.filed ?? '');
    if (!sealed && filed) counts.set(filed, (counts.get(filed) ?? 0) + 1);
  }
  return [...counts]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
