const VERSION='5.3.3';
const SELECTOR='map-scene[data-public-presentation],map-scene[data-public-map]';
const FLAG=Symbol.for('belavista.public.fast.runtime.v533');
const PERF=window.__BELAVISTA_PUBLIC_PERF__ ||= {version:VERSION,boot:Math.round(performance.now()),events:[]};
const mark=(name,extra={})=>{PERF.events.push({name,at:Math.round(performance.now()),...extra});};
const isPublic=el=>Boolean(el?.matches?.(SELECTOR));
const isStaticOnly=el=>Boolean(el?.hasAttribute?.('data-public-static-only'));
const idle=(fn)=>{const start=()=>{'requestIdleCallback' in window?window.requestIdleCallback(fn,{timeout:9000}):setTimeout(fn,1800)};if(document.readyState==='complete')setTimeout(start,650);else window.addEventListener('load',()=>setTimeout(start,650),{once:true});};

function lightweightOverlayTargets(instance){
  const lots=[...(instance.modelParts?.lots||[])],streets=[...(instance.modelParts?.streets||[])],other=[...(instance.modelParts?.other||[])];
  const all=[...lots,...streets];
  const scenic=[...(instance.modelLandscapeNodes||[]),...(instance.modelLeisureNodes||[])];
  const keys=['terraplanagem','drenagem','rede-agua','rede-eletrica','pavimentacao','urbanizacao'];
  instance.stageOverlayTargets={};
  keys.forEach((key,i)=>{const bucket=all.filter((_,idx)=>idx%keys.length===i).slice(0,220);instance.stageOverlayTargets[key]=key==='urbanizacao'?[...bucket,...scenic.slice(0,80)]:bucket;});
  instance.dataset.overlayManifest='public-fast';instance.dataset.overlayTargetTotal=String(all.length);instance.dataset.overlayScenicTargets=String(scenic.length);
}

function fastLoadMasterplan(instance,THREE,GLTFLoader){
  if(instance._modelLoadStarted)return;
  instance._modelLoadStarted=true;instance.dataset.modelSource='loading-glb';instance.dataset.modelRender='webgl-progressive';instance.dataset.modelProgress='0';
  const loader=new GLTFLoader();
  const modelUrl='./assets/model/alianca_park_masterplan_preview.glb?v=public-fast-v5.3.3';
  mark('glb-request');
  loader.load(modelUrl,gltf=>{
    const workStarted=performance.now();
    try{
      const sourceModel=gltf?.scene;if(!sourceModel)throw new Error('GLB sem scene');
      sourceModel.updateMatrixWorld(true);
      const sourceBox=new THREE.Box3().setFromObject(sourceModel),size=sourceBox.getSize(new THREE.Vector3()),sourceCenter=sourceBox.getCenter(new THREE.Vector3());
      sourceModel.position.set(-sourceCenter.x,-sourceBox.min.y,-sourceCenter.z);
      const model=new THREE.Group();model.name='MasterplanFrame';model.add(sourceModel);
      const largest=Math.max(size.x,size.y,size.z)||1,factor=145/largest,vertical=1.33335;
      model.scale.set(factor,factor*vertical,factor);model.rotation.set(Math.PI/2,0,0);model.updateMatrixWorld(true);
      const rawBox=new THREE.Box3().setFromObject(model),baseLift=Math.max(0,-rawBox.min.z);model.position.z+=baseLift;model.updateMatrixWorld(true);
      const orientedBox=new THREE.Box3().setFromObject(model),orientedSize=orientedBox.getSize(new THREE.Vector3());
      instance.modelSourceFootprint={x:orientedSize.x,y:orientedSize.y,scale:factor};instance.masterplanModel=model;instance.masterplanLargest=largest;
      instance.modelParts={lots:[],streets:[],other:[]};const landscape=[],leisure=[],structures=[];let streetIndex=0;
      model.traverse(node=>{
        if(!node.isMesh)return;
        node.frustumCulled=true;node.renderOrder=8;node.userData.defaultMaterial=node.material;
        const name=String(node.name||'').toLowerCase(),role=String(node.userData?.belavistaRole||'').toLowerCase();
        const kind=role==='lot'||role==='lots'?'lots':role==='street'||role==='streets'||role==='road'?'streets':/(lote|quadra|gleba)/.test(name)?'lots':/(asfalto|rua|road|street|meio.?fio|guia|paviment)/.test(name)?'streets':'other';
        node.userData.partKind=kind;node.userData.partId=kind==='streets'?`street-public-${++streetIndex}`:node.name;node.userData.partLabel=kind==='lots'?`Lote ${node.name.replace(/^.*?lote[_ -]?/i,'').replace(/[_ -]?mesh.*$/i,'')}`:node.name||'Elemento do empreendimento';instance.modelParts[kind].push(node);
        if(role==='landscape'||/arvore|tree|tronco|copa|folhagem/.test(name))landscape.push(node);if(role==='leisure'||/area.?de.?lazer|court|gym.?pad|pavilhao|play|praca/.test(name))leisure.push(node);if(/pavilhao.?telhado|pavilhao.?base/.test(name))structures.push(node);
      });
      instance.modelLandscapeNodes=landscape;instance.modelLeisureNodes=leisure;instance.modelLeisureFocusNodes=structures.length?structures:leisure;
      instance.dataset.streetSegmentation='public-skipped';instance.dataset.streetSegmentCount=String(instance.modelParts.streets.length);instance.dataset.curbOutlines='public-skipped';instance.dataset.lotStatusBadges='public-deferred';
      instance.dataset.modelParts=`lotes:${instance.modelParts.lots.length}|ruas:${instance.modelParts.streets.length}|outros:${instance.modelParts.other.length}`;
      instance.dataset.landscapeNodes=String(landscape.length);instance.dataset.leisureNodes=String(leisure.length);instance.dataset.modelHeight='1.33x vertical · public fast path';instance.dataset.modelBaseLift=baseLift.toFixed(3);
      lightweightOverlayTargets(instance);
      instance.modelGroup?.add(model);if(instance.modelGroup)instance.modelGroup.visible=true;instance.modelReady=true;instance.dataset.modelReady='true';instance.dataset.modelProgress='100';instance.dataset.modelRender='webgl-live-glb-fast';instance.dataset.modelRasterized='false';instance.classList.add('model-ready');
      requestAnimationFrame(()=>{try{instance.syncThree?.();instance.applySceneView?.('map',true);instance.renderer?.render?.(instance.scene,instance.camera);}catch(error){console.warn('[Belavista v5.3.3] render pós-GLB',error);}});
      mark('glb-ready',{processMs:Math.round(performance.now()-workStarted),parts:instance.dataset.modelParts});
    }catch(error){instance.dataset.modelError='processamento-falhou';instance.dataset.modelRender='fallback';console.warn('[Belavista v5.3.3] GLB process',error);mark('glb-process-error',{message:String(error?.message||error)});}
  },progress=>{if(progress.total)instance.dataset.modelProgress=String(Math.round(progress.loaded/progress.total*100));},error=>{instance.dataset.modelError='arquivo-indisponivel';instance.dataset.modelRender='fallback';console.warn('[Belavista v5.3.3] GLB indisponível',error);mark('glb-load-error');});
}

