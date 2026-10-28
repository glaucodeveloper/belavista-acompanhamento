import {
  registerPublicLead} from './public-lead-register-v5342.js';
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
  listAgendaEvents,
  listStageAgendaItems,
  saveAgendaSnapshot,
  updatePurchaseRequestStatus,
  updateRecord
} from './storage.js';
import {buildBudgetSummary} from './budget.js';
import {buildNotificationsFromSnapshot} from './notifications.js';
import {buildCorrelationSummary} from './correlation.js';
import {getNvidiaRuntime,
  runOperationalAssistant,
  runVisualDigest,
  runInstagramCommercialLeadAssistant,
  runWholeWorkJourneyExplanation,
  extractInvoicePdfOcr,
  extractInstantRecordOcr
} from './nvidia.js';
import {buildRecordInterpretationV1} from '../../record-stage-interpretation-v1.mjs';
import {runPlanningCycle} from './planning-service.js';
import {runOperationalLoop} from './operational-loop.js';
import {generateDashboardPlanWithCloudflareAi} from './dashboard-generation.js';
import {runPublicLeadConversation} from './public-lead-ai.js';
import {getGitHubRuntime,readOperationalConfig,writeOperationalConfig,loadOperationalConfiguration,readRepositoryJson,writeRepositoryJson} from './github-store.js';
import {requireAdminRequest,bearerToken} from './request-auth.js';
import {actorFromGithubSession,openGithubSession,revokeGithubSession,
  listForemanAccessKeys,createForemanAccessKey,revokeForemanAccessKey,
  listForemanAccessRoles,saveForemanAccessRole,deleteForemanAccessRole} from './github-session-store.js';
import {readPublicCatalog,readPublicCommercialRecords,readPublicCommercialSummary} from './public-commercial-store.js';
import {createLiveTestSession,readLiveTestSession,saveLiveTestSession,deleteLiveTestSession,applyLiveTestEvent} from './live-test-session.js';

import {saveCashEvidence} from './cash-evidence.js';
import {saveLotDocument} from './lot-document-store.js';
import {listProjectDocuments,getProjectDocument,saveProjectDocument,deleteProjectDocument,getProjectDocumentFile,createProjectDocumentColumn,deleteProjectDocumentColumn} from './project-document-store.js';
import {webhookVerification,parseWebhook,saveInboundSocialMessages,socialRuntime,listSocialConversations,listSocialMessages,sendSocialMessage,saveInstagramCommercialLead,listInstagramFeed,replyInstagramComment,getInstagramAutomationPolicy,saveInstagramAutomationPolicy} from './social.js';
import {getHeldImage,holdImageInWorker,readHeldImageDataUrl,normalizeImageAttachment} from './media-attachments.js';
import {normalizePdfAttachment} from './pdf-record-ocr.js';
import {createWorkbenchAttachment,getWorkbenchAttachmentFile,listWorkbenchAttachments} from './workbench-attachment-store.js';

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

