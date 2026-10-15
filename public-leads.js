import './components.js?v=pdf-lot-centers-v2';
window.addEventListener('DOMContentLoaded',()=>window.lucide?.createIcons?.());
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  (async()=>{
    try{
      if('caches' in globalThis){
        const keys=await caches.keys();
        await Promise.all(keys.filter(key=>key.startsWith('alianca-park-leads-')&&key!=='alianca-park-leads-v52').map(key=>caches.delete(key)));
      }
      const registration=await navigator.serviceWorker.register('./lead-sw.js?v=asset-stream-v52',{updateViaCache:'none'});
      await registration.update();
    }catch(error){console.info('Service Worker público não ativado.',error);}
  })();
}
