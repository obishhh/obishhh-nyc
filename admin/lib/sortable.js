const THRESHOLD = 6;
const KEY_SAVE_DELAY = 600;
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const STEPS = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Drag to reorder the items of a list. A mouse can drag from anywhere on an item;
// touch and pen drag from the handle so the page still scrolls. Handles also take
// the arrow keys. onSort gets the new order of data-id values.
export function sortable(list, { item, handle, onSort, onMove }) {
  let drag = null;
  let keyStart = null;
  let keyTimer;
  let swallowClick = false;

  const items = () => [...list.querySelectorAll(item)];
  const order = () => items().map((element) => element.dataset.id);

  // Move in the DOM, then glide everything else from where it was to where it is now.
  function rearrange(move, moving) {
    const before = new Map(items().map((element) => [element, element.getBoundingClientRect()]));
    move();
    if (reducedMotion.matches) return;
    for (const [element, from] of before) {
      if (element === moving) continue;
      element.getAnimations().forEach((animation) => animation.cancel());
      const to = element.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (dx || dy) {
        element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: EASE });
      }
    }
  }

  // Positions in list coordinates, ignoring transforms, so the hit test doesn't chase animations.
  function pointIn(event) {
    const box = list.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  const contains = (element, { x, y }) =>
    x >= element.offsetLeft && x < element.offsetLeft + element.offsetWidth &&
    y >= element.offsetTop && y < element.offsetTop + element.offsetHeight;

  function follow(event) {
    const point = pointIn(event);
    const { target } = drag;
    const over = items().find((element) => element !== target && contains(element, point));
    if (over) {
      const forward = items().indexOf(over) > items().indexOf(target);
      rearrange(() => (forward ? over.after(target) : over.before(target)), target);
    }
    const x = point.x - drag.grabX - target.offsetLeft;
    const y = point.y - drag.grabY - target.offsetTop;
    target.style.transform = `translate(${x}px, ${y}px)`;
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < THRESHOLD) return;
      drag.active = true;
      drag.target.classList.add('is-dragging');
      list.classList.add('is-sorting');
    }
    event.preventDefault();
    follow(event);
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { target, active, start } = drag;
    drag = null;
    removeEventListener('pointermove', onPointerMove);
    removeEventListener('pointerup', onPointerUp);
    removeEventListener('pointercancel', onPointerUp);
    if (!active) return;

    swallowClick = true;
    setTimeout(() => (swallowClick = false));
    const from = target.style.transform;
    target.style.transform = '';
    target.classList.remove('is-dragging');
    list.classList.remove('is-sorting');
    if (!reducedMotion.matches) target.animate([{ transform: from }, { transform: 'none' }], { duration: 200, easing: EASE });

    const next = order();
    if (next.join() !== start.join()) {
      const index = next.indexOf(target.dataset.id);
      onMove?.(target, index, next.length);
      onSort(next);
    }
  }

  list.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    const target = event.target.closest(item);
    if (!target) return;
    if (event.pointerType !== 'mouse' && !event.target.closest(handle)) return;
    const point = pointIn(event);
    drag = {
      target,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      grabX: point.x - target.offsetLeft,
      grabY: point.y - target.offsetTop,
      start: order(),
      active: false,
    };
    addEventListener('pointermove', onPointerMove, { passive: false });
    addEventListener('pointerup', onPointerUp);
    addEventListener('pointercancel', onPointerUp);
  });

  // A drag ends with a click on whatever was under it. Don't let that open the card.
  list.addEventListener('click', (event) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  list.addEventListener('dragstart', (event) => event.preventDefault());

  list.addEventListener('keydown', (event) => {
    const grip = event.target.closest(handle);
    const step = STEPS[event.key];
    if (!grip || !step) return;
    event.preventDefault();
    const target = grip.closest(item);
    const all = items();
    const index = all.indexOf(target);
    const neighbour = all[index + step];
    if (!neighbour) return;

    keyStart ??= order();
    rearrange(() => (step > 0 ? neighbour.after(target) : neighbour.before(target)));
    grip.focus();
    onMove?.(target, index + step, all.length);

    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => {
      const next = order();
      if (next.join() !== keyStart.join()) onSort(next);
      keyStart = null;
    }, KEY_SAVE_DELAY);
  });
}
