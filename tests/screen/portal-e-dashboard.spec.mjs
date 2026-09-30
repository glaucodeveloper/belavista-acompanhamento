import {test,expect} from '@playwright/test';

async function enterDemo(page){
  const demo=page.getByRole('button',{name:/abrir modo demonstração/i});
  try{await demo.waitFor({state:'visible',timeout:5000});await demo.click();}catch{}
  await expect(page.locator('belavista-app')).toBeVisible({timeout:10000});
}

const parseMoney=value=>Number(String(value||'').replace(/[^\d,-]/g,'').replace(/\./g,'').replace(',','.'))||0;
const tinyPdfDataUrl='data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrPgoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQgMT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvTWVkaWFCb3hbMCAwIDIwMCAyMDBdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgooQmVsYXZpc3RhKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDUzIDAwMDAwIG4gCjAwMDAwMDAxMDEgMDAwMDAgbiAKMDAwMDAwMDE3OSAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMSAwIFIvU2l6ZSA1Pj4Kc3RhcnR4cmVmCjI3MQolJUVPRg==';

test.describe('telas operacionais Aliança Park',()=>{
  test('dashboard inicia no mapa e expõe os widgets operacionais',async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await enterDemo(page);
    await expect(page.locator('map-scene[data-persistent-map="true"]')).toBeVisible();
    await expect(page.locator('view-layer[data-view="map"]')).toBeVisible();
    await expect(page.locator('map-filter-rail')).toBeVisible();
    await page.getByRole('button',{name:'Materiais'}).click();
    await expect(page.locator('aside.admin-public-map-status-v5352')).toContainText('Rede de água');
    await expect(page.locator('aside.admin-public-map-status-v5352')).toContainText('Aguardando insumos');
    await page.screenshot({path:'output/screens/dashboard-map-widgets.png',fullPage:false});
    expect(errors,errors.join('\n')).toEqual([]);
  });

  test('portal do encarregado exige autenticação antes de expor conversa e confirmação',async({page})=>{
    await page.goto('/encarregados.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.belavista-auth-gate')).toBeVisible();
    await expect(page.getByRole('heading',{name:/entrar no portal móvel de campo/i})).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();
    await expect(page.getByRole('button',{name:'Entrar com segurança'})).toBeVisible();
  });

  test('portal mantém conversa e propagação ocultas até o perfil ser autorizado',async({page})=>{
    await page.goto('/encarregados.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.belavista-auth-gate')).toBeVisible();
    await expect(page.getByRole('heading',{name:/confirme o que foi executado/i})).not.toBeVisible();
    await expect(page.getByRole('button',{name:/confirmar serviço e propagar/i})).not.toBeVisible();
  });

  test('leads conserva letreiro público, mapa e atendimento ao visitante',async({page})=>{
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await enterDemo(page);
    await page.getByRole('navigation').getByRole('button',{name:'Leads'}).click();
    await expect(page.getByRole('heading',{name:/escolha seu lote/i})).toBeVisible();
    await expect(page.locator('map-scene.leads-header-map')).toBeVisible();
    await expect(page.locator('.lead-conversation-widget')).toContainText(/bem-vindo ao aliança park/i);
    await expect(page.locator('.lead-reservation-prompt')).toContainText(/planeje sua visita/i);
    await page.getByRole('button',{name:'Quero agendar'}).click();
    await expect(page.getByRole('heading',{name:/documentos, validação e sinal/i})).toBeVisible();
    await expect(page.locator('.sidebar-reservation-flow .reservation-dialog').getByLabel('CPF')).toBeVisible();
    await page.screenshot({path:'output/screens/leads-public-map-chat.png',fullPage:false});
  });

  test('widgets do mapa paginam por todas as categorias sem trocar a página longa',async({page})=>{
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await enterDemo(page);
    const filters=page.locator('map-filter-rail [data-map-filter]');
    await expect(filters).toHaveCount(6);
    for(const filter of await filters.all()){
      await filter.click();
      await expect(filter).toHaveClass(/active/);
    }
    await expect(page.locator('map-scene[data-persistent-map="true"]')).toBeVisible();
  });

  test('comercial e configurações de uso preservam a navegação administrativa',async({page})=>{
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await enterDemo(page);
    await page.locator('app-sidebar [data-view="brokers"]').click();
    await expect(page.locator('[data-commission-record-open]').first()).toBeVisible();
    await expect(page.locator('app-sidebar [data-view="finance"]')).toHaveCount(0);
    await page.locator('app-sidebar [data-view="settings"]').click();
    await expect(page.getByRole('heading',{name:'Configurações de uso'})).toBeVisible();
    await expect(page.locator('[data-usage-settings-form]')).toBeVisible();
    await expect(page.locator('[data-calibration-form]')).toHaveCount(0);
  });

  test('página dedicada da etapa preserva o portão de autenticação',async({page})=>{
    await page.goto('/admin/workers/stage?stage=project',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.belavista-auth-gate')).toBeVisible({timeout:10000});
    await expect(page.locator('.belavista-auth-gate')).toContainText('AUTENTICAÇÃO FIREBASE');
    await expect(page.getByRole('heading',{name:'Entrar no painel administrativo'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Preparação e projeto'})).not.toBeVisible();
  });

  test('caixa recalcula via API sem reintroduzir a página Financeiro',async({page,request})=>{
    const beforeState=await request.get('/api/cash-flow').then(response=>response.json());
    const beforeBalance=Number(beforeState.summary.balanceCents||0)/100;
    const amountCents=43210;
    const response=await request.post('/api/cash-flow',{
      headers:{
        'Content-Type':'application/json',
        'X-Belavista-Role':'owner',
        'X-Belavista-User':'screen-owner',
        'X-Belavista-Name':'Screen Owner'
      },
      data:{
        kind:'saida',
        stage:'Drenagem Pluvial',
        date:'2026-08-29',
        description:'Teste E2E de budget',
        category:'Obra',
        amountCents
      }
    });
    expect(response.ok()).toBeTruthy();
    const payload=await response.json();
    expect(payload.operational?.cash?.balanceCents).toBe(beforeState.summary.balanceCents-amountCents);

    await page.goto('/',{waitUntil:'domcontentloaded'});
    await enterDemo(page);
    await expect(page.locator('app-sidebar [data-view="finance"]')).toHaveCount(0);
    await page.locator('app-sidebar [data-view="control"]').click();
    await expect(page.locator('[data-control-general-event]')).toBeVisible();
  });

  test('ciclo operacional único consolida caixa, cronograma, agenda e notificações',async({request})=>{
    const response=await request.post('/api/operational-loop',{
      headers:{
        'Content-Type':'application/json',
        'X-Belavista-Role':'owner',
        'X-Belavista-User':'loop-owner',
        'X-Belavista-Name':'Loop Owner'
      },
      data:{
        reason:'test.loop',
        referenceDate:'2026-08-29',
        syncActivities:true,
        publishNotifications:true,
        clientState:{view:'finance',mapContext:false,globalSituation:true,recordsTracked:0,notificationsTracked:0}
      }
    });
    expect(response.ok()).toBeTruthy();
    const payload=await response.json();
    expect(payload.loopId).toContain('JOB-');
    expect(Number.isFinite(Number(payload.cashSummary.balanceCents))).toBeTruthy();
    expect(payload.operational.stages.length).toBeGreaterThanOrEqual(7);
    expect(payload.panorama.stages.length).toBeGreaterThanOrEqual(7);
    expect(payload.agenda.length).toBeGreaterThan(0);
    expect(payload.guidance.cashAction).toMatch(/caixa|comprovantes|materiais|Executar/i);
    expect(payload.guidance.focalStage.executionDescription).toMatch(/planejamento|execução|frente|materiais/i);
    expect(Object.keys(payload.guidance.focalStage.notificationTargets||{}).length).toBeGreaterThan(0);
    expect(payload.panorama.notifications.some(item=>Array.isArray(item.destinations)&&item.destinations.length>0)).toBeTruthy();
    expect(payload.notifications.length).toBeGreaterThan(0);
  });

  test('motor automático usa contexto da etapa e tabela de materiais quantificada',async({request})=>{
    const response=await request.post('/api/operational-loop',{
      headers:{
        'Content-Type':'application/json',
        'X-Belavista-Role':'admin',
        'X-Belavista-User':'ai-engine-admin',
        'X-Belavista-Name':'AI Engine Admin'
      },
      data:{
        reason:'test.ai.engine.materials',
        referenceDate:'2026-08-29',
        syncActivities:true,
        publishNotifications:true,
        stageProfiles:{
          water:{
            typicalDescription:'A rede de água precisa abrir frentes somente com tubos, conexões e cavaletes já conferidos por lote.',
            requestHints:[
              'Priorizar lotes liberados e reduzir abertura de valas sem kit completo.',
              'Cruzar saldo de tubos e cavaletes com o ritmo diário antes de gerar agenda.'
            ],
            evidenceFocus:['teste de pressão','foto do cavalete','ramal concluído por lote'],
            procurementFocus:['tubo PEAD 63 mm','cavalete padrão','kit de conexão'],
            materialsTable:[
              {name:'Tubo PEAD 63 mm',description:'Rede principal do trecho norte',quantity:'480',unit:'m',status:'critico'},
              {name:'Cavalete padrão',description:'Um por lote liberado',quantity:'40',unit:'un',status:'atencao'},
              {name:'Kit de conexão',description:'Conexões e registros do ramal',quantity:'40',unit:'kit',status:'planejado'}
            ],
            notificationTargets:{
              owner:['desktop-owner','rtdb/owner'],
              admin:['desktop-admin','rtdb/admin'],
              foreman:['mobile-foreman','rtdb/foreman']
            }
          }
        },
        clientState:{view:'stages',mapContext:true,globalSituation:true,recordsTracked:12,notificationsTracked:3}
      }
    });
    expect(response.ok()).toBeTruthy();
    const payload=await response.json();
    const water=payload.panorama.stages.find(item=>item.key==='water');
    expect(water).toBeTruthy();
    expect(water.executionProfile.typicalDescription).toContain('rede de água');
    expect(water.automation.planningContext.materialsTable.length).toBe(3);
    expect(water.automation.planningContext.materialsTable[0].name).toContain('Tubo PEAD');
    expect(water.automation.materialStatus).toMatch(/critical|attention/i);
    expect(water.automation.materialAlerts.join(' ')).toMatch(/Tubo PEAD|Cavalete|Kit de conexão/i);
    expect(payload.guidance.nvidiaRequestContext.stage.materialsTable.length).toBeGreaterThan(0);
    expect(payload.panorama.notifications.some(item=>item.role==='foreman'&&Array.isArray(item.destinations)&&item.destinations.includes('mobile-foreman'))).toBeTruthy();
  });

  test('estado sintético completo prioriza drenagem e rede de água sem antecipar toda a pavimentação',async({request})=>{
    const response=await request.post('/api/operational-loop',{
      headers:{
        'Content-Type':'application/json',
        'X-Belavista-Role':'owner',
        'X-Belavista-User':'synthetic-owner',
        'X-Belavista-Name':'Synthetic Owner'
      },
      data:{
        reason:'test.synthetic.full-state',
        referenceDate:'2026-08-29',
        syncActivities:true,
        publishNotifications:true,
        stageProfiles:{
          drainage:{
            typicalDescription:'Executar escavação dos trechos, preparação do fundo, assentamento da tubulação, execução de caixas e dispositivos de drenagem, conferência de nível e declividade, reaterro e compactação.',
            requestHints:['Priorizar drenagem em execução atual.','Recebimento de tubos afeta continuidade imediata.'],
            procurementFocus:['tubos','brita','areia','concreto'],
            materialsTable:[
              {name:'Tubos',description:'Rede de drenagem',quantity:'160',unit:'m',status:'critico'},
              {name:'Brita',description:'Próximo ciclo',quantity:'45',unit:'m³',status:'atencao'},
              {name:'Areia',description:'Próximo ciclo',quantity:'32',unit:'m³',status:'atencao'},
              {name:'Concreto',description:'Caixas e dispositivos',quantity:'18',unit:'m³',status:'planejado'}
            ],
            notificationTargets:{owner:['desktop-owner'],admin:['desktop-admin'],foreman:['mobile-foreman'],supplies:['desktop-supplies']}
          },
          water:{
            typicalDescription:'Implantação da rede principal, derivações, ramais, cavaletes, conexões, fechamento, testes e liberação dos trechos.',
            requestHints:['A água deve anteceder a pavimentação do trecho correspondente.'],
            materialsTable:[
              {name:'Tubo PEAD',description:'Rede principal',quantity:'4500',unit:'m',status:'atencao'},
              {name:'Cavaletes',description:'Um por lote',quantity:'298',unit:'un',status:'normal'},
              {name:'Ramais',description:'Ligação individual',quantity:'298',unit:'un',status:'atencao'},
              {name:'Conexões',description:'Conexões da rede',quantity:'420',unit:'un',status:'normal'}
            ],
            notificationTargets:{owner:['desktop-owner'],foreman:['mobile-foreman']}
          },
          paving:{
            typicalDescription:'Não abastecer toda a pavimentação enquanto determinados trechos ainda dependem da conclusão da rede de água.',
            requestHints:['Evitar compra ampla antecipada enquanto água não libera o trecho.'],
            materialsTable:[
              {name:'Paralelepípedo',description:'Compra parcial',quantity:'32000',unit:'m²',status:'planejado'},
              {name:'Base/brita',description:'Não comprar agora',quantity:'4800',unit:'m³',status:'critico'}
            ],
            notificationTargets:{owner:['desktop-owner'],admin:['desktop-admin']}
          },
          electrical:{
            typicalDescription:'A implantação é sequencial: marcação, chegada dos postes, instalação, lançamento dos cabos, equipamentos, iluminação, testes e liberação.',
            requestHints:['Usar estoque de postes disponível antes de antecipar compra de cabos.'],
            materialsTable:[
              {name:'Postes',description:'Disponíveis para próximos dias',quantity:'24',unit:'un',status:'normal'},
              {name:'Cabos',description:'Ainda não consumir caixa imediatamente',quantity:'1700',unit:'m',status:'normal'}
            ],
            notificationTargets:{owner:['desktop-owner'],utility:['desktop-utility']}
          }
        },
        clientState:{view:'finance',mapContext:false,globalSituation:true,recordsTracked:18,notificationsTracked:6}
      }
    });
    expect(response.ok()).toBeTruthy();
    const payload=await response.json();
    expect(payload.guidance.summary).toMatch(/Drenagem|Rede de Água|materiais|Cobertura/i);
    expect(payload.panorama.notifications.some(item=>/Drenagem|Rede de Água/.test(item.title))).toBeTruthy();
    expect(payload.panorama.notifications.some(item=>/suprimentos|cobertura suficiente/i.test(item.title)||/revisar a alocação/i.test(item.message))).toBeTruthy();
  });

  test('saída inesperada de caixa reduz margem e reforça postergação de compras de menor prioridade',async({request})=>{
    const before=await request.post('/api/operational-loop',{
      headers:{'Content-Type':'application/json','X-Belavista-Role':'owner','X-Belavista-User':'cash-before','X-Belavista-Name':'Cash Before'},
      data:{reason:'test.cash.before',referenceDate:'2026-08-29',syncActivities:true,publishNotifications:false,clientState:{view:'finance',mapContext:false,globalSituation:true,recordsTracked:0,notificationsTracked:0}}
    }).then(r=>r.json());
    await request.post('/api/cash-flow',{
      headers:{'Content-Type':'application/json','X-Belavista-Role':'owner','X-Belavista-User':'cash-shock','X-Belavista-Name':'Cash Shock'},
      data:{kind:'saida',stage:'Geral',date:'2026-08-29',description:'Saída inesperada de R$ 180 mil',category:'Ajuste extraordinário',amountCents:18000000}
    });
    const after=await request.post('/api/operational-loop',{
      headers:{'Content-Type':'application/json','X-Belavista-Role':'owner','X-Belavista-User':'cash-after','X-Belavista-Name':'Cash After'},
      data:{reason:'test.cash.after',referenceDate:'2026-08-29',syncActivities:true,publishNotifications:true,clientState:{view:'finance',mapContext:false,globalSituation:true,recordsTracked:0,notificationsTracked:0}}
    }).then(r=>r.json());
    expect(after.cashSummary.balanceCents).toBe(before.cashSummary.balanceCents-18000000);
    expect(after.guidance.cashAction).toMatch(/caixa|Reforçar|comprovantes|materiais/i);
    expect(after.notifications.some(item=>/Caixa e frentes recalculados/.test(item.title))).toBeTruthy();
  });

  test('comprovação de compra adiciona material e reduz risco imediato da drenagem',async({request})=>{
    const before=await request.post('/api/operational-loop',{
      headers:{'Content-Type':'application/json','X-Belavista-Role':'admin','X-Belavista-User':'receipt-before','X-Belavista-Name':'Receipt Before'},
      data:{
        reason:'test.receipt.before',
        referenceDate:'2026-08-29',
        syncActivities:true,
        publishNotifications:false,
        stageProfiles:{
          drainage:{
            typicalDescription:'Drenagem em execução contínua.',
            materialsTable:[{name:'Tubos',description:'Próximo ciclo',quantity:'160',unit:'m',status:'critico'}],
            notificationTargets:{foreman:['mobile-foreman'],supplies:['desktop-supplies']}
          }
        },
        clientState:{view:'stages',mapContext:false,globalSituation:true,recordsTracked:0,notificationsTracked:0}
      }
    }).then(r=>r.json());
    const beforeDrainage=before.panorama.stages.find(item=>item.key==='drainage');
    await request.post('/api/purchase-receipts',{
      headers:{'Content-Type':'application/json'},
      data:{
        supplier:'Fornecedor Tubos',
        stage:'Drenagem Pluvial',
        amountCents:540000,
        issueDate:'2026-08-29',
        fileName:'comprovante-tubos.pdf',
        dataUrl:tinyPdfDataUrl,
        materialName:'Tubos',
        materialQuantity:'100',
        materialUnit:'m',
        notes:'Recebimento confirmado de tubos.'
      }
    });
    const after=await request.post('/api/operational-loop',{
      headers:{'Content-Type':'application/json','X-Belavista-Role':'admin','X-Belavista-User':'receipt-after','X-Belavista-Name':'Receipt After'},
      data:{
        reason:'test.receipt.after',
        referenceDate:'2026-08-29',
        syncActivities:true,
        publishNotifications:false,
        stageProfiles:{
          drainage:{
            typicalDescription:'Drenagem em execução contínua.',
            materialsTable:[{name:'Tubos',description:'Próximo ciclo',quantity:'160',unit:'m',status:'critico'}],
            notificationTargets:{foreman:['mobile-foreman'],supplies:['desktop-supplies']}
          }
        },
        clientState:{view:'stages',mapContext:false,globalSituation:true,recordsTracked:0,notificationsTracked:0}
      }
    }).then(r=>r.json());
    const afterDrainage=after.panorama.stages.find(item=>item.key==='drainage');
    expect(afterDrainage.automation.materialCoverage).toBeGreaterThanOrEqual(beforeDrainage.automation.materialCoverage);
    expect(afterDrainage.automation.materialAlerts.join(' ')).not.toMatch(/Tubos: cobertura 0%/i);
  });

  test('encarregado confirma atividade e o próximo ciclo recalcula o progresso',async({request})=>{
    const confirmation=await request.post('/api/field-confirmations',{
      headers:{
        'Content-Type':'application/json',
        'X-Belavista-Role':'foreman',
        'X-Belavista-User':'foreman-test',
        'X-Belavista-Name':'Foreman Test'
      },
      data:{
        obra:'Aliança Park',
        etapa:'Rede de Água',
        atividade:'Implantar rede de água',
        responsavel:'João Pereira',
        detalhes:'Setor 1 concluído e liberado para sequência.',
        confirmed:true,
        progresso:100,
        services:['rede principal','teste e liberação']
      }
    });
    expect(confirmation.ok()).toBeTruthy();
    const confirmed=await confirmation.json();
    expect(confirmed.propagated.some(item=>item.type==='activity')).toBeTruthy();
    expect(confirmed.propagated.some(item=>item.type==='stage')).toBeTruthy();
    const loop=await request.post('/api/operational-loop',{
      headers:{'Content-Type':'application/json','X-Belavista-Role':'admin','X-Belavista-User':'after-foreman','X-Belavista-Name':'After Foreman'},
      data:{reason:'test.foreman.after',referenceDate:'2026-08-29',syncActivities:true,publishNotifications:true,clientState:{view:'progress',mapContext:false,globalSituation:true,recordsTracked:1,notificationsTracked:0}}
    }).then(r=>r.json());
    const water=loop.operational.stages.find(item=>item.key==='water');
    expect(water.progress).toBeGreaterThanOrEqual(100);
  });

  test('panorama automático cruza produção, materiais, compras e caixa',async({request})=>{
    const response=await request.get('/api/automation/panorama',{
      headers:{
        'X-Belavista-Role':'admin',
        'X-Belavista-User':'planner-reader',
        'X-Belavista-Name':'Planner Reader'
      }
    });
    expect(response.ok()).toBeTruthy();
    const payload=await response.json();
    expect(payload.summary.stages).toBeGreaterThanOrEqual(7);
    expect(payload.summary.materialsTracked).toBeGreaterThan(0);
    expect(payload.summary.purchasesTracked).toBeGreaterThan(0);
    expect(Array.isArray(payload.notifications)).toBeTruthy();
    const water=payload.stages.find(item=>item.key==='water');
    expect(water).toBeTruthy();
    expect(water.automation.production.adjustedRate).toBeGreaterThan(0);
    expect(water.plannedActivities.length).toBeGreaterThanOrEqual(3);
  });

  test('execução automática sincroniza atividades e agenda notificações',async({request})=>{
    const run=await request.post('/api/automation/run',{
      headers:{
        'Content-Type':'application/json',
        'X-Belavista-Role':'owner',
        'X-Belavista-User':'planner-owner',
        'X-Belavista-Name':'Planner Owner'
      },
      data:{
        referenceDate:'2026-08-29',
        publishNotifications:true,
        syncActivities:true
      }
    });
    expect(run.ok()).toBeTruthy();
    const result=await run.json();
    expect(result.jobId).toContain('JOB-');
    expect(result.notifications.length).toBeGreaterThan(0);
    const panorama=await request.get('/api/automation/panorama').then(response=>response.json());
    const drainage=panorama.stages.find(item=>item.key==='drainage');
    expect(drainage.existingActivities.some(item=>String(item.id).startsWith('auto-drainage-'))).toBeTruthy();
  });

  test('mobile preserva mapa, widgets e navegação pelo menu burger',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await enterDemo(page);
    await expect(page.getByRole('button',{name:'Abrir navegação'})).toBeVisible();
    await expect(page.locator('map-scene[data-persistent-map="true"]')).toBeVisible();
    await page.getByRole('button',{name:'Abrir navegação'}).click();
    await page.locator('app-sidebar [data-view="finance"]').click();
    await expect(page.getByRole('heading',{name:'Caixa e distribuição da obra'})).toBeVisible();
    await expect(page.locator('.finance-master-grid')).toBeVisible();
  });
});
