import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=process.env.BELAVISTA_ROOT;const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
test('pan principal está invertido',()=>assert.match(read('components.js'),/sceneManualPan\.x-dx[^\n]*sceneManualPan\.y-dy/));
test('módulo visual está carregado',()=>assert.match(read('public-leads.html'),/public-leads-polish-v49\.mjs/));
test('components recebe cache-bust',()=>assert.match(read('public-leads.js'),/components\.js\?v=visual-v49/));
test('chat recebe acabamento vertical',()=>{const css=read('public-leads.css');assert.match(css,/BELAVISTA_PUBLIC_MAP_CHAT_POLISH_V49/);assert.match(css,/min-height:clamp\(520px,64svh,610px\)/);});
test('runtime fixa preset e paleta PDF',()=>{const js=read('public-leads-polish-v49.mjs');assert.match(js,/tilt:70,rotation:0,zoom:1\.68/);assert.match(js,/pdf-warley-page-1-v49/);assert.match(js,/0x266734/);assert.match(js,/0x909690/);});
test('HUD administrativo continua escondido no público',()=>assert.match(read('public-leads.css'),/map-scene\[data-public-presentation\][\s\S]*map-category-switcher/));
