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
  assistant:{center:[-16.708,-49.092], zoom:15, tint:'purple', chat:'bottom', tilt:8},
  map:{center:[-16.708,-49.092], zoom:16, tint:'teal', chat:'right', tilt:18},
  stages:{center:[-16.704,-49.088], zoom:16, tint:'violet', chat:'right', tilt:24},
  purchases:{center:[-16.711,-49.094], zoom:15, tint:'orange', chat:'left', tilt:12},
  inventory:{center:[-16.706,-49.089], zoom:15, tint:'blue', chat:'right', tilt:16},
  leads:{center:[-16.710,-49.091], zoom:16, tint:'purple', chat:'right', tilt:20},
  collaborators:{center:[-16.706,-49.095], zoom:16, tint:'green', chat:'left', tilt:10},
  reports:{center:[-16.708,-49.092], zoom:14, tint:'cyan', chat:'right', tilt:6},
  settings:{center:[-16.708,-49.092], zoom:14, tint:'neutral', chat:'left', tilt:4}
};

export const spreadsheetSchema = {
  months:48,
  sheets:['Lançamentos','Resumo Mensal','Orçamento','Indicadores','Como Usar'],
  fields:['Mês','Data','Etapa','Subetapa/Descrição','Fornecedor','Documento','Quantidade','Unidade','Valor Unitário (R$)','Valor Total (R$)','Forma de Pagamento','Status'],
  stages:['Terraplanagem','Drenagem','Rede de Água','Rede de Energia','Pavimentação','Praça e Lazer','Arborização','Projetos/Adm.','Outros']
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
  config:null, mapReady:false, installPrompt:null, lastAction:'Aplicação iniciada', theme:'dark',
  sessionId:sessionStorage.getItem('belavista.session')||crypto.randomUUID().slice(0,8).toUpperCase(), sessionStarted:new Date().toISOString(), sidebarCollapsed:false, mapMode:'overview', adminMenu:false, selectedStage:2
});
sessionStorage.setItem('belavista.session',appStore.get().sessionId);
