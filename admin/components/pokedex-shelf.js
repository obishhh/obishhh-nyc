import { pullPhoto } from '../../src/components/pokedex-binder.js';
import { grip, shelf } from './shelf.js';
import { tile } from './tile.js';

function pullTile(data) {
  const name = data.name || 'Untitled';
  return tile({
    href: `#/pokedex/${data.id}`, name, status: data.status, card: pullPhoto(data), seed: data.id, data: { id: data.id, title: name },
    extra: grip(name),
  });
}

// The Pokédex's cards in its binder's order, drafts included. Drag (or arrow-key the handle) to reorder.
export const pokedexShelf = ({ onSort }) => shelf({
  onSort,
  title: 'Pokédex',
  heading: 'h2',
  add: { href: '#/pokedex/new', label: '+ Pull' },
  label: 'Pokédex, in binder order',
  make: pullTile,
  className: 'pokedex-shelf',
});
