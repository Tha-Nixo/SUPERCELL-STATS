import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRecentSearches } from '../recentSearches';

const KEY = 'supercell_recent_searches';
const good = (over: Record<string, unknown> = {}) => ({
  gameId: 'brawl-stars', tag: '#2PP', username: 'Kite', trophies: 10, timestamp: 1, ...over,
});

function stubStorage(value: string | null) {
  const store = new Map<string, string>();
  if (value !== null) store.set(KEY, value);
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe('getRecentSearches', () => {
  beforeEach(() => stubStorage(null));
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it.each(['null', '{}', '"x"', '42', 'not json {'])('returns [] for stored %s', (raw) => {
    stubStorage(raw);
    expect(getRecentSearches()).toEqual([]);
    expect(getRecentSearches('brawl-stars')).toEqual([]);
  });

  it('returns [] when storage is missing', () => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(getRecentSearches()).toEqual([]);
  });

  it('returns [] when storage throws', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => { throw new Error('denied'); },
    };
    expect(getRecentSearches()).toEqual([]);
  });

  it('keeps well-formed entries and drops malformed ones', () => {
    const ok1 = good();
    const ok2 = good({ gameId: 'clash-of-clans', tag: '#2Y0Y', thLevel: 15, clanName: 'Keep', leagueUrl: 'x' });
    stubStorage(JSON.stringify([
      ok1, null, 'x', 7, [], { gameId: 'brawl-stars' }, good({ tag: 5 }), good({ tag: undefined }),
      good({ username: null }), good({ trophies: '10' }), good({ timestamp: 'now' }), good({ thLevel: 'x' }), ok2,
    ]));
    expect(getRecentSearches()).toEqual([ok1, ok2]);
    expect(getRecentSearches('clash-of-clans')).toEqual([ok2]);
  });
});
