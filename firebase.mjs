import {apiFetch, firebaseMessagingVapidKey} from './api-client.mjs';

const SDK_VERSION='12.16.0';
const FIREBASE_CONFIG={
  apiKey:'AIzaSyAtbLAkqya5XIDfSDHovvhCr9pReAr_XgQ',
  authDomain:'belavista-3f887.firebaseapp.com',
  databaseURL:'https://belavista-3f887-default-rtdb.firebaseio.com',
  projectId:'belavista-3f887',
  storageBucket:'belavista-3f887.firebasestorage.app',
  messagingSenderId:'76119600966',
  appId:'1:76119600966:web:b4cc29460cf78fec173f47',
  measurementId:'G-834JNQKQZF'
};

let runtimePromise;
const DEVICE_INSTALLATION_KEY='belavista.device.installation.v1';
const DEVICE_CHANNEL_UID_KEY='belavista.device.channel.uid.v1';
const DEVICE_CHANNEL_ROLE_KEY='belavista.device.channel.role.v1';
const SETTINGS_KEY='belavista.integrations.v1';
const DEFAULT_PROJECT_ID='project-alianca-park';
const loadRuntime=()=>runtimePromise||(runtimePromise=(async()=>{
  const [appSdk,databaseSdk,authSdk,storageSdk]=await Promise.all([
    import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
    import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-database.js`),
    import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
    import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-storage.js`)
  ]);
  const app=appSdk.initializeApp(FIREBASE_CONFIG);
  // Prefer RTDB WebSocket in browser/TWA. Firebase long-polling creates a
  // cross-origin hidden iframe that Chrome reports as an unload policy violation.
  if(typeof globalThis.WebSocket==='function'&&typeof databaseSdk.forceWebSockets==='function'){
    databaseSdk.forceWebSockets();
  }
  const auth=authSdk.getAuth(app);
  // Capacitor mobile requires a durable Firebase session. Never report a
  // successful mobile login if WebView storage cannot persist across restarts.
  const persistentAuthPersistence=authSdk.indexedDBLocalPersistence||authSdk.browserLocalPersistence;
  if(typeof authSdk.setPersistence==='function'&&persistentAuthPersistence){
    try{await authSdk.setPersistence(auth,persistentAuthPersistence);}
    catch(error){
      if(globalThis.BELAVISTA_CAPACITOR_NATIVE===true){
        throw new Error('Não foi possível habilitar o login persistente neste aparelho. Verifique o armazenamento do aplicativo e tente novamente.',{cause:error});
      }
      console.info('Persistência local do Firebase indisponível neste contexto.',error);
    }
  }else if(globalThis.BELAVISTA_CAPACITOR_NATIVE===true){
    throw new Error('O Firebase não disponibilizou um mecanismo de login persistente para este aplicativo.');
  }
  import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-analytics.js`).then(sdk=>{try{sdk.getAnalytics(app);}catch(error){console.info('Firebase Analytics indisponível neste contexto.',error);}}).catch(()=>{});
  const db=databaseSdk.getDatabase(app);
  return {app,auth,db,storage:storageSdk.getStorage(app),...authSdk,...storageSdk,...databaseSdk,ref:databaseSdk.ref,storageRef:storageSdk.ref};
})().catch(error=>{runtimePromise=null;throw error;}));

const text=(value,max=240)=>String(value??'').trim().slice(0,max);
const digitsOnly=value=>String(value??'').replace(/\D/g,'');
const slug=value=>text(value,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9/_-]+/g,'-').replace(/^-+|-+$/g,'');
const readIntegrationSettings=()=>{
  try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');}
  catch{return {};}
};
const readStoredInstallationId=()=>localStorage.getItem(DEVICE_INSTALLATION_KEY)||'';
const ensureInstallationId=()=>{
  let installationId=readStoredInstallationId();
  if(!installationId){
    installationId=crypto.randomUUID();
    localStorage.setItem(DEVICE_INSTALLATION_KEY,installationId);
  }
  return installationId;
};
const rememberOperationalChannel=device=>{
  if(device?.uid)localStorage.setItem(DEVICE_CHANNEL_UID_KEY,String(device.uid));
  if(device?.role)localStorage.setItem(DEVICE_CHANNEL_ROLE_KEY,String(device.role));
};
const readOperationalChannel=(actor={})=>({
  uid:String(actor.uid||localStorage.getItem(DEVICE_CHANNEL_UID_KEY)||'').trim(),
  role:String(actor.role||localStorage.getItem(DEVICE_CHANNEL_ROLE_KEY)||'').trim(),
  installationId:ensureInstallationId()
});
const asJson=value=>JSON.parse(JSON.stringify(value??null));
const channelUidForRole=(role,settings,authUid='')=>{
  const normalized=slug(role).split('/').pop();
  if(normalized==='owner')return text(settings.ownerNotificationUid||authUid,160);
  if(normalized==='admin')return text(settings.adminNotificationUid||authUid,160);
  if(normalized==='foreman')return text(settings.foremanNotificationUid||authUid,160);
  if(normalized==='developer')return text(authUid,160);
  return '';
};
const notificationEnvelope=(item={},context={})=>({
  id:text(item.id||`${slug(item.type||'notification')}-${Date.now()}`,120),
  type:text(item.type||'operational.notice',80),
  severity:text(item.severity||'info',40),
  title:text(item.title||'Atualização operacional',180),
  message:text(item.message||'',1200),
  actionUrl:text(item.actionUrl||'/',240),
  role:text(item.role||context.role||'owner',40),
  source:text(context.source||'belavista-client-operational',80),
  loopId:text(context.loopId||'',120),
  reason:text(context.reason||'',80),
  projectId:text(context.projectId||DEFAULT_PROJECT_ID,120),
  stageKey:text(item.stageKey||context.stageKey||'',80),
  createdAt:context.createdAt,
  status:'unread'
});
const resolveChannelUid=(actor={},settings={},installationId='')=>{
  const role=text(actor.role||localStorage.getItem(DEVICE_CHANNEL_ROLE_KEY)||'owner',40);
  return text(
    actor.uid||
    channelUidForRole(role,settings,'')||
    localStorage.getItem(DEVICE_CHANNEL_UID_KEY)||
    installationId||
    `device-${Date.now()}`,
    160
  );
};

export async function savePublicLead(input={}){
  const runtime=await loadRuntime();
  const leadRef=runtime.push(runtime.ref(runtime.db,'publicLeads'));
  const payload={
    name:text(input.name,120),
    whatsapp:text(input.whatsapp,40),
    instagramHandle:text(input.instagramHandle||input.instagram,60),
    email:text(input.email,160).toLowerCase(),
    objective:text(input.objective,60),
    sun:text(input.sun,30),
    altitude:text(input.altitude,40),
    terrain:text(input.terrain,40),
    budget:text(input.budget,60),
    notes:text(input.notes||input.chatIntent,500),
    conversation:text(input.chatIntent,500),
    source:'belavista-public-lead',
    createdAt:runtime.serverTimestamp(),
    updatedAt:runtime.serverTimestamp()
  };
  await runtime.set(leadRef,payload);
  return leadRef.key;
}

export async function askLeadAssistant(message,context={}){
  const payload={message:text(message,800),context:{objective:text(context.objective,60),budget:text(context.budget,80),sun:text(context.sun,30)}};
  const response=await apiFetch('/api/public/lead-chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error||`Atendimento respondeu ${response.status}.`);}
  return response.json();
}

const reservationFileKinds=new Set(['identityFront','identityBack','addressProof','paymentProof']);

export async function savePublicReservation(input={},files={}){
  const runtime=await loadRuntime();
  const reservationRef=runtime.push(runtime.ref(runtime.db,'publicReservations'));
  const reservationId=reservationRef.key;
  const documents={};
  for(const [kind,file] of Object.entries(files||{})){
    if(!reservationFileKinds.has(kind)||!file)continue;
    const allowed=String(file.type||'').startsWith('image/')||String(file.type||'')==='application/pdf';
    if(!allowed||file.size>12*1024*1024)throw new Error('Cada documento deve ser uma imagem ou PDF de até 12 MB.');
    const safeName=String(file.name||`${kind}.bin`).replace(/[^a-z0-9._-]/gi,'-').slice(-96);
    const storageRef=runtime.storageRef(runtime.storage,`publicReservations/${reservationId}/${kind}-${Date.now()}-${safeName}`);
    await runtime.uploadBytes(storageRef,file,{contentType:file.type||'application/octet-stream'});
    documents[kind]={name:text(file.name,120),contentType:text(file.type,80),size:Number(file.size)||0,storagePath:storageRef.fullPath,url:await runtime.getDownloadURL(storageRef)};
  }
  const cpf=digitsOnly(input.cpf);
  const payload={
    fullName:text(input.fullName||input.name,120),
    cpfLast4:cpf.slice(-4),
    birthDate:text(input.birthDate,20),
    lot:text(input.lot,60),
    whatsapp:text(input.whatsapp,40),
    email:text(input.email,160).toLowerCase(),
    objective:text(input.objective,60),
    status:text(input.status||'Documentos em análise',60),
    reviewResult:text(input.reviewResult,80),
    lastInteraction:'Documentos enviados para conferência cadastral',
    pixTxid:text(input.pixTxid,25),
    pixPayload:text(input.pixPayload,700),
    documents,
    consent:true,
    source:'belavista-public-reservation',
    createdAt:runtime.serverTimestamp(),
    updatedAt:runtime.serverTimestamp()
  };
  await runtime.set(reservationRef,payload);
  return reservationId;
}

export async function savePublicFieldRecord(input={},photoFile=null){
  const runtime=await loadRuntime();
  if(photoFile && (!String(photoFile.type||'').startsWith('image/') || photoFile.size>12*1024*1024)){
    throw new Error('A foto deve ser uma imagem de até 12 MB.');
  }
  const recordRef=runtime.push(runtime.ref(runtime.db,'publicFieldRecords'));
  const recordId=recordRef.key;
  let photo=null;
  if(photoFile){
    const safeName=String(photoFile.name||'evidencia.jpg').replace(/[^a-z0-9._-]/gi,'-').slice(-96);
    const storageRef=runtime.storageRef(runtime.storage,`publicFieldRecords/${recordId}/${Date.now()}-${safeName}`);
    await runtime.uploadBytes(storageRef,photoFile,{contentType:photoFile.type||'image/jpeg'});
    photo={
      name:text(photoFile.name,120),
      contentType:text(photoFile.type,80),
      size:Number(photoFile.size)||0,
      storagePath:storageRef.fullPath,
      url:await runtime.getDownloadURL(storageRef)
    };
  }
  const payload={
    project:text(input.project,100),
    stage:text(input.stage,100),
    activity:text(input.activity,140),
    category:text(input.category,100),
    responsible:text(input.responsible,120),
    date:text(input.date,20),
    time:text(input.time,12),
    progress:Math.max(0,Math.min(100,Number(input.progress)||0)),
    status:text(input.status,40),
    details:text(input.details,1200),
    photo,
    source:'belavista-twa-field-record',
    createdAt:runtime.serverTimestamp(),
    updatedAt:runtime.serverTimestamp()
  };
  await runtime.set(recordRef,payload);
  return recordId;
}

// BELAVISTA_OPERATIONAL_PROPOSAL_STORAGE_V1
export async function saveOperationalProposal(input={},files=[],actor={}){
  const runtime=await loadRuntime(),proposalRef=runtime.push(runtime.ref(runtime.db,'operationalProposals')),proposalId=proposalRef.key,attachments=[];
  for(const file of files||[]){
    if(!file||file.size>12*1024*1024)throw new Error('Cada anexo deve ter no máximo 12 MB.');
    const safeName=String(file.name||'anexo').replace(/[^a-z0-9._-]/gi,'-').slice(-96),storageRef=runtime.storageRef(runtime.storage,`operationalProposals/${actor.uid||'unknown'}/${proposalId}/${safeName}`);
    await runtime.uploadBytes(storageRef,file,{contentType:file.type||'application/octet-stream'});
    attachments.push({name:file.name||safeName,type:file.type||'',size:Number(file.size)||0,storagePath:storageRef.fullPath,url:await runtime.getDownloadURL(storageRef)});
  }
const payload={...input,uid:String(actor.uid||''),profile:String(input.profile||''),attachments,inference:input.inference&&typeof input.inference==='object'?input.inference:null,source:'belavista-twa-proposal',createdAt:runtime.serverTimestamp(),updatedAt:runtime.serverTimestamp()};
  await runtime.set(proposalRef,payload);
  return {id:proposalId,attachments};
}

export async function saveFieldConfirmation(input={}){
  const runtime=await loadRuntime();
  const services=Array.isArray(input.servicos)?input.servicos.map(item=>text(item,120)).filter(Boolean).slice(0,12):[];
  if(!input.confirmed||!services.length)throw new Error('Confirme o serviço e selecione os itens conferidos.');
  const ref=runtime.push(runtime.ref(runtime.db,'fieldConfirmations'));
  const stage=text(input.etapa,100),stageKey=stage.toLocaleLowerCase('pt-BR');
  const propagated=[{type:'record',message:'Registro auditável encaminhado ao painel operacional.'}];
  if(stageKey.includes('água')||stageKey.includes('agua')||stageKey.includes('drenagem'))propagated.push({type:'dependency',message:'Checagem de liberação antes da pavimentação foi solicitada.'});
  if(stageKey.includes('elétrica')||stageKey.includes('eletrica'))propagated.push({type:'dependency',message:'Requisitos e prazo de ligação Coelba foram sinalizados.'});
  const {evidence:evidenceFile,...safeInput}=input;
  const payload={...safeInput,responsavel:text(input.responsavel,120),etapa:stage,atividade:text(input.atividade,140),detalhes:text(input.detalhes,1200),servicos,progresso:Math.max(0,Math.min(100,Number(input.progresso)||0)),source:'belavista-github-field-portal',propagated,createdAt:runtime.serverTimestamp(),updatedAt:runtime.serverTimestamp()};
  delete payload.evidenceUri;
  await runtime.set(ref,payload);
  return {record:{id:ref.key},propagated};
}

export async function subscribePublicLeads(onChange){
  const runtime=await loadRuntime();
  if(!runtime?.db||typeof runtime.ref!=='function'||typeof runtime.onValue!=='function'){
    console.info('Firebase Realtime Database indisponível; leads em tempo real desativados.');
    return ()=>{};
  }
  return runtime.onValue(runtime.ref(runtime.db,'publicLeads'),snapshot=>onChange(snapshot.val()||{}));
}

export async function subscribePublicReservations(onChange){
  const runtime=await loadRuntime();
  return runtime.onValue(runtime.ref(runtime.db,'publicReservations'),snapshot=>onChange(snapshot.val()||{}));
}

export async function registerOperationalDevice(actor={}){
  if(!('serviceWorker' in navigator))throw new Error('Este navegador não oferece Service Worker.');
  const runtime=await loadRuntime(),registration=await navigator.serviceWorker.ready;
  let fcmToken='',permission=typeof Notification==='undefined'?'unsupported':Notification.permission;
  if(typeof Notification!=='undefined'&&permission!=='granted')permission=await Notification.requestPermission();
  const vapidKey=firebaseMessagingVapidKey();
  if(permission==='granted'&&vapidKey){
    const messagingSdk=await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-messaging.js`);
    if(await messagingSdk.isSupported())fcmToken=await messagingSdk.getToken(messagingSdk.getMessaging(runtime.app),{vapidKey,serviceWorkerRegistration:registration});
  }
  const installationId=ensureInstallationId();
  const settings=readIntegrationSettings();
  const channelUid=resolveChannelUid(actor,settings,installationId);
  const device={
    uid:channelUid,
    role:text(actor.role||'foreman',40),
    actorUid:text(actor.uid||'',120),
    actorName:text(actor.name||'Dispositivo',120),
    actorLabel:text(actor.label||'',120),
    installationId,
    fcmToken,
    platform:'web',
    permission,
    source:'belavista-client-device',
    updatedAt:runtime.serverTimestamp()
  };
  await runtime.set(runtime.ref(runtime.db,`operationalDevices/${channelUid}/${installationId}`),device);
  await runtime.set(runtime.ref(runtime.db,`metadata/${channelUid}`),{
    uid:channelUid,
    role:device.role,
    actorUid:device.actorUid,
    actorName:device.actorName,
    actorLabel:device.actorLabel,
    installationId,
    pushEnabled:Boolean(fcmToken),
    updatedAt:runtime.serverTimestamp(),
    source:'belavista-client-device'
  });
  rememberOperationalChannel({uid:channelUid,role:device.role});
  return {device,permission,pushEnabled:Boolean(fcmToken),realtime:true,source:'firebase-client'};
}

