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

// A copy of an element with what's drawn on its canvases too: a copied canvas keeps its size but comes up blank.
export function copyDrawn(element) {
  const copy = element.cloneNode(true);
  const drawn = element.querySelectorAll('canvas');
  copy.querySelectorAll('canvas').forEach((canvas, index) => canvas.width && canvas.height && canvas.getContext('2d').drawImage(drawn[index], 0, 0));
  return copy;
}

// Runs some work when the page has a moment, or after `timeout` ms at the latest, handing it how long the moment has
// left and whether it was put off that long. A browser that can't say gets a short moment, as if put off.
export function idle(work, timeout) {
  if ('requestIdleCallback' in globalThis) return requestIdleCallback(work, { timeout });
  return setTimeout(() => {
    const end = performance.now() + 10;
    work({ didTimeout: true, timeRemaining: () => Math.max(0, end - performance.now()) });
  }, 50);
}

// A canvas's drawing, on a canvas of its own: a canvas can only be in one place on the page.
export function copyCanvas(canvas) {
  const twin = Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height });
  twin.getContext('2d').drawImage(canvas, 0, 0);
  return twin;
}

export function svg(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}
