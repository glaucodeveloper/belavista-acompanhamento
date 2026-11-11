import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { connect } from './android-cdp.mjs';

const origin = 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';
const adb = 'D:/Android/Sdk/platform-tools/adb.exe';
const name = `TESTE_SYNC_${randomUUID()}`;
const emulator = await connect();
const token = await emulator.evaluate('sessionStorage.getItem("alianca-session-token")');
if (!token) throw new Error('Entre no aplicativo do emulador antes de executar o teste.');
const app = 'http://127.0.0.1:5203';
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'vite.config.js', '--host', '127.0.0.1', '--port', '5203', '--strictPort'], { stdio: 'ignore' });
let browser, created = false;
async function cleanup() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const response = await fetch(`${origin}/api/sync`, { headers, cache: 'no-store' });
    if (!response.ok) throw new Error(`Não foi possível verificar a limpeza (${response.status}).`);
    const stored = await response.json();
    const materials = (stored.data?.materials || []).filter(row => row.name !== name);
    if (materials.length === (stored.data?.materials || []).length) return;
    const save = await fetch(`${origin}/api/sync`, { method: 'PUT', headers, body: JSON.stringify({ data: { ...stored.data, materials }, revision: stored.revision }) });
    if (save.ok) return;
    if (save.status !== 409) throw new Error(`Não foi possível remover o registro de teste (${save.status}).`);
  }
  throw new Error('Conflito ao remover o registro de teste.');
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(app)).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
  if (!ready) throw new Error('A aplicação web não iniciou.');
  await emulator.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Materiais');if(!b)throw Error('Aba Materiais indisponível');b.click()})()`);
  await emulator.pause(1000);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1200, height: 850 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => sessionStorage.setItem('alianca-session-token', value), token);
  await page.goto(app);
  await page.locator('.sync-state').getByText('Dados sincronizados').waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Materiais', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar material', exact: true }).first().click();
  const form = page.locator('.record-form');
  await form.getByLabel('Material', { exact: true }).fill(name);
  await form.getByLabel('Categoria', { exact: true }).fill('Teste temporário');
  await form.getByLabel('Unidade', { exact: true }).fill('un');
  await form.getByLabel('Quantidade', { exact: true }).fill('1');
  await form.getByLabel('Preço unitário', { exact: true }).fill('1');
  created = true;
  await form.getByRole('button', { name: 'Salvar', exact: true }).click();
  try { await page.locator('.material-table').getByText(name, { exact: true }).waitFor({ timeout: 30000 }); }
  catch { throw new Error(`Inclusão não apareceu. ${await page.locator('.error-message').allInnerTexts()} ${await page.locator('.sync-state').innerText()}`); }
  execFileSync(adb, ['-s', 'emulator-5554', 'shell', 'input', 'keyevent', '3'], { stdio: 'ignore' });
  execFileSync(adb, ['-s', 'emulator-5554', 'shell', 'monkey', '-p', 'com.aliancapark.app', '-c', 'android.intent.category.LAUNCHER', '1'], { stdio: 'ignore' });
  let visible = false;
  for (let i = 0; i < 45; i++) { await emulator.pause(1000); if (await emulator.evaluate(`document.body.innerText.includes(${JSON.stringify(name)})`)) { visible = true; break; } }
  assert.ok(visible, 'O emulador deve receber o material gravado pelo outro cliente.');
  await emulator.evaluate(`(()=>{const x=document.querySelector('.table-tools input');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(x,${JSON.stringify(name)});x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await emulator.pause(400);
  await emulator.evaluate(`(()=>{const rows=[...document.querySelectorAll('.material-table tbody tr')].filter(row=>row.innerText.includes(${JSON.stringify(name)}));if(rows.length!==1)throw Error('Registro de teste não está isolado');const b=[...rows[0].querySelectorAll('button')].find(x=>x.innerText.trim()==='Excluir');if(!b)throw Error('Excluir indisponível');b.click()})()`);
  for (let i = 0; i < 40; i++) { await emulator.pause(1000); if (!(await emulator.evaluate(`document.body.innerText.includes(${JSON.stringify(name)})`))) break; }
  await page.waitForFunction(value => !document.body.innerText.includes(value), name, { timeout: 45000 });
  await page.reload();
  await page.getByRole('button', { name: 'Materiais', exact: true }).click();
  assert.equal(await page.getByText(name, { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: inclusão no navegador apareceu no Android ao retornar; exclusão no Android propagou ao navegador e após recarga.');
} finally {
  if (created) await cleanup();
  await browser?.close();
  emulator.close(); vite.kill();
}
