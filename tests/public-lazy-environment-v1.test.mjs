import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('entorno 3D é enfileirado depois do primeiro enquadramento',()=>{
  const components=read('components.js');
  assert.match(components,/schedulePublicEnvironmentLoadingV1/);
  assert.match(components,/queued-after-first-open/);
  assert.match(components,/publicEnvironment='loading'/);
  assert.match(components,/requestIdleCallback/);
  assert.match(components,/setTimeout\(\(\)=>/);
});

test('a fase GPU principal agenda o ambiente sem bloquear o loteamento',()=>{
  const components=read('components.js');
  const mainCall=components.indexOf('this.schedulePublicEnvironmentLoadingV1();');
  const directCall=components.lastIndexOf('this.addPublicVegetation();');
  assert.ok(mainCall>0,'o estágio principal deve agendar o ambiente');
  assert.ok(directCall>0,'a rotina tardia deve carregar a vegetação');
  assert.equal(components.slice(mainCall).includes('this.addPublicVegetation();'),false,'o estágio principal não deve chamar a vegetação diretamente');
  assert.match(components,/publicTerrainRelief='queued-after-first-open'/);
});

test('o entorno usa somente imagem aérea e posicionamento no espaço local do mapa',()=>{
  const components=read('components.js');
  const build=read('scripts/build-public-pages.mjs');
  assert.match(components,/loadPublicTerrainTextureV1/);
  assert.match(components,/disabled · satellite-only ground/);
  assert.doesNotMatch(components,/alianca-park-grass-hires-v5319\.webp/);
  assert.doesNotMatch(components,/alianca-park-pdf-grass-static-v521\.jpg/);
  assert.match(components,/new THREE\.Matrix4\(\)\.copy\(this\.sceneStage\.matrixWorld\)\.invert\(\)/);
  assert.match(components,/publicVegetationCoordinateSpace='sceneStage local/);
  assert.match(components,/publicVegetationDetection='meshes verdes \+ árvores do GLB\/DWG \+ malha irregular do entorno'/);
  assert.match(components,/extractPublicVegetationSamplesV1/);
  assert.match(components,/publicVegetationImageSampling/);
  assert.match(build,/assets\/model\/vegetation\/tree-cc0\.glb/);
  assert.match(build,/await copy\('assets\/public'\)/);
});
