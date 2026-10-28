import {extractPdfText,isConstructionSupply,parseInvoicePdfText} from './pdf-record-ocr.js';

const WORKERS_MODEL='@cf/nvidia/nemotron-3-120b-a12b';
const DEFAULT_NVIDIA_MODEL='google/diffusiongemma-26b-a4b-it';
const DEFAULT_VISION_MODEL='meta/llama-3.2-90b-vision-instruct';
const DEFAULT_REASONING_VISION_MODEL='nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
const MAX_VISION_DATA_URL_LENGTH=8_400_000;

const OPERATIONAL_CHAT_EXECUTION_POLICY_V1=`Trate pedidos operacionais como intenção de execução, não apenas como perguntas. Use somente as ferramentas permitidas e faça no sistema tudo que for seguro e representável sem inventar fatos. Quando houver compreensão suficiente de etapa ou atividade, mas faltarem dados, use agenda.create_pending para criar um apontamento pendente com o que já é conhecido e, no texto, pergunte somente os detalhes faltantes. Quando a ação depender de evidência, comprovante, nota, projeto, autorização ou outro documento, peça o documento; use documents.open_form quando for útil abrir a inclusão. Se o pedido for completamente externo ao sistema e não houver ação interna segura, não crie registro, agenda, compra ou conclusão: peça apenas o documento ou evidência necessária. Nunca confirme como executado algo que nenhuma ferramenta representa. Preserve fato observado, inferência e dado a confirmar como categorias distintas.`;
const OPERATIONAL_CHAT_TOOLS_V1=[
  {name:'ui.navigate',description:'Abre uma área da aplicação.',arguments:'view'},
  {name:'records.open_form',description:'Prepara a ficha de registro geral para revisão; não grava.',arguments:'activity,responsible,details,category'},
  {name:'agenda.create_pending',description:'Cria um apontamento Pendente no cronograma quando etapa/atividade já são compreendidas; pode deixar detalhes/evidência a confirmar.',arguments:'title,stageKey,stageName,activityId,activityName,owner,date,start,durationHours,spanDays,detailsNeeded,evidenceRequired,notes'},
  {name:'documents.open_form',description:'Abre a inclusão de documento quando a ação depende de evidência ou comprovante.',arguments:'reason,documentType'},
  {name:'reports.select',description:'Abre relatório.',arguments:'family,reportType'},
  {name:'map.set_overlay',description:'Destaca frente no mapa.',arguments:'category'},
  {name:'map.adjust_view',description:'Ajusta vista do mapa.',arguments:'rotationDelta,tiltDelta,zoomDelta,fit'},
  {name:'map.set_tiles',description:'Troca base do mapa.',arguments:'mode'},
  {name:'commissions.filter',description:'Filtra carteira comercial.',arguments:'query,status,profile'},
  {name:'ui.print',description:'Solicita confirmação de impressão.',arguments:'scope'}
];
const OPERATIONAL_CHAT_TOOL_NAMES_V1=new Set(OPERATIONAL_CHAT_TOOLS_V1.map(item=>item.name));
function normalizeOperationalAssistantToolCallsV1(calls){
  const output=[];
  for(const raw of Array.isArray(calls)?calls:[]){
    const name=String(raw?.name||raw?.function?.name||'');
    if(!OPERATIONAL_CHAT_TOOL_NAMES_V1.has(name))continue;
    let args=raw?.arguments??raw?.function?.arguments??{};
    if(typeof args==='string'){try{args=JSON.parse(args);}catch{args={};}}
    if(!args||typeof args!=='object'||Array.isArray(args))args={};
    output.push({name,arguments:args});
    if(output.length>=4)break;
  }
  return output;
}

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

function nvidiaSettings(env,{vision=false,reasoning=false}={}){
  const visionModel=env.NVIDIA_VISION_MODEL||env.NVIDIA_VLM_MODEL||DEFAULT_VISION_MODEL;
  const reasoningVisionModel=env.NVIDIA_REASONING_VISION_MODEL||env.NVIDIA_REASONING_VLM_MODEL||DEFAULT_REASONING_VISION_MODEL;
  return {
    apiKey:nvidiaKey(env),
    apiUrl:vision&&reasoning
      ?(env.NVIDIA_REASONING_API_URL||env.NVIDIA_API_URL||env.NVIDIA_NIM_API_URL||'https://integrate.api.nvidia.com/v1/chat/completions')
      :(env.NVIDIA_API_URL||env.NVIDIA_NIM_API_URL||'https://integrate.api.nvidia.com/v1/chat/completions'),
    model:vision?(reasoning?reasoningVisionModel:visionModel):(env.NVIDIA_MODEL||env.NVIDIA_NIM_MODEL||DEFAULT_NVIDIA_MODEL),
    maxTokens:numberSetting(reasoning&&vision?env.NVIDIA_REASONING_MAX_TOKENS:env.NVIDIA_MAX_TOKENS,reasoning&&vision?4096:900,{min:64,max:8192}),
    reasoningBudget:numberSetting(env.NVIDIA_REASONING_BUDGET,2048,{min:256,max:16384}),
    temperature:numberSetting(reasoning&&vision?env.NVIDIA_REASONING_TEMPERATURE:env.NVIDIA_TEMPERATURE,reasoning&&vision?0.6:0.25,{min:0,max:2}),
    topP:numberSetting(reasoning&&vision?env.NVIDIA_REASONING_TOP_P:env.NVIDIA_TOP_P,reasoning&&vision?0.95:0.8,{min:0,max:1}),
    timeoutMs:numberSetting(env.NVIDIA_TIMEOUT_MS,45_000,{min:1_000,max:120_000})
  };
}

function normalizeVisionAttachment(attachment){
  const source=String(attachment?.dataUrl||'').trim();
  const match=source.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if(!match)return null;
  const mimeType=match[1].toLowerCase()==='image/jpg'?'image/jpeg':match[1].toLowerCase();
  const base64=match[2].replace(/\s+/g,'');
  if(!base64||base64.length>MAX_VISION_DATA_URL_LENGTH)return null;
  return {name:truncate(attachment?.name||'imagem colada',120),mimeType,dataUrl:`data:${mimeType};base64,${base64}`};
}

async function callWorkersAI(env,prompt,{jsonMode=false,maxTokens=900,temperature=0.25}={}){
  if(!env.AI?.run)return null;
  const result=await env.AI.run(env.WORKERS_AI_MODEL||WORKERS_MODEL,{
    messages:[
 {role:'system',content:'Você é um assistente operacional do Aliança Park. Responda em JSON curto e objetivo.'},
      {role:'user',content:prompt}
    ],
    max_tokens:maxTokens,
    temperature,
    ...(jsonMode?{response_format:{type:'json_object'}}:{})
  });
  return result?.response||result?.text||null;
}

async function nvidiaRequest(env,messages,{vision=false,reasoning=false,maxTokens=null,retries=0,retryBaseMs=900}={}){
  const settings=nvidiaSettings(env,{vision,reasoning});
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
        max_tokens:Number.isFinite(Number(maxTokens))&&Number(maxTokens)>=1?Math.trunc(Number(maxTokens)):Math.max(1,Math.trunc(Number(settings.maxTokens)||900)),
        stream:false
      };
      if(vision&&reasoning)requestBody.reasoning_budget=settings.reasoningBudget;
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

