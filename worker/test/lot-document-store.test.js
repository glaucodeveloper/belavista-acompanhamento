import test from 'node:test';
import assert from 'node:assert/strict';
import {saveLotDocument} from '../src/lot-document-store.js';

test('salva anexo de lote no caminho dedicado do GitHub',async()=>{
  const originalFetch=globalThis.fetch;
  let request;
  globalThis.fetch=async(url,init)=>{
    request={url,init};
    return new Response(JSON.stringify({content:{sha:'blob-sha',html_url:'https://github.com/acme/belavista/blob/main/data/operational/lots/Q-01/documents/file.pdf'},commit:{sha:'commit-sha'}}),{status:201,headers:{'content-type':'application/json'}});
  };
  try{
    const document=await saveLotDocument({GITHUB_PAT:'test-token',GITHUB_REPO:'acme/belavista',GITHUB_BRANCH:'main'},{lotKey:'Q 01',fileName:'contrato final.pdf',contentType:'application/pdf',dataUrl:`data:application/pdf;base64,${Buffer.from('Documento de teste com conteúdo suficiente para validar o envio ao repositório GitHub.').toString('base64')}`});
    assert.match(request.url,/repos\/acme\/belavista\/contents\/data\/operational\/lots\/Q-01\/documents\//);
    assert.equal(request.init.method,'PUT');
    assert.equal(document.url,'https://github.com/acme/belavista/blob/main/data/operational/lots/Q-01/documents/file.pdf');
    assert.match(document.path,/data\/operational\/lots\/Q-01\/documents\/LOT-DOC-/);
    assert.equal(document.commitSha,'commit-sha');
  }finally{globalThis.fetch=originalFetch;}
});
