import demoDataJson from './data/demo-data.json' with {type:'json'};
import stageDescriptions from './data/stage-descriptions.json' with {type:'json'};
import { AI_AGENDA_COMPREHENSION_DEFAULTS_V1 } from './components/shared/ai-agenda-comprehension-v1.mjs?v=1';
export const demoData = demoDataJson;


export const executionModel = {
  sourceNotes: {
    earthwork: {cutM3:18142.35, fillM3:1764.29, balanceM3:16378.06},
    drainage: {linearM:800, inlets:49, diametersMm:[600,800,1000]},
    curbs: {linearM:8000},
    water: {targetLots:298},
    electrical: {poles:120},
    paving: {areaM2:32000}
  },
  assumptions: {
    note:'Premissas iniciais sugeridas a partir das anotações de campo; todas são editáveis na interface.',
    dumpTruck:{unit:'viagens internas/dia',rate:32,capacityM3:12},
    drainage:{unit:'m/dia',rate:25},
    waterLots:{unit:'ramais/dia',rate:12},
    electricalPoles:{unit:'postes/dia',rate:8},
    curbs:{unit:'m/dia',rate:180},
    paving:{unit:'m²/dia',rate:600}
  },
  stages: [
    {key:'project',name:'Projeto executivo',priority:100,dependsOn:[],production:{quantity:1,unit:'projeto',rate:1,rateUnit:'projeto/dia'},materials:['Projeto executivo','Compatibilização','Licenças e liberações'],cashWeight:.05,executionProfile:{typicalDescription:'Compatibiliza geometria, cotas, redes, liberações legais e marcos de início. O planejamento precisa considerar pendências documentais, interfaces entre disciplinas e aprovações anteriores à abertura das frentes.',requestHints:['Priorizar liberações que destravam terraplanagem, drenagem e concessionárias.','Cruzar agenda de aprovações com compras de mobilização e serviços topográficos.'],evidenceFocus:['versão aprovada do projeto','ART/RRT e licenças','pendências de compatibilização'],procurementFocus:['projetistas e topografia','taxas e licenças','levantamentos complementares'],notificationTargets:{owner:['desktop-owner','rtdb/owner'],admin:['desktop-admin','rtdb/admin'],foreman:['mobile-foreman','rtdb/foreman']}}},
    {key:'earthwork',name:'Terraplanagem',priority:95,dependsOn:['project'],production:{quantity:1365,unit:'viagens internas',rate:32,rateUnit:'viagens/dia',volumePerTripM3:12,sourceVolumeM3:16378.06},materials:['Pá carregadeira','Escavadeira','Patrol','Pipa','Rolo compactador','Caçambas'],cashWeight:.15,executionProfile:{typicalDescription:'Depende de locação, liberação geométrica e controle diário de corte, aterro, umidificação e compactação. A produção precisa respeitar equilíbrio entre frentes, clima, equipamento disponível e volume mobilizado por viagem.',requestHints:['Considerar clima, disponibilidade de equipamentos e capacidade de caçambas por dia.','Planejar compras e locações para evitar ociosidade de patrulha, rolo e pipa.'],evidenceFocus:['volume movimentado','compactação e umidificação','horas de equipamento','fotos por trecho'],procurementFocus:['locação de equipamentos','combustível','manutenção de frota','apoio topográfico'],notificationTargets:{owner:['desktop-owner','rtdb/owner'],admin:['desktop-admin','rtdb/admin'],foreman:['mobile-foreman','rtdb/foreman'],supplies:['desktop-supplies','rtdb/supplies']}}},
    {key:'drainage',name:'Drenagem Pluvial',priority:90,dependsOn:['earthwork'],production:{quantity:800,unit:'m',rate:25,rateUnit:'m/dia'},materials:['Manilhas Ø600/800/1000 mm','49 bocas de lobo','Blocos','Cimento','Brita','Compactador sapinho'],cashWeight:.18,executionProfile:{typicalDescription:'Exige sequência entre escavação, regularização de fundo, assentamento, caixas e reaterro com controle de cota e declividade. Qualquer falta de manilha, brita ou bloqueio geométrico afeta diretamente a frente seguinte.',requestHints:['Priorizar trechos que liberam rede de água e pavimentação posterior.','Conferir comprovantes de compra, entrega física e aderência entre diâmetro previsto e trecho executado.'],evidenceFocus:['cotas e declividade','extensão assentada','caixas executadas','ensaio e fotos'],procurementFocus:['manilhas por diâmetro','blocos, cimento e brita','compactação localizada','frete e descarga'],notificationTargets:{owner:['desktop-owner','rtdb/owner'],admin:['desktop-admin','rtdb/admin'],foreman:['mobile-foreman','rtdb/foreman'],supplies:['desktop-supplies','rtdb/supplies']}}},
    {key:'water',name:'Rede de Água',priority:88,dependsOn:['drainage'],production:{quantity:298,unit:'lotes',rate:12,rateUnit:'ramais/dia'},materials:['Tubos PEAD','298 cavaletes','298 ramais','Areia','Conexões'],cashWeight:.14,executionProfile:{typicalDescription:'A rede precisa casar distribuição principal, ramais e cavaletes por lote, com testes de pressão e rastreio das conexões. O planejamento deve correlacionar lotes atendidos, frentes liberadas e saldo real de tubos e conexões.',requestHints:['Planejar por lotes liberados e disponibilidade de PEAD, conexões e equipe de montagem.','Evitar abrir mais ramais do que a cobertura de materiais e testes suporta no ciclo.'],evidenceFocus:['lotes atendidos','teste de pressão','cavaletes instalados','fotos dos ramais'],procurementFocus:['tubos PEAD por trecho','conexões e registros','areia de assentamento','kits de cavalete e ramal'],notificationTargets:{owner:['desktop-owner','rtdb/owner'],admin:['desktop-admin','rtdb/admin'],foreman:['mobile-foreman','rtdb/foreman'],sales:['desktop-commercial','rtdb/commercial']}}},
    {key:'curbs',name:'Meio-fio',priority:76,dependsOn:['water'],production:{quantity:8000,unit:'m',rate:180,rateUnit:'m/dia'},materials:['Meio-fio pré-moldado','Concreto/argamassa','Mão de obra'],cashWeight:.08,executionProfile:{typicalDescription:'A execução depende de alinhamento, nivelamento e liberação das redes enterradas. O ritmo diário varia com transporte de peças, base pronta e arremates necessários por quadra e interseção.',requestHints:['Concentrar a compra por trecho liberado para não estocar peças sem base pronta.','Correlacionar liberação de rede de água com logística de peças e equipe de assentamento.'],evidenceFocus:['metros assentados','alinhamento e arremates','fotos de esquinas e curvas'],procurementFocus:['pré-moldados por trecho','argamassa e concreto','equipe de assentamento'],notificationTargets:{owner:['desktop-owner','rtdb/owner'],admin:['desktop-admin','rtdb/admin'],foreman:['mobile-foreman','rtdb/foreman']}}},
    {key:'electrical',name:'Rede Elétrica',priority:60,dependsOn:['paving'],production:{quantity:120,unit:'postes',rate:8,rateUnit:'postes/dia',coelba:{connectionDeadlineDays:30,requestLeadDays:45,inspectionLeadDays:10,requirements:['Projeto elétrico aprovado','ART/RRT e memorial descritivo','Padrão de entrada conforme concessionária','Subestação/transformador dimensionado','120 postes, cabos e conectores','Laudo de inspeção e vistoria','Protocolo de solicitação de ligação']}},materials:['120 postes','Transformadores','Cabos de baixa e média tensão','Conectores e caixas de passagem','Quadros/padrões de entrada','Luminárias LED','EPI e sinalização','Mão de obra especializada'],cashWeight:.16,executionProfile:{typicalDescription:'Depende de pavimento liberado, projeto aprovado, janela de concessionária e cadeia de suprimentos mais longa. A inferência deve considerar protocolos, lead time de inspeção e o impacto de postes, cabos e transformadores na data de energização.',requestHints:['Programar pedidos com antecedência à vistoria e à ligação da concessionária.','Cruzar datas de inspeção, mobilização de equipe especializada e chegada de postes, cabos e transformadores.'],evidenceFocus:['postes instalados','cabos lançados','laudos e protocolos','fotos da frente e da vistoria'],procurementFocus:['postes e ferragens','transformadores','cabos e conectores','terceiros especializados'],notificationTargets:{owner:['desktop-owner','rtdb/owner'],admin:['desktop-admin','rtdb/admin'],foreman:['mobile-foreman','rtdb/foreman'],utility:['desktop-utility','rtdb/utility']}}},
    {key:'paving',name:'Pavimentação',priority:70,dependsOn:['curbs','water'],production:{quantity:32000,unit:'m²',rate:600,rateUnit:'m²/dia',truckCapacityStones:5000,stonesPerM2:45,lossPercent:5},materials:['Paralelepípedo','Areia','Brita','Cimento','Mão de obra'],cashWeight:.20,executionProfile:{typicalDescription:'Consolida base, drenagem e redes já liberadas. O planejamento deve considerar perdas, caminhões recebidos, trecho contínuo executável e impacto direto no caixa por ser etapa de alto consumo e grande visibilidade.',requestHints:['Planejar compra e entrega por trecho contínuo para reduzir perda e retrabalho.','Cruzar estoque de pedra, areia e brita com produtividade real e liberação das frentes anteriores.'],evidenceFocus:['área executada por trecho','caminhões recebidos','espessura e acabamento','fotos comparativas'],procurementFocus:['paralelepípedo por m²','areia e brita por trecho','cimento e arremates','frentes de mão de obra'],notificationTargets:{owner:['desktop-owner','rtdb/owner'],admin:['desktop-admin','rtdb/admin'],foreman:['mobile-foreman','rtdb/foreman'],supplies:['desktop-supplies','rtdb/supplies']}}}
  ]
};
for(const stage of executionModel.stages){
  const description=stageDescriptions[stage.key];
  if(description)stage.executionProfile.typicalDescription=description;
}

