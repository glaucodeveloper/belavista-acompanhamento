export function buildCorrelationSummary(snapshot={}){
  const stages=Array.isArray(snapshot.criticalStages)?snapshot.criticalStages:[];
  const blocked=stages.filter(item=>item.status==='attention');
  const narrative=blocked.length
    ? `Há ${blocked.length} frente(s) com consumo acima do previsto ou baixa cobertura de evidência operacional.`
    : 'As frentes monitoradas estão coerentes com o orçamento e os registros recebidos.';
  return {
    blockedStages:blocked.map(item=>item.stage),
    narrative,
    recommendExplain:Boolean(blocked.length)
  };
}
