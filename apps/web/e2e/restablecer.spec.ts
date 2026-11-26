import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// REQ-ACC-19 · T-123 · specs/06-acceso/plan.md §5.8. Restablecer la contraseña por enlace, en la web.
// La API de las pruebas escribe cada correo en un archivo, una línea JSON (arrancar-api.mjs); de ahí sale el enlace.
// Con CAPTURAS_RESTABLECER=<carpeta>, guarda las capturas (design/capturas/2026-11-26-restablecer/web).

const CAPTURAS = process.env.CAPTURAS_RESTABLECER;
async function capturar(page: Page, nombre: string) {
  if (!CAPTURAS) return;
  // El indicador de desarrollo de Next.js no es parte de la aplicación
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
}

const ARCHIVO_CORREOS = resolve(__dirname, `../test-results/correos-${process.env.PUERTO_API_E2E ?? '3102'}.jsonl`);
type Correo = { para: string; asunto: string; texto: string; html: string; en: string };

function correosPara(para: string, desde: number): Correo[] {
  if (!existsSync(ARCHIVO_CORREOS)) return [];
  return readFileSync(ARCHIVO_CORREOS, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((linea) => JSON.parse(linea) as Correo)
    .filter((c) => c.para === para && Date.parse(c.en) >= desde);
}

const CUENTA = cuentas.restablecer.correo;
const INEXISTENTE = 'nadie-por-aqui-e2e@nexoai.test';
const NUEVA = 'restablecida-desde-el-correo';
const MENSAJE_ENVIADO =
  'Si ese correo tiene una cuenta en NexoAI, te enviamos un enlace. Revisa tu bandeja de entrada y el correo no deseado. El enlace vence en 30 minutos.';
const MENSAJE_NO_VALIDO = 'El enlace no es válido o ya venció. Pide otro desde Entrar.';

async function entrar(page: Page, correo: string, contrasena: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(contrasena);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

// Las peticiones de una acción de servidor llevan la cabecera Next-Action: si no hay ninguna, la API no se llamó
function contarAcciones(page: Page): () => number {
  let n = 0;
  page.on('request', (peticion) => {
    if (peticion.method() === 'POST' && peticion.headers()['next-action']) n++;
  });
  return () => n;
}

test.describe('web.restablecer', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 1440, height: 900 } });

  // El enlace del correo, para volver a usarlo en el último caso
  let enlace = '';

  test.beforeAll(() => {
    // El correo simulado escribe en test-results, que Playwright puede vaciar al empezar
    mkdirSync(dirname(ARCHIVO_CORREOS), { recursive: true });
  });

  test('Entrar lleva a restablecer la contraseña', async ({ page }) => {
    await page.goto('/entrar');
    const olvide = page.getByRole('link', { name: '¿Olvidaste tu contraseña?' });
    await expect(olvide).toBeVisible();
    await capturar(page, '01-entrar-con-enlace');
    await olvide.click();
    await expect(page).toHaveURL(/\/restablecer$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Restablecer tu contraseña' })).toBeVisible();
    await expect(page.getByText('Escribe el correo con el que entras a NexoAI.', { exact: false })).toBeVisible();
    await page.getByRole('link', { name: 'Volver a Entrar' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('la entrada de la zona de empresa también tiene el enlace (H-ACC-09)', async ({ page }) => {
    await page.goto('/administracion/entrar');
    const olvide = page.getByRole('link', { name: '¿Olvidaste tu contraseña?' });
    await expect(olvide).toBeVisible();
    await capturar(page, '08-zona-empresa-con-enlace');
    await olvide.click();
    await expect(page).toHaveURL(/\/restablecer$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Restablecer tu contraseña' })).toBeVisible();
  });

  test('con un correo que no existe el mensaje es el mismo y no sale ningún correo', async ({ page }) => {
    const desde = Date.now();
    await page.goto('/restablecer');
    await page.getByLabel('Correo').fill(INEXISTENTE);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('main').getByRole('status')).toHaveText(MENSAJE_ENVIADO);
    await expect(page.getByLabel('Correo')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Volver a Entrar' })).toBeVisible();
    // La API no espera al correo: se le da un momento antes de comprobar que no salió nada
    await page.waitForTimeout(1000);
    expect(correosPara(INEXISTENTE, desde)).toHaveLength(0);
  });

  test('pedir el enlace, cambiar la contraseña y entrar con la nueva; la vieja ya no vale', async ({ page }) => {
    // Con una sesión abierta en este navegador: restablecer no la necesita ni lleva a la aplicación
    await entrar(page, CUENTA, cuentas.contrasenaTemporal);
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();

    const desde = Date.now();
    await page.goto('/restablecer');
    await expect(page.getByRole('heading', { level: 1, name: 'Restablecer tu contraseña' })).toBeVisible();
    await page.getByLabel('Correo').fill(CUENTA);
    await capturar(page, '02-pedir-enlace');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByRole('main').getByRole('status')).toHaveText(MENSAJE_ENVIADO);
    await capturar(page, '03-enlace-enviado');

    await expect.poll(() => correosPara(CUENTA, desde).length).toBe(1);
    const correo = correosPara(CUENTA, desde)[0]!;
    expect(correo.asunto).toBe('Restablece tu contraseña de NexoAI');
    const url = correo.texto.match(/https?:\/\/\S+\/restablecer\?token=\S+/)?.[0];
    expect(url).toBeTruthy();
    const { pathname, search } = new URL(url!);
    enlace = `${pathname}${search}`;

    await page.goto(enlace);
    await expect(page.getByRole('heading', { level: 1, name: 'Elige una contraseña nueva' })).toBeVisible();
    await expect(page.getByText('Al menos 12 caracteres. Al cambiarla se cierran todas tus sesiones abiertas.')).toBeVisible();
    await capturar(page, '04-elegir-nueva');

    await page.getByLabel('Contraseña nueva', { exact: true }).fill(NUEVA);
    await page.getByLabel('Repite la contraseña').fill(NUEVA);
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('main').getByRole('status')).toHaveText('Listo. Ya puedes entrar con tu contraseña nueva.');
    await capturar(page, '06-cambiada');

    // «Entrar» lleva a Entrar, y no a la aplicación: la sesión que había en el navegador ya no está
    await page.getByRole('link', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Entra en NexoAI' })).toBeVisible();
    await page.goto('/');
    await expect(page).toHaveURL(/\/entrar$/);

    // La vieja falla y la nueva entra
    await entrar(page, CUENTA, cuentas.contrasenaTemporal);
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/entrar$/);
    await entrar(page, CUENTA, NUEVA);
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
  });

  test('contraseñas que no coinciden o cortas no llaman a la API', async ({ page }) => {
    const acciones = contarAcciones(page);
    // Con un token cualquiera: si la comprobación dejara pasar algo, la API respondería que el enlace no vale
    await page.goto('/restablecer?token=token-de-una-prueba-que-no-existe');
    await page.getByLabel('Contraseña nueva', { exact: true }).fill('corta');
    await page.getByLabel('Repite la contraseña').fill('corta');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('La contraseña nueva necesita al menos 12 caracteres.');

    await page.getByLabel('Contraseña nueva', { exact: true }).fill('una-contrasena-larga');
    await page.getByLabel('Repite la contraseña').fill('otra-contrasena-larga');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Las dos contraseñas no coinciden.');
    await capturar(page, '05-no-coinciden');
    expect(acciones()).toBe(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Elige una contraseña nueva' })).toBeVisible();
  });

  test('el mismo enlace otra vez no vale y ofrece pedir otro', async ({ page }) => {
    expect(enlace).not.toBe('');
    await page.goto(enlace);
    await page.getByLabel('Contraseña nueva', { exact: true }).fill('una-tercera-contrasena');
    await page.getByLabel('Repite la contraseña').fill('una-tercera-contrasena');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(MENSAJE_NO_VALIDO);
    await expect(page.getByLabel('Contraseña nueva', { exact: true })).toHaveCount(0);
    await capturar(page, '07-enlace-no-valido');
    await page.getByRole('link', { name: 'Pedir otro enlace' }).click();
    await expect(page).toHaveURL(/\/restablecer$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Restablecer tu contraseña' })).toBeVisible();

    // Y la contraseña sigue siendo la del primer cambio
    await entrar(page, CUENTA, NUEVA);
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
  });
});