// Formação inicial de pessoal para a inferência de unidades de produção.
// A quantidade de pessoas de cada frente é uma capacidade de planejamento,
// não um cadastro trabalhista: os nomes abaixo são referências editáveis e a
// composição real deve ser confirmada pelo responsável da obra.
export const personnelModel = {
  members: [
    {id:'p-001',name:'Paula Nascimento',role:'Planejamento',team:'topography',status:'Disponível',skills:['locação','cotas','controle de avanço']},
    {id:'p-002',name:'João Pereira',role:'Encarregado',team:'earthwork',status:'Em campo',skills:['frentes','máquinas','medição']},
    {id:'p-003',name:'Carlos Mendes',role:'Encarregado de drenagem',team:'drainage',status:'Disponível',skills:['cotas','manilhas','reaterro']},
    {id:'p-004',name:'Mariana Lopes',role:'Encarregada de pavimentação',team:'paving',status:'Em campo',skills:['calceteiros','arremates','qualidade']},
    {id:'p-005',name:'Mariana Silva',role:'Responsável elétrica',team:'electrical',status:'Programada',skills:['postes','cabos','Coelba']},
    {id:'p-006',name:'Rafael Souza',role:'Operador de patrol',team:'earthwork',status:'Em campo',skills:['patrol','regularização']},
    {id:'p-007',name:'Diego Alves',role:'Operador de escavadeira',team:'earthwork',status:'Disponível',skills:['escavação','carga']},
    {id:'p-008',name:'Ana Costa',role:'Técnica hidráulica',team:'water',status:'Disponível',skills:['PEAD','ramais','pressão']},
    {id:'p-009',name:'Lucas Reis',role:'Calceteiro líder',team:'paving',status:'Em campo',skills:['assentamento','alinhamento']},
    {id:'p-010',name:'Bruno Lima',role:'Apoio de topografia',team:'topography',status:'Disponível',skills:['marcos','GPS','croquis']},
    {id:'p-011',name:'Sofia Martins',role:'Controle de qualidade',team:'curbs',status:'Disponível',skills:['nível','alinhamento','checklist']},
    {id:'p-012',name:'Eduardo Ramos',role:'Eletricista montador',team:'electrical',status:'Programado',skills:['ferragens','conectores']},
    {id:'p-013',name:'Nina Rocha',role:'Apoio de suprimentos',team:'water',status:'Disponível',skills:['conferência','rastreio','recebimento']}
  ],
  teams: [
    {id:'topography',name:'Equipe de Topografia',discipline:'Projeto e locação',memberCount:3,referenceCrew:3,availability:100,factor:1,responsible:'Paula Nascimento',memberNames:['Paula Nascimento','Bruno Lima','Apoio de campo'],skills:['estação total','locação','cotas'],color:'blue'},
    {id:'earthwork',name:'Equipe de Terraplanagem',discipline:'Corte, aterro e compactação',memberCount:7,referenceCrew:7,availability:86,factor:1,responsible:'João Pereira',memberNames:['João Pereira','Rafael Souza','Diego Alves','Operadores e apoio'],skills:['patrol','pá carregadeira','compactação'],color:'amber'},
    {id:'drainage',name:'Equipe de Drenagem',discipline:'Drenagem pluvial',memberCount:6,referenceCrew:6,availability:78,factor:1,responsible:'Carlos Mendes',memberNames:['Carlos Mendes','Apoio de vala','Assentadores'],skills:['vala','manilhas','cotas'],color:'purple'},
    {id:'water',name:'Equipe Hidráulica',discipline:'Rede de água e ramais',memberCount:5,referenceCrew:5,availability:100,factor:1,responsible:'Ana Costa',memberNames:['Ana Costa','Nina Rocha','Montadores PEAD'],skills:['PEAD','ramais','teste de pressão'],color:'teal'},
    {id:'curbs',name:'Equipe de Meio-fio',discipline:'Contorno e acabamento viário',memberCount:8,referenceCrew:8,availability:92,factor:1,responsible:'Sofia Martins',memberNames:['Sofia Martins','Assentadores','Apoio de argamassa'],skills:['alinhamento','pré-moldado','argamassa'],color:'green'},
    {id:'paving',name:'Equipe de Pavimentação',discipline:'Paralelepípedo e arremates',memberCount:12,referenceCrew:12,availability:75,factor:1,responsible:'Mariana Lopes',memberNames:['Mariana Lopes','Lucas Reis','Calceteiros','Apoio de base'],skills:['calceteiros','colchão de areia','arremates'],color:'orange'},
    {id:'electrical',name:'Equipe Elétrica',discipline:'Postes, cabos e concessionária',memberCount:5,referenceCrew:5,availability:60,factor:1,responsible:'Mariana Silva',memberNames:['Mariana Silva','Eduardo Ramos','Montadores especializados'],skills:['postes','cabos','vistoria Coelba'],color:'red'}
  ],
  assignments: {
    project:{teamId:'topography',activity:'Revisar projeto executivo',calibration:1},
    earthwork:{teamId:'earthwork',activity:'Executar corte e aterro',calibration:1},
    drainage:{teamId:'drainage',activity:'Executar rede de drenagem',calibration:1},
    water:{teamId:'water',activity:'Implantar rede de água',calibration:1},
    curbs:{teamId:'curbs',activity:'Executar meio-fio',calibration:1},
    electrical:{teamId:'electrical',activity:'Implantar rede elétrica',calibration:1},
    paving:{teamId:'paving',activity:'Executar base e pavimento',calibration:1}
  }
};

