import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const components=fs.readFileSync(path.join(root,'components.js'),'utf8');
const routing=fs.readFileSync(path.join(root,'components/shared/routing.mjs'),'utf8');
const workers=fs.readFileSync(path.join(root,'admin-workers.js'),'utf8');
const workbench=fs.readFileSync(path.join(root,'stage-workbench.mjs'),'utf8');

test('botão Workers preserva o prefixo do túnel ngrok',()=>{
  for(const source of [routing,workers,workbench]){
    assert.match(source,/runtimeRouteV1/);
    assert.match(source,/embeddedPrefix/);
    assert.match(source,/ngrok/);
    assert.match(source,/\/8080/);
  }
  assert.match(components,/import \{ runtimeRouteV1 \} from "\.\/components\/shared\/routing\.mjs"/);
  assert.match(components,/runtimeRouteV1\("\/admin\/workers/);
  assert.match(workers,/querySelectorAll\('a\[href\^="\/admin"\]'\)/);
  assert.match(workbench,/querySelectorAll\('a\[href\^="\/admin"\]'\)/);
});
