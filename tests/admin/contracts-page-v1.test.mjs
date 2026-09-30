import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const components = fs.readFileSync(path.join(root, 'components.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('Contratos entra pela listagem padrão com recibos e valores', () => {
  assert.match(components, /CONTRACTS_TABLE_V1/);
  assert.match(components, /contracts-page-v2/);
  assert.match(components, /<h2>Recibos e valores<\/h2>/);
  assert.match(components, /data-contract-filter/);
  assert.match(components, /data-contract-export/);
});

test('Contratos oferece novo, editar e confirmar compra', () => {
  assert.match(components, /data-contract-new/);
  assert.match(components, /data-contract-edit/);
  assert.match(components, /data-contract-confirm/);
  assert.match(components, /contractStatusOverrides/);
  assert.match(components, /Compra confirmada/);
});

test('A entrada Propostas é compatível, mas o formulário não abre por padrão', () => {
  assert.match(components, /ViewLayer\.prototype\.proposals = function \(\) \{\s*return this\.contracts\(\);/);
  assert.match(components, /proposalFormOpen:\s*false,\s*contractEditing:\s*null/);
  assert.match(app, /'contracts'/);
  assert.match(css, /\.contracts-table-wrap-v2 table/);
});
