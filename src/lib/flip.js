function toggle(target) {
  target.setAttribute('aria-pressed', String(target.getAttribute('aria-pressed') !== 'true'));
}

export function enableFlip(root, selector) {
  root.addEventListener('click', (event) => {
    const target = event.target.closest(selector);
    if (target) toggle(target);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest(selector);
    if (!target) return;
    event.preventDefault();
    toggle(target);
  });
}
