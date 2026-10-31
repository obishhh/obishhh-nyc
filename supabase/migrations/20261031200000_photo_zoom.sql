-- A photo can be zoomed in on its focus point ("1.5", or '' for not at all), each of a Snapshot's two on its own. It's
-- held to a short string like the focus point, and goes out with the rest of the public photo fields. A binder card's
-- zoom sits in its art, which already goes out whole.
alter table public.deck drop constraint deck_photo_shape;
alter table public.deck add constraint deck_photo_shape check (
  jsonb_typeof(photo) = 'object'
  and coalesce(jsonb_typeof(photo -> 'src'), 'string') = 'string'
  and char_length(coalesce(photo ->> 'src', '')) <= 512
  and coalesce(jsonb_typeof(photo -> 'baked'), 'string') = 'string'
  and char_length(coalesce(photo ->> 'baked', '')) <= 512
  and char_length(coalesce(photo ->> 'alt', '')) <= 160
  and char_length(coalesce(photo ->> 'position', '')) <= 32
  and coalesce(jsonb_typeof(photo -> 'zoom'), 'string') = 'string'
  and char_length(coalesce(photo ->> 'zoom', '')) <= 8
  and coalesce(photo ->> 'look', '') in ('', 'watercolour', 'pencil', 'cel', 'comic', 'gameboy', 'gbc', 'ds')
  and coalesce(jsonb_typeof(photo -> 'second'), 'object') = 'object'
  and coalesce(jsonb_typeof(photo -> 'second' -> 'src'), 'string') = 'string'
  and char_length(coalesce(photo -> 'second' ->> 'src', '')) <= 512
  and coalesce(jsonb_typeof(photo -> 'second' -> 'baked'), 'string') = 'string'
  and char_length(coalesce(photo -> 'second' ->> 'baked', '')) <= 512
  and char_length(coalesce(photo -> 'second' ->> 'position', '')) <= 32
  and coalesce(jsonb_typeof(photo -> 'second' -> 'zoom'), 'string') = 'string'
  and char_length(coalesce(photo -> 'second' ->> 'zoom', '')) <= 8
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
        'position', coalesce(d.photo ->> 'position', ''), 'zoom', coalesce(d.photo ->> 'zoom', ''),
        'look', coalesce(d.photo ->> 'look', ''), 'baked', coalesce(d.photo ->> 'baked', ''),
        'second', jsonb_build_object(
          'src', coalesce(d.photo -> 'second' ->> 'src', ''), 'position', coalesce(d.photo -> 'second' ->> 'position', ''),
          'zoom', coalesce(d.photo -> 'second' ->> 'zoom', ''), 'baked', coalesce(d.photo -> 'second' ->> 'baked', '')
        )
      )
    )
    order by d.posted_on desc, d.created_at desc
  ), '[]'::jsonb)
  from public.deck d
  where d.status = 'published';
$$;
