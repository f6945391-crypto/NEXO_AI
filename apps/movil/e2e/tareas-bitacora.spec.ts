import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-128 · REQ-CUN03-24, 26, 27 en el móvil, a 390 × 844. La cuenta `tareasBitacora` recibe en
// apps/web/e2e/arrancar-api.mjs las mismas tareas que `tareas`: «Enviar la tesis» en cinco días, con el contexto
// «La reviso con la profesora Díaz» y dos avances (hace dos días y hace uno), y «Renovar el DNI» vencida hace tres
// días, con su aviso. Es otra cuenta para no compartir datos con tareas.spec.ts ni su límite de 5 ingresos por
// minuto; y por ese límite las pruebas van en orden sobre una sola página, que entra una vez (y otra al recargar).
// Con CAPTURAS_BITACORA=<carpeta>, guarda las capturas (design/capturas/2026-11-25-bitacora/movil).

const CAPTURAS = process.env.CAPTURAS_BITACORA;

async function capturar(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
}

// En Expo web la sesión vive en memoria: recargar pide entrar otra vez
async function entrar(page: Page) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(cuentas.tareasBitacora.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

async function abrirTareas(page: Page) {
  await page.getByRole('tab', { name: 'Tareas' }).click();
  await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible();
}

const pendientes = (page: Page) => page.getByRole('list', { name: 'Pendientes' }).getByRole('listitem');
const fila = (page: Page, texto: string) => pendientes(page).filter({ has: page.getByRole('button', { name: `${texto}, ver detalle` }) });

test.describe.configure({ mode: 'serial' });

let page: Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await entrar(page);
});
test.afterAll(async () => {
  await page.close();
});

