import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const legacyApp=fs.readFileSync(path.join(root,'app-road-integral-v10.mjs'),'utf8');
const shell=app.slice(app.indexOf('  mountShell(){'),app.indexOf('  bind(){'));
const shellMarkup=shell.slice(shell.indexOf('this.innerHTML=`'),shell.indexOf(';',shell.indexOf('this.innerHTML=`')));

test('shell Atlas monta apenas a página ativa; mapas pertencem à rota, não ao fundo global',()=>{
  assert.match(shell,/<section class="scene"><view-layer><\/view-layer><\/section>/);
  assert.doesNotMatch(shellMarkup,/map-scene|data-map-scene-template|data-persistent-map|stage-map-accordion/);
  assert.match(shell,/querySelectorAll\('\.scene > map-scene\[data-persistent-map="true"\]'\)\.forEach\(map=>map\.remove\(\)\)/);
  assert.doesNotMatch(legacyApp,/data-persistent-map="true"|waitForMapWarmup/);
  assert.doesNotMatch(app,/syncMapSurface|_sharedMapScene/);
});
