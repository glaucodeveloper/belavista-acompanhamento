import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dataRoot=mkdtempSync(join(tmpdir(),'alianca-instagram-test-'));
process.env.BELAVISTA_DATA_ROOT=dataRoot;
const persistence=await import('../../persistence.mjs?instagram-test=' + Date.now());

test.after(()=>rmSync(dataRoot,{recursive:true,force:true}));

test('configura a estação e transforma Direct em lead com histórico',()=>{
  const setup=persistence.saveDesktopSetup({ownerName:'Warley Teste',ownerEmail:'warley@example.com',enterpriseName:'Aliança Park',instagramHandle:'alianca.park',instagramConsent:true});
  assert.equal(setup.complete,true);
  assert.equal(persistence.getDesktopSetup().instagram.handle,'alianca.park');

  const first=persistence.ingestInstagramDirect({messageId:'ig-001',senderId:'instagram-ana',username:'ana',name:'Ana Cliente',threadId:'thread-1',body:'Quero consultar um lote.'});
  assert.equal(first.deduplicated,false);
  assert.equal(first.lead.name,'Ana Cliente');
  assert.equal(first.message.channel,'instagram-direct');

  const duplicate=persistence.ingestInstagramDirect({messageId:'ig-001',senderId:'instagram-ana',username:'ana',name:'Ana Cliente',threadId:'thread-1',body:'Quero consultar um lote.'});
  assert.equal(duplicate.deduplicated,true);
  assert.equal(duplicate.lead.id,first.lead.id);

  const report=persistence.getInstagramLeadReport(first.lead.id);
  assert.equal(report.summary.messageCount,1);
  assert.equal(report.summary.inboundCount,1);
  assert.equal(report.summary.requiresHumanApproval,true);
  assert.equal(persistence.listInstagramLeadReports().length,1);
});
