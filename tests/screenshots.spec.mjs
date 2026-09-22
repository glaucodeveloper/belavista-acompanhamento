import { test, expect } from '@playwright/test';
test.describe('Screenshots', () => {
  test('captura dashboard inicial', async ({ page }) => {
    await page.goto('/dashboard');
    await page.screenshot({ path: 'tests/screenshots/dashboard.png', fullPage: true });
  });
});
