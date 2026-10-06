import { defineConfig } from '@playwright/test';

const base = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  use: { baseURL: base ?? 'http://127.0.0.1:4173' },
  webServer: base
    ? undefined
    : { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
