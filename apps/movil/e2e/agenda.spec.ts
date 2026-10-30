import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-021 · REQ-CUN01-06, 10, 11, 12 en el móvil. La API de pruebas usa el calendario simulado, sembrado en
// apps/web/e2e/arrancar-api.mjs: las dos cuentas viven en Lima y tienen el calendario conectado. Las pruebas
// van en este orden porque la última cancela un compromiso de la cuenta «agenda».

async function entrar(page: Page, correo: string) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

test.describe('agenda.horas-con-zona-horaria', () => {
  test.use({ timezoneId: 'Asia/Tokyo' });

  test('Hoy muestra los compromisos del día en la zona del perfil, aunque el teléfono esté en otra, y dice cuál es', async ({ page }) => {
    await entrar(page, cuentas.agenda.correo);
    await expect(page.getByText('Hora de Lima (GMT-5)')).toBeVisible();
    for (const nombre of ['Aniversario de la empresa, Todo el día', 'Revisión de sprint, 09:00 – 10:00', 'Llamada con el equipo de Madrid, 11:00 – 11:30', 'Comité de arquitectura, 15:00 – 16:00']) {
      await expect(page.getByRole('button', { name: nombre })).toBeVisible();
    }
    await expect(page.getByText(/^Hora de Madrid: \d{2}:00 – \d{2}:30$/)).toBeVisible();
    await expect(page.getByText('Invitado')).toBeVisible();
    await expect(page.getByText('Esto es mañana')).toHaveCount(0);
  });
});

test.describe('agenda.cancelar-requiere-confirmacion', () => {
  test('lo ajeno no se cancela; lo propio pide confirmación, se puede no cancelar y, al confirmar, queda cancelado', async ({ page }) => {
    await entrar(page, cuentas.agenda.correo);

    // H-AG-05: un compromiso al que te invitaron no ofrece cancelar
    await page.getByRole('button', { name: 'Comité de arquitectura, 15:00 – 16:00' }).click();
    await expect(page.getByText(/^Lo organiza otra persona/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar compromiso' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Cerrar' }).click();

    await page.getByRole('button', { name: 'Revisión de sprint, 09:00 – 10:00' }).click();
    await page.getByRole('button', { name: 'Cancelar compromiso' }).click();
    await expect(page.getByText('Cancelar este compromiso')).toBeVisible();
    await expect(page.getByText(/^Se quita de tu calendario de Google/)).toBeVisible();
    await page.getByRole('button', { name: 'No cancelar' }).click();
    await expect(page.getByRole('button', { name: 'Cancelar compromiso' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancelar compromiso' }).click();
    await page.getByRole('button', { name: 'Confirmar la cancelación' }).click();
    await expect(page.getByRole('alert')).toHaveText('Compromiso cancelado.');
    await expect(page.getByText('Cancelado', { exact: true })).toBeVisible();
  });
});

test.describe('agenda.estado-vacio-abre-captura', () => {
  test('sin compromisos hoy, la acción abre la capa de captura, lo pedido llega como propuesta y no hay formulario', async ({ page }) => {
    await entrar(page, cuentas.agendaVacia.correo);
    await expect(page.getByText('Hoy no tienes compromisos')).toBeVisible();
    // R-42: en la agenda no hay ningún campo para crear nada
    await expect(page.getByRole('textbox')).toHaveCount(0);

    await page.getByRole('button', { name: 'Pedírselo al asistente' }).click();
    await expect(page.getByRole('heading', { name: '¿Qué hacemos?' })).toBeVisible();
    const entrada = page.getByLabel('Pídele algo al asistente');
    await expect(entrada).toBeFocused();
    await entrada.fill('Agéndame una reunión mañana a las 10');
    await page.getByRole('button', { name: 'Enviar' }).click();
    // T-035: el asistente lo propone, y nada se registra hasta confirmar (antes quedaba en espera, R-42)
    await expect(page.getByLabel('Para confirmar')).toContainText('Registrar este compromiso en tu calendario de Google');
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();
  });
});
