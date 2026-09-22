// BELAVISTA_ADMIN_MAP_LAYER_PAN_V5354
(() => {
  if(globalThis.__belavistaAdminMapLayerPanV5354)return;
  globalThis.__belavistaAdminMapLayerPanV5354=true;

  const SELECTOR='map-scene[data-admin-shared-public-map]';

  const zoomOf=map=>Math.max(
    .01,
    Number(map?._sceneVisual?.scale||map?.sceneManualZoom)||1
  );

  function viewportOf(map){
    const canvas=map?.querySelector?.('.three-overlay');
    const host=map?.querySelector?.('.map-host');
    const rect=canvas?.getBoundingClientRect?.();
    const width=Math.max(
      1,
      Number(rect?.width)||canvas?.clientWidth||host?.clientWidth||map?.clientWidth||innerWidth
    );
    const height=Math.max(
      1,
      Number(rect?.height)||canvas?.clientHeight||host?.clientHeight||map?.clientHeight||innerHeight
    );
    return {canvas,host,width,height};
  }

  function boundsFor(map,zoom=zoomOf(map)){
    const {width,height}=viewportOf(map);
    return {
      zoom,
      width,
      height,
      x:(width/2)/zoom,
      y:(height/2)/zoom
    };
  }

  function installPrototype(){
    const Ctor=customElements.get('map-scene');
    const proto=Ctor?.prototype;
    if(!proto||proto.__belavistaAdminLayerPanV5354)return false;
    proto.__belavistaAdminLayerPanV5354=true;

    const previousSetPan=proto.setScenePan;
    const previousClamp=proto.clampScenePan;
    const previousBounds=proto.getScenePanBounds;
    const previousConstrain=proto.constrainScenePan;

    if(typeof previousSetPan!=='function')return false;

    proto.getScenePanBounds=function(){
      if(!this.matches?.(SELECTOR)){
        return typeof previousBounds==='function'
          ? previousBounds.call(this)
          : {x:0,y:0};
      }
      const b=boundsFor(this);
      this.dataset.scenePanBoundsMode='admin-xy-zoom-v5354';
      this.dataset.scenePanBounds=`±${Math.round(b.x)},±${Math.round(b.y)}`;
      this.dataset.scenePanScreenBounds=
        `±${Math.round(b.x*b.zoom)},±${Math.round(b.y*b.zoom)}`;
      return {
        x:b.x,
        y:b.y,
        surfaceW:b.width,
        surfaceH:b.height,
        coveredW:b.width,
        coveredH:b.height,
        tiltProjection:1
      };
    };

    proto.clampScenePan=function(x,y){
      if(!this.matches?.(SELECTOR)){
        return typeof previousClamp==='function'
          ? previousClamp.call(this,x,y)
          : {x:Number(x)||0,y:Number(y)||0};
      }

      const b=boundsFor(this);
      const input={x:Number(x)||0,y:Number(y)||0};
      const target={
        x:Math.max(-b.x,Math.min(b.x,input.x)),
        y:Math.max(-b.y,Math.min(b.y,input.y))
      };

      this.dataset.scenePanBoundsMode='admin-xy-zoom-v5354';
      this.dataset.scenePanClamped=
        target.x!==input.x||target.y!==input.y?'true':'false';
      return target;
    };

    proto.setScenePan=function(x,y,animate=false){
      if(!this.matches?.(SELECTOR)){
        return previousSetPan.call(this,x,y,animate);
      }

      const current=this.sceneManualPan||{x:0,y:0};
      const input={x:Number(x)||0,y:Number(y)||0};
      const gesture=this.__adminPanGestureV5354;
      let requested=input;

      if(gesture){
        const rawDx=input.x-current.x;
        const rawDy=input.y-current.y;
        requested={
          x:current.x+rawDx/gesture.zoom,
          y:current.y+rawDy/gesture.zoom
        };
        this.dataset.adminPanRawDelta=
          `${rawDx.toFixed(2)},${rawDy.toFixed(2)}`;
        this.dataset.adminPanLocalDelta=
          `${(rawDx/gesture.zoom).toFixed(2)},${(rawDy/gesture.zoom).toFixed(2)}`;
      }

      const b=gesture?.bounds||boundsFor(this);
      const eps=.001;
      let target={...requested};
      let blockedX=false,blockedY=false;

      if(current.x<=b.x+eps&&current.x>=-b.x-eps){
        if(target.x>b.x||target.x<-b.x){
          target.x=current.x;
          blockedX=true;
        }
      }else{
        target.x=Math.max(-b.x,Math.min(b.x,target.x));
      }

      if(current.y<=b.y+eps&&current.y>=-b.y-eps){
        if(target.y>b.y||target.y<-b.y){
          target.y=current.y;
          blockedY=true;
        }
      }else{
        target.y=Math.max(-b.y,Math.min(b.y,target.y));
      }

      this.dataset.scenePanBoundary=
        blockedX&&blockedY?'blocked-xy':
        blockedX?'blocked-x':
        blockedY?'blocked-y':'inside';

      if(
        Math.abs(target.x-current.x)<eps &&
        Math.abs(target.y-current.y)<eps
      ) return current;

      return previousSetPan.call(this,target.x,target.y,false);
    };

    proto.constrainScenePan=function(reason='release'){
      if(!this.matches?.(SELECTOR)){
        return typeof previousConstrain==='function'
          ? previousConstrain.call(this,reason)
          : this.sceneManualPan;
      }

      const current=this.sceneManualPan||{x:0,y:0};
      const target=this.clampScenePan(current.x,current.y);
      this.dataset.sceneBoundsCommit=`${reason}:no-snap-v5354`;

      if(target.x===current.x&&target.y===current.y){
        return current;
      }

      return previousSetPan.call(this,target.x,target.y,false);
    };

    return true;
  }

  function bindGesture(map){
    if(!map||map.dataset.adminPanGestureV5354==='bound')return;
    const canvas=map.querySelector('.three-overlay');
    if(!canvas)return;

    map.dataset.adminPanGestureV5354='bound';

    canvas.addEventListener('pointerdown',event=>{
      if(event.button!==0&&event.button!==1)return;
      if(event.altKey||event.shiftKey||event.ctrlKey)return;

      const zoom=zoomOf(map);
      map.__adminPanGestureV5354={
        pointerId:event.pointerId,
        zoom,
        bounds:boundsFor(map,zoom)
      };
      map.dataset.adminPanGestureZoom=zoom.toFixed(3);
    },true);

    const release=event=>{
      const gesture=map.__adminPanGestureV5354;
      if(gesture?.pointerId!==event.pointerId)return;
      delete map.__adminPanGestureV5354;
      map.dataset.adminPanGestureState='released-no-snap';
    };

    canvas.addEventListener('pointerup',release,true);
    canvas.addEventListener('pointercancel',release,true);
  }

  function fitOnceReady(map){
    if(!map||map.dataset.adminFitV5354==='done')return;

    const apply=()=>{
      if(!map.modelReady&&!map.classList.contains('model-ready'))return false;

      map.dataset.adminFitV5354='done';
      map.sceneUserInteracted=false;

      try{map.fitSceneView?.(false);}catch{}
      try{map.setScenePan?.(0,0,false);}catch{}
      try{map.syncThree?.();}catch{}

      requestAnimationFrame(()=>{
        try{map.syncThree?.();}catch{}
      });

      return true;
    };

    if(apply())return;

    const observer=new MutationObserver(()=>{
      if(!apply())return;
      observer.disconnect();
    });

    observer.observe(map,{
      attributes:true,
      attributeFilter:['class','data-model-ready','data-model-render','data-model-progress']
    });

    setTimeout(()=>observer.disconnect(),15000);
  }

  function configure(map){
    if(!map)return;
    bindGesture(map);
    fitOnceReady(map);

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        try{map.map?.invalidateSize?.({pan:false});}catch{}
        try{map.syncThree?.();}catch{}
      });
    });
  }

  function install(){
    if(!installPrototype()){
      customElements.whenDefined('map-scene').then(()=>{
        installPrototype();
        document.querySelectorAll(SELECTOR).forEach(configure);
      });
    }else{
      document.querySelectorAll(SELECTOR).forEach(configure);
    }

    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes){
          if(!(node instanceof Element))continue;
          if(node.matches?.(SELECTOR))configure(node);
          node.querySelectorAll?.(SELECTOR).forEach(configure);
        }
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});

    const stop=()=>{
      const map=document.querySelector(SELECTOR);
      if(map){
        configure(map);
        observer.disconnect();
      }
    };
    setTimeout(stop,0);
    setTimeout(stop,6000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else install();
})();