const INSTAGRAM_VISIT_HANDOFF_V1='Nossa equipe entrará em contato para confirmar a visita agendada.';
const normalizeInstagramLeadDraftV1=(draft={})=>({
  name:truncate(draft.name,120),
  whatsapp:truncate(draft.whatsapp,40).replace(/\D/g,'').slice(0,20),
  email:truncate(draft.email,160).toLowerCase(),
  lotId:truncate(draft.lotId||draft.selectedLotId,160),
  lotLabel:truncate(draft.lotLabel||draft.selectedLot,160),
  objective:truncate(draft.objective||draft.intent,80),
  budget:truncate(draft.budget,100),
  visitDate:truncate(draft.visitDate||draft.date,30),
  visitTime:truncate(draft.visitTime||draft.time,20)
});

export async function runInstagramCommercialLeadAssistant(env,{conversation=null,messages=[],leadContext={}}={}){
  const history=(Array.isArray(messages)?messages:[]).slice(-12).map(item=>`${item?.direction==='outbound'?'Equipe':'Lead'}: ${truncate(item?.body||item?.message,900)}`).filter(Boolean).join('\n');
  if(!history)throw Object.assign(new Error('A conversa do Instagram ainda não possui mensagens para qualificação.'),{statusCode:400});
  const context={
    contactName:truncate(conversation?.contactName,120),
    externalThreadId:truncate(conversation?.externalThreadId,120),
    existingLeadId:truncate(conversation?.leadId,120),
    ...leadContext
  };
  const instruction=`Você é o assistente comercial do Aliança Park para conversas recebidas pelo Instagram Direct. Conduza a conversa com cordialidade, objetividade e perguntas curtas para transformar o interesse em um lead comercial de reserva e visita.

Regras:
- Responda sempre em português do Brasil e não invente disponibilidade, preço, data ou confirmação de agenda.
- Faça no máximo três perguntas por resposta. Pergunte somente o que falta: nome completo, WhatsApp, lote/quadra ou preferência, objetivo (moradia/investimento/veraneio), faixa de valor e data/horário pretendidos para visita.
- Não peça CPF, documentos, senha ou pagamento pelo Direct. Documentos e sinal só entram em fluxo seguro, depois da aprovação comercial.
- Se a pessoa demonstrar intenção de reserva, explique que o cadastro permite encaminhar a visita e o atendimento do lote escolhido.
- Quando nome, WhatsApp, objetivo/lote e data/horário da visita estiverem presentes, inclua exatamente esta ideia: "Nossa equipe entrará em contato para confirmar a visita agendada." Isso é confirmação do próximo contato, não promessa de disponibilidade nem de horário final.
- Nunca envie a mensagem. Gere somente um rascunho para aprovação humana.

Retorne SOMENTE JSON válido neste formato:
{"reply":"resposta pronta para o lead","questions":["pergunta opcional"],"leadDraft":{"name":"","whatsapp":"","email":"","lotId":"","lotLabel":"","objective":"","budget":"","visitDate":"","visitTime":""},"stage":"qualificacao|reserva|visita","nextAction":"qualificar|pedir_contato|organizar_visita|encaminhar_comercial","notes":"resumo curto"}`;
  const raw=await nvidiaRequest(env,[
    {role:'system',content:instruction},
    {role:'user',content:`Contexto seguro da conversa: ${JSON.stringify(context)}\nHistórico recente:\n${history}`}
  ],{maxTokens:900,retries:2,retryBaseMs:700});
  const parsed=parseMaybeJson(raw,null);
  if(!parsed||!String(parsed.reply||'').trim())throw Object.assign(new Error('A IA não retornou uma orientação comercial válida.'),{statusCode:502});
  const leadDraft=normalizeInstagramLeadDraftV1(parsed.leadDraft||parsed.lead||{});
  const readyForLead=Boolean(leadDraft.name&&leadDraft.whatsapp&&(leadDraft.lotId||leadDraft.lotLabel)&&leadDraft.objective);
  const readyForVisit=Boolean(readyForLead&&leadDraft.visitDate&&leadDraft.visitTime);
  const missing=[];
  if(!leadDraft.name)missing.push('nome completo');
  if(!leadDraft.whatsapp)missing.push('WhatsApp');
  if(!leadDraft.lotId&&!leadDraft.lotLabel)missing.push('lote, quadra ou preferência');
  if(!leadDraft.objective)missing.push('objetivo da compra');
  if(!leadDraft.visitDate||!leadDraft.visitTime)missing.push('data e horário pretendidos para a visita');
  const questions=[...(Array.isArray(parsed.questions)?parsed.questions:[])].map(item=>truncate(item,240)).filter(Boolean).slice(0,3);
  for(const item of missing){
    if(questions.length>=3)break;
    const question={
      'nome completo':'Como posso registrar seu nome completo?',
      WhatsApp:'Qual WhatsApp podemos usar para a equipe falar com você?',
      'lote, quadra ou preferência':'Você já tem um lote/quadra em mente ou prefere que eu indique opções?',
      'objetivo da compra':'A visita é para moradia, investimento ou veraneio?',
      'data e horário pretendidos para a visita':'Qual data e horário você prefere para a visita?'
    }[item];
    if(question&&!questions.includes(question))questions.push(question);
  }
  let reply=truncate(parsed.reply,1200);
  if(!readyForVisit)reply=reply.replace(INSTAGRAM_VISIT_HANDOFF_V1,'').replace(/\s{2,}/g,' ').trim();
  if(questions.length&&!reply.includes('?'))reply=`${reply}\n\n${questions.join('\n')}`.trim();
  if(readyForVisit&&!reply.includes(INSTAGRAM_VISIT_HANDOFF_V1))reply=`${reply} ${INSTAGRAM_VISIT_HANDOFF_V1}`.trim();
  return {
    reply,
    questions,
    leadDraft:{...leadDraft,source:'instagram-direct',readyForLead,readyForVisit},
    qualification:{stage:readyForVisit?'visita':readyForLead?'reserva':'qualificacao',readyForLead,readyForVisit,missing},
    nextAction:truncate(parsed.nextAction,80)||(readyForVisit?'organizar_visita':readyForLead?'encaminhar_comercial':'qualificar'),
    notes:truncate(parsed.notes,500),
    handoff:{message:readyForVisit?INSTAGRAM_VISIT_HANDOFF_V1:'Aguardando dados para encaminhamento comercial.',requiresHumanApproval:true,sendAutomatically:false},
    provider:'nvidia-api'
  };
}

export function getNvidiaRuntime(env){
  const text=nvidiaSettings(env);
  const vision=nvidiaSettings(env,{vision:true});
  const reasoningVision=nvidiaSettings(env,{vision:true,reasoning:true});
  return {
    configured:Boolean(text.apiKey),
    model:text.model,
    visionModel:vision.model,
    reasoningVisionModel:reasoningVision.model,
    reasoningVisionEndpoint:reasoningVision.apiUrl,
    supportsImageReasoning:Boolean(reasoningVision.model),
    maxTokens:text.maxTokens,
    reasoningBudget:reasoningVision.reasoningBudget,
    temperature:text.temperature,
    topP:text.topP,
    timeoutMs:text.timeoutMs,
    attachmentStorage:(env.BELAVISTA_MEDIA||env.BELAVISTA_UPLOADS)?'cloudflare-r2':'not-configured'
  };
}

