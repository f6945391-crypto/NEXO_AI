import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-045 · REQ-CAP-25 en el móvil. La cuenta es la clave `asistenteEspera` de cuentas.json: arrancar-api.mjs
// le deja hecho el primer ingreso, en Lima, con el calendario simulado. Con el guion de demostración,
// «Recuérdame pagar el recibo» queda en espera porque las tareas llegan en una próxima versión.

async function entrar(page: Page) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(cuentas.asistenteEspera.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

async function pedirYCerrar(page: Page, texto: string) {
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText(/^En espera\./).last()).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).click();
}

test.describe('movil.en-espera-visible', () => {
  test('sin nada en espera no hay franja; con algo, la franja encima de la agenda dice cuántas y, al abrirla, qué se pidió y por qué espera, sin retirar', async ({ page }) => {
    await entrar(page);
    await expect(page.getByText('Hoy no tienes compromisos')).toBeVisible();
    await expect(page.getByRole('button', { name: /en espera$/ })).toHaveCount(0);

    await pedirYCerrar(page, 'Recuérdame pagar el recibo');
    const franja = page.getByRole('button', { name: '1 cosa en espera' });
    await expect(franja).toBeVisible();

    await franja.click();
    const lista = page.getByRole('list', { name: 'Lo que está en espera' });
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('«Recuérdame pagar el recibo»');
    await expect(lista).toContainText('Las tareas llegan en una próxima versión.');
    // La retirada sigue siendo una decisión abierta: no hay botón para hacerlo
    await expect(page.getByRole('button', { name: /Retirar|Descartar|Quitar/ })).toHaveCount(0);

    await pedirYCerrar(page, 'Recuérdame llamar a Lucía');
    await expect(page.getByRole('button', { name: '2 cosas en espera' })).toBeVisible();

    // REQ-CAP-25 y decisión 26 de 02-agenda: la franja va sobre la agenda de hoy. En Semana y Mes no se muestra
    await page.getByRole('tab', { name: 'Semana' }).click();
    await expect(page.getByRole('button', { name: 'Semana siguiente' })).toBeVisible();
    await expect(page.getByRole('button', { name: /en espera$/ })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Mes' }).click();
    await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeVisible();
    await expect(page.getByRole('button', { name: /en espera$/ })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Hoy' }).click();
    await expect(page.getByRole('button', { name: '2 cosas en espera' })).toBeVisible();
  });
});
