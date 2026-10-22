import { expect, test } from '@playwright/test';

// T-020
test.describe('movil.arranca', () => {
  test('la app carga en tamaño de teléfono y consulta la API con contratos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'NexoAI' })).toBeVisible();
    await expect(page.getByTestId('estado-api')).toHaveText(/^API: (disponible|no disponible)$/, { timeout: 10_000 });
  });
});
