// BELAVISTA_RETURN_TITLE_RESET_V5345
(() => {
  if(globalThis.__belavistaReturnTitleResetV5345)return;
  globalThis.__belavistaReturnTitleResetV5345=true;

  const MAP_SELECTOR=
    'map-scene[data-public-map],map-scene[data-public-presentation]';

  const state={
    armed:false,
    resetting:false,
    lastY:window.scrollY,
    resetCount:0
  };

  function mapNode(){
    return document.querySelector(MAP_SELECTOR);
  }

  function storyBounds(){
    const story=document.querySelector('[data-map-story],.public-map-story');
    const top=story
      ? story.getBoundingClientRect().top+window.scrollY
      : 0;
    const vh=Math.max(1,window.innerHeight||1);

    return {
      top,
      // Reset does not require absolute zero.
      resetAt:top+vh*.10,
      // Re-arm only after user has genuinely entered the interactive phase.
      armAt:top+vh*.30
    };
  }

  function captureBaseline(map){
    if(!map||map.__publicTitleBaselineV5345)return;
    map.__publicTitleBaselineV5345={
      zoom:Number(map.sceneManualZoom||map._sceneVisual?.scale||1),
      rotation:Number(map.sceneManualRotation||map._sceneVisual?.rotation||0),
      tiltAdjust:Number(map.sceneTiltAdjust||0),
      pan:{
        x:Number(map.sceneManualPan?.x||0),
        y:Number(map.sceneManualPan?.y||0)
      }
    };
  }

  function clearLotSelection(map){
    if(!map)return;

    // Cancel any selection-focus camera animation first.
    map.__publicSelectionTransitionTokenV5338=
      Symbol('return-title-selection-cancel-v5345');
    map._sceneTransition=Symbol('return-title-reset-v5345');

    const ids=map.selectedLotIds||new Set();
    for(const id of ids){
      const matches=(map.modelParts?.lots||[])
        .filter(item=>(item.userData?.partId||item.name)===id);

      for(const item of matches){
        delete item.userData.selectionMaterial;
        map.restorePartMaterial?.(item);
      }
    }

    ids.clear?.();
    map.selectedLotIds=ids;

    if(map.selectionHalo){
      map.selectionHalo.visible=false;
    }

    map.removeMapSelectionPanel?.();

    delete map.dataset.selectedPart;
    delete map.dataset.selectedKind;
    map.dataset.selectedLotCount='0';
    map.dataset.selectedLots='';

    delete map.__publicSelectedLotContextV5330;
    delete map.__publicSelectionViewV5318;

    const host=document.querySelector(
      '[data-public-lot-details-v5335],[data-selected-lot]'
    );

    if(host){
      host.hidden=true;
      host.innerHTML='';
      host.classList.remove('public-lot-info-v5318');
    }

    const form=document.querySelector(
      'public-lead-chat [data-chat-form]'
    );

    if(form){
      delete form.__publicAgentContextV5330;
      delete form.dataset.publicAgentRequest;
    }
  }

  function clearConstructionState(map){
    if(!map)return;

    for(const part of map.__publicRecordHighlightPartsV5330||[]){
      delete part.userData.overlayMaterial;
      map.restorePartMaterial?.(part);
    }

    map.__publicRecordHighlightPartsV5330=[];
    map.dataset.publicConstructionStage='';
    map.dataset.publicConstructionMapped='0';

    try{
      map.clearStageOverlay?.(false);
    }catch{}

    map.dataset.publicMapStateFilter='all';

    const markerGroup=map.__publicCommercialMarkersV5330;
    if(markerGroup){
      markerGroup.visible=false;
      markerGroup.children?.forEach?.(marker=>{
        marker.visible=false;
      });
    }
  }

  function closeTransientWidgets(){
    const modal=document.querySelector(
      '[data-public-lead-intent-modal-v5342]'
    );

    if(modal){
      const documentField=modal.querySelector('[name="document"]');
      if(documentField)documentField.value='';
      modal.hidden=true;
    }

    document.body.dataset.publicWidgetsVisible='false';
    document.body.dataset.publicControlsVisible='false';
    document.body.dataset.publicScrollSection='title';
    document.body.dataset.publicStickyPhase='title-fade';
    document.body.dataset.publicLeadIntentModal='closed';

    const surface=document.querySelector('public-leads-surface');
    if(surface){
      surface.dataset.publicElasticSection='title';
    }

    const sticky=document.querySelector('.public-map-sticky');
    if(sticky){
      sticky.dataset.publicStickyPhase='title-fade';
    }
  }

  function resetMapView(map){
    if(!map)return;

    const baseline=map.__publicTitleBaselineV5345||{
      zoom:Number(map.sceneManualZoom||1),
      rotation:0,
      tiltAdjust:0,
      pan:{x:0,y:0}
    };

    map.__publicSelectionTransitionTokenV5338=
      Symbol('return-title-map-reset-v5345');
    map._sceneTransition=Symbol('return-title-map-reset-v5345');

    // fitSceneView is the canonical central/original presentation in the
    // existing map-scene implementation: pan 0, rotation 0, tilt adjust 0,
    // default zoom.
    if(typeof map.fitSceneView==='function'){
      map.fitSceneView(true);
    }else{
      map.setScenePan?.(
        Number(baseline.pan?.x||0),
        Number(baseline.pan?.y||0),
        true
      );
      map.setSceneRotation?.(
        Number(baseline.rotation||0),
        true
      );
      map.setSceneTiltAdjust?.(
        Number(baseline.tiltAdjust||0),
        true
      );
      map.setSceneZoom?.(
        Number(baseline.zoom||1),
        true
      );
    }

    map.dataset.publicReturnReset='map-original-v5345';

    requestAnimationFrame(()=>{
      map.sceneStage?.updateMatrixWorld?.(true);
      map.renderer?.render?.(map.scene,map.camera);
    });
  }

  function performReturnReset(){
    if(state.resetting)return;

    const map=mapNode();
    if(!map)return;

    state.resetting=true;
    state.armed=false;
    state.resetCount++;

    clearLotSelection(map);
    clearConstructionState(map);
    closeTransientWidgets();
    resetMapView(map);

    document.body.dataset.publicReturnReset='done';
    document.body.dataset.publicReturnResetCount=
      String(state.resetCount);

    // Let scroll/title visual bookkeeping settle before accepting another
    // cycle. Re-arming still requires crossing armAt again.
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        state.resetting=false;
      });
    });
  }

  function onScroll(){
    const y=window.scrollY;
    const bounds=storyBounds();

    // Arm after entering the interactive region.
    if(
      y>=bounds.armAt||
      document.body.dataset.publicControlsVisible==='true'||
      document.body.dataset.publicScrollSection==='map'
    ){
      state.armed=true;
    }

    const movingUp=y<state.lastY-.5;
    state.lastY=y;

    // Return reset only when coming back upward into the title zone.
    if(
      state.armed&&
      movingUp&&
      y<=bounds.resetAt
    ){
      performReturnReset();
    }
  }

  function install(attempt=0){
    const map=mapNode();
    if(!map){
      if(attempt<30)setTimeout(()=>install(attempt+1),150);
      return;
    }

    captureBaseline(map);

    window.addEventListener(
      'scroll',
      onScroll,
      {passive:true,capture:true}
    );

    window.addEventListener('pageshow',()=>{
      state.lastY=window.scrollY;
      captureBaseline(mapNode());
      onScroll();
    },{passive:true});

    document.body.dataset.publicReturnResetReady='true';
    onScroll();
  }

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      ()=>install(),
      {once:true}
    );
  }else{
    install();
  }
})();
