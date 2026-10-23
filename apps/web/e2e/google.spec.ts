import { expect, test } from '@playwright/test';
import cuentas from './cuentas.json';

// T-022 · REQ-ACC-06: cada permiso de Google se ve con su explicación y se conecta por separado.
test.describe('acceso.conectar-google-por-permiso', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Ajustes muestra los dos permisos sin conectar, y «Conectar» lleva a Google con ese permiso', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(cuentas.google.correo);
    await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByLabel('Contraseña nueva').fill(cuentas.contrasenaNueva);
    await page.getByRole('button', { name: /Usar la de este equipo/ }).click();
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();

    // Sin calendario conectado, Agenda lo explica y ofrece conectarlo.
    await expect(page.getByRole('heading', { name: 'Tu agenda llega con tu calendario' })).toBeVisible();

    await page.getByRole('button', { name: 'Ajustes' }).click();
    const ajustes = page.getByRole('dialog', { name: 'Ajustes' });
    await expect(ajustes.locator('.permiso__nombre')).toHaveText([/^Tu calendario/, /^Enviar correo/]);
    await expect(ajustes.getByText('Nunca leemos tu buzón')).toBeVisible();
    await expect(ajustes.getByText('Sin conectar')).toHaveCount(2);

    // Google no se visita de verdad: se intercepta y se comprueba qué permiso se pidió.
    let pedido: URL | null = null;
    await page.route('https://accounts.google.com/**', (ruta) => {
      pedido = new URL(ruta.request().url());
      return ruta.fulfill({ contentType: 'text/html', body: '<h1>Google (simulado)</h1>' });
    });
    await ajustes.getByRole('button', { name: 'Conectar: Tu calendario' }).click();
    await expect(page.getByRole('heading', { name: 'Google (simulado)' })).toBeVisible();

    expect(pedido!.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar.events');
    expect(pedido!.searchParams.get('state')).toBeTruthy();
  });
});
