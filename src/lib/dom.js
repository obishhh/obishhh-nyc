export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') element.className = value;
    else if (key === 'dataset') for (const [name, entry] of Object.entries(value)) entry != null && (element.dataset[name] = entry);
    else if (key === 'style') for (const [name, rule] of Object.entries(value)) rule != null && element.style.setProperty(name, rule);
    else element.setAttribute(key, value === true ? '' : value);
  }
  element.append(...children.flat().filter((child) => child != null && child !== false));
  return element;
}

export function svg(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}