export async function runOperationalAssistant(env,{message,view='assistant',context=null,instruction='',requestContext=null,explain=false,reasoning=false,attachment=null}={}){
  if(!truncate(message)&&!attachment)return {text:'Mensagem vazia.',provider:'deterministic'};
  const image=attachment?normalizeVisionAttachment(attachment):null;
  if(attachment&&!image)return {text:'A imagem não está em PNG, JPEG ou WEBP válido, ou excede o limite de 6 MB.',provider:'nvidia-api',
    normalizerVersion:JOURNEY_NORMALIZER_VERSION,vision:true,attachmentRejected:true};
  const requestMessage=truncate(message)||'Analise a imagem anexada e descreva os fatos visíveis e seus impactos operacionais.',
    requestInstruction=truncate(instruction,5000)||OPERATIONAL_CHAT_EXECUTION_POLICY_V1,
    tools=OPERATIONAL_CHAT_TOOLS_V1.map(item=>`${item.name}(${item.arguments}) — ${item.description}`).join('\n');
  const interpretation=context?.recordInterpretation||requestContext?.recordInterpretation||null;
  const interpretationPolicy=interpretation?`\n\nINTERPRETAÇÃO DE ANEXO (OCR + DESCRIÇÃO): ${truncate(JSON.stringify(interpretation),10000)}. Use conjuntamente a descrição original e os campos/itens do OCR. Uma etapa explicitamente citada pela pessoa prevalece sobre etapa sugerida pelo OCR ou etapa selecionada. A etapa selecionada é apenas contexto de navegação. Restrinja a alocação às etapas candidatas fornecidas; sem correspondência segura, não crie toolCall de alocação e pergunte qual etapa/atividade usar. OCR é sugestão sujeita a revisão humana; não afirme que o anexo foi persistido.`:'';
  const prompt=`Tela: ${view}. Analise a operação do Aliança Park usando somente os dados fornecidos. Contexto: ${truncate(JSON.stringify(context||{}),12000)}. Contexto do disparo: ${truncate(JSON.stringify(requestContext||{}),6000)}. Pedido: ${requestMessage}.${interpretationPolicy}\n\nINSTRUÇÃO OPERACIONAL PERMANENTE:\n${OPERATIONAL_CHAT_EXECUTION_POLICY_V1}\n\nINSTRUÇÃO ENVIADA NESTA REQUISIÇÃO:\n${requestInstruction}\n\nFERRAMENTAS DISPONÍVEIS NO CLIENTE:\n${tools}\n\n${image?'Há uma imagem anexada. Use raciocínio visual para ler primeiro os fatos visíveis, diferenciar observação de inferência e relacionar a resposta ao contexto da tela. Raciocine internamente, mas não exponha cadeia de pensamento; entregue somente a síntese operacional.':''} ${explain?'Inclua prioridade, causa e próximo passo.':''} Responda SOMENTE em JSON válido com {"text":"resposta curta ao usuário","risk":"low|medium|high","nextAction":"próximo passo","toolCalls":[{"name":"ferramenta permitida","arguments":{}}]}. Use toolCalls somente para ações que a aplicação pode representar. Se algo for completamente externo, toolCalls deve ser [] e o text deve pedir o documento/evidência necessária. Não altere valores financeiros.`;
  const userContent=image?[{type:'text',text:prompt},{type:'image_url',image_url:{url:image.dataUrl}}]:prompt;
  const messages=[
    {role:'system',content:'Você explica decisões operacionais de obras. Cálculos e autorizações pertencem ao backend. Responda SOMENTE em formato JSON válido.'},
    {role:'user',content:userContent}
  ];
  const useReasoning=Boolean(image&&reasoning);
  const nvidiaSettingsForRequest=nvidiaSettings(env,{vision:Boolean(image),reasoning:useReasoning});
  const nvidiaText=await nvidiaRequest(env,messages,{vision:Boolean(image),reasoning:useReasoning,retries:image?1:0}).catch(()=>null);
  if(image&&!nvidiaText)return {text:'A NVIDIA não conseguiu interpretar esta imagem agora. Verifique o modelo VLM e tente novamente.',provider:'nvidia-api',vision:true,model:nvidiaSettingsForRequest.model,attachmentAccepted:true};
  const workersText=nvidiaText?null:await callWorkersAI(env,prompt).catch(()=>null);
  const aiText=nvidiaText||workersText;
  const parsed=parseMaybeJson(aiText,{text:aiText}),
    toolCalls=normalizeOperationalAssistantToolCallsV1(parsed?.toolCalls||parsed?.tool_calls||[]),
    textOutput=parsed?.text||parsed?.summary||parsed?.reply||(typeof parsed==='string'?parsed:'');
  if(textOutput||toolCalls.length)return {...parsed,text:textOutput||'Ação preparada.',toolCalls,provider:nvidiaText?'nvidia-api':'workers-ai',...(image?{vision:true,reasoning:useReasoning,model:nvidiaSettingsForRequest.model,endpoint:nvidiaSettingsForRequest.apiUrl,attachmentAccepted:true}:{})};
  return {
    text:/atras|risco|bloque/i.test(message)
      ? 'Há etapas que precisam ser revisadas por dependência, caixa, cobertura de materiais e evidência de campo.'
      : /compra|orc|budget|caixa|material/i.test(message)
        ? 'O backend calcula a cobertura financeira e de materiais; compras permanecem como solicitações até aprovação.'
        : 'A camada operacional está pronta para correlacionar caixa, materiais, agenda e evidências.',
    risk:'medium',
    nextAction:'Executar o planejamento e revisar as solicitações de compra sugeridas.',
    toolCalls:[],
    provider:'deterministic'
  };
}





const JOURNEY_NORMALIZER_VERSION='v20';

function normalizeJourneyHeadingsV20(value){
  let text=String(value??'')
    .replace(/\r\n/g,'\n')
    .trim();

  // Repara somente perda parcial inequívoca do primeiro título no início.
  text=text.replace(
    /^(?:ADO|TADO|STADO|ESTADO)\s+ATUAL\s+DA\s+OBRA\s*:/i,
    'ESTADO ATUAL DA OBRA:'
  );

  // Canonicaliza a segunda heading sem inventá-la quando ausente.
  text=text.replace(
    /\bPR[OÓ]XIMO\s+PASSO\s*:/i,
    'PRÓXIMO PASSO:'
  );

  return text;
}

