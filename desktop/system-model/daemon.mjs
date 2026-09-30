import {OpenJevClient} from './openjev-client.mjs';
import {WorkerRegistryClient} from './worker-registry-client.mjs';
import {runSystemTransition} from './operational-core.mjs';

const intervalMs=Number(process.env.BELAVISTA_SYSTEM_MODEL_POLL_MS||3000);
const once=process.argv.includes('--once');
const model=new OpenJevClient();
const registry=new WorkerRegistryClient();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function tick(){
  const current=await registry.readState(); const state=current.state||{};
  const queue=Array.isArray(state.pendingEvents)?state.pendingEvents:[];
  const event=queue.find(item=>item&&item.status!=='processed'&&item.id&&item.type);
  if(!event){console.log('[system-model] nenhum pendingEvent');return false;}
  console.log(`[system-model] processando ${event.id} ${event.type}`);
  const result=await runSystemTransition({previousState:state,event,client:model});
  const next=result.state;
  next.pendingEvents=queue.filter(item=>item.id!==event.id);
  next.eventLog=[...(Array.isArray(state.eventLog)?state.eventLog:[]),{id:event.id,type:event.type,processedAt:new Date().toISOString(),model:result.decisionResponse?.model||'MiniCPM5-2B'}].slice(-1000);
  const saved=await registry.writeState(next,{sha:current.sha,message:`system-model: ${event.id} ${event.type}`});
  console.log(`[system-model] commit ${saved.commitSha||saved.sha||'ok'}`);
  return true;
}

async function main(){
  const health=await model.health();
  if(!health.ready)throw new Error(`OpenJEV não está ready: ${JSON.stringify(health)}`);
  console.log(`[system-model] OpenJEV ready model=${health.model||'MiniCPM5-2B'} workers=${health.workers??'?'}`);
  if(once){await tick();return;}
  for(;;){try{await tick();}catch(error){console.error('[system-model]',error);}await sleep(intervalMs);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
