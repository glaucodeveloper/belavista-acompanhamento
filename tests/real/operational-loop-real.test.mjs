import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRealScenario} from './fixtures/obra-real.mjs';
import {
  api,authHeaders,adminToken,normalizeLoop,findByActivity,allByActivity,
  localityId,foremanId,assigneeIds,reasonText,assertNoOverlap,providerOf
} from './helpers.mjs';

const runToken=`REAL-${Date.now().toString(36).toUpperCase()}`;
const scenario=buildRealScenario(runToken);
let loop;

test('operational-loop real aceita contexto consolidado e usa NVIDIA',async(t)=>{
  if(!adminToken){t.skip('Defina BELAVISTA_ADMIN_ID_TOKEN.');return;}
  const {payload}=await api('/api/operational-loop',{
    method:'POST',headers:authHeaders(),
    body:{mode:'dry-run',trigger:`real-test.${runToken}`,now:scenario.clock.now,context:scenario,options:{persist:false,explain:true}}
  });
  loop=normalizeLoop(payload);
  assert.ok(loop.schedule.length+loop.blocked.length>=scenario.activities.length-1,'Loop não avaliou as atividades do cenário.');
  assert.match(String(providerOf(loop.understanding)||providerOf(payload)),/nvidia/i,'A compreensão não comprova NVIDIA.');
});

test('encarregado é restrito à localidade da obra',async(t)=>{
  if(!loop){t.skip('Loop anterior não executado.');return;}
  for(const item of loop.schedule){
    const loc=localityId(item);
    const ids=new Set([...assigneeIds(item),foremanId(item)].filter(Boolean));
    if(loc==='frente-norte')assert.equal(ids.has('enc-marcos'),false,'Marcos (Frente Sul) foi alocado na Frente Norte.');
    if(loc==='frente-sul')assert.equal(ids.has('enc-jose'),false,'José (Frente Norte) foi alocado na Frente Sul.');
  }
  const drenagem=findByActivity(loop.schedule,'act-drenagem-conferencia');
  assert.ok(drenagem,'Drenagem pronta não entrou no cronograma.');
  assert.equal(localityId(drenagem),'frente-norte');
  assert.ok(new Set([...assigneeIds(drenagem),foremanId(drenagem)]).has('enc-jose'),'Drenagem da Frente Norte não foi atribuída a José.');
  const eletrica=findByActivity(loop.schedule,'act-eletrica-postes-sul');
  assert.ok(eletrica,'Instalação dos postes disponíveis deveria ser executável.');
  assert.equal(localityId(eletrica),'frente-sul');
  assert.ok(new Set([...assigneeIds(eletrica),foremanId(eletrica)]).has('enc-marcos'),'Elétrica da Frente Sul não foi atribuída a Marcos.');
});

test('cronograma não é decidido por prioridade numérica',async(t)=>{
  if(!loop){t.skip('Loop anterior não executado.');return;}
  const paving=findByActivity(loop.schedule,'act-pavimentar-norte');
  assert.equal(Boolean(paving),false,'Pavimentação entrou no cronograma apesar da água do setor não estar concluída; prioridade numérica não pode furar quesito.');
  const blocked=findByActivity(loop.blocked,'act-pavimentar-norte');
  assert.ok(blocked,'Pavimentação deveria aparecer explicitamente bloqueada.');
  assert.match(reasonText(blocked),/água|agua|rede|setor|gate|quesito|depend/i,'Bloqueio da pavimentação não explica a porta de liberação da rede de água.');
  assert.ok(findByActivity(loop.schedule,'act-agua-setor-norte'),'Rede de água, mesmo com prioridade=1, deveria ser encaixada por estar executável.');
});

test('peculiaridade de drenagem impede fechamento sem conferência/evidência',async(t)=>{
  if(!loop){t.skip('Loop anterior não executado.');return;}
  assert.equal(Boolean(findByActivity(loop.schedule,'act-drenagem-fechamento')),false,'Fechamento de drenagem não pode ocorrer antes da conferência/evidência.');
  const blocked=findByActivity(loop.blocked,'act-drenagem-fechamento');
  assert.ok(blocked,'Fechamento de drenagem deveria estar bloqueado.');
  assert.match(reasonText(blocked),/confer|evid|depend|predecess/i);
});

test('rede elétrica pode avançar nos postes sem exigir compra integral dos cabos',async(t)=>{
  if(!loop){t.skip('Loop anterior não executado.');return;}
  const item=findByActivity(loop.schedule,'act-eletrica-postes-sul');
  assert.ok(item,'Postes disponíveis deveriam liberar atividade elétrica parcial.');
  assert.doesNotMatch(reasonText(item),/bloquead.*cabo|aguarda.*cabo/i);
});

test('falta de função compatível bloqueia praça, sem roubar encarregado de outra frente',async(t)=>{
  if(!loop){t.skip('Loop anterior não executado.');return;}
  assert.equal(Boolean(findByActivity(loop.schedule,'act-praca-sul')),false);
  const blocked=findByActivity(loop.blocked,'act-praca-sul');
  assert.ok(blocked,'Praça deveria estar bloqueada por ausência de paisagista.');
  assert.match(reasonText(blocked),/pessoal|paisag|função|funcao|recurso/i);
});

test('mesmo encarregado não recebe duas atividades simultâneas',async(t)=>{
  if(!loop){t.skip('Loop anterior não executado.');return;}
  assertNoOverlap(loop.schedule,'enc-jose');
  assertNoOverlap(loop.schedule,'enc-marcos');
});

test('cada atividade aparece uma única vez no encaixe ou bloqueio',async(t)=>{
  if(!loop){t.skip('Loop anterior não executado.');return;}
  for(const activity of scenario.activities){
    const count=allByActivity(loop.schedule,activity.id).length+allByActivity(loop.blocked,activity.id).length;
    assert.equal(count,1,`${activity.id} apareceu ${count} vezes; deve haver uma decisão operacional única.`);
  }
});
