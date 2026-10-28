import { forgetEmail, rememberedEmail, signIn } from '../lib/auth.js';

export function mountLogin(root, { onSignedIn }) {
  const form = root.querySelector('form');
  const { email, password } = form.elements;
  const error = root.querySelector('[data-error]');
  const emailField = root.querySelector('[data-email-field]');
  const switchAccount = root.querySelector('[data-switch-account]');

  function render() {
    const remembered = rememberedEmail();
    email.value = remembered ?? '';
    emailField.hidden = Boolean(remembered);
    switchAccount.hidden = !remembered;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    try {
      const session = await signIn(email.value, password.value);
      password.value = '';
      onSignedIn(session);
    } catch (failure) {
      error.textContent = failure.message;
    }
  });

  switchAccount.addEventListener('click', () => {
    forgetEmail();
    render();
    email.focus();
  });

  return {
    show(message = '') {
      render();
      error.textContent = message;
      root.hidden = false;
      (emailField.hidden ? password : email).focus();
    },
    hide() {
      root.hidden = true;
    },
  };
}
