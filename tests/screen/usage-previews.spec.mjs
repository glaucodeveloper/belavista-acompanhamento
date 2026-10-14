import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

test.setTimeout(120000);
test.use({ serviceWorkers: 'block' });

const previewRoot = path.resolve('output', 'usage-previews');
const pages = [
  ['dashboard', 'Mapa'],
  ['control', 'Dashboard'],
  ['stages', 'Etapas e cronograma'],
  ['records', 'Registros'],
  ['instagram_leads', 'Instagram Leads'],
  ['instagram_direct', 'Atendimento Direct'],
  ['instagram_prompt', 'Prompt do atendente'],
  ['contracts', 'Contratos'],
  ['brokers', 'Comissões'],
  ['brokers-board', 'Lotes'],
  ['finance', 'Financeiro'],
  ['settings', 'Configurações'],
  ['documents', 'Documentos'],
  ['reports', 'Relatórios']
];

const apiFixture = {
  ok: true,
  records: [],
  items: [],
  attachments: [],
  notifications: [],
  leads: [],
  reservations: [],
  entries: [],
  stages: [],
  events: [],
  summary: { balanceCents: 0 },
  requests: [],
  sales: []
};

async function boot(page) {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = {
      uid: 'playwright-preview',
      name: 'Prévia Playwright',
      role: 'developer',
      label: 'Evidência'
    };
  });
  await page.route('**/admin-auth.mjs*', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);'
  }));
  await page.route('**/api/**', route => route.fulfill({ json: apiFixture }));
  await fs.mkdir(previewRoot, { recursive: true });
}

for (const [view, title] of pages) {
  test(`prévia de uso — ${title}`, async ({ page }, testInfo) => {
    await boot(page);
    await page.goto(`/admin?demo=1&view=${view}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('belavista-app')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(600);
    if (view === 'dashboard') {
      await expect(page.locator('.dashboard-mode-status')).toContainText('Acompanhamento');
      await expect(page.locator('.project-switch')).toHaveCount(0);
      await expect(page.locator('.dashboard-mode-trigger')).toHaveCount(0);
      await expect(page.locator('.dashboard-mode-menu')).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('data-dashboard-mode', 'tracking');
    }
    const file = path.join(previewRoot, `${view.replaceAll('-', '_')}.png`);
    await page.screenshot({ path: file, fullPage: true });
    await testInfo.attach(`prévia ${title}`, { path: file, contentType: 'image/png' });
    const bodyText = await page.locator('body').innerText();
    await fs.writeFile(path.join(previewRoot, `${view.replaceAll('-', '_')}.json`), JSON.stringify({
      requestedView: view,
      requestedTitle: title,
      resolvedUrl: page.url(),
      visibleText: bodyText.slice(0, 1200),
      hasApplicationShell: await page.locator('belavista-app').count() > 0,
      capturedAt: new Date().toISOString()
    }, null, 2));
    expect(await page.locator('body').count()).toBe(1);
  });
}
