-- The Pokédex: photos of the real cards pulled from packs, kept in a binder of their own. Each says what the card
-- is (its name, its Pokémon's number in the Pokédex, and the set and number that find that exact print) and has a
-- short note. They go in the order they're put in; drafts stay in the editor.
create table public.pokedex (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'published')),
  position integer,
  name text not null default '' check (char_length(name) <= 40),
  dex_number integer check (dex_number between 1 and 9999),
  card_set text not null default '' check (char_length(card_set) <= 40),
  card_number text not null default '' check (char_length(card_number) <= 20),
  note text not null default '' check (char_length(note) <= 200),
  photo jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pokedex_photo_shape check (
    jsonb_typeof(photo) = 'object'
    and coalesce(jsonb_typeof(photo -> 'src'), 'string') = 'string'
    and char_length(coalesce(photo ->> 'src', '')) <= 512
    and char_length(coalesce(photo ->> 'position', '')) <= 32
    and coalesce(jsonb_typeof(photo -> 'zoom'), 'string') = 'string'
    and char_length(coalesce(photo ->> 'zoom', '')) <= 8
    and coalesce(jsonb_typeof(photo -> 'turn'), 'string') = 'string'
    and char_length(coalesce(photo ->> 'turn', '')) <= 8
  )
);

create index pokedex_position_idx on public.pokedex (position, created_at);

create or replace function public.pokedex_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.position is null then
    select coalesce(max(p.position), 0) + 1 into new.position from public.pokedex p;
  end if;
  -- A reorder only moves the card, so it keeps its saved time.
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'position') = (to_jsonb(old) - 'position') then
    return new;
  end if;
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  elsif new.status = 'draft' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger pokedex_before_write
before insert or update on public.pokedex
for each row execute function public.pokedex_before_write();

alter table public.pokedex enable row level security;

create policy "Admins can read the Pokédex"
on public.pokedex for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can add to the Pokédex"
on public.pokedex for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can edit the Pokédex"
on public.pokedex for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can take from the Pokédex"
on public.pokedex for delete
to authenticated
using ((select public.is_admin()));

revoke all on public.pokedex from anon, authenticated;
grant select, insert, update, delete on public.pokedex to authenticated;

create or replace function public.reorder_pokedex(ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.pokedex p
  set position = t.ord
  from unnest(ids) with ordinality as t(id, ord)
  where p.id = t.id;
$$;

-- The public Pokédex: published cards only, in binder order.
create or replace function public.pokedex()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id, 'name', p.name, 'dex', p.dex_number, 'set', p.card_set, 'number', p.card_number, 'note', p.note,
      'photo', jsonb_build_object(
        'src', coalesce(p.photo ->> 'src', ''), 'position', coalesce(p.photo ->> 'position', ''),
        'zoom', coalesce(p.photo ->> 'zoom', ''), 'turn', coalesce(p.photo ->> 'turn', '')
      )
    )
    order by p.position, p.created_at
  ), '[]'::jsonb)
  from public.pokedex p
  where p.status = 'published';
$$;

revoke execute on function public.pokedex() from public;
revoke execute on function public.reorder_pokedex(uuid[]) from public, anon;
grant execute on function public.pokedex() to anon, authenticated;
grant execute on function public.reorder_pokedex(uuid[]) to authenticated;
