import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicBuild = join(root, 'dist-pages');
const webDir = join(root, 'mobile', 'capacitor', 'www');
const androidWebAssets = join(root, 'mobile', 'capacitor', 'android', 'app', 'src', 'main', 'assets', 'public');
const capacitorRoot = join(root, 'mobile', 'capacitor');
const workerBase = 'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev';

const run = (command, args) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(command, args, {
    cwd: root,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  });
  child.once('error', rejectRun);
  child.once('exit', code => code === 0 ? resolveRun() : rejectRun(new Error(`${command} encerrou com código ${code}.`)));
});

await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:public']);
await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
await cp(publicBuild, webDir, { recursive: true });

// The application is intentionally served as native ES modules without a
// bundler. Copy the Capacitor notification plugin and its small core module
// into the APK assets, then resolve their package imports through importmap.
const capacitorVendor = join(webDir, 'vendor');
await mkdir(capacitorVendor, { recursive: true });
await cp(
  join(capacitorRoot, 'node_modules', '@capacitor', 'core', 'dist', 'index.js'),
  join(capacitorVendor, 'capacitor-core.js'),
);
const notificationSource = join(capacitorRoot, 'node_modules', '@capacitor', 'local-notifications', 'dist', 'esm');
const notificationTarget = join(capacitorVendor, 'local-notifications');
await mkdir(notificationTarget, { recursive: true });
for (const name of ['index.js', 'definitions.js', 'web.js']) {
  let source = await readFile(join(notificationSource, name), 'utf8');
  source = source
    .replaceAll("'./web'", "'./web.js'")
    .replaceAll("'./definitions'", "'./definitions.js'")
    .replaceAll('"./web"', '"./web.js"')
    .replaceAll('"./definitions"', '"./definitions.js"');
  await writeFile(join(notificationTarget, name), source);
}

// O aplicativo mobile usa exclusivamente o mapa estático com marcadores.
// Os GLB do renderizador 3D permanecem no build web, mas não devem ocupar
// armazenamento no APK quando não há nenhum caminho mobile que os carregue.
await rm(join(webDir, 'assets', 'model'), { recursive: true, force: true });
// `cap sync` atualiza arquivos, mas não remove os que deixaram de existir no
// webDir. Limpar essa pasta gerada evita que GLB antigos reapareçam no APK.
await rm(join(androidWebAssets, 'assets', 'model'), { recursive: true, force: true });

// Fontes 4K/20K, provas antigas e tiles de uma geração de zoom que não é
// carregada pelo app não devem ser duplicados no bundle Android. Os arquivos
// originais continuam disponíveis no build web e no diretório de assets; esta
// lista só é aplicada à cópia gerada em `mobile/capacitor/www`.
const mobileUnusedPublicAssetsV1 = [
  'assets/public/alianca-park-aerial-zoom-tiles-v1',
  'assets/public/alianca-park-aerial-reference-expanded-v5-20k-3000dpi.png',
  'assets/public/alianca-park-aerial-reference-expanded-v4-4k-600dpi.png',
  'assets/public/alianca-park-aerial-reference-expanded-v3-4k.png',
  'assets/public/alianca-park-aerial-reference-expanded-v2-2x.png',
  'assets/public/alianca-park-aerial-reference-v1.png',
  'assets/public/alianca-park-aerial-reference-expanded-v5-detail-preview.png',
  'assets/public/dwg-satellite-photoreal-v5420.png',
  'assets/public/dwg-satellite-photoreal-v5420-source.png',
  'assets/public/alianca-park-satellite-generated-v5406.png',
  'assets/public/alianca-park-satellite-generated-v5388.png',
  'assets/public/alianca-park-terrain-generated-v5389.png',
  'assets/public/alianca-park-terrain-expanded-v5390.png',
  'assets/public/alianca-park-masterplan-lot-overlay-v1.png',
];
await Promise.all([webDir, androidWebAssets].flatMap((root) =>
  mobileUnusedPublicAssetsV1.map((asset) =>
    rm(join(root, asset), { recursive: true, force: true }),
  ),
));

const bootstrap = `/* Gerado pelo build Capacitor: não editar em www. */
(() => {
  globalThis.BELAVISTA_CAPACITOR_NATIVE = true;
  globalThis.BELAVISTA_API_BASE = ${JSON.stringify(workerBase)};
  globalThis.BELAVISTA_AI_BASE = ${JSON.stringify(workerBase)};
  globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
})();
`;
await writeFile(join(webDir, 'capacitor-mobile-bootstrap.js'), bootstrap);

const indexPath = join(webDir, 'index.html');
let index = await readFile(indexPath, 'utf8');
const marker = '  <script src="./pat-freeze-guard-v5364.js?v=5.3.64"></script>';
if (!index.includes(marker)) throw new Error('Marcador de inicialização Capacitor não encontrado em index.html.');
const importMapTag = index.match(/<script type="importmap">([\s\S]*?)<\/script>/i);
if (!importMapTag) throw new Error('Import map da aplicação não encontrado em index.html.');
const importMap = JSON.parse(importMapTag[1]);
importMap.imports ??= {};
importMap.imports['@capacitor/core'] = './vendor/capacitor-core.js';
importMap.imports['@capacitor/local-notifications'] = './vendor/local-notifications/index.js';
index = index.replace(importMapTag[0], `<script type="importmap">${JSON.stringify(importMap)}</script>`);
await writeFile(indexPath, index.replace(marker, `  <script src="./capacitor-mobile-bootstrap.js"></script>\n${marker}`));

console.log(`Frontend Capacitor atualizado em ${webDir}`);
