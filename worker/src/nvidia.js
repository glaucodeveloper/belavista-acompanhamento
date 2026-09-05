const WORKERS_MODEL='@cf/nvidia/nemotron-3-120b-a12b';
const DEFAULT_NVIDIA_MODEL='google/diffusiongemma-26b-a4b-it';
const DEFAULT_VISION_MODEL='meta/llama-3.2-90b-vision-instruct';

function truncate(value,max=6000){
  return String(value??'').trim().slice(0,max);
}

function numberSetting(value,fallback,{min=-Infinity,max=Infinity}={}){
  const parsed=Number(value);
  return Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):fallback;
}

function nvidiaSleep(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

function retryableNvidiaStatus(status){
  return status===408||status===409||status===425||status===429||status>=500;
}

function nvidiaKey(env){
  return env.NVIDIA_API_KEY||env.NVIDIA_NIM_API_KEY||'';
}

function nvidiaSettings(env,{vision=false}={}){
  return {
    apiKey:nvidiaKey(env),
    apiUrl:env.NVIDIA_API_URL||env.NVIDIA_NIM_API_URL||'https://integrate.api.nvidia.com/v1/chat/completions',
    model:vision?(env.NVIDIA_VISION_MODEL||DEFAULT_VISION_MODEL):(env.NVIDIA_MODEL||env.NVIDIA_NIM_MODEL||DEFAULT_NVIDIA_MODEL),
    maxTokens:numberSetting(env.NVIDIA_MAX_TOKENS,900,{min:64,max:4096}),
    temperature:numberSetting(env.NVIDIA_TEMPERATURE,0.25,{min:0,max:2}),
    topP:numberSetting(env.NVIDIA_TOP_P,0.8,{min:0,max:1}),
    timeoutMs:numberSetting(env.NVIDIA_TIMEOUT_MS,45_000,{min:1_000,max:120_000})
  };
}

async function callWorkersAI(env,prompt){
  if(!env.AI?.run)return null;
  const result=await env.AI.run(env.WORKERS_AI_MODEL||WORKERS_MODEL,{
    messages:[
 {role:'system',content:'Você é um assistente operacional do Aliança Park. Responda em JSON curto e objetivo.'},
      {role:'user',content:prompt}
    ]
  });
  return result?.response||result?.text||null;
}

async function nvidiaRequest(env,messages,{vision=false,maxTokens=null,retries=0,retryBaseMs=900}={}){
  const settings=nvidiaSettings(env,{vision});
  if(!settings.apiKey)return null;

  let lastError=null;
  for(let attempt=0;attempt<=retries;attempt++){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort('NVIDIA request timeout'),settings.timeoutMs);
    try{
      const requestBody={
        model:settings.model,
        messages,
        temperature:settings.temperature,
        top_p:settings.topP,
        max_tokens:Number.isFinite(Number(maxTokens))?Number(maxTokens):settings.maxTokens,
        stream:false
      };
      const response=await fetch(settings.apiUrl,{
        method:'POST',
        headers:{'content-type':'application/json',accept:'application/json',authorization:`Bearer ${settings.apiKey}`},
        body:JSON.stringify(requestBody),
        signal:controller.signal
      });
      const raw=await response.text();
      let payload={};
      try{payload=raw?JSON.parse(raw):{};}catch{}
      if(!response.ok){
        const message=payload?.error?.message||payload?.detail||raw.slice(0,500)||`NVIDIA API respondeu ${response.status}.`;
        const error=new Error(`NVIDIA HTTP ${response.status}: ${message}`);
        error.statusCode=response.status;
        error.nvidiaStatus=response.status;
        throw error;
      }
      const content=payload?.choices?.[0]?.message?.content||'';
      if(!content){
        const error=new Error('NVIDIA respondeu sem choices[0].message.content.');
        error.statusCode=502;
        throw error;
      }
      return content;
    }catch(error){
      lastError=error;
      const status=Number(error?.nvidiaStatus||error?.statusCode||0);
      const transient=error?.name==='AbortError'||status===0||retryableNvidiaStatus(status);
      if(attempt>=retries||!transient)throw error;
      const wait=Math.round(retryBaseMs*(2**attempt)+Math.random()*250);
      console.warn('nvidia transient failure; retrying',{attempt:attempt+1,status:status||null,wait,message:error?.message});
      await nvidiaSleep(wait);
    }finally{
      clearTimeout(timeout);
    }
  }
  throw lastError||new Error('NVIDIA request falhou sem diagnóstico.');
}

function parseMaybeJson(text,fallback){
  if(!text)return fallback;
  let str=String(text).trim().replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
  const jsonBlock=str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if(jsonBlock){
    try{return JSON.parse(jsonBlock[1].trim());}catch{}
  }
  const objMatch=str.match(/(\{[\s\S]*\})/);
  if(objMatch){
    try{return JSON.parse(objMatch[1].trim());}catch{}
  }
  try{return JSON.parse(str);}catch{return fallback;}
}

