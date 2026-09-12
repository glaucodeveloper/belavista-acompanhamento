import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
const css=fs.readFileSync(path.join(root,'public-leads.css'),'utf8');
const html=fs.readFileSync(path.join(root,'public-leads.html'),'utf8');

test('legenda de obra fica oculta no letreiro e aparece na seção do mapa',()=>{
  assert.match(css,/body\.public-leads-page \.public-map-sticky \.activity-map-legend\{[\s\S]*?opacity:0!important;[\s\S]*?visibility:hidden!important;/);
  assert.match(css,/body\.public-leads-page\[data-public-scroll-section="map"\] \.public-map-sticky \.activity-map-legend\{[\s\S]*?opacity:1!important;[\s\S]*?visibility:visible!important;/);
  assert.match(html,/public-leads\.css\?v=public-activity-legend-scroll-v5382/);
});
