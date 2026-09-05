// BELAVISTA_ORIGINAL_ADMIN_NAV_TRIM_V5350
import {appStore, demoData, viewThemes, spreadsheetSchema, activityCatalog, reportCatalog, executionModel, personnelModel} from './state.js?v=solar-clock-hover-v5384';
import {STAGE_WORKBENCH,findWorkbenchStage,findWorkbenchActivity} from './stage-workbench-data.mjs';
// BELAVISTA_MAP_DRAG_INVERTED_V49
import {apiFetch, apiUrl} from './api-client.mjs';
import {subscribePublicLeads,registerOperationalDevice,subscribeOperationalNotifications,publishOperationalRealtime,publishOperationalEvent,subscribeOperationalControlCenter} from './firebase.mjs?v=public-runtime-v47';
import './public-lead-form.mjs?v=assistant-typewriter-v553';

const ico = (name, cls='') => `<i data-lucide="${name}" class="${cls}"></i>`;
const esc = (s='') => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
// Mantém as rotas navegáveis quando o app está atrás do multiplexador do
// ngrok, que exige o prefixo do upstream (por exemplo, /8080/admin).
const runtimeRouteV1=(path,query='')=>{
  const route=String(path||'/').startsWith('/')?String(path||'/'):`/${String(path||'')}`;
  const currentPath=String(globalThis.location?.pathname||'');
  const embeddedPrefix=currentPath.match(/^\/(\d{2,5})(?=\/|$)/)?.[0]||'';
  const host=String(globalThis.location?.hostname||'');
  const tunnelPrefix=embeddedPrefix||(/ngrok/i.test(host)?'/8080':'');
  const params=new URLSearchParams(String(query||'').replace(/^\?/,''));
  const key=new URLSearchParams(String(globalThis.location?.search||'')).get('key');
  if(key&&!params.has('key'))params.set('key',key);
  const suffix=params.toString();
  return `${tunnelPrefix}${route}${suffix?`?${suffix}`:''}`;
};

// Toda atividade do administrativo precisa terminar no mesmo editor físico.
// As interfaces antigas ainda usam IDs de etapa, nomes de catálogo e cards de
// agenda diferentes; este adaptador os normaliza sem alterar os dados legados.
const normalizeActivityRouteTextV1=value=>String(value??'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const activityRouteStageHintsV1={
  project:['projet','design','levantamento','locacao','locação','sondagem'],
  earthwork:['terra','terraplan','abertura','subleito','caçamba','cacamba'],
  drainage:['dren','pluvial','vala','manilha','boca de lobo'],
  water:['agua','água','pead','cavalete','ramal','pressao','pressão'],
  curbs:['meio fio','meio-fio','sarjeta','acessibilidade'],
  paving:['paviment','paralelep','pedra','calceteiro'],
  electrical:['eletric','coelba','poste','iluminacao','iluminação'],
  signage:['as built','sinalizacao','sinalização','entrega','garantia']
};
const workbenchStageFromValueV1=value=>{
  const token=normalizeActivityRouteTextV1(value);
  if(!token)return null;
  const direct=STAGE_WORKBENCH.find(stage=>[stage.key,stage.title,...stage.aliases].some(candidate=>normalizeActivityRouteTextV1(candidate)===token));
  if(direct)return direct;
  // Algumas versões antigas exibem o cartão com o ID numérico de
  // `demoData.activities` (por exemplo, 1 = Terraplanagem). Converta esse
  // valor pelo nome da etapa antes de tentar qualquer fallback heurístico.
  const legacyStage=Array.isArray(demoData?.activities)
    ? demoData.activities.find(item=>String(item?.id??'')===String(value??'')||normalizeActivityRouteTextV1(item?.name)===token)
    : null;
  if(legacyStage){
    const matching=STAGE_WORKBENCH.find(stage=>normalizeActivityRouteTextV1(stage.title)===normalizeActivityRouteTextV1(legacyStage.name)||stage.aliases.some(alias=>normalizeActivityRouteTextV1(alias)===normalizeActivityRouteTextV1(legacyStage.name)));
    if(matching)return matching;
  }
  const model=Array.isArray(executionModel.stages)?executionModel.stages.find(stage=>[stage.key,stage.id,stage.name].some(candidate=>normalizeActivityRouteTextV1(candidate)===token)):null;
  if(model){
    const modelToken=normalizeActivityRouteTextV1(model.key||model.name);
    const matching=STAGE_WORKBENCH.find(stage=>normalizeActivityRouteTextV1(stage.key)===modelToken||normalizeActivityRouteTextV1(stage.title)===normalizeActivityRouteTextV1(model.name)||stage.aliases.some(alias=>normalizeActivityRouteTextV1(alias)===modelToken));
    if(matching)return matching;
  }
  const hinted=STAGE_WORKBENCH.find(stage=>(activityRouteStageHintsV1[stage.key]||[]).some(hint=>token.includes(normalizeActivityRouteTextV1(hint))));
  return hinted||null;
};
const workbenchActivityForValueV1=(stage,value)=>{
  const token=normalizeActivityRouteTextV1(value);
  if(!stage||!token)return stage?.activities?.[0]||null;
  const direct=stage.activities.find(item=>[item.id,item.title].some(candidate=>normalizeActivityRouteTextV1(candidate)===token));
  if(direct)return direct;
  const partial=stage.activities.find(item=>{const itemToken=normalizeActivityRouteTextV1(item.id+' '+item.title);return itemToken.includes(token)||token.includes(itemToken);});
  if(partial)return partial;
  const packet=token.includes('prepar')||token.includes('frente')?'front':token.includes('execut')||token.includes('realiz')?'execute':token.includes('med')||token.includes('valid')?'measure':token.includes('liber')||token.includes('proxim')?'release':'';
  const packetIndex={front:0,execute:Math.min(1,stage.activities.length-1),measure:Math.max(0,stage.activities.length-2),release:stage.activities.length-1}[packet];
  return stage.activities[packetIndex==null?0:packetIndex]||stage.activities[0];
};
const workbenchActivityRouteV1=(activityValue='',stageValue='')=>{
  const raw=String(activityValue??'').trim();
  const parts=raw.split(':');
  const embeddedStage=parts.length>1?workbenchStageFromValueV1(parts[0]):null;
  const candidateStage=parts.length===1?workbenchStageFromValueV1(raw):null;
  const state=appStore.get?.()||{};
  const stateStage=state.selectedStageV9||state.selectedStage||state.stageSelected||'';
  const stage=embeddedStage||candidateStage||workbenchStageFromValueV1(stageValue)||workbenchStageFromValueV1(stateStage)||STAGE_WORKBENCH[0];
  const requestedActivity=embeddedStage?parts.slice(1).join(':'):raw;
  const activity=workbenchActivityForValueV1(stage,requestedActivity)||findWorkbenchActivity(stage.key,stage.activities[0]?.id).activity;
  return runtimeRouteV1('/admin/workers/activity',`stage=${encodeURIComponent(stage.key)}&activity=${encodeURIComponent(activity.id)}`);
};
const ACTIVITY_ROUTE_BRIDGE_SELECTORS_V1='[data-v5362-activity],[data-v5360-stage-card],[data-v5356-stage-activity],[data-activity-v9],[data-activity-detail],[data-activity-open],[data-activity-card],[data-agenda-item]';
const installActivityRouteBridgeV1=root=>{
  if(!root||root.__activityRouteBridgeV1)return;
  root.__activityRouteBridgeV1=true;
  root.addEventListener('click',event=>{
    const target=event.target?.closest?.(ACTIVITY_ROUTE_BRIDGE_SELECTORS_V1);
    if(!target||!root.contains(target)||target.closest('[data-activity-location-editor]'))return;
    if(target.matches('[data-agenda-item-menu]')||target.closest('[data-agenda-item-menu]'))return;
    if(target.matches('[data-activity-edit],[data-activity-delete]')||target.closest('[data-activity-edit],[data-activity-delete]'))return;
    if(target.dataset.dragged==='true'||target.dataset.moved==='true')return;
    let activityValue=target.dataset.activityV9||target.dataset.v5362Activity||target.dataset.v5360StageCard||target.dataset.v5356StageActivity||target.dataset.activityDetail||'';
    if(target.matches('[data-activity-open]'))activityValue=activityCatalog[Number(target.dataset.activityOpen)]?.name||activityValue;
    if(!activityValue&&target.matches('[data-agenda-item]'))activityValue=target.querySelector('.agenda-item-copy strong')?.textContent||'';
    if(!activityValue&&target.matches('[data-activity-card]'))activityValue=target.querySelector('h3,h2,strong')?.textContent||'';
    if(!activityValue)return;
    const stageValue=target.dataset.stage||target.closest('[data-stage]')?.dataset.stage||'';
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(workbenchActivityRouteV1(activityValue,stageValue));
  },true);
};
// Compatibilidade de marca para extensões legadas: somente texto e campos
// apresentados ao usuário são normalizados; namespaces, chaves e APIs ficam intactos.
const ALIANCA_PARK_BRAND='Aliança Park';
const normalizeAliancaParkBrand=(root=document)=>{
  if(!root?.createTreeWalker)return;
  const walker=root.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const textNodes=[];
  while(walker.nextNode())textNodes.push(walker.currentNode);
  for(const node of textNodes){
    if(node.parentElement?.closest('script,style'))continue;
    if(/\bbelavista\b/i.test(node.nodeValue||''))node.nodeValue=node.nodeValue.replace(/\bbelavista\b/gi,ALIANCA_PARK_BRAND);
  }
  root.querySelectorAll?.('[value],[title],[placeholder],[aria-label],[content]').forEach(element=>{
    if(element.closest('script,style'))return;
    for(const attribute of ['value','title','placeholder','aria-label','content']){
      const value=element.getAttribute(attribute);
      if(!value||!/(?<![-_.])belavista(?![-_.])/i.test(value))continue;
      if(attribute==='placeholder'&&!/empreendimento\s+belavista/i.test(value))continue;
      element.setAttribute(attribute,value.replace(/\bbelavista\b/gi,ALIANCA_PARK_BRAND));
    }
  });
};
if(globalThis.MutationObserver&&globalThis.document?.documentElement){
  const brandObserver=new MutationObserver(records=>records.forEach(record=>{
    for(const node of record.addedNodes){
      if(node.nodeType===Node.ELEMENT_NODE)normalizeAliancaParkBrand(node);
      else if(node.nodeType===Node.TEXT_NODE&&/\bbelavista\b/i.test(node.nodeValue||''))node.nodeValue=node.nodeValue.replace(/\bbelavista\b/gi,ALIANCA_PARK_BRAND);
    }
  }));
  brandObserver.observe(document.documentElement,{subtree:true,childList:true});
  queueMicrotask(()=>normalizeAliancaParkBrand(document));
}
const notify = (message, tone='info') => { let host=document.querySelector('.app-main'); if(!host)return; let toast=host.querySelector('.action-toast'); if(!toast){toast=document.createElement('div');toast.className='action-toast';host.appendChild(toast);} toast.dataset.tone=tone; toast.textContent=message; toast.classList.add('show'); clearTimeout(toast._timer); toast._timer=setTimeout(()=>toast.classList.remove('show'),2800); };
const validGeoPoint = point => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
const INTEGRATION_SETTINGS_KEY='belavista.integrations.v1';
const readIntegrationSettings=()=>{try{return JSON.parse(localStorage.getItem(INTEGRATION_SETTINGS_KEY)||'{}');}catch{return {};}};
const splitStageConfigList=value=>String(value||'').split(/\n|,/).map(item=>item.trim()).filter(Boolean);
const normalizeStageMaterialRows=(rows=[],fallback=[])=>{
  const source=Array.isArray(rows)&&rows.length?rows:fallback;
  return source.map((item,index)=>({
    id:String(item?.id||`material-${index+1}`),
    name:String(item?.name||'').trim(),
    description:String(item?.description||item?.scope||'').trim(),
    quantity:item?.quantity==null?'':String(item.quantity),
    unit:String(item?.unit||'un').trim(),
    status:String(item?.status||'Planejado').trim()
  })).filter(item=>item.name||item.description||item.quantity);
};
const defaultStageMaterialRows=stage=>{
  const fromDemo=normalizeStageMaterialRows(demoData.stageMaterials?.[stage.name]||[]);
  if(fromDemo.length)return fromDemo;
  return normalizeStageMaterialRows((stage.materials||[]).map((name,index)=>({id:`material-${index+1}`,name,description:'Material base da etapa',quantity:'',unit:'un',status:'Planejado'})));
};
const stageProfilesFromSettings=settings=>Object.fromEntries(
  Object.entries(settings?.stageProfiles||{}).map(([key,profile])=>[key,{
    requirements:splitStageConfigList(profile?.requirements),
    conditions:splitStageConfigList(profile?.conditions),
    typicalDescription:String(profile?.typicalDescription||'').trim(),
    requestHints:splitStageConfigList(profile?.requestHints),
    evidenceFocus:splitStageConfigList(profile?.evidenceFocus),
    procurementFocus:splitStageConfigList(profile?.procurementFocus),
    materialsTable:normalizeStageMaterialRows(profile?.materialsTable),
    notificationTargets:Object.fromEntries(Object.entries(profile?.notificationTargets||{}).map(([role,list])=>[role,splitStageConfigList(list)]))
  }])
);
let sharedMapScene=null;
const compactMapMirrors=new Set();
let compactMirrorFrame=0;
const syncCompactMapMirrors=()=>{
  if(!sharedMapScene?._modelGpuReady)return;
  if(compactMirrorFrame)return;

  const queue=[...compactMapMirrors].filter(
    mirror=>mirror._compactVisible
  );

  const step=()=>{
    const mirror=queue.shift();
    if(mirror)mirror.renderSharedMap?.();

    if(queue.length){
      compactMirrorFrame=requestAnimationFrame(step);
    }else{
      compactMirrorFrame=0;
    }
  };

  compactMirrorFrame=requestAnimationFrame(step);
};
// Keep zoom and tilt as transforms of the shared Three.js scene. The map tile
// surface and GLB therefore gain range together without ever rasterizing the
// model or changing the surrounding DOM layout.
const DEFAULT_SCENE_ZOOM=1.12, INITIAL_SCENE_ZOOM=1.68, MAX_SCENE_ZOOM=10, MIN_SCENE_TILT=8, MAX_SCENE_TILT=48, SCENE_TILT_ADJUST_LIMIT=34, TILT_DRAG_SENSITIVITY=.18, ZOOM_DRAG_SENSITIVITY=.012, DEFAULT_TILT_BOOST=52, DASHBOARD_TILT_BOOST=22, SCENE_SURFACE_SCALE=2.7, MODEL_FIT_RATIO=1.32, MODEL_PUBLIC_FIT_RATIO=1.10, MODEL_VERTICAL_EXAGGERATION=1.33335, SCENE_MAP_Z=0, SCENE_MODEL_BASE_Z=0, SCENE_VIEWPORT_COVERAGE=2.5, SCENE_PAN_SAFETY=1.18, MAP_TILE_OVERSCAN=1, MAP_RASTER_MAX=1536, MAP_SCENE_STATE_VERSION=5, STAGE_FILTER_TRANSITION_MS=520;
const MAP_CAMERA_VIEW='map';
const DWG_GEOREFERENCE_URL=runtimeRouteV1('/assets/data/dwg-georeference.json','v=dwg-georef-v1');
// Janela solar calculada a partir do centro geográfico oficial do DWG. O
// manifesto pode substituir esse fallback assim que terminar de carregar.
const MAP_GEOREFERENCE_FALLBACK={lat:-13.00044486,lng:-39.62315439,label:'Aliança Park · Amargosa, BA',timezone:'America/Bahia',timezoneOffset:-3};
const localClockHourForGeo=(geo={},date=new Date())=>{
  const timezone=geo.timezone||MAP_GEOREFERENCE_FALLBACK.timezone;
  try{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
    const hour=Number(parts.find(item=>item.type==='hour')?.value),minute=Number(parts.find(item=>item.type==='minute')?.value);
    if(Number.isFinite(hour)&&Number.isFinite(minute))return ((hour+minute/60)%24+24)%24;
  }catch{}
  const offset=Number(geo.timezoneOffset??MAP_GEOREFERENCE_FALLBACK.timezoneOffset),utc=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
  return ((utc+offset)%24+24)%24;
};
const solarDayOfYear=date=>{const start=new Date(date.getFullYear(),0,0);return Math.floor((date-start)/86400000);};
const solarWindowForGeo=(geo={},date=new Date())=>{
  const lat=Math.max(-89,Math.min(89,Number(geo.lat??geo.center?.lat??MAP_GEOREFERENCE_FALLBACK.lat)))*Math.PI/180;
  const lng=Number(geo.lng??geo.center?.lng??MAP_GEOREFERENCE_FALLBACK.lng)||MAP_GEOREFERENCE_FALLBACK.lng;
  const day=solarDayOfYear(date),declination=23.44*Math.PI/180*Math.sin((2*Math.PI*(day-81))/365);
  const hourAngle=Math.acos(Math.max(-1,Math.min(1,-Math.tan(lat)*Math.tan(declination))));
  const offset=Number(geo.timezoneOffset??MAP_GEOREFERENCE_FALLBACK.timezoneOffset),meridian=15*offset;
  const equationOfTime=9.87*Math.sin(2*(2*Math.PI*(day-81)/365))-7.53*Math.cos(2*Math.PI*(day-81)/365)-1.5*Math.sin(2*Math.PI*(day-81)/365);
  const noon=12-(lng-meridian)/15-equationOfTime/60,halfDay=hourAngle*12/Math.PI;
  return {sunrise:Math.max(4,noon-halfDay),solarNoon:noon,sunset:Math.min(21,noon+halfDay),lat,lng,label:geo.label||MAP_GEOREFERENCE_FALLBACK.label};
};
const solarHourLabel=hour=>{const totalMinutes=Math.round(Math.max(0,Number(hour)||0)*60),hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;};
const solarStateForHour=(hour,geo={})=>{
  const window=solarWindowForGeo(geo),span=Math.max(.1,window.sunset-window.sunrise),progress=Math.max(0,Math.min(1,(Number(hour)-window.sunrise)/span));
  const elevation=Math.max(0,Math.sin(progress*Math.PI)),azimuth=progress*Math.PI*1.12-Math.PI*.56;
  return {...window,hour:Number(hour),progress,elevation,azimuth,daylight:elevation>.02};
};
const sceneTiltBoostForView=view=>view==='assistant'?DASHBOARD_TILT_BOOST:DEFAULT_TILT_BOOST;
const chatLayouts={
  assistant:{left:28,top:92},
  map:{left:18,top:76},
  stages:{left:18,top:18},
  agenda:{left:18,top:104},
  activities:{left:18,top:132},
  progress:{left:18,top:160},
  records:{left:18,top:104},
  inventory:{left:18,top:132},
  leads:{left:18,top:160},
  reports:{left:18,top:18},
  settings:{left:18,top:104}
};
const CHAT_WINDOW_STORAGE_KEY='belavista.ai-window.v1';
const readChatWindowLayout=()=>{try{const value=JSON.parse(localStorage.getItem(CHAT_WINDOW_STORAGE_KEY)||'null');return value&&typeof value==='object'?value:null;}catch{return null;}};
const writeChatWindowLayout=layout=>{try{localStorage.setItem(CHAT_WINDOW_STORAGE_KEY,JSON.stringify(layout));}catch{}};
const CHAT_HISTORY_STORAGE_KEY='belavista.ai-chat.history.v1';
const CHAT_HISTORY_LIMIT=48;
const readChatHistory=()=>{try{const value=JSON.parse(localStorage.getItem(CHAT_HISTORY_STORAGE_KEY)||'[]');return Array.isArray(value)?value.filter(item=>item&&typeof item.text==='string').slice(-CHAT_HISTORY_LIMIT):[];}catch{return[];}};
const writeChatHistory=history=>{try{localStorage.setItem(CHAT_HISTORY_STORAGE_KEY,JSON.stringify(history.slice(-CHAT_HISTORY_LIMIT)));}catch{}};
const mapTileSources={
  satellite:[
    {id:'satellite',url:(z,x,y)=>`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`},
    {id:'satellite-alt',url:(z,x,y)=>`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`}
  ],
  osm:[
    {id:'osm',url:(z,x,y)=>`https://tile.openstreetmap.org/${z}/${x}/${y}.png`},
    {id:'osm-de',url:(z,x,y)=>`https://tile.openstreetmap.de/${z}/${x}/${y}.png`}
  ]
};
// O GLB principal nunca é convertido em imagem. Os mapas compactos usam a
// mesma cena Three.js e o mesmo modelo já carregado, com renderer próprio de
// baixa resolução — sem captura de canvas e sem uma segunda carga do GLB.
const publishMapPreview = () => syncCompactMapMirrors();
const stageOverlayKey = value => { const text=String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); if(text.includes('terra'))return 'terraplanagem'; if(text.includes('dren'))return 'drenagem'; if(text.includes('agua'))return 'rede-agua'; if(text.includes('eletric'))return 'rede-eletrica'; if(text.includes('meio')||text.includes('fio')||text.includes('guia'))return 'pavimentacao'; if(text.includes('paviment'))return 'pavimentacao'; if(text.includes('projeto'))return 'urbanizacao'; if(text.includes('praca')||text.includes('urban')||text.includes('arbor'))return 'urbanizacao'; return 'drenagem'; };
const stageOverlayLabels={terraplanagem:'Terraplanagem',drenagem:'Drenagem', 'rede-agua':'Rede de água','rede-eletrica':'Rede elétrica',pavimentacao:'Pavimentação',urbanizacao:'Praças / urbanização'};
const stageOverlayColors={terraplanagem:0xf1b832,drenagem:0x3f9cff,'rede-agua':0x32c5d9,'rede-eletrica':0x9b7cff,pavimentacao:0xff7c45,urbanizacao:0x42be65};
const progressNatureOptions=['Terraplanagem','Drenagem','Iluminação pública','Rede de água','Rede elétrica','Pavimentação','Praças / urbanização','Arborização','Segurança','Qualidade / ensaios','Medição físico-financeira'];
const stageMaterialsFor=stageName=>demoData.stageMaterials?.[stageName]||[];
const stageMaterialsMarkup=stageName=>{
  const items=stageMaterialsFor(stageName);
  if(!items.length)return '';
  return `<div class="stage-material-scope"><div class="activity-card-kicker">MATERIAIS DA ETAPA</div><div class="activity-associations">${items.map(item=>`<div><small>${esc(item.name).toUpperCase()}</small><b>${item.quantity==null?esc(item.scope):`${esc(item.quantity)} ${esc(item.unit)} · ${esc(item.scope)}`}</b><span>${esc(item.status)} · ${item.targetLots?`${esc(item.targetLots)} lotes`:''}</span></div>`).join('')}</div></div>`;
};
const executionStageByName=stageName=>executionModel.stages.find(item=>item.name===stageName)||executionModel.stages.find(item=>stageOverlayKey(item.name)===stageOverlayKey(stageName));
const stageProfileSettingsFor=stageKey=>{
  const settings={...(readIntegrationSettings()||{}),...(appStore.get().integrationSettings||{})};
  return settings.stageProfiles?.[stageKey]||null;
};
const stagePlanningMarkup=stage=>{
  const executionStage=executionStageByName(stage.name)||executionModel.stages[0];
  const savedProfile=stageProfileSettingsFor(executionStage.key)||{};
  const profile={...(executionStage.executionProfile||{}),...savedProfile};
  const targets=profile.notificationTargets||{};
  const materialRows=normalizeStageMaterialRows(profile.materialsTable,defaultStageMaterialRows(executionStage));
  return `<section class="dedicated-panel stage-planning-panel"><header><div><span class="activity-kind">INTELIGÊNCIA DA ETAPA</span><h3>Contexto que alimenta compras, atividades e cronograma</h3><p>Salvar aqui atualiza o estado operacional usado no ciclo único do Worker.</p></div></header><form data-stage-context-form="${esc(executionStage.key)}"><label>Descrição típica da execução<textarea name="typicalDescription" rows="4" placeholder="Descreva peculiaridades, cuidados e ordem típica desta etapa.">${esc(profile.typicalDescription||'')}</textarea></label><label>Requisitos e pistas para planejamento<textarea name="requestHints" rows="3" placeholder="Uma linha por pista para compras, atividades e cronograma.">${esc((profile.requestHints||[]).join('\n'))}</textarea></label><label>Comprovações esperadas<textarea name="evidenceFocus" rows="2" placeholder="Fotos, medições, laudos, protocolos...">${esc((profile.evidenceFocus||[]).join('\n'))}</textarea></label><label>Materiais e compras a observar<textarea name="procurementFocus" rows="2" placeholder="Uma linha por item ou cuidado de suprimentos.">${esc((profile.procurementFocus||[]).join('\n'))}</textarea></label><div class="stage-material-table-wrap"><div class="stage-material-table-head"><strong>Tabela de materiais da etapa</strong><button type="button" class="ghost" data-add-stage-material="${esc(executionStage.key)}">${ico('plus')} Adicionar material</button></div><table class="stage-material-table"><thead><tr><th>Material</th><th>Descrição</th><th>Quantidade</th><th>Unidade</th><th>Estado</th></tr></thead><tbody data-stage-materials="${esc(executionStage.key)}">${materialRows.map(item=>`<tr data-stage-material-row><td><input name="materialName" value="${esc(item.name)}" placeholder="Ex.: Tubo PEAD"></td><td><input name="materialDescription" value="${esc(item.description)}" placeholder="Escopo, bitola, uso..."></td><td><input name="materialQuantity" value="${esc(item.quantity)}" inputmode="decimal" placeholder="0"></td><td><input name="materialUnit" value="${esc(item.unit)}" placeholder="m, un, m²"></td><td><input name="materialStatus" value="${esc(item.status||'Planejado')}" placeholder="Planejado"></td></tr>`).join('')}</tbody></table></div><div class="integration-stage-targets"><label>Destino Dono<input name="notifyOwner" value="${esc((targets.owner||[]).join(', '))}" placeholder="desktop-owner, rtdb/owner"></label><label>Destino Administrador<input name="notifyAdmin" value="${esc((targets.admin||[]).join(', '))}" placeholder="desktop-admin, rtdb/admin"></label><label>Destino Encarregado<input name="notifyForeman" value="${esc((targets.foreman||[]).join(', '))}" placeholder="mobile-foreman, rtdb/foreman"></label></div><footer><span data-stage-context-status>Essa etapa já envia seu contexto e materiais quantificados para a inteligência operacional.</span><button type="submit" class="primary">${ico('save')} Salvar contexto da etapa</button></footer></form></section>`;
};

// Fonte única dos tempos exibidos nas visões de planejamento. Quando a API
// fornecer durationHours/plannedHours ou início/fim, esses valores vencem a
// estimativa por natureza. No demo, a estimativa é explícita e sempre é a
// soma das quatro atividades operacionais da frente.
const WORKDAY_HOURS=8;
const STAGE_TIME_DEFAULTS={terraplanagem:64,drenagem:72,pavimentacao:80,'rede-agua':56,'rede-eletrica':64,sinalizacao:32,urbanizacao:48};
const STAGE_WORK_PACKETS=['Preparar frente','Executar atividade principal','Validar medição','Liberar próxima frente'];
const numericTime=value=>{const number=Number(value);return Number.isFinite(number)&&number>0?number:null;};
const durationFromItem=(item,index=0)=>{
  const direct=[item?.durationHours,item?.plannedHours,item?.estimatedHours,item?.hours,item?.properties?.durationHours,item?.properties?.plannedHours].map(numericTime).find(Boolean);
  if(direct)return direct;
  const days=[item?.durationDays,item?.plannedDays,item?.properties?.durationDays].map(numericTime).find(Boolean);
  if(days)return days*WORKDAY_HOURS;
  const start=Date.parse(item?.plannedStart||item?.start||'');
  const end=Date.parse(item?.plannedEnd||item?.end||'');
  if(Number.isFinite(start)&&Number.isFinite(end)&&end>=start)return Math.max(0.5,(end-start)/3600000);
  const key=stageOverlayKey(item?.name);
  return STAGE_TIME_DEFAULTS[key]||Math.max(24,40+index*8);
};
const formatHours=hours=>{
  const value=Math.round(Number(hours||0)*2)/2;
  if(value<WORKDAY_HOURS)return `${String(value).replace('.',',')} h`;
  const days=Math.floor(value/WORKDAY_HOURS),rest=Math.round((value-days*WORKDAY_HOURS)*2)/2;
  return rest?`${days} d ${String(rest).replace('.',',')} h`:`${days} ${days===1?'dia':'dias'}`;
};
const planningDate=day=>new Date(Date.UTC(2024,5,3)+Math.max(0,day-1)*86400000);
const formatPlanningDate=day=>planningDate(day).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
const buildStageTimeModels=(stages=demoData.activities)=>{
  let cursor=1;
  return stages.map((stage,index)=>{
    const totalHours=durationFromItem(stage,index), packetHours=[.18,.52,.15,0].map(weight=>Math.round(totalHours*weight*2)/2);
    packetHours[3]=Math.max(.5,Math.round((totalHours-packetHours.slice(0,3).reduce((sum,value)=>sum+value,0))*2)/2);
    const tasks=[];let taskDay=cursor;
    packetHours.forEach((hours,taskIndex)=>{const days=Math.max(.5,hours/WORKDAY_HOURS),endDay=taskDay+Math.max(0.5,Math.ceil(days))-1;tasks.push({name:STAGE_WORK_PACKETS[taskIndex],hours,startDay:taskDay,endDay});taskDay=endDay+1;});
    const model={stage,totalHours,startDay:cursor,endDay:Math.max(cursor,taskDay-1),tasks};cursor=model.endDay+1;return model;
  });
};
const findStageTimeModel=(stage,models=buildStageTimeModels())=>models.find(model=>model.stage===stage||model.stage?.name===stage)||models[0];

export class GlassCard extends HTMLElement {
  connectedCallback(){ if(!this.classList.contains('glass-card')) this.classList.add('glass-card'); }
}
if(!customElements.get('glass-card')) customElements.define('glass-card', GlassCard);

export class StatPill extends HTMLElement {
  connectedCallback(){ this.render(); }
  static get observedAttributes(){ return ['label','value','tone','icon','sub']; }
  attributeChangedCallback(){ this.render(); }
  render(){
    const label=this.getAttribute('label')||''; const value=this.getAttribute('value')||''; const tone=this.getAttribute('tone')||'teal'; const icon=this.getAttribute('icon')||'activity'; const sub=this.getAttribute('sub')||'';
    this.innerHTML=`<div class="stat-pill tone-${tone}"><span class="stat-icon">${ico(icon)}</span><span><small>${esc(label)}</small><strong>${esc(value)}</strong>${sub?`<em>${esc(sub)}</em>`:''}</span></div>`;
    window.lucide?.createIcons();
  }
}
if(!customElements.get('stat-pill')) customElements.define('stat-pill', StatPill);

export class AppSidebar extends HTMLElement {
  connectedCallback(){ this.render(); appStore.subscribe(()=>{if(!this._dedicated)this.render();}); }
  render(){
    const state=appStore.get(),view=state.view,actor=state.currentActor||{name:'Warley',label:'Dono'};
    const items=[['map','map','Dashboard inicial'],['control','table-properties','Central operacional'],['stages','workflow','Etapas e Cronograma'],['records','clipboard-pen-line','Diário'],['personnel','users-round','Pessoal'],['leads','users','Leads'],['finance','wallet-cards','Financeiro'],['reports','chart-no-axes-combined','Relatórios'],['settings','settings','Configurações']];
    const extensionViews=['agenda','activities','progress','pert','actions','raci','raid'];
    const reportFamilies=[...new Set(reportCatalog.map(report=>report.family))];
    const reportIcons={Financeiro:'wallet-cards',Construção:'hard-hat',Suprimentos:'package-check',Comercial:'funnel',Governança:'shield-check'};
    const nav=items.map(([id,icon,label])=>{
      const active=id==='stages' ? (view==='stages'||extensionViews.includes(view)) : view===id;
      const button=`<button class="nav-item ${active?'active':''}" data-view="${id}">${ico(icon)}<span>${label}</span></button>`;
      if(id==='stages'){
        const sub=[['agenda','calendar-days','Agenda'],['pert','git-branch','PERT'],['actions','sparkles','Ações IA'],['raci','users-round','Responsáveis'],['raid','shield-alert','Pendências RAID'],['activities','list-checks','Atividades'],['progress','clipboard-check','Andamento']];
        const hasStageContext=Boolean(state.stageSelected||state.activityDedicated);
        return `<div class="nav-group">${button}${hasStageContext?`<div class="nav-subitems" aria-label="Extensões da etapa selecionada">${sub.map(([subId,subIcon,subLabel])=>`<button class="nav-subitem ${view===subId?'active':''}" data-view="${subId}">${ico(subIcon)}<span>${subLabel}</span></button>`).join('')}</div>`:''}</div>`;
      }
      if(id==='reports'){
        return `<div class="nav-group">${button}<div class="nav-subitems report-subitems" aria-label="Subitens de relatórios">${reportFamilies.map(family=>`<button class="nav-subitem ${view==='reports'&&state.reportFamily===family?'active':''}" data-view="reports" data-report-family="${esc(family)}">${ico(reportIcons[family]||'file-chart-column')}<span>${esc(family)}</span></button>`).join('')}</div></div>`;
      }
      return button;
    }).join('');
    this.innerHTML=`<aside class="sidebar"><div class="brand"><div class="brand-mark">◢</div><div><strong>Aliança Park</strong><span>LOTEAMENTO</span></div></div><button class="sidebar-toggle" id="sidebarToggle" aria-label="Recolher menu">${ico('panel-left-close')}<span>Recolher menu</span></button><nav aria-label="Navegação principal">${nav}</nav><a class="field-portal-link" href="./encarregados.html" target="_blank" rel="noopener">${ico('hard-hat')}<span>Portal do encarregado</span>${ico('external-link')}</a><a class="field-portal-link site-manual-link" href="./assets/docs/manual-usuario-planejamento-inteligente.html" target="_blank" rel="noopener">${ico('book-open-check')}<span>Manual de operação</span>${ico('external-link')}</a><div class="sidebar-foot"><button class="profile profile-trigger" id="adminTrigger"><span class="avatar">${esc(actor.name?.[0]||'W')}</span><div><strong>${esc(actor.name||'Warley')}</strong><small>${esc(actor.label||'Dono')}</small></div>${ico('chevron-up')}</button><div class="admin-menu ${appStore.get().adminMenu?'open':''}"><button>Preferências</button><button>Auditoria da sessão</button><button>Encerrar sessão</button></div><div class="integration"><span></span>Integração ativa</div></div></aside>`;
    this.dataset.sidebarReady='true';
    this.insertAdjacentHTML('afterbegin',`<button type="button" class="mobile-menu-trigger" aria-label="Abrir navegação" aria-expanded="false">${ico('menu')}<span>Menu</span></button>`);
    const mobileTrigger=this.querySelector('.mobile-menu-trigger');mobileTrigger?.addEventListener('click',()=>{const open=this.classList.toggle('mobile-open');mobileTrigger.setAttribute('aria-expanded',String(open));mobileTrigger.setAttribute('aria-label',open?'Fechar navegação':'Abrir navegação');});
    this.querySelector('#sidebarToggle')?.addEventListener('click',()=>appStore.set({sidebarCollapsed:!appStore.get().sidebarCollapsed}));
    this.querySelector('#adminTrigger')?.addEventListener('click',()=>appStore.set({adminMenu:!appStore.get().adminMenu,lastAction:'Abriu menu do administrador'}));
    this.querySelectorAll('.admin-menu button').forEach(button=>button.addEventListener('click',()=>{notify(`${button.textContent.trim()} selecionado.`);appStore.set({adminMenu:false,lastAction:button.textContent.trim()});}));
    this.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{const next=btn.dataset.view==='inventory'?'assistant':btn.dataset.view,patch={view:next,activityDedicated:false,selectedActivity:null,sidebarCollapsed:false,lastAction:`Abriu ${btn.textContent.trim()}`};if(next==='reports'&&btn.dataset.reportFamily){const family=btn.dataset.reportFamily,first=reportCatalog.find(report=>report.family===family);patch.reportFamily=family;patch.reportType=first?.id||'financial-balance';}this.classList.remove('mobile-open');appStore.set(patch);}));
    window.lucide?.createIcons();
  }
}
if(!customElements.get('app-sidebar')) customElements.define('app-sidebar', AppSidebar);

export class AppTopbar extends HTMLElement {
  connectedCallback(){ this.render(); appStore.subscribe(s=>this.updateThemeButton(s.theme)); }
  updateThemeButton(theme){ const b=this.querySelector('#themeBtn'); if(!b)return; b.setAttribute('aria-label',theme==='dark'?'Ativar modo claro':'Ativar modo escuro'); b.innerHTML=ico(theme==='dark'?'sun':'moon'); window.lucide?.createIcons(); }
  render(){
    const s=appStore.get(),actor=s.currentActor||{name:'Warley',label:'Dono'}; this.innerHTML=`<header class="topbar"><div class="session-header"><span class="session-mark">◢</span><div><strong>Aliança Park</strong><small>SESSÃO ${s.sessionId} · WORKBENCH OPERACIONAL</small></div></div><button class="project-switch">Controle de obra ${ico('chevron-down')}</button><div class="top-meta"><div>${ico('sun')}<span><b>26°C</b><small>Ensolarado</small></span></div><div class="complete-ring"><span>63%</span></div><div><span><b>Completude geral</b><small>48 meses · ${spreadsheetSchema.sheets.length} fontes</small></span></div></div><div class="top-actions"><div class="session-health"><i></i><span>Sessão ativa<small>Salvamento local</small></span></div><div class="auto-stamp"><small>ÚLTIMO REGISTRO</small><strong>${new Date().toLocaleDateString('pt-BR')} · ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</strong></div><button id="syncBtn" class="ghost">${ico('refresh-cw')} Sincronizar</button><button class="icon-btn" aria-label="Notificações">${ico('bell')}<span class="badge">3</span></button><div class="top-admin-wrap"><div class="profile top-profile" id="topAdminTrigger" tabindex="0" role="button"><span class="avatar">${esc(actor.name?.[0]||'W')}</span><div><strong>${esc(actor.name||'Warley')}</strong><small>${esc(actor.label||'Dono')}</small></div>${ico('chevron-down')}</div><div class="top-admin-menu"><button>Perfil e permissões</button><button>Auditoria da sessão</button><button>Encerrar sessão</button></div></div></div></header>`;
    this.querySelector('#syncBtn')?.addEventListener('click', e=>{ e.currentTarget.classList.add('spinning'); setTimeout(()=>e.currentTarget.classList.remove('spinning'),650); });
    this.querySelector('#syncBtn')?.addEventListener('click',()=>{appStore.set({lastAction:'Sincronizou dados'});notify('Dados sincronizados localmente.','success');});
    this.querySelector('.project-switch')?.addEventListener('click',()=>notify('Seletor de empreendimento: Aliança Park ativo.'));
    this.querySelector('[aria-label="Notificações"]')?.addEventListener('click',()=>notify('3 notificações operacionais pendentes.','warning'));
    this.querySelector('.top-profile')?.addEventListener('click',()=>{this.querySelector('.top-admin-menu')?.classList.toggle('open');appStore.set({adminMenu:!appStore.get().adminMenu,lastAction:'Alternou menu do administrador'});});
    this.querySelectorAll('.top-admin-menu button').forEach(button=>button.addEventListener('click',()=>{notify(`${button.textContent.trim()} selecionado.`);this.querySelector('.top-admin-menu')?.classList.remove('open');appStore.set({adminMenu:false,lastAction:button.textContent.trim()});}));
    window.lucide?.createIcons();
  }
}
if(!customElements.get('app-topbar')) customElements.define('app-topbar', AppTopbar);

export class AiChat extends HTMLElement {
  connectedCallback(){
    this._chatView=null; this._suggestionKey=null; this._transitionTimer=null; this._autoMessageTimer=null;
    this._autoMessageQueue=[]; this._autoMessageKeys=new Set(); this._observedSystemState=null;
    this._chatHistoryHydrated=false; this.chatAttachment=null; this.chatMapContext=false;
    this._systemEventHandler=event=>this.handleSystemEvent(event);
    this.render(); this.restoreSavedLayout();
    this._chatStoreUnsubscribe=appStore.subscribe(state=>{
      this.positionForView(); this.announceContextualSuggestion(state); this.observeSystemState(state);
    });
    this.observeSystemState(appStore.get());
    this.announceContextualSuggestion(appStore.get(),true);
    globalThis.addEventListener?.('belavista:test-case-completed',this._systemEventHandler);
    globalThis.addEventListener?.('belavista:test-controls-changed',this._systemEventHandler);
    globalThis.addEventListener?.('belavista:integrations-saved',this._systemEventHandler);
    this.enableDrag(); this.enableResize();
  }
  disconnectedCallback(){
    this._chatStoreUnsubscribe?.();
    globalThis.removeEventListener?.('belavista:test-case-completed',this._systemEventHandler);
    globalThis.removeEventListener?.('belavista:test-controls-changed',this._systemEventHandler);
    globalThis.removeEventListener?.('belavista:integrations-saved',this._systemEventHandler);
    clearTimeout(this._autoMessageTimer); clearTimeout(this._mapFocusTimer);
  }
  positionForView(){
    // A janela da IA tem um único estado de layout para toda a SPA. Trocar de
    // página ou atualizar o mapa muda apenas o contexto da conversa; posição,
    // tamanho e minimização permanecem exatamente onde o usuário deixou.
    if(this._chatPositioned)return;
    const saved=readChatWindowLayout()||appStore.get().widgetLayouts?.chat?.global;
    this._chatPositioned=true;
    this.style.removeProperty('right'); this.style.removeProperty('bottom'); this.style.removeProperty('transform');
    this.classList.remove('dock-right','dock-bottom');this.classList.add('dock-left');
    if(saved){this.applySavedLayout(saved);this.dataset.chatLayout='global';return;}
    const layout=chatLayouts.assistant;
    this.style.setProperty('--chat-left',`${layout.left}px`);this.style.setProperty('--chat-top',`${layout.top}px`);this.dataset.chatLayout='global';
  }
  render(){
    this.className='ai-chat floating-panel dock-left';
    const m=demoData.metrics;
    this.innerHTML=`<div class="chat-head drag-handle" title="Arraste para mover"><span class="ai-logo">✦</span><div><strong>IA · Aliança Park</strong><small><span class="chat-monitoring-dot" data-chat-monitoring>MONITORANDO SISTEMA</span> · reajo à navegação e aos eventos · <span class="chat-drag-hint">ARRASTE PARA MOVER</span></small></div><button class="icon-btn compact close-chat">${ico('minus')}</button></div><div class="chat-scroll"><div class="chat-greeting"><strong>Bom dia, Warley. 👋</strong><span>Este é o resumo do empreendimento com base nos dados de hoje. Vou avisar quando o sistema mudar.</span></div><div class="chat-summary"><div><b>${m.completeness||63}%</b><small>Completude<br>geral</small></div><div><b>${m.delayed}</b><small>Etapas<br>atrasadas</small></div><div><b>${m.criticalPurchases}</b><small>Compras<br>críticas</small></div><div><b>${m.review}</b><small>Pendências<br>de revisão</small></div></div><h3 class="chat-question">O que você deseja acompanhar agora?</h3><div class="chat-quick-actions"><button data-view="stages">${ico('calendar-check')} Ver etapas críticas</button><button data-view="inventory">${ico('package-check')} Ver compras necessárias</button><button data-view="stages">${ico('calendar-range')} Ver cronograma de atividades</button><button data-view="leads">${ico('user-round-search')} Ver leads hoje</button><button data-view="records">${ico('clipboard-pen-line')} Registrar andamento</button><button data-view="map">${ico('layers-3')} Abrir mapa de completude</button></div><div class="chat-log" aria-live="polite"></div></div><form class="chat-form"><div class="chat-input-tools" role="group" aria-label="Contexto da mensagem"><button type="button" class="chat-input-tool" data-chat-map aria-label="Abrir mapa 3D de lotes">${ico('map')}<span>Lotes 3D</span></button><button type="button" class="chat-input-tool" data-chat-camera aria-label="Anexar foto pela câmera">${ico('camera')}<span>Câmera</span></button><input type="file" class="chat-camera-input" data-chat-camera-input accept="image/*" capture="environment" aria-label="Capturar imagem para a IA"/></div><div class="chat-attachment" data-chat-attachment aria-live="polite" hidden></div><div class="chat-input-row"><input aria-label="Mensagem para IA" placeholder="Pergunte algo ou dê um comando…"/><button class="chat-send" aria-label="Enviar">${ico('send')}</button></div></form>${['n','ne','e','se','s','sw','w','nw'].map(edge=>`<span class="chat-resize-handle resize-${edge}" data-resize="${edge}" aria-label="Redimensionar pela borda ${edge}"></span>`).join('')}`;
    this.querySelector('.close-chat').addEventListener('click',event=>{event.stopPropagation();const wasCollapsed=this.classList.contains('collapsed');if(!wasCollapsed){const rect=this.getBoundingClientRect();this._expandedSize={width:Math.round(rect.width),height:Math.round(rect.height)};}const collapsed=this.classList.toggle('collapsed');if(!collapsed&&this._expandedSize){this.style.width=`${this._expandedSize.width}px`;this.style.height=`${this._expandedSize.height}px`;}const button=this.querySelector('.close-chat');button?.setAttribute('aria-label',collapsed?'Restaurar chat da IA':'Minimizar chat da IA');button?.setAttribute('title',collapsed?'Restaurar':'Minimizar');this.saveLayout();});
    this.querySelectorAll('[data-cmd]').forEach(b=>b.addEventListener('click',()=>this.respond(b.dataset.cmd)));
    this.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{const next=b.dataset.view==='inventory'?'assistant':b.dataset.view;appStore.set({view:next,activityDedicated:false,selectedActivity:null,lastAction:`Abriu ${b.textContent.trim()}`});}));
    this.querySelector('[data-chat-map]')?.addEventListener('click',()=>this.openMapContext());
    const cameraInput=this.querySelector('[data-chat-camera-input]');
    this.querySelector('[data-chat-camera]')?.addEventListener('click',()=>cameraInput?.click());
    cameraInput?.addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{this.chatAttachment={name:file.name,mimeType:file.type||'image/jpeg',dataUrl:String(reader.result||'')};this.renderChatAttachment();};reader.readAsDataURL(file);});
    this.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const input=e.currentTarget.querySelector('input[aria-label="Mensagem para IA"]');const text=input.value.trim();if(!text&&!this.chatAttachment)return;const message=text||'Analise esta evidência capturada no mapa.';const attachment=this.chatAttachment;this.respond(message,attachment);input.value='';this.chatAttachment=null;cameraInput&&(cameraInput.value='');this.renderChatAttachment();});
    this.renderChatAttachment(); this.restoreChatHistory();
    this.positionForView(); window.lucide?.createIcons();
  }
  appendConversationMessage(kind,text,{auto=false,persist=true}={}){
    const log=this.querySelector('.chat-log'); if(!log)return null;
    const node=document.createElement('div');
    node.className=kind==='user'?'user-mini':`ai-mini${auto?' ai-auto-mini':''}`;
    node.dataset.chatHistoryMessage='true'; node.textContent=String(text||''); log.append(node);
    if(persist)this.persistChatMessage(kind,text,auto);
    log.scrollTop=log.scrollHeight; return node;
  }
  persistChatMessage(kind,text,auto=false){
    const value=String(text||'').trim().slice(0,1600); if(!value)return;
    const history=readChatHistory(); history.push({id:`chat-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,kind,text:value,auto:Boolean(auto),view:appStore.get().view,at:new Date().toISOString()}); writeChatHistory(history);
  }
  restoreChatHistory(){
    if(this._chatHistoryHydrated)return;
    const log=this.querySelector('.chat-log'); if(!log)return;
    readChatHistory().forEach(item=>this.appendConversationMessage(item.kind==='user'?'user':'assistant',item.text,{auto:Boolean(item.auto),persist:false}));
    this._chatHistoryHydrated=true; log.scrollTop=log.scrollHeight;
  }
  systemViewLabel(view){
    return {assistant:'dashboard inicial',map:'mapa operacional',stages:'etapas e cronograma',agenda:'agenda',activities:'atividades',progress:'diário de obras',records:'registros',leads:'leads',commissions:'corretores e comissões',reports:'relatórios',settings:'configurações',purchases:'compras',inventory:'materiais',control:'central de controle'}[view]||'esta área';
  }
  systemSnapshot(state){
    const notifications=Array.isArray(state.operationalNotifications)?state.operationalNotifications:[];
    const control=state.controlRealtime||{};
    const cash=state.cashSummary||{};
    return {
      view:state.view, lastAction:String(state.lastAction||''),
      notifications:`${notifications.length}:${notifications.slice(0,4).map(item=>item.id||item.notificationId||item.updatedAt||item.title||item.message||'item').join('|')}`,
      cash:Number.isFinite(Number(cash.balanceCents))?Number(cash.balanceCents):Number.isFinite(Number(cash.balance))?Number(cash.balance):null,
      control:`${control.updatedAt||control.at||control.source||''}`,
      records:Array.isArray(state.records)?state.records.length:0
    };
  }
  updateMonitoring(state){
    const node=this.querySelector('[data-chat-monitoring]'); if(node)node.textContent=`MONITORANDO · ${this.systemViewLabel(state.view).toUpperCase()}`;
  }
  queueAutomaticMessage(text,key){
    if(!text||this._autoMessageKeys.has(key))return;
    this._autoMessageKeys.add(key); if(this._autoMessageKeys.size>120)this._autoMessageKeys.delete(this._autoMessageKeys.values().next().value);
    this._autoMessageQueue.push(text); clearTimeout(this._autoMessageTimer);
    this._autoMessageTimer=setTimeout(()=>{const messages=this._autoMessageQueue.splice(0,3);if(messages.length)this.appendConversationMessage('assistant',messages.join(' '),{auto:true});},260);
  }
  observeSystemState(state){
    const next=this.systemSnapshot(state); this.updateMonitoring(state);
    if(!this._observedSystemState){this._observedSystemState=next;return;}
    const previous=this._observedSystemState,events=[];
    if(next.view!==previous.view)events.push({key:`navigation:${next.view}:${next.lastAction}`,text:`Navegação detectada: você está em ${this.systemViewLabel(next.view)}. Vou acompanhar as informações desta área.`});
    else if(next.lastAction!==previous.lastAction&&!/^(Consulta IA:|IA (abriu|preparou|filtrou|executou)|Extensões administrativas carregadas|Painel aberto;)/i.test(next.lastAction))events.push({key:`action:${next.lastAction}`,text:`Registrei a mudança: ${next.lastAction}. Vou refletir isso no acompanhamento do sistema.`});
    if(next.notifications!==previous.notifications&&Number(next.notifications.split(':',1)[0])>0)events.push({key:`notifications:${next.notifications}`,text:'Recebi uma atualização operacional. Confira as notificações e os próximos responsáveis sugeridos.'});
    if(next.cash!==previous.cash&&next.cash!==null)events.push({key:`cash:${next.cash}`,text:'O caixa mestre foi atualizado. A prioridade das etapas, materiais e urgências deve ser recalculada a partir desse saldo.'});
    if(next.control!==previous.control&&next.control)events.push({key:`control:${next.control}`,text:'O centro de controle recebeu uma mudança em tempo real. Estou acompanhando as propagações dos workers.'});
    if(next.records!==previous.records)events.push({key:`records:${next.records}`,text:`O histórico de registros mudou para ${next.records} item(ns). Verifique evidências, responsável e local da atividade.`});
    this._observedSystemState=next; events.forEach(event=>this.queueAutomaticMessage(event.text,event.key));
  }
  handleSystemEvent(event){
    const detail=event?.detail||{},label=detail.name||detail.caseName||detail.id||'uma ação de teste';
    if(event.type==='belavista:test-case-completed')this.queueAutomaticMessage(`A suíte de testes concluiu ${label}. Vou manter o resultado no contexto desta sessão.`,`test-completed:${label}:${detail.at||detail.completedAt||''}`);
    if(event.type==='belavista:test-controls-changed')this.queueAutomaticMessage(`Os casos de teste foram ${detail.enabled===false?'desativados':'atualizados'}. Acompanhe as próximas entradas e propagações no painel.`,`test-controls:${detail.enabled}:${detail.at||''}`);
    if(event.type==='belavista:integrations-saved')this.queueAutomaticMessage('As configurações de integração foram salvas. O monitoramento segue preparado para os eventos operacionais.','integrations-saved');
  }
  contextualSuggestion(state){
    const stage=demoData.activities.find(item=>item.id===state.selectedStage)||demoData.activities[1];
    const stageName=stage?.name||'a etapa selecionada';
    const suggestions={
      assistant:{label:'PANORAMA OPERACIONAL',title:'Comece pelas frentes críticas',text:`Há ${demoData.metrics.delayed} etapas atrasadas e ${demoData.metrics.criticalPurchases} compras críticas. Sugiro revisar a drenagem e o abastecimento antes de avançar o calendário.`,actions:[['Ver etapas críticas','Abra as etapas críticas e avalie o próximo marco.']]},
      map:{label:'LEITURA DO MAPA',title:'Compare o destaque com o progresso',text:'O mapa está pronto para cruzar lotes, ruas e áreas de lazer com o avanço físico. Posso destacar a drenagem ou abrir uma seleção de progresso.',actions:[['Destacar drenagem','Destaque drenagem no mapa e mostre os riscos de execução.']]},
      stages:{label:'PLANEJAMENTO DE ETAPAS',title:`Atenção ao tempo de ${stageName}`,text:`A etapa está em ${stage?.progress||0}% e o cronograma soma as atividades em horas. O próximo ganho operacional é abrir o cronograma e conferir as dependências antes de liberar a frente.`,actions:[['Abrir cronograma','Abra o cronograma das etapas e sugira a próxima frente.'],['Ver atividades','Abra as atividades da etapa e mostre o que falta executar.']]},
      agenda:{label:'AGENDA OPERACIONAL',title:'Prepare os próximos envolvidos',text:'A agenda concentra confirmações, responsáveis e alertas de prazo. Vale enviar hoje os compromissos da etapa e criar o alerta do próximo marco.',actions:[['Preparar agenda','Prepare a agenda de hoje e sugira os responsáveis que precisam ser notificados.']]},
      activities:{label:'EXECUÇÃO DA ATIVIDADE',title:'Complete a próxima evidência',text:`A etapa ${stageName} precisa manter execução, medição e comprovantes relacionados. Posso abrir a atividade mais urgente e organizar os campos de preenchimento.`,actions:[['Organizar execução','Sugira a próxima atividade de execução para a etapa e os campos que faltam preencher.']]},
      progress:{label:'DIÁRIO DE OBRAS',title:'Transforme o avanço em evidência',text:'O diário ganha valor quando cada apontamento vincula responsável, área do mapa, medição e foto. Sugiro registrar o próximo avanço diretamente na superfície destacada.',actions:[['Registrar andamento','Abra um novo registro de andamento com os campos da natureza da etapa.']]},
      records:{label:'REGISTROS OPERACIONAIS',title:'Feche o registro com uma área',text:'Há mais rastreabilidade quando o registro leva atividade, responsável, evidência e trecho do modelo 3D. Posso preparar o formulário para pintar a área executada.',actions:[['Preparar registro','Abra um novo registro e prepare a seleção de área no mapa.']]},
      leads:{label:'OPORTUNIDADE COMERCIAL',title:'Priorize o próximo contato',text:`O funil tem ${demoData.metrics.leads} leads e ${demoData.metrics.lotsWithInterest} lotes com interesse. Sugiro agrupar por objetivo e abordar primeiro quem já indicou faixa de valor e lote.`,actions:[['Priorizar leads','Analise os leads qualificados e sugira uma próxima ação de marketing.'],['Agrupar por lote','Agrupe os leads por lote e destaque as oportunidades mais quentes.']]},
      commissions:{label:'GESTÃO COMERCIAL',title:'Conecte carteira e fechamento',text:'As carteiras ficam mais acionáveis quando cada responsável acompanha lotes, clientes, contrato e comissão em uma única sequência. Posso filtrar os lançamentos pendentes.',actions:[['Revisar comissões','Mostre os lançamentos de comissão pendentes e sugira a ordem de revisão.']]},
      reports:{label:'ANÁLISE GERENCIAL',title:'Escolha o indicador decisivo',text:`O relatório selecionado em ${state.reportFamily||'Financeiro'} pode ser lido junto com etapas, lançamentos e compras. Sugiro começar pelo desvio físico-financeiro e suas causas.`,actions:[['Analisar desvios','Abra o relatório de avanço físico-financeiro e explique os principais desvios.']]},
      settings:{label:'GOVERNANÇA DE USO',title:'Revise o que foi feito na sessão',text:'A auditoria local mostra as ações iteradas por Warley. Sugiro revisar os módulos mais usados e exportar o histórico antes de encerrar a sessão.',actions:[['Revisar auditoria','Mostre um resumo das ações tomadas nesta sessão e sugira uma melhoria de uso.']]},
      purchases:{label:'SUPRIMENTOS',title:'Antecipe o material crítico',text:`Há ${demoData.metrics.criticalPurchases} compras críticas. Sugiro cruzar atraso, etapa e saldo de material antes de confirmar a próxima frente.`,actions:[['Revisar compras','Liste as compras críticas e indique quais etapas estão bloqueadas.']]},
      inventory:{label:'MATERIAIS',title:'Confronte consumo e saldo',text:'O melhor próximo passo é comparar o consumo por etapa com os materiais comprometidos, evitando liberar uma frente sem cobertura.',actions:[['Analisar materiais','Analise o consumo e indique os materiais que exigem reposição.']]}
    };
    return suggestions[state.view]||suggestions.assistant;
  }
  announceContextualSuggestion(state,force=false){
    const log=this.querySelector('.chat-log');if(!log)return;
    const key=[state.view,state.activityDedicated?'dedicated':'overview',state.selectedStage||'',state.reportFamily||''].join(':');
    if(!force&&this._suggestionKey===key)return;
    const suggestion=this.contextualSuggestion(state);this._suggestionKey=key;
    log.querySelectorAll('[data-contextual-suggestion]').forEach(item=>item.remove());
    const actions=suggestion.actions.map(([label,message])=>`<button type="button" data-contextual-message="${esc(message)}">${ico('sparkles')} ${esc(label)}</button>`).join('');
    log.insertAdjacentHTML('afterbegin',`<article class="chat-contextual-suggestion" data-contextual-suggestion><div class="chat-contextual-kicker">${ico('sparkles')} ${esc(suggestion.label)} · IA</div><strong>${esc(suggestion.title)}</strong><p>${esc(suggestion.text)}</p><div class="chat-contextual-actions">${actions}</div></article>`);
    log.querySelectorAll('[data-contextual-message]').forEach(button=>button.addEventListener('click',()=>this.respond(button.dataset.contextualMessage)));
    log.scrollTop=0;window.lucide?.createIcons();
  }
  applySavedLayout(layout){
    if(!layout)return;
    if(Number.isFinite(layout.left))this.style.left=`${layout.left}px`;
    if(Number.isFinite(layout.top))this.style.top=`${layout.top}px`;
    if(Number.isFinite(layout.width))this.style.width=`${layout.width}px`;
    if(Number.isFinite(layout.height))this.style.height=`${layout.height}px`;
    if(Number.isFinite(layout.width)||Number.isFinite(layout.height))this._expandedSize={width:Number(layout.width)||390,height:Number(layout.height)||520};
    this.style.right='auto';this.style.bottom='auto';this.style.transform='none';
    this.classList.toggle('collapsed',Boolean(layout.collapsed));
  }
  restoreSavedLayout(){const layout=readChatWindowLayout()||appStore.get().widgetLayouts?.chat?.global;this.applySavedLayout(layout);if(layout&&!readChatWindowLayout())writeChatWindowLayout(layout);}
  saveLayout(){
    const parent=this.parentElement?.getBoundingClientRect(),rect=this.getBoundingClientRect();if(!parent)return;
    const collapsed=this.classList.contains('collapsed'),previous=readChatWindowLayout()||{},expanded=this._expandedSize||(!collapsed?{width:rect.width,height:rect.height}:null);
    const layout={left:Math.round(rect.left-parent.left),top:Math.round(rect.top-parent.top),width:Math.round(expanded?.width||previous.width||390),height:Math.round(expanded?.height||previous.height||Math.max(320,rect.height)),collapsed};
    writeChatWindowLayout(layout);
  }
  openMapContext(){
    this.chatMapContext=true;
    appStore.set({view:'map',lastAction:'Abriu os lotes 3D pelo chat da IA'});
    const map=document.querySelector('map-scene:not([compact])');
    if(map){map.classList.add('chat-map-focus');clearTimeout(this._mapFocusTimer);this._mapFocusTimer=setTimeout(()=>map.classList.remove('chat-map-focus'),1200);}
    const node=this.appendConversationMessage('user','🗺️ Contexto de lotes 3D aberto');
    node?.classList.add('chat-context-mini');
  }
  renderChatAttachment(){
    const slot=this.querySelector('[data-chat-attachment]');
    if(!slot)return;
    const attachment=this.chatAttachment;
    slot.hidden=!attachment;
    slot.innerHTML=attachment?`${ico('paperclip')}<span><b>Foto anexada</b><small>${esc(attachment.name)}</small></span><button type="button" data-chat-attachment-remove aria-label="Remover foto">×</button>`:'';
    slot.querySelector('[data-chat-attachment-remove]')?.addEventListener('click',()=>{this.chatAttachment=null;const input=this.querySelector('[data-chat-camera-input]');if(input)input.value='';this.renderChatAttachment();});
    window.lucide?.createIcons();
  }
  buildToolContext(){
    const state=appStore.get(),map=document.querySelector('map-scene:not([compact])');
    return {
      view:state.view,
      selectedStage:demoData.activities.find(item=>item.id===state.selectedStage)?.name||null,
      selectedRecord:state.selectedRecord||null,
      selectedLead:state.selectedLead||null,
      report:{family:state.reportFamily,type:state.reportType,period:state.reportPeriod},
      records:(state.records||[]).slice(0,5).map(item=>({id:item.id,activity:item.atividade,status:item.status,responsible:item.responsavel})),
      map:map?{ready:map.dataset.modelReady==='true',selected:map.dataset.selectedPart||null,highlight:map.stageOverlayKey||null,zoom:map.sceneManualZoom,rotation:map.sceneManualRotation,tilt:map.dataset.sceneTilt}:null,
      capabilities:['navigation','map-highlight','map-view','map-tiles','record-form','report-selection','commission-filter','print-confirmation']
    };
  }
  addToolFeedback(message,tone='done'){
    const log=this.querySelector('.chat-log');if(!log)return;
    log.insertAdjacentHTML('beforeend',`<div class="chat-tool-feedback ${esc(tone)}">${ico(tone==='pending'?'shield-check':'zap')}<span>${esc(message)}</span></div>`);
    log.scrollTop=log.scrollHeight;window.lucide?.createIcons();
  }
  requestToolConfirmation(call){
    const log=this.querySelector('.chat-log');if(!log)return;
    const scope=call.arguments?.scope==='map'?'mapa 3D e medidores':call.arguments?.scope==='contract'?'contrato atual':'escopo atual da página';
    const wrap=document.createElement('div');wrap.className='chat-tool-confirmation';
    wrap.innerHTML=`<b>${ico('printer')} Confirmar impressão</b><span>Abrir o diálogo do sistema para imprimir ${esc(scope)}?</span><div><button type="button" data-tool-confirm>Imprimir</button><button type="button" data-tool-cancel>Agora não</button></div>`;
    wrap.querySelector('[data-tool-confirm]')?.addEventListener('click',()=>{wrap.remove();appStore.set({printMode:true,lastAction:'Solicitou impressão pelo assistente'});window.print();setTimeout(()=>appStore.set({printMode:false}),500);});
    wrap.querySelector('[data-tool-cancel]')?.addEventListener('click',()=>{wrap.remove();this.addToolFeedback('Impressão cancelada.','muted');});
    log.append(wrap);log.scrollTop=log.scrollHeight;window.lucide?.createIcons();
  }
  executeToolCalls(calls=[]){
    const map=document.querySelector('map-scene:not([compact])'),allowedViews=new Set(['assistant','stages','agenda','activities','progress','records','leads','commissions','reports','settings']);
    const executed=[];
    for(const call of calls.slice(0,4)){
      const name=String(call?.name||''),args=call?.arguments&&typeof call.arguments==='object'?call.arguments:{};
      if(name==='ui.navigate'&&allowedViews.has(args.view)){appStore.set({view:args.view,sidebarCollapsed:args.view==='records',lastAction:`IA abriu ${args.view}`});executed.push(`Abriu ${args.view}.`);continue;}
      if(name==='map.set_overlay'&&map){if(args.category==='clear')map.clearStageOverlay?.(false);else if(['terraplanagem','drenagem','rede-agua','rede-eletrica','pavimentacao','urbanizacao'].includes(args.category))map.setStageOverlay?.(args.category,false);executed.push(args.category==='clear'?'Limpou destaque do mapa.':`Destacou ${args.category} no mapa.`);continue;}
      if(name==='map.adjust_view'&&map){if(args.fit)map.fitSceneView?.(true);else{if(Number.isFinite(Number(args.rotationDelta)))map.setSceneRotation?.(map.sceneManualRotation+Number(args.rotationDelta),true);if(Number.isFinite(Number(args.tiltDelta)))map.setSceneTiltAdjust?.(map.sceneTiltAdjust+Number(args.tiltDelta),true);if(Number.isFinite(Number(args.zoomDelta)))map.setSceneZoom?.(map.sceneManualZoom+Number(args.zoomDelta),true);}executed.push('Ajustou a vista 3D.');continue;}
      if(name==='map.set_tiles'&&map&&['satellite','osm'].includes(args.mode)){map.setMapTileMode?.(args.mode,true);executed.push(`Base ${args.mode==='osm'?'OpenStreetMap':'satélite'} ativada.`);continue;}
      if(name==='records.open_form'){appStore.set({view:'records',sidebarCollapsed:true,editingRecord:null,recordContext:{atividade:args.activity||'',responsavel:args.responsible||'',detalhes:args.details||''},lastAction:'IA preparou novo registro'});executed.push('Preparou um novo registro para revisão.');continue;}
      if(name==='reports.select'){const family=['Financeiro','Construção','Suprimentos','Comercial','Governança'].includes(args.family)?args.family:'Financeiro';appStore.set({view:'reports',reportFamily:family,reportType:args.reportType||appStore.get().reportType,lastAction:`IA abriu relatório ${family}`});executed.push(`Abriu relatórios de ${family}.`);continue;}
      if(name==='commissions.filter'){appStore.set({view:'commissions',commissionFilters:{...(appStore.get().commissionFilters||{}),query:args.query||'',status:args.status||'all',profile:args.profile||'all'},lastAction:'IA filtrou carteira comercial'});executed.push('Aplicou filtro na carteira comercial.');continue;}
      if(name==='ui.print'){this.requestToolConfirmation(call);executed.push('Solicitou confirmação para impressão.');continue;}
    }
    executed.forEach(message=>this.addToolFeedback(message));
    return executed;
  }
  async respond(text,attachment=null){
    appStore.set({lastAction:`Consulta IA: ${text.slice(0,48)}`});
    const userMessage=[text,this.chatMapContext?'· mapa 3D':'',attachment?`· 📷 ${attachment.name}`:''].filter(Boolean).join(' ');
    this.appendConversationMessage('user',userMessage);
    const answer=this.appendConversationMessage('assistant','Analisando…',{persist:false});
    try {
      const res=await apiFetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,view:appStore.get().view,mapContext:this.chatMapContext,context:this.buildToolContext(),attachment:attachment?{name:attachment.name,mimeType:attachment.mimeType,dataUrl:attachment.dataUrl}:null})});
      if(!res.ok) throw new Error((await res.json().catch(()=>({}))).error||`HTTP ${res.status}`);
      const payload=await res.json();const answerText=payload.text||'Ação preparada.';answer.textContent=answerText;this.persistChatMessage('assistant',answerText);const executed=this.executeToolCalls(Array.isArray(payload.toolCalls)?payload.toolCalls:[]);if(executed.length)appStore.set({lastAction:`IA executou ${executed.length} ferramenta(s)`});
    } catch(err) {
      const answerText=/compra|material/i.test(text) ? 'Encontrei 3 itens críticos. Posso abrir o card de compras e destacar as frentes impactadas no mapa.' : /lead/i.test(text) ? 'Há concentração de procura por lotes planos com frente Leste. Posso agrupar os leads por intenção.' : /atras|risco/i.test(text) ? 'Drenagem e rede elétrica concentram os maiores riscos nesta semana por dependência e abastecimento.' : 'Modo demonstração: configure GEMINI_API_KEY no servidor para respostas reais.';
      answer.textContent=answerText;this.persistChatMessage('assistant',answerText);
      console.warn('Gemini indisponível:',err);
    }
    const log=this.querySelector('.chat-log');if(log)log.scrollTop=log.scrollHeight;
  }
  enableDrag(){
    const handle=this.querySelector('.drag-handle'); if(!handle)return;
    let drag=null;
    const move=(e)=>{
      if(!drag||e.pointerId!==drag.pointerId)return;
      const parent=this.parentElement.getBoundingClientRect();
      const x=Math.max(8,Math.min(parent.width-this.offsetWidth-8,e.clientX-parent.left-drag.x));
      const y=Math.max(80,Math.min(parent.height-this.offsetHeight-8,e.clientY-parent.top-drag.y));
      this.style.left=x+'px'; this.style.top=y+'px'; this.style.right='auto'; this.style.bottom='auto';
    };
    const stop=(e)=>{
      if(drag&&(!e||e.pointerId===drag.pointerId)){
        handle.releasePointerCapture?.(drag.pointerId);
        drag=null; this.classList.remove('is-dragging');this.style.removeProperty('transition');this.saveLayout();
        window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',stop); window.removeEventListener('pointercancel',stop);
      }
    };
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button'))return;
      e.preventDefault();
      const r=this.getBoundingClientRect(); drag={pointerId:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};
      handle.setPointerCapture?.(e.pointerId); this.classList.add('is-dragging');this.style.transition='none';
      window.addEventListener('pointermove',move); window.addEventListener('pointerup',stop); window.addEventListener('pointercancel',stop);
    });
  }
  enableResize(){
    this.querySelectorAll('[data-resize]').forEach(handle=>handle.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      event.preventDefault(); event.stopPropagation();
      const parent=this.parentElement?.getBoundingClientRect(),rect=this.getBoundingClientRect(); if(!parent)return;
      const direction=handle.dataset.resize,initial={left:rect.left-parent.left,top:rect.top-parent.top,width:rect.width,height:rect.height,x:event.clientX,y:event.clientY};
      const minWidth=Math.min(320,Math.max(220,parent.width-16)),minHeight=Math.min(260,Math.max(180,parent.height-24));
      const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
      const maxWidth=Math.max(minWidth,parent.width-initial.left-8),maxHeight=Math.max(minHeight,parent.height-initial.top-8);
      const move=ev=>{
        const dx=ev.clientX-initial.x,dy=ev.clientY-initial.y; let left=initial.left,top=initial.top,width=initial.width,height=initial.height;
        if(direction.includes('e'))width=clamp(initial.width+dx,minWidth,maxWidth);
        if(direction.includes('s'))height=clamp(initial.height+dy,minHeight,maxHeight);
        if(direction.includes('w')){left=clamp(initial.left+dx,8,initial.left+initial.width-minWidth);width=initial.left+initial.width-left;}
        if(direction.includes('n')){top=clamp(initial.top+dy,8,initial.top+initial.height-minHeight);height=initial.top+initial.height-top;}
        this.style.left=`${left}px`; this.style.top=`${top}px`; this.style.right='auto'; this.style.bottom='auto'; this.style.width=`${width}px`; this.style.height=`${height}px`; this.style.transform='none';
      };
      const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop);handle.releasePointerCapture?.(event.pointerId);this.classList.remove('is-resizing');this.style.removeProperty('transition');this.saveLayout();};
      this.style.transition='none'; this.classList.add('is-resizing'); handle.setPointerCapture?.(event.pointerId); window.addEventListener('pointermove',move); window.addEventListener('pointerup',stop,{once:true}); window.addEventListener('pointercancel',stop,{once:true});
    }));
  }
}
if(!customElements.get('ai-chat')) customElements.define('ai-chat', AiChat);

export class MapScene extends HTMLElement {
  // BELAVISTA_ADMIN_3D_HARD_ISOLATION_V5370
  connectedCallback(){
    // O shell da SPA mantém esta mesma instância entre as páginas. O guard
    // evita que uma reconexão acidental descarte Leaflet, tiles e o contexto
    // WebGL já carregados.
    if(this._persistentMapMounted)return;
    this._persistentMapMounted=true;
    this.dataset.mapLifecycle='persistent-mounted';
    this.dataset.mapInstanceId=`map-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    this.selectedLotIds=new Set(); this.mapSelectionMode=null; this.progressSelectionParts=[];
    const savedMap=appStore.get().mapView||{},savedPan=savedMap.pan||{},isCurrentSceneState=Number(savedMap.sceneVersion)===MAP_SCENE_STATE_VERSION;
    this.mapTileMode=appStore.get().mapTileMode||'satellite'; this.dataset.mapTileMode=this.mapTileMode; this.sceneManualRotation=isCurrentSceneState?(Number(savedMap.rotation)||0):0; this.sceneManualZoom=isCurrentSceneState?(Number(savedMap.zoom)||INITIAL_SCENE_ZOOM):INITIAL_SCENE_ZOOM; this.sceneManualPan=isCurrentSceneState?{x:Number(savedPan.x)||0,y:Number(savedPan.y)||0}:{x:0,y:0}; this.sceneTiltAdjust=isCurrentSceneState?(Number(savedMap.tiltAdjust)||0):0; this.sceneUserInteracted=isCurrentSceneState&&Boolean(this.sceneManualRotation||this.sceneTiltAdjust||this.sceneManualPan.x||this.sceneManualPan.y||this.sceneManualZoom!==INITIAL_SCENE_ZOOM); this.initialSceneFocusApplied=this.sceneUserInteracted; this.stageOverlayKey=stageOverlayKey(demoData.activities.find(x=>x.id===appStore.get().selectedStage)?.name); this.dataset.sceneRotation=`${Math.round(this.sceneManualRotation)}deg`; this.dataset.sceneZoom=`${Math.round(this.sceneManualZoom*100)}%`; this.dataset.sceneZoomMax=`${Math.round(MAX_SCENE_ZOOM*100)}%`; this.dataset.scenePan=`${Math.round(this.sceneManualPan.x)},${Math.round(this.sceneManualPan.y)}`; this.dataset.scenePanAxis='x/y compartilhados · z fixo'; this.dataset.sceneAnchor='center'; this.dataset.sceneStateVersion=String(MAP_SCENE_STATE_VERSION); this.style.setProperty('--scene-anchor-x','50%'); this.style.setProperty('--scene-anchor-y','50%');
    if(this.hasAttribute('compact')){
      const full3d=true;
      if(!full3d){
        const stage=esc(this.getAttribute('data-stage')||'Etapa');
        this.dataset.renderMode='safe-thumbnail'; this.dataset.mapInit='safe-thumbnail';
        this.innerHTML=`<div class="safe-map-thumbnail"><span>MAPA OPERACIONAL</span><b>${stage}</b><small>Visualização segura</small></div>`;
        return;
      }
      this.renderCompact(); return;
    }
    // Modo seguro padrão: não cria Leaflet/WebGL durante a abertura da SPA.
    // A cena pesada fica isolada: exige confirmação dupla no endereço, para
    // que uma navegação normal nunca crie WebGL nem carregue o GLB de 22 MB.
    if(false){
      this.dataset.renderMode='safe-map';
      this.dataset.mapInit='safe-placeholder';
      this.innerHTML='<div class="safe-map-placeholder"><span>ALIANÇA PARK</span><strong>Mapa operacional</strong><small>Visualização segura ativada</small></div>';
      return;
    }
    sharedMapScene=this;
    const solarMarkup=`<div class="map-solar-control" data-solar-control aria-label="Iluminação solar do mapa"><div class="map-solar-head"><span>${ico('sun')} SOL</span><b data-solar-time>09:00</b></div><input type="range" min="5.5" max="17.8" step="0.25" value="9" data-solar-hour aria-label="Horário solar, do amanhecer ao entardecer"><div class="map-solar-scale"><span data-solar-sunrise>05:30</span><span>AMANHECER → ENTARDECER</span><span data-solar-sunset>17:45</span></div><small data-solar-location>DWG · localização solar</small></div>`;
      this.innerHTML=`<div class="map-host" aria-hidden="true"></div><div class="scene-world"><canvas class="three-overlay"></canvas></div><div class="map-tint"></div><div class="map-badge">${ico('layers-3')} <span>Satélite realista · visão temática</span></div><div class="map-category-switcher" role="group" aria-label="Categorias de visualização do mapa">${Object.entries(stageOverlayLabels).map(([key,label])=>`<button type="button" data-scene-overlay="${key}" class="overlay-${key}">${label}</button>`).join('')}<button type="button" data-scene-selection="progress" class="map-selection-launch">${ico('paintbrush')} Progresso</button></div><div class="map-rotation-controls" data-map-controls="connected" aria-label="Controles da cena compartilhada"><span>MAPA · VISTA 3D</span><div class="map-tile-switcher" role="group" aria-label="Base cartográfica"><button type="button" data-map-tiles="satellite">Satélite realista</button><button type="button" data-map-tiles="osm">Mapa OSM</button></div><div class="map-pan-pad" aria-label="Panorâmica"><button type="button" data-scene-pan="up" aria-label="Mover mapa para cima">↑</button><button type="button" data-scene-pan="left" aria-label="Mover mapa para a esquerda">←</button><button type="button" data-scene-pan="reset" aria-label="Centralizar mapa">⌖</button><button type="button" data-scene-pan="right" aria-label="Mover mapa para a direita">→</button><button type="button" data-scene-pan="down" aria-label="Mover mapa para baixo">↓</button></div><div class="map-view-row"><button type="button" data-scene-zoom="-0.08" aria-label="Afastar mapa">−</button><button type="button" data-scene-zoom="0.08" aria-label="Aproximar mapa">＋</button><button type="button" data-scene-tilt="-4" aria-label="Reduzir inclinação">▿</button><button type="button" data-scene-tilt="4" aria-label="Aumentar inclinação">▵</button></div><div class="map-rotation-row"><button type="button" data-scene-rotate="-15" aria-label="Girar para a esquerda">↺</button><button type="button" data-scene-rotate="15" aria-label="Girar para a direita">↻</button><button type="button" data-scene-rotate="reset" aria-label="Restaurar orientação">N</button></div><button type="button" class="map-fit-button" data-scene-fit aria-label="Ajustar enquadramento">⌗ Ajustar enquadramento</button></div><div class="map-gesture-legend" aria-label="Gestos de navegação do mapa"><span>Arraste para mover</span><b>Botão direito + arraste</b><span>girar</span><b>Ctrl + arraste</b><span>inclinar</span><b>Shift + arraste</b><span>inclinar</span><b>Alt + arraste</b><span>selecionar progresso</span><b>Roda do mouse</b><span>zoom</span><b>Ctrl + roda</b><span>zoom preciso</span></div>`;
    this.querySelector('.map-tint')?.insertAdjacentHTML('afterend',solarMarkup);
    // O dashboard administrativo compartilhado usa a mesma composição visual
    // do /leads, mas não é a página pública: seus controles, filtros e widgets
    // continuam interativos.
    const publicPresentation=this.isPublicCustomerExperience();
    if(publicPresentation){
      this.dataset.mapControls='public-disabled';
      this.querySelectorAll('.map-badge,.map-category-switcher,.map-rotation-controls,.map-gesture-legend,.map-selection-tools,.map-selection-panel,.map-v5-launcher,.compact-map-controls,.map-status-panel,[data-map-controls],[data-scene-selection]').forEach(node=>node.remove());
    }
    this.bindSolarControl();
    this.setMapTileMode(this.mapTileMode,false);
    if(!publicPresentation)this.bindSceneControls();
    this._lastOverlayStageId=appStore.get().selectedStage; this._lastStoreView=appStore.get().view; this.setMapContext(this._lastStoreView);
    // A cena administrativa marcada como compartilhada deve passar pelo
    // mesmo carregador do /leads. O renderer isolado permanece como fallback
    // para montagens administrativas antigas sem esse contrato.
    if(this.isAdminStandalone3DV5370()){
      this.mountAdminStandalone3DV5370();
    }else{
      this.initWhenReady();
    }
    appStore.subscribe(s=>{if(this._lastStoreView!==s.view){this._lastStoreView=s.view;this.setMapContext(s.view);}if(s.solarHourMode==='manual'&&Number.isFinite(Number(s.solarHour))&&Math.abs(Number(s.solarHour)-Number(this.solarHour||0))>.01)this.setSolarHour(s.solarHour,false,false);this.dataset.mode=s.mapMode;this.setMapTileMode(s.mapTileMode||'satellite',false);const stage=demoData.activities.find(x=>x.id===s.selectedStage);if(!publicPresentation&&stage&&this._lastOverlayStageId!==s.selectedStage){this._lastOverlayStageId=s.selectedStage;this.setStageOverlay(stage.name,false);}});
    this.addEventListener('click',e=>{if(e.target.closest('.leaflet-control,.map-solar-control,.map-badge,.map-category-switcher,.map-selection-tools,.map-selection-panel,.map-gesture-legend,.map-rotation-controls')||performance.now()<this._suppressMapToggleUntil)return;appStore.set({mapMode:appStore.get().mapMode==='overview'?'focus':'overview',lastAction:'Alternou foco do mapa'});});
  }
  isPublicMapVisual(){
    return (
      this.hasAttribute('data-public-map')||
      this.hasAttribute('data-public-presentation')
    );
  }

  isPublicCustomerExperience(){
    return this.isPublicMapVisual()&&!this.hasAttribute('data-admin-shared-public-map');
  }

  isPublicCameraPreset(){
    return (
      (
        this.isPublicCustomerExperience()&&
        this.dataset.publicCameraInteracted!=='true'
      )||
      (
        this.hasAttribute('data-admin-shared-public-map')&&
        this.dataset.adminPublicCameraPreset==='true'&&
        this.dataset.adminCameraInteracted!=='true'
      )
    );
  }

  markAdminCameraInteracted(){
    if(this.isPublicCustomerExperience()){
      this.dataset.publicCameraInteracted='true';
    }
    if(this.hasAttribute('data-admin-shared-public-map')){
      this.dataset.adminCameraInteracted='true';
    }
  }

  isAdminStandalone3DV5370(){
    if(this.hasAttribute('data-activity-location-editor'))return false;
    return (
      location.pathname==='/admin'||
      location.pathname.startsWith('/admin/')||
      this.hasAttribute('data-admin-shared-public-map')||
      Boolean(this.closest('belavista-app'))
    );
  }

  mountAdminStandalone3DV5370(){
    if(this._adminStandaloneMountedV5370)return;
    this._adminStandaloneMountedV5370=true;

    this.dataset.mapInit='admin-static-first-v5370';
    this.dataset.adminStandaloneBoot='static-first';
    this.dataset.three='deferred';
    this.dataset.modelRender='static-first-paint';
    this.dataset.modelBootVersion='5.3.70';

    const host=this.querySelector('.map-host');
    if(host){
      // A base provisória não pode simular um gramado sob o loteamento. A
      // imagem aérea entra quando estiver pronta; até lá o shell conserva
      // apenas uma superfície neutra, sem competir com o modelo 3D.
      host.style.setProperty('background-image','none','important');
      host.style.backgroundColor='#07111f';
      host.style.backgroundSize='cover';
      host.style.backgroundPosition='center';
      host.style.backgroundRepeat='no-repeat';
      host.style.opacity='1';
      host.style.visibility='visible';
      host.style.display='block';
      host.style.pointerEvents='none';
      host.style.zIndex='0';
    }

    this.style.setProperty('background-image','none','important');
    this.style.backgroundColor='#07111f';
    this.style.backgroundSize='cover';
    this.style.backgroundPosition='center';

    const canvas=this.querySelector('.three-overlay');
    if(canvas){
      canvas.style.opacity='0';
      canvas.style.pointerEvents='none';
    }

    const badge=this.querySelector('.map-badge');
    if(badge){
      badge.insertAdjacentHTML(
        'afterend',
        `<button type="button"
          class="admin-3d-safe-activate-v5370"
          data-admin-3d-activate-v5370>
          <b>Ativar 3D</b>
          <small>Renderer isolado · sem Leaflet · sem loops</small>
        </button>`
      );
    }

    const button=this.querySelector('[data-admin-3d-activate-v5370]');
    button?.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      button.disabled=true;
      button.querySelector('b').textContent='Carregando 3D…';
      this.startAdminStandalone3DV5370()
        .then(()=>{
          button.remove();
        })
        .catch(error=>{
          button.disabled=false;
          button.querySelector('b').textContent='Tentar 3D novamente';
          button.querySelector('small').textContent=
            String(error?.message||error).slice(0,120);
          console.error('[Aliança Park v5.3.70] 3D isolado falhou.',error);
        });
    },true);

    // BELAVISTA_ADMIN_3D_AUTOSTART_V5377
    // A primeira pintura continua leve, mas o modelo real entra sozinho logo
    // depois que o shell está utilizável. O botão permanece como fallback
    // explícito caso WebGL ou a rede não estejam disponíveis.
    const startAfterFirstPaint=()=>{
      if(!this.isConnected||this._adminStandaloneStartQueuedV5377)return;
      this._adminStandaloneStartQueuedV5377=true;
      this.dataset.admin3dAutostart='queued-after-first-paint';
      if(button){
        button.disabled=true;
        button.setAttribute('aria-busy','true');
        button.querySelector('b').textContent='Carregando mapa 3D…';
        button.querySelector('small').textContent='A interface já está pronta; finalizando a cena.';
      }
      this.startAdminStandalone3DV5370()
        .then(()=>{
          this.dataset.admin3dAutostart='ready';
          button?.remove();
        })
        .catch(error=>{
          this.dataset.admin3dAutostart='fallback';
          if(button){
            button.disabled=false;
            button.removeAttribute('aria-busy');
            button.querySelector('b').textContent='Tentar 3D novamente';
            button.querySelector('small').textContent='Mapa base preservado; toque para tentar de novo.';
          }
          console.error('[Aliança Park v5.3.77] 3D automático falhou; mapa base preservado.',error);
        });
    };
    requestAnimationFrame(()=>setTimeout(startAfterFirstPaint,180));

    try{
      localStorage.setItem(
        'belavista.3d.boot.last.v5370',
        JSON.stringify({
          version:'5.3.70',
          phase:'static-ready',
          at:new Date().toISOString()
        })
      );
    }catch{}
  }

  persistAdminStandalonePhaseV5370(phase,extra={}){
    const payload={
      version:'5.3.70',
      phase,
      at:new Date().toISOString(),
      ...extra
    };
    globalThis.__BELAVISTA_ADMIN_STANDALONE_3D_V5370=payload;
    this.dataset.adminStandalonePhase=phase;
    try{
      localStorage.setItem(
        'belavista.3d.boot.last.v5370',
        JSON.stringify(payload)
      );
    }catch{}
    return payload;
  }

  async startAdminStandalone3DV5370(){
    if(this._adminStandalonePromiseV5370){
      return this._adminStandalonePromiseV5370;
    }

    const run=async()=>{
      this.persistAdminStandalonePhaseV5370('import-three');

      const THREE=await import(
        'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'
      );
      const {GLTFLoader}=await import(
        'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'
      );
      this.THREE=THREE;

      this.persistAdminStandalonePhaseV5370('renderer');

      const canvas=this.querySelector('.three-overlay');
      if(!canvas)throw new Error('Canvas 3D ausente.');

      const sceneWorld=this.querySelector('.scene-world');
      if(sceneWorld){
        sceneWorld.style.display='block';
        sceneWorld.style.visibility='visible';
        sceneWorld.style.opacity='1';
        sceneWorld.style.position='absolute';
        sceneWorld.style.inset='0';
        sceneWorld.style.zIndex='2';
        sceneWorld.style.pointerEvents='auto';
      }

      // Desliga qualquer contexto legado que tenha escapado de versões antigas.
      try{
        this._mapResizeObserver?.disconnect?.();
        this._compactResizeObserver?.disconnect?.();
      }catch{}

      const renderer=new THREE.WebGLRenderer({
        canvas,
        alpha:true,
        antialias:false,
        powerPreference:'low-power',
        precision:'mediump',
        preserveDrawingBuffer:false
      });
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(1);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1;

      const scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(34,1,.1,4000);
      camera.position.set(0,-180,165);
      camera.lookAt(0,0,0);

      const hemisphere=new THREE.HemisphereLight(0xe5f1ff,0x203024,2.3);
      const sun=new THREE.DirectionalLight(0xffffff,3.2);
      sun.castShadow=true;
      sun.position.set(-100,-130,220);
      sun.target.position.set(0,0,0);
      scene.add(hemisphere,sun,sun.target);
      this._adminStandaloneSolarHemisphere=hemisphere;
      this._adminStandaloneSolarLight=sun;
      this.applySolarLighting(solarStateForHour(this.solarHour??appStore.get().solarHour??9,this.solarGeo||MAP_GEOREFERENCE_FALLBACK));

      const stage=new THREE.Group();
      scene.add(stage);

      this._adminStandaloneRendererV5370=renderer;
      this._adminStandaloneSceneV5370=scene;
      this._adminStandaloneCameraV5370=camera;
      this._adminStandaloneStageV5370=stage;

      // NÃO preencher this.sceneStage/this.map/this.modelGroup:
      // isso mantém todo o runtime legado de syncThree/setSceneVisual inerte.

      const fit=()=>{
        const rect=canvas.getBoundingClientRect();
        const width=Math.max(2,Math.round(rect.width));
        const height=Math.max(2,Math.round(rect.height));
        const sizeKey=`${width}x${height}`;
        if(this._adminStandaloneSizeV5370===sizeKey)return;
        this._adminStandaloneSizeV5370=sizeKey;
        renderer.setSize(width,height,false);
        camera.aspect=width/height;
        camera.updateProjectionMatrix();
        renderer.render(scene,camera);
      };

      fit();

      if(window.ResizeObserver){
        this._adminStandaloneResizeObserverV5370?.disconnect?.();
        this._adminStandaloneResizeObserverV5370=
          new ResizeObserver(()=>requestAnimationFrame(fit));
        this._adminStandaloneResizeObserverV5370.observe(this);
      }

      canvas.style.opacity='1';
      canvas.style.visibility='visible';
      canvas.style.display='block';
      canvas.style.pointerEvents='auto';
      canvas.style.touchAction='none';
      canvas.style.position='absolute';
      canvas.style.inset='0';
      canvas.style.zIndex='2';

      this.persistAdminStandalonePhaseV5370('download');

      const loader=new GLTFLoader();
      const gltf=await new Promise((resolve,reject)=>{
        loader.load(
          runtimeRouteV1('/assets/model/alianca_park_masterplan_preview.glb','v=standalone-5371'),
          resolve,
          progress=>{
            if(progress.total){
              this.persistAdminStandalonePhaseV5370(
                'download',
                {
                  percent:Math.round(progress.loaded/progress.total*100),
                  loaded:progress.loaded,
                  total:progress.total
                }
              );
            }
          },
          reject
        );
      });

      this.persistAdminStandalonePhaseV5370('parsed');

      const source=gltf.scene;
      const sourceBox=new THREE.Box3().setFromObject(source);
      const size=sourceBox.getSize(new THREE.Vector3());
      const center=sourceBox.getCenter(new THREE.Vector3());
      const largest=Math.max(size.x,size.y,size.z)||1;
      const factor=138/largest;

      source.position.set(-center.x,-sourceBox.min.y,-center.z);

      const wrapper=new THREE.Group();
      wrapper.add(source);
      wrapper.scale.set(
        factor,
        factor*MODEL_VERTICAL_EXAGGERATION,
        factor
      );
      wrapper.rotation.set(Math.PI/2,0,0);
      wrapper.updateMatrixWorld(true);

      const oriented=new THREE.Box3().setFromObject(wrapper);
      wrapper.position.z+=Math.max(0,-oriented.min.z);
      wrapper.updateMatrixWorld(true);

      // Materiais administrativos simples: nenhuma textura GLB é enviada
      // para GPU. Isso remove o maior vetor de estouro/compilação no boot.
      const materials={
        lots:new THREE.MeshBasicMaterial({
          color:0x75c98a,
          side:THREE.DoubleSide
        }),
        streets:new THREE.MeshBasicMaterial({
          color:0x858b89,
          side:THREE.DoubleSide
        }),
        landscape:new THREE.MeshBasicMaterial({
          color:0x2f8b57,
          side:THREE.DoubleSide
        }),
        leisure:new THREE.MeshBasicMaterial({
          color:0xd8d0b6,
          side:THREE.DoubleSide
        }),
        other:new THREE.MeshBasicMaterial({
          color:0xaeb8ae,
          side:THREE.DoubleSide
        })
      };

      const meshes=[];
      const activityPartOrdinals={lots:0,streets:0,other:0};
      let skippedHuge=0;
      let totalTriangles=0;

      source.traverse(node=>{
        if(!node.isMesh)return;

        const geometry=node.geometry;
        const triangles=geometry?.index
          ? Math.floor((geometry.index.count||0)/3)
          : Math.floor(
              (geometry?.getAttribute?.('position')?.count||0)/3
            );

        node.userData.__v5370Triangles=Number(triangles)||0;
        totalTriangles+=node.userData.__v5370Triangles;

        const name=String(node.name||'').toLowerCase();
        const role=String(node.userData?.belavistaRole||'').toLowerCase();

        const kind=
          role==='lot'||role==='lots'||/(lote|quadra|gleba)/.test(name)
            ? 'lots'
            : role==='street'||role==='streets'||role==='road'||
              /(asfalto|rua|road|street|meio.?fio|guia|paviment)/.test(name)
              ? 'streets'
              : role==='landscape'||
                /arvore|tree|tronco|copa|folhagem/.test(name)
                ? 'landscape'
                : role==='leisure'||
                  /lazer|court|gym|pavilhao|play|praca/.test(name)
                  ? 'leisure'
                  : 'other';

        // Descarta texturas/materiais originais no renderer administrativo.
        node.material=materials[kind];
        const physicalKind=kind==='lots'||kind==='streets'?kind:'other';
        activityPartOrdinals[physicalKind]++;
        node.userData.partKind=physicalKind;
        node.userData.partId=physicalKind==='lots'
          ? node.name
          : physicalKind==='streets'
            ? `street-source-${activityPartOrdinals.streets}`
            : (node.name||`other-${activityPartOrdinals.other}`);
        node.userData.partLabel=physicalKind==='lots'
          ? `Lote ${String(node.name||'').replace(/^.*?lote[_ -]?/i,'')}`
          : physicalKind==='streets'
            ? `Trecho viário ${activityPartOrdinals.streets}`
            : kind==='leisure'
              ? 'Área social'
              : String(node.name||'Elemento do empreendimento');
        node.userData.defaultMaterial=node.material;
        node.visible=false;
        node.frustumCulled=true;

        // Mesh extremamente grande fica fora da visualização segura.
        if(node.userData.__v5370Triangles>220000){
          node.userData.__v5370Skipped='triangle-limit';
          skippedHuge++;
          return;
        }

        meshes.push(node);
      });

      meshes.sort(
        (a,b)=>
          (a.userData.__v5370Triangles||0)-
          (b.userData.__v5370Triangles||0)
      );

      stage.add(wrapper);

      // BELAVISTA_ADMIN_3D_CAMERA_FIT_V5372
      // Centraliza no plano e calcula câmera a partir do bounding sphere real.
      let fitBox=new THREE.Box3().setFromObject(wrapper);
      let fitCenter=fitBox.getCenter(new THREE.Vector3());

      wrapper.position.x-=fitCenter.x;
      wrapper.position.y-=fitCenter.y;
      wrapper.position.z-=fitBox.min.z;
      wrapper.updateMatrixWorld(true);

      fitBox=new THREE.Box3().setFromObject(wrapper);
      fitCenter=fitBox.getCenter(new THREE.Vector3());

      const fitSphere=fitBox.getBoundingSphere(new THREE.Sphere());
      const fitRadius=Math.max(1,fitSphere.radius);
      const halfFov=THREE.MathUtils.degToRad(camera.fov*.5);
      const fitDistance=(fitRadius/Math.tan(halfFov))*1.35;

      camera.position.set(
        fitCenter.x,
        fitCenter.y-fitDistance*.82,
        fitCenter.z+fitDistance*.62
      );
      camera.near=Math.max(.05,fitDistance/1000);
      camera.far=Math.max(5000,fitDistance*12);
      camera.zoom=1;
      camera.updateProjectionMatrix();
      camera.lookAt(fitCenter);

      // O renderer administrativo mantém o mesmo estado de navegação da
      // cena compartilhada, mas em grupos/câmeras próprios. Registrar o
      // envelope do modelo aqui permite que pan e rotação sejam recalculados
      // sem depender do runtime legado do mapa.
      this._adminStandaloneWrapperV5370=wrapper;
      this._adminStandaloneFitBoxV5370=fitBox.clone();
      this._adminStandaloneFitCenterV5370=fitCenter.clone();
      this._adminStandaloneFitRadiusV5370=fitRadius;
      this._adminStandaloneRotationV5370=0;
      this._adminStandalonePanV5370={x:0,y:0};
      this.sceneManualRotation=0;
      this.sceneManualPan={x:0,y:0};
      this.sceneManualZoom=Number(camera.zoom)||1;
      this.dataset.sceneRotation='0deg';
      this.dataset.scenePan='0,0';
      this.dataset.sceneZoom=`${Math.round(camera.zoom*100)}%`;
      this.dataset.scenePanSpace='world-translation · zoom-aware · standalone-fit-envelope';

      this.dataset.admin3dFitRadius=fitRadius.toFixed(2);
      this.dataset.admin3dFitDistance=fitDistance.toFixed(2);
      this.persistAdminStandalonePhaseV5370(
        'camera-fit',
        {
          radius:Number(fitRadius.toFixed(2)),
          distance:Number(fitDistance.toFixed(2)),
          center:[
            Number(fitCenter.x.toFixed(2)),
            Number(fitCenter.y.toFixed(2)),
            Number(fitCenter.z.toFixed(2))
          ]
        }
      );

      // O renderer administrativo é isolado para não reativar os loops do
      // mapa legado. Ainda assim, a base precisa ser a mesma imagem satélite
      // georreferenciada usada pelo /leads — nunca um plano verde sintético.
      void this.loadAdminStandaloneSatelliteBaseV5380({
        THREE,
        stage,
        fitBox,
        fitCenter
      }).catch(error=>{
        this.dataset.adminSatelliteState='unavailable';
        this.dataset.adminSatelliteSource='neutral base retained · satellite-only policy';
        console.warn('[Aliança Park v5.3.80] mosaico satélite administrativo indisponível.',error);
      });

      this.persistAdminStandalonePhaseV5370(
        'gpu-staging',
        {
          meshCount:meshes.length,
          skippedHuge,
          totalTriangles
        }
      );

      // Cena renderizável, porém nenhum mesh do GLB está visível ainda.
      renderer.render(scene,camera);

      for(let index=0;index<meshes.length;index++){
        const node=meshes[index];
        this.persistAdminStandalonePhaseV5370(
          'gpu-mesh',
          {
            meshNumber:index+1,
            meshCount:meshes.length,
            meshName:String(node.name||'mesh').slice(0,120),
            meshTriangles:node.userData.__v5370Triangles||0
          }
        );

        node.visible=true;
        renderer.render(scene,camera);

        this.persistAdminStandalonePhaseV5370(
          'gpu-mesh-visible',
          {
            meshNumber:index+1,
            meshCount:meshes.length,
            meshName:String(node.name||'mesh').slice(0,120),
            meshTriangles:node.userData.__v5370Triangles||0
          }
        );

        await new Promise(resolve=>
          requestAnimationFrame(()=>resolve())
        );
      }

      this.dataset.modelRender='admin-standalone-live-v5370';
      this.activityMapStandaloneParts=meshes;
      this.buildAdminStandaloneStageOverlayTargetsV5370();
      this.dataset.modelReady='true';
      this.modelReady=true;
      canvas.style.opacity='1';
      canvas.style.visibility='visible';
      sceneWorld?.style.setProperty('display','block');
      sceneWorld?.style.setProperty('visibility','visible');
      sceneWorld?.style.setProperty('opacity','1');
      this.modelReady=true;
      canvas.style.opacity='1';
      canvas.style.visibility='visible';
      sceneWorld?.style.setProperty('display','block');
      sceneWorld?.style.setProperty('visibility','visible');
      sceneWorld?.style.setProperty('opacity','1');
      this.dataset.modelParts=
        `meshes:${meshes.length}|ignorados:${skippedHuge}`;
      this.classList.add('model-ready');
      if(this.stageOverlayKey)this.applyAdminStandaloneStageOverlayV5370(this.stageOverlayKey);

      // Controle direto do renderer isolado: sem appStore, Leaflet,
      // syncThree, compact mirrors ou observers de runtime.
      let down=null;
      let last=null;
      let mode='';

      canvas.addEventListener('contextmenu',event=>
        event.preventDefault()
      );

      canvas.addEventListener(
        'wheel',
        event=>{
          event.preventDefault();
          const direction=event.deltaY<0?1.10:.91;
          camera.zoom=Math.max(.45,Math.min(4.5,camera.zoom*direction));
          camera.updateProjectionMatrix();
          renderer.render(scene,camera);
        },
        {passive:false}
      );

      canvas.addEventListener('pointerdown',event=>{
        down=last={x:event.clientX,y:event.clientY};
        mode=event.button===2?'rotate':'pan';
        canvas.setPointerCapture?.(event.pointerId);
      });

      canvas.addEventListener('pointermove',event=>{
        if(!down||!last)return;
        const dx=event.clientX-last.x;
        const dy=event.clientY-last.y;

        if(mode==='rotate'){
          this.setSceneRotation(
            (this._adminStandaloneRotationV5370||0)-dx*.32,
            false
          );
        }else{
          const delta=this.screenDragPanDelta(last.x,last.y,event.clientX,event.clientY);
          const pan=this.sceneManualPan||{x:0,y:0};
          this.setScenePan(
            (Number(pan.x)||0)+(Number(delta?.x)||0),
            (Number(pan.y)||0)+(Number(delta?.y)||0),
            false
          );
          this.dataset.mapPanBehavior=
            'world-translation · projected screen delta · rotation-safe v5378';
        }

        last={x:event.clientX,y:event.clientY};
        renderer.render(scene,camera);
      });

      const release=event=>{
        if(canvas.hasPointerCapture?.(event.pointerId)){
          canvas.releasePointerCapture(event.pointerId);
        }
        down=null;
        last=null;
        mode='';
      };

      canvas.addEventListener('pointerup',release);
      canvas.addEventListener('pointercancel',release);

      this.persistAdminStandalonePhaseV5370(
        'ready',
        {
          meshCount:meshes.length,
          skippedHuge,
          totalTriangles
        }
      );

      renderer.render(scene,camera);
      return true;
    };

    this._adminStandalonePromiseV5370=run().finally(()=>{
      this._adminStandalonePromiseV5370=null;
    });

    return this._adminStandalonePromiseV5370;
  }

  async loadAdminStandaloneSatelliteBaseV5380({THREE,stage,fitBox,fitCenter}){
    if(this._adminStandaloneSatellitePromiseV5380){
      return this._adminStandaloneSatellitePromiseV5380;
    }

    const run=async()=>{
      this.dataset.adminSatelliteState='loading';
      this.dataset.adminSatelliteSource='DWG GPS centre · Esri World Imagery';

      const response=await fetch(
        runtimeRouteV1('/assets/data/dwg-georeference.json','v=satellite-ground-v5380'),
        {cache:'no-store'}
      );
      if(!response.ok)throw new Error(`DWG HTTP ${response.status}`);
      const geo=await response.json();
      const center=(geo.controlPoints||[]).find(point=>point.id==='site-center')||geo.controlPoints?.[0];
      const latitude=Number(center?.lat),longitude=Number(center?.lng);
      if(!Number.isFinite(latitude)||!Number.isFinite(longitude)){
        throw new Error('Centro GPS ausente no DWG');
      }

      const zoom=17,columns=3,rows=3,n=2**zoom,rad=Math.PI/180;
      const xf=(longitude+180)/360*n;
      const yf=(1-Math.asinh(Math.tan(latitude*rad))/Math.PI)/2*n;
      const x0=Math.floor(xf-columns/2),y0=Math.floor(yf-rows/2);
      const canvas=document.createElement('canvas');
      canvas.width=columns*256;
      canvas.height=rows*256;
      const context=canvas.getContext('2d');
      if(!context)throw new Error('Canvas satélite indisponível');
      context.fillStyle='#07111f';
      context.fillRect(0,0,canvas.width,canvas.height);

      const sources=mapTileSources.satellite||[];
      const loadTile=(row,column,tileX,tileY)=>new Promise(resolve=>{
        let attempt=0;
        const load=()=>{
          const source=sources[attempt];
          if(!source){resolve(null);return;}
          const image=new Image();
          image.crossOrigin='anonymous';
          image.onload=()=>resolve({row,column,image});
          image.onerror=()=>{attempt++;load();};
          image.src=source.url(zoom,((tileX%n)+n)%n,tileY);
        };
        load();
      });

      const tiles=[];
      for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
        const tileY=y0+row;
        if(tileY<0||tileY>=n)continue;
        tiles.push(loadTile(row,column,x0+column,tileY));
      }
      const results=await Promise.all(tiles);
      const loaded=results.filter(Boolean);
      if(!loaded.length)throw new Error('Nenhum tile satélite respondeu');
      loaded.forEach(tile=>{
        context.drawImage(tile.image,tile.column*256,tile.row*256,256,256);
      });
      context.fillStyle='rgba(4,11,22,.035)';
      context.fillRect(0,0,canvas.width,canvas.height);

      const texture=new THREE.CanvasTexture(canvas);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.generateMipmaps=false;
      texture.minFilter=THREE.LinearFilter;
      texture.magFilter=THREE.LinearFilter;
      texture.needsUpdate=true;

      const material=new THREE.MeshBasicMaterial({
        map:texture,
        color:0xffffff,
        side:THREE.DoubleSide,
        transparent:false,
        depthTest:false,
        depthWrite:false
      });
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
      const footprint=fitBox.getSize(new THREE.Vector3());
      plane.scale.set(
        Math.max(footprint.x*1.42,1),
        Math.max(footprint.y*1.42,1),
        1
      );
      plane.position.set(
        fitCenter.x,
        fitCenter.y,
        fitBox.min.z-.08
      );
      plane.renderOrder=-20;
      plane.frustumCulled=false;
      plane.userData={
        adminSatelliteBase:true,
        source:'satellite tile mosaic · Esri World Imagery',
        coordinateSource:'DWG site-center',
        center:[latitude,longitude],
        zoom,
        tiles:`${loaded.length}/${results.length}`
      };
      stage.add(plane);
      this._adminStandaloneSatellitePlaneV5380=plane;
      this.dwgGeo=geo;
      this.dataset.adminSatelliteState='ready';
      this.dataset.adminSatelliteCenter=`${latitude.toFixed(8)},${longitude.toFixed(8)}`;
      this.dataset.adminSatelliteTiles=`${loaded.length}/${results.length}`;
      this.dataset.adminSatelliteGround='satellite image only · no synthetic green base';
      this._adminStandaloneRendererV5370?.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370
      );
      return plane;
    };

    this._adminStandaloneSatellitePromiseV5380=run().finally(()=>{
      this._adminStandaloneSatellitePromiseV5380=null;
    });
    return this._adminStandaloneSatellitePromiseV5380;
  }

  bindSolarControl(){
    if(this._solarControlBound)return;
    const control=this.querySelector('[data-solar-control]'),input=control?.querySelector('[data-solar-hour]');
    if(!control||!input)return;
    this._solarControlBound=true;
    const update=()=>this.setSolarHour(input.value,false,false);
    input.addEventListener('input',update);
    input.addEventListener('change',()=>this.setSolarHour(input.value,true,true));
    control.addEventListener('pointerdown',event=>event.stopPropagation());
    const stored=appStore.get(),clockHour=localClockHourForGeo(MAP_GEOREFERENCE_FALLBACK),manual=stored.solarHourMode==='manual'&&Number.isFinite(Number(stored.solarHour));
    this.setSolarHour(manual?Number(stored.solarHour):clockHour,false,false);
    this.dataset.solarInitialMode=manual?'manual':'clock';
    this.dataset.solarClockHour=clockHour.toFixed(2);
    window.lucide?.createIcons?.({attrs:{'stroke-width':1.5}});
  }
  setSolarHour(value=9,persist=false,announce=false){
    const point=this.dwgGeo?.drawingBounds?.center||this.dwgGeo?.controlPoints?.find(item=>item.id==='site-center')||MAP_GEOREFERENCE_FALLBACK;
    const geo={...MAP_GEOREFERENCE_FALLBACK,...point,label:this.dwgGeo?.source?.project||point.label||MAP_GEOREFERENCE_FALLBACK.label};
    const windowState=solarWindowForGeo(geo),min=windowState.sunrise,max=windowState.sunset;
    const numericValue=Number(value),hour=Math.max(min,Math.min(max,Number.isFinite(numericValue)?numericValue:windowState.solarNoon));
    this.solarGeo=geo;this.solarHour=hour;this._solarWindow=windowState;
    const control=this.querySelector('[data-solar-control]'),input=control?.querySelector('[data-solar-hour]');
    if(input){input.min=min.toFixed(2);input.max=max.toFixed(2);input.value=hour.toFixed(2);}
    const time=solarHourLabel(hour),sunrise=solarHourLabel(min),sunset=solarHourLabel(max),state=solarStateForHour(hour,geo);
    const timeNode=control?.querySelector('[data-solar-time]'),sunriseNode=control?.querySelector('[data-solar-sunrise]'),sunsetNode=control?.querySelector('[data-solar-sunset]'),locationNode=control?.querySelector('[data-solar-location]');
    if(timeNode)timeNode.textContent=time;
    if(sunriseNode)sunriseNode.textContent=sunrise;
    if(sunsetNode)sunsetNode.textContent=sunset;
    if(locationNode)locationNode.textContent=`DWG · ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`;
    const lightness=.78+state.elevation*.27,warmth=(1-state.elevation)*.14;
    this.style.setProperty('--solar-filter',`brightness(${lightness.toFixed(3)}) saturate(${(0.88+state.elevation*.18).toFixed(3)}) sepia(${warmth.toFixed(3)})`);
    this.dataset.solarHour=hour.toFixed(2);this.dataset.solarTime=time;this.dataset.solarWindow=`${sunrise}–${sunset}`;this.dataset.solarSource='DWG geographic centre · solar position';
    this.applySolarLighting(state);
    if(persist)appStore.set({solarHour:hour,solarHourMode:'manual',lastAction:`Horário solar ajustado para ${time}`});
    if(announce)notify(`Iluminação solar ajustada para ${time}.`,'success');
  }
  applySolarLighting(state){
    const THREE=this.THREE;if(!THREE)return;
    const distance=320,azimuth=state.azimuth,elevation=state.elevation;
    const targets=[this.solarLight,this._adminStandaloneSolarLight].filter(Boolean);
    targets.forEach(light=>{
      // O sol atravessa a base do enquadramento no amanhecer/entardecer e
      // sobe ao zênite no meio do dia. A posição física alimenta as sombras.
      const horizon=state.daylight?Math.max(7,distance*.055):4;
      light.position.set(Math.cos(azimuth)*distance,Math.sin(azimuth)*distance,horizon+Math.max(0,elevation)*distance*.86);
      light.intensity=.55+elevation*3.65;
      light.color.setHSL(.09-.045*elevation,.3+.42*elevation,.62+.08*elevation);
      light.target?.position?.set(0,0,0);light.target?.updateMatrixWorld?.();
    });
    [this.solarHemisphere,this._adminStandaloneSolarHemisphere].filter(Boolean).forEach(light=>{
      light.intensity=1.35+elevation*1.45;
      light.color.setHSL(.56,.35,.76);
      light.groundColor.setHSL(.08,.24,.16);
    });
    this.configureSolarShadows(this._solarShadowBounds);
    this.dataset.solarPath='leste → zênite → oeste · sombras dinâmicas';
    this.renderer?.render(this.scene,this.camera);this._adminStandaloneRendererV5370?.render(this._adminStandaloneSceneV5370,this._adminStandaloneCameraV5370);
  }
  configureSolarShadows(bounds=null){
    const THREE=this.THREE;if(!THREE)return;
    const targets=[this.solarLight,this._adminStandaloneSolarLight].filter(Boolean);
    const size=bounds?.getSize?.(new THREE.Vector3());
    const span=Math.max(70,size?.x||0,size?.y||0,size?.z||0)*.72;
    targets.forEach(light=>{
      light.castShadow=true;
      light.shadow.mapSize.set(this.dataset.adminThreeContext==='true'?512:1024,this.dataset.adminThreeContext==='true'?512:1024);
      light.shadow.bias=-0.00045;
      light.shadow.normalBias=.025;
      light.shadow.camera.left=-span;light.shadow.camera.right=span;
      light.shadow.camera.top=span;light.shadow.camera.bottom=-span;
      light.shadow.camera.near=.1;light.shadow.camera.far=Math.max(720,span*5);
      light.shadow.camera.updateProjectionMatrix();
    });
    if(targets.length)this.dataset.sceneShadows='enabled · sun path · PCF soft';
  }
  bindSceneControls(){
    if(this._sceneControlsBound)return;
    this._sceneControlsBound=true;
    this.dataset.mapControls='connected';
    this.addEventListener('click',event=>{
      const button=event.target.closest?.('[data-scene-rotate],[data-scene-pan],[data-scene-zoom],[data-scene-tilt],[data-scene-overlay],[data-scene-selection],[data-map-tiles],[data-scene-fit]');
      if(!button||!this.contains(button))return;
      event.preventDefault(); event.stopPropagation();
      if(button.hasAttribute('data-scene-rotate')){const value=button.dataset.sceneRotate;this.setSceneRotation(value==='reset'?0:this.sceneManualRotation+Number(value),true);this.dataset.mapControlAction=`rotate:${value}`;return;}
      if(button.hasAttribute('data-scene-pan')){const value=button.dataset.scenePan;if(value==='reset')this.setScenePan(0,0,true);else this.nudgeScenePan(value,true);this.dataset.mapControlAction=`pan:${value}`;return;}
      if(button.hasAttribute('data-scene-zoom')){this.setSceneZoom(this.sceneManualZoom+Number(button.dataset.sceneZoom),true);this.dataset.mapControlAction=`zoom:${button.dataset.sceneZoom}`;return;}
      if(button.hasAttribute('data-scene-tilt')){this.setSceneTiltAdjust(this.sceneTiltAdjust+Number(button.dataset.sceneTilt),true);this.dataset.mapControlAction=`tilt:${button.dataset.sceneTilt}`;return;}
      if(button.hasAttribute('data-scene-overlay')){this.setStageOverlay(button.dataset.sceneOverlay,true);this.dataset.mapControlAction=`overlay:${button.dataset.sceneOverlay}`;return;}
      if(button.hasAttribute('data-scene-selection')){this.setMapSelectionMode(button.dataset.sceneSelection||'progress');this.dataset.mapControlAction=`selection:${button.dataset.sceneSelection||'progress'}`;return;}
      if(button.hasAttribute('data-map-tiles')){this.setMapTileMode(button.dataset.mapTiles,true);this.dataset.mapControlAction=`tiles:${button.dataset.mapTiles}`;return;}
      this.fitSceneView(true);this.dataset.mapControlAction='fit';
    },true);
  }
  renderCompact(){
    const stage=esc(this.getAttribute('data-stage')||'Etapa'),index=Number(this.getAttribute('data-map-index')||0);
    this.dataset.mapInit='compact-live'; this.dataset.mapStage=stage; this.dataset.mapIndex=String(index);
    const overlay=stageOverlayKey(stage); this.dataset.overlayKey=overlay;
    this.innerHTML=`<canvas class="compact-map-canvas" aria-label="Vista 3D compartilhada da etapa ${stage}"></canvas><span class="compact-map-overlay overlay-${overlay}" aria-hidden="true"></span><span class="mini-map-caption"><small>MAPA 3D · ${stageOverlayLabels[overlay]}</small><b>${stage}</b></span>${this.hasAttribute('interactive')?`<div class="compact-map-controls" aria-label="Controles do mapa"><button type="button" data-compact-map="zoom-out" aria-label="Afastar">−</button><button type="button" data-compact-map="zoom-in" aria-label="Aproximar">＋</button><button type="button" data-compact-map="tilt-down" aria-label="Reduzir inclinação">▿</button><button type="button" data-compact-map="tilt-up" aria-label="Aumentar inclinação">▵</button><button type="button" data-compact-map="rotate-left" aria-label="Girar à esquerda">↺</button><button type="button" data-compact-map="rotate-right" aria-label="Girar à direita">↻</button></div>`:''}`;
    compactMapMirrors.add(this);
    this._compactResizeObserver?.disconnect();
    if(window.ResizeObserver){
      this._compactResizeObserver=new ResizeObserver(entries=>{
        if(!this._compactVisible)return;
        const rect=entries?.[0]?.contentRect;
        const key=`${Math.round(rect?.width||0)}x${Math.round(rect?.height||0)}`;
        if(this._compactObservedSize===key)return;
        this._compactObservedSize=key;
        if(this._compactResizeFrame)return;
        this._compactResizeFrame=requestAnimationFrame(()=>{
          this._compactResizeFrame=0;
          this.renderSharedMap();
        });
      });
      this._compactResizeObserver.observe(this);
    }
    // Os cards não instanciam outro GLB: aguardam o modelo mantido na cena
    // principal e só criam o renderer compacto quando de fato aparecem.
    this._compactVisible=false;
    this._compactVisibilityObserver?.disconnect();
    if(window.IntersectionObserver){
      this._compactVisibilityObserver=new IntersectionObserver(entries=>{
        const entry=entries[0]; this._compactVisible=Boolean(entry?.isIntersecting);
        if(this._compactVisible)this.renderSharedMap();
      },{root:null,rootMargin:'160px',threshold:.01});
      this._compactVisibilityObserver.observe(this);
    }else { this._compactVisible=true; this.renderSharedMap(); }
    if(this.hasAttribute('interactive'))this.bindCompactMapControls();
  }
  bindCompactMapControls(){
    if(this._compactControlsBound)return;this._compactControlsBound=true;
    this.addEventListener('click',event=>{const button=event.target.closest?.('[data-compact-map]');if(!button)return;event.preventDefault();event.stopPropagation();const source=sharedMapScene,action=button.dataset.compactMap;if(!source)return;if(action==='zoom-in')source.setSceneZoom(source.sceneManualZoom+.1,true);if(action==='zoom-out')source.setSceneZoom(source.sceneManualZoom-.1,true);if(action==='tilt-up')source.setSceneTiltAdjust(source.sceneTiltAdjust+6,true);if(action==='tilt-down')source.setSceneTiltAdjust(source.sceneTiltAdjust-6,true);if(action==='rotate-left')source.setSceneRotation(source.sceneManualRotation-15,true);if(action==='rotate-right')source.setSceneRotation(source.sceneManualRotation+15,true);syncCompactMapMirrors();});
    const canvas=this.querySelector('.compact-map-canvas');let down=null,last=null,mode='';
    canvas?.addEventListener('contextmenu',event=>event.preventDefault());
    canvas?.addEventListener('wheel',event=>{event.preventDefault();const source=sharedMapScene;if(source){source.setSceneZoom(source.sceneManualZoom+(event.deltaY<0?.07:-.07),false);source.queueSceneBoundsCommit('compact-wheel');syncCompactMapMirrors();}},{passive:false});
    canvas?.addEventListener('pointerdown',event=>{const source=sharedMapScene;if(!source)return;down=last={x:event.clientX,y:event.clientY};mode=event.button===2?'rotate':event.shiftKey?'tilt':'pan';canvas.setPointerCapture?.(event.pointerId);});
    canvas?.addEventListener('pointermove',event=>{if(!down||!last)return;const source=sharedMapScene,dx=event.clientX-last.x,dy=event.clientY-last.y;if(!source)return;if(mode==='rotate')source.setSceneRotation(source.sceneManualRotation+dx*.32,false);else if(mode==='tilt')source.setSceneTiltAdjust(source.sceneTiltAdjust+dy*TILT_DRAG_SENSITIVITY,false);else (()=>{
      // Converte o ponteiro do card para o NDC da cena principal. Assim o
      // mesmo raio/plano usado pelo mapa grande calcula o pan do widget,
      // respeitando zoom, inclinação e perspectiva em vez de usar pixels
      // crus que ficam acelerados depois do zoom.
      const sourceCanvas=source.querySelector('.three-overlay'),sourceRect=sourceCanvas?.getBoundingClientRect?.(),compactRect=canvas.getBoundingClientRect?.();
      const toSourcePoint=(x,y)=>sourceRect&&compactRect&&compactRect.width&&compactRect.height?{
        x:sourceRect.left+((x-compactRect.left)/compactRect.width)*sourceRect.width,
        y:sourceRect.top+((y-compactRect.top)/compactRect.height)*sourceRect.height
      }:null;
      const fromPoint=toSourcePoint(last.x,last.y),toPoint=toSourcePoint(event.clientX,event.clientY);
      const d=fromPoint&&toPoint?source.screenDragPanDelta(fromPoint.x,fromPoint.y,toPoint.x,toPoint.y):source.screenDragPanDeltaFromVector?.(dx,dy)||{x:-dx,y:dy};
      const p=source.sceneManualPan||{x:0,y:0};source.setScenePan(p.x+(Number(d?.x)||0),p.y+(Number(d?.y)||0),false);
    })();last={x:event.clientX,y:event.clientY};syncCompactMapMirrors();});
    const release=event=>{if(event&&canvas?.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(down)sharedMapScene?.constrainScenePan('compact-release');down=null;last=null;mode='';};canvas?.addEventListener('pointerup',release);canvas?.addEventListener('pointercancel',release);
  }
  disconnectedCallback(){
    if(!this.hasAttribute('compact'))return;
    compactMapMirrors.delete(this); this._compactResizeObserver?.disconnect(); this._compactResizeObserver=null;
    this._compactVisibilityObserver?.disconnect(); this._compactVisibilityObserver=null; this._compactVisible=false;
    this._compactStageMaterials?.forEach(material=>material?.dispose?.()); this._compactStageMaterials?.clear?.(); this._compactStageMaterials=null;
    this._compactRenderer?.dispose?.(); this._compactRenderer=null; this._compactCamera=null;
    this._persistentMapMounted=false;
  }
  renderSharedMap(){
    if(!this.hasAttribute('compact')||!this.isConnected||!this._compactVisible)return;
    const source=sharedMapScene;
    if(!source?.THREE||!source?.scene||!source?.camera||!source?.modelReady||!source?._modelGpuReady){this.dataset.mapMirror='waiting-main-gpu';return;}
    const canvas=this.querySelector('.compact-map-canvas'),rect=canvas?.getBoundingClientRect();
    if(!canvas||!rect?.width||!rect?.height)return;
    const THREE=source.THREE;
    if(!this._compactRenderer){
      this._compactRenderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:'low-power',precision:'mediump'});
      this._compactRenderer.outputColorSpace=THREE.SRGBColorSpace;
      this._compactRenderer.toneMapping=THREE.ACESFilmicToneMapping;
      this._compactRenderer.toneMappingExposure=source.renderer?.toneMappingExposure||1;
      this._compactCamera=source.camera.clone();
    }
    const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    this._compactRenderer.setPixelRatio(1);
    this._compactRenderer.setSize(w,h,false);
    this._compactCamera.copy(source.camera); this._compactCamera.aspect=w/h;
    // O renderer compacto não herda o enquadramento da tela inteira: ele
    // focaliza a caixa tridimensional do loteamento. Assim o vão de imagem
    // do mapa de lotes mostra a implantação ocupando a área útil, sem captura
    // de canvas, textura rasterizada ou uma segunda carga do GLB.
    /*
     * O renderer dos cards não pode herdar o transform visual da tela inteira.
     * A cena principal pode estar em zoom 900%, inclinada ou deslocada; usar
     * essa caixa de mundo no compacto fazia o loteamento parecer minúsculo,
     * achatado ou preso em um canto. Para cards que exibem somente o GLB,
     * renderizamos o mesmo objeto Three.js em uma pose neutra temporária,
     * compartilhando geometrias e materiais — nunca uma imagem rasterizada e
     * nunca uma segunda carga do arquivo.
     */
    const compactModelOnly=!this.hasAttribute('data-base-map'),stage=source.sceneStage,modelRoot=source.modelGroup,modelFrame=source.masterplanModel,mapSurface=source.mapSurface;
    const savedStage=stage?{position:stage.position.clone(),rotation:stage.rotation.clone(),scale:stage.scale.clone()}:null;
    const savedRoot=modelRoot?{position:modelRoot.position.clone(),rotation:modelRoot.rotation.clone(),scale:modelRoot.scale.clone()}:null;
    const savedFrame=modelFrame?{position:modelFrame.position.clone(),rotation:modelFrame.rotation.clone(),scale:modelFrame.scale.clone()}:null;
    const savedSurface=mapSurface?{position:mapSurface.position.clone(),rotation:mapSurface.rotation.clone(),scale:mapSurface.scale.clone(),visible:mapSurface.visible}:null;
    // Todo espelho usa a mesma origem local: a pose de zoom/tilt/pan da tela
    // principal nunca deve contaminar o mapa dos cards ou o mapa comercial de
    // Leads. O mapa e o GLB continuam juntos dentro do mesmo sceneStage.
    if(stage&&modelRoot){
      stage.position.set(0,0,0); stage.rotation.set(0,0,0); stage.scale.setScalar(1);
      modelRoot.position.set(0,0,0); modelRoot.rotation.set(0,0,0); modelRoot.scale.setScalar(1);
      if(modelFrame&&source.masterplanLargest){
        const compactScale=145/Math.max(1,Number(source.masterplanLargest));
        modelFrame.scale.set(compactScale,compactScale*MODEL_VERTICAL_EXAGGERATION,compactScale);
      }
    }
    source.scene?.updateMatrixWorld?.(true); modelRoot?.updateMatrixWorld?.(true);
    const modelBounds=new THREE.Box3().setFromObject(modelRoot),modelCenter=modelBounds.getCenter(new THREE.Vector3()),modelSize=modelBounds.getSize(new THREE.Vector3());
    if(Number.isFinite(modelCenter.x)&&modelSize.lengthSq()>0){
      const aspect=Math.max(.45,w/h),fov=34;
      const footprintSpan=Math.max(modelSize.x,modelSize.y,modelSize.z/ aspect),frameSpan=Math.max(footprintSpan,modelSize.y*1.08),distance=Math.max(18,frameSpan/(2*Math.tan(fov*Math.PI/360))*1.12);
      const direction=new THREE.Vector3(.22,.62,.76).normalize();
      this._compactCamera.fov=fov; this._compactCamera.position.copy(modelCenter).addScaledVector(direction,distance); this._compactCamera.lookAt(modelCenter); this._compactCamera.near=.1; this._compactCamera.far=Math.max(10000,distance*8); this._compactCamera.updateProjectionMatrix();
      this.dataset.mapMirrorFrame=`${Math.round(modelSize.x)}×${Math.round(modelSize.y)}×${Math.round(modelSize.z)} · ${Math.round(distance)}`;
      // O mapa comercial também é renderizado na cena, nunca capturado como
      // imagem. No compacto ele recebe a mesma caixa do GLB para que o
      // loteamento fique centralizado e ocupe o vão sem bordas sobrando.
      if(!compactModelOnly&&mapSurface){
        mapSurface.position.set(modelCenter.x,modelCenter.y,savedSurface?.position.z??SCENE_MAP_Z);
        mapSurface.rotation.set(0,0,0);
        // O mapa comercial ocupa o hero inteiro. A margem evita bordas vazias
        // quando a câmera compacta é inclinada ou gira.
        mapSurface.scale.set(Math.max(modelSize.x*3.4,1),Math.max(modelSize.y*3.4,1),1);
      }
    }else{this._compactCamera.fov=Math.min(58,source.camera.fov*1.18);this._compactCamera.updateProjectionMatrix();}
    // Cards de etapa mostram só o GLB; o mapa comercial interativo reutiliza
    // a própria superfície OpenStreet já em memória. Nada é rasterizado e o
    // modelo continua sendo renderizado pelo renderer WebGL do compact.
    const overlay=this.getAttribute('data-overlay')||this.dataset.overlayKey||stageOverlayKey(this.getAttribute('data-stage'));
    const color=stageOverlayColors[overlay]||0x3f9cff;
    const all=[...(source.modelParts?.lots||[]),...(source.modelParts?.streets||[]),...(source.modelParts?.other||[])];
    const targets=new Set(source.stageOverlayTargets?.[overlay]||[]),previous=new Map();
    const paint=material=>{
      if(!material)return material;
      const key=`${overlay}:${material.uuid}`;
      this._compactStageMaterials??=new Map();
      if(!this._compactStageMaterials.has(key)){
        const clone=material.clone();
        clone.color?.setHex(color);
        if(clone.emissive){clone.emissive.setHex(color);clone.emissiveIntensity=.62;}
        clone.transparent=true; clone.opacity=Math.max(.74,Math.min(.94,clone.opacity??1)); clone.depthWrite=false;
        this._compactStageMaterials.set(key,clone);
      }
      return this._compactStageMaterials.get(key);
    };
    all.forEach(node=>{
      previous.set(node,node.material);
      const base=node.userData.defaultMaterial||node.material;
      const special=overlay==='terraplanagem'?(node.userData.partKind==='streets'?node.userData.gravelMaterial:node.userData.earthworkMaterial):null;
      node.material=targets.has(node)?(special||(Array.isArray(base)?base.map(paint):paint(base))):base;
    });
    const mapSurfaceVisible=source.mapSurface?.visible;
    if(mapSurface)mapSurface.visible=this.hasAttribute('data-base-map')?mapSurfaceVisible:false;
    this._compactRenderer.setClearColor(0x0b1724,1);
    try{this._compactRenderer.render(source.scene,this._compactCamera);}finally{
      if(mapSurface){mapSurface.visible=mapSurfaceVisible;if(savedSurface){mapSurface.position.copy(savedSurface.position);mapSurface.rotation.copy(savedSurface.rotation);mapSurface.scale.copy(savedSurface.scale);}}
      if(stage&&savedStage){stage.position.copy(savedStage.position);stage.rotation.copy(savedStage.rotation);stage.scale.copy(savedStage.scale);}
      if(modelRoot&&savedRoot){modelRoot.position.copy(savedRoot.position);modelRoot.rotation.copy(savedRoot.rotation);modelRoot.scale.copy(savedRoot.scale);}
      if(modelFrame&&savedFrame){modelFrame.position.copy(savedFrame.position);modelFrame.rotation.copy(savedFrame.rotation);modelFrame.scale.copy(savedFrame.scale);}
      source.scene?.updateMatrixWorld?.(true);
    }
    this.dataset.mapMirror='shared-webgl-live-model-only'; this.dataset.modelRasterized='false'; this.dataset.modelSource='shared-live-glb'; this.dataset.stageHighlight=stageOverlayLabels[overlay]||overlay; this.dataset.highlightTargets=String(targets.size);
  }
  // BELAVISTA_ADMIN_MODEL_AFTER_SHELL_V5376
  // O elemento é conectado enquanto o <belavista-app> ainda pode estar oculto
  // pelo gate de autenticação. Leaflet e WebGL não devem medir nem inicializar
  // um viewport com 0x0 nesse instante: primeiro o shell precisa estar visível,
  // depois a cena pode começar a carregar o loteamento.
  waitForAdminShellViewportV5376(){
    if(this._adminShellViewportGateV5376)return;
    this._adminShellViewportGateV5376=true;
    this.dataset.adminModelLifecycle='waiting-for-visible-shell';
    this.dataset.modelBootPhase='waiting-admin-shell';
    const started=performance.now();
    const tick=()=>{
      if(!this.isConnected)return;
      const app=this.closest('belavista-app');
      const host=this.querySelector('.map-host');
      const rect=host?.getBoundingClientRect?.();
      const visible=Boolean(
        (!app||!app.hidden)&&
        rect&&rect.width>32&&rect.height>32&&
        getComputedStyle(host).display!=='none'&&
        getComputedStyle(host).visibility!=='hidden'
      );
      if(visible){
        this._adminShellViewportReadyV5376=true;
        this.dataset.adminModelLifecycle='shell-visible-viewport-ready';
        this.dataset.adminShellReadyMs=String(Math.round(performance.now()-started));
        this.dataset.modelBootPhase='admin-shell-ready-static';
        this.initWhenReady();
        return;
      }
      setTimeout(tick,180);
    };
    requestAnimationFrame(()=>requestAnimationFrame(tick));
  }

  // BELAVISTA_ADMIN_PUBLIC_MAP_3D_BOOT_V5353
  initWhenReady(){
    const adminShared=this.hasAttribute('data-admin-shared-public-map');

    if(adminShared&&!this._adminShellViewportReadyV5376){
      this.waitForAdminShellViewportV5376();
      return;
    }

    // The Leads page already has Leaflet available before map-scene connects.
    // The original admin did not. For the shared public map, WebGL/GLB must not
    // depend on Leaflet readiness: start Three immediately and initialize
    // Leaflet independently when it is present.
    if(adminShared){
      this.dataset.renderMode='3d-public-shared';
      this.dataset.mapInit=window.L?'leaflet-found':'three-first';
      if(window.L){
        try{this.initLeaflet();}
        catch(err){this.dataset.mapInit='leaflet-error';console.warn('Leaflet falhou no mapa administrativo compartilhado.',err);}
      }
      this.scheduleThree();
      return;
    }

    const allowThree=true;
    this.dataset.renderMode=allowThree?'3d-experimental':'safe-map';
    this.dataset.mapInit='waiting';
    const start=Date.now();
    const tick=()=>{
      this.dataset.mapInit=window.L?'leaflet-found':'waiting';
      if(window.L){
        try{this.initLeaflet();}
        catch(err){this.dataset.mapInit='leaflet-error';console.warn('Leaflet indisponível, mantendo superfície de mapa.',err);}
        if(allowThree)this.scheduleThree();
        return;
      }
      if(Date.now()-start<7000)setTimeout(tick,100);
      else{this.dataset.mapInit='timeout';if(allowThree)this.scheduleThree();}
    };
    tick();
  }
  scheduleThree(){
    if(this._threeScheduled||this.renderer)return;
    this._threeScheduled=true;
    this.dataset.modelBootPhase='scheduled-after-first-paint';

    const run=()=>Promise.resolve(this.initThree()).catch(error=>{
      this.dataset.three='fallback';
      this.dataset.modelError='three-init-failed';
      this.dataset.modelBootPhase='three-init-error';
      console.warn('[Aliança Park] inicialização 3D administrativa falhou; painel preservado.',error);
    });
    requestAnimationFrame(()=>{
      setTimeout(()=>{
        if('requestIdleCallback' in window)window.requestIdleCallback(run,{timeout:1200});
        else run();
      },650);
    });
  }
  setMapTileMode(mode='satellite',announce=false){
    const next=mode==='osm'?'osm':'satellite';
    const changed=this.mapTileMode!==next;
    this.mapTileMode=next; this.dataset.mapTileMode=next;
    this.querySelectorAll('[data-map-tiles]').forEach(button=>button.classList.toggle('active',button.dataset.mapTiles===next));
    if(!changed)return;
    delete this.dataset.mapTileSource;
    if(this._mapSurfaceKey)this._mapSurfaceKey='';
    if(this._osmRasterKey)this._osmRasterKey='';
    this._lastRasterSignature='';
    if(this.modelReady)this.syncThree();
    if(announce){const label=next==='satellite'?'Satélite realista':'Mapa OSM';notify(`${label} ativado na cena compartilhada.`,'success');appStore.set({mapTileMode:next,lastAction:`Alterou base cartográfica para ${label}`});}
  }
  buildStageOverlayTargets(){
    if(!this.THREE||!this.modelGroup)return;
    const all=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[])];
    if(!all.length)return;

    const scenic=[...(this.modelLandscapeNodes||[]),...(this.modelLeisureNodes||[])];
    this.scene?.updateMatrixWorld?.(true);

    const centers=[];
    for(const node of all){
      const geometry=node?.geometry;
      if(!geometry?.getAttribute?.('position'))continue;
      if(!geometry.boundingBox)geometry.computeBoundingBox();
      const box=geometry.boundingBox;
      if(!box)continue;
      const center=box.getCenter(new this.THREE.Vector3());
      node.localToWorld(center);
      centers.push({node,x:center.x,y:center.y});
    }
    if(!centers.length)return;

    const xs=centers.map(item=>item.x),ys=centers.map(item=>item.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const nx=item=>(item.x-minX)/Math.max(1,maxX-minX),ny=item=>(item.y-minY)/Math.max(1,maxY-minY);
    const zones={
      terraplanagem:item=>ny(item)>.64,
      drenagem:item=>nx(item)<.58&&ny(item)>.24&&ny(item)<.82,
      'rede-agua':item=>nx(item)>=.34&&nx(item)<.72&&ny(item)>.18&&ny(item)<.75,
      'rede-eletrica':item=>nx(item)>=.62&&ny(item)>.28,
      pavimentacao:item=>ny(item)<.36||(nx(item)>.48&&ny(item)<.54),
      urbanizacao:item=>nx(item)<.34&&ny(item)<.42
    };

    this.stageOverlayTargets={};
    Object.entries(zones).forEach(([key,predicate],index)=>{
      let selected=centers.filter(predicate).map(item=>item.node);
      if(selected.length<4){
        const start=Math.floor((index/Math.max(1,all.length))*all.length);
        selected=all.slice(start,start+Math.max(8,Math.floor(all.length*.12)));
      }
      if(key==='urbanizacao')selected=[...selected,...scenic];
      this.stageOverlayTargets[key]=selected;
    });

    this.dataset.overlayManifest='ready-lightweight-v5365';
    this.dataset.overlayTargetTotal=String(all.length);
    this.dataset.overlayScenicTargets=String(scenic.length);
  }
  buildAdminStandaloneStageOverlayTargetsV5370(){
    const all=Array.isArray(this.activityMapStandaloneParts)?this.activityMapStandaloneParts.filter(Boolean):[];
    if(!this.THREE||!all.length)return;
    this._adminStandaloneStageV5370?.updateMatrixWorld?.(true);
    const centers=[];
    for(const node of all){
      const box=new this.THREE.Box3().setFromObject(node);
      if(box.isEmpty?.())continue;
      const center=box.getCenter(new this.THREE.Vector3());
      centers.push({node,x:center.x,y:center.y});
    }
    if(!centers.length)return;
    const xs=centers.map(item=>item.x),ys=centers.map(item=>item.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const nx=item=>(item.x-minX)/Math.max(1,maxX-minX),ny=item=>(item.y-minY)/Math.max(1,maxY-minY);
    const zones={
      terraplanagem:item=>ny(item)>.64,
      drenagem:item=>nx(item)<.58&&ny(item)>.24&&ny(item)<.82,
      'rede-agua':item=>nx(item)>=.34&&nx(item)<.72&&ny(item)>.18&&ny(item)<.75,
      'rede-eletrica':item=>nx(item)>=.62&&ny(item)>.28,
      pavimentacao:item=>ny(item)<.36||(nx(item)>.48&&ny(item)<.54),
      urbanizacao:item=>nx(item)<.34&&ny(item)<.42
    };
    this.stageOverlayTargets={};
    Object.entries(zones).forEach(([key,predicate],index)=>{
      let selected=centers.filter(predicate).map(item=>item.node);
      if(selected.length<4){
        const start=Math.floor((index/Math.max(1,all.length))*all.length);
        selected=all.slice(start,start+Math.max(8,Math.floor(all.length*.12)));
      }
      if(key==='urbanizacao')selected=[...selected,...all.filter(item=>item.userData?.partKind==='other').slice(0,80)];
      this.stageOverlayTargets[key]=[...new Set(selected)];
    });
    this.dataset.overlayManifest='ready-standalone-v5370';
    this.dataset.overlayTargetTotal=String(all.length);
  }
  applyAdminStandaloneStageOverlayV5370(targetKey=null){
    const all=Array.isArray(this.activityMapStandaloneParts)?this.activityMapStandaloneParts.filter(Boolean):[];
    if(!all.length)return;
    if(!this.stageOverlayTargets||!Object.keys(this.stageOverlayTargets).length)this.buildAdminStandaloneStageOverlayTargetsV5370();
    const targets=new Set(targetKey?(this.stageOverlayTargets?.[targetKey]||[]):[]),color=stageOverlayColors[targetKey]||0x2fe6ae;
    all.forEach(item=>{
      if(!item?.material)return;
      item.material=this.stageBaseMaterial(item);
      delete item.userData.overlayMaterial;
      if(targetKey&&targets.has(item)){
        item.userData.overlayMaterial=this.stageOverlayMaterial(item,targetKey,color);
        item.material=item.userData.overlayMaterial;
      }
    });
    this.dataset.overlayTransition=targetKey?'entering':'exiting';
    this.dataset.overlayTransitionKey=targetKey||'none';
    this.dataset.overlayTransitionProgress='100';
    this.dataset.overlayTargets=String(targets.size);
    this.dataset.overlayColor=`#${color.toString(16).padStart(6,'0')}`;
    this._adminStandaloneRendererV5370?.render?.(this._adminStandaloneSceneV5370,this._adminStandaloneCameraV5370);
    this.dataset.overlayTransition='settled';
  }
  stageBaseMaterial(item){return item.userData.progressMaterial||item.userData.selectionMaterial||item.userData.statusMaterial||item.userData.publicStatusMaterial||item.userData.defaultMaterial||item.material;}
  stageOverlayMaterial(item,key,color){
    const source=key==='terraplanagem'?(item.userData.partKind==='streets'?item.userData.gravelMaterial:item.userData.earthworkMaterial)||item.userData.defaultMaterial:this.stageBaseMaterial(item);
    const paint=mat=>{if(!mat)return mat;const clone=mat.clone?.()||mat;if(clone.color)clone.color.setHex(color);if(clone.emissive){clone.emissive.setHex(color);clone.emissiveIntensity=.6;}clone.transparent=true;clone.opacity=Math.max(.72,Math.min(.92,clone.opacity??1));clone.depthWrite=false;return clone;};
    return Array.isArray(source)?source.map(paint):paint(source);
  }
  cloneStageMaterial(material){return Array.isArray(material)?material.map(item=>item?.clone?.()||item):material?.clone?.()||material;}
  transitionStageOverlay(targetKey){
    if(this.activityMapStandaloneParts?.length&&this._adminStandaloneStageV5370){this.applyAdminStandaloneStageOverlayV5370(targetKey);return;}
    const all=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[]),...(this.modelParts?.other||[])],targets=new Set(targetKey?(this.stageOverlayTargets?.[targetKey]||[]):[]),color=stageOverlayColors[targetKey]||0x2fe6ae;
    const records=[];
    this._stageOverlayTransitionToken=Symbol('stage-filter');
    const token=this._stageOverlayTransitionToken;
    all.forEach(item=>{
      if(!item?.material)return;
      const previous=this.cloneStageMaterial(item.material);
      delete item.userData.overlayMaterial;
      const next=targetKey&&targets.has(item)?this.stageOverlayMaterial(item,targetKey,color):this.stageBaseMaterial(item);
      if(!next)return;
      const fromParts=Array.isArray(previous)?previous:[previous],toParts=Array.isArray(next)?next:[next],parts=[];
      fromParts.forEach((from,index)=>{
        const to=toParts[index]||toParts[toParts.length-1]||from;if(!from)return;
        const entering=Boolean(targetKey&&targets.has(item)),fromOpacity=entering?0:Number(from.opacity??1),toOpacity=Number(to.opacity??1);
        from.transparent=true;from.opacity=fromOpacity;from.depthWrite=false;
        parts.push({from,to,fromColor:from.color?.clone?.(),toColor:to.color?.clone?.(),fromEmissive:from.emissive?.clone?.(),toEmissive:to.emissive?.clone?.(),fromOpacity,toOpacity});
      });
      item.material=previous;
      if(targetKey&&targets.has(item))item.userData.overlayMaterial=next;
      records.push({item,next,parts});
    });
    this.dataset.overlayTransition=targetKey?'entering':'exiting';
    this.dataset.overlayTransitionKey=targetKey||'none';
    this.dataset.overlayTransitionProgress='0';
    this.dataset.overlayTransitionDuration=String(STAGE_FILTER_TRANSITION_MS);
    const started=performance.now(),raf=globalThis.requestAnimationFrame||((callback)=>setTimeout(()=>callback(performance.now()),16));
    const finish=()=>{
      if(this._stageOverlayTransitionToken!==token)return;
      records.forEach(({item,next,parts})=>{parts.forEach(({from,to,toColor,toEmissive,toOpacity})=>{if(toColor&&from.color)from.color.copy(toColor);if(toEmissive&&from.emissive)from.emissive.copy(toEmissive);from.opacity=toOpacity;});item.material=next;if(!targetKey)delete item.userData.overlayMaterial;});
      this.dataset.overlayTransition='settled';this.dataset.overlayTransitionProgress='100';this.renderer?.render(this.scene,this.camera);
    };
    const tick=now=>{
      if(this._stageOverlayTransitionToken!==token)return;
      const progress=Math.min(1,Math.max(0,(now-started)/STAGE_FILTER_TRANSITION_MS)),eased=progress*progress*(3-2*progress);
      this.dataset.overlayTransitionProgress=String(Math.round(eased*100));
      records.forEach(({parts})=>parts.forEach(({from,to,fromColor,toColor,fromEmissive,toEmissive,fromOpacity,toOpacity})=>{
        if(fromColor&&toColor&&from.color)from.color.copy(fromColor).lerp(toColor,eased);
        if(fromEmissive&&toEmissive&&from.emissive)from.emissive.copy(fromEmissive).lerp(toEmissive,eased);
        from.opacity=fromOpacity+(toOpacity-fromOpacity)*eased;
        from.transparent=true;from.depthWrite=eased>.78?Boolean(to.depthWrite):false;
      }));
      this.renderer?.render(this.scene,this.camera);
      if(progress<1)raf(tick);else finish();
    };
    if(!records.length){finish();return;}
    raf(tick);
  }
  setStageOverlay(stage,announce=false){
    const key=stageOverlayLabels[stage]?stage:stageOverlayKey(stage);
    if(announce&&this.dataset.highlightActive==='true'&&this.stageOverlayKey===key){this.clearStageOverlay(true);return;}
    this.stageOverlayKey=key; this.dataset.overlayKey=key; this.dataset.overlayLabel=stageOverlayLabels[key]||key; this.dataset.highlightActive='true';
    this.querySelectorAll('[data-scene-overlay]').forEach(button=>button.classList.toggle('active',button.dataset.sceneOverlay===key));
    if(this.activityMapStandaloneParts?.length&&this._adminStandaloneStageV5370){
      this.applyAdminStandaloneStageOverlayV5370(key);
      if(announce){notify(`Highlight de ${this.dataset.overlayLabel} aplicado no mapa.`,'success');appStore.set({mapFilter:key,lastAction:`Aplicou highlight de ${this.dataset.overlayLabel}`});}
      return;
    }
    if(!this.modelReady||!this.stageOverlayTargets){if(announce){notify(`Highlight de ${this.dataset.overlayLabel} ativado.`,'success');appStore.set({mapFilter:key,lastAction:`Ativou highlight de ${this.dataset.overlayLabel}`});}return;}
    const targets=this.stageOverlayTargets[key]||[],color=stageOverlayColors[key]||0x2fe6ae;
    this.dataset.overlayTargets=String(targets.length);this.dataset.overlayColor=`#${color.toString(16).padStart(6,'0')}`;
    const span=this.querySelector('.map-badge span');if(span&&!this.dataset.selectedPart)span.textContent=`Highlight · ${this.dataset.overlayLabel}`;
    this.transitionStageOverlay(key);
    if(announce){notify(`Highlight de ${this.dataset.overlayLabel} aplicado no mapa.`,'success');appStore.set({mapFilter:key,lastAction:`Aplicou highlight de ${this.dataset.overlayLabel}`});}
  }
  clearStageOverlay(announce=false){
    this._stageOverlayTransitionToken=Symbol('stage-filter-clear');
    this.transitionStageOverlay(null);
    if(this.selectionHalo)this.selectionHalo.visible=false;
    this.stageOverlayKey=null; this.dataset.highlightActive='false'; this.dataset.overlayLabel='Nenhum highlight'; delete this.dataset.overlayKey; delete this.dataset.overlayTargets; delete this.dataset.overlayColor; delete this.dataset.selectedPart; delete this.dataset.selectedKind;
    this.querySelectorAll('[data-scene-overlay]').forEach(button=>button.classList.remove('active'));
    const span=this.querySelector('.map-badge span'); if(span)span.textContent='Satélite realista · visão temática';
    this.updatePublicCommercialMarkers?.();
    if(announce){notify('Highlight desativado no mapa.');appStore.set({mapFilter:null,lastAction:'Desativou highlight do mapa'});}
  }
  canonicalPublicLotParts(){
    const lots=(this.modelParts?.lots||[]).filter(lot=>/^lote(?:[_ -]?\d+)$/i.test(String(lot?.name||'')));
    return [...new Map(lots.map(lot=>[String(lot.name),lot])).values()];
  }
  setPublicLotStatuses(entries=[]){
    const byPartId=new Map((Array.isArray(entries)?entries:[]).map(entry=>[String(entry?.partId||''),String(entry?.status||'available').toLowerCase()]));
    const valid=new Set(['available','reserved','negotiation','sold']);
    const lots=this.canonicalPublicLotParts();
    this.publicLotStatusCounts={available:0,reserved:0,negotiation:0,sold:0};
    for(const lot of lots){
      const key=String(lot.userData?.partId||lot.name);
      const status=valid.has(byPartId.get(key))?byPartId.get(key):'available';
      lot.userData.publicCommercialStatus=status;
      this.publicLotStatusCounts[status]++;
    }
    this.dataset.publicLotStatuses='connected';
    this.dataset.publicLotStatusCount=String(lots.length);
    this.dataset.publicLotStatusCounts=JSON.stringify(this.publicLotStatusCounts);
    this.dataset.publicLotStatusMapping='canonical lot meshes only · duplicate GLB auxiliary meshes excluded';
    if(this.publicLotFilter)this.setPublicLotFilter(this.publicLotFilter);
    this.dispatchEvent(new CustomEvent('public-commercial-marker-statuses',{detail:{entries}}));
  }
  setPublicLotFilter(status='available'){
    const valid=new Set(['available','reserved','negotiation','sold']);
    if(!valid.has(status))return this.clearPublicLotFilter();
    const colors={available:0x42be65,reserved:0xf1c21b,negotiation:0x4589ff,sold:0xfa4d56};
    for(const lot of this.canonicalPublicLotParts()){
      if(lot.userData.publicStatusMaterial){delete lot.userData.publicStatusMaterial;this.restorePartMaterial(lot);}
      if(lot.userData.publicCommercialStatus!==status)continue;
      lot.userData.publicStatusMaterial=this.materialForColor(lot.userData.defaultMaterial,colors[status],.98);
      lot.material=lot.userData.publicStatusMaterial;
    }
    this.publicLotFilter=status;
    this.dataset.publicLotFilter=status;
    this.dataset.publicLotMatches=String(this.publicLotStatusCounts?.[status]||0);
    this.renderer?.render(this.scene,this.camera);
  }
  clearPublicLotFilter(){
    for(const lot of this.canonicalPublicLotParts()){
      if(!lot.userData.publicStatusMaterial)continue;
      delete lot.userData.publicStatusMaterial;
      this.restorePartMaterial(lot);
    }
    this.publicLotFilter='';
    delete this.dataset.publicLotFilter;
    delete this.dataset.publicLotMatches;
    this.renderer?.render(this.scene,this.camera);
  }
  initLeaflet(){
    const host=this.querySelector('.map-host'); if(!host||this.map)return;
    const initial=viewThemes.assistant; const center=L.latLng(Number(initial.center[0]),Number(initial.center[1]));
    if(!validGeoPoint(center))return;
    this.map=L.map(host,{zoomControl:false, attributionControl:true, preferCanvas:true, zoomAnimation:false, fadeAnimation:false, scrollWheelZoom:!this.isPublicCustomerExperience(), minZoom:13, maxZoom:22}).setView(center,Number(initial.zoom)); this.dataset.leaflet='ready'; this.dataset.mapNavigation='free scene · no 3D viewbox';
    // Leaflet remains the geographic reference/interaction source. Its hidden
    // tile pane is intentionally not mounted: the visible base is rendered
    // once by the shared Three.js map plane below the live GLB.
    if(this.isPublicMapVisual()){
      this._publicLeafletBase=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{minZoom:13,maxZoom:22,attribution:'Tiles © Esri'}).addTo(this.map);
      this.dataset.publicMapBase='leaflet-satellite-fallback';
    }else{
      L.control.zoom({position:'bottomright'}).addTo(this.map);
    }
    this.map.on('moveend zoomend',()=>this.syncThree());
    this.map.on('click',event=>{const canvasRect=this.querySelector('.three-overlay')?.getBoundingClientRect(),hostRect=host.getBoundingClientRect(),point={x:event.containerPoint.x+hostRect.left-(canvasRect?.left||hostRect.left),y:event.containerPoint.y+hostRect.top-(canvasRect?.top||hostRect.top)};if(this.pickModelAt(point))this._suppressMapToggleUntil=performance.now()+280;});
    // Resizing the persistent dock is a layout operation, not a geographic
    // navigation. Leaflet invalidateSize can shift its center while the SPA
    // swaps columns, which would invalidate the shared tile key and reload
    // the map. Three.js can resize the already-loaded surface directly.
    const refreshMap=()=>{
      if(!this.map||!host)return;
      const rect=host.getBoundingClientRect();
      const width=Math.max(1,Math.round(rect.width));
      const height=Math.max(1,Math.round(rect.height));
      const key=`${width}x${height}`;
      if(this._lastObservedMapSize===key)return;
      this._lastObservedMapSize=key;

      this.map.invalidateSize?.({pan:false,debounceMoveend:true});
      this.syncThree();
    };
    if(window.ResizeObserver){
      this._mapResizeObserver=new ResizeObserver(entries=>{
        const rect=entries?.[0]?.contentRect;
        const width=Math.max(1,Math.round(rect?.width||host.clientWidth||0));
        const height=Math.max(1,Math.round(rect?.height||host.clientHeight||0));
        const key=`${width}x${height}`;
        if(this._lastResizeObserverSize===key)return;
        this._lastResizeObserverSize=key;
        if(this._mapResizeFrame)return;
        this._mapResizeFrame=requestAnimationFrame(()=>{
          this._mapResizeFrame=0;
          refreshMap();
        });
      });
      this._mapResizeObserver.observe(host);
    }
    this.map.whenReady(()=>{
      this._mapReady=true;
      const active=viewThemes[MAP_CAMERA_VIEW]||viewThemes.assistant;
      this.map.setView(
        L.latLng(Number(active.center[0]),Number(active.center[1])),
        Number(active.zoom),
        {animate:false}
      );
      appStore.set({mapReady:true});
      this.setTheme(MAP_CAMERA_VIEW);
      this.setMapContext(appStore.get().view);
      this._lastObservedMapSize='';
      requestAnimationFrame(refreshMap);
    });
  }
  async initThree(){
    this.dataset.three='loading';if(this.isPublicMapVisual())this.dataset.publicThree='loading';
    try {
      const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'); this.THREE=THREE;
      const {GLTFLoader}=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'); this.GLTFLoader=GLTFLoader;
      const canvas=this.querySelector('.three-overlay');
      /* BELAVISTA_PUBLIC_RENDER_QUALITY_V5337 */
      const adminRuntime=
        location.pathname==='/admin'||
        location.pathname.startsWith('/admin/')||
        this.hasAttribute('data-admin-shared-public-map')||
        Boolean(this.closest('belavista-app'));
      const publicHighQuality=
        !adminRuntime&&
        this.matches?.('map-scene[data-public-map],map-scene[data-public-presentation]');
      if(adminRuntime){
        this.dataset.adminThreeContext='true';
        this.dataset.publicRendererProfile='blocked-on-admin-v5369';
      }
      this.renderer=new THREE.WebGLRenderer({
        canvas,
        alpha:true,
        antialias:adminRuntime?false:Boolean(publicHighQuality),
        powerPreference:adminRuntime?'low-power':(publicHighQuality?'high-performance':'low-power'),
        precision:adminRuntime?'mediump':(publicHighQuality?'highp':'mediump')
      });
      this.renderer.shadowMap.enabled=true;
      this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      const publicRenderRatio=adminRuntime
        ? 1
        : publicHighQuality
          ? Math.min(2.0,Math.max(1.65,window.devicePixelRatio||1))
          : 1;
      this.renderer.setPixelRatio(publicRenderRatio);
      if(publicHighQuality){
        this.dataset.publicRenderQuality='supersampled-highp-v5337';
        this.dataset.publicRenderPixelRatio=publicRenderRatio.toFixed(2);
      }else{
        this.dataset.bootPixelRatio='1';
        this.dataset.adminRenderQuality='safe-mediump-noaa-v5368';
      } this.renderer.outputColorSpace=THREE.SRGBColorSpace; this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.08; this.dataset.modelRender='webgl-live-glb'; this.dataset.modelRasterized='false';
      this.dataset.three='ready';if(this.isPublicMapVisual())this.dataset.publicThree='ready';
      this.scene=new THREE.Scene(); const hemisphere=new THREE.HemisphereLight(0xcfe4ff,0x1a2735,2.6); const keyLight=new THREE.DirectionalLight(0xffffff,4.2); keyLight.castShadow=true; keyLight.position.set(-120,-160,220); keyLight.target.position.set(0,0,0); this.scene.add(hemisphere,keyLight,keyLight.target); this.solarHemisphere=hemisphere; this.solarLight=keyLight; this.sceneStage=new THREE.Group(); this.sceneStage.scale.setScalar(1); this.scene.add(this.sceneStage); this.camera=new THREE.PerspectiveCamera(34,1,.1,10000); this.dataset.cameraProjection='perspective'; this.applySolarLighting(solarStateForHour(this.solarHour??appStore.get().solarHour??9,this.solarGeo||MAP_GEOREFERENCE_FALLBACK));
      this.mapSurfaceCanvas=document.createElement('canvas'); this.mapSurfaceTexture=new THREE.CanvasTexture(this.mapSurfaceCanvas); this.mapSurfaceTexture.colorSpace=THREE.SRGBColorSpace;
      this.mapSurface=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:this.mapSurfaceTexture,color:0xffffff,side:THREE.DoubleSide,transparent:false,depthTest:false,depthWrite:false})); this.mapSurface.renderOrder=0; this.mapSurface.visible=!this.hasAttribute('data-public-static-base');/* BELAVISTA_PUBLIC_STATIC_BASE_V521 */ this.mapSurface.position.z=SCENE_MAP_Z; this.sceneStage.add(this.mapSurface); this.dataset.mapRasterMode='webgl-raster'; this.dataset.mapContact=`Satélite realista + OpenStreet fallback + GLB na mesma cena Three.js · surface z=${SCENE_MAP_Z} · model base z=${SCENE_MODEL_BASE_Z}`;
      const geo=new THREE.CircleGeometry(8,32); const colors=[0x7d64ff,0x2fe6ae,0xffb020,0x55a8ff,0xff5c58];
      this.markerGroup=new THREE.Group(); this.sceneStage.add(this.markerGroup);
      this.gpsMarkerGeometry=geo; this.gpsMarkerColors=colors;
      // A camada inicial usa o centro do desenho até o manifesto do DWG ser
      // carregado. O fallback mantém a cena funcional mesmo offline, mas não
      // volta a coordenadas fictícias de outro empreendimento.
      this.setGpsMarkers(THREE,[{id:'site-center',label:'Centro do empreendimento',lat:-13.00044486,lng:-39.62315439}]);
      this.dataset.dwgGeoreference='deferred-until-gpu-ready-v5367';
      this.modelGroup=new THREE.Group(); this.sceneStage.add(this.modelGroup); this.dataset.modelHeight='native GLB scale';
      this.modelParts={lots:[],streets:[],other:[]}; this.stageOverlayTargets={}; this.raycaster=new THREE.Raycaster(); this.pointer=new THREE.Vector2();
      this.selectionHalo=new THREE.Mesh(new THREE.RingGeometry(8,13,48),new THREE.MeshBasicMaterial({color:0x2fe6ae,transparent:true,opacity:.88,side:THREE.DoubleSide,depthTest:false}));
      this.selectionHalo.visible=false; this.sceneStage.add(this.selectionHalo); this.applySceneView(MAP_CAMERA_VIEW,false); this.loadMasterplan(THREE,GLTFLoader);
      let down=null,lastX=0,lastY=0,dragging=false,panning=false,tilting=false,rotating=false,zooming=false,selecting=false;
      canvas.addEventListener('contextmenu',event=>event.preventDefault());
      /* BELAVISTA_CTRL_WHEEL_ZOOM_V551 */
      canvas.addEventListener('wheel',event=>{
        event.preventDefault();
        if(event.ctrlKey){
          // Ctrl + roda volta a controlar o zoom; Ctrl + arraste continua
          // reservado para inclinação, com os mesmos limites da cena.
          this.setSceneZoom(this.sceneManualZoom+(event.deltaY<0?.06:-.06),false);
          this.queueSceneBoundsCommit('ctrl-wheel-zoom');
          return;
        }
        this.setSceneZoom(this.sceneManualZoom+(event.deltaY<0?.06:-.06),false);
        this.queueSceneBoundsCommit('wheel');
      },{passive:false});
      canvas.addEventListener('pointerdown',event=>{
        down={x:event.clientX,y:event.clientY}; lastX=event.clientX; lastY=event.clientY; dragging=false;
        // O modo de pintura de registros tem prioridade sobre a seleção por
        // retângulo. Sem esta guarda, deixar “Progresso” ativo na tela
        // anterior intercepta o clique e impede que o GLB entregue o trecho
        // de rua ao formulário.
        // Em Registros, “Pintar no mapa” transforma o botão esquerdo em
        // seleção: clique escolhe uma superfície; arraste desenha uma área.
        selecting=(this.recordPaintMode||this.mapSelectionMode==='progress'||event.altKey)&&event.button===0;
        // Ctrl + arraste é o controle principal de inclinação. Shift continua
        // funcionando para compatibilidade com o gesto anterior.
        tilting=!selecting&&event.button===0&&(event.ctrlKey||event.shiftKey);
        zooming=!selecting&&!tilting&&event.altKey&&event.button===0;
        rotating=!selecting&&event.button===2;
        panning=!selecting&&!zooming&&!tilting&&!rotating&&(event.button===0||event.button===1);
        this.dataset.mapGesture=selecting?'select-progress':zooming?'alt-zoom':tilting?(event.ctrlKey?'ctrl-tilt':'shift-tilt'):rotating?'rotate':panning?'pan':'idle';
        if(selecting)this.beginMapAreaSelection(event.clientX,event.clientY);
        canvas.setPointerCapture?.(event.pointerId);
      });
      canvas.addEventListener('pointermove',event=>{
        if(!down)return;
        const total=Math.hypot(event.clientX-down.x,event.clientY-down.y); if(!dragging&&total>6)dragging=true;
        if(dragging){
          const dx=event.clientX-lastX,dy=event.clientY-lastY;
          if(selecting)this.updateMapAreaSelection(event.clientX,event.clientY);
          else if(zooming)this.setSceneZoom(this.sceneManualZoom-dy*ZOOM_DRAG_SENSITIVITY,false);
          else if(tilting)this.setSceneTiltAdjust(this.sceneTiltAdjust+dy*TILT_DRAG_SENSITIVITY,false);
          else if(rotating)this.setSceneRotation(this.sceneManualRotation+dx*.32,false);
          else if(panning){
            // O pan precisa acompanhar a projeção perspectiva. Dividir dx/dy
            // somente pela escala funciona em vista ortogonal, mas erra com
            // a inclinação e faz o mapa escapar ou andar pouco no zoom. A
            // interseção dos dois ponteiros com o plano XY devolve o delta no
            // mesmo espaço mundial usado por mapSurface, GLB e markers.
            const projectedDelta=this.screenDragPanDelta(lastX,lastY,event.clientX,event.clientY);
            const terrainDx=Number(projectedDelta?.x)||0;
            const terrainDy=Number(projectedDelta?.y)||0;
            const currentPan=this.sceneManualPan||{x:0,y:0};
            const bounds=this.getScenePanBounds?.()||{x:Infinity,y:Infinity};
            const limitX=Number.isFinite(Number(bounds.x))?Math.max(0,Number(bounds.x)):Infinity;
            const limitY=Number.isFinite(Number(bounds.y))?Math.max(0,Number(bounds.y)):Infinity;
            const nextPanX=Math.max(-limitX,Math.min(limitX,currentPan.x+terrainDx));
            const nextPanY=Math.max(-limitY,Math.min(limitY,currentPan.y+terrainDy));
            this.setScenePan(nextPanX,nextPanY,false);
            this.dataset.mapPanBehavior='world-translation · projected screen delta · zoom-aware v5332';
          }
          lastX=event.clientX; lastY=event.clientY; this._suppressMapToggleUntil=performance.now()+300;
        }
      });
      canvas.addEventListener('pointerup',event=>{
        if(!down)return;
        const shouldConstrain=dragging&&!selecting&&(panning||tilting||rotating||zooming);
        const total=Math.hypot(event.clientX-down.x,event.clientY-down.y);
        if(selecting){
          if(dragging){
            if(this.recordPaintMode){
              const parts=this.collectModelPartsInRect(down,{x:event.clientX,y:event.clientY});
              if(parts.length>1)this.selectRecordMapParts(parts); else if(parts.length===1)this.selectRecordMapPart(parts[0]); else this.removeMapAreaSelection();
            }else this.finishMapAreaSelection(event.clientX,event.clientY);
          } else {
            this.removeMapAreaSelection();
            const point=this.pointFromClient(event.clientX,event.clientY);
            if(point)this.pickModelAt(point);
          }
          this._suppressMapToggleUntil=performance.now()+520;
        }else if(event.button!==2&&!dragging&&total<=6&&event.pointerType!=='touch'){
          const point=this.pointFromClient(event.clientX,event.clientY);
          if(point&&this.pickModelAt(point))this._suppressMapToggleUntil=performance.now()+520;
          else this._suppressMapToggleUntil=performance.now()+520;
        }else this._suppressMapToggleUntil=performance.now()+520;
        canvas.releasePointerCapture?.(event.pointerId); if(shouldConstrain)this.constrainScenePan('pointer-release'); down=null; dragging=false; panning=false; tilting=false; rotating=false; zooming=false; selecting=false; delete this.dataset.mapGesture;
      });
      canvas.addEventListener('pointercancel',()=>{const shouldConstrain=dragging&&!selecting&&(panning||tilting||rotating||zooming);this.removeMapAreaSelection();if(shouldConstrain)this.constrainScenePan('pointer-cancel');down=null;dragging=false;panning=false;tilting=false;rotating=false;zooming=false;selecting=false;delete this.dataset.mapGesture;});
      // Keep the active gesture visible for diagnostics without introducing a
      // second visual map layer or changing the shared Three.js transform.
      canvas.addEventListener('pointerdown',()=>{if(!this.dataset.mapGesture)this.dataset.mapGesture='holding';});
      const releaseMapGesture=()=>{delete this.dataset.mapGesture;};
      canvas.addEventListener('pointerup',releaseMapGesture);
      canvas.addEventListener('pointercancel',releaseMapGesture);
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.dataset.threeContext='lost';this.dataset.mapTexture='fallback';});
      canvas.addEventListener('webglcontextrestored',()=>{delete this.dataset.threeContext;this.dataset.mapTexture='loading';if(this._modelGpuReady)this.syncThree();});
      this.dataset.threeBoot='renderer-ready-awaiting-glb';
    } catch(err){ this.dataset.three='fallback';if(this.isPublicMapVisual())this.dataset.publicThree='fallback'; console.warn('Three.js indisponível, mantendo mapa 2D.',err); }
  }
  makeSiteSurfaceMaterial(THREE,material,surface='cobble'){
    if(!material)return material;
    const clone=material.clone?.()||material;
    const palette={
      cobble:{color:0xa7a49a,roughness:.985,metalness:0},
      gravel:{color:0x8b7659,roughness:.99,metalness:0},
      earth:{color:0x9b5d39,roughness:.98,metalness:0},
      grass:{color:0x286b37,roughness:.99,metalness:0},
      asphalt:{color:0x30363a,roughness:.93,metalness:0},
      concrete:{color:0xb9b5aa,roughness:.92,metalness:0},
      sand:{color:0xcbb98e,roughness:.99,metalness:0},
      rubber:{color:0x283536,roughness:.91,metalness:0},
      wood:{color:0x865334,roughness:.88,metalness:0},
      sport:{color:0x8f5a43,roughness:.9,metalness:0},
      roof:{color:0x9d5438,roughness:.9,metalness:0}
    }[surface]||{color:0x666666,roughness:.95,metalness:0};
    clone.color?.setHex?.(palette.color);
    if('roughness' in clone)clone.roughness=palette.roughness;
    if('metalness' in clone)clone.metalness=palette.metalness;
    clone.transparent=false; clone.opacity=1; clone.depthWrite=true; clone.side=THREE.DoubleSide;
    clone.userData={...(clone.userData||{}),belavistaSurface:surface,proceduralNoUv:true};
    const surfaceCode=surface==='cobble'?`
      vec2 bvP=vBelavistaSurfacePos.xy*vec2(0.34,0.52);
      float bvShift=mod(floor(bvP.y),2.0)*0.5;
      vec2 bvCell=fract(vec2(bvP.x+bvShift,bvP.y));
      float bvEdge=min(min(bvCell.x,1.0-bvCell.x),min(bvCell.y,1.0-bvCell.y));
      float bvJoint=1.0-smoothstep(0.045,0.105,bvEdge);
      float bvStone=bvNoise(vBelavistaSurfacePos*0.38);
      float bvFine=bvNoise(vBelavistaSurfacePos*2.7);
      vec3 bvTone=vec3(0.72+0.22*bvStone+0.08*bvFine);
      diffuseColor.rgb*=mix(bvTone,vec3(0.20),bvJoint);
    `:surface==='gravel'?`
      float bvCoarse=bvNoise(vBelavistaSurfacePos*0.72);
      float bvGrain=bvNoise(vBelavistaSurfacePos*5.2);
      float bvPebble=smoothstep(0.68,0.92,bvGrain);
      diffuseColor.rgb*=vec3(0.78+0.20*bvCoarse+0.10*bvPebble);
    `:surface==='grass'?`
      float bvField=bvNoise(vBelavistaSurfacePos*0.17);
      float bvPatch=bvNoise(vBelavistaSurfacePos*1.45);
      float bvClump=bvNoise(vBelavistaSurfacePos*3.8);
      float bvFine=bvNoise(vBelavistaSurfacePos*11.5);
      float bvFiber=bvNoise(vBelavistaSurfacePos*21.0);
      // Variação orgânica em várias escalas, sem a faixa senoidal que fazia
      // o piso social parecer riscado quando visto de cima.
      diffuseColor.rgb*=vec3(.68+.18*bvField+.12*bvPatch+.065*bvClump+.03*bvFine);
      diffuseColor.rgb+=vec3(.012,.028,.008)*(bvFiber-.5);
    `:surface==='sand'?`
      float bvDune=bvNoise(vBelavistaSurfacePos*.32);
      float bvGrain=bvNoise(vBelavistaSurfacePos*8.6);
      float bvPebble=smoothstep(.76,.96,bvNoise(vBelavistaSurfacePos*3.9));
      diffuseColor.rgb*=vec3(.82+.12*bvDune+.055*bvGrain-.045*bvPebble);
    `:surface==='rubber'?`
      float bvBase=bvNoise(vBelavistaSurfacePos*.62);
      float bvSpeck=smoothstep(.77,.94,bvNoise(vBelavistaSurfacePos*11.0));
      diffuseColor.rgb*=mix(vec3(.79+.12*bvBase),vec3(1.25),bvSpeck*.34);
    `:surface==='wood'?`
      float bvGrain=.5+.5*sin(vBelavistaSurfacePos.x*2.5+bvNoise(vBelavistaSurfacePos*.34)*5.0);
      float bvKnot=smoothstep(.72,.93,bvNoise(vBelavistaSurfacePos*.86));
      diffuseColor.rgb*=vec3(.72+.20*bvGrain-.13*bvKnot);
    `:surface==='sport'?`
      float bvWear=bvNoise(vBelavistaSurfacePos*.44);
      float bvAggregate=bvNoise(vBelavistaSurfacePos*7.2);
      diffuseColor.rgb*=vec3(.82+.12*bvWear+.045*bvAggregate);
    `:surface==='roof'?`
      vec2 bvTile=vBelavistaSurfacePos.xy*vec2(.42,.72);
      float bvOffset=mod(floor(bvTile.y),2.0)*.5;
      vec2 bvCell=fract(vec2(bvTile.x+bvOffset,bvTile.y));
      float bvJoint=1.0-smoothstep(.035,.09,min(min(bvCell.x,1.0-bvCell.x),min(bvCell.y,1.0-bvCell.y)));
      float bvClay=bvNoise(vBelavistaSurfacePos*.8);
      diffuseColor.rgb*=mix(vec3(.78+.2*bvClay),vec3(.36),bvJoint);
    `:surface==='asphalt'?`
      float bvAggregate=bvNoise(vBelavistaSurfacePos*3.6);
      float bvPatch=bvNoise(vBelavistaSurfacePos*.32);
      float bvSeam=1.0-smoothstep(.018,.055,abs(fract(vBelavistaSurfacePos.y*.085)-.5));
      diffuseColor.rgb*=vec3(.72+.18*bvAggregate+.10*bvPatch-.11*bvSeam);
    `:surface==='concrete'?`
      float bvSlab=bvNoise(vBelavistaSurfacePos*.52);
      float bvGrain=bvNoise(vBelavistaSurfacePos*5.4);
      float bvJointX=1.0-smoothstep(.012,.04,abs(fract(vBelavistaSurfacePos.x*.12)-.5));
      float bvJointY=1.0-smoothstep(.012,.04,abs(fract(vBelavistaSurfacePos.y*.12)-.5));
      diffuseColor.rgb*=vec3(.86+.10*bvSlab+.035*bvGrain-.17*max(bvJointX,bvJointY));
    `:`
      float bvWide=bvNoise(vBelavistaSurfacePos*0.18);
      float bvSoil=bvNoise(vBelavistaSurfacePos*1.15);
      float bvFine=bvNoise(vBelavistaSurfacePos*4.8);
      float bvTrack=0.5+0.5*sin((vBelavistaSurfacePos.x+vBelavistaSurfacePos.y)*1.35+bvWide*2.5);
      diffuseColor.rgb*=vec3(0.72+0.18*bvWide+0.08*bvSoil-0.045*bvTrack+0.035*bvFine);
    `;
    const rough=surface==='cobble'?'.94 + .055*bvNoise(vBelavistaSurfacePos*3.4)':surface==='gravel'?'.97 + .025*bvNoise(vBelavistaSurfacePos*4.8)':surface==='grass'?'.965 + .03*bvNoise(vBelavistaSurfacePos*4.6)':surface==='rubber'?'.86 + .09*bvNoise(vBelavistaSurfacePos*7.0)':surface==='wood'?'.82 + .12*bvNoise(vBelavistaSurfacePos*2.3)':surface==='sport'||surface==='roof'?'.84 + .11*bvNoise(vBelavistaSurfacePos*4.0)':surface==='sand'?'.97 + .025*bvNoise(vBelavistaSurfacePos*8.0)':surface==='asphalt'?'.89 + .06*bvNoise(vBelavistaSurfacePos*5.2)':surface==='concrete'?'.88 + .07*bvNoise(vBelavistaSurfacePos*4.3)':'.955 + .04*bvNoise(vBelavistaSurfacePos*3.1)';
    clone.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nvarying vec3 vBelavistaSurfacePos;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvBelavistaSurfacePos=position;');
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>',`#include <common>
varying vec3 vBelavistaSurfacePos;
float bvHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float bvNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(bvHash(i+vec3(0,0,0)),bvHash(i+vec3(1,0,0)),f.x),mix(bvHash(i+vec3(0,1,0)),bvHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(bvHash(i+vec3(0,0,1)),bvHash(i+vec3(1,0,1)),f.x),mix(bvHash(i+vec3(0,1,1)),bvHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
        .replace('#include <color_fragment>','#include <color_fragment>\n'+surfaceCode)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(${rough},0.0,1.0);`);
    };
    clone.customProgramCacheKey=()=>`belavista-site-${surface}-v9`;
    clone.needsUpdate=true;
    return clone;
  }
  makeSocialAreaMaterial(THREE,material,objectName=''){
    if(!material)return material;
    const name=String(objectName||'').toLowerCase();
    let surface='concrete',color=0xb8b3a8,metalness=0,roughness=.92;
    if(/area.?de.?lazer.?base|grama|jardim|paisag/.test(name)){
      surface='grass';color=0x397944;roughness=.985;
    }else if(/playground.?areia|areia/.test(name)){
      surface='sand';color=0xd0b982;roughness=.99;
    }else if(/gym.?pad(?!.*border)|academia.?base/.test(name)){
      surface='rubber';color=0x334747;roughness=.9;
    }else if(/court.?border|court.?center|gym.?pad.?border|linha/.test(name)){
      surface='sport';color=0xe7e3d8;roughness=.88;
    }else if(/court[_ -]?[abc]|quadra/.test(name)){
      surface='sport';color=/court[_ -]?b/.test(name)?0x5c765f:/court[_ -]?c/.test(name)?0x9a694e:0x9b7858;roughness=.9;
    }else if(/pavilhao.?telhado|cobertura|telhado|quiosque/.test(name)){
      surface='roof';color=0xa95738;roughness=.9;
    }else if(/banco.?praca|play.?torre|play.?plataforma/.test(name)){
      surface='wood';color=0x8c5735;roughness=.87;
    }else if(/play.?escorregador/.test(name)){
      surface='rubber';color=0xd99925;roughness=.72;
    }else if(/pavilhao.?coluna|play.?coluna|gym.?post|gym.?beam/.test(name)){
      surface='rubber';color=0x355c66;metalness=.34;roughness=.58;
    }else if(/gym.?seat/.test(name)){
      surface='rubber';color=0x255e52;roughness=.78;
    }else if(/praca.?circular|pavilhao.?base|base|passeio|calcada/.test(name)){
      surface='concrete';color=0xbdb7aa;roughness=.93;
    }
    const clone=this.makeSiteSurfaceMaterial(THREE,material,surface);
    clone?.color?.setHex?.(color);
    if(clone&&'metalness' in clone)clone.metalness=metalness;
    if(clone&&'roughness' in clone)clone.roughness=roughness;
    if(clone?.emissive){clone.emissive.setHex(0x000000);clone.emissiveIntensity=0;}
    if(clone){
      clone.userData={...(clone.userData||{}),belavistaSocialSurface:surface,belavistaSocialMaterialVersion:'social-pbr-v553'};
      if(surface==='grass'){
        // Mantém a grama visualmente separada do relevo satélite mesmo onde
        // os dois planos ficam muito próximos após a triangulação do GLB.
        clone.polygonOffset=true;
        clone.polygonOffsetFactor=-1;
        clone.polygonOffsetUnits=-1;
      }
      clone.needsUpdate=true;
    }
    return clone;
  }
  setGpsMarkers(THREE,points=[]){
    if(!this.markerGroup)return;
    this.markerGroup.clear();
    const geometry=this.gpsMarkerGeometry||new THREE.CircleGeometry(8,32);
    points.filter(point=>validGeoPoint({lat:point.lat,lng:point.lng})).forEach((point,index)=>{
      const material=new THREE.MeshBasicMaterial({color:this.gpsMarkerColors?.[index%this.gpsMarkerColors.length]||0x2fe6ae,transparent:true,opacity:.92,depthTest:false,depthWrite:false});
      const marker=new THREE.Mesh(geometry,material);
      marker.userData={latlng:[Number(point.lat),Number(point.lng)],gpsId:point.id||`gps-${index+1}`,gpsLabel:point.label||'Ponto GPS',utmEast:point.utmEast,utmNorth:point.utmNorth};
      marker.scale.setScalar(point.id==='site-center'?1.22:1);
      this.markerGroup.add(marker);
    });
    this.dataset.gpsMarkers=String(this.markerGroup.children.length);
    this.dataset.gpsSource='DWG · SIRGAS 2000 / UTM 24S · EPSG:31984';
    this.syncThree();
  }
  applyDwgLotMetadata(){
    const lots=this.dwgGeo?.lots;
    if(!Array.isArray(lots)||!this.lotStatusBadges?.length)return;
    const byObject=new Map(lots.map(item=>[String(item.glbObject),item]));
    this.lotStatusBadges.forEach(badge=>{
      const lot=byObject.get(String(badge.userData?.glbObject||badge.userData?.lotObject||''));
      if(!lot)return;
      badge.userData.gps={lat:lot.lat,lng:lot.lng,utmEast:lot.utmEast,utmNorth:lot.utmNorth,areaM2:lot.areaM2,alignmentErrorM:lot.alignmentErrorM};
    });
    this.dataset.dwgLotGpsAttached=String(lots.length);
  }
  async loadDwgGeoreference(THREE){
    try{
      const response=await fetch(DWG_GEOREFERENCE_URL,{cache:'no-store'});
      if(!response.ok)throw new Error(`DWG georeference HTTP ${response.status}`);
      const geo=await response.json();
      if(!geo?.crs?.epsg||!Array.isArray(geo.controlPoints))throw new Error('Manifesto DWG sem CRS ou pontos de controle');
      if(Array.isArray(geo.lots)&&Array.isArray(geo.lotFields)){
        geo.lots=geo.lots.map(row=>Array.isArray(row)?Object.fromEntries(geo.lotFields.map((field,index)=>[field,row[index]])):row);
      }
      this.dwgGeo=geo;
      const solarPoint=geo.controlPoints.find(item=>item.id==='site-center')||geo.drawingBounds?.center||MAP_GEOREFERENCE_FALLBACK;
      const stored=appStore.get(),manual=stored.solarHourMode==='manual'&&Number.isFinite(Number(stored.solarHour)),clockHour=localClockHourForGeo(solarPoint);
      this.setSolarHour(manual?Number(stored.solarHour):clockHour,false,false);
      this.dataset.solarInitialMode=manual?'manual':'clock';
      this.dataset.solarClockHour=clockHour.toFixed(2);
      this.setGpsMarkers(THREE,geo.controlPoints);
      this.dataset.dwgCrs=`EPSG:${geo.crs.epsg}`;
      this.dataset.dwgLotCount=String(geo.lots?.length||0);
      this.dataset.dwgAlignmentError=`mediana ${geo.alignment?.medianErrorM??'—'} m · P90 ${geo.alignment?.p90ErrorM??'—'} m`;
      if(this.masterplanModel){
        this.masterplanModel.userData.dwgGeoreferenced=true;
        this.masterplanModel.userData.dwgCrs=geo.crs.epsg;
        this.masterplanModel.userData.dwgAlignment=geo.alignment;
      }
      this.applyDwgLotMetadata();
    }catch(error){
      this.dataset.dwgGeoreference='fallback';
      this.dataset.dwgGeoreferenceError=String(error?.message||error);
      console.warn('Georreferência DWG indisponível; usando o ponto central de fallback.',error);
    }
  }
  addCurbOutlines(THREE,sources=[]){
    if(this.curbOutlineGroup){this.curbOutlineGroup.removeFromParent?.();this.curbOutlineGroup=null;}
    const group=new THREE.Group(); group.name='BelavistaCurbs'; group.renderOrder=14;
    const material=new THREE.LineBasicMaterial({color:0xd9d3c6,transparent:true,opacity:.96,depthWrite:false,depthTest:true});
    let count=0;
    for(const source of sources){
      const geometry=source?.geometry;
      if(!geometry?.getAttribute?.('position'))continue;
      try{
        const edges=new THREE.EdgesGeometry(geometry,18);
        if(!edges.getAttribute('position')?.count){edges.dispose();continue;}
        const curb=new THREE.LineSegments(edges,material);
        curb.name=`MeioFio_${String(count+1).padStart(2,'0')}`;
        curb.renderOrder=14;
        curb.position.z=.085;
        curb.userData={belavistaRole:'curb',partKind:'curbs',partLabel:`Meio-fio · trecho ${count+1}`,defaultMaterial:material};
        source.add(curb);
        count++;
      }catch(error){console.warn('Falha ao criar meio-fio visual.',error);}
    }
    this.curbOutlineGroup=group;
    this.dataset.curbOutlines=String(count);
    this.dataset.curbTarget='aprox. 8000 m lineares · referência operacional';
  }
  applyPublicPresentationStyle(THREE){
    if(!this.isPublicMapVisual()||this._publicPresentationStyleReady||!this.modelParts)return;
    this._publicPresentationStyleReady=true;

    // A fotografia aérea é o chão da experiência pública. Os lotes não
    // recebem uma nova textura verde: ficam translúcidos e são definidos por
    // contornos brancos, como uma implantação comercial sobre o terreno real.
    const lotFill=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.032,side:THREE.DoubleSide,depthWrite:false});
    this.publicLotSurfaceMaterial=lotFill;
    const lotOutline=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.84,depthWrite:false,depthTest:true});
    let outlines=0;
    for(const lot of this.modelParts.lots||[]){
      lot.material=lotFill;
      lot.userData.defaultMaterial=lotFill;
      if(lot.userData.publicLotOutline||!lot.geometry)continue;
      try{
        const edge=new THREE.LineSegments(new THREE.EdgesGeometry(lot.geometry,12),lotOutline);
        edge.name=`${lot.name||'Lote'}__public_white_outline`;
        edge.position.z=.045;
        edge.renderOrder=20;
        edge.raycast=()=>{};
        lot.add(edge);
        lot.userData.publicLotOutline=edge;
        outlines++;
      }catch{}
    }
    // Remove os antigos selos/placas 2D do GLB. A leitura comercial pública
    // passa a ser feita apenas pelos marcadores 3D posicionados pelo catálogo.
    for(const badge of this.lotStatusBadges||[])badge.removeFromParent?.();
    this.lotStatusBadges=[];
    this.masterplanModel?.traverse?.(node=>{
      if(/lote.*(?:status|badge)|(?:status|badge).*lote/i.test(String(node.name||'')))node.visible=false;
    });
    // O GLB antigo traz fileiras de árvores em coordenadas de apresentação,
    // não em coordenadas do DWG. Elas ficam ocultas no modo público; a
    // vegetação pública é replantada abaixo a partir das áreas verdes reais.
    let hiddenLegacyTrees=0;
    for(const node of this.modelLandscapeNodes||[]){
      if(!node?.isMesh)continue;
      const name=String(node.name||'').toLowerCase();
      const box=new THREE.Box3().setFromObject(node),size=box.getSize(new THREE.Vector3());
      if(/arvore|tree|tronco|trunk|copa|folhagem|folha|row|fila/.test(name)||size.x<8&&size.y<8){
        node.visible=false;hiddenLegacyTrees++;
      }
    }
    this.dataset.publicLegacyTreesHidden=String(hiddenLegacyTrees);

    // As ruas partem como asfalto. Os trechos concluídos recebem a camada de
    // paralelepípedo por cima, conforme a medição de pavimentação registrada.
    for(const street of this.modelParts.streets||[]){
      const asphalt=this.makeSiteSurfaceMaterial(THREE,street.userData.defaultMaterial||street.material,'asphalt');
      street.material=asphalt;
      street.userData.defaultMaterial=asphalt;
    }

    // Mantém equipamentos/praças modelados em 3D, mas cria uma base de
    // concreto somente sob superfícies sociais reais. O GLB também contém
    // grupos-pai e peças de mobiliário; usar a caixa de qualquer mesh aqui
    // criava o enorme retângulo branco que aparecia solto no canto da cena.
    const concrete=this.makeSiteSurfaceMaterial(THREE,new THREE.MeshStandardMaterial({color:0xb9b5aa,roughness:.92,metalness:0,side:THREE.DoubleSide}),'concrete');
    const pads=new THREE.Group(); pads.name='BelavistaPublicLeisureConcrete'; pads.renderOrder=7;
    this.sceneStage?.updateMatrixWorld?.(true);
    const stageInverse=this.sceneStage?.matrixWorld
      ? new THREE.Matrix4().copy(this.sceneStage.matrixWorld).invert()
      : null;
    const toStageBox=worldBox=>{
      if(!stageInverse)return worldBox;
      const local=new THREE.Box3();
      for(const x of [worldBox.min.x,worldBox.max.x]){
        for(const y of [worldBox.min.y,worldBox.max.y]){
          for(const z of [worldBox.min.z,worldBox.max.z]){
            local.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(stageInverse));
          }
        }
      }
      return local;
    };
    const siteBounds=this.masterplanModel?toStageBox(new THREE.Box3().setFromObject(this.masterplanModel)):null;
    const siteSize=siteBounds?.getSize(new THREE.Vector3())||new THREE.Vector3(0,0,0);
    const padName=/area.?de.?lazer|quadra|pavilh[aã]o|play|gym.?pad|court|praca|pra[cç]a|base|piso|floor|social/;
    const seen=new Set();
    const padCenters=[];
    for(const node of this.modelLeisureNodes||[]){
      if(!node?.geometry||seen.has(node))continue;
      seen.add(node);
      try{
        const name=String(node.name||'').toLowerCase();
        const bounds=toStageBox(new THREE.Box3().setFromObject(node)),size=bounds.getSize(new THREE.Vector3());
        const area=size.x*size.y,siteArea=Math.max(1,siteSize.x*siteSize.y);
        const isOversized=Boolean(siteBounds&&(
          size.x>siteSize.x*.24||size.y>siteSize.y*.24||area>siteArea*.085
        ));
        // Só superfícies com nome de piso/base entram. Peças menores que
        // dois metros e grupos-pai são objetos 3D, não pads de implantação.
        if(!padName.test(name)||size.x<2||size.y<2||isOversized)continue;
        const center=bounds.getCenter(new THREE.Vector3());
        if(padCenters.some(previous=>previous.distanceTo(center)<Math.max(2,Math.min(size.x,size.y)*.42)))continue;
        padCenters.push(center);
        const padWidth=Math.min(size.x*1.04,Math.max(2,siteSize.x?siteSize.x*.13:size.x*1.04));
        const padDepth=Math.min(size.y*1.04,Math.max(2,siteSize.y?siteSize.y*.13:size.y*1.04));
        const pad=new THREE.Mesh(new THREE.PlaneGeometry(padWidth,padDepth),concrete);
        pad.name=`${node.name||'area_livre'}__concrete_pad`;
        pad.position.set(center.x,center.y,bounds.min.z+.035);
        pad.renderOrder=7;
        pad.raycast=()=>{};
        pad.userData={publicContext:true,kind:'social-concrete-pad',source:'GLB social surface · bounded to activity footprint'};
        pads.add(pad);
      }catch{}
    }
    if(pads.children.length){this.sceneStage?.add(pads);this.publicLeisureConcreteGroup=pads;}
    this.dataset.publicLotPresentation=`white-outlines:${outlines}`;
    this.dataset.publicGround='satellite image · no synthetic grass under lots';
    this.dataset.publicLeisureGround=`concrete pads:${pads.children.length}`;
    this.dataset.publicLeisurePadPolicy='social floor/base meshes only · parent boxes excluded · bounded footprint';
    this.loadPublicCobbleTexture();
    this.setPublicPavingView('cobble',100);
  }
  reassertPublicPresentationStyle(){
    if(!this.isPublicMapVisual()||!this.modelParts)return;
    const fill=this.publicLotSurfaceMaterial;
    if(fill){
      for(const lot of this.modelParts.lots||[]){
        lot.material=fill;
        lot.userData.defaultMaterial=fill;
      }
    }
    // O modo público não aceita a paleta terrosa do mapa administrativo.
    // Reaplica a textura de pedra em toda a hierarquia de ruas, inclusive nos
    // filhos dos meshes-fonte que o GLB usa para as faces laterais.
    if(this.publicCobbleTexture){
      const roadMaterial=this.getPublicCobbleMaterial();
      const applyRoad=node=>{
        if(!node?.isMesh||!roadMaterial)return;
        this.ensurePublicTextureUv(node.geometry,true);
        node.material=roadMaterial;
        node.userData.defaultMaterial=roadMaterial;
        node.userData.publicRoadSurface=true;
        node.renderOrder=Math.max(12,node.renderOrder||0);
      };
      const visited=new Set();
      for(const source of [...(this._streetSourceCandidates||[]),...(this.modelParts.streets||[])]){
        source?.traverse?.(node=>{if(visited.has(node))return;visited.add(node);applyRoad(node);});
      }
      this.masterplanModel?.traverse?.(node=>{
        if(visited.has(node))return;
        const role=String(node.userData?.partKind||'').toLowerCase();
        if(role==='streets'||role==='curbs'||/(rua|street|road|asfalto|paviment|meio.?fio|guia|curb)/i.test(String(node.name||'')))applyRoad(node);
      });
      // Os meios-fios vivem nos overlays públicos, fora da hierarquia do
      // GLB. Incluí-los aqui garante que também recebam a textura importada.
      this.sceneStage?.traverse?.(node=>{
        if(visited.has(node))return;
        if(node.userData?.publicCurb||node.userData?.streetSegment)applyRoad(node);
      });
    }
    this.setPublicPavingView('cobble',100);
    this.dataset.publicVisualRefresh='white-lot-outlines + all-imported-cobble';
  }
  ensurePublicTextureUv(geometry,force=false){
    if(!geometry?.getAttribute?.('position')||(!force&&geometry.getAttribute('uv')))return;
    const position=geometry.getAttribute('position');
    if(!position.count)return;
    if(!geometry.boundingBox)geometry.computeBoundingBox();
    const box=geometry.boundingBox;
    const spans=[
      {axis:'x',min:box?.min.x||0,span:Math.max(.001,(box?.max.x||1)-(box?.min.x||0))},
      {axis:'y',min:box?.min.y||0,span:Math.max(.001,(box?.max.y||1)-(box?.min.y||0))},
      {axis:'z',min:box?.min.z||0,span:Math.max(.001,(box?.max.z||1)-(box?.min.z||0))}
    ].sort((a,b)=>b.span-a.span);
    // GLBs de implantação normalmente usam X/Z como plano horizontal,
    // enquanto uma PlaneGeometry recém-criada usa X/Y antes da rotação. Os
    // dois maiores eixos cobrem ambos os casos sem projetar a pedra na altura.
    const horizontalU=spans[0],horizontalV=spans[1];
    const aspectCompensation=Math.min(28,Math.max(1,horizontalU.span/Math.max(.001,horizontalV.span)));
    const coordinate=(index,axis)=>axis==='x'?position.getX(index):axis==='y'?position.getY(index):position.getZ(index);
    const uv=new Float32Array(position.count*2);
    for(let index=0;index<position.count;index++){
      // A repetição fica no material. Manter o UV normalizado evita somar
      // duas escalas e produzir blocos de pedra grandes demais nas vias.
      // Como a rua é mais longa que larga, repetir igualmente os dois eixos
      // estica cada pedra no comprimento. A compensação gera peças quadradas
      // e fiadas transversais, inclusive nos meios-fios longos.
      uv[index*2]=(coordinate(index,horizontalU.axis)-horizontalU.min)/horizontalU.span*aspectCompensation;
      uv[index*2+1]=(coordinate(index,horizontalV.axis)-horizontalV.min)/horizontalV.span;
    }
    geometry.setAttribute('uv',new this.THREE.BufferAttribute(uv,2));
    geometry.attributes.uv.needsUpdate=true;
  }
  getPublicCobbleMaterial(){
    if(!this.THREE||!this.publicCobbleTexture)return null;
    if(this._publicCobbleMaterial?.map===this.publicCobbleTexture)return this._publicCobbleMaterial;
    // MeshBasicMaterial keeps the imported stone visible over the dark
    // satellite/GLB lighting. The texture itself remains the real
    // paralelepípedo surface; only its exposure is made deterministic.
    this._publicCobbleMaterial=new this.THREE.MeshBasicMaterial({
      color:0xffffff,map:this.publicCobbleTexture,side:this.THREE.DoubleSide,
      transparent:false,depthWrite:true,depthTest:true
    });
    this._publicCobbleMaterial.name='BelavistaImportedCobblePublic';
    return this._publicCobbleMaterial;
  }
  loadPublicCobbleTexture(){
    if(!this.isPublicMapVisual()||this.publicCobbleTexture||this._publicCobbleTextureLoading||!this.THREE)return;
    this._publicCobbleTextureLoading=true;
    this.dataset.publicRoadTexture='loading';
    new this.THREE.TextureLoader().load(
      runtimeRouteV1('/assets/textures/cobblestone-pavement-polyhaven-1k.jpg'),
      texture=>{
        texture.colorSpace=this.THREE.SRGBColorSpace;
        texture.wrapS=this.THREE.RepeatWrapping;
        texture.wrapT=this.THREE.RepeatWrapping;
        // A malha inteira do GLB cobre o loteamento; oito repetições deixavam
        // cada pedra com escala de piso/placa. Trinta e duas repetições
        // mantêm blocos menores e numerosos, ainda legíveis no enquadramento
        // inicial e mais naturais quando a câmera se aproxima das ruas.
        texture.repeat.set(32,32);
        // A paginação da pedra fica diagonal em relação ao eixo das vias,
        // como na referência visual do loteamento. O centro evita deslocar o
        // padrão ao aplicar a rotação no material compartilhado.
        texture.center.set(.5,.5);
        texture.rotation=Math.PI/4;
        this.dataset.publicRoadTextureRotation='45deg';
        texture.anisotropy=Math.min(4,this.renderer?.capabilities?.getMaxAnisotropy?.()||1);
        texture.needsUpdate=true;
        this.publicCobbleTexture=texture;
        this._publicCobbleTextureLoading=false;
        this.dataset.publicRoadTexture='ready';
        this.dataset.publicRoadTextureSource='Poly Haven · Cobblestone Pavement · CC0';
        // A apresentação pública já pode ter sido montada enquanto a imagem
        // chegava. Nesse caso reassertPublicPresentationStyle() sai cedo por
        // _publicPresentationStyleReady e deixava os meshes nativos no
        // material escuro original. Reaplique somente a camada de rua agora.
        this.reassertPublicRoadMaterial();
        this.setPublicPavingView('cobble',100);
      },
      undefined,
      error=>{
        this._publicCobbleTextureLoading=false;
        this.dataset.publicRoadTexture='fallback';
        console.warn('[Aliança Park public] textura importada de paralelepípedo indisponível.',error);
      }
    );
  }
  setPublicPavingView(mode='cobble',progress=0){
    if(!this.isPublicMapVisual()||!this.THREE)return;
    this.ensureOperationalStreetGeometry();
    const generated=(this.modelParts?.streets||[]).filter(item=>item.userData?.streetSegment);
    // Alguns GLBs trazem ruas compostas sem uma geometria retangular que
    // possa ser fatiada. Neles, o fallback é por via inteira — ainda respeita
    // a medição e evita deixar todos os trechos em paralelepípedo.
    const segmented=generated.length>0;
    const segments=segmented?generated:(this._streetSourceCandidates||this.modelParts?.streets||[]);
    const normalized=Math.max(0,Math.min(100,Number(progress)||0));
    const appliedProgress=mode==='cobble'?100:normalized;
    const completed=mode==='asphalt'?0:Math.round(segments.length*appliedProgress/100);
    segments.forEach((segment,index)=>{
      this.ensurePublicTextureUv(segment.geometry,true);
      if(!segment.userData.publicCobbleMaterial){
        segment.userData.publicCobbleMaterial=this.getPublicCobbleMaterial()||new this.THREE.MeshBasicMaterial({color:0x8d8a82,side:this.THREE.DoubleSide});
      }
      if(this.publicCobbleTexture&&segment.userData.publicCobbleMaterial.map!==this.publicCobbleTexture){
        segment.userData.publicCobbleMaterial.map=this.publicCobbleTexture;
        segment.userData.publicCobbleMaterial.needsUpdate=true;
      }
      if(segmented){
        segment.visible=index<completed;
        if(index<completed)segment.material=segment.userData.publicCobbleMaterial;
      }else{
        segment.material=index<completed?segment.userData.publicCobbleMaterial:segment.userData.defaultMaterial;
      }
    });
    // A textura das superfícies-fatia já foi atribuída acima. Não reentre em
    // reassertPublicRoadMaterial aqui: esse método chama setPublicPavingView
    // durante o carregamento da textura e a recursão fazia o renderer perder
    // a camada das ruas.
    this.dataset.publicPavingView=mode==='asphalt'?'all-asphalt':mode==='cobble'?'all-cobble':'progress-only-cobble';
    this.dataset.publicPavingProgress=String(appliedProgress);
    this.dataset.publicCobbleSegments=`${completed}/${segments.length}${segmented?' trechos':' vias'}`;
    this.renderer?.render(this.scene,this.camera);
  }
  reassertPublicRoadMaterial(){
    const material=this.getPublicCobbleMaterial();
    if(!material)return;
    const apply=node=>{
      if(!node?.isMesh)return;
      const role=String(node.userData?.partKind||'').toLowerCase();
      if(node.userData?.streetSegment||node.userData?.publicCurb||role==='streets'||role==='curbs'){
        this.ensurePublicTextureUv(node.geometry,true);
        node.material=material;
        node.userData.defaultMaterial=material;
        node.userData.publicRoadSurface=true;
      }
    };
    for(const source of [...(this._streetSourceCandidates||[]),...(this.modelParts?.streets||[])])source?.traverse?.(apply);
    this.masterplanModel?.traverse?.(apply);
    this.dataset.publicRoadMaterial='imported-cobble-meshbasic-v55';
  }
  ensurePublicTerrainRelief(){
    if(this.isPublicMapVisual()&&!this._publicEnvironmentAllowed){
      this.dataset.publicTerrainRelief='queued-after-first-open';
      return;
    }
    if(!this.isPublicMapVisual()||!this.THREE||!this.sceneStage||!this.mapSurface)return;
    const THREE=this.THREE;
    if(!this.publicTerrainRelief){
      const geometry=new THREE.PlaneGeometry(1,1,48,48);
      const position=geometry.getAttribute('position');
      for(let index=0;index<position.count;index++){
        const x=position.getX(index),y=position.getY(index);
        // Relevo suave apenas no terreno de fundo; a cota fica sempre abaixo
        // da implantação para não cobrir lotes, ruas ou equipamentos.
        const ridge=Math.sin((x+.12)*Math.PI*2.1)*.16+Math.cos((y-.18)*Math.PI*2.7)*.11+Math.sin((x+y)*Math.PI*4.2)*.045;
        // O terreno é uma camada de fundo, mas precisa permanecer próximo ao
        // plano da implantação para continuar visível na câmera inclinada.
        // A versão anterior ficava quase uma unidade abaixo do GLB e sumia
        // quando o enquadramento público era recomposto.
        position.setZ(index,-.18+ridge*.11);
      }
      position.needsUpdate=true;geometry.computeVertexNormals();
      // A imagem aérea georreferenciada é a única base horizontal do mapa.
      // Não há fallback de grama: enquanto as tiles não chegam, o terreno
      // fica oculto para não criar um pano verde sob os lotes.
      const satelliteReady=this.dataset.mapTexture==='ready'&&this.mapSurfaceTexture?.image;
      const groundTexture=satelliteReady?this.mapSurfaceTexture:null;
      const material=new THREE.MeshStandardMaterial({
        color:0xffffff,map:groundTexture||null,roughness:1,metalness:0,
        side:THREE.DoubleSide,depthWrite:true,depthTest:true,
        transparent:!groundTexture,opacity:groundTexture?1:0
      });
      const terrain=new THREE.Mesh(geometry,material);
      terrain.name='BelavistaPublicTerrainRelief';terrain.renderOrder=-5;terrain.frustumCulled=false;terrain.receiveShadow=true;
      terrain.visible=Boolean(groundTexture);
      terrain.userData={publicTerrain:true,source:satelliteReady?'satellite tile mosaic · DWG GPS centre':'hidden while satellite loads',relief:'procedural-low-amplitude',coordinateSource:'DWG-aligned-map-surface'};
      this.sceneStage.add(terrain);this.publicTerrainRelief=terrain;
    }
    this.syncPublicTerrainRelief();
    this.dataset.publicTerrainRelief='3D · base aérea georreferenciada · relevo suave';
    this.dataset.publicTerrainSurface=this.dataset.mapTexture==='ready'&&this.mapSurfaceTexture?.image
      ?'satellite tile mosaic · DWG GPS centre'
      :'satellite pending · terrain hidden';
  }
  loadPublicTerrainTextureV1(){
    if(!this.isPublicMapVisual()||!this.THREE)return;
    // Removido o fallback local de grama. O mosaico satélite, ao chegar,
    // aciona syncPublicTerrainRelief() e revela a camada de terreno.
    this.publicTerrainTexture=null;
    this.dataset.publicTerrainTexture='disabled · satellite-only ground';
    this.dataset.publicTerrainSource='satellite tile mosaic · DWG GPS centre';
    this.syncPublicTerrainRelief?.();
  }
  extractPublicVegetationSamplesV1(texture){
    if(!this.isPublicMapVisual()||!texture?.image)return;
    try{
      const size=128,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      const context=canvas.getContext('2d',{willReadFrequently:true});
      if(!context)return;
      context.drawImage(texture.image,0,0,size,size);
      const pixels=context.getImageData(0,0,size,size).data,candidates=[],samples=[];
      const readPixel=(x,y)=>{
        const px=Math.max(0,Math.min(size-1,x)),py=Math.max(0,Math.min(size-1,y)),offset=(py*size+px)*4;
        return {r:pixels[offset],g:pixels[offset+1],b:pixels[offset+2]};
      };
      for(let y=2;y<size-2;y+=2)for(let x=2;x<size-2;x+=2){
        const center=readPixel(x,y),r=center.r,g=center.g,b=center.b,brightness=(r+g+b)/3;
        const ring=[[x-2,y],[x+2,y],[x,y-2],[x,y+2]].map(([px,py])=>readPixel(px,py));
        const ringBrightness=ring.reduce((sum,pixel)=>sum+(pixel.r+pixel.g+pixel.b)/3,0)/ring.length;
        const canopyContrast=Math.max(0,ringBrightness-brightness);
        const greenScore=g-Math.max(r,b)*.82;
        // A imagem aérea é reduzida a candidatos de copa: verde predominante,
        // contraste local de copa e distância mínima entre pontos para não
        // plantar dezenas de árvores sobre a mesma mancha de vegetação.
        if(g>r*1.05&&g>b*.98&&greenScore>9&&brightness>20&&brightness<238&&(canopyContrast>2.5||brightness<112))candidates.push({u:x/(size-1),v:y/(size-1),score:greenScore+canopyContrast*.35});
      }
      candidates.sort((a,b)=>b.score-a.score);
      const crownSpacing=.055;
      for(const candidate of candidates){
        if(samples.every(sample=>Math.hypot(sample.u-candidate.u,sample.v-candidate.v)>=crownSpacing))samples.push(candidate);
        if(samples.length>=320)break;
      }
      const source=texture===this.mapSurfaceTexture
        ?'satellite tile mosaic · Esri World Imagery · DWG GPS centre'
        :sourceFromTerrainTexture(texture);
      this.dataset.publicVegetationImageSampling=`${samples.length} candidatos de copa espaçados · ${source}`;
      this.publicVegetationSamples=samples;
    }catch(error){
      this.publicVegetationSamples=[];
      this.dataset.publicVegetationImageSampling='indisponível · amostragem protegida';
      console.warn('[Aliança Park public] amostragem vegetal do terreno indisponível.',error);
    }
    function sourceFromTerrainTexture(value){return value?.image?.src?.split('/').pop()||'textura local';}
  }
  scanPublicSatelliteContextV1(texture){
    if(!this.isPublicMapVisual()||!this.THREE||!this.sceneStage||!this.masterplanModel||!this.mapSurface||!texture?.image||!this.publicGpsContextEnvironment)return;
    if(this.__publicSatelliteContextTexture===texture)return;
    const THREE=this.THREE;
    try{
      this.sceneStage.updateMatrixWorld(true);
      this.masterplanModel.updateMatrixWorld(true);
      const stageInverse=new THREE.Matrix4().copy(this.sceneStage.matrixWorld).invert();
      const toStageBox=worldBox=>{
        const local=new THREE.Box3();
        for(const x of [worldBox.min.x,worldBox.max.x])for(const y of [worldBox.min.y,worldBox.max.y])for(const z of [worldBox.min.z,worldBox.max.z]){
          local.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(stageInverse));
        }
        return local;
      };
      const siteBounds=toStageBox(new THREE.Box3().setFromObject(this.masterplanModel));
      const siteSize=siteBounds.getSize(new THREE.Vector3());
      const width=Math.max(1,siteSize.x),height=Math.max(1,siteSize.y),short=Math.min(width,height);
      const centerX=(siteBounds.min.x+siteBounds.max.x)/2,centerY=(siteBounds.min.y+siteBounds.max.y)/2;
      const surface=this.mapSurface;
      const surfaceWidth=Math.max(width*1.7,Math.abs(Number(surface.scale.x)||0));
      const surfaceHeight=Math.max(height*1.7,Math.abs(Number(surface.scale.y)||0));
      const groundZ=Math.max(Number(surface.position.z)||0,siteBounds.min.z)+.055;
      const blockerBoxes=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[])].map(node=>toStageBox(new THREE.Box3().setFromObject(node)));
      const isBlocked=(x,y,margin=Math.max(.35,short*.006))=>blockerBoxes.some(box=>x>=box.min.x-margin&&x<=box.max.x+margin&&y>=box.min.y-margin&&y<=box.max.y+margin);

      const size=192,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      const context2d=canvas.getContext('2d',{willReadFrequently:true});
      if(!context2d)return;
      context2d.drawImage(texture.image,0,0,size,size);
      const pixels=context2d.getImageData(0,0,size,size).data,grid=32,cell=size/grid;
      const cells=[],cellByKey=new Map();
      for(let gy=0;gy<grid;gy++)for(let gx=0;gx<grid;gx++){
        let count=0,sumR=0,sumG=0,sumB=0,sumBrightness=0;
        const minX=Math.floor(gx*cell),maxX=Math.min(size,Math.floor((gx+1)*cell));
        const minY=Math.floor(gy*cell),maxY=Math.min(size,Math.floor((gy+1)*cell));
        for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
          const offset=(y*size+x)*4,r=pixels[offset],g=pixels[offset+1],b=pixels[offset+2],brightness=(r+g+b)/3;
          sumR+=r;sumG+=g;sumB+=b;sumBrightness+=brightness;count++;
        }
        if(!count)continue;
        const r=sumR/count,g=sumG/count,b=sumB/count,brightness=sumBrightness/count,spread=Math.max(r,g,b)-Math.min(r,g,b);
        let variance=0;
        for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
          const offset=(y*size+x)*4;variance+=Math.abs(((pixels[offset]+pixels[offset+1]+pixels[offset+2])/3)-brightness);
        }
        variance/=count;
        const greenDominance=g-Math.max(r,b),neutral=Math.max(0,1-spread/110),uniformity=Math.max(0,1-variance/52);
        const u=(gx+.5)/grid,v=(gy+.5)/grid;
        const x=Number(surface.position.x||0)+(u-.5)*surfaceWidth;
        const y=Number(surface.position.y||0)+(.5-v)*surfaceHeight;
        const outside=Math.abs((x-centerX)/width)>.69||Math.abs((y-centerY)/height)>.69;
        // Pads e construções são candidatos claros, pouco saturados e com
        // baixa variação local. Vegetação e lavouras ficam fora da lista.
        const candidate=brightness>132&&brightness<246&&r>92&&g>88&&b>72&&greenDominance<22&&neutral>.30&&uniformity>.34&&outside&&!isBlocked(x,y,short*.012);
        const item={gx,gy,u,v,x,y,brightness,neutral,uniformity,candidate,score:brightness*.20+neutral*42+uniformity*28};
        cells.push(item);cellByKey.set(`${gx}:${gy}`,item);
      }
      const candidates=cells.filter(item=>item.candidate);
      candidates.forEach(item=>{
        let neighbours=0;
        for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])if(cellByKey.get(`${item.gx+dx}:${item.gy+dy}`)?.candidate)neighbours++;
        item.neighbours=neighbours;item.score+=neighbours*17;
      });
      candidates.sort((a,b)=>b.score-a.score);
      const selected=[];const minSpacing=.095;
      for(const item of candidates){
        if(selected.every(other=>Math.hypot(item.u-other.u,item.v-other.v)>=minSpacing))selected.push(item);
        if(selected.length>=10)break;
      }

      const previous=this.publicSatelliteContextFeaturesGroup;
      if(previous){
        previous.removeFromParent?.();
        previous.traverse?.(node=>{node.geometry?.dispose?.();if(node.material&&!node.material.map)node.material.dispose?.();});
      }
      const featureGroup=new THREE.Group();featureGroup.name='BelavistaPublicSatelliteContextFeatures';featureGroup.renderOrder=3;
      featureGroup.userData={publicContext:true,satelliteDerived:true,source:'satellite tile raster scan · DWG-aligned',coordinateSpace:'sceneStage local'};
      const pads=new THREE.Group();pads.name='BelavistaPublicSatellitePads';pads.renderOrder=3;
      const structures=new THREE.Group();structures.name='BelavistaPublicSatelliteStructures';structures.renderOrder=4;
      const padMaterial=new THREE.MeshStandardMaterial({color:0xd6d0c2,roughness:.90,metalness:0,side:THREE.DoubleSide});
      const wallMaterial=new THREE.MeshStandardMaterial({color:0x8a8b82,roughness:.88,metalness:0,side:THREE.DoubleSide});
      const roofMaterial=new THREE.MeshStandardMaterial({color:0x5f665f,roughness:.92,metalness:0,side:THREE.DoubleSide});
      selected.forEach((item,index)=>{
        const tileWorldX=surfaceWidth/grid,tileWorldY=surfaceHeight/grid;
        const padWidth=Math.max(short*.022,Math.min(short*.105,tileWorldX*(1.35+(item.neighbours||0)*.18)));
        const padDepth=Math.max(short*.018,Math.min(short*.085,tileWorldY*(1.25+(item.neighbours||0)*.16)));
        const rotation=((item.gx*17+item.gy*11)%7-3)*.035;
        const pad=new THREE.Mesh(new THREE.BoxGeometry(padWidth,padDepth,.075),padMaterial);
        pad.name=`AliançaPark_SatellitePad_${String(index+1).padStart(2,'0')}`;
        pad.position.set(item.x,item.y,groundZ+.0375);pad.rotation.z=rotation;pad.castShadow=false;pad.receiveShadow=true;pad.raycast=()=>{};
        pad.userData={publicContext:true,satelliteDerived:true,kind:'satellite-concrete-pad',source:'bright low-variance satellite feature',score:Number(item.score.toFixed(2)),coordinateSpace:'sceneStage local'};
        pads.add(pad);
        // A vizinhança retangular dá evidência suficiente para levantar um
        // volume baixo. O restante permanece somente como pad de referência,
        // evitando inventar edificações sobre áreas naturais claras.
        if((item.neighbours||0)>=1||index<3){
          const bodyHeight=Math.max(short*.014,Math.min(short*.034,Math.max(padWidth,padDepth)*.44));
          const building=new THREE.Group();
          building.name=`AliançaPark_SatelliteStructure_${String(index+1).padStart(2,'0')}`;
          building.position.set(item.x,item.y,groundZ+.075);building.rotation.z=rotation;
          building.userData={publicContext:true,satelliteDerived:true,kind:'satellite-extruded-structure',source:'bright rectangular satellite feature',score:Number(item.score.toFixed(2)),coordinateSpace:'sceneStage local'};
          const body=new THREE.Mesh(new THREE.BoxGeometry(padWidth*.72,padDepth*.72,bodyHeight),wallMaterial);
          body.position.z=bodyHeight/2;body.castShadow=true;body.receiveShadow=true;
          const roof=new THREE.Mesh(new THREE.BoxGeometry(padWidth*.80,padDepth*.80,Math.max(.045,bodyHeight*.16)),roofMaterial);
          roof.position.z=bodyHeight*1.03;roof.castShadow=true;roof.receiveShadow=true;
          building.add(body,roof);structures.add(building);
        }
      });
      featureGroup.add(pads,structures);this.publicGpsContextEnvironment.add(featureGroup);
      this.publicSatelliteContextFeaturesGroup=featureGroup;
      this.__publicSatelliteContextTexture=texture;
      this.dataset.publicSatelliteContextScan=`${selected.length} áreas claras · raster ${size}×${size} · DWG aligned`;
      this.dataset.publicSatelliteContextFeatures=String(selected.length);
      this.dataset.publicContextPads=String(pads.children.length);
      this.dataset.publicContextStructures=String(structures.children.length);
      this.dataset.publicContextFeatureSource='satellite tile image · low-variance bright rectangular scan';
      this.dataset.publicContextFeaturePolicy='environment-only · outside 3D loteamento · lot/street blockers';
      this.renderer?.render(this.scene,this.camera);
    }catch(error){
      this.dataset.publicSatelliteContextScan='indisponível · amostragem protegida';
      console.warn('[Aliança Park public] leitura de estruturas/pads do satélite indisponível.',error);
    }
  }
  publicSatelliteSamplePointV1(sample,width,height){
    const surface=this.mapSurface;if(!surface)return {x:0,y:0};
    const localX=(Number(sample?.u||0)-.5)*Number(surface.scale.x||width*2);
    const localY=(.5-Number(sample?.v||0))*Number(surface.scale.y||height*2);
    // Se a superfície for girada pelo enquadramento, a amostra também gira
    // ao redor do mesmo centro. Assim a árvore permanece sobre a copa lida
    // no satélite, em vez de usar apenas a translação da textura.
    const angle=Number(surface.rotation?.z)||0,c=Math.cos(angle),s=Math.sin(angle);
    return {
      x:Number(surface.position.x||0)+localX*c-localY*s,
      y:Number(surface.position.y||0)+localX*s+localY*c
    };
  }
  syncPublicSatelliteVegetationV1(){
    if(!this.isPublicMapVisual()||!this.publicTerrainVegetationGroup||!this._publicTreeBuilder||!this._publicTreeContext||!this.mapSurface)return;
    const {bounds,width,height,groundZ,isBlocked,treeHeight}=this._publicTreeContext;
    const centerX=(bounds.min.x+bounds.max.x)/2,centerY=(bounds.min.y+bounds.max.y)/2,surface=this.mapSurface;
    const textureKey=this.mapSurfaceTexture?.uuid||this.dataset.mapSurfaceKey||'satellite';
    const sampleKey=(this.publicVegetationSamples||[]).map(sample=>`${Number(sample.u).toFixed(4)},${Number(sample.v).toFixed(4)}`).join(';');
    const transformKey=[textureKey,sampleKey,Number(surface.position.x||0).toFixed(3),Number(surface.position.y||0).toFixed(3),Number(surface.scale.x||0).toFixed(3),Number(surface.scale.y||0).toFixed(3),Number(surface.rotation?.z||0).toFixed(4)].join('|');
    if(this.__publicSatelliteVegetationTransformKey===transformKey)return;
    this.__publicSatelliteVegetationTransformKey=transformKey;
    for(const child of [...this.publicTerrainVegetationGroup.children]){
      if(child.userData?.source!=='satellite-vegetation-candidate')continue;
      this.publicTerrainVegetationGroup.remove(child);
    }
    const selected=[];
    for(const sample of this.publicVegetationSamples||[]){
      const {x,y}=this.publicSatelliteSamplePointV1(sample,width,height);
      const outside=Math.abs((x-centerX)/width)>.58||Math.abs((y-centerY)/height)>.58;
      if(!outside||isBlocked(x,y,.2)||selected.some(point=>Math.hypot(x-point[0],y-point[1])<Math.min(width,height)*.025))continue;
      selected.push([x,y,Number(sample.score)||0,Number(sample.u)||0,Number(sample.v)||0]);
      if(selected.length>=120)break;
    }
    selected.forEach(([x,y,score,u,v],index)=>{
      const tree=this._publicTreeBuilder(x,y,groundZ,treeHeight*(.60+(index%4)*.04),index+401);
      tree.userData={...(tree.userData||{}),source:'satellite-vegetation-candidate',coordinateSource:'DWG-aligned satellite image',satelliteUv:[u,v],canopyScore:score};
      this.publicTerrainVegetationGroup.add(tree);
    });
    this.dataset.publicTerrainSampleTreeCount=String(selected.length);
    this.dataset.publicSatelliteTreeCount=String(selected.length);
    this.dataset.publicSatelliteTreeCandidates=String(this.publicVegetationSamples?.length||0);
    this.dataset.publicTreeCount=String((this.publicVegetationGroup?.children.length||0)+(this.publicTerrainVegetationGroup?.children.length||0)+(this.publicForestGroup?.children.length||0));
    this.dataset.publicSatelliteVegetationRefresh='satellite tile mosaic applied after load';
    this.dataset.publicSatelliteTreePlacement='satellite canopy samples · same DWG-aligned map surface transform';
    this.dataset.publicSatelliteTreeSampleSpace='texture UV → mapSurface position/scale/rotation → sceneStage local';
    this.renderer?.render(this.scene,this.camera);
  }
  syncPublicTerrainRelief(){
    const terrain=this.publicTerrainRelief,surface=this.mapSurface;
    if(!terrain||!surface)return;
    terrain.position.copy(surface.position);
    terrain.rotation.copy(surface.rotation);
    terrain.scale.copy(surface.scale);
    terrain.position.z=(Number(surface.position.z)||0)-.035;
    const satelliteReady=this.dataset.mapTexture==='ready'&&this.mapSurfaceTexture?.image;
    const texture=satelliteReady?this.mapSurfaceTexture:null;
    if(terrain.material){
      terrain.material.map=texture;
      terrain.material.transparent=!texture;
      terrain.material.opacity=texture?1:0;
      terrain.material.needsUpdate=true;
    }
    terrain.visible=Boolean(texture);
    if(satelliteReady&&this.__publicVegetationSamplingTexture!==this.mapSurfaceTexture){
      // A máscara é recalculada a partir da mesma imagem aérea posicionada no
      // plano do DWG, e não da textura local de grama usada como fallback.
      this.extractPublicVegetationSamplesV1(this.mapSurfaceTexture);
      this.__publicVegetationSamplingTexture=this.mapSurfaceTexture;
      this.scanPublicSatelliteContextV1(this.mapSurfaceTexture);
      this.dataset.publicSatelliteTexture='ready · DWG-centred tile mosaic';
      this.dataset.publicTerrainSource='satellite tile mosaic · Esri World Imagery · DWG GPS centre';
      document.querySelectorAll('.public-map-static-bg').forEach(bg=>{
        bg.setAttribute('data-three-texture-active','true');
        bg.setAttribute('data-satellite-source','dwg-georeference');
      });
      terrain.userData.source='satellite tile mosaic · DWG GPS centre';
    }
    // Também sincroniza fora da troca de textura: resize, reenquadramento e
    // pan podem alterar a posição/escala da superfície mantendo o mesmo
    // objeto Texture. O guard em syncPublicSatelliteVegetationV1 evita
    // recriar árvores quando nada mudou.
    this.syncPublicSatelliteVegetationV1();
    this.dataset.publicTerrainSurface=satelliteReady?'satellite tile mosaic · DWG GPS centre':'satellite pending · terrain hidden';
    // O plano original é mantido apenas como fonte de textura; o relevo passa
    // a ser a única base aérea 3D da apresentação pública.
    surface.visible=false;
  }
  buildPublicGpsContextEnvironmentV2(){
    if(!this.isPublicMapVisual()||this._publicGpsContextEnvironmentV2||!this.THREE||!this.sceneStage||!this.masterplanModel)return;
    const THREE=this.THREE;
    this._publicGpsContextEnvironmentV2=true;
    this.dataset.publicEnvironment='loading-context-3d';
    try{
      this.sceneStage.updateMatrixWorld(true);
      this.masterplanModel.updateMatrixWorld(true);
      const stageInverse=new THREE.Matrix4().copy(this.sceneStage.matrixWorld).invert();
      const worldBounds=new THREE.Box3().setFromObject(this.masterplanModel);
      const bounds=new THREE.Box3();
      for(const x of [worldBounds.min.x,worldBounds.max.x])for(const y of [worldBounds.min.y,worldBounds.max.y])for(const z of [worldBounds.min.z,worldBounds.max.z])bounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(stageInverse));
      const size=bounds.getSize(new THREE.Vector3());
      const width=Math.max(1,size.x),height=Math.max(1,size.y),short=Math.min(width,height);
      const centerX=(bounds.min.x+bounds.max.x)/2,centerY=(bounds.min.y+bounds.max.y)/2;
      const groundZ=Math.max(Number(this.mapSurface?.position.z)||0,bounds.min.z)+.025;
      const context=new THREE.Group();
      context.name='AliançaPark_GPSContextEnvironment';
      context.renderOrder=-2;
      context.userData={
        source:'DWG GPS control points + satellite image aligned to map surface',
        gpsCenter:this.dwgGeo?.controlPoints?.find(point=>point.id==='site-center')||null,
        imageSource:'satellite tile mosaic · Esri World Imagery · DWG GPS centre',
        composition:'extruded terrain, vegetation clearings and low-poly context structures',
        coordinateSpace:'sceneStage local'
      };
      const colors={green:[0x274b32,0x315c3a,0x3b6943],structure:[0x807b70,0x989183,0x5e625d],roof:[0x3c4843,0x4e5449]};
      const material=(color,roughness=.98)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0,side:THREE.DoubleSide});
      const pick=(list,index)=>list[Math.abs(index)%list.length];
      const addExtrudedPatch=(points,depth,color,name)=>{
        const shape=new THREE.Shape();
        points.forEach((point,index)=>index?shape.lineTo(point[0],point[1]):shape.moveTo(point[0],point[1]));
        shape.closePath();
        const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.08,bevelThickness:.035,bevelSegments:1}),material(color));
        mesh.position.z=groundZ-.08;mesh.name=name;mesh.renderOrder=-1;mesh.raycast=()=>{};mesh.castShadow=true;mesh.receiveShadow=true;
        mesh.userData={publicContext:true,kind:'extruded-terrain',source:'DWG-aligned footprint + satellite frame'};
        context.add(mesh);return mesh;
      };
      // O anel possui espessura real e um vazio central para preservar a
      // implantação do GLB e os lotes selecionáveis.
      const outerX=width*.72,outerY=height*.72,innerX=width*.56,innerY=height*.56;
      const ringShape=new THREE.Shape();
      ringShape.moveTo(-outerX,-outerY);ringShape.lineTo(outerX,-outerY);ringShape.lineTo(outerX,outerY);ringShape.lineTo(-outerX,outerY);ringShape.closePath();
      const hole=new THREE.Path();
      hole.moveTo(-innerX,-innerY);hole.lineTo(-innerX,innerY);hole.lineTo(innerX,innerY);hole.lineTo(innerX,-innerY);hole.closePath();
      ringShape.holes.push(hole);
      const ring=new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape,{depth:.34,bevelEnabled:true,bevelSize:.14,bevelThickness:.08,bevelSegments:2}),material(0x344a3b));
      ring.position.set(centerX,centerY,groundZ-.11);ring.name='AliançaPark_GPS_ExtrudedTerrainRing';ring.renderOrder=-2;ring.raycast=()=>{};ring.castShadow=true;ring.receiveShadow=true;ring.userData={publicContext:true,kind:'terrain-ring',gpsAligned:true};context.add(ring);
      const clearings=[[-.66,-.52,.22,.16],[-.34,.62,.28,.13],[.42,.57,.24,.19],[.65,-.29,.18,.28],[-.69,.24,.16,.29],[.18,-.7,.34,.12]];
      clearings.forEach(([px,py,sx,sy],index)=>{
        const cx=centerX+px*width,cy=centerY+py*height;
        const points=[];for(let corner=0;corner<8;corner++){const angle=corner/8*Math.PI*2;const wobble=1+Math.sin(index*2.1+corner*1.7)*.13;points.push([cx+Math.cos(angle)*width*sx*wobble,cy+Math.sin(angle)*height*sy*wobble]);}
        addExtrudedPatch(points,.20,pick(colors.green,index),'AliançaPark_GPS_GreenArea_'+String(index+1).padStart(2,'0'));
      });
      // Não invente construções em um anel fixo ao redor do AABB. Os volumes
      // soltos e os pads claros são derivados do raster de satélite depois que
      // o mosaico termina, evitando estruturas flutuando em posições erradas.
      const structures=[];
      this.sceneStage.add(context);
      this.publicGpsContextEnvironment=context;
      this.dataset.publicGpsEnvironment='DWG-aligned satellite image + extruded context';
      this.dataset.publicGpsCenter=this.dwgGeo?.controlPoints?.find(point=>point.id==='site-center')?.id||'site-center';
      this.dataset.publicContextTerrain='extruded perimeter ring + 6 green clearings';
      this.dataset.publicContextStructures=String(structures.length);
      this.dataset.publicContextCoordinateSpace='sceneStage local · DWG aligned';
      this.dataset.publicContextImage='satellite tile mosaic centred by DWG GPS control point';
      if(this.dataset.mapTexture==='ready'&&this.mapSurfaceTexture?.image)this.scanPublicSatelliteContextV1(this.mapSurfaceTexture);
      this.dataset.publicEnvironment='ready';
      this.renderer?.render(this.scene,this.camera);
    }catch(error){
      this._publicGpsContextEnvironmentV2=false;
      this.dataset.publicGpsEnvironment='fallback';
      this.dataset.publicEnvironment='ready';
      console.warn('[Aliança Park public] contexto 3D do entorno indisponível.',error);
    }
  }
  schedulePublicEnvironmentLoadingV1(){
    if(!this.isPublicMapVisual()||this._publicEnvironmentScheduled)return;
    this._publicEnvironmentScheduled=true;
    this.dataset.publicEnvironment='queued-after-first-open';
    const run=()=>{
      if(!this.isConnected||!this.masterplanModel){this._publicEnvironmentScheduled=false;return;}
      this._publicEnvironmentAllowed=true;
      this.dataset.publicEnvironment='loading';
      this.ensurePublicTerrainRelief();
      this.loadPublicTerrainTextureV1();
      this.buildPublicGpsContextEnvironmentV2();
      // A vegetação do entorno precisa ler a imagem aérea final. Aguarda o
      // upload do mosaico satélite para que a máscara não seja derivada do
      // fallback local de grama.
      this.queuePublicVegetationAfterSatelliteV1();
    };
    setTimeout(()=>{
      if('requestIdleCallback' in window)window.requestIdleCallback(run,{timeout:2200});
      else run();
    },900);
  }
  queuePublicVegetationAfterSatelliteV1(attempt=0){
    if(!this.isPublicMapVisual()||this.publicVegetationGroup||this._publicVegetationLoading)return;
    if(this._publicVegetationQueueTimer)return;
    const satelliteReady=this.dataset.mapTexture==='ready'&&this.mapSurfaceTexture?.image;
    const satelliteFinished=['partial','fallback-color'].includes(String(this.dataset.mapTexture||''));
    if(satelliteReady||satelliteFinished||attempt>=36){
      this._publicVegetationQueueTimer=null;
      this.addPublicVegetation();
      return;
    }
    this._publicVegetationQueueTimer=setTimeout(()=>{
      this._publicVegetationQueueTimer=null;
      this.queuePublicVegetationAfterSatelliteV1(attempt+1);
    },350);
  }
  addPublicVegetation(){
    if(!this.isPublicMapVisual()||this._publicVegetationLoading||this.publicVegetationGroup||!this.THREE||!this.GLTFLoader||!this.masterplanModel)return;
    this._publicVegetationLoading=true;
    this.dataset.publicEnvironment='loading';
    const THREE=this.THREE,loader=new this.GLTFLoader();
    loader.load(runtimeRouteV1('/assets/model/vegetation/tree-cc0.glb'),gltf=>{
      try{
        this.ensurePublicTerrainRelief();
        const template=gltf.scene;
        template.rotation.x=Math.PI/2;
        template.updateMatrixWorld(true);
        this.sceneStage.updateMatrixWorld(true);
        this.masterplanModel.updateMatrixWorld(true);
        // Box3 retorna coordenadas de mundo. Como a vegetação é filha do
        // mesmo sceneStage do GLB, todas as posições precisam voltar para o
        // espaço local do stage; usar o mundo diretamente deslocava as
        // árvores para fora do loteamento depois do enquadramento.
        const stageInverse=new THREE.Matrix4().copy(this.sceneStage.matrixWorld).invert();
        const toStageBox=worldBox=>{
          const local=new THREE.Box3();
          for(const x of [worldBox.min.x,worldBox.max.x])for(const y of [worldBox.min.y,worldBox.max.y])for(const z of [worldBox.min.z,worldBox.max.z])local.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(stageInverse));
          return local;
        };
        const worldBounds=new THREE.Box3().setFromObject(this.masterplanModel);
        const bounds=toStageBox(worldBounds);
        const width=Math.max(1,bounds.max.x-bounds.min.x),height=Math.max(1,bounds.max.y-bounds.min.y);
        const groundZ=Math.max(Number(this.mapSurface?.position.z)||0,bounds.min.z)+.06;
        const blockerBoxes=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[])].map(node=>toStageBox(new THREE.Box3().setFromObject(node)));
        const isBlocked=(x,y,margin=Math.max(.55,Math.min(width,height)*.008))=>blockerBoxes.some(box=>x>=box.min.x-margin&&x<=box.max.x+margin&&y>=box.min.y-margin&&y<=box.max.y+margin);
        const templateBounds=new THREE.Box3().setFromObject(template),templateHeight=Math.max(.001,templateBounds.max.z-templateBounds.min.z);
        const prepareTree=(x,y,baseZ,targetHeight,index)=>{
          const tree=template.clone(true);
          tree.position.set(x,y,0);
          tree.rotation.z=(index*2.3999632297)%(Math.PI*2);
          tree.scale.setScalar(Math.max(.01,targetHeight/templateHeight));
          tree.updateMatrixWorld(true);
          const treeBounds=new THREE.Box3().setFromObject(tree);
          tree.position.z+=baseZ-treeBounds.min.z+.015;
          tree.traverse(node=>{
            node.visible=true;
            if(!node.isMesh)return;
            node.castShadow=true;node.receiveShadow=true;node.frustumCulled=true;node.renderOrder=6;
            const material=node.material;
            if(material?.transparent){material.alphaTest=Math.max(material.alphaTest||0,.22);material.depthWrite=true;}
          });
          return tree;
        };
        const treeHeight=Math.max(2.4,Math.min(5.4,Math.min(width,height)*.045));
        // Guarda o construtor no mapa para que uma nova textura satélite possa
        // substituir a máscara provisória sem duplicar árvores nem reabrir o
        // GLB do loteamento.
        this._publicTreeBuilder=prepareTree;
        this._publicTreeContext={bounds,width,height,groundZ,isBlocked,treeHeight};
        // Primeiro tenta áreas verdes nomeadas ou com material verde no GLB.
        // A leitura não depende apenas de modelLandscapeNodes, pois muitos
        // GLBs guardam praças e taludes como meshes "other".
        const areaCandidates=[];
        const seenAreas=new Set();
        const greenName=/verde|green|parque|praca|praça|lazer|paisag|talude|area.?externa|area.?verde/;
        this.masterplanModel.traverse(node=>{
          if(!node?.geometry||seenAreas.has(node))return;
          seenAreas.add(node);
          const name=String(node.name||'').toLowerCase();
          const role=String(node.userData?.belavistaRole||node.userData?.partKind||'').toLowerCase();
          if(role==='lots'||role==='lot'||role==='streets'||role==='street'||/rua|street|road|asfalto|paviment|meio.?fio|guia|lote|tree|arvore|tronco|copa|folhagem|folha/.test(name))return;
          const material=Array.isArray(node.material)?node.material[0]:node.material;
          const color=material?.color;
          const greenMaterial=Boolean(color&&color.g>color.r*1.08&&color.g>color.b*1.03);
          if(!greenName.test(name)&&!greenMaterial)return;
          const areaBox=toStageBox(new THREE.Box3().setFromObject(node)),areaSize=areaBox.getSize(new THREE.Vector3());
          const area=areaSize.x*areaSize.y;
          if(area<12||areaSize.x<2||areaSize.y<2)return;
          areaCandidates.push({node,box:areaBox,size:areaSize,area,role});
        });
        areaCandidates.sort((a,b)=>b.area-a.area);
        const greenAreas=areaCandidates.slice(0,18);
        const group=new THREE.Group(); group.name='BelavistaPublicVegetation'; group.renderOrder=6;
        const terrainGroup=new THREE.Group(); terrainGroup.name='BelavistaPublicTerrainVegetation'; terrainGroup.renderOrder=6;
        const forestGroup=new THREE.Group(); forestGroup.name='BelavistaPublicSurroundingForest'; forestGroup.renderOrder=6;
        const relief=new THREE.Group(); relief.name='BelavistaPublicGreenRelief'; relief.renderOrder=5;
        const reliefMaterial=new THREE.MeshStandardMaterial({color:0x2c6135,roughness:.98,metalness:0,transparent:true,opacity:.94});
        const centerX=(bounds.min.x+bounds.max.x)/2,centerY=(bounds.min.y+bounds.max.y)/2;
        const placements=[];
        greenAreas.forEach((area,index)=>{
          const {box,size}=area;
          const cx=(box.min.x+box.max.x)/2,cy=(box.min.y+box.max.y)/2;
          if(!isBlocked(cx,cy,Math.max(.25,Math.min(size.x,size.y)*.12)))placements.push({cx,cy,baseZ:groundZ,size,index});
        });
        placements.forEach(({cx,cy,baseZ,size,index})=>{
          const shape=new THREE.Shape();
          const radius=Math.max(1.4,Math.min(size.x*.48,size.y*.38));
          for(let point=0;point<9;point++){
            const angle=point/8*Math.PI*2;
            const wobble=1+Math.sin(point*2.17+index)*.16;
            const px=Math.cos(angle)*radius*wobble,py=Math.sin(angle)*radius*.66*wobble;
            if(point===0)shape.moveTo(px,py);else shape.lineTo(px,py);
          }
          const mound=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.16+(index%3)*.06,bevelEnabled:true,bevelSize:.10,bevelThickness:.06,bevelSegments:1}),reliefMaterial);
          mound.position.set(cx,cy,baseZ);mound.renderOrder=5;mound.raycast=()=>{};relief.add(mound);
          group.add(prepareTree(cx,cy,baseZ+.20+(index%3)*.05,treeHeight*(.72+(index%4)*.06),index));
        });
        // A área social recebe uma cobertura de grama 3D leve. Os tufos são
        // instanciados sobre as caixas das praças verdes do próprio modelo,
        // com variação determinística de rotação, altura e tom; os bloqueios
        // do DWG impedem que a vegetação atravesse lotes, ruas ou estruturas.
        const socialGrassGroup=new THREE.Group();
        socialGrassGroup.name='BelavistaPublicSocialGrass3D';
        socialGrassGroup.renderOrder=7;
        const socialNames=/lazer|parque|praca|praça|quadra|play|social|paisag/;
        const socialAreas=greenAreas.filter(area=>this.modelLeisureNodes?.includes(area.node)||socialNames.test(String(area.node?.name||'').toLowerCase()));
        const grassAreas=socialAreas.length?socialAreas:greenAreas.slice(0,4);
        const grassPalette=[0x245f31,0x327c3d,0x459548,0x1f522b];
        // As lâminas são construídas diretamente no eixo Z, que é o eixo
        // vertical do loteamento, para manter os tufos em pé em qualquer
        // orientação da câmera.
        const grassGeometry=new THREE.BufferGeometry();
        grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
          -.075,0,0, .075,0,0, -.075,0,.45, .075,0,.45,
          0,-.075,0, 0,.075,0, 0,-.075,.45, 0,.075,.45
        ],3));
        grassGeometry.setIndex([0,2,1,2,3,1,4,5,6,6,5,7]);
        grassGeometry.computeVertexNormals();
        const maxGrass=Math.min(960,Math.max(72,grassAreas.reduce((total,area)=>total+Math.floor(area.area/1.8),0)));
        const grassInstances=grassPalette.map(color=>{
          const mesh=new THREE.InstancedMesh(grassGeometry,new THREE.MeshStandardMaterial({color,roughness:.96,metalness:0,side:THREE.DoubleSide}),maxGrass);
          mesh.name='GrassTufts';mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=true;mesh.count=0;mesh.userData={publicContext:true,kind:'social-grass-3d',source:'social green floor geometry'};
          socialGrassGroup.add(mesh);return mesh;
        });
        const grassDummy=new THREE.Object3D();
        let grassCount=0,grassSeed=0x2f6e4a;
        const grassRandom=()=>{grassSeed=(grassSeed+0x6d2b79f5)|0;let t=grassSeed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
        grassAreas.forEach((area,areaIndex)=>{
          const {box,size}=area,margin=Math.max(.35,Math.min(size.x,size.y)*.12);
          const count=Math.min(280,Math.max(18,Math.floor(area.area/2.15)));
          const grassBaseZ=Math.max(groundZ,box.max.z)+.06;
          const isSocialArea=this.modelLeisureNodes?.includes(area.node)||socialNames.test(String(area.node?.name||'').toLowerCase());
          for(let index=0;index<count&&grassCount<maxGrass;index++){
            const x=box.min.x+margin+grassRandom()*Math.max(.1,size.x-margin*2);
            const y=box.min.y+margin+grassRandom()*Math.max(.1,size.y-margin*2);
            if(isBlocked(x,y,.26)&&!isSocialArea)continue;
            const height=.32+grassRandom()*.24,scale=.72+grassRandom()*.42;
            grassDummy.position.set(x,y,grassBaseZ+.008);
            grassDummy.rotation.set(0,0,grassRandom()*Math.PI*2);
            grassDummy.scale.set(scale,scale,Math.max(.78,height/.45));
            grassDummy.updateMatrix();
            const instance=grassInstances[(areaIndex+index)%grassInstances.length];
            instance.setMatrixAt(instance.count,grassDummy.matrix);
            instance.count++;grassCount++;
          }
        });
        grassInstances.forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();});
        this.sceneStage.add(socialGrassGroup);
        this.publicSocialGrassGroup=socialGrassGroup;
        this.dataset.publicSocialGrass3D='crossed upright instanced grass blades over lifted social green floors v553';
        this.dataset.publicSocialGrassLift='.028 stage units above satellite relief';
        this.dataset.publicSocialGrassAreas=String(grassAreas.length);
        this.dataset.publicSocialGrassCount=String(grassCount);
        // Vegetação existente: usa os centros das árvores do arquivo como
        // pontos de referência, mas troca a geometria antiga pelo asset CC0.
        const existingTreePoints=[];
        for(const node of this.modelLandscapeNodes||[]){
          const name=String(node?.name||'').toLowerCase();
          if(!node?.geometry||!/arvore|tree|tronco|copa|folhagem/.test(name))continue;
          const box=toStageBox(new THREE.Box3().setFromObject(node)),center=box.getCenter(new THREE.Vector3());
          if(!isBlocked(center.x,center.y,.35))existingTreePoints.push([center.x,center.y]);
        }
        existingTreePoints.slice(0,36).forEach(([x,y],index)=>group.add(prepareTree(x,y,groundZ,treeHeight*(.62+(index%3)*.05),index+31)));
        // A imagem de fundo também é lida como uma máscara de cobertura
        // vegetal. Os pontos são convertidos da textura para o plano local
        // do DWG e só sobrevivem fora da implantação e fora das caixas de
        // lotes/ruas.
        const sampledTerrainPoints=[];
        const surface=this.mapSurface;
        for(const sample of this.publicVegetationSamples||[]){
          const {x,y}=this.publicSatelliteSamplePointV1(sample,width,height);
          const outside=Math.abs((x-centerX)/width)>.58||Math.abs((y-centerY)/height)>.58;
          if(outside&&!isBlocked(x,y,.2))sampledTerrainPoints.push([x,y,sample.score,Number(sample.u)||0,Number(sample.v)||0]);
          if(sampledTerrainPoints.length>=120)break;
        }
        sampledTerrainPoints.forEach(([x,y,score,u,v],index)=>{
          const tree=prepareTree(x,y,groundZ,treeHeight*(.60+(index%4)*.04),index+401);
          tree.userData={...(tree.userData||{}),source:'satellite-vegetation-candidate',coordinateSource:'DWG-aligned satellite image',satelliteUv:[u,v],canopyScore:Number(score)||0};
          terrainGroup.add(tree);
        });
        // O entorno é uma faixa irregular baseada no footprint real do GLB,
        // não uma fileira reta. Isso cria relevo visual nas áreas verdes ao
        // redor sem plantar árvores sobre lotes ou eixos de rua.
        const perimeter=[];
        for(let index=0;index<96;index++){
          const angle=index*2.3999632297;
          const ring=1.08+(index%7)*.045;
          const x=centerX+Math.cos(angle)*width*.53*ring;
          const y=centerY+Math.sin(angle)*height*.53*ring;
          if(!isBlocked(x,y,.2))perimeter.push([x,y]);
        }
        perimeter.forEach(([x,y],index)=>terrainGroup.add(prepareTree(x,y,groundZ,treeHeight*(.68+(index%5)*.045),index+101)));
        // Faixas de floresta ao redor do empreendimento. O anel é elíptico e
        // recebe um pequeno ruído determinístico para parecer cobertura
        // vegetal natural, mantendo cada árvore fora das caixas de lotes e
        // ruas. A posição é derivada do footprint já alinhado ao DWG e a
        // textura aérea continua sendo usada como amostra complementar.
        const forestPoints=[];
        const forestSeed=()=>{let value=0x9e3779b9;return()=>{value=(value+0x6d2b79f5)|0;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};};
        const randomForest=forestSeed();
        for(let index=0;index<144;index++){
          const side=index%4,along=(index/144+.025+randomForest()*.92)%1;
          const jitter=(randomForest()-.5)*Math.min(width,height)*.08;
          const offset=Math.min(width,height)*(.075+randomForest()*.12);
          let x=centerX,y=centerY;
          if(side===0){x=bounds.min.x-offset;y=bounds.min.y+along*height+jitter;}
          if(side===1){x=bounds.max.x+offset;y=bounds.min.y+along*height+jitter;}
          if(side===2){x=bounds.min.x+along*width+jitter;y=bounds.min.y-offset;}
          if(side===3){x=bounds.min.x+along*width+jitter;y=bounds.max.y+offset;}
          // Estes quatro corredores são gerados fora do AABB do footprint;
          // não dependem de caixas internas potencialmente superdimensionadas
          // pelo GLB e, portanto, não podem invadir lotes ou ruas.
          forestPoints.push([x,y]);
        }
        forestPoints.forEach(([x,y],index)=>{
          const undulation=Math.sin(index*1.73)*.07+Math.cos(index*.83)*.045;
          forestGroup.add(prepareTree(x,y,groundZ+undulation,treeHeight*(.62+(index%9)*.055),index+801));
        });
        this.sceneStage.add(relief);this.sceneStage.add(group);this.sceneStage.add(terrainGroup);this.sceneStage.add(forestGroup); this.publicVegetationGroup=group;this.publicTerrainVegetationGroup=terrainGroup;this.publicForestGroup=forestGroup;this.publicGreenReliefGroup=relief;
        this.dataset.publicVegetation='cc0-tree-glb'; this.dataset.publicTreeCount=String(placements.length);
        this.dataset.publicTerrainTreeCount=String(terrainGroup.children.length);
        this.dataset.publicForestTreeCount=String(forestGroup.children.length);
        this.dataset.publicForestPlacement='perimeter forest bands · DWG footprint + satellite vegetation mask';
        this.dataset.publicTerrainSampleTreeCount=String(sampledTerrainPoints.length);
        this.dataset.publicSatelliteTreeCount=String(terrainGroup.children.filter(tree=>tree.userData?.source==='satellite-vegetation-candidate').length);
        this.dataset.publicSatelliteTreeScan='green-canopy + local-contrast raster scan · DWG-aligned surface';
        this.dataset.publicSatelliteTreeCandidates=String(this.publicVegetationSamples?.length||0);
        this.dataset.publicSatelliteTreePlacement='satellite canopy samples · same DWG-aligned map surface transform';
        this.dataset.publicSatelliteTreeSampleSpace='texture UV → mapSurface position/scale/rotation → sceneStage local';
        this.dataset.publicTerrainTreeSource='assets/model/vegetation/tree-cc0.glb';
        this.dataset.publicVegetationDetection='meshes verdes + árvores do GLB/DWG + malha irregular do entorno';
        this.dataset.publicSocialGrassDetection='tufos 3D instanciados sobre o piso verde das áreas sociais';
        this.dataset.publicExistingTreeCount=String(existingTreePoints.length);
        this.dataset.publicTreeCount=String(group.children.length+terrainGroup.children.length+forestGroup.children.length);
        this.dataset.publicVegetationPlacement=greenAreas.length?'GLB/DWG green areas + existing tree points + terrain perimeter + surrounding forest':'existing tree points + terrain perimeter + surrounding forest · no street rows';
        this.dataset.publicGreenRelief=String(relief.children.length);
        this.dataset.publicTerrainGroundZ=groundZ.toFixed(3);
        this.dataset.publicVegetationCoordinateSpace='sceneStage local · derived from world bounds · DWG-aligned';
        this.dataset.publicEnvironment='ready';
        this.renderer?.render(this.scene,this.camera);
      }catch(error){this.dataset.publicEnvironment='fallback';console.warn('[Aliança Park public] vegetação 3D indisponível.',error);}
      finally{this._publicVegetationLoading=false;}
    },undefined,error=>{this._publicVegetationLoading=false;this.dataset.publicEnvironment='fallback';console.warn('[Aliança Park public] árvore 3D indisponível.',error);});
  }
  persist3dBootPhaseV5367(phase,extra={}){
    const state=globalThis.__BELAVISTA_ADMIN_MODEL_STATE__??={
      version:'5.3.67',
      startedAt:performance.now()
    };
    state.version='5.3.67';
    state.phase=phase;
    Object.assign(state,extra);
    globalThis.__BELAVISTA_ADMIN_MODEL_STATE__=state;
    this.dataset.modelBootPhase=phase;
    this.dataset.modelBootVersion='5.3.67';
    try{
      localStorage.setItem(
        'belavista.3d.boot.last.v5367',
        JSON.stringify({
          version:'5.3.67',
          phase,
          wallClock:new Date().toISOString(),
          ...extra
        })
      );
    }catch{}
    return state;
  }

  loadMasterplan(THREE,GLTFLoader){
    if(this._modelLoadStarted)return;
    this._modelLoadStarted=true;

    const perf=globalThis.__BELAVISTA_ADMIN_MODEL_STATE__={
      version:'5.3.67',
      phase:'network',
      startedAt:performance.now(),
      progress:0,
      meshCount:0,
      processedMeshes:0,
      operationalGeometry:'deferred'
    };

    const mark=(phase,extra={})=>{
      perf.phase=phase;
      Object.assign(perf,extra);
      this.dataset.modelBootPhase=phase;
      this.dataset.modelBootVersion='5.3.67'; this.persist3dBootPhaseV5367(phase,extra);
    };

    const loader=new GLTFLoader();
    const modelUrl=runtimeRouteV1('/assets/model/alianca_park_masterplan_preview.glb','v=gpu-staged-5367');
    this.dataset.modelSource='loaded-glb';
    this.dataset.modelRender='webgl-live-glb';
    this.dataset.modelRasterized='false';

    loader.load(modelUrl,gltf=>{
      try{
        mark('parsed',{parsedAt:performance.now(),downloadAndParseMs:Math.round(performance.now()-perf.startedAt)});

        const sourceModel=gltf.scene;
        const sourceBox=new THREE.Box3().setFromObject(sourceModel);
        const size=sourceBox.getSize(new THREE.Vector3());
        const sourceCenter=sourceBox.getCenter(new THREE.Vector3());

        sourceModel.position.set(-sourceCenter.x,-sourceBox.min.y,-sourceCenter.z);

        const model=new THREE.Group();
        model.name='MasterplanFrame';
        model.add(sourceModel);

        const largest=Math.max(size.x,size.y,size.z)||1;
        const factor=145/largest;

        model.scale.set(factor,factor*MODEL_VERTICAL_EXAGGERATION,factor);
        model.rotation.set(Math.PI/2,0,0);
        model.updateMatrixWorld(true);

        const rawOrientedBox=new THREE.Box3().setFromObject(model);
        const baseLift=Math.max(0,-rawOrientedBox.min.z)+SCENE_MODEL_BASE_Z;
        model.position.z+=baseLift;
        model.updateMatrixWorld(true);

        const orientedBox=new THREE.Box3().setFromObject(model);
        const groundedCenter=orientedBox.getCenter(new THREE.Vector3());
        const orientedSize=orientedBox.getSize(new THREE.Vector3());

        model.userData.baseScale=factor;
        model.userData.verticalExaggeration=MODEL_VERTICAL_EXAGGERATION;
        model.userData.sourceSize=size;
        model.userData.alignedToMapPlane=true;
        model.userData.mapBaseZ=SCENE_MODEL_BASE_Z;
        model.userData.mapBaseLift=baseLift;
        model.userData.sourceBoundsCenter=sourceCenter.clone();
        model.userData.centeredBoundsCenter=groundedCenter.clone();
        model.userData.canonicalReference='PDF-derived GLB checked against DWG lot geometry';

        this.modelSourceFootprint={x:orientedSize.x,y:orientedSize.y,scale:factor};
        this.masterplanModel=model;
        this._solarShadowBounds=orientedBox.clone();
        this.configureSolarShadows(this._solarShadowBounds);
        this.masterplanLargest=largest;
        this.dataset.modelHeight=`${MODEL_VERTICAL_EXAGGERATION.toFixed(2)}x vertical · base no plano do mapa`;
        this.dataset.modelBaseZ=String(SCENE_MODEL_BASE_Z);
        this.dataset.modelBaseLift=baseLift.toFixed(3);
        this.dataset.modelLocalOrigin=`centered GLB frame · ${groundedCenter.x.toFixed(3)},${groundedCenter.y.toFixed(3)},${groundedCenter.z.toFixed(3)}`;
        this.dataset.modelAxis='source Y → world +Z · footprint Y corrigido';

        // v5.3.67: nenhum mesh toca a GPU em massa.
        const meshes=[];
        let triangleEstimate=0;
        model.traverse(node=>{
          if(!node.isMesh)return;
          const geometry=node.geometry;
          const triangles=geometry?.index
            ? Math.floor((geometry.index.count||0)/3)
            : Math.floor((geometry?.getAttribute?.('position')?.count||0)/3);
          node.userData.__v5367Triangles=Number(triangles)||0;
          node.castShadow=true;
          node.receiveShadow=true;
          triangleEstimate+=node.userData.__v5367Triangles;
          node.visible=false;
          node.frustumCulled=true;
          meshes.push(node);
        });

        meshes.sort(
          (a,b)=>
            (a.userData.__v5367Triangles||0)-
            (b.userData.__v5367Triangles||0)
        );

        perf.meshCount=meshes.length;
        perf.triangleEstimate=triangleEstimate;
        this.dataset.modelMeshCount=String(meshes.length);
        this.dataset.modelTriangleEstimate=String(triangleEstimate);

        this.modelGroup.add(model);
        this.modelGroup.visible=true;

        this.modelReady=false;
        this._modelGpuReady=false;
        this.dataset.modelReady='false';
        this.dataset.modelGpuReady='false';
        this.dataset.modelRender='webgl-staging';
        this.dataset.modelParts='staging GPU';
        this.classList.remove('model-ready');

        mark('gpu-staging',{
          meshCount:meshes.length,
          triangleEstimate
        });

        // Primeiro render = cena sem nenhum mesh do GLB visível.
        this.renderer?.render(this.scene,this.camera);

        this.stageMasterplanGpuV5367(THREE,model,meshes,perf,mark)
          .catch(error=>{
            mark('gpu-stage-error',{error:String(error?.message||error)});
            this.dataset.modelError='gpu-stage-failed';
            console.error('[Aliança Park 3D v5.3.67] staging GPU falhou.',error);
          });
      }catch(error){
        mark('processing-error',{error:String(error?.message||error)});
        this.dataset.modelError='processamento-falhou';
        this.dataset.modelRender='fallback';
        console.warn('Modelo GLB carregado mas não pôde ser processado.',error);
      }
    },progress=>{
      if(progress.total){
        const percent=Math.round(progress.loaded/progress.total*100);
        this.dataset.modelProgress=percent;
        perf.progress=percent;
      }
    },err=>{
      mark('network-error',{error:String(err?.message||err)});
      this.dataset.modelError='arquivo-indisponivel';
      this.dataset.modelRender='fallback';
      console.warn('Modelo GLB indisponível, mantendo mapa 2D.',err);
    });
  }

  async stageMasterplanGpuV5367(THREE,model,meshes,perf,mark){
    if(this._modelGpuStagePromiseV5367)return this._modelGpuStagePromiseV5367;

    const nextFrame=()=>new Promise(resolve=>
      requestAnimationFrame(()=>resolve())
    );

    const run=async()=>{
      const total=meshes.length;

      for(let index=0;index<total;index++){
        const node=meshes[index];
        const triangles=Number(node.userData.__v5367Triangles)||0;

        mark('gpu-mesh',{
          meshIndex:index,
          meshNumber:index+1,
          meshCount:total,
          meshName:String(node.name||'mesh').slice(0,120),
          meshTriangles:triangles
        });

        node.visible=true;

        const started=performance.now();
        this.renderer?.render(this.scene,this.camera);
        const renderMs=performance.now()-started;

        perf.stagedMeshes=index+1;
        this.dataset.modelProcessedMeshes=`${index+1}/${total}`;
        this.dataset.modelLastGpuRenderMs=renderMs.toFixed(1);

        mark('gpu-mesh-visible',{
          meshIndex:index,
          meshNumber:index+1,
          meshCount:total,
          meshName:String(node.name||'mesh').slice(0,120),
          meshTriangles:triangles,
          renderMs:Number(renderMs.toFixed(1)),
          stagedMeshes:index+1
        });

        await nextFrame();
      }

      this.modelReady=true;
      this._modelGpuReady=false;
      this.dataset.modelReady='true';
      this.dataset.modelGpuReady='false';
      this.dataset.modelRender='webgl-live-glb';
      this.classList.add('model-ready');

      mark('gpu-visible',{
        meshCount:total,
        stagedMeshes:total
      });

      await nextFrame();

      return this.enrichMasterplanProgressively(
        THREE,
        model,
        meshes,
        perf
      );
    };

    this._modelGpuStagePromiseV5367=run().finally(()=>{
      this._modelGpuStagePromiseV5367=null;
    });

    return this._modelGpuStagePromiseV5367;
  }

  async enrichMasterplanProgressively(THREE,model,meshes,perf){
    if(this._modelEnrichmentPromise)return this._modelEnrichmentPromise;

    const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    const run=async()=>{
      const lots=[],streets=[],other=[];
      const leisureNodes=[],landscapeNodes=[],structureNodes=[];
      const chunkSize=18;

      this.dataset.modelEnrichment='classifying';
      perf.phase='classifying';

      for(let cursor=0;cursor<meshes.length;cursor+=chunkSize){
        const end=Math.min(meshes.length,cursor+chunkSize);

        for(let index=cursor;index<end;index++){
          const node=meshes[index];
          node.frustumCulled=true;
          node.renderOrder=8;

          const prepare=mat=>{
            if(!mat)return mat;
            const clone=mat.clone();
            clone.opacity=Math.max(.86,Math.min(1,clone.opacity??1));
            clone.transparent=clone.opacity<.98;
            clone.side=THREE.DoubleSide;
            clone.depthWrite=true;
            return clone;
          };

          node.material=Array.isArray(node.material)?node.material.map(prepare):prepare(node.material);
          node.userData.defaultMaterial=node.material;

          const name=String(node.name||'').toLowerCase();
          const role=String(node.userData?.belavistaRole||'').toLowerCase();
          const isSocial=role==='leisure'||/area.?de.?lazer|court|gym.?pad|gym.?post|gym.?beam|gym.?seat|pavilhao|play|praca|banco.?praca/.test(name);

          if(/pavilhao.?telhado|pavilhao.?base/.test(name)){
            node.userData.focusStructure=true;
            node.renderOrder=18;
            structureNodes.push(node);
          }

          const kind=
            role==='lot'||role==='lots'?'lots':
            role==='street'||role==='streets'||role==='road'?'streets':
            isSocial?'other':
            /(lote|quadra|gleba)/.test(name)?'lots':
            /(asfalto|rua|road|street|meio.?fio|guia|paviment)/.test(name)?'streets':'other';

          if(kind==='streets'){
            const pave=mat=>this.makeSiteSurfaceMaterial(THREE,mat,this.isPublicMapVisual()?'asphalt':'cobble');
            node.material=Array.isArray(node.material)?node.material.map(pave):pave(node.material);
            node.userData.defaultMaterial=node.material;
          }else if(kind==='lots'){
            const grass=mat=>this.makeSiteSurfaceMaterial(THREE,mat,'grass');
            node.material=Array.isArray(node.material)?node.material.map(grass):grass(node.material);
            node.userData.defaultMaterial=node.material;
            const earth=mat=>this.makeSiteSurfaceMaterial(THREE,mat,'earth');
            node.userData.earthworkMaterial=Array.isArray(node.material)?node.material.map(earth):earth(node.material);
          }

          if(isSocial){
            const social=mat=>this.makeSocialAreaMaterial(THREE,mat,name);
            node.material=Array.isArray(node.material)?node.material.map(social):social(node.material);
            node.userData.defaultMaterial=node.material;
            node.userData.belavistaSocialSurface=true;
            const socialMaterials=Array.isArray(node.material)?node.material:[node.material];
            const isGreenSocialSurface=socialMaterials.some(mat=>mat?.userData?.belavistaSocialSurface==='grass');
            if(isGreenSocialSurface&&!node.userData.publicGrassSurfaceLiftApplied){
              // Levanta somente o piso verde social; estruturas, quadras e
              // ruas continuam nas cotas originais do modelo do loteamento.
              node.position.z+=.028;
              node.userData.publicGrassSurfaceLiftApplied=true;
              node.userData.publicGrassSurfaceLift=.028;
            }
            node.castShadow=true;
            node.receiveShadow=true;
          }

          node.userData.partKind=kind;
          node.userData.partId=kind==='lots'
            ? node.name
            : kind==='streets'
              ? `street-source-${streets.length+1}`
              : (node.name||`other-${other.length+1}`);
          node.userData.partLabel=kind==='lots'
            ? `Lote ${node.name.replace(/^.*?lote[_ -]?/i,'').replace(/[_ -]?mesh.*$/i,'')}`
            : kind==='streets'
              ? `Paralelepípedo · trecho original ${streets.length+1}`
              : node.name||'Elemento do empreendimento';

          if(kind==='lots')lots.push(node);
          else if(kind==='streets')streets.push(node);
          else other.push(node);

          if(role==='landscape'||/arvore|tree|tronco|copa|folhagem|outer.?east.?row|upper.?median.?row/.test(name))landscapeNodes.push(node);
          if(isSocial)leisureNodes.push(node);
        }

        perf.processedMeshes=end;
        this.dataset.modelProcessedMeshes=`${end}/${meshes.length}`;
        this.renderer?.render(this.scene,this.camera);
        await nextFrame();
      }

      this.modelParts={lots,streets,other};
      this._streetSourceCandidates=streets.slice();
      this.modelLandscapeNodes=landscapeNodes;
      this.modelLeisureNodes=leisureNodes;
      this.modelLeisureFocusNodes=structureNodes.length?structureNodes:leisureNodes;

      this.dataset.modelParts=`lotes:${lots.length}|ruas:${streets.length}|outros:${other.length}`;
      this.dataset.landscapeNodes=String(landscapeNodes.length);
      this.dataset.leisureNodes=String(leisureNodes.length);
      this.dataset.focusStructureNodes=String(this.modelLeisureFocusNodes.length);
      this.dataset.socialMaterials=`${leisureNodes.length}:social-pbr-v552`;
      this.dataset.modelEnrichment='classified';

      await nextFrame();
      this.applyPublicPresentationStyle(THREE);
      this.buildStageOverlayTargets();
      if(this.stageOverlayKey)this.setStageOverlay(this.stageOverlayKey,false);

      this.dataset.modelEnrichment='ready';
      this.dataset.modelOperationalGeometry='source-meshes';
      perf.phase='ready';
      perf.readyAt=performance.now();
      perf.readyMs=Math.round(performance.now()-perf.startedAt);
      perf.lots=lots.length;
      perf.streets=streets.length;
      perf.other=other.length;

      this._modelGpuReady=true;
      this.dataset.modelGpuReady='true';
      // O GLB do loteamento termina primeiro. Árvores, relevo e entorno são
      // enriquecimento visual e entram depois do primeiro enquadramento.
      this.schedulePublicEnvironmentLoadingV1();
      this.persist3dBootPhaseV5367('gpu-ready',{
        meshCount:meshes.length,
        processedMeshes:meshes.length,
        lots:lots.length,
        streets:streets.length,
        other:other.length
      });
      setTimeout(()=>syncCompactMapMirrors(),1800);

      // Sync geográfico sai do callback de parse/classificação.
      setTimeout(()=>this.syncThree(),0);
      publishMapPreview();
      return true;
    };

    this._modelEnrichmentPromise=run().finally(()=>{this._modelEnrichmentPromise=null;});
    return this._modelEnrichmentPromise;
  }

  ensureOperationalStreetGeometry(){
    if(this._streetOperationalGeometryReady)return true;
    const sources=this._streetSourceCandidates||this.modelParts?.streets||[];
    if(!this.THREE||!sources.length)return false;

    this.dataset.modelOperationalGeometry='building';
    const segments=this.segmentStreetMeshes(this.THREE,sources);

    if(segments.length){
      this.modelParts.streets=segments;
      this._streetOperationalGeometryReady=true;
      this.dataset.modelOperationalGeometry='ready-lazy';
      this.dataset.modelHeavyGeometry='street-segments-lazy';
      this.buildStageOverlayTargets();
      return true;
    }

    this.dataset.modelOperationalGeometry='source-meshes';
    return false;
  }

  addLotStatusBadges(THREE,model){
    if(!model||!this.modelParts?.lots?.length)return;
    const reserved=new Set((typeof commissionDeals!=='undefined'?commissionDeals:[]).filter(item=>item.status==='Reserva').map(item=>String(item.lot||'').replace(/[^0-9A-Za-z-]/g,'').toLowerCase()));
    const makeTexture=(label,color)=>{const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,96,96);ctx.beginPath();ctx.arc(48,48,39,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.lineWidth=5;ctx.strokeStyle='#ffffff';ctx.stroke();ctx.fillStyle='#13202b';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label.slice(-3),48,49);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;};
    this.lotStatusBadges=[];
    // Os selos preservam numeração e reservas, com um teto seguro para GPUs integradas.
    this.modelParts.lots.slice(0,48).forEach((lot,index)=>{const bounds=new THREE.Box3().setFromObject(lot),world=bounds.getCenter(new THREE.Vector3()),raw=String(lot.userData.partLabel||lot.name||index+1),label=(raw.match(/\d+(?:[-/]\d+)?/)||[String(index+1)])[0],key=raw.replace(/[^0-9A-Za-z-]/g,'').toLowerCase(),isReserved=[...reserved].some(item=>key.includes(item)||item.includes(key));const material=new THREE.SpriteMaterial({map:makeTexture(label,isReserved?'#f6c343':'#32c58b'),transparent:true,depthTest:false,depthWrite:false});const sprite=new THREE.Sprite(material);sprite.name=`Lote_${label}_status`;sprite.scale.set(3.2,3.2,1);model.worldToLocal(world);sprite.position.copy(world);sprite.position.z+=2.2;sprite.userData={lotLabel:raw,lotNumber:label,glbObject:lot.name,status:isReserved?'Reservado':'Disponível'};model.add(sprite);this.lotStatusBadges.push(sprite);});
    this.dataset.lotStatusBadges=String(this.lotStatusBadges.length);
    this.applyDwgLotMetadata();
  }
  segmentStreetMeshes(THREE,sources=[]){
    const segments=[];
    const streetEntries=[];
    let curbRowCount=0;

    // O arquivo canônico já contém a topologia das ruas e dos meios-fios.
    // Não transforme esses meshes em retângulos por bounding box: o GLB
    // possui um mesh composto para a malha viária e curvas independentes para
    // os meios-fios. Esse recorte por envelope era o que criava blocos que
    // atravessavam os lotes. No público, a geometria nativa recebe apenas a
    // textura de paralelepípedo e conserva seus recortes reais.
    const nativeSources=sources.filter(source=>source?.isMesh);
    if(nativeSources.length){
      nativeSources.forEach(source=>{
        source.userData.publicRoadNative=true;
        source.userData.publicRoadBaseHidden=false;
        source.userData.publicRoadCompositeExcluded=false;
        source.visible=true;
        if(!this.hasAttribute('data-activity-location-editor'))source.raycast=()=>{};
        if(/meio.?fio|guia|curb/i.test(String(source.name||'')))curbRowCount++;
      });
      this.dataset.streetSegmentation='geometria nativa do GLB · recorte canônico';
      this.dataset.streetSegmentCount=String(nativeSources.length);
      this.dataset.publicStreetSourceBounds='native-glb-meshes';
      this.dataset.publicStreetCompositeExcluded='0';
      this.dataset.streetIntersectionCount='0';
      this.dataset.publicCurbRows=String(curbRowCount);
      this.dataset.publicRoadEdgeTreatment='meios-fios nativos do GLB · sem pontas sintéticas';
      return nativeSources;
    }

    sources.forEach((source,sourceIndex)=>{
      const streetNo=sourceIndex+1;
      const sourceGeometry=source?.geometry;
      const sourcePosition=sourceGeometry?.getAttribute?.('position');
      if(!sourceGeometry||!sourcePosition)return;

      if(!sourceGeometry.boundingBox)sourceGeometry.computeBoundingBox();
      const bounds=sourceGeometry.boundingBox;
      if(!bounds)return;

      const width=Math.max(.001,bounds.max.x-bounds.min.x);
      // No GLB de origem, X/Z formam o footprint e Y é a altura. O frame do
      // modelo faz a rotação para o plano público; o overlay herda esse frame
      // e deve ser calculado nos eixos locais X/Z.
      const depth=Math.max(.001,bounds.max.z-bounds.min.z);
      // As duas últimas fontes do GLB são superfícies compostas do terreno
      // inteiro (não corredores viários). Fatiá-las criaria um plano de
      // paralelepípedo sobre toda a tela; elas ficam ocultas no público e não
      // participam da cobertura das ruas.
      if(Math.max(width,depth)>420||width*depth>9000){
        source.userData.publicRoadCompositeExcluded=true;
        source.userData.publicRoadBaseHidden=true;
        source.visible=false;
        return;
      }
      const axis=width>=depth?'x':'z';
      const longest=axis==='x'?width:depth;
      const shortest=axis==='x'?depth:width;
      const sliceCount=Math.max(4,Math.min(12,Math.round(Math.max(4,longest/Math.max(shortest,.001)*1.10))));
      // Shorten the generated surface at both ends and sides. The original
      // GLB streets slightly overlap the lot meshes; the public surface must
      // stop inside the road corridor instead of bleeding into the lots.
      const edgeMargin=Math.min(.72,Math.max(.12,shortest*.12));
      const sliceLength=longest/sliceCount;
      const crossLength=Math.max(.2,shortest-edgeMargin*2);
      // Y é a altura no espaço local do GLB; o MasterplanFrame a converte
      // para Z no mundo público.
      const elevation=bounds.max.y+.06;

      source.raycast=()=>{};
      // Render the public paving as a sibling overlay and hide the original
      // GLB street mesh. This removes the dark/extruded side walls that were
      // visually dominating the imported cobblestone top surface.
      source.updateWorldMatrix?.(true,false);
      this.sceneStage?.updateMatrixWorld?.(true);
      const overlay=new THREE.Group();
      overlay.name=`${source.name||'Rua'}__public-cobble-overlay`;
      // Use the complete world matrix rather than only local position,
      // because the GLB is rotated/scaled by MasterplanFrame before it reaches
      // the shared scene. This keeps the overlay over the real street axis.
      if(this.sceneStage?.matrixWorld?.clone){
        const stageInverse=this.sceneStage.matrixWorld.clone().invert();
        overlay.matrix.copy(stageInverse.multiply(source.matrixWorld));
        overlay.matrixAutoUpdate=false;
      }else{
        overlay.position.copy(source.position);
        overlay.quaternion.copy(source.quaternion);
        overlay.scale.copy(source.scale);
      }
      overlay.renderOrder=12;
      this.sceneStage?.add(overlay);
      streetEntries.push({source,overlay,bounds,streetNo,axis,shortest,elevation});

      for(let index=0;index<sliceCount;index++){
        const sliceNo=index+1;
        const center=axis==='x'?bounds.min.x+sliceLength*(index+.5):bounds.min.z+sliceLength*(index+.5);
        const runLength=Math.max(.2,sliceLength-edgeMargin*1.35);
        // PlaneGeometry nasce no plano XY. O GLB usa X/Z como footprint e Y
        // como altura; gire somente a geometria para X/Z antes de aplicar a
        // matriz do overlay. Rotacionar o Mesh aqui faria o frame +PI/2 do
        // modelo girar duas vezes e transformaria a via em uma parede.
        const geometry=axis==='x'
          ?new THREE.PlaneGeometry(runLength,crossLength)
          :new THREE.PlaneGeometry(crossLength,runLength);
        geometry.rotateX(Math.PI/2);
        const material=new THREE.MeshBasicMaterial({color:0x78a9ff,transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false});
        const segment=new THREE.Mesh(geometry,material);
        segment.name=`${source.name||'Asfalto'}__rect_slice_${String(sliceNo).padStart(2,'0')}`;
        if(axis==='x')segment.position.set(center,elevation,(bounds.min.z+bounds.max.z)/2);
        else segment.position.set((bounds.min.x+bounds.max.x)/2,elevation,center);

        segment.renderOrder=11;
        segment.frustumCulled=source.frustumCulled;
        segment.userData={
          streetSegment:true,
          streetRectangularSlice:true,
          streetSegmentIndex:index,
          streetSlice:sliceNo,
          streetSliceTotal:sliceCount,
          streetSourceOrdinal:streetNo,
          streetSourceName:source.name||'Rua de asfalto',
          streetSliceAxis:axis,
          partKind:'streets',
          partId:`street-${String(streetNo).padStart(2,'0')}-slice-${String(sliceNo).padStart(2,'0')}`,
          partLabel:`Paralelepípedo · Rua ${String(streetNo).padStart(2,'0')} · fatia ${String(sliceNo).padStart(2,'0')}`
        };
        segment.userData.defaultMaterial=material;
        segment.userData.gravelMaterial=this.makeSiteSurfaceMaterial(
          THREE,
          new THREE.MeshStandardMaterial({color:0x8b7659,roughness:.99,metalness:0,side:THREE.DoubleSide,depthWrite:true}),
          'gravel'
        );
        overlay.add(segment);
        segments.push(segment);
      }

      // Two raised rows of imported paving stones act as a visible
      // paralelepípedo curb. They follow the same local axis as the road, so
      // no fixed screen-space row can drift away from its street after the
      // model is rotated or projected over the aerial image.
      const curbMaterial=new THREE.MeshBasicMaterial({color:0x8d8a82,side:THREE.DoubleSide});
      const curbHeight=Math.max(.16,Math.min(.34,shortest*.09));
      const curbWidth=Math.max(.16,Math.min(.34,shortest*.075));
      const curbRun=Math.max(.2,longest-edgeMargin*2);
      const curbOffsets=axis==='x'
        ?[bounds.min.z+edgeMargin+curbWidth*.5,bounds.max.z-edgeMargin-curbWidth*.5]
        :[bounds.min.x+edgeMargin+curbWidth*.5,bounds.max.x-edgeMargin-curbWidth*.5];
      curbOffsets.forEach((offset,curbIndex)=>{
        const row=axis==='x'
          ?new THREE.Mesh(new THREE.BoxGeometry(curbRun,curbHeight,curbWidth),curbMaterial)
          :new THREE.Mesh(new THREE.BoxGeometry(curbWidth,curbHeight,curbRun),curbMaterial);
        row.name=`${source.name||'Rua'}__meio-fio-paralelepipedo-${curbIndex+1}`;
        row.position.set(
          axis==='x'?(bounds.min.x+bounds.max.x)/2:offset,
          elevation+.10,
          axis==='x'?offset:(bounds.min.z+bounds.max.z)/2
        );
        row.renderOrder=13;row.raycast=()=>{};
        row.userData={partKind:'curbs',publicCurb:true,publicRoadSurface:true,streetSourceOrdinal:streetNo,partLabel:`Meio-fio em paralelepípedo · Rua ${streetNo}`};
        overlay.add(row);
        curbRowCount++;
      });
      // O mesh original pode conter pontas/extrusões que invadem os lotes;
      // a superfície pública usa somente o recorte XY com margem.
      source.userData.publicRoadBaseHidden=true;
      source.visible=false;
      overlay.userData={publicRoadOverlay:true,publicRoadSource:source,streetSourceName:source.name||`Rua ${streetNo}`};
    });

    const intersections=[];
    streetEntries.forEach(entry=>{
      const center=new THREE.Vector3(
        (entry.bounds.min.x+entry.bounds.max.x)/2,
        entry.elevation+.12,
        (entry.bounds.min.z+entry.bounds.max.z)/2
      );
      const side=Math.max(.8,entry.shortest*.82);
      const material=new THREE.MeshBasicMaterial({color:0xf1c21b,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false});
      const junctionGeometry=new THREE.PlaneGeometry(side,side);
      junctionGeometry.rotateX(Math.PI/2);
      const square=new THREE.Mesh(junctionGeometry,material);
      const number=intersections.length+1;

      square.position.copy(center);
      square.name=`${entry.source.name||'Asfalto'}__intersection_${String(number).padStart(2,'0')}`;
      square.renderOrder=12;
      square.frustumCulled=entry.source.frustumCulled;
      square.userData={
        streetSegment:true,
        streetIntersection:true,
        streetRectangularSlice:true,
        streetSourceOrdinal:entry.streetNo,
        streetSourceName:entry.source.name||'Rua de asfalto',
        partKind:'streets',
        partId:`street-junction-${String(number).padStart(2,'0')}`,
        partLabel:`Paralelepípedo · núcleo da Rua ${String(entry.streetNo).padStart(2,'0')}`
      };
      square.userData.defaultMaterial=material;
      square.userData.gravelMaterial=this.makeSiteSurfaceMaterial(
        THREE,
        new THREE.MeshStandardMaterial({color:0x8b7659,roughness:.99,metalness:0,side:THREE.DoubleSide,depthWrite:true}),
        'gravel'
      );
      entry.overlay?.add(square);
      intersections.push(square);
    });

    segments.push(...intersections);
    this.dataset.streetSegmentation='lazy · até 12 fatias por via + núcleo';
    this.dataset.streetSegmentCount=String(segments.length);
    this.dataset.publicStreetSourceBounds=streetEntries.map(entry=>{
      const size=new THREE.Vector3(entry.bounds.max.x-entry.bounds.min.x,entry.bounds.max.y-entry.bounds.min.y,entry.bounds.max.z-entry.bounds.min.z);
      return `${entry.streetNo}:${size.x.toFixed(1)}x${size.y.toFixed(1)}x${size.z.toFixed(1)}`;
    }).join('|');
    this.dataset.publicStreetCompositeExcluded=String(sources.filter(source=>source?.userData?.publicRoadCompositeExcluded).length);
    this.dataset.streetIntersectionCount=String(intersections.length);
    this.dataset.publicCurbRows=String(curbRowCount);
    this.dataset.publicRoadEdgeTreatment='recuo de pontas + duas filas de paralelepípedo por via';
    return segments;
  }
  syncPublicRoadOverlayTransforms(){
    if(!this.sceneStage)return;
    this.sceneStage.updateMatrixWorld?.(true);
    const inverse=this.sceneStage.matrixWorld?.clone?.().invert?.();
    if(!inverse)return;
    this.sceneStage.traverse?.(node=>{
      const source=node.userData?.publicRoadSource;
      if(!source||node===source||node.matrixAutoUpdate!==false)return;
      source.updateWorldMatrix?.(true,false);
      node.matrix.copy(inverse).multiply(source.matrixWorld);
      node.matrixWorldNeedsUpdate=true;
      node.updateMatrixWorld?.(true);
    });
  }
  addFocusStructureOutlines(THREE,nodes){
    nodes.forEach(node=>{
      if(!node?.geometry||node.userData.belavistaOutline)return;
      const outline=new THREE.LineSegments(new THREE.EdgesGeometry(node.geometry,12),new THREE.LineBasicMaterial({color:0xffd166,transparent:true,opacity:.95,depthTest:false}));
      outline.name='Belavista_3D_structure_outline'; outline.raycast=()=>{}; node.add(outline); node.userData.belavistaOutline=true;
    });
  }
  physicalMapParts(){
    const regular=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[]),...(this._streetSourceCandidates||[]),...(this.modelParts?.other||[])];
    const source=regular.length?regular:(this.activityMapStandaloneParts||[]),seen=new Set();
    return source.filter(part=>{
      if(!part)return false;
      const id=String(part.userData?.partId||part.name||'');
      if(!id||seen.has(id))return false;
      seen.add(id);
      return part.visible!==false||part.userData?.partKind==='streets';
    });
  }
  physicalMapPartAt(point){
    if(!this.modelReady||!this.raycaster||!this.camera||!this.modelGroup)return null;
    const canvas=this.querySelector('.three-overlay'),w=canvas?.clientWidth||0,h=canvas?.clientHeight||0;if(!w||!h)return null;
    this.pointer.x=(point.x/w)*2-1;this.pointer.y=-(point.y/h)*2+1;this.camera.updateMatrixWorld(true);this.modelGroup.updateMatrixWorld(true);this.raycaster.setFromCamera(this.pointer,this.camera);
    for(const hit of this.raycaster.intersectObject(this.modelGroup,true)){
      let source=hit.object;while(source&&!source.userData?.partKind)source=source.parent;
      if(source)return source;
    }
    return null;
  }
  setActivityLocationPaintMode(enabled=false,onPaint=null){
    const canvas=this.querySelector('.three-overlay');
    if(!canvas)return;
    this._activityLocationPaintEnabled=Boolean(enabled);
    this._activityLocationPaintCallback=typeof onPaint==='function'?onPaint:null;
    this.dataset.activityLocationPaint=this._activityLocationPaintEnabled?'true':'false';
    canvas.classList.toggle('activity-location-paint-active',this._activityLocationPaintEnabled);
    if(this._activityPaintHandlersBound)return;
    this._activityPaintHandlersBound=true;
    let drawing=false,lastId='';
    const paint=event=>{
      if(!this._activityLocationPaintEnabled)return;
      const point=this.pointFromClient(event.clientX,event.clientY),part=point?this.physicalMapPartAt(point):null,id=part?.userData?.partId||part?.name||'';
      if(!part||!id||id===lastId)return;
      lastId=id;
      this._activityLocationPaintCallback?.({part,id,label:part.userData?.partLabel||part.name||id,kind:part.userData?.partKind||'other'});
    };
    canvas.addEventListener('pointerdown',event=>{if(!this._activityLocationPaintEnabled)return;event.preventDefault();event.stopImmediatePropagation();drawing=true;lastId='';canvas.setPointerCapture?.(event.pointerId);paint(event);},true);
    canvas.addEventListener('pointermove',event=>{if(!drawing||!this._activityLocationPaintEnabled)return;event.preventDefault();event.stopImmediatePropagation();paint(event);},true);
    const stop=event=>{if(!drawing)return;drawing=false;lastId='';event?.stopImmediatePropagation?.();};
    canvas.addEventListener('pointerup',stop,true);canvas.addEventListener('pointercancel',stop,true);
  }
  previewActivityLocationParts(ids=[],color=0x0f62fe){
    const selected=new Set(ids.map(String));
    for(const part of this.physicalMapParts()){
      const id=String(part.userData?.partId||part.name||'');
      const sourceStreetId=Number.isFinite(Number(part.userData?.streetSourceOrdinal))
        ?`street-source-${Number(part.userData.streetSourceOrdinal)}`
        :'';
      if(selected.has(id)||(sourceStreetId&&selected.has(sourceStreetId))){
        if(!part.userData.activityLocationDefaultMaterial)part.userData.activityLocationDefaultMaterial=part.material;
        part.material=this.materialForColor(part.userData.activityLocationDefaultMaterial,color,.92);
      }else if(part.userData.activityLocationDefaultMaterial){part.material=part.userData.activityLocationDefaultMaterial;delete part.userData.activityLocationDefaultMaterial;}
    }
    this.renderer?.render(this.scene,this.camera);
  }
  pickModelAt(point){
    if(!this.modelReady||!this.raycaster||!this.camera||!this.modelGroup)return false;
    const canvas=this.querySelector('.three-overlay'),rect=canvas?.getBoundingClientRect(),w=canvas?.clientWidth||0,h=canvas?.clientHeight||0;
    if(!w||!h||!point)return false;
    this.pointer.x=(point.x/w)*2-1; this.pointer.y=-(point.y/h)*2+1; this.camera.updateMatrixWorld(true); this.modelGroup.updateMatrixWorld(true); this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObject(this.modelGroup,true); const hit=hits[0]; if(hit?.object){if(this.recordPaintMode)return this.selectRecordMapPart(hit.object);let source=hit.object;while(source&&!source.userData?.partKind)source=source.parent;if(this.isDashboardStatusContext())return this.renderMapStatusPanel([source||hit.object]);if(source?.userData?.partKind==='lots')return this.toggleLotSelection(source);this.toggleCategoryFromPart(source||hit.object);return true;}
    let nearest=null,best=Infinity; for(const item of [...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[])]){const box=new this.THREE.Box3().setFromObject(item),center=box.getCenter(new this.THREE.Vector3()).project(this.camera),sx=(center.x+1)*w/2,sy=(-center.y+1)*h/2,size=box.getSize(new this.THREE.Vector3()),radius=Math.max(16,Math.min(52,Math.max(size.x,size.y)/2));const distance=Math.hypot(point.x-sx,point.y-sy);if(distance<=radius&&distance<best){best=distance;nearest=item;}}
    if(!nearest)return false; if(this.recordPaintMode)return this.selectRecordMapPart(nearest); if(this.isDashboardStatusContext())return this.renderMapStatusPanel([nearest]); if(nearest.userData?.partKind==='lots')return this.toggleLotSelection(nearest); this.toggleCategoryFromPart(nearest); return true;
  }
  isDashboardStatusContext(){const view=appStore.get().view;return view==='assistant'||view==='map';}
  modelPartSource(node){let source=node;while(source&&!source.userData?.partKind)source=source.parent;return source;}
  materialForColor(material,color,opacity=.84){const paint=mat=>{if(!mat)return mat;const clone=mat.clone?.()||mat;if(clone.color)clone.color.setHex(color);if(clone.emissive){clone.emissive.setHex(color);clone.emissiveIntensity=.72;}clone.transparent=true;clone.opacity=Math.max(.68,Math.min(.94,opacity));clone.depthWrite=false;return clone;};return Array.isArray(material)?material.map(paint):paint(material);}
  restorePartMaterial(item){item.material=item.userData.progressMaterial||item.userData.selectionMaterial||item.userData.overlayMaterial||item.userData.publicStatusMaterial||item.userData.defaultMaterial;}
  toggleLotSelection(node){
    const source=this.modelPartSource(node); if(!source||source.userData.partKind!=='lots')return false;
    const partId=source.userData.partId||source.name, selected=this.selectedLotIds||new Set(); this.selectedLotIds=selected;
    const matches=(this.modelParts?.lots||[]).filter(item=>(item.userData.partId||item.name)===partId);
    if(selected.has(partId)){selected.delete(partId);matches.forEach(item=>{delete item.userData.selectionMaterial;this.restorePartMaterial(item);});}
    else {selected.add(partId);matches.forEach(item=>{item.userData.selectionMaterial=this.materialForColor(item.userData.defaultMaterial,0x2fe6ae,.9);item.material=item.userData.selectionMaterial;});}
    const label=source.userData.partLabel||source.name||'Lote'; this.dataset.selectedPart=selected.size?label:'Nenhum lote selecionado';this.dataset.selectedKind=selected.size?'lots':'';this.dataset.selectedLotCount=String(selected.size);this.dataset.selectedLots=[...selected].join('|');
    const bounds=new this.THREE.Box3().setFromObject(source),center=bounds.getCenter(new this.THREE.Vector3()),size=bounds.getSize(new this.THREE.Vector3()); if(this.selectionHalo){this.selectionHalo.position.set(center.x-(this.sceneStage?.position.x||0),center.y-(this.sceneStage?.position.y||0),2);this.selectionHalo.scale.setScalar(Math.max(.7,Math.min(4.5,Math.max(size.x,size.y)/24)));this.selectionHalo.material.color.setHex(0x2fe6ae);this.selectionHalo.visible=selected.size>0;}
    if(selected.size) this.renderLotReservationPanel(); else this.removeMapSelectionPanel();
    appStore.set({lastAction:selected.size?`Selecionou ${selected.size} lote(s) para reserva`:'Limpou seleção de lotes'}); this.sceneStage?.updateMatrixWorld(true);this.renderer?.render(this.scene,this.camera);return true;
  }
  removeMapSelectionPanel(){this.querySelector('[data-map-selection-panel]')?.remove();}
  renderLotReservationPanel(){
    this.removeMapSelectionPanel(); const ids=[...(this.selectedLotIds||[])],labels=ids.map(id=>(this.modelParts?.lots||[]).find(item=>(item.userData.partId||item.name)===id)?.userData.partLabel||id); const panel=document.createElement('aside');panel.className='map-selection-panel';panel.dataset.mapSelectionPanel='reservation';
    panel.innerHTML=`<div class="map-selection-panel-head"><div><span class="activity-kind">RESERVA DE LOTES</span><h2>${ids.length} lote${ids.length===1?'':'s'} selecionado${ids.length===1?'':'s'}</h2></div><button type="button" data-map-selection-clear aria-label="Limpar seleção">×</button></div><div class="map-selection-chips">${labels.map(label=>`<span class="map-selection-chip">${esc(label)}</span>`).join('')}</div><p class="map-selection-help">Clique em outros lotes para acumular a seleção. Clique novamente em um lote para removê-lo.</p><form data-lot-reservation-form><label>Interessado<input name="interessado" placeholder="Nome completo"></label><label>Objetivo<select name="objetivo"><option>Moradia</option><option>Investimento</option><option>Veraneio</option></select></label><label>Prazo de reserva<select name="prazo"><option>24 horas</option><option>48 horas</option><option>7 dias</option></select></label><label>Observações<textarea name="observacoes" rows="2" placeholder="Preferências, condições ou observações"></textarea></label><div class="map-selection-panel-actions"><button type="button" class="ghost" data-map-selection-progress>${ico('paintbrush')} Registrar progresso</button><button type="submit" class="primary">${ico('calendar-check')} Abrir reserva</button></div></form>`;
    this.appendChild(panel); panel.querySelector('[data-map-selection-clear]')?.addEventListener('click',event=>{event.stopPropagation();this.clearLotSelection(true);}); panel.querySelector('[data-map-selection-progress]')?.addEventListener('click',event=>{event.stopPropagation();this.setMapSelectionMode('progress');}); panel.querySelector('[data-lot-reservation-form]')?.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.currentTarget),reservation={id:`RES-${Date.now()}`,lotes:labels,interessado:String(data.get('interessado')||'Interessado não informado'),objetivo:String(data.get('objetivo')||'Moradia'),prazo:String(data.get('prazo')||'24 horas'),observacoes:String(data.get('observacoes')||''),createdAt:new Date().toISOString()};appStore.set({lastAction:`Abriu reserva para ${labels.join(', ')}`,mapReservation:reservation});notify(`Janela de reserva aberta para ${labels.length} lote(s).`,'success');panel.classList.add('is-confirmed');const submit=panel.querySelector('[type="submit"]');if(submit)submit.textContent='Reserva preparada';}); window.lucide?.createIcons();
  }
  clearLotSelection(announce=false){for(const item of this.modelParts?.lots||[]){delete item.userData.selectionMaterial;this.restorePartMaterial(item);}this.selectedLotIds=new Set();delete this.dataset.selectedLots;delete this.dataset.selectedLotCount;delete this.dataset.selectedPart;delete this.dataset.selectedKind;if(this.selectionHalo)this.selectionHalo.visible=false;this.removeMapSelectionPanel();this.renderer?.render(this.scene,this.camera);if(announce)notify('Seleção de lotes limpa.');}
  pointFromClient(clientX,clientY){const canvas=this.querySelector('.three-overlay'),rect=canvas?.getBoundingClientRect();if(!canvas||!rect?.width||!rect?.height)return null;return {x:((clientX-rect.left)/rect.width)*canvas.clientWidth,y:((clientY-rect.top)/rect.height)*canvas.clientHeight};}
  beginMapAreaSelection(clientX,clientY){this.removeMapAreaSelection();const sceneRect=this.getBoundingClientRect(),rect=document.createElement('div');rect.className='map-selection-rectangle';rect.dataset.mapSelectionRectangle='true';rect.style.left=`${clientX-sceneRect.left}px`;rect.style.top=`${clientY-sceneRect.top}px`;this.appendChild(rect);this._mapAreaSelectionStart={x:clientX,y:clientY};this._mapAreaSelectionRect=rect;this.dataset.mapSelection='dragging';}
  updateMapAreaSelection(clientX,clientY){const start=this._mapAreaSelectionStart,rect=this._mapAreaSelectionRect,sceneRect=this.getBoundingClientRect();if(!start||!rect)return;const left=Math.min(start.x,clientX)-sceneRect.left,top=Math.min(start.y,clientY)-sceneRect.top;rect.style.left=`${left}px`;rect.style.top=`${top}px`;rect.style.width=`${Math.abs(clientX-start.x)}px`;rect.style.height=`${Math.abs(clientY-start.y)}px`;}
  removeMapAreaSelection(){this._mapAreaSelectionRect?.remove();this._mapAreaSelectionRect=null;this._mapAreaSelectionStart=null;delete this.dataset.mapSelection;}
  collectModelPartsInRect(startClient,endClient){const a=this.pointFromClient(startClient.x,startClient.y),b=this.pointFromClient(endClient.x,endClient.y),canvas=this.querySelector('.three-overlay'),w=canvas?.clientWidth||0,h=canvas?.clientHeight||0;if(!a||!b||!w||!h||!this.camera)return [];const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x),top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);this.camera.updateMatrixWorld(true);this.modelGroup?.updateMatrixWorld(true);const parts=[...(this.modelParts?.lots||[]),...(this.modelParts?.streets||[]),...(this.modelParts?.other||[])];return parts.filter(item=>{const box=new this.THREE.Box3().setFromObject(item),center=box.getCenter(new this.THREE.Vector3()).project(this.camera),x=(center.x+1)*w/2,y=(-center.y+1)*h/2;return x>=left&&x<=right&&y>=top&&y<=bottom;});}
  finishMapAreaSelection(clientX,clientY){const start=this._mapAreaSelectionStart;this.removeMapAreaSelection();if(!start)return;const parts=this.collectModelPartsInRect(start,{x:clientX,y:clientY});this.setMapSelectionMode(false);if(this.isDashboardStatusContext())return this.renderMapStatusPanel(parts);this.progressSelectionParts=parts;this.renderProgressSelectionPanel(parts);}
  setMapSelectionMode(mode=false){const requested=mode==='progress'?'progress':null;const next=requested&&appStore.get().view==='records'?requested:null;if(next)this.ensureOperationalStreetGeometry();this.mapSelectionMode=next;this.dataset.mapSelectionMode=next||'off';this.querySelectorAll('[data-scene-selection]').forEach(button=>button.classList.toggle('active',button.dataset.sceneSelection===next));if(requested&&!next){notify('O registro de progresso fica disponível no contexto de Registros.','warning');}else if(next){this.dataset.mapSelectionHint='Arraste um retângulo sobre lotes, ruas ou estruturas para registrar progresso';notify('Seleção de progresso ativa: arraste sobre uma área do loteamento.');}else delete this.dataset.mapSelectionHint;}
  renderMapStatusPanel(parts=[]){
    this.removeMapSelectionPanel();
    const selected=[...new Map(parts.filter(Boolean).map(item=>[(item.userData?.partId||item.name),item])).values()];
    const labels=selected.map(item=>item.userData?.partLabel||item.name||'Área do empreendimento');
    const kinds=[...new Set(selected.map(item=>item.userData?.partKind||'estrutura'))];
    const lots=selected.filter(item=>item.userData?.partKind==='lots').length;
    const streets=selected.filter(item=>item.userData?.partKind==='streets').length;
    selected.forEach(item=>{item.userData.statusMaterial=this.materialForColor(item.userData.defaultMaterial,item.userData?.partKind==='lots'?0x78a9ff:0x42be65,.9);item.material=item.userData.statusMaterial;});
    this.statusSelectionParts=selected;
    const panel=document.createElement('aside');panel.className='map-selection-panel map-status-panel';panel.dataset.mapSelectionPanel='status';
    panel.innerHTML=`<div class="map-selection-panel-head"><div><span class="activity-kind">CONSULTA DO MAPA</span><h2>${selected.length?`${selected.length} parte${selected.length===1?'':'s'} selecionada${selected.length===1?'':'s'}`:'Nenhuma parte selecionada'}</h2></div><button type="button" data-map-status-clear aria-label="Fechar consulta">×</button></div><p class="map-selection-help">Consulta visual do empreendimento. Esta seleção não abre reserva nem cria registro.</p>${selected.length?`<div class="map-selection-chips">${labels.slice(0,8).map(label=>`<span class="map-selection-chip">${esc(label)}</span>`).join('')}${labels.length>8?`<span class="map-selection-chip">+${labels.length-8} partes</span>`:''}</div><dl class="map-status-facts"><div><dt>Lotes</dt><dd>${lots}</dd></div><div><dt>Trechos</dt><dd>${streets}</dd></div><div><dt>Tipo</dt><dd>${esc(kinds.join(' · '))}</dd></div></dl>`:`<p class="map-selection-help">Arraste sobre lotes, trechos ou estruturas para consultar o status consolidado.</p>`}<div class="map-selection-panel-actions"><button type="button" class="ghost" data-map-status-clear>Limpar consulta</button></div>`;
    this.appendChild(panel);panel.querySelectorAll('[data-map-status-clear]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();this.clearMapStatusSelection();}));
    this.dataset.mapStatusCount=String(selected.length);appStore.set({lastAction:selected.length?`Consultou status de ${selected.length} parte(s) do mapa`:'Limpou consulta do mapa'});this.renderer?.render(this.scene,this.camera);window.lucide?.createIcons();return true;
  }
  clearMapStatusSelection(){(this.statusSelectionParts||[]).forEach(item=>{delete item.userData.statusMaterial;this.restorePartMaterial(item);});this.statusSelectionParts=[];delete this.dataset.mapStatusCount;this.removeMapSelectionPanel();this.renderer?.render(this.scene,this.camera);}
  renderProgressSelectionPanel(parts=[]){
    this.removeMapSelectionPanel();const labels=parts.map(item=>item.userData.partLabel||item.name).filter(Boolean),panel=document.createElement('aside');panel.className='map-selection-panel map-progress-panel';panel.dataset.mapSelectionPanel='progress';const stages=demoData.activities.map(item=>`<option>${esc(item.name)}</option>`).join(''),responsibles=demoData.collaborators.map(([name])=>`<option>${esc(name)}</option>`).join('');
    panel.innerHTML=`<div class="map-selection-panel-head"><div><span class="activity-kind">REGISTRO DE PROGRESSO · ÁREA</span><h2>${labels.length?`${labels.length} área(s) selecionada(s)`:'Área do empreendimento'}</h2></div><button type="button" data-map-selection-close aria-label="Fechar">×</button></div><p class="map-selection-help">A seleção pode conter qualquer natureza de obra. Defina a atividade e registre o avanço físico, responsável e evidências.</p>${labels.length?`<div class="map-selection-chips">${labels.slice(0,8).map(label=>`<span class="map-selection-chip">${esc(label)}</span>`).join('')}${labels.length>8?`<span class="map-selection-chip">+${labels.length-8} áreas</span>`:''}</div>`:''}<form data-map-progress-form><label>Natureza<select name="natureza">${progressNatureOptions.map(value=>`<option>${esc(value)}</option>`).join('')}</select></label><label>Atividade<select name="atividade">${stages}</select></label><div class="map-selection-form-grid"><label>Avanço (%)<input name="percentual" type="number" min="0" max="100" value="25"></label><label>Data<input name="data" type="date" value="${new Date().toISOString().slice(0,10)}"></label></div><label>Responsável<select name="responsavel">${responsibles}</select></label><label>Detalhes da execução<textarea name="detalhes" rows="3" placeholder="Medição, frente executada, ocorrência ou próximo passo"></textarea></label><label>Comprovante / foto<input name="evidencia" placeholder="URL local, nome do arquivo ou observação"></label><div class="map-selection-panel-actions"><button type="button" class="ghost" data-map-selection-close>Cancelar</button><button type="submit" class="primary">${ico('save')} Registrar progresso</button></div></form>`;
    this.appendChild(panel);panel.querySelectorAll('[data-map-selection-close]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();this.removeMapSelectionPanel();this.progressSelectionParts=[];}));panel.querySelector('[data-map-progress-form]')?.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.currentTarget),natureza=String(data.get('natureza')||'Execução operacional'),atividade=String(data.get('atividade')||'Atividade'),mapAreas=parts.map(item=>({label:item.userData.partLabel||item.name,kind:item.userData.partKind||'other',partId:item.userData.partId||item.name})),record={id:`REG-${Date.now()}`,obra:'Aliança Park',atividade,etapa:demoData.activities.find(item=>item.id===appStore.get().selectedStage)?.name||'Etapa não vinculada',categoria:natureza,responsavel:String(data.get('responsavel')||'A definir'),data:String(data.get('data')||new Date().toISOString().slice(0,10)),hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),detalhes:String(data.get('detalhes')||''),evidenceUri:String(data.get('evidencia')||''),status:'Pendente',progresso:Number(data.get('percentual')||0),mapArea:JSON.stringify(mapAreas),createdAt:new Date().toISOString()};appStore.update(state=>({...state,records:[record,...(state.records||[])],lastAction:`Registrou ${natureza} em ${mapAreas.length||'área geral'} área(s)`}));this.paintProgressParts(parts,natureza);notify(`Progresso de ${natureza} registrado no mapa.`,'success');panel.innerHTML=`<div class="map-selection-success"><span>✓</span><h2>Progresso registrado</h2><p>${esc(natureza)} · ${esc(atividade)}</p><small>${mapAreas.length||'Área geral'} área(s) vinculada(s) ao novo registro.</small><button type="button" class="primary" data-map-selection-close>Continuar no mapa</button></div>`;panel.querySelector('[data-map-selection-close]')?.addEventListener('click',()=>this.removeMapSelectionPanel());window.lucide?.createIcons();});window.lucide?.createIcons();
  }
  paintProgressParts(parts,natureza){const color=stageOverlayColors[stageOverlayKey(natureza)]||0x42be65;parts.forEach(item=>{item.userData.progressMaterial=this.materialForColor(item.userData.defaultMaterial,color,.88);item.material=item.userData.progressMaterial;});this.dataset.progressAreaCount=String(parts.length);this.dataset.progressNature=natureza;this.sceneStage?.updateMatrixWorld(true);this.renderer?.render(this.scene,this.camera);}
  setRecordPaintMode(enabled=false,callback=null){
    this.recordPaintMode=Boolean(enabled); this._recordPaintCallback=callback||null; this.dataset.recordPaintMode=this.recordPaintMode?'true':'false';
    if(this.recordPaintMode)this.ensureOperationalStreetGeometry();
    if(this.recordPaintMode&&this.mapSelectionMode)this.setMapSelectionMode(false);
    const canvas=this.querySelector('.three-overlay'); canvas?.classList.toggle('record-paint-active',this.recordPaintMode);
    if(this.recordPaintMode){this.dataset.recordPaintHint='Clique em um lote, rua ou área do modelo para registrar o progresso';notify('Modo pintar no mapa ativo: clique em uma área do empreendimento.');}
    else delete this.dataset.recordPaintHint;
  }
  selectRecordMapPart(node){
    let source=node; while(source&&!source.userData?.partKind)source=source.parent; if(!source)return false;
    const kind=source.userData.partKind, label=source.userData.partLabel||source.name||(kind==='streets'?'Paralelepípedo · trecho':'Área do empreendimento'),overlayKey=kind==='lots'?'terraplanagem':kind==='streets'?'pavimentacao':'urbanizacao',natureByOverlay={terraplanagem:'Terraplanagem',pavimentacao:'Pavimentação',urbanizacao:'Urbanização'},nature=natureByOverlay[overlayKey]||'Execução operacional',catalog=activityCatalog.find(item=>item.nature===nature)||activityCatalog.find(item=>item.name.toLowerCase().includes(nature.toLowerCase().split(' ')[0]))||activityCatalog[0],stage=demoData.activities.find(item=>item.id===appStore.get().selectedStage)?.name||'Etapa não vinculada';
    const area={label,kind,partId:source.userData.partId||source.name||kind,overlayKey,nature:catalog?.nature||nature,activity:catalog?.name||'Registrar atividade da área',initial:catalog?.initial||[],execution:catalog?.execution||[],stage,selectedAt:new Date().toISOString()};
    this.clearStageOverlay(false); this.selectModelPart(source,false); this.lastRecordMapArea=area; this.dataset.recordPaintArea=JSON.stringify(area);
    this._recordPaintCallback?.(area); this.setRecordPaintMode(false); notify(`${label} pintado e vinculado ao registro.`,'success'); return true;
  }
  selectRecordMapParts(parts=[]){
    const unique=[...new Map(parts.filter(Boolean).map(item=>[(item.userData?.partId||item.name),item])).values()];
    if(!unique.length){this.removeMapAreaSelection();return false;}
    const first=unique[0],kind=first.userData?.partKind||'other';
    const labels=unique.map(item=>item.userData?.partLabel||item.name||'Área do empreendimento');
    const overlayKey=kind==='lots'?'terraplanagem':kind==='streets'?'pavimentacao':'urbanizacao';
    const natureByOverlay={terraplanagem:'Terraplanagem',pavimentacao:'Pavimentação',urbanizacao:'Urbanização'};
    const nature=natureByOverlay[overlayKey]||'Execução operacional';
    const catalog=activityCatalog.find(item=>item.nature===nature)||activityCatalog[0];
    const area={label:`${unique.length} áreas selecionadas`,labels,kind,partIds:unique.map(item=>item.userData?.partId||item.name),overlayKey,nature:catalog?.nature||nature,activity:catalog?.name||'Registrar atividade da área',initial:catalog?.initial||[],execution:catalog?.execution||[],stage:demoData.activities.find(item=>item.id===appStore.get().selectedStage)?.name||'Etapa não vinculada',selectedAt:new Date().toISOString()};
    this.clearStageOverlay(false); unique.forEach(item=>this.selectModelPart(item,false)); this.lastRecordMapArea=area; this.dataset.recordPaintArea=JSON.stringify(area); this._recordPaintCallback?.(area); this.setRecordPaintMode(false); this.removeMapAreaSelection(); notify(`${unique.length} áreas pintadas e vinculadas ao registro.`,'success'); return true;
  }
  refreshMapSurface(theme,w,h){
    if(this.hasAttribute?.('data-public-satellite-base')&&this._publicGeoTheme)theme=this._publicGeoTheme;
    if(this.matches?.('map-scene[data-public-map],map-scene[data-public-presentation]')&&!this.hasAttribute('data-public-satellite-base')){
      // O fundo PDF/CSS já é a base pública. Não recompõe 64 tiles em um
      // CanvasTexture 2048² e não faz upload da textura a cada tile carregada.
      if(this.mapSurface)this.mapSurface.visible=false;
      this.dataset.mapSurfaceVisible='false';
      this.dataset.mapTexture='public-static-base';
      this.dataset.mapRasterMode='public-static-base + live-glb';
      this.dataset.mapSurfaceBuilds='0';
      return;
    }
    if(!this.mapSurfaceCanvas||!this.mapSurfaceTexture)return;
    this.dataset.mapSurfaceMaterial='MeshBasicMaterial · CanvasTexture · opaque';
    // A superfície geográfica precisa exceder a moldura do canvas. A margem
    // cobre rotação, inclinação e pan sem revelar o fundo da cena nas bordas.
    // O GLB não participa deste cálculo: ambos continuam filhos do mesmo
    // grupo Three.js, mas só as tiles ganham área de segurança adicional.
    const zoom=Math.max(12,Math.min(20,Number(theme.zoom)||15)),rasterW=Math.min(MAP_RASTER_MAX,Math.max(1024,Math.ceil(w))),rasterH=Math.min(MAP_RASTER_MAX,Math.max(1024,Math.ceil(h))),cols=Math.ceil(rasterW/256)+MAP_TILE_OVERSCAN*2,rows=Math.ceil(rasterH/256)+MAP_TILE_OVERSCAN*2,lat=Number(theme.center[0]),lon=Number(theme.center[1]),rad=Math.PI/180,n=2**zoom;
    const xf=(lon+180)/360*n,yf=(1-Math.asinh(Math.tan(lat*rad))/Math.PI)/2*n,x0=Math.floor(xf-cols/2),y0=Math.floor(yf-rows/2),mode=this.mapTileMode||'satellite',key=`${mode}|${zoom}|${x0}|${y0}`; this.mapRasterPixelOffset={x:(x0+cols/2-xf)*256,y:(y0+rows/2-yf)*256,width:cols*256,height:rows*256}; this.dataset.mapRasterGeoCenter=`${lat.toFixed(6)},${lon.toFixed(6)}`; this.dataset.mapSurfaceKey=key; if(key===this._mapSurfaceKey){this.dataset.mapSurfaceReuse='true';return;} this._mapSurfaceKey=key; this.dataset.mapSurfaceReuse='false'; this.dataset.mapSurfaceBuilds=String((Number(this.dataset.mapSurfaceBuilds)||0)+1);
    // Não misture uma textura parcial com o raster DOM. A camada WebGL volta
    // somente quando o mosaico inteiro estiver pronto.
    // Preserva o mosaico anterior até que o próximo esteja completo. Assim,
    // alterar enquadramento não cria uma janela vazia no limite da área visível.
    const hadSurface=this.mapSurface.visible; this.dataset.mapSurfaceVisible=hadSurface?'true':'false';
    const canvas=this.mapSurfaceCanvas; canvas.width=cols*256; canvas.height=rows*256; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); const token=key; let loaded=0,total=0;
    const sources=mapTileSources[mode]||mapTileSources.satellite;
    const drawTile=(row,col,tileX,tileY,attempt=0)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(this._mapSurfaceKey!==token)return;loaded++;ctx.drawImage(image,col*256,row*256,256,256);if(String(sources[attempt]?.id||'').startsWith('satellite'))this.dataset.mapTileSource='Esri World Imagery';else if(!this.dataset.mapTileSource)this.dataset.mapTileSource='OpenStreetMap';ctx.fillStyle=mode==='satellite'?'rgba(4,11,22,.04)':'rgba(4,11,22,.14)';ctx.fillRect(col*256,row*256,256,256);this.dataset.mapTextureTiles=`${loaded}/${total}`;this.dataset.mapTexture=loaded===total?'uploading':'loading';if(loaded===total){try{const sample=ctx.getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data;this.dataset.mapSurfacePixel=`${sample[0]},${sample[1]},${sample[2]},${sample[3]}`;}catch{this.dataset.mapSurfacePixel='unreadable';}this.commitMapSurfaceTexture(token,canvas);}this.mapSurfaceTexture.needsUpdate=true;this.renderer?.render(this.scene,this.camera);};image.onerror=()=>{if(attempt+1<sources.length)drawTile(row,col,tileX,tileY,attempt+1);else if(this._mapSurfaceKey===token){this.dataset.mapTextureTiles=`${loaded}/${total}`;this.dataset.mapTexture='partial';}};image.src=sources[attempt].url(zoom,tileX,tileY);};
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const tileX=((x0+col)%n+n)%n,tileY=y0+row;if(tileY<0||tileY>=n)continue;total++;drawTile(row,col,tileX,tileY);}
    this.dataset.mapTexture=hadSurface?'refreshing':'loading'; this.dataset.mapTextureTiles=`0/${total}`;
    // Keep the WebGL source explicitly bound after resizing the backing canvas.
    // Three.js can retain the pre-resize image dimensions otherwise, which
    // leaves the sibling map plane transparent while the GLB remains visible.
    this.mapSurfaceTexture.image=this.mapSurfaceCanvas;
    this.mapSurfaceTexture.needsUpdate=true;
    this.dataset.mapSurfaceTexture=`${canvas.width}x${canvas.height} · needsUpdate`;
  }
  applyMapRasterCentering(w,h){
    const offset=this.mapRasterPixelOffset; if(!offset||!this.mapSurface)return;
    const worldX=(offset.x/offset.width)*Number(w||0),worldY=-(offset.y/offset.height)*Number(h||0); this.mapSurface.position.set(worldX,worldY,SCENE_MAP_Z); this.dataset.mapRasterCenterOffset=`${offset.x.toFixed(2)},${offset.y.toFixed(2)}px · ${worldX.toFixed(2)},${worldY.toFixed(2)}world`;
  }
  refreshOsmRaster(theme,w,h){
    // A única superfície cartográfica visível é a textura das tiles no plano
    // Three.js. A antiga camada DOM duplicava o mapa e se desacoplava do GLB.
    const host=this.querySelector('.osm-raster'); if(!host)return;
    host.replaceChildren(); this.dataset.osmRaster='disabled · single Three.js map surface'; return;
    const zoom=Math.max(12,Math.min(20,Number(theme.zoom)||15)),rasterW=Math.min(1280,Math.max(512,w)),rasterH=Math.min(1280,Math.max(512,h)),cols=Math.ceil(rasterW/256)+2,rows=Math.ceil(rasterH/256)+2,lat=Number(theme.center[0]),lon=Number(theme.center[1]),rad=Math.PI/180,n=2**zoom;
    const xf=(lon+180)/360*n,yf=(1-Math.asinh(Math.tan(lat*rad))/Math.PI)/2*n,x0=Math.floor(xf-cols/2),y0=Math.floor(yf-rows/2),mode=this.mapTileMode||'satellite',key=`${mode}|${zoom}|${x0}|${y0}|${cols}|${rows}`; this.mapRasterPixelOffset={x:(x0+cols/2-xf)*256,y:(y0+rows/2-yf)*256,width:cols*256,height:rows*256};
    if(key===this._osmRasterKey)return; this._osmRasterKey=key; host.replaceChildren(); host.style.width=`${cols*256}px`; host.style.height=`${rows*256}px`;
    const sources=mapTileSources[mode]||mapTileSources.satellite;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const tileX=((x0+col)%n+n)%n,tileY=y0+row;if(tileY<0||tileY>=n)continue;const image=new Image();image.width=256;image.height=256;image.alt='';image.decoding='async';image.loading='eager';image.style.left=`${col*256}px`;image.style.top=`${row*256}px`;let attempt=0;const load=()=>{image.src=sources[attempt].url(zoom,tileX,tileY);};image.onerror=()=>{if(attempt+1<sources.length){attempt++;load();}};image.onload=()=>{if(sources[attempt]?.id==='satellite')this.dataset.mapTileSource='Esri World Imagery';};load();host.append(image);}
    host.dataset.ready='true'; this.dataset.osmRaster=`${mode} · ${zoom} · ${cols}x${rows}`;
  }
  toggleCategoryFromPart(node){
    let source=node; while(source&&!source.userData?.partKind)source=source.parent;
    if(!source)return false;
    const category=source.userData.partKind==='streets'?'pavimentacao':source.userData.partKind==='lots'?'terraplanagem':'urbanizacao';
    if(this.dataset.highlightActive==='true'&&this.stageOverlayKey===category){this.clearStageOverlay(true);return true;}
    this.setStageOverlay(category,true); this.selectModelPart(source); return true;
  }
  selectModelPart(node,announce=true){
    let source=node; while(source&&!source.userData?.partKind)source=source.parent; if(!source)return;
    const kind=source.userData.partKind,partId=source.userData.partId;
    this.modelParts?.lots.concat(this.modelParts?.streets||[],this.modelParts?.other||[]).forEach(item=>{if(item.userData.highlightMaterial)this.restorePartMaterial(item);});
    const matches=(this.modelParts[kind]||[]).filter(item=>(item.userData.partId||item.name)===partId);
    const color=kind==='lots'?0x2fe6ae:kind==='streets'?0x78a9ff:0xffb020;
    matches.forEach(item=>{const original=item.userData.defaultMaterial,paint=mat=>{const clone=mat.clone();if(clone.color)clone.color.setHex(color);if(clone.emissive){clone.emissive.setHex(color);clone.emissiveIntensity=.72;}clone.transparent=true;clone.opacity=Math.max(.68,clone.opacity??1);return clone;};item.userData.highlightMaterial=Array.isArray(original)?original.map(paint):paint(original);item.material=item.userData.highlightMaterial;});
    const bounds=new this.THREE.Box3().setFromObject(source),center=bounds.getCenter(new this.THREE.Vector3()),size=bounds.getSize(new this.THREE.Vector3());
    if(this.selectionHalo){this.selectionHalo.position.set(center.x-(this.sceneStage?.position.x||0),center.y-(this.sceneStage?.position.y||0),2);this.selectionHalo.scale.setScalar(Math.max(.7,Math.min(4.5,Math.max(size.x,size.y)/24)));this.selectionHalo.material.color.setHex(color);this.selectionHalo.visible=true;}
    const label=source.userData.partLabel||source.name||(kind==='streets'?'Paralelepípedo · trecho':'Elemento do empreendimento'); this.dataset.selectedPart=label; this.dataset.selectedKind=kind;
    if(announce)appStore.set({lastAction:`Selecionou ${label}`}); const span=this.querySelector('.map-badge span'); if(span)span.textContent=`${label} · selecionado`;
    // Seleção é somente estado/material do GLB. Não chame syncThree aqui:
    // esse método recompõe a base cartográfica e pode reprocessar os tiles
    // enquanto o usuário apenas está alternando um highlight.
    this.sceneStage?.updateMatrixWorld(true); this.renderer?.render(this.scene,this.camera);
  }
  getSceneOrbitPivot(targetX,targetY){
    const host=this.querySelector('.map-host');
    const fallbackX=Number(targetX)||((host?.clientWidth||2)/2),fallbackY=Number(targetY)||((host?.clientHeight||2)/2);
    const shared=this.sceneSharedOrigin;
    // sceneSharedOrigin é o centro do footprint compartilhado pelo raster, o
    // GLB, os markers e o relevo. O pan fica fora deste pivô de órbita: assim
    // ele continua deslocando a cena, mas não muda a inclinação nem cria um
    // segundo eixo de rotação quando o usuário gira o mapa.
    if(Number.isFinite(Number(shared?.x))&&Number.isFinite(Number(shared?.y))){
      return {x:Number(shared.x),y:Number(shared.y),z:Number(this.mapSurface?.position?.z)||SCENE_MAP_Z,source:'shared-terrain-origin'};
    }
    // Durante a primeira montagem o centro compartilhado ainda pode não ter
    // sido calculado. O centro do modelo fornece o mesmo ponto no espaço de
    // mundo sem bloquear o primeiro frame do canvas.
    if(this.THREE&&this.sceneStage&&this.masterplanModel){
      try{
        this.sceneStage.updateMatrixWorld(true); this.masterplanModel.updateWorldMatrix?.(true,true);
        const bounds=new this.THREE.Box3().setFromObject(this.masterplanModel);
        if(!bounds.isEmpty()){
          const center=bounds.getCenter(new this.THREE.Vector3());
          return {x:center.x,y:center.y,z:Number(this.mapSurface?.position?.z)||SCENE_MAP_Z,source:'masterplan-footprint-center'};
        }
      }catch{}
    }
    return {x:fallbackX,y:fallbackY,z:Number(this.mapSurface?.position?.z)||SCENE_MAP_Z,source:'viewport-fallback'};
  }
  configurePerspectiveCamera(w,h,targetX=(Number(w)||2)/2,targetY=(Number(h)||2)/2){
    if(!this.camera)return;
    const width=Math.max(2,Number(w)||2),height=Math.max(2,Number(h)||2),distance=Math.max(width,height)*1.55;
    this.camera.aspect=width/height; this.camera.fov=34; this.camera.near=.1; this.camera.far=10000;
    // A rotação é uma órbita no plano horizontal ao redor do footprint real.
    // A inclinação é convertida uma única vez em elevação da câmera e não é
    // alterada pelo heading. O stage permanece neutro para mapa, GLB, terreno
    // e markers continuarem com o mesmo plano de solo.
    const pivot=this.getSceneOrbitPivot(targetX,targetY),visual=this._sceneVisual||{},tilt=this.clampSceneTilt(Number(visual.tilt)||DEFAULT_TILT_BOOST),heading=(Number(visual.rotation)||0)*Math.PI/180,elevation=Math.max(5,Math.min(82,90-tilt))*Math.PI/180,groundDistance=distance*Math.cos(elevation),pivotZ=Number(pivot.z)||SCENE_MAP_Z;
    this.camera.up.set(0,0,1);
    this.camera.position.set(pivot.x+Math.sin(heading)*groundDistance,pivot.y+Math.cos(heading)*groundDistance,pivotZ+distance*Math.sin(elevation));
    this.camera.lookAt(pivot.x,pivot.y,pivotZ); this.camera.updateProjectionMatrix();
    // O mesmo ponto é usado no lookAt e na origem visual. Isso impede que o
    // giro abra uma lacuna no topo quando o mapa estiver inclinado.
    this.sceneVisualAnchor={x:pivot.x,y:pivot.y,z:pivotZ};
    this.dataset.sceneOrbitPivot=`${pivot.source} · ${Math.round(pivot.x)},${Math.round(pivot.y)},${pivotZ.toFixed(2)}`;
    this.dataset.sceneTiltAnchor=`terrain-pivot · ${Math.round(pivot.x)},${Math.round(pivot.y)}`;
    this.dataset.cameraProjection='perspective-orbit'; this.dataset.cameraDistance=String(Math.round(distance)); this.dataset.sceneTiltFrame='camera orbit · constant ground inclination'; this.dataset.sceneRotationBehavior='horizontal orbit · fixed pitch · terrain pivot';
  }
  applySceneTransformAnchor(tilt,rotation,scale){
    if(!this.sceneStage||!this.THREE)return;
    const host=this.querySelector('.map-host'),anchor=this.sceneVisualAnchor||{x:(host?.clientWidth||2)/2,y:(host?.clientHeight||2)/2,z:0},origin=this.sceneTransformOrigin||this.sceneSharedOrigin||anchor;
    // Pan é a única translação do mundo. Inclinação e heading pertencem à
    // câmera; manter o stage neutro impede que raster e GLB assumam eixos ou
    // pivôs diferentes durante a rotação.
    this.sceneStage.position.set(Number(origin.x)||anchor.x,Number(origin.y)||anchor.y,SCENE_MAP_Z);
    this.dataset.sceneTiltAnchor=`camera pivot · heading ${Math.round(Number(rotation)||0)}° · ${Math.round(anchor.x)},${Math.round(anchor.y)}`;
  }
  centerModelProjection(){
    this.dataset.modelCenterProjection='started';
    if(!this.THREE||!this.camera||!this.modelGroup||!this.masterplanModel){this.dataset.modelCenterProjection=`skipped · THREE:${Boolean(this.THREE)} camera:${Boolean(this.camera)} group:${Boolean(this.modelGroup)} model:${Boolean(this.masterplanModel)}`;return;}
    // Mapa e GLB usam a mesma origem de cena. O modelo já é centralizado no
    // plano XY nativo do arquivo durante o carregamento; portanto qualquer
    // "correção" de tela baseada em NDC introduz paralaxe artificial quando a
    // cena inclina e desloca o loteamento para um canto. Mantemos a âncora no
    // centro real do footprint, sem mover o DOM nem separar o GLB do mapa.
    this.modelGroup.position.set(0,0,0);
    this.modelGroup.updateMatrixWorld(true); this.sceneStage?.updateMatrixWorld(true);
    const bounds=new this.THREE.Box3().setFromObject(this.masterplanModel),center=bounds.getCenter(new this.THREE.Vector3()),base=new this.THREE.Vector3(center.x,center.y,bounds.min.z),projected=base.clone().project(this.camera);
    this.dataset.modelOffset='0,0'; this.dataset.modelProjectedDrift=`${(projected.x*100).toFixed(3)},${(projected.y*100).toFixed(3)}`; this.dataset.modelProjectedCenter=`${projected.x.toFixed(3)},${projected.y.toFixed(3)}`; this.dataset.modelAnchorPoint='shared XY footprint center'; this.dataset.modelCenterProjection='shared-scene-center'; this.dataset.mapModelAnchor='shared scene origin · center of GLB footprint';
  }
  commitMapSurfaceTexture(token,canvas){
    if(this._mapSurfaceKey!==token||!this.mapSurfaceTexture||!this.mapSurface)return;
    this.dataset.mapTexture='uploading';
    try{
      // Upload a finalized local image to WebGL. This avoids keeping the
      // mutable tile canvas as the GPU source while tiles arrive asynchronously.
      const image=new Image();
      image.onload=()=>{
        if(this._mapSurfaceKey!==token)return;
        const texture=new this.THREE.Texture(image);
        texture.colorSpace=this.THREE?.SRGBColorSpace||texture.colorSpace;
        texture.generateMipmaps=false;
        texture.minFilter=this.THREE?.LinearFilter||texture.minFilter;
        texture.magFilter=this.THREE?.LinearFilter||texture.magFilter;
        texture.needsUpdate=true;
        this.mapSurfaceTexture.dispose?.();
        this.mapSurfaceTexture=texture;
        this.mapSurface.material.map=texture;
        this.mapSurface.material.needsUpdate=true;
        // Marque a imagem final antes de sincronizar o relevo: a rotina de
        // sincronização usa este estado para preferir o mosaico satélite ao
        // fallback local e recalcular a máscara de vegetação.
        this.dataset.mapTexture='ready';
        this.syncPublicTerrainRelief?.();
        // Na apresentação pública a textura definitiva vive no relevo 3D.
        // Não reexiba o plano raster depois do upload, pois ele cobria o
        // terreno e tornava invisíveis a topografia e as árvores do entorno.
        this.mapSurface.visible=!this.isPublicMapVisual();
        this.dataset.mapSurfaceVisible=this.mapSurface.visible?'true':'false';
        this.dataset.mapTextureUpload='data-url-image';
        this.renderer?.render(this.scene,this.camera);
      };
      image.onerror=()=>{this.dataset.mapTexture='partial';this.dataset.mapTextureUpload='failed';};
      // JPEG introduzia blocos e borrava os limites dos lotes depois que a
      // textura era ampliada para preencher a cena. PNG mantém a nitidez dos
      // tiles sem alterar a geometria ou criar uma segunda camada de mapa.
      image.src=canvas.toDataURL('image/png');
    }catch(err){
      this.dataset.mapTexture='partial'; this.dataset.mapTextureUpload='canvas-fallback';
      this.mapSurfaceTexture.image=canvas; this.mapSurfaceTexture.needsUpdate=true; this.mapSurface.material.needsUpdate=true; this.renderer?.render(this.scene,this.camera);
      this.syncPublicTerrainRelief?.();
      console.warn('Upload da base cartográfica para WebGL falhou.',err);
    }
  }
  syncThree(){
    if(!this.renderer||!this.map||!this.map._loaded)return;
    const host=this.querySelector('.map-host'),w=host?.clientWidth,h=host?.clientHeight;
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<2||h<2)return;
    this.dataset.leafletZoom=String(this.map.getZoom());
    const mapCenter=this.map.getCenter(); this.dataset.leafletCenter=`${mapCenter.lat.toFixed(6)},${mapCenter.lng.toFixed(6)}`;
    this.configurePerspectiveCamera(w,h);
    const theme=viewThemes[MAP_CAMERA_VIEW]||viewThemes.assistant;
    this.dataset.themeCenter=`${theme.center[0]},${theme.center[1]}`; this.dataset.themeZoom=String(theme.zoom);
    // A instância do mapa permanece montada entre páginas e pode ter sido
    // deslocada desde o último tema. A base raster e o GLB precisam usar o
    // mesmo centro geográfico atual; reconstruir a textura com theme.center
    // deixava o loteamento preso ao centro antigo e aparentando estar no canto.
    const mapTheme={...theme,center:[mapCenter.lat,mapCenter.lng]};
    this.dataset.mapRenderCenter=`${mapCenter.lat.toFixed(6)},${mapCenter.lng.toFixed(6)}`;
    const panX=this.sceneUserInteracted?(Number(this.sceneManualPan?.x)||0):0,panY=this.sceneUserInteracted?(Number(this.sceneManualPan?.y)||0):0;
    this.sceneManualPan={x:panX,y:panY}; this.style.setProperty('--scene-pan-x',`${panX}px`); this.style.setProperty('--scene-pan-y',`${panY}px`); const baseCenterX=w/2,baseCenterY=h/2,centerX=baseCenterX,centerY=baseCenterY; let surfaceCenterX=centerX,surfaceCenterY=centerY; this.sceneBaseCenter={x:baseCenterX,y:baseCenterY}; this.dataset.scenePan=`${Math.round(panX)},${Math.round(panY)}`;
    // A apresentação pública pode ser vista em perspectiva; mantenha uma
    // margem de terreno bem maior que o viewport para nunca revelar o vazio
    // depois da borda do raster durante a inclinação.
    const publicTerrain=this.isPublicMapVisual();
    const surfaceCoverage=publicTerrain?4.2:SCENE_SURFACE_SCALE;
    const surfaceW=w*surfaceCoverage,surfaceH=h*surfaceCoverage; this.sceneSurfaceDimensions={width:surfaceW,height:surfaceH};
    this.dataset.mapSurfaceCoverage=String(surfaceCoverage);
    if(this.sceneStage){this.sceneSharedOrigin={x:centerX,y:centerY};this.sceneTransformOrigin={x:centerX+panX,y:centerY+panY};this.applySceneTransformAnchor(this._sceneVisual?.tilt||0,this._sceneVisual?.rotation||0,this._sceneVisual?.scale||1);this.configurePerspectiveCamera(w,h,this.sceneSharedOrigin.x,this.sceneSharedOrigin.y);}
    this.mapSurface.position.set(0,0,SCENE_MAP_Z); this.mapSurface.scale.set(surfaceW,surfaceH,1); this.dataset.mapSurfaceWorld=`${Math.round(surfaceW)}x${Math.round(surfaceH)} @ ${SCENE_MAP_Z}`; if(this.modelReady)this.applyMapRasterCentering(surfaceW,surfaceH);
    this.dataset.sceneComposition='map raster + GLB siblings · shared center/scale/tilt';
    if(this.modelGroup){
      const anchor=this.map.latLngToContainerPoint(L.latLng(Number(mapTheme.center[0]),Number(mapTheme.center[1])));
      if(Number.isFinite(anchor.x)&&Number.isFinite(anchor.y)){
        if(anchor.x===0&&anchor.y===0){anchor.x=w/2;anchor.y=h/2;}
        const anchorDeltaX=anchor.x-w/2,anchorDeltaY=anchor.y-h/2; this.dataset.mapModelAnchorOffset=`${anchorDeltaX.toFixed(3)},${anchorDeltaY.toFixed(3)}`;
        // Reset before recomputing the projected footprint correction. The map
        // and the model keep one shared scene transform; only the perspective
        // compensation is applied to the model's local XY position.
        this.modelGroup.position.set(0,0,0);
        if(this.masterplanModel&&this.masterplanLargest){
          const fitRatio=this.isPublicMapVisual()?MODEL_PUBLIC_FIT_RATIO:MODEL_FIT_RATIO;
          const frame=Math.min(w,h)*fitRatio,localFrameScale=frame/this.masterplanLargest; this.masterplanModel.scale.set(localFrameScale,localFrameScale*MODEL_VERTICAL_EXAGGERATION,localFrameScale); this.masterplanModel.updateMatrixWorld(true); this.dataset.modelFit=`${Math.round(frame)}px`; this.dataset.modelFitRatio=String(fitRatio); this.dataset.modelFitProfile=this.isPublicMapVisual()?'public-compact-1.10':'standard-1.32';
          const lat=Number(mapTheme.center[0]),metersPerPixel=this.masterplanLargest/frame,computedFitZoom=Math.max(12,Math.min(20,Math.round(Math.log2(156543.033928*Math.cos(lat*Math.PI/180)/metersPerPixel)))),stableFitZoom=Number(this.dataset.mapFitZoom)||computedFitZoom; this.dataset.mapFitZoom=String(stableFitZoom);
          const localScale=frame/this.masterplanLargest,sourceScale=this.modelSourceFootprint?.scale||localScale,footprint={x:(this.modelSourceFootprint?.x||this.masterplanLargest)*(localScale/sourceScale),y:(this.modelSourceFootprint?.y||this.masterplanLargest)*(localScale/sourceScale)},fitTheme={...mapTheme,zoom:Number(this.dataset.mapFitZoom)||mapTheme.zoom};
          // mapW/mapH são o retângulo geográfico que acompanha o footprint do
          // GLB. Sem essa declaração o reenquadramento lança ReferenceError e
          // o renderer fica preso no canvas inicial 450x225.
          // A base cartográfica pode ser maior que a janela, mas o framebuffer
          // WebGL nunca deve acompanhar essa sobressalência. Renderizá-lo no
          // tamanho da superfície (antes chegava a 7770×9766 px) perde o
          // contexto da GPU e deixa o dashboard branco. A câmera e o canvas
          // ficam no viewport; somente o plano dentro da cena recebe overscan.
          const sceneMapW=Math.max(w*SCENE_SURFACE_SCALE,footprint.x*1.18),sceneMapH=Math.max(h*SCENE_SURFACE_SCALE,footprint.y*1.18);
          surfaceCenterX=w/2; surfaceCenterY=h/2; this.sceneSurfaceDimensions={width:sceneMapW,height:sceneMapH}; this.dataset.mapOverscan=`${SCENE_SURFACE_SCALE.toFixed(2)}× viewport · ${MAP_TILE_OVERSCAN} tiles`;
          const overlay=this.querySelector('.three-overlay'); if(overlay){overlay.style.left='50%';overlay.style.top='50%';overlay.style.right='auto';overlay.style.bottom='auto';overlay.style.width='100%';overlay.style.height='100%';}
          this.renderer.setSize(w,h,false); this.sceneSharedOrigin={x:surfaceCenterX+anchorDeltaX,y:surfaceCenterY+anchorDeltaY}; this.sceneTransformOrigin={x:this.sceneSharedOrigin.x+panX,y:this.sceneSharedOrigin.y+panY}; if(this.sceneStage)this.applySceneTransformAnchor(this._sceneVisual?.tilt||0,this._sceneVisual?.rotation||0,this._sceneVisual?.scale||1); this.configurePerspectiveCamera(w,h,this.sceneSharedOrigin.x,this.sceneSharedOrigin.y);
          this.mapSurface.scale.set(sceneMapW,sceneMapH,1); this.dataset.mapSurfaceWorld=`${Math.round(sceneMapW)}x${Math.round(sceneMapH)} @ ${SCENE_MAP_Z}`;
          // A mudança de página altera apenas o enquadramento do shell. A
          // textura geográfica só deve ser reconstruída quando a posição/base
          // do mapa realmente mudou; caso contrário o GLB e o mapa continuam
          // sendo a mesma cena viva durante a navegação.
          const rasterSignature=`${this.mapTileMode||'satellite'}|${fitTheme.zoom}|${Number(mapTheme.center[0]).toFixed(6)}|${Number(mapTheme.center[1]).toFixed(6)}`;
          this.dataset.mapRasterSignature=rasterSignature;
          if(rasterSignature!==this._lastRasterSignature){this.refreshMapSurface(fitTheme,sceneMapW,sceneMapH);this.refreshOsmRaster(fitTheme,sceneMapW,sceneMapH);this._lastRasterSignature=rasterSignature;}else this.dataset.mapSurfaceReuse='true';
          this.applyMapRasterCentering(sceneMapW,sceneMapH); try{this.centerModelProjection();}catch(error){this.dataset.modelCenterProjection=`error · ${String(error?.message||error).slice(0,80)}`;console.warn('Falha ao centralizar o footprint do GLB.',error);} this.dataset.sceneFootprint=`${Math.round(footprint.x)}x${Math.round(footprint.y)}`; this.dataset.sceneMapScale=`${Math.round(sceneMapW)}x${Math.round(sceneMapH)}`; this.dataset.modelScreen=`centered · ${Math.round(footprint.x)}x${Math.round(footprint.y)}`;
          if(!this.initialSceneFocusApplied){this.sceneManualPan={x:0,y:0};this.style.setProperty('--scene-pan-x','0px');this.style.setProperty('--scene-pan-y','0px');this.dataset.scenePan='0,0';this.dataset.sceneFocus='Centro do loteamento';this.dataset.leisureFocus='0,0';this.initialSceneFocusApplied=true;}
        }
        this.modelGroup.updateMatrixWorld(true); this.modelGroup.visible=true;
        if(this.masterplanModel&&!this.dataset.modelOffset)this.dataset.modelOffset='0,0';
      }
    }
    const boundedPan=this.clampScenePan(this.sceneManualPan.x,this.sceneManualPan.y); if(boundedPan.x!==this.sceneManualPan.x||boundedPan.y!==this.sceneManualPan.y){this.sceneManualPan=boundedPan;this.style.setProperty('--scene-pan-x',`${boundedPan.x}px`);this.style.setProperty('--scene-pan-y',`${boundedPan.y}px`);this.dataset.scenePan=`${Math.round(boundedPan.x)},${Math.round(boundedPan.y)}`;if(this.sceneStage){const origin=this.sceneSharedOrigin||{x:centerX,y:centerY};this.sceneTransformOrigin={x:origin.x+boundedPan.x,y:origin.y+boundedPan.y};this.applySceneTransformAnchor(this._sceneVisual?.tilt||0,this._sceneVisual?.rotation||0,this._sceneVisual?.scale||1);}}
    for(const m of this.markerGroup?.children||[]){const p=this.map.latLngToContainerPoint(L.latLng(Number(m.userData.latlng[0]),Number(m.userData.latlng[1])));if(Number.isFinite(p.x)&&Number.isFinite(p.y))m.position.set(p.x-baseCenterX+surfaceCenterX,p.y-baseCenterY+surfaceCenterY,0);}
    this.syncPublicRoadOverlayTransforms?.();
    this.ensurePublicTerrainRelief?.();
    this.syncPublicTerrainRelief?.();
    this.updatePublicCommercialMarkers?.();
    // O enquadramento público é calculado depois que o footprint e o relevo
    // já foram atualizados. Assim, a primeira abertura também compensa a
    // perspectiva sem exigir uma nova navegação do visitante.
    if(publicTerrain&&this.masterplanModel)this.fitPublicGapView?.();
    this.updatePublicFocusFrame?.();
    this.renderer.render(this.scene,this.camera); if(this._modelGpuReady)syncCompactMapMirrors();
  }
  setTheme(view){
    const theme=viewThemes[view]||viewThemes.assistant; this.dataset.tint=theme.tint;
    if(this.modelGroup){this.modelGroup.rotation.set(0,0,0); this.modelGroup.visible=true;}
    const changingView=Boolean(this._themeView&&this._themeView!==view); this.applySceneView(view,changingView); this._themeView=view;
    // Keep the geographic surface mounted while the SPA changes pages.
    // Leaflet navigation here emitted move/resize events and rebuilt the
    // shared map texture on every transition, making the map appear to reload.
    this._lastTheme=view;
    this.classList.remove('theme-enter');
    this.dataset.themeTilt=`${theme.tilt}deg`;
    const label={assistant:'Execução atual',map:'Mapa geral',stages:'Cronograma',purchases:'Compras',inventory:'Materiais',leads:'Leads',collaborators:'Colaboradores',reports:'Indicadores',settings:'Configuração'}[view];
    const span=this.querySelector('.map-badge span'); if(span) span.textContent=this.dataset.selectedPart?`${this.dataset.selectedPart} · selecionado`:label;
  }
  setSceneVisual(tilt,rotation,scale){
    const publicPresentation=this.isPublicCameraPreset();
    const safeTilt=publicPresentation?Math.max(18,Math.min(26,Number(tilt)||22)):this.clampSceneTilt(Number(tilt)||0);
    this._sceneVisual={tilt:safeTilt,rotation,scale}; this.dataset.sceneTilt=`${Math.round(safeTilt)}deg`; this.dataset.sceneRotation=`${Math.round(Number(rotation)||0)}deg`; this.dataset.sceneZoom=String(scale);
    if(this.sceneStage){const pan=this.sceneManualPan||{x:0,y:0};this.sceneStage.rotation.set(0,0,0);this.sceneStage.scale.setScalar(Number(scale)||1);const origin=this.sceneSharedOrigin||this.sceneTransformOrigin||this.sceneVisualAnchor||{x:0,y:0};this.sceneTransformOrigin={x:origin.x+pan.x,y:origin.y+pan.y};this.applySceneTransformAnchor(safeTilt,rotation,scale);const host=this.querySelector('.map-host'),orbitX=Number.isFinite(Number(this.sceneSharedOrigin?.x))?Number(this.sceneSharedOrigin.x):(host?.clientWidth||2)/2,orbitY=Number.isFinite(Number(this.sceneSharedOrigin?.y))?Number(this.sceneSharedOrigin.y):(host?.clientHeight||2)/2;this.configurePerspectiveCamera(host?.clientWidth||2,host?.clientHeight||2,orbitX,orbitY);this.dataset.sceneTransform='Three.js shared world · map + GLB · camera orbit';this.dataset.sceneRotation=`${Math.round(Number(rotation)||0)}deg`;this.dataset.sceneTilt=`${Math.round(safeTilt)}deg`;}
    this.updatePublicCommercialMarkers?.();
    this.renderer?.render(this.scene,this.camera);
  }
  applySceneView(view,animate=true){
    // BELAVISTA_PUBLIC_CAMERA_V50: public presentation opens as a readable site plan.
    const theme=viewThemes[view]||viewThemes.assistant,publicPresentation=this.isPublicCameraPreset(),targetTilt=publicPresentation?22:this.clampSceneTilt((Number(theme.tilt)||18)+sceneTiltBoostForView(view)+this.sceneTiltAdjust),targetRotation=publicPresentation?0:(this.sceneManualRotation||0),targetScale=publicPresentation?1.62:(this.sceneManualZoom||DEFAULT_SCENE_ZOOM);
    if(publicPresentation){this.sceneManualRotation=0;this.sceneManualZoom=1.62;this.sceneTiltAdjust=0;this.sceneManualPan={x:0,y:0};this.sceneUserInteracted=true;this.style.setProperty('--scene-pan-x','0px');this.style.setProperty('--scene-pan-y','0px');this.dataset.scenePan='0,0';this.dataset.publicViewPreset='oblique-22deg-terrain-coverage-v55';}
    this.dataset.sceneTilt=`${targetTilt}deg`;
    const current=this._sceneVisual||{tilt:targetTilt,rotation:targetRotation,scale:targetScale};
    if(!this.sceneStage){this.setSceneVisual(targetTilt,targetRotation,targetScale);return;}
    // setSceneVisual already applies the shared transform and renders it.
    // Calling syncThree here rebuilt the tile composition during navigation.
    const finish=()=>{this.setSceneVisual(targetTilt,targetRotation,targetScale);this.constrainScenePan('view-transition');};
    if(!animate){finish();return;}
    const started=performance.now(),duration=460,token=Symbol('scene-transition');this._sceneTransition=token;
    const tick=now=>{if(this._sceneTransition!==token)return;const t=Math.min(1,(now-started)/duration),e=t*t*(3-2*t);this.setSceneVisual(current.tilt+(targetTilt-current.tilt)*e,current.rotation+(targetRotation-current.rotation)*e,current.scale+(targetScale-current.scale)*e);if(t<1)requestAnimationFrame(tick);else finish();};
    requestAnimationFrame(tick);
  }
  isAdminStandaloneInteractiveV5370(){
    return Boolean(
      this._adminStandaloneStageV5370&&
      this._adminStandaloneCameraV5370&&
      this._adminStandaloneRendererV5370
    );
  }
  adminStandaloneGroundPointV5370(clientX,clientY){
    const THREE=this.THREE,camera=this._adminStandaloneCameraV5370;
    const canvas=this.querySelector('.three-overlay'),rect=canvas?.getBoundingClientRect?.();
    if(!THREE||!camera||!canvas||!rect?.width||!rect?.height)return null;
    this._adminStandaloneRaycasterV5370??=new THREE.Raycaster();
    this._adminStandaloneGroundPlaneV5370??=
      new THREE.Plane(new THREE.Vector3(0,0,1),0);
    this._adminStandaloneNdcV5370??=new THREE.Vector2();
    this._adminStandaloneNdcV5370.set(
      ((Number(clientX)-rect.left)/rect.width)*2-1,
      -(((Number(clientY)-rect.top)/rect.height)*2-1)
    );
    camera.updateMatrixWorld(true);
    this._adminStandaloneRaycasterV5370.setFromCamera(
      this._adminStandaloneNdcV5370,
      camera
    );
    return this._adminStandaloneRaycasterV5370.ray.intersectPlane(
      this._adminStandaloneGroundPlaneV5370,
      new THREE.Vector3()
    );
  }
  adminStandalonePanBasisV5370(){
    const THREE=this.THREE,camera=this._adminStandaloneCameraV5370;
    if(!THREE||!camera)return null;
    camera.updateMatrixWorld(true);
    const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    right.z=0;up.z=0;
    if(right.lengthSq()<.0001||up.lengthSq()<.0001)return null;
    right.normalize();up.normalize();
    return {right,up};
  }
  adminStandaloneScreenPanDeltaV5370(dx=0,dy=0){
    const rect=this.querySelector('.three-overlay')?.getBoundingClientRect?.();
    const basis=this.adminStandalonePanBasisV5370();
    if(!rect?.width||!rect?.height||!basis){
      return {x:-(Number(dx)||0),y:Number(dy)||0,source:'standalone-heading-fallback'};
    }
    const camera=this._adminStandaloneCameraV5370,THREE=this.THREE;
    const distance=Math.max(
      1,
      camera.position.distanceTo(
        this._adminStandaloneFitCenterV5370||new THREE.Vector3()
      )
    );
    const halfFov=THREE.MathUtils.degToRad(camera.fov*.5);
    const worldPerPixel=(2*Math.tan(halfFov)*distance)/
      (Math.max(1,rect.height)*Math.max(.01,camera.zoom));
    const heading=(Number(this._adminStandaloneRotationV5370||0)*Math.PI)/180;
    const cos=Math.cos(heading),sin=Math.sin(heading);
    // Os controles descrevem o espaço do loteamento. Rotacionamos o vetor
    // da tela pelo heading atual antes de convertê-lo para a base horizontal
    // da câmera; assim “direita” continua coerente após girar o modelo.
    const sx=Number(dx)||0,sy=Number(dy)||0;
    const localX=-sx*cos+sy*sin,localY=sx*sin+sy*cos;
    const x=(basis.right.x*localX+basis.up.x*localY)*worldPerPixel;
    const y=(basis.right.y*localX+basis.up.y*localY)*worldPerPixel;
    return {x,y,source:'camera-ground · rotation-aware · standalone'};
  }
  getAdminStandalonePanBoundsV5370(){
    const THREE=this.THREE,camera=this._adminStandaloneCameraV5370;
    const stage=this._adminStandaloneStageV5370;
    const fitBox=this._adminStandaloneFitBoxV5370;
    const canvas=this.querySelector('.three-overlay'),rect=canvas?.getBoundingClientRect?.();
    if(!THREE||!camera||!stage||!fitBox||fitBox.isEmpty?.()){
      return {x:0,y:0,source:'standalone-safe-zero'};
    }
    const size=fitBox.getSize(new THREE.Vector3());
    const rotation=(Number(this._adminStandaloneRotationV5370||0)*Math.PI)/180;
    const cos=Math.abs(Math.cos(rotation)),sin=Math.abs(Math.sin(rotation));
    const surfaceHalfX=(size.x*cos+size.y*sin)/2;
    const surfaceHalfY=(size.x*sin+size.y*cos)/2;
    let visibleHalfX=surfaceHalfX,visibleHalfY=surfaceHalfY;
    if(rect?.width&&rect?.height){
      const corners=[
        [rect.left,rect.top],[rect.right,rect.top],
        [rect.right,rect.bottom],[rect.left,rect.bottom]
      ].map(([x,y])=>this.adminStandaloneGroundPointV5370(x,y))
        .filter(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y));
      if(corners.length===4){
        visibleHalfX=Math.max(...corners.map(point=>Math.abs(point.x)));
        visibleHalfY=Math.max(...corners.map(point=>Math.abs(point.y)));
      }
    }
    // A pequena folga evita encostar a borda renderizada no limite do
    // viewport. O resultado é deliberadamente conservador: se a câmera
    // mostrar mais chão que o modelo, o pan é reduzido a zero naquele eixo.
    const x=Math.max(0,(surfaceHalfX-visibleHalfX)*.92);
    const y=Math.max(0,(surfaceHalfY-visibleHalfY)*.92);
    const bounds={x,y,source:'standalone-fit-envelope · rotation-safe'};
    this.dataset.scenePanSpace=`world-translation · zoom-aware · ${bounds.source}`;
    this.dataset.scenePanBounds=`±${Math.round(x)},±${Math.round(y)}`;
    return bounds;
  }
  clampAdminStandalonePanV5370(x,y){
    const bounds=this.getAdminStandalonePanBoundsV5370();
    const target={
      x:Math.max(-bounds.x,Math.min(bounds.x,Number(x)||0)),
      y:Math.max(-bounds.y,Math.min(bounds.y,Number(y)||0))
    };
    this.dataset.scenePanClamped=
      target.x!==Number(x)||target.y!==Number(y)?'true':'false';
    return target;
  }
  setAdminStandalonePanV5370(x,y,animate=true){
    const stage=this._adminStandaloneStageV5370;
    if(!stage)return;
    const target=this.clampAdminStandalonePanV5370(x,y);
    const previous=this.sceneManualPan||{x:0,y:0};
    this.sceneManualPan=target;
    stage.position.x=target.x;
    stage.position.y=target.y;
    this.sceneUserInteracted=true;
    this.dataset.scenePan=`${Math.round(target.x)},${Math.round(target.y)}`;
    this.dataset.sceneWorldTranslation=
      `${stage.position.x.toFixed(2)},${stage.position.y.toFixed(2)},0`;
    this.dataset.scenePanDirection=this.dataset.scenePanDirection||'standalone';
    this.rememberMapView();
    this._adminStandaloneRendererV5370.render(
      this._adminStandaloneSceneV5370,
      this._adminStandaloneCameraV5370
    );
    if(animate&&(
      target.x!==previous.x||target.y!==previous.y
    ))this.dataset.scenePanAnimation='settled';
    return target;
  }
  setAdminStandaloneRotationV5370(degrees,animate=true){
    const stage=this._adminStandaloneStageV5370;
    if(!stage)return;
    const normalized=((Number(degrees)%360)+540)%360-180;
    const apply=rotation=>{
      stage.rotation.z=(Number(rotation)||0)*Math.PI/180;
      this._adminStandaloneRotationV5370=Number(rotation)||0;
      this.sceneManualRotation=Number(rotation)||0;
      const targetPan=this.clampAdminStandalonePanV5370(
        this.sceneManualPan?.x||0,
        this.sceneManualPan?.y||0
      );
      this.sceneManualPan=targetPan;
      stage.position.x=targetPan.x;stage.position.y=targetPan.y;
      this.dataset.sceneRotation=`${Math.round(Number(rotation)||0)}deg`;
      this.dataset.sceneRotationBehavior=
        'horizontal orbit · fixed pitch · standalone terrain pivot';
      this.dataset.scenePan=`${Math.round(targetPan.x)},${Math.round(targetPan.y)}`;
      this._adminStandaloneRendererV5370.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370
      );
    };
    if(!animate){apply(normalized);this.rememberMapView();return;}
    const started=performance.now(),from=Number(this._adminStandaloneRotationV5370||0);
    const delta=((normalized-from+540)%360)-180,token=Symbol('standalone-rotation');
    this._adminStandaloneTransitionV5370=token;
    const tick=now=>{
      if(this._adminStandaloneTransitionV5370!==token)return;
      const t=Math.min(1,(now-started)/320),e=t*t*(3-2*t);
      apply(from+delta*e);
      if(t<1)requestAnimationFrame(tick);
      else {apply(normalized);this.rememberMapView();}
    };
    requestAnimationFrame(tick);
  }
  setAdminStandaloneZoomV5370(value,animate=true){
    const camera=this._adminStandaloneCameraV5370;
    if(!camera)return;
    const target=Math.max(.45,Math.min(4.5,Number(value)||1));
    const from=Math.max(.45,Math.min(4.5,Number(camera.zoom)||1));
    const apply=zoom=>{
      camera.zoom=Math.max(.45,Math.min(4.5,Number(zoom)||1));
      camera.updateProjectionMatrix();
      this.sceneManualZoom=camera.zoom;
      this.dataset.sceneZoom=`${Math.round(camera.zoom*100)}%`;
      this.clampAdminStandalonePanV5370(
        this.sceneManualPan?.x||0,
        this.sceneManualPan?.y||0
      );
      this.setAdminStandalonePanV5370(
        this.sceneManualPan?.x||0,
        this.sceneManualPan?.y||0,
        false
      );
    };
    if(!animate){apply(target);this.rememberMapView();return;}
    const started=performance.now(),token=Symbol('standalone-zoom');
    this._adminStandaloneTransitionV5370=token;
    const tick=now=>{
      if(this._adminStandaloneTransitionV5370!==token)return;
      const t=Math.min(1,(now-started)/240),e=t*t*(3-2*t);
      apply(from+(target-from)*e);
      if(t<1)requestAnimationFrame(tick);
      else {apply(target);this.rememberMapView();}
    };
    requestAnimationFrame(tick);
  }
  setSceneRotation(degrees,animate=true){
    this.markAdminCameraInteracted();
    const normalized=((Number(degrees)%360)+540)%360-180; this.sceneManualRotation=normalized; this.dataset.sceneRotation=`${Math.round(normalized)}deg`;
    this.rememberMapView();
    if(this.isAdminStandaloneInteractiveV5370()){
      this.setAdminStandaloneRotationV5370(normalized,animate);
      return;
    }
    if(!this.sceneStage)return; const start=this._sceneVisual?.rotation||0,holdTilt=this._sceneVisual?.tilt||Number.parseFloat(this.dataset.sceneTilt)||40,holdScale=this._sceneVisual?.scale||this.sceneManualZoom;
    this.dataset.sceneRotationBehavior='horizontal orbit · fixed pitch · terrain pivot';
    if(!animate){this._sceneTransition=Symbol('manual-rotation');this.setSceneVisual(holdTilt,normalized,holdScale);return;}
    const started=performance.now(),duration=420,token=Symbol('manual-rotation');this._sceneTransition=token;const tick=now=>{if(this._sceneTransition!==token)return;const t=Math.min(1,(now-started)/duration),e=t*t*(3-2*t);this.setSceneVisual(holdTilt,start+(normalized-start)*e,holdScale);if(t<1)requestAnimationFrame(tick);else this.constrainScenePan('rotation-finish');};requestAnimationFrame(tick);
  }
  getScenePanBounds(){
    const host=this.querySelector('.map-host');
    const viewportW=Math.max(1,host?.clientWidth||1280);
    const viewportH=Math.max(1,host?.clientHeight||800);
    const surface=this.sceneSurfaceDimensions||{
      width:viewportW*SCENE_SURFACE_SCALE,
      height:viewportH*SCENE_SURFACE_SCALE
    };
    const scale=Math.max(.01,Number(this._sceneVisual?.scale||this.sceneManualZoom)||DEFAULT_SCENE_ZOOM);
    const tilt=this.clampSceneTilt(Number(this._sceneVisual?.tilt)||DEFAULT_TILT_BOOST);
    // Quanto maior a inclinação, maior fica a deformação perspectiva nas
    // bordas. Reduzimos o deslocamento permitido de forma conservadora para
    // que o plano cartográfico continue cobrindo o viewport inteiro.
    const tiltSafety=1+Math.sin(tilt*Math.PI/180)*.58;
    const visibleLocalW=viewportW/scale;
    const visibleLocalH=viewportH/scale;
    // sceneStage.position is a world translation, while its children are
    // scaled by `scale`. The usable pan therefore follows the rendered
    // coverage (surface * zoom), not the unscaled/local footprint.
    let visibleWorldHalfW=viewportW*tiltSafety/2;
    let visibleWorldHalfH=viewportH*tiltSafety/2;
    // A rotação altera a projeção horizontal da área vista. Reserve uma
    // margem adicional próxima de 45° para não permitir que o raster/terreno
    // apareça deslocado além da borda enquanto a câmera estiver orbitada.
    const heading=Math.abs(Math.sin((Number(this._sceneVisual?.rotation ?? this.sceneManualRotation)||0)*Math.PI/90));
    const rotationSafety=1+heading*.12;
    let panBoundsSource='tilt-heuristic';
    // In perspective, the ground footprint seen by the viewport grows with
    // the camera inclination. Measure the four screen corners on the actual
    // ground plane when the camera is ready, then reserve a small overscan so
    // dragging never exposes the edge of the raster or the empty background.
    const canvas=this.querySelector('.three-overlay'),rect=canvas?.getBoundingClientRect?.();
    if(this.THREE&&this.camera&&canvas&&rect?.width&&rect?.height){
      this.camera.updateMatrixWorld?.();
      const origin=this.sceneSharedOrigin||{x:viewportW/2,y:viewportH/2};
      const corners=[[rect.left,rect.top],[rect.right,rect.top],[rect.right,rect.bottom],[rect.left,rect.bottom]];
      const footprint=corners.map(([x,y])=>this.screenPointOnMapPlane(x,y)).filter(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y));
      if(footprint.length===corners.length){
        visibleWorldHalfW=Math.max(...footprint.map(point=>Math.abs(point.x-origin.x)))*SCENE_PAN_SAFETY*rotationSafety;
        visibleWorldHalfH=Math.max(...footprint.map(point=>Math.abs(point.y-origin.y)))*SCENE_PAN_SAFETY*rotationSafety;
        // Preserve the public source label used by diagnostics while the
        // rotation-safe envelope remains expressed by `rotationSafety` above.
        panBoundsSource='camera-ground-envelope';
      }
    }
    const panX=Math.max(0,Number(surface.width||viewportW)*scale/2-visibleWorldHalfW);
    const panY=Math.max(0,Number(surface.height||viewportH)*scale/2-visibleWorldHalfH);
    this.dataset.scenePanSpace=`world-translation · zoom-aware · ${panBoundsSource}`;
    this.dataset.sceneVisibleTerrain=`${Math.round(visibleLocalW)}x${Math.round(visibleLocalH)}`;
    this.dataset.sceneTerrain=`${Math.round(surface.width)}x${Math.round(surface.height)}`;
    return {
      x:panX,y:panY,
      surfaceW:Number(surface.width)||viewportW,
      surfaceH:Number(surface.height)||viewportH,
      coveredW:(Number(surface.width)||viewportW)*scale,
      coveredH:(Number(surface.height)||viewportH)*scale,
      visibleLocalW,visibleLocalH,visibleWorldHalfW,visibleWorldHalfH,tiltProjection:1/tiltSafety,tiltSafety,rotationSafety,panBoundsSource
    };
  }
  clampScenePan(x,y){
    const bounds=this.isAdminStandaloneInteractiveV5370()
      ? this.getAdminStandalonePanBoundsV5370()
      : this.getScenePanBounds();
    const target={x:Math.max(-bounds.x,Math.min(bounds.x,Number(x)||0)),y:Math.max(-bounds.y,Math.min(bounds.y,Number(y)||0))};
    this.dataset.scenePanBounds=`±${Math.round(bounds.x)},±${Math.round(bounds.y)}`; this.dataset.scenePanClamped=target.x!==Number(x)||target.y!==Number(y)?'true':'false'; return target;
  }
  queueSceneBoundsCommit(reason='gesture'){
    clearTimeout(this._sceneBoundsCommitTimer);
    this._sceneBoundsCommitTimer=setTimeout(()=>this.constrainScenePan(reason),140);
  }
  constrainScenePan(reason='release'){
    const previous=this.sceneManualPan||{x:0,y:0},target=this.clampScenePan(previous.x,previous.y);
    this.dataset.sceneBoundsCommit=reason;
    if(target.x===previous.x&&target.y===previous.y)return target;
    this.sceneManualPan=target; this.style.setProperty('--scene-pan-x',`${target.x}px`); this.style.setProperty('--scene-pan-y',`${target.y}px`); this.dataset.scenePan=`${Math.round(target.x)},${Math.round(target.y)}`;
    if(this.isAdminStandaloneInteractiveV5370()){
      this._adminStandaloneStageV5370.position.x=target.x;
      this._adminStandaloneStageV5370.position.y=target.y;
      this._adminStandaloneRendererV5370.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370
      );
      this.rememberMapView();
      return target;
    }
    if(this.sceneStage){const origin=this.sceneSharedOrigin||{x:this.sceneStage.position.x-previous.x,y:this.sceneStage.position.y-previous.y};this.sceneTransformOrigin={x:origin.x+target.x,y:origin.y+target.y};this.applySceneTransformAnchor(this._sceneVisual?.tilt||0,this._sceneVisual?.rotation||0,this._sceneVisual?.scale||1);this.renderer?.render(this.scene,this.camera);}
    this.rememberMapView(); return target;
  }
  // BELAVISTA_MAP_PAN_ROTATION_V511
  // Pan de tela -> plano do mapa. Usa ray/plane para respeitar heading, tilt, zoom e FOV atuais.
  screenPointOnMapPlane(clientX,clientY){
    if(this.isAdminStandaloneInteractiveV5370()){
      return this.adminStandaloneGroundPointV5370(clientX,clientY);
    }
    if(!this.THREE||!this.camera)return null;
    const canvas=this.querySelector('.three-overlay'),rect=canvas?.getBoundingClientRect?.();
    if(!canvas||!rect||!rect.width||!rect.height)return null;
    this._panRaycaster??=new this.THREE.Raycaster();
    this._panGroundPlane??=new this.THREE.Plane(new this.THREE.Vector3(0,0,1),0);
    this._panNdc??=new this.THREE.Vector2();
    const nx=((Number(clientX)-rect.left)/rect.width)*2-1,ny=-(((Number(clientY)-rect.top)/rect.height)*2-1);
    this._panNdc.set(nx,ny);
    this._panRaycaster.setFromCamera(this._panNdc,this.camera);
    return this._panRaycaster.ray.intersectPlane(this._panGroundPlane,new this.THREE.Vector3());
  }
  screenDragPanDelta(fromX,fromY,toX,toY){
    const a=this.screenPointOnMapPlane(fromX,fromY),b=this.screenPointOnMapPlane(toX,toY);
    // sceneStage.position recebe uma translação mundial. O raio já devolve
    // exatamente esse delta no plano do terreno; não dividir pelo zoom evita
    // que o mapa ande pouco quando aproximado.
    if(a&&b&&Number.isFinite(a.x)&&Number.isFinite(b.x))return {x:b.x-a.x,y:b.y-a.y,source:'ray-plane-world'};
    const heading=((Number(this._sceneVisual?.rotation ?? this.sceneManualRotation)||0)*Math.PI)/180,cos=Math.cos(heading),sin=Math.sin(heading),dx=(Number(toX)||0)-(Number(fromX)||0),dy=(Number(toY)||0)-(Number(fromY)||0);
    // Fallback em base de câmera: direita da tela = (-cos,+sin); baixo = (+sin,+cos).
    return {x:-dx*cos+dy*sin,y:dx*sin+dy*cos,source:'heading'};
  }
  screenDragPanDeltaFromVector(dx=0,dy=0){
    const rect=this.querySelector('.three-overlay')?.getBoundingClientRect?.();
    if(rect?.width&&rect?.height){
      const centerX=(rect.left+rect.right)/2;
      const centerY=(rect.top+rect.bottom)/2;
      const from=this.screenPointOnMapPlane(centerX,centerY);
      const to=this.screenPointOnMapPlane(
        centerX+(Number(dx)||0),
        centerY+(Number(dy)||0)
      );
      if(from&&to&&Number.isFinite(from.x)&&Number.isFinite(from.y)&&Number.isFinite(to.x)&&Number.isFinite(to.y)){
        // The ray already includes the current camera heading, pitch and
        // zoom. Do not rotate this result a second time: in the standalone
        // renderer that would apply the stage heading twice, while in the
        // shared renderer it would desynchronise arrow controls from drag.
        return {
          x:to.x-from.x,
          y:to.y-from.y,
          source:this.isAdminStandaloneInteractiveV5370()
            ?'camera-ground · rotation-aware · standalone'
            :'camera-ground · rotation-aware'
        };
      }
    }
    const heading=((Number(this._sceneVisual?.rotation ?? this.sceneManualRotation)||0)*Math.PI)/180,cos=Math.cos(heading),sin=Math.sin(heading),sx=Number(dx)||0,sy=Number(dy)||0;
    return {x:-sx*cos+sy*sin,y:sx*sin+sy*cos,source:'heading-world-fallback'};
  }
  applyScreenPanFromPointer(fromX,fromY,toX,toY,animate=false){
    const delta=this.screenDragPanDelta(fromX,fromY,toX,toY),pan=this.sceneManualPan||{x:0,y:0};
    this.dataset.mapPanVector=delta.source;
    this.setScenePan(pan.x+delta.x,pan.y+delta.y,animate);
    return delta;
  }
  setScenePan(x,y,animate=true){
    this.markAdminCameraInteracted();
    if(this.isAdminStandaloneInteractiveV5370()){
      this.setAdminStandalonePanV5370(x,y,animate);
      return;
    }
    const previous=this.sceneManualPan||{x:0,y:0},requested={x:Number(x)||0,y:Number(y)||0},target=this.clampScenePan(requested.x,requested.y); this.sceneUserInteracted=true; this.sceneManualPan=target; this.dataset.scenePan=`${Math.round(target.x)},${Math.round(target.y)}`;
    this.rememberMapView();
    if(!this.sceneStage){return;}
    // O pan é uma transformação da cena inteira. Recalcular o modelo via Leaflet
    // aqui fazia o mapa e o GLB percorrerem coordenadas diferentes durante o drag.
    this.style.setProperty('--scene-pan-x',`${target.x}px`); this.style.setProperty('--scene-pan-y',`${target.y}px`);
    // Recompose the complete world translation from one immutable origin. This
    // avoids accumulating rounding/drift when Leaflet or the camera resizes
    // between pointer events. Every child (map plane, GLB, markers and
    // selection halo) follows the same Three.js group coordinates.
    const origin=this.sceneSharedOrigin||{x:this.sceneStage.position.x-previous.x,y:this.sceneStage.position.y-previous.y};
    this.sceneTransformOrigin={x:origin.x+target.x,y:origin.y+target.y}; this.applySceneTransformAnchor(this._sceneVisual?.tilt||0,this._sceneVisual?.rotation||0,this._sceneVisual?.scale||1);
    this.dataset.sceneWorldTranslation=`${this.sceneStage.position.x.toFixed(2)},${this.sceneStage.position.y.toFixed(2)},${SCENE_MAP_Z}`;
    this.renderer?.render(this.scene,this.camera); if(animate)this.constrainScenePan('pan-control');
  }
  nudgeScenePan(direction,animate=true){
    const screenStep=Math.max(44,Math.min(96,(this.querySelector('.three-overlay')?.clientWidth||960)*.07));
    const screenVector={up:[0,-screenStep],down:[0,screenStep],left:[-screenStep,0],right:[screenStep,0]}[direction]||[0,0];
    // Botões e gestos devem usar a mesma base da câmera. Assim, após girar
    // o loteamento, "direita" continua deslocando para a direita da tela,
    // em vez de continuar preso aos eixos globais X/Y do modelo.
    const delta=this.screenDragPanDeltaFromVector(screenVector[0],screenVector[1]);
    const pan=this.sceneManualPan||{x:0,y:0};
    this.dataset.scenePanDirection=`${direction} · ${delta.source}`;
    this.setScenePan(pan.x+(Number(delta.x)||0),pan.y+(Number(delta.y)||0),animate);
  }
  setSceneZoom(value,animate=true){
    this.markAdminCameraInteracted();
    const target=Math.max(.9,Math.min(MAX_SCENE_ZOOM,Number(value)||DEFAULT_SCENE_ZOOM)); this.sceneManualZoom=target; this.dataset.sceneZoom=`${Math.round(target*100)}%`; this.dataset.sceneZoomMax=`${Math.round(MAX_SCENE_ZOOM*100)}%`;
    this.rememberMapView();
    if(this.isAdminStandaloneInteractiveV5370()){
      this.setAdminStandaloneZoomV5370(target,animate);
      return;
    }
    if(!this.sceneStage)return; const start=this._sceneVisual?.scale||1,targetScale=target; if(!animate){this._sceneTransition=Symbol('manual-zoom');this.setSceneVisual(this._sceneVisual?.tilt||40,this._sceneVisual?.rotation||0,targetScale);return;}
    const started=performance.now(),duration=320,token=Symbol('manual-zoom');this._sceneTransition=token;const tick=now=>{if(this._sceneTransition!==token)return;const t=Math.min(1,(now-started)/duration),e=t*t*(3-2*t);this.setSceneVisual(this._sceneVisual?.tilt||40,this._sceneVisual?.rotation||0,start+(targetScale-start)*e);if(t<1)requestAnimationFrame(tick);else this.syncThree();};requestAnimationFrame(tick);
  }
  getSceneTiltBounds(){
    const mapSurface=this.sceneSurfaceDimensions||{};
    const host=this.querySelector('.map-host');
    const viewportW=Math.max(1,host?.clientWidth||1280),viewportH=Math.max(1,host?.clientHeight||800);
    const scale=Math.max(.01,Number(this._sceneVisual?.scale||this.sceneManualZoom)||DEFAULT_SCENE_ZOOM);
    const coverageW=(Number(mapSurface.width)||viewportW*SCENE_SURFACE_SCALE)*scale/viewportW;
    const coverageH=(Number(mapSurface.height)||viewportH*SCENE_SURFACE_SCALE)*scale/viewportH;
    const coverage=Math.min(coverageW,coverageH);
    // A cobertura extra permite uma perspectiva oblíqua, mas nunca libera a
    // câmera até o horizonte: o teto é deliberadamente menor que 90 graus.
    const coverageMax=coverage>=3.2?MAX_SCENE_TILT:coverage>=2.4?44:38;
    return {min:MIN_SCENE_TILT,max:Math.min(MAX_SCENE_TILT,coverageMax)};
  }
  clampSceneTilt(value){
    const bounds=this.getSceneTiltBounds?.()||{min:MIN_SCENE_TILT,max:MAX_SCENE_TILT};
    return Math.max(bounds.min,Math.min(bounds.max,Number(value)||0));
  }
  setSceneTiltAdjust(value,animate=true){
    const wasPublicPresentation=this.isPublicCameraPreset();
    const previousAdjust=Number(this.sceneTiltAdjust)||0;
    const previousTilt=Number(this._sceneVisual?.tilt)||22;
    this.markAdminCameraInteracted();
    const theme=viewThemes[MAP_CAMERA_VIEW]||viewThemes.assistant;
    const base=(Number(theme.tilt)||18)+sceneTiltBoostForView(MAP_CAMERA_VIEW);
    const bounds=this.getSceneTiltBounds();
    const requestedAdjust=Math.max(-SCENE_TILT_ADJUST_LIMIT,Math.min(SCENE_TILT_ADJUST_LIMIT,Number(value)||0));
    const target=Math.max(bounds.min,Math.min(bounds.max,wasPublicPresentation?previousTilt+(requestedAdjust-previousAdjust):base+requestedAdjust));
    this.sceneTiltAdjust=target-base;
    this.dataset.sceneTiltBounds=`${bounds.min}–${bounds.max}deg`;
    this.dataset.sceneTiltControl='ctrl-mouse';
    this.rememberMapView();
    this.applySceneView(MAP_CAMERA_VIEW,animate);
  }
  rememberMapView(){clearTimeout(this._mapMemoryTimer);this._mapMemoryTimer=setTimeout(()=>appStore.update(s=>({...s,mapView:{sceneVersion:MAP_SCENE_STATE_VERSION,rotation:this.sceneManualRotation||0,zoom:this.sceneManualZoom||INITIAL_SCENE_ZOOM,pan:{x:this.sceneManualPan?.x||0,y:this.sceneManualPan?.y||0},tiltAdjust:this.sceneTiltAdjust||0}})),120);}
  updatePublicFocusFrame(){
    if(!this.isPublicCustomerExperience?.()||!this.THREE||!this.camera||!this.sceneStage||!this.masterplanModel)return false;
    const canvas=this.querySelector('.three-overlay'),width=Math.max(1,canvas?.clientWidth||this.clientWidth||window.innerWidth),height=Math.max(1,canvas?.clientHeight||this.clientHeight||window.innerHeight);
    const THREE=this.THREE;
    try{
      this.camera.updateMatrixWorld(true);this.sceneStage.updateMatrixWorld(true);this.masterplanModel.updateWorldMatrix?.(true,true);
      const box=new THREE.Box3().setFromObject(this.masterplanModel);if(box.isEmpty())return false;
      const points=[];
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        const point=new THREE.Vector3(x,y,z).project(this.camera);
        points.push({x:(point.x+1)*width/2,y:(-point.y+1)*height/2});
      }
      const minX=Math.min(...points.map(point=>point.x)),maxX=Math.max(...points.map(point=>point.x));
      const minY=Math.min(...points.map(point=>point.y)),maxY=Math.max(...points.map(point=>point.y));
      const padX=Math.max(18,Math.min(42,width*.024)),padY=Math.max(18,Math.min(44,height*.028));
      const frameWidth=Math.min(width*.86,Math.max(180,maxX-minX+padX*2));
      const frameHeight=Math.min(height*.88,Math.max(150,maxY-minY+padY*2));
      const centerX=Math.max(frameWidth/2,Math.min(width-frameWidth/2,(minX+maxX)/2));
      const centerY=Math.max(frameHeight/2,Math.min(height-frameHeight/2,(minY+maxY)/2));
      this.style.setProperty('--public-focus-x',`${centerX.toFixed(1)}px`);
      this.style.setProperty('--public-focus-y',`${centerY.toFixed(1)}px`);
      this.style.setProperty('--public-focus-w',`${frameWidth.toFixed(1)}px`);
      this.style.setProperty('--public-focus-h',`${frameHeight.toFixed(1)}px`);
      this.dataset.publicFocusFrame=`${Math.round(centerX)},${Math.round(centerY)},${Math.round(frameWidth)},${Math.round(frameHeight)}`;
      this.dataset.publicFocusFrameSource='projected loteamento footprint';
      return true;
    }catch(error){
      this.dataset.publicFocusFrameStatus=`error · ${String(error?.message||error).slice(0,80)}`;
      return false;
    }
  }
  fitPublicGapView(){
    if(!this.isPublicCustomerExperience()||!this.THREE||!this.camera||!this.sceneStage||!this.masterplanModel)return false;
    const canvas=this.querySelector('.three-overlay'),width=Math.max(1,canvas?.clientWidth||this.clientWidth||window.innerWidth),height=Math.max(1,canvas?.clientHeight||this.clientHeight||window.innerHeight);
    const visible=element=>{if(!element)return null;const style=getComputedStyle(element),rect=element.getBoundingClientRect();if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity||1)<.05||rect.width<2||rect.height<2)return null;return rect;};
    const hero=visible(document.querySelector('.public-hero-letter')),chat=visible(document.querySelector('public-lead-chat .public-chatbox'));
    const mobile=width<=900;
    const margin=Math.max(18,Math.min(44,width*.026));
    let left=mobile?width*.08:(hero?.right??width*.22)+margin;
    let right=mobile?width*.92:(chat?.left??width*.78)-margin;
    if(!mobile&&right-left<180){left=width*.26;right=width*.78;}
    const gapWidth=Math.max(180,right-left),targetX=mobile?width/2:(left+right)/2,targetY=height*.50;
    const visualTilt=Number(this._sceneVisual?.tilt||22);
    const signature=[Math.round(width),Math.round(height),Math.round(left),Math.round(right),Math.round(visualTilt*10),document.body.dataset.publicScrollSection||'title'].join('|');
    if(this.dataset.publicGapFrame===signature)return false;
    this.dataset.publicGapFrame=signature;
    this.dataset.publicGapFrameRect=`${Math.round(left)},${Math.round(height*.08)},${Math.round(gapWidth)},${Math.round(height*.84)}`;
    this.dataset.publicGapFrameSource=mobile?'viewport-mobile':hero&&chat?'hero-right · chat-left':'public-safe-corridor';

    const THREE=this.THREE;
    const projection=()=>{
      this.camera.updateMatrixWorld(true);this.sceneStage.updateMatrixWorld(true);this.masterplanModel.updateWorldMatrix?.(true,true);
      const box=new THREE.Box3().setFromObject(this.masterplanModel);if(box.isEmpty())return null;
      const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const point=new THREE.Vector3(x,y,z).project(this.camera);points.push({x:(point.x+1)*width/2,y:(-point.y+1)*height/2,depth:point.z});}
      const xs=points.map(point=>point.x),ys=points.map(point=>point.y),center=box.getCenter(new THREE.Vector3()).project(this.camera);
      return {box,screen:{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys),centerX:(center.x+1)*width/2,centerY:(-center.y+1)*height/2,depth:center.z}};
    };
    const before=projection();if(!before)return false;
    const currentScale=Math.max(.01,Number(this._sceneVisual?.scale||this.sceneManualZoom||1.62));
    // Quanto mais oblíqua a câmera, maior é a distorção vertical projetada.
    // A compensação cresce de forma suave com a inclinação para preencher o
    // corredor sem revelar o vazio acima do terreno.
    const tiltCompensation=1+Math.max(0,visualTilt-18)*.018;
    const targetWidth=Math.max(360,Math.min(width*.82,gapWidth*2.7*tiltCompensation)),targetHeight=Math.min(height*.94,height*.86*tiltCompensation);
    const currentWidth=Math.max(1,before.screen.right-before.screen.left),currentHeight=Math.max(1,before.screen.bottom-before.screen.top);
    const ratio=Math.max(.82,Math.min(1.55,Math.min(targetWidth/currentWidth,targetHeight/currentHeight)));
    const targetScale=Math.max(1.2,Math.min(3.6,currentScale*ratio));
    this.sceneManualZoom=targetScale;this.sceneUserInteracted=true;this.dataset.sceneZoom=String(targetScale);this.dataset.publicGapFrameZoom=targetScale.toFixed(3);this.dataset.publicGapFrameTilt=String(visualTilt);this.dataset.publicTiltZoomCompensation=tiltCompensation.toFixed(3);
    const visual=this._sceneVisual||{};
    this.setSceneVisual(Number(visual.tilt||22),0,targetScale);
    const afterScale=projection();
    if(afterScale){
      // A correção usa o centro do corredor livre, não o centro da viewport.
      // Isso impede que o loteamento seja empurrado para baixo do chat quando
      // o letreiro ainda está visível.
      const projectedTarget=new THREE.Vector3(targetX/width*2-1,-(targetY/height*2-1),afterScale.screen.depth).unproject(this.camera);
      const worldCenter=afterScale.box.getCenter(new THREE.Vector3()),delta=projectedTarget.sub(worldCenter);
      const pan=this.sceneManualPan||{x:0,y:0};
      const nextPan={x:(Number(pan.x)||0)+delta.x,y:(Number(pan.y)||0)+delta.y};
      this.sceneManualPan=nextPan;this.style.setProperty('--scene-pan-x',`${nextPan.x}px`);this.style.setProperty('--scene-pan-y',`${nextPan.y}px`);this.dataset.scenePan=`${Math.round(nextPan.x)},${Math.round(nextPan.y)}`;
      this.setSceneVisual(Number(visual.tilt||22),0,targetScale);
    }
    this.updatePublicFocusFrame?.();
    this.dataset.publicGapFrameTarget=`${Math.round(targetX)},${Math.round(targetY)}`;
    this.dataset.publicGapFrameModel=`${Math.round(currentWidth)}x${Math.round(currentHeight)} → ${Math.round(targetWidth)}x${Math.round(targetHeight)}`;
    this.dataset.publicGapFrameStatus='fitted-between-letter-and-chat';
    this.renderer?.render(this.scene,this.camera);
    return true;
  }
  fitSceneView(animate=true){
    this.markAdminCameraInteracted();
    this.sceneManualRotation=0;
    this.sceneManualZoom=this.isAdminStandaloneInteractiveV5370()
      ? 1
      : DEFAULT_SCENE_ZOOM;
    this.sceneManualPan={x:0,y:0};
    this.sceneTiltAdjust=0;
    this.rememberMapView();
    this.dataset.sceneRotation='0deg';
    this.dataset.sceneZoom=`${Math.round(this.sceneManualZoom*100)}%`;
    this.dataset.scenePan='0,0';
    this.style.setProperty('--scene-pan-x','0px');
    this.style.setProperty('--scene-pan-y','0px');
    if(this.isAdminStandaloneInteractiveV5370()){
      this._adminStandaloneTransitionV5370=Symbol('standalone-fit');
      // O enquadramento é uma ação de recuperação: aplicar os três valores
      // no mesmo frame evita que as animações de rotação/zoom se cancelem.
      this.setAdminStandaloneRotationV5370(0,false);
      this.setAdminStandaloneZoomV5370(1,false);
      this.setAdminStandalonePanV5370(0,0,false);
      return;
    }
    this.applySceneView(MAP_CAMERA_VIEW,animate);
    if(animate)setTimeout(()=>this.syncThree(),520);
  }
}
// A tilt is a visual transform of the already-loaded shared scene. It must not
// ask Leaflet or the tile compositor to rebuild the OpenStreet surface.
MapScene.prototype.setSceneTiltAdjust=function(value,animate=true){
  const wasPublicPresentation=this.isPublicCameraPreset();
  const previousAdjust=Number(this.sceneTiltAdjust)||0;
  const previousTilt=Number(this._sceneVisual?.tilt)||22;
  this.markAdminCameraInteracted?.();
  const view=MAP_CAMERA_VIEW;
  const theme=viewThemes[view]||viewThemes.assistant;
  const publicPresentation=this.isPublicCameraPreset();
  const base=(Number(theme.tilt)||18)+sceneTiltBoostForView(view);
  const requestedAdjust=Math.max(-SCENE_TILT_ADJUST_LIMIT,Math.min(SCENE_TILT_ADJUST_LIMIT,Number(value)||0));
  const bounds=this.getSceneTiltBounds?.()||{min:MIN_SCENE_TILT,max:MAX_SCENE_TILT};
  const targetTilt=publicPresentation?22:Math.max(bounds.min,Math.min(bounds.max,wasPublicPresentation?previousTilt+(requestedAdjust-previousAdjust):base+requestedAdjust));
  this.sceneTiltAdjust=publicPresentation?0:targetTilt-base;
  this.dataset.sceneTiltBounds=`${bounds.min}–${bounds.max}deg`;
  this.dataset.sceneTiltControl='ctrl-mouse';
  this.rememberMapView?.();
  this.dataset.sceneTilt=`${targetTilt}deg`;
  const current=this._sceneVisual||{tilt:targetTilt,rotation:this.sceneManualRotation||0,scale:this.sceneManualZoom||DEFAULT_SCENE_ZOOM};
  if(!animate){this._sceneTransition=Symbol('manual-tilt');this.setSceneVisual(targetTilt,current.rotation,current.scale);return;}
  const started=performance.now(),duration=320,token=Symbol('manual-tilt');this._sceneTransition=token;
  const tick=now=>{if(this._sceneTransition!==token)return;const t=Math.min(1,(now-started)/duration),e=t*t*(3-2*t);this.setSceneVisual(current.tilt+(targetTilt-current.tilt)*e,current.rotation,current.scale);if(t<1)requestAnimationFrame(tick);else this.constrainScenePan('tilt-finish');};
  requestAnimationFrame(tick);
};

// Keep the map/model instance alive while the SPA swaps view-layer content.
const mapSceneSetTheme = MapScene.prototype.setTheme;
MapScene.prototype.setTheme=function(view){
  if(this._themeView===view && this._mapSceneThemeGuard===view)return;
  this._mapSceneThemeGuard=view;
  this.setMapContext(view);
  const result=mapSceneSetTheme.call(this,view);
  // A cena é persistente, mas sua janela muda de tamanho conforme a página.
  // Reposicionamos apenas o enquadramento WebGL no centro do novo painel —
  // sem recriar tiles, GLB ou qualquer camada de mapa.
  if(['records','agenda','activities','progress'].includes(view)){
    requestAnimationFrame(()=>requestAnimationFrame(()=>this.centerSceneInContext()));
  }
  return result;
};
MapScene.prototype.setMapContext=function(view){
  this.dataset.mapContext=view;
  const badge=this.querySelector('.map-badge'),category=this.querySelector('.map-category-switcher'),rotation=this.querySelector('.map-rotation-controls'),legend=this.querySelector('.map-gesture-legend'),solar=this.querySelector('.map-solar-control');
  // Controles pertencem à cena persistente. Nas superfícies que trabalham
  // diretamente sobre o mapa eles continuam visíveis e capturam input acima
  // do view-layer; páginas administrativas continuam sem o HUD do mapa.
  const interactiveMapViews=new Set(['assistant','map','records']);
  if(solar)solar.hidden=!['assistant','map','records','leads'].includes(view);
  if(category)category.hidden=!interactiveMapViews.has(view);
  if(rotation)rotation.hidden=!interactiveMapViews.has(view);
  if(legend)legend.hidden=!['assistant','map','records','leads'].includes(view);
  if(badge){
    badge.hidden=!['assistant','map','records','leads'].includes(view);
    const label=badge.querySelector('span');
    if(label)label.textContent=view==='records'?'Pintura de progresso · use o formulário do registro':view==='leads'?'Mapa comercial · OpenStreet + lotes 3D':view==='assistant'||view==='map'?'Consulta de status · arraste para selecionar':'Mapa contextual';
  }
};
MapScene.prototype.centerSceneInContext=function(){
  if(this._contextSceneRefreshPending)return;
  this._contextSceneRefreshPending=true;
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      this._contextSceneRefreshPending=false;
      const host=this.querySelector('.map-host');
      const width=Math.max(1,Math.round(host?.clientWidth||0));
      const height=Math.max(1,Math.round(host?.clientHeight||0));
      const key=`${width}x${height}`;
      if(this._lastContextSceneSize===key){
        this.renderer?.render?.(this.scene,this.camera);
        return;
      }
      this._lastContextSceneSize=key;
      this.map?.invalidateSize?.({pan:false,debounceMoveend:true});
      this.syncThree?.();
      this.renderer?.render?.(this.scene,this.camera);
      publishMapPreview();
    });
  });
};


// BELAVISTA_3D_LOOP_BREAKER_V5366
const __belavistaSyncThreeV5366=MapScene.prototype.syncThree;
MapScene.prototype.syncThree=function(...args){
  const stats=globalThis.__BELAVISTA_3D_LOOP_GUARD__??={
    version:'5.3.66',
    syncCalls:0,
    syncDroppedReentrant:0,
    syncDroppedBurst:0,
    compactCalls:0,
    compactDroppedReentrant:0,
    startedAt:performance.now()
  };

  stats.syncCalls++;

  if(this._syncThreeBusyV5366){
    stats.syncDroppedReentrant++;
    this.dataset.syncThreeGuard='reentrant-dropped';
    return;
  }

  const now=performance.now();
  if(this._lastSyncThreeV5366 && now-this._lastSyncThreeV5366<24){
    stats.syncDroppedBurst++;
    this.dataset.syncThreeGuard='burst-dropped';
    return;
  }

  this._lastSyncThreeV5366=now;
  this._syncThreeBusyV5366=true;
  try{
    return __belavistaSyncThreeV5366.apply(this,args);
  }finally{
    this._syncThreeBusyV5366=false;
  }
};

const __belavistaRenderSharedMapV5366=MapScene.prototype.renderSharedMap;
MapScene.prototype.renderSharedMap=function(...args){
  const stats=globalThis.__BELAVISTA_3D_LOOP_GUARD__??={
    version:'5.3.66',
    syncCalls:0,
    syncDroppedReentrant:0,
    syncDroppedBurst:0,
    compactCalls:0,
    compactDroppedReentrant:0,
    startedAt:performance.now()
  };

  stats.compactCalls++;

  if(this._compactRenderBusyV5366){
    stats.compactDroppedReentrant++;
    this.dataset.compactRenderGuard='reentrant-dropped';
    return;
  }

  const now=performance.now();
  if(this._lastCompactRenderV5366 && now-this._lastCompactRenderV5366<33){
    this.dataset.compactRenderGuard='burst-dropped';
    return;
  }

  this._lastCompactRenderV5366=now;
  this._compactRenderBusyV5366=true;
  try{
    return __belavistaRenderSharedMapV5366.apply(this,args);
  }finally{
    this._compactRenderBusyV5366=false;
  }
};

if(!customElements.get('map-scene')) customElements.define('map-scene', MapScene);

// Métricas persistentes: o shell cria este componente uma única vez. As
// páginas de relatório apenas alternam sua visibilidade e os valores, sem
// desmontar/recriar a estrutura de KPI durante a navegação ou a impressão.
export class ReportMetrics extends HTMLElement {
  connectedCallback(){
    if(this._mounted)return;
    this._mounted=true;
    this.dataset.lifecycle='persistent-mounted';
    this.innerHTML=`
      <section class="persistent-report-grid" aria-label="Métricas do relatório">
        ${[0,1,2,3].map(index=>`<article data-report-metric="${index}"><small data-report-metric-label></small><strong data-report-metric-value></strong><span data-report-metric-sub></span></article>`).join('')}
      </section>
      <section class="map-print-progress report-metrics-map" aria-label="Evolução do loteamento">
        <div class="map-print-progress-head">
          <div><span class="activity-kind">IMPLANTAÇÃO E VALORIZAÇÃO</span><h2>Evolução que transforma o território</h2><p>O avanço das frentes de infraestrutura acompanha a consolidação do Aliança Park e amplia a leitura de valor de cada área do empreendimento.</p></div>
          <span class="map-print-date" data-report-metric-date></span>
        </div>
        <div class="map-print-meter-grid">${demoData.activities.map((item,index)=>`<article class="map-print-meter" data-progress-meter="${index}"><div class="map-print-meter-head"><span data-progress-name></span><strong data-progress-value></strong></div><div class="map-print-meter-track"><i data-progress-track></i></div><small data-progress-sub></small></article>`).join('')}</div>
      </section>
      <section class="map-print-business map-print-financial" aria-label="Panorama financeiro do empreendimento">
        <header class="map-print-section-head"><div><span class="activity-kind">VALOR E DESEMPENHO</span><h2>Potencial financeiro do empreendimento</h2><p>Indicadores que conectam implantação, geração de receita e capacidade de valorização do loteamento.</p></div></header>
        <div class="map-print-kpi-grid">
          <article><small>Receita reconhecida</small><strong data-fin-revenue>—</strong><span>resultado acumulado do período</span></article>
          <article><small>Resultado operacional</small><strong data-fin-result>—</strong><span>desempenho gerencial acumulado</span></article>
          <article><small>Saldo projetado</small><strong data-fin-balance>—</strong><span>capacidade remanescente de implantação</span></article>
          <article><small>Ticket médio</small><strong data-fin-ticket>—</strong><span>valor observado nas intenções comerciais</span></article>
        </div>
        <div class="map-print-financial-lines" data-financial-lines></div>
      </section>
      <section class="map-print-business map-print-commercial" aria-label="Intenções, leads e vendas">
        <header class="map-print-section-head"><div><span class="activity-kind">DEMANDA E CONVERSÃO</span><h2>Intenções, leads e vendas</h2><p>O interesse comercial revela os perfis de compra, os lotes mais desejados e o movimento de conversão em negócios.</p></div></header>
        <div class="map-print-kpi-grid map-print-commercial-kpis">
          <article><small>Intenções registradas</small><strong data-commercial-leads>—</strong><span>pessoas interessadas no período</span></article>
          <article><small>Lotes com procura</small><strong data-commercial-lots>—</strong><span>distribuição da demanda no mapa</span></article>
          <article><small>Leads qualificados</small><strong data-commercial-qualified>—</strong><span>oportunidades com maior aderência</span></article>
          <article><small>Vendas assinadas</small><strong data-commercial-signed>—</strong><span>negócios formalizados na carteira</span></article>
        </div>
        <div class="map-print-commercial-grid">
          <article class="map-print-intent-profile"><span class="activity-kind">PERFIL DE INTENÇÃO</span><h3>Como o público pretende ocupar o Aliança Park</h3><div data-intent-bars></div></article>
          <article class="map-print-sales-snapshot"><span class="activity-kind">MOVIMENTO DE VENDAS</span><h3>Negócios recentes</h3><div data-sales-snapshot></div></article>
        </div>
      </section>`;
    this._unsubscribe=appStore.subscribe(()=>this.update());
    this.update();
  }
  disconnectedCallback(){this._unsubscribe?.();}
  update(){
    const state=appStore.get(),families=[...new Set(reportCatalog.map(report=>report.family))],family=families.includes(state.reportFamily)?state.reportFamily:families[0],types=reportCatalog.filter(report=>report.family===family),selected=types.find(report=>report.id===state.reportType)||types[0],metrics=(selected?.metrics||[]).slice(0,4);
    this.dataset.context=state.printMode?'map':state.view==='reports'?'reports':'hidden';
    this.dataset.reportType=selected?.id||'';
    this.querySelectorAll('[data-report-metric]').forEach((card,index)=>{const metric=metrics[index]||['—','—',''];card.querySelector('[data-report-metric-label]').textContent=metric[0];card.querySelector('[data-report-metric-value]').textContent=metric[1];card.querySelector('[data-report-metric-sub]').textContent=metric[2];});
    this.querySelector('[data-report-metric-date]')?.replaceChildren(document.createTextNode(`${new Date().toLocaleDateString('pt-BR')} · panorama consolidado`));
    this.querySelectorAll('[data-progress-meter]').forEach((meter,index)=>{const item=demoData.activities[index];if(!item)return;meter.querySelector('[data-progress-name]').textContent=item.name;meter.querySelector('[data-progress-value]').textContent=`${item.progress}%`;meter.querySelector('[data-progress-track]').style.width=`${item.progress}%`;meter.querySelector('[data-progress-sub]').textContent=`${item.week} · ${item.status==='andamento'?'Em evolução':item.status==='concluido'?'Entregue':'Próxima frente'}`;});

    const financialBalance=reportCatalog.find(report=>report.id==='financial-balance'),income=reportCatalog.find(report=>report.id==='income-statement'),salesMix=reportCatalog.find(report=>report.id==='sales-mix'),commercial=reportCatalog.find(report=>report.id==='commercial-funnel');
    const setText=(selector,value)=>{const node=this.querySelector(selector);if(node)node.textContent=value||'—';};
    setText('[data-fin-revenue]',income?.metrics?.[0]?.[1]);
    setText('[data-fin-result]',income?.rows?.find(row=>/resultado operacional/i.test(row[0]))?.[2]||'R$ 1,06M');
    setText('[data-fin-balance]',financialBalance?.metrics?.[3]?.[1]);
    setText('[data-fin-ticket]',salesMix?.metrics?.[1]?.[1]);
    const financialLines=this.querySelector('[data-financial-lines]');
    if(financialLines)financialLines.innerHTML=(financialBalance?.rows||[]).slice(0,4).map(row=>`<div><b>${esc(row[0])}</b><span>${esc(row[1])} previstos</span><strong>${esc(row[2])}</strong><small>${esc(row[4])}</small></div>`).join('');

    const localDeals=state.commissionEntries||[],hidden=new Set(state.commissionHiddenIds||[]),deals=[...commissionDeals,...localDeals].filter(item=>!hidden.has(item.id)),signed=deals.filter(item=>String(item.status).toLowerCase()==='assinado');
    setText('[data-commercial-leads]',String(demoData.metrics.leads));
    setText('[data-commercial-lots]',String(demoData.metrics.lotsWithInterest));
    setText('[data-commercial-qualified]',commercial?.metrics?.[1]?.[1]||'37');
    setText('[data-commercial-signed]',String(signed.length));
    const intent=this.querySelector('[data-intent-bars]'),mixRows=(salesMix?.rows||[]).filter(row=>!/^total$/i.test(row[0])).slice(0,3);
    if(intent)intent.innerHTML=mixRows.map(row=>{const pct=Number(String(row[2]).replace(',','.').replace(/[^0-9.]/g,''))||0;return `<div class="intent-bar"><div><b>${esc(row[0])}</b><span>${esc(row[1])} leads · ${esc(row[3])}</span><strong>${esc(row[2])}</strong></div><i><b style="width:${Math.min(100,pct)}%"></b></i></div>`;}).join('');
    const snapshot=this.querySelector('[data-sales-snapshot]'),recent=deals.slice().sort((a,b)=>Date.parse(String(b.date||'').split('/').reverse().join('-'))-Date.parse(String(a.date||'').split('/').reverse().join('-'))).slice(0,4);
    if(snapshot)snapshot.innerHTML=`<div class="sales-value-line"><span><small>Valor da carteira acompanhada</small><b>${formatBRL(deals.reduce((sum,item)=>sum+brlToNumber(item.value),0))}</b></span><span><small>Conversão lead → proposta</small><b>${commercial?.metrics?.[3]?.[1]||'8,4%'}</b></span></div>${recent.map(item=>`<div class="sales-report-row"><span><b>${esc(item.lot)}</b><small>${esc(item.client)}</small></span><strong>${esc(item.value)}</strong><em>${esc(item.status)}</em></div>`).join('')}`;
  }
}
if(!customElements.get('report-metrics')) customElements.define('report-metrics', ReportMetrics);

const statusClass = s => String(s).toLowerCase().replaceAll(' ','-').normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export class ViewLayer extends HTMLElement {
  bindWorkflowFieldTrees(){const canvas=this.querySelector('.dedicated-canvas');if(!canvas)return;canvas.querySelectorAll('.workflow-card').forEach((card,index)=>{if(card.dataset.treeBound)return;card.dataset.treeBound='true';card.addEventListener('click',()=>{const item=activityCatalog[index%activityCatalog.length],old=canvas.querySelector('.workflow-tree');old?.remove();const tree=document.createElement('aside');tree.className='workflow-tree';tree.innerHTML=`<button class="detail-close">×</button><span class="activity-kind">ÁRVORE DE PREENCHIMENTO · ${item.nature.toUpperCase()}</span><h3>${item.name}</h3><p>Preencha os dados iniciais e avance pelos ramos de execução relacionados.</p><div class="tree-branch"><b>01 · Dados iniciais</b>${item.initial.map((f)=>`<label>${f}<input placeholder="Preencher ${f.toLowerCase()}"></label>`).join('')}</div><div class="tree-branch"><b>02 · Execução e evidências</b>${item.execution.map(f=>`<label>${f}<input placeholder="Registrar ${f.toLowerCase()}"></label>`).join('')}</div><div class="tree-branch"><b>03 · Associações administrativas</b><label>Responsável<select><option>Selecionar envolvido</option><option>Carlos Mendes</option><option>Paula Nascimento</option><option>Mariana Lopes</option></select></label><label>Compra associada<input placeholder="ID do pedido / fornecedor"></label><label>Material associado<input placeholder="Material · quantidade · unidade"></label><label>Comprovante<input type="file"></label></div><button class="tree-save">Salvar preenchimento</button>`;canvas.appendChild(tree);tree.querySelector('.detail-close').onclick=()=>tree.remove();tree.querySelector('.tree-save').onclick=()=>{notify(`${item.name}: preenchimento salvo.`,'success');appStore.set({lastAction:`Preencheu ${item.name}`});tree.remove();};});});}
  bindCatalogButtons(){const canvas=this.querySelector('.dedicated-canvas');canvas?.querySelectorAll('.activity-palette [data-kind]').forEach(button=>{if(button.dataset.bound)return;button.dataset.bound='true';button.addEventListener('click',()=>{const item=activityCatalog.find(x=>x.name===button.dataset.addWork),card=document.createElement('button');card.className='dedicated-activity workflow-card';card.dataset.nodeId=`workflow-${Date.now()}`;card.style.left='24px';card.style.top='420px';card.style.width='150px';card.innerHTML=`<span class="activity-kind">${item.nature.toUpperCase()}</span><strong>${item.name}</strong><small>${item.initial.slice(0,2).join(' · ')}</small><em>Preencher campos →</em><span class="surface-port">●</span><span class="surface-resize"></span>`;canvas.appendChild(card);this.makeSurfaceDrag(card,canvas);this.bindGhostConnections();notify(`${item.name} adicionada com campos iniciais.`,'success');});});}
  addCatalogPalette(){const palette=this.querySelector('.activity-palette');if(!palette||palette.dataset.catalog)return;palette.dataset.catalog='true';const title=document.createElement('b');title.textContent='Catálogo de atividades de obra';palette.appendChild(title);activityCatalog.forEach((item,i)=>{const b=document.createElement('button');b.dataset.addWork=item.name;b.dataset.kind=item.nature;b.textContent=`${item.nature} · ${item.name}`;b.title=`Inicial: ${item.initial.join(' · ')} | Execução: ${item.execution.join(' · ')}`;palette.appendChild(b);});}
  watchSurfaceRelations(){const canvas=this.querySelector('.dedicated-canvas');if(canvas&&!canvas.dataset.relationWatch){canvas.dataset.relationWatch='true';canvas.addEventListener('pointerup',()=>setTimeout(()=>this.drawSurfaceRelations(canvas),0));}}
  drawSurfaceRelations(canvas){
    const svg=canvas.querySelector('.surface-edges');
    if(!svg)return;
    svg.innerHTML='';
    canvas.querySelectorAll('.surface-edge-label').forEach(x=>x.remove());
    const relationLabels=['depende de','libera','bloqueia','precede','alimenta','gera','valida','aguarda','associa'];
    const cardOptions=activityCatalog.map(item=>`Criar card de · ${item.name}`);
    canvas.querySelectorAll('.surface-relation').forEach(relation=>{
      const from=canvas.querySelector(`[data-node-id="${relation.dataset.from}"]`),to=canvas.querySelector(`[data-node-id="${relation.dataset.to}"]`);
      if(!from||!to)return;
      const x1=from.offsetLeft+from.offsetWidth,y1=from.offsetTop+from.offsetHeight/2,x2=to.offsetLeft,y2=to.offsetTop+to.offsetHeight/2,bend=Math.max(50,(x2-x1)/2);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}`);
      path.classList.add('surface-edge');
      svg.appendChild(path);
      const editor=document.createElement('label');
      editor.className='surface-edge-label';
      editor.style.left=`${(x1+x2)/2-76}px`;
      editor.style.top=`${(y1+y2)/2-14}px`;
      const input=document.createElement('input');
      input.type='text'; input.value=relation.dataset.label||'depende de'; input.placeholder='Rotular relação…'; input.setAttribute('list',`relation-options-${Date.now()}-${Math.round(Math.random()*1000)}`);
      const list=document.createElement('datalist'); list.id=input.getAttribute('list');
      [...relationLabels,...cardOptions].forEach(value=>{const option=document.createElement('option');option.value=value;list.appendChild(option);});
      editor.append(input,list); canvas.appendChild(editor);
      const apply=()=>{
        const value=input.value.trim();
        if(!value)return;
        const prefix='Criar card de · ';
        if(value.startsWith(prefix)){
          const item=activityCatalog.find(entry=>`Criar card de · ${entry.name}`===value);
          this.insertConnectedActivityCard(canvas,relation,from,to,item||activityCatalog[0]);
          return;
        }
        relation.dataset.label=value;
        this.drawSurfaceRelations(canvas);
      };
      input.addEventListener('change',apply);
      input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();apply();}if(event.key==='Escape'){input.value=relation.dataset.label||'depende de';input.blur();}});
      ['pointerdown','pointerup','mousedown','mouseup','click','dblclick'].forEach(type=>input.addEventListener(type,event=>event.stopPropagation()));
      editor.addEventListener('pointerdown',event=>event.stopPropagation());
    });
  }
  insertConnectedActivityCard(canvas,relation,from,to,item){
    if(!from||!to||!item)return;
    const card=document.createElement('button');
    card.type='button'; card.className='dedicated-activity workflow-card';
    card.dataset.nodeId=`workflow-${Date.now()}-${Math.round(Math.random()*1000)}`;
    card.dataset.hours='4'; card.style.width='176px';
    card.style.left=`${Math.max(12,Math.round((from.offsetLeft+from.offsetWidth+to.offsetLeft-176)/2))}px`;
    card.style.top=`${Math.max(76,Math.round((from.offsetTop+to.offsetTop)/2-24))}px`;
    card.innerHTML=`<span class="activity-kind">${esc(item.nature||'ATIVIDADE')}</span><strong>${esc(item.name)}</strong><small>${esc(item.initial?.slice(0,2).join(' · ')||'Dados iniciais a preencher')}</small><em>Card intermediário →</em><span class="surface-port" title="Conectar atividade">●</span><span class="surface-resize" title="Ajustar duração"></span>`;
    relation.remove(); canvas.appendChild(card);
    const first=document.createElement('span'); first.className='surface-relation'; first.dataset.from=from.dataset.nodeId; first.dataset.to=card.dataset.nodeId; first.dataset.label='gera'; canvas.appendChild(first);
    const second=document.createElement('span'); second.className='surface-relation'; second.dataset.from=card.dataset.nodeId; second.dataset.to=to.dataset.nodeId; second.dataset.label='alimenta'; canvas.appendChild(second);
    this.makeSurfaceDrag(card,canvas); this.bindWorkflowFieldTrees(); this.drawSurfaceRelations(canvas);
    notify(`Card intermediário ${item.name} criado e conectado.`,'success');
  }
  bindGhostConnections(){const canvas=this.querySelector('.dedicated-canvas');if(!canvas)return;canvas.querySelectorAll('.surface-port').forEach(port=>port.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const source=port.closest('.workflow-card'),ghost=document.createElement('div');ghost.className='connection-ghost';ghost.textContent='Nova atividade';canvas.appendChild(ghost);const move=ev=>{const r=canvas.getBoundingClientRect();ghost.style.left=`${ev.clientX-r.left+10}px`;ghost.style.top=`${ev.clientY-r.top+10}px`;};const up=ev=>{const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.workflow-card');ghost.remove();port.releasePointerCapture?.(e.pointerId);port.removeEventListener('pointermove',move);port.removeEventListener('pointerup',up);if(target&&target!==source){const rel=document.createElement('span');rel.className='surface-relation';rel.dataset.from=source.dataset.nodeId;rel.dataset.to=target.dataset.nodeId;rel.dataset.label='depende de';notify('Relacionamento criado entre atividades.','success');}else{const form=document.createElement('form');form.className='workflow-drop-form';form.innerHTML='<b>Nova atividade</b><input required placeholder="Nome da atividade"><input type="number" min="0.5" step="0.5" placeholder="Horas previstas"><button>Adicionar ao canvas</button>';form.style.left=`${Math.max(12,ev.clientX-canvas.getBoundingClientRect().left)}px`;form.style.top=`${Math.max(72,ev.clientY-canvas.getBoundingClientRect().top)}px`;form.onsubmit=event=>{event.preventDefault();const fd=new FormData(form),card=document.createElement('button');card.className='dedicated-activity workflow-card';card.dataset.nodeId=`workflow-${Date.now()}`;card.style.left=form.style.left;card.style.top=form.style.top;card.style.width='130px';card.innerHTML=`<span class="activity-kind">NOVA ATIVIDADE</span><strong>${esc(fd.get('nome'))}</strong><small>${fd.get('horas')||'1'} hora(s) previstas</small><span class="surface-port">●</span><span class="surface-resize"></span>`;form.replaceWith(card);this.makeSurfaceDrag(card,canvas);this.bindGhostConnections();notify('Card de atividade criado para preenchimento.','success');};canvas.appendChild(form);form.querySelector('input')?.focus();}};port.setPointerCapture?.(e.pointerId);port.addEventListener('pointermove',move);port.addEventListener('pointerup',up);},{once:true}));}
  addFineDurationControls(){this.querySelectorAll('.dedicated-canvas .surface-resize').forEach(handle=>{handle.addEventListener('pointerdown',e=>{const card=handle.closest('.workflow-card'),startW=card.offsetWidth,startX=e.clientX;const move=ev=>{const hours=Math.max(1,Math.round((startW+ev.clientX-startX)/25));card.dataset.hours=String(hours);card.dataset.duration=`${Math.floor(hours/8)}d ${hours%8}h`;};const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);notify(`Duração: ${card.dataset.duration}.`);};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);});});}
  records(){const s=appStore.get(),editing=s.records.find(r=>r.id===s.editingRecord),rows=s.records.map(r=>`<article class="record-card"><div><span class="record-id">${r.id}</span><strong>${r.atividade}</strong><small>${r.data} · ${r.hora} · ${r.responsavel}</small></div><span class="record-status">${r.status}</span><div class="record-actions"><button data-record-edit="${r.id}">Editar</button><button data-record-delete="${r.id}">Excluir</button></div></article>`).join('');return `<div class="records-page"><div class="records-map-wash"></div><div class="records-shell"><div class="records-head"><div><span class="activity-kind">REGISTROS OPERACIONAIS</span><h1>Registros</h1><p>Obra → atividade → evidência → responsável → confirmação.</p></div><button class="records-new">＋ Novo registro</button></div><div class="records-layout"><section class="records-list"><div class="records-list-head"><b>${s.records.length} registros</b><small>SQLite local · entidades relacionais</small></div>${rows||'<div class="empty-records">Nenhum registro cadastrado.</div>'}</section><aside class="records-form-wrap ${editing?'open':''}"><form class="record-form"><h2>${editing?'Editar registro':'Adicionar registro'}</h2><label>Obra<select name="obra"><option>Aliança Park</option><option>Aliança Park</option></select></label><label>Atividade<select name="atividade"><option>Drenagem Pluvial</option><option>Pavimentação</option><option>Rede de Água</option><option>Rede Elétrica</option></select></label><div class="form-pair"><label>Data<input name="data" type="date" value="${editing?.data||new Date().toISOString().slice(0,10)}"></label><label>Hora<input name="hora" type="time" value="${editing?.hora||'08:30'}"></label></div><label>Responsável<input name="responsavel" value="${editing?.responsavel||''}" placeholder="Nome do envolvido"></label><label>Detalhes<textarea name="detalhes" placeholder="Descreva a evidência, medição ou ocorrência">${editing?.detalhes||''}</textarea></label><label>Status<select name="status"><option ${editing?.status==='Pendente'?'selected':''}>Pendente</option><option ${editing?.status==='Concluído'?'selected':''}>Concluído</option></select></label><button class="record-confirm">${editing?'Salvar alterações':'Confirmar registro'}</button>${editing?'<button type="button" class="record-cancel">Cancelar</button>':''}</form></aside></div><div class="phone-preview"><div class="phone-frame"><div class="phone-notch"></div><div class="phone-screen"><b>Registros</b>${s.records.slice(0,3).map(r=>`<div><small>${r.data} · ${r.hora}</small><strong>${r.atividade}</strong><span>${r.status}</span></div>`).join('')}</div></div><small>Prévia da interface mobile</small></div></div></div>`;}
  enhanceDedicatedSurface(){const canvas=this.querySelector('.dedicated-canvas');if(!canvas||canvas.dataset.calendarized)return;canvas.dataset.calendarized='true';const days=['03/06','04/06','05/06','06/06','07/06','08/06','09/06','10/06','11/06','12/06','13/06','14/06'];canvas.insertAdjacentHTML('afterbegin',`<div class="surface-days">${days.map((d,i)=>`<span><b>D${i+1}</b><small>${d}</small></span>`).join('')}</div><div class="surface-toolbar"><span class="activity-kind">GRADE DE PLANEJAMENTO · 12 DIAS</span><button class="add-activity-sequence">＋ Adicionar atividade</button></div><svg class="surface-edges" aria-hidden="true"></svg><div class="activity-palette" hidden><b>Adicionar ao cronograma</b>${['Lançamento de gasto','Agendar fornecedor','Registrar material','Designar responsável','Medição de avanço','Aprovar pagamento','Enviar agenda WhatsApp','Criar alerta','Anexar documento','Conferir orçamento','Atualizar indicador','Fechar atividade'].map((x,i)=>`<button data-add-work="${x}" data-kind="${i%3===0?'ADMINISTRAÇÃO':i%3===1?'CAMPO':'CONTROLE'}">${x}</button>`).join('')}</div>`);const nodes=[...canvas.querySelectorAll('.workflow-card')];nodes.forEach((card,i)=>{card.dataset.nodeId=`workflow-${i}`;card.dataset.duration=String((i%4)+1);card.style.left=`${24+i*130}px`;card.style.top=`${105+(i%2)*130}px`;card.style.width=`${100+(i%4)*34}px`;card.insertAdjacentHTML('beforeend',`<span class="surface-port" title="Conectar atividade">●</span><span class="surface-resize" title="Ajustar duração"></span>`);this.makeSurfaceDrag(card,canvas);});let source=null;const draw=()=>{const svg=canvas.querySelector('.surface-edges');svg.innerHTML='';const relations=[...canvas.querySelectorAll('.surface-relation')];relations.forEach(r=>{const a=canvas.querySelector(`[data-node-id="${r.dataset.from}"]`),b=canvas.querySelector(`[data-node-id="${r.dataset.to}"]`);if(!a||!b)return;const x1=a.offsetLeft+a.offsetWidth,y1=a.offsetTop+a.offsetHeight/2,x2=b.offsetLeft,y2=b.offsetTop+b.offsetHeight/2,bend=Math.max(50,(x2-x1)/2);const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}`);path.classList.add('surface-edge');svg.appendChild(path);const label=document.createElement('button');label.className='surface-edge-label';label.style.left=`${(x1+x2)/2-45}px`;label.style.top=`${(y1+y2)/2-12}px`;label.textContent=r.dataset.label;label.onclick=()=>{const next=prompt('Rótulo da relação:',r.dataset.label);if(next?.trim()){r.dataset.label=next.trim();draw();}};canvas.appendChild(label);});};canvas.querySelectorAll('.surface-port').forEach(port=>port.addEventListener('click',e=>{e.stopPropagation();const card=port.closest('.workflow-card');if(!source){source=card;card.classList.add('relation-source');notify('Origem selecionada. Clique no ponto de outra atividade.');return;}if(source!==card){const relation=document.createElement('span');relation.className='surface-relation';relation.dataset.from=source.dataset.nodeId;relation.dataset.to=card.dataset.nodeId;relation.dataset.label='libera';canvas.appendChild(relation);source.classList.remove('relation-source');source=null;draw();notify('Atividades relacionadas por linha rotulada.','success');}}));canvas.querySelector('.add-activity-sequence').addEventListener('click',()=>canvas.querySelector('.activity-palette').toggleAttribute('hidden'));canvas.querySelectorAll('[data-add-work]').forEach(button=>button.addEventListener('click',()=>{const card=document.createElement('button');card.className='dedicated-activity workflow-card';card.dataset.nodeId=`workflow-${Date.now()}`;card.dataset.duration='1';card.style.left='24px';card.style.top='420px';card.style.width='130px';card.innerHTML=`<span class="activity-kind">${button.dataset.kind}</span><strong>${button.dataset.addWork}</strong><small>Dia previsto · responsável a definir</small><em>Fluxo da etapa →</em><span class="surface-port">●</span><span class="surface-resize"></span>`;canvas.appendChild(card);this.makeSurfaceDrag(card,canvas);canvas.querySelector('.activity-palette').hidden=true;notify('Atividade adicionada à superfície.','success');}));draw();}
  makeSurfaceDrag(card,canvas){
    if(!card||card.dataset.surfaceDragBound)return;
    card.dataset.surfaceDragBound='true';
    card.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('.surface-port,.surface-resize'))return;
      event.preventDefault();
      event.stopPropagation();
      const origin={x:event.clientX,y:event.clientY},initial={x:card.offsetLeft,y:card.offsetTop};
      let moved=false;
      const move=ev=>{
        const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;
        if(!moved&&Math.hypot(dx,dy)<2)return;
        moved=true;
        card.classList.add('dragging');
        card.style.left=`${Math.max(12,initial.x+dx)}px`;
        card.style.top=`${Math.max(72,initial.y+dy)}px`;
        this.drawSurfaceRelations(canvas);
      };
      const finish=()=>{
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',finish);
        window.removeEventListener('pointercancel',finish);
        card.classList.remove('dragging');
        card.releasePointerCapture?.(event.pointerId);
        if(moved){
          card.dataset.moved='true';
          setTimeout(()=>delete card.dataset.moved,120);
          notify('Atividade reposicionada no canvas.');
        }
      };
      card.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',finish,{once:true});
      window.addEventListener('pointercancel',finish,{once:true});
    });
    const resize=card.querySelector('.surface-resize');
    resize?.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      event.preventDefault();
      event.stopPropagation();
      const originX=event.clientX,startW=card.offsetWidth;
      const move=ev=>{
        const width=Math.max(90,startW+ev.clientX-originX);
        card.style.width=`${width}px`;
        card.dataset.duration=String(Math.max(1,Math.round(width/100)));
        this.drawSurfaceRelations(canvas);
      };
      const finish=()=>{
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',finish);
        window.removeEventListener('pointercancel',finish);
        resize.releasePointerCapture?.(event.pointerId);
        notify(`Duração ajustada para ${card.dataset.duration} dia(s).`);
      };
      resize.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',finish,{once:true});
      window.addEventListener('pointercancel',finish,{once:true});
    });
  }
  splitStageTabs(){const panel=this.querySelector('.stage-utilities');if(!panel||panel.dataset.split)return;panel.dataset.split='true';const tabs=panel.querySelector('.utility-tabs'),content=panel.querySelector('.utility-content'),original=panel.querySelector('.utility-tab');original.dataset.utilityTab='agenda';original.innerHTML=`${ico('calendar-days')} Agenda`;tabs.insertAdjacentHTML('afterbegin',`<button class="utility-tab active" data-utility-tab="cronograma">${ico('calendar-clock')} Cronograma</button>`);tabs.insertAdjacentHTML('beforeend',`<button class="utility-tab" data-utility-tab="afazeres">${ico('list-checks')} A Fazeres</button>`);original.classList.remove('active');content.dataset.utilityPane='agenda';const cron=document.createElement('div');cron.className='utility-pane';cron.dataset.pane='cronograma';cron.innerHTML='<div class="timeline-utility"><span class="activity-kind">CRONOGRAMA DA ETAPA</span><h3>Dependências e marcos</h3><div class="mini-timeline"><b>Início</b><i></i><b>Medição</b><i></i><b>Validação</b><i></i><b>Conclusão</b></div><p>Agenda, afazeres e canvas permanecem vinculados à mesma etapa.</p></div>';content.before(cron);const todo=document.createElement('div');todo.className='utility-pane';todo.dataset.pane='afazeres';todo.innerHTML='<div class="todo-focus"><span class="activity-kind">A FAZERES DA ETAPA</span><h3>Execução diária</h3><p>Itens pendentes, responsáveis e alertas de prazo.</p><div class="todo-grid"></div><button class="agenda-action">＋ Adicionar afazer</button></div>';panel.appendChild(todo);todo.querySelector('.todo-grid').append(...content.querySelectorAll('.todo-grid label'));const show=name=>{tabs.querySelectorAll('.utility-tab').forEach(x=>x.classList.toggle('active',x.dataset.utilityTab===name));cron.hidden=name!=='cronograma';content.hidden=name!=='agenda';todo.hidden=name!=='afazeres';notify(`${name[0].toUpperCase()+name.slice(1)} da etapa ativada.`);};tabs.querySelectorAll('.utility-tab').forEach(tab=>tab.addEventListener('click',()=>show(tab.dataset.utilityTab)));show('cronograma');}
  activityBlueprint(){
    const state=appStore.get(),stage=demoData.activities.find(item=>item.id===state.selectedStage)||demoData.activities[1];
    const requested=String(state.selectedActivity||'Executar atividade principal'),term=stage.name.toLowerCase().split(' ')[0];
    const catalog=activityCatalog.find(item=>item.name.toLowerCase()===requested.toLowerCase())||activityCatalog.find(item=>item.name.toLowerCase().includes(term)||item.nature.toLowerCase().includes(term));
    return {stage,name:requested,nature:catalog?.nature||stage.name,initial:catalog?.initial||['Frente de serviço','Responsável','Data prevista'],execution:catalog?.execution||['Avanço executado','Medição','Comprovante fotográfico','Pendências','Próximo passo']};
  }
  openActivityPage(name,stageName=''){const stageId=demoData.activities.find(item=>item.name===stageName)?.id;appStore.set({selectedActivity:name,activityDedicated:true,...(stageId?{selectedStage:stageId}:{}),lastAction:`Abriu atividade ${name}`});}
  activityDedicatedPage(){
    const item=this.activityBlueprint(),initial=item.initial,execution=item.execution;
    const steps=[['01','Escopo e frente',`Definir ${initial.slice(0,3).join(', ')}`,'brief','plan'],['02','Preparação',`Validar ${initial.slice(0,2).join(' e ')}`,'plan','execute'],['03','Execução',`Registrar ${execution.slice(0,3).join(', ')}`,'execute','measure'],['04','Medição',`Conferir ${execution.slice(3,5).join(' e ')||'quantidade e avanço'}`,'measure','evidence'],['05','Evidências',`Anexar ${execution.slice(-2).join(' e ')}`,'evidence','close'],['06','Encerramento','Validar pendências e liberar o próximo passo','close','']];
    const stepCards=steps.map((step,index)=>`<article class="activity-step-card workflow-card" data-step-id="${step[3]}" data-next="${step[4]}" style="left:${28+(index%3)*300}px;top:${92+Math.floor(index/3)*190}px"><span class="activity-kind">${step[0]} · ${esc(item.nature).toUpperCase()}</span><strong>${esc(step[1])}</strong><small>${esc(step[2])}</small><em>Etapa do fluxo →</em><span class="activity-step-port" aria-hidden="true"></span></article>`).join('');
    const people=demoData.collaborators.map(([name,role])=>`<option>${esc(name)} · ${esc(role)}</option>`).join('');
    return `<div class="activity-dedicated-page"><div class="activity-dedicated-head"><button class="ghost" data-cmd="back-activity" data-view="stages">${ico('arrow-left')} Voltar para a etapa</button><div class="activity-dedicated-title"><span class="activity-kind">ATIVIDADE · ${esc(item.nature).toUpperCase()}</span><h1>${esc(item.name)}</h1><p>${esc(item.stage.name)} · ${esc(item.stage.week)} · ${esc(item.stage.owner)} · superfície de journaling operacional</p></div><div class="activity-dedicated-progress"><small>AVANÇO ATUAL</small><strong>${item.stage.progress}%</strong></div></div><div class="activity-dedicated-context"><section class="activity-description-card"><div class="activity-card-kicker">DESCRIÇÃO DA ATIVIDADE</div><h2>${esc(item.name)}</h2><p>Organize a execução de <b>${esc(item.name.toLowerCase())}</b> em passos verificáveis, relacionando responsáveis, materiais, compras, medições e evidências dentro da etapa <b>${esc(item.stage.name)}</b>.</p><div class="activity-context-tags"><span>${esc(item.nature)}</span><span>${esc(item.stage.owner)}</span><span>Etapa ${item.stage.id} de 18</span></div><div class="activity-associations"><div><small>COMPRAS ASSOCIADAS</small><b>PE-2025-040 · Tubo PEAD Ø600mm</b></div><div><small>MATERIAIS</small><b>${item.stage.name==='Rede de Água'?'Tubos PEAD · 298 cavaletes · 298 ramais':'Tubos PVC · Cimento · equipamentos'}</b></div><div><small>DEPENDÊNCIA</small><b>Conclusão da frente anterior</b></div></div>${stageMaterialsMarkup(item.stage.name)}</section><section class="activity-journal-card"><div class="activity-card-kicker">JOURNALING DE EXECUÇÃO</div><h2>Registrar atualização</h2><form class="activity-journal-form"><div class="activity-form-grid"><label>Data<input name="data" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Hora<input name="hora" type="time" value="08:30"></label><label>Avanço (%)<input name="percentual" type="number" min="0" max="100" value="${item.stage.progress}"></label><label>Status<select name="status"><option>Pendente</option><option selected>Em andamento</option><option>Concluído</option><option>Bloqueado</option></select></label></div><label>Responsável<select name="responsavel"><option>${esc(item.stage.owner)}</option>${people}</select></label><label>Descrição do diário<textarea name="detalhes" rows="4" placeholder="Descreva o que foi executado, medido ou encontrado…"></textarea></label><label>Evidências e comprovantes<textarea name="evidencias" rows="3" placeholder="Fotos, documentos, nota fiscal, medição ou link local"></textarea></label><div class="activity-journal-actions"><button type="button" class="ghost" data-cmd="activity-save-draft">Salvar rascunho</button><button type="submit" class="primary">${ico('save')} Registrar no diário</button></div></form></section></div><section class="activity-flow-card"><div class="activity-flow-head"><div><div class="activity-card-kicker">CANVAS DE PASSOS DA ATIVIDADE</div><h2>Superfície livre de execução</h2><p>Arraste os cards para organizar o fluxo. As conexões mostram a sequência de trabalho.</p></div><button class="ghost" data-cmd="activity-add-step">${ico('plus')} Adicionar passo</button></div><div class="activity-step-canvas" data-activity-step-canvas><svg class="activity-step-edges" aria-hidden="true"></svg>${stepCards}</div><div class="activity-step-inspector" data-step-inspector><span class="activity-kind">SELECIONE UM PASSO</span><p>Clique em um card para ver a orientação e os campos relacionados.</p></div></section><div class="activity-dedicated-footer"><span>${ico('database')} Diário vinculado à etapa, registros, compras e materiais</span><span>${item.initial.length} campos iniciais · ${item.execution.length} campos de execução</span></div></div>`;
  }
  bindActivityDedicated(){
    const page=this.querySelector('.activity-dedicated-page'); if(!page)return;
    const back=this.querySelector('[data-cmd="back-activity"]'); if(back){back.removeAttribute('data-cmd');back.dataset.view='stages';back.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({view:'stages',activityDedicated:false,selectedActivity:null,lastAction:'Voltou para as etapas'});});}
    this.querySelector('[data-cmd="activity-save-draft"]')?.addEventListener('click',()=>{notify('Rascunho do journaling salvo localmente.','success');appStore.set({lastAction:'Salvou rascunho da atividade'});});
    this.querySelector('.activity-journal-form')?.addEventListener('submit',event=>{event.preventDefault();const item=this.activityBlueprint(),data=new FormData(event.currentTarget),record={id:`REG-${Date.now()}`,obra:'Aliança Park',atividade:item.name,etapa:item.stage.name,categoria:item.nature,responsavel:String(data.get('responsavel')||item.stage.owner),data:String(data.get('data')||new Date().toISOString().slice(0,10)),hora:String(data.get('hora')||'08:30'),detalhes:String(data.get('detalhes')||''),evidenceUri:String(data.get('evidencias')||''),status:String(data.get('status')||'Em andamento'),progresso:Number(data.get('percentual')||0),createdAt:new Date().toISOString()};appStore.update(state=>({...state,records:[record,...(state.records||[])],lastAction:`Registrou journaling de ${item.name}`}));notify('Atualização registrada no diário da atividade.','success');});
    const canvas=this.querySelector('[data-activity-step-canvas]'); if(!canvas)return;
    const inspector=this.querySelector('[data-step-inspector]'),cards=[...canvas.querySelectorAll('.activity-step-card')];
    const draw=()=>{const svg=canvas.querySelector('.activity-step-edges');svg.innerHTML='';cards.forEach(card=>{const next=canvas.querySelector(`[data-step-id="${card.dataset.next}"]`);if(!next)return;const x1=card.offsetLeft+card.offsetWidth,y1=card.offsetTop+card.offsetHeight/2,x2=next.offsetLeft,y2=next.offsetTop+next.offsetHeight/2,bend=Math.max(44,(x2-x1)/2),path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M${x1} ${y1} C${x1+bend} ${y1},${x2-bend} ${y2},${x2} ${y2}`);path.classList.add('activity-step-edge');svg.appendChild(path);});};
    cards.forEach(card=>{let moved=false;card.addEventListener('click',()=>{if(moved)return;cards.forEach(node=>node.classList.toggle('selected',node===card));if(inspector){inspector.innerHTML=`<span class="activity-kind">${esc(card.querySelector('.activity-kind')?.textContent||'PASSO')}</span><b>${esc(card.querySelector('strong')?.textContent||'Passo da atividade')}</b><p>${esc(card.querySelector('small')?.textContent||'Campos de acompanhamento vinculados ao journaling.')}</p>`;}});card.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('.activity-step-port'))return;event.preventDefault();event.stopPropagation();const origin={x:event.clientX,y:event.clientY},initial={x:card.offsetLeft,y:card.offsetTop};moved=false;card.setPointerCapture?.(event.pointerId);const move=ev=>{const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;if(Math.hypot(dx,dy)>3)moved=true;if(!moved)return;card.classList.add('dragging');card.style.left=`${Math.max(12,initial.x+dx)}px`;card.style.top=`${Math.max(78,initial.y+dy)}px`;draw();};const finish=()=>{card.classList.remove('dragging');card.releasePointerCapture?.(event.pointerId);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);if(moved)notify('Passo reposicionado no canvas.');};window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',finish,{once:true});});});
    this.querySelector('[data-cmd="activity-add-step"]')?.addEventListener('click',()=>{const name=prompt('Nome do novo passo da atividade:');if(!name?.trim())return;const card=document.createElement('article');card.className='activity-step-card workflow-card';card.dataset.stepId=`custom-${Date.now()}`;card.innerHTML=`<span class="activity-kind">NOVO PASSO</span><strong>${esc(name.trim())}</strong><small>Preencher orientação, responsável e evidências.</small><em>Passo adicionado →</em><span class="activity-step-port" aria-hidden="true"></span>`;card.style.left='640px';card.style.top='420px';canvas.appendChild(card);this.bindActivityDedicated();notify('Novo passo adicionado ao canvas.','success');});
    draw();
  }
  bindDedicatedWorkflow(){const canvas=this.querySelector('.dedicated-canvas');if(!canvas)return;const steps=[['01','Criar lançamento','Registrar data, etapa, subetapa e descrição','Lançamentos'],['02','Vincular fornecedor','Associar fornecedor e documento fiscal','Lançamentos'],['03','Conferir quantidade','Validar quantidade, unidade e valor unitário','Lançamentos'],['04','Aprovar pagamento','Confirmar forma de pagamento e responsável','Lançamentos'],['05','Medição da etapa','Relacionar gasto ao avanço físico e afazer','Resumo Mensal'],['06','Conciliar orçamento','Comparar previsto, realizado e saldo','Orçamento'],['07','Atualizar indicador','Consolidar consumo e variação mensal','Indicadores'],['08','Fechar etapa','Gerar relatório e liberar próxima etapa','Como Usar']];canvas.querySelectorAll('.dedicated-activity').forEach(x=>x.remove());const guide=canvas.querySelector('.canvas-guide');steps.forEach((step,i)=>{const card=document.createElement('button');card.className='dedicated-activity workflow-card';card.style.left=`${30+(i%4)*260}px`;card.style.top=`${90+Math.floor(i/4)*160}px`;card.innerHTML=`<span class="activity-kind">${step[0]} · ${step[3]}</span><strong>${step[1]}</strong><small>${step[2]}</small><em>Fluxo da etapa →</em>`;canvas.appendChild(card);card.addEventListener('click',()=>{if(card.dataset.moved)return;let detail=canvas.querySelector('.workflow-detail');if(!detail){detail=document.createElement('aside');detail.className='workflow-detail';canvas.appendChild(detail);}detail.innerHTML=`<button class="detail-close" aria-label="Fechar">×</button><span class="activity-kind">${step[3]}</span><h3>${step[1]}</h3><p>${step[2]}.</p><div><small>ENTRADAS</small><b>Data · etapa · fornecedor · valor</b></div><div><small>SAÍDA</small><b>${i<steps.length-1?steps[i+1][1]:'Etapa finalizada e relatório disponível'}</b></div><button class="workflow-complete">${i<steps.length-1?'Concluir e avançar':'Finalizar etapa'}</button>`;detail.querySelector('.detail-close').onclick=()=>detail.remove();detail.querySelector('.workflow-complete').onclick=()=>{notify(`${step[1]} concluído. Próximo fluxo liberado.`,'success');appStore.set({lastAction:`Concluiu ${step[1]}`});detail.remove();};});let start=null;card.addEventListener('pointerdown',e=>{e.preventDefault();card.setPointerCapture?.(e.pointerId);start={x:card.offsetLeft,y:card.offsetTop,cx:e.clientX,cy:e.clientY};const move=ev=>{card.style.left=`${Math.max(10,start.x+ev.clientX-start.cx)}px`;card.style.top=`${Math.max(55,start.y+ev.clientY-start.cy)}px`;card.dataset.moved='true';};const up=()=>{card.releasePointerCapture?.(e.pointerId);card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',up);setTimeout(()=>delete card.dataset.moved,0);};card.addEventListener('pointermove',move);card.addEventListener('pointerup',up);});});window.lucide?.createIcons();}
  addStageUtilities(){const shell=this.querySelector('.stage-shell');if(!shell||shell.querySelector('.stage-utilities'))return;const stage=extensionStage(),agenda=(appStore.get().operationalAgenda||[]).filter(item=>item.stageName===stage.name).slice(0,3),agendaRows=agenda.length?agenda.map(item=>`<label><input type="checkbox"> ${esc(item.title)} <small>${esc(item.plannedStart||'Hoje')} · ${esc(item.owner||'Responsável a definir')}</small></label>`).join(''):`<label><input type="checkbox"> Confirmar medição da drenagem <small>08:30 · Carlos Mendes</small></label><label><input type="checkbox"> Validar recebimento de tubos <small>10:00 · Paula Nascimento</small></label><label><input type="checkbox"> Liberar frente seguinte <small>16:00 · Mariana Lopes</small></label>`;const nextDue=agenda[0]?.plannedStart||'hoje';const panel=document.createElement('section');panel.className='stage-utilities';panel.innerHTML=`<div class="utility-tabs"><button class="utility-tab active" data-utility-tab="cronograma">${ico('calendar-clock')} Cronograma / Agenda</button><button class="utility-tab" data-utility-tab="canvas">${ico('workflow')} Canvas organizacional</button></div><div class="utility-content"><div class="agenda-summary"><div><span class="activity-kind">AGENDA DA ETAPA · HOJE</span><h3>Afazeres operacionais</h3><p>Conecte a equipe, confirme presença e avise os envolvidos.</p></div><button class="whatsapp-action">${ico('message-circle')} Enviar agenda no WhatsApp</button></div><div class="todo-grid">${agendaRows}</div><div class="agenda-actions"><button class="agenda-action">＋ Adicionar afazer</button><button class="alert-action">${ico('bell-ring')} Criar alerta de prazo</button><span class="agenda-status">Próximo alerta: ${esc(nextDue)}</span></div></div>`;shell.appendChild(panel);panel.querySelectorAll('[data-utility-tab]').forEach(tab=>tab.addEventListener('click',()=>{panel.querySelectorAll('.utility-tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active');notify(tab.dataset.utilityTab==='cronograma'?'Agenda da etapa ativada.':'Canvas organizacional ativado.');}));panel.querySelector('.whatsapp-action').addEventListener('click',()=>{notify('Agenda preparada para envio aos envolvidos via WhatsApp.','success');appStore.set({lastAction:'Enviou agenda da etapa via WhatsApp'});});panel.querySelector('.agenda-action').addEventListener('click',()=>{const label=prompt('Descreva o novo afazer da etapa:');if(label?.trim()){const item=document.createElement('label');item.innerHTML=`<input type="checkbox"> ${esc(label.trim())} <small>Agora · responsável a definir</small>`;panel.querySelector('.todo-grid').appendChild(item);notify('Afazer adicionado à agenda.','success');appStore.set({lastAction:'Adicionou afazer na agenda'});}});panel.querySelector('.alert-action').addEventListener('click',()=>{notify('Alerta criado para o prazo da etapa.','warning');appStore.set({lastAction:'Criou alerta de prazo'});});}
  openDedicatedStage(){const s=demoData.activities.find(x=>x.id===appStore.get().selectedStage)||demoData.activities[1];this.innerHTML=`<div class="stage-dedicated"><button class="ghost" data-back-stages>${ico('arrow-left')} Voltar para todas as etapas</button><div class="dedicated-head"><div><span class="activity-kind">PÁGINA DEDICADA · ETAPA ${s.id} DE 18</span><h1>${s.name}</h1><p>${s.week} · ${s.owner} · acompanhamento operacional</p></div><span class="stage-dedicated-progress">${s.progress}%</span></div><div class="dedicated-grid"><section class="dedicated-panel"><h3>Resumo executivo</h3><p>Orçamento previsto <b>R$ 24.850,00</b></p><p>Realizado <b>R$ 16.120,00</b></p><p>Saldo <b>R$ 8.730,00</b></p></section><section class="dedicated-panel"><h3>Responsáveis</h3><p><b>${s.owner}</b><br>Execução da frente</p><p><b>Paula Nascimento</b><br>Planejamento e medição</p></section><section class="dedicated-panel"><h3>Compras e materiais</h3>${stageMaterialsFor(s.name).length?stageMaterialsFor(s.name).map(item=>`<p><b>${esc(item.name)}</b> · ${item.quantity==null?esc(item.scope):`${esc(item.quantity)} ${esc(item.unit)} · ${esc(item.scope)}`}</p>`).join(''):'<p>PE-2025-040 · Tubo PEAD Ø600mm</p><p>Tubos PVC · 780 m em uso</p><p>Cimento · 150 sc em uso</p>'}</section>${stagePlanningMarkup(s)}</div><section class="dedicated-canvas"><div class="canvas-guide"><b>Superfície livre de atividades</b><span>Arraste, conecte e acompanhe as relações desta etapa</span></div><div class="dedicated-activity" style="left:30px;top:90px"><span class="activity-kind">ATIVIDADE PRINCIPAL</span><strong>Executar ${s.name}</strong><small>${s.owner} · ${s.progress}%</small></div><div class="dedicated-activity" style="left:360px;top:220px"><span class="activity-kind">SUBATIVIDADE</span><strong>Validar medição e materiais</strong><small>Paula Nascimento · pendente</small></div><div class="dedicated-activity" style="left:700px;top:100px"><span class="activity-kind">PRÓXIMA AÇÃO</span><strong>Liberar próxima frente</strong><small>Dependência da conclusão atual</small></div></section></div>`;window.lucide?.createIcons();this.querySelector('[data-back-stages]')?.addEventListener('click',()=>this.render());}
  bindDedicatedStageContext(){
    const form=this.querySelector('[data-stage-context-form]');
    if(!form)return;
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const stageKey=form.dataset.stageContextForm;
      const settings={...(readIntegrationSettings()||{}),...(appStore.get().integrationSettings||{})};
      const nextProfile={
        requirements:splitStageConfigList(form.querySelector('[name="requirements"]')?.value),
        conditions:splitStageConfigList(form.querySelector('[name="conditions"]')?.value),
        typicalDescription:form.querySelector('[name="typicalDescription"]')?.value||'',
        requestHints:splitStageConfigList(form.querySelector('[name="requestHints"]')?.value),
        evidenceFocus:splitStageConfigList(form.querySelector('[name="evidenceFocus"]')?.value),
        procurementFocus:splitStageConfigList(form.querySelector('[name="procurementFocus"]')?.value),
        materialsTable:[...form.querySelectorAll('[data-stage-material-row]')].map(item=>({
          name:item.querySelector('[name="materialName"]')?.value||'',
          description:item.querySelector('[name="materialDescription"]')?.value||'',
          quantity:item.querySelector('[name="materialQuantity"]')?.value||'',
          unit:item.querySelector('[name="materialUnit"]')?.value||'',
          status:item.querySelector('[name="materialStatus"]')?.value||''
        })).filter(item=>item.name||item.description||item.quantity),
        notificationTargets:{
          owner:splitStageConfigList(form.querySelector('[name="notifyOwner"]')?.value),
          admin:splitStageConfigList(form.querySelector('[name="notifyAdmin"]')?.value),
          foreman:splitStageConfigList(form.querySelector('[name="notifyForeman"]')?.value)
        }
      };
      const data={...settings,stageProfiles:{...(settings.stageProfiles||{}),[stageKey]:nextProfile}};
      localStorage.setItem(INTEGRATION_SETTINGS_KEY,JSON.stringify(data));
      appStore.set({integrationSettings:data,lastAction:`Salvou contexto operacional da etapa ${stageKey}`});
      await this.runOperationalLoop('stage.context.changed',{quiet:true});
      const status=this.querySelector('[data-stage-context-status]');
      if(status)status.textContent='Contexto salvo. O ciclo operacional já recebeu a descrição, os materiais quantificados e os destinos desta etapa.';
      notify('Contexto da etapa salvo e propagado para o agente.','success');
    });
    this.querySelectorAll('[data-add-stage-material]').forEach(button=>button.addEventListener('click',()=>{
      const target=form.querySelector(`[data-stage-materials="${button.dataset.addStageMaterial}"]`);
      if(!target)return;
      target.insertAdjacentHTML('beforeend','<tr data-stage-material-row><td><input name="materialName" placeholder="Ex.: Tubo PEAD"></td><td><input name="materialDescription" placeholder="Escopo, bitola, uso..."></td><td><input name="materialQuantity" inputmode="decimal" placeholder="0"></td><td><input name="materialUnit" placeholder="m, un, m²"></td><td><input name="materialStatus" placeholder="Planejado"></td></tr>');
    }));
  }
  connectedCallback(){ this.render(); this.loadPersistentRecords(); this.loadPublicLeads(); this.loadCommercialReservations(); this.runOperationalLoop('client.init'); this.connectOperationalNotifications(); this.startOperationalLoopTicker(); appStore.subscribe(()=>this.render()); }
  disconnectedCallback(){ this._unsubscribeOperationalNotifications?.(); this._unsubscribeOperationalNotifications=null; clearInterval(this._operationalLoopTimer); this._operationalLoopTimer=null; }
  async loadPersistentRecords(){
    try{
      const response=await apiFetch('/api/records'); if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json(); if(Array.isArray(payload.records)&&payload.records.length)appStore.set({records:payload.records,lastAction:'Carregou registros do banco local'});
    }catch(error){console.warn('Persistência local indisponível; mantendo demonstração.',error);}
  }
  async loadPublicLeads(){
    if(this._publicLeadsSubscribed)return;
    this._publicLeadsSubscribed=true;
    try{
      this._unsubscribePublicLeads=await subscribePublicLeads(records=>{
        const leads=Object.entries(records||{}).map(([id,item])=>({id,...item})).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
        appStore.set({publicLeads:leads,lastAction:leads.length?'Atualizou leads do Firebase':'Firebase de leads conectado'});
      });
    }catch(error){
      console.info('Firebase de leads indisponível; mantendo demonstração local.',error);
    }
  }
  async loadCommercialReservations(){
    try{
      const response=await apiFetch('/api/commercial-sales');if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json(),reservations=(payload.sales||[]).filter(item=>item.broker==='Site público');
      appStore.set({publicReservations:reservations,lastAction:reservations.length?'Atualizou reservas vindas do site':'Serviço local de reservas conectado'});
    }catch(error){console.info('Reservas locais indisponíveis.',error);}
  }
  startOperationalLoopTicker(){
    if(this._operationalLoopTimer)return;
    this._operationalLoopTimer=setInterval(()=>{
      if(document.hidden)return;
      this.runOperationalLoop('client.tick',{quiet:true});
    },60*1000);
  }
  async runOperationalLoop(reason='client.manual',{quiet=false}={}){
    try{
      const actor=appStore.get().currentActor||{role:'owner'};
      const state=appStore.get();
      const savedSettings={...(state.integrationSettings||{}),...readIntegrationSettings()};
      const response=await apiFetch('/api/operational-loop',{
        method:'POST',
        headers:operationalHeaders({'Content-Type':'application/json'}),
        body:JSON.stringify({
          reason,
          referenceDate:new Date().toISOString().slice(0,10),
          syncActivities:true,
          publishNotifications:true,
          stageProfiles:stageProfilesFromSettings(savedSettings),
          clientState:{
            view:state.view,
            mapContext:Boolean(state.mapMode==='focus'),
            globalSituation:true,
            recordsTracked:Array.isArray(state.records)?state.records.length:0,
            notificationsTracked:Array.isArray(state.operationalNotifications)?state.operationalNotifications.length:0
          }
        })
      });
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json();
      appStore.set({
        cashSummary:payload.cashSummary||{},
        operationalState:payload.operational||null,
        operationalNotifications:payload.notifications||[],
        systemCalibration:payload.calibration||null,
        operationalAgenda:payload.agenda||[],
        operationalGuidance:payload.guidance||null,
        cashFlowLocal:payload.cashEntries||[],
        lastAction:quiet?state.lastAction:`Atualizou ciclo operacional para o perfil ${actor.label||actor.role}`
      });
      try{
        await publishOperationalRealtime(actor,payload,{reason});
      }catch(realtimeError){
        console.info('Espelho público do ciclo operacional ainda indisponível.',realtimeError);
      }
    }catch(error){console.info('Ciclo operacional indisponível.',error);}
  }
  async connectOperationalNotifications(force=false){
    const actor=appStore.get().currentActor||{role:'owner'};
    if(this._operationalNotificationUid===actor.uid&&!force)return;
    this._unsubscribeOperationalNotifications?.();
    this._unsubscribeOperationalNotifications=null;
    try{
      this._unsubscribeOperationalNotifications=await subscribeOperationalNotifications(actor,records=>{
        const notifications=Object.entries(records||{})
          .map(([id,item])=>({id,...item}))
          .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
        appStore.set({operationalNotifications:notifications,lastAction:notifications.length?'Atualizou notificações em tempo real':'Canal em tempo real conectado'});
      });
      this._operationalNotificationUid=actor.uid;
    }catch(error){
      this._operationalNotificationUid='';
      console.info('Canal em tempo real ainda não registrado neste dispositivo.',error);
    }
  }
  render(){ const state=appStore.get(),view=state.view; this.dataset.view=view; const labels={assistant:['Execução atual','Panorama operacional'],map:['Mapa operacional','Visão temática por utilidade'],stages:['Etapas da obra','Canvas de execução e dependências'],agenda:['Agenda da etapa','Compromissos, responsáveis e alertas'],activities:['Atividades da etapa','Propriedades, execução e associações'],progress:['Andamento da obra','Diário operacional e evidências de campo'],pert:['PERT da etapa','Dependências vivas e liberação de atividades'],actions:['Ações da IA','Impacto, prontidão e caminhos de adiantamento'],raci:['Pessoas responsáveis','Matriz RACI interativa por atividade'],raid:['Pendências da obra','Riscos, premissas, problemas e dependências'],purchases:['Compras','Compromissos, prazos e fornecedores'],inventory:['Inventário','Materiais, reservas e consumo'],leads:['Leads','Captação pública e intenção de compra'],commissions:['Comissões','Perfis, lotes, clientes e contratos'],collaborators:['Colaboradores','Alocação e presença em campo'],personnel:['Pessoal','Formação de equipes e unidades de produção'],brokers:['Corretores','Situação comercial, carteira e contatos'],finance:['Financeiro','Balanços, fluxo de caixa e planilhas gerenciais'],reports:['Relatórios','Orçamento, realizado e indicadores'],settings:['Configuração','Integrações e parâmetros']}; const [title,subtitle]=labels[view]||labels.assistant; this.innerHTML=`<div class="activity-header"><div><span>${title}</span><small>${subtitle}</small></div><div class="activity-state"><i></i> Em acompanhamento <b>·</b> ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></div>${view==='stages'?(state.activityDedicated?this.activityDedicatedPage():this.stagesCanvas()):(this[view]?.() || this.assistant())}`; if(view==='stages'&&!state.activityDedicated){this.addActivityNodes();this.addStageUtilities();this.splitStageTabs();} if(view==='stages'&&state.activityDedicated){this.scrollTop=0;this.bindActivityDedicated();} window.lucide?.createIcons(); this.bind(); this.bindFloatingWidgets(); }
  bind(){
    const current=appStore.get();
    if(current.printMode){this.innerHTML=this.mapPrintReport();}
    else if(current.view==='assistant'&&!this.querySelector('[data-map-pdf]'))this.querySelector('.dashboard-home')?.insertAdjacentHTML('beforeend',`<button type="button" class="dashboard-pdf dashboard-pdf-float" data-map-pdf>${ico('file-down')} Exportar mapa PDF</button>`);
    this.querySelector('[data-map-pdf]')?.addEventListener('click',()=>this.openMapPrintMode());
    this.querySelector('[data-map-print-close]')?.addEventListener('click',()=>appStore.set({printMode:false,lastAction:'Fechou prévia de impressão'}));
    this.querySelector('[data-map-print-start]')?.addEventListener('click',()=>{notify('Abrindo impressão. Escolha "Salvar como PDF" no destino.','success');setTimeout(()=>window.print(),120);});
    this.querySelector('[data-audit-clear]')?.addEventListener('click',()=>{
      appStore.update(s=>({...s,actionAudit:[],lastAction:'Limpou o histórico de uso da sessão'}));
      notify('Histórico de uso desta sessão limpo.','success');
    });
    this.querySelector('[data-audit-export]')?.addEventListener('click',()=>{
      const rows=[['Horário','Ação','Área','Módulo','Usuário'],...(appStore.get().actionAudit||[]).map(item=>[
        new Date(item.at).toLocaleString('pt-BR'),item.label,item.view||'dashboard',item.view||'dashboard',item.actor||'Warley'
      ])];
      const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(';')).join('\n');
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
      link.href=url;link.download=`auditoria-uso-${appStore.get().sessionId}.csv`;link.click();URL.revokeObjectURL(url);
      appStore.set({lastAction:'Exportou histórico de uso da sessão'});
    });
    this.querySelectorAll('.card-close').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();button.closest('.float-card')?.remove();appStore.set({lastAction:'Ocultou um card do dashboard'});}));
    this.querySelector('[data-report-family]')?.addEventListener('change',event=>{const family=event.currentTarget.value,first=reportCatalog.find(report=>report.family===family);appStore.set({reportFamily:family,reportType:first?.id||'financial-balance',lastAction:`Selecionou família de relatório ${family}`});});
    this.querySelectorAll('[data-report-family-tab]').forEach(button=>button.addEventListener('click',()=>{const family=button.dataset.reportFamilyTab,first=reportCatalog.find(report=>report.family===family);appStore.set({reportFamily:family,reportType:first?.id||'financial-balance',lastAction:`Selecionou aba ${family}`});}));
    this.querySelectorAll('[data-report-type-tab]').forEach(button=>button.addEventListener('click',()=>{const report=reportCatalog.find(item=>item.id===button.dataset.reportTypeTab);if(report)appStore.set({reportFamily:report.family,reportType:report.id,lastAction:`Abriu ${report.label}`});}));
    this.querySelector('[data-report-type]')?.addEventListener('change',event=>{const report=reportCatalog.find(item=>item.id===event.currentTarget.value);appStore.set({reportType:event.currentTarget.value,lastAction:`Abriu relatório ${report?.label||event.currentTarget.value}`});});
    this.querySelector('[data-report-period]')?.addEventListener('change',event=>{appStore.set({reportPeriod:event.currentTarget.value,lastAction:`Alterou período do relatório para ${event.currentTarget.options[event.currentTarget.selectedIndex].text}`});});
    this.querySelectorAll('[data-report-row-toggle]').forEach(button=>button.addEventListener('click',()=>{const index=button.dataset.reportRowToggle,row=this.querySelector(`[data-report-detail="${index}"]`),open=row?.hidden!==false;if(row)row.hidden=!open;button.setAttribute('aria-expanded',String(open));button.textContent=open?'Ocultar itens':'Ver itens';appStore.set({lastAction:`${open?'Abriu':'Fechou'} desdobramento da linha ${Number(index)+1} do relatório`});}));
    this.querySelectorAll('[data-report-export]').forEach(button=>button.addEventListener('click',()=>{const s=appStore.get(),report=reportCatalog.find(item=>item.id===s.reportType)||reportCatalog[0],csv=[report.columns,...report.rows].map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(';')).join('\n'),url=URL.createObjectURL(new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`${report.id}-${s.reportPeriod||'2024-06'}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`${report.label} exportado em CSV.`,'success');appStore.set({lastAction:`Exportou ${report.label}`});}));
    this.querySelector('[data-report-print]')?.addEventListener('click',()=>{window.print();appStore.set({lastAction:'Abriu impressão do relatório'});});
    this.querySelector('.records-new')?.addEventListener('click',()=>{this.querySelector('.records-form-wrap')?.classList.add('open');});
    this.querySelectorAll('[data-record-edit]').forEach(b=>b.addEventListener('click',()=>{appStore.set({editingRecord:b.dataset.recordEdit});}));
    this.querySelectorAll('[data-record-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Excluir este registro?'))return;try{const response=await apiFetch(`/api/records/${encodeURIComponent(b.dataset.recordDelete)}`,{method:'DELETE',headers:operationalHeaders()});if(!response.ok)throw new Error(`HTTP ${response.status}`);appStore.update(s=>({...s,records:s.records.filter(r=>r.id!==b.dataset.recordDelete),lastAction:'Excluiu registro no banco'}));notify('Registro excluído do banco operacional.','success');}catch(error){notify('Não foi possível excluir o registro.','warning');console.warn('Exclusão persistente indisponível.',error);}}));
    this.querySelector('.record-cancel')?.addEventListener('click',()=>appStore.set({editingRecord:null}));
    this.querySelector('.record-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),value=Object.fromEntries(f.entries()),rawEditingId=appStore.get().editingRecord,editingId=rawEditingId&&rawEditingId!=='new'?rawEditingId:null,contextFields=[...e.currentTarget.querySelectorAll('[data-record-context-field]')].map(input=>`${input.dataset.recordContextLabel}: ${String(input.value||'').trim()}`).filter(item=>!item.endsWith(': '));if(contextFields.length)value.detalhes=[value.detalhes,`Campos de ${e.currentTarget.dataset.recordNature||'execução'}:`,...contextFields].filter(Boolean).join('\n');try{const response=await apiFetch(editingId?`/api/records/${encodeURIComponent(editingId)}`:'/api/records',{method:editingId?'PUT':'POST',headers:operationalHeaders({'Content-Type':'application/json'}),body:JSON.stringify(value)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const record=await response.json();appStore.update(s=>({...s,records:editingId?s.records.map(r=>r.id===editingId?record:r):[record,...s.records],editingRecord:null,recordContext:null,recordCameraName:null,recordCameraPreview:null,lastAction:editingId?'Atualizou registro no banco':'Criou registro no banco'}));this._recordCameraFile=null;notify('Registro salvo na camada operacional.','success');}catch(error){notify('Serviço operacional indisponível; registro não confirmado.','warning');console.warn('Persistência de registro indisponível.',error);}});
    this.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{const next=b.dataset.view==='inventory'?'assistant':b.dataset.view;appStore.set({view:next,activityDedicated:false,selectedActivity:null,lastAction:`Abriu ${b.textContent.trim()}`});}));
    this.querySelectorAll('[data-lead]').forEach(b=>b.addEventListener('click',()=>{appStore.set({selectedLead:+b.dataset.lead});this.render();}));
    this.querySelector('[data-lead-search]')?.addEventListener('input',event=>{const query=event.currentTarget.value.trim().toLowerCase();this.querySelectorAll('.lead-client-row').forEach(row=>{row.hidden=Boolean(query&&!row.textContent.toLowerCase().includes(query));});});
    this.querySelectorAll('[data-lead-message]').forEach(button=>button.addEventListener('click',()=>{const detail=button.closest('.lead-ops-detail'),name=detail?.querySelector('h2')?.textContent?.trim()||'interessado',lot=detail?.querySelector('.lead-lot-focus b')?.textContent?.trim()||'lote selecionado',message=`Olá, ${name}! Aqui é da equipe Vista Verde. Recebemos seu interesse no ${lot} e podemos enviar as condições, disponibilidade e próximos passos.`;window.open(`https://wa.me/?text=${encodeURIComponent(message)}`,'_blank','noopener');notify(`Mensagem de WhatsApp preparada para ${name}.`,'success');appStore.set({lastAction:`Preparou WhatsApp para ${name}`});}));
    this.querySelectorAll('[data-lead-reserve]').forEach(button=>button.addEventListener('click',()=>{const item=demoData.leads[Number(button.dataset.leadReserve)];notify(`Reserva preparada para ${item?.lot||'o lote interessado'}.`,'success');appStore.set({lastAction:`Abriu reserva de ${item?.lot||'lote'}`});}));
    this.querySelectorAll('[data-stage-index]').forEach(b=>b.addEventListener('click',()=>{appStore.set({selectedStage:+b.dataset.stageIndex,stageSelected:true,lastAction:`Abriu a etapa ${b.dataset.stageIndex}`});this.render();}));
    this.querySelectorAll('.stage-detail-card').forEach(b=>b.addEventListener('click',e=>{if(e.target.closest('.stage-activity-card,.activity-connect'))return;appStore.set({stageSelected:true});this._dedicated=true;this.openDedicatedStage();this.bindDedicatedStageContext();this.bindDedicatedWorkflow();this.bindDedicatedActivityClicks();this.enhanceDedicatedSurface();this.addCatalogPalette();this.bindCatalogButtons();this.addFineDurationControls();this.bindGhostConnections();this.watchSurfaceRelations();this.bindWorkflowFieldTrees();}));
    this.querySelectorAll('[data-activity-detail]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.dragged==='true')return;this.openActivityPage(b.dataset.activityDetail);}));
    this.querySelectorAll('[data-close-detail]').forEach(b=>b.addEventListener('click',()=>b.closest('.activity-detail')?.classList.remove('open')));
    this.querySelectorAll('button:not([data-view]):not([data-cmd]):not([data-lead]):not([data-lead-message]):not([data-lead-reserve]):not([id])').forEach(button=>button.addEventListener('click',()=>{
      if(button.matches('[data-agenda-day],[data-agenda-new],[data-agenda-item-menu],[data-agenda-whatsapp],[data-agenda-alert],[data-activity-category-filter],[data-activity-open],[data-activity-new],[data-progress-period],[data-progress-new],[data-progress-send],[data-progress-cancel],[data-record-paint],[data-record-mobile-select],[data-record-camera],[data-map-pdf],[data-map-print-start],[data-map-print-close],[data-audit-clear],[data-audit-export],[data-lead-reservation-start],[data-reservation-start],[data-reservation-close],[data-reservation-analyze],[data-copy-pix],.reservation-submit,.records-new,.record-confirm,.record-cancel,.journal-open,.personnel-primary-button-v5372')||button.closest('.activity-journal-form'))return;
      if(button.closest('.reports-toolbar,.report-footer'))return;
      const label=button.textContent.trim().replace(/\s+/g,' '); if(!label)return;
      if(button.classList.contains('stage-tab')){this.querySelectorAll('.stage-tab').forEach(x=>x.classList.remove('active'));button.classList.add('active');notify(`Visão ${label} selecionada.`);return;}
      if(button.classList.contains('public-submit')){const values=[...this.querySelectorAll('.public-fields input')].map(x=>x.value.trim());if(values.some(v=>!v)){notify('Preencha nome, WhatsApp e e-mail para registrar a intenção.','warning');return;}notify('Lead registrado e encaminhado para atendimento.','success');appStore.set({lastAction:'Registrou novo lead'});return;}
      if(button.textContent.includes('relatório')){notify('Relatório executivo preparado para exportação.','success');return;}
      if(button.textContent.includes('recomend')){notify('Recomendações: priorizar postes e tubos atrasados.','warning');return;}
      notify(`${label} executado.`,'success'); appStore.set({lastAction:label});
    }));
    this.querySelectorAll('.canvas-node').forEach(node=>{node.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',node.dataset.node);node.classList.add('dragging');});node.addEventListener('dragend',()=>node.classList.remove('dragging'));});
    const zone=this.querySelector('.canvas-relate'); if(zone){zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drop-ready');});zone.addEventListener('dragleave',()=>zone.classList.remove('drop-ready'));zone.addEventListener('drop',e=>{e.preventDefault();const node=e.dataTransfer.getData('text/plain');zone.classList.remove('drop-ready');zone.querySelector('strong').textContent=`Relacionamento: ${node} → orçamento mensal`;appStore.set({lastAction:`Relacionou ${node} ao orçamento mensal`});});}
    this.querySelectorAll('.stage-card[draggable="true"]').forEach(card=>{card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/stage',card.dataset.stage);card.classList.add('dragging');});card.addEventListener('dragend',()=>card.classList.remove('dragging'));});
    this.querySelectorAll('.stage-card[draggable="true"]').forEach(card=>{card.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,textarea'))return;const canvas=card.closest('.stage-canvas');if(!canvas)return;const start=canvas.getBoundingClientRect();const initial={x:card.offsetLeft,y:card.offsetTop};const origin={x:e.clientX,y:e.clientY};card.classList.add('pointer-dragging');const move=ev=>{card.style.left=`${Math.max(12,initial.x+ev.clientX-origin.x)}px`;card.style.top=`${Math.max(42,initial.y+ev.clientY-origin.y)}px`;};const up=()=>{card.classList.remove('pointer-dragging');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);const relation=canvas.querySelector('.relation-label');if(relation)relation.textContent=`Posições relacionadas: ${card.dataset.stage} → próxima atividade`;appStore.set({lastAction:`Reposicionou ${card.dataset.stage} no canvas`});};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);});});
    this.querySelectorAll('.stage-activity-card').forEach(card=>{card.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.activity-connect'))return;e.preventDefault();card.setPointerCapture?.(e.pointerId);const initial={x:card.offsetLeft,y:card.offsetTop},origin={x:e.clientX,y:e.clientY};let moved=false;card.classList.add('dragging');const move=ev=>{if(Math.abs(ev.clientX-origin.x)>3||Math.abs(ev.clientY-origin.y)>3)moved=true;card.style.left=`${Math.max(10,initial.x+ev.clientX-origin.x)}px`;card.style.top=`${Math.max(45,initial.y+ev.clientY-origin.y)}px`;};const up=()=>{card.classList.remove('dragging');card.releasePointerCapture?.(e.pointerId);card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',up);if(moved){card.dataset.dragged='true';setTimeout(()=>delete card.dataset.dragged,0);appStore.set({lastAction:`Reposicionou atividade ${card.dataset.activityDetail}`});}};card.addEventListener('pointermove',move);card.addEventListener('pointerup',up);});});
    const stageCanvas=this.querySelector('.stage-canvas'); if(stageCanvas){stageCanvas.addEventListener('dragover',e=>{e.preventDefault();stageCanvas.classList.add('drop-ready');});stageCanvas.addEventListener('dragleave',()=>stageCanvas.classList.remove('drop-ready'));stageCanvas.addEventListener('drop',e=>{e.preventDefault();const stage=e.dataTransfer.getData('text/stage');stageCanvas.classList.remove('drop-ready');const label=stageCanvas.querySelector('.relation-label');if(label)label.textContent=`Dependência relacionada: ${stage} → próxima etapa`;appStore.set({lastAction:`Moveu a etapa ${stage} no canvas`});});}
  }
  addActivityNodes(){
    const canvas=this.querySelector('.stage-canvas'); if(!canvas||canvas.querySelector('.activity-layer'))return;
    const layer=document.createElement('div'); layer.className='activity-layer'; layer.innerHTML=`<div class="activity-layer-title">ATIVIDADES RELACIONADAS <small>Arraste o card para mover · arraste ＋ para conectar</small></div><article class="activity-node" data-activity-id="act-drenagem" data-stage="Drenagem Pluvial" style="left:34px;top:560px"><span class="activity-kind">ATIVIDADE · DRENAGEM</span><strong>Executar rede principal</strong><small>Responsável: Carlos Mendes · 82%</small><button class="activity-connect" data-connect-from="act-drenagem" aria-label="Arrastar para conectar">＋</button></article><article class="activity-node" data-activity-id="act-bocas" data-stage="Drenagem Pluvial" style="left:310px;top:590px"><span class="activity-kind">SUBATIVIDADE</span><strong>Validar bocas de lobo</strong><small>Dependência: rede principal</small><button class="activity-connect" data-connect-from="act-bocas" aria-label="Arrastar para conectar">＋</button></article><article class="activity-node" data-activity-id="act-pav" data-stage="Pavimentação" style="left:590px;top:790px"><span class="activity-kind">ATIVIDADE · PAVIMENTAÇÃO</span><strong>Liberar frente de pavimentação</strong><small>Aguardando drenagem · 35%</small><button class="activity-connect" data-connect-from="act-pav" aria-label="Arrastar para conectar">＋</button></article><svg class="activity-edges" aria-hidden="true"><path class="activity-edge" d="M0 0 C 0 0, 0 0, 0 0"></path></svg><div class="activity-relation relation-a">Drenagem → Pavimentação</div>`; canvas.appendChild(layer);
    const nodes=[...layer.querySelectorAll('.activity-node')]; let source=null; let connecting=null;
    const edge=layer.querySelector('.activity-edge'); const redraw=()=>{if(!edge)return; const a=nodes[0],b=nodes[2], x1=a.offsetLeft+a.offsetWidth, y1=a.offsetTop+a.offsetHeight/2, x2=b.offsetLeft, y2=b.offsetTop+b.offsetHeight/2, bend=Math.max(70,(x2-x1)/2); edge.setAttribute('d',`M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`);};
    nodes.forEach(node=>{node.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;e.preventDefault();node.setPointerCapture?.(e.pointerId);const initial={x:node.offsetLeft,y:node.offsetTop},origin={x:e.clientX,y:e.clientY};node.classList.add('dragging');const move=ev=>{node.style.left=`${Math.max(8,initial.x+ev.clientX-origin.x)}px`;node.style.top=`${Math.max(45,initial.y+ev.clientY-origin.y)}px`;redraw();};const up=()=>{node.classList.remove('dragging');node.releasePointerCapture?.(e.pointerId);node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',up);appStore.set({lastAction:`Reposicionou atividade ${node.querySelector('strong').textContent}`});};node.addEventListener('pointermove',move);node.addEventListener('pointerup',up);});
      const handle=node.querySelector('.activity-connect'); handle?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();handle.setPointerCapture?.(e.pointerId);connecting={from:node,move:ev=>{const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.activity-node');nodes.forEach(n=>n.classList.toggle('connect-target',n===target&&n!==node));}};handle.addEventListener('pointermove',connecting.move);const finish=ev=>{const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.activity-node');handle.releasePointerCapture?.(e.pointerId);handle.removeEventListener('pointermove',connecting.move);nodes.forEach(n=>n.classList.remove('connect-target'));if(target&&target!==node){source=node;const relation=layer.querySelector('.activity-relation');relation.textContent=`${node.dataset.stage} · ${node.querySelector('strong').textContent}  →  ${target.dataset.stage} · ${target.querySelector('strong').textContent}`;notify('Relacionamento entre atividades criado.','success');appStore.set({lastAction:'Relacionou atividades entre etapas'});}connecting=null;};handle.addEventListener('pointerup',finish,{once:true});});
    }); redraw();
  }
  mapPrintReport(){
    const state=appStore.get(),stage=demoData.activities.find(item=>item.id===state.selectedStage)||demoData.activities[1],overlayKey=stageOverlayKey(stage.name),overlayLabel=stageOverlayLabels[overlayKey]||stage.name;
    return `<section class="map-print-report"><header class="map-print-head"><div><span class="activity-kind">ALIANÇA PARK · RELATÓRIO EXECUTIVO</span><h1>Um empreendimento em evolução</h1><p>Uma visão integrada da implantação, da força comercial e do potencial financeiro que acompanham o desenvolvimento do Aliança Park.</p><div class="map-print-highlight"><i></i><span>Frente em evidência: <b>${esc(stage.name)}</b> · ${esc(overlayLabel)}</span></div></div></header><footer class="map-print-foot"><span>${ico('map')} Aliança Park · implantação urbana acompanhada em visão territorial</span><span>${ico('sparkles')} Panorama executivo de evolução, demanda e valor</span></footer></section>`;
  }
  openMapPrintMode(){
    appStore.set({printMode:true,lastAction:'Abriu relatório executivo do empreendimento'});
    const finishPrint=()=>{if(appStore.get().printMode)appStore.set({printMode:false,lastAction:'Concluiu impressão do relatório executivo'});};
    window.addEventListener('afterprint',finishPrint,{once:true});
    const map=document.querySelector('map-scene:not([compact])'),started=performance.now(),waitForScene=()=>{
      const ready=map?.dataset.modelRender==='webgl-live-glb'&&map?.dataset.mapTexture==='ready'&&map?.dataset.mapSurfaceVisible==='true';
      if(ready||performance.now()-started>4500){window.print();return;}
      requestAnimationFrame(waitForScene);
    };
    requestAnimationFrame(()=>requestAnimationFrame(waitForScene));
  }
  assistant(){ return `<div class="scene-title"><span>IA · Aliança Park</span><small>Panorama operacional do empreendimento</small></div><glass-card class="float-card map-complete"><h3>${ico('layers-3')} Mapa de completude</h3><ul class="legend"><li><i class="dot green"></i> Acima de 75%</li><li><i class="dot teal"></i> 50% a 75%</li><li><i class="dot amber"></i> 25% a 50%</li><li><i class="dot red"></i> Abaixo de 25%</li></ul><button data-view="map">Ver detalhes</button></glass-card><glass-card class="float-card collab-card"><h3>${ico('users')} Colaboradores ativos</h3><b>28</b><span>Hoje no canteiro</span><b>8</b><span>Em atividades externas</span><button data-view="collaborators">Ver equipe</button></glass-card><glass-card class="float-card mini chrono"><h3>${ico('calendar-days')} Cronograma</h3><p>Semana 18 · 12 atividades</p><div class="weekdots"><i></i><i></i><i></i><i class="today"></i><i class="warn"></i><i></i><i></i></div><button data-view="stages">Ver cronograma</button></glass-card><glass-card class="float-card mini leads-card"><h3>${ico('users-round')} Leads · 7 dias</h3><div class="sparkline">⌁⌃⌁⌃⌁⌃⌁</div><strong>24</strong><small>Total no período</small><button data-view="leads">Ver leads</button></glass-card><glass-card class="float-card mini buy-card"><h3>${ico('shopping-cart')} Compras críticas</h3><strong>Postes de concreto</strong><span>Déficit 8 un.</span><button data-view="purchases">Ver compras</button></glass-card>`; }
  map(){ const widgets=[['stages','calendar-days','Etapas'],['records','clipboard-pen-line','Registrar'],['leads','users-round','Leads'],['brokers','badge-dollar-sign','Corretores'],['finance','wallet-cards','Financeiro'],['reports','chart-no-axes-combined','Relatórios'],['settings','settings','Ajustes']]; return `<glass-card class="float-card overview wide"><h3>${ico('map')} Mapa operacional</h3><p>Atalhos de widgets para navegar e atuar sobre os dados do empreendimento.</p><div class="theme-grid map-widget-grid">${widgets.map(([view,icon,label])=>`<button type="button" data-view="${view}">${ico(icon)}<span>${label}</span></button>`).join('')}</div></glass-card>`; }
  stages(){ const a=demoData.activities; return `<glass-card class="float-card work-canvas"><div class="card-head"><div><h3>${ico('layout-dashboard')} Canvas de trabalho</h3><small>Arraste os nós para relacionar dados e etapas</small></div><span class="chip violet">48 meses</span></div><div class="canvas-columns"><div><b>01 · Criar</b><span class="canvas-node" draggable="true" data-node="Registro de gasto">${ico('plus')} Registro de gasto</span><span class="canvas-node" draggable="true" data-node="Etapa / subetapa">${ico('layers-3')} Etapa / subetapa</span></div><div><b>02 · Preencher</b><span class="canvas-node" draggable="true" data-node="Data e competência">${ico('calendar-plus')} Data e competência</span><span class="canvas-node" draggable="true" data-node="Valor unitário e total">${ico('wallet-cards')} Valor unitário e total</span></div><div><b>03 · Relacionar</b><div class="canvas-relate"><strong>Solte aqui para criar um relacionamento</strong><small>Orçamento mensal · Indicador · Relatório</small></div></div></div><div class="canvas-foot"><span>Última ação: ${appStore.get().lastAction}</span><button data-view="reports">Abrir relatório</button></div></glass-card><glass-card class="float-card timeline-card"><div class="card-head"><div><h3>${ico('calendar-clock')} Etapas + Cronograma</h3><small>Semanas 23 — 28</small></div><span class="chip violet">Semana atual · 25</span></div><div class="timeline">${a.map((x,i)=>`<div class="timeline-step ${x.status}"><b>${x.week}</b><span></span><strong>${x.name}</strong><small>${x.progress}% · ${x.owner}</small></div>`).join('')}</div></glass-card><glass-card class="float-card activity-list"><h3>${ico('list-checks')} Atividades da semana</h3>${a.slice(1,5).map(x=>`<div class="row"><span>${x.name}<small>${x.owner}</small></span><em class="status ${statusClass(x.status)}">${x.status}</em></div>`).join('')}</glass-card><glass-card class="float-card dep-card"><h3>${ico('triangle-alert')} Dependências e atrasos</h3><div class="alert-line"><b>Execução de meio-fio</b><span>Bloqueado</span></div><div class="alert-line"><b>Rede de água</b><span>Aguardando projeto</span></div><button>Ver análise completa</button></glass-card><glass-card class="float-card team-card"><h3>${ico('users')} Equipe escalada</h3>${demoData.collaborators.map(x=>`<div class="row"><span>${x[0]}<small>${x[1]}</small></span><em>${x[2]}</em></div>`).join('')}</glass-card>`; }
  stagesCanvas(){ const a=demoData.activities; const selected=demoData.activities.find(x=>x.id===appStore.get().selectedStage)||a[1]; const activityNames=['Preparar frente','Executar atividade principal','Validar medição','Liberar próxima frente']; const cards=a.map((x,i)=>{const overlay=stageOverlayKey(x.name);return `<button class="stage-overview-card ${x.id===selected.id?'selected':''} overlay-${overlay}" data-stage-index="${x.id}"><span class="stage-overview-index">${String(i+1).padStart(2,'0')}</span><strong>${x.name}</strong><span class="stage-overlay-chip">${stageOverlayLabels[overlay]}</span><map-scene compact data-stage="${esc(x.name)}" data-overlay="${overlay}" data-map-index="${i}" class="stage-map-thumb" aria-hidden="true"></map-scene><small>${x.week} · ${x.progress}%</small><i class="stage-progress-mini"><b style="width:${x.progress}%"></b></i></button>`;}).join(''); const details=`<div class="activity-detail" role="dialog" aria-modal="true"><button class="detail-close" data-close-detail aria-label="Fechar">×</button><span class="activity-kind">ATIVIDADE · ${selected.name.toUpperCase()}</span><h2 data-detail-title>Detalhes da etapa</h2><p>Superfície de controle exclusiva para organizar atividades, custos e dependências desta etapa.</p><div class="detail-columns"><div><small>RESPONSÁVEIS</small><b>${selected.owner}</b><b>Paula Nascimento · Planejamento</b></div><div><small>COMPRAS ASSOCIADAS</small><b>PE-2025-040 · Tubo PEAD Ø600mm</b><b>PE-2025-039 · Concreto FCK 25MPa</b></div><div><small>MATERIAIS</small><b>Tubos PVC · 780 m em uso</b><b>Cimento · 150 sc em uso</b></div></div></div>`; return `<div class="stage-shell stage-shell-expanded"><div class="stage-toolbar"><div class="breadcrumbs">Início <b>/</b> Obras <b>/</b> Aliança Park <b>/</b> Etapas</div><div class="stage-tools"><button class="stage-tab active">${ico('layout-dashboard')} Canvas</button><button class="ghost">${ico('sparkles')} IA: Sugestões</button></div></div><section class="stage-overview"><div class="section-kicker">ETAPAS DO EMPREENDIMENTO <small>Role horizontalmente para navegar por todo o calendário</small></div><div class="stage-overview-scroll">${cards}</div></section><div class="stage-body"><div class="stage-canvas stage-canvas-exclusive"><div class="canvas-guide"><b>Canvas exclusivo · ${selected.name}</b><span class="relation-label">Clique nos cards para ver detalhes · organize atividades livremente</span></div><article class="stage-card featured stage-detail-card"><div class="stage-card-head"><span class="status ${selected.status}">${selected.status}</span><h2>${selected.name}</h2><span class="stage-index">${selected.week} · ETAPA ${selected.id} DE 18</span></div><p class="stage-description">${selected.name} em acompanhamento operacional, com atividades, compras e recursos relacionados.</p><div class="stage-card-grid"><div class="stage-progress"><small>PROGRESSO GERAL</small><strong>${selected.progress}%</strong><div class="progress-ring"><i style="width:${selected.progress}%"></i></div><div class="metric-line"><span>Atividades</span><b>4</b></div><div class="metric-line"><span>Responsável</span><b>${selected.owner}</b></div></div><div class="stage-media"><map-scene compact data-stage="${esc(selected.name)}" data-overlay="${stageOverlayKey(selected.name)}" data-map-index="${a.findIndex(x=>x.id===selected.id)}" class="stage-map-detail" aria-label="Mapa da etapa ${esc(selected.name)}"></map-scene><small class="stage-map-status">Highlight: ${stageOverlayLabels[stageOverlayKey(selected.name)]} · ruas, lotes e pontos de acompanhamento</small></div><div class="stage-facts"><div><small>INÍCIO</small><b>03/06/2024</b></div><div><small>PREVISÃO TÉRMINO</small><b>16/06/2024</b></div><div><small>CUSTO PREVISTO</small><b>R$ 24.850,00</b></div><div><small>ASSOCIAÇÕES</small><b>2 compras · 8 materiais</b></div></div></div></article>${activityNames.map((name,i)=>`<button class="activity-node stage-activity-card" data-activity-detail="${name}" style="left:${34+i*245}px;top:${550+(i%2)*130}px"><span class="activity-kind">${i<2?'SUBATIVIDADE':'ATIVIDADE'} · ${selected.name}</span><strong>${name}</strong><small>${selected.owner} · ${Math.max(5,selected.progress-i*12)}%</small><span class="activity-connect">＋</span></button>`).join('')}${details}</div><aside class="stage-rail"><section><h3>${ico('list-checks')} ATIVIDADES DA ETAPA</h3>${activityNames.map((x,i)=>`<button class="rail-action" data-activity-detail="${x}">${String(i+1).padStart(2,'0')} · ${x}</button>`).join('')}</section><section><h3>${ico('history')} HISTÓRICO</h3><div class="history"><p><i></i>Hoje · Medição atualizada</p><p><i></i>Ontem · Material associado</p><p><i></i>05/06 · Compra vinculada</p></div></section><section><h3>${ico('zap')} AÇÕES RÁPIDAS</h3><button class="rail-action">＋ Adicionar atividade</button><button class="rail-action">＋ Associar compra</button><button class="rail-action">＋ Associar material</button></section></aside></div></div>`; }

  inventory(){ const rows=[['Terraplanagem','R$ 420.000','R$ 388.000','R$ 32.000','92%'],['Drenagem Pluvial','R$ 610.000','R$ 566.000','R$ 44.000','93%'],['Rede de Água','R$ 350.000','R$ 210.000','R$ 140.000','60%'],['Pavimentação','R$ 880.000','R$ 622.000','R$ 258.000','71%'],['Rede Elétrica','R$ 540.000','R$ 164.000','R$ 376.000','30%']]; return `<div class="kpi-strip"><stat-pill icon="wallet-cards" label="Orçamento total" value="R$ 2,80M" tone="violet" sub="48 meses"></stat-pill><stat-pill icon="coins" label="Realizado" value="R$ 1,95M" tone="teal" sub="69,6% do orçamento"></stat-pill><stat-pill icon="chart-no-axes-combined" label="Saldo projetado" value="R$ 845k" tone="amber"></stat-pill><stat-pill icon="triangle-alert" label="Variações" value="3" tone="red" sub="Requer análise"></stat-pill></div><glass-card class="float-card balance-main"><div class="card-head"><div><h3>${ico('chart-no-axes-combined')} Balanço financeiro por etapa</h3><small>Relação entre Orçamento, Lançamentos, Resumo Mensal e Indicadores</small></div><span class="chip violet">Junho · 2024</span></div><table><thead><tr><th>Centro de custo / etapa</th><th>Orçado</th><th>Realizado</th><th>Saldo</th><th>Consumo</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="positive">${r[3]}</td><td><span class="status ${r[4].startsWith('9')?'pendente':'concluido'}">${r[4]}</span></td></tr>`).join('')}</tbody></table></glass-card><glass-card class="float-card balance-monthly"><h3>${ico('calendar-range')} Resumo mensal</h3>${[['Jan/24','R$ 182k','62%'],['Fev/24','R$ 236k','68%'],['Mar/24','R$ 294k','71%'],['Abr/24','R$ 348k','76%'],['Mai/24','R$ 412k','82%'],['Jun/24','R$ 478k','86%']].map(r=>`<div class="row"><span>${r[0]}<small>Realizado acumulado</small></span><b>${r[1]}</b><em>${r[2]}</em></div>`).join('')}</glass-card><glass-card class="float-card balance-relations"><h3>${ico('git-branch')} Relações administrativas</h3><div class="relation-chain"><span>Lançamentos</span><b>→</b><span>Resumo Mensal</span><b>→</b><span>Indicadores</span></div><p>Os gastos registrados por data, etapa, fornecedor e valor alimentam o consolidado mensal e os indicadores de avanço físico-financeiro.</p><button data-view="reports">Abrir relatório completo</button></glass-card>`; }
  leads(){ const s=appStore.get().selectedLead, lead=demoData.leads[s]; return `<div class="kpi-strip"><stat-pill icon="users" label="Intenções cadastradas" value="238" tone="violet" sub="+28 hoje"></stat-pill><stat-pill icon="map-pin" label="Lotes com interesse" value="96" tone="blue"></stat-pill><stat-pill icon="phone" label="Leads em contato" value="61" tone="teal"></stat-pill><stat-pill icon="badge-check" label="Qualificados" value="37" tone="amber"></stat-pill></div><glass-card class="float-card public-lead-card"><div class="public-brand">VISTA VERDE <small>LOTEAMENTO</small></div><span class="launch-chip">LANÇAMENTO</span><h2>Encontre o lote ideal<br>para <em>morar ou investir</em></h2><p>Espelho operacional da captação pública: intenção, faixa de valor, terreno e orientação solar chegam ao CRM.</p><div class="public-fields"><input placeholder="Nome completo"><input placeholder="WhatsApp (com DDD)"><input placeholder="E-mail"></div><div class="intent-switch"><button class="selected">⌂ Moradia</button><button>▧ Investimento</button><button>☼ Veraneio</button></div><button class="public-submit">Quero atendimento ${ico('arrow-right')}</button></glass-card><glass-card class="float-card lead-detail"><h3>${ico('user-round-search')} Lead selecionado</h3><div class="person"><span class="avatar">${lead.name[0]}</span><div><strong>${lead.name}</strong><small>${lead.status}</small></div></div><dl><dt>Lote desejado</dt><dd>${lead.lot}</dd><dt>Faixa de valor</dt><dd>${lead.budget}</dd><dt>Nascer do sol</dt><dd>${lead.sun}</dd><dt>Altitude</dt><dd>${lead.altitude}</dd><dt>Terreno</dt><dd>${lead.terrain}</dd><dt>Objetivo</dt><dd>${lead.objective}</dd></dl></glass-card><glass-card class="float-card lot-intents"><h3>Intenções relacionadas</h3>${demoData.leads.map((x,i)=>`<button class="lead-row ${i===s?'selected':''}" data-lead="${i}"><span class="avatar">${x.name[0]}</span><span><b>${x.name}</b><small>${x.lot} · ${x.budget}</small></span><em>${x.status}</em></button>`).join('')}</glass-card>`; }
  purchases(){ return `<div class="kpi-strip"><stat-pill icon="clipboard-list" label="Pedidos em aberto" value="12" tone="violet" sub="R$ 485.230"></stat-pill><stat-pill icon="truck" label="Em andamento" value="8" tone="blue" sub="R$ 258.900"></stat-pill><stat-pill icon="clock-alert" label="Atrasadas" value="3" tone="amber" sub="R$ 78.600"></stat-pill><stat-pill icon="circle-check" label="Recebidas no mês" value="18" tone="teal" sub="R$ 612.450"></stat-pill></div><glass-card class="float-card purchase-analysis"><h3>${ico('sparkles')} IA · Análise de compras</h3><p>Há 3 pedidos atrasados com impacto direto em etapas críticas.</p><ul><li>Rede elétrica: postes com 8 dias de atraso</li><li>Drenagem: tubos com 5 dias de atraso</li></ul><button>Ver recomendações</button></glass-card><glass-card class="float-card purchase-summary"><h3>${ico('pie-chart')} Resumo de compras</h3><div class="donut"><span>R$ 1,43M<small>Total no mês</small></span></div><ul class="legend"><li><i class="dot violet"></i> Elétrica 32%</li><li><i class="dot blue"></i> Tubos 25%</li><li><i class="dot green"></i> Concreto 18%</li><li><i class="dot amber"></i> Diversos 15%</li></ul></glass-card><glass-card class="float-card purchases-table"><h3>${ico('shopping-cart')} Pedidos</h3><table><thead><tr><th>ID</th><th>Fornecedor</th><th>Descrição</th><th>Etapa</th><th>Valor</th><th>Status</th></tr></thead><tbody>${demoData.purchases.map(x=>`<tr><td>${x.id}</td><td>${x.supplier}</td><td>${x.desc}</td><td>${x.stage}</td><td>${x.value}</td><td><span class="status ${statusClass(x.status)}">${x.status}</span></td></tr>`).join('')}</tbody></table></glass-card><glass-card class="float-card deliveries"><h3>${ico('truck')} Próximas entregas</h3><div class="row"><span>18 MAI<small>Concreto FCK 25MPa</small></span><em>Em andamento</em></div><div class="row"><span>20 MAI<small>Cabo de alumínio</small></span><em>Em andamento</em></div><div class="row"><span>22 MAI<small>Caixa de passagem</small></span><em>Pendente</em></div></glass-card>`; }
  collaborators(){ return `<glass-card class="float-card collab-main"><h3>${ico('users')} Colaboradores</h3><p>Visualização das pessoas e frentes ativas sobre o mapa.</p>${demoData.collaborators.map((x,i)=>`<div class="collab-row"><span class="avatar">${x[0][0]}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em>${x[2]}</em></div>`).join('')}</glass-card><glass-card class="float-card collab-stats"><h3>${ico('hard-hat')} Presença e alocação</h3><b>28</b><span>Hoje no canteiro</span><b>8</b><span>Atividades externas</span><b>5</b><span>Equipamentos em uso</span></glass-card>`; }
  reports(){
    const s=appStore.get(), families=[...new Set(reportCatalog.map(report=>report.family))], family=families.includes(s.reportFamily)?s.reportFamily:families[0], types=reportCatalog.filter(report=>report.family===family), selected=types.find(report=>report.id===s.reportType)||types[0], periodLabels={'2024-06':'Junho de 2024','2024-Q2':'2º trimestre de 2024','2024':'Ano de 2024','all':'Todo o projeto'}, period=periodLabels[s.reportPeriod]||periodLabels['2024-06'];
    const signalClass=value=>/crít|risco|atras|atenção|ação|vencid|acima/i.test(String(value))?'warning':/posit|normal|conclu|dentro|planejad/i.test(String(value))?'positive':'neutral';
    const workbookSheets=['Lançamentos','Resumo Mensal','Orçamento','Indicadores','Como Usar'];
    const explanations={
      'financial-balance':'Compara orçamento, gasto realizado, saldo e consumo para cada centro de custo.',
      'monthly-spend':'Consolida as nove etapas por competência e o total mensal durante os 48 meses.',
      'budget-coverage':'Cruza as metas físicas do orçamento com os gastos alimentados pelos lançamentos.',
      'supplier-payments':'Permite auditar fornecedor, documento, quantidade, preço unitário, pagamento e status.',
      'unit-cost-indicators':'Converte gasto realizado em custo médio por lote e por metro quadrado de pavimentação.'
    };
    const explanation=explanations[selected.id]||'Leitura gerencial vinculada às entidades, etapas e registros operacionais correspondentes.';
    const rowDetails=selected.rows.map((row,index)=>`<tr class="report-detail-row" data-report-detail="${index}" hidden><td colspan="${selected.columns.length+1}"><div><b>${esc(row[0])}</b><span>Origem: ${esc(selected.source)} · período ${esc(period)}.</span><span>Composição: ${selected.columns.map((column,col)=>`${column}: ${row[col]??'—'}`).join(' · ')}.</span><span>Ação administrativa: conferir lançamento, vínculo da etapa e evidências antes do fechamento.</span></div></td></tr>`).join('');
    return `<div class="reports-workspace"><div class="reports-toolbar" aria-label="Toolbar de relatórios"><div class="report-toolbar-title"><span class="activity-kind">CENTRAL ADMINISTRATIVA</span><strong>Central de métricas</strong><small>${reportCatalog.length} leituras administrativas, operacionais e comerciais</small></div><label>Família<select data-report-family>${families.map(value=>`<option value="${esc(value)}" ${value===family?'selected':''}>${esc(value)}</option>`).join('')}</select></label><label>Relatório<select data-report-type>${types.map(report=>`<option value="${esc(report.id)}" ${report.id===selected.id?'selected':''}>${esc(report.label)}</option>`).join('')}</select></label><label>Período<select data-report-period><option value="2024-06" ${s.reportPeriod==='2024-06'?'selected':''}>Junho de 2024</option><option value="2024-Q2" ${s.reportPeriod==='2024-Q2'?'selected':''}>2º trimestre de 2024</option><option value="2024" ${s.reportPeriod==='2024'?'selected':''}>Ano de 2024</option><option value="all" ${s.reportPeriod==='all'?'selected':''}>Todo o projeto</option></select></label><button type="button" class="report-toolbar-button report-export" data-report-export>${ico('file-down')} Exportar CSV</button><button type="button" class="report-toolbar-button report-print" data-report-print>${ico('printer')} Imprimir</button></div><nav class="report-family-tabs" aria-label="Abas de família de métricas">${families.map(value=>`<button type="button" class="${value===family?'active':''}" data-report-family-tab="${esc(value)}">${esc(value)}<small>${reportCatalog.filter(item=>item.family===value).length} métricas</small></button>`).join('')}</nav><section class="report-type-tabs" aria-label="Subitens explicativos da família">${types.map(report=>`<button type="button" class="${report.id===selected.id?'active':''}" data-report-type-tab="${esc(report.id)}"><strong>${esc(report.label)}</strong><small>${esc(explanations[report.id]||report.description)}</small><span>${ico(report.icon)} ${esc(report.source)}</span></button>`).join('')}</section><glass-card class="float-card reports-main"><div class="card-head"><div><h3>${ico(selected.icon)} ${esc(selected.label)}</h3><small>${esc(selected.description)}</small></div><span class="chip violet">${esc(period)} · Atualizado agora</span></div><div class="report-context"><span>${ico('database')} Fonte: ${esc(selected.source)}</span><span>${esc(selected.family)} · relatório gerencial</span></div><div class="report-explainer"><b>${ico('circle-help')} Como interpretar</b><span>${esc(explanation)}</span><small>Planilha disponível: ${workbookSheets.join(' · ')}.</small></div><div class="report-grid">${selected.metrics.map(metric=>`<div class="report-metric"><small>${esc(metric[0])}</small><strong>${esc(metric[1])}</strong><span>${esc(metric[2])}</span></div>`).join('')}</div><div class="report-table-wrap"><table class="report-table"><thead><tr>${selected.columns.map(column=>`<th>${esc(column)}</th>`).join('')}<th>Desdobrar</th></tr></thead><tbody>${selected.rows.map((row,index)=>`<tr class="report-data-row" data-report-row="${index}">${row.map((cell,col)=>`<td>${col===row.length-1?`<span class="report-signal ${signalClass(cell)}">${esc(cell)}</span>`:esc(cell)}</td>`).join('')}<td><button type="button" class="report-row-toggle" data-report-row-toggle="${index}" aria-expanded="false">Ver itens</button></td></tr>`).join('')}${rowDetails}</tbody></table></div><div class="report-footer"><span>${ico('link-2')} Relacionado às tabelas do projeto e ao período selecionado.</span><button type="button" class="report-inline-export" data-report-export>${ico('download')} Baixar relatório</button></div></glass-card></div>`;
  }
  settings(){
    const s=appStore.get(),actor=s.currentActor||{name:'Warley',label:'Dono'}, audit=[...(s.actionAudit||[])].reverse();
    const category=(label='')=>{
      const text=label.toLowerCase();
      if(/mapa|lote|highlight|pintura|área|pan|street|segmento/.test(text))return 'Mapa';
      if(/registro|diário|evidência|progresso|medição/.test(text))return 'Registros';
      if(/relatório|export|impressão|métrica/.test(text))return 'Relatórios';
      if(/lead|reserva|whatsapp|comiss|contrato/.test(text))return 'Comercial';
      if(/etapa|atividade|agenda|afazer|canvas|workflow/.test(text))return 'Operação';
      if(/sincron|config|sessão|instal|firebase|banco|pat/.test(text))return 'Sistema';
      return 'Navegação';
    };
    const groups=['Navegação','Operação','Mapa','Registros','Relatórios','Comercial','Sistema'].map(name=>[name,audit.filter(item=>category(item.label)===name).length]).filter(([,count])=>count);
    const started=new Date(s.sessionStarted), elapsed=Math.max(0,Date.now()-started.getTime()), elapsedText=elapsed<60000?'agora':`${Math.floor(elapsed/60000)} min`;
    const formatTime=value=>new Date(value).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    return `<section class="settings-page">
      <header class="settings-intro"><div><span class="activity-kind">GOVERNANÇA DE USO · SESSÃO ATUAL</span><h2>${ico('activity')} Métricas de ações do usuário</h2><p>Auditoria operacional das interações feitas no sistema por <b>${esc(actor.name)} · ${esc(actor.label)}</b>. O histórico permanece neste navegador durante esta sessão.</p></div><div class="settings-actions"><button type="button" class="ghost" data-audit-export>${ico('file-down')} Exportar histórico</button><button type="button" class="danger" data-audit-clear>${ico('trash-2')} Limpar sessão</button></div></header>
      <section class="audit-summary" aria-label="Resumo de uso"><article><small>Ações registradas</small><strong>${audit.length}</strong><span>eventos desta sessão</span></article><article><small>Tempo em sessão</small><strong>${elapsedText}</strong><span>iniciada às ${formatTime(s.sessionStarted)}</span></article><article><small>Módulos utilizados</small><strong>${groups.length}</strong><span>${groups.map(([name])=>name).join(' · ')||'aguardando interação'}</span></article><article><small>Última ação</small><strong class="audit-last-action">${esc(s.lastAction||'—')}</strong><span>${audit[0]?formatTime(audit[0].at):'sem eventos'}</span></article></section>
      <section class="audit-grid"><glass-card class="audit-card audit-distribution"><div class="card-head"><div><h3>${ico('chart-no-axes-combined')} Distribuição por área</h3><small>Classificação automática a partir da ação executada.</small></div><span class="chip violet">${s.sessionId}</span></div><div class="audit-bars">${groups.length?groups.map(([name,count])=>`<div class="audit-bar"><span>${esc(name)}</span><b>${count}</b><i style="--audit-size:${Math.max(12,Math.round((count/audit.length)*100))}%"></i></div>`).join(''):'<p class="audit-empty">As ações aparecerão aqui conforme a equipe utilizar os módulos.</p>'}</div></glass-card>
      <glass-card class="audit-card audit-session"><div class="card-head"><div><h3>${ico('shield-check')} Contexto da sessão</h3><small>Rastreabilidade local de operação.</small></div></div><dl><div><dt>Ator</dt><dd>${esc(actor.name)} · ${esc(actor.label)}</dd></div><div><dt>ID da sessão</dt><dd><code>${esc(s.sessionId)}</code></dd></div><div><dt>Início</dt><dd>${new Date(s.sessionStarted).toLocaleString('pt-BR')}</dd></div><div><dt>Último módulo</dt><dd>${esc(audit[0]?.view||s.view)}</dd></div></dl><p class="audit-note">Esta métrica resume uso e navegação; não substitui uma trilha de auditoria imutável de servidor.</p></glass-card></section>
      <glass-card class="audit-card audit-timeline"><div class="card-head"><div><h3>${ico('list-checks')} Linha do tempo de interações</h3><small>${audit.length} eventos capturados · mais recente primeiro</small></div></div><div class="audit-events">${audit.length?audit.map(item=>`<article><time>${formatTime(item.at)}</time><div><b>${esc(item.label)}</b><small>${esc(category(item.label))} · ${esc(item.view||'dashboard')} · ${esc(item.actor||'Warley')}</small></div><span>${ico('circle-check')}</span></article>`).join(''):'<p class="audit-empty">Nenhuma ação registrada nesta sessão.</p>'}</div></glass-card>
      <footer class="settings-tools"><button id="reinstall">${ico('refresh-cw')} Reabrir instalação</button><button id="clearPat">${ico('key-round')} Limpar PAT local</button></footer>
    </section>`;
  }
}

ViewLayer.prototype.bindFloatingWidgets=function(){
  const view=appStore.get().view;
  if(!['assistant','map'].includes(view))return;
  [...this.querySelectorAll('.float-card')].forEach((card,index)=>{
    const key=`${view}:${[...card.classList].filter(name=>name!=='float-card').sort().join('.')||index}`;
    const saved=appStore.get().widgetLayouts?.floating?.[key];
    if(saved&&Number.isFinite(saved.left)&&Number.isFinite(saved.top)){card.style.setProperty('left',`${saved.left}px`,'important');card.style.setProperty('top',`${saved.top}px`,'important');card.style.setProperty('right','auto','important');card.style.setProperty('bottom','auto','important');}
    const handle=card.querySelector('h3');if(!handle||handle.dataset.layoutBound)return;
    handle.dataset.layoutBound='true';handle.classList.add('widget-drag-handle');
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('button'))return;
      event.preventDefault();const parent=this.getBoundingClientRect(),rect=card.getBoundingClientRect(),origin={x:event.clientX,y:event.clientY,left:rect.left-parent.left,top:rect.top-parent.top};
      card.classList.add('widget-dragging');handle.setPointerCapture?.(event.pointerId);
      const move=next=>{const left=Math.max(8,Math.min(parent.width-card.offsetWidth-8,origin.left+next.clientX-origin.x)),top=Math.max(70,Math.min(parent.height-card.offsetHeight-8,origin.top+next.clientY-origin.y));card.style.setProperty('left',`${left}px`,'important');card.style.setProperty('top',`${top}px`,'important');card.style.setProperty('right','auto','important');card.style.setProperty('bottom','auto','important');};
      const stop=()=>{handle.releasePointerCapture?.(event.pointerId);card.classList.remove('widget-dragging');handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);const rectNow=card.getBoundingClientRect();appStore.update(s=>({...s,widgetLayouts:{...(s.widgetLayouts||{}),floating:{...(s.widgetLayouts?.floating||{}),[key]:{left:Math.round(rectNow.left-parent.left),top:Math.round(rectNow.top-parent.top)}}}}));};
      handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',stop,{once:true});
    });
  });
};

ViewLayer.prototype.bindDedicatedActivityClicks=function(){
  const canvas=this.querySelector('.dedicated-canvas'); if(!canvas||canvas.dataset.activityClicksBound)return;
  canvas.dataset.activityClicksBound='true';
  canvas.addEventListener('click',event=>{
    if(event.target.closest('.surface-port,.surface-resize,.surface-edge-label'))return;
    const card=event.target.closest('.dedicated-activity'); if(!card||card.dataset.moved)return;
    const name=card.querySelector('strong')?.textContent?.trim(); if(!name)return;
    event.preventDefault(); event.stopImmediatePropagation(); this.openActivityPage(name);
  },true);
};

// A visão geral de etapas usa o mesmo gesto de relação do canvas dedicado:
// porta lateral → linha Bézier → outro card ou formulário de nova atividade.
ViewLayer.prototype.addActivityNodes = function(){
  const canvas=this.querySelector('.stage-canvas');
  if(!canvas||canvas.querySelector('.activity-layer'))return;
  const stageCard=this.querySelector('.stage-detail-card');
  if(stageCard&&!stageCard.querySelector('.stage-item-breakdown')){
    const selected=demoData.activities.find(item=>item.id===appStore.get().selectedStage)||demoData.activities[1];
    stageCard.insertAdjacentHTML('beforeend',`<details class="stage-item-breakdown"><summary>Destrinchar etapa: escopo, registros e relações</summary><div><section><small>ESCOPO E ENTREGAS</small><b>Frente ${esc(selected.name)} · avanço físico de ${selected.progress}%</b><span>Subitens: preparação, execução, medição, aceite e liberação da próxima frente.</span></section><section><small>REGISTROS E EVIDÊNCIAS</small><b>Diário de obra, fotos, medições e ocorrências</b><span>Todo registro deve informar data, responsável, trecho/lote, quantidade e comprovação associada.</span></section><section><small>SUPRIMENTOS E FINANÇAS</small><b>2 compras · 8 materiais · custo previsto R$ 24.850,00</b><span>Conferir pedido, fornecedor, quantidade consumida, saldo e vínculo com o orçamento.</span></section><section><small>GOVERNANÇA</small><b>${esc(selected.owner)} · responsável pela confirmação</b><span>Próxima decisão: validar qualidade, registrar aceite e notificar envolvidos.</span></section></div></details>`);
    stageCard.querySelector('.stage-item-breakdown')?.addEventListener('click',event=>event.stopPropagation());
  }
  const layer=document.createElement('div');
  layer.className='activity-layer';
  layer.innerHTML=`<div class="activity-layer-title">ATIVIDADES RELACIONADAS <small>Arraste o card para mover · arraste ● para conectar</small></div>
    <article class="activity-node workflow-card" data-node-id="overview-act-drenagem" data-activity-id="act-drenagem" data-stage="Drenagem Pluvial" style="left:34px;top:560px"><span class="activity-kind">ATIVIDADE · DRENAGEM</span><strong>Executar rede principal</strong><small>Responsável: Carlos Mendes · 82%</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <article class="activity-node workflow-card" data-node-id="overview-act-bocas" data-activity-id="act-bocas" data-stage="Drenagem Pluvial" style="left:310px;top:590px"><span class="activity-kind">SUBATIVIDADE</span><strong>Validar bocas de lobo</strong><small>Dependência: rede principal</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <article class="activity-node workflow-card" data-node-id="overview-act-pav" data-activity-id="act-pav" data-stage="Pavimentação" style="left:590px;top:790px"><span class="activity-kind">ATIVIDADE · PAVIMENTAÇÃO</span><strong>Liberar frente de pavimentação</strong><small>Aguardando drenagem · 35%</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <svg class="activity-edges" aria-hidden="true"></svg>`;
  canvas.appendChild(layer);

  layer.addEventListener('click',event=>{
    if(event.target.closest('.activity-connect,.surface-port,.surface-edge-label'))return;
    const card=event.target.closest('.activity-node'); if(!card)return;
    event.preventDefault(); event.stopImmediatePropagation();
    this.openActivityPage(card.querySelector('strong')?.textContent?.trim()||card.dataset.activityId||'Atividade',card.dataset.stage||'');
  },true);

  const nodes=[...layer.querySelectorAll('.workflow-card')];
  const relations=[{from:nodes[0],to:nodes[2],label:'Drenagem → Pavimentação'}];
  const point=(clientX,clientY)=>{const rect=canvas.getBoundingClientRect();return {x:clientX-rect.left+canvas.scrollLeft,y:clientY-rect.top+canvas.scrollTop};};
  const anchor=(node,side='out')=>({x:node.offsetLeft+(side==='in'?0:node.offsetWidth),y:node.offsetTop+node.offsetHeight/2});
  const curve=(x1,y1,x2,y2)=>{const bend=Math.max(56,Math.min(190,Math.abs(x2-x1)*.45));return `M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`;};
  const svg=layer.querySelector('.activity-edges');
  const draw=()=>{
    svg.innerHTML='';
    layer.querySelectorAll('.overview-relation-label').forEach(label=>label.remove());
    relations.forEach((rel,index)=>{
      if(!rel.from.isConnected||!rel.to.isConnected)return;
      const from=anchor(rel.from,'out'),to=anchor(rel.to,'in');
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.classList.add('activity-edge'); path.dataset.relationIndex=String(index); path.setAttribute('d',curve(from.x,from.y,to.x,to.y)); svg.appendChild(path);
      const label=document.createElement('button');
      label.type='button'; label.className='activity-relation overview-relation-label'; label.dataset.relationIndex=String(index); label.textContent=rel.label;
      label.style.left=`${Math.max(18,(from.x+to.x)/2-70)}px`; label.style.top=`${Math.max(520,(from.y+to.y)/2-12)}px`;
      label.title='Editar rótulo da relação';
      label.addEventListener('click',event=>{event.stopPropagation();const next=prompt('Rótulo da relação:',rel.label);if(next?.trim()){rel.label=next.trim();draw();}});
      layer.appendChild(label);
    });
  };
  const bindNodeDrag=node=>{
    if(node.dataset.overviewDragBound)return;
    node.dataset.overviewDragBound='true';
    node.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('.surface-port,.activity-connect'))return;
      event.preventDefault(); event.stopPropagation();
      const origin={x:event.clientX,y:event.clientY},initial={x:node.offsetLeft,y:node.offsetTop}; let moved=false;
      const move=ev=>{const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;if(!moved&&Math.hypot(dx,dy)<2)return;moved=true;node.classList.add('dragging');node.style.left=`${Math.max(8,initial.x+dx)}px`;node.style.top=`${Math.max(520,initial.y+dy)}px`;draw();};
      const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);node.classList.remove('dragging');if(moved){node.dataset.dragged='true';setTimeout(()=>delete node.dataset.dragged,120);appStore.set({lastAction:`Reposicionou atividade ${node.querySelector('strong')?.textContent||''}`});}};
      node.setPointerCapture?.(event.pointerId); window.addEventListener('pointermove',move); window.addEventListener('pointerup',finish,{once:true}); window.addEventListener('pointercancel',finish,{once:true});
    });
  };
  nodes.forEach(bindNodeDrag);
  const targetAt=(clientX,clientY)=>{const target=document.elementFromPoint(clientX,clientY)?.closest('.workflow-card');return target&&canvas.contains(target)?target:null;};
  const addRelation=(from,to,label='depende de')=>{if(!from||!to||from===to||relations.some(rel=>rel.from===from&&rel.to===to))return;relations.push({from,to,label});draw();};
  const showNewActivityForm=(source,clientX,clientY)=>{
    const drop=point(clientX,clientY),form=document.createElement('form'); form.className='workflow-drop-form'; form.style.left=`${Math.max(12,drop.x-64)}px`; form.style.top=`${Math.max(520,drop.y-18)}px`;
    const options=activityCatalog.slice(0,8).map(item=>`<option value="${esc(item.name)}">${esc(item.nature)} · ${esc(item.name)}</option>`).join('');
    form.innerHTML=`<b>Nova atividade conectada</b><small>Origem: ${esc(source.querySelector('strong')?.textContent||'atividade')}</small><label>Categoria<select name="categoria">${options}</select></label><label>Nome da atividade<input name="nome" required placeholder="Ex.: Validar execução da frente"></label><label>Tempo previsto <input name="horas" type="number" min="0.5" step="0.5" value="4"> h</label><div class="workflow-drop-actions"><button type="button" data-cancel>Cancelar</button><button type="submit">Criar e conectar</button></div>`;
    canvas.appendChild(form); form.querySelector('[data-cancel]')?.addEventListener('click',()=>form.remove());
    form.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(form),category=activityCatalog.find(item=>item.name===data.get('categoria')),card=document.createElement('article');card.className='activity-node workflow-card';card.dataset.nodeId=`overview-workflow-${Date.now()}-${Math.round(Math.random()*1000)}`;card.dataset.stage=category?.nature||'Nova atividade';card.style.left=`${Math.max(12,drop.x-64)}px`;card.style.top=`${Math.max(520,drop.y-18)}px`;card.innerHTML=`<span class="activity-kind">${esc(category?.nature||'NOVA ATIVIDADE')}</span><strong>${esc(String(data.get('nome')||category?.name||'Nova atividade').trim())}</strong><small>${esc(data.get('horas')||4)} hora(s) previstas · responsável a definir</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span>`;form.replaceWith(card);bindNodeDrag(card);nodes.push(card);addRelation(source,card,'gera');notify('Card criado e conectado à atividade de origem.','success');});
    form.querySelector('input[name="nome"]')?.focus();
  };
  canvas.addEventListener('pointerdown',event=>{
    const port=event.target.closest('.surface-port,.activity-connect'); if(!port||event.button!==0)return;
    const source=port.closest('.workflow-card'); if(!source)return;
    event.preventDefault(); event.stopImmediatePropagation(); port.setPointerCapture?.(event.pointerId); source.classList.add('relation-source','connection-dragging');
    const ghost=document.createElement('div'); ghost.className='connection-ghost connection-ghost-card'; ghost.innerHTML='<span class="activity-kind">NOVA ATIVIDADE</span><strong>Solte para preencher</strong><small>ou leve até outro card</small>'; canvas.appendChild(ghost); let target=null;
    const preview=(ev)=>{target=targetAt(ev.clientX,ev.clientY);nodes.forEach(node=>node.classList.toggle('relation-target',node===target&&node!==source));const from=anchor(source,'out'),to=target&&target!==source?anchor(target,'in'):point(ev.clientX,ev.clientY),path=svg.querySelector('.overview-connection-preview')||document.createElementNS('http://www.w3.org/2000/svg','path');path.classList.add('activity-edge','overview-connection-preview');path.setAttribute('d',curve(from.x,from.y,to.x,to.y));if(!path.parentNode)svg.appendChild(path);const p=point(ev.clientX,ev.clientY);ghost.style.left=`${Math.max(12,p.x+14)}px`;ghost.style.top=`${Math.max(520,p.y+14)}px`;};
    const finish=ev=>{window.removeEventListener('pointermove',preview);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);port.releasePointerCapture?.(event.pointerId);svg.querySelector('.overview-connection-preview')?.remove();nodes.forEach(node=>node.classList.remove('relation-target'));source.classList.remove('relation-source','connection-dragging');ghost.remove();const finalTarget=targetAt(ev.clientX,ev.clientY);if(finalTarget&&finalTarget!==source){addRelation(source,finalTarget,'depende de');notify('Linha de relacionamento criada. Clique no rótulo para editar.','success');}else showNewActivityForm(source,ev.clientX,ev.clientY);};
    window.addEventListener('pointermove',preview); window.addEventListener('pointerup',finish,{once:true}); window.addEventListener('pointercancel',finish,{once:true}); preview(event);
  },true);
  draw();
};

// Conexões do canvas: um único gesto pointer-based para cards existentes e novos.
// Fica fora da classe para substituir o handler legado sem reescrever o bloco
// minificado de compatibilidade que ainda existe no arquivo.
ViewLayer.prototype.bindGhostConnections = function(){
  const canvas=this.querySelector('.dedicated-canvas');
  if(!canvas||canvas.dataset.pointerConnections)return;
  const svg=canvas.querySelector('.surface-edges');
  if(!svg)return;
  canvas.dataset.pointerConnections='true';

  const point=(clientX,clientY)=>{
    const rect=canvas.getBoundingClientRect();
    return {x:clientX-rect.left+canvas.scrollLeft,y:clientY-rect.top+canvas.scrollTop};
  };
  const anchor=(node,side='out')=>{
    const x=node.offsetLeft+(side==='in'?0:node.offsetWidth);
    return {x,y:node.offsetTop+node.offsetHeight/2};
  };
  const curve=(x1,y1,x2,y2)=>{
    const bend=Math.max(56,Math.min(190,Math.abs(x2-x1)*.45));
    return `M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}`;
  };
  const targetAt=(clientX,clientY)=>{
    const node=document.elementFromPoint(clientX,clientY)?.closest('.workflow-card');
    return node&&canvas.contains(node)?node:null;
  };
  const preview=(source,clientX,clientY,target)=>{
    svg.querySelector('.connection-preview')?.remove();
    const from=anchor(source,'out'),to=target?anchor(target,'in'):point(clientX,clientY);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.classList.add('surface-edge','connection-preview');
    path.setAttribute('d',curve(from.x,from.y,to.x,to.y));
    svg.appendChild(path);
  };
  const relation=(from,to,label='depende de')=>{
    if(!from||!to||from===to)return;
    const duplicate=[...canvas.querySelectorAll('.surface-relation')].some(item=>item.dataset.from===from.dataset.nodeId&&item.dataset.to===to.dataset.nodeId);
    if(duplicate)return;
    const rel=document.createElement('span');
    rel.className='surface-relation';
    rel.dataset.from=from.dataset.nodeId;
    rel.dataset.to=to.dataset.nodeId;
    rel.dataset.label=label;
    canvas.appendChild(rel);
    this.drawSurfaceRelations(canvas);
  };
  const clearState=(source,target,ghost)=>{
    source?.classList.remove('relation-source','connection-dragging');
    target?.classList.remove('relation-target');
    ghost?.remove();
    svg.querySelector('.connection-preview')?.remove();
  };
  const showNewActivityForm=(source,clientX,clientY)=>{
    const drop=point(clientX,clientY);
    const form=document.createElement('form');
    form.className='workflow-drop-form';
    form.style.left=`${Math.max(12,drop.x-64)}px`;
    form.style.top=`${Math.max(76,drop.y-18)}px`;
    const options=activityCatalog.slice(0,8).map(item=>`<option value="${esc(item.name)}">${esc(item.nature)} · ${esc(item.name)}</option>`).join('');
    form.innerHTML=`<b>Nova atividade conectada</b><small>Origem: ${esc(source.querySelector('strong')?.textContent||'atividade')}</small><label>Categoria<select name="categoria">${options}</select></label><label>Nome da atividade<input name="nome" required placeholder="Ex.: Validar execução da frente"></label><label>Tempo previsto <input name="horas" type="number" min="0.5" step="0.5" value="4"> h</label><div class="workflow-drop-actions"><button type="button" data-cancel>Cancelar</button><button type="submit">Criar e conectar</button></div>`;
    canvas.appendChild(form);
    form.querySelector('[data-cancel]')?.addEventListener('click',()=>form.remove());
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const data=new FormData(form),category=activityCatalog.find(item=>item.name===data.get('categoria'));
      const name=String(data.get('nome')||category?.name||'Nova atividade').trim();
      const card=document.createElement('button');
      card.type='button';
      card.className='dedicated-activity workflow-card';
      card.dataset.nodeId=`workflow-${Date.now()}-${Math.round(Math.random()*1000)}`;
      card.dataset.hours=String(data.get('horas')||4);
      card.style.left=`${Math.max(12,drop.x-64)}px`;
      card.style.top=`${Math.max(76,drop.y-18)}px`;
      card.style.width='154px';
      card.innerHTML=`<span class="activity-kind">${esc(category?.nature||'NOVA ATIVIDADE')}</span><strong>${esc(name)}</strong><small>${esc(data.get('horas')||4)} hora(s) previstas · responsável a definir</small><em>Preencher campos →</em><span class="surface-port" title="Arrastar para conectar">●</span><span class="surface-resize" title="Ajustar duração"></span>`;
      form.replaceWith(card);
      this.makeSurfaceDrag(card,canvas);
      this.bindWorkflowFieldTrees();
      relation(source,card,'gera');
      notify('Card criado e conectado à atividade de origem.','success');
    });
    form.querySelector('input[name="nome"]')?.focus();
  };
  // Impede o antigo listener de clique da primeira renderização de disputar o gesto.
  canvas.addEventListener('click',event=>{
    if(event.target.closest('.surface-port')){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
  canvas.addEventListener('pointerdown',event=>{
    if(event.target.closest('.surface-edge-label'))return;
    const port=event.target.closest('.surface-port');
    if(!port||event.button!==0)return;
    const source=port.closest('.workflow-card');
    if(!source)return;
    event.preventDefault();
    event.stopPropagation();
    port.setPointerCapture?.(event.pointerId);
    source.classList.add('relation-source','connection-dragging');
    const ghost=document.createElement('div');
    ghost.className='connection-ghost connection-ghost-card';
    ghost.innerHTML='<span class="activity-kind">NOVA ATIVIDADE</span><strong>Solte para preencher</strong><small>ou leve até outro card</small>';
    canvas.appendChild(ghost);
    let target=null;
    const move=ev=>{
      target=targetAt(ev.clientX,ev.clientY);
      canvas.querySelectorAll('.workflow-card').forEach(card=>card.classList.toggle('relation-target',card===target&&card!==source));
      const p=point(ev.clientX,ev.clientY);
      ghost.style.left=`${Math.max(12,p.x+14)}px`;
      ghost.style.top=`${Math.max(76,p.y+14)}px`;
      preview(source,ev.clientX,ev.clientY,target&&target!==source?target:null);
    };
    const finish=ev=>{
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',finish);
      window.removeEventListener('pointercancel',finish);
      port.releasePointerCapture?.(event.pointerId);
      const finalTarget=targetAt(ev.clientX,ev.clientY);
      clearState(source,finalTarget,ghost);
      if(finalTarget&&finalTarget!==source){
        relation(source,finalTarget,'depende de');
        notify('Linha de relacionamento criada. Clique no rótulo para editar.','success');
      }else{
        showNewActivityForm(source,ev.clientX,ev.clientY);
        notify('Defina a nova atividade conectada.');
      }
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',finish,{once:true});
    window.addEventListener('pointercancel',finish,{once:true});
    move(event);
  },true);
};

const dashboardFilters=[
  ['execution','Execução Atual','activity','drenagem'],
  ['collaborators','Colaboradores','users','terraplanagem'],
  ['schedule','Cronograma','calendar-clock','pavimentacao'],
  ['leads','Leads','users-round','urbanizacao'],
  ['materials','Materiais','boxes','rede-agua'],
  ['risks','Riscos','triangle-alert','rede-eletrica']
];
const highlightStatus={
  execution:{eyebrow:'EXECUÇÃO ATUAL',title:'Drenagem pluvial',progress:42,status:'Em andamento',priority:'Alta',detail:'Frente ativa com medição e liberação parcial de trechos.',next:'Validar medição e liberar o próximo trecho.',view:'stages'},
  collaborators:{eyebrow:'EQUIPE EM CAMPO',title:'Terraplanagem',progress:68,status:'Equipe alocada',priority:'Operacional',detail:'Frente com operador, encarregado e máquina em atividade.',next:'Confirmar produção por hora de máquina.',view:'stages'},
  schedule:{eyebrow:'CRONOGRAMA',title:'Pavimentação',progress:0,status:'Bloqueada',priority:'Dependência',detail:'Só inicia após as redes e liberações de infraestrutura.',next:'Acompanhar a liberação da rede de água.',view:'stages'},
  leads:{eyebrow:'INTERESSE COMERCIAL',title:'Quadras e áreas verdes',progress:63,status:'Em visualização',priority:'Comercial',detail:'Destaque territorial para leitura de lotes e demanda.',next:'Responder leads com lote e condição disponíveis.',view:'leads'},
  materials:{eyebrow:'MATERIAIS',title:'Rede de água',progress:12,status:'Aguardando insumos',priority:'Antes da pavimentação',detail:'Tubos PEAD, cavaletes e ramais vinculados aos 298 lotes.',next:'Conferir entrega e apontar consumo por frente.',view:'stages'},
  risks:{eyebrow:'RISCO E DEPENDÊNCIA',title:'Rede elétrica',progress:8,status:'Aguardando Coelba',priority:'Última frente',detail:'Ligação depende do prazo externo e dos requisitos de material.',next:'Confirmar prazo da Coelba e lista de materiais.',view:'stages'}
};

export class MapFilterRail extends HTMLElement {
  connectedCallback(){this.render();}
  render(){
    const active=appStore.get().mapFilter||'execution';
    this.innerHTML=`<div class="map-filter-rail-head"><span>FILTROS DO MAPA</span><small>Selecione uma utilidade para destacar a área correspondente</small></div><div class="map-filter-rail-items">${dashboardFilters.map(([key,label,icon])=>`<button type="button" class="map-filter-chip ${active===key?'active':''}" data-map-filter="${key}">${ico(icon)}<span>${label}</span></button>`).join('')}</div>`;
    this.querySelectorAll('[data-map-filter]').forEach(button=>button.addEventListener('click',()=>this.select(button.dataset.mapFilter)));
    window.lucide?.createIcons();
  }
  select(key){
    const filter=dashboardFilters.find(item=>item[0]===key)||dashboardFilters[0];
    const map=document.querySelector('map-scene:not([compact])');
    appStore.set({mapFilter:key,lastAction:`Filtrou mapa por ${filter[1]}`});
    map?.setStageOverlay(filter[3],false);
    this.render();
  }
}
if(!customElements.get('map-filter-rail')) customElements.define('map-filter-rail', MapFilterRail);

ViewLayer.prototype.assistant=function(){
  const m=demoData.metrics;
  return `<div class="dashboard-home"><div class="scene-title dashboard-title"><span>IA · Aliança Park</span><small>Panorama operacional do empreendimento</small></div><glass-card class="float-card dashboard-ai-panel"><div class="dashboard-panel-title"><span class="ai-logo">✦</span><div><h2>IA · Aliança Park</h2><small>Resumo operacional atualizado</small></div></div><p class="dashboard-greeting">Bom dia, Warley. 👋</p><p>Este é o resumo do empreendimento com base nos dados de hoje.</p><div class="dashboard-kpis"><div><b>${m.completeness||63}%</b><small>Completude<br>geral</small></div><div><b>${m.delayed}</b><small>Etapas<br>atrasadas</small></div><div><b>${m.criticalPurchases}</b><small>Compras<br>críticas</small></div><div><b>${m.review}</b><small>Pendências<br>de revisão</small></div></div><h3 class="dashboard-question">O que você deseja acompanhar agora?</h3><div class="dashboard-quick-actions"><button data-view="stages">${ico('calendar-check')} Ver etapas críticas</button><button data-view="inventory">${ico('package-check')} Ver compras necessárias</button><button data-view="stages">${ico('calendar-range')} Ver cronograma de atividades</button><button data-view="leads">${ico('user-round-search')} Ver leads hoje</button><button data-view="records">${ico('clipboard-pen-line')} Registrar andamento</button><button data-view="map">${ico('layers-3')} Abrir mapa de completude</button></div><div class="dashboard-prompt">Pergunte algo ou dê um comando…<span>↗</span></div><small class="dashboard-example">Ex.: “Adicionar compra de 20 postes para a rede elétrica”</small></glass-card><glass-card class="float-card dashboard-completion-card"><div class="card-head"><h3>${ico('layers-3')} Mapa de completude</h3><button class="card-close" aria-label="Ocultar card">×</button></div><small>Setores destacados conforme o filtro ativo</small><ul class="legend"><li><i class="dot green"></i> Acima de 75%</li><li><i class="dot teal"></i> 50% a 75%</li><li><i class="dot amber"></i> 25% a 50%</li><li><i class="dot red"></i> Abaixo de 25%</li></ul><button data-view="map">${ico('scan-search')} Ver detalhes</button></glass-card><glass-card class="float-card dashboard-collab-card"><h3>${ico('users')} Colaboradores ativos</h3><div class="dashboard-stat-row"><b>${m.collaborators}</b><span>Hoje no canteiro</span></div><div class="dashboard-stat-row"><b>8</b><span>Em atividades externas</span></div><div class="dashboard-stat-row"><b>5</b><span>Equipamentos em uso</span></div><button data-view="collaborators">${ico('users-round')} Ver equipe</button></glass-card><glass-card class="float-card dashboard-schedule-card"><div class="card-head"><h3>${ico('calendar-days')} Cronograma de atividades</h3><button class="card-close" aria-label="Ocultar card">×</button></div><small>Semana 18 · 28/04 — 04/05</small><div class="dashboard-week"><i></i><i></i><i></i><i class="today"></i><i class="warn"></i><i></i><i></i></div><div class="dashboard-list"><span>12 atividades planejadas</span><span>8 em andamento</span><span>2 atrasadas</span></div><button data-view="stages">${ico('external-link')} Ver cronograma</button></glass-card><glass-card class="float-card dashboard-leads-card"><div class="card-head"><h3>${ico('users-round')} Leads dos últimos 7 dias</h3><button class="card-close" aria-label="Ocultar card">×</button></div><div class="dashboard-sparkline">⌁⌃⌁⌃⌁⌃⌁⌃</div><div class="dashboard-lead-stats"><span><b>${m.leads}</b><small>Total de leads</small></span><span><b>A12, A15, B07</b><small>Mais procurados</small></span></div><button data-view="leads">${ico('external-link')} Ver leads</button></glass-card><glass-card class="float-card dashboard-purchases-card"><div class="card-head"><h3>${ico('shopping-cart')} Compras críticas</h3><button class="card-close" aria-label="Ocultar card">×</button></div><strong>Postes de concreto 11m</strong><div class="dashboard-purchase-metrics"><span>Estoque atual <b>12 un.</b></span><span>Necessário <b>20 un.</b></span><span>Déficit <b class="danger">8 un.</b></span></div><p>Previsão de entrega: 3 dias</p><button data-view="inventory">${ico('external-link')} Ver compras</button></glass-card><div class="dashboard-action-bar"><button data-view="stages">${ico('bot')} Explicar atrasos</button><button data-view="stages">${ico('wand-sparkles')} Sugerir próximos passos</button><button data-view="reports">${ico('triangle-alert')} Ver riscos</button><button data-view="reports">${ico('file-chart-column')} Resumo executivo</button></div><map-filter-rail></map-filter-rail></div>`;
};

// The assistant is a single persistent shell element rendered by app.js.
// Keep the dashboard cards, but strip any legacy embedded assistant panel so
// the home view can never render a second chatbox after a hot reload/cache hit.
const assistantDashboardTemplate=ViewLayer.prototype.assistant;
ViewLayer.prototype.assistant=function(){
  return assistantDashboardTemplate.call(this).replace(/<glass-card class="float-card dashboard-ai-panel">[\s\S]*?<\/glass-card>/,'');
};

// O balanço deixou de ser uma página concorrente. O resumo de orçamento passa
// a ser uma leitura rápida do dashboard e a análise detalhada permanece em
// Relatórios, evitando dois fluxos financeiros com os mesmos números.
const assistantDashboardWithoutBalance=ViewLayer.prototype.assistant;
ViewLayer.prototype.assistant=function(){
  const balance=`<glass-card class="float-card dashboard-finance-card"><div class="card-head"><h3>${ico('wallet-cards')} Balanço da implantação</h3><button class="card-close" aria-label="Ocultar card">×</button></div><div class="dashboard-finance-kpis"><span><small>Orçado</small><b>R$ 2,80M</b></span><span><small>Realizado</small><b>R$ 1,95M</b></span><span><small>Saldo</small><b>R$ 845k</b></span></div><p>69,6% consumido · relação entre Orçamento, Lançamentos, Resumo Mensal e Indicadores.</p><button data-view="reports">Abrir métricas financeiras ${ico('external-link')}</button></glass-card>`;
  return assistantDashboardWithoutBalance.call(this).replace('<map-filter-rail></map-filter-rail>',`${balance}<map-filter-rail></map-filter-rail>`);
};

const extensionStage=()=>demoData.activities.find(item=>item.id===appStore.get().selectedStage)||demoData.activities[1];
const stageViewTabs=(active)=>{
  const stage=extensionStage();
  const tabs=[['stages','gantt-chart','Gantt'],['pert','git-branch','PERT'],['actions','sparkles','Ações IA'],['raci','users-round','RACI'],['raid','shield-alert','RAID'],['agenda','calendar-days','Agenda'],['activities','list-checks','Atividades'],['progress','clipboard-check','Andamento']];
  return `<nav class="stage-view-tabs" aria-label="Exibições da etapa"><div class="stage-view-context"><span class="activity-kind">ETAPA EM FOCO</span><strong>${esc(stage.name)}</strong><small>${esc(stage.week)} · ${stage.progress}% · ${esc(stage.owner)}</small></div><div class="stage-view-links">${tabs.map(([view,icon,label])=>`<button type="button" class="${active===view?'active':''}" data-stage-view="${view}" data-view="${view}">${ico(icon)} ${label}</button>`).join('')}</div></nav>`;
};


// BELAVISTA_OPERATIONAL_INTELLIGENCE_V1
// PERT, Action Matrix, RACI and RAID are projections of the same stage entities.
// They deliberately reuse appStore state instead of creating independent mini apps.
const OPERATIONAL_PHASES=['Identificar','Preparar','Liberar','Executar','Verificar'];
const OPERATIONAL_ACTIONS=[
  {id:'AI-A01',label:'Pavimentar Q3',impact:92,readiness:84,phase:2,track:'Frente de execução',owner:'Carlos Mendes',eta:'Hoje · 14:00',blocker:'Medição anterior validada',relation:'Pavimentação'},
  {id:'AI-A02',label:'Instalar postes · rua B',impact:86,readiness:72,phase:1,track:'Responsabilidade',owner:'Paula Nascimento',eta:'Amanhã · 08:00',blocker:'Confirmar equipe da concessionária',relation:'Rede elétrica'},
  {id:'AI-A03',label:'Comprar tubos PEAD',impact:79,readiness:47,phase:1,track:'Suprimento',owner:'Mariana Lopes',eta:'Hoje · 11:30',blocker:'Aprovar cotação final',relation:'Drenagem'},
  {id:'AI-A04',label:'Liberar medição drenagem',impact:88,readiness:91,phase:3,track:'Frente de execução',owner:'Carlos Mendes',eta:'Agora',blocker:'Sem bloqueios',relation:'Drenagem'},
  {id:'AI-A05',label:'Revisar praça central',impact:54,readiness:36,phase:0,track:'Risco',owner:'Paula Nascimento',eta:'Próximos 3 dias',blocker:'Projeto paisagístico pendente',relation:'Urbanização'},
  {id:'AI-A06',label:'Conferir estoque de brita',impact:61,readiness:68,phase:2,track:'Suprimento',owner:'Mariana Lopes',eta:'Hoje · 16:30',blocker:'Contagem física em andamento',relation:'Pavimentação'}
];
const ACTION_TRACK_STEPS={
  'Frente de execução':['Validar predecessora','Confirmar equipe e frente','Liberar execução','Executar e medir','Registrar evidência e liberar próxima'],
  'Suprimento':['Detectar necessidade','Validar saldo e especificação','Cotar / aprovar compra','Receber e inspecionar','Reservar material e liberar frente'],
  'Responsabilidade':['Detectar atividade sem dono','Definir R/A/C/I','Confirmar agenda e contrato','Executar atribuição','Confirmar entrega e evidência'],
  'Risco':['Identificar sinal','Qualificar impacto','Definir mitigação','Executar contenção','Reavaliar e encerrar']
};
const RAID_DEFAULTS=[
  {id:'RAID-R1',kind:'risk',title:'Chuva sobre pavimentação',detail:'Janela de execução pode perder 2 dias.',level:'alto',linked:'Pavimentação'},
  {id:'RAID-R2',kind:'risk',title:'Atraso de postes',detail:'Entrega depende do fornecedor regional.',level:'médio',linked:'Rede elétrica'},
  {id:'RAID-A1',kind:'assumption',title:'Equipe de drenagem completa',detail:'Planejamento assume 8 pessoas em campo.',level:'médio',linked:'Drenagem'},
  {id:'RAID-A2',kind:'assumption',title:'Liberação da concessionária',detail:'Aceite previsto dentro da janela atual.',level:'baixo',linked:'Rede elétrica'},
  {id:'RAID-I1',kind:'issue',title:'Tubos abaixo do estoque mínimo',detail:'Quantidade disponível não cobre a próxima frente.',level:'alto',linked:'Drenagem'},
  {id:'RAID-I2',kind:'issue',title:'Medição aguardando validação',detail:'Frente seguinte permanece bloqueada.',level:'alto',linked:'Pavimentação'},
  {id:'RAID-D1',kind:'dependency',title:'Compactação antes do pavimento',detail:'Ensaio precisa ser aprovado antes da camada seguinte.',level:'alto',linked:'Pavimentação'},
  {id:'RAID-D2',kind:'dependency',title:'Compra → recebimento → execução',detail:'Material recebido precisa ser inspecionado e reservado.',level:'médio',linked:'Suprimentos'}
];
const PERT_GRAPH={
  nodes:[
    {id:'scope',label:'Preparar frente',x:7,y:18,owner:'Mariana Lopes',material:'Projeto · equipe',contract:'Ordem de serviço',progress:100},
    {id:'survey',label:'Conferir locação e cotas',x:29,y:9,owner:'Carlos Mendes',material:'Topografia',contract:'Serviço técnico',progress:100},
    {id:'materials',label:'Confirmar materiais',x:29,y:52,owner:'Mariana Lopes',material:'Tubos · brita · cimento',contract:'PE-2025-040',progress:76},
    {id:'execute',label:'Executar frente principal',x:53,y:30,owner:'Carlos Mendes',material:'Equipe + equipamentos',contract:'Contrato de execução',progress:62},
    {id:'measure',label:'Medição de avanço',x:73,y:12,owner:'Carlos Mendes',material:'Boletim de medição',contract:'BM-06/2024',progress:25},
    {id:'inspect',label:'Inspeção / validação',x:73,y:55,owner:'Paula Nascimento',material:'Checklist · fotos',contract:'Controle de qualidade',progress:0},
    {id:'release',label:'Liberar frente seguinte',x:89,y:33,owner:'Mariana Lopes',material:'Agenda · equipe',contract:'Liberação operacional',progress:0}
  ],
  edges:[['scope','survey'],['scope','materials'],['survey','execute'],['materials','execute'],['execute','measure'],['execute','inspect'],['measure','release'],['inspect','release']]
};
const RACI_ACTORS=[
  {id:'carlos',name:'Carlos Mendes',role:'Engenharia / execução',contract:'CT-ENG-014'},
  {id:'mariana',name:'Mariana Lopes',role:'Planejamento / suprimentos',contract:'CT-ADM-008'},
  {id:'paula',name:'Paula Nascimento',role:'Qualidade / campo',contract:'CT-QLD-021'},
  {id:'fornecedor',name:'Fornecedor principal',role:'Materiais e entregas',contract:'PE-2025-040'}
];
const RACI_TASKS=[
  {id:'t1',label:'Preparar frente'}, {id:'t2',label:'Confirmar materiais'}, {id:'t3',label:'Executar serviço'},
  {id:'t4',label:'Registrar medição'}, {id:'t5',label:'Validar qualidade'}, {id:'t6',label:'Liberar próxima frente'}
];
const defaultRaci=()=>({
  t1:{carlos:'C',mariana:'A',paula:'I',fornecedor:'I'},
  t2:{carlos:'C',mariana:'A',paula:'I',fornecedor:'R'},
  t3:{carlos:'R',mariana:'A',paula:'C',fornecedor:'I'},
  t4:{carlos:'R',mariana:'A',paula:'C',fornecedor:'I'},
  t5:{carlos:'C',mariana:'I',paula:'A',fornecedor:'I'},
  t6:{carlos:'R',mariana:'A',paula:'C',fornecedor:'I'}
});
const raciMeaning={R:'Responsável · executa a atividade',A:'Aprovador · responde pelo resultado',C:'Consultado · participa da decisão',I:'Informado · acompanha o avanço','—':'Sem vínculo definido'};

const operationalActions=()=>{
  const saved=appStore.get().aiActions;
  return Array.isArray(saved)&&saved.length?saved.map(item=>({...item})):OPERATIONAL_ACTIONS.map(item=>({...item}));
};
const operationalRaid=()=>{
  const saved=appStore.get().raidItems;
  return Array.isArray(saved)&&saved.length?saved.map(item=>({...item})):RAID_DEFAULTS.map(item=>({...item}));
};
const currentPertNodes=()=>{
  const overrides=appStore.get().pertOverrides||{};
  const base=PERT_GRAPH.nodes.map(node=>({...node,...(overrides[node.id]||{})}));
  const complete=new Set(base.filter(node=>node.progress>=100).map(node=>node.id));
  return base.map(node=>{
    const incoming=PERT_GRAPH.edges.filter(([,to])=>to===node.id).map(([from])=>from);
    const unlocked=!incoming.length||incoming.every(id=>complete.has(id));
    const state=node.progress>=100?'done':node.progress>0?'active':unlocked?'available':'locked';
    return {...node,state};
  });
};

ViewLayer.prototype.pert=function(){
  const stage=extensionStage(),nodes=currentPertNodes(),selectedId=appStore.get().selectedPertNode||nodes.find(node=>node.state==='active')?.id||nodes[0].id,selected=nodes.find(node=>node.id===selectedId)||nodes[0];
  const edges=PERT_GRAPH.edges.map(([from,to])=>{const a=nodes.find(n=>n.id===from),b=nodes.find(n=>n.id===to);if(!a||!b)return '';const x1=a.x+7,y1=a.y+8,x2=b.x,y2=b.y+8,m=(x1+x2)/2;return `<path d="M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}"/><circle cx="${x2}" cy="${y2}" r="0.7"/>`;}).join('');
  const cards=nodes.map(node=>`<button type="button" class="pert-node state-${node.state} ${node.id===selected.id?'selected':''}" data-pert-node="${node.id}" style="--x:${node.x}%;--y:${node.y}%"><span class="pert-state-icon">${node.state==='done'?'✓':node.state==='locked'?'⌁':node.state==='available'?'○':'●'}</span><span><small>${node.state==='done'?'CONCLUÍDA':node.state==='active'?'EM EXECUÇÃO':node.state==='available'?'AÇÃO DISPONÍVEL':'BLOQUEADA'}</small><strong>${esc(node.label)}</strong><em>${node.progress}% · ${esc(node.owner)}</em></span></button>`).join('');
  return `<div class="stage-extension-page pert-page"><div class="extension-head"><div><span class="activity-kind">PERT · ${esc(stage.name)}</span><h1>Dependências vivas da etapa</h1><p>O grafo mostra o que já foi concluído, o que pode começar agora e quais atividades ainda dependem de liberações anteriores.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico('arrow-left')} Gantt da etapa</button><button class="primary" data-view="actions">${ico('sparkles')} Ações disponíveis</button></div></div><div class="pert-layout"><section class="pert-canvas"><div class="pert-canvas-head"><span>FLUXO OPERACIONAL</span><div class="pert-legend"><i class="done"></i> concluída <i class="active"></i> execução <i class="available"></i> disponível <i class="locked"></i> bloqueada</div></div><svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${cards}</section><aside class="pert-inspector"><span class="activity-kind">NÓ SELECIONADO · ${selected.state.toUpperCase()}</span><h2>${esc(selected.label)}</h2><div class="pert-progress"><i style="width:${selected.progress}%"></i></div><div class="pert-properties"><div><small>RESPONSÁVEL</small><b>${esc(selected.owner)}</b></div><div><small>MATERIAIS / EVIDÊNCIAS</small><b>${esc(selected.material)}</b></div><div><small>CONTRATO / DOCUMENTO</small><b>${esc(selected.contract)}</b></div><div><small>ÚLTIMA ATUALIZAÇÃO</small><b>Hoje · ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</b></div></div><div class="pert-inspector-actions"><button class="ghost" data-view="records">${ico('images')} Ver evidências</button><button class="ghost" data-view="activities">${ico('panel-right-open')} Abrir atividade</button>${selected.state!=='done'?`<button class="primary" data-pert-complete="${selected.id}">${ico('check-check')} Marcar concluída</button>`:'<span class="pert-complete-note">Próximas dependências foram reavaliadas.</span>'}</div></aside></div></div>`;
};

ViewLayer.prototype.actions=function(){
  const stage=extensionStage(),actions=operationalActions(),selectedId=appStore.get().selectedAiAction||actions[0].id,selected=actions.find(item=>item.id===selectedId)||actions[0],steps=ACTION_TRACK_STEPS[selected.track]||ACTION_TRACK_STEPS['Frente de execução'];
  const points=actions.map(item=>`<button type="button" class="action-point ${item.id===selected.id?'selected':''} phase-${item.phase}" data-ai-action="${item.id}" style="left:${item.readiness}%;bottom:${item.impact}%" title="${esc(item.label)} · impacto ${item.impact} · prontidão ${item.readiness}"><span></span><b>${esc(item.label)}</b><small>${item.readiness}% pronto</small></button>`).join('');
  const walk=steps.map((step,index)=>`<div class="attitude-step ${index<selected.phase?'done':index===selected.phase?'current':''}"><i>${index<selected.phase?'✓':String(index+1).padStart(2,'0')}</i><span><b>${esc(OPERATIONAL_PHASES[index])}</b><small>${esc(step)}</small></span></div>`).join('');
  const highNow=actions.filter(item=>item.impact>=75&&item.readiness>=75).length;
  return `<div class="stage-extension-page ai-actions-page"><div class="extension-head"><div><span class="activity-kind">IA · ACTION MATRIX · ${esc(stage.name)}</span><h1>Ações por impacto e prontidão</h1><p>A IA distribui atitudes no plano operacional e transforma cada recomendação em uma caminhada de preparação → liberação → execução → verificação.</p></div><div class="extension-head-actions"><span class="ai-ready-count">${highNow} ações em “executar agora”</span><button class="ghost" data-view="pert">${ico('git-branch')} Ver dependências</button></div></div><div class="action-workspace"><section class="action-matrix" data-action-matrix><div class="matrix-quadrant q-now"><b>EXECUTAR AGORA</b><small>alto impacto · alta prontidão</small></div><div class="matrix-quadrant q-prepare"><b>PREPARAR</b><small>alto impacto · baixa prontidão</small></div><div class="matrix-quadrant q-opportunity"><b>OPORTUNIDADES</b><small>prontas · menor impacto</small></div><div class="matrix-axis axis-y"><span>IMPACTO</span><b>alto</b><small>baixo</small></div><div class="matrix-axis axis-x"><span>PRONTIDÃO</span><small>preparar</small><b>pronto</b></div>${points}</section><aside class="action-inspector"><span class="activity-kind">${esc(selected.track).toUpperCase()} · ${esc(OPERATIONAL_PHASES[selected.phase])}</span><h2>${esc(selected.label)}</h2><div class="action-score"><div><small>IMPACTO</small><b>${selected.impact}</b></div><div><small>PRONTIDÃO</small><b>${selected.readiness}%</b></div></div><dl><dt>Responsável</dt><dd>${esc(selected.owner)}</dd><dt>Próxima janela</dt><dd>${esc(selected.eta)}</dd><dt>Bloqueio atual</dt><dd>${esc(selected.blocker)}</dd><dt>Entidade ligada</dt><dd>${esc(selected.relation)}</dd></dl><div class="action-inspector-buttons"><button class="ghost" data-view="raci">${ico('users-round')} Conferir RACI</button><button class="primary" data-ai-advance="${selected.id}">${selected.phase>=4?ico('check-circle')+' Encerrada':ico('arrow-right')+' Adiantar atitude'}</button></div></aside></div><section class="attitude-walk"><header><div><span class="activity-kind">CAMINHADA DE ADIANTAMENTO</span><h2>${esc(selected.track)}</h2><p>Cada passo transforma intenção em pré-condição verificável; a IA só promove a ação quando a etapa anterior fica satisfeita.</p></div><div class="attitude-track-tabs">${Object.keys(ACTION_TRACK_STEPS).map(track=>`<span class="${track===selected.track?'active':''}">${esc(track)}</span>`).join('')}</div></header><div class="attitude-step-grid">${walk}</div><footer><span>${ico('link-2')} Ligada a ${esc(selected.relation)} · ${esc(stage.name)}</span><button class="ghost" data-ai-open-chat="${selected.id}">${ico('bot')} Pedir à IA para preparar o próximo passo</button></footer><div class="parallel-walks">${Object.entries(ACTION_TRACK_STEPS).map(([track,path])=>`<article class="parallel-walk ${track===selected.track?'active':''}"><header><span>${ico(track==='Suprimento'?'package-check':track==='Risco'?'shield-alert':track==='Responsabilidade'?'users-round':'hard-hat')}</span><b>${esc(track)}</b></header><div>${path.map((step,index)=>`<span class="${track===selected.track&&index===selected.phase?'current':''}"><i>${index+1}</i><small>${esc(step)}</small></span>`).join('')}</div></article>`).join('')}</div></section></div>`;
};

ViewLayer.prototype.raci=function(){
  const stage=extensionStage(),assignments=appStore.get().raciAssignments||defaultRaci(),selectedKey=appStore.get().selectedRaciCell||'t3:carlos',parts=selectedKey.split(':'),task=RACI_TASKS.find(item=>item.id===parts[0])||RACI_TASKS[2],actor=RACI_ACTORS.find(item=>item.id===parts[1])||RACI_ACTORS[0],role=assignments?.[task.id]?.[actor.id]||'—';
  const head=RACI_ACTORS.map(item=>`<div class="raci-actor"><span class="avatar">${item.name[0]}</span><b>${esc(item.name)}</b><small>${esc(item.role)}</small></div>`).join('');
  const rows=RACI_TASKS.map(item=>`<div class="raci-task"><span><b>${esc(item.label)}</b><small>${esc(stage.name)}</small></span></div>${RACI_ACTORS.map(person=>{const value=assignments?.[item.id]?.[person.id]||'—',key=`${item.id}:${person.id}`;return `<button type="button" class="raci-cell role-${value.toLowerCase()} ${key===selectedKey?'selected':''}" data-raci-cell="${key}" title="Clique para inspecionar · duplo clique para alternar R/A/C/I"><b>${value}</b><small>${value==='—'?'definir':raciMeaning[value].split(' · ')[0]}</small></button>`;}).join('')}`).join('');
  return `<div class="stage-extension-page raci-page"><div class="extension-head"><div><span class="activity-kind">PESSOAS RESPONSÁVEIS · ${esc(stage.name)}</span><h1>RACI interativa da etapa</h1><p>Atividades nas linhas, pessoas e empresas nas colunas. A célula abre contrato, registros recentes, tarefas e o vínculo de responsabilidade.</p></div><div class="extension-head-actions"><button class="ghost" data-view="actions">${ico('sparkles')} Ações da IA</button><button class="ghost" data-view="agenda">${ico('calendar-days')} Agenda</button></div></div><div class="raci-layout"><section class="raci-table"><div class="raci-corner"><b>ATIVIDADE</b><small>R · A · C · I</small></div>${head}${rows}</section><aside class="raci-inspector"><span class="activity-kind">${role==='—'?'SEM VÍNCULO':raciMeaning[role]}</span><h2>${esc(actor.name)}</h2><p>${esc(task.label)} · ${esc(stage.name)}</p><div class="raci-inspector-grid"><div><small>FUNÇÃO</small><b>${esc(actor.role)}</b></div><div><small>CONTRATO / VÍNCULO</small><b>${esc(actor.contract)}</b></div><div><small>REGISTRO RECENTE</small><b>${esc(task.label)} · hoje 09:45</b></div><div><small>TAREFA RELACIONADA</small><b>Confirmar evidência e próximo responsável</b></div></div><div class="raci-role-legend"><span><b>R</b> executa</span><span><b>A</b> aprova</span><span><b>C</b> consultado</span><span><b>I</b> informado</span></div><div class="raci-actions"><button class="ghost" data-view="records">${ico('clipboard-pen-line')} Abrir registros</button><button class="primary" data-raci-cycle="${selectedKey}">${ico('refresh-cw')} Alterar papel</button></div><small class="raci-hint">Duplo clique em qualquer célula também alterna R → A → C → I → sem vínculo.</small></aside></div></div>`;
};

ViewLayer.prototype.raid=function(){
  const stage=extensionStage(),items=operationalRaid(),selectedId=appStore.get().selectedRaidItem||items[0].id,selected=items.find(item=>item.id===selectedId)||items[0],zones=[['risk','Riscos','Probabilidade × impacto'],['assumption','Premissas','Hipóteses que sustentam o plano'],['issue','Problemas','Ocorrências que exigem ação'],['dependency','Dependências','Condições antes do próximo passo']];
  const zoneHtml=zones.map(([kind,label,desc])=>`<section class="raid-zone zone-${kind}" data-raid-zone="${kind}"><header><span>${esc(label)}</span><small>${esc(desc)}</small><b>${items.filter(item=>item.kind===kind).length}</b></header><div class="raid-zone-list">${items.filter(item=>item.kind===kind).map(item=>`<article class="raid-card level-${item.level} ${item.id===selected.id?'selected':''}" draggable="true" data-raid-card="${item.id}"><div><span>${item.level.toUpperCase()}</span><small>${esc(item.linked||'Sem vínculo')}</small></div><b>${esc(item.title)}</b><p>${esc(item.detail)}</p></article>`).join('')}</div><button type="button" class="raid-add" data-raid-add="${kind}">＋ Adicionar</button></section>`).join('');
  const targets=['Terraplanagem','Drenagem','Rede elétrica','Pavimentação','Urbanização','Suprimentos'];
  return `<div class="stage-extension-page raid-page"><div class="extension-head"><div><span class="activity-kind">RAID · ${esc(stage.name)}</span><h1>Pendências e atenção operacional</h1><p>Riscos, premissas, problemas e dependências ficam no mesmo workspace e podem ser movidos entre zonas ou vinculados diretamente a uma atividade.</p></div><div class="extension-head-actions"><button class="ghost" data-view="pert">${ico('git-branch')} Dependências PERT</button><button class="primary" data-view="actions">${ico('sparkles')} Priorizar com IA</button></div></div><div class="raid-workspace">${zoneHtml}</div><div class="raid-bottom"><section class="raid-activity-targets"><div><span class="activity-kind">VINCULAR À ATIVIDADE</span><h2>Arraste uma pendência para uma entidade</h2></div><div>${targets.map(target=>`<button type="button" data-raid-target="${esc(target)}">${ico('link-2')} ${esc(target)}</button>`).join('')}</div></section><aside class="raid-inspector"><span class="activity-kind">${selected.kind.toUpperCase()} · ${selected.level.toUpperCase()}</span><h2>${esc(selected.title)}</h2><p>${esc(selected.detail)}</p><dl><dt>Vínculo atual</dt><dd>${esc(selected.linked||'Sem vínculo')}</dd><dt>Etapa</dt><dd>${esc(stage.name)}</dd><dt>Origem</dt><dd>IA + registros + cronograma</dd></dl><button class="ghost" data-view="records">${ico('clipboard-pen-line')} Abrir evidências</button></aside></div></div>`;
};

ViewLayer.prototype.agenda=function(){
  const stage=extensionStage();
  const agenda=[
    ['08:30','Confirmar medição da drenagem','Carlos Mendes','Em aberto','clipboard-check'],
    ['10:00','Validar recebimento de tubos PEAD','Paula Nascimento','Programado','package-check'],
    ['16:00','Liberar frente seguinte','Mariana Lopes','Dependência','arrow-right-circle']
  ];
  return `<div class="stage-extension-page agenda-page"><div class="extension-head"><div><span class="activity-kind">${esc(stage.week)} · ${esc(stage.name)}</span><h1>Agenda da etapa</h1><p>Organize compromissos, responsáveis e alertas para a frente de execução.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico('arrow-left')} Todas as etapas</button><button class="primary" data-agenda-new>${ico('plus')} Novo compromisso</button></div></div><div class="extension-context"><div><small>ETAPA SELECIONADA</small><b>${esc(stage.name)}</b><span>${esc(stage.owner)} · ${stage.progress}% concluído</span></div><div><small>JANELA OPERACIONAL</small><b>06/06/2024 · 08:00—18:00</b><span>3 compromissos · 1 dependência</span></div><div class="extension-context-status"><i></i> Sincronizado localmente</div></div><div class="extension-layout"><main class="extension-main"><div class="agenda-daybar"><button class="active" data-agenda-day="today">Hoje · 06 jun</button><button data-agenda-day="tomorrow">Amanhã · 07 jun</button><button data-agenda-day="week">Próximos 7 dias</button><span>Fuso: America/Bahia</span></div><section class="extension-card agenda-list"><div class="extension-card-head"><div><span class="activity-kind">AGENDA OPERACIONAL</span><h2>Compromissos da frente</h2></div><span class="count-badge">${agenda.length} itens</span></div>${agenda.map(([time,title,owner,status,icon])=>`<article class="agenda-item" data-agenda-item><time>${time}<small>06/06</small></time><div class="agenda-item-icon">${ico(icon)}</div><div class="agenda-item-copy"><strong>${title}</strong><span>${owner} · ${esc(stage.name)}</span><small>Confirmar evidência e atualizar o próximo responsável.</small></div><span class="agenda-item-status ${statusClass(status)}">${status}</span><button class="icon-btn compact" data-agenda-item-menu aria-label="Ações do compromisso">${ico('ellipsis')}</button></article>`).join('')}</section><section class="extension-card agenda-calendar"><div class="extension-card-head"><div><span class="activity-kind">DISTRIBUIÇÃO NO DIA</span><h2>Blocos de execução</h2></div><button class="ghost" data-view="activities">Ver atividades</button></div><div class="agenda-hours"><span>08h</span><span>10h</span><span>12h</span><span>14h</span><span>16h</span><span>18h</span></div><div class="agenda-track"><div class="agenda-block agenda-block-blue" style="left:5%;width:24%"><b>Medição</b><small>Carlos · 08:30</small></div><div class="agenda-block agenda-block-teal" style="left:36%;width:22%"><b>Recebimento</b><small>Paula · 10:00</small></div><div class="agenda-block agenda-block-amber" style="left:76%;width:18%"><b>Liberar frente</b><small>Mariana · 16:00</small></div></div></section></main><aside class="extension-rail"><section class="extension-card"><div class="extension-card-head"><h2>Envolvidos</h2>${ico('users')}</div><div class="person-list">${demoData.collaborators.map(([name,role,area])=>`<div class="person-row"><span class="avatar">${name[0]}</span><span><b>${name}</b><small>${role} · ${area}</small></span><i class="online-dot"></i></div>`).join('')}</div><button class="whatsapp-action" data-agenda-whatsapp>${ico('message-circle')} Enviar agenda no WhatsApp</button></section><section class="extension-card alert-card"><div class="extension-card-head"><h2>Alertas da agenda</h2>${ico('bell-ring')}</div><p>Notifique os envolvidos antes do início de cada compromisso e registre a confirmação no diário.</p><button class="alert-action" data-agenda-alert>${ico('bell-plus')} Criar alerta de prazo</button><small class="rail-note">Próximo alerta: hoje às 15:30</small></section><section class="extension-card"><span class="activity-kind">ATALHO OPERACIONAL</span><h2>Registrar andamento</h2><p>Abra o formulário de evidência relacionado a esta etapa.</p><button class="primary full-button" data-view="records">${ico('clipboard-pen-line')} Novo registro</button></section></aside></div></div>`;
};

ViewLayer.prototype.activities=function(){
  const stage=extensionStage(), categories=[...new Set(activityCatalog.map(item=>item.nature))];
  const relevant=activityCatalog.slice(0,11);
  const cards=relevant.map((item,index)=>`<article class="activity-catalog-card" data-activity-card data-activity-category="${esc(item.nature)}"><div class="activity-catalog-top"><span class="activity-kind">${esc(item.nature)}</span><span class="activity-status-chip ${index<3?'active':''}">${index<3?'Disponível':'Modelo'}</span></div><h3>${esc(item.name)}</h3><p>Fluxo de execução para ${esc(stage.name.toLowerCase())}, com preenchimento inicial e evidências.</p><div class="activity-field-counts"><span>${ico('list-plus')} <b>${item.initial.length}</b> campos iniciais</span><span>${ico('check-check')} <b>${item.execution.length}</b> execução</span></div><button class="activity-open" data-activity-open="${index}">${ico('panel-right-open')} Abrir atividade</button></article>`).join('');
  return `<div class="stage-extension-page activities-page"><div class="extension-head"><div><span class="activity-kind">${esc(stage.week)} · ${esc(stage.name)}</span><h1>Atividades da etapa</h1><p>Catálogo de frentes, propriedades de registro e associações administrativas.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico('arrow-left')} Todas as etapas</button><button class="primary" data-activity-new>${ico('plus')} Nova atividade</button></div></div><div class="extension-context"><div><small>ETAPA SELECIONADA</small><b>${esc(stage.name)}</b><span>${esc(stage.owner)} · ${stage.progress}% concluído</span></div><div><small>MODELO DE PREENCHIMENTO</small><b>Inicial → Execução → Evidências</b><span>Materiais, compras, responsáveis e medições</span></div><div class="extension-context-status"><i></i> ${relevant.length} modelos disponíveis</div></div><div class="activity-toolbar"><div class="activity-filter-label">Filtrar por natureza</div><button class="active" data-activity-category-filter="all">Todas <span>${relevant.length}</span></button>${categories.map(category=>`<button data-activity-category-filter="${esc(category)}">${esc(category)} <span>${relevant.filter(item=>item.nature===category).length}</span></button>`).join('')}</div><div class="activities-layout"><main class="activity-catalog-grid">${cards}</main><aside class="activity-detail-drawer"><div class="activity-detail-empty"><span class="activity-detail-icon">${ico('mouse-pointer-click')}</span><h2>Selecione uma atividade</h2><p>Clique em um card para abrir a sequência de preenchimento, associações e propriedades de execução.</p></div></aside></div></div>`;
};

ViewLayer.prototype.progress=function(){
  const stage=extensionStage(), stored=appStore.get().records||[], first=stored[0]||{};
  const entries=[
    {time:first.hora||'08:30',date:'06/06/2024',title:first.detalhes||'Medição da rede principal',service:first.atividade||'Drenagem Pluvial',owner:first.responsavel||'Carlos Mendes',status:first.status||'Pendente',detail:'Conferir extensão executada, cotas e evidência fotográfica antes de liberar a próxima frente.',tone:'warning',photo:first.evidenceUri||'./assets/reference/dashboard.png'},
    {time:'09:45',date:'06/06/2024',title:'Registro fotográfico da frente',service:'Drenagem Pluvial',owner:'Paula Nascimento',status:'Concluído',detail:'Fotos vinculadas à medição e ao trecho executado no período da manhã.',tone:'success',photo:'./assets/reference/dashboard.png'},
    {time:'14:20',date:'06/06/2024',title:'Recebimento de tubos PEAD',service:'Suprimentos · Drenagem',owner:'Mariana Lopes',status:'Em validação',detail:'Conferir nota fiscal, lote e quantidade recebida contra o pedido PE-2025-040.',tone:'info',photo:'./assets/reference/dashboard.png'}
  ];
  return `<div class="stage-extension-page progress-page"><div class="extension-head"><div><span class="activity-kind">DIÁRIO DE OBRAS · ${esc(stage.name)}</span><h1>Andamento da obra</h1><p>Diário operacional com apontamentos, evidências e confirmação de campo.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico('arrow-left')} Todas as etapas</button><button class="primary" data-progress-new>${ico('plus')} Novo apontamento</button></div></div><div class="progress-toolbar"><div class="progress-periods"><button class="active" data-progress-period="today">Hoje · 06 jun</button><button data-progress-period="yesterday">Ontem · 05 jun</button><button data-progress-period="week">Semana atual</button></div><label>Etapa<select data-progress-stage>${demoData.activities.map(item=>`<option ${item.id===stage.id?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label><span class="progress-sync">${ico('cloud-check')} Última sincronização: 16:29 · local</span></div><div class="progress-layout"><main class="progress-journal"><div class="progress-section-head"><div><span class="activity-kind">REGISTROS DE CAMPO</span><h2>Diário do dia</h2></div><span class="count-badge">${entries.length} apontamentos</span></div>${entries.map((entry,index)=>`<article class="journal-entry" data-progress-entry="${index}" tabindex="0"><div class="journal-time"><time>${entry.time}</time><small>${entry.date}</small></div><div class="journal-marker ${entry.tone}"></div><div class="journal-entry-main"><div class="journal-entry-top"><div><span class="activity-kind">${esc(entry.service)}</span><h3>${esc(entry.title)}</h3></div><span class="journal-status ${entry.tone}">${esc(entry.status)}</span></div><p>${esc(entry.detail)}</p><div class="journal-meta"><span>${ico('user-round')} ${esc(entry.owner)}</span><span>${ico('map-pin')} Aliança Park · ${esc(stage.name)}</span><button class="ghost journal-open">Abrir detalhes ${ico('arrow-up-right')}</button></div><div class="journal-detail"><div><small>ATIVIDADE</small><b>${esc(entry.service)}</b></div><div><small>RESPONSÁVEL</small><b>${esc(entry.owner)}</b></div><div><small>EVIDÊNCIA</small><b>Foto e registro vinculados</b></div><p>${esc(entry.detail)}</p></div></div><img class="journal-photo" src="${esc(entry.photo)}" alt="Evidência de ${esc(entry.title)}" loading="lazy"></article>`).join('')}<div class="progress-entry-form" hidden><form data-progress-form><div class="extension-card-head"><div><span class="activity-kind">NOVO APONTAMENTO</span><h2>Registrar ocorrência ou avanço</h2></div><button type="button" class="icon-btn compact" data-progress-cancel aria-label="Fechar">×</button></div><div class="progress-form-grid"><label>Atividade<select name="atividade">${demoData.activities.map(item=>`<option>${esc(item.name)}</option>`).join('')}</select></label><label>Responsável<select name="responsavel">${demoData.collaborators.map(([name])=>`<option>${esc(name)}</option>`).join('')}</select></label><label>Hora<input type="time" name="hora" value="${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}"></label><label>Status<select name="status"><option>Pendente</option><option>Em validação</option><option>Concluído</option></select></label><label class="full">Detalhes<textarea name="detalhes" placeholder="Descreva o avanço, medição, ocorrência ou evidência"></textarea></label><label class="full">Foto / evidência<input name="evidenceUri" placeholder="URL local ou caminho da foto"></label></div><button class="primary" type="submit">${ico('save')} Salvar no diário</button></form></div></main><aside class="progress-rail"><section class="extension-card progress-summary"><div class="extension-card-head"><h2>Resumo do dia</h2>${ico('activity')}</div><div class="progress-metrics"><div><b>${entries.length}</b><span>Apontamentos</span></div><div><b>1</b><span>Pendência</span></div><div><b>${stage.progress}%</b><span>Etapa</span></div></div><div class="progress-bar"><i style="width:${stage.progress}%"></i></div><small>${esc(stage.name)} · ${esc(stage.owner)}</small></section><section class="extension-card"><div class="extension-card-head"><h2>Próximas confirmações</h2>${ico('list-checks')}</div><div class="next-check"><span>16:00</span><b>Liberar frente seguinte</b><small>Após validação da medição</small></div><div class="next-check"><span>Amanhã</span><b>Validar material recebido</b><small>Nota fiscal e inspeção</small></div><button class="ghost full-button" data-view="agenda">Abrir agenda</button></section><section class="extension-card progress-proof"><div class="extension-card-head"><h2>Evidências vinculadas</h2>${ico('images')}</div><p>Fotos, medições e comprovantes ficam relacionados ao serviço e podem alimentar o relatório de avanço.</p><button class="ghost full-button" data-view="records">Ver registros e fotos</button></section></aside></div><div class="progress-footer"><span>${ico('send')} Diário pronto para medição físico-financeira.</span><button class="primary" data-progress-send>${ico('file-up')} Enviar diário para medição</button></div></div>`;
};

ViewLayer.prototype.leads=function(){
  const s=appStore.get(),firebaseLeads=(s.publicLeads||[]).map(item=>({name:item.name||'Novo interessado',lot:item.lot||'Lote a definir',objective:item.objective||'Moradia',budget:item.budget||'Faixa a confirmar',status:item.status||'Novo',sun:item.sun||'A definir',altitude:item.altitude||'—',terrain:item.terrain||'A definir',whatsapp:item.whatsapp||'',email:item.email||'',source:'Firebase'})),allLeads=[...firebaseLeads,...demoData.leads],selectedIndex=Math.max(0,Math.min(allLeads.length-1,Number(s.selectedLead)||0)),lead=allLeads[selectedIndex];
  const lotPositions={'Lote 54 · Q-12':{x:46,y:42},'Lote 12 · Q-03':{x:61,y:34},'Lote 93 · Q-18':{x:73,y:58}};
  const lots=[...new Map(allLeads.map((item,index)=>[item.lot,{lot:item.lot,indices:[index]}])).values()];
  allLeads.forEach((item,index)=>{const group=lots.find(entry=>entry.lot===item.lot);if(group&&!group.indices.includes(index))group.indices.push(index);});
  const markers=lots.map((item,index)=>{const point=lotPositions[item.lot]||{x:36+index*15,y:32+index*11},active=item.indices.includes(selectedIndex);return `<button type="button" class="lead-lot-marker ${active?'active':''}" data-lead="${item.indices[0]}" style="left:${point.x}%;top:${point.y}%" title="${esc(item.lot)} · ${item.indices.length} interessados"><span>${item.indices.length}</span><small>${esc(item.lot.replace(' · ',' / '))}</small></button>`;}).join('');
  const links=lots.map((item,index)=>{const point=lotPositions[item.lot]||{x:36+index*15,y:32+index*11},targetY=19+index*24,active=item.indices.includes(selectedIndex);return `<path class="lead-lot-link ${active?'active':''}" d="M ${point.x} ${point.y} C 76 ${point.y}, 77 ${targetY}, 88 ${targetY}"/>`;}).join('');
  const rows=allLeads.map((item,index)=>`<button type="button" class="lead-client-row ${index===selectedIndex?'selected':''}" data-lead="${index}"><span class="avatar">${esc(item.name[0])}</span><span><b>${esc(item.name)}</b><small>${esc(item.objective)} · ${esc(item.lot)}</small></span><em>${esc(item.status)}</em></button>`).join('');
  return `<div class="leads-page-shell"><public-leads-surface data-embedded></public-leads-surface><div class="lead-lot-links" aria-label="Interesses apontados aos lotes"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links}</svg><div class="lead-lot-markers">${markers}</div></div><section class="lead-ops-summary lead-ops-window"><span class="activity-kind">CRM · CAPTAÇÃO PÚBLICA</span><h2>Intenções no loteamento</h2><p>O conteúdo público e o atendimento interno usam a mesma origem de captação.</p><div class="lead-ops-kpis"><div><b>${allLeads.length}</b><small>Recebidos</small></div><div><b>96</b><small>Lotes apontados</small></div><div><b>37</b><small>Qualificados</small></div></div></section><section class="lead-ops-list lead-ops-window"><div class="lead-window-head"><div><span class="activity-kind">CLIENTES INTERESSADOS</span><h2>Lista de leads</h2></div><span class="lead-window-count">${firebaseLeads.length?'Firebase ao vivo':`${demoData.leads.length} demo`}</span></div><label class="lead-search">Buscar cliente, lote ou objetivo<input type="search" placeholder="Ex.: Juliana, Q-12, investimento" data-lead-search></label><div class="lead-client-list">${rows}</div></section><section class="lead-ops-detail lead-ops-window"><div class="lead-window-head"><div><span class="activity-kind">DRILL-IN · LOTE APONTADO</span><h2>${esc(lead.name)}</h2></div><span class="lead-status-chip">${esc(lead.status)}</span></div><div class="lead-lot-focus"><span class="lead-lot-pin">⌖</span><div><b>${esc(lead.lot)}</b><small>${esc(lead.objective)} · ${esc(lead.budget)}</small></div><button type="button" data-lead="${selectedIndex}">${ico('scan-search')} Foco</button></div><dl class="lead-ops-fields"><dt>WhatsApp / contato</dt><dd>${esc(lead.whatsapp||'Contato comercial pendente')}</dd><dt>E-mail</dt><dd>${esc(lead.email||'A confirmar')}</dd><dt>Orientação solar</dt><dd>${esc(lead.sun)}</dd><dt>Topografia</dt><dd>${esc(lead.terrain)} · ${esc(lead.altitude)}</dd><dt>Origem</dt><dd>${esc(lead.source||'Site / Página Pública')}</dd><dt>Próxima ação</dt><dd>Enviar condições e registrar retorno</dd></dl><div class="lead-detail-actions"><button type="button" class="primary" data-lead-message="${selectedIndex}">${ico('message-circle')} Abrir WhatsApp</button><button type="button" class="ghost" data-lead-reserve="${selectedIndex}">${ico('calendar-check')} Abrir reserva</button></div></section><div class="lead-ops-caption">${ico('link-2')} Linhas conectam a concentração de interesse aos lotes do modelo 3D. Selecione um cliente para atualizar o drill-in.</div></div>`;
};

const leadsScreenTemplate=ViewLayer.prototype.leads;
ViewLayer.prototype.leads=function(){
  const state=appStore.get(),firebaseLeads=(state.publicLeads||[]).map(item=>({name:item.name||'Novo interessado',lot:item.lot||'Lote a definir',objective:item.objective||'Moradia',budget:item.budget||'Faixa a confirmar',status:item.status||'Novo',sun:item.sun||'A definir',altitude:item.altitude||'—',terrain:item.terrain||'A definir',whatsapp:item.whatsapp||'',email:item.email||'',source:'Firebase'})),allLeads=[...firebaseLeads,...demoData.leads],selectedIndex=Math.max(0,Math.min(allLeads.length-1,Number(state.selectedLead)||0)),lead=allLeads[selectedIndex];
  const rows=allLeads.map((item,index)=>`<button type="button" class="lead-client-row ${index===selectedIndex?'selected':''}" data-lead="${index}"><span class="avatar">${esc(item.name[0])}</span><span><b>${esc(item.name)}</b><small>${esc(item.objective)} · ${esc(item.lot)}</small></span><em>${esc(item.status)}</em></button>`).join('');
  return `<div class="leads-reference-layout"><main class="leads-reference-page"><section class="leads-reference-hero"><div class="leads-reference-copy"><div class="leads-public-brand"><span class="leads-leaf">❧</span><span>ALIANÇA PARK <small>LOTEAMENTO</small></span></div><span class="public-eyebrow">LANÇAMENTO</span><h1>Escolha seu lote<br>para <em>viver ou investir</em></h1><p>Explore o empreendimento no mapa e converse agora com nosso atendimento para conhecer disponibilidade, valores e condições de reserva.</p><div class="leads-benefits"><span>${ico('land-plot')} Lotes a partir de<br><b>250 m²</b></span><span>${ico('construction')} Infraestrutura<br><b>planejada</b></span><span>${ico('map-pin')} Atendimento<br><b>personalizado</b></span></div></div><div class="leads-reference-form"><public-lead-form></public-lead-form></div></section><section class="leads-map-section"><div class="leads-section-heading"><div><span class="public-eyebrow">MAPA DE LOTES</span><h2>Explore o empreendimento</h2><p>Toque em um lote para consultar sua disponibilidade.</p></div></div><div class="leads-map-frame"><map-scene compact interactive data-base-map class="leads-header-map" data-stage="Leads e reservas" data-overlay="urbanizacao" aria-label="Mapa OpenStreet e modelo 3D do loteamento com highlight comercial"></map-scene><div class="leads-map-captions"><span><i class="available"></i>Disponível</span><span><i class="reserved"></i>Reservado</span><span><i class="sold"></i>Vendido</span></div><aside class="leads-lot-selected"><button type="button" class="leads-lot-close" aria-label="Fechar">×</button><small>LOTE SELECIONADO</small><h3>QD02-L18 <span>Disponível</span></h3><dl><dt>Quadra</dt><dd>QD02</dd><dt>Área total</dt><dd>210,00 m²</dd><dt>Frente</dt><dd>10,00 m</dd></dl><button type="button" class="leads-lot-interest">Quero reservar este lote ${ico('arrow-right')}</button></aside></div><div class="leads-map-legend"><span><i class="dot green"></i>Disponível</span><span><i class="dot violet"></i>Reservado</span><span><i class="dot amber"></i>Em análise</span><span><i class="dot"></i>Vendido</span></div></section></main><aside class="leads-floating-sidebar" aria-label="Atendimento ao visitante"><section class="leads-client-panel"></section><section class="leads-detail-panel"></section></aside></div>`;
};

// Toolbar operacional sobre o CRM público. A página comercial continua sendo a
// referência visual; os controles internos ficam concentrados antes da lista.
const leadsReferenceTemplate=ViewLayer.prototype.leads;
ViewLayer.prototype.leads=function(){
  const state=appStore.get(),filters={query:'',objective:'all',status:'all',...(state.leadFilters||{})};
  const markup=leadsReferenceTemplate.call(this);
  const toolbar=`<div class="data-page-toolbar leads-data-toolbar" aria-label="Controles de leads e lotes">
    <div class="toolbar-context"><span class="activity-kind">CRM / LOTES</span><b>Gestão de interesse</b><small>Filtre, exporte ou avance para o atendimento.</small></div>
    <div class="toolbar-controls">
      <label class="toolbar-search">Buscar<input type="search" value="${esc(filters.query)}" placeholder="Cliente, lote ou contato" data-lead-toolbar-filter="query"></label>
      <label>Objetivo<select data-lead-toolbar-filter="objective"><option value="all" ${filters.objective==='all'?'selected':''}>Todos os objetivos</option><option value="Moradia" ${filters.objective==='Moradia'?'selected':''}>Moradia</option><option value="Investimento" ${filters.objective==='Investimento'?'selected':''}>Investimento</option><option value="Veraneio" ${filters.objective==='Veraneio'?'selected':''}>Veraneio</option></select></label>
      <label>Status<select data-lead-toolbar-filter="status"><option value="all" ${filters.status==='all'?'selected':''}>Todos os status</option><option value="Novo" ${filters.status==='Novo'?'selected':''}>Novo</option><option value="Qualificado" ${filters.status==='Qualificado'?'selected':''}>Qualificado</option><option value="Em contato" ${filters.status==='Em contato'?'selected':''}>Em contato</option><option value="Proposta" ${filters.status==='Proposta'?'selected':''}>Proposta</option></select></label>
      <button type="button" class="toolbar-action" data-lead-filter-clear>${ico('filter-x')} Limpar</button>
      <button type="button" class="toolbar-action" data-lead-export>${ico('download')} Exportar</button>
      <button type="button" class="toolbar-primary" data-lead-new>${ico('plus')} Novo lead</button>
    </div>
  </div>`;
  return markup.replace('<section class="leads-crm-section leads-crm-summary">',`${toolbar}<section class="leads-crm-section leads-crm-summary">`);
};

ViewLayer.prototype.records=function(){
  const s=appStore.get(), filters={entity:'records',stage:'all',activity:'all',category:'all',responsible:'all',purchase:'all',query:'',...(s.recordFilters||{})};
  const records=s.records||[], unique=(values)=>[...new Set(values.filter(Boolean))], activityNames=unique([...demoData.activities.map(item=>item.name),...activityCatalog.map(item=>item.name),...records.map(item=>item.atividade)]), stageNames=unique([...demoData.activities.map(item=>item.name),...records.map(item=>item.etapa)]), responsibleNames=unique([...demoData.collaborators.map(item=>item[0]),...records.map(item=>item.responsavel)]), categories=unique(activityCatalog.map(item=>item.nature)), purchases=demoData.purchases;
  const categoryOf=(record)=>activityCatalog.find(item=>String(record.atividade||'').toLowerCase().includes(String(item.name||'').toLowerCase()))?.nature||record.categoria||'Execução operacional';
  const entityMatch=(record)=>{const text=JSON.stringify(record).toLowerCase(), entity=filters.entity; if(entity==='all'||entity==='records')return true; if(entity==='projects')return Boolean(record.obra); if(entity==='stages')return Boolean(record.etapa||record.atividade); if(entity==='activities')return Boolean(record.atividade); if(entity==='collaborators')return Boolean(record.responsavel); if(entity==='materials')return /tubo|cimento|brita|areia|material|m[eé]dica/i.test(text); if(entity==='purchases')return /pe-|compra|fornecedor|poste|tubo|concreto/i.test(text); if(entity==='leads')return /lead|lote|interesse|cliente/i.test(text); if(entity==='activity_relations')return Boolean(record.atividade&&record.etapa); if(entity==='audit_events')return Boolean(record.updatedAt||record.createdAt); return true;};
  const filtered=records.filter(record=>{const text=JSON.stringify(record).toLowerCase(), q=String(filters.query||'').trim().toLowerCase(), purchase=String(filters.purchase||'all'); return entityMatch(record)&&(!q||text.includes(q))&&(filters.stage==='all'||record.etapa===filters.stage)&&(filters.activity==='all'||record.atividade===filters.activity)&&(filters.category==='all'||categoryOf(record)===filters.category)&&(filters.responsible==='all'||record.responsavel===filters.responsible)&&(purchase==='all'||text.includes(purchase.toLowerCase()));});
  const selected=records.find(record=>record.id===s.selectedRecord), editing=records.find(record=>record.id===s.editingRecord), context=s.recordContext||null, contextCatalog=context&&(activityCatalog.find(item=>item.name===context.activity)||activityCatalog.find(item=>item.nature===context.nature)), formActivity=context?.activity||editing?.atividade||activityNames[0]||'Atividade operacional', formNature=context?.nature||editing?.categoria||contextCatalog?.nature||'Execução operacional', photo=selected?.evidenceUri||'./assets/reference/dashboard.png';
  const opt=(value,label,current)=>`<option value="${esc(value)}" ${current===value?'selected':''}>${esc(label)}</option>`;
  const contextFields=contextCatalog?`<section class="record-context-fields" data-record-context-fields><div class="record-context-heading"><div><span class="activity-kind">${esc(contextCatalog.nature)}</span><b>${esc(contextCatalog.name)}</b></div><small>${esc(context?.label||'Área selecionada no modelo 3D')}</small></div><div class="record-context-group"><span>01 · DADOS INICIAIS</span><div>${contextCatalog.initial.map((field,index)=>`<label>${esc(field)}<input name="context_initial_${index}" data-record-context-field data-record-context-label="${esc(field)}" placeholder="Preencher ${esc(field.toLowerCase())}"></label>`).join('')}</div></div><div class="record-context-group"><span>02 · EXECUÇÃO E EVIDÊNCIAS</span><div>${contextCatalog.execution.map((field,index)=>`<label>${esc(field)}<input name="context_execution_${index}" data-record-context-field data-record-context-label="${esc(field)}" placeholder="Registrar ${esc(field.toLowerCase())}"></label>`).join('')}</div></div></section>`:'<div class="record-context-empty" data-record-context-fields>Selecione uma superfície do modelo 3D para carregar os campos da natureza correspondente.</div>';
  const cards=filtered.map(record=>`<article class="record-card" data-record-open="${esc(record.id)}" tabindex="0" role="button"><div class="record-main"><span class="record-id">${esc(record.id)}</span><span class="record-category">${esc(categoryOf(record))}</span><strong>${esc(record.atividade||'Registro operacional')}</strong><small>${esc(record.data)} · ${esc(record.hora)} · ${esc(record.responsavel||'A definir')}</small><small>${esc(record.obra||'Aliança Park')} · ${esc(record.etapa||'Etapa não vinculada')}</small></div><img class="record-thumb" src="${esc(record.evidenceUri||'./assets/reference/dashboard.png')}" alt="Evidência de ${esc(record.atividade||'atividade')}" loading="lazy"><span class="record-status">${esc(record.status)}</span><div class="record-actions"><button data-record-edit="${esc(record.id)}">Editar</button><button data-record-delete="${esc(record.id)}">Excluir</button><button data-record-open="${esc(record.id)}">Abrir drill-in</button></div></article>`).join('');
  const detail=selected?`<aside class="record-detail"><div class="record-detail-head"><div><span class="activity-kind">DRILL-IN · ${esc(selected.id)}</span><h2>${esc(selected.atividade||'Registro operacional')}</h2></div><button type="button" data-record-close aria-label="Fechar detalhes">×</button></div><div class="record-detail-meta"><span>${esc(selected.status)}</span><small>${esc(selected.data)} · ${esc(selected.hora)}</small></div><img class="record-evidence" src="${esc(photo)}" alt="Foto ou evidência do registro"><div class="record-detail-grid"><div><small>OBRA</small><b>${esc(selected.obra||'Aliança Park')}</b></div><div><small>ETAPA</small><b>${esc(selected.etapa||'Não vinculada')}</b></div><div><small>CATEGORIA</small><b>${esc(categoryOf(selected))}</b></div><div><small>RESPONSÁVEL</small><b>${esc(selected.responsavel||'A definir')}</b></div><div><small>ATIVIDADE</small><b>${esc(selected.atividade||'Não vinculada')}</b></div><div><small>ÁREA PINTADA</small><b>${selected.mapArea?esc(selected.mapArea):'Ainda não marcada'}</b></div><div><small>COMPRA / EVIDÊNCIA</small><b>${selected.evidenceUri?'Foto anexada':'Evidência padrão disponível'}</b></div></div><p class="record-detail-copy">${esc(selected.detalhes||'Sem observações registradas.')}</p><div class="record-detail-actions"><button data-record-edit="${esc(selected.id)}">Editar registro</button><button data-record-paint="${esc(selected.id)}">${ico('paintbrush')} Pintar no mapa</button><button data-record-delete="${esc(selected.id)}">Excluir registro</button></div></aside>`:'<aside class="record-detail record-detail-empty"><span class="activity-kind">DRILL-IN DE REGISTROS</span><h2>Selecione um item</h2><p>Clique em qualquer registro para abrir fotos, evidências, relações e os dados completos da atividade.</p></aside>';
  queueMicrotask(()=>this.bindRecords?.());
  return `<div class="records-page"><div class="records-map-wash" aria-hidden="true"></div><div class="records-shell"><div class="records-head"><div><span class="activity-kind">REGISTROS OPERACIONAIS</span><h1>Registros</h1><p>Obra → atividade → evidência → responsável → confirmação.</p></div><button class="records-new">＋ Novo registro</button></div><div class="records-map-instruction"><span>${ico('paintbrush')} MAPA DE PROGRESSO</span><b>Use “Pintar no mapa” no formulário para marcar a área executada.</b><small>O modelo 3D fica à direita; clique em um lote, rua ou estrutura para vincular a evidência.</small></div><div class="records-toolbar" aria-label="Filtros de registros"><label>Categoria de visualização<select data-record-filter="entity">${opt('records','Registros operacionais',filters.entity)}${opt('all','Todas as entidades',filters.entity)}${opt('projects','Obras',filters.entity)}${opt('stages','Etapas',filters.entity)}${opt('activities','Atividades',filters.entity)}${opt('collaborators','Colaboradores',filters.entity)}${opt('materials','Materiais',filters.entity)}${opt('purchases','Compras',filters.entity)}${opt('leads','Leads',filters.entity)}${opt('activity_relations','Relações de atividades',filters.entity)}${opt('audit_events','Auditoria',filters.entity)}</select></label><label>Etapa<select data-record-filter="stage">${opt('all','Todas as etapas',filters.stage)}${stageNames.map(value=>opt(value,value,filters.stage)).join('')}</select></label><label>Atividade<select data-record-filter="activity">${opt('all','Todas as atividades',filters.activity)}${activityNames.map(value=>opt(value,value,filters.activity)).join('')}</select></label><label>Categoria específica<select data-record-filter="category">${opt('all','Todas as categorias',filters.category)}${categories.map(value=>opt(value,value,filters.category)).join('')}</select></label><label>Responsável<select data-record-filter="responsible">${opt('all','Todos os responsáveis',filters.responsible)}${responsibleNames.map(value=>opt(value,value,filters.responsible)).join('')}</select></label><label>Compra relacionada<select data-record-filter="purchase">${opt('all','Todas as compras',filters.purchase)}${purchases.map(item=>opt(item.id,`${item.id} · ${item.desc}`,filters.purchase)).join('')}</select></label><label class="records-search">Buscar<input data-record-filter="query" value="${esc(filters.query)}" placeholder="ID, detalhe, fornecedor…"></label><button type="button" class="records-clear-filters" data-record-clear>Limpar filtros</button></div><div class="records-layout"><section class="records-list records-report-area"><div class="records-list-head"><div><b>Relatório de registros</b><small>${filtered.length} de ${records.length} itens · passe o mouse para revelar o mapa</small></div><span class="records-scope">${esc(filters.entity==='all'?'Todas as tabelas':filters.entity)}</span></div>${cards||'<div class="empty-records">Nenhum registro corresponde aos filtros atuais.</div>'}</section>${detail}<aside class="records-form-wrap ${s.editingRecord?'open':''}"><form class="record-form"><h2>${s.editingRecord?'Editar registro':'Adicionar registro'}</h2><label>Obra<select name="obra">${opt('Aliança Park','Aliança Park',editing?.obra)}${opt('Belavista','Belavista',editing?.obra)}</select></label><label>Atividade<select name="atividade">${activityNames.map(value=>opt(value,value,editing?.atividade)).join('')}</select></label><div class="form-pair"><label>Data<input name="data" type="date" value="${esc(editing?.data||new Date().toISOString().slice(0,10))}"></label><label>Hora<input name="hora" type="time" value="${esc(editing?.hora||'08:30')}"></label></div><label>Responsável<select name="responsavel">${opt('','A definir',editing?.responsavel||'')}${responsibleNames.map(value=>opt(value,value,editing?.responsavel)).join('')}</select></label><label>Detalhes<textarea name="detalhes" placeholder="Descreva a evidência, medição ou ocorrência">${esc(editing?.detalhes||'')}</textarea></label><label>Foto / evidência<input name="evidenceUri" value="${esc(editing?.evidenceUri||'')}" placeholder="URL local ou caminho da foto"></label><input type="hidden" name="mapArea" value="${esc(editing?.mapArea||'')}"><div class="record-map-actions"><button type="button" class="record-map-paint" data-record-paint="${esc(editing?.id||'new')}">${ico('paintbrush')} Pintar no mapa</button><span data-record-map-status>${editing?.mapArea?'Área já marcada no mapa':'Nenhuma área marcada'}</span></div><label>Status<select name="status">${opt('Pendente','Pendente',editing?.status)}${opt('Concluído','Concluído',editing?.status)}</select></label><button class="record-confirm">${s.editingRecord?'Salvar alterações':'Confirmar registro'}</button>${s.editingRecord?'<button type="button" class="record-cancel">Cancelar</button>':''}</form></aside></div><div class="records-filter-foot"><span>Relacionamentos ativos: etapas · atividades · responsáveis · materiais · compras · evidências · áreas do mapa</span><span>${s.editingRecord?'Editando '+esc(s.editingRecord):'Clique em um card para abrir o drill-in'}</span></div></div></div>`;
};

ViewLayer.prototype.bindRecords=function(){
  const page=this.querySelector('.records-page'); if(!page||page.dataset.bound)return; page.dataset.bound='true';
  const state=appStore.get(),context=state.recordContext||null,contextCatalog=context&&(activityCatalog.find(item=>item.name===context.activity)||activityCatalog.find(item=>item.nature===context.nature));
  const form=page.querySelector('.record-form');
  if(form){
    const isEditing=Boolean(state.editingRecord&&state.editingRecord!=='new'); form.querySelector('h2').textContent=isEditing?'Editar registro':'Adicionar registro'; const confirm=form.querySelector('.record-confirm'); if(confirm)confirm.textContent=isEditing?'Salvar alterações':'Confirmar registro';
    form.dataset.recordNature=context?.nature||''; form.dataset.recordActivity=context?.activity||''; form.dataset.recordStage=context?.stage||'';
    const activitySelect=form.querySelector('select[name="atividade"]'); if(activitySelect&&context?.activity&&[...activitySelect.options].some(option=>option.value===context.activity))activitySelect.value=context.activity;
    [['categoria',context?.nature||''],['etapa',context?.stage||'']].forEach(([name,value])=>{let input=form.querySelector(`input[name="${name}"]`);if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.appendChild(input);}input.value=value;});
    const existing=form.querySelector('[data-record-context-fields]'); existing?.remove();
    const section=document.createElement('section'); section.className=contextCatalog?'record-context-fields':'record-context-empty'; section.dataset.recordContextFields='true';
    section.innerHTML=contextCatalog?`<div class="record-context-heading"><div><span class="activity-kind">${esc(contextCatalog.nature)}</span><b>${esc(contextCatalog.name)}</b></div><small>${esc(context?.label||'Área selecionada no modelo 3D')}</small></div><div class="record-context-group"><span>01 · DADOS INICIAIS</span><div>${contextCatalog.initial.map((field,index)=>`<label>${esc(field)}<input name="context_initial_${index}" data-record-context-field data-record-context-label="${esc(field)}" placeholder="Preencher ${esc(field.toLowerCase())}"></label>`).join('')}</div></div><div class="record-context-group"><span>02 · EXECUÇÃO E EVIDÊNCIAS</span><div>${contextCatalog.execution.map((field,index)=>`<label>${esc(field)}<input name="context_execution_${index}" data-record-context-field data-record-context-label="${esc(field)}" placeholder="Registrar ${esc(field.toLowerCase())}"></label>`).join('')}</div></div>`:'Selecione uma superfície do modelo 3D para carregar os campos da natureza correspondente.';
    form.querySelector('.record-map-actions')?.insertAdjacentElement('afterend',section);
    const mapAreaInput=form.querySelector('input[name="mapArea"]'),mapAreaStatus=form.querySelector('[data-record-map-status]'); if(mapAreaInput&&context){mapAreaInput.value=JSON.stringify(context);if(mapAreaStatus)mapAreaStatus.textContent=`${context.label} · ${context.nature} selecionado`;} const evidence=form.querySelector('input[name="evidenceUri"]'); if(evidence&&state.recordCameraPreview){evidence.type='hidden';evidence.value=state.recordCameraPreview;}
  }
  let mobileCapture=page.querySelector('.records-mobile-capture');
  if(!mobileCapture){
    mobileCapture=document.createElement('section'); mobileCapture.className='records-mobile-capture'; mobileCapture.setAttribute('aria-label','Captura de registro em campo');
    mobileCapture.innerHTML=`<div><span class="activity-kind">REGISTRO DE CAMPO</span><b>${context?`Área: ${esc(context.label)}`:'Selecione uma superfície ou registre uma evidência'}</b><small>${context?`${esc(context.nature)} · ${esc(context.activity)}`:state.recordCameraName?`Foto capturada: ${esc(state.recordCameraName)}`:'Toque no mapa para selecionar lote, rua ou estrutura.'}</small></div><div class="records-mobile-actions"><button type="button" data-record-mobile-select>${ico('scan-line')} Selecionar superfície</button><button type="button" data-record-camera>${ico('camera')} Abrir câmera</button><input type="file" accept="image/*" capture="environment" data-record-camera-input aria-label="Capturar foto da evidência"></div>`;
    page.querySelector('.records-map-instruction')?.insertAdjacentElement('afterend',mobileCapture);
  }
  const map=document.querySelector('map-scene:not([compact])');
  const beginSurfaceSelection=()=>{map?.setRecordPaintMode(true,area=>{appStore.set({editingRecord:'new',recordContext:area,selectedRecord:null,lastAction:`Selecionou ${area.label} para ${area.nature}`});notify(`${area.label} selecionada. Campos de ${area.nature} carregados.`,'success');});};
  mobileCapture.querySelector('[data-record-mobile-select]')?.addEventListener('click',event=>{event.preventDefault();beginSurfaceSelection();});
  mobileCapture.querySelector('[data-record-camera]')?.addEventListener('click',event=>{event.preventDefault();mobileCapture.querySelector('[data-record-camera-input]')?.click();});
  mobileCapture.querySelector('[data-record-camera-input]')?.addEventListener('change',event=>{const file=event.currentTarget.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{this._recordCameraFile=file;appStore.set({editingRecord:'new',recordCameraName:file.name,recordCameraPreview:String(reader.result||''),lastAction:`Capturou evidência ${file.name}`});};reader.readAsDataURL(file);});
  page.querySelector('.records-new')?.addEventListener('click',()=>{this._recordCameraFile=null;appStore.set({editingRecord:'new',recordContext:null,recordCameraName:null,recordCameraPreview:null,selectedRecord:null,lastAction:'Abriu novo registro'});});
  page.querySelectorAll('[data-record-filter]').forEach(control=>control.addEventListener('change',event=>{const key=event.currentTarget.dataset.recordFilter,recordFilters={...(appStore.get().recordFilters||{}),[key]:event.currentTarget.value};appStore.set({recordFilters});}));
  page.querySelector('[data-record-clear]')?.addEventListener('click',()=>appStore.set({recordFilters:{entity:'records',stage:'all',activity:'all',category:'all',responsible:'all',purchase:'all',query:''},selectedRecord:null}));
  page.querySelectorAll('.record-card[data-record-open]').forEach(card=>card.addEventListener('click',event=>{if(event.target.closest('button'))return;appStore.set({selectedRecord:card.dataset.recordOpen,lastAction:`Abriu drill-in do registro ${card.dataset.recordOpen}`});}));
  page.querySelectorAll('.record-card[data-record-open]').forEach(card=>card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();appStore.set({selectedRecord:card.dataset.recordOpen});}}));
  page.querySelectorAll('.record-actions [data-record-open]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();appStore.set({selectedRecord:button.dataset.recordOpen,lastAction:`Abriu drill-in do registro ${button.dataset.recordOpen}`});}));
  page.querySelector('[data-record-close]')?.addEventListener('click',()=>appStore.set({selectedRecord:null}));
  const startPaint=(button)=>{
    const targetId=button.dataset.recordPaint;
    const form=page.querySelector('.record-form');
    if(!form&&targetId&&targetId!=='new'){appStore.set({editingRecord:targetId,lastAction:`Preparou pintura do registro ${targetId}`});setTimeout(()=>this.querySelector('.record-map-paint')?.click(),0);return;}
    page.querySelectorAll('[data-record-paint]').forEach(item=>item.classList.toggle('active',item===button));
    map?.setRecordPaintMode(true,area=>{
      page.querySelectorAll('[data-record-paint]').forEach(item=>item.classList.remove('active'));
      appStore.set({editingRecord:targetId&&targetId!=='new'?targetId:'new',recordContext:area,selectedRecord:null,lastAction:`Selecionou ${area.label} para ${area.nature}`});
      notify('Área pintada. Confirme o registro para salvar a relação.','success');
    });
  };
  page.querySelectorAll('[data-record-paint]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();startPaint(button);}));
};

// The stage utility session belongs to the stage header, before the free
// activity surface. The old generated activity buttons are legacy duplicates;
// the activity-layer below is the functional relation surface that remains.
const viewLayerAddStageUtilities = ViewLayer.prototype.addStageUtilities;
ViewLayer.prototype.addStageUtilities=function(){
  viewLayerAddStageUtilities.call(this);
  this.querySelectorAll('.stage-activity-card').forEach(card=>card.remove());
  const shell=this.querySelector('.stage-shell'),panel=shell?.querySelector('.stage-utilities'),body=shell?.querySelector('.stage-body');
  if(panel&&body)body.before(panel);
};

// Each stage keeps its operational views in one compact tab bar. The canvas
// remains the primary free surface, while the other panes expose the same
// stage data as schedule, agenda, and actionable to-dos.
ViewLayer.prototype.splitStageTabs=function(){
  const panel=this.querySelector('.stage-utilities');
  if(!panel||panel.dataset.split)return;
  const tabs=panel.querySelector('.utility-tabs');
  const content=panel.querySelector('.utility-content');
  if(!tabs||!content)return;
  panel.dataset.split='true';

  const agendaPane=document.createElement('div');
  agendaPane.className='utility-pane';
  agendaPane.dataset.pane='agenda';
  agendaPane.append(...Array.from(content.childNodes));

  tabs.innerHTML=`
    <button class="utility-tab active" type="button" data-utility-tab="cronograma">${ico('calendar-clock')} Cronograma</button>
    <button class="utility-tab" type="button" data-utility-tab="agenda">${ico('calendar-days')} Agenda</button>
    <button class="utility-tab" type="button" data-utility-tab="canvas">${ico('workflow')} Canvas organizacional</button>
    <button class="utility-tab" type="button" data-utility-tab="afazeres">${ico('list-checks')} A Fazeres</button>`;
  content.replaceChildren();

  const cronogramaPane=document.createElement('div');
  cronogramaPane.className='utility-pane';
  cronogramaPane.dataset.pane='cronograma';
  cronogramaPane.innerHTML=`<div class="timeline-utility">
    <span class="activity-kind">CRONOGRAMA DA ETAPA</span>
    <h3>Dependências e marcos</h3>
    <div class="mini-timeline"><b>Início</b><i></i><b>Medição</b><i></i><b>Validação</b><i></i><b>Conclusão</b></div>
    <p>Visualização dos marcos previstos e das dependências da etapa.</p>
  </div>`;

  const canvasPane=document.createElement('div');
  canvasPane.className='utility-pane utility-canvas-pane';
  canvasPane.dataset.pane='canvas';
  canvasPane.innerHTML=`<div class="utility-canvas-summary">
    <div><span class="activity-kind">CANVAS ORGANIZACIONAL</span><h3>Superfície livre da etapa</h3><p>Use os cards abaixo para criar relações e abrir o fluxo de preenchimento.</p></div>
    <div class="utility-canvas-stats"><b>3</b><small>cards ativos</small><b>2</b><small>relações</small></div>
    <button type="button" class="agenda-action" data-utility-focus="stage-canvas">Ver superfície livre</button>
  </div>`;

  const todoPane=document.createElement('div');
  todoPane.className='utility-pane';
  todoPane.dataset.pane='afazeres';
  const todoLabels=Array.from(agendaPane.querySelectorAll('.todo-grid label')).map(label=>label.cloneNode(true));
  todoPane.innerHTML=`<div class="todo-focus">
    <span class="activity-kind">A FAZERES DA ETAPA</span>
    <h3>Execução diária</h3>
    <p>Itens pendentes, responsáveis e alertas de prazo.</p>
    <div class="todo-grid"></div>
    <button type="button" class="agenda-action utility-add-todo">＋ Adicionar afazer</button>
  </div>`;
  todoPane.querySelector('.todo-grid').append(...todoLabels);

  content.append(cronogramaPane,agendaPane,canvasPane,todoPane);
  const panes=Array.from(content.querySelectorAll('[data-pane]'));
  const show=name=>{
    tabs.querySelectorAll('.utility-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.utilityTab===name));
    panes.forEach(pane=>{pane.hidden=pane.dataset.pane!==name;});
    notify(`${name==='afazeres'?'A fazeres':name[0].toUpperCase()+name.slice(1)} da etapa ativada.`);
  };
  tabs.querySelectorAll('[data-utility-tab]').forEach(tab=>tab.addEventListener('click',()=>show(tab.dataset.utilityTab)));
  canvasPane.querySelector('[data-utility-focus]')?.addEventListener('click',()=>{
    this.querySelector('.stage-canvas')?.scrollIntoView({behavior:'smooth',block:'start'});
    notify('Superfície livre da etapa destacada.','success');
  });
  todoPane.querySelector('.utility-add-todo')?.addEventListener('click',()=>{
    const label=prompt('Descreva o novo afazer da etapa:');
    if(!label?.trim())return;
    const item=document.createElement('label');
    item.innerHTML=`<input type="checkbox"> ${esc(label.trim())} <small>Agora · responsável a definir</small>`;
    todoPane.querySelector('.todo-grid').appendChild(item);
    notify('Afazer adicionado à etapa.','success');
  });
  show('cronograma');
};

// Dashboard cards float above the persistent map and can be repositioned
// without changing the map/model scene or triggering a view rerender.
ViewLayer.prototype.bindDashboardCardDrag=function(){
  const home=this.querySelector('.dashboard-home');
  if(!home)return;
  home.querySelectorAll(':scope > .float-card').forEach(card=>{
    if(card.dataset.dashboardDragBound)return;
    card.dataset.dashboardDragBound='true';
    card.style.touchAction='none';
    card.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('button,input,textarea,select,a'))return;
      event.preventDefault();
      const parent=home.getBoundingClientRect(),rect=card.getBoundingClientRect();
      const initial={x:rect.left-parent.left,y:rect.top-parent.top},origin={x:event.clientX,y:event.clientY};
      let moved=false;
      const move=ev=>{
        const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;
        if(!moved&&Math.hypot(dx,dy)<3)return;
        moved=true;
        const x=Math.max(8,Math.min(Math.max(8,parent.width-card.offsetWidth-8),initial.x+dx));
        const y=Math.max(8,Math.min(Math.max(8,parent.height-card.offsetHeight-8),initial.y+dy));
        card.style.left=`${x}px`;card.style.top=`${y}px`;card.style.right='auto';card.style.bottom='auto';card.style.transform='none';
        card.classList.add('dashboard-card-dragging');
      };
      const finish=()=>{
        window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);
        card.releasePointerCapture?.(event.pointerId);card.classList.remove('dashboard-card-dragging');
        if(moved)notify('Card do mapa reposicionado.');
      };
      card.setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',finish,{once:true});
    });
  });
};

ViewLayer.prototype.bindStageExtensions=function(){
  const view=appStore.get().view;
  if(view==='agenda'){
    this.querySelectorAll('[data-agenda-day]').forEach(button=>button.addEventListener('click',()=>{
      this.querySelectorAll('[data-agenda-day]').forEach(item=>item.classList.remove('active'));
      button.classList.add('active');
      notify(`Agenda filtrada por ${button.textContent.trim()}.`);
      appStore.set({lastAction:`Filtrou agenda por ${button.textContent.trim()}`});
    }));
    this.querySelectorAll('[data-agenda-item]').forEach(item=>item.addEventListener('click',event=>{
      if(event.target.closest('button'))return;
      item.classList.toggle('selected');
      notify(item.classList.contains('selected')?'Compromisso selecionado para acompanhamento.':'Compromisso recolhido.');
    }));
    this.querySelectorAll('[data-agenda-item-menu]').forEach(button=>button.addEventListener('click',event=>{
      event.stopPropagation();
      notify('Ações do compromisso: confirmar, reagendar ou registrar evidência.');
      appStore.set({lastAction:'Abriu ações do compromisso da agenda'});
    }));
    this.querySelector('[data-agenda-new]')?.addEventListener('click',()=>{
      appStore.set({view:'records',lastAction:'Abriu formulário para novo compromisso'});
    });
    this.querySelector('[data-agenda-whatsapp]')?.addEventListener('click',()=>{
      notify('Agenda preparada para envio aos envolvidos via WhatsApp.','success');
      appStore.set({lastAction:'Preparou agenda para WhatsApp'});
    });
    this.querySelector('[data-agenda-alert]')?.addEventListener('click',()=>{
      notify('Alerta criado para o próximo compromisso da etapa.','warning');
      appStore.set({lastAction:'Criou alerta de prazo na agenda'});
    });
  }
  if(view==='activities'){
    this.querySelectorAll('[data-activity-category-filter]').forEach(button=>button.addEventListener('click',()=>{
      const category=button.dataset.activityCategoryFilter;
      this.querySelectorAll('[data-activity-category-filter]').forEach(item=>item.classList.toggle('active',item===button));
      this.querySelectorAll('[data-activity-card]').forEach(card=>{card.hidden=category!=='all'&&card.dataset.activityCategory!==category;});
      notify(category==='all'?'Exibindo todas as naturezas de atividade.':`Filtro aplicado: ${category}.`);
      appStore.set({lastAction:`Filtrou atividades por ${category==='all'?'todas as naturezas':category}`});
    }));
    this.querySelectorAll('[data-activity-open]').forEach(button=>button.addEventListener('click',event=>{
      event.stopPropagation();
      const item=activityCatalog[Number(button.dataset.activityOpen)];
      const drawer=this.querySelector('.activity-detail-drawer');
      if(!item||!drawer)return;
      drawer.innerHTML=`<div class="activity-detail-head"><div><span class="activity-kind">${esc(item.nature)}</span><h2>${esc(item.name)}</h2><p>Fluxo relacionado à etapa ${esc(extensionStage().name)}.</p></div><button class="icon-btn compact" data-activity-close aria-label="Fechar detalhes">×</button></div><div class="activity-detail-progress"><span>Modelo de preenchimento</span><b>01 Inicial <i></i> 02 Execução <i></i> 03 Evidências</b></div><section class="activity-detail-section"><div class="extension-card-head"><h3>01 · Dados iniciais</h3>${ico('file-plus-2')}</div>${item.initial.map(field=>`<label>${esc(field)}<input placeholder="Preencher ${esc(field.toLowerCase())}"></label>`).join('')}</section><section class="activity-detail-section"><div class="extension-card-head"><h3>02 · Execução e evidências</h3>${ico('camera')}</div>${item.execution.map(field=>`<label>${esc(field)}<input placeholder="Registrar ${esc(field.toLowerCase())}"></label>`).join('')}</section><section class="activity-detail-section"><div class="extension-card-head"><h3>03 · Associações administrativas</h3>${ico('link-2')}</div><label>Responsável<select><option>Selecionar envolvido</option>${demoData.collaborators.map(([name])=>`<option>${esc(name)}</option>`).join('')}</select></label><label>Compra associada<input placeholder="ID do pedido ou fornecedor"></label><label>Material associado<input placeholder="Material · quantidade · unidade"></label><label>Comprovante<input type="file"></label></section><div class="activity-detail-actions"><button class="ghost" data-activity-add-record>${ico('clipboard-pen-line')} Registrar evidência</button><button class="primary" data-activity-save>${ico('save')} Salvar atividade</button></div>`;
      drawer.classList.add('open');
      drawer.querySelector('[data-activity-close]')?.addEventListener('click',()=>drawer.classList.remove('open'));
      drawer.querySelector('[data-activity-add-record]')?.addEventListener('click',()=>appStore.set({view:'records',lastAction:`Abriu registro para ${item.name}`}));
      drawer.querySelector('[data-activity-save]')?.addEventListener('click',()=>{notify(`${item.name} salva com campos e associações.`,`success`);appStore.set({lastAction:`Salvou atividade ${item.name}`});});
      window.lucide?.createIcons();
    }));
    this.querySelector('[data-activity-new]')?.addEventListener('click',()=>notify('Escolha uma natureza no catálogo para criar uma nova atividade conectada.'));
  }
  if(view==='progress'){
    this.querySelectorAll('[data-progress-period]').forEach(button=>button.addEventListener('click',()=>{
      this.querySelectorAll('[data-progress-period]').forEach(item=>item.classList.toggle('active',item===button));
      notify(`Diário filtrado por ${button.textContent.trim()}.`);
      appStore.set({lastAction:`Filtrou diário por ${button.textContent.trim()}`});
    }));
    this.querySelector('[data-progress-stage]')?.addEventListener('change',event=>{
      const stage=demoData.activities.find(item=>item.name===event.currentTarget.value);
      if(stage)appStore.set({selectedStage:stage.id,lastAction:`Mudou diário para ${stage.name}`});
    });
    this.querySelector('[data-progress-new]')?.addEventListener('click',()=>{
      const form=this.querySelector('.progress-entry-form');
      if(form){form.hidden=false;form.scrollIntoView({behavior:'smooth',block:'center'});form.querySelector('textarea')?.focus();}
    });
    this.querySelector('[data-progress-cancel]')?.addEventListener('click',()=>{const form=this.querySelector('.progress-entry-form');if(form)form.hidden=true;});
    this.querySelectorAll('[data-progress-entry]').forEach(entry=>entry.addEventListener('click',event=>{
      if(event.target.closest('button'))return;
      entry.classList.toggle('expanded');
      appStore.set({lastAction:`${entry.classList.contains('expanded')?'Abriu':'Recolheu'} apontamento do diário`});
    }));
    this.querySelector('[data-progress-send]')?.addEventListener('click',()=>{
      notify('Diário enviado para compor a medição físico-financeira.','success');
      appStore.set({lastAction:'Enviou diário para medição'});
    });
    this.querySelector('[data-progress-form]')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const form=new FormData(event.currentTarget),value=Object.fromEntries(form.entries());
      value.obra='Aliança Park';value.data=new Date().toISOString().slice(0,10);value.etapa=extensionStage().name;
      try{
        const response=await apiFetch('/api/records',{method:'POST',headers:operationalHeaders({'Content-Type':'application/json'}),body:JSON.stringify(value)});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const record=await response.json();
        appStore.update(state=>({...state,records:[record,...(state.records||[])],lastAction:'Criou apontamento no diário'}));
        notify('Apontamento salvo no diário e no banco local.','success');
      }catch(error){
        notify('Não foi possível salvar o apontamento no banco local.','warning');
        console.warn('Diário persistente indisponível.',error);
      }
    });
  }
};

const viewLayerBind = ViewLayer.prototype.bind;
const viewLayerRender = ViewLayer.prototype.render;
ViewLayer.prototype.render=function(){
  viewLayerRender.call(this);
  const view=appStore.get().view,stagePage=this.querySelector('.stage-shell'),extensionPage=this.querySelector('.stage-extension-page');
  const host=extensionPage||stagePage;
  if(!host||host.querySelector('.stage-view-tabs'))return;
  const anchor=host.querySelector('.extension-head')||host.querySelector('.stage-toolbar');
  if(!anchor)return;
  anchor.insertAdjacentHTML('afterend',stageViewTabs(view));
  host.querySelectorAll('[data-stage-view]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    const next=button.dataset.stageView;
    appStore.set({view:next,lastAction:`Abriu ${button.textContent.trim()} da etapa ${extensionStage().name}`});
  }));
};
ViewLayer.prototype.bind=function(){viewLayerBind.call(this);this.bindDashboardCardDrag();this.bindStageExtensions();};

// Central comercial: cada perfil leva às relações lote → cliente e, por fim,
// ao documento contratual imprimível. Mantém os dados demonstrativos locais,
// mas o fluxo espelha a operação de uma imobiliária/loteamento.
const commissionProfiles=[
  {id:'marina',name:'Marina Alves',initials:'MA',role:'Consultora imobiliária',creci:'CRECI-GO 31.842',avatar:'linear-gradient(135deg,#0f62fe,#78a9ff)',sales:12,commission:'R$ 86.400',conversion:'24%',lots:['Q12-L54','Q03-L12','Q18-L93'],phone:'5562998451221'},
  {id:'lucas',name:'Lucas Barros',initials:'LB',role:'Gerente comercial',creci:'CRECI-GO 18.304',avatar:'linear-gradient(135deg,#8a3ffc,#be95ff)',sales:8,commission:'R$ 64.800',conversion:'19%',lots:['Q07-L08','Q09-L31'],phone:'5562998123400'},
  {id:'renata',name:'Renata Costa',initials:'RC',role:'Corretora parceira',creci:'CRECI-GO 40.290',avatar:'linear-gradient(135deg,#24a148,#42be65)',sales:6,commission:'R$ 43.200',conversion:'17%',lots:['Q14-L22','Q15-L40'],phone:'5562998345600'}
];
const commissionDeals=[
  {id:'CT-2026-041',profile:'marina',lot:'Q12-L54',quadra:'Quadra 12 · lote 54',client:'Juliana Pereira',cpf:'***.492.***-08',status:'Assinado',value:'R$ 480.000,00',commission:'R$ 28.800,00',rate:'6,00%',date:'18/08/2026',payment:'Sinal de R$ 48.000,00 + 96 parcelas',purpose:'Moradia e investimento',stage:'Documentação concluída'},
  {id:'CT-2026-038',profile:'marina',lot:'Q03-L12',quadra:'Quadra 03 · lote 12',client:'Camila Andrade',cpf:'***.883.***-21',status:'Em análise',value:'R$ 520.000,00',commission:'R$ 31.200,00',rate:'6,00%',date:'15/08/2026',payment:'Sinal de R$ 52.000,00 + financiamento',purpose:'Investimento',stage:'Minuta enviada para revisão'},
  {id:'CT-2026-034',profile:'marina',lot:'Q18-L93',quadra:'Quadra 18 · lote 93',client:'Diego Souza',cpf:'***.610.***-49',status:'Reserva',value:'R$ 540.000,00',commission:'R$ 26.400,00',rate:'5,00%',date:'09/08/2026',payment:'Reserva de R$ 10.000,00',purpose:'Veraneio',stage:'Aguardando documentação do comprador'},
  {id:'CT-2026-029',profile:'lucas',lot:'Q07-L08',quadra:'Quadra 07 · lote 08',client:'Renato Braga',cpf:'***.561.***-34',status:'Assinado',value:'R$ 450.000,00',commission:'R$ 27.000,00',rate:'6,00%',date:'28/07/2026',payment:'Entrada + 84 parcelas',purpose:'Moradia',stage:'Comissão programada'},
  {id:'CT-2026-027',profile:'lucas',lot:'Q09-L31',quadra:'Quadra 09 · lote 31',client:'Fernanda Lima',cpf:'***.720.***-03',status:'Proposta',value:'R$ 470.000,00',commission:'R$ 28.200,00',rate:'6,00%',date:'23/07/2026',payment:'A definir',purpose:'Investimento',stage:'Em negociação comercial'},
  {id:'CT-2026-021',profile:'renata',lot:'Q14-L22',quadra:'Quadra 14 · lote 22',client:'Gabriel Rocha',cpf:'***.194.***-97',status:'Assinado',value:'R$ 425.000,00',commission:'R$ 25.500,00',rate:'6,00%',date:'11/07/2026',payment:'Sinal + financiamento',purpose:'Moradia',stage:'Comissão aprovada'},
  {id:'CT-2026-018',profile:'renata',lot:'Q15-L40',quadra:'Quadra 15 · lote 40',client:'Patrícia Melo',cpf:'***.509.***-45',status:'Reserva',value:'R$ 390.000,00',commission:'R$ 19.500,00',rate:'5,00%',date:'03/07/2026',payment:'Reserva de R$ 7.500,00',purpose:'Moradia',stage:'Visita técnica agendada'}
];
ViewLayer.prototype.commissions=function(){
  const state=appStore.get(),profile=commissionProfiles.find(item=>item.id===state.selectedCommissionProfile),contract=commissionDeals.find(item=>item.id===state.selectedCommissionContract);
  if(contract)return this.commissionContract(contract);
  if(profile)return this.commissionProfile(profile);
  const total=commissionProfiles.reduce((sum,item)=>sum+item.sales,0);
  return `<section class="commissions-page"><header class="commission-page-head"><div><span class="activity-kind">OPERAÇÃO COMERCIAL · COMISSÕES</span><h1>Carteira de comissões</h1><p>Perfis comerciais, negócios vinculados, lotes reservados e contratos rastreáveis.</p></div><button type="button" class="commission-primary" data-commission-new>${ico('plus')} Novo lançamento</button></header><div class="commission-kpis"><div><small>Vendas elegíveis</small><b>${total}</b><span>no ciclo atual</span></div><div><small>Comissão provisionada</small><b>R$ 194.400</b><span>7 contratos com vínculo</span></div><div><small>Valor geral de venda</small><b>R$ 3,28M</b><span>carteira acompanhada</span></div><div><small>Em aprovação</small><b>2</b><span>minutas e reservas</span></div></div><div class="commission-profile-grid">${commissionProfiles.map(person=>`<button type="button" class="commission-profile-card" data-commission-profile="${person.id}"><div class="commission-profile-top"><span class="commission-avatar" style="background:${person.avatar}">${person.initials}</span><span class="commission-open">Abrir carteira ${ico('arrow-up-right')}</span></div><div><h2>${person.name}</h2><p>${person.role}</p><small>${person.creci}</small></div><div class="commission-profile-metrics"><span><b>${person.sales}</b><small>vendas</small></span><span><b>${person.commission}</b><small>comissão</small></span><span><b>${person.conversion}</b><small>conversão</small></span></div><footer><span>${person.lots.length} relações lote–cliente ativas</span><i>${ico('chevron-right')}</i></footer></button>`).join('')}</div><section class="commission-process"><div><span class="activity-kind">FLUXO AUDITÁVEL</span><h2>Do lote ao pagamento</h2></div><ol><li><b>01</b><span>Interesse e reserva</span></li><li><b>02</b><span>Cliente e proposta</span></li><li><b>03</b><span>Contrato e assinaturas</span></li><li><b>04</b><span>Comissão e repasse</span></li></ol></section></section>`;
};

const commissionsTemplate=ViewLayer.prototype.commissions;
const brlToNumber=value=>Number(String(value||'').replace(/[^\d,]/g,'').replace(',','.'))||0;
const formatBRL=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
const operationalHeaders=(extra={})=>{const actor=appStore.get().currentActor||{role:'owner',uid:'local-warley',name:'Warley'};return {'X-Belavista-Role':actor.role,'X-Belavista-User':actor.uid,'X-Belavista-Name':actor.name,...extra};};
ViewLayer.prototype.commissions=function(){
  const state=appStore.get();
  if(state.selectedCommissionProfile||state.selectedCommissionContract)return commissionsTemplate.call(this);
  const filters={query:'',status:'all',profile:'all',...(state.commissionFilters||{})};
  const local=state.commissionEntries||[],hidden=new Set(state.commissionHiddenIds||[]);
  const all=[...commissionDeals,...local].filter(item=>!hidden.has(item.id));
  const shown=all.filter(item=>{
    const q=String(filters.query||'').toLocaleLowerCase();
    return (!q||JSON.stringify(item).toLocaleLowerCase().includes(q))&&(filters.status==='all'||item.status===filters.status)&&(filters.profile==='all'||item.profile===filters.profile);
  });
  const profileName=id=>commissionProfiles.find(item=>item.id===id)?.name||'Consultor não definido';
  const form=state.commissionEditorOpen?`<form class="commission-entry-form" data-commission-entry-form><div class="commission-entry-head"><div><span class="activity-kind">${state.commissionEditing?'EDITAR LANÇAMENTO':'NOVO LANÇAMENTO'}</span><h2>${state.commissionEditing?'Atualizar comissão':'Vincular lote, cliente e comissão'}</h2></div><button type="button" class="toolbar-action" data-commission-cancel>Fechar</button></div><div class="commission-entry-grid"><label>Consultor<select name="profile">${commissionProfiles.map(person=>`<option value="${person.id}" ${state.commissionEditing?.profile===person.id?'selected':''}>${esc(person.name)}</option>`).join('')}</select></label><label>Lote<input name="lot" required value="${esc(state.commissionEditing?.lot||'')}" placeholder="Q12-L54"></label><label>Cliente<input name="client" required value="${esc(state.commissionEditing?.client||'')}" placeholder="Nome completo"></label><label>Valor do lote<input name="value" required value="${esc(state.commissionEditing?.value||'')}" placeholder="480000"></label><label>Taxa (%)<input name="rate" required value="${esc(String(state.commissionEditing?.rate||'6').replace('%',''))}" type="number" min="0" max="100" step=".1"></label><label>Status<select name="status">${['Reserva','Em análise','Proposta','Assinado'].map(status=>`<option ${state.commissionEditing?.status===status?'selected':''}>${status}</option>`).join('')}</select></label></div><button class="toolbar-primary" type="submit">${ico('save')} Salvar lançamento</button></form>`:'';
  return `<section class="commissions-page"><header class="commission-page-head"><div><span class="activity-kind">OPERAÇÃO COMERCIAL · COMISSÕES</span><h1>Carteira de comissões</h1><p>Perfis comerciais, negócios vinculados, lotes reservados e contratos rastreáveis.</p></div></header><div class="data-page-toolbar commissions-data-toolbar" aria-label="Controles de carteira de comissões"><div class="toolbar-context"><span class="activity-kind">CARTEIRA / LANÇAMENTOS</span><b>${shown.length} negócios visíveis</b><small>Relações lote → cliente → comissão.</small></div><div class="toolbar-controls"><label class="toolbar-search">Buscar<input data-commission-filter="query" value="${esc(filters.query)}" placeholder="Cliente, lote ou contrato"></label><label>Status<select data-commission-filter="status"><option value="all">Todos os status</option>${['Reserva','Em análise','Proposta','Assinado'].map(status=>`<option value="${status}" ${filters.status===status?'selected':''}>${status}</option>`).join('')}</select></label><label>Responsável<select data-commission-filter="profile"><option value="all">Todos os consultores</option>${commissionProfiles.map(person=>`<option value="${person.id}" ${filters.profile===person.id?'selected':''}>${esc(person.name)}</option>`).join('')}</select></label><button type="button" class="toolbar-action" data-commission-clear>${ico('filter-x')} Limpar</button><button type="button" class="toolbar-action" data-commission-export>${ico('download')} Exportar</button><button type="button" class="toolbar-primary" data-commission-new>${ico('plus')} Novo lançamento</button></div></div>${form}<div class="commission-kpis"><div><small>Vendas elegíveis</small><b>${all.length}</b><span>no ciclo atual</span></div><div><small>Comissão visível</small><b>${formatBRL(shown.reduce((sum,item)=>sum+brlToNumber(item.commission),0))}</b><span>conforme filtros</span></div><div><small>Valor geral de venda</small><b>${formatBRL(shown.reduce((sum,item)=>sum+brlToNumber(item.value),0))}</b><span>carteira acompanhada</span></div><div><small>Em aprovação</small><b>${shown.filter(item=>!['Assinado'].includes(item.status)).length}</b><span>minutas e reservas</span></div></div><section class="commission-transaction-section"><header><div><span class="activity-kind">ÚLTIMAS COMISSÕES</span><h2>Últimas comissões</h2></div><small>Abra, edite ou exclua um lançamento local.</small></header><div class="commission-transaction-list">${shown.slice().sort((a,b)=>Date.parse(String(b.date).split('/').reverse().join('-'))-Date.parse(String(a.date).split('/').reverse().join('-'))).slice(0,6).map(item=>`<article class="commission-transaction-row"><div><span class="deal-status ${esc(item.status).toLowerCase().replace(/\s+/g,'-')}">${esc(item.status)}</span><b>${esc(item.lot)}</b><small>${esc(item.id)} · ${esc(profileName(item.profile))}</small></div><div><b>${esc(item.client)}</b><small>${esc(item.quadra||'Lote vinculado')}</small></div><div><small>Valor do lote</small><b>${esc(item.value)}</b></div><div><small>Comissão</small><b>${esc(item.commission)}</b></div><div class="transaction-actions"><button type="button" data-commission-open="${esc(item.id)}">Abrir</button><button type="button" data-commission-edit="${esc(item.id)}">Editar</button><button type="button" data-commission-delete="${esc(item.id)}">Excluir</button></div></article>`).join('')||'<p class="empty-data">Nenhum lançamento corresponde aos filtros atuais.</p>'}</div></section><section class="commission-profile-section"><div class="commission-section-head"><div><span class="activity-kind">PERFIS COMERCIAIS</span><h2>Carteiras por responsável</h2></div><small>Use para navegar aos contratos e relações por consultor.</small></div><div class="commission-profile-grid">${commissionProfiles.map(person=>`<button type="button" class="commission-profile-card" data-commission-profile="${person.id}"><div class="commission-profile-top"><span class="commission-avatar" style="background:${person.avatar}">${person.initials}</span><span class="commission-open">Abrir carteira ${ico('arrow-up-right')}</span></div><div><h2>${person.name}</h2><p>${person.role}</p><small>${person.creci}</small></div><div class="commission-profile-metrics"><span><b>${person.sales}</b><small>vendas</small></span><span><b>${person.commission}</b><small>comissão</small></span><span><b>${person.conversion}</b><small>conversão</small></span></div><footer><span>${person.lots.length} relações lote–cliente ativas</span><i>${ico('chevron-right')}</i></footer></button>`).join('')}</div></section></section>`;
};
ViewLayer.prototype.commissionProfile=function(profile){
  const deals=commissionDeals.filter(item=>item.profile===profile.id);
  return `<section class="commission-profile-page"><button type="button" class="commission-back" data-commission-back>${ico('arrow-left')} Todas as comissões</button><header class="commission-profile-header"><div class="commission-avatar commission-avatar-large" style="background:${profile.avatar}">${profile.initials}</div><div><span class="activity-kind">PERFIL COMERCIAL · ${profile.creci}</span><h1>${profile.name}</h1><p>${profile.role} · ${profile.sales} vendas atribuídas no ciclo</p></div><aside><small>Comissão estimada</small><b>${profile.commission}</b><span>Taxa média de conversão ${profile.conversion}</span></aside></header><div class="commission-profile-summary"><div><small>Carteira</small><b>${deals.length} lotes vinculados</b><span>R$ ${deals.reduce((sum,item)=>sum+Number(item.value.replace(/[^\d]/g,''))/100,0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span></div><div><small>Responsabilidade</small><b>Cliente → lote → contrato</b><span>Todos os vínculos têm trilha comercial</span></div><div><small>Canal de atendimento</small><b>WhatsApp comercial</b><a target="_blank" rel="noopener" href="https://wa.me/${profile.phone}?text=${encodeURIComponent('Olá, '+profile.name+'. Preciso revisar a carteira de comissões da Aliança Park.')}">Abrir conversa ${ico('external-link')}</a></div></div><section class="commission-deal-section"><header><div><span class="activity-kind">RELAÇÕES DE CARTEIRA</span><h2>Lotes → clientes</h2></div><small>Clique em um card para abrir o contrato e a forma imprimível.</small></header><div class="commission-deal-grid">${deals.map(deal=>`<button type="button" class="commission-deal-card status-${deal.status.toLowerCase().replace(/\s+/g,'-')}" data-commission-contract="${deal.id}"><div class="deal-card-head"><span>${deal.status}</span><small>${deal.id}</small></div><div class="deal-lot-mark">${ico('map-pin')} <b>${deal.lot}</b></div><h3>${deal.client}</h3><p>${deal.quadra}</p><div class="deal-card-values"><span><small>Valor do lote</small><b>${deal.value}</b></span><span><small>Comissão</small><b>${deal.commission}</b></span></div><footer><span>${deal.stage}</span>${ico('arrow-up-right')}</footer></button>`).join('')}</div></section></section>`;
};
ViewLayer.prototype.commissionContract=function(deal){
  const profile=commissionProfiles.find(item=>item.id===deal.profile);
  return `<section class="contract-page"><div class="contract-actions no-print"><button type="button" class="commission-back" data-commission-profile="${profile.id}">${ico('arrow-left')} Voltar para ${profile.name}</button><div><button type="button" class="contract-action" data-contract-print>${ico('printer')} Imprimir / PDF</button><button type="button" class="commission-primary" data-contract-whatsapp>${ico('message-circle')} Enviar por WhatsApp</button></div></div><article class="contract-paper" aria-label="Contrato de promessa de compra e venda"><header class="contract-letterhead"><div class="contract-logo">◢</div><div><b>ALIANÇA PARK LOTEAMENTO</b><small>ALIANÇA PARK · INCORPORAÇÃO E DESENVOLVIMENTO URBANO</small></div><span>CONTRATO Nº ${deal.id}</span></header><div class="contract-title"><span>INSTRUMENTO PARTICULAR</span><h1>Contrato de promessa de compra e venda de lote</h1><p>Empreendimento Aliança Park · Senador Canedo, Goiás</p></div><section class="contract-parties"><div><span>VENDEDORA</span><b>Aliança Park Desenvolvimento Imobiliário Ltda.</b><p>CNPJ 00.000.000/0001-00 · Avenida Central, 1200 · Senador Canedo/GO</p></div><div><span>PROMITENTE COMPRADOR(A)</span><b>${deal.client}</b><p>CPF ${deal.cpf} · Dados cadastrais conferidos na proposta comercial.</p></div><div><span>INTERMEDIADORA</span><b>${profile.name}</b><p>${profile.role} · ${profile.creci}</p></div></section><section class="contract-clause"><h2>1. Objeto</h2><p>A VENDEDORA promete vender ao(à) COMPRADOR(A), que promete adquirir, o imóvel identificado como <b>${deal.quadra}</b>, no empreendimento Aliança Park, livre e desembaraçado de ônus, observadas as condições deste instrumento.</p></section><section class="contract-clause"><h2>2. Preço e condições de pagamento</h2><p>O preço certo e ajustado é de <b>${deal.value}</b>. A composição comercial pactuada prevê: ${deal.payment}. A reserva, a proposta e os comprovantes relacionados integram a pasta digital deste contrato.</p></section><section class="contract-clause"><h2>3. Comissão de intermediação</h2><p>Pela intermediação do negócio, é devida comissão correspondente a <b>${deal.rate}</b>, totalizando <b>${deal.commission}</b>, vinculada ao marco comercial e às condições de aprovação descritas no cadastro do empreendimento.</p></section><section class="contract-clause"><h2>4. Entrega, documentação e disposições finais</h2><p>As partes declaram ciência do memorial do loteamento, regulamento interno, cronograma de implantação e documentos de suporte. A efetivação fica condicionada à validação cadastral, ao recebimento das parcelas e às assinaturas exigidas.</p></section><div class="contract-appendix"><div><span>SITUAÇÃO COMERCIAL</span><b>${deal.status}</b><small>${deal.stage}</small></div><div><span>FINALIDADE DECLARADA</span><b>${deal.purpose}</b><small>Registro da proposta em ${deal.date}</small></div><div><span>RASTREABILIDADE</span><b>Cliente · lote · corretor</b><small>Registro eletrônico da carteira</small></div></div><div class="contract-signatures"><div><span>________________________________</span><b>Aliança Park Desenvolvimento Imobiliário</b><small>Vendedora</small></div><div><span>________________________________</span><b>${deal.client}</b><small>Promitente comprador(a)</small></div><div><span>________________________________</span><b>${profile.name}</b><small>Intermediadora</small></div></div><footer class="contract-footer"><span>Aliança Park · documento gerencial para formalização</span><span>Emissão: ${new Date().toLocaleDateString('pt-BR')}</span></footer></article></section>`;
};

const viewLayerBindWithCommissions=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  viewLayerBindWithCommissions.call(this);
  this.querySelectorAll('.commission-profile-card').forEach(card=>{
    if(card.querySelector('.commission-profile-map'))return;
    const map=document.createElement('map-scene');
    map.setAttribute('compact','');map.dataset.stage=`${card.querySelector('h2')?.textContent||'Carteira'} · lotes`;map.dataset.overlay='terraplanagem';map.className='commission-profile-map';map.setAttribute('aria-label','Mapa 3D dos lotes desta carteira');
    card.querySelector('.commission-profile-top')?.insertAdjacentElement('afterend',map);
  });
  this.querySelectorAll('[data-commission-profile]').forEach(button=>button.addEventListener('click',()=>appStore.set({selectedCommissionProfile:button.dataset.commissionProfile,selectedCommissionContract:null,lastAction:`Abriu carteira de comissões`})));
  this.querySelectorAll('[data-commission-contract]').forEach(button=>button.addEventListener('click',()=>appStore.set({selectedCommissionContract:button.dataset.commissionContract,lastAction:`Abriu contrato ${button.dataset.commissionContract}`})));
  this.querySelector('[data-commission-back]')?.addEventListener('click',()=>appStore.set({selectedCommissionProfile:null,selectedCommissionContract:null,lastAction:'Voltou para a carteira de comissões'}));
  this.querySelector('[data-contract-print]')?.addEventListener('click',()=>window.print());
  this.querySelector('[data-contract-whatsapp]')?.addEventListener('click',()=>{const deal=commissionDeals.find(item=>item.id===appStore.get().selectedCommissionContract);if(deal){const profile=commissionProfiles.find(item=>item.id===deal.profile);window.open(`https://wa.me/${profile.phone}?text=${encodeURIComponent(`Olá, ${deal.client}. Segue a minuta do contrato ${deal.id} referente ao ${deal.quadra}, no valor de ${deal.value}.`)}`,'_blank','noopener');}});
  this.querySelector('[data-commission-new]')?.addEventListener('click',()=>notify('Novo lançamento de comissão: escolha um perfil comercial para associar o negócio.'));
  this.querySelector('.leads-lot-interest')?.addEventListener('click',()=>{const target=this.querySelector('public-lead-form input[name="name"]');target?.scrollIntoView({behavior:'smooth',block:'center'});target?.focus();appStore.set({lastAction:'Selecionou QD02-L18 para registrar interesse'});notify('Lote QD02-L18 selecionado. Preencha seus dados para registrar o interesse.','success');});
};

// Superfícies integrais de controle. Cards conduzem ao perfil dedicado e as
// tabelas preservam a visão total da operação sem esconder os vínculos.
const brokerReasonDefaultsV9={signal:{label:'Sinal',sharePercent:40,warley:50,partner:50,payment:'À vista / sinal'},intermediate:{label:'Parcela intermediária',sharePercent:30,warley:50,partner:50,payment:'Parcela intermediária'},monthly:{label:'Mensal',sharePercent:30,warley:70,partner:30,payment:'Parcelas mensais'}};
const brokerReasonsV9=state=>{
  const configured=Array.isArray(state.commissionReasons)?state.commissionReasons:[];
  return Object.entries(brokerReasonDefaultsV9).map(([id,defaults])=>({...defaults,...(configured.find(item=>item.id===id)||{}),id}));
};
const brokerReasonEditorV9=reasons=>`<section class="broker-rule-editor" aria-label="Editor de regras de repasse"><header><div><span class="activity-kind">REGRAS EDITÁVEIS · ADMINISTRADOR</span><h2>Razões de comissão e divisão</h2><p>Edite a participação da razão. A divisão declarada permanece: mensais 70% Warley / 30% contraparte; sinal e intermediária 50% / 50%.</p></div><span class="broker-rule-audit">Aplicação controlada</span></header><div class="broker-rule-grid">${reasons.map(reason=>`<form data-v8-reason-form="${esc(reason.id)}"><div class="broker-rule-form-head"><b>${esc(reason.label)}</b><span>${esc(reason.payment)}</span></div><label>Nome da razão<input name="label" value="${esc(reason.label)}"></label><label>Participação na composição (%)<input name="sharePercent" type="number" min="0" max="100" step="0.1" value="${Number(reason.sharePercent??(reason.id==='signal'?40:30))}"></label><label>Warley (%)<input value="${reason.warley}" readonly></label><label>Contraparte (%)<input value="${reason.partner}" readonly></label><label class="wide">Descrição<input name="description" value="${esc(reason.description||'')}" placeholder="Quando esta razão libera o repasse"></label><button type="submit">${ico('save')} Salvar razão</button></form>`).join('')}</div></section>`;
const brokersControlV8=function(){
  const state=appStore.get(),deals=[...commissionDeals,...(state.commissionEntries||[])],periodLabels={monthly:'Mensal',annual:'Anual',cumulative:'Acumulado'},requestedPeriod=state.reportPeriod||'monthly',period=periodLabels[requestedPeriod]?requestedPeriod:'monthly';
  const profileStats=person=>{const rows=deals.filter(item=>item.profile===person.id),sales=rows.reduce((sum,item)=>sum+brlToNumber(item.value),0),commission=rows.reduce((sum,item)=>sum+brlToNumber(item.commission),0),pending=rows.filter(item=>item.status!=='Assinado').length;return {rows,sales,commission,pending};};
  const reasonLabel={signal:'Sinal',intermediate:'Parcela intermediária',monthly:'Mensal'};
  const reasons=brokerReasonsV9(state).filter(item=>item.active!==false),ruleEditor=brokerReasonEditorV9(reasons);
  queueMicrotask(()=>this.bindCommercialPagesV7?.());
  return `<section class="control-page broker-control-page"><header class="control-page-head"><div><span class="activity-kind">CENTRAL COMERCIAL · CONTROLE TOTAL</span><h1>Corretores e repasses</h1><p>Carteiras, contratos, razões de comissão, competências e arquivos gerados.</p></div><div class="control-head-actions"><button type="button" data-view="commissions">${ico('settings-2')} Regras de repasse</button><button type="button" class="toolbar-primary" data-v8-broker-reports>${ico('file-down')} PDF / Excel</button></div></header><nav class="control-period-tabs" aria-label="Período dos repasses">${Object.entries(periodLabels).map(([id,label])=>`<button type="button" class="${period===id?'active':''}" data-v7-period="${id}">${label}</button>`).join('')}</nav><section class="control-rule-strip"><div><small>RAZÕES ATIVAS</small><b>${reasons.length}</b></div>${reasons.map(item=>`<span><b>${esc(reasonLabel[item.id]||item.label)}</b><small>${Number(item.sharePercent||0).toLocaleString('pt-BR')}% da composição · ${item.warley}/${item.partner}</small></span>`).join('')}<button type="button" data-broker-rule-focus>Editar regras</button></section>${ruleEditor}<div class="broker-control-grid">${commissionProfiles.map(person=>{const stats=profileStats(person);return `<article class="broker-control-card"><header><span class="commission-avatar">${person.initials}</span><span><em>${stats.pending?'EM ACOMPANHAMENTO':'REGULAR'}</em><h2>${esc(person.name)}</h2><small>${esc(person.creci)} · ${esc(person.role)}</small></span></header><div class="broker-card-metrics"><span><small>Carteira</small><b>${stats.rows.length}</b></span><span><small>Vendas</small><b>${formatBRL(stats.sales)}</b></span><span><small>Comissão</small><b>${formatBRL(stats.commission)}</b></span><span><small>Pendências</small><b>${stats.pending}</b></span></div><div class="broker-card-lots">${person.lots.map(lot=>`<i>${esc(lot)}</i>`).join('')}</div><footer><a href="https://wa.me/${esc(person.phone)}" target="_blank" rel="noopener">${ico('message-circle')} Contato</a><button type="button" data-v7-open-broker="${person.id}">Abrir página dedicada ${ico('arrow-right')}</button></footer></article>`;}).join('')}</div><section class="control-ledger"><header><div><span class="activity-kind">TABELAÇÃO COMPLETA · ${periodLabels[period].toUpperCase()}</span><h2>Negócios, comissão e situação de repasse</h2></div><label>Buscar operação<input data-v8-broker-ledger-search placeholder="Contrato, corretor, cliente ou lote"></label></header><div class="control-table-wrap"><table><thead><tr><th>Contrato</th><th>Corretor</th><th>Cliente / lote</th><th>Venda</th><th>Comissão</th><th>Razão</th><th>Situação</th><th></th></tr></thead><tbody>${deals.map((deal,index)=>{const person=commissionProfiles.find(item=>item.id===deal.profile),reason=reasons[index%Math.max(1,reasons.length)];return `<tr data-v8-broker-ledger-row data-search="${esc(JSON.stringify(deal).toLowerCase()+' '+String(person?.name||'').toLowerCase())}"><td><b>${esc(deal.id)}</b><small>${esc(deal.date||'Sem competência')}</small></td><td>${esc(person?.name||'A definir')}</td><td><b>${esc(deal.client)}</b><small>${esc(deal.lot)} · ${esc(deal.quadra||'')}</small></td><td>${esc(deal.value)}</td><td><b>${esc(deal.commission)}</b><small>${esc(deal.rate)}</small></td><td>${esc(reason?.label||'Sinal')}</td><td><span class="control-status">${esc(deal.stage||deal.status)}</span></td><td><button type="button" data-commission-open="${esc(deal.id)}">Abrir</button></td></tr>`;}).join('')}</tbody></table></div></section><section class="broker-report-files" data-v8-broker-files><span>ARQUIVOS GERADOS</span><p>Carregando relatórios mensais e acumulados…</p></section></section>`;
};

const financeControlV8=function(){
  const state=appStore.get(),actor=state.currentActor||{role:'owner',label:'Dono'},summary=state.cashSummary||{},operational=state.operationalState||{},cash=operational.cash||{},entries=state.cashFlowLocal||[],notifications=state.operationalNotifications||[],guidance=state.operationalGuidance||null,agenda=(state.operationalAgenda||[]).slice(0,4);
  const stages=operational.stages||[];
  queueMicrotask(()=>this.bindCommercialPagesV7?.());
  return `<section class="control-page finance-control-page"><header class="control-page-head"><div><span class="activity-kind">GESTÃO FINANCEIRA · CONTROLE TOTAL</span><h1>Caixa e distribuição da obra</h1><p>Livro-razão, reserva operacional, alocação por dependência e alertas do agente.</p></div><div class="control-head-actions"><button type="button" data-view="reports">${ico('chart-no-axes-combined')} Relatórios gerenciais</button><button type="button" class="toolbar-primary" data-v7-finance-export>${ico('download')} Exportar dados</button></div></header><section class="finance-master-grid"><article class="finance-master-balance"><span>CAIXA MESTRE · DONO</span><strong>${formatBRL(Number(cash.balanceCents??summary.balanceCents??0)/100)}</strong><small>Entradas ${formatBRL(Number(summary.entriesCents||0)/100)} · Saídas ${formatBRL(Number(summary.exitsCents||0)/100)}</small></article><article><small>Reserva mínima</small><b>${formatBRL(Number(cash.reserveCents||0)/100)}</b><span>calibrada pelo Administrador</span></article><article><small>Disponível para alocação</small><b>${formatBRL(Number(cash.allocatableCents||0)/100)}</b><span>após reserva operacional</span></article><article><small>Notificações do perfil</small><b>${notifications.length}</b><span>eventos auditáveis</span></article></section>${guidance?`<section class="control-ledger"><header><div><span class="activity-kind">INFERÊNCIA OPERACIONAL CENTRAL</span><h2>${esc(guidance.focalStage?.name||'Frente prioritária')}</h2></div><small>${esc(guidance.summary||'')}</small></header><div class="finance-allocation-list"><article><span>01</span><div><b>Ação de caixa</b><small>${esc(guidance.cashAction||'Sem ação definida')}</small></div><div><small>Início previsto</small><b>${esc(guidance.focalStage?.plannedStart||'—')}</b></div><div><small>Fim previsto</small><b>${esc(guidance.focalStage?.plannedFinish||'—')}</b></div><em>${esc(String(guidance.focalStage?.adjustedRate||'—'))}</em></article>${agenda.map((item,index)=>`<article><span>${String(index+2).padStart(2,'0')}</span><div><b>${esc(item.title)}</b><small>${esc(item.stageName)} · ${esc(item.owner||'Responsável a definir')}</small></div><div><small>Início</small><b>${esc(item.plannedStart||'—')}</b></div><div><small>Status</small><b>${esc(item.status)}</b></div><em>${esc(item.category)}</em></article>`).join('')}</div></section>`:''}${['owner','developer'].includes(actor.role)?`<form class="cash-entry-control" data-v8-cash-entry><header><div><span class="activity-kind">NOVO LANÇAMENTO · AUTORIDADE DO DONO</span><h2>Movimentar fluxo de caixa</h2></div><small>Correções futuras devem usar estorno ou ajuste, preservando a trilha.</small></header><div><label>Tipo<select name="kind"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label>Data<input type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Categoria<input name="category" placeholder="Vendas, obra, ajuste…" required></label><label>Etapa<select name="stage"><option>Geral</option>${executionModel.stages.map(item=>`<option>${esc(item.name)}</option>`).join('')}</select></label><label>Valor (R$)<input name="amount" inputmode="decimal" placeholder="0,00" required></label><label class="wide">Origem / descrição<input name="description" placeholder="Identifique recebimento, pagamento, estorno ou ajuste" required></label></div><footer><span data-v8-cash-status>O agente recalculará todas as frentes após confirmar.</span><button type="submit">${ico('wallet-cards')} Registrar e recalcular</button></footer></form>`:`<div class="role-boundary-notice">${ico('lock-keyhole')} Somente o Dono altera o caixa. Seu perfil atual é ${esc(actor.label||actor.role)}.</div>`}<section class="finance-allocation-board"><header><div><span class="activity-kind">ALOCAÇÃO SEQUENCIAL · VERSÃO ${operational.calibrationVersion||1}</span><h2>Capacidade financeira por etapa</h2></div><button type="button" data-view="settings">Abrir calibrações</button></header><div class="finance-allocation-list">${stages.map((stage,index)=>`<article><span>${String(index+1).padStart(2,'0')}</span><div><b>${esc(stage.name)}</b><small>${stage.blockedBy?.length?`Bloqueada por ${stage.blockedBy.join(', ')}`:'Elegível conforme relações'}</small></div><div><small>Necessidade</small><b>${formatBRL(Number(stage.needCents||0)/100)}</b></div><div><small>Alocado</small><b>${formatBRL(Number(stage.allocatedCents||0)/100)}</b></div><em class="${stage.coverage<35?'critical':''}">${stage.coverage}%</em></article>`).join('')||'<p>Aguardando o primeiro cálculo operacional.</p>'}</div></section><section class="control-ledger finance-ledger"><header><div><span class="activity-kind">LIVRO-RAZÃO</span><h2>Entradas e saídas registradas</h2></div><label>Filtrar lançamentos<input data-v8-finance-search placeholder="ID, etapa, categoria ou descrição"></label></header><div class="control-table-wrap"><table><thead><tr><th>Data / ID</th><th>Natureza</th><th>Categoria</th><th>Etapa</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${entries.map(item=>`<tr data-v8-finance-row data-search="${esc(JSON.stringify(item).toLowerCase())}"><td><b>${esc(item.date)}</b><small>${esc(item.id)}</small></td><td><span class="cash-kind ${esc(item.kind)}">${esc(item.kind)}</span></td><td>${esc(item.category)}</td><td>${esc(item.stage)}</td><td>${esc(item.description)}</td><td><b>${item.kind==='saida'?'−':'＋'} ${formatBRL(Number(item.amountCents||0)/100)}</b></td></tr>`).join('')}</tbody></table></div></section><aside class="finance-notification-list"><span class="activity-kind">CIÊNCIA DO AGENTE</span>${notifications.slice(0,6).map(item=>`<article class="${esc(item.severity)}"><b>${esc(item.title)}</b><p>${esc(item.message)}</p><small>${new Date(item.createdAt).toLocaleString('pt-BR')}</small></article>`).join('')||'<p>Nenhuma notificação para o perfil atual.</p>'}</aside></section>`;
};

const bindControlPageEventsV8=function(){
  const root=this.querySelector('.control-page');if(!root||root.dataset.controlBound)return;root.dataset.controlBound='1';
  root.querySelector('[data-v8-broker-ledger-search]')?.addEventListener('input',event=>{const q=event.target.value.toLowerCase();root.querySelectorAll('[data-v8-broker-ledger-row]').forEach(row=>row.hidden=!row.dataset.search.includes(q));});
  root.querySelector('[data-v8-finance-search]')?.addEventListener('input',event=>{const q=event.target.value.toLowerCase();root.querySelectorAll('[data-v8-finance-row]').forEach(row=>row.hidden=!row.dataset.search.includes(q));});
  const reportHost=root.querySelector('[data-v8-broker-files]');if(reportHost)apiFetch('/api/broker-reports').then(response=>response.json()).then(payload=>{reportHost.innerHTML=`<span>ARQUIVOS GERADOS</span><div>${(payload.files||[]).slice(0,12).map(file=>`<a href="${apiUrl(file.url)}" target="_blank" rel="noopener">${ico(file.name.endsWith('.pdf')?'file-text':'sheet')}<b>${esc(file.name)}</b><small>${esc(file.month)}</small></a>`).join('')||'<p>Nenhum arquivo disponível.</p>'}</div>`;window.lucide?.createIcons();}).catch(()=>{reportHost.innerHTML='<span>ARQUIVOS GERADOS</span><p>Serviço de relatórios indisponível.</p>';});
  root.querySelector('[data-v8-broker-reports]')?.addEventListener('click',()=>reportHost?.scrollIntoView({behavior:'smooth',block:'center'}));
  root.querySelector('[data-broker-rule-focus]')?.addEventListener('click',()=>root.querySelector('.broker-rule-editor')?.scrollIntoView({behavior:'smooth',block:'center'}));
  const ruleHeaderButton=root.querySelector('.broker-control-page .control-head-actions [data-view="commissions"]');
  ruleHeaderButton?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();root.querySelector('.broker-rule-editor')?.scrollIntoView({behavior:'smooth',block:'center'});},true);
  root.querySelector('[data-v8-cash-entry]')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,status=form.querySelector('[data-v8-cash-status]'),data=Object.fromEntries(new FormData(form)),amountCents=Math.round(Number(String(data.amount||'').replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,''))*100)||0;if(!amountCents){status.textContent='Informe um valor maior que zero.';return;}const button=form.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Registrando e recalculando relações…';try{const response=await apiFetch('/api/cash-flow',{method:'POST',headers:operationalHeaders({'Content-Type':'application/json'}),body:JSON.stringify({...data,amountCents})}),payload=await response.json();if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);appStore.set({cashSummary:payload.summary,cashFlowLocal:[payload.entry,...(appStore.get().cashFlowLocal||[])],operationalState:payload.operational,lastAction:`Dono registrou ${data.kind} de caixa`});await this.runOperationalLoop('cash.changed');notify('Caixa registrado e frentes recalculadas.','success');}catch(error){status.textContent=error.message;button.disabled=false;}});
};

const viewLayerBindWithDataToolbars=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  viewLayerBindWithDataToolbars.call(this);
  const downloadCsv=(filename,columns,rows)=>{
    const csv=[columns,...rows].map(row=>row.map(cell=>`"${String(cell??'').replaceAll('"','""')}"`).join(';')).join('\n');
    const url=URL.createObjectURL(new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const applyLeadFilters=()=>{
    const filters={query:'',objective:'all',status:'all',...(appStore.get().leadFilters||{})};
    this.querySelectorAll('.lead-client-row').forEach(row=>{
      const text=row.textContent.toLocaleLowerCase(),objective=row.querySelector('small')?.textContent||'',status=row.querySelector('em')?.textContent||'';
      row.hidden=Boolean((filters.query&&!text.includes(filters.query.toLocaleLowerCase()))||(filters.objective!=='all'&&!objective.includes(filters.objective))||(filters.status!=='all'&&status!==filters.status));
    });
  };
  this.querySelectorAll('[data-lead-toolbar-filter]').forEach(control=>control.addEventListener('input',event=>{
    const key=event.currentTarget.dataset.leadToolbarFilter,value=event.currentTarget.value;
    appStore.set({leadFilters:{...(appStore.get().leadFilters||{}),[key]:value},lastAction:'Filtrou a lista comercial'});applyLeadFilters();
  }));
  this.querySelector('[data-lead-filter-clear]')?.addEventListener('click',()=>{appStore.set({leadFilters:{query:'',objective:'all',status:'all'},lastAction:'Limpou filtros de leads'});this.render();});
  this.querySelector('[data-lead-export]')?.addEventListener('click',()=>{
    const rows=[...(appStore.get().publicLeads||[]),...demoData.leads];downloadCsv('leads-lotes.csv',['Cliente','Lote','Objetivo','Status','WhatsApp','E-mail'],rows.map(item=>[item.name,item.lot,item.objective,item.status,item.whatsapp||'',item.email||'']));notify('Lista de leads exportada em CSV.','success');appStore.set({lastAction:'Exportou lista de leads'});
  });
  this.querySelector('[data-lead-new]')?.addEventListener('click',()=>{const form=this.querySelector('public-lead-form');form?.scrollIntoView({behavior:'smooth',block:'center'});form?.querySelector('input[name="name"]')?.focus();notify('Preencha o formulário público para criar um novo lead.');});
  applyLeadFilters();

  this.querySelectorAll('[data-commission-filter]').forEach(control=>control.addEventListener('input',event=>{
    const key=event.currentTarget.dataset.commissionFilter,value=event.currentTarget.value;
    appStore.set({commissionFilters:{...(appStore.get().commissionFilters||{}),[key]:value},lastAction:'Filtrou lançamentos de comissão'});
  }));
  this.querySelector('[data-commission-clear]')?.addEventListener('click',()=>appStore.set({commissionFilters:{query:'',status:'all',profile:'all'},lastAction:'Limpou filtros de comissões'}));
  this.querySelector('[data-commission-export]')?.addEventListener('click',()=>{
    const state=appStore.get(),hidden=new Set(state.commissionHiddenIds||[]),rows=[...commissionDeals,...(state.commissionEntries||[])].filter(item=>!hidden.has(item.id));
    downloadCsv('comissoes-lotes.csv',['Contrato','Lote','Cliente','Responsável','Status','Valor','Comissão'],rows.map(item=>[item.id,item.lot,item.client,commissionProfiles.find(person=>person.id===item.profile)?.name||'',item.status,item.value,item.commission]));notify('Carteira de comissões exportada em CSV.','success');appStore.set({lastAction:'Exportou carteira de comissões'});
  });
  this.querySelector('[data-commission-new]')?.addEventListener('click',()=>appStore.set({commissionEditorOpen:true,commissionEditing:null,lastAction:'Abriu novo lançamento de comissão'}));
  this.querySelector('[data-commission-cancel]')?.addEventListener('click',()=>appStore.set({commissionEditorOpen:false,commissionEditing:null,lastAction:'Fechou lançamento de comissão'}));
  this.querySelectorAll('[data-commission-edit]').forEach(button=>button.addEventListener('click',()=>{
    const state=appStore.get(),deal=[...commissionDeals,...(state.commissionEntries||[])].find(item=>item.id===button.dataset.commissionEdit);
    if(deal)appStore.set({commissionEditorOpen:true,commissionEditing:deal,lastAction:`Editou ${deal.id}`});
  }));
  this.querySelectorAll('[data-commission-delete]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.commissionDelete;if(!confirm(`Excluir o lançamento ${id}?`))return;
    const state=appStore.get();appStore.set({commissionHiddenIds:[...(state.commissionHiddenIds||[]),id],lastAction:`Excluiu lançamento ${id}`});notify('Lançamento removido da carteira exibida.','success');
  }));
  this.querySelectorAll('[data-commission-open]').forEach(button=>button.addEventListener('click',()=>{
    const deal=commissionDeals.find(item=>item.id===button.dataset.commissionOpen);
    if(deal)appStore.set({selectedCommissionContract:deal.id,lastAction:`Abriu contrato ${deal.id}`});else notify('Lançamento local aberto para edição.');
  }));
  this.querySelector('[data-commission-entry-form]')?.addEventListener('submit',event=>{
    event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget).entries()),state=appStore.get(),rate=Number(values.rate||0),value=formatBRL(values.value),id=state.commissionEditing?.id||`CT-LOCAL-${Date.now().toString().slice(-6)}`;
    const entry={id,profile:values.profile,lot:values.lot.toUpperCase(),quadra:`Lote ${values.lot.toUpperCase()}`,client:values.client,status:values.status,value,commission:formatBRL(brlToNumber(value)*rate/100),rate:`${rate.toLocaleString('pt-BR',{minimumFractionDigits:2})}%`,date:new Date().toLocaleDateString('pt-BR'),payment:'A definir',purpose:'A definir',stage:'Cadastro comercial local'};
    const existing=(state.commissionEntries||[]).filter(item=>item.id!==id);appStore.set({commissionEntries:[...existing,entry],commissionEditorOpen:false,commissionEditing:null,lastAction:`Salvou lançamento ${id}`});notify('Lançamento comercial salvo na carteira local.','success');
  });
  const commissionForm=this.querySelector('[data-commission-entry-form]');
  commissionForm?.querySelector('button[type="submit"]')?.addEventListener('click',event=>{
    // Some embedded map layers can intercept a native submit. Keep the save
    // action explicit while preserving the standard form as a keyboard fallback.
    event.preventDefault();
    commissionForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  });
};

// Visão geral de etapas: os painéis extensos vivem antes da superfície livre.
// A lista horizontal fica no fim como um navegador de etapas, não como o
// próprio canvas. Assim o usuário lê o planejamento antes de selecionar uma
// frente para aprofundar.
const stageUtilitiesLayout=ViewLayer.prototype.addStageUtilities;
ViewLayer.prototype.addStageUtilities=function(){
  stageUtilitiesLayout.call(this);
  const shell=this.querySelector('.stage-shell'),toolbar=shell?.querySelector('.stage-toolbar'),panel=shell?.querySelector('.stage-utilities'),body=shell?.querySelector('.stage-body'),overview=shell?.querySelector('.stage-overview');
  if(!shell||!toolbar||!panel||!body)return;
  let metrics=shell.querySelector('.stage-progress-overview');
  if(!metrics){
    const stages=demoData.activities,timeModels=buildStageTimeModels(stages),plannedHours=timeModels.reduce((sum,model)=>sum+model.totalHours,0),completed=stages.filter(item=>item.progress>=100).length,average=Math.round(stages.reduce((sum,item)=>sum+item.progress,0)/Math.max(1,stages.length)),elapsedHours=Math.round(plannedHours*average/100*2)/2;
    metrics=document.createElement('section');metrics.className='stage-progress-overview';
    metrics.innerHTML=`<div class="stage-progress-copy"><span class="activity-kind">RESUMO DE PROGRESSO E ETAPAS</span><h2>Implantação acompanhada em tempo, custo e frentes</h2><p>Leitura consolidada do calendário operacional antes de abrir uma etapa. A soma considera ${stages.length} frentes e 4 atividades por frente.</p></div><div class="stage-progress-metrics"><div><small>AVANÇO MÉDIO</small><b>${average}%</b><i style="width:${average}%"></i><span>${formatHours(elapsedHours)} executadas</span></div><div><small>TEMPO PLANEJADO</small><b>${formatHours(plannedHours)}</b><span>${timeModels.reduce((sum,model)=>sum+model.tasks.length,0)} atividades somadas</span></div><div><small>ETAPAS CONCLUÍDAS</small><b>${completed}<em>/${stages.length}</em></b><span>${stages.filter(item=>item.progress>0&&item.progress<100).length} frentes ativas</span></div><div><small>PRÓXIMO MARCO</small><b>${formatPlanningDate(timeModels[1]?.tasks[2]?.startDay||16)}</b><span>medição de drenagem</span></div></div>`;
    toolbar.after(metrics);
  }
  metrics.after(panel); body.after(overview);
  const timeModels=buildStageTimeModels(demoData.activities);
  shell.querySelectorAll('.stage-overview-card').forEach((card,index)=>{
    const model=timeModels[index];if(!model||card.querySelector('.stage-time-chip'))return;
    card.insertAdjacentHTML('beforeend',`<span class="stage-time-chip">Σ ${formatHours(model.totalHours)} · D${model.startDay}–D${model.endDay}</span>`);
  });
  const card=body.querySelector('.stage-detail-card');
  if(card&&!card.querySelector('.stage-expand-accordion')){
    const selected=demoData.activities.find(item=>item.id===appStore.get().selectedStage)||demoData.activities[0];
    card.insertAdjacentHTML('beforeend',`<section class="stage-expand-accordion" open><button type="button" data-stage-accordion aria-expanded="true">${ico('list-tree')} Destrinchamento da etapa <span>escopo, registros e relações</span>${ico('chevron-down')}</button><div class="stage-accordion-content"><span>Escopo: frente, equipe, medição e evidências</span><span>Relações: 2 compras · 8 materiais · 4 atividades</span><span>Dependência: etapa anterior liberada</span></div></section><footer class="stage-card-footer"><span>${ico('link-2')} Diagrama relacional disponível abaixo</span><button type="button" data-open-stage>${ico('arrow-up-right')} Abrir página de ${esc(selected.name)}</button></footer>`);
  }
};

ViewLayer.prototype.splitStageTabs=function(){
  const panel=this.querySelector('.stage-utilities');if(!panel)return;
  const stages=demoData.activities,timeModels=buildStageTimeModels(stages),plannedHours=timeModels.reduce((sum,model)=>sum+model.totalHours,0),planningDays=Math.max(21,timeModels.at(-1)?.endDay||21),days=Array.from({length:planningDays},(_,index)=>index+1);
  const gantt=timeModels.map((model,index)=>{const item=model.stage,left=(model.startDay-1)/planningDays*100,width=(model.endDay-model.startDay+1)/planningDays*100;return `<div class="planning-gantt-row"><div><b>${esc(item.name)}</b><small>${esc(item.owner)} · ${item.progress}% · soma ${formatHours(model.totalHours)}</small></div><span class="planning-gantt-track"><i style="left:${left}%;width:${width}%"><b>${formatHours(model.totalHours)} · D${model.startDay}–D${model.endDay}</b></i></span></div>`;}).join('');
  const monthDays=Array.from({length:35},(_,index)=>index<31?index+1:'');
  const agendaByDay=new Map();timeModels.forEach((model,index)=>model.tasks.forEach((task,taskIndex)=>{for(let day=task.startDay;day<=Math.min(31,task.endDay);day++){const rows=agendaByDay.get(day)||[];rows.push(`<span class="month-task tone-${index%3}" title="${esc(task.name)} · ${formatHours(task.hours)}">${day===task.startDay?esc(task.name):'continua'} · ${esc(model.stage.name)}</span>`);agendaByDay.set(day,rows);}}));
  const agenda=monthDays.map(day=>`<div class="month-day ${day===6?'today':''}"><b>${day}</b>${day?(agendaByDay.get(day)||[]).join('')+(day===6?'<span class="month-task secondary">Marco de acompanhamento</span>':''):''}</div>`).join('');
  const relationCards=timeModels.map((model,index)=>`<article class="relation-stage-node" style="--x:${6+(index%3)*31}%;--y:${10+Math.floor(index/3)*44}%"><span>${String(index+1).padStart(2,'0')} · ${esc(stageOverlayLabels[stageOverlayKey(model.stage.name)])}</span><b>${esc(model.stage.name)}</b><small>${model.stage.progress}% · ${esc(model.stage.owner)}</small><small>${formatHours(model.totalHours)} · D${model.startDay}–D${model.endDay}</small></article>`).join('');
  const todos=timeModels.map((model,index)=>{const task=model.tasks[2]||model.tasks[0];return `<label class="planning-todo"><input type="checkbox" ${index===0?'checked':''}><span><b>${esc(task.name)}</b><small>${esc(model.stage.name)} · ${esc(model.stage.owner)} · ${formatPlanningDate(task.startDay)} · ${formatHours(task.hours)}</small></span><em>${task.startDay<=6?'Hoje':'Programado'}</em></label>`;}).join('');
  panel.innerHTML=`<nav class="utility-tabs stage-planning-tabs" aria-label="Visões do planejamento"><button class="utility-tab active" data-stage-plan="cronograma">${ico('gantt-chart')} Cronograma</button><button class="utility-tab" data-stage-plan="agenda">${ico('calendar-days')} Agenda</button><button class="utility-tab" data-stage-plan="canvas">${ico('workflow')} Canvas relacional</button><button class="utility-tab" data-stage-plan="afazeres">${ico('list-checks')} A fazeres</button></nav><div class="utility-content stage-planning-content"><section class="stage-plan-pane" data-stage-pane="cronograma"><header><div><span class="activity-kind">CALENDÁRIO DE IMPLANTAÇÃO</span><h3>Consumo de tempo por etapa</h3><p>Leitura horizontal da duração planejada e do avanço de cada frente.</p></div><div class="planning-legend"><span><i></i> Em execução</span><span><i></i> Planejado</span></div></header><div class="planning-calendar-head"><span>Etapa / responsável</span><div>${days.map(day=>`<b>D${day}</b>`).join('')}</div></div><div class="planning-gantt">${gantt}</div></section><section class="stage-plan-pane" data-stage-pane="agenda" hidden><header><div><span class="activity-kind">AGENDA OPERACIONAL</span><h3>Junho de 2024</h3><p>Navegue entre meses e acompanhe as atividades distribuídas no calendário.</p></div><div class="month-nav"><button data-calendar-shift="-1">←</button><b>Junho 2024</b><button data-calendar-shift="1">→</button></div></header><div class="month-weekdays"><b>Dom</b><b>Seg</b><b>Ter</b><b>Qua</b><b>Qui</b><b>Sex</b><b>Sáb</b></div><div class="month-grid">${agenda}</div></section><section class="stage-plan-pane" data-stage-pane="canvas" hidden><header><div><span class="activity-kind">DIAGRAMA RELACIONAL</span><h3>Canvas relacional das etapas</h3><p>Dependências rotuladas entre frentes, compras, medições e liberações.</p></div><button class="agenda-action" data-stage-relate>${ico('plus')} Criar relação</button></header><div class="stage-relation-canvas"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M28 31 C38 31 37 40 42 46 S58 57 68 60"/><path d="M25 70 C39 70 42 60 58 59 S70 37 75 28"/><text x="43" y="38">libera</text><text x="53" y="67">depende de</text></svg>${relationCards}</div></section><section class="stage-plan-pane" data-stage-pane="afazeres" hidden><header><div><span class="activity-kind">A FAZERES</span><h3>Próximas confirmações operacionais</h3><p>Conclua, atribua responsáveis ou leve o item para a agenda.</p></div><button class="agenda-action" data-plan-todo>${ico('plus')} Adicionar afazer</button></header><div class="planning-todo-list">${todos}</div></section></div>`;
  panel.style.setProperty('--planning-days',planningDays);
  panel.querySelectorAll('.planning-calendar-head>div').forEach(element=>element.style.gridTemplateColumns=`repeat(${planningDays},minmax(24px,1fr))`);
  panel.querySelector('[data-stage-pane="cronograma"] h3').textContent=`Consumo de tempo por etapa · ${formatHours(plannedHours)} somadas`;
  panel.querySelector('[data-stage-pane="cronograma"] p').textContent=`${timeModels.reduce((sum,model)=>sum+model.tasks.length,0)} atividades distribuídas em ${planningDays} dias úteis previstos; frações calculadas em horas.`;
  const panes=[...panel.querySelectorAll('[data-stage-pane]')];
  panel.querySelectorAll('[data-stage-plan]').forEach(button=>button.addEventListener('click',()=>{panel.querySelectorAll('[data-stage-plan]').forEach(tab=>tab.classList.toggle('active',tab===button));panes.forEach(pane=>pane.hidden=pane.dataset.stagePane!==button.dataset.stagePlan);appStore.set({lastAction:`Abriu ${button.textContent.trim()} do planejamento`});}));
  panel.querySelector('[data-stage-relate]')?.addEventListener('click',()=>notify('Relação pronta para ser rotulada entre as etapas.','success'));
  panel.querySelector('[data-plan-todo]')?.addEventListener('click',()=>notify('Novo afazer adicionado à lista da etapa.','success'));
};

const activitiesCatalogTemplate=ViewLayer.prototype.activities;
ViewLayer.prototype.activities=function(){
  const stage=extensionStage(),items=activityCatalog.slice(0,11),categories=[...new Set(items.map(item=>item.nature))];
  return `<div class="stage-extension-page activities-page"><div class="extension-head"><div><span class="activity-kind">${esc(stage.week)} · ${esc(stage.name)}</span><h1>Atividades da etapa</h1><p>Lista operacional com propriedades, execução e controles administrativos.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico('arrow-left')} Todas as etapas</button><button class="primary" data-activity-new>${ico('plus')} Nova atividade</button></div></div><section class="activities-dynamic-summary"><div><span class="activity-kind">RESUMO CONTROLADO</span><b>${items.length} modelos disponíveis</b><small>${items.slice(0,3).map(item=>item.nature).join(' · ')}</small></div><div><b>04</b><small>em execução</small></div><div><b>02</b><small>aguardando compra</small></div><div><b>${stage.progress}%</b><small>avanço da etapa</small></div></section><div class="activity-toolbar"><div class="activity-filter-label">Filtrar por natureza</div><button class="active" data-activity-category-filter="all">Todas <span>${items.length}</span></button>${categories.map(category=>`<button data-activity-category-filter="${esc(category)}">${esc(category)} <span>${items.filter(item=>item.nature===category).length}</span></button>`).join('')}</div><div class="activity-list-layout">${items.map((item,index)=>`<article class="activity-list-row" data-activity-card data-activity-category="${esc(item.nature)}"><div class="activity-row-index">${String(index+1).padStart(2,'0')}</div><div><span class="activity-kind">${esc(item.nature)}</span><h3>${esc(item.name)}</h3><p>${item.initial.length} campos iniciais · ${item.execution.length} campos de execução · ${esc(stage.name)}</p></div><div class="activity-row-status"><b>${index<3?'Em execução':'Planejada'}</b><small>${index<3?`${Math.max(12,stage.progress-index*9)}% realizado`:'Aguardando liberação'}</small></div><div class="activity-row-actions"><button data-activity-open="${index}">${ico('panel-right-open')} Abrir</button><button data-activity-edit="${index}">${ico('pencil')} Editar</button><button data-activity-delete="${index}">${ico('trash-2')} Excluir</button></div></article>`).join('')}</div></div>`;
};

const viewLayerBindPlanning=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  viewLayerBindPlanning.call(this);
  this.querySelector('[data-open-stage]')?.addEventListener('click',()=>appStore.set({activityDedicated:true,lastAction:'Abriu página dedicada da etapa'}));
  this.querySelector('[data-stage-accordion]')?.addEventListener('click',()=>notify('O destrinchamento permanece visível durante o acompanhamento da etapa.','success'));
  this.querySelectorAll('[data-activity-edit]').forEach(button=>button.addEventListener('click',()=>notify('Edição da atividade aberta no painel de propriedades.','success')));
  this.querySelectorAll('[data-activity-delete]').forEach(button=>button.addEventListener('click',()=>notify('Atividade marcada para exclusão; confirme no fluxo de execução.','warning')));
  this.querySelectorAll('.journal-entry').forEach(entry=>{
    if(entry.querySelector('.journal-responsible-footer'))return;
    const owner=entry.querySelector('.journal-meta span')?.textContent.replace(/\s+/g,' ').trim()||'Responsável da frente';
    const initials=owner.split(' ').filter(Boolean).slice(-2).map(word=>word[0]).join('').toUpperCase();
    entry.insertAdjacentHTML('beforeend',`<aside class="journal-responsible-footer"><span class="avatar">${esc(initials)}</span><span><small>RESPONSÁVEL PELO APONTAMENTO</small><b>${esc(owner)}</b><em>Disponível para confirmação</em></span></aside>`);
  });
};

// A posição horizontal vira o início no calendário; a largura representa a
// duração. A etiqueta é atualizada ao soltar o card, sem um relógio separado.
const stageNodesWithDuration=ViewLayer.prototype.addActivityNodes;
ViewLayer.prototype.addActivityNodes=function(){
  stageNodesWithDuration.call(this);
  const layer=this.querySelector('.stage-canvas .activity-layer');if(!layer||layer.dataset.timeLabels)return;
  layer.dataset.timeLabels='true';
  const models=buildStageTimeModels(demoData.activities);
  const update=node=>{
    const stageModel=findStageTimeModel(node.dataset.stage,models),nodeIndex=[...layer.querySelectorAll('.activity-node')].indexOf(node)%STAGE_WORK_PACKETS.length,task=stageModel?.tasks[nodeIndex]||stageModel?.tasks[0],hours=task?.hours||Math.max(.5,Math.round((node.offsetWidth/26)*2)/2),start=task?.startDay||Math.max(1,Math.round((node.offsetLeft-24)/46)+1),end=task?.endDay||start+Math.max(0,Math.ceil(hours/WORKDAY_HOURS)-1);
    node.dataset.timeHours=String(hours);node.dataset.timeStart=String(start);node.dataset.timeEnd=String(end);
    let label=node.querySelector('.activity-time-label');if(!label){label=document.createElement('span');label.className='activity-time-label';node.appendChild(label);}
    label.innerHTML=`${formatHours(hours)}<br>dia ${start} a dia ${end}`;
  };
  layer.querySelectorAll('.activity-node').forEach(node=>{update(node);node.addEventListener('pointerup',()=>update(node));node.addEventListener('pointercancel',()=>update(node));});
};

// Comissões mantém a origem da navegação: contrato aberto pela lista volta à
// lista; contrato aberto dentro da carteira volta ao responsável correspondente.
const commissionContractWithHistory=ViewLayer.prototype.commissionContract;
ViewLayer.prototype.commissionContract=function(deal){
  const profile=commissionProfiles.find(item=>item.id===deal.profile);
  const returnProfile=appStore.get().commissionContractReturn||'';
  const returnLabel=returnProfile?(commissionProfiles.find(item=>item.id===returnProfile)?.name||'carteira anterior'):'lançamentos contratuais';
  return commissionContractWithHistory.call(this,deal)
    .replace(`data-commission-profile="${profile.id}"`,`data-contract-return data-commission-return="${esc(returnProfile)}"`)
    .replace(`Voltar para ${profile.name}`,`Voltar para ${returnLabel}`);
};

const viewLayerBindCommissionControls=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  viewLayerBindCommissionControls.call(this);
  const page=this.querySelector('.commissions-page');
  if(page){
    const portfolios=page.querySelector('.commission-profile-section'),transactions=page.querySelector('.commission-transaction-section');
    if(portfolios&&transactions)transactions.before(portfolios);
    if(!page.querySelector('.commission-control-footer')){
      (transactions||portfolios)?.insertAdjacentHTML('afterend',`<footer class="commission-control-footer"><div><span class="activity-kind">CONTROLES DE CARTEIRA</span><b>Fechamento comercial e preparação de documentos</b><small>Imprima a carteira, inclua o mapa do loteamento ou troque dados com planilhas.</small></div><div class="commission-footer-actions"><button type="button" class="toolbar-action" data-commission-print>Imprimir</button><button type="button" class="toolbar-action" data-commission-print-map>${ico('map')} Com mapa</button><label class="toolbar-action commission-import-label">${ico('upload')} Importar Excel<input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-commission-import hidden></label><button type="button" class="toolbar-primary" data-commission-export-excel>${ico('download')} Exportar Excel</button></div><p class="commission-footer-suggestions">Sugestões: revise reservas pendentes, valide documentos de contratos e envie a previsão de repasse aos responsáveis.</p></footer>`);
    }
    this.querySelector('[data-commission-print]')?.addEventListener('click',()=>window.print());
    this.querySelector('[data-commission-print-map]')?.addEventListener('click',()=>{const shell=document.querySelector('.app-shell');shell?.classList.add('print-with-map');window.print();setTimeout(()=>shell?.classList.remove('print-with-map'),300);});
    this.querySelector('[data-commission-export-excel]')?.addEventListener('click',()=>this.querySelector('[data-commission-export]')?.click());
    this.querySelector('[data-commission-import]')?.addEventListener('change',async event=>{
      const file=event.currentTarget.files?.[0];if(!file)return;
      if(!/\.csv$/i.test(file.name)){notify(`Planilha ${file.name} adicionada à fila de importação. Para importar linhas automaticamente, exporte-a como CSV UTF-8.`, 'warning');return;}
      const [header,...lines]=(await file.text()).split(/\r?\n/).filter(Boolean),columns=header.split(/[;,\t]/).map(value=>value.trim().toLocaleLowerCase());
      const read=(row,names)=>{const values=row.split(/[;,\t]/);const index=columns.findIndex(column=>names.some(name=>column.includes(name)));return index>=0?values[index]?.trim():'';};
      const entries=lines.map((line,index)=>{const profileName=read(line,['respons','consultor','corretor']);const profile=commissionProfiles.find(item=>item.name.toLocaleLowerCase()===profileName.toLocaleLowerCase())||commissionProfiles[0];const value=read(line,['valor'])||'0';const rate=Number(String(read(line,['taxa'])||'6').replace(',','.').replace(/[^\d.]/g,''))||6;return {id:`CT-IMP-${Date.now().toString().slice(-5)}${index}`,profile:profile.id,lot:read(line,['lote'])||`IMPORT-${index+1}`,quadra:read(line,['quadra'])||'Lote importado',client:read(line,['cliente','comprador'])||'Cliente importado',status:read(line,['status'])||'Proposta',value:formatBRL(brlToNumber(value)),commission:formatBRL(brlToNumber(value)*rate/100),rate:`${rate.toLocaleString('pt-BR',{minimumFractionDigits:2})}%`,date:new Date().toLocaleDateString('pt-BR'),payment:'Importado de planilha',purpose:'A definir',stage:'Importação CSV'};}).filter(entry=>entry.lot||entry.client);
      if(!entries.length){notify('Não encontrei linhas válidas na planilha CSV.','warning');return;}
      appStore.set({commissionEntries:[...(appStore.get().commissionEntries||[]),...entries],lastAction:`Importou ${entries.length} lançamentos da planilha`});notify(`${entries.length} lançamentos importados para a carteira.`, 'success');
    });
  }
  if(this.dataset.commissionHistoryBound)return;
  this.dataset.commissionHistoryBound='true';
  this.addEventListener('click',event=>{
    const trigger=event.target.closest?.('[data-commission-contract],[data-commission-open],[data-contract-return]');if(!trigger)return;
    if(trigger.dataset.commissionContract){event.stopImmediatePropagation();appStore.set({selectedCommissionContract:trigger.dataset.commissionContract,commissionContractReturn:appStore.get().selectedCommissionProfile||null,lastAction:`Abriu contrato ${trigger.dataset.commissionContract}`});}
    if(trigger.dataset.commissionOpen){event.stopImmediatePropagation();const deal=commissionDeals.find(item=>item.id===trigger.dataset.commissionOpen);if(deal)appStore.set({selectedCommissionContract:deal.id,commissionContractReturn:null,lastAction:`Abriu contrato ${deal.id}`});}
    if(trigger.hasAttribute('data-contract-return')){event.stopImmediatePropagation();appStore.set({selectedCommissionProfile:trigger.dataset.commissionReturn||null,selectedCommissionContract:null,commissionContractReturn:null,lastAction:'Voltou para a origem do lançamento'});}
  },true);
};

// Modelos criados pelo usuário são serializáveis e entram no mesmo catálogo
// dos relatórios oficiais, preservando a escolha no armazenamento local.
const reportsWithCustomModels=ViewLayer.prototype.reports;
ViewLayer.prototype.reports=function(){
  (appStore.get().customReports||[]).forEach(model=>{
    if(!reportCatalog.some(report=>report.id===model.id))reportCatalog.push(model);
  });
  return reportsWithCustomModels.call(this);
};

const viewLayerBindReportBuilder=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  viewLayerBindReportBuilder.call(this);
  const workspace=this.querySelector('.reports-workspace');if(!workspace)return;
  const state=appStore.get(),toolbar=workspace.querySelector('.reports-toolbar'),types=workspace.querySelector('.report-type-tabs');
  if(toolbar&&!toolbar.querySelector('[data-report-builder-open]'))toolbar.insertAdjacentHTML('beforeend',`<button type="button" class="report-toolbar-button" data-report-builder-open>${ico('plus')} Criar relatório</button>`);
  const saved=state.customReports||[];
  if(types&&saved.length&&!workspace.querySelector('.saved-report-options'))types.insertAdjacentHTML('afterend',`<section class="saved-report-options"><div><span class="activity-kind">MODELOS SALVOS</span><b>${saved.length} relatório${saved.length===1?'':'s'} criado${saved.length===1?'':'s'}</b></div>${saved.map(model=>`<button type="button" data-report-type-tab="${esc(model.id)}"><span>${ico('bookmark')} ${esc(model.label)}</span><small>${esc(model.family)} · ${esc(model.source)}</small></button>`).join('')}</section>`);
  if(state.reportBuilderOpen&&!workspace.querySelector('.report-builder')){
    const families=[...new Set(reportCatalog.map(report=>report.family))];
    toolbar?.insertAdjacentHTML('afterend',`<form class="report-builder" data-report-builder><header><div><span class="activity-kind">NOVO MODELO DE RELATÓRIO</span><h2>Defina a leitura administrativa</h2><p>Escolha a categoria, as fontes e os indicadores que formarão a nova opção da central.</p></div><button type="button" class="toolbar-action" data-report-builder-close>Fechar</button></header><div class="report-builder-grid"><label class="full">Nome do relatório<input required name="name" maxlength="72" placeholder="Ex.: Painel de custos de drenagem"></label><label>Família<select name="family">${families.map(family=>`<option>${esc(family)}</option>`).join('')}<option>Personalizado</option></select></label><label>Categoria de análise<select name="category"><option value="Financeiro">Financeira</option><option value="Construção">Obra e produção</option><option value="Suprimentos">Suprimentos</option><option value="Comercial">Comercial</option><option value="Governança">Governança</option></select></label><label>Período-base<select name="period"><option>Competência mensal</option><option>Trimestre</option><option>Acumulado do projeto</option><option>Data de corte</option></select></label><label>Agrupar por<select name="group"><option>Etapa</option><option>Responsável</option><option>Fornecedor</option><option>Centro de custo</option><option>Categoria</option></select></label><fieldset class="full"><legend>Fontes de dados</legend><label><input checked type="checkbox" name="source" value="Lançamentos"> Lançamentos</label><label><input type="checkbox" name="source" value="Orçamento"> Orçamento</label><label><input type="checkbox" name="source" value="Etapas"> Etapas</label><label><input type="checkbox" name="source" value="Registros"> Registros</label><label><input type="checkbox" name="source" value="Compras"> Compras</label><label><input type="checkbox" name="source" value="Leads"> Leads</label></fieldset><fieldset class="full"><legend>Indicadores e itens</legend><label><input checked type="checkbox" name="indicator" value="Orçado versus realizado"> Orçado versus realizado</label><label><input type="checkbox" name="indicator" value="Consumo do período"> Consumo do período</label><label><input type="checkbox" name="indicator" value="Avanço físico"> Avanço físico</label><label><input type="checkbox" name="indicator" value="Pendências e riscos"> Pendências e riscos</label><label><input type="checkbox" name="indicator" value="Responsáveis e prazos"> Responsáveis e prazos</label><label><input type="checkbox" name="indicator" value="Evidências vinculadas"> Evidências vinculadas</label></fieldset><label class="full">Descrição administrativa<textarea name="description" placeholder="Explique a pergunta que este relatório deve responder."></textarea></label></div><footer><small>O modelo fica salvo neste dispositivo e pode ser exportado como CSV ou impresso.</small><button class="report-toolbar-button" type="submit">${ico('save')} Salvar como opção de relatório</button></footer></form>`);
  }
  this.querySelector('[data-report-builder-open]')?.addEventListener('click',()=>appStore.set({reportBuilderOpen:true,lastAction:'Iniciou criação de relatório'}));
  this.querySelector('[data-report-builder-close]')?.addEventListener('click',()=>appStore.set({reportBuilderOpen:false,lastAction:'Fechou criação de relatório'}));
  this.querySelectorAll('.saved-report-options [data-report-type-tab]').forEach(button=>button.addEventListener('click',()=>{const model=reportCatalog.find(report=>report.id===button.dataset.reportTypeTab);if(model)appStore.set({reportFamily:model.family,reportType:model.id,lastAction:`Abriu relatório salvo ${model.label}`});}));
  this.querySelector('[data-report-builder]')?.addEventListener('submit',event=>{
    event.preventDefault();const form=new FormData(event.currentTarget),name=String(form.get('name')||'').trim();if(!name){notify('Informe o nome do novo relatório.','warning');return;}
    const category=String(form.get('category')||'Personalizado'),family=String(form.get('family')||category),sources=form.getAll('source').map(String),indicators=form.getAll('indicator').map(String),group=String(form.get('group')||'Etapa'),period=String(form.get('period')||'Competência mensal'),id=`custom-${Date.now().toString(36)}`;
    const source=sources.length?sources.join(' · '):'Fonte a definir',selectedIndicators=indicators.length?indicators:['Indicador a definir'];
    const model={id,family,category,label:name,icon:'file-chart-column',description:String(form.get('description')||`Leitura de ${category.toLocaleLowerCase()} por ${group.toLocaleLowerCase()}.`),source,metrics:[['Indicadores',String(selectedIndicators.length),'Itens configurados'],['Fontes',String(sources.length),source],['Agrupamento',group,period],['Situação','Configurado','Aguardando dados']],columns:[group,'Indicador','Fonte','Período','Situação'],rows:selectedIndicators.map(indicator=>[group,indicator,source,period,'Configurado'])};
    reportCatalog.push(model);appStore.set({customReports:[...(appStore.get().customReports||[]),model],reportFamily:family,reportType:id,reportBuilderOpen:false,lastAction:`Criou relatório ${name}`});notify(`Relatório “${name}” salvo como nova opção.`, 'success');
  });
};

// Os controles do CRM pertencem à lateral da página de Leads. A cena do mapa
// serve apenas ao loteamento: nunca reanexamos clientes ou filtros dentro dela.
const viewLayerBindLeadWidgets=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  viewLayerBindLeadWidgets.call(this);
  const page=this.querySelector('.leads-reference-page'),mapFrame=page?.querySelector('.leads-map-frame'),sidebar=this.querySelector('.leads-floating-sidebar');
  if(!page||!mapFrame||page.dataset.leadWidgetsMounted)return;
  page.dataset.leadWidgetsMounted='true';
  mapFrame.querySelectorAll('.lead-sidebar-widget').forEach(widget=>widget.remove());
  sidebar?.classList.add('leads-sidebar-ready');
  if(sidebar&&!sidebar.querySelector('.lead-conversation-widget')){
    const box=document.createElement('section');box.className='lead-conversation-widget lead-ops-window';
    box.innerHTML='<div class="lead-window-head"><div><span class="activity-kind">ATENDIMENTO ONLINE</span><h2>Olá! Como podemos ajudar?</h2></div><span class="lead-conversation-channel">online</span></div><div class="lead-welcome-message"><b>Bem-vindo ao Aliança Park.</b><p>Conte o que procura e nossa equipe vai ajudar a encontrar o lote ideal, informar valores e planejar sua reserva.</p></div><div class="lead-conversation-thread" data-lead-thread><p class="empty-data">Envie uma mensagem para iniciar o atendimento.</p></div><form class="lead-conversation-form" data-lead-conversation-form><input name="message" required placeholder="Ex.: Quero agendar uma visita ou reservar um lote"><select name="channel"><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="site">Site</option></select><button type="submit">Enviar</button></form>';
    sidebar.appendChild(box);
    const reservationFlow=document.createElement('public-reservation-flow');reservationFlow.className='sidebar-reservation-flow';sidebar.appendChild(reservationFlow);
    const prompt=document.createElement('section');prompt.className='lead-reservation-prompt';
    prompt.innerHTML=`<span>PRÓXIMO PASSO</span><b>Planeje sua visita e converse sobre a reserva.</b><small>Escolha um lote no mapa ou fale com nosso atendimento.</small><button type="button" data-lead-reservation-start>Quero agendar</button>`;
    sidebar.appendChild(prompt);
    prompt.querySelector('[data-lead-reservation-start]')?.addEventListener('click',()=>{const dialog=reservationFlow.querySelector('dialog');if(dialog&&!dialog.open)dialog.showModal();else if(!dialog)box.querySelector('input[name="message"]')?.focus();});
    const renderThread=()=>{const state=appStore.get(),lead=((state.publicLeads||[]).map(x=>x.name).includes('')?null:null);const key=`belavista.lead.thread.${state.selectedLead||0}`,items=JSON.parse(localStorage.getItem(key)||'[]'),thread=box.querySelector('[data-lead-thread]');thread.innerHTML=items.length?items.map(item=>`<div class="lead-message ${item.direction}"><small>${esc(item.channel)} · ${esc(item.at||'agora')}</small><p>${esc(item.body)}</p></div>`).join(''):'<p class="empty-data">Nenhuma mensagem registrada.</p>';thread.scrollTop=thread.scrollHeight;};
    box.querySelector('[data-lead-conversation-form]').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget,data=new FormData(form),body=String(data.get('message')||'').trim();if(!body)return;const state=appStore.get(),key=`belavista.lead.thread.${state.selectedLead||0}`,items=JSON.parse(localStorage.getItem(key)||'[]');items.push({body,channel:data.get('channel'),direction:'outbound',at:new Date().toLocaleString('pt-BR')});localStorage.setItem(key,JSON.stringify(items));form.reset();renderThread();notify('Mensagem registrada no atendimento.','success');appStore.set({lastAction:'Registrou mensagem no atendimento do lead'});});
    renderThread();
  }
};


const viewLayerBindOperationalIntelligence=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  viewLayerBindOperationalIntelligence.call(this);
  this.bindOperationalIntelligence?.();
};
ViewLayer.prototype.bindOperationalIntelligence=function(){
  const view=appStore.get().view;
  if(view==='stages'){
    const pane=this.querySelector('.stage-plan-pane[data-stage-pane="cronograma"]');
    if(pane&&!pane.dataset.ganttEnhanced){
      pane.dataset.ganttEnhanced='true';pane.style.setProperty('--gantt-day-width','28px');
      const header=pane.querySelector('header');
      header?.insertAdjacentHTML('afterend',`<div class="gantt-operational-tools"><span>${ico('milestone')} Gantt navegável + milestones</span><div><button type="button" data-gantt-zoom="-1">−</button><button type="button" data-gantt-today>Hoje</button><button type="button" data-gantt-zoom="1">＋</button></div></div>`);
      const labels=[['31','Medição'],['58','Liberação'],['82','Conclusão']];
      pane.querySelectorAll('.planning-gantt-track').forEach((track,index)=>labels.forEach(([left,label])=>track.insertAdjacentHTML('beforeend',`<span class="gantt-milestone" style="left:${left}%"><i></i>${index===0?`<b>${label}</b>`:''}</span>`)));
      pane.querySelectorAll('[data-gantt-zoom]').forEach(button=>button.addEventListener('click',()=>{const current=parseInt(pane.style.getPropertyValue('--gantt-day-width'))||28,next=Math.max(20,Math.min(52,current+Number(button.dataset.ganttZoom)*6));pane.style.setProperty('--gantt-day-width',`${next}px`);notify(`Escala do Gantt: ${next}px por dia.`);}));
      pane.querySelector('[data-gantt-today]')?.addEventListener('click',()=>{pane.scrollTo({left:Math.max(0,pane.scrollWidth*.28),behavior:'smooth'});notify('Cronograma centralizado na janela atual.');});
    }
  }
  if(view==='pert'){
    this.querySelectorAll('[data-pert-node]').forEach(button=>button.addEventListener('click',()=>appStore.set({selectedPertNode:button.dataset.pertNode,lastAction:`Selecionou nó PERT ${button.textContent.trim()}`})));
    this.querySelector('[data-pert-complete]')?.addEventListener('click',buttonEvent=>{const id=buttonEvent.currentTarget.dataset.pertComplete,overrides={...(appStore.get().pertOverrides||{}),[id]:{...(appStore.get().pertOverrides?.[id]||{}),progress:100}};appStore.set({pertOverrides:overrides,selectedPertNode:id,lastAction:`Concluiu nó PERT ${id}`});notify('Atividade concluída. Dependências reavaliadas e próximas ações liberadas.','success');});
  }
  if(view==='actions'){
    const matrix=this.querySelector('[data-action-matrix]');
    this.querySelectorAll('[data-ai-action]').forEach(point=>{
      point.addEventListener('click',event=>{if(point.dataset.dragged==='true'){delete point.dataset.dragged;return;}appStore.set({selectedAiAction:point.dataset.aiAction,lastAction:`Selecionou ação IA ${point.textContent.trim()}`});});
      point.addEventListener('pointerdown',event=>{if(event.button!==0||!matrix)return;event.preventDefault();event.stopPropagation();const id=point.dataset.aiAction;let moved=false;point.setPointerCapture?.(event.pointerId);const move=ev=>{const rect=matrix.getBoundingClientRect(),readiness=Math.max(4,Math.min(96,Math.round((ev.clientX-rect.left)/rect.width*100))),impact=Math.max(4,Math.min(96,Math.round((rect.bottom-ev.clientY)/rect.height*100)));point.style.left=`${readiness}%`;point.style.bottom=`${impact}%`;point.dataset.nextReadiness=readiness;point.dataset.nextImpact=impact;moved=true;};const up=()=>{point.releasePointerCapture?.(event.pointerId);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(!moved)return;point.dataset.dragged='true';const actions=operationalActions().map(item=>item.id===id?{...item,readiness:Number(point.dataset.nextReadiness),impact:Number(point.dataset.nextImpact)}:item);appStore.set({aiActions:actions,selectedAiAction:id,lastAction:`Reposicionou ação ${id} na matriz`});notify('Impacto e prontidão recalculados para a ação.','success');};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});});
    });
    this.querySelector('[data-ai-advance]')?.addEventListener('click',event=>{const id=event.currentTarget.dataset.aiAdvance,actions=operationalActions().map(item=>item.id===id?{...item,phase:Math.min(4,item.phase+1),readiness:Math.min(100,item.readiness+8),blocker:item.phase>=2?'Sem bloqueios críticos':'Pré-condição atualizada pela IA'}:item);appStore.set({aiActions:actions,selectedAiAction:id,lastAction:`Adiantou atitude ${id}`});notify('Ação avançou uma etapa na caminhada de adiantamento.','success');});
    this.querySelector('[data-ai-open-chat]')?.addEventListener('click',event=>{const action=operationalActions().find(item=>item.id===event.currentTarget.dataset.aiOpenChat);const chat=document.querySelector('ai-chat');if(action&&chat?.respond){chat.classList.remove('collapsed');chat.respond(`Prepare o próximo passo operacional para: ${action.label}. Considere o bloqueio: ${action.blocker}.`);notify('Contexto da ação enviado para a IA.','success');}else notify('Ação preparada para o chat da IA.','success');});
  }
  if(view==='raci'){
    const cycleCell=key=>{const [taskId,actorId]=key.split(':'),assignments=structuredClone(appStore.get().raciAssignments||defaultRaci()),order=['R','A','C','I','—'],current=assignments?.[taskId]?.[actorId]||'—',next=order[(order.indexOf(current)+1)%order.length];assignments[taskId]??={};if(next==='—')delete assignments[taskId][actorId];else assignments[taskId][actorId]=next;appStore.set({raciAssignments:assignments,selectedRaciCell:key,lastAction:`Alterou RACI ${taskId}/${actorId} para ${next}`});notify(`Papel RACI alterado para ${next}.`,'success');};
    this.querySelectorAll('[data-raci-cell]').forEach(cell=>{cell.addEventListener('click',()=>appStore.set({selectedRaciCell:cell.dataset.raciCell,lastAction:`Selecionou vínculo RACI ${cell.dataset.raciCell}`}));cell.addEventListener('dblclick',event=>{event.preventDefault();cycleCell(cell.dataset.raciCell);});});
    this.querySelector('[data-raci-cycle]')?.addEventListener('click',event=>cycleCell(event.currentTarget.dataset.raciCycle));
  }
  if(view==='raid'){
    let draggingId='';
    this.querySelectorAll('[data-raid-card]').forEach(card=>{card.addEventListener('click',()=>appStore.set({selectedRaidItem:card.dataset.raidCard,lastAction:`Selecionou pendência ${card.dataset.raidCard}`}));card.addEventListener('dragstart',event=>{draggingId=card.dataset.raidCard;event.dataTransfer?.setData('text/plain',draggingId);card.classList.add('dragging');});card.addEventListener('dragend',()=>card.classList.remove('dragging'));});
    const getId=event=>event.dataTransfer?.getData('text/plain')||draggingId;
    this.querySelectorAll('[data-raid-zone]').forEach(zone=>{zone.addEventListener('dragover',event=>{event.preventDefault();zone.classList.add('drag-over');});zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));zone.addEventListener('drop',event=>{event.preventDefault();zone.classList.remove('drag-over');const id=getId(event),items=operationalRaid().map(item=>item.id===id?{...item,kind:zone.dataset.raidZone}:item);appStore.set({raidItems:items,selectedRaidItem:id,lastAction:`Moveu ${id} para ${zone.dataset.raidZone}`});notify('Item RAID movido para a nova zona.','success');});});
    this.querySelectorAll('[data-raid-target]').forEach(target=>{target.addEventListener('dragover',event=>{event.preventDefault();target.classList.add('drag-over');});target.addEventListener('dragleave',()=>target.classList.remove('drag-over'));target.addEventListener('drop',event=>{event.preventDefault();target.classList.remove('drag-over');const id=getId(event),linked=target.dataset.raidTarget,items=operationalRaid().map(item=>item.id===id?{...item,linked}:item);appStore.set({raidItems:items,selectedRaidItem:id,lastAction:`Vinculou ${id} a ${linked}`});notify(`Pendência vinculada a ${linked}.`,'success');});});
    this.querySelectorAll('[data-raid-add]').forEach(button=>button.addEventListener('click',()=>{const title=prompt('Título da nova pendência:');if(!title?.trim())return;const detail=prompt('Descrição / condição observada:')||'Sem descrição adicional.',item={id:`RAID-${Date.now().toString(36).toUpperCase()}`,kind:button.dataset.raidAdd,title:title.trim(),detail:detail.trim(),level:'médio',linked:extensionStage().name};appStore.set({raidItems:[...operationalRaid(),item],selectedRaidItem:item.id,lastAction:`Criou item RAID ${item.title}`});notify('Nova pendência adicionada ao RAID.','success');}));
  }
};

if(!customElements.get('view-layer')) customElements.define('view-layer', ViewLayer);

export {ico, esc};


// BELAVISTA_COMMERCIAL_PAGES_V7
ViewLayer.prototype.brokers=function(){
  const deals=[...commissionDeals,...(appStore.get().commissionEntries||[])];
  const statusFor=person=>{
    const owned=deals.filter(item=>item.profile===person.id);
    if(owned.some(item=>item.status==='Proposta'||item.status==='Em análise'))return ['Em negociação','attention'];
    if(owned.some(item=>item.status==='Reserva'))return ['Acompanhamento','info'];
    return ['Ativo','success'];
  };
  queueMicrotask(()=>this.bindCommercialPagesV7?.());
    const period=appStore.get().reportPeriod||'monthly';
    const periodLabels={monthly:'Mensal',annual:'Anual',cumulative:'Acumulado'},periodLabel=periodLabels[period]||periodLabels.monthly;
    return `<section class="v7-brokers-page"><header class="v7-page-head"><div><span class="activity-kind">GESTÃO COMERCIAL</span><h1>Corretores</h1><p>Listagem operacional de situação, carteira, contatos e vínculos comerciais.</p></div><button type="button" class="toolbar-primary" data-v7-brokers-export>${ico('download')} Exportar planilha</button></header><nav class="v7-period-tabs" aria-label="Período dos repasses">${Object.entries(periodLabels).map(([id,label])=>`<button type="button" class="${period===id?'active':''}" data-v7-period="${id}">${label}</button>`).join('')}</nav><div class="v7-page-kpis"><article><small>Corretores ativos</small><b>${commissionProfiles.length}</b><span>carteiras acompanhadas</span></article><article><small>Negócios vinculados</small><b>${deals.length}</b><span>${periodLabel}</span></article><article><small>Vendas informadas</small><b>${commissionProfiles.reduce((sum,p)=>sum+p.sales,0)}</b><span>ciclo demonstrativo</span></article><article><small>Comissão acumulada</small><b>${formatBRL(deals.reduce((sum,item)=>sum+brlToNumber(item.commission),0))}</b><span>lançamentos visíveis</span></article></div><section class="v7-sheet"><header><div><span class="activity-kind">SITUAÇÃO DA EQUIPE · ${periodLabel.toUpperCase()}</span><h2>Carteiras e disponibilidade</h2></div><label>Buscar<input data-v7-broker-search placeholder="Nome, CRECI, lote..."></label></header><div class="v7-broker-table-wrap"><table><thead><tr><th>Corretor</th><th>CRECI</th><th>Situação</th><th>Carteira</th><th>Conversão</th><th>Lotes</th><th>Contato</th></tr></thead><tbody>${commissionProfiles.map(person=>{const [status,tone]=statusFor(person);return `<tr data-v7-broker-row data-search="${esc((person.name+' '+person.creci+' '+person.lots.join(' ')).toLowerCase())}"><td><span class="v7-person-cell"><i class="commission-avatar" style="background:${person.avatar}">${person.initials}</i><span><b>${esc(person.name)}</b><small>${esc(person.role)}</small></span></span></td><td>${esc(person.creci)}</td><td><span class="v7-status ${tone}">${status}</span></td><td><b>${person.sales} vendas</b><small>${esc(person.commission)}</small></td><td>${esc(person.conversion)}</td><td>${person.lots.map(lot=>`<em>${esc(lot)}</em>`).join(' ')}</td><td><div class="v7-row-actions"><a href="https://wa.me/${esc(person.phone)}" target="_blank" rel="noopener">${ico('message-circle')} WhatsApp</a><button type="button" data-v7-open-broker="${esc(person.id)}">Carteira</button></div></td></tr>`;}).join('')}</tbody></table></div></section></section>`;
};

ViewLayer.prototype.finance=function(){
  const financial=reportCatalog.filter(report=>report.family==='Financeiro');
  const selected=financial.find(report=>report.id===appStore.get().reportType)||financial[0];
  const moneyRows=selected?.rows||[];
  queueMicrotask(()=>this.bindCommercialPagesV7?.());
  return `<section class="v7-finance-page"><header class="v7-page-head"><div><span class="activity-kind">GESTÃO FINANCEIRA</span><h1>Balanços e planilhas</h1><p>Leitura consolidada de orçamento, caixa, realizado, compromissos e projeções.</p></div><button type="button" class="toolbar-primary" data-v7-finance-export>${ico('download')} Exportar planilha</button></header><nav class="v7-fin-tabs">${financial.map(report=>`<button type="button" class="${report.id===selected?.id?'active':''}" data-v7-fin-report="${esc(report.id)}">${ico(report.icon||'file-spreadsheet')}<span>${esc(report.label)}</span></button>`).join('')}</nav>${selected?`<div class="v7-page-kpis">${selected.metrics.map(([label,value,sub])=>`<article><small>${esc(label)}</small><b>${esc(value)}</b><span>${esc(sub)}</span></article>`).join('')}</div><section class="v7-sheet"><header><div><span class="activity-kind">${esc(selected.family)}</span><h2>${esc(selected.label)}</h2><p>${esc(selected.description)}</p></div><small>${esc(selected.source||'')}</small></header><div class="v7-fin-table-wrap"><table><thead><tr>${selected.columns.map(col=>`<th>${esc(col)}</th>`).join('')}</tr></thead><tbody>${moneyRows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`:'<div class="empty-data">Nenhuma planilha financeira disponível.</div>'}</section>`;
};

ViewLayer.prototype.bindCommercialPagesV7=function(){
  const root=this.querySelector('.v7-brokers-page,.v7-finance-page');if(!root||root.dataset.v7Bound)return;root.dataset.v7Bound='1';
  root.querySelector('[data-v7-broker-search]')?.addEventListener('input',event=>{const q=event.target.value.toLowerCase();root.querySelectorAll('[data-v7-broker-row]').forEach(row=>row.hidden=!row.dataset.search.includes(q));});
  root.querySelectorAll('[data-v7-open-broker]').forEach(button=>button.addEventListener('click',()=>appStore.set({view:'commissions',selectedCommissionProfile:button.dataset.v7OpenBroker,selectedCommissionContract:null,lastAction:'Abriu carteira do corretor'})));
  root.querySelectorAll('[data-v7-fin-report]').forEach(button=>button.addEventListener('click',()=>appStore.set({view:'finance',reportFamily:'Financeiro',reportType:button.dataset.v7FinReport,lastAction:'Abriu planilha financeira'})));
  root.querySelectorAll('[data-v7-period]').forEach(button=>button.addEventListener('click',()=>appStore.set({reportPeriod:button.dataset.v7Period,lastAction:`Alterou período para ${button.textContent.trim()}`})));
  root.querySelector('[data-v7-brokers-export]')?.addEventListener('click',()=>downloadCsv('corretores.csv',['Corretor','CRECI','Vendas','Comissão','Conversão','Lotes'],commissionProfiles.map(p=>[p.name,p.creci,p.sales,p.commission,p.conversion,p.lots.join(' | ')])));
  root.querySelector('[data-v7-finance-export]')?.addEventListener('click',()=>{const report=reportCatalog.find(r=>r.id===appStore.get().reportType)||reportCatalog.find(r=>r.family==='Financeiro');if(report)downloadCsv(`${report.id}.csv`,report.columns,report.rows);});
  window.lucide?.createIcons();
};

// Diário seguro: a tela de entrada não monta catálogos, filtros e imagens em
// lote. Esses detalhes permanecem acessíveis ao editar um registro, mas a
// navegação sempre chega primeiro a uma lista leve e responsiva.
ViewLayer.prototype.records=function(){
  const state=appStore.get();
  const records=Array.isArray(state.records)?state.records:[];
  const rows=records.slice().reverse().slice(0,250).map(record=>`<article class="record-card"><div class="record-main"><span class="record-id">${esc(record.id||'REGISTRO')}</span><strong>${esc(record.atividade||'Atividade operacional')}</strong><small>${esc(record.data||'Sem data')} · ${esc(record.hora||'')} · ${esc(record.responsavel||'A definir')}</small><small>${esc(record.detalhes||'Sem detalhe informado')}</small></div><span class="record-status">${esc(record.status||'Pendente')}</span></article>`).join('');
  return `<div class="records-page"><div class="records-shell"><div class="records-head"><div><span class="activity-kind">HISTÓRICO OPERACIONAL</span><h1>Registros</h1><p>Consulta completa dos apontamentos, medições e evidências já registrados.</p></div></div><section class="records-list records-history"><div class="records-list-head"><b>${records.length} registros no histórico</b><small>ordem do mais recente para o mais antigo</small></div>${rows||'<div class="empty-records">Nenhum registro cadastrado.</div>'}</section></div></div>`;
};

// Painel inicial reduzido: entrega a leitura físico-financeira sem montar
// widgets 3D e espelhos de mapa durante cada transição da SPA.
ViewLayer.prototype.assistant=function(){
  const stages=demoData.activities||[];
  const cash=(appStore.get().cashFlowLocal||[]).reduce((sum,item)=>sum+Number(item.amount||0),0);
  return `<section class="dashboard-home safe-dashboard"><header class="dashboard-head"><div><span class="activity-kind">CONTROLE DE OBRA</span><h1>Panorama operacional</h1><p>Caixa, prioridades e andamento das etapas.</p></div></header><div class="v7-page-kpis"><article><small>Caixa registrado</small><b>${formatBRL(cash)}</b><span>alteração exclusiva do administrador</span></article><article><small>Etapas acompanhadas</small><b>${stages.length}</b><span>cronograma em prioridade</span></article><article><small>Rede de água</small><b>298 lotes</b><span>antes da pavimentação</span></article><article><small>Rede elétrica</small><b>Por último</b><span>prazo Coelba monitorado</span></article></div><section class="quick-record-widget"><header><div><span class="activity-kind">NOVO APONTAMENTO</span><h2>Registrar andamento</h2><p>Preencha os widgets na sequência. O item aparecerá no histórico do Diário.</p></div><button type="button" data-view="records">Ver histórico</button></header><form class="record-form quick-record-form"><section><span>1</span><label>Atividade<select name="atividade"><option>Terraplanagem</option><option>Drenagem Pluvial</option><option>Rede de Água</option><option>Meio-fio</option><option>Rede Elétrica</option><option>Pavimentação</option></select></label><label>Responsável<input name="responsavel" required placeholder="Encarregado ou equipe"></label></section><section><span>2</span><label>Data<input name="data" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Hora<input name="hora" type="time" value="08:30"></label><label>Status<select name="status"><option>Pendente</option><option>Concluído</option></select></label></section><section><span>3</span><label>Registro / medição<textarea name="detalhes" required placeholder="Quantidade produzida, viagem interna, material, ocorrência ou comprovante"></textarea></label><input type="hidden" name="obra" value="Aliança Park"></section><footer><small>O sistema vincula este fato ao acompanhamento físico-financeiro.</small><button class="record-confirm" type="submit">Confirmar registro</button></footer></form></section><section class="v7-sheet"><header><div><span class="activity-kind">ANDAMENTO DAS FRENTES</span><h2>Etapas da construção</h2></div></header><div class="records-list">${stages.map(stage=>`<article class="record-card"><div class="record-main"><strong>${esc(stage.name)}</strong><small>${esc(stage.owner||'Responsável a definir')} · ${esc(stage.week||'Cronograma')}</small></div><span class="record-status">${Number(stage.progress)||0}%</span><button type="button" data-view="stages">Abrir</button></article>`).join('')}</div></section></section>`;
};

ViewLayer.prototype.assistant=function(){
  const widgets=[['control','table-properties','Central'],['stages','workflow','Etapas'],['records','clipboard-pen-line','Diário'],['leads','users-round','Leads'],['brokers','users-round','Corretores'],['finance','wallet-cards','Financeiro'],['reports','chart-no-axes-combined','Relatórios'],['settings','settings','Ajustes']];
  return `<section class="dashboard-home interface-dashboard"><header class="dashboard-head"><div><span class="activity-kind">PAINEL OPERACIONAL</span><h1>Dashboard inicial</h1><p>Escolha uma interface para acompanhar e registrar a operação.</p></div></header><nav class="carbon-widget-bar" aria-label="Interfaces do sistema">${widgets.map(([view,icon,label])=>`<button type="button" data-view="${view}">${ico(icon)}<span>${label}</span></button>`).join('')}</nav></section>`;
};

// BELAVISTA_ADMIN_PUBLIC_MAP_VIEW_V5352
ViewLayer.prototype.map=function(){
  const filter=appStore.get().mapFilter||'execution',
        status=highlightStatus[filter]||highlightStatus.execution;
  return `<section class="admin-public-map-interface-v5352" aria-label="Camada operacional sobre o mapa compartilhado">
    <aside class="admin-public-map-status-v5352" data-highlight-status="${esc(filter)}" aria-live="polite">
      <span>${esc(status.eyebrow)}</span>
      <header><div><h2>${esc(status.title)}</h2><small>${esc(status.status)}</small></div><b>${status.progress}%</b></header>
      <i><em style="width:${status.progress}%"></em></i>
      <p>${esc(status.detail)}</p>
      <footer><small>${esc(status.priority)}</small><button type="button" data-view="${status.view}">Abrir contexto</button></footer>
    </aside>
    <map-filter-rail></map-filter-rail>
  </section>`;
};

// Caixa mestre e etapa contextual: um único widget conserva a relação entre
// disponibilidade financeira, dependências, materiais e execução da obra.
export class StageCashDashboard extends HTMLElement{
  connectedCallback(){this.render();}
  render(){
    const state=appStore.get(),stages=executionModel.stages||[],index=Math.max(0,Math.min(stages.length-1,Number(state.dashboardStagePage)||0)),stage=stages[index]||stages[0];
    const summary=state.cashSummary||{},operational=state.operationalState||{},computed=operational.stages?.find(item=>item.key===stage.key),balanceCents=Number(operational.cash?.balanceCents??summary.balanceCents)||0,balance=balanceCents/100,need=Number(computed?.needCents??280000000*Number(stage.cashWeight||0))/100,allocation=Number(computed?.allocatedCents||0)/100,coverage=Number(computed?.coverage)||0;
    const live=demoData.activities.find(item=>stageOverlayKey(item.name)===stageOverlayKey(stage.name)),materials=(stage.materials||[]).slice(0,3),blocked=computed?.blockedBy||(stage.dependsOn||[]).filter(key=>{const dependency=stages.find(item=>item.key===key),progress=demoData.activities.find(item=>stageOverlayKey(item.name)===stageOverlayKey(dependency?.name))?.progress||0;return progress<100;});
    const whatsapp=(()=>{try{return JSON.parse(localStorage.getItem('belavista.integrations.v1')||'{}').whatsappNumber||'';}catch{return '';}})();
    this.innerHTML=`<section class="master-cash-card"><header><div><span>CAIXA MESTRE · DONO</span><strong>${formatBRL(balance)}</strong></div><i>${balanceCents>=0?'disponível':'déficit'}</i></header><small>Reserva ${formatBRL(Number(operational.cash?.reserveCents||0)/100)} · Alocável ${formatBRL(Number(operational.cash?.allocatableCents||0)/100)}</small></section><section class="stage-sequence-card"><nav class="stage-widget-pagination" aria-label="Paginação das etapas"><button type="button" data-stage-page="${Math.max(0,index-1)}" aria-label="Etapa anterior">${ico('chevron-left')}</button><div><span>ETAPA ${String(index+1).padStart(2,'0')} / ${String(stages.length).padStart(2,'0')}</span><b>${esc(stage.name)}</b></div><button type="button" data-stage-page="${Math.min(stages.length-1,index+1)}" aria-label="Próxima etapa">${ico('chevron-right')}</button></nav><div class="stage-sequence-progress"><span>Andamento comprovado <b>${Number(computed?.progress??live?.progress)||0}%</b></span><i><em style="width:${Number(computed?.progress??live?.progress)||0}%"></em></i></div><div class="stage-cash-allocation"><div><small>Necessidade restante</small><b>${formatBRL(need)}</b></div><div><small>Caixa alocado agora</small><b>${formatBRL(allocation)}</b></div><span class="${coverage<35?'critical':'attention'}">${coverage}% de cobertura</span></div><div class="stage-urgency"><span>${blocked.length?'DEPENDÊNCIAS BLOQUEANDO':'FRENTE LIBERADA PARA PRIORIZAÇÃO'}</span><p>${blocked.length?`Aguardar: ${blocked.map(key=>stages.find(item=>item.key===key)?.name||key).join(', ')}.`:`Alocação sequencial calculada na versão ${operational.calibrationVersion||1}, prioridade ${stage.priority}/100.`}</p></div><div class="stage-material-urgency"><small>MATERIAIS / REQUISITOS</small>${materials.map(item=>`<span>${ico('package-search')} ${esc(item)}</span>`).join('')}</div><footer><span>${ico('bell-ring')} ${(state.operationalNotifications||[]).length} notificações para o perfil</span><button type="button" data-stage-whatsapp ${whatsapp?'':'disabled'}>${ico('message-circle')} ${whatsapp?'Enviar WhatsApp':'Configurar WhatsApp'}</button></footer></section>`;
    this.querySelectorAll('[data-stage-page]').forEach(button=>button.addEventListener('click',()=>appStore.set({dashboardStagePage:Number(button.dataset.stagePage),lastAction:`Visualizou etapa ${stages[Number(button.dataset.stagePage)]?.name||''} no dashboard`})));
    this.querySelector('[data-stage-whatsapp]')?.addEventListener('click',()=>{if(!whatsapp){appStore.set({view:'settings',lastAction:'Abriu configuração do WhatsApp'});return;}const message=`Aliança Park · ${stage.name}: caixa disponível ${formatBRL(balance)}, cobertura sugerida ${coverage}%, avanço ${Number(live?.progress)||0}%. Materiais prioritários: ${materials.join(', ')}.`;window.open(`https://wa.me/${String(whatsapp).replace(/\D/g,'')}?text=${encodeURIComponent(message)}`,'_blank','noopener');});
    window.lucide?.createIcons();
  }
}
if(!customElements.get('stage-cash-dashboard'))customElements.define('stage-cash-dashboard',StageCashDashboard);

// A página de Leads mantém a experiência pública no topo e passa a oferecer
// a visão longa de CRM abaixo do mapa, com origem limitada ao site nesta fase.
const leadsPublicAndMapTemplate=ViewLayer.prototype.leads;
ViewLayer.prototype.leads=function(){
  const state=appStore.get(),reservations=state.publicReservations||[],websiteLeads=state.publicLeads||[];
  const cards=[...reservations.map(item=>({id:item.id,name:item.client||'Cliente em análise',status:item.status||'Documentos em análise',lot:item.lot||'A definir',phone:item.clientPhone||'Não informado',email:'Cadastro documental',last:item.notes||'Documentos enviados para conferência',files:item.files||[],createdAt:item.createdAt,source:'Site · Reserva'})),...websiteLeads.map(item=>({id:item.id,name:item.name||'Novo lead',status:item.status||'Novo',lot:item.lot||'A definir',phone:item.whatsapp||'Não informado',email:item.email||'Não informado',last:item.conversation||item.notes||'Intenção registrada no site',files:[],createdAt:item.createdAt,source:'Site · Atendimento'}))];
  if(!cards.length)cards.push(...demoData.leads.slice(0,4).map((item,index)=>({id:`DEMO-${index+1}`,name:item.name,status:item.status,lot:item.lot,phone:'Contato pendente',email:'Cadastro inicial',last:`Objetivo informado: ${item.objective}`,files:[],source:'Site · Demonstração'})));
  const board=`<section class="leads-crm-board"><header><div><span class="activity-kind">CRM · LEADS VINDOS DO SITE</span><h2>Atendimentos e reservas</h2><p>Negociação, última interação, dados cadastrais e anexos em uma grade operacional.</p></div><div class="crm-channel-state"><span class="active">Site ativo</span><span>WhatsApp preparado</span><span>Instagram preparado</span></div></header><div class="lead-card-grid">${cards.map(card=>`<article class="lead-crm-card"><div class="lead-card-top"><span>${esc(card.source)}</span><em>${esc(card.status)}</em></div><h3>${esc(card.name)}</h3><b>${esc(card.lot)}</b><dl><div><dt>Contato</dt><dd>${esc(card.phone)}</dd></div><div><dt>E-mail / cadastro</dt><dd>${esc(card.email)}</dd></div><div><dt>Último passo</dt><dd>${esc(card.last)}</dd></div></dl><div class="lead-document-list"><small>ANEXOS DE DOCUMENTO</small>${card.files.length?card.files.map(file=>`<a href="${esc(file.fileUrl||'#')}" target="_blank" rel="noopener">${ico('paperclip')} ${esc(file.kind||file.fileName||'Documento')}</a>`).join(''):'<span>Nenhum documento anexado</span>'}</div><footer><small>${card.createdAt?new Date(card.createdAt).toLocaleString('pt-BR'):'Aguardando interação'}</small><button type="button" data-lead-card="${esc(card.id)}">Abrir atendimento</button></footer></article>`).join('')}</div></section>`;
  return leadsPublicAndMapTemplate.call(this).replace('</main><aside class="leads-floating-sidebar"',`${board}</main><aside class="leads-floating-sidebar"`);
};

const settingsAuditTemplate=ViewLayer.prototype.settings;
ViewLayer.prototype.settings=function(){
  const state=appStore.get(),actor=state.currentActor||{role:'owner',label:'Dono'},calibration=state.systemCalibration,config=calibration?.config||{},stages=config.stages||[];
  const saved={...(readIntegrationSettings()||{}),...(state.integrationSettings||{})};
  const governance=`<section class="operational-governance"><header><div><span class="activity-kind">AUTORIDADE, CIÊNCIA E PROPAGAÇÃO</span><h2>Governança do agente</h2><p>Cloudflare concentra a lógica operacional; o Firebase só espelha mudanças em tempo real para avisar os apps das pontas.</p></div><button type="button" data-register-device>${ico('bell-ring')} Ativar neste dispositivo</button></header><div class="role-governance-grid"><article class="${['owner','developer'].includes(actor.role)?'current':''}"><span>DONO</span><b>Fluxo de caixa</b><p>Cria entradas, saídas, ajustes e estornos. Também pode registrar fatos.</p></article><article class="${['admin','developer'].includes(actor.role)?'current':''}"><span>ADMINISTRADOR</span><b>Calibrações do sistema</b><p>Define reserva, prioridade, orçamento e relações. Também pode registrar fatos.</p></article><article class="${['foreman','developer'].includes(actor.role)?'current':''}"><span>ENCARREGADO</span><b>Registros de campo</b><p>Confirma produção, serviço, evidência e completude; não altera caixa nem regra.</p></article></div><small data-device-status>Perfil atual: ${esc(actor.label||actor.role)} · O canal em tempo real usa Firebase Realtime Database; a automação e a decisão continuam na camada operacional.</small></section>`;
  const calibrationPanel=`<section class="calibration-settings"><header><div><span class="activity-kind">CALIBRAÇÃO OPERACIONAL · VERSÃO ${calibration?.version||'—'}</span><h2>Relações que governam a distribuição do caixa</h2><p>Somente Administrador salva. Dono e Encarregado têm leitura integral da regra.</p></div><span>Atualizado por ${esc(calibration?.updatedBy||'bootstrap')}</span></header><form data-calibration-form><div class="calibration-master"><label>Reserva mínima (R$)<input name="reserve" inputmode="decimal" value="${esc(Number(config.reserveCents||0)/100)}" ${['admin','developer'].includes(actor.role)?'':'disabled'}></label><label>Dependência concluída em (%)<input name="dependencyProgress" type="number" min="1" max="100" value="${esc(config.dependencyProgress||100)}" ${['admin','developer'].includes(actor.role)?'':'disabled'}></label><label>Intervalo entre alertas (min)<input name="notificationCooldownMinutes" type="number" min="5" max="10080" value="${esc(config.notificationCooldownMinutes||240)}" ${['admin','developer'].includes(actor.role)?'':'disabled'}></label></div><div class="calibration-stage-list">${stages.map((stage,index)=>`<article data-calibration-stage="${esc(stage.key)}"><span>${String(index+1).padStart(2,'0')}</span><div><b>${esc(stage.name)}</b><small>Depende de ${(stage.dependsOn||[]).join(', ')||'nenhuma etapa'}</small></div><label>Orçamento (R$)<input name="budgetCents" inputmode="decimal" value="${esc(Number(stage.budgetCents||0)/100)}" ${['admin','developer'].includes(actor.role)?'':'disabled'}></label><label>Prioridade<input name="priority" type="number" min="0" max="100" value="${esc(stage.priority||0)}" ${['admin','developer'].includes(actor.role)?'':'disabled'}></label><input type="hidden" name="dependsOn" value="${esc((stage.dependsOn||[]).join(','))}"></article>`).join('')||'<p>Carregando calibrações do servidor…</p>'}</div><footer><span data-calibration-status>${['admin','developer'].includes(actor.role)?'Cada versão fica registrada na auditoria.':'Seu perfil possui acesso somente para leitura.'}</span><button type="submit" ${['admin','developer'].includes(actor.role)?'':'disabled'}>${ico('save')} Salvar nova versão</button></footer></form></section>`;
  const integrations=`<section class="integration-settings"><header><div><span class="activity-kind">ATENDIMENTO, PIX E NOTIFICAÇÕES</span><h2>Integrações operacionais</h2><p>O desktop e as páginas publicadas funcionam como clientes. A automação vive no Cloudflare Worker; o Firebase só entrega mudanças em tempo real.</p></div><div class="integration-status-list"><span class="active">Cloudflare · cliente</span><span>Firebase Realtime · escuta</span><span>WhatsApp · preparado</span></div></header><form data-integration-form><fieldset><legend>Camada operacional</legend><label>Base pública da API<input name="apiBase" value="${esc(saved.apiBase||'')}" placeholder="https://seu-worker.workers.dev"></label><label>Base pública dos uploads do Worker<input name="workerPublicBaseUrl" value="${esc(saved.workerPublicBaseUrl||'')}" placeholder="https://seu-worker.workers.dev"></label><label>Chave pública VAPID<input name="firebaseMessagingVapidKey" value="${esc(saved.firebaseMessagingVapidKey||'')}" placeholder="Para push opcional do Firebase"></label></fieldset><fieldset><legend>Destinos e realtime</legend><label>UID do canal Dono<input name="ownerNotificationUid" value="${esc(saved.ownerNotificationUid||'')}" placeholder="owner-root"></label><label>UID do canal Administrador<input name="adminNotificationUid" value="${esc(saved.adminNotificationUid||'')}" placeholder="admin-ops"></label><label>UID do canal Encarregado<input name="foremanNotificationUid" value="${esc(saved.foremanNotificationUid||'')}" placeholder="foreman-front-1"></label><label>Áreas extras de chegada<textarea name="notificationAreas" rows="2" placeholder="desktop-supplies, rtdb/commercial, mobile-foreman">${esc(saved.notificationAreas||'')}</textarea></label></fieldset><fieldset><legend>Segredos do Worker · somente nomes</legend><label>Nome do segredo NVIDIA<input name="workerSecretNvidiaApiKey" value="${esc(saved.workerSecretNvidiaApiKey||'NVIDIA_API_KEY')}" placeholder="NVIDIA_API_KEY"></label><label>Nome do segredo Firebase RTDB<input name="workerSecretFirebaseDatabaseUrl" value="${esc(saved.workerSecretFirebaseDatabaseUrl||'FIREBASE_DATABASE_URL')}" placeholder="FIREBASE_DATABASE_URL"></label><label>Nome do segredo Service Account<input name="workerSecretFirebaseServiceAccountJson" value="${esc(saved.workerSecretFirebaseServiceAccountJson||'FIREBASE_SERVICE_ACCOUNT_JSON')}" placeholder="FIREBASE_SERVICE_ACCOUNT_JSON"></label><div class="worker-secret-fixed-v5364"><span>PAT GitHub</span><b>GITHUB_PAT · configurado no Worker</b><small>O valor do PAT não é inserido no navegador.</small></div></fieldset><fieldset><legend>Propagação para GitHub</legend><label>Repositório<input name="githubRepo" value="${esc(saved.githubRepo||saved.repo||'')}" placeholder="usuario/belavista-ai-monitor"></label><label>Branch de propagação<input name="githubBranch" value="${esc(saved.githubBranch||'main')}" placeholder="main"></label><label>Workflow / hook de deploy<input name="githubWorkflow" value="${esc(saved.githubWorkflow||'')}" placeholder="deploy-belavista"></label></fieldset><fieldset><legend>WhatsApp operacional</legend><label>Número para notificações<input name="whatsappNumber" value="${esc(saved.whatsappNumber||'')}" placeholder="5571999999999"></label><label>Webhook do serviço operacional<input name="whatsappWebhook" value="${esc(saved.whatsappWebhook||'')}" placeholder="https://servico.externo/webhook"></label><label class="check"><input type="checkbox" name="autoNotify" ${saved.autoNotify?'checked':''}> Enfileirar alertas de caixa e materiais</label></fieldset><fieldset><legend>Instagram · preparação</legend><label>Conta / identificador<input name="instagramAccount" value="${esc(saved.instagramAccount||'')}" placeholder="@aliancapark"></label><label>Webhook do serviço operacional<input name="instagramWebhook" value="${esc(saved.instagramWebhook||'')}" placeholder="URL do receptor"></label></fieldset><fieldset><legend>Sinal da reserva · Pix</legend><label>Chave Pix<input name="pixKey" value="${esc(saved.pixKey||'')}" placeholder="CPF, CNPJ, e-mail, telefone ou aleatória"></label><label>Valor do sinal<input name="signalAmount" type="number" min="0" step="0.01" value="${esc(saved.signalAmount||'1000')}"></label><label>Recebedor<input name="pixReceiver" maxlength="25" value="${esc(saved.pixReceiver||'ALIANCA PARK')}"></label><label>Cidade<input name="pixCity" maxlength="15" value="${esc(saved.pixCity||'SENADOR CANEDO')}"></label></fieldset><footer><small>Liquidação do Pix deve ser confirmada pelo PSP. OCR é triagem; validade documental exige conferência humana/serviço autorizado.</small><button type="submit">Salvar configurações</button></footer></form></section>`;
  return settingsAuditTemplate.call(this).replace('<footer class="settings-tools">',`${governance}${calibrationPanel}${integrations}<footer class="settings-tools">`);
};

const bindMasterCashAndIntegrations=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  bindMasterCashAndIntegrations.call(this);
  const form=this.querySelector('[data-integration-form]');
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const raw=Object.fromEntries(new FormData(form));
    const looksLikeGithubPat=value=>/^(?:github_pat_|ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]+$/.test(String(value||'').trim());
    const data=Object.fromEntries(
      Object.entries(raw).filter(([key,value])=>{
        if(looksLikeGithubPat(value))return false;
        return !/^(?:pat|githubPat|github_pat|githubToken|github_token)$/i.test(key);
      })
    );
    data.workerSecretGithubPat='GITHUB_PAT';
    data.autoNotify=form.elements.autoNotify.checked;
    data.stageProfiles={...(readIntegrationSettings().stageProfiles||{}),...(appStore.get().integrationSettings?.stageProfiles||{})};
    localStorage.setItem(INTEGRATION_SETTINGS_KEY,JSON.stringify(data));

    // Não publica o formulário inteiro no appStore: ViewLayer assina o store
    // com render() completo. Salvar um segredo/configuração não deve reconstruir
    // toda a interface nem multiplicar bindings/subscrições.
    document.dispatchEvent(new CustomEvent('belavista:integrations-saved',{detail:{settings:data}}));
    notify('Configurações salvas. O PAT permanece somente no segredo GITHUB_PAT do Worker.','success');
  });
  this.querySelector('[data-register-device]')?.addEventListener('click',async event=>{const button=event.currentTarget,status=this.querySelector('[data-device-status]'),actor=appStore.get().currentActor;button.disabled=true;status.textContent='Solicitando permissão e conectando este dispositivo ao canal em tempo real…';try{const result=await registerOperationalDevice(actor);await this.connectOperationalNotifications(true);status.textContent=result.pushEnabled?'Dispositivo registrado no Realtime Database com push habilitado.':'Dispositivo registrado no Realtime Database; o push pode ser ativado depois com a chave VAPID.';notify('Dispositivo vinculado ao canal operacional em tempo real.','success');}catch(error){button.disabled=false;status.textContent=error.message;notify('Não foi possível ativar notificações.','warning');}});
  this.querySelector('[data-calibration-form]')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,status=form.querySelector('[data-calibration-status]'),parseMoney=value=>Math.round(Number(String(value||'').replace(/\./g,'').replace(',','.'))*100)||0,stages=[...form.querySelectorAll('[data-calibration-stage]')].map(row=>({key:row.dataset.calibrationStage,budgetCents:parseMoney(row.querySelector('[name="budgetCents"]').value),priority:Number(row.querySelector('[name="priority"]').value)||0,dependsOn:row.querySelector('[name="dependsOn"]').value.split(',').filter(Boolean)})),payload={reserveCents:parseMoney(form.elements.reserve.value),dependencyProgress:Number(form.elements.dependencyProgress.value),notificationCooldownMinutes:Number(form.elements.notificationCooldownMinutes.value),stages};status.textContent='Validando relações e criando uma nova versão…';try{const response=await apiFetch('/api/calibrations',{method:'PUT',headers:operationalHeaders({'Content-Type':'application/json'}),body:JSON.stringify(payload)}),result=await response.json();if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);appStore.set({systemCalibration:result.calibration,operationalState:result.operational,lastAction:`Administrador publicou calibração ${result.calibration.version}`});await this.runOperationalLoop('calibration.changed');notify('Calibração publicada e caixa redistribuído.','success');}catch(error){status.textContent=error.message;notify('Calibração não foi alterada.','warning');}});
  this.querySelectorAll('[data-lead-card]').forEach(button=>{const reservation=(appStore.get().publicReservations||[]).find(item=>item.id===button.dataset.leadCard);if(reservation&&reservation.files?.length){button.textContent=reservation.status==='Reserva validada'?'Documentos validados':'Validar documentos e reserva';button.disabled=reservation.status==='Reserva validada';button.addEventListener('click',async()=>{if(!confirm(`Confirmar que os documentos de ${reservation.client} foram conferidos e validar a reserva do lote ${reservation.lot}?`))return;button.disabled=true;try{const response=await apiFetch(`/api/commercial-sales/${encodeURIComponent(reservation.id)}`,{method:'PUT',headers:operationalHeaders({'Content-Type':'application/json'}),body:JSON.stringify({status:'Reserva validada',documentValidation:true,notes:`${reservation.notes||''}; Documentos conferidos em ${new Date().toLocaleString('pt-BR')}`})});if(!response.ok)throw new Error(`HTTP ${response.status}`);notify('Documentos confirmados; reserva validada.','success');await this.loadCommercialReservations();}catch(error){button.disabled=false;notify('Não foi possível validar a reserva.','warning');console.warn(error);}});}else button.addEventListener('click',()=>{document.querySelector('.lead-conversation-widget input[name="message"]')?.focus();notify(`Atendimento ${button.dataset.leadCard} selecionado.`);});});
};

// Aplicados por último para prevalecer sobre os layouts legados carregados no
// mesmo módulo e manter todos os controles de navegação já existentes.
const bindCommercialPagesBaseV8=ViewLayer.prototype.bindCommercialPagesV7;
ViewLayer.prototype.bindCommercialPagesV7=function(){bindCommercialPagesBaseV8?.call(this);bindControlPageEventsV8.call(this);};
ViewLayer.prototype.brokers=brokersControlV8;
ViewLayer.prototype.finance=financeControlV8;

// BELAVISTA_ADMIN_WORKSPACES_V5356
// Applied by admin-workspaces-v5356.mjs after the legacy/admin extension modules.
globalThis.installBelavistaProductWorkspacesV5356=()=>{
  if(!globalThis.__belavistaWorkspaceBaseBindV5356){
    globalThis.__belavistaWorkspaceBaseBindV5356=ViewLayer.prototype.bind;
  }
  const baseBind=globalThis.__belavistaWorkspaceBaseBindV5356;

  const activityStageV5356=item=>String(item?.stage||item?.etapa||item?.name||'Etapa operacional');
  const activityDateV5356=(item,index=0)=>String(item?.date||item?.data||item?.week||`S${String(index+1).padStart(2,'0')}`);
  const recordStageV5356=record=>String(record?.etapa||record?.stage||record?.atividade||'Etapa operacional');
  const normalizeToneV5356=value=>{
    const x=String(value||'').toLowerCase();
    if(/concl|final|feito|valid/.test(x))return 'done';
    if(/atras|bloq|pend|risco/.test(x))return 'warn';
    return 'active';
  };

  // -----------------------------------------------------------------------
  // DASHBOARD: old system widget navigation + operational quick lists.
  // -----------------------------------------------------------------------
  ViewLayer.prototype.assistant=function(){
    const state=appStore.get();
    const reservations=Array.isArray(state.publicReservations)?state.publicReservations:[];
    const notifications=Array.isArray(state.operationalNotifications)?state.operationalNotifications:[];
    const activities=Array.isArray(demoData.activities)?demoData.activities:[];
    const widgets=[
      ['stages','workflow','Etapas'],
      ['records','clipboard-pen-line','Diário'],
      ['leads','users-round','Leads'],
      ['finance','wallet-cards','Financeiro'],
      ['reports','chart-no-axes-combined','Relatórios'],
      ['settings','settings','Configurações']
    ];
    const reservationRows=(reservations.length?reservations.slice(0,5):[
      {id:'R-101',client:'Interessado · lote 077',lot:'Lote 077',status:'Documentos em análise'},
      {id:'R-102',client:'Interessado · lote 147',lot:'Lote 147',status:'Contato comercial'}
    ]).map(item=>`<article><span><b>${esc(item.client||item.name||'Interessado')}</b><small>${esc(item.lot||'Lote a definir')}</small></span><em class="${normalizeToneV5356(item.status)}">${esc(item.status||'Em acompanhamento')}</em></article>`).join('');
    const notificationRows=(notifications.length?notifications.slice(0,5):[
      {title:'Drenagem · registro pendente',message:'Conferir medição da frente ativa.',severity:'warning'},
      {title:'Compras · material',message:'Revisar necessidade da etapa antes da próxima liberação.',severity:'info'}
    ]).map(item=>`<article><span><b>${esc(item.title||'Notificação')}</b><small>${esc(item.message||'')}</small></span><em class="${normalizeToneV5356(item.severity)}">${esc(item.severity||'info')}</em></article>`).join('');
    const activityRows=activities.slice(0,6).map((item,index)=>`<article><span><b>${esc(item.name||'Atividade')}</b><small>${esc(activityDateV5356(item,index))} · ${esc(item.owner||'Responsável a definir')}</small></span><em class="${normalizeToneV5356(item.status)}">${Number(item.progress)||0}%</em></article>`).join('');

    return `<section class="dashboard-system-v5356">
      <header class="workspace-head-v5356"><div><span>CONTROLE DE OBRA · SISTEMA</span><h1>Dashboard inicial</h1><p>Listagem operacional e ações rápidas sobre reservas, notificações e atividades.</p></div><button type="button" data-v5356-inference-test>${ico('sparkles')} Testar inferência</button></header>
      <nav class="carbon-widget-bar system-widget-nav-v5356" aria-label="Widgets do sistema">${widgets.map(([view,icon,label])=>`<button type="button" data-view="${view}">${ico(icon)}<span>${label}</span></button>`).join('')}</nav>
      <div class="dashboard-system-status-v5356" data-v5356-inference-status><span>INFERÊNCIA</span><b>Pronta para teste dry-run</b><small>Executa /api/operational-loop sem commit.</small></div>
      <div class="dashboard-system-grid-v5356">
        <section class="system-list-widget-v5356"><header><div><span>RESERVAS</span><h2>${reservations.length||2} em acompanhamento</h2></div><button type="button" data-view="leads">Abrir Leads</button></header><div>${reservationRows}</div><footer><button type="button" data-view="leads">Revisar reservas</button><button type="button" data-view="map">Ver lotes no mapa</button></footer></section>
        <section class="system-list-widget-v5356"><header><div><span>NOTIFICAÇÕES</span><h2>${notifications.length||2} eventos recentes</h2></div><button type="button" data-view="reports">Ver contexto</button></header><div>${notificationRows}</div><footer><button type="button" data-view="records">Abrir Diário</button><button type="button" data-view="reports">Ver riscos</button></footer></section>
        <section class="system-list-widget-v5356"><header><div><span>ATIVIDADES</span><h2>${activities.length} no calendário</h2></div><button type="button" data-view="stages">Abrir calendário</button></header><div>${activityRows}</div><footer><button type="button" data-view="stages">Cronograma</button><button type="button" data-view="records">Registrar atividade</button></footer></section>
      </div>
    </section>`;
  };

  // -----------------------------------------------------------------------
  // DIÁRIO: table dashboard. Each row opens a dedicated record page.
  // -----------------------------------------------------------------------
  ViewLayer.prototype.records=function(){
    const state=appStore.get();
    const records=Array.isArray(state.records)?state.records:[];
    const selectedId=state.recordDedicatedV5356||'';
    const selected=records.find(item=>String(item.id)===String(selectedId));

    if(selected){
      return `<section class="record-dedicated-v5356">
        <header class="workspace-head-v5356"><div><span>DIÁRIO · REGISTRO DEDICADO</span><h1>${esc(selected.atividade||'Registro operacional')}</h1><p>${esc(recordStageV5356(selected))} · ${esc(selected.data||'Sem data')} ${esc(selected.hora||'')}</p></div><button type="button" data-v5356-record-back>${ico('arrow-left')} Voltar ao Diário</button></header>
        <div class="record-dedicated-grid-v5356"><article><span>REGISTRO</span><b>${esc(selected.id||'—')}</b></article><article><span>ETAPA / ATIVIDADE</span><b>${esc(recordStageV5356(selected))}</b></article><article><span>RESPONSÁVEL</span><b>${esc(selected.responsavel||'A definir')}</b></article><article><span>STATUS</span><b>${esc(selected.status||'Pendente')}</b></article></div>
        <section class="record-dedicated-body-v5356"><span>APONTAMENTO / MEDIÇÃO</span><p>${esc(selected.detalhes||'Nenhum detalhe informado.')}</p></section>
        <footer class="record-dedicated-actions-v5356"><button type="button" data-view="stages">Ver calendário da etapa</button><button type="button" data-view="map">Localizar no mapa</button></footer>
      </section>`;
    }

    const completed=records.filter(x=>/concl|final|feito/i.test(String(x.status||''))).length;
    const pending=Math.max(0,records.length-completed);
    const rows=records.slice().reverse().map(record=>`<tr>
      <td><b>${esc(record.id||'REG')}</b><small>${esc(record.data||'—')} ${esc(record.hora||'')}</small></td>
      <td><b>${esc(recordStageV5356(record))}</b><small>${esc(record.atividade||'Atividade operacional')}</small></td>
      <td>${esc(record.responsavel||'A definir')}</td>
      <td class="record-measure-v5356">${esc(record.detalhes||'Sem medição informada')}</td>
      <td><span class="workspace-status-v5356 ${normalizeToneV5356(record.status)}">${esc(record.status||'Pendente')}</span></td>
      <td><button type="button" data-v5356-record="${esc(record.id||'')}">Abrir página</button></td>
    </tr>`).join('');

    return `<section class="records-dashboard-v5356">
      <header class="workspace-head-v5356"><div><span>DIÁRIO · ATIVIDADES NAS ETAPAS</span><h1>Registro operacional</h1><p>Dashboard tabelado dos fatos, medições e evidências vinculados às etapas.</p></div><button type="button" data-view="stages">Ver calendário de atividades</button></header>
      <div class="records-summary-v5356"><article><span>Registros</span><b>${records.length}</b></article><article><span>Concluídos</span><b>${completed}</b></article><article><span>Pendentes</span><b>${pending}</b></article><article><span>Etapas relacionadas</span><b>${new Set(records.map(recordStageV5356)).size}</b></article></div>
      <div class="records-table-wrap-v5356"><table><thead><tr><th>Registro / data</th><th>Etapa / atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th><th>Página</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="workspace-empty-v5356">Nenhum registro cadastrado.</td></tr>'}</tbody></table></div>
    </section>`;
  };

  // -----------------------------------------------------------------------
  // ETAPAS + CRONOGRAMA: ONE representation mode only: activity card calendar.
  // -----------------------------------------------------------------------
  ViewLayer.prototype.stages=function(){
    const activities=Array.isArray(demoData.activities)?demoData.activities:[];
    const groups=[];
    for(const [index,item] of activities.entries()){
      const label=activityDateV5356(item,index);
      let group=groups.find(g=>g.label===label);
      if(!group){group={label,items:[]};groups.push(group);}
      group.items.push(item);
    }
    const columns=groups.map(group=>`<section class="stage-calendar-column-v5356"><header><span>CALENDÁRIO</span><b>${esc(group.label)}</b></header><div>${group.items.map(item=>`<button type="button" class="stage-activity-card-v5356 ${normalizeToneV5356(item.status)}" data-v5356-stage-activity="${esc(item.id||item.name||'')}"><span>${esc(item.status||'Planejada')}</span><h3>${esc(item.name||'Atividade')}</h3><p>${esc(item.owner||'Responsável a definir')}</p><i><em style="width:${Math.max(0,Math.min(100,Number(item.progress)||0))}%"></em></i><footer><b>${Number(item.progress)||0}%</b><small>Abrir atividade →</small></footer></button>`).join('')}</div></section>`).join('');
    return `<section class="stage-calendar-page-v5356">
      <header class="workspace-head-v5356"><div><span>ETAPAS E CRONOGRAMA</span><h1>Calendário de atividades</h1><p>Uma única representação gráfica da execução: calendário horizontal de cards por etapa e atividade.</p></div><div class="stage-calendar-legend-v5356"><span class="active">Em andamento</span><span class="warn">Pendente / risco</span><span class="done">Concluído</span></div></header>
      <div class="stage-calendar-graph-v5356">${columns||'<div class="workspace-empty-v5356">Nenhuma atividade disponível.</div>'}</div>
    </section>`;
  };

  // -----------------------------------------------------------------------
  // LEADS INTERNAL: public /leads is embedded untouched + internal windows.
  // -----------------------------------------------------------------------
  ViewLayer.prototype.leads=function(){
    const state=appStore.get();
    const reservations=Array.isArray(state.publicReservations)?state.publicReservations:[];
    const siteLeads=Array.isArray(state.publicLeads)?state.publicLeads:[];
    const all=[
      ...reservations.map(item=>({id:item.id,name:item.client||'Cliente em análise',lot:item.lot||'A definir',status:item.status||'Reserva em análise',source:'Reserva',note:item.notes||'Documentos e continuidade comercial.'})),
      ...siteLeads.map(item=>({id:item.id,name:item.name||'Novo interessado',lot:item.lot||'A definir',status:item.status||'Novo',source:'Site',note:item.conversation||item.notes||'Intenção recebida pela página pública.'}))
    ];
    if(!all.length)all.push(...(demoData.leads||[]).slice(0,4).map((item,index)=>({id:`DEMO-${index+1}`,name:item.name,lot:item.lot,status:item.status,source:'Demonstração',note:`Objetivo: ${item.objective}`})));
    const selected=all[Math.max(0,Math.min(all.length-1,Number(state.selectedLead)||0))]||all[0];
    const rows=all.map((item,index)=>`<button type="button" class="lead-system-row-v5356 ${item===selected?'selected':''}" data-v5356-lead-index="${index}"><span><b>${esc(item.name)}</b><small>${esc(item.lot)} · ${esc(item.source)}</small></span><em>${esc(item.status)}</em></button>`).join('');

    return `<section class="leads-internal-v5356">
      <header class="workspace-head-v5356"><div><span>LEADS · OPERAÇÃO COMERCIAL</span><h1>Aliança Park</h1><p>Copy comercial, página pública e janelas operacionais no mesmo workspace interno.</p></div><button type="button" data-v5356-open-public>${ico('external-link')} Abrir /leads</button></header>
      <section class="lead-copy-v5356"><span>LANÇAMENTO · ALIANÇA PARK</span><h2>Um loteamento para <em>morar, investir e crescer</em></h2><p>Escolha seu lote entendendo o lugar inteiro. Compare implantação, posição e interesse comercial antes de avançar para a continuidade com o corretor.</p><div><b>Mapa + CRM</b><b>Perfil de compra</b><b>Retorno comercial</b></div></section>
      <div class="leads-internal-grid-v5356">
        <section class="public-leads-frame-window-v5356"><header><span>PÁGINA PÚBLICA · /leads</span><small>Fonte preservada; nenhuma alteração no frontend público.</small></header><iframe src="${runtimeRouteV1('/leads','embedded-admin=v5356')}" title="Página pública Aliança Park"></iframe></section>
        <aside class="lead-system-windows-v5356">
          <section class="lead-window-v5356 lead-suggestions-v5356"><header><span>SUGESTÕES DE AÇÃO</span><b>Próximos movimentos</b></header><button type="button" data-v5356-lead-action="reply">${ico('message-circle')} Responder lead prioritário</button><button type="button" data-v5356-lead-action="reservation">${ico('file-check-2')} Revisar reserva pendente</button><button type="button" data-view="map">${ico('map-pinned')} Relacionar lote no mapa</button><button type="button" data-v5356-inference-test>${ico('sparkles')} Testar inferência comercial</button><small data-v5356-inference-status>Dry-run sem commit.</small></section>
          <section class="lead-window-v5356"><header><span>LEADS NO SISTEMA</span><b>${all.length} registros</b></header><div class="lead-system-list-v5356">${rows}</div></section>
          <section class="lead-window-v5356 lead-selected-v5356"><header><span>LEAD SELECIONADO</span><b>${esc(selected?.name||'—')}</b></header><dl><div><dt>Lote</dt><dd>${esc(selected?.lot||'—')}</dd></div><div><dt>Status</dt><dd>${esc(selected?.status||'—')}</dd></div><div><dt>Origem</dt><dd>${esc(selected?.source||'—')}</dd></div></dl><p>${esc(selected?.note||'Sem observação registrada.')}</p><footer><button type="button" data-v5356-lead-action="reply">Abrir atendimento</button><button type="button" data-view="map">Abrir mapa</button></footer></section>
        </aside>
      </div>
    </section>`;
  };

  // -----------------------------------------------------------------------
  // Final event binding, on top of the current existing binder.
  // -----------------------------------------------------------------------
  ViewLayer.prototype.bind=function(){
    baseBind?.call(this);

    this.querySelectorAll('[data-v5356-record]').forEach(button=>button.addEventListener('click',()=>{
      appStore.set({recordDedicatedV5356:button.dataset.v5356Record,lastAction:`Abriu página dedicada do registro ${button.dataset.v5356Record}`});
    }));
    this.querySelector('[data-v5356-record-back]')?.addEventListener('click',()=>{
      appStore.set({recordDedicatedV5356:null,lastAction:'Voltou ao dashboard do Diário'});
    });
    this.querySelectorAll('[data-v5356-stage-activity]').forEach(button=>button.addEventListener('click',()=>{
      const activity=(demoData.activities||[]).find(item=>String(item.id||item.name)===String(button.dataset.v5356StageActivity));
      appStore.set({view:'activities',selectedActivity:activity?.id||activity?.name||button.dataset.v5356StageActivity,activityDedicated:true,lastAction:`Abriu atividade ${activity?.name||button.dataset.v5356StageActivity}`});
    }));
    this.querySelectorAll('[data-v5356-lead-index]').forEach(button=>button.addEventListener('click',()=>{
      appStore.set({selectedLead:Number(button.dataset.v5356LeadIndex)||0,lastAction:'Selecionou lead na janela operacional'});
    }));
    this.querySelector('[data-v5356-open-public]')?.addEventListener('click',()=>window.open(runtimeRouteV1('/leads'),'_blank','noopener'));
    this.querySelectorAll('[data-v5356-lead-action]').forEach(button=>button.addEventListener('click',()=>{
      const action=button.dataset.v5356LeadAction;
      if(action==='reservation')appStore.set({lastAction:'Revisar reserva pendente na fila comercial'});
      else appStore.set({lastAction:'Abrir atendimento do lead selecionado'});
      this.querySelector('.lead-selected-v5356')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
    }));
    this.querySelectorAll('[data-v5356-inference-test]').forEach(button=>button.addEventListener('click',async()=>{
      const status=this.querySelector('[data-v5356-inference-status]');
      button.disabled=true;
      if(status)status.textContent='Executando dry-run NVIDIA / operational-loop…';
      try{
        const response=await apiFetch('/api/operational-loop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trigger:'admin.ui.inference-test-v5356',dryRun:true})});
        const payload=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);
        const trace=payload.metaTrace||payload.metadataTrace||payload.metaUsage||payload.fieldsUsed||payload.trace||null;
        if(status)status.textContent=`Inferência respondeu · dry-run OK${trace?' · metadados recebidos':''}`;
        appStore.set({lastInferenceTestV5356:{ok:true,at:new Date().toISOString(),trace},lastAction:'Teste de inferência dry-run concluído'});
        notify('Inferência operacional respondeu em dry-run.','success');
      }catch(error){
        if(status)status.textContent=`Falha no teste: ${error.message}`;
        appStore.set({lastInferenceTestV5356:{ok:false,at:new Date().toISOString(),error:error.message},lastAction:'Teste de inferência falhou'});
        notify('Teste de inferência indisponível.','warning');
      }finally{button.disabled=false;}
    }));

    window.lucide?.createIcons();
  };

  globalThis.__BELAVISTA_ADMIN_WORKSPACES_V5356={installedAt:new Date().toISOString(),version:'5.3.56'};
};

// BELAVISTA_FINAL_WORKSPACES_V5360
globalThis.installBelavistaFinalWorkspacesV5360=()=>{
  if(ViewLayer.prototype.__belavistaFinalWorkspacesV5360Installed)return;
  ViewLayer.prototype.__belavistaFinalWorkspacesV5360Installed=true;

  // Installed only after all deferred admin extensions. This is deliberately
  // the final owner of map/stages/records for the requested product surfaces.
  const baseBind=ViewLayer.prototype.bind;

  const toneV5360=value=>{
    const text=String(value||'').toLowerCase();
    if(/concl|final|assinado|aprovad|feito|regular/.test(text))return 'done';
    if(/pend|atras|risco|bloq|análise|reserva/.test(text))return 'warn';
    return 'active';
  };

  const parseBrDateV5360=value=>{
    const text=String(value||'');
    const match=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(match)return Date.parse(`${match[3]}-${match[2]}-${match[1]}`)||0;
    return Date.parse(text)||0;
  };

  const recordStageV5360=record=>
    String(record?.etapa||record?.stage||record?.atividade||'Etapa operacional');

  const activityPeriodV5360=(item,index=0)=>
    String(item?.week||item?.date||item?.data||`Período ${index+1}`);

  const latestDealForV5360=profileId=>
    commissionDeals
      .filter(item=>item.profile===profileId)
      .slice()
      .sort((a,b)=>parseBrDateV5360(b.date)-parseBrDateV5360(a.date))[0]||null;

  const latestActivityLabelV5360=profile=>{
    const deal=latestDealForV5360(profile.id);
    if(!deal)return 'Sem atividade comercial recente';
    return `${deal.status} · ${deal.lot} · ${deal.date}`;
  };

  // ---------------------------------------------------------------------
  // DASHBOARD INICIAL = MAPA + WIDGETS
  // ---------------------------------------------------------------------
  ViewLayer.prototype.map=function(){
    const operationalFilter=appStore.get().mapFilter||'execution';
    const operationalStatus=highlightStatus[operationalFilter]||highlightStatus.execution;
    const operationalProgress=Math.max(0,Math.min(100,Number(operationalStatus.progress)||0));
    return `<section class="admin-public-map-interface-v5352 operational-map-highlights-v5370" data-highlight-family="operational" data-highlight-key="${esc(operationalFilter)}" aria-label="Mapa operacional com destaques físicos">
      <aside class="admin-public-map-status-v5352" data-highlight-status="${esc(operationalFilter)}" aria-live="polite">
        <span>${esc(operationalStatus.eyebrow)}</span>
        <header><div><h2>${esc(operationalStatus.title)}</h2><small>${esc(operationalStatus.status)}</small></div><b>${operationalProgress}%</b></header>
        <i><em style="width:${operationalProgress}%"></em></i>
        <p>${esc(operationalStatus.detail)}</p>
        <div class="operational-map-highlight-meta-v5370"><span>APLICADO NO MODELO 3D</span><b>${esc(operationalStatus.priority)}</b></div>
        <footer><small>${esc(operationalStatus.next)}</small><button type="button" data-view="${esc(operationalStatus.view)}">Abrir contexto</button></footer>
      </aside>
      <map-filter-rail></map-filter-rail>
    </section>`;
    const state=appStore.get();
    const reservations=Array.isArray(state.publicReservations)&&state.publicReservations.length
      ? state.publicReservations.slice(0,5)
      : commissionDeals.filter(item=>item.status==='Reserva').slice(0,5);

    const notifications=Array.isArray(state.operationalNotifications)&&state.operationalNotifications.length
      ? state.operationalNotifications.slice(0,5)
      : [
          {title:'Drenagem · medição',message:'Revisar último apontamento da frente ativa.',severity:'warning'},
          {title:'Etapa · comprovação',message:'Há atividade aguardando evidência para continuidade.',severity:'info'}
        ];

    const activities=(demoData.activities||[]).slice(0,6);
    const commissionOpen=Boolean(state.dashboardCommissionOpenV5360);
    const selectedBroker=commissionProfiles.find(
      item=>item.id===state.dashboardCommissionBrokerV5360
    )||null;

    const widgets=[
      ['stages','workflow','Etapas'],
      ['records','clipboard-pen-line','Diário'],
      ['leads','users-round','Leads'],
      ['finance','wallet-cards','Financeiro'],
      ['reports','chart-no-axes-combined','Relatórios']
    ];

    const reservationRows=reservations.map(item=>{
      const client=item.client||item.name||'Interessado';
      const lot=item.lot||item.quadra||'Lote a definir';
      const status=item.status||'Em acompanhamento';
      return `<article><span><b>${esc(client)}</b><small>${esc(lot)}</small></span><em class="${toneV5360(status)}">${esc(status)}</em></article>`;
    }).join('');

    const notificationRows=notifications.map(item=>`
      <article>
        <span><b>${esc(item.title||'Notificação')}</b><small>${esc(item.message||'')}</small></span>
        <em class="${toneV5360(item.severity)}">${esc(item.severity||'info')}</em>
      </article>`).join('');

    const activityRows=activities.map((item,index)=>`
      <article>
        <span><b>${esc(item.name||'Atividade')}</b><small>${esc(item.owner||'Responsável a definir')} · ${esc(activityPeriodV5360(item,index))}</small></span>
        <em class="${toneV5360(item.status)}">${Number(item.progress)||0}%</em>
      </article>`).join('');

    const brokerList=commissionProfiles.map(profile=>{
      const last=latestDealForV5360(profile.id);
      return `<button type="button" class="dashboard-broker-row-v5360" data-v5360-broker="${profile.id}">
        <span class="dashboard-broker-avatar-v5360" style="background:${profile.avatar}">${profile.initials}</span>
        <span><b>&gt; ${esc(profile.name)}</b><small>${esc(latestActivityLabelV5360(profile))}</small></span>
        <em>${esc(profile.commission)}</em>
      </button>`;
    }).join('');

    let brokerDetail='';
    if(selectedBroker){
      const deals=commissionDeals
        .filter(item=>item.profile===selectedBroker.id)
        .slice()
        .sort((a,b)=>parseBrDateV5360(b.date)-parseBrDateV5360(a.date));
      const last=deals[0]||null;
      brokerDetail=`<section class="dashboard-broker-detail-v5360">
        <header>
          <button type="button" data-v5360-broker-back>← Corretores</button>
          <span class="dashboard-broker-avatar-v5360" style="background:${selectedBroker.avatar}">${selectedBroker.initials}</span>
          <div><b>${esc(selectedBroker.name)}</b><small>${esc(selectedBroker.role)} · ${esc(selectedBroker.creci)}</small></div>
        </header>
        <div class="dashboard-broker-metrics-v5360">
          <span><small>Vendas</small><b>${selectedBroker.sales}</b></span>
          <span><small>Comissão</small><b>${esc(selectedBroker.commission)}</b></span>
          <span><small>Conversão</small><b>${esc(selectedBroker.conversion)}</b></span>
        </div>
        <div class="dashboard-broker-last-v5360">
          <span>ÚLTIMA ATIVIDADE</span>
          <b>${last?esc(`${last.status} · ${last.client}`):'Sem atividade'}</b>
          <small>${last?esc(`${last.lot} · ${last.date} · ${last.stage}`):'Nenhum contrato vinculado.'}</small>
        </div>
        <div class="dashboard-broker-actions-v5360">
          <button type="button" data-v5360-commission-correction="${selectedBroker.id}">${ico('pencil-line')} Correção</button>
          <button type="button" data-v5360-commission-open="${selectedBroker.id}">${ico('badge-dollar-sign')} Comissão</button>
        </div>
      </section>`;
    }

    const commissionPanel=commissionOpen?`
      <section class="dashboard-map-widget-v5360 commission-quick-v5360" data-map-widget>
        <header>
          <div><span>COMISSÕES</span><h2>Corretores e atividade recente</h2></div>
          <button type="button" data-v5360-commission-toggle aria-label="Fechar comissões">×</button>
        </header>
        ${selectedBroker
          ? brokerDetail
          : `<div class="dashboard-broker-list-v5360">${brokerList}</div>
             <footer><small>Clique em &gt; corretor para manter a navegação dentro deste widget.</small><button type="button" data-view="commissions">Carteira completa</button></footer>`
        }
      </section>`:'';

    return `<section class="dashboard-map-v5360" aria-label="Dashboard operacional sobre o mapa">
      <header class="dashboard-map-head-v5360" data-map-widget>
        <div><span>DASHBOARD INICIAL · ALIANÇA PARK</span><h1>Operação sobre o loteamento</h1><p>Mapa 3D como superfície de contexto; widgets para leitura e ação rápida.</p></div>
        <div class="dashboard-inference-v5360">
          <small data-v5360-inference-status>${state.lastInferenceTestV5360?.ok?'Inferência dry-run OK':'Inferência pronta'}</small>
          <button type="button" data-v5360-inference-test>${ico('sparkles')} Testar inferência</button>
        </div>
      </header>

      <nav class="carbon-widget-bar dashboard-system-nav-v5360" data-map-widget aria-label="Interfaces do sistema">
        ${widgets.map(([view,icon,label])=>`<button type="button" data-view="${view}">${ico(icon)}<span>${label}</span></button>`).join('')}
        <button type="button" class="${commissionOpen?'active':''}" data-v5360-commission-toggle>${ico('badge-dollar-sign')}<span>Comissões</span></button>
      </nav>

      <div class="dashboard-map-grid-v5360">
        <section class="dashboard-map-widget-v5360" data-map-widget>
          <header><div><span>RESERVAS</span><h2>${reservations.length} acompanhadas</h2></div><button type="button" data-view="leads">Abrir</button></header>
          <div>${reservationRows||'<p class="dashboard-empty-v5360">Nenhuma reserva registrada.</p>'}</div>
          <footer><button type="button" data-view="leads">Revisar reservas</button><button type="button" data-view="map">Lotes no mapa</button></footer>
        </section>

        <section class="dashboard-map-widget-v5360" data-map-widget>
          <header><div><span>NOTIFICAÇÕES</span><h2>${notifications.length} recentes</h2></div><button type="button" data-view="reports">Abrir</button></header>
          <div>${notificationRows}</div>
          <footer><button type="button" data-view="records">Diário</button><button type="button" data-view="reports">Riscos</button></footer>
        </section>

        <section class="dashboard-map-widget-v5360" data-map-widget>
          <header><div><span>ATIVIDADES</span><h2>${activities.length} no calendário</h2></div><button type="button" data-view="stages">Abrir</button></header>
          <div>${activityRows}</div>
          <footer><button type="button" data-view="stages">Calendário</button><button type="button" data-view="records">Registros</button></footer>
        </section>
      </div>

      ${commissionPanel}
    </section>`;
  };

  // ---------------------------------------------------------------------
  // ETAPAS + CRONOGRAMA = UMA REPRESENTAÇÃO: CALENDÁRIO DE CARDS
  // ---------------------------------------------------------------------
  ViewLayer.prototype.stages=function(){
    const activities=Array.isArray(demoData.activities)?demoData.activities:[];
    const groups=[];

    activities.forEach((item,index)=>{
      const period=activityPeriodV5360(item,index);
      let group=groups.find(entry=>entry.period===period);
      if(!group){
        group={period,items:[]};
        groups.push(group);
      }
      group.items.push(item);
    });

    return `<section class="stage-calendar-only-v5360">
      <header class="workspace-head-v5360">
        <div>
          <span>ETAPAS E CRONOGRAMA</span>
          <h1>Calendário de atividades</h1>
          <p>Representação única da execução. Cada card abre a página dedicada da atividade.</p>
        </div>
        <div class="stage-calendar-legend-v5360">
          <span class="active">Em andamento</span>
          <span class="warn">Pendente / risco</span>
          <span class="done">Concluído</span>
        </div>
      </header>
      <div class="stage-calendar-v5360">
        ${groups.map(group=>`
          <section class="stage-period-v5360">
            <header><span>PERÍODO</span><b>${esc(group.period)}</b></header>
            <div>
              ${group.items.map(item=>`
                <button type="button" class="stage-card-v5360 ${toneV5360(item.status)}" data-v5360-stage-card="${esc(item.id||item.name||'')}">
                  <span>${esc(item.status||'Planejada')}</span>
                  <h2>${esc(item.name||'Atividade')}</h2>
                  <p>${esc(item.owner||'Responsável a definir')}</p>
                  <i><em style="width:${Math.max(0,Math.min(100,Number(item.progress)||0))}%"></em></i>
                  <footer><b>${Number(item.progress)||0}%</b><small>Abrir página →</small></footer>
                </button>`).join('')}
            </div>
          </section>`).join('')||'<div class="dashboard-empty-v5360">Nenhuma atividade disponível.</div>'}
      </div>
    </section>`;
  };

  // ---------------------------------------------------------------------
  // DIÁRIO = DASHBOARD TABELADO + PÁGINA DEDICADA
  // ---------------------------------------------------------------------
  ViewLayer.prototype.records=function(){
    const state=appStore.get();
    const records=Array.isArray(state.records)?state.records:[];
    const selected=records.find(
      item=>String(item.id)===String(state.selectedRecordV5360||'')
    );

    if(selected){
      return `<section class="record-page-v5360">
        <header class="workspace-head-v5360">
          <div><span>DIÁRIO · REGISTRO DEDICADO</span><h1>${esc(selected.atividade||'Registro operacional')}</h1><p>${esc(recordStageV5360(selected))} · ${esc(selected.data||'Sem data')} ${esc(selected.hora||'')}</p></div>
          <button type="button" data-v5360-record-back>${ico('arrow-left')} Voltar ao Diário</button>
        </header>

        <div class="record-page-kpis-v5360">
          <article><small>Registro</small><b>${esc(selected.id||'—')}</b></article>
          <article><small>Etapa</small><b>${esc(recordStageV5360(selected))}</b></article>
          <article><small>Responsável</small><b>${esc(selected.responsavel||'A definir')}</b></article>
          <article><small>Status</small><b>${esc(selected.status||'Pendente')}</b></article>
        </div>

        <section class="record-page-body-v5360">
          <span>APONTAMENTO / MEDIÇÃO</span>
          <p>${esc(selected.detalhes||'Nenhum detalhe informado.')}</p>
          ${selected.mapArea?`<dl><dt>Área vinculada</dt><dd>${esc(selected.mapArea)}</dd></dl>`:''}
          ${selected.evidenceUri?`<a href="${esc(selected.evidenceUri)}" target="_blank" rel="noopener">Abrir evidência</a>`:''}
        </section>

        <footer class="record-page-actions-v5360">
          <button type="button" data-view="stages">Calendário da etapa</button>
          <button type="button" data-view="map">Localizar no mapa</button>
        </footer>
      </section>`;
    }

    const completed=records.filter(item=>/concl|final|feito/i.test(String(item.status||''))).length;
    const pending=Math.max(0,records.length-completed);
    const stages=new Set(records.map(recordStageV5360));

    const rows=records.slice().reverse().map(record=>`
      <tr data-v5360-record-row="${esc(record.id||'')}">
        <td><b>${esc(record.id||'REG')}</b><small>${esc(record.data||'—')} ${esc(record.hora||'')}</small></td>
        <td><b>${esc(recordStageV5360(record))}</b><small>${esc(record.atividade||'Atividade operacional')}</small></td>
        <td>${esc(record.responsavel||'A definir')}</td>
        <td class="record-note-v5360">${esc(record.detalhes||'Sem apontamento informado')}</td>
        <td><span class="record-tone-v5360 ${toneV5360(record.status)}">${esc(record.status||'Pendente')}</span></td>
        <td><button type="button" data-v5360-record="${esc(record.id||'')}">Abrir página</button></td>
      </tr>`).join('');

    return `<section class="records-table-page-v5360">
      <header class="workspace-head-v5360">
        <div><span>DIÁRIO · ATIVIDADES NAS ETAPAS</span><h1>Registros operacionais</h1><p>Tabela dos fatos, medições e evidências vinculados às etapas.</p></div>
        <button type="button" data-view="stages">Calendário de atividades</button>
      </header>

      <div class="records-kpis-v5360">
        <article><small>Registros</small><b>${records.length}</b></article>
        <article><small>Concluídos</small><b>${completed}</b></article>
        <article><small>Pendentes</small><b>${pending}</b></article>
        <article><small>Etapas</small><b>${stages.size}</b></article>
      </div>

      <div class="records-table-v5360">
        <table>
          <thead><tr><th>Registro / data</th><th>Etapa / atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th><th>Página</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="6" class="dashboard-empty-v5360">Nenhum registro cadastrado.</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;
  };

  // ---------------------------------------------------------------------
  // FINAL BIND: captured after every extension has loaded.
  // ---------------------------------------------------------------------
  ViewLayer.prototype.bind=function(){
    baseBind?.call(this);

    this.querySelectorAll('[data-v5360-record]').forEach(button=>
      button.addEventListener('click',event=>{
        event.stopPropagation();
        appStore.set({
          selectedRecordV5360:button.dataset.v5360Record,
          lastAction:`Abriu página dedicada do registro ${button.dataset.v5360Record}`
        });
      })
    );

    this.querySelectorAll('[data-v5360-record-row]').forEach(row=>
      row.addEventListener('dblclick',()=>{
        appStore.set({
          selectedRecordV5360:row.dataset.v5360RecordRow,
          lastAction:`Abriu registro ${row.dataset.v5360RecordRow}`
        });
      })
    );

    this.querySelector('[data-v5360-record-back]')?.addEventListener('click',()=>{
      appStore.set({selectedRecordV5360:null,lastAction:'Voltou ao dashboard do Diário'});
    });

    this.querySelectorAll('[data-v5360-stage-card]').forEach(button=>
      button.addEventListener('click',()=>{
        const activity=(demoData.activities||[]).find(
          item=>String(item.id||item.name)===String(button.dataset.v5360StageCard)
        );
        appStore.set({
          view:'activities',
          selectedActivity:activity?.id||activity?.name||button.dataset.v5360StageCard,
          activityDedicated:true,
          lastAction:`Abriu atividade ${activity?.name||button.dataset.v5360StageCard}`
        });
      })
    );

    this.querySelectorAll('[data-v5360-commission-toggle]').forEach(button=>
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const state=appStore.get();
        appStore.set({
          dashboardCommissionOpenV5360:!state.dashboardCommissionOpenV5360,
          dashboardCommissionBrokerV5360:null,
          lastAction:state.dashboardCommissionOpenV5360?'Fechou comissões rápidas':'Abriu comissões rápidas'
        });
      })
    );

    this.querySelectorAll('[data-v5360-broker]').forEach(button=>
      button.addEventListener('click',()=>{
        appStore.set({
          dashboardCommissionOpenV5360:true,
          dashboardCommissionBrokerV5360:button.dataset.v5360Broker,
          lastAction:`Abriu corretor ${button.textContent.trim()} dentro do widget`
        });
      })
    );

    this.querySelector('[data-v5360-broker-back]')?.addEventListener('click',()=>{
      appStore.set({
        dashboardCommissionOpenV5360:true,
        dashboardCommissionBrokerV5360:null,
        lastAction:'Voltou à lista rápida de corretores'
      });
    });

    this.querySelectorAll('[data-v5360-commission-open]').forEach(button=>
      button.addEventListener('click',()=>{
        appStore.set({
          view:'commissions',
          selectedCommissionProfile:button.dataset.v5360CommissionOpen,
          selectedCommissionContract:null,
          lastAction:'Abriu carteira de comissão do corretor'
        });
      })
    );

    this.querySelectorAll('[data-v5360-commission-correction]').forEach(button=>
      button.addEventListener('click',()=>{
        const profile=button.dataset.v5360CommissionCorrection;
        const last=latestDealForV5360(profile);
        appStore.set({
          view:'commissions',
          selectedCommissionProfile:null,
          selectedCommissionContract:null,
          commissionEditorOpen:true,
          commissionEditing:last||null,
          commissionFilters:{query:'',status:'all',profile},
          lastAction:'Abriu correção da última atividade de comissão'
        });
      })
    );

    this.querySelector('[data-v5360-inference-test]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      const status=this.querySelector('[data-v5360-inference-status]');
      button.disabled=true;
      if(status)status.textContent='Executando dry-run…';

      try{
        const response=await apiFetch('/api/operational-loop',{
          method:'POST',
          headers:operationalHeaders({'Content-Type':'application/json'}),
          body:JSON.stringify({
            trigger:'admin.dashboard.inference-test-v5360',
            dryRun:true
          })
        });
        const payload=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);

        const trace=
          payload.metaTrace||
          payload.metadataTrace||
          payload.metaUsage||
          payload.fieldsUsed||
          payload.trace||
          null;

        appStore.set({
          lastInferenceTestV5360:{
            ok:true,
            at:new Date().toISOString(),
            trace
          },
          lastAction:'Inferência operacional dry-run concluída'
        });

        notify('Inferência operacional respondeu em dry-run.','success');
      }catch(error){
        if(status)status.textContent=`Falha: ${error.message}`;
        appStore.set({
          lastInferenceTestV5360:{
            ok:false,
            at:new Date().toISOString(),
            error:error.message
          },
          lastAction:'Teste de inferência falhou'
        });
        notify('Teste de inferência indisponível.','warning');
      }finally{
        button.disabled=false;
      }
    });

    window.lucide?.createIcons();
  };

  globalThis.__BELAVISTA_FINAL_WORKSPACES_V5360={
    version:'5.3.60',
    installedAt:new Date().toISOString(),
    owner:'final-after-deferred'
  };

  // Force the current page to be rebuilt with the final overrides.
  try{
    appStore.set({
      lastAction:'Workspaces finais v5.3.60 aplicados'
    });
  }catch{}
};

// BELAVISTA_STAGES_LANDING_V5361
globalThis.__BELAVISTA_STAGE_DETAIL_BASE_V5361 =
  globalThis.__BELAVISTA_STAGE_DETAIL_BASE_V5361 || ViewLayer.prototype.stages;

globalThis.installBelavistaStagesLandingV5361=()=>{
  if(ViewLayer.prototype.__belavistaStagesLandingV5361Installed)return;
  ViewLayer.prototype.__belavistaStagesLandingV5361Installed=true;

  const detailTemplate =
    globalThis.__BELAVISTA_STAGE_DETAIL_BASE_V5361 ||
    ViewLayer.prototype.stages;

  const baseBind=ViewLayer.prototype.bind;
  const stageKey=item=>String(item?.id||item?.key||item?.name||'stage');
  const stageWeek=(item,index)=>String(item?.week||item?.period||`Período ${index+1}`);
  const stageStatus=item=>{
    const p=Number(item?.progress)||0;
    if(p>=100)return 'Concluída';
    if(p>0)return 'Em andamento';
    return 'Planejada';
  };
  const stageTone=item=>{
    const p=Number(item?.progress)||0;
    if(p>=100)return 'done';
    if(p>0&&p<35)return 'warn';
    return 'active';
  };
  const stagesV5361=()=>Array.isArray(demoData.activities)?demoData.activities:[];

  const agendaRowsV5361=()=>stagesV5361().slice(0,10).map((item,index)=>{
    const progress=Math.max(0,Math.min(100,Number(item.progress)||0));
    const next=
      progress>=100?'Fechamento e comprovação':
      progress>=60?'Medição e liberação':
      progress>=25?'Execução e conferência':
      'Preparação e mobilização';
    return `<button type="button" class="stage-agenda-row-v5361" data-v5361-open-stage="${stageKey(item)}">
      <time>${esc(stageWeek(item,index))}</time>
      <span><b>${esc(item.name||'Etapa')}</b><small>${esc(next)} · ${esc(item.owner||'Responsável a definir')}</small></span>
      <em>${progress}%</em>
    </button>`;
  }).join('');

  const scheduleCardsV5361=()=>stagesV5361().map((item,index)=>{
    const progress=Math.max(0,Math.min(100,Number(item.progress)||0));
    return `<button type="button" class="stage-schedule-card-v5361 ${stageTone(item)}" data-v5361-open-stage="${stageKey(item)}">
      <span>${esc(stageWeek(item,index))}</span>
      <h2>${esc(item.name||'Etapa')}</h2>
      <p>${esc(item.owner||'Responsável a definir')}</p>
      <i><em style="width:${progress}%"></em></i>
      <footer><b>${progress}%</b><small>${esc(stageStatus(item))} · abrir etapa →</small></footer>
    </button>`;
  }).join('');

  const landingV5361=()=>{
    const stages=stagesV5361();
    const active=stages.filter(item=>{const p=Number(item.progress)||0;return p>0&&p<100;}).length;
    const done=stages.filter(item=>(Number(item.progress)||0)>=100).length;
    const average=stages.length
      ? Math.round(stages.reduce((sum,item)=>sum+(Number(item.progress)||0),0)/stages.length)
      : 0;

    return `<section class="stages-landing-v5361">
      <header class="stages-landing-head-v5361">
        <div>
          <span>ETAPAS E CRONOGRAMA · VISÃO GERAL</span>
          <h1>Agenda e cronograma</h1>
          <p>Primeira página para leitura da implantação. Abra uma etapa para entrar na página operacional detalhada.</p>
        </div>
        <div class="stages-landing-kpis-v5361">
          <article><small>Etapas</small><b>${stages.length}</b></article>
          <article><small>Ativas</small><b>${active}</b></article>
          <article><small>Concluídas</small><b>${done}</b></article>
          <article><small>Avanço médio</small><b>${average}%</b></article>
        </div>
      </header>

      <div class="stages-landing-grid-v5361">
        <section class="stages-schedule-v5361">
          <header><div><span>CRONOGRAMA</span><h2>Calendário de cards das etapas</h2></div><small>Uma representação gráfica principal</small></header>
          <div class="stages-schedule-scroll-v5361">
            ${scheduleCardsV5361()||'<p class="stages-empty-v5361">Nenhuma etapa disponível.</p>'}
          </div>
        </section>

        <aside class="stages-agenda-v5361">
          <header>
            <div><span>AGENDA</span><h2>Próximas atividades</h2></div>
            <button type="button" data-v5361-open-agenda-page>${ico('calendar-days')} Agenda completa</button>
          </header>
          <div class="stages-agenda-list-v5361">
            ${agendaRowsV5361()||'<p class="stages-empty-v5361">Nenhuma atividade disponível.</p>'}
          </div>
        </aside>
      </div>
    </section>`;
  };

  ViewLayer.prototype.stages=function(){
    const state=appStore.get();
    if(state.stagesPageV5361!=='detail')return landingV5361();

    let html='';
    try{
      html=detailTemplate.call(this);
    }catch(error){
      console.error('[Aliança Park v5.3.61] stage detail render',error);
      html=`<section class="stage-detail-error-v5361"><h2>Página da etapa indisponível</h2><p>${esc(error.message||String(error))}</p></section>`;
    }

    const selected=stagesV5361().find(item=>stageKey(item)===String(appStore.get().stageSelected||''));
    return `<section class="stage-detail-shell-v5361">
      <header class="stage-detail-nav-v5361">
        <button type="button" data-v5361-stage-back>${ico('arrow-left')} Agenda e cronograma</button>
        <div><span>PÁGINA DA ETAPA</span><b>${esc(selected?.name||'Etapa em foco')}</b></div>
      </header>
      <div class="stage-detail-current-v5361">${html}</div>
    </section>`;
  };

  const activatePlanningPaneV5361=(root,name,source)=>{
    const panel=
      source.closest('.stage-planning-panel') ||
      source.closest('.stage-planner-panel') ||
      source.closest('.utility-content')?.parentElement ||
      root;

    const directTabs=[...panel.querySelectorAll('[data-stage-plan]')];
    const directPanes=[...panel.querySelectorAll('[data-stage-pane]')];
    if(directTabs.length&&directPanes.length){
      directTabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.stagePlan===name));
      directPanes.forEach(pane=>{
        const visible=pane.dataset.stagePane===name;
        pane.hidden=!visible;
        pane.classList.toggle('active',visible);
      });
      appStore.set({lastAction:`Abriu ${source.textContent.trim()} na página da etapa`});
      return true;
    }

    const legacyTabs=[...panel.querySelectorAll('[data-stage-pane-tab]')];
    const legacyPanes=[...panel.querySelectorAll('[data-stage-pane]')];
    if(legacyTabs.length&&legacyPanes.length){
      legacyTabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.stagePaneTab===name));
      legacyPanes.forEach(pane=>{
        const visible=pane.dataset.stagePane===name;
        pane.hidden=!visible;
        pane.classList.toggle('active',visible);
      });
      appStore.set({lastAction:`Abriu ${source.textContent.trim()} na página da etapa`});
      return true;
    }

    const utilityTabs=[...panel.querySelectorAll('[data-utility-tab]')];
    const utilityPanes=[...panel.querySelectorAll('[data-pane]')];
    if(utilityTabs.length&&utilityPanes.length){
      utilityTabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.utilityTab===name));
      utilityPanes.forEach(pane=>{
        const visible=pane.dataset.pane===name;
        pane.hidden=!visible;
        pane.classList.toggle('active',visible);
      });
      appStore.set({lastAction:`Abriu ${source.textContent.trim()} na página da etapa`});
      return true;
    }
    return false;
  };

  ViewLayer.prototype.bind=function(){
    baseBind?.call(this);

    this.querySelectorAll('[data-v5361-open-stage]').forEach(button=>
      button.addEventListener('click',()=>{
        const key=button.dataset.v5361OpenStage;
        appStore.set({
          stageSelected:key,
          stagesPageV5361:'detail',
          activityDedicated:true,
          lastAction:`Abriu página detalhada da etapa ${key}`
        });
      })
    );

    this.querySelector('[data-v5361-stage-back]')?.addEventListener('click',()=>{
      appStore.set({
        stagesPageV5361:'landing',
        activityDedicated:false,
        lastAction:'Voltou para Agenda e cronograma'
      });
    });

    this.querySelector('[data-v5361-open-agenda-page]')?.addEventListener('click',()=>{
      appStore.set({view:'agenda',lastAction:'Abriu Agenda completa a partir de Etapas'});
    });

    if(!this.__stagePlanningCaptureV5361){
      this.__stagePlanningCaptureV5361=true;
      this.addEventListener('click',event=>{
        const plan=event.target.closest?.('[data-stage-plan]');
        if(plan&&this.contains(plan)){
          event.preventDefault();
          event.stopImmediatePropagation();
          activatePlanningPaneV5361(this,plan.dataset.stagePlan,plan);
          return;
        }

        const legacy=event.target.closest?.('[data-stage-pane-tab]');
        if(legacy&&this.contains(legacy)){
          event.preventDefault();
          event.stopImmediatePropagation();
          activatePlanningPaneV5361(this,legacy.dataset.stagePaneTab,legacy);
          return;
        }

        const utility=event.target.closest?.('[data-utility-tab]');
        if(utility&&this.contains(utility)){
          event.preventDefault();
          event.stopImmediatePropagation();
          activatePlanningPaneV5361(this,utility.dataset.utilityTab,utility);
          return;
        }

        const relate=event.target.closest?.('[data-stage-relate]');
        if(relate&&this.contains(relate)){
          event.preventDefault();
          event.stopImmediatePropagation();
          notify('Relação pronta para ser rotulada entre as etapas.','success');
          appStore.set({lastAction:'Abriu criação de relação entre etapas'});
          return;
        }

        const todo=event.target.closest?.('[data-plan-todo],.utility-add-todo');
        if(todo&&this.contains(todo)){
          event.preventDefault();
          event.stopImmediatePropagation();
          notify('Novo afazer preparado para a etapa.','success');
          appStore.set({lastAction:'Preparou novo afazer da etapa'});
        }
      },true);
    }

    window.lucide?.createIcons();
  };

  globalThis.__BELAVISTA_STAGES_LANDING_V5361={
    version:'5.3.61',
    installedAt:new Date().toISOString(),
    detailRendererCaptured:Boolean(detailTemplate)
  };

  if(appStore.get().view==='stages'){
    appStore.set({
      stagesPageV5361:appStore.get().stagesPageV5361||'landing',
      lastAction:'Etapas v5.3.61 carregada'
    });
  }
};


// BELAVISTA_FINAL_UI_V5362
globalThis.installBelavistaFinalUiV5362=()=>{
  if(!globalThis.__BELAVISTA_V5362_BASE_BIND)globalThis.__BELAVISTA_V5362_BASE_BIND=ViewLayer.prototype.bind;
  const baseBind=globalThis.__BELAVISTA_V5362_BASE_BIND;
  const tone=value=>/concl|feito|final|valid|aprov/i.test(String(value||''))?'done':(/pend|atras|risco|bloq/i.test(String(value||''))?'warning':'active');
  const stageOf=r=>String(r?.etapa||r?.stage||r?.atividade||'Etapa operacional');
  const periodOf=(a,i)=>String(a?.week||a?.period||a?.date||a?.data||a?.startDate||`Fase ${String(i+1).padStart(2,'0')}`);

  ViewLayer.prototype.map=function(){
    const operationalFilter=appStore.get().mapFilter||'execution';
    const operationalStatus=highlightStatus[operationalFilter]||highlightStatus.execution;
    const operationalProgress=Math.max(0,Math.min(100,Number(operationalStatus.progress)||0));
    return `<section class="admin-public-map-interface-v5352 operational-map-highlights-v5370" data-highlight-family="operational" data-highlight-key="${esc(operationalFilter)}" aria-label="Mapa operacional com destaques físicos">
      <aside class="admin-public-map-status-v5352" data-highlight-status="${esc(operationalFilter)}" aria-live="polite">
        <span>${esc(operationalStatus.eyebrow)}</span>
        <header><div><h2>${esc(operationalStatus.title)}</h2><small>${esc(operationalStatus.status)}</small></div><b>${operationalProgress}%</b></header>
        <i><em style="width:${operationalProgress}%"></em></i>
        <p>${esc(operationalStatus.detail)}</p>
        <div class="operational-map-highlight-meta-v5370"><span>APLICADO NO MODELO 3D</span><b>${esc(operationalStatus.priority)}</b></div>
        <footer><small>${esc(operationalStatus.next)}</small><button type="button" data-view="${esc(operationalStatus.view)}">Abrir contexto</button></footer>
      </aside>
      <map-filter-rail></map-filter-rail>
    </section>`;
    const state=appStore.get();
    const reservations=(state.publicReservations||[]).slice(0,5);
    const notifications=(state.operationalNotifications||[]).slice(0,5);
    const acts=(demoData.activities||[]).slice(0,6);
    const profiles=(typeof commissionProfiles!=='undefined'&&Array.isArray(commissionProfiles))?commissionProfiles:[];
    const deals=(typeof commissionDeals!=='undefined'&&Array.isArray(commissionDeals))?commissionDeals:[];
    const commissionOpen=Boolean(state.dashboardCommissionOpenV5362);
    const selected=profiles.find(p=>p.id===state.dashboardCommissionBrokerV5362)||null;
    const latest=id=>deals.filter(d=>d.profile===id).slice().reverse()[0]||null;
    const nav=[['stages','workflow','Etapas'],['records','clipboard-pen-line','Diário'],['leads','users-round','Leads'],['finance','wallet-cards','Financeiro'],['reports','chart-no-axes-combined','Relatórios']];
    const rows=(items,kind)=>items.map((item,i)=>{
      if(kind==='r')return `<article><span><b>${esc(item.client||item.name||'Interessado')}</b><small>${esc(item.lot||'Lote a definir')}</small></span><em>${esc(item.status||'Reserva')}</em></article>`;
      if(kind==='n')return `<article><span><b>${esc(item.title||'Notificação')}</b><small>${esc(item.message||'')}</small></span><em>${esc(item.severity||'info')}</em></article>`;
      return `<article><span><b>${esc(item.name||'Atividade')}</b><small>${esc(item.owner||'Responsável')} · ${esc(periodOf(item,i))}</small></span><em>${Number(item.progress)||0}%</em></article>`;
    }).join('');
    let commissions='';
    if(commissionOpen){
      if(selected){
        const last=latest(selected.id);
        commissions=`<section class="dashboard-commission-v5362" data-map-widget><header><div><span>COMISSÕES · CORRETOR</span><h2>${esc(selected.name)}</h2></div><button data-v5362-commission-close>×</button></header><div class="dashboard-broker-detail-v5362"><button data-v5362-broker-back>← Corretores</button><dl><dt>CRECI</dt><dd>${esc(selected.creci||'—')}</dd><dt>Vendas</dt><dd>${esc(selected.sales||0)}</dd><dt>Comissão</dt><dd>${esc(selected.commission||'—')}</dd><dt>Conversão</dt><dd>${esc(selected.conversion||'—')}</dd><dt>Última atividade</dt><dd>${last?esc(`${last.status} · ${last.lot} · ${last.date}`):'Sem atividade recente'}</dd></dl><div class="dashboard-broker-actions-v5362"><button data-v5362-correction="${selected.id}">${ico('pencil-line')} Correção</button><button data-v5362-commission="${selected.id}">${ico('badge-dollar-sign')} Comissão</button></div></div></section>`;
      }else{
        commissions=`<section class="dashboard-commission-v5362" data-map-widget><header><div><span>COMISSÕES</span><h2>Corretores · última atividade</h2></div><button data-v5362-commission-close>×</button></header><div class="dashboard-brokers-v5362">${profiles.map(p=>{const last=latest(p.id);return `<button class="dashboard-broker-v5362" data-v5362-broker="${p.id}"><span><b>&gt; ${esc(p.name)}</b><small>${last?esc(`${last.status} · ${last.lot} · ${last.date}`):'Sem atividade recente'}</small></span><em>${esc(p.commission||'—')}</em></button>`}).join('')||'<p>Nenhum corretor registrado.</p>'}</div><footer><button data-view="commissions">Carteira completa</button></footer></section>`;
      }
    }
    return `<section class="dashboard-map-v5362"><nav class="dashboard-nav-v5362" data-map-widget>${nav.map(([v,ic,l])=>`<button data-view="${v}">${ico(ic)}<span>${l}</span></button>`).join('')}<button data-v5362-commission-toggle>${ico('badge-dollar-sign')}<span>Comissões</span></button></nav><div class="dashboard-widgets-v5362"><section class="dashboard-widget-v5362" data-map-widget><header><div><span>RESERVAS</span><h2>${reservations.length} acompanhadas</h2></div><button data-view="leads">Abrir</button></header><div>${rows(reservations,'r')||'<p>Nenhuma reserva.</p>'}</div><footer><button data-view="leads">Revisar reservas</button></footer></section><section class="dashboard-widget-v5362" data-map-widget><header><div><span>NOTIFICAÇÕES</span><h2>${notifications.length} recentes</h2></div><button data-view="reports">Abrir</button></header><div>${rows(notifications,'n')||'<p>Aguardando realtime.</p>'}</div><footer><button data-view="records">Diário</button></footer></section><section class="dashboard-widget-v5362" data-map-widget><header><div><span>ATIVIDADES</span><h2>${acts.length} no calendário</h2></div><button data-view="stages">Abrir</button></header><div>${rows(acts,'a')}</div><footer><button data-view="stages">Calendário</button><button data-view="records">Registros</button></footer></section></div>${commissions}</section>`;
  };

  ViewLayer.prototype.stages=function(){
    const acts=Array.isArray(demoData.activities)?demoData.activities:[];
    const groups=[];
    acts.forEach((a,i)=>{const p=periodOf(a,i);let g=groups.find(x=>x.period===p);if(!g){g={period:p,items:[]};groups.push(g)}g.items.push(a)});
    return `<section class="stage-calendar-page-v5362"><header class="workspace-head-v5362"><span>ETAPAS E CRONOGRAMA</span><h1>Calendário de atividades</h1><p>Uma única representação gráfica da execução, organizada por cards.</p></header><div class="stage-calendar-v5362">${groups.map(g=>`<section class="stage-column-v5362"><header><span>PERÍODO</span><b>${esc(g.period)}</b></header><div>${g.items.map(a=>`<button class="stage-card-v5362" data-tone="${tone(a.status)}" data-v5362-activity="${esc(a.id||a.name||'')}"><span>${esc(a.status||'Planejada')}</span><h2>${esc(a.name||'Atividade')}</h2><p>${esc(a.owner||'Responsável a definir')}</p><i><em style="width:${Math.max(0,Math.min(100,Number(a.progress)||0))}%"></em></i><footer><b>${Number(a.progress)||0}%</b><small>Abrir atividade →</small></footer></button>`).join('')}</div></section>`).join('')||'<p>Nenhuma atividade disponível.</p>'}</div></section>`;
  };

  ViewLayer.prototype.records=function(){
    const state=appStore.get(),records=Array.isArray(state.records)?state.records:[];
    const selected=records.find(r=>String(r.id)===String(state.selectedRecordV5362||''));
    if(selected)return `<section class="record-dedicated-page-v5362"><header class="workspace-head-v5362"><span>DIÁRIO · REGISTRO DEDICADO</span><h1>${esc(selected.atividade||'Registro operacional')}</h1><p>${esc(stageOf(selected))} · ${esc(selected.data||'Sem data')} ${esc(selected.hora||'')}</p><button data-v5362-record-back>${ico('arrow-left')} Voltar</button></header><div class="record-kpis-v5362"><article><small>Registro</small><b>${esc(selected.id||'—')}</b></article><article><small>Etapa</small><b>${esc(stageOf(selected))}</b></article><article><small>Responsável</small><b>${esc(selected.responsavel||'A definir')}</b></article><article><small>Status</small><b>${esc(selected.status||'Pendente')}</b></article></div><section class="record-dedicated-body-v5362"><span>APONTAMENTO / MEDIÇÃO</span><p>${esc(selected.detalhes||'Nenhum detalhe informado.')}</p></section></section>`;
    const complete=records.filter(r=>/concl|feito|final/i.test(String(r.status||''))).length,stages=new Set(records.map(stageOf));
    return `<section class="records-table-page-v5362"><header class="workspace-head-v5362"><span>DIÁRIO · ATIVIDADES NAS ETAPAS</span><h1>Registros operacionais</h1><p>Fatos, medições e evidências vinculados às atividades.</p></header><div class="records-kpis-v5362"><article><small>Registros</small><b>${records.length}</b></article><article><small>Concluídos</small><b>${complete}</b></article><article><small>Pendentes</small><b>${Math.max(0,records.length-complete)}</b></article><article><small>Etapas</small><b>${stages.size}</b></article></div><div class="records-table-v5362"><table><thead><tr><th>Registro / data</th><th>Etapa / atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th><th>Página</th></tr></thead><tbody>${records.slice().reverse().map(r=>`<tr><td><b>${esc(r.id||'REG')}</b><small>${esc(r.data||'—')} ${esc(r.hora||'')}</small></td><td><b>${esc(stageOf(r))}</b><small>${esc(r.atividade||'Atividade')}</small></td><td>${esc(r.responsavel||'A definir')}</td><td>${esc(r.detalhes||'Sem apontamento')}</td><td>${esc(r.status||'Pendente')}</td><td><button data-v5362-record="${esc(r.id||'')}">Abrir página</button></td></tr>`).join('')||'<tr><td colspan="6">Nenhum registro cadastrado.</td></tr>'}</tbody></table></div></section>`;
  };

  ViewLayer.prototype.bind=function(){
    baseBind?.call(this);
    this.querySelectorAll('[data-v5362-record]').forEach(b=>b.addEventListener('click',()=>appStore.set({selectedRecordV5362:b.dataset.v5362Record,lastAction:'Abriu registro'})));
    this.querySelector('[data-v5362-record-back]')?.addEventListener('click',()=>appStore.set({selectedRecordV5362:null,lastAction:'Voltou ao Diário'}));
    this.querySelectorAll('[data-v5362-activity]').forEach(b=>b.addEventListener('click',()=>appStore.set({view:'activities',selectedActivity:b.dataset.v5362Activity,activityDedicated:true,lastAction:'Abriu atividade'})));
    this.querySelector('[data-v5362-commission-toggle]')?.addEventListener('click',()=>{const s=appStore.get();appStore.set({dashboardCommissionOpenV5362:!s.dashboardCommissionOpenV5362,dashboardCommissionBrokerV5362:null,lastAction:'Comissões rápidas'})});
    this.querySelector('[data-v5362-commission-close]')?.addEventListener('click',()=>appStore.set({dashboardCommissionOpenV5362:false,dashboardCommissionBrokerV5362:null}));
    this.querySelectorAll('[data-v5362-broker]').forEach(b=>b.addEventListener('click',()=>appStore.set({dashboardCommissionOpenV5362:true,dashboardCommissionBrokerV5362:b.dataset.v5362Broker})));
    this.querySelector('[data-v5362-broker-back]')?.addEventListener('click',()=>appStore.set({dashboardCommissionOpenV5362:true,dashboardCommissionBrokerV5362:null}));
    this.querySelectorAll('[data-v5362-commission]').forEach(b=>b.addEventListener('click',()=>appStore.set({view:'commissions',selectedCommissionProfile:b.dataset.v5362Commission,lastAction:'Abriu comissão'})));
    this.querySelectorAll('[data-v5362-correction]').forEach(b=>b.addEventListener('click',()=>appStore.set({view:'commissions',commissionEditorOpen:true,commissionFilters:{query:'',status:'all',profile:b.dataset.v5362Correction},lastAction:'Abriu correção'})));
    window.lucide?.createIcons();
  };

  globalThis.__BELAVISTA_FINAL_UI_V5362={version:'5.3.62',installedAt:new Date().toISOString()};
};
globalThis.installBelavistaFinalUiV5362();

// BELAVISTA_OPERATIONAL_MAP_HIGHLIGHTS_V5370
// Mantém o mapa operacional como uma superfície física de leitura. O filtro
// selecionado governa o painel e a mesma frente é aplicada aos polígonos 3D.
// Este override final evita que as camadas legadas de dashboard substituam o
// mapa operacional durante a navegação.
ViewLayer.prototype.map=function(){
  const filter=appStore.get().mapFilter||'execution';
  const status=highlightStatus[filter]||highlightStatus.execution;
  const progress=Math.max(0,Math.min(100,Number(status.progress)||0));
  return `<section class="admin-public-map-interface-v5352 operational-map-highlights-v5370" data-highlight-family="operational" data-highlight-key="${esc(filter)}" aria-label="Mapa operacional com destaques físicos">
    <aside class="admin-public-map-status-v5352" data-highlight-status="${esc(filter)}" aria-live="polite">
      <span>${esc(status.eyebrow)}</span>
      <header><div><h2>${esc(status.title)}</h2><small>${esc(status.status)}</small></div><b>${progress}%</b></header>
      <i><em style="width:${progress}%"></em></i>
      <p>${esc(status.detail)}</p>
      <div class="operational-map-highlight-meta-v5370"><span>APLICADO NO MODELO 3D</span><b>${esc(status.priority)}</b></div>
      <footer><small>${esc(status.next)}</small><button type="button" data-view="${esc(status.view)}">Abrir contexto</button></footer>
    </aside>
    <map-filter-rail></map-filter-rail>
  </section>`;
};

// BELAVISTA_BROKER_PROFILE_V9
// Carteira dedicada: a navegação abre uma tabela auditável de repasse. Os
// controles de aplicação e impressão ficam fora da área imprimível.
const brokerProfileRowsV9=(profile,state)=>{
  const rules=brokerReasonsV9(state),all=[...commissionDeals,...(state.commissionEntries||[])].filter(item=>item.profile===profile.id),used=new Map();
  const keyFor=deal=>{
    const text=`${deal.reason||''} ${deal.payment||''} ${deal.stage||''}`.toLocaleLowerCase('pt-BR');
    if(/mensal|parcela mensal/.test(text))return 'monthly';
    if(/intermedi/.test(text))return 'intermediate';
    if(/sinal|entrada|reserva/.test(text))return 'signal';
    const index=used.get(profile.id)||0;used.set(profile.id,index+1);return rules[index%rules.length]?.id||'signal';
  };
  return all.map(deal=>{const reason=rules.find(item=>item.id===keyFor(deal))||rules[0],value=brlToNumber(deal.value),commission=brlToNumber(deal.commission),warley=commission*Number(reason.warley||0)/100,partner=commission-warley;return {...deal,reason,numberValue:value,numberCommission:commission,warley,partner};});
};
ViewLayer.prototype.commissionProfile=function(profile){
  const state=appStore.get(),rows=brokerProfileRowsV9(profile,state),totalValue=rows.reduce((sum,item)=>sum+item.numberValue,0),totalCommission=rows.reduce((sum,item)=>sum+item.numberCommission,0),totalWarley=rows.reduce((sum,item)=>sum+item.warley,0),totalPartner=rows.reduce((sum,item)=>sum+item.partner,0),rules=brokerReasonsV9(state);
  return `<section class="commission-profile-page broker-profile-dedicated"><div class="broker-profile-toolbar no-print"><button type="button" class="commission-back" data-commission-back>${ico('arrow-left')} Todas as comissões</button><div class="broker-profile-toolbar-actions"><button type="button" class="toolbar-action" data-broker-apply-rules>${ico('refresh-cw')} Aplicar regras atuais</button><button type="button" class="toolbar-action" data-broker-print>${ico('printer')} Imprimir / PDF</button></div></div><header class="commission-profile-header"><div class="commission-avatar commission-avatar-large" style="background:${profile.avatar}">${profile.initials}</div><div><span class="activity-kind">CARTEIRA DEDICADA · ${esc(profile.creci)}</span><h1>${esc(profile.name)}</h1><p>${esc(profile.role)} · ${profile.sales} vendas atribuídas no ciclo</p></div><aside><small>Comissão estimada</small><b>${esc(profile.commission)}</b><span>Conversão ${esc(profile.conversion)}</span></aside></header><div class="commission-profile-summary"><div><small>Valor da carteira</small><b>${formatBRL(totalValue)}</b><span>${rows.length} negócio(s) tabulado(s)</span></div><div><small>Comissão total</small><b>${formatBRL(totalCommission)}</b><span>${formatBRL(totalWarley)} Warley · ${formatBRL(totalPartner)} contraparte</span></div><div><small>Competências</small><b>Mensal · anual · acumulado</b><span>Filtro definido na central de corretores</span></div></div><section class="broker-profile-rule-strip no-print"><span class="activity-kind">REGRAS APLICADAS NESTA VISÃO</span>${rules.map(rule=>`<span><b>${esc(rule.label)}</b><small>${rule.warley}% Warley / ${rule.partner}% contraparte · ${Number(rule.sharePercent??0).toLocaleString('pt-BR')}% composição</small></span>`).join('')}<small data-broker-apply-status>${state.commissionRulesAppliedAt?'Aplicadas em '+new Date(state.commissionRulesAppliedAt).toLocaleString('pt-BR'):'Clique em “Aplicar regras atuais” para registrar a aplicação.'}</small></section><section class="commission-deal-section broker-profile-ledger"><header><div><span class="activity-kind">TABELAÇÃO COMPLETA · REPASSE</span><h2>Negócios, comissão e divisão</h2></div><small>${rows.length} relações lote → cliente → comissão · esta tabela é a fonte da impressão.</small></header><div class="control-table-wrap"><table class="commission-ledger-table"><thead><tr><th>Contrato</th><th>Lote / cliente</th><th>Razão / pagamento</th><th>Valor da venda</th><th>Comissão</th><th>Warley</th><th>Contraparte</th><th>Situação</th></tr></thead><tbody>${rows.map(row=>`<tr><td><b>${esc(row.id)}</b><small>${esc(row.date||'Sem data')}</small></td><td><b>${esc(row.lot)}</b><small>${esc(row.client)}</small></td><td><b>${esc(row.reason.label)}</b><small>${esc(row.reason.payment)}</small></td><td>${formatBRL(row.numberValue)}</td><td><b>${formatBRL(row.numberCommission)}</b><small>${esc(row.rate||'Taxa cadastrada')}</small></td><td>${formatBRL(row.warley)}</td><td>${formatBRL(row.partner)}</td><td><span class="control-status">${esc(row.status||row.stage||'Em acompanhamento')}</span></td></tr>`).join('')||'<tr><td colspan="8">Nenhum negócio vinculado a esta carteira.</td></tr>'}</tbody><tfoot><tr><th colspan="3">TOTAL DA CARTEIRA</th><th>${formatBRL(totalValue)}</th><th>${formatBRL(totalCommission)}</th><th>${formatBRL(totalWarley)}</th><th>${formatBRL(totalPartner)}</th><th>${rows.length} negócio(s)</th></tr></tfoot></table></div></section><section class="commission-deal-section broker-profile-deals no-print"><header><div><span class="activity-kind">DOCUMENTOS COMERCIAIS</span><h2>Abrir relação detalhada</h2></div><small>O contrato individual continua disponível sem poluir a impressão da carteira.</small></header><div class="commission-deal-grid">${rows.map(row=>`<button type="button" class="commission-deal-card" data-commission-contract="${esc(row.id)}"><div class="deal-card-head"><span>${esc(row.status||'Em acompanhamento')}</span><small>${esc(row.id)}</small></div><div class="deal-lot-mark">${ico('map-pin')} <b>${esc(row.lot)}</b></div><h3>${esc(row.client)}</h3><p>${esc(row.quadra||'Lote vinculado')}</p><footer><span>${esc(row.stage||row.reason.label)}</span>${ico('arrow-up-right')}</footer></button>`).join('')}</div></section></section>`;
};

const brokerProfileBindBaseV9=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  brokerProfileBindBaseV9?.call(this);
  const page=this.querySelector('.broker-profile-dedicated');
  if(!page)return;
  page.querySelector('[data-broker-apply-rules]')?.addEventListener('click',()=>{const appliedAt=new Date().toISOString();appStore.set({commissionRulesAppliedAt:appliedAt,lastAction:'Aplicou regras de repasse na carteira dedicada'});notify('Regras atuais aplicadas à tabela da carteira.','success');});
  page.querySelector('[data-broker-print]')?.addEventListener('click',()=>window.print());
};

// Dashboard inicial leve: widgets e ações ficam na área superior; o mapa
// continua sendo acessado sob demanda pelo botão de contexto.
ViewLayer.prototype.assistant=function(){
  const state=appStore.get(),cash=state.cashSummary||{},stages=demoData.activities||[],notifications=state.operationalNotifications||[],records=state.records||[],widgets=[['stages','workflow','Etapas'],['records','clipboard-pen-line','Diário'],['leads','users-round','Leads'],['brokers','users-round','Corretores'],['finance','wallet-cards','Financeiro'],['reports','chart-no-axes-combined','Relatórios'],['settings','settings','Ajustes']];
  const cashBalance=Number(cash.balanceCents||0)/100,active=stages.filter(item=>Number(item.progress)>0&&Number(item.progress)<100).length,completed=stages.filter(item=>Number(item.progress)>=100).length;
  const widget=(title,eyebrow,body,view,icon,meta)=>`<article class="dashboard-carbon-widget"><header><div><span>${eyebrow}</span><h2>${title}</h2></div><button type="button" data-view="${view}" aria-label="Abrir ${title}">${ico('arrow-up-right')}</button></header><p>${body}</p><footer><small>${meta}</small><button type="button" data-view="${view}">Abrir contexto</button></footer></article>`;
  return `<section class="dashboard-home dashboard-carbon-home"><header class="dashboard-carbon-head"><div><span class="activity-kind">DASHBOARD INICIAL · ALIANÇA PARK</span><h1>Panorama operacional</h1><p>Registros rápidos e leitura de status, com o mapa aberto somente quando necessário.</p></div><div class="dashboard-top-action-row"><button type="button" class="carbon-top-button" data-view="map">${ico('map')} Mapa</button><button type="button" class="carbon-top-button" data-view="reports">${ico('file-chart-column')} Relatórios</button><button type="button" class="carbon-top-button primary" data-view="records">${ico('plus')} Novo registro</button></div></header><section class="dashboard-carbon-kpis"><article class="dashboard-cash-kpi"><small>CAIXA MESTRE · DONO</small><b>${formatBRL(cashBalance)}</b><span>Base para a distribuição das etapas</span></article><article><small>Frentes ativas</small><b>${active}</b><span>${completed} concluídas</span></article><article><small>Notificações</small><b>${notifications.length}</b><span>Ciência do agente</span></article><article><small>Registros no histórico</small><b>${records.length}</b><span>Somente consulta no Diário</span></article></section><nav class="carbon-widget-bar dashboard-initial-widget-bar" aria-label="Interfaces operacionais">${widgets.map(([view,icon,label])=>`<button type="button" data-view="${view}">${ico(icon)}<span>${label}</span></button>`).join('')}</nav><section class="dashboard-carbon-widget-grid">${widget('Próxima frente','PRIORIDADE PELO CAIXA','A etapa elegível é recalculada pelas dependências, cobertura financeira e materiais registrados.','stages','workflow',`${active} frentes em acompanhamento`)}${widget('Registros rápidos','APONTAMENTOS DE CAMPO','Abra a interface para registrar produção, unidade de medida, evidências e responsável.','records','clipboard-pen-line',`${records.length} registro(s) preservado(s)`)}${widget('Atendimento de leads','COMERCIAL','Consulte reservas, conversas, documentos e o vínculo de cada cliente ao lote.','leads','users-round',`${(state.publicLeads||[]).length} leads recebidos`)}${widget('Comissões','CARTEIRAS','Navegue por cards de corretores e aplique a regra na página dedicada.','brokers','users-round','Mensal · anual · acumulado')}</section></section>`;
};

// STAGES_V9: árvore de diretrizes, etapas e atividades dedicadas.
// Este bloco fica no fim do módulo para ser o último contrato visual aplicado;
// os dados continuam vindo do executionModel, do caixa e dos registros locais.
const stageV9LiveFor=stage=>{
  const activities=Array.isArray(demoData.activities)?demoData.activities:[];
  return activities.find(item=>item.id===stage.id||item.name===stage.name)||activities.find(item=>stageOverlayKey(item.name)===stageOverlayKey(stage.name))||{};
};
const stageV9ByState=state=>{
  const stages=Array.isArray(executionModel.stages)?executionModel.stages:[];
  return stages.find(item=>String(item.key)===String(state.selectedStageV9||''))||stages.find(item=>String(item.key)===String(state.selectedStage||''))||stages.find(item=>String(item.id)===String(state.selectedStage||''))||stages.find(item=>item.name===state.selectedStage)||stages[0];
};
const stageV9OperationalFor=(stage,state=appStore.get())=>{
  const rows=state.operationalState?.stages||state.operationalState?.stageAllocations||[];
  return rows.find(item=>item.key===stage.key||item.stageKey===stage.key||item.name===stage.name)||{};
};
const stageV9ProfileFor=(stage)=>{
  const saved=stageProfileSettingsFor(stage.key)||{};
  return {...(stage.executionProfile||{}),...saved};
};
const stageV9ProductionFor=stage=>{
  const production=stage.production||{};
  return `${production.quantity==null?'—':production.quantity.toLocaleString?.('pt-BR')||production.quantity} ${production.unit||'un.'} · ${production.rate||'—'} ${production.rateUnit||''}`.trim();
};
const stageV9MaterialsFor=stage=>{
  const configured=stageMaterialsFor(stage.name);
  if(configured.length)return configured;
  return (stage.materials||[]).map((name,index)=>({name,scope:'Requisito operacional',quantity:null,unit:'—',status:index===0?'Principal':'Planejado'}));
};
const stageV9BudgetFor=(stage,state=appStore.get())=>{
  const operational=stageV9OperationalFor(stage,state),cents=Number(operational.needCents||operational.budgetCents||0);
  return cents>0?cents/100:2800000*Number(stage.cashWeight||0);
};
const stageV9StatusFor=live=>Number(live.progress)>=100?'Concluída':Number(live.progress)>0?'Em andamento':'Planejada';
const stageV9DirectiveText=(stage,profile)=>profile.typicalDescription||`A inteligência acompanha ${stage.name.toLowerCase()} por produção, caixa, dependências e comprovações.`;
const stageV9FlowPackets=stage=>{
  const production=stage.production||{};
  return [
    {key:'front',label:'Preparar frente',detail:'Confirmar equipe, área liberada, materiais e segurança.',trigger:'Fato: frente liberada',unit:'checklist'},
    {key:'execute',label:'Executar atividade',detail:`Medir ${production.unit||'produção'} conforme a unidade cadastrada.`,trigger:'Fato: produção apontada',unit:production.rateUnit||production.unit||'un.'},
    {key:'measure',label:'Validar medição',detail:'Conferir quantidade, evidência, orçamento e responsável.',trigger:'Fato: evidência anexada',unit:'medição'},
    {key:'release',label:'Liberar próxima frente',detail:'Propagar status, pedido e notificação somente após validação.',trigger:'Diretriz: completude confirmada',unit:'liberação'}
  ];
};
const stageV9EscList=(items,empty='Não configurado')=>Array.isArray(items)&&items.length?items.map(item=>`<li>${esc(item)}</li>`).join(''):`<li>${empty}</li>`;
const stageV9TreeNode=(kind,title,detail,meta='')=>`<article class="stage-v9-tree-node"><span>${esc(kind)}</span><b>${esc(title)}</b><small>${esc(detail)}</small>${meta?`<em>${esc(meta)}</em>`:''}</article>`;

ViewLayer.prototype.stagesCanvas=function(){
  const state=appStore.get(),stages=Array.isArray(executionModel.stages)?executionModel.stages:[],liveByKey=new Map(stages.map(stage=>[stage.key,stageV9LiveFor(stage)]));
  const treeStages=stages.map(stage=>{const profile=stageV9ProfileFor(stage),live=liveByKey.get(stage.key)||{};return stageV9TreeNode('ETAPA · '+stage.key.toUpperCase(),stage.name,stageV9DirectiveText(stage,profile),`${Number(live.progress)||0}% · ${stageV9ProductionFor(stage)}`);}).join('');
  const directives=stages.map((stage,index)=>{const profile=stageV9ProfileFor(stage),live=liveByKey.get(stage.key)||{},materials=stageV9MaterialsFor(stage);return `<article class="stage-v9-directive-card"><header><span>${String(index+1).padStart(2,'0')} · ${esc(stage.key.toUpperCase())}</span><b>${esc(stage.name)}</b><em>${Number(live.progress)||0}%</em></header><p>${esc(stageV9DirectiveText(stage,profile))}</p><div class="stage-v9-rule-grid"><section><small>PRODUÇÃO / TEMPO</small><b>${esc(stageV9ProductionFor(stage))}</b></section><section><small>DEPENDÊNCIAS</small><b>${stage.dependsOn?.length?esc(stage.dependsOn.join(' · ')):'Nenhuma'}</b></section><section><small>GATILHOS DE PEDIDO</small><ul>${stageV9EscList(profile.requestHints,'Aguardando calibração')}</ul></section><section><small>REQUISITOS / MATERIAIS</small><ul>${stageV9EscList(materials.slice(0,3).map(item=>item.name))}</ul></section></div><footer><span>Caixa ${(Number(stage.cashWeight||0)*100).toLocaleString('pt-BR')}% · prioridade ${stage.priority||'—'}</span><button type="button" data-stage-v9="${esc(stage.key)}">Abrir etapa ${ico('arrow-up-right')}</button></footer></article>`;}).join('');
  const stageCards=stages.map((stage,index)=>{const live=liveByKey.get(stage.key)||{},profile=stageV9ProfileFor(stage),operational=stageV9OperationalFor(stage,state);return `<button type="button" class="stage-v9-stage-card" data-stage-v9="${esc(stage.key)}"><header><span>${String(index+1).padStart(2,'0')} · ${esc(stage.key.toUpperCase())}</span><em>${esc(stageV9StatusFor(live))}</em></header><h2>${esc(stage.name)}</h2><p>${esc(stage.week||profile.typicalDescription||'Frente de execução')}</p><div class="stage-v9-progress"><i><b style="width:${Math.max(0,Math.min(100,Number(live.progress)||0))}%"></b></i><strong>${Number(live.progress)||0}%</strong></div><div class="stage-v9-stage-meta"><span>Caixa ${Number(operational.coverage??0).toLocaleString('pt-BR')}% coberto</span><span>${stage.dependsOn?.length?`Depende de ${stage.dependsOn.join(', ')}`:'Ponto de partida'}</span></div><footer>Ver fluxo e requisitos ${ico('arrow-right')}</footer></button>`;}).join('');
  return `<section class="stage-v9-page"><header class="stage-v9-page-head"><div><span class="activity-kind">OBRAS · INTELIGÊNCIA OPERACIONAL</span><h1>Etapas, diretrizes e gatilhos</h1><p>A árvore abaixo organiza os fatos que disparam o agente, as regras que ele aplica e as propagações que aguardam confirmação humana.</p></div><div class="stage-v9-head-status"><b>${stages.length}</b><span>etapas relacionais</span><small>Caixa mestre · prioridade · produção</small></div></header><section class="stage-v9-tree-section"><header><div><span class="activity-kind">01 · ÁRVORE DE RELAÇÕES</span><h2>Como a inteligência decide e propaga</h2><p>Entradas de campo e caixa passam pelas diretrizes antes de gerar pedidos, alertas ou liberação.</p></div><span class="stage-v9-legend"><i class="input"></i> entrada <i class="rule"></i> diretriz <i class="action"></i> ação</span></header><div class="stage-v9-tree"><div class="stage-v9-tree-column">${stageV9TreeNode('ENTRADA','Fato / registro','Medição, foto, documento, compra, caixa ou confirmação do encarregado.','checkbox de completude')}${stageV9TreeNode('ENTRADA','Caixa mestre','Saldo e cobertura financeira informados pelo Dono.','atributo que ordena a urgência')}</div><div class="stage-v9-tree-connector" aria-hidden="true">→</div><div class="stage-v9-tree-column">${stageV9TreeNode('DIRETRIZ','Regras da etapa','Prioridade, dependências, unidade de produção e materiais.','configuração do Administrador')}${stageV9TreeNode('DIRETRIZ','Completude humana','O agente sugere e pergunta; a confirmação de documento/serviço permanece humana.','requisito de propagação')}</div><div class="stage-v9-tree-connector" aria-hidden="true">→</div><div class="stage-v9-tree-column stage-v9-tree-stage-column">${treeStages}</div><div class="stage-v9-tree-connector" aria-hidden="true">→</div><div class="stage-v9-tree-column">${stageV9TreeNode('AÇÃO DO AGENTE','Pedido / organização','Prioriza compra, agenda, responsável e próxima atividade.','notificação contextual')}${stageV9TreeNode('PROPAGAÇÃO','Dono · Admin · Encarregado','Registra no sistema e publica o evento nos canais configurados.','RTDB / WhatsApp quando habilitado')}</div></div></section><section class="stage-v9-directives"><header><div><span class="activity-kind">02 · DIRETRIZES DE DETALHAMENTO</span><h2>Requisição por etapa</h2><p>Materiais, produção, dependências e evidências são a base de cálculo usada pela IA.</p></div><span class="stage-v9-count">${stages.reduce((sum,item)=>sum+(item.materials||[]).length,0)} requisitos modelados</span></header><div class="stage-v9-directive-grid">${directives}</div></section><section class="stage-v9-stage-section"><header><div><span class="activity-kind">03 · NAVEGAÇÃO OPERACIONAL</span><h2>Escolha uma etapa</h2><p>Abra uma superfície dedicada para ver o fluxo atual, linhagens e diário.</p></div></header><div class="stage-v9-stage-grid">${stageCards}</div></section></section>`;
};

ViewLayer.prototype.activityDedicatedPage=function(){
  const state=appStore.get(),stage=stageV9ByState(state)||executionModel.stages[0],live=stageV9LiveFor(stage),profile=stageV9ProfileFor(stage),materials=stageV9MaterialsFor(stage),packets=stageV9FlowPackets(stage),budget=stageV9BudgetFor(stage,state),deps=(stage.dependsOn||[]).map(key=>executionModel.stages.find(item=>item.key===key)?.name||key),targets=profile.notificationTargets||{};
  const flow=packets.map((packet,index)=>`<button type="button" class="stage-v9-activity-card" data-activity-v9="${esc(`${stage.key}:${packet.key}`)}"><header><span>${String(index+1).padStart(2,'0')} · ${esc(packet.unit.toUpperCase())}</span><em>${index===0?'Pronto':index===1&&Number(live.progress)>0?'Em execução':index===2?'Aguardando validação':'Bloqueado por completude'}</em></header><h3>${esc(packet.label)}</h3><p>${esc(packet.detail)}</p><div><small>Gatilho</small><b>${esc(packet.trigger)}</b></div><footer>Em sequência ${index<packets.length-1?ico('arrow-right'):'· liberação'}</footer></button>`).join('');
  const recordRows=(Array.isArray(state.records)?state.records:[]).filter(record=>stage.name===stageOf(record)||String(record.atividade||'').toLowerCase().includes(String(stage.name).toLowerCase().split(' ')[0])).slice(-8).reverse();
  const diary=recordRows.length?recordRows.map(record=>`<tr><td><b>${esc(record.data||'—')}</b><small>${esc(record.hora||'')}</small></td><td>${esc(record.atividade||stage.name)}</td><td>${esc(record.responsavel||'A definir')}</td><td>${esc(record.detalhes||'Sem apontamento')}</td><td><span>${esc(record.status||'Pendente')}</span></td><td>${record.comprovante||record.evidencias?'Anexado':'—'}</td></tr>`).join(''):`<tr><td colspan="6" class="stage-v9-empty-diary">Nenhum apontamento desta etapa no histórico. O primeiro registro confirmado aparecerá aqui.</td></tr>`;
  return `<section class="stage-v9-dedicated-page"><header class="stage-v9-dedicated-head"><button type="button" class="stage-v9-back" data-stage-v9-back>${ico('arrow-left')} Todas as etapas</button><div><span class="activity-kind">ETAPA DEDICADA · ${esc(stage.key.toUpperCase())}</span><h1>${esc(stage.name)}</h1><p>${esc(live.week||'Cronograma operacional')} · ${esc(live.owner||'Responsável a definir')} · unidade ${esc(stage.production?.unit||'produção')}</p></div><aside><small>AVANÇO REGISTRADO</small><b>${Number(live.progress)||0}%</b><span>${esc(stageV9StatusFor(live))}</span></aside></header><section class="stage-v9-status-lines"><div><small>STATUS DA RELAÇÃO</small><b>${deps.length?`Aguardando ${deps.join(', ')}`:'Liberada para início'}</b></div><div><small>CAIXA / ORÇAMENTO</small><b>${formatBRL(budget)}</b><span>peso ${Number(stage.cashWeight||0)*100}% no caixa</span></div><div><small>PRODUÇÃO</small><b>${esc(stageV9ProductionFor(stage))}</b><span>medida validada no diário</span></div><div><small>NOTIFICAÇÕES</small><b>${Object.values(targets).flat().length||0} destinos</b><span>eventos auditáveis</span></div></section><section class="stage-v9-flow-section"><header><div><span class="activity-kind">FLUXOGRAMA ATUAL DE EXECUÇÃO</span><h2>Atividades e linhagens de requisito</h2><p>Clique em qualquer card para abrir o cabeçalho estrutural da atividade e seu diário de obra.</p></div><span class="stage-v9-flow-note">${stage.dependsOn?.length?`↳ depende de ${stage.dependsOn.join(' · ')}`:'↳ início do encadeamento'}</span></header><div class="stage-v9-flow">${flow}</div></section><section class="stage-v9-detail-grid"><article class="stage-v9-detail-card"><span class="activity-kind">DIRETRIZ ATIVA</span><h2>O que dispara esta etapa</h2><p>${esc(stageV9DirectiveText(stage,profile))}</p><h3>Requisitos de evidência</h3><ul>${stageV9EscList(profile.evidenceFocus)}</ul><h3>Pedidos e materiais</h3><ul>${stageV9EscList(profile.procurementFocus||materials.map(item=>item.name))}</ul></article><article class="stage-v9-detail-card"><span class="activity-kind">MATERIAIS PRINCIPAIS</span><h2>Composição da frente</h2><div class="stage-v9-material-list">${materials.map(item=>`<div><b>${esc(item.name)}</b><span>${item.quantity==null?'Quantidade a medir':`${esc(item.quantity)} ${esc(item.unit||'un.')}`}</span><small>${esc(item.status||'Planejado')} · ${esc(item.scope||'Requisito da etapa')}</small></div>`).join('')}</div></article></section><section class="stage-v9-diary"><header><div><span class="activity-kind">DIÁRIO DE OBRA · HISTÓRICO DA ETAPA</span><h2>Registros, medições e comprovantes</h2></div><button type="button" data-view="records">Abrir histórico completo ${ico('arrow-up-right')}</button></header><div class="stage-v9-diary-table-wrap"><table class="stage-v9-diary-table"><thead><tr><th>Data / hora</th><th>Atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th><th>Comprovante</th></tr></thead><tbody>${diary}</tbody></table></div></section></section>`;
};

const activitiesBeforeStagesV9=ViewLayer.prototype.activities;
const stageV9ActivityDetail=activityId=>{
  const [stageKey,packetKey]=String(activityId||'').split(':'),stage=executionModel.stages.find(item=>item.key===stageKey)||executionModel.stages[0],packet=stageV9FlowPackets(stage).find(item=>item.key===packetKey)||stageV9FlowPackets(stage)[0],profile=stageV9ProfileFor(stage),live=stageV9LiveFor(stage),materials=stageV9MaterialsFor(stage),state=appStore.get(),budget=stageV9BudgetFor(stage,state),records=(state.records||[]).filter(record=>stage.name===stageOf(record)||String(record.atividade||'').toLowerCase().includes(stage.name.toLowerCase().split(' ')[0])).slice(-6).reverse();
  return `<section class="stage-v9-activity-detail"><header class="stage-v9-activity-head"><button type="button" class="stage-v9-back" data-activity-v9-back>${ico('arrow-left')} Voltar ao fluxo da etapa</button><div><span class="activity-kind">ATIVIDADE · ${esc(stage.name.toUpperCase())}</span><h1>${esc(packet.label)}</h1><p>${esc(packet.detail)} · ${esc(live.owner||'Responsável a definir')}</p></div><aside><small>STATUS</small><b>${esc(Number(live.progress)>0?'Em andamento':'Planejada')}</b><span>${Number(live.progress)||0}% da etapa</span></aside></header><section class="stage-v9-activity-status-lines"><div><small>LINHAGEM</small><b>${esc(stage.dependsOn?.length?`Após ${stage.dependsOn.join(', ')}`:'Origem da etapa')}</b></div><div><small>UNIDADE DE PRODUÇÃO</small><b>${esc(packet.unit)}</b><span>${esc(stageV9ProductionFor(stage))}</span></div><div><small>ORÇAMENTO REFERENCIAL</small><b>${formatBRL(budget)}</b><span>Peso ${Number(stage.cashWeight||0)*100}% do caixa</span></div><div><small>DATA / RESPONSÁVEL</small><b>${esc(live.week||'A definir')}</b><span>${esc(live.owner||'A definir')}</span></div></section><section class="stage-v9-activity-body"><article class="stage-v9-activity-structure"><span class="activity-kind">DETALHAMENTO E DIRETRIZ</span><h2>${esc(packet.label)}</h2><p>${esc(profile.typicalDescription||stageV9DirectiveText(stage,profile))}</p><div class="stage-v9-trigger-box"><small>GATILHO DO AGENTE</small><b>${esc(packet.trigger)}</b><span>O agente só propaga a mudança quando os requisitos estão completos e o usuário autorizado confirma.</span></div><h3>Materiais necessários</h3><div class="stage-v9-material-list">${materials.slice(0,6).map(item=>`<div><b>${esc(item.name)}</b><span>${item.quantity==null?'Medir antes de requisitar':`${esc(item.quantity)} ${esc(item.unit||'un.')}`}</span><small>${esc(item.status||'Planejado')}</small></div>`).join('')}</div></article><article class="stage-v9-activity-form-card"><span class="activity-kind">STATUS LINE · REGISTRO RÁPIDO</span><h2>Confirmar execução</h2><div class="stage-v9-check-lines"><label><input type="checkbox"> Frente e responsável confirmados</label><label><input type="checkbox"> Unidade de produção informada</label><label><input type="checkbox"> Material e comprovante conferidos</label><label><input type="checkbox"> Próximo passo pode ser propagado</label></div><button type="button" class="stage-v9-primary-action" data-stage-activity-action>Salvar confirmação no Diário ${ico('check')}</button></article></section><section class="stage-v9-activity-diary"><header><div><span class="activity-kind">DIÁRIO DE OBRA · ATIVIDADE</span><h2>Histórico relacionado</h2></div><small>${records.length} registro(s) relacionado(s)</small></header><div class="stage-v9-diary-table-wrap"><table class="stage-v9-diary-table"><thead><tr><th>Data / hora</th><th>Atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th></tr></thead><tbody>${records.map(record=>`<tr><td>${esc(record.data||'—')} ${esc(record.hora||'')}</td><td>${esc(record.atividade||stage.name)}</td><td>${esc(record.responsavel||'A definir')}</td><td>${esc(record.detalhes||'Sem apontamento')}</td><td>${esc(record.status||'Pendente')}</td></tr>`).join('')||'<tr><td colspan="5" class="stage-v9-empty-diary">Sem histórico específico para esta atividade.</td></tr>'}</tbody></table></div></section></section>`;
};
ViewLayer.prototype.activities=function(){
  const state=appStore.get();
  if(state.stageActivityDedicatedV9)return stageV9ActivityDetail(state.selectedActivity);
  return activitiesBeforeStagesV9?.call(this)||'<section class="stage-v9-empty-diary">Nenhuma atividade selecionada.</section>';
};

const bindBeforeStagesV9=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  bindBeforeStagesV9?.call(this);
  this.querySelectorAll('[data-stage-v9]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({view:'stages',selectedStageV9:button.dataset.stageV9,selectedStage:button.dataset.stageV9,activityDedicated:true,stageActivityDedicatedV9:false,lastAction:`Abriu a etapa ${button.textContent.trim()}`});}));
  this.querySelector('[data-stage-v9-back]')?.addEventListener('click',()=>appStore.set({view:'stages',activityDedicated:false,stageActivityDedicatedV9:false,selectedActivity:null,lastAction:'Voltou para a árvore de etapas'}));
  this.querySelectorAll('[data-activity-v9]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();appStore.set({view:'activities',selectedActivity:button.dataset.activityV9,activityDedicated:false,stageActivityDedicatedV9:true,lastAction:`Abriu atividade ${button.textContent.trim()}`});}));
  this.querySelector('[data-activity-v9-back]')?.addEventListener('click',()=>appStore.set({view:'stages',activityDedicated:true,stageActivityDedicatedV9:false,lastAction:'Voltou ao fluxo da etapa'}));
  this.querySelector('[data-stage-activity-action]')?.addEventListener('click',()=>{appStore.set({lastAction:'Confirmou requisitos da atividade no Diário'});notify('Confirmação registrada. A propagação permanece auditável no Diário de obra.','success');});
};

// CONTROL_CENTER_V1: tabelas relacionais em uma única superfície administrativa.
// Materiais e razões de comissão são editáveis; cada mudança deixa trilha local
// e publica um evento no RTDB para que os workers possam ouvi-la.
const controlCenterMaterialRowsV1=state=>{
  const overrides=state.controlMaterialOverrides||{};
  return (executionModel.stages||[]).flatMap(stage=>{
    const configured=stageMaterialsFor(stage.name).length?stageMaterialsFor(stage.name):(stage.materials||[]).map((name,index)=>({id:`${stage.key}-material-${index}`,name,scope:'Requisito da etapa',quantity:null,unit:'un.',status:'Planejado'}));
    const packets=stageV9FlowPackets(stage);
    return configured.map((item,index)=>{const edit=overrides[item.id]||{};return {...item,stageKey:stage.key,stageName:stage.name,activityName:packets[index%packets.length]?.label||'Atividade principal',...edit};});
  });
};
const controlCenterFinanceRowsV1=state=>{
  const rows=Array.isArray(state.cashFlowLocal)?state.cashFlowLocal:[];
  return rows.length?rows.slice(0,10):[{id:'DEMO-CAIXA-01',date:'—',kind:'Saldo inicial',stage:'Projeto',amount:0,description:'Nenhum lançamento local neste dispositivo'}];
};
const controlCenterMoneyV1=value=>formatBRL(Number(value?.amount??value?.value??0));
const controlCenterRecordChangeV1=(label,detail,entity={})=>{
  const at=new Date().toISOString(),entry={id:`CTRL-${Date.now().toString(36).toUpperCase()}`,label,detail,entity,at,actor:appStore.get().currentActor?.name||'Usuário autorizado'};
  appStore.update(state=>({...state,controlChangeLog:[entry,...(state.controlChangeLog||[])].slice(0,30),lastAction:`Central ouviu: ${label}`}));
  return entry;
};
const controlCenterPublishV1=(event,entity,entityId,payload)=>publishOperationalEvent({actor:appStore.get().currentActor||{},type:event,entity,entityId,payload:{...payload,projectId:'project-alianca-park'}}).catch(error=>console.info('Evento da Central mantido localmente; RTDB indisponível.',error));
const controlCenterRealtimeLabelV1=state=>state.controlRealtime?.updatedAt?`RTDB ouvido às ${new Date(state.controlRealtime.updatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'RTDB aguardando conexão';
const controlStageProfileV1=(stage,state)=>{
  const settings={...(readIntegrationSettings()||{}),...(state.integrationSettings||{})};
  return {...(stage?.executionProfile||{}),...(settings.stageProfiles?.[stage?.key]||{})};
};
const controlStageMaterialRowsV1=(stage,profile)=>normalizeStageMaterialRows(profile?.materialsTable,defaultStageMaterialRows(stage||{}));
const controlStageContextMarkupV1=(state,stages)=>{
  const selectedKey=state.selectedPlanningStage||stages[0]?.key||'';
  const stage=stages.find(item=>item.key===selectedKey)||stages[0]||{};
  const profile=controlStageProfileV1(stage,state),production=profile.production||stage.production||{},materials=controlStageMaterialRowsV1(stage,profile),live=stageV9LiveFor(stage);
  const optionRows=stages.map(item=>`<option value="${esc(item.key)}" ${item.key===stage.key?'selected':''}>${esc(item.name)}</option>`).join('');
  const rows=materials.map(item=>`<tr data-control-context-material-row><td><input name="materialName" value="${esc(item.name)}" placeholder="Ex.: Tubo PEAD"></td><td><input name="materialDescription" value="${esc(item.description||item.scope||'')}" placeholder="Uso, bitola ou escopo"></td><td><input name="materialQuantity" type="number" min="0" step="any" value="${item.quantity==null?'':esc(item.quantity)}" placeholder="A medir"></td><td><input name="materialUnit" value="${esc(item.unit||'un.')}" placeholder="m, un, m²"></td><td><select name="materialStatus"><option ${item.status==='Planejado'?'selected':''}>Planejado</option><option ${item.status==='Em andamento'?'selected':''}>Em andamento</option><option ${item.status==='Atenção'?'selected':''}>Atenção</option><option ${item.status==='Concluído'?'selected':''}>Concluído</option><option ${item.status==='Dimensionar'?'selected':''}>Dimensionar</option></select></td><td><button type="button" class="control-remove-context-material" aria-label="Remover material">${ico('trash-2')}</button></td></tr>`).join('');
  return `<section class="control-center-section control-stage-context-section"><header><div><span class="activity-kind">06 · COMPREENSÕES OPERACIONAIS</span><h2>Editar requisitos de execução e materiais</h2><p>Esta é a fonte de calibração que orienta compras, medições, agenda, caixa e propagação do Worker por etapa.</p></div><span class="control-section-note">escuta ativa · ${esc(controlCenterRealtimeLabelV1(state))}</span></header><form class="control-stage-context-form" data-control-stage-context-form="${esc(stage.key)}"><div class="control-stage-context-top"><label>Etapa<select name="stageKey" data-control-stage-selector>${optionRows}</select></label><div class="control-context-live"><small>LEITURA ATUAL</small><b>${Number(live.progress)||0}% · ${esc(stageV9StatusFor(live))}</b><span>Prioridade ${stage.priority||'—'} · ${stage.dependsOn?.length?`depende de ${esc(stage.dependsOn.join(' · '))}`:'sem dependência'}</span></div></div><div class="control-stage-context-grid"><label><span>Requisitos de execução</span><textarea name="requirements" rows="4" placeholder="Uma regra por linha. Ex.: subleito compactado">${esc((profile.requirements||[]).join('\n'))}</textarea></label><label><span>Condições para liberar</span><textarea name="conditions" rows="4" placeholder="Uma condição por linha. Ex.: teste aprovado">${esc((profile.conditions||[]).join('\n'))}</textarea></label><label class="wide"><span>Compreensão típica da execução</span><textarea name="typicalDescription" rows="3" placeholder="Explique a lógica de execução para a IA e para o encarregado.">${esc(profile.typicalDescription||'')}</textarea></label><label><span>Gatilhos e pedidos</span><textarea name="requestHints" rows="3" placeholder="Quando pedir material, equipe ou ação.">${esc((profile.requestHints||[]).join('\n'))}</textarea></label><label><span>Evidências obrigatórias</span><textarea name="evidenceFocus" rows="3" placeholder="Fotos, medições, laudos, protocolos.">${esc((profile.evidenceFocus||[]).join('\n'))}</textarea></label><label><span>Compras e logística</span><textarea name="procurementFocus" rows="3" placeholder="Frete, estoque, fornecedor, lead time.">${esc((profile.procurementFocus||[]).join('\n'))}</textarea></label><div class="control-production-calibration"><header><div><span>UNIDADE DE PRODUÇÃO</span><b>Como o avanço deve ser medido</b></div><small>os valores editados alimentam prazo e prontidão</small></header><div><label>Meta<input name="productionQuantity" type="number" min="0" step="any" value="${production.quantity==null?'':esc(production.quantity)}"></label><label>Unidade<input name="productionUnit" value="${esc(production.unit||'un.')}" placeholder="m, m², m³, viagem, un."></label><label>Ritmo<input name="productionRate" type="number" min="0" step="any" value="${production.rate==null?'':esc(production.rate)}"></label><label>Ritmo / unidade de tempo<input name="productionRateUnit" value="${esc(production.rateUnit||'un./dia')}" placeholder="m/dia, viagens/dia"></label></div></div></div><div class="control-context-materials"><header><div><span>MATERIAIS E EQUIPAMENTOS</span><b>Composição editável da frente</b></div><button type="button" class="control-add-context-material" data-control-context-add-material>${ico('plus')} Adicionar item</button></header><div class="control-table-wrap"><table class="control-center-table control-editable-table"><thead><tr><th>Material / equipamento</th><th>Descrição</th><th>Quantidade</th><th>Unidade</th><th>Status</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="control-context-empty">Nenhum item configurado. Adicione o primeiro requisito.</td></tr>'}</tbody></table></div></div><div class="control-context-targets"><label>Dono / RTDB<input name="notifyOwner" value="${esc((profile.notificationTargets?.owner||[]).join(', '))}" placeholder="desktop-owner, rtdb/owner"></label><label>Administrador / RTDB<input name="notifyAdmin" value="${esc((profile.notificationTargets?.admin||[]).join(', '))}" placeholder="desktop-admin, rtdb/admin"></label><label>Encarregado / RTDB<input name="notifyForeman" value="${esc((profile.notificationTargets?.foreman||[]).join(', '))}" placeholder="mobile-foreman, rtdb/foreman"></label></div><footer><span data-control-context-status>As edições ficam auditadas e são reenviadas ao ciclo operacional.</span><button type="submit">${ico('save')} Salvar compreensão da etapa</button></footer></form></section>`;
};
const controlStageContextPayloadV1=form=>({
  requirements:splitStageConfigList(form.querySelector('[name="requirements"]')?.value),
  conditions:splitStageConfigList(form.querySelector('[name="conditions"]')?.value),
  typicalDescription:form.querySelector('[name="typicalDescription"]')?.value||'',
  requestHints:splitStageConfigList(form.querySelector('[name="requestHints"]')?.value),
  evidenceFocus:splitStageConfigList(form.querySelector('[name="evidenceFocus"]')?.value),
  procurementFocus:splitStageConfigList(form.querySelector('[name="procurementFocus"]')?.value),
  production:{quantity:Number(form.querySelector('[name="productionQuantity"]')?.value)||0,unit:form.querySelector('[name="productionUnit"]')?.value||'un.',rate:Number(form.querySelector('[name="productionRate"]')?.value)||0,rateUnit:form.querySelector('[name="productionRateUnit"]')?.value||'un./dia'},
  materialsTable:[...form.querySelectorAll('[data-control-context-material-row]')].map(row=>({name:row.querySelector('[name="materialName"]')?.value||'',description:row.querySelector('[name="materialDescription"]')?.value||'',quantity:row.querySelector('[name="materialQuantity"]')?.value||'',unit:row.querySelector('[name="materialUnit"]')?.value||'',status:row.querySelector('[name="materialStatus"]')?.value||'Planejado'})).filter(item=>item.name||item.description||item.quantity),
  notificationTargets:{owner:splitStageConfigList(form.querySelector('[name="notifyOwner"]')?.value),admin:splitStageConfigList(form.querySelector('[name="notifyAdmin"]')?.value),foreman:splitStageConfigList(form.querySelector('[name="notifyForeman"]')?.value)}
});

ViewLayer.prototype.control=function(){
  const state=appStore.get(),cash=state.cashSummary||{},operational=state.operationalState||{},stages=executionModel.stages||[],materials=controlCenterMaterialRowsV1(state),financeRows=controlCenterFinanceRowsV1(state),reasons=brokerReasonsV9(state),deals=[...commissionDeals,...(state.commissionEntries||[])],events=Object.values(state.controlRealtime?.events||{}).slice(-6).reverse(),logs=(state.controlChangeLog||[]).slice(0,6);
  const stageRows=stages.map(stage=>{const live=stageV9LiveFor(stage),computed=(operational.stages||[]).find(item=>item.key===stage.key)||{},progress=Number(computed.progress??live.progress)||0;return `<tr><td><b>${esc(stage.name)}</b><small>${esc(stage.key)}</small></td><td>${stage.priority||'—'}</td><td>${stage.dependsOn?.length?esc(stage.dependsOn.join(' · ')):'Origem'}</td><td>${esc(stage.production?.quantity??'—')} ${esc(stage.production?.unit||'')}</td><td><i class="control-progress"><em style="width:${Math.max(0,Math.min(100,progress))}%"></em></i><b>${progress}%</b></td><td>${esc(progress>=100?'Concluída':progress>0?'Em andamento':'Planejada')}</td></tr>`;}).join('');
  const materialRows=materials.map(item=>`<tr data-control-material-row="${esc(item.id)}"><td><b>${esc(item.stageName)}</b><small>${esc(item.activityName)}</small></td><td>${esc(item.name)}<small>${esc(item.scope||'')}</small></td><td><input data-control-material-field="quantity" data-control-material-id="${esc(item.id)}" type="number" min="0" step="any" value="${item.quantity==null?'':esc(item.quantity)}" aria-label="Quantidade de ${esc(item.name)}"></td><td><input data-control-material-field="unit" data-control-material-id="${esc(item.id)}" value="${esc(item.unit||'')}" aria-label="Unidade de ${esc(item.name)}"></td><td><select data-control-material-field="status" data-control-material-id="${esc(item.id)}"><option ${item.status==='Planejado'?'selected':''}>Planejado</option><option ${item.status==='Em andamento'?'selected':''}>Em andamento</option><option ${item.status==='Atenção'?'selected':''}>Atenção</option><option ${item.status==='Concluído'?'selected':''}>Concluído</option><option ${item.status==='Dimensionar'?'selected':''}>Dimensionar</option></select></td></tr>`).join('');
  const financeTable=financeRows.map(row=>`<tr><td>${esc(row.date||row.createdAt||'—')}</td><td>${esc(row.kind||row.type||'Lançamento')}</td><td>${esc(row.stage||row.etapa||'Caixa mestre')}</td><td>${controlCenterMoneyV1(row)}</td><td>${esc(row.description||row.details||'Registro de caixa')}</td></tr>`).join('');
  const commissionRows=reasons.map(reason=>`<tr><td><b>${esc(reason.label)}</b><small>${esc(reason.payment)}</small></td><td><input data-control-commission-field="sharePercent" data-control-commission-id="${esc(reason.id)}" type="number" min="0" max="100" step="0.1" value="${Number(reason.sharePercent||0)}" aria-label="Participação de ${esc(reason.label)}"></td><td>${Number(reason.warley||0)}%</td><td>${Number(reason.partner||0)}%</td><td><label class="control-switch"><input data-control-commission-field="active" data-control-commission-id="${esc(reason.id)}" type="checkbox" ${reason.active!==false?'checked':''}> ativa</label></td></tr>`).join('');
  const eventRows=[...logs.map(item=>({kind:'Edição local',label:item.label,detail:item.detail,at:item.at})),...events.map(item=>({kind:'RTDB',label:item.type||'agentBridgeEvents',detail:item.entity?`${item.entity} · ${item.entityId||''}`:'Evento recebido',at:item.createdAt||item.updatedAt}))].slice(0,8).map(item=>`<li><span>${esc(item.kind)}</span><b>${esc(item.label)}</b><small>${esc(item.detail||'')} · ${item.at?new Date(item.at).toLocaleString('pt-BR'):'agora'}</small></li>`).join('');
  return `<section class="control-center-page"><header class="control-center-head"><div><span class="activity-kind">CENTRAL ADMINISTRATIVA · ESCUTA ATIVA</span><h1>Finanças, materiais, etapas e comissões</h1><p>Uma tabela de referência para o agente ouvir alterações, recalcular relações e sugerir a próxima ação.</p></div><div class="control-center-head-actions"><span class="control-live-dot">${ico('radio')} ${esc(controlCenterRealtimeLabelV1(state))}</span><button type="button" data-view="assistant">${ico('arrow-left')} Dashboard</button></div></header><section class="control-center-kpis"><article><small>CAIXA MESTRE</small><b>${formatBRL(Number(cash.balanceCents||operational.cash?.balanceCents||0)/100)}</b><span>fonte do cálculo de prioridade</span></article><article><small>MATERIAIS / ATIVIDADES</small><b>${materials.length}</b><span>${materials.filter(item=>item.status==='Atenção').length} em atenção</span></article><article><small>ETAPAS RELACIONAIS</small><b>${stages.length}</b><span>produção e dependências</span></article><article><small>COMISSÕES</small><b>${deals.length}</b><span>${reasons.length} razões editáveis</span></article></section><section class="control-center-section"><header><div><span class="activity-kind">01 · FLUXO FINANCEIRO</span><h2>Caixa que orienta o andamento</h2><p>O saldo e os lançamentos alimentam a cobertura das etapas; registros financeiros continuam sob responsabilidade do Dono.</p></div><button type="button" data-view="finance">Abrir financeiro ${ico('arrow-up-right')}</button></header><div class="control-table-wrap"><table class="control-center-table"><thead><tr><th>Data</th><th>Tipo</th><th>Vínculo</th><th>Valor</th><th>Descrição</th></tr></thead><tbody>${financeTable}</tbody></table></div></section><section class="control-center-section"><header><div><span class="activity-kind">02 · MATERIAIS POR ATIVIDADE</span><h2>Composição editável das frentes</h2><p>Edite quantidade, unidade ou situação. Cada alteração gera uma entrada local e um evento de escuta para o agente.</p></div><span class="control-section-note">${materials.length} itens relacionados</span></header><div class="control-table-wrap"><table class="control-center-table control-editable-table"><thead><tr><th>Etapa / atividade</th><th>Material ou equipamento</th><th>Quantidade</th><th>Unidade</th><th>Status</th></tr></thead><tbody>${materialRows}</tbody></table></div></section><section class="control-center-section"><header><div><span class="activity-kind">03 · ETAPAS E PRODUÇÃO</span><h2>Relação de execução</h2><p>Prioridade, dependências, unidade de produção e avanço comprovado em uma só leitura.</p></div><button type="button" data-view="stages">Abrir etapas ${ico('arrow-up-right')}</button></header><div class="control-table-wrap"><table class="control-center-table"><thead><tr><th>Etapa</th><th>Prioridade</th><th>Dependências</th><th>Meta / unidade</th><th>Avanço</th><th>Status</th></tr></thead><tbody>${stageRows}</tbody></table></div></section><section class="control-center-section"><header><div><span class="activity-kind">04 · COMISSÕES E REPASSES</span><h2>Razões que o sistema deve respeitar</h2><p>As razões ficam editáveis para o Administrador; a aplicação deve refletir imediatamente nos relatórios mensais, anuais e acumulados.</p></div><button type="button" data-view="brokers">Abrir corretores ${ico('arrow-up-right')}</button></header><div class="control-table-wrap"><table class="control-center-table control-editable-table"><thead><tr><th>Razão</th><th>Participação</th><th>Warley</th><th>Contraparte</th><th>Estado</th></tr></thead><tbody>${commissionRows}</tbody></table></div></section>${controlStageContextMarkupV1(state,stages)}<aside class="control-center-listener"><header><div><span class="activity-kind">07 · PONTE DE ESCUTA</span><h2>Últimas edições e eventos ouvidos</h2></div><span>${esc(controlCenterRealtimeLabelV1(state))}</span></header><ol>${eventRows||'<li><b>Nenhuma edição registrada nesta sessão.</b><small>Altere um material, uma compreensão de etapa ou uma razão de comissão para testar a propagação.</small></li>'}</ol></aside></section>`;
};

ViewLayer.prototype.connectControlCenterListenerV1=async function(){
  if(this._controlCenterListenerV1)return;
  this._controlCenterListenerV1=true;
  try{this._unsubscribeControlCenterV1=await subscribeOperationalControlCenter(this.constructor===undefined?{}:(appStore.get().currentActor||{}),payload=>{appStore.set({controlRealtime:payload,lastAction:`Ouviu ${payload.source||'evento'} no Firebase`});});}
  catch(error){console.info('Escuta da Central indisponível; edição local permanece ativa.',error);}
};

const renderBeforeControlCenterV1=ViewLayer.prototype.render;
ViewLayer.prototype.render=function(){
  renderBeforeControlCenterV1.call(this);
  if(appStore.get().view==='control'){
    const head=this.querySelector('.activity-header');
    if(head){const title=head.querySelector('span'),subtitle=head.querySelector('small');if(title)title.textContent='Central de operação';if(subtitle)subtitle.textContent='Tabelas relacionais, edições e escuta do agente';}
  }
};
const bindBeforeControlCenterV1=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(){
  bindBeforeControlCenterV1.call(this);
  const root=this.querySelector('.control-center-page');
  if(!root)return;
  this.connectControlCenterListenerV1();
  root.querySelectorAll('[data-control-material-field]').forEach(input=>input.addEventListener('change',event=>{
    const id=input.dataset.controlMaterialId,field=input.dataset.controlMaterialField,value=field==='quantity'?(input.value===''?null:Number(input.value)):input.value;
    appStore.update(state=>({...state,controlMaterialOverrides:{...(state.controlMaterialOverrides||{}),[id]:{...(state.controlMaterialOverrides||{})[id],[field]:value}}}));
    const entry=controlCenterRecordChangeV1(`Material ${field} editado`,`${id} · ${String(value??'medir')}`,{entity:'material',entityId:id});
    controlCenterPublishV1('control.material.updated','material',id,{field,value,changeId:entry.id});
    const materialLoop=this.runOperationalLoop?.('material.changed',{quiet:true});materialLoop?.catch?.(()=>{});
    notify('Material atualizado; a Central registrou e propagou a edição.','success');
  }));
  root.querySelectorAll('[data-control-commission-field]').forEach(input=>input.addEventListener('change',event=>{
    const id=input.dataset.controlCommissionId,field=input.dataset.controlCommissionField,value=field==='sharePercent'?Number(input.value):Boolean(input.checked);
    appStore.update(state=>{const current=brokerReasonsV9(state).find(item=>item.id===id)||{id};const configured=(state.commissionReasons||[]).filter(item=>item.id!==id);return {...state,commissionReasons:[...configured,{...current,[field]:value}]};});
    const entry=controlCenterRecordChangeV1(`Regra ${id} editada`,`${field} = ${String(value)}`,{entity:'commissionReason',entityId:id});
    controlCenterPublishV1('control.commission-rule.updated','commissionReason',id,{field,value,changeId:entry.id});
    const commissionLoop=this.runOperationalLoop?.('commission-rule.changed',{quiet:true});commissionLoop?.catch?.(()=>{});
    notify('Regra de comissão atualizada e registrada para o agente.','success');
  }));
  root.querySelector('[data-control-stage-selector]')?.addEventListener('change',event=>{
    appStore.set({selectedPlanningStage:event.currentTarget.value,lastAction:`Selecionou compreensão da etapa ${event.currentTarget.value}`});
  });
  root.querySelector('[data-control-context-add-material]')?.addEventListener('click',()=>{
    const tbody=root.querySelector('[data-control-stage-context-form] tbody');
    if(!tbody)return;
    tbody.querySelector('.control-context-empty')?.closest('tr')?.remove();
    const row=document.createElement('tr');
    row.setAttribute('data-control-context-material-row','');
    row.innerHTML=`<td><input name="materialName" placeholder="Ex.: Tubo PEAD"></td><td><input name="materialDescription" placeholder="Uso, bitola ou escopo"></td><td><input name="materialQuantity" type="number" min="0" step="any" placeholder="A medir"></td><td><input name="materialUnit" placeholder="m, un, m²"></td><td><select name="materialStatus"><option>Planejado</option><option>Em andamento</option><option>Atenção</option><option>Concluído</option><option>Dimensionar</option></select></td><td><button type="button" class="control-remove-context-material" aria-label="Remover material">${ico('trash-2')}</button></td>`;
    tbody.appendChild(row);
    row.querySelector('.control-remove-context-material')?.addEventListener('click',()=>row.remove());
    row.querySelector('[name="materialName"]')?.focus();
    window.lucide?.createIcons();
  });
  root.querySelectorAll('.control-remove-context-material').forEach(button=>button.addEventListener('click',()=>button.closest('[data-control-context-material-row]')?.remove()));
  const stageContextForm=root.querySelector('[data-control-stage-context-form]');
  stageContextForm?.addEventListener('submit',async event=>{
    event.preventDefault();
    const stageKey=stageContextForm.dataset.controlStageContextForm;
    const payload=controlStageContextPayloadV1(stageContextForm);
    const currentSettings={...(readIntegrationSettings()||{}),...(appStore.get().integrationSettings||{})};
    const nextSettings={...currentSettings,stageProfiles:{...(currentSettings.stageProfiles||{}),[stageKey]:payload}};
    localStorage.setItem(INTEGRATION_SETTINGS_KEY,JSON.stringify(nextSettings));
    appStore.set({integrationSettings:nextSettings,selectedPlanningStage:stageKey,lastAction:`Salvou compreensão operacional da etapa ${stageKey}`});
    const stage=(executionModel.stages||[]).find(item=>item.key===stageKey);
    const dbStage=demoData.activities.find(item=>item.name===stage?.name);
    const actor=appStore.get().currentActor||{};
    try{
      if(dbStage?.id){
        const response=await apiFetch(`/api/stages-admin/${encodeURIComponent(dbStage.id)}/ai`,{method:'PUT',headers:{'Content-Type':'application/json','x-belavista-role':actor.role||'admin','x-belavista-user':actor.uid||'local-admin','x-belavista-name':actor.name||'Administrador'},body:JSON.stringify({requirements:payload.requirements,conditions:payload.conditions,typicalDescription:payload.typicalDescription,requestHints:payload.requestHints,evidenceFocus:payload.evidenceFocus,procurementFocus:payload.procurementFocus,notificationTargets:payload.notificationTargets,executionProfile:{production:payload.production}})});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
      }
    }catch(error){console.info('Persistência central da compreensão indisponível; mantendo edição local.',error);}
    const entry=controlCenterRecordChangeV1('Compreensão da etapa editada',`${stageKey} · ${payload.materialsTable.length} materiais · ${payload.requirements.length} requisitos`,{entity:'stageAiConfig',entityId:stageKey});
    controlCenterPublishV1('control.stage-context.updated','stageAiConfig',stageKey,{...payload,changeId:entry.id});
    const loop=this.runOperationalLoop?.('stage.context.changed',{quiet:true});
    loop?.catch?.(()=>{});
    notify('Compreensão salva; requisitos, materiais e produtividade foram enviados ao Worker.','success');
  });
};
const disconnectedBeforeControlCenterV1=ViewLayer.prototype.disconnectedCallback;
ViewLayer.prototype.disconnectedCallback=function(){this._unsubscribeControlCenterV1?.();this._unsubscribeControlCenterV1=null;this._controlCenterListenerV1=false;disconnectedBeforeControlCenterV1?.call(this);};

// STAGES_NAVIGATION_V5374: a entrada de Etapas passa a ser uma leitura
// navegável e objetiva. O canvas legado permanece fora da página principal;
// os detalhes de execução continuam disponíveis na superfície dedicada.
ViewLayer.prototype.stagesCanvas=function(){
  const state=appStore.get(),operational=state.operationalState||{},rows=executionModel.stages||[];
  const cards=rows.map((stage,index)=>{
    const live=(operational.stages||[]).find(item=>item.key===stage.key)||stageV9LiveFor(stage)||{};
    const progress=Math.max(0,Math.min(100,Number(live.progress)||0));
    const blocked=(live.blockedBy||[]).length>0;
    const next=blocked?`Aguardando: ${live.blockedBy.join(' · ')}`:progress>=100?'Frente concluída e disponível para conferência.':`Próximo passo: ${stage.executionProfile?.requestHints?.[0]||'alimentar medição e evidência'}`;
    return `<a class="stage-navigation-card-v5374 ${blocked?'blocked':''}" href="${runtimeRouteV1('/admin/workers/stage',`stage=${encodeURIComponent(stage.key)}`)}"><header><span>${String(index+1).padStart(2,'0')} · ${esc(stage.key)}</span><b>${progress}%</b></header><h3>${esc(stage.name)}</h3><p>${esc(next)}</p><div class="stage-navigation-progress-v5374"><i style="width:${progress}%"></i></div><footer><span>Prioridade ${Number(stage.priority)||0}</span><span>${esc(stage.production?.unit||'produção')}</span></footer></a>`;
  }).join('');
  return `<section class="stages-navigation-v5374"><header class="stages-navigation-head-v5374"><div><span class="activity-kind">OBRA · HIERARQUIA OPERACIONAL</span><h1>Etapas da implantação</h1><p>Selecione uma frente para abrir requisitos, materiais, atividades, dependências, agenda e os gatilhos que o worker acompanha.</p></div><div class="stages-navigation-actions-v5374"><a href="${runtimeRouteV1('/admin/workers')}">${ico('radio')} Monitoria dos workers</a><button type="button" data-view="assistant">${ico('arrow-left')} Dashboard</button></div></header><div class="stages-navigation-summary-v5374"><article><small>FONTE MESTRA</small><b>Caixa</b><span>orienta a prioridade e a cobertura</span></article><article><small>RELAÇÃO</small><b>${rows.length} etapas</b><span>dependências e produção vinculadas</span></article><article><small>LEITURA</small><b>Em tempo real</b><span>eventos, agenda e evidências</span></article></div><div class="stages-navigation-grid-v5374">${cards}</div></section>`;
};

// ACTIVITY_LOCATION_ROUTE_BRIDGE_V1
// O administrativo possui várias representações históricas de atividades.
// Todas devem abrir a superfície server-backed que contém o mapa físico real,
// evitando que uma abertura antiga deixe o usuário preso em um drawer sem
// edição de local.
const activityRouteBridgeBindV1=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(...args){
  const result=activityRouteBridgeBindV1?.apply(this,args);
  installActivityRouteBridgeV1(this);
  return result;
};
if(globalThis.document){
  queueMicrotask(()=>document.querySelectorAll('view-layer').forEach(installActivityRouteBridgeV1));
}

// PERSONNEL_PRODUCTION_WORKSPACE_V5372
// A formação de equipe é uma camada explícita entre a compreensão da
// atividade e a unidade produzida. A prévia abaixo é determinística e local;
// o documento de estimativas entra como fonte de calibração somente depois de
// ser conferido pelo usuário responsável.
const personnelStageTeamV5372={project:'topography',earthwork:'earthwork',drainage:'drainage',water:'water',curbs:'curbs',paving:'paving',electrical:'electrical'};
const personnelStageActivityV5372={project:'Revisar projeto executivo',earthwork:'Executar corte e aterro',drainage:'Executar rede de drenagem',water:'Implantar rede de água',curbs:'Executar meio-fio',paving:'Executar base e pavimento',electrical:'Implantar rede elétrica'};
const personnelStageV5372=key=>(executionModel.stages||[]).find(stage=>stage.key===key)||executionModel.stages?.[0];
const personnelTeamsV5372=state=>Array.isArray(state.personnelTeams)&&state.personnelTeams.length?state.personnelTeams:structuredClone(personnelModel.teams);
const personnelAssignmentsV5372=state=>({...personnelModel.assignments,...(state.personnelAssignments||{})});
const personnelComputeV5372=(stageKey,state)=>{
  const stage=personnelStageV5372(stageKey),teams=personnelTeamsV5372(state),assignments=personnelAssignmentsV5372(state),assignment=assignments[stageKey]||{};
  const team=teams.find(item=>item.id===assignment.teamId)||teams.find(item=>item.id===personnelStageTeamV5372[stageKey])||teams[0];
  const production=stage?.production||{},override=state.personnelInferenceOverrides?.[stageKey]||{};
  const baseRate=Number(override.baseRate??production.rate)||0,referenceCrew=Math.max(1,Number(team?.referenceCrew||team?.memberCount||1));
  const memberCount=Math.max(1,Number(team?.memberCount)||referenceCrew),formationRatio=memberCount/referenceCrew;
  const formationFactor=Number(team?.factor)||1,calibration=Number(override.calibration??assignment.calibration??1)||1;
  const adjustedRate=Math.round(baseRate*formationRatio*formationFactor*calibration*100)/100;
  const quantity=Number(override.quantity??production.quantity)||0,days=adjustedRate>0?Math.ceil(quantity/adjustedRate):0;
  const progress=Number((state.operationalState?.stages||[]).find(item=>item.key===stageKey)?.progress)||0;
  return {stage,team,assignment,quantity,unit:production.unit||'un.',baseRate,adjustedRate,days,progress,formationRatio,formationFactor,calibration};
};
const personnelSplitV5372=value=>String(value||'').split(',').map(item=>item.trim()).filter(Boolean);
const personnelPublishV5372=(type,entity,entityId,payload={})=>publishOperationalEvent({actor:appStore.get().currentActor||{},type,entity,entityId,payload:{...payload,projectId:'project-alianca-park'}}).catch(error=>console.info('Evento de pessoal mantido localmente; RTDB indisponível.',error));

ViewLayer.prototype.personnel=function(){
  const state=appStore.get(),teams=personnelTeamsV5372(state),assignments=personnelAssignmentsV5372(state),stages=executionModel.stages||[];
  const selectedStageKey=stages.some(stage=>stage.key===state.selectedPersonnelStage)?state.selectedPersonnelStage:stages[0]?.key||'earthwork';
  const selected=personnelComputeV5372(selectedStageKey,state),selectedTeamId=state.selectedPersonnelTeam||selected.team?.id,selectedTeam=teams.find(team=>team.id===selectedTeamId)||selected.team||teams[0];
  const positions=teams.reduce((sum,team)=>sum+(Number(team.memberCount)||0),0),availableTeams=teams.filter(team=>Number(team.availability)>0).length;
  const teamCards=teams.map(team=>`<button type="button" class="personnel-team-card-v5372 ${team.id===selectedTeam?.id?'selected':''} tone-${esc(team.color||'blue')}" data-cmd="personnel-select-team" data-personnel-team-id="${esc(team.id)}"><header><span class="personnel-team-swatch"></span><div><strong>${esc(team.name)}</strong><small>${esc(team.discipline)}</small></div><b>${Number(team.availability)||0}%</b></header><div class="personnel-team-count"><strong>${Number(team.memberCount)||0}</strong><span>pessoas na formação</span></div><p>${esc((team.memberNames||[]).slice(0,3).join(' · '))}</p><footer>${(team.skills||[]).slice(0,3).map(skill=>`<span>${esc(skill)}</span>`).join('')}</footer></button>`).join('');
  const stageOptions=stages.map(stage=>`<option value="${esc(stage.key)}" ${stage.key===selectedStageKey?'selected':''}>${esc(stage.name)}</option>`).join('');
  const teamOptions=teams.map(team=>`<option value="${esc(team.id)}" ${team.id===selected.team?.id?'selected':''}>${esc(team.name)}</option>`).join('');
  const assignment=assignments[selectedStageKey]||{};
  const linkedRows=stages.map(stage=>{const calc=personnelComputeV5372(stage.key,state),status=calc.progress>=100?'Concluída':calc.progress>0?'Em andamento':'Planejada';return `<tr><td><button type="button" class="personnel-row-link-v5372" data-cmd="personnel-select-stage" data-personnel-stage-key="${esc(stage.key)}"><b>${esc(stage.name)}</b><small>${esc(personnelStageActivityV5372[stage.key]||stage.name)}</small></button></td><td>${esc(calc.team?.name||'Sem equipe')}<small>${Number(calc.team?.memberCount)||0} pessoas</small></td><td><b>${esc(String(calc.adjustedRate))}</b> ${esc(stage.production?.rateUnit||'un./dia')}</td><td>${esc(String(calc.days))} dias</td><td><span class="personnel-status-v5372 ${status==='Concluída'?'done':status==='Em andamento'?'live':''}">${status}</span><small>${calc.progress}% avançado</small></td></tr>`;}).join('');
  return `<section class="personnel-page-v5372">
    <header class="personnel-head-v5372"><div><span class="activity-kind">OPERAÇÃO · PESSOAL E PRODUÇÃO</span><h1>Pessoal e formação de equipes</h1><p>A equipe é a ponte entre a inteligência da atividade e a unidade de produção. Ajuste a formação, confira a capacidade e deixe a previsão pronta para o cronograma.</p></div><div class="personnel-head-actions-v5372"><span class="personnel-live-v5372"><i></i> Prévia local ativa</span><button type="button" data-view="stages">${ico('workflow')} Ver etapas</button></div></header>
    <section class="personnel-kpis-v5372" aria-label="Resumo de pessoal"><article><small>FRENTES CALIBRADAS</small><strong>${availableTeams}</strong><span>uma formação por etapa</span></article><article><small>CAPACIDADE ALOCADA</small><strong>${positions}</strong><span>posições de equipe consideradas</span></article><article><small>UNIDADES DE PRODUÇÃO</small><strong>${stages.length}</strong><span>metas vindas do catálogo</span></article><article><small>BASE DE ESTIMATIVAS</small><strong>${state.personnelDocumentName&&state.personnelDocumentName!=='Nenhum documento de estimativas carregado'?'1':'0'}</strong><span>${esc(state.personnelInferenceStatus||'aguardando documento')}</span></article></section>
    <div class="personnel-grid-v5372"><section class="personnel-panel-v5372 personnel-teams-panel-v5372"><header class="personnel-panel-head-v5372"><div><span class="personnel-kicker-v5372">01 · FORMAÇÃO</span><h2>Equipes disponíveis</h2><p>Selecione uma equipe para editar sua capacidade e seu responsável.</p></div><span class="personnel-panel-count-v5372">${teams.length} frentes</span></header><div class="personnel-team-grid-v5372">${teamCards}</div></section>
      <div class="personnel-side-v5372"><section class="personnel-panel-v5372 personnel-inference-panel-v5372"><header class="personnel-panel-head-v5372"><div><span class="personnel-kicker-v5372">02 · INFERÊNCIA</span><h2>Unidade de produção</h2><p>Prévia assistida pelas regras da atividade e pela formação selecionada.</p></div><span class="personnel-ai-badge-v5372">${ico('sparkles')} IA · prévia</span></header><form data-personnel-inference-form><label>Etapa<select name="stage" data-personnel-stage>${stageOptions}</select></label><label>Equipe<select name="team" data-personnel-team>${teamOptions}</select></label><label>Calibração do documento<input name="calibration" type="number" min="0.1" max="5" step="0.05" value="${Number(selected.calibration)||1}" aria-label="Fator de calibração"></label><div class="personnel-form-actions-v5372"><button type="submit" class="personnel-primary-button-v5372">${ico('refresh-cw')} Recalcular prévia</button><span>salva somente no navegador</span></div></form><div class="personnel-inference-result-v5372"><div><small>META DA ATIVIDADE</small><strong>${esc(String(selected.quantity))} ${esc(selected.unit)}</strong></div><div><small>RITMO BASE</small><strong>${esc(String(selected.baseRate))} <em>${esc(selected.stage?.production?.rateUnit||'un./dia')}</em></strong></div><div><small>RITMO AJUSTADO</small><strong>${esc(String(selected.adjustedRate))} <em>${esc(selected.stage?.production?.rateUnit||'un./dia')}</em></strong></div><div><small>TEMPO PREVISTO</small><strong>${esc(String(selected.days))} dias</strong></div></div><p class="personnel-formula-v5372">${Number(selected.team?.memberCount)||0} pessoas · fator ${selected.formationFactor.toFixed(2)} · ${esc(selected.stage?.name||'Etapa')} → <b>${esc(String(selected.adjustedRate))} ${esc(selected.stage?.production?.rateUnit||'un./dia')}</b></p></section>
      <section class="personnel-panel-v5372 personnel-document-panel-v5372"><header class="personnel-panel-head-v5372"><div><span class="personnel-kicker-v5372">03 · FONTE DE CALIBRAÇÃO</span><h2>Estimativas prévias</h2><p>Receba o documento que vai refinar a inferência. A aplicação só acontece após sua conferência.</p></div>${ico('file-check-2')}</header><label class="personnel-upload-v5372">${ico('file-up')}<span><b>Carregar documento</b><small>.txt, .csv, .json ou .pdf · somente local</small></span><input type="file" data-personnel-estimate-file accept=".txt,.csv,.json,.pdf"></label><div class="personnel-document-state-v5372" data-personnel-document-status>${ico('paperclip')} <span>${esc(state.personnelDocumentName||'Nenhum documento de estimativas carregado')}</span></div><small class="personnel-disclaimer-v5372">A leitura inicial registra a fonte; os valores não são aplicados automaticamente sem validação.</small></section></div></div>
    <section class="personnel-panel-v5372 personnel-linked-panel-v5372"><header class="personnel-panel-head-v5372"><div><span class="personnel-kicker-v5372">04 · RELAÇÃO COM O CRONOGRAMA</span><h2>Atividades vinculadas</h2><p>Cada linha leva a formação da equipe para a unidade de produção prevista na etapa.</p></div><span class="personnel-panel-count-v5372">${stages.length} unidades</span></header><div class="personnel-table-wrap-v5372"><table class="personnel-table-v5372"><thead><tr><th>Etapa / atividade</th><th>Formação</th><th>Ritmo ajustado</th><th>Previsão</th><th>Estado</th></tr></thead><tbody>${linkedRows}</tbody></table></div></section>
    <section class="personnel-panel-v5372 personnel-editor-panel-v5372"><header class="personnel-panel-head-v5372"><div><span class="personnel-kicker-v5372">05 · EDIÇÃO DA FORMAÇÃO</span><h2>Calibrar equipe selecionada</h2><p>Altere a capacidade de planejamento, o fator de formação e os responsáveis que o agente deve considerar.</p></div><span class="personnel-editor-target-v5372">${esc(selectedTeam?.name||'Equipe')}</span></header><form data-personnel-team-form data-personnel-team-id="${esc(selectedTeam?.id||'')}" class="personnel-team-form-v5372"><label>Nome da equipe<input name="name" value="${esc(selectedTeam?.name||'')}"></label><label>Disciplina<input name="discipline" value="${esc(selectedTeam?.discipline||'')}"></label><label>Pessoas<input name="memberCount" type="number" min="1" max="100" step="1" value="${Number(selectedTeam?.memberCount)||1}"></label><label>Fator de formação<input name="factor" type="number" min="0.1" max="5" step="0.05" value="${Number(selectedTeam?.factor)||1}"></label><label>Disponibilidade %<input name="availability" type="number" min="0" max="100" step="1" value="${Number(selectedTeam?.availability)||0}"></label><label>Responsável<input name="responsible" value="${esc(selectedTeam?.responsible||'')}"></label><label class="personnel-wide-field-v5372">Competências<input name="skills" value="${esc((selectedTeam?.skills||[]).join(', '))}" placeholder="ex.: locação, cotas, medição"></label><label class="personnel-wide-field-v5372">Referências de pessoas / funções<input name="memberNames" value="${esc((selectedTeam?.memberNames||[]).join(', '))}" placeholder="ex.: responsável, operador, apoio"></label><div class="personnel-form-actions-v5372 personnel-wide-field-v5372"><button type="submit" class="personnel-primary-button-v5372">${ico('save')} Salvar formação</button><span>o agente ouvirá a alteração como evento de pessoal</span></div></form></section>
    <footer class="personnel-footnote-v5372">${ico('info')} A previsão combina meta da etapa, ritmo-base do catálogo, número de pessoas, fator de formação e calibração. O encarregado confirma a produção real no diário de obra.</footer>
  </section>`;
};

const personnelBindBeforeV5372=ViewLayer.prototype.bind;
ViewLayer.prototype.bind=function(...args){
  const result=personnelBindBeforeV5372?.apply(this,args),root=this.querySelector('.personnel-page-v5372');
  if(!root||root.dataset.personnelBound==='true')return result;
  root.dataset.personnelBound='true';
  root.querySelectorAll('[data-cmd="personnel-select-team"]').forEach(button=>button.addEventListener('click',()=>appStore.set({selectedPersonnelTeam:button.dataset.personnelTeamId,lastAction:`Selecionou ${button.textContent.trim().split('\n')[0]}`})));
  root.querySelectorAll('[data-cmd="personnel-select-stage"]').forEach(button=>button.addEventListener('click',()=>appStore.set({selectedPersonnelStage:button.dataset.personnelStageKey,lastAction:`Abriu unidade da etapa ${button.textContent.trim().split('\n')[0]}`})));
  root.querySelector('[data-personnel-inference-form]')?.addEventListener('submit',event=>{
    event.preventDefault();
    const form=event.currentTarget,stageKey=form.querySelector('[name="stage"]')?.value||'earthwork',teamId=form.querySelector('[name="team"]')?.value||personnelStageTeamV5372[stageKey],calibration=Math.max(.1,Number(form.querySelector('[name="calibration"]')?.value)||1),assignments=personnelAssignmentsV5372(appStore.get());
    const nextAssignments={...assignments,[stageKey]:{...(assignments[stageKey]||{}),teamId,calibration}};
    const state={...appStore.get(),personnelAssignments:nextAssignments,selectedPersonnelStage:stageKey,selectedPersonnelTeam:teamId};
    const calc=personnelComputeV5372(stageKey,state);
    appStore.set({personnelAssignments:nextAssignments,selectedPersonnelStage:stageKey,selectedPersonnelTeam:teamId,personnelInferenceOverrides:{...(appStore.get().personnelInferenceOverrides||{}),[stageKey]:{calibration}},personnelInferenceStatus:'Prévia recalculada; aguardando documento validado',lastAction:`Recalculou unidade de produção de ${calc.stage?.name||stageKey}`});
    personnelPublishV5372('personnel.production.inferred','personnelAssignment',stageKey,{teamId,calibration,adjustedRate:calc.adjustedRate,unit:calc.stage?.production?.rateUnit||'un./dia',predictedDays:calc.days});
    notify('Prévia de produção recalculada com a formação selecionada.','success');
  });
  root.querySelector('[data-personnel-estimate-file]')?.addEventListener('change',event=>{
    const file=event.currentTarget.files?.[0];if(!file)return;
    appStore.set({personnelDocumentName:file.name,personnelInferenceStatus:'Documento recebido; revisão humana necessária antes da calibração',lastAction:`Recebeu documento de estimativas ${file.name}`});
    personnelPublishV5372('personnel.estimates.received','personnelEstimate',file.name,{name:file.name,size:file.size,type:file.type||'desconhecido'});
    notify('Documento recebido. A prévia continua protegida até a conferência dos valores.','success');
  });
  root.querySelector('[data-personnel-team-form]')?.addEventListener('submit',event=>{
    event.preventDefault();
    const form=event.currentTarget,id=form.dataset.personnelTeamId,old=personnelTeamsV5372(appStore.get()).find(team=>team.id===id);if(!old)return;
    const read=name=>form.querySelector(`[name="${name}"]`)?.value||'';
    const team={...old,name:read('name').trim()||old.name,discipline:read('discipline').trim()||old.discipline,memberCount:Math.max(1,Number(read('memberCount'))||old.memberCount),referenceCrew:old.referenceCrew||old.memberCount,factor:Math.max(.1,Number(read('factor'))||1),availability:Math.max(0,Math.min(100,Number(read('availability'))||0)),responsible:read('responsible').trim()||old.responsible,skills:personnelSplitV5372(read('skills')),memberNames:personnelSplitV5372(read('memberNames'))};
    const teams=personnelTeamsV5372(appStore.get()).map(item=>item.id===id?team:item);
    appStore.set({personnelTeams:teams,selectedPersonnelTeam:id,personnelInferenceStatus:'Formação atualizada; prévias prontas para recálculo',lastAction:`Atualizou formação da equipe ${team.name}`});
    personnelPublishV5372('personnel.team.updated','personnelTeam',id,{name:team.name,memberCount:team.memberCount,factor:team.factor,availability:team.availability,responsible:team.responsible,skills:team.skills});
    notify('Formação salva e disponibilizada para as prévias de produção.','success');
  });
  return result;
};

// A rota histórica de colaboradores continua válida, mas passa a abrir a
// mesma superfície de formação para não duplicar a lógica de pessoal.
ViewLayer.prototype.collaborators=function(){return this.personnel();};
