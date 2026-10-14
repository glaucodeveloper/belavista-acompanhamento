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
test('CERT — um anexo no chat abre a alocação OCR na Central',async({page},testInfo)=>{
  await page.route('**/api/ai/vision-reasoning',route=>route.fulfill({json:{text:'Nota fiscal lida e alocada na etapa indicada.',recordOcr:ocr,attachment:{id:'IMG-CERT',name:'nf-diesel-18452.png',stored:false},toolCalls:[{name:'stage.allocate_visual_record',arguments:{target:'material',stageKey:'water',stageName:'Rede de Água',materialName:'Diesel S10',activityName:'Abastecimento da frente',quantity:1200,unit:'L',details:'Item identificado na nota fiscal.',pointer:'linha de item Diesel S10',confidence:.99}}]}}));
  await page.route('**/api/records',route=>{
    if(route.request().method()!=='POST')return route.continue();
    const payload=route.request().postDataJSON();
    return route.fulfill({json:{...payload,id:'REG-CERT-OCR'}});
  });
  await boot(page);
  await page.locator('[data-worker-chat-file-input]').setInputFiles(image);
  await expect(page.locator('[data-worker-chat-attachment]')).toContainText('nf-diesel-18452.png');
  await page.screenshot({path:testInfo.outputPath('chat-anexo-compacto.png')});
  await page.locator('[data-worker-chat-form] textarea').fill('Leia esta nota fiscal e prepare um registro.');
  await page.locator('[data-worker-chat-submit]').click();
  await expect(page.locator('[data-chat-apply="record"]')).toBeVisible();
  await expect(page.locator('.worker-chat-service')).toContainText('SR-CERT-OCR');
  await page.locator('[data-chat-apply="record"]').click();
  const dialog=page.locator('dialog[data-stage-center-item-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Rede de Água');
  await expect(dialog).toContainText('Diesel S10');
  await expect(dialog).toContainText('nf-diesel-18452.png');
  await page.screenshot({path:testInfo.outputPath('central-alocacao-ocr.png')});
});
test('CERT — leitura do chat cria adição de material na Central e abre suas propriedades',async({page})=>{
  const saved=[];
  await page.route('**/api/ai/vision-reasoning',route=>route.fulfill({json:{
    text:'Nota fiscal lida e alocada na etapa indicada.',
    recordOcr:ocr,
    attachment:{id:'IMG-CERT-CENTER',name:'nf-diesel-18452.png',stored:false},
    toolCalls:[{name:'stage.allocate_visual_record',arguments:{
      target:'material',stageKey:'water',stageName:'Rede de Água',materialName:'Diesel S10',
      activityName:'Abastecimento da frente',quantity:1200,unit:'L',
      details:'Item identificado na nota fiscal.',pointer:'linha de item Diesel S10',confidence:.99
    }}]
  }}));
  await page.route('**/api/records',route=>{
    if(route.request().method()!=='POST')return route.continue();
    const payload=route.request().postDataJSON();
    saved.push(payload);
    return route.fulfill({json:{...payload,id:'REG-CERT-CENTER'}});
  });
  await boot(page);
  await page.locator('[data-worker-chat-file-input]').setInputFiles(image);
  await page.locator('[data-worker-chat-form] textarea').fill('Leia esta nota fiscal.');
  await page.locator('[data-worker-chat-submit]').click();
  await expect.poll(()=>saved.length).toBe(1);
  expect(saved[0].stageKey).toBe('water');
  expect(saved[0].allocationTarget).toBe('material');
  expect(saved[0].properties.find(property=>property.id==='allocation_stage').value).toBe('Rede de Água');
  expect(saved[0].properties.find(property=>property.id==='allocation_material').value).toBe('Diesel S10');
  await page.getByRole('button',{name:'Etapas',exact:true}).click();
  const center=page.locator('[data-stage-home-record-resources]');
  await expect(center).toBeVisible();
  await center.locator('[data-stage-home-resource-stage]').selectOption('water');
  const row=center.locator('[data-stage-center-material-row]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Diesel S10');
  await row.evaluate(element => element.click());
  const dialog=page.locator('dialog[data-stage-center-item-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Rede de Água');
  await expect(dialog).toContainText('Assistente operacional');
  await expect(dialog).toContainText('Etapa associada');
  await expect(dialog).toContainText('nf-diesel-18452.png');
});
test('CERT — OCR sem encaixe seguro pergunta a etapa e não grava adição órfã',async({page})=>{
  const saved=[];
  await page.route('**/api/ai/vision-reasoning',route=>route.fulfill({json:{
    text:'Li o anexo, mas preciso confirmar a etapa.',
    recordOcr:ocr,
    attachment:{id:'IMG-CERT-QUESTION',name:'nf-diesel-18452.png',stored:false},
    toolCalls:[]
  }}));
  await page.route('**/api/records',route=>{
    if(route.request().method()!=='POST')return route.continue();
    saved.push(route.request().postDataJSON());
    return route.fulfill({json:{id:'REG-SHOULD-NOT-EXIST'}});
  });
  await boot(page);
  await page.locator('[data-worker-chat-file-input]').setInputFiles(image);
  await page.locator('[data-worker-chat-form] textarea').fill('Leia esta nota fiscal.');
  await page.locator('[data-worker-chat-submit]').click();
  await expect(page.locator('[data-worker-chat-log]')).toContainText('Qual etapa ou atividade deve receber este item?');
  expect(saved).toHaveLength(0);
  await expect(page.locator('[data-stage-record-center] [data-stage-center-material-row]')).toHaveCount(0);
});
