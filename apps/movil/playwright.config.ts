import { defineConfig } from '@playwright/test';

const PUERTO = 3201;
const PUERTO_API = 3103;
// Las pruebas que hablan con la API leen su puerto de aquí: la configuración se carga también en cada
// proceso de pruebas, y así no hace falta exportarlo a mano ni puede apuntar a otra API.
process.env.PUERTO_API_E2E = String(PUERTO_API);

// Pruebas de extremo a extremo del móvil sobre Expo web (T-020): la misma herramienta que la web, y
// corre en la integración continua sin emulador. La app nativa se revisa a mano con Expo Go.
// T-028: con su propia API, sobre otra base y en otro puerto que las de la web, para que en `verificar`
// no se pisen (specs/06-acceso/plan.md §5.6).
export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  workers: 1,
  timeout: process.env.CI ? 90_000 : 30_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: process.env.CI ? undefined : 'chrome',
    viewport: { width: 390, height: 844 },
    // T-156 · REQ-CAP-27: un micrófono falso que Chromium da sin preguntar, para probar el dictado
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
    permissions: ['microphone'],
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
