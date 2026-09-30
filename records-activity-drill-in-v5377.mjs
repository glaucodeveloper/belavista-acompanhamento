// BELAVISTA_RECORDS_ACTIVITY_DRILL_IN_V5377
// Registros: etapa -> atividade -> apontamento. Materiais permanecem na
// central única de caixa, com o mesmo contexto de evidência financeira.
import {ViewLayer as ImportedViewLayer, ico, esc} from './components.js?v=stage-shared-header-v55';
import {appStore, demoData} from './state.js?v=personnel-production-v5373';
import {apiFetch} from './api-client.mjs';

// A bootstrap legada pode carregar mais de uma URL cache-busted do módulo.
// Sempre estenda a classe realmente registrada no custom element.
const ViewLayer = globalThis.customElements?.get('view-layer') || ImportedViewLayer;

const RECORDS_DRILL_VERSION = '5.3.77';

const RECORD_PROPERTY_TYPES_V1 = [
  ['text', 'Texto'], ['number', 'Número'], ['date', 'Data'],
  ['select', 'Seleção'], ['boolean', 'Sim / não'], ['map_area', 'Área assinalada no mapa']
];

const parseRecordPropertiesV1 = value => {
  if (Array.isArray(value)) return value;
  try { return Array.isArray(JSON.parse(String(value || '[]'))) ? JSON.parse(String(value || '[]')) : []; } catch { return []; }
};

const recordPropertyValueControlV1 = property => {
  if (property.type === 'map_area') return `<button type="button" class="records-property-map-v1" data-record-property-map>${ico('map-pin')} Assinalar no mapa</button><small data-record-property-map-status>Nenhuma área assinalada</small>`;
  if (property.type === 'boolean') return `<select data-record-property-value><option value="true">Sim</option><option value="false">Não</option></select>`;
  if (property.type === 'select') return `<input data-record-property-options placeholder="Opções separadas por vírgula"><input data-record-property-value placeholder="Valor selecionado">`;
  return `<input data-record-property-value type="${property.type === 'number' ? 'number' : property.type === 'date' ? 'date' : 'text'}" placeholder="Valor da propriedade">`;
};

