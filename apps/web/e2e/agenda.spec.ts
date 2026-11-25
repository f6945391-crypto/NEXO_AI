import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-025 · REQ-CUN01-10, REQ-CUN01-12. La API de estas pruebas usa el calendario simulado, sembrado en
// e2e/arrancar-api.mjs: las dos cuentas viven en Lima y tienen el calendario conectado.

async function entrar(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

test.describe('agenda.horas-con-zona-horaria', () => {
  test.use({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Tokyo' });

  test('Hoy muestra los compromisos del día en la zona de la persona, y dice cuál es', async ({ page }) => {
    // El navegador está en Tokio a propósito: las horas salen en la zona del perfil, no en la del equipo.
    await entrar(page, cuentas.agenda.correo);
    const dia = page.getByRole('region', { name: /^[a-záéíóúñ]+, \d+ de/i });
    await expect(dia.getByText('Hora de Lima (GMT-5)')).toBeVisible();

    const compromisos = dia.getByRole('list', { name: 'Compromisos de hoy' }).getByRole('listitem');
    await expect(compromisos.locator('.compromiso__titulo')).toHaveText([
      'Aniversario de la empresa',
      'Revisión de sprint',
      'Llamada con el equipo de Madrid',
      'Comité de arquitecturaInvitado',
    ]);
    await expect(compromisos.locator('.compromiso__horario')).toHaveText(['Todo el día', '09:00 – 10:00', '11:00 – 11:30', '15:00 – 16:00']);
    // Un evento creado en otra zona dice también su hora allí
    await expect(compromisos.nth(2).locator('.compromiso__zona')).toHaveText(/^Hora de Madrid: \d{2}:00 – \d{2}:30$/);
    await expect(dia.getByText('Esto es mañana')).toHaveCount(0);
  });
});

test.describe('agenda.estado-vacio-abre-captura', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sin compromisos hoy, la acción lleva a pedírselo al asistente y no hay formulario', async ({ page }) => {
    await entrar(page, cuentas.agendaVacia.correo);
    await expect(page.getByRole('heading', { name: 'Hoy no tienes compromisos' })).toBeVisible();

    // Con el lienzo ampliado la conversación no se ve: la acción la vuelve a mostrar.
    await page.getByRole('button', { name: 'Ampliar' }).click();
    await expect(page.getByLabel('Pídele algo al asistente')).toHaveCount(0);
    await page.getByRole('button', { name: 'Pedírselo al asistente' }).click();
    await expect(page.getByLabel('Pídele algo al asistente')).toBeFocused();

    // R-42: ningún formulario de creación en el lienzo
    await expect(page.locator('main form')).toHaveCount(0);
    await expect(page.locator('main input')).toHaveCount(0);
  });
});

