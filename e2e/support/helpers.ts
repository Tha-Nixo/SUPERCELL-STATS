import { expect, type Locator, type Page } from '@playwright/test';
import { ART_HOSTS } from './mockApi.ts';

/**
 * Collect everything that counts as a bug during a page visit: uncaught
 * exceptions, console errors (CSP violations included), failed non-image
 * requests and 5xx responses. `allow` drops console messages a test causes on
 * purpose (e.g. the browser's "Failed to load resource" for a mocked 429).
 * `documentNotFound` tolerates the browser's 404 console message ONLY for the
 * page's own navigation response (production serves the SPA shell with a real
 * 404 status on unknown URLs); a 404 on any script, style or fetch still fails.
 * A 404 on third-party game art (ART_HOSTS) is tolerated too: CDNs miss new
 * content and every art slot has a fallback; a 404 on our own images fails.
 */
export function watch(page: Page, allow: RegExp[] = [], opts: { documentNotFound?: boolean } = {}) {
  const problems: string[] = [];
  const notFoundDocs = new Set<string>();
  const NOT_FOUND = /Failed to load resource: the server responded with a status of 404/;
  const pending404: Array<{ msg: string; url: string }> = [];
  const missingArt = new Set<string>();
  const isTolerated404 = (url: string) => (opts.documentNotFound === true && notFoundDocs.has(url)) || missingArt.has(url);
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (allow.some((re) => re.test(m.text()))) return;
    if (NOT_FOUND.test(m.text()) && isTolerated404(m.location().url)) return;
    const msg = `console: ${m.text()}`;
    if (NOT_FOUND.test(m.text())) pending404.push({ msg, url: m.location().url });
    problems.push(msg);
  });
  // Third-party game-asset images (arena/card art) can legitimately 404 for new
  // content; the app has onError fallbacks for them, so they are not app bugs.
  page.on('requestfailed', (r) => {
    if (r.resourceType() === 'image') return;
    problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`);
  });
  // The console message can arrive before the response event: drop it then.
  const forget404 = (url: string) => {
    for (const p of pending404.filter((x) => x.url === url)) {
      const i = problems.indexOf(p.msg);
      if (i >= 0) problems.splice(i, 1);
    }
  };
  page.on('response', (r) => {
    if (r.status() === 404 && r.request().isNavigationRequest() && r.frame() === page.mainFrame()) {
      notFoundDocs.add(r.url());
      if (opts.documentNotFound) forget404(r.url());
    }
    if (r.status() === 404 && r.request().resourceType() === 'image' && ART_HOSTS.test(r.url())) {
      missingArt.add(r.url());
      forget404(r.url());
    }
    if (r.status() >= 500) problems.push(`http ${r.status()}: ${r.url()}`);
  });
  return problems;
}

/** The page never scrolls sideways (the spec's 320px rule). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page is wider than the viewport').toBeLessThanOrEqual(0);
}

/** Every visible match is at least 44px tall (WCAG 2.5.5 target size, as the spec asks on mobile). */
export async function expectTouchTargets(locator: Locator, min = 44) {
  const count = await locator.count();
  expect(count, 'no elements matched the touch-target locator').toBeGreaterThan(0);
  let visible = 0;
  for (let i = 0; i < count; i++) {
    const el = locator.nth(i);
    if (!(await el.isVisible())) continue;
    visible++;
    const box = await el.boundingBox();
    const name = (await el.getAttribute('aria-label')) ?? (await el.innerText()).trim().slice(0, 40);
    expect(box!.height, `"${name}" is ${box!.height}px tall`).toBeGreaterThanOrEqual(min);
  }
  expect(visible, 'every element matched by the touch-target locator is hidden').toBeGreaterThan(0);
}

/** No emoji anywhere in the rendered chrome (the spec replaces them with SVG icons). */
export async function expectNoEmoji(locator: Locator) {
  const text = await locator.innerText();
  expect(text.match(/\p{Extended_Pictographic}/gu) ?? []).toEqual([]);
}
