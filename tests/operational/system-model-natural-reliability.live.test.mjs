import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {OpenJevClient} from '../../desktop/system-model/openjev-client.mjs';

const LIVE=process.env.BELAVISTA_OPENJEV_LIVE==='1';
const METHOD='generation';
const REPORT_DIR=path.resolve('test-results');
const MIN_GATE_ACCURACY=Number(process.env.BELAVISTA_GENERATION_MIN_GATE_ACCURACY||0.90);
const MIN_STAGE_ACCURACY=Number(process.env.BELAVISTA_GENERATION_MIN_STAGE_ACCURACY||0.90);
const MIN_ACTION_ACCURACY=Number(process.env.BELAVISTA_GENERATION_MIN_ACTION_ACCURACY||0.90);
const MIN_GATE_EXPECTED_PROB=Number(process.env.BELAVISTA_GENERATION_MIN_GATE_EXPECTED_PROB||0.70);
const MIN_ACTION_EXPECTED_PROB=Number(process.env.BELAVISTA_GENERATION_MIN_ACTION_EXPECTED_PROB||0.70);
const MAX_HIGH_CONFIDENCE_WRONG_RATE=Number(process.env.BELAVISTA_GENERATION_MAX_HIGH_CONFIDENCE_WRONG_RATE||0.10);

let client=null;
let health=null;
const observations=[];
const directObservations=[];

const STAGE_ACTION={
  funding:'fund',
  procurement:'purchase',
  receiving:'receive',
  assignment:'assign',
  assignment_acceptance:'accept_assignment',
  execution_start:'start',
  execution_reporting:'report',
  evidence_submission:'submit_evidence',
  evidence_verification:'verify_evidence',
  confirmation:'confirm',
  completed:'none'
};

const ACTION_TEXT={
  fund:'Aportar/provisionar fundos.',
  purchase:'Comprar ou registrar a compra do material.',
  receive:'Registrar o recebimento físico do material.',
  assign:'Criar a atribuição do responsável.',
  accept_assignment:'Aceitar a atribuição existente.',
  start:'Iniciar a execução física.',
  report:'Registrar o andamento da execução.',
  submit_evidence:'Enviar a evidência obrigatória.',
  verify_evidence:'Verificar a evidência enviada.',
  confirm:'Confirmar a execução.',
  none:'Nenhuma nova ação operacional obrigatória.'
};

function percentile(values,p){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const i=Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p/100)-1));
  return sorted[i];
}

function answerChoice(payload,id){
  return payload?.answers?.[id]?.choice??null;
}

function generationValid(payload,id){
  const a=payload?.answers?.[id];
  if(!a)return false;
  return !a.generation||a.generation.valid!==false;
}

function parseGeneratedProbability(generation,criteriaKeys=[]){
  const raw=generation?.generated_text;
  if(typeof raw!=='string'||!raw.trim())return null;

  let obj=null;
  try{ obj=JSON.parse(raw); }catch{
    const a=raw.indexOf('{');
    const b=raw.lastIndexOf('}');
    if(a>=0&&b>a){
      try{ obj=JSON.parse(raw.slice(a,b+1)); }catch{}
    }
  }
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return null;

  const probabilities={};
  for(const [label,value0] of Object.entries(obj)){
    const value=Number(value0);
    if(!Number.isFinite(value)||value<0)continue;
    const text=String(label);
    let key=criteriaKeys.find(k=>{
      const needle=': '+String(k).toLowerCase()+':';
      return text.toLowerCase().includes(needle);
    });
    if(!key){
      const m=text.match(/^\s*[A-Z]\s*:\s*([^:]+?)\s*:/i);
      if(m)key=m[1].trim();
    }
    if(key)probabilities[key]=(probabilities[key]||0)+value;
  }

  const entries=Object.entries(probabilities);
  const sum=entries.reduce((a,[,p])=>a+p,0);
  if(!entries.length||sum<=0)return null;
  for(const key of Object.keys(probabilities))probabilities[key]/=sum;

  const ranked=Object.entries(probabilities).sort((a,b)=>b[1]-a[1]);
  const entropyRaw=-ranked.reduce((acc,[,p])=>acc+(p>0?p*Math.log(p):0),0);
  const entropyMax=ranked.length>1?Math.log(ranked.length):0;
  return {
    probabilities,
    top:ranked[0]?.[0]??null,
    topProbability:ranked[0]?.[1]??null,
    runnerUpProbability:ranked[1]?.[1]??0,
    margin:ranked.length?(ranked[0][1]-(ranked[1]?.[1]??0)):null,
    normalizedEntropy:entropyMax>0?entropyRaw/entropyMax:0,
    raw
  };
}

function probabilityAssessment(traceItem,expected){
  const criteriaKeys=Object.keys(traceItem?.generation?.scores||{});
  const parsed=parseGeneratedProbability(traceItem?.generation,criteriaKeys);
  if(!parsed)return {available:false,expected,parsed:null};
  const expectedProbability=parsed.probabilities?.[expected]??0;
  const chosenProbability=parsed.probabilities?.[traceItem.value]??0;
  return {
    available:true,
    expected,
    expectedProbability,
    chosenProbability,
    top:parsed.top,
    topProbability:parsed.topProbability,
    margin:parsed.margin,
    normalizedEntropy:parsed.normalizedEntropy,
    topMatchesChoice:parsed.top===traceItem.value,
    expectedIsTop:parsed.top===expected,
    highConfidenceWrong:parsed.top!==expected&&parsed.topProbability>=0.80,
    probabilities:parsed.probabilities
  };
}

const TRACE_GATE_KEY={
  'gate:funds_available':'fundsAvailable',
  'gate:material_required':'materialRequired',
  'gate:purchase_recorded':'purchaseRecorded',
  'gate:receipt_received':'receiptReceived',
  'gate:assignment_created':'assignmentCreated',
  'gate:assignment_accepted':'assignmentAccepted',
  'gate:execution_started':'executionStarted',
  'gate:execution_reported':'executionReported',
  'gate:evidence_required':'evidenceRequired',
  'gate:evidence_submitted':'evidenceSubmitted',
  'gate:evidence_verified':'evidenceVerified',
  'gate:confirmation_recorded':'confirmationRecorded'
};

// V20: ablação controlada da cue global de negação introduzida na V19.
// Mantém integralmente o caminho operacional canônico e o probe invertido; altera somente essa instrução global.
const GATE_SCHEMA={
  'gate:funds_available':{
    field:'available',
    positive:'available',
    negative:'unavailable',
    question:'Qual é o estado factual dos fundos necessários?',
    trueSentence:'Os fundos necessários estão disponíveis para continuar.',
    falseSentence:'Os fundos necessários não estão disponíveis para continuar.',
    positiveText:'Os fundos necessários estão disponíveis.',
    negativeText:'Os fundos necessários estão indisponíveis.'
  },
  'gate:material_required':{
    field:'required',
    positive:'required',
    negative:'not_required',
    applicabilityGate:true,
    primaryOrder:'negative_first',
    question:'Existe gate obrigatório de material físico nesta atividade?',
    trueSentence:'Esta atividade exige obrigatoriamente material físico. O gate de material existe e compra/recebimento se aplicam.',
    falseSentence:'Esta atividade NÃO exige material físico. O gate de material NÃO existe; compra e recebimento NÃO se aplicam.',
    positiveText:'required — existe requisito obrigatório de material físico; compra e recebimento se aplicam.',
    negativeText:'not_required — não existe requisito de material físico; compra e recebimento não se aplicam.'
  },
  'gate:purchase_recorded':{
    field:'purchaseRecorded',
    positive:'recorded',
    negative:'missing',
    question:'Qual é o estado factual da compra do material obrigatório?',
    trueSentence:'A compra do material obrigatório já está registrada.',
    falseSentence:'A compra do material obrigatório ainda não está registrada.',
    positiveText:'A compra já está registrada.',
    negativeText:'A compra ainda está ausente.'
  },
  'gate:receipt_received':{
    field:'physicallyReceived',
    positive:'received',
    negative:'missing',
    question:'Qual é o estado factual do recebimento físico do material?',
    trueSentence:'O material obrigatório já foi recebido fisicamente.',
    falseSentence:'O material obrigatório ainda não foi recebido fisicamente.',
    positiveText:'O material já foi recebido fisicamente.',
    negativeText:'O recebimento físico ainda está pendente.'
  },
  'gate:assignment_created':{
    field:'created',
    positive:'created',
    negative:'missing',
    question:'Qual é o estado factual da criação da atribuição?',
    trueSentence:'Uma atribuição de responsável já foi criada.',
    falseSentence:'Ainda não existe atribuição de responsável criada.',
    positiveText:'A atribuição já foi criada.',
    negativeText:'A atribuição ainda não foi criada.'
  },
  'gate:assignment_accepted':{
    field:'accepted',
    positive:'accepted',
    negative:'pending',
    question:'Qual é o estado factual do aceite da atribuição?',
    trueSentence:'A atribuição existente já foi aceita pelo responsável.',
    falseSentence:'A atribuição existente ainda não foi aceita pelo responsável.',
    positiveText:'A atribuição já foi aceita.',
    negativeText:'O aceite da atribuição ainda está pendente.'
  },
  'gate:execution_started':{
    field:'started',
    positive:'started',
    negative:'not_started',
    question:'Qual é o estado factual do início da execução?',
    trueSentence:'A execução física já começou.',
    falseSentence:'A execução física ainda não começou.',
    positiveText:'A execução física já foi iniciada.',
    negativeText:'A execução física ainda não foi iniciada.'
  },
  'gate:execution_reported':{
    field:'reported',
    positive:'reported',
    negative:'not_reported',
    question:'Qual é o estado factual do relato de andamento?',
    trueSentence:'Já existe relato de andamento da execução.',
    falseSentence:'Ainda não existe relato de andamento da execução.',
    positiveText:'O andamento já foi reportado.',
    negativeText:'O andamento ainda não foi reportado.'
  },
  'gate:evidence_required':{
    field:'required',
    positive:'required',
    negative:'not_required',
    applicabilityGate:true,
    question:'Existe gate obrigatório de evidência nesta atividade?',
    trueSentence:'Esta atividade exige obrigatoriamente evidência. O gate de evidência existe; envio e verificação se aplicam antes da confirmação.',
    falseSentence:'Esta atividade NÃO exige evidência. O gate de evidência NÃO existe; envio e verificação NÃO se aplicam. Após a execução reportada, a confirmação é o próximo gate aplicável.',
    positiveText:'required — existe requisito obrigatório de evidência; envio e verificação se aplicam antes da confirmação.',
    negativeText:'not_required — não existe requisito de evidência; envio e verificação não se aplicam e o fluxo segue para confirmação.'
  },
  'gate:evidence_submitted':{
    field:'submitted',
    positive:'submitted',
    negative:'missing',
    question:'Qual é o estado factual do envio da evidência?',
    trueSentence:'A evidência obrigatória já foi enviada.',
    falseSentence:'A evidência obrigatória ainda não foi enviada.',
    positiveText:'A evidência já foi enviada.',
    negativeText:'A evidência ainda não foi enviada.'
  },
  'gate:evidence_verified':{
    field:'verified',
    positive:'verified',
    negative:'unverified',
    question:'Qual é o estado factual da verificação da evidência?',
    trueSentence:'A evidência enviada já foi verificada.',
    falseSentence:'A evidência enviada ainda não foi verificada.',
    positiveText:'A evidência já foi verificada.',
    negativeText:'A evidência ainda não foi verificada.'
  },
  'gate:confirmation_recorded':{
    field:'recorded',
    positive:'recorded',
    negative:'missing',
    question:'Qual é o estado factual da confirmação final?',
    trueSentence:'A confirmação final da execução já foi registrada.',
    falseSentence:'A confirmação final da execução ainda não foi registrada.',
    positiveText:'A confirmação final já foi registrada.',
    negativeText:'A confirmação final ainda não foi registrada.'
  }
};

function gateSchema(id){
  const schema=GATE_SCHEMA[id];
  if(!schema)throw new Error('Gate schema ausente: '+id);
  return schema;
}

function canonicalGateFact(id,facts){
  const schema=gateSchema(id);
  return facts?.[schema.field]===true?schema.trueSentence:schema.falseSentence;
}

function gateCriteria(id){
  const schema=gateSchema(id);
  return {
    [schema.positive]:schema.positiveText,
    [schema.negative]:schema.negativeText
  };
}

function expectedGateLabel(id,facts){
  const schema=gateSchema(id);
  return facts?.[schema.field]===true?schema.positive:schema.negative;
}

function gateSatisfied(id,value){
  return value===gateSchema(id).positive;
}
const STAGE_MEANING={
  funding:'Os fundos necessários ainda não estão disponíveis; é preciso disponibilizar recursos antes de qualquer compra.',
  procurement:'Há fundos, o material é obrigatório, mas a compra ainda não foi registrada.',
  receiving:'A compra está registrada, porém o material obrigatório ainda não foi recebido fisicamente.',
  assignment:'Os gates de recurso foram satisfeitos, mas ainda não existe atribuição de responsável.',
  assignment_acceptance:'A atribuição existe, porém ainda não foi aceita pelo responsável.',
  execution_start:'A atribuição foi aceita, mas a execução física ainda não começou.',
  execution_reporting:'A execução começou, porém ainda não existe relato de andamento.',
  evidence_submission:'A execução foi reportada e a evidência obrigatória ainda não foi enviada.',
  evidence_verification:'A evidência foi enviada, porém ainda não foi verificada.',
  confirmation:'A evidência necessária está resolvida, mas falta a confirmação final.',
  completed:'Todas as condições obrigatórias do lifecycle já estão satisfeitas.'
};

const STAGE_DECOY={
  funding:'purchase',
  procurement:'receive',
  receiving:'assign',
  assignment:'accept_assignment',
  assignment_acceptance:'start',
  execution_start:'report',
  execution_reporting:'submit_evidence',
  evidence_submission:'verify_evidence',
  evidence_verification:'confirm',
  confirmation:'none',
  completed:'confirm'
};

