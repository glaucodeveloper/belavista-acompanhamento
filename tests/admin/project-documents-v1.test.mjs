import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const components = fs.readFileSync(new URL('../../components.js', import.meta.url), 'utf8');
const lotRegistration = fs.readFileSync(new URL('../../components/lots/lot-project-workspaces-registration-v1.mjs', import.meta.url), 'utf8');
const documents = fs.readFileSync(new URL('../../components/lots/project-documents-page-v1.mjs', import.meta.url), 'utf8');
const materials = fs.readFileSync(new URL('../../components/records/materials-workspace-v1.mjs', import.meta.url), 'utf8');
const state = fs.readFileSync(new URL('../../state.js', import.meta.url), 'utf8');

test('Documentos é um acervo próprio do loteamento acessado pelos vínculos existentes', () => {
  assert.match(components, /installLotProjectWorkspacesRegistrationV1\(\{/);
  assert.match(lotRegistration, /installProjectDocumentsPageV1\(ViewLayer/);
  assert.match(documents, /ViewLayer\.prototype\.documents = function \(\)/);
  assert.match(documents, /Documentos do loteamento/);
  assert.match(documents, /Anexos de contratos e registros permanecem em suas próprias páginas/);
  assert.match(materials, /view: "documents", documentsEditId: doc\.id/);
  assert.match(state, /'documentCatalog'/);
});

test('itens documentais de Materiais aparecem no acervo e são vinculados', () => {
  assert.match(state, /id:'doc-proj-exec'.*sourceMaterialId:'proj-exec'/);
  assert.match(state, /id:'doc-proj-licenses'.*sourceMaterialId:'proj-licenses'/);
  assert.match(materials, /className = "materials-document-link"/);
  assert.match(materials, /view: "documents", documentsEditId: doc\.id/);
});

test('PDF existente abre e DWG ou PDF enviado usa armazenamento local', () => {
  assert.match(state, /alianca-park-apresentacao-loteamento-v3\.pdf/);
  assert.ok(fs.statSync(new URL('../../assets/public/alianca-park-apresentacao-loteamento-v3.pdf', import.meta.url)).size > 100_000);
  assert.match(documents, /accept="\.pdf,\.dwg,\.dxf/);
  assert.match(documents, /indexedDB\.open\("alianca-park-project-documents-v1"/);
  assert.match(documents, /adminDocumentBlobV1\("put", id, file\)/);
  assert.match(documents, /adminDocumentBlobV1\("get", item\.id\)/);
  assert.match(documents, /sourceMaterialId: String\(values\.get\("sourceMaterialId"\)/);
});

test('lista documental usa tabela com colunas configuráveis e edição confirmada', () => {
  assert.match(documents, /class="project-documents-table"/);
  assert.match(documents, /"createdAt", "Adicionado em"/);
  assert.match(documents, /"updatedAt", "Última alteração"/);
  assert.match(documents, /data-document-file-filter/);
  assert.match(documents, /data-document-column-form/);
  assert.match(documents, /data-document-cell-dialog/);
  assert.match(documents, /confirm\(`Salvar a alteração em/);
  assert.match(documents, /confirm\(`Limpar esta célula de/);
  assert.match(documents, /confirm\(`Excluir a coluna/);
  assert.match(state, /'documentsCustomColumns','documentsHiddenColumns','documentsFileFilter'/);
});

test('planilha documental seleciona célula, linha e coluna sem coluna de ações', () => {
  assert.match(documents, /data-document-row-header/);
  assert.match(documents, /data-document-column-header/);
  assert.match(documents, /data-document-selected-clear/);
  assert.match(documents, /data-document-selected-row-delete/);
  assert.match(documents, /data-document-selected-column-delete/);
  assert.match(documents, /"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"/);
  assert.match(documents, /button\.addEventListener\("click", \(\) => selectSheet\("cell"/);
  assert.doesNotMatch(documents.match(/<div class="project-documents-table-wrap">[\s\S]*?<\/table><\/div>/)?.[0] || '', /<th scope="col">Ações<\/th>/);
});
