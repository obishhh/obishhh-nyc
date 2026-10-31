// Where the pointer is over a card, for its glare: at most once a frame, however fast the pointer reports.
export function trackPointer(root, selector) {
  let target = null;
  let at = [0, 0];
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!target?.isConnected) return;
    const box = target.getBoundingClientRect();
    target.style.setProperty('--pointer-x', ((at[0] - box.left) / box.width).toFixed(3));
    target.style.setProperty('--pointer-y', ((at[1] - box.top) / box.height).toFixed(3));
  };
  root.addEventListener('pointermove', (event) => {
    target = event.target.closest(selector);
    if (!target) return;
    at = [event.clientX, event.clientY];
    frame ||= requestAnimationFrame(update);
  }, { passive: true });
}
