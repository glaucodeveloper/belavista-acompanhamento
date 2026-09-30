// STAGE_HOME_PAGE_V1
// Componente puramente apresentacional: a página recebe um snapshot do
// organizador e produz uma composição de cronograma, ações, registros e
// calendário. A navegação continua pertencendo ao interator do app.
const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const pct = value => Math.max(0, Math.min(100, Number(value) || 0));
const tone = value => /concl|feito|final|valid|aprov/i.test(String(value || ''))
  ? 'done'
  : /pend|atras|risco|bloq|alto/i.test(String(value || '')) ? 'warning' : 'active';
const stageStatus = progress => progress >= 100 ? 'Concluída' : progress > 0 ? 'Em andamento' : 'Planejada';
const kindLabel = value => ({
  risk: 'Risco', assumption: 'Premissa', issue: 'Problema', dependency: 'Dependência'
}[value] || 'Atenção');
const actionPhase = value => ['Identificar', 'Preparar', 'Liberar', 'Executar', 'Verificar'][Number(value) || 0] || 'Preparar';

const stageHomeRender = model => {
  const stages = Array.isArray(model.stages) ? model.stages : [];
  const activities = Array.isArray(model.activities) ? model.activities : [];
  const raid = Array.isArray(model.raid) ? model.raid : [];
  const records = Array.isArray(model.records) ? model.records : [];
  const calendar = Array.isArray(model.calendar) ? model.calendar : [];
  const activityForStage = stage => activities.find(activity => String(activity.stage || activity.stageName || activity.etapa || '').toLocaleLowerCase('pt-BR') === String(stage.name || '').toLocaleLowerCase('pt-BR'))
    || activities.find(activity => String(activity.name || '').toLocaleLowerCase('pt-BR').includes(String(stage.name || '').toLocaleLowerCase('pt-BR').split(' ')[0]))
    || activities[0];
  const activityForRaid = item => item.activity || item.activityName || activityForStage({name: item.linked})?.name || 'Atividade relacionada';
  const totalProgress = stages.length ? Math.round(stages.reduce((sum, stage) => sum + pct(stage.progress), 0) / stages.length) : 0;
  const openRaid = raid.filter(item => !/concl|resolvido|encerr/i.test(String(item.status || item.level || ''))).length;

  const raidCards = raid.map(item => `<article class="stage-home-raid-card tone-${tone(item.level)}" data-stage-home-raid-item="${esc(item.id || item.title)}">
    <header><span>${esc(kindLabel(item.kind))}</span><b>${esc(String(item.level || 'atenção').toUpperCase())}</b></header>
    <h3>${esc(item.title || 'Pendência operacional')}</h3>
    <p>${esc(item.detail || 'Sem detalhe informado.')}</p>
    <footer><span>${esc(item.linked || 'Sem etapa vinculada')}</span><small>${esc(activityForRaid(item))}</small></footer>
  </article>`).join('');

  const recordCards = records.slice().reverse().slice(0, 6).map(record => `<button type="button" class="stage-home-record-card tone-${tone(record.status)}" data-stage-home-record="${esc(record.id || '')}">
    <header><span>${esc(record.id || 'REGISTRO')}</span><b>${esc(record.status || 'Pendente')}</b></header>
    <h3>${esc(record.atividade || record.activity || 'Atividade operacional')}</h3>
    <p>${esc(record.detalhes || 'Sem apontamento descritivo.')}</p>
    <footer><span>${esc(record.etapa || record.stage || 'Etapa não informada')}</span><small>${esc(record.data || 'Sem data')} · ${esc(record.responsavel || 'Responsável a definir')}</small></footer>
  </button>`).join('');

  const eventCards = Array.isArray(model.calendarEvents) ? model.calendarEvents : [];
  const weekStart = calendar[0]?.iso || '';
  const dayLabels = calendar.map(day => `<span class="stage-home-canvas-day ${day.today ? 'today' : ''}"><b>${esc(day.weekday)}</b><strong>${esc(day.date)}</strong></span>`).join('');
  const stageRows = stages.map(stage => {
    const scheduled = eventCards.filter(event => String(event.stageKey) === String(stage.key));
    const cards = scheduled.map((event, index) => {
      const dayIndex = calendar.findIndex(day => day.iso === event.date);
      if (dayIndex < 0) return '';
      const width = Math.max(1, Math.min(7 - dayIndex, Number(event.spanDays) || 1));
      return `<button type="button" class="stage-home-canvas-event tone-${tone(event.status)}" data-stage-home-calendar-event="${esc(event.id)}" data-stage-home-calendar-date="${esc(event.date)}" title="${esc(event.title)} · ${esc(event.start || '')}" style="left:calc(${dayIndex} * 100% / 7 + 4px);width:calc(${width} * 100% / 7 - 8px);top:${8 + index * 47}px"><b>${esc(event.start || '—')} · ${esc(event.title || 'Atividade')}</b><small>${esc(event.owner || stage.owner)} · ${esc(event.status || 'Planejado')}</small></button>`;
    }).join('');
    return `<div class="stage-home-canvas-row"><button type="button" class="stage-home-canvas-stage" data-stage-home-stage="${esc(stage.key)}"><b>${esc(stage.name)}</b><small>${pct(stage.progress)}% · ${esc(stage.owner)}</small></button><div class="stage-home-canvas-track" style="min-height:${Math.max(58, scheduled.length * 47 + 12)}px">${cards || '<span class="stage-home-canvas-empty">Sem atividade agendada nesta semana</span>'}</div></div>`;
  }).join('');

  return `<section class="stage-home-page-v1" data-stage-home-page>
    <header class="stage-home-head"><div><span class="activity-kind">ETAPAS E CRONOGRAMA · ORGANIZADOR OPERACIONAL</span><h1>Central de decisão das etapas</h1><p>Atividades, inteligência, registros e calendário na sequência de execução.</p></div><div class="stage-home-head-actions"><button type="button" class="ghost" data-stage-home-view="activities">Atividades</button><button type="button" class="ghost" data-stage-home-view="actions">${model.icons?.sparkles || 'IA'} Ações IA</button><button type="button" class="stage-home-primary" data-stage-home-new-record>${model.icons?.plus || '+'} Novo registro</button></div></header>
    <section class="stage-home-section stage-home-calendar-canvas" data-stage-home-section="calendar" data-stage-home-calendar-week="${esc(weekStart)}"><header><div><span class="activity-kind">01 · CALENDÁRIO DE ATIVIDADES</span><h2>Etapas na linha do tempo</h2><p>Compromissos por dia e etapa, sincronizados com a Agenda. Abra um card para ajustar dia, horário ou detalhes.</p></div><div class="stage-home-calendar-controls"><button type="button" data-stage-home-calendar-shift="-1" aria-label="Semana anterior">‹</button><b>${esc(model.calendarLabel || '')}</b><button type="button" data-stage-home-calendar-shift="1" aria-label="Próxima semana">›</button><button type="button" class="ghost" data-stage-home-view="agenda">Abrir agenda →</button></div></header><div class="stage-home-canvas-scroll"><div class="stage-home-canvas-grid"><div class="stage-home-canvas-axis"><span>ETAPAS</span><div>${dayLabels}</div></div>${stageRows || '<p class="stage-home-empty">Nenhuma etapa cadastrada.</p>'}</div></div><footer class="stage-home-section-footer"><span>${eventCards.length} compromisso(s) na semana · clique em um card para abrir na Agenda</span><small>Fuso · America/Bahia</small></footer></section>
    <div class="stage-home-kpis"><article><small>ETAPAS</small><b>${stages.length}</b><span>frentes relacionais</span></article><article><small>ATIVIDADES</small><b>${activities.length}</b><span>unidades no organizador</span></article><article><small>REGISTROS</small><b>${records.length}</b><span>apontamentos preservados</span></article><article><small>AVANÇO CONSOLIDADO</small><b>${totalProgress}%</b><span>posição média das etapas</span></article></div>
    <section class="stage-home-section stage-home-records" data-stage-home-section="records"><header><div><span class="activity-kind">02 · REGISTROS DE ATIVIDADES</span><h2>Entradas, medições e comprovantes</h2><p>O diário preserva os fatos de campo que alimentam prioridades e avanço das etapas.</p></div><div class="stage-home-head-actions"><span class="stage-home-section-meta"><b>${records.length}</b><span>registros<br>preservados</span></span><button type="button" class="ghost" data-stage-home-view="records">Ver todos →</button></div></header><div class="stage-home-record-grid">${recordCards || '<p class="stage-home-empty">Nenhum registro cadastrado. O primeiro apontamento pode ser criado aqui.</p>'}</div></section>
  </section>`;
};

