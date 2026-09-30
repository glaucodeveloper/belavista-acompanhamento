import {ACTIVITY_MAP_STATUSES} from './activity-map-intelligence.mjs';
import {runtimeUrlV1} from './runtime-url-v1.mjs?v=ngrok-route-v1';
import {appStore,demoData} from './state.js';

const MAP_SELECTOR='map-scene[data-public-map],map-scene[data-admin-shared-public-map]';
let assignments=[];

function lotNumber(value){
  const match=String(value||'').match(/(?:lote|lot)[^0-9]*(\d{1,4})/i)||String(value||'').match(/\b(\d{1,4})\b/);
  if(!match)return '';
  return String(Number(match[1]));
}

function leadGroups(){
  const state=appStore.get?.()||{};
  const live=Array.isArray(state.publicLeads)?state.publicLeads:[];
  const demo=Array.isArray(demoData?.leads)?demoData.leads:[];
  const all=[...live,...demo],selectedIndex=Math.max(0,Math.min(all.length-1,Number(state.selectedLead)||0));
  const groups=new Map();
  all.forEach((lead,index)=>{
    const number=lotNumber(lead?.lot);
    if(!number)return;
    const key=number;
    const current=groups.get(key)||{
      number,
      label:String(lead?.lot||`Lote ${number}`),
      count:0,
      selected:false
    };
    current.count++;
    current.selected=current.selected||index===selectedIndex;
    if(!current.label||current.label===`Lote ${number}`)current.label=String(lead?.lot||current.label);
    groups.set(key,current);
  });
  return [...groups.values()];
}

