import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const exists=relative=>fs.existsSync(path.join(root,relative));
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
function walk(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const p=path.join(dir,entry.name);return entry.isDirectory()?walk(p):[p];});}
function workerSource(){return walk(path.join(root,'worker/src')).filter(f=>/\.(m?js|ts)$/.test(f)).map(f=>`\n/* ${path.relative(root,f)} */\n${fs.readFileSync(f,'utf8')}`).join('\n');}

test('Worker expõe o ciclo operacional unificado',()=>{const src=workerSource();assert.match(src,/\/api\/operational-loop/);});
test('Worker contém integração GitHub usando GITHUB_PAT',()=>{const src=workerSource();assert.match(src,/GITHUB_PAT/);assert.match(src,/api\.github\.com|github\.com\/repos|\/repos\//i);});
test('Worker expõe chat público de Leads',()=>{assert.match(workerSource(),/\/api\/public\/lead-chat/);});
test('Modelo operacional representa localidade explicitamente em atividade e pessoal/encarregado',()=>{
  const src=workerSource();
  const locality=/(localityId|localidadeObraId|worksiteId|workFrontId|frenteObraId)/;
  assert.match(src,locality,'Nenhum identificador explícito de localidade/frente de obra foi encontrado em worker/src.');
  assert.match(src,/(foremanId|encarregadoId|personnel|pessoal|assignee)/i,'Nenhum vínculo de encarregado/pessoal foi encontrado.');
  const schedulerFiles=walk(path.join(root,'worker/src')).filter(f=>/(operational|schedul|agenda|planning|resource|personnel)/i.test(path.basename(f))&&/\.(m?js|ts)$/.test(f));
  const scheduler=schedulerFiles.map(f=>fs.readFileSync(f,'utf8')).join('\n');
  assert.match(scheduler,locality,'A localidade existe em algum arquivo, porém não participa do agendador/loop operacional.');
});
test('Cronograma não usa score numérico de prioridade para ordenar/liberar',()=>{const scheduler=walk(path.join(root,'worker/src')).filter(f=>/(operational|schedul|agenda)/i.test(path.basename(f))&&/\.(m?js|ts)$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n');assert.ok(scheduler.length,'Não existe módulo do cronograma operacional.');assert.doesNotMatch(scheduler,/priorityScore|sort\([^\n]*(?:priority|prioridade)|(?:priority|prioridade)\s*[-+*/]/i);});
test('Worker separa operações públicas das administrativas',()=>{const src=workerSource();assert.match(src,/lead-chat/);assert.match(src,/authorization|Bearer|auth|verify.*token/i);});
test('Integração GitHub não devolve o valor de GITHUB_PAT em resposta explícita',()=>{const src=workerSource();assert.doesNotMatch(src,/json\s*\(\s*\{[^}]*GITHUB_PAT\s*:/s,'Código aparenta serializar GITHUB_PAT em resposta.');});
test('Firebase operacional é publicado pelo Worker',()=>{const src=workerSource();assert.match(src,/firebaseio\.com|FIREBASE_DATABASE_URL|publish.*Realtime|operationalEvents|notifications/i);});
