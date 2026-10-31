-- Dark joins the types: a card, a note, a weakness or a resistance can be Dark.
alter table public.cards drop constraint cards_type_check;
alter table public.cards add constraint cards_type_check
  check (type in ('ink', 'spark', 'stone', 'wire', 'ember', 'ghost', 'plain', 'dark'));

alter table public.deck drop constraint deck_type_check;
alter table public.deck add constraint deck_type_check
  check (type in ('ink', 'spark', 'stone', 'wire', 'ember', 'ghost', 'plain', 'dark'));

alter table public.cards drop constraint cards_battle_shape;
alter table public.cards add constraint cards_battle_shape check (
  coalesce(stats ->> 'weakness', '') in ('', 'ink', 'spark', 'stone', 'wire', 'ember', 'ghost', 'plain', 'dark')
  and coalesce(stats ->> 'resistance', '') in ('', 'ink', 'spark', 'stone', 'wire', 'ember', 'ghost', 'plain', 'dark')
);
