import {registerPublicLead} from './public-lead-register-v5342.js';
import {
  deleteRecord,
  getApiRuntime,
  getOperationalSnapshot,
  insertBudgetLine,
  insertActivity,
  insertActivityDependency,
  insertCashFlowEntry,
  insertCashForecast,
  insertEvidenceDigest,
  insertInventoryMovement,
  insertMaterialRequirement,
  insertNotification,
  insertProject,
  insertRecord,
  insertStageAgendaItem,
  getLatestDecisionRun,
  getPlanningState,
  listActivities,
  listActivityDependencies,
  listBudgetLines,
  listCashForecasts,
  listCashFlowEntries,
  listInventoryMovements,
  listMaterialRequirements,
  listNotifications,
  listProjects,
  listPurchaseRequests,
  listRecords,
  listStageAgendaItems,
  updatePurchaseRequestStatus,
  updateRecord
} from './storage.js';
import {buildBudgetSummary} from './budget.js';
import {buildNotificationsFromSnapshot} from './notifications.js';
import {buildCorrelationSummary} from './correlation.js';
import {getNvidiaRuntime, runOperationalAssistant, runVisualDigest} from './nvidia.js';
import {runPlanningCycle} from './planning-service.js';
import {runOperationalLoop} from './operational-loop.js';
import {runPublicLeadConversation} from './public-lead-ai.js';
import {getGitHubRuntime,readOperationalConfig,writeOperationalConfig,loadOperationalConfiguration} from './github-store.js';
import {requireAdminRequest} from './firebase-auth.js';
import {readPublicCatalog} from './public-commercial-store.js';
import {createLiveTestSession,readLiveTestSession,saveLiveTestSession,deleteLiveTestSession,applyLiveTestEvent} from './live-test-session.js';

import {saveCashEvidence} from './cash-evidence.js';

const JSON_HEADERS={'content-type':'application/json; charset=utf-8'};

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
}

function notFound(message='Recurso não encontrado.'){
  return json({error:message},404);
}

function methodNotAllowed(){
  return json({error:'Método não permitido.'},405);
}

async function body(request){
  const text=await request.text();
  return text?JSON.parse(text):{};
}

function pathId(pathname,prefix){
  if(!pathname.startsWith(prefix))return null;
  const rest=pathname.slice(prefix.length);
  return rest && !rest.includes('/') ? decodeURIComponent(rest) : null;
}

function strictEventTransitionMode(){ return 'strict-ai-state-transition'; }