export const commissionReasonDefaults = [
  {id:'signal',label:'Sinal',description:'Comissão vinculada ao recebimento do sinal/entrada.',active:true},
  {id:'intermediate',label:'Parcela intermediária',description:'Comissão vinculada a parcela intermediária prevista no plano.',active:true},
  {id:'monthly',label:'Mensal',description:'Comissão distribuída nas parcelas mensais recebidas.',active:true}
];

export const cashFlowSeed = [
  {id:'CX-001',date:'2026-08-01',kind:'entrada',category:'Vendas',stage:'Geral',description:'Recebimentos comerciais',amountCents:31200000},
  {id:'CX-002',date:'2026-08-05',kind:'saida',category:'Obra',stage:'Drenagem Pluvial',description:'Medição e materiais de drenagem',amountCents:11800000},
  {id:'CX-003',date:'2026-08-10',kind:'saida',category:'Obra',stage:'Rede de Água',description:'Reserva de materiais hidráulicos',amountCents:8200000},
  {id:'CX-004',date:'2026-08-18',kind:'saida',category:'Obra',stage:'Rede Elétrica',description:'Sinal de postes e cabos',amountCents:6400000}
];

export const viewThemes = {
  // Centro derivado do envelope georreferenciado do DWG (SIRGAS 2000 / UTM
  // 24S, EPSG:31984). O PDF continua sendo a referência visual do GLB; o DWG
  // é a fonte de verdade para o enquadramento geográfico.
  assistant:{center:[-13.00044486,-39.62315439], zoom:17, tint:'purple', chat:'left', tilt:8},
  map:{center:[-13.00044486,-39.62315439], zoom:17, tint:'teal', chat:'left', tilt:18},
  stages:{center:[-16.704,-49.088], zoom:17, tint:'violet', chat:'left', tilt:24},
  agenda:{center:[-16.704,-49.088], zoom:17, tint:'teal', chat:'left', tilt:22},
  activities:{center:[-16.704,-49.088], zoom:17, tint:'purple', chat:'left', tilt:22},
  progress:{center:[-16.704,-49.088], zoom:17, tint:'cyan', chat:'left', tilt:24},
  purchases:{center:[-16.711,-49.094], zoom:15, tint:'orange', chat:'left', tilt:12},
  inventory:{center:[-16.706,-49.089], zoom:15, tint:'blue', chat:'left', tilt:16},
  leads:{center:[-16.710,-49.091], zoom:16, tint:'purple', chat:'left', tilt:20},
  collaborators:{center:[-16.706,-49.095], zoom:16, tint:'green', chat:'left', tilt:10},
  personnel:{center:[-16.706,-49.095], zoom:16, tint:'green', chat:'left', tilt:10},
  reports:{center:[-16.708,-49.092], zoom:14, tint:'cyan', chat:'left', tilt:6},
  settings:{center:[-16.708,-49.092], zoom:14, tint:'neutral', chat:'left', tilt:4}
};