// T-044 · REQ-CUN01-14, REQ-CUN01-15. La cuenta agendaSemana tiene compromisos sembrados desde el lunes de
// esta semana en Lima (e2e/arrancar-api.mjs): uno el lunes, tres el miércoles, cinco el jueves, uno
// cancelado el viernes y uno el martes de la semana siguiente.
const hoyEnLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
const enDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * 24 * 3600_000).toISOString().slice(0, 10);
const lunes = enDias(hoyEnLima, -((new Date(`${hoyEnLima}T12:00:00Z`).getUTCDay() + 6) % 7));
const nombreDe = (dia: string) =>
  new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${dia}T12:00:00Z`));
const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const nombreDeMes = (dia: string) => mayuscula(new Intl.DateTimeFormat('es', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${dia}T12:00:00Z`)));
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('web.agenda-semana-y-mes', () => {
  // Tokio a propósito: los días se cortan en la zona del perfil (Lima), no en la del navegador
  test.use({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Tokyo' });

  test('Semana muestra los siete días de lunes a domingo con sus compromisos, hoy destacado, y pasa de semana (REQ-CUN01-14)', async ({ page }) => {
    await entrar(page, cuentas.agendaSemana.correo);
    await page.getByRole('tab', { name: 'Semana' }).click();
    await expect(page.getByRole('tab', { name: 'Semana' })).toHaveAttribute('aria-selected', 'true');

    const semana = page.getByRole('region', { name: /^Semana del / });
    const dias = semana.locator('.semana__dia');
    await expect(dias).toHaveCount(7);
    await expect(semana.getByRole('heading', { level: 3 })).toHaveText(Array.from({ length: 7 }, (_, i) => new RegExp(`^${escapar(mayuscula(nombreDe(enDias(lunes, i))))}`)));
    await expect(semana.getByText(/^Hora de Lima \(GMT-5\)$/)).toBeVisible();

    // Hoy destacado
    const hoy = semana.locator('[aria-current="date"]');
    await expect(hoy).toHaveCount(1);
    await expect(hoy.getByRole('heading')).toHaveText(`${mayuscula(nombreDe(hoyEnLima))}Hoy`);

    await expect(dias.nth(0).locator('.compromiso__titulo')).toHaveText(['Planificación semanal']);
    await expect(dias.nth(1).getByText('Sin compromisos')).toBeVisible();
    await expect(dias.nth(2).locator('.compromiso__titulo')).toHaveText(['Revisión de diseño', 'Almuerzo con Vasco', 'Clase de finanzas']);
    await expect(dias.nth(2).locator('.compromiso__horario')).toHaveText(['09:00 – 10:00', '11:00 – 12:00', '16:00 – 17:00']);
    await expect(dias.nth(3).locator('.compromiso')).toHaveCount(5);
    // Lo cancelado se marca como en Hoy
    await expect(dias.nth(4).locator('.compromiso--cancelado .compromiso__titulo')).toHaveText('Demo con el clienteCancelado');
    await expect(dias.nth(6).getByText('Sin compromisos')).toBeVisible();

    await page.getByRole('button', { name: 'Semana siguiente' }).click();
    await expect(dias.nth(0).getByRole('heading')).toHaveText(mayuscula(nombreDe(enDias(lunes, 7))));
    await expect(dias.nth(1).locator('.compromiso__titulo')).toHaveText(['Revisión trimestral']);
    await expect(semana.locator('[aria-current="date"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Semana anterior' }).click();
    await expect(dias.nth(0).locator('.compromiso__titulo')).toHaveText(['Planificación semanal']);
    await page.getByRole('button', { name: 'Semana anterior' }).click();
    await expect(dias.nth(0).getByRole('heading')).toHaveText(mayuscula(nombreDe(enDias(lunes, -7))));
    await page.getByRole('button', { name: 'Esta semana' }).click();
    await expect(semana.locator('[aria-current="date"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Esta semana' })).toHaveCount(0);
  });

  // Pulido · la cuenta semanaLlena tiene seis compromisos cada día de esta semana (e2e/arrancar-api.mjs). Sin
  // desplazar nada, el día de hoy tiene que estar a la vista. Si hoy es lunes, ya lo está de entrada.
  test('al entrar en Semana, el día de hoy se ve sin desplazarse aunque haya muchos compromisos antes (REQ-CUN01-14)', async ({ page }) => {
    await entrar(page, cuentas.semanaLlena.correo);
    await page.getByRole('tab', { name: 'Semana' }).click();
    const semana = page.getByRole('region', { name: /^Semana del / });
    await expect(semana.locator('.semana__dia')).toHaveCount(7);
    const hoy = semana.locator('[aria-current="date"]');
    await expect(hoy.locator('.compromiso')).toHaveCount(6);
    await expect(hoy.getByRole('heading')).toBeInViewport();
    await expect(hoy.locator('.compromiso').first()).toBeInViewport();
  });

  test('Mes muestra la rejilla con un punto por cada dos compromisos, pasa de mes y un día abre ese día en Hoy (REQ-CUN01-15)', async ({ page }) => {
    await entrar(page, cuentas.agendaSemana.correo);
    await page.getByRole('tab', { name: 'Mes' }).click();
    const rejilla = page.getByRole('table', { name: nombreDeMes(hoyEnLima) });
    await expect(rejilla).toBeVisible();
    await expect(rejilla.getByRole('columnheader')).toHaveText(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
    // Semanas en filas, siempre completas de lunes a domingo
    const celdas = await rejilla.getByRole('cell').count();
    expect(celdas % 7).toBe(0);

    const dia = (n: number, cuantos: string) => rejilla.getByRole('button', { name: `${mayuscula(nombreDe(enDias(lunes, n)))}: ${cuantos}` });
    await expect(dia(0, '1 compromiso').locator('.mes__punto')).toHaveCount(1);
    await expect(dia(2, '3 compromisos').locator('.mes__punto')).toHaveCount(2);
    await expect(dia(3, '5 compromisos').locator('.mes__punto')).toHaveCount(3);
    // El cancelado no ocupa el día
    await expect(dia(4, 'sin compromisos').locator('.mes__punto')).toHaveCount(0);
    await expect(rejilla.locator('[aria-current="date"]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    const siguiente = new Date(Date.parse(`${hoyEnLima.slice(0, 7)}-01T12:00:00Z`));
    siguiente.setUTCMonth(siguiente.getUTCMonth() + 1);
    await expect(page.getByRole('table', { name: nombreDeMes(siguiente.toISOString().slice(0, 10)) })).toBeVisible();
    await page.getByRole('button', { name: 'Este mes' }).click();
    await expect(rejilla).toBeVisible();

    // Tocar un día lo muestra en Hoy, con la vuelta a hoy. Se elige uno que no sea hoy.
    const elegido = enDias(lunes, 2) === hoyEnLima ? 3 : 2;
    const fecha = enDias(lunes, elegido);
    await rejilla.getByRole('button', { name: new RegExp(`^${escapar(mayuscula(nombreDe(fecha)))}:`) }).click();
    await expect(page.getByRole('tab', { name: 'Hoy' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 2, name: nombreDe(fecha) })).toBeVisible();
    await expect(page.getByRole('list', { name: `Compromisos del ${nombreDe(fecha)}` }).getByRole('listitem')).toHaveCount(elegido === 2 ? 3 : 5);
    await page.getByRole('button', { name: 'Volver a hoy' }).click();
    await expect(page.getByRole('button', { name: 'Volver a hoy' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });
});

// Fusión del 25 de noviembre de 2026 · CUN-05 (specs/05-equipos/plan.md §8). «Disponibilidad de equipo» es un
// corte de Agenda que no es un nivel de período (INC-36): no va en la dirección y, al volver a un nivel, la
// agenda de la persona reaparece tal cual.
test.describe('agenda.corte-disponibilidad-de-equipo', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('el corte del equipo abre la disponibilidad y los niveles devuelven la agenda propia', async ({ page }) => {
    await entrar(page, cuentas.agenda.correo);
    const selector = page.getByRole('tablist', { name: 'Niveles' });
    await expect(page.getByRole('list', { name: 'Compromisos de hoy' })).toBeVisible();

    await selector.getByRole('tab', { name: 'Disponibilidad de equipo' }).click();
    await expect(selector.getByRole('tab', { name: 'Disponibilidad de equipo' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Disponibilidad del equipo' })).toBeVisible();
    await expect(page.getByText('Encuentra un horario para reunirse')).toBeVisible();
    // Lo de la agenda propia no se mezcla con el equipo
    await expect(page.getByRole('list', { name: 'Compromisos de hoy' })).toHaveCount(0);
    await expect(page).not.toHaveURL(/nivel=/);

    await selector.getByRole('tab', { name: 'Semana' }).click();
    await expect(page).toHaveURL(/nivel=semana/);
    await expect(selector.getByRole('tab', { name: 'Semana' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Disponibilidad del equipo' })).toHaveCount(0);

    await selector.getByRole('tab', { name: 'Disponibilidad de equipo' }).click();
    await expect(page.getByRole('heading', { name: 'Disponibilidad del equipo' })).toBeVisible();
    await selector.getByRole('tab', { name: 'Hoy' }).click();
    await expect(page.getByRole('list', { name: 'Compromisos de hoy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Disponibilidad del equipo' })).toHaveCount(0);
  });
});
