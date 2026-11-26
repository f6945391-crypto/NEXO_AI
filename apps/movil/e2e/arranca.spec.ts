import { expect, test } from '@playwright/test';

// T-020, revisada en T-028: la app carga en tamaño de teléfono y, sin sesión guardada, pide entrar.
test.describe('movil.arranca', () => {
  test('la app carga en tamaño de teléfono y, sin sesión, muestra la entrada', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Entra en NexoAI' })).toBeVisible();
  });
});
