import { defineConfig } from '@playwright/test';

const PUERTO = 3201;
const PUERTO_API = 3103;

// Pruebas de extremo a extremo del móvil sobre Expo web (T-020): la misma herramienta que la web, y
// corre en la integración continua sin emulador. La app nativa se revisa a mano con Expo Go.
// T-028: con su propia API, sobre otra base y en otro puerto que las de la web, para que en `verificar`
// no se pisen (specs/06-acceso/plan.md §5.6).
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
  webServer: [
    {
      command: 'node ../web/e2e/arrancar-api.mjs',
      url: `http://localhost:${PUERTO_API}/salud`,
      env: {
        PUERTO_API_E2E: String(PUERTO_API),
        BASE_E2E: 'nexoai_e2e_movil_prueba',
        // Relativa a esta carpeta, donde Playwright arranca el servidor
        CUENTAS_E2E: 'e2e/cuentas.json',
        CORS_ORIGENES: `http://localhost:${PUERTO}`,
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx expo start --web --port ${PUERTO}`,
      url: `http://localhost:${PUERTO}`,
      env: { EXPO_NO_TELEMETRY: '1', CI: '1', EXPO_PUBLIC_API_URL: `http://localhost:${PUERTO_API}` },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
