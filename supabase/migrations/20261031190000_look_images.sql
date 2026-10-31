-- A photo's look is drawn in the editor when it's saved, and the picture kept beside the photo (`baked`), so the site
-- shows it as it is. A Snapshot's go out with the rest of its public photo fields, held to the same shape as the photo.
alter table public.deck drop constraint deck_photo_shape;
alter table public.deck add constraint deck_photo_shape check (
  jsonb_typeof(photo) = 'object'
  and coalesce(jsonb_typeof(photo -> 'src'), 'string') = 'string'
  and char_length(coalesce(photo ->> 'src', '')) <= 512
  and coalesce(jsonb_typeof(photo -> 'baked'), 'string') = 'string'
  and char_length(coalesce(photo ->> 'baked', '')) <= 512
  and char_length(coalesce(photo ->> 'alt', '')) <= 160
  and char_length(coalesce(photo ->> 'position', '')) <= 32
  and coalesce(photo ->> 'look', '') in ('', 'watercolour', 'pencil', 'cel', 'comic', 'gameboy', 'gbc', 'ds')
  and coalesce(jsonb_typeof(photo -> 'second'), 'object') = 'object'
  and coalesce(jsonb_typeof(photo -> 'second' -> 'src'), 'string') = 'string'
  and char_length(coalesce(photo -> 'second' ->> 'src', '')) <= 512
  and coalesce(jsonb_typeof(photo -> 'second' -> 'baked'), 'string') = 'string'
  and char_length(coalesce(photo -> 'second' ->> 'baked', '')) <= 512
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
        'baked', coalesce(d.photo ->> 'baked', ''),
        'second', jsonb_build_object(
          'src', coalesce(d.photo -> 'second' ->> 'src', ''), 'position', coalesce(d.photo -> 'second' ->> 'position', ''),
          'baked', coalesce(d.photo -> 'second' ->> 'baked', '')
        )
      )
    )
    order by d.posted_on desc, d.created_at desc
  ), '[]'::jsonb)
  from public.deck d
  where d.status = 'published';
$$;
