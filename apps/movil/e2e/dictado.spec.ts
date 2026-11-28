import { expect, test } from '@playwright/test';
import cuentas from './cuentas.json';

// T-156 · REQ-CAP-27 · plan de 07-agente §15.3 y §15.4. «Hablar» en la capa de captura, sobre Expo web: Chromium
// da un micrófono falso (playwright.config.ts) y la API de estas pruebas usa el transcriptor simulado, que
// siempre devuelve «informe de Vasco el jueves». En un teléfono, con Expo Go, se prueba a mano.

test.describe('movil.dictado', () => {
  test('lo dictado queda en el campo, a continuación de lo escrito, y no se envía', async ({ page }) => {
    // Nada va al asistente: lo dictado solo escribe en el campo (H-CAP-06)
    const enviados: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/asistente/mensajes')) enviados.push(r.url());
    });
    // La transcripción simulada responde en seguida: se retrasa un poco para ver «Transcribiendo…»
    await page.route('**/asistente/dictado', async (ruta) => {
      if (ruta.request().method() === 'POST') await new Promise((listo) => setTimeout(listo, 800));
      await ruta.continue();
    });

    await page.goto('/');
    await page.getByLabel('Correo').fill(cuentas.dictado.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    const campo = page.getByLabel('Pídele algo al asistente');
    await campo.fill('Revisar el');

    await page.getByRole('button', { name: 'Hablar', exact: true }).click();
    await expect(page.getByText(/^Grabando \d:\d{2}$/)).toBeVisible();
    const detener = page.getByRole('button', { name: 'Detener grabación' });
    await expect(detener).toBeVisible();
    // Mientras graba no se envía
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    await page.waitForTimeout(1200);
    await detener.click();

    await expect(page.getByText('Transcribiendo…', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hablar', exact: true })).toBeDisabled();

    await expect(campo).toHaveValue('Revisar el informe de Vasco el jueves');
    await expect(page.getByText('Transcribiendo…', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hablar', exact: true })).toBeEnabled();
    // Con el foco en el campo, para corregirlo o enviarlo
    await expect(campo).toBeFocused();
    expect(enviados).toHaveLength(0);
  });
});