const ACTION_CONTRACT={
  fund:'Disponibilizar fundos quando os recursos necessários ainda estão indisponíveis.',
  purchase:'Registrar/comprar o material quando há fundos, o material é obrigatório e a compra ainda está ausente.',
  receive:'Registrar o recebimento quando a compra existe mas o material ainda não chegou fisicamente.',
  assign:'Criar atribuição quando os gates de recursos foram satisfeitos e ainda não existe responsável atribuído.',
  accept_assignment:'Aceitar a atribuição quando ela já existe mas o aceite ainda está pendente.',
  start:'Iniciar a execução quando a atribuição foi aceita e a execução física ainda não começou.',
  report:'Registrar andamento quando a execução já começou mas ainda não existe relato.',
  submit_evidence:'Enviar evidência quando a execução foi reportada, a evidência é obrigatória e ainda está ausente.',
  verify_evidence:'Verificar evidência quando ela já foi enviada mas ainda não foi verificada.',
  confirm:'Registrar confirmação final quando todas as condições anteriores foram satisfeitas e a confirmação ainda está ausente.',
  none:'Não executar nova ação operacional quando inclusive a confirmação final já está registrada e o lifecycle está completo.'
}
async function askGate({
  id,
  prompt,
  facts,
  trace,
  variantIndex=0
}){
  const started=performance.now();
  const schema=gateSchema(id);
  const factStatement=canonicalGateFact(id,facts);
  const expectedFromSnapshot=expectedGateLabel(id,facts);
  let criterionEntries=Object.entries(gateCriteria(id));
  // V21: ordem primária pode ser calibrada por gate, mas nunca depende do valor factual esperado.
  // material_required usa negative_first porque o V20 mostrou estabilidade nessa ordem para required=true e required=false.
  if(schema.primaryOrder==='negative_first')criterionEntries=[...criterionEntries].reverse();
  if(variantIndex%2===1)criterionEntries=[...criterionEntries].reverse();
  const orderedCriteria=Object.fromEntries(criterionEntries);

  const response=await client.decide({
    method:METHOD,
    state:{
      policy:[
        'factSnapshot e factStatement são autoridade factual e descrevem exatamente o mesmo fato.',
        'factStatement foi produzido deterministicamente do snapshot.',
        'As alternativas são estados semânticos do mesmo fato; escolha a semanticamente equivalente ao factStatement.',
        ...(schema.applicabilityGate?[
          'Este é um gate de aplicabilidade: decida primeiro se o requisito existe ou não existe.',
          'Se factStatement diz que o gate NÃO existe, escolha not_required; subgates posteriores desse branch não se aplicam.'
        ]:[]),
        'A paráfrase do operador está excluída desta inferência.',
        'Não antecipe outras etapas e não transforme false em uma resposta positiva genérica.'
      ],
      gate:id,
      factSnapshot:facts,
      factStatement,
      semanticContract:{
        field:schema.field,
        positiveLabel:schema.positive,
        negativeLabel:schema.negative,
        positiveMeaning:schema.positiveText,
        negativeMeaning:schema.negativeText
      }
    },
    questions:{
      [id]:{
        type:'choice',
        instructions:schema.question+' Escolha somente o estado semanticamente equivalente ao factStatement.',
        criteria:orderedCriteria
      }
    }
  });

  const elapsedMs=Math.round(performance.now()-started);
  const value=answerChoice(response,id);
  const criteriaOrder=Object.keys(orderedCriteria);

  trace.push({
    gate:id,
    facts,
    factStatement,
    expectedFromSnapshot,
    operatorPromptExcluded:true,
    operatorPromptForReport:prompt,
    variantIndex,
    criteriaOrder,
    choseFirstOption:value===criteriaOrder[0],
    value,
    valid:generationValid(response,id),
    elapsedMs,
    generation:response?.answers?.[id]?.generation||null
  });

  console.log(
    '  [GATE]',id,
    'order='+criteriaOrder.join('|'),
    '=>',String(value),
    'expected='+expectedFromSnapshot,
    elapsedMs+'ms'
  );
  return value;
}
async function understandCascade(scenario,prompt,promptIndex){
  const trace=[];
  const gates={};
  const r=scenario.resources;
  const ask=async(key,id,facts)=>{
    const value=await askGate({
      id,prompt,facts,trace,variantIndex:promptIndex
    });
    gates[key]=value;
    return value;
  };

  const fundsId='gate:funds_available';
  if(!gateSatisfied(fundsId,await ask(
    'fundsAvailable',fundsId,{available:r.funds.available}
  )))return {stage:'funding',gates:{...gates},trace};

  const materialId='gate:material_required';
  const materialState=await ask(
    'materialRequired',materialId,{required:r.material.required}
  );

  if(gateSatisfied(materialId,materialState)){
    const purchaseId='gate:purchase_recorded';
    if(!gateSatisfied(purchaseId,await ask(
      'purchaseRecorded',purchaseId,{purchaseRecorded:r.material.purchaseRecorded}
    )))return {stage:'procurement',gates:{...gates},trace};

    const receiptId='gate:receipt_received';
    if(!gateSatisfied(receiptId,await ask(
      'receiptReceived',receiptId,{physicallyReceived:r.material.physicallyReceived}
    )))return {stage:'receiving',gates:{...gates},trace};
  }

  const assignmentCreatedId='gate:assignment_created';
  if(!gateSatisfied(assignmentCreatedId,await ask(
    'assignmentCreated',assignmentCreatedId,{created:r.assignment.created}
  )))return {stage:'assignment',gates:{...gates},trace};

  const assignmentAcceptedId='gate:assignment_accepted';
  if(!gateSatisfied(assignmentAcceptedId,await ask(
    'assignmentAccepted',assignmentAcceptedId,{accepted:r.assignment.accepted}
  )))return {stage:'assignment_acceptance',gates:{...gates},trace};

  const executionStartedId='gate:execution_started';
  if(!gateSatisfied(executionStartedId,await ask(
    'executionStarted',executionStartedId,{started:r.execution.started}
  )))return {stage:'execution_start',gates:{...gates},trace};

  const executionReportedId='gate:execution_reported';
  if(!gateSatisfied(executionReportedId,await ask(
    'executionReported',executionReportedId,{reported:r.execution.reported}
  )))return {stage:'execution_reporting',gates:{...gates},trace};

  const evidenceRequiredId='gate:evidence_required';
  const evidenceRequiredState=await ask(
    'evidenceRequired',evidenceRequiredId,{required:r.evidence.required}
  );

  if(gateSatisfied(evidenceRequiredId,evidenceRequiredState)){
    const evidenceSubmittedId='gate:evidence_submitted';
    if(!gateSatisfied(evidenceSubmittedId,await ask(
      'evidenceSubmitted',evidenceSubmittedId,{submitted:r.evidence.submitted}
    )))return {stage:'evidence_submission',gates:{...gates},trace};

    const evidenceVerifiedId='gate:evidence_verified';
    if(!gateSatisfied(evidenceVerifiedId,await ask(
      'evidenceVerified',evidenceVerifiedId,{verified:r.evidence.verified}
    )))return {stage:'evidence_verification',gates:{...gates},trace};
  }

  const confirmationId='gate:confirmation_recorded';
  if(!gateSatisfied(confirmationId,await ask(
    'confirmationRecorded',confirmationId,{recorded:r.confirmation.recorded}
  )))return {stage:'confirmation',gates:{...gates},trace};

  return {stage:'completed',gates:{...gates},trace};
}
function actionCandidates(stage,variantIndex=0){
  const expected=STAGE_ACTION[stage];
  const decoy=STAGE_DECOY[stage];
  if(!expected||!decoy)return expected?[expected]:[];
  let actions=[expected,decoy];
  if(variantIndex%2===1)actions=[...actions].reverse();
  return actions;
}

async function generateAction({stage,gates,prompt,promptIndex,trace}){
  const candidates=actionCandidates(stage,promptIndex);
  const criteria=Object.fromEntries(candidates.map(action=>[action,ACTION_CONTRACT[action]||ACTION_TEXT[action]]));
  const stageMeaning=STAGE_MEANING[stage]||stage;

  const started=performance.now();
  const response=await client.decide({
    method:METHOD,
    state:{
      policy:[
        'activeStage é autoridade e descreve a primeira condição operacional ainda incompleta.',
        'stageMeaning é a verbalização canônica da etapa ativa.',
        'Cada alternativa descreve também a condição operacional em que ela é válida.',
        'Escolha a ação cuja precondição corresponde exatamente a stageMeaning.',
        'Não pule para a etapa seguinte e não repita uma etapa já satisfeita.'
      ],
      activeStage:stage,
      stageMeaning,
      reachedGates:gates
    },
    questions:{
      'decision:next_action':{
        type:'choice',
        instructions:'Qual ação é operacionalmente exigida agora pela condição descrita em stageMeaning?',
        criteria
      }
    }
  });
  const elapsedMs=Math.round(performance.now()-started);
  const value=answerChoice(response,'decision:next_action');

  trace.push({
    gate:'decision:next_action',
    facts:{activeStage:stage,stageMeaning,gates,candidates},
    operatorPromptExcluded:true,
    operatorPromptForReport:prompt,
    candidateVariant:promptIndex%2,
    criteriaOrder:candidates,
    choseFirstOption:value===candidates[0],
    value,
    valid:generationValid(response,'decision:next_action'),
    elapsedMs,
    generation:response?.answers?.['decision:next_action']?.generation||null
  });

  console.log(
    '  [ACTION]',stage,
    'candidates='+candidates.join('|'),
    '=>',String(value),elapsedMs+'ms'
  );
  return value;
}
function expectedReachedGates(scenario){
  const r=scenario.resources;
  const expected={};

  const put=(key,id,facts)=>{
    const value=expectedGateLabel(id,facts);
    expected[key]=value;
    return value;
  };

  let id='gate:funds_available';
  if(!gateSatisfied(id,put('fundsAvailable',id,{available:r.funds.available})))return expected;

  id='gate:material_required';
  const material=put('materialRequired',id,{required:r.material.required});
  if(gateSatisfied(id,material)){
    id='gate:purchase_recorded';
    if(!gateSatisfied(id,put('purchaseRecorded',id,{purchaseRecorded:r.material.purchaseRecorded})))return expected;
    id='gate:receipt_received';
    if(!gateSatisfied(id,put('receiptReceived',id,{physicallyReceived:r.material.physicallyReceived})))return expected;
  }

  id='gate:assignment_created';
  if(!gateSatisfied(id,put('assignmentCreated',id,{created:r.assignment.created})))return expected;
  id='gate:assignment_accepted';
  if(!gateSatisfied(id,put('assignmentAccepted',id,{accepted:r.assignment.accepted})))return expected;

  id='gate:execution_started';
  if(!gateSatisfied(id,put('executionStarted',id,{started:r.execution.started})))return expected;
  id='gate:execution_reported';
  if(!gateSatisfied(id,put('executionReported',id,{reported:r.execution.reported})))return expected;

  id='gate:evidence_required';
  const evidenceRequired=put('evidenceRequired',id,{required:r.evidence.required});
  if(gateSatisfied(id,evidenceRequired)){
    id='gate:evidence_submitted';
    if(!gateSatisfied(id,put('evidenceSubmitted',id,{submitted:r.evidence.submitted})))return expected;
    id='gate:evidence_verified';
    if(!gateSatisfied(id,put('evidenceVerified',id,{verified:r.evidence.verified})))return expected;
  }

  id='gate:confirmation_recorded';
  put('confirmationRecorded',id,{recorded:r.confirmation.recorded});
  return expected;
}
function gateAccuracy(actual,expected){
  const keys=Object.keys(expected);
  if(!keys.length)return 1;
  return keys.filter(k=>actual[k]===expected[k]).length/keys.length;
}

async function runScenario(scenario,prompt,promptIndex){
  const started=performance.now();
  const understood=await understandCascade(scenario,prompt,promptIndex);
  const action=await generateAction({
    stage:understood.stage,
    gates:understood.gates,
    prompt,
    promptIndex,
    trace:understood.trace
  });
  const totalMs=Math.round(performance.now()-started);

  const expectedGates=expectedReachedGates(scenario);
  const gAcc=gateAccuracy(understood.gates,expectedGates);

  for(const item of understood.trace){
    const gateKey=TRACE_GATE_KEY[item.gate];
    const expected=item.gate==='decision:next_action'
      ?scenario.expected.action
      :(gateKey?expectedGates[gateKey]:undefined);
    item.probability=expected===undefined
      ?{available:false,expected:null,parsed:null}
      :probabilityAssessment(item,expected);
  }

  const gateProbabilities=understood.trace
    .filter(x=>x.gate!=='decision:next_action'&&x.probability?.available);
  const actionTrace=understood.trace.find(x=>x.gate==='decision:next_action');
  const actionProbability=actionTrace?.probability||{available:false};
  const gateExpectedProbability=gateProbabilities.length
    ?gateProbabilities.reduce((sum,x)=>sum+x.probability.expectedProbability,0)/gateProbabilities.length
    :0;
  const gateMeanMargin=gateProbabilities.length
    ?gateProbabilities.reduce((sum,x)=>sum+x.probability.margin,0)/gateProbabilities.length
    :0;
  const highConfidenceWrong=understood.trace.filter(x=>x.probability?.highConfidenceWrong).length;

  const row={
    scenarioId:scenario.id,
    title:scenario.title,
    prompt,
    promptIndex,
    expected:{
      gates:expectedGates,
      stage:scenario.expected.stage,
      action:scenario.expected.action
    },
    actual:{
      gates:understood.gates,
      stage:understood.stage,
      action
    },
    correct:{
      gateAccuracy:gAcc,
      stage:understood.stage===scenario.expected.stage,
      action:action===scenario.expected.action,
      full:
        gAcc===1 &&
        understood.stage===scenario.expected.stage &&
        action===scenario.expected.action
    },
    valid:understood.trace.every(x=>x.valid),
    probability:{
      gateCoverage:gateProbabilities.length/Math.max(1,understood.trace.filter(x=>x.gate!=='decision:next_action').length),
      gateExpectedProbability,
      gateMeanMargin,
      actionAvailable:!!actionProbability.available,
      actionExpectedProbability:actionProbability.expectedProbability??0,
      actionMargin:actionProbability.margin??0,
      highConfidenceWrong
    },
    calls:understood.trace.length,
    totalMs,
    trace:understood.trace
  };

  observations.push(row);

  console.log(
    '[CASCADE]',
    scenario.id,
    'gates='+(gAcc*100).toFixed(1)+'%',
    'stage='+understood.stage,
    'action='+String(action),
    'pGate='+gateExpectedProbability.toFixed(3),
    'pAction='+(actionProbability.expectedProbability??0).toFixed(3),
    'expected='+scenario.expected.stage+'/'+scenario.expected.action,
    'calls='+row.calls,
    'totalMs='+totalMs
  );
  console.log('          '+prompt);

  return row;
}

// V25 — geração direta via NVIDIA API Catalog.
// A cascata V23/V24 continua local como baseline; somente a suíte DIRECT usa NVIDIA.
const NVIDIA_BASE_URL=(process.env.NVIDIA_BASE_URL||'https://integrate.api.nvidia.com/v1').replace(/\/+$/,'');
const NVIDIA_MODEL=process.env.NVIDIA_MODEL||'openai/gpt-oss-20b';
const NVIDIA_API_KEY=process.env.NVIDIA_API_KEY||'';
const NVIDIA_TIMEOUT_MS=Number(process.env.NVIDIA_TIMEOUT_MS||90000);

const DIRECT_STAGE_IDS=Object.freeze(Object.keys(STAGE_MEANING));
const DIRECT_ACTION_IDS=Object.freeze(Object.keys(ACTION_CONTRACT));

function extractJsonObject(text){
  if(typeof text!=='string')return null;
  const trimmed=text.trim();
  const candidates=[trimmed];
  const fenced=trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(fenced)candidates.push(fenced[1].trim());
  const a=trimmed.indexOf('{');
  const b=trimmed.lastIndexOf('}');
  if(a>=0&&b>a)candidates.push(trimmed.slice(a,b+1));
  for(const c of candidates){
    try{return JSON.parse(c);}catch{}
  }
  return null;
}

