import { expect, request as nuevaPeticion, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-083 · REQ-CUN02-25 a 31, 33 en el móvil. Las cuentas `actividad`, `actividadVacia` y `actividadSinCalendario`
// las siembra apps/web/e2e/arrancar-api.mjs en una zona en la que ahora es de día: hoy, dos compromisos terminados,
// uno en curso, uno por venir y uno cancelado; ayer, un taller y un cambio de zona. La zona se lee del perfil.
// Con CAPTURAS_ACTIVIDAD=<carpeta>, guarda las capturas de cada nivel (design/capturas/2026-11-07-actividad).

const API = `http://localhost:${process.env.PUERTO_API_E2E ?? '3103'}`;
const CAPTURAS = process.env.CAPTURAS_ACTIVIDAD;

async function zonaDe(correo: string): Promise<string> {
  const api = await nuevaPeticion.newContext();
  const ingreso = await api.post(`${API}/auth/ingreso`, { data: { correo, contrasena: cuentas.contrasenaTemporal } });
  const { tokenAcceso } = (await ingreso.json()) as { tokenAcceso: string };
  const perfil = (await (await api.get(`${API}/perfil`, { headers: { Authorization: `Bearer ${tokenAcceso}` } })).json()) as { zonaHoraria: string };
  await api.dispose();
  return perfil.zonaHoraria;
}

const fechaEn = (instante: Date, zona: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(instante);
const lunesDe = (fecha: string) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

async function entrarEnActividad(page: Page, correo: string) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  await page.getByRole('tab', { name: 'Actividad' }).click();
  await expect(page.getByRole('heading', { name: 'Actividad' })).toBeVisible();
}

async function capturar(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
}

test.describe('movil.actividad', () => {
  test('Día abre en hoy con lo terminado y el registro del asistente; se va a ayer y se vuelve', async ({ page }) => {
    await entrarEnActividad(page, cuentas.actividad.correo);
    await expect(page.getByText('Lo ocurrido hasta ahora. Lo que queda de hoy está en Agenda.')).toBeVisible();

    const compromisos = page.getByRole('list', { name: 'Compromisos' });
    await expect(compromisos.getByText('Revisión de sprint')).toBeVisible();
    await expect(compromisos.getByText('Café con Vasco')).toBeVisible();
    await expect(compromisos.getByText('1 h', { exact: true })).toBeVisible();
    await expect(compromisos.getByText('30 min', { exact: true })).toBeVisible();
    for (const fuera of ['Demo con el cliente', 'Llamada en curso', 'Clase de finanzas', 'Taller de diseño']) {
      await expect(compromisos.getByText(fuera, { exact: true })).toHaveCount(0);
    }

    const acciones = page.getByRole('list', { name: 'Lo que hizo el asistente' });
    await expect(acciones.getByText('Registró un compromiso')).toBeVisible();
    await expect(acciones.getByText('En la conversación')).toBeVisible();
    await expect(acciones.getByText('Canceló un compromiso')).toBeVisible();
    await expect(acciones.getByText('Desde la pantalla')).toBeVisible();
    await expect(page.getByText('Comité movido')).toHaveCount(0);

    // Solo muestra (REQ-CUN02-31) y no se pasa al futuro (H-JOR-08)
    await expect(page.getByRole('button', { name: /Cancelar|Mover|Deshacer|Registrar/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Día siguiente' })).toBeDisabled();
    await capturar(page, 'movil-390-dia');

    await page.getByRole('button', { name: 'Día anterior' }).click();
    await expect(page.getByRole('list', { name: 'Compromisos' }).getByText('Taller de diseño')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Lo que hizo el asistente' }).getByText('Cambió tu zona horaria')).toBeVisible();
    await page.getByRole('button', { name: 'Volver a hoy' }).click();
    await expect(page.getByText('Lo ocurrido hasta ahora. Lo que queda de hoy está en Agenda.')).toBeVisible();
  });

  test('Semana y Mes agrupan por día, solo los días con algo', async ({ page }) => {
    const zona = await zonaDe(cuentas.actividad.correo);
    const hoy = fechaEn(new Date(), zona);
    const ayerEnLaSemana = lunesDe(fechaEn(new Date(Date.now() - 25 * 3600_000), zona)) === lunesDe(hoy);

    await entrarEnActividad(page, cuentas.actividad.correo);
    await page.getByRole('tab', { name: 'Semana' }).click();
    await expect(page.getByText('Lo ocurrido hasta ahora.', { exact: true })).toBeVisible();
    const diasConCompromisos = page.getByRole('list', { name: /^Compromisos, / });
    await expect(diasConCompromisos).toHaveCount(ayerEnLaSemana ? 2 : 1);
    await expect(diasConCompromisos.last().getByText('Revisión de sprint')).toBeVisible();
    await expect(page.getByLabel(ayerEnLaSemana ? '3 elementos' : '2 elementos').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Semana siguiente' })).toBeDisabled();
    await capturar(page, 'movil-390-semana');

    await page.getByRole('tab', { name: 'Mes' }).click();
    await expect(page.getByRole('heading', { name: /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+ de \d{4}$/ })).toBeVisible();
    await expect(page.getByRole('list', { name: /^Lo que hizo el asistente, / }).last().getByText('Canceló un compromiso')).toBeVisible();
    await capturar(page, 'movil-390-mes');
    await page.getByRole('button', { name: 'Mes anterior' }).click();
    await expect(page.getByRole('button', { name: 'Este mes' })).toBeVisible();
  });

  test('sin nada, el vacío nombra el período en cada nivel', async ({ page }) => {
    await entrarEnActividad(page, cuentas.actividadVacia.correo);
    await expect(page.getByRole('heading', { name: 'Hoy todavía no ha pasado nada' })).toBeVisible();
    await capturar(page, 'movil-390-vacio');
    await page.getByRole('tab', { name: 'Semana' }).click();
    await expect(page.getByRole('heading', { name: 'Esta semana todavía no ha pasado nada' })).toBeVisible();
    await page.getByRole('tab', { name: 'Mes' }).click();
    await expect(page.getByRole('heading', { name: 'Este mes todavía no ha pasado nada' })).toBeVisible();
    await page.getByRole('button', { name: 'Mes anterior' }).click();
    await expect(page.getByRole('heading', { name: 'Ese mes no pasó nada' })).toBeVisible();
  });

  test('sin calendario, muestra el registro del asistente y dice dónde se conecta', async ({ page }) => {
    await entrarEnActividad(page, cuentas.actividadSinCalendario.correo);
    await expect(page.getByText('Tus compromisos aparecen aquí cuando conectes tu calendario. Conéctalo desde Ajustes en la web.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Lo que hizo el asistente' }).getByText('Cambió tu zona horaria')).toBeVisible();
    await capturar(page, 'movil-390-sin-calendario');
  });
});
