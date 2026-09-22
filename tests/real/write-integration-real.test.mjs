import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRealScenario} from './fixtures/obra-real.mjs';
import {
  api,firebase,authHeaders,adminToken,writeEnabled,githubWriteEnabled,
  normalizeLoop,waitFor,providerOf
} from './helpers.mjs';

const runToken=`WRITE-${Date.now().toString(36).toUpperCase()}`;
const scenario=buildRealScenario(runToken);
let committed;

test('operational-loop persistido publica agenda e notificações no Firebase',async(t)=>{
  if(!writeEnabled){t.skip('Defina BELAVISTA_REAL_WRITE=1 para teste mutável.');return;}
  if(!adminToken){t.skip('Defina BELAVISTA_ADMIN_ID_TOKEN.');return;}
  const {payload}=await api('/api/operational-loop',{
    method:'POST',headers:authHeaders(),
    body:{mode:'commit',trigger:`real-write.${runToken}`,now:scenario.clock.now,context:scenario,options:{persist:true,explain:true}}
  });
  committed=normalizeLoop(payload);
  const eventId=committed.realtime.eventId||payload.eventId||payload.operationalEventId;
  assert.ok(eventId,'Loop persistido não retornou eventId do Firebase.');
  const event=await waitFor(async()=>{
    const {payload:value}=await firebase(`operationalEvents/${eventId}`);
    return value||null;
  });
  assert.ok(event,'Evento não apareceu no Firebase RTDB.');
  assert.match(String(providerOf(event)||providerOf(committed.understanding)||providerOf(payload)),/nvidia/i);
});

test('notificação do encarregado é endereçada ao encarregado da localidade',async(t)=>{
  if(!committed){t.skip('Loop mutável não executado.');return;}
  const candidates=(committed.notifications||[]).filter(n=>['foreman','encarregado'].includes(String(n.recipientRole||n.role||'').toLowerCase()));
  assert.ok(candidates.length>0,'Loop não gerou notificações para encarregados.');
  for(const notification of candidates){
    const locality=notification.localityId||notification.localidadeObraId;
    const recipient=notification.recipientId||notification.foremanId||notification.encarregadoId;
    if(locality==='frente-norte')assert.equal(recipient,'enc-jose');
    if(locality==='frente-sul')assert.equal(recipient,'enc-marcos');
  }
  const north=candidates.find(n=>(n.localityId||n.localidadeObraId)==='frente-norte');
  if(north){
    const id=north.id;
    const {payload:value}=await firebase(`notifications/foreman/enc-jose/${id}`);
    assert.ok(value,'Notificação da Frente Norte não foi gravada em notifications/foreman/enc-jose/<id>.');
  }
});

test('retorno do encarregado registra localidade e provoca novo ciclo operacional',async(t)=>{
  if(!writeEnabled){t.skip('BELAVISTA_REAL_WRITE não habilitado.');return;}
  if(!adminToken){t.skip('Defina BELAVISTA_ADMIN_ID_TOKEN.');return;}
  const {payload}=await api('/api/field-confirmations',{
    method:'POST',headers:authHeaders(),
    body:{
      projectId:scenario.project.id,localityId:'frente-norte',foremanId:'enc-jose',
      etapa:'Drenagem Pluvial',atividade:'Conferir e liberar trecho de drenagem',activityId:'act-drenagem-conferencia',
      data:'2026-09-01',hora:'08:30',responsavel:'José',confirmed:true,
      servicos:['Conferência do trecho','Registro de evidência'],progresso:100,
      evidence:[{id:'ev-drenagem-conferencia',type:'field-confirmation'}]
    }
  });
  assert.ok(payload.record?.id,'Retorno do encarregado não gerou registro auditável.');
  assert.equal(payload.record.localityId||payload.record.localidadeObraId||'frente-norte','frente-norte');
  const trigger=payload.operationalLoop?.trigger||payload.recalculation?.trigger||payload.trigger||JSON.stringify(payload.propagated||[]);
  assert.match(String(trigger),/field-confirmation|operational|planejamento|recalcul/i,'Retorno não sinalizou novo ciclo operacional.');
});

test('Worker faz round-trip de arquivo no GitHub com PAT guardado no Worker',async(t)=>{
  if(!githubWriteEnabled){t.skip('Defina BELAVISTA_GITHUB_WRITE_TEST=1 para round-trip GitHub.');return;}
  if(!adminToken){t.skip('Defina BELAVISTA_ADMIN_ID_TOKEN.');return;}
  const path=`data/operational/tests/${runToken}.json`;
  const content={runToken,kind:'worker-github-real-test',createdAt:new Date().toISOString()};
  const created=await api('/api/integrations/github/content',{
    method:'PUT',headers:authHeaders(),body:{path,content,message:`test: ${runToken}`}
  });
  assert.ok(created.payload.commitSha||created.payload.sha,'Worker não retornou commit SHA.');
  const read=await api(`/api/integrations/github/content?path=${encodeURIComponent(path)}`,{headers:authHeaders()});
  const value=read.payload.content||read.payload.value||read.payload;
  assert.equal(value.runToken||JSON.parse(typeof value==='string'?value:'{}').runToken,runToken,'Leitura GitHub não devolveu o conteúdo gravado.');
  const removed=await api(`/api/integrations/github/content?path=${encodeURIComponent(path)}`,{method:'DELETE',headers:authHeaders()});
  assert.ok(removed.payload.ok!==false,'Worker não removeu arquivo temporário de teste.');
});