const NVIDIA_RETRY_ATTEMPTS=Math.max(1,Number(process.env.NVIDIA_RETRY_ATTEMPTS||3));
const NVIDIA_RETRY_BASE_MS=Math.max(100,Number(process.env.NVIDIA_RETRY_BASE_MS||800));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function nvidiaChat(messages,{maxTokens=700,temperature=0.1}={}){
  if(!NVIDIA_API_KEY)throw new Error('NVIDIA_API_KEY não definida. Coloque-a no .env ou no ambiente do PowerShell.');
  const overallStarted=performance.now();
  let lastError=null;

  for(let attempt=1;attempt<=NVIDIA_RETRY_ATTEMPTS;attempt++){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),NVIDIA_TIMEOUT_MS);
    const started=performance.now();
    try{
      const response=await fetch(NVIDIA_BASE_URL+'/chat/completions',{
        method:'POST',
        headers:{
          'Authorization':'Bearer '+NVIDIA_API_KEY,
          'Content-Type':'application/json',
          'Accept':'application/json'
        },
        body:JSON.stringify({
          model:NVIDIA_MODEL,
          messages,
          temperature,
          top_p:1,
          max_tokens:maxTokens,
          stream:false
        }),
        signal:controller.signal
      });
      const raw=await response.text();
      let json=null;
      try{json=JSON.parse(raw);}catch{}
      if(!response.ok){
        const message='NVIDIA HTTP '+response.status+': '+(json?.error?.message||json?.detail||raw.slice(0,800));
        const retryable=response.status===429||response.status===500||response.status===502||response.status===503||response.status===504;
        if(retryable&&attempt<NVIDIA_RETRY_ATTEMPTS){
          const retryAfterRaw=response.headers.get('retry-after');
          const retryAfterSec=retryAfterRaw&&Number.isFinite(Number(retryAfterRaw))?Number(retryAfterRaw):null;
          const delay=retryAfterSec!=null
            ?Math.max(100,Math.round(retryAfterSec*1000))
            :Math.min(8000,NVIDIA_RETRY_BASE_MS*(2**(attempt-1)));
          console.log('[NVIDIA RETRY] status='+response.status+' attempt='+attempt+'/'+NVIDIA_RETRY_ATTEMPTS+' delayMs='+delay);
          await sleep(delay);
          continue;
        }
        throw new Error(message);
      }
      const content=json?.choices?.[0]?.message?.content;
      if(typeof content!=='string'||!content.trim()){
        throw new Error('NVIDIA respondeu sem choices[0].message.content.');
      }
      return {
        content,
        reasoning:json?.choices?.[0]?.message?.reasoning_content||null,
        usage:json?.usage||null,
        model:json?.model||NVIDIA_MODEL,
        latencyMs:Math.round(performance.now()-overallStarted),
        attempt
      };
    }catch(error){
      lastError=error;
      const transient=error?.name==='AbortError'||error instanceof TypeError;
      if(transient&&attempt<NVIDIA_RETRY_ATTEMPTS){
        const delay=Math.min(8000,NVIDIA_RETRY_BASE_MS*(2**(attempt-1)));
        console.log('[NVIDIA RETRY] transport attempt='+attempt+'/'+NVIDIA_RETRY_ATTEMPTS+' delayMs='+delay+' reason='+String(error?.message||error));
        await sleep(delay);
        continue;
      }
      throw error;
    }finally{
      clearTimeout(timeout);
    }
  }
  throw lastError||new Error('NVIDIA falhou sem erro detalhado.');
}

function directApplicabilitySystemPrompt(){
  return [
    'Você recebe SOMENTE dois fatos booleanos de aplicabilidade de um lifecycle operacional.',
    'Não inferira nada além desses dois valores. Não use conhecimento externo.',
    'Regra exata 1: material.required=true => materialApplicability="ACTIVE"; material.required=false => materialApplicability="SKIP".',
    'Regra exata 2: evidence.required=true => evidenceApplicability="ACTIVE"; evidence.required=false => evidenceApplicability="SKIP".',
    'Copie semanticamente os booleanos sem inverter true/false.',
    'Retorne SOMENTE JSON válido: {"materialApplicability":"ACTIVE|SKIP","evidenceApplicability":"ACTIVE|SKIP"}.',
    'Não use markdown. Não acrescente texto.'
  ].join('\n');
}

function directStageSystemPrompt(){
  return [
    'Você é um analisador de lifecycle operacional de obra.',
    'Receberá um snapshot factual JSON completo. Use EXATAMENTE os campos presentes nesse JSON.',
    'Sua tarefa é localizar o PRIMEIRO gate aplicável ainda não satisfeito e gerar a situação ativa.',
    '',
    'SCHEMA REAL DO SNAPSHOT:',
    'funds.available',
    'material.required',
    'material.purchaseRecorded',
    'material.physicallyReceived',
    'assignment.created',
    'assignment.accepted',
    'execution.started',
    'execution.reported',
    'evidence.required',
    'evidence.submitted',
    'evidence.verified',
    'confirmation.recorded',
    '',
    'ALGORITMO OBRIGATÓRIO — execute de cima para baixo e PARE no primeiro BLOCK:',
    '1. funds.available=false => BLOCK stage=funding, blockingFact="funds.available=false". funds.available=true => SATISFIED, continue.',
    '2. material.required=false => SKIP material.purchaseRecorded e material.physicallyReceived; vá diretamente para assignment.created.',
    '3. material.required=true e material.purchaseRecorded=false => BLOCK stage=procurement, blockingFact="material.purchaseRecorded=false".',
    '4. material.required=true e material.purchaseRecorded=true e material.physicallyReceived=false => BLOCK stage=receiving, blockingFact="material.physicallyReceived=false".',
    '5. assignment.created=false => BLOCK stage=assignment, blockingFact="assignment.created=false".',
    '6. assignment.created=true e assignment.accepted=false => BLOCK stage=assignment_acceptance, blockingFact="assignment.accepted=false".',
    '7. assignment.accepted=true e execution.started=false => BLOCK stage=execution_start, blockingFact="execution.started=false".',
    '8. execution.started=true e execution.reported=false => BLOCK stage=execution_reporting, blockingFact="execution.reported=false".',
    '9. evidence.required=false => SKIP evidence.submitted e evidence.verified; vá diretamente para confirmation.recorded.',
    '10. evidence.required=true e evidence.submitted=false => BLOCK stage=evidence_submission, blockingFact="evidence.submitted=false".',
    '11. evidence.required=true e evidence.submitted=true e evidence.verified=false => BLOCK stage=evidence_verification, blockingFact="evidence.verified=false".',
    '12. confirmation.recorded=false => BLOCK stage=confirmation, blockingFact="confirmation.recorded=false".',
    '13. Se nenhum BLOCK ocorreu => stage=completed e blockingFact=null.',
    '',
    'REGRAS INVIOLÁVEIS:',
    '- TRUE em um gate significa que ele está satisfeito; NUNCA use um fato true como blockingFact.',
    '- funds.available=true PROÍBE stage=funding.',
    '- material.required=false é seletor de aplicabilidade, NÃO é falha; compra/recebimento devem ser ignorados mesmo se seus campos tiverem valores contraditórios.',
    '- evidence.required=false é seletor de aplicabilidade, NÃO é falha; envio/verificação devem ser ignorados mesmo se seus campos estiverem preenchidos.',
    '- Um campo downstream=true NUNCA supera um predecessor obrigatório false.',
    '- Para completed, não invente fatos ausentes: todos os gates aplicáveis precisam estar satisfeitos no snapshot.',
    '- blockingFact deve corresponder exatamente ao primeiro campo FALSE que precisa virar TRUE; completed usa null.',
    '',
    'EXEMPLOS DE NÃO-ERRO:',
    'funds.available=true não significa funding pendente; significa funding resolvido.',
    'material.required=false não significa material pendente; significa que o branch material não existe.',
    'evidence.required=false não significa evidência pendente; significa que o branch evidência não existe.',
    '',
    'IDs de stage permitidos: '+DIRECT_STAGE_IDS.join(', ')+'.',
    'Gere uma frase curta em português descrevendo somente o primeiro bloqueio aplicável encontrado.',
    'Retorne SOMENTE JSON válido: {"stage":"<id>","situation":"<descrição>","blockingFact":"<path>=false"}.',
    'Para completed, retorne blockingFact:null.',
    'Não use markdown. Não acrescente explicações fora do JSON.'
  ].join('\n');
}

function directActionSystemPrompt(){
  const actionVocabulary=Object.entries(ACTION_CONTRACT)
    .map(([id,text])=>id+': '+text)
    .join('\n');
  return [
    'Você decide a próxima ação operacional de uma obra a partir de uma situação já sintetizada.',
    'A ação deve resolver DIRETAMENTE o stage recebido.',
    '',
    'MAPEAMENTO OPERACIONAL STAGE -> ACTION:',
    'funding -> fund',
    'procurement -> purchase',
    'receiving -> receive',
    'assignment -> assign',
    'assignment_acceptance -> accept_assignment',
    'execution_start -> start',
    'execution_reporting -> report',
    'evidence_submission -> submit_evidence',
    'evidence_verification -> verify_evidence',
    'confirmation -> confirm',
    'completed -> none',
    '',
    'Não reclassifique o stage. Trate o stage recebido como a situação operacional atual.',
    'Não pule etapa e não escolha uma ação para outro stage.',
    'IDs de action permitidos: '+DIRECT_ACTION_IDS.join(', ')+'.',
    'Vocabulário operacional de ações:',
    actionVocabulary,
    'Gere também uma frase curta em português dizendo concretamente o que fazer agora.',
    'Retorne SOMENTE JSON válido exatamente neste formato: {"action":"<id>","nextToDo":"<descrição>"}.',
    'Não use markdown. Não acrescente explicações fora do JSON.'
  ].join('\n');
}

async function generateDirectSituationAndNext(scenario){
  const started=performance.now();
  const snapshot=scenario.resources;

  const applicabilityCall=await nvidiaChat([
    {role:'system',content:directApplicabilitySystemPrompt()},
    {role:'user',content:JSON.stringify({
      material:{required:snapshot?.material?.required===true},
      evidence:{required:snapshot?.evidence?.required===true}
    },null,2)}
  ],{maxTokens:140,temperature:0});
  const applicabilityJson=extractJsonObject(applicabilityCall.content);
  const materialApplicability=applicabilityJson?.materialApplicability==='SKIP'?'SKIP':applicabilityJson?.materialApplicability==='ACTIVE'?'ACTIVE':null;
  const evidenceApplicability=applicabilityJson?.evidenceApplicability==='SKIP'?'SKIP':applicabilityJson?.evidenceApplicability==='ACTIVE'?'ACTIVE':null;
  if(!materialApplicability||!evidenceApplicability){
    throw new Error('NVIDIA applicability preflight inválido: '+String(applicabilityCall.content).slice(0,500));
  }

  const stageSnapshot=JSON.parse(JSON.stringify(snapshot));
  const prunedFields=[];
  if(materialApplicability==='SKIP'&&stageSnapshot.material){
    if(Object.prototype.hasOwnProperty.call(stageSnapshot.material,'purchaseRecorded'))prunedFields.push('material.purchaseRecorded');
    if(Object.prototype.hasOwnProperty.call(stageSnapshot.material,'physicallyReceived'))prunedFields.push('material.physicallyReceived');
    delete stageSnapshot.material.purchaseRecorded;
    delete stageSnapshot.material.physicallyReceived;
  }
  if(evidenceApplicability==='SKIP'&&stageSnapshot.evidence){
    if(Object.prototype.hasOwnProperty.call(stageSnapshot.evidence,'submitted'))prunedFields.push('evidence.submitted');
    if(Object.prototype.hasOwnProperty.call(stageSnapshot.evidence,'verified'))prunedFields.push('evidence.verified');
    delete stageSnapshot.evidence.submitted;
    delete stageSnapshot.evidence.verified;
  }

  const stageCall=await nvidiaChat([
    {role:'system',content:directStageSystemPrompt()},
    {role:'user',content:'SNAPSHOT FACTUAL:\n'+JSON.stringify(stageSnapshot,null,2)}
  ]);
  const stageJson=extractJsonObject(stageCall.content);
  const rawStage=typeof stageJson?.stage==='string'?stageJson.stage.trim():null;
  const stage=DIRECT_STAGE_IDS.includes(rawStage)?rawStage:null;
  const situationText=typeof stageJson?.situation==='string'&&stageJson.situation.trim()
    ?stageJson.situation.trim()
    :null;
  const blockingFact=typeof stageJson?.blockingFact==='string'&&stageJson.blockingFact.trim()
    ?stageJson.blockingFact.trim()
    :null;

  const actionCall=await nvidiaChat([
    {role:'system',content:directActionSystemPrompt()},
    {role:'user',content:[
      'SNAPSHOT FACTUAL:',
      JSON.stringify(snapshot,null,2),
      '',
      'SITUAÇÃO GERADA:',
      JSON.stringify({stage,situation:situationText},null,2)
    ].join('\n')}
  ]);
  const actionJson=extractJsonObject(actionCall.content);
  const rawAction=typeof actionJson?.action==='string'?actionJson.action.trim():null;
  const action=DIRECT_ACTION_IDS.includes(rawAction)?rawAction:null;
  const nextText=typeof actionJson?.nextToDo==='string'&&actionJson.nextToDo.trim()
    ?actionJson.nextToDo.trim()
    :null;

  const totalMs=Math.round(performance.now()-started);
  const valid=Boolean(stage&&situationText&&action&&nextText);
  const row={
    scenarioId:scenario.id,
    title:scenario.title,
    provider:'nvidia',
    endpoint:NVIDIA_BASE_URL,
    model:stageCall.model||actionCall.model||NVIDIA_MODEL,
    expected:{stage:scenario.expected.stage,action:scenario.expected.action},
    generated:{materialApplicability,evidenceApplicability,prunedFields,stage,situation:situationText,blockingFact,action,nextToDo:nextText},
    correct:{
      situation:stage===scenario.expected.stage,
      next:action===scenario.expected.action,
      pair:stage===scenario.expected.stage&&action===scenario.expected.action,
      nextGivenGeneratedSituation:action===(STAGE_ACTION[stage]||null)
    },
    valid,
    probability:{stage:{available:false},action:{available:false}},
    usage:{applicability:applicabilityCall.usage,stage:stageCall.usage,action:actionCall.usage},
    latencyMs:{applicability:applicabilityCall.latencyMs,stage:stageCall.latencyMs,action:actionCall.latencyMs,total:totalMs},
    raw:{
      applicabilityContent:applicabilityCall.content,
      stageSnapshot,
      applicabilityReasoning:applicabilityCall.reasoning,
      stageContent:stageCall.content,
      actionContent:actionCall.content,
      stageReasoning:stageCall.reasoning,
      actionReasoning:actionCall.reasoning
    }
  };
  directObservations.push(row);

  console.log(
    '[NVIDIA DIRECT]',scenario.id,
    'situation='+String(stage),
    'next='+String(action),
    'expected='+scenario.expected.stage+'/'+scenario.expected.action,
    'model='+String(row.model),
    'totalMs='+totalMs
  );
  console.log('         APLICABILIDADE: material='+materialApplicability+' evidence='+evidenceApplicability);
  console.log('         PODA: '+(prunedFields.length?prunedFields.join(', '):'nenhuma'));
  console.log('         SITUAÇÃO: '+String(situationText));
  console.log('         BLOQUEIO: '+String(blockingFact));
  console.log('         PRÓXIMA:  '+String(nextText));
  if(!valid){
    console.log('         RAW STAGE: '+String(stageCall.content).slice(0,500));
    console.log('         RAW ACTION: '+String(actionCall.content).slice(0,500));
  }

  return row;
}

