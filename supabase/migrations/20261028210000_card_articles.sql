-- A card can open into an article: slug is its address (?card=slug), body its text,
-- with a blank line between paragraphs. A card without a body just flips.
alter table public.cards
  add column slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add column body text not null default '';

update public.cards
set slug = 'about',
    body = E'Hi, I’m obishhh. This is my website.\n\nIt’s basically a blog dressed up as Pokémon cards. Every card is a post, and it could be about anything. Quite likely Pokémon.\n\nThe blurry ones aren’t finished yet. They’ll turn over when they are.\n\nThanks for stopping by.'
where number = '001/120' and title = 'About';

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
        'rarity', c.rarity, 'firstPrint', c.first_print, 'art', c.art
      )
    end
    order by c.position, c.created_at
  ), '[]'::jsonb)
  from public.cards c;
$$;
