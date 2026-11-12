import { expect, test, type Page } from '@playwright/test';
import cuentas from './cuentas.json';

// T-053 · REQ-CUN03-01, 03, 05 · specs/08-tareas-personales/plan.md §8. La sección Tareas de la web, de
// punta a punta con la API real y el modelo simulado: se le pide una tarea al asistente, se confirma en su
// tarjeta (P-03) y aparece en su franja. «Hecho» la saca de la franja con un toque (decisión 2). No hay
// formulario de creación en ninguna parte (R-42).

async function entrar(page: Page, correo: string) {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
  await page.getByRole('button', { name: 'Tareas', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tareas' })).toBeVisible();
}

const franja = (page: Page, nombre: string) => page.getByRole('tablist', { name: 'Franjas' }).getByRole('tab', { name: nombre });

test.describe('web.tareas-franjas', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sin tareas, cada franja invita a pedírselo al asistente, y no hay formulario (REQ-CUN03-03, R-42)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);
    await expect(page.getByRole('heading', { name: 'No tienes tareas con fecha' })).toBeVisible();

    await franja(page, 'Sin fecha').click();
    await expect(page.getByRole('heading', { name: 'No tienes tareas sin fecha' })).toBeVisible();

    await franja(page, 'Esperando de alguien').click();
    await expect(page.getByRole('heading', { name: 'No esperas nada de nadie' })).toBeVisible();

    // R-42: lo único que ofrece el vacío es pedírselo al asistente
    await expect(page.getByRole('button', { name: 'Pedírselo al asistente' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /t[ií]tulo|tarea/i })).toHaveCount(0);
  });
});

test.describe('web.tareas-completar', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('se pide una tarea, se confirma en su tarjeta y aparece en «Sin fecha»; «Hecho» la saca (REQ-CUN03-01, 05)', async ({ page }) => {
    await entrar(page, cuentas.tareas.correo);

    await page.getByLabel('Pídele algo al asistente').fill('Recuérdame pagar el recibo');
    await page.getByRole('button', { name: 'Enviar' }).click();

    // Nada existe hasta confirmar (P-03)
    const tarjeta = page.getByRole('article', { name: 'Para confirmar' }).last();
    await expect(tarjeta).toContainText('pagar el recibo');
    await franja(page, 'Sin fecha').click();
    await expect(page.getByRole('heading', { name: 'No tienes tareas sin fecha' })).toBeVisible();

    await tarjeta.getByRole('button', { name: 'Confirmar' }).click();

    // REQ-CUN03-01: sin fecha, porque la persona no dijo ninguna; el sistema no la inventa
    const lista = page.getByRole('list', { name: 'Sin fecha' });
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('pagar el recibo');
    await expect(page.getByText('Atrasada')).toHaveCount(0);

    await lista.getByRole('button', { name: 'Marcar como hecha: pagar el recibo' }).click();
    await expect(page.getByRole('heading', { name: 'No tienes tareas sin fecha' })).toBeVisible();
  });
});
