import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { _electron as electron } from 'playwright';

const password = process.env.ALIANCAPARK_TEST_PASSWORD;
const audio = process.env.VOICE_TEST_AUDIO;
if (!password || !audio) throw new Error('Defina a senha de teste e VOICE_TEST_AUDIO.');
const origin = 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';
const login = await fetch(`${origin}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'mobile', password, client: 'mobile' }) });
if (!login.ok) throw new Error(`Falha ao iniciar sessão de teste (${login.status}).`);
const { token } = await login.json();
const profile = 'D:/Android/gradle-tmp/electron-test-profile';
await mkdir(profile, { recursive: true });
let app;
try {
  app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${audio}`, '--enable-unsafe-webgpu', '--enable-unsafe-swiftshader'], env: { ...process.env, APPDATA: profile } });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('.login-device').getByText('computador', { exact: true }).waitFor({ timeout: 30000 });
  assert.match(page.url(), /^app:\/\/local\//);
  await page.evaluate(value => sessionStorage.setItem('alianca-session-token', value), token);
  await page.reload();
  await page.locator('.sync-state').getByText('Dados sincronizados').waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Assistente', exact: true }).click();
  await page.getByRole('button', { name: 'Gravar mensagem de voz' }).click();
  await page.getByRole('button', { name: 'Parar gravação' }).waitFor({ timeout: 20000 });
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
      assert.match(text.toLowerCase(), /planta|reservas|funções|funcoes/);
      assert.deepEqual(errors, []);
      console.log(`PASS: Electron identificado como computador e áudio em português transcrito: ${text}`);
      break;
    }
    if (i === 89) throw new Error('Transcrição não terminou no prazo.');
  }
} finally {
  await app?.close();
  await fetch(`${origin}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}