// Componente puro: cada chamada produz uma linha sem manter estado global.
const DynamicRecordPropertyV1 = ({props = {}} = {}) => ({
  next() {
    const property = props.property || {id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'text'};
    return {done: false, value: `<article class="records-property-row-v1" data-record-property-row data-property-id="${esc(property.id)}" data-map-area="">
      <input data-record-property-label aria-label="Nome da propriedade" placeholder="Nome da propriedade">
      <select data-record-property-type aria-label="Tipo da propriedade">${RECORD_PROPERTY_TYPES_V1.map(([type, label]) => `<option value="${type}" ${property.type === type ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <div class="records-property-value-v1" data-record-property-value-host>${recordPropertyValueControlV1(property)}</div>
      <button type="button" class="records-property-remove-v1" data-record-property-remove aria-label="Remover propriedade">${ico('trash-2')}</button>
    </article>`};
  }
});

const dynamicPropertyRowV1 = type => DynamicRecordPropertyV1({props: {property: {id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type}}}).next().value;

function collectRecordPropertiesV1(form) {
  return [...form.querySelectorAll('[data-record-property-row]')].map(row => {
    const type = row.querySelector('[data-record-property-type]')?.value || 'text';
    let value = row.querySelector('[data-record-property-value]')?.value ?? '';
    if (type === 'map_area') {
      try { value = JSON.parse(row.dataset.mapArea || 'null'); } catch { value = null; }
    }
    return {
      id: row.dataset.propertyId,
      label: row.querySelector('[data-record-property-label]')?.value?.trim() || 'Propriedade sem nome',
      type,
      value,
      options: (row.querySelector('[data-record-property-options]')?.value || '').split(',').map(item => item.trim()).filter(Boolean)
    };
  }).filter(property => property.type === 'map_area' ? property.value : String(property.value || '').trim());
}

const activityRegistry = [
  {
    stage: 'Projeto executivo',
    key: 'project',
    unit: 'projeto',
    activities: [
      ['Compatibilizar projetos e memoriais', 'conjunto'],
      ['Conferir locação, cotas e liberações', 'conjunto'],
      ['Liberar frentes de execução', 'liberação']
    ]
  },
  {
    stage: 'Terraplanagem',
    key: 'earthwork',
    unit: 'viagens internas',
    activities: [
      ['Medir caçambas em viagem interna', 'viagem'],
      ['Executar corte e aterro', 'm³'],
      ['Regularizar o leito das vias', 'm²'],
      ['Umidificar e compactar subleito', 'm²']
    ]
  },
  {
    stage: 'Drenagem Pluvial',
    key: 'drainage',
    unit: 'm',
    activities: [
      ['Escavar e regularizar valas', 'm'],
      ['Assentar manilhas por trecho', 'm'],
      ['Executar caixas e bocas de lobo', 'un'],
      ['Reaterrar e compactar', 'm']
    ]
  },
  {
    stage: 'Rede de Água',
    key: 'water',
    unit: 'lotes',
    activities: [
      ['Assentar tubos PEAD', 'm'],
      ['Executar ramais por lote', 'ramal'],
      ['Instalar cavaletes', 'un'],
      ['Testar pressão e liberar setor', 'setor']
    ]
  },
  {
    stage: 'Meio-fio',
    key: 'curbs',
    unit: 'm',
    activities: [
      ['Preparar base e alinhamento', 'm'],
      ['Assentar meio-fio ao redor das quadras', 'm'],
      ['Executar juntas e arremates', 'm']
    ]
  },
  {
    stage: 'Rede Elétrica',
    key: 'electrical',
    unit: 'postes',
    activities: [
      ['Locar postes e caixas', 'un'],
      ['Instalar postes, cabos e conectores', 'poste'],
      ['Preparar documentação da Coelba', 'conjunto'],
      ['Registrar vistoria e ligação', 'protocolo']
    ]
  },
  {
    stage: 'Pavimentação',
    key: 'paving',
    unit: 'm²',
    activities: [
      ['Preparar base liberada', 'm²'],
      ['Assentar paralelepípedos por trecho', 'm²'],
      ['Rejuntar e compactar vias', 'm²'],
      ['Liberar trecho concluído', 'trecho']
    ]
  },
  {
    stage: 'Sinalização',
    key: 'signage',
    unit: 'conjunto',
    activities: [
      ['Implantar sinalização das vias', 'un'],
      ['Conferir entrega e as built', 'conjunto']
    ]
  }
];

const normalise = value => String(value ?? '')
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const today = () => new Date().toISOString().slice(0, 10);
const timeNow = () => new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
const stageRecords = (records, stage) => records.filter(record => normalise(record.etapa || record.stage) === normalise(stage));
const activityRecords = (records, stage, activity) => records.filter(record => {
  const sameStage = normalise(record.etapa || record.stage) === normalise(stage);
  return sameStage && normalise(record.atividade || record.activity) === normalise(activity);
});

const stageFromKey = key => activityRegistry.find(stage => stage.key === key) || activityRegistry[0];
const liveStage = stage => {
  const state = appStore.get();
  const operational = Array.isArray(state.operationalState?.stages) ? state.operationalState.stages : [];
  const demo = (demoData.activities || []).find(item => normalise(item.name) === normalise(stage.stage));
  const live = operational.find(item => normalise(item.name || item.stageName || item.key) === normalise(stage.stage) || String(item.key || '') === stage.key);
  return {...stage, ...(demo || {}), ...(live || {}), progress: Number(live?.progress ?? demo?.progress ?? 0) || 0};
};

const actorHeaders = (extra = {}) => {
  const actor = appStore.get().currentActor || {role: 'owner', uid: 'local-warley', name: 'Warley'};
  return {
    'X-Belavista-Role': actor.role || 'owner',
    'X-Belavista-User': actor.uid || 'local-warley',
    'X-Belavista-Name': actor.name || actor.label || 'Warley',
    ...extra
  };
};

const statusTone = status => {
  const value = normalise(status);
  if (/concl|feito|liberad/.test(value)) return 'done';
  if (/andament|execucao|campo/.test(value)) return 'active';
  if (/bloque|atras/.test(value)) return 'blocked';
  return 'planned';
};

const recordsForStage = (records, stage) => {
  const linked = stageRecords(records, stage.stage);
  const legacy = records.filter(record => !record.etapa && normalise(record.atividade).includes(normalise(stage.stage)));
  return [...new Map([...linked, ...legacy].map(record => [record.id, record])).values()];
};

const button = (label, attributes = '', className = '') => `<button type="button" class="${className}" ${attributes}>${label}</button>`;

function renderBreadcrumb(selectedStage, selectedActivity, drillLevel) {
  const atStageList = drillLevel === 'stages';
  const atActivityList = drillLevel === 'activities';
  return `<nav class="records-drill-breadcrumb-v5377" aria-label="Navegação dos registros">
    ${button('Registros', 'data-records-drill-root', atStageList ? 'current' : '')}
    <span aria-hidden="true">/</span>
    ${button(selectedStage ? esc(selectedStage.stage) : 'Escolha uma etapa', `data-records-drill-stage-back ${atStageList ? 'disabled' : ''}`, atActivityList ? 'current' : '')}
    ${selectedActivity && drillLevel === 'form' ? `<span aria-hidden="true">/</span><b aria-current="page">${esc(selectedActivity.name)}</b>` : ''}
  </nav>`;
}

function renderStageList(records, selectedStageKey) {
  return `<section class="records-drill-stage-panel-v5377" aria-labelledby="records-stage-list-title-v5377">
    <header class="records-drill-panel-head-v5377"><div><span>01 · ETAPAS</span><h2 id="records-stage-list-title-v5377">Escolha uma etapa</h2><p>Explore a frente para abrir suas atividades e inserir o apontamento correspondente.</p></div><b>${activityRegistry.length} frentes</b></header>
    <div class="records-drill-stage-list-v5377">
      ${activityRegistry.map(stage => {
        const live = liveStage(stage);
        const count = recordsForStage(records, stage).length;
        return `<button type="button" class="records-drill-stage-row-v5377 ${stage.key === selectedStageKey ? 'selected' : ''}" data-records-drill-stage="${esc(stage.key)}" aria-pressed="${stage.key === selectedStageKey}">
          <span class="records-drill-stage-index-v5377">${String(activityRegistry.indexOf(stage) + 1).padStart(2, '0')}</span>
          <span class="records-drill-stage-copy-v5377"><strong>${esc(stage.stage)}</strong><small>${esc(live.owner || 'Responsável a definir')} · unidade ${esc(stage.unit)}</small></span>
          <span class="records-drill-stage-meter-v5377"><i style="width:${Math.max(0, Math.min(100, live.progress))}%"></i><small>${Math.round(live.progress)}% · ${count} registro(s)</small></span>
          <span class="records-drill-chevron-v5377">${ico('chevron-right')}</span>
        </button>`;
      }).join('')}
    </div>
  </section>`;
}

function renderActivityList(records, selectedStage, selectedActivityName) {
  const live = liveStage(selectedStage);
  const linked = recordsForStage(records, selectedStage);
  return `<section class="records-drill-activity-panel-v5377" aria-labelledby="records-activity-list-title-v5377">
    <header class="records-drill-panel-head-v5377"><div><span>02 · ATIVIDADES DA FRENTE</span><h2 id="records-activity-list-title-v5377">${esc(selectedStage.stage)}</h2><p>${esc(live.owner || 'Responsável a definir')} · progresso geral ${Math.round(live.progress)}% · ${esc(selectedStage.unit)} como unidade mestre.</p></div><b>${selectedStage.activities.length} atividades</b></header>
    <div class="records-drill-activity-list-v5377">
      ${selectedStage.activities.map(([name, unit], index) => {
        const related = activityRecords(records, selectedStage.stage, name);
        const fallback = linked.find(record => !related.length && normalise(record.atividade) === normalise(selectedStage.stage) && index === 0);
        const entries = [...related, ...(fallback ? [fallback] : [])];
        const latest = entries[0];
        return `<button type="button" class="records-drill-activity-row-v5377 ${selectedActivityName === name ? 'selected' : ''}" data-records-drill-activity="${esc(name)}" aria-pressed="${selectedActivityName === name}">
          <span class="records-drill-activity-number-v5377">${String(index + 1).padStart(2, '0')}</span>
          <span class="records-drill-activity-copy-v5377"><strong>${esc(name)}</strong><small>Unidade de produção · ${esc(unit)}</small></span>
          <span class="records-drill-activity-last-v5377">${latest ? `<b>${esc(latest.status || 'Pendente')}</b><small>${esc(latest.data || 'sem data')} · ${entries.length} registro(s)</small>` : '<b>Sem apontamento</b><small>Pronto para registrar</small>'}</span>
          <span class="records-drill-chevron-v5377">${ico('arrow-up-right')}</span>
        </button>`;
      }).join('')}
    </div>
  </section>`;
}

function renderRecordHistory(records, stage, activity) {
  const entries = activityRecords(records, stage.stage, activity.name);
  return `<section class="records-drill-history-v5377" aria-labelledby="records-history-title-v5377">
    <header class="records-drill-panel-head-v5377"><div><span>03 · HISTÓRICO DA ATIVIDADE</span><h2 id="records-history-title-v5377">Apontamentos registrados</h2><p>O histórico permanece consultável depois da inserção e é propagado para o acompanhamento operacional.</p></div><b>${entries.length} item(ns)</b></header>
    <div class="records-drill-history-list-v5377">${entries.map(record => { const properties = parseRecordPropertiesV1(record.properties || record.propertiesJson); return `<article role="button" tabindex="0" data-record-open="${esc(record.id)}" aria-label="Abrir registro ${esc(record.id)}"><span class="records-drill-history-dot-v5377 ${statusTone(record.status)}"></span><div><strong>${esc(record.data || 'Sem data')} · ${esc(record.hora || '—')}</strong><small>${esc(record.responsavel || 'A definir')} · ${esc(record.status || 'Pendente')}</small><p>${esc(record.detalhes || 'Sem detalhe informado.')}</p>${properties.length ? `<div class="records-history-properties-v1">${properties.map(property => `<span><b>${esc(property.label)}</b>${property.type === 'map_area' ? `${Number(property.value?.partIds?.length || property.value?.parts?.length || 0)} área(s)` : esc(property.type === 'boolean' ? (String(property.value) === 'true' ? 'Sim' : 'Não') : property.value)}</span>`).join('')}</div>` : ''}</div><em>${ico('arrow-up-right')} ${esc(record.id || 'REG')}</em></article>`; }).join('') || '<p class="records-drill-empty-v5377">Nenhum apontamento para esta atividade. O próximo registro aparecerá aqui.</p>'}</div>
  </section>`;
}

const RecordDetailViewV1 = ({props = {}} = {}) => ({
  next() {
    const record = props.record || {};
    const properties = parseRecordPropertiesV1(record.properties || record.propertiesJson);
    let legacyMapArea = null;
    try { legacyMapArea = typeof record.mapArea === 'string' ? JSON.parse(record.mapArea) : record.mapArea; } catch {}
    const mappedProperty = properties.find(property => property.type === 'map_area' && property.value);
    const mapArea = mappedProperty?.value || legacyMapArea;
    const areaIds = mapArea?.partIds || mapArea?.parts?.map(item => item.partId || item.id).filter(Boolean) || [];
    const areaLabels = mapArea?.labels || (mapArea?.label ? [mapArea.label] : []);
    return {done: false, value: `<section class="record-detail-page-v1" aria-labelledby="record-detail-title-v1">
      <header class="record-detail-head-v1"><button type="button" data-record-detail-back>${ico('arrow-left')} Voltar aos registros</button><div><span>REGISTRO DE ATIVIDADE · ${esc(record.id || 'REG')}</span><h2 id="record-detail-title-v1">${esc(record.atividade || 'Registro operacional')}</h2><p>${esc(record.etapa || 'Etapa geral')} · ${esc(record.obra || 'Aliança Park')}</p></div><strong class="record-detail-status-v1 ${statusTone(record.status)}">${esc(record.status || 'Pendente')}</strong></header>
      <div class="record-detail-summary-v1"><article><small>DATA E HORA</small><b>${esc(record.data || '—')} · ${esc(record.hora || '—')}</b></article><article><small>RESPONSÁVEL</small><b>${esc(record.responsavel || 'A definir')}</b></article><article><small>ETAPA</small><b>${esc(record.etapa || 'Geral')}</b></article><article><small>IDENTIFICADOR</small><b>${esc(record.id || '—')}</b></article></div>
      <div class="record-detail-grid-v1">
        <section><header><span>01 · DESCRIÇÃO</span><h3>Apontamento registrado</h3></header><p class="record-detail-description-v1">${esc(record.detalhes || 'Sem descrição informada.')}</p></section>
        <section><header><span>02 · PROPRIEDADES</span><h3>Parâmetros do evento</h3></header><div class="record-detail-properties-v1">${properties.filter(property => property.type !== 'map_area').map(property => `<article><small>${esc(property.label)}</small><b>${esc(property.type === 'boolean' ? (String(property.value) === 'true' ? 'Sim' : 'Não') : property.value || '—')}</b><em>${esc(RECORD_PROPERTY_TYPES_V1.find(([type]) => type === property.type)?.[1] || property.type)}</em></article>`).join('') || '<p>Nenhuma propriedade adicional registrada.</p>'}</div></section>
        <section class="record-detail-map-v1"><header><span>03 · ÁREA ASSINALADA</span><h3>Saída da seleção do mapa</h3></header>${mapArea ? `<div class="record-detail-map-summary-v1"><span>${ico('map-pin')}</span><div><b>${esc(mapArea.label || areaLabels.join(' · ') || 'Área selecionada')}</b><small>${areaIds.length} polígono(s) associado(s) ao evento</small></div></div><div class="record-detail-area-ids-v1">${areaIds.map(id => `<code>${esc(id)}</code>`).join('') || '<span>Seleção espacial registrada sem IDs individuais.</span>'}</div>` : '<p class="record-detail-empty-v1">Este registro não possui área assinalada.</p>'}</section>
        <section class="record-detail-evidence-v1"><header><span>04 · EVIDÊNCIA</span><h3>Anexo do registro</h3></header>${record.evidenceUri ? `<a href="${esc(record.evidenceUri)}" target="_blank" rel="noopener">${ico('image')}<span><b>Abrir evidência anexada</b><small>${esc(record.evidenceUri)}</small></span>${ico('arrow-up-right')}</a>` : '<p class="record-detail-empty-v1">Nenhuma evidência anexada.</p>'}</section>
      </div>
    </section>`};
  }
});

const renderRecordDetailV1 = record => RecordDetailViewV1({props: {record}}).next().value;

function recordMapContext(state) {
  const context = state.recordContext && typeof state.recordContext === 'object'
    ? state.recordContext
    : null;
  const ids = Array.isArray(context?.partIds)
    ? context.partIds
    : context?.partId
      ? [context.partId]
      : [];
  const labels = Array.isArray(context?.labels)
    ? context.labels
    : context?.label
      ? [context.label]
      : [];
  return {
    context,
    count: ids.length || labels.length,
    label: context?.label || labels.join(' · ') || 'Nenhuma área vinculada',
    ids,
    labels
  };
}

function renderRecordMapPanel(state, selectedStage, selectedActivity) {
  const map = recordMapContext(state);
  const selectedText = map.count
    ? `${map.count} polígono${map.count === 1 ? '' : 's'} vinculado${map.count === 1 ? '' : 's'}`
    : 'Aguardando marcação';
  return `<section class="records-drill-map-panel-v5377" aria-labelledby="records-map-title-v5377">
    <header class="records-drill-panel-head-v5377"><div><span>05 · LOCALIZAÇÃO NO MAPA 3D</span><h2 id="records-map-title-v5377">Onde esta atividade acontece</h2><p>O mapa compartilhado fica ao lado desta área. Pinte lote por lote, trecho por trecho ou estrutura por estrutura para vincular a evidência física.</p></div><b data-record-map-live>${esc(selectedText)}</b></header>
    <div class="records-drill-map-controls-v5377">
      <div class="records-drill-map-selection-v5377"><strong data-record-map-selection-count>${map.count || 0}</strong><div><b data-record-map-selection-label>${esc(map.label)}</b><small>Seleção usada no registro de <em>${esc(selectedActivity.name)}</em> · ${esc(selectedStage.stage)}</small></div></div>
      <div class="records-drill-map-actions-v5377"><button type="button" data-record-drill-paint>${ico('paintbrush')} Pintar no mapa</button><button type="button" data-record-drill-fit>${ico('scan-search')} Enquadrar</button><button type="button" data-record-drill-clear>${ico('eraser')} Limpar seleção</button></div>
      <p class="records-drill-map-hint-v5377"><span>${ico('mouse-pointer-2')}</span> Segure e arraste sobre a cena para selecionar uma área. A marcação será enviada junto com o apontamento.</p>
    </div>
  </section>`;
}

function renderActivityForm(selectedStage, selectedActivity) {
  const state = appStore.get();
  const stageOwner = liveStage(selectedStage).owner || '';
  const mapArea = state.recordContext && typeof state.recordContext === 'object'
    ? JSON.stringify(state.recordContext)
    : '';
  const wizardStep = Number(state.recordWizardStepV5377) === 2 ? 2 : 1;
  const imagePreview = String(state.recordImagePreviewV5377 || '');
  const imageName = String(state.recordImageNameV5377 || 'imagem de campo');
  const stepper = `<ol class="records-drill-stepper-v5377" aria-label="Passos do novo registro">
    <li class="${wizardStep === 1 ? 'current' : 'done'}"><span>01</span><div><strong>Adicionar imagem</strong><small>Comprove o fato no local</small></div></li>
    <li class="${wizardStep === 2 ? 'current' : ''}"><span>02</span><div><strong>Completar formulário</strong><small>Descreva e confirme a medição</small></div></li>
  </ol>`;
  if (wizardStep === 1) return `<section class="records-drill-form-panel-v5377 records-drill-wizard-v5377" aria-labelledby="records-form-title-v5377">
    <header class="records-drill-panel-head-v5377"><div><span>04 · NOVO REGISTRO · PASSO 1 DE 2</span><h2 id="records-form-title-v5377">Adicione uma imagem da atividade</h2><p>Comece pelo comprovante visual do campo. Você pode selecionar um arquivo, usar a câmera do dispositivo ou colar uma imagem.</p></div><span class="records-drill-form-badge-v5377">${ico('image-plus')} evidência</span></header>
    ${stepper}
    <div class="records-drill-image-step-v5377">
      <label class="records-drill-image-dropzone-v5377" data-record-image-dropzone>
        <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" data-record-image-input>
        <span class="records-drill-image-dropzone-icon-v5377">${ico('upload')} </span>
        <strong>${imagePreview ? 'Trocar imagem' : 'Adicionar imagem'}</strong>
        <small>PNG, JPG ou WebP · até 6 MB</small>
        <em>Arraste, escolha um arquivo ou cole com Ctrl+V</em>
      </label>
      ${imagePreview ? `<figure class="records-drill-image-preview-v5377"><img src="${esc(imagePreview)}" alt="Prévia da imagem anexada"><figcaption><span><strong>Imagem pronta para o registro</strong><small>${esc(imageName)}</small></span><button type="button" data-record-image-remove>${ico('trash-2')} Remover</button></figcaption></figure>` : `<div class="records-drill-image-empty-v5377"><span>${ico('camera')}</span><div><strong>Uma imagem ajuda a validar o apontamento</strong><small>Mostre o trecho, lote, equipamento ou serviço executado. A imagem será anexada ao registro depois da confirmação.</small></div></div>`}
    </div>
    <footer class="records-drill-wizard-actions-v5377"><span>${imagePreview ? 'Imagem selecionada. Avance para preencher o contexto.' : 'Nenhuma imagem selecionada ainda.'}</span><button type="button" class="records-drill-primary-v5377" data-record-image-next ${imagePreview ? '' : 'disabled'}>${ico('arrow-right')} Continuar para o formulário</button></footer>
  </section>`;
  return `<section class="records-drill-form-panel-v5377 records-drill-wizard-v5377" aria-labelledby="records-form-title-v5377">
    <header class="records-drill-panel-head-v5377"><div><span>04 · NOVO REGISTRO · PASSO 2 DE 2</span><h2 id="records-form-title-v5377">Complete o formulário da atividade</h2><p>Agora informe a medição, o responsável e os detalhes. A imagem adicionada ficará ligada ao mesmo registro.</p></div><span class="records-drill-form-badge-v5377">${ico('clipboard-pen-line')} atividade</span></header>
    ${stepper}
    ${imagePreview ? `<div class="records-drill-image-attached-v5377"><img src="${esc(imagePreview)}" alt="Imagem anexada ao registro"><span><strong>${esc(imageName)}</strong><small>Imagem anexada como evidência visual</small></span><button type="button" data-record-image-back>Trocar imagem</button></div>` : ''}
    <form class="activity-record-form-v5377" data-activity-record-form>
      <input type="hidden" name="obra" value="Aliança Park">
      <input type="hidden" name="etapa" value="${esc(selectedStage.stage)}">
      <input type="hidden" name="atividade" value="${esc(selectedActivity.name)}">
      <input type="hidden" name="mapArea" value="${esc(mapArea)}">
      <div class="records-drill-form-context-v5377"><span>ETAPA</span><strong>${esc(selectedStage.stage)}</strong><small>ATIVIDADE · ${esc(selectedActivity.name)}</small></div>
      <label>Data<input required type="date" name="data" value="${today()}"></label>
      <label>Hora<input required type="time" name="hora" value="${timeNow()}"></label>
      <label>Responsável<input required name="responsavel" value="${esc(stageOwner)}" placeholder="Encarregado ou equipe"></label>
      <label>Natureza da entrada<select name="natureza"><option>Produção / medição</option><option>Ocorrência de campo</option><option>Evidência / comprovante</option><option>Confirmação de compromisso</option></select><small>Define como a IA deve propagar este apontamento.</small></label>
      <label>Status<select name="status"><option>Pendente</option><option>Em andamento</option><option>Concluído</option><option>Bloqueado</option></select></label>
      <label class="records-drill-production-field-v5377">Quantidade produzida<input required name="quantidade" inputmode="decimal" placeholder="0,00"><small>Unidade: ${esc(selectedActivity.unit)}</small></label>
      <label class="records-drill-production-field-v5377">Unidade de produção<input readonly name="unidade" value="${esc(selectedActivity.unit)}"><small>Vinculada à atividade</small></label>
      <label class="records-drill-wide-field-v5377">Detalhes do apontamento<textarea required name="detalhes" placeholder="Descreva trecho, equipe, equipamento, medição, ocorrência ou evidência observada."></textarea></label>
      <label class="records-drill-wide-field-v5377">Comprovante / referência<input name="evidenceUri" placeholder="URL local, código do documento ou observação do comprovante"><small>O arquivo/assinatura financeira de materiais deve ser enviado na central de caixa.</small></label>
      <section class="records-dynamic-properties-v1 records-drill-wide-field-v5377" data-record-properties>
        <header><div><span>PROPRIEDADES DINÂMICAS</span><strong>Dados adicionais do registro</strong><small>Inclua medições, classificações ou uma área assinalada diretamente no mapa.</small></div><button type="button" data-record-property-add>${ico('plus')} Adicionar propriedade</button></header>
        <div data-record-property-list></div>
      </section>
      <footer class="records-drill-form-actions-v5377"><button type="button" class="records-drill-secondary-v5377" data-record-image-back>${ico('arrow-left')} Voltar para a imagem</button><span data-activity-record-status aria-live="polite">Pronto para registrar no histórico.</span><button class="records-drill-primary-v5377" type="submit">${ico('save')} Confirmar atividade</button></footer>
    </form>
  </section>`;
}

function renderRecordsPage(root) {
  const state = appStore.get();
  const records = Array.isArray(state.records) ? state.records : [];
  const selectedDemoStage = (demoData.activities || []).find(item =>
    String(item.id) === String(state.selectedStage) || String(item.name) === String(state.selectedStage)
  );
  const selectedStageFromWorkbench = activityRegistry.find(stage =>
    selectedDemoStage && normalise(stage.stage) === normalise(selectedDemoStage.name)
  );
  const selectedStageKey = selectedStageFromWorkbench?.key || (activityRegistry.some(stage => stage.key === state.selectedRecordsStageV5377)
    ? state.selectedRecordsStageV5377
    : activityRegistry[0].key);
  const selectedStage = stageFromKey(selectedStageKey);
  const drillLevel = ['stages', 'activities', 'form'].includes(state.recordsDrillLevelV5377)
    ? state.recordsDrillLevelV5377
    : (state.recordsRegistrationRequestedV5377 ? 'form' : 'stages');
  const selectedActivityName = drillLevel === 'form' && selectedStage.activities.some(([name]) => name === state.selectedRecordsActivityV5377)
    ? state.selectedRecordsActivityV5377
    : null;
  const selectedActivity = selectedActivityName
    ? {name: selectedActivityName, unit: selectedStage.activities.find(([name]) => name === selectedActivityName)?.[1] || selectedStage.unit}
    : null;
  const requestedRecordId = state.recordDetailIdV1 || new URL(location.href).searchParams.get('record') || '';
  const detailRecord = records.find(record => String(record.id) === String(requestedRecordId));
  const totals = {
    stages: activityRegistry.length,
    activities: activityRegistry.reduce((sum, stage) => sum + stage.activities.length, 0),
    records: records.length,
    completed: records.filter(record => /concl|feito|liberad/i.test(String(record.status || ''))).length
  };

  return `<section class="records-drill-page-v5377">
    <header class="records-drill-head-v5377"><div><span>REGISTROS OPERACIONAIS · DRILL-IN</span><h1>Registros de atividade</h1><p>Explore as etapas em listas, abra a atividade e registre a produção no contexto correto da obra.</p></div><div class="records-drill-head-actions-v5377">${button(`${ico('wallet-cards')} Caixa e materiais`, 'data-view="control"', 'records-drill-cash-button-v5377')}${button(`${ico('plus')} Primeiro apontamento`, 'data-record-new-activity', 'records-drill-new-button-v5377')}</div></header>
    ${renderBreadcrumb(selectedStage, selectedActivity, drillLevel)}
    <section class="records-drill-summary-v5377" aria-label="Resumo dos registros"><article><small>ETAPAS</small><b>${totals.stages}</b><span>frentes navegáveis</span></article><article><small>ATIVIDADES</small><b>${totals.activities}</b><span>unidades de produção</span></article><article><small>HISTÓRICO</small><b>${totals.records}</b><span>registros preservados</span></article><article><small>CONCLUÍDOS</small><b>${totals.completed}</b><span>fatos confirmados</span></article></section>
    <div class="records-drill-layout-v5377 records-drill-layout-no-stage-picker-v5377">
      <main class="records-drill-workspace-v5377">
        ${detailRecord ? renderRecordDetailV1(detailRecord) : `${drillLevel === 'stages' ? renderStageList(records, selectedStageKey) : renderActivityList(records, selectedStage, selectedActivityName)}
        ${drillLevel === 'form' && selectedActivity ? `<div class="records-drill-registration-v5377"><div class="records-drill-registration-main-v5377">${renderActivityForm(selectedStage, selectedActivity)}</div><div class="records-drill-registration-side-v5377">${renderRecordMapPanel(state, selectedStage, selectedActivity)}${renderRecordHistory(records, selectedStage, selectedActivity)}</div></div>` : drillLevel === 'activities' ? `<section class="records-drill-empty-detail-v5377"><div>${ico('mouse-pointer-click')}<div><span>PRÓXIMO NÍVEL</span><h2>Escolha uma atividade</h2><p>Selecione uma linha para abrir o primeiro passo do registro: adição de imagem e, em seguida, o formulário.</p></div></div></section>` : ''}`}
      </main>
    </div>
    <aside class="records-drill-material-bridge-v5377"><div>${ico('wallet-cards')}<span><b>Materiais ficam junto do caixa</b><small>O caixa é a fonte geral. Abra a central para registrar entrada/saída, material consumido, recibo e assinatura virtual no mesmo lançamento financeiro.</small></span></div>${button('Abrir central de caixa e materiais', 'data-view="control"', 'records-drill-bridge-button-v5377')}</aside>
  </section>`;
}

function setRecordStatus(root, text, tone = '') {
  const status = root.querySelector('[data-activity-record-status]');
  if (!status) return;
  status.textContent = text;
  status.dataset.tone = tone;
}

function validateRecordEntryV5377(values, state) {
  const records = Array.isArray(state.records) ? state.records : [];
  const sameActivity = records.filter(record =>
    normalise(record.etapa || record.stage) === normalise(values.etapa) &&
    normalise(record.atividade || record.activity) === normalise(values.atividade) &&
    String(record.data || '') === String(values.data || '')
  );
  const conflicts = [];
  if (sameActivity.length) conflicts.push('já existe um apontamento para esta atividade na mesma data');
  let currentArea = null;
  try { currentArea = JSON.parse(String(values.mapArea || '')); } catch { currentArea = null; }
  const currentPartIds = new Set(currentArea?.partIds || currentArea?.parts?.map(item => item.partId || item.id) || []);
  if (currentPartIds.size) {
    const overlaps = records.some(record => {
      let area = null;
      try { area = JSON.parse(String(record.mapArea || '')); } catch { area = null; }
      return (area?.partIds || []).some(partId => currentPartIds.has(partId));
    });
    if (overlaps) conflicts.push('a área selecionada já está vinculada a outro registro');
  }
  return conflicts;
}

const RECORD_IMAGE_MAX_BYTES_V5377 = 6 * 1024 * 1024;
const RECORD_IMAGE_TYPES_V5377 = new Set(['image/png', 'image/jpeg', 'image/webp']);

function prepareRecordImageV5377(file) {
  if (!file) return;
  const mimeType = String(file.type || '').toLowerCase();
  if (!RECORD_IMAGE_TYPES_V5377.has(mimeType)) {
    appStore.set({lastAction: 'Imagem recusada: use PNG, JPG ou WebP'});
    return;
  }
  if (Number(file.size) > RECORD_IMAGE_MAX_BYTES_V5377) {
    appStore.set({lastAction: 'Imagem recusada: o limite é 6 MB'});
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || '');
    if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(dataUrl)) {
      appStore.set({lastAction: 'Não foi possível preparar a imagem'});
      return;
    }
    appStore.set({
      recordImagePreviewV5377: dataUrl,
      recordImageNameV5377: String(file.name || 'imagem-de-campo'),
      recordImageMimeV5377: mimeType,
      recordWizardStepV5377: 1,
      lastAction: `Adicionou imagem ${file.name || 'de campo'}`
    });
  };
  reader.onerror = () => appStore.set({lastAction: 'Não foi possível ler a imagem selecionada'});
  reader.readAsDataURL(file);
}

function bindGlobalRecordsEntryV5377() {
  if (document.documentElement.dataset.recordsDrillCaptureBound === 'true') return;
  document.documentElement.dataset.recordsDrillCaptureBound = 'true';
  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-records-open-new], [data-record-new-activity], [data-records-drill-activity]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const stage = stageFromKey(appStore.get().selectedRecordsStageV5377 || activityRegistry[0].key);
    const demoStage = demoData.activities.find(item => normalise(item.name) === normalise(stage.stage));
    const activity = trigger.dataset.recordsDrillActivity || stage.activities[0][0];
    appStore.set({
      view: 'records',
      selectedStage: demoStage?.id || appStore.get().selectedStage,
      selectedRecordsStageV5377: stage.key,
      selectedRecordsActivityV5377: activity,
      recordsRegistrationRequestedV5377: true,
      recordsDrillLevelV5377: 'form',
      recordWizardStepV5377: 1,
      recordImagePreviewV5377: null,
      recordImageNameV5377: null,
      recordImageMimeV5377: null,
      editingRecord: null,
      recordContext: null,
      lastAction: `Preparou registro de ${activity}`
    });
    document.querySelector('view-layer')?.render();
  }, true);
}

function bindRecordsDrill(root) {
  root.querySelectorAll('[data-record-open]').forEach(item => {
    const open = () => {
      const recordId = item.dataset.recordOpen;
      const url = new URL(location.href);
      url.searchParams.set('view', 'records');
      url.searchParams.set('record', recordId);
      history.replaceState({}, '', url);
      appStore.set({recordDetailIdV1: recordId, lastAction: `Abriu o registro ${recordId}`});
      document.querySelector('view-layer')?.render();
    };
    item.addEventListener('click', open);
    item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
  root.querySelector('[data-record-detail-back]')?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('record');
    history.replaceState({}, '', url);
    appStore.set({recordDetailIdV1: null, lastAction: 'Voltou à lista de registros'});
    document.querySelector('view-layer')?.render();
  });
  root.querySelectorAll('[data-records-drill-stage]').forEach(buttonEl => {
    buttonEl.addEventListener('click', () => {
      const selectedStage = stageFromKey(buttonEl.dataset.recordsDrillStage);
      const demoStage = demoData.activities.find(item => normalise(item.name) === normalise(selectedStage.stage));
      appStore.set({
      selectedStage: demoStage?.id || appStore.get().selectedStage,
      selectedRecordsStageV5377: selectedStage.key,
      selectedRecordsActivityV5377: null,
      recordsRegistrationRequestedV5377: false,
      recordsDrillLevelV5377: 'activities',
      lastAction: `Abriu a etapa ${buttonEl.textContent.replace(/\s+/g, ' ').trim()}`
      });
    });
  });
  root.querySelector('[data-records-drill-root]')?.addEventListener('click', () => {
    const stage = activityRegistry[0];
    const demoStage = demoData.activities.find(item => normalise(item.name) === normalise(stage.stage));
    appStore.set({selectedStage: demoStage?.id || appStore.get().selectedStage, selectedRecordsStageV5377: stage.key, selectedRecordsActivityV5377: null, recordsRegistrationRequestedV5377: false, recordsDrillLevelV5377: 'stages', lastAction: 'Voltou à lista de registros'});
  });
  root.querySelector('[data-records-drill-stage-back]')?.addEventListener('click', () => appStore.set({selectedRecordsActivityV5377: null, recordsRegistrationRequestedV5377: false, recordsDrillLevelV5377: 'activities', lastAction: 'Voltou à lista de atividades'}));
  root.querySelectorAll('[data-records-drill-activity]').forEach(buttonEl => {
    buttonEl.addEventListener('click', () => appStore.set({selectedRecordsActivityV5377: buttonEl.dataset.recordsDrillActivity, recordsRegistrationRequestedV5377: true, recordsDrillLevelV5377: 'form', recordWizardStepV5377: 1, recordImagePreviewV5377: null, recordImageNameV5377: null, recordImageMimeV5377: null, lastAction: `Abriu atividade ${buttonEl.dataset.recordsDrillActivity}`}));
  });
  root.querySelector('[data-record-new-activity]')?.addEventListener('click', () => {
    const stage = stageFromKey(appStore.get().selectedRecordsStageV5377 || activityRegistry[0].key);
    const demoStage = demoData.activities.find(item => normalise(item.name) === normalise(stage.stage));
    appStore.set({selectedStage: demoStage?.id || appStore.get().selectedStage, selectedRecordsStageV5377: stage.key, selectedRecordsActivityV5377: stage.activities[0][0], recordsRegistrationRequestedV5377: true, recordsDrillLevelV5377: 'form', recordWizardStepV5377: 1, recordImagePreviewV5377: null, recordImageNameV5377: null, recordImageMimeV5377: null, lastAction: `Preparou registro de ${stage.activities[0][0]}`});
  });
  root.querySelector('[data-record-image-input]')?.addEventListener('change', event => prepareRecordImageV5377(event.currentTarget.files?.[0]));
  root.querySelector('[data-record-image-dropzone]')?.addEventListener('dragover', event => event.preventDefault());
  root.querySelector('[data-record-image-dropzone]')?.addEventListener('drop', event => {
    event.preventDefault();
    prepareRecordImageV5377([...event.dataTransfer?.files || []].find(file => RECORD_IMAGE_TYPES_V5377.has(String(file.type || '').toLowerCase())));
  });
  root.querySelectorAll('[data-record-image-remove]').forEach(buttonEl => buttonEl.addEventListener('click', () => appStore.set({recordImagePreviewV5377: null, recordImageNameV5377: null, recordImageMimeV5377: null, recordWizardStepV5377: 1, lastAction: 'Removeu a imagem do registro'})));
  root.querySelectorAll('[data-record-image-back]').forEach(buttonEl => buttonEl.addEventListener('click', () => appStore.set({recordWizardStepV5377: 1, lastAction: 'Voltou para a adição de imagem'})));
  root.querySelector('[data-record-image-next]')?.addEventListener('click', () => {
    if (!appStore.get().recordImagePreviewV5377) return;
    appStore.set({recordWizardStepV5377: 2, lastAction: 'Avançou para o formulário do registro'});
  });
  if (!root.dataset.recordsImagePasteBound) {
    root.dataset.recordsImagePasteBound = 'true';
    root.addEventListener('paste', event => {
      const image = [...event.clipboardData?.files || []].find(file => RECORD_IMAGE_TYPES_V5377.has(String(file.type || '').toLowerCase()));
      if (image) {
        event.preventDefault();
        prepareRecordImageV5377(image);
      }
    });
  }
  const map = document.querySelector('map-scene[data-persistent-map="true"], map-scene');
  const scrollMapIntoView = () => map?.scrollIntoView?.({behavior: 'smooth', block: 'center'});
  const bindPropertyRowV1 = row => {
    row.querySelector('[data-record-property-remove]')?.addEventListener('click', () => row.remove());
    row.querySelector('[data-record-property-type]')?.addEventListener('change', event => {
      const host = row.querySelector('[data-record-property-value-host]');
      host.innerHTML = recordPropertyValueControlV1({type: event.currentTarget.value});
      row.dataset.mapArea = '';
      bindPropertyMapV1(row);
    });
    bindPropertyMapV1(row);
  };
  const bindPropertyMapV1 = row => row.querySelector('[data-record-property-map]')?.addEventListener('click', () => {
    if (!map?.setRecordPaintMode) {
      setRecordStatus(root, 'Mapa operacional ainda está carregando. Tente novamente em instantes.', 'error');
      return;
    }
    map.setRecordPaintMode(true, area => {
      row.dataset.mapArea = JSON.stringify(area);
      const mapAreaInput = row.closest('form')?.querySelector('[name="mapArea"]');
      if (mapAreaInput) mapAreaInput.value = JSON.stringify(area);
      const status = row.querySelector('[data-record-property-map-status]');
      if (status) status.textContent = `${area.label || 'Área'} · ${(area.partIds || area.parts || []).length || 1} polígono(s)`;
      setRecordStatus(root, 'Área assinalada e vinculada à propriedade.', 'success');
    });
    scrollMapIntoView();
  });
  root.querySelector('[data-record-property-add]')?.addEventListener('click', () => {
    const list = root.querySelector('[data-record-property-list]');
    list?.insertAdjacentHTML('beforeend', dynamicPropertyRowV1('text'));
    bindPropertyRowV1(list?.lastElementChild);
  });
  root.querySelector('[data-record-drill-paint]')?.addEventListener('click', () => {
    if (!map?.setRecordPaintMode) {
      setRecordStatus(root, 'Mapa operacional ainda está carregando. Tente novamente em instantes.', 'error');
      return;
    }
    map.setRecordPaintMode(true, area => {
      appStore.set({recordContext: area, lastAction: `Selecionou ${area.label} para ${area.nature || 'a atividade'}`});
      setRecordStatus(root, `${area.label} vinculada ao apontamento.`, 'success');
    });
    scrollMapIntoView();
  });
  root.querySelector('[data-record-drill-fit]')?.addEventListener('click', () => {
    map?.fitSceneView?.(true);
    scrollMapIntoView();
    appStore.set({lastAction: 'Enquadrou o mapa para marcar o registro'});
  });
  root.querySelector('[data-record-drill-clear]')?.addEventListener('click', () => {
    map?.setRecordPaintMode?.(false);
    if (map) {
      map.lastRecordMapArea = null;
      delete map.dataset.recordPaintArea;
    }
    appStore.set({recordContext: null, lastAction: 'Limpou a área do novo registro'});
  });
  root.querySelectorAll('[data-view="control"]').forEach(buttonEl => buttonEl.addEventListener('click', () => appStore.set({view: 'control', activityDedicated: false, lastAction: 'Abriu caixa e materiais'})));
  root.querySelector('[data-activity-record-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const properties = collectRecordPropertiesV1(form);
    values.properties = properties;
    const mapProperty = properties.find(property => property.type === 'map_area' && property.value);
    if (mapProperty) values.mapArea = JSON.stringify(mapProperty.value);
    const conflicts = validateRecordEntryV5377(values, appStore.get());
    if (conflicts.length) {
      setRecordStatus(root, `IA não aprovou: ${conflicts.join('; ')}. Revise antes de propagar.`, 'error');
      return;
    }
    setRecordStatus(root, 'IA validou a entrada: sem duplicidade ou conflito de área. Propagando…', 'success');
    const quantity = String(values.quantidade || '').trim();
    const details = [
      `Natureza: ${values.natureza || 'Produção / medição'}.`,
      `Produção: ${quantity} ${values.unidade}.`,
      String(values.detalhes || '').trim()
    ].filter(Boolean).join('\n');
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setRecordStatus(root, 'Salvando apontamento no histórico…');
    try {
      let evidenceUri = String(values.evidenceUri || '').trim();
      const imageDataUrl = String(appStore.get().recordImagePreviewV5377 || '');
      if (imageDataUrl) {
        setRecordStatus(root, 'Anexando a imagem ao diário da etapa…');
        const attachmentResponse = await apiFetch(`/api/workbench/attachments?stage=${encodeURIComponent(selectedStage.key)}&activity=${encodeURIComponent(values.atividade || '')}`, {
          method: 'POST',
          headers: actorHeaders({'Content-Type': 'application/json'}),
          body: JSON.stringify({
            activityId: values.atividade,
            kind: 'evidence',
            title: `Evidência · ${values.atividade}`,
            fileName: appStore.get().recordImageNameV5377 || 'imagem-de-campo.png',
            mimeType: appStore.get().recordImageMimeV5377 || 'image/png',
            dataUrl: imageDataUrl,
            notes: `Imagem anexada ao registro de ${values.atividade}.`
          })
        });
        const attachmentPayload = await attachmentResponse.json().catch(() => ({}));
        if (!attachmentResponse.ok) throw new Error(attachmentPayload.error || `Não foi possível anexar a imagem (HTTP ${attachmentResponse.status})`);
        evidenceUri = attachmentPayload.attachment?.fileUrl || '';
      }
      const response = await apiFetch('/api/records', {
        method: 'POST',
        headers: actorHeaders({'Content-Type': 'application/json'}),
        body: JSON.stringify({...values, detalhes: details, evidenceUri})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      appStore.update(current => ({
        ...current,
        records: [payload, ...(current.records || [])],
        recordWizardStepV5377: 1,
        recordImagePreviewV5377: null,
        recordImageNameV5377: null,
        recordImageMimeV5377: null,
        recordsDrillLevelV5377: 'form',
        lastAction: `Registrou atividade ${values.atividade}`
      }));
      setRecordStatus(root, 'Registro confirmado e relacionado à etapa.', 'success');
    } catch (error) {
      submit.disabled = false;
      setRecordStatus(root, error.message || 'Não foi possível salvar o registro.', 'error');
      console.warn('[records-drill-in-v5377] registro não persistido', error);
    }
  });
  window.lucide?.createIcons();
}

const installRecordsActivityDrillInV5377 = () => {
  const activeViewLayer = globalThis.customElements?.get('view-layer') || ViewLayer;
  const currentRecords = activeViewLayer.prototype.records;
  const currentBind = activeViewLayer.prototype.bind;
  if (currentRecords?.__recordsActivityDrillInV5377 && currentBind?.__recordsActivityDrillInV5377) return;

  const stageTabs = active => {
    const tabs = [
      ['stages', 'gantt-chart', 'Gantt'], ['pert', 'git-branch', 'PERT'],
      ['actions', 'sparkles', 'Ações IA'], ['raci', 'users-round', 'RACI'],
      ['raid', 'shield-alert', 'RAID'], ['agenda', 'calendar-days', 'Agenda'],
      ['activities', 'list-checks', 'Atividades']
    ];
    return `<nav class="stage-view-tabs" aria-label="Exibições da etapa"><div class="stage-view-context"><span class="activity-kind">ETAPA EM FOCO</span><strong data-records-stage-name></strong><small data-records-stage-meta></small></div><div class="stage-view-links">${tabs.map(([view, icon, label]) => `<button type="button" class="${active === view ? 'active' : ''}" data-stage-view="${view}" data-view="${view}">${ico(icon)} ${label}</button>`).join('')}</div></nav>`;
  };
  const stageShell = (html, state) => {
    const stage = demoData.activities.find(item => String(item.id) === String(state.selectedStage)) || demoData.activities[1] || demoData.activities[0];
    const map = `<section class="stage-header-3d records-stage-header-3d-v5377" data-stage-header-3d><header><div><span class="activity-kind">MAPA 3D · ${esc(stage.name)}</span><h2>Local físico da etapa</h2><p>Selecione a área do loteamento para vincular o registro à execução.</p></div><button type="button" class="ghost" data-records-stage-fit>${ico('scan-search')} Reset inicial</button></header><div class="stage-header-3d-frame"><map-scene data-records-stage-map data-stage-header-map data-stage="${esc(stage.name)}" data-overlay="${esc(stage.name)}" data-map-index="${demoData.activities.indexOf(stage)}" aria-label="Mapa 3D da etapa ${esc(stage.name)}"></map-scene></div></section>`;
    return `<section class="stage-records-inline-shell" data-stage-records-inline>${map}${stageTabs('records')}<div class="stage-records-inline-content">${html}</div></section>`;
  };

  const recordsRenderer = function recordsActivityDrillInV5377() {
    return stageShell(renderRecordsPage(this), appStore.get());
  };
  recordsRenderer.__recordsActivityDrillInV5377 = true;
  activeViewLayer.prototype.records = recordsRenderer;

  const bindRenderer = function bindRecordsActivityDrillInV5377() {
    currentBind?.call(this);
    if (appStore.get().view === 'records' || this.querySelector('.records-drill-page-v5377')) bindRecordsDrill(this);
    this.querySelector('[data-records-stage-fit]')?.addEventListener('click', () => this.querySelector('[data-records-stage-map]')?.fitSceneView?.(true));
    const stage = demoData.activities.find(item => String(item.id) === String(appStore.get().selectedStage)) || demoData.activities[1] || demoData.activities[0];
    const name = this.querySelector('[data-records-stage-name]'), meta = this.querySelector('[data-records-stage-meta]');
    if (name) name.textContent = stage.name;
    if (meta) meta.textContent = `${stage.week} · ${stage.progress}% · ${stage.owner}`;
  };
  bindRenderer.__recordsActivityDrillInV5377 = true;
  activeViewLayer.prototype.bind = bindRenderer;
};

globalThis.installBelavistaRecordsActivityDrillInV5377 = installRecordsActivityDrillInV5377;
bindGlobalRecordsEntryV5377();
// O bootstrap é assíncrono: aguarde o custom element registrado para que o
// renderer de registros seja aplicado à classe usada pela SPA, mesmo quando
// os módulos chegam em ordem diferente após um cache-buster.
const installRecordsWhenReadyV5377 = () => {
  if (globalThis.customElements?.get('view-layer')) {
    installRecordsActivityDrillInV5377();
    return;
  }
  setTimeout(installRecordsWhenReadyV5377, 80);
};
installRecordsWhenReadyV5377();

globalThis.__BELAVISTA_RECORDS_ACTIVITY_DRILL_IN_V5377 = {
  version: RECORDS_DRILL_VERSION,
  installedAt: new Date().toISOString()
};
