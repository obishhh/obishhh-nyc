// Type symbols: black shapes, with their cut-outs in the colour of the orb they sit on. Dark's orb is too dark for black,
// so its moon is drawn in light, the way the real cards turn that one round.
export const energyGlyphs = {
  wire: `<svg viewBox="0 0 15 15" aria-hidden="true">
    <path d="M7.5 1.4C11 3 12.7 6.1 11.9 9.2C11.3 11.4 9.5 12.7 7.5 12.9C5.5 12.7 3.7 11.4 3.1 9.2C2.3 6.1 4 3 7.5 1.4Z" fill="#1a1712"/>
    <path d="M7.5 12.5V14.2" stroke="#1a1712" stroke-width="1.3" stroke-linecap="round"/>
    <path class="glyph-cut" d="M7.5 4.2V11.8M7.5 7.2L9.7 5.5M7.5 7.2L5.3 5.5M7.5 9.6L10.1 7.8M7.5 9.6L4.9 7.8" fill="none" stroke-width="0.85" stroke-linecap="round"/>
  </svg>`,
  ember: `<svg viewBox="0 0 15 15" aria-hidden="true">
    <path d="M7.7 1C8.5 3.5 11 4.6 11.8 7.4C12.6 10.5 10.5 13.8 7.5 13.8C4.5 13.8 2.4 11.3 3.1 8.4C3.5 6.6 4.8 5.5 5.2 4C6 5.3 6.4 6.6 6.4 7.6C7.7 6 8.2 3.7 7.7 1Z" fill="#1a1712"/>
    <path class="glyph-cut" d="M7.5 13.1C6.2 13.1 5.4 12.1 5.6 10.9C5.8 9.9 6.6 9.3 6.8 8.3C7.6 9.1 8.5 9.5 8.9 10.7C9.4 12 8.7 13.1 7.5 13.1Z"/>
  </svg>`,
  ink: `<svg viewBox="0 0 15 15" aria-hidden="true">
    <path d="M7.5 1.3C9.7 4.6 12.1 7.2 12.1 9.6C12.1 12.1 10.1 13.9 7.5 13.9C4.9 13.9 2.9 12.1 2.9 9.6C2.9 7.2 5.3 4.6 7.5 1.3Z" fill="#1a1712"/>
    <path class="glyph-cut" d="M5.3 9.5C5.3 11 6.2 12 7.6 12.3" fill="none" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`,
  spark: `<svg viewBox="0 0 15 15" aria-hidden="true">
    <path d="M9.1 1L3.3 8.5H7L5.7 14L11.8 6.1H8.1L9.1 1Z" fill="#1a1712"/>
  </svg>`,
  stone: `<svg viewBox="0 0 15 15" aria-hidden="true">
    <path d="M1.3 12.2L5.3 5.1L7.4 8L9.5 3.8L13.7 12.2Z" fill="#1a1712"/>
    <path class="glyph-cut" d="M4.5 9.9H8.2M9.2 9.9H11.1M3.4 11.2H6.4M7.4 11.2H12.1M8.6 6.8L9.9 7.7" fill="none" stroke-width="0.75" stroke-linecap="round"/>
  </svg>`,
  ghost: `<svg viewBox="0 0 15 15" aria-hidden="true">
    <path d="M1.2 7.5C3 4.5 5.1 3.2 7.5 3.2C9.9 3.2 12 4.5 13.8 7.5C12 10.5 9.9 11.8 7.5 11.8C5.1 11.8 3 10.5 1.2 7.5Z" fill="#1a1712"/>
    <circle class="glyph-cut" cx="7.5" cy="7.5" r="2.7"/>
    <circle cx="7.5" cy="7.5" r="1.35" fill="#1a1712"/>
  </svg>`,
  plain: `<svg viewBox="0 0 15 15" aria-hidden="true">
    <path d="M7.5 1.7L9.1 5.7L13.4 5.9L10 8.6L11.2 12.8L7.5 10.4L3.8 12.8L5 8.6L1.6 5.9L5.9 5.7L7.5 1.7Z" fill="#1a1712"/>
  </svg>`,
  dark: `<svg viewBox="0 0 15 15" aria-hidden="true">
    <path d="M9.6 1.6A6.1 6.1 0 1 0 13.4 9.8A4.9 4.9 0 1 1 9.6 1.6Z" fill="#efeaff"/>
    <path d="M11.7 2.4L12.1 3.5L13.2 3.9L12.1 4.3L11.7 5.4L11.3 4.3L10.2 3.9L11.3 3.5Z" fill="#efeaff"/>
  </svg>`,
};

export const rarityGlyphs = {
  common: `<svg viewBox="0 0 12 12" aria-hidden="true">
    <circle cx="6" cy="6" r="3.8" fill="currentColor"/>
  </svg>`,
  uncommon: `<svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M6 1.6L10.4 6L6 10.4L1.6 6L6 1.6Z" fill="currentColor"/>
  </svg>`,
  rare: `<svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M6 1.1L7.35 4.55L11.05 4.75L8.2 7.1L9.15 10.7L6 8.7L2.85 10.7L3.8 7.1L0.95 4.75L4.65 4.55L6 1.1Z" fill="currentColor"/>
  </svg>`,
};
