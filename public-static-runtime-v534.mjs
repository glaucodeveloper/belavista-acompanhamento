const VERSION='5.3.4';
const MAP_SELECTOR='map-scene[data-public-presentation],map-scene[data-public-map]';
const FLAG=Symbol.for('belavista.public.static.stable.v534');
const PERF=window.__BELAVISTA_PUBLIC_PERF__ ||= {version:VERSION,boot:Math.round(performance.now()),events:[]};
const mark=(name,extra={})=>PERF.events.push({name,at:Math.round(performance.now()),...extra});
const isPublic=el=>Boolean(el?.matches?.(MAP_SELECTOR));

function staticizeMap(el){
  if(!el)return;
  el.setAttribute('data-public-static-base','true');
  el.dataset.publicRuntime=VERSION;
  el.dataset.publicThree='disabled-on-load';
  el.dataset.three='disabled-public';
  el.dataset.modelRender='static-pdf';
  el.dataset.mapInit='static-only';
  el.dataset.mapRasterMode='static-pdf-image';
  el.dataset.mapTextureTiles='0/0';
  el.dataset.mapControls='public-disabled';
}

function patchMapCtor(Ctor){
  const proto=Ctor?.prototype;
  if(!proto||proto[FLAG])return false;
  Object.defineProperty(proto,FLAG,{value:true});
  const original={
    initWhenReady:proto.initWhenReady,
    initLeaflet:proto.initLeaflet,
    scheduleThree:proto.scheduleThree,
    initThree:proto.initThree,
    startPublic3D:proto.startPublic3D,
    refreshMapSurface:proto.refreshMapSurface,
    syncThree:proto.syncThree,
    loadMasterplan:proto.loadMasterplan
  };
  const disabled=function(){ if(!isPublic(this))return undefined; staticizeMap(this); return undefined; };
  if(typeof original.initWhenReady==='function')proto.initWhenReady=function(...args){if(!isPublic(this))return original.initWhenReady.apply(this,args);staticizeMap(this);mark('map-init-bypassed');};
  if(typeof original.initLeaflet==='function')proto.initLeaflet=function(...args){if(!isPublic(this))return original.initLeaflet.apply(this,args);staticizeMap(this);mark('leaflet-bypassed');};
  proto.scheduleThree=function(...args){if(!isPublic(this)&&typeof original.scheduleThree==='function')return original.scheduleThree.apply(this,args);staticizeMap(this);mark('three-schedule-bypassed');};
  if(typeof original.initThree==='function')proto.initThree=function(...args){if(!isPublic(this))return original.initThree.apply(this,args);staticizeMap(this);mark('three-init-bypassed');return Promise.resolve();};
  if(typeof original.startPublic3D==='function')proto.startPublic3D=function(...args){if(!isPublic(this))return original.startPublic3D.apply(this,args);staticizeMap(this);return Promise.resolve();};
  if(typeof original.refreshMapSurface==='function')proto.refreshMapSurface=function(...args){if(!isPublic(this))return original.refreshMapSurface.apply(this,args);staticizeMap(this);if(this.mapSurface)this.mapSurface.visible=false;};
  if(typeof original.syncThree==='function')proto.syncThree=function(...args){if(!isPublic(this))return original.syncThree.apply(this,args);};
  if(typeof original.loadMasterplan==='function')proto.loadMasterplan=function(...args){if(!isPublic(this))return original.loadMasterplan.apply(this,args);staticizeMap(this);};
  mark('map-prototype-staticized');
  return true;
}

const existing=customElements.get('map-scene');
if(existing)patchMapCtor(existing);
else{
  const nativeDefine=customElements.define.bind(customElements);
  customElements.define=function(name,Ctor,options){
    if(name==='map-scene')patchMapCtor(Ctor);
    const result=nativeDefine(name,Ctor,options);
    if(name==='map-scene')customElements.define=nativeDefine;
    return result;
  };
}

function applyCopy(root=document){
  const kicker=root.querySelector?.('.public-hero-letter > span,.public-hero-letter [data-hero-kicker]');
  if(kicker && kicker.textContent!=='ALIANÇA PARK · AMARGOSA, BAHIA') kicker.textContent='ALIANÇA PARK · AMARGOSA, BAHIA';
  const title=root.querySelector?.('.public-hero-letter h1');
  if(title && title.dataset.copyV534!=='1'){
    title.innerHTML='Escolha seu lote<br><em>em Amargosa, Bahia.</em>';
    title.dataset.copyV534='1';
  }
  root.querySelectorAll?.(MAP_SELECTOR).forEach(staticizeMap);
}

const start=()=>{
  applyCopy();
  const observer=new MutationObserver(()=>applyCopy());
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>observer.disconnect(),12000);
  document.documentElement.dataset.publicStableRuntime=VERSION;
  window.__BELAVISTA_MODEL_LOADER_STATE__={version:VERSION,closed:true,reason:'3d-disabled-on-public-load',elapsed:0};
  mark('public-ready-static');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
