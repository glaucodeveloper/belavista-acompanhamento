const BRL=value=>Math.round(value*100);

export function buildCompleteScenario(runToken='MOCK'){
  return {
    schemaVersion:2,
    runToken,
    assumptions:{
      note:'Valores marcados aqui são mocks explícitos para teste; regras de domínio reais ficam nos campos executionDescription, peculiarities, requirements e gates.',
      workday:'07:00-17:00 America/Bahia',
      localityRule:'Encarregado e demais recursos humanos só podem ser alocados na localidadeObraId/localityId a que estão associados.',
      schedulingRule:'Prioridade numérica não ordena nem libera atividades; quesitos, peculiaridades, dependências, materiais, evidências, caixa e disponibilidade governam o encaixe.'
    },
    project:{id:`belavista-${runToken}`,name:'Aliança Park · loteamento demo',currency:'BRL',reserveCents:BRL(150000)},
    clock:{now:'2026-09-01T07:00:00-03:00',timezone:'America/Bahia',workday:{start:'07:00',end:'17:00'},horizonDays:14},
    localities:[
      {id:'frente-norte',name:'Frente Norte',kind:'work-front',status:'active'},
      {id:'frente-sul',name:'Frente Sul',kind:'work-front',status:'active'},
      {id:'frente-central',name:'Frente Central',kind:'work-front',status:'active'}
    ],
    personnel:[
      {id:'enc-jose',name:'José',role:'Encarregado de obra',localityId:'frente-norte',active:true,skills:['drenagem','conferência','rede de água','liberação de trecho'],availability:[
        {date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'},{date:'2026-09-03',start:'07:00',end:'17:00'}]},
      {id:'op-carlos',name:'Carlos',role:'Operador de máquina',localityId:'frente-norte',active:true,skills:['terraplanagem','drenagem'],availability:[
        {date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'enc-marcos',name:'Marcos',role:'Encarregado de obra',localityId:'frente-sul',active:true,skills:['rede elétrica','conferência'],availability:[
        {date:'2026-09-01',start:'07:00',end:'12:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'ele-joao',name:'João',role:'Eletricista',localityId:'frente-sul',active:true,skills:['poste','rede elétrica','cabos'],availability:[
        {date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'enc-ana',name:'Ana',role:'Encarregado de obra',localityId:'frente-central',active:true,skills:['pavimentação','conferência'],availability:[
        {date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'ped-lucas',name:'Lucas',role:'Pedreiro',localityId:'frente-central',active:true,skills:['meio-fio','pavimentação'],availability:[
        {date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'paisagista-bia',name:'Bia',role:'Paisagista',localityId:'frente-central',active:false,skills:['paisagismo'],availability:[]}
    ],
    cash:{
      currentCents:BRL(680000),committedCents:BRL(214000),reserveCents:BRL(150000),inflows30dCents:BRL(95000),outflows30dCents:BRL(168000)
    },
    stages:[
      {id:'stage-terraplanagem',name:'Terraplanagem',progress:100,status:'completed',executionDescription:'Regularização e preparação por trecho.',peculiarities:['produção medida por máquina e trecho'],requirements:[],evidenceRequirements:['registro final do trecho']},
      {id:'stage-drenagem',name:'Drenagem Pluvial',progress:74,status:'active',executionDescription:'Assentamento e fechamento após conferência.',peculiarities:['conferência antecede fechamento','fechamento exige evidência persistida'],requirements:['material imediato','encarregado da própria localidade'],evidenceRequirements:['conferência do trecho']},
      {id:'stage-agua',name:'Rede de Água',progress:41,status:'active',executionDescription:'PEAD, cavaletes e ramais por setor.',peculiarities:['água concluída no setor é porta obrigatória para pavimentação'],requirements:['PEAD','cavaletes','ramais','encarregado da localidade'],evidenceRequirements:['conclusão por setor']},
      {id:'stage-eletrica',name:'Rede Elétrica',progress:16,status:'active',executionDescription:'Postes, cabos, luminárias e transformadores.',peculiarities:['postes disponíveis podem avançar antes da compra integral dos cabos'],requirements:['equipe elétrica','encarregado local'],evidenceRequirements:['poste instalado']},
      {id:'stage-pavimentacao',name:'Pavimentação',progress:4,status:'active',executionDescription:'Base, meio-fio e assentamento após redes enterradas.',peculiarities:['não iniciar setor sem água concluída'],requirements:['água concluída','materiais','equipe local'],evidenceRequirements:['liberação do setor']},
      {id:'stage-pracas',name:'Praças e Arborização',progress:0,status:'planned',executionDescription:'Áreas de convivência e arborização.',peculiarities:['exige função compatível ativa na própria localidade'],requirements:['paisagista'],evidenceRequirements:['registro fotográfico']}
    ],
    materials:[
      {id:'mat-manilha',name:'Manilha 800 mm',unit:'m',stock:85,nextCycleNeed:160,reorderTarget:185,unitCostCents:BRL(100),leadTimeDays:2},
      {id:'mat-brita',name:'Brita',unit:'m3',stock:24,nextCycleNeed:45,reorderTarget:55,unitCostCents:BRL(150),leadTimeDays:2},
      {id:'mat-areia',name:'Areia',unit:'m3',stock:18,nextCycleNeed:32,reorderTarget:40,unitCostCents:BRL(110),leadTimeDays:2},
      {id:'mat-concreto',name:'Concreto',unit:'m3',stock:0,nextCycleNeed:18,reorderTarget:18,unitCostCents:BRL(520),leadTimeDays:1},
      {id:'mat-pead',name:'Tubo PEAD',unit:'m',stock:620,applied:1750,totalPlanned:4500,unitCostCents:BRL(18),leadTimeDays:4},
      {id:'mat-cavalete',name:'Cavalete',unit:'un',stock:54,applied:96,totalPlanned:298,unitCostCents:BRL(190),leadTimeDays:4},
      {id:'mat-ramal',name:'Ramal',unit:'un',stock:46,applied:91,totalPlanned:298,unitCostCents:BRL(90),leadTimeDays:4},
      {id:'mat-conexao',name:'Conexões',unit:'un',stock:72,applied:168,totalPlanned:420,unitCostCents:BRL(35),leadTimeDays:3},
      {id:'mat-poste',name:'Poste',unit:'un',stock:24,installed:12,totalPlanned:115,unitCostCents:BRL(2100),leadTimeDays:12},
      {id:'mat-cabo',name:'Cabo elétrico',unit:'m',stock:1700,totalPlanned:8000,unitCostCents:BRL(11),leadTimeDays:8},
      {id:'mat-led',name:'Luminária LED',unit:'un',stock:20,totalPlanned:115,unitCostCents:BRL(480),leadTimeDays:7},
      {id:'mat-transformador',name:'Transformador',unit:'un',stock:1,totalPlanned:4,unitCostCents:BRL(18000),leadTimeDays:20},
      {id:'mat-paver',name:'Paralelepípedo',unit:'m2',stock:32000,totalPlanned:32000,unitCostCents:BRL(45),leadTimeDays:3},
      {id:'mat-meiofio',name:'Meio-fio',unit:'m',stock:0,quoted:7200,unitCostCents:BRL(28),leadTimeDays:4}
    ],
    purchases:[
      {id:'po-manilha-100',materialId:'mat-manilha',quantity:100,status:'ordered',expectedAt:'2026-09-03T08:00:00-03:00'},
      {id:'po-concreto-18',materialId:'mat-concreto',quantity:18,status:'suggested',expectedAt:null}
    ],
    evidence:[],
    stageSectorState:[
      {stageId:'stage-agua',localityId:'frente-norte',complete:false,progress:41},
      {stageId:'stage-agua',localityId:'frente-central',complete:true,progress:100}
    ],
    activities:[
      {id:'act-drenagem-conferencia',stageId:'stage-drenagem',localityId:'frente-norte',title:'Conferir e liberar trecho de drenagem',durationMinutes:90,requiredRoles:['Encarregado de obra'],requiredSkills:['drenagem','conferência'],gates:[{kind:'material',materialId:'mat-manilha',minimumQuantity:80}],status:'planned',priority:1},
      {id:'act-drenagem-fechamento',stageId:'stage-drenagem',localityId:'frente-norte',title:'Fechar trecho após conferência',durationMinutes:180,requiredRoles:['Encarregado de obra','Operador de máquina'],requiredSkills:['drenagem'],dependencies:['act-drenagem-conferencia'],gates:[{kind:'evidence',evidenceId:'ev-drenagem-conferencia',mustExist:true}],status:'planned',priority:999999},
      {id:'act-agua-setor-norte',stageId:'stage-agua',localityId:'frente-norte',title:'Executar rede de água no setor Norte',durationMinutes:240,requiredRoles:['Encarregado de obra'],requiredSkills:['rede de água'],gates:[{kind:'material',materialId:'mat-pead',minimumQuantity:620},{kind:'material',materialId:'mat-cavalete',minimumQuantity:54},{kind:'material',materialId:'mat-ramal',minimumQuantity:46}],status:'planned',priority:1},
      {id:'act-eletrica-postes-sul',stageId:'stage-eletrica',localityId:'frente-sul',title:'Instalar 6 postes disponíveis',durationMinutes:180,requiredRoles:['Encarregado de obra','Eletricista'],requiredSkills:['rede elétrica','poste'],gates:[{kind:'material',materialId:'mat-poste',minimumQuantity:6}],status:'planned',priority:1},
      {id:'act-eletrica-cabos-sul',stageId:'stage-eletrica',localityId:'frente-sul',title:'Lançar 2.000 m de cabos',durationMinutes:300,requiredRoles:['Encarregado de obra','Eletricista'],requiredSkills:['rede elétrica','cabos'],gates:[{kind:'material',materialId:'mat-cabo',minimumQuantity:2000}],status:'planned',priority:999999},
      {id:'act-pavimentar-norte',stageId:'stage-pavimentacao',localityId:'frente-norte',title:'Pavimentar setor Norte',durationMinutes:480,requiredRoles:['Encarregado de obra'],gates:[{kind:'stage-sector-complete',stageId:'stage-agua',localityId:'frente-norte',mustBeComplete:true},{kind:'material',materialId:'mat-paver',minimumQuantity:1000}],status:'planned',priority:999999999},
      {id:'act-pavimentar-central',stageId:'stage-pavimentacao',localityId:'frente-central',title:'Executar meio-fio e pavimentação Central',durationMinutes:420,requiredRoles:['Encarregado de obra','Pedreiro'],requiredSkills:['pavimentação'],gates:[{kind:'stage-sector-complete',stageId:'stage-agua',localityId:'frente-central',mustBeComplete:true},{kind:'material',materialId:'mat-paver',minimumQuantity:900}],status:'planned',priority:1},
      {id:'act-praca-central',stageId:'stage-pracas',localityId:'frente-central',title:'Implantar praça Central',durationMinutes:420,requiredRoles:['Paisagista'],requiredSkills:['paisagismo'],status:'planned',priority:999999}
    ],
    notificationDestinations:{
      operational:['admin'],purchase:['admin','supplies'],cash:['owner','admin'],field:['admin'],commercial:['commercial'],foremanByLocality:{'frente-norte':'enc-jose','frente-sul':'enc-marcos','frente-central':'enc-ana'}
    },
    expected:{
      foremanByLocality:{'frente-norte':'enc-jose','frente-sul':'enc-marcos','frente-central':'enc-ana'},
      ready:['act-drenagem-conferencia','act-agua-setor-norte','act-eletrica-postes-sul','act-pavimentar-central'],
      blocked:{'act-drenagem-fechamento':'evidence-or-dependency','act-eletrica-cabos-sul':'material','act-pavimentar-norte':'stage-gate','act-praca-central':'personnel'}
    }
  };
}
