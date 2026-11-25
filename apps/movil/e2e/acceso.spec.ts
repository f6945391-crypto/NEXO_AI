import { expect, test } from '@playwright/test';
import cuentas from './cuentas.json';

// T-028 · REQ-ACC-02 a REQ-ACC-05 en el móvil, contra la API real de pruebas del móvil.
test.describe('movil.acceso-recorrido', () => {
  test('unas credenciales erróneas dan el mismo mensaje que la web, sin revelar si el correo existe', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Correo').fill(cuentas.credencialesErroneas.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill('no-es-la-contrasena');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toHaveText('El correo o la contraseña no son correctos.');
  });

  test('entrar, completar el primer ingreso eligiendo la zona, llegar a la aplicación y salir', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Correo').fill(cuentas.recorrido.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible();
    await page.getByLabel('Contraseña nueva').fill(cuentas.contrasenaNueva);
    // REQ-ACC-05: sin elegir zona no se continúa
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();
    await expect(page.getByRole('alert')).toHaveText('Elige tu zona horaria para continuar.');

    await page.getByLabel('Busca tu zona horaria').fill('Lima');
    await page.getByRole('radio', { name: /^America\/Lima · GMT-5$/ }).click();
    await expect(page.getByText('Zona elegida: America/Lima · GMT-5')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();

    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tareas' })).toBeVisible();

    await page.getByRole('button', { name: 'Ajustes' }).click();
    await expect(page.getByText(cuentas.recorrido.correo)).toBeVisible();
    await expect(page.getByText('America/Lima · GMT-5')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Entra en NexoAI' })).toBeVisible();
  });
});
