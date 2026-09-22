/*
 * Operational specification used by the stage workbench and by the worker
 * prompt.  The catalogue deliberately separates what is executable in the
 * field from what must be checked by the responsible technical professional.
 * It is a structured planning aid, not a substitute for a licence, ART/RRT,
 * municipal approval, concessionaire approval or a safety plan.
 */

const stageCompliance={
  project:[
    'Lei Federal 6.766/1979 e legislação municipal de parcelamento do solo',
    'Projeto executivo, memorial e ART/RRT do responsável técnico',
    'Licenciamento ambiental e condicionantes aplicáveis ao imóvel'
  ],
  earthwork:[
    'Projeto de terraplenagem, geometria e drenagem aprovados',
    'Licença/condicionante ambiental e autorização de movimentação de solo, quando exigível',
    'NR-18, PGR do canteiro e destinação regular de resíduos conforme aplicável'
  ],
  drainage:[
    'Projeto hidrológico e de drenagem aprovado pelo responsável técnico',
    'Licença ambiental e autorizações para interferência em recursos hídricos, quando aplicáveis',
    'NR-18 e controle de escavações, escoramentos e sinalização'
  ],
  water:[
    'Projeto de abastecimento e padrão da autoridade/operadora local',
    'Licença ambiental e autorização de uso de água, quando aplicáveis',
    'ART/RRT, rastreabilidade de materiais e ensaios de estanqueidade/potabilidade'
  ],
  curbs:[
    'Projeto viário, drenagem superficial e acessibilidade aprovados',
    'Normas de acessibilidade e legislação municipal aplicáveis',
    'NR-18, sinalização de frente e controle de circulação'
  ],
  paving:[
    'Projeto de pavimentação, seção-tipo e especificação de materiais aprovados',
    'Controle tecnológico e aceite do responsável técnico',
    'NR-18, sinalização de tráfego e destinação regular de resíduos'
  ],
  electrical:[
    'Projeto elétrico particular aprovado pela Neoenergia Coelba quando aplicável',
    'ART/RRT, documentação do empreendimento e materiais/equipamentos homologados',
    'NR-18, procedimentos de segurança elétrica e empresa credenciada quando exigida'
  ],
  signage:[
    'Projetos e termos de aceite do município, concessionárias e demais órgãos aplicáveis',
    'As-built, memoriais, garantias e comprovação de encerramento das condicionantes',
    'NR-18 até a desmobilização completa do canteiro'
  ]
};

