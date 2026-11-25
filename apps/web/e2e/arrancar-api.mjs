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
// T-062: `organizacion` lleva la cuenta a otra organización: «personal», una propia para ella sola; cualquier
// otro valor, una empresa con ese nombre. `lista`, con el primer ingreso hecho, en Lima.
const empresas = {};
for (const [clave, { organizacion, lista, ...cuenta }] of Object.entries(cuentas).filter(([, c]) => typeof c === 'object')) {
  const destino =
    organizacion === 'personal'
      ? await crearOrganizacion(prisma, `Personal de ${cuenta.correo}`, 'personal')
      : organizacion
        ? (empresas[organizacion] ??= await crearOrganizacion(prisma, organizacion, 'empresa'))
        : organizacionId;
  perfiles[clave] = (await crearCuenta(prisma, { organizacionId: destino, ...cuenta }, cuentas.contrasenaTemporal)).perfilId;
  if (lista) await prisma.perfilUsuario.update({ where: { id: perfiles[clave] }, data: { debeCambiarContrasena: false, zonaHoraria: 'America/Lima' } });
  console.log(`[e2e] cuenta ${clave}: ${cuenta.correo}`);
}
// T-062: dos equipos en Acme para la zona de empresa, uno sin responsable (REQ-ADM-32)
if (empresas.Acme && perfiles.acmeResponsable) {
  const acme = empresas.Acme;
  const ventas = await prisma.equipo.create({ data: { organizacionId: acme, nombre: 'Ventas' } });
  const soporte = await prisma.equipo.create({ data: { organizacionId: acme, nombre: 'Soporte' } });
  // Desde la fusión del 25 de noviembre de 2026, sobre `miembro_de_equipo` de CUN-05 (D-F1)
  await prisma.miembroDeEquipo.createMany({
    data: [
      { organizacionId: acme, equipoId: ventas.id, perfilId: perfiles.acmeResponsable, rolEnEquipo: 'responsable' },
      { organizacionId: acme, equipoId: ventas.id, perfilId: perfiles.acmeSuspender, rolEnEquipo: 'integrante' },
      { organizacionId: acme, equipoId: ventas.id, perfilId: perfiles.acmeRestablecer, rolEnEquipo: 'integrante' },
      { organizacionId: acme, equipoId: soporte.id, perfilId: perfiles.acmeRestablecer, rolEnEquipo: 'integrante' },
    ],
  });
}
// T-120 · REQ-CUN05-18: «Encargadas» y la disponibilidad piden plan efectivo Empresarial y algún equipo; la
// cuenta del armazón sigue viendo «Encargadas» porque está en uno
if (perfiles.armazon) {
  const diseno = await prisma.equipo.create({ data: { organizacionId, nombre: 'Diseño' } });
  await prisma.miembroDeEquipo.create({ data: { organizacionId, equipoId: diseno.id, perfilId: perfiles.armazon, rolEnEquipo: 'responsable' } });
}

