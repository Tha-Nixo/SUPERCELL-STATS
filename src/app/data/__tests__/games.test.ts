import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { games } from '../games';

// The data components still take the accent as a hex prop while the shell
// reads it from the [data-game] CSS variables: both must say the same colour.
const css = readFileSync(new URL('../../../styles/theme.css', import.meta.url), 'utf8');

describe('game accents', () => {
  it.each(games.map((g) => [g.id, g.accent]))('%s accent matches theme.css', (id, accent) => {
    const block = css.match(new RegExp(`\\[data-game='${id}'\\]\\s*\\{([^}]*)\\}`));
    expect(block, `no [data-game='${id}'] block in theme.css`).not.toBeNull();
    expect(block![1]).toMatch(new RegExp(`--accent:\\s*${accent};`, 'i'));
  });

  it('uses the spec colours', () => {
    expect(Object.fromEntries(games.map((g) => [g.id, g.accent]))).toEqual({
      'clash-royale': '#4C8DFF',
      'brawl-stars': '#FFC21A',
      'clash-of-clans': '#5BD65B',
    });
  });
});
