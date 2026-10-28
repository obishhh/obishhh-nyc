const DURATION = 220;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Fade the page out before following a link, instead of cutting to the next page.
export function fadeOut(link) {
  link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (reducedMotion.matches) return;
    event.preventDefault();
    document.body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DURATION, easing: 'ease-in', fill: 'forwards' })
      .finished.then(() => location.assign(link.href));
  });
  return link;
}

// Coming back through history restores the faded-out page, so bring it back.
addEventListener('pageshow', (event) => {
  if (event.persisted) document.body.getAnimations().forEach((animation) => animation.cancel());
});