export const StageHomePage = ({props = {}, children = []} = {}) => ({
  next(message = {}) {
    return {done: false, value: stageHomeRender({...props, ...message, children})};
  }
});

export const renderStageHomePageV1 = props => StageHomePage({props}).next().value;

export const renderOperationalAiPrioritiesV1 = (items = []) => {
  const actions = Array.isArray(items) ? items : [];
  const cards = actions.map(action => `<button type="button" class="stage-home-ai-card tone-${tone(action.blocker)}" data-stage-home-ai-action="${esc(action.id || action.label || '')}" aria-label="Enviar prioridade ${esc(action.label || 'operacional')} ao chat da IA">
    <header><span>${esc(action.track || 'Frente operacional')} · ${esc(actionPhase(action.phase))}</span><b>${Number(action.impact) || 0}</b></header>
    <div class="stage-home-ai-main"><h3>${esc(action.label || 'Ação operacional')}</h3><p>${esc(action.blocker || 'Sem bloqueio informado.')}</p></div>
    <div class="stage-home-ai-score"><i><em style="width:${pct(action.readiness)}%"></em></i><strong>${pct(action.readiness)}% pronta</strong></div>
    <footer><span>${esc(action.relation || 'Sem vínculo')}</span><small>${esc(action.eta || 'A definir')}</small></footer>
  </button>`).join('');
  return `<section class="control-center-section stage-home-section stage-home-ai control-ai-priorities" aria-label="Prioridades geradas por IA"><header><div><span class="activity-kind">PRIORIDADES · IA OPERACIONAL</span><h2>Prioridades geradas por IA</h2><p>Lista executável. Clique em uma prioridade para enviá-la ao chat operacional: a IA executa o que puder no sistema e pede somente os detalhes ou documentos que ainda faltarem.</p></div><div class="stage-home-section-meta"><b>${actions.length}</b><span>ações<br>calculadas</span></div></header><div class="stage-home-ai-grid" role="list">${cards || '<p class="stage-home-empty">Nenhuma prioridade calculada nesta sessão.</p>'}</div></section>`;
};