const overrides={
  survey:{
    responsibility:{primary:'Topógrafo sob responsabilidade do RT',support:'Encarregado de campo e equipe GNSS',approval:'RT de topografia/engenharia'},
    entryConditions:['Limites do imóvel, sistema de coordenadas e pontos de controle definidos','DWG de referência e autorização de acesso disponíveis'],
    procedure:['Conferir datum, unidades, marcos e tolerâncias do DWG','Implantar ou verificar pontos de apoio com GNSS/estação total','Levantar perímetro, eixos, cotas, interferências e pontos de controle','Processar, revisar e comparar com o projeto antes de publicar no mapa'],
    production:{method:'Contar pontos/eixos levantados e aceitos, vinculando coordenada, cota e precisão',formula:'pontos aceitos = pontos medidos - pontos reprovados ou sem rastreabilidade',rate:'calibrar pontos/dia por equipe e complexidade'},
    evidence:['Arquivo bruto GNSS/estação total','Relatório de processamento e planta assinada','Fotos dos marcos e relatório de conferência'],
    acceptance:['Coordenadas e cotas compatíveis com o sistema do projeto','Desvios dentro da tolerância definida pelo RT','DWG/PDF e versão publicada identificados'],
    conditions:['Divergência de coordenada ou cota bloqueia a locação','Alteração do projeto exige nova revisão e versionamento']
  },
  clearing:{
    responsibility:{primary:'Encarregado de terraplenagem',support:'RT ambiental, operador de máquinas e sinalizador',approval:'RT ambiental quando houver manejo'},
    entryConditions:['Áreas de preservação, árvores, cursos d’água e áreas sociais delimitados','Autorização de supressão/manejo e plano de destinação verificados, quando exigíveis'],
    procedure:['Isolar e sinalizar a frente, preservando marcos e áreas protegidas','Remover vegetação e resíduos somente dentro do limite autorizado','Separar solo orgânico, resíduos de construção e materiais reaproveitáveis','Registrar área, volume, transporte e destinação antes de liberar a terraplenagem'],
    production:{method:'Medir hectares ou setores efetivamente limpos e aceitos pelo RT',formula:'área limpa = setores liberados - áreas protegidas ou pendentes',rate:'calibrar ha/dia por máquina e condição do terreno'},
    evidence:['Autorização/condicionante ambiental quando aplicável','Mapa da área liberada e registro fotográfico antes/durante/depois','Comprovante de transporte e destinação de resíduos'],
    acceptance:['Nenhum marco, área protegida ou drenagem danificado','Área limpa coincide com o polígono autorizado','Resíduos separados e destinados com comprovante'],
    conditions:['Achado ambiental, árvore protegida ou resíduo desconhecido bloqueia o setor','Chuva intensa ou solo instável exige replanejamento'],
    notifications:['Notificar dono e RT ambiental em qualquer desvio de limite ou condicionante']
  },
  staking:{
    responsibility:{primary:'Topógrafo/RT de locação',support:'Encarregado e equipe de apoio',approval:'RT de engenharia'},
    entryConditions:['Levantamento conferido e projeto executivo liberado','Marcos de referência protegidos e acessíveis'],
    procedure:['Transferir eixos, offsets, quadras e lotes do projeto para o campo','Materializar piquetes/estacas com identificação durável','Conferir diagonais, alinhamentos, afastamentos e cotas','Fotografar e registrar coordenadas antes da abertura das frentes'],
    production:{method:'Contar pontos, eixos ou lotes materializados e conferidos',formula:'pontos aceitos = pontos materializados com coordenada e conferência',rate:'calibrar pontos/dia pela densidade do loteamento'},
    evidence:['Caderneta/arquivo de locação','Planta com pontos e offsets','Fotos dos marcos e checklist de conferência'],
    acceptance:['Eixos e lotes no lugar definido pelo projeto','Identificação legível e protegida','RT registra aceite ou pendência'],
    conditions:['Ponto deslocado, marco perdido ou DWG divergente bloqueia a frente']
  },
  'soil-tests':{
    responsibility:{primary:'Laboratório geotécnico e RT',support:'Encarregado de campo e coletor',approval:'RT de geotecnia'},
    entryConditions:['Plano de amostragem e pontos definidos','Acesso seguro e material representativo disponível'],
    procedure:['Identificar ponto, camada, data e condição da coleta','Coletar, acondicionar, lacrar e rastrear a amostra','Executar ensaios previstos no projeto e revisar resultados','Emitir relatório com recomendação de uso, reforço ou correção'],
    production:{method:'Contar ensaios válidos por ponto/camada, não apenas amostras coletadas',formula:'ensaios aceitos = ensaios realizados - ensaios inválidos ou sem cadeia de custódia',rate:'calibrar ensaios/dia pelo laboratório'},
    evidence:['Plano e cadeia de custódia','Laudo laboratorial assinado','Mapa de pontos e fotos da coleta'],
    acceptance:['Amostras identificadas e rastreáveis','Resultados comparados ao critério do projeto','RT registra a decisão de liberar, corrigir ou repetir'],
    conditions:['Resultado fora do critério ou amostra sem rastreio bloqueia a camada/frente']
  },
  'release-design':{
    responsibility:{primary:'Responsável técnico do empreendimento',support:'Projetistas, jurídico, ambiental e dono',approval:'Órgão licenciador/município/concessionária aplicável'},
    entryConditions:['Levantamentos, ensaios e compatibilização concluídos','Documentos de propriedade, licenças e pareceres organizados'],
    procedure:['Consolidar plantas, memoriais, quantitativos e cronograma físico','Revisar interfaces entre vias, redes, drenagem, água, elétrica e áreas sociais','Submeter aos órgãos/concessionárias e registrar protocolos','Publicar somente a revisão aprovada, com data, assinatura e lista de pendências'],
    production:{method:'Contar pacotes de projeto aprovados e vigentes',formula:'pacotes liberados = pacotes aprovados - pacotes vencidos ou com ressalva impeditiva',rate:'calibrar processos/semana, respeitando prazo externo'},
    evidence:['Projetos e memoriais assinados','ART/RRT, licenças, protocolos e aprovações','Matriz de revisão e registro de pendências'],
    acceptance:['Nenhuma interface crítica sem responsável','Aprovações vigentes vinculadas à versão executada','Dono e RT confirmam a liberação'],
    conditions:['Ressalva impeditiva, licença vencida ou projeto incompatível bloqueia a obra'],
    notifications:['Notificar o dono quando protocolo externo ultrapassar o prazo configurado']
  },
  'road-opening':{
    responsibility:{primary:'Encarregado de terraplenagem',support:'Topografia, operador de escavadeira, pá-carregadeira e patrol',approval:'RT de terraplenagem'},
    entryConditions:['Eixos e offsets locados, áreas protegidas sinalizadas','Projeto de geometria e drenagem liberado; interferências identificadas'],
    procedure:['Sinalizar a frente e confirmar eixo, largura, greide e acessos','Executar limpeza/corte conforme seção aprovada sem invadir lotes','Formar corredores por trechos, mantendo drenagem provisória','Medir trecho aberto, registrar máquinas, volume e condição do subleito','Solicitar inspeção topográfica antes da frente seguinte'],
    production:{method:'Medir metros lineares de eixo aberto e aceito por trecho',formula:'produção = comprimento do eixo liberado - trechos fora da seção ou pendentes',rate:'metros/dia = horas produtivas × rendimento da equipe e máquina'},
    evidence:['Boletim diário de máquinas e trechos','Levantamento de conferência e fotos georreferenciadas','Registro de interferências e aceite do RT'],
    acceptance:['Eixo, largura, greide e limites conferidos','Acesso e drenagem provisória seguros','Nenhuma ponta da rua invade o polígono de lote'],
    conditions:['Interferência não cadastrada, chuva/solo instável ou desvio de geometria bloqueia o trecho'],
    notifications:['Disparar alerta ao dono e RT se a produção ficar abaixo do ritmo ou houver invasão de lote']
  },
  'cut-load':{
    responsibility:{primary:'Encarregado de terraplenagem',support:'Operadores de escavadeira/pá-carregadeira e apontador',approval:'RT de terraplenagem'},
    entryConditions:['Frente de corte e destino do material definidos','Caminhões autorizados, rota interna e controle de volume disponíveis'],
    procedure:['Confirmar cota de corte e material aproveitável','Escavar sem comprometer taludes, lotes ou redes','Carregar caminhão respeitando capacidade e registrar origem/destino','Separar solo orgânico, material inadequado e material de empréstimo','Conferir volume por medição, romaneio ou levantamento topográfico'],
    production:{method:'Medir m³ compactados ou soltos conforme o critério do projeto, sem misturar bases',formula:'volume produzido = seção medida × comprimento aceito; validar fator de empolamento com RT',rate:'m³/dia = ciclos válidos × volume médio × horas produtivas'},
    evidence:['Boletim de corte, carregamento e destino','Romaneios/viagens vinculados à origem','Levantamentos antes/depois e fotos'],
    acceptance:['Cota e taludes conforme projeto','Volume reconciliado com viagens e medição','Material inadequado segregado e destinado'],
    conditions:['Diferença entre romaneio e medição, talude inseguro ou material contaminado bloqueia o lançamento']
  },
  'internal-haul':{
    responsibility:{primary:'Encarregado de logística de obra',support:'Apontador, motoristas e encarregado de terraplenagem',approval:'RT/controle de medição'},
    entryConditions:['Origem, destino e rota interna definidos','Caçambas identificadas e carga/volume de referência calibrados'],
    procedure:['Registrar placa/equipamento, origem, destino, horário e tipo de material','Conferir capacidade e condição de segurança da viagem','Descarregar no setor correto sem misturar materiais','Fechar o boletim diário e reconciliar com corte/aterro','Comunicar espera, desvio de rota ou indisponibilidade'],
    production:{method:'Contar viagens internas válidas e associar volume estimado por caçamba',formula:'m³ transportados = viagens aceitas × capacidade média calibrada × fator de carga',rate:'viagens/dia = ciclos completos sem rejeição'},
    evidence:['Boletim de viagens/romaneios','Registro de origem/destino e fotos de descarga','Conciliação com medição de corte/aterro'],
    acceptance:['Toda viagem possui origem, destino e responsável','Volume não é duplicado no diário','Rota não interfere em lotes, drenagens ou segurança'],
    conditions:['Viagem sem rastreio, carga incompatível ou rota interditada bloqueia a apropriação']
  },
  'spread-moisture':{
    responsibility:{primary:'Encarregado de terraplenagem',support:'Operador de patrol, caminhão-pipa e controle tecnológico',approval:'RT de terraplenagem'},
    entryConditions:['Material aprovado e camada/espessura definidas','Base drenada e equipamento de espalhamento disponível'],
    procedure:['Distribuir o material na espessura da camada','Regularizar com patrol respeitando greide e caimento','Aplicar água de forma uniforme e registrar condição de umidade','Conferir espessura, cota e homogeneidade antes de compactar','Liberar a camada ou registrar correção necessária'],
    production:{method:'Medir m³ ou m² de camada espalhada, umidificada e aprovada',formula:'camada pronta = área aceita × espessura medida; não contar trecho apenas molhado',rate:'m³/dia = área preparada × espessura × ciclos produtivos'},
    evidence:['Boletim de umidificação e consumo de água','Controle de espessura/cotas','Fotos da camada antes da compactação'],
    acceptance:['Espessura e greide conferidos','Umidade homogênea dentro do critério do ensaio','Sem poças, segregação ou material orgânico'],
    conditions:['Chuva, falta de água, segregação ou umidade fora do critério bloqueia a compactação']
  },
  compaction:{
    responsibility:{primary:'Encarregado de terraplenagem e controle tecnológico',support:'Operador de rolo, laboratório e topografia',approval:'RT de geotecnia/terraplenagem'},
    entryConditions:['Camada espalhada com espessura e umidade conferidas','Rolo, passadas de referência e ensaio definidos'],
    procedure:['Executar passadas conforme plano e controlar velocidade/sobreposição','Registrar equipamento, número de passadas, camada e trecho','Coletar ensaio de compactação/densidade conforme projeto','Recompactar ou remover trecho fora do critério','Liberar somente após laudo e conferência de cotas'],
    production:{method:'Medir m³ de camada compactada e aceita com ensaio vinculado',formula:'produção válida = volume da camada × percentual de ensaios aceitos',rate:'m³/dia = área aceita × espessura compactada'},
    evidence:['Laudos de densidade/compactação','Mapa de ensaios por camada','Boletim do rolo e fotos'],
    acceptance:['Grau de compactação e umidade atendem ao projeto','Cotas, inclinações e espessura finais conferidas','Trechos reprovados possuem correção registrada'],
    conditions:['Ensaio reprovado, camada molhada ou ausência de rastreabilidade bloqueia o avanço']
  },
  subgrade:{
    responsibility:{primary:'Encarregado de terraplenagem',support:'Patrol, rolo, topografia e controle tecnológico',approval:'RT de pavimentação/terraplenagem'},
    entryConditions:['Camadas inferiores aceitas e drenagem provisória funcionando','Seção-tipo, greide e caimentos disponíveis'],
    procedure:['Regularizar o subleito com patrol conforme seção','Corrigir pontos moles, erosões e excesso de material','Compactar e conferir cotas, caimentos e largura','Registrar ensaios e liberar para base granular'],
    production:{method:'Medir m² de subleito regularizado e aceito por trecho',formula:'m² aceitos = área dentro da seção - áreas com correção pendente',rate:'m²/dia = faixa liberada × comprimento produtivo'},
    evidence:['Levantamento de cotas e seção','Ensaios/controle tecnológico','Fotos e checklist de liberação'],
    acceptance:['Greide, inclinação e largura conforme projeto','Sem pontos moles ou erosão ativa','Aceite formal para receber a base'],
    conditions:['Drenagem insuficiente, solo mole ou cota divergente bloqueia a base']
  },
  'drain-layout':{
    responsibility:{primary:'Encarregado de drenagem',support:'Topografia, escavadeira e sinalização',approval:'RT de drenagem'},
    entryConditions:['Projeto de drenagem compatibilizado com redes e lotes','Interferências e cotas de jusante conferidas'],
    procedure:['Locar eixo, largura, profundidade e poços/descargas','Sinalizar e isolar a escavação','Abrir vala por trechos estáveis, com escoramento quando necessário','Conferir cota de fundo antes do berço','Registrar trecho, volume escavado e condição do solo'],
    production:{method:'Medir metros lineares de vala aberta e liberada para berço',formula:'produção = comprimento com cota de fundo conferida e escavação segura',rate:'m/dia = comprimento aberto por equipe com frente segura'},
    evidence:['Caderneta topográfica e cotas de fundo','Checklist de escavação/escoramento','Fotos e registro de interferências'],
    acceptance:['Eixo, cota, largura e taludes compatíveis','Interferências tratadas e vala segura','Berço pode ser executado sem retrabalho'],
    conditions:['Água na vala, interferência desconhecida ou escoramento ausente bloqueia']
  },
  bedding:{
    responsibility:{primary:'Encarregado de drenagem',support:'Equipe de apoio, topografia e fornecedor de agregados',approval:'RT de drenagem'},
    entryConditions:['Vala limpa, estável e com cota liberada','Brita/areia/concreto magro rastreados e disponíveis'],
    procedure:['Limpar e regularizar o fundo sem material solto','Executar berço na espessura especificada','Conferir cota, caimento e apoio contínuo','Registrar antes de assentar tubos/manilhas'],
    production:{method:'Medir metros lineares de berço executado e aceito',formula:'m aceitos = comprimento com espessura, cota e apoio contínuos',rate:'m/dia = trechos de berço aceitos por equipe'},
    evidence:['Nota/romaneio do agregado ou concreto','Fotos do fundo e do berço','Conferência de espessura e cotas'],
    acceptance:['Apoio contínuo, sem pontos ocos','Caimento e cota dentro do projeto','Trecho pronto para assentamento'],
    conditions:['Fundo saturado, espessura irregular ou material sem rastreio bloqueia']
  },
  pipes:{
    responsibility:{primary:'Encarregado de drenagem',support:'Equipe de assentamento, içamento e topografia',approval:'RT de drenagem'},
    entryConditions:['Berço aceito e tubos/manilhas conferidos','Plano de içamento, juntas e sequência de montagem definidos'],
    procedure:['Conferir diâmetro, classe, integridade e sentido de assentamento','Assentar cada peça sobre o berço sem impacto','Executar juntas conforme especificação e limpar o interior','Conferir alinhamento, declividade e cotas de montante/jusante','Registrar lote de material e liberar para reaterro'],
    production:{method:'Medir metros lineares de tubo/manilha assentados e aceitos',formula:'m aceitos = comprimento instalado com junta, alinhamento e declividade conferidos',rate:'m/dia = peças assentadas × comprimento útil'},
    evidence:['Romaneio/lote do fabricante','Checklist de juntas e cotas','Fotos internas, juntas e trecho concluído'],
    acceptance:['Diâmetro e material conforme projeto','Declividade, alinhamento e juntas aprovados','Interior limpo e sem peça danificada'],
    conditions:['Junta aberta, peça trincada, cota divergente ou água impedindo inspeção bloqueia']
  },
  'drain-boxes':{
    responsibility:{primary:'Encarregado de drenagem',support:'Pedreiro, armador, formas e topografia',approval:'RT de drenagem'},
    entryConditions:['Tubulação e cotas de conexão conferidas','Detalhe estrutural, aço, formas e grelhas disponíveis'],
    procedure:['Locar caixa/PV/boca de lobo e conferir cotas de entrada/saída','Executar base, armadura, formas e alvenaria/concreto','Instalar conexões, degraus, tampa/grelha e acabamento','Conferir estanqueidade, acesso e segurança','Registrar unidade e coordenada no as-built'],
    production:{method:'Contar unidades construídas, conectadas e aceitas',formula:'un aceitas = caixas/PVs com cota, conexão, tampa e inspeção concluídas',rate:'un/dia = unidades liberadas por equipe'},
    evidence:['Romaneios de blocos, aço, grelhas e concreto','Fotos de armadura, conexões e acabamento','Ficha de cota e coordenada'],
    acceptance:['Entrada/saída e fundo nas cotas','Tampa/grelha nivelada, segura e acessível','Conexões sem obstrução'],
    conditions:['Caixa sem cota, grelha insegura ou conexão obstruída bloqueia o trecho']
  },
  backfill:{
    responsibility:{primary:'Encarregado de drenagem',support:'Equipe de reaterro, compactador e controle tecnológico',approval:'RT de drenagem/terraplenagem'},
    entryConditions:['Tubulação/caixas inspecionadas e fotografadas','Material selecionado e camadas de compactação definidos'],
    procedure:['Selecionar material sem pedras ou resíduos incompatíveis','Reaterrar lateralmente em camadas simétricas','Compactar cada camada sem deslocar a tubulação','Conferir cotas finais e recompor a superfície','Registrar espessura, equipamento e ensaio quando previsto'],
    production:{method:'Medir m³ de reaterro compactado e aceito',formula:'m³ aceitos = volume geométrico reaterrado com camadas e ensaios liberados',rate:'m³/dia = volume por camada × ciclos de compactação'},
    evidence:['Comprovante de origem do solo selecionado','Boletim de camadas/ensaios','Fotos antes do fechamento e superfície final'],
    acceptance:['Tubulação não deslocada ou danificada','Camadas e compactação dentro do critério','Superfície recomposta sem abatimento'],
    conditions:['Material inadequado, recalque ou dano à rede bloqueia o fechamento']
  },
  'drain-test':{
    responsibility:{primary:'RT de drenagem',support:'Encarregado, equipe de inspeção e topografia',approval:'Dono/órgão responsável quando aplicável'},
    entryConditions:['Trecho fechado, caixas acessíveis e as-built preliminar disponível','Equipamento e água de teste autorizados'],
    procedure:['Inspecionar visualmente caixas e extremidades','Executar teste de vazão/continuidade no sentido de projeto','Registrar cotas, obstruções, infiltrações e tempo de escoamento','Corrigir pendências e repetir o teste','Publicar relatório e as-built do trecho aceito'],
    production:{method:'Contar trechos/setores testados e aprovados',formula:'setores aceitos = testes aprovados - testes com pendência aberta',rate:'trechos/dia = testes completos com relatório'},
    evidence:['Relatório de teste e vazão','Vídeo/fotos da inspeção','As-built com cotas e coordenadas'],
    acceptance:['Vazão e continuidade sem obstrução','Cotas compatíveis e sem vazamento impeditivo','RT assina o aceite'],
    conditions:['Obstrução, vazão insuficiente ou as-built divergente bloqueia a liberação']
  },
  'water-trench':{
    responsibility:{primary:'Encarregado de rede de água',support:'Equipe de vala, topografia e segurança',approval:'RT/supervisão da rede de água'},
    entryConditions:['Projeto hidráulico, faixa da rede e separação sanitária definidos','Interferências e profundidade de recobrimento conferidas'],
    procedure:['Locar a vala e sinalizar a frente','Escavar com estabilidade e manter afastamentos das demais redes','Executar fundo e envoltória com material aprovado','Conferir cota, recobrimento e pontos de conexão','Registrar trecho e liberar para PEAD'],
    production:{method:'Medir metros lineares de vala com envoltória e cota aceitas',formula:'m aceitos = vala pronta com recobrimento/afastamento conferidos',rate:'m/dia = comprimento de vala segura e liberada'},
    evidence:['Cotas, seção e fotos da vala','Romaneio da areia/envoltória','Checklist de separação sanitária'],
    acceptance:['Profundidade, recobrimento e afastamentos atendidos','Fundo estável e envoltória contínua','Sem risco de dano às redes vizinhas'],
    conditions:['Interferência, água na vala ou separação insuficiente bloqueia']
  },
  'pead-main':{
    responsibility:{primary:'Encarregado hidráulico habilitado',support:'Operador da termofusora, equipe de assentamento e RT',approval:'RT/operadora de água quando aplicável'},
    entryConditions:['Tubos PEAD, conexões e parâmetros de termofusão conferidos','Vala/berço liberados e plano de setorização disponível'],
    procedure:['Conferir lote, diâmetro, SDR e integridade do tubo','Alinhar, facear e termofusionar conforme procedimento do fabricante','Registrar operador, temperatura, tempo, junta e trecho','Assentar sem tração ou dobra fora do raio permitido','Executar inspeção visual e preparar ensaio'],
    production:{method:'Medir metros lineares de rede PEAD com soldas rastreadas',formula:'m aceitos = comprimento instalado - juntas reprovadas ou trecho sem registro',rate:'m/dia = comprimento de tubo instalado e inspecionado'},
    evidence:['Certificados/romaneios dos tubos e conexões','Ficha de termofusão por junta','Fotos de juntas e trecho'],
    acceptance:['Material e diâmetro conforme projeto','Juntas íntegras e rastreáveis','Rede sem dobra, contaminação ou dano'],
    conditions:['Junta sem ficha, parâmetro fora do fabricante ou material divergente bloqueia']
  },
  valves:{
    responsibility:{primary:'Encarregado hidráulico',support:'Montador, pedreiro e topografia',approval:'RT/operadora de água'},
    entryConditions:['Rede principal e setorização definidas','Registros, válvulas, ventosas e caixas conferidos'],
    procedure:['Locar pontos de manobra e ventosa','Instalar componentes no sentido correto e com acesso','Executar caixas, tampas e drenagem local','Identificar setor e posição no cadastro','Testar operação antes do fechamento'],
    production:{method:'Contar unidades instaladas, acessíveis e operacionais',formula:'un aceitas = componentes instalados + caixa/tampa + identificação + teste',rate:'un/dia = unidades completas por equipe'},
    evidence:['Romaneio e certificados dos componentes','Fotos de montagem e tampa','Mapa de setorização e teste de operação'],
    acceptance:['Componente no sentido e cota corretos','Acesso seguro e tampa nivelada','Identificação compatível com o as-built'],
    conditions:['Válvula inacessível, sem identificação ou sem teste bloqueia o setor']
  },
  branches:{
    responsibility:{primary:'Encarregado da rede de água',support:'Equipe de ramais, cadastro de lotes e RT',approval:'RT/operadora de água'},
    entryConditions:['Cadastro dos 298 lotes e pontos de entrega conferidos','Rede principal testada no trecho e kits de ligação disponíveis'],
    procedure:['Locar o ponto de cada lote e identificar quadra/lote','Executar derivação, ramal, registro e proteção sem cruzar lote vizinho','Registrar material, lote, coordenada e profundidade','Testar estanqueidade do ramal','Atualizar mapa de cobertura por lote'],
    production:{method:'Contar ramais completos e identificados por lote',formula:'ramais aceitos = ramais instalados com teste e cadastro / 298 lotes',rate:'ramais/dia = ligações completas por equipe'},
    evidence:['Mapa dos 298 lotes e planilha de rastreio','Romaneios de tubos/conexões/kits','Fotos e fichas de teste por ramal'],
    acceptance:['Ponto correto do lote e sem invasão de faixa','Ramal protegido, estanque e identificado','Cadastro atualizado e conferido'],
    conditions:['Lote sem cadastro, ramal sem teste ou conexão incompatível bloqueia a entrega']
  },
  meters:{
    responsibility:{primary:'Encarregado hidráulico',support:'Equipe de cavaletes, cadastro e fiscalização',approval:'RT/operadora de água'},
    entryConditions:['Ramais aceitos e padrão de ligação definido','Cavaletes/esperas e caixas de proteção disponíveis'],
    procedure:['Conferir lote, alinhamento e altura do ponto','Instalar cavalete/espera com proteção contra impacto','Identificar cada unidade e registrar posição','Verificar acesso, estanqueidade e compatibilidade com o padrão','Atualizar cadastro para futura instalação/medição'],
    production:{method:'Contar cavaletes/esperas instalados e aceitos por lote',formula:'cavaletes aceitos = unidades com proteção, identificação e teste / 298',rate:'un/dia = pontos completos por equipe'},
    evidence:['Romaneio dos 298 cavaletes/esperas','Ficha por lote e fotos','Checklist de padrão e teste'],
    acceptance:['Alinhamento, proteção e acesso atendidos','Identificação não ambígua','Cadastro do lote atualizado'],
    conditions:['Ponto fora do padrão, sem proteção ou sem identificação bloqueia']
  },
  'pressure-test':{
    responsibility:{primary:'RT da rede de água',support:'Encarregado, equipe de teste e laboratório',approval:'Operadora/autoridade de água quando aplicável'},
    entryConditions:['Setor fechado, componentes instalados e extremidades controladas','Plano de pressão, lavagem e desinfecção aprovado'],
    procedure:['Isolar o setor e instalar instrumentos calibrados','Executar teste de pressão pelo tempo especificado','Lavar, desinfectar e coletar amostras quando exigido','Registrar pressão, tempo, perdas, vazamentos e correções','Emitir laudo e liberar o setor para cobertura/uso'],
    production:{method:'Contar setores ensaiados, lavados e aprovados',formula:'setores aceitos = testes aprovados + laudo de lavagem/desinfecção',rate:'setores/dia = ciclos completos com registro'},
    evidence:['Certificado de calibração dos instrumentos','Relatório de pressão, lavagem e desinfecção','Laudos de qualidade/potabilidade quando exigidos'],
    acceptance:['Pressão mantida no critério','Sem vazamento ou contaminação impeditiva','Laudo e as-built do setor assinados'],
    conditions:['Queda de pressão, vazamento ou laudo pendente bloqueia a conexão']
  },
  'curb-layout':{
    responsibility:{primary:'Encarregado de meio-fio',support:'Topografia, gabaritos e equipe de sinalização',approval:'RT viário'},
    entryConditions:['Subleito/base e drenagem liberados','Linha, raio, cotas e pontos de acessibilidade definidos'],
    procedure:['Locar linha, raio, cruzamentos e rebaixamentos','Conferir relação com lotes, sarjetas e caixas','Instalar gabaritos e registrar pontos críticos','Liberar trecho para base do meio-fio'],
    production:{method:'Medir metros lineares locados e aceitos para execução',formula:'m aceitos = linha/raio conferidos sem invasão dos lotes',rate:'m/dia = comprimento de locação concluída'},
    evidence:['Caderneta de locação e fotos','Planta de raios/rebaixamentos','Checklist de interferências'],
    acceptance:['Linha, raio e cota conforme projeto','Sem invasão ou estrangulamento de lote','Rebaixamentos identificados'],
    conditions:['Desvio geométrico ou interferência não tratada bloqueia o assentamento']
  },
  'curb-base':{
    responsibility:{primary:'Encarregado de meio-fio',support:'Equipe de base, compactador e controle tecnológico',approval:'RT viário'},
    entryConditions:['Locação aprovada e subleito estável','Brita/areia/concreto e compactador disponíveis'],
    procedure:['Preparar a faixa da base sem material orgânico','Executar e compactar a base na espessura do projeto','Conferir cota, largura e continuidade','Registrar consumo e liberar para assentamento'],
    production:{method:'Medir metros lineares de base contínua e compactada',formula:'m aceitos = faixa com espessura/cota verificadas e sem pontos moles',rate:'m/dia = comprimento de base liberada'},
    evidence:['Romaneios de agregados','Boletim de compactação','Fotos e cotas da base'],
    acceptance:['Base contínua, compactada e na cota','Sem material orgânico ou erosão','Apoio uniforme para o meio-fio'],
    conditions:['Base desagregada, fora de cota ou sem controle bloqueia']
  },
  'curb-install':{
    responsibility:{primary:'Encarregado de meio-fio',support:'Equipe de assentamento, pedreiro e topografia',approval:'RT viário'},
    entryConditions:['Base e locação aceitas','Peças, argamassa/concreto e ferramentas conferidos'],
    procedure:['Conferir lote e integridade das peças','Assentar meio-fio na linha e cota do projeto','Executar travamento e juntas sem deixar vazios','Conferir raios, bocas de lobo e limites dos lotes','Registrar trecho e liberar para sarjeta/pavimento'],
    production:{method:'Medir metros lineares de meio-fio alinhado e aceito',formula:'m aceitos = comprimento instalado sem ponta invadindo lote e com juntas/travamento concluídos',rate:'m/dia = comprimento assentado e conferido'},
    evidence:['Romaneio das peças','Fotos de linha, juntas e arremates','Levantamento de alinhamento e cotas'],
    acceptance:['Alinhamento, raio e cota uniformes','Juntas e travamento executados','Margem do lote preservada e sem pontas'],
    conditions:['Peça quebrada, ponta invadindo lote ou cota divergente bloqueia']
  },
  gutters:{
    responsibility:{primary:'Encarregado de pavimentação/drenagem',support:'Equipe de concreto, formas e topografia',approval:'RT viário/drenagem'},
    entryConditions:['Meio-fio aceito e pontos de descarga definidos','Formas, concreto e acabamento disponíveis'],
    procedure:['Preparar sub-base entre meio-fio e faixa de rolamento','Executar forma/guia e lançar concreto na seção projetada','Garantir caimento contínuo às bocas de lobo','Acabar, curar e proteger contra tráfego prematuro','Testar escoamento e registrar trecho'],
    production:{method:'Medir metros lineares de sarjeta funcional e aceita',formula:'m aceitos = comprimento com seção, caimento e descarga funcionando',rate:'m/dia = sarjeta acabada e testada'},
    evidence:['Nota/romaneio do concreto','Fotos de seção, caimento e cura','Registro de teste de escoamento'],
    acceptance:['Seção e caimento conforme projeto','Sem poças ou descontinuidade','Conexão com drenagem desobstruída'],
    conditions:['Caimento invertido, concreto sem cura ou descarga obstruída bloqueia']
  },
  accessibility:{
    responsibility:{primary:'RT de acessibilidade/obra',support:'Encarregado, equipe de concreto e sinalização',approval:'Fiscalização municipal quando aplicável'},
    entryConditions:['Projeto de acessibilidade compatibilizado com meio-fio e calçadas','Rotas, rampas, piso tátil e sinalização definidos'],
    procedure:['Locar rota acessível, rampas e áreas de travessia','Executar base, rampas, pisos e elementos táteis conforme projeto','Conferir inclinação, largura, continuidade e obstáculos','Registrar cada ponto e corrigir não conformidades','Solicitar vistoria/aceite'],
    production:{method:'Contar unidades/pontos de acessibilidade completos e aceitos',formula:'pontos aceitos = rampas e travessias sem descontinuidade + checklist aprovado',rate:'un/dia = pontos completos por equipe'},
    evidence:['Checklist e medições de inclinação/largura','Fotos antes/depois','Registro de vistoria'],
    acceptance:['Rota contínua, sinalizada e sem obstáculos','Inclinações e dimensões conforme projeto/norma aplicável','Ponto identificado no mapa'],
    conditions:['Obstáculo, inclinação fora do critério ou piso incompleto bloqueia a liberação']
  },
  'paving-base':{
    responsibility:{primary:'Encarregado de pavimentação',support:'Patrol, rolo, laboratório e topografia',approval:'RT de pavimentação'},
    entryConditions:['Subleito, drenagem e meio-fio aceitos','Agregado, água, seção-tipo e ensaios definidos'],
    procedure:['Receber e conferir agregado por lote','Espalhar na espessura projetada sem segregação','Regularizar, umidificar e compactar por camada','Conferir espessura, cotas e caimentos','Executar ensaio e liberar para colchão'],
    production:{method:'Medir m² de base granular compactada e aceita',formula:'m² aceitos = área com espessura, densidade, cota e caimento aprovados',rate:'m²/dia = faixa aceita por camada'},
    evidence:['Romaneios e origem do agregado','Ensaios de granulometria/compactação quando previstos','Levantamento e fotos da base'],
    acceptance:['Espessura e compactação atendem ao projeto','Caimentos levam água à drenagem','Sem segregação ou pontos moles'],
    conditions:['Ensaio reprovado, base molhada ou meio-fio desalinhado bloqueia']
  },
  'sand-bed':{
    responsibility:{primary:'Encarregado de pavimentação',support:'Equipe de guias e topografia',approval:'RT de pavimentação'},
    entryConditions:['Base granular e meio-fio aceitos','Areia/pó de pedra limpos e guias de nível disponíveis'],
    procedure:['Distribuir material do colchão sem contaminar a base','Controlar espessura e perfil com guias','Regularizar sem compactar prematuramente','Liberar apenas a faixa que será pavimentada no turno'],
    production:{method:'Medir m² de colchão na espessura e perfil aceitos',formula:'m² aceitos = área preparada com espessura uniforme e sem tráfego indevido',rate:'m²/dia = área de colchão imediatamente pavimentável'},
    evidence:['Romaneio do material','Medição de espessura e perfil','Fotos antes do assentamento'],
    acceptance:['Espessura uniforme','Perfil e caimento corretos','Sem contaminação, chuva ou deformação'],
    conditions:['Colchão encharcado, fora de espessura ou exposto sem proteção bloqueia']
  },
  'stone-logistics':{
    responsibility:{primary:'Encarregado de suprimentos/pavimentação',support:'Apontador, motorista e equipe de descarga',approval:'RT/controle de recebimento'},
    entryConditions:['Trechos liberados e área de descarga definida','Fornecedor, romaneio e unidade de consumo calibrados'],
    procedure:['Conferir tamanho, integridade e origem do lote','Registrar caminhão, quantidade e perdas no recebimento','Descarregar sem danificar meio-fio, drenagem ou lotes','Distribuir por frente e armazenar sem obstruir circulação','Conciliar 5.000 pedras/caminhão e referência de 45 pedras/m² com a medição real'],
    production:{method:'Contar caminhões e pedras aceitas, convertendo para m² úteis',formula:'m² úteis = pedras recebidas × (1 - perda confirmada) ÷ consumo real de pedras/m²',rate:'caminhões/dia = entregas conferidas e alocadas'},
    evidence:['Romaneio e nota fiscal','Fotos do lote/descarga','Registro de perdas e conciliação com área pavimentada'],
    acceptance:['Quantidade e qualidade conferidas','Perda registrada e justificada','Material associado ao trecho e à compra'],
    conditions:['Material divergente, quebra anormal ou descarga em área insegura bloqueia o uso']
  },
  'stone-setting':{
    responsibility:{primary:'Encarregado de calcetaria',support:'Equipe de calceteiros, guias e topografia',approval:'RT de pavimentação'},
    entryConditions:['Base e colchão aceitos; pedras conferidas','Paginação, alinhamento, juntas e arremates definidos'],
    procedure:['Iniciar pela linha/guia definida, mantendo esquadro e paginação','Assentar peças com juntas uniformes e orientação estável','Executar arremates, bordas, bocas de lobo e encontros','Conferir nível, caimento e integridade antes do rejunte','Registrar área, equipe e perdas por frente'],
    production:{method:'Medir m² de paralelepípedo assentado e aceito',formula:'m² aceitos = área entre meios-fios com paginação, juntas e caimento conferidos',rate:'m²/dia = equipe de calceteiros × rendimento calibrado'},
    evidence:['Boletim de equipe e produção','Fotos de paginação, bordas e encontros','Medição por trecho com perdas'],
    acceptance:['Peças estáveis, sem juntas excessivas ou vazios','Caimento para sarjeta e drenagem','Margens contidas entre meios-fios, sem invasão dos lotes'],
    conditions:['Colchão deslocado, ponta solta, junta irregular ou drenagem obstruída bloqueia']
  },
  'grout-compact':{
    responsibility:{primary:'Encarregado de calcetaria',support:'Equipe de rejunte, placa vibratória/rolo e limpeza',approval:'RT de pavimentação'},
    entryConditions:['Assentamento inspecionado e área sem peças soltas','Material de rejunte e equipamento de compactação disponíveis'],
    procedure:['Distribuir areia/pó de pedra seco e limpo nas juntas','Varrer e preencher vazios sem deslocar peças','Compactar em passadas controladas e repetir o preenchimento','Conferir nível, juntas, drenagem e bordas','Registrar superfície concluída e proteção até a liberação'],
    production:{method:'Medir m² rejuntado, compactado e aceito',formula:'m² aceitos = área com juntas preenchidas + superfície estável + caimento mantido',rate:'m²/dia = área compactada sem retrabalho'},
    evidence:['Romaneio do rejunte','Boletim de passadas/equipamento','Fotos da superfície final'],
    acceptance:['Juntas preenchidas e peças estáveis','Sem ondulação ou deslocamento','Drenagem superficial preservada'],
    conditions:['Peça deslocada, junta aberta ou água acumulada bloqueia a liberação']
  },
  'paving-release':{
    responsibility:{primary:'RT de pavimentação',support:'Encarregado, sinalização e fiscalização de tráfego',approval:'Dono/município quando aplicável'},
    entryConditions:['Trecho rejuntado, compactado e sem pendências críticas','Sinalização temporária e plano de abertura disponíveis'],
    procedure:['Limpar excesso de material sem lançar resíduos na drenagem','Inspecionar meio-fio, sarjeta, bocas de lobo e bordas','Registrar defeitos, corrigir e repetir inspeção','Instalar sinalização e liberar tráfego conforme critério do RT','Atualizar status físico e mapa operacional'],
    production:{method:'Contar trechos vistoriados e liberados ao tráfego',formula:'trechos aceitos = inspeções sem pendência impeditiva e sinalização instalada',rate:'trechos/dia = inspeções completas'},
    evidence:['Checklist de liberação','Fotos do trecho e sinalização','Termo/registro de vistoria'],
    acceptance:['Superfície segura e estável','Drenagem e acessibilidade preservadas','Liberação formal registrada'],
    conditions:['Defeito de superfície, drenagem obstruída ou sinalização ausente bloqueia']
  },
  'electrical-approval':{
    responsibility:{primary:'RT eletricista do empreendimento',support:'Projetista, dono e documentação administrativa',approval:'Neoenergia Coelba/órgão competente'},
    entryConditions:['Demanda, ponto de entrega e cadastro do empreendimento definidos','Projeto, memorial, ART/RRT e formulários exigidos preparados'],
    procedure:['Conferir projeto elétrico, demanda, proteção, aterramento e iluminação','Protocolar na agência/canal indicado pela distribuidora','Registrar protocolo, prazo e ressalvas','Responder exigências sem executar alteração não aprovada','Publicar versão liberada para obra e manter validade monitorada'],
    production:{method:'Contar processos/projetos aprovados e vigentes',formula:'processos liberados = aprovações válidas - processos com ressalva impeditiva ou vencidos',rate:'processos/mês, respeitando análise externa'},
    evidence:['Carta/formulário de solicitação','Projeto, memorial, cálculos e ART/RRT','Protocolo, aprovação e comunicações da distribuidora'],
    acceptance:['Projeto aprovado e vigente','Exigências encerradas ou formalmente tratadas','Versão aprovada vinculada ao canteiro'],
    conditions:['Projeto reprovado, prazo externo vencido ou mudança sem reapresentação bloqueia a obra'],
    notifications:['Notificar dono e RT no protocolo, na exigência e no vencimento do prazo externo']
  },
  'crossings-bases':{
    responsibility:{primary:'Encarregado de infraestrutura elétrica',support:'Equipe civil, topografia e segurança',approval:'RT eletricista/concessionária quando aplicável'},
    entryConditions:['Projeto elétrico aprovado e interferências compatibilizadas','Dutos, caixas, concreto e aterramento conferidos'],
    procedure:['Locar travessias, bases e caixas conforme projeto','Executar escavação, dutos, envelopamento e bases','Instalar guia, tampas e sinalização de identificação','Fotografar antes do fechamento e conferir recobrimento','Liberar para pavimentação somente após inspeção'],
    production:{method:'Medir trechos/unidades de obra civil elétrica aceitos',formula:'produção = travessias e bases completas com recobrimento, identificação e inspeção',rate:'trechos/dia ou unidades/dia conforme projeto'},
    evidence:['Romaneio de dutos, caixas e concreto','Fotos antes do reaterro','Checklist de recobrimento e coordenadas'],
    acceptance:['Duto contínuo, caixa acessível e base na posição','Recobrimento/proteção conforme projeto','Nenhuma interferência com drenagem/água'],
    conditions:['Duto obstruído, recobrimento insuficiente ou base fora da posição bloqueia']
  },
  'poles-network':{
    responsibility:{primary:'Empresa elétrica credenciada quando exigida',support:'RT eletricista, equipe de montagem e sinalização',approval:'Neoenergia Coelba'},
    entryConditions:['Projeto aprovado, materiais homologados e empresa habilitada','Bases, faixas e plano de segurança liberados'],
    procedure:['Conferir poste, ferragens, cabos e equipamentos contra o projeto','Implantar postes e montar rede respeitando afastamentos','Executar aterramento e identificação','Inspecionar torque, prumo, vãos e conexões sem energizar','Documentar alterações para aprovação antes da ligação'],
    production:{method:'Contar postes/trechos montados, inspecionados e aceitos',formula:'un/trechos aceitos = montagem conforme projeto + aterramento + inspeção',rate:'un/dia ou trecho/projeto, conforme equipe credenciada'},
    evidence:['Notas e certificados de materiais homologados','Boletim de montagem e fotos','Laudos/ensaios e checklists de segurança'],
    acceptance:['Montagem conforme projeto aprovado','Afastamentos, prumo, aterramento e identificação conferidos','Pendências da inspeção encerradas'],
    conditions:['Material não homologado, equipe não habilitada ou montagem diferente do projeto bloqueia'],
    notifications:['Notificar o dono antes de qualquer alteração que exija reapresentação à Coelba']
  },
  lighting:{
    responsibility:{primary:'RT eletricista',support:'Equipe de iluminação, montagem e ensaios',approval:'Neoenergia Coelba/município'},
    entryConditions:['Rede e projeto de iluminação aprovados','Luminárias, proteção, aterramento e instrumentos disponíveis'],
    procedure:['Instalar luminárias, comandos e proteção nos pontos definidos','Conferir aterramento, identificação e proteção contra contato','Executar ensaios de continuidade/isolation conforme procedimento','Testar acionamento e registrar ponto/horário','Corrigir pendências antes da vistoria'],
    production:{method:'Contar pontos de iluminação instalados, testados e aceitos',formula:'pontos aceitos = luminárias + comando/proteção + ensaio + identificação',rate:'pontos/dia = pontos completos por equipe'},
    evidence:['Romaneio e certificados dos equipamentos','Fichas de ensaio e fotos','Mapa de pontos e relatório de acionamento'],
    acceptance:['Ponto, potência e proteção conforme projeto','Aterramento/ensaios registrados','Acionamento e identificação funcionando'],
    conditions:['Ensaio reprovado, proteção ausente ou ponto divergente bloqueia']
  },
  inspection:{
    responsibility:{primary:'RT eletricista e responsável pela interface com a distribuidora',support:'Encarregado, empresa executora e documentação',approval:'Neoenergia Coelba'},
    entryConditions:['Rede concluída, as-built preliminar e dossiê disponíveis','Lista de pendências e protocolo de vistoria abertos'],
    procedure:['Solicitar/acompanhar vistoria pelo canal oficial','Acompanhar inspeção e registrar cada ressalva','Classificar pendência por responsável, prazo e impacto','Executar correções somente conforme projeto aprovado','Anexar evidências e solicitar encerramento'],
    production:{method:'Contar pendências encerradas e vistoria aprovada',formula:'pendências resolvidas = itens aceitos pela vistoria - itens reabertos',rate:'pendências/dia ou processo/ciclo externo'},
    evidence:['Protocolo e relatório de vistoria','Fotos/laudos de correção','Dossiê as-built atualizado'],
    acceptance:['Pendências críticas zeradas','Vistoria aprovada ou aceite formal','Documentos vinculados ao protocolo correto'],
    conditions:['Pendência de segurança, documentação ou obra divergente bloqueia a ligação'],
    notifications:['Notificar dono e RT a cada exigência crítica, rejeição ou prazo perdido']
  },
  'coelba-connection':{
    responsibility:{primary:'Dono/RT responsável pelo processo de incorporação',support:'Empresa executora credenciada e administrativo',approval:'Neoenergia Coelba'},
    entryConditions:['Projeto aprovado, obra inspecionada e documentação completa','Termo de intenção/incorporação, protocolos e certificados preparados'],
    procedure:['Conferir dossiê, materiais, ensaios, as-built e certificados','Formalizar incorporação/ligação no canal oficial','Acompanhar protocolo e responder solicitações dentro do prazo','Registrar inspeção final, energização ou pendência','Arquivar termo de aceite e atualizar status de encerramento'],
    production:{method:'Controlar processo externo por marcos: protocolado, aprovado, incorporado e ligado',formula:'processo concluído = protocolo + aceite documental + incorporação/ligação formal',rate:'marcos por ciclo, sujeito ao prazo da distribuidora'},
    evidence:['Protocolo e comunicações oficiais','Termo de incorporação/aceite','Relatório de energização e dossiê final'],
    acceptance:['Liberação formal recebida da distribuidora','Responsabilidade e ativo transferidos quando aplicável','Prazo/validade registrados no sistema'],
    conditions:['Documento faltante, material fora da especificação ou obra não aprovada bloqueia'],
    notifications:['Disparar alerta ao dono para protocolo, exigência, aprovação, atraso e ligação']
  },
  'as-built':{
    responsibility:{primary:'RT de documentação/as-built',support:'Topografia, responsáveis de cada rede e encarregados',approval:'Dono, município e concessionárias quando aplicável'},
    entryConditions:['Registros finais de todas as frentes disponíveis','Pendências críticas encerradas ou formalmente aceitas'],
    procedure:['Recolher levantamentos finais e versões aprovadas','Conferir executado contra projeto e registrar desvios','Consolidar plantas, memoriais, coordenadas, fotos e ensaios','Emitir revisão final assinada e lista de ativos','Entregar pacote ao responsável pela operação'],
    production:{method:'Controlar dossiês/disciplinas entregues e aprovados',formula:'dossiê completo = disciplinas conferidas + arquivos editáveis/PDF + assinaturas + evidências',rate:'pacotes/semana por equipe de documentação'},
    evidence:['Levantamento final georreferenciado','Plantas, memoriais, fotos e laudos','Matriz de documentos e assinaturas'],
    acceptance:['Executado compatível com cadastro final','Arquivos versionados e legíveis','Aceites dos responsáveis registrados'],
    conditions:['Divergência física, arquivo sem assinatura ou evidência ausente bloqueia a entrega']
  },
  'signage-final':{
    responsibility:{primary:'Encarregado de sinalização',support:'Equipe de instalação, RT viário e fiscalização',approval:'Município/órgão de trânsito quando aplicável'},
    entryConditions:['Projeto de sinalização e nomenclatura aprovados','Placas, marcos, suportes e posições conferidos'],
    procedure:['Locar cada ponto e verificar interferências','Instalar placas/marcos com fundação e orientação corretas','Conferir legibilidade, altura, visibilidade e identificação','Fotografar e cadastrar no mapa/as-built','Corrigir itens reprovados na vistoria'],
    production:{method:'Contar placas/marcos instalados e aceitos',formula:'un aceitas = instalação + posição + legibilidade + cadastro + vistoria',rate:'un/dia = pontos completos'},
    evidence:['Romaneio de placas/marcos','Fotos e coordenadas','Checklist/vistoria de sinalização'],
    acceptance:['Posição, orientação e legibilidade corretas','Fixação segura e sem conflito com acessibilidade','Cadastro final atualizado'],
    conditions:['Placa ilegível, posição divergente ou risco à circulação bloqueia']
  },
  'punch-list':{
    responsibility:{primary:'RT/coordenador de entrega',support:'Encarregados de todas as frentes, dono e fiscalização',approval:'Dono/órgão responsável'},
    entryConditions:['Obra fisicamente concluída por frente','Checklists, projetos e evidências reunidos'],
    procedure:['Inspecionar por disciplina e registrar pendência com local/foto','Classificar impacto, responsável, prazo e custo','Executar correção e anexar prova','Reinspecionar e encerrar ou reabrir o item','Publicar status e impacto na entrega'],
    production:{method:'Contar itens encerrados, não apenas visitados',formula:'pendências abertas = itens identificados - itens aceitos; punch list encerrada quando zero impeditivos',rate:'itens/dia = correções aceitas'},
    evidence:['Checklist assinado','Fotos antes/depois','Registro de reinspeção e aceite'],
    acceptance:['Pendências impeditivas zeradas ou aceitas formalmente','Cada item tem responsável e evidência','Impactos no caixa/cronograma registrados'],
    conditions:['Pendência de segurança, licença, rede ou acesso mantém a entrega bloqueada'],
    notifications:['Notificar dono quando surgir item crítico ou houver atraso de correção']
  },
  'receipts-close':{
    responsibility:{primary:'Administrativo de contratos/documentação',support:'RT, compras, fornecedores e encarregados',approval:'Dono/gestor financeiro'},
    entryConditions:['Serviços e compras conferidos com o caixa','Comprovantes, certificados, notas e garantias disponíveis'],
    procedure:['Reunir recibos, notas, contratos, certificados e garantias','Conferir fornecedor, valor, data, escopo e vínculo com a atividade','Digitalizar/anexar e assinar recebimento quando exigido','Conciliar com registro de caixa e materiais consumidos','Indexar por etapa, atividade, lote e validade'],
    production:{method:'Contar documentos válidos e conciliados por pacote',formula:'dossiês válidos = documentos presentes - documentos ilegíveis, vencidos ou sem vínculo',rate:'documentos/dia ou pacotes/semana'},
    evidence:['Notas fiscais, recibos e contratos','Certificados, garantias e comprovantes de terceirização','Assinatura/aceite e conciliação financeira'],
    acceptance:['Documento legível, íntegro e vinculado','Valor/quantidade conciliados com caixa e material','Garantia/validade monitorável'],
    conditions:['Comprovante ausente, divergência de valor ou fornecedor não identificado bloqueia o fechamento'],
    notifications:['Notificar dono sobre comprovante faltante, valor divergente ou certificado vencendo']
  },
  handover:{
    responsibility:{primary:'Coordenador de entrega e RT',support:'Dono, encarregados, operação e órgãos/concessionárias',approval:'Dono/recebedor formal'},
    entryConditions:['Punch list encerrada, dossiê completo e aceites externos reunidos','Caixa, contratos, garantias e responsabilidades conciliados'],
    procedure:['Preparar termo de recebimento e matriz de responsabilidades','Apresentar redes, áreas sociais, acessos, manutenção e restrições','Entregar as-built, manuais, garantias e contatos','Registrar assinatura, data e pendências não impeditivas','Transferir status para operação e arquivar o projeto'],
    production:{method:'Controlar termos/disciplinas aceitos e responsabilidades transferidas',formula:'entrega concluída = aceites + dossiê + transferência formal + pendências não impeditivas tratadas',rate:'pacotes/termos por ciclo de entrega'},
    evidence:['Termos de recebimento assinados','Dossiê final e manuais','Registro fotográfico e ata de entrega'],
    acceptance:['Responsável pelo ativo e manutenção definido','Documentação e garantias entregues','Pendências restantes têm prazo e aceite formal'],
    conditions:['Aceite ausente, ativo sem responsável ou documento crítico pendente bloqueia o encerramento'],
    notifications:['Notificar dono para assinatura, transferência de responsabilidade e pendências de garantia']
  }
};

