import { energy } from '../../src/components/energy.js';
import { rarity } from '../../src/components/rarity.js';
import { h, svg } from '../../src/lib/dom.js';
import { trackPointer } from '../../src/lib/pointer.js';
import { forgetEmail, rememberedEmail, signIn } from '../lib/auth.js';
import { ARROW_LEFT } from '../lib/icons.js';

function explain(error) {
  if (/invalid login credentials/i.test(error.message)) return 'Nope. The door didn’t budge. Check the email and password.';
  if (error instanceof TypeError) return 'The door is jammed (network trouble). Try again in a sec.';
  return error.message;
}

// The sign-in page, dressed as a card. Strangers get a back arrow and no hard feelings.
export function door({ onSignedIn }) {
  const email = h('input', { class: 'input', id: 'door-email', name: 'email', type: 'email', autocomplete: 'username', required: true });
  const password = h('input', { class: 'input', id: 'door-password', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const emailField = h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'door-email' }, 'Email'), email);
  const notMe = h('button', { class: 'door__not-me', type: 'button' }, 'Not you?');
  const greeting = h('p', { class: 'door__greeting' }, 'Welcome back. Password, please.', notMe);
  const error = h('p', { class: 'door__error', role: 'alert' });
  const submit = h('button', { class: 'button button--primary door__submit', type: 'submit' }, 'Let me in');

  const form = h('form', { class: 'door__form' },
    greeting,
    emailField,
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'door-password' }, 'Password'), password),
    error,
    submit,
  );

  const card = h('article', { class: 'door__card', dataset: { type: 'ghost' } },
    h('div', { class: 'door__panel' },
      h('p', { class: 'door__stage' }, 'Basic Door'),
      h('header', { class: 'door__name' },
        h('h1', { class: 'door__title' }, 'Editor’s Room'),
        h('span', { class: 'door__hp', title: 'Very sturdy' },
          h('span', { class: 'door__hp-value' }, '999'),
          h('span', { class: 'door__hp-unit' }, 'HP'),
          energy('ghost'),
        ),
      ),
      h('p', { class: 'door__dex' }, 'Door. Locked. Staff only (staff of one).'),
      h('section', { class: 'door__move' },
        h('span', { class: 'door__cost' }, energy('ghost', 'small'), energy('plain', 'small')),
        h('div', { class: 'door__move-text' },
          h('h2', { class: 'door__move-name' }, 'Bouncer'),
          h('p', { class: 'door__move-body' }, 'If you aren’t obishhh, this door does nothing. Flip back to the binder. No hard feelings.'),
        ),
        h('span', { class: 'door__score' }, '∞'),
      ),
      form,
      h('p', { class: 'door__flavor' }, 'Nothing in here but unfinished cards and a mild sense of dread.'),
    ),
    h('footer', { class: 'door__footer' },
      h('span', {}, 'Illus. nobody'),
      h('span', {}, '©2026 obishhh.nyc'),
      h('span', { class: 'door__number' }, '000/120', rarity('rare')),
    ),
  );

  const root = h('main', { class: 'door', hidden: true },
    h('a', { class: 'door__back', href: '/' }, svg(ARROW_LEFT), 'Back to the binder'),
    card,
    h('p', { class: 'door__aside' }, 'Wandered in by accident? The cards are out front.'),
  );

  trackPointer(root, '.door__card');

  function render() {
    const remembered = rememberedEmail();
    email.value = remembered ?? '';
    emailField.hidden = Boolean(remembered);
    greeting.hidden = !remembered;
  }

  function complain(message) {
    error.textContent = message;
    card.classList.remove('is-wrong');
    void card.offsetWidth;
    card.classList.add('is-wrong');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Knocking…';
    try {
      const session = await signIn(email.value, password.value);
      password.value = '';
      onSignedIn(session);
    } catch (failure) {
      complain(explain(failure));
      password.select();
    } finally {
      submit.disabled = false;
      submit.textContent = 'Let me in';
    }
  });

  notMe.addEventListener('click', () => {
    forgetEmail();
    render();
    email.focus();
  });

  card.addEventListener('animationend', () => card.classList.remove('is-wrong'));

  return {
    root,
    show(message = '') {
      render();
      root.hidden = false;
      if (message) complain(message);
      (emailField.hidden ? password : email).focus();
    },
    hide() {
      root.hidden = true;
      error.textContent = '';
    },
  };
}