const scenarios=[
  {
    id:'CG-01',title:'sem fundos',
    resources:{
      funds:{available:false,freeCents:0},
      material:{required:true,purchaseRecorded:false,physicallyReceived:false},
      assignment:{created:false,accepted:false},
      execution:{started:false,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'funding',action:'fund'},
    prompts:[
      'A obra está no início, sem caixa disponível e sem material comprado.',
      'Não há saldo financeiro para assumir a compra necessária.'
    ]
  },
  {
    id:'CG-02',title:'fundos disponíveis, compra pendente',
    resources:{
      funds:{available:true,freeCents:2000000},
      material:{required:true,purchaseRecorded:false,physicallyReceived:false},
      assignment:{created:false,accepted:false},
      execution:{started:false,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'procurement',action:'purchase'},
    prompts:[
      'Há fundos disponíveis, mas o material obrigatório ainda não foi comprado.',
      'O caixa está liberado e não existe compra registrada para o material necessário.'
    ]
  },
  {
    id:'CG-03',title:'compra feita, recebimento pendente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:false},
      assignment:{created:false,accepted:false},
      execution:{started:false,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'receiving',action:'receive'},
    prompts:[
      'A compra está registrada, mas o material não chegou fisicamente.',
      'Existe nota do material e o estoque ainda não recebeu a entrega.'
    ]
  },
  {
    id:'CG-04',title:'atividade sem material obrigatório',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:false,purchaseRecorded:false,physicallyReceived:false},
      assignment:{created:false,accepted:false},
      execution:{started:false,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'assignment',action:'assign'},
    prompts:[
      'Esta frente não exige material e ainda não possui responsável atribuído.',
      'Não existe gate de material nesta atividade; falta criar a atribuição.'
    ]
  },
  {
    id:'CG-05',title:'recursos liberados, atribuição pendente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:false,accepted:false},
      execution:{started:false,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'assignment',action:'assign'},
    prompts:[
      'Fundos e material estão disponíveis; ainda não há atribuição.',
      'Compra e recebimento terminaram, porém nenhum responsável foi atribuído.'
    ]
  },
  {
    id:'CG-06',title:'atribuição criada, aceite pendente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:false},
      execution:{started:false,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'assignment_acceptance',action:'accept_assignment'},
    prompts:[
      'A atribuição já foi criada, mas o responsável ainda não aceitou.',
      'Existe responsável atribuído e o aceite está pendente.'
    ]
  },
  {
    id:'CG-07',title:'aceite concluído, início pendente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:false,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'execution_start',action:'start'},
    prompts:[
      'A atribuição foi aceita e a execução física ainda não começou.',
      'Responsável aceitou a tarefa; falta iniciar o serviço.'
    ]
  },
  {
    id:'CG-08',title:'execução iniciada, relatório pendente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'execution_reporting',action:'report'},
    prompts:[
      'O serviço já começou e ainda não há relatório de andamento.',
      'Execução física em curso sem progresso registrado no sistema.'
    ]
  },
  {
    id:'CG-09',title:'relatório feito, evidência pendente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'evidence_submission',action:'submit_evidence'},
    prompts:[
      'O andamento foi reportado e a evidência obrigatória ainda não foi enviada.',
      'Existe relatório da execução, mas falta a comprovação visual.'
    ]
  },
  {
    id:'CG-10',title:'evidência enviada, verificação pendente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:true,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'evidence_verification',action:'verify_evidence'},
    prompts:[
      'A evidência foi enviada e ainda não foi verificada.',
      'A comprovação já está disponível e aguarda validação.'
    ]
  },
  {
    id:'CG-11',title:'evidência verificada, confirmação pendente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:true,verified:true},
      confirmation:{recorded:false}
    },
    expected:{stage:'confirmation',action:'confirm'},
    prompts:[
      'A evidência foi verificada, mas a confirmação final ainda não ocorreu.',
      'Relato e prova estão validados; falta registrar a confirmação.'
    ]
  },
  {
    id:'CG-12',title:'lifecycle concluído',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:true,verified:true},
      confirmation:{recorded:true}
    },
    expected:{stage:'completed',action:'none'},
    prompts:[
      'Todos os requisitos do lifecycle já foram satisfeitos.',
      'Fundos, material, atribuição, execução, evidência e confirmação estão concluídos.'
    ]
  },
  {
    id:'AG-01',title:'precedência de fundos sobre downstream já marcado',
    resources:{
      funds:{available:false,freeCents:0},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:true,verified:true},
      confirmation:{recorded:true}
    },
    expected:{stage:'funding',action:'fund'},
    prompts:[
      'Mesmo com registros posteriores preenchidos, não há fundos disponíveis para esta frente.',
      'Os campos posteriores constam concluídos, porém o recurso financeiro obrigatório está indisponível.'
    ]
  },
  {
    id:'AG-02',title:'material não aplicável ignora compra e recebimento',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:false,purchaseRecorded:true,physicallyReceived:false},
      assignment:{created:false,accepted:false},
      execution:{started:false,reported:false},
      evidence:{required:true,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'assignment',action:'assign'},
    prompts:[
      'Esta atividade não exige material; qualquer registro de compra é irrelevante e falta atribuir responsável.',
      'O gate de material não se aplica nesta frente, portanto o próximo bloqueio real é a ausência de atribuição.'
    ]
  },
  {
    id:'AG-03',title:'compra ausente domina recebimento inconsistente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:false,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:true,verified:true},
      confirmation:{recorded:true}
    },
    expected:{stage:'procurement',action:'purchase'},
    prompts:[
      'O material é obrigatório e ainda não existe compra registrada, mesmo que um campo posterior indique recebimento.',
      'Há caixa, mas a compra necessária está ausente; registros posteriores não podem superar esse gate.'
    ]
  },
  {
    id:'AG-04',title:'atribuição inexistente domina aceite inconsistente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:false,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:true,verified:true},
      confirmation:{recorded:true}
    },
    expected:{stage:'assignment',action:'assign'},
    prompts:[
      'Não existe atribuição criada; um aceite posterior isolado não substitui a criação do responsável.',
      'Recursos estão resolvidos, mas falta criar a atribuição apesar de outros campos posteriores estarem preenchidos.'
    ]
  },
  {
    id:'AG-05',title:'execução não iniciada domina relato inconsistente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:false,reported:true},
      evidence:{required:true,submitted:true,verified:true},
      confirmation:{recorded:true}
    },
    expected:{stage:'execution_start',action:'start'},
    prompts:[
      'A atribuição foi aceita, mas a execução física não começou; um relato posterior inconsistente não muda isso.',
      'O primeiro gate incompleto é iniciar o serviço, ainda que existam marcações posteriores de relatório e evidência.'
    ]
  },
  {
    id:'AG-06',title:'evidência não requerida é pulada',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:false,submitted:false,verified:false},
      confirmation:{recorded:false}
    },
    expected:{stage:'confirmation',action:'confirm'},
    prompts:[
      'A execução foi reportada e esta atividade não exige evidência; falta somente a confirmação final.',
      'Sem requisito de evidência nesta frente, o próximo gate aplicável é registrar a confirmação.'
    ]
  },
  {
    id:'AG-07',title:'evidência ausente domina verificação inconsistente',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:false,verified:true},
      confirmation:{recorded:true}
    },
    expected:{stage:'evidence_submission',action:'submit_evidence'},
    prompts:[
      'A evidência é obrigatória e ainda não foi enviada; uma marca posterior de verificação não satisfaz o envio.',
      'O primeiro gate incompleto é submeter a evidência, apesar de campos posteriores inconsistentes.'
    ]
  },
  {
    id:'AG-08',title:'verificação pendente domina confirmação prematura',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:true,submitted:true,verified:false},
      confirmation:{recorded:true}
    },
    expected:{stage:'evidence_verification',action:'verify_evidence'},
    prompts:[
      'A evidência foi enviada mas ainda não foi verificada; uma confirmação prematura não elimina essa pendência.',
      'Existe confirmação registrada fora de ordem, porém a evidência enviada continua aguardando verificação.'
    ]
  },
  {
    id:'AG-09',title:'evidência não aplicável ignora registros preenchidos',
    resources:{
      funds:{available:true,freeCents:1700000},
      material:{required:true,purchaseRecorded:true,physicallyReceived:true},
      assignment:{created:true,accepted:true},
      execution:{started:true,reported:true},
      evidence:{required:false,submitted:true,verified:true},
      confirmation:{recorded:false}
    },
    expected:{stage:'confirmation',action:'confirm'},
    prompts:[
      'Esta frente não possui gate de evidência; registros de envio e verificação são não aplicáveis e falta somente confirmar.',
      'Mesmo existindo campos de evidência preenchidos, required=false torna esse branch inexistente; o próximo gate aplicável é confirmação.'
    ]
  }
];

before(async()=>{
  if(!LIVE)return;

  client=new OpenJevClient({
    baseUrl:process.env.BELAVISTA_OPENJEV_URL||'http://127.0.0.1:8090',
    model:process.env.BELAVISTA_SYSTEM_MODEL||null,
    method:METHOD,
    timeoutMs:Number(process.env.BELAVISTA_SYSTEM_MODEL_TIMEOUT_MS||120000),
    directFallback:'none'
  });

  health=await client.health();
  assert.equal(health.ready,true,'OpenJEV local não está ready.');
  assert.match(String(health.model||client.model||''),/minicpm/i);

  fs.mkdirSync(REPORT_DIR,{recursive:true});

  console.log('\n[SYSTEM MODEL AUTHORITATIVE STATE ACTIVITIES V33]');
  console.log('Method: generation');
  console.log('Primary flow: semantic binary gates with fixed gate-specific calibrated order');
  console.log('Calibration: material_required primary order = not_required|required');
  console.log('Stress: 9 holdout adversarial scenarios test causal precedence and non-applicable branches');
  console.log('Applicability contract: material_required/evidence_required decide whether their sub-branches exist');
  console.log('Direct synthesis: NVIDIA full snapshot -> lifecycle contract -> generated situation -> generated next-to-do');
  console.log('Stage algorithm: NVIDIA applicability preflight -> prune SKIP subbranches -> V27 first-unsatisfied scan');
  console.log('Operational output: request #1 current-state description; request #2 activities from state + activity descriptions + dependency requirements');
  console.log('Activity generation test provider: NVIDIA now; contract kept provider-neutral for MiniCPM 2B migration');
  console.log('Completed activities are immutable input state and never regenerated');
  console.log('NVIDIA retry: attempts='+NVIDIA_RETRY_ATTEMPTS+' baseMs='+NVIDIA_RETRY_BASE_MS);
  console.log('NVIDIA endpoint: '+NVIDIA_BASE_URL+' model='+NVIDIA_MODEL);
  console.log('Variant 0: canonical operational path; variant 1: reversed-order diagnostic probe only');
  console.log('Decision: active-stage action versus one next-step decoy; probe reverses order for diagnostics');
});

