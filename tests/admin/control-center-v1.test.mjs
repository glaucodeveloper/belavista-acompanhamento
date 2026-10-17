import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>{
  const source=fs.readFileSync(path.join(root,file),'utf8');
  return file==='components.js'
    ? source+fs.readFileSync(path.join(root,'components/finance/finance-application-composition-v1.mjs'),'utf8')+fs.readFileSync(path.join(root,'components/chat/ai-chat-element-v1.mjs'),'utf8')+fs.readFileSync(path.join(root,'components/planning/control-center-application-composition-v1.mjs'),'utf8')+fs.readFileSync(path.join(root,'components/planning/dashboard-home-page-v1.mjs'),'utf8')+fs.readFileSync(path.join(root,'components/planning/control-center-page-v1.mjs'),'utf8')+fs.readFileSync(path.join(root,'components/planning/agenda-dashboard-detail-v1.mjs'),'utf8')+fs.readFileSync(path.join(root,'components/records/stage-record-center-v1.mjs'),'utf8')
    : source;
};

test('Central administrativa reúne as tabelas operacionais',()=>{
  const components=read('components.js');
  assert.match(components,/CONTROL_CENTER_V1/);
  assert.match(components,/controlCenterMaterialRowsV1/);
  assert.match(components,/controlCenterFinanceRowsV1/);
  assert.match(components,/Finanças, materiais, etapas e comissões/);
  assert.match(components,/data-control-material-field/);
  assert.match(components,/data-control-commission-field/);
  assert.match(components,/controlStageUnifiedFormMarkupV1/);
  assert.match(components,/controlStagePropertyGridMarkupV1/);
  assert.match(components,/data-front-stage-tab/);
  assert.match(components,/data-control-stage-context-form/);
  assert.match(components,/controlChangeLog/);
});

test('alterações de materiais e comissões publicam eventos auditáveis',()=>{
  const components=read('components.js');
  const firebase=read('firebase.mjs');
  assert.match(components,/control\.material\.updated/);
  assert.match(components,/control\.commission-rule\.updated/);
  assert.match(components,/publishOperationalEvent/);
  assert.match(firebase,/subscribeOperationalControlCenter/);
  assert.match(firebase,/agentBridgeEvents/);
  assert.match(firebase,/operationalSnapshots/);
});

test('dashboard expõe o atalho da Central e o layout é responsivo',()=>{
  const components=read('components.js');
  const css=read('styles.css');
  const sidebarSource=read('components/shared/sidebar-navigation-catalog-v1.mjs');
  assert.match(components,/STAGE_RECORD_CENTER_V1/);
  assert.match(components,/data-stage-record-center/);
  assert.match(components,/stageRecordCenterTabsV1/);
  assert.match(components,/\["materials", "Materiais", counts\.materials\]/);
  assert.match(components,/\["services", "Serviços", counts\.services\]/);
  assert.match(components,/stageRecordLotAnalysisV1/);
  assert.match(components,/stageRecordDashboardLotAnalysisV1/);
  assert.match(components,/data-stage-dashboard-quick-capture/);
  assert.doesNotMatch(components,/data-dashboard-quick-entry/);
  assert.match(components,/data-view="repasses"/);
  assert.match(components,/data-dashboard-quick-record/);
  assert.match(components,/stageRecordDashboardQuickEntryMarkupV1/);
  assert.match(components,/data-activity-quick-record/);
  assert.match(components,/data-agenda-activity-record-panel/);
  assert.match(components,/data-stage-center-lot-analysis/);
  assert.match(components,/Quadro de lotes, ocupação e valor/);
  assert.match(components,/data-stage-record-dialog/);
  assert.match(sidebarSource,/\["control", "table-properties", "Dashboard"\]/);
  assert.doesNotMatch(sidebarSource,/Contratos|Comissões/);
  assert.match(components,/data-view=\"\$\{view\}\"/);
  assert.match(css,/view-layer\[data-view="control"\]/);
  assert.match(css,/\.stage-record-center-page\{/);
  assert.match(css,/\.stage-record-properties-dialog\{/);
  assert.match(css,/\.control-center-kpis\{/);
  assert.match(css,/\.control-stage-unified-section\{/);
  assert.match(css,/\.control-stage-property-grid\{/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*control-center-head/);
});

test('leitura visual do chat possui destino explícito para material ou serviço',()=>{
  const components=read('components.js');
  const aiChat=read('components/chat/ai-chat.mjs');
  const controlCenterData=read('components/planning/control-center-data-v1.mjs');
  const server=read('server.mjs');
  const state=read('state.js');
  assert.match(server,/stage\.allocate_visual_record/);
  assert.match(server,/target material/);
  assert.match(server,/target service/);
  assert.match(components,/__BELAVISTA_ALLOCATE_VISUAL_RECORD_V1/);
  assert.match(aiChat,/allocateVisualRecordV1/);
  assert.match(aiChat,/allocationTarget/);
  assert.match(components,/createControlCenterDataV1/);
  assert.match(controlCenterData,/materialCatalogAdditions/);
  assert.match(state,/materialCatalogAdditions/);
  assert.match(aiChat,/Não consegui encaixar esta descrição com segurança/);
  assert.match(aiChat,/const normalizedStageKey = String\(args\.stageKey \|\| ""\)\.trim\(\)/);
  assert.match(aiChat,/Qual etapa ou atividade deve receber este item/);
});

test('Central calcula quadros de materiais e equipamentos restantes a partir do OCR',()=>{
  const components=read('components.js');
  const css=read('styles.css');
  assert.match(components,/stageRecordOcrEstimateRowsV1/);
  assert.match(components,/stageRecordEstimateBoardV1/);
  assert.match(components,/data-stage-center-estimates/);
  assert.match(components,/Equipamentos restantes/);
  assert.match(components,/Materiais restantes/);
  assert.match(components,/Restante estimado/);
  assert.match(components,/OCR \+ base da etapa/);
  assert.match(css,/\.stage-record-estimate-board/);
});

test('relatórios da lista de materiais oferecem seleção, propriedades, agrupamento e impressão',()=>{
  const components=read('components.js');
  const css=read('styles.css');
  assert.match(components,/data-stage-material-report-open/);
  assert.match(components,/stageMaterialReportFieldsV1/);
  assert.match(components,/data-material-report-column/);
  assert.match(components,/data-material-report-group-field/);
  assert.match(components,/data-material-report-row-select/);
  assert.match(components,/data-material-report-print-selected/);
  assert.match(components,/window\.print\(\)/);
  assert.match(components,/stageMaterialReportPropertyEntriesV1/);
  assert.match(css,/\.stage-material-report-dialog/);
  assert.match(css,/body\.stage-material-report-printing/);
  assert.doesNotMatch(css,/\.stage-record-center-head/);
});
