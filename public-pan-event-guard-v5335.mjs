// BELAVISTA_PUBLIC_PAN_EVENT_GUARD_V5335
(() => {
  const PUBLIC_SELECTOR='map-scene[data-public-map],map-scene[data-public-presentation]';

  const mapFromCanvas=target=>{
    const canvas=target?.closest?.('.three-overlay');
    const map=canvas?.closest?.(PUBLIC_SELECTOR);
    return map&&canvas?{map,canvas}:null;
  };

  const measureBounds=map=>{
    const canvas=map.querySelector('.three-overlay');
    const width=Math.max(1,canvas?.clientWidth||map.clientWidth||innerWidth);
    const height=Math.max(1,canvas?.clientHeight||map.clientHeight||innerHeight);
    return {maxX:width/2,maxY:height/2,width,height};
  };

  // Cache bounds once per gesture. This avoids recomputing boundaries on
  // every outward pointermove.
  document.addEventListener('pointerdown',event=>{
    const hit=mapFromCanvas(event.target);
    if(!hit)return;
    const {map,canvas}=hit;
    const leftPan=
      (event.button===0||event.button===1)&&
      !event.shiftKey&&!event.ctrlKey&&!event.altKey;
    if(!leftPan)return;

    map.__publicPanGestureV5335={
      pointerId:event.pointerId,
      bounds:measureBounds(map),
      blockedX:0,
      blockedY:0
    };
    map.dataset.publicPanBoundary='gesture-open';
    canvas.style.touchAction='none';
  },false);

  const closeGesture=event=>{
    const hit=mapFromCanvas(event.target);
    if(!hit)return;
    const {map}=hit;
    const gesture=map.__publicPanGestureV5335;
    if(gesture&&gesture.pointerId===event.pointerId){
      delete map.__publicPanGestureV5335;
      map.dataset.publicPanBoundary='gesture-closed';
    }
  };
  document.addEventListener('pointerup',closeGesture,false);
  document.addEventListener('pointercancel',closeGesture,false);

  // Prevent a map drag from becoming page scrolling / elastic snapping,
  // especially on touch and pen input.
  document.addEventListener('touchmove',event=>{
    if(mapFromCanvas(event.target))event.preventDefault();
  },{passive:false,capture:false});

  customElements.whenDefined('map-scene').then(()=>{
    const Ctor=customElements.get('map-scene');
    const proto=Ctor?.prototype;
    if(!proto||proto.__belavistaPanEventGuardV5335)return;
    proto.__belavistaPanEventGuardV5335=true;

    const previous=proto.setScenePan;
    if(typeof previous!=='function')return;

    proto.setScenePan=function(x,y,animate=false){
      if(!this.matches?.(PUBLIC_SELECTOR))return previous.call(this,x,y,animate);

      const current=this.sceneManualPan||{x:0,y:0};
      const requested={x:Number(x)||0,y:Number(y)||0};
      const gesture=this.__publicPanGestureV5335;
      const bounds=gesture?.bounds||this.__publicPanBoundsV5335||measureBounds(this);
      this.__publicPanBoundsV5335=bounds;

      const {maxX,maxY}=bounds;
      const eps=.35;
      const dx=requested.x-current.x;
      const dy=requested.y-current.y;

      // Once an axis hits the boundary, outward events on that axis are
      // disabled. We do not recalculate or re-clamp them. Reversing direction
      // immediately unlocks the axis.
      if(gesture?.blockedX){
        if(Math.sign(dx)===gesture.blockedX||Math.abs(dx)<eps){
          requested.x=current.x;
        }else{
          gesture.blockedX=0;
        }
      }
      if(gesture?.blockedY){
        if(Math.sign(dy)===gesture.blockedY||Math.abs(dy)<eps){
          requested.y=current.y;
        }else{
          gesture.blockedY=0;
        }
      }

      if(!gesture?.blockedX){
        if(requested.x>maxX){
          requested.x=maxX;
          if(gesture)gesture.blockedX=1;
        }else if(requested.x<-maxX){
          requested.x=-maxX;
          if(gesture)gesture.blockedX=-1;
        }
      }

      if(!gesture?.blockedY){
        if(requested.y>maxY){
          requested.y=maxY;
          if(gesture)gesture.blockedY=1;
        }else if(requested.y<-maxY){
          requested.y=-maxY;
          if(gesture)gesture.blockedY=-1;
        }
      }

      const noX=Math.abs(requested.x-current.x)<eps;
      const noY=Math.abs(requested.y-current.y)<eps;
      if(noX&&noY){
        this.dataset.publicPanBoundary='event-disabled-outward';
        return current;
      }

      this.dataset.publicPanBoundary=
        gesture?.blockedX||gesture?.blockedY?'axis-boundary':'moving';
      this.dataset.publicPanLimit=
        `±${Math.round(maxX)}px × ±${Math.round(maxY)}px`;

      return previous.call(this,requested.x,requested.y,animate);
    };

    addEventListener('resize',()=>{
      document.querySelectorAll(PUBLIC_SELECTOR).forEach(map=>{
        map.__publicPanBoundsV5335=measureBounds(map);
      });
    },{passive:true});
  });
})();
