// BELAVISTA_FINAL_WORKSPACES_BRIDGE_V5360
(() => {
  if(globalThis.__belavistaFinalWorkspacesBridgeV5360)return;
  globalThis.__belavistaFinalWorkspacesBridgeV5360=true;

  const apply=()=>{
    if(globalThis.__BELAVISTA_FINAL_WORKSPACES_V5360)return true;
    if(typeof globalThis.installBelavistaFinalWorkspacesV5360!=='function')return false;

    // Prefer the explicit signal from the deferred admin bootstrap.
    const deferredReady=Boolean(globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351);
    if(!deferredReady&&performance.now()<2200)return false;

    try{
      globalThis.installBelavistaFinalWorkspacesV5360();
      return Boolean(globalThis.__BELAVISTA_FINAL_WORKSPACES_V5360);
    }catch(error){
      console.error('[Belavista v5.3.60] final workspace install',error);
      return false;
    }
  };

  const retry=()=>{
    if(apply())return;
    setTimeout(()=>{ if(apply())return; setTimeout(apply,900); },900);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',retry,{once:true});
  }else{
    retry();
  }
})();
