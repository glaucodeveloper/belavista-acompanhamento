import { test, expect } from '@playwright/test';

test.describe('admin workers · smoke anti-crash', () => {
  test('carrega /admin/workers sem erros de execução ou respostas 5xx', async ({ page }) => {
    const pageErrors = [];
    const serverErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto('/admin/workers/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.belavista-auth-gate')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /entrar no painel administrativo/i })).toBeVisible();
    await expect(page.locator('[data-worker-app]')).toBeAttached();

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
    expect(serverErrors, serverErrors.join('\n')).toEqual([]);
  });

  test('deep link de etapa mantém o gate e não executa a superfície sem autorização', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/admin/workers/stage?stage=project', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.belavista-auth-gate')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /entrar no painel administrativo/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /preparação e projeto/i })).not.toBeVisible();

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
});
