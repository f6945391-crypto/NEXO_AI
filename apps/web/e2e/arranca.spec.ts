import { expect, test } from '@playwright/test';

// T-010
test.describe('web.arranca', () => {
  test('la página inicial carga y muestra el estado de la API validado con contratos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'NexoAI' })).toBeVisible();
    await expect(page.locator('[data-prueba="estado-api"]')).toHaveText(/^API: (disponible|no disponible)$/);
  });
});
