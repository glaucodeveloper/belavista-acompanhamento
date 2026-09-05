const BRL=v=>Math.round(v*100);

export function buildBaseState(token='AI-REAL'){
  return {
    schemaVersion:3,
    version:`${token}-S0`,
    project:{id:`belavista-${token}`,name:'Aliança Park',currency:'BRL',timezone:'America/Bahia'},
    clock:{now:'2026-09-01T07:00:00-03:00',horizonDays:21,workday:{start:'07:00',end:'17:00'}},
    localities:[
      {id:'frente-norte',name:'Frente Norte',status:'active'},
      {id:'frente-sul',name:'Frente Sul',status:'active'},
      {id:'frente-central',name:'Frente Central',status:'active'}
    ],
    personnel:[
      {id:'enc-jose',name:'José',role:'encarregado',functionDescription:'Responsável pela execução, conferência e diário da Frente Norte.',localityId:'frente-norte',active:true,skills:['drenagem','agua','conferencia'],availability:[{date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'},{date:'2026-09-03',start:'07:00',end:'17:00'}]},
      {id:'op-carlos',name:'Carlos',role:'operador-maquina',functionDescription:'Opera máquina em terraplanagem, reaterro e compactação.',localityId:'frente-norte',active:true,skills:['terraplanagem','compactacao'],availability:[{date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'enc-marcos',name:'Marcos',role:'encarregado',functionDescription:'Responsável pela execução e diário da Frente Sul.',localityId:'frente-sul',active:true,skills:['eletrica','conferencia'],availability:[{date:'2026-09-01',start:'07:00',end:'12:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'ele-joao',name:'João',role:'eletricista',functionDescription:'Instala postes, cabos, transformadores e luminárias.',localityId:'frente-sul',active:true,skills:['postes','cabos','transformadores'],availability:[{date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'enc-ana',name:'Ana',role:'encarregado',functionDescription:'Responsável pela execução e diário da Frente Central.',localityId:'frente-central',active:true,skills:['pavimentacao','conferencia'],availability:[{date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'ped-lucas',name:'Lucas',role:'pedreiro',functionDescription:'Executa meio-fio, base e assentamento.',localityId:'frente-central',active:true,skills:['pavimentacao','meio-fio'],availability:[{date:'2026-09-01',start:'07:00',end:'17:00'},{date:'2026-09-02',start:'07:00',end:'17:00'}]},
      {id:'pais-bia',name:'Bia',role:'paisagista',functionDescription:'Executa paisagismo, arborização e acabamento de praça.',localityId:'frente-central',active:false,skills:['paisagismo'],availability:[]}
    ],
    cash:{currentCents:BRL(680000),committedCents:BRL(214000),reserveCents:BRL(150000),freeCents:BRL(466000),availableForNewDecisionsCents:BRL(316000),inflows30dCents:BRL(95000),outflows30dCents:BRL(168000),ledger:[]},
    stages:[
      {id:'stage-terraplanagem',name:'Terraplanagem',status:'completed',progress:100,executionDescription:'Regularização e preparação do greide por trecho.',peculiarities:['produção medida por máquina e trecho'],requirements:['cotas conferidas'],evidenceRequirements:['registro final do trecho'],notificationDestinations:['admin','encarregado']},
      {id:'stage-drenagem',name:'Drenagem Pluvial',status:'active',progress:74,executionDescription:'Assentar drenagem por trecho, conferir o trecho e somente depois executar reaterro e compactação.',peculiarities:['não manter vala aberta além da capacidade da equipe','conferência antecede fechamento','fechamento exige evidência persistida'],requirements:['material imediato','encarregado da própria localidade','operador para fechamento'],evidenceRequirements:['foto da vala','foto do assentamento','conferência do trecho','registro de compactação'],notificationDestinations:['admin','encarregado','supplies']},
      {id:'stage-agua',name:'Rede de Água',status:'active',progress:41,executionDescription:'Implantar PEAD, ramais e cavaletes por setor, testar e liberar cada setor.',peculiarities:['água concluída e testada no setor é porta obrigatória para pavimentação do mesmo setor'],requirements:['PEAD','cavaletes','ramais','encarregado da localidade'],evidenceRequirements:['teste da rede','foto de ramais','liberação do setor'],notificationDestinations:['admin','encarregado','supplies']},
      {id:'stage-eletrica',name:'Rede Elétrica',status:'active',progress:16,executionDescription:'Implantar postes disponíveis, depois cabos, transformadores e luminárias conforme recursos e projeto.',peculiarities:['postes disponíveis podem avançar antes da compra integral dos cabos','cabos e transformadores dependem de cobertura própria'],requirements:['equipe elétrica local','projeto elétrico'],evidenceRequirements:['posição dos postes','conferência do projeto','registro de ligação'],notificationDestinations:['admin','encarregado','supplies']},
      {id:'stage-pavimentacao',name:'Pavimentação',status:'active',progress:4,executionDescription:'Preparar base, meio-fio e assentamento apenas nos setores com redes enterradas liberadas.',peculiarities:['não iniciar setor sem água concluída e liberada','evitar provisão antecipada de grande volume sem frente liberada'],requirements:['água do setor concluída','drenagem do setor conferida','equipe local'],evidenceRequirements:['liberação das redes enterradas','compactação da base','medição executada'],notificationDestinations:['admin','encarregado','supplies']},
      {id:'stage-pracas',name:'Praças e Arborização',status:'planned',progress:0,executionDescription:'Implantar áreas de convivência e arborização quando o entorno estiver estável.',peculiarities:['exige função paisagista ativa na própria localidade','não mobilizar acabamento com tráfego pesado recorrente'],requirements:['paisagista local','entorno estável'],evidenceRequirements:['layout conferido','registro fotográfico'],notificationDestinations:['admin','encarregado']}
    ],
    materials:[
      {id:'mat-manilha',name:'Manilha 800 mm',unit:'m',stock:85,plannedNextNeed:160,unitCostCents:BRL(850),leadTimeDays:4},
      {id:'mat-brita',name:'Brita',unit:'m3',stock:24,plannedNextNeed:45,unitCostCents:BRL(180),leadTimeDays:2},
      {id:'mat-areia',name:'Areia',unit:'m3',stock:18,plannedNextNeed:32,unitCostCents:BRL(120),leadTimeDays:2},
      {id:'mat-concreto',name:'Concreto',unit:'m3',stock:0,plannedNextNeed:18,unitCostCents:BRL(520),leadTimeDays:1},
      {id:'mat-pead',name:'Tubo PEAD',unit:'m',stock:620,applied:1750,totalPlanned:4500,unitCostCents:BRL(42),leadTimeDays:5},
      {id:'mat-cavalete',name:'Cavalete',unit:'un',stock:54,applied:96,totalPlanned:298,unitCostCents:BRL(260),leadTimeDays:4},
      {id:'mat-ramal',name:'Ramal',unit:'un',stock:46,applied:91,totalPlanned:298,unitCostCents:BRL(220),leadTimeDays:4},
      {id:'mat-conexao',name:'Conexões PEAD',unit:'un',stock:72,applied:168,totalPlanned:420,unitCostCents:BRL(180),leadTimeDays:4},
      {id:'mat-poste',name:'Poste',unit:'un',stock:24,installed:12,totalPlanned:115,unitCostCents:BRL(1450),leadTimeDays:8},
      {id:'mat-cabo',name:'Cabo elétrico',unit:'m',stock:1700,totalPlanned:8000,unitCostCents:BRL(23),leadTimeDays:7},
      {id:'mat-led',name:'Luminária LED',unit:'un',stock:20,totalPlanned:115,unitCostCents:BRL(480),leadTimeDays:7},
      {id:'mat-transformador',name:'Transformador',unit:'un',stock:1,totalPlanned:4,unitCostCents:BRL(28000),leadTimeDays:15},
      {id:'mat-paver',name:'Paralelepípedo',unit:'m2',stock:32000,totalPlanned:32000,unitCostCents:BRL(45),leadTimeDays:5},
      {id:'mat-meiofio',name:'Meio-fio',unit:'m',stock:0,quoted:7200,unitCostCents:BRL(38),leadTimeDays:5}
    ],
    purchases:[{id:'po-manilha-100',materialId:'mat-manilha',quantity:100,status:'ordered',expectedAt:'2026-09-03T08:00:00-03:00'}],
    evidence:[],blockers:[],
    agenda:[],notifications:[],resourceRequests:[],cashRequests:[],diary:[],
    stageSectorState:[
      {stageId:'stage-drenagem',localityId:'frente-norte',complete:false,progress:74},
      {stageId:'stage-agua',localityId:'frente-norte',complete:false,progress:41},
      {stageId:'stage-agua',localityId:'frente-central',complete:true,progress:100},
      {stageId:'stage-pavimentacao',localityId:'frente-central',complete:false,progress:4}
    ],
    activities:[
      {id:'act-drenagem-conferencia',stageId:'stage-drenagem',localityId:'frente-norte',title:'Conferir trecho de drenagem',executionDescription:'Conferir alinhamento, assentamento e condições para fechamento do trecho.',peculiarities:['a conferência gera evidência que libera o fechamento'],requirements:['encarregado local','80 m de manilha disponíveis'],evidenceRequirements:['ev-drenagem-conferencia'],durationMinutes:90,status:'planned'},
      {id:'act-drenagem-fechamento',stageId:'stage-drenagem',localityId:'frente-norte',title:'Reaterro e compactação do trecho',executionDescription:'Fechar somente o trecho já conferido, executar reaterro e compactação.',peculiarities:['não fechar sem conferência persistida'],requirements:['encarregado local','operador de máquina local','conferência concluída','32 m3 de areia','45 m3 de brita'],evidenceRequirements:['ev-drenagem-conferencia','ev-drenagem-compactacao'],durationMinutes:240,status:'planned'},
      {id:'act-agua-norte',stageId:'stage-agua',localityId:'frente-norte',title:'Executar rede de água do setor Norte',executionDescription:'Aplicar PEAD, ramais e cavaletes e preparar o teste do setor.',peculiarities:['o setor só libera pavimentação após teste e diário de conclusão'],requirements:['encarregado local','620 m PEAD','54 cavaletes','46 ramais'],evidenceRequirements:['ev-agua-norte-teste'],durationMinutes:360,status:'planned'},
      {id:'act-eletrica-postes-sul',stageId:'stage-eletrica',localityId:'frente-sul',title:'Instalar 6 postes disponíveis',executionDescription:'Implantar seis postes já disponíveis conforme projeto.',peculiarities:['pode avançar mesmo sem cobertura integral de cabos'],requirements:['encarregado local','eletricista local','6 postes','projeto elétrico disponível'],evidenceRequirements:['ev-eletrica-postes'],durationMinutes:180,status:'planned'},
      {id:'act-eletrica-cabos-sul',stageId:'stage-eletrica',localityId:'frente-sul',title:'Lançar 2.000 m de cabos',executionDescription:'Lançar cabos após postes e com cobertura do material correspondente.',peculiarities:['não confundir disponibilidade de postes com cobertura de cabos'],requirements:['encarregado local','eletricista local','2000 m cabo','postes da frente concluídos'],evidenceRequirements:['ev-eletrica-cabos'],durationMinutes:300,status:'planned'},
      {id:'act-pavimentar-norte',stageId:'stage-pavimentacao',localityId:'frente-norte',title:'Pavimentar setor Norte',executionDescription:'Executar base e pavimento somente após liberação de água e drenagem.',peculiarities:['estoque alto de paver não libera a atividade se a água estiver incompleta'],requirements:['água norte concluída','drenagem norte concluída','encarregado local','1000 m2 paver'],evidenceRequirements:['ev-liberacao-redes-norte'],durationMinutes:480,status:'planned'},
      {id:'act-pavimentar-central',stageId:'stage-pavimentacao',localityId:'frente-central',title:'Executar meio-fio e pavimentação Central',executionDescription:'Executar setor Central já liberado pela água, condicionado a pessoal e meio-fio.',peculiarities:['água do setor já está concluída'],requirements:['encarregado local','pedreiro local','900 m2 paver','540 m meio-fio'],evidenceRequirements:['ev-pav-central'],durationMinutes:420,status:'planned'},
      {id:'act-praca-central',stageId:'stage-pracas',localityId:'frente-central',title:'Implantar praça Central',executionDescription:'Executar praça quando houver paisagista local ativo e entorno estabilizado.',peculiarities:['função compatível é condição de execução'],requirements:['paisagista local ativo','entorno estável'],evidenceRequirements:['ev-praca-central'],durationMinutes:480,status:'planned'}
    ],
    commercial:{sales:[],commissions:[],brokers:[]},
    constraints:[{id:'project-eletrico-ok',kind:'document',status:'satisfied',appliesTo:['act-eletrica-postes-sul','act-eletrica-cabos-sul']}],
    lastEvent:null
  };
}
