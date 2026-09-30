import {createBaseOperationalState,applyFactualEvent} from '../../desktop/system-model/operational-core.mjs';

const clone=value=>structuredClone(value);

export function realityBase(){
  const state=createBaseOperationalState();

  state.project={
    id:'belavista-reality',
    name:'Belavista',
    description:'Loteamento com execução por frente de obra'
  };

  state.cash={
    currentCents:12000000,
    committedCents:1000000,
    reserveCents:2000000,
    freeCents:9000000,
    availableForNewDecisionsCents:9000000,
    inflows30dCents:0,
    outflows30dCents:0,
    ledger:[]
  };

  state.materials=[
    {id:'mat-brita',name:'Brita',unit:'m3',stock:5,receivedQuantity:20,usedQuantity:15},
    {id:'mat-areia',name:'Areia',unit:'m3',stock:25,receivedQuantity:30,usedQuantity:5},
    {id:'mat-cimento',name:'Cimento',unit:'sc',stock:40,receivedQuantity:50,usedQuantity:10}
  ];

  state.purchases=[
    {
      id:'purchase-brita',
      materialId:'mat-brita',
      description:'Brita para fechamento da drenagem',
      quantity:30,
      status:'ordered',
      expectedAt:'2026-09-28T08:00:00-03:00'
    }
  ];

  state.personnel=[
    {
      id:'enc-norte',
      name:'Encarregado Norte',
      role:'encarregado',
      localityId:'frente-norte',
      active:true,
      available:true
    }
  ];

  state.stages=[
    {
      id:'stage-drenagem',
      name:'Drenagem',
      status:'in_progress',
      requirements:[
        'As atividades da etapa precisam estar concluídas antes de completar a etapa.'
      ],
      evidenceRequirements:[
        'Serviços de fechamento precisam de evidência visual verificada.'
      ]
    }
  ];

  state.activities=[
    {
      id:'act-fechamento',
      stageId:'stage-drenagem',
      localityId:'frente-norte',
      title:'Fechamento e compactação da drenagem',
      status:'planned',
      progressPercent:0,
      requirements:[
        'Estoque de brita deve ser pelo menos 30 m3.',
        'Estoque de areia deve ser pelo menos 20 m3.',
        'Caixa livre para nova decisão deve ser pelo menos R$ 30.000,00.',
        'Encarregado da Frente Norte deve estar disponível.'
      ],
      evidenceRequirements:[
        'Antes da conclusão deve existir foto final com status supported, verified ou approved.'
      ],
      materials:[
        {materialId:'mat-brita',quantity:30,unit:'m3'},
        {materialId:'mat-areia',quantity:20,unit:'m3'}
      ],
      estimatedCostCents:3000000,
      minimumFreeCashCents:3000000,
      requiredRoles:['encarregado'],
      requiresVerifiedEvidence:true
    }
  ];

  state.agenda=[
    {
      id:'agenda-fechamento',
      activityId:'act-fechamento',
      stageId:'stage-drenagem',
      localityId:'frente-norte',
      status:'confirmed',
      startAt:'2026-09-29T08:00:00-03:00'
    }
  ];

  state.notifications=[];
  state.blockers=[];
  state.evidence=[];
  state.serviceAssignments=[];
  state.stageSectorState=[
    {
      stageId:'stage-drenagem',
      localityId:'frente-norte',
      complete:false,
      progress:0
    }
  ];
  state.appliedEventIds=[];
  state.version='REALITY-S0';

  return state;
}

export function withEnoughBrita(){
  const state=realityBase();
  state.materials.find(x=>x.id==='mat-brita').stock=40;
  state.materials.find(x=>x.id==='mat-brita').receivedQuantity=55;
  return state;
}

export function serviceReportedState(){
  let state=withEnoughBrita();
  state=applyFactualEvent(state,{
    id:'PRE-ASG',
    type:'service.assignment.created',
    at:'2026-09-29T07:50:00-03:00',
    payload:{
      assignmentId:'asg-fechamento',
      activityId:'act-fechamento',
      stageId:'stage-drenagem',
      localityId:'frente-norte',
      assigneeIds:['enc-norte']
    }
  });
  state=applyFactualEvent(state,{
    id:'PRE-START',
    type:'service.execution.started',
    at:'2026-09-29T08:00:00-03:00',
    payload:{
      assignmentId:'asg-fechamento',
      activityId:'act-fechamento'
    }
  });
  state=applyFactualEvent(state,{
    id:'PRE-REPORT',
    type:'service.execution.reported',
    at:'2026-09-29T14:00:00-03:00',
    payload:{
      assignmentId:'asg-fechamento',
      activityId:'act-fechamento',
      progressPercent:90
    }
  });
  return state;
}

export function verifiedServiceState(){
  let state=serviceReportedState();
  state=applyFactualEvent(state,{
    id:'PRE-IMG',
    type:'service.evidence.image.submitted',
    at:'2026-09-29T14:05:00-03:00',
    payload:{
      evidenceId:'img-final',
      assignmentId:'asg-fechamento',
      activityId:'act-fechamento',
      uri:'local://reality/final.jpg'
    }
  });
  state=applyFactualEvent(state,{
    id:'PRE-IMG-OK',
    type:'service.evidence.image.verified',
    at:'2026-09-29T14:10:00-03:00',
    payload:{
      evidenceId:'img-final',
      verdict:'supported',
      observations:['Fechamento visualmente compatível com a atividade declarada']
    }
  });
  return state;
}

export function partialStageState(){
  const state=withEnoughBrita();
  state.activities=[
    {
      ...clone(state.activities[0]),
      id:'act-conferencia',
      title:'Conferência da drenagem',
      status:'completed',
      progressPercent:100,
      requirements:['Conferência já concluída.'],
      evidenceRequirements:[]
    },
    {
      ...clone(state.activities[0]),
      id:'act-fechamento',
      title:'Fechamento e compactação da drenagem',
      status:'planned',
      progressPercent:0
    }
  ];
  return state;
}