// Modos da superfície inicial. O modo troca a leitura e os widgets sobre o
// mapa, mas não muda a rota nem descarta os dados do empreendimento.
export const dashboardModes = {
  tracking:{label:'Acompanhamento',icon:'activity',description:'Execução · cronograma · riscos'},
  commercial:{label:'Leads e lotes',icon:'badge-dollar-sign',description:'Demanda · contratos · parcelas'},
  social:{label:'Comunicação',icon:'messages-square',description:'Instagram · pessoal · equipe'}
};

export const spreadsheetSchema = {
  months:48,
  sheets:['Lançamentos','Resumo Mensal','Orçamento','Indicadores','Como Usar'],
  fields:['Mês','Data','Etapa','Subetapa/Descrição','Fornecedor','Documento','Quantidade','Unidade','Valor Unitário (R$)','Valor Total (R$)','Forma de Pagamento','Status'],
  stages:['Projeto executivo','Terraplanagem','Drenagem','Rede de Água','Meio-fio','Rede Elétrica','Pavimentação','Sinalização','Praça e Lazer','Arborização','Outros']
};

// Catálogo gerencial da central de relatórios. Os modelos são orientados aos
// dados disponíveis no workbook e não substituem demonstrações contábeis legais.
export const reportCatalog = [
  {id:'financial-balance',family:'Financeiro',label:'Balanço financeiro gerencial',icon:'wallet-cards',description:'Orçamento aprovado, realizado, compromissos e saldo por centro de custo.',source:'Orçamento · Lançamentos · Resumo Mensal',metrics:[['Orçamento total','R$ 2,80M','48 meses'],['Realizado','R$ 1,95M','69,6% do orçamento'],['Comprometido','R$ 485k','Pedidos em aberto'],['Saldo projetado','R$ 845k','Após compromissos']],columns:['Centro de custo / etapa','Orçado','Realizado','Saldo','Consumo'],rows:[['Terraplanagem','R$ 420k','R$ 388k','R$ 32k','92% · Dentro'],['Drenagem','R$ 610k','R$ 566k','R$ 44k','93% · Atenção'],['Rede de Água','R$ 350k','R$ 210k','R$ 140k','60% · Normal'],['Pavimentação','R$ 880k','R$ 622k','R$ 258k','71% · Normal']]},
  {id:'income-statement',family:'Financeiro',label:'DRE gerencial',icon:'chart-no-axes-combined',description:'Receitas, custos diretos, despesas administrativas e margem operacional do empreendimento.',source:'Lançamentos · Receitas · Despesas administrativas',metrics:[['Receita reconhecida','R$ 3,42M','No período'],['Custos diretos','R$ 1,95M','57,0% da receita'],['Despesas operacionais','R$ 412k','12,0% da receita'],['Margem operacional','30,9%','Resultado gerencial']],columns:['Linha gerencial','Período','Acumulado','Variação','Sinal'],rows:[['Receita de vendas','R$ 684k','R$ 3,42M','+12,4%','Positivo'],['Custos de obra','R$ 478k','R$ 1,95M','+8,2%','Atenção'],['Despesas comerciais','R$ 76k','R$ 284k','+3,1%','Normal'],['Resultado operacional','R$ 130k','R$ 1,06M','+18,6%','Positivo']]},
  {id:'cash-flow',family:'Financeiro',label:'Fluxo de caixa projetado',icon:'arrow-down-up',description:'Entradas, saídas previstas e disponibilidade para os próximos ciclos de execução.',source:'Contas a pagar · Recebimentos · Compromissos',metrics:[['Disponível hoje','R$ 628k','Caixa livre'],['Entradas previstas','R$ 1,24M','Próximos 90 dias'],['Saídas previstas','R$ 892k','Próximos 90 dias'],['Cobertura','2,1 meses','Índice de liquidez']],columns:['Competência','Entradas','Saídas','Saldo do mês','Status'],rows:[['Jun/24','R$ 312k','R$ 278k','R$ 34k','Positivo'],['Jul/24','R$ 428k','R$ 306k','R$ 122k','Positivo'],['Ago/24','R$ 356k','R$ 308k','R$ 48k','Acompanhar'],['Set/24','R$ 144k','R$ 286k','-R$ 142k','Risco']]},
  {id:'physical-financial',family:'Construção',label:'Avanço físico-financeiro',icon:'chart-spline',description:'Compara avanço físico, custo realizado e aderência ao orçamento por etapa da obra.',source:'Etapas · Medições · Lançamentos · Indicadores',metrics:[['Avanço físico','68,4%','Executado'],['Avanço financeiro','69,6%','Realizado'],['Desvio de custo','+1,2 p.p.','Físico × financeiro'],['Etapas críticas','2','Com desvio']],columns:['Etapa','Avanço físico','Avanço financeiro','Desvio','Leitura'],rows:[['Terraplanagem','100%','92%','-8 p.p.','Financeiro adiantado'],['Drenagem','82%','93%','+11 p.p.','Custo acima'],['Pavimentação','35%','31%','-4 p.p.','Dentro do plano'],['Rede Elétrica','18%','30%','+12 p.p.','Revisar consumo']]},
  {id:'earned-value',family:'Construção',label:'Valor agregado · EVM',icon:'activity',description:'Indicadores de valor planejado, valor agregado, custo real e índices SPI/CPI.',source:'Cronograma · Orçamento · Medições · Custos reais',metrics:[['PV · planejado','R$ 1,98M','Baseline'],['EV · agregado','R$ 1,91M','Valor produzido'],['AC · custo real','R$ 1,95M','Custo incorrido'],['CPI / SPI','0,98 / 0,96','Atenção']],columns:['Indicador','Valor','Índice','Meta','Diagnóstico'],rows:[['PV · Planned Value','R$ 1,98M','—','Baseline','Planejado'],['EV · Earned Value','R$ 1,91M','0,96','1,00','Abaixo do plano'],['AC · Actual Cost','R$ 1,95M','—','≤ EV','Custo maior'],['CPI / SPI','—','0,98 / 0,96','≥ 1,00','Ação corretiva']]},
  {id:'schedule-productivity',family:'Construção',label:'Produção e produtividade',icon:'gauge',description:'Produção medida, horas de equipe e produtividade das frentes de serviço.',source:'Atividades · Afazeres · Responsáveis · Registros',metrics:[['Frentes ativas','6','No período'],['Horas apontadas','1.284 h','Equipe própria'],['Produtividade média','82%','Meta operacional'],['Atrasos','2','Dependências']],columns:['Frente','Produção medida','Meta','Produtividade','Responsável'],rows:[['Drenagem Pluvial','780 m','900 m','86,7%','Carlos Mendes'],['Terraplanagem','12.400 m³','12.000 m³','103,3%','Equipe Terraplanagem'],['Pavimentação','4.200 m²','5.000 m²','84,0%','Mariana Lopes'],['Rede de Água','620 m','800 m','77,5%','João Pereira']]},
  {id:'procurement-commitments',family:'Suprimentos',label:'Compras e compromissos',icon:'shopping-cart',description:'Pedidos em aberto, entregas, fornecedores e impacto no custo das etapas.',source:'Compras · Materiais · Fornecedores · Etapas',metrics:[['Pedidos em aberto','12','R$ 485k'],['Atrasados','3','Impacto crítico'],['Entregas no prazo','78%','Últimos 90 dias'],['Fornecedores ativos','18','Homologados']],columns:['Pedido / fornecedor','Etapa','Valor','Prazo','Status'],rows:[['PE-2025-041 · EletricSul','Rede Elétrica','R$ 48,7k','8 dias atraso','Crítico'],['PE-2025-040 · HidroTubos','Drenagem','R$ 32,8k','5 dias atraso','Atenção'],['PE-2025-039 · ConcretaMix','Pavimentação','R$ 28,6k','3 dias','Em andamento'],['PE-2025-038 · Luz & Cia','Rede Elétrica','R$ 15,4k','7 dias','Em andamento']]},
  {id:'commercial-funnel',family:'Comercial',label:'Funil comercial e conversão',icon:'funnel',description:'Leads por etapa do funil, taxa de conversão e velocidade de atendimento.',source:'Leads · Atendimento · Intenções · Lotes',metrics:[['Leads recebidos','238','Últimos 30 dias'],['Qualificados','37','15,5% do total'],['Em atendimento','61','25,6% do total'],['Conversão','8,4%','Lead → proposta']],columns:['Etapa do funil','Quantidade','Taxa','Variação','Próxima ação'],rows:[['Novos leads','238','100%','+28 hoje','Distribuir atendimento'],['Contato realizado','142','59,7%','+8,2%','Agendar retorno'],['Qualificados','37','15,5%','+3,4%','Enviar condições'],['Proposta / negociação','20','8,4%','+1,1%','Acompanhar fechamento']]},
  {id:'sales-mix',family:'Comercial',label:'Vendas e mix de lotes',icon:'map-pinned',description:'Demanda por lote, objetivo de compra, faixa de valor e perfil dos interessados.',source:'Leads públicos · Mapa de lotes · CRM',metrics:[['Lotes com interesse','96','Dos setores ativos'],['Ticket médio','R$ 468k','Faixa observada'],['Moradia','54%','Objetivo principal'],['Investimento','31%','Objetivo secundário']],columns:['Segmento','Leads','Participação','Ticket médio','Lotes mais procurados'],rows:[['Moradia','128','53,8%','R$ 442k','Q-12 L54 · Q-03 L12'],['Investimento','74','31,1%','R$ 512k','Q-18 L93 · Q-12 L54'],['Veraneio','36','15,1%','R$ 486k','Q-18 L93 · Q-07 L22'],['Total','238','100%','R$ 468k','96 lotes']]},
  {id:'risk-quality',family:'Governança',label:'Riscos, qualidade e conformidade',icon:'shield-alert',description:'Riscos de execução, não conformidades, inspeções e ações corretivas pendentes.',source:'Registros · Inspeções · Auditoria · Etapas',metrics:[['Riscos abertos','7','2 críticos'],['Não conformidades','4','1 vencida'],['Inspeções realizadas','32','Mês atual'],['Ações vencidas','3','Requer gestor']],columns:['Item de controle','Origem','Responsável','Prazo','Situação'],rows:[['Atraso na drenagem','Etapa 02','Carlos Mendes','16/06/24','Atenção'],['Compactação de base','Qualidade','Mariana Lopes','18/06/24','Em análise'],['Entrega de postes','Suprimentos','Mariana Silva','20/06/24','Crítico'],['DDS da frente','Segurança','João Pereira','Hoje','Concluído']]},
  {id:'monthly-spend',family:'Financeiro',label:'Resumo mensal de gastos',icon:'calendar-range',description:'Compara o gasto do mês e a composição por etapa nos 48 ciclos da implantação.',source:'Planilha · Resumo Mensal (Mês, etapas e TOTAL MÊS)',metrics:[['Horizonte','48 meses','Implantação'],['Centros de custo','9','Etapas consolidadas'],['Competência','Mensal','Soma por mês'],['Total do mês','Consolidado','Coluna TOTAL MÊS']],columns:['Competência','Terraplanagem','Drenagem','Pavimentação','Total do mês'],rows:[['Mês 01','A consolidar','A consolidar','A consolidar','SUM(B:J)'],['Mês 02','A consolidar','A consolidar','A consolidar','SUM(B:J)'],['Mês 03','A consolidar','A consolidar','A consolidar','SUM(B:J)'],['Mês 04','A consolidar','A consolidar','A consolidar','SUM(B:J)']]},
  {id:'budget-coverage',family:'Financeiro',label:'Cobertura orçamentária por meta',icon:'target',description:'Mostra meta física, orçamento, gasto realizado, saldo e percentual consumido por item planejado.',source:'Planilha · Orçamento (meta, custo, saldo e % consumido)',metrics:[['Metas físicas','14','Itens orçados'],['Drenagem','800 m','Rede prevista'],['Pavimentação','32.000 m²','Área prevista'],['Postes LED','115','Meta de energia']],columns:['Etapa / meta','Unidade','Orçamento','Gasto realizado','Saldo / consumo'],rows:[['Drenagem · rede','800 m','A informar','SUMIFS','Saldo e %'],['Drenagem · bocas de lobo','49 un.','A informar','SUMIFS','Saldo e %'],['Rede de água','298 ramais','A informar','SUMIFS','Saldo e %'],['Pavimentação','32.000 m²','A informar','SUMIFS','Saldo e %']]},
  {id:'supplier-payments',family:'Suprimentos',label:'Fornecedores, documentos e pagamentos',icon:'receipt-text',description:'Audita despesas por fornecedor, documento, quantidade, preço unitário, pagamento e status.',source:'Planilha · Lançamentos (Fornecedor, Documento, pagamento e Status)',metrics:[['Campos auditáveis','13','Por lançamento'],['Valor total','Quantidade × unitário','Fórmula automática'],['Rastreabilidade','Fornecedor + documento','Origem da despesa'],['Situação','Status','Aprovação / pagamento']],columns:['Fornecedor','Documento','Descrição','Pagamento','Status'],rows:[['A preencher','NF / contrato','Subetapa ou serviço','Forma de pagamento','Status'],['A preencher','NF / contrato','Material ou mão de obra','Forma de pagamento','Status'],['A preencher','NF / contrato','Serviço executado','Forma de pagamento','Status'],['A preencher','NF / contrato','Despesa administrativa','Forma de pagamento','Status']]},
  {id:'unit-cost-indicators',family:'Construção',label:'Indicadores de custo unitário',icon:'ruler',description:'Relaciona o custo realizado às unidades de referência definidas na implantação.',source:'Planilha · Indicadores + Orçamento',metrics:[['Custo médio por lote','Realizado ÷ 298','Indicador'],['Custo por pavimento','Realizado ÷ 32.000 m²','Indicador'],['Saldo previsto','Previsto − realizado','Indicador'],['Consumo','Realizado ÷ previsto','Indicador']],columns:['Indicador','Fórmula na planilha','Base física','Uso gerencial','Leitura'],rows:[['Custo médio por lote','Total realizado ÷ 298','298 lotes','Viabilidade por unidade','Acompanhar'],['Custo por m²','Total realizado ÷ 32.000','32.000 m²','Pavimentação','Acompanhar'],['Saldo previsto','Previsto − realizado','Orçamento total','Cobertura futura','Normal'],['% consumido','Realizado ÷ previsto','Orçamento total','Desvio de custo','Atenção']]}
];

