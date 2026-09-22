import {readFile} from 'node:fs/promises';

const dwgUrl=new URL('./assets/data/dwg-georeference.json',import.meta.url);
const round=(value,decimals=2)=>{
  const factor=10**decimals;
  return Math.round((Number(value)||0)*factor)/factor;
};
const ceil=(value)=>Math.ceil(Number(value)||0);
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
const text=value=>String(value??'').trim();
const normalize=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

let raw={lots:[],featureSummary:{},drawingBounds:{},source:{},crs:{},alignment:{}};
try{raw=JSON.parse(await readFile(dwgUrl,'utf8'));}catch(error){
  // O planejamento continua disponível mesmo durante uma publicação sem o
  // arquivo auxiliar. A resposta leva a qualidade como "sem DWG".
  raw={...raw,loadError:text(error.message)};
}

const lotRows=Array.isArray(raw.lots)?raw.lots:[];
const featureSummary=raw.featureSummary&&typeof raw.featureSummary==='object'?raw.featureSummary:{};
const lotAreaM2=round(lotRows.reduce((sum,row)=>sum+(Number(row?.[5])||0),0),2);
const lotCount=lotRows.length||Number(featureSummary.lots)||0;
const residentialLots=Number(featureSummary.residentialLots)||lotRows.filter(row=>normalize(row?.[7]).includes('resid')).length;
const commercialLots=Number(featureSummary.commercialLots)||lotRows.filter(row=>normalize(row?.[7]).includes('comerc')).length;
const roadCount=Number(featureSummary.roads)||0;
const curbAndWalkwayPolylines=Number(featureSummary.curbAndWalkwayPolylines)||0;
const mappedElectricPoles=Number(featureSummary.electricPoles)||0;

// São premissas iniciais do planejamento físico. Quando os polígonos lineares
// do projeto executivo forem publicados, basta substituir estes coeficientes;
// a origem e o impacto ficam auditáveis no retorno do worker.
export const PLANNING_ASSUMPTIONS={
  roadSurfaceRatio:0.322,
  roadWidthM:8,
  averageEarthworkDepthM:0.511814375,
  drainageShareOfRoadLength:0.2,
  waterNetworkMPerLot:10,
  cableMPerMappedPole:150,
  stonesPerM2:45,
  stonesLossPercent:5,
  truckCapacityStones:5000,
  truckCapacityM3:12,
  drainageInletSpacingM:82,
  // Coeficiente conservador para a frente de assentamento; calibrável pelo
  // encarregado com a medição real de equipe e trecho.
  sandBaseM3PerM2:0.05
};

const roadSurfaceM2=round(lotAreaM2*PLANNING_ASSUMPTIONS.roadSurfaceRatio,2);
const roadLengthM=round(roadSurfaceM2/PLANNING_ASSUMPTIONS.roadWidthM,2);
const curbLengthM=round(roadLengthM*2,2);
const drainageLengthM=round(roadLengthM*PLANNING_ASSUMPTIONS.drainageShareOfRoadLength,2);
const earthworkVolumeM3=round(roadSurfaceM2*PLANNING_ASSUMPTIONS.averageEarthworkDepthM,2);
const earthworkTrips=ceil(earthworkVolumeM3/PLANNING_ASSUMPTIONS.truckCapacityM3);
const drainageInlets=ceil(roadLengthM/PLANNING_ASSUMPTIONS.drainageInletSpacingM);
const waterNetworkM=round(lotCount*PLANNING_ASSUMPTIONS.waterNetworkMPerLot,2);
const pavingStones=ceil(roadSurfaceM2*PLANNING_ASSUMPTIONS.stonesPerM2*(1+PLANNING_ASSUMPTIONS.stonesLossPercent/100));
const pavingStoneTrucks=ceil(pavingStones/PLANNING_ASSUMPTIONS.truckCapacityStones);
const cableLengthM=round(mappedElectricPoles*PLANNING_ASSUMPTIONS.cableMPerMappedPole,2);
const siteBounds=raw.drawingBounds||{};

export const productionBaseline={
  version:'dwg-derived-v1',
  source:{
    dwg:text(raw.source?.dwg||'assets/data/dwg-georeference.json'),
    crs:text(raw.crs?.name||'não informado'),
    epsg:Number(raw.crs?.epsg)||null,
    alignmentQuality:text(raw.alignment?.quality||''),
    alignmentMedianErrorM:Number(raw.alignment?.medianErrorM)||null
  },
  site:{
    lotCount,
    residentialLots,
    commercialLots,
    lotAreaM2,
    roadCount,
    curbAndWalkwayPolylines,
    mappedElectricPoles,
    bounds:siteBounds,
    googleMapsUrl:siteBounds?.center?.lat&&siteBounds?.center?.lng
      ?`https://www.google.com/maps/@${siteBounds.center.lat},${siteBounds.center.lng},17z`
      :''
  },
  assumptions:structuredClone(PLANNING_ASSUMPTIONS),
  derived:{
    roadSurfaceM2,
    roadLengthM,
    curbLengthM,
    drainageLengthM,
    earthworkVolumeM3,
    earthworkTrips,
    drainageInlets,
    waterNetworkM,
    pavingStones,
    pavingStoneTrucks,
    cableLengthM
  },
  quality:raw.loadError?'without-dwg':'dwg-lots-plus-calibrated-linear-coefficients',
  warning:raw.loadError
    ?'DWG não foi carregado; os volumes lineares não devem ser liberados para compra.'
    :'Áreas e contagens vêm do DWG. Comprimentos de vias, profundidade e espaçamentos são premissas iniciais até a validação do projeto executivo.'
};