const merge=(base,override)=>{
  const result={...base,...override};
  for(const key of ['responsibility','production'])result[key]={...(base[key]||{}),...(override[key]||{})};
  for(const key of ['entryConditions','procedure','evidence','acceptance','conditions','notifications','legalBasis']){
    if(override[key])result[key]=override[key];
  }
  return result;
};

export function operationalDetailsFor(item,stageKey){
  const unit=String(item?.unit||'registro');
  const release=String(item?.release||'Aceite da atividade registrado');
  const stageLegal=stageCompliance[stageKey]||stageCompliance.project;
  const base={
    description:`${item?.title||'Atividade'} executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.`,
    responsibility:{primary:'Responsável técnico da frente',support:'Encarregado, equipe executora e apontador',approval:'Dono/RT ou órgão responsável quando aplicável'},
    legalBasis:stageLegal,
    entryConditions:[`Caixa, equipe e materiais liberados para a frente`,`Requisito de entrada: ${release}`,'Área sinalizada, projeto vigente e riscos avaliados'],
    procedure:['Confirmar projeto vigente, local, equipe, equipamentos e condições de segurança','Executar a atividade por trecho/unidade sem ultrapassar a área liberada','Medir somente o que foi executado e conferido no campo','Anexar fotos, notas, certificados e demais evidências ao registro','Submeter ao responsável técnico e registrar aceite, correção ou bloqueio','Liberar a saída para a atividade relacionada seguinte'],
    production:{unit,method:`Medir ${unit} executado no local, por frente e por data, com confirmação do responsável`,formula:'quantidade válida = soma das medições confirmadas - medições rejeitadas ou duplicadas',rate:'Calibrar pelo histórico de produção, equipe disponível, caixa e condições de campo'},
    equipment:item?.materials||[],
    materials:item?.materials||[],
    evidence:['Registro diário com data, local, responsável e quantidade','Fotos antes/durante/depois com identificação do trecho','Comprovantes de compra/terceirização e certificados quando aplicáveis'],
    acceptance:[release,'Medição reconciliada com o diário e o caixa','Responsável autorizado confirma o aceite ou a pendência'],
    conditions:['Bloqueio, atraso, condição de solo, material insuficiente ou risco de segurança impede a propagação','Qualquer mudança de projeto/licença exige revisão do RT'],
    notifications:['Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido'],
    outputs:[release,'Registro de medição, evidência e aceite disponível para a próxima atividade']
  };
  return merge(base,overrides[item?.id]||{});
}
