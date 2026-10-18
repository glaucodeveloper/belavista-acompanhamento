import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const fixture = new URL('../../data/sales/VEN-PARITY-001-ARQ-MUXDZFBV-0-IOK-contrato-no-23.pdf', import.meta.url);

async function availablePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function startLocalServer(port) {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: fileURLToPath(root),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', BELAVISTA_AUTH_MODE: 'local' },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Servidor encerrou antes de responder (${child.exitCode}).`);
    try { const response = await fetch(base + '/api/health'); if (response.ok) return child; } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error('Servidor local não iniciou.');
}

async function stopLocalServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]);
}

test('project archive CRUD, file and schema survive an independent server restart on the configured database', { timeout: 45000 }, async () => {
  const port = await availablePort(), base = `http://127.0.0.1:${port}`;
  let server = null, documentId = '', columnId = '';
  const request = async (path, method = 'GET', data) => {
    const response = await fetch(base + path, { method, ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) });
    const payload = await response.json();
    assert.ok(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(payload)}`);
    return payload;
  };
  try {
    server = await startLocalServer(port);
    const baseline = (await request('/api/project-documents')).documents.map(row => row.id).sort();
    const file = await readFile(fixture), title = `QA Arquivo ${Date.now()}`;
    columnId = (await request('/api/project-documents/columns', 'POST', { label: title })).column.id;
    const created = await request('/api/project-documents', 'POST', {
      title, category: 'Projeto e planta', code: 'QA', issuer: 'Teste de integração',
      properties: { [columnId]: 'Inicial' }, fileName: 'qa-documento.pdf',
      dataUrl: `data:application/pdf;base64,${file.toString('base64')}`,
    });
    documentId = created.document.id;
    assert.equal(created.document.fileSize, file.length);
    const changed = await request(`/api/project-documents/${encodeURIComponent(documentId)}`, 'PUT', {
      ...created.document, description: 'Releitura após reinício', properties: { [columnId]: 'Editado' },
    });
    assert.equal(changed.document.properties[columnId], 'Editado');
    await stopLocalServer(server);
    server = await startLocalServer(port);
    const reread = (await request('/api/project-documents')).documents.find(row => row.id === documentId);
    assert.equal(reread.description, 'Releitura após reinício');
    assert.equal(reread.properties[columnId], 'Editado');
    const downloaded = await fetch(`${base}/api/project-documents/${encodeURIComponent(documentId)}/file`);
    assert.equal(downloaded.status, 200);
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), file);
    await request(`/api/project-documents/${encodeURIComponent(documentId)}`, 'DELETE');documentId = '';
    await request(`/api/project-documents/columns/${encodeURIComponent(columnId)}`, 'DELETE');columnId = '';
    assert.deepEqual((await request('/api/project-documents')).documents.map(row => row.id).sort(), baseline);
  } finally {
    if (server && server.exitCode !== null) server = await startLocalServer(port).catch(() => null);
    if (server) {
      if (documentId) await request(`/api/project-documents/${encodeURIComponent(documentId)}`, 'DELETE').catch(() => {});
      if (columnId) await request(`/api/project-documents/columns/${encodeURIComponent(columnId)}`, 'DELETE').catch(() => {});
      await stopLocalServer(server);
    }
  }
});
