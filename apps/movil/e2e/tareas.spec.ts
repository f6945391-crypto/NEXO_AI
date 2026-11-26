import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-054, T-055 · REQ-CUN03-06 a 11, 13 en el móvil. La cuenta `tareas` tiene las mismas tareas que la de la web
// (apps/web/e2e/arrancar-api.mjs): «Pagar el recibo» hoy antes de las 23:00, «Renovar el DNI» vencida, «Enviar
// la tesis» en cinco días, «Llamar al dentista» y «Devolver el libro» sin fecha, «Presupuesto» de Juan,
// «Comprar el regalo» hecha ayer y el compromiso «Dentista» hoy. Las pruebas van en orden.

async function entrar(page: Page, correo: string) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

async function abrirTareas(page: Page) {
  await page.getByRole('tab', { name: 'Tareas' }).click();
  await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible();
}

const pendientes = (page: Page) => page.getByRole('list', { name: 'Pendientes' }).getByRole('listitem');
const textos = (page: Page) => pendientes(page).getByRole('button', { name: /, ver detalle$/ });

test.describe.configure({ mode: 'serial' });

test.describe('movil.tareas-por-franja', () => {
  test('las mismas tareas y en el mismo orden que la web, con sus textos (REQ-CUN03-06, 07, R-41)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await abrirTareas(page);
    await expect(textos(page)).toHaveText([/^Renovar el DNI/, /^Pagar el recibo/, /^Enviar la tesis/]);
    await expect(pendientes(page).first()).toContainText(/Vencía el \p{L}+ \d+ de \p{L}+/u);
    await expect(pendientes(page).first().getByText('Vencida', { exact: true })).toBeVisible();
    await expect(pendientes(page).nth(1)).toContainText('Antes de las 23:00');

    await page.getByRole('tab', { name: 'Sin fecha' }).click();
    await expect(textos(page)).toHaveText([/^Llamar al dentista/, /^Devolver el libro/]);
    await page.getByRole('tab', { name: 'Esperando de alguien' }).click();
    await expect(pendientes(page).first()).toContainText(/De Juan · Desde el \p{L}+ \d+ de \p{L}+, hace 6 días/u);
    await expect(page.getByRole('button', { name: 'Recibido: Presupuesto' })).toBeVisible();
    // R-42: ningún campo para escribir una tarea a mano fuera de la capa
    await expect(page.getByRole('textbox')).toHaveCount(0);
  });

  test('«Hecho» sin tarjeta y «Deshacer»; las hechas al pie con «Reabrir» (REQ-CUN03-09, 10)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await abrirTareas(page);
    await page.getByRole('button', { name: 'Hecho: Enviar la tesis' }).click();
    await expect(page.getByText('«Enviar la tesis» quedó hecha.')).toBeVisible();
    await expect(textos(page)).toHaveCount(2);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(textos(page)).toHaveCount(3);

    await page.getByRole('tab', { name: 'Sin fecha' }).click();
    await page.getByRole('button', { name: /^Ver hechas \(7 días\)/ }).click();
    const hechas = page.getByRole('list', { name: 'Hechas en los últimos 7 días' });
    await expect(hechas).toContainText(/Comprar el regalo\s*Hecha el \p{L}+ \d+ de \p{L}+/u);
    await hechas.getByRole('button', { name: 'Reabrir: Comprar el regalo' }).click();
    await expect(textos(page)).toHaveText([/^Llamar al dentista/, /^Comprar el regalo/, /^Devolver el libro/]);
    // La deja como estaba
    await page.getByRole('button', { name: 'Hecho: Comprar el regalo' }).click();
    await expect(textos(page)).toHaveCount(2);
  });

  test('el detalle permite descartar con su tarjeta; «No descartar» la deja igual (REQ-CUN03-11)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await abrirTareas(page);
    await page.getByRole('tab', { name: 'Sin fecha' }).click();
    await page.getByRole('button', { name: 'Devolver el libro, ver detalle' }).click();
    await page.getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByText('Descartar la tarea')).toBeVisible();
    await expect(page.getByText(/Ya no aparecerá en tus tareas/)).toBeVisible();
    await page.getByRole('button', { name: 'No descartar' }).click();
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(textos(page)).toHaveText([/^Llamar al dentista/, /^Devolver el libro/]);

    await page.getByRole('button', { name: 'Devolver el libro, ver detalle' }).click();
    await page.getByRole('button', { name: 'Descartar' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(textos(page)).toHaveText([/^Llamar al dentista/]);
  });

  test('una franja vacía dice qué va ahí y su acción abre la capa de captura (REQ-CUN03-08)', async ({ page }) => {
    await entrar(page, cuentas.tareasVacio.correo);
    await abrirTareas(page);
    await expect(page.getByText('Nada con fecha')).toBeVisible();
    await page.getByRole('tab', { name: 'Esperando de alguien' }).click();
    await expect(page.getByText('No esperas nada de nadie')).toBeVisible();
    await page.getByRole('button', { name: 'Pedírselo al asistente' }).click();
    await expect(page.getByLabel('Pídele algo al asistente')).toBeVisible();
  });
});

test.describe('movil.tareas-en-hoy', () => {
  test('Hoy muestra el compromiso y debajo «Tareas para este día», con la vencida marcada; nada en Semana ni en Mes (REQ-CUN03-13)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await expect(page.getByRole('button', { name: 'Dentista, 10:00 – 11:00' })).toBeVisible();
    const grupo = page.getByRole('list', { name: 'Tareas para este día' });
    await expect(grupo.getByRole('listitem')).toHaveCount(2);
    await expect(grupo.getByRole('listitem').first()).toContainText('Pagar el recibo');
    await expect(grupo.getByRole('listitem').first()).toContainText('Antes de las 23:00');
    await expect(grupo.getByRole('listitem').nth(1)).toContainText('Renovar el DNI');
    await expect(grupo.getByRole('listitem').nth(1).getByText('Vencida', { exact: true })).toBeVisible();
    // Debajo del compromiso
    const compromiso = await page.getByRole('button', { name: 'Dentista, 10:00 – 11:00' }).boundingBox();
    expect((await grupo.boundingBox())!.y).toBeGreaterThan(compromiso!.y);

    await page.getByRole('button', { name: 'Hecho: Pagar el recibo' }).click();
    await expect(grupo.getByRole('listitem')).toHaveCount(1);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(grupo.getByRole('listitem')).toHaveCount(2);

    for (const nivel of ['Semana', 'Mes']) {
      await page.getByRole('tab', { name: nivel }).click();
      await expect(page.getByRole('button', { name: `${nivel} siguiente` })).toBeVisible();
      await expect(page.getByRole('list', { name: 'Tareas para este día' })).toHaveCount(0);
    }
  });

  test('la conversación lista lo pendiente, por franja (REQ-CUN03-14)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await page.getByLabel('Pídele algo al asistente').fill('¿Qué tengo pendiente?');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByLabel('Pendientes', { exact: true })).toContainText('Con fecha');
    await expect(page.getByLabel('Pendientes', { exact: true })).toContainText('Esperando de alguien');
    await expect(page.getByLabel('Pendientes', { exact: true })).toContainText('Presupuesto');
  });
});
