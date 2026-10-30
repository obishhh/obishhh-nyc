-- The photo filters change: Pixel, Base Set print and Holo foil go; Watercolour, Coloured pencil and Cel art come in.
-- A Snapshot still on a filter that's gone goes back to Default.
update public.deck set photo = photo - 'look' where photo ->> 'look' in ('pixel', 'print', 'holo');

alter table public.deck drop constraint deck_photo_shape;
alter table public.deck add constraint deck_photo_shape check (
  jsonb_typeof(photo) = 'object'
  and coalesce(jsonb_typeof(photo -> 'src'), 'string') = 'string'
  and char_length(coalesce(photo ->> 'src', '')) <= 512
  and char_length(coalesce(photo ->> 'alt', '')) <= 160
  and char_length(coalesce(photo ->> 'position', '')) <= 32
  and coalesce(photo ->> 'look', '') in ('', 'watercolour', 'pencil', 'cel', 'comic', 'gameboy', 'gbc', 'ds')
);
