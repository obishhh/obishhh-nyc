// Where the pointer is over a card, for its glare: at most once a frame, however fast the pointer reports. The card's
// box is measured once as the pointer comes onto it (and again after a scroll), not every frame, which would have the
// page work out the card's styles all over again each time.
export function trackPointer(root, selector) {
  let target = null;
  let box = null;
  let at = [0, 0];
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!target?.isConnected) return;
    box ??= target.getBoundingClientRect();
    target.style.setProperty('--pointer-x', ((at[0] - box.left) / box.width).toFixed(3));
    target.style.setProperty('--pointer-y', ((at[1] - box.top) / box.height).toFixed(3));
  };
  root.addEventListener('pointermove', (event) => {
    const over = event.target.closest(selector);
    if (over !== target) box = null;
    target = over;
    if (!target) return;
    at = [event.clientX, event.clientY];
    frame ||= requestAnimationFrame(update);
  }, { passive: true });
  addEventListener('scroll', () => (box = null), { passive: true, capture: true });
}
