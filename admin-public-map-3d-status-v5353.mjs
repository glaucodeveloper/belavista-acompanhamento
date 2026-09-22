// BELAVISTA_ADMIN_PUBLIC_MAP_3D_STATUS_V5353
(() => {
  if(globalThis.__belavistaAdminPublicMap3dStatusV5353)return;
  globalThis.__belavistaAdminPublicMap3dStatusV5353=true;

  const selector='map-scene[data-admin-shared-public-map]';

  function attach(map){
    if(!map||map.dataset.admin3dProbe==='v5353')return;
    map.dataset.admin3dProbe='v5353';
    map.dataset.admin3dState=map.modelReady?'ready':'loading';

    const started=performance.now();
    const timer=setInterval(()=>{
      if(!map.isConnected){clearInterval(timer);return;}

      if(map.modelReady||map.dataset.modelReady==='true'){
        map.dataset.admin3dState='ready';
        map.dataset.admin3dReadyMs=String(Math.round(performance.now()-started));
        clearInterval(timer);
        return;
      }

      const error=map.dataset.modelError||map.dataset.threeError;
      if(error){
        map.dataset.admin3dState='error';
        console.error('[BELAVISTA v5.3.53] mapa 3D falhou',{
          error,
          three:map.dataset.three,
          modelRender:map.dataset.modelRender,
          modelSource:map.dataset.modelSource,
          modelProgress:map.dataset.modelProgress
        });
        clearInterval(timer);
      }
    },180);

    setTimeout(()=>{
      if(map.modelReady||map.dataset.modelReady==='true')return;
      console.warn('[BELAVISTA v5.3.53] mapa 3D ainda não pronto após 8s',{
        mapInit:map.dataset.mapInit,
        three:map.dataset.three,
        modelError:map.dataset.modelError,
        modelProgress:map.dataset.modelProgress,
        modelRender:map.dataset.modelRender
      });
    },8000);
  }

  const current=document.querySelector(selector);
  if(current){attach(current);return;}

  const observer=new MutationObserver(()=>{
    const map=document.querySelector(selector);
    if(!map)return;
    observer.disconnect();
    attach(map);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),6000);
})();
