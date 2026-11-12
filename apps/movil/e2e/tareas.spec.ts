import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-054 · REQ-CUN03-01, 03, 05 en el móvil. La cuenta es la clave `tareas` de cuentas.json: arrancar-api.mjs
// le deja hecho el primer ingreso, en Lima, con el calendario simulado. El asistente es el simulado con el
// guion de demostración. Se pide la tarea al asistente y se confirma en su tarjeta (P-03); «Hecho» es de un
// toque, sin tarjeta (decisión 2); no hay formulario de creación (R-42). Van en orden: comparten la cuenta.

async function entrar(page: Page) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(cuentas.tareas.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  await page.getByRole('tab', { name: 'Tareas' }).click();
  await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible();
}

async function pedirYConfirmar(page: Page, texto: string, titulo: string) {
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
  const tarjeta = page.getByLabel('Para confirmar').last();
  await expect(tarjeta).toContainText(titulo);
  await tarjeta.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('separator', { name: new RegExp(`Se registró «${titulo}»$`) })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).click();
}

test.describe('movil.tareas-franjas', () => {
  test('sin tareas, cada franja invita a pedírselo al asistente, y no hay formulario (REQ-CUN03-03, R-42)', async ({ page }) => {
    await entrar(page);
    await expect(page.getByText('No tienes tareas con fecha')).toBeVisible();
    await page.getByRole('tab', { name: 'Sin fecha' }).click();
    await expect(page.getByText('No tienes tareas sin fecha')).toBeVisible();
    await page.getByRole('tab', { name: 'Esperando de alguien' }).click();
    await expect(page.getByText('No esperas nada de nadie')).toBeVisible();
    // R-42: ningún campo para crear una tarea; lo único es pedírselo al asistente
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await page.getByRole('button', { name: 'Pedírselo al asistente' }).click();
    await expect(page.getByLabel('Pídele algo al asistente')).toBeVisible();
  });

  test('una tarea con día va a «Con fecha», con su día y sin «Atrasada» (REQ-CUN03-01, 03)', async ({ page }) => {
    await entrar(page);
    await pedirYConfirmar(page, 'Recuérdame pagar el recibo el viernes', 'pagar el recibo');
    const lista = page.getByRole('list', { name: 'Con fecha' });
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('pagar el recibo');
    // El guion pone el próximo viernes: nunca uno pasado
    await expect(lista).toContainText(/^Hecho.*Viernes, \d{1,2} de \p{L}+/u);
    await expect(page.getByText('Atrasada')).toHaveCount(0);
  });
});

test.describe('movil.tareas-completar', () => {
  test('pedida sin día, la tarjeta no crea nada hasta confirmar, queda en «Sin fecha» sin fecha inventada, y «Hecho» la saca de un toque (REQ-CUN03-01, 05)', async ({ page }) => {
    await entrar(page);
    await page.getByRole('tab', { name: 'Sin fecha' }).click();
    await expect(page.getByText('No tienes tareas sin fecha')).toBeVisible();

    // P-03: con la tarjeta a la vista, todavía no existe
    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await page.getByLabel('Pídele algo al asistente').fill('Recuérdame renovar el pasaporte');
    await page.getByRole('button', { name: 'Enviar' }).click();
    const tarjeta = page.getByLabel('Para confirmar').last();
    await expect(tarjeta).toContainText('renovar el pasaporte');
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByText('No tienes tareas sin fecha')).toBeVisible();

    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await page.getByLabel('Para confirmar').last().getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('separator', { name: /Se registró «renovar el pasaporte»$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();

    const lista = page.getByRole('list', { name: 'Sin fecha' });
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    // REQ-CUN03-01: la persona no dijo ningún día, así que ninguno aparece
    await expect(lista).toHaveText(/^Hecho\s*renovar el pasaporte$/);

    // Decisión 2: de un toque, sin tarjeta
    await lista.getByRole('button', { name: 'Marcar como hecha: renovar el pasaporte' }).click();
    await expect(page.getByText('No tienes tareas sin fecha')).toBeVisible();
    await expect(page.getByLabel('Para confirmar')).toHaveCount(0);
  });
});
