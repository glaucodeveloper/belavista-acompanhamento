import test from 'node:test';
import assert from 'node:assert/strict';
import {bearerToken,requireAdminRequest} from '../src/request-auth.js';

test('a chave GitHub nunca é aceita como sessão operacional',async()=>{
  const request=new Request('https://worker.example.test/api/records',{
    headers:{authorization:`Bearer github_pat_${'x'.repeat(80)}`}
  });
  assert.ok(bearerToken(request).startsWith('github_pat_'));
  await assert.rejects(requireAdminRequest(request,{}),error=>error.statusCode===401);
});

test('a API protegida rejeita requisição sem sessão',async()=>{
  const request=new Request('https://worker.example.test/api/agenda-events');
  await assert.rejects(requireAdminRequest(request,{}),error=>error.statusCode===401);
});