export async function runWholeWorkJourneyExplanation(
  env,
  {message,context=null,instruction='',requestContext=null}={}
){
  const settings=nvidiaSettings(env);

  if(!settings.apiKey){
    const error=new Error('NVIDIA journey strict: NVIDIA_API_KEY não configurada no Worker.');
    error.statusCode=502;
    throw error;
  }

  const systemInstruction=truncate(
    instruction ||
      'Você explica o estado atual de uma obra e o próximo passo definido pelo System Model. Não invente fatos.',
    7000
  );

  const factualContext=truncate(JSON.stringify(context||{}),14000);

  const messages=[
    {
      role:'system',
      content:[
        systemInstruction,
        '',
        'REGRAS DE SAÍDA:',
        '1. Não responda JSON.',
        '2. Não altere a decisão do MiniCPM.',
        '3. Use somente fatos do contexto.',
        '4. Responda obrigatoriamente com os títulos ESTADO ATUAL DA OBRA: e PRÓXIMO PASSO:.',
        '5. Primeiro explique o estado atual; depois explique a próxima ação.',
        '6. Evento atual, snapshot atual e authoritativeNextStep têm precedência absoluta sobre qualquer texto anterior.',
        '7. previousConversation nunca é fonte factual; serve somente para continuidade se sameDecision=true.',
        '8. Se previousConversation.sameDecision=false, ignore previousConversation.text e não repita a ação anterior.',
        '9. Se a conversa anterior contradizer estoque, caixa, progresso, evento ou próxima ação atuais, descarte-a.'
      ].join('\n')
    },
    {
      role:'user',
      content:
        'PEDIDO: '+truncate(message,1800)+'\n\n'+
        'CONTEXTO OPERACIONAL AUTORITATIVO:\n'+factualContext+'\n\n'+
        'INTENÇÃO DA REQUISIÇÃO: '+truncate(JSON.stringify(requestContext||{}),1200)
    }
  ];

  let response='';
  try{
    response=await nvidiaRequest(env,messages,{maxTokens:Math.max(256,Math.trunc(Number(settings.maxTokens)||900))});
  }catch(error){
    const strictError=new Error('NVIDIA journey strict falhou: '+String(error?.message||error));
    strictError.statusCode=502;
    throw strictError;
  }

  const rawTextV20=String(response||'')
    .replace(/<think>[\s\S]*?<\/think>/gi,'')
    .trim();

  const text=normalizeJourneyHeadingsV20(rawTextV20);

  if(!text){
    const error=new Error('NVIDIA journey strict: resposta vazia.');
    error.statusCode=502;
    throw error;
  }

  if(!/estado atual da obra/i.test(text) || !/pr[oó]ximo passo/i.test(text)){
    const error=new Error(
      '[journey-normalizer-v20] NVIDIA journey strict: resposta não contém as seções obrigatórias. '+
      'Normalizada: '+text.slice(0,500)+
      ' | Raw: '+rawTextV20.slice(0,500)
    );
    error.statusCode=502;
    throw error;
  }

  return {
    text,
    provider:'nvidia-api',
    model:settings.model,
    endpoint:settings.apiUrl,
    strictJourney:true
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
    pendingCount:plan.pendingCount||0,
    pending:plan.decisions.filter(item=>item.action==='blocked_pending').slice(0,20).map(item=>({
      activity:item.activity?.title||item.requirement?.activityId,
      stage:item.requirement?.stageName,
      items:item.pending?.items||[]
    })),
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


// BELAVISTA_RECORD_OCR_DYNAMIC_V21
const RECORD_OCR_MAX_PROPERTIES_V21=40;
const cleanOcrTextV21=(value,max=240)=>truncate(String(value??''),max);
const cleanOcrNumberV21=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback;};
const cleanOcrCentsV21=(value)=>{
  if(typeof value==='number'&&Number.isFinite(value))return Math.max(0,Math.round(value));
  const text=String(value??'').trim();
  if(!text)return 0;
  const numeric=Number(text);
  if(Number.isFinite(numeric))return Math.max(0,Math.round(numeric));
  const normalized=text.replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.');
  const amount=Number(normalized);
  return Number.isFinite(amount)?Math.max(0,Math.round(amount*100)):0;
};
const ocrPropertyV21=(key,label,type,value,confidence=0)=>({
  key,label,type,value,source:'nvidia-vision-ocr',confidence:Math.max(0,Math.min(1,cleanOcrNumberV21(confidence,0)))
});


// BELAVISTA_RECORD_OCR_FAST_VISION_V23
// BELAVISTA_RECORD_OCR_CAPACITY_FALLBACK_V24B
// BELAVISTA_RECORD_OCR_SUPPORTED_VLM_V25
const sleepRecordOcrV25=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function recordOcrSettingsV25(env){
  const apiKey=nvidiaKey(env);
  const primaryModel=String(
    env.NVIDIA_RECORD_OCR_MODEL||
    'meta/llama-3.2-11b-vision-instruct'
  ).trim();

  const configured=String(
    [primaryModel,env.NVIDIA_RECORD_OCR_MODELS,env.NVIDIA_RECORD_OCR_FALLBACK_MODEL]
      .filter(Boolean)
      .join(',')
  )
    .split(',')
    .map(value=>value.trim())
    .filter(Boolean);

  const defaults=[primaryModel];

  // Modelos que já provaram estar indisponíveis ou inadequados neste fluxo
  // não entram novamente por configuração antiga.
  const rejected=new Set([
    'nvidia/nemotron-nano-12b-v2-vl'
  ]);

  const models=[...configured,...defaults]
    .filter(model=>!rejected.has(model))
    .filter((model,index,array)=>model&&array.indexOf(model)===index);

  return {
    apiKey,
    apiUrl:
      env.NVIDIA_RECORD_OCR_API_URL||
      env.NVIDIA_API_URL||
      env.NVIDIA_NIM_API_URL||
      'https://integrate.api.nvidia.com/v1/chat/completions',
    models,
    primaryRetries:numberSetting(env.NVIDIA_RECORD_OCR_RETRIES,1,{min:0,max:2}),
    primaryTimeoutMs:numberSetting(env.NVIDIA_RECORD_OCR_TIMEOUT_MS,30_000,{min:8_000,max:45_000}),
    fallbackTimeoutMs:numberSetting(env.NVIDIA_RECORD_OCR_FALLBACK_TIMEOUT_MS,35_000,{min:8_000,max:50_000}),
    maxTokens:numberSetting(env.NVIDIA_RECORD_OCR_MAX_TOKENS,1000,{min:256,max:1600})
  };
}

const retryableRecordOcrV25=(status,message='')=>
  status===429||
  status===503||
  status===504||
  /ResourceExhausted|request limit|rate limit|temporar|capacity|timeout/i.test(String(message||''));

const permanentlyUnavailableRecordOcrV25=(status,message='')=>
  status===404||
  status===410||
  /not found|gone|deprecated|no longer available|unsupported model/i.test(String(message||''));

async function recordOcrSingleRequestV25(settings,model,messages,{timeoutMs}={}){
  const controller=new AbortController();
  const effectiveTimeout=Number(timeoutMs||settings.primaryTimeoutMs);
  const timeout=setTimeout(()=>controller.abort(),effectiveTimeout);
  const startedAt=Date.now();

  try{
    const response=await fetch(settings.apiUrl,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        accept:'application/json',
        authorization:'Bearer '+settings.apiKey
      },
      body:JSON.stringify({
        model,
        messages,
        temperature:0,
        top_p:0.1,
        max_tokens:settings.maxTokens,
        stream:false
      }),
      signal:controller.signal
    });

    const payload=await response.json().catch(()=>({}));
    const detail=String(payload?.error?.message||payload?.detail||'');

    if(!response.ok){
      return {
        ok:false,
        status:response.status,
        detail,
        retryable:retryableRecordOcrV25(response.status,detail),
        permanent:permanentlyUnavailableRecordOcrV25(response.status,detail),
        elapsedMs:Date.now()-startedAt
      };
    }

    const content=String(payload?.choices?.[0]?.message?.content||'').trim();

    if(!content){
      return {
        ok:false,
        status:502,
        detail:'conteúdo vazio',
        retryable:false,
        permanent:false,
        elapsedMs:Date.now()-startedAt
      };
    }

    return {
      ok:true,
      content,
      model,
      endpoint:settings.apiUrl,
      elapsedMs:Date.now()-startedAt
    };
  }catch(error){
    const timedOut=error?.name==='AbortError'||controller.signal.aborted;

    return {
      ok:false,
      status:timedOut?504:502,
      detail:timedOut?'timeout':String(error?.message||error),
      retryable:timedOut,
      permanent:false,
      elapsedMs:Date.now()-startedAt
    };
  }finally{
    clearTimeout(timeout);
  }
}

