/**
 * Drop emoji (with their variation selectors and ZWJ sequences) from a data
 * string. Some API-mapped labels carry one ("7123 PL 🏆"); the restyled
 * chrome shows SVG icons instead.
 */
export function stripEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu, '')
    .replace(/️/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
