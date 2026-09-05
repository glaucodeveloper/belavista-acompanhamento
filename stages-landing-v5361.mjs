// BELAVISTA_STAGES_LANDING_BRIDGE_V5361
(() => {
  if(globalThis.__belavistaStagesLandingBridgeV5361)return;
  globalThis.__belavistaStagesLandingBridgeV5361=true;
  const install=()=>{
    if(globalThis.__BELAVISTA_STAGES_LANDING_V5361)return true;
    if(typeof globalThis.installBelavistaStagesLandingV5361!=='function')return false;
    try{
      globalThis.installBelavistaStagesLandingV5361();
      return Boolean(globalThis.__BELAVISTA_STAGES_LANDING_V5361);
    }catch(error){
      console.error('[Belavista v5.3.61] stages install',error);
      return false;
    }
  };
  const retry=()=>{if(install())return;setTimeout(()=>{if(install())return;setTimeout(install,900);},700);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',retry,{once:true});
  else retry();
})();