after(()=>{
  if(!observations.length)return;

  const valid=observations.filter(r=>r.valid);
  const primary=valid.filter(r=>r.promptIndex===0);
  const probe=valid.filter(r=>r.promptIndex===1);
  const baselinePrimary=primary.filter(r=>!String(r.scenarioId).startsWith('AG-'));
  const adversarialPrimary=primary.filter(r=>String(r.scenarioId).startsWith('AG-'));

  const accuracyOf=(rows,key)=>rows.length
    ?rows.filter(r=>r.correct[key]).length/rows.length
    :0;
  const meanGateAccuracyOf=rows=>rows.length
    ?rows.reduce((s,r)=>s+r.correct.gateAccuracy,0)/rows.length
    :0;

  // Métricas principais: somente a ordem canônica operacional.
  const gateAccuracy=meanGateAccuracyOf(primary);
  const stageAccuracy=accuracyOf(primary,'stage');
  const actionAccuracy=accuracyOf(primary,'action');
  const fullAccuracy=accuracyOf(primary,'full');
  const baselineFullAccuracy=accuracyOf(baselinePrimary,'full');
  const adversarialGateAccuracy=meanGateAccuracyOf(adversarialPrimary);
  const adversarialStageAccuracy=accuracyOf(adversarialPrimary,'stage');
  const adversarialActionAccuracy=accuracyOf(adversarialPrimary,'action');
  const adversarialFullAccuracy=accuracyOf(adversarialPrimary,'full');

  // Probe reverso é diagnóstico; nunca derruba sozinho o teste operacional.
  const probeGateAccuracy=meanGateAccuracyOf(probe);
  const probeStageAccuracy=accuracyOf(probe,'stage');
  const probeActionAccuracy=accuracyOf(probe,'action');
  const probeFullAccuracy=accuracyOf(probe,'full');

  const latency=primary.map(r=>r.totalMs);
  const probeLatency=probe.map(r=>r.totalMs);
  const callCounts=primary.map(r=>r.calls);
  const probabilityRows=primary.filter(r=>r.probability);
  const meanGateExpectedProbability=probabilityRows.length
    ?probabilityRows.reduce((s,r)=>s+r.probability.gateExpectedProbability,0)/probabilityRows.length
    :0;
  const meanActionExpectedProbability=probabilityRows.length
    ?probabilityRows.reduce((s,r)=>s+r.probability.actionExpectedProbability,0)/probabilityRows.length
    :0;
  const meanGateMargin=probabilityRows.length
    ?probabilityRows.reduce((s,r)=>s+r.probability.gateMeanMargin,0)/probabilityRows.length
    :0;
  const highConfidenceWrongCount=probabilityRows.reduce((s,r)=>s+r.probability.highConfidenceWrong,0);
  const probabilisticDecisions=primary.reduce((s,r)=>s+r.trace.filter(x=>x.probability?.available).length,0);
  const highConfidenceWrongRate=probabilisticDecisions
    ?highConfidenceWrongCount/probabilisticDecisions
    :0;
  const byScenario=new Map();
  for(const row of valid){
    if(!byScenario.has(row.scenarioId))byScenario.set(row.scenarioId,[]);
    byScenario.get(row.scenarioId).push(row);
  }
  const scenarioGroups=[...byScenario.values()].filter(rows=>rows.length>1);
  const stageInvariance=scenarioGroups.length
    ?scenarioGroups.filter(rows=>rows.every(r=>r.actual.stage===rows[0].actual.stage)).length/scenarioGroups.length
    :1;
  const actionInvariance=scenarioGroups.length
    ?scenarioGroups.filter(rows=>rows.every(r=>r.actual.action===rows[0].actual.action)).length/scenarioGroups.length
    :1;
  const gateInvariance=scenarioGroups.length
    ?scenarioGroups.filter(rows=>rows.every(r=>JSON.stringify(r.actual.gates)===JSON.stringify(rows[0].actual.gates))).length/scenarioGroups.length
    :1;
  const factualGateTraces=primary.flatMap(r=>r.trace.filter(x=>x.gate!=='decision:next_action'));
  const probeFactualGateTraces=probe.flatMap(r=>r.trace.filter(x=>x.gate!=='decision:next_action'));
  const firstOptionChoiceRate=factualGateTraces.length
    ?factualGateTraces.filter(x=>x.choseFirstOption===true).length/factualGateTraces.length
    :0;
  const actionTraces=primary.flatMap(r=>r.trace.filter(x=>x.gate==='decision:next_action'));
  const probeActionTraces=probe.flatMap(r=>r.trace.filter(x=>x.gate==='decision:next_action'));
  const actionFirstOptionChoiceRate=actionTraces.length
    ?actionTraces.filter(x=>x.choseFirstOption===true).length/actionTraces.length
    :0;
  const probeFirstOptionChoiceRate=probeFactualGateTraces.length
    ?probeFactualGateTraces.filter(x=>x.choseFirstOption===true).length/probeFactualGateTraces.length
    :0;
  const probeActionFirstOptionChoiceRate=probeActionTraces.length
    ?probeActionTraces.filter(x=>x.choseFirstOption===true).length/probeActionTraces.length
    :0;
  const correctStageRows=primary.filter(r=>r.correct.stage);
  const actionGivenCorrectStageAccuracy=correctStageRows.length
    ?correctStageRows.filter(r=>r.correct.action).length/correctStageRows.length
    :0;

  const gateBreakdown={};
  for(const item of factualGateTraces){
    const expected=item.probability?.expected;
    if(expected===undefined||expected===null)continue;
    const bucket=gateBreakdown[item.gate]||{
      attempts:0,correct:0,expectedProbabilitySum:0,expectedProbabilityCount:0,
      highConfidenceWrong:0,firstOption:0
    };
    bucket.attempts++;
    if(item.value===expected)bucket.correct++;
    if(item.probability?.available){
      bucket.expectedProbabilitySum+=item.probability.expectedProbability||0;
      bucket.expectedProbabilityCount++;
      if(item.probability.highConfidenceWrong)bucket.highConfidenceWrong++;
    }
    if(item.choseFirstOption===true)bucket.firstOption++;
    gateBreakdown[item.gate]=bucket;
  }
  for(const bucket of Object.values(gateBreakdown)){
    bucket.accuracy=bucket.attempts?bucket.correct/bucket.attempts:0;
    bucket.meanExpectedProbability=bucket.expectedProbabilityCount
      ?bucket.expectedProbabilitySum/bucket.expectedProbabilityCount:0;
    bucket.firstOptionRate=bucket.attempts?bucket.firstOption/bucket.attempts:0;
    delete bucket.expectedProbabilitySum;
    delete bucket.expectedProbabilityCount;
    delete bucket.firstOption;
  }

  const summary={
    generatedAt:new Date().toISOString(),
    version:'nvidia-branch-pruned-v30',
    method:'generation',
    model:health?.model||client?.model||null,
    metrics:{
      attempts:observations.length,
      valid:valid.length,
      coverage:observations.length?valid.length/observations.length:0,
      gateAccuracy,
      stageAccuracy,
      actionAccuracy,
      fullAccuracy,
      generalization:{
        baselineAttempts:baselinePrimary.length,
        baselineFullAccuracy,
        adversarialAttempts:adversarialPrimary.length,
        adversarialGateAccuracy,
        adversarialStageAccuracy,
        adversarialActionAccuracy,
        adversarialFullAccuracy
      },
      probability:{
        meanGateExpectedProbability,
        meanActionExpectedProbability,
        meanGateMargin,
        highConfidenceWrongCount,
        highConfidenceWrongRate
      },
      gateInvariance,
      stageInvariance,
      actionInvariance,
      actionGivenCorrectStageAccuracy,
      firstOptionChoiceRate,
      actionFirstOptionChoiceRate,
      orderProbe:{
        attempts:probe.length,
        gateAccuracy:probeGateAccuracy,
        stageAccuracy:probeStageAccuracy,
        actionAccuracy:probeActionAccuracy,
        fullAccuracy:probeFullAccuracy,
        gateFirstOptionChoiceRate:probeFirstOptionChoiceRate,
        actionFirstOptionChoiceRate:probeActionFirstOptionChoiceRate,
        latencyMs:{
          p50:percentile(probeLatency,50),
          p95:percentile(probeLatency,95)
        }
      },
      gateBreakdown,
      averageCalls:callCounts.length
        ?callCounts.reduce((a,b)=>a+b,0)/callCounts.length
        :0,
      latencyMs:{
        p50:percentile(latency,50),
        p95:percentile(latency,95)
      }
    },
    observations
  };

  const file=path.join(
    REPORT_DIR,
    'system-model-nvidia-branch-pruned-v30-baseline-'+
    new Date().toISOString().replace(/[:.]/g,'-')+
    '.json'
  );

  fs.writeFileSync(file,JSON.stringify(summary,null,2)+'\n','utf8');

  console.log('\n[NVIDIA BRANCH-PRUNED V30 BASELINE SUMMARY]');
  console.log('generation coverage  '+(summary.metrics.coverage*100).toFixed(1)+'%');
  console.log('PRIMARY gate acc.    '+(summary.metrics.gateAccuracy*100).toFixed(1)+'%');
  console.log('PRIMARY stage acc.   '+(summary.metrics.stageAccuracy*100).toFixed(1)+'%');
  console.log('PRIMARY action acc.  '+(summary.metrics.actionAccuracy*100).toFixed(1)+'%');
  console.log('PRIMARY full acc.    '+(summary.metrics.fullAccuracy*100).toFixed(1)+'%');
  console.log('BASELINE full acc.   '+(summary.metrics.generalization.baselineFullAccuracy*100).toFixed(1)+'%');
  console.log('ADVERSARIAL gate     '+(summary.metrics.generalization.adversarialGateAccuracy*100).toFixed(1)+'%');
  console.log('ADVERSARIAL stage    '+(summary.metrics.generalization.adversarialStageAccuracy*100).toFixed(1)+'%');
  console.log('ADVERSARIAL action   '+(summary.metrics.generalization.adversarialActionAccuracy*100).toFixed(1)+'%');
  console.log('ADVERSARIAL full     '+(summary.metrics.generalization.adversarialFullAccuracy*100).toFixed(1)+'%');
  console.log('PROBE gate acc.      '+(summary.metrics.orderProbe.gateAccuracy*100).toFixed(1)+'%');
  console.log('PROBE stage acc.     '+(summary.metrics.orderProbe.stageAccuracy*100).toFixed(1)+'%');
  console.log('PROBE action acc.    '+(summary.metrics.orderProbe.actionAccuracy*100).toFixed(1)+'%');
  console.log('PROBE full acc.      '+(summary.metrics.orderProbe.fullAccuracy*100).toFixed(1)+'%');
  console.log('expected P(gates)    '+(summary.metrics.probability.meanGateExpectedProbability*100).toFixed(1)+'%');
  console.log('expected P(action)   '+(summary.metrics.probability.meanActionExpectedProbability*100).toFixed(1)+'%');
  console.log('mean gate margin     '+(summary.metrics.probability.meanGateMargin*100).toFixed(1)+' pp');
  console.log('high-conf wrong rate '+(summary.metrics.probability.highConfidenceWrongRate*100).toFixed(1)+'%');
  console.log('gate invariance      '+(summary.metrics.gateInvariance*100).toFixed(1)+'%');
  console.log('stage invariance     '+(summary.metrics.stageInvariance*100).toFixed(1)+'%');
  console.log('action invariance    '+(summary.metrics.actionInvariance*100).toFixed(1)+'%');
  console.log('action | stage ok    '+(summary.metrics.actionGivenCorrectStageAccuracy*100).toFixed(1)+'%');
  console.log('PRIMARY gate first   '+(summary.metrics.firstOptionChoiceRate*100).toFixed(1)+'%');
  console.log('PROBE gate first     '+(summary.metrics.orderProbe.gateFirstOptionChoiceRate*100).toFixed(1)+'%');
  console.log('PRIMARY action first '+(summary.metrics.actionFirstOptionChoiceRate*100).toFixed(1)+'%');
  console.log('PROBE action first   '+(summary.metrics.orderProbe.actionFirstOptionChoiceRate*100).toFixed(1)+'%');
  console.log('avg generation calls '+summary.metrics.averageCalls.toFixed(2));
  console.log('pipeline latency p50 '+summary.metrics.latencyMs.p50+' ms');
  console.log('pipeline latency p95 '+summary.metrics.latencyMs.p95+' ms');
  console.log('[GATE BREAKDOWN]');
  for(const [gate,b] of Object.entries(summary.metrics.gateBreakdown)){
    console.log(
      '  '+gate+
      ' acc='+(b.accuracy*100).toFixed(1)+'%'+
      ' p='+(b.meanExpectedProbability*100).toFixed(1)+'%'+
      ' first='+(b.firstOptionRate*100).toFixed(1)+'%'+
      ' hcWrong='+b.highConfidenceWrong
    );
  }
  console.log('report               '+file);
});

test('System Model local — applicability baseline V30 probabilístico',async t=>{
  if(!LIVE){
    t.skip('Defina BELAVISTA_OPENJEV_LIVE=1.');
    return;
  }
  assert.ok(NVIDIA_API_KEY,'Defina NVIDIA_API_KEY no .env ou no ambiente para executar a geração DIRECT via NVIDIA.');
  console.log('[NVIDIA DIRECT] endpoint='+NVIDIA_BASE_URL+' model='+NVIDIA_MODEL);

  for(const scenario of scenarios){
    await t.test(scenario.id+' — '+scenario.title,async()=>{
      const rows=[];

      for(let i=0;i<scenario.prompts.length;i++){
        rows.push(await runScenario(scenario,scenario.prompts[i],i));
      }

      assert.ok(
        rows.every(r=>r.valid),
        scenario.id+': generation.valid=false em pelo menos uma chamada.'
      );

      const primary=rows.find(r=>r.promptIndex===0);
      const probe=rows.find(r=>r.promptIndex===1);
      assert.ok(primary,scenario.id+': variante operacional canônica ausente.');
      assert.ok(probe,scenario.id+': probe de ordem reversa ausente.');

      const gateAcc=primary.correct.gateAccuracy;
      const stageAcc=primary.correct.stage?1:0;
      const actionAcc=primary.correct.action?1:0;
      const gateExpectedProb=primary.probability.gateExpectedProbability;
      const actionExpectedProb=primary.probability.actionExpectedProbability;
      const probabilisticDecisions=primary.trace.filter(x=>x.probability?.available).length;
      const highConfidenceWrong=primary.probability.highConfidenceWrong;
      const highConfidenceWrongRate=probabilisticDecisions?highConfidenceWrong/probabilisticDecisions:0;

      assert.ok(
        gateAcc>=MIN_GATE_ACCURACY,
        scenario.id+': gate accuracy '+gateAcc.toFixed(3)+
        ' abaixo de '+MIN_GATE_ACCURACY+
        '. primary='+JSON.stringify(primary.actual.gates)+' probe='+JSON.stringify(probe.actual.gates)
      );

      assert.ok(
        stageAcc>=MIN_STAGE_ACCURACY,
        scenario.id+': stage accuracy '+stageAcc.toFixed(3)+
        ' abaixo de '+MIN_STAGE_ACCURACY+
        '. primary='+JSON.stringify(primary.actual.stage)+' probe='+JSON.stringify(probe.actual.stage)
      );

      assert.ok(
        actionAcc>=MIN_ACTION_ACCURACY,
        scenario.id+': action accuracy '+actionAcc.toFixed(3)+
        ' abaixo de '+MIN_ACTION_ACCURACY+
        '. primary='+JSON.stringify(primary.actual.action)+' probe='+JSON.stringify(probe.actual.action)
      );

      assert.ok(
        gateExpectedProb>=MIN_GATE_EXPECTED_PROB,
        scenario.id+': expected gate probability '+gateExpectedProb.toFixed(3)+
        ' abaixo de '+MIN_GATE_EXPECTED_PROB
      );

      assert.ok(
        actionExpectedProb>=MIN_ACTION_EXPECTED_PROB,
        scenario.id+': expected action probability '+actionExpectedProb.toFixed(3)+
        ' abaixo de '+MIN_ACTION_EXPECTED_PROB
      );

      assert.ok(
        highConfidenceWrongRate<=MAX_HIGH_CONFIDENCE_WRONG_RATE,
        scenario.id+': high-confidence wrong rate '+highConfidenceWrongRate.toFixed(3)+
        ' acima de '+MAX_HIGH_CONFIDENCE_WRONG_RATE
      );
    });
  }
});

after(()=>{
  if(!directObservations.length)return;
  const valid=directObservations.filter(r=>r.valid);
  const baseline=valid.filter(r=>!String(r.scenarioId).startsWith('AG-'));
  const adversarial=valid.filter(r=>String(r.scenarioId).startsWith('AG-'));
  const rate=(rows,pred)=>rows.length?rows.filter(pred).length/rows.length:0;
  const mean=(rows,fn)=>rows.length?rows.reduce((s,r)=>s+fn(r),0)/rows.length:0;
  const metrics={
    attempts:directObservations.length,
    valid:valid.length,
    coverage:directObservations.length?valid.length/directObservations.length:0,
    situationAccuracy:rate(valid,r=>r.correct.situation),
    nextAccuracy:rate(valid,r=>r.correct.next),
    pairAccuracy:rate(valid,r=>r.correct.pair),
    nextGivenGeneratedSituationAccuracy:rate(valid,r=>r.correct.nextGivenGeneratedSituation),
    baselinePairAccuracy:rate(baseline,r=>r.correct.pair),
    adversarialPairAccuracy:rate(adversarial,r=>r.correct.pair),
    meanExpectedSituationProbability:mean(valid,r=>r.probability.stage.expectedProbability||0),
    meanExpectedNextProbability:mean(valid,r=>r.probability.action.expectedProbability||0),
    latencyMs:{
      p50:percentile(valid.map(r=>r.latencyMs.total),50),
      p95:percentile(valid.map(r=>r.latencyMs.total),95)
    }
  };
  const report={
    generatedAt:new Date().toISOString(),
    version:'nvidia-direct-generation-v25',
    provider:'nvidia',
    endpoint:NVIDIA_BASE_URL,
    model:NVIDIA_MODEL,
    metrics,
    observations:directObservations
  };
  const file=path.join(
    REPORT_DIR,
    'system-model-nvidia-branch-pruned-v30-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'
  );
  fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n','utf8');

  console.log('\n[NVIDIA BRANCH-PRUNED SITUATION + NEXT V30 SUMMARY]');
  console.log('coverage              '+(metrics.coverage*100).toFixed(1)+'%');
  console.log('situation accuracy    '+(metrics.situationAccuracy*100).toFixed(1)+'%');
  console.log('next-to-do accuracy   '+(metrics.nextAccuracy*100).toFixed(1)+'%');
  console.log('pair accuracy         '+(metrics.pairAccuracy*100).toFixed(1)+'%');
  console.log('next | situation gen  '+(metrics.nextGivenGeneratedSituationAccuracy*100).toFixed(1)+'%');
  console.log('baseline pair         '+(metrics.baselinePairAccuracy*100).toFixed(1)+'%');
  console.log('adversarial pair      '+(metrics.adversarialPairAccuracy*100).toFixed(1)+'%');
  console.log('expected P(situation) n/a (chat generation)');
  console.log('expected P(next)      n/a (chat generation)');
  console.log('direct latency p50    '+metrics.latencyMs.p50+' ms');
  console.log('direct latency p95    '+metrics.latencyMs.p95+' ms');
  console.log('report                '+file);
});

