import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const tileRoot=path.join(root,'assets/public/alianca-park-aerial-realistic-tiles-v2');

test('prévia e troca coordenada dos recortes são usadas pela cena',()=>{
  const scene=fs.readFileSync(path.join(root,'components.js'),'utf8');
  const preview=path.join(root,'assets/public/alianca-park-aerial-realistic-preview-v2.jpg');
  assert.ok(fs.statSync(preview).size>100_000);
  assert.match(scene,/ADMIN_AERIAL_TILE_PREFETCH_RATIO_V2 = 1\.3/);
  assert.match(scene,/ADMIN_AERIAL_TILE_SWAP_RATIO_V2 = 1\.5/);
  assert.match(scene,/\[\.\.\.visibleKeys\]\.every\(\(key\) => entries\.get\(key\)\?\.state === "ready"\)/);
  assert.match(scene,/MAX_SCENE_ZOOM = 20/);
  assert.match(scene,/Math\.min\(MAX_SCENE_ZOOM, Number\(zoom\) \|\| 1\)/);
  assert.match(scene,/entry\.mesh\.material\.opacity = state\.opacity/);
  assert.match(scene,/\(now - started\) \/ 320/);
  assert.match(scene,/setAdminAerialTileOpacityV2\(showDetail \? 1 : 0, visibleKeys\)/);
});

test('15 recortes cobrem exatamente a textura de detalhe sem lacunas',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(tileRoot,'manifest.json'),'utf8'));
  assert.deepEqual(manifest.grid,[5,3]);
  assert.deepEqual(manifest.sourcePixels,[19200,10805]);
  assert.equal(manifest.tiles.length,15);
  const [width,height]=manifest.sourcePixels;
  for(const tile of manifest.tiles){
    const [left,top,right,bottom]=tile.pixels;
    assert.deepEqual(tile.pixels,[
      Math.floor(width*tile.col/25)*5,Math.floor(height*tile.row/15)*5,
      Math.floor(width*(tile.col+1)/25)*5,Math.floor(height*(tile.row+1)/15)*5,
    ]);
    assert.deepEqual(tile.uv,[left/width,top/height,right/width,bottom/height]);
    assert.equal(tile.alignment.length,6);
    const file=path.join(tileRoot,tile.file);
    assert.ok(fs.statSync(file).size>1000,`${tile.file} existe e contém imagem`);
    assert.equal(fs.readFileSync(file).toString('ascii',0,4),'RIFF');
  }
});
