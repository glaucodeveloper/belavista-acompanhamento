import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

const workerBase=(process.env.BELAVISTA_WORKER_URL||'https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev').replace(/\/+$/,'');
const hostingBase=(process.env.BELAVISTA_PUBLIC_BASE_URL||'https://belavista-3f887.web.app').replace(/\/+$/,'');
const firebaseBase=(process.env.FIREBASE_DATABASE_URL||'https://belavista-3f887-default-rtdb.firebaseio.com').replace(/\/+$/,'');
const firebaseApiKey=process.env.FIREBASE_WEB_API_KEY||'AIzaSyAtbLAkqya5XIDfSDHovvhCr9pReAr_XgQ';
const runId=(process.env.LIVE_TEST_ID||`LIVE-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}-${Math.random().toString(36).slice(2,7)}`).toUpperCase();
const keep=process.env.LIVE_TEST_KEEP==='1';

const report={runId,startedAt:new Date().toISOString(),endpoints:{workerBase,hostingBase,firebaseBase},scenes:[],proofs:{githubCommits:[],nvidiaCalls:[],firebaseEvents:[]}};

function title(text){console.log(`\n\n${'='.repeat(78)}\n${text}\n${'='.repeat(78)}`);}
function line(text=''){console.log(text);}
function money(cents){return `R$ ${(Number(cents||0)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function compactLoop(loop){return {loopId:loop.loopId,provider:loop.explanation?.provider,summary:loop.explanation?.summary,cash:loop.report?.cash,canDoNow:(loop.report?.canDoNow||[]).map(x=>`${x.stageName}: ${x.title}`),scheduledNext:(loop.report?.scheduledNext||[]).map(x=>`${x.stageName}: ${x.title} (${x.status})`),blocked:(loop.report?.blocked||[]).map(x=>({stage:x.stageName,activity:x.title||'',reasons:x.reasons})),materialNeeds:loop.report?.materialNeeds||[],procurement:loop.report?.procurement||[]};}

async function rawRequest(url,{method='GET',body,headers={}}={}){
  const response=await fetch(url,{method,headers:{...(body?{'content-type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  const text=await response.text(); let payload;
  try{payload=text?JSON.parse(text):null;}catch{payload=text;}
  if(!response.ok)throw new Error(`${method} ${url} → ${response.status}\n${text.slice(0,1000)}`);
  return payload;
}

async function adminCredential(){
  if(process.env.BELAVISTA_API_TOKEN)return {token:process.env.BELAVISTA_API_TOKEN,mode:'worker-service-token'};
  if(process.env.BELAVISTA_ADMIN_ID_TOKEN)return {token:process.env.BELAVISTA_ADMIN_ID_TOKEN,mode:'firebase-id-token'};
  const email=process.env.BELAVISTA_TEST_EMAIL, password=process.env.BELAVISTA_TEST_PASSWORD;
  if(email&&password){
    const login=await rawRequest(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseApiKey)}`,{method:'POST',body:{email,password,returnSecureToken:true}});
    return {token:login.idToken,mode:'firebase-email-password',email:login.email};
  }
  throw new Error('Teste LIVE exige BELAVISTA_API_TOKEN, BELAVISTA_ADMIN_ID_TOKEN ou BELAVISTA_TEST_EMAIL + BELAVISTA_TEST_PASSWORD.');
}

const credential=await adminCredential();
const auth={'authorization':`Bearer ${credential.token}`};
const api=(path,options={})=>rawRequest(`${workerBase}${path}`,{...options,headers:{...auth,...(options.headers||{})}});
const publicApi=(path,options={})=>rawRequest(`${workerBase}${path}`,options);
const firebase=path=>rawRequest(`${firebaseBase}/${path}.json`);

function assertLiveNvidia(loop,context){
  assert.equal(loop?.explanation?.provider,'nvidia-api',`${context}: a compreensão NÃO veio da NVIDIA real.`);
  assert.ok(loop?.explanation?.summary||loop?.explanation?.stageExplanations,`${context}: a NVIDIA não devolveu compreensão operacional.`);
  report.proofs.nvidiaCalls.push({context,loopId:loop.loopId,provider:loop.explanation.provider});
}

