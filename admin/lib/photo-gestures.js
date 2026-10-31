import { frame, zoomOf } from '../../src/lib/looks.js';

const numbers = (value) => (value.match(/\d+(\.\d+)?/g) ?? []).map(Number);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const middle = (points) => points.reduce(([x, y], [px, py]) => [x + px / points.length, y + py / points.length], [0, 0]);
const spread = ([a, b]) => (b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0);
// How far a press moves before it's a drag rather than a tap.
const NUDGE = 4;
// How long zooming by scroll or trackpad rests before the form hears about it.
const REST = 150;

// Line a photo up on the card preview: drag it to slide it in its frame; pinch it (two fingers, a trackpad, or
// Ctrl-scroll) to zoom in on where it's held. `fields(key)` gives the form fields a frame's photo keeps its place and
// zoom in. The picture moves at once; the form, and so the preview, catches up when it's let go.
export function photoGestures(preview, { frames, keyOf = () => '', fields, enabled = () => true, onChange = () => {} }) {
  const pointers = new Map();
  let held = null;
  let dragged = false;
  let resting;

  const frameFor = (key) => [...preview.querySelectorAll(frames)].find((each) => keyOf(each) === key && !each.querySelector(frames));
  const read = (key) => {
    const [position, zoom] = fields(key);
    const [x = 50, y = 50] = numbers(position.value);
    return { x, y, zoom: zoomOf(zoom.value) };
  };

  // Moves the picture and quietly keeps the fields up to date.
  function write(key, { x, y, zoom }) {
    const [across, down] = [Math.round(clamp(x, 0, 100)), Math.round(clamp(y, 0, 100))];
    // Dead centre is no focus point at all, as the focus picker keeps it.
    const place = across === 50 && down === 50 ? '' : `${across}% ${down}%`;
    const scale = zoomOf(zoom) === 1 ? '' : String(+zoomOf(zoom).toFixed(2));
    const picture = frameFor(key)?.querySelector('img, canvas');
    if (picture) frame(picture, place, scale);
    const [position, zoomField] = fields(key);
    position.value = place;
    zoomField.value = scale;
    onChange();
  }
  // Then tells the form, once: it reads every field when it hears.
  const settle = (key) => fields(key)[0].dispatchEvent(new Event('input', { bubbles: true }));

  // Where the photo and the fingers were when the last one went down or came up: every move is measured from here.
  function rebase() {
    const points = [...pointers.values()];
    held = { ...held, ...read(held.key), at: middle(points), apart: spread(points) };
  }

  // How far the photo overhangs its frame when it covers it, at a zoom: that's the room it has to slide.
  function room(key, zoom) {
    const box = frameFor(key);
    const picture = box?.querySelector('img, canvas');
    if (!picture) return null;
    const [wide, tall] = picture instanceof HTMLImageElement ? [picture.naturalWidth, picture.naturalHeight] : [picture.width, picture.height];
    if (!wide || !tall || !picture.offsetWidth) return null;
    // The frame's size on screen, as the preview's scale shows it.
    const onScreen = box.getBoundingClientRect().width / box.offsetWidth;
    const [width, height] = [picture.offsetWidth * onScreen, picture.offsetHeight * onScreen];
    const cover = Math.max(width / wide, height / tall) * zoom;
    return [wide * cover - width, tall * cover - height];
  }

  // A press only becomes a drag once it moves, so a tap still does what a tap does there (flips the card).
  function grab() {
    for (const id of pointers.keys()) {
      if (!preview.hasPointerCapture(id)) preview.setPointerCapture(id);
    }
    dragged = true;
  }

  function lift(id) {
    if (!pointers.delete(id)) return;
    if (pointers.size) return rebase();
    if (dragged) settle(held.key);
    held = null;
    // The click a mouse sends as it's let go comes straight after; a finger's drag sends none.
    setTimeout(() => (dragged = false));
  }

  preview.addEventListener('pointerdown', (event) => {
    if (!enabled() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const at = event.target.closest(frames);
    if (!held && !at?.querySelector('img, canvas')) return;
    if (!held) dragged = false;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    held ??= { key: keyOf(at) };
    rebase();
    if (pointers.size > 1) grab();
  });

  preview.addEventListener('pointermove', (event) => {
    if (!held || !pointers.has(event.pointerId)) return;
    // A mouse let go somewhere this never heard about.
    if (event.pointerType === 'mouse' && !event.buttons) return lift(event.pointerId);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    const points = [...pointers.values()];
    const [now, then] = [middle(points), held.at];
    if (!dragged) {
      if (Math.hypot(now[0] - then[0], now[1] - then[1]) < NUDGE) return;
      grab();
    }
    event.preventDefault();
    const zoom = held.apart ? zoomOf((held.zoom * spread(points)) / held.apart) : held.zoom;
    const [spareX, spareY] = room(held.key, zoom) ?? [0, 0];
    write(held.key, {
      x: spareX > 0.5 ? held.x - ((now[0] - then[0]) / spareX) * 100 : held.x,
      y: spareY > 0.5 ? held.y - ((now[1] - then[1]) / spareY) * 100 : held.y,
      zoom,
    });
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) preview.addEventListener(type, (event) => lift(event.pointerId));
  // A drag ends in a click where it's let go: not a tap on whatever's there.
  preview.addEventListener('click', (event) => {
    if (!dragged) return;
    event.stopPropagation();
    event.preventDefault();
  }, true);
  preview.addEventListener('dragstart', (event) => event.target.closest(frames) && event.preventDefault());

  // A trackpad pinch arrives as Ctrl-scroll in most browsers, and as gesture events in Safari.
  const zoomAt = (target, by) => {
    const at = enabled() && target.closest(frames);
    if (!at?.querySelector('img, canvas')) return false;
    const key = keyOf(at);
    const now = read(key);
    write(key, { ...now, zoom: zoomOf(now.zoom * by) });
    clearTimeout(resting);
    resting = setTimeout(() => settle(key), REST);
    return true;
  };
  // A mouse wheel's notch is a big jump: each turn zooms a step, however far it scrolls.
  preview.addEventListener('wheel', (event) => {
    if (event.ctrlKey && zoomAt(event.target, Math.exp(-clamp(event.deltaY, -20, 20) * 0.01))) event.preventDefault();
  }, { passive: false });
  let pinched = 1;
  preview.addEventListener('gesturestart', (event) => {
    pinched = 1;
    if (held || event.target.closest(frames)) event.preventDefault();
  });
  preview.addEventListener('gesturechange', (event) => {
    // Fingers on a touch screen are already followed as pointers; the page itself mustn't zoom under them.
    if (held) return event.preventDefault();
    if (!zoomAt(event.target, event.scale / pinched)) return;
    pinched = event.scale;
    event.preventDefault();
  });
}
