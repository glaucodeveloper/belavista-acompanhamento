import { test, expect } from '@playwright/test';
import path from 'node:path';

test.setTimeout(120000);
test.use({ serviceWorkers: 'block' });

const root = path.resolve(process.cwd());
const chatKey = 'belavista.worker-context-chat.v1';
const notes = {
  diesel: path.join(root, 'assets', 'Testes Notas', 'nf-diesel-18452.png'),
  pead: path.join(root, 'assets', 'Testes Notas', 'nf-pead-30291.png'),
  estacas: path.join(root, 'assets', 'Testes Notas', 'nf-estacas-90112.png'),
};

const notePayloads = {
  diesel: {
    invoiceNumber: '18452',
    supplier: 'Bahia Materiais de Obra LTDA',
    materialId: 'diesel',
    description: 'Diesel S10',
    quantity: 1200,
    unit: 'L',
    stageKey: 'water',
    stageName: 'Rede de Água',
    target: 'material',
    materialName: 'Diesel S10',
    activityName: 'Abastecimento da frente',
  },
  pead: {
    invoiceNumber: '30291',
    supplier: 'Hidro Rede Bahia Comercio LTDA',
    materialId: 'pead-principal',
    description: 'Tubo PEAD rede principal',
    quantity: 1400,
    unit: 'M',
    stageKey: 'water',
    stageName: 'Rede de Água',
    target: 'material',
    materialName: 'Tubo PEAD rede principal',
    activityName: 'Implantação da rede principal',
  },
  estacas: {
    invoiceNumber: '90112',
    supplier: 'Loccamp Suprimentos Técnicos LTDA',
    materialId: 'estacas-topografia',
    description: 'Estacas de locação',
    quantity: 50,
    unit: 'UN',
    stageKey: 'earthwork',
    stageName: 'Terraplanagem',
    target: 'material',
    materialName: 'Estacas de locação',
    activityName: 'Topografia e mobilização inicial',
  },
};

function ocrFor(item) {
  return {
    documentType: 'purchase_invoice',
    confidence: 0.98,
    provider: 'nvidia-api',
    vision: true,
    model: 'fixture-multiple-notes-v1',
    reviewRequired: true,
    properties: [
      { key: 'invoiceNumber', label: 'Número da NF', type: 'text', value: item.invoiceNumber, confidence: 0.98 },
      { key: 'supplier', label: 'Fornecedor', type: 'text', value: item.supplier, confidence: 0.98 },
      {
        key: 'items',
        label: 'Itens',
        type: 'items',
        value: [{
          materialId: item.materialId,
          description: item.description,
          itemKind: item.target === 'service' ? 'servico' : 'material',
          quantity: item.quantity,
          unit: item.unit,
        }],
        confidence: 0.98,
      },
    ],
    items: [{
      materialId: item.materialId,
      description: item.description,
      itemKind: item.target === 'service' ? 'servico' : 'material',
      quantity: item.quantity,
      unit: item.unit,
      stageKey: item.stageKey,
      stageName: item.stageName,
      activityName: item.activityName,
      materialName: item.materialName,
    }],
  };
}

function visionReply(item, attachmentName) {
  return {
    text: `Nota ${item.invoiceNumber} lida e alocada para revisão.`,
    provider: 'nvidia-api',
    vision: true,
    model: 'fixture-multiple-notes-v1',
    attachment: { id: `IMG-${item.invoiceNumber}`, name: attachmentName, stored: false },
    recordOcr: ocrFor(item),
    toolCalls: [{
      name: 'stage.allocate_visual_record',
      arguments: {
        target: item.target,
        stageKey: item.stageKey,
        stageName: item.stageName,
        materialName: item.materialName,
        activityName: item.activityName,
        quantity: item.quantity,
        unit: item.unit,
        details: `Item identificado na nota ${item.invoiceNumber}.`,
        pointer: `linha de item ${item.description}`,
        confidence: 0.98,
      },
    }],
  };
}

