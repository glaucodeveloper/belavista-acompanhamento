// BELAVISTA_PUBLIC_ENTERPRISE_STATE_V521
// Deliberately small, non-sensitive state exposed to the public commercial inference.
const text=(value,max=500)=>String(value??'').trim().slice(0,max);
const normalizeStatus=value=>text(value,80).toLowerCase();

export function buildPublicEnterpriseState(env,catalog={}){
  const lots=Array.isArray(catalog?.lots)?catalog.lots:[];
  const counts={totalLots:lots.length,available:0,reserved:0,sold:0,inNegotiation:0,other:0};
  for(const lot of lots){
    const status=normalizeStatus(lot?.status);
    if(/dispon|livre|aberto/.test(status))counts.available++;
    else if(/reserv/.test(status))counts.reserved++;
    else if(/vend/.test(status))counts.sold++;
    else if(/negocia|proposta|interesse/.test(status))counts.inNegotiation++;
    else counts.other++;
  }
  const known=catalog?.publicInfo&&typeof catalog.publicInfo==='object'?catalog.publicInfo:{};
  return {
    name:text(known.name||env.PUBLIC_ENTERPRISE_NAME||'Aliança Park',120),
    phase:text(known.phase||known.launchPhase||env.PUBLIC_LAUNCH_PHASE||'lançamento',80),
    launchStatus:{
      label:text(known.launchStatus?.label||known.launchStatus||env.PUBLIC_LAUNCH_STATUS||'Lançamento em andamento',140),
      summary:text(known.launchStatus?.summary||known.summary||env.PUBLIC_LAUNCH_SUMMARY||'O loteamento está em apresentação comercial. A disponibilidade é confirmada pelo catálogo público atual.',500)
    },
    availabilitySummary:counts,
    reservationPolicy:{
      assisted:true,
      requiresIdentification:true,
      requiresDocuments:true,
      requiresSignalProof:true,
      trueReservationAfter:'sinal com envio de comprovante'
    },
    publicCapabilities:['orientação por lote','disponibilidade atual','orientação solar','identificação','reserva assistida'],
    seals:Array.isArray(catalog?.seals)?catalog.seals.slice(0,12):[],
    source:'github-public-commercial-catalog',
    generatedAt:new Date().toISOString()
  };
}
