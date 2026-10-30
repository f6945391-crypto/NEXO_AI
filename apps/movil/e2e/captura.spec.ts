import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-035 · REQ-CAP-01, 23 · REQ-CUN01-01, 04 en el móvil. La API de estas pruebas usa el modelo simulado con el
// guion de demostración (H-AGT-02) y el calendario simulado: nunca Groq ni Google.

async function entrar(page: Page, correo: string) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

async function pedir(page: Page, texto: string) {
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
}

test.describe('movil.captura-propone-y-confirma', () => {
  test('desde la capa se pide un compromiso, se confirma en su tarjeta y aparece en Hoy', async ({ page }) => {
    await entrar(page, cuentas.captura.correo);
    await expect(page.getByText('Hoy no tienes compromisos')).toBeVisible();

    await pedir(page, 'Agéndame una revisión hoy a las 23');
    const tarjeta = page.getByLabel('Para confirmar');
    await expect(tarjeta).toContainText('Registrar este compromiso en tu calendario de Google');
    await expect(tarjeta).toContainText('1 hora, porque no indicaste la hora de fin');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('button', { name: /^Revisión, 23:00 – 00:00$/ })).toBeVisible();
  });
});

test.describe('movil.captura-en-espera', () => {
  test('lo que queda en espera se ve como en espera, no como un fallo, y sigue al volver a abrir la capa (REQ-CAP-23)', async ({ page }) => {
    await entrar(page, cuentas.capturaEspera.correo);
    await pedir(page, 'Recuérdame pagar el recibo');
    const aviso = page.getByText(/^En espera\. Lo guardé como tarea: «pagar el recibo»/);
    await expect(aviso).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.getByRole('button', { name: 'Cerrar' }).click();
    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await expect(aviso).toBeVisible();
  });
});
