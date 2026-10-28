// Form controls are named by path ("move.cost.0"), so a whole card reads and writes in one go.

const keys = (name) => name.split('.');

function getPath(object, name) {
  return keys(name).reduce((value, key) => value?.[key], object);
}

function setPath(object, name, value) {
  const path = keys(name);
  const last = path.pop();
  let target = object;
  path.forEach((key, index) => {
    target[key] ??= /^\d+$/.test(path[index + 1] ?? last) ? [] : {};
    target = target[key];
  });
  target[last] = value;
}

const names = (form) => [...new Set([...form.elements].map((control) => control.name).filter(Boolean))];

const radios = (control) => (control instanceof RadioNodeList ? [...control] : [control]);

function read(control) {
  if (control instanceof RadioNodeList || control.type === 'radio') {
    return radios(control).find((radio) => radio.checked)?.value ?? '';
  }
  if (control.type === 'checkbox') return control.checked;
  if (control.type === 'number') return control.value === '' ? null : Number(control.value);
  return control.value;
}

function write(control, value) {
  if (control instanceof RadioNodeList || control.type === 'radio') {
    for (const radio of radios(control)) radio.checked = radio.value === value;
  } else if (control.type === 'checkbox') {
    control.checked = Boolean(value);
  } else {
    control.value = value ?? '';
  }
}

export function readForm(form) {
  const values = {};
  for (const name of names(form)) setPath(values, name, read(form.elements.namedItem(name)));
  return values;
}

export function writeForm(form, values) {
  for (const name of names(form)) write(form.elements.namedItem(name), getPath(values, name));
}