function patchCtor(Ctor){
  const proto=Ctor?.prototype;if(!proto||proto[FLAG])return false;Object.defineProperty(proto,FLAG,{value:true});
  const originals={initWhenReady:proto.initWhenReady,scheduleThree:proto.scheduleThree,initThree:proto.initThree,refreshMapSurface:proto.refreshMapSurface,syncThree:proto.syncThree,loadMasterplan:proto.loadMasterplan,buildStageOverlayTargets:proto.buildStageOverlayTargets,startPublic3D:proto.startPublic3D};
  if(typeof originals.initWhenReady==='function')proto.initWhenReady=function(...args){
    if(!isPublic(this))return originals.initWhenReady.apply(this,args);
    if(this.hasAttribute('data-admin-public-map'))return originals.initWhenReady.apply(this,args);
    if(isStaticOnly(this)){
      this.setAttribute('data-public-static-base','true');
      this.dataset.renderMode='static-satellite-markers';
      this.dataset.mapInit='static-only';
      this.dataset.publicThree='disabled-static-only';
      this._threeScheduled=false;
      mark('map-init-static-only');
      return;
    }
    this.setAttribute('data-public-static-base','true');this.dataset.renderMode='static-first-progressive-3d';this.dataset.mapInit='nonblocking';
    // Leaflet passa a ser referência geográfica secundária: não bloqueia a primeira pintura.
    const tryLeaflet=(attempt=0)=>{if(this.map)return;if(window.L){try{this.initLeaflet?.();this.dataset.mapInit='leaflet-ready-late';this.syncThree?.();}catch(error){this.dataset.mapInit='leaflet-late-error';}}else if(attempt<80)setTimeout(()=>tryLeaflet(attempt+1),100);};
    setTimeout(()=>tryLeaflet(),0);this.scheduleThree?.();mark('map-init-nonblocking');
  };
  if(typeof originals.initThree==='function')proto.initThree=function(...args){if(!isPublic(this)||this._belavistaPublic3DAllowed)return originals.initThree.apply(this,args);if(isStaticOnly(this)){this.dataset.publicThree='disabled-static-only';return Promise.resolve();}this.scheduleThree?.();return Promise.resolve();};
  proto.scheduleThree=function(...args){
    if(!isPublic(this)){if(typeof originals.scheduleThree==='function')return originals.scheduleThree.apply(this,args);return;}
    if(isStaticOnly(this)){this.setAttribute('data-public-static-base','true');this.dataset.renderMode='static-satellite-markers';this.dataset.publicThree='disabled-static-only';this._threeScheduled=false;return;}
    this.setAttribute('data-public-static-base','true');if(this._threeScheduled||this.renderer)return;this._threeScheduled=true;this.dataset.publicThree='idle-deferred';mark('3d-deferred');
    idle(()=>{if(this.renderer)return;this._belavistaPublic3DAllowed=true;this.dataset.publicThree='starting-idle';mark('3d-start');Promise.resolve(typeof originals.initThree==='function'?originals.initThree.apply(this,args):undefined).catch(error=>{this.dataset.modelError='three-init-failed';console.warn('[Belavista v5.3.3] initThree',error);});});
  };
  if(typeof originals.startPublic3D==='function')proto.startPublic3D=function(...args){if(!isPublic(this))return originals.startPublic3D.apply(this,args);if(isStaticOnly(this)){this.dataset.publicThree='disabled-static-only';return false;}return this.scheduleThree?.(...args);};
  if(typeof originals.refreshMapSurface==='function')proto.refreshMapSurface=function(...args){if(!isPublic(this))return originals.refreshMapSurface.apply(this,args);this.dataset.mapRasterMode='static-css-background';this.dataset.mapTexture='static-css';this.dataset.mapTextureTiles='0/0';this.dataset.mapSurfaceVisible='false';if(this.mapSurface)this.mapSurface.visible=false;};
  if(typeof originals.syncThree==='function')proto.syncThree=function(...args){
    if(!isPublic(this)||this.map?._loaded)return originals.syncThree.apply(this,args);
    if(!this.renderer||!this.camera)return;const host=this.querySelector?.('.map-host')||this,w=Math.max(2,host.clientWidth||this.clientWidth||innerWidth),h=Math.max(2,host.clientHeight||this.clientHeight||innerHeight);
    try{this.renderer.setSize(w,h,false);this.configurePerspectiveCamera?.(w,h);if(this.masterplanModel&&this.masterplanLargest){const frame=Math.min(w,h)*1.32,scale=frame/this.masterplanLargest;this.masterplanModel.scale.set(scale,scale*1.33335,scale);this.masterplanModel.updateMatrixWorld(true);}this.renderer.render(this.scene,this.camera);this.dataset.publicSync='viewport-without-leaflet';}catch(error){console.warn('[Belavista v5.3.3] sync leve',error);}
  };
  if(typeof originals.loadMasterplan==='function')proto.loadMasterplan=function(THREE,GLTFLoader,...rest){if(!isPublic(this))return originals.loadMasterplan.call(this,THREE,GLTFLoader,...rest);return fastLoadMasterplan(this,THREE,GLTFLoader);};
  if(typeof originals.buildStageOverlayTargets==='function')proto.buildStageOverlayTargets=function(...args){if(!isPublic(this))return originals.buildStageOverlayTargets.apply(this,args);return lightweightOverlayTargets(this);};
  mark('prototype-patched');return true;
}

const existing=customElements.get('map-scene');
if(existing)patchCtor(existing);else{
  const originalDefine=customElements.define;
  customElements.define=function(name,Ctor,options){if(name==='map-scene')patchCtor(Ctor);const result=originalDefine.call(this,name,Ctor,options);if(name==='map-scene')customElements.define=originalDefine;return result;};
}

const prepare=map=>{if(!map)return;map.setAttribute('data-public-static-base','true');map.dataset.publicFastRuntime=VERSION;if(isStaticOnly(map)){map.dataset.renderMode='static-satellite-markers';map.dataset.publicThree='disabled-static-only';}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll(SELECTOR).forEach(prepare),{once:true});else document.querySelectorAll(SELECTOR).forEach(prepare);
window.__BELAVISTA_START_3D__=()=>{const map=document.querySelector(SELECTOR);if(!map||isStaticOnly(map)){if(isStaticOnly(map))map.dataset.publicThree='disabled-static-only';return false;}map._threeScheduled=false;map._belavistaPublic3DAllowed=true;const Ctor=customElements.get('map-scene');const proto=Ctor?.prototype;if(typeof proto?.initThree==='function'){mark('3d-manual');proto.initThree.call(map);return true;}return false;};
