import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-045 · REQ-CAP-25 en el móvil. La cuenta es la clave `asistenteEspera` de cuentas.json: arrancar-api.mjs
// le deja hecho el primer ingreso, en Lima, y **sin el calendario conectado** (T-051): lo que queda en
// espera es lo que necesita el calendario de Google y no lo tiene (REQ-CUN01-08). Antes lo que esperaba era
// la tarea, que desde T-051 se crea de verdad.

async function entrar(page: Page) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(cuentas.asistenteEspera.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

async function pedirYCerrar(page: Page, texto: string) {
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
  // La capa conserva lo anterior: hay que esperar un aviso nuevo, no uno que ya estaba, o se cierra antes
  // de que llegue la respuesta y la franja no lo cuenta
  const avisos = page.getByText(/^En espera\./);
  const antes = await avisos.count();
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(avisos).toHaveCount(antes + 1);
  await page.getByRole('button', { name: 'Cerrar' }).click();
}

test.describe('movil.en-espera-visible', () => {
  test('sin nada en espera no hay franja; con algo, la franja encima de la agenda dice cuántas y, al abrirla, qué se pidió y por qué espera, sin retirar', async ({ page }) => {
    await entrar(page);
    await expect(page.getByText('Tu agenda llega con tu calendario')).toBeVisible();
    await expect(page.getByRole('button', { name: /en espera$/ })).toHaveCount(0);

    await pedirYCerrar(page, 'Agéndame una llamada mañana a las 9');
    const franja = page.getByRole('button', { name: '1 cosa en espera' });
    await expect(franja).toBeVisible();

    await franja.click();
    const lista = page.getByRole('list', { name: 'Lo que está en espera' });
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('«Agéndame una llamada mañana a las 9»');
    await expect(lista).toContainText('Falta el permiso de tu calendario de Google.');
    // La retirada sigue siendo una decisión abierta: no hay botón para hacerlo
    await expect(page.getByRole('button', { name: /Retirar|Descartar|Quitar/ })).toHaveCount(0);

    await pedirYCerrar(page, 'Agéndame el dentista el viernes a las 10');
    await expect(page.getByRole('button', { name: '2 cosas en espera' })).toBeVisible();
  });
});