export function getNvidiaRuntime(env){
  const text=nvidiaSettings(env);
  const vision=nvidiaSettings(env,{vision:true});
  return {
    configured:Boolean(text.apiKey),
    model:text.model,
    visionModel:vision.model,
    maxTokens:text.maxTokens,
    temperature:text.temperature,
    topP:text.topP,
    timeoutMs:text.timeoutMs
  };
}

export async function runOperationalAssistant(env,{message,view='assistant',context=null,explain=false}={}){
  if(!truncate(message))return {text:'Mensagem vazia.',provider:'deterministic'};
 const prompt=`Tela: ${view}. Analise a operação do Aliança Park usando somente os dados fornecidos. Contexto: ${truncate(JSON.stringify(context||{}),8000)}. Pedido: ${truncate(message,1200)}. ${explain?'Inclua prioridade, causa e próximo passo.':''} Responda SOMENTE em JSON com text, risk e nextAction. Não altere valores financeiros.`;
  const messages=[
    {role:'system',content:'Você explica decisões operacionais de obras. Cálculos e autorizações pertencem ao backend. Responda SOMENTE em formato JSON válido.'},
    {role:'user',content:prompt}
  ];
  const nvidiaText=await nvidiaRequest(env,messages).catch(()=>null);
  const workersText=nvidiaText?null:await callWorkersAI(env,prompt).catch(()=>null);
  const aiText=nvidiaText||workersText;
  const parsed=parseMaybeJson(aiText,{text:aiText});
  const textOutput=parsed?.text||parsed?.summary||parsed?.reply||(typeof parsed==='string'?parsed:'');
  if(textOutput)return {...parsed,text:textOutput,provider:nvidiaText?'nvidia-api':'workers-ai'};
  return {
    text:/atras|risco|bloque/i.test(message)
      ? 'Há etapas que precisam ser revisadas por dependência, caixa, cobertura de materiais e evidência de campo.'
      : /compra|orc|budget|caixa|material/i.test(message)
        ? 'O backend calcula a cobertura financeira e de materiais; compras permanecem como solicitações até aprovação.'
        : 'A camada operacional está pronta para correlacionar caixa, materiais, agenda e evidências.',
    risk:'medium',
    nextAction:'Executar o planejamento e revisar as solicitações de compra sugeridas.',
    provider:'deterministic'
  };
}

export async function explainMaterialPlan(env,plan){
  const compact={
    cashState:plan.cashState,
    availableCents:plan.availableCents,
    reserveCents:plan.reserveCents,
    materialNeedCents:plan.materialNeedCents,
    allocatedCents:plan.allocatedCents,
    coverage:plan.coverage,
    decisions:plan.decisions.slice(0,20).map(item=>({
      action:item.action,
      project:item.project?.name||item.requirement.projectId,
      activity:item.activity?.title||item.requirement.activityId,
      material:item.requirement.materialName,
      quantity:item.purchaseQuantity,
      unit:item.requirement.unit,
      neededBy:item.requirement.neededBy,
      blockedBy:item.dependency?.blockedBy||[]
    }))
  };
  const response=await nvidiaRequest(env,[
    {role:'system',content:'Você explica um plano determinístico de caixa e materiais. Não invente valores, não autorize compras e responda SOMENTE em formato JSON válido.'},
    {role:'user',content:`Plano: ${truncate(JSON.stringify(compact),10000)}. Responda SOMENTE em formato JSON com as chaves summary (string), risks (array de strings) e managementActions (array de strings).`}
  ]).catch(()=>null);
  const parsed=parseMaybeJson(response,null);
  if(parsed && (parsed.summary || parsed.risks || parsed.managementActions || parsed.decisions)){
    return {
      summary:parsed.summary||`Estado de caixa ${plan.cashState}; cobertura de materiais em ${Math.round(plan.coverage*100)}%.`,
      risks:Array.isArray(parsed.risks)?parsed.risks:[],
      managementActions:Array.isArray(parsed.managementActions)?parsed.managementActions:[],
      ...parsed,
      provider:'nvidia-api'
    };
  }
  return {
    summary:`Estado de caixa ${plan.cashState}; cobertura de materiais em ${Math.round(plan.coverage*100)}%.`,
    risks:plan.decisions.filter(item=>item.action.startsWith('blocked')).slice(0,5).map(item=>`${item.requirement.materialName}: ${item.action}`),
    managementActions:['Revisar solicitações sugeridas e confirmar alterações relevantes de agenda.'],
    provider:'deterministic'
  };
}

