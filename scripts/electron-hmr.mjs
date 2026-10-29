import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const url = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:8893/';
let vite;
let electron;
let stopping = false;

async function isAppVite() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes('/src/main.jsx') && html.includes('Aliança Park');
  } catch { return false; }
}

async function waitForVite() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await isAppVite()) return true;
    if (vite?.exitCode !== null && vite?.exitCode !== undefined) return false;
    await delay(300);
  }
  return false;
}

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (electron && electron.exitCode === null) electron.kill();
  if (vite && vite.exitCode === null) vite.kill();
  process.exitCode = code;
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

if (!(await isAppVite())) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  vite = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', new URL(url).port || '8893', '--strictPort'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (!(await waitForVite())) {
    console.error('Vite não iniciou a interface deste projeto.');
    await stop(1);
  }
}

if (!stopping) {
  const electronBinary = require('electron');
  electron = spawn(electronBinary, ['.'], { stdio: 'inherit', env: { ...process.env, VITE_DEV_SERVER_URL: url } });
  electron.on('error', error => { console.error(`Falha ao abrir Electron: ${error.message}`); stop(1); });
  electron.on('exit', code => { if (!stopping) stop(code || 0); });
}
