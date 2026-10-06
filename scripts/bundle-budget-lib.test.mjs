import { describe, it, expect } from 'vitest';
import { closure, closureOf, evaluate, preloadedFonts, resolveKey, toKB } from './bundle-budget-lib.mjs';

const manifest = {
  'index.html': { file: 'assets/index-a.js', isEntry: true, imports: ['_react-b.js', '_motion-c.js'], dynamicImports: ['src/app/pages/GamePage.tsx'] },
  '_react-b.js': { file: 'assets/react-b.js' },
  '_motion-c.js': { file: 'assets/motion-c.js', imports: ['_react-b.js'] },
  // Vite drops the source-path key once another chunk imports the route chunk.
  '_GamePage-d.js': { file: 'assets/GamePage-d.js', name: 'GamePage', isDynamicEntry: true, imports: ['_react-b.js', 'index.html'], dynamicImports: ['src/app/pages/game/ClashRoyale.tsx'] },
  'src/app/pages/game/ClashRoyale.tsx': { file: 'assets/ClashRoyale-e.js', name: 'ClashRoyale', src: 'src/app/pages/game/ClashRoyale.tsx', isDynamicEntry: true, imports: ['_shared-f.js', '_GamePage-d.js'] },
  '_shared-f.js': { file: 'assets/shared-f.js' },
};

const budget = {
  budgets: { initialJs: 135, playerPageJs: 180, entryJs: 8, css: 16, fonts: 50 },
  maxPhaseGrowth: 0.05,
  phaseGrowthExempt: ['entryJs'],
  phaseStart: { initialJs: 122.75, playerPageJs: 163.58, entryJs: 4.49, css: 12.81, fonts: 48.26 },
};

describe('resolveKey', () => {
  it('accepts an exact key, a source path or a lazy chunk name', () => {
    expect(resolveKey(manifest, 'index.html')).toBe('index.html');
    expect(resolveKey(manifest, 'src/app/pages/game/ClashRoyale.tsx')).toBe('src/app/pages/game/ClashRoyale.tsx');
    expect(resolveKey(manifest, 'GamePage')).toBe('_GamePage-d.js');
    expect(resolveKey(manifest, 'ClashRoyale')).toBe('src/app/pages/game/ClashRoyale.tsx');
  });
  it('does not resolve shared (non-lazy) chunks by name', () => {
    expect(() => resolveKey(manifest, 'react')).toThrow(/matches 0 chunks/);
  });
});

describe('closure', () => {
  it('follows static imports only, once each', () => {
    expect([...closure(manifest, 'index.html')].sort()).toEqual(['assets/index-a.js', 'assets/motion-c.js', 'assets/react-b.js']);
  });
  it('unions several keys without duplicates', () => {
    expect([...closureOf(manifest, ['index.html', 'GamePage', 'ClashRoyale'])].sort()).toEqual([
      'assets/ClashRoyale-e.js', 'assets/GamePage-d.js', 'assets/index-a.js', 'assets/motion-c.js', 'assets/react-b.js', 'assets/shared-f.js',
    ]);
  });
  it('fails loudly when a configured entry no longer exists', () => {
    expect(() => closure(manifest, 'Gone')).toThrow(/update scripts\/bundle-budget.json/);
  });
});

describe('preloadedFonts', () => {
  it('reads preload links in any attribute order and ignores other links', () => {
    const html = '<link rel="preload" href="/fonts/Inter-latin.woff2" as="font" type="font/woff2" crossorigin />'
      + '<link as="font" href="/fonts/X.woff2" rel="preload">'
      + '<link rel="preconnect" href="https://cdn.brawlify.com" crossorigin />'
      + '<link rel="modulepreload" href="/assets/react-b.js">';
    expect(preloadedFonts(html)).toEqual(['/fonts/Inter-latin.woff2', '/fonts/X.woff2']);
  });
});

describe('evaluate', () => {
  const at = (overrides) => ({ ...budget.phaseStart, ...overrides });

  it('passes the phase-start numbers themselves', () => {
    expect(evaluate(at({}), budget).every((r) => r.ok)).toBe(true);
  });
  it('fails a line above its absolute budget', () => {
    const row = evaluate(at({ fonts: 50.01 }), budget).find((r) => r.line === 'fonts');
    expect(row).toMatchObject({ ok: false, reason: 'over budget', limit: 50 });
  });
  it('fails a line that grew more than 5% in the phase even under the absolute budget', () => {
    const row = evaluate(at({ initialJs: 129 }), budget).find((r) => r.line === 'initialJs');
    expect(row).toMatchObject({ ok: false, reason: 'over the per-phase growth cap', limit: 128.89, delta: 0.11 });
  });
  it('lets an exempt line grow up to its absolute budget only', () => {
    const rows = evaluate(at({ entryJs: 7.9 }), budget);
    expect(rows.find((r) => r.line === 'entryJs')).toMatchObject({ ok: true, limit: 8 });
    expect(evaluate(at({ entryJs: 8.1 }), budget).find((r) => r.line === 'entryJs')?.ok).toBe(false);
  });
  it('treats a missing measurement as a failure', () => {
    const { css: _css, ...rest } = budget.phaseStart;
    expect(evaluate(rest, budget).find((r) => r.line === 'css')).toMatchObject({ ok: false, reason: 'not measured' });
  });
});

describe('toKB', () => {
  it('uses 1000-byte kB with two decimals', () => {
    expect(toKB(48256)).toBe(48.26);
    expect(toKB(4490)).toBe(4.49);
  });
});
