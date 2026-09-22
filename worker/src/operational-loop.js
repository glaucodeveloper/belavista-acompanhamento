// BELAVISTA_OPERATIONAL_LOOP_STRICT_AI_V4
// strict-ai-state-transition: previousState + event -> NVIDIA -> full state.
// noDeterministicFallback=true. The Worker validates/persists/publishes; it does not plan.

import {runStrictNvidiaStateTransition,strictNvidiaRuntime} from './strict-nvidia-state.js';
import {normalizeOperationalPreviousState,createRequestedStateEvent} from './operational-state.js';
import {publishStrictOperationalState} from './strict-realtime.js';
import {loadOperationalConfiguration,readOperationalConfig,writeOperationalConfig} from './github-store.js';

function actorFromEvent(event){return event?.actor||{id:'admin',role:'admin'};}

function configurationFromOverrides(base,overrides){
  if(!overrides)return base||{};
  return {...(base||{}),...overrides,
    stages:overrides.stages??base?.stages,
    personnel:overrides.personnel??base?.personnel,
    commercial:overrides.commercial??base?.commercial
  };
}

export async function runOperationalLoop(env,options={}){
  const mode=options.mode||options.inference?.mode||'strict-ai-state-transition';
  if(mode!=='strict-ai-state-transition'&&options.requireNvidia!==true){
    // Compatibility callers are upgraded to strict mode; there is no deterministic planner here.
  }

  const loaded=await loadOperationalConfiguration(env).catch(()=>({}));
  const configuration=configurationFromOverrides(loaded,options.configurationOverrides);
  let stateRecord=null;
  if(!options.previousState&&!options.stateOverrides){
    stateRecord=await readOperationalConfig(env,'state').catch(()=>({data:{},sha:null,source:'none'}));
  }

  const previousState=normalizeOperationalPreviousState(
    options.previousState||options.stateOverrides||stateRecord?.data||{},
    configuration
  );
  const event=options.event||createRequestedStateEvent(options.trigger||'api',options.actor||actorFromEvent(options.event));
  const inferenceRequest={
    provider:'nvidia',strict:true,requireFullState:true,requireMetaTrace:true,
    noDeterministicFallback:true,...(options.inference||{})
  };

  const result=await runStrictNvidiaStateTransition(env,{
    previousState,event,configuration,inference:inferenceRequest
  });

  const effects={persisted:false,realtime:null,github:null};
  if(options.persist===true&&!options.dryRun){
    const current=stateRecord||await readOperationalConfig(env,'state').catch(()=>({sha:null}));
    const saved=await writeOperationalConfig(env,'state',result.state,{
      sha:current?.sha,
      message:`state(ai): ${event.type} ${event.id}`
    });
    effects.persisted=true;
    effects.github={source:saved?.source,path:saved?.path,sha:saved?.sha,commitSha:saved?.commitSha};
    effects.realtime=await publishStrictOperationalState(env,{
      state:result.state,event:result.eventApplied||event,inference:result.inference,
      namespace:options.realtimeNamespace||'operational'
    });
  }

  return {
    mode:'strict-ai-state-transition',
    eventApplied:result.eventApplied||event,
    state:result.state,
    analysis:result.analysis,
    inference:{...result.inference,runtime:strictNvidiaRuntime(env)},
    effects
  };
}
