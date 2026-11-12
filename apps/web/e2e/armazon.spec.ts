import { expect, test } from '@playwright/test';
import cuentas from './cuentas.json';

// T-023 · design/ARQUITECTURA-VISUAL-WEB.md: tres columnas, secciones, conversación y Ajustes.
test.describe('web.armazon', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('navegación, conversación en espera, lienzo expandido y cierre de sesión desde Ajustes', async ({ page }) => {
    // Primer ingreso de la cuenta, para llegar a la aplicación.
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(cuentas.armazon.correo);
    await page.getByLabel('Contraseña').fill(cuentas.contrasenaTemporal);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByLabel('Contraseña nueva').fill(cuentas.contrasenaNueva);
    await page.getByRole('button', { name: /Usar la de este equipo/ }).click();
    await page.getByRole('button', { name: 'Guardar y continuar' }).click();

    // Las tres secciones, y Agenda activa al entrar (R-32).
    const navegacion = page.getByRole('navigation', { name: 'Secciones' });
    for (const seccion of ['Agenda', 'Tareas', 'Actividad']) {
      await expect(navegacion.getByRole('button', { name: seccion })).toBeVisible();
    }
    await expect(navegacion.getByRole('button', { name: 'Agenda' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Hoy' })).toHaveAttribute('aria-selected', 'true');

    // Cambiar de sección cambia el lienzo. Tareas tiene franjas, y Encargadas en el Plan Empresarial (R-38).
    await navegacion.getByRole('button', { name: 'Tareas' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tareas' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Encargadas' })).toBeVisible();

    // Un ejemplo pulsable llena la entrada. T-051 · REQ-CUN03-01: el asistente propone la tarea con su
    // tarjeta y no crea nada hasta confirmar (antes de T-051 quedaba en espera).
    await page.getByRole('button', { name: 'Recuérdame llamar al dentista' }).click();
    await expect(page.getByLabel('Pídele algo al asistente')).toHaveValue('Recuérdame llamar al dentista');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('Recuérdame llamar al dentista')).toBeVisible();
    await expect(page.getByRole('article', { name: 'Para confirmar' }).last()).toContainText('llamar al dentista');
    await page.getByRole('tablist', { name: 'Franjas' }).getByRole('tab', { name: 'Sin fecha' }).click();
    await expect(page.getByRole('heading', { name: 'No tienes tareas sin fecha' })).toBeVisible();

    // Lienzo expandido: la conversación desaparece y vuelve (72 · 0 · 1368).
    await page.getByRole('button', { name: 'Ampliar' }).click();
    await expect(page.getByLabel('Pídele algo al asistente')).toBeHidden();
    await page.getByRole('button', { name: 'Volver a mostrar el asistente' }).click();
    await expect(page.getByLabel('Pídele algo al asistente')).toBeVisible();

    // Ajustes se abre encima, se cierra con una equis y permite cerrar sesión (R-43, R-45).
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible();
    // El perfil, solo lectura (T-006).
    await expect(page.getByRole('dialog')).toContainText(cuentas.armazon.correo);
    await expect(page.getByRole('dialog')).toContainText('Empresarial');
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
  });
});
