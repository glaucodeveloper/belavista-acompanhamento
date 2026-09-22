import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCamofoxBaseUrl,createCamofoxSessionRequest,fallbackInstagramDraft} from '../../desktop/instagram-bridge.mjs';

test('aceita apenas Camofox em loopback',()=>{
  assert.equal(normalizeCamofoxBaseUrl('http://127.0.0.1:9377/api'),'http://127.0.0.1:9377');
  assert.equal(normalizeCamofoxBaseUrl('http://localhost:9377'),'http://localhost:9377');
  assert.throws(()=>normalizeCamofoxBaseUrl('https://remote.example.com'),/localhost/);
});
test('prepara sessão local do inbox sem credenciais',()=>{
  const session=createCamofoxSessionRequest({instagram:{handle:'@alianca.park'}});
  assert.equal(session.url,'https://www.instagram.com/direct/inbox/');
  assert.equal(session.sessionKey,'instagram-directs');
  assert.match(session.userId,/alianca-park/);
  assert.equal('password' in session,false);
});
test('o rascunho de fallback não promete reserva',()=>{
  const text=fallbackInstagramDraft({lead:{name:'Ana'},messages:[{direction:'inbound',body:'Tenho interesse'}]});
  assert.match(text,/Olá, Ana!/);
  assert.match(text,/disponibilidade/i);
  assert.doesNotMatch(text,/reserva confirmada/i);
});
