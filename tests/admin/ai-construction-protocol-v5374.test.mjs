import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const document=read('docs/ai-construction-operational-playbook.md');
const server=read('server.mjs');
const workers=read('admin-workers.js');

test('documento operacional registra a ordem e os quantitativos derivados do DWG',()=>{
  for(const phrase of ['Viabilidade fundiária','Abertura de vias e terraplanagem','Rede de água para os 298 lotes','Base e pavimentação em paralelepípedos','Inspeção, incorporação e ligação pela Neoenergia Coelba'])assert.match(document,new RegExp(phrase));
  for(const phrase of ['EPSG:31984','298','32.018,72 m²','1.512.885','3.600 m'])assert.match(document,new RegExp(phrase.replace(/[.]/g,'\\.')));
});

test('cada etapa documenta equipamento, material, unidade e aceite',()=>{
  assert.ok((document.match(/\*\*Equipamentos e pessoas:\*\*/g)||[]).length>=15);
  assert.ok((document.match(/\*\*Materiais[^:]*:\*\*/g)||[]).length>=15);
  assert.ok((document.match(/\*\*Unidade de produção:\*\*/g)||[]).length>=15);
  assert.ok((document.match(/\*\*Aceite:\*\*/g)||[]).length>=15);
});

test('o prompt operacional incorpora o documento e o snapshot calculado do DWG',()=>{
  assert.match(server,/ai-construction-operational-playbook\.md/);
  assert.match(server,/aiConstructionDocument\.slice\(0,30000\)/);
  assert.match(server,/getProductionBaseline/);
  assert.match(server,/FONTE OPERACIONAL OBRIGATÓRIA/);
});

test('a monitoria oferece acesso ao mesmo documento usado pela IA',()=>{
  assert.match(workers,/docs\/ai-construction-operational-playbook\.md/);
  assert.match(workers,/Documento operacional usado pela IA/);
});