async function assertRealtime(loop,context){
  const eventId=loop?.realtime?.eventId;
  assert.ok(eventId,`${context}: Worker não publicou evento Realtime.`);
  const event=await firebase(`liveTests/${runId}/operationalEvents/${eventId}`);
  assert.equal(event?.source,'belavista-cloudflare-worker',`${context}: evento Firebase não veio do Worker real.`);
  assert.equal(event?.provider,'nvidia-api',`${context}: evento Firebase não registra NVIDIA real.`);
  report.proofs.firebaseEvents.push({context,eventId,provider:event.provider});
}

async function scene(name,description,fn){
  title(name); line(description); const startedAt=new Date().toISOString();
  const result=await fn();
  report.scenes.push({name,description,startedAt,finishedAt:new Date().toISOString(),result});
  return result;
}

function resetForWholeWork(stages){
  const next=structuredClone(stages); next.stageState={};
  for(const stage of next.stages||[]){
    next.stageState[stage.id]={progress:0,completed:false,completedActivities:[],criteria:{}};
    for(const criterion of stage.entryCriteria||[])next.stageState[stage.id].criteria[criterion.id]=false;
  }
  return next;
}

async function event(event,context,{runLoop=true}={}){
  line(`\n→ EVENTO REAL: ${event.type}${event.stageId?` / ${event.stageId}`:''}${event.activityId?` / ${event.activityId}`:''}`);
  const response=await api(`/api/live-tests/${encodeURIComponent(runId)}/event`,{method:'POST',body:{event,runLoop}});
  assert.equal(response.github?.source,'github','A transformação de estado não foi persistida no GitHub real.');
  assert.ok(response.github?.commitSha,'A transformação não retornou commit GitHub.');
  report.proofs.githubCommits.push({context,type:event.type,commitSha:response.github.commitSha});
  if(response.loop){assertLiveNvidia(response.loop,context); await assertRealtime(response.loop,context); line(JSON.stringify(compactLoop(response.loop),null,2));}
  return response;
}

async function loop(context){
  const response=await api(`/api/live-tests/${encodeURIComponent(runId)}/loop`,{method:'POST',body:{trigger:context,horizonDays:180}});
  assertLiveNvidia(response.loop,context); await assertRealtime(response.loop,context); line(JSON.stringify(compactLoop(response.loop),null,2)); return response.loop;
}

function allCompleted(session){
  const config=session.configuration.stages; return (config.stages||[]).every(stage=>config.stageState?.[stage.id]?.completed===true||Number(config.stageState?.[stage.id]?.progress)>=100);
}

async function currentSession(){return (await api(`/api/live-tests/${encodeURIComponent(runId)}`)).session;}

function outstandingGate(loop){return (loop.report?.blocked||[]).find(item=>item.type==='stage-gate');}
function firstRunnable(loop){return (loop.report?.canDoNow||[])[0];}
function firstScheduled(loop){return [...(loop.report?.scheduledNext||[])].sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)))[0];}

async function fundMissing(loop,cycle){
  const uncovered=(loop.report?.materialNeeds||[]).filter(item=>!item.cashCovered&&Number(item.totalCostCents)>0);
  if(!uncovered.length)return false;
  // Aporte exatamente orientado ao estado observado + pequena folga. A reserva permanece intocada.
  const needed=Math.min(...uncovered.map(item=>Number(item.totalCostCents)))+1_000_000;
  await event({type:'cash.entry',amountCents:needed,category:'Aporte de teste live',description:`Caixa liberado após solicitação real do ciclo ${cycle}.`},`ciclo ${cycle}: caixa muda e dispara nova compreensão`);
  return true;
}

async function receiveProvisioned(loop,cycle){
  const items=loop.report?.procurement||[];
  if(!items.length)return false;
  for(const item of items){
    const purchaseId=`BUY-${runId}-${cycle}-${item.activityId}-${String(item.materialName).replace(/[^A-Za-z0-9]+/g,'-')}`.slice(0,120);
    await event({type:'purchase.ordered',id:purchaseId,stageId:item.stageId,stageName:item.stageName,activityId:item.activityId,materialName:item.materialName,quantity:item.quantity,unit:item.unit,unitCostCents:item.quantity?Math.round(item.costCents/item.quantity):0,totalCostCents:item.costCents,expectedArrival:item.expectedArrival},`ciclo ${cycle}: pedido de compra real`);
    await event({type:'purchase.receipt',purchaseId,materialName:item.materialName,quantity:item.quantity,unit:item.unit,totalCostCents:item.costCents},`ciclo ${cycle}: recibo real transforma compra em estoque e caixa`);
  }
  return true;
}