function lotParts(map){
  const parts=map.physicalMapParts?.()||[];
  const seen=new Set();
  return parts.filter(part=>{
    if(part?.userData?.partKind!=='lots')return false;
    const key=String(part.userData?.partId||part.name||'');
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function disposeLeadMarkerGroup(map){
  const group=map.leadNumberMarkerGroup;
  if(!group)return;
  group.traverse(node=>{
    node.material?.map?.dispose?.();
    node.material?.dispose?.();
  });
  group.removeFromParent?.();
  map.leadNumberMarkerGroup=null;
}

function renderLeadMarkers(map){
  const groups=leadGroups(),parts=lotParts(map),THREE=map.THREE,host=map.masterplanModel||map.modelGroup;
  if(!groups.length||!parts.length||!THREE||!host){
    disposeLeadMarkerGroup(map);
    map.dataset.leadNumberMarkers=groups.length?'waiting-model':'0';
    return;
  }
  const signature=groups.map(group=>`${group.number}:${group.count}:${group.selected?'1':'0'}`).join('|');
  if(map.leadNumberMarkerGroup&&map.dataset.leadNumberMarkerSignature===signature)return;
  disposeLeadMarkerGroup(map);
  const markerGroup=new THREE.Group();
  markerGroup.name='AliançaPark_LeadNumberMarkers';
  markerGroup.renderOrder=30;
  markerGroup.userData={source:'Leads page · grouped intentions · canonical lot centers'};
  host.add(markerGroup);
  map.leadNumberMarkerGroup=markerGroup;
  map.dataset.leadNumberMarkerSignature=signature;
  map.sceneStage?.updateMatrixWorld?.(true);
  map.modelGroup?.updateMatrixWorld?.(true);
  host.updateWorldMatrix?.(true,true);
  let rendered=0;
  for(const group of groups){
    const part=parts.find(item=>lotNumber(item.userData?.partLabel||item.name)===group.number);
    if(!part)continue;
    const bounds=new THREE.Box3().setFromObject(part),world=bounds.getCenter(new THREE.Vector3());
    if(bounds.isEmpty?.())continue;
    const local=host.worldToLocal(world.clone());
    const canvas=document.createElement('canvas');
    canvas.width=128;canvas.height=128;
    const context=canvas.getContext('2d');
    if(!context)continue;
    const color=group.selected?'#24a148':'#0f62fe';
    context.clearRect(0,0,128,128);
    context.beginPath();context.arc(64,64,42,0,Math.PI*2);context.fillStyle=color;context.fill();
    context.lineWidth=5;context.strokeStyle='#ffffff';context.stroke();
    context.fillStyle='#ffffff';context.font='700 38px Arial';context.textAlign='center';context.textBaseline='middle';context.fillText(String(group.count),64,65);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
    sprite.name=`Lead_${group.number}_marker`;
    sprite.scale.set(5.4,5.4,1);
    local.z+=3.2;sprite.position.copy(local);sprite.renderOrder=31;sprite.raycast=()=>{};
    sprite.userData={leadLotNumber:group.number,leadLotLabel:group.label,leadCount:group.count,active:group.selected};
    markerGroup.add(sprite);
    rendered++;
  }
  if(!rendered)disposeLeadMarkerGroup(map);
  map.dataset.leadNumberMarkers=String(rendered);
  map.dataset.leadNumberMarkerLayer='three-sprites';
  map.dataset.leadNumberMarkerSource='leads-page-grouped-by-lot · canonical-model-centers';
}

function queueLeadMarkers(map){
  if(map._leadMarkerFrame)return;
  map._leadMarkerFrame=requestAnimationFrame(()=>{
    map._leadMarkerFrame=0;
    renderLeadMarkers(map);
  });
}

function updateLeadMarkers(){
  document.querySelectorAll(MAP_SELECTOR).forEach(queueLeadMarkers);
}

function ensureLegend(map){
  let legend=map.querySelector(':scope > [data-activity-map-legend]');
  if(legend)return legend;
  legend=document.createElement('aside');legend.dataset.activityMapLegend='';legend.className='activity-map-legend';
  legend.innerHTML=`<header><span>OBRA NO MAPA</span><b data-activity-map-count>0 áreas</b></header><div>${Object.entries(ACTIVITY_MAP_STATUSES).map(([key,value])=>`<span><i style="--status-color:${value.color}"></i>${value.label}</span>`).join('')}</div><small>As cores mostram serviços localizados no cronograma.</small>`;
  map.appendChild(legend);return legend;
}

function apply(map){
  const legend=ensureLegend(map),parts=map.physicalMapParts?.()||[];
  const strongest=new Map();
  for(const assignment of assignments){
    const status=ACTIVITY_MAP_STATUSES[assignment.status]||ACTIVITY_MAP_STATUSES.scheduled;
    for(const id of assignment.partIds||[]){const current=strongest.get(String(id));if(!current||status.priority>current.status.priority)strongest.set(String(id),{assignment,status});}
  }
  for(const part of parts){
    const id=String(part.userData?.partId||part.name||'');
    const sourceStreetId=Number.isFinite(Number(part.userData?.streetSourceOrdinal))
      ?`street-source-${Number(part.userData.streetSourceOrdinal)}`
      :'';
    const match=strongest.get(id)||(sourceStreetId?strongest.get(sourceStreetId):null);
    if(match){
      if(!part.userData.physicalProgressDefaultMaterial)part.userData.physicalProgressDefaultMaterial=part.material;
      part.material=map.materialForColor?.(part.userData.physicalProgressDefaultMaterial,match.status.hex,.82)||part.material;
      part.userData.activityMapStatus=match.assignment.status;
    }else if(part.userData.physicalProgressDefaultMaterial){part.material=part.userData.physicalProgressDefaultMaterial;delete part.userData.physicalProgressDefaultMaterial;delete part.userData.activityMapStatus;}
  }
  map.applyStreetPaverInstanceStatusMap?.(strongest);
  legend.querySelector('[data-activity-map-count]').textContent=`${strongest.size} área${strongest.size===1?'':'s'}`;
  legend.hidden=assignments.length===0;
  queueLeadMarkers(map);
  if(map.renderer?.render)map.renderer.render(map.scene,map.camera);
  else map._adminStandaloneRendererV5370?.render?.(map._adminStandaloneSceneV5370,map._adminStandaloneCameraV5370);
}

async function load(){
  try{const response=await fetch(runtimeUrlV1('/api/workbench/state?resource=activity-map'),{cache:'no-store'});if(response.ok)assignments=(await response.json()).assignments||[];}catch{}
  document.querySelectorAll(MAP_SELECTOR).forEach(apply);
}

function watch(map){
  ensureLegend(map);apply(map);
  new MutationObserver(()=>{
    if(map.dataset.modelReady==='true'||map.dataset.modelEnrichment==='ready')apply(map);
    else queueLeadMarkers(map);
  }).observe(map,{attributes:true,attributeFilter:['data-model-ready','data-model-enrichment','data-admin-standalone-phase','data-scene-pan','data-scene-zoom','data-scene-rotation','data-scene-tilt','data-public-gap-frame']});
}

function install(){document.querySelectorAll(MAP_SELECTOR).forEach(map=>{if(map.dataset.activityMapLayer)return;map.dataset.activityMapLayer='true';watch(map);});}
new MutationObserver(()=>install()).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('alianca:activity-map-updated',load);
appStore.subscribe?.(()=>updateLeadMarkers());
install();void load();setInterval(load,30000);
