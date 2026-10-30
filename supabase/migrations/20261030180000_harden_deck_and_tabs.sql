-- Hold the deck and the binder's sections to the shapes the editor writes, so one odd row can't
-- break the page that shows it.
alter table public.deck
  add constraint deck_number_length check (char_length(number) <= 9),
  add constraint deck_photo_shape check (
    jsonb_typeof(photo) = 'object'
    and coalesce(jsonb_typeof(photo -> 'src'), 'string') = 'string'
    and char_length(coalesce(photo ->> 'src', '')) <= 512
    and char_length(coalesce(photo ->> 'alt', '')) <= 160
    and char_length(coalesce(photo ->> 'position', '')) <= 32
  );

-- "Filed under" names a tab, so it's a short string or nothing.
alter table public.cards
  add constraint cards_filed_shape check (
    coalesce(jsonb_typeof(stats -> 'filed'), 'string') = 'string'
    and char_length(coalesce(stats ->> 'filed', '')) <= 12
  );

-- Supabase hands new tables to signed-in users wholesale; give back only what the editor uses.
revoke all on public.deck from authenticated;
grant select, insert, update, delete on public.deck to authenticated;
revoke all on public.cards from authenticated;
grant select, insert, update, delete on public.cards to authenticated;

-- Say which photo fields go public, so anything added to `photo` later stays private until it's listed here.
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
        'src', coalesce(d.photo ->> 'src', ''), 'alt', coalesce(d.photo ->> 'alt', ''), 'position', coalesce(d.photo ->> 'position', '')
      )
    )
    order by d.posted_on desc, d.created_at desc
  ), '[]'::jsonb)
  from public.deck d
  where d.status = 'published';
$$;
