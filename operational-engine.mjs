import {db, listActivities, listCollaborators, listMaterials, listPurchaseReceipts, listPurchases, listCashFlowEntries, cashFlowSummary} from './persistence.mjs';
import {executionModel} from './state.js';
import {getCrewTemplate, getOverlapPlan, getProductionBaseline, getProductionPlan, getRelationsForStage} from './production-planning.mjs';

const now=()=>new Date().toISOString();
const text=value=>String(value??'').trim();
const json=value=>{try{return JSON.parse(value||'{}');}catch{return {};}};
const today=()=>new Date().toISOString().slice(0,10);
const addDays=(date,days)=>{const base=new Date(`${date}T12:00:00Z`);base.setUTCDate(base.getUTCDate()+days);return base.toISOString().slice(0,10);};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const ceilDiv=(a,b)=>Math.ceil(a/Math.max(1,b));

db.exec(`
  CREATE TABLE IF NOT EXISTS system_calibrations (
    project_id TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS agent_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    actor_uid TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    source TEXT NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    processed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS stage_readiness_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    cash_balance_cents INTEGER NOT NULL,
    allocatable_cents INTEGER NOT NULL,
    calibration_version INTEGER NOT NULL,
    stages_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS operational_notifications (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    recipient_role TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT NOT NULL DEFAULT '/',
    entity TEXT NOT NULL DEFAULT '',
    entity_id TEXT NOT NULL DEFAULT '',
    fingerprint TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TEXT NOT NULL,
    delivered_at TEXT,
    read_at TEXT,
    acknowledged_at TEXT
  );
  CREATE TABLE IF NOT EXISTS notification_outbox (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL REFERENCES operational_notifications(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    delivered_at TEXT
  );
  CREATE TABLE IF NOT EXISTS device_registrations (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    role TEXT NOT NULL,
    installation_id TEXT NOT NULL DEFAULT '',
    fcm_token TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT 'web',
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    UNIQUE(uid,installation_id)
  );
  CREATE TABLE IF NOT EXISTS job_runs (
    id TEXT PRIMARY KEY,
    job_name TEXT NOT NULL,
    period_key TEXT NOT NULL,
    status TEXT NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    result_json TEXT NOT NULL DEFAULT '{}',
    started_at TEXT NOT NULL,
    finished_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_agent_events_status ON agent_events(status,created_at);
  CREATE INDEX IF NOT EXISTS idx_notifications_role ON operational_notifications(recipient_role,status,created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_outbox_status ON notification_outbox(status,next_attempt_at);
  CREATE INDEX IF NOT EXISTS idx_job_runs_name ON job_runs(job_name,started_at DESC);
`);

const DEFAULT_CONFIG={
  reserveCents:2000000,
  dependencyProgress:100,
  notificationCooldownMinutes:240,
  stages:[
    {key:'project',name:'Projeto executivo',budgetCents:14000000,priority:100,dependsOn:[]},
    {key:'earthwork',name:'Terraplanagem',budgetCents:42000000,priority:95,dependsOn:['project']},
    {key:'drainage',name:'Drenagem Pluvial',budgetCents:50400000,priority:90,dependsOn:['earthwork']},
    {key:'water',name:'Rede de Água',budgetCents:39200000,priority:88,dependsOn:['drainage']},
    {key:'curbs',name:'Meio-fio',budgetCents:22400000,priority:76,dependsOn:['water']},
    {key:'paving',name:'Pavimentação',budgetCents:56000000,priority:70,dependsOn:['curbs','water']},
    {key:'electrical',name:'Rede Elétrica',budgetCents:44800000,priority:60,dependsOn:['paving']},
    {key:'signage',name:'Sinalização',budgetCents:11200000,priority:50,dependsOn:['electrical']}
  ]
};

const projectId='project-alianca-park';
db.prepare(`INSERT OR IGNORE INTO system_calibrations(project_id,version,config_json,updated_by,updated_at) VALUES(?,?,?,?,?)`).run(projectId,1,JSON.stringify(DEFAULT_CONFIG),'bootstrap',now());
const stageCatalog=new Map(executionModel.stages.map(stage=>[stage.key,stage]));

export function getCalibration(){
  const row=db.prepare(`SELECT project_id AS projectId,version,config_json AS configJson,updated_by AS updatedBy,updated_at AS updatedAt FROM system_calibrations WHERE project_id=?`).get(projectId);
  return {...row,config:json(row?.configJson)};
}

export function updateCalibration(input={},actor={}){
  const current=getCalibration(),source=input.config&&typeof input.config==='object'?input.config:input;
  const reserveCents=Math.max(0,Math.round(Number(source.reserveCents??current.config.reserveCents)||0));
  const dependencyProgress=Math.max(1,Math.min(100,Math.round(Number(source.dependencyProgress??current.config.dependencyProgress)||100)));
  const notificationCooldownMinutes=Math.max(5,Math.min(10080,Math.round(Number(source.notificationCooldownMinutes??current.config.notificationCooldownMinutes)||240)));
  const incoming=Array.isArray(source.stages)?source.stages:current.config.stages;
  const stages=current.config.stages.map(base=>{const patch=incoming.find(item=>item.key===base.key)||{};return {...base,budgetCents:Math.max(0,Math.round(Number(patch.budgetCents??base.budgetCents)||0)),priority:Math.max(0,Math.min(100,Math.round(Number(patch.priority??base.priority)||0))),dependsOn:Array.isArray(patch.dependsOn)?patch.dependsOn.map(text).filter(Boolean):base.dependsOn};});
  const config={reserveCents,dependencyProgress,notificationCooldownMinutes,stages},version=current.version+1,timestamp=now();
  db.prepare(`UPDATE system_calibrations SET version=?,config_json=?,updated_by=?,updated_at=? WHERE project_id=?`).run(version,JSON.stringify(config),text(actor.name||actor.uid||'Administrador'),timestamp,projectId);
  db.prepare(`INSERT INTO audit_events(entity,entity_id,action,payload_json,created_at) VALUES(?,?,?,?,?)`).run('system_calibrations',projectId,'updated',JSON.stringify({version,actor}),timestamp);
  recordAgentEvent({type:'calibration.changed',entity:'system_calibrations',entityId:projectId,actor,payload:{version}});
  return getCalibration();
}

