export function trackPointer(root, selector) {
  root.addEventListener('pointermove', (event) => {
    const target = event.target.closest(selector);
    if (!target) return;
    const box = target.getBoundingClientRect();
    target.style.setProperty('--pointer-x', ((event.clientX - box.left) / box.width).toFixed(3));
    target.style.setProperty('--pointer-y', ((event.clientY - box.top) / box.height).toFixed(3));
  }, { passive: true });
}
