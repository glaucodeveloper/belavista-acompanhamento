// BELAVISTA_STRICT_AI_STATE_V4
// The operational state transition is produced and audited by NVIDIA inference.
// This module performs transport, JSON parsing, structural validation and retry only.
// It does not decide which activity should run, create a schedule, rank priorities,
// mutate materials/cash from event types, or synthesize a deterministic fallback.

const DEFAULT_API_URL='https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL='google/diffusiongemma-26b-a4b-it';
const REQUIRED_STATE_KEYS=[
  'project','clock','localities','personnel','stages','activities','materials','cash',
  'purchases','evidence','agenda','notifications','resourceRequests','cashRequests',
  'diary','blockers','stageSectorState','constraints','commercial'
];

const arrayKeys=new Set([
  'localities','personnel','stages','activities','materials','purchases','evidence',
  'agenda','notifications','resourceRequests','cashRequests','diary','blockers',
  'stageSectorState','constraints'
]);

function numberEnv(value,fallback,min,max){
  const n=Number(value);
  if(!Number.isFinite(n))return fallback;
  return Math.min(max,Math.max(min,n));
}

function settings(env){
  return {
    apiKey:env.NVIDIA_API_KEY||env.NVIDIA_NIM_API_KEY||'',
    apiUrl:env.NVIDIA_API_URL||env.NVIDIA_NIM_API_URL||DEFAULT_API_URL,
    model:env.NVIDIA_STATE_MODEL||env.NVIDIA_MODEL||env.NVIDIA_NIM_MODEL||DEFAULT_MODEL,
    maxTokens:numberEnv(env.NVIDIA_STATE_MAX_TOKENS,16000,4096,32768),
    criticMaxTokens:numberEnv(env.NVIDIA_STATE_CRITIC_MAX_TOKENS,2400,512,8192),
    temperature:numberEnv(env.NVIDIA_STATE_TEMPERATURE,0.05,0,1),
    timeoutMs:numberEnv(env.NVIDIA_STATE_TIMEOUT_MS,120000,5000,180000),
    retries:numberEnv(env.NVIDIA_STATE_RETRIES,3,1,5)
  };
}

function stripThink(text){
  return String(text??'').replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
}

function parseJson(text){
  const src=stripThink(text);
  if(!src)throw new Error('NVIDIA retornou resposta vazia.');
  const fenced=src.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if(fenced){
    try{return JSON.parse(fenced[1]);}catch{}
  }
  try{return JSON.parse(src);}catch{}
  const first=src.indexOf('{');
  const last=src.lastIndexOf('}');
  if(first>=0&&last>first)return JSON.parse(src.slice(first,last+1));
  throw new Error('NVIDIA não retornou JSON parseável.');
}

async function requestNvidia(env,messages,{maxTokens,temperature}={}){
  const cfg=settings(env);
  if(!cfg.apiKey){
    const error=new Error('NVIDIA_API_KEY ausente: strict-ai-state-transition não possui fallback determinístico.');
    error.code='NVIDIA_STRICT_REQUIRED';
    throw error;
  }
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort('NVIDIA strict state timeout'),cfg.timeoutMs);
  try{
    const response=await fetch(cfg.apiUrl,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        accept:'application/json',
        authorization:`Bearer ${cfg.apiKey}`
      },
      body:JSON.stringify({
        model:cfg.model,
        messages,
        temperature:temperature??cfg.temperature,
        top_p:0.9,
        max_tokens:maxTokens??cfg.maxTokens,
        stream:false
      }),
      signal:controller.signal
    });
    const raw=await response.text();
    let payload={};
    try{payload=raw?JSON.parse(raw):{};}catch{}
    if(!response.ok){
      const message=payload?.error?.message||payload?.detail||raw||`HTTP ${response.status}`;
      throw new Error(`NVIDIA API ${response.status}: ${String(message).slice(0,1200)}`);
    }
    const content=payload?.choices?.[0]?.message?.content;
    if(!content)throw new Error('NVIDIA API não retornou choices[0].message.content.');
    return {content,model:payload?.model||cfg.model,usage:payload?.usage||null};
  }finally{
    clearTimeout(timeout);
  }
}

