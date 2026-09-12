// BELAVISTA_RECORDS_ACTIVITY_DRILL_IN_V5377
// Registros: etapa -> atividade -> apontamento. Materiais permanecem na
// central única de caixa, com o mesmo contexto de evidência financeira.
import {ViewLayer, ico, esc} from './components.js?v=dashboard-stage-focus-v1&route=ngrok-route-v1';
import {appStore, demoData} from './state.js?v=personnel-production-v5373';
import {apiFetch} from './api-client.mjs';

const RECORDS_DRILL_VERSION = '5.3.77';

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

function renderBreadcrumb(selectedStage, selectedActivity) {
  return `<nav class="records-drill-breadcrumb-v5377" aria-label="Navegação dos registros">
    ${button('Registros', 'data-records-drill-root', selectedStage ? '' : 'current')}
    <span aria-hidden="true">/</span>
    ${button(selectedStage ? esc(selectedStage.stage) : 'Escolha uma etapa', `data-records-drill-stage-back ${selectedStage ? '' : 'disabled'}`, selectedStage && !selectedActivity ? 'current' : '')}
    ${selectedActivity ? `<span aria-hidden="true">/</span><b aria-current="page">${esc(selectedActivity.name)}</b>` : ''}
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
    <div class="records-drill-history-list-v5377">${entries.map(record => `<article><span class="records-drill-history-dot-v5377 ${statusTone(record.status)}"></span><div><strong>${esc(record.data || 'Sem data')} · ${esc(record.hora || '—')}</strong><small>${esc(record.responsavel || 'A definir')} · ${esc(record.status || 'Pendente')}</small><p>${esc(record.detalhes || 'Sem detalhe informado.')}</p></div><em>${esc(record.id || 'REG')}</em></article>`).join('') || '<p class="records-drill-empty-v5377">Nenhum apontamento para esta atividade. O próximo registro aparecerá aqui.</p>'}</div>
  </section>`;
}

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
  return `<section class="records-drill-form-panel-v5377" aria-labelledby="records-form-title-v5377">
    <header class="records-drill-panel-head-v5377"><div><span>04 · NOVO REGISTRO</span><h2 id="records-form-title-v5377">Registrar produção da atividade</h2><p>Informe a medição de campo e o fato observado. A localização é vinculada no mapa ao lado; materiais e recibos ficam na central de caixa.</p></div><span class="records-drill-form-badge-v5377">${ico('clipboard-pen-line')} atividade</span></header>
    <form class="activity-record-form-v5377" data-activity-record-form>
      <input type="hidden" name="obra" value="Aliança Park">
      <input type="hidden" name="etapa" value="${esc(selectedStage.stage)}">
      <input type="hidden" name="atividade" value="${esc(selectedActivity.name)}">
      <input type="hidden" name="mapArea" value="${esc(mapArea)}">
      <div class="records-drill-form-context-v5377"><span>ETAPA</span><strong>${esc(selectedStage.stage)}</strong><small>ATIVIDADE · ${esc(selectedActivity.name)}</small></div>
      <label>Data<input required type="date" name="data" value="${today()}"></label>
      <label>Hora<input required type="time" name="hora" value="${timeNow()}"></label>
      <label>Responsável<input required name="responsavel" value="${esc(stageOwner)}" placeholder="Encarregado ou equipe"></label>
      <label>Status<select name="status"><option>Pendente</option><option>Em andamento</option><option>Concluído</option><option>Bloqueado</option></select></label>
      <label class="records-drill-production-field-v5377">Quantidade produzida<input required name="quantidade" inputmode="decimal" placeholder="0,00"><small>Unidade: ${esc(selectedActivity.unit)}</small></label>
      <label class="records-drill-production-field-v5377">Unidade de produção<input readonly name="unidade" value="${esc(selectedActivity.unit)}"><small>Vinculada à atividade</small></label>
      <label class="records-drill-wide-field-v5377">Detalhes do apontamento<textarea required name="detalhes" placeholder="Descreva trecho, equipe, equipamento, medição, ocorrência ou evidência observada."></textarea></label>
      <label class="records-drill-wide-field-v5377">Comprovante / referência<input name="evidenceUri" placeholder="URL local, código do documento ou observação do comprovante"><small>O arquivo/assinatura financeira de materiais deve ser enviado na central de caixa.</small></label>
      <footer class="records-drill-form-actions-v5377"><span data-activity-record-status aria-live="polite">Pronto para registrar no histórico.</span><button class="records-drill-primary-v5377" type="submit">${ico('save')} Confirmar atividade</button></footer>
    </form>
  </section>`;
}