export async function runVisualDigest(env,{kind,imageBase64,imageUrl,notes=''}={}){
  const receipt=kind==='purchase-receipt';
  const schemaHint=receipt
    ? 'Retorne summary, facts, risk, recommendedAction, supplier, documentNumber, issueDate, totalAmountCents, confidence e items [{name, quantity, unit, unitPriceCents, totalPriceCents}].'
    : 'Retorne summary, facts, risk, recommendedAction, detectedStage, progressPercent e materialsObserved.';
 const content=[{type:'text',text:`Analise esta evidência do Aliança Park. Tipo: ${kind}. Diferencie fatos visíveis de inferências. Observações humanas: ${truncate(notes,800)}. ${schemaHint} Responda apenas JSON.`}];
  if(imageUrl)content.push({type:'image_url',image_url:{url:imageUrl}});
  if(imageBase64)content.push({type:'image_url',image_url:{url:`data:image/jpeg;base64,${imageBase64}`}});
  const response=await nvidiaRequest(env,[
    {role:'system',content:'Você extrai evidências visuais de obras e recibos. Valores extraídos sempre exigem revisão humana.'},
    {role:'user',content}
  ],{vision:true}).catch(()=>null);
  const parsed=parseMaybeJson(response,{});
  return {
    summary:truncate(parsed.summary||parsed.text||`Digestão visual pendente para ${kind}.`,300),
    facts:Array.isArray(parsed.facts)?parsed.facts.slice(0,12):[],
    risk:truncate(parsed.risk||'medium',20),
    recommendedAction:truncate(parsed.recommendedAction||parsed.nextAction||'Revisar a evidência antes de promover dados oficiais.',240),
    supplier:truncate(parsed.supplier,120),
    documentNumber:truncate(parsed.documentNumber,80),
    issueDate:truncate(parsed.issueDate,20),
    totalAmountCents:numberSetting(parsed.totalAmountCents,0,{min:0}),
    confidence:numberSetting(parsed.confidence,0,{min:0,max:1}),
    items:Array.isArray(parsed.items)?parsed.items.slice(0,50):[],
    detectedStage:truncate(parsed.detectedStage,120),
    progressPercent:numberSetting(parsed.progressPercent,0,{min:0,max:100}),
    materialsObserved:Array.isArray(parsed.materialsObserved)?parsed.materialsObserved.slice(0,20):[],
    reviewRequired:true,
    provider:nvidiaKey(env)?'nvidia-api':'deterministic'
  };
}


export async function explainOperationalLoop(env,{configuration,report,trigger='api',requireNvidia=false}={}){
  const compact={
    trigger,
    stages:(configuration?.stages?.stages||[]).map(stage=>({id:stage.id,name:stage.name,description:stage.description,peculiarities:stage.peculiarities,entryCriteria:stage.entryCriteria,requiredEvidence:stage.requiredEvidence,dependencies:stage.dependencies})),
    cash:report?.cash,
    canDoNow:(report?.canDoNow||[]).map(item=>({stage:item.stageName,activity:item.title,startDate:item.startDate,endDate:item.endDate,materials:item.materials,personnel:item.personnelByDay,peculiarities:item.peculiarities})),
    scheduledNext:(report?.scheduledNext||[]).slice(0,20).map(item=>({stage:item.stageName,activity:item.title,status:item.status,startDate:item.startDate,endDate:item.endDate,materials:item.materials})),
    blocked:(report?.blocked||[]).slice(0,20),
    procurement:(report?.procurement||[]).slice(0,20),
    materialNeeds:(report?.materialNeeds||[]).slice(0,30)
  };

  const prompt=`Analise o cronograma operacional abaixo. NÃO use pontuação de prioridade nem invente prioridade numérica. A ordem deve ser explicada somente por dependências, quesitos de liberação, peculiaridades de execução, disponibilidade de materiais, caixa acima da reserva, lead time e disponibilidade/função do pessoal. Quando faltar caixa, explique também a quantidade solicitada e o preço médio usado na referência. O backend já calculou datas e alocações; não altere valores nem datas. Seja conciso para caber integralmente no JSON. Explique a compreensão de cada ação tomada e o que pode ser feito agora. Dados: ${truncate(JSON.stringify(compact),18000)}. Responda SOMENTE JSON com summary, whatCanBeDoneNow (array), stageExplanations (array de {stage,reason,nextAction}), risks (array) e managementActions (array).`;

  const messages=[
    {role:'system',content:'Você interpreta planejamento de obra baseado em restrições e peculiaridades reais de execução. Nunca transforme a decisão em ranking numérico. Responda apenas JSON válido, curto e completo.'},
    {role:'user',content:prompt}
  ];

  let response='';
  let parsed=null;
  let lastError=null;
  try{
    response=await nvidiaRequest(env,messages,{maxTokens:1800,retries:3,retryBaseMs:1100});
    parsed=parseMaybeJson(response,null);

    if(!parsed&&response){
      const repaired=await nvidiaRequest(env,[
        {role:'system',content:'Converta a resposta recebida em JSON válido sem criar fatos, números, datas ou decisões novas. Retorne somente JSON.'},
        {role:'user',content:`Resposta a reparar: ${truncate(response,12000)}`}
      ],{maxTokens:1800,retries:2,retryBaseMs:1100});
      parsed=parseMaybeJson(repaired,null);
    }
  }catch(error){
    lastError=error;
  }

  if(parsed)return {...parsed,provider:'nvidia-api'};

  const diagnostic=lastError?.message||(response?'NVIDIA respondeu conteúdo que permaneceu inválido após reparo JSON.':'NVIDIA não retornou conteúdo.');
  if(requireNvidia){
    const error=new Error(`NVIDIA obrigatória para este ciclo LIVE falhou: ${diagnostic}`);
    error.statusCode=502;
    throw error;
  }

  return {
    summary:`${report?.canDoNow?.length||0} atividade(s) podem iniciar agora; ${report?.blocked?.length||0} item(ns) estão bloqueados por quesitos, dependências, materiais, caixa ou pessoal.`,
    whatCanBeDoneNow:(report?.canDoNow||[]).map(i=>`${i.stageName}: ${i.title}`),
    stageExplanations:(report?.schedule||[]).map(i=>({stage:i.stageName,reason:`Encaixada de ${i.startDate} a ${i.endDate} conforme materiais e pessoal disponíveis.`,nextAction:i.title})),
    risks:(report?.blocked||[]).map(i=>`${i.stageName}: ${(i.reasons||[]).join('; ')}`).slice(0,12),
    managementActions:(report?.procurement||[]).map(i=>`Provisionar ${i.quantity} ${i.unit} de ${i.materialName} para ${i.stageName}.`).slice(0,12),
    provider:'deterministic',
    nvidiaError:diagnostic
  };
}

