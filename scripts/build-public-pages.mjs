import {cp, mkdir, rm, writeFile, readFile, access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'dist-pages');
const leads=join(out,'leads');
const requiredFiles=[
  'components.js','state.js','styles.css',
  'pat-freeze-guard-v5364.js','dashboard-map-tabs-v3.css','admin-runtime-v11.css','finance-mobile-cash-v5358.css','chat-tab-widget-ghost-v5359.css','final-workspaces-v5360.css','stages-landing-v5361.css','belavista-final-ui-v5362.css','admin-brand-style-v1.css',
  'map-page-widgets-v5.js','map-page-widgets-v5.css',
  'execution-planning-v8.js','execution-planning-v8.css',
  'api-client.mjs','firebase.mjs',
  'public-leads.html','public-leads.css','public-leads.js','public-leads-context-v521.mjs','runtime-url-v1.mjs','public-lead-form.mjs','public-model-loading-v531.css','public-model-loading-v531.mjs','public-brand-return-reset-v5346.mjs','public-runtime-polish-v5332.mjs','public-model-quality-v5337.mjs','public-lead-intent-v5342.mjs','public-pan-zoom-runtime-v5344.mjs',
  'activity-form-groups-v1.mjs','stage-home-page-v1.mjs','admin-role-policy.mjs','proposal-vision.mjs',
  'reservation-flow.mjs','lead-sw.js','lead-manifest.webmanifest',
  'stage-workbench-data.mjs','activity-operational-details.mjs','activity-map-intelligence.mjs','activity-map-layer.css','activity-map-layer.mjs',
  'admin-runtime-v11.js','admin-lots-canvas-v1.js','stage-admin-v10.js','dashboard-map-tabs-v3.js','admin-public-map-surface-v5352.mjs','public-leads-map-v50.mjs','admin-public-map-3d-status-v5353.mjs','finance-mobile-cash-v5358.mjs','chat-tab-widget-ghost-v5359.mjs','final-workspaces-v5360.mjs','stages-landing-v5361.mjs','belavista-final-ui-v5362.mjs',
  'assets/data/dwg-georeference.json',
  'assets/model/alianca_park_masterplan_preview.glb',
  'assets/model/vegetation/tree-cc0.glb',
  'assets/public/alianca-park-grass-hires-v5319.webp',
  'assets/public/alianca-park-pdf-grass-static-v521.jpg',
  'assets/public/dwg-satellite-treated-v5411.png',
  'assets/portfolio/screens/public-leads.jpg',
  'assets/textures/cobblestone-pavement-polyhaven-1k.jpg',
  'docs/index.html'
];

for(const rel of requiredFiles){
  try{await access(join(root,rel),constants.R_OK);}catch{
    throw new Error(`Arquivo obrigatório para build não encontrado: ${rel}`);
  }
}

await rm(out,{recursive:true,force:true});
await mkdir(leads,{recursive:true});
const copy=async(rel,dest=rel)=>{const target=join(leads,dest);await mkdir(dirname(target),{recursive:true});await cp(join(root,rel),target,{recursive:true});};

for(const rel of [
  'components.js','state.js','styles.css',
  'pat-freeze-guard-v5364.js','dashboard-map-tabs-v3.css','admin-runtime-v11.css','finance-mobile-cash-v5358.css','chat-tab-widget-ghost-v5359.css','final-workspaces-v5360.css','stages-landing-v5361.css','belavista-final-ui-v5362.css','admin-brand-style-v1.css',
  'map-page-widgets-v5.js','map-page-widgets-v5.css',
  'execution-planning-v8.js','execution-planning-v8.css',
  'api-client.mjs','firebase.mjs',
  'public-leads.css','public-leads.js','public-leads-context-v521.mjs','runtime-url-v1.mjs','public-lead-form.mjs','public-brand-return-reset-v5346.mjs','public-runtime-polish-v5332.mjs','public-model-quality-v5337.mjs','public-lead-intent-v5342.mjs','public-pan-zoom-runtime-v5344.mjs',
  'activity-form-groups-v1.mjs','stage-home-page-v1.mjs','admin-role-policy.mjs','proposal-vision.mjs',
  'reservation-flow.mjs','lead-sw.js','lead-manifest.webmanifest',
  'stage-workbench-data.mjs','activity-operational-details.mjs','activity-map-intelligence.mjs','activity-map-layer.css','activity-map-layer.mjs',
  'admin-runtime-v11.js','admin-lots-canvas-v1.js','stage-admin-v10.js','dashboard-map-tabs-v3.js','admin-public-map-surface-v5352.mjs','public-leads-map-v50.mjs','admin-public-map-3d-status-v5353.mjs','finance-mobile-cash-v5358.mjs','chat-tab-widget-ghost-v5359.mjs','final-workspaces-v5360.mjs','stages-landing-v5361.mjs','belavista-final-ui-v5362.mjs'
])await copy(rel);

await copy('assets/model/alianca_park_masterplan_preview.glb');
if(await access(join(root,'assets/model/masterplan-manifest.json'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/model/masterplan-manifest.json');
await copy('assets/model/vegetation');
await copy('assets/public');
await copy('assets/textures/cobblestone-pavement-polyhaven-1k.jpg');
await copy('assets/data/dwg-georeference.json');
if(await access(join(root,'assets/data/lot-pricing.json'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/data/lot-pricing.json');
if(await access(join(root,'assets/icons'),constants.R_OK).then(()=>true).catch(()=>false))await copy('assets/icons');
await writeFile(join(out,'.nojekyll'),'');
const leadsEntry=await readFile(join(root,'public-leads.html'),'utf8');
await writeFile(join(leads,'index.html'),leadsEntry);
console.log(`Página pública independente preparada em ${leads}`);
