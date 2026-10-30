-- Sealed cards are shown as a picture painted in the editor (art.sealed), so the binder stops
-- sending a draft's full art: just that picture and the credit its license needs.
create or replace function public.binder()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    case when c.status = 'published' then
      jsonb_build_object(
        'id', c.id, 'sealed', false, 'number', c.number, 'title', c.title, 'stage', c.stage,
        'type', c.type, 'finish', c.finish, 'rarity', c.rarity, 'minutes', c.minutes,
        'firstPrint', c.first_print, 'dex', c.dex, 'move', c.move, 'stats', c.stats,
        'flavor', c.flavor, 'art', c.art, 'slug', c.slug, 'body', c.body
      )
    else
      jsonb_build_object(
        'id', c.id, 'sealed', true, 'number', c.number, 'type', c.type, 'finish', c.finish,
        'rarity', c.rarity, 'firstPrint', c.first_print,
        'art', case when c.art ? 'sealed' then
          jsonb_strip_nulls(jsonb_build_object(
            'sealed', c.art->'sealed', 'title', c.art->'title', 'author', c.art->'author',
            'license', c.art->'license', 'source', c.art->'source'
          ))
        else c.art end
      )
    end
    order by c.position, c.created_at
  ), '[]'::jsonb)
  from public.cards c;
$$;

-- The nine cards the binder shipped with get the pictures painted for them, while they still use their original art.
update public.cards c
set art = c.art || jsonb_build_object('sealed', seed.sealed)
from (values
  ('012/120', 'holo', 'ember', '/assets/art/red-dragon.webp', '/assets/sealed/012-120.webp'),
  ('031/120', 'reverse', 'stone', '/assets/art/llamigos-mine-cart.webp', '/assets/sealed/031-120.webp'),
  ('014/120', 'standard', 'spark', '/assets/art/carrot.webp', '/assets/sealed/014-120.webp'),
  ('007/120', 'holo', 'ghost', '/assets/art/dragon-cow.webp', '/assets/sealed/007-120.webp'),
  ('001/120', 'standard', 'plain', '/assets/art/sprite-fright-crossing.webp', '/assets/sealed/001-120.webp'),
  ('058/120', 'standard', 'wire', '/assets/art/big-buck-bunny-trio.webp', '/assets/sealed/058-120.webp'),
  ('044/120', 'reverse', 'ink', '/assets/art/franck.webp', '/assets/sealed/044-120.webp'),
  ('101/120', 'standard', 'ink', '/assets/art/llamigos-night.webp', '/assets/sealed/101-120.webp'),
  ('088/120', 'standard', 'spark', '/assets/art/sprite-fright-sprite.webp', '/assets/sealed/088-120.webp')
) as seed(number, finish, type, src, sealed)
where c.number = seed.number and c.finish = seed.finish and c.type = seed.type and c.art->>'src' = seed.src
  and coalesce(c.art->>'position', '') = '' and not c.art ? 'sealed';
