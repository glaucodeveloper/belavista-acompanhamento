const activity=(id,title,unit,materials,release,weight=1)=>({id,title,unit,materials,release,weight});
const stage=(key,title,aliases,activities)=>({key,title,aliases,activities});

export const STAGE_WORKBENCH=[
  stage('project','Preparação e projeto',['design-approvals'],[
    activity('survey','Levantamento, DWG e GPS','projeto',['DWG georreferenciado','receptor GNSS','marcos topográficos'],'Coordenadas, cotas e setores conferidos',1.1),
    activity('clearing','Limpeza e preparação da área','ha',['máquinas de limpeza','sinalização','caçambas'],'Frentes e áreas protegidas demarcadas',1),
    activity('staking','Locação de eixos e lotes','ponto',['piquetes','estacas','equipamento topográfico'],'Eixos, offsets e lotes materializados',.9),
    activity('soil-tests','Sondagem e ensaios iniciais','ensaio',['kits de coleta','laboratório de solos'],'Resultados aceitos pelo responsável técnico',.8),
    activity('release-design','Liberação do projeto executivo','projeto',['projetos assinados','ART/RRT','licenças'],'Projeto e cotas formalmente liberados',1.2)
  ]),
  stage('earthwork','Abertura de ruas e terraplenagem',['earthworks'],[
    activity('road-opening','Abertura dos corredores viários','m',['escavadeira','pá-carregadeira','patrol'],'Eixos abertos dentro da geometria aprovada',1),
    activity('cut-load','Corte e carregamento','m³',['escavadeira','pá-carregadeira','combustível'],'Volume medido e origem identificada',1.25),
    activity('internal-haul','Viagens internas de caçamba','viagem interna',['caminhões-caçamba','boletim de viagens'],'Viagens e volumes rastreados',1.2),
    activity('spread-moisture','Espalhamento e umidificação','m³',['patrol','caminhão-pipa','água'],'Camada e umidade prontas para compactar',1),
    activity('compaction','Compactação por camada','m³',['rolo compactador','laboratório de solos'],'Ensaio de compactação aceito',1.25),
    activity('subgrade','Regularização do subleito','m²',['motoniveladora','rolo','apoio topográfico'],'Greide, inclinações e subleito liberados',1.1)
  ]),
  stage('drainage','Drenagem pluvial',['drainage'],[
    activity('drain-layout','Locação e abertura de valas','m',['escavadeira','escoramento','topografia'],'Cota de fundo e interferências conferidas',1),
    activity('bedding','Berço e regularização de fundo','m',['brita','areia','concreto magro'],'Berço inspecionado antes do assentamento',.8),
    activity('pipes','Assentamento de tubos e manilhas','m',['manilhas Ø600/800/1000','juntas','equipamento de içamento'],'Alinhamento, juntas e declividade aceitos',1.35),
    activity('drain-boxes','Caixas, PVs e bocas de lobo','un',['blocos','cimento','aço','grelhas'],'Cotas de entrada e saída conferidas',1.1),
    activity('backfill','Reaterro e compactação localizada','m³',['solo selecionado','compactador de placa'],'Trecho fechado com controle por camada',1),
    activity('drain-test','Inspeção e teste de vazão','trecho',['equipamento de inspeção','água de teste'],'Vazão, cotas e as-built aprovados',.75)
  ]),
  stage('water','Rede de água — 298 lotes',['water'],[
    activity('water-trench','Valas e envoltória da rede','m',['escavadeira','areia de envoltória','fita de advertência'],'Vala e separação sanitária aceitas',.9),
    activity('pead-main','Rede principal PEAD','m',['tubos PEAD','conexões','máquina de termofusão'],'Soldas rastreadas e trecho montado',1.3),
    activity('valves','Registros, válvulas e caixas','un',['registros','válvulas','ventosas','caixas'],'Setorização e acessibilidade conferidas',.9),
    activity('branches','Ramais dos 298 lotes','ramal/lote',['tubos de ramal','conexões','kits de ligação'],'298 ramais identificados por lote',1.2),
    activity('meters','Cavaletes e esperas','cavalete/lote',['298 cavaletes','hidrômetros/esperas','conexões'],'Cavaletes instalados e protegidos',1),
    activity('pressure-test','Teste, lavagem e desinfecção','setor',['bomba de teste','água','desinfetante aprovado'],'Teste de pressão e potabilidade aceitos',.95)
  ]),
  stage('curbs','Meio-fio, base e acessibilidade',['curbs-accessibility'],[
    activity('curb-layout','Locação, linha e cota','m',['topografia','linha','gabaritos'],'Geometria e raios conferidos',.8),
    activity('curb-base','Preparação da base','m',['brita','areia','compactador'],'Base contínua e compactada',.9),
    activity('curb-install','Assentamento de meio-fio','m',['meios-fios','argamassa','concreto'],'Alinhamento sem invasão dos lotes',1.25),
    activity('gutters','Sarjetas e entradas hidráulicas','m',['concreto','formas','agregados'],'Drenagem superficial funcional',1),
    activity('accessibility','Rampas e acessibilidade','un',['piso tátil','concreto','sinalização'],'Checklist de acessibilidade aceito',.85)
  ]),
  stage('paving','Pavimentação em paralelepípedos',['paving'],[
    activity('paving-base','Regularização e base granular','m²',['brita graduada','água','rolo'],'Base ensaiada e liberada',1.15),
    activity('sand-bed','Colchão de assentamento','m²',['areia/pó de pedra','guias de nível'],'Espessura e perfil conferidos',.9),
    activity('stone-logistics','Recebimento de paralelepípedos','caminhão de 5.000 pedras',['paralelepípedos','romaneios','área de descarga'],'Quantidade, perda e lote de origem registrados',.8),
    activity('stone-setting','Assentamento de paralelepípedos','m²',['45 pedras/m²','linha de paginação','equipe de calceteiros'],'Paginação, juntas e arremates aceitos',1.35),
    activity('grout-compact','Rejuntamento e compactação','m²',['areia/pó de pedra','placa vibratória','rolo'],'Superfície estabilizada e drenante',1.05),
    activity('paving-release','Limpeza e liberação ao tráfego','trecho',['sinalização temporária','equipamento de limpeza'],'Trecho vistoriado e liberado',.75)
  ]),
  stage('electrical','Rede elétrica e ligação Coelba',['electrical-base','electrical-connection'],[
    activity('electrical-approval','Projeto e aprovação Coelba','processo',['projeto particular','ART','protocolos'],'Projeto aprovado e vigente',1.25),
    activity('crossings-bases','Travessias, dutos e bases','trecho',['dutos','caixas','concreto','aterramento'],'Obra civil inspecionada antes do pavimento',1),
    activity('poles-network','Postes e montagem da rede','un/projeto',['itens do projeto aprovado','materiais homologados'],'Montagem conforme projeto e empresa credenciada',1.35),
    activity('lighting','Iluminação pública e proteção','ponto',['itens do projeto aprovado','aterramento e proteção'],'Ensaios e identificação concluídos',1),
    activity('inspection','Vistoria e correções','processo',['dossiê as-built','laudos','sobressalentes'],'Pendências da vistoria encerradas',.9),
    activity('coelba-connection','Incorporação e ligação Coelba','processo externo',['protocolos','termos de incorporação'],'Rede energizada e liberação formal recebida',1.1)
  ]),
  stage('signage','Entrega, as-built e encerramento',['closeout'],[
    activity('as-built','As-built integrado','dossiê',['levantamentos finais','memoriais','mídia digital'],'Executado compatível com cadastro final',1.15),
    activity('signage-final','Sinalização e identificação','un',['placas','marcos definitivos','sinalização viária'],'Itens instalados e conferidos',.85),
    activity('punch-list','Inspeções e correção de pendências','item',['materiais de reparo','checklists'],'Punch list zerada ou formalmente aceita',1.1),
    activity('receipts-close','Comprovantes, garantias e manuais','dossiê',['notas','certificados','contratos','garantias'],'Dossiê completo e rastreável',.9),
    activity('handover','Aceites e entrega operacional','termo',['termos de recebimento','registro fotográfico'],'Aceites assinados e responsabilidades transferidas',1)
  ])
];

export function findWorkbenchStage(key=''){
  const normalized=String(key).trim().toLowerCase();
  return STAGE_WORKBENCH.find(item=>item.key===normalized||item.aliases.includes(normalized))||STAGE_WORKBENCH[0];
}

export function findWorkbenchActivity(stageKey,activityId){
  const selected=findWorkbenchStage(stageKey);
  return {stage:selected,activity:selected.activities.find(item=>item.id===activityId)||selected.activities[0]};
}
