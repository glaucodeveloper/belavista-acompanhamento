import { spawn } from 'node:child_process';
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerUrl = (process.env.ALIANCAPARK_WORKER_URL || 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev').replace(/\/$/, '');
const tokenFile = process.env.ALIANCAPARK_SESSION_TOKEN_FILE;
const token = process.env.ALIANCAPARK_SESSION_TOKEN || (tokenFile ? (await readFile(tokenFile, 'utf8')).trim() : null);
if (!token) {
  console.error('Defina ALIANCAPARK_SESSION_TOKEN ou ALIANCAPARK_SESSION_TOKEN_FILE com uma sessão válida.');
  process.exit(2);
}

const outputDir = path.join(root, '.test-artifacts/inference-allocation');
const fixtureDir = path.join(root, 'worker/test/fixtures/inference-allocation');
const serviceEvidenceFixtureDir = path.join(root, 'worker/test/fixtures/service-evidence');
await mkdir(outputDir, { recursive: true });
const cases = JSON.parse(await readFile(path.join(root, 'worker/test/inference-allocation-cases.json'), 'utf8'));
const clarificationCases = JSON.parse(await readFile(path.join(root, 'worker/test/inference-allocation-clarification-cases.json'), 'utf8'));
const serviceEvidenceCases = JSON.parse(await readFile(path.join(root, 'worker/test/service-evidence-cases.json'), 'utf8'));
const extraCaseFile = process.env.ALLOCATION_E2E_EXTRA_CASE_FILE;
const extraCases = extraCaseFile ? JSON.parse(await readFile(extraCaseFile, 'utf8')) : [];
const selectedCaseIds = new Set(String(process.env.ALLOCATION_E2E_CASES || '').split(',').map(value => value.trim()).filter(Boolean));
const selected = testCase => !selectedCaseIds.size || selectedCaseIds.has(testCase.id);
const runBaseCases = [...(process.env.ALLOCATION_E2E_CLARIFICATIONS_ONLY === '1' ? [] : cases), ...extraCases].filter(selected);
const runClarificationCases = (process.env.ALLOCATION_E2E_BASE_ONLY === '1' ? [] : clarificationCases).filter(selected);
const { stages } = JSON.parse(await readFile(path.join(root, 'frontend/src/data/archived-stage-seed.json'), 'utf8'));
const priceCatalog = JSON.parse(await readFile(path.join(root, 'frontend/src/assets/tabela-precos.json'), 'utf8'));
const activityById = new Map(stages.flatMap(stage => (stage.activities || []).map(activity => [activity.id, { ...activity, stage }])));

const port = Number(process.env.ALLOCATION_E2E_PORT || 5197);
const appUrl = `http://127.0.0.1:${port}`;
const vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--config', path.join(root, 'vite.config.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
let browser;
let failures = 0;
let passedCases = 0;
let memoryData = {
  lots: priceCatalog.slice(0, 6).map(item => ({ ...item, status: 'Disponível', received: 0, entryHistory: [] })),
  materials: [], services: [], transfers: [], agenda: [], stages,
};
let revision = 'e2e-revision-0';
const inferenceResults = new Map();
const inferencePromises = new Map();
const editResults = new Map();
const editPromises = new Map();

async function waitForMessage(page, text) {
  try {
    await page.waitForFunction(value => {
      const messages = [...document.querySelectorAll('.chat-message')].filter(node => node.innerText.includes(value));
      const status = messages.at(-1)?.querySelector('.outbox-status')?.innerText || '';
      return /Processado|Falha no processamento/.test(status);
    }, text, { timeout: 150000 });
  } catch (error) {
    const message = page.locator('.chat-message').filter({ hasText: text }).last();
    const status = await message.locator('.outbox-status').innerText().catch(() => '(sem estado visual)');
    const result = inferenceResults.get(text);
    const response = result ? JSON.stringify({ category: result.category, destination: result.allocation?.destination, needsClarification: result.needsClarification, needsDescription: result.needsDescription, question: result.question }) : '(sem resposta do Worker)';
    throw new Error(`${error.message}; estado=${status}; resposta=${response}`);
  }
}
function normalizeDescription(value) {
  return String(value || '').trim().replace(/[.,;:]+$/u, '').replace(/\s+/g, ' ');
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (vite.exitCode !== null) throw new Error(`Vite encerrou antes de ficar pronto (código ${vite.exitCode}).`);
    try { const response = await fetch(appUrl); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error(`Aplicação local não respondeu em ${appUrl}.`);

  const launchOptions = { headless: true, args: ['--no-sandbox'] };
  if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
  else if (await access('/opt/google/chrome/chrome').then(() => true, () => false)) launchOptions.executablePath = '/opt/google/chrome/chrome';
  else if (await access('/usr/bin/google-chrome-stable').then(() => true, () => false)) launchOptions.executablePath = '/usr/bin/google-chrome-stable';
  browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const inferenceTimings = [];
  const inferenceStartedAt = new Map();
  const timingSummary = start => inferenceTimings.slice(start).map(item => `${item.path} ${(item.durationMs / 1000).toFixed(2)}s`).join(', ');
  const workerOrigin = new URL(workerUrl).origin;
  const user = { id: 'allocation-e2e', username: 'Teste E2E', role: 'mobile' };
  await page.addInitScript(value => sessionStorage.setItem('alianca-session-token', value), token);

  // Somente a persistência é isolada. Sessão e inferência continuam no Worker real.
  await page.route(`${workerOrigin}/api/sync`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: memoryData, revision }) });
      return;
    }
    const body = route.request().postDataJSON();
    memoryData = body.data;
    revision = `e2e-revision-${Number(revision.split('-').at(-1)) + 1}`;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: memoryData, revision }) });
  });
  page.on('response', response => {
    if (response.url().includes('/api/inference/attachment')) {
      const body = response.request().postDataJSON();
      const startedAt = inferenceStartedAt.get(body.filename);
      const pending = response.json().then(result => {
        if (startedAt) inferenceTimings.push({ path: 'imagem', durationMs: Date.now() - startedAt });
        inferenceResults.set(body.filename, result);
      });
      inferencePromises.set(body.filename, pending);
    }
    if (response.url().includes('/api/inference/analysis-edit')) {
      const body = response.request().postDataJSON();
      const startedAt = inferenceStartedAt.get(body.instruction);
      const pending = response.json().then(result => {
        if (startedAt) inferenceTimings.push({ path: 'detalhe', durationMs: Date.now() - startedAt });
        editResults.set(body.instruction, result);
      });
      editPromises.set(body.instruction, pending);
    }
  });

  await page.goto(`${appUrl}/#/stages`, { waitUntil: 'domcontentloaded' });
  await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 15000 });
  const sessionResponse = await page.request.get(`${workerUrl}/api/session`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(sessionResponse.status(), 200, 'A sessão do Worker deve permanecer válida durante o teste.');
  const actualUser = await sessionResponse.json();
  assert.equal(actualUser.user?.role, 'mobile', 'A sessão usada deve corresponder à conta mobile.');
  await page.getByRole('button', { name: 'Abrir assistente' }).click();
  await page.locator('.assistant-chat').waitFor({ state: 'visible' });

  for (const testCase of runBaseCases) {
    const inferenceTimingStart = inferenceTimings.length;
    const beforeMaterials = memoryData.materials.length;
    const beforeServices = memoryData.services.length;
    const expectedActivity = testCase.expectedActivityId ? activityById.get(testCase.expectedActivityId) : null;
    if (testCase.expectedActivityId) assert.ok(expectedActivity, `Atividade esperada ausente no catálogo: ${testCase.expectedActivityId}`);

    await page.locator('.chat-composer input[type="file"]').first().setInputFiles(testCase.filePath || path.join(fixtureDir, testCase.filename));
    await page.getByLabel('Mensagem').fill(testCase.context);
    inferenceStartedAt.set(testCase.filename, Date.now());
    await page.getByRole('button', { name: /Enviar/ }).click();
    const chatMessage = page.locator('.chat-message').filter({ hasText: testCase.filename }).last();
    await chatMessage.waitFor({ state: 'visible', timeout: 15000 });
    await waitForMessage(page, testCase.filename);
    await inferencePromises.get(testCase.filename);

    const result = inferenceResults.get(testCase.filename);
    assert.ok(result, `${testCase.filename}: o Worker não devolveu JSON.`);
    if (process.env.ALLOCATION_E2E_DIAGNOSTICS === '1') console.log(`DIAGNOSTIC ${testCase.id}: ${JSON.stringify(result)}`);
    assert.equal(result.category, testCase.expectedCategory, `${testCase.id}: categoria inferida incorreta.`);
    const collection = testCase.expectedDestination || (testCase.expectedCategory === 'material_expense' ? 'materials' : 'services');
    assert.equal(result.allocation?.destination, collection, `${testCase.id}: destino declarado pelo Worker incorreto.`);
    if (testCase.expectedDepartment) assert.equal(result.allocation?.department, testCase.expectedDepartment, `${testCase.id}: departamento de destino incorreto.`);
    assert.equal(result.needsClarification, false, `${testCase.id}: a nota clara pediu esclarecimento.`);
    const items = result.recognized?.items || [];
    assert.ok(items.length, `${testCase.id}: nenhum item foi reconhecido.`);
    if (expectedActivity) assert.ok(items.every(item => item.activityId === testCase.expectedActivityId && item.stageId === expectedActivity.stage.id), `${testCase.id}: vínculo de etapa/atividade divergente.`);
    if (testCase.expectedDescription) assert.ok(items.some(item => normalizeDescription(item.description) === normalizeDescription(testCase.expectedDescription)), `${testCase.id}: descrição inferida diverge do texto impresso.`);

    const expectedCollection = collection === 'materials' ? memoryData.materials : memoryData.services;
    const newRows = expectedCollection.slice(collection === 'materials' ? beforeMaterials : beforeServices);
    assert.equal(newRows.length, items.length, `${testCase.id}: quantidade de linhas salvas não corresponde aos itens reconhecidos.`);
    for (const item of items) {
      const rowFound = expectedActivity
        ? newRows.some(row => row.name === item.description && row.activityId === testCase.expectedActivityId && row.stageId === expectedActivity.stage.id)
        : newRows.some(row => row.name === item.description && row.category === testCase.expectedDepartment);
      assert.ok(rowFound, `${testCase.id}: linha ausente em ${collection} com destino esperado.`);
    }
    assert.equal(memoryData.materials.length, collection === 'materials' ? beforeMaterials + items.length : beforeMaterials, `${testCase.id}: gravou em Materiais indevidamente.`);
    assert.equal(memoryData.services.length, collection === 'services' ? beforeServices + items.length : beforeServices, `${testCase.id}: gravou em Serviços indevidamente.`);
    assert.equal(await page.locator('.classification-card').count(), 0, 'A tela não deve exibir formulário de confirmação.');
    await chatMessage.locator('.chat-assistant-reply p').waitFor({ state: 'visible', timeout: 10000 });
    await page.screenshot({ path: path.join(outputDir, `evidence-${testCase.id}.png`), fullPage: true });
    passedCases++;

    console.log(`PASS ${testCase.id}: Worker ${result.category} → ${result.allocation.destination}${testCase.expectedDepartment ? ` / ${testCase.expectedDepartment}` : ` → ${expectedActivity.stage.name} / ${expectedActivity.title}`}; ${items.length} item(ns) salvo(s) em memória. Tempo: ${timingSummary(inferenceTimingStart) || 'sem métrica'}.`);
  }

  for (const testCase of runClarificationCases) {
    const inferenceTimingStart = inferenceTimings.length;
    const beforeMaterials = memoryData.materials.length;
    const beforeServices = memoryData.services.length;
    const expectedCollectionBefore = testCase.expectedDestination === 'services' ? beforeServices : beforeMaterials;
    const expectedActivity = activityById.get(testCase.expectedActivityId);
    assert.ok(expectedActivity, `Atividade esperada ausente no catálogo: ${testCase.expectedActivityId}`);

    await page.locator('.chat-composer input[type="file"]').first().setInputFiles(path.join(fixtureDir, testCase.filename));
    await page.getByLabel('Mensagem').fill(testCase.context);
    inferenceStartedAt.set(testCase.filename, Date.now());
    await page.getByRole('button', { name: /Enviar/ }).click();
    const chatMessage = page.locator('.chat-message').filter({ hasText: testCase.filename }).last();
    await chatMessage.waitFor({ state: 'visible', timeout: 15000 });
    await waitForMessage(page, testCase.filename);
    await inferencePromises.get(testCase.filename);

    const result = inferenceResults.get(testCase.filename);
    assert.ok(result, `${testCase.filename}: o Worker não devolveu JSON.`);
    if (process.env.ALLOCATION_E2E_DIAGNOSTICS === '1') console.log(`DIAGNOSTIC ${testCase.id}: ${JSON.stringify(result)}`);
    assert.equal(result.category, testCase.expectedCategory, `${testCase.id}: categoria incorreta.`);
    assert.equal(result.allocation?.destination, testCase.expectedDestination, `${testCase.id}: destino sugerido incorreto.`);
    assert.equal(result.needsClarification, true, `${testCase.id}: descrição incompleta foi aplicada sem pergunta.`);
    assert.ok(result.question, `${testCase.id}: Worker não formulou a pergunta necessária.`);
    assert.equal(memoryData.materials.length, beforeMaterials, `${testCase.id}: gravou material antes da resposta.`);
    assert.equal(memoryData.services.length, beforeServices, `${testCase.id}: gravou serviço antes da resposta.`);
    assert.equal(await page.locator('.classification-card').count(), 0, `${testCase.id}: apareceu formulário de confirmação.`);
    const visibleQuestion = await chatMessage.locator('.chat-assistant-reply p').innerText();
    assert.ok(visibleQuestion.includes(result.question), `${testCase.id}: pergunta do Worker não chegou ao chat.`);

    await page.getByLabel('Mensagem').fill(testCase.followUp);
    inferenceStartedAt.set(testCase.followUp, Date.now());
    await page.getByRole('button', { name: /Enviar/ }).click();
    await waitForMessage(page, testCase.followUp);
    await editPromises.get(testCase.followUp);
    const edit = editResults.get(testCase.followUp);
    if (process.env.ALLOCATION_E2E_DIAGNOSTICS === '1') console.log(`EDIT ${testCase.id}: ${JSON.stringify(edit)}`);
    assert.ok(edit?.patch, `${testCase.id}: Worker não devolveu revisão para o detalhe informado.`);
    const destinationRows = testCase.expectedDestination === 'services' ? memoryData.services : memoryData.materials;
    const newItems = destinationRows.slice(expectedCollectionBefore);
    assert.equal(newItems.length, 1, `${testCase.id}: resposta suficiente não gerou exatamente uma linha em ${testCase.expectedDestination}.`);
    assert.equal(normalizeDescription(newItems[0].name), normalizeDescription(testCase.expectedDescription), `${testCase.id}: descrição salva diverge do texto informado.`);
    assert.equal(newItems[0].activityId, testCase.expectedActivityId, `${testCase.id}: atividade salva incorreta.`);
    assert.equal(newItems[0].stageId, expectedActivity.stage.id, `${testCase.id}: etapa salva incorreta.`);
    assert.equal(memoryData.materials.length, testCase.expectedDestination === 'materials' ? beforeMaterials + 1 : beforeMaterials, `${testCase.id}: detalhe alterou Materiais em vez do destino esperado.`);
    assert.equal(memoryData.services.length, testCase.expectedDestination === 'services' ? beforeServices + 1 : beforeServices, `${testCase.id}: detalhe alterou Serviços em vez do destino esperado.`);
    await page.screenshot({ path: path.join(outputDir, `evidence-${testCase.id}.png`), fullPage: true });
    passedCases++;
    console.log(`PASS ${testCase.id}: não salvou antes do detalhe; perguntou no chat; resposta levou a ${testCase.expectedDestination} → ${expectedActivity.stage.name} / ${expectedActivity.title}. Tempo: ${timingSummary(inferenceTimingStart) || 'sem métrica'}.`);
  }

  for (const testCase of serviceEvidenceCases.filter(selected)) {
    const inferenceTimingStart = inferenceTimings.length;
    const beforeMaterials = memoryData.materials.length;
    const beforeServices = memoryData.services.length;
    const expectedActivity = activityById.get(testCase.expectedActivityId);
    assert.ok(expectedActivity, `Atividade esperada ausente no catálogo: ${testCase.expectedActivityId}`);

    await page.locator('.chat-composer input[type="file"]').first().setInputFiles(path.join(serviceEvidenceFixtureDir, testCase.filename));
    await page.getByLabel('Mensagem').fill(testCase.context);
    inferenceStartedAt.set(testCase.filename, Date.now());
    await page.getByRole('button', { name: /Enviar/ }).click();
    const chatMessage = page.locator('.chat-message').filter({ hasText: testCase.filename }).last();
    await chatMessage.waitFor({ state: 'visible', timeout: 15000 });
    await waitForMessage(page, testCase.filename);
    await inferencePromises.get(testCase.filename);

    const result = inferenceResults.get(testCase.filename);
    assert.ok(result, `${testCase.filename}: o Worker não devolveu JSON.`);
    if (process.env.ALLOCATION_E2E_DIAGNOSTICS === '1') console.log(`DIAGNOSTIC ${testCase.id}: ${JSON.stringify(result)}`);
    assert.equal(result.category, 'service_evidence', `${testCase.id}: fotografia de serviço não foi separada da nota financeira.`);
    assert.equal(result.documentType, 'field_service_photo', `${testCase.id}: tipo de documento incorreto.`);
    assert.equal(result.direction, null, `${testCase.id}: fotografia foi marcada como entrada ou saída financeira.`);
    assert.equal(result.allocation?.destination, 'fieldEvidence', `${testCase.id}: destino da evidência incorreto.`);
    assert.equal(result.recognized?.amount, null, `${testCase.id}: inventou um valor financeiro.`);
    assert.deepEqual(result.recognized?.items, [], `${testCase.id}: criou itens financeiros para uma fotografia.`);
    assert.equal(result.serviceEvidence?.activityId, testCase.expectedActivityId, `${testCase.id}: atividade de catálogo incorreta.`);
    assert.equal(result.serviceEvidence?.stageId, expectedActivity.stage.id, `${testCase.id}: etapa incorreta.`);
    assert.equal(Boolean(result.needsClarification), testCase.expectedClarification, `${testCase.id}: estado de esclarecimento incorreto.`);
    assert.equal(memoryData.materials.length, beforeMaterials, `${testCase.id}: alterou Materiais indevidamente.`);
    assert.equal(memoryData.services.length, beforeServices, `${testCase.id}: alterou Serviços financeiros indevidamente.`);
    assert.equal(await page.locator('.classification-card').count(), 0, `${testCase.id}: apareceu formulário financeiro de confirmação.`);

    if (testCase.expectedClarification) {
      assert.ok(/rua|quadra|área/.test(result.question || ''), `${testCase.id}: não perguntou a localização ausente.`);
      const visibleQuestion = await chatMessage.locator('.chat-assistant-reply p').innerText();
      assert.ok(visibleQuestion.includes(result.question), `${testCase.id}: pergunta de localização não chegou ao chat.`);
      await page.getByLabel('Mensagem').fill(testCase.followUp);
      inferenceStartedAt.set(testCase.followUp, Date.now());
      await page.getByRole('button', { name: /Enviar/ }).click();
      await waitForMessage(page, testCase.followUp);
      await editPromises.get(testCase.followUp);
      const edit = editResults.get(testCase.followUp);
      assert.equal(edit?.patch?.serviceEvidence?.location, testCase.expectedLocation, `${testCase.id}: resposta não foi aplicada como localização.`);
      const evidenceText = await chatMessage.locator('.service-evidence-card').innerText();
      assert.ok(evidenceText.includes(testCase.expectedLocation), `${testCase.id}: localização respondida não aparece na evidência do chat.`);
      assert.equal(memoryData.materials.length, beforeMaterials, `${testCase.id}: resposta criou material financeiro.`);
      assert.equal(memoryData.services.length, beforeServices, `${testCase.id}: resposta criou serviço financeiro.`);
    } else {
      assert.equal(result.serviceEvidence?.location, testCase.expectedLocation, `${testCase.id}: área informada não foi reconhecida.`);
      assert.ok(result.serviceEvidence?.summary, `${testCase.id}: descrição visual vazia.`);
      assert.ok(result.serviceEvidence?.observedStatus, `${testCase.id}: situação observada ausente.`);
      const evidenceText = await chatMessage.locator('.service-evidence-card').innerText();
      assert.ok(evidenceText.includes(expectedActivity.title), `${testCase.id}: vínculo com etapa/atividade não aparece no chat.`);
      assert.ok(evidenceText.includes(testCase.expectedLocation), `${testCase.id}: área não aparece no chat.`);
    }
    await page.screenshot({ path: path.join(outputDir, `evidence-${testCase.id}.png`), fullPage: true });
    passedCases++;
    console.log(`PASS ${testCase.id}: foto → ${expectedActivity.stage.name} / ${expectedActivity.title}${testCase.expectedClarification ? ' → perguntou a área e aplicou a resposta' : ` → ${testCase.expectedLocation}`}; sem lançamento financeiro. Tempo: ${timingSummary(inferenceTimingStart) || 'sem métrica'}.`);
  }

  const viewport = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, chatWidth: document.querySelector('.assistant-chat')?.scrollWidth || 0 }));
  assert.ok(viewport.documentWidth <= viewport.width, `Overflow horizontal no mobile: ${viewport.documentWidth}px para viewport ${viewport.width}px.`);
  console.log(`PASS viewport mobile: ${viewport.width}px sem extrapolação horizontal.`);
  await context.close();
} catch (error) {
  failures++;
  console.error(`FAIL E2E: ${error.message}`);
} finally {
  await browser?.close().catch(() => {});
  vite.kill('SIGTERM');
}

const selectedCases = runBaseCases.length + runClarificationCases.length + serviceEvidenceCases.filter(selected).length;
console.log(`Resultado final: ${passedCases}/${selectedCases} casos passaram em Worker real, chat e destino em memória.${failures ? ` Falhas: ${failures}.` : ''}`);
if (failures) process.exitCode = 1;
