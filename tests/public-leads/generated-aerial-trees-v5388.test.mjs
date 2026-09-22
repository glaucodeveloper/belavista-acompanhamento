import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('captura satelital tratada do DWG permanece disponível como base pública',()=>{
  const components=read('components.js');
  const context=read('public-leads-context-v521.mjs');
  const build=read('scripts/build-public-pages.mjs');
  assert.ok(fs.statSync(path.join(root,'assets/public/dwg-satellite-treated-v5411.png')).size>10000);
  assert.match(components,/data-map-tiles="generated">Captura tratada · DWG/);
  assert.match(components,/dwg-satellite-treated-v5411/);
  assert.match(components,/this\.mapTileMode=this\.isPublicCustomerExperience\(\)\?'generated'/);
  assert.match(context,/const mapMode='generated'/);
  assert.match(context,/local captured satellite image · DWG-centred source · no Maps/);
  assert.doesNotMatch(context,/requestedAerial/);
  assert.match(context,/map.setMapTileMode\?\.\(mapMode,false\)/);
  assert.match(build,/dwg-satellite-treated-v5411\.png/);
});

test('árvores 3D continuam sendo derivadas da imagem ativa e do espaço DWG',()=>{
  const components=read('components.js');
  assert.match(components,/extractPublicVegetationSamplesV1\(this\.mapSurfaceTexture\)/);
  assert.match(components,/assets\/model\/vegetation\/tree-cc0\.glb/);
  assert.match(components,/texture UV → mapSurface position\/scale\/rotation → sceneStage local/);
  assert.match(components,/satellite-vegetation-candidate/);
  assert.match(components,/mapGeneratedAerialFit='mosaico satelital tratado · centro e enquadramento do DWG'/);
  assert.match(components,/DWG_SATELLITE_MOSAIC_TILE_X0=102215/);
  assert.match(components,/DWG_SATELLITE_MOSAIC_TILE_Y0=140616/);
  assert.match(components,/mosaicLogicalWidth=DWG_SATELLITE_MOSAIC_TILES\*DWG_SATELLITE_MOSAIC_TILE_SIZE/);
  assert.match(components,/mosaicX=\(DWG_SATELLITE_MOSAIC_TILE_X0-x0\)\*DWG_SATELLITE_MOSAIC_TILE_SIZE/);
  assert.match(components,/origem geográfica preservada/);
  assert.match(components,/mapGeneratedAerialScale=/);
  assert.match(components,/mapGeneratedAerialAnchor=/);
  assert.match(components,/mapTileMode==='generated'/);
  assert.match(components,/treated satellite mosaic anchored to DWG origin/);
});

test('relevo da imagem gerada ancora a malha e reposiciona as árvores em Z',()=>{
  const components=read('components.js');
  assert.match(components,/new THREE\.PlaneGeometry\(1,1,72,72\)/);
  assert.match(components,/queueGeneratedTerrainHeightmapV5391\(\)/);
  assert.match(components,/getImageData\(0,0,size,size\)/);
  assert.match(components,/publicGeneratedTerrainHeightmapV5391=\{size,values/);
  assert.match(components,/applyGeneratedTerrainHeightmapV5391\(\)/);
  assert.match(components,/terrainAnchorV5391/);
  assert.match(components,/useGeneratedHeightmap/);
  assert.match(components,/reliftPublicTreesToTerrainV5391\(\)/);
  assert.match(components,/generated-image-heightmap · visual estimate · low amplitude/);
});
