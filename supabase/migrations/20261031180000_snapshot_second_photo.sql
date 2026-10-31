-- A Snapshot can split its picture between two photos. The second one keeps its own address and crop, is held to
-- the same shape as the first, and goes out with the rest of the public photo fields.
alter table public.deck drop constraint deck_photo_shape;
alter table public.deck add constraint deck_photo_shape check (
  jsonb_typeof(photo) = 'object'
  and coalesce(jsonb_typeof(photo -> 'src'), 'string') = 'string'
  and char_length(coalesce(photo ->> 'src', '')) <= 512
  and char_length(coalesce(photo ->> 'alt', '')) <= 160
  and char_length(coalesce(photo ->> 'position', '')) <= 32
  and coalesce(photo ->> 'look', '') in ('', 'watercolour', 'pencil', 'cel', 'comic', 'gameboy', 'gbc', 'ds')
  and coalesce(jsonb_typeof(photo -> 'second'), 'object') = 'object'
  and coalesce(jsonb_typeof(photo -> 'second' -> 'src'), 'string') = 'string'
  and char_length(coalesce(photo -> 'second' ->> 'src', '')) <= 512
  and char_length(coalesce(photo -> 'second' ->> 'position', '')) <= 32
);

create or replace function public.deck()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', d.id, 'kind', d.kind, 'number', d.number, 'type', d.type, 'title', d.title,
      'text', d.text, 'rule', d.rule, 'place', d.place, 'date', d.posted_on, 'at', d.published_at,
      'photo', jsonb_build_object(
        'src', coalesce(d.photo ->> 'src', ''), 'alt', coalesce(d.photo ->> 'alt', ''),
        'position', coalesce(d.photo ->> 'position', ''), 'look', coalesce(d.photo ->> 'look', ''),
        'second', jsonb_build_object(
          'src', coalesce(d.photo -> 'second' ->> 'src', ''), 'position', coalesce(d.photo -> 'second' ->> 'position', '')
        )
      )
    )
    order by d.posted_on desc, d.created_at desc
  ), '[]'::jsonb)
  from public.deck d
  where d.status = 'published';
$$;
