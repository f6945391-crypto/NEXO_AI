import { expect, request as nuevaPeticion, test, type APIRequestContext, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-044 · REQ-CUN01-14, 15 en el móvil. La cuenta es la clave `asistente` de cuentas.json porque
// apps/web/e2e/arrancar-api.mjs le deja hecho el primer ingreso, en Lima, con el calendario simulado
// conectado y sin compromisos. Los compromisos se registran antes por la API, con su Operación confirmada.

const API = `http://localhost:${process.env.PUERTO_API_E2E ?? '3103'}`;
const ZONA = 'America/Lima';

const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
const mediodia = (fecha: string) => new Date(`${fecha}T12:00:00Z`);
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const fechaLarga = (fecha: string) => mayuscula(new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(mediodia(fecha)));
const nombreDelMes = (fecha: string) => mayuscula(new Intl.DateTimeFormat('es', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(mediodia(fecha)));
// El día `dia` del mes siguiente: siempre a más de dos semanas de hoy, fuera de esta semana y de la próxima
function delMesSiguiente(dia: number): string {
  const d = mediodia(`${hoy.slice(0, 7)}-01`);
  d.setUTCMonth(d.getUTCMonth() + 1, dia);
  return d.toISOString().slice(0, 10);
}
const DIA_LLENO = delMesSiguiente(20);
const DIA_VACIO = delMesSiguiente(21);
const DIA_CON_UNO = delMesSiguiente(22);

// Registrar solo lo propone el asistente (R-42); cancelar es también un control directo
async function operar(api: APIRequestContext, token: string, tipo: string, carga: unknown) {
  const origen = tipo === 'agenda.cancelar' ? 'control_directo' : 'agente';
  const headers = { Authorization: `Bearer ${token}` };
  const propuesta = await api.post(`${API}/operaciones`, { headers, data: { tipo, carga, origen } });
  expect(propuesta.status()).toBe(201);
  const { id } = (await propuesta.json()) as { id: string };
  const hecha = await api.post(`${API}/operaciones/${id}/confirmar`, { headers });
  expect(hecha.status()).toBe(200);
}

test.beforeAll(async () => {
  const api = await nuevaPeticion.newContext();
  const ingreso = await api.post(`${API}/auth/ingreso`, { data: { correo: cuentas.asistente.correo, contrasena: cuentas.contrasenaTemporal } });
  expect(ingreso.status()).toBe(200);
  const { tokenAcceso: token } = (await ingreso.json()) as { tokenAcceso: string };
  const desde = encodeURIComponent(`${hoy}T00:00:00-05:00`);
  const hasta = encodeURIComponent(`${hoy}T23:59:59-05:00`);
  const deHoy = async () => (await (await api.get(`${API}/agenda/eventos?desde=${desde}&hasta=${hasta}`, { headers: { Authorization: `Bearer ${token}` } })).json()) as { id: string; titulo: string }[];
  // Si un fallo reinicia el proceso de pruebas, beforeAll vuelve a correr: lo sembrado ya está
  if ((await deHoy()).length > 0) return api.dispose();
  const registrar = (titulo: string, fecha: string, inicio: string, fin: string) =>
    operar(api, token, 'agenda.registrar', { titulo, inicio: `${fecha}T${inicio}:00-05:00`, fin: `${fecha}T${fin}:00-05:00`, zonaHoraria: ZONA });

  await registrar('Desayuno de equipo', hoy, '07:00', '07:30');
  await registrar('Demostración al cliente', hoy, '18:00', '19:00');
  await registrar('Taller de diseño', DIA_LLENO, '09:00', '10:00');
  await registrar('Almuerzo con Ana', DIA_LLENO, '13:00', '14:00');
  await registrar('Revisión de presupuesto', DIA_LLENO, '16:00', '17:00');
  await registrar('Clase de inglés', DIA_CON_UNO, '19:00', '20:00');

  // Uno cancelado, para ver que se marca como en Hoy y que no cuenta en el mes
  const demostracion = (await deHoy()).find((e) => e.titulo === 'Demostración al cliente');
  expect(demostracion).toBeTruthy();
  await operar(api, token, 'agenda.cancelar', { eventoId: demostracion!.id });
  await api.dispose();
});

async function entrar(page: Page, correo = cuentas.asistente.correo) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

const DIA_DE_LA_SEMANA = /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo),? \d{1,2} de \p{L}+$/u;

test.describe('movil.agenda-semana-y-mes', () => {
  test('Semana muestra los siete días de lunes a domingo, hoy destacado, los vacíos con «Sin compromisos», y se pasa de semana', async ({ page }) => {
    await entrar(page);
    await page.getByRole('tab', { name: 'Semana' }).click();

    const dias = page.getByRole('heading', { name: DIA_DE_LA_SEMANA });
    await expect(dias).toHaveCount(7);
    await expect(dias.first()).toHaveText(/^Lunes/);
    await expect(dias.last()).toHaveText(/^Domingo/);
    await expect(page.getByText('Hora de Lima (GMT-5)')).toBeVisible();

    const deHoy = page.getByLabel(`Hoy, ${fechaLarga(hoy).toLowerCase()}`);
    await expect(deHoy.getByRole('button', { name: 'Desayuno de equipo, 07:00 – 07:30' })).toBeVisible();
    await expect(deHoy.getByRole('button', { name: 'Demostración al cliente, 18:00 – 19:00' })).toBeVisible();
    await expect(deHoy.getByText('Cancelado', { exact: true })).toBeVisible();
    await expect(page.getByText('Sin compromisos')).toHaveCount(6);

    await page.getByRole('button', { name: 'Semana siguiente' }).click();
    await expect(page.getByRole('heading', { name: DIA_DE_LA_SEMANA })).toHaveCount(7);
    await expect(page.getByLabel(/^Hoy, /)).toHaveCount(0);
    await expect(page.getByText('Sin compromisos')).toHaveCount(7);

    await page.getByRole('button', { name: 'Semana anterior' }).click();
    await expect(page.getByLabel(`Hoy, ${fechaLarga(hoy).toLowerCase()}`)).toBeVisible();
  });

  // Pulido · la cuenta semanaLlena tiene seis compromisos cada día de esta semana (arrancar-api.mjs). Sin
  // desplazar nada, el día de hoy tiene que estar a la vista. Si hoy es lunes, ya lo está de entrada.
  test('al entrar en Semana, el día de hoy queda a la vista aunque haya muchos compromisos antes', async ({ page }) => {
    await entrar(page, cuentas.semanaLlena.correo);
    await page.getByRole('tab', { name: 'Semana' }).click();
    const deHoy = page.getByLabel(`Hoy, ${fechaLarga(hoy).toLowerCase()}`);
    await expect(deHoy.getByRole('button', { name: 'Revisión de correo, 08:00 – 09:00' })).toHaveCount(1);
    await expect(deHoy.getByRole('heading', { name: fechaLarga(hoy) })).toBeInViewport();
    await expect(deHoy.getByRole('button', { name: 'Revisión de correo, 08:00 – 09:00' })).toBeInViewport();
  });

  test('Mes muestra la rejilla con un punto por cada dos compromisos, se pasa de mes, y tocar un día lo abre en Hoy con «Volver a hoy»', async ({ page }) => {
    await entrar(page);
    await page.getByRole('tab', { name: 'Mes' }).click();
    await expect(page.getByRole('heading', { name: nombreDelMes(hoy) })).toBeVisible();
    // El cancelado no cuenta: hoy queda con un compromiso
    const celdaDeHoy = page.getByRole('button', { name: `${fechaLarga(hoy)}, 1 compromiso` });
    await expect(celdaDeHoy.getByTestId('punto')).toHaveCount(1);

    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await expect(page.getByRole('heading', { name: nombreDelMes(DIA_LLENO) })).toBeVisible();
    await expect(page.getByRole('button', { name: `${fechaLarga(DIA_LLENO)}, 3 compromisos` }).getByTestId('punto')).toHaveCount(2);
    await expect(page.getByRole('button', { name: `${fechaLarga(DIA_CON_UNO)}, 1 compromiso` }).getByTestId('punto')).toHaveCount(1);
    await expect(page.getByRole('button', { name: `${fechaLarga(DIA_VACIO)}, sin compromisos` }).getByTestId('punto')).toHaveCount(0);

    await page.getByRole('button', { name: `${fechaLarga(DIA_LLENO)}, 3 compromisos` }).click();
    await expect(page.getByRole('heading', { name: fechaLarga(DIA_LLENO) })).toBeVisible();
    for (const nombre of ['Taller de diseño, 09:00 – 10:00', 'Almuerzo con Ana, 13:00 – 14:00', 'Revisión de presupuesto, 16:00 – 17:00']) {
      await expect(page.getByRole('button', { name: nombre })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Volver a hoy' }).click();
    await expect(page.getByRole('button', { name: 'Desayuno de equipo, 07:00 – 07:30' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Volver a hoy' })).toHaveCount(0);
  });
});
