const WORKERS_MODEL='@cf/nvidia/nemotron-3-120b-a12b';

function truncate(value,max=6000){
  return String(value??'').trim().slice(0,max);
}

async function callWorkersAI(env,prompt){
  if(!env.AI?.run)return null;
  const result=await env.AI.run(env.WORKERS_AI_MODEL||WORKERS_MODEL,{
    messages:[
      {role:'system',content:'Você é um assistente operacional do Belavista. Responda em JSON curto e objetivo.'},
      {role:'user',content:prompt}
    ]
  });
  return result?.response||result?.text||null;
}

async function callNvidiaNim(env,messages){
  if(!env.NVIDIA_NIM_API_KEY)return null;
  const response=await fetch(env.NVIDIA_NIM_API_URL||'https://integrate.api.nvidia.com/v1/chat/completions',{
    method:'POST',
    headers:{
      'content-type':'application/json',
      authorization:`Bearer ${env.NVIDIA_NIM_API_KEY}`
    },
    body:JSON.stringify({
      model:env.NVIDIA_NIM_MODEL||'meta/llama-3.2-90b-vision-instruct',
      messages,
      temperature:0.2,
      top_p:0.9,
      max_tokens:700
    })
  });
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(json?.error?.message||json?.detail||'NVIDIA NIM indisponível.');
  return json?.choices?.[0]?.message?.content||'';
}

function parseMaybeJson(text,fallback){
  try{return JSON.parse(text);}catch{return fallback;}
}

export async function runOperationalAssistant(env,{message,view='assistant',context=null,explain=false}={}){
  if(!truncate(message))return {text:'Mensagem vazia.',provider:'deterministic'};
  const prompt=`Tela: ${view}. Explique a situação operacional do Belavista com base neste contexto: ${truncate(JSON.stringify(context||{}),5000)}. Pedido do usuário: ${truncate(message,1200)}. ${explain?'Inclua prioridade, causa e próximo passo.':''} Responda em JSON com as chaves text, risk, nextAction.`;
  const aiText=await callWorkersAI(env,prompt).catch(()=>null);
  const parsed=parseMaybeJson(aiText,{text:aiText});
  if(parsed?.text)return {...parsed,provider:env.AI?.run?'workers-ai':'deterministic'};
  return {
    text:/atras|risco|bloque/i.test(message)
      ? 'Drenagem e rede elétrica merecem revisão por dependência, orçamento e evidência de campo.'
      : /compra|orc|budget/i.test(message)
        ? 'O orçamento deve continuar determinístico: planejado, comprometido e realizado são calculados no backend.'
        : 'A camada Cloudflare está pronta para responder via `/api/ai` com correlação operacional e explicações auditáveis.',
    risk:'medium',
    nextAction:'Abrir a etapa mais crítica e revisar orçamento, agenda e evidências.',
    provider:'deterministic'
  };
}

export async function runVisualDigest(env,{kind,imageBase64,imageUrl,notes=''}={}){
  const content=[
    {type:'text',text:`Analise a ponta visual do Belavista. Tipo: ${kind}. Extraia fatos observáveis, risco e sugestão curta. Observações humanas: ${truncate(notes,800)}. Responda em JSON com summary, facts, risk, recommendedAction.`}
  ];
  if(imageUrl)content.push({type:'image_url',image_url:{url:imageUrl}});
  if(imageBase64)content.push({type:'image_url',image_url:{url:`data:image/jpeg;base64,${imageBase64}`}});
  const response=await callNvidiaNim(env,[
    {role:'system',content:'Você resume evidências visuais de obra e recibos em JSON curto.'},
    {role:'user',content}
  ]).catch(()=>null);
  const parsed=parseMaybeJson(response,{
    summary:`Digestão visual pendente para ${kind}.`,
    facts:[],
    risk:'medium',
    recommendedAction:'Revisar manualmente a evidência antes de promover qualquer dado oficial.'
  });
  return {
    summary:truncate(parsed.summary||parsed.text||`Digestão concluída para ${kind}.`,300),
    facts:Array.isArray(parsed.facts)?parsed.facts.slice(0,8):[],
    risk:truncate(parsed.risk||'medium',20),
    recommendedAction:truncate(parsed.recommendedAction||parsed.nextAction||'Revisar evidência com um responsável.',240),
    provider:env.NVIDIA_NIM_API_KEY?'nvidia-nim':'deterministic'
  };
}
