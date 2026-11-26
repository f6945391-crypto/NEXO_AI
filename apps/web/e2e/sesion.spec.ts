import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-139 · REQ-ACC-02 · H-ACC-03, H-ACC-16 · specs/06-acceso/plan.md §5.9. El acceso dura 15 minutos y la cookie
// caduca con él; la renovación, 30 días. Borrar solo `nexoai_acceso` es lo mismo que dejar pasar los 15 minutos:
// lo que corre sin recargar la página (acciones de servidor) tiene que renovarlo, y la navegación también.
// La cuenta `sesionRenovada` la siembra e2e/arrancar-api.mjs, en un equipo propio para tener «Reuniones».

const ACCESO = 'nexoai_acceso';
const RENOVACION = 'nexoai_renovacion';

async function entrar(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(cuentas.sesionRenovada.correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

async function nombresDeCookies(contexto: BrowserContext): Promise<string[]> {
  return (await contexto.cookies()).map((c) => c.name);
}

// Como si hubieran pasado los 15 minutos: el navegador ya no tiene el acceso, sí la renovación
async function caducarAcceso(contexto: BrowserContext) {
  await contexto.clearCookies({ name: ACCESO });
  expect(await nombresDeCookies(contexto)).not.toContain(ACCESO);
  expect(await nombresDeCookies(contexto)).toContain(RENOVACION);
}

async function accesoRenovado(contexto: BrowserContext) {
  await expect.poll(() => nombresDeCookies(contexto)).toContain(ACCESO);
}

test.describe('web.sesion-se-renueva', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('con el acceso caducado y la renovación vigente, las acciones y la navegación siguen sin pasar por Entrar', async ({ page, context }) => {
    await entrar(page);

    await test.step('Reuniones lee la lista con una acción de servidor', async () => {
      await caducarAcceso(context);
      await page.getByRole('tablist', { name: 'Niveles' }).getByRole('tab', { name: 'Reuniones' }).click();
      await expect(page.getByRole('heading', { name: 'Todavía no hay reuniones' })).toBeVisible();
      await expect(page.getByText('Tu sesión terminó. Vuelve a iniciar sesión.')).toHaveCount(0);
      await accesoRenovado(context);
    });

    await test.step('Actividad lee el período con una acción de servidor', async () => {
      await caducarAcceso(context);
      await page.getByRole('button', { name: 'Actividad' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Actividad' })).toBeVisible();
      await expect(page.getByRole('heading', { name: /todavía no ha pasado nada$/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'No pudimos leer tu actividad' })).toHaveCount(0);
      await accesoRenovado(context);
    });

    await test.step('la conversación con el asistente', async () => {
      await caducarAcceso(context);
      await page.getByLabel('Pídele algo al asistente').fill('Mándale un correo a Juan');
      await page.getByRole('button', { name: 'Enviar' }).click();
      await expect(page.getByText('No sé hacer eso todavía.')).toBeVisible();
      await expect(page).not.toHaveURL(/\/entrar/);
      await accesoRenovado(context);
    });

    await test.step('Semana cambia la dirección: la página renueva y vuelve a Semana', async () => {
      await page.getByRole('button', { name: 'Agenda' }).click();
      await caducarAcceso(context);
      await page.getByRole('tablist', { name: 'Niveles' }).getByRole('tab', { name: 'Semana' }).click();
      await expect(page).toHaveURL(/nivel=semana/);
      await expect(page.getByRole('tablist', { name: 'Niveles' }).getByRole('tab', { name: 'Semana' })).toHaveAttribute('aria-selected', 'true');
      await expect(page).not.toHaveURL(/\/entrar/);
      await accesoRenovado(context);
    });
  });

  test('sin ninguna de las dos cookies, se va a Entrar como antes', async ({ page, context }) => {
    await entrar(page);
    await context.clearCookies();
    await page.getByLabel('Pídele algo al asistente').fill('Mándale un correo a Juan');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});
