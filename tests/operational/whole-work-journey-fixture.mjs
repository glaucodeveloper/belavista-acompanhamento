export const JOURNEY_ACTIVITIES=[
  {
    id:'topografia-mobilizacao',stageId:'preparacao',localityId:'global',
    title:'Topografia e mobilização inicial',
    minimumFreeCashCents:500000,
    fundingCents:2000000,
    materials:[{materialId:'mat-estacas',quantity:50,unit:'un',purchaseCostCents:300000,name:'Estacas de locação'}]
  },
  {
    id:'terraplanagem',stageId:'terraplanagem',localityId:'global',
    title:'Terraplanagem, cortes, aterros e compactação',
    minimumFreeCashCents:3000000,
    fundingCents:8000000,
    dependsOn:['topografia-mobilizacao'],
    materials:[{materialId:'mat-diesel',quantity:1200,unit:'L',purchaseCostCents:1500000,name:'Diesel de máquinas'}]
  },
  {
    id:'agua-principal',stageId:'rede-agua',localityId:'global',
    title:'Rede principal de água',
    minimumFreeCashCents:2500000,
    fundingCents:12000000,
    dependsOn:['terraplanagem'],
    materials:[{materialId:'mat-pead-principal',quantity:1400,unit:'m',purchaseCostCents:3000000,name:'PEAD rede principal'}]
  },
  {
    id:'agua-ramais',stageId:'rede-agua',localityId:'global',
    title:'Ramais e cavaletes dos 298 lotes',
    minimumFreeCashCents:2000000,
    fundingCents:7000000,
    dependsOn:['agua-principal'],
    materials:[
      {materialId:'mat-pead-ramais',quantity:1000,unit:'m',purchaseCostCents:1800000,name:'PEAD dos ramais'},
      {materialId:'mat-cavaletes',quantity:298,unit:'un',purchaseCostCents:1200000,name:'Cavaletes dos lotes'}
    ]
  },
  {
    id:'drenagem',stageId:'drenagem',localityId:'global',
    title:'Drenagem pluvial e bocas de lobo',
    minimumFreeCashCents:3000000,
    fundingCents:10000000,
    dependsOn:['terraplanagem'],
    materials:[
      {materialId:'mat-tubos-drenagem',quantity:320,unit:'m',purchaseCostCents:2200000,name:'Tubos de drenagem'},
      {materialId:'mat-brita',quantity:90,unit:'m3',purchaseCostCents:1300000,name:'Brita de drenagem'}
    ]
  },
  {
    id:'rede-eletrica',stageId:'rede-eletrica',localityId:'global',
    title:'Rede elétrica, postes e cabeamento',
    minimumFreeCashCents:4000000,
    fundingCents:15000000,
    dependsOn:['agua-ramais','drenagem'],
    materials:[
      {materialId:'mat-postes',quantity:42,unit:'un',purchaseCostCents:3500000,name:'Postes'},
      {materialId:'mat-cabos',quantity:4200,unit:'m',purchaseCostCents:3500000,name:'Cabos elétricos'}
    ]
  },
  {
    id:'pav-base',stageId:'pavimentacao',localityId:'global',
    title:'Sub-base, base e meio-fio da pavimentação',
    minimumFreeCashCents:5000000,
    fundingCents:20000000,
    dependsOn:['agua-ramais','drenagem','rede-eletrica'],
    materials:[
      {materialId:'mat-bica',quantity:850,unit:'m3',purchaseCostCents:5500000,name:'Bica corrida'},
      {materialId:'mat-meio-fio',quantity:5200,unit:'m',purchaseCostCents:2500000,name:'Meio-fio'}
    ]
  },
  {
    id:'pav-asfalto',stageId:'pavimentacao',localityId:'global',
    title:'Pavimentação asfáltica',
    minimumFreeCashCents:6000000,
    fundingCents:25000000,
    dependsOn:['pav-base'],
    materials:[{materialId:'mat-asfalto',quantity:780,unit:'t',purchaseCostCents:15000000,name:'Massa asfáltica'}]
  },
  {
    id:'praca-central',stageId:'pracas',localityId:'global',
    title:'Praça central, pisos e equipamentos',
    minimumFreeCashCents:2000000,
    fundingCents:8000000,
    dependsOn:['pav-asfalto'],
    materials:[
      {materialId:'mat-piso-praca',quantity:1600,unit:'m2',purchaseCostCents:2200000,name:'Piso da praça'},
      {materialId:'mat-equip-praca',quantity:18,unit:'un',purchaseCostCents:1300000,name:'Equipamentos da praça'}
    ]
  },
  {
    id:'acabamento-final',stageId:'acabamento',localityId:'global',
    title:'Paisagismo, sinalização e entrega final',
    minimumFreeCashCents:1000000,
    fundingCents:3000000,
    dependsOn:['praca-central'],
    materials:[
      {materialId:'mat-placas',quantity:55,unit:'un',purchaseCostCents:600000,name:'Sinalização'},
      {materialId:'mat-mudas',quantity:220,unit:'un',purchaseCostCents:400000,name:'Mudas para paisagismo'}
    ]
  }
];

