import type { Page } from '@playwright/test';
import { bsBattlelog, bsClub, bsPlayer, cocPlayer, crBattlelog, crPlayer } from './fixtures.ts';

export { FIXTURE_TAG } from './fixtures.ts';

export interface MockApiOptions {
  /** Game-art URLs matching this answer 404, as a CDN does for content it does not have yet. */
  brokenArt?: RegExp;
  /** Fields merged over a game's player fixture (e.g. `{ 'clash-royale': { supportCards: [] } }`). */
  patch?: Partial<Record<'clash-royale' | 'brawl-stars' | 'clash-of-clans', Record<string, unknown>>>;
  /** Replaces a game's battlelog fixture (the raw API payload). */
  battlelog?: Partial<Record<'clash-royale' | 'brawl-stars', unknown>>;
  /** Replaces the Brawl Stars club payload; `null` answers 404, as for a club that no longer exists. */
  club?: Record<string, unknown> | null;
  /** Player requests wait for this promise: lets a test look at the loading state. */
  hold?: Promise<void>;
  /** Answer the first `times` player requests with this error instead of the fixture. */
  fail?: { status: number; reason: string; times: number };
}

// 1x1 opaque slate PNG: game art CDNs are answered locally so tests never depend
// on them, and review screenshots still show where each image sits.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mOwcisAAAGuAPF1kfDaAAAAAElFTkSuQmCC', 'base64');
/** Third-party hosts of game art (all listed in the production CSP img-src). */
export const ART_HOSTS = /^https:\/\/(cdn\.brawlify\.com|cdn-old\.brawlify\.com|api-assets\.clashroyale\.com|api-assets\.clashofclans\.com|royaleapi\.github\.io)\//;

const PLAYER = /^\/api\/(clash-royale|brawl-stars|clash-of-clans)\/players\/[^/]+$/;

/**
 * Serve the Supercell API from fixtures. Returns the list of API paths the
 * page requested (decoded), in order.
 */
export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<string[]> {
  const calls: string[] = [];
  let failuresLeft = options.fail?.times ?? 0;

  await page.route(ART_HOSTS, (route) =>
    options.brokenArt?.test(route.request().url())
      ? route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' })
      : route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );

  await page.route('**/api/**', async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    calls.push(path);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (PLAYER.test(path)) {
      if (options.hold) await options.hold;
      if (failuresLeft > 0) {
        failuresLeft--;
        return json({ reason: options.fail!.reason, message: options.fail!.reason }, options.fail!.status);
      }
      if (path.startsWith('/api/clash-royale/')) return json({ ...crPlayer, ...options.patch?.['clash-royale'] });
      if (path.startsWith('/api/brawl-stars/')) return json({ ...bsPlayer, ...options.patch?.['brawl-stars'] });
      return json({ ...cocPlayer, ...options.patch?.['clash-of-clans'] });
    }
    if (path.endsWith('/battlelog')) {
      if (path.startsWith('/api/clash-royale/')) return json(options.battlelog?.['clash-royale'] ?? crBattlelog);
      return json(options.battlelog?.['brawl-stars'] ?? bsBattlelog);
    }
    if (path.startsWith('/api/brawl-stars/clubs/')) {
      return options.club === null ? json({ reason: 'notFound', message: 'notFound' }, 404) : json(options.club ?? bsClub);
    }
    // Catalogue sizes: 121 cards and 95 brawlers exist in the (fixture) game, so the
    // Cards tab reads "8/121" and the Brawlers tab "6/95".
    if (path === '/api/clash-royale/cards') return json({ items: Array.from({ length: 121 }, (_, id) => ({ id })) });
    if (path === '/api/brawl-stars/brawlers') return json({ items: Array.from({ length: 95 }, (_, id) => ({ id })) });
    return json({ reason: 'notFound', message: 'notFound' }, 404);
  });

  return calls;
}

/** A promise plus the function that settles it. */
export function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}