export const activityCatalog = [
  {nature:'Planejamento e projeto',name:'Revisar projeto executivo',initial:['Projeto','Revisão','Responsável técnico'],execution:['Versão aprovada','Pendências','Anexo','Data de validação']},
  {nature:'Terraplanagem',name:'Executar corte e aterro',initial:['Trecho','Volume estimado (m³)','Equipamento','Capacidade da caçamba (m³)'],execution:['Viagens internas de caçamba','Volume equivalente executado','Tipo de solo','Horas de equipamento','Comprovante fotográfico','Medição']},
  {nature:'Drenagem',name:'Executar rede de drenagem',initial:['Trecho','Diâmetro','Extensão prevista (m)'],execution:['Extensão executada','Tubos aplicados','Cotas/declividade','Ensaio de estanqueidade','Medição']},
  {nature:'Pavimentação',name:'Executar base e pavimento',initial:['Trecho','Tipo de pavimento','Área prevista (m²)','Pedras por caminhão','Pedras por m²','Perda (%)'],execution:['Caminhões recebidos','Área executada','Produção (m²/dia)','Espessura','Material aplicado','Ensaio de compactação','Medição']},
  {nature:'Redes',name:'Implantar rede de água',initial:['Trecho','Diâmetro PEAD','Extensão prevista (m)','Lotes atendidos'],execution:['Tubulação PEAD aplicada','Ramais executados','Cavaletes instalados','Teste de pressão','Conexões','Registro fotográfico','Medição']},
  {nature:'Redes',name:'Implantar rede elétrica',initial:['Trecho','Tensão','Quantidade de postes'],execution:['Postes instalados','Cabos aplicados','Equipe concessionária','Laudo/aceite','Medição']},
  {nature:'Estruturas',name:'Executar fundação e estrutura',initial:['Elemento','Volume de concreto (m³)','Armadura prevista'],execution:['Concreto recebido','Aço aplicado','Fôrmas','Slump/rompimento','Medição']},
  {nature:'Urbanização',name:'Executar praça e paisagismo',initial:['Área','Projeto paisagístico','Espécies/elementos'],execution:['Itens implantados','Irrigação','Mobiliário','Fotos de entrega','Medição']},
  {nature:'Suprimentos',name:'Solicitar e receber material',initial:['Material','Quantidade','Unidade','Fornecedor'],execution:['Nota fiscal','Lote','Data de recebimento','Inspeção','Comprovante']},
  {nature:'Qualidade',name:'Realizar inspeção ou ensaio',initial:['Serviço','Norma/critério','Amostragem'],execution:['Resultado','Laboratório','Laudo','Não conformidade','Ação corretiva']},
  {nature:'Segurança',name:'Realizar DDS e inspeção de segurança',initial:['Frente','Equipe','Tema'],execution:['Participantes','Risco identificado','EPI/EPC','Registro','Ação corretiva']},
  {nature:'Medição e financeiro',name:'Registrar medição e pagamento',initial:['Etapa','Fornecedor','Período'],execution:['Quantidade medida','Valor unitário','Valor total','Documento','Aprovação']},
  {nature:'Administração',name:'Emitir relatório de etapa',initial:['Período','Responsável','Destinatários'],execution:['Avanço físico','Avanço financeiro','Anexos','Pendências','Aprovação final']}
];

