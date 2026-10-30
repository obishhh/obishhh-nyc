import { masthead } from '../components/masthead.js';
import { missing } from '../components/missing.js';
import { h } from '../lib/dom.js';

document.body.append(
  masthead(),
  h('main', { class: 'page' }, missing()),
);
