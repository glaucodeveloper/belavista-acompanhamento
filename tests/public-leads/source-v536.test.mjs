import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.env.BELAVISTA_ROOT;if(!root)throw new Error('BELAVISTA_ROOT ausente');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const post=/public-fast-runtime-v53|public-static-runtime-v534|public-model-loading-v53(?:2|21|3|4)/i;

test('loader v5.3.1 foi restaurado fisicamente, não apenas referenciado',()=>{
  const loader=read('public-model-loading-v531.mjs');
  assert.match(loader,/HARD_RELEASE_MS\s*=\s*30000/);
  assert.ok(fs.statSync(path.join(root,'public-model-loading-v531.css')).size>0);
});

test('HTML usa somente baseline v531 e bootstrap recovery v5.3.6',()=>{
  const h=read('public-leads.html');
  assert.doesNotMatch(h,post);
  assert.match(h,/public-model-loading-v531\.mjs\?v=public-unfreeze-v5\.3\.6/);
  assert.match(h,/public-model-loading-v531\.css\?v=public-unfreeze-v5\.3\.6/);
  assert.match(h,/data-public-bootstrap-v536/);
  const recovery=h.indexOf("await import('./public-cache-recovery-v536.mjs?v=public-unfreeze-v5.3.6')");
  const publicJs=h.indexOf("await import('./public-leads.js?v=public-unfreeze-v5.3.6')");
  assert.ok(recovery>=0 && publicJs>recovery);
  assert.doesNotMatch(h,/<script\b[^>]*\bsrc=['"](?:\.\/)?public-leads\.js/i);
});

test('public-leads aponta para components e lead-sw com cache bust v5.3.6',()=>{
  const p=read('public-leads.js');
  assert.match(p,/components\.js\?v=public-unfreeze-v5\.3\.6/);
  if(/lead-sw\.js/.test(p)) assert.match(p,/lead-sw\.js\?v=public-unfreeze-v5\.3\.6/);
});

test('recovery é isolada ao lead-sw/cache público',()=>{
  const r=read('public-cache-recovery-v536.mjs');
  assert.match(r,/BELAVISTA_PUBLIC_CACHE_RECOVERY_V536/);
  assert.match(r,/lead-sw/);
  assert.match(r,/alianca-park-leads-/);
  assert.match(r,/staleLeadRegistrations/);
  assert.match(r,/publicCacheKeys=cacheKeys\.filter/);
  assert.match(r,/publicCacheKeys\.map\(key=>caches\.delete\(key\)\)/);
});

test('components é baseline idle e não v532',()=>{
  const c=read('components.js');
  assert.match(c,/requestIdleCallback/);
  assert.doesNotMatch(c,/BELAVISTA_PUBLIC_FAST_BOOT_V532|BELAVISTA_PUBLIC_IMMEDIATE_THREE_V532|BELAVISTA_PUBLIC_SKIP_RASTER_V532|BELAVISTA_PUBLIC_CORE_READY_V532/);
});

test('copy pública de Amargosa permanece',()=>{
  const joined=['public-leads.html','public-leads.js','public-lead-form.mjs'].filter(f=>fs.existsSync(path.join(root,f))).map(read).join('\n');
  assert.match(joined,/Amargosa, Bahia/);
});
