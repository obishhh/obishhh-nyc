-- A sealed card only ever sends its blurred picture and the art's credit. Before, one whose picture hadn't been
-- painted sent its art whole (the photo, its look and crop), for the page to blur.
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
        'art', jsonb_strip_nulls(jsonb_build_object(
          'sealed', c.art -> 'sealed', 'title', c.art -> 'title', 'author', c.art -> 'author',
          'license', c.art -> 'license', 'source', c.art -> 'source'
        ))
      )
    end
    order by c.position, c.created_at
  ), '[]'::jsonb)
  from public.cards c;
$$;

-- A deck card's number becomes its link (001/100 is /d/001-100/), so it's kept to what a link can hold, and no two
-- published cards can share one.
alter table public.deck add constraint deck_number_shape check (number ~ '^[A-Za-z0-9._/-]*$');
create unique index deck_published_key on public.deck (replace(number, '/', '-')) where status = 'published' and number <> '';

-- The blog the site started as never went out, and nothing reads its table any more.
drop table public.posts;
drop function public.posts_before_write();
