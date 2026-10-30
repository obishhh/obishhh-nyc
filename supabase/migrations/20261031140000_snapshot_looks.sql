-- A Snapshot's photo can carry a filter (see src/lib/looks.js). Hold it to the ones the site knows, and send it out
-- with the rest of the public photo fields.
alter table public.deck drop constraint deck_photo_shape;
alter table public.deck add constraint deck_photo_shape check (
  jsonb_typeof(photo) = 'object'
  and coalesce(jsonb_typeof(photo -> 'src'), 'string') = 'string'
  and char_length(coalesce(photo ->> 'src', '')) <= 512
  and char_length(coalesce(photo ->> 'alt', '')) <= 160
  and char_length(coalesce(photo ->> 'position', '')) <= 32
  and coalesce(photo ->> 'look', '') in ('', 'pixel', 'comic', 'gameboy', 'gbc', 'ds', 'print', 'holo')
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
      'text', d.text, 'place', d.place, 'date', d.posted_on,
      'photo', jsonb_build_object(
        'src', coalesce(d.photo ->> 'src', ''), 'alt', coalesce(d.photo ->> 'alt', ''),
        'position', coalesce(d.photo ->> 'position', ''), 'look', coalesce(d.photo ->> 'look', '')
      )
    )
    order by d.posted_on desc, d.created_at desc
  ), '[]'::jsonb)
  from public.deck d
  where d.status = 'published';
$$;
