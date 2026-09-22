export function buildCommercialScenario(runToken='MOCK'){
  return {
    runToken,
    assumptions:{note:'Taxas de comissão deste fixture são mocks configuráveis, não regra fixa do produto.'},
    brokers:[
      {id:'corretor-ana',name:'Ana Corretora',active:true,defaultCommissionRate:0.05},
      {id:'corretor-bruno',name:'Bruno Corretor',active:true,defaultCommissionRate:0.045}
    ],
    leads:[
      {id:'lead-1',name:'Cliente Sol Nascente',desiredAreaM2:300,sunriseDirection:'leste',plan:'moradia',status:'qualified'},
      {id:'lead-2',name:'Cliente Investidor',desiredAreaM2:360,sunriseDirection:'nordeste',plan:'investimento',status:'new'}
    ],
    lots:[
      {id:'lote-101',areaM2:300,priceCents:42_000_000,status:'available'},
      {id:'lote-102',areaM2:340,priceCents:48_000_000,status:'reserved'},
      {id:'lote-103',areaM2:360,priceCents:51_000_000,status:'sold'}
    ],
    sales:[
      {id:'sale-1',lotId:'lote-103',leadId:'lead-2',brokerId:'corretor-ana',salePriceCents:50_000_000,commissionRate:0.05,status:'contracted'}
    ]
  };
}