async function digestImageSource(env,source){
  const value=String(source||'').trim();
  if(!value)return null;
  if(/^r2:\/\//i.test(value))return readHeldImageDataUrl(env,value).catch(()=>null);
  return value;
}

function strictEventTransitionMode(){ return 'strict-ai-state-transition'; }

export async function routeRequest(request,env,ctx){
  const url=new URL(request.url);
  const pathname=url.pathname.replace(/\/+$/,'')||'/';

  if(pathname==='/api/auth/session'){
    if(request.method==='POST'){
      const payload=await body(request);
      return json(await openGithubSession(env,payload.pat,{account:payload.account}),201,{'cache-control':'no-store'});
    }
    if(request.method==='GET')return json({actor:await requireAdminRequest(request,env)},200,{'cache-control':'no-store'});
    if(request.method==='DELETE'){
      await requireAdminRequest(request,env);
      await revokeGithubSession(env,bearerToken(request));
      return json({ok:true},200,{'cache-control':'no-store'});
    }
    return methodNotAllowed();
  }
  if(pathname==='/api/workbench/attachments'){
    const actor=await requireAdminRequest(request,env);
    const stageKey=url.searchParams.get('stage')||'',activityId=url.searchParams.get('activity')||'';
    if(request.method==='GET')return json({attachments:await listWorkbenchAttachments(env,stageKey,activityId)},200,{'cache-control':'no-store'});
    if(request.method==='POST'){
      const payload=await body(request);
      const attachment=await createWorkbenchAttachment(env,{...payload,stageKey:payload.stageKey||stageKey,activityId:payload.activityId||activityId},actor);
      return json({attachment},201,{'cache-control':'no-store'});
    }
    return methodNotAllowed();
  }
  const workbenchAttachmentFile=pathname.match(/^\/api\/workbench\/attachments\/([^/]+)\/file$/);
  if(workbenchAttachmentFile&&request.method==='GET'){
    await requireAdminRequest(request,env);
    const file=await getWorkbenchAttachmentFile(env,decodeURIComponent(workbenchAttachmentFile[1]));
    if(!file)return notFound('Anexo não encontrado.');
    return new Response(file.content,{status:200,headers:{'content-type':file.mimeType,'content-length':String(file.content.byteLength),'content-disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  }
  if(pathname==='/api/access-roles'){
    const actor=await requireAdminRequest(request,env);
    if(actor.role!=='owner'||actor.userType==='foreman')return json({error:'Somente a chave PTA administradora pode gerenciar papéis delegados.'},403);
    if(request.method==='GET')return json({roles:await listForemanAccessRoles(env,actor.githubId)},200,{'cache-control':'no-store'});
    if(request.method==='POST'||request.method==='PUT'){
      const payload=await body(request),id=request.method==='PUT'?String(payload.id||''):'';
      return json({role:await saveForemanAccessRole(env,{githubId:actor.githubId,id,name:payload.name,permissions:payload.permissions})},request.method==='POST'?201:200,{'cache-control':'no-store'});
    }
    return methodNotAllowed();
  }
  const accessRoleMatch=pathname.match(/^\/api\/access-roles\/([^/]+)$/);
  if(accessRoleMatch&&request.method==='DELETE'){
    const actor=await requireAdminRequest(request,env);
    if(actor.role!=='owner'||actor.userType==='foreman')return json({error:'Somente a chave PTA administradora pode excluir papéis delegados.'},403);
    const id=decodeURIComponent(accessRoleMatch[1]);
    return await deleteForemanAccessRole(env,actor.githubId,id)?json({ok:true,id}):notFound('Papel não encontrado.');
  }
  if(pathname==='/api/access-keys'){
    const actor=await requireAdminRequest(request,env);
    if(actor.role!=='owner'||actor.userType==='foreman')return json({error:'Somente a chave PTA administradora pode gerenciar chaves delegadas.'},403);
    if(request.method==='GET')return json({keys:await listForemanAccessKeys(env,actor.githubId)},200,{'cache-control':'no-store'});
    if(request.method==='POST'){
      const payload=await body(request),key=await createForemanAccessKey(env,{githubId:actor.githubId,label:payload.label,permissions:payload.permissions,roleId:payload.roleId,createdBy:actor.githubLogin});
      return json({key},201,{'cache-control':'no-store'});
    }
    return methodNotAllowed();
  }
  const delegatedKeyMatch=pathname.match(/^\/api\/access-keys\/([^/]+)$/);
  if(delegatedKeyMatch&&request.method==='DELETE'){
    const actor=await requireAdminRequest(request,env);
    if(actor.role!=='owner'||actor.userType==='foreman')return json({error:'Somente a chave PTA administradora pode revogar chaves delegadas.'},403);
    const id=decodeURIComponent(delegatedKeyMatch[1]);
    return await revokeForemanAccessKey(env,actor.githubId,id)?json({ok:true,id}):json({error:'Chave não encontrada ou já revogada.'},404);
  }
  if(pathname==='/api/settings/public-lead-contact'){
    const actor=await requireAdminRequest(request,env);
    if(!['owner','admin','developer'].includes(actor.role))return json({error:'Seu perfil não pode alterar as configurações do atendimento comercial.'},403);
    if(request.method==='GET'){
      const settings=await readRepositoryJson(env,'data/operational/public-lead-contact.json');
      return json(settings.data,200,{'cache-control':'no-store'});
    }
    if(request.method==='PUT'){
      const payload=await body(request);
      const whatsappNumber=String(payload.whatsappNumber||'').replace(/\D/g,'').slice(0,15);
      if(whatsappNumber.length<10)return json({error:'Informe um número WhatsApp válido com DDD.'},400);
      const path='data/operational/public-lead-contact.json';
      const current=await readRepositoryJson(env,path);
      const settings={...current.data,whatsappNumber,updatedAt:new Date().toISOString(),updatedBy:actor.login||actor.name||String(actor.id||actor.role)};
      const saved=await writeRepositoryJson(env,path,settings,{sha:current.sha,message:'chore(commercial): atualizar contato público do WhatsApp'});
      return json(saved.data,200,{'cache-control':'no-store'});
    }
    return methodNotAllowed();
  }
  if(pathname==='/api/health'&&request.method==='GET'){
    const snapshot=await getOperationalSnapshot(env);
    return json({
      ok:true,
      service:'belavista-cloudflare-worker',
      date:new Date().toISOString(),
      runtime:getApiRuntime(env,url.origin),
      operational:snapshot,social:socialRuntime(env)
    });
  }

  for(const channel of ['instagram','whatsapp']){
    if(pathname===`/${channel}/webhook`){
      if(request.method==='GET')return webhookVerification(request,env,channel);
      if(request.method==='POST'){
        const parsed=await parseWebhook(request,env,channel);
        const saved=await saveInboundSocialMessages(env,parsed.messages);
        return json({ok:true,received:parsed.messages.length,saved:saved.length});
      }
      return methodNotAllowed();
    }
  }
  if(pathname==='/api/communications/status'&&request.method==='GET'){
    const actor=await requireAdminRequest(request,env);
    return json({actor:{email:actor.email,mode:actor.mode},social:socialRuntime(env)});
  }
  if(pathname==='/api/instagram/feed'&&request.method==='GET'){
    await requireAdminRequest(request,env);
    try{
      const query=new URL(request.url).searchParams;
      return json(await listInstagramFeed(env,{limit:query.get('limit'),commentsLimit:query.get('commentsLimit')}));
    }catch(error){
      return json({source:'unavailable',posts:[],configured:socialRuntime(env).instagram.configured,error:error.message||'Feed do Instagram indisponível.'},error.statusCode||502);
    }
  }
  if(pathname==='/api/instagram/automation-policy'){
    await requireAdminRequest(request,env);
    if(request.method==='GET')return json(await getInstagramAutomationPolicy(env));
    if(request.method==='PUT')return json(await saveInstagramAutomationPolicy(env,await body(request)));
    return methodNotAllowed();
  }
  const instagramCommentReply=pathname.match(/^\/api\/instagram\/comments\/([^/]+)\/reply$/);
  if(instagramCommentReply){
    await requireAdminRequest(request,env);
    if(request.method!=='POST')return methodNotAllowed();
    try{return json(await replyInstagramComment(env,{commentId:decodeURIComponent(instagramCommentReply[1]),message:(await body(request)).message}),201);}
    catch(error){return json({error:error.message||'Não foi possível responder ao comentário.'},error.statusCode||502);}
  }
  if(pathname==='/api/communications/conversations'&&request.method==='GET'){
    await requireAdminRequest(request,env);
    return json({conversations:await listSocialConversations(env,new URL(request.url).searchParams.get('channel')||'all')});
  }
  const conversationMessages=pathname.match(/^\/api\/communications\/conversations\/([^/]+)\/messages$/);
  if(conversationMessages){
    await requireAdminRequest(request,env);
    const conversationId=decodeURIComponent(conversationMessages[1]);
    if(request.method==='GET')return json({messages:await listSocialMessages(env,conversationId)});
    if(request.method==='POST'){
      const payload=await body(request),channel=conversationId.split(':')[0];
      return json(await sendSocialMessage(env,{channel,conversationId,text:payload.text||payload.message}),201);
    }
    return methodNotAllowed();
  }
  const instagramConversationAssistant=pathname.match(/^\/api\/communications\/conversations\/([^/]+)\/assistant$/);
  if(instagramConversationAssistant){
    await requireAdminRequest(request,env);
    if(request.method!=='POST')return methodNotAllowed();
    const conversationId=decodeURIComponent(instagramConversationAssistant[1]);
    if(!conversationId.startsWith('instagram:'))return json({error:'A qualificação por IA está disponível somente para conversas do Instagram.'},400);
    try{
      const conversations=await listSocialConversations(env,'instagram');
      const conversation=conversations.find(item=>item.id===conversationId);
      if(!conversation)return json({error:'Conversa do Instagram não encontrada.'},404);
      const messages=await listSocialMessages(env,conversationId);
      return json(await runInstagramCommercialLeadAssistant(env,{conversation,messages,leadContext:await body(request)}));
    }catch(error){return json({error:error.message||'Não foi possível gerar a orientação comercial.'},error.statusCode||502);}
  }
  const instagramConversationLead=pathname.match(/^\/api\/communications\/conversations\/([^/]+)\/lead$/);
  if(instagramConversationLead){
    await requireAdminRequest(request,env);
    if(request.method!=='POST')return methodNotAllowed();
    const conversationId=decodeURIComponent(instagramConversationLead[1]);
    if(!conversationId.startsWith('instagram:'))return json({error:'O lead comercial só pode ser criado a partir de uma conversa do Instagram.'},400);
    try{
      const payload=await body(request);
      if(payload.confirm!==true)return json({error:'Confirme o registro do lead comercial antes de persistir.'},400);
      const conversation=(await listSocialConversations(env,'instagram')).find(item=>item.id===conversationId);
      if(!conversation)return json({error:'Conversa do Instagram não encontrada.'},404);
      return json(await saveInstagramCommercialLead(env,{conversation,leadDraft:payload.leadDraft||{}}),201);
    }catch(error){return json({error:error.message||'Não foi possível registrar o lead comercial.'},error.statusCode||502);}
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

  if(pathname==='/api/admin/public-leads'){
    if(request.method!=='GET')return methodNotAllowed();
    const actor=await requireAdminRequest(request,env);
    if(!['owner','admin','developer'].includes(String(actor?.role||'')))return json({error:'Somente administração pode consultar dados pessoais de leads e reservas.'},403,{'cache-control':'no-store'});
    try{return json(await readPublicCommercialRecords(env),200,{'cache-control':'private, no-store'});}
    catch(error){return json({error:error?.message||'Não foi possível ler os leads públicos do repositório.'},502,{'cache-control':'no-store'});}
  }

  if(pathname==='/api/admin/public-lead-summary'){
    if(request.method!=='GET')return methodNotAllowed();
    const actor=await requireAdminRequest(request,env);
    if(!['owner','admin','developer'].includes(String(actor?.role||'')))return json({error:'Somente administração pode consultar indicadores agregados de leads.'},403,{'cache-control':'no-store'});
    try{return json(await readPublicCommercialSummary(env),200,{'cache-control':'private, no-store'});}
    catch(error){return json({error:error?.message||'Não foi possível ler os indicadores de leads.'},502,{'cache-control':'no-store'});}
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

  if(pathname==='/api/runtime'&&request.method==='GET')return json({...getApiRuntime(env,url.origin),github:getGitHubRuntime(env)});
  if(pathname==='/api/ai/status'&&request.method==='GET')return json({...getApiRuntime(env,url.origin).ai,nvidia:getNvidiaRuntime(env)});


  if(pathname==='/api/public/lead-chat'&&request.method==='POST'){
    const payload=await body(request);
    // As etapas de identificação, documentos e sinal são eventos da mesma
    // conversa e podem chegar sem uma nova mensagem textual.
    if(!String(payload.message||'').trim()&&!payload.event&&!payload.attachment)return json({error:'Mensagem, evento ou imagem obrigatória.'},400);
    const attachment=payload.attachment?await holdImageInWorker(env,payload.attachment,{channel:'public-lead-chat',purpose:'commercial-conversation'}):null;
    if(payload.attachment&&!attachment)return json({error:'Imagem inválida. Use PNG, JPEG ou WEBP de até 6 MB.'},400);
    return json(await runPublicLeadConversation(env,{
      message:payload.message,
      session:payload.session||{},
      selectedLot:payload.selectedLot||null,
      event:payload.event||null,
      attachment:payload.attachment||null,
      attachmentRef:attachment
    }));
  }

  if(pathname==='/api/media/attachment'&&request.method==='GET'){
    await requireAdminRequest(request,env);
    const key=String(url.searchParams.get('key')||'').trim();
    if(!key.startsWith('attachments/admin-chat/'))return json({error:'Anexo não autorizado.'},403);
    const object=await getHeldImage(env,{key});
    if(!object)return json({error:'Anexo não encontrado.'},404);
    return new Response(object.body,{status:200,headers:{'content-type':object.httpMetadata?.contentType||'application/octet-stream','cache-control':'private, no-store','etag':object.httpEtag||''}});
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

  if(pathname==='/api/project-documents'||pathname.startsWith('/api/project-documents/')){
    const actor=await requireAdminRequest(request,env);
    if(!['owner','admin','developer'].includes(actor.role)||actor.userType==='foreman')return json({error:'Seu perfil não pode acessar o acervo do empreendimento.'},403);
    const privateHeaders={'cache-control':'private, no-store'};
    if(pathname==='/api/project-documents'){
      if(request.method==='GET')return json(await listProjectDocuments(env),200,privateHeaders);
      if(request.method==='POST')return json({document:await saveProjectDocument(env,await body(request))},201,privateHeaders);
      return methodNotAllowed();
    }
    if(pathname==='/api/project-documents/columns'&&request.method==='POST')return json({column:await createProjectDocumentColumn(env,await body(request))},201,privateHeaders);
    const columnMatch=pathname.match(/^\/api\/project-documents\/columns\/([^/]+)$/);
    if(columnMatch&&request.method==='DELETE')return await deleteProjectDocumentColumn(env,decodeURIComponent(columnMatch[1]))?json({ok:true},200,privateHeaders):notFound('Propriedade não encontrada.');
    const fileMatch=pathname.match(/^\/api\/project-documents\/([^/]+)\/file$/);
    if(fileMatch&&request.method==='GET'){
      const file=await getProjectDocumentFile(env,decodeURIComponent(fileMatch[1]));
      if(!file)return notFound('Arquivo não encontrado.');
      return new Response(file.content,{status:200,headers:{'content-type':file.fileType||'application/octet-stream','content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,'cache-control':'private, no-store'}});
    }
    const match=pathname.match(/^\/api\/project-documents\/([^/]+)$/);
    if(!match)return notFound('Documento não encontrado.');
    const id=decodeURIComponent(match[1]);
    if(request.method==='PUT'){
      if(!await getProjectDocument(env,id))return notFound('Documento não encontrado.');
      return json({document:await saveProjectDocument(env,{...await body(request),id})},200,privateHeaders);
    }
    if(request.method==='DELETE')return await deleteProjectDocument(env,id)?json({ok:true},200,privateHeaders):notFound('Documento não encontrado.');
    return methodNotAllowed();
  }

  if(pathname==='/api/lot-documents/upload'&&request.method==='POST'){
    await requireAdminRequest(request,env);
    const payload=await body(request);
    const document=await saveLotDocument(env,payload);
    return json({document},201);
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

  if(pathname==='/api/ai/dashboard-generation'&&request.method==='POST'){
    await requireAdminRequest(request,env);
    try{
      const payload=await body(request);
      return json(await generateDashboardPlanWithCloudflareAi(env,{kind:payload.kind||'complete'}));
    }catch(error){
      return json({error:String(error?.message||error),provider:'cloudflare-workers-ai'},Number(error?.statusCode)||502);
    }
  }

  if((pathname==='/api/ai'||pathname==='/api/ai/vision-reasoning'||pathname==='/api/gemini')&&request.method==='POST'){
    const actor=await requireAdminRequest(request,env);
    const payload=await body(request);
    const reasoningVision=pathname==='/api/ai/vision-reasoning';
    const delegated=actor.mode==='delegated-foreman-key',permissions=new Set(actor.permissions||[]);
    if(delegated){
      if(pathname==='/api/gemini')return json({error:'Esta rota não está disponível para chaves de encarregado.'},403);
      if(!['records','stages'].includes(String(payload.view||'')))return json({error:'A chave de encarregado só pode enviar notas e imagens no contexto de registros ou cronograma.'},403);
      if((reasoningVision||payload.attachment)&&!permissions.has('ai.photos'))return json({error:'Esta chave não tem permissão para enviar fotos à IA.'},403);
      if(!reasoningVision&&!payload.attachment&&!permissions.has('ai.notes'))return json({error:'Esta chave não tem permissão para enviar notas à IA.'},403);
    }
    if(reasoningVision&&!payload.attachment)return json({error:'A rota de leitura visual exige uma imagem ou nota PDF.'},400);
    const snapshot=delegated?null:await getOperationalSnapshot(env).catch(()=>null);
    const image=payload.attachment?normalizeImageAttachment(payload.attachment):null;
    const attachmentName=String(payload.attachment?.name||payload.attachment?.fileName||'');
    const attachmentMime=String(payload.attachment?.mimeType||payload.attachment?.type||'').toLowerCase();
    const isPdf=attachmentMime==='application/pdf'||/\.pdf$/i.test(attachmentName);
    const pdf=isPdf?normalizePdfAttachment({name:attachmentName,mimeType:'application/pdf',dataUrl:payload.attachment?.dataUrl}):null;
    if(payload.attachment&&!image&&!pdf)return json({error:isPdf?'PDF inválido ou maior que 1,45 MB.':'Imagem inválida. Use PNG, JPEG ou WEBP de até 6 MB.'},400);
    if(isPdf){
      let recordOcr;
      try{recordOcr=await extractInvoicePdfOcr(env,{attachment:pdf,context:{userDescription:payload.message,stages:payload.context?.stages||[]}});}
      catch(error){return json({error:String(error?.message||error),code:'invoice_pdf_read_failed'},Number(error?.statusCode)||422);}
      const firstItem=recordOcr.items?.[0],amount=(Number(recordOcr.totalAmountCents)||0)/100;
      const formattedAmount=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amount);
      const destination=recordOcr.destinationStageName||'Escritório';
      const itemSummary=firstItem?`${firstItem.description} · ${Number(firstItem.quantity)||0} ${firstItem.unit||'un.'} · ${formattedAmount}`:'itens aguardando conferência';
      const text=`Nota fiscal ${recordOcr.invoiceNumber||'sem número'} de ${recordOcr.supplier||'fornecedor não identificado'} lida com Cloudflare Workers AI: ${itemSummary}. Destino sugerido: ${destination}. Registro fica Pendente para revisão humana.`;
      return json({text,toolCalls:[],provider:recordOcr.provider,model:recordOcr.model||'',vision:false,reasoning:false,recordOcr,attachment:{id:pdf.id,name:pdf.name,mimeType:pdf.mimeType,sizeBytes:pdf.sizeBytes,stored:false,storage:'request-ephemeral',transport:'inline-data-url'},attachmentStorage:'pending-durable-upload'});
    }
    const serializedImage=image?{id:image.id,name:image.name,mimeType:image.mimeType,sizeBytes:image.sizeBytes,dataUrl:image.dataUrl,stored:false,storage:'request-ephemeral',transport:'inline-data-url'}:null;
    const recordOcrV21=image?await extractInstantRecordOcr(env,{attachment:serializedImage,context:{userDescription:payload.message,stages:payload.context?.stages||[],selectedStageKey:payload.context?.selectedStageKey||'',selectedStageName:payload.context?.selectedStageName||''}}).catch(error=>({error:String(error?.message||error),reviewRequired:true})):null;
    const recordInterpretationV21=image?buildRecordInterpretationV1({message:payload.message,stages:payload.context?.stages,selectedStageKey:payload.context?.selectedStageKey,recordOcr:recordOcrV21}):payload.context?.recordInterpretation||null;
    const modelContextV21=recordInterpretationV21?{...(payload.context||snapshot||{}),recordInterpretation:recordInterpretationV21}:payload.context||snapshot;
    const modelRequestContextV21=recordInterpretationV21?{...(payload.requestContext||{}),recordInterpretation:recordInterpretationV21}:payload.requestContext;
    if(payload.requestContext?.intent==='explain-current-work-state-and-next-step'){
      const result=await runWholeWorkJourneyExplanation(env,{
        message:payload.message,
        context:modelContextV21,
        instruction:payload.instruction||'',
        requestContext:modelRequestContextV21||null
      });
      return json(delegated?{...result,toolCalls:[],recordOcr:recordOcrV21}:{...result,recordOcr:recordOcrV21});
    }
    const result=await runOperationalAssistant(env,{message:payload.message,view:payload.view,context:modelContextV21,instruction:payload.instruction,requestContext:modelRequestContextV21,explain:url.searchParams.get('explain')==='1',reasoning:reasoningVision,attachment:serializedImage});
    const heldAttachmentV21=image?await holdImageInWorker(env,payload.attachment,{channel:'admin-chat',purpose:'record-ocr'}).catch(()=>null):null;
    return json({...result,...(delegated?{toolCalls:[]}:{}),endpoint:result.endpoint||env.NVIDIA_REASONING_API_URL||env.NVIDIA_API_URL||'https://integrate.api.nvidia.com/v1/chat/completions',reasoning:Boolean(reasoningVision&&image),recordOcr:recordOcrV21,attachment:heldAttachmentV21?{...heldAttachmentV21,dataUrl:undefined}:serializedImage?{...serializedImage,dataUrl:undefined}:null,attachmentStorage:heldAttachmentV21?.storage||(image?'request-ephemeral':null)});
  }


  // BELAVISTA_RECORD_OCR_DYNAMIC_V21
  if(pathname==='/api/records/ocr'&&request.method==='POST'){
    await requireAdminRequest(request,env);
    const payload=await body(request);
    const image=payload.attachment?normalizeImageAttachment(payload.attachment):null;
    if(!image)return json({error:'Imagem OCR inválida. Use PNG, JPEG ou WEBP de até 6 MB.'},400);
    const result=await extractInstantRecordOcr(env,{attachment:{name:image.name,mimeType:image.mimeType,dataUrl:image.dataUrl},context:payload.context||null});
    return json(result);
  }

  if(pathname==='/api/records'){
    const actor=await requireAdminRequest(request,env);
    if(request.method==='GET')return json({records:await listRecords(env)});
    if(request.method==='POST'){
      const payload=await body(request);
      if(actor.mode==='delegated-foreman-key'&&payload.evidence?.imageBase64&&!new Set(actor.permissions||[]).has('ai.photos'))return json({error:'Esta chave não pode anexar fotos ao registro.'},403);
      let recordAttachmentV21=null;
      if(payload.evidence?.imageBase64){
        const mimeType=String(payload.evidence.mimeType||'image/jpeg');
        const dataUrl='data:'+mimeType+';base64,'+String(payload.evidence.imageBase64||'');
        recordAttachmentV21=await holdImageInWorker(env,{name:payload.evidence.fileName||'registro.png',mimeType,dataUrl},{channel:'records',purpose:'record-evidence'});
        if(!recordAttachmentV21) return json({error:'Imagem do registro inválida.'},400);
        if(!recordAttachmentV21.stored||!recordAttachmentV21.reference){
          return json({error:'Armazenamento de evidências não configurado. O registro não foi criado.'},503);
        }
        payload.evidenceUri=recordAttachmentV21.reference;
      }
      const record=await insertRecord(env,payload);
      if(payload.evidence?.imageBase64||payload.evidenceUri)ctx.waitUntil(env.BELAVISTA_QUEUE?.send?.({kind:'record.digest',recordId:record.id,payload}));
      const itemProperty=(record.properties||[]).find(item=>item?.key==='items'&&Array.isArray(item?.value));
      const propagatedItemsV21=Array.isArray(itemProperty?.value)?itemProperty.value:[];
      return json({...record,propagatedItems:propagatedItemsV21,attachmentRef:recordAttachmentV21?{...recordAttachmentV21,dataUrl:undefined}:null},201);
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
    await requireAdminRequest(request,env);
    if(request.method==='PUT')return json(await updateRecord(env,recordId,await body(request)));
    if(request.method==='DELETE')return await deleteRecord(env,recordId)?json({ok:true,id:recordId}):notFound('Registro não encontrado.');
    return methodNotAllowed();
  }

  if(pathname==='/api/agenda-events'){
    await requireAdminRequest(request,env);
    if(request.method==='GET')return json({events:await listAgendaEvents(env)});
    if(request.method==='PUT')return json({events:await saveAgendaSnapshot(env,(await body(request)).events)});
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
      const evidenceSource=await digestImageSource(env,payload.payload?.evidenceUri);
      const digest=await runVisualDigest(env,{kind:'record-photo',imageBase64:payload.payload?.evidence?.imageBase64,imageUrl:evidenceSource,notes:payload.payload?.detalhes});
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
