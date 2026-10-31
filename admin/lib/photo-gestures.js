import { frame, zoomOf } from '../../src/lib/looks.js';

const numbers = (value) => (value.match(/\d+(\.\d+)?/g) ?? []).map(Number);
const clamp = (value) => Math.min(100, Math.max(0, value));
const middle = (points) => points.reduce(([x, y], [px, py]) => [x + px / points.length, y + py / points.length], [0, 0]);
const spread = ([a, b]) => (b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0);

// Line a photo up on the card preview: drag it to slide it in its frame; pinch it (two fingers, a trackpad, or
// Ctrl-scroll) to zoom in on where it's held. `fields(key)` gives the form fields a frame's photo keeps its place and
// zoom in. The preview is redrawn as the form changes, so the frame is found again on every move.
export function photoGestures(preview, { frames, keyOf = () => '', fields, enabled = () => true, onChange = () => {} }) {
  const pointers = new Map();
  let held = null;

  const frameFor = (key) => [...preview.querySelectorAll(frames)].find((each) => keyOf(each) === key && !each.querySelector(frames));
  const read = (key) => {
    const [position, zoom] = fields(key);
    const [x = 50, y = 50] = numbers(position.value);
    return { x, y, zoom: zoomOf(zoom.value) };
  };

  function write(key, { x, y, zoom }) {
    const [across, down] = [Math.round(clamp(x)), Math.round(clamp(y))];
    // Dead centre is no focus point at all, as the focus picker keeps it.
    const place = across === 50 && down === 50 ? '' : `${across}% ${down}%`;
    const scale = zoomOf(zoom) === 1 ? '' : String(+zoomOf(zoom).toFixed(2));
    // Shown at once on the picture there, before the preview catches up.
    const picture = frameFor(key)?.querySelector('img, canvas');
    if (picture) frame(picture, place, scale);
    const [position, zoomField] = fields(key);
    for (const [field, value] of [[position, place], [zoomField, scale]]) {
      if (field.value === value) continue;
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    onChange();
  }

  // Where the photo and the fingers were when the last one went down or came up: every move is measured from here.
  function settle() {
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

  preview.addEventListener('pointerdown', (event) => {
    if (!enabled()) return;
    const at = event.target.closest(frames);
    if (!held && !at?.querySelector('img, canvas')) return;
    event.preventDefault();
    preview.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    held ??= { key: keyOf(at) };
    settle();
  });

  preview.addEventListener('pointermove', (event) => {
    if (!held || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    const points = [...pointers.values()];
    const zoom = held.apart ? zoomOf((held.zoom * spread(points)) / held.apart) : held.zoom;
    const [spareX, spareY] = room(held.key, zoom) ?? [0, 0];
    const [now, then] = [middle(points), held.at];
    write(held.key, {
      x: spareX > 0.5 ? held.x - ((now[0] - then[0]) / spareX) * 100 : held.x,
      y: spareY > 0.5 ? held.y - ((now[1] - then[1]) / spareY) * 100 : held.y,
      zoom,
    });
  });

  const lift = (event) => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size) settle();
    else held = null;
  };
  preview.addEventListener('pointerup', lift);
  preview.addEventListener('pointercancel', lift);

  // A trackpad pinch arrives as Ctrl-scroll in most browsers, and as gesture events in Safari.
  const zoomAt = (target, by) => {
    const at = enabled() && target.closest(frames);
    if (!at?.querySelector('img, canvas')) return false;
    const now = read(keyOf(at));
    write(keyOf(at), { ...now, zoom: zoomOf(now.zoom * by) });
    return true;
  };
  preview.addEventListener('wheel', (event) => {
    if (event.ctrlKey && zoomAt(event.target, Math.exp(-event.deltaY * 0.01))) event.preventDefault();
  }, { passive: false });
  let pinched = 1;
  preview.addEventListener('gesturestart', (event) => {
    pinched = 1;
    if (!pointers.size && event.target.closest(frames)) event.preventDefault();
  });
  preview.addEventListener('gesturechange', (event) => {
    // Fingers on a touch screen are already followed as pointers.
    if (pointers.size || !zoomAt(event.target, event.scale / pinched)) return;
    pinched = event.scale;
    event.preventDefault();
  });
}
