import { h } from '../../src/lib/dom.js';
import { MOST_ZOOM, zoomOf } from '../../src/lib/looks.js';

const STEP = 5;
const clamp = (value) => Math.min(100, Math.max(0, Math.round(value)));

// How far a photo is zoomed in on its focus point: a slider, kept in a hidden field as "1.5" ('' for not at all).
// Pinching the photo in the preview moves it too.
export function zoomControl(name) {
  const input = h('input', { type: 'hidden', name });
  const slider = h('input', { class: 'zoom__slider', type: 'range', min: 1, max: MOST_ZOOM, step: 0.05, value: 1, 'aria-label': 'Zoom' });
  const amount = h('span', { class: 'zoom__amount', 'aria-hidden': 'true' });
  const show = (zoom) => {
    slider.value = String(zoom);
    amount.textContent = `${zoom.toFixed(1)}×`;
  };
  slider.addEventListener('input', () => {
    const zoom = zoomOf(slider.value);
    input.value = zoom === 1 ? '' : String(zoom);
    show(zoom);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return {
    root: h('label', { class: 'zoom' }, h('span', { class: 'zoom__label' }, 'Zoom'), slider, amount, input),
    input,
    clear() {
      input.value = '';
      this.sync();
    },
    // Pick up whatever the form or a pinch just wrote into the hidden input.
    sync() {
      show(zoomOf(input.value));
    },
  };
}

// Pick the part of the picture that stays in frame, and how far in it's zoomed. Stored as a CSS object-position, and
// beside it (`…zoom` for `…position`) the zoom.
export function focusPicker(name) {
  const zoom = zoomControl(name.replace(/position$/, 'zoom'));
  const input = h('input', { type: 'hidden', name });
  const image = h('img', { class: 'focus__image', alt: '', draggable: 'false' });
  const dot = h('span', { class: 'focus__dot', 'aria-hidden': 'true' });
  const pad = h('div', {
    class: 'focus__pad',
    role: 'slider',
    tabindex: 0,
    'aria-label': 'Focus point',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
  }, image, dot);
  const reset = h('button', { class: 'focus__reset', type: 'button' }, 'Center');
  let x = 50;
  let y = 50;

  function render() {
    dot.style.setProperty('left', `${x}%`);
    dot.style.setProperty('top', `${y}%`);
    pad.setAttribute('aria-valuenow', String(x));
    pad.setAttribute('aria-valuetext', `${x}% across, ${y}% down`);
    reset.hidden = x === 50 && y === 50;
  }

  function set(nextX, nextY) {
    x = clamp(nextX);
    y = clamp(nextY);
    input.value = x === 50 && y === 50 ? '' : `${x}% ${y}%`;
    render();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function fromPointer(event) {
    const box = image.getBoundingClientRect();
    set(((event.clientX - box.left) / box.width) * 100, ((event.clientY - box.top) / box.height) * 100);
  }

  pad.addEventListener('pointerdown', (event) => {
    pad.setPointerCapture(event.pointerId);
    fromPointer(event);
  });
  pad.addEventListener('pointermove', (event) => {
    if (pad.hasPointerCapture(event.pointerId)) fromPointer(event);
  });
  pad.addEventListener('keydown', (event) => {
    const move = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[event.key];
    if (!move) return;
    event.preventDefault();
    set(x + move[0], y + move[1]);
  });
  reset.addEventListener('click', () => set(50, 50));

  const root = h('div', { class: 'focus' },
    pad,
    h('p', { class: 'row__hint' }, reset),
    zoom.root,
    input,
  );

  return {
    root,
    show(src) {
      if (src && image.getAttribute('src') !== src) image.src = src;
    },
    clear() {
      input.value = '';
      zoom.clear();
      this.sync();
    },
    // Pick up whatever the form, or a drag or pinch in the preview, just wrote into the hidden inputs.
    sync() {
      [x = 50, y = 50] = (input.value.match(/\d+(\.\d+)?/g) ?? []).map(Number);
      render();
      zoom.sync();
    },
  };
}