export const JOURNEY_STAGES=[
  {id:'preparacao',name:'Preparação e topografia'},
  {id:'terraplanagem',name:'Terraplanagem'},
  {id:'rede-agua',name:'Rede de água'},
  {id:'drenagem',name:'Drenagem'},
  {id:'rede-eletrica',name:'Rede elétrica'},
  {id:'pavimentacao',name:'Pavimentação'},
  {id:'pracas',name:'Praças e urbanização'},
  {id:'acabamento',name:'Acabamento e entrega'}
];

export function createWholeSubdivisionZeroState(){
  const materials=[];
  for(const activity of JOURNEY_ACTIVITIES){
    for(const item of activity.materials){
      if(!materials.some(x=>x.id===item.materialId)){
        materials.push({
          id:item.materialId,
          name:item.name,
          unit:item.unit,
          stock:0,
          receivedQuantity:0,
          usedQuantity:0
        });
      }
    }
  }

  return {
    version:'JOURNEY-S0',
    project:{id:'belavista',name:'Belavista',lotCount:298},
    cash:{
      currentCents:0,committedCents:0,reserveCents:0,
      freeCents:0,availableForNewDecisionsCents:0,
      inflows30dCents:0,outflows30dCents:0,ledger:[]
    },
    materials,
    purchases:[],
    personnel:[
      {id:'enc-obra',name:'Encarregado da obra',role:'encarregado',localityId:'global',active:true,available:true}
    ],
    stages:JOURNEY_STAGES.map(stage=>({...stage,status:'planned'})),
    activities:JOURNEY_ACTIVITIES.map(activity=>({
      id:activity.id,
      stageId:activity.stageId,
      localityId:activity.localityId,
      title:activity.title,
      status:'planned',
      progressPercent:0,
      minimumFreeCashCents:activity.minimumFreeCashCents,
      dependsOn:activity.dependsOn||[],
      materials:activity.materials.map(({materialId,quantity,unit})=>({materialId,quantity,unit})),
      requiredRoles:['encarregado'],
      requiresVerifiedEvidence:true,
      evidenceRequirements:['foto final verificada']
    })),
    agenda:[],
    notifications:[],
    blockers:[],
    evidence:[],
    serviceAssignments:[],
    stageSectorState:JOURNEY_STAGES.map(stage=>({
      stageId:stage.id,localityId:'global',complete:false,progress:0
    })),
    appliedEventIds:[]
  };
}

function title(activity,suffix){return `${activity.title} — ${suffix}`;}

