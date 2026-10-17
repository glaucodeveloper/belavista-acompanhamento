import test from 'node:test';
import assert from 'node:assert/strict';

test('local gateway validates GitHub PAT sessions at the configured Worker authority', async () => {
  const previousMode = process.env.BELAVISTA_AUTH_MODE;
  const previousBase = process.env.BELAVISTA_API_BASE;
  const previousFetch = globalThis.fetch;
  process.env.BELAVISTA_AUTH_MODE = 'github-pat';
  process.env.BELAVISTA_API_BASE = 'https://worker.example/';
  const actor = { uid: 'github:42', role: 'owner', githubLogin: 'repo-owner' };
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ actor }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { requestActor } = await import(`../../auth-service.mjs?remote-authority=${Date.now()}`);
    const token = `bvs_${'a'.repeat(64)}`;
    const result = await requestActor({ headers: { authorization: `Bearer ${token}` } });
    assert.equal(request.url, 'https://worker.example/api/auth/session');
    assert.equal(request.options.headers.authorization, `Bearer ${token}`);
    assert.equal(result.uid, actor.uid);
    assert.equal(result.role, actor.role);
    assert.equal(result.mode, 'github-pat');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousMode === undefined) delete process.env.BELAVISTA_AUTH_MODE;
    else process.env.BELAVISTA_AUTH_MODE = previousMode;
    if (previousBase === undefined) delete process.env.BELAVISTA_API_BASE;
    else process.env.BELAVISTA_API_BASE = previousBase;
  }
});

test('localhost proxies PAT session creation to the same Worker used by protected APIs', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../server.mjs', import.meta.url), 'utf8');
  assert.match(source, /proxiedApiPrefixes=\[[^\]]*['"]\/api\/auth\/session['"]/);
  assert.match(source, /if\(shouldProxyApi\(pathname\)\)return await proxyApi\(req,res,pathname\);\s*return await githubAuthApi\(req,res,pathname\);/);
});

test('PAT authorization depends on repository access, not GitHub profile enrollment', async () => {
  const { readFile } = await import('node:fs/promises');
  const [nodeStore, workerStore, nodeRoutes, workerRoutes] = await Promise.all([
    readFile(new URL('../../github-session-store.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../worker/src/github-session-store.js', import.meta.url), 'utf8'),
    readFile(new URL('../../server.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../../worker/src/routes.js', import.meta.url), 'utf8'),
  ]);
  for (const source of [nodeStore, workerStore]) {
    assert.match(source, /verifyRepositoryPat\(tokenValue/);
    assert.match(source, /role='owner'.*active=1/s);
    assert.doesNotMatch(source, /saveGithubUser|listGithubUsers|githubIdentityForLogin/);
  }
  assert.doesNotMatch(nodeRoutes, /\/api\/auth\/users/);
  assert.doesNotMatch(workerRoutes, /\/api\/auth\/users/);
});
