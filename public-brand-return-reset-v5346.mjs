// BELAVISTA_BRAND_RETURN_RESET_V5346
(() => {
  if(globalThis.__belavistaBrandReturnResetV5346)return;
  globalThis.__belavistaBrandReturnResetV5346=true;

  const MAP_SELECTOR='map-scene[data-public-map],map-scene[data-public-presentation]';
  const FULL_LOGO='./assets/public/alianca-park-logo-full-transparent-v551.png';
  const MARK_LOGO='./assets/public/alianca-park-logo-mark-transparent-v551.png';

  const state={
    armed:false,
    resetting:false,
    lastY:window.scrollY,
    resetCount:0
  };

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const smooth=t=>t*t*(3-2*t);
  const modernPublicPage=()=>Boolean(document.querySelector('.public-page-nav'));
  function removeLegacyBrand(){
    document.querySelector('[data-public-alianca-brand-v5346]')?.remove();
    document.getElementById('belavista-alianca-brand-v5346-style')?.remove();
  }

  function mapNode(){
    return document.querySelector(MAP_SELECTOR);
  }

  function storyMetrics(){
    const story=document.querySelector('[data-map-story],.public-map-story');
    const top=story?story.getBoundingClientRect().top+window.scrollY:0;
    const vh=Math.max(1,window.innerHeight||1);
    const height=Math.max(vh*2,story?.offsetHeight||vh*2);
    return {
      top,
      fadeEnd:top+vh*.30,
      resetAt:top+vh*.10,
      armAt:top+vh*.30,
      end:top+height
    };
  }

  function ensureBrand(){
    if(modernPublicPage()){
      removeLegacyBrand();
      return null;
    }
    let host=document.querySelector('[data-public-alianca-brand-v5346]');
    if(host)return host;

    const style=document.createElement('style');
    style.id='belavista-alianca-brand-v5346-style';
    style.textContent=`
      [data-public-alianca-brand-v5346]{
        position:fixed;
        left:0;
        top:0;
        width:280px;
        height:280px;
        z-index:72;
        pointer-events:none;
        transform-origin:0 0;
        will-change:transform,opacity;
        transition:opacity 180ms linear;
      }
      [data-public-alianca-brand-v5346] img{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        object-fit:contain;
        object-position:left top;
        user-select:none;
        -webkit-user-drag:none;
        filter:drop-shadow(0 12px 26px rgba(0,0,0,.20));
      }
      [data-public-alianca-brand-v5346] [data-brand-mark]{
        opacity:0;
        object-position:center;
        filter:drop-shadow(0 7px 16px rgba(0,0,0,.25));
      }
      @media(max-width:760px){
        [data-public-alianca-brand-v5346]{
          width:220px;
          height:220px;
        }
      }
    `;
    document.head.append(style);

    host=document.createElement('div');
    host.dataset.publicAliancaBrandV5346='true';
    host.setAttribute('aria-hidden','true');
    host.innerHTML=`
      <img data-brand-full src="${FULL_LOGO}" alt="">
      <img data-brand-mark src="${MARK_LOGO}" alt="">
    `;
    document.body.append(host);
    return host;
  }

  function updateBrand(){
    if(modernPublicPage()){
      removeLegacyBrand();
      return;
    }
    const host=ensureBrand();
    const full=host.querySelector('[data-brand-full]');
    const mark=host.querySelector('[data-brand-mark]');
    const {top,fadeEnd,end}=storyMetrics();
    const y=window.scrollY;
    const p=clamp((y-top)/Math.max(1,fadeEnd-top),0,1);
    const e=smooth(p);

    const baseWidth=host.getBoundingClientRect().width/
      Math.max(.001,Number(host.dataset.currentScale||1));
    const startX=window.innerWidth<=760?18:28;
    const startY=window.innerWidth<=760?12:18;
    const endScale=window.innerWidth<=760?.27:.24;
    const endX=Math.max(
      12,
      window.innerWidth-(window.innerWidth<=760?14:22)-baseWidth*endScale
    );
    const endY=window.innerWidth<=760?10:14;

    const scale=1+(endScale-1)*e;
    const x=startX+(endX-startX)*e;
    const yPos=startY+(endY-startY)*e;

    host.dataset.currentScale=String(scale);
    host.style.transform=
      `translate3d(${x.toFixed(1)}px,${yPos.toFixed(1)}px,0) scale(${scale.toFixed(4)})`;

    const logoSwap=clamp((p-.52)/.30,0,1);
    full.style.opacity=String(1-smooth(logoSwap));
    mark.style.opacity=String(smooth(logoSwap));

    const visible=y>=top-4&&y<end+window.innerHeight*.25;
    host.style.opacity=visible?'1':'0';
    host.dataset.brandPhase=
      p<.05?'letreiro':
      p<.92?'shrinking':
      'corner-mark';
  }

  function cancelSelectionMotion(map){
    if(!map)return;
    map.__publicSelectionTransitionTokenV5338=
      Symbol('return-title-selection-cancel-v5346');
    map._sceneTransition=Symbol('return-title-reset-v5346');
  }

  function clearSelectionData(map){
    if(!map)return;
    cancelSelectionMotion(map);

    const ids=map.selectedLotIds||new Set();
    for(const id of ids){
      for(const item of (map.modelParts?.lots||[])){
        if((item.userData?.partId||item.name)!==id)continue;
        delete item.userData.selectionMaterial;
        delete item.userData.overlayMaterial;
        map.restorePartMaterial?.(item);
      }
    }

    ids.clear?.();
    map.selectedLotIds=ids;

    if(map.selectionHalo)map.selectionHalo.visible=false;
    map.removeMapSelectionPanel?.();

    delete map.dataset.selectedPart;
    delete map.dataset.selectedKind;
    map.dataset.selectedLotCount='0';
    map.dataset.selectedLots='';

    delete map.__publicSelectedLotContextV5330;
    delete map.__publicSelectionViewV5318;

    const form=document.querySelector('public-lead-chat [data-chat-form]');
    if(form){
      delete form.__publicAgentContextV5330;
      delete form.dataset.publicAgentRequest;
    }
  }

  function closeLotWidget(){
    // Dedicated v5.3.35+ card: remove it entirely so the next selection
    // receives a fresh host without stale inline display state.
    document.querySelectorAll(
      '[data-public-lot-details-v5335],'+
      '.public-map-sticky > .public-selected-lot,'+
      '.public-map-sticky > .public-lot-info-v5318'
    ).forEach(node=>node.remove());

    // Legacy host is also removed when it belongs to the sticky scene.
    document.querySelectorAll(
      '.public-map-sticky > [data-selected-lot]'
    ).forEach(node=>node.remove());

    // Safety for any implementation that mounted the widget elsewhere.
    document.querySelectorAll(
      '[data-selected-lot].public-selected-lot,'+
      '[data-selected-lot].public-lot-info-v5318'
    ).forEach(node=>node.remove());

    document.body.dataset.publicLotWidget='closed';
  }

  function closeOtherTransientWidgets(){
    const modal=document.querySelector('[data-public-lead-intent-modal-v5342]');
    if(modal){
      const documentField=modal.querySelector('[name="document"]');
      if(documentField)documentField.value='';
      modal.hidden=true;
    }

    document.body.dataset.publicLeadIntentModal='closed';
    document.body.dataset.publicWidgetsVisible='false';
    document.body.dataset.publicControlsVisible='false';
    document.body.dataset.publicScrollSection='title';
    document.body.dataset.publicStickyPhase='title-fade';

    const surface=document.querySelector('public-leads-surface');
    if(surface)surface.dataset.publicElasticSection='title';

    const sticky=document.querySelector('.public-map-sticky');
    if(sticky)sticky.dataset.publicStickyPhase='title-fade';
  }

  function clearMapOverlays(map){
    if(!map)return;

    for(const part of map.__publicRecordHighlightPartsV5330||[]){
      delete part.userData.overlayMaterial;
      map.restorePartMaterial?.(part);
    }

    map.__publicRecordHighlightPartsV5330=[];
    map.dataset.publicConstructionStage='';
    map.dataset.publicConstructionMapped='0';
    map.dataset.publicMapStateFilter='all';

    try{map.clearStageOverlay?.(false);}catch{}

    const markerGroup=map.__publicCommercialMarkersV5330;
    if(markerGroup){
      markerGroup.visible=false;
      markerGroup.children?.forEach?.(marker=>marker.visible=false);
    }
  }

  function resetMapView(map){
    if(!map)return;
    cancelSelectionMotion(map);

    if(typeof map.fitSceneView==='function'){
      map.fitSceneView(true);
    }else{
      map.setScenePan?.(0,0,true);
      map.setSceneRotation?.(0,true);
      map.setSceneTiltAdjust?.(0,true);
      map.setSceneZoom?.(1,true);
    }

    map.dataset.publicReturnReset='map-original-v5346';

    requestAnimationFrame(()=>{
      map.sceneStage?.updateMatrixWorld?.(true);
      map.renderer?.render?.(map.scene,map.camera);
    });
  }

  function performReset(){
    if(state.resetting)return;
    const map=mapNode();
    if(!map)return;

    state.resetting=true;
    state.armed=false;
    state.resetCount++;

    clearSelectionData(map);
    closeLotWidget();
    closeOtherTransientWidgets();
    clearMapOverlays(map);
    resetMapView(map);

    document.body.dataset.publicReturnReset='done-v5346';
    document.body.dataset.publicReturnResetCount=String(state.resetCount);

    requestAnimationFrame(()=>{
      updateBrand();
      requestAnimationFrame(()=>state.resetting=false);
    });
  }

  function onScroll(){
    updateBrand();

    const y=window.scrollY;
    const {armAt,resetAt}=storyMetrics();

    if(
      y>=armAt||
      document.body.dataset.publicControlsVisible==='true'||
      document.body.dataset.publicScrollSection==='map'
    ){
      state.armed=true;
    }

    const movingUp=y<state.lastY-.5;
    state.lastY=y;

    if(state.armed&&movingUp&&y<=resetAt){
      performReset();
    }
  }

  function install(){
    ensureBrand();
    updateBrand();

    window.addEventListener('scroll',onScroll,{passive:true,capture:true});
    window.addEventListener('resize',updateBrand,{passive:true});
    window.addEventListener('pageshow',()=>{
      state.lastY=window.scrollY;
      onScroll();
    },{passive:true});

    document.body.dataset.publicReturnResetReady='v5346';
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
