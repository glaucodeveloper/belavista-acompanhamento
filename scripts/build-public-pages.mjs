import {cp, mkdir, rm, writeFile, access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'dist-pages');
const requiredFiles=[
  'index.html','app.js','components.js','state.js','styles.css',
  'map-page-widgets-v5.js','map-page-widgets-v5.css',
  'execution-planning-v8.js','execution-planning-v8.css',
  'manifest.webmanifest','admin-twa-manifest.webmanifest','admin-auth.mjs','admin-original-bootstrap-v5351.mjs','admin-test-controls.mjs','admin-test-controls.css','sw.js','api-client.mjs','firebase.mjs',
  'public-leads.html','public-leads.css','public-leads.js','public-leads-context-v521.mjs','runtime-url-v1.mjs','public-lead-form.mjs','public-model-loading-v531.css','public-model-loading-v531.mjs',
  'reservation-flow.mjs','lead-sw.js','lead-manifest.webmanifest',
  'encarregados.html','encarregados.css','encarregados.js','records-manifest.webmanifest','records-activity-drill-in-v5377.mjs','records-activity-drill-in-v5377.css',
  'admin-workers.html','admin-workers.css','admin-workers.js','stage-workbench.css','stage-attachments.css','stage-notifications.css','stage-workbench.mjs','stage-workbench-data.mjs','activity-map-editor.css','activity-map-editor.mjs','activity-map-intelligence.mjs','activity-map-layer.css','activity-map-layer.mjs','development-stage-catalog.mjs','admin-workers-manifest.webmanifest','stages-navigation-v5374.css',
  'assets/data/dwg-georeference.json',
  'assets/model/alianca_park_masterplan_preview.glb',
  'assets/model/vegetation/tree-cc0.glb',
  'assets/public/alianca-park-grass-hires-v5319.webp',
  'assets/public/alianca-park-pdf-grass-static-v521.jpg'
];

for(const rel of requiredFiles){
  try{await access(join(root,rel),constants.R_OK);}catch{
    throw new Error(`Arquivo obrigatório para build não encontrado: ${rel}`);
  }
}

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
const copy=async(rel,dest=rel)=>{const target=join(out,dest);await mkdir(dirname(target),{recursive:true});await cp(join(root,rel),target,{recursive:true});};

for(const rel of [
  'index.html','app.js','components.js','state.js','styles.css',
  'map-page-widgets-v5.js','map-page-widgets-v5.css',
  'execution-planning-v8.js','execution-planning-v8.css',
  'manifest.webmanifest','admin-twa-manifest.webmanifest','admin-auth.mjs','admin-original-bootstrap-v5351.mjs','admin-test-controls.mjs','admin-test-controls.css','sw.js','api-client.mjs','firebase.mjs',
  'public-leads.html','public-leads.css','public-leads.js','public-leads-context-v521.mjs','runtime-url-v1.mjs','public-lead-form.mjs','public-model-loading-v531.css','public-model-loading-v531.mjs',
  'reservation-flow.mjs','lead-sw.js','lead-manifest.webmanifest',
  'encarregados.html','encarregados.css','encarregados.js','records-manifest.webmanifest','records-activity-drill-in-v5377.mjs','records-activity-drill-in-v5377.css',
  'admin-workers.html','admin-workers.css','admin-workers.js','stage-workbench.css','stage-attachments.css','stage-notifications.css','stage-workbench.mjs','stage-workbench-data.mjs','activity-map-editor.css','activity-map-editor.mjs','activity-map-intelligence.mjs','activity-map-layer.css','activity-map-layer.mjs','development-stage-catalog.mjs','admin-workers-manifest.webmanifest','stages-navigation-v5374.css'
])await copy(rel);

await copy('assets/model/alianca_park_masterplan_preview.glb');
if(await access(join(root,'assets/model/masterplan-manifest.json'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/model/masterplan-manifest.json');
await copy('assets/model/vegetation');
await copy('assets/public');
await copy('assets/data/dwg-georeference.json');
if(await access(join(root,'assets/data/lot-pricing.json'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/data/lot-pricing.json');
if(await access(join(root,'assets/icons'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/icons');
await writeFile(join(out,'.nojekyll'),'');
await writeFile(join(out,'404.html'),`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./"><title>Aliança Park</title>`);
console.log(`Páginas preparadas com sucesso em ${out}`);
