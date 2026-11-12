// Arranca la API real para las pruebas de extremo a extremo (T-011), sobre una base propia que se
// vacía, se migra y se siembra en cada ejecución. Lo lanza playwright.config.ts como servidor web.
// T-028: el móvil lo usa también, con otra base, otro puerto y otras cuentas (BASE_E2E, PUERTO_API_E2E,
// CUENTAS_E2E), para que las pruebas de la web y del móvil no se pisen.
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

const nombreBase = process.env.BASE_E2E ?? 'nexoai_e2e_prueba';
if (!/^[a-z0-9_]+_prueba$/.test(nombreBase)) throw new Error(`BASE_E2E tiene que terminar en _prueba: ${nombreBase}`);
const url = new URL(base);
url.pathname = `/${nombreBase}`;
const urlE2e = url.toString();

// Crear la base si no existe y dejarla vacía. Solo bases *_prueba.
const { Client } = desdeApi('pg');
const admin = new Client({ connectionString: base });
await admin.connect();
const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombreBase]);
if (existe.rowCount === 0) await admin.query(`CREATE DATABASE ${nombreBase}`);
await admin.end();

const e2e = new Client({ connectionString: urlE2e });
await e2e.connect();
await e2e.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
await e2e.end();

execSync('npx prisma migrate deploy', { cwd: api, env: { ...process.env, DATABASE_URL: urlE2e }, stdio: 'pipe' });

// Cuentas de e2e/cuentas.json, con el código de alta de la propia API.
const cuentas = JSON.parse(readFileSync(process.env.CUENTAS_E2E ?? resolve(aqui, 'cuentas.json'), 'utf8'));
const { crearClientePrisma } = desdeApi('./dist/plataforma/prisma.js');
const { crearCuenta, crearOrganizacion } = desdeApi('./dist/identidad/alta-cuentas.js');
const prisma = crearClientePrisma(urlE2e);
const organizacionId = await crearOrganizacion(prisma, 'Organización de pruebas de extremo a extremo');
const perfiles = {};
for (const [clave, cuenta] of Object.entries(cuentas)) {
  if (typeof cuenta !== 'object') continue;
  perfiles[clave] = (await crearCuenta(prisma, { organizacionId, ...cuenta }, cuentas.contrasenaTemporal)).perfilId;
  console.log(`[e2e] cuenta ${clave}: ${cuenta.correo}`);
}

