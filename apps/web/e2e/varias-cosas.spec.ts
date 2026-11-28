import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-159 · REQ-AGT-09, REQ-AGT-10 · specs/07-agente/plan.md §16. La API usa el modelo simulado con el guion de
// demostración: separa la frase y pasa el período; la lista, los días y lo que falta los pone la API.

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

test.use({ viewport: { width: 1440, height: 900 } });

test.describe('web.varias-cosas', () => {
  test('la frase con tres cosas: primero lo que entendió, luego las dos listas de la semana siguiente y «¿Qué día?»', async ({ page }) => {
    await entrar(page, cuentas.variasCosas.correo);
    await pedir(page, 'qué tareas y compromisos tengo la semana siguiente y agrega un bloque de 12 a 7 que se llame ENTREGA DE PROYECTO SEI');

    const lista = page.getByRole('region', { name: 'Lo que entendí' });
    await expect(lista).toContainText('Entendí tres cosas:');
    const lineas = lista.getByRole('listitem');
    await expect(lineas).toHaveCount(3);
    await expect(lineas.nth(0)).toHaveText(/^Tus tareas pendientes de la semana siguiente, del lunes \d+ de \p{Ll}+ al domingo \d+ de \p{Ll}+$/u);
    await expect(lineas.nth(1)).toHaveText(/^Tus compromisos de la semana siguiente, del lunes \d+ de \p{Ll}+ al domingo \d+ de \p{Ll}+$/u);
    await expect(lineas.nth(2)).toHaveText('Un compromiso «ENTREGA DE PROYECTO SEI» de 12:00 a 19:00 · Falta el día');
    await expect(page.getByText('¿Qué día?')).toBeVisible();
    await expect(page.getByRole('article', { name: 'Para confirmar' })).toHaveCount(0);

    await pedir(page, 'el lunes el bloque de 12 a 7 que se llame ENTREGA DE PROYECTO SEI');
    const tarjeta = page.getByRole('article', { name: 'Para confirmar' });
    await expect(tarjeta.getByRole('heading', { name: 'Registrar este compromiso en tu calendario de Google' })).toBeVisible();
    await expect(tarjeta).toContainText('ENTREGA DE PROYECTO SEI');
    await expect(tarjeta).toContainText('12:00 – 19:00');
  });
});

test.describe('web.limpiar-conversacion', () => {
  test('desde Ajustes se limpia lo que se ve, también al recargar; la agenda sigue igual', async ({ page }) => {
    await entrar(page, cuentas.limpiarConversacion.correo);
    await pedir(page, 'Agéndame una revisión hoy a las 23');
    const tarjeta = page.getByRole('article', { name: 'Para confirmar' });
    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toBeVisible();

    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Limpiar conversación' }).click();
    await expect(page.getByText('Se limpia lo que ves. El asistente sigue recordando lo que hicieron')).toBeVisible();
    await page.getByRole('button', { name: 'Sí, limpiar' }).click();
    await expect(page.getByText('Listo: la conversación quedó limpia.')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toHaveCount(0);
    await expect(page.getByText('¿Qué hacemos?')).toBeVisible();
    // Nada se borró: el compromiso sigue en Hoy
    await expect(page.getByRole('list', { name: 'Compromisos de hoy' }).getByText('Revisión')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toHaveCount(0);
    await expect(page.getByText('¿Qué hacemos?')).toBeVisible();
  });
});
