import { h } from '../../src/lib/dom.js';
import { focusOf, MOST_TURN, MOST_ZOOM, turnOf, zoomOf } from '../../src/lib/looks.js';

const STEP = 5;
const clamp = (value) => Math.min(100, Math.max(0, Math.round(value)));

// A slider kept in a hidden field: blank at `rest`, otherwise the number. `of` reads what's written as a number in
// range, and `says` is how it reads beside the slider.
function slider(name, { label, min, max, step, rest, of, says }) {
  const input = h('input', { type: 'hidden', name });
  const range = h('input', { class: 'zoom__slider', type: 'range', min, max, step, value: rest, 'aria-label': label });
  const amount = h('span', { class: 'zoom__amount', 'aria-hidden': 'true' });
  const show = (value) => {
    range.value = String(value);
    amount.textContent = says(value);
  };
  range.addEventListener('input', () => {
    const value = of(range.value);
    input.value = value === rest ? '' : String(value);
    show(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return {
    root: h('label', { class: 'zoom' }, h('span', { class: 'zoom__label' }, label), range, amount, input),
    clear() {
      input.value = '';
      this.sync();
    },
    // Pick up whatever the form or a pinch just wrote into the hidden input.
    sync() {
      show(of(input.value));
    },
  };
}

// How far a photo is zoomed in on its focus point, as "1.5" ('' for not at all). Pinching the photo in the preview
// moves it too.
export const zoomControl = (name) =>
  slider(name, { label: 'Zoom', min: 1, max: MOST_ZOOM, step: 0.05, rest: 1, of: zoomOf, says: (zoom) => `${zoom.toFixed(1)}×` });

// How far a photo's turned back to stand its card up straight, in degrees either way, as "-2.5" ('' for not at all).
const turnControl = (name) =>
  slider(name, { label: 'Rotate', min: -MOST_TURN, max: MOST_TURN, step: 0.5, rest: 0, of: turnOf, says: (turn) => `${turn}°` });

// Pick the part of the picture that stays in frame, how far in it's zoomed and, with `turn`, how far it's turned.
// Stored as a CSS object-position, and beside it (`…zoom` and `…turn` for `…position`) the zoom and the turn.
export function focusPicker(name, { turn = false } = {}) {
  const zoom = zoomControl(name.replace(/position$/, 'zoom'));
  const turning = turn ? turnControl(name.replace(/position$/, 'turn')) : null;
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
  const reset = h('button', { class: 'button--link', type: 'button' }, 'Center');
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
    turning?.root,
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
      turning?.clear();
      this.sync();
    },
    // Pick up whatever the form, or a drag or pinch in the preview, just wrote into the hidden inputs.
    sync() {
      [x, y] = focusOf(input.value);
      render();
      zoom.sync();
      turning?.sync();
    },
  };
}