async function recordOcrNvidiaRequestV25(env,messages){
  const settings=recordOcrSettingsV25(env);

  if(!settings.apiKey){
    const error=new Error('OCR de registro: NVIDIA_API_KEY não configurada.');
    error.statusCode=502;
    throw error;
  }

  if(!settings.models.length){
    const error=new Error('OCR de registro: nenhum VLM NVIDIA disponível configurado.');
    error.statusCode=502;
    throw error;
  }

  const attempts=[];

  for(let modelIndex=0;modelIndex<settings.models.length;modelIndex++){
    const model=settings.models[modelIndex];
    const maxAttempts=modelIndex===0?settings.primaryRetries+1:1;
    const timeoutMs=modelIndex===0
      ? settings.primaryTimeoutMs
      : settings.fallbackTimeoutMs;

    for(let attempt=1;attempt<=maxAttempts;attempt++){
      const result=await recordOcrSingleRequestV25(
        settings,
        model,
        messages,
        {timeoutMs}
      );

      attempts.push({
        model,
        attempt,
        status:result.status||200,
        retryable:Boolean(result.retryable),
        permanent:Boolean(result.permanent),
        elapsedMs:result.elapsedMs,
        detail:String(result.detail||'').slice(0,180)
      });

      if(result.ok){
        return {...result,attempts};
      }

      // 404/410: não gasta retry; passa imediatamente ao próximo VLM.
      if(result.permanent)break;

      // 4xx/5xx não-transitório: pula para próximo VLM.
      if(!result.retryable)break;

      // Só o modelo primário recebe retry local.
      if(attempt<maxAttempts){
        await sleepRecordOcrV25(1400*attempt);
      }
    }
  }

  const error=new Error(
    'OCR NVIDIA indisponível em todos os VLMs. '+
    attempts.map(item=>item.model+'#'+item.attempt+'='+item.status).join(', ')
  );
  error.statusCode=503;
  error.retryable=true;
  error.ocrAttempts=attempts;
  throw error;
}


// BELAVISTA_RECORD_OCR_JSON_REPAIR_V26B
function extractBalancedJsonObjectV26b(value){
  const text=String(value??'');
  let start=-1;
  let depth=0;
  let quote='';
  let escaped=false;

  for(let i=0;i<text.length;i++){
    const ch=text[i];

    if(quote){
      if(escaped){
        escaped=false;
        continue;
      }
      if(ch==='\\'){
        escaped=true;
        continue;
      }
      if(ch===quote){
        quote='';
      }
      continue;
    }

    // JSON válido usa aspas duplas; o normalizador também tolera aspas simples.
    if(ch==='"'||ch==="'"){
      quote=ch;
      continue;
    }

    if(ch==='{'){
      if(depth===0)start=i;
      depth++;
      continue;
    }

    if(ch==='}'&&depth>0){
      depth--;
      if(depth===0&&start>=0){
        return text.slice(start,i+1);
      }
    }
  }

  return '';
}

function convertSingleQuotedJsonStringsV26b(value){
  const text=String(value??'');
  let out='';
  let inSingle=false;
  let inDouble=false;
  let escaped=false;

  for(let i=0;i<text.length;i++){
    const ch=text[i];

    if(inDouble){
      out+=ch;
      if(escaped){
        escaped=false;
      }else if(ch==='\\'){
        escaped=true;
      }else if(ch==='"'){
        inDouble=false;
      }
      continue;
    }

    if(inSingle){
      if(escaped){
        if(ch==="'"){
          out+="'";
        }else{
          out+='\\'+ch;
        }
        escaped=false;
        continue;
      }

      if(ch==='\\'){
        escaped=true;
        continue;
      }

      if(ch==="'"){
        out+='"';
        inSingle=false;
        continue;
      }

      if(ch==='"'){
        out+='\\"';
      }else if(ch==='\n'){
        out+='\\n';
      }else if(ch==='\r'){
        out+='\\r';
      }else{
        out+=ch;
      }
      continue;
    }

    if(ch==='"'){
      inDouble=true;
      out+=ch;
      continue;
    }

    if(ch==="'"){
      inSingle=true;
      out+='"';
      continue;
    }

    out+=ch;
  }

  return out;
}

function normalizeJsonishOcrV26b(value){
  let text=String(value??'')
    .replace(/^\uFEFF/,'')
    .replace(/<think>[\s\S]*?<\/think>/gi,'')
    .replace(/~~~(?:json|javascript|js)?/gi,'')
    .replace(/~~~/g,'')
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .trim();

  // Remove cercas markdown com crases sem usar crase literal neste aplicador.
  const fence=String.fromCharCode(96).repeat(3);
  text=text
    .split(fence+'json').join('')
    .split(fence+'javascript').join('')
    .split(fence+'js').join('')
    .split(fence).join('')
    .trim();

  const balanced=extractBalancedJsonObjectV26b(text);
  if(balanced)text=balanced;

  text=text
    .replace(/\bTrue\b/g,'true')
    .replace(/\bFalse\b/g,'false')
    .replace(/\bNone\b/g,'null')
    .replace(/,\s*([}\]])/g,'$1')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g,'$1"$2"$3');

  if(/'/.test(text)){
    text=convertSingleQuotedJsonStringsV26b(text);
  }

  return text.trim();
}

function parseOcrJsonV26b(value){
  const direct=parseMaybeJson(value,null);
  if(direct&&typeof direct==='object'){
    return {value:direct,mode:'direct'};
  }

  const normalized=normalizeJsonishOcrV26b(value);
  if(normalized){
    try{
      const parsed=JSON.parse(normalized);
      if(parsed&&typeof parsed==='object'){
        return {value:parsed,mode:'local-normalize'};
      }
    }catch{}
  }

  return {value:null,mode:'failed'};
}

