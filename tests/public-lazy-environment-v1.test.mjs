import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const readMapScene=()=>read('components.js')+'\n'+read('components/map/public-terrain-environment-v1.mjs');

test('entorno 3D é enfileirado depois do primeiro enquadramento',()=>{
  const components=readMapScene();
  assert.match(components,/schedulePublicEnvironmentLoadingV1/);
  assert.match(components,/queued-after-first-open/);
  assert.match(components,/this\.dataset\.publicEnvironment\s*=\s*["']loading["']/);
  assert.match(components,/requestIdleCallback/);
  assert.match(components,/scheduleTimeout\(\(\)\s*=>/);
});

test('a fase GPU principal agenda o ambiente sem bloquear o loteamento',()=>{
  const components=readMapScene();
  const mainCall=read('components.js').indexOf('this.schedulePublicEnvironmentLoadingV1();');
  const directCall=read('components/map/public-terrain-environment-v1.mjs').indexOf('this.addPublicVegetation();');
  assert.ok(mainCall>0,'o estágio principal deve agendar o ambiente');
  assert.ok(directCall>0,'a rotina tardia deve carregar a vegetação');
  assert.doesNotMatch(read('components.js').slice(mainCall),/this\.addPublicVegetation\(\)/,'o estágio principal não deve chamar a vegetação diretamente');
  assert.match(components,/this\.dataset\.publicTerrainRelief\s*=\s*["']queued-after-first-open["']/);
});

test('o entorno usa somente imagem aérea e posicionamento no espaço local do mapa',()=>{
  const components=readMapScene();
  const build=read('scripts/build-public-pages.mjs');
  assert.match(components,/loadPublicTerrainTextureV1/);
  assert.match(components,/disabled · satellite-only ground/);
  assert.doesNotMatch(components,/alianca-park-grass-hires-v5319\.webp/);
  assert.doesNotMatch(components,/alianca-park-pdf-grass-static-v521\.jpg/);
  assert.match(components,/new THREE\.Matrix4\(\)\s*\.copy\(this\.sceneStage\.matrixWorld\)\s*\.invert\(\)/);
  assert.match(components,/this\.dataset\.publicVegetationCoordinateSpace\s*=\s*["']sceneStage local/);
  assert.match(components,/this\.dataset\.publicVegetationDetection\s*=\s*["']meshes verdes \+ árvores do GLB\/DWG \+ malha irregular do entorno["']/);
  assert.match(components,/extractPublicVegetationSamplesV1/);
  assert.match(components,/publicVegetationImageSampling/);
  assert.match(build,/assets\/model\/vegetation\/tree-cc0\.glb/);
  assert.match(build,/await copy\('assets\/public'\)/);
});
