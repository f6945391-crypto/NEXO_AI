import { expect, test } from '@playwright/test';
import cuentas from './cuentas.json';

// REQ-ACC-18 · T-121 · specs/06-acceso/plan.md §5.7. Cambiar la contraseña desde Ajustes, en el móvil.
const NUEVA = 'otra-contrasena-del-movil';

test.describe('movil.cambiar-contrasena', () => {
  test('con la actual incorrecta no cambia nada; con la correcta cambia y la sesión sigue', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo').fill(cuentas.contrasena.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await page.getByLabel('Contraseña actual').fill('no-es-la-actual');
    await page.getByLabel('Contraseña nueva').fill(NUEVA);
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByText('La contraseña actual no es correcta.')).toBeVisible();

    await page.getByLabel('Contraseña actual').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByText('Listo: tu contraseña cambió y se cerraron tus otras sesiones.')).toBeVisible();

    // La sesión sigue con los tokens nuevos: cerrar Ajustes y la agenda sigue ahí
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

    // Y la contraseña nueva es la que vale
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByLabel('Correo').fill(cuentas.contrasena.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(NUEVA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  });
});
