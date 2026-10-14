import test from 'node:test';
import assert from 'node:assert/strict';
import {driveServerInitializationProgramV1,ServerInitializationProgramV1} from '../../bootstrap/server-initialization-program-v1.mjs';

test('development boot delegates clean-state seed to the persistence initializer',async()=>{
  const effects=[];
  const result=await driveServerInitializationProgramV1(ServerInitializationProgramV1.program({environment:'development'}),{
    'initialize-clean-development-database':()=>{effects.push('seed');return {status:'skipped',reason:'database-not-clean'};},
    'server-system-initialized':({seedResult})=>{assert.equal(seedResult.reason,'database-not-clean');effects.push('ready');}
  });
  assert.deepEqual(effects,['seed','ready']);
  assert.equal(result.status,'ready');
});

test('non-development boot never requests development seeds',async()=>{
  const effects=[];
  const result=await driveServerInitializationProgramV1(ServerInitializationProgramV1.program({environment:'production'}),{
    'initialize-clean-development-database':()=>{throw new Error('must not seed');},
    'server-system-initialized':({seedResult})=>effects.push(seedResult.reason)
  });
  assert.deepEqual(effects,['not-development']);
  assert.equal(result.seedResult.status,'skipped');
});