async function installFixtures(page, { staleChat = false, visionMode = 'mapped' } = {}) {
  if (staleChat) {
    await page.addInitScript(({ key }) => {
      localStorage.setItem(key, JSON.stringify([{
        id: 'old-chat-message',
        kind: 'assistant',
        text: 'Resposta antiga que não deve reaparecer.',
        at: '2026-09-30T12:00:00.000Z',
      }]));
    }, { key: chatKey });
  } else {
    await page.addInitScript(({ key }) => localStorage.removeItem(key), { key: chatKey });
  }

  let requestSequence = 0;
  const requests = [];
  const saved = [];
  const aiRequests = [];

  await page.route('**/api/service-requests**', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const request = {
        id: `SR-MULTI-${String(++requestSequence).padStart(2, '0')}`,
        title: String(body.title || '').slice(0, 140),
        domain: body.domain || 'obra',
        status: 'triage',
        stageKey: body.stageKey || '',
        activityId: body.activityId || '',
        files: Array.isArray(body.files) ? body.files.map(file => ({ fileName: file.fileName, fileUrl: '#' })) : [],
      };
      requests.unshift(request);
      await route.fulfill({ json: { request } });
      return;
    }
    await route.fulfill({ json: { requests } });
  });

  await page.route('**/api/records', async route => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      const record = { ...payload, id: `REG-MULTI-${String(saved.length + 1).padStart(2, '0')}` };
      saved.push(record);
      await route.fulfill({ json: record });
      return;
    }
    await route.fulfill({ json: { records: [] } });
  });

  await page.route('**/api/ai/vision-reasoning', async route => {
    const body = route.request().postDataJSON();
    aiRequests.push(body);
    const attachmentName = String(body.attachment?.name || '');
    const key = attachmentName.includes('pead') ? 'pead' : attachmentName.includes('estacas') ? 'estacas' : 'diesel';
    const item = notePayloads[key];
    let reply = visionMode === 'ambiguous'
      ? {
          text: 'Li a nota, mas não há evidência suficiente para escolher uma etapa.',
          recordOcr: (() => {
            const ambiguous = ocrFor(item);
            ambiguous.items = ambiguous.items.map(({ stageKey, stageName, activityName, ...rest }) => rest);
            return ambiguous;
          })(),
          attachment: { id: `IMG-${item.invoiceNumber}`, name: attachmentName, stored: false },
          toolCalls: [],
        }
      : visionReply(item, attachmentName);
    if (visionMode === 'wrong-model-stage') {
      reply = visionReply(item, attachmentName);
      reply.recordOcr.items = reply.recordOcr.items.map(({ stageKey, stageName, ...rest }) => rest);
      reply.toolCalls[0].arguments.stageKey = 'earthwork';
      reply.toolCalls[0].arguments.stageName = 'Terraplanagem';
    }
    await route.fulfill({ json: reply });
  });

  await page.goto('/');
  await expect(page.locator('belavista-app')).toBeVisible();
  await expect(page.locator('[data-worker-chat-file-input]')).toHaveCount(1);
  return { requests, saved, aiRequests };
}

async function submitNote(page, image, expectedName, expectedFeedback = 'Alocou a leitura visual', message = 'Solicito leitura desta nota e alocação do item na etapa correta.') {
  const input = page.locator('[data-worker-chat-file-input]');
  await input.setInputFiles(image);
  await expect(page.locator('[data-worker-chat-attachment]')).toContainText(expectedName);
  await page.locator('[data-worker-chat-form] textarea').fill(message);
  await page.locator('[data-worker-chat-submit]').click();
  await expect(page.locator('[data-record-verification]')).toBeVisible();
  await expect(page.locator('[data-worker-chat-log]')).toContainText(expectedFeedback);
}

test('OCR múltiplo — a conversa inicia limpa sem apagar o registro persistido', async ({ page }) => {
  await installFixtures(page, { staleChat: true });
  const log = page.locator('[data-worker-chat-log]');
  await expect(log).toContainText('Descreva o serviço necessário ou faça uma pergunta.');
  await expect(log).not.toContainText('Resposta antiga que não deve reaparecer.');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]').length, chatKey)).toBe(1);
});

