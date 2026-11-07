import { expect, request as nuevaPeticion, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-082 · REQ-CUN02-25 a 31, 33. Las cuentas `actividad`, `actividadVacia` y `actividadSinCalendario` las siembra
// e2e/arrancar-api.mjs en una zona en la que ahora es de día: hoy hay compromisos terminados, uno en curso, uno
// por venir y uno cancelado; ayer, un taller y un cambio de zona. La zona se lee del perfil.
// Con CAPTURAS_ACTIVIDAD=<carpeta>, guarda las capturas de cada nivel (design/capturas/2026-11-07-actividad).

// El puerto de la API lo fija la configuración de Playwright, que es la que la arranca
if (!process.env.PUERTO_API_E2E) throw new Error('Falta PUERTO_API_E2E: lo define playwright.config.ts');
const API = `http://localhost:${process.env.PUERTO_API_E2E}`;
const CAPTURAS = process.env.CAPTURAS_ACTIVIDAD;

async function zonaDe(correo: string): Promise<string> {
  const api = await nuevaPeticion.newContext();
  const ingreso = await api.post(`${API}/auth/ingreso`, { data: { correo, contrasena: cuentas.contrasenaTemporal } });
  const { tokenAcceso } = (await ingreso.json()) as { tokenAcceso: string };
  const perfil = (await (await api.get(`${API}/perfil`, { headers: { Authorization: `Bearer ${tokenAcceso}` } })).json()) as { zonaHoraria: string };
  await api.dispose();
  return perfil.zonaHoraria;
}

const lunesDe = (fecha: string) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const fechaEn = (instante: Date, zona: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zona }).format(instante);

