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
