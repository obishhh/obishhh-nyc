// Paints photos' looks away from the page (see looks.js), so drawing one never holds up a tap or an animation.
import { paintLook } from './looks.js';

addEventListener('message', ({ data: { id, look, data, width, height } }) => {
  paintLook(look, { data, width, height });
  postMessage({ id, data }, [data.buffer]);
});