/** Extract selectable invoice text, use Cloudflare Workers AI, and enforce office routing. */
export async function extractInvoicePdfOcr(env,{attachment,context=null}={}){
  const extracted=await extractPdfText(attachment);
  const stages=Array.isArray(context?.stages)?context.stages:[];
  const deterministic=parseInvoicePdfText(extracted.text,{stages});
  if(!deterministic){const error=new Error('O arquivo foi aberto, mas o conteúdo não foi reconhecido como nota fiscal pesquisável.');error.statusCode=422;throw error;}
  const prompt=[
    'Leia o texto extraído da nota fiscal e devolva somente JSON válido.',
    'Extraia número, série, data de emissão, fornecedor, CNPJ, chave de acesso, total em centavos e todos os itens com código, descrição, quantidade, unidade e valores em centavos.',
    'Regra de destino obrigatória: somente insumos diretamente usados na construção ou no canteiro seguem para etapa de obra. Todo item de outra natureza — incluindo eletrônicos, itens pessoais, escritório e despesas administrativas — recebe stageKey="office" e stageName="Escritório". A seleção atual da interface não é destino implícito.',
    'Não invente nem corrija valores. Use confidence de 0 a 1. Formato: {documentType,confidence,invoiceNumber,series,issueDate,supplier,supplierCnpj,accessKey,totalAmountCents,items:[{itemKind,materialId,description,quantity,unit,unitPriceCents,totalPriceCents,stageKey,stageName,confidence}]}.',
    'Texto da nota fiscal:', extracted.text.slice(0,36_000)
  ].join('\n');
  let inference={provider:'cloudflare-workers-ai',model:String(env.WORKERS_AI_MODEL||WORKERS_MODEL),status:'unavailable',error:''};
  try{
    const response=await callWorkersAI(env,prompt,{jsonMode:true,maxTokens:1400,temperature:0});
    const parsed=response&&typeof response==='object'&&!Array.isArray(response)
      ?response
      :response?parseOcrJsonV26b(response).value:null;
    inference={provider:'cloudflare-workers-ai',model:String(env.WORKERS_AI_MODEL||WORKERS_MODEL),status:parsed?'completed':response?'unparsed':'unavailable',error:parsed?'':response?'O Cloudflare Workers AI respondeu, mas o JSON não pôde ser interpretado.':'Binding Cloudflare Workers AI indisponível no Worker.'};
  }catch(error){
    inference={provider:'cloudflare-workers-ai',model:String(env.WORKERS_AI_MODEL||WORKERS_MODEL),status:'failed',error:String(error?.message||error).slice(0,240)};
  }
  const officeStage=stages.find(stage=>String(stage.key||'').toLowerCase()==='office'||String(stage.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='escritorio');
  const items=deterministic.items.map(item=>isConstructionSupply(item.description)
    ?{...item,stageKey:'',stageName:'',destinationHint:'construction-stage-required'}
    :{...item,stageKey:String(officeStage?.key||'office'),stageName:String(officeStage?.name||'Escritório'),destinationHint:'office'});
  const office=items.some(item=>item.destinationHint==='office');
  const properties=[...(deterministic.properties||[]),
    {key:'pdfPageCount',label:'Páginas do PDF',type:'number',value:extracted.totalPages,confidence:1},
    {key:'inferenceProvider',label:'Leitura assistida por',type:'text',value:`Cloudflare Workers AI · ${inference.model}`,confidence:1}
  ];
  return {
    ...deterministic,items,properties,text:extracted.text.slice(0,12_000),rawText:extracted.text.slice(0,12_000),totalPages:extracted.totalPages,
    provider:inference.provider,...(inference.model?{model:inference.model}:{}),
    inference:{provider:inference.provider,model:inference.model,status:inference.status,...(inference.error?{error:inference.error}:{})},
    classification:office?'administrative':'construction',destinationStageKey:office?String(officeStage?.key||'office'):'',
    destinationStageName:office?String(officeStage?.name||'Escritório'):'',reviewRequired:true
  };
}

// Alguns VLMs obedecem ao conteúdo do esquema, mas antecedem o JSON com uma
// explicação em Markdown. Quando há campos explicitamente rotulados, preserve
// somente o que foi lido, em vez de chamar um segundo modelo e arriscar perda
// ou invenção de dados.
function parseLabeledMarkdownOcrV26b(value){
  const text=String(value||'');
  if(!/\*\*\s*(?:nota fiscal|tipo de documento|n[uú]mero da nota|descri[cç][aã]o)\b/i.test(text))return null;
  const field=label=>{
    const match=text.match(new RegExp('\\*\\*\\s*'+label+'\\s*:?\\s*\\*\\*\\s*([^\\r\\n]+)','i'));
    return match?match[1].replace(/[*_`]/g,'').trim():'';
  };
  const itemPattern=/\*\*\s*Descri[cç][aã]o\s*:\s*\*\*\s*([^\r\n]+)[\s\S]{0,260}?\*\*\s*Quantidade\s*:\s*\*\*\s*([^\r\n]+)[\s\S]{0,160}?\*\*\s*Unidade\s*:\s*\*\*\s*([^\r\n]+)/gi;
  const items=[];
  for(const match of text.matchAll(itemPattern)){
    const description=String(match[1]||'').replace(/[*_`]/g,'').trim();
    const quantityToken=String(match[2]||'').replace(/[*_`]/g,'').match(/-?\d+(?:[.,]\d+)?/)?.[0]||'';
    const quantity=Number(quantityToken.replace(',','.'));
    const unit=String(match[3]||'').replace(/[*_`]/g,'').trim();
    if(!description||/^(?:n[aã]o especificada|item \d+)$/i.test(description)||items.some(item=>item.description===description))continue;
    items.push({
      itemKind:'material',description,materialName:description,
      // Números longos sem separador são normalmente código/linha OCR, não
      // quantidade. Não os propague ao estoque sem revisão humana.
      quantity:Number.isFinite(quantity)&&Math.abs(quantity)<=100000?quantity:null,
      unit:/^\d{3,}$/.test(unit)||/^n[aã]o especificada$/i.test(unit)?'':unit,
      confidence:.25
    });
  }
  const invoiceNumber=field('N[uú]mero da Nota Fiscal')||field('N[uú]mero da NF');
  const supplier=field('Fornecedor');
  if(!invoiceNumber&&!supplier&&!items.length)return null;
  return {documentType:'purchase_invoice',invoiceNumber,supplier,items,confidence:.25};
}

async function repairOcrJsonWithTextModelV26b(env,rawText){
  const apiKey=nvidiaKey(env);
  if(!apiKey)return null;

  const model=
    env.NVIDIA_RECORD_OCR_REPAIR_MODEL||
    env.NVIDIA_STATE_MODEL||
    env.NVIDIA_MODEL||
    '';

  if(!model)return null;

  const apiUrl=
    env.NVIDIA_RECORD_OCR_API_URL||
    env.NVIDIA_API_URL||
    env.NVIDIA_NIM_API_URL||
    'https://integrate.api.nvidia.com/v1/chat/completions';

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15_000);

  try{
    const response=await fetch(apiUrl,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        accept:'application/json',
        authorization:'Bearer '+apiKey
      },
      body:JSON.stringify({
        model,
        messages:[{
          role:'user',
          content:[
            'Converta o conteúdo abaixo em JSON estritamente válido.',
            'NÃO altere, complete, traduza ou invente valores.',
            'NÃO faça OCR novamente.',
            'Apenas repare sintaxe: aspas, vírgulas, chaves e literais.',
            'Retorne somente o objeto JSON, sem markdown.',
            '',
            String(rawText??'').slice(0,14000)
          ].join('\n')
        }],
        temperature:0,
        top_p:0.1,
        max_tokens:1300,
        stream:false
      }),
      signal:controller.signal
    });

    if(!response.ok)return null;

    const payload=await response.json().catch(()=>({}));
    const content=String(payload?.choices?.[0]?.message?.content||'').trim();
    if(!content)return null;

    const parsed=parseOcrJsonV26b(content);
    if(!parsed.value)return null;

    return {
      value:parsed.value,
      model,
      mode:'text-repair'
    };
  }catch{
    return null;
  }finally{
    clearTimeout(timeout);
  }
}

