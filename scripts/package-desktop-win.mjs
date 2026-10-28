import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const configPath = join(root, 'desktop-runtime-config.json');
const builderPath = join(root, 'node_modules', 'electron-builder', 'cli.js');

if (existsSync(configPath)) throw new Error('desktop-runtime-config.json já existe; não vou sobrescrever esse arquivo.');
if (!existsSync(builderPath)) throw new Error('electron-builder não está instalado neste projeto.');
// GitHub release assets are public. Keep the installer self-contained and
// local; never embed the host's Router key in a downloadable executable.
writeFileSync(configPath, '{}\n', { mode: 0o600 });
try {
  console.log('Pacote Windows em modo local; nenhuma chave do Router será incorporada.');
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
