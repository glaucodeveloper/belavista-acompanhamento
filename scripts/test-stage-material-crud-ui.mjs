import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const password = process.env.ALIANCAPARK_TEST_PASSWORD;
if (!password) throw new Error('Defina ALIANCAPARK_TEST_PASSWORD.');
const origin = 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';
const login = await fetch(`${origin}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'mobile', password, client: 'mobile' }) });
if (!login.ok) throw new Error(`Falha ao iniciar sessão de teste (${login.status}).`);
const { token } = await login.json();
const name = `TESTE_ETAPA_${randomUUID()}`;
const app = 'http://127.0.0.1:5206';
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'vite.config.js', '--host', '127.0.0.1', '--port', '5206', '--strictPort'], { stdio: 'ignore' });
let browser, modified = false;
async function cleanup() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const read = await fetch(`${origin}/api/sync`, { headers, cache: 'no-store' });
    if (!read.ok) throw new Error(`Falha ao verificar limpeza (${read.status}).`);
    const { data, revision } = await read.json();
    const materials = (data.materials || []).filter(row => !String(row.name || '').startsWith(name));
    if (materials.length === (data.materials || []).length) return;
    const save = await fetch(`${origin}/api/sync`, { method: 'PUT', headers, body: JSON.stringify({ data: { ...data, materials }, revision }) });
    if (save.ok) return;
    if (save.status !== 409) throw new Error(`Falha ao limpar material de teste (${save.status}).`);
  }
  throw new Error('Conflito ao limpar material de teste.');
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
  async function openStage() {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('menuitem', { name: /Etapas/ }).click();
    await page.getByRole('tab', { name: /Drenagem Pluvial/ }).click();
  }
  await openStage();
  await page.getByRole('button', { name: 'Adicionar material', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Adicionar material' });
  await dialog.getByLabel('Material', { exact: true }).fill(name);
  await dialog.getByLabel('Atividade (opcional)').selectOption({ label: 'Assentar rede pluvial do trecho' });
  await dialog.getByLabel('Quantidade', { exact: true }).fill('2');
  await dialog.getByLabel('Unidade', { exact: true }).fill('m');
  await dialog.getByLabel('Valor unitário (R$)').fill('8');
  await dialog.getByLabel('Data', { exact: true }).fill('2025-02-18');
  modified = true;
  await dialog.getByRole('button', { name: 'Adicionar material', exact: true }).click();
  try { await page.getByRole('button', { name: `Editar ou excluir material ${name}` }).waitFor({ timeout: 30000 }); }
  catch { throw new Error(`Material não apareceu na etapa. Avisos: ${(await page.locator('[role=alert], .stage-notice').allInnerTexts()).join(' | ')}; diálogo aberto: ${await dialog.count()}; ocorrências no DOM: ${await page.getByText(name, { exact: true }).count()}; árvore: ${await page.locator('.stage-items-card').count()}`); }
  await page.getByRole('button', { name: 'Meses', exact: true }).click();
  await page.getByRole('tree', { name: 'Itens por mês' }).getByText('fevereiro de 2025', { exact: true }).waitFor();
  await page.getByRole('tree', { name: 'Itens por mês' }).getByRole('button', { name: `Editar ou excluir material ${name}` }).waitFor();
  await page.getByRole('button', { name: 'Dias', exact: true }).click();
  await page.getByRole('tree', { name: 'Itens por dia' }).getByText('18/02/2025', { exact: true }).waitFor();
  await page.getByRole('tree', { name: 'Itens por dia' }).getByRole('button', { name: `Editar ou excluir material ${name}` }).waitFor();
  await page.getByRole('button', { name: 'Atividades', exact: true }).click();
  await page.getByRole('button', { name: 'Materiais', exact: true }).click();
  await page.locator('.material-table').getByText(name, { exact: true }).waitFor();
  await openStage();
  await page.getByRole('button', { name: `Editar ou excluir material ${name}` }).click();
  dialog = page.getByRole('dialog', { name: 'Editar material' });
  await dialog.getByLabel('Item', { exact: true }).fill(`${name}_editado`);
  await dialog.getByLabel('Quantidade', { exact: true }).fill('3');
  await dialog.getByRole('button', { name: 'Salvar detalhes' }).click();
  await page.getByRole('button', { name: `Editar ou excluir material ${name}_editado` }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Materiais', exact: true }).click();
  const row = page.locator('.material-table tr').filter({ hasText: `${name}_editado` });
  await row.waitFor();
  assert.match(await row.innerText(), /24,00/);
  await openStage();
  await page.getByRole('button', { name: `Editar ou excluir material ${name}_editado` }).click();
  dialog = page.getByRole('dialog', { name: 'Editar material' });
  await dialog.getByRole('button', { name: 'Excluir', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await dialog.waitFor({ state: 'detached', timeout: 30000 });
  await page.getByRole('button', { name: 'Materiais', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Materiais', exact: true }).click();
  assert.equal(await page.getByText(`${name}_editado`, { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: material criado, consultado, editado e excluído na etapa; alterações sincronizadas em Materiais e após recarga.');
} finally {
  try { if (modified) await cleanup(); }
  finally { await browser?.close(); vite.kill(); await fetch(`${origin}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); }
}
