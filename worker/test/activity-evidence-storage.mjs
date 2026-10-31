import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../src.js';

const originalFetch = globalThis.fetch;
const token = 'a'.repeat(64);
const userKey = 'user-key-e2e';
const userId = 'private-evidence-user';
const evidenceId = 'f719a2fb-819c-4ab2-919e-81c763286500';
const imageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhVQAAAAASUVORK5CYII=';
const sessionHash = createHash('sha256').update(token).digest('hex');
const ownerHash = createHash('sha256').update(userId).digest('hex').slice(0, 32);
const requests = [];

function githubFile(value, sha = 'test-sha') {
  return new Response(JSON.stringify({ content: Buffer.from(JSON.stringify(value)).toString('base64'), sha }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  requests.push({ url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
  if (url.pathname.endsWith(`/sessions/${sessionHash}.json`))
    return githubFile({ userKey, expiresAt: Date.now() + 60_000 });
  if (url.pathname.endsWith(`/users/${userKey}.json`))
    return githubFile({ id: userId, username: 'Mobile test', role: 'mobile' });
  if (url.pathname.endsWith(`/field-evidence/${ownerHash}/${evidenceId}.png`)) {
    if (init.method === 'PUT') return new Response(JSON.stringify({ content: { sha: 'saved-image-sha' } }), { status: 201 });
    return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
  }
  throw new Error(`Chamada GitHub não prevista no teste: ${url.pathname}`);
};

try {
  const unauthenticated = await worker.fetch(new Request('https://worker.test/api/activity-evidence', { method: 'POST' }), {
    GITHUB_PAT: 'test-token', GITHUB_DATA_REPOSITORY: 'test/private-data',
  });
  assert.equal(unauthenticated.status, 401, 'A rota deve exigir sessão autenticada.');

  const response = await worker.fetch(new Request('https://worker.test/api/activity-evidence', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidenceId, filename: 'foto de serviço.png', image: { mimeType: 'image/png', data: imageData } }),
  }), { GITHUB_PAT: 'test-token', GITHUB_DATA_REPOSITORY: 'test/private-data' });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.repositoryPath, `field-evidence/${ownerHash}/${evidenceId}.png`);
  assert.equal(result.filename, 'foto de serviço.png');
  assert.equal(result.size, Buffer.from(imageData, 'base64').length);
  const write = requests.find(request => request.method === 'PUT');
  assert.ok(write, 'O Worker deve gravar o arquivo usando a API Contents do GitHub.');
  assert.equal(write.body.content, imageData, 'O conteúdo binário deve permanecer íntegro.');
  assert.equal(write.url.hostname, 'api.github.com');
  console.log('PASS rota de evidência: autenticação, binário intacto, caminho privado por usuário e gravação no GitHub.');
} finally {
  globalThis.fetch = originalFetch;
}
