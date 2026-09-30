import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const components = fs.readFileSync(new URL('../../components.js', import.meta.url), 'utf8');
const state = fs.readFileSync(new URL('../../state.js', import.meta.url), 'utf8');

test('Documentos é um acervo próprio do loteamento no menu administrativo', () => {
  assert.match(components, /\["documents", "folder-open", "Documentos"\]/);
  assert.match(components, /ViewLayer\.prototype\.documents = function \(\)/);
  assert.match(components, /Documentos do loteamento/);
  assert.match(components, /Anexos de contratos e registros permanecem em suas próprias páginas/);
  assert.match(state, /'documentCatalog'/);
});

test('itens documentais de Materiais aparecem no acervo e são vinculados', () => {
  assert.match(state, /id:'doc-proj-exec'.*sourceMaterialId:'proj-exec'/);
  assert.match(state, /id:'doc-proj-licenses'.*sourceMaterialId:'proj-licenses'/);
  assert.match(components, /className = "materials-document-link"/);
  assert.match(components, /view: "documents", documentsEditId: doc\.id/);
});

test('PDF existente abre e DWG ou PDF enviado usa armazenamento local', () => {
  assert.match(state, /alianca-park-apresentacao-loteamento-v3\.pdf/);
  assert.ok(fs.statSync(new URL('../../assets/public/alianca-park-apresentacao-loteamento-v3.pdf', import.meta.url)).size > 100_000);
  assert.match(components, /accept="\.pdf,\.dwg,\.dxf/);
  assert.match(components, /indexedDB\.open\("alianca-park-project-documents-v1"/);
  assert.match(components, /adminDocumentBlobV1\("put", id, file\)/);
  assert.match(components, /adminDocumentBlobV1\("get", item\.id\)/);
  assert.match(components, /sourceMaterialId: String\(values\.get\("sourceMaterialId"\)/);
});

test('lista documental usa tabela com colunas configuráveis e edição confirmada', () => {
  assert.match(components, /class="project-documents-table"/);
  assert.match(components, /"createdAt", "Adicionado em"/);
  assert.match(components, /"updatedAt", "Última alteração"/);
  assert.match(components, /data-document-file-filter/);
  assert.match(components, /data-document-column-form/);
  assert.match(components, /data-document-cell-dialog/);
  assert.match(components, /confirm\(`Salvar a alteração em/);
  assert.match(components, /confirm\(`Limpar esta célula de/);
  assert.match(components, /confirm\(`Excluir a coluna/);
  assert.match(state, /'documentsCustomColumns','documentsHiddenColumns','documentsFileFilter'/);
});

test('planilha documental seleciona célula, linha e coluna sem coluna de ações', () => {
  assert.match(components, /data-document-row-header/);
  assert.match(components, /data-document-column-header/);
  assert.match(components, /data-document-selected-clear/);
  assert.match(components, /data-document-selected-row-delete/);
  assert.match(components, /data-document-selected-column-delete/);
  assert.match(components, /"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"/);
  assert.match(components, /button\.addEventListener\("click", \(\) => selectSheet\("cell"/);
  assert.doesNotMatch(components.match(/<div class="project-documents-table-wrap">[\s\S]*?<\/table><\/div>/)?.[0] || '', /<th scope="col">Ações<\/th>/);
});