export function recordAgentEvent({type,entity,entityId,actor={},source='local-api',payload={},externalId=''}){
  const timestamp=now(),fingerprint=text(externalId)||`${type}:${entity}:${entityId}:${timestamp.slice(0,19)}:${Math.random().toString(36).slice(2,7)}`;
  const id=`EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  try{db.prepare(`INSERT INTO agent_events(id,event_type,entity,entity_id,actor_uid,actor_role,source,fingerprint,payload_json,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,'pending',?)`).run(id,text(type),text(entity),text(entityId),text(actor.uid||'system'),text(actor.role||'system'),text(source),fingerprint,JSON.stringify(payload),timestamp);}catch(error){if(String(error.message).includes('UNIQUE'))return db.prepare(`SELECT * FROM agent_events WHERE fingerprint=?`).get(fingerprint);throw error;}
  return db.prepare(`SELECT * FROM agent_events WHERE id=?`).get(id);
}

const cashSummary=()=>{const row=db.prepare(`SELECT COALESCE(SUM(CASE WHEN kind='entrada' THEN amount_cents ELSE 0 END),0) entries,COALESCE(SUM(CASE WHEN kind='saida' THEN amount_cents ELSE 0 END),0) exits FROM cash_flow_entries`).get();return {entriesCents:Number(row.entries),exitsCents:Number(row.exits),balanceCents:Number(row.entries)-Number(row.exits)};};
const stageAlias=name=>{const value=text(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return value.includes('projeto')?'project':value.includes('terra')?'earthwork':value.includes('dren')?'drainage':value.includes('agua')?'water':value.includes('meio')?'curbs':value.includes('pav')?'paving':value.includes('eletr')?'electrical':value.includes('sinal')?'signage':'';};
const moneyLabel=cents=>Math.round(Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const normalizeKeyword=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const csvList=value=>String(value||'').split(',').map(item=>text(item,160)).filter(Boolean);
const stageProfile=stage=>stage?.executionProfile||{};
const clone=value=>structuredClone(value);

function persistedStageProfiles(){
  const rows=db.prepare(`SELECT s.name,c.ai_requirements_json AS requirementsJson,c.ai_conditions_json AS conditionsJson,c.execution_profile_json AS executionProfileJson,c.notification_targets_json AS notificationTargetsJson,c.procurement_focus_json AS procurementFocusJson,c.evidence_focus_json AS evidenceFocusJson,c.request_hints_json AS requestHintsJson,c.typical_description AS typicalDescription FROM stage_ai_config c JOIN stages s ON s.id=c.stage_id`).all();
  return Object.fromEntries(rows.map(row=>{
    const executionProfile=json(row.executionProfileJson),key=stageAlias(row.name);
    return [key,{
      requirements:Array.isArray(json(row.requirementsJson))?json(row.requirementsJson):[],
      conditions:Array.isArray(json(row.conditionsJson))?json(row.conditionsJson):[],
      typicalDescription:text(row.typicalDescription),
      requestHints:Array.isArray(json(row.requestHintsJson))?json(row.requestHintsJson):[],
      evidenceFocus:Array.isArray(json(row.evidenceFocusJson))?json(row.evidenceFocusJson):[],
      procurementFocus:Array.isArray(json(row.procurementFocusJson))?json(row.procurementFocusJson):[],
      notificationTargets:json(row.notificationTargetsJson),
      materialsTable:Array.isArray(executionProfile?.materialsTable)?executionProfile.materialsTable:[],
      executionProfile
    }];
  }).filter(([key])=>key));
}

function resolveExecutionStages(stageProfiles={}){
  const persisted=persistedStageProfiles();
  return executionModel.stages.map(stage=>{
    const stored=persisted?.[stage.key]||{};
    const incoming=stageProfiles?.[stage.key]||{};
    const patch={...stored,...(incoming&&typeof incoming==='object'?incoming:{})};
    if(!Object.keys(patch).length)return clone(stage);
    const current=stageProfile(stage);
    const notificationTargets=patch.notificationTargets&&typeof patch.notificationTargets==='object'
      ? Object.fromEntries(Object.entries({...current.notificationTargets,...patch.notificationTargets}).map(([role,list])=>[role,Array.isArray(list)?list.map(item=>text(item,160)).filter(Boolean).slice(0,8):[]]))
      : clone(current.notificationTargets||{});
    return {
      ...clone(stage),
      executionProfile:{
        ...clone(current),
        requirements:Array.isArray(patch.requirements)?patch.requirements.map(item=>text(item,320)).filter(Boolean).slice(0,16):clone(current.requirements||[]),
        conditions:Array.isArray(patch.conditions)?patch.conditions.map(item=>text(item,320)).filter(Boolean).slice(0,16):clone(current.conditions||[]),
        typicalDescription:text(patch.typicalDescription??current.typicalDescription,1500),
        requestHints:Array.isArray(patch.requestHints)?patch.requestHints.map(item=>text(item,240)).filter(Boolean).slice(0,8):clone(current.requestHints||[]),
        evidenceFocus:Array.isArray(patch.evidenceFocus)?patch.evidenceFocus.map(item=>text(item,180)).filter(Boolean).slice(0,8):clone(current.evidenceFocus||[]),
        procurementFocus:Array.isArray(patch.procurementFocus)?patch.procurementFocus.map(item=>text(item,180)).filter(Boolean).slice(0,8):clone(current.procurementFocus||[]),
        materialsTable:Array.isArray(patch.materialsTable)
          ? patch.materialsTable.map((item,index)=>({
              id:text(item?.id||`material-${index+1}`,80),
              name:text(item?.name,180),
              description:text(item?.description,280),
              quantity:item?.quantity==null?'':text(item.quantity,80),
              unit:text(item?.unit||'un',40),
              status:text(item?.status||'Planejado',80)
            })).filter(item=>item.name||item.description||item.quantity)
          : clone(current.materialsTable||[]),
        notificationTargets
      }
    };
  });
}

function buildStagePlanningContext(stage, live, readiness, computed){
  const profile=stageProfile(stage);
  const sourceMaterials=Array.isArray(profile.materialsTable)&&profile.materialsTable.length
    ? profile.materialsTable
    : (Array.isArray(profile.materials)&&profile.materials.length?profile.materials:(Array.isArray(stage.materials)?stage.materials:[]));
  const configuredMaterials=sourceMaterials.map((item,index)=>typeof item==='string'?{id:`material-${index+1}`,name:item,description:'Material base da etapa',quantity:'',unit:'un',status:'Planejado'}:item);
  return {
    stageKey:stage.key,
    stageName:stage.name,
    stageStatus:text(live?.status||'planejado',40),
    officialProgress:clamp(Number(live?.progress)||0,0,100),
    cashCoverage:Number(readiness?.coverage)||0,
    plannedStart:computed?.plannedStart||'',
    plannedFinish:computed?.plannedFinish||'',
    nextStep:text(computed?.nextStep||'',240),
    executionDescription:text(profile.typicalDescription,1500),
    requirements:Array.isArray(profile.requirements)?profile.requirements.map(item=>text(item,320)).filter(Boolean).slice(0,16):[],
    conditions:Array.isArray(profile.conditions)?profile.conditions.map(item=>text(item,320)).filter(Boolean).slice(0,16):[],
    requestHints:Array.isArray(profile.requestHints)?profile.requestHints.map(item=>text(item,240)).filter(Boolean).slice(0,8):[],
    evidenceFocus:Array.isArray(profile.evidenceFocus)?profile.evidenceFocus.map(item=>text(item,180)).filter(Boolean).slice(0,8):[],
    procurementFocus:Array.isArray(profile.procurementFocus)?profile.procurementFocus.map(item=>text(item,180)).filter(Boolean).slice(0,8):[],
    materialsTable:configuredMaterials.map(item=>({
      id:text(item?.id,80),
      name:text(item?.name,180),
      description:text(item?.description,280),
      quantity:text(item?.quantity,80),
      unit:text(item?.unit,40),
      status:text(item?.status,80)
    })).filter(item=>item.name||item.description||item.quantity).slice(0,24),
    notificationTargets:profile.notificationTargets&&typeof profile.notificationTargets==='object'?structuredClone(profile.notificationTargets):{}
  };
}

function notificationRolesForStage(stage, fallback='foreman'){
  const targets=stageProfile(stage).notificationTargets||{};
  const known=['owner','admin','foreman','supplies','sales','utility'];
  const roles=known.filter(role=>Array.isArray(targets[role])&&targets[role].length);
  return roles.length?roles:[fallback];
}

function matchesMaterial(stage, materialName=''){
  const key=stage.key, material=normalizeKeyword(materialName);
  if(key==='earthwork')return /cacamba|escavadeira|patrol|rolo|pipa/.test(material);
  if(key==='drainage')return /manilha|boca de lobo|bloco|cimento|brita|compactador/.test(material);
  if(key==='water')return /pead|cavalete|ramal|conexao|areia/.test(material);
  if(key==='curbs')return /meio-fio|meio fio|argamassa|concreto/.test(material);
  if(key==='paving')return /paralelepipedo|areia|brita|cimento/.test(material);
  if(key==='electrical')return /poste|transformador|cabo|conector|luminaria/.test(material);
  if(key==='project')return /projeto|licenca|licenca|compatibilizacao/.test(material);
  return false;
}

function stagePurchaseRisk(stage, purchases, receipts){
  const related=purchases.filter(item=>stageAlias(item.stage)===stage.key);
  const proved=receipts.filter(item=>stageAlias(item.stage)===stage.key);
  const late=related.filter(item=>/atras/i.test(item.status||''));
  const missingProof=related.filter(item=>!proved.some(receipt=>receipt.purchaseId===item.id));
  return {related,proved,late,missingProof};
}

function materialCoverageForStage(stage, materials, productionPlan){
  const physicalMaterials=(productionPlan?.materials||[]).filter(item=>Number.isFinite(Number(item.quantity))&&Number(item.quantity)>0);
  const inventoryMatch=(item)=>{
    const planName=normalizeKeyword(item.name);
    return materials.find(candidate=>{
      const candidateName=normalizeKeyword(candidate.name);
      if(planName.includes('cacamba'))return candidateName.includes('cacamba');
      if(planName.includes('solo')||planName.includes('terraplanagem'))return /solo|terra|aterro|material/.test(candidateName);
      if(planName.includes('manilha')||planName.includes('tubo'))return /manilha|tubo/.test(candidateName);
      if(planName.includes('boca de lobo'))return /boca de lobo/.test(candidateName);
      if(planName.includes('pead'))return candidateName.includes('pead');
      if(planName.includes('cavalete'))return candidateName.includes('cavalete');
      if(planName.includes('ramal'))return candidateName.includes('ramal');
      if(planName.includes('meio-fio'))return /meio-fio|meio fio/.test(candidateName);
      if(planName.includes('paralelepipedo'))return candidateName.includes('paralelepipedo');
      if(planName.includes('areia')||planName.includes('po de pedra'))return /areia|brita|cimento/.test(candidateName);
      if(planName.includes('poste'))return candidateName.includes('poste');
      if(planName.includes('cabo'))return candidateName.includes('cabo');
      if(planName.includes('placa')||planName.includes('sinalizacao'))return /placa|sinal/.test(candidateName);
      return matchesMaterial(stage,candidate.name)&&candidateName.includes(planName.slice(0,8));
    });
  };
  const related=physicalMaterials.length
    ? physicalMaterials.map(item=>{
        const inventory=inventoryMatch(item),required=Math.max(0,Number(item.quantity)||0);
        const received=inventory?Math.max(0,Number(inventory.receivedQuantity)||0):0;
        const used=inventory?Math.max(0,Number(inventory.usedQuantity)||0):0;
        const available=Math.max(0,received-used),coverage=clamp(required?available/required:1,0,1);
        return {
          id:inventory?.id||`plan-${stage.key}-${normalizeKeyword(item.name).replace(/[^a-z0-9]+/g,'-')}`,
          name:text(item.name,180),
          inventoryName:text(inventory?.name||'',180),
          plannedQuantity:required,
          requiredQuantity:required,
          receivedQuantity:received,
          usedQuantity:used,
          availableQuantity:available,
          shortfallQuantity:Math.max(0,required-available),
          unit:text(item.unit||inventory?.unit||'un',40),
          coverageRatio:coverage,
          status:coverage>=0.75?'ready':coverage>=0.45?'attention':'critical',
          source:'dwg-derived'
        };
      })
    : materials.filter(item=>matchesMaterial(stage,item.name));
  const profileMaterials=(stageProfile(stage).materialsTable||[]).map(item=>{
    const planned=Math.max(1,Number(String(item.quantity||'').replace(',','.'))||1);
    const status=normalizeKeyword(item.status||'');
    const hintedCoverage=status.includes('crit')?0.1:status.includes('aten')?0.4:status.includes('receb')||status.includes('disp')?0.9:status.includes('planej')?0.65:0.55;
    return {
      id:text(item.id||'',80),
      name:text(item.name||'',180),
      plannedQuantity:planned,
      receivedQuantity:Math.round(planned*hintedCoverage),
      usedQuantity:0,
      availableQuantity:Math.round(planned*hintedCoverage),
      coverageRatio:clamp(hintedCoverage,0,1.2),
      status:text(item.status||'Planejado',80),
      source:'stage-profile'
    };
  }).filter(item=>item.name);
  if(!related.length&&!profileMaterials.length)return {ratio:0.55,status:'unknown',related:[],shortfalls:[]};
  const ratios=related.map(item=>{
    const planned=Math.max(1,Number(item.requiredQuantity??item.plannedQuantity)||1);
    const available=Math.max(0,Number(item.availableQuantity??((Number(item.receivedQuantity)||0)-(Number(item.usedQuantity)||0))));
    return {...item,availableQuantity:available,requiredQuantity:planned,shortfallQuantity:Math.max(0,planned-available),coverageRatio:clamp(Number(item.coverageRatio??available/planned),0,1)};
  });
  const merged=[...ratios,...profileMaterials];
  const ratio=merged.reduce((sum,item)=>sum+item.coverageRatio,0)/merged.length;
  return {ratio,status:ratio>=0.75?'ready':ratio>=0.45?'attention':'critical',related:merged,shortfalls:merged.filter(item=>item.shortfallQuantity>0).map(item=>({name:item.name,quantity:item.shortfallQuantity,unit:item.unit})).slice(0,8)};
}

function personnelAvailabilityForStage(stage, live, collaborators=[]){
  const crewPlan=getCrewTemplate(stage.key),requiredHeadcount=crewPlan.reduce((sum,item)=>sum+Number(item.requiredCount||0),0),active=collaborators.filter(item=>item.active!==false);
  const hints={
    project:['projeto','engenharia','topografia','gis','planejamento'],
    earthwork:['terra','terraplanagem','maquina','operador'],
    drainage:['drenagem','vala','topografia'],
    water:['agua','hidraul','pead','ramal'],
    curbs:['meio','acabamento','topografia'],
    paving:['paviment','paralelepipedo','base'],
    electrical:['eletr','elétr','coelba'],
    signage:['sinal']
  }[stage.key]||[normalizeKeyword(stage.name)];
  const owner=normalizeKeyword(live?.owner||'');
  const matched=active.filter(person=>{
    const name=normalizeKeyword(person.name),role=normalizeKeyword(person.role),specialty=normalizeKeyword(person.specialty);
    return Boolean(owner&&(name.includes(owner)||owner.includes(name)))||hints.some(hint=>role.includes(hint)||specialty.includes(hint));
  });
  const unique=matched.filter((person,index,array)=>array.findIndex(item=>item.id===person.id)===index);
  const capacityRatio=clamp(requiredHeadcount?unique.length/requiredHeadcount:1,0,1);
  return {
    requiredHeadcount,
    registeredActiveCount:active.length,
    assignedHeadcount:unique.length,
    capacityRatio,
    effectiveCapacityRatio:Math.max(0.25,capacityRatio),
    status:capacityRatio>=1?'ready':unique.length?'attention':'registration_pending',
    matchedRegisteredPeople:unique.map(person=>({id:person.id,name:person.name,role:person.role,specialty:person.specialty})),
    crewPlan,
    availabilitySource:'collaborators.active'
  };
}

function computeAutomationForStage(stage, live, readiness, materials, purchases, receipts, dependencyEndByKey, options={}){
  const production=stage.production||{},productionPlan=getProductionPlan(stage.key,{...production,name:stage.name});
  const calibrationStage=options.calibrationStage||{};
  const totalQuantity=Math.max(1,Number(productionPlan.totalQuantity)||1);
  const confirmedProgress=clamp(Number(live?.progress)||0,0,100);
  const remainingProgress=Math.max(0,100-confirmedProgress);
  const remainingQuantity=Math.max(0,totalQuantity*(remainingProgress/100));
  const baseRate=Math.max(1,Number(productionPlan.baseRate)||Number(production.rate)||1);
  const material=materialCoverageForStage(stage,materials,productionPlan);
  const personnel=personnelAvailabilityForStage(stage,live,options.collaborators||[]);
  const purchase=stagePurchaseRisk(stage,purchases,receipts);
  const cashCoverage=clamp((Number(readiness?.coverage)||0)/100,0,1);
  const proofFactor=purchase.missingProof.length?0.4:1;
  const factor=clamp((material.ratio*0.35)+(cashCoverage*0.3)+(personnel.effectiveCapacityRatio*0.2)+(proofFactor*0.15),0.15,1);
  const adjustedRate=Math.max(1,Math.round(baseRate*factor));
  const durationDays=Math.max(1,remainingQuantity?ceilDiv(remainingQuantity,adjustedRate):1);
  const dependencyDates=(stage.dependsOn||[]).map(key=>dependencyEndByKey.get(key)).filter(Boolean);
  const blockedBy=(readiness?.blockedBy||[]).slice();
  const earliestStart=dependencyDates.length?dependencyDates.sort().at(-1):(options.referenceDate||today());
  const plannedStart=blockedBy.length?addDays(earliestStart,1):earliestStart;
  const plannedFinish=addDays(plannedStart,Math.max(0,durationDays-1));
  const nextStep=blockedBy.length?`Aguardar liberação de ${blockedBy.join(', ')}`:material.status==='critical'?'Regularizar materiais críticos':personnel.status==='registration_pending'?'Cadastrar equipe e responsável da frente':purchase.missingProof.length?'Anexar comprovantes e liberar compra':'Executar a próxima frente planejada';
  const relations=getRelationsForStage(stage.key),overlapPlan=getOverlapPlan(stage.key,plannedStart,plannedFinish),estimatedBudgetCents=Math.max(0,Number(calibrationStage.budgetCents)||0);
  const planningContext=buildStagePlanningContext(stage,live,readiness,{plannedStart,plannedFinish,nextStep});
  planningContext.production=productionPlan;
  planningContext.materialPlan=material.related;
  planningContext.personnel=personnel;
  planningContext.relations=relations;
  planningContext.overlapPlan=overlapPlan;
  planningContext.calculationBasis=productionPlan.basis;
  return {
    key:stage.key,
    name:stage.name,
    priority:Number(calibrationStage.priority)||0,
    production:{
      totalQuantity,
      remainingQuantity:Math.round(remainingQuantity*100)/100,
      unit:productionPlan.unit||production.unit||'un',
      baseRate,
      adjustedRate,
      rateUnit:productionPlan.rateUnit||production.rateUnit||`${baseRate}/dia`,
      secondary:productionPlan.secondary||{},
      materials:productionPlan.materials||[],
      source:productionPlan.source||'calibration',
      basis:productionPlan.basis||[],
      estimatedBudgetCents,
      unitCostCents:Math.round(estimatedBudgetCents/totalQuantity)
    },
    materialStatus:material.status,
    materialCoverage:Math.round(material.ratio*100),
    materialPlan:material.related,
    materialShortfalls:material.shortfalls,
    personnel,
    cashCoverage:Number(readiness?.coverage)||0,
    purchaseProofs:{
      total:purchase.related.length,
      proved:purchase.proved.length,
      missing:purchase.missingProof.length,
      late:purchase.late.length
    },
    blockedBy,
    plannedStart,
    plannedFinish,
    durationDays,
    nextStep,
    relations,
    overlapPlan,
    calculationBasis:productionPlan.basis||[],
    planningContext,
    materialAlerts:material.related.filter(item=>item.coverageRatio<0.5).map(item=>`${item.name}: cobertura ${Math.round(item.coverageRatio*100)}%`).slice(0,4),
    purchaseAlerts:purchase.missingProof.map(item=>`${item.description} sem comprovante`).slice(0,4)
  };
}

function plannedActivitiesForStage(stage, automation, live){
  const owner=live?.owner||stage.name;
  const base=[
    {
      id:`auto-${stage.key}-plan`,
      name:`Planejar ${stage.name.toLowerCase()}`,
      category:'Planejamento automático',
      status:automation.blockedBy.length?'bloqueado':'planejado',
      progress:Math.min(100, Math.max(10, 100-automation.production.remainingQuantity/Math.max(1,automation.production.totalQuantity)*100)),
      plannedStart:automation.plannedStart,
      plannedEnd:automation.plannedStart,
      properties:{
        source:'automation',
        kind:'planning',
        nextStep:automation.nextStep,
        materialCoverage:automation.materialCoverage,
        purchaseProofMissing:automation.purchaseProofs.missing,
        production:automation.production,
        personnel:automation.personnel,
        relations:automation.relations,
        overlapPlan:automation.overlapPlan,
        calculationBasis:automation.calculationBasis
      },
      owner
    },
    {
      id:`auto-${stage.key}-execute`,
      name:`Executar ${stage.name.toLowerCase()}`,
      category:'Execução automática',
      status:automation.blockedBy.length?'bloqueado':automation.materialStatus==='critical'?'aguardando_material':'planejado',
      progress:clamp(Number(live?.progress)||0,0,100),
      plannedStart:automation.plannedStart,
      plannedEnd:automation.plannedFinish,
      properties:{
        source:'automation',
        kind:'execution',
        unit:automation.production.unit,
        plannedQuantity:automation.production.totalQuantity,
        remainingQuantity:automation.production.remainingQuantity,
        adjustedRate:automation.production.adjustedRate,
        rateUnit:automation.production.rateUnit,
        crew:automation.personnel,
        materialPlan:automation.materialPlan,
        materialShortfalls:automation.materialShortfalls,
        relations:automation.relations,
        overlapPlan:automation.overlapPlan,
        materialAlerts:automation.materialAlerts,
        purchaseAlerts:automation.purchaseAlerts
      },
      owner
    },
    {
      id:`auto-${stage.key}-evidence`,
      name:`Conferir comprovantes e caixa de ${stage.name.toLowerCase()}`,
      category:'Governança automática',
      status:automation.purchaseProofs.missing||automation.cashCoverage<35?'pendente':'planejado',
      progress:automation.purchaseProofs.missing?25:automation.cashCoverage>=80?100:60,
      plannedStart:automation.plannedStart,
      plannedEnd:automation.plannedStart,
      properties:{
        source:'automation',
        kind:'governance',
        cashCoverage:automation.cashCoverage,
        purchaseProofs:automation.purchaseProofs,
        materialShortfalls:automation.materialShortfalls,
        personnel:automation.personnel,
        productionSource:automation.production.source
      },
      owner
    }
  ];
  return base;
}

function saveJobRun(name, payload, periodKey=today()){
  const id=`JOB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  db.prepare(`INSERT INTO job_runs(id,job_name,period_key,status,fingerprint,result_json,started_at,finished_at) VALUES(?,?,?,?,?,?,?,?)`).run(id,name,periodKey,'ok',`${name}:${periodKey}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`,JSON.stringify(payload),now(),now());
  return id;
}

