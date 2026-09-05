import './components.js?v=solar-clock-hover-v5384&route=ngrok-route-v1';
window.addEventListener('DOMContentLoaded',()=>window.lucide?.createIcons?.());
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  (async()=>{
    try{
      if('caches' in globalThis){
        const keys=await caches.keys();
        await Promise.all(keys.filter(key=>key.startsWith('alianca-park-leads-')&&key!=='alianca-park-leads-v47').map(key=>caches.delete(key)));
      }
      await navigator.serviceWorker.register('./lead-sw.js?v=public-live-light-v5.3.7',{updateViaCache:'none'});
    }catch(error){console.info('Service Worker público não ativado.',error);}
  })();
}