// BELAVISTA_ADMIN_TWA_AUTH_V1
// O TWA administrativo usa Firebase Auth e custom claim `role`; a role enviada
// ao Worker nunca é escolhida livremente pelo formulário do dispositivo.
const normalizeAuthRole=value=>{
  const role=String(value||'').trim().toLocaleLowerCase('pt-BR');
  return role==='administrador'?'admin':role==='encarregado'?'foreman':['developer','desenvolvimento','desenvolvedor','ti','dev'].includes(role)?'developer':['corretor','corretora','vendedor','vendedora','sales'].includes(role)?'sales':role==='comercial'?'commercial':role;
};
const normalizeAuthUserType=value=>['encarregado','foreman'].includes(String(value||'').trim().toLocaleLowerCase('pt-BR'))?'foreman':'';
const userTypeFromClaims=(claims={},role='')=>normalizeAuthUserType(claims.userType||claims.user_type||claims['https://belavista/userType']||role);
const LOCAL_DEVELOPER_EMAIL='icaroglaucooliveira@gmail.com';
const isLocalDeveloper=(email)=>typeof location!=='undefined'&&/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(String(location.hostname||''))&&String(email||'').trim().toLocaleLowerCase('pt-BR')===LOCAL_DEVELOPER_EMAIL;
export async function signInOperationalUser(email,password,allowedRoles=['admin','foreman','owner','developer','sales','commercial']){
  const runtime=await loadRuntime();
  const credential=await runtime.signInWithEmailAndPassword(runtime.auth,String(email||'').trim(),String(password||''));
  const tokenResult=await credential.user.getIdTokenResult(true);
  const claimedRole=normalizeAuthRole(tokenResult.claims?.role||tokenResult.claims?.userRole||tokenResult.claims?.['https://belavista/role']);
  const userType=userTypeFromClaims(tokenResult.claims||{},claimedRole);
  const role=isLocalDeveloper(credential.user.email||email)?'developer':claimedRole==='foreman'?'admin':claimedRole;
  if(!allowedRoles.includes(role)){
    await runtime.signOut(runtime.auth);
    throw new Error('Usuário autenticado sem perfil administrativo autorizado.');
  }
  return {user:credential.user,role,userType,token:await credential.user.getIdToken(),claims:tokenResult.claims||{}};
}
export async function restoreOperationalUser(allowedRoles=['admin','foreman','owner','developer','sales','commercial']){
  const runtime=await loadRuntime();
  const user=await new Promise(resolve=>{
    let settled=false;
    // Alguns builds do SDK podem entregar o primeiro estado durante o registro
    // do listener. O `let` evita acessar a inscrição antes da atribuição.
    let unsubscribe=()=>{};
    const settle=current=>{
      if(settled)return;
      settled=true;
      unsubscribe?.();
      resolve(current||null);
    };
    unsubscribe=runtime.onAuthStateChanged(runtime.auth,settle);
    setTimeout(()=>settle(runtime.auth.currentUser||null),3500);
  });
  if(!user)return null;
  const tokenResult=await user.getIdTokenResult();
  const claimedRole=normalizeAuthRole(tokenResult.claims?.role||tokenResult.claims?.userRole||tokenResult.claims?.['https://belavista/role']);
  const userType=userTypeFromClaims(tokenResult.claims||{},claimedRole);
  const role=isLocalDeveloper(user.email)?'developer':claimedRole==='foreman'?'admin':claimedRole;
  if(!allowedRoles.includes(role))return null;
  return {user,role,userType,token:await user.getIdToken(),claims:tokenResult.claims||{}};
}
export async function signOutOperationalUser(){
  const runtime=await loadRuntime();
  await runtime.signOut(runtime.auth);
}

