// Wide enough for the binder's tabs down its left edge and the deck box off its right, rather than across the top.
// The same width is written into the styles' media queries (dividers, masthead, deck box, Pokédex).
export const WIDE = '(min-width: 1040px)';

// Asked for less motion: what moves from script checks this, and base.css stops the rest.
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
