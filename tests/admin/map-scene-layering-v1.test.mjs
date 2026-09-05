import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const css=fs.readFileSync(path.join(root,'admin-brand-style-v1.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('mapa persistente fica inerte fora das telas que usam mapa',()=>{
  assert.match(css,/\.scene:not\(:has\(>view-layer\[data-view="map"\]\)\):not\(:has\(>view-layer\[data-view="records"\]\)\)>map-scene\[data-persistent-map="true"\]/);
  assert.match(css,/visibility:hidden!important;\s*pointer-events:none!important;/);
  assert.match(css,/>map-scene \.three-overlay\{\s*pointer-events:none!important;/);
});

test('pagina ativa permanece acima do mapa compartilhado',()=>{
  assert.match(css,/\.scene:not\(:has\(>view-layer\[data-view="map"\]\)\)>view-layer\{\s*z-index:20!important;/);
  assert.match(css,/\.scene\{isolation:isolate;\}/);
});

test('correcao de camada e carregada depois das regras antigas do mapa',()=>{
  assert.ok(html.indexOf('admin-brand-style-v1.css')>html.indexOf('belavista-final-ui-v5362.css'));
});
