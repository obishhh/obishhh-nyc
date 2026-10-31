-- A note can be drawn like the very first energy cards instead of over its type's painting: plain colour and white
-- light. Every note so far stays painted.
alter table public.deck add column design text not null default 'painted' check (design in ('painted', 'classic'));

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
      'text', d.text, 'rule', d.rule, 'place', d.place, 'link', d.link, 'design', d.design, 'date', d.posted_on, 'at', d.published_at,
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
