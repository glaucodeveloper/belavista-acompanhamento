// BELAVISTA_PAN_ZOOM_RUNTIME_V5344
(() => {
  if(document.querySelector('map-scene[data-public-map],map-scene[data-public-presentation]')?.dataset.publicPanTsOwner==='true')return;
  const SELECTOR='map-scene[data-public-map],map-scene[data-public-presentation]';

  function hit(target){
    const canvas=target?.closest?.('.three-overlay');
    const map=canvas?.closest?.(SELECTOR);
    return map&&canvas?{map,canvas}:null;
  }

  function zoomOf(map){
    return Math.max(
      .01,
      Number(map?._sceneVisual?.scale||map?.sceneManualZoom)||1
    );
  }

  function boundsFor(map,canvas,zoom){
    const width=Math.max(1,canvas?.clientWidth||map.clientWidth||innerWidth);
    const height=Math.max(1,canvas?.clientHeight||map.clientHeight||innerHeight);

    const sceneBounds=map?.getScenePanBounds?.();
    if(sceneBounds){
      return {
        width,
        height,
        zoom,
        maxX:Math.max(0,Number(sceneBounds.x)||0),
        maxY:Math.max(0,Number(sceneBounds.y)||0)
      };
    }

    // Fallback for an early custom element before scene dimensions exist.
    return {
      width,
      height,
      zoom,
      maxX:Math.max(0,(width*2.7*zoom-width)/2),
      maxY:Math.max(0,(height*2.7*zoom-height)/2)
    };
  }

  document.addEventListener('pointerdown',event=>{
    const h=hit(event.target);
    if(!h)return;
    if(event.button!==0&&event.button!==1)return;

    const zoom=zoomOf(h.map);
    h.map.__publicPanGestureV5344={
      pointerId:event.pointerId,
      zoom,
      bounds:boundsFor(h.map,h.canvas,zoom)
    };

    h.map.dataset.publicPanInputZoom=zoom.toFixed(3);
    h.map.dataset.publicPanBoundary='zoom-runtime-gesture';
  },true);

  function finish(event){
    document.querySelectorAll(SELECTOR).forEach(map=>{
      const gesture=map.__publicPanGestureV5344;
      if(gesture?.pointerId===event.pointerId){
        delete map.__publicPanGestureV5344;
        map.dataset.publicPanBoundary='zoom-runtime-idle';
      }
    });
  }

  document.addEventListener('pointerup',finish,true);
  document.addEventListener('pointercancel',finish,true);

  customElements.whenDefined('map-scene').then(()=>{
    const Ctor=customElements.get('map-scene');
    const proto=Ctor?.prototype;
    if(!proto||proto.__belavistaPanZoomRuntimeV5344)return;
    proto.__belavistaPanZoomRuntimeV5344=true;

    const previous=proto.setScenePan;
    if(typeof previous!=='function')return;

    proto.setScenePan=function(x,y,animate=false){
      if(!this.matches?.(SELECTOR)){
        return previous.call(this,x,y,animate);
      }

      const gesture=this.__publicPanGestureV5344;

      // No pointer drag: preserve selection focus, reset and any other
      // programmatic camera command exactly as requested.
      if(!gesture){
        return previous.call(this,x,y,animate);
      }

      const current=this.sceneManualPan||{x:0,y:0};
      const rawRequested={
        x:Number(x)||0,
        y:Number(y)||0
      };

      // Existing handlers currently request:
      // current + pointerDelta.
      // The pointer delta was projected onto the ground plane and is already
      // in world-translation space. Dividing it by zoom made panning slower
      // exactly when the user zoomed in.
      const rawDx=rawRequested.x-current.x;
      const rawDy=rawRequested.y-current.y;
      const zoom=gesture.zoom||1;

      let requested={
        x:current.x+rawDx,
        y:current.y+rawDy
      };

      const {maxX,maxY}=gesture.bounds;
      const eps=.001;
      let blockedX=false;
      let blockedY=false;

      // Hard boundaries, no clamp/snap to +/- max.
      // If the next local coordinate crosses a boundary, retain the last
      // valid value for that axis.
      if(current.x>maxX+eps){
        if(requested.x>=current.x){
          requested.x=current.x;
          blockedX=true;
        }
      }else if(current.x<-maxX-eps){
        if(requested.x<=current.x){
          requested.x=current.x;
          blockedX=true;
        }
      }else if(requested.x>maxX||requested.x<-maxX){
        requested.x=current.x;
        blockedX=true;
      }

      if(current.y>maxY+eps){
        if(requested.y>=current.y){
          requested.y=current.y;
          blockedY=true;
        }
      }else if(current.y<-maxY-eps){
        if(requested.y<=current.y){
          requested.y=current.y;
          blockedY=true;
        }
      }else if(requested.y>maxY||requested.y<-maxY){
        requested.y=current.y;
        blockedY=true;
      }

      this.dataset.publicPanInputZoom=zoom.toFixed(3);
      this.dataset.publicPanRawDelta=
        `${rawDx.toFixed(2)},${rawDy.toFixed(2)}`;
      this.dataset.publicPanLocalDelta=
        `${rawDx.toFixed(2)},${rawDy.toFixed(2)}`;
      this.dataset.publicPanLocalBounds=
        `±${maxX.toFixed(1)},±${maxY.toFixed(1)}`;
      this.dataset.publicPanScreenBounds=
        `±${Math.round(maxX)},±${Math.round(maxY)} · world-translation`;

      this.dataset.publicPanBoundary=
        blockedX&&blockedY?'blocked-xy':
        blockedX?'blocked-x':
        blockedY?'blocked-y':
        'inside-boundary';

      if(
        Math.abs(requested.x-current.x)<eps&&
        Math.abs(requested.y-current.y)<eps
      ){
        return current;
      }

      return previous.call(
        this,
        requested.x,
        requested.y,
        animate
      );
    };
  });
})();
