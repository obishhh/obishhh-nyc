// The binder's sections: one per "filed under", fullest first. Sealed cards, and ones left blank, only show under All.
export function sections(cards) {
  const counts = new Map();
  for (const { sealed, stats } of cards) if (!sealed && stats.filed) counts.set(stats.filed, (counts.get(stats.filed) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
