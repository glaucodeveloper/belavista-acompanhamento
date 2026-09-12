import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const state=fs.readFileSync(path.join(root,'state.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');

test('o mapa solar inicia no relógio local do ponto georreferenciado',()=>{
  assert.match(components,/America\/Bahia/);
  assert.match(components,/localClockHourForGeo/);
  assert.match(components,/solarHourMode==='manual'/);
  assert.match(components,/manual\?Number\(stored\.solarHour\):clockHour/);
  assert.match(state,/solarHourMode/);
});

test('o controle solar fica discreto até hover ou foco',()=>{
  assert.match(styles,/\.map-solar-control\{[\s\S]*?opacity:0[;}]?/);
  assert.match(styles,/\.map-solar-control:hover,\.map-solar-control:focus-within\{opacity:1\}/);
});
