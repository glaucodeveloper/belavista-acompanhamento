import test from 'node:test';
import assert from 'node:assert/strict';
import {requireAdminRequest} from '../src/firebase-auth.js';

test('Firebase bearer ID token is not truncated before accounts:lookup',async()=>{
  const token=`header.${'x'.repeat(920)}.signature`;
  const originalFetch=globalThis.fetch;
  let receivedToken='';

  globalThis.fetch=async(_url,options={})=>{
    const payload=JSON.parse(String(options.body||'{}'));
    receivedToken=payload.idToken||'';
    return new Response(JSON.stringify({
      users:[{localId:'uid-test',email:'developer@example.test'}]
    }),{
      status:200,
      headers:{'content-type':'application/json'}
    });
  };

  try{
    const request=new Request('https://worker.example.test/api/operational-loop',{
      headers:{authorization:`Bearer ${token}`}
    });
    const actor=await requireAdminRequest(request,{
      FIREBASE_WEB_API_KEY:'test-api-key',
      FIREBASE_ADMIN_EMAILS:''
    });

    assert.equal(receivedToken,token);
    assert.ok(receivedToken.length>500);
    assert.equal(actor.uid,'uid-test');
    assert.equal(actor.mode,'firebase');
  }finally{
    globalThis.fetch=originalFetch;
  }
});