function metaCatalog(previousState){
  return {
    stages:(previousState.stages||[]).map(stage=>({
      entityType:'stage',entityId:stage.id,name:stage.name,
      dependsOn:Array.isArray(stage.dependsOn)?stage.dependsOn:[],
      entryGates:Array.isArray(stage.entryGates)?stage.entryGates:[],
      executionDescription:stage.executionDescription??stage.description??'',
      peculiarities:Array.isArray(stage.peculiarities)?stage.peculiarities:[],
      requirements:Array.isArray(stage.requirements)?stage.requirements:[],
      materials:Array.isArray(stage.materials)?stage.materials:[],
      workerRules:Array.isArray(stage.workerRules)?stage.workerRules:[],
      evidenceRequirements:Array.isArray(stage.evidenceRequirements)?stage.evidenceRequirements:[],
      notificationDestinations:Array.isArray(stage.notificationDestinations)?stage.notificationDestinations:[]
    })),
    activities:(previousState.activities||[]).map(activity=>({
      entityType:'activity',entityId:activity.id,stageId:activity.stageId,
      localityId:activity.localityId??activity.localidadeObraId??null,
      localityRule:activity.localityRule??null,
      title:activity.title,
      executionDescription:activity.executionDescription??activity.description??'',
      peculiarities:Array.isArray(activity.peculiarities)?activity.peculiarities:[],
      requirements:Array.isArray(activity.requirements)?activity.requirements:[],
      evidenceRequirements:Array.isArray(activity.evidenceRequirements)?activity.evidenceRequirements:[],
      durationMinutes:activity.durationMinutes??null,
      unitOfProduction:activity.unitOfProduction??activity.unit??null,
      plannedQuantity:activity.plannedQuantity??null,
      productionRate:activity.productionRate??null,
      materials:Array.isArray(activity.materials)?activity.materials:[],
      requiredRoles:Array.isArray(activity.requiredRoles)?activity.requiredRoles:[],
      equipment:Array.isArray(activity.equipment)?activity.equipment:[],
      dependsOn:Array.isArray(activity.dependsOn)?activity.dependsOn:[],
      externalConstraints:Array.isArray(activity.externalConstraints)?activity.externalConstraints:[]
    }))
  };
}

function structuralErrors(candidate,previousState,event){
  const errors=[];
  if(!candidate||typeof candidate!=='object')return ['raiz da resposta não é objeto'];
  const state=candidate.state;
  const analysis=candidate.analysis;
  if(!state||typeof state!=='object')errors.push('state ausente');
  if(!analysis||typeof analysis!=='object')errors.push('analysis ausente');
  if(state){
    for(const key of REQUIRED_STATE_KEYS){
      if(!Object.hasOwn(state,key))errors.push(`state.${key} ausente`);
      else if(arrayKeys.has(key)&&!Array.isArray(state[key]))errors.push(`state.${key} deve ser array`);
    }
    if(!state.version&&!state.stateVersion)errors.push('state.version ausente');
    const beforeVersion=previousState?.version||previousState?.stateVersion;
    const afterVersion=state.version||state.stateVersion;
    if(beforeVersion&&afterVersion===beforeVersion)errors.push('versão do estado não mudou');
    if(previousState?.project?.id&&state.project?.id!==previousState.project.id)errors.push('project.id mudou');
    const beforeStages=new Set((previousState?.stages||[]).map(x=>x.id));
    const afterStages=new Set((state.stages||[]).map(x=>x.id));
    for(const id of beforeStages)if(!afterStages.has(id))errors.push(`etapa desapareceu: ${id}`);
    const beforeActs=new Set((previousState?.activities||[]).map(x=>x.id));
    const afterActs=new Set((state.activities||[]).map(x=>x.id));
    for(const id of beforeActs)if(!afterActs.has(id))errors.push(`atividade desapareceu: ${id}`);
  }
  if(analysis){
    const decisions=analysis.possibleActivities||analysis.activityDecisions||analysis.decisions;
    if(!Array.isArray(decisions))errors.push('analysis.possibleActivities ausente');
    else if(decisions.length<(previousState?.activities||[]).length)errors.push('nem todas as atividades foram reanalisadas');
    const trace=analysis.metaTrace||analysis.metadataTrace||analysis.metaUsage;
    if(!Array.isArray(trace)||!trace.length)errors.push('analysis.metaTrace ausente');
    else{
      const traceIds=new Set(trace.map(x=>`${String(x.entityType||x.type||'').toLowerCase()}:${x.entityId||x.id}`));
      for(const stage of previousState?.stages||[])if(!traceIds.has(`stage:${stage.id}`))errors.push(`metaTrace não cita stage:${stage.id}`);
      for(const activity of previousState?.activities||[])if(!traceIds.has(`activity:${activity.id}`))errors.push(`metaTrace não cita activity:${activity.id}`);
    }
  }
  const applied=candidate.eventApplied||candidate.event||candidate.transition?.event||candidate.state?.lastEvent;
  if(!applied)errors.push('eventApplied ausente');
  else{
    if(event?.id&&applied.id!==event.id)errors.push('eventApplied.id divergente');
    if(event?.type&&applied.type!==event.type)errors.push('eventApplied.type divergente');
  }
  return errors;
}