async function entrarEnActividad(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
  await page.getByRole('button', { name: 'Actividad' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Actividad' })).toBeVisible();
}

async function capturar(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
}

test.describe('web.actividad', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Día abre en hoy con lo terminado, el registro del asistente y nada que hacer', async ({ page }) => {
    await entrarEnActividad(page, cuentas.actividad.correo);
    await expect(page.getByRole('tab', { name: 'Día' })).toHaveAttribute('aria-selected', 'true');
    const seccion = page.getByRole('region', { name: /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+,? \d+ de / });
    await expect(seccion.getByText('Lo ocurrido hasta ahora. Lo que queda de hoy está en Agenda.')).toBeVisible();
    await expect(seccion.getByText(/^Hora de .+ \(GMT[+-]?\d*(:\d{2})?\)$/)).toBeVisible();

    // REQ-CUN02-26: solo lo terminado, sin el cancelado, el en curso ni el que viene
    const compromisos = seccion.getByRole('list', { name: 'Compromisos' }).getByRole('listitem');
    await expect(compromisos.locator('.compromiso__titulo')).toHaveText(['Revisión de sprint', 'Café con Vasco']);
    await expect(compromisos.first().locator('.compromiso__horario')).toHaveText(/^\d{2}:\d{2} – \d{2}:\d{2}$/);
    await expect(compromisos.first().getByText('1 h', { exact: true })).toBeVisible();
    await expect(compromisos.nth(1).getByText('30 min', { exact: true })).toBeVisible();
    await expect(seccion.getByRole('heading', { name: /^Compromisos/ })).toContainText('2');
    for (const fuera of ['Demo con el cliente', 'Llamada en curso', 'Clase de finanzas', 'Taller de diseño']) {
      await expect(seccion.locator('.compromiso__titulo', { hasText: fuera })).toHaveCount(0);
    }

    // REQ-CUN02-27: lo ejecutado, con su hora, sus datos y desde dónde; lo descartado no
    const acciones = seccion.getByRole('list', { name: 'Lo que hizo el asistente' }).getByRole('listitem');
    await expect(acciones.locator('.compromiso__titulo')).toHaveText(['Registró un compromiso', 'Canceló un compromiso']);
    await expect(acciones.first()).toContainText('Dentista');
    await expect(acciones.first()).toContainText('En la conversación');
    await expect(acciones.nth(1)).toContainText('Demo con el cliente');
    await expect(acciones.nth(1)).toContainText('Desde la pantalla');
    await expect(seccion.getByText('Comité movido')).toHaveCount(0);

    // REQ-CUN02-31: solo muestra
    await expect(seccion.getByRole('button', { name: /Cancelar|Mover|Deshacer|Registrar/ })).toHaveCount(0);
    // H-JOR-08: no se pasa al futuro
    await expect(seccion.getByRole('button', { name: 'Día siguiente' })).toBeDisabled();
    await capturar(page, 'web-1440-dia');

    // REQ-CUN02-25: ayer, y vuelta a hoy
    await seccion.getByRole('button', { name: 'Día anterior' }).click();
    const ayer = page.getByRole('region', { name: /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+,? \d+ de / });
    await expect(ayer.getByRole('list', { name: 'Compromisos' }).locator('.compromiso__titulo')).toHaveText(['Taller de diseño']);
    await expect(ayer.getByRole('list', { name: 'Lo que hizo el asistente' }).locator('.compromiso__titulo')).toHaveText(['Cambió tu zona horaria']);
    await expect(ayer.getByText('Lo ocurrido hasta ahora', { exact: false })).toHaveCount(0);
    await ayer.getByRole('button', { name: 'Volver a hoy' }).click();
    await expect(page.getByText('Lo ocurrido hasta ahora. Lo que queda de hoy está en Agenda.')).toBeVisible();
  });

  test('Semana y Mes agrupan por día, solo los días con algo, con la cantidad de cada bloque', async ({ page }) => {
    const zona = await zonaDe(cuentas.actividad.correo);
    const hoy = fechaEn(new Date(), zona);
    const ayer = fechaEn(new Date(Date.now() - 25 * 3600_000), zona);
    const ayerEnLaSemana = lunesDe(ayer) === lunesDe(hoy);
    const ayerEnElMes = ayer.slice(0, 7) === hoy.slice(0, 7);

    await entrarEnActividad(page, cuentas.actividad.correo);
    await page.getByRole('tab', { name: 'Semana' }).click();
    const semana = page.getByRole('region', { name: /^Semana del / });
    await expect(semana).toBeVisible();
    await expect(semana.getByRole('heading', { name: /^Compromisos/ })).toContainText(ayerEnLaSemana ? '3' : '2');
    await expect(semana.getByRole('heading', { name: /^Lo que hizo el asistente/ })).toContainText(ayerEnLaSemana ? '3' : '2');
    // Un recuadro por día con algo: hoy, y ayer si cae en esta semana
    const dias = semana.getByRole('region', { name: /^Compromisos, / });
    await expect(dias).toHaveCount(ayerEnLaSemana ? 2 : 1);
    await expect(dias.last().locator('.compromiso__titulo')).toHaveText(['Revisión de sprint', 'Café con Vasco']);
    await expect(semana.getByRole('button', { name: 'Semana siguiente' })).toBeDisabled();
    await capturar(page, 'web-1440-semana');

    await page.getByRole('tab', { name: 'Mes' }).click();
    const mes = page.getByRole('region', { name: /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+ de \d{4}$/ });
    await expect(mes).toBeVisible();
    await expect(mes.getByRole('heading', { name: /^Compromisos/ })).toContainText(ayerEnElMes ? '3' : '2');
    await expect(mes.getByRole('button', { name: 'Este mes' })).toHaveCount(0);
    await capturar(page, 'web-1440-mes');

    // El mes anterior y la vuelta; al cambiar de nivel se vuelve al período de hoy
    await mes.getByRole('button', { name: 'Mes anterior' }).click();
    await expect(page.getByRole('button', { name: 'Este mes' })).toBeVisible();
    await page.getByRole('tab', { name: 'Día' }).click();
    await expect(page.getByText('Lo ocurrido hasta ahora. Lo que queda de hoy está en Agenda.')).toBeVisible();
  });

  test('sin nada en el período, el vacío nombra el período en cada nivel y no ofrece crear nada', async ({ page }) => {
    await entrarEnActividad(page, cuentas.actividadVacia.correo);
    await expect(page.getByRole('heading', { name: 'Hoy todavía no ha pasado nada' })).toBeVisible();
    await expect(page.locator('.lienzo').getByRole('button', { name: /Pedírselo|Crear|Agendar/ })).toHaveCount(0);
    await capturar(page, 'web-1440-vacio');
    await page.getByRole('tab', { name: 'Semana' }).click();
    await expect(page.getByRole('heading', { name: 'Esta semana todavía no ha pasado nada' })).toBeVisible();
    await page.getByRole('tab', { name: 'Mes' }).click();
    await expect(page.getByRole('heading', { name: 'Este mes todavía no ha pasado nada' })).toBeVisible();
    await page.getByRole('button', { name: 'Mes anterior' }).click();
    await expect(page.getByRole('heading', { name: 'Ese mes no pasó nada' })).toBeVisible();
  });

  test('sin calendario conectado, muestra el registro del asistente y explica dónde van los compromisos', async ({ page }) => {
    await entrarEnActividad(page, cuentas.actividadSinCalendario.correo);
    await expect(page.getByText('Tus compromisos aparecen aquí cuando conectes tu calendario.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Lo que hizo el asistente' }).locator('.compromiso__titulo')).toHaveText(['Cambió tu zona horaria']);
    // No es un error: no hay aviso de que algo falló
    await expect(page.getByText(/No pudimos/)).toHaveCount(0);
    await capturar(page, 'web-1440-sin-calendario');
    await page.getByRole('button', { name: 'Conectar mi calendario' }).click();
    await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible();
  });
});
