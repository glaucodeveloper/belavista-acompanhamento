import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));

async function freePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

test('backend local retorna recordOcr e envia descrição + OCR + etapa candidata ao modelo', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'belavista-record-stage-'));
  const appPort = await freePort();
  const modelPort = await freePort();
  const modelRequests = [];
  const modelServer = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    modelRequests.push(body);
    const ocrCall = JSON.stringify(body.messages).includes('extrator OCR multimodal');
    const content = ocrCall
      ? JSON.stringify({ documentType: 'purchase_invoice', confidence: 0.97, invoiceNumber: '18452', items: [{ itemKind: 'material', description: 'Tubo PEAD', quantity: 120, unit: 'm', stageKey: 'earthwork', stageName: 'Terraplanagem' }], dynamicFields: [] })
      : JSON.stringify({ reply: 'Nota interpretada para revisão.', toolCalls: [] });
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
  modelServer.listen(modelPort, '127.0.0.1');
  await once(modelServer, 'listening');

  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: root,
    stdio: 'ignore',
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      HOST: '127.0.0.1',
      PORT: String(appPort),
      BELAVISTA_DATA_ROOT: temp,
      BELAVISTA_DB: join(temp, 'local-test.sqlite'),
      AI_PROVIDER: 'nvidia',
      NVIDIA_API_KEY: 'test-api-key',
      NVIDIA_API_URL: `http://127.0.0.1:${modelPort}/v1/chat/completions`,
      NVIDIA_REASONING_API_URL: `http://127.0.0.1:${modelPort}/v1/chat/completions`,
      NVIDIA_RECORD_OCR_API_URL: `http://127.0.0.1:${modelPort}/v1/chat/completions`,
      NVIDIA_RECORD_OCR_MODELS: 'test-ocr-model',
      NVIDIA_RECORD_OCR_RETRIES: '0',
      NVIDIA_TIMEOUT_MS: '5000',
      NVIDIA_RECORD_OCR_TIMEOUT_MS: '5000'
    }
  });
  t.after(async () => {
    child.kill();
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 1500).unref();
    });
    await new Promise(resolve => modelServer.close(() => resolve()));
    await rm(temp, { recursive: true, force: true });
  });

  const base = `http://127.0.0.1:${appPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 80 && !ready; attempt++) {
    try {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(500) });
      ready = response.ok;
    } catch {}
    if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'servidor local não ficou pronto no tempo limite');

  const stages = [
    { key: 'earthwork', name: 'Terraplanagem' },
    { key: 'water', name: 'Rede de Água' }
  ];
  const response = await fetch(`${base}/api/ai/vision-reasoning`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: 'Leia a nota e aloque na Rede de Água.',
      view: 'workers',
      context: { stages, selectedStageKey: 'earthwork', selectedStageName: 'Terraplanagem' },
      attachment: { name: 'nf-18452.png', mimeType: 'image/png', dataUrl: `data:image/png;base64,${'A'.repeat(128)}` }
    }),
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(modelRequests.length, 2, 'esperava primeiro a extração OCR e depois a interpretação operacional');
  assert.match(JSON.stringify(modelRequests[0].messages), /userDescription/);
  assert.match(JSON.stringify(modelRequests[0].messages), /Rede de Água/);
  assert.match(JSON.stringify(modelRequests[1].messages), /INTERPRETAÇÃO DE ANEXO \(OCR \+ DESCRIÇÃO\)/);
  assert.match(JSON.stringify(modelRequests[1].messages), /Tubo PEAD/);
  assert.match(JSON.stringify(modelRequests[1].messages), /navigation-context-only/);
  assert.equal(payload.recordOcr.items[0].description, 'Tubo PEAD');
  assert.equal(payload.recordOcr.items[0].stageName, 'Terraplanagem');
});
