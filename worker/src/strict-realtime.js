// BELAVISTA_STRICT_REALTIME_V4
// Publishes the exact AI-produced state. It does not recalculate agenda or notifications.

const DEFAULT_DATABASE_URL='https://belavista-3f887-default-rtdb.firebaseio.com';
const clean=value=>String(value??'').trim();
const safeKey=value=>clean(value).replace(/[.#$\[\]/]/g,'-').slice(0,180)||'unknown';
const safePath=value=>clean(value).split('/').filter(Boolean).map(safeKey).join('/');

function databaseUrl(env){return clean(env.FIREBASE_DATABASE_URL||DEFAULT_DATABASE_URL).replace(/\/+$/,'');}

export async function publishStrictOperationalState(env,{state,event,inference,namespace='operational'}={}){
  if(!state?.version)throw new Error('Estado inferido sem version não pode ser publicado.');
  const root=safePath(namespace||'operational');
  const eventId=safeKey(event?.id||`EV-${Date.now()}`);
  const statePath=`${root}/operationalSnapshots/fullState`;
  const eventPath=`${root}/operationalEvents/${eventId}`;
  const updates={
    [statePath]:state,
    [eventPath]:{
      id:eventId,type:event?.type||'operation.state.transitioned',at:event?.at||new Date().toISOString(),
      stateVersion:state.version,provider:inference?.provider||'nvidia-api',model:inference?.model||'',
      source:'belavista-cloudflare-worker'
    }
  };

  for(const notification of Array.isArray(state.notifications)?state.notifications:[]){
    const id=safeKey(notification.id||`NTF-${Math.random().toString(36).slice(2)}`);
    const recipient=safeKey(notification.recipientId||notification.personId||notification.foremanId||notification.recipientRole||notification.role||'admin');
    updates[`${root}/notifications/${recipient}/${id}`]={...notification,id,stateVersion:state.version,source:'belavista-cloudflare-worker'};
  }
  for(const item of Array.isArray(state.agenda)?state.agenda:[]){
    const id=safeKey(item.id||item.activityId||`AGENDA-${Math.random().toString(36).slice(2)}`);
    const assignees=[...(Array.isArray(item.assigneeIds)?item.assigneeIds:[]),item.foremanId,item.encarregadoId].filter(Boolean);
    for(const personId of assignees)updates[`${root}/agenda/${safeKey(personId)}/${id}`]={...item,id,stateVersion:state.version,source:'belavista-cloudflare-worker'};
  }

  const auth=clean(env.FIREBASE_DATABASE_AUTH||env.FIREBASE_RTDB_AUTH_TOKEN);
  const endpoint=`${databaseUrl(env)}/.json${auth?`?auth=${encodeURIComponent(auth)}`:''}`;
  const response=await fetch(endpoint,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(updates)});
  if(!response.ok){
    const detail=await response.text().catch(()=>`HTTP ${response.status}`);
    throw new Error(`Firebase RTDB recusou strict state: ${detail.slice(0,500)}`);
  }
  return {statePath,eventPath,namespace:root,notificationCount:(state.notifications||[]).length,agendaCount:(state.agenda||[]).length};
}
