// Small settings kept in this browser. Storage can be refused (private windows), so a failure means the default.
export function recall(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function store(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}
