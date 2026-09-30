import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../../firebase.mjs',import.meta.url),'utf8');

test('RTDB forces WebSocket before database initialization',()=>{
  const force=source.indexOf('databaseSdk.forceWebSockets()');
  const get=source.indexOf('databaseSdk.getDatabase(app)');
  assert.ok(force>=0);
  assert.ok(get>force);
  assert.match(source,/typeof globalThis\.WebSocket===['"]function['"]/);
});

test('RTDB does not force iframe long polling',()=>{
  assert.doesNotMatch(source,/databaseSdk\.forceLongPolling\s*\(/);
});
