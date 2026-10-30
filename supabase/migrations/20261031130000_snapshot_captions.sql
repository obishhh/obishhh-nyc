-- A Snapshot's caption box holds about 200 characters; a note, written in big marker, still stops at 140.
alter table public.deck drop constraint deck_text_check;
alter table public.deck add constraint deck_text_check check (char_length(text) <= case when kind = 'snapshot' then 200 else 140 end);
