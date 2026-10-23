import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-011 · REQ-ACC-02 a 05, REQ-ACC-13 (H-ACC-06), contra la API real.

// El mensaje de error del formulario. Next.js añade su propio anunciador de rutas, también con role=alert.
const aviso = (page: Page) => page.locator('p.error[role="alert"]');

async function entrar(page: Page, correo: string, contrasena = cuentas.contrasenaTemporal) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(contrasena);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('acceso.zona-horaria-requiere-eleccion', () => {
  test('no se puede completar el primer ingreso sin elegir zona horaria', async ({ page }) => {
    await entrar(page, cuentas.sinElegirZona.correo);
    await expect(page).toHaveURL(/\/primer-ingreso$/);

    // La zona del equipo se propone, pero el selector empieza vacío.
    await expect(page.getByLabel('Zona horaria')).toHaveValue('');
    await expect(page.getByRole('button', { name: /Usar la de este equipo/ })).toBeVisible();

    await page.getByLabel('Contraseña nueva').fill(cuentas.contrasenaNueva);
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();

    await expect(aviso(page)).toHaveText('Elige tu zona horaria para continuar.');
    await expect(page).toHaveURL(/\/primer-ingreso$/);
  });
});

test.describe('acceso.recorrido-web', () => {
  // La segunda prueba entra con la contraseña que fija la primera.
  test.describe.configure({ mode: 'serial' });

  test('entrar, completar el primer ingreso eligiendo la zona del equipo, y cerrar sesión', async ({ page }) => {
    await entrar(page, cuentas.recorridoCompleto.correo);
    await expect(page).toHaveURL(/\/primer-ingreso$/);

    await page.getByLabel('Contraseña nueva').fill(cuentas.contrasenaNueva);
    await page.getByRole('button', { name: /Usar la de este equipo/ }).click();
    await expect(page.getByLabel('Zona horaria')).not.toHaveValue('');
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();

    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/entrar$/);

    // Con la contraseña nueva se entra directo, sin volver al primer ingreso.
    await entrar(page, cuentas.recorridoCompleto.correo, cuentas.contrasenaNueva);
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
  });

  test('el navegador nunca recibe el token de renovación en una cookie legible', async ({ page, context }) => {
    await entrar(page, cuentas.recorridoCompleto.correo, cuentas.contrasenaNueva);
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
    const galletas = await context.cookies();
    const renovacion = galletas.find((g) => g.name === 'nexoai_renovacion');
    expect(renovacion?.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain('nexoai_renovacion');
  });

  test('volver desde otro sitio, como Google tras conceder un permiso, conserva la sesión', async ({ page }) => {
    await entrar(page, cuentas.recorridoCompleto.correo, cuentas.contrasenaNueva);
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();

    // Una página de otro sitio con un enlace de vuelta: la navegación es entre sitios, como la de Google.
    await page.route('https://otro-sitio.prueba/', (ruta) =>
      ruta.fulfill({ contentType: 'text/html', body: '<a href="http://localhost:3101/?google=conectado">Volver</a>' }),
    );
    await page.goto('https://otro-sitio.prueba/');
    await page.getByRole('link', { name: 'Volver' }).click();

    await expect(page).toHaveURL(/\/\?google=conectado$/);
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
  });

  test('credenciales erróneas muestran un mensaje que no revela si el correo existe', async ({ page }) => {
    await entrar(page, cuentas.credencialesErroneas.correo, 'no-es-la-contrasena');
    const conCorreoExistente = await aviso(page).textContent();
    await entrar(page, 'nadie@nexoai.test', 'no-es-la-contrasena');
    await expect(aviso(page)).toHaveText(conCorreoExistente ?? '');
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('el colaborador, tras su primer ingreso, ve que su cuenta se usa desde el móvil', async ({ page }) => {
    await entrar(page, cuentas.colaborador.correo);
    await page.getByLabel('Contraseña nueva').fill(cuentas.contrasenaNueva);
    await page.getByRole('button', { name: /Usar la de este equipo/ }).click();
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();

    await expect(page).toHaveURL(/\/solo-movil$/);
    await expect(page.getByRole('heading', { name: 'Tu cuenta se usa desde el móvil' })).toBeVisible();

    // Aunque escriba la dirección de inicio, vuelve al aviso.
    await page.goto('/');
    await expect(page).toHaveURL(/\/solo-movil$/);
  });
});
