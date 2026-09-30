import './components.js?v=public-road-alignment-v5573&logo-transparent-v552&route=ngrok-route-v1';
window.addEventListener('DOMContentLoaded',()=>window.lucide?.createIcons?.());
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  (async()=>{
    try{
      if('caches' in globalThis){
        const keys=await caches.keys();
        await Promise.all(keys.filter(key=>key.startsWith('alianca-park-leads-')&&key!=='alianca-park-leads-v51').map(key=>caches.delete(key)));
      }
      const registration=await navigator.serviceWorker.register('./lead-sw.js?v=asset-stream-v51',{updateViaCache:'none'});
      await registration.update();
    }catch(error){console.info('Service Worker público não ativado.',error);}
  })();
}