function generationSystemPrompt(){
 return `Você é o motor de transição de estado operacional do Aliança Park.
MODO OBRIGATÓRIO: strict-ai-state-transition.
Toda racionalidade operacional deve ser produzida por você nesta chamada NVIDIA. Não existe scheduler determinístico, score de prioridade, regras de decisão no backend ou fallback determinístico.

TAREFA:
1. Receba previousState COMPLETO, um único event factual e o catálogo de metadados.
2. Interprete semanticamente o evento e aplique somente os fatos que ele declara.
3. Preserve todo o restante do estado e todo histórico relevante.
4. Releia TODAS as etapas e TODAS as atividades após aplicar o fato.
5. Recalcule por inferência: atividades possíveis/bloqueadas, cronograma possível, provisões de material/pessoal, pedidos de caixa, blockers e notificações.
6. O cronograma deve usar quesitos, peculiaridades de execução, dependências, evidências, recursos, caixa, pessoal, função, disponibilidade e localidade. NÃO use prioridade numérica como mecanismo de liberação/ordenação.
7. Um encarregado/pessoa pertence à sua localityId. Nunca mova nem use pessoa em outra localidade sem evento explícito personnel.locality.changed/personnel.assigned.
8. Para recebimentos, consumos, entradas/saídas de caixa, diário, evidência, alterações de metadados, disponibilidade, compras e agenda: o payload do event é um fato autoritativo a ser incorporado ao novo estado.
9. Mudanças em stage.meta.updated e activity.meta.updated devem alterar exatamente os campos do patch e afetar a análise seguinte.
10. Um field.diary.recorded completed deve permanecer no diário, atualizar a atividade, incorporar evidências e reavaliar a continuidade.
11. purchase.receipt.received deve incorporar o documento/evidência e quantidades recebidas aos materiais citados, sem apagar histórico.
12. Gere notificações e solicitações de recursos/caixa DENTRO do state; elas são resultado da inferência, não de código externo.
13. Retorne ESTADO TOTAL, nunca delta.
14. Gere uma nova version única para cada transição.
15. Use o comprehensionContext inteiro como uma única compreensão da obra: cartografia DWG/GIS, localidades, todas as etapas, todas as atividades, materiais, requisitos, pessoal, equipes, equipamentos, caixa, evidências e restrições. Não divida a decisão em análises independentes.
16. Se um dado cartográfico, material, requisito, pessoa, equipe ou equipamento não estiver disponível, marque a consequência como pendente/bloqueada e explique a ausência. Nunca invente vértices, comprimentos, volumes, áreas, produtividade ou disponibilidade.

PROVA DE USO DAS META-DESCRIÇÕES:
analysis.metaTrace DEVE conter uma entrada para CADA stage e CADA activity existentes no novo estado.
Para stage use fieldsUsed incluindo, quando presentes: executionDescription, peculiarities, requirements, evidenceRequirements, notificationDestinations.
Para activity use fieldsUsed incluindo, quando presentes: executionDescription, peculiarities, requirements, evidenceRequirements, durationMinutes, localityId.
Cada entrada precisa de consequence/rationale causal específico.

ANÁLISE DE TODAS AS ATIVIDADES:
analysis.possibleActivities deve possuir ao menos uma decisão para CADA activity.id, mesmo quando bloqueada.
Cada decisão deve conter activityId, localityId, decision/status/action e reasons/rationale suficientes para auditoria.
analysis.schedule deve conter somente encaixes executáveis e não pode criar transferência implícita de pessoal.

RESPONDA SOMENTE JSON VÁLIDO nesta forma:
{
  "eventApplied": {"id":"...","type":"...","at":"...","actor":{},"payload":{}},
  "state": { ESTADO COMPLETO },
  "analysis": {
    "possibleActivities": [],
    "schedule": [],
    "blocked": [],
    "metaTrace": [{"entityType":"stage|activity","entityId":"...","fieldsUsed":[],"consequence":"..."}],
    "summary":"..."
  }
}`;
}

function criticSystemPrompt(){
  return `Você é o auditor NVIDIA de uma transição operacional strict-ai-state-transition.
Não gere um novo estado. Audite se candidateState é fiel a previousState + event e às metadescrições.
Verifique principalmente:
- o fato do event foi aplicado exatamente, inclusive quantidades e ids;
- nenhum dado não relacionado desapareceu;
- todas as atividades foram reanalisadas;
- metaTrace prova uso de metadados de todas as etapas/atividades;
- cronograma respeita localidade e não transfere encarregado implicitamente;
- contexto único contém etapas, atividades, materiais, pessoal/equipes, equipamentos e cartografia quando disponíveis;
- pedidos de recurso/caixa e notificações são coerentes com o estado;
- mudanças de metadescrição realmente alteram a decisão quando causalmente relevantes;
- estado é total, não delta.
Responda SOMENTE JSON: {"valid":true|false,"errors":["..."],"observations":["..."]}.`;
}