export async function routeRequest(request,env,ctx){
  const url=new URL(request.url);
  const pathname=url.pathname.replace(/\/+$/,'')||'/';

  if(pathname==='/api/health'&&request.method==='GET'){
    const snapshot=await getOperationalSnapshot(env).catch(()=>null);
    return json({
      ok:true,
      service:'belavista-cloudflare-worker',
      date:new Date().toISOString(),
      runtime:getApiRuntime(env,url.origin),
      operational:snapshot
    });
  }

  /* BELAVISTA_PUBLIC_LEAD_ROUTE_V5342 */
  if(pathname==='/api/public/lead-register'){
    if(request.method!=='POST')return methodNotAllowed();
    const payload=await body(request);
    try{
      const result=await registerPublicLead(env,payload);
      return json({ok:true,leadId:result.record.id,repoPath:result.repo.path,repoCommitSha:result.repo.commitSha,realtime:result.realtime},201);
    }catch(error){
      console.warn('[Belavista lead register v5.3.42]',error);
      return json({ok:false,error:String(error?.message||error||'Falha ao registrar lead.')},400);
    }
  }

  if(pathname==='/api/public/catalog'&&request.method==='GET'){
    const catalog=await readPublicCatalog(env);
    return json({
      lots:(catalog.lots||[]).map(lot=>({
        id:String(lot.id||lot.code||''),
        code:String(lot.code||lot.id||''),
        status:String(lot.status||'Disponível'),
        areaM2:lot.areaM2??null,
        quadra:lot.quadra??null,
        price:lot.price??null
      })),
      source:catalog.source,
      updatedAt:new Date().toISOString()
    });
  }

  if(pathname==='/api/runtime'&&request.method==='GET')return json(getApiRuntime(env,url.origin));
  if(pathname==='/api/ai/status'&&request.method==='GET')return json({...getApiRuntime(env,url.origin).ai,nvidia:getNvidiaRuntime(env)});


  if(pathname==='/api/public/lead-chat'&&request.method==='POST'){
    const payload=await body(request);
    // As etapas de identificação, documentos e sinal são eventos da mesma
    // conversa e podem chegar sem uma nova mensagem textual.
    if(!String(payload.message||'').trim()&&!payload.event)return json({error:'Mensagem ou evento obrigatório.'},400);
    return json(await runPublicLeadConversation(env,{
      message:payload.message,
      session:payload.session||{},
      selectedLot:payload.selectedLot||null,
      event:payload.event||null
    }));
  }


  // -----------------------------------------------------------------------
  // LIVE E2E TESTS
  // Real deployed Worker + real NVIDIA + real GitHub + real Firebase RTDB.
  // Test state is isolated under data/operational/live-tests/<runId>.json and
  // Firebase liveTests/<runId>/..., so it never needs local mocks.
  // -----------------------------------------------------------------------
  if(pathname==='/api/live-tests'&&request.method==='POST'){
    const actor=await requireAdminRequest(request,env);
    const payload=await body(request);
    const created=await createLiveTestSession(env,payload);
    return json({actor:{email:actor.email,mode:actor.mode},github:{source:created.source,path:created.path,sha:created.sha,commitSha:created.commitSha},session:created.session},201);
  }

  const liveTestMatch=pathname.match(/^\/api\/live-tests\/([^/]+)(?:\/(loop|event))?$/);
  if(liveTestMatch){
    const actor=await requireAdminRequest(request,env);
    const runId=decodeURIComponent(liveTestMatch[1]);
    const action=liveTestMatch[2]||'';
    if(!action&&request.method==='GET'){
      const current=await readLiveTestSession(env,runId);
      return json({actor:{email:actor.email,mode:actor.mode},github:{source:current.source,path:current.path,sha:current.sha},session:current.session});
    }
    if(!action&&request.method==='DELETE'){
      const current=await readLiveTestSession(env,runId);
      return json(await deleteLiveTestSession(env,runId,{sha:current.sha}));
    }
    if(action==='loop'&&request.method==='POST'){
      const current=await readLiveTestSession(env,runId); const payload=await body(request);
      const event=payload.event||{
        id:`EV-LIVE-${runId}-${Date.now().toString(36).toUpperCase()}`,
        type:'operation.state.requested',at:new Date().toISOString(),
        actor:{id:'live-test',role:'admin'},payload:{trigger:payload.trigger||'loop'}
      };
      const loop=await runOperationalLoop(env,{
        mode:'strict-ai-state-transition',previousState:current.session.state,event,
        inference:{provider:'nvidia',strict:true,requireFullState:true,requireMetaTrace:true,noDeterministicFallback:true},
        configurationOverrides:{stages:current.session.configuration.stages,personnel:current.session.configuration.personnel},
        realtimeNamespace:`liveTests/${runId}`,persist:false,requireNvidia:true
      });
      return json({actor:{email:actor.email,mode:actor.mode},github:{source:current.source,path:current.path,sha:current.sha},session:{id:runId,today:current.session.today},loop},201);
    }
    if(action==='event'&&request.method==='POST'){
      const current=await readLiveTestSession(env,runId); const payload=await body(request);
      const event=payload.event||payload;
      const loop=payload.runLoop===false?null:await runOperationalLoop(env,{
        mode:'strict-ai-state-transition',previousState:current.session.state,event,
        inference:{provider:'nvidia',strict:true,requireFullState:true,requireMetaTrace:true,noDeterministicFallback:true},
        configurationOverrides:{stages:current.session.configuration.stages,personnel:current.session.configuration.personnel},
        realtimeNamespace:`liveTests/${runId}`,persist:false,requireNvidia:true
      });
      const nextState=loop?.state||current.session.state;
      const next={...current.session,state:nextState,configuration:{...current.session.configuration,stages:nextState.stages,personnel:nextState.personnel}};
      const saved=await saveLiveTestSession(env,next,{sha:current.sha,message:`test(ai): ${runId} ${event.type||'event'}`});
      return json({actor:{email:actor.email,mode:actor.mode},github:{source:saved.source,path:saved.path,sha:saved.sha,commitSha:saved.commitSha},session:saved.session,loop},201);
    }
    return methodNotAllowed();
  }

  const adminConfigMatch=pathname.match(/^\/api\/admin\/config\/(stages|personnel|commercial|state)$/);
  if(adminConfigMatch){
    const actor=await requireAdminRequest(request,env);
    const kind=adminConfigMatch[1];
    if(request.method==='GET')return json({...await readOperationalConfig(env,kind),actor:{email:actor.email,mode:actor.mode},github:getGitHubRuntime(env)});
    if(request.method==='PUT'){
      const payload=await body(request);
      const data=payload.data??payload;
      const saved=await writeOperationalConfig(env,kind,data,{sha:payload.sha,message:`chore(belavista): atualizar ${kind} via admin lite`});
      return json({...saved,actor:{email:actor.email,mode:actor.mode}});
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/admin/state'&&request.method==='GET'){
    const actor=await requireAdminRequest(request,env);
    const [configuration,cashEntries,agenda,notifications]=await Promise.all([loadOperationalConfiguration(env),listCashFlowEntries(env),listStageAgendaItems(env),listNotifications(env)]);
    return json({actor:{email:actor.email,mode:actor.mode},github:configuration.github,configuration:{stages:configuration.stages,personnel:configuration.personnel,commercial:configuration.commercial,state:configuration.state},cash:{entries:cashEntries,summary:buildBudgetSummary(cashEntries,await listBudgetLines(env))},agenda,notifications});
  }

  if(pathname==='/api/admin/cash-flow'){
    const actor=await requireAdminRequest(request,env);
    const current=await readOperationalConfig(env,'state');
    const operationalState=current.data||{};
    if(request.method==='GET')return json({cash:operationalState.cash||{},entries:operationalState.cash?.ledger||operationalState.cashEntries||[],source:current.source,sha:current.sha});
    if(request.method==='POST'){
      const payload=await body(request);
      const event={
        id:payload.eventId||`EV-CASH-${Date.now().toString(36).toUpperCase()}`,
        type:payload.kind==='saida'?'cash.outflow.recorded':'cash.inflow.recorded',
        at:new Date().toISOString(),actor:{id:actor.email||'admin',role:'admin'},
        payload:{amountCents:Number(payload.amountCents)||0,category:payload.category||'Admin Lite',description:payload.description||'',stage:payload.stage||'Geral'}
      };
      const result=await runOperationalLoop(env,{
        mode:'strict-ai-state-transition',previousState:operationalState,event,persist:true,
        inference:{provider:'nvidia',strict:true,requireFullState:true,requireMetaTrace:true,noDeterministicFallback:true}
      });
      return json({event:result.eventApplied,state:result.state,cash:result.state.cash,inference:result.inference,effects:result.effects},201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/admin/cash-evidence'&&request.method==='POST'){
    await requireAdminRequest(request,env);
    const payload=await body(request);
    const proof=await saveCashEvidence(env,payload.evidence||payload);
    return json({proof},201);
  }

  if(pathname==='/api/operational-loop'&&request.method==='POST'){
    await requireAdminRequest(request,env);
    const payload=await body(request);
    const result=await runOperationalLoop(env,{
      mode:payload.mode||'strict-ai-state-transition',
      previousState:payload.previousState||payload.previous_state||payload.stateOverrides,
      event:payload.event,
      persist:payload.persist===true,
      dryRun:payload.dryRun===true,
      realtimeNamespace:payload.realtimeNamespace||'operational',
      configurationOverrides:payload.configurationOverrides,
      inference:{provider:'nvidia',strict:true,requireFullState:true,requireMetaTrace:true,noDeterministicFallback:true,...(payload.inference||{})}
    });
    return json(result,payload.persist===true?201:200);
  }

  if((pathname==='/api/ai'||pathname==='/api/gemini')&&request.method==='POST'){
    const payload=await body(request);
    const snapshot=await getOperationalSnapshot(env).catch(()=>null);
    const result=await runOperationalAssistant(env,{message:payload.message,view:payload.view,context:payload.context||snapshot,explain:url.searchParams.get('explain')==='1'});
    return json(result);
  }

  if(pathname==='/api/records'){
    if(request.method==='GET')return json({records:await listRecords(env)});
    if(request.method==='POST'){
      const payload=await body(request);
      const record=await insertRecord(env,payload);
      if(payload.evidence?.imageBase64||payload.evidenceUri){
        ctx.waitUntil(env.BELAVISTA_QUEUE?.send?.({kind:'record.digest',recordId:record.id,payload}));
      }
      return json(record,201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/field-confirmations'&&request.method==='POST'){
    const payload=await body(request);
    const services=Array.isArray(payload.servicos)?payload.servicos.filter(Boolean).slice(0,12):[];
    if(!payload.confirmed||!services.length)return json({error:'Confirme o serviço e selecione os itens conferidos.'},400);
    const record=await insertRecord(env,{
      projectId:payload.projectId||'belavista',
      etapa:payload.etapa,
      atividade:payload.atividade,
      data:payload.data,
      hora:payload.hora,
      responsavel:payload.responsavel,
      detalhes:`${payload.detalhes||''}\nServiços: ${services.join(', ')}\nProgresso confirmado: ${Number(payload.progresso)||0}%`,
      status:payload.status||'Concluído'
    });
    const propagated=[
      {type:'record',message:'Registro auditável encaminhado ao painel operacional.'},
      {type:'activity',message:'Atualizou atividade e progresso para o próximo planejamento.'},
      {type:'realtime',message:'Evento preparado para notificação em tempo real.'}
    ];

    return json({record,propagated},201);
  }

  const recordId=pathId(pathname,'/api/records/');
  if(recordId){
    if(request.method==='PUT')return json(await updateRecord(env,recordId,await body(request)));
    if(request.method==='DELETE')return await deleteRecord(env,recordId)?json({ok:true,id:recordId}):notFound('Registro não encontrado.');
    return methodNotAllowed();
  }

  if(pathname==='/api/cash-flow'){
    if(request.method==='GET'){
      const entries=await listCashFlowEntries(env);
      return json({entries,summary:buildBudgetSummary(entries,await listBudgetLines(env))});
    }
    if(request.method==='POST'){
      const entry=await insertCashFlowEntry(env,await body(request));
      const entries=await listCashFlowEntries(env);

      return json({entry,summary:buildBudgetSummary(entries,await listBudgetLines(env))},201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/budget-lines'){
    if(request.method==='GET'){
      const lines=await listBudgetLines(env);
      return json({lines,summary:buildBudgetSummary(await listCashFlowEntries(env),lines)});
    }
    if(request.method==='POST'){
      const line=await insertBudgetLine(env,await body(request));
      const lines=await listBudgetLines(env);
      return json({line,summary:buildBudgetSummary(await listCashFlowEntries(env),lines)},201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/stage-agenda'){
    if(request.method==='GET')return json({items:await listStageAgendaItems(env)});
    if(request.method==='POST')return json({item:await insertStageAgendaItem(env,await body(request))},201);
    return methodNotAllowed();
  }

  if(pathname==='/api/projects'){
    if(request.method==='GET')return json({projects:await listProjects(env)});
    if(request.method==='POST')return json({project:await insertProject(env,await body(request))},201);
    return methodNotAllowed();
  }

  if(pathname==='/api/activities'){
    if(request.method==='GET')return json({activities:await listActivities(env),dependencies:await listActivityDependencies(env)});
    if(request.method==='POST'){
      const activity=await insertActivity(env,await body(request));

      return json({activity},201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/activity-dependencies'){
    if(request.method==='GET')return json({dependencies:await listActivityDependencies(env)});
    if(request.method==='POST'){
      const dependency=await insertActivityDependency(env,await body(request));

      return json({dependency},201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/material-requirements'){
    if(request.method==='GET')return json({requirements:await listMaterialRequirements(env)});
    if(request.method==='POST'){
      const requirement=await insertMaterialRequirement(env,await body(request));

      return json({requirement},201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/inventory-movements'){
    if(request.method==='GET')return json({movements:await listInventoryMovements(env)});
    if(request.method==='POST'){
      const movement=await insertInventoryMovement(env,await body(request));

      return json({movement},201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/cash-forecasts'){
    if(request.method==='GET')return json({forecasts:await listCashForecasts(env)});
    if(request.method==='POST'){
      const forecast=await insertCashForecast(env,await body(request));

      return json({forecast},201);
    }
    return methodNotAllowed();
  }

  if(pathname==='/api/purchase-requests'&&request.method==='GET')return json({requests:await listPurchaseRequests(env)});

  const purchaseRequestId=pathId(pathname,'/api/purchase-requests/');
  if(purchaseRequestId){
    if(request.method!=='PATCH')return methodNotAllowed();
    const payload=await body(request);
    const allowed=new Set(['suggested','approved','ordered','received','rejected','cancelled']);
    if(!allowed.has(payload.status))return json({error:'Status de compra inválido.'},400);
    const purchaseRequest=await updatePurchaseRequestStatus(env,purchaseRequestId,payload.status);
    if(!purchaseRequest)return notFound('Solicitação de compra não encontrada.');
    if(payload.status==='received'){
      await insertInventoryMovement(env,{
        id:`INV-${purchaseRequest.id}`,
        projectId:purchaseRequest.projectId,
        materialName:purchaseRequest.materialName,
        unit:purchaseRequest.unit,
        kind:'entrada',
        quantity:purchaseRequest.quantity,
        sourceType:'purchase-request',
        sourceId:purchaseRequest.id,
        notes:'Entrada criada após confirmação de recebimento.'
      });
    }

    return json({purchaseRequest});
  }

  if(pathname==='/api/material-planning/state'&&request.method==='GET')return json(await getPlanningState(env));

  if(pathname==='/api/material-planning/latest'&&request.method==='GET')return json({run:await getLatestDecisionRun(env)});

  if(pathname==='/api/material-planning/run'&&request.method==='POST'){
    const payload=await body(request);
    const result=await runPlanningCycle(env,{trigger:payload.trigger||'api',horizonDays:payload.horizonDays||45,dryRun:Boolean(payload.dryRun),pending:payload.pending||[],blockers:payload.blockers||[],raidItems:payload.raidItems||[]});
    return json(result,payload.dryRun?200:201);
  }

  if(pathname==='/api/notifications'){
    if(request.method!=='GET')return methodNotAllowed();
    const notifications=await listNotifications(env);
    if(!notifications.length){
      const snapshot=await getOperationalSnapshot(env);
      const generated=buildNotificationsFromSnapshot(snapshot);
      await Promise.all(generated.map(item=>insertNotification(env,item)));
      return json({notifications:await listNotifications(env)});
    }
    return json({notifications});
  }

  if(pathname==='/api/operational-state'&&request.method==='GET'){
    const snapshot=await getOperationalSnapshot(env);
    return json({...snapshot,correlation:buildCorrelationSummary(snapshot)});
  }

  if(pathname==='/api/intake/record-photo'&&request.method==='POST'){
    const payload=await body(request);
    const digest=await runVisualDigest(env,{kind:'record-photo',imageBase64:payload.imageBase64,imageUrl:payload.imageUrl,notes:payload.notes});
    const evidence=await insertEvidenceDigest(env,{kind:'record-photo',entityId:payload.recordId,digest,provider:digest.provider});
    return json({evidence,digest},202);
  }

  if(pathname==='/api/intake/purchase-receipt'&&request.method==='POST'){
    const payload=await body(request);
    const digest=await runVisualDigest(env,{kind:'purchase-receipt',imageBase64:payload.imageBase64,imageUrl:payload.imageUrl,notes:payload.notes});
    const evidence=await insertEvidenceDigest(env,{kind:'purchase-receipt',entityId:payload.receiptId,digest,provider:digest.provider});
    return json({evidence,digest},202);
  }

  return notFound();
}

export async function handleQueueBatch(batch,env){
  for(const message of batch.messages||[]){
    const payload=message.body||{};
    if(payload.kind==='record.digest'){
      const digest=await runVisualDigest(env,{kind:'record-photo',imageBase64:payload.payload?.evidence?.imageBase64,imageUrl:payload.payload?.evidenceUri,notes:payload.payload?.detalhes});
      await insertNotification(env,{
        category:'record-digest',
        severity:digest.risk||'info',
        title:`Digestão da ponta ${payload.recordId}`,
        message:digest.summary||'Digestão visual concluída.',
        entityType:'records',
        entityId:payload.recordId,
        metadata:{digest}
      });
      await insertEvidenceDigest(env,{kind:'record-photo',entityId:payload.recordId,digest,provider:digest.provider});
    }
    if(payload.kind==='purchase-receipt.digest'){
      const digest=await runVisualDigest(env,{kind:'purchase-receipt',imageBase64:payload.payload?.imageBase64,imageUrl:payload.payload?.imageUrl,notes:payload.payload?.notes});
      await insertEvidenceDigest(env,{kind:'purchase-receipt',entityId:payload.receiptId,digest,provider:digest.provider});
      await insertNotification(env,{id:`NTF-RECEIPT-${payload.receiptId}`,category:'purchase-receipt',severity:digest.risk||'info',title:'Recibo processado para revisão',message:digest.summary,entityType:'purchase-receipt',entityId:payload.receiptId,metadata:{digest}});
    }

    message.ack?.();
  }
}

export async function handleScheduled(_controller,_env){
  // Disabled in strict AI mode. No autonomous agenda/planning cycle.
  return null;
}