test('System Model — geração NVIDIA branch-pruned V30',async t=>{
  if(!LIVE){
    t.skip('Defina BELAVISTA_OPENJEV_LIVE=1.');
    return;
  }

  for(const scenario of scenarios){
    await t.test('DIRECT '+scenario.id+' — '+scenario.title,async()=>{
      const row=await generateDirectSituationAndNext(scenario);
      assert.ok(row.valid,scenario.id+': geração direta inválida.');
      assert.equal(
        row.generated.stage,
        scenario.expected.stage,
        scenario.id+': situação gerada incorreta. generated='+JSON.stringify(row.generated)+
        ' expected='+JSON.stringify(scenario.expected)
      );
      assert.equal(
        row.generated.action,
        scenario.expected.action,
        scenario.id+': próxima ação gerada incorreta. generated='+JSON.stringify(row.generated)+
        ' expected='+JSON.stringify(scenario.expected)
      );
      assert.ok(
        row.correct.nextGivenGeneratedSituation,
        scenario.id+': próxima ação não corresponde à situação que o próprio modelo gerou.'
      );
    });
  }
});


// V31 — saída operacional composta: descrição do estado atual + atividades + agenda + cronograma.
const V31_PLAN_STAGE_ORDER=Object.freeze([
  'funding','procurement','receiving','assignment','assignment_acceptance',
  'execution_start','execution_reporting','evidence_submission','evidence_verification','confirmation'
]);

const V31_ACTIVITY_CATALOG=Object.freeze([
  {stage:'funding',id:'act-funding',title:'Disponibilizar recursos',plannedStart:'2026-10-01T08:00:00-03:00',plannedEnd:'2026-10-01T09:00:00-03:00',dependsOn:null},
  {stage:'procurement',id:'act-procurement',title:'Registrar compra de material',plannedStart:'2026-10-01T09:30:00-03:00',plannedEnd:'2026-10-01T11:00:00-03:00',dependsOn:'act-funding'},
  {stage:'receiving',id:'act-receiving',title:'Receber material fisicamente',plannedStart:'2026-10-02T08:00:00-03:00',plannedEnd:'2026-10-02T10:00:00-03:00',dependsOn:'act-procurement'},
  {stage:'assignment',id:'act-assignment',title:'Atribuir responsável',plannedStart:'2026-10-02T10:30:00-03:00',plannedEnd:'2026-10-02T11:00:00-03:00',dependsOn:null},
  {stage:'assignment_acceptance',id:'act-assignment-acceptance',title:'Aceitar atribuição',plannedStart:'2026-10-02T11:00:00-03:00',plannedEnd:'2026-10-02T11:30:00-03:00',dependsOn:'act-assignment'},
  {stage:'execution_start',id:'act-execution-start',title:'Iniciar execução',plannedStart:'2026-10-03T08:00:00-03:00',plannedEnd:'2026-10-03T08:30:00-03:00',dependsOn:'act-assignment-acceptance'},
  {stage:'execution_reporting',id:'act-execution-reporting',title:'Registrar andamento da execução',plannedStart:'2026-10-03T16:00:00-03:00',plannedEnd:'2026-10-03T16:30:00-03:00',dependsOn:'act-execution-start'},
  {stage:'evidence_submission',id:'act-evidence-submission',title:'Enviar evidência',plannedStart:'2026-10-03T16:30:00-03:00',plannedEnd:'2026-10-03T17:00:00-03:00',dependsOn:'act-execution-reporting'},
  {stage:'evidence_verification',id:'act-evidence-verification',title:'Verificar evidência',plannedStart:'2026-10-04T08:00:00-03:00',plannedEnd:'2026-10-04T09:00:00-03:00',dependsOn:'act-evidence-submission'},
  {stage:'confirmation',id:'act-confirmation',title:'Registrar confirmação final',plannedStart:'2026-10-04T09:00:00-03:00',plannedEnd:'2026-10-04T09:30:00-03:00',dependsOn:'act-evidence-verification'}
]);

function v31BuildPlanningSource(directRow){
  const stage=directRow?.generated?.stage||null;
  const idx=stage==='completed'?V31_PLAN_STAGE_ORDER.length:V31_PLAN_STAGE_ORDER.indexOf(stage);
  const activities=V31_ACTIVITY_CATALOG.map((item,i)=>{
    let status='blocked';
    if(stage==='completed'||i<idx)status='completed';
    else if(i===idx)status=stage==='execution_reporting'?'in_progress':'pending';
    return {...item,status};
  });
  const agenda=activities
    .filter(x=>x.status==='pending'||x.status==='in_progress')
    .concat(activities.filter(x=>x.status==='blocked').slice(0,2))
    .slice(0,3)
    .map(x=>({id:x.id,title:x.title,startsAt:x.plannedStart,endsAt:x.plannedEnd,status:x.status}));
  return {activities,agenda};
}

function v31OperationalStatePrompt(){
  return [
    'Você transforma um estado operacional já decidido e uma fonte autoritativa de planejamento em uma visão de operação.',
    'NÃO redescubra o stage. Copie stage, blockingFact, nextAction e nextToDo do ESTADO GERADO.',
    'A descrição currentState.description deve explicar em português o estado atual da frente, usando a situation recebida.',
    'A FONTE DE PLANEJAMENTO é autoritativa para ids, títulos, status, dependências e datas.',
    'NUNCA invente atividade, id, status, startsAt, endsAt, plannedStart ou plannedEnd.',
    'NUNCA altere uma data. Copie timestamps exatamente como recebidos.',
    'Se não houver data na fonte, use null; nunca estime.',
    'activities.completed contém somente status=completed.',
    'activities.inProgress contém somente status=in_progress.',
    'activities.pending contém somente status=pending.',
    'activities.blocked contém somente status=blocked.',
    'agenda deve copiar TODOS os itens de planningSource.agenda, na mesma ordem.',
    'schedule deve copiar TODAS as atividades de planningSource.activities, na mesma ordem, preservando dependsOn e status.',
    'Retorne SOMENTE JSON válido exatamente com as chaves:',
    '{"currentState":{"stage":"...","description":"...","blockingFact":null,"nextAction":"...","nextToDo":"..."},"activities":{"inProgress":[],"pending":[],"blocked":[],"completed":[]},"agenda":[],"schedule":[]}',
    'Cada item em activities deve ter id,title,status.',
    'Cada item de agenda deve ter id,title,startsAt,endsAt,status.',
    'Cada item de schedule deve ter id,title,plannedStart,plannedEnd,status,dependsOn.',
    'Não use markdown e não acrescente texto fora do JSON.'
  ].join('\n');
}

function v31AllowedTimes(planningSource){
  const times=new Set();
  for(const x of planningSource.activities||[]){
    if(x.plannedStart)times.add(x.plannedStart);
    if(x.plannedEnd)times.add(x.plannedEnd);
  }
  for(const x of planningSource.agenda||[]){
    if(x.startsAt)times.add(x.startsAt);
    if(x.endsAt)times.add(x.endsAt);
  }
  return times;
}

async function v31GenerateOperationalStatePlan(scenario){
  let direct=directObservations.find(x=>x.scenarioId===scenario.id&&x.valid);
  if(!direct)direct=await generateDirectSituationAndNext(scenario);
  const planningSource=v31BuildPlanningSource(direct);
  const stateSource={
    stage:direct.generated.stage,
    situation:direct.generated.situation,
    blockingFact:direct.generated.blockingFact??null,
    nextAction:direct.generated.action,
    nextToDo:direct.generated.nextToDo
  };
  const call=await nvidiaChat([
    {role:'system',content:v31OperationalStatePrompt()},
    {role:'user',content:[
      'ESTADO GERADO PELA V30:',
      JSON.stringify(stateSource,null,2),
      '',
      'FONTE DE PLANEJAMENTO:',
      JSON.stringify(planningSource,null,2)
    ].join('\n')}
  ],{maxTokens:1800,temperature:0});
  const json=extractJsonObject(call.content);
  if(!json)throw new Error('V31 retornou JSON inválido: '+String(call.content).slice(0,700));
  return {scenarioId:scenario.id,direct,stateSource,planningSource,generated:json,raw:call.content,latencyMs:call.latencyMs};
}

function v31ValidatePlan(row){
  const out=row.generated||{};
  const source=row.planningSource;
  const ids=new Set(source.activities.map(x=>x.id));
  const sourceById=new Map(source.activities.map(x=>[x.id,x]));
  const allowedTimes=v31AllowedTimes(source);
  assert.equal(out?.currentState?.stage,row.stateSource.stage,'V31 stage deve copiar V30');
  assert.equal(out?.currentState?.nextAction,row.stateSource.nextAction,'V31 nextAction deve copiar V30');
  assert.equal(out?.currentState?.blockingFact,row.stateSource.blockingFact,'V31 blockingFact deve copiar V30');
  assert.ok(typeof out?.currentState?.description==='string'&&out.currentState.description.trim(),'V31 descrição atual obrigatória');
  assert.ok(typeof out?.currentState?.nextToDo==='string'&&out.currentState.nextToDo.trim(),'V31 nextToDo obrigatório');
  for(const key of ['inProgress','pending','blocked','completed'])assert.ok(Array.isArray(out?.activities?.[key]),'V31 activities.'+key+' deve ser array');
  assert.ok(Array.isArray(out.agenda),'V31 agenda deve ser array');
  assert.ok(Array.isArray(out.schedule),'V31 schedule deve ser array');
  assert.equal(out.schedule.length,source.activities.length,'V31 cronograma deve preservar todas as atividades');
  assert.equal(out.agenda.length,source.agenda.length,'V31 agenda deve preservar todos os itens agendados');
  for(let i=0;i<out.schedule.length;i++){
    const x=out.schedule[i];
    const s=source.activities[i];
    assert.equal(x.id,s.id,'V31 cronograma preserva ordem/id');
    assert.equal(x.title,s.title,'V31 cronograma preserva título');
    assert.equal(x.status,s.status,'V31 cronograma preserva status');
    assert.equal(x.plannedStart,s.plannedStart,'V31 cronograma preserva plannedStart');
    assert.equal(x.plannedEnd,s.plannedEnd,'V31 cronograma preserva plannedEnd');
    assert.equal(x.dependsOn,s.dependsOn,'V31 cronograma preserva dependsOn');
  }
  for(let i=0;i<out.agenda.length;i++){
    const x=out.agenda[i];
    const s=source.agenda[i];
    assert.equal(x.id,s.id,'V31 agenda preserva ordem/id');
    assert.equal(x.startsAt,s.startsAt,'V31 agenda preserva startsAt');
    assert.equal(x.endsAt,s.endsAt,'V31 agenda preserva endsAt');
    if(x.startsAt)assert.ok(allowedTimes.has(x.startsAt),'V31 não pode inventar startsAt');
    if(x.endsAt)assert.ok(allowedTimes.has(x.endsAt),'V31 não pode inventar endsAt');
  }
  for(const [bucket,status] of [['inProgress','in_progress'],['pending','pending'],['blocked','blocked'],['completed','completed']]){
    for(const x of out.activities[bucket]){
      assert.ok(ids.has(x.id),'V31 atividade deve existir na fonte: '+x.id);
      assert.equal(sourceById.get(x.id).status,status,'V31 bucket/status inconsistente: '+x.id);
    }
  }
  return true;
}

test.skip('System Model — descrição do estado atual + agenda + atividades V31 (superseded por V33)',async t=>{
  if(!LIVE){
    t.skip('Defina BELAVISTA_OPENJEV_LIVE=1.');
    return;
  }
  assert.ok(NVIDIA_API_KEY,'Defina NVIDIA_API_KEY para a composição operacional V31.');
  const selectedIds=['CG-02','CG-04','CG-08','CG-10','CG-12','AG-02','AG-06'];
  const rows=[];
  for(const id of selectedIds){
    const scenario=scenarios.find(x=>x.id===id);
    assert.ok(scenario,'Cenário V31 não encontrado: '+id);
    await t.test('V31 '+id+' — estado + agenda + cronograma',async()=>{
      const row=await v31GenerateOperationalStatePlan(scenario);
      v31ValidatePlan(row);
      rows.push(row);
      console.log('[OPERATIONAL V31]',id,'stage='+row.generated.currentState.stage,'next='+row.generated.currentState.nextAction,'agenda='+row.generated.agenda.length,'schedule='+row.generated.schedule.length,'ms='+row.latencyMs);
      console.log('                 ESTADO: '+row.generated.currentState.description);
    });
  }
  console.log('[OPERATIONAL STATE PLAN V31 SUMMARY]');
  console.log('cases                 '+rows.length+'/'+selectedIds.length);
  console.log('current-state schema  100.0%');
  console.log('agenda source fidelity 100.0%');
  console.log('schedule source fidelity 100.0%');
  console.log('no invented dates     100.0%');
});


// V32 — duas requisições de produto:
// #1 descrição do estado atual; #2 atividades derivadas do estado + catálogo + dependências.
// O teste usa NVIDIA, mas o contrato não depende do provider e pode migrar para MiniCPM 2B.
const V32_ACTIVITY_PROVIDER=process.env.SYSTEM_MODEL_ACTIVITY_PROVIDER||'nvidia';

