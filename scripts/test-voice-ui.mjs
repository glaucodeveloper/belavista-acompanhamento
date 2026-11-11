import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const token = process.env.ALIANCAPARK_SESSION_TOKEN;
const audio = process.env.VOICE_TEST_AUDIO;
if (!token || !audio) throw new Error('Defina ALIANCAPARK_SESSION_TOKEN e VOICE_TEST_AUDIO.');
const app = 'http://127.0.0.1:5205';
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'vite.config.js', '--host', '127.0.0.1', '--port', '5205', '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(app)).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
  if (!ready) throw new Error('Aplicação não iniciou.');
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${audio}`, '--enable-unsafe-webgpu', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => sessionStorage.setItem('alianca-session-token', value), token);
  await page.goto(app);
  await page.getByRole('button', { name: 'Assistente', exact: true }).click();
  await page.getByRole('button', { name: 'Gravar mensagem de voz' }).click();
  await page.getByRole('button', { name: 'Parar gravação' }).waitFor();
  await page.waitForTimeout(12000);
  await page.getByRole('button', { name: 'Parar gravação' }).click();
  let last = '';
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(10000);
    const state = await page.locator('.chat-voice-status').innerText().catch(() => '');
    const error = await page.locator('.chat-error').innerText().catch(() => '');
    const text = await page.locator('#assistant-message').inputValue();
    if (state && state !== last) { console.log(state); last = state; }
    if (error) throw new Error(error);
    if (text.trim()) {
      assert.match(text.toLowerCase(), /planta|reservas|funções|funcoes/, 'A transcrição deve corresponder ao áudio em português.');
      assert.deepEqual(errors, []);
      console.log(`PASS: voz em português transcrita no campo. ${text}`);
      break;
    }
    if (i === 89) throw new Error('A transcrição não terminou no prazo.');
  }
} finally { await browser?.close(); vite.kill(); }
