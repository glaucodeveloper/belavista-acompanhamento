import { spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const routerInfoPath = join(homedir(), '.local', 'bin', 'ngrok-port-router-info');
const info = spawnSync(routerInfoPath, [], { encoding: 'utf8', timeout: 10_000 });
if (info.error || info.status !== 0) throw new Error('ngrok-port-router-info não conseguiu ler a chave local do Router.');
const key = info.stdout.match(/^ROUTER_KEY=(\S+)\s*$/m)?.[1] || '';
if (key.length < 24) throw new Error('ngrok-port-router-info não retornou uma chave válida do Router.');

const gateway = spawn(process.execPath, [join(root, 'scripts', 'desktop-cloudflare-gateway.mjs')], {
  cwd: root,
  env: { ...process.env, BELAVISTA_PORT_ROUTER_KEY: key },
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
