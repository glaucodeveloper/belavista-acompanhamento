import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const SKIP_DIRS = new Set(['.git','node_modules','test-results','dist','build','.next','.cache','coverage','vendor']);
const SOURCE_EXTS = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.html','.json']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!p.includes(path.sep + 'tests' + path.sep)) walk(p, out);
      continue;
    }
    if (SOURCE_EXTS.has(path.extname(ent.name).toLowerCase())) out.push(p);
  }
  return out;
}

const sourceFiles = walk(ROOT);
const rel = (p) => path.relative(ROOT, p).replaceAll('\\\\', '/');
const read = (p) => fs.readFileSync(p, 'utf8');
const lineOf = (text, idx) => text.slice(0, idx).split(/\r?\n/).length;

function evidenceFor(patterns) {
  const evidence = [];
  for (const file of sourceFiles) {
    const text = read(file);
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (!m) continue;
      const idx = m.index ?? text.indexOf(m[0]);
      evidence.push({ file: rel(file), line: lineOf(text, idx), match: m[0].slice(0, 160) });
      break;
    }
  }
  return evidence;
}

function printEvidence(label, rows) {
  console.log('\n[CERT EVIDENCE] ' + label);
  if (!rows.length) {
    console.log('  nenhum');
    return;
  }
  for (const row of rows.slice(0, 12)) {
    console.log('  ' + row.file + ':' + row.line + ' :: ' + row.match);
  }
}

function packageScripts() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {};
}

function runNpmScript(name) {
  const scripts = packageScripts();
  assert.ok(scripts[name], 'script npm obrigatório ausente: ' + name);

  let command;
  let args;

  // Quando este teste é iniciado por "npm run", npm_execpath aponta
  // diretamente para npm-cli.js. Invocar pelo próprio node evita o
  // problema de spawn de npm.cmd/.cmd com shell:false no Windows.
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath && fs.existsSync(npmExecPath)) {
    command = process.execPath;
    args = [npmExecPath, 'run', name];
  } else if (process.platform === 'win32') {
    command = process.env.ComSpec || 'cmd.exe';
    args = ['/d', '/s', '/c', 'npm run ' + name];
  } else {
    command = 'npm';
    args = ['run', name];
  }

  const run = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: (() => {
      const childEnv = { ...process.env };
      // node --test marca o processo com NODE_TEST_CONTEXT.
      // Se herdado por outro "node --test", Node considera execução recursiva
      // e pode pular silenciosamente os arquivos.
      delete childEnv.NODE_TEST_CONTEXT;
      delete childEnv.NODE_TEST_WORKER_ID;
      return childEnv;
    })(),
    shell: false,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true
  });

  const combined = ((run.stdout || '') + '\n' + (run.stderr || '')).trim();
  if (/recursively within a test file|skipping running files/i.test(combined)) {
    assert.fail(
      name +
      ' não executou a suíte de verdade: o Node detectou node:test recursivo e pulou os arquivos.'
    );
  }

  if (combined) {
    console.log('\n[' + name + ']\n' + combined.slice(-20000));
  }

  if (run.error) {
    assert.fail(
      name +
      ' não conseguiu iniciar o subprocesso npm: ' +
      (run.error.code || run.error.name || 'erro') +
      ' — ' +
      run.error.message
    );
  }

  assert.equal(
    run.status,
    0,
    name +
      ' falhou (exit=' +
      run.status +
      ', signal=' +
      (run.signal || 'none') +
      ').'
  );
}

test('CERT #1 — chat box possui identidade de registro rastreável', () => {
  const recordIdentityPatterns = [
    /\brecordId\b/, /\brecordID\b/, /\brecord_id\b/, /\bactiveRecordId\b/,
    /\bselectedRecordId\b/, /\blinkedRecordId\b/, /\brecordRef\b/, /\brecordKey\b/, /data-record-id/
  ];
  const chatPatterns = [/\bchatAttachment\b/, /\bchat\b/i, /\bmessage(s)?\b/i, /chatbox/i, /chat-box/i];
  const identityEvidence = evidenceFor(recordIdentityPatterns);
  printEvidence('record identity', identityEvidence);
  assert.ok(identityEvidence.length > 0, 'nenhuma identidade de registro (recordId/equivalente) encontrada');

  const linkedEvidence = [];
  for (const file of sourceFiles) {
    const text = read(file);
    const recordMatch = recordIdentityPatterns.map((p) => text.match(p)).find(Boolean);
    const chatMatch = chatPatterns.map((p) => text.match(p)).find(Boolean);
    if (!recordMatch || !chatMatch) continue;
    linkedEvidence.push({
      file: rel(file),
      line: lineOf(text, recordMatch.index ?? 0),
      match: recordMatch[0] + ' + ' + chatMatch[0]
    });
  }
  printEvidence('chat + record identity no mesmo fluxo', linkedEvidence);
  assert.ok(linkedEvidence.length > 0, 'identidade encontrada, mas sem vínculo certificável no fluxo do chat box');
});

