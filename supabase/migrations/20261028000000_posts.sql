create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null default '',
  body text not null default '',
  excerpt text,
  kind text not null default 'post' check (kind in ('post', 'note', 'page', 'link')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  tags text[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_published_idx on public.posts (published_at desc) where status = 'published';

create or replace function public.posts_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_before_write
before insert or update on public.posts
for each row execute function public.posts_before_write();

alter table public.posts enable row level security;

create policy "Anyone can read published posts"
on public.posts for select
to anon, authenticated
using (status = 'published' and published_at <= now());

create policy "Admins can read everything"
on public.posts for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can create posts"
on public.posts for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can edit posts"
on public.posts for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete posts"
on public.posts for delete
to authenticated
using ((select public.is_admin()));

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
revoke all on public.admins from anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
