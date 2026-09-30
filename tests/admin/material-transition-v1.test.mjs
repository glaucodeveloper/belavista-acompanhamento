import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';

process.env.BELAVISTA_DB=':memory:';
const attachmentRoot=mkdtempSync(join(tmpdir(),'belavista-material-transition-'));
process.env.BELAVISTA_WORKBENCH_ATTACHMENTS_ROOT=attachmentRoot;
after(()=>{if(!resolve(attachmentRoot).startsWith(resolve(tmpdir())+sep))throw new Error('Diretório de teste inválido.');rmSync(attachmentRoot,{recursive:true,force:true});});
const {createMaterialTransition,createWorkbenchAttachment,listWorkbenchAttachments,getWorkbenchAttachmentFile,listRecords,listMaterials}=await import('../../persistence.mjs');
const {runOperationalLoop}=await import('../../operational-engine.mjs');

test('transição de material cria registro aditivo e recalcula cronograma',()=>{
  const result=createMaterialTransition({
    materialId:'material-transition-test',materialNumber:'MAT-001',name:'Caçambas',
    stageName:'Terraplanagem',unit:'viagem',
    before:{quantity:2,unit:'viagem',description:'Duas unidades previstas',status:'Planejado'},
    after:{quantity:3,description:'Terceira unidade incluída',status:'Atenção'},documents:[],
  });
  assert.equal(result.material.quantity,3);
  assert.equal(result.record.atividade,'Atualização de material: Caçambas');
  assert.equal(result.record.properties.find(item=>item.id==='before_quantity')?.value,'2');
  assert.equal(result.record.properties.find(item=>item.id==='after_quantity')?.value,'3');
  assert.ok(listRecords().some(item=>item.id===result.record.id));
  assert.equal(listMaterials().find(item=>item.id==='material-transition-test')?.plannedQuantity,3);
  const loop=runOperationalLoop({reason:'material.transition.created',role:'owner',publishNotifications:false});
  assert.ok(Array.isArray(loop.agenda));
  assert.ok(loop.agenda.length>0);
});

test('transição incompleta não altera os registros',()=>{
  const count=listRecords().length;
  assert.throws(()=>createMaterialTransition({materialId:'inválido',name:'Teste',stageName:'Terraplanagem',unit:'un',before:{quantity:1},after:{quantity:-1,description:''}}));
  assert.equal(listRecords().length,count);
});

test('comprovante mantém vínculo e arquivo recuperável',()=>{
  const attachment=createWorkbenchAttachment({stageKey:'earthwork',activityId:'material-proof-test',kind:'material-proof',title:'NF-001',notes:'Recebimento conferido',fileName:'nota.png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='});
  const result=createMaterialTransition({materialId:'material-proof-test',name:'Teste com prova',stageName:'Terraplanagem',unit:'un',before:{quantity:1,description:'Antes'},after:{quantity:2,description:'Depois',status:'Planejado'},documents:[attachment]});
  assert.equal(JSON.parse(result.record.properties.find(item=>item.id==='document_ids')?.value)[0],attachment.id);
  assert.equal(listWorkbenchAttachments('earthwork','material-proof-test')[0].id,attachment.id);
  assert.ok(getWorkbenchAttachmentFile(attachment.id)?.storagePath);
});
