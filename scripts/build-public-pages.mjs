import {cp, mkdir, rm, writeFile, access, readFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve, dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const requestedOut=process.env.BELAVISTA_PUBLIC_BUILD_DIR;
const out=requestedOut?resolve(root,requestedOut):join(root,'dist-pages');
if(requestedOut&&(out===root||!out.startsWith(`${root}${process.platform==='win32'?'\\':'/'}`)))
  throw new Error('BELAVISTA_PUBLIC_BUILD_DIR precisa ficar dentro do projeto e não pode ser a raiz.');
const requiredFiles=[
  'index.html','app.js','components.js','state.js','styles.css','mobile-operational-v1.css',
  'pat-freeze-guard-v5364.js','dashboard-map-tabs-v3.css','admin-runtime-v11.css','finance-mobile-cash-v5358.css','chat-tab-widget-ghost-v5359.css','final-workspaces-v5360.css','stages-landing-v5361.css','belavista-final-ui-v5362.css','admin-brand-style-v1.css',
  'map-page-widgets-v5.js','map-page-widgets-v5.css',
  'execution-planning-v8.js','execution-planning-v8.css',
  'manifest.webmanifest','admin-twa-manifest.webmanifest','admin-auth.mjs','admin-twa-runtime.mjs','bootstrap/admin-application-entry.mjs','admin-original-bootstrap-v5351.mjs','admin-test-controls.mjs','admin-test-controls.css','sw.js','api-client.mjs','firebase.mjs',
  'public-leads.html','public-leads.css','public-usability-v1.css','public-leads.js','public-leads-context-v521.mjs','runtime-url-v1.mjs','public-lead-form.mjs','public-model-loading-v531.css','public-model-loading-v531.mjs','public-brand-return-reset-v5346.mjs',
  'reservation-flow.mjs','lead-sw.js','lead-manifest.webmanifest',
  'records-manifest.webmanifest','records-activity-drill-in-v5377.mjs','records-activity-drill-in-v5377.css',
  'admin-workers.html','admin-workers.css','admin-workers.js','worker-context-chat.css','worker-context-chat.mjs','stage-workbench.css','stage-attachments.css','stage-notifications.css','stage-workbench.mjs','stage-workbench-data.mjs','activity-operational-details.mjs','activity-map-editor.css','activity-map-container-v5380.css','activity-map-editor.mjs','activity-map-intelligence.mjs','activity-map-layer.css','activity-map-layer.mjs','development-stage-catalog.mjs','admin-workers-manifest.webmanifest','stages-navigation-v5374.css',
  'admin-runtime-v11.js','admin-lots-canvas-v1.js','stage-admin-v10.js','dashboard-map-tabs-v3.js','admin-public-map-surface-v5352.mjs','public-leads-map-v50.mjs','admin-public-map-3d-status-v5353.mjs','finance-mobile-cash-v5358.mjs','chat-tab-widget-ghost-v5359.mjs','final-workspaces-v5360.mjs','stages-landing-v5361.mjs','belavista-final-ui-v5362.mjs',
  'assets/data/dwg-georeference.json','assets/data/aerial-lot-trace-v1.json','assets/data/aerial-road-trace-v1.json',
  'assets/data/masterplan-lot-polygons-v2.json','assets/data/pdf-lot-labels-v1.json','assets/data/pdf-lot-green-mapping-v1.json',
  'assets/model/alianca_park_masterplan_preview.glb',
  'assets/model/vegetation/tree-cc0.glb',
  'assets/public/alianca-park-grass-hires-v5319.webp',
  'assets/public/alianca-park-pdf-grass-static-v521.jpg',
  'assets/public/dwg-satellite-treated-v5411.png',
  'assets/portfolio/screens/public-leads.jpg',
  'assets/textures/cobblestone-pavement-polyhaven-1k.jpg',
  'docs/index.html'
];
// Entradas carregadas diretamente pelo index.html precisam acompanhar o APK.
const supplementalEntries=[
  'admin-communications.css','control-record-accordion-v1.css','material-transition-v1.css',
  'record-ocr-dynamic-v21.css','atlas-application-v1.css','atlas-zip-shell-v2.css',
  'atlas-operational-design-v1.css','atlas-carbon-integration-v1.css','atlas-mobile-focus-v1.css','github-access-settings-v1.css',
  'map-drag-calibration-v1.mjs','admin-communications.mjs','record-ocr-dynamic-v21.mjs',
  'glauco-shell-bridge-v58.mjs',
  'public-runtime-polish-v5332.mjs','public-model-quality-v5337.mjs',
  'public-lead-intent-v5342.mjs','public-pan-zoom-runtime-v5344.mjs',
  'public-pdf-brand-v1.mjs'
];

for(const rel of [...requiredFiles,...supplementalEntries]){
  try{await access(join(root,rel),constants.R_OK);}catch{
    throw new Error(`Arquivo obrigatório para build não encontrado: ${rel}`);
  }
}

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
const copy=async(rel,dest=rel)=>{const target=join(out,dest);await mkdir(dirname(target),{recursive:true});await cp(join(root,rel),target,{recursive:true});};

for(const rel of [
  'index.html','app.js','components.js','state.js','styles.css','mobile-operational-v1.css',
  'pat-freeze-guard-v5364.js','dashboard-map-tabs-v3.css','admin-runtime-v11.css','finance-mobile-cash-v5358.css','chat-tab-widget-ghost-v5359.css','final-workspaces-v5360.css','stages-landing-v5361.css','belavista-final-ui-v5362.css','admin-brand-style-v1.css',
  'map-page-widgets-v5.js','map-page-widgets-v5.css',
  'execution-planning-v8.js','execution-planning-v8.css',
  'manifest.webmanifest','admin-twa-manifest.webmanifest','admin-auth.mjs','admin-twa-runtime.mjs','bootstrap/admin-application-entry.mjs','admin-original-bootstrap-v5351.mjs','admin-test-controls.mjs','admin-test-controls.css','sw.js','api-client.mjs','firebase.mjs',
  'public-leads.html','public-leads.css','public-usability-v1.css','public-leads.js','public-leads-context-v521.mjs','runtime-url-v1.mjs','public-lead-form.mjs','public-model-loading-v531.css','public-model-loading-v531.mjs','public-brand-return-reset-v5346.mjs',
  'reservation-flow.mjs','lead-sw.js','lead-manifest.webmanifest',
  'records-manifest.webmanifest','records-activity-drill-in-v5377.mjs','records-activity-drill-in-v5377.css',
  'admin-workers.html','admin-workers.css','admin-workers.js','worker-context-chat.css','worker-context-chat.mjs','stage-workbench.css','stage-attachments.css','stage-notifications.css','stage-workbench.mjs','stage-workbench-data.mjs','activity-operational-details.mjs','activity-map-editor.css','activity-map-container-v5380.css','activity-map-editor.mjs','activity-map-intelligence.mjs','activity-map-layer.css','activity-map-layer.mjs','development-stage-catalog.mjs','admin-workers-manifest.webmanifest','stages-navigation-v5374.css',
  'admin-runtime-v11.js','admin-lots-canvas-v1.js','stage-admin-v10.js','dashboard-map-tabs-v3.js','admin-public-map-surface-v5352.mjs','public-leads-map-v50.mjs','admin-public-map-3d-status-v5353.mjs','finance-mobile-cash-v5358.mjs','chat-tab-widget-ghost-v5359.mjs','final-workspaces-v5360.mjs','stages-landing-v5361.mjs','belavista-final-ui-v5362.mjs'
])await copy(rel);
for(const rel of supplementalEntries)await copy(rel);
await copy('dist/frontend');

// A aplicação é distribuída como módulos ES nativos. Manter apenas uma lista
// manual de entradas fazia imports transitivos (por exemplo, os módulos usados
// por components.js) faltarem no build Capacitor, onde o WebView recusa o
// import dinâmico inicial de app.js. Copiamos todo import relativo, estático ou
// dinâmico com especificador literal, preservando a lista acima como entradas.
const copiedModuleDependencies=new Set();
const localModuleImports=/\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']/g;
const localDynamicImports=/\bimport\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;

async function copyModuleDependencies(sourceRel){
  if(!/\.(?:js|mjs)$/.test(sourceRel)||copiedModuleDependencies.has(sourceRel))return;
  copiedModuleDependencies.add(sourceRel);

  const sourcePath=join(root,sourceRel);
  const source=await readFile(sourcePath,'utf8');
  const imports=[...source.matchAll(localModuleImports),...source.matchAll(localDynamicImports)];

  for(const match of imports){
    const specifier=match[1].split(/[?#]/,1)[0];
    const dependencyPath=resolve(dirname(sourcePath),specifier);
    const dependencyRel=relative(root,dependencyPath);
    if(!dependencyRel||dependencyRel.startsWith('..')||resolve(root,dependencyRel)!==dependencyPath){
      throw new Error(`Import relativo fora do projeto: ${sourceRel} -> ${match[1]}`);
    }
    try{await access(dependencyPath,constants.R_OK);}catch{
      throw new Error(`Módulo importado não encontrado: ${sourceRel} -> ${match[1]}`);
    }
    await copy(dependencyRel);
    await copyModuleDependencies(dependencyRel);
  }
}

for(const rel of [...requiredFiles,...supplementalEntries].filter(file=>/\.(?:js|mjs)$/.test(file))){
  await copyModuleDependencies(rel);
}

await copy('assets/model/alianca_park_masterplan_preview.glb');
if(await access(join(root,'assets/model/masterplan-manifest.json'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/model/masterplan-manifest.json');
await copy('assets/model/vegetation');
await copy('assets/public');
await copy('assets/portfolio');
await copy('assets/textures/cobblestone-pavement-polyhaven-1k.jpg');
await copy('docs');
await copy('assets/docs');
await copy('assets/data/dwg-georeference.json');
await copy('assets/data/aerial-lot-trace-v1.json');
await copy('assets/data/aerial-road-trace-v1.json');
await copy('assets/data/masterplan-lot-polygons-v2.json');
await copy('assets/data/pdf-lot-labels-v1.json');
await copy('assets/data/pdf-lot-green-mapping-v1.json');
if(await access(join(root,'assets/data/lot-pricing.json'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/data/lot-pricing.json');
if(await access(join(root,'assets/icons'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/icons');
await writeFile(join(out,'.nojekyll'),'');
await writeFile(join(out,'404.html'),`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./"><title>Aliança Park</title>`);
console.log(`Páginas preparadas com sucesso em ${out}`);