export async function extractInstantRecordOcr(env,{attachment,context=null}={}){
  const image=normalizeVisionAttachment(attachment);
  if(!image){const error=new Error('OCR de registro: imagem PNG/JPEG/WEBP válida é obrigatória.');error.statusCode=400;throw error;}
  const settings=recordOcrSettingsV25(env);
  if(!settings.apiKey){const error=new Error('OCR de registro: NVIDIA_API_KEY não configurada.');error.statusCode=502;throw error;}

  const stageCandidates=(Array.isArray(context?.stages)?context.stages:[]).slice(0,40).map(stage=>{
    const profile=stage?.executionProfile||stage?.aiConfig||{};
    const strings=value=>(Array.isArray(value)?value:[]).map(item=>typeof item==='string'?item:[item?.name,item?.title,item?.description].filter(Boolean).join(': ')).filter(Boolean).map(value=>truncate(value,180)).slice(0,8);
    return {
      key:truncate(stage?.key,100),
      name:truncate(stage?.name,160),
      executionDescription:truncate(stage?.description||profile.typicalDescription||profile.executionDescription||'',420),
      activityHints:[...strings(stage?.activityHints),...strings(profile.requestHints),...strings(profile.evidenceFocus),...strings(stage?.activities?.map?.(activity=>({name:activity?.name||activity?.title,description:activity?.description})))].slice(0,12),
      materials:strings(stage?.materials).slice(0,8)
    };
  }).filter(stage=>stage.key&&stage.name);
  const userDescription=truncate(context?.userDescription,2000);
  const ocrContext=JSON.stringify({
    userDescription,
    selectedStage:{key:truncate(context?.selectedStageKey,100),name:truncate(context?.selectedStageName,160),role:'navigation-context-only-never-allocation-fallback'},
    stageCandidates
  });
  const detailedPrompt=[
    'Leia a imagem anexada junto com a descrição escrita pela pessoa e produza OCR estruturado para um registro operacional de obra.',
    'Primeiro classifique a imagem: nota fiscal/recibo de compra, foto de evidência de serviço executado, ou outro documento. Não trate uma fotografia de serviço como nota fiscal nem uma linha de serviço faturada como prova de execução.',
    'Não invente valores, itens, datas, horários, quantidades, atividades ou associações que não estejam legíveis ou informados. Toda leitura fica Pendente para revisão humana.',
    'Para nota fiscal/recibo, extraia número, série, data de emissão, fornecedor, CNPJ, chave de acesso, valor total e todos os itens visíveis. Preserve código/materialId impresso; quantidade, unidade e valores devem refletir o documento. Valores monetários DEVEM ser centavos inteiros. Classifique cada item físico como material e mão de obra/serviço comprado como servico.',
    'Para foto de serviço, use uma descrição explícita da pessoa como relato principal da ação quando existir. Se a mensagem contiver somente "Etapa: NOME" ou "Stage: NAME", isso identifica EXCLUSIVAMENTE o destino: não é descrição da ação e você NUNCA deve copiar o nome da etapa para actionDescription, activityName, description ou materialName. Nesse caso, identifique uma ação concreta somente pelo que a foto mostra (por exemplo, escavação/movimentação de solo quando houver evidência visual); se a operação não for identificável, deixe a ação vazia e peça esclarecimento. Registre separadamente o que a imagem realmente mostra. Não deduza data/hora pelos metadados nem invente equipe, quantidade ou conclusão. Retorne serviceEvidence com actionDescription, visualDescription, observedDate e observedTime; deixe data/hora vazias se não estiverem escritas na mensagem ou visíveis na imagem.',
    'Ao associar um item ou ação, compare a descrição da pessoa, o que está visível e os executionDescription/activityHints/materials das etapas candidatas. Use somente o key e o name canônicos da etapa compatível; preencha activityName/activityId apenas se houver correspondência sustentada. A descrição da ação de serviço deve ser comparada às atividades e à descrição típica das etapas, não apenas ao nome da etapa.',
    'A etapa selecionada na interface é apenas contexto de navegação: NUNCA a use como destino automático. Se nenhuma candidata combinar com segurança, deixe stageKey, stageName, activityId e activityName vazios. Não escolha a etapa mais próxima e não crie registro órfão; o assistente deve perguntar ao usuário qual etapa/atividade usar.',
    'Para foto de serviço, retorne item itemKind=servico quando uma ação concreta for identificada no texto explícito ou na imagem; use description/activityName para essa ação (nunca apenas o nome da etapa), details para observação visual e pointer para evidência textual/visual que sustenta a classificação. Não invente quantidade; use null se não houver quantidade explícita.',
    'Além dos campos conhecidos, devolva dynamicFields apenas para propriedades adicionais realmente visíveis ou declaradas pela pessoa.',
    'Responda SOMENTE JSON no formato:',
    JSON.stringify({documentType:'purchase_invoice|purchase_receipt|service_evidence|other',confidence:0,invoiceNumber:'',series:'',issueDate:'',supplier:'',supplierCnpj:'',accessKey:'',totalAmountCents:0,serviceEvidence:{actionDescription:'',visualDescription:'',observedDate:'',observedTime:'',stageKey:'',stageName:'',activityId:'',activityName:'',confidence:0},items:[{itemKind:'material|servico|outro',materialId:'',materialName:'',description:'',details:'',pointer:'',quantity:null,unit:'',unitPriceCents:0,totalPriceCents:0,stageKey:'',stageName:'',activityId:'',activityName:'',confidence:0}],dynamicFields:[{key:'',label:'',type:'text|number|date|currency',value:'',confidence:0}]}),
    'Contexto real da requisição (a descrição acompanha a própria imagem; etapa selecionada é somente navegação): '+truncate(ocrContext,7000),
    'Se a descrição escrita nomear uma etapa candidata, essa indicação explícita prevalece. Caso contrário, só sugira etapa pela compatibilidade semântica entre ação/item e descrições/pistas das candidatas; nunca pela seleção atual.'
  ].join('\n');
  const likelyPurchase=/\b(?:nota|nf-?e|recibo|compra|fornecedor|danfe)\b/i.test(userDescription);
  const prompt=likelyPurchase?[
    'Você é um extrator OCR multimodal de notas fiscais de materiais de obra.',
    'Leia somente o que estiver visível. Não invente campos e deixe valores ilegíveis vazios.',
    'Classifique cada item físico como material; linha de mão de obra/serviço comprado é servico.',
    'Responda SOMENTE JSON com documentType, confidence, invoiceNumber, series, issueDate, supplier, supplierCnpj, accessKey, totalAmountCents e items.',
    'Cada item deve conter itemKind, materialId, materialName, description, quantity, unit, unitPriceCents, totalPriceCents, details, pointer e confidence. Valores monetários são centavos inteiros; use null ou string vazia quando não legíveis.',
    'Contexto de destino: '+truncate(ocrContext,4000),
    'A etapa mencionada pela pessoa é destino explícito para revisão; não copie a etapa como nome de material.'
  ].join('\n'):detailedPrompt;

  const ocrRequestV25=await recordOcrNvidiaRequestV25(env,[{
    role:'user',
    content:[
      {
        type:'text',
        text:[
          'Você é um extrator OCR multimodal.',
          'Extraia somente fatos legíveis do documento.',
          'Não execute ações operacionais.',
          'Responda apenas JSON válido.',
          prompt
        ].join('\n')
      },
      {
        type:'image_url',
        image_url:{url:image.dataUrl}
      }
    ]
  }]);
  const response=ocrRequestV25.content;
  let parsedResultV26b=parseOcrJsonV26b(response);
  let parsed=parsedResultV26b.value;
  let parseModeV26b=parsedResultV26b.mode;
  let repairModelV26b='';

  if(!parsed||typeof parsed!=='object'){
    const labeled=parseLabeledMarkdownOcrV26b(response);
    if(labeled){parsed=labeled;parseModeV26b='labeled-markdown';}
  }

  if(!parsed||typeof parsed!=='object'){
    const repairedV26b=await repairOcrJsonWithTextModelV26b(env,response);
    if(repairedV26b?.value){
      parsed=repairedV26b.value;
      parseModeV26b=repairedV26b.mode;
      repairModelV26b=repairedV26b.model||'';
    }
  }

  if(!parsed||typeof parsed!=='object'){
    const error=new Error(
      'OCR de registro: resposta visual recebida, mas não foi possível normalizar o JSON.'
    );
    error.statusCode=502;
    error.ocrParseMode=parseModeV26b;
    error.ocrRawLength=String(response||'').length;
    throw error;
  }

  const confidence=Math.max(0,Math.min(1,cleanOcrNumberV21(parsed.confidence,0)));
  const rawDocumentType=cleanOcrTextV21(parsed.documentType||'other',50).toLowerCase();
  const documentType=/service|servi[cç]o|execu[cç][aã]o|field.?photo/.test(rawDocumentType)?'service_evidence':/nota\s*fiscal|nf-?e|danfe|invoice|recibo\s*(?:de\s*)?(?:compra|fiscal)?/.test(rawDocumentType)?'purchase_invoice':rawDocumentType;
  const rawServiceEvidence=parsed.serviceEvidence&&typeof parsed.serviceEvidence==='object'?parsed.serviceEvidence:{};
  const stageOnlyInput=userDescription.match(/^\s*(?:etapa|stage)\s*:\s*([^.!?\r\n]+)[.!]?\s*$/i)?.[1]||'';
  const normalizeVisualLabel=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
  const modelAction=cleanOcrTextV21(rawServiceEvidence.actionDescription||rawServiceEvidence.action||rawServiceEvidence.activityName,1000);
  const modelActivityName=cleanOcrTextV21(rawServiceEvidence.activityName,160);
  const imageObservedDescription=cleanOcrTextV21(rawServiceEvidence.visualDescription||rawServiceEvidence.observation,1200);
  const actionEchoesDestination=Boolean(stageOnlyInput&&normalizeVisualLabel(modelAction)===normalizeVisualLabel(stageOnlyInput));
  const visualOperationPattern=/escava|movimenta[cç][aã]o?\s+(?:de\s+)?solo|terraplen|nivelamento|conforma[cç][aã]o|aterro|compacta[cç][aã]o|drenagem|pavimenta[cç][aã]o|instala[cç][aã]o|assentamento|corte\s+de\s+solo/i;
  const imageDerivedAction=actionEchoesDestination&&visualOperationPattern.test(imageObservedDescription)?imageObservedDescription:modelAction;
  const serviceEvidence={
    actionDescription:imageDerivedAction,
    visualDescription:imageObservedDescription,
    observedDate:cleanOcrTextV21(rawServiceEvidence.observedDate||rawServiceEvidence.date,80),
    observedTime:cleanOcrTextV21(rawServiceEvidence.observedTime||rawServiceEvidence.time,40),
    stageKey:cleanOcrTextV21(rawServiceEvidence.stageKey,100),
    stageName:cleanOcrTextV21(rawServiceEvidence.stageName,160),
    activityId:cleanOcrTextV21(rawServiceEvidence.activityId,100),
    activityName:stageOnlyInput&&normalizeVisualLabel(modelActivityName)===normalizeVisualLabel(stageOnlyInput)
      ? (actionEchoesDestination&&visualOperationPattern.test(imageObservedDescription)?imageObservedDescription:'')
      : modelActivityName,
    confidence:Math.max(0,Math.min(1,cleanOcrNumberV21(rawServiceEvidence.confidence,confidence)))
  };
  const items=(Array.isArray(parsed.items)?parsed.items:[]).slice(0,50).map((item,index)=>({
    index,
    materialId:cleanOcrTextV21(item?.materialId||item?.code||item?.codigo,120),
    description:cleanOcrTextV21(item?.description||item?.name||item?.descricao,240),
    quantity:item?.quantity==null&&item?.quantidade==null?null:cleanOcrNumberV21(item?.quantity??item?.quantidade,0),
    unit:cleanOcrTextV21(item?.unit||item?.unidade,30),
    unitPriceCents:cleanOcrCentsV21(item?.unitPriceCents??item?.unitPrice??item?.valorUnitario),
    totalPriceCents:cleanOcrCentsV21(item?.totalPriceCents??item?.totalPrice??item?.valorTotal),
    itemKind:cleanOcrTextV21(item?.itemKind||item?.kind||item?.tipo,30).toLowerCase() || 'outro',
    materialName:cleanOcrTextV21(item?.materialName||item?.material||item?.description||item?.descricao,160),
    stageKey:cleanOcrTextV21(item?.stageKey||item?.etapaKey,100),
    stageName:cleanOcrTextV21(item?.stageName||item?.etapa,160),
    activityId:cleanOcrTextV21(item?.activityId||item?.atividadeId,100),
    activityName:cleanOcrTextV21(item?.activityName||item?.atividade||item?.serviceName,160),
    details:cleanOcrTextV21(item?.details||item?.visualDescription,1200),
    pointer:cleanOcrTextV21(item?.pointer||item?.evidence,800),
    confidence:Math.max(0,Math.min(1,cleanOcrNumberV21(item?.confidence,confidence)))
  }));
  if(documentType==='service_evidence'&&serviceEvidence.actionDescription){
    const serviceItem=items.find(item=>/^(servico|serviço|service|labor)$/.test(item.itemKind));
    if(!serviceItem)items.unshift({
      index:0,materialId:'',description:serviceEvidence.actionDescription,quantity:null,unit:'registro',unitPriceCents:0,totalPriceCents:0,
      itemKind:'servico',materialName:'',stageKey:serviceEvidence.stageKey,stageName:serviceEvidence.stageName,
      activityId:serviceEvidence.activityId,activityName:serviceEvidence.activityName||serviceEvidence.actionDescription,
      details:serviceEvidence.visualDescription,pointer:serviceEvidence.actionDescription,
      confidence:serviceEvidence.confidence||confidence
    });
    else {
      const itemActionEchoesDestination=Boolean(stageOnlyInput&&normalizeVisualLabel(serviceItem.description)===normalizeVisualLabel(stageOnlyInput));
      if(!serviceItem.description||itemActionEchoesDestination)serviceItem.description=serviceEvidence.actionDescription;
      if(!serviceItem.activityName||normalizeVisualLabel(serviceItem.activityName)===normalizeVisualLabel(stageOnlyInput))serviceItem.activityName=serviceEvidence.activityName||serviceEvidence.actionDescription;
      if(normalizeVisualLabel(serviceItem.materialName)===normalizeVisualLabel(stageOnlyInput))serviceItem.materialName='';
      if(!serviceItem.details)serviceItem.details=serviceEvidence.visualDescription;
      if(!serviceItem.pointer)serviceItem.pointer=serviceEvidence.actionDescription;
    }
  }

  const base=[
    ['invoiceNumber','Número da NF','text',cleanOcrTextV21(parsed.invoiceNumber||parsed.documentNumber,80)],
    ['series','Série','text',cleanOcrTextV21(parsed.series,40)],
    ['issueDate','Data de emissão','date',cleanOcrTextV21(parsed.issueDate,30)],
    ['supplier','Fornecedor','text',cleanOcrTextV21(parsed.supplier,160)],
    ['supplierCnpj','CNPJ do fornecedor','text',cleanOcrTextV21(parsed.supplierCnpj||parsed.cnpj,40)],
    ['accessKey','Chave de acesso','text',cleanOcrTextV21(parsed.accessKey,100)],
    ['totalAmountCents','Valor total da nota','currency',cleanOcrCentsV21(parsed.totalAmountCents??parsed.totalAmount)]
  ].filter(([, , ,value])=>value!==''&&value!==0);

  const properties=base.map(([key,label,type,value])=>ocrPropertyV21(key,label,type,value,confidence));
  for(const field of (Array.isArray(parsed.dynamicFields)?parsed.dynamicFields:[]).slice(0,RECORD_OCR_MAX_PROPERTIES_V21-properties.length)){
    const key=cleanOcrTextV21(field?.key,80);
    if(!key||properties.some(item=>item.key===key))continue;
    properties.push(ocrPropertyV21(key,cleanOcrTextV21(field?.label||key,120),cleanOcrTextV21(field?.type||'text',24),field?.value??'',field?.confidence??confidence));
  }
  properties.push(ocrPropertyV21('items','Itens','items',items,confidence));
  return {
    documentType,
    confidence,
    serviceEvidence,
    properties,
    items,
    reviewRequired:true,
    provider:'nvidia-api',
    vision:true,
    model:ocrRequestV25.model,
    endpoint:ocrRequestV25.endpoint,
    latencyMs:ocrRequestV25.elapsedMs,
    ocrProfile:'json-repair-v26b',ocrAttempts:ocrRequestV25.attempts,ocrParseMode:parseModeV26b,ocrRepairModel:repairModelV26b
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
