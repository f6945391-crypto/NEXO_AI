import { expect, test } from '@playwright/test';
import cuentas from './cuentas.json';

// T-027 · REQ-ACC-10, REQ-ACC-11. La cuenta vive en Lima, con el calendario simulado conectado y un
// compromiso que cae «hoy» en Lima y en Tokio (e2e/arrancar-api.mjs).
test.describe('acceso.cambiar-zona-desde-ajustes', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('se ve qué cambia antes de aplicarlo, cancelar no cambia nada y confirmar pasa la agenda a la zona nueva', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(cuentas.zona.correo);
    await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Hora de Lima (GMT-5)')).toBeVisible();

    await page.getByRole('button', { name: 'Ajustes' }).click();
    const ajustes = page.getByRole('dialog', { name: 'Ajustes' });
    await expect(ajustes.getByText('America/Lima · GMT-5')).toBeVisible();

    // Primero, ver qué cambia, y cancelar
    await ajustes.getByRole('button', { name: 'Cambiar zona horaria' }).click();
    await ajustes.getByLabel('Zona horaria nueva').selectOption('Asia/Tokyo');
    await ajustes.getByRole('button', { name: 'Ver qué cambia' }).click();
    const tarjeta = ajustes.getByRole('region', { name: 'Cambiar tu zona horaria' });
    await expect(tarjeta.getByText('Hora de Tokyo (GMT+9)')).toBeVisible();
    await expect(tarjeta.getByText('Guardia de soporte')).toBeVisible();
    await tarjeta.getByRole('button', { name: 'Cancelar' }).click();
    await expect(tarjeta).toHaveCount(0);
    await expect(ajustes.getByText('America/Lima · GMT-5')).toBeVisible();

    // Después, confirmarlo
    await ajustes.getByRole('button', { name: 'Cambiar zona horaria' }).click();
    await ajustes.getByLabel('Zona horaria nueva').selectOption('Asia/Tokyo');
    await ajustes.getByRole('button', { name: 'Ver qué cambia' }).click();
    await ajustes.getByRole('button', { name: 'Confirmar el cambio' }).click();
    await expect(ajustes.getByRole('status')).toHaveText('Listo: tu zona horaria ahora es Asia/Tokyo · GMT+9.');
    await expect(ajustes.getByText('Asia/Tokyo · GMT+9', { exact: true })).toBeVisible();

    await ajustes.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByText('Hora de Tokyo (GMT+9)')).toBeVisible();
    await expect(page.getByText('Guardia de soporte')).toBeVisible();
  });
});
