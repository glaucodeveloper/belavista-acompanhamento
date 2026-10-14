import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('Loteamento: cards abrem perfil próprio, salvam edição e aceitam inclusão preparada pelo assistente', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = { uid: 'lot-development-e2e', name: 'Teste Loteamento', role: 'developer', label: 'Teste' };
  });
  await page.route('**/admin-auth.mjs*', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: 'globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);',
  }));

  await page.goto('/admin?demo=1&view=lot-development', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-lot-development-page]')).toBeVisible();
  await expect(page.locator('[data-development-profile-open]')).not.toHaveCount(0);
  await expect(page.locator('[data-development-profile-open][data-kind="common-area"]')).not.toHaveCount(0);

  await page.locator('[data-development-profile-open][data-kind="common-area"]').first().click();
  await expect(page.locator('[data-lot-development-profile]')).toBeVisible();
  await page.locator('[data-development-profile-form] textarea[name="description"]').fill('Praça com convivência, arborização e banco comunitário.');
  await page.locator('[data-development-profile-form]').evaluate((form) => form.requestSubmit());
  await expect(page.locator('[data-lot-development-profile] textarea[name="description"]')).toHaveValue(/banco comunitário/);

  await page.evaluate(async () => {
    await globalThis.belavistaWorkerAssistant?.executeToolCalls?.([{
      name: 'lot-development.upsert_profile',
      arguments: {
        kind: 'common-area',
        title: 'Playground inclusivo',
        description: 'Perfil sugerido pelo assistente para revisão humana.',
        status: 'Em planejamento',
      },
    }]);
  });
  await expect(page.locator('[data-lot-development-profile] h1')).toHaveText('Playground inclusivo');
  await page.evaluate(() => globalThis.__belavistaAppStore.set({ view: 'lot-development' }));
  await expect(page.locator('[data-lot-development-page]')).toContainText('Playground inclusivo');

  const screenshot = testInfo.outputPath('loteamento-cards-e-perfil.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach('loteamento-cards-e-perfil.png', { path: screenshot, contentType: 'image/png' });
});
