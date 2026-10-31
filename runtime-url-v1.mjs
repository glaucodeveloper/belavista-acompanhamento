// Resolve application URLs when the site is exposed through the local
// port-router used by the ngrok tunnel. Direct root-relative URLs lose the
// /8080 upstream prefix and otherwise become 404s outside localhost.
export function runtimeUrlV1(path='/', query=''){
  const raw=String(path||'/');
  const separator=raw.indexOf('?');
  const pathname=(separator>=0?raw.slice(0,separator):raw)||'/';
  const inlineQuery=separator>=0?raw.slice(separator+1):'';
  const route=pathname.startsWith('/')?pathname:`/${pathname}`;
  const currentPath=String(globalThis.location?.pathname||'');
  const embeddedPrefix=currentPath.match(/^\/(\d{2,5})(?=\/|$)/)?.[0]||'';
  const host=String(globalThis.location?.hostname||'');
  let deploymentPrefix='';
  try{
    const baseUrl=new URL(globalThis.document?.baseURI||globalThis.location?.href);
    if(baseUrl.origin===globalThis.location?.origin){
      const basePath=baseUrl.pathname.replace(/\/+$/,'');
      if(basePath&&basePath!=='/'&&(currentPath===basePath||currentPath.startsWith(`${basePath}/`)))deploymentPrefix=basePath;
    }
  }catch{}
  const tunnelPrefix=embeddedPrefix||(/ngrok/i.test(host)?'/8080':'');
  const pathPrefix=deploymentPrefix||tunnelPrefix;
  const params=new URLSearchParams(inlineQuery);
  new URLSearchParams(String(query||'').replace(/^\?/,'')).forEach((value,key)=>params.set(key,value));
  const key=new URLSearchParams(String(globalThis.location?.search||'')).get('key');
  if(key&&!params.has('key'))params.set('key',key);
  const suffix=params.toString();
  return `${pathPrefix}${route}${suffix?`?${suffix}`:''}`;
}