async function confirmAvailableGate(loop,cycle){
  const gate=outstandingGate(loop); if(!gate)return false;
  const session=await currentSession(); const stage=(session.configuration.stages.stages||[]).find(s=>s.id===gate.stageId);
  if(!stage)return false;
  // Só confirma os quesitos da etapa quando suas dependências já estão concluídas.
  const state=session.configuration.stages.stageState||{};
  const dependenciesReady=(stage.dependencies||[]).every(dep=>state[dep]?.completed||Number(state[dep]?.progress)>=100);
  if(!dependenciesReady)return false;
  const items=(stage.entryCriteria||[]).filter(c=>state[stage.id]?.criteria?.[c.id]!==true).map(c=>({stageId:stage.id,criterionId:c.id,value:true}));
  if(!items.length)return false;
  await event({type:'criteria.batch',items,message:`Fiscalização liberou quesitos de ${stage.name}.`},`ciclo ${cycle}: quesitos de ${stage.name}`);
  return true;
}

async function completeRunnable(loop,cycle){
  const activity=firstRunnable(loop); if(!activity)return false;
  await event({type:'work.diary',stageId:activity.stageId,activityId:activity.id,responsavel:'Encarregado live',notes:`Diário real do ciclo ${cycle}: ${activity.title} executada conforme agenda do Worker.`},`ciclo ${cycle}: diário do encarregado retroalimenta a obra`);
  return true;
}

async function advanceCalendar(loop,cycle){
  const scheduled=firstScheduled(loop); if(!scheduled?.startDate)return false;
  const session=await currentSession(); if(String(scheduled.startDate)<=String(session.today))return false;
  await event({type:'time.advance',date:scheduled.startDate,message:`Calendário avança até ${scheduled.startDate}.`},`ciclo ${cycle}: avanço temporal da agenda`);
  return true;
}

