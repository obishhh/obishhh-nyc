-- The card face says where a card is filed, not its stage, and shows weakness, resistance and retreat instead of
-- reads and bookmarks. Stop storing and sending what nothing shows any more, and hold the new picks to real types.

-- The binder as before, without the stage.
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
        'id', c.id, 'sealed', false, 'number', c.number, 'title', c.title,
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

alter table public.cards drop column stage;

update public.cards set stats = stats - 'reads' - 'replies' where stats ?| array['reads', 'replies'];

-- Weakness and resistance are a type, or blank for the usual weakness and no resistance.
alter table public.cards
  add constraint cards_battle_shape check (
    coalesce(stats ->> 'weakness', '') in ('', 'ink', 'spark', 'stone', 'wire', 'ember', 'ghost', 'plain')
    and coalesce(stats ->> 'resistance', '') in ('', 'ink', 'spark', 'stone', 'wire', 'ember', 'ghost', 'plain')
  );
