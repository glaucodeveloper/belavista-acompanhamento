export const demoData = {
  project: { name: 'Empreendimento Belavista', phase: 'Fase 01', city: 'Senador Canedo, GO', completeness: 63, weather: '26°C', condition: 'Ensolarado' },
  metrics: {
    delayed: 2, criticalPurchases: 3, review: 3, collaborators: 28,
    inventoryValue: 'R$ 1.842.560,45', leads: 238, lotsWithInterest: 96,
    openPurchases: 12, openValue: 'R$ 485.230', receivedMonth: 'R$ 612.450'
  },
  activities: [
    {id:1, name:'Terraplanagem', status:'concluido', progress:100, week:'Sem 23', owner:'Equipe Terraplanagem'},
    {id:2, name:'Drenagem Pluvial', status:'andamento', progress:82, week:'Sem 24', owner:'Carlos Mendes'},
    {id:3, name:'Pavimentação', status:'planejado', progress:35, week:'Sem 25', owner:'Mariana Lopes'},
    {id:4, name:'Rede de Água', status:'planejado', progress:20, week:'Sem 26', owner:'João Pereira'},
    {id:5, name:'Rede Elétrica', status:'planejado', progress:18, week:'Sem 27', owner:'Mariana Silva'},
    {id:6, name:'Sinalização', status:'planejado', progress:5, week:'Sem 28', owner:'Equipe Infra'}
  ],
  materials: [
    ['Tubos PVC','2.450','950','780','m','bom'],['Poste de concreto','128','32','48','un','atencao'],['Cimento','320','80','150','sc','critico'],
    ['Brita','1.150','250','300','m³','bom'],['Areia','980','200','120','m³','atencao'],['Blocos','5.200','1.200','850','un','bom'],
    ['Cabos elétricos','3.600','1.100','1.250','m','atencao'],['Meio-fio pré-moldado','1.780','420','310','un','bom']
  ],
  leads: [
    {name:'Juliana Pereira', lot:'Lote 54 · Q-12', objective:'Moradia + Investimento', budget:'R$ 420k – 520k', status:'Qualificado', sun:'Leste', altitude:'865 m', terrain:'Plano'},
    {name:'Rafael Martins', lot:'Lote 54 · Q-12', objective:'Moradia', budget:'R$ 400k – 500k', status:'Em contato', sun:'Leste', altitude:'Alta', terrain:'Plano'},
    {name:'Camila Andrade', lot:'Lote 12 · Q-03', objective:'Investimento', budget:'R$ 450k – 550k', status:'Novo', sun:'Norte', altitude:'Média', terrain:'Plano'},
    {name:'Diego Souza', lot:'Lote 93 · Q-18', objective:'Veraneio', budget:'R$ 500k – 600k', status:'Negociação', sun:'Oeste', altitude:'Alta', terrain:'Inclinado'}
  ],
  purchases: [
    {id:'PE-2025-041', supplier:'EletricSul Materiais', desc:'Poste de concreto 11m', stage:'Rede Elétrica', value:'R$ 48.750,00', status:'Atrasado', delay:'8 dias'},
    {id:'PE-2025-040', supplier:'HidroTubos Ltda', desc:'Tubo PEAD Ø600mm', stage:'Drenagem', value:'R$ 32.860,00', status:'Atrasado', delay:'5 dias'},
    {id:'PE-2025-039', supplier:'ConcretaMix', desc:'Concreto FCK 25MPa (30m³)', stage:'Pavimentação', value:'R$ 28.650,00', status:'Em andamento', delay:'—'},
    {id:'PE-2025-038', supplier:'Luz & Cia', desc:'Cabo de alumínio 16mm', stage:'Rede Elétrica', value:'R$ 15.420,00', status:'Em andamento', delay:'—'}
  ],
  collaborators: [
    ['Mariana Silva','Engenharia Civil','Rede Elétrica'],['João Pereira','Encarregado','Terraplanagem'],['Carlos Mendes','Engenharia','Drenagem'],['Paula Nascimento','Planejamento','Pavimentação']
  ]
};

export const viewThemes = {
  assistant:{center:[-16.708,-49.092], zoom:17, tint:'purple', chat:'left', tilt:8},
  map:{center:[-16.708,-49.092], zoom:17, tint:'teal', chat:'left', tilt:18},
  stages:{center:[-16.704,-49.088], zoom:17, tint:'violet', chat:'left', tilt:24},
  purchases:{center:[-16.711,-49.094], zoom:15, tint:'orange', chat:'left', tilt:12},
  inventory:{center:[-16.706,-49.089], zoom:15, tint:'blue', chat:'left', tilt:16},
  leads:{center:[-16.710,-49.091], zoom:16, tint:'purple', chat:'left', tilt:20},
  collaborators:{center:[-16.706,-49.095], zoom:16, tint:'green', chat:'left', tilt:10},
  reports:{center:[-16.708,-49.092], zoom:14, tint:'cyan', chat:'left', tilt:6},
  settings:{center:[-16.708,-49.092], zoom:14, tint:'neutral', chat:'left', tilt:4}
};