// BELAVISTA_TWA_COMMERCIAL_NOTIFICATIONS_V5342
export async function subscribeOperationalNotifications(actor={},onChange=()=>{}){
  const runtime=await loadRuntime();
  if(!runtime?.db||typeof runtime.ref!=='function'||typeof runtime.onValue!=='function'){
    console.info('Firebase Realtime Database indisponível; notificações em tempo real desativadas.');
    return ()=>{};
  }
  const settings=readIntegrationSettings();
  const channel={...readOperationalChannel(actor),uid:resolveChannelUid(actor,settings,ensureInstallationId()),role:text(actor.role||localStorage.getItem(DEVICE_CHANNEL_ROLE_KEY)||'owner',40)};
  rememberOperationalChannel(channel);
  let direct={},commercialArea={};
  const emit=()=>onChange({...commercialArea,...direct},channel);
  const unsubscribeDirect=runtime.onValue(runtime.ref(runtime.db,`notifications/${channel.uid}`),snapshot=>{direct=snapshot.val()||{};emit();});
  const role=slug(channel.role).split('/').pop();
  let unsubscribeArea=()=>{};
  if(role==='commercial'||role==='sales'||role==='admin'||role==='owner'||role==='developer')unsubscribeArea=runtime.onValue(runtime.ref(runtime.db,'notificationAreas/commercial'),snapshot=>{commercialArea=snapshot.val()||{};emit();});
  return ()=>{unsubscribeDirect?.();unsubscribeArea?.();};
}

