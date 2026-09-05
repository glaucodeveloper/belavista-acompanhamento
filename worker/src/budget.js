const cents=value=>Number(value||0);

export function buildBudgetSummary(entries=[],lines=[]){
  const plannedCents=lines.reduce((sum,item)=>sum+cents(item.totalCostCents),0);
  const committedCents=lines.filter(item=>String(item.status||'').toLowerCase()!=='cancelado').reduce((sum,item)=>sum+cents(item.totalCostCents),0);
  const realizedCents=entries.filter(item=>item.kind==='saida').reduce((sum,item)=>sum+cents(item.amountCents),0);
  const incomeCents=entries.filter(item=>item.kind==='entrada').reduce((sum,item)=>sum+cents(item.amountCents),0);
  return {
    plannedCents,
    committedCents,
    realizedCents,
    incomeCents,
    balanceCents:incomeCents-realizedCents,
    varianceCents:realizedCents-plannedCents
  };
}
