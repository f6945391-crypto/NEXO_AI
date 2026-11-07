import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-052, T-053 · REQ-CUN03-06 a 11, 13 · specs/09-tareas-personales/tasks.md. La cuenta `tareas` tiene, sembradas
// por Operaciones en e2e/arrancar-api.mjs: «Pagar el recibo» hoy antes de las 23:00, «Renovar el DNI» vencida,
// «Enviar la tesis» en cinco días, «Llamar al dentista» y «Devolver el libro» sin fecha, «Presupuesto» de Juan
// y «Comprar el regalo», hecha ayer; y el compromiso «Dentista» hoy de 10:00 a 11:00. `tareasVacio` no tiene
// ninguna. Las pruebas corren en orden y dejan las tareas como estaban, salvo la que se descarta.

async function entrar(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

async function abrirTareas(page: Page) {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: 'Tareas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tareas' })).toBeVisible();
}

const pendientes = (page: Page) => page.getByRole('list', { name: 'Pendientes' }).getByRole('listitem');

test.describe.configure({ mode: 'serial' });

test.describe('web.tareas-por-franja', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('cada franja muestra las suyas en orden, con sus textos; una vencida dice «Vencía el…» (REQ-CUN03-06, 07)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await abrirTareas(page);
    await expect(page.getByRole('tab', { name: 'Con fecha' })).toHaveAttribute('aria-selected', 'true');
    await expect(pendientes(page).locator('.tarea__texto')).toHaveText(['Renovar el DNI', 'Pagar el recibo', 'Enviar la tesis']);
    await expect(pendientes(page).first()).toContainText(/Vencía el \p{L}+ \d+ de \p{L}+/u);
    await expect(pendientes(page).first().getByText('Vencida', { exact: true })).toBeVisible();
    await expect(pendientes(page).nth(1)).toContainText('Antes de las 23:00');

    await page.getByRole('tab', { name: 'Sin fecha' }).click();
    await expect(pendientes(page).locator('.tarea__texto')).toHaveText(['Llamar al dentista', 'Devolver el libro']);

    await page.getByRole('tab', { name: 'Esperando de alguien' }).click();
    await expect(pendientes(page).locator('.tarea__texto')).toHaveText(['Presupuesto']);
    await expect(pendientes(page).first()).toContainText(/De Juan · Desde el \p{L}+ \d+ de \p{L}+, hace 6 días/u);
    await expect(pendientes(page).first().getByRole('button', { name: 'Recibido: Presupuesto' })).toBeVisible();

    // R-42: ningún campo para escribir o editar una tarea a mano. R-40: nada de vocabulario interno
    await expect(page.locator('main input, main textarea, main form')).toHaveCount(0);
    await expect(page.getByRole('main').getByText(/franja|operaci[oó]n|pendiente sin fecha|episodio/i)).toHaveCount(0);
  });

  test('«Hecho» la pasa a las hechas sin tarjeta, «Deshacer» la devuelve, y «Reabrir» también (REQ-CUN03-09, 10)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await abrirTareas(page);
    await page.getByRole('button', { name: 'Hecho: Enviar la tesis' }).click();
    await expect(page.getByRole('status').filter({ hasText: '«Enviar la tesis» quedó hecha.' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Para confirmar' })).toHaveCount(0);
    await expect(pendientes(page).locator('.tarea__texto')).toHaveText(['Renovar el DNI', 'Pagar el recibo']);

    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(pendientes(page).locator('.tarea__texto')).toHaveText(['Renovar el DNI', 'Pagar el recibo', 'Enviar la tesis']);

    // Las hechas de los últimos siete días, al pie de su franja, con «Reabrir»
    await page.getByRole('button', { name: 'Hecho: Enviar la tesis' }).click();
    await expect(pendientes(page)).toHaveCount(2);
    await page.reload();
    await abrirTareas(page);
    await page.getByRole('button', { name: /^Ver hechas \(7 días\)/ }).click();
    const hechas = page.getByRole('region', { name: 'Hechas en los últimos 7 días' });
    await expect(hechas).toContainText(/Enviar la tesis\s*Hecha el \p{L}+ \d+ de \p{L}+/u);
    await hechas.getByRole('button', { name: 'Reabrir: Enviar la tesis' }).click();
    await expect(pendientes(page).locator('.tarea__texto')).toHaveText(['Renovar el DNI', 'Pagar el recibo', 'Enviar la tesis']);

    // «Comprar el regalo», hecha ayer, está al pie de «Sin fecha»
    await page.getByRole('tab', { name: 'Sin fecha' }).click();
    await page.getByRole('button', { name: /^Ver hechas \(7 días\)/ }).click();
    await expect(page.getByRole('region', { name: 'Hechas en los últimos 7 días' })).toContainText('Comprar el regalo');
  });

  test('descartar pide confirmación con la tarea exacta; «No descartar» la deja igual (REQ-CUN03-11)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await abrirTareas(page);
    await page.getByRole('tab', { name: 'Sin fecha' }).click();
    await page.getByRole('button', { name: 'Descartar: Devolver el libro' }).click();
    const tarjeta = page.getByRole('dialog').getByRole('article', { name: 'Para confirmar' });
    await expect(tarjeta.getByRole('heading', { name: 'Descartar la tarea' })).toBeVisible();
    await expect(tarjeta).toContainText('Devolver el libro');
    await expect(tarjeta).toContainText('Ya no aparecerá en tus tareas');
    await tarjeta.getByRole('button', { name: 'No descartar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(pendientes(page).locator('.tarea__texto')).toHaveText(['Llamar al dentista', 'Devolver el libro']);

    await page.getByRole('button', { name: 'Descartar: Devolver el libro' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(pendientes(page).locator('.tarea__texto')).toHaveText(['Llamar al dentista']);
    await page.getByRole('button', { name: /^Ver hechas \(7 días\)/ }).click();
    await expect(page.getByRole('region', { name: 'Hechas en los últimos 7 días' })).not.toContainText('Devolver el libro');
  });

  test('una franja vacía dice qué va ahí y su acción enfoca la entrada del asistente (REQ-CUN03-08)', async ({ page }) => {
    await entrar(page, cuentas.tareasVacio.correo);
    await abrirTareas(page);
    for (const [corte, titulo] of [
      ['Con fecha', 'Nada con fecha'],
      ['Sin fecha', 'Nada sin fecha'],
      ['Esperando de alguien', 'No esperas nada de nadie'],
    ]) {
      await page.getByRole('tab', { name: corte }).click();
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
    }
    await expect(page.getByRole('main')).toContainText('lo que esperas de otra persona');
    await page.getByRole('button', { name: 'Ampliar' }).click();
    await page.getByRole('button', { name: 'Pedírselo al asistente' }).click();
    await expect(page.getByLabel('Pídele algo al asistente')).toBeFocused();
    await expect(page.locator('main input, main textarea, main form')).toHaveCount(0);
  });

  test('«¿Qué tengo pendiente?» lista en la conversación las tareas tal como están, por franja (REQ-CUN03-14)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await page.getByLabel('Pídele algo al asistente').fill('¿Qué tengo pendiente?');
    await page.getByRole('button', { name: 'Enviar' }).click();
    const lista = page.getByRole('region', { name: 'Pendientes', exact: true });
    await expect(lista.getByRole('list', { name: 'Con fecha' }).getByRole('listitem')).toHaveCount(3);
    await expect(lista.getByRole('list', { name: 'Sin fecha' }).getByRole('listitem')).toHaveText(['Llamar al dentista']);
    await expect(lista.getByRole('list', { name: 'Esperando de alguien' }).getByRole('listitem')).toContainText(['Presupuesto']);
  });
});

test.describe('web.tareas-en-hoy', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Hoy muestra el compromiso y debajo «Tareas para este día», con la vencida marcada; nada en Semana ni en Mes (REQ-CUN03-13)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    const lienzo = page.getByRole('main');
    await expect(lienzo.getByRole('list', { name: 'Compromisos de hoy' }).locator('.compromiso__titulo')).toHaveText(['Dentista']);
    const grupo = lienzo.getByRole('region', { name: 'Tareas para este día' });
    await expect(grupo.locator('.tarea__texto')).toHaveText(['Pagar el recibo', 'Renovar el DNI']);
    await expect(grupo.getByRole('listitem').first()).toContainText('Antes de las 23:00');
    await expect(grupo.getByRole('listitem').nth(1).getByText('Vencida', { exact: true })).toBeVisible();
    // El grupo va debajo de los compromisos y fuera de su lista
    const compromisos = await lienzo.getByRole('list', { name: 'Compromisos de hoy' }).boundingBox();
    const tareas = await grupo.boundingBox();
    expect(tareas!.y).toBeGreaterThan(compromisos!.y + compromisos!.height - 1);
    await expect(lienzo.getByRole('list', { name: 'Compromisos de hoy' })).not.toContainText('Pagar el recibo');

    // «Hecho» desde Hoy, y «Deshacer»
    await grupo.getByRole('button', { name: 'Hecho: Pagar el recibo' }).click();
    await expect(grupo.locator('.tarea__texto')).toHaveText(['Renovar el DNI']);
    await grupo.getByRole('button', { name: 'Deshacer' }).click();
    await expect(grupo.locator('.tarea__texto')).toHaveText(['Pagar el recibo', 'Renovar el DNI']);

    // Otro día: solo las de ese día, sin las vencidas. Semana y Mes, sin tareas
    for (const corte of ['Semana', 'Mes']) {
      await page.getByRole('tab', { name: corte }).click();
      await expect(page.getByRole('tab', { name: corte })).toHaveAttribute('aria-selected', 'true');
      await expect(lienzo.getByRole('region', { name: 'Tareas para este día' })).toHaveCount(0);
      await expect(lienzo).not.toContainText('Pagar el recibo');
    }
    const enCinco = new Date(Date.parse(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())}T12:00:00Z`) + 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await page.goto(`/?fecha=${enCinco}`);
    await expect(page.getByRole('heading', { name: /no tienes compromisos$/ })).toBeVisible();
    await expect(lienzo.getByRole('region', { name: 'Tareas para este día' }).locator('.tarea__texto')).toHaveText(['Enviar la tesis']);
  });
});
