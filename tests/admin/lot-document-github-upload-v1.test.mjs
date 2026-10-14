import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.env.BELAVISTA_ROOT||process.cwd();
const read=file=>{
  const source=fs.readFileSync(path.join(root,file),'utf8');
  return file==='components.js'
    ? source+fs.readFileSync(path.join(root,'components/lots/lot-detail-events-v1.mjs'),'utf8')
    : source;
};

test('ficha de lote exige upload em vez de URL manual',()=>{
  const source=read('components.js');
  assert.match(source,/data-lot-document-form/);
  assert.match(source,/name="file" type="file"/);
  assert.match(source,/\/api\/lot-documents\/upload/);
  assert.doesNotMatch(source,/Arquivo ou URL<input name="url"/);
});

test('upload é encaminhado ao Worker e gravado em caminho GitHub por lote',()=>{
  assert.match(read('server.mjs'),/['"]\/api\/lot-documents['"]/);
  assert.match(read('worker/src/routes.js'),/\/api\/lot-documents\/upload/);
  const store=read('worker/src/lot-document-store.js');
  assert.match(store,/GITHUB_PAT/);
  assert.match(store,/data\/operational\/lots/);
  assert.match(store,/html_url/);
});
