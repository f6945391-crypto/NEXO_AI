import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-124 · specs/05-equipos/casos-de-prueba.md, CP-R-01 a 05 en pantalla. El escenario «Proyecto Alfa» lo
// siembra e2e/arrancar-api.mjs con el calendario simulado.

async function entrar(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
}

const niveles = (page: Page) => page.getByRole('tablist', { name: 'Niveles' }).getByRole('tab');

test.describe('web.escenario-reuniones', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('CP-R-01 · con Plan Personal no hay corte de equipo', async ({ page }) => {
    await entrar(page, cuentas.reunionesPablo.correo);
    await expect(niveles(page)).toHaveText(['Hoy', 'Semana', 'Mes']);
  });

  test('CP-R-02 · el administrador sin equipo tampoco lo tiene', async ({ page }) => {
    await entrar(page, cuentas.reunionesAdmin.correo);
    await expect(niveles(page)).toHaveText(['Hoy', 'Semana', 'Mes']);
  });

  test('CP-R-03 · en la zona de empresa, el administrador ve el equipo con su responsable', async ({ page }) => {
    await page.goto('/administracion/entrar');
    await page.getByLabel('Correo').fill(cuentas.reunionesAdmin.correo);
    await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Equipos' }).click();
    const alfa = page.locator('article, section, li').filter({ hasText: 'Proyecto Alfa' }).first();
    await expect(alfa).toContainText(cuentas.reunionesLider.correo);
    for (const clave of ['reunionesAna', 'reunionesBeto', 'reunionesCarla', 'reunionesDiego'] as const) {
      await expect(alfa).toContainText(cuentas[clave].correo);
    }
  });

  test('CP-R-04 y 05 · el líder ve al responsable y la consulta de todos sale parcial', async ({ page }) => {
    await entrar(page, cuentas.reunionesLider.correo);
    await page.getByRole('tablist', { name: 'Niveles' }).getByRole('tab', { name: 'Disponibilidad de equipo' }).click();
    await expect(page.getByText(`Responsable: ${cuentas.reunionesLider.correo} · 5 integrantes`)).toBeVisible();

    await page.getByRole('button', { name: 'Consultar disponibilidad' }).click();
    await expect(page.getByText('Disponibilidad parcial')).toBeVisible();
    await expect(page.getByText('Participantes consultados: 3 de 5')).toBeVisible();
    const sinDatos = page.getByRole('listitem').filter({ hasText: /@reuniones\.test - / });
    await expect(sinDatos).toHaveCount(2);
    await expect(sinDatos.filter({ hasText: cuentas.reunionesCarla.correo })).toHaveCount(1);
    await expect(sinDatos.filter({ hasText: cuentas.reunionesDiego.correo })).toHaveCount(1);
  });
});