export const spreadsheetSchema = {
  months:48,
  sheets:['Lançamentos','Resumo Mensal','Orçamento','Indicadores','Como Usar'],
  fields:['Mês','Data','Etapa','Subetapa/Descrição','Fornecedor','Documento','Quantidade','Unidade','Valor Unitário (R$)','Valor Total (R$)','Forma de Pagamento','Status'],
  stages:['Terraplanagem','Drenagem','Rede de Água','Rede de Energia','Pavimentação','Praça e Lazer','Arborização','Projetos/Adm.','Outros']
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
  {id:'risk-quality',family:'Governança',label:'Riscos, qualidade e conformidade',icon:'shield-alert',description:'Riscos de execução, não conformidades, inspeções e ações corretivas pendentes.',source:'Registros · Inspeções · Auditoria · Etapas',metrics:[['Riscos abertos','7','2 críticos'],['Não conformidades','4','1 vencida'],['Inspeções realizadas','32','Mês atual'],['Ações vencidas','3','Requer gestor']],columns:['Item de controle','Origem','Responsável','Prazo','Situação'],rows:[['Atraso na drenagem','Etapa 02','Carlos Mendes','16/06/24','Atenção'],['Compactação de base','Qualidade','Mariana Lopes','18/06/24','Em análise'],['Entrega de postes','Suprimentos','Mariana Silva','20/06/24','Crítico'],['DDS da frente','Segurança','João Pereira','Hoje','Concluído']]}
];

export const activityCatalog = [
  {nature:'Planejamento e projeto',name:'Revisar projeto executivo',initial:['Projeto','Revisão','Responsável técnico'],execution:['Versão aprovada','Pendências','Anexo','Data de validação']},
  {nature:'Terraplanagem',name:'Executar corte e aterro',initial:['Trecho','Volume estimado (m³)','Equipamento'],execution:['Volume executado','Tipo de solo','Horas de equipamento','Comprovante fotográfico','Medição']},
  {nature:'Drenagem',name:'Executar rede de drenagem',initial:['Trecho','Diâmetro','Extensão prevista (m)'],execution:['Extensão executada','Tubos aplicados','Cotas/declividade','Ensaio de estanqueidade','Medição']},
  {nature:'Pavimentação',name:'Executar base e pavimento',initial:['Trecho','Tipo de pavimento','Área prevista (m²)'],execution:['Área executada','Espessura','Material aplicado','Ensaio de compactação','Medição']},
  {nature:'Redes',name:'Implantar rede de água',initial:['Trecho','Diâmetro','Extensão prevista (m)'],execution:['Tubulação aplicada','Teste de pressão','Conexões','Registro fotográfico','Medição']},
  {nature:'Redes',name:'Implantar rede elétrica',initial:['Trecho','Tensão','Quantidade de postes'],execution:['Postes instalados','Cabos aplicados','Equipe concessionária','Laudo/aceite','Medição']},
  {nature:'Estruturas',name:'Executar fundação e estrutura',initial:['Elemento','Volume de concreto (m³)','Armadura prevista'],execution:['Concreto recebido','Aço aplicado','Fôrmas','Slump/rompimento','Medição']},
  {nature:'Urbanização',name:'Executar praça e paisagismo',initial:['Área','Projeto paisagístico','Espécies/elementos'],execution:['Itens implantados','Irrigação','Mobiliário','Fotos de entrega','Medição']},
  {nature:'Suprimentos',name:'Solicitar e receber material',initial:['Material','Quantidade','Unidade','Fornecedor'],execution:['Nota fiscal','Lote','Data de recebimento','Inspeção','Comprovante']},
  {nature:'Qualidade',name:'Realizar inspeção ou ensaio',initial:['Serviço','Norma/critério','Amostragem'],execution:['Resultado','Laboratório','Laudo','Não conformidade','Ação corretiva']},
  {nature:'Segurança',name:'Realizar DDS e inspeção de segurança',initial:['Frente','Equipe','Tema'],execution:['Participantes','Risco identificado','EPI/EPC','Registro','Ação corretiva']},
  {nature:'Medição e financeiro',name:'Registrar medição e pagamento',initial:['Etapa','Fornecedor','Período'],execution:['Quantidade medida','Valor unitário','Valor total','Documento','Aprovação']},
  {nature:'Administração',name:'Emitir relatório de etapa',initial:['Período','Responsável','Destinatários'],execution:['Avanço físico','Avanço financeiro','Anexos','Pendências','Aprovação final']}
];

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

export function createStore(initial) {
  let state = structuredClone(initial);
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) { state = {...state, ...patch}; listeners.forEach(fn => fn(state)); },
    update(fn) { state = fn(state); listeners.forEach(cb => cb(state)); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}

export const appStore = createStore({
  view:'assistant', selectedLead:0, selectedMaterial:2, chatOpen:true, chatManual:false,
  config:null, mapReady:false, mapFilter:'execution', mapTileMode:'satellite', installPrompt:null, lastAction:'Aplicação iniciada', theme:'dark', reportFamily:'Financeiro', reportType:'financial-balance', reportPeriod:'2024-06',
  sessionId:sessionStorage.getItem('belavista.session')||crypto.randomUUID().slice(0,8).toUpperCase(), sessionStarted:new Date().toISOString(), sidebarCollapsed:false, mapMode:'overview', adminMenu:false, selectedStage:2, editingRecord:null, records:[{id:'REG-001',obra:'Aliança Park',atividade:'Drenagem Pluvial',data:'2024-06-06',hora:'08:30',responsavel:'Carlos Mendes',detalhes:'Medição da rede principal',status:'Pendente'}]
});
sessionStorage.setItem('belavista.session',appStore.get().sessionId);