test.describe('movil.tareas-bitacora', () => {
  test('bajo la tarea, su contexto y el último avance; «Ver bitácora (2)» despliega los dos, el más reciente primero (REQ-CUN03-24, 26)', async () => {
    await abrirTareas(page);
    const tesis = fila(page, 'Enviar la tesis');
    await expect(tesis.getByText('La reviso con la profesora Díaz', { exact: true })).toBeVisible();
    await expect(tesis.getByText(/^\p{L}+ \d+ · Me devolvió correcciones; falta la bibliografía$/u)).toBeVisible();
    // T-130 · REQ-CUN03-28 · H-TP-35: el resumen del asistente, con su fecha y su etiqueta, sobre el último avance
    const resumen = tesis.getByRole('note', { name: 'Resumen de Enviar la tesis' });
    await expect(resumen).toContainText('Escrito por el asistente');
    await expect(resumen).toContainText(/Resumen al \p{Ll}+ \d+ de \p{L}+ · Correcciones recibidas de la profesora Díaz; falta la bibliografía\./u);
    expect((await resumen.boundingBox())!.y).toBeLessThan((await tesis.getByText(/^\p{L}+ \d+ · Me devolvió correcciones/u).boundingBox())!.y);
    // El más antiguo no se ve con la bitácora plegada
    await expect(tesis.getByText('Mandé el capítulo 3 a la profesora Díaz')).toHaveCount(0);
    // Una tarea sin avances no muestra nada de bitácora
    await expect(fila(page, 'Pagar el recibo').getByRole('button', { name: /^Ver bitácora/ })).toHaveCount(0);
    // T-130: ni resumen
    await expect(fila(page, 'Pagar el recibo').getByRole('note', { name: /^Resumen de/ })).toHaveCount(0);
    await capturar(page, '01-tareas-bitacora-plegada');

    const ver = tesis.getByRole('button', { name: 'Ver bitácora de Enviar la tesis, 2 avances' });
    await expect(ver).toHaveText('Ver bitácora (2)');
    await expect(ver).toHaveAttribute('aria-expanded', 'false');
    expect((await ver.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await ver.click();

    const bitacora = tesis.getByRole('list', { name: 'Bitácora de Enviar la tesis' });
    await expect(bitacora.getByRole('listitem')).toHaveCount(2);
    await expect(bitacora.getByRole('listitem').nth(0)).toContainText(/^\p{L}+ \d+ de \p{L}+, \d{2}:\d{2}Me devolvió correcciones; falta la bibliografía$/u);
    await expect(bitacora.getByRole('listitem').nth(1)).toContainText(/^\p{L}+ \d+ de \p{L}+, \d{2}:\d{2}Mandé el capítulo 3 a la profesora Díaz$/u);
    await capturar(page, '02-tareas-bitacora-desplegada');

    const ocultar = tesis.getByRole('button', { name: 'Ocultar bitácora de Enviar la tesis' });
    await expect(ocultar).toHaveAttribute('aria-expanded', 'true');
    await ocultar.click();
    await expect(bitacora).toHaveCount(0);
  });

  test('la tarea vencida muestra el aviso; «Darla por hecha» es el «Hecho» con «Deshacer» (REQ-CUN03-27)', async () => {
    await abrirTareas(page);
    const dni = fila(page, 'Renovar el DNI');
    await expect(dni.getByText(/^Venció el \p{L}+ \d+ de \p{L}+\. ¿La das por hecha o la mantienes abierta\?$/u)).toBeVisible();
    // Solo la vencida lo lleva
    await expect(page.getByText(/¿La das por hecha o la mantienes abierta\?/)).toHaveCount(1);
    for (const nombre of ['Darla por hecha: Renovar el DNI', 'Mantener abierta: Renovar el DNI']) {
      expect((await dni.getByRole('button', { name: nombre }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }

    await dni.getByRole('button', { name: 'Darla por hecha: Renovar el DNI' }).click();
    await expect(page.getByText('«Renovar el DNI» quedó hecha.')).toBeVisible();
    await expect(fila(page, 'Renovar el DNI')).toHaveCount(0);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(fila(page, 'Renovar el DNI').getByText(/¿La das por hecha o la mantienes abierta\?/)).toBeVisible();
  });

  test('«Mantener abierta» quita el aviso, también al volver a entrar, y la tarea sigue vencida (REQ-CUN03-27)', async () => {
    await abrirTareas(page);
    await fila(page, 'Renovar el DNI').getByRole('button', { name: 'Mantener abierta: Renovar el DNI' }).click();
    await expect(page.getByText(/¿La das por hecha o la mantienes abierta\?/)).toHaveCount(0);
    const dni = fila(page, 'Renovar el DNI');
    await expect(dni.getByText('Vencida', { exact: true })).toBeVisible();
    await expect(dni).toContainText(/Vencía el \p{L}+ \d+ de \p{L}+/u);
    await capturar(page, '03-tareas-aviso-mantener-abierta');

    await page.reload();
    await entrar(page);
    await abrirTareas(page);
    await expect(fila(page, 'Renovar el DNI').getByText('Vencida', { exact: true })).toBeVisible();
    await expect(page.getByText(/¿La das por hecha o la mantienes abierta\?/)).toHaveCount(0);
  });

  test('en la capa de captura, «¿cómo va…?» muestra el resumen y la bitácora tal como está, y un avance se propone en su tarjeta (REQ-CUN03-21, 23, 28)', async () => {
    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await page.getByLabel('Pídele algo al asistente').fill('¿cómo va enviar la tesis?');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    const comoVa = page.getByLabel('Cómo va «Enviar la tesis»');
    await expect(comoVa).toContainText('La reviso con la profesora Díaz');
    const avances = comoVa.getByRole('listitem');
    await expect(avances).toHaveCount(2);
    await expect(avances.nth(0)).toContainText('Me devolvió correcciones; falta la bibliografía');
    await expect(avances.nth(1)).toContainText('Mandé el capítulo 3 a la profesora Díaz');
    await expect(avances.nth(0)).toContainText(/\p{L}+ \d+ de \p{L}+, \d{2}:\d{2}/u);
    // T-130 · REQ-CUN03-28: el resumen arriba, junto a los avances y no en su lugar (H-TP-29)
    const resumen = comoVa.getByRole('note', { name: 'Resumen de Enviar la tesis' });
    await expect(resumen).toContainText('Escrito por el asistente');
    await expect(resumen).toContainText(/Resumen al \p{Ll}+ \d+ de \p{L}+ · Correcciones recibidas de la profesora Díaz; falta la bibliografía\./u);
    expect((await resumen.boundingBox())!.y).toBeLessThan((await avances.nth(0).boundingBox())!.y);
    await capturar(page, '04-captura-como-va');

    // La tarjeta plegada dice la tarea y el texto que se anotará; no se confirma, para no tocar los datos compartidos
    await page.getByLabel('Pídele algo al asistente').fill('sobre enviar la tesis: ya agregué la bibliografía');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    const tarjeta = page.getByLabel('Para confirmar');
    await expect(tarjeta).toContainText('Anotar avance');
    await expect(tarjeta).toContainText('Enviar la tesis');
    await expect(tarjeta).toContainText(/«Ya agregué la bibliografía»/i);
    await expect(tarjeta.getByRole('button', { name: 'Confirmar' })).toBeVisible();
    await capturar(page, '05-captura-anotar-avance');
    await tarjeta.getByRole('button', { name: 'Descartar' }).click();
    await expect(tarjeta).toContainText('Descartado');
  });
});
