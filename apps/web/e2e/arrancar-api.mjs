// Arranca la API real para las pruebas de extremo a extremo (T-011), sobre una base propia que se
// vacía, se migra y se siembra en cada ejecución. Lo lanza playwright.config.ts como servidor web.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '../../..');
const api = resolve(raiz, 'apps/api');
const desdeApi = createRequire(resolve(api, 'package.json'));

if (existsSync(resolve(raiz, '.env'))) process.loadEnvFile(resolve(raiz, '.env'));
const base = process.env.DATABASE_URL_PRUEBA;
if (!base) throw new Error('Falta DATABASE_URL_PRUEBA (ver .env.example)');

const url = new URL(base);
url.pathname = '/nexoai_e2e_prueba';
const urlE2e = url.toString();

// Crear la base si no existe y dejarla vacía. Solo bases *_prueba.
const { Client } = desdeApi('pg');
const admin = new Client({ connectionString: base });
await admin.connect();
const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'nexoai_e2e_prueba'");
if (existe.rowCount === 0) await admin.query('CREATE DATABASE nexoai_e2e_prueba');
await admin.end();

const e2e = new Client({ connectionString: urlE2e });
await e2e.connect();
await e2e.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
await e2e.end();

execSync('npx prisma migrate deploy', { cwd: api, env: { ...process.env, DATABASE_URL: urlE2e }, stdio: 'pipe' });

// Cuentas de e2e/cuentas.json, con el código de alta de la propia API.
const cuentas = JSON.parse(readFileSync(resolve(aqui, 'cuentas.json'), 'utf8'));
const { crearClientePrisma } = desdeApi('./dist/plataforma/prisma.js');
const { crearCuenta, crearOrganizacion } = desdeApi('./dist/identidad/alta-cuentas.js');
const prisma = crearClientePrisma(urlE2e);
const organizacionId = await crearOrganizacion(prisma, 'Organización de pruebas de extremo a extremo');
for (const [clave, cuenta] of Object.entries(cuentas)) {
  if (typeof cuenta !== 'object') continue;
  await crearCuenta(prisma, { organizacionId, ...cuenta }, cuentas.contrasenaTemporal);
  console.log(`[e2e] cuenta ${clave}: ${cuenta.correo}`);
}
await prisma.$disconnect();

// La API corre en este mismo proceso, así Playwright la detiene al terminar.
process.env.DATABASE_URL = urlE2e;
process.env.PUERTO = process.env.PUERTO_API_E2E ?? '3102';
process.env.JWT_SECRETO ??= 'solo-para-pruebas-e2e';
desdeApi('./dist/main.js');
