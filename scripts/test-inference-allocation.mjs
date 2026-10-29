import { spawn } from 'node:child_process';
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerUrl = (process.env.ALIANCAPARK_WORKER_URL || 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev').replace(/\/$/, '');
const token = process.env.ALIANCAPARK_SESSION_TOKEN;
const mockInference = process.argv.includes('--mock-inference');
if (!token && !mockInference) {
  console.error('Defina ALIANCAPARK_SESSION_TOKEN com um token de sessão válido. O token não é salvo nem exibido pelo teste.');
  process.exit(2);
}

const outputDir = path.join(root, '.test-artifacts/inference-allocation');
const fixtureDir = path.join(root, 'worker/test/fixtures/inference-allocation');
await mkdir(outputDir, { recursive: true });
const cases = JSON.parse(await readFile(path.join(root, 'worker/test/inference-allocation-cases.json'), 'utf8'));
const { stages } = JSON.parse(await readFile(path.join(root, 'frontend/src/data/archived-stage-seed.json'), 'utf8'));
const actualResults = new Map();
const activities = stages.flatMap(stage => (stage.activities || []).map(activity => ({
  id: activity.id,
  name: activity.title,
  description: [activity.description || activity.summary || '', ...(activity.properties || []).filter(property => property.label || property.value).map(property => `${property.label || 'Detalhe'}: ${property.value || ''}`)].filter(Boolean).join('\n'),
  stageId: stage.id,
  stageName: stage.name,
  stageDescription: stage.description || '',
})));

let failures = 0;
for (const testCase of cases) {
  let result;
  let status = 200;
  if (mockInference) {
    const target = activities.find(activity => activity.id === testCase.expectedActivityId);
    const stage = stages.find(item => item.id === target?.stageId);
    result = {
      filename: testCase.filename,
      model: 'mock-inference-for-ui-test',
      category: testCase.expectedCategory,
      confidence: 1,
      recognized: { description: testCase.description, amount: testCase.quantity * testCase.unitPrice, date: testCase.date, supplier: testCase.supplier, lotLabel: null, items: [{ description: testCase.description, quantity: testCase.quantity, unit: testCase.unit, unitPrice: testCase.unitPrice, amount: testCase.quantity * testCase.unitPrice, activityId: target.id, activityName: target.name, stageId: stage.id, stageName: stage.name, activityConfidence: 1 }] },
      allocation: { destination: testCase.expectedCategory === 'material_expense' ? 'materials' : 'services', lotLabel: null },
      needsClarification: false,
      question: null,
    };
  } else {
    const imagePath = path.join(fixtureDir, testCase.filename);
    const image = (await readFile(imagePath)).toString('base64');
    const response = await fetch(`${workerUrl}/api/inference/attachment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: testCase.filename,
        userContext: testCase.context,
        description: testCase.context,
        activities,
        image: { mimeType: 'image/png', data: image },
      }),
    });
    status = response.status;
    result = await response.json().catch(() => ({}));
    result.httpOk = response.ok;
  }
  actualResults.set(testCase.filename, result);
  const recognized = result.recognized || {};
  const items = Array.isArray(recognized.items) ? recognized.items : [];
  const allocations = items.length ? items.map(item => item.activityId) : [recognized.activityId];
  const uniqueAllocations = [...new Set(allocations.filter(Boolean))];
  const expected = testCase.expectedActivityId;
  const activityOk = uniqueAllocations.length === 1 && uniqueAllocations[0] === expected;
  const categoryOk = result.category === testCase.expectedCategory;
  const resultStatus = status < 400 && activityOk && categoryOk && result.httpOk !== false ? 'PASS' : 'FAIL';
  console.log(`${resultStatus} ${testCase.id}: categoria=${result.category || `HTTP ${status}`} atividade=${uniqueAllocations.join(',') || 'sem alocação'} esperada=${expected}${mockInference ? ' (simulada)' : ''}`);
  if (resultStatus === 'FAIL') {
    failures++;
    if (status >= 400 || result.httpOk === false) console.error(`  Worker: ${result.error || 'resposta inválida'}`);
    else if (!categoryOk) console.error(`  Categoria esperada ${testCase.expectedCategory}, recebida ${result.category || 'ausente'}`);
    else console.error(`  Atividade esperada ${expected}, recebida ${uniqueAllocations.join(', ') || 'nenhuma'}`);
  }
}

console.log(`Resultado: ${cases.length - failures}/${cases.length} alocações corretas${mockInference ? ' no modo simulado' : ' no Worker NVIDIA'}.`);

const port = Number(process.env.ALLOCATION_E2E_PORT || 5197);
const appUrl = `http://127.0.0.1:${port}`;
const vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--config', path.join(root, 'vite.config.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
let browser;
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
  else if (await access('/usr/bin/google-chrome-stable').then(() => true, () => false)) launchOptions.executablePath = '/usr/bin/google-chrome-stable';
  browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const workerOrigin = new URL(workerUrl).origin;
  let memoryData = { lots: [], materials: [], services: [], transfers: [], agenda: [], stages };
  let revision = 'e2e-revision-0';
  const user = { id: 'allocation-e2e', username: 'Teste E2E', role: 'desktop' };
  const testToken = 'a'.repeat(64);
  await page.addInitScript(value => sessionStorage.setItem('alianca-session-token', value), testToken);
  await page.route(`${workerOrigin}/**`, async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/session' && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user }) });
      return;
    }
    if (pathname === '/api/sync' && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: memoryData, revision }) });
      return;
    }
    if (pathname === '/api/sync' && request.method() === 'PUT') {
      const body = request.postDataJSON();
      memoryData = body.data;
      revision = `e2e-revision-${Number(revision.split('-').at(-1)) + 1}`;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: memoryData, revision }) });
      return;
    }
    if (pathname === '/api/inference/attachment' && request.method() === 'POST') {
      const body = request.postDataJSON();
      const result = actualResults.get(body.filename);
      await route.fulfill(result ? { status: 200, contentType: 'application/json', body: JSON.stringify(result) } : { status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Resultado NVIDIA ausente para este arquivo.' }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Endpoint não usado pelo teste E2E.' }) });
  });

  await page.goto(`${appUrl}/#/stages`, { waitUntil: 'domcontentloaded' });
  await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('tab', { name: 'Assistente' }).click();
  const chatInput = page.locator('.chat-composer input[type="file"]').first();
  for (const testCase of cases) {
    const inference = actualResults.get(testCase.filename);
    if (!inference || !inference.recognized) { failures++; console.error(`FAIL UI ${testCase.id}: sem resultado de inferência para aplicar.`); continue; }
    const expectedActivity = stages.flatMap(stage => (stage.activities || []).map(activity => ({ ...activity, stage }))).find(activity => activity.id === testCase.expectedActivityId);
    assert.ok(expectedActivity, `Atividade esperada ausente no catálogo: ${testCase.expectedActivityId}`);

    await chatInput.setInputFiles(path.join(fixtureDir, testCase.filename));
    await page.getByLabel('Mensagem').fill(testCase.context);
    await page.getByRole('button', { name: /Enviar/ }).click();
    const card = page.locator('.classification-card').filter({ hasText: testCase.filename }).last();
    await card.waitFor({ state: 'visible', timeout: 30000 });
    const categorySelect = card.locator('.classification-actions select').first();
    const selectedActivity = card.locator('.ocr-activity-item select').first();
    const uiCategory = await categorySelect.inputValue();
    const uiActivity = await selectedActivity.inputValue().catch(() => inference.recognized.activityId || '');
    const isCorrectSuggestion = uiCategory === testCase.expectedCategory && uiActivity === testCase.expectedActivityId;
    if (!isCorrectSuggestion) {
      failures++;
      console.error(`FAIL UI ${testCase.id}: sugestão visível categoria=${uiCategory}, atividade=${uiActivity || 'sem atividade'}. Esperado ${testCase.expectedCategory}/${testCase.expectedActivityId}.`);
      continue;
    }

    await card.getByRole('button', { name: 'Aplicar à lista' }).click();
    await card.getByText('Aplicado', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    const collection = testCase.expectedCategory === 'material_expense' ? 'materials' : 'services';
    const saved = memoryData[collection].filter(item => item.activityId === testCase.expectedActivityId && item.stageId === expectedActivity.stage.id);
    const evidenceItem = saved.at(-1);
    assert.ok(evidenceItem, `${testCase.filename} não foi salvo em ${collection} com os IDs de etapa e atividade esperados.`);

    await page.getByRole('tab', { name: 'Menu' }).click();
    await page.getByRole('link', { name: 'Etapas' }).click();
    await page.locator('.stage-tabs button').filter({ hasText: expectedActivity.stage.name }).click();
    const stageTree = page.locator('.stage-items-card');
    await stageTree.getByText(expectedActivity.title, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await stageTree.getByText(evidenceItem.name, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, `evidence-${testCase.id}.png`), fullPage: true });

    if (collection === 'materials') {
      await page.getByRole('link', { name: 'Materiais' }).click();
      const materialGroup = page.locator('.category-group').filter({ hasText: expectedActivity.title });
      await materialGroup.getByText(evidenceItem.name, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }
    console.log(`PASS UI ${testCase.id}: nota aplicada e visível em ${expectedActivity.stage.name} › ${expectedActivity.title} (${collection}). Evidência: evidence-${testCase.id}.png`);
    await page.getByRole('tab', { name: 'Assistente' }).click();
  }
  await context.close();
} catch (error) {
  failures++;
  console.error(`FAIL E2E interface: ${error.message}`);
} finally {
  await browser?.close().catch(() => {});
  vite.kill('SIGTERM');
}

console.log(`Resultado final: ${cases.length - failures}/${cases.length} casos completos entre inferência e interface.`);
if (failures) process.exitCode = 1;
