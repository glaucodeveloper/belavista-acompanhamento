// STAGE_HOME_PAGE_V1
// Componente puramente apresentacional: a página recebe um snapshot do
// organizador e produz uma única composição na ordem RAID → IA → registros →
// cronograma visual → RAID → IA → registros → calendário. A navegação continua pertencendo ao interator do app.
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
  const actions = Array.isArray(model.actions) ? model.actions : [];
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

  const actionCards = actions.map(action => `<button type="button" class="stage-home-ai-card tone-${tone(action.blocker)}" data-stage-home-ai="${esc(action.id)}">
    <header><span>${esc(action.track || 'Frente operacional')} · ${esc(actionPhase(action.phase))}</span><b>${Number(action.impact) || 0}</b></header>
    <h3>${esc(action.label || 'Ação operacional')}</h3>
    <p>${esc(action.blocker || 'Sem bloqueio informado.')}</p>
    <div class="stage-home-ai-score"><i><em style="width:${pct(action.readiness)}%"></em></i><strong>${pct(action.readiness)}% pronta</strong></div>
    <footer><span>${esc(action.relation || 'Sem vínculo')}</span><small>${esc(action.eta || 'A definir')}</small></footer>
  </button>`).join('');

  const recordCards = records.slice().reverse().slice(0, 6).map(record => `<button type="button" class="stage-home-record-card tone-${tone(record.status)}" data-stage-home-record="${esc(record.id || '')}">
    <header><span>${esc(record.id || 'REGISTRO')}</span><b>${esc(record.status || 'Pendente')}</b></header>
    <h3>${esc(record.atividade || record.activity || 'Atividade operacional')}</h3>
    <p>${esc(record.detalhes || 'Sem apontamento descritivo.')}</p>
    <footer><span>${esc(record.etapa || record.stage || 'Etapa não informada')}</span><small>${esc(record.data || 'Sem data')} · ${esc(record.responsavel || 'Responsável a definir')}</small></footer>
  </button>`).join('');

  const timelineCards = stages.map((stage, index) => {
    const progress = pct(stage.progress);
    const status = stageStatus(progress);
    const activity = activityForStage(stage);
    const dependencyName = key => stages.find(item => String(item.key) === String(key))?.name || key;
    const dependency = Array.isArray(stage.dependsOn) && stage.dependsOn.length
      ? `Após ${dependencyName(stage.dependsOn[stage.dependsOn.length - 1])}`
      : index === 0 ? 'Início do encadeamento' : 'Próxima frente operacional';
    return `<button type="button" class="stage-persistent-timeline-card stage-home-timeline-card ${progress > 0 ? 'active' : ''}" data-stage-home-stage="${esc(stage.key || '')}" aria-label="Abrir etapa ${esc(stage.name || 'Etapa operacional')}">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <div><small>${esc(stage.period || `Fase ${String(index + 1).padStart(2, '0')}`)} · ${esc(status)}</small><b>${esc(stage.name || 'Etapa operacional')}</b><i><em style="width:${progress}%"></em></i><small>${esc(dependency)} · ${esc(activity?.name || 'Atividades da etapa')}</small></div>
      <strong>${progress}%</strong>
    </button>`;
  }).join('');

  const dayCards = calendar.map(day => `<article class="stage-home-calendar-day ${day.today ? 'today' : ''}">
    <header><span>${esc(day.weekday || '')}</span><b>${esc(day.date || '')}</b><small>${esc(day.note || 'Janela operacional')}</small></header>
    <div>${(day.stages || []).map(stage => {
      const progress = pct(stage.progress);
      return `<button type="button" class="stage-home-calendar-card tone-${tone(stageStatus(progress))}" data-stage-home-stage="${esc(stage.key || stage.id || '')}">
        <span>${esc(stageStatus(progress))}</span><h3>${esc(stage.name || 'Etapa')}</h3><p>${esc(stage.owner || 'Responsável a definir')}</p>
        <i><em style="width:${progress}%"></em></i><footer><b>${progress}%</b><small>${esc(stage.period || 'Frente')}</small></footer>
      </button>`;
    }).join('') || '<p class="stage-home-day-empty">Sem etapa nesta janela.</p>'}</div>
  </article>`).join('');

  return `<section class="stage-home-page-v1" data-stage-home-page>
    <header class="stage-home-head"><div><span class="activity-kind">ETAPAS E CRONOGRAMA · ORGANIZADOR OPERACIONAL</span><h1>Central de decisão das etapas</h1><p>RAID, inteligência, registros e calendário reunidos na sequência de leitura do administrador.</p></div><div class="stage-home-head-actions"><button type="button" class="ghost" data-stage-home-view="raid">${model.icons?.shield || 'RAID'} Quadro RAID</button><button type="button" class="ghost" data-stage-home-view="actions">${model.icons?.sparkles || 'IA'} Ações IA</button><button type="button" class="stage-home-primary" data-stage-home-new-record>${model.icons?.plus || '+'} Novo registro</button></div></header>
    <div class="stage-home-kpis"><article><small>ETAPAS</small><b>${stages.length}</b><span>frentes relacionais</span></article><article><small>ATIVIDADES</small><b>${activities.length || 28}</b><span>unidades no organizador</span></article><article><small>RAID ABERTO</small><b>${openRaid}</b><span>riscos e dependências</span></article><article><small>AVANÇO CONSOLIDADO</small><b>${totalProgress}%</b><span>posição média das etapas</span></article></div>
    <section class="stage-persistent-timeline stage-home-timeline" data-stage-home-section="timeline" data-stage-home-timeline><header><div><span class="activity-kind">01 · CRONOGRAMA VISUAL</span><b>Linha do tempo da obra</b><small>Acompanhe todas as etapas na ordem de execução. Clique em uma frente para abrir seus detalhes específicos.</small></div><span class="stage-persistent-timeline-count">${stages.length} frentes</span></header><div class="stage-persistent-timeline-track">${timelineCards || '<p class="stage-home-empty">Nenhuma etapa cadastrada.</p>'}</div></section>
    <section class="stage-home-section stage-home-raid" data-stage-home-section="raid"><header><div><span class="activity-kind">02 · RAID CONSOLIDADO</span><h2>RAID de todas as etapas e atividades</h2><p>Riscos, premissas, problemas e dependências são apresentados com o vínculo territorial e a atividade que precisa de decisão.</p></div><div class="stage-home-section-meta"><b>${raid.length}</b><span>itens<br>monitorados</span></div></header><div class="stage-home-raid-grid">${raidCards || '<p class="stage-home-empty">Nenhuma pendência cadastrada.</p>'}</div></section>
    <section class="stage-home-section stage-home-ai" data-stage-home-section="actions"><header><div><span class="activity-kind">03 · AÇÕES IA</span><h2>Prioridades geradas pelo organizador</h2><p>A matriz de impacto e prontidão mostra quais atividades devem ser executadas, preparadas ou revisadas.</p></div><div class="stage-home-section-meta"><b>${actions.length}</b><span>ações<br>calculadas</span></div></header><div class="stage-home-ai-grid">${actionCards || '<p class="stage-home-empty">Nenhuma ação de IA disponível.</p>'}</div><footer class="stage-home-section-footer"><span>O resultado detalhado continua disponível na matriz gráfica.</span><button type="button" class="ghost" data-stage-home-view="actions">Abrir Ações IA →</button></footer></section>
    <section class="stage-home-section stage-home-records" data-stage-home-section="records"><header><div><span class="activity-kind">04 · REGISTROS DE ATIVIDADES</span><h2>Entradas, medições e comprovantes</h2><p>O diário preserva os fatos de campo que alimentam o RAID, as prioridades e o avanço das etapas.</p></div><div class="stage-home-head-actions"><span class="stage-home-section-meta"><b>${records.length}</b><span>registros<br>preservados</span></span><button type="button" class="ghost" data-stage-home-view="records">Ver todos →</button></div></header><div class="stage-home-record-grid">${recordCards || '<p class="stage-home-empty">Nenhum registro cadastrado. O primeiro apontamento pode ser criado aqui.</p>'}</div></section>
    <section class="stage-home-section stage-home-calendar" data-stage-home-section="calendar"><header><div><span class="activity-kind">05 · CALENDÁRIO DE ETAPAS</span><h2>Cards das etapas na janela operacional</h2><p>Leia a sequência por dia, compare o progresso e abra a etapa dedicada para consultar atividades e dependências.</p></div><div class="stage-home-calendar-controls"><button type="button" class="ghost" data-stage-home-view="agenda">Abrir agenda completa →</button><b>03 — 09 de junho de 2024</b></div></header><div class="stage-home-calendar-grid">${dayCards || '<p class="stage-home-empty">Nenhuma etapa cadastrada no calendário.</p>'}</div><footer class="stage-home-section-footer"><span><i class="planned"></i> Planejada <i class="active"></i> Em andamento <i class="done"></i> Concluída</span><small>Fuso · America/Bahia</small></footer></section>
  </section>`;
};

export const StageHomePage = ({props = {}, children = []} = {}) => ({
  next(message = {}) {
    return {done: false, value: stageHomeRender({...props, ...message, children})};
  }
});

export const renderStageHomePageV1 = props => StageHomePage({props}).next().value;