// T-025: dos cuentas con el primer ingreso hecho, en Lima, y el calendario conectado al calendario
// simulado de la API. Una con compromisos hoy y otra sin ninguno.
process.env.CALENDARIO_SIMULADO = '1';
const { calendarioDeDemostracion: calendario } = desdeApi('./dist/integraciones/calendario/calendario-simulado.js');
// T-034: dos cuentas más para conversar con el asistente, que es el simulado con su guion
// T-050: las cuentas de «en espera» no conectan el calendario: desde que las tareas existen, lo que queda en
// espera en estas pruebas es un compromiso sin permiso de calendario
const SIN_CALENDARIO = ['asistenteEspera', 'capturaEspera', 'enEspera'];
for (const clave of ['agenda', 'agendaVacia', 'zona', 'asistente', 'asistenteEspera', 'captura', 'capturaEspera', 'historial', 'agendaSemana', 'enEspera', 'historialLargo', 'semanaLlena', 'tareas', 'tareasVacio'].filter((c) => perfiles[c])) {
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
// Pulido · REQ-CUN01-14: una semana llena, seis compromisos cada día de lunes al lunes siguiente, para ver que
// Semana abre con hoy a la vista aunque haya mucho antes. El de las 10:00 de mañana sirve también para el choque
// de horario en una línea (REQ-CUN01-05).
if (perfiles.semanaLlena) {
  const enDias = (dia, n) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * 24 * 3600_000).toISOString().slice(0, 10);
  const lunes = enDias(hoy, -((new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7));
  const bloques = [
    ['08:00', '09:00', 'Revisión de correo'],
    ['09:00', '10:00', 'Reunión de equipo'],
    ['10:00', '11:00', 'Llamada con proveedores'],
    ['11:00', '12:00', 'Bloque de foco'],
    ['14:00', '15:00', 'Seguimiento de proyecto'],
    ['16:00', '17:00', 'Cierre del día'],
  ];
  for (let n = 0; n <= 7; n++) {
    for (const [hora, fin, titulo] of bloques) {
      calendario.sembrar(perfiles.semanaLlena, { titulo, inicio: aLas(enDias(lunes, n), hora), fin: aLas(enDias(lunes, n), fin), zonaHoraria: 'America/Lima' });
    }
  }
}
// T-070, T-071 · REQ-CUN02-25 a 30, 33 (sección Actividad). La zona es una en la que ahora es de día (entre las
// 05:00 y las 19:59), para que «hace dos horas» caiga hoy y «hace 25 horas», ayer, a cualquier hora de la prueba.
// Las pruebas leen la zona del perfil. `actividad`: compromisos terminados hoy y ayer, uno en curso, uno por venir
// y uno cancelado; acciones ejecutadas en la conversación y desde la pantalla, y una descartada que no se ve.
// `actividadVacia`: nada. `actividadSinCalendario`: sin calendario, con una acción ejecutada.
const zonaDeDia = (() => {
  const hora = (zona) => Number(new Intl.DateTimeFormat('en-US', { timeZone: zona, hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  return ['Pacific/Kiritimati', 'Asia/Tokyo', 'Asia/Kolkata', 'Europe/Madrid', 'America/Lima', 'Pacific/Honolulu'].find((z) => hora(z) >= 5 && hora(z) <= 19);
})();
const haceHoras = (h) => new Date(Date.now() - h * 3600_000);
const reloj = (instante) => new Intl.DateTimeFormat('es', { timeZone: zonaDeDia, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instante);
async function ejecutada(perfilId, tipo, origen, ejecutadaEn, accion, datos, estado = 'ejecutada') {
  await prisma.operacion.create({
    data: {
      organizacionId,
      perfilId,
      tipo,
      origen,
      carga: {},
      vistaConfirmacion: { accion, datos, irreversible: null, confirmable: true, motivoNoConfirmable: null },
      estado,
      creadaEn: new Date(ejecutadaEn.getTime() - 60_000),
      confirmadaEn: estado === 'ejecutada' ? ejecutadaEn : null,
      ejecutadaEn: estado === 'ejecutada' ? ejecutadaEn : null,
    },
  });
}
for (const clave of ['actividad', 'actividadVacia', 'actividadSinCalendario'].filter((c) => perfiles[c])) {
  await prisma.perfilUsuario.update({ where: { id: perfiles[clave] }, data: { debeCambiarContrasena: false, zonaHoraria: zonaDeDia } });
  if (clave !== 'actividadSinCalendario') {
    await prisma.consentimientoIntegracion.create({ data: { organizacionId, perfilId: perfiles[clave], proveedor: 'google', alcance: 'calendario', estado: 'concedido' } });
  }
}
if (perfiles.actividad) {
  const perfilId = perfiles.actividad;
  const sembrar = (titulo, desde, hasta) => calendario.sembrar(perfilId, { titulo, inicio: haceHoras(desde), fin: haceHoras(hasta), zonaHoraria: zonaDeDia });
  sembrar('Revisión de sprint', 3, 2);
  sembrar('Café con Vasco', 1.5, 1);
  sembrar('Llamada en curso', 0.5, -0.5);
  sembrar('Clase de finanzas', -1, -2);
  sembrar('Taller de diseño', 26, 24.5);
  const dentista = new Date(Date.now() + 26 * 3600_000);
  calendario.sembrar(perfilId, { titulo: 'Dentista', inicio: dentista, fin: new Date(dentista.getTime() + 3600_000), zonaHoraria: zonaDeDia });
  // Cancelado en Google después de sincronizarse: en la réplica queda como cancelado (R-25)
  await prisma.eventoAgenda.create({
    data: {
      organizacionId,
      perfilId,
      googleCalendarioId: 'primary',
      googleEventoId: 'simulado-actividad-cancelado',
      etag: '"2"',
      titulo: 'Demo con el cliente',
      inicio: haceHoras(4),
      fin: haceHoras(3.5),
      zonaHoraria: zonaDeDia,
      todoElDia: false,
      esOrganizador: true,
      estado: 'cancelado',
      sincronizadoEn: new Date(),
    },
  });
  await ejecutada(perfilId, 'agenda.registrar', 'agente', haceHoras(0.8), 'Registrar este compromiso en tu calendario de Google', [
    { etiqueta: 'Título', valor: 'Dentista' },
    { etiqueta: 'Hora', valor: `${reloj(dentista)} – ${reloj(new Date(dentista.getTime() + 3600_000))}` },
  ]);
  await ejecutada(perfilId, 'agenda.cancelar', 'control_directo', haceHoras(0.7), 'Cancelar este compromiso', [{ etiqueta: 'Compromiso', valor: 'Demo con el cliente' }]);
  await ejecutada(perfilId, 'agenda.modificar', 'agente', haceHoras(0.6), 'Cambiar este compromiso en tu calendario de Google', [{ etiqueta: 'Título', valor: 'Comité movido' }], 'descartada');
  await ejecutada(perfilId, 'perfil.cambiar_zona_horaria', 'control_directo', haceHoras(25), 'Cambiar tu zona horaria', [{ etiqueta: 'Nueva', valor: `Hora de ${zonaDeDia.split('/').pop().replaceAll('_', ' ')}` }]);
}
if (perfiles.actividadSinCalendario) {
  await ejecutada(perfiles.actividadSinCalendario, 'perfil.cambiar_zona_horaria', 'control_directo', haceHoras(0.5), 'Cambiar tu zona horaria', [{ etiqueta: 'Nueva', valor: `Hora de ${zonaDeDia.split('/').pop().replaceAll('_', ' ')}` }]);
}
// T-052 a T-055 · 09-tareas-personales: tareas en las tres franjas, una hecha ayer y un compromiso hoy, para
// ver la sección Tareas y el grupo «Tareas para este día» de Hoy. Cada tarea con la Operación que la creó
// (AD-09), como si la hubiera confirmado la persona. La otra cuenta no tiene ninguna.
if (perfiles.tareas) {
  const perfilId = perfiles.tareas;
  const enDias = (n) => new Date(Date.parse(`${hoy}T12:00:00Z`) + n * 24 * 3600_000).toISOString().slice(0, 10);
  const fecha = (dia) => (dia ? new Date(`${dia}T00:00:00Z`) : null);
  calendario.sembrar(perfilId, { titulo: 'Dentista', inicio: aLas(hoy, '10:00'), fin: aLas(hoy, '11:00'), zonaHoraria: 'America/Lima' });
  const tareas = [
    { texto: 'Pagar el recibo', fecha: hoy, horaLimite: '23:00', creada: -2 },
    { texto: 'Renovar el DNI', fecha: enDias(-3), creada: -10 },
    { texto: 'Enviar la tesis', fecha: enDias(5), creada: -4 },
    { texto: 'Llamar al dentista', creada: -1 },
    { texto: 'Devolver el libro', creada: -5 },
    { texto: 'Presupuesto', deQuien: 'Juan', esperadaDesde: enDias(-6), fecha: enDias(7), creada: -6 },
    { texto: 'Comprar el regalo', creada: -3, hecha: -1 },
  ];
  for (const t of tareas) {
    const creadaEn = new Date(Date.now() + t.creada * 24 * 3600_000);
    const op = await prisma.operacion.create({
      data: {
        organizacionId,
        perfilId,
        tipo: 'tareas.registrar',
        origen: 'agente',
        carga: { texto: t.texto },
        vistaConfirmacion: { accion: 'Nueva tarea', datos: [], irreversible: null, confirmable: true, motivoNoConfirmable: null },
        estado: 'ejecutada',
        creadaEn,
        confirmadaEn: creadaEn,
        ejecutadaEn: creadaEn,
      },
    });
    await prisma.tareaPersonal.create({
      data: {
        organizacionId,
        perfilId,
        texto: t.texto,
        fecha: fecha(t.fecha),
        horaLimite: t.horaLimite ?? null,
        zonaHoraria: 'America/Lima',
        deQuien: t.deQuien ?? null,
        esperadaDesde: fecha(t.esperadaDesde),
        estado: t.hecha ? 'hecha' : 'pendiente',
        hechaEn: t.hecha ? new Date(Date.now() + t.hecha * 24 * 3600_000) : null,
        operacionOrigenId: op.id,
        creadaEn,
      },
    });
  }
}
// T-124 · specs/05-equipos/casos-de-prueba.md: el escenario de reuniones. «Proyecto Alfa» en Reuniones Demo, con
// lider de responsable, ana y beto autorizados y con calendario, carla sin autorizar y diego sin calendario;
// el administrador no está en el equipo, y pablo es de Plan Personal.
if (empresas['Reuniones Demo'] && perfiles.reunionesLider) {
  const demo = empresas['Reuniones Demo'];
  for (const clave of ['reunionesLider', 'reunionesAna', 'reunionesBeto', 'reunionesCarla']) {
    await prisma.consentimientoIntegracion.create({
      data: { organizacionId: demo, perfilId: perfiles[clave], proveedor: 'google', alcance: 'calendario', estado: 'concedido' },
    });
  }
  for (const [clave, inicio, fin, titulo] of [
    ['reunionesLider', '09:00', '10:00', 'Comité'],
    ['reunionesLider', '15:00', '16:00', 'Revisión'],
    ['reunionesAna', '10:00', '11:00', 'Cliente'],
    ['reunionesAna', '15:30', '17:00', 'Taller'],
    ['reunionesBeto', '08:00', '09:30', 'Desayuno'],
    ['reunionesBeto', '13:00', '14:00', 'Almuerzo'],
    ['reunionesCarla', '11:00', '12:00', 'Privado'],
  ]) {
    calendario.sembrar(perfiles[clave], { titulo, inicio: aLas(manana, inicio), fin: aLas(manana, fin), zonaHoraria: 'America/Lima' });
  }
  const alfa = await prisma.equipo.create({ data: { organizacionId: demo, nombre: 'Proyecto Alfa' } });
  for (const [clave, rolEnEquipo, estadoConsentimiento] of [
    ['reunionesLider', 'responsable', 'concedida'],
    ['reunionesAna', 'integrante', 'concedida'],
    ['reunionesBeto', 'integrante', 'concedida'],
    ['reunionesCarla', 'integrante', 'pendiente'],
    ['reunionesDiego', 'integrante', 'concedida'],
  ]) {
    await prisma.miembroDeEquipo.create({ data: { organizacionId: demo, equipoId: alfa.id, perfilId: perfiles[clave], rolEnEquipo, estadoConsentimiento } });
  }
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
