import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test.setTimeout(60000);
test.use({serviceWorkers:'block'});
const pdf={name:'comprovante-interface.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF')};
async function capture(page,info,name) {
  const path=info.outputPath(`${name}.png`);
  await page.screenshot({path,fullPage:true});
  await info.attach(name,{path,contentType:'image/png'});
}
async function minimizeChat(page) {
  const panel=page.locator('[data-worker-context-assistant]');
  if(!(await panel.getAttribute('class')).includes('is-collapsed')) await panel.locator('[data-worker-chat-minimize]').click();
}
async function boot(page,view='control') {
  page.businessRequests=[];page.businessErrors=[];
  page.on('pageerror',error=>page.businessErrors.push(error.message));
  const database={records:[],sales:[]};
  await page.addInitScript(()=>{
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER=true;
    globalThis.BELAVISTA_ADMIN_ACTOR={uid:'e2e-owner',name:'Teste de interface',role:'developer',label:'Teste'};
  });
  // Sessão e APIs isoladas: esta bateria não grava na base operacional.
  await page.route('**/admin-auth.mjs*',route=>route.fulfill({contentType:'text/javascript',body:'globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);'}));
  await page.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname,method=request.method();
    const data=method==='GET'?null:request.postDataJSON();
    page.businessRequests.push({path,method,data});
    let json={ok:true,records:database.records,items:[],attachments:[],notifications:[],leads:[],reservations:[],entries:[],stages:[],events:[],summary:{balanceCents:0},requests:[],sales:database.sales};
    if(path==='/api/records'&&method==='POST'){json={...data,id:`REG-UI-${database.records.length+1}`};database.records.push(json);}
    else if(path.startsWith('/api/commercial-sales')&&['POST','PUT'].includes(method)){json={...data,id:data.id||'SALE-UI-1'};database.sales=database.sales.filter(s=>s.id!==json.id).concat(json);}
    else if(path==='/api/ai') json={text:'Confira os dados da ação e informe o documento faltante.',toolCalls:[]};
    await route.fulfill({json});
  });
  await page.goto(`/admin?demo=1&view=${view}`,{waitUntil:'domcontentloaded'});
  await expect(page.locator('belavista-app')).toBeVisible({timeout:20000});
  await expect(page.locator('view-layer')).toBeVisible();
  await expect(page.locator('[data-worker-chat-minimize]')).toBeVisible();
  await minimizeChat(page);
}
test.afterEach(async({page},info)=>{
  if(!page.isClosed()){
    await capture(page,info,'resultado');
    await info.attach('requisicoes-da-interface',{body:Buffer.from(JSON.stringify(page.businessRequests||[],null,2)),contentType:'application/json'});
    expect(page.businessErrors||[],'Exceções não tratadas da interface').toEqual([]);
  }
});

