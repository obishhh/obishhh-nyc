import { h } from '../../src/lib/dom.js';

const region = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });

export function toast(message, { tone = 'ok' } = {}) {
  if (!region.isConnected) document.body.append(region);
  const note = h('p', { class: `toast toast--${tone}` }, message);
  region.append(note);
  setTimeout(() => {
    note.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished.then(() => note.remove());
  }, tone === 'bad' ? 6000 : 3000);
}
