import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const readMapScene=()=>read('components.js')+'\n'+read('components/map/public-terrain-environment-v1.mjs');

test('captura satelital tratada do DWG permanece disponível como base pública',()=>{
  const components=readMapScene();
  const context=read('public-leads-context-v521.mjs');
  const build=read('scripts/build-public-pages.mjs');
  assert.ok(fs.statSync(path.join(root,'assets/public/dwg-satellite-treated-v5411.png')).size>10000);
  assert.match(components,/data-map-tiles="generated">Captura tratada · DWG/);
  assert.match(components,/dwg-satellite-treated-v5411/);
  assert.match(components,/this\.mapTileMode\s*=\s*["']generated["']/);
  assert.match(context,/const mapMode='generated'/);
  assert.match(context,/local captured satellite image · DWG-centred source · no Maps/);
  assert.doesNotMatch(context,/requestedAerial/);
  assert.match(context,/map.setMapTileMode\?\.\(mapMode,false\)/);
  assert.match(build,/dwg-satellite-treated-v5411\.png/);
});

test('árvores 3D continuam sendo derivadas da imagem ativa e do espaço DWG',()=>{
  const components=readMapScene();
  assert.match(components,/extractPublicVegetationSamplesV1\(this\.mapSurfaceTexture\)/);
  assert.match(components,/assets\/model\/vegetation\/tree-cc0\.glb/);
  assert.match(components,/texture UV → mapSurface position\/scale\/rotation → sceneStage local/);
  assert.match(components,/satellite-vegetation-candidate/);
  assert.match(components,/this\.dataset\.mapGeneratedAerialFit\s*=\s*["']mosaico satelital tratado · centro e enquadramento do DWG["']/);
  assert.match(components,/DWG_SATELLITE_MOSAIC_TILE_X0\s*=\s*102215/);
  assert.match(components,/DWG_SATELLITE_MOSAIC_TILE_Y0\s*=\s*140616/);
  assert.match(components,/mosaicLogicalWidth\s*=\s*DWG_SATELLITE_MOSAIC_TILES\s*\*\s*DWG_SATELLITE_MOSAIC_TILE_SIZE/);
  assert.match(components,/mosaicX\s*=\s*\(DWG_SATELLITE_MOSAIC_TILE_X0\s*-\s*x0\)\s*\*\s*DWG_SATELLITE_MOSAIC_TILE_SIZE/);
  assert.match(components,/origem geográfica preservada/);
  assert.match(components,/this\.dataset\.mapGeneratedAerialScale\s*=/);
  assert.match(components,/this\.dataset\.mapGeneratedAerialAnchor\s*=/);
  assert.match(components,/this\.mapTileMode\s*===\s*["']generated["']/);
  assert.match(components,/treated satellite mosaic anchored to DWG origin/);
});

test('relevo da imagem gerada ancora a malha e reposiciona as árvores em Z',()=>{
  const components=readMapScene();
  assert.match(components,/new THREE\.PlaneGeometry\(1, 1, 72, 72\)/);
  assert.match(components,/queueGeneratedTerrainHeightmapV5391\(\)/);
  assert.match(components,/getImageData\(\s*0,\s*0,\s*size,\s*size\s*\)/);
  assert.match(components,/this\.publicGeneratedTerrainHeightmapV5391\s*=\s*\{\s*size,\s*values,/);
  assert.match(components,/applyGeneratedTerrainHeightmapV5391\(\)/);
  assert.match(components,/terrainAnchorV5391/);
  assert.match(components,/useGeneratedHeightmap/);
  assert.match(components,/reliftPublicTreesToTerrainV5391\(\)/);
  assert.match(components,/generated-image-heightmap · visual estimate · low amplitude/);
});