test('OCR múltiplo — duas notas de material preservam item, etapa e quantidade', async ({ page }) => {
  const { saved } = await installFixtures(page);

  await submitNote(page, notes.diesel, 'nf-diesel-18452.png');
  await expect.poll(() => saved.length).toBe(1);
  await expect(page.locator('[data-record-allocation-index="0"]')).toContainText('Diesel S10');

  await submitNote(page, notes.pead, 'nf-pead-30291.png');
  await expect.poll(() => saved.length).toBe(2);

  expect(saved.map(record => record.allocationTarget)).toEqual(['material', 'material']);
  expect(saved.map(record => record.stageKey)).toEqual(['water', 'water']);
  expect(saved.find(record => record.properties.find(property => property.id === 'allocation_material')?.value === 'Diesel S10')?.quantity).toBe(1200);
  expect(saved.find(record => record.properties.find(property => property.id === 'allocation_material')?.value === 'Tubo PEAD rede principal')?.quantity).toBe(1400);

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  const center = page.locator('[data-stage-record-center]');
  await expect(center).toBeVisible();
  const rows = center.locator('[data-stage-center-material-row]');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'Diesel S10' })).toContainText('Rede de Água');
  await expect(rows.filter({ hasText: 'Tubo PEAD rede principal' })).toContainText('Rede de Água');

  await rows.filter({ hasText: 'Diesel S10' }).click();
  const dialog = page.locator('dialog[data-stage-center-item-dialog]');
  await expect(dialog).toContainText('Diesel S10');
  await expect(dialog).toContainText('nf-diesel-18452.png');
  await dialog.locator('[data-stage-center-item-close]').last().click();
  await expect(dialog).toBeHidden();
  await rows.filter({ hasText: 'Tubo PEAD rede principal' }).click();
  await expect(dialog).toContainText('Tubo PEAD rede principal');
  await expect(dialog).toContainText('Rede de Água');
});

test('OCR múltiplo — estacas da nota entram em Materiais, não em Serviços', async ({ page }, testInfo) => {
  const { saved } = await installFixtures(page);
  await submitNote(
    page,
    notes.estacas,
    'nf-estacas-90112.png',
    'Alocou a leitura visual',
    'Leia a nota e aloque as estacas de locação como material na etapa Terraplanagem.',
  );
  await expect.poll(() => saved.length).toBe(1);

  expect(saved[0].allocationTarget).toBe('material');
  expect(saved[0].stageKey).toBe('earthwork');
  expect(saved[0].quantity).toBe(50);
  expect(saved[0].properties.find(property => property.id === 'allocation_material')?.value).toBe('Estacas de locação');
  expect(saved[0].properties.find(property => property.id === 'allocation_target')?.value).toBe('Materiais');
  expect(saved[0].properties.find(property => property.id === 'allocation_stage')?.value).toBe('Terraplanagem');

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  const center = page.locator('[data-stage-record-center]');
  const materialRow = center.locator('[data-stage-center-material-row]');
  await expect(materialRow).toHaveCount(1);
  await expect(materialRow).toContainText('Estacas de locação');
  await expect(materialRow).toContainText('50');
  await center.locator('[data-stage-record-center-tab="services"]').click();
  await expect(center.locator('[data-stage-center-service-row]')).toHaveCount(0);
  await center.locator('[data-stage-record-center-tab="materials"]').click();
  await materialRow.click();
  const dialog = page.locator('dialog[data-stage-center-item-dialog]');
  await expect(dialog).toContainText('MATERIAL');
  await expect(dialog).toContainText('Estacas de locação');
  await expect(dialog).toContainText('nf-estacas-90112.png');
  const screenshot = testInfo.outputPath('item-de-material-alocado-na-central.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach('item-de-material-alocado-na-central.png', {
    path: screenshot,
    contentType: 'image/png',
  });
});

test('OCR múltiplo — item sem encaixe seguro pede etapa e não cria registro órfão', async ({ page }) => {
  const { saved } = await installFixtures(page, { visionMode: 'ambiguous' });
  await submitNote(page, notes.diesel, 'nf-diesel-18452.png', 'Qual etapa ou atividade deve receber este item?');
  expect(saved).toHaveLength(0);
  await expect(page.locator('[data-stage-record-center] [data-stage-center-material-row]')).toHaveCount(0);
});

test('etapa escrita no pedido vence etapa ativa e sugestão conflitante do modelo', async ({ page }) => {
  const { requests, saved, aiRequests } = await installFixtures(page, { visionMode: 'wrong-model-stage' });
  await page.evaluate(() => {
    const store = globalThis.__belavistaAppStore;
    store?.set?.({ selectedStageV9: 'earthwork', selectedStage: 'earthwork' });
  });

  await submitNote(page, notes.diesel, 'nf-diesel-18452.png', 'Alocou a leitura visual', 'Solicito leitura desta nota e alocação do item na Rede de Água.');

  expect(aiRequests).toHaveLength(1);
  expect(aiRequests[0].message).toContain('Rede de Água');
  expect(aiRequests[0].context.selectedStageKey).toBe('earthwork');
  expect(aiRequests[0].context.stages).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: 'water', name: 'Rede de Água' })
  ]));
  expect(requests[0].stageKey).toBe('water');
  expect(saved[0].stageKey).toBe('water');
  expect(saved[0].etapa).toBe('Rede de Água');
});
