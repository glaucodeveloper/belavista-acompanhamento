import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testRoot = mkdtempSync(join(tmpdir(), 'alianca-cash-fiscal-'));
process.env.BELAVISTA_DATA_ROOT = testRoot;
process.env.BELAVISTA_DB = join(testRoot, 'test.sqlite');
process.env.BELAVISTA_CASH_ATTACHMENTS_ROOT = join(testRoot, 'cash-attachments');
const { db, createCashFlowEntry } = await import('../../persistence.mjs');
after(() => {
  db.close();
  rmSync(testRoot, { recursive: true, force: true });
});

test('cash entry keeps fiscal document metadata pending by default', () => {
  const entry = createCashFlowEntry({
    kind: 'entrada', date: '2026-09-19', category: 'Sinal de lote',
    stage: 'Geral', description: 'Teste isolado', amountCents: 150000,
    fiscalDocumentType: 'recibo', fiscalDocumentNumber: 'REC-TESTE-01',
    fiscalIssuer: 'Emitente teste', fiscalIssueDate: '2026-09-19',
  });
  assert.equal(entry.kind, 'entrada');
  assert.equal(entry.fiscalStatus, 'pendente');
  assert.equal(entry.fiscalDocumentNumber, 'REC-TESTE-01');
});

test('cash entry cannot mark fiscal document checked without evidence', () => {
  assert.throws(() => createCashFlowEntry({
    kind: 'entrada', amountCents: 10000, fiscalStatus: 'conferido',
    fiscalDocumentType: 'nota_fiscal', fiscalDocumentNumber: 'NF-TESTE-02',
    fiscalIssuer: 'Emitente teste', fiscalIssueDate: '2026-09-19',
  }), /exige tipo, número, emitente, data e documento anexado/);
});
