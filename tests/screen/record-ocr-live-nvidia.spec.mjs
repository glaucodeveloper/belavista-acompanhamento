import { test, expect } from '@playwright/test';
import { statSync } from 'node:fs';
import path from 'node:path';

test.setTimeout(240000);
test.use({ serviceWorkers: 'block' });
test.skip(process.env.BELAVISTA_LIVE_NVIDIA !== '1', 'Execute explicitamente com BELAVISTA_LIVE_NVIDIA=1; usa a chave NVIDIA real.');

const root = path.resolve(process.cwd());
const materialNote = path.join(root, 'tests', 'fixtures', 'record-ocr', 'live', 'nf-construcao-cimento-publica.jpg');
const servicePhoto = path.join(root, 'tests', 'fixtures', 'record-ocr', 'live', 'confidence-construtora-estadio-seabra-seabra-001.jpeg');

function apiPath(response, pathname) {
  try { return new URL(response.url()).pathname === pathname; } catch { return false; }
}

async function verifyLiveChatFlow(page, testInfo, { image, message, target, expectedLabel, expectedText, expectedStageKey, expectedStageName }) {
  const healthResponse = await page.request.get('/api/health');
  expect(healthResponse.ok()).toBeTruthy();
  const health = await healthResponse.json();
  expect(health.ai?.provider).toBe('nvidia');
  expect(health.ai?.configured).toBe(true);

  const beforeResponse = await page.request.get('/api/records');
  expect(beforeResponse.ok()).toBeTruthy();
  const before = await beforeResponse.json();
  const beforeCount = Array.isArray(before.records) ? before.records.length : 0;
  let inferenceRequest = null;

  page.on('request', request => {
    if (apiPath(request, '/api/ai/vision-reasoning') && request.method() === 'POST') {
      inferenceRequest = request.postDataJSON();
    }
  });

  const inferenceResponsePromise = page.waitForResponse(
    response => apiPath(response, '/api/ai/vision-reasoning') && response.request().method() === 'POST',
    { timeout: 180000 },
  );
  const serviceRequestResponses = [];
  const recordResponses = [];
  page.on('response', response => {
    const request = response.request();
    if (request.method() !== 'POST') return;
    if (apiPath(response, '/api/service-requests')) serviceRequestResponses.push(response);
    if (apiPath(response, '/api/records')) recordResponses.push(response);
  });

  const browserDiagnostics = [];
  page.on('pageerror', error => browserDiagnostics.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') browserDiagnostics.push(`console:${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400 && /worker-context-chat|app\.js|components\.js/.test(response.url())) browserDiagnostics.push(`http${response.status()}:${response.url()}`); });
  await page.goto('/');
  await expect(page.locator('belavista-app')).toBeVisible();
  await page.waitForFunction(() => (window.__BELAVISTA_RECORD_OCR_BRIDGE_V21?.stages || []).length > 0);
  if (await page.locator('[data-worker-chat-file-input]').count() === 0) {
    console.log(`[CHAT MOUNT DIAGNOSTIC] ${JSON.stringify(await page.evaluate(() => ({ assistant: Boolean(window.belavistaWorkerAssistant), root: Boolean(document.querySelector('[data-worker-context-assistant]')), chatScript: performance.getEntriesByType('resource').filter(entry => entry.name.includes('worker-context-chat')).map(entry => entry.name), bodyEnd: document.body.innerHTML.slice(-500) })))}`);
    console.log(`[BROWSER ERRORS] ${JSON.stringify(browserDiagnostics)}`);
  }
  if (target === 'material') {
    await page.evaluate(() => {
      const store = window.__BELAVISTA_RECORD_OCR_BRIDGE_V21?.appStore;
      if (!store) throw new Error('Estado operacional indisponível para selecionar etapa de navegação.');
      const state = store.get() || {};
      store.set({ ...state, selectedStageV9: 'curbs', selectedStage: 'curbs' });
    });
  }
  await expect(page.locator('[data-worker-chat-file-input]')).toHaveCount(1);
  await page.locator('[data-worker-chat-file-input]').setInputFiles(image);
  await page.locator('[data-worker-chat-form] textarea').fill(message);
  await page.locator('[data-worker-chat-submit]').click();

  const inferenceResponse = await inferenceResponsePromise;
  const inference = await inferenceResponse.json();
  const stageInterpretation = inferenceRequest?.context?.recordInterpretation;
  expect(inferenceResponse.status(), JSON.stringify(inference.error || inference)).toBe(200);
  expect(inference.provider).toBe('nvidia');
  expect(inference.model).toBe('meta/llama-3.2-11b-vision-instruct');
  expect(new URL(inference.endpoint).protocol).toBe('https:');
  expect(new URL(inference.endpoint).hostname).not.toMatch(/^(localhost|127\.0\.0\.1)$/);
  expect(inference.vision).toBe(true);
  expect(inference.model).toBeTruthy();
  expect(inference.recordOcr).toBeTruthy();
  expect(inference.recordOcr.error).toBeFalsy();
  expect(inference.recordOcr.model).toBe('meta/llama-3.2-11b-vision-instruct');
  if (target === 'material') {
    expect(inference.recordOcr.items?.length || 0, 'a nota fiscal precisa produzir pelo menos uma linha estruturada').toBeGreaterThan(0);
  } else {
    expect(inference.recordOcr.documentType).toBe('service_evidence');
    console.log(`[LIVE SERVICE IMAGE ANALYSIS] ${JSON.stringify({ serviceEvidence: inference.recordOcr.serviceEvidence || null, items: inference.recordOcr.items || [], toolCalls: inference.toolCalls || [], response: inference.text || '' })}`);
  }
  expect(inference.visionPipeline?.ocrImageSent).toBe(true);
  const hasUsefulOcrItem = (inference.recordOcr.items || []).some(item =>
    String(item.description || item.name || item.materialName || item.materialId || '').trim().length >= 3 &&
    /^(material|materiais|servico|serviço|serviços|servicos|service|labor|m[aã]o de obra)$/i.test(String(item.itemKind || item.type || ''))
  );
  expect(inference.visionPipeline?.assistantImageSent, target === 'service'
    ? 'foto de serviço sem descrição deve ser enviada ao modelo de visão como fallback'
    : 'a DANFE já estruturada pelo OCR não precisa ser reenviada ao modelo de raciocínio').toBe(target === 'service' || !hasUsefulOcrItem);

  await expect.poll(() => serviceRequestResponses.length, { timeout: 30000 }).toBeGreaterThan(0);
  const serviceRequestResponse = serviceRequestResponses.at(-1);
  expect(serviceRequestResponse.status()).toBe(201);
  const serviceRequest = await serviceRequestResponse.json();
  const verification = page.locator('[data-record-verification]');
  await expect(verification).toBeVisible();
  await expect(verification).toContainText(expectedStageName);
  await expect(verification).toContainText(expectedText);
  await expect(verification).toContainText(path.basename(image));
  const storedFiles = serviceRequest.request?.files || serviceRequest.files || [];
  expect(storedFiles.length).toBeGreaterThan(0);
  const storedFileResponse = await page.request.get(storedFiles[0].fileUrl);
  expect(storedFileResponse.status()).toBe(200);
  expect((await storedFileResponse.body()).length).toBe(statSync(image).size);

  expect(inferenceRequest).toBeTruthy();
  expect(inferenceRequest.message).toContain(expectedText);
  expect(inferenceRequest.attachment?.dataUrl).toMatch(/^data:image\/(png|jpeg|jpg);base64,/i);
  expect(inferenceRequest.context?.stages).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: expectedStageName }),
  ]));
  if (target === 'material') {
    expect(stageInterpretation?.explicitStage).toEqual(expect.objectContaining({ key: expectedStageKey, name: expectedStageName }));
    expect(stageInterpretation?.selectedStage).toEqual(expect.objectContaining({ key: 'curbs', role: 'navigation-context-only' }));
    expect(stageInterpretation?.stageCandidates?.find(stage => stage.key === expectedStageKey)?.materials).toContain('Cimento');
  }

  await expect.poll(() => recordResponses.length, { timeout: 60000, message: 'A inferência/OCR válidos não produziram POST real para /api/records.' }).toBeGreaterThan(0);
  const recordResponse = recordResponses.at(-1);
  expect(recordResponse.status()).toBe(201);
  const created = await recordResponse.json();
  console.log(`[LIVE SAVED RECORD] ${JSON.stringify({ id: created.id, stageKey: created.stageKey, stageName: created.stageName, etapa: created.etapa, allocationTarget: created.allocationTarget, properties: created.properties?.filter(property => /allocation_(stage|target|activity|material|quantity|unit)/.test(property.id || '')) })}`);
  const allocatedTarget = created.allocationTarget || created.properties?.find(property => property.id === 'allocation_target')?.value;
  expect(allocatedTarget).toBe(target === 'service' ? 'Serviços' : 'Materiais');
  expect(created.etapa).toBe(expectedStageName);
  expect(created.properties.find(property => property.id === 'allocation_stage_key')?.value).toBe(expectedStageKey);
  expect(created.properties.find(property => property.id === 'allocation_stage')?.value).toBe(expectedStageName);
  expect(created.properties.find(property => property.id === 'allocation_attachment_url')?.value).toBe(storedFiles[0].fileUrl);
  expect(created.properties.find(property => property.id === 'allocation_target')?.value).toBe(expectedLabel);
  expect(JSON.stringify(created)).toContain(expectedText);

  const afterResponse = await page.request.get('/api/records');
  expect(afterResponse.ok()).toBeTruthy();
  const after = await afterResponse.json();
  expect(after.records).toHaveLength(beforeCount + 1);
  expect(after.records.some(record => record.id === created.id)).toBe(true);

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  const center = page.locator('[data-stage-record-center]');
  await expect(center).toBeVisible();
  const tab = target === 'service' ? 'services' : 'materials';
  await center.locator(`[data-stage-record-center-tab="${tab}"]`).click();
  const rowSelector = target === 'service' ? '[data-stage-center-service-row]' : '[data-stage-center-material-row]';
  const row = center.locator(rowSelector).filter({ hasText: expectedText });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(expectedStageName);
  if (target === 'material') {
    await expect(row).toContainText('3');
    await expect(row).toContainText('UNID');
  }
  await row.locator('td').first().click();

  const dialog = page.locator('dialog[data-stage-center-item-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(expectedText);
  await expect(dialog).toContainText(expectedStageName);
  await expect(dialog).toContainText(path.basename(image));
  if (target === 'service') {
    const activity = created.properties.find(property => property.id === 'allocation_activity')?.value;
    expect(activity).toBeTruthy();
    expect(activity).not.toBe('Não informado');
  }
  const attachmentLink = dialog.locator('a[aria-label="Abrir anexo"]');
  await expect(attachmentLink).toHaveCount(1);
  expect(await attachmentLink.getAttribute('href')).toBe(storedFiles[0].fileUrl);
  const savedRecordFile = await page.request.get(new URL(await attachmentLink.getAttribute('href'), page.url()).toString());
  expect(savedRecordFile.status()).toBe(200);
  expect((await savedRecordFile.body()).length).toBe(statSync(image).size);
  await dialog.locator('.stage-record-dialog-body').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(attachmentLink).toBeVisible();
  if (target === 'material') {
    await expect(dialog).toContainText('3');
    await expect(dialog).toContainText('UNID');
  }
  const screenshot = testInfo.outputPath(`${target}-live-nvidia-alocado.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach(`${target}-live-nvidia-alocado.png`, { path: screenshot, contentType: 'image/png' });

  console.log(`[LIVE NVIDIA] provider=${inference.provider}; OCR=${inference.recordOcr.model}; reasoning=${inference.model}; imageSentToReasoner=${inference.visionPipeline?.assistantImageSent}; target=${target}; stage=${expectedStageName}; record=${created.id}; serviceRequest=${serviceRequest.request?.id || serviceRequest.id}; DB-count=${beforeCount}->${after.records.length}`);
  return { inference, inferenceRequest, created, serviceRequest };
}

test('AO VIVO NVIDIA — DANFE pública de compra aloca cimento já cadastrado', async ({ page }, testInfo) => {
  const { inference, created } = await verifyLiveChatFlow(page, testInfo, {
    image: materialNote,
    message: 'Solicito analisar esta nota fiscal de compra e registrar somente a linha CIMENTO COLA INT CINZA AC1 15KG como o material Cimento já cadastrado no sistema, na etapa Drenagem Pluvial. A etapa selecionada na interface é Meio-fio e serve apenas para navegação; não a use como destino. Leia quantidade e unidade da linha da nota, sem inferir valores que não estejam visíveis.',
    target: 'material',
    expectedLabel: 'Materiais',
    expectedText: 'Cimento',
    expectedStageKey: 'drainage',
    expectedStageName: 'Drenagem Pluvial',
  });

  const recognizedText = JSON.stringify(inference.recordOcr).toLocaleLowerCase('pt-BR');
  expect(recognizedText).toContain('cimento cola');
  expect(recognizedText).toContain('ac1');
  expect(Number(created.properties.find(property => property.id === 'allocation_quantity')?.value)).toBe(3);
  expect(created.properties.find(property => property.id === 'allocation_unit')?.value).toBe('UNID');
  expect(created.properties.find(property => property.id === 'allocation_material')?.value).toBe('Cimento');
});

test('AO VIVO NVIDIA — foto pública + indicação da etapa identificam e alocam serviço pela imagem', async ({ page }, testInfo) => {
  const { created, inference, inferenceRequest } = await verifyLiveChatFlow(page, testInfo, {
    image: servicePhoto,
    message: 'Etapa: Terraplanagem.',
    target: 'service',
    expectedLabel: 'Serviços',
    expectedText: 'Terraplanagem',
    expectedStageKey: 'earthwork',
    expectedStageName: 'Terraplanagem',
  });

  const imageDerivedActions = [
    inference.recordOcr.serviceEvidence?.actionDescription,
    ...(inference.recordOcr.items || []).filter(item => /servi[cç]|service|labor/i.test(String(item.itemKind || item.type || ''))).map(item => item.activityName || item.description || item.name),
    ...(inference.toolCalls || []).filter(call => call.name === 'stage.allocate_visual_record' && call.arguments?.target === 'service').map(call => `${call.arguments.activityName || ''} ${call.arguments.details || ''} ${call.arguments.pointer || ''}`),
  ].filter(Boolean).join(' ');
  expect(inferenceRequest?.message).toBe('Etapa: Terraplanagem.');
  expect(inferenceRequest?.attachment?.dataUrl).toMatch(/^data:image\/(jpeg|jpg);base64,/i);
  expect(inferenceRequest?.context?.recordInterpretation?.explicitStage).toEqual(expect.objectContaining({ key: 'earthwork', name: 'Terraplanagem' }));
  expect(imageDerivedActions, 'a ação deve vir da operação visível, não do nome da etapa repetido').toMatch(/escava|movimenta|nivel|conforma|prepara|solo/i);
  expect(inference.visionPipeline?.assistantImageSent).toBe(true);
  const savedActivity = created.properties.find(property => property.id === 'allocation_activity')?.value;
  expect(savedActivity).toMatch(/escava|movimenta|nivel|conforma|prepara|solo/i);
  expect(savedActivity).not.toBe('Terraplanagem');
  expect(created.properties.find(property => property.id === 'allocation_material')?.value).toBe('Não informado');
  expect(created.properties.find(property => property.id === 'allocation_unit')?.value).toBe('registro');
  console.log(`[LIVE PHOTO-ONLY ACTION] ${JSON.stringify({ imageDerivedActions, savedActivity, observedDate: inference.recordOcr.serviceEvidence?.observedDate || null, observedTime: inference.recordOcr.serviceEvidence?.observedTime || null })}`);
  expect(created.properties.find(property => property.id === 'allocation_target')?.value).toBe('Serviços');
});