// ===========================================================================
// HISTÓRIA LIVE
// ===========================================================================
let created=false;
try{
  await scene('0. Provar que estamos no sistema publicado','Nenhuma lógica local é importada. Hosting, Worker, NVIDIA, GitHub e Firebase são acessados por HTTPS.',async()=>{
    const [health,status,publicHtml]=await Promise.all([
      publicApi('/api/health'),publicApi('/api/ai/status'),rawRequest(`${hostingBase}/?live-story=${runId}`)
    ]);
    assert.equal(health.ok,true); assert.equal(status.nvidia?.configured,true); assert.match(String(publicHtml),/html/i);
    const leadChat=await publicApi('/api/public/lead-chat',{method:'POST',body:{message:'Procuro lote para moradia, com sol da manhã e quero entender o próximo passo.',context:{objective:'Moradia',sun:'nascente'},requireNvidia:true}});
    assert.equal(leadChat.provider,'nvidia-api','Chat público não usou NVIDIA real.');
    report.proofs.publicLeadChat={provider:leadChat.provider,reply:leadChat.reply};
    line(`Worker: OK\nNVIDIA: ${status.nvidia.model}\nChat público: ${leadChat.provider}\nAutenticação de teste: ${credential.mode}`);
    return {health:health.ok,nvidiaModel:status.nvidia.model,leadChatProvider:leadChat.provider};
  });

  const configs=await scene('1. Ler as tabelas reais da obra','O teste nasce das etapas e do quadro de pessoal que o Worker lê do GitHub configurado, não de fixtures importadas.',async()=>{
    const [stages,personnel,state]=await Promise.all([api('/api/admin/config/stages'),api('/api/admin/config/personnel'),api('/api/admin/config/state')]);
    assert.equal(stages.github?.configured,true,'Worker não está conectado ao GitHub.');
    assert.equal(personnel.github?.configured,true,'Worker não está conectado ao GitHub.');
    line(`Etapas lidas: ${(stages.data?.stages||[]).map(s=>s.name).join(' → ')}`);
    line(`Pessoas/recursos: ${(personnel.data?.people||[]).length}`);
    return {stages:stages.data,personnel:personnel.data,state:state.data||{}};
  });

  await scene('2. Criar a obra inteira sem caixa e sem estoque','A sessão é gravada de verdade no repositório, em data/operational/live-tests/<runId>.json. O estado começa com toda a obra por fazer.',async()=>{
    const createdResponse=await api('/api/live-tests',{method:'POST',body:{
      id:runId,scenario:'obra-completa-live',
      stages:resetForWholeWork(configs.stages),personnel:configs.personnel,
      state:{projectId:`project-${runId}`,cashEntries:[],inventoryMovements:[],purchaseRequests:[],fieldReturns:[]}
    }});
    created=true;
    assert.equal(createdResponse.github?.source,'github'); assert.ok(createdResponse.github?.commitSha);
    report.proofs.githubCommits.push({context:'session.created',commitSha:createdResponse.github.commitSha});
    line(`GitHub commit: ${createdResponse.github.commitSha}`);
    return {github:createdResponse.github};
  });

  let current=await scene('3. Estado zero — nada é presumido','O Worker real consulta quesitos, dependências, pessoal e caixa; a NVIDIA deve explicar por que a obra ainda não pode avançar.',async()=>loop('estado-zero-sem-caixa'));

  await scene('4. Liberar o primeiro quesito técnico','A topografia confirma o quesito da Terraplanagem. A mudança é commitada no GitHub, processada pelo Worker, interpretada pela NVIDIA e publicada no Firebase.',async()=>{
    const session=await currentSession();
    const terra=(session.configuration.stages.stages||[]).find(s=>s.id==='terraplanagem')||(session.configuration.stages.stages||[])[0];
    const criterion=terra?.entryCriteria?.[0]; assert.ok(terra&&criterion,'Não encontrei o primeiro quesito de Terraplanagem.');
    return event({type:'criterion.confirmed',stageId:terra.id,criterionId:criterion.id,message:'Topografia base conferida no teste live.'},'liberação técnica inicial');
  });

  current=await scene('5. O primeiro serviço entra na agenda','Sem inventar dinheiro, o sistema deve encaixar o que depende apenas de quesito e pessoal. A agenda existe no Firebase real.',async()=>loop('primeiro-servico-agendavel'));
  const first=firstRunnable(current); assert.ok(first,'Nenhuma atividade inicial ficou executável após o quesito técnico.');

  await scene('6. Diário do encarregado conclui a primeira frente','O retorno de campo transforma o estado. A etapa ganha progresso real na sessão GitHub e a próxima análise usa esse novo estado.',async()=>event({type:'work.diary',stageId:first.stageId,activityId:first.id,responsavel:'Encarregado live',notes:'Frente inicial conferida e concluída.'},'diário da primeira frente'));

  await scene('7. Liberar as frentes técnicas seguintes','Depois da Terraplanagem, o teste confirma os quesitos das etapas cujas dependências já foram satisfeitas. Ainda não há caixa.',async()=>{
    const session=await currentSession(); const config=session.configuration.stages; const items=[];
    for(const stage of config.stages||[]){
      const dependenciesReady=(stage.dependencies||[]).every(dep=>config.stageState?.[dep]?.completed);
      if(!dependenciesReady)continue;
      for(const criterion of stage.entryCriteria||[])if(config.stageState?.[stage.id]?.criteria?.[criterion.id]!==true)items.push({stageId:stage.id,criterionId:criterion.id,value:true});
    }
    assert.ok(items.length,'Nenhum novo quesito ficou disponível para confirmação.');
    return event({type:'criteria.batch',items,message:'Fiscalização liberou frentes tecnicamente disponíveis.'},'liberação das frentes após terraplanagem');
  });

  current=await scene('8. Sem caixa: pedir quantidades e repassar notificações','Agora existem frentes tecnicamente abertas, porém sem dinheiro e sem estoque. O Worker deve dizer quantidades, referência média de preço e publicar pedido para suprimentos/admin.',async()=>loop('sem-caixa-pedir-quantidades'));
  assert.ok((current.report?.materialNeeds||[]).length,'Worker não retornou necessidades quantitativas de material.');
  assert.ok((current.report?.notifications||[]).some(n=>n.role==='supplies'&&/cotação/i.test(`${n.title} ${n.message}`)),'Não houve notificação de cotação/quantidade para suprimentos.');
  const suppliesNode=await firebase(`liveTests/${runId}/notifications/supplies`);
  assert.ok(suppliesNode&&Object.keys(suppliesNode).length,'Firebase não recebeu repasse para suprimentos.');
  line('\nNecessidades observadas:');
  for(const need of current.report.materialNeeds.slice(0,12))line(`  • ${need.stageName}: ${need.quantity} ${need.unit} ${need.materialName} | médio ${money(need.unitCostCents)}/${need.unit} | total ${money(need.totalCostCents)} | caixa=${need.cashCovered?'sim':'não'}`);

  await scene('9. Caixa muda e o Worker muda a decisão','Um aporte real é aplicado à sessão. O teste não escolhe a resposta esperada por mock: ele lê o novo plano do Worker/NVIDIA e verifica que alguma provisão passa a ser possível.',async()=>{
    const response=await event({type:'cash.entry',amountCents:20_100_000,category:'Aporte live',description:'Aporte controlado para observar mudança de decisão com reserva preservada.'},'entrada de caixa real');
    assert.ok((response.loop.report?.procurement||[]).length,'Entrada de caixa não tornou nenhuma provisão possível.');
    return {cash:response.loop.report.cash,procurement:response.loop.report.procurement};
  });

  // Percorre a construção até 100%, sempre pelo Worker publicado.
  await scene('10. Evoluir a obra até a conclusão','Cada ciclo pergunta ao sistema live o que fazer. O runner só simula os fatos externos: liberar quesito, aportar caixa quando solicitado, registrar compra/recibo, avançar a data ou enviar diário. Toda decisão intermediária é recalculada no Worker e explicada pela NVIDIA.',async()=>{
    for(let cycle=1;cycle<=120;cycle++){
      const session=await currentSession();
      if(allCompleted(session)){line(`\nObra concluída no ciclo ${cycle-1}.`);return {cycles:cycle-1,completed:true};}
      const live=await loop(`evolução-${cycle}`);
      line(`\nCICLO ${cycle} | hoje=${session.today} | pode agora=${live.report.canDoNow.length} | provisões=${live.report.procurement.length} | bloqueios=${live.report.blocked.length}`);

      if(await completeRunnable(live,cycle))continue;
      if(await receiveProvisioned(live,cycle))continue;
      if(await fundMissing(live,cycle))continue;
      if(await confirmAvailableGate(live,cycle))continue;
      if(await advanceCalendar(live,cycle))continue;
      throw new Error(`Ciclo ${cycle} não encontrou transformação possível. Estado: ${JSON.stringify(compactLoop(live),null,2)}`);
    }
    throw new Error('A obra não chegou a 100% dentro de 120 ciclos live.');
  });

  await scene('11. Estado final e prova ponta a ponta','A última leitura vem do arquivo real no GitHub. Todas as etapas devem estar concluídas; o último loop deve continuar sendo explicado pela NVIDIA e publicado no Firebase.',async()=>{
    const session=await currentSession();
    assert.ok(allCompleted(session),'Nem todas as etapas chegaram a 100%.');
    const finalLoop=await loop('obra-concluida');
    const stages=(session.configuration.stages.stages||[]).map(stage=>({stage:stage.name,progress:session.configuration.stages.stageState?.[stage.id]?.progress,completed:session.configuration.stages.stageState?.[stage.id]?.completed}));
    line(JSON.stringify(stages,null,2));
    return {stages,finalLoop:compactLoop(finalLoop),fieldReturns:session.state.fieldReturns?.length||0,inventoryMovements:session.state.inventoryMovements?.length||0,cashEntries:session.state.cashEntries?.length||0};
  });

  report.ok=true;
}catch(error){
  report.ok=false; report.error=error.stack||error.message; console.error(`\nLIVE STORY FAILED\n${report.error}`); process.exitCode=1;
}finally{
  report.finishedAt=new Date().toISOString();
  const reportPath=process.env.LIVE_TEST_REPORT||`live-test-${runId}.json`;
  await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  line(`\nRelatório: ${reportPath}`);
  if(created&&!keep){
    try{const deleted=await api(`/api/live-tests/${encodeURIComponent(runId)}`,{method:'DELETE'});line(`Sessão GitHub removida após o teste: ${deleted.deleted?'sim':'não'}${deleted.commitSha?` (${deleted.commitSha})`:''}`);}catch(error){console.error(`Não consegui limpar a sessão GitHub: ${error.message}`);}
  }else if(created&&keep)line(`LIVE_TEST_KEEP=1: sessão GitHub mantida para auditoria (${runId}).`);
}
