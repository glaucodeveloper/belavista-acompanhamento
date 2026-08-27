import {
  deleteRecord,
  getApiRuntime,
  getOperationalSnapshot,
  insertBudgetLine,
  insertCashFlowEntry,
  insertNotification,
  insertRecord,
  insertStageAgendaItem,
  listBudgetLines,
  listCashFlowEntries,
  listNotifications,
  listRecords,
  listStageAgendaItems,
  updateRecord
} from './storage.js';
import {buildBudgetSummary} from './budget.js';
import {buildNotificationsFromSnapshot} from './notifications.js';
import {buildCorrelationSummary} from './correlation.js';
import {runOperationalAssistant, runVisualDigest} from './nvidia.js';

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

  if(pathname==='/api/runtime'&&request.method==='GET')return json(getApiRuntime(env,url.origin));
  if(pathname==='/api/ai/status'&&request.method==='GET')return json(getApiRuntime(env,url.origin).ai);

  if(pathname==='/api/ai'&&request.method==='POST'){
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
    return json({digest},202);
  }

  if(pathname==='/api/intake/purchase-receipt'&&request.method==='POST'){
    const payload=await body(request);
    const digest=await runVisualDigest(env,{kind:'purchase-receipt',imageBase64:payload.imageBase64,imageUrl:payload.imageUrl,notes:payload.notes});
    return json({digest},202);
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
    }
    message.ack?.();
  }
}

export async function handleScheduled(_controller,env){
  const snapshot=await getOperationalSnapshot(env);
  const notifications=buildNotificationsFromSnapshot(snapshot);
  await Promise.all(notifications.map(item=>insertNotification(env,item)));
}