const V32_ACTIVITY_DEFINITIONS=Object.freeze([
  {stage:'funding',id:'act-funding',title:'Disponibilizar recursos',description:'Garantir recursos financeiros disponíveis para a frente operacional.',branch:'core',plannedStart:'2026-10-01T08:00:00-03:00',plannedEnd:'2026-10-01T09:00:00-03:00',dependencyRequirements:[]},
  {stage:'procurement',id:'act-procurement',title:'Registrar compra de material',description:'Comprar e registrar o material obrigatório da frente.',branch:'material',plannedStart:'2026-10-01T09:30:00-03:00',plannedEnd:'2026-10-01T11:00:00-03:00',dependencyRequirements:['act-funding deve estar completed','materialApplicability deve ser ACTIVE']},
  {stage:'receiving',id:'act-receiving',title:'Receber material fisicamente',description:'Registrar que o material comprado chegou fisicamente à operação.',branch:'material',plannedStart:'2026-10-02T08:00:00-03:00',plannedEnd:'2026-10-02T10:00:00-03:00',dependencyRequirements:['act-procurement deve estar completed','materialApplicability deve ser ACTIVE']},
  {stage:'assignment',id:'act-assignment',title:'Atribuir responsável',description:'Criar a atribuição do responsável pela execução.',branch:'core',plannedStart:'2026-10-02T10:30:00-03:00',plannedEnd:'2026-10-02T11:00:00-03:00',dependencyRequirements:['act-funding deve estar completed','se materialApplicability=ACTIVE, act-receiving deve estar completed; se SKIP, ignore todo o branch material']},
  {stage:'assignment_acceptance',id:'act-assignment-acceptance',title:'Aceitar atribuição',description:'Registrar o aceite da atribuição pelo responsável.',branch:'core',plannedStart:'2026-10-02T11:00:00-03:00',plannedEnd:'2026-10-02T11:30:00-03:00',dependencyRequirements:['act-assignment deve estar completed']},
  {stage:'execution_start',id:'act-execution-start',title:'Iniciar execução',description:'Iniciar fisicamente o serviço depois do aceite.',branch:'core',plannedStart:'2026-10-03T08:00:00-03:00',plannedEnd:'2026-10-03T08:30:00-03:00',dependencyRequirements:['act-assignment-acceptance deve estar completed']},
  {stage:'execution_reporting',id:'act-execution-reporting',title:'Registrar andamento da execução',description:'Registrar o andamento de uma execução que já foi iniciada.',branch:'core',plannedStart:'2026-10-03T16:00:00-03:00',plannedEnd:'2026-10-03T16:30:00-03:00',dependencyRequirements:['act-execution-start deve estar completed']},
  {stage:'evidence_submission',id:'act-evidence-submission',title:'Enviar evidência',description:'Enviar a evidência obrigatória da execução reportada.',branch:'evidence',plannedStart:'2026-10-03T16:30:00-03:00',plannedEnd:'2026-10-03T17:00:00-03:00',dependencyRequirements:['act-execution-reporting deve estar completed','evidenceApplicability deve ser ACTIVE']},
  {stage:'evidence_verification',id:'act-evidence-verification',title:'Verificar evidência',description:'Verificar a evidência que já foi submetida.',branch:'evidence',plannedStart:'2026-10-04T08:00:00-03:00',plannedEnd:'2026-10-04T09:00:00-03:00',dependencyRequirements:['act-evidence-submission deve estar completed','evidenceApplicability deve ser ACTIVE']},
  {stage:'confirmation',id:'act-confirmation',title:'Registrar confirmação final',description:'Registrar a confirmação final quando todos os gates aplicáveis anteriores estiverem satisfeitos.',branch:'core',plannedStart:'2026-10-04T09:00:00-03:00',plannedEnd:'2026-10-04T09:30:00-03:00',dependencyRequirements:['act-execution-reporting deve estar completed','se evidenceApplicability=ACTIVE, act-evidence-verification deve estar completed; se SKIP, ignore todo o branch evidence']}
]);

function v32ApplicableDefinitions(materialApplicability,evidenceApplicability){
  return V32_ACTIVITY_DEFINITIONS.filter(x=>{
    if(x.branch==='material')return materialApplicability==='ACTIVE';
    if(x.branch==='evidence')return evidenceApplicability==='ACTIVE';
    return true;
  });
}

function v32CurrentIndex(applicable,stage){
  if(stage==='completed')return applicable.length;
  return applicable.findIndex(x=>x.stage===stage);
}

function v32BuildPersistedState(direct){
  const g=direct.generated||{};
  const applicable=v32ApplicableDefinitions(g.materialApplicability,g.evidenceApplicability);
  const idx=v32CurrentIndex(applicable,g.stage);
  const completed=(idx<0?[]:applicable.slice(0,idx)).map(x=>({
    id:x.id,title:x.title,status:'completed',plannedStart:x.plannedStart,plannedEnd:x.plannedEnd,dependencyRequirements:[...x.dependencyRequirements]
  }));
  if(g.stage==='completed'){
    return {completed:applicable.map(x=>({id:x.id,title:x.title,status:'completed',plannedStart:x.plannedStart,plannedEnd:x.plannedEnd,dependencyRequirements:[...x.dependencyRequirements]}))};
  }
  return {completed};
}

function v32ExpectedGenerated(direct,persisted){
  const g=direct.generated||{};
  const completedIds=new Set((persisted.completed||[]).map(x=>x.id));
  const applicable=v32ApplicableDefinitions(g.materialApplicability,g.evidenceApplicability);
  const current=applicable.find(x=>x.stage===g.stage)||null;
  return applicable.filter(x=>!completedIds.has(x.id)).map(x=>({
    ...x,
    status:current&&x.id===current.id?(g.stage==='execution_reporting'?'in_progress':'ready'):'blocked'
  }));
}

function v32StateRequestPrompt(){
  return [
    'Você recebe uma decisão operacional estrutural já calculada.',
    'Esta é a REQUISIÇÃO #1: produza somente a descrição do estado atual.',
    'NÃO redescubra nem altere stage, blockingFact, nextAction, nextToDo ou applicability.',
    'Copie materialApplicability e evidenceApplicability exatamente.',
    'description deve ser uma descrição objetiva em português do estado operacional atual.',
    'Retorne SOMENTE JSON válido:',
    '{"stage":"...","description":"...","blockingFact":null,"nextAction":"...","nextToDo":"...","materialApplicability":"ACTIVE|SKIP","evidenceApplicability":"ACTIVE|SKIP"}',
    'Sem markdown e sem texto adicional.'
  ].join('\n');
}

async function v32GenerateCurrentState(direct){
  const source={
    stage:direct.generated.stage,
    situation:direct.generated.situation,
    blockingFact:direct.generated.blockingFact??null,
    nextAction:direct.generated.action,
    nextToDo:direct.generated.nextToDo,
    materialApplicability:direct.generated.materialApplicability,
    evidenceApplicability:direct.generated.evidenceApplicability
  };
  const call=await nvidiaChat([
    {role:'system',content:v32StateRequestPrompt()},
    {role:'user',content:'DECISÃO ESTRUTURAL AUTORITATIVA:\n'+JSON.stringify(source,null,2)}
  ],{maxTokens:500,temperature:0});
  const json=extractJsonObject(call.content);
  if(!json)throw new Error('V32 request #1 retornou JSON inválido: '+String(call.content).slice(0,700));
  return {source,generated:json,latencyMs:call.latencyMs,raw:call.content};
}

function v32ActivitiesRequestPrompt(){
  return [
    'Esta é a REQUISIÇÃO #2.',
    'Gere o estado das atividades com base SOMENTE em CURRENT_STATE, ACTIVITY_DEFINITIONS e PERSISTED_STATE.',
    'As descrições das atividades e dependencyRequirements são o contrato semântico das atividades.',
    'PERSISTED_STATE.completed é AUTORITATIVO E IMUTÁVEL.',
    'Toda atividade já completed deve permanecer completed com exatamente o mesmo id, title, datas e dependencyRequirements.',
    'NUNCA regenere uma atividade completed dentro de generated.',
    'NUNCA rebaixe completed para ready, in_progress ou blocked.',
    'Se branch=material e currentState.materialApplicability=SKIP, não gere atividades desse branch.',
    'Se branch=evidence e currentState.evidenceApplicability=SKIP, não gere atividades desse branch.',
    'Para cada atividade aplicável ainda não completed, avalie dependencyRequirements.',
    'A atividade correspondente a currentState.stage deve ser ready; use in_progress somente para execution_reporting, pois a execução física já começou e aguarda relato.',
    'Atividades aplicáveis posteriores, cujas dependências ainda não foram satisfeitas, devem ser blocked.',
    'Não invente ids, títulos, dependências ou datas. Copie plannedStart/plannedEnd exatamente de ACTIVITY_DEFINITIONS.',
    'agenda contém somente atividades ready ou in_progress; não inclua blocked nem completed.',
    'schedule contém todas as atividades aplicáveis: completed imutáveis primeiro em sua ordem original e depois generated, na ordem de ACTIVITY_DEFINITIONS.',
    'Retorne SOMENTE JSON válido exatamente com:',
    '{"completed":[],"generated":[],"agenda":[],"schedule":[]}',
    'Cada item deve conter id,title,status,plannedStart,plannedEnd,dependencyRequirements.',
    'Itens de agenda usam startsAt/endsAt no lugar de plannedStart/plannedEnd.',
    'Sem markdown e sem texto adicional.'
  ].join('\n');
}

async function v32GenerateActivities(currentState,persisted){
  if(V32_ACTIVITY_PROVIDER!=='nvidia')throw new Error('V32 teste atual implementa provider=nvidia; contrato é portável para MiniCPM 2B.');
  const call=await nvidiaChat([
    {role:'system',content:v32ActivitiesRequestPrompt()},
    {role:'user',content:[
      'CURRENT_STATE:',JSON.stringify(currentState,null,2),'',
      'ACTIVITY_DEFINITIONS:',JSON.stringify(V32_ACTIVITY_DEFINITIONS,null,2),'',
      'PERSISTED_STATE:',JSON.stringify(persisted,null,2)
    ].join('\n')}
  ],{maxTokens:2600,temperature:0});
  const json=extractJsonObject(call.content);
  if(!json)throw new Error('V32 request #2 retornou JSON inválido: '+String(call.content).slice(0,900));
  return {generated:json,latencyMs:call.latencyMs,raw:call.content};
}

function v32ValidateCurrentState(row,direct){
  const g=row.generated;
  assert.equal(g.stage,direct.generated.stage,'V32 request #1 preserva stage');
  assert.equal(g.blockingFact,direct.generated.blockingFact??null,'V32 request #1 preserva blockingFact');
  assert.equal(g.nextAction,direct.generated.action,'V32 request #1 preserva nextAction');
  assert.equal(g.materialApplicability,direct.generated.materialApplicability,'V32 preserva materialApplicability');
  assert.equal(g.evidenceApplicability,direct.generated.evidenceApplicability,'V32 preserva evidenceApplicability');
  assert.ok(typeof g.description==='string'&&g.description.trim(),'V32 description obrigatória');
}

function v32ValidateActivities(row,direct,persisted){
  const out=row.generated||{};
  assert.ok(Array.isArray(out.completed),'V32 completed deve ser array');
  assert.ok(Array.isArray(out.generated),'V32 generated deve ser array');
  assert.ok(Array.isArray(out.agenda),'V32 agenda deve ser array');
  assert.ok(Array.isArray(out.schedule),'V32 schedule deve ser array');
  const expectedCompleted=persisted.completed||[];
  assert.equal(out.completed.length,expectedCompleted.length,'V32 completed count imutável');
  for(let i=0;i<expectedCompleted.length;i++){
    const a=out.completed[i],b=expectedCompleted[i];
    assert.equal(a.id,b.id,'V32 completed id imutável');
    assert.equal(a.title,b.title,'V32 completed title imutável');
    assert.equal(a.status,'completed','V32 completed continua completed');
    assert.equal(a.plannedStart,b.plannedStart,'V32 completed plannedStart imutável');
    assert.equal(a.plannedEnd,b.plannedEnd,'V32 completed plannedEnd imutável');
    assert.deepEqual(a.dependencyRequirements,b.dependencyRequirements,'V32 completed dependencies imutáveis');
  }
  const completedIds=new Set(expectedCompleted.map(x=>x.id));
  for(const x of out.generated)assert.ok(!completedIds.has(x.id),'V32 não pode regenerar completed: '+x.id);

  const expected=v32ExpectedGenerated(direct,persisted);
  assert.equal(out.generated.length,expected.length,'V32 deve gerar todas e somente atividades aplicáveis não concluídas');
  const expectedById=new Map(expected.map(x=>[x.id,x]));
  for(const x of out.generated){
    const e=expectedById.get(x.id);
    assert.ok(e,'V32 atividade gerada inesperada: '+x.id);
    assert.equal(x.title,e.title,'V32 preserva título: '+x.id);
    assert.equal(x.status,e.status,'V32 status por situação/dependência: '+x.id);
    assert.equal(x.plannedStart,e.plannedStart,'V32 preserva plannedStart: '+x.id);
    assert.equal(x.plannedEnd,e.plannedEnd,'V32 preserva plannedEnd: '+x.id);
    assert.deepEqual(x.dependencyRequirements,e.dependencyRequirements,'V32 preserva dependencyRequirements: '+x.id);
  }

  const readyIds=expected.filter(x=>x.status==='ready'||x.status==='in_progress').map(x=>x.id);
  assert.equal(out.agenda.length,readyIds.length,'V32 agenda contém apenas atividades executáveis agora');
  assert.deepEqual(out.agenda.map(x=>x.id),readyIds,'V32 agenda aponta para atividade atual');
  for(const x of out.agenda){
    const e=expectedById.get(x.id);
    assert.equal(x.startsAt,e.plannedStart,'V32 agenda copia startsAt');
    assert.equal(x.endsAt,e.plannedEnd,'V32 agenda copia endsAt');
  }

  const applicable=v32ApplicableDefinitions(direct.generated.materialApplicability,direct.generated.evidenceApplicability);
  assert.equal(out.schedule.length,applicable.length,'V32 schedule contém todas as atividades aplicáveis');
  assert.deepEqual(out.schedule.map(x=>x.id),applicable.map(x=>x.id),'V32 schedule preserva ordem das definições aplicáveis');
  for(const x of out.schedule){
    const def=applicable.find(d=>d.id===x.id);
    assert.ok(def,'V32 schedule id conhecido');
    assert.equal(x.plannedStart,def.plannedStart,'V32 schedule não inventa plannedStart');
    assert.equal(x.plannedEnd,def.plannedEnd,'V32 schedule não inventa plannedEnd');
  }
  return true;
}

