import { h } from '../lib/dom.js';

export function notice(text) {
  return h('p', { class: 'notice', role: 'status' }, text);
}
