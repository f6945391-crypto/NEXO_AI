import { defineConfig } from '@playwright/test';

const PUERTO_WEB = 3101;
const PUERTO_API = 3102;

// Dos servidores: la API real sobre su base de extremo a extremo, y la web apuntando a ella.
// En local usa el Chrome instalado; en la integración continua, el Chromium que instala Playwright.
export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  // Las pruebas comparten la base y el límite de intentos de la API: de una en una.
  workers: 1,
  // En modo desarrollo Next.js compila cada ruta en su primera visita, y en `verificar` corre a la vez que
  // las pruebas de la API y del móvil: 5 s no alcanzan.
  expect: { timeout: 20_000 },
  use: {
    baseURL: `http://localhost:${PUERTO_WEB}`,
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: [
    {
      command: 'node e2e/arrancar-api.mjs',
      url: `http://localhost:${PUERTO_API}/salud`,
      env: { PUERTO_API_E2E: String(PUERTO_API) },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx next dev -p ${PUERTO_WEB}`,
      url: `http://localhost:${PUERTO_WEB}/entrar`,
      env: { API_URL: `http://localhost:${PUERTO_API}`, NEXT_TELEMETRY_DISABLED: '1' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
