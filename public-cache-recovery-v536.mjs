// BELAVISTA_PUBLIC_CACHE_RECOVERY_V536
// Executado antes de components.js. Limpa apenas o Service Worker/cache público
// quando a página ainda está sob um lead-sw anterior a v5.3.6.
const VERSION='public-unfreeze-v5.3.6';
const SESSION_KEY='belavista-public-cache-recovery-v536';

const scriptUrlOf=registration=>[
  registration?.active?.scriptURL,
  registration?.waiting?.scriptURL,
  registration?.installing?.scriptURL
].filter(Boolean).join('\n');
const isLeadSw=url=>/\/lead-sw\.js(?:\?|$)/.test(String(url||''));
const isCurrent=url=>String(url||'').includes(`v=${VERSION}`);

async function recoverPublicCache(){
  if(!('serviceWorker' in navigator)) return {needed:false,reason:'service-worker-unavailable'};

  const controllerUrl=String(navigator.serviceWorker.controller?.scriptURL||'');
  const registrations=await navigator.serviceWorker.getRegistrations();
  const leadRegistrations=registrations.filter(reg=>isLeadSw(scriptUrlOf(reg)));
  const staleLeadRegistrations=leadRegistrations.filter(reg=>!isCurrent(scriptUrlOf(reg)));
  const staleController=isLeadSw(controllerUrl)&&!isCurrent(controllerUrl);
  const alreadyRecovered=sessionStorage.getItem(SESSION_KEY)===VERSION;

  const needed=!alreadyRecovered && (staleController || staleLeadRegistrations.length>0);
  if(!needed){
    window.__BELAVISTA_PUBLIC_CACHE_RECOVERY__={version:VERSION,needed:false,staleController,leadRegistrations:leadRegistrations.length,staleLeadRegistrations:staleLeadRegistrations.length};
    return window.__BELAVISTA_PUBLIC_CACHE_RECOVERY__;
  }

  await Promise.allSettled(staleLeadRegistrations.map(reg=>reg.unregister()));

  let publicCacheKeys=[];
  if('caches' in window){
    const cacheKeys=await caches.keys();
    publicCacheKeys=cacheKeys.filter(key=>/^(?:alianca-park-leads-|belavista-public-leads-)/i.test(key));
    await Promise.allSettled(publicCacheKeys.map(key=>caches.delete(key)));
  }

  sessionStorage.setItem(SESSION_KEY,VERSION);
  window.__BELAVISTA_PUBLIC_CACHE_RECOVERY__={version:VERSION,needed:true,staleController,leadRegistrations:leadRegistrations.length,staleLeadRegistrations:staleLeadRegistrations.length,publicCachesDeleted:publicCacheKeys.length,reloading:true};

  const url=new URL(location.href);
  url.searchParams.set('v',VERSION);
  url.searchParams.set('swreset','1');
  location.replace(url.href);

  // Bloqueia components.js nesta navegação controlada pelo SW antigo.
  await new Promise(()=>{});
}

await recoverPublicCache();