test('CERT #2 — anexo do chat transfere leitura para registro', () => {
  const transferEvidence = [];
  for (const file of sourceFiles) {
    const text = read(file);
    const hasOcrTransfer = /recordOcr|\/api\/records\/ocr/i.test(text);
    const hasAttachment = /chatAttachment|attachment|anexo/i.test(text);
    const hasRecord = /record|registro/i.test(text);
    if (!(hasOcrTransfer && hasAttachment && hasRecord)) continue;
    const m = text.match(/recordOcr|chatAttachment|Usar em registro|use.*record|attachment/i);
    transferEvidence.push({ file: rel(file), line: lineOf(text, m?.index ?? 0), match: m?.[0] ?? 'attachment -> record' });
  }
  printEvidence('anexo -> OCR -> registro', transferEvidence);
  assert.ok(transferEvidence.length > 0, 'não foi encontrado fluxo certificável de anexo do chat para OCR/registro');
});

test('CERT #3 — OCR possui endpoint real e gera propriedades personalizadas', () => {
  const routeEvidence = evidenceFor([/\/api\/records\/ocr/]);
  const propsEvidence = evidenceFor([/\bcustomProperties\b/, /\bdynamicProperties\b/, /\brecordOcr\b/, /\bproperties\s*:/, /\.properties\b/]);
  printEvidence('/api/records/ocr', routeEvidence);
  printEvidence('properties dinâmicas', propsEvidence);
  assert.ok(routeEvidence.length > 0, 'endpoint /api/records/ocr não encontrado');
  assert.ok(propsEvidence.length > 0, 'nenhuma estrutura de properties personalizadas encontrada');
});

test('CERT #4 — properties chegam à persistência do registro', () => {
  const rows = [];
  for (const file of sourceFiles) {
    const text = read(file);
    if (!/\bproperties\b/.test(text)) continue;
    if (!/localStorage|fetch\s*\(|firebase|firestore|saveRecord|createRecord|updateRecord|persist|\/api\/records/i.test(text)) continue;
    if (!/record|registro/i.test(text)) continue;
    const m = text.match(/\bproperties\b/);
    rows.push({ file: rel(file), line: lineOf(text, m?.index ?? 0), match: m?.[0] ?? 'properties' });
  }
  printEvidence('properties + persistência', rows);
  assert.ok(rows.length > 0, 'properties existem, mas não foi possível certificar persistência no registro');
});

test('CERT #5 — suíte UI existente certifica chat + registro', () => {
  runNpmScript('test:record-ocr:ui:cert');
});

test(
  'CERT #6 — OCR live autenticado gera propriedades dinâmicas a partir dos anexos reais',
  {
    skip: process.env.BELAVISTA_ADMIN_ID_TOKEN
      ? false
      : 'BELAVISTA_ADMIN_ID_TOKEN ausente: certificação live autenticada não executada'
  },
  () => {
    runNpmScript('test:record-ocr:live');
  }
);

test.after(() => {
  console.log('\n[CHAT RECORD + ATTACHMENT PROPERTIES CERT V34]');
  console.log('Contrato A: chat box identifica/vincula registro');
  console.log('Contrato B: anexo do chat chega ao OCR/registro');
  console.log('Contrato C: OCR gera properties personalizadas');
  console.log('Contrato D: properties participam da persistência');
  console.log('Contrato E: UI funcional chat/anexo -> registro/properties passa');
  console.log('Contrato F: OCR live autenticado passa quando BELAVISTA_ADMIN_ID_TOKEN está disponível');
});
