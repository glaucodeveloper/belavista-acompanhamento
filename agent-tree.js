// Árvore declarativa do agente: regras são dados, não texto preso em telas.
// O motor recebe fatos, localiza os nós afetados e devolve disparos auditáveis.
export const agentTree={
  version:'2026-08-24',
  roots:[
    {id:'governance',label:'Diretrizes e governança',children:[
      {id:'cash-owner',label:'Caixa controlado pelo Dono',requirements:['somente o perfil Dono altera entradas, saídas, estornos e ajustes','cada lançamento possui origem, valor, data e comprovante quando aplicável'],triggers:[{when:'cash.changed',action:'recalculate.readiness',autonomy:'AUTO'},{when:'cash.negative',action:'notify.cash-risk',autonomy:'AUTO'}]},
      {id:'system-calibration',label:'Calibração administrada',requirements:['somente Administrador altera prioridades, orçamentos, reserva mínima e política de notificações','cada alteração cria nova versão auditável'],triggers:[{when:'calibration.changed',action:'recalculate.readiness',autonomy:'AUTO'}]},
      {id:'evidence',label:'Completude e evidências',requirements:['atividade possui responsável','unidade de produção definida','quantidade/medição informada','evidência ou justificativa pendente'],triggers:[{when:'record.created',action:'check.record-completeness',autonomy:'AUTO'},{when:'activity.incomplete',action:'request.missing-fact',autonomy:'AUTO'},{when:'receipt.missing',action:'create.pending-evidence',autonomy:'AUTO'}]}
    ]},
    {id:'construction',label:'Obra e produção',children:[
      {id:'earthwork',label:'Terraplanagem',requirements:['viagens internas','m³ por caçamba','medição de corte e aterro'],triggers:[{when:'production.measured',action:'calculate.earthwork-volume',autonomy:'AUTO'}]},
      {id:'water',label:'Rede de água',requirements:['PEAD dimensionado','298 cavaletes','298 ramais','liberação antes da pavimentação'],triggers:[{when:'material.incomplete',action:'create.water-material-pending',autonomy:'AUTO'},{when:'activity.completed',action:'release.curbs',autonomy:'AUTO'}]},
      {id:'curbs',label:'Meio-fio',requirements:['metragem linear ao redor das quadras','medição executada'],triggers:[{when:'activity.completed',action:'release.paving-check',autonomy:'AUTO'}]},
      {id:'paving',label:'Pavimentação',requirements:['5.000 pedras/caminhão','45 pedras/m²','perda declarada','produção em m²/dia'],triggers:[{when:'production.measured',action:'calculate.paving-production',autonomy:'AUTO'}]},
      {id:'electrical',label:'Rede elétrica e Coelba',requirements:['pavimentação liberada','projeto elétrico','postes, cabos, conectores e transformadores','prazo de ligação Coelba'],triggers:[{when:'paving.completed',action:'request.coelba-connection',autonomy:'CONFIRMAR'},{when:'coelba.deadline-near',action:'notify.coelba-deadline',autonomy:'AUTO'}]}
    ]},
    {id:'commercial',label:'Lotes, CRM e comissões',children:[
      {id:'lead',label:'Atendimento de lead',requirements:['canal','nome/contato','intenção','lote ou critério','próximo passo'],triggers:[{when:'lead.message.received',action:'extract.lead-facts',autonomy:'AUTO'},{when:'lead.incomplete',action:'ask.missing-fact',autonomy:'AUTO'},{when:'lot.reserve.requested',action:'request.reserve-approval',autonomy:'CONFIRMAR'}]},
      {id:'commission',label:'Repasse de corretor',requirements:['corretor','lote/cliente','razão de comissão','competência','comprovante'],triggers:[{when:'payment.received',action:'calculate.commission-split',autonomy:'AUTO'},{when:'month.closed',action:'generate.broker-report',autonomy:'AUTO'}]}
    ]}
  ]
};

const flatten=(nodes,output=[])=>{for(const node of nodes||[]){output.push(node);flatten(node.children,output);}return output;};
export const agentNodes=()=>flatten(agentTree.roots);

export function evaluateAgentTree(facts={}){
  const event=String(facts.event||'').trim();
  const signals=[];
  for(const node of agentNodes())for(const trigger of node.triggers||[]){
    if(trigger.when===event)signals.push({nodeId:node.id,node:node.label,action:trigger.action,autonomy:trigger.autonomy,reason:`Evento ${event} atingiu ${node.label}.`,requirements:node.requirements||[]});
  }
  return {treeVersion:agentTree.version,event,signals,requiresApproval:signals.some(signal=>signal.autonomy==='CONFIRMAR')};
}
