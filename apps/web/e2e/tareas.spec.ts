import { expect, test, type Browser, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-052, T-053 · REQ-CUN03-06 a 11, 13 · specs/09-tareas-personales/tasks.md. La cuenta `tareas` tiene, sembradas
// por Operaciones en e2e/arrancar-api.mjs: «Pagar el recibo» hoy antes de las 23:00, «Renovar el DNI» vencida,
// «Enviar la tesis» en cinco días, «Llamar al dentista» y «Devolver el libro» sin fecha, «Presupuesto» de Juan
// y «Comprar el regalo», hecha ayer; y el compromiso «Dentista» hoy de 10:00 a 11:00. `tareasVacio` no tiene
// ninguna. Las pruebas corren en orden y dejan las tareas como estaban, salvo la que se descarta y el aviso de
// «Renovar el DNI», que «web.tareas-bitacora», al final, deja sin mostrar (T-127).

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

// T-127 · REQ-CUN03-23, 24, 26, 27 · specs/09-tareas-personales/plan.md §13.6. Al final del archivo, con la misma
// cuenta: «Enviar la tesis» tiene el contexto «La reviso con la profesora Díaz» y dos avances (hace dos días y hace
// uno), y «Renovar el DNI», vencida hace tres días, su aviso. «Mantener abierta» lo quita, y por eso va después de
// las pruebas de arriba. Una sola entrada para las tres: la API admite cinco intentos por minuto y correo, y las
// de arriba ya entran cinco veces; si aun así salta el límite, se espera el minuto y se vuelve a entrar.

let sesion: Page;

async function entrarUnaVez(browser: Browser, baseURL: string | undefined) {
  sesion = await browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } });
  for (let intento = 0; intento < 2; intento++) {
    await sesion.goto('/entrar');
    await sesion.getByLabel('Correo').fill(cuentas.tareas.correo);
    await sesion.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await sesion.getByRole('button', { name: 'Entrar' }).click();
    const agenda = sesion.getByRole('heading', { level: 1, name: 'Agenda' });
    const limite = sesion.getByRole('alert').filter({ hasText: 'Demasiados intentos' });
    await expect(agenda.or(limite)).toBeVisible();
    if (await agenda.isVisible()) return;
    await sesion.waitForTimeout(61_000);
  }
  await expect(sesion.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

async function volverAAgenda(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

const listaPendientes = (page: Page) => page.getByRole('list', { name: 'Pendientes' });
const tarea = (page: Page, texto: string) => listaPendientes(page).getByRole('listitem').filter({ has: page.locator('.tarea__texto', { hasText: texto }) });

test.describe('web.tareas-bitacora', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(150_000);
    await entrarUnaVez(browser, baseURL);
  });
  test.afterAll(async () => sesion?.close());

  test('bajo la tarea, su contexto y el último avance; «Ver bitácora (2)» despliega los dos, del más reciente al más antiguo (REQ-CUN03-24, 26)', async () => {
    const page = sesion;
    await volverAAgenda(page);
    await abrirTareas(page);
    const tesis = tarea(page, 'Enviar la tesis');
    await expect(tesis.locator('.tarea__contexto')).toHaveText('La reviso con la profesora Díaz');
    await expect(tesis.locator('.tarea__avance')).toHaveText(/^\p{Lu}\p{L}+ \d+ · Me devolvió correcciones; falta la bibliografía$/u);
    // T-130 · REQ-CUN03-28 · H-TP-35: el resumen del asistente, con su fecha y su etiqueta, sobre el último avance
    const resumen = tesis.getByRole('note', { name: 'Resumen de Enviar la tesis' });
    await expect(resumen.locator('.resumen-bitacora__etiqueta')).toHaveText('Escrito por el asistente');
    await expect(resumen.locator('.resumen-bitacora__texto')).toHaveText(
      /^Resumen al \p{Ll}+ \d+ de \p{L}+ · Correcciones recibidas de la profesora Díaz; falta la bibliografía\.$/u,
    );
    expect((await resumen.boundingBox())!.y).toBeLessThan((await tesis.locator('.tarea__avance').boundingBox())!.y);

    const ver = tesis.getByRole('button', { name: 'Ver bitácora (2)' });
    await expect(ver).toHaveAttribute('aria-expanded', 'false');
    await ver.click();
    const bitacora = page.getByRole('list', { name: 'Bitácora de Enviar la tesis' });
    await expect(bitacora.getByRole('listitem')).toHaveCount(2);
    await expect(bitacora.getByRole('listitem').nth(0)).toContainText('Me devolvió correcciones; falta la bibliografía');
    await expect(bitacora.getByRole('listitem').nth(1)).toContainText('Mandé el capítulo 3 a la profesora Díaz');
    // Cada avance con su fecha y su hora, como la arma la API
    await expect(bitacora.getByRole('listitem').nth(0)).toContainText(/\p{L}+ \d+ de \p{L}+, \d{2}:\d{2}/u);

    const ocultar = tesis.getByRole('button', { name: 'Ocultar bitácora' });
    await expect(ocultar).toHaveAttribute('aria-expanded', 'true');
    await ocultar.click();
    await expect(page.getByRole('list', { name: 'Bitácora de Enviar la tesis' })).toHaveCount(0);

    // Una tarea sin avances ni contexto no muestra nada de eso
    const recibo = tarea(page, 'Pagar el recibo');
    await expect(recibo.locator('.tarea__contexto, .tarea__bitacora')).toHaveCount(0);
    // T-130: ni resumen
    await expect(recibo.getByRole('note', { name: /^Resumen de/ })).toHaveCount(0);
  });

  test('una tarea vencida avisa con «Darla por hecha» y «Mantener abierta»; mantenerla quita el aviso, también al recargar, y sigue vencida (REQ-CUN03-27)', async () => {
    const page = sesion;
    await volverAAgenda(page);
    await abrirTareas(page);
    const dni = tarea(page, 'Renovar el DNI');
    const aviso = dni.getByRole('region', { name: /^Aviso: Renovar el DNI/ });
    await expect(aviso).toContainText(/^Venció el \p{L}+ \d+ de \p{L}+\. ¿La das por hecha o la mantienes abierta\?/u);
    await expect(aviso.getByRole('button', { name: 'Darla por hecha' })).toBeVisible();
    await expect(aviso.getByRole('button', { name: 'Mantener abierta' })).toBeVisible();
    // Solo la vencida lleva aviso
    await expect(listaPendientes(page).getByRole('region', { name: /^Aviso:/ })).toHaveCount(1);

    // «Darla por hecha» es el «Hecho» de siempre, con «Deshacer»
    await aviso.getByRole('button', { name: 'Darla por hecha' }).click();
    await expect(page.getByRole('status').filter({ hasText: '«Renovar el DNI» quedó hecha.' })).toBeVisible();
    await expect(tarea(page, 'Renovar el DNI')).toHaveCount(0);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(tarea(page, 'Renovar el DNI').getByRole('region', { name: /^Aviso:/ })).toBeVisible();

    await tarea(page, 'Renovar el DNI').getByRole('button', { name: 'Mantener abierta' }).click();
    await expect(tarea(page, 'Renovar el DNI').getByRole('region', { name: /^Aviso:/ })).toHaveCount(0);
    await expect(tarea(page, 'Renovar el DNI').getByText('Vencida', { exact: true })).toBeVisible();

    await page.reload();
    await abrirTareas(page);
    await expect(tarea(page, 'Renovar el DNI')).toHaveCount(1);
    await expect(tarea(page, 'Renovar el DNI').getByText('Vencida', { exact: true })).toBeVisible();
    await expect(listaPendientes(page).getByRole('region', { name: /^Aviso:/ })).toHaveCount(0);
  });

  test('«¿cómo va enviar la tesis?» muestra en la conversación el resumen y, debajo, la bitácora tal como está (REQ-CUN03-23, 28)', async () => {
    const page = sesion;
    await volverAAgenda(page);
    await page.getByLabel('Pídele algo al asistente').fill('¿cómo va enviar la tesis?');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    const turno = page.getByRole('region', { name: 'Bitácora de Enviar la tesis' });
    await expect(turno.getByRole('heading', { name: 'Enviar la tesis' })).toBeVisible();
    await expect(turno).toContainText('La reviso con la profesora Díaz');
    const avances = turno.getByRole('list', { name: 'Avances de Enviar la tesis' }).getByRole('listitem');
    await expect(avances).toHaveCount(2);
    await expect(avances.nth(0)).toContainText(/\p{L}+ \d+ de \p{L}+, \d{2}:\d{2}\s*Me devolvió correcciones; falta la bibliografía/u);
    await expect(avances.nth(1)).toContainText('Mandé el capítulo 3 a la profesora Díaz');
    // T-130 · REQ-CUN03-28: el resumen arriba, junto a los avances y no en su lugar (H-TP-29)
    const resumen = turno.getByRole('note', { name: 'Resumen de Enviar la tesis' });
    await expect(resumen).toContainText('Escrito por el asistente');
    await expect(resumen).toContainText(/Resumen al \p{Ll}+ \d+ de \p{L}+ · Correcciones recibidas de la profesora Díaz; falta la bibliografía\./u);
    expect((await resumen.boundingBox())!.y).toBeLessThan((await turno.getByRole('list', { name: 'Avances de Enviar la tesis' }).boundingBox())!.y);
    // No propone nada
    await expect(page.getByRole('article', { name: 'Para confirmar' })).toHaveCount(0);
  });
});
