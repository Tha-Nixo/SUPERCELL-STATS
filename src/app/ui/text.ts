/**
 * Drop emoji (with variation selectors, skin tones, flags, keycaps and ZWJ sequences) from a data
 * string. Some API-mapped labels carry one ("7123 PL 🏆"); the restyled
 * chrome shows SVG icons instead.
 */
export function stripEmoji(text: string): string {
  return text
    .replace(/[0-9#*]\uFE0F?\u20E3/gu, '')
    .replace(/\p{Regional_Indicator}{2}/gu, '')
    .replace(
      /\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|[\u{E0020}-\u{E007F}]|\uFE0F|\u200D\p{Extended_Pictographic})*/gu,
      '',
    )
    .replace(/\p{Emoji_Modifier}|[\u{E0020}-\u{E007F}]|\uFE0F|\u200D/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** API enum-ish words for display: 'legendary' -> 'Legendary', 'coLeader' -> 'Co leader'. */
export function sentenceCase(text: string): string {
  const words = text.trim().replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
