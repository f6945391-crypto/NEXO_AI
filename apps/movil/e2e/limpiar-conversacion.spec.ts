import { expect, test } from '@playwright/test';
import cuentas from './cuentas.json';

// T-160 · REQ-AGT-09, REQ-AGT-10 · specs/07-agente/plan.md §16. En Ajustes del móvil se limpia lo que se ve de la
// conversación; la capa vuelve a leerla al abrirse y queda en blanco. Nada se borra: el compromiso sigue en Hoy.

test.describe('movil.limpiar-conversacion', () => {
  test('desde Ajustes se limpia la conversación y la capa vuelve en blanco', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo').fill(cuentas.limpiarConversacion.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await page.getByLabel('Pídele algo al asistente').fill('Agéndame una revisión hoy a las 23');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();

    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Limpiar conversación' }).click();
    await expect(page.getByText(/^Se limpia lo que ves\. El asistente sigue recordando lo que hicieron/)).toBeVisible();
    await page.getByRole('button', { name: 'Sí, limpiar' }).click();
    await expect(page.getByText('Listo: la conversación quedó limpia.')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await expect(page.getByRole('button', { name: /^Revisión, 23:00 – 00:00$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await expect(page.getByRole('heading', { name: '¿Qué hacemos?' })).toBeVisible();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toHaveCount(0);
  });
});

// T-160 · REQ-AGT-09: la lista de lo entendido, en la capa
test.describe('movil.varias-cosas', () => {
  test('la frase con tres cosas muestra primero lo que entendió y pregunta el día', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo').fill(cuentas.variasCosas.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await page.getByLabel('Pídele algo al asistente').fill('qué tareas y compromisos tengo la semana siguiente y agrega un bloque de 12 a 7 que se llame ENTREGA DE PROYECTO SEI');
    await page.getByRole('button', { name: 'Enviar' }).click();

    const lista = page.getByLabel('Lo que entendí');
    await expect(lista).toContainText('Entendí tres cosas:');
    await expect(lista).toContainText(/1\. Tus tareas pendientes de la semana siguiente, del lunes \d+ de \p{Ll}+ al domingo \d+ de \p{Ll}+/u);
    await expect(lista).toContainText('3. Un compromiso «ENTREGA DE PROYECTO SEI» de 12:00 a 19:00 · Falta el día');
    await expect(page.getByText('¿Qué día?')).toBeVisible();
  });
});
