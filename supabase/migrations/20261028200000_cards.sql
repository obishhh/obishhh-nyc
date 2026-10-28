create table public.cards (
  id uuid primary key default gen_random_uuid(),
  position integer not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  number text not null default '',
  title text not null default '',
  stage text not null default '',
  type text not null default 'plain' check (type in ('ink', 'spark', 'stone', 'wire', 'ember', 'ghost', 'plain')),
  finish text not null default 'standard' check (finish in ('standard', 'reverse', 'holo')),
  rarity text not null default 'common' check (rarity in ('common', 'uncommon', 'rare')),
  minutes integer not null default 1 check (minutes between 0 and 999),
  first_print boolean not null default true,
  dex text not null default '',
  move jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  flavor text,
  art jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_position_idx on public.cards (position, created_at);

create or replace function public.cards_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.position is null then
    select coalesce(max(c.position), 0) + 1 into new.position from public.cards c;
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

create trigger cards_before_write
before insert or update on public.cards
for each row execute function public.cards_before_write();

alter table public.cards enable row level security;

create policy "Admins can read cards"
on public.cards for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can create cards"
on public.cards for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can edit cards"
on public.cards for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete cards"
on public.cards for delete
to authenticated
using ((select public.is_admin()));

revoke all on public.cards from anon;
grant select, insert, update, delete on public.cards to authenticated;

-- The public binder. Drafts come back sealed: the look of the card without its words.
create or replace function public.binder()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    case when c.status = 'published' then
      jsonb_build_object(
        'id', c.id, 'sealed', false, 'number', c.number, 'title', c.title, 'stage', c.stage,
        'type', c.type, 'finish', c.finish, 'rarity', c.rarity, 'minutes', c.minutes,
        'firstPrint', c.first_print, 'dex', c.dex, 'move', c.move, 'stats', c.stats,
        'flavor', c.flavor, 'art', c.art
      )
    else
      jsonb_build_object(
        'id', c.id, 'sealed', true, 'number', c.number, 'type', c.type, 'finish', c.finish,
        'rarity', c.rarity, 'firstPrint', c.first_print, 'art', c.art
      )
    end
    order by c.position, c.created_at
  ), '[]'::jsonb)
  from public.cards c;
$$;

