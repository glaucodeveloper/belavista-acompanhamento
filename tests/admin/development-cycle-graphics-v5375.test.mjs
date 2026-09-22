import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('admin-workers.html');
const workers=read('admin-workers.js');
const server=read('server.mjs');
const css=read('admin-workers.css');

test('a monitoria oferece o teste visual do ciclo completo',()=>{
  assert.match(html,/data-run-development-cycle/);
  assert.match(html,/Gerar ciclo com gráficos/);
  assert.match(html,/16 CASOS \+ CICLO/);
});

test('o endpoint de teste gera agenda, cronograma, pessoal e materiais na mesma leitura do worker',()=>{
  assert.match(server,/scenario==='development-cycle'/);
  assert.match(server,/buildDevelopmentCycleTestOutput\(loop\)/);
  for(const chart of ['agenda','cronograma','pessoal','materiais'])assert.match(server,new RegExp(`${chart}:\{`));
  for(const field of ['confirmation','checks','schedule','materialRows'])assert.match(server,new RegExp(`\\b${field}\\b`));
  assert.match(server,/externalMessaging:'disabled'/);
});

test('a interface renderiza gráficos e a tabela detalhada do ciclo',()=>{
  assert.match(workers,/function renderDevelopmentCycle/);
  for(const selector of ['cycle-chart-grid','cycle-timeline','cycle-material-table','cycle-confirmation'])assert.match(workers,new RegExp(selector));
  assert.match(workers,/scenario==='development-cycle'\?\{scenario:'development-cycle'\}/);
  assert.match(workers,/data-run-development-cycle/);
});

test('os gráficos permanecem legíveis em telas pequenas',()=>{
  for(const selector of ['.cycle-bar-track','.cycle-check-list','.cycle-detail-grid'])assert.match(css,new RegExp(selector.replace(/[.]/g,'\\.')));
  assert.match(css,/@media\(max-width:720px\).*cycle-chart-grid/);
});
