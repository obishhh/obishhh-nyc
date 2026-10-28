import { h } from '../../src/lib/dom.js';

const STEP = 5;
const clamp = (value) => Math.min(100, Math.max(0, Math.round(value)));

// Pick the part of the picture that stays in frame. Stored as a CSS object-position.
export function focusPicker(name) {
  const input = h('input', { type: 'hidden', name });
  const image = h('img', { class: 'focus__image', alt: '', draggable: 'false' });
  const dot = h('span', { class: 'focus__dot', 'aria-hidden': 'true' });
  const pad = h('div', {
    class: 'focus__pad',
    role: 'slider',
    tabindex: 0,
    'aria-label': 'Focus point. Arrow keys move it.',
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
    h('p', { class: 'field__label' }, 'Focus'),
    pad,
    h('p', { class: 'field__hint' }, 'Drag the dot to choose what stays in frame. ', reset),
    input,
  );

  return {
    root,
    show(src) {
      root.hidden = !src;
      if (src && image.getAttribute('src') !== src) image.src = src;
    },
    clear() {
      input.value = '';
      this.sync();
    },
    // Pick up whatever the form just wrote into the hidden input.
    sync() {
      [x = 50, y = 50] = (input.value.match(/\d+(\.\d+)?/g) ?? []).map(Number);
      render();
    },
  };
}