// T-025: dos cuentas con el primer ingreso hecho, en Lima, y el calendario conectado al calendario
// simulado de la API. Una con compromisos hoy y otra sin ninguno.
process.env.CALENDARIO_SIMULADO = '1';
const { calendarioDeDemostracion: calendario } = desdeApi('./dist/integraciones/calendario/calendario-simulado.js');
// T-034: dos cuentas más para conversar con el asistente, que es el simulado con su guion
// T-051: las cuentas de «en espera» ya no conectan el calendario. Antes lo que esperaba era una tarea («las
// tareas llegan en una próxima versión»); ahora las tareas se crean de verdad, así que lo único que queda en
// espera es lo que necesita el calendario de Google y no lo tiene (REQ-CUN01-08, REQ-CAP-23).
const PRIMER_INGRESO_HECHO = ['agenda', 'agendaVacia', 'zona', 'asistente', 'asistenteEspera', 'captura', 'capturaEspera', 'historial', 'agendaSemana', 'enEspera', 'historialLargo', 'tareas'];
const SIN_CALENDARIO = ['asistenteEspera', 'capturaEspera', 'enEspera'];
for (const clave of PRIMER_INGRESO_HECHO.filter((c) => perfiles[c])) {
  const perfilId = perfiles[clave];
  await prisma.perfilUsuario.update({ where: { id: perfilId }, data: { debeCambiarContrasena: false, zonaHoraria: 'America/Lima' } });
  if (SIN_CALENDARIO.includes(clave)) continue;
  await prisma.consentimientoIntegracion.create({
    data: { organizacionId, perfilId, proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
  });
}
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
const manana = new Date(Date.parse(`${hoy}T12:00:00Z`) + 24 * 3600_000).toISOString().slice(0, 10);
const aLas = (dia, hora) => new Date(`${dia}T${hora}:00-05:00`);
for (const evento of [
  { titulo: 'Revisión de sprint', inicio: aLas(hoy, '09:00'), fin: aLas(hoy, '10:00'), zonaHoraria: 'America/Lima' },
  { titulo: 'Llamada con el equipo de Madrid', inicio: aLas(hoy, '11:00'), fin: aLas(hoy, '11:30'), zonaHoraria: 'Europe/Madrid' },
  { titulo: 'Comité de arquitectura', inicio: aLas(hoy, '15:00'), fin: aLas(hoy, '16:00'), zonaHoraria: 'America/Lima', esOrganizador: false },
  { titulo: 'Aniversario de la empresa', inicio: aLas(hoy, '00:00'), fin: aLas(manana, '00:00'), zonaHoraria: 'America/Lima', todoElDia: true },
  { titulo: 'Esto es mañana', inicio: aLas(manana, '09:00'), fin: aLas(manana, '10:00'), zonaHoraria: 'America/Lima' },
]) {
  if (perfiles.agenda) calendario.sembrar(perfiles.agenda, evento);
}
// T-027: un compromiso largo que cae «hoy» tanto en Lima como en Tokio, para ver la agenda en las dos zonas
if (perfiles.zona) calendario.sembrar(perfiles.zona, {
  titulo: 'Guardia de soporte',
  inicio: new Date(Date.now() - 3600_000),
  fin: new Date(Date.now() + 30 * 3600_000),
  zonaHoraria: 'America/Lima',
});
// T-044 · REQ-CUN01-14, REQ-CUN01-15: una semana con días llenos, uno vacío y un cancelado, y algo la semana
// siguiente. Las fechas cuentan desde el lunes de esta semana en Lima, para que la semana y el mes las incluyan.
if (perfiles.agendaSemana) {
  const enDias = (dia, n) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * 24 * 3600_000).toISOString().slice(0, 10);
  const lunes = enDias(hoy, -((new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7));
  const sembrar = (n, hora, horaFin, titulo) =>
    calendario.sembrar(perfiles.agendaSemana, { titulo, inicio: aLas(enDias(lunes, n), hora), fin: aLas(enDias(lunes, n), horaFin), zonaHoraria: 'America/Lima' });
  sembrar(0, '09:00', '10:00', 'Planificación semanal');
  for (const [hora, fin, titulo] of [['09:00', '10:00', 'Revisión de diseño'], ['11:00', '12:00', 'Almuerzo con Vasco'], ['16:00', '17:00', 'Clase de finanzas']]) sembrar(2, hora, fin, titulo);
  for (const [hora, fin] of [['08:00', '09:00'], ['10:00', '11:00'], ['12:00', '13:00'], ['14:00', '15:00'], ['17:00', '18:00']]) sembrar(3, hora, fin, `Entrevista de las ${hora}`);
  // Uno que se canceló en Google después de sincronizarse: en la réplica queda como cancelado (R-25)
  await prisma.eventoAgenda.create({
    data: {
      organizacionId,
      perfilId: perfiles.agendaSemana,
      googleCalendarioId: 'primary',
      googleEventoId: 'simulado-cancelado-e2e',
      etag: '"2"',
      titulo: 'Demo con el cliente',
      inicio: aLas(enDias(lunes, 4), '15:00'),
      fin: aLas(enDias(lunes, 4), '16:00'),
      zonaHoraria: 'America/Lima',
      todoElDia: false,
      esOrganizador: true,
      estado: 'cancelado',
      sincronizadoEn: new Date(),
    },
  });
  sembrar(8, '10:00', '11:00', 'Revisión trimestral');
}
await prisma.$disconnect();

// La API corre en este mismo proceso, así Playwright la detiene al terminar.
process.env.DATABASE_URL = urlE2e;
process.env.PUERTO = process.env.PUERTO_API_E2E ?? '3102';
process.env.JWT_SECRETO ??= 'solo-para-pruebas-e2e';
// Google: si no hay credenciales (integración continua), unas ficticias. Las pruebas interceptan a Google.
process.env.GOOGLE_CLIENT_ID ||= 'prueba-e2e.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET ||= 'prueba-e2e';
process.env.GOOGLE_REDIRECT_URI ||= `http://localhost:${process.env.PUERTO}/integraciones/google/retorno`;
process.env.TOKENS_CLAVE_CIFRADO ||= Buffer.alloc(32, 7).toString('base64');
// T-030: el asistente de las pruebas es el simulado con su guion, nunca el proveedor real del .env (H-AGT-13)
process.env.MODELO_PROVEEDOR = 'simulado';
delete process.env.MODELO_CLAVE;
desdeApi('./dist/main.js');
