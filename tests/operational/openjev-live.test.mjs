import test from 'node:test';
import assert from 'node:assert/strict';
import {OpenJevClient} from '../../desktop/system-model/openjev-client.mjs';
const LIVE=process.env.BELAVISTA_OPENJEV_LIVE==='1';
test('OpenJEV MiniCPM5 local responde /health e /v1/systemone',async t=>{
  if(!LIVE){t.skip('Defina BELAVISTA_OPENJEV_LIVE=1');return;}
  const client=new OpenJevClient(); const health=await client.health(); assert.equal(health.ready,true);
  const response=await client.decide({state:{activity:{id:'act-test',status:'planned'},blockers:[]},questions:{readiness:{type:'choice',instructions:'A atividade sem blockers pode ser considerada pronta para avaliação operacional?',criteria:{ready:'Pode prosseguir para avaliação',blocked:'Deve permanecer bloqueada'}}}});
  assert.ok(response.answers?.readiness);
  console.log('[LIVE OpenJEV]',JSON.stringify({model:response.model,answer:response.answers.readiness,elapsedMs:response.elapsedMs,usage:response.usage},null,2));
});
