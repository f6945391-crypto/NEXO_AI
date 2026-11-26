import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// REQ-ACC-19 · T-123 · specs/06-acceso/plan.md §5.8. Pedir el enlace para restablecer la contraseña desde el
// móvil, sin sesión. El enlace abre la web (H-ACC-10): aquí solo se comprueba que el correo sale, y con él.
// La API de las pruebas usa el correo simulado y escribe cada correo, una línea JSON, en este archivo.
// Con CAPTURAS_RESTABLECER=<carpeta>, guarda las capturas (design/capturas/2026-11-26-restablecer/movil).

const CAPTURAS = process.env.CAPTURAS_RESTABLECER;
const CORREOS = resolve(__dirname, '..', '..', 'web', 'test-results', `correos-${process.env.PUERTO_API_E2E}.jsonl`);
const ENVIADO =
  'Si ese correo tiene una cuenta en NexoAI, te enviamos un enlace. Revisa tu bandeja de entrada y el correo no deseado. El enlace vence en 30 minutos y se abre en el navegador.';
const INEXISTENTE = 'nadie-movil@nexoai.test';

type Correo = { para: string; asunto: string; texto: string; html: string; en: string };

function correosDesde(inicio: number): Correo[] {
  if (!existsSync(CORREOS)) return [];
  return readFileSync(CORREOS, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((linea: string) => JSON.parse(linea) as Correo)
    .filter((c: Correo) => Date.parse(c.en) >= inicio);
}

async function capturar(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
}

async function abrirRestablecer(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Entra en NexoAI' })).toBeVisible();
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page.getByRole('heading', { name: 'Restablecer tu contraseña' })).toBeVisible();
}

test.describe('movil.restablecer', () => {
  // El simulado no crea la carpeta: si falta, el correo no llega al archivo
  test.beforeAll(() => mkdirSync(dirname(CORREOS), { recursive: true }));

  test('el enlace de Entrar abre Restablecer', async ({ page }) => {
    await page.goto('/');
    const enlace = page.getByRole('link', { name: '¿Olvidaste tu contraseña?' });
    await expect(enlace).toBeVisible();
    // RT-20: área táctil de al menos 44 px
    expect((await enlace.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await capturar(page, '01-entrar-con-enlace');
    await enlace.click();
    await expect(page.getByRole('heading', { name: 'Restablecer tu contraseña' })).toBeVisible();
    await expect(page.getByText('Escribe el correo con el que entras a NexoAI. Si tiene una cuenta, te enviaremos un enlace para elegir una contraseña nueva.')).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar enlace' })).toBeVisible();
  });

  test('con una cuenta, dice que lo envió y el correo trae el enlace a la web', async ({ page }) => {
    const inicio = Date.now() - 1000;
    await abrirRestablecer(page);
    await page.getByLabel('Correo').fill(cuentas.restablecer.correo);
    await capturar(page, '02-pedir-enlace');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText(ENVIADO)).toBeVisible();
    await capturar(page, '03-enlace-enviado');

    await expect.poll(() => correosDesde(inicio).filter((c) => c.para === cuentas.restablecer.correo).length).toBe(1);
    const [correo] = correosDesde(inicio).filter((c) => c.para === cuentas.restablecer.correo);
    expect(correo?.texto).toContain('/restablecer?token=');
  });

  test('con un correo sin cuenta, el mismo mensaje y ningún correo', async ({ page }) => {
    const inicio = Date.now() - 1000;
    const antes = correosDesde(inicio).length;
    await abrirRestablecer(page);
    await page.getByLabel('Correo').fill(INEXISTENTE);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText(ENVIADO)).toBeVisible();
    // El envío no se espera en la API: se da un margen antes de mirar
    await page.waitForTimeout(1500);
    expect(correosDesde(inicio).filter((c) => c.para === INEXISTENTE)).toHaveLength(0);
    expect(correosDesde(inicio)).toHaveLength(antes);
  });

  test('«Volver a Entrar» vuelve a Entrar', async ({ page }) => {
    await abrirRestablecer(page);
    await page.getByRole('button', { name: 'Volver a Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Entra en NexoAI' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  });
});
