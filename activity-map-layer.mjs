import {ACTIVITY_MAP_STATUSES} from './activity-map-intelligence.mjs';
import {runtimeUrlV1} from './runtime-url-v1.mjs?v=ngrok-route-v1';

const MAP_SELECTOR='map-scene[data-public-map],map-scene[data-admin-shared-public-map]';
let assignments=[];

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
  legend.querySelector('[data-activity-map-count]').textContent=`${strongest.size} área${strongest.size===1?'':'s'}`;
  legend.hidden=assignments.length===0;
  if(map.renderer?.render)map.renderer.render(map.scene,map.camera);
  else map._adminStandaloneRendererV5370?.render?.(map._adminStandaloneSceneV5370,map._adminStandaloneCameraV5370);
}

async function load(){
  try{const response=await fetch(runtimeUrlV1('/api/workbench/state?resource=activity-map'),{cache:'no-store'});if(response.ok)assignments=(await response.json()).assignments||[];}catch{}
  document.querySelectorAll(MAP_SELECTOR).forEach(apply);
}

function watch(map){
  ensureLegend(map);apply(map);
  new MutationObserver(()=>{if(map.dataset.modelReady==='true'||map.dataset.modelEnrichment==='ready')apply(map);}).observe(map,{attributes:true,attributeFilter:['data-model-ready','data-model-enrichment','data-admin-standalone-phase']});
}

function install(){document.querySelectorAll(MAP_SELECTOR).forEach(map=>{if(map.dataset.activityMapLayer)return;map.dataset.activityMapLayer='true';watch(map);});}
new MutationObserver(()=>install()).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('alianca:activity-map-updated',load);
install();void load();setInterval(load,30000);
