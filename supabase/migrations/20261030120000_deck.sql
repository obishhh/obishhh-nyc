-- The deck box: short notes written on blank energy cards, and photos as Snapshots.
-- Drafts stay in the editor; the site only ever sees what's published.
create table public.deck (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('note', 'snapshot')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  number text not null default '',
  type text not null default 'plain' check (type in ('ink', 'spark', 'stone', 'wire', 'ember', 'ghost', 'plain')),
  title text not null default '' check (char_length(title) <= 32),
  text text not null default '' check (char_length(text) <= 140),
  place text not null default '' check (char_length(place) <= 32),
  photo jsonb not null default '{}'::jsonb,
  posted_on date not null default current_date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deck_posted_idx on public.deck (posted_on desc, created_at desc);

create or replace function public.deck_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  elsif new.status = 'draft' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger deck_before_write
before insert or update on public.deck
for each row execute function public.deck_before_write();

alter table public.deck enable row level security;

create policy "Admins can read the deck"
on public.deck for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can add to the deck"
on public.deck for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can edit the deck"
on public.deck for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can take from the deck"
on public.deck for delete
to authenticated
using ((select public.is_admin()));

revoke all on public.deck from anon;
grant select, insert, update, delete on public.deck to authenticated;

-- The public deck: published cards only, newest first.
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
      'text', d.text, 'place', d.place, 'photo', d.photo, 'date', d.posted_on
    )
    order by d.posted_on desc, d.created_at desc
  ), '[]'::jsonb)
  from public.deck d
  where d.status = 'published';
$$;

revoke execute on function public.deck() from public;
grant execute on function public.deck() to anon, authenticated;