export function buildWholeSubdivisionJourneySteps(){
  const steps=[];
  let seq=0;
  const push=step=>steps.push({index:++seq,...step});

  push({
    id:'initial-zero',
    title:'Estado zero: sem caixa, sem estoque e todas as atividades por fazer',
    event:null,
    expect:{nextActivityId:JOURNEY_ACTIVITIES[0].id,nextAction:'fund'}
  });

  for(const [activityIndex,activity] of JOURNEY_ACTIVITIES.entries()){
    push({
      id:`cash-${activity.id}`,
      title:title(activity,activityIndex===0?'aporte inicial baixo de R$ 20 mil':'novo aporte incremental'),
      event:{
        id:`EV-CASH-${activity.id}`,
        type:'cash.inflow.recorded',
        payload:{
          amountCents:activity.fundingCents,
          description:activityIndex===0?'Aporte inicial de R$ 20.000':'Aporte incremental para próxima frente'
        }
      },
      expect:{nextActivityId:activity.id,nextAction:'purchase',notify:true}
    });

    for(const [materialIndex,material] of activity.materials.entries()){
      const purchaseId=`purchase-${activity.id}-${material.materialId}`;

      push({
        id:`purchase-${activity.id}-${material.materialId}`,
        title:title(activity,`compra de ${material.name}, sem presumir recebimento`),
        event:{
          id:`EV-PURCHASE-${activity.id}-${materialIndex+1}`,
          type:'purchase.invoice.recorded',
          payload:{
            purchaseId,
            document:{
              number:`NF-${activityIndex+1}-${materialIndex+1}`,
              supplier:`Fornecedor ${material.name}`,
              amountCents:material.purchaseCostCents
            },
            paymentStatus:'paid',
            paidAmountCents:material.purchaseCostCents,
            activityId:activity.id,
            stageId:activity.stageId,
            items:[{materialId:material.materialId,quantity:material.quantity,received:false}]
          }
        },
        expect:{nextActivityId:activity.id,nextAction:'receive',notify:true}
      });

      const isLastMaterial=materialIndex===activity.materials.length-1;
      push({
        id:`receipt-${activity.id}-${material.materialId}`,
        title:title(activity,`recebimento individual de ${material.name}`),
        event:{
          id:`EV-RECEIPT-${activity.id}-${materialIndex+1}`,
          type:'purchase.receipt.received',
          payload:{
            purchaseId,
            items:[{materialId:material.materialId,quantity:material.quantity}],
            evidence:[{
              id:`REC-${activityIndex+1}-${materialIndex+1}`,
              kind:'purchase-receipt',
              activityId:activity.id,
              stageId:activity.stageId
            }]
          }
        },
        expect:{
          nextActivityId:activity.id,
          nextAction:isLastMaterial?'assign':'purchase',
          agendaAction:isLastMaterial?'schedule':null,
          notify:true
        }
      });
    }

    const assignmentId=`asg-${activity.id}`;
    push({
      id:`assign-${activity.id}`,
      title:title(activity,'atribuição da equipe'),
      event:{
        id:`EV-ASSIGN-${activity.id}`,
        type:'service.assignment.created',
        payload:{
          assignmentId,activityId:activity.id,stageId:activity.stageId,
          localityId:activity.localityId,assigneeIds:['enc-obra']
        }
      },
      expect:{nextActivityId:activity.id,nextAction:'accept_assignment',notify:true}
    });

    push({
      id:`accept-${activity.id}`,
      title:title(activity,'aceite da atribuição'),
      event:{
        id:`EV-ACCEPT-${activity.id}`,
        type:'service.assignment.accepted',
        payload:{assignmentId}
      },
      expect:{nextActivityId:activity.id,nextAction:'start',notify:true}
    });

    push({
      id:`start-${activity.id}`,
      title:title(activity,'início físico'),
      event:{
        id:`EV-START-${activity.id}`,
        type:'service.execution.started',
        payload:{assignmentId,activityId:activity.id}
      },
      expect:{nextActivityId:activity.id,nextAction:'report',notify:true}
    });

    push({
      id:`report-${activity.id}`,
      title:title(activity,'relato de execução a 90%'),
      event:{
        id:`EV-REPORT-${activity.id}`,
        type:'service.execution.reported',
        payload:{assignmentId,activityId:activity.id,progressPercent:90}
      },
      expect:{nextActivityId:activity.id,nextAction:'submit_evidence',notify:true}
    });

    const evidenceId=`img-${activity.id}`;
    push({
      id:`evidence-submit-${activity.id}`,
      title:title(activity,'envio de foto para verificação'),
      event:{
        id:`EV-IMG-${activity.id}`,
        type:'service.evidence.image.submitted',
        payload:{
          evidenceId,assignmentId,activityId:activity.id,
          uri:`local://journey/${activity.id}.jpg`
        }
      },
      expect:{nextActivityId:activity.id,nextAction:'verify_evidence',notify:true}
    });

    push({
      id:`evidence-verify-${activity.id}`,
      title:title(activity,'evidência verificada'),
      event:{
        id:`EV-VERIFY-${activity.id}`,
        type:'service.evidence.image.verified',
        payload:{evidenceId,verdict:'supported',observations:['Execução compatível com a atividade do teste incremental.']}
      },
      expect:{nextActivityId:activity.id,nextAction:'confirm',notify:true}
    });

    push({
      id:`confirm-${activity.id}`,
      title:title(activity,'confirmação física e fechamento da atividade'),
      event:{
        id:`EV-CONFIRM-${activity.id}`,
        type:'service.execution.confirmed',
        payload:{
          assignmentId,activityId:activity.id,stageId:activity.stageId,
          localityId:activity.localityId,stageProgressPercent:100,
          evidenceIds:[evidenceId]
        }
      },
      expect:{
        nextActivityId:activityIndex===JOURNEY_ACTIVITIES.length-1
          ?'none'
          :JOURNEY_ACTIVITIES[activityIndex+1].id,
        nextAction:activityIndex===JOURNEY_ACTIVITIES.length-1?'none':null,
        notify:true
      }
    });
  }

  return steps.map(step=>({...step,total:steps.length}));
}
