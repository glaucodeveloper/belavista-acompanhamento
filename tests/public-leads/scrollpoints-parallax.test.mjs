import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.env.BELAVISTA_PATCH_ROOT||path.resolve(process.cwd());
const form=fs.readFileSync(path.join(root,'overlay/public-lead-form.mjs'),'utf8');
const css=fs.readFileSync(path.join(root,'overlay/public-leads.css'),'utf8');
const html=fs.readFileSync(path.join(root,'overlay/public-leads.html'),'utf8');

test('usa scroll físico e não intercepta wheel/touch como timeline virtual',()=>{
  assert.doesNotMatch(form,/addEventListener\(['"]wheel['"]/);
  assert.doesNotMatch(form,/preventDefault\(\).*virtual|virtualProgress/i);
  assert.match(css,/overflow-y:auto!important/);
  assert.match(css,/position:sticky/);
  assert.match(css,/height:360svh/);
});
test('possui scrollpoints reais para os quatro highlights',()=>{
  for(const key of ['urbanizacao','rede-agua','rede-eletrica','pavimentacao'])assert.match(form,new RegExp(`data-scroll-point="${key}"`));
  assert.match(form,/activePoint\(\)/);
  assert.match(form,/activateHighlight\(key,'scrollpoint'\)/);
});
test('letreiro faz parallax contínuo e fade, revelando o mapa',()=>{
  assert.match(form,/letter\.style\.opacity/);
  assert.match(form,/--public-letter-lift/);
  assert.match(form,/--public-letter-side/);
  assert.match(form,/letter\.style\.filter/);
  assert.match(form,/--public-map-reveal/);
  assert.match(css,/will-change:opacity,transform,filter/);
});
test('mapa público não exibe controles administrativos',()=>{
  assert.match(form,/data-public-presentation/);
  for(const token of ['map-category-switcher','map-rotation-controls','map-gesture-legend','map-badge','map-selection-tools','map-selection-panel','map-status-panel']){
    assert.match(css,new RegExp(token));
  }
  assert.match(form,/disableAdministrativeMapControls/);
  assert.match(form,/MutationObserver/);
});
test('canvas/mapa continua disponível para seleção e gesto',()=>{
  assert.match(form,/map\?\.addEventListener\('click'/);
  assert.match(css,/\.public-map-sticky>map-scene\{[^}]*z-index:0!important\}/i);
});
test('artefato usa versão v4.6 para bust de cache',()=>{
  assert.match(html,/scrollpoints-v4\.6/);
  assert.match(form,/public-chat-v4\.6/);
});
