-- The deck sends when each card went up, so a card brought up to read can show its time.
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
        'position', coalesce(d.photo ->> 'position', ''), 'look', coalesce(d.photo ->> 'look', '')
      )
    )
    order by d.posted_on desc, d.created_at desc
  ), '[]'::jsonb)
  from public.deck d
  where d.status = 'published';
$$;
