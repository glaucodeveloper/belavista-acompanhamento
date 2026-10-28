import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));

const gateway = spawn(process.execPath, [join(root, 'scripts', 'desktop-cloudflare-gateway.mjs')], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
gateway.on('error', error => { console.error('Não foi possível iniciar o gateway protegido:', error.message); process.exitCode = 1; });
gateway.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code || 0;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { if (!gateway.killed) gateway.kill(signal); });
}
