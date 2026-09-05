const CACHE='alianca-park-leads-v47';
const PREFIX='alianca-park-leads-';

self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});

async function networkFirst(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response?.ok)await cache.put(request,response.clone());
    return response;
  }catch(error){
    const cached=await cache.match(request);
    if(cached)return cached;
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate' || ['script','style','worker'].includes(request.destination)){
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(request);
    const network=fetch(request).then(async response=>{
      if(response?.ok)await cache.put(request,response.clone());
      return response;
    }).catch(()=>null);
    return cached || await network || Response.error();
  }));
});
