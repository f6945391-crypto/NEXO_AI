import { expect, test } from '@playwright/test';
import cuentas from './cuentas.json';

// REQ-ACC-18 · T-121 · specs/06-acceso/plan.md §5.7. Cambiar la contraseña desde Ajustes, en la web.
const NUEVA = 'otra-contrasena-de-la-web';

test.describe('acceso.cambiar-contrasena-desde-ajustes', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('con la actual incorrecta no cambia nada; con la correcta cambia y la sesión sigue', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(cuentas.contrasena.correo);
    await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();

    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await page.getByLabel('Contraseña actual').fill('no-es-la-actual');
    await page.getByLabel('Contraseña nueva').fill(NUEVA);
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('La contraseña actual no es correcta.');

    await page.getByLabel('Contraseña actual').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Listo: tu contraseña cambió y se cerraron tus otras sesiones.');

    // La sesión de la web sigue: al recargar no pide entrar
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();

    // Y la contraseña nueva es la que vale
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/entrar/);
    await page.getByLabel('Correo').fill(cuentas.contrasena.correo);
    await page.getByLabel('Contraseña').fill(NUEVA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
  });
});
