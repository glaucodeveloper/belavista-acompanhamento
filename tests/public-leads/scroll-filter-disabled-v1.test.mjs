import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('rolagem pública não dispara filtros ou highlights de status',()=>{
  const source=read('public-lead-form.mjs');
  const scrollFlow=source.slice(source.indexOf('const applyState='),source.indexOf('const requestRender='));
  assert.doesNotMatch(scrollFlow,/activateHighlight|setPublicLotFilter|data-public-highlight|clearScrollHighlight/);
  assert.doesNotMatch(source,/data-scroll-point=/);
  assert.match(source,/Explore o loteamento/);
});

test('filtros continuam disponíveis somente por interação',()=>{
  const source=read('public-lead-form.mjs');
  assert.match(source,/result\.map\?\.highlight\)surface\?\.activateHighlight\(result\.map\.highlight,'ai'\)/);
  assert.match(source,/activateHighlight\(key,source='interactive'\)/);
});

test('troca de seção por rolagem não reaplica filtro comercial',()=>{
  const source=read('public-leads-context-v521.mjs');
  const scrollSection=source.slice(source.indexOf('function setScrollSection'),source.indexOf('function titleFadeForY'));
  assert.doesNotMatch(scrollSection,/applyCommercialMarkerFilter/);
  assert.match(source,/function applyCommercialMarkerFilter/);
});
