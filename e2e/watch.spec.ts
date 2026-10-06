import { test, expect } from '@playwright/test';
import { watch } from './support/helpers';

test('watch tolerates only the document 404, never a 404 on a script', async ({ page }) => {
  await page.route('http://watch.test/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('/missing.js')) return route.fulfill({ status: 404, contentType: 'text/javascript', body: '' });
    return route.fulfill({
      status: 404,
      contentType: 'text/html',
      body: '<!doctype html><title>x</title><script src="/missing.js"></script>',
    });
  });
  const problems = watch(page, [], { documentNotFound: true });
  await page.goto('http://watch.test/unknown');
  await page.waitForLoadState('load');
  await expect.poll(() => problems.length).toBeGreaterThan(0);
  // The script's 404 is reported (console message + aborted request); the document's own 404 is tolerated.
  expect(problems.filter((p) => p.startsWith('console: '))).toHaveLength(1);
  expect(problems.some((p) => p.includes('missing.js'))).toBe(true);
});

test('watch tolerates a 404 on third-party game art, never on our own images', async ({ page }) => {
  await page.route('https://api-assets.clashroyale.com/**', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }));
  await page.route('http://watch.test/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('/own.png')) return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>x</title><img src="https://api-assets.clashroyale.com/cards/300/1.png" alt=""><img src="/own.png" alt="">',
    });
  });
  const problems = watch(page);
  await page.goto('http://watch.test/page');
  await page.waitForLoadState('load');
  await expect.poll(() => problems.length).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/404/);
});