// Sessão persistida de instalação das atividades. O rascunho atravessa as
// telas PERT, RACI, Ações IA e RAID sem transformar nenhuma delas em uma cópia
// isolada do cadastro de atividades.
export const activityInstallationDefaults = {
  step:1,
  stageKey:'earthwork',
  draft:{name:'',nature:'',description:'',unit:'',responsible:'',target:'',release:'',evidence:''},
  materials:[],
  rationalization:{status:'pending',summary:'Aguardando leitura da proposta.',checks:[]},
  cards:[],
  dependencies:[],
  assignments:[],
  priority:null,
  updatedAt:null
};

export function* cycle(values, start=0) {
  let index = start;
  while (true) { yield values[index % values.length]; index += 1; }
}
export function* windows(values, size=3) {
  for (let i=0; i<values.length; i+=size) yield values.slice(i, i+size);
}
export function* stateTransitions(sequence) {
  for (const state of sequence) yield Object.freeze({...state});
}

export const UI_MEMORY_KEY = 'belavista.ui-memory.v1';
const uiMemoryFields = ['aiAgendaComprehensionV1','view','selectedLead','selectedMaterial','chatOpen','chatManual','dashboardMode','mapFilter','mapFilters','mapFilterWidget','mapProgressSelection','mapTileMode','theme','reportFamily','reportType','reportPeriod','customReports','reportDocumentLinks','sidebarCollapsed','mapMode','selectedStage','stageSelected','activityDedicated','actionAudit','widgetLayouts','mapView','solarHour','solarHourMode','aiActions','selectedAiAction','raidItems','raciAssignments','selectedRaciCell','selectedPertNode','pertOverrides','stageOverrides','stagePropertyWorkItems','stageAgendaItems','stageTodoItems','selectedLotWidget','productionOverrides','stageMaterialOverrides','cashFlowLocal','commissionReasons','selectedPlanningStage','dashboardStagePage','controlMaterialOverrides','materialCatalogAdditions','controlChangeLog','personnelTeams','personnelAssignments','personnelDocumentName','personnelInferenceOverrides','selectedPersonnelStage','selectedPersonnelTeam','personnelInferenceStatus','activityInstallation','documentCatalog','documentsCustomColumns','documentsHiddenColumns','documentsFileFilter','materialSheetCustomColumns','materialSheetHiddenColumns','lotStatuses','repasseEntries','repassePartners','repasseConfig','developmentProfiles','selectedDevelopmentProfileId','developmentProfileQuery'];
export function restoreUiState(){
  try {
    if(typeof localStorage==='undefined')return {};
    const parsed=JSON.parse(localStorage.getItem(UI_MEMORY_KEY)||'{}');
    if(!parsed||parsed.version!==1||typeof parsed.state!=='object')return {};
    const safe={...parsed.state};
    delete safe.integrationSettings;
    return structuredClone(safe);
  } catch(error) { console.warn('Memória local de interface indisponível.',error); return {}; }
}
export function persistUiState(state){
  try {
    if(typeof localStorage==='undefined')return;
    const snapshot=Object.fromEntries([...uiMemoryFields,'foremenContacts'].filter(key=>key in state).map(key=>[key,state[key]]));
    if(snapshot.foremenContacts) snapshot.foremenContacts=snapshot.foremenContacts.map(({password,...contact})=>contact);
    localStorage.setItem(UI_MEMORY_KEY,JSON.stringify({version:1,savedAt:new Date().toISOString(),state:snapshot}));
  } catch(error) { console.warn('Não foi possível salvar a memória local da interface.',error); }
}
export function clearUiState(){try{localStorage?.removeItem(UI_MEMORY_KEY);}catch(error){console.warn('Não foi possível limpar a memória local.',error);}}
const restoredUiState=restoreUiState();
const projectDocumentSeeds = [
  {id:'doc-proj-exec',title:'Projeto executivo',category:'Projeto e planta',code:'',issuer:'',documentDate:'',description:'Compatibilização geométrica e executiva das redes e vias.',sourceMaterialId:'proj-exec',fileName:'',fileSize:0,fileType:'',createdAt:'',updatedAt:''},
  {id:'doc-proj-licenses',title:'Liberações / licenças',category:'Licença e aprovação',code:'',issuer:'',documentDate:'',description:'Documentação anterior à abertura das frentes.',sourceMaterialId:'proj-licenses',fileName:'',fileSize:0,fileType:'',createdAt:'',updatedAt:''},
  {id:'doc-presentation-v3',title:'Apresentação do loteamento',category:'Institucional',code:'V3',issuer:'Aliança Park',documentDate:'',description:'Apresentação geral do empreendimento em PDF.',sourceMaterialId:'',fileName:'alianca-park-apresentacao-loteamento-v3.pdf',fileSize:11334230,fileType:'application/pdf',sourceUrl:'/assets/public/alianca-park-apresentacao-loteamento-v3.pdf',builtIn:true,createdAt:'',updatedAt:''},
];