function upsertAutomationActivity(stageId, activity){
  const ownerId=db.prepare(`SELECT id FROM collaborators WHERE name=? LIMIT 1`).get(text(activity.owner))?.id||null;
  const exists=db.prepare(`SELECT id FROM activities WHERE id=?`).get(activity.id);
  if(exists){
    db.prepare(`UPDATE activities SET stage_id=?,category=?,name=?,status=?,progress=?,owner_id=?,planned_start=?,planned_end=?,properties_json=? WHERE id=?`).run(
      stageId, text(activity.category), text(activity.name), text(activity.status), clamp(Number(activity.progress)||0,0,100), ownerId, text(activity.plannedStart), text(activity.plannedEnd), JSON.stringify(activity.properties||{}), activity.id
    );
  }else{
    db.prepare(`INSERT INTO activities(id,stage_id,category,name,status,progress,owner_id,planned_start,planned_end,properties_json) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
      activity.id, stageId, text(activity.category), text(activity.name), text(activity.status), clamp(Number(activity.progress)||0,0,100), ownerId, text(activity.plannedStart), text(activity.plannedEnd), JSON.stringify(activity.properties||{})
    );
  }
}

export function buildAutomationPanorama(referenceDate=today(), stageProfiles={}){
  const readiness=latestOperationalState();
  const activities=listActivities();
  const collaborators=listCollaborators();
  const materials=listMaterials();
  const purchases=listPurchases();
  const receipts=listPurchaseReceipts();
  const stageDefinitions=resolveExecutionStages(stageProfiles);
  const calibration=getCalibration(),calibrationByKey=new Map((calibration.config?.stages||[]).map(item=>[item.key,item]));
  const stageRows=db.prepare(`SELECT id,name,status,progress,owner FROM stages WHERE project_id=? ORDER BY id`).all(projectId);
  const liveByKey=new Map(stageRows.map(row=>[stageAlias(row.name),row]));
  const readinessByKey=new Map((readiness.stages||[]).map(item=>[item.key,item]));
  const dependencyEndByKey=new Map();
  const stages=[];
  for(const stage of stageDefinitions){
    const live=liveByKey.get(stage.key)||{name:stage.name,status:'planejado',progress:0,owner:''};
    const computed=computeAutomationForStage(stage,live,readinessByKey.get(stage.key),materials,purchases,receipts,dependencyEndByKey,{referenceDate,calibrationStage:calibrationByKey.get(stage.key),collaborators,activities});
    dependencyEndByKey.set(stage.key,computed.plannedFinish);
    const stageId=Number(live.id)||null;
    const plannedActivities=plannedActivitiesForStage(stage,computed,live);
    stages.push({
      key:stage.key,
      stageId,
      name:stage.name,
      executionProfile:structuredClone(stageProfile(stage)),
      owner:live.owner||'A definir',
      status:live.status,
      progress:clamp(Number(live.progress)||0,0,100),
      blockedBy:computed.blockedBy,
      automation:computed,
      plannedActivities,
      existingActivities:activities.filter(item=>stageAlias(item.stage)===stage.key).slice(0,6)
    });
  }
  const criticalStages=stages.filter(item=>item.automation.materialStatus==='critical'||item.automation.cashCoverage<35||item.automation.purchaseProofs.late>0);
  const upcomingNotifications=criticalStages.slice(0,6).flatMap(item=>{
    const roles=notificationRolesForStage(item, item.automation.cashCoverage<35?'owner':'foreman');
    return roles.map(role=>({
      role,
      type:item.automation.cashCoverage<35?'cash.coverage.low':'material.purchase.pending',
      severity:item.automation.cashCoverage<35||item.automation.purchaseProofs.late?'warning':'info',
      title:item.automation.cashCoverage<35?`${item.name} sem cobertura suficiente`:`${item.name} pede ação de suprimentos`,
      message:item.automation.cashCoverage<35
        ? `Cobertura atual de ${item.automation.cashCoverage}%. Administração superior do caixa deve revisar a alocação.`
        : item.automation.materialAlerts.concat(item.automation.purchaseAlerts).join(' | ')||item.automation.nextStep,
      actionUrl:item.automation.cashCoverage<35?'/?view=finance':'/?view=stages',
      destinations:(item.executionProfile?.notificationTargets?.[role]||[]).slice(0,6)
    }));
  });
  return {
    projectId,
    referenceDate,
    generatedAt:now(),
    summary:{
      stages:stages.length,
      criticalStages:criticalStages.length,
      materialsTracked:materials.length,
      purchasesTracked:purchases.length,
      receiptsTracked:receipts.length,
      nextNotifications:upcomingNotifications.length,
      cash:readiness.cash,
      lots:getProductionBaseline().site.lotCount,
      physicalPlans:stages.length,
      registeredActivePeople:collaborators.filter(item=>item.active!==false).length
    },
    productionBaseline:getProductionBaseline(),
    stages,
    notifications:upcomingNotifications
  };
}

export function runAutomationPlanner({referenceDate=today(), publishNotifications=true, syncActivities=true, stageProfiles={}}={}){
  const panorama=buildAutomationPanorama(referenceDate, stageProfiles);
  if(syncActivities){
    for(const stage of panorama.stages){
      if(!stage.stageId)continue;
      for(const activity of stage.plannedActivities) upsertAutomationActivity(stage.stageId,activity);
    }
  }
  if(publishNotifications){
    for(const notification of panorama.notifications){
      enqueueNotification({
        role:notification.role,
        type:notification.type,
        severity:notification.severity,
        title:notification.title,
        message:notification.message,
        actionUrl:notification.actionUrl,
        entity:'automation',
        entityId:referenceDate,
        fingerprint:`automation:${referenceDate}:${notification.role}:${notification.type}:${notification.title}`
      });
    }
  }
  const jobId=saveJobRun('automation-planner', {
    summary:panorama.summary,
    stageKeys:panorama.stages.map(item=>item.key),
    notificationCount:panorama.notifications.length
  }, referenceDate.slice(0,7));
  return {...panorama, jobId};
}

function summarizeOperationalGuidance(operational, panorama){
  const stages=panorama?.stages||[];
  const ranked=[...stages].sort((a,b)=>{
    const aScore=(a.automation.cashCoverage<35?4:0)+(a.automation.purchaseProofs.missing?3:0)+(a.automation.materialStatus==='critical'?2:0)+(a.blockedBy.length?0:1);
    const bScore=(b.automation.cashCoverage<35?4:0)+(b.automation.purchaseProofs.missing?3:0)+(b.automation.materialStatus==='critical'?2:0)+(b.blockedBy.length?0:1);
    return bScore-aScore||b.progress-a.progress;
  });
  const focal=ranked[0]||null;
  const cashAction=focal?(
    focal.automation.cashCoverage<35
      ? `Reforçar caixa da etapa ${focal.name} antes de liberar a próxima frente.`
      : focal.automation.purchaseProofs.missing
        ? `Anexar comprovantes e validar suprimentos de ${focal.name}.`
        : focal.automation.materialStatus==='critical'
          ? `Regularizar materiais críticos de ${focal.name}.`
          : `Executar a próxima frente planejada em ${focal.name}.`
  ):'Revisar a distribuição do caixa e a priorização das frentes.';
  const materials=focal?.automation.materialAlerts?.slice(0,2)||[];
  const purchases=focal?.automation.purchaseAlerts?.slice(0,2)||[];
  const nextAgenda=(focal?.plannedActivities||[]).slice(0,2).map(item=>({
    id:item.id,
    title:item.name,
    dueAt:item.plannedEnd||item.plannedStart,
    owner:item.owner,
    status:item.status
  }));
  return {
    focalStage:focal?{
      key:focal.key,
      name:focal.name,
      plannedStart:focal.automation.plannedStart,
      plannedFinish:focal.automation.plannedFinish,
      adjustedRate:focal.automation.production.adjustedRate,
      blockedBy:focal.blockedBy,
      executionDescription:text(focal.executionProfile?.typicalDescription,1200),
      requirements:(focal.executionProfile?.requirements||[]).slice(0,6),
      conditions:(focal.executionProfile?.conditions||[]).slice(0,6),
      requestHints:(focal.executionProfile?.requestHints||[]).slice(0,3),
      notificationTargets:structuredClone(focal.executionProfile?.notificationTargets||{})
    }:null,
    cashAction,
    materialActions:materials,
    purchaseActions:purchases,
    nextAgenda,
    nvidiaRequestContext:focal?{
      stage:focal.automation.planningContext,
      operationalSummary:{
        balanceCents:Number(operational?.cash?.balanceCents||0),
        reserveCents:Number(operational?.cash?.reserveCents||0),
        allocatableCents:Number(operational?.cash?.allocatableCents||0)
      }
    }:null,
    summary:focal
      ? `${focal.name}: ${cashAction} Cobertura ${focal.automation.cashCoverage}%, materiais ${focal.automation.materialCoverage}%.`
      : 'Sem etapa focal definida.'
  };
}

export function runOperationalLoop({referenceDate=today(), reason='client.tick', syncActivities=true, publishNotifications=true, includeNotifications=true, role='owner', clientState=null, stageProfiles={}}={}){
  const operational=recalculateOperationalState(reason);
  const panorama=runAutomationPlanner({referenceDate,publishNotifications,syncActivities,stageProfiles});
  const notifications=includeNotifications?listNotifications(role):[];
  const calibration=getCalibration();
  const guidance=summarizeOperationalGuidance(operational,panorama);
  const agenda=panorama.stages.flatMap(stage=>stage.plannedActivities.map(activity=>({
    id:activity.id,
    stageKey:stage.key,
    stageName:stage.name,
    title:activity.name,
    owner:activity.owner,
    status:activity.status,
    category:activity.category,
    plannedStart:activity.plannedStart,
    plannedEnd:activity.plannedEnd,
    production:stage.automation.production,
    personnel:stage.automation.personnel,
    materialPlan:stage.automation.materialPlan,
    materialShortfalls:stage.automation.materialShortfalls,
    relations:stage.automation.relations,
    overlapPlan:stage.automation.overlapPlan,
    calculationBasis:stage.automation.calculationBasis
  }))).sort((a,b)=>String(a.plannedStart).localeCompare(String(b.plannedStart))).slice(0,18);
  const loopId=saveJobRun('operational-loop',{
    reason:text(reason),
    role:text(role),
    referenceDate,
    focalStage:guidance.focalStage?.key||null,
    notificationCount:notifications.length,
    agendaCount:agenda.length,
    clientState:clientState&&typeof clientState==='object'?{
      view:text(clientState.view||'',40),
      mapContext:Boolean(clientState.mapContext),
      globalSituation:Boolean(clientState.globalSituation),
      recordsTracked:Math.max(0,Number(clientState.recordsTracked)||0),
      notificationsTracked:Math.max(0,Number(clientState.notificationsTracked)||0)
    }:{}
  }, referenceDate);
  return {
    loopId,
    reason:text(reason),
    referenceDate,
    generatedAt:now(),
    clientState:clientState&&typeof clientState==='object'?clientState:null,
    calibration,
    cashSummary:cashFlowSummary(),
    cashEntries:listCashFlowEntries(),
    operational,
    panorama,
    agenda,
    guidance,
    notifications
  };
}

// Leitura enxuta para a tela mobile de monitoria. Os workers continuam
// escrevendo no mesmo diário operacional; esta função apenas organiza a
// hierarquia de fatos, inferências, propagações e jobs para visualização.
export function buildWorkerMonitor(role='admin'){
  const eventRows=db.prepare(`SELECT id,event_type AS type,entity,entity_id AS entityId,actor_uid AS actorUid,actor_role AS actorRole,source,payload_json AS payloadJson,status,created_at AS createdAt,processed_at AS processedAt FROM agent_events ORDER BY created_at DESC LIMIT 40`).all();
  const events=eventRows.map(row=>({...row,payload:json(row.payloadJson)}));
  const jobs=db.prepare(`SELECT id,job_name AS jobName,period_key AS periodKey,status,result_json AS resultJson,started_at AS startedAt,finished_at AS finishedAt FROM job_runs ORDER BY started_at DESC LIMIT 20`).all().map(row=>({...row,result:json(row.resultJson)}));
  const notificationCounts=db.prepare(`SELECT recipient_role AS role,status,COUNT(*) AS count FROM operational_notifications GROUP BY recipient_role,status`).all().reduce((out,row)=>{const key=`${row.role}:${row.status}`;out[key]=Number(row.count)||0;return out;},{});
  const latestLoop=jobs.find(job=>job.jobName==='operational-loop')||null;
  const latestPlanner=jobs.find(job=>job.jobName==='automation-planner')||null;
  const state=latestOperationalState();
  const panorama=buildAutomationPanorama();
  const agenda=panorama.stages.flatMap(stage=>(stage.plannedActivities||[]).map(activity=>({
    ...activity,
    stageKey:stage.key,
    stageName:stage.name,
    priority:stage.automation.priority
  }))).sort((a,b)=>String(a.plannedStart||a.plannedEnd||'').localeCompare(String(b.plannedStart||b.plannedEnd||''))).slice(0,18);
  const aiProvider=String(process.env.AI_PROVIDER||'gemini').trim().toLowerCase();
  const aiConfigured=aiProvider==='nvidia'?Boolean(process.env.NVIDIA_API_KEY):Boolean(process.env.GEMINI_API_KEY);
  return {
    generatedAt:now(),
    role:text(role||'admin'),
    worker:{name:'Aliança Park · Operational Worker',status:'online',mode:'local-loop',pollIntervalSeconds:8,aiProvider,aiConfigured,externalMessaging:'disabled in test mode'},
    hierarchy:{inputCount:events.length,inferenceCount:events.filter(event=>event.status==='processed').length,propagationCount:(latestLoop?.result?.notificationCount||0)+(latestLoop?.result?.agendaCount||agenda.length),agendaCount:latestLoop?.result?.agendaCount||agenda.length},
    cash:state.cash,
    operational:state,
    panoramaSummary:panorama.summary,
    productionBaseline:panorama.productionBaseline,
    stages:panorama.stages.map(stage=>({key:stage.key,name:stage.name,status:stage.status,progress:stage.progress,blockedBy:stage.blockedBy,priority:stage.automation.priority,cashCoverage:stage.automation.cashCoverage,materialStatus:stage.automation.materialStatus,nextStep:stage.automation.nextStep,production:stage.automation.production,materialPlan:stage.automation.materialPlan,materialShortfalls:stage.automation.materialShortfalls,personnel:stage.automation.personnel,relations:stage.automation.relations,overlapPlan:stage.automation.overlapPlan,calculationBasis:stage.automation.calculationBasis,plannedActivities:stage.plannedActivities.slice(0,4)})),
    events,
    jobs,
    agenda,
    notificationCounts,
    latestLoop:latestLoop?{id:latestLoop.id,startedAt:latestLoop.startedAt,status:latestLoop.status,result:latestLoop.result}:null,
    latestPlanner:latestPlanner?{id:latestPlanner.id,startedAt:latestPlanner.startedAt,status:latestPlanner.status,result:latestPlanner.result}:null
  };
}

function enqueueNotification({role,type,severity,title,message,entity='',entityId='',actionUrl='/',fingerprint}){
  const existing=db.prepare(`SELECT id FROM operational_notifications WHERE fingerprint=?`).get(fingerprint);if(existing)return existing.id;
  const timestamp=now(),id=`NTF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,outboxId=`OBX-${id.slice(4)}`;
  db.prepare(`INSERT INTO operational_notifications(id,project_id,recipient_role,type,severity,title,message,action_url,entity,entity_id,fingerprint,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'queued',?)`).run(id,projectId,role,type,severity,title,message,actionUrl,entity,entityId,fingerprint,timestamp);
  db.prepare(`INSERT INTO notification_outbox(id,notification_id,status,attempts,next_attempt_at,created_at) VALUES(?,?,'pending',0,?,?)`).run(outboxId,id,timestamp,timestamp);
  return id;
}

const normalizeConditionValue=value=>normalizeKeyword(value).replace(/\s+/g,' ').trim();
const conditionPayload=event=>{try{return JSON.parse(event?.payload_json||'{}');}catch{return {};}};
const eventStatusText=(event,payload)=>normalizeConditionValue(`${event?.event_type||''} ${event?.source||''} ${payload?.status||''} ${payload?.conditionStatus||''} ${payload?.condition_status||''} ${payload?.notes||''} ${payload?.observations||''} ${payload?.message||''} ${payload?.description||''} ${payload?.missing||''} ${payload?.reason||''} ${payload?.condition||''} ${payload?.details||''}`);
function linkedConditionEvents(stageKey,activityId,sessionId){
  const rows=db.prepare(`SELECT id,event_type,entity,entity_id,source,payload_json,created_at FROM agent_events WHERE (entity_id IN (?,?) OR entity='workbench_diary') AND created_at>=? ORDER BY created_at DESC LIMIT 400`).all(text(activityId),text(sessionId),new Date(Date.now()-1000*60*60*24*45).toISOString());
  return rows.filter(event=>{if(event.entity!=='workbench_diary')return true;const payload=conditionPayload(event);return String(payload.activityId||payload.activity_id||'')===String(activityId);});
}
function conditionMatches(condition,{events=[],diaryRows=[]}={}){
  const kind=normalizeConditionValue(condition?.kind),notifyWhen=normalizeConditionValue(condition?.notifyWhen);
  if(notifyWhen==='production-below-reference'||kind==='rendimento'){
    const threshold=Number(condition?.metric?.value);
    const unit=normalizeConditionValue(String(condition?.metric?.unit||'').split('/')[0]);
    const diaryMatch=diaryRows.find(row=>{const value=Number(row.production);const rowUnit=normalizeConditionValue(row.unit);const compatible=!unit||!rowUnit||rowUnit===unit||rowUnit.includes(unit)||unit.includes(rowUnit);return Number.isFinite(value)&&threshold>0&&compatible&&(value<threshold||normalizeConditionValue(row.status).includes('bloque'))&&new Date(row.createdAt||row.created_at||0).getTime()>=Date.now()-1000*60*60*24*45;});
    if(diaryMatch)return {sourceId:diaryMatch.id,sourceText:`${diaryMatch.production} ${diaryMatch.unit||unit} · ${diaryMatch.status||'registrado'}`};
    const eventMatch=events.find(event=>{const payload=conditionPayload(event),value=Number(payload.production??payload.quantity??payload.producedQuantity),eventUnit=normalizeConditionValue(String(payload.unit||'').split('/')[0]),compatible=!unit||!eventUnit||eventUnit===unit||eventUnit.includes(unit)||unit.includes(eventUnit),status=normalizeConditionValue(payload.status||payload.conditionStatus||'');return Number.isFinite(value)&&threshold>0&&compatible&&(value<threshold||status.includes('bloque'));});
    return eventMatch?{sourceId:eventMatch.id,sourceText:eventStatusText(eventMatch,conditionPayload(eventMatch))}:{sourceId:'',sourceText:''};
  }
  const watchTerms=(Array.isArray(condition?.watchTerms)?condition.watchTerms:[]).map(normalizeConditionValue).filter(Boolean),negativeTerms=(Array.isArray(condition?.negativeTerms)?condition.negativeTerms:[]).map(normalizeConditionValue).filter(Boolean),blockedTerms=['bloqueado','impedido','pendente','aguardando','recusado','atraso','atrasado','falta','faltando','sem'];
  const match=events.find(event=>{const payload=conditionPayload(event),haystack=eventStatusText(event,payload),explicitBlocked=blockedTerms.some(term=>haystack.includes(term))||['blocked','bloqueado','impedido'].includes(normalizeConditionValue(payload.conditionStatus||payload.status));const watchHit=!watchTerms.length||watchTerms.some(term=>haystack.includes(term));const negativeHit=!negativeTerms.length||negativeTerms.some(term=>haystack.includes(term));return explicitBlocked&&watchHit&&(negativeHit||!watchTerms.length);});
  return match?{sourceId:match.id,sourceText:eventStatusText(match,conditionPayload(match))}:{sourceId:'',sourceText:''};
}

export function evaluateActivityConditionNotifications({referenceDate=today(),dryRun=false}={}){
  const rows=db.prepare(`SELECT stage_key AS stageKey,input_sessions_json AS inputSessionsJson FROM stage_workbench_state WHERE input_sessions_json IS NOT NULL AND input_sessions_json<>'[]'`).all();
  let sessionsChecked=0,conditionsChecked=0,matches=0,queued=0;
  const notifications=[];
  for(const row of rows){
    const sessions=json(row.inputSessionsJson);
    if(!Array.isArray(sessions))continue;
    for(const session of sessions){
      sessionsChecked++;
      const activityId=text(session?.activityId||session?.id),conditions=Array.isArray(session?.inference?.conditions)&&session.inference.conditions.length?session.inference.conditions:[];
      if(!activityId||!conditions.length||session?.automation?.notifyWorker===false)continue;
      const events=linkedConditionEvents(row.stageKey,activityId,session.id),diaryRows=db.prepare(`SELECT id,production,unit,status,notes,created_at AS createdAt FROM workbench_diary WHERE stage_key=? AND activity_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 100`).all(row.stageKey,activityId,new Date(Date.now()-1000*60*60*24*45).toISOString());
      for(const condition of conditions){
        conditionsChecked++;
        const match=conditionMatches(condition,{events,diaryRows});
        if(!match.sourceId)continue;
        matches++;
        const roles=Array.isArray(condition.notifyRoles)&&condition.notifyRoles.length?condition.notifyRoles:['owner'],label=text(condition.label||condition.kind||'Condição operacional'),message=text(condition.message||condition.trigger||'Condição operacional identificada; revisar a frente e o cronograma.');
        for(const role of roles){
          const notification={role:text(role)||'owner',type:`activity.condition.${text(condition.kind||'operational')||'operational'}`,severity:text(condition.severity||'warning')||'warning',title:`${text(session.title||'Atividade')}: ${label}`,message:`${message} Registro: ${match.sourceText||'condição confirmada'}.`,entity:'activity_condition',entityId:activityId,actionUrl:`/admin/workers/activity?stage=${encodeURIComponent(row.stageKey)}&activity=${encodeURIComponent(activityId)}`,fingerprint:`activity-condition:${row.stageKey}:${activityId}:${text(condition.id||label)}:${match.sourceId}:${notificationRoleKey(role)}`};
          notifications.push(notification);
          if(!dryRun){
            const alreadyQueued=db.prepare(`SELECT id FROM operational_notifications WHERE fingerprint=?`).get(notification.fingerprint);
            if(!alreadyQueued){const id=enqueueNotification(notification);if(id)queued++;}
          }
        }
      }
    }
  }
  const jobId=dryRun?null:saveJobRun('activity-condition-notifications',{referenceDate,sessionsChecked,conditionsChecked,matches,queued});
  return {jobId,referenceDate,dryRun,sessionsChecked,conditionsChecked,matches,queued,notifications};
}

function notificationRoleKey(role){return text(role||'owner').replace(/[^a-z0-9_-]/gi,'-').toLowerCase()||'owner';}

export function recalculateOperationalState(reason='manual'){
  const calibration=getCalibration(),config=calibration.config,cash=cashSummary(),available=Math.max(0,cash.balanceCents-Number(config.reserveCents||0));
  const liveRows=db.prepare(`SELECT name,status,progress,owner FROM stages WHERE project_id=?`).all(projectId),liveByKey=new Map(liveRows.map(row=>[stageAlias(row.name),row]));
  const spentRows=db.prepare(`SELECT stage,COALESCE(SUM(amount_cents),0) amount FROM cash_flow_entries WHERE kind='saida' GROUP BY stage`).all(),spentByKey=new Map(spentRows.map(row=>[stageAlias(row.stage),Number(row.amount)||0]));
  let remainingCash=available;
  const stages=config.stages.map(stage=>{
    const live=liveByKey.get(stage.key)||{},spentCents=spentByKey.get(stage.key)||0,needCents=Math.max(0,Number(stage.budgetCents||0)-spentCents);
    const blockedBy=(stage.dependsOn||[]).filter(key=>(Number(liveByKey.get(key)?.progress)||0)<Number(config.dependencyProgress||100));
    const eligible=!blockedBy.length&&needCents>0,allocatedCents=eligible?Math.min(remainingCash,needCents):0;if(eligible)remainingCash-=allocatedCents;
    const coverage=needCents?Math.min(100,Math.round(allocatedCents/needCents*100)):100;
    return {key:stage.key,name:stage.name,priority:stage.priority,status:live.status||'planejado',progress:Number(live.progress)||0,owner:live.owner||'',budgetCents:stage.budgetCents,spentCents,needCents,allocatedCents,coverage,eligible,blockedBy};
  });
  const timestamp=now(),id=`SNP-${Date.now().toString(36).toUpperCase()}`;
  db.prepare(`INSERT INTO stage_readiness_snapshots(id,project_id,reason,cash_balance_cents,allocatable_cents,calibration_version,stages_json,created_at) VALUES(?,?,?,?,?,?,?,?)`).run(id,projectId,text(reason),cash.balanceCents,available,calibration.version,JSON.stringify(stages),timestamp);
  const active=stages.find(stage=>stage.eligible&&stage.allocatedCents>0),cashBand=cash.balanceCents<0?'negative':available===0?'reserved':available<5000000?'low':'available';
  enqueueNotification({role:'owner',type:'cash.readiness',severity:cashBand==='negative'?'critical':cashBand==='low'?'warning':'info',title:'Caixa e frentes recalculados',message:active?`${active.name} recebeu sugestão de ${Math.round(active.allocatedCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}; cobertura ${active.coverage}%.`:`Nenhuma frente recebeu alocação. Verifique reserva mínima e dependências.`,entity:'cash_flow',entityId:id,actionUrl:'/?view=finance',fingerprint:`cash:${cash.balanceCents}:${active?.key||'blocked'}:${calibration.version}`});
  if(!active)enqueueNotification({role:'admin',type:'system.calibration',severity:'warning',title:'Distribuição sem frente elegível',message:'O caixa foi recalculado, mas dependências ou calibrações impediram uma nova alocação.',entity:'system_calibrations',entityId:projectId,actionUrl:'/?view=settings',fingerprint:`calibration:no-active:${cash.balanceCents}:${calibration.version}`});
  for(const stage of stages.filter(item=>item.blockedBy.length))enqueueNotification({role:'foreman',type:'stage.blocked',severity:'info',title:`${stage.name} permanece bloqueada`,message:`Dependências: ${stage.blockedBy.join(', ')}. Continue alimentando medições e evidências da frente atual.`,entity:'stage',entityId:stage.key,actionUrl:'/?view=stages',fingerprint:`stage-blocked:${stage.key}:${stage.blockedBy.join(',')}:${calibration.version}`});
  return {id,generatedAt:timestamp,reason,cash:{...cash,reserveCents:config.reserveCents,allocatableCents:available,unallocatedCents:remainingCash},calibrationVersion:calibration.version,stages};
}

export function latestOperationalState(){const row=db.prepare(`SELECT id,reason,cash_balance_cents AS cashBalanceCents,allocatable_cents AS allocatableCents,calibration_version AS calibrationVersion,stages_json AS stagesJson,created_at AS generatedAt FROM stage_readiness_snapshots ORDER BY created_at DESC LIMIT 1`).get();if(!row)return recalculateOperationalState('bootstrap');const totals=cashSummary(),reserveCents=Number(getCalibration().config.reserveCents)||0;return {...row,cash:{...totals,balanceCents:Number(row.cashBalanceCents)||0,reserveCents,allocatableCents:Number(row.allocatableCents)||0,unallocatedCents:0},stages:json(row.stagesJson)};}
export function listNotifications(role='owner',limit=80){const safeLimit=Math.max(1,Math.min(250,Number(limit)||80));if(text(role)==='developer')return db.prepare(`SELECT id,recipient_role AS recipientRole,type,severity,title,message,action_url AS actionUrl,entity,entity_id AS entityId,status,created_at AS createdAt,delivered_at AS deliveredAt,read_at AS readAt,acknowledged_at AS acknowledgedAt FROM operational_notifications WHERE recipient_role IN ('owner','admin','foreman','supplies','sales','utility') ORDER BY created_at DESC LIMIT ?`).all(safeLimit);return db.prepare(`SELECT id,recipient_role AS recipientRole,type,severity,title,message,action_url AS actionUrl,entity,entity_id AS entityId,status,created_at AS createdAt,delivered_at AS deliveredAt,read_at AS readAt,acknowledged_at AS acknowledgedAt FROM operational_notifications WHERE recipient_role=? ORDER BY created_at DESC LIMIT ?`).all(text(role),safeLimit);}
export function acknowledgeNotification(id,actor={},status='read'){const field=status==='acknowledged'?'acknowledged_at':'read_at',timestamp=now();db.prepare(`UPDATE operational_notifications SET ${field}=?,status=? WHERE id=?`).run(timestamp,status,id);db.prepare(`INSERT INTO audit_events(entity,entity_id,action,payload_json,created_at) VALUES(?,?,?,?,?)`).run('operational_notifications',id,status,JSON.stringify(actor),timestamp);return db.prepare(`SELECT * FROM operational_notifications WHERE id=?`).get(id);}
export function pendingOutbox(limit=50){return db.prepare(`SELECT o.id AS outboxId,o.attempts,n.* FROM notification_outbox o JOIN operational_notifications n ON n.id=o.notification_id WHERE o.status IN ('pending','retry','waiting_recipient') AND o.next_attempt_at<=? ORDER BY o.created_at LIMIT ?`).all(now(),Math.max(1,Math.min(200,Number(limit)||50)));}
export function completeOutbox(outboxId,delivered,error=''){const timestamp=now();db.prepare(`UPDATE notification_outbox SET status=?,attempts=attempts+1,last_error=?,next_attempt_at=?,delivered_at=? WHERE id=?`).run(delivered?'delivered':'retry',text(error).slice(0,800),new Date(Date.now()+(delivered?0:300000)).toISOString(),delivered?timestamp:null,outboxId);if(delivered)db.prepare(`UPDATE operational_notifications SET status='delivered',delivered_at=? WHERE id=(SELECT notification_id FROM notification_outbox WHERE id=?)`).run(timestamp,outboxId);}
export function registerDevice(input={},actor={}){const installationId=text(input.installationId),fcmToken=text(input.fcmToken);if(!installationId)throw Object.assign(new Error('Identificador da instalação obrigatório.'),{statusCode:400});const id=`DEV-${actor.uid}-${installationId}`.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,180),timestamp=now();db.prepare(`INSERT INTO device_registrations(id,uid,role,installation_id,fcm_token,platform,enabled,updated_at) VALUES(?,?,?,?,?,?,1,?) ON CONFLICT(uid,installation_id) DO UPDATE SET role=excluded.role,fcm_token=excluded.fcm_token,platform=excluded.platform,enabled=1,updated_at=excluded.updated_at`).run(id,actor.uid,actor.role,installationId,fcmToken,text(input.platform||'web'),timestamp);return {id,uid:actor.uid,role:actor.role,installationId,platform:text(input.platform||'web'),updatedAt:timestamp};}
export function devicesForRole(role){return db.prepare(`SELECT id,uid,role,installation_id AS installationId,fcm_token AS fcmToken,platform FROM device_registrations WHERE role=? AND enabled=1`).all(text(role));}
export function markEventProcessed(id){db.prepare(`UPDATE agent_events SET status='processed',processed_at=? WHERE id=?`).run(now(),id);}
