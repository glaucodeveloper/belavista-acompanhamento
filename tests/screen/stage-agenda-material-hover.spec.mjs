import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('etapa mostra agenda e materiais com localização do comprovante no hover', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = { uid: 'e2e-owner', name: 'Teste', role: 'developer', label: 'Teste' };
  });
  await page.route('**/admin-auth.mjs*', route => route.fulfill({ contentType: 'text/javascript', body: 'globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);' }));
  await page.route('**/api/**', route => route.fulfill({ json: { ok: true, records: [], items: [], attachments: [], notifications: [], leads: [], reservations: [], entries: [], stages: [], events: [], summary: { balanceCents: 0 }, requests: [], sales: [] } }));
  await page.goto('/admin?demo=1&view=stages', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('view-layer')).toBeVisible();
  await page.evaluate(() => {
    const store = globalThis.__belavistaAppStore;
    store.set({
      view: 'stages', selectedStageV9: 'earthwork', selectedStage: 'earthwork',
      activityDedicated: true, stageActivityDedicatedV9: false,
      records: [{ id: 'REG-HOVER-01', etapa: 'Terraplanagem', atividade: 'Preparar frente', detalhes: 'Pá carregadeira conferida', evidenceUri: '/evidencias/comprovante.pdf', data: '2026-09-30', status: 'Concluído' }],
    });
  });
  const pageStage = page.locator('.stage-agenda-page');
  await expect(pageStage.getByRole('heading', { name: 'Agenda de atividades' })).toBeVisible();
  await page.locator('[data-worker-chat-minimize]').click();
  const rows = pageStage.locator('.stage-agenda-activity-row');
  await expect(rows).toHaveCount(4);
  const first = rows.first();
  const sidebar = pageStage.locator('[data-stage-agenda-material-sidebar]');
  await expect(sidebar.locator('.stage-agenda-material-item').first()).toBeVisible();
  await first.hover();
  const material = sidebar.locator('.stage-agenda-material-item:not([hidden])').first();
  await expect(material).toBeVisible();
  await expect(material).toContainText('Pá carregadeira');
  await expect(material).toHaveAttribute('open', '');
  await expect(material).toContainText('comprovante.pdf');
  await expect(material).toContainText('Diário da etapa, registro REG-HOVER-01');
  await page.screenshot({ path: testInfo.outputPath('etapa-desktop.png'), fullPage: true });
  await sidebar.locator('[data-stage-material-show-all]').click();
  await expect(sidebar.locator('.stage-agenda-material-item[hidden]')).toHaveCount(0);
  const form = pageStage.locator('[data-stage-agenda-create-form]');
  await expect(form.locator('[name="date"]')).not.toHaveValue('');
  await form.locator('[name="title"]').fill('Conferir compactação');
  await form.locator('[name="notes"]').fill('Verificar ensaio e apontar resultado');
  await form.locator('[name="materialIds"]').first().check();
  await form.locator('[type="submit"]').click();
  await expect(pageStage.locator('.stage-agenda-custom-row')).toContainText('Conferir compactação');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('belavista.agenda-calendar.v3') || '{}').events?.some(item => item.title === 'Conferir compactação' && item.stageKey === 'earthwork'))).toBe(true);
  const created = await page.evaluate(() => JSON.parse(localStorage.getItem('belavista.agenda-calendar.v3')).events.find(item => item.title === 'Conferir compactação'));
  await form.locator('[name="title"]').fill('Validar ensaio');
  await form.locator('[name="date"]').fill(created.date);
  await form.locator('[name="start"]').fill(created.start);
  await form.locator('[type="submit"]').click();
  await expect(pageStage.locator('[data-stage-agenda-fit]')).toContainText('Horário ocupado');
  await expect(pageStage.locator('.stage-agenda-custom-row')).toHaveCount(1);
  await form.locator('[data-stage-agenda-suggest]').click();
  await form.locator('[type="submit"]').click();
  await expect(pageStage.locator('.stage-agenda-custom-row')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => pageStage.locator('.stage-agenda-activity-list').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await expect.poll(() => pageStage.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('etapa-mobile.png'), fullPage: true });
  await first.click();
  await expect(page.locator('.stage-v9-activity-detail')).toBeVisible();
  await page.evaluate(() => globalThis.__belavistaAppStore.set({ view: 'stages', selectedStageV9: 'earthwork', selectedStage: 'earthwork', activityDedicated: true, stageActivityDedicatedV9: false }));
  await page.locator('.stage-agenda-custom-row').first().click();
  await expect(page.locator('.stage-agenda-month-page-v3')).toBeVisible();
  await expect(page.locator('[data-agenda-editor-form] [name="title"]')).toHaveValue('Conferir compactação');
});
