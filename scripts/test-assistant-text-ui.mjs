import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const token = process.env.ALIANCAPARK_SESSION_TOKEN;
if (!token) throw new Error('Defina ALIANCAPARK_SESSION_TOKEN.');
const origin = 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';
const worker = process.env.ALIANCAPARK_WORKER_URL || origin;
const port = 5202;
const app = `http://127.0.0.1:${port}`;
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'vite.config.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(app)).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
  if (!ready) throw new Error('A aplicação não iniciou.');
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => sessionStorage.setItem('alianca-session-token', value), token);
  if (worker !== origin) await page.route(`${origin}/api/assistant/message`, async route => { try { const response = await route.fetch({ url: `${worker}/api/assistant/message`, timeout: 120000 }); await route.fulfill({ response }); } catch { await route.abort().catch(() => {}); } });
  await page.goto(app);
  await page.getByRole('button', { name: 'Assistente', exact: true }).click();
  const question = 'Qual a utilidade do planejamento da drenagem em uma obra?';
  await page.locator('#assistant-message').fill(question);
  await page.locator('button.send-button').click();
  await page.locator('.chat-message .outbox-status').getByText(/Processado|Falha no processamento/).waitFor({ timeout: 120000 });
  const status = await page.locator('.chat-message .outbox-status').innerText();
  assert.match(status, /Processado/, status);
  const reply = await page.locator('.chat-assistant-reply').innerText();
  assert.ok(reply.trim().length > 20, 'O assistente deve responder à pergunta.');
  assert.doesNotMatch(reply, /anexe uma nota primeiro/i);
  assert.equal(await page.locator('.chat-message').getByText(question, { exact: true }).count(), 0);
  await page.reload();
  await page.getByRole('button', { name: 'Assistente', exact: true }).click();
  await page.locator('.chat-assistant-reply').getByText(reply.replace(/^Assistente de obra\s*/, ''), { exact: false }).waitFor({ timeout: 20000 });
  assert.deepEqual(errors, []);
  console.log('PASS: texto sem foto, resposta real, recarga e inicialização.');
} finally { await browser?.close(); vite.kill(); }
