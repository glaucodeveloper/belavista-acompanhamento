// Publica eventos comerciais do atendimento sem expor documentos ou contexto
// administrativo. O lead/reserva já foi persistido antes desta etapa.

const DEFAULT_DATABASE_URL='https://belavista-3f887-default-rtdb.firebaseio.com';
const text=(value,max=500)=>String(value??'').trim().slice(0,max);
const safeKey=value=>text(value,180).replace(/[.#$\[\]/]/g,'-')||'unknown';
const databaseUrl=env=>text(env.FIREBASE_DATABASE_URL||DEFAULT_DATABASE_URL,500).replace(/\/+$/,'');
const channels=env=>text(env.FIREBASE_LEAD_NOTIFICATION_CHANNELS||'owner,admin,commercial',500).split(',').map(safeKey).filter(Boolean);

export async function publishPublicCommercialEvent(env,{type='lead.intent.detected',session={},lead={},reservation={},lot=null,message='',notification={}}={}){
  const eventId=safeKey(`EVT-${session.id||lead.id||Date.now()}`),notificationId=safeKey(`NTF-${eventId}`),createdAt=new Date().toISOString();
  const base={
    id:notificationId,type,category:'commercial-lead',severity:text(notification.severity||'action',30),
    title:text(notification.title||'Atualização de atendimento',180),
    message:text(notification.message||message,1200),entityType:'public-lead',
    entityId:text(lead.id||session.id,180),lotId:text(reservation.lotId||lot?.id||lot?.code,180),
    status:'unread',source:'belavista-cloudflare-worker',createdAt
  };
  const updates={
    [`operationalEvents/${eventId}`]:{id:eventId,type,entityType:'public-lead',entityId:base.entityId,lotId:base.lotId,source:'belavista-cloudflare-worker',createdAt},
    [`notificationAreas/commercial/${notificationId}`]:{...base,role:'commercial',area:'commercial'}
  };
  if(lead.id&&lead.name){
    updates[`publicLeads/${safeKey(lead.id)}`]={
      id:text(lead.id,120),name:text(lead.name,120),whatsapp:text(lead.whatsapp,40),
      email:text(lead.email,160),instagramHandle:text(lead.instagramHandle,60),
      objective:text(lead.objective,80),lot:text(reservation.lotId||lot?.label||lot?.code||lot?.id,120),
      status:type==='lot.reserved'?'Reserva em análise':'Novo',
      conversationSummary:text(session.conversationSummary,1400),
      sessionId:text(session.id,120),source:'Página pública',createdAt
    };
  }
  for(const role of channels(env))updates[`notifications/${role}/${notificationId}`]={...base,role};
  const auth=text(env.FIREBASE_AUTH_TOKEN,1000),endpoint=`${databaseUrl(env)}/.json${auth?`?auth=${encodeURIComponent(auth)}`:''}`;
  const response=await fetch(endpoint,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(updates)});
  if(!response.ok){const detail=await response.text().catch(()=>`HTTP ${response.status}`);throw new Error(`Firebase Realtime Database recusou evento comercial: ${detail.slice(0,240)}`);}
  return {published:true,eventId,notificationId,channels:channels(env),area:'commercial'};
}
