import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=process.env.BELAVISTA_ROOT;const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('HTML usa somente loader v5.3.2.1',()=>{const h=read('public-leads.html');assert.match(h,/public-model-loading-v5321\.css/);assert.match(h,/public-model-loading-v5321\.mjs/);assert.match(h,/public-fast-runtime-v5321\.mjs/);assert.doesNotMatch(h,/public-model-loading-v532\.mjs/);});
test('loader solta cedo',()=>{const s=read('public-model-loading-v5321.mjs');assert.match(s,/SOFT_RELEASE_MS=1400/);assert.match(s,/HARD_RELEASE_MS=2600/);assert.match(s,/MIN_VISIBLE_MS=420/);});
test('runtime não depende de initWhenReady literal',()=>{const s=read('public-fast-runtime-v5321.mjs');assert.match(s,/customElements\.get\('map-scene'\)/);assert.match(s,/proto\.scheduleThree/);assert.match(s,/proto\.refreshMapSurface/);assert.doesNotMatch(s,/initWhenReady\(\)/);});
test('base pública pula raster GPS',()=>{const s=read('public-fast-runtime-v5321.mjs');assert.match(s,/mapRasterMode='static-css-background'/);assert.match(s,/mapTextureTiles='0\/0'/);});
test('cache bust components',()=>assert.match(read('public-leads.js'),/components\.js\?v=model-loading-v5\.3\.2\.1/));
