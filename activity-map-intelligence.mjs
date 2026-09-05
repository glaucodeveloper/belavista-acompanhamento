export const ACTIVITY_MAP_STATUSES={
  scheduled:{label:'Agendada',color:'#f1c21b',hex:0xf1c21b,priority:1},
  in_progress:{label:'Em execução',color:'#0f62fe',hex:0x0f62fe,priority:2},
  completed:{label:'Concluída',color:'#24a148',hex:0x24a148,priority:3},
  blocked:{label:'Bloqueada',color:'#da1e28',hex:0xda1e28,priority:4}
};

const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const partId=part=>String(part?.userData?.partId||part?.name||'');
const partLabel=part=>String(part?.userData?.partLabel||part?.name||partId(part));

export function physicalMapCatalog(map){
  const parts=map?.physicalMapParts?.()||[...(map?.modelParts?.lots||[]),...(map?.modelParts?.streets||[]),...(map?.modelParts?.other||[])];
  const lots=parts.filter(part=>part.userData?.partKind==='lots');
  const streets=parts.filter(part=>part.userData?.partKind==='streets');
  const other=parts.filter(part=>part.userData?.partKind==='other');
  const groups=[];
  for(let index=0;index<lots.length;index+=30)groups.push({key:`block-${String(groups.length+1).padStart(2,'0')}`,label:`Quadra ${String(groups.length+1).padStart(2,'0')}`,partIds:lots.slice(index,index+30).map(partId)});
  const social=other.filter(part=>/social|lazer|praca|play|quadra|pavilhao|academia|court|gym/i.test(normalize(partLabel(part))));
  return {
    parts,
    zones:[
      {key:'entrance',label:'Entrada do loteamento',partIds:streets.slice(0,Math.max(1,Math.ceil(streets.length*.12))).map(partId)},
      {key:'main-avenue',label:'Avenida principal',partIds:streets.filter((_,index)=>index%3===0).map(partId)},
      {key:'side-avenue',label:'Avenida lateral',partIds:streets.filter((_,index)=>index%3!==0).map(partId)},
      {key:'social-area',label:'Área social',partIds:social.map(partId)},
      ...groups
    ]
  };
}

export function inferActivityLocation(map,stageKey,activityId){
  const catalog=physicalMapCatalog(map),stage=normalize(stageKey),activity=normalize(activityId);
  const streetIds=catalog.parts.filter(part=>part.userData?.partKind==='streets').map(partId);
  const lotIds=catalog.parts.filter(part=>part.userData?.partKind==='lots').map(partId);
  const social=catalog.zones.find(zone=>zone.key==='social-area')?.partIds||[];
  const entrance=catalog.zones.find(zone=>zone.key==='entrance')?.partIds||[];
  let ids=[];let zoneKey='whole-site';let zoneLabel='Empreendimento completo';
  if(/earth|drain|water|curb|pav|electric/.test(stage)){
    ids=streetIds;zoneKey=/electric/.test(stage)?'main-avenue':'road-network';zoneLabel=/electric/.test(stage)?'Avenida principal e corredores elétricos':'Sistema viário';
  }else if(/signage/.test(stage)||/handover|signage/.test(activity)){
    ids=[...entrance,...social];zoneKey='entrance';zoneLabel='Entrada e área social';
  }else if(/clearing|soil|staking|survey/.test(activity)){
    ids=lotIds;zoneKey='whole-site';zoneLabel='Toda a implantação';
  }else{
    ids=social.length?social:lotIds.slice(0,Math.min(24,lotIds.length));zoneKey=social.length?'social-area':'whole-site';zoneLabel=social.length?'Área social':'Área de implantação';
  }
  return {zoneKey,zoneLabel,partIds:[...new Set(ids)],source:'ai',sourceLabel:'Sugestão da IA baseada na leitura urbana do modelo'};
}
