import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-035 · REQ-CAP-01, 23 · REQ-CUN01-01, 04 en el móvil. La API de estas pruebas usa el modelo simulado con el
// guion de demostración (H-AGT-02) y el calendario simulado: nunca Groq ni Google.

async function entrar(page: Page, correo: string) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
}

async function pedir(page: Page, texto: string) {
  await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
  await page.getByLabel('Pídele algo al asistente').fill(texto);
  await page.getByRole('button', { name: 'Enviar' }).click();
}

test.describe('movil.captura-propone-y-confirma', () => {
  test('desde la capa se pide un compromiso, se confirma en su tarjeta y aparece en Hoy', async ({ page }) => {
    await entrar(page, cuentas.captura.correo);
    await expect(page.getByText('Hoy no tienes compromisos')).toBeVisible();

    await pedir(page, 'Agéndame una revisión hoy a las 23');
    const tarjeta = page.getByLabel('Para confirmar');
    await expect(tarjeta).toContainText('Registrar este compromiso en tu calendario de Google');
    // H-CAP-01: plegada, con el compromiso, cuándo con su zona (P-05) y lo que puso el sistema por su cuenta
    // (decisión 19 de 02-agenda); las etiquetas, a demanda y en la misma tarjeta
    await expect(tarjeta.getByText('Revisión', { exact: true })).toBeVisible();
    // T-043 (REQ-CUN01-01): el fin cae al día siguiente, y la tarjeta dice qué día
    await expect(tarjeta.getByText(/^.+ · 23:00 – 00:00 \([a-záéíóú]+, \d+ de [a-z]+\) · Hora de Lima \(GMT-5\)$/)).toBeVisible();
    await expect(tarjeta.getByText('1 hora, porque no indicaste la hora de fin', { exact: true })).toBeVisible();
    // Al llegar, la tarjeta entera queda a la vista, botones incluidos
    await expect(tarjeta.getByRole('button', { name: 'Confirmar' })).toBeInViewport();
    await expect(tarjeta.getByRole('button', { name: 'Descartar' })).toBeInViewport();
    await expect(tarjeta.getByText('Zona horaria', { exact: true })).toHaveCount(0);
    await tarjeta.getByRole('button', { name: 'Ver detalles' }).click();
    await expect(tarjeta.getByText('Zona horaria', { exact: true })).toBeVisible();
    await expect(tarjeta.getByRole('button', { name: 'Ocultar detalles' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toBeVisible();
    // T-039 · REQ-AGT-03: la línea que dice qué se hizo
    await expect(page.getByRole('separator', { name: /Se registró «Revisión»$/ })).toBeVisible();
    // La tarjeta decidida queda plegada, sin botones, y dice qué se decidió
    await expect(tarjeta.getByText('Confirmado', { exact: true })).toBeVisible();
    await expect(tarjeta.getByRole('button')).toHaveCount(0);
    await expect(tarjeta.getByText('Zona horaria', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('button', { name: /^Revisión, 23:00 – 00:00$/ })).toBeVisible();

    // Al volver a abrir la capa, lo anterior sigue ahí
    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await expect(page.getByText(/^Listo: «Revisión» quedó en tu calendario/)).toBeVisible();
    await expect(page.getByRole('separator', { name: /Se registró «Revisión»$/ })).toBeVisible();
  });

  // Pulido · REQ-CUN01-05: la cuenta semanaLlena tiene «Llamada con proveedores» mañana de 10:00 a 11:00
  test('un choque de horario se avisa en una línea que nombra el compromiso con el que se cruza', async ({ page }) => {
    await entrar(page, cuentas.semanaLlena.correo);
    await pedir(page, 'Agéndame una revisión mañana a las 10');
    const tarjeta = page.getByLabel('Para confirmar').last();
    const aviso = tarjeta.getByText('Se cruza con «Llamada con proveedores»', { exact: true });
    await expect(aviso).toBeVisible();
    const alto = await aviso.evaluate((p) => p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).fontSize));
    expect(alto).toBeLessThan(2);
    await expect(tarjeta.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    await expect(tarjeta.getByRole('button', { name: 'Descartar' })).toBeVisible();

    // H-CAP-01: las alternativas son botones y no se repiten en texto, ni plegada ni con el detalle abierto
    await expect(tarjeta.getByRole('button', { name: /^\p{L}+, \d+ de \p{L}+, \d{2}:\d{2} – \d{2}:\d{2}$/u }).first()).toBeVisible();
    await expect(tarjeta.getByText('Alternativas', { exact: true })).toHaveCount(0);
    await tarjeta.getByRole('button', { name: 'Ver detalles' }).click();
    await expect(tarjeta.getByText('Zona horaria', { exact: true })).toBeVisible();
    await expect(tarjeta.getByText('Alternativas', { exact: true })).toHaveCount(0);
  });

  // H-CAP-02: el campo y el botón de enviar en la misma fila; vacío, el botón se atenúa y la barra no cambia de alto
  test('la barra de escritura es una sola fila con el botón de enviar dentro', async ({ page }) => {
    await entrar(page, cuentas.captura.correo);
    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    const campo = page.getByLabel('Pídele algo al asistente');
    const enviar = page.getByRole('button', { name: 'Enviar', exact: true });
    await expect(enviar).toBeDisabled();
    const barra = enviar.locator('..');
    // Las tres cajas en el mismo instante: la capa puede estar todavía subiendo
    const medir = () =>
      barra.evaluate((contorno) => {
        const caja = (e: Element) => e.getBoundingClientRect();
        return { contorno: caja(contorno), campo: caja(contorno.querySelector('textarea')!), enviar: caja(contorno.querySelector('[role="button"][aria-label="Enviar"]')!) };
      });
    const vacia = await medir();
    // Dentro del mismo contorno y a la derecha del campo
    expect(vacia.enviar.left).toBeGreaterThanOrEqual(vacia.campo.right);
    expect(vacia.enviar.top).toBeGreaterThanOrEqual(vacia.contorno.top);
    expect(vacia.enviar.bottom).toBeLessThanOrEqual(vacia.contorno.bottom);
    expect(vacia.campo.top).toBeGreaterThanOrEqual(vacia.contorno.top);
    await campo.fill('Agéndame una revisión mañana');
    await expect(enviar).toBeEnabled();
    expect((await medir()).contorno.height).toBeCloseTo(vacia.contorno.height, 1);
  });
});

test.describe('movil.captura-en-espera', () => {
  test('lo que queda en espera se ve como en espera, no como un fallo, y sigue al volver a abrir la capa (REQ-CAP-23)', async ({ page }) => {
    await entrar(page, cuentas.capturaEspera.correo);
    // T-050: una tarea ya no queda en espera; un compromiso sin el calendario conectado, sí
    await pedir(page, 'Agéndame una reunión mañana a las 10');
    const aviso = page.getByText(/^En espera\. Para eso necesito permiso para ver y editar tu calendario de Google/);
    await expect(aviso).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.getByRole('button', { name: 'Cerrar' }).click();
    await page.getByRole('button', { name: 'Pedir algo al asistente' }).click();
    await expect(aviso).toBeVisible();
  });
});
