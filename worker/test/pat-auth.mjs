import assert from 'node:assert/strict';
import worker from '../src.js';

const original = globalThis.fetch;
const files = new Map();
const env = { GITHUB_PAT: 'server-only', GITHUB_DATA_REPOSITORY: 'example/data', LOGIN_LIMITER: { limit: async () => ({ success: true }) } };
let canWrite = true;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  if (url.pathname === '/user') return Response.json({ id: 123, login: 'example-user' });
  if (url.pathname === '/repos/example/data') return Response.json({ permissions: { push: canWrite } });
  if (url.pathname.endsWith('/contents/.atlas-auth-check')) return new Response(null, { status: 422 });
  if (url.pathname.includes('/contents/sessions/')) {
    if (init.method === 'PUT') {
      const body = JSON.parse(init.body);
      const value = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      files.set(url.pathname, value);
      return Response.json({ content: { sha: 'test-sha' } }, { status: 201 });
    }
    const value = files.get(url.pathname);
    return value ? Response.json({ sha: 'test-sha', content: Buffer.from(JSON.stringify(value)).toString('base64') }) : new Response(null, { status: 404 });
  }
  throw new Error(`Requisição inesperada: ${url.pathname}`);
};
try {
  const attempt = (pat, client) => worker.fetch(new Request('https://worker.test/api/pat-login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' }, body: JSON.stringify({ pat, client }) }), env);
  for (const client of ['desktop', 'mobile']) {
    const response = await attempt('example-pat-secret', client);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.user.role, client);
    const session = await worker.fetch(new Request('https://worker.test/api/session', { headers: { Authorization: `Bearer ${data.token}` } }), env);
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.username, 'example-user');
  }
  assert.ok([...files.values()].every(value => !JSON.stringify(value).includes('example-pat-secret')));
  canWrite = false;
  assert.equal((await attempt('read-only-token', 'desktop')).status, 403);
  console.log('PAT: autenticação simulada desktop/mobile, sessão e recusa sem escrita verificadas.');
} finally { globalThis.fetch = original; }
