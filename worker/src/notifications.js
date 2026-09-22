export function buildNotificationsFromSnapshot(snapshot={}){
  const notifications=[];
  const planned=Number(snapshot.budgetSummary?.plannedCents||0);
  const realized=Number(snapshot.budgetSummary?.realizedCents||0);
  if(planned>0&&realized>planned){
    notifications.push({
      category:'budget',
      severity:'warning',
      title:'Orçamento acima do planejado',
      message:'O realizado ultrapassou o orçamento planejado para as frentes monitoradas.',
      entityType:'budget',
      entityId:'global',
      metadata:{plannedCents:planned,realizedCents:realized}
    });
  }
  for(const stage of snapshot.criticalStages||[]){
    if(stage.status!=='attention')continue;
    notifications.push({
      category:'stage-correlation',
      severity:'warning',
      title:`Atenção na etapa ${stage.stage}`,
      message:'Consumo financeiro acima do previsto ou pouca evidência registrada para a etapa.',
      entityType:'stage',
      entityId:stage.stage,
      metadata:stage
    });
  }
  if(!notifications.length&&snapshot.latestRecord){
    notifications.push({
      category:'heartbeat',
      severity:'info',
      title:'Monitoramento operacional ativo',
      message:`Último registro recebido: ${snapshot.latestRecord.atividade || snapshot.latestRecord.etapa}.`,
      entityType:'records',
      entityId:snapshot.latestRecord.id,
      metadata:{recordId:snapshot.latestRecord.id}
    });
  }
  return notifications;
}
