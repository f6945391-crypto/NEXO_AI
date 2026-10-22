import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Variables del .env de la raíz; las ya definidas, como las de la integración continua, no se sobrescriben.
const entorno = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(entorno)) process.loadEnvFile(entorno);

// SWC compila los decoradores con sus metadatos, que NestJS necesita para inyectar dependencias.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    globalSetup: ['test/preparar-base.ts'],
    // Las pruebas comparten la base de prueba: se ejecutan de una en una para no pisarse.
    fileParallelism: false,
  },
});
