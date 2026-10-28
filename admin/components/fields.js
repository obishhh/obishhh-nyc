import { h } from '../../src/lib/dom.js';

let count = 0;
const uid = () => `field-${++count}`;

const spanned = (span) => span && { span: String(span) };

function field(label, control, { hint, span } = {}) {
  const input = control.matches('input, select, textarea') ? control : control.querySelector('input, select, textarea');
  input.id ||= uid();
  return h('div', { class: 'field', dataset: spanned(span) },
    h('label', { class: 'field__label', for: input.id }, label),
    control,
    hint && h('p', { class: 'field__hint' }, hint),
  );
}

export function text(name, label, { hint, span, ...attrs } = {}) {
  return field(label, h('input', { class: 'input', name, type: 'text', autocomplete: 'off', ...attrs }), { hint, span });
}

export function number(name, label, { hint, span, suffix, ...attrs } = {}) {
  const input = h('input', { class: 'input', name, type: 'number', inputmode: 'numeric', ...attrs });
  return field(label, suffix ? h('div', { class: 'affix' }, input, h('span', { class: 'affix__text' }, suffix)) : input, { hint, span });
}

export function textarea(name, label, { hint, span, rows = 2, ...attrs } = {}) {
  return field(label, h('textarea', { class: 'input', name, rows, ...attrs }), { hint, span });
}

export const options = (choices) => choices.map(({ value, label }) => h('option', { value }, label));

export function select(name, label, choices, { hint, span } = {}) {
  return field(label, h('select', { class: 'input', name }, options(choices)), { hint, span });
}

// A row of radio pills. Each choice can bring an icon and its own data attributes.
export function choice(name, legend, choices, { hint, span, variant = 'pills' } = {}) {
  return h('fieldset', { class: `choice choice--${variant}`, dataset: spanned(span) },
    h('legend', { class: 'field__label' }, legend),
    h('div', { class: 'choice__options' },
      choices.map(({ value, label, icon, dataset }) => h('label', { class: 'choice__option', dataset },
        h('input', { class: 'choice__input', type: 'radio', name, value }),
        icon,
        h('span', { class: 'choice__label' }, label),
      )),
    ),
    hint && h('p', { class: 'field__hint' }, hint),
  );
}

export function toggle(name, label, { hint, span } = {}) {
  return h('div', { class: 'field', dataset: spanned(span) },
    h('label', { class: 'toggle' },
      h('input', { class: 'toggle__input', type: 'checkbox', name, role: 'switch' }),
      h('span', { class: 'toggle__track', 'aria-hidden': 'true' }),
      h('span', { class: 'toggle__label' }, label),
    ),
    hint && h('p', { class: 'field__hint' }, hint),
  );
}

export function section(title, intro, ...children) {
  return h('section', { class: 'form-section' },
    h('h2', { class: 'form-section__title' }, title),
    intro && h('p', { class: 'form-section__intro' }, intro),
    h('div', { class: 'form-grid' }, children),
  );
}
