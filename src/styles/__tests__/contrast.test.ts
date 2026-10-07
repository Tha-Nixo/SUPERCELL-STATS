import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// WCAG AA guard for the token pairs the restyled panels rely on. Values are
// read from theme.css, so changing a token re-checks every pair below.
const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

type RGBA = [number, number, number, number];

function token(name: string, scope = ':root'): RGBA {
  const block = css.match(new RegExp(`${scope.replace(/[[\]']/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`no ${scope} block in theme.css`);
  const value = block[1].match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
  if (!value) throw new Error(`--${name} not declared in ${scope}`);
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as RGBA;
  const rgba = value.match(/^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/);
  if (rgba) return rgba.slice(1).map(Number) as RGBA;
  throw new Error(`--${name}: cannot parse "${value}"`);
}

/** Paint `top` over an opaque `bottom`. */
function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3];
  return [0, 1, 2].map((i) => Math.round(top[i] * a + bottom[i] * (1 - a))).concat(1) as RGBA;
}

function luminance([r, g, b]: RGBA): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg: RGBA, bg: RGBA): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const surface1 = token('surface-1');
const canvas = token('bg');

describe('semantic pills (text on its tinted fill)', () => {
  it.each([
    ['win', 'win-soft'],
    ['loss', 'loss-soft'],
    ['draw', 'draw-soft'],
  ])('%s on %s is AA on the page and on surface-1', (text, fill) => {
    for (const base of [canvas, surface1]) {
      const bg = over(token(fill), base);
      expect(contrast(token(text), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('accent', () => {
  it.each(['clash-royale', 'brawl-stars', 'clash-of-clans'])('%s: accent pill on surface-1 and accent-contrast on a solid accent are AA', (game) => {
    const scope = `[data-game='${game}']`;
    const accent = token('accent', scope);
    expect(contrast(accent, over(token('accent-soft', scope), surface1))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('accent-contrast'), accent)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('accent as text', () => {
  it.each(['clash-royale', 'brawl-stars', 'clash-of-clans'])('%s: accent text and icons are AA on the page and on both surfaces', (game) => {
    const accent = token('accent', `[data-game='${game}']`);
    for (const base of [canvas, surface1, token('surface-2')]) {
      expect(contrast(accent, base)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('text floor', () => {
  it('fg-subtle (white/60) is AA on every surface', () => {
    for (const base of [canvas, surface1, token('surface-2')]) {
      expect(contrast(over(token('text-subtle'), base), base)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
