import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.setTimeout(120000);
test.use({ serviceWorkers: 'block' });

const root = path.resolve(process.cwd());
const image = path.join(root, 'assets', 'Testes Notas', 'nf-diesel-18452.png');

const ocr = {
  documentType: 'purchase_invoice',
  confidence: 0.99,
  provider: 'nvidia-api',
  vision: true,
  model: 'fixture-vision-cert-v38',
  reviewRequired: true,
  properties: [
    { key: 'invoiceNumber', label: 'Número da NF', type: 'text', value: '18452', confidence: 0.99 },
    { key: 'series', label: 'Série', type: 'text', value: '1', confidence: 0.99 },
    { key: 'supplier', label: 'Fornecedor', type: 'text', value: 'Bahia Materiais de Obra LTDA', confidence: 0.99 },
    { key: 'supplierCnpj', label: 'CNPJ do fornecedor', type: 'text', value: '12.345.678/0001-23', confidence: 0.99 },
    { key: 'totalAmountCents', label: 'Valor total da nota', type: 'currency', value: 1500000, confidence: 0.99 },
    {
      key: 'items',
      label: 'Itens',
      type: 'items',
      value: [{
        materialId: 'diesel',
        description: 'Diesel S10',
        quantity: 1200,
        unit: 'L',
        unitPriceCents: 1250,
        totalPriceCents: 1500000
      }],
      confidence: 0.99
    }
  ],
  items: [{
    materialId: 'diesel',
    description: 'Diesel S10',
    quantity: 1200,
    unit: 'L',
    unitPriceCents: 1250,
    totalPriceCents: 1500000
  }]
};


async function boot(page) {
  await page.addInitScript(() => { globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true; });
  const request={id:'SR-CERT-OCR',title:'Leia esta nota fiscal e prepare um registro.',domain:'obra',status:'triage',files:[]};
  await page.route('**/api/service-requests**',route=>route.fulfill({json:route.request().method()==='POST'||route.request().url().includes('SR-CERT-OCR')?{request}:{requests:[request]}}));
  await page.goto('/');
  await expect(page.locator('belavista-app')).toBeVisible();
  await expect(page.locator('[data-worker-chat-file-input]')).toHaveCount(1);
  await expect(page.locator('[data-worker-chat-file-input]')).not.toHaveAttribute('multiple');
}
async function certifyForm(page, testInfo, requestId) {
  const form=page.locator('[data-control-general-event]');
  await expect(form.locator('[data-record-dynamic-field][data-key="invoiceNumber"]')).toHaveValue('18452');
  await expect(form.locator('[data-record-dynamic-field][data-key="supplier"]')).toHaveValue('Bahia Materiais de Obra LTDA');
  await expect(form.locator('[data-item-key="materialId"]')).toHaveValue('diesel');
  await form.locator('[data-record-dynamic-field][data-key="supplier"]').fill('Fornecedor revisado');
  await form.locator('[name="title"]').fill('Certificação NF 18452');
  await form.locator('[name="responsible"]').fill('Teste OCR');
  await form.locator('[name="details"]').fill('Anexo revisado para confirmação.');
  await form.locator('[data-record-dynamic-field][data-key="supplier"]').scrollIntoViewIfNeeded();
  const screenshot=testInfo.outputPath('ocr-revisao.png');
  await page.screenshot({path:screenshot,fullPage:true});
  await form.locator('[data-record-ocr-properties]').screenshot({path:testInfo.outputPath('propriedades-ocr.png')});
  await testInfo.attach('Revisão visual do registro',{path:screenshot,contentType:'image/png'});
  let saved;
  await page.route('**/api/records',route=>{
    if(route.request().method()!=='POST')return route.continue();
    saved=route.request().postDataJSON();
    return route.fulfill({json:{...saved,id:'REG-CERT-OCR'}});
  });
  await form.locator('button[type="submit"]').click();
  await expect.poll(()=>saved).toBeTruthy();
  expect(saved.properties.find(p=>p.key==='supplier').value).toBe('Fornecedor revisado');
  expect(saved.properties.find(p=>p.key==='invoiceNumber').value).toBe('18452');
  expect(saved.properties.find(p=>p.key==='items').value[0].quantity).toBe(1200);
  if(requestId)expect(saved.requestId).toBe(requestId);
  expect(saved.evidenceUri).toMatch(/^data:image\/png;base64,/);
}
test('CERT — um anexo no chat abre drawer completo e confirma propriedades',async({page},testInfo)=>{
  await page.route('**/api/ai/vision-reasoning',route=>route.fulfill({json:{text:'Nota fiscal lida e pronta para revisão.',recordOcr:ocr,attachment:{id:'IMG-CERT',name:'nf-diesel-18452.png',stored:false},toolCalls:[]}}));
  await boot(page);
  await page.locator('[data-worker-chat-file-input]').setInputFiles(image);
  await expect(page.locator('[data-worker-chat-attachment]')).toContainText('nf-diesel-18452.png');
  await page.screenshot({path:testInfo.outputPath('chat-anexo-compacto.png')});
  await page.locator('[data-worker-chat-form] textarea').fill('Leia esta nota fiscal e prepare um registro.');
  await page.locator('[data-worker-chat-submit]').click();
  await expect(page.locator('[data-chat-apply="record"]')).toBeVisible();
  await expect(page.locator('.worker-chat-service')).toContainText('SR-CERT-OCR');
  await page.locator('[data-chat-apply="record"]').click();
  await expect(page.getByRole('dialog',{name:'Finalizar registro do anexo'})).toBeVisible();
  await expect(page.locator('.worker-chat-record-dialog .control-record-drawer-v2')).toBeVisible();
  await expect(page.locator('.worker-chat-record-dialog .record-dropin-preview-v1')).toContainText('nf-diesel-18452.png');
  await page.screenshot({path:testInfo.outputPath('drawer-completo.png')});
  await certifyForm(page,testInfo,'SR-CERT-OCR');
  await expect(page.locator('[data-worker-chat-status]')).toContainText('REG-CERT-OCR');
});
test('CERT — anexo único da Central gera propriedades confirmáveis',async({page},testInfo)=>{
  await page.route('**/api/records/ocr',route=>route.fulfill({json:ocr}));
  await boot(page);
  await page.getByRole('button',{name:'Central operacional',exact:true}).click();
  const form=page.locator('[data-control-general-event]');
  await expect(form).toBeVisible();
  await form.locator('[data-record-ocr-file]').setInputFiles(image);
  await certifyForm(page,testInfo);
});
