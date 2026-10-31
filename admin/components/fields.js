import { h } from '../../src/lib/dom.js';

let count = 0;
const uid = () => `field-${++count}`;

// What a row's label names: the field you type or pick in, not a file picker, a slider or a list of choices.
const FIELD = 'textarea, select, input:not([type=file], [type=radio], [type=range], [type=hidden])';

// A label on the left, the control on the right.
export function row(label, control, hint) {
  const input = control.matches(FIELD) ? control : control.querySelector(FIELD);
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

// A text box as tall as what's in it, so nothing ever needs scrolling inside it: it grows as you type, when the form
// fills it in (the 'fit' event), and when it's first shown or its width changes.
function grow(area) {
  if (!area.offsetWidth) return;
  area.style.setProperty('height', 'auto');
  area.style.setProperty('height', `${area.scrollHeight + area.offsetHeight - area.clientHeight}px`);
}

export function textarea(name, label, { hint, rows = 2, ...attrs } = {}) {
  const area = h('textarea', { class: 'input input--grow', name, rows, ...attrs });
  area.addEventListener('input', () => grow(area));
  area.addEventListener('fit', () => grow(area));
  let width = 0;
  new ResizeObserver(() => {
    if (area.offsetWidth === width) return;
    width = area.offsetWidth;
    grow(area);
  }).observe(area);
  return row(label, area, hint);
}

const options = (choices) => choices.map(({ value, label }) => h('option', { value }, label));

export const dropdown = (name, choices, attrs = {}) => h('select', { class: 'input', name, ...attrs }, options(choices));

export const select = (name, label, choices, { hint } = {}) => row(label, dropdown(name, choices), hint);

export const checkbox = (name, label, text, { hint } = {}) =>
  row(label, h('label', { class: 'check' }, h('input', { type: 'checkbox', name }), text), hint);

export function button(label, variant, onClick) {
  const element = h('button', { class: `button ${variant}`.trim(), type: 'button' }, label);
  element.addEventListener('click', onClick);
  return element;
}

export const section = (title, ...rows) =>
  h('details', { class: 'form-section', open: true },
    h('summary', { class: 'form-section__title' }, h('h2', { class: 'form-section__name' }, title)),
    rows,
  );
