import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = fs.readFileSync(path.join(root, 'tests/visual/system-flow-suite.html'), 'utf8');

test('suíte visual contém a bateria de ponta a ponta', () => {
  assert.match(html, /data-activity-catalog/);
  assert.match(html, /activityCatalog=\[/);
});

test('suíte visual permite marcar, persistir e exportar evidências', () => {
  assert.match(html, /localStorage/);
  assert.match(html, /visual-flow-suite/);
  assert.match(html, /Exportar evidências/);
  assert.match(html, /visual-flow-suite-evidence\.json/);
});

test('suíte visual deixa integrações reais condicionadas a credenciais', () => {
  assert.match(html, /correlationId/);
  assert.match(html, /monitoria de logs|Monitoria de logs/i);
  for (const activity of ['Revisar projeto executivo','Executar corte e aterro','Executar rede de drenagem','Executar base e pavimento','Implantar rede de água','Implantar rede elétrica','Executar fundação e estrutura','Executar praça e paisagismo','Solicitar e receber material','Realizar inspeção ou ensaio','Realizar DDS e inspeção de segurança','Registrar medição e pagamento','Emitir relatório de etapa']) {
    assert.match(html, new RegExp(activity));
  }
});

test('layout técnico mantém cada atividade em grade sem colisão de conteúdo', () => {
  assert.match(html, /grid-template-areas:/);
  assert.match(html, /\.activity-data/);
  assert.match(html, /data-log-query/);
  assert.match(html, /@media\(max-width:1250px\)/);
  assert.match(html, /@media\(max-width:700px\)/);
});

test('monitoria estrutura cada atividade por ações, dados e impactos', () => {
  assert.match(html, /data-activity-audit/);
  assert.match(html, /data-audit-step/);
  assert.match(html, /data-action-total/);
  assert.match(html, /Ações na interface/);
  assert.match(html, /Dados que mexe/);
  assert.match(html, /Impactos que agem/);
  assert.match(html, /PREENCHER/);
  assert.match(html, /CLIQUE/);
});
