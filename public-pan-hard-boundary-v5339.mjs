// BELAVISTA_PAN_HARD_BOUNDARY_V5339
(() => {
  const SELECTOR='map-scene[data-public-map],map-scene[data-public-presentation]';

  function mapHit(target){
    const canvas=target?.closest?.('.three-overlay');
    const map=canvas?.closest?.(SELECTOR);
    return map&&canvas?{map,canvas}:null;
  }

  function boundsFor(map,canvas=null){
    canvas=canvas||map.querySelector('.three-overlay');
    const width=Math.max(1,canvas?.clientWidth||map.clientWidth||innerWidth);
    const height=Math.max(1,canvas?.clientHeight||map.clientHeight||innerHeight);
    const sceneBounds=map?.getScenePanBounds?.();
    if(sceneBounds)return {
      maxX:Math.max(0,Number(sceneBounds.x)||0),
      maxY:Math.max(0,Number(sceneBounds.y)||0),
      width,
      height,
      zoom:Number(map?._sceneVisual?.scale||map?.sceneManualZoom)||1
    };
    const zoom=Math.max(.01,Number(map?._sceneVisual?.scale||map?.sceneManualZoom)||1);
    return {
      maxX:Math.max(0,(width*2.7*zoom-width)/2),
      maxY:Math.max(0,(height*2.7*zoom-height)/2),
      width,
      height,
      zoom
    };
  }

  // Bounds are measured once when mouse/pointer drag begins.
  document.addEventListener('pointerdown',event=>{
    const hit=mapHit(event.target);
    if(!hit)return;

    // Only actual map-drag gestures use this guard. Programmatic selection
    // focus, reset and other map commands are not constrained by this wrapper.
    if(event.button!==0&&event.button!==1)return;

    const {map,canvas}=hit;
    map.__publicHardBoundaryGestureV5339={
      pointerId:event.pointerId,
      bounds:boundsFor(map,canvas)
    };
    map.dataset.publicPanBoundary='hard-boundary-gesture';
  },true);

  function finish(event){
    const map=document.querySelector(SELECTOR);
    const gesture=map?.__publicHardBoundaryGestureV5339;
    if(!gesture||gesture.pointerId!==event.pointerId)return;
    delete map.__publicHardBoundaryGestureV5339;
    map.dataset.publicPanBoundary='hard-boundary-idle';
  }

  document.addEventListener('pointerup',finish,true);
  document.addEventListener('pointercancel',finish,true);

  customElements.whenDefined('map-scene').then(()=>{
    const Ctor=customElements.get('map-scene');
    const proto=Ctor?.prototype;
    if(!proto||proto.__belavistaPanHardBoundaryV5339)return;
    proto.__belavistaPanHardBoundaryV5339=true;

    const previous=proto.setScenePan;
    if(typeof previous!=='function')return;

    proto.setScenePan=function(x,y,animate=false){
      if(!this.matches?.(SELECTOR))return previous.call(this,x,y,animate);

      const gesture=this.__publicHardBoundaryGestureV5339;

      // No mouse/pointer drag: preserve programmatic pan exactly.
      if(!gesture)return previous.call(this,x,y,animate);

      const current=this.sceneManualPan||{x:0,y:0};
      const requested={
        x:Number(x)||0,
        y:Number(y)||0
      };
      const {maxX,maxY}=gesture.bounds;
      const eps=.001;

      let targetX=requested.x;
      let targetY=requested.y;
      let blockedX=false;
      let blockedY=false;

      // X hard boundary.
      // Never clamp to +/-maxX. If the next mouse event would cross the
      // boundary, keep the last valid X instead.
      if(current.x>maxX+eps){
        // Current position may be outside because of a programmatic focus.
        // Permit only movement back toward the legal interval.
        if(requested.x>=current.x){
          targetX=current.x;
          blockedX=true;
        }
      }else if(current.x<-maxX-eps){
        if(requested.x<=current.x){
          targetX=current.x;
          blockedX=true;
        }
      }else if(requested.x>maxX||requested.x<-maxX){
        targetX=current.x;
        blockedX=true;
      }

      // Y hard boundary.
      if(current.y>maxY+eps){
        if(requested.y>=current.y){
          targetY=current.y;
          blockedY=true;
        }
      }else if(current.y<-maxY-eps){
        if(requested.y<=current.y){
          targetY=current.y;
          blockedY=true;
        }
      }else if(requested.y>maxY||requested.y<-maxY){
        targetY=current.y;
        blockedY=true;
      }

      this.dataset.publicPanBoundary=
        blockedX&&blockedY?'blocked-xy':
        blockedX?'blocked-x':
        blockedY?'blocked-y':
        'inside-boundary';

      this.dataset.publicPanLimit=
        `X ±${Math.round(maxX)}px · Y ±${Math.round(maxY)}px · zoom ${Number(gesture.bounds.zoom||1).toFixed(2)}x`;

      // Both requested axes are outside: do not render/recalculate anything.
      if(
        Math.abs(targetX-current.x)<eps &&
        Math.abs(targetY-current.y)<eps
      ){
        return current;
      }

      // One axis may remain valid while the other is stopped at its last
      // position. Values passed downstream are always valid/non-snapped.
      return previous.call(this,targetX,targetY,animate);
    };
  });
})();
