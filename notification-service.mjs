import {pendingOutbox,completeOutbox,devicesForRole} from './operational-engine.mjs';

let runtimePromise;
async function runtime(){
  if(!process.env.FIREBASE_DATABASE_URL)return null;
  return runtimePromise||(runtimePromise=(async()=>{
    const [{getApps,initializeApp,applicationDefault,cert},{getDatabase},{getMessaging}]=await Promise.all([
      import('firebase-admin/app'),import('firebase-admin/database'),import('firebase-admin/messaging')
    ]);
    if(!getApps().length){const inline=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'').trim();initializeApp({credential:inline?cert(JSON.parse(inline)):applicationDefault(),databaseURL:process.env.FIREBASE_DATABASE_URL});}
    return {database:getDatabase(),messaging:getMessaging()};
  })());
}

export async function dispatchNotificationOutbox(){
  const service=await runtime().catch(()=>null),rows=pendingOutbox();let delivered=0,pending=0,failed=0;
  for(const row of rows){
    const devices=devicesForRole(row.recipient_role);
    if(!service||!devices.length){completeOutbox(row.outboxId,false,!service?'Firebase Admin não configurado.':'Nenhum dispositivo registrado para o perfil.');pending++;continue;}
    try{
      const payload={id:row.id,type:row.type,severity:row.severity,title:row.title,message:row.message,actionUrl:row.action_url,createdAt:row.created_at,status:'unread'};
      await Promise.all(devices.map(device=>service.database.ref(`notifications/${device.uid}/${row.id}`).set(payload)));
      const tokens=[...new Set(devices.map(item=>item.fcmToken).filter(Boolean))];
      if(tokens.length)await service.messaging.sendEachForMulticast({tokens,notification:{title:row.title,body:row.message},data:{notificationId:row.id,actionUrl:row.action_url,type:row.type,severity:row.severity},webpush:{fcmOptions:{link:row.action_url}}});
      completeOutbox(row.outboxId,true);delivered++;
    }catch(error){completeOutbox(row.outboxId,false,error.message);failed++;}
  }
  return {processed:rows.length,delivered,pending,failed,firebaseConfigured:Boolean(service)};
}