export async function runPublicLeadAssistant(env,{message,context={},requireNvidia=false}={}){
  const safeContext={
    objective:truncate(context.objective,60),
    budget:truncate(context.budget,80),
    sun:truncate(context.sun,30)
  };

  const messages=[
    {
      role:'system',
      content:'Você é o assistente comercial público do Aliança Park. Fale somente sobre intenção de compra, preferências de lote, orientação solar, faixa de valor e próximo passo comercial. Não revele dados internos, caixa, GitHub, obra administrativa ou outros clientes. Responda SOMENTE JSON válido e curto.'
    },
    {
      role:'user',
      content:`Visitante: ${truncate(message,900)}. Contexto declarado: ${JSON.stringify(safeContext)}. Retorne JSON com reply, inferredObjective (Moradia|Investimento|Veraneio|A definir), preferences (objeto curto) e nextQuestion.`
    }
  ];

  let response='';
  let parsed=null;
  let lastError=null;

  try{
    response=await nvidiaRequest(env,messages,{
      maxTokens:700,
      retries:3,
      retryBaseMs:1000
    });
    parsed=parseMaybeJson(response,null);

    if(!parsed&&response){
      const repaired=await nvidiaRequest(env,[
        {
          role:'system',
          content:'Repare a resposta recebida para JSON válido. Não invente fatos, valores ou preferências. Retorne somente JSON.'
        },
        {
          role:'user',
          content:`Resposta a reparar: ${truncate(response,6000)}`
        }
      ],{
        maxTokens:700,
        retries:2,
        retryBaseMs:1000
      });
      parsed=parseMaybeJson(repaired,null);
    }
  }catch(error){
    lastError=error;
  }

  if(parsed?.reply){
    return {
      ...parsed,
      provider:'nvidia-api'
    };
  }

  const diagnostic=
    lastError?.message||
    (response
      ? 'NVIDIA respondeu conteúdo que permaneceu inválido após o reparo JSON.'
      : 'NVIDIA não retornou conteúdo.');

  if(requireNvidia){
    const error=new Error(`NVIDIA obrigatória no chat público LIVE falhou: ${diagnostic}`);
    error.statusCode=502;
    throw error;
  }

  const msg=truncate(message,900);
  const n=msg.toLowerCase();
  const inferredObjective=
    /invest|renda|valoriza/.test(n)?'Investimento':
    /verane|temporad|feria/.test(n)?'Veraneio':
    /morar|famil|casa/.test(n)?'Moradia':
    'A definir';

  return {
    reply:`Entendi seu objetivo de ${inferredObjective.toLowerCase()}. Posso organizar faixa de valor, orientação solar e características do lote para o retorno comercial.`,
    inferredObjective,
    preferences:safeContext,
    nextQuestion:'Qual faixa de valor e característica do lote são mais importantes para você?',
    provider:'deterministic',
    nvidiaError:diagnostic
  };
}
