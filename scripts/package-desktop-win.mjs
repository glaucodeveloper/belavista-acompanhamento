import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const configPath = join(root, 'desktop-runtime-config.json');
const builderPath = join(root, 'node_modules', 'electron-builder', 'cli.js');
const routerInfoPath = join(homedir(), '.local', 'bin', 'ngrok-port-router-info');

if (existsSync(configPath)) throw new Error('desktop-runtime-config.json já existe; não vou sobrescrever esse arquivo.');
if (!existsSync(builderPath)) throw new Error('electron-builder não está instalado neste projeto.');
if (!existsSync(routerInfoPath)) throw new Error('ngrok-port-router-info não está instalado para este usuário.');

const info = spawnSync(routerInfoPath, [], { encoding: 'utf8', timeout: 10_000 });
if (info.status !== 0) throw new Error('ngrok-port-router-info não conseguiu ler a configuração ativa.');

const endpointMatch = info.stdout.match(/^ngrok:\s*(https:\/\/[^\s]+)\s*$/m);
const keyMatch = info.stdout.match(/^ROUTER_KEY=(\S+)\s*$/m);
if (!keyMatch) throw new Error('ngrok-port-router-info não retornou a chave do router.');

const routerKey = keyMatch[1];
if (routerKey.length < 24) throw new Error('A chave do router é curta demais.');
const endpointSource = String(process.env.BELAVISTA_DESKTOP_URL || endpointMatch?.[1] || '').trim();
if (!endpointSource) throw new Error('Informe BELAVISTA_DESKTOP_URL ou mantenha um túnel ativo no router-info.');
const publicUrl = new URL(endpointSource);
const isNgrok = /\.ngrok-free\.dev$/i.test(publicUrl.hostname);
const isCloudflareQuickTunnel = /(?:^|\.)trycloudflare\.com$/i.test(publicUrl.hostname);
if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.port || publicUrl.search || publicUrl.hash || (!isNgrok && !isCloudflareQuickTunnel)) {
  throw new Error('O endpoint público deve ser HTTPS do ngrok ou de um Quick Tunnel Cloudflare.');
}
const endpointPath = publicUrl.pathname.replace(/\/$/, '');
if (endpointPath && endpointPath !== '/5000') throw new Error('O endpoint deve apontar para a rota /5000 do router.');
const endpoint = `${publicUrl.origin}/5000`;

const unauthenticated = await fetch(`${endpoint}/api/health`, { signal: AbortSignal.timeout(8_000) });
if (unauthenticated.status !== 401) throw new Error(`Rota protegida do router retornou HTTP ${unauthenticated.status} sem chave.`);

const authenticated = await fetch(`${endpoint}/api/health`, {
  headers: { 'X-Port-Router-Key': routerKey },
  signal: AbortSignal.timeout(8_000),
});
if (!authenticated.ok) throw new Error(`Rota do Atlas não respondeu com a chave do router: HTTP ${authenticated.status}.`);
const health = await authenticated.json().catch(() => ({}));
if (health?.ok !== true) throw new Error('A rota do Atlas respondeu, mas o health check não confirmou o serviço.');

writeFileSync(configPath, JSON.stringify({ endpoint, routerKey }, null, 2), { mode: 0o600 });
try {
  console.log(`Endpoint Windows validado: ${endpoint}`);
  console.log('Rota sem chave: HTTP 401; rota com chave: HTTP 200.');
  const build = spawnSync(process.execPath, [builderPath, '--win', 'nsis', '--x64', '--publish', 'never', '--config.directories.output=desktop-release'], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if (build.error) throw build.error;
  if (build.status !== 0) process.exitCode = build.status || 1;
} finally {
  rmSync(configPath, { force: true });
}
