import { defineConfig } from '@playwright/test';

const PUERTO = 3101;

// En local usa el Chrome instalado; en la integración continua, el Chromium que instala Playwright.
export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    command: `npx next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
