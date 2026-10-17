import test from 'node:test';
import assert from 'node:assert/strict';
import {apiBase,aiBase,apiUrl} from '../../api-client.mjs';

test('servidor local prevalece sobre configurações antigas do Worker',()=>{
  const previousLocation=globalThis.location;
  const previousStorage=globalThis.localStorage;
  const previousApi=globalThis.BELAVISTA_API_BASE;
  const previousAi=globalThis.BELAVISTA_AI_BASE;
  const previousNative=globalThis.BELAVISTA_CAPACITOR_NATIVE;
  try{
    globalThis.location={hostname:'localhost',pathname:'/',origin:'http://localhost:8080'};
    globalThis.localStorage={getItem:()=>JSON.stringify({apiBase:'https://worker.example',aiBase:'https://worker.example'})};
    globalThis.BELAVISTA_API_BASE='https://worker.example';
    globalThis.BELAVISTA_AI_BASE='https://worker.example';
    globalThis.BELAVISTA_CAPACITOR_NATIVE=false;
    assert.equal(apiBase(),'');
    assert.equal(aiBase(),'');
    assert.equal(apiUrl('/api/auth/session'),'/api/auth/session');
    assert.equal(apiUrl('/api/agenda-events'),'/api/agenda-events');
    assert.equal(apiUrl('/api/records'),'/api/records');
    assert.equal(apiUrl('/api/ai'),'/api/ai');
    globalThis.BELAVISTA_CAPACITOR_NATIVE=true;
    assert.equal(apiUrl('/api/auth/session'),'https://worker.example/api/auth/session');
    assert.equal(apiUrl('/api/agenda-events'),'https://worker.example/api/agenda-events');
  }finally{
    globalThis.location=previousLocation;
    globalThis.localStorage=previousStorage;
    globalThis.BELAVISTA_API_BASE=previousApi;
    globalThis.BELAVISTA_AI_BASE=previousAi;
    globalThis.BELAVISTA_CAPACITOR_NATIVE=previousNative;
  }
});

test('401 em API protegida solicita novo PAT sem confundir falha de serviço IA',async()=>{
  const previousFetch=globalThis.fetch;
  const previousLocation=globalThis.location;
  const previousToken=globalThis.BELAVISTA_GET_ID_TOKEN;
  const previousInvalidate=globalThis.BELAVISTA_ADMIN_AUTH_INVALIDATE;
  let invalidations=0;
  globalThis.location={hostname:'localhost',pathname:'/',origin:'http://localhost:8080'};
  globalThis.fetch=async()=>new Response('{}',{status:401});
  globalThis.BELAVISTA_GET_ID_TOKEN=async()=>'bvs_test_session';
  globalThis.BELAVISTA_ADMIN_AUTH_INVALIDATE=()=>{invalidations+=1;};
  try{
    const {apiFetch}=await import(`../../api-client.mjs?auth-invalidate-test=${Date.now()}`);
    assert.equal((await apiFetch('/api/stages-admin')).status,401);
    assert.equal(invalidations,1);
    await apiFetch('/api/ai/status');
    await apiFetch('/api/auth/session');
    assert.equal(invalidations,1);
  }finally{
    globalThis.fetch=previousFetch;
    globalThis.location=previousLocation;
    globalThis.BELAVISTA_GET_ID_TOKEN=previousToken;
    globalThis.BELAVISTA_ADMIN_AUTH_INVALIDATE=previousInvalidate;
  }
});