function renderRecordsPage(root) {
  const state = appStore.get();
  const records = Array.isArray(state.records) ? state.records : [];
  const selectedStageKey = activityRegistry.some(stage => stage.key === state.selectedRecordsStageV5377)
    ? state.selectedRecordsStageV5377
    : activityRegistry[0].key;
  const selectedStage = stageFromKey(selectedStageKey);
  const requestedActivity = state.recordsRegistrationRequestedV5377 === true
    ? selectedStage.activities[0]?.[0]
    : '';
  const selectedActivityName = selectedStage.activities.some(([name]) => name === state.selectedRecordsActivityV5377)
    ? state.selectedRecordsActivityV5377
    : requestedActivity;
  const selectedActivity = selectedActivityName
    ? {name: selectedActivityName, unit: selectedStage.activities.find(([name]) => name === selectedActivityName)?.[1] || selectedStage.unit}
    : null;
  const totals = {
    stages: activityRegistry.length,
    activities: activityRegistry.reduce((sum, stage) => sum + stage.activities.length, 0),
    records: records.length,
    completed: records.filter(record => /concl|feito|liberad/i.test(String(record.status || ''))).length
  };

  return `<section class="records-drill-page-v5377">
    <header class="records-drill-head-v5377"><div><span>REGISTROS OPERACIONAIS · DRILL-IN</span><h1>Registros de atividade</h1><p>Explore as etapas em listas, abra a atividade e registre a produção no contexto correto da obra.</p></div><div class="records-drill-head-actions-v5377">${button(`${ico('wallet-cards')} Caixa e materiais`, 'data-view="control"', 'records-drill-cash-button-v5377')}${button(`${ico('plus')} Primeiro apontamento`, 'data-record-new-activity', 'records-drill-new-button-v5377')}</div></header>
    ${renderBreadcrumb(selectedStage, selectedActivity)}
    <section class="records-drill-summary-v5377" aria-label="Resumo dos registros"><article><small>ETAPAS</small><b>${totals.stages}</b><span>frentes navegáveis</span></article><article><small>ATIVIDADES</small><b>${totals.activities}</b><span>unidades de produção</span></article><article><small>HISTÓRICO</small><b>${totals.records}</b><span>registros preservados</span></article><article><small>CONCLUÍDOS</small><b>${totals.completed}</b><span>fatos confirmados</span></article></section>
    <div class="records-drill-layout-v5377">
      <aside class="records-drill-sidebar-v5377">${renderStageList(records, selectedStage.key)}</aside>
      <main class="records-drill-workspace-v5377">
        ${renderActivityList(records, selectedStage, selectedActivityName)}
        ${selectedActivity ? `<div class="records-drill-registration-v5377"><div class="records-drill-registration-main-v5377">${renderActivityForm(selectedStage, selectedActivity)}</div><div class="records-drill-registration-side-v5377">${renderRecordMapPanel(state, selectedStage, selectedActivity)}${renderRecordHistory(records, selectedStage, selectedActivity)}</div></div>` : `<section class="records-drill-empty-detail-v5377"><div>${ico('mouse-pointer-click')}<div><span>PRÓXIMO NÍVEL</span><h2>Selecione uma atividade para registrar</h2><p>Escolha uma linha na lista de atividades. O formulário de produção, o mapa e o histórico aparecerão nesta superfície.</p></div></div></section>`}
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

function bindGlobalRecordsEntryV5377() {
  if (document.documentElement.dataset.recordsDrillCaptureBound === 'true') return;
  document.documentElement.dataset.recordsDrillCaptureBound = 'true';
  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-records-open-new], [data-record-new-activity], [data-records-drill-activity]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const stage = stageFromKey(appStore.get().selectedRecordsStageV5377 || activityRegistry[0].key);
    const activity = trigger.dataset.recordsDrillActivity || stage.activities[0][0];
    appStore.set({
      view: 'records',
      selectedRecordsStageV5377: stage.key,
      selectedRecordsActivityV5377: activity,
      recordsRegistrationRequestedV5377: true,
      editingRecord: null,
      recordContext: null,
      lastAction: `Preparou registro de ${activity}`
    });
  }, true);
}

function bindRecordsDrill(root) {
  root.querySelectorAll('[data-records-drill-stage]').forEach(buttonEl => {
    buttonEl.addEventListener('click', () => appStore.set({
      selectedRecordsStageV5377: buttonEl.dataset.recordsDrillStage,
      selectedRecordsActivityV5377: null,
      recordsRegistrationRequestedV5377: false,
      lastAction: `Abriu a etapa ${buttonEl.textContent.replace(/\s+/g, ' ').trim()}`
    }));
  });
  root.querySelector('[data-records-drill-root]')?.addEventListener('click', () => appStore.set({selectedRecordsStageV5377: activityRegistry[0].key, selectedRecordsActivityV5377: null, recordsRegistrationRequestedV5377: false, lastAction: 'Voltou à lista de registros'}));
  root.querySelector('[data-records-drill-stage-back]')?.addEventListener('click', () => appStore.set({selectedRecordsActivityV5377: null, recordsRegistrationRequestedV5377: false, lastAction: 'Voltou à lista de atividades'}));
  root.querySelectorAll('[data-records-drill-activity]').forEach(buttonEl => {
    buttonEl.addEventListener('click', () => appStore.set({selectedRecordsActivityV5377: buttonEl.dataset.recordsDrillActivity, recordsRegistrationRequestedV5377: true, lastAction: `Abriu atividade ${buttonEl.dataset.recordsDrillActivity}`}));
  });
  root.querySelector('[data-record-new-activity]')?.addEventListener('click', () => {
    const stage = stageFromKey(appStore.get().selectedRecordsStageV5377 || activityRegistry[0].key);
    appStore.set({selectedRecordsStageV5377: stage.key, selectedRecordsActivityV5377: stage.activities[0][0], recordsRegistrationRequestedV5377: true, lastAction: `Preparou registro de ${stage.activities[0][0]}`});
  });
  const map = document.querySelector('map-scene[data-persistent-map="true"], map-scene');
  const scrollMapIntoView = () => map?.scrollIntoView?.({behavior: 'smooth', block: 'center'});
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
    const quantity = String(values.quantidade || '').trim();
    const details = [
      `Produção: ${quantity} ${values.unidade}.`,
      String(values.detalhes || '').trim()
    ].filter(Boolean).join('\n');
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setRecordStatus(root, 'Salvando apontamento no histórico…');
    try {
      const response = await apiFetch('/api/records', {
        method: 'POST',
        headers: actorHeaders({'Content-Type': 'application/json'}),
        body: JSON.stringify({...values, detalhes: details})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      appStore.update(current => ({
        ...current,
        records: [payload, ...(current.records || [])],
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
  const currentRecords = ViewLayer.prototype.records;
  const currentBind = ViewLayer.prototype.bind;
  if (currentRecords?.__recordsActivityDrillInV5377 && currentBind?.__recordsActivityDrillInV5377) return;

  const recordsRenderer = function recordsActivityDrillInV5377() {
    return renderRecordsPage(this);
  };
  recordsRenderer.__recordsActivityDrillInV5377 = true;
  ViewLayer.prototype.records = recordsRenderer;

  const bindRenderer = function bindRecordsActivityDrillInV5377() {
    currentBind?.call(this);
    if (appStore.get().view === 'records') bindRecordsDrill(this);
  };
  bindRenderer.__recordsActivityDrillInV5377 = true;
  ViewLayer.prototype.bind = bindRenderer;
};

globalThis.installBelavistaRecordsActivityDrillInV5377 = installRecordsActivityDrillInV5377;
bindGlobalRecordsEntryV5377();
installRecordsActivityDrillInV5377();

globalThis.__BELAVISTA_RECORDS_ACTIVITY_DRILL_IN_V5377 = {
  version: RECORDS_DRILL_VERSION,
  installedAt: new Date().toISOString()
};