// BELAVISTA_TWA_REALTIME_CONTACTS_V1
const conversationKey=(left,right)=>[slug(left).replaceAll('/','-'),slug(right).replaceAll('/','-')].filter(Boolean).sort().join('__');
export function operationalConversationKey(left,right){return conversationKey(left,right);}

export async function subscribeOperationalContacts(actor={},onChange=()=>{}){
  const runtime=await loadRuntime();
  if(!runtime?.db||typeof runtime.ref!=='function'||typeof runtime.onValue!=='function'){
    console.info('Firebase Realtime Database sem runtime de referência; contatos em tempo real desativados.');
    return ()=>{};
  }
  const ownUid=text(actor.uid,160);
  return runtime.onValue(runtime.ref(runtime.db,'metadata'),snapshot=>{
    const contacts=Object.entries(snapshot.val()||{}).map(([uid,value])=>({
      uid:text(uid,160),name:text(value?.actorName||value?.name||uid,120),role:text(value?.role||'user',40),
      label:text(value?.actorLabel||'',120),online:Boolean(value?.online),pushEnabled:Boolean(value?.pushEnabled),updatedAt:value?.updatedAt||null
    })).filter(contact=>contact.uid&&contact.uid!==ownUid).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    onChange(contacts);
  });
}

export async function subscribeOperationalConversation(actor={},contact={},onChange=()=>{}){
  const runtime=await loadRuntime();
  const ownUid=text(actor.uid,160),contactUid=text(contact.uid,160);
  if(!ownUid||!contactUid)throw new Error('Remetente e contato são obrigatórios.');
  const threadId=conversationKey(ownUid,contactUid);
  const messagesRef=runtime.query&&runtime.limitToLast?runtime.query(runtime.ref(runtime.db,`operationalConversations/${threadId}/messages`),runtime.limitToLast(100)):runtime.ref(runtime.db,`operationalConversations/${threadId}/messages`);
  const unsubscribe=runtime.onValue(messagesRef,snapshot=>{
    const messages=Object.entries(snapshot.val()||{}).map(([id,value])=>({id,...value})).sort((a,b)=>Number(a.createdAt||0)-Number(b.createdAt||0));
    onChange(messages,{threadId,contactUid});
  });
  await runtime.update(runtime.ref(runtime.db,`operationalConversations/${threadId}/participants`),{
    [ownUid]:{uid:ownUid,name:text(actor.name||ownUid,120),role:text(actor.role||'user',40),updatedAt:runtime.serverTimestamp()},
    [contactUid]:{uid:contactUid,name:text(contact.name||contactUid,120),role:text(contact.role||'user',40),updatedAt:runtime.serverTimestamp()}
  });
  return unsubscribe;
}