create or replace function public.reorder_cards(ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.cards c
  set position = t.ord
  from unnest(ids) with ordinality as t(id, ord)
  where c.id = t.id;
$$;

revoke execute on function public.binder() from public;
revoke execute on function public.reorder_cards(uuid[]) from public, anon;
grant execute on function public.binder() to anon, authenticated;
grant execute on function public.reorder_cards(uuid[]) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-art', 'card-art', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do nothing;

create policy "Admins can list card art"
on storage.objects for select
to authenticated
using (bucket_id = 'card-art' and (select public.is_admin()));

create policy "Admins can upload card art"
on storage.objects for insert
to authenticated
with check (bucket_id = 'card-art' and (select public.is_admin()));

create policy "Admins can replace card art"
on storage.objects for update
to authenticated
using (bucket_id = 'card-art' and (select public.is_admin()))
with check (bucket_id = 'card-art' and (select public.is_admin()));

create policy "Admins can delete card art"
on storage.objects for delete
to authenticated
using (bucket_id = 'card-art' and (select public.is_admin()));

-- The binder as it shipped: About is out, the rest are still sealed.
insert into public.cards (position, status, number, title, stage, type, finish, rarity, minutes, first_print, dex, move, stats, flavor, art) values
(1, 'draft', '012/120', '11px Type', 'Basic Post', 'ember', 'holo', 'rare', 4, true,
  'Essay. Length: 640 words. Filed: Oct 28, 2026.',
  '{"name": "Overthink", "text": "Write 600 words about one font. If heads, write 600 more.", "score": 40}',
  '{"reads": "1.2k", "replies": "14", "filed": "type"}',
  null,
  '{"src": "/assets/art/red-dragon.webp", "alt": "A red dragon in a hat and suit, reading a newspaper", "illustrator": "David Revoy", "title": "Red dragon economist from Komona", "author": "David Revoy", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:2020-01-28_red-dragon-economist-from-komona_by-David-Revoy.jpg"}'),
(2, 'draft', '031/120', 'Train Times', 'Basic Link', 'stone', 'reverse', 'uncommon', 2, true,
  'Link. 1 URL. Filed: Sep 19, 2026.',
  '{"name": "Express Skip", "text": "Flip a coin. If tails, this train is now running local.", "score": 20}',
  '{"reads": "812", "replies": "6", "filed": "nyc"}',
  null,
  '{"src": "/assets/art/llamigos-mine-cart.webp", "alt": "A llama and a penguin riding a mine cart", "illustrator": "Blender Studio", "title": "Caminandes 3: Llamigos (mine cart)", "author": "Blender Foundation", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:Blender_Foundation_-_Caminandes_-_Episode_3_-_Llamigos_-_Riding_mine_cart_with_Koro_and_Oti_while_carrying_a_red_grape.png"}'),
(3, 'draft', '014/120', 'Bodega Cat #14', 'Basic Note', 'spark', 'standard', 'common', 1, true,
  'Note. Length: 90 words. Filed: Oct 3, 2026.',
  '{"name": "Guard the Lotto", "text": "Sleeps on the scratch-offs. Opponent skips a turn.", "score": 30}',
  '{"reads": "3.4k", "replies": "41", "filed": "cats"}',
  'Fed by nobody. Somehow 19 pounds.',
  '{"src": "/assets/art/carrot.webp", "alt": "An orange cartoon cat, grinning", "illustrator": "David Revoy", "title": "Carrot from Pepper&Carrot", "author": "David Revoy", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:Carrot_from_Pepper%26Carrot.jpg"}'),
(4, 'draft', '007/120', 'Ship Alone', 'Featured Post', 'ghost', 'holo', 'rare', 9, true,
  'Essay. Length: 2,100 words. Filed: Aug 12, 2026.',
  '{"name": "Solo Deploy", "text": "Push to main at 2am. Discard your whole weekend.", "score": 90}',
  '{"reads": "9.8k", "replies": "120", "filed": "work"}',
  null,
  '{"src": "/assets/art/dragon-cow.webp", "alt": "A spotted dragon-cow flying over pink clouds", "illustrator": "David Revoy", "title": "Pepper&Carrot dragon cow", "author": "David Revoy", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:Pepper%26Carrot_dragon_cow.jpg"}'),
(5, 'published', '001/120', 'About', 'Standing Page', 'plain', 'standard', 'rare', 2, true,
  'Page. Updated whenever. Since 2026.',
  '{"name": "New Website", "text": "Shuffle the old site into your deck. Draw a fresh one.", "score": 30}',
  '{"reads": "3", "replies": "0", "filed": "me"}',
  'Made this website. Sorry.',
  '{"src": "/assets/art/sprite-fright-crossing.webp", "alt": "Small figures crossing a fallen log at sunset", "illustrator": "Vivien Lulkowski", "title": "Sprite Fright concept art (group)", "author": "Vivien Lulkowski / Blender Foundation", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:Sprite_Fright-concept_art-group.png"}'),
(6, 'draft', '058/120', 'Overheard', 'Basic Note', 'wire', 'standard', 'common', 1, true,
  'Note. Length: 1 sentence. Filed: Oct 21, 2026.',
  '{"name": "Eavesdrop", "text": "Look at the top card of your opponent’s deck. Tell everyone.", "score": 20}',
  '{"reads": "2.2k", "replies": "33", "filed": "nyc"}',
  null,
  '{"src": "/assets/art/big-buck-bunny-trio.webp", "alt": "A squirrel, a fox and a chinchilla in a sunny meadow", "illustrator": "Blender Studio", "title": "Big Buck Bunny (Frank, Rinky, Gimera)", "author": "Blender Foundation", "license": "CC BY 3.0", "source": "https://commons.wikimedia.org/wiki/File:Big.Buck.Bunny.-.Frank.Rinky.Gimera.png"}'),
(7, 'draft', '044/120', 'Notes on Foil', 'Basic Post', 'ink', 'reverse', 'uncommon', 5, true,
  'Essay. Length: 1,180 words. Filed: Jul 30, 2026.',
  '{"name": "Catch the Light", "text": "Tilt this card 30°. Damage is whatever colour you see.", "score": 60}',
  '{"reads": "1.9k", "replies": "22", "filed": "cards"}',
  null,
  '{"src": "/assets/art/franck.webp", "alt": "A blue caterpillar on purple mushrooms", "illustrator": "Blender Studio", "title": "Cosmos Laundromat (Franck the caterpillar)", "author": "Blender Foundation", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:Franck_the_caterpillar.jpg"}'),
(8, 'draft', '101/120', 'Night Shift', 'Basic Note', 'ink', 'standard', 'common', 3, true,
  'Note. Length: 300 words. Filed: Oct 25, 2026.',
  '{"name": "Stay Up", "text": "Skip your sleep. Draw 2 cards, then regret both.", "score": 50}',
  '{"reads": "1.1k", "replies": "9", "filed": "nights"}',
  null,
  '{"src": "/assets/art/llamigos-night.webp", "alt": "A llama and penguins in the snow at night", "illustrator": "Blender Studio", "title": "Caminandes 3: Llamigos (night)", "author": "Blender Foundation", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:Blender_Foundation_-_Caminandes_-_Episode_3_-_Llamigos_-_Koro_and_Oti_share_more_food_to_eat_at_night.png"}'),
(9, 'draft', '088/120', 'Coffee #212', 'Basic Note', 'spark', 'standard', 'common', 1, true,
  'Note. Length: 40 words. Filed: Oct 27, 2026.',
  '{"name": "Second Cup", "text": "Heal 20 damage. Your hands shake until end of turn.", "score": 30}',
  '{"reads": "640", "replies": "3", "filed": "coffee"}',
  'Same order since March. They still ask.',
  '{"src": "/assets/art/sprite-fright-sprite.webp", "alt": "A mushroom sprite with a red cap and a white beard", "illustrator": "Vivien Lulkowski", "title": "Sprite Fright concept art (sprite 04)", "author": "Vivien Lulkowski / Blender Foundation", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:Sprite_Fright-concept_art-sprite_04.png"}');
