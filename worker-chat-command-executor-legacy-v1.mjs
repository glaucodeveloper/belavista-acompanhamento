/** Lazy MJS recovery for worker-chat commands when the TypeScript program is unavailable. */
export async function executeLegacyWorkerChatCommandsV1(calls, context = {}, ports = {}) {
  const {
    pathname,
    getStore,
    querySelector,
    waitForUi,
    nextPaint,
    apiFetch,
    setLocalStorage,
    now,
    getLotDevelopmentProfileUpsert,
    allocateVisualRecord,
    normalizeAiAgendaComprehensionV1,
  } = ports;
  const isAdminSurface = pathname.startsWith('/admin') || pathname === '/';
  if (!isAdminSurface) return calls.length ? ['Ação disponível apenas no painel administrativo.'] : [];
  const store = getStore();
  const allowed = new Set(['map','control','lot-development','materials','documents','stages','agenda','actions','activities','records','progress','personnel','leads','contracts','brokers','brokers-board','finance','reports','settings']);
  const forms = { materials: '[data-material-new]', documents: '[data-document-new]', agenda: '[data-agenda-new-v3]', activities: '[data-activity-new]', progress: '[data-progress-new]', contracts: '[data-contract-new]', brokers: '[data-commission-new]', reports: '[data-report-builder-open]' };
  const results = [];
  for (const call of calls.slice(0, 4)) {
    const args = call?.arguments || call?.args || {};
    const view = String(args.view || '');
    if (call?.name === 'lot-development.upsert_profile') {
      const upsert = getLotDevelopmentProfileUpsert();
      if (typeof upsert !== 'function') {
        results.push('Perfil do loteamento recebido, mas o cadastro ainda não terminou de carregar.');
        continue;
      }
      const profile = upsert(args);
      results.push(`Perfil ${profile.title} preparado no Loteamento para revisão humana.`);
      continue;
    }
    if (call?.name === 'stage.allocate_visual_record') {
      const allocator = allocateVisualRecord();
      if (typeof allocator !== 'function') {
        results.push('Leitura visual recebida, mas o alocador do Dashboard ainda não terminou de carregar.');
        continue;
      }
      const message = await allocator(args, context);
      if (message) results.push(message);
      continue;
    }
    if (call?.name === 'records.open_form') {
      if (!store) { results.push('Ficha não abriu: estado da aplicação indisponível.'); continue; }
      querySelector('.sidebar [data-view="control"]')?.click();
      await nextPaint();
      store.set({ view: 'control', controlEventTab: 'event', controlEventDraft: {
        title: String(args.activity || '').slice(0, 120), responsible: String(args.responsible || '').slice(0, 120),
        details: String(args.details || '').slice(0, 4000),
        category: ['ocorrencia','vistoria','reuniao','comunicacao','decisao','outro'].includes(args.category) ? args.category : 'ocorrencia'
      }, lastAction: 'Chat preparou evento para revisão' });
      results.push(store.get().view === 'control' ? 'Ficha de evento aberta para revisão; nenhum dado foi gravado.' : 'Ficha de evento não abriu.');
      continue;
    }
    if (call?.name === 'agenda.create_pending') {
      if (!store) { results.push('Apontamento não criado: estado da aplicação indisponível.'); continue; }
      const state = store.get() || {};
      if (!normalizeAiAgendaComprehensionV1(state.aiAgendaComprehensionV1).autoCreatePending) {
        results.push('Apontamento não criado: geração pela IA desativada em Configurações.');
        continue;
      }
      const today = new Date(now());
      const iso = value => {
        const date = value ? new Date(`${value}T12:00:00`) : null;
        if (date && Number.isFinite(date.getTime())) return value;
        return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      };
      const date = iso(String(args.date || '').trim());
      let persisted = { events: [] };
      try {
        const response = await apiFetch('/api/agenda-events', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        persisted = await response.json();
        if (!Array.isArray(persisted.events)) throw new Error('Agenda inválida.');
      } catch (error) {
        results.push(`Apontamento não criado: não foi possível carregar a agenda (${error.message}).`);
        continue;
      }
      const sameDay = persisted.events.filter(item => String(item?.date || '') === date);
      const toMinutes = value => { const match = String(value || '').match(/^(\d{2}):(\d{2})$/); return match ? Number(match[1])*60 + Number(match[2]) : 0; };
      const requestedStart = String(args.start || '').trim();
      const latest = sameDay.reduce((max,item) => Math.max(max, toMinutes(item.start) + Math.round((Number(item.durationHours)||1)*60)), 8*60);
      const slotMinutes = /^\d{2}:\d{2}$/.test(requestedStart) ? toMinutes(requestedStart) : Math.min(18*60, Math.max(8*60, Math.ceil(latest/30)*30));
      const start = `${String(Math.floor(slotMinutes/60)).padStart(2,'0')}:${String(slotMinutes%60).padStart(2,'0')}`;
      const stageKey = String(args.stageKey || state.selectedStageV9 || state.selectedStage?.key || state.selectedStage || '').trim();
      const stageName = String(args.stageName || args.relation || '').trim();
      const title = String(args.title || args.activityName || 'Apontamento pendente da IA').trim().slice(0,160);
      const id = `agenda-worker-ai-${now().toString(36)}`;
      const event = { id, title, stageKey, stageName, activityId:String(args.activityId||'').trim(), activityName:String(args.activityName||title).trim().slice(0,160), owner:String(args.owner||'').trim().slice(0,120), date, start, durationHours:Math.max(.5,Math.min(24,Number(args.durationHours)||1.5)), spanDays:Math.max(1,Math.min(7,Number(args.spanDays)||1)), status:'Pendente', aiPending:true, notes:String(args.notes||'').trim().slice(0,1200), materialIds:Array.isArray(args.materialIds)?args.materialIds.map(value=>String(value).trim()).filter(Boolean):[], detailsNeeded:String(args.detailsNeeded||'').trim().slice(0,800), evidenceRequired:Boolean(args.evidenceRequired) };
      try {
        const response = await apiFetch('/api/agenda-events', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ events: [...persisted.events, event] })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        persisted = await response.json();
        setLocalStorage('belavista.agenda-calendar.v3', JSON.stringify({ version:3, initialized:true, events:persisted.events }));
      } catch (error) {
        results.push(`Apontamento não criado: não foi possível salvar na agenda (${error.message}).`);
        continue;
      }
      const agendaItem = { ...event, name:title, activity:event.activityName, responsible:event.owner, time:start, plannedStart:`${date}T${start}:00` };
      store.set({ view:'agenda', ...(stageKey ? { selectedStageV9:stageKey, selectedStage:stageKey } : {}), selectedAgendaEventV3:id, operationalAgenda:[...(state.operationalAgenda||[]).filter(item=>String(item?.id||'')!==id),agendaItem], agendaCalendarRevisionV3:now(), agendaCalendarRevisionV7:now(), lastAction:`Assistente dos workers criou apontamento pendente ${title}` });
      results.push(`Apontamento pendente criado na agenda${stageName ? ` de ${stageName}` : ''}; complete os detalhes solicitados.`);
      continue;
    }
    if (call?.name === 'documents.open_form') {
      if (!store) { results.push('Documentos não abriram: estado da aplicação indisponível.'); continue; }
      store.set({ view:'documents', documentsEditId:'new', lastAction:`Assistente dos workers solicitou documento${args.reason ? `: ${String(args.reason).slice(0,120)}` : ''}` });
      results.push('Inclusão de documento aberta para anexar a evidência solicitada.');
      continue;
    }
    if ((call?.name === 'ui.navigate' || call?.name === 'ui.open_form') && allowed.has(view)) {
      if (!store || !querySelector(`.sidebar [data-view="${view}"], aside [data-view="${view}"]`)) {
        results.push(`${view}: acesso ou navegação indisponível.`); continue;
      }
      querySelector(`.sidebar [data-view="${view}"], aside [data-view="${view}"]`).click();
      if (!await waitForUi(() => querySelector(`.sidebar [data-view="${view}"].active, aside [data-view="${view}"].active`))) { results.push(`${view}: página não abriu.`); continue; }
      if (call.name === 'ui.open_form') {
        await waitForUi(() => forms[view] && querySelector(forms[view]));
        const button = forms[view] && querySelector(forms[view]);
        if (!button) { results.push(`${view}: formulário não encontrado nesta página.`); continue; }
        button.click();
        results.push(`${view}: formulário aberto para revisão; nada foi salvo.`);
      } else results.push(`${view}: página aberta.`);
      continue;
    }
    if (call?.name === 'reports.select' && store) {
      const family = ['Financeiro','Construção','Suprimentos','Comercial','Governança'].includes(args.family) ? args.family : 'Financeiro';
      const familyButton = querySelector(`.sidebar [data-view="reports"][data-report-family="${family}"]`);
      familyButton?.click();
      await waitForUi(() => familyButton?.classList.contains('active'));
      store.set({ view: 'reports', reportFamily: family, ...(args.reportType ? { reportType: String(args.reportType).slice(0, 80) } : {}), lastAction: `Chat abriu relatórios de ${family}` });
      results.push(querySelector(`.sidebar [data-view="reports"][data-report-family="${family}"].active`) ? `Relatórios de ${family} abertos.` : `Relatórios de ${family} não abriram.`); continue;
    }
    if (call?.name === 'commissions.filter' && store) {
      querySelector('.sidebar [data-view="brokers"]')?.click();
      await nextPaint();
      store.set({ view: 'brokers', commissionFilters: { query: String(args.query || '').slice(0, 120), status: String(args.status || 'all'), profile: String(args.profile || 'all') }, lastAction: 'Chat filtrou negociações' });
      results.push('Filtro comercial aplicado.'); continue;
    }
    if (call?.name === 'map.set_overlay') {
      const map = querySelector('map-scene');
      const category = String(args.category || '');
      if (!map?.setStageOverlay || !['terraplanagem','drenagem','rede-agua','rede-eletrica','pavimentacao','urbanizacao','clear'].includes(category)) { results.push('Destaque do mapa indisponível.'); continue; }
      if (category === 'clear') map.clearStageOverlay?.(false);
      else map.setStageOverlay?.(category, false);
      results.push(category === 'clear' ? 'Destaque do mapa removido.' : `Mapa: ${category} destacada.`); continue;
    }
    if (call?.name === 'map.adjust_view') {
      const map = querySelector('map-scene');
      if (!map?.setSceneZoom) { results.push('Controle de vista do mapa indisponível.'); continue; }
      if (args.fit) map.fitSceneView?.(true);
      else {
        if (Number.isFinite(Number(args.zoomDelta))) map.setSceneZoom(map.sceneManualZoom + Math.max(-1, Math.min(1, Number(args.zoomDelta))), true);
        if (Number.isFinite(Number(args.tiltDelta))) map.setSceneTiltAdjust?.(map.sceneTiltAdjust + Math.max(-24, Math.min(24, Number(args.tiltDelta))), true);
        if (Number.isFinite(Number(args.rotationDelta))) map.setSceneRotation?.(map.sceneManualRotation + Math.max(-90, Math.min(90, Number(args.rotationDelta))), true);
      }
      results.push('Vista do mapa ajustada.'); continue;
    }
    if (call?.name === 'map.set_tiles') {
      const map = querySelector('map-scene');
      if (!map?.setMapTileMode || !['satellite','osm'].includes(args.mode)) { results.push('Base cartográfica indisponível.'); continue; }
      map.setMapTileMode(args.mode, true);
      results.push(`Base ${args.mode === 'osm' ? 'OSM' : 'satélite'} selecionada.`); continue;
    }
    if (call?.name === 'ui.print') { results.push('Impressão não iniciada: use o comando de impressão da página para confirmar.'); continue; }
    if (call?.name) results.push(`${call.name}: ação ainda não disponível neste chat.`);
  }
  return results;
}