export async function sendOperationalMessage(actor={},contact={},message=''){
  const runtime=await loadRuntime();
  const ownUid=text(actor.uid,160),contactUid=text(contact.uid,160),body=text(message,2000);
  if(!ownUid||!contactUid)throw new Error('Selecione um contato autenticado.');
  if(!body)throw new Error('Digite uma mensagem.');
  const threadId=conversationKey(ownUid,contactUid),messageRef=runtime.push(runtime.ref(runtime.db,`operationalConversations/${threadId}/messages`));
  const id=messageRef.key,createdAt=runtime.serverTimestamp();
  const payload={id,threadId,fromUid:ownUid,fromName:text(actor.name||ownUid,120),fromRole:text(actor.role||'user',40),toUid:contactUid,toName:text(contact.name||contactUid,120),toRole:text(contact.role||'user',40),message:body,status:'sent',createdAt,source:'belavista-twa-realtime-message'};
  const notification={id:`MSG-${id}`,type:'message.received',severity:'info',title:`Mensagem de ${payload.fromName}`,message:body,actionUrl:'/admin/workers?panel=messages',role:payload.toRole,source:'belavista-twa-realtime-message',threadId,fromUid:ownUid,status:'unread',createdAt};
  await runtime.update(runtime.ref(runtime.db),{
    [`operationalConversations/${threadId}/messages/${id}`]:payload,
    [`operationalConversations/${threadId}/updatedAt`]:createdAt,
    [`notifications/${contactUid}/${notification.id}`]:notification,
    [`agentBridgeEvents/message-${id}`]:{id:`message-${id}`,type:'message.sent',entity:'operationalConversations',entityId:threadId,actor:{uid:ownUid,role:payload.fromRole,name:payload.fromName},payload:{toUid:contactUid,messageId:id},source:'belavista-twa-realtime-message',createdAt}
  });
  return {id,threadId,notificationId:notification.id};
}

