import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {DEVELOPMENT_STAGE_CATALOG,DEVELOPMENT_STAGE_SOURCES} from '../../development-stage-catalog.mjs';

const root=join(import.meta.dirname,'../..');
const read=path=>readFile(join(root,path),'utf8');

test('catálogo cobre a cadeia real da viabilidade à entrega',()=>{
  assert.equal(DEVELOPMENT_STAGE_CATALOG.length,15);
  for(const id of ['legal','surveys','design-approvals','earthworks','drainage','sanitation','water','electrical-base','paving','electrical-connection','closeout'])assert.ok(DEVELOPMENT_STAGE_CATALOG.some(stage=>stage.id===id),`${id} ausente`);
  for(const stage of DEVELOPMENT_STAGE_CATALOG){
    for(const field of ['entryGates','activities','requirements','materials','evidence','workerRules'])assert.ok(stage[field].length>=3,`${stage.id}.${field} insuficiente`);
  }
});

test('dependências do catálogo apontam apenas para etapas existentes e anteriores',()=>{
  const position=new Map(DEVELOPMENT_STAGE_CATALOG.map((stage,index)=>[stage.id,index]));
  for(const stage of DEVELOPMENT_STAGE_CATALOG)for(const dependency of stage.dependsOn){
    assert.ok(position.has(dependency),`${stage.id} depende de etapa ausente: ${dependency}`);
    assert.ok(position.get(dependency)<position.get(stage.id),`${stage.id} depende de etapa posterior: ${dependency}`);
  }
});

test('regras críticas mantêm enquadramento territorial, água antes da pavimentação e ligação Coelba no encerramento',()=>{
  const legal=DEVELOPMENT_STAGE_CATALOG.find(stage=>stage.id==='legal');
  const paving=DEVELOPMENT_STAGE_CATALOG.find(stage=>stage.id==='paving');
  const connection=DEVELOPMENT_STAGE_CATALOG.find(stage=>stage.id==='electrical-connection');
  assert.match([...legal.entryGates,...legal.workerRules].join(' '),/zona urbana|urbanização específica/i);
  assert.ok(paving.dependsOn.includes('curbs-accessibility'));
  assert.match(paving.entryGates.join(' '),/Água.*aceitos no setor/i);
  assert.match([...connection.entryGates,...connection.workerRules].join(' '),/Coelba|distribuidora/i);
});

test('página de workers oferece busca, filtro, expansão e fontes oficiais',async()=>{
  const [html,script,build]=await Promise.all([read('admin-workers.html'),read('admin-workers.js'),read('scripts/build-public-pages.mjs')]);
  for(const marker of ['data-requirements-catalog','data-requirements-search','data-requirements-phase','data-expand-requirements','PORTÃO JURÍDICO IMPEDITIVO'])assert.match(html,new RegExp(marker));
  assert.match(script,/renderRequirementsCatalog/);
  assert.match(script,/DEVELOPMENT_STAGE_CATALOG/);
  assert.match(build,/development-stage-catalog\.mjs/);
  assert.ok(DEVELOPMENT_STAGE_SOURCES.length>=7);
});
