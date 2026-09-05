// BELAVISTA_OPERATIONAL_STATE_V4
// Structural state preparation only. No planning, prioritization or operational decisions.

export const FULL_STATE_KEYS=[
  'project','clock','localities','personnel','stages','activities','materials','cash',
  'purchases','evidence','agenda','notifications','resourceRequests','cashRequests',
  'diary','blockers','stageSectorState','constraints','commercial'
];

const ARRAY_KEYS=new Set([
  'localities','personnel','stages','activities','materials','purchases','evidence',
  'agenda','notifications','resourceRequests','cashRequests','diary','blockers',
  'stageSectorState','constraints'
]);

function clone(value){
  if(typeof structuredClone==='function')return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function asArray(value){return Array.isArray(value)?value:[];}

function activityFromStage(stage,activity,index){
  const localityId=activity.localityId||activity.localidadeObraId||stage.localityId||stage.localidadeObraId||'frente-principal';
  return {
    ...activity,
    id:activity.id||`${stage.id||'stage'}-activity-${index+1}`,
    stageId:activity.stageId||stage.id,
    localityId,
    executionDescription:activity.executionDescription||activity.description||activity.title||'',
    peculiarities:asArray(activity.peculiarities),
    requirements:asArray(activity.requirements),
    evidenceRequirements:asArray(activity.evidenceRequirements),
    durationMinutes:activity.durationMinutes??(Number(activity.durationDays)>0?Number(activity.durationDays)*8*60:null),
    status:activity.status||'planned'
  };
}

export function normalizeOperationalPreviousState(previousState={},configuration={}){
  const src=previousState&&typeof previousState==='object'?clone(previousState):{};
  const configStages=asArray(configuration?.stages);
  const configPersonnel=asArray(configuration?.personnel);

 src.project=src.project&&typeof src.project==='object'?src.project:{id:configuration?.projectId||'belavista-main',name:'Aliança Park'};
  src.clock=src.clock&&typeof src.clock==='object'?src.clock:{now:new Date().toISOString(),horizonDays:Number(configuration?.planningHorizonDays)||90};
  src.stages=asArray(src.stages).length?asArray(src.stages):configStages;

  if(!asArray(src.activities).length){
    src.activities=src.stages.flatMap(stage=>asArray(stage.activities).map((activity,index)=>activityFromStage(stage,activity,index)));
  }else{
    src.activities=src.activities.map(activity=>({
      ...activity,
      localityId:activity.localityId||activity.localidadeObraId||'frente-principal'
    }));
  }

  src.personnel=(asArray(src.personnel).length?asArray(src.personnel):configPersonnel).map(person=>({
    ...person,
    localityId:person.localityId||person.localidadeObraId||'frente-principal'
  }));

  const localityIds=new Set(asArray(src.localities).map(x=>x.id).filter(Boolean));
  for(const a of src.activities)if(a.localityId)localityIds.add(a.localityId);
  for(const p of src.personnel)if(p.localityId)localityIds.add(p.localityId);
  if(!localityIds.size)localityIds.add('frente-principal');
  const known=new Map(asArray(src.localities).map(x=>[x.id,x]));
  src.localities=[...localityIds].map(id=>known.get(id)||{id,name:id==='frente-principal'?'Frente principal':id,status:'active'});

  src.materials=asArray(src.materials);
  src.purchases=asArray(src.purchases);
  src.evidence=asArray(src.evidence);
  src.agenda=asArray(src.agenda);
  src.notifications=asArray(src.notifications);
  src.resourceRequests=asArray(src.resourceRequests);
  src.cashRequests=asArray(src.cashRequests);
  src.diary=asArray(src.diary);
  src.blockers=asArray(src.blockers);
  src.stageSectorState=asArray(src.stageSectorState);
  src.constraints=asArray(src.constraints);
  src.cash=src.cash&&typeof src.cash==='object'?src.cash:{currentCents:0,committedCents:0,reserveCents:Number(configuration?.reserveCents)||0,ledger:[]};
  src.commercial=src.commercial&&typeof src.commercial==='object'?src.commercial:(configuration?.commercial||{sales:[],commissions:[],brokers:[]});
  src.version=src.version||src.stateVersion||`STATE-${Date.now().toString(36).toUpperCase()}`;

  for(const key of FULL_STATE_KEYS){
    if(!Object.hasOwn(src,key))src[key]=ARRAY_KEYS.has(key)?[]:{};
  }
  return src;
}

export function createRequestedStateEvent(trigger='api',actor={id:'admin',role:'admin'}){
  return {
    id:`EV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
    type:'operation.state.requested',
    at:new Date().toISOString(),
    actor,
    payload:{trigger,goal:'Reinferir o estado operacional completo usando metadescrições de etapas e atividades.'}
  };
}
