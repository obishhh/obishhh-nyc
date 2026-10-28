import { cardBack } from '../../src/components/card-back.js';
import { h, svg } from '../../src/lib/dom.js';
import { forgetEmail, rememberedEmail, signIn } from '../lib/auth.js';
import { ARROW_LEFT } from '../lib/icons.js';

const SLIDE_OUT = 420;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function explain(error) {
  if (/invalid login credentials/i.test(error.message)) return 'Wrong email or password.';
  if (error instanceof TypeError) return 'Couldn’t reach the server. Try again.';
  return error.message;
}

// The sign-in page: a card tucked into a sleeve, with the form on the sleeve.
export function door({ onSignedIn }) {
  const email = h('input', { class: 'input', id: 'door-email', name: 'email', type: 'email', autocomplete: 'username', required: true });
  const password = h('input', { class: 'input', id: 'door-password', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const emailField = h('div', { class: 'door__field' }, h('label', { for: 'door-email' }, 'Email'), email);
  const notMe = h('button', { class: 'door__not-me', type: 'button' }, 'Not you?');
  const lede = h('p', { class: 'door__lede' });
  const error = h('p', { class: 'door__error', role: 'alert' });
  const submit = h('button', { class: 'button button--primary door__submit', type: 'submit' }, 'Sign in');

  const form = h('form', { class: 'door__form' },
    emailField,
    h('div', { class: 'door__field' }, h('label', { for: 'door-password' }, 'Password'), password),
    error,
    submit,
  );

  const pocket = h('div', { class: 'door__pocket' },
    h('div', { class: 'door__card' }, cardBack()),
    h('div', { class: 'door__sleeve' },
      h('h1', { class: 'door__title' }, 'Editor’s room'),
      lede,
      form,
    ),
  );

  const root = h('main', { class: 'door', hidden: true },
    h('a', { class: 'door__back', href: '/' }, svg(ARROW_LEFT), 'Back to the binder'),
    pocket,
  );

  function render() {
    const remembered = rememberedEmail();
    email.value = remembered ?? '';
    emailField.hidden = Boolean(remembered);
    lede.replaceChildren(...(remembered ? ['Welcome back. ', notMe] : ['Sign in to edit the site.']));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Signing in…';
    try {
      const session = await signIn(email.value, password.value);
      password.value = '';
      // Pull the card out of the sleeve on the way in.
      pocket.classList.add('is-open');
      if (!reducedMotion.matches) await new Promise((resolve) => setTimeout(resolve, SLIDE_OUT));
      onSignedIn(session);
    } catch (failure) {
      error.textContent = explain(failure);
      password.select();
    } finally {
      submit.disabled = false;
      submit.textContent = 'Sign in';
    }
  });

  notMe.addEventListener('click', () => {
    forgetEmail();
    render();
    email.focus();
  });

  return {
    root,
    show(message = '') {
      render();
      pocket.classList.remove('is-open');
      error.textContent = message;
      root.hidden = false;
      (emailField.hidden ? password : email).focus();
    },
    hide() {
      root.hidden = true;
      error.textContent = '';
    },
  };
}