async function auditCandidate(env,{previousState,event,candidate}){
  const cfg=settings(env);
  const response=await requestNvidia(env,[
    {role:'system',content:criticSystemPrompt()},
    {role:'user',content:JSON.stringify({previousState,event,candidate})}
  ],{maxTokens:cfg.criticMaxTokens,temperature:0});
  const parsed=parseJson(response.content);
  return {
    valid:parsed?.valid===true,
    errors:Array.isArray(parsed?.errors)?parsed.errors.map(String):[],
    observations:Array.isArray(parsed?.observations)?parsed.observations.map(String):[],
    model:response.model,
    usage:response.usage
  };
}

export async function runStrictNvidiaStateTransition(env,{previousState,event,configuration=null,inference={}}={}){
  if(!previousState||typeof previousState!=='object')throw new Error('previousState é obrigatório para strict-ai-state-transition.');
  if(!event||typeof event!=='object'||!event.id||!event.type)throw new Error('event com id e type é obrigatório para strict-ai-state-transition.');
  const cfg=settings(env);
  const catalog=metaCatalog(previousState);
  let repairFeedback=[];
  let lastError=null;

  for(let attempt=1;attempt<=cfg.retries;attempt++){
    const cartography=configuration?.cartography||previousState?.project?.cartography||null;
    const comprehensionContext={
      cartography,
      localities:Array.isArray(previousState.localities)?previousState.localities:[],
      stages:catalog.stages,
      activities:catalog.activities,
      materials:Array.isArray(previousState.materials)?previousState.materials:[],
      personnel:Array.isArray(previousState.personnel)?previousState.personnel:[],
      teams:Array.isArray(configuration?.teams)?configuration.teams:[],
      equipment:Array.isArray(configuration?.equipment)?configuration.equipment:(Array.isArray(previousState.equipment)?previousState.equipment:[]),
      cash:previousState.cash||{},
      evidence:Array.isArray(previousState.evidence)?previousState.evidence:[],
      constraints:Array.isArray(previousState.constraints)?previousState.constraints:[]
    };
    const userPayload={
      mode:'strict-ai-state-transition',
      inference:{
        provider:'nvidia',strict:true,requireFullState:true,requireMetaTrace:true,
        noDeterministicFallback:true,...inference
      },
      previousState,
      event,
      metadataCatalog:catalog,
      comprehensionContext,
      configuration:configuration||null,
      repairFeedback
    };

    try{
      const generation=await requestNvidia(env,[
        {role:'system',content:generationSystemPrompt()},
        {role:'user',content:JSON.stringify(userPayload)}
      ],{maxTokens:cfg.maxTokens,temperature:cfg.temperature});
      const candidate=parseJson(generation.content);
      const structure=structuralErrors(candidate,previousState,event);
      const audit=await auditCandidate(env,{previousState,event,candidate});
      const errors=[...structure,...(audit.valid?[]:audit.errors.length?audit.errors:['auditor NVIDIA marcou valid=false'])];
      if(!errors.length){
        return {
          eventApplied:candidate.eventApplied||event,
          state:candidate.state,
          analysis:candidate.analysis,
          inference:{
            provider:'nvidia-api',model:generation.model||cfg.model,strict:true,
            mode:'strict-ai-state-transition',requireFullState:true,requireMetaTrace:true,
            noDeterministicFallback:true,attempt,audit:{provider:'nvidia-api',model:audit.model,valid:true,observations:audit.observations},
            usage:generation.usage||null
          }
        };
      }
      repairFeedback=errors.slice(0,24);
      lastError=new Error(`Transição NVIDIA rejeitada na tentativa ${attempt}: ${repairFeedback.join('; ')}`);
    }catch(error){
      lastError=error;
      repairFeedback=[String(error?.message||error)].slice(0,1);
    }
  }

  const error=new Error(`strict-ai-state-transition falhou sem fallback determinístico: ${lastError?.message||'NVIDIA não produziu estado válido.'}`);
  error.code='STRICT_AI_STATE_TRANSITION_FAILED';
  throw error;
}

export function strictNvidiaRuntime(env){
  const cfg=settings(env);
  return {
    provider:'nvidia-api',model:cfg.model,configured:Boolean(cfg.apiKey),strict:true,
    mode:'strict-ai-state-transition',maxTokens:cfg.maxTokens,retries:cfg.retries,
    noDeterministicFallback:true
  };
}
