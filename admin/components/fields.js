import { h } from '../../src/lib/dom.js';

let count = 0;
const uid = () => `field-${++count}`;

// A label on the left, the control on the right.
export function row(label, control, hint) {
  const input = control.matches('input, select, textarea') ? control : control.querySelector('input, select, textarea');
  if (input) input.id ||= uid();
  return h('div', { class: 'row' },
    input ? h('label', { class: 'row__label', for: input.id }, label) : h('span', { class: 'row__label' }, label),
    h('div', { class: 'row__value' }, control, hint && h('p', { class: 'row__hint' }, hint)),
  );
}

const input = (name, attrs) => h('input', { class: 'input', name, type: 'text', autocomplete: 'off', ...attrs });

export const text = (name, label, { hint, ...attrs } = {}) => row(label, input(name, attrs), hint);

export function number(name, label, { hint, unit, ...attrs } = {}) {
  const control = input(name, { class: 'input input--short', type: 'number', inputmode: 'numeric', ...attrs });
  return row(label, unit ? h('span', { class: 'inline' }, control, h('span', { class: 'unit' }, unit)) : control, hint);
}

export const textarea = (name, label, { hint, rows = 2, ...attrs } = {}) =>
  row(label, h('textarea', { class: 'input', name, rows, ...attrs }), hint);

const options = (choices) => choices.map(({ value, label }) => h('option', { value }, label));

export const dropdown = (name, choices, attrs = {}) => h('select', { class: 'input', name, ...attrs }, options(choices));

export const select = (name, label, choices, { hint } = {}) => row(label, dropdown(name, choices), hint);

export const checkbox = (name, label, text, { hint } = {}) =>
  row(label, h('label', { class: 'check' }, h('input', { type: 'checkbox', name }), text), hint);

export const section = (title, ...rows) =>
  h('details', { class: 'form-section', open: true },
    h('summary', { class: 'form-section__title' }, h('h2', { class: 'form-section__name' }, title)),
    rows,
  );