export function createStore(initial) {
  let state = structuredClone(initial);
  const listeners = new Set();
  const withAudit = (previous, next) => {
    const action = String(next?.lastAction || '').trim();
    const changed = action && action !== previous.lastAction;
    if (!changed) return next;
    const now = new Date().toISOString();
    const entries = Array.isArray(next.actionAudit) ? [...next.actionAudit] : [];
    const last = entries.at(-1);
    // Several handlers can express the same interaction in sequence. Keep the
    // timeline useful by coalescing only an immediate duplicate.
    if (!last || last.label !== action || Date.parse(now) - Date.parse(last.at) > 750) {
      entries.push({
        id: `ACT-${Date.now().toString(36).toUpperCase()}`,
        label: action,
        at: now,
        actor: next.currentActor?.name||previous.currentActor?.name||'Warley',
        role: next.currentActor?.label||previous.currentActor?.label||'Dono',
        view: next.view || previous.view || 'assistant'
      });
    }
    return {...next, actionAudit: entries.slice(-250)};
  };
  const emit = () => listeners.forEach(fn => fn(state));
  return {
    get: () => state,
    set(patch) { state = withAudit(state, {...state, ...patch}); emit(); },
    update(fn) { state = withAudit(state, fn(state)); emit(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}

const sessionStarted = new Date().toISOString();
const sessionStorageApi = typeof sessionStorage === 'undefined'
  ? {getItem:()=>null,setItem:()=>{}}
  : sessionStorage;
const createSessionId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID().slice(0, 8).toUpperCase();
  }
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(4);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 6)}`.slice(-8).toUpperCase();
};
// Cache-busted imports must share the same live UI state and assistant bridge.
export const appStore = globalThis.__belavistaAppStore || createStore({
  view:'map', selectedLead:0, selectedMaterial:2, chatOpen:true, chatManual:false,
  currentActor:{uid:'local-warley',name:'Warley',role:'owner',label:'Dono'},
  config:null, mapReady:false, dashboardMode:'tracking', mapFilter:'execution', mapFilters:['execution'], mapFilterWidget:null, mapProgressSelection:[], mapTileMode:'satellite', installPrompt:null, lastAction:'Aplicação iniciada', theme:'dark', reportFamily:'Sistema', reportType:'system-live', reportPeriod:'all',
  sessionId:sessionStorageApi.getItem('belavista.session')||createSessionId(), sessionStarted, sidebarCollapsed:false, mapMode:'overview', adminMenu:false, selectedStage:2, stageSelected:false, selectedActivity:null, activityDedicated:false, printMode:false, editingRecord:null, recordMapArea:null, publicLeads:[], localSqlState:{status:'unknown',clean:false,entities:{},checkedAt:null,error:null},
  actionAudit:[{id:'ACT-BOOT',label:'Aplicação iniciada',at:sessionStarted,actor:'Warley',role:'Dono',view:'map'}],
  aiAgendaComprehensionV1:structuredClone(AI_AGENDA_COMPREHENSION_DEFAULTS_V1), aiActions:[], selectedAiAction:null, raidItems:[], selectedRaidItem:null, raciAssignments:null, selectedRaciCell:null, selectedPertNode:null, pertOverrides:{},
  widgetLayouts:{chat:{},floating:{}}, mapView:{rotation:0,zoom:1.68,pan:{x:0,y:0},tiltAdjust:0}, solarHour:9, solarHourMode:'clock',
  productionOverrides:{}, stageMaterialOverrides:{}, controlMaterialOverrides:{}, controlChangeLog:[], controlRealtime:null, cashFlowLocal:[], cashSummary:{entriesCents:0,exitsCents:0,balanceCents:0}, operationalState:null, operationalNotifications:[], operationalAgenda:[], operationalGuidance:null, systemCalibration:null, publicReservations:[], dashboardStagePage:0, integrationSettings:{}, commissionReasons:structuredClone(commissionReasonDefaults), selectedPlanningStage:'earthwork',
  personnelTeams:structuredClone(personnelModel.teams), personnelAssignments:structuredClone(personnelModel.assignments), personnelDocumentName:'Nenhum documento de estimativas carregado', personnelInferenceOverrides:{}, selectedPersonnelStage:'earthwork', selectedPersonnelTeam:'earthwork', personnelInferenceStatus:'Prévia assistida pelas regras atuais do catálogo',
  activityInstallation:structuredClone(activityInstallationDefaults), documentCatalog:[], reportDocumentLinks:{}, developmentProfiles:[], selectedDevelopmentProfileId:null, developmentProfileQuery:'',
  records:[{id:'REG-001',obra:'Aliança Park',atividade:'Drenagem Pluvial',data:'2024-06-06',hora:'08:30',responsavel:'Carlos Mendes',detalhes:'Medição da rede principal',status:'Pendente'}],
  ...restoredUiState,
  dashboardMode:'tracking',
  documentCatalog:[...projectDocumentSeeds.filter(seed=>!(restoredUiState.documentCatalog||[]).some(item=>item.id===seed.id)),...(restoredUiState.documentCatalog||[])],
});
if (appStore.get().dashboardMode !== 'tracking') appStore.set({dashboardMode:'tracking'});
sessionStorageApi.setItem('belavista.session',appStore.get().sessionId);


// BELAVISTA_MAP_WIDGETS_V4_GLOBALS
globalThis.__belavistaAppStore=appStore;
globalThis.__belavistaDemoData=demoData;

// BELAVISTA_EXECUTION_MODEL_V8_GLOBALS
globalThis.__belavistaExecutionModel=executionModel;
globalThis.__belavistaCommissionReasonDefaults=commissionReasonDefaults;
globalThis.__belavistaCashFlowSeed=cashFlowSeed;
