import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Variables del .env de la raíz; las ya definidas, como las de la integración continua, no se sobrescriben.
const entorno = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(entorno)) process.loadEnvFile(entorno);
// La aplicación bajo prueba usa la base de prueba, nunca la de desarrollo.
if (process.env.DATABASE_URL_PRUEBA) process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBA;
process.env.JWT_SECRETO ??= 'solo-para-pruebas';
// Clave de prueba de 32 bytes para cifrar tokens de Google (T-007). La real vive en .env.
process.env.TOKENS_CLAVE_CIFRADO ??= Buffer.alloc(32, 7).toString('base64');

// T-030: las pruebas nunca llaman a un proveedor de modelo real, aunque el .env tenga uno (Groq, H-AGT-13).
// La que necesita un modelo inyecta el simulado.
process.env.MODELO_PROVEEDOR = 'no-configurado';
delete process.env.MODELO_CLAVE;

// Las colas de BullMQ de las pruebas no se mezclan con las de un trabajador de desarrollo (T-014).
process.env.COLA_PREFIJO ??= 'nexoai-prueba';
process.env.REDIS_URL ??= 'redis://localhost:6379';

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
