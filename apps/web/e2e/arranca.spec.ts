import { expect, test } from '@playwright/test';

// T-010. Desde T-011, sin sesión la página inicial lleva a la entrada.
test.describe('web.arranca', () => {
  test('sin sesión, la página inicial lleva a la entrada', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { name: 'Entra en NexoAI' })).toBeVisible();
  });
});