// Escuta centralizada para as tabelas que orientam o agente operacional. O
// cliente não executa comandos vindos do RTDB: apenas entrega o último estado
// recebido à interface para que a confirmação e a edição continuem humanas.
export async function subscribeOperationalControlCenter(actor={},onChange=()=>{}){
  const runtime=await loadRuntime();
  const projectId=text(actor.projectId||DEFAULT_PROJECT_ID,120);
  let snapshot=null,events={};
  const emit=(source)=>onChange({projectId,snapshot,events,source,updatedAt:new Date().toISOString()});
  const unsubscribeSnapshot=runtime.onValue(runtime.ref(runtime.db,`operationalSnapshots/${projectId}`),value=>{snapshot=value.val()||null;emit('operationalSnapshots');});
  const eventRef=runtime.query&&runtime.limitToLast?runtime.query(runtime.ref(runtime.db,'agentBridgeEvents'),runtime.limitToLast(30)):runtime.ref(runtime.db,'agentBridgeEvents');
  const unsubscribeEvents=runtime.onValue(eventRef,value=>{events=value.val()||{};emit('agentBridgeEvents');});
  return ()=>{unsubscribeSnapshot?.();unsubscribeEvents?.();};
}

export async function publishOperationalRealtime(actor={},payload={},context={}){
  const runtime=await loadRuntime();
  const settings=readIntegrationSettings();
  const installationId=ensureInstallationId();
  const channelUid=resolveChannelUid(actor,settings,installationId);
  const projectId=text(payload.projectId||payload.panorama?.projectId||context.projectId||DEFAULT_PROJECT_ID,120);
  const notifications=Array.isArray(payload.panorama?.notifications)?payload.panorama.notifications:Array.isArray(payload.notifications)?payload.notifications:[];
  const rootUpdates={};
  rootUpdates[`operationalSnapshots/${projectId}`]={
    projectId,
    loopId:text(payload.loopId||'',120),
    reason:text(context.reason||payload.reason||'client.manual',80),
    source:'belavista-client-operational',
    actor:{
      channelUid,
      role:text(actor.role||'owner',40),
      actorUid:text(actor.uid||'',120),
      name:text(actor.name||'Dispositivo',120),
      label:text(actor.label||'',120)
    },
    summary:asJson(payload.panorama?.summary||payload.summary||{}),
    guidance:asJson(payload.guidance||{}),
    cashSummary:asJson(payload.cashSummary||{}),
    agenda:asJson((payload.agenda||[]).slice(0,24)),
    updatedAt:runtime.serverTimestamp()
  };
  if(payload.calibration){
    rootUpdates[`calibrations/${projectId}`]={
      ...asJson(payload.calibration),
      source:'belavista-client-operational',
      updatedAt:runtime.serverTimestamp()
    };
  }
  rootUpdates[`agentBridgeEvents/${text(payload.loopId||`loop-${Date.now()}`,120)}`]={
    id:text(payload.loopId||`loop-${Date.now()}`,120),
    type:'operational.loop.completed',
    entity:'operationalSnapshots',
    entityId:projectId,
    actor:{channelUid,role:text(actor.role||'owner',40),actorUid:text(actor.uid||'',120),name:text(actor.name||'Dispositivo',120)},
    reason:text(context.reason||payload.reason||'client.manual',80),
    summary:asJson(payload.panorama?.summary||payload.summary||{}),
    source:'belavista-client-operational',
    createdAt:runtime.serverTimestamp()
  };
  const createdAt=runtime.serverTimestamp();
  for(const item of notifications){
    const envelope=notificationEnvelope(item,{createdAt,loopId:payload.loopId,reason:context.reason,projectId,role:item.role,source:'belavista-client-operational',stageKey:item.stageKey});
    const directRecipients=new Set();
    const areaRecipients=new Set();
    for(const destination of Array.isArray(item.destinations)?item.destinations:[]){
      const normalized=text(destination,160);
      if(!normalized)continue;
      if(normalized.startsWith('rtdb/')){
        const channel=normalized.slice('rtdb/'.length);
        const uid=channelUidForRole(channel,settings,'');
        if(uid)directRecipients.add(uid);
        else areaRecipients.add(slug(channel));
        continue;
      }
      if(normalized.startsWith('uid/')){directRecipients.add(text(normalized.slice(4),160));continue;}
      if(normalized.startsWith('area/')){areaRecipients.add(slug(normalized.slice(5)));continue;}
    }
    if(!directRecipients.size){
      const fallbackUid=channelUidForRole(item.role,settings,'')||channelUid;
      if(fallbackUid)directRecipients.add(fallbackUid);
    }
    for(const uid of directRecipients)rootUpdates[`notifications/${uid}/${envelope.id}`]={...envelope,destinationUid:uid};
    for(const area of areaRecipients)rootUpdates[`notificationAreas/${area}/${envelope.id}`]={...envelope,area};
  }
  await runtime.update(runtime.ref(runtime.db),rootUpdates);
  return {
    projectId,
    notificationsPublished:notifications.length,
    destinationCount:Object.keys(rootUpdates).filter(key=>key.startsWith('notifications/')).length,
    areaCount:Object.keys(rootUpdates).filter(key=>key.startsWith('notificationAreas/')).length
  };
}

