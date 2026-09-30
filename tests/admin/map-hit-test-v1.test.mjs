import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const pickStart=components.indexOf('  pickModelAt(point){');
const pickEnd=components.indexOf('  isDashboardStatusContext(){',pickStart);
const pickSource=components.slice(pickStart,pickEnd);

test('vazio entre polígonos não seleciona o vizinho por proximidade',()=>{
  assert.ok(pickStart>=0&&pickEnd>pickStart);
  assert.doesNotMatch(pickSource,/let nearest=|const nearest=|Math\.hypot\(point\./);
  assert.match(pickSource,/const picked=this\.adminStandalonePhysicalMapPartAtV5370\(point\);/);
  assert.match(pickSource,/return false;\s*\}\s*$/);
});
