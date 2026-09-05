import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=process.env.BELAVISTA_ROOT;const s=f=>fs.readFileSync(path.join(root,f),'utf8');
test('stage admin antigo é adaptado para config GitHub do Worker',()=>{const x=s('admin-runtime-v11.js');assert.match(x,/\/api\/stages-admin/);assert.match(x,/\/api\/admin\/config\/stages/);});
test('caixa exige upload ou desenho em canvas',()=>{const x=s('admin-runtime-v11.js');assert.match(x,/cashProof/);assert.match(x,/data-cash-signature/);assert.match(x,/Anexe um comprovante ou assine\/desenhe/);});
test('caixa vira evento estrito NVIDIA e não mutação local',()=>{const x=s('admin-runtime-v11.js');assert.match(x,/cash\.entry\.recorded/);assert.match(x,/strict-ai-state-transition/);assert.match(x,/noDeterministicFallback:true/);});
test('evidência é armazenada pelo Worker no GitHub',()=>{const x=s('worker/src/cash-evidence.js');assert.match(x,/GITHUB_PAT/);assert.match(x,/data\/operational\/evidence\/cash/);assert.match(s('worker/src/routes.js'),/\/api\/admin\/cash-evidence/);});
test('mapa público continua sem controles e mapa admin os restaura',()=>{const x=s('admin-runtime-v11.js');assert.match(x,/data-public-presentation/);assert.match(x,/admin-map-enabled/);const c=s('admin-runtime-v11.css');assert.match(c,/map-scene\[data-public-presentation\]/);});
test('caixa é removido da página de mapa',()=>{const x=s('admin-runtime-v11.js');assert.ok(x.includes("replace('<stage-cash-dashboard></stage-cash-dashboard>','')"));});
