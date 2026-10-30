// "1 card", "2 cards".
export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
