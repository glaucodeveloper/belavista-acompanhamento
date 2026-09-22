import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=process.env.BELAVISTA_ROOT||process.cwd(),r=f=>fs.readFileSync(path.join(root,f),'utf8');
test('HTML usa somente runtime estático v5.3.4',()=>{const h=r('public-leads.html');assert.match(h,/public-static-runtime-v534\.mjs/);assert.match(h,/public-static-stable-v534\.css/);assert.doesNotMatch(h,/public-model-loading-v53|public-fast-runtime-v53|public-leads-map-v50/);});
test('Leaflet não é carregado na página pública',()=>{const h=r('public-leads.html');assert.doesNotMatch(h,/leaflet@1\.9\.4\/dist\/leaflet\.(js|css)/);});
test('runtime intercepta e bloqueia Three/GLB/Leaflet público',()=>{const s=r('public-static-runtime-v534.mjs');assert.match(s,/customElements\.define=function/);assert.match(s,/three-init-bypassed/);assert.match(s,/leaflet-bypassed/);assert.match(s,/3d-disabled-on-public-load/);assert.doesNotMatch(s,/requestIdleCallback|loader\.load\(/);});
test('copy de Amargosa é aplicada',()=>{const s=r('public-static-runtime-v534.mjs');assert.match(s,/Escolha seu lote/);assert.match(s,/em Amargosa, Bahia/);assert.match(s,/ALIANÇA PARK · AMARGOSA, BAHIA/);});
test('CSS elimina canvas e usa imagem PDF estática',()=>{const c=r('public-static-stable-v534.css');assert.match(c,/alianca-park-masterplan-static-v534\.webp/);assert.match(c,/scene-world/);assert.match(c,/display:none!important/);});
test('components recebe cache bust estável',()=>assert.match(r('public-leads.js'),/components\.js\?v=public-static-v5\.3\.4/));
