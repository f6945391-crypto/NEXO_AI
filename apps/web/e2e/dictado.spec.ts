import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-155 · REQ-CAP-27, H-CAP-06 · specs/07-agente/plan.md §15.2 y §15.4. «Hablar» en la barra de la conversación.
// Chromium graba de un micrófono falso que no pregunta (playwright.config.ts), y la API de estas pruebas usa el
// transcriptor simulado, que siempre devuelve «informe de Vasco el jueves»: nunca el proveedor real.

async function entrar(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

test.describe('web.dictado', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('lo dictado queda en el campo, a continuación de lo escrito, sin enviarse', async ({ page }) => {
    await entrar(page, cuentas.dictado.correo);
    // El transcriptor simulado responde en seguida: medio segundo de espera para que «Transcribiendo…» se vea siempre
    await page.route('**/dictado', async (ruta) => {
      await new Promise((listo) => setTimeout(listo, 500));
      await ruta.continue();
    });
    const campo = page.getByLabel('Pídele algo al asistente');
    await campo.fill('Revisar el');

    await page.getByRole('button', { name: 'Hablar' }).click();
    // Mientras graba se ve el tiempo, y el botón pasa a detener
    await expect(page.getByText(/^Grabando \d:\d\d$/)).toBeVisible();
    await expect(page.getByText(/^Grabando 0:0[1-9]$/)).toBeVisible();
    await page.getByRole('button', { name: 'Detener' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Transcribiendo…' })).toBeVisible();
    await expect(campo).toHaveValue('Revisar el informe de Vasco el jueves');
    await expect(page.getByText('Transcribiendo…')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hablar' })).toBeEnabled();

    // Con el foco y el cursor al final
    await expect(campo).toBeFocused();
    const cursor = await campo.evaluate((c: HTMLTextAreaElement) => ({ inicio: c.selectionStart, fin: c.selectionEnd, largo: c.value.length }));
    expect(cursor).toEqual({ inicio: cursor.largo, fin: cursor.largo, largo: cursor.largo });

    // No se envió nada: ninguna burbuja de la persona y la conversación sigue en blanco
    await expect(page.locator('.mensaje')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '¿Qué hacemos?' })).toBeVisible();
  });

  test('sin permiso del micrófono lo dice y el campo no cambia', async ({ page }) => {
    // El micrófono falso acepta solo el permiso (--use-fake-ui-for-media-stream), así que quitarlo del contexto no
    // basta: el navegador lo concedería igual. Se simula la negativa del navegador antes de cargar la página.
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    });
    await entrar(page, cuentas.dictado.correo);
    const campo = page.getByLabel('Pídele algo al asistente');
    await campo.fill('Revisar el');

    await page.getByRole('button', { name: 'Hablar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No pude usar el micrófono. Revisa el permiso del navegador o del teléfono.' })).toBeVisible();
    await expect(campo).toHaveValue('Revisar el');
    await expect(page.getByText(/^Grabando/)).toHaveCount(0);
    await expect(page.locator('.mensaje')).toHaveCount(0);
  });
});
