import { defineConfig } from '@playwright/test';

const PUERTO = 3201;

// Pruebas de extremo a extremo del móvil sobre Expo web (T-020): la misma herramienta que la web, y
// corre en la integración continua sin emulador. La app nativa se revisa a mano con Expo Go.
export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  workers: 1,
  expect: { timeout: 20_000 },
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: process.env.CI ? undefined : 'chrome',
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: `npx expo start --web --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    env: { EXPO_NO_TELEMETRY: '1', CI: '1' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
