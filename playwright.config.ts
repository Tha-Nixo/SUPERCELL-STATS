import { defineConfig } from '@playwright/test';

const base = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  // Battle times render in the browser's time zone: pin it so assertions and screenshots are stable.
  use: { baseURL: base ?? 'http://127.0.0.1:4173', timezoneId: 'UTC', locale: 'en-US' },
  webServer: base
    ? undefined
    : { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