export async function publishOperationalEvent(event={}){
  const runtime=await loadRuntime();
  const settings=readIntegrationSettings();
  const channelUid=resolveChannelUid(event.actor||{},settings,ensureInstallationId());
  const id=text(event.id||`${slug(event.type||'event')}-${Date.now()}`,120);
  const payload={
    id,
    type:text(event.type||'operational.event',80),
    entity:text(event.entity||'',80),
    entityId:text(event.entityId||'',120),
    actor:{
      channelUid,
      role:text(event.actor?.role||event.role||'owner',40),
      actorUid:text(event.actor?.uid||event.actorUid||'',120),
      name:text(event.actor?.name||event.actorName||'Dispositivo',120)
    },
    source:'belavista-client-event',
    payload:asJson(event.payload||{}),
    createdAt:runtime.serverTimestamp()
  };
  await runtime.set(runtime.ref(runtime.db,`agentBridgeEvents/${id}`),payload);
  return payload;
}

export const firebaseProjectId=FIREBASE_CONFIG.projectId;


// PUBLIC_LEAD_FILES_V42: upload bruto para Firebase Storage.
// A racionalidade da reserva continua no Worker/NVIDIA; esta função só armazena os arquivos.
export async function uploadPublicLeadFiles(sessionId,files={},options={}){
  const runtime=await loadRuntime();
  const scope=text(options.scope||'documents',40);
  const id=text(sessionId||`session-${Date.now()}`,120);
  const result={};
  for(const [kind,file] of Object.entries(files||{})){
    if(!file)continue;
    const contentType=String(file.type||'');
    const allowed=contentType.startsWith('image/')||contentType==='application/pdf';
    if(!allowed||Number(file.size||0)>12*1024*1024){
      throw new Error('Cada arquivo deve ser imagem ou PDF de até 12 MB.');
    }
    const safeName=String(file.name||`${kind}.bin`).replace(/[^a-z0-9._-]/gi,'-').slice(-96);
    const storageRef=runtime.storageRef(runtime.storage,`publicLeadSessions/${id}/${scope}/${kind}-${Date.now()}-${safeName}`);
    await runtime.uploadBytes(storageRef,file,{contentType:contentType||'application/octet-stream'});
    result[kind]={
      name:text(file.name,120),
      contentType:text(contentType,80),
      size:Number(file.size)||0,
      storagePath:storageRef.fullPath,
      url:await runtime.getDownloadURL(storageRef)
    };
  }
  return result;
}
