import { h } from '../../src/lib/dom.js';

// A button that uploads a photo from this device. While one's on its way it says so, and takes no second pick.
export function uploadButton({ label, upload, onUploaded, onError }) {
  const file = h('input', { class: 'visually-hidden', type: 'file', accept: 'image/*' });
  const text = h('span', {}, label);
  const root = h('label', { class: 'button button--quiet art__upload' }, file, text);
  let shown = label;

  file.addEventListener('change', async () => {
    const [picked] = file.files;
    file.value = '';
    if (!picked) return;
    file.disabled = true;
    root.classList.add('is-busy');
    text.textContent = 'Uploading…';
    try {
      onUploaded(await upload(picked));
    } catch (error) {
      onError(error);
    } finally {
      file.disabled = false;
      root.classList.remove('is-busy');
      text.textContent = shown;
    }
  });

  return {
    root,
    file,
    // What it says when nothing's uploading.
    label(next) {
      shown = next;
      if (!file.disabled) text.textContent = next;
    },
  };
}