const plan=(key,name,quantity,unit,rate,rateUnit,materials,basis,secondary={})=>({
  key,name,totalQuantity:round(quantity,2),unit,baseRate:round(rate,2),rateUnit,
  materials:materials.map(item=>({...item,quantity:item.quantity==null?null:round(item.quantity,2)})),
  basis:[...basis],
  secondary,
  source:'dwg-derived'
});

const plans={
  project:plan('project','Projeto executivo',1,'projeto',1,'projeto/dia',[
    {name:'Conjunto de projetos, memoriais e aprovações',quantity:1,unit:'conjunto'}
  ],['Unidade administrativa; usa o DWG como base de compatibilização.']),
  earthwork:plan('earthwork','Terraplanagem',earthworkVolumeM3, 'm³',
    32*PLANNING_ASSUMPTIONS.truckCapacityM3,'m³/dia',[
      {name:'Solo/material de terraplanagem',quantity:earthworkVolumeM3,unit:'m³'},
      {name:'Caçambas / viagens internas',quantity:earthworkTrips,unit:'viagem'}
    ],[
      `Área viária calculada: ${roadSurfaceM2} m² × profundidade média inicial ${PLANNING_ASSUMPTIONS.averageEarthworkDepthM} m.`,
      `Volume convertido em viagens pela caçamba de ${PLANNING_ASSUMPTIONS.truckCapacityM3} m³.`
    ],{quantity:earthworkTrips,unit:'viagens internas',rate:32,rateUnit:'viagens/dia'}),
  drainage:plan('drainage','Drenagem Pluvial',drainageLengthM,'m',25,'m/dia',[
      {name:'Tubos/manilhas conforme projeto',quantity:drainageLengthM,unit:'m'},
      {name:'Bocas de lobo',quantity:drainageInlets,unit:'un'}
    ],[
      `Extensão inicial: ${roadLengthM} m de eixo viário × ${PLANNING_ASSUMPTIONS.drainageShareOfRoadLength*100}% de rede drenante.`,
      `Bocas de lobo espaçadas preliminarmente a cada ${PLANNING_ASSUMPTIONS.drainageInletSpacingM} m.`
    ]),
  water:plan('water','Rede de Água',lotCount,'lotes',12,'lotes/dia',[
      {name:'Tubos PEAD',quantity:waterNetworkM,unit:'m'},
      {name:'Cavaletes',quantity:lotCount,unit:'un'},
      {name:'Ramais',quantity:lotCount,unit:'un'}
    ],[
      `${lotCount} lotes identificados no DWG.`,
      `Rede linear inicial: ${PLANNING_ASSUMPTIONS.waterNetworkMPerLot} m por lote, a validar por setor e projeto hidráulico.`
    ],{quantity:waterNetworkM,unit:'m de rede',rate:waterNetworkM/lotCount*12,rateUnit:'m/dia equivalente'}),
  curbs:plan('curbs','Meio-fio',curbLengthM,'m',180,'m/dia',[
      {name:'Meio-fio pré-moldado',quantity:curbLengthM,unit:'m'},
      {name:'Concreto/argamassa de assentamento',quantity:null,unit:'m³'}
    ],[
      `Duas faces de meio-fio para a extensão viária inicial de ${roadLengthM} m.`,
      `${curbAndWalkwayPolylines} polilinhas de meio-fio/calçada foram lidas no resumo do DWG.`
    ]),
  paving:plan('paving','Pavimentação',roadSurfaceM2,'m²',600,'m²/dia',[
      {name:'Paralelepípedo',quantity:pavingStones,unit:'un'},
      {name:'Areia/pó de pedra para colchão e rejunte',quantity:round(roadSurfaceM2*PLANNING_ASSUMPTIONS.sandBaseM3PerM2,2),unit:'m³'},
      {name:'Caminhões de paralelepípedo',quantity:pavingStoneTrucks,unit:'viagem'}
    ],[
      `Área viária inicial: ${roadSurfaceM2} m² (${PLANNING_ASSUMPTIONS.roadSurfaceRatio*100}% da área dos lotes).`,
      `${PLANNING_ASSUMPTIONS.stonesPerM2} pedras/m² com ${PLANNING_ASSUMPTIONS.stonesLossPercent}% de perda.`,
      `${PLANNING_ASSUMPTIONS.truckCapacityStones.toLocaleString('pt-BR')} pedras por caminhão.`
    ],{quantity:pavingStones,unit:'pedras',rate:pavingStoneTrucks/Math.max(1,Math.ceil(roadSurfaceM2/600)),rateUnit:'caminhões/dia equivalente'}),
  electrical:plan('electrical','Rede Elétrica',mappedElectricPoles,'postes',8,'postes/dia',[
      {name:'Postes',quantity:mappedElectricPoles,unit:'un'},
      {name:'Cabos elétricos',quantity:cableLengthM,unit:'m'}
    ],[
      `${mappedElectricPoles} pontos elétricos cartografados no resumo do DWG.`,
      `${PLANNING_ASSUMPTIONS.cableMPerMappedPole} m de cabo por ponto como pré-dimensionamento; conferir projeto Coelba.`
    ],{quantity:30,unit:'dias de janela Coelba',rate:1,rateUnit:'janela/dia'}),
  signage:plan('signage','Sinalização',Math.max(roadCount,1),'frentes',4,'frentes/dia',[
      {name:'Placas e sinalização de obra',quantity:Math.max(roadCount,1),unit:'frente'}
    ],['Uma frente inicial por via registrada no resumo do DWG.'])
};

