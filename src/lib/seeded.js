// The same number (0 to 1) for the same text every time, so what's drawn from it doesn't change on reload.
export function seeded(text) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967295;
}

// The same, from -1 to 1: which way, and how far, something leans.
export const jitter = (text) => seeded(text) * 2 - 1;

// A sequence of numbers (0 to 1) that's the same every time for the same seed.
export function random(seed) {
  let state = Math.floor(seed * 4294967295) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
