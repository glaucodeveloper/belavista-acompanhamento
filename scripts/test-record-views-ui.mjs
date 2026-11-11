import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const token = process.env.ALIANCAPARK_SESSION_TOKEN;
if (!token) throw new Error('Defina ALIANCAPARK_SESSION_TOKEN.');
const origin = 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';
const name = `TESTE_VISOES_${randomUUID()}`;
const app = 'http://127.0.0.1:5204';
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'vite.config.js', '--host', '127.0.0.1', '--port', '5204', '--strictPort'], { stdio: 'ignore' });
let browser, modified = false;
async function cleanup() {
  for (let i = 0; i < 3; i++) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const read = await fetch(`${origin}/api/sync`, { headers, cache: 'no-store' });
    if (!read.ok) throw new Error(`Falha ao verificar limpeza (${read.status}).`);
    const { data, revision } = await read.json();
    const materials = (data.materials || []).filter(row => !String(row.name || '').startsWith(name));
    const services = (data.services || []).filter(row => !String(row.name || '').startsWith(name));
    if (materials.length === (data.materials || []).length && services.length === (data.services || []).length) return;
    const save = await fetch(`${origin}/api/sync`, { method: 'PUT', headers, body: JSON.stringify({ data: { ...data, materials, services }, revision }) });
    if (save.ok) return;
    if (save.status !== 409) throw new Error(`Falha ao limpar registros de teste (${save.status}).`);
  }
  throw new Error('Conflito ao limpar registros de teste.');
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(app)).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
  if (!ready) throw new Error('Aplicação não iniciou.');
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => sessionStorage.setItem('alianca-session-token', value), token);
  await page.goto(app);
  await page.locator('.sync-state').getByText('Dados sincronizados').waitFor({ timeout: 30000 });
  async function navigate(label) {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('menuitem', { name: new RegExp(label) }).click();
  }
  async function createAndCheck(type) {
    const material = type === 'material';
    const itemName = `${name}_${type}`;
    if (material) await page.getByRole('button', { name: 'Materiais', exact: true }).click();
    else await navigate('Serviços');
    await page.getByRole('button', { name: `Adicionar ${type}`, exact: true }).first().click();
    const form = page.locator('.record-form');
    await form.getByLabel(material ? 'Material' : 'Serviço', { exact: true }).fill(itemName);
    await form.locator('input[type=date]').fill('2025-02-18');
    await form.getByLabel('Categoria', { exact: true }).fill('Pasta de teste');
    await form.getByLabel(material ? 'Unidade' : 'Unidade de medição', { exact: true }).fill('un');
    await form.getByLabel('Quantidade', { exact: true }).fill('2');
    await form.getByLabel(material ? 'Preço unitário' : 'Valor unitário', { exact: true }).fill('10');
    modified = true;
    await form.getByRole('button', { name: 'Salvar', exact: true }).click();
    await page.locator('.material-table').getByText(itemName, { exact: true }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Pastas', exact: true }).click();
    await page.locator('.category-group').filter({ hasText: 'Pasta de teste' }).getByText(itemName, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.locator('.category-group').filter({ hasText: 'Todos os itens' }).getByText(itemName, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Diário', exact: true }).click();
    await page.locator('.category-group').filter({ hasText: '18/02/2025' }).getByText(itemName, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Semanal', exact: true }).click();
    await page.locator('.category-group').filter({ hasText: '17/02/2025 a 23/02/2025' }).getByText(itemName, { exact: true }).waitFor();
  }
  await createAndCheck('material');
  await createAndCheck('serviço');
  await navigate('Etapas');
  const first = page.locator('.stage-activity-overview');
  await first.waitFor();
  assert.ok(await first.locator('.stage-activity-overview-card').count() > 0, 'A etapa deve exibir suas atividades.');
  const tabs = page.getByRole('tab');
  if (await tabs.count() > 1) { await tabs.nth(1).click(); await page.locator('.stage-detail[role=tabpanel]').waitFor(); }
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(width.document <= width.viewport, 'A página não deve extrapolar a largura da tela.');
  assert.deepEqual(errors, []);
  console.log('PASS: materiais e serviços criados, pastas/lista/dia/semana e atividades de etapas na interface móvel.');
} finally {
  if (modified) await cleanup();
  await browser?.close(); vite.kill();
}
