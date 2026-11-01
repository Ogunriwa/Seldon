import { test, expect } from '@playwright/test';

test.describe('Sidebar Coming Soon Modals (Agents, Playground, Artifacts)', () => {
  test('opens and closes the Coming Soon dialog for Agents, Playground, and Artifacts', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const features = ['Agents', 'Playground', 'Artifacts'] as const;

    for (const feature of features) {
      // Click the sidebar navigation button
      await page.locator('aside').getByRole('button', { name: feature }).click();

      // Verify the Base UI dialog opens with the expected heading
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: `${feature} coming soon` })).toBeVisible();

      // Dismiss via the Close button
      await dialog.getByRole('button', { name: 'Close' }).first().click();
      await expect(dialog).toBeHidden();
    }
  });
});