export function getProductionPlan(stageKey,legacy={}){
  const current=plans[stageKey];
  if(current)return structuredClone(current);
  const quantity=Math.max(1,Number(legacy.quantity)||1);
  return {key:stageKey,name:text(legacy.name||stageKey),totalQuantity:quantity,unit:text(legacy.unit||'un'),baseRate:Math.max(1,Number(legacy.rate)||1),rateUnit:text(legacy.rateUnit||'un/dia'),materials:[],basis:['Quantidade herdada da calibração; sem fórmula DWG disponível.'],secondary:{},source:'calibration'};
}

const crewTemplates={
  project:[['Responsável técnico',1],['Projetistas/compatibilização',2],['Topografia/GIS',1]],
  earthwork:[['Encarregado de terraplanagem',1],['Operador de escavadeira',1],['Operador de pá-carregadeira',1],['Operador de motoniveladora',1],['Operador de rolo',1],['Operador de caminhão-pipa',1],['Motoristas de caçamba',3]],
  drainage:[['Encarregado de drenagem',1],['Equipe de vala e assentamento',4],['Operador de escavadeira',1],['Topografia',1]],
  water:[['Encarregado hidráulico',1],['Soldador PEAD',2],['Montadores de ramais',3],['Ajudantes',2],['Controle/testes',1]],
  curbs:[['Encarregado de acabamento',1],['Assentadores de meio-fio',4],['Serventes',2],['Topografia',1]],
  paving:[['Encarregado de pavimentação',1],['Equipe de base',4],['Assentadores de paralelepípedo',8],['Compactação/acabamento',2]],
  electrical:[['Responsável técnico elétrico',1],['Eletricistas credenciados',3],['Ajudantes',2],['Segurança/sinalização',1]],
  signage:[['Encarregado de sinalização',1],['Equipe de sinalização',3]]
};

export function getCrewTemplate(stageKey){
  return (crewTemplates[stageKey]||[['Responsável da frente',1]]).map(([role,count])=>({role,requiredCount:count}));
}

const relationRules=[
  {from:'project',to:'earthwork',type:'dependency',label:'Projeto libera locação e terraplanagem'},
  {from:'earthwork',to:'drainage',type:'sector-overlap',label:'Drenagem pode abrir por setor com greide e rota interna liberados'},
  {from:'drainage',to:'water',type:'dependency',label:'Rede de água entra após drenagem do setor aceita'},
  {from:'water',to:'curbs',type:'sector-overlap',label:'Meio-fio acompanha somente setores com rede testada'},
  {from:'curbs',to:'paving',type:'dependency',label:'Pavimentação exige meio-fio e base liberados'},
  {from:'paving',to:'electrical',type:'final-stage',label:'Execução elétrica fica por último; aprovação e compras podem correr em paralelo'},
  {from:'electrical',to:'signage',type:'dependency',label:'Sinalização fecha a frente após rede e pavimento aceitos'}
];

export function getRelationsForStage(stageKey){
  return relationRules.filter(item=>item.from===stageKey||item.to===stageKey).map(item=>({...item,direction:item.from===stageKey?'outgoing':'incoming'}));
}

export function getOverlapPlan(stageKey,plannedStart,plannedFinish){
  if(stageKey==='earthwork')return {mode:'setorial',withStages:['drainage'],rule:'Abrir drenagem somente nos setores com greide, cota e rota interna liberados.',start:plannedStart,end:plannedFinish};
  if(stageKey==='water')return {mode:'setorial',withStages:['curbs'],rule:'Preparar material hidráulico enquanto a drenagem é aceita; execução por setor.',start:plannedStart,end:plannedFinish};
  if(stageKey==='electrical')return {mode:'preparacao-em-paralelo',withStages:['paving'],rule:'Compras, aprovação e janela Coelba podem acompanhar a pavimentação; montagem/ligação permanece posterior.',start:plannedStart,end:plannedFinish};
  return {mode:'sequencial',withStages:[],rule:'Sem sobreposição operacional registrada.',start:plannedStart,end:plannedFinish};
}

export function getProductionBaseline(){return structuredClone(productionBaseline);}