for(const format of ['pdf','dwg']) test(`documentos — adicionar ${format.toUpperCase()}, pesquisar e preservar após recarga`,async({page},info)=>{
  await boot(page,'documents');await page.locator('[data-document-new]').click();
  const form=page.locator('[data-document-form]');
  for(const [name,value] of Object.entries({title:`Planta UI ${format}`,code:'UI-REV-01',issuer:'Equipe de projeto',documentDate:'2026-09-29',description:'Documento de teste da interface.'})) await form.locator(`[name="${name}"]`).fill(value);
  await form.locator('[name="file"]').setInputFiles(format==='pdf'?pdf:{name:'planta-ui.dwg',mimeType:'application/acad',buffer:Buffer.from('AC1032 fixture de transporte DWG')});
  await capture(page,info,'documento-preenchido');await form.getByRole('button',{name:'Salvar documento'}).click();
  await expect(page.locator('[data-document-form]')).toHaveCount(0);
  await page.locator('[data-document-query]').fill(`Planta UI ${format}`);
  await expect(page.locator('[data-document-row]')).toHaveCount(1);
  await expect(page.locator('[data-document-row]')).toContainText('UI-REV-01');
  await expect(page.locator('[data-document-row]')).toContainText(format==='pdf'?pdf.name:'planta-ui.dwg');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-document-row]').filter({hasText:`Planta UI ${format}`})).toHaveCount(1);
});
test('documentos — cadastro incompleto não cria linha',async({page})=>{
  await boot(page,'documents');const count=await page.locator('[data-document-row]').count();
  await page.locator('[data-document-new]').click();await page.locator('[data-document-form] [name="title"]').fill('Documento sem arquivo');
  await page.getByRole('button',{name:'Salvar documento'}).click();
  await expect(page.locator('[data-document-form]')).toBeVisible();await expect(page.locator('[data-document-row]')).toHaveCount(count);
});
async function fillRecord(page){
  const form=page.locator('[data-control-general-event]');
  await form.locator('[name="title"]').fill('Vistoria UI da drenagem');await form.locator('[name="responsible"]').fill('Responsável UI');
  await form.locator('[name="details"]').fill('Trecho revisado; documentação aguardando conferência.');
  await form.locator('[name="category"]').selectOption('vistoria');await form.locator('[name="status"]').selectOption('Pendente');return form;
}
test('registros — criar evento e conferir o resultado na lista',async({page},info)=>{
  await boot(page);const form=await fillRecord(page);await capture(page,info,'registro-preenchido');
  await form.getByRole('button',{name:'Registrar evento'}).click();
  await expect.poll(()=>page.businessRequests.find(x=>x.path==='/api/records'&&x.method==='POST')).toBeTruthy();
  const saved=page.businessRequests.find(x=>x.path==='/api/records'&&x.method==='POST').data;
  expect(saved).toMatchObject({atividade:'Vistoria UI da drenagem',responsavel:'Responsável UI',status:'Pendente'});expect(saved.detalhes).toContain('Tipo: vistoria');
  await expect(page.locator('.control-general-event-history')).toContainText('Vistoria UI da drenagem');
});
test('registros — erro de gravação preserva dados e permite nova tentativa',async({page})=>{
  await boot(page);await page.route('**/api/records',route=>route.request().method()==='POST'?route.fulfill({status:500,json:{error:'Falha simulada de gravação'}}):route.fallback());
  const form=await fillRecord(page);await form.getByRole('button',{name:'Registrar evento'}).click();
  await expect(form.locator('[data-control-general-event-status]')).toContainText('Falha simulada');
  await expect(form.locator('[name="title"]')).toHaveValue('Vistoria UI da drenagem');await expect(form.getByRole('button',{name:'Registrar evento'})).toBeEnabled();
  await page.unroute('**/api/records');await form.getByRole('button',{name:'Registrar evento'}).click();await expect(page.locator('.control-general-event-history')).toContainText('Vistoria UI da drenagem');
});
test('atividade — abrir detalhe pelo calendário e voltar',async({page})=>{
  await boot(page,'activities');const title=await page.locator('[data-activity-node]').first().locator('h2').innerText();
  await page.locator('[data-activity-canvas-open]').first().click();await expect(page.locator('view-layer')).toContainText(title);
  await expect(page.locator('[data-activity-calendar]')).toHaveCount(0);await expect(page.locator('view-layer')).toContainText(/Registro|Registrar|Execução/);
  const back=page.locator('view-layer [data-view="activities"]');await expect(back.first()).toBeVisible();await back.first().click();await expect(page.locator('[data-activity-calendar]')).toBeVisible();
});
test('ações IA — marcar impacto e prontidão arrastando a prioridade',async({page})=>{
  await boot(page,'actions');const marker=page.locator('[data-ai-action="AI-A03"]');await marker.click();
  await expect(page.locator('.action-inspector')).toContainText('Comprar tubos PEAD');
  const box=await marker.boundingBox(),matrix=await page.locator('[data-action-matrix]').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(matrix.x+matrix.width*.72,matrix.y+matrix.height*.25,{steps:12});await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>globalThis.__belavistaAppStore.get().aiActions?.find(a=>a.id==='AI-A03')?.readiness)).toBe(72);
  await expect.poll(()=>page.evaluate(()=>globalThis.__belavistaAppStore.get().aiActions?.find(a=>a.id==='AI-A03')?.impact)).toBe(75);
  await expect(page.locator('.action-inspector')).toContainText('prontidão 72%');
});
test('ações IA — card dispara API, cria pendência e mostra orientação no chat',async({page})=>{
  await boot(page);let request;
  await page.route('**/api/ai',route=>{request=route.request().postDataJSON();return route.fulfill({json:{text:'Informe a autorização da frente antes de continuar.',toolCalls:[{name:'agenda.create_pending',arguments:{title:'Revisar prioridade UI',stageKey:'drainage',stageName:'Drenagem Pluvial',detailsNeeded:'Autorização da frente'}}]}});});
  await page.locator('.stage-home-ai-grid [data-stage-home-ai-action]').first().click();await expect.poll(()=>request).toBeTruthy();
  expect(request.requestContext.workflow).toBe('guided-operational-action-chain');expect(request.requestContext.priority.id).toBe('AI-A01');
  await expect(page.locator('[data-worker-chat-log]')).toContainText('Informe a autorização');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('belavista.agenda-calendar.v3')||'{}').events?.some(x=>x.title==='Revisar prioridade UI'))).toBe(true);
});
test('encarregados — cadastrar, vincular etapa, editar e excluir com confirmação',async({page},info)=>{
  await boot(page,'personnel');const form=page.locator('[data-foreman-form]');
  for(const [name,value] of Object.entries({name:'Encarregado Interface',email:'interface@example.test',phone:'71999999999',whatsapp:'123'}))await form.locator(`[name="${name}"]`).fill(value);
  await form.getByRole('button',{name:'Cadastrar e gerar senha'}).click();await expect(form.locator('[data-foreman-status]')).toContainText('WhatsApp válido');await expect(page.locator('.foreman-list-v5424')).not.toContainText('Encarregado Interface');
  await form.locator('[name="whatsapp"]').fill('71999999999');await form.locator('[name="stages"][value="drainage"]').check();await form.getByRole('button',{name:'Cadastrar e gerar senha'}).click();
  await expect(page.locator('.foreman-list-v5424')).toContainText('Encarregado Interface');await expect(page.locator('.foreman-list-v5424')).toContainText('Drenagem Pluvial');
  await capture(page,info,'encarregado-cadastrado');
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('.foreman-list-v5424')).toContainText('interface@example.test');
  await page.locator('[data-foreman-edit]').click();await page.locator('[data-foreman-form] [name="name"]').fill('Encarregado revisado');await page.getByRole('button',{name:'Salvar alterações'}).click();
  await expect(page.locator('.foreman-list-v5424')).toContainText('Encarregado revisado');
  await capture(page,info,'encarregado-atualizado');
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('[data-foreman-delete]').click();await expect(page.locator('.foreman-list-v5424')).toContainText('Encarregado revisado');
  page.once('dialog',dialog=>dialog.accept());await page.locator('[data-foreman-delete]').click();await expect(page.locator('.foreman-list-v5424')).not.toContainText('Encarregado revisado');
});
test('leads — pesquisar, abrir perfil e encaminhar atendimento ao chat',async({page})=>{
  await boot(page,'leads');await page.locator('[data-admin-lead-search]').fill('Camila');await expect(page.locator('[data-admin-lead-index]')).toHaveCount(1);await page.locator('[data-admin-lead-index]').click();
  await expect(page.locator('view-layer h1')).toHaveText('Camila Andrade');await page.locator('[data-admin-lead-message]').click();
  await expect.poll(()=>page.businessRequests.find(x=>x.path==='/api/ai')).toBeTruthy();expect(page.businessRequests.find(x=>x.path==='/api/ai').data.message).toContain('Camila Andrade');
  await minimizeChat(page);await page.locator('[data-admin-leads-back]').click();await expect(page.locator('[data-admin-lead-search]')).toHaveValue('Camila');
});
test('contratos — incluir contrato, calcular comissão e editar dados',async({page},info)=>{
  await boot(page,'contracts');await page.locator('[data-contract-new]').click();const form=page.locator('[data-my-proposal-form]');
  for(const [name,value] of Object.entries({seller:'Aliança Park UI',lot:'Q12-L99',quadra:'Quadra 12',value:'123456,78',rate:'6',payment:'Sinal e parcelas',client:'Cliente Interface'}))await form.locator(`[name="${name}"]`).fill(value);
  await form.locator('[name="profile"]').selectOption('marina');await form.locator('[name="attachments"]').setInputFiles(pdf);await capture(page,info,'contrato-preenchido');await form.getByRole('button',{name:'Salvar proposta'}).click();
  const row=page.locator('tr').filter({hasText:'Cliente Interface'});await expect(row).toContainText('123.456,78');await row.locator('[data-contract-edit]').click();
  await expect(page.locator('[data-my-proposal-form] [name="client"]')).toHaveValue('Cliente Interface');await page.locator('[data-my-proposal-form] [name="client"]').fill('Cliente Interface revisado');await page.getByRole('button',{name:'Atualizar contrato'}).click();
  await expect(page.locator('tr').filter({hasText:'Cliente Interface revisado'})).toContainText('Q12-L99');
});
test('comissões — editar negociação com centavos e recalcular a comissão',async({page})=>{
  await boot(page,'brokers');await page.locator('[data-commission-record-open]').first().click();const form=page.locator('[data-commission-deal-form]');
  await form.locator('[name="value"]').fill('R$ 501.234,56');await form.locator('[name="rate"]').fill('6,00%');await form.locator('[name="notes"]').fill('Revisão UI com centavos');await form.getByRole('button',{name:'Salvar negociação'}).click();
  await expect.poll(()=>page.businessRequests.find(x=>x.path==='/api/commercial-sales'&&x.method==='POST')).toBeTruthy();expect(page.businessRequests.find(x=>x.path==='/api/commercial-sales'&&x.method==='POST').data.valueCents).toBe(50123456);
  await expect(page.locator('[data-commission-record="CT-2026-041"]')).toContainText('501.234,56');
  await expect(page.locator('[data-commission-record="CT-2026-041"]')).toContainText('30.074,07');
});
test('corretores — abrir carteira, anexar comprovante e removê-lo',async({page})=>{
  await boot(page,'brokers-board');await page.locator('[data-broker-board-profile="marina"]').click();await expect(page.locator('[data-broker-id="marina"]')).toContainText('Marina Alves');
  await page.locator('[data-broker-attachment]').setInputFiles(pdf);await expect(page.locator('[data-broker-id="marina"]')).toContainText(pdf.name);await page.locator('[data-broker-attachment-remove]').first().click();await expect(page.locator('[data-broker-id="marina"]')).not.toContainText(pdf.name);
  await page.locator('[data-commission-back]').click();await expect(page.locator('[data-broker-board-profile="marina"]')).toBeVisible();
});
test('relatórios — trocar famílias, expandir itens e baixar CSV real',async({page},info)=>{
  await boot(page,'reports');await expect(page.locator('.report-table tbody tr')).not.toHaveCount(0);const toggle=page.locator('[data-report-row-toggle]').first();await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(page.locator('[data-report-detail="0"]')).toBeVisible();await capture(page,info,'relatorio-expandido');await toggle.click();await expect(page.locator('[data-report-detail="0"]')).toBeHidden();
  for(const family of ['Financeiro','Construção','Suprimentos','Comercial','Governança','Sistema']){await page.locator(`[data-report-family-tab="${family}"]`).click();await expect(page.locator(`[data-report-family-tab="${family}"]`)).toHaveClass(/active/);await expect(page.locator('.report-table thead th')).not.toHaveCount(0);}
  const pending=page.waitForEvent('download');await page.locator('[data-report-export]').first().click();const download=await pending;expect(download.suggestedFilename()).toMatch(/\.csv$/);const path=info.outputPath(download.suggestedFilename());await download.saveAs(path);const content=await fs.readFile(path,'utf8');expect(content).toContain(';');expect(content.split('\n').length).toBeGreaterThan(2);await info.attach('relatorio-baixado',{path,contentType:'text/csv'});
});
test('configurações — salvar preferências, aplicá-las e manter após recarga',async({page},info)=>{
  await boot(page,'settings');await expect(page.locator('view-layer h1')).toHaveText('Configurações de uso');await expect(page.locator('[data-integration-form],[data-calibration-form]')).toHaveCount(0);await expect(page.locator('view-layer')).not.toContainText(/VAPID|NVIDIA_API_KEY|Webhook|Service Account|Base pública da API/);
  const form=page.locator('[data-usage-settings-form]');await form.locator('[name="defaultPage"]').selectOption('documents');await form.locator('[name="density"]').selectOption('compact');await form.locator('[name="reduceMotion"]').check();await form.locator('[name="pixKey"]').fill('recebimentos@example.test');await form.locator('[name="signalAmount"]').fill('1500.25');await form.getByRole('button',{name:'Salvar preferências'}).click();await expect(page.locator('[data-usage-settings-status]')).toContainText('Preferências salvas');await expect(page.locator('html')).toHaveAttribute('data-usage-density','compact');await expect(page.locator('html')).toHaveAttribute('data-usage-motion','reduced');
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('[name="pixKey"]')).toHaveValue('recebimentos@example.test');await expect(page.locator('[name="signalAmount"]')).toHaveValue('1500.25');await capture(page,info,'configuracoes-de-uso');await page.goto('/admin?demo=1',{waitUntil:'domcontentloaded'});await expect(page.locator('[data-project-documents-page]')).toBeVisible();
});
test('navegação — Financeiro removido e endereço antigo encaminha à Central',async({page})=>{
  await boot(page,'finance');await expect(page).toHaveURL(/view=control/);await expect(page.locator('view-layer')).toHaveAttribute('data-view','control');await expect(page.locator('app-sidebar [data-view="finance"]')).toHaveCount(0);await expect(page.locator('.finance-control-page')).toHaveCount(0);
});
