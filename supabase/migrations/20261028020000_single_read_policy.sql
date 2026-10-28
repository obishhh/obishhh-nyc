drop policy "Anyone can read published posts" on public.posts;
drop policy "Admins can read everything" on public.posts;

create policy "Read published posts, admins read everything"
on public.posts for select
to anon, authenticated
using ((status = 'published' and published_at <= now()) or (select public.is_admin()));
