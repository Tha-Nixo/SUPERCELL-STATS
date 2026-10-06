import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Collect everything that counts as a bug during a page visit: uncaught
 * exceptions, console errors (CSP violations included), failed non-image
 * requests and 5xx responses. `allow` drops console messages a test causes on
 * purpose (e.g. the browser's "Failed to load resource" for a mocked 429).
 */
export function watch(page: Page, allow: RegExp[] = []) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (allow.some((re) => re.test(m.text()))) return;
    problems.push(`console: ${m.text()}`);
  });
  // Third-party game-asset images (arena/card art) can legitimately 404 for new
  // content; the app has onError fallbacks for them, so they are not app bugs.
  page.on('requestfailed', (r) => {
    if (r.resourceType() === 'image') return;
    problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
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
