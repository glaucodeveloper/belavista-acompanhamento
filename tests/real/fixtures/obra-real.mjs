export function buildRealScenario(runToken='REAL'){
  return {
    schemaVersion:1,
    project:{
      id:`belavista-${runToken}`,
      name:'Aliança Park',
      reserveCents:15_000_000,
      currency:'BRL'
    },
    clock:{
      now:'2026-09-01T07:00:00-03:00',
      workday:{start:'07:00',end:'17:00'},
      timezone:'America/Bahia'
    },
    localities:[
      {id:'frente-norte',name:'Frente Norte',status:'active'},
      {id:'frente-sul',name:'Frente Sul',status:'active'}
    ],
    personnel:[
      {
        id:'enc-jose',name:'José',role:'Encarregado de obra',localityId:'frente-norte',active:true,
        skills:['drenagem','rede de água','conferência','liberação de trecho'],
        availability:[{date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]
      },
      {
        id:'op-carlos',name:'Carlos',role:'Operador de máquina',localityId:'frente-norte',active:true,
        skills:['terraplanagem','drenagem'],availability:[{date:'2026-09-01',start:'07:00',end:'17:00'}]
      },
      {
        id:'enc-marcos',name:'Marcos',role:'Encarregado de obra',localityId:'frente-sul',active:true,
        skills:['rede elétrica','conferência'],availability:[{date:'2026-09-01',start:'07:00',end:'12:00'}]
      },
      {
        id:'ele-joao',name:'João',role:'Eletricista',localityId:'frente-sul',active:true,
        skills:['poste','rede elétrica'],availability:[{date:'2026-09-01',start:'07:00',end:'17:00'}]
      }
    ],
    cash:{
      currentCents:68_000_000,
      committedCents:21_400_000,
      reserveCents:15_000_000,
      inflows30dCents:9_500_000,
      outflows30dCents:16_800_000
    },
    stages:[
      {
        id:'stage-terraplanagem',name:'Terraplanagem',progress:100,status:'completed',
        executionDescription:'Regularização e preparação das frentes antes das redes enterradas.',
        peculiarities:['controle por trecho e produção de máquina'],requirements:[],evidenceRequirements:['registro final do trecho']
      },
      {
        id:'stage-drenagem',name:'Drenagem Pluvial',progress:74,status:'active',
        executionDescription:'Assentamento de drenagem e fechamento do trecho após conferência.',
        peculiarities:['a conferência antecede o fechamento do trecho','produção organizada por frente'],
        requirements:['material disponível','encarregado da própria localidade','operador quando houver movimentação de solo'],
        evidenceRequirements:['conferência do trecho antes do fechamento']
      },
      {
        id:'stage-agua',name:'Rede de Água',progress:41,status:'active',
        executionDescription:'PEAD, cavaletes e ramais para atendimento dos 298 lotes.',
        peculiarities:['a rede de água deve estar concluída no setor antes da pavimentação correspondente'],
        requirements:['PEAD','cavaletes','ramais','encarregado da localidade'],
        evidenceRequirements:['registro de conclusão por setor']
      },
      {
        id:'stage-eletrica',name:'Rede Elétrica',progress:16,status:'active',
        executionDescription:'Implantação progressiva de postes, cabos, luminárias e transformadores.',
        peculiarities:['postes disponíveis podem ser instalados antes da compra integral de cabos'],
        requirements:['equipe elétrica','encarregado da localidade'],
        evidenceRequirements:['registro de poste instalado']
      },
      {
        id:'stage-pavimentacao',name:'Pavimentação',progress:4,status:'active',
        executionDescription:'Base, meio-fio e assentamento após liberação das redes enterradas do setor.',
        peculiarities:['água concluída no setor é porta de liberação obrigatória'],
        requirements:['rede de água do setor concluída','materiais de pavimentação','equipe disponível'],
        evidenceRequirements:['liberação do setor após redes enterradas']
      },
      {
        id:'stage-pracas',name:'Praças e Arborização',progress:0,status:'planned',
        executionDescription:'Implantação das áreas de convivência e arborização.',
        peculiarities:['executar apenas quando houver equipe compatível e frente liberada'],
        requirements:['equipe de paisagismo'],evidenceRequirements:['registro fotográfico']
      }
    ],
    activities:[
      {
        id:'act-drenagem-conferencia',stageId:'stage-drenagem',localityId:'frente-norte',
        title:'Conferir e liberar trecho de drenagem',durationMinutes:90,
        requiredRoles:['Encarregado de obra'],requiredSkills:['drenagem','conferência'],
        gates:[{kind:'material',materialId:'mat-manilha',minimumQuantity:160}],
        status:'planned',priority:1
      },
      {
        id:'act-drenagem-fechamento',stageId:'stage-drenagem',localityId:'frente-norte',
        title:'Fechar trecho após conferência',durationMinutes:180,
        requiredRoles:['Encarregado de obra','Operador de máquina'],requiredSkills:['drenagem'],
        dependencies:['act-drenagem-conferencia'],
        gates:[{kind:'evidence',evidenceId:'ev-drenagem-conferencia',mustExist:true}],status:'planned',priority:9999
      },
      {
        id:'act-agua-setor-norte',stageId:'stage-agua',localityId:'frente-norte',
        title:'Executar rede de água no setor Norte',durationMinutes:240,
        requiredRoles:['Encarregado de obra'],requiredSkills:['rede de água'],
        gates:[
          {kind:'material',materialId:'mat-pead',minimumQuantity:620},
          {kind:'material',materialId:'mat-cavalete',minimumQuantity:54},
          {kind:'material',materialId:'mat-ramal',minimumQuantity:46}
        ],status:'planned',priority:1
      },
      {
        id:'act-eletrica-postes-sul',stageId:'stage-eletrica',localityId:'frente-sul',
        title:'Instalar postes disponíveis na Frente Sul',durationMinutes:180,
        requiredRoles:['Encarregado de obra','Eletricista'],requiredSkills:['rede elétrica'],
        gates:[{kind:'material',materialId:'mat-poste',minimumQuantity:1}],status:'planned',priority:1
      },
      {
        id:'act-pavimentar-norte',stageId:'stage-pavimentacao',localityId:'frente-norte',
        title:'Pavimentar setor Norte',durationMinutes:480,
        requiredRoles:['Encarregado de obra'],
        gates:[{kind:'stage-sector-complete',stageId:'stage-agua',localityId:'frente-norte',mustBeComplete:true}],
        status:'planned',priority:999999
      },
      {
        id:'act-praca-sul',stageId:'stage-pracas',localityId:'frente-sul',
        title:'Implantar praça da Frente Sul',durationMinutes:420,
        requiredRoles:['Paisagista'],status:'planned',priority:999999
      }
    ],
    materials:[
      {id:'mat-manilha',name:'Manilha de concreto 800 mm',unit:'m',stock:85,nextCycleNeed:160,unitCostCents:10_000,leadTimeDays:2},
      {id:'mat-pead',name:'Tubo PEAD',unit:'m',stock:620,applied:1750,totalPlanned:4500},
      {id:'mat-cavalete',name:'Cavalete',unit:'un',stock:54,applied:96,totalPlanned:298},
      {id:'mat-ramal',name:'Ramal',unit:'un',stock:46,applied:91,totalPlanned:298},
      {id:'mat-poste',name:'Poste',unit:'un',stock:24,installed:12,totalPlanned:115},
      {id:'mat-cabo',name:'Cabo elétrico',unit:'m',stock:1700,totalPlanned:8000},
      {id:'mat-paver',name:'Paralelepípedo',unit:'m2',stock:32000,totalPlanned:32000}
    ],
    purchases:[],
    evidence:[],
    stageSectorState:[
      {stageId:'stage-agua',localityId:'frente-norte',complete:false,progress:41}
    ],
    expected:{
      foremanByLocality:{'frente-norte':'enc-jose','frente-sul':'enc-marcos'},
      readyOrSchedulable:['act-drenagem-conferencia','act-agua-setor-norte','act-eletrica-postes-sul'],
      blocked:{
        'act-drenagem-fechamento':'evidence-or-dependency',
        'act-pavimentar-norte':'stage-gate',
        'act-praca-sul':'personnel'
      }
    }
  };
}
