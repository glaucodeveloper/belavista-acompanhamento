// BELAVISTA_ADMIN_PUBLIC_MAP_BRIDGE_V5352
// A superfície administrativa compartilha a mesma base aérea georreferenciada
// do /leads. O módulo não importa o contexto comercial inteiro: não injeta
// chat, hero ou estado de scroll na área autenticada.
(() => {
  if(globalThis.__belavistaAdminPublicMapBridgeV5352)return;
  globalThis.__belavistaAdminPublicMapBridgeV5352=true;

  const SELECTOR='map-scene[data-admin-shared-public-map="v5352"]';

  function configure(map){
    if(!map||map.dataset.adminPublicMapConfigured==='true')return;
    map.dataset.adminPublicMapConfigured='true';
    map.dataset.adminMapSource='public-leads-map-scene';
    map.dataset.publicPresentation='true';
    map.dataset.publicSelectionEnabled='true';
    map.setAttribute('data-public-map','');
    map.setAttribute('data-public-presentation','true');
    map.removeAttribute('data-base-map');
    map.setAttribute('data-public-satellite-base','true');

    const leaflet=map.querySelector('.map-host');
    if(leaflet){
      // Assim como na página pública, a base cartográfica visível fica no
      // plano Three.js e o Leaflet permanece apenas como referência geográfica.
      leaflet.style.opacity='0';
      leaflet.style.pointerEvents='none';
    }

    // Mesmo preset inicial do /leads. Atribuição direta evita registrar a
    // calibração automática como uma interação manual do operador.
    map.sceneManualPan={x:0,y:0};
    map.sceneManualRotation=0;
    map.sceneTiltAdjust=0;
    map.sceneManualZoom=1.62;
    map.sceneUserInteracted=true;
    map.style?.setProperty('--scene-pan-x','0px');
    map.style?.setProperty('--scene-pan-y','0px');
    map.setSceneVisual?.(22,0,1.62);

    map.dataset.adminPublicPreset='pan0,0-rotation0-zoom1.62';
    map.dataset.adminPublicCameraPreset='true';
    map.dataset.adminPublicMapBase='satellite-georeferenced-dashboard-reference';
    document.documentElement.dataset.adminPublicMapSurface='v5352';
    alignDwgSatelliteFrame(map);
  }

  async function alignDwgSatelliteFrame(map,attempt=0){
    if(!map||map.dataset.adminPublicGeoState==='error')return;
    if(!map.THREE||!map.mapSurface){
      if(attempt<30)setTimeout(()=>alignDwgSatelliteFrame(map,attempt+1),350);
      return;
    }
    if(map.dataset.adminPublicGeoState==='ready')return;
    map.dataset.adminPublicGeoState='loading';
    try{
      const response=await fetch('./assets/data/dwg-georeference.json',{cache:'no-store'});
      if(!response.ok)throw new Error(`DWG HTTP ${response.status}`);
      const geo=await response.json();
      const center=(geo.controlPoints||[]).find(point=>point.id==='site-center')||geo.controlPoints?.[0];
      if(!Number.isFinite(Number(center?.lat))||!Number.isFinite(Number(center?.lng))){
        throw new Error('Centro GPS ausente no DWG');
      }
      const theme={center:[Number(center.lat),Number(center.lng)],zoom:17};
      map.dwgGeo=geo;
      map._publicGeoTheme=theme;
      map._mapSurfaceKey='';
      map._lastRasterSignature='';
      map.mapSurface.visible=true;
      map.setMapTileMode?.('satellite',false);
      map.refreshMapSurface?.(theme,window.innerWidth,window.innerHeight);
      map.dataset.adminPublicDwgCenter=`${theme.center[0].toFixed(8)},${theme.center[1].toFixed(8)}`;
      map.dataset.adminPublicDwgCrs=`EPSG:${geo.crs?.epsg||'31984'}`;
      map.dataset.adminPublicGeoState='ready';
      map.dataset.publicMapTexture='satellite tile mosaic aligned to DWG centre';
    }catch(error){
      map.dataset.adminPublicGeoState='error';
      map.dataset.publicMapTexture='satellite unavailable · neutral base retained';
      console.warn('[Belavista admin v5.3.52] base satélite do DWG indisponível.',error);
    }
  }

  function install(){
    const existing=document.querySelector(SELECTOR);
    if(existing){configure(existing);return;}

    // Single-shot observer: no persistent public rAF/MutationObserver loop.
    const observer=new MutationObserver(()=>{
      const map=document.querySelector(SELECTOR);
      if(!map)return;
      observer.disconnect();
      configure(map);
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),6000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
