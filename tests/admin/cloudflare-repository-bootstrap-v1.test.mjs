import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('admin bootstrap nao exige painel local nem PAT/repo no navegador', async () => {
  const [app, road, components, index] = await Promise.all([
    read('app.js'), read('app-road-integral-v10.mjs'), read('components.js'), read('index.html'),
  ]);
  for (const source of [app, road]) {
    assert.doesNotMatch(source, /Instalar o painel local/);
    assert.doesNotMatch(source, /id=\"pat\"/);
    assert.doesNotMatch(source, /Validar PAT/);
    assert.match(source, /repositorySource:'worker-env'/);
    assert.match(source, /workerManagedConfigV1/);
    assert.match(source, /purgeLegacyInstallCredentialsV1/);
    assert.doesNotMatch(source, /customElements\.define\('install-screen'/);
    assert.match(source, /customElements\.define\('cloudflare-bootstrap'/);
  }
  assert.doesNotMatch(index, /<install-screen/);
  assert.match(index, /<cloudflare-bootstrap hidden><\/cloudflare-bootstrap>/);
  assert.doesNotMatch(components, /name=\"githubRepo\"/);
  assert.doesNotMatch(components, /name=\"githubBranch\"/);
  assert.match(components, /Repo, branch e PAT .* lidos exclusivamente do ambiente do Cloudflare Worker/);
});

test('runtime publico do Worker expoe status do GitHub sem token', async () => {
  const [routes, githubStore, apiClient] = await Promise.all([
    read('worker/src/routes.js'), read('worker/src/github-store.js'), read('api-client.mjs'),
  ]);
  assert.match(routes, /github:getGitHubRuntime\(env\)/);
  assert.match(githubStore, /configured:Boolean\(env\.GITHUB_PAT&&env\.GITHUB_REPO\)/);
  const runtimeExport = githubStore.match(/export function getGitHubRuntime[\s\S]*?\n\}/)?.[0] || '';
  assert.match(runtimeExport, /repo:rt\.repo/);
  assert.match(runtimeExport, /branch:rt\.branch/);
  assert.doesNotMatch(runtimeExport, /token:/);
  assert.match(apiClient, /\^\\\/api\\\/runtime\$/);
});
