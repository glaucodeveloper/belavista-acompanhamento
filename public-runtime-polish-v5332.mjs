// BELAVISTA_PUBLIC_RUNTIME_POLISH_V5332
(() => {
  const style=document.createElement('style');
  style.id='belavista-public-runtime-polish-v5332-style';
  style.textContent=`
    public-lead-chat .public-chat-v52-live,
    public-lead-chat [data-chat-state]{
      display:none!important;
      visibility:hidden!important;
    }
  `;
  document.head.append(style);

  customElements.whenDefined('map-scene').then(()=>{
    const Ctor=customElements.get('map-scene');
    const proto=Ctor?.prototype;
    if(!proto||proto.__belavistaPanBoundaryStopV5332)return;
    proto.__belavistaPanBoundaryStopV5332=true;

    const previousSetScenePan=proto.setScenePan;
    if(typeof previousSetScenePan!=='function')return;

    proto.setScenePan=function(x,y,animate=false){
      const isPublic=this.matches?.('map-scene[data-public-map],map-scene[data-public-presentation]');
      if(!isPublic)return previousSetScenePan.call(this,x,y,animate);

      const canvas=this.querySelector('.three-overlay');
      const width=Math.max(1,canvas?.clientWidth||this.clientWidth||innerWidth);
      const height=Math.max(1,canvas?.clientHeight||this.clientHeight||innerHeight);
      const maxX=width/2,maxY=height/2,eps=.75;
      const current=this.sceneManualPan||{x:0,y:0};
      const requested={x:Number(x)||0,y:Number(y)||0};

      const blockX=
        (current.x>=maxX-eps&&requested.x>current.x)||
        (current.x<=-maxX+eps&&requested.x<current.x);
      const blockY=
        (current.y>=maxY-eps&&requested.y>current.y)||
        (current.y<=-maxY+eps&&requested.y<current.y);

      let targetX=blockX?current.x:requested.x;
      let targetY=blockY?current.y:requested.y;

      if(!blockX){
        if(targetX>maxX)targetX=maxX;
        else if(targetX<-maxX)targetX=-maxX;
      }
      if(!blockY){
        if(targetY>maxY)targetY=maxY;
        else if(targetY<-maxY)targetY=-maxY;
      }

      const noMovement=
        Math.abs(targetX-current.x)<.01&&
        Math.abs(targetY-current.y)<.01;

      if(noMovement){
        this.dataset.publicPanBoundary='blocked-outward';
        return current;
      }

      this.dataset.publicPanBoundary='moving';
      this.dataset.publicPanLimit=`±${Math.round(maxX)}px × ±${Math.round(maxY)}px`;
      return previousSetScenePan.call(this,targetX,targetY,animate);
    };
  });
})();
