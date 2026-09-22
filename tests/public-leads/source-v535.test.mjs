import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
const root=process.env.BELAVISTA_ROOT; if(!root) throw new Error('BELAVISTA_ROOT ausente');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');

test('HTML não carrega runtimes que iniciaram após o baseline',()=>{
  const h=read('public-leads.html');
  assert.doesNotMatch(h,/public-fast-runtime-v53/i);
  assert.doesNotMatch(h,/public-static-runtime-v534/i);
  assert.doesNotMatch(h,/public-model-loading-v532|public-model-loading-v5321|public-model-loading-v533|public-model-loading-v534/i);
});

test('public-leads volta a importar components com cache bust novo',()=>{
  assert.match(read('public-leads.js'),/components\.js\?v=pre-freeze-v5\.3\.5/);
});

test('components recuperado não contém otimizações v532 posteriores',()=>{
  const c=read('components.js');
  assert.doesNotMatch(c,/BELAVISTA_PUBLIC_FAST_BOOT_V532|BELAVISTA_PUBLIC_IMMEDIATE_THREE_V532|BELAVISTA_PUBLIC_SKIP_RASTER_V532|BELAVISTA_PUBLIC_CORE_READY_V532/);
});

test('scheduler baseline usa requestIdleCallback',()=>{
  const c=read('components.js');
  assert.match(c,/scheduleThree\(\)/);
  assert.match(c,/requestIdleCallback/);
  assert.doesNotMatch(c,/queueMicrotask\s*\(\s*run\s*\)/);
});

test('copy de Amargosa existe no source público',()=>{
  const joined=['public-leads.html','public-leads.js','public-lead-form.mjs'].filter(f=>fs.existsSync(path.join(root,f))).map(read).join('\n');
  assert.match(joined,/Amargosa, Bahia/);
});