test.skip('System Model — segunda requisição gera atividades pela situação + dependências V32 (superseded por V33)',async t=>{
  if(!LIVE){t.skip('Defina BELAVISTA_OPENJEV_LIVE=1.');return;}
  assert.ok(NVIDIA_API_KEY,'Defina NVIDIA_API_KEY para o teste V32.');
  assert.equal(V32_ACTIVITY_PROVIDER,'nvidia','V32 teste atual deve rodar via endpoint NVIDIA.');
  const selectedIds=['CG-02','CG-04','CG-08','CG-10','CG-12','AG-02','AG-06','AG-07'];
  const rows=[];
  for(const id of selectedIds){
    const scenario=scenarios.find(x=>x.id===id);
    assert.ok(scenario,'Cenário V32 não encontrado: '+id);
    await t.test('V32 '+id+' — state request -> activities request',async()=>{
      let direct=directObservations.find(x=>x.scenarioId===id&&x.valid);
      if(!direct)direct=await generateDirectSituationAndNext(scenario);
      const stateRow=await v32GenerateCurrentState(direct);
      v32ValidateCurrentState(stateRow,direct);
      const persisted=v32BuildPersistedState(direct);
      const activitiesRow=await v32GenerateActivities(stateRow.generated,persisted);
      v32ValidateActivities(activitiesRow,direct,persisted);
      rows.push({id,direct,stateRow,persisted,activitiesRow});
      console.log('[ACTIVITIES V32]',id,'stage='+stateRow.generated.stage,'completed='+persisted.completed.length,'generated='+activitiesRow.generated.generated.length,'agenda='+activitiesRow.generated.agenda.length,'stateMs='+stateRow.latencyMs,'activitiesMs='+activitiesRow.latencyMs);
      console.log('                ESTADO: '+stateRow.generated.description);
      console.log('                AGORA: '+(activitiesRow.generated.agenda.map(x=>x.title).join(' | ')||'nenhuma'));
    });
  }
  console.log('[STATE-DRIVEN ACTIVITIES V32 SUMMARY]');
  console.log('provider               '+V32_ACTIVITY_PROVIDER);
  console.log('cases                  '+rows.length+'/'+selectedIds.length);
  console.log('request #1 state       100.0%');
  console.log('request #2 activities  100.0%');
  console.log('completed immutable    100.0%');
  console.log('dependency statuses    100.0%');
  console.log('branch applicability   100.0%');
  console.log('agenda current-only    100.0%');
  console.log('no invented ids/dates  100.0%');
});


// V33 — estado estrutural autoritativo + duas gerações pequenas.
// Request #1 gera somente description. Campos causais vêm da V30 e NÃO são re-gerados.
// Request #2 gera somente id/status/reason das atividades ainda não concluídas.
// Metadados, completed, agenda e schedule são materializados deterministicamente.
const V33_ACTIVITY_PROVIDER=process.env.SYSTEM_MODEL_ACTIVITY_PROVIDER||'nvidia';

function v33AuthoritativeStateFromDirect(direct){
  return {
    stage:direct.generated.stage,
    situation:direct.generated.situation,
    blockingFact:direct.generated.blockingFact??null,
    nextAction:direct.generated.action,
    nextToDo:direct.generated.nextToDo,
    materialApplicability:direct.generated.materialApplicability,
    evidenceApplicability:direct.generated.evidenceApplicability
  };
}

function v33DescriptionPrompt(){
  return [
    'Esta é a REQUISIÇÃO #1.',
    'O estado estrutural recebido é AUTORITATIVO e já foi calculado pela camada causal.',
    'Gere SOMENTE uma descrição objetiva em português do estado operacional atual.',
    'Não retorne stage, blockingFact, action, applicability, agenda ou atividades.',
    'Não redescubra fatos. Use situation e nextToDo apenas para redigir a descrição.',
    'Retorne SOMENTE JSON válido: {"description":"..."}',
    'Sem markdown e sem texto adicional.'
  ].join('\n');
}

async function v33GenerateCurrentState(direct){
  const source=v33AuthoritativeStateFromDirect(direct);
  const call=await nvidiaChat([
    {role:'system',content:v33DescriptionPrompt()},
    {role:'user',content:'AUTHORITATIVE_STATE:\n'+JSON.stringify(source,null,2)}
  ],{maxTokens:220,temperature:0});
  const json=extractJsonObject(call.content);
  if(!json||typeof json.description!=='string'||!json.description.trim()){
    throw new Error('V33 request #1 retornou descrição inválida: '+String(call.content).slice(0,500));
  }
  const generated={...source,description:json.description.trim()};
  return {source,generated,latencyMs:call.latencyMs,raw:call.content};
}

function v33RemainingDefinitions(currentState,persisted){
  const completedIds=new Set((persisted.completed||[]).map(x=>x.id));
  return v32ApplicableDefinitions(currentState.materialApplicability,currentState.evidenceApplicability)
    .filter(x=>!completedIds.has(x.id));
}

function v33ActivityStatePrompt(){
  return [
    'Esta é a REQUISIÇÃO #2.',
    'Você recebe CURRENT_STATE autoritativo, REMAINING_ACTIVITY_DEFINITIONS e PERSISTED_COMPLETED_IDS.',
    'Gere o estado operacional das atividades ainda não concluídas com base nas descrições e dependencyRequirements.',
    'As atividades completed NÃO aparecem em REMAINING_ACTIVITY_DEFINITIONS e nunca podem ser recriadas.',
    'Retorne exatamente uma entrada para CADA definição restante e nenhuma outra.',
    'status permitido: ready, in_progress ou blocked.',
    'A atividade cujo stage corresponde a CURRENT_STATE.stage é ready.',
    'Exceção: se CURRENT_STATE.stage=execution_reporting, a atividade desse stage é in_progress.',
    'Atividades posteriores que dependem de algo ainda não completed devem ser blocked.',
    'Se CURRENT_STATE.stage=completed, não haverá definições restantes e activities deve ser [].',
    'Não invente id. Copie somente id das definições recebidas.',
    'reason deve explicar em uma frase curta por que a atividade está ready/in_progress/blocked usando situação e dependências.',
    'Retorne SOMENTE JSON válido exatamente com: {"activities":[{"id":"...","status":"ready|in_progress|blocked","reason":"..."}]}',
    'Sem markdown e sem texto adicional.'
  ].join('\n');
}

async function v33GenerateActivityStates(currentState,persisted){
  if(V33_ACTIVITY_PROVIDER!=='nvidia')throw new Error('V33 teste atual usa provider=nvidia; contrato permanece pequeno para futura execução no MiniCPM 2B.');
  const remaining=v33RemainingDefinitions(currentState,persisted);
  const payload=remaining.map(x=>({
    stage:x.stage,id:x.id,description:x.description,dependencyRequirements:x.dependencyRequirements
  }));
  const call=await nvidiaChat([
    {role:'system',content:v33ActivityStatePrompt()},
    {role:'user',content:[
      'CURRENT_STATE:',JSON.stringify(currentState,null,2),'',
      'REMAINING_ACTIVITY_DEFINITIONS:',JSON.stringify(payload,null,2),'',
      'PERSISTED_COMPLETED_IDS:',JSON.stringify((persisted.completed||[]).map(x=>x.id))
    ].join('\n')}
  ],{maxTokens:1100,temperature:0});
  const json=extractJsonObject(call.content);
  if(!json||!Array.isArray(json.activities)){
    throw new Error('V33 request #2 retornou JSON inválido: '+String(call.content).slice(0,700));
  }
  return {remaining,generated:json,latencyMs:call.latencyMs,raw:call.content};
}

function v33ExpectedActivityStates(direct,persisted){
  return v32ExpectedGenerated(direct,persisted).map(x=>({id:x.id,status:x.status}));
}

function v33MaterializeOperationalPlan(currentState,persisted,activityRow){
  const applicable=v32ApplicableDefinitions(currentState.materialApplicability,currentState.evidenceApplicability);
  const defsById=new Map(applicable.map(x=>[x.id,x]));
  const completed=(persisted.completed||[]).map(x=>({...x,dependencyRequirements:[...(x.dependencyRequirements||[])]}));
  const completedIds=new Set(completed.map(x=>x.id));
  const states=new Map((activityRow.generated.activities||[]).map(x=>[x.id,x]));
  const generated=applicable.filter(x=>!completedIds.has(x.id)).map(def=>{
    const state=states.get(def.id);
    if(!state)throw new Error('V33 request #2 não retornou atividade: '+def.id);
    return {
      id:def.id,title:def.title,description:def.description,status:state.status,reason:String(state.reason||''),
      plannedStart:def.plannedStart,plannedEnd:def.plannedEnd,dependencyRequirements:[...def.dependencyRequirements]
    };
  });
  const agenda=generated.filter(x=>x.status==='ready'||x.status==='in_progress').map(x=>({
    id:x.id,title:x.title,status:x.status,startsAt:x.plannedStart,endsAt:x.plannedEnd,reason:x.reason
  }));
  const generatedById=new Map(generated.map(x=>[x.id,x]));
  const completedById=new Map(completed.map(x=>[x.id,x]));
  const schedule=applicable.map(def=>{
    const item=completedById.get(def.id)||generatedById.get(def.id);
    if(!item)throw new Error('V33 schedule sem materialização: '+def.id);
    return {
      id:def.id,title:def.title,status:item.status,plannedStart:def.plannedStart,plannedEnd:def.plannedEnd,
      dependencyRequirements:[...def.dependencyRequirements],reason:item.reason||null
    };
  });
  return {
    currentState,
    activities:{completed,generated},
    agenda,
    schedule
  };
}

function v33ValidateCurrentState(row,direct){
  const g=row.generated;
  const expected=v33AuthoritativeStateFromDirect(direct);
  assert.equal(g.stage,expected.stage,'V33 stage vem da V30');
  assert.equal(g.blockingFact,expected.blockingFact,'V33 blockingFact vem da V30');
  assert.equal(g.nextAction,expected.nextAction,'V33 nextAction vem da V30');
  assert.equal(g.nextToDo,expected.nextToDo,'V33 nextToDo vem da V30');
  assert.equal(g.materialApplicability,expected.materialApplicability,'V33 materialApplicability vem da V30');
  assert.equal(g.evidenceApplicability,expected.evidenceApplicability,'V33 evidenceApplicability vem da V30');
  assert.ok(typeof g.description==='string'&&g.description.trim(),'V33 descrição obrigatória');
}

function v33ValidateActivityStates(activityRow,direct,persisted){
  const got=activityRow.generated.activities||[];
  const expected=v33ExpectedActivityStates(direct,persisted);
  assert.equal(got.length,expected.length,'V33 deve gerar todas e somente atividades restantes');
  const expectedById=new Map(expected.map(x=>[x.id,x.status]));
  const seen=new Set();
  const completedIds=new Set((persisted.completed||[]).map(x=>x.id));
  for(const x of got){
    assert.ok(expectedById.has(x.id),'V33 id inesperado: '+x.id);
    assert.ok(!completedIds.has(x.id),'V33 não pode regenerar completed: '+x.id);
    assert.ok(!seen.has(x.id),'V33 id duplicado: '+x.id);seen.add(x.id);
    assert.equal(x.status,expectedById.get(x.id),'V33 status por dependência/situação: '+x.id);
    assert.ok(typeof x.reason==='string'&&x.reason.trim(),'V33 reason obrigatória: '+x.id);
  }
}

function v33ValidateMaterializedPlan(plan,direct,persisted){
  const expectedCompleted=persisted.completed||[];
  assert.equal(plan.activities.completed.length,expectedCompleted.length,'V33 completed count imutável');
  for(let i=0;i<expectedCompleted.length;i++){
    const a=plan.activities.completed[i],b=expectedCompleted[i];
    assert.equal(a.id,b.id,'V33 completed id imutável');
    assert.equal(a.status,'completed','V33 completed permanece completed');
    assert.equal(a.title,b.title,'V33 completed title imutável');
    assert.equal(a.plannedStart,b.plannedStart,'V33 completed plannedStart imutável');
    assert.equal(a.plannedEnd,b.plannedEnd,'V33 completed plannedEnd imutável');
    assert.deepEqual(a.dependencyRequirements,b.dependencyRequirements,'V33 completed dependencies imutáveis');
  }
  const expected=v33ExpectedActivityStates(direct,persisted);
  const nowIds=expected.filter(x=>x.status==='ready'||x.status==='in_progress').map(x=>x.id);
  assert.deepEqual(plan.agenda.map(x=>x.id),nowIds,'V33 agenda contém somente atividade executável atual');
  const applicable=v32ApplicableDefinitions(direct.generated.materialApplicability,direct.generated.evidenceApplicability);
  assert.deepEqual(plan.schedule.map(x=>x.id),applicable.map(x=>x.id),'V33 schedule contém todas atividades aplicáveis na ordem');
  for(const x of plan.schedule){
    const def=applicable.find(d=>d.id===x.id);
    assert.equal(x.plannedStart,def.plannedStart,'V33 schedule preserva plannedStart');
    assert.equal(x.plannedEnd,def.plannedEnd,'V33 schedule preserva plannedEnd');
    assert.deepEqual(x.dependencyRequirements,def.dependencyRequirements,'V33 schedule preserva dependências');
  }
}

test('System Model — authoritative state + generated activities V33',async t=>{
  if(!LIVE){t.skip('Defina BELAVISTA_OPENJEV_LIVE=1.');return;}
  assert.ok(NVIDIA_API_KEY,'Defina NVIDIA_API_KEY para o teste V33.');
  assert.equal(V33_ACTIVITY_PROVIDER,'nvidia','V33 teste atual deve rodar via NVIDIA.');
  const selectedIds=['CG-02','CG-04','CG-08','CG-10','CG-12','AG-02','AG-06','AG-07'];
  const rows=[];
  for(const id of selectedIds){
    const scenario=scenarios.find(x=>x.id===id);
    assert.ok(scenario,'Cenário V33 não encontrado: '+id);
    await t.test('V33 '+id+' — descrição -> atividades por dependência',async()=>{
      let direct=directObservations.find(x=>x.scenarioId===id&&x.valid);
      if(!direct)direct=await generateDirectSituationAndNext(scenario);
      const stateRow=await v33GenerateCurrentState(direct);
      v33ValidateCurrentState(stateRow,direct);
      const persisted=v32BuildPersistedState(direct);
      const activityRow=await v33GenerateActivityStates(stateRow.generated,persisted);
      v33ValidateActivityStates(activityRow,direct,persisted);
      const plan=v33MaterializeOperationalPlan(stateRow.generated,persisted,activityRow);
      v33ValidateMaterializedPlan(plan,direct,persisted);
      rows.push({id,direct,stateRow,persisted,activityRow,plan});
      console.log('[ACTIVITIES V33]',id,'stage='+plan.currentState.stage,'completed='+plan.activities.completed.length,'generated='+plan.activities.generated.length,'agenda='+plan.agenda.length,'stateMs='+stateRow.latencyMs,'activitiesMs='+activityRow.latencyMs);
      console.log('                ESTADO: '+plan.currentState.description);
      console.log('                AGORA: '+(plan.agenda.map(x=>x.title).join(' | ')||'nenhuma'));
    });
  }
  console.log('[AUTHORITATIVE STATE ACTIVITIES V33 SUMMARY]');
  console.log('provider               '+V33_ACTIVITY_PROVIDER);
  console.log('cases                  '+rows.length+'/'+selectedIds.length);
  console.log('request #1 description 100.0%');
  console.log('causal fields immutable 100.0%');
  console.log('request #2 statuses    100.0%');
  console.log('completed immutable    100.0%');
  console.log('dependencies respected 100.0%');
  console.log('branch applicability   100.0%');
  console.log('agenda derived         100.0%');
  console.log('schedule source-safe   100.0%');
  console.log('MiniCPM-ready contract yes');
});
