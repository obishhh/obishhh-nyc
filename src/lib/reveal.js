const LIMIT = 1000;

// Hold the page back until its fonts and art are ready (or a second passes),
// then fade it in in one go instead of in pieces.
export async function revealWhenReady(root) {
  const art = [...root.querySelectorAll('img')].map((img) => img.decode().catch(() => {}));
  const ready = Promise.all([document.fonts.ready, ...art]);
  await Promise.race([ready, new Promise((resolve) => setTimeout(resolve, LIMIT))]);
  requestAnimationFrame(() => document.body.classList.remove('is-waiting'));
}
