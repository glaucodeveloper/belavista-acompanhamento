const DEFAULT_DATABASE_URL='https://belavista-3f887-default-rtdb.firebaseio.com';
const DEFAULT_CHANNELS=['owner','admin','foreman','supplies','commercial'];

const text=(value,max=240)=>String(value??'').trim().slice(0,max);
const safeKey=value=>text(value,160).replace(/[.#$\[\]/]/g,'-')||'unknown';
const safePath=value=>String(value||'').split('/').filter(Boolean).map(safeKey).join('/');
const scoped=(namespace,path)=>{const prefix=safePath(namespace);return prefix?`${prefix}/${path}`:path;};

function databaseUrl(env){
  return text(env.FIREBASE_DATABASE_URL||DEFAULT_DATABASE_URL,500).replace(/\/+$/,'');
}

function notificationChannels(env){
  const configured=text(env.FIREBASE_NOTIFICATION_CHANNELS,500)
    .split(',')
    .map(item=>safeKey(item))
    .filter(Boolean);
  return configured.length?configured:DEFAULT_CHANNELS;
}

export async function publishPlanningRealtime(env,{run,plan,explanation,notifications=[]}={}){
  const eventId=safeKey(run?.id||`PLAN-${Date.now()}`);
  const createdAt=run?.createdAt||new Date().toISOString();
  const updates={
    [`operationalEvents/${eventId}`]:{
      id:eventId,
      type:'material-planning.completed',
      source:'belavista-cloudflare-worker',
      provider:explanation?.provider||'deterministic',
      cashState:plan?.cashState||'unknown',
      decisionCount:Array.isArray(plan?.decisions)?plan.decisions.length:0,
      createdAt
    },
    'operationalSnapshots/materialPlanning':{
      decisionRunId:eventId,
      source:'belavista-cloudflare-worker',
      provider:explanation?.provider||'deterministic',
      cashState:plan?.cashState||'unknown',
      availableCents:Number(plan?.availableCents)||0,
      reserveCents:Number(plan?.reserveCents)||0,
      materialNeedCents:Number(plan?.materialNeedCents)||0,
      allocatedCents:Number(plan?.allocatedCents)||0,
      coverage:Number(plan?.coverage)||0,
      createdAt
    }
  };

  for(const channel of notificationChannels(env)){
    for(const notification of notifications){
      const notificationId=safeKey(notification.id);
      updates[`notifications/${channel}/${notificationId}`]={
        ...notification,
        id:notificationId,
        role:channel,
        status:'unread',
        source:'belavista-cloudflare-worker',
        decisionRunId:eventId,
        createdAt
      };
    }
  }

  const auth=env.FIREBASE_DATABASE_AUTH?`?auth=${encodeURIComponent(env.FIREBASE_DATABASE_AUTH)}`:'';
  const response=await fetch(`${databaseUrl(env)}/.json${auth}`,{
    method:'PATCH',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(updates)
  });
  if(!response.ok){
    const detail=await response.text().catch(()=>`HTTP ${response.status}`);
    throw new Error(`Firebase Realtime Database recusou a publicação: ${detail.slice(0,240)}`);
  }
  return {eventId,channels:notificationChannels(env),notificationCount:notifications.length};
}


export async function publishOperationalLoopRealtime(env,{loopId,trigger,report,explanation,namespace=''}={}){
  const eventId=safeKey(loopId||`LOOP-${Date.now()}`);
  const createdAt=new Date().toISOString();
  const updates={
    [scoped(namespace,`operationalEvents/${eventId}`)]:{id:eventId,type:'operational-loop.completed',trigger,source:'belavista-cloudflare-worker',provider:explanation?.provider||'deterministic',createdAt},
    [scoped(namespace,'operationalSnapshots/operationalLoop')]:{
      loopId:eventId,trigger,source:'belavista-cloudflare-worker',provider:explanation?.provider||'deterministic',createdAt,
      summary:explanation?.summary||'',cash:report?.cash||{},
      canDoNow:(report?.canDoNow||[]).map(i=>({stage:i.stageName,activity:i.title,startDate:i.startDate,endDate:i.endDate,status:i.status})),
      blocked:(report?.blocked||[]).map(i=>({stage:i.stageName,activity:i.title||'',reasons:i.reasons||[]}))
    }
  };
  for(const item of report?.agenda||[]){
    const role=safeKey(item.role||'admin'),id=safeKey(item.id);
    updates[scoped(namespace,`agendas/${role}/${id}`)]={...item,id,role,loopId:eventId,source:'belavista-cloudflare-worker',updatedAt:createdAt};
  }
  for(const item of report?.notifications||[]){
    const role=safeKey(item.role||'admin'),id=safeKey(item.id);
    updates[scoped(namespace,`notifications/${role}/${id}`)]={...item,id,role,status:'unread',loopId:eventId,source:'belavista-cloudflare-worker',createdAt};
  }
  const auth=env.FIREBASE_DATABASE_AUTH?`?auth=${encodeURIComponent(env.FIREBASE_DATABASE_AUTH)}`:'';
  const response=await fetch(`${databaseUrl(env)}/.json${auth}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(updates)});
  if(!response.ok){const detail=await response.text().catch(()=>`HTTP ${response.status}`);throw new Error(`Firebase Realtime Database recusou o operational-loop: ${detail.slice(0,240)}`);}
  return {eventId,namespace:safePath(namespace),agendaCount:report?.agenda?.length||0,notificationCount:report?.notifications?.length||0};
}


// BELAVISTA_LEAD_REALTIME_V5342
function leadNotificationChannels(env){
  const configured=text(env.FIREBASE_LEAD_NOTIFICATION_CHANNELS,500).split(',').map(item=>safeKey(item)).filter(Boolean);
  return configured.length?configured:['owner','admin','commercial'];
}
function firebaseWriteUrl(env){
  const base=`${databaseUrl(env)}/.json`,token=text(env.FIREBASE_AUTH_TOKEN,1000);
  return token?`${base}?auth=${encodeURIComponent(token)}`:base;
}
export async function publishLeadRealtime(env,{lead}={}){
  const leadId=safeKey(lead?.id||`LEAD-${Date.now()}`),eventId=safeKey(`EVT-${leadId}`),notificationId=safeKey(`NTF-${leadId}`);
  const createdAt=lead?.createdAt||new Date().toISOString(),lot=text(lead?.selectedLot||lead?.selectedLotId||'Lote a definir',120),name=text(lead?.name||'Novo interessado',120),channels=leadNotificationChannels(env);
  const baseNotification={id:notificationId,type:'commercial.lead.registered',category:'commercial-lead',severity:'action',title:'Novo lead do mapa público',message:`${name} registrou intenção comercial para ${lot}.`,actionUrl:'/admin',entityType:'public-lead',entityId:leadId,status:'unread',source:'belavista-cloudflare-worker',createdAt,metadata:{leadId,lot,whatsappLast4:text(lead?.whatsappLast4,8),repoPath:text(lead?.repoPath,500),repoCommitSha:text(lead?.repoCommitSha,100)}};
  const updates={
    [`operationalEvents/${eventId}`]:{id:eventId,type:'commercial.lead.registered',entityType:'public-lead',entityId:leadId,lot,repoPath:text(lead?.repoPath,500),source:'belavista-cloudflare-worker',createdAt},
    [`notificationAreas/commercial/${notificationId}`]:{...baseNotification,role:'commercial',area:'commercial'}
  };
  for(const channel of channels)updates[`notifications/${channel}/${notificationId}`]={...baseNotification,role:channel,destinationUid:channel};
  const response=await fetch(firebaseWriteUrl(env),{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(updates)});
  if(!response.ok){const detail=await response.text().catch(()=>`HTTP ${response.status}`);throw new Error(`Firebase Realtime Database recusou lead realtime: ${detail.slice(0,240)}`);}
  return {published:true,eventId,notificationId,channels,area:'commercial'};
}
