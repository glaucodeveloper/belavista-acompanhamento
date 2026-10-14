import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

test.setTimeout(120000);
test.use({ serviceWorkers: 'block' });

const root = path.resolve(process.cwd());
const evidenceRoot = path.resolve('output', 'usage-previews');
const invoice = path.join(root, 'assets', 'Testes Notas', 'nf-diesel-18452.png');
const ocr = {
  documentType: 'purchase_invoice',
  confidence: 0.99,
  provider: 'nvidia-api',
  vision: true,
  model: 'fixture-vision-v21',
  reviewRequired: true,
  properties: [
    { key: 'invoiceNumber', label: 'Número da NF', type: 'text', value: '18452', confidence: 0.99 },
    { key: 'supplier', label: 'Fornecedor', type: 'text', value: 'Bahia Materiais de Obra LTDA', confidence: 0.99 },
    { key: 'items', label: 'Itens', type: 'items', value: [{ materialId: 'diesel', description: 'Diesel S10', quantity: 1200, unit: 'L' }], confidence: 0.99 }
  ],
  items: [{ materialId: 'diesel', description: 'Diesel S10', quantity: 1200, unit: 'L' }]
};

async function save(page, name) {
  await fs.mkdir(evidenceRoot, { recursive: true });
  const file = path.join(evidenceRoot, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function boot(page) {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = { uid: 'e2e-evidence', name: 'Evidência Playwright', role: 'developer', label: 'Teste' };
  });
  await page.route('**/admin-auth.mjs*', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);'
  }));
}

test('evidência — anexo de nota passa por OCR e abre propriedades do registro', async ({ page }, testInfo) => {
  await boot(page);
  const request = { id: 'SR-EVIDENCE-OCR', title: 'Leia esta nota fiscal e prepare um registro.', domain: 'obra', status: 'triage', files: [] };
  await page.route('**/api/service-requests**', route => route.fulfill({
    json: route.request().method() === 'POST' || route.request().url().includes(request.id)
      ? { request }
      : { requests: [request] }
  }));
  await page.route('**/api/ai/vision-reasoning', route => route.fulfill({ json: {
    text: 'Nota fiscal lida e alocada na etapa indicada.',
    recordOcr: ocr,
    attachment: { id: 'IMG-EVIDENCE', name: 'nf-diesel-18452.png', stored: false },
    toolCalls: [{ name: 'stage.allocate_visual_record', arguments: {
      target: 'material', stageKey: 'water', stageName: 'Rede de Água', materialName: 'Diesel S10',
      activityName: 'Abastecimento da frente', quantity: 1200, unit: 'L'
    } }]
  } }));
  await page.route('**/api/records', route => route.request().method() === 'POST'
    ? route.fulfill({ json: { ...route.request().postDataJSON(), id: 'REG-EVIDENCE' } })
    : route.continue());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('belavista-app')).toBeVisible({ timeout: 20000 });
  const input = page.locator('[data-worker-chat-file-input]');
  await expect(input).toHaveCount(1);
  await input.setInputFiles(invoice);
  await expect(page.locator('[data-worker-chat-attachment]')).toContainText('nf-diesel-18452.png');
  const attached = await save(page, 'nota-01-anexo-no-chat.png');
  await page.locator('[data-worker-chat-form] textarea').fill('Leia esta nota fiscal e prepare um registro.');
  await page.locator('[data-worker-chat-submit]').click();
  await expect(page.locator('[data-chat-apply="record"]')).toBeVisible();
  await page.locator('[data-chat-apply="record"]').click();
  const dialog = page.locator('dialog[data-stage-center-item-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Rede de Água');
  await expect(dialog).toContainText('Diesel S10');
  const properties = await save(page, 'nota-02-propriedades-e-alocacao.png');
  await testInfo.attach('nota anexada ao chat', { path: attached, contentType: 'image/png' });
  await testInfo.attach('propriedades OCR e alocação', { path: properties, contentType: 'image/png' });
});

test('evidência — modal do lote não expõe formulário de entrada', async ({ page }, testInfo) => {
  await boot(page);
  await page.route('**/api/**', route => route.fulfill({ json: {
    ok: true, records: [], items: [], attachments: [], notifications: [], leads: [], reservations: [], entries: [], stages: [], events: [],
    summary: { balanceCents: 0 }, requests: [], sales: []
  } }));
  await page.goto('/admin?demo=1&view=brokers-board', { waitUntil: 'domcontentloaded' });
  const catalog = page.locator('[data-lot-price-catalog]');
  await expect(catalog).toBeVisible({ timeout: 20000 });
  const firstRow = catalog.locator('[data-lot-catalog-row]').first();
  const lotKey = await firstRow.getAttribute('data-lot-key');
  await firstRow.click();
  const modal = page.locator('body > .lot-status-modal[data-lot-floating-control]');
  await expect(modal).toBeVisible();
  await expect(modal.locator('[data-repasse-entry-form]')).toHaveCount(0);
  await expect(modal.getByRole('heading', { name: 'Status, repasse e pagamento' })).toBeVisible();
  const control = await save(page, 'controle-lote-sem-entrada.png');
  await testInfo.attach(`modal de controle ${lotKey}`, { path: control, contentType: 'image/png' });
});
