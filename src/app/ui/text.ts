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

const ROMAN = /^(i{1,3}|iv|vi{0,3}|ix|x)$/i;

/**
 * API names in capitals for display: 'EL PRIMO' -> 'El Primo', '8-BIT' -> '8-Bit',
 * 'MR. P' -> 'Mr. P'; roman numerals stay capital ('GOLD II' -> 'Gold II').
 */
export function titleCase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (ROMAN.test(word) ? word.toUpperCase() : word.replace(/(^|[-.&/])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())))
    .join(' ');
}

/** Brawl Stars club names and descriptions carry in-game colour tags: 'Zero<c9>Win</c>' -> 'ZeroWin'. */
export function stripColorTags(text: string): string {
  return text.replace(/<\/?c[0-9a-f]*>/gi, '');
}

/** 1 -> '1st', 2 -> '2nd', 11 -> '11th', 23 -> '23rd' (Showdown placements). */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}
