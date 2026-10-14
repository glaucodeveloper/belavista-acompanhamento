import { test, expect } from '@playwright/test';
import path from 'node:path';

test.setTimeout(120000);
test.use({ serviceWorkers: 'block' });

const image = path.resolve(process.cwd(), 'assets', 'Testes Notas', 'nf-diesel-18452.png');

const recordOcr = {
  documentType: 'purchase_invoice',
  confidence: 0.99,
  provider: 'nvidia-api',
  vision: true,
  model: 'fixture-record-ocr-v21',
  reviewRequired: true,
  properties: [
    { key: 'invoiceNumber', label: 'Número da NF', type: 'text', value: '18452', confidence: 0.99 },
    { key: 'supplier', label: 'Fornecedor', type: 'text', value: 'Bahia Materiais de Obra LTDA', confidence: 0.99 },
    {
      key: 'items', label: 'Itens', type: 'items', confidence: 0.99,
      value: [{ materialId: 'diesel', description: 'Diesel S10', quantity: 1200, unit: 'L' }],
    },
  ],
  items: [{
    materialId: 'diesel', description: 'Diesel S10', itemKind: 'material',
    quantity: 1200, unit: 'L', stageKey: 'water', stageName: 'Rede de Água',
    activityName: 'Abastecimento da frente', materialName: 'Diesel S10',
  }],
};

test('nota no chat: inferência visual cria registro e aloca material na etapa correta', async ({ page }, testInfo) => {
  const saved = [];
  const inferenceRequests = [];
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = { uid: 'ocr-e2e', name: 'Teste OCR', role: 'developer', label: 'Teste' };
  });
  await page.route('**/admin-auth.mjs*', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: 'globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);',
  }));

  await page.route('**/api/records', async route => {
    if (route.request().method() === 'POST') {
      const record = { ...route.request().postDataJSON(), id: 'REG-OCR-UI-01' };
      saved.push(record);
      await route.fulfill({ json: record });
      return;
    }
    await route.fulfill({ json: { records: [] } });
  });

  await page.route('**/api/ai/vision-reasoning', async route => {
    inferenceRequests.push(route.request().postDataJSON());
    await route.fulfill({ json: {
      text: 'Nota 18452 lida; Diesel S10 alocado para revisão em Rede de Água.',
      provider: 'nvidia-api',
      vision: true,
      model: 'fixture-record-ocr-v21',
      attachment: { id: 'IMG-OCR-18452', name: 'nf-diesel-18452.png', stored: false },
      recordOcr,
      toolCalls: [{ name: 'stage.allocate_visual_record', arguments: {
        target: 'material', stageKey: 'water', stageName: 'Rede de Água',
        materialName: 'Diesel S10', activityName: 'Abastecimento da frente',
        quantity: 1200, unit: 'L', details: 'Item identificado na nota fiscal.',
        pointer: 'linha de item Diesel S10', confidence: 0.99,
      } }],
    } });
  });

  await page.goto('/');
  await expect(page.locator('belavista-app')).toBeVisible();
  await expect(page.locator('[data-worker-chat-file-input]')).toHaveCount(1);
  await page.locator('[data-worker-chat-file-input]').setInputFiles(image);
  await page.locator('[data-worker-chat-form] textarea').fill(
    'Leia esta nota e aloque o Diesel S10 na etapa Rede de Água.',
  );
  await page.locator('[data-worker-chat-submit]').click();

  await expect(page.locator('[data-record-verification]')).toBeVisible();
  await expect(page.locator('[data-worker-chat-log]')).toContainText('Alocou a leitura visual');
  await expect.poll(() => inferenceRequests.length).toBe(1);
  expect(inferenceRequests[0].message).toContain('Rede de Água');
  await expect.poll(() => saved.length).toBe(1);

  expect(saved[0].allocationTarget).toBe('material');
  expect(saved[0].stageKey).toBe('water');
  expect(saved[0].quantity).toBe(1200);
  expect(saved[0].properties.find(property => property.id === 'allocation_material')?.value).toBe('Diesel S10');
  expect(saved[0].properties.find(property => property.id === 'allocation_stage')?.value).toBe('Rede de Água');

  // A página de Etapas possui URL própria; navegar por ela preserva o
  // apontamento salvo e exercita a montagem completa da visão de recursos.
  await page.goto('/admin?demo=1&view=stages&visual-suite=ocr-allocation', { waitUntil: 'domcontentloaded' });
  await page.evaluate((records) => globalThis.__belavistaAppStore.set({
    records,
    materialCatalogAdditions: [{
      id: 'material:REG-OCR-UI-01', sourceRecordId: 'REG-OCR-UI-01', source: 'chat-visual',
      stageKey: 'water', stageName: 'Rede de Água', name: 'Diesel S10', materialName: 'Diesel S10',
      activityName: 'Abastecimento da frente', quantity: 1200, unit: 'L', status: 'Pendente',
      scope: 'Item identificado na nota fiscal.', properties: records[0]?.properties || [], attachments: records[0]?.attachments || [],
    }],
    selectedStageV9: 'water',
    selectedStage: 'water',
    activityDedicated: false,
    controlStageCenterTab: 'materials',
  }), saved);
  const center = page.locator('[data-stage-home-record-resources]');
  await expect(center).toBeVisible();
  await center.locator('[data-stage-home-resource-stage]').selectOption('water');
  await expect(center.locator('[data-stage-center-material-row]')).toContainText('Diesel S10');
  const row = center.locator('[data-stage-center-material-row]').filter({ hasText: 'Diesel S10' });
  await expect(row).toContainText('Rede de Água');
  await row.click();
  const dialog = page.locator('dialog[data-stage-center-item-dialog]');
  await expect(dialog).toContainText('Diesel S10');
  await expect(dialog).toContainText('nf-diesel-18452.png');
  const screenshot = testInfo.outputPath('nota-material-alocada-na-central.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach('nota-material-alocada-na-central.png', {
    path: screenshot,
    contentType: 'image/png',
  });
});
