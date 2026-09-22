import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('admin and workers load the same global test controls',async()=>{
  const [admin,workers]=await Promise.all([read('index.html'),read('admin-workers.html')]);
  for(const html of [admin,workers]){
    assert.match(html,/admin-test-controls\.css/);
    assert.match(html,/admin-test-controls\.mjs/);
  }
  assert.match(workers,/data-admin-test-mode/);
});

test('global laboratory includes all 16 existing automation scenarios',async()=>{
  const source=await read('admin-test-controls.mjs');
  const ids=[...source.matchAll(/\['((?:input|generation|notification|propagation)\.[^']+)'/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,16);
  assert.match(source,/\/api\/automation\/test/);
  assert.match(source,/scenario:'suite'/);
});

test('test mode is persisted and synchronized across admin tabs',async()=>{
  const source=await read('admin-test-controls.mjs');
  assert.match(source,/belavista\.admin\.testControlsEnabled\.v1/);
  assert.match(source,/BroadcastChannel/);
  assert.match(source,/addEventListener\('storage'/);
  assert.match(source,/location\.pathname\.startsWith\('\/admin'\)/);
});

test('public build includes global laboratory assets',async()=>{
  const source=await read('scripts/build-public-pages.mjs');
  assert.match(source,/admin-test-controls\.mjs/);
  assert.match(source,/admin-test-controls\.css/);
});
