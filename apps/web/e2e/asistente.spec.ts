import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-034 · REQ-CAP-23, REQ-CUN01-01, 04, 13 · specs/07-agente/plan.md §9. La API de estas pruebas usa el
// modelo simulado con el guion de demostración (H-AGT-02) y el calendario simulado: nunca Groq ni Google.

async function entrar(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

async function pedir(page: Page, texto: string) {
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
}

test.describe('web.asistente-agenda-y-confirma', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('se pide un compromiso, se confirma en su tarjeta y aparece en Hoy; una consulta responde con la agenda tal cual', async ({ page }) => {
    await entrar(page, cuentas.asistente.correo);
    await expect(page.getByText('Hoy no tienes compromisos')).toBeVisible();

    await pedir(page, 'Agéndame una revisión hoy a las 23');
    const tarjeta = page.getByRole('article', { name: 'Para confirmar' });
    await expect(tarjeta.getByRole('heading', { name: 'Registrar este compromiso en tu calendario de Google' })).toBeVisible();
    await expect(tarjeta).toContainText('Revisión');
    await expect(tarjeta).toContainText('23:00 – 00:00');
    // REQ-CUN01-01: sin hora de fin, una hora, y la tarjeta lo dice
    await expect(tarjeta).toContainText('1 hora, porque no indicaste la hora de fin');
    // Nada se registró todavía (REQ-CUN01-03)
    await expect(page.getByText('Hoy no tienes compromisos')).toBeVisible();

    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toBeVisible();
    await expect(tarjeta.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    const hoy = page.getByRole('list', { name: 'Compromisos de hoy' });
    await expect(hoy.getByText('Revisión')).toBeVisible();

    // REQ-CUN01-13: la consulta la responde la agenda armada por el código
    await pedir(page, '¿Qué tengo hoy?');
    // La de la conversación empieza con mayúscula; la de Hoy, no
    const lista = page.getByRole('region', { name: /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+, \d+ de / });
    await expect(lista).toContainText('Hora de Lima (GMT-5)');
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('23:00 – 00:00 Revisión');
  });

  test('descartar no registra nada', async ({ page }) => {
    await entrar(page, cuentas.asistente.correo);
    await pedir(page, 'Agéndame una llamada mañana a las 9');
    const tarjeta = page.getByRole('article', { name: 'Para confirmar' }).last();
    await tarjeta.getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByText('De acuerdo, no hice nada.')).toBeVisible();
  });
});

test.describe('web.asistente-en-espera', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('lo que queda en espera se ve como en espera, no como un fallo, y sigue ahí al recargar (REQ-CAP-23, REQ-AGT-02)', async ({ page }) => {
    await entrar(page, cuentas.asistenteEspera.correo);
    await pedir(page, 'Recuérdame pagar el recibo antes del sábado');
    const aviso = page.getByText(/^En espera\. Lo guardé como tarea: «pagar el recibo antes del sábado»/);
    await expect(aviso).toBeVisible();
    // Ningún fallo en la conversación (Next.js tiene su propio aviso de navegación, fuera de ella)
    await expect(page.getByRole('region', { name: 'Asistente' }).getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect(page.getByText('Recuérdame pagar el recibo antes del sábado')).toBeVisible();
    await expect(aviso).toBeVisible();
  });

  test('lo que el asistente no sabe hacer lo dice, sin inventar (REQ-AGT-02)', async ({ page }) => {
    await entrar(page, cuentas.asistenteEspera.correo);
    await pedir(page, 'Mándale un correo a Juan');
    await expect(page.getByText('No sé hacer eso todavía.')).toBeVisible();
  });
});
