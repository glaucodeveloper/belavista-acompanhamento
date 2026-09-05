// BELAVISTA_ADMIN_WORKSPACES_BRIDGE_V5356
(() => {
  if(globalThis.__belavistaAdminWorkspacesBridgeV5356)return;
  globalThis.__belavistaAdminWorkspacesBridgeV5356=true;
  const apply=()=>{
    try{globalThis.installBelavistaProductWorkspacesV5356?.();}
    catch(error){console.error('[Belavista v5.3.56] workspace install',error);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  // Re-apply after deferred admin extensions; no polling loop.
  setTimeout(apply,250);
  setTimeout(apply,1200);
})();
