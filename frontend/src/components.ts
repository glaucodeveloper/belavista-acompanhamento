import type {
  BrokerProfile,
  BrokerRule,
  CashEntry,
  CommercialSale,
  OperationalMaterial,
  OperationalStage,
  OperationalActivity,
  OperationalRecord,
  MaterialCustomColumn,
  OperationalAgendaEvent,
  RepasseCurrentRow,
  RepasseForecastRow,
  RepasseOperations,
  RepasseReport,
  RepasseSale,
  DashboardSnapshot,
  ConfiguredStage,
  DelegatedAccessKey,
  DelegatedAccessRole,
  PublicLeadContactSettings,
  SettingsSnapshot,
  StageAIConfig,
  StageComprehensionMaterial,
  WorkbenchMaterial,
  WorkbenchSession,
  PublicCommercialLead,
  PublicCommercialRecords,
  InstagramFeed,
  InstagramCommentPolicy,
  LotDevelopmentProfile,
  CashFlowRecord,
  ProjectDocument,
  ProjectDocumentColumn,
} from "./models.js";

const dashboardStyles = `<style>
  atlas-dashboard{display:block;min-width:0}.atlas-dashboard{display:grid;gap:20px;color:#20283a}.atlas-dashboard *{box-sizing:border-box}.atlas-dashboard h1,.atlas-dashboard h2,.atlas-dashboard h3,.atlas-dashboard p{margin-top:0}.atlas-dashboard header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.atlas-dashboard .atlas-eyebrow{color:#3977d5;font:700 10px ui-monospace,monospace;letter-spacing:.08em}.atlas-dashboard .atlas-dashboard-head h1{margin:7px 0;font-size:clamp(24px,3vw,34px);color:#19243b}.atlas-dashboard .atlas-dashboard-head p,.atlas-dashboard .atlas-muted{margin:0;color:#6d788a}.atlas-dashboard .atlas-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-dashboard button,.atlas-dashboard a{font:inherit}.atlas-dashboard button{min-height:38px;padding:8px 13px;border:1px solid #d9e0eb;border-radius:9px;background:#fff;color:#26334b;cursor:pointer}.atlas-dashboard button:hover{border-color:#76a4ee;background:#f5f8fe}.atlas-dashboard button.atlas-primary{border-color:#246be0;background:#246be0;color:white}.atlas-dashboard .atlas-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.atlas-dashboard .atlas-kpi,.atlas-dashboard .atlas-panel{min-width:0;padding:18px;border:1px solid #e0e6ef;border-radius:14px;background:#fff;box-shadow:0 4px 16px #192b4910}.atlas-dashboard .atlas-kpi small{display:block;color:#7a8597;font-size:11px}.atlas-dashboard .atlas-kpi strong{display:block;margin:8px 0 5px;color:#1e2b43;font-size:24px}.atlas-dashboard .atlas-kpi span{color:#707b8c;font-size:12px}.atlas-dashboard .atlas-panel h2{margin:0 0 5px;font-size:18px;color:#1e2b43}.atlas-dashboard .atlas-panel>header{align-items:center;margin-bottom:16px}.atlas-dashboard .atlas-stage-track{display:grid;grid-auto-columns:minmax(220px,1fr);grid-auto-flow:column;gap:10px;overflow:auto;padding:2px 2px 12px}.atlas-dashboard .atlas-stage-card{display:grid;gap:9px;min-height:150px;padding:14px;border:1px solid #e1e6ee;border-top:3px solid #aab5c5;border-radius:11px;background:#fff;color:#29364c;text-align:left}.atlas-dashboard .atlas-stage-card[data-state=active]{border-top-color:#3478dc}.atlas-dashboard .atlas-stage-card[data-state=done]{border-top-color:#348e6b}.atlas-dashboard .atlas-stage-card header{align-items:center;color:#6b778b;font-size:11px}.atlas-dashboard .atlas-stage-card h3{margin:0;font-size:15px}.atlas-dashboard .atlas-stage-card p{margin:0;color:#738095;font-size:12px}.atlas-dashboard .atlas-progress{height:6px;overflow:hidden;border-radius:6px;background:#e9edf3}.atlas-dashboard .atlas-progress i{display:block;height:100%;background:#3478dc}.atlas-dashboard .atlas-stage-card[data-state=done] .atlas-progress i{background:#348e6b}.atlas-dashboard .atlas-stage-card footer{display:flex;justify-content:space-between;color:#6b778b;font-size:11px}.atlas-dashboard .atlas-report-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.atlas-dashboard .atlas-report-actions article{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border:1px solid #e3e8ef;border-radius:11px}.atlas-dashboard .atlas-report-actions p{margin:4px 0 0;color:#748095;font-size:12px}.atlas-dashboard .atlas-dashboard-map{height:330px;overflow:hidden;border:1px solid #dfe5ed;border-radius:12px;background:#eef1f4}.atlas-dashboard .atlas-dashboard-map map-scene{display:block;width:100%;height:100%}.atlas-dashboard .atlas-widgets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.atlas-dashboard .atlas-widget{display:flex;min-height:84px;align-items:center;gap:12px;padding:15px;border:1px solid #e0e6ef;border-radius:12px;background:#fff;color:#27344a;text-decoration:none}.atlas-dashboard .atlas-widget:hover{border-color:#76a4ee;background:#f7f9fd}.atlas-dashboard [role=alert]{padding:12px;border:1px solid #efc7c7;border-radius:9px;background:#fff7f7;color:#9b2935}.atlas-dashboard [data-focus]{border-left:3px solid #3478dc}.atlas-dashboard .atlas-focus-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.atlas-dashboard .atlas-focus-grid>div{padding:13px;border-radius:10px;background:#f6f8fb}.atlas-dashboard .atlas-focus-grid small{display:block;margin-bottom:7px;color:#758197;font-size:10px}.atlas-dashboard .atlas-focus-tabs{display:flex;gap:6px;margin:14px 0}.atlas-dashboard .atlas-focus-tabs button[aria-pressed=true]{border-color:#2e70d4;background:#edf4ff;color:#1e59ad}.atlas-dashboard .atlas-quick-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-dashboard .atlas-feedback{min-height:20px;margin:10px 0 0;color:#52627b;font-size:12px}
  @media(max-width:800px){.atlas-dashboard .atlas-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.atlas-dashboard .atlas-widgets{grid-template-columns:repeat(2,minmax(0,1fr))}.atlas-dashboard .atlas-dashboard-head{display:grid}.atlas-dashboard .atlas-report-actions{grid-template-columns:1fr}.atlas-dashboard .atlas-dashboard-map{height:260px}.atlas-dashboard .atlas-focus-grid{grid-template-columns:1fr}}
  @media(max-width:480px){.atlas-dashboard .atlas-kpi,.atlas-dashboard .atlas-panel{padding:14px}.atlas-dashboard .atlas-actions>*{flex:1}.atlas-dashboard .atlas-widgets{grid-template-columns:1fr 1fr}.atlas-dashboard .atlas-stage-track{grid-auto-columns:minmax(200px,82vw)}}
</style>`;

type DashboardState = DashboardSnapshot & { loading: boolean; error: string | null; focusKey: string; focusTab: "overview" | "agenda" | "records" | "worker"; feedback: string; recordFormOpen: boolean; recordSaving: boolean; recordStageId: string; recordError: string };

/** Dashboard web element; transient focus state and markup live here, service orchestration lives in program(). */
export class AtlasDashboard extends HTMLElement {
  private snapshot: DashboardState;
  private readonly state: AtomicState<DashboardState>;
  constructor() {
    super();
    const initial: DashboardState = { cashBalanceCents: 0, cashEntries: [], stages: [], records: [], notifications: [], agendaEvents: [], materials: [], repasses: { sales: [], entries: [], brokerRules: [], reasons: [] }, loading: true, error: null, focusKey: "", focusTab: "overview", feedback: "", recordFormOpen: false, recordSaving: false, recordStageId: "", recordError: "" };
    function* state(value: DashboardState): Generator<DashboardState, never, StateSetter<DashboardState>> { while (true) value = (yield value)(value); }
    const iterator = state(initial); iterator.next(); this.snapshot = initial;
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; this.render(); return this.snapshot; } };
  }
  private esc(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char] || char)); }
  setData(data: DashboardSnapshot): void { this.state.next(previous => ({ ...previous, ...data, recordStageId: previous.recordStageId || String(data.stages[0]?.id || ""), loading: false, error: null })); }
  setError(message: string): void { this.state.next(previous => ({ ...previous, loading: false, error: message })); }
  setFeedback(message: string): void { this.state.next(previous => ({ ...previous, feedback: message })); }
  setRecordSaving(recordSaving: boolean): void { this.state.next(previous => ({ ...previous, recordSaving, recordError: "" })); }
  setRecordResult(message: string, error = ""): void { this.state.next(previous => ({ ...previous, recordSaving: false, recordFormOpen: false, recordError: error, feedback: message })); }
  private navigate(view: string, stageKey?: string, newRecord = false): void { this.dispatchEvent(new CustomEvent("atlas:navigate", { bubbles: true, detail: { view, ...(stageKey ? { stageKey } : {}), ...(newRecord ? { newRecord: true } : {}) } })); }
  private render(): void {
    const s = this.snapshot, esc = (value: unknown) => this.esc(value), active = s.stages.filter(stage => Number(stage.progress) > 0 && Number(stage.progress) < 100).length, done = s.stages.filter(stage => Number(stage.progress) >= 100).length;
    const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.cashBalanceCents / 100);
    const stages = [...s.stages].sort((a,b) => a.id-b.id), focus = stages.find(stage => String(stage.key || stage.id) === s.focusKey);
    const status = (stage: OperationalStage) => Number(stage.progress) >= 100 ? "Concluída" : Number(stage.progress) > 0 ? "Em andamento" : stage.status || "Planejada";
    const stageMarkup = stages.map((stage,index) => { const progress = Math.max(0,Math.min(100,Number(stage.progress)||0)), key=String(stage.key||stage.id); return `<button type="button" class="atlas-stage-card" data-stage-focus="${esc(key)}" data-state="${progress>=100?"done":progress>0?"active":"planned"}"><header><span>${String(index+1).padStart(2,"0")} · ${esc(stage.week||`Etapa ${index+1}`)}</span><span>${progress}%</span></header><h3>${esc(stage.name)}</h3><p>${esc(stage.owner||"Responsável a definir")} · ${esc(status(stage))}</p><div class="atlas-progress"><i style="width:${progress}%"></i></div><footer><span>${(stage.activities||[]).length} atividade(s)</span><span>Abrir etapa →</span></footer></button>`; }).join("");
    const focusMarkup = focus ? `<section class="atlas-panel" data-focus><header><div><span class="atlas-eyebrow">ETAPA EM FOCO</span><h2>${esc(focus.name)}</h2><p class="atlas-muted">${esc(focus.owner||"Responsável a definir")} · ${esc(status(focus))} · ${Number(focus.progress)||0}%</p></div><button type="button" data-focus-close>Fechar</button></header><nav class="atlas-focus-tabs">${([["overview","Resumo"],["agenda","Agenda"],["records","Registros"],["worker","Worker"]] as const).map(([key,label])=>`<button type="button" data-focus-tab="${key}" aria-pressed="${s.focusTab===key}">${label}</button>`).join("")}</nav>${s.focusTab==="overview"?`<div class="atlas-focus-grid"><div><small>DESCRIÇÃO DA ETAPA</small>${esc(focus.description||"Sem descrição cadastrada")}</div><div><small>ATIVIDADES</small>${(focus.activities||[]).length}</div><div><small>PROGRESSO</small>${Number(focus.progress)||0}%</div></div>`:`<p>${s.focusTab==="agenda"?"A agenda mostra os compromissos persistidos associados às etapas.":s.focusTab==="records"?"Os registros persistidos documentam a execução desta etapa.":"Abra a configuração da etapa para editar atividades e critérios."}</p><div class="atlas-quick-actions"><button type="button" data-focus-view="${s.focusTab}">Abrir ${s.focusTab}</button>${s.focusTab==="worker"?`<a href="/admin/workers/stage?stage=${encodeURIComponent(String(focus.key||focus.name))}">Editar configuração</a>`:""}</div>`}</section>` : "";
    const reportActions = [["records","Registros de campo","Registros persistidos do diário operacional."],["agenda","Agenda por estado","Compromissos persistidos ordenados por estado e horário."]].map(([kind,title,description])=>`<article><div><strong>${title}</strong><p>${description}</p></div><button type="button" data-report="${kind}">Gerar CSV</button></article>`).join("");
    const widgets = [["map","Mapa","◈"],["progress","Registros","✎"],["agenda","Agenda","▦"],["activities","Atividades","☷"],["materials","Materiais","◇"],["brokers-board","Corretores","♧"],["repasses","Repasses","¤"],["settings","Configurações","⚙"]].map(([view,label,icon])=>`<button type="button" class="atlas-widget" data-atlas-view="${view}"><span aria-hidden="true">${icon}</span>${label} →</button>`).join("");
    this.innerHTML = `${dashboardStyles}<section class="atlas-dashboard atlas-dashboard-home"><header class="atlas-dashboard-head"><div><span class="atlas-eyebrow">DASHBOARD · ALIANÇA PARK</span><h1>Panorama operacional</h1><p>Resumo atualizado das fontes persistidas da aplicação.</p></div><div class="atlas-actions"><button type="button" data-refresh>Atualizar</button><button type="button" data-atlas-view="map">Mapa</button><button type="button" class="atlas-primary" data-new-record>Novo registro</button></div></header>${s.error?`<p role="alert">${esc(s.error)}</p>`:""}${s.loading?`<p>Carregando panorama do banco operacional…</p>`:""}<section class="atlas-kpis"><article class="atlas-kpi"><small>SALDO DE CAIXA</small><strong>${s.loading?"—":money}</strong><span>Resumo retornado pelo serviço de caixa</span></article><article class="atlas-kpi"><small>ETAPAS ATIVAS</small><strong>${s.loading?"—":active}</strong><span>${done} concluídas · ${s.stages.length} cadastradas</span></article><article class="atlas-kpi"><small>NOTIFICAÇÕES</small><strong>${s.loading?"—":s.notifications.length}</strong><span>Itens do serviço operacional</span></article><article class="atlas-kpi"><small>REGISTROS DE CAMPO</small><strong>${s.loading?"—":s.records.length}</strong><span>Histórico persistido</span></article></section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">CRONOGRAMA</span><h2>Linha do tempo das etapas</h2><p class="atlas-muted">Selecione uma frente para ver seu contexto e navegar para a agenda ou registros.</p></div><button type="button" data-atlas-view="stages">Abrir cronograma</button></header><div class="atlas-stage-track">${stageMarkup||(!s.loading?"<p class=atlas-muted>Nenhuma etapa retornada pelo serviço.</p>":"")}</div>${focusMarkup}</section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">EXPORTAÇÕES · BANCO OPERACIONAL</span><h2>Relatórios rápidos</h2><p class="atlas-muted">Os arquivos são gerados a partir de leituras atualizadas do servidor.</p></div></header><div class="atlas-report-actions">${reportActions}</div><p class="atlas-feedback" role="status" aria-live="polite">${esc(s.feedback)}</p></section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">MAPA OPERACIONAL</span><h2>Progresso físico por etapa</h2><p class="atlas-muted">Mapa compartilhado com a navegação operacional.</p></div><button type="button" data-atlas-view="map">Abrir mapa completo</button></header><div class="atlas-dashboard-map"><map-scene compact interactive data-base-map data-dashboard-operational-map="true" class="dashboard-operational-map" data-stage="Execução do Aliança Park" data-overlay="drenagem" aria-label="Mapa operacional 3D"></map-scene><map-filter-rail></map-filter-rail></div></section><nav class="atlas-widgets" aria-label="Interfaces operacionais">${widgets}</nav></section>`;
    const moneyCell = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
    const financeRows = s.cashEntries.slice(0, 8).map(row => `<tr><td>${esc(row.date || row.createdAt || "—")}</td><td>${esc(row.kind)}</td><td>${esc(row.stage || row.category || "Caixa")}</td><td>${moneyCell(row.amountCents)}</td><td>${esc(row.description)}</td></tr>`).join("");
    const materialRows = s.materials.map(row => `<tr><td>${esc(row.stageName || "Sem etapa")}</td><td>${esc(row.activityName || "—")}</td><td><strong>${esc(row.name)}</strong><small>${esc(row.scope || "")}</small></td><td>${esc(row.receivedQuantity)} / ${esc(row.plannedQuantity)} ${esc(row.unit)}</td><td>${esc(row.status)}</td></tr>`).join("");
    const stageRows = stages.map(stage => `<tr><td><strong>${esc(stage.name)}</strong><small>${esc(stage.key || "")}</small></td><td>${esc(stage.owner || "A definir")}</td><td>${Math.max(0, Math.min(100, Number(stage.progress) || 0))}%</td><td>${esc(status(stage))}</td></tr>`).join("");
    const saleRows = s.repasses.sales.map(sale => `<tr><td>${esc(sale.id)}</td><td>${esc(sale.lot)}</td><td>${esc(sale.client)}</td><td>${esc(sale.broker)}</td><td>${sale.receipts.length}</td><td>${sale.brokerRule?.active ? `${sale.brokerRule.commissionPercent}%` : "Regra pendente"}</td></tr>`).join("");
    const notices = s.notifications.slice(0, 8).map(item => `<li><strong>${esc(item.title || item.message || "Notificação")}</strong><span>${esc(item.status || (item.read ? "Lida" : "Não lida"))}</span></li>`).join("");
    const overview = `<div class="atlas-control-sections"><section class="atlas-panel"><header><div><span class="atlas-eyebrow">01 · CAIXA</span><h2>Movimentações recentes</h2><p class="atlas-muted">Leitura do livro-caixa persistido.</p></div><button type="button" data-atlas-view="cash-record">Registrar saída</button></header><div class="atlas-table-scroll"><table><thead><tr><th>Data</th><th>Tipo</th><th>Vínculo</th><th>Valor</th><th>Descrição</th></tr></thead><tbody>${financeRows || `<tr><td colspan="5">Nenhuma movimentação retornada pelo serviço.</td></tr>`}</tbody></table></div></section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">02 · MATERIAIS</span><h2>Materiais por atividade</h2><p class="atlas-muted">Quantidades e estados lidos do inventário operacional.</p></div><button type="button" data-atlas-view="materials">Abrir materiais</button></header><div class="atlas-table-scroll"><table><thead><tr><th>Etapa</th><th>Atividade</th><th>Material / uso</th><th>Recebido / previsto</th><th>Estado</th></tr></thead><tbody>${materialRows || `<tr><td colspan="5">Nenhum material retornado pelo serviço.</td></tr>`}</tbody></table></div></section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">03 · EXECUÇÃO</span><h2>Etapas e progresso</h2><p class="atlas-muted">Situação composta a partir do catálogo operacional persistido.</p></div><button type="button" data-atlas-view="agenda">Abrir agenda</button></header><div class="atlas-table-scroll"><table><thead><tr><th>Etapa</th><th>Responsável</th><th>Progresso</th><th>Estado</th></tr></thead><tbody>${stageRows || `<tr><td colspan="4">Nenhuma etapa retornada pelo serviço.</td></tr>`}</tbody></table></div></section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">04 · VENDAS E REPASSES</span><h2>Perfis de lote relacionados</h2><p class="atlas-muted">Vendas e regras financeiras atuais; configuração detalhada em Repasses.</p></div><button type="button" data-atlas-view="repasses">Abrir repasses</button></header><div class="atlas-table-scroll"><table><thead><tr><th>Venda</th><th>Lote</th><th>Cliente</th><th>Corretor</th><th>Entradas</th><th>Comissão</th></tr></thead><tbody>${saleRows || `<tr><td colspan="6">Nenhuma venda retornada pelo serviço.</td></tr>`}</tbody></table></div></section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">05 · AVISOS OPERACIONAIS</span><h2>Notificações recentes</h2></div></header><ul class="atlas-notices">${notices || `<li>Nenhuma notificação retornada pelo serviço.</li>`}</ul></section></div>`;
    this.querySelector(".atlas-kpis")?.insertAdjacentHTML("afterend", `<style>.atlas-dashboard .atlas-control-sections{display:grid;gap:14px}.atlas-dashboard .atlas-table-scroll{max-width:100%;overflow:auto}.atlas-dashboard table{width:100%;border-collapse:collapse;font-size:12px}.atlas-dashboard th,.atlas-dashboard td{padding:10px;border-bottom:1px solid #e8ecf2;text-align:left;vertical-align:top}.atlas-dashboard th{color:#708096;font-size:10px;text-transform:uppercase;white-space:nowrap}.atlas-dashboard td small{display:block;color:#758197;margin-top:3px}.atlas-dashboard .atlas-notices{display:grid;gap:8px;margin:0;padding:0;list-style:none}.atlas-dashboard .atlas-notices li{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid #e8ecf2}.atlas-dashboard .atlas-notices span{color:#758197;font-size:11px}</style>${overview}`);
    if (s.recordFormOpen) {
      const selected = stages.find(stage => String(stage.id) === s.recordStageId) || stages[0];
      const stageOptions = stages.map(stage => `<option value="${stage.id}" ${stage.id === selected?.id ? "selected" : ""}>${esc(stage.name)}</option>`).join("");
      const activityOptions = (selected?.activities || []).map(activity => `<option value="${esc(activity.id)}">${esc(activity.name)}</option>`).join("");
      this.querySelector(".atlas-kpis")?.insertAdjacentHTML("afterend", `<style>.atlas-dashboard .atlas-record-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.atlas-dashboard .atlas-record-fields label{display:grid;gap:6px;color:#59667a;font-size:12px}.atlas-dashboard .atlas-record-fields input,.atlas-dashboard .atlas-record-fields select,.atlas-dashboard .atlas-record-fields textarea{width:100%;min-height:40px;padding:9px 11px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e;font:inherit}.atlas-dashboard .atlas-record-fields textarea{min-height:86px}.atlas-dashboard .atlas-record-fields .wide{grid-column:1/-1}.atlas-dashboard [data-record-capture] form footer{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.atlas-dashboard .atlas-record-fields [role=alert]{grid-column:1/-1}@media(max-width:640px){.atlas-dashboard .atlas-record-fields{grid-template-columns:1fr}.atlas-dashboard .atlas-record-fields .wide{grid-column:auto}}</style><section class="atlas-panel" data-record-capture><header><div><span class="atlas-eyebrow">DIÁRIO OPERACIONAL</span><h2>Novo registro</h2><p class="atlas-muted">O apontamento será enviado ao serviço persistente do diário.</p></div><button type="button" data-record-cancel>Cancelar</button></header><form data-record-form><div class="atlas-record-fields"><label>Etapa<select name="stageId" data-record-stage required>${stageOptions}</select></label><label>Atividade<select name="activityId" required>${activityOptions}</select></label><label>Data<input name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}"></label><label>Hora<input name="time" type="time" required value="08:30"></label><label>Responsável<input name="responsible" placeholder="Encarregado ou equipe"></label><label class="wide">Resumo / medição<textarea name="detail" required placeholder="Descreva a execução, medição ou ocorrência"></textarea></label><label class="wide">Foto ou comprovante (opcional)<input name="evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment"><small>Até 6 MB; o anexo será vinculado ao registro.</small></label><label>Status<select name="status"><option>Pendente</option><option>Concluído</option></select></label>${s.recordError ? `<p role="alert">${esc(s.recordError)}</p>` : ""}</div><footer><button type="button" data-record-cancel>Cancelar</button><button type="submit" class="atlas-primary" ${s.recordSaving ? "disabled" : ""}>${s.recordSaving ? "Salvando…" : "Salvar registro"}</button></footer></form></section>`);
      this.querySelector<HTMLElement>("[data-record-capture]")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  connectedCallback(): void {
    this.render();
    this.addEventListener("click", event => { const target=event.target;if(!(target instanceof Element))return;const button=target.closest<HTMLElement>("button");if(!button)return;
      if(button.hasAttribute("data-refresh")){this.dispatchEvent(new CustomEvent("atlas:dashboard-refresh",{bubbles:true,detail:{element:this}}));return;}
      if(button.hasAttribute("data-new-record")){this.state.next(s=>({...s,recordFormOpen:true,recordStageId:s.recordStageId||String(s.stages[0]?.id||""),recordError:""}));return;}
      if(button.hasAttribute("data-record-cancel")){this.state.next(s=>({...s,recordFormOpen:false,recordError:""}));return;}
      if(button.dataset.atlasView){this.navigate(button.dataset.atlasView);return;}
      if(button.dataset.stageFocus){this.navigate("stages",button.dataset.stageFocus);return;}
      if(button.hasAttribute("data-focus-close")){this.state.next(s=>({...s,focusKey:"",focusTab:"overview"}));return;}
      if(button.dataset.focusTab){this.state.next(s=>({...s,focusTab:button.dataset.focusTab as DashboardState["focusTab"]}));return;}
      if(button.dataset.focusView){this.navigate(button.dataset.focusView,String(this.snapshot.focusKey));return;}
      if(button.dataset.report){this.dispatchEvent(new CustomEvent("atlas:dashboard-report",{bubbles:true,detail:{element:this,kind:button.dataset.report,button}}));}
    });
    this.addEventListener("change",event=>{const target=event.target;if(target instanceof HTMLSelectElement&&target.matches("[data-record-stage]"))this.state.next(s=>({...s,recordStageId:target.value,recordError:""}));});
    this.addEventListener("submit",event=>{const form=event.target;if(!(form instanceof HTMLFormElement)||!form.matches("[data-record-form]"))return;event.preventDefault();void this.submitRecord(form);});
    this.dispatchEvent(new CustomEvent("atlas:dashboard-connected",{bubbles:true,detail:{element:this}}));
  }
  private async submitRecord(form: HTMLFormElement): Promise<void> {
    const data=new FormData(form),stage=this.snapshot.stages.find(item=>String(item.id)===String(data.get("stageId")||"")),activity=stage?.activities?.find(item=>item.id===String(data.get("activityId")||"")),file=data.get("evidence");
    if(!stage||!activity){this.state.next(s=>({...s,recordError:"Selecione uma etapa e uma atividade cadastradas no serviço."}));return;}
    if(!String(data.get("date")||"")||!String(data.get("time")||"")||!String(data.get("detail")||"").trim()){this.state.next(s=>({...s,recordError:"Data, hora e resumo do registro são obrigatórios."}));return;}
    if(file instanceof File&&file.size>6*1024*1024){this.state.next(s=>({...s,recordError:"O comprovante deve ter até 6 MB."}));return;}
    let evidenceUri="";
    try{if(file instanceof File&&file.size)evidenceUri=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(new Error("Não foi possível ler o comprovante."));reader.readAsDataURL(file);});}
    catch(error){this.state.next(s=>({...s,recordError:error instanceof Error?error.message:String(error)}));return;}
    const payload={obra:"Aliança Park",etapa:stage.name,stageKey:stage.key||"",stageId:stage.id,activityId:activity.id,atividade:activity.name,data:String(data.get("date")),hora:String(data.get("time")),responsavel:String(data.get("responsible")||"").trim(),detalhes:String(data.get("detail")||"").trim(),status:String(data.get("status")||"Pendente"),...(evidenceUri?{evidenceUri}:{})};
    this.state.next(s=>({...s,recordSaving:true,recordError:""}));this.dispatchEvent(new CustomEvent("atlas:dashboard-record-create",{bubbles:true,detail:{element:this,payload}}));
  }
}
if (!customElements.get("atlas-dashboard")) customElements.define("atlas-dashboard", AtlasDashboard);

const historyEditStyles = `<style>
  .sales-history-page .atlas-history-file{border:0;background:transparent;color:#2557aa;text-decoration:underline;cursor:pointer;text-align:left;padding:0;font:inherit}
  .sales-history-page .atlas-history-file:hover{color:#173b7c}
  .sales-history-page .sales-history-attachments [role=alert]{color:#b43544;font-size:13px}
  .sales-history-page .atlas-history-edit{margin-top:20px;padding:24px;background:#fff;border:1px solid #e0e5ed;border-radius:20px;box-shadow:0 8px 24px rgba(24,34,54,.05);color:#23283a}
  .sales-history-page .atlas-history-edit header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:0 0 16px;background:transparent;border:0;border-bottom:1px solid #e8ebf0;color:#23283a}
  .sales-history-page .atlas-history-edit header>span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#eef4ff;color:#2467db;font-size:11px;font-weight:700}
  .sales-history-page .atlas-history-edit h2{margin:0;color:#18243e;font-size:20px;line-height:1.25}
  .sales-history-page .atlas-history-edit p{margin:4px 0 0;color:#6e788b;font-size:13px}
  .sales-history-page .atlas-history-edit-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .sales-history-page .atlas-history-edit label{display:flex;flex-direction:column;gap:7px;color:#546077;font-size:13px}
  .sales-history-page .atlas-history-edit label.wide{grid-column:1/-1}
  .sales-history-page .atlas-history-edit select,.sales-history-page .atlas-history-edit textarea,.sales-history-page .atlas-history-edit input[type=file]{box-sizing:border-box;width:100%;min-width:0;padding:11px 13px;border:1px solid #dbe1ea;border-radius:11px;background:#fff;color:#18243e;font:inherit}
  .sales-history-page .atlas-history-edit textarea{min-height:112px;resize:vertical}
  .sales-history-page .atlas-history-edit [role=alert]{margin-top:16px;color:#b43544}
  .sales-history-page .atlas-history-edit footer{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid #e8ebf0}
  .sales-history-page .atlas-history-edit footer button:last-child{background:#252634;color:#fff;border-color:#252634}
  @media(max-width:760px){.sales-history-page .atlas-history-edit{padding:18px;border-radius:16px}.sales-history-page .atlas-history-edit-fields{grid-template-columns:1fr}.sales-history-page .atlas-history-edit footer{flex-wrap:wrap}.sales-history-page .atlas-history-edit footer button{flex:1 1 auto}}
</style>`;

type SalesHistoryState = {
  sales: CommercialSale[];
  entries: CashEntry[];
  rules: BrokerRule[];
  query: string;
  selectedId: string | null;
  editing: boolean;
  saving: boolean;
  mutationError: string | null;
  documentError: string | null;
  error: string | null;
  loaded: boolean;
};
type StateSetter<T> = (previous: T) => T;
type AtomicState<T> = { next(setter: StateSetter<T>): T };

/** Os estados, helpers, DOM e eventos desta categoria pertencem ao elemento. */
export class AtlasSalesHistory extends HTMLElement {
  private readonly state: AtomicState<SalesHistoryState>;
  private snapshot: SalesHistoryState;

  constructor() {
    super();
    const initial: SalesHistoryState = {
      sales: [],
      entries: [],
      rules: [],
      query: "",
      selectedId: null,
      editing: false,
      saving: false,
      mutationError: null,
      documentError: null,
      error: null,
      loaded: false,
    };
    function* state(
      value: SalesHistoryState,
    ): Generator<SalesHistoryState, never, StateSetter<SalesHistoryState>> {
      while (true) value = (yield value)(value);
    }
    this.snapshot = initial;
    const iterator = state(initial);
    iterator.next();
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; this.render(); return this.snapshot; } };
  }

  private chooseSale(id: string | null): void {
    this.state.next((previous) => ({
      ...previous,
      selectedId: id,
      editing: false,
      mutationError: null,
    }));
    this.dispatchEvent(
      new CustomEvent("atlas:history-selection", {
        bubbles: true,
        detail: { id },
      }),
    );
  }

  setData(
    sales: CommercialSale[],
    entries: CashEntry[],
    rules: BrokerRule[],
  ): void {
    this.state.next((previous) => ({
      ...previous,
      sales,
      entries,
      rules,
      editing: false,
      saving: false,
      mutationError: null,
      documentError: null,
      error: null,
      loaded: true,
    }));
  }

  setDocumentError(message: string | null): void {
    this.state.next((previous) => ({ ...previous, documentError: message }));
  }

  setMutationError(message: string): void {
    this.state.next((previous) => ({
      ...previous,
      saving: false,
      mutationError: message,
    }));
  }

  setError(message: string): void {
    this.state.next((previous) => ({ ...previous, error: message }));
  }

  connectedCallback(): void {
    this.addEventListener("input", (event) => {
      const input = event.target;
      if (
        input instanceof HTMLInputElement &&
        input.matches("[data-history-search]")
      ) {
        const cursor = input.selectionStart;
        this.state.next((previous) => ({ ...previous, query: input.value }));
        const replacement = this.querySelector<HTMLInputElement>(
          "[data-history-search]",
        );
        replacement?.focus();
        if (cursor !== null) replacement?.setSelectionRange(cursor, cursor);
      }
    });
    this.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const open = target.closest<HTMLElement>("[data-history-open]");
      if (open) this.chooseSale(open.dataset.historyOpen || null);
      if (target.closest("[data-history-back]")) this.chooseSale(null);
      if (target.closest("[data-history-print]")) window.print();
      const file = target.closest<HTMLElement>("[data-history-file-url]");
      if (file)
        this.dispatchEvent(
          new CustomEvent("atlas:history-file", {
            bubbles: true,
            detail: {
              element: this,
              fileUrl: file.dataset.historyFileUrl,
              fileName: file.dataset.historyFileName,
            },
          }),
        );
      if (target.closest("[data-history-edit]"))
        this.state.next((previous) => ({
          ...previous,
          editing: true,
          mutationError: null,
        }));
      if (target.closest("[data-history-edit-cancel]"))
        this.state.next((previous) => ({
          ...previous,
          editing: false,
          mutationError: null,
        }));
    });
    this.addEventListener("submit", (event) => {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement) ||
        !form.matches("[data-history-edit-form]")
      )
        return;
      event.preventDefault();
      if (this.snapshot.saving || !this.snapshot.selectedId) return;
      const data = new FormData(form);
      const id = this.snapshot.selectedId;
      const status = String(data.get("status") || "").trim();
      const notes = String(data.get("notes") || "").trim();
      const contract = Array.from(
        (form.elements.namedItem("contract") as HTMLInputElement)?.files || [],
      );
      const client = Array.from(
        (form.elements.namedItem("client") as HTMLInputElement)?.files || [],
      );
      this.state.next((previous) => ({
        ...previous,
        saving: true,
        mutationError: null,
      }));
      this.dispatchEvent(
        new CustomEvent("atlas:history-save", {
          bubbles: true,
          detail: { element: this, id, status, notes, contract, client },
        }),
      );
    });
    this.render();
    this.dispatchEvent(
      new CustomEvent("atlas:history-connected", {
        bubbles: true,
        detail: { element: this },
      }),
    );
  }

  selectSale(id: string | null): void {
    this.state.next((previous) => ({ ...previous, selectedId: id }));
  }

  private escape(value: unknown): string {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char] || char,
    );
  }

  private money(cents: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format((Number(cents) || 0) / 100);
  }

  private date(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString("pt-BR");
  }

  private receiptsFor(sale: CommercialSale): CashEntry[] {
    return this.snapshot.entries.filter(
      (entry) => entry.saleId === sale.id && entry.kind === "entrada",
    );
  }

  private ruleFor(sale: CommercialSale): BrokerRule | undefined {
    const normalizeBroker = (value: string) =>
      value.trim().toLocaleLowerCase("pt-BR");
    const normalizeLot = (value: string) => {
      const raw = value.trim().toLocaleUpperCase("pt-BR").replace(/\s+/g, "");
      const match = raw.match(/^([A-Z]+)-?(\d+)$/);
      return match ? match[1] + "-" + Number(match[2]) : raw;
    };
    return this.snapshot.rules.find(
      (rule) =>
        rule.active &&
        normalizeBroker(rule.brokerName) === normalizeBroker(sale.broker) &&
        normalizeLot(rule.lotKey) === normalizeLot(sale.lot),
    );
  }

  private saleCard(sale: CommercialSale): string {
    const rule = this.ruleFor(sale);
    const receipts = this.receiptsFor(sale);
    const commission = rule
      ? Math.round((sale.valueCents * rule.commissionPercent) / 100)
      : null;
    return (
      '<article class="sales-history-card" data-history-row>' +
      '<header class="sales-history-card-head"><div><small>' +
      this.escape(sale.id) +
      " · " +
      this.escape(this.date(sale.createdAt)) +
      "</small>" +
      "<h2>" +
      this.escape(sale.client) +
      "</h2><p>" +
      this.escape(sale.lot) +
      "</p></div>" +
      '<span class="deal-status">' +
      this.escape(sale.status) +
      "</span></header>" +
      '<section class="sales-history-card-summary" aria-label="Resumo financeiro">' +
      "<div><small>VALOR DA VENDA</small><b>" +
      this.money(sale.valueCents) +
      "</b></div>" +
      "<div><small>COMISSÃO CONFIGURADA</small><b>" +
      (commission === null ? "Sem regra" : this.money(commission)) +
      "</b>" +
      "<span>" +
      (rule
        ? this.escape(rule.commissionPercent) + "%"
        : "Configure corretor e lote em Repasses") +
      "</span></div></section>" +
      '<dl class="sales-history-card-details"><div><dt>Corretor responsável</dt><dd>' +
      this.escape(sale.broker) +
      "</dd></div>" +
      "<div><dt>Recebimentos vinculados</dt><dd>" +
      receipts.length +
      "</dd></div>" +
      "<div><dt>Arquivos associados</dt><dd>" +
      sale.files.length +
      "</dd></div></dl>" +
      '<footer><button type="button" class="toolbar-action" data-history-open="' +
      this.escape(sale.id) +
      '">Abrir relatório ↗</button></footer></article>'
    );
  }

  private detail(sale: CommercialSale): string {
    const receipts = this.receiptsFor(sale);
    const rule = this.ruleFor(sale);
    const receiptTotal = receipts.reduce(
      (sum, entry) => sum + Number(entry.amountCents || 0),
      0,
    );
    return (
      '<section class="sales-history-page">' +
      historyEditStyles +
      '<div class="sales-history-toolbar">' +
      '<button type="button" class="toolbar-action" data-history-back>← Histórico de movimentações</button>' +
      '<button type="button" class="toolbar-action" data-history-print>Imprimir / PDF</button></div>' +
      '<header class="sales-history-detail-head"><div><span class="activity-kind">RELATÓRIO DE VENDA · ' +
      this.escape(sale.id) +
      "</span>" +
      "<h1>" +
      this.escape(sale.client) +
      "</h1><p>" +
      this.escape(sale.lot) +
      " · corretor " +
      this.escape(sale.broker) +
      "</p></div>" +
      '<span class="deal-status">' +
      this.escape(sale.status) +
      "</span></header>" +
      '<section class="sales-history-facts"><article><small>VALOR DO LOTE</small><b>' +
      this.money(sale.valueCents) +
      "</b></article>" +
      "<article><small>RECEBIDO</small><b>" +
      this.money(receiptTotal) +
      "</b></article>" +
      "<article><small>COMISSÃO</small><b>" +
      (rule
        ? this.escape(rule.commissionPercent) + "%"
        : "Sem regra configurada") +
      "</b></article>" +
      "<article><small>ATUALIZAÇÃO</small><b>" +
      this.escape(this.date(sale.updatedAt)) +
      "</b></article></section>" +
      '<section class="sales-history-report-grid"><article><header><h2>Recebimentos vinculados</h2><span>' +
      receipts.length +
      " registro(s)</span></header><ol>" +
      (receipts
        .map(
          (entry) =>
            "<li><b>" +
            this.money(entry.amountCents) +
            "</b><small>" +
            this.escape(entry.description || entry.id) +
            "</small><time>" +
            this.escape(this.date(entry.createdAt || "")) +
            "</time></li>",
        )
        .join("") ||
        '<li class="empty-data">Nenhum recebimento vinculado.</li>') +
      '</ol><div class="sales-history-notes"><h3>Observações</h3><p>' +
      this.escape(sale.notes || "Nenhuma observação registrada.") +
      "</p></div></article>" +
      '<article class="sales-history-attachments"><header><h2>Contrato e documentos do cliente</h2></header><ul>' +
      (sale.files
        .map(
          (file) =>
            '<li><button type="button" class="atlas-history-file" data-history-file-url="' +
            this.escape(file.fileUrl) +
            '" data-history-file-name="' +
            this.escape(file.fileName) +
            '">' +
            this.escape(file.fileName) +
            "</button><small>" +
            this.escape(file.kind) +
            "</small></li>",
        )
        .join("") || '<li class="empty-data">Nenhum anexo vinculado.</li>') +
      "</ul>" +
      (this.snapshot.documentError
        ? '<p role="alert">' + this.escape(this.snapshot.documentError) + "</p>"
        : "") +
      '<button type="button" class="toolbar-action" data-history-edit>Editar acompanhamento e anexos ↗</button></article></section>' +
      (this.snapshot.editing
        ? '<form class="atlas-history-edit" data-history-edit-form><header><span>01</span><div><h2>Atualizar venda</h2><p>Status, observações e documentos vinculados ao registro persistido.</p></div></header>' +
          '<div class="atlas-history-edit-fields"><label>Status<select name="status" required>' +
          [
            ...new Set([
              sale.status,
              "Reserva",
              "Em análise",
              "Proposta",
              "Assinado",
              "Compra confirmada",
            ]),
          ]
            .map(
              (status) =>
                '<option value="' +
                this.escape(status) +
                '"' +
                (status === sale.status ? " selected" : "") +
                ">" +
                this.escape(status) +
                "</option>",
            )
            .join("") +
          '</select></label><label class="wide">Observações<textarea name="notes" rows="4">' +
          this.escape(sale.notes) +
          "</textarea></label>" +
          '<label>Contrato ou aditivo<input type="file" name="contract" accept="application/pdf,image/jpeg,image/png,image/webp"></label>' +
          '<label>Documentos do cliente<input type="file" name="client" multiple accept="application/pdf,image/jpeg,image/png,image/webp"></label></div>' +
          (this.snapshot.mutationError
            ? '<p role="alert">' +
              this.escape(this.snapshot.mutationError) +
              "</p>"
            : "") +
          '<footer><button type="button" class="toolbar-action" data-history-edit-cancel>Cancelar</button><button type="submit" class="toolbar-action"' +
          (this.snapshot.saving ? " disabled" : "") +
          ">" +
          (this.snapshot.saving ? "Salvando…" : "Salvar alterações") +
          "</button></footer></form>"
        : "") +
      "</section>"
    );
  }

  render(): void {
    if (this.snapshot.error) {
      this.innerHTML =
        '<section class="sales-history-page"><h1>Histórico de movimentações</h1><p role="alert"></p></section>';
      const message = this.querySelector('[role="alert"]');
      if (message) message.textContent = this.snapshot.error;
      return;
    }
    if (!this.snapshot.loaded) {
      this.innerHTML =
        '<section class="sales-history-page" aria-busy="true"><h1>Histórico de movimentações</h1><p>Carregando vendas e repasses do servidor…</p></section>';
      return;
    }
    const sale = this.snapshot.sales.find(
      (item) => item.id === this.snapshot.selectedId,
    );
    if (sale) {
      this.innerHTML = this.detail(sale);
      return;
    }
    const query = this.snapshot.query.trim().toLocaleLowerCase("pt-BR");
    const rows = this.snapshot.sales.filter((item) =>
      [item.id, item.client, item.lot, item.broker].some((value) =>
        String(value).toLocaleLowerCase("pt-BR").includes(query),
      ),
    );
    const total = this.snapshot.sales.reduce(
      (sum, item) => sum + Number(item.valueCents || 0),
      0,
    );
    const attachments = this.snapshot.sales.reduce(
      (sum, item) => sum + item.files.length,
      0,
    );
    this.innerHTML =
      '<section class="sales-history-page"><div class="sales-history-search-toolbar">' +
      '<label>Buscar venda<input type="search" data-history-search value="' +
      this.escape(this.snapshot.query) +
      '" placeholder="Cliente, lote, corretor ou contrato"></label></div>' +
      '<section class="sales-history-summary"><article><small>VENDAS REGISTRADAS</small><b>' +
      this.snapshot.sales.length +
      "</b></article>" +
      "<article><small>VALOR TOTAL</small><b>" +
      this.money(total) +
      "</b></article>" +
      "<article><small>ANEXOS</small><b>" +
      attachments +
      "</b></article></section>" +
      '<div class="sales-history-list">' +
      (rows.map((item) => this.saleCard(item)).join("") ||
        '<p class="empty-data">Nenhuma venda encontrada.</p>') +
      "</div></section>";
  }
}

if (!customElements.get("atlas-sales-history"))
  customElements.define("atlas-sales-history", AtlasSalesHistory);

const repasseStyles = `<style>
  .atlas-repasse-page{display:grid;gap:18px;color:#20283a}.atlas-repasse-page *{box-sizing:border-box}
  .atlas-repasse-page .atlas-repasse-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
  .atlas-repasse-page h1,.atlas-repasse-page h2,.atlas-repasse-page h3,.atlas-repasse-page p{margin-top:0}
  .atlas-repasse-page h1{margin-bottom:6px;font-size:30px;color:#18243e}.atlas-repasse-page h2{margin-bottom:6px;font-size:20px;color:#18243e}.atlas-repasse-page h3{font-size:15px;color:#25314a}
  .atlas-repasse-page p{margin-bottom:0;color:#65748a;font-size:13px;line-height:1.5}.atlas-repasse-page .atlas-eyebrow{display:block;margin-bottom:7px;color:#3975d5;font:600 10px ui-monospace,monospace;letter-spacing:.08em}
  .atlas-repasse-page .atlas-page-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-repasse-page button{min-height:38px;padding:8px 13px;border:1px solid #d5dce7;border-radius:9px;background:#fff;color:#20283a;font:600 13px inherit;cursor:pointer}.atlas-repasse-page button:hover{border-color:#3975d5}.atlas-repasse-page button:disabled{opacity:.55;cursor:wait}.atlas-repasse-page .atlas-primary{background:#252634;color:#fff;border-color:#252634}
  .atlas-repasse-page .atlas-status{padding:10px 13px;border:1px solid #e1e6ee;border-radius:10px;background:#f7f9fc;color:#5e6d83;font-size:12px}.atlas-repasse-page [role=alert]{color:#a72d3b}
  .atlas-repasse-page .atlas-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.atlas-repasse-page .atlas-metrics article,.atlas-repasse-page .atlas-card{padding:18px;border:1px solid #e0e5ed;border-radius:16px;background:#fff;box-shadow:0 4px 16px rgba(24,34,54,.035)}
  .atlas-repasse-page .atlas-metrics article{display:grid;gap:7px}.atlas-repasse-page .atlas-metrics small,.atlas-repasse-page .atlas-repasse-summary small{color:#68778c;font-size:12px}.atlas-repasse-page .atlas-metrics strong{font-size:23px;color:#1b2b49}.atlas-repasse-page .atlas-metrics span{color:#65748a;font-size:12px}
  .atlas-repasse-page .atlas-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:15px;margin-bottom:15px;border-bottom:1px solid #e8ecf2}.atlas-repasse-page form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.atlas-repasse-page label{display:grid;gap:6px;min-width:0;color:#56657a;font-size:12px}.atlas-repasse-page input,.atlas-repasse-page select{width:100%;min-height:40px;padding:9px 11px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e;font:inherit}.atlas-repasse-page input[readonly]{background:#f5f7fa;color:#59667a}.atlas-repasse-page .wide{grid-column:1/-1}.atlas-repasse-page form footer{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;margin-top:3px}
  .atlas-repasse-page .atlas-sale{display:grid;gap:16px}.atlas-repasse-page .atlas-sale>header{padding-bottom:13px;border-bottom:1px solid #e8ecf2}.atlas-repasse-page .atlas-repasse-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.atlas-repasse-page .atlas-repasse-summary>span{display:grid;gap:6px;padding:12px;border-radius:10px;background:#f6f8fb;color:#5d6b80;font-size:12px}.atlas-repasse-page .atlas-repasse-summary b{color:#18243e;font-size:15px}.atlas-repasse-page .atlas-repasse-config{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.atlas-repasse-page .atlas-repasse-config form{align-content:start;padding:15px;border:1px solid #e4e8ef;border-radius:12px;background:#fbfcfe}.atlas-repasse-page .atlas-table-wrap{overflow:auto;border:1px solid #e4e8ef;border-radius:10px}.atlas-repasse-page table{width:100%;min-width:790px;border-collapse:collapse}.atlas-repasse-page th,.atlas-repasse-page td{padding:10px 9px;border-bottom:1px solid #e9edf3;text-align:left;vertical-align:top;font-size:12px}.atlas-repasse-page th{background:#f7f9fc;color:#66748a;font-size:10px;text-transform:uppercase;letter-spacing:.04em}.atlas-repasse-page tr:last-child td{border-bottom:0}.atlas-repasse-page td form{grid-template-columns:repeat(4,minmax(120px,1fr));align-items:end}.atlas-repasse-page td form footer{grid-column:1/-1}.atlas-repasse-page .atlas-section-title{margin:0 0 10px}.atlas-repasse-page .atlas-source-note{color:#758197;font-size:11px}
  @media(max-width:850px){.atlas-repasse-page .atlas-repasse-head{display:grid}.atlas-repasse-page .atlas-metrics{grid-template-columns:1fr 1fr}.atlas-repasse-page .atlas-repasse-summary{grid-template-columns:1fr 1fr}.atlas-repasse-page .atlas-repasse-config{grid-template-columns:1fr}}
  @media(max-width:560px){.atlas-repasse-page h1{font-size:24px}.atlas-repasse-page .atlas-metrics{grid-template-columns:1fr}.atlas-repasse-page form{grid-template-columns:1fr}.atlas-repasse-page .wide,.atlas-repasse-page form footer{grid-column:auto}.atlas-repasse-page .atlas-card{padding:14px}.atlas-repasse-page td form{grid-template-columns:1fr}}
</style>`;

type RepasseState = {
  data: RepasseOperations | null;
  reports: RepasseReport[];
  status: "loading" | "ready" | "error";
  error: string | null;
  message: string | null;
  selectedSaleId: string;
  saving: boolean;
};
type RepasseSetter = (previous: RepasseState) => RepasseState;

/** Cadastro, leitura e controles do caixa ficam no Web Element responsável pela rota. */
export class AtlasRepasses extends HTMLElement {
  private readonly state: AtomicState<RepasseState>;
  private snapshot: RepasseState;
  constructor() {
    super();
    const initial: RepasseState = {
      data: null,
      reports: [],
      status: "loading",
      error: null,
      message: null,
      selectedSaleId: "",
      saving: false,
    };
    function* state(
      value: RepasseState,
    ): Generator<RepasseState, never, RepasseSetter> {
      while (true) value = (yield value)(value);
    }
    this.snapshot = initial;
    const iterator = state(initial);
    iterator.next();
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; this.render(); return this.snapshot; } };
  }
  private escape(value: unknown): string {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char] || char,
    );
  }
  private money(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format((Number(value) || 0) / 100);
  }
  private date(value: string | null | undefined): string {
    if (!value) return "—";
    const parsed = new Date(String(value).slice(0, 10) + "T12:00:00");
    return Number.isNaN(parsed.valueOf())
      ? this.escape(value)
      : parsed.toLocaleDateString("pt-BR");
  }
  private options(
    rows: Array<{ id: string; label: string; sharePercent?: number }>,
    selected: string,
    label: (row: (typeof rows)[number]) => string,
  ): string {
    return rows
      .map(
        (row) =>
          `<option value="${this.escape(row.id)}"${row.id === selected ? " selected" : ""}>${this.escape(label(row))}</option>`,
      )
      .join("");
  }
  setData(data: RepasseOperations, reports: RepasseReport[]): void {
    this.state.next((previous) => ({
      ...previous,
      data,
      reports,
      status: "ready",
      error: null,
      message: null,
      saving: false,
      selectedSaleId: previous.selectedSaleId || data.sales[0]?.id || "",
    }));
  }
  setLoading(): void {
    this.state.next((previous) => ({
      ...previous,
      status: previous.data ? "ready" : "loading",
      error: null,
      message: null,
    }));
  }
  setError(message: string): void {
    this.state.next((previous) => ({
      ...previous,
      status: "error",
      error: message,
      saving: false,
    }));
  }
  setMessage(message: string): void {
    this.state.next((previous) => ({ ...previous, message, saving: false }));
  }
  snapshotData(): RepasseOperations | null {
    return this.snapshot.data;
  }
  private reportMap(): Map<string, RepasseReport> {
    return new Map(
      this.snapshot.reports.map((report) => [report.saleId, report]),
    );
  }
  private saleMarkup(
    sale: RepasseSale,
    report: RepasseReport | undefined,
    reasons: RepasseOperations["reasons"],
  ): string {
    const rule = sale.brokerRule,
      plan = sale.plan,
      base =
        Number(plan?.contractPriceCents) ||
        Math.round(Number(sale.tablePrice?.price || 0) * 100) ||
        Number(sale.valueCents) ||
        0;
    const status = !sale.tablePrice
      ? "Lote fora do quadro de preços"
      : !sale.broker
        ? "Venda sem corretor cadastrado"
        : report?.forecastStatus === "ready"
          ? "Projeção ativa"
          : report?.forecastStatus === "commission-rule-required"
            ? "Configure comissão do corretor/lote"
            : report?.forecastStatus === "payment-plan-required"
              ? "Configure o plano de pagamento"
              : report?.forecastStatus === "settled"
                ? "Contrato liquidado"
                : "Plano incompleto";
    const current = (report?.current || [])
      .map(
        (row) =>
          `<tr><td>${this.date(row.date)}</td><td>${this.escape(row.lotKey || "—")}</td><td>${this.escape(row.reasonLabel)}</td><td>${this.money(row.amountCents)}</td><td>${row.commissionCents === null ? "—" : this.money(row.commissionCents)}</td><td>${row.primaryCents === null ? "—" : `${this.money(row.primaryCents)} / ${this.money(row.partnerCents || 0)}`}</td><td><button type="button" data-repasse-edit-toggle="${this.escape(row.id)}">Editar</button> <button type="button" data-repasse-delete="${this.escape(row.id)}">Excluir</button></td></tr><tr hidden data-repasse-edit-row="${this.escape(row.id)}"><td colspan="7"><form data-repasse-edit-form data-entry-id="${this.escape(row.id)}"><input type="hidden" name="saleId" value="${this.escape(sale.id)}"><label>Data<input name="date" type="date" value="${this.escape(row.date)}" required></label><label>Razão<select name="repasseReasonId" required>${this.options(reasons, row.repasseReasonId, (item) => item.label)}</select></label><label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" value="${(Number(row.amountCents) / 100).toFixed(2)}" required></label><label>Descrição<input name="description" value="${this.escape(row.description || "")}"></label><footer><button type="button" data-repasse-edit-cancel="${this.escape(row.id)}">Cancelar</button><button class="atlas-primary" type="submit">Salvar entrada</button></footer></form></td></tr>`,
      )
      .join("");
    const future = (report?.future || [])
      .map((row) => this.forecastRow(row))
      .join("");
    return `<section class="atlas-card atlas-sale" data-repasse-sale="${this.escape(sale.id)}"><header><span class="atlas-eyebrow">VENDA · ${this.escape(sale.id)}</span><h2>${this.escape(sale.lot || "Lote não informado")} · ${this.escape(sale.client || "Cliente não informado")}</h2><p>Corretor: ${this.escape(sale.broker || "Não informado")} · ${this.escape(sale.status || "Sem status")} · ${this.escape(status)}</p></header>
      <div class="atlas-repasse-summary"><span>Preço do quadro<b>${sale.tablePrice ? this.money(Math.round(Number(sale.tablePrice.price) * 100)) : "sem correspondência"}</b><small>${sale.tablePrice ? `${this.escape(sale.tablePrice.area)} m² · Quadra ${this.escape(sale.tablePrice.quadra)}` : "Sem preço fictício"}</small></span><span>Valor de venda<b>${this.money(sale.valueCents)}</b><small>Cadastro comercial</small></span><span>Recebido<b>${this.money(report?.receivedCents || 0)}</b><small>Entradas persistidas</small></span><span>Saldo<b>${this.money(report?.remainingCents || 0)}</b><small>Base do plano menos entradas</small></span></div>
      ${
        sale.tablePrice && sale.broker
          ? `<div class="atlas-repasse-config"><form data-repasse-broker-form><input type="hidden" name="brokerName" value="${this.escape(sale.broker)}"><input type="hidden" name="lotKey" value="${this.escape(sale.lot)}"><h3 class="wide">Comissão · corretor + lote</h3><label>Percentual de comissão (%)<input name="commissionPercent" type="number" min="0" max="100" step="0.01" value="${rule ? this.escape(rule.commissionPercent) : ""}" placeholder="Configurar" required></label><p class="wide">A regra vale para o vínculo persistido entre corretor e lote.</p><footer><button class="atlas-primary" type="submit">Salvar comissão</button>${rule ? `<button type="button" data-repasse-rule-delete data-broker="${this.escape(rule.brokerName)}" data-lot="${this.escape(rule.lotKey)}">Remover regra</button>` : ""}</footer></form>
      <form data-repasse-plan-form><input type="hidden" name="saleId" value="${this.escape(sale.id)}"><h3 class="wide">Plano restante · juros e parcelas</h3><label>Preço contratual (R$)<input name="contractPrice" type="number" min="0.01" step="0.01" value="${base ? (base / 100).toFixed(2) : ""}" required></label><label>Juros anuais (%)<input name="annualInterestPercent" type="number" min="0" max="100" step="0.01" value="${plan?.annualInterestPercent ?? ""}" placeholder="Informar taxa" required></label><label>Parcelas mensais<input name="monthlyInstallments" type="number" min="0" max="600" step="1" value="${plan?.monthlyInstallments ?? 0}" required></label><label>Primeiro vencimento mensal<input name="monthlyFirstDueDate" type="date" value="${this.escape(plan?.monthlyFirstDueDate || "")}" ${Number(plan?.monthlyInstallments) ? "required" : ""}></label><label>Parcelas semestrais<input name="semiannualInstallments" type="number" min="0" max="100" step="1" value="${plan?.semiannualInstallments ?? 0}" required></label><label>Primeiro vencimento semestral<input name="semiannualFirstDueDate" type="date" value="${this.escape(plan?.semiannualFirstDueDate || "")}" ${Number(plan?.semiannualInstallments) ? "required" : ""}></label><label>Principal das semestrais (%)<input name="semiannualPrincipalPercent" type="number" min="0" max="100" step="0.01" value="${plan?.semiannualPrincipalPercent ?? (Number(plan?.monthlyInstallments) ? 0 : "")}" placeholder="Informar divisão" required></label><p class="wide">Taxa efetiva anual convertida em taxa mensal equivalente; juros sobre saldo anterior em cada vencimento.</p><footer><button class="atlas-primary" type="submit">Salvar plano e recalcular</button>${plan ? `<button type="button" data-repasse-plan-delete="${this.escape(sale.id)}">Remover plano</button>` : ""}</footer></form></div>`
          : `<p role="alert">Configuração bloqueada: venda sem preço no quadro oficial ou sem corretor.</p>`
      }
      <section><h3 class="atlas-section-title">Entradas e repasses atuais · divisão Warley / contraparte</h3><div class="atlas-table-wrap"><table><thead><tr><th>Data</th><th>Lote</th><th>Prioridade</th><th>Entrada</th><th>Comissão</th><th>Divisão</th><th>Ações</th></tr></thead><tbody>${current || '<tr><td colspan="7">Nenhuma entrada vinculada a esta venda.</td></tr>'}</tbody></table></div></section>
      <section><h3 class="atlas-section-title">Parcelas e repasses futuros · divisão Warley / contraparte</h3><div class="atlas-table-wrap"><table><thead><tr><th>Vencimento</th><th>Prioridade</th><th>Principal</th><th>Juros</th><th>Parcela</th><th>Comissão</th><th>Divisão</th></tr></thead><tbody>${future || `<tr><td colspan="7">${this.escape(status)}. Sem projeção enquanto faltarem configurações persistidas.</td></tr>`}</tbody></table></div></section></section>`;
  }
  private forecastRow(row: RepasseForecastRow): string {
    return `<tr><td>${this.date(row.date)}</td><td>${this.escape(row.reasonLabel)}</td><td>${this.money(row.principalCents)}</td><td>${this.money(row.interestCents)}</td><td><b>${this.money(row.amountCents)}</b></td><td>${row.commissionCents === null ? "—" : this.money(row.commissionCents)}</td><td>${row.primaryCents === null ? "—" : `${this.money(row.primaryCents)} / ${this.money(row.partnerCents || 0)}`}</td></tr>`;
  }
  private emitMutation(action: string, payload: Record<string, unknown>): void {
    if (this.snapshot.saving) return;
    this.state.next((previous) => ({
      ...previous,
      saving: true,
      message: "Salvando no serviço financeiro…",
      error: null,
    }));
    this.dispatchEvent(
      new CustomEvent("atlas:repasse-mutation", {
        bubbles: true,
        detail: { element: this, action, payload },
      }),
    );
  }
  connectedCallback(): void {
    this.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-repasse-refresh]")) {
        this.dispatchEvent(
          new CustomEvent("atlas:repasse-refresh", {
            bubbles: true,
            detail: { element: this },
          }),
        );
        return;
      }
      if (target.closest("[data-repasse-export]")) {
        this.dispatchEvent(
          new CustomEvent("atlas:repasse-export", {
            bubbles: true,
            detail: { element: this },
          }),
        );
        return;
      }
      const toggle = target.closest<HTMLElement>("[data-repasse-edit-toggle]");
      if (toggle) {
        const row = this.querySelector<HTMLElement>(
          `[data-repasse-edit-row="${CSS.escape(toggle.dataset.repasseEditToggle || "")}"]`,
        );
        if (row) row.hidden = !row.hidden;
        return;
      }
      const cancel = target.closest<HTMLElement>("[data-repasse-edit-cancel]");
      if (cancel) {
        const row = this.querySelector<HTMLElement>(
          `[data-repasse-edit-row="${CSS.escape(cancel.dataset.repasseEditCancel || "")}"]`,
        );
        if (row) row.hidden = true;
        return;
      }
      const entry = target.closest<HTMLElement>("[data-repasse-delete]");
      if (entry) {
        if (
          window.confirm(
            "Excluir esta entrada vinculada ao repasse? A remoção será aplicada ao banco de dados.",
          )
        )
          this.emitMutation("delete-entry", {
            id: entry.dataset.repasseDelete,
          });
        return;
      }
      const rule = target.closest<HTMLElement>("[data-repasse-rule-delete]");
      if (rule) {
        if (
          window.confirm(
            "Remover esta regra de comissão do corretor e lote? A remoção será aplicada ao banco de dados.",
          )
        )
          this.emitMutation("delete-rule", {
            brokerName: rule.dataset.broker,
            lotKey: rule.dataset.lot,
          });
        return;
      }
      const plan = target.closest<HTMLElement>("[data-repasse-plan-delete]");
      if (plan) {
        if (
          window.confirm(
            "Remover o plano e interromper a projeção futura? A remoção será aplicada ao banco de dados.",
          )
        )
          this.emitMutation("delete-plan", {
            saleId: plan.dataset.repassePlanDelete,
          });
      }
    });
    this.addEventListener("change", (event) => {
      const target = event.target;
      if (
        !(target instanceof HTMLSelectElement) ||
        target.name !== "saleId" ||
        !target.closest("[data-repasse-entry-form]")
      )
        return;
      this.state.next((previous) => ({
        ...previous,
        selectedSaleId: target.value,
      }));
    });
    this.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const saleId = String(
        values.saleId || this.snapshot.selectedSaleId || "",
      );
      const sale = this.snapshot.data?.sales.find((row) => row.id === saleId);
      if (!sale) return;
      if (form.matches("[data-repasse-entry-form],[data-repasse-edit-form]")) {
        this.emitMutation(
          form.matches("[data-repasse-edit-form]")
            ? "update-entry"
            : "create-entry",
          {
            ...(form.dataset.entryId ? { id: form.dataset.entryId } : {}),
            saleId: sale.id,
            lotKey: sale.lot,
            brokerName: sale.broker,
            repasseReasonId: String(values.repasseReasonId),
            amountCents: Math.round(Number(values.amount) * 100),
            date: String(values.date),
            description: String(values.description || ""),
            fiscalStatus: "pendente",
          },
        );
        return;
      }
      if (form.matches("[data-repasse-broker-form]")) {
        this.emitMutation("save-rule", {
          brokerName: String(values.brokerName),
          lotKey: String(values.lotKey),
          commissionPercent: Number(values.commissionPercent),
        });
        return;
      }
      if (form.matches("[data-repasse-plan-form]"))
        this.emitMutation("save-plan", {
          saleId: sale.id,
          contractPriceCents: Math.round(Number(values.contractPrice) * 100),
          annualInterestPercent: Number(values.annualInterestPercent),
          monthlyInstallments: Number(values.monthlyInstallments),
          monthlyFirstDueDate: String(values.monthlyFirstDueDate || ""),
          semiannualInstallments: Number(values.semiannualInstallments),
          semiannualFirstDueDate: String(values.semiannualFirstDueDate || ""),
          semiannualPrincipalPercent: Number(values.semiannualPrincipalPercent),
        });
    });
    this.render();
    this.dispatchEvent(
      new CustomEvent("atlas:repasse-connected", {
        bubbles: true,
        detail: { element: this },
      }),
    );
  }
  render(): void {
    if (this.snapshot.status === "loading" && !this.snapshot.data) {
      this.innerHTML = `<section class="atlas-repasse-page">${repasseStyles}<h1>Repasses</h1><p>Carregando operações financeiras persistidas…</p></section>`;
      return;
    }
    const data = this.snapshot.data;
    if (!data) {
      this.innerHTML = `<section class="atlas-repasse-page">${repasseStyles}<h1>Repasses</h1><p class="atlas-status" role="alert">${this.escape(this.snapshot.error || "Dados indisponíveis.")}</p><button data-repasse-refresh>Atualizar</button></section>`;
      return;
    }
    const reports = this.reportMap(),
      current = data.sales.flatMap(
        (sale) => reports.get(sale.id)?.current || [],
      ),
      future = data.sales.flatMap((sale) => reports.get(sale.id)?.future || []);
    const unconfiguredCurrent = current.filter(
        (row) => row.commissionCents === null,
      ).length,
      unconfiguredFuture = data.sales.filter((sale) => {
        const report = reports.get(sale.id);
        return Boolean(
          report &&
          report.remainingCents > 0 &&
          report.forecastStatus !== "ready" &&
          report.forecastStatus !== "settled",
        );
      }).length,
      unpriced = data.sales.filter((sale) => !sale.tablePrice).length;
    const actual = current.reduce(
        (sum, row) => sum + (row.commissionCents || 0),
        0,
      ),
      projected = future.reduce(
        (sum, row) => sum + (row.commissionCents || 0),
        0,
      ),
      balance = data.sales.reduce(
        (sum, sale) => sum + (reports.get(sale.id)?.remainingCents || 0),
        0,
      );
    const registerable = data.sales.filter(
        (sale) => sale.tablePrice && sale.broker,
      ),
      selected =
        registerable.find((sale) => sale.id === this.snapshot.selectedSaleId) ||
        registerable[0];
    this.innerHTML = `<section class="atlas-repasse-page">${repasseStyles}<header class="atlas-repasse-head"><div><span class="atlas-eyebrow">COMERCIAL · CAIXA · COMISSÕES</span><h1>Repasses</h1><p>Entradas por venda, regras de corretor e lote, planos de pagamento e projeções de repasse.</p></div><div class="atlas-page-actions"><button data-repasse-export${this.snapshot.status !== "ready" ? " disabled" : ""}>Exportar CSV</button><button data-repasse-refresh>Atualizar</button></div></header>
      <p class="atlas-status" role="status" aria-live="polite">${this.escape(this.snapshot.message || `${data.sales.length} vendas · ${data.entries.length} entradas persistidas · ${data.brokerRules.length} regras de comissão.`)}${this.snapshot.error ? ` <span role="alert">${this.escape(this.snapshot.error)}</span>` : ""}</p>
      <section class="atlas-metrics"><article><small>Comissão sobre entradas recebidas</small><strong>${unconfiguredCurrent ? "—" : this.money(actual)}</strong><span>${unconfiguredCurrent ? `${unconfiguredCurrent} entradas sem regra configurada` : "Calculada pelas regras persistidas"}</span></article><article><small>Comissão projetada</small><strong>${unconfiguredFuture ? "—" : this.money(projected)}</strong><span>${unconfiguredFuture ? `${unconfiguredFuture} venda(s) sem regra ou plano completo` : "Parcelas futuras configuradas"}</span></article><article><small>Saldo contratual projetado</small><strong>${unpriced ? "—" : this.money(balance)}</strong><span>${unpriced ? `${unpriced} lote(s) fora do quadro oficial` : "Preço-base menos entradas persistidas"}</span></article></section>
      <section class="atlas-card"><header><div><span class="atlas-eyebrow">LANÇAMENTO · CAIXA + REPASSE</span><h2>Registrar entrada</h2><p>Vincule o recebimento à venda, ao lote e ao corretor; a ordem de prioridade segue Sinal → Intermediária → Mensal.</p></div></header>${
        selected
          ? `<form data-repasse-entry-form><label>Venda<select name="saleId" required>${this.options(
              registerable.map((sale) => ({
                id: sale.id,
                label: `${sale.lot || "Lote"} · ${sale.client || "Cliente"} · ${sale.broker || "Sem corretor"}`,
              })),
              selected.id,
              (row) => row.label,
            )}</select></label><label>Lote<input value="${this.escape(selected.lot)}" readonly></label><label>Corretor<input value="${this.escape(selected.broker)}" readonly></label><label>Razão do recebimento<select name="repasseReasonId" required>${this.options(
              data.reasons
                .filter((reason) => reason.active)
                .sort(
                  (a, b) =>
                    (({ signal: 0, intermediate: 1, monthly: 2 })[a.id] ?? 9) -
                    ({ signal: 0, intermediate: 1, monthly: 2 }[b.id] ?? 9),
                ),
              "signal",
              (reason) => `${reason.label} · ${reason.sharePercent}%`,
            )}</select></label><label>Valor recebido (R$)<input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></label><label>Data de recebimento<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label><label class="wide">Descrição<input name="description" maxlength="500" placeholder="Referência do recebimento"></label><footer><button class="atlas-primary" type="submit"${this.snapshot.saving ? " disabled" : ""}>Registrar entrada e repasse</button></footer></form>`
          : `<div><h3>Nenhuma venda vinculável ao quadro de preços</h3><p>É necessário um cadastro comercial persistido, preço oficial de lote e corretor.</p></div>`
      }</section>
      ${data.sales.map((sale) => this.saleMarkup(sale, reports.get(sale.id), data.reasons)).join("")}
      <p class="atlas-source-note">Vendas, tabela de preços, entradas, regras e planos vêm dos serviços persistidos. Projeções futuras não são lançamentos de caixa.</p></section>`;
  }
}
if (!customElements.get("atlas-repasses"))
  customElements.define("atlas-repasses", AtlasRepasses);

const brokerDirectoryStyles = `<style>
  .atlas-brokers-page{display:grid;gap:18px;color:#20283a}.atlas-brokers-page *{box-sizing:border-box}
  .atlas-brokers-page header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.atlas-brokers-page h1{margin:0 0 6px;color:#18243e;font-size:30px}.atlas-brokers-page h2{margin:0;color:#18243e;font-size:19px}.atlas-brokers-page p{margin:0;color:#65748a;font-size:13px;line-height:1.5}
  .atlas-brokers-page .atlas-eyebrow{display:block;margin-bottom:7px;color:#3975d5;font:600 10px ui-monospace,monospace;letter-spacing:.08em}.atlas-brokers-page .atlas-page-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-brokers-page button{min-height:38px;padding:8px 13px;border:1px solid #d5dce7;border-radius:9px;background:#fff;color:#20283a;font:600 13px inherit;cursor:pointer}.atlas-brokers-page button:hover{border-color:#3975d5}.atlas-brokers-page button:disabled{opacity:.55;cursor:wait}.atlas-brokers-page .atlas-primary{background:#252634;color:#fff;border-color:#252634}
  .atlas-brokers-page .atlas-status{padding:10px 13px;border:1px solid #e1e6ee;border-radius:10px;background:#f7f9fc;color:#5e6d83;font-size:12px}.atlas-brokers-page [role=alert]{color:#a72d3b}.atlas-brokers-page .atlas-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) auto;align-items:end;gap:14px;padding:16px;border:1px solid #e0e5ed;border-radius:14px;background:#fff}.atlas-brokers-page label{display:grid;gap:6px;color:#56657a;font-size:12px}.atlas-brokers-page input,.atlas-brokers-page textarea{width:100%;min-height:40px;padding:9px 11px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e;font:inherit}.atlas-brokers-page textarea{min-height:100px;resize:vertical}.atlas-brokers-page [data-broker-profile-form] .atlas-profile-metrics{align-items:start}.atlas-brokers-page [data-broker-profile-form] footer{display:flex;justify-content:flex-end;gap:8px}
  .atlas-brokers-page .atlas-broker-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.atlas-brokers-page .atlas-card{display:grid;gap:15px;padding:18px;border:1px solid #e0e5ed;border-radius:16px;background:#fff;box-shadow:0 4px 16px rgba(24,34,54,.035)}.atlas-brokers-page .atlas-profile-head{display:flex;align-items:center;gap:12px}.atlas-brokers-page .atlas-avatar{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border-radius:12px;background:#edf3ff;color:#2458a8;font-weight:700}.atlas-brokers-page .atlas-profile-head h2{font-size:17px}.atlas-brokers-page .atlas-profile-head p{margin-top:3px}.atlas-brokers-page .atlas-profile-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.atlas-brokers-page .atlas-profile-metrics span{display:grid;gap:5px;padding:10px;border-radius:10px;background:#f6f8fb;color:#68778c;font-size:11px}.atlas-brokers-page .atlas-profile-metrics b{color:#18243e;font-size:15px}.atlas-brokers-page .atlas-muted{color:#758197;font-size:11px}.atlas-brokers-page .atlas-card footer{display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid #e8ecf2}.atlas-brokers-page .atlas-detail{display:grid;gap:16px}.atlas-brokers-page .atlas-detail-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.atlas-brokers-page .atlas-detail-summary article{display:grid;gap:6px;padding:14px;border:1px solid #e0e5ed;border-radius:13px;background:#fff}.atlas-brokers-page .atlas-detail-summary small{color:#68778c}.atlas-brokers-page .atlas-detail-summary b{color:#18243e;font-size:18px}.atlas-brokers-page .atlas-table-wrap{overflow:auto;border:1px solid #e4e8ef;border-radius:10px;background:#fff}.atlas-brokers-page table{width:100%;min-width:760px;border-collapse:collapse}.atlas-brokers-page th,.atlas-brokers-page td{padding:10px;border-bottom:1px solid #e9edf3;text-align:left;vertical-align:top;font-size:12px}.atlas-brokers-page th{background:#f7f9fc;color:#66748a;font-size:10px;text-transform:uppercase}.atlas-brokers-page tr:last-child td{border-bottom:0}.atlas-brokers-page .atlas-file{display:block;border:0;background:none;color:#2557aa;text-decoration:underline;text-align:left;padding:2px 0;font:inherit;cursor:pointer}
  @media(max-width:900px){.atlas-brokers-page .atlas-broker-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.atlas-brokers-page .atlas-detail-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:620px){.atlas-brokers-page h1{font-size:24px}.atlas-brokers-page header{display:grid}.atlas-brokers-page .atlas-toolbar{grid-template-columns:1fr}.atlas-brokers-page .atlas-broker-grid{grid-template-columns:1fr}.atlas-brokers-page .atlas-detail-summary{grid-template-columns:1fr 1fr}.atlas-brokers-page .atlas-page-actions button{flex:1}}
</style>`;

type BrokersState = {
  data: RepasseOperations | null;
  reports: RepasseReport[];
  profileRecords: BrokerProfile[];
  query: string;
  selectedBroker: string;
  editingProfile: boolean;
  savingProfile: boolean;
  status: "loading" | "ready" | "error";
  error: string | null;
  message: string | null;
};
type BrokersSetter = (previous: BrokersState) => BrokersState;

/** Diretório e perfil de corretor são uma leitura derivada exclusivamente dos registros persistidos. */
export class AtlasBrokers extends HTMLElement {
  private readonly state: AtomicState<BrokersState>;
  private snapshot: BrokersState;
  constructor() {
    super();
    const initial: BrokersState = {
      data: null,
      reports: [],
      profileRecords: [],
      query: "",
      selectedBroker: "",
      editingProfile: false,
      savingProfile: false,
      status: "loading",
      error: null,
      message: null,
    };
    function* state(
      value: BrokersState,
    ): Generator<BrokersState, never, BrokersSetter> {
      while (true) value = (yield value)(value);
    }
    this.snapshot = initial;
    const iterator = state(initial);
    iterator.next();
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; this.render(); return this.snapshot; } };
  }
  private escape(value: unknown): string {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char] || char,
    );
  }
  private money(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format((Number(value) || 0) / 100);
  }
  setData(data: RepasseOperations, reports: RepasseReport[], profileRecords: BrokerProfile[]): void {
    this.state.next((previous) => ({
      ...previous,
      data,
      reports,
      profileRecords,
      status: "ready",
      error: null,
      savingProfile: false,
      editingProfile: false,
      selectedBroker:
        previous.selectedBroker || this.dataset.selectedBroker || "",
    }));
  }
  setLoading(): void {
    this.state.next((previous) => ({
      ...previous,
      status: "loading",
      error: null,
    }));
  }
  setError(message: string): void {
    this.state.next((previous) => ({
      ...previous,
      status: "error",
      error: message,
    }));
  }
  setMessage(message: string | null): void {
    this.state.next((previous) => ({ ...previous, message }));
  }
  setProfileSaveState(saving: boolean, message: string | null = null): void {
    this.state.next((previous) => ({ ...previous, savingProfile: saving, error: message, message: null }));
  }
  snapshotData(): RepasseOperations | null {
    return this.snapshot.data;
  }
  profiles() {
    const data = this.snapshot.data;
    if (!data) return [];
    const groups = new Map<string, RepasseSale[]>();
    for (const sale of data.sales) {
      const name = String(sale.broker || "").trim();
      if (!name) continue;
      const key = name.replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
      groups.set(key, [...(groups.get(key) || []), sale]);
    }
    return [...groups.entries()]
      .map(([id, sales]) => ({
        id,
        name: String(sales[0].broker).trim(),
        sales,
        lots: [...new Set(sales.map((sale) => sale.lot).filter(Boolean))],
        valueCents: sales.reduce(
          (sum, sale) => sum + (Number(sale.valueCents) || 0),
          0,
        ),
        receivedCents: sales.reduce(
          (sum, sale) =>
            sum +
            (sale.receipts || []).reduce(
              (total, entry) => total + Number(entry.amountCents || 0),
              0,
            ),
          0,
        ),
        report: this.snapshot.reports.filter((report) =>
          sales.some((sale) => sale.id === report.saleId),
        ),
        record: this.snapshot.profileRecords.find((profile) => profile.id === id) || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }
  private render(): void {
    const state = this.snapshot;
    const profiles = this.profiles();
    const selected =
      profiles.find((profile) => profile.id === state.selectedBroker) || null;
    const query = state.query.trim().toLocaleLowerCase("pt-BR");
    const visible = profiles.filter((profile) =>
      `${profile.name} ${profile.lots.join(" ")}`
        .toLocaleLowerCase("pt-BR")
        .includes(query),
    );
    if (state.status === "loading" && !state.data) {
      this.innerHTML = `<section class="atlas-brokers-page">${brokerDirectoryStyles}<h1>Perfis de corretores</h1><p>Carregando vendas e repasses persistidos…</p></section>`;
      return;
    }
    if (state.status === "error" && !state.data) {
      this.innerHTML = `<section class="atlas-brokers-page">${brokerDirectoryStyles}<h1>Perfis de corretores</h1><p class="atlas-status" role="alert">${this.escape(state.error || "Não foi possível carregar os perfis.")}</p><button data-brokers-refresh>Atualizar</button></section>`;
      return;
    }
    const status = `${profiles.length} perfis associados a vendas persistidas · cadastros profissionais mantidos no banco operacional.`;
    this.innerHTML = `<section class="atlas-brokers-page">${brokerDirectoryStyles}<header><div><span class="atlas-eyebrow">CADASTRO COMERCIAL · PERFIS</span><h1>${selected ? "Perfil do corretor" : "Perfis de corretores"}</h1><p>${selected ? "Vendas, lotes, recebimentos e documentos associados a este nome nos registros comerciais." : "Perfis derivados dos nomes de corretor registrados nas vendas; dados cadastrais ausentes permanecem explicitamente sem informação."}</p></div><div class="atlas-page-actions">${selected ? "<button data-broker-back>Voltar aos perfis</button>" : ""}<button data-brokers-export${!profiles.length ? " disabled" : ""}>Exportar perfis</button><button data-brokers-refresh>Atualizar</button></div></header><p class="atlas-status" role="status" aria-live="polite">${this.escape(state.message || status)}${state.error ? ` <span role="alert">${this.escape(state.error)}</span>` : ""}</p>${
      selected
        ? this.detail(selected)
        : `<div class="atlas-toolbar"><label>Buscar perfil<input type="search" data-broker-search value="${this.escape(state.query)}" placeholder="Nome do corretor ou lote"></label><span class="atlas-muted">${visible.length} de ${profiles.length} perfis</span></div><div class="atlas-broker-grid">${
            visible
              .map(
                (profile) =>
                  `<article class="atlas-card"><header class="atlas-profile-head"><span class="atlas-avatar" aria-hidden="true">${this.escape(
                    profile.name
                      .split(/\s+/)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase(),
                  )}</span><div><h2>${this.escape(profile.name)}</h2><p>${this.escape(profile.record?.creci || "CRECI não registrado")}</p></div></header><div class="atlas-profile-metrics"><span>Vendas<b>${profile.sales.length}</b></span><span>Valor registrado<b>${this.money(profile.valueCents)}</b></span><span>Recebido<b>${this.money(profile.receivedCents)}</b></span></div><p class="atlas-muted">Lotes: ${this.escape(profile.lots.join(" · ") || "Não informados")} · ${this.escape(profile.record?.phone || "contato não registrado")}</p><footer><button data-broker-open="${this.escape(profile.id)}">Abrir perfil</button></footer></article>`,
              )
              .join("") ||
            '<p class="atlas-card">Nenhum corretor associado às vendas persistidas.</p>'
          }</div>`
    }</section>`;
  }
  private detail(
    profile: ReturnType<AtlasBrokers["profiles"]>[number],
  ): string {
    const reports = new Map(
      profile.report.map((report) => [report.saleId, report]),
    );
    const sales = profile.sales
      .map((sale) => {
        const report = reports.get(sale.id),
          files = sale.files || [];
        return `<tr><td><b>${this.escape(sale.id)}</b><small>${this.escape(sale.createdAt || "Data não informada")}</small></td><td>${this.escape(sale.lot || "Lote não informado")}<small>${this.escape(sale.tablePrice?.quadra || "Quadra não informada")}</small></td><td>${this.escape(sale.client || "Cliente não informado")}</td><td>${this.money(Number(sale.valueCents) || 0)}</td><td>${this.money(report?.receivedCents || 0)}</td><td>${this.escape(sale.status || "Status não informado")}</td><td>${files.map((file) => `<button class="atlas-file" data-broker-file="${this.escape(file.fileUrl)}" data-broker-file-name="${this.escape(file.fileName)}">${this.escape(file.fileName)}</button>`).join("") || "Nenhum"}</td></tr>`;
      })
      .join("");
    return `<section class="atlas-detail"><div class="atlas-card"><header class="atlas-profile-head"><span class="atlas-avatar" aria-hidden="true">${this.escape(
      profile.name
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    )}</span><div><span class="atlas-eyebrow">PERFIL COMERCIAL · DADOS PERSISTIDOS</span><h2>${this.escape(profile.name)}</h2><p>${this.escape(profile.record?.creci || "CRECI não registrado")}</p></div></header><div class="atlas-detail-summary"><article><small>Vendas vinculadas</small><b>${profile.sales.length}</b></article><article><small>Valor registrado</small><b>${this.money(profile.valueCents)}</b></article><article><small>Entradas recebidas</small><b>${this.money(profile.receivedCents)}</b></article><article><small>Lotes</small><b>${profile.lots.length}</b></article></div><p>Lotes: ${this.escape(profile.lots.join(" · ") || "Não informados")}</p></div>${this.profileEditor(profile)}<section class="atlas-card"><header><div><span class="atlas-eyebrow">CARTEIRA · REGISTROS COMERCIAIS</span><h2>Vendas e documentos</h2></div><span class="atlas-muted">${profile.sales.length} registros persistidos</span></header><div class="atlas-table-wrap"><table><thead><tr><th>Venda / data</th><th>Lote / quadra</th><th>Cliente</th><th>Valor registrado</th><th>Entradas</th><th>Situação</th><th>Documentos</th></tr></thead><tbody>${sales || '<tr><td colspan="7">Nenhuma venda associada.</td></tr>'}</tbody></table></div></section></section>`;
  }
  private profileEditor(profile: ReturnType<AtlasBrokers["profiles"]>[number]): string {
    const record=profile.record, state=this.snapshot;
    if(!state.editingProfile)return `<section class="atlas-card"><header><div><span class="atlas-eyebrow">CADASTRO PROFISSIONAL</span><h2>Contato e identificação</h2></div><button type="button" data-broker-profile-edit>Editar cadastro</button></header><div class="atlas-detail-summary"><article><small>CRECI</small><b>${this.escape(record?.creci||"Não registrado")}</b></article><article><small>Telefone</small><b>${this.escape(record?.phone||"Não registrado")}</b></article><article><small>E-mail</small><b>${this.escape(record?.email||"Não registrado")}</b></article><article><small>Atualizado</small><b>${this.escape(record?.updatedAt||"Sem cadastro")}</b></article></div>${record?.notes?`<p>${this.escape(record.notes)}</p>`:""}${record?'<footer><button type="button" data-broker-profile-delete>Excluir cadastro profissional</button></footer>':""}</section>`;
    return `<form class="atlas-card" data-broker-profile-form><header><div><span class="atlas-eyebrow">CADASTRO PROFISSIONAL</span><h2>${record?"Editar cadastro":"Cadastrar contato profissional"}</h2></div></header><div class="atlas-profile-metrics"><label>CRECI<input name="creci" maxlength="80" value="${this.escape(record?.creci||"")}"></label><label>Telefone<input name="phone" maxlength="40" autocomplete="tel" value="${this.escape(record?.phone||"")}"></label><label>E-mail<input name="email" type="email" maxlength="254" autocomplete="email" value="${this.escape(record?.email||"")}"></label></div><label>Observações<textarea name="notes" maxlength="4000">${this.escape(record?.notes||"")}</textarea></label><footer><button type="button" data-broker-profile-cancel>Cancelar</button><button class="atlas-primary" type="submit"${state.savingProfile?" disabled":""}>${state.savingProfile?"Salvando…":"Salvar cadastro"}</button></footer>${state.error?`<p role="alert">${this.escape(state.error)}</p>`:""}</form>`;
  }
  connectedCallback(): void {
    this.addEventListener("input", (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.matches("[data-broker-search]")
      ) {
        const cursor = target.selectionStart;
        this.state.next((previous) => ({ ...previous, query: target.value }));
        const replacement = this.querySelector<HTMLInputElement>(
          "[data-broker-search]",
        );
        replacement?.focus();
        if (cursor !== null) replacement?.setSelectionRange(cursor, cursor);
      }
    });
    this.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-brokers-refresh]")) {
        this.dispatchEvent(
          new CustomEvent("atlas:brokers-refresh", {
            bubbles: true,
            detail: { element: this },
          }),
        );
        return;
      }
      const open = target.closest<HTMLElement>("[data-broker-open]");
      if (open) {
        this.dispatchEvent(
          new CustomEvent("atlas:navigate", {
            bubbles: true,
            detail: { view: "broker-detail", id: open.dataset.brokerOpen },
          }),
        );
        return;
      }
      if (target.closest("[data-broker-back]")) {
        this.dispatchEvent(
          new CustomEvent("atlas:navigate", {
            bubbles: true,
            detail: { view: "brokers" },
          }),
        );
        return;
      }
      if (target.closest("[data-brokers-export]")) {
        this.dispatchEvent(
          new CustomEvent("atlas:brokers-export", {
            bubbles: true,
            detail: { element: this },
          }),
        );
        return;
      }
      if (target.closest("[data-broker-profile-edit]")) {
        this.state.next(previous=>({...previous,editingProfile:true,error:null}));
        return;
      }
      if (target.closest("[data-broker-profile-cancel]")) {
        this.state.next(previous=>({...previous,editingProfile:false,error:null}));
        return;
      }
      if (target.closest("[data-broker-profile-delete]")) {
        const selected=this.profiles().find(profile=>profile.id===this.snapshot.selectedBroker);
        if(selected&&window.confirm(`Excluir o cadastro profissional de ${selected.name}? As vendas não serão alteradas.`))
          this.dispatchEvent(new CustomEvent("atlas:broker-profile-delete",{bubbles:true,detail:{element:this,name:selected.name}}));
        return;
      }
      const file = target.closest<HTMLElement>("[data-broker-file]");
      if (file)
        this.dispatchEvent(
          new CustomEvent("atlas:brokers-file", {
            bubbles: true,
            detail: {
              element: this,
              fileUrl: file.dataset.brokerFile,
              fileName: file.dataset.brokerFileName,
            },
          }),
        );
    });
    this.addEventListener("submit",event=>{
      const form=event.target;
      if(!(form instanceof HTMLFormElement)||!form.matches("[data-broker-profile-form]"))return;
      event.preventDefault();
      const selected=this.profiles().find(profile=>profile.id===this.snapshot.selectedBroker);
      if(!selected||this.snapshot.savingProfile)return;
      const data=new FormData(form);
      this.setProfileSaveState(true);
      this.dispatchEvent(new CustomEvent("atlas:broker-profile-save",{bubbles:true,detail:{element:this,name:selected.name,profile:{creci:String(data.get("creci")||"").trim(),phone:String(data.get("phone")||"").trim(),email:String(data.get("email")||"").trim(),notes:String(data.get("notes")||"").trim()}}}));
    });
    this.render();
    this.dispatchEvent(
      new CustomEvent("atlas:brokers-connected", {
        bubbles: true,
        detail: { element: this },
      }),
    );
  }
}
if (!customElements.get("atlas-brokers"))
  customElements.define("atlas-brokers", AtlasBrokers);

type MaterialsState = {
  materials: OperationalMaterial[];
  stages: OperationalStage[];
  columns: MaterialCustomColumn[];
  agenda: OperationalAgendaEvent[];
  query: string;
  page: number;
  pageTab: "canvas" | "list";
  activeStage: number | "inventory";
  statusFilter: string;
  hiddenColumns: string[];
  editing: OperationalMaterial | null | false;
  transition: OperationalMaterial | null;
  transitionHistory: Array<Record<string, unknown>>;
  transitionAttachments: Array<Record<string, unknown>>;
  status: "loading" | "ready" | "error";
  error: string | null;
  saving: boolean;
};
type MaterialsSetter = (previous: MaterialsState) => MaterialsState;
const materialsStyles = `<style>
  .atlas-materials{display:grid;gap:18px;color:#202638}.atlas-materials *{box-sizing:border-box}.atlas-materials header,.atlas-materials .atlas-material-toolbar,.atlas-materials footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.atlas-materials>header{flex-wrap:wrap;padding-right:170px}.atlas-materials header h1{margin:5px 0;font-size:28px}.atlas-materials header p,.atlas-materials .atlas-muted{margin:0;color:#718096;font-size:13px}.atlas-materials .atlas-eyebrow{color:#3876db;font-size:10px;font-weight:800;letter-spacing:.1em}.atlas-materials button{min-height:38px;padding:8px 13px;border:1px solid #d9e0e9;border-radius:9px;background:#fff;color:#253049;font:inherit;cursor:pointer}.atlas-materials button:hover{border-color:#4c7ed8}.atlas-materials .atlas-primary{background:#252634;border-color:#252634;color:#fff}.atlas-materials .atlas-stage-tabs,.atlas-materials .atlas-view-tabs{display:flex;gap:7px;overflow:auto;padding:2px 0}.atlas-materials .atlas-stage-tabs button[aria-selected=true],.atlas-materials .atlas-view-tabs button[aria-pressed=true]{background:#252634;border-color:#252634;color:#fff}.atlas-materials .atlas-stage-tabs small{margin-left:7px;opacity:.7}.atlas-materials .atlas-material-toolbar{justify-content:flex-start;flex-wrap:wrap;padding:14px;border:1px solid #e1e6ed;border-radius:13px;background:#f7f9fc}.atlas-materials label{display:grid;gap:6px;color:#59667a;font-size:12px}.atlas-materials input,.atlas-materials select,.atlas-materials textarea{width:100%;min-height:40px;padding:9px 11px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e;font:inherit}.atlas-materials .atlas-material-toolbar label{flex:1;min-width:210px}.atlas-materials .atlas-material-card,.atlas-materials .atlas-material-form{border:1px solid #e1e6ed;border-radius:14px;background:#fff;overflow:hidden}.atlas-materials .atlas-material-form{padding:18px}.atlas-materials .atlas-material-form h2,.atlas-materials .atlas-material-card h2{margin:0;font-size:18px}.atlas-materials .atlas-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0}.atlas-materials .atlas-wide{grid-column:1/-1}.atlas-materials textarea{min-height:74px;resize:vertical}.atlas-materials .atlas-table-scroll{overflow:auto}.atlas-materials table{width:100%;min-width:780px;border-collapse:collapse}.atlas-materials th,.atlas-materials td{padding:11px 13px;border-bottom:1px solid #edf0f4;text-align:left;vertical-align:top;font-size:12px}.atlas-materials th{background:#f7f9fc;color:#69768b;font-size:10px;letter-spacing:.06em;text-transform:uppercase}.atlas-materials td small{display:block;color:#7b8798}.atlas-materials .atlas-empty{padding:24px;text-align:center;color:#758197}.atlas-materials [role=alert]{color:#a52c3c}.atlas-materials .atlas-stage-heading{padding:15px;border-bottom:1px solid #e7ebf1}.atlas-materials .atlas-actions{display:flex;gap:7px}.atlas-materials .atlas-canvas{position:relative;display:grid;grid-template-columns:minmax(220px,.75fr) minmax(380px,1.25fr);gap:18px;padding:16px;min-height:360px}.atlas-materials .atlas-canvas-links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}.atlas-materials .atlas-canvas-links path{fill:none;stroke:#7aa7f8;stroke-width:2;opacity:.6}.atlas-materials .atlas-canvas-column{position:relative;z-index:1;display:grid;align-content:start;gap:10px;min-width:0}.atlas-materials .atlas-canvas-stage,.atlas-materials .atlas-link-card{padding:12px;border:1px solid #e2e7ee;border-radius:11px;background:#fff}.atlas-materials .atlas-canvas-stage h3{margin:3px 0;font-size:15px}.atlas-materials .atlas-link-card{display:flex;align-items:center;justify-content:space-between;gap:8px}.atlas-materials .atlas-link-card[draggable=true]{cursor:grab}.atlas-materials .atlas-linked{border-color:#a9c4f5;background:#f7faff}.atlas-materials .atlas-canvas-stage[data-drop-active=true]{outline:2px solid #3c77d5}.atlas-materials .atlas-transition{position:fixed;inset:0;z-index:1000;width:min(850px,calc(100vw - 28px));max-height:90vh;margin:auto;padding:0;border:1px solid #dce2ea;border-radius:16px;box-shadow:0 24px 90px #1118}.atlas-materials .atlas-transition::backdrop{background:#10182788}.atlas-materials .atlas-transition>div{padding:20px}.atlas-materials .atlas-transition-history{max-height:220px;overflow:auto}.atlas-materials .atlas-sheet-controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px}.atlas-materials [data-sheet-cell]{border:0;background:none;text-align:left;padding:0;min-height:24px}.atlas-materials [data-sheet-cell][aria-selected=true]{outline:2px solid #4380ed}@media(max-width:720px){.atlas-materials>header{padding-right:0}.atlas-materials header{align-items:flex-start;flex-direction:column}.atlas-materials .atlas-fields{grid-template-columns:1fr 1fr}.atlas-materials .atlas-wide{grid-column:1/-1}.atlas-materials .atlas-canvas{grid-template-columns:1fr}}
  .atlas-materials .atlas-link-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;min-width:0}
  .atlas-materials .atlas-link-card>div:first-child{min-width:0}
  .atlas-materials .atlas-link-card .atlas-eyebrow,.atlas-materials .atlas-link-card b,.atlas-materials .atlas-link-card small{display:block;overflow-wrap:anywhere}
  .atlas-materials .atlas-link-card b{margin:4px 0;color:#202638}
  .atlas-materials .atlas-link-card small{color:#748095}
  .atlas-materials .atlas-link-card .atlas-actions{justify-content:flex-end;flex-wrap:wrap}
  @media(max-width:720px){.atlas-materials .atlas-link-card{grid-template-columns:minmax(0,1fr)}.atlas-materials .atlas-link-card .atlas-actions{justify-content:flex-start}}
</style>`;

/** Catálogo persistido; estados e controles transitórios pertencem ao Web Element. */
export class AtlasMaterials extends HTMLElement {
  private readonly state: AtomicState<MaterialsState>;
  private snapshot: MaterialsState;
  constructor() {
    super();
    const initial: MaterialsState = { materials: [], stages: [], columns: [], agenda: [], query: "", page: 1, pageTab: "canvas", activeStage: "inventory", statusFilter: "all", hiddenColumns: [], editing: false, transition: null, transitionHistory: [], transitionAttachments: [], status: "loading", error: null, saving: false };
    function* state(value: MaterialsState): Generator<MaterialsState, never, MaterialsSetter> { while (true) value = (yield value)(value); }
    this.snapshot = initial; const iterator=state(initial); iterator.next(); this.state={next:setter=>{this.snapshot=iterator.next(setter).value;this.renderSafely();return this.snapshot;}};
  }
  private renderSafely():void{try{this.render();}catch(error){console.error("Falha ao renderizar materiais Atlas",error);this.textContent=`Falha ao renderizar Materiais: ${error instanceof Error?error.message:String(error)}`;}}
  private escape(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char] || char)); }
  setData(materials: OperationalMaterial[], stages: OperationalStage[], columns: MaterialCustomColumn[] = [], agenda: OperationalAgendaEvent[] = []): void { this.state.next(s => ({...s, materials, stages, columns, agenda, status:"ready", error:null, saving:false})); }
  getMaterial(id:string):OperationalMaterial|undefined{return this.snapshot.materials.find(item=>item.id===id);}
  isDraftMaterial(id:string):boolean{return !this.snapshot.materials.some(item=>item.id===id);}
  closeTransition():void{this.state.next(s=>({...s,transition:null,transitionHistory:[],transitionAttachments:[],saving:false,error:null}));}
  setError(message: string): void { this.state.next(s => ({...s,status:"error",error:message,saving:false})); }
  setTransitionHistory(id: string, transitions: Array<Record<string, unknown>>, attachments: Array<Record<string, unknown>>): void { if(this.snapshot.transition?.id===id)this.state.next(s=>({...s,transitionHistory:transitions,transitionAttachments:attachments})); }
  private drawLinks(): void {
    const board=this.querySelector<HTMLElement>("[data-canvas]"),svg=this.querySelector<SVGElement>("[data-links]");
    if(!board||!svg)return;
    const frame=board.getBoundingClientRect(),width=board.scrollWidth,height=board.scrollHeight;svg.setAttribute("viewBox",`0 0 ${width} ${height}`);svg.setAttribute("width",String(width));svg.setAttribute("height",String(height));
    const paths=[...board.querySelectorAll<HTMLElement>("[data-material-link-card][data-stage-id]")].flatMap(card=>{
      const stage=board.querySelector<HTMLElement>(`[data-stage-drop="${CSS.escape(card.dataset.stageId||"")}"]`);if(!stage)return[];
      const a=card.getBoundingClientRect(),b=stage.getBoundingClientRect(),x1=a.right-frame.left,y1=a.top+a.height/2-frame.top,x2=b.left-frame.left,y2=b.top+b.height/2-frame.top,bend=Math.max(36,(x2-x1)*.4);
      return [`<path d="M ${x1} ${y1} C ${x1+bend} ${y1}, ${x2-bend} ${y2}, ${x2} ${y2}"></path>`];
    });svg.innerHTML=paths.join("");
  }
  private render(): void {
    const s=this.snapshot, query=s.query.trim().toLocaleLowerCase("pt-BR"), selectedStage=s.stages.find(stage=>stage.id===s.activeStage),
      rows=s.materials.filter(item=>(s.activeStage==="inventory"||item.stageId===s.activeStage)&&(s.statusFilter==="all"||item.status===s.statusFilter)&&(!query||[item.name,item.unit,item.status,item.stageName,item.activityName,item.scope,...Object.values(item.properties||{})].some(value=>String(value||"").toLocaleLowerCase("pt-BR").includes(query)))),
      pages=Math.max(1,Math.ceil(rows.length/15)),page=Math.min(s.page,pages),visible=rows.slice((page-1)*15,page*15),
      selected=s.editing&&typeof s.editing==="object"?s.editing:null,formOpen=s.editing!==false,customColumns=s.columns,
      baseColumns:[string,string][]=[["id","ID"],["name","Material"],["stageId","Etapa"],["activityName","Atividade"],["plannedQuantity","Previsto"],["receivedQuantity","Recebido"],["usedQuantity","Usado"],["unit","Unidade"],["status","Situação"],["scope","Descrição"],...customColumns.map(column=>[column.id,column.label] as [string,string]),["updatedAt","Última alteração"]],
      shownColumns=baseColumns.filter(([id])=>!s.hiddenColumns.includes(id));
    const statusLabel=(value:string)=>({bom:"Adequado",atencao:"Atenção",critico:"Crítico",planejado:"Planejado",andamento:"Em andamento",concluido:"Concluído"}[value.toLocaleLowerCase("pt-BR")]||value);
    const input=(name:string,label:string,value:unknown,type="text",required=false)=>`<label>${label}<input name="${name}" type="${type}" value="${this.escape(value)}"${required?" required":""}></label>`;
    const materialCell=(item:OperationalMaterial,key:string)=>{
      const value=key.startsWith("material-property-")?item.properties?.[key]:key==="stageId"?item.stageName:key==="status"?statusLabel(item.status):key==="id"?item.id:key==="updatedAt"&&item.updatedAt?new Date(item.updatedAt).toLocaleString("pt-BR"):(item as unknown as Record<string,unknown>)[key];
      return `<button type="button" data-sheet-cell="${this.escape(item.id)}" data-sheet-field="${this.escape(key)}" aria-selected="false">${this.escape(value==null||value===""?"—":value)}</button>`;
    };
    const stageCanvas=s.stages.map(stage=>{
      const allocated=s.materials.filter(item=>item.stageId===stage.id),agenda=s.agenda.filter(event=>String(event.stageName||"").toLocaleLowerCase("pt-BR")===stage.name.toLocaleLowerCase("pt-BR"));
      return `<article class="atlas-canvas-stage" data-stage-drop="${stage.id}" data-stage-label="${this.escape(stage.name)}"><span class="atlas-eyebrow">ETAPA · ${this.escape(stage.id)}</span><h3>${this.escape(stage.name)}</h3><small>${allocated.length} materiais persistidos · ${agenda.length} eventos de agenda</small><section class="atlas-material-stage-context"><b>Agenda e registros relacionados</b>${agenda.length?agenda.slice(0,5).map(event=>`<p>${this.escape(event.date)} · ${this.escape(event.title)} <small>${this.escape(event.status)}</small></p>`).join(""):`<p class="atlas-muted">Não há eventos de agenda relacionados registrados.</p>`}</section><button type="button" data-add-stage="${stage.id}">＋ Adicionar material à etapa</button></article>`;
    }).join("");
    const canvasMaterials=rows.map(item=>`<article class="atlas-link-card${item.stageId?" atlas-linked":""}" data-material-link-card="${this.escape(item.id)}" data-stage-id="${item.stageId||""}" draggable="true"><div><span class="atlas-eyebrow">MATERIAL · ${this.escape(item.id)}</span><b>${this.escape(item.name)}</b><small>${item.plannedQuantity} ${this.escape(item.unit)} · ${this.escape(statusLabel(item.status))} · ${this.escape(item.stageName||"Sem etapa")}</small></div><div class="atlas-actions">${item.stageId?`<button type="button" data-unlink="${this.escape(item.id)}">Remover vínculo</button>`:""}<button type="button" data-transition="${this.escape(item.id)}">Registrar estado</button><button type="button" data-edit="${this.escape(item.id)}">Editar</button></div></article>`).join("")||`<p class="atlas-empty">Nenhum material persistido corresponde aos filtros.</p>`;
    const history=s.transitionHistory.map(record=>{const props=Array.isArray(record.properties)?record.properties as Array<{id:string;value:string}>:[],get=(id:string)=>props.find(item=>item.id===id)?.value||"", ids=(()=>{try{return JSON.parse(get("document_ids")) as string[]}catch{return []}})(),docs=s.transitionAttachments.filter(file=>ids.includes(String(file.id)));return `<article><b>${this.escape(record.id)} · ${this.escape(record.data)} ${this.escape(record.hora||"")}</b><p>${this.escape(get("before_quantity")||"—")} ${this.escape(get("before_unit"))} → ${this.escape(get("after_quantity"))} ${this.escape(get("after_unit"))}</p><p>${this.escape(get("after_description"))}</p>${docs.map(file=>`<button type="button" data-material-file="${this.escape(file.fileUrl)}" data-material-file-name="${this.escape(file.fileName)}">${this.escape(file.title||"Comprovante")} · ${this.escape(file.fileName)}</button>`).join("")||`<small>Sem comprovantes anexados.</small>`}</article>`;}).join("");
    const transition=s.transition, transitionStage=transition?.stageId?s.stages.find(stage=>stage.id===transition.stageId):null;
    const stageOptions=s.stages.map(stage=>`<option value="${stage.id}" ${Number(selected?.stageId)===stage.id||(!selected&&Number(transition?.stageId)===stage.id)?"selected":""}>${this.escape(stage.name)}</option>`).join("");
    const fieldValues=selected&&typeof selected==="object"?selected as OperationalMaterial:null;
    const form= formOpen?`<form class="atlas-material-form" data-form><div class="atlas-material-toolbar"><div><span class="atlas-eyebrow">CADASTRO OPERACIONAL</span><h2>${fieldValues?"Editar material":"Novo material"}</h2></div><button type="button" data-cancel>Cancelar</button></div><div class="atlas-fields">${input("name","Material",fieldValues?.name||"","text",true)}<label>Etapa<select name="stageId"><option value="">Sem etapa</option>${stageOptions}</select></label>${input("activityName","Atividade",fieldValues?.activityName||"")}${input("unit","Unidade",fieldValues?.unit||"un.")}${input("plannedQuantity","Quantidade prevista",fieldValues?.plannedQuantity||0,"number")}${input("receivedQuantity","Quantidade recebida",fieldValues?.receivedQuantity||0,"number")}${input("usedQuantity","Quantidade utilizada",fieldValues?.usedQuantity||0,"number")}<label>Situação<select name="status">${["Planejado","Em andamento","Adequado","Atenção","Crítico","Concluído"].map(value=>`<option ${fieldValues?.status===value?"selected":""}>${value}</option>`).join("")}</select></label><label class="atlas-wide">Descrição e uso<textarea name="scope">${this.escape(fieldValues?.scope||"")}</textarea></label>${customColumns.map(column=>input(`property:${column.id}`,column.label,fieldValues?.properties?.[column.id]||"")).join("")}</div>${s.error?`<p role="alert">${this.escape(s.error)}</p>`:""}<button class="atlas-primary" type="submit" ${s.saving?"disabled":""}>${s.saving?"Salvando…":fieldValues?"Salvar alterações":"Cadastrar material"}</button></form>`:"";
    const listRows=visible.map(item=>`<tr>${shownColumns.map(([key])=>`<td>${materialCell(item,key)}</td>`).join("")}<td><div class="atlas-actions"><button type="button" data-transition="${this.escape(item.id)}">Registrar estado</button><button type="button" data-edit="${this.escape(item.id)}">Editar</button><button type="button" data-delete="${this.escape(item.id)}">Excluir</button></div></td></tr>`).join("");
    const table=`<div class="atlas-material-card"><div class="atlas-stage-heading"><h2>Materiais cadastrados</h2><p>${rows.length} itens · página ${page} de ${pages}</p></div><div class="atlas-sheet-controls">${baseColumns.map(([id,label])=>`<label><input type="checkbox" data-column-toggle="${this.escape(id)}" ${s.hiddenColumns.includes(id)?"":"checked"}> ${this.escape(label)}</label>`).join("")}<form data-column-form><input name="label" aria-label="Nova propriedade" placeholder="Nova propriedade"><button type="submit">Adicionar coluna</button></form>${customColumns.map(column=>`<button type="button" data-column-delete="${this.escape(column.id)}">Remover ${this.escape(column.label)}</button>`).join("")}</div><div class="atlas-table-scroll"><table><thead><tr>${shownColumns.map(([,label])=>`<th>${this.escape(label)}</th>`).join("")}<th>Ações</th></tr></thead><tbody>${listRows||`<tr><td class="atlas-empty" colspan="${shownColumns.length+1}">Nenhum material corresponde aos filtros.</td></tr>`}</tbody></table></div><footer><button type="button" data-page="${Math.max(1,page-1)}" ${page<=1?"disabled":""}>Anterior</button><span>${page} / ${pages}</span><button type="button" data-page="${Math.min(pages,page+1)}" ${page>=pages?"disabled":""}>Próxima</button></footer></div>`;
    const transitionDialog=transition?`<dialog class="atlas-transition" open><div><header><div><span class="atlas-eyebrow">REGISTRO DE MOVIMENTAÇÃO</span><h2>${this.escape(transition.name||"Novo material")}</h2><p>${this.escape(transitionStage?.name||"Material sem etapa")}</p></div><button type="button" data-transition-close>Fechar</button></header><form data-transition-form><div class="atlas-fields">${input("name","Material",transition.name,"text",true)}${input("materialNumber","Número do material",transition.id,"text",true)}<label>Etapa<select name="stageId" required>${stageOptions}</select></label>${input("activityName","Atividade",transition.activityName)}${input("quantity","Quantidade",transition.receivedQuantity,"number",true)}${input("unit","Unidade",transition.unit)}${input("status","Situação",transition.status)}${input("documentNumber","Número do documento","")}<label class="atlas-wide">Descrição da movimentação<textarea name="description" required></textarea></label><label class="atlas-wide">Descrição do comprovante<textarea name="documentDescription"></textarea></label><label class="atlas-wide">Comprovantes<input name="documents" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp"></label></div>${s.error?`<p role="alert">${this.escape(s.error)}</p>`:""}<button class="atlas-primary" type="submit" ${s.saving?"disabled":""}>${s.saving?"Salvando…":"Registrar movimentação"}</button></form><section class="atlas-transition-history"><h3>Histórico persistido</h3>${history||"<p class=atlas-muted>Carregando histórico…</p>"}</section></div></dialog>`:"";
    this.innerHTML=`${materialsStyles}<section class="atlas-materials"><header><div><span class="atlas-eyebrow">OPERAÇÃO · SUPRIMENTOS</span><h1>Materiais</h1><p>Catálogo operacional, alocação por etapa e histórico persistido.</p></div><div class="atlas-actions"><button type="button" data-refresh>Atualizar</button><button type="button" class="atlas-primary" data-new>Novo material</button></div></header>${s.error&&!formOpen?`<p role="alert">${this.escape(s.error)}</p>`:""}${s.status==="loading"?`<p>Carregando materiais do banco operacional…</p>`:""}<nav class="atlas-stage-tabs" aria-label="Etapas de materiais"><button type="button" data-stage="inventory" aria-selected="${s.activeStage==="inventory"}">Todos <small>${s.materials.length}</small></button>${s.stages.map(stage=>`<button type="button" data-stage="${stage.id}" aria-selected="${s.activeStage===stage.id}">${this.escape(stage.name)} <small>${s.materials.filter(item=>item.stageId===stage.id).length}</small></button>`).join("")}</nav><div class="atlas-material-toolbar"><label>Buscar material<input data-search type="search" value="${this.escape(s.query)}" placeholder="Nome, atividade, etapa ou descrição"></label><label>Situação<select data-status-filter><option value="all">Todas as situações</option>${[...new Set(s.materials.map(item=>item.status))].map(value=>`<option value="${this.escape(value)}" ${s.statusFilter===value?"selected":""}>${this.escape(statusLabel(value))}</option>`).join("")}</select></label><nav class="atlas-view-tabs"><button type="button" data-view-tab="canvas" aria-pressed="${s.pageTab==="canvas"}">Alocação por etapa</button><button type="button" data-view-tab="list" aria-pressed="${s.pageTab==="list"}">Lista e cadastro</button></nav></div>${form}${s.pageTab==="canvas"?`<div class="atlas-material-card"><div class="atlas-stage-heading"><h2>Distribuição dos materiais por etapa</h2><p>Arraste um material até uma etapa para persistir sua alocação.</p></div><div class="atlas-canvas" data-canvas><svg class="atlas-canvas-links" data-links aria-hidden="true"></svg><div class="atlas-canvas-column">${stageCanvas||`<p class="atlas-empty">Não há etapas operacionais cadastradas.</p>`}</div><div class="atlas-canvas-column">${canvasMaterials}</div></div></div>`:table}${transitionDialog}</section>`;
    queueMicrotask(()=>this.drawLinks());
  }
  connectedCallback(): void {
    this.addEventListener("input",event=>{const t=event.target;if(t instanceof HTMLInputElement&&t.matches("[data-search]")){const cursor=t.selectionStart;this.state.next(s=>({...s,query:t.value,page:1}));const next=this.querySelector<HTMLInputElement>("[data-search]");next?.focus();if(cursor!==null)next?.setSelectionRange(cursor,cursor);}});
    this.addEventListener("click",event=>{const t=event.target;if(!(t instanceof Element))return;
      if(t.closest("[data-refresh]")){this.dispatchEvent(new CustomEvent("atlas:materials-refresh",{bubbles:true,detail:{element:this}}));return;}
      if(t.closest("[data-new]")){this.state.next(s=>({...s,editing:null,error:null,pageTab:"list",activeStage:"inventory"}));return;}
      if(t.closest("[data-cancel]")){this.state.next(s=>({...s,editing:false,error:null}));return;}
      if(t.closest("[data-transition-close]")){this.state.next(s=>({...s,transition:null,transitionHistory:[],transitionAttachments:[],error:null}));return;}
      const viewTab=t.closest<HTMLElement>("[data-view-tab]");if(viewTab){this.state.next(s=>({...s,pageTab:viewTab.dataset.viewTab as "canvas"|"list"}));return;}
      const status=t.closest<HTMLSelectElement>("[data-status-filter]");if(status)return;
      const tab=t.closest<HTMLElement>("[data-stage]");if(tab){this.state.next(s=>({...s,activeStage:tab.dataset.stage==="inventory"?"inventory":Number(tab.dataset.stage),editing:false,page:1}));return;}
      const pageButton=t.closest<HTMLElement>("[data-page]");if(pageButton){this.state.next(s=>({...s,page:Math.max(1,Number(pageButton.dataset.page)||1)}));return;}
      const newStage=t.closest<HTMLElement>("[data-add-stage]");if(newStage){const stageId=Number(newStage.dataset.addStage),stage=this.snapshot.stages.find(item=>item.id===stageId);if(stage)this.openTransition({id:`MAT-${crypto.randomUUID()}`,name:"",unit:"un.",plannedQuantity:0,receivedQuantity:0,usedQuantity:0,status:"Dimensionar",stageId,stageName:stage.name,activityName:"",scope:"",updatedAt:"",properties:{}},true);return;}
      const unlink=t.closest<HTMLElement>("[data-unlink]");if(unlink){const material=this.snapshot.materials.find(item=>item.id===unlink.dataset.unlink);if(material&&confirm(`Remover ${material.name} da etapa ${material.stageName}?`))this.dispatchEvent(new CustomEvent("atlas:material-allocate",{bubbles:true,detail:{element:this,id:material.id,stageId:null}}));return;}
      const allocateStage=t.closest<HTMLElement>("[data-stage-drop]");if(allocateStage){const dragging=this.dataset.dragMaterial;if(dragging){delete this.dataset.dragMaterial;this.dispatchEvent(new CustomEvent("atlas:material-allocate",{bubbles:true,detail:{element:this,id:dragging,stageId:Number(allocateStage.dataset.stageDrop)}}));return;}}
      const materialFile=t.closest<HTMLElement>("[data-material-file]");if(materialFile){this.dispatchEvent(new CustomEvent("atlas:material-file",{bubbles:true,detail:{element:this,fileUrl:materialFile.dataset.materialFile||"",fileName:materialFile.dataset.materialFileName||"comprovante"}}));return;}
      const transition=t.closest<HTMLElement>("[data-transition]");if(transition){const item=this.snapshot.materials.find(row=>row.id===transition.dataset.transition);if(item)this.openTransition(item,false);return;}
      const edit=t.closest<HTMLElement>("[data-edit]");if(edit){const material=this.snapshot.materials.find(item=>item.id===edit.dataset.edit);if(material)this.state.next(s=>({...s,editing:material,error:null,pageTab:"list",activeStage:"inventory"}));return;}
      const del=t.closest<HTMLElement>("[data-delete]");if(del){const item=this.snapshot.materials.find(row=>row.id===del.dataset.delete);if(item&&confirm(`Excluir ${item.name} do cadastro operacional?`))this.dispatchEvent(new CustomEvent("atlas:material-delete",{bubbles:true,detail:{element:this,id:item.id}}));return;}
      const columnDelete=t.closest<HTMLElement>("[data-column-delete]");if(columnDelete){const columnId=columnDelete.dataset.columnDelete;if(confirm("Excluir esta propriedade e os seus valores persistidos?"))this.dispatchEvent(new CustomEvent("atlas:material-column-delete",{bubbles:true,detail:{element:this,id:columnId}}));return;}
      const toggle=t.closest<HTMLInputElement>("[data-column-toggle]");if(toggle){this.state.next(s=>({...s,hiddenColumns:toggle.checked?s.hiddenColumns.filter(id=>id!==toggle.dataset.columnToggle):[...new Set([...s.hiddenColumns,String(toggle.dataset.columnToggle)])]}));return;}
      const cell=t.closest<HTMLElement>("[data-sheet-cell]");if(cell){this.querySelectorAll("[data-sheet-cell]").forEach(node=>node.setAttribute("aria-selected","false"));cell.setAttribute("aria-selected","true");const item=this.snapshot.materials.find(row=>row.id===cell.dataset.sheetCell);const label=this.snapshot.columns.find(column=>column.id===cell.dataset.sheetField)?.label||cell.dataset.sheetField||"";const selection=this.querySelector("[data-sheet-selection]");if(selection)selection.textContent=`${item?.name||cell.dataset.sheetCell} · ${label}`;return;}
    });
    this.addEventListener("change",event=>{const t=event.target;if(t instanceof HTMLSelectElement&&t.matches("[data-status-filter]"))this.state.next(s=>({...s,statusFilter:t.value,page:1}));});
    this.addEventListener("dragstart",event=>{const card=(event.target as Element)?.closest<HTMLElement>("[data-material-link-card]");if(card){this.dataset.dragMaterial=card.dataset.materialLinkCard||"";if(event.dataTransfer)event.dataTransfer.setData("text/plain",this.dataset.dragMaterial);}});
    this.addEventListener("dragover",event=>{const stage=(event.target as Element)?.closest<HTMLElement>("[data-stage-drop]");if(stage){event.preventDefault();stage.dataset.dropActive="true";}});
    this.addEventListener("dragleave",event=>{const stage=(event.target as Element)?.closest<HTMLElement>("[data-stage-drop]");if(stage)delete stage.dataset.dropActive;});
    this.addEventListener("drop",event=>{const stage=(event.target as Element)?.closest<HTMLElement>("[data-stage-drop]");if(stage){event.preventDefault();delete stage.dataset.dropActive;const id=event.dataTransfer?.getData("text/plain")||this.dataset.dragMaterial;if(id)this.dispatchEvent(new CustomEvent("atlas:material-allocate",{bubbles:true,detail:{element:this,id,stageId:Number(stage.dataset.stageDrop)}}));delete this.dataset.dragMaterial;}});
    this.addEventListener("submit",event=>{const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();
      if(form.matches("[data-form]")){const data=new FormData(form),stageValue=String(data.get("stageId")||""),current=this.snapshot.editing,payload={name:String(data.get("name")||"").trim(),stageId:stageValue?Number(stageValue):null,activityName:String(data.get("activityName")||"").trim(),unit:String(data.get("unit")||"").trim(),plannedQuantity:Number(data.get("plannedQuantity")),receivedQuantity:Number(data.get("receivedQuantity")),usedQuantity:Number(data.get("usedQuantity")),status:String(data.get("status")||"").trim(),scope:String(data.get("scope")||"").trim(),properties:Object.fromEntries(this.snapshot.columns.map(column=>[column.id,String(data.get(`property:${column.id}`)||"").trim()]))};if(!payload.name||![payload.plannedQuantity,payload.receivedQuantity,payload.usedQuantity].every(n=>Number.isFinite(n)&&n>=0)){this.setError("Informe o nome e quantidades não negativas válidas.");return;}this.state.next(s=>({...s,saving:true,error:null}));this.dispatchEvent(new CustomEvent("atlas:material-save",{bubbles:true,detail:{element:this,id:current&&typeof current==="object"?current.id:null,payload}}));return;}
      if(form.matches("[data-column-form]")){const label=String(new FormData(form).get("label")||"").trim();if(label)this.dispatchEvent(new CustomEvent("atlas:material-column-save",{bubbles:true,detail:{element:this,label}}));return;}
      if(form.matches("[data-transition-form]")){const data=new FormData(form),input=form.elements.namedItem("documents") as HTMLInputElement,files=[...(input?.files||[])],stageId=Number(data.get("stageId")),material=this.snapshot.transition;if(!material)return;if(files.length>3||files.some(file=>file.size>6*1024*1024||![/^application\/pdf$/,/^image\/(jpeg|png|webp)$/].some(pattern=>pattern.test(file.type)))){this.setError("Anexe até 3 comprovantes PDF/JPEG/PNG/WebP de até 6 MB cada.");return;}const after={name:String(data.get("name")||"").trim(),materialNumber:String(data.get("materialNumber")||"").trim(),stageId,activityName:String(data.get("activityName")||"").trim(),quantity:Number(data.get("quantity")),unit:String(data.get("unit")||"").trim(),status:String(data.get("status")||"").trim(),description:String(data.get("description")||"").trim(),documentNumber:String(data.get("documentNumber")||"").trim(),documentDescription:String(data.get("documentDescription")||"").trim(),files};if(!after.name||!after.materialNumber||!Number.isFinite(after.quantity)||after.quantity<0||!after.description){this.setError("Informe nome, número, quantidade válida e descrição da mudança.");return;}const stage=this.snapshot.stages.find(item=>item.id===stageId);if(!stage){this.setError("Selecione uma etapa operacional existente.");return;}this.state.next(s=>({...s,saving:true,error:null}));this.dispatchEvent(new CustomEvent("atlas:material-transition-save",{bubbles:true,detail:{element:this,material,draft:!this.snapshot.materials.some(item=>item.id===material.id),stage,after}}));}
    });
    this.addEventListener("dblclick",event=>{const button=(event.target as Element)?.closest<HTMLElement>("[data-sheet-cell]");if(!button)return;const material=this.snapshot.materials.find(item=>item.id===button.dataset.sheetCell),field=button.dataset.sheetField;if(!material||!field||["id","updatedAt"].includes(field))return;const key=field,custom=key.startsWith("material-property-"),current=custom?material.properties[key]:key==="stageId"?String(material.stageId||""):(material as unknown as Record<string,unknown>)[key];const input=document.createElement(custom||key==="scope"?"textarea":"input");input.className="atlas-sheet-inline-editor";input.value=String(current??"");if(["plannedQuantity","receivedQuantity","usedQuantity"].includes(key)){(input as HTMLInputElement).type="number";(input as HTMLInputElement).min="0";(input as HTMLInputElement).step="any";}button.hidden=true;button.after(input);input.focus();input.select?.();const cancel=()=>{input.remove();button.hidden=false;};const save=()=>{if(key==="stageId"){cancel();return;}const value=key.endsWith("Quantity")?(input.value===""?0:Number(input.value)):input.value.trim(),payload={...material,...(custom?{properties:{...material.properties,[key]:String(value)}}:{[key]:value})};this.dispatchEvent(new CustomEvent("atlas:material-save",{bubbles:true,detail:{element:this,id:material.id,payload}}));input.remove();};input.addEventListener("keydown",keyEvent=>{const keyboard=keyEvent as KeyboardEvent;if(keyboard.key==="Escape"){keyboard.preventDefault();cancel();}if(keyboard.key==="Enter"&&input.tagName!=="TEXTAREA"){keyboard.preventDefault();save();}});input.addEventListener("blur",cancel,{once:true});input.addEventListener("change",save,{once:true});});
    this.renderSafely();this.dispatchEvent(new CustomEvent("atlas:materials-connected",{bubbles:true,detail:{element:this}}));
  }
  private openTransition(material:OperationalMaterial,draft:boolean):void { this.state.next(s=>({...s,transition:material,transitionHistory:[],transitionAttachments:[],error:null,saving:false}));this.dispatchEvent(new CustomEvent("atlas:material-transition-open",{bubbles:true,detail:{element:this,material,draft}})); }
}
if(!customElements.get("atlas-materials"))customElements.define("atlas-materials",AtlasMaterials);

type AgendaState={events:OperationalAgendaEvent[];stages:OperationalStage[];materials:OperationalMaterial[];week:string;selectedDate:string;presentation:"status"|"timeline";calendarOpen:boolean;editor:OperationalAgendaEvent|null|false;relatedFrom:string;error:string|null;loading:boolean;saving:boolean};
type AgendaSetter=(previous:AgendaState)=>AgendaState;
const agendaCss=`<style>
.atlas-agenda{display:grid;gap:16px;color:#202638}.atlas-agenda *{box-sizing:border-box}
.atlas-agenda header,.atlas-agenda footer,.atlas-agenda .agenda-actions,.atlas-agenda .agenda-nav,.atlas-agenda .agenda-modes{display:flex;align-items:center;justify-content:space-between;gap:10px}
.atlas-agenda h1{margin:4px 0;font-size:28px;color:#202638}.atlas-agenda p,.atlas-agenda small{color:#68758b}.atlas-agenda .agenda-kicker{color:#3876db;font-size:10px;font-weight:800;letter-spacing:.1em}
.atlas-agenda button,.atlas-agenda input,.atlas-agenda select,.atlas-agenda textarea{font:inherit}.atlas-agenda button{min-height:38px;padding:8px 12px;border:1px solid #d9e0e9;border-radius:9px;background:#fff;color:#253049;cursor:pointer}.atlas-agenda button:hover{border-color:#4c7ed8}
.atlas-agenda .agenda-primary,.atlas-agenda [aria-pressed=true],.atlas-agenda [aria-current=date]{background:#252634;border-color:#252634;color:#fff}.atlas-agenda .agenda-days button[aria-current=date]{color:#fff}
.atlas-agenda .agenda-head,.atlas-agenda .agenda-panel,.atlas-agenda .agenda-editor{padding:18px;border:1px solid #e3e8ef;border-radius:14px;background:#fff}.atlas-agenda .agenda-head{display:grid;grid-template-columns:1fr;gap:10px}.atlas-agenda .agenda-actions{justify-content:flex-end;flex-wrap:wrap}.atlas-agenda .agenda-nav b{min-width:190px;text-align:center;color:#202638}.atlas-agenda .agenda-controls{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.atlas-agenda .agenda-days{display:grid;grid-template-columns:repeat(7,minmax(80px,1fr));gap:7px;overflow:auto;margin:14px 0}.atlas-agenda .agenda-days button{display:grid;gap:5px;justify-items:start;text-align:left;color:#253049}.atlas-agenda .agenda-days strong{color:inherit}.atlas-agenda .agenda-days small{color:inherit;opacity:.82}
.atlas-agenda .agenda-groups{display:grid;gap:12px}.atlas-agenda .agenda-group{overflow:hidden;border:1px solid #e3e8ef;border-radius:13px;background:#fff;color:#263149}.atlas-agenda .agenda-group>header{padding:12px 16px;background:#f7f9fc;color:#263149}.atlas-agenda .agenda-group h2{margin:0;font-size:16px;color:#202638}.atlas-agenda .agenda-group>div{display:grid}
.atlas-agenda .agenda-row{display:grid;grid-template-columns:minmax(145px,.7fr) minmax(180px,1.4fr) minmax(160px,1fr) auto;align-items:center;gap:12px;padding:13px 16px;border:0;border-top:1px solid #edf0f4;border-radius:0;text-align:left;color:#263149}.atlas-agenda .agenda-row strong,.atlas-agenda .agenda-row small{display:block;overflow:hidden;text-overflow:ellipsis}.atlas-agenda .agenda-row strong{color:#202638}.atlas-agenda .agenda-row small{color:#68758b}
.atlas-agenda .agenda-status{padding:4px 8px;border-radius:99px;background:#f1f4f8;color:#56647a;font-size:11px}.atlas-agenda .agenda-events{display:grid;gap:9px}.atlas-agenda .agenda-event{display:grid;gap:7px;text-align:left;width:100%;height:auto;padding:13px;border-left:3px solid #4b83d4;color:#263149}.atlas-agenda .agenda-event time{color:#3f6eaf;font-weight:700}
.atlas-agenda .agenda-editor-wrap{position:fixed;inset:0;z-index:1300;display:grid;place-items:center;padding:16px;background:#18243b70}.atlas-agenda .agenda-editor-wrap[hidden]{display:none}.atlas-agenda .agenda-editor{width:min(900px,100%);max-height:92vh;overflow:auto}.atlas-agenda .agenda-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.atlas-agenda label{display:grid;gap:6px;color:#56647a;font-size:12px}
.atlas-agenda input,.atlas-agenda select,.atlas-agenda textarea{width:100%;min-width:0;padding:9px 11px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e}.atlas-agenda .agenda-wide{grid-column:1/-1}.atlas-agenda textarea{min-height:76px}.atlas-agenda .agenda-materials{max-height:120px;overflow:auto;display:flex;gap:12px;flex-wrap:wrap;padding:12px;border:1px solid #e3e8ef;border-radius:10px}.atlas-agenda .agenda-materials label{display:flex;align-items:center;gap:5px}.atlas-agenda .agenda-materials input{width:auto}
.atlas-agenda .agenda-calendar{overflow:auto;border:1px solid #dfe5ed;border-radius:12px;background:#f8f9fb}.atlas-agenda .agenda-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(145px,1fr));min-width:1015px}.atlas-agenda .agenda-calendar-day{position:relative;min-width:0;border-right:1px solid #e0e5ec}.atlas-agenda .agenda-calendar-day>header{position:sticky;top:0;z-index:4;display:grid;gap:3px;padding:9px;background:#f2f5f9;border-bottom:1px solid #dce3ec;color:#263149}.atlas-agenda .agenda-calendar-day>header small{color:#748096}.atlas-agenda .agenda-calendar-body{position:relative;height:1152px;background:repeating-linear-gradient(to bottom,#fff 0,#fff 47px,#e7ebf0 48px);background-size:100% 48px;overflow:visible}.atlas-agenda .agenda-time-label{position:absolute;left:3px;top:calc(var(--hour) * 48px);z-index:1;color:#8a94a3;font-size:9px;pointer-events:none}.atlas-agenda .agenda-calendar-event{position:absolute;left:24px;z-index:2;display:block;overflow:hidden;min-height:24px;padding:6px 8px;border:1px solid #9db7da;border-left:3px solid #397bd0;border-radius:7px;background:#eaf2fc;color:#1e3451;text-align:left;touch-action:none;cursor:grab}.atlas-agenda .agenda-calendar-event strong,.atlas-agenda .agenda-calendar-event small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit}.atlas-agenda .agenda-calendar-event small{opacity:.76}.atlas-agenda .agenda-calendar-event [data-calendar-resize]{position:absolute;z-index:4;display:block;background:#246dd1;opacity:.55;touch-action:none}.atlas-agenda .agenda-calendar-event [data-calendar-resize=duration]{right:3px;bottom:0;left:3px;height:6px;cursor:ns-resize}.atlas-agenda .agenda-calendar-event [data-calendar-resize=span]{top:3px;right:0;bottom:3px;width:6px;cursor:ew-resize}.atlas-agenda .agenda-calendar-event[data-status-tone=done]{border-left-color:#2d9b71;background:#e8f6ef}.atlas-agenda .agenda-calendar-event[data-status-tone=warning]{border-left-color:#cf8c20;background:#fff4df}
@media(max-width:760px){.atlas-agenda .agenda-head{align-items:stretch}.atlas-agenda .agenda-actions{justify-content:flex-start}.atlas-agenda .agenda-nav{width:100%}.atlas-agenda .agenda-nav b{min-width:0;flex:1}.atlas-agenda .agenda-days{grid-template-columns:repeat(7,minmax(65px,1fr))}.atlas-agenda .agenda-row{grid-template-columns:1fr auto}.atlas-agenda .agenda-fields{grid-template-columns:1fr 1fr}}
</style>`;
const agendaIso=(date:Date):string=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const agendaPlusDays=(value:string,count:number):string=>{const date=new Date(`${value}T12:00:00`);date.setDate(date.getDate()+count);return agendaIso(date);};

/** Agenda element: interface and transient state stay in the component; CRUD is delegated to program. */
export class AtlasAgenda extends HTMLElement{
  private readonly state:AtomicState<AgendaState>;private snapshot:AgendaState;
  constructor(){super();const today=new Date(),start=new Date(today.getFullYear(),today.getMonth(),today.getDate());start.setDate(start.getDate()-start.getDay());const initial:AgendaState={events:[],stages:[],materials:[],week:agendaIso(start),selectedDate:agendaIso(today),presentation:"status",calendarOpen:false,editor:false,relatedFrom:"",error:null,loading:true,saving:false};function* state(value:AgendaState):Generator<AgendaState,never,AgendaSetter>{while(true)value=(yield value)(value);}const iterator=state(initial);iterator.next();this.snapshot=initial;this.state={next:setter=>{this.snapshot=iterator.next(setter).value;this.render();return this.snapshot;}};}
  private esc(value:unknown):string{return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));}
  setData(events:OperationalAgendaEvent[],stages:OperationalStage[],materials:OperationalMaterial[]):void{const ordered=[...events].filter(event=>/^\d{4}-\d{2}-\d{2}$/.test(event.date)).sort((a,b)=>`${a.date}T${a.start||"00:00"}`.localeCompare(`${b.date}T${b.start||"00:00"}`));let week=this.snapshot.week;if(!ordered.some(event=>event.date>=week&&event.date<agendaPlusDays(week,7))&&ordered.length){const nearest=[...ordered].sort((a,b)=>Math.abs(Date.parse(a.date)-Date.now())-Math.abs(Date.parse(b.date)-Date.now()))[0],date=new Date(`${nearest.date}T12:00:00`);date.setDate(date.getDate()-date.getDay());week=agendaIso(date);}this.state.next(s=>({...s,events:ordered,stages,materials,week,loading:false,error:null,saving:false}));}
  setError(error:string):void{this.state.next(s=>({...s,error,loading:false,saving:false}));}
  private render():void{
    const s=this.snapshot,start=new Date(`${s.week}T12:00:00`),days=Array.from({length:7},(_,index)=>{const d=new Date(start);d.setDate(d.getDate()+index);return d;}),keys=days.map(agendaIso),events=s.events.filter(event=>keys.includes(event.date)),selected=typeof s.editor==="object"?s.editor:null,editing=s.editor!==false,esc=(v:unknown)=>this.esc(v),stage=selected?s.stages.find(item=>item.name===selected.stageName):s.stages.find(item=>item.name===s.events.find(event=>event.id===s.relatedFrom)?.stageName)||s.stages[0],stageName=selected?.stageName||stage?.name||"",materials=s.materials.filter(item=>item.stageName===stageName),activities=stage?.activities||[];
    const dayNav=days.map(day=>{const key=agendaIso(day);return `<button type="button" data-day="${key}" aria-current="${s.selectedDate===key?"date":"false"}"><span>${day.toLocaleDateString("pt-BR",{weekday:"short"})}</span><strong>${day.getDate()}</strong><small>${events.filter(event=>event.date===key).length} compromisso(s)</small></button>`;}).join("");
    const ordered=[...events].sort((a,b)=>`${a.date}T${a.start||"00:00"}`.localeCompare(`${b.date}T${b.start||"00:00"}`)),normalize=(text:string)=>text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g,"").replaceAll("_"," ").trim(),priority=["pendente","em andamento","planejado","aguardando material","bloqueado","concluido"],titles:Record<string,string>={pendente:"Pendentes de execução","em andamento":"Em andamento",planejado:"Planejados","aguardando material":"Aguardando materiais",bloqueado:"Bloqueados",concluido:"Concluídos"},groups=[...new Set(ordered.map(event=>normalize(event.status)))].sort((a,b)=>(priority.indexOf(a)<0?priority.length:priority.indexOf(a))-(priority.indexOf(b)<0?priority.length:priority.indexOf(b))||a.localeCompare(b,"pt-BR"));
    const row=(event:OperationalAgendaEvent)=>`<button type="button" class="agenda-row" data-event-edit="${esc(event.id)}"><span><strong>${esc(event.date.split("-").reverse().join("/"))} · ${esc(event.start||"—")}</strong><small>${Number(event.durationHours||0)} h · ${Number(event.spanDays||1)} dia(s)</small></span><span><strong>${esc(event.title)}</strong><small>${esc(event.activityName)} · ${esc(event.stageName)}</small></span><span><strong>${esc(event.owner||"Responsável não informado")}</strong><small>${esc(event.notes||"")}</small></span><span class="agenda-status">${esc(event.status)}</span></button>`;
    const body=s.presentation==="status"?groups.map(group=>{const list=ordered.filter(event=>normalize(event.status)===group);return `<section class="agenda-group"><header><h2>${esc(titles[group]||group)}</h2><span>${list.length}</span></header><div>${list.map(row).join("")}</div></section>`;}).join():`<div class="agenda-events">${ordered.map(event=>`<button type="button" class="agenda-event" data-event-date="${esc(event.date)}" data-event-edit="${esc(event.id)}"><header><time>${esc(event.date.split("-").reverse().join("/"))} · ${esc(event.start||"Horário a definir")}</time><span class="agenda-status">${esc(event.status)}</span></header><strong>${esc(event.title)}</strong><p>${esc(event.activityName)} · ${esc(event.stageName)}</p><footer><span>${esc(event.owner||"Responsável não informado")}</span><small>${Number(event.durationHours||0)} h · ${Number(event.spanDays||1)} dia(s)</small></footer></button>`).join("")||`<p class="agenda-empty">Nenhum compromisso registrado nesta semana.</p>`}</div>`;
    const calendarMarkup=`<section class="agenda-calendar" aria-label="Calendário semanal para ajuste de horários"><div class="agenda-calendar-grid">${days.map(day=>{const date=agendaIso(day),dayEvents=ordered.filter(event=>event.date===date);return `<article class="agenda-calendar-day" data-calendar-date="${date}"><header><strong>${day.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"short"})}</strong><small>${dayEvents.length} compromisso(s)</small></header><div class="agenda-calendar-body">${[0,4,8,12,16,20].map(hour=>`<span class="agenda-time-label" style="--hour:${hour}">${String(hour).padStart(2,"0")}:00</span>`).join("")}${dayEvents.map(item=>{const [hour,minute]=String(item.start||"08:00").split(":").map(Number),start=hour+minute/60,duration=Math.max(.5,Math.min(24-start,Number(item.durationHours)||1)),span=Math.min(Math.max(1,Number(item.spanDays)||1),7-day.getDay()),tone=/concl/i.test(item.status)?"done":/pend|risco|bloq/i.test(item.status)?"warning":"planned";return `<button type="button" class="agenda-calendar-event" data-calendar-event="${esc(item.id)}" data-status-tone="${tone}" data-date="${date}" data-start="${esc(item.start)}" data-duration="${duration}" data-span="${span}" style="top:${start*48}px;height:${Math.max(24,duration*48)}px;width:calc(${span*100}% + ${(span-1)*8}px)" aria-label="Mover ou ajustar ${esc(item.title)}"><strong>${esc(item.title)}</strong><small>${esc(item.start)} · ${duration} h · ${span} dia(s)</small><span data-calendar-resize="duration" aria-label="Ajustar duração"></span><span data-calendar-resize="span" aria-label="Ajustar dias"></span></button>`;}).join("")}</div></article>`;}).join("")}</div></section>`;
    const options=s.stages.map(item=>`<option value="${esc(item.name)}" ${(selected?selected.stageName===item.name:stage?.id===item.id)?"selected":""}>${esc(item.name)}</option>`).join(""),activityOptions=activities.map(item=>`<option value="${esc(item.id)}" ${selected?.activityId===item.id?"selected":""}>${esc(item.name)}</option>`).join(""),materialOptions=materials.map(item=>`<label><input type="checkbox" name="materialIds" value="${esc(item.id)}" ${(selected?.materialIds||[]).includes(item.id)?"checked":""}>${esc(item.name)} · ${esc(item.receivedQuantity)} ${esc(item.unit)}</label>`).join(""),field=(name:string,label:string,value:unknown,type="text",required=false)=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}"${required?" required":""}></label>`,relation=selected?.relatedFrom||s.relatedFrom;
    const editor=`<div class="agenda-editor-wrap" ${editing?"":"hidden"}><section class="agenda-editor"><header><div><span class="agenda-kicker">AGENDA · ${selected?"EDIÇÃO":"NOVO COMPROMISSO"}</span><h2>${selected?"Editar compromisso":"Adicionar compromisso"}</h2><p>Associe o compromisso à etapa, atividade e materiais existentes.</p></div><button type="button" data-editor-close>Fechar</button></header><form data-agenda-form><input type="hidden" name="id" value="${esc(selected?.id||"")}"><input type="hidden" name="relatedFrom" value="${esc(relation)}"><div class="agenda-fields">${field("title","Título",selected?.title||"","text",true)}<label>Etapa<select name="stageKey" required>${options}</select></label><label>Atividade<select name="activityId">${activityOptions}</select></label>${field("owner","Responsável",selected?.owner||"")}${field("date","Data",selected?.date||s.selectedDate,"date",true)}${field("start","Hora inicial",selected?.start||"08:00","time",true)}${field("durationHours","Duração em horas",selected?.durationHours||1.5,"number")}${field("spanDays","Duração em dias",selected?.spanDays||1,"number")}<label>Status<select name="status">${["Planejado","Em andamento","Pendente","Aguardando material","Bloqueado","Concluído"].map(value=>`<option ${normalize(selected?.status||"Planejado")===normalize(value)?"selected":""}>${value}</option>`).join("")}</select></label><label class="agenda-wide">Descrição e orientação<textarea name="notes" maxlength="2000">${esc(selected?.notes||"")}</textarea></label></div>${relation?`<p class="agenda-linked-note">Vinculado a ${esc(s.events.find(event=>event.id===relation)?.title||relation)}.</p>`:""}<fieldset class="agenda-materials"><legend>Materiais alocados</legend>${materialOptions||`<small>Sem materiais registrados nesta etapa.</small>`}</fieldset><footer><button type="button" data-editor-close>Cancelar</button>${selected?`<button type="button" data-related="${esc(selected.id)}">Novo relacionado</button><button type="button" data-delete="${esc(selected.id)}">Excluir</button>`:""}<button type="submit" class="agenda-primary" ${s.saving?"disabled":""}>${s.saving?"Salvando…":"Salvar compromisso"}</button></footer></form></section></div>`;
    this.innerHTML=`${agendaCss}<section class="atlas-agenda"><header class="agenda-head"><div><span class="agenda-kicker">PLANEJAMENTO · COMPROMISSOS</span><h1>Agenda</h1><p>Compromissos operacionais organizados por estado e linha do tempo semanal.</p></div><div class="agenda-actions"><button type="button" data-refresh>Atualizar</button><button type="button" data-calendar-toggle aria-expanded="${s.calendarOpen}">${s.calendarOpen?"Fechar calendário":"Ajustar horários no calendário"}</button><button type="button" class="agenda-primary" data-new>Novo compromisso</button></div></header>${s.loading?`<p>Carregando agenda persistida…</p>`:""}${s.error?`<p role="alert">${esc(s.error)}</p>`:""}<section class="agenda-panel"><div class="agenda-controls"><div class="agenda-nav"><button type="button" data-week="-1">‹</button><b>${days[0].toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})} — ${days[6].toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}</b><button type="button" data-week="1">›</button></div><div class="agenda-modes"><button type="button" data-presentation="status" aria-pressed="${s.presentation==="status"}">Por estado</button><button type="button" data-presentation="timeline" aria-pressed="${s.presentation==="timeline"}">Linha do tempo</button></div></div><nav class="agenda-days">${dayNav}</nav><p>${events.length} compromisso(s) nesta semana · ${s.events.length} registros persistidos</p></section>${s.calendarOpen?calendarMarkup:""}<section class="agenda-groups">${s.loading?"":body||`<p class="agenda-empty">Nenhum compromisso nesta semana.</p>`}</section>${editor}</section>`;
  }
  connectedCallback():void{
    let calendarGesture:{id:string;mode:"move"|"duration"|"span";originX:number;originY:number;grabY:number;original:OperationalAgendaEvent;moved:boolean;preview:OperationalAgendaEvent}|null=null,suppressCalendarClick=false;
    const calendarDayAt=(x:number):HTMLElement|null=>{const days=[...this.querySelectorAll<HTMLElement>("[data-calendar-date]")];return days.find(day=>{const rect=day.getBoundingClientRect();return x>=rect.left&&x<=rect.right;})||days.sort((a,b)=>{const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();return Math.abs(x-(ra.left+ra.right)/2)-Math.abs(x-(rb.left+rb.right)/2);})[0]||null;};
    const calendarHoursAt=(body:HTMLElement,y:number):number=>{const rect=body.getBoundingClientRect();return Math.max(0,Math.min(23.5,Math.round(Math.max(0,y-rect.top)/48*2)/2));};
    const saveCalendarGesture=()=>{if(!calendarGesture)return;const gesture=calendarGesture;calendarGesture=null;if(!gesture.moved)return;suppressCalendarClick=true;setTimeout(()=>{suppressCalendarClick=false;},0);this.dispatchEvent(new CustomEvent("atlas:agenda-save",{bubbles:true,detail:{element:this,payload:gesture.preview}}));};
    let pointerController:AbortController|null=null;
    this.addEventListener("pointerdown",event=>{const target=event.target;if(!(target instanceof Element))return;const card=target.closest<HTMLElement>("[data-calendar-event]");if(!card)return;const id=card.dataset.calendarEvent||"",original=this.snapshot.events.find(item=>item.id===id);if(!original)return;const handle=target.closest<HTMLElement>("[data-calendar-resize]"),body=card.closest<HTMLElement>(".agenda-calendar-body");if(!body)return;calendarGesture={id,mode:handle?.dataset.calendarResize==="duration"?"duration":handle?.dataset.calendarResize==="span"?"span":"move",originX:event.clientX,originY:event.clientY,grabY:event.clientY-card.getBoundingClientRect().top,original:{...original},moved:false,preview:{...original}};pointerController?.abort();pointerController=new AbortController();window.addEventListener("pointermove",onCalendarPointerMove,{passive:true,signal:pointerController.signal});window.addEventListener("pointerup",()=>{saveCalendarGesture();pointerController?.abort();},{once:true,signal:pointerController.signal});window.addEventListener("pointercancel",()=>{calendarGesture=null;pointerController?.abort();},{once:true,signal:pointerController.signal});});
    const onCalendarPointerMove=(event:PointerEvent)=>{const g=calendarGesture;if(!g)return;if(Math.hypot(event.clientX-g.originX,event.clientY-g.originY)>3)g.moved=true;if(!g.moved)return;const card=this.querySelector<HTMLElement>(`[data-calendar-event="${CSS.escape(g.id)}"]`);if(!card)return;const day=calendarDayAt(event.clientX);if(!day)return;const date=day.dataset.calendarDate||g.original.date,body=day.querySelector<HTMLElement>(".agenda-calendar-body");if(!body)return;let next={...g.original};if(g.mode==="move"){const start=Math.max(0,Math.min(23.5,calendarHoursAt(body,event.clientY-g.grabY+body.getBoundingClientRect().top)));next={...next,date,start:`${String(Math.floor(start)).padStart(2,"0")}:${start%1?"30":"00"}`,spanDays:Math.min(Math.max(1,Number(g.original.spanDays)||1),7-(new Date(`${date}T12:00:00`).getDay()))};const el=document.elementFromPoint(event.clientX,event.clientY);const targetBody=el instanceof Element?el.closest<HTMLElement>(".agenda-calendar-body"):null;if(targetBody&&targetBody!==body){targetBody.append(card);}}
      if(g.mode==="duration"){const start=Number(String(g.original.start||"08:00").slice(0,2))+Number(String(g.original.start||"08:00").slice(3,5))/60,end=calendarHoursAt(body,event.clientY-body.getBoundingClientRect().top);next={...next,durationHours:Math.max(.5,Math.min(24-start,Math.round((end-start)*2)/2))};}
      if(g.mode==="span"){const first=new Date(`${g.original.date}T12:00:00`),last=new Date(`${date}T12:00:00`),delta=Math.round((last.getTime()-first.getTime())/86400000);next={...next,spanDays:Math.max(1,Math.min(7-first.getDay(),delta+1))};}
      g.preview=next;const [hour,minute]=String(next.start||"08:00").split(":").map(Number),duration=Math.max(.5,Number(next.durationHours)||1);card.style.top=`${(hour+minute/60)*48}px`;card.style.height=`${Math.max(24,duration*48)}px`;card.style.width=`calc(${Math.max(1,Number(next.spanDays)||1)*100}% + ${(Math.max(1,Number(next.spanDays)||1)-1)*8}px)`;};
    this.addEventListener("click",event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest<HTMLButtonElement>("button");if(!button)return;if(button.hasAttribute("data-refresh")){this.dispatchEvent(new CustomEvent("atlas:agenda-refresh",{bubbles:true,detail:{element:this}}));return;}if(button.hasAttribute("data-calendar-toggle")){this.state.next(s=>({...s,calendarOpen:!s.calendarOpen}));return;}if(button.hasAttribute("data-new")){this.state.next(s=>({...s,editor:null,relatedFrom:"",error:null}));return;}if(button.hasAttribute("data-editor-close")){this.state.next(s=>({...s,editor:false,relatedFrom:"",error:null}));return;}if(button.dataset.week){const date=new Date(`${this.snapshot.week}T12:00:00`);date.setDate(date.getDate()+Number(button.dataset.week)*7);this.state.next(s=>({...s,week:agendaIso(date),selectedDate:agendaIso(date)}));return;}if(button.dataset.presentation){this.state.next(s=>({...s,presentation:button.dataset.presentation as AgendaState["presentation"]}));return;}if(button.dataset.day){const date=button.dataset.day||"";this.state.next(s=>({...s,selectedDate:date,presentation:"timeline"}));requestAnimationFrame(()=>this.querySelector<HTMLElement>(`[data-event-date="${CSS.escape(date)}"]`)?.scrollIntoView({behavior:"smooth",block:"nearest"}));return;}if(button.dataset.calendarEvent&&suppressCalendarClick){event.preventDefault();return;}const eventId=button.dataset.eventEdit||button.dataset.calendarEvent;if(eventId){const entry=this.snapshot.events.find(item=>item.id===eventId);if(entry)this.state.next(s=>({...s,editor:entry,relatedFrom:entry.relatedFrom||"",error:null}));return;}if(button.dataset.related){this.state.next(s=>({...s,editor:null,relatedFrom:button.dataset.related||""}));return;}if(button.dataset.delete&&confirm("Excluir este compromisso da agenda?"))this.dispatchEvent(new CustomEvent("atlas:agenda-delete",{bubbles:true,detail:{element:this,id:button.dataset.delete}}));});
    this.addEventListener("submit",event=>{const form=event.target;if(!(form instanceof HTMLFormElement)||!form.matches("[data-agenda-form]"))return;event.preventDefault();const data=new FormData(form),stageName=String(data.get("stageKey")||""),stage=this.snapshot.stages.find(item=>item.name===stageName),activityId=String(data.get("activityId")||""),activity=stage?.activities?.find(item=>item.id===activityId),payload:OperationalAgendaEvent={id:String(data.get("id")||`agenda-${crypto.randomUUID()}`),title:String(data.get("title")||"").trim(),stageKey:stageName,stageName,activityId,activityName:activity?.name||"",owner:String(data.get("owner")||"").trim(),date:String(data.get("date")||""),start:String(data.get("start")||"08:00"),durationHours:Number(data.get("durationHours")||1.5),spanDays:Number(data.get("spanDays")||1),status:String(data.get("status")||"Planejado"),relatedFrom:String(data.get("relatedFrom")||""),notes:String(data.get("notes")||"").trim(),materialIds:data.getAll("materialIds").map(String)};if(!payload.title||!payload.date||!Number.isFinite(payload.durationHours)||payload.durationHours<.5||payload.durationHours>24||!Number.isInteger(payload.spanDays)||payload.spanDays<1||payload.spanDays>366){this.setError("Revise título, data e duração do compromisso.");return;}this.state.next(s=>({...s,saving:true,error:null}));this.dispatchEvent(new CustomEvent("atlas:agenda-save",{bubbles:true,detail:{element:this,payload}}));});
    this.dispatchEvent(new CustomEvent("atlas:agenda-connected",{bubbles:true,detail:{element:this}}));
  }
}
if(!customElements.get("atlas-agenda"))customElements.define("atlas-agenda",AtlasAgenda);

type ActivitiesState = {
  stages: OperationalStage[];
  records: OperationalRecord[];
  materials: OperationalMaterial[];
  selectedStageId: string;
  selectedActivityId: string | null;
  actorRole: string;
  query: string;
  tab: "summary" | "records";
  editingId: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
};
type ActivitiesSetter = (previous: ActivitiesState) => ActivitiesState;

const activitiesStyles = `<style>
.atlas-activities{display:grid;gap:18px;color:#202638}.atlas-activities *{box-sizing:border-box}.atlas-activities h1,.atlas-activities h2,.atlas-activities h3,.atlas-activities p{margin-top:0}.atlas-activities header,.atlas-activities footer,.atlas-activities .atlas-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.atlas-activities>header{flex-wrap:wrap}.atlas-activities .atlas-eyebrow{color:#3977d5;font:700 10px ui-monospace,monospace;letter-spacing:.08em}.atlas-activities h1{margin:6px 0;font-size:clamp(24px,3vw,32px);color:#19243b}.atlas-activities header p,.atlas-activities .atlas-muted{margin:0;color:#6d788a;font-size:13px}.atlas-activities button,.atlas-activities input,.atlas-activities select,.atlas-activities textarea{font:inherit}.atlas-activities button{min-height:38px;padding:8px 13px;border:1px solid #d9e0eb;border-radius:9px;background:#fff;color:#26334b;cursor:pointer}.atlas-activities button:hover{border-color:#76a4ee;background:#f5f8fe}.atlas-activities button.atlas-primary{border-color:#246be0;background:#246be0;color:#fff}.atlas-activities .atlas-panel{min-width:0;padding:18px;border:1px solid #e0e6ef;border-radius:14px;background:#fff;box-shadow:0 4px 16px #192b4910}.atlas-activities .atlas-toolbar{display:flex;align-items:end;gap:12px;flex-wrap:wrap;padding:14px;border:1px solid #e1e6ed;border-radius:13px;background:#f7f9fc}.atlas-activities label{display:grid;gap:6px;color:#59667a;font-size:12px}.atlas-activities input,.atlas-activities select,.atlas-activities textarea{width:100%;min-height:40px;padding:9px 11px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e}.atlas-activities .atlas-toolbar label{flex:1;min-width:210px}.atlas-activities .atlas-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}.atlas-activities .atlas-row{display:grid;grid-template-columns:42px minmax(0,1fr) minmax(150px,210px) auto;align-items:center;gap:14px;padding:14px;border:1px solid #e4e8ef;border-radius:12px;background:#fff}.atlas-activities .atlas-number{color:#8a95a6;font:12px ui-monospace,monospace}.atlas-activities .atlas-row-main{display:grid;gap:4px;min-width:0;text-align:left;border:0;padding:0;background:transparent}.atlas-activities .atlas-row-main strong{color:#1e2b43}.atlas-activities .atlas-row-main small,.atlas-activities .atlas-row-stage{color:#738095;font-size:12px}.atlas-activities .atlas-row-state{display:grid;gap:5px;color:#46546a;font-size:12px}.atlas-activities .atlas-progress{height:5px;overflow:hidden;border-radius:5px;background:#e9edf3}.atlas-activities .atlas-progress i{display:block;height:100%;background:#3478dc}.atlas-activities .atlas-row-actions{display:flex;gap:6px;flex-wrap:wrap}.atlas-activities .atlas-editor,.atlas-activities .atlas-record-form{display:grid;gap:13px}.atlas-activities .atlas-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.atlas-activities .atlas-wide{grid-column:1/-1}.atlas-activities textarea{min-height:90px;resize:vertical}.atlas-activities .atlas-detail-head{align-items:flex-start}.atlas-activities .atlas-detail-head>div{min-width:0}.atlas-activities .atlas-detail-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.atlas-activities .atlas-detail-meta span{padding:6px 9px;border:1px solid #e1e6ed;border-radius:99px;color:#667287;font-size:12px}.atlas-activities .atlas-tabs{display:flex;gap:6px;border-bottom:1px solid #e3e7ee}.atlas-activities .atlas-tabs button[aria-pressed=true]{border-color:#252634;background:#252634;color:#fff}.atlas-activities .atlas-error{color:#a32d3a}.atlas-activities .atlas-empty{padding:22px;text-align:center;color:#768296}.atlas-activities table{width:100%;border-collapse:collapse}.atlas-activities th,.atlas-activities td{padding:10px;text-align:left;border-bottom:1px solid #edf0f4;font-size:13px;vertical-align:top}.atlas-activities th{color:#778296;font-size:11px;text-transform:uppercase}.atlas-activities dialog{width:min(620px,calc(100vw - 28px));max-height:90vh;overflow:auto;border:1px solid #dfe5ed;border-radius:16px;padding:20px;color:#202638}.atlas-activities dialog::backdrop{background:#10182880}.atlas-activities dialog form footer{justify-content:flex-end;flex-wrap:wrap}.atlas-activities dialog textarea{min-height:110px}@media(max-width:760px){.atlas-activities .atlas-row{grid-template-columns:30px minmax(0,1fr);gap:9px}.atlas-activities .atlas-row-state,.atlas-activities .atlas-row-actions{grid-column:2}.atlas-activities .atlas-fields{grid-template-columns:1fr}.atlas-activities .atlas-wide{grid-column:auto}.atlas-activities .atlas-panel{padding:14px}.atlas-activities table{min-width:650px}.atlas-activities .atlas-table-scroll{overflow:auto}}
</style>`;

/** Atlas list/detail route for persisted stage activities and their real records. */
export class AtlasActivities extends HTMLElement {
  private snapshot: ActivitiesState = { stages: [], records: [], materials: [], selectedStageId: "all", selectedActivityId: null, actorRole: "", query: "", tab: "summary", editingId: null, loading: true, saving: false, error: null, loaded: false };
  private state: { next(setter: ActivitiesSetter): ActivitiesState };

  constructor() {
    super();
    const initial = this.snapshot;
    function* state(value: ActivitiesState): Generator<ActivitiesState, never, ActivitiesSetter> { while (true) value = (yield value)(value); }
    const iterator = state(initial); iterator.next();
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; this.render(); return this.snapshot; } };
  }

  connectedCallback(): void {
    this.addEventListener("click", event => {
      const target = event.target; if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button"); if (!button) return;
      // Keep this element's local detail/editor actions from reaching legacy
      // shell click delegates that still own other activity surfaces.
      event.stopPropagation();
      if (button.hasAttribute("data-activity-refresh")) { this.dispatchEvent(new CustomEvent("atlas:activities-refresh", { bubbles: true, detail: { element: this } })); return; }
      if (button.hasAttribute("data-atlas-activity-back")) { this.state.next(s => ({ ...s, selectedActivityId: null, tab: "summary", editingId: null })); return; }
      if (button.hasAttribute("data-activity-record-close")) { this.querySelector<HTMLDialogElement>("[data-activity-record-dialog]")?.close(); return; }
      if (button.dataset.activityTab) { this.state.next(s => ({ ...s, tab: button.dataset.activityTab as ActivitiesState["tab"] })); return; }
      if (button.hasAttribute("data-activity-record-new")) { const dialog = this.querySelector<HTMLDialogElement>("[data-activity-record-dialog]"); dialog?.showModal(); return; }
      if (button.hasAttribute("data-activity-editor-cancel")) { this.state.next(s => ({ ...s, editingId: null, error: null })); return; }
      if (button.hasAttribute("data-activity-new")) { this.state.next(s => ({ ...s, editingId: "new", error: null })); return; }
      if (button.dataset.activityEdit) { this.state.next(s => ({ ...s, editingId: button.dataset.activityEdit || null, error: null })); return; }
      if (button.dataset.atlasActivityOpen) { this.state.next(s => ({ ...s, selectedActivityId: button.dataset.atlasActivityOpen || null, tab: "summary", editingId: null })); return; }
      if (button.dataset.activityDelete && globalThis.confirm?.("Excluir esta atividade persistida?")) { this.state.next(s => ({ ...s, saving: true, error: null })); this.dispatchEvent(new CustomEvent("atlas:activity-delete", { bubbles: true, detail: { element: this, id: button.dataset.activityDelete } })); }
    });
    this.addEventListener("input", event => { const target = event.target; if (target instanceof HTMLInputElement && target.matches("[data-activity-query]")) this.state.next(s => ({ ...s, query: target.value })); });
    this.addEventListener("change", event => { const target = event.target; if (target instanceof HTMLSelectElement && target.matches("[data-activity-stage-filter]")) this.state.next(s => ({ ...s, selectedStageId: target.value })); });
    this.addEventListener("submit", event => {
      const form = event.target; if (!(form instanceof HTMLFormElement)) return;
      if (form.matches("[data-activity-editor]")) {
        event.preventDefault(); const data = new FormData(form), id = String(data.get("id") || "");
        const payload = { stageId: Number(data.get("stageId")), name: String(data.get("name") || "").trim(), category: String(data.get("category") || "").trim(), status: String(data.get("status") || ""), progress: Number(data.get("progress")), plannedStart: String(data.get("plannedStart") || "") || null, plannedEnd: String(data.get("plannedEnd") || "") || null };
        if (!payload.stageId || !payload.name || !payload.category || !Number.isFinite(payload.progress) || payload.progress < 0 || payload.progress > 100 || (payload.plannedStart && payload.plannedEnd && payload.plannedEnd < payload.plannedStart)) { this.setError("Revise etapa, nome, categoria, progresso e intervalo de datas."); return; }
        this.state.next(s => ({ ...s, saving: true, error: null })); this.dispatchEvent(new CustomEvent("atlas:activity-save", { bubbles: true, detail: { element: this, id: id || null, payload } })); return;
      }
      if (form.matches("[data-activity-record-form]")) {
        event.preventDefault(); const data = new FormData(form), activity = this.selectedActivity(); if (!activity) { this.setError("A atividade selecionada não está mais disponível no banco operacional."); return; }
        const stage = this.snapshot.stages.find(item => item.id === activity.stageId); if (!stage) { this.setError("A etapa vinculada não está mais disponível."); return; }
        const payload = { obra: "Aliança Park", etapa: stage.name, stageKey: stage.key || "", atividade: activity.name, activityId: activity.id, data: String(data.get("data") || ""), hora: String(data.get("hora") || ""), responsavel: String(data.get("responsavel") || "").trim(), detalhes: String(data.get("detalhes") || "").trim(), evidenceUri: String(data.get("evidenceUri") || "").trim(), status: String(data.get("status") || "Pendente") };
        if (!payload.data || !payload.hora || !payload.responsavel || !payload.detalhes) { this.setError("Data, hora, responsável e detalhes são obrigatórios."); return; }
        this.state.next(s => ({ ...s, saving: true, error: null })); this.dispatchEvent(new CustomEvent("atlas:activity-record-create", { bubbles: true, detail: { element: this, payload } }));
      }
    });
    this.render(); this.dispatchEvent(new CustomEvent("atlas:activities-connected", { bubbles: true, detail: { element: this } }));
  }

  setLoading(): void { this.state.next(s => ({ ...s, loading: true, error: null })); }
  setData(stages: OperationalStage[], records: OperationalRecord[], materials: OperationalMaterial[], actorRole = "", selectedActivityId?: string | null): void { this.state.next(s => ({ ...s, stages, records, materials, actorRole, selectedActivityId: selectedActivityId === undefined ? s.selectedActivityId : selectedActivityId, loaded: true, loading: false, saving: false, error: null })); }
  setError(message: string): void { this.state.next(s => ({ ...s, loading: false, saving: false, loaded: true, error: message })); }
  setSavingError(message: string): void { this.setError(message); }
  private escape(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char)); }
  private activities(): Array<OperationalActivity & { stageContext: OperationalStage }> { return this.snapshot.stages.flatMap(stage => (stage.activities || []).map(activity => ({ ...activity, stageId: Number(activity.stageId) || stage.id, stageContext: stage }))); }
  private selectedActivity(): (OperationalActivity & { stageContext: OperationalStage }) | null {
    const id = this.snapshot.selectedActivityId; if (!id) return null;
    const rows = this.activities(), direct = rows.find(activity => activity.id === id); if (direct) return direct;
    const [stageKey, packetKey] = id.split(":");
    const stage = this.snapshot.stages.find(item => item.key === stageKey);
    return stage?.activities?.map(activity => ({ ...activity, stageContext: stage })).find(activity => String(activity.properties?.flowPacketKey || "") === packetKey || activity.id === `auto-${stageKey}-${packetKey}`) || null;
  }
  private render(): void {
    const s = this.snapshot, esc = (value: unknown) => this.escape(value), activities = this.activities(), selected = this.selectedActivity();
    const progressPercent = (activity: OperationalActivity) => Math.round(Math.max(0, Math.min(100, Number(activity.progress) || 0)));
    const filtered = activities.filter(item => (s.selectedStageId === "all" || String(item.stageId) === s.selectedStageId) && `${item.name} ${item.category || ""} ${item.stageContext.name} ${item.status}`.toLocaleLowerCase("pt-BR").includes(s.query.toLocaleLowerCase("pt-BR")));
    const canEdit = ["owner", "admin"].includes(s.actorRole);
    const editing = s.editingId && s.editingId !== "new" ? activities.find(item => item.id === s.editingId) : null;
    const rows = filtered.map((item, index) => {
      const automated = item.id.startsWith("auto-") || item.properties?.source === "automation";
      const progress = progressPercent(item);
      return `<li class="atlas-row"><span class="atlas-number">${String(index + 1).padStart(2, "0")}</span><button class="atlas-row-main" type="button" data-atlas-activity-open="${esc(item.id)}"><span class="atlas-row-stage">${esc(item.stageContext.name)} · ${esc(item.category || "Atividade")}${automated ? " · automática" : ""}</span><strong>${esc(item.name)}</strong><small>${esc(item.plannedStart || "Sem data inicial")}${item.plannedEnd ? ` — ${item.plannedEnd}` : ""}</small></button><div class="atlas-row-state"><span>${esc(item.status || "Não informado")}</span><small>${progress}% concluído</small><i class="atlas-progress"><i style="width:${progress}%"></i></i></div><div class="atlas-row-actions">${canEdit && !automated ? `<button type="button" data-activity-edit="${esc(item.id)}">Editar</button><button type="button" data-activity-delete="${esc(item.id)}">Excluir</button>` : ""}</div></li>`;
    }).join("");
    if (selected) {
      const linkedMaterials = s.materials.filter(item => item.stageId === selected.stageId && (!item.activityName || item.activityName === selected.name));
      const records = s.records.filter(record => String(record.stageId || "") === String(selected.stageId) && (String(record.activityId || "") === selected.id || String(record.atividade || "").toLocaleLowerCase("pt-BR") === selected.name.toLocaleLowerCase("pt-BR"))).slice().reverse();
      const date = new Date().toISOString().slice(0, 10);
      this.innerHTML = `${activitiesStyles}<section class="atlas-activities"><header class="atlas-detail-head"><div><button type="button" data-atlas-activity-back>← Atividades</button><span class="atlas-eyebrow">ATIVIDADE · ${esc(selected.stageContext.name.toLocaleUpperCase("pt-BR"))}</span><h1>${esc(selected.name)}</h1><p>${esc(selected.category || "Atividade")}${selected.stageContext.owner ? ` · ${esc(selected.stageContext.owner)}` : ""}</p><div class="atlas-detail-meta"><span>Status: ${esc(selected.status || "Não informado")}</span><span>${progressPercent(selected)}% concluído</span><span>${esc(selected.plannedStart || "Sem data inicial")}${selected.plannedEnd ? ` — ${esc(selected.plannedEnd)}` : ""}</span></div></div><div class="atlas-actions"><button type="button" data-activity-refresh>Atualizar dados</button><button type="button" class="atlas-primary" data-activity-record-new>+ Novo registro</button></div></header>${s.error ? `<p class="atlas-error" role="alert">${esc(s.error)}</p>` : ""}<nav class="atlas-tabs"><button type="button" data-activity-tab="summary" aria-pressed="${s.tab === "summary"}">Resumo</button><button type="button" data-activity-tab="records" aria-pressed="${s.tab === "records"}">Registros (${records.length})</button></nav>${s.tab === "summary" ? `<div class="atlas-panel"><h2>Etapa e recursos vinculados</h2><p>${esc(selected.stageContext.description || "A API não forneceu descrição operacional para esta etapa.")}</p><h3>Materiais relacionados</h3>${linkedMaterials.length ? `<ul>${linkedMaterials.map(item => `<li>${esc(item.name)} · ${esc(item.receivedQuantity)} ${esc(item.unit)} · ${esc(item.status)}</li>`).join("")}</ul>` : `<p class="atlas-muted">Nenhum material persistido está associado a esta atividade.</p>`}</div>` : `<div class="atlas-panel"><header><h2>Registros persistidos desta atividade</h2><span>${records.length} registro(s)</span></header>${records.length ? `<div class="atlas-table-scroll"><table><thead><tr><th>Data</th><th>Responsável</th><th>Apontamento</th><th>Status</th></tr></thead><tbody>${records.map(record => `<tr><td>${esc(record.data || "—")} ${esc(record.hora || "")}</td><td>${esc(record.responsavel || "—")}</td><td>${esc(record.detalhes || "—")}</td><td>${esc(record.status || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="atlas-empty">Nenhum registro persistido corresponde a esta atividade.</p>`}</div>`}<dialog data-activity-record-dialog><header><div><span class="atlas-eyebrow">DIÁRIO DE OBRA</span><h2>Novo registro de atividade</h2><p>${esc(selected.stageContext.name)} · ${esc(selected.name)}</p></div><button type="button" data-activity-record-close aria-label="Fechar">×</button></header><form data-activity-record-form><div class="atlas-fields"><label>Data<input type="date" name="data" value="${date}" required></label><label>Hora<input type="time" name="hora" value="08:30" required></label><label class="atlas-wide">Responsável<input name="responsavel" placeholder="Encarregado ou equipe" required></label><label class="atlas-wide">Detalhes / medição<textarea name="detalhes" required placeholder="Quantidade, ocorrência, medição ou evidência"></textarea></label><label class="atlas-wide">Referência da evidência<input name="evidenceUri" placeholder="URL ou caminho persistido (opcional)"></label><label>Status<select name="status"><option>Pendente</option><option>Concluído</option></select></label></div>${s.error ? `<p class="atlas-error" role="alert">${esc(s.error)}</p>` : ""}<footer><button type="button" data-activity-record-close>Cancelar</button><button type="submit" class="atlas-primary" ${s.saving ? "disabled" : ""}>${s.saving ? "Salvando…" : "Salvar no Diário"}</button></footer></form></dialog></section>`;
      this.querySelectorAll("[data-activity-record-close]").forEach(button => button.addEventListener("click", () => this.querySelector<HTMLDialogElement>("[data-activity-record-dialog]")?.close()));
      return;
    }
    const stageOptions = s.stages.map(stage => `<option value="${esc(stage.id)}" ${String(stage.id) === String(editing?.stageId || (s.selectedStageId !== "all" ? s.selectedStageId : s.stages[0]?.id)) ? "selected" : ""}>${esc(stage.name)}</option>`).join("");
    const editor = s.editingId ? `<form class="atlas-panel atlas-editor" data-activity-editor><header><h2>${editing ? "Editar atividade" : "Nova atividade"}</h2><button type="button" data-activity-editor-cancel>Cancelar</button></header><input type="hidden" name="id" value="${esc(editing?.id || "")}"><div class="atlas-fields"><label>Etapa<select name="stageId" required>${stageOptions}</select></label><label>Nome<input name="name" maxlength="200" required value="${esc(editing?.name || "")}"></label><label>Categoria<input name="category" maxlength="100" required value="${esc(editing?.category || "Execução")}"></label><label>Status<select name="status">${["planejado","pendente","andamento","bloqueado","concluido"].map(status => `<option ${status === (editing?.status || "planejado") ? "selected" : ""}>${status}</option>`).join("")}</select></label><label>Progresso (%)<input name="progress" type="number" min="0" max="100" value="${esc(editing?.progress ?? 0)}"></label><label>Início planejado<input name="plannedStart" type="date" value="${esc(String(editing?.plannedStart || "").slice(0,10))}"></label><label>Fim planejado<input name="plannedEnd" type="date" value="${esc(String(editing?.plannedEnd || "").slice(0,10))}"></label></div>${s.error ? `<p class="atlas-error" role="alert">${esc(s.error)}</p>` : ""}<footer><button type="submit" class="atlas-primary" ${s.saving ? "disabled" : ""}>${s.saving ? "Salvando…" : "Salvar atividade"}</button></footer></form>` : "";
    this.innerHTML = `${activitiesStyles}<section class="atlas-activities"><header><div><span class="atlas-eyebrow">CRONOGRAMA · ATIVIDADES</span><h1>Atividades</h1><p>Lista de atividades persistidas nas etapas da obra.</p></div><div class="atlas-actions">${canEdit && s.loaded && !s.error ? `<button type="button" class="atlas-primary" data-activity-new>+ Nova atividade</button>` : ""}<button type="button" data-activity-refresh>Atualizar</button></div></header>${s.error && !s.editingId ? `<p class="atlas-error" role="alert">Não foi possível carregar as atividades: ${esc(s.error)}</p>` : ""}${s.selectedActivityId && !selected ? `<p class="atlas-error" role="alert">A atividade selecionada (${esc(s.selectedActivityId)}) não foi encontrada entre as atividades persistidas. Atualize a etapa ou volte à lista.</p>` : ""}${s.loading ? `<p class="atlas-muted">Carregando atividades do banco operacional…</p>` : ""}${editor}<div class="atlas-toolbar"><label>Etapa<select data-activity-stage-filter><option value="all" ${s.selectedStageId === "all" ? "selected" : ""}>Todas as etapas</option>${s.stages.map(stage => `<option value="${esc(stage.id)}" ${String(stage.id) === s.selectedStageId ? "selected" : ""}>${esc(stage.name)}</option>`).join("")}</select></label><label>Buscar<input data-activity-query type="search" value="${esc(s.query)}" placeholder="Nome, categoria ou etapa"></label><span>${filtered.length} atividade(s) · ${activities.length} no total</span></div><ul class="atlas-list">${rows || (!s.loading ? `<li class="atlas-empty">${s.loaded ? "Nenhuma atividade persistida corresponde aos filtros." : "Aguardando resposta do serviço."}</li>` : "")}</ul></section>`;
  }
}
if (!customElements.get("atlas-activities")) customElements.define("atlas-activities", AtlasActivities);

type ProgressPeriod = "today" | "yesterday" | "week" | "all";
type ProgressState = {
  stages: OperationalStage[];
  records: OperationalRecord[];
  materials: OperationalMaterial[];
  agendaEvents: OperationalAgendaEvent[];
  selectedStageId: string;
  period: ProgressPeriod;
  expandedRecordId: string | null;
  formOpen: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  feedback: string;
};
type ProgressSetter = (previous: ProgressState) => ProgressState;

const progressStyles = `<style>
  .atlas-progress-page{display:grid;gap:18px;color:#20283a}.atlas-progress-page *{box-sizing:border-box}.atlas-progress-page h1,.atlas-progress-page h2,.atlas-progress-page h3,.atlas-progress-page p{margin-top:0}.atlas-progress-page button,.atlas-progress-page input,.atlas-progress-page select,.atlas-progress-page textarea{font:inherit}.atlas-progress-page button{min-height:38px;padding:8px 12px;border:1px solid #d9e0eb;border-radius:9px;background:#fff;color:#26334b;cursor:pointer}.atlas-progress-page button:hover{border-color:#76a4ee;background:#f5f8fe}.atlas-progress-page .atlas-primary{border-color:#246be0;background:#246be0;color:#fff}.atlas-progress-page header,.atlas-progress-page .atlas-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.atlas-progress-page .atlas-eyebrow{color:#3977d5;font:700 10px ui-monospace,monospace;letter-spacing:.08em}.atlas-progress-page h1{margin:6px 0;font-size:clamp(24px,3vw,32px);color:#19243b}.atlas-progress-page .atlas-muted{margin:0;color:#6d788a;font-size:13px}.atlas-progress-page .atlas-error{padding:12px;border:1px solid #efc7c7;border-radius:9px;background:#fff7f7;color:#9b2935}.atlas-progress-page .atlas-map{height:230px;overflow:hidden;border:1px solid #dfe5ed;border-radius:13px;background:#eef1f4}.atlas-progress-page .atlas-map map-scene{display:block;width:100%;height:100%}.atlas-progress-page .atlas-toolbar,.atlas-progress-page .atlas-panel{min-width:0;padding:16px;border:1px solid #e0e6ef;border-radius:13px;background:#fff;box-shadow:0 4px 16px #192b4910}.atlas-progress-page .atlas-toolbar{display:flex;align-items:end;gap:10px;flex-wrap:wrap;background:#f7f9fc}.atlas-progress-page label{display:grid;gap:5px;color:#59667a;font-size:12px}.atlas-progress-page input,.atlas-progress-page select,.atlas-progress-page textarea{min-height:40px;padding:9px 11px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e}.atlas-progress-page .atlas-stage-select{min-width:220px;flex:1}.atlas-progress-page .atlas-periods{display:flex;gap:5px;overflow:auto}.atlas-progress-page .atlas-periods button{white-space:nowrap}.atlas-progress-page .atlas-periods button[aria-pressed=true]{border-color:#2e70d4;background:#edf4ff;color:#1e59ad}.atlas-progress-page .atlas-sync{margin-left:auto;color:#738095;font-size:11px}.atlas-progress-page .atlas-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:14px;align-items:start}.atlas-progress-page .atlas-journal,.atlas-progress-page .atlas-rail{display:grid;gap:12px;min-width:0}.atlas-progress-page .atlas-panel>header{margin-bottom:12px}.atlas-progress-page .atlas-panel h2{margin:0;font-size:17px;color:#1e2b43}.atlas-progress-page .atlas-count{color:#738095;font-size:12px}.atlas-progress-page .atlas-records{display:grid;gap:9px}.atlas-progress-page .atlas-record{display:grid;grid-template-columns:78px 12px minmax(0,1fr);gap:12px;align-items:start;padding:14px;border:1px solid #e4e8ef;border-radius:12px;background:#fff}.atlas-progress-page .atlas-record time{color:#3977d5;font:700 13px ui-monospace,monospace}.atlas-progress-page .atlas-record time small{display:block;margin-top:5px;color:#7b8697;font:11px system-ui,sans-serif}.atlas-progress-page .atlas-marker{width:10px;height:10px;margin-top:4px;border:2px solid #3478dc;border-radius:50%;background:#fff}.atlas-progress-page .atlas-record[data-complete=true] .atlas-marker{border-color:#348e6b;background:#348e6b}.atlas-progress-page .atlas-record-main{min-width:0}.atlas-progress-page .atlas-record-main>header{align-items:flex-start}.atlas-progress-page .atlas-record h3{margin:3px 0 5px;font-size:15px;color:#1e2b43}.atlas-progress-page .atlas-record p{margin:8px 0 0;color:#667287;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}.atlas-progress-page .atlas-record-meta{display:flex;gap:8px;flex-wrap:wrap;color:#738095;font-size:11px}.atlas-progress-page .atlas-status{padding:4px 7px;border:1px solid #dfe5ed;border-radius:99px;color:#52627b;font-size:11px;white-space:nowrap}.atlas-progress-page .atlas-record-detail{display:grid;gap:8px;margin-top:11px;padding-top:11px;border-top:1px solid #edf0f4}.atlas-progress-page .atlas-record-detail a{color:#246be0;overflow-wrap:anywhere}.atlas-progress-page .atlas-empty{padding:24px;text-align:center;color:#768296}.atlas-progress-page .atlas-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.atlas-progress-page .atlas-metrics div{display:grid;gap:4px;padding:11px;border-radius:9px;background:#f6f8fb}.atlas-progress-page .atlas-metrics strong{font-size:20px;color:#1e2b43}.atlas-progress-page .atlas-metrics span,.atlas-progress-page .atlas-next small{color:#738095;font-size:11px}.atlas-progress-page .atlas-bar{height:7px;margin:12px 0 7px;overflow:hidden;border-radius:7px;background:#e9edf3}.atlas-progress-page .atlas-bar i{display:block;height:100%;background:#3478dc}.atlas-progress-page .atlas-next{display:grid;gap:4px;padding:10px 0;border-top:1px solid #edf0f4}.atlas-progress-page .atlas-next time{color:#3977d5;font:11px ui-monospace,monospace}.atlas-progress-page .atlas-next strong{color:#29364c;font-size:13px}.atlas-progress-page .atlas-materials{display:grid;gap:7px;margin:0;padding:0;list-style:none}.atlas-progress-page .atlas-materials li{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #edf0f4;color:#52627b;font-size:12px}.atlas-progress-page .atlas-form{display:grid;gap:12px}.atlas-progress-page .atlas-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.atlas-progress-page .atlas-wide{grid-column:1/-1}.atlas-progress-page textarea{min-height:94px;resize:vertical}.atlas-progress-page .atlas-form footer{display:flex;justify-content:flex-end;gap:8px}.atlas-progress-page .atlas-feedback{min-height:18px;color:#52627b;font-size:12px}@media(max-width:760px){.atlas-progress-page .atlas-map{height:180px}.atlas-progress-page .atlas-layout{grid-template-columns:1fr}.atlas-progress-page .atlas-toolbar{align-items:stretch;flex-direction:column}.atlas-progress-page .atlas-stage-select{min-width:0;width:100%}.atlas-progress-page .atlas-sync{margin:0}.atlas-progress-page .atlas-record{grid-template-columns:58px 10px minmax(0,1fr);gap:8px;padding:11px}.atlas-progress-page .atlas-fields{grid-template-columns:1fr}.atlas-progress-page .atlas-wide{grid-column:auto}}
</style>`;

/** Live stage diary; all filters, disclosure, and form state are owned by this element. */
export class AtlasProgress extends HTMLElement {
  private snapshot: ProgressState;
  private readonly state: AtomicState<ProgressState>;

  constructor() {
    super();
    const initial: ProgressState = { stages: [], records: [], materials: [], agendaEvents: [], selectedStageId: "", period: "today", expandedRecordId: null, formOpen: false, loading: true, saving: false, error: null, feedback: "" };
    function* state(value: ProgressState): Generator<ProgressState, never, ProgressSetter> { while (true) value = (yield value)(value); }
    const iterator = state(initial); iterator.next(); this.snapshot = initial;
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; this.render(); return this.snapshot; } };
  }

  connectedCallback(): void {
    this.render();
    this.dispatchEvent(new CustomEvent("atlas:progress-connected", { bubbles: true, detail: { element: this } }));
  }

  setLoading(): void { this.state.next(s => ({ ...s, loading: true, error: null })); }
  setRouteStage(stageId: unknown): void { this.state.next(s => ({ ...s, selectedStageId: String(stageId ?? "") })); }
  setData(data: Pick<ProgressState, "stages" | "records" | "materials" | "agendaEvents">): void {
    this.state.next(s => ({ ...s, ...data, selectedStageId: String(data.stages.find(stage => String(stage.id) === s.selectedStageId || String(stage.key || "") === s.selectedStageId)?.id || data.stages[0]?.id || ""), loading: false, error: null }));
  }
  setSaving(saving: boolean): void { this.state.next(s => ({ ...s, saving, error: null, feedback: saving ? "Salvando registro…" : s.feedback })); }
  setError(message: string): void { this.state.next(s => ({ ...s, loading: false, saving: false, error: message })); }
  setFeedback(message: string): void { this.state.next(s => ({ ...s, saving: false, feedback: message })); }

  private esc(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char] || char)); }
  private today(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
  private selectedStage(): OperationalStage | undefined { return this.snapshot.stages.find(stage => String(stage.id) === this.snapshot.selectedStageId || String(stage.key || "") === this.snapshot.selectedStageId); }
  private stageMatches(record: OperationalRecord, stage: OperationalStage): boolean {
    return String(record.stageId ?? "") === String(stage.id) || String(record.stageKey ?? "") === String(stage.key || "") || String(record.etapa || "").toLocaleLowerCase("pt-BR") === stage.name.toLocaleLowerCase("pt-BR");
  }
  private stageOverlay(stage: OperationalStage): string {
    const name = stage.name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (name.includes("terra")) return "terraplanagem";
    if (name.includes("dren")) return "drenagem";
    if (name.includes("agua")) return "rede-agua";
    if (name.includes("eletric")) return "rede-eletrica";
    if (name.includes("paviment") || name.includes("meio-fio") || name.includes("guia")) return "pavimentacao";
    if (name.includes("projeto") || name.includes("urban") || name.includes("praca") || name.includes("arbor")) return "urbanizacao";
    return "drenagem";
  }
  private render(): void {
    const s = this.snapshot, esc = (value: unknown) => this.esc(value), stage = this.selectedStage(), today = this.today();
    const stageRecords = stage ? s.records.filter(record => this.stageMatches(record, stage)) : [];
    const dateNow = new Date(`${today}T12:00:00`), yesterdayDate = new Date(dateNow); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;
    const weekStart = new Date(dateNow); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const filtered = stageRecords.filter(record => {
      const date = String(record.data || "").slice(0, 10);
      if (s.period === "today") return date === today;
      if (s.period === "yesterday") return date === yesterday;
      if (s.period === "week") return date >= iso(weekStart) && date <= iso(weekEnd);
      return true;
    }).sort((a, b) => `${b.data || ""}T${b.hora || "00:00"}`.localeCompare(`${a.data || ""}T${a.hora || "00:00"}`));
    const completed = stageRecords.filter(record => /conclu|validad|aprovad/i.test(String(record.status || ""))).length;
    const pending = stageRecords.length - completed;
    const upcoming = s.agendaEvents.filter(event => (!stage || String(event.stageKey || "") === String(stage.key || "") || String(event.stageName || "").toLocaleLowerCase("pt-BR") === stage.name.toLocaleLowerCase("pt-BR")) && String(event.date || "") >= today && !/conclu|cancel/i.test(event.status || "")).sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`)).slice(0, 4);
    const materials = s.materials.filter(item => stage && (String(item.stageId ?? "") === String(stage.id) || String(item.stageName || "").toLocaleLowerCase("pt-BR") === stage.name.toLocaleLowerCase("pt-BR")));
    const recordsMarkup = filtered.map(record => {
      const complete = /conclu|validad|aprovad/i.test(String(record.status || ""));
      const evidence = String(record.evidenceUri || "").trim();
      const safeEvidence = /^(https?:\/\/|\/)/i.test(evidence) ? evidence : "";
      const expanded = s.expandedRecordId === record.id;
      return `<article class="atlas-record" data-record="${esc(record.id)}" data-complete="${complete}"><time>${esc(record.hora || "—")}<small>${esc(record.data || "Data não informada")}</small></time><i class="atlas-marker" aria-hidden="true"></i><div class="atlas-record-main"><header><div><span class="atlas-eyebrow">${esc(record.atividade || "Registro de campo")}</span><h3>${esc(record.detalhes || "Registro sem descrição")}</h3><div class="atlas-record-meta"><span>${esc(record.responsavel || "Responsável não informado")}</span><span>${esc(record.etapa || stage?.name || "Etapa não informada")}</span></div></div><span class="atlas-status">${esc(record.status || "Status não informado")}</span></header>${expanded ? `<div class="atlas-record-detail">${record.mapArea ? `<span>Área vinculada: ${esc(typeof record.mapArea === "string" ? record.mapArea : JSON.stringify(record.mapArea))}</span>` : ""}${safeEvidence ? `<a href="${esc(safeEvidence)}" target="_blank" rel="noopener noreferrer">Abrir evidência persistida</a>` : evidence ? `<span>Evidência registrada: ${esc(evidence)}</span>` : `<span>Sem evidência vinculada a este registro.</span>`}</div>` : ""}</div></article>`;
    }).join("");
    const activityOptions = (stage?.activities || []).map(activity => `<option value="${esc(activity.name)}">${esc(activity.name)}</option>`).join("");
    const defaultDate = today;
    this.innerHTML = `${progressStyles}<section class="atlas-progress-page"><header><div><span class="atlas-eyebrow">DIÁRIO DE OBRA · ${esc(stage?.name || "Etapa")}</span><h1>Andamento da obra</h1><p class="atlas-muted">Registros de campo, evidências vinculadas e compromissos persistidos para a etapa.</p></div><div class="atlas-actions"><button type="button" data-progress-refresh>Atualizar</button><button type="button" class="atlas-primary" data-progress-new ${s.loading || !stage ? "disabled" : ""}>+ Novo apontamento</button></div></header>${stage ? `<section class="atlas-map" aria-label="Mapa da etapa"><map-scene data-stage-header-map data-stage="${esc(stage.name)}" aria-label="Mapa operacional de ${esc(stage.name)}"></map-scene></section>` : ""}${s.error ? `<p class="atlas-error" role="alert">${esc(s.error)}</p>` : ""}<section class="atlas-toolbar"><div class="atlas-periods" role="group" aria-label="Período do diário">${([["today","Hoje"],["yesterday","Ontem"],["week","Semana atual"],["all","Todo o período"]] as Array<[ProgressPeriod,string]>).map(([period,label]) => `<button type="button" data-progress-period="${period}" aria-pressed="${s.period === period}">${label}</button>`).join("")}</div><label class="atlas-stage-select">Etapa<select data-progress-stage>${s.stages.map(item => `<option value="${esc(item.id)}" ${String(item.id) === s.selectedStageId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label><span class="atlas-sync">${s.loading ? "Atualizando dados do serviço…" : `${stageRecords.length} registro(s) · sincronizado com o serviço`}</span></section><div class="atlas-layout"><main class="atlas-journal"><section class="atlas-panel"><header><div><span class="atlas-eyebrow">REGISTROS PERSISTIDOS</span><h2>Diário da etapa</h2></div><span class="atlas-count">${filtered.length} neste período</span></header>${s.loading ? `<p class="atlas-muted">Carregando diário operacional…</p>` : recordsMarkup ? `<div class="atlas-records">${recordsMarkup}</div>` : `<p class="atlas-empty">Nenhum registro persistido corresponde a esta etapa e período.</p>`}</section>${s.formOpen ? `<form class="atlas-panel atlas-form" data-progress-form><header><div><span class="atlas-eyebrow">NOVO APONTAMENTO</span><h2>Registrar avanço ou ocorrência</h2></div><button type="button" data-progress-cancel aria-label="Fechar formulário">Cancelar</button></header><div class="atlas-fields"><label>Etapa<select name="etapa" required>${s.stages.map(item => `<option value="${esc(item.id)}" ${String(item.id) === s.selectedStageId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label><label>Atividade<select name="atividade" required>${activityOptions || `<option value="">Nenhuma atividade cadastrada para esta etapa</option>`}</select></label><label>Data<input type="date" name="data" value="${defaultDate}" required></label><label>Hora<input type="time" name="hora" value="${new Date().toTimeString().slice(0,5)}" required></label><label>Responsável<input name="responsavel" maxlength="160" required placeholder="Nome do responsável"></label><label>Status<select name="status"><option>Pendente</option><option>Em validação</option><option>Concluído</option></select></label><label class="atlas-wide">Detalhes / medição<textarea name="detalhes" maxlength="2000" required placeholder="Descreva o avanço, a ocorrência ou a medição observada"></textarea></label><label class="atlas-wide">Referência da evidência<input name="evidenceUri" maxlength="500" placeholder="URL ou caminho persistido, se houver"></label></div>${s.error ? `<p class="atlas-error" role="alert">${esc(s.error)}</p>` : ""}<p class="atlas-feedback" aria-live="polite">${esc(s.feedback)}</p><footer><button type="button" data-progress-cancel>Cancelar</button><button type="submit" class="atlas-primary" ${s.saving || !activityOptions ? "disabled" : ""}>${s.saving ? "Salvando…" : "Salvar no diário"}</button></footer></form>` : ""}</main><aside class="atlas-rail"><section class="atlas-panel"><header><div><span class="atlas-eyebrow">RESUMO</span><h2>Etapa em foco</h2></div></header><div class="atlas-metrics"><div><strong>${stageRecords.length}</strong><span>Registros</span></div><div><strong>${pending}</strong><span>Em aberto</span></div><div><strong>${Math.round(Math.max(0,Math.min(100,Number(stage?.progress)||0)))}%</strong><span>Progresso</span></div></div>${stage ? `<div class="atlas-bar"><i style="width:${Math.max(0,Math.min(100,Number(stage.progress)||0))}%"></i></div><p class="atlas-muted">${esc(stage.name)}${stage.owner ? ` · ${esc(stage.owner)}` : ""}</p>` : ""}</section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">AGENDA</span><h2>Próximos compromissos</h2></div></header>${upcoming.length ? upcoming.map(event => `<div class="atlas-next"><time>${esc(event.date)} · ${esc(event.start)}</time><strong>${esc(event.title)}</strong><small>${esc(event.status)}${event.owner ? ` · ${esc(event.owner)}` : ""}</small></div>`).join("") : `<p class="atlas-empty">Não há compromissos futuros registrados para esta etapa.</p>`}<button type="button" data-progress-navigate="agenda">Abrir agenda</button></section><section class="atlas-panel"><header><div><span class="atlas-eyebrow">MATERIAIS</span><h2>Associados à etapa</h2></div><span class="atlas-count">${materials.length}</span></header>${materials.length ? `<ul class="atlas-materials">${materials.slice(0,6).map(item => `<li><span>${esc(item.name)}</span><span>${esc(item.receivedQuantity)} / ${esc(item.plannedQuantity)} ${esc(item.unit)}</span></li>`).join("")}</ul>` : `<p class="atlas-empty">Nenhum material persistido está associado à etapa.</p>`}<button type="button" data-progress-navigate="materials">Ver materiais</button></section><button type="button" data-progress-navigate="records">Abrir registros</button></aside></div><p class="atlas-feedback" aria-live="polite">${esc(s.feedback)}</p></section>`;

    const stageMap = this.querySelector<HTMLElement>("map-scene[data-stage-header-map]");
    if (stage && stageMap) {
      stageMap.dataset.overlay = this.stageOverlay(stage);
      const mapHeader = document.createElement("header");
      mapHeader.className = "atlas-stage-map-header";
      mapHeader.innerHTML = `<div><span class="atlas-eyebrow">MAPA 3D · ${this.esc(stage.name)}</span><strong>Contexto físico da etapa</strong></div><span>${this.esc(stage.name)}</span>`;
      mapHeader.style.cssText = "position:absolute;z-index:2;inset:12px 12px auto auto;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid #314253;border-radius:10px;background:#0d1a28e8;color:#fff";
      const mapFrame = stageMap.parentElement;
      if (mapFrame) mapFrame.style.position = "relative";
      mapHeader.querySelector("strong")!.style.cssText = "display:block;margin-top:4px;font-size:13px";
      (mapHeader.lastElementChild as HTMLElement).style.cssText = "padding:6px 9px;border:1px solid #54677a;border-radius:20px;font-size:11px";
      stageMap.before(mapHeader);
    }
    this.querySelectorAll<HTMLButtonElement>("[data-progress-period]").forEach(button => button.addEventListener("click", () => this.state.next(previous => ({ ...previous, period: button.dataset.progressPeriod as ProgressPeriod }))));
    this.querySelector<HTMLSelectElement>("[data-progress-stage]")?.addEventListener("change", event => this.state.next(previous => ({ ...previous, selectedStageId: (event.currentTarget as HTMLSelectElement).value, expandedRecordId: null })));
    this.querySelector<HTMLButtonElement>("[data-progress-refresh]")?.addEventListener("click", () => this.dispatchEvent(new CustomEvent("atlas:progress-refresh", { bubbles: true, detail: { element: this } })));
    this.querySelector<HTMLButtonElement>("[data-progress-new]")?.addEventListener("click", () => this.state.next(previous => ({ ...previous, formOpen: true, error: null, feedback: "" })));
    this.querySelectorAll<HTMLButtonElement>("[data-progress-cancel]").forEach(button => button.addEventListener("click", () => this.state.next(previous => ({ ...previous, formOpen: false, error: null }))));
    this.querySelectorAll<HTMLElement>("[data-record]").forEach(row => row.addEventListener("click", event => { if ((event.target as Element).closest("a,button")) return; this.state.next(previous => ({ ...previous, expandedRecordId: previous.expandedRecordId === row.dataset.record ? null : row.dataset.record || null })); }));
    this.querySelectorAll<HTMLButtonElement>("[data-progress-navigate]").forEach(button => button.addEventListener("click", () => this.dispatchEvent(new CustomEvent("atlas:navigate", { bubbles: true, detail: { view: button.dataset.progressNavigate, stageKey: stage?.key || String(stage?.id || "") } }))));
    this.querySelector<HTMLFormElement>("[data-progress-form]")?.addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget as HTMLFormElement), stageId = String(data.get("etapa") || ""), selected = s.stages.find(item => String(item.id) === stageId);
      const activity = String(data.get("atividade") || "").trim();
      if (!selected || !activity) { this.state.next(previous => ({ ...previous, error: "Selecione uma etapa e uma atividade cadastradas." })); return; }
      const payload = { obra: "Aliança Park", etapa: selected.name, stageKey: selected.key || "", atividade: activity, activityId: selected.activities?.find(item => item.name === activity)?.id || "", data: String(data.get("data") || ""), hora: String(data.get("hora") || ""), responsavel: String(data.get("responsavel") || "").trim(), detalhes: String(data.get("detalhes") || "").trim(), evidenceUri: String(data.get("evidenceUri") || "").trim(), status: String(data.get("status") || "Pendente") };
      if (!payload.data || !payload.hora || !payload.responsavel || !payload.detalhes) { this.state.next(previous => ({ ...previous, error: "Preencha data, hora, responsável e detalhes do registro." })); return; }
      this.state.next(previous => ({ ...previous, saving: true, error: null, feedback: "Enviando registro ao serviço persistente…" }));
      this.dispatchEvent(new CustomEvent("atlas:progress-record-create", { bubbles: true, detail: { element: this, payload } }));
    });
  }
}
if (!customElements.get("atlas-progress")) customElements.define("atlas-progress", AtlasProgress);

type CashRecordState = {
  actorLabel: string;
  allowed: boolean;
  stages: OperationalStage[];
  returnView: string;
  attachment: File | null;
  saving: boolean;
  error: string;
  feedback: string;
};
type CashRecordSetter = (previous: CashRecordState) => CashRecordState;
const cashRecordStyles = `<style>
.atlas-cash-record{display:grid;gap:18px;color:#20283a}.atlas-cash-record *{box-sizing:border-box}.atlas-cash-record h1,.atlas-cash-record h2,.atlas-cash-record p{margin-top:0}.atlas-cash-record header,.atlas-cash-record footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.atlas-cash-record .atlas-panel{padding:20px;border:1px solid #e0e6ef;border-radius:14px;background:#fff;box-shadow:0 4px 16px #192b4910}.atlas-cash-record .atlas-eyebrow{color:#3977d5;font:700 10px ui-monospace,monospace;letter-spacing:.08em}.atlas-cash-record h1{margin:6px 0;font-size:clamp(24px,3vw,32px);color:#19243b}.atlas-cash-record .atlas-muted{margin:0;color:#6d788a;font-size:13px}.atlas-cash-record .atlas-form{display:grid;gap:16px}.atlas-cash-record .atlas-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.atlas-cash-record label{display:grid;gap:6px;color:#59667a;font-size:12px}.atlas-cash-record input,.atlas-cash-record select,.atlas-cash-record textarea{width:100%;min-height:42px;padding:10px 12px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e;font:inherit}.atlas-cash-record textarea{min-height:100px;resize:vertical}.atlas-cash-record .atlas-wide{grid-column:1/-1}.atlas-cash-record button{min-height:40px;padding:9px 14px;border:1px solid #d9e0eb;border-radius:9px;background:#fff;color:#26334b;font:inherit;cursor:pointer}.atlas-cash-record button:hover{border-color:#76a4ee;background:#f5f8fe}.atlas-cash-record .atlas-primary{border-color:#246be0;background:#246be0;color:#fff}.atlas-cash-record [role=alert]{padding:12px;border:1px solid #efc7c7;border-radius:9px;background:#fff7f7;color:#9b2935}.atlas-cash-record .atlas-status{color:#6d788a;font-size:12px}.atlas-cash-record .atlas-fiscal{display:grid;gap:12px;padding:16px;border:1px solid #dfe6ef;border-radius:11px;background:#f7f9fc}.atlas-cash-record .atlas-fiscal h2{margin:0;font-size:16px}.atlas-cash-record .atlas-file{display:grid;gap:8px;padding:14px;border:1px dashed #aab8ca;border-radius:10px;background:#fafbfd}.atlas-cash-record .atlas-file input{min-height:unset;padding:0;border:0;background:transparent}.atlas-cash-record .atlas-file-summary{color:#657287;font-size:12px}.atlas-cash-record .atlas-permission{padding:18px;border-left:3px solid #aab5c5;background:#f6f8fb;color:#52627b}@media(max-width:700px){.atlas-cash-record .atlas-fields{grid-template-columns:1fr}.atlas-cash-record .atlas-wide{grid-column:auto}.atlas-cash-record .atlas-panel{padding:15px}}
</style>`;

/** Cash-exit form. It owns only ephemeral form and attachment state. */
export class AtlasCashRecord extends HTMLElement {
  private snapshot: CashRecordState;
  private readonly state: AtomicState<CashRecordState>;
  constructor() {
    super();
    const initial: CashRecordState = { actorLabel: "", allowed: false, stages: [], returnView: "finance", attachment: null, saving: false, error: "", feedback: "" };
    function* state(value: CashRecordState): Generator<CashRecordState, never, CashRecordSetter> { while (true) value = (yield value)(value); }
    const iterator = state(initial); iterator.next(); this.snapshot = initial;
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; this.render(); return this.snapshot; } };
  }
  connectedCallback(): void { this.render(); this.dispatchEvent(new CustomEvent("atlas:cash-record-connected", { bubbles: true, detail: { element: this } })); }
  setContext(data: { actorLabel: string; allowed: boolean; stages: OperationalStage[]; returnView: string }): void { this.state.next(s => ({ ...s, ...data })); }
  setAttachment(file: File | null): void { this.state.next(s => ({ ...s, attachment: file, error: "" })); }
  setSaving(saving: boolean): void { this.state.next(s => ({ ...s, saving, feedback: saving ? "Salvando saída no livro-caixa…" : s.feedback })); }
  setError(message: string): void { this.state.next(s => ({ ...s, saving: false, error: message, feedback: "" })); }
  private esc(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char] || char)); }
  private today(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
  private render(): void {
    const s = this.snapshot, esc = (value: unknown) => this.esc(value), file = s.attachment;
    this.innerHTML = `${cashRecordStyles}<section class="atlas-cash-record"><header><div><button type="button" data-cash-back>← Voltar</button><span class="atlas-eyebrow">CAIXA · SAÍDA</span><h1>Registrar saída de caixa</h1><p class="atlas-muted">Entradas comerciais e repasses são registrados exclusivamente em Repasses.</p></div><span class="atlas-muted">${esc(s.actorLabel)}</span></header>${s.error ? `<p role="alert">${esc(s.error)}</p>` : ""}${s.allowed ? `<form class="atlas-panel atlas-form" data-cash-form novalidate><input type="hidden" name="date" value="${this.today()}"><input type="hidden" name="kind" value="saida"><div class="atlas-fields"><label>Nome do registro<input name="name" required maxlength="120" placeholder="Ex.: pagamento de serviço"></label><label>Etapa<select name="stage"><option value="Geral">Geral</option>${s.stages.map(stage => `<option value="${esc(stage.name)}">${esc(stage.name)}</option>`).join("")}</select></label><label>Valor (R$)<input name="amount" inputmode="decimal" required placeholder="0,00" autocomplete="off"></label><label class="atlas-wide">Descrição<textarea name="description" required maxlength="800" rows="5" placeholder="Explique a finalidade e condição do lançamento."></textarea></label><section class="atlas-fiscal atlas-wide"><header><div><span class="atlas-eyebrow">CONTROLE FISCAL</span><h2>Documento do lançamento</h2><p class="atlas-muted">O anexo não altera o estado de conferência sozinho.</p></div></header><div class="atlas-fields"><label>Tipo<select name="fiscalDocumentType"><option value="">Não informado</option><option value="nota_fiscal">Nota fiscal</option><option value="recibo">Recibo</option><option value="contrato">Contrato</option><option value="outro">Outro</option></select></label><label>Número<input name="fiscalDocumentNumber" maxlength="80" placeholder="Número ou referência"></label><label>Emitente<input name="fiscalIssuer" maxlength="160" placeholder="Nome ou razão social"></label><label>Data de emissão<input name="fiscalIssueDate" type="date"></label><label>Conferência<select name="fiscalStatus"><option value="pendente">Pendente</option><option value="em_conferencia">Em conferência</option><option value="conferido">Conferido</option><option value="nao_aplicavel">Não aplicável</option></select></label></div><small>“Conferido” exige tipo, número, emitente, data e documento anexado; não substitui análise contábil.</small></section><label class="atlas-file atlas-wide">Anexo opcional<input type="file" name="attachment" accept="image/jpeg,image/png,image/webp,application/pdf"><span class="atlas-file-summary" data-cash-file-summary>${file ? `${esc(file.name)} · ${(file.size/1024/1024).toFixed(2)} MB` : "PDF, JPG, PNG ou WEBP · até 6 MB"}</span></label></div><footer><span class="atlas-status" role="status" aria-live="polite">${esc(s.feedback || "A saída será incorporada ao caixa e recalculará as frentes relacionadas.")}</span><button type="submit" class="atlas-primary" ${s.saving ? "disabled" : ""}>${s.saving ? "Salvando…" : "Registrar saída"}</button></footer></form>` : `<div class="atlas-panel atlas-permission">Este perfil pode consultar o caixa, mas não criar lançamentos. Apenas o perfil Dono pode registrar uma saída.</div>`}</section>`;
    this.querySelector<HTMLButtonElement>("[data-cash-back]")?.addEventListener("click", () => this.dispatchEvent(new CustomEvent("atlas:cash-record-back", { bubbles: true, detail: { element: this, view: s.returnView } })));
    const input = this.querySelector<HTMLInputElement>('[name="attachment"]');
    input?.addEventListener("change", () => { const selected = input.files?.[0] || null; this.setAttachment(selected); });
    const form = this.querySelector<HTMLFormElement>("[data-cash-form]");
    form?.addEventListener("submit", event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries()), rawAmount = String(data.amount || "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""), amountCents = Math.round(Number(rawAmount) * 100), file = this.snapshot.attachment;
      if (!String(data.name || "").trim() || !String(data.description || "").trim()) { this.setError("Informe o nome e a descrição do lançamento."); return; }
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0) { this.setError("Informe um valor maior que zero."); return; }
      if (file && (!new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]).has(file.type) || file.size > 6 * 1024 * 1024)) { this.setError("Use PDF, JPG, PNG ou WEBP de até 6 MB."); return; }
      if (data.fiscalStatus === "conferido" && (!data.fiscalDocumentType || !String(data.fiscalDocumentNumber || "").trim() || !String(data.fiscalIssuer || "").trim() || !data.fiscalIssueDate || !file)) { this.setError("Para marcar como conferido, informe tipo, número, emitente, data e anexe o documento fiscal."); return; }
      this.setSaving(true);
      this.dispatchEvent(new CustomEvent("atlas:cash-record-create", { bubbles: true, detail: { element: this, payload: { kind: "saida", date: String(data.date), category: String(data.name).trim(), stage: String(data.stage || "Geral"), description: String(data.description).trim(), amountCents, fiscalDocumentType: String(data.fiscalDocumentType || ""), fiscalDocumentNumber: String(data.fiscalDocumentNumber || "").trim(), fiscalIssuer: String(data.fiscalIssuer || "").trim(), fiscalIssueDate: String(data.fiscalIssueDate || ""), fiscalStatus: String(data.fiscalStatus || "pendente"), file } } }));
    });
  }
}
if (!customElements.get("atlas-cash-record")) customElements.define("atlas-cash-record", AtlasCashRecord);

type SettingsState = SettingsSnapshot & {
  loading: boolean;
  error: string;
  feedback: string;
  selectedStageId: string;
  activeTab: "materials" | "activities" | "execution";
  creatingStage: boolean;
  saving: boolean;
};
type SettingsSetter = (previous: SettingsState) => SettingsState;
const settingsStyles = `<style>
.atlas-settings{display:grid;gap:18px;color:#20283a}.atlas-settings *{box-sizing:border-box}.atlas-settings h1,.atlas-settings h2,.atlas-settings h3,.atlas-settings p{margin-top:0}.atlas-settings header,.atlas-settings footer{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}.atlas-settings .atlas-eyebrow{color:#3977d5;font:700 10px ui-monospace,monospace;letter-spacing:.08em}.atlas-settings h1{margin:6px 0;font-size:clamp(24px,3vw,32px);color:#19243b}.atlas-settings h2{margin:4px 0;font-size:18px;color:#1e2b43}.atlas-settings h3{margin:4px 0;font-size:15px}.atlas-settings .atlas-muted,.atlas-settings p{color:#6d788a}.atlas-settings .atlas-panel{min-width:0;padding:18px;border:1px solid #e0e6ef;border-radius:14px;background:#fff;box-shadow:0 4px 16px #192b4910}.atlas-settings .atlas-primary,.atlas-settings button{min-height:38px;padding:8px 13px;border:1px solid #d9e0eb;border-radius:9px;background:#fff;color:#26334b;font:inherit;cursor:pointer}.atlas-settings .atlas-primary{border-color:#246be0;background:#246be0;color:#fff}.atlas-settings button:disabled{opacity:.55;cursor:not-allowed}.atlas-settings input,.atlas-settings textarea,.atlas-settings select{width:100%;min-height:40px;padding:9px 11px;border:1px solid #d7deea;border-radius:8px;background:#fff;color:#18243e;font:inherit}.atlas-settings textarea{resize:vertical}.atlas-settings label{display:grid;gap:6px;color:#59667a;font-size:12px}.atlas-settings .atlas-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.atlas-settings .atlas-wide{grid-column:1/-1}.atlas-settings .atlas-layout{display:grid;grid-template-columns:minmax(220px,280px) minmax(0,1fr);gap:16px;align-items:start}.atlas-settings .atlas-stage-list{display:grid;gap:6px;max-height:70vh;overflow:auto}.atlas-settings .atlas-stage-choice{display:grid;gap:4px;text-align:left}.atlas-settings .atlas-stage-choice[aria-current=true]{border-color:#3478dc;background:#edf4ff;color:#1e59ad}.atlas-settings .atlas-tabs{display:flex;gap:6px;overflow-x:auto;border-bottom:1px solid #e1e6ef;margin-bottom:16px}.atlas-settings .atlas-tabs button[aria-selected=true]{border-color:#2e70d4;background:#edf4ff;color:#1e59ad}.atlas-settings .atlas-material-row,.atlas-settings .atlas-session-material,.atlas-settings .atlas-property-row,.atlas-settings .atlas-condition{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px;margin:8px 0;border:1px solid #e3e8ef;border-radius:10px}.atlas-settings .atlas-session{padding:12px;border:1px solid #e0e6ef;border-radius:11px;margin:10px 0}.atlas-settings .atlas-session summary{display:flex;justify-content:space-between;gap:10px;cursor:pointer}.atlas-settings .atlas-session summary small{display:block;color:#738095}.atlas-settings .atlas-session-body{display:grid;gap:12px;padding-top:14px}.atlas-settings .atlas-list{display:grid;gap:8px}.atlas-settings .atlas-list article{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid #e0e6ef;border-radius:10px}.atlas-settings fieldset{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;border:1px solid #e0e6ef;border-radius:10px;padding:12px}.atlas-settings fieldset label,.atlas-settings .atlas-check{display:flex;align-items:center;gap:8px}.atlas-settings input[type=checkbox]{width:16px;min-height:16px}.atlas-settings [role=alert]{padding:12px;border:1px solid #efc7c7;border-radius:9px;background:#fff7f7;color:#9b2935}.atlas-settings .atlas-status{font-size:12px;color:#64728a}.atlas-settings .atlas-contact{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,380px);gap:16px}.atlas-settings .atlas-dynamic{display:grid;gap:12px}.atlas-settings .atlas-session-material-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.atlas-settings .atlas-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-settings .atlas-qa-secret{padding:14px;border:1px solid #e7c86b;background:#fff9e8;border-radius:10px;overflow-wrap:anywhere}.atlas-settings .atlas-info{padding:12px;background:#f6f8fb;border-radius:9px;color:#59667a}.atlas-settings [hidden]{display:none!important}
@media(max-width:820px){.atlas-settings .atlas-layout{grid-template-columns:1fr}.atlas-settings .atlas-stage-list{display:flex;max-height:none;overflow-x:auto}.atlas-settings .atlas-stage-choice{min-width:180px}.atlas-settings .atlas-contact{grid-template-columns:1fr}}
@media(max-width:560px){.atlas-settings .atlas-panel{padding:14px}.atlas-settings .atlas-grid,.atlas-settings .atlas-material-row,.atlas-settings .atlas-session-material,.atlas-settings .atlas-property-row,.atlas-settings .atlas-condition,.atlas-settings fieldset,.atlas-settings .atlas-session-material-list{grid-template-columns:1fr}.atlas-settings .atlas-wide{grid-column:auto}}
</style>`;

/** Complete settings surface. It owns only form drafts and view selection; all catalogs and persistence belong to program(). */
export class AtlasSettings extends HTMLElement {
  private snapshot: SettingsState;
  private readonly state: AtomicState<SettingsState>;
  private workbenchTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private skipRender = false;
  constructor() {
    super();
    const initial: SettingsState = { stages: [], roles: [], keys: [], contact: null, actorRole: "", isNative: false, loading: true, error: "", feedback: "", selectedStageId: "", activeTab: "materials", creatingStage: false, saving: false };
    function* state(value: SettingsState): Generator<SettingsState, never, SettingsSetter> { while (true) value = (yield value)(value); }
    const iterator = state(initial); iterator.next(); this.snapshot = initial;
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; if (!this.skipRender) this.render(); return this.snapshot; } };
  }
  connectedCallback(): void { this.render(); this.dispatchEvent(new CustomEvent("atlas:settings-connected", { bubbles: true, detail: { element: this } })); }
  setData(data: SettingsSnapshot): void { this.state.next(s => ({ ...s, ...data, loading: false, error: "" })); }
  setError(message: string): void { this.state.next(s => ({ ...s, loading: false, error: message })); }
  setFeedback(message: string): void { this.state.next(s => ({ ...s, feedback: message })); }
  setContact(contact: PublicLeadContactSettings): void { this.state.next(s => ({ ...s, contact })); }
  setRoles(roles: DelegatedAccessRole[]): void { this.state.next(s => ({ ...s, roles })); }
  setKeys(keys: DelegatedAccessKey[]): void { this.state.next(s => ({ ...s, keys })); }
  setStageWorkbench(stageId: string, workbenchState: ConfiguredStage["workbenchState"], sessions: WorkbenchSession[]): void {
    this.state.next(s => ({ ...s, stages: s.stages.map(stage => String(stage.id) === stageId ? { ...stage, workbenchState, workbenchSessions: sessions, workbenchSource: "persisted" } : stage) }));
  }
  getStage(stageKey: string): ConfiguredStage | undefined { return this.snapshot.stages.find(stage => stage.stageKey === stageKey); }
  showCreatedKey(token: string): void {
    const output = this.querySelector<HTMLElement>("[data-settings-key-once]");
    if (output) { output.hidden = false; output.innerHTML = `<div class="atlas-qa-secret"><b>Copie agora: o segredo não será exibido novamente.</b><p><code>${this.esc(token)}</code></p><button type="button" data-copy-created-key>Copiar chave</button></div>`; }
  }
  private esc(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char)); }
  private emit(name: string, detail: Record<string, unknown>): void { this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { element: this, ...detail } })); }
  private sessionsFor(stage: ConfiguredStage): WorkbenchSession[] { return [...stage.workbenchSessions].sort((a,b) => Number(a.order)-Number(b.order)); }
  private listField(name: string, values: unknown): string { return Array.isArray(values) ? values.map(value => typeof value === "string" ? value : "").filter(Boolean).join("\n") : ""; }
  private sessionMarkup(stage: ConfiguredStage, session: WorkbenchSession, index: number, count: number): string {
    const e = (value: unknown) => this.esc(value), id = e(session.id), materials = Array.isArray(session.materials) ? session.materials : [], properties = session.properties || [], production = (session.inference?.production || session.operational?.production || {}) as Record<string, unknown>, conditions = (session.inference?.conditions || session.operational?.entryConditions || []) as Array<Record<string, unknown> | string>, automation = session.automation || {}, programming = session.programming || {};
    const materialRows = materials.map((item, mi) => { const m: WorkbenchMaterial = typeof item === "string" ? { id: `material-${mi}`, name: item, description: "", usage: "", quantity: "", unit: "" } : item; return `<article class="atlas-session-material"><label>Material / equipamento<input data-settings-material="name" data-session="${id}" data-index="${mi}" value="${e(m.name)}"></label><label>Descrição<textarea data-settings-material="description" data-session="${id}" data-index="${mi}" rows="2">${e(m.description)}</textarea></label><label>Uso na atividade<textarea data-settings-material="usage" data-session="${id}" data-index="${mi}" rows="2">${e(m.usage)}</textarea></label><div class="atlas-grid"><label>Quantidade<input data-settings-material="quantity" data-session="${id}" data-index="${mi}" value="${e(m.quantity)}"></label><label>Unidade<input data-settings-material="unit" data-session="${id}" data-index="${mi}" value="${e(m.unit)}"></label></div><button type="button" data-settings-material-remove data-session="${id}" data-index="${mi}">Remover item</button></article>`; }).join("");
    const propertyRows = properties.map((property, pi) => `<div class="atlas-property-row"><label>Nome<input data-settings-property="label" data-session="${id}" data-index="${pi}" value="${e(property.label)}"></label><label>Valor<input data-settings-property="value" data-session="${id}" data-index="${pi}" value="${e(property.value)}"></label><button type="button" data-settings-property-remove data-session="${id}" data-index="${pi}">Remover propriedade</button></div>`).join("");
    const conditionRows = conditions.map((condition, ci) => { const item = typeof condition === "string" ? { label: "Condição", trigger: condition, severity: "warning" } : condition; return `<div class="atlas-condition"><label>Rótulo<input data-settings-condition="label" data-session="${id}" data-index="${ci}" value="${e(item.label || item.kind)}"></label><label>Severidade<select data-settings-condition="severity" data-session="${id}" data-index="${ci}"><option value="info"${item.severity === "info" ? " selected" : ""}>Informação</option><option value="warning"${!item.severity || item.severity === "warning" ? " selected" : ""}>Atenção</option><option value="critical"${item.severity === "critical" ? " selected" : ""}>Crítica</option></select></label><label class="atlas-wide">Disparar quando<textarea data-settings-condition="trigger" data-session="${id}" data-index="${ci}" rows="2">${e(item.trigger || item.message)}</textarea></label><button type="button" data-settings-condition-remove data-session="${id}" data-index="${ci}">Remover condição</button></div>`; }).join("");
    const opts = [["propagateRelations","Propagar relações","automation"],["generateSchedule","Gerar cronograma","automation"],["generateResources","Recalcular materiais e equipe","automation"],["notifyWorker","Avisar o Worker","automation"],["productionModeEnabled","Programar por produção","programming"],["mapLocation","Vincular localização 3D","programming"],["requireAcceptance","Exigir aceite do requisito","programming"]] as const;
    const optionMarkup = opts.map(([key,label,owner]) => `<label class="atlas-check"><input type="checkbox" data-settings-option="${key}" data-owner="${owner}" data-session="${id}"${(owner === "automation" ? automation[key] : programming[key]) ? " checked" : ""}><span>${label}</span></label>`).join("");
    return `<details class="atlas-session" data-settings-session="${id}"><summary><span><b>${e(session.title || "Atividade")}</b><small>${e(session.unit || "Unidade não definida")} · ${e(session.release || "Sem requisito de liberação")}</small></span><span>${e((session.inference?.summary as string) || "Editar compreensão")}</span></summary><div class="atlas-session-body"><div class="atlas-grid"><label>Atividade<input data-settings-session-field="title" data-session="${id}" value="${e(session.title)}"></label><label>Unidade de produção<input data-settings-session-field="unit" data-session="${id}" value="${e(session.unit)}"></label></div><label>Descrição, fato, requisito ou dependência<textarea data-settings-session-field="text" data-session="${id}" rows="4">${e(session.text)}</textarea></label><section class="atlas-panel"><header><div><b>Materiais e equipamentos desta atividade</b><p class="atlas-muted">Descrição e uso por atividade.</p></div><button type="button" data-settings-material-add data-session="${id}">Adicionar item</button></header><div class="atlas-session-material-list">${materialRows || '<p>Nenhum material ou equipamento vinculado.</p>'}</div></section><label>Requisito de liberação<textarea data-settings-session-field="release" data-session="${id}" rows="3">${e(session.release)}</textarea></label><label>Responsabilidade principal<input data-settings-session-field="responsible" data-session="${id}" value="${e(session.responsible)}"></label><section class="atlas-panel"><header><div><b>Propriedades dinâmicas</b><p class="atlas-muted">Valores reutilizados na descrição e inferência.</p></div><button type="button" data-settings-property-add data-session="${id}">Adicionar propriedade</button></header>${propertyRows || '<p>Nenhuma propriedade configurada.</p>'}</section><section class="atlas-panel"><b>Propagação e geração</b><fieldset>${optionMarkup}</fieldset><div class="atlas-grid"><label>Modo de agenda<select data-settings-programming="scheduleMode" data-session="${id}"><option value="sequential"${programming.scheduleMode === "sequential" ? " selected" : ""}>Sequencial · aguarda requisito</option><option value="parallel"${programming.scheduleMode === "parallel" ? " selected" : ""}>Paralela · permite sobreposição</option><option value="production"${programming.scheduleMode === "production" ? " selected" : ""}>Por produção · dimensiona pelo ritmo</option></select></label><label>Base de medição<input data-settings-programming="productionBasis" data-session="${id}" value="${e(programming.productionBasis || "registro")}"></label></div></section><section class="atlas-panel"><header><b>Produção e condições</b><button type="button" data-settings-condition-add data-session="${id}">Adicionar condição</button></header><div class="atlas-grid"><label>Forma de medida<textarea data-settings-production="measureForm" data-session="${id}" rows="2">${e(production.measureForm || production.method)}</textarea></label><label>Validação e aceite<textarea data-settings-production="validation" data-session="${id}" rows="2">${e(production.validation)}</textarea></label><label>Ritmo de referência<input type="number" min="0" step="any" data-settings-production="referenceRate" data-session="${id}" value="${e(production.referenceRate ?? production.rate)}"></label><label>Unidade do ritmo<input data-settings-production="rateUnit" data-session="${id}" value="${e(production.rateUnit)}"></label><label>Cálculo da quantidade<textarea data-settings-production="quantityFormula" data-session="${id}" rows="2">${e(production.quantityFormula || production.formula)}</textarea></label><label>Cálculo da duração<textarea data-settings-production="durationFormula" data-session="${id}" rows="2">${e(production.durationFormula)}</textarea></label></div>${conditionRows || '<p>Nenhuma condição cadastrada.</p>'}</section><footer class="atlas-actions"><button type="button" data-settings-session-move="up" data-session="${id}" ${index === 0 ? "disabled" : ""}>↑ Subir</button><button type="button" data-settings-session-move="down" data-session="${id}" ${index === count - 1 ? "disabled" : ""}>↓ Descer</button><button type="button" data-settings-infer data-session="${id}" data-stage="${e(stage.stageKey)}">Compreender agora</button>${session.custom ? `<button type="button" data-settings-session-remove data-session="${id}">Remover atividade</button>` : ""}<span class="atlas-status" data-settings-session-status="${id}">${e((session.inference?.summary as string) || "Alterações são salvas na compreensão original do Worker.")}</span></footer></div></details>`;
  }
  private renderRoleMarkup(role: DelegatedAccessRole): string { const e=(value:unknown)=>this.esc(value); return `<article><div><b>${e(role.name)}</b><p class="atlas-muted">${e(role.permissions.join(" · "))}</p><small>${e(role.id)}</small></div><div class="atlas-actions"><button type="button" data-role-edit="${e(role.id)}">Editar papel</button><button type="button" data-role-delete="${e(role.id)}">Excluir papel</button></div></article>`; }
  private render(): void {
    const s=this.snapshot,e=(value:unknown)=>this.esc(value),stage=s.stages.find(item=>String(item.id)===s.selectedStageId)||s.stages[0],config:StageAIConfig=stage?.aiConfig||({} as StageAIConfig),profile=config.executionProfile||{},sessions=stage?this.sessionsFor(stage):[],materials=(profile.materialsTable||[]) as StageComprehensionMaterial[],activities=(profile.expectedActivities||sessions.map(item=>item.title)) as string[],production=profile.production||({quantity:null,unit:"",rate:null,rateUnit:""}),targets=config.notificationTargets||{},admin=s.actorRole==="owner"||s.actorRole==="admin",roleAdmin=s.actorRole==="owner"&&!s.isNative;
    const stageList=s.stages.map(item=>`<button type="button" class="atlas-stage-choice" data-stage-select="${e(item.id)}" aria-current="${String(item.id)===(stage?String(stage.id):"")}" ${s.creatingStage?"disabled":""}><b>${e(item.name)}</b><small>${e(item.status)} · ${Number(item.progress)||0}%</small></button>`).join("");
    const sourceMaterialsCount=sessions.reduce((sum,session)=>sum+(Array.isArray(session.materials)?session.materials.length:0),0);
    const tabs=([ ["materials","Materiais"],["activities","Atividades esperadas"],["execution","Execução"] ] as const).map(([key,label])=>`<button type="button" data-settings-tab="${key}" aria-selected="${s.activeTab===key}">${label}${key==="activities"?` · ${sessions.length}`:key==="materials"?` · ${materials.length+sourceMaterialsCount}`:""}</button>`).join("");
    const rolePanel=roleAdmin?`<section class="atlas-panel atlas-dynamic"><header><div><span class="atlas-eyebrow">ACESSO DE CAMPO</span><h2>Papéis e chaves delegadas</h2><p class="atlas-muted">Cada chave herda as permissões persistidas do papel. O segredo é exibido uma única vez; administração apenas no desktop.</p></div><span>Validade: 90 dias</span></header><form data-role-form><label>Nome do papel<input name="name" minlength="2" maxlength="60" required placeholder="Ex.: Encarregado de obra"></label><fieldset><legend>Interfaces e permissões</legend>${["view.map","view.agenda","view.records","view.stages","timeline.read","agenda.write","records.read","records.write","ai.notes","ai.photos"].map(permission=>`<label><input type="checkbox" name="permissions" value="${permission}"> ${e(({"view.map":"Interface · Mapa","view.agenda":"Interface · Agenda","view.records":"Interface · Registros","view.stages":"Interface · Etapas","timeline.read":"Linha do tempo","agenda.write":"Criar/alterar compromissos","records.read":"Consultar registros","records.write":"Criar/editar registros","ai.notes":"Notas para IA","ai.photos":"Fotos para IA"} as Record<string,string>)[permission])}</label>`).join("")}</fieldset><div class="atlas-actions"><button type="submit" class="atlas-primary">Salvar papel</button><button type="button" data-role-cancel hidden>Cancelar edição</button></div><output class="atlas-status" data-role-status></output></form><div class="atlas-list">${s.roles.map(role=>this.renderRoleMarkup(role)).join("")||"<p>Nenhum papel delegado cadastrado.</p>"}</div><form data-key-form><div class="atlas-grid"><label>Identificação da chave<input name="label" minlength="2" maxlength="60" required placeholder="Ex.: Frente Norte · turno A"></label><label>Papel<select name="roleId" required><option value="">Selecione um papel</option>${s.roles.map(role=>`<option value="${e(role.id)}">${e(role.name)}</option>`).join("")}</select></label></div><button type="submit" class="atlas-primary">Emitir chave</button><output class="atlas-status" data-key-status></output></form><div data-settings-key-once hidden></div><div class="atlas-list">${s.keys.map(key=>`<article><div><b>${e(key.label)}</b><p class="atlas-muted">${e(key.roleName)} · ${e(key.permissions.join(" · "))}</p><small>${key.revokedAt?"Revogada":`Expira ${e(new Date(key.expiresAt).toLocaleDateString("pt-BR"))}`}</small></div>${key.revokedAt?"":`<button type="button" data-key-revoke="${e(key.id)}">Revogar</button>`}</article>`).join("")||"<p>Nenhuma chave emitida.</p>"}</div></section>`:"";
    this.innerHTML=`${settingsStyles}<main class="atlas-settings"><header><div><span class="atlas-eyebrow">CONFIGURAÇÃO OPERACIONAL</span><h1>Compreensão por etapa</h1><p>Cadastro, materiais, atividades e execução que orientam agenda, registros e inferência.</p></div><button type="button" class="atlas-primary" data-stage-create ${admin?"":"disabled"}>Nova etapa</button></header>${s.error?`<p role="alert">${e(s.error)}</p>`:""}${s.feedback?`<p class="atlas-status" role="status">${e(s.feedback)}</p>`:""}${s.loading?"<p>Carregando etapas e compreensões persistidas…</p>":""}<section class="atlas-panel atlas-contact"><div><span class="atlas-eyebrow">ATENDIMENTO COMERCIAL · LEADS</span><h2>WhatsApp de contato</h2><p class="atlas-muted">Destino do link com mensagem preparada. O visitante confirma antes de abrir o WhatsApp.</p></div><form data-contact-form><label>Número com DDD<input name="whatsappNumber" type="tel" inputmode="tel" autocomplete="tel" required value="${e(s.contact?.whatsappNumber||"")}" ${admin?"":"disabled"}></label><footer><span class="atlas-status">${e(s.contact?.updatedAt?`Salvo no repositório em ${new Date(s.contact.updatedAt).toLocaleString("pt-BR")}.`:"Contato carregado do repositório.")}</span><button type="submit" class="atlas-primary" ${admin?"":"disabled"}>Salvar contato</button></footer></form></section>${rolePanel}<div class="atlas-layout"><nav class="atlas-panel atlas-stage-list" aria-label="Etapas">${stageList||"<p>Nenhuma etapa cadastrada no banco.</p>"}</nav><section class="atlas-panel">${s.creatingStage?`<form data-stage-form><span class="atlas-eyebrow">CADASTRO DA ETAPA</span><h2>Nova etapa</h2><div class="atlas-grid"><label>Nome<input name="name" maxlength="120" required></label><label>Estado<input name="status" value="planejado" maxlength="80" required></label><label>Avanço (%)<input name="progress" type="number" min="0" max="100" step="1" value="0" required></label><label>Semana / período<input name="week" maxlength="80"></label><label>Responsável<input name="owner" maxlength="120"></label></div><footer><button type="button" data-stage-create-cancel>Cancelar</button><button class="atlas-primary" type="submit">Criar etapa</button></footer></form>`:stage?`<header><div><span class="atlas-eyebrow">ETAPA ${e(stage.id)} · ${e(stage.stageKey)}</span><h2>${e(stage.name)}</h2><p class="atlas-muted">${e(stage.status)} · ${Number(stage.progress)||0}% · ${sessions.length} compreensões do Worker</p></div><div class="atlas-actions"><button type="button" data-stage-edit-toggle>Editar etapa</button><button type="button" data-stage-delete ${admin?"":"disabled"}>Excluir etapa</button></div></header><form data-stage-form hidden><div class="atlas-grid"><label>Nome<input name="name" value="${e(stage.name)}" maxlength="120" required></label><label>Estado<input name="status" value="${e(stage.status)}" maxlength="80" required></label><label>Avanço (%)<input name="progress" type="number" min="0" max="100" step="1" value="${e(stage.progress)}" required></label><label>Semana / período<input name="week" value="${e(stage.week||"")}" maxlength="80"></label><label>Responsável<input name="owner" value="${e(stage.owner||"")}" maxlength="120"></label></div><footer><button class="atlas-primary" type="submit">Salvar etapa</button></footer></form><form data-comprehension-form><nav class="atlas-tabs" role="tablist">${tabs}</nav><section data-tab-panel="materials" ${s.activeTab!=="materials"?"hidden":""}><header><div><span class="atlas-eyebrow">MATERIAIS DA ETAPA</span><h3>Compreensão de materiais</h3><p>Itens, especificações e unidades usados na leitura de solicitações e registros.</p></div><button type="button" data-stage-material-add>Adicionar material</button></header><div data-stage-material-list>${materials.map((item,index)=>`<div class="atlas-material-row"><label>Material<input name="materialName" value="${e(item.name)}"></label><label>Descrição / aplicação<input name="materialDescription" value="${e(item.description||item.scope)}"></label><label>Quantidade<input name="materialQuantity" value="${e(item.quantity)}"></label><label>Unidade<input name="materialUnit" value="${e(item.unit)}"></label><label>Estado<input name="materialStatus" value="${e(item.status)}"></label><button type="button" data-stage-material-remove="${index}">Remover</button></div>`).join("")}</div><section class="atlas-info"><b>Compreensão do Worker</b><p>Origem: ${stage.workbenchSource==="persisted"?"sessões salvas no banco":"catálogo operacional original"}. Os materiais vinculados às atividades são editados na aba Atividades esperadas.</p><ul>${sessions.flatMap(session=>(Array.isArray(session.materials)?session.materials:[]).map(item=>typeof item==="string"?item:String((item as Record<string,unknown>).name||""))).filter(Boolean).map(name=>`<li>${e(name)}</li>`).join("")||"<li>Sem materiais vinculados às compreensões da etapa.</li>"}</ul></section><label>Compras e logística a considerar<textarea name="procurementFocus" rows="3">${e(this.listField("procurementFocus",config.procurementFocus))}</textarea></label></section><section data-tab-panel="activities" ${s.activeTab!=="activities"?"hidden":""}><header><div><span class="atlas-eyebrow">PLANEJAMENTO DA ETAPA</span><h3>Atividades esperadas</h3><p>Sessões originais do Worker usadas para organizar a agenda e interpretar registros.</p></div><button type="button" data-session-add>Adicionar atividade</button></header>${sessions.map((session,index)=>this.sessionMarkup(stage,session,index,sessions.length)).join("")||"<p>Nenhuma atividade de compreensão cadastrada no Worker.</p>"}<label>Atividades esperadas<textarea name="expectedActivities" rows="6">${e(this.listField("expectedActivities",activities))}</textarea></label><label>Pistas para identificar pedidos e ações<textarea name="requestHints" rows="4">${e(this.listField("requestHints",config.requestHints))}</textarea></label></section><section data-tab-panel="execution" ${s.activeTab!=="execution"?"hidden":""}><header><div><span class="atlas-eyebrow">CRITÉRIOS OPERACIONAIS</span><h3>Compreensão da execução</h3><p>Critérios usados na execução, liberação, evidências e inferência.</p></div></header><label>Descrição típica da execução<textarea name="typicalDescription" rows="4">${e(config.typicalDescription||"")}</textarea></label><div class="atlas-grid"><label>Requisitos<textarea name="requirements" rows="5">${e(this.listField("requirements",config.requirements))}</textarea></label><label>Condições para liberação<textarea name="conditions" rows="5">${e(this.listField("conditions",config.conditions))}</textarea></label><label>Evidências esperadas<textarea name="evidenceFocus" rows="4">${e(this.listField("evidenceFocus",config.evidenceFocus))}</textarea></label><label>Contexto para organização<textarea name="organizationContext" rows="4">${e(config.organizationContext||"")}</textarea></label><label class="atlas-wide">Instrução de organização<textarea name="organizationRequest" rows="3">${e(config.organizationRequest||"")}</textarea></label></div><section class="atlas-panel"><header><div><span class="atlas-eyebrow">UNIDADE DE PRODUÇÃO</span><h3>Como medir o avanço</h3></div></header><div class="atlas-grid"><label>Meta<input name="productionQuantity" type="number" min="0" step="any" value="${e(production.quantity)}"></label><label>Unidade<input name="productionUnit" value="${e(production.unit)}"></label><label>Ritmo<input name="productionRate" type="number" min="0" step="any" value="${e(production.rate)}"></label><label>Ritmo / unidade de tempo<input name="productionRateUnit" value="${e(production.rateUnit)}"></label></div></section><div class="atlas-grid"><label>Destinos do dono<input name="notifyOwner" value="${e(Array.isArray(targets.owner)?targets.owner.join(", "):"")}"></label><label>Destinos do administrador<input name="notifyAdmin" value="${e(Array.isArray(targets.admin)?targets.admin.join(", "):"")}"></label><label>Destinos do encarregado<input name="notifyForeman" value="${e(Array.isArray(targets.foreman)?targets.foreman.join(", "):"")}"></label></div></section><footer><span class="atlas-status" data-comprehension-status>Compreensão vinculada à etapa persistida.</span><button type="submit" class="atlas-primary" ${admin?"":"disabled"}>Salvar compreensão</button></footer></form>`:"<p>Selecione uma etapa para editar suas configurações.</p>"}</section></div></main>`;
    const sourceList=this.querySelector<HTMLElement>(".atlas-info");
    if(sourceList&&stage){const rows=sessions.flatMap(session=>(Array.isArray(session.materials)?session.materials:[]).map((value,index)=>{const material:WorkbenchMaterial=typeof value==="string"?{id:`${session.id}-${index}`,name:value,description:"",usage:"",quantity:"",unit:""}:value;return{session,material};}));sourceList.innerHTML=`<b>Compreensão do Worker · materiais e equipamentos por atividade</b><p>Origem: ${stage.workbenchSource==="persisted"?"sessões salvas no banco":stage.workbenchSource==="worker-defaults"?"catálogo original do Worker · somente leitura até salvar":"estado do Worker indisponível"}.</p><div class="atlas-session-material-list">${rows.map(({session,material})=>`<article><b>${this.esc(material.name)}</b><p>${this.esc(session.title)}</p>${material.description?`<small>${this.esc(material.description)}</small>`:""}${material.usage?`<small>Uso: ${this.esc(material.usage)}</small>`:""}<small>${this.esc(material.quantity||"Quantidade não definida")} ${this.esc(material.unit||"")} · ${this.esc(session.release||"Sem requisito de liberação")}</small></article>`).join("")||"<p>Sem materiais vinculados às compreensões da etapa.</p>"}</div>`;}
    const contactWritable = ["owner", "admin", "developer"].includes(s.actorRole);
    const contactInput = this.querySelector<HTMLInputElement>('[data-contact-form] input[name="whatsappNumber"]');
    const contactSubmit = this.querySelector<HTMLButtonElement>('[data-contact-form] button[type="submit"]');
    if (contactInput) contactInput.disabled = !contactWritable;
    if (contactSubmit) contactSubmit.disabled = !contactWritable;
    this.bindEvents();
  }
  private findStage(): ConfiguredStage | undefined { return this.snapshot.stages.find(stage=>String(stage.id)===this.snapshot.selectedStageId)||this.snapshot.stages[0]; }
  private replaceStage(nextStage: ConfiguredStage): void { this.state.next(previous=>({...previous,stages:previous.stages.map(stage=>stage.id===nextStage.id?nextStage:stage)})); }
  private scheduleWorkbenchSave(stage: ConfiguredStage): void {
    const key=stage.stageKey,old=this.workbenchTimers.get(key);if(old)clearTimeout(old);
    const timer=setTimeout(()=>{this.emit("atlas:settings-workbench-save",{stageId:String(stage.id),stageKey:key,state:stage.workbenchState,sessions:stage.workbenchSessions});},450);this.workbenchTimers.set(key,timer);
  }
  private updateSessionFields(event: Event): void {
    const target=event.target;if(!(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement))return;
    const stage=this.findStage();if(!stage)return;
    const sid=target.dataset.session,session=stage.workbenchSessions.find(item=>item.id===sid);if(!session)return;
    const changed=JSON.parse(JSON.stringify(session)) as WorkbenchSession;
    if(target.dataset.settingsSessionField) (changed as unknown as Record<string,unknown>)[target.dataset.settingsSessionField]=target.value;
    if(target.dataset.settingsMaterial){const index=Number(target.dataset.index),item=changed.materials[index];if(item&&typeof item!=="string")(item as WorkbenchMaterial)[target.dataset.settingsMaterial as keyof WorkbenchMaterial]=target.value;}
    if(target.dataset.settingsProperty){const item=changed.properties[Number(target.dataset.index)];if(item)item[target.dataset.settingsProperty as "label"|"value"]=target.value;}
    if(target.dataset.settingsCondition){const rows=(changed.inference?.conditions||changed.operational?.entryConditions||[]) as Array<Record<string,unknown>>;const item=rows[Number(target.dataset.index)];if(item&&typeof item==="object")item[target.dataset.settingsCondition]=target.value;changed.inference={...(changed.inference||{}),conditions:rows};}
    if(target.dataset.settingsProduction){const current=(changed.inference?.production||changed.operational?.production||{}) as Record<string,unknown>;const value=target.value===""?null:target.dataset.settingsProduction==="referenceRate"?Number(target.value):target.value;changed.inference={...(changed.inference||{}),manual:true,production:{...current,[target.dataset.settingsProduction]:value}};}
    if(target.dataset.settingsProgramming)changed.programming={...changed.programming,[target.dataset.settingsProgramming]:target.value};
    if(target.dataset.settingsOption){const owner=target.dataset.owner==="automation"?"automation":"programming",record={...(owner==="automation"?changed.automation:changed.programming),[target.dataset.settingsOption]:(target as HTMLInputElement).checked};if(owner==="automation")changed.automation=record;else changed.programming=record;}
    const sessions=stage.workbenchSessions.map(item=>item.id===changed.id?changed:item),nextStage={...stage,workbenchSessions:sessions,workbenchState:{...stage.workbenchState,inputSessions:sessions}};
    this.skipRender=true;this.state.next(previous=>({...previous,stages:previous.stages.map(item=>item.id===stage.id?nextStage:item)}));this.skipRender=false;
    const status=this.querySelector<HTMLElement>(`[data-settings-session-status="${CSS.escape(changed.id)}"]`);if(status)status.textContent="Alteração pendente de salvamento…";
    this.scheduleWorkbenchSave(nextStage);
  }
  private bindEvents(): void {
    this.onclick=event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest<HTMLButtonElement>("button");if(!button)return;
      if(button.dataset.stageSelect){this.state.next(s=>({...s,selectedStageId:button.dataset.stageSelect||"",activeTab:"materials",creatingStage:false,feedback:""}));return;}
      if(button.dataset.settingsTab){const tab=button.dataset.settingsTab as SettingsState["activeTab"];this.skipRender=true;this.state.next(s=>({...s,activeTab:tab}));this.skipRender=false;this.querySelectorAll<HTMLElement>("[data-tab-panel]").forEach(panel=>panel.hidden=panel.dataset.tabPanel!==tab);this.querySelectorAll<HTMLButtonElement>("[data-settings-tab]").forEach(item=>item.setAttribute("aria-selected",String(item===button)));return;}
      if(button.hasAttribute("data-stage-create")){this.state.next(s=>({...s,creatingStage:true}));return;}
      if(button.hasAttribute("data-stage-create-cancel")){this.state.next(s=>({...s,creatingStage:false}));return;}
      if(button.hasAttribute("data-stage-edit-toggle")){const form=this.querySelector<HTMLFormElement>("[data-stage-form]");if(form)form.hidden=!form.hidden;return;}
      if(button.hasAttribute("data-stage-material-add")){const list=this.querySelector<HTMLElement>("[data-stage-material-list]");if(list){const index=list.querySelectorAll(".atlas-material-row").length;list.insertAdjacentHTML("beforeend",`<div class="atlas-material-row"><label>Material<input name="materialName" value=""></label><label>Descrição / aplicação<input name="materialDescription" value=""></label><label>Quantidade<input name="materialQuantity" value=""></label><label>Unidade<input name="materialUnit" value=""></label><label>Estado<input name="materialStatus" value=""></label><button type="button" data-stage-material-remove="${index}">Remover</button></div>`);}return;}
      if(button.dataset.stageMaterialRemove!==undefined){button.closest(".atlas-material-row")?.remove();return;}
      if(button.hasAttribute("data-stage-delete")){const stage=this.findStage();if(stage&&confirm(`Excluir a etapa “${stage.name}”? Só será permitido se não houver dados vinculados.`))this.emit("atlas:settings-stage-delete",{stageId:stage.id});return;}
      if(button.hasAttribute("data-session-add")){const stage=this.findStage();if(!stage)return;const stamp=Date.now(),session:WorkbenchSession={id:`input-custom-${stamp}`,activityId:`activity-custom-${stamp}`,title:"Nova atividade",text:"",unit:"",materials:[],release:"",responsible:"",properties:[],automation:{propagateRelations:true,generateSchedule:true,generateResources:true,notifyWorker:true},programming:{scheduleMode:"parallel",productionModeEnabled:false,productionBasis:"registro",mapLocation:true,requireAcceptance:false},inference:null,order:stage.workbenchSessions.length,custom:true};this.state.next(s=>({...s,stages:s.stages.map(item=>item.id===stage.id?{...item,workbenchSessions:[...item.workbenchSessions,session],workbenchState:{...item.workbenchState,inputSessions:[...item.workbenchSessions,session]}}:item)}));this.scheduleWorkbenchSave(this.findStage()!);return;}
      const sessionId=button.dataset.session||"",stage=this.findStage(),session=stage?.workbenchSessions.find(item=>item.id===sessionId);
      if(button.hasAttribute("data-settings-material-add")&&stage&&session){const updated={...session,materials:[...(session.materials||[]),{id:`material-${Date.now()}`,name:"",description:"",usage:"",quantity:"",unit:""}]},sessions=stage.workbenchSessions.map(item=>item.id===session.id?updated:item),nextStage={...stage,workbenchSessions:sessions,workbenchState:{...stage.workbenchState,inputSessions:sessions}};this.replaceStage(nextStage);const editor=this.querySelector<HTMLElement>(`[data-settings-session="${CSS.escape(sessionId)}"]`);if(editor instanceof HTMLDetailsElement)editor.open=true;this.scheduleWorkbenchSave(nextStage);return;}
      if(button.hasAttribute("data-settings-material-remove")&&stage&&session){const updated={...session,materials:(session.materials||[]).filter((_,i)=>i!==Number(button.dataset.index))},sessions=stage.workbenchSessions.map(item=>item.id===session.id?updated:item),nextStage={...stage,workbenchSessions:sessions,workbenchState:{...stage.workbenchState,inputSessions:sessions}};this.replaceStage(nextStage);this.scheduleWorkbenchSave(nextStage);return;}
      if(button.hasAttribute("data-settings-property-add")&&stage&&session){const updated={...session,properties:[...(session.properties||[]),{id:`property-${Date.now()}`,label:"Nova propriedade",value:""}]},sessions=stage.workbenchSessions.map(item=>item.id===session.id?updated:item),nextStage={...stage,workbenchSessions:sessions,workbenchState:{...stage.workbenchState,inputSessions:sessions}};this.replaceStage(nextStage);this.scheduleWorkbenchSave(nextStage);return;}
      if(button.hasAttribute("data-settings-property-remove")&&stage&&session){const updated={...session,properties:session.properties.filter((_,i)=>i!==Number(button.dataset.index))},sessions=stage.workbenchSessions.map(item=>item.id===session.id?updated:item),nextStage={...stage,workbenchSessions:sessions,workbenchState:{...stage.workbenchState,inputSessions:sessions}};this.replaceStage(nextStage);this.scheduleWorkbenchSave(nextStage);return;}
      if(button.hasAttribute("data-settings-condition-add")&&stage&&session){const rows=(session.inference?.conditions||session.operational?.entryConditions||[]) as unknown[],updated={...session,inference:{...(session.inference||{}),conditions:[...rows,{kind:"operacional",label:"Nova condição",trigger:"",severity:"warning",notifyRoles:["owner"]}]}},sessions=stage.workbenchSessions.map(item=>item.id===session.id?updated:item),nextStage={...stage,workbenchSessions:sessions,workbenchState:{...stage.workbenchState,inputSessions:sessions}};this.replaceStage(nextStage);this.scheduleWorkbenchSave(nextStage);return;}
      if(button.hasAttribute("data-settings-condition-remove")&&stage&&session){const rows=(session.inference?.conditions||session.operational?.entryConditions||[]) as unknown[],updated={...session,inference:{...(session.inference||{}),conditions:rows.filter((_,i)=>i!==Number(button.dataset.index))}},sessions=stage.workbenchSessions.map(item=>item.id===session.id?updated:item),nextStage={...stage,workbenchSessions:sessions,workbenchState:{...stage.workbenchState,inputSessions:sessions}};this.replaceStage(nextStage);this.scheduleWorkbenchSave(nextStage);return;}
      if(button.dataset.settingsSessionMove&&stage&&session){const rows=this.sessionsFor(stage),from=rows.findIndex(item=>item.id===session.id),to=from+(button.dataset.settingsSessionMove==="up"?-1:1);if(to<0||to>=rows.length)return;[rows[from],rows[to]]=[rows[to],rows[from]];rows.forEach((item,index)=>item.order=index);const nextStage={...stage,workbenchSessions:rows,workbenchState:{...stage.workbenchState,inputSessions:rows}};this.replaceStage(nextStage);const editor=this.querySelector<HTMLElement>(`[data-settings-session="${CSS.escape(session.id)}"]`);if(editor instanceof HTMLDetailsElement)editor.open=true;this.scheduleWorkbenchSave(nextStage);return;}
      if(button.hasAttribute("data-settings-session-remove")&&stage&&session){const sessions=stage.workbenchSessions.filter(item=>item.id!==session.id),nextStage={...stage,workbenchSessions:sessions,workbenchState:{...stage.workbenchState,inputSessions:sessions}};this.replaceStage(nextStage);this.scheduleWorkbenchSave(nextStage);return;}
      if(button.hasAttribute("data-settings-infer")&&stage&&session){button.disabled=true;const status=this.querySelector<HTMLElement>(`[data-settings-session-status="${CSS.escape(session.id)}"]`);if(status)status.textContent="Consultando inferência do Worker…";this.emit("atlas:settings-infer",{stageKey:stage.stageKey,session});return;}
      if(button.hasAttribute("data-role-cancel")){this.state.next(s=>({...s,feedback:""}));const form=this.querySelector<HTMLFormElement>("[data-role-form]");form?.reset();form?.removeAttribute("data-edit-id");button.hidden=true;return;}
      if(button.dataset.roleEdit){const role=this.snapshot.roles.find(item=>item.id===button.dataset.roleEdit),form=this.querySelector<HTMLFormElement>("[data-role-form]");if(!role||!form)return;form.elements.namedItem("name");(form.elements.namedItem("name") as HTMLInputElement).value=role.name;form.dataset.editId=role.id;form.querySelectorAll<HTMLInputElement>('input[name="permissions"]').forEach(input=>input.checked=role.permissions.includes(input.value));const cancel=form.querySelector<HTMLButtonElement>("[data-role-cancel]");if(cancel)cancel.hidden=false;return;}
      if(button.dataset.roleDelete&&confirm("Excluir este papel? Primeiro revogue as chaves ativas vinculadas.")){this.emit("atlas:settings-role-delete",{id:button.dataset.roleDelete});return;}
      if(button.dataset.keyRevoke&&confirm("Revogar esta chave? A credencial deixará de autenticar imediatamente.")){this.emit("atlas:settings-key-revoke",{id:button.dataset.keyRevoke});return;}
      if(button.hasAttribute("data-copy-created-key")){const token=this.querySelector("[data-settings-key-once] code")?.textContent;if(token)void navigator.clipboard?.writeText(token);return;}
    };
    this.oninput=event=>this.updateSessionFields(event);
    this.onchange=event=>this.updateSessionFields(event);
    this.querySelector<HTMLFormElement>("[data-stage-form]")?.addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget as HTMLFormElement,data=new FormData(form),payload={name:String(data.get("name")||"").trim(),status:String(data.get("status")||"").trim(),progress:Number(data.get("progress")||0),week:String(data.get("week")||"").trim(),owner:String(data.get("owner")||"").trim()};if(!payload.name||!payload.status||!Number.isFinite(payload.progress)||payload.progress<0||payload.progress>100){this.setFeedback("Informe nome, estado e avanço entre 0 e 100%.");return;}this.emit("atlas:settings-stage-save",{stageId:this.snapshot.creatingStage?null:this.findStage()?.id,payload});});
    this.querySelector<HTMLFormElement>("[data-comprehension-form]")?.addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget as HTMLFormElement,stage=this.findStage();if(!stage)return;const data=new FormData(form),lines=(name:string)=>String(data.get(name)||"").split(/\r?\n/).map(item=>item.trim()).filter(Boolean),materialsTable=[...form.querySelectorAll<HTMLElement>(".atlas-material-row")].map(row=>({name:(row.querySelector<HTMLInputElement>('[name="materialName"]')?.value||"").trim(),description:(row.querySelector<HTMLInputElement>('[name="materialDescription"]')?.value||"").trim(),quantity:(row.querySelector<HTMLInputElement>('[name="materialQuantity"]')?.value||"").trim(),unit:(row.querySelector<HTMLInputElement>('[name="materialUnit"]')?.value||"").trim(),status:(row.querySelector<HTMLInputElement>('[name="materialStatus"]')?.value||"").trim()})).filter(item=>item.name),phoneList=(name:string)=>String(data.get(name)||"").split(/[,;\n]/).map(item=>item.trim()).filter(Boolean),payload={requirements:lines("requirements"),conditions:lines("conditions"),typicalDescription:String(data.get("typicalDescription")||"").trim(),requestHints:lines("requestHints"),evidenceFocus:lines("evidenceFocus"),procurementFocus:lines("procurementFocus"),organizationRequest:String(data.get("organizationRequest")||"").trim(),organizationContext:String(data.get("organizationContext")||"").trim(),notificationTargets:{owner:phoneList("notifyOwner"),admin:phoneList("notifyAdmin"),foreman:phoneList("notifyForeman")},executionProfile:{...stage.aiConfig?.executionProfile,materialsTable,expectedActivities:lines("expectedActivities"),production:{quantity:data.get("productionQuantity")===""?null:Number(data.get("productionQuantity")),unit:String(data.get("productionUnit")||"").trim(),rate:data.get("productionRate")===""?null:Number(data.get("productionRate")),rateUnit:String(data.get("productionRateUnit")||"").trim()}}};this.emit("atlas:settings-comprehension-save",{stageId:stage.id,payload});});
    this.querySelector<HTMLFormElement>("[data-contact-form]")?.addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget as HTMLFormElement,phone=String(new FormData(form).get("whatsappNumber")||"").replace(/\D/g,"");if(phone.length<10||phone.length>15){this.setFeedback("Informe um número de WhatsApp válido com DDD.");return;}this.emit("atlas:settings-contact-save",{whatsappNumber:phone});});
    this.querySelector<HTMLFormElement>("[data-role-form]")?.addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget as HTMLFormElement,data=new FormData(form),permissions=data.getAll("permissions").map(String),name=String(data.get("name")||"").trim();if(name.length<2||!permissions.length){const output=form.querySelector<HTMLOutputElement>("[data-role-status]");if(output)output.textContent="Informe o nome e selecione ao menos uma permissão.";return;}this.emit("atlas:settings-role-save",{id:form.dataset.editId||null,name,permissions});});
    this.querySelector<HTMLFormElement>("[data-key-form]")?.addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget as HTMLFormElement,data=new FormData(form);this.emit("atlas:settings-key-create",{label:String(data.get("label")||"").trim(),roleId:String(data.get("roleId")||"")});});
  }
}
if (!customElements.get("atlas-settings")) customElements.define("atlas-settings", AtlasSettings);

type LeadsState = {
  records: PublicCommercialRecords | null;
  feed: InstagramFeed | null;
  policy: InstagramCommentPolicy | null;
  tab: "leads" | "instagram";
  query: string;
  selectedId: string;
  loading: boolean;
  feedLoading: boolean;
  policySaving: boolean;
  error: string;
  feedError: string;
  feedback: string;
  replyFor: string;
  replyDraft: string;
};

const instagramPolicyPresets: Record<string, { label: string; tone: string; instructions: string }> = {
  acolhedora: { label: "Acolhedora", tone: "acolhedor e objetivo", instructions: "Agradeça o comentário, responda somente com informações confirmadas do empreendimento e convide a pessoa a falar com a equipe para detalhes de lote e condições." },
  comercial: { label: "Comercial", tone: "comercial e consultivo", instructions: "Reconheça a intenção, destaque a possibilidade de conhecer os lotes e peça apenas a informação necessária para encaminhar o atendimento comercial." },
  institucional: { label: "Institucional", tone: "institucional e claro", instructions: "Responda com linguagem institucional, sem prometer preço, reserva, aprovação ou prazo, e direcione dúvidas específicas para a equipe responsável." },
  visita: { label: "Visita", tone: "prático e convidativo", instructions: "Agradeça o interesse, convide para conhecer o empreendimento em Amargosa e peça o melhor canal ou horário para a equipe retornar." },
};

const defaultInstagramPolicy: InstagramCommentPolicy = {
  preset: "acolhedora", tone: instagramPolicyPresets.acolhedora.tone,
  instructions: instagramPolicyPresets.acolhedora.instructions,
  autoDraft: true, requireApproval: true,
};

const leadsStyles = `<style>
atlas-leads{display:block;min-width:0}.atlas-leads *{box-sizing:border-box}.atlas-leads{color:#20283a}.atlas-leads h1,.atlas-leads h2,.atlas-leads h3,.atlas-leads p{margin-top:0}.atlas-leads button,.atlas-leads input,.atlas-leads textarea,.atlas-leads select{font:inherit}.atlas-leads button{min-height:38px;padding:8px 12px;border:1px solid #d9e0eb;border-radius:9px;background:#fff;color:#26334b;cursor:pointer}.atlas-leads button:hover{border-color:#76a4ee;background:#f5f8fe}.atlas-leads button:disabled{cursor:not-allowed;opacity:.6}.atlas-leads .atlas-leads-shell{display:grid;gap:16px}.atlas-leads header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.atlas-leads .atlas-eyebrow{color:#3977d5;font:700 10px ui-monospace,monospace;letter-spacing:.08em}.atlas-leads h1{margin:7px 0;font-size:clamp(24px,3vw,34px);color:#19243b}.atlas-leads h2{margin:0 0 5px;font-size:18px;color:#1e2b43}.atlas-leads p,.atlas-leads .atlas-muted{color:#6d788a}.atlas-leads .atlas-muted{font-size:12px}.atlas-leads .atlas-actions{display:flex;gap:8px;flex-wrap:wrap}.atlas-leads .atlas-primary{border-color:#246be0;background:#246be0;color:#fff}.atlas-leads .atlas-tabs{display:flex;gap:6px;border-bottom:1px solid #e0e6ef}.atlas-leads .atlas-tabs button{border:0;border-radius:8px 8px 0 0;background:transparent}.atlas-leads .atlas-tabs button[aria-selected=true]{background:#eef4ff;color:#215db5}.atlas-leads .atlas-leads-toolbar{display:flex;align-items:end;gap:12px}.atlas-leads label{display:grid;gap:6px;color:#59667a;font-size:12px}.atlas-leads .atlas-leads-toolbar label{flex:1}.atlas-leads input,.atlas-leads textarea,.atlas-leads select{width:100%;min-height:40px;padding:9px 11px;border:1px solid #d7deea;border-radius:9px;background:#fff;color:#18243e}.atlas-leads textarea{min-height:84px;resize:vertical}.atlas-leads .atlas-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.atlas-leads .atlas-card,.atlas-leads .atlas-panel{min-width:0;padding:16px;border:1px solid #e0e6ef;border-radius:13px;background:#fff;box-shadow:0 4px 16px #192b490d}.atlas-leads .atlas-lead-card{text-align:left;display:grid;gap:8px;min-height:130px}.atlas-leads .atlas-lead-card[aria-pressed=true]{border-color:#4384ea;background:#f5f8ff}.atlas-leads .atlas-lead-card header{align-items:center}.atlas-leads .atlas-lead-card small,.atlas-leads .atlas-lead-card footer{color:#738095;font-size:11px}.atlas-leads .atlas-lead-card footer{display:flex;justify-content:space-between;gap:8px}.atlas-leads .atlas-profile{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(250px,.8fr);gap:12px}.atlas-leads .atlas-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.atlas-leads .atlas-profile-grid div{min-width:0;padding:10px;border-radius:9px;background:#f6f8fb}.atlas-leads .atlas-profile-grid small,.atlas-leads .atlas-profile-grid b{display:block;overflow-wrap:anywhere}.atlas-leads .atlas-profile-grid small{margin-bottom:5px;color:#718096;font-size:10px}.atlas-leads .atlas-profile-grid b{font-size:12px}.atlas-leads [role=alert]{padding:12px;border:1px solid #edc3c3;border-radius:9px;background:#fff6f6;color:#9b2935}.atlas-leads .atlas-post-grid{display:grid;gap:12px}.atlas-leads .atlas-post{display:grid;grid-template-columns:minmax(180px,280px) minmax(0,1fr);gap:14px}.atlas-leads .atlas-post-media{overflow:hidden;border-radius:10px;background:#eef1f4;aspect-ratio:1}.atlas-leads .atlas-post-media img,.atlas-leads .atlas-post-media video{width:100%;height:100%;object-fit:cover}.atlas-leads .atlas-comment{padding:10px 0;border-top:1px solid #e8ecf2}.atlas-leads .atlas-comment header{align-items:center;color:#738095;font-size:11px}.atlas-leads .atlas-comment p{margin:7px 0;font-size:13px}.atlas-leads .atlas-comment footer{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#738095;font-size:11px}.atlas-leads .atlas-policy{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.atlas-leads .atlas-policy .wide{grid-column:1/-1}.atlas-leads .atlas-feedback{min-height:20px;color:#52627b;font-size:12px}.atlas-leads .atlas-empty{padding:22px;text-align:center;color:#748095;border:1px dashed #d8e0eb;border-radius:12px}.atlas-leads .atlas-reply{display:grid;gap:8px;margin-top:8px}@media(max-width:760px){.atlas-leads .atlas-cards,.atlas-leads .atlas-profile,.atlas-leads .atlas-post{grid-template-columns:1fr}.atlas-leads .atlas-post-media{max-width:320px}.atlas-leads .atlas-leads-toolbar{align-items:stretch;flex-direction:column}}@media(max-width:480px){.atlas-leads .atlas-card,.atlas-leads .atlas-panel{padding:13px}.atlas-leads .atlas-profile-grid,.atlas-leads .atlas-policy{grid-template-columns:1fr}.atlas-leads .atlas-policy .wide{grid-column:auto}.atlas-leads header{flex-wrap:wrap}}
</style>`;

/** Administrative CRM element. It owns only ephemeral filters, tab, selection and reply draft. */
export class AtlasLeads extends HTMLElement {
  private snapshot: LeadsState;
  private readonly state: AtomicState<LeadsState>;
  constructor() {
    super();
    const initial: LeadsState = { records: null, feed: null, policy: null, tab: "leads", query: "", selectedId: "", loading: true, feedLoading: false, policySaving: false, error: "", feedError: "", feedback: "", replyFor: "", replyDraft: "" };
    function* state(value: LeadsState): Generator<LeadsState, never, StateSetter<LeadsState>> { while (true) value = (yield value)(value); }
    const iterator = state(initial); iterator.next(); this.snapshot = initial;
    this.state = { next: setter => { this.snapshot = iterator.next(setter).value; this.render(); return this.snapshot; } };
  }
  private esc(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c] || c)); }
  setRecords(records: PublicCommercialRecords): void { this.state.next(s => ({ ...s, records, selectedId: records.leads.concat(records.reservations).some(row => row.id === s.selectedId) ? s.selectedId : records.leads[0]?.id || records.reservations[0]?.id || "", loading: false, error: "" })); }
  setRecordsError(error: string): void { this.state.next(s => ({ ...s, loading: false, error })); }
  setFeed(feed: InstagramFeed): void { this.state.next(s => ({ ...s, feed, feedLoading: false, feedError: feed.source === "unavailable" ? String(feed.error || "Conexão do Instagram indisponível.") : "" })); }
  setFeedError(error: string): void { this.state.next(s => ({ ...s, feedLoading: false, feedError: error })); }
  setPolicy(policy: InstagramCommentPolicy): void { this.state.next(s => ({ ...s, policy })); }
  setPolicySaving(value: boolean): void { this.state.next(s => ({ ...s, policySaving: value })); }
  setFeedback(value: string): void { this.state.next(s => ({ ...s, feedback: value })); }
  setReplyResult(value: string, error = false): void { this.state.next(s => ({ ...s, replyFor: "", replyDraft: "", feedback: value, feedError: error ? value : s.feedError })); }
  private currentRecords(): PublicCommercialLead[] { return [...(this.snapshot.records?.leads || []), ...(this.snapshot.records?.reservations || [])]; }
  private render(): void {
    const s=this.snapshot,e=(value:unknown)=>this.esc(value),all=this.currentRecords(),selected=all.find(row=>row.id===s.selectedId)||null,query=s.query.trim().toLocaleLowerCase("pt-BR"),visible=all.filter(row=>!query||`${row.name} ${row.lot} ${row.whatsapp} ${row.email} ${row.objective} ${row.status} ${row.source}`.toLocaleLowerCase("pt-BR").includes(query));
    const list=s.loading?'<p class="atlas-empty">Consultando leads e reservas persistidos no repositório…</p>':s.error?`<p role="alert">${e(s.error)}</p>`:visible.map(row=>`<button type="button" class="atlas-card atlas-lead-card" data-lead-select="${e(row.id)}" aria-pressed="${row.id===s.selectedId}"><header><b>${e(row.name||"Contato não identificado")}</b><span>${e(row.status)}</span></header><strong>${e(row.lot||"Lote não informado")}</strong><small>${e(row.objective||"Objetivo não informado")} · ${e(row.source)} · ${row.recordKind==="reservation"?"Reserva":"Lead"}</small><footer><span>${e(row.whatsapp||row.email||"Contato não informado")}</span><span>Abrir perfil →</span></footer></button>`).join("")||'<p class="atlas-empty">Nenhum lead ou reserva foi retornado pelo repositório.</p>';
    const profile=selected?`<section class="atlas-profile"><article class="atlas-panel"><header><div><span class="atlas-eyebrow">${selected.recordKind==="reservation"?"RESERVA PÚBLICA":"LEAD PÚBLICO"} · ${e(selected.id)}</span><h2>${e(selected.name||"Contato não identificado")}</h2><p>${e(selected.status)} · ${e(selected.lot||"Lote não informado")}</p></div><span>${e(selected.source)}</span></header><div class="atlas-profile-grid">${[["WhatsApp",selected.whatsapp], ["E-mail",selected.email], ["Instagram",selected.instagramHandle], ["Objetivo",selected.objective], ["Faixa declarada",selected.budget], ["Orientação solar",selected.sun], ["Terreno",selected.terrain], ["Altitude",selected.altitude], ["Documento",selected.documentType?`${selected.documentType} · final ${selected.documentLast4||"não informado"}`:"Não informado"], ["Recebido",selected.createdAt]].map(([label,value])=>`<div><small>${e(label)}</small><b>${e(value||"Não informado")}</b></div>`).join("")}</div><section><span class="atlas-eyebrow">RESUMO REGISTRADO</span><p>${e(selected.conversationSummary||"Nenhum resumo de conversa persistido para este contato.")}</p></section><footer class="atlas-actions"><button type="button" data-lead-chat>Atender no chat</button><button type="button" data-lead-map>Ver lote no mapa</button></footer></article><aside class="atlas-panel"><span class="atlas-eyebrow">CONTINUIDADE COMERCIAL</span><h2>Atendimento</h2><p>O perfil apresenta os dados persistidos recebidos; confirme as informações com o contato antes de negociar ou reservar.</p><p class="atlas-muted">Atualizado: ${e(selected.updatedAt||"não informado")}</p></aside></section>`:'<section class="atlas-panel"><p class="atlas-muted">Selecione um perfil para consultar os dados recebidos.</p></section>';
    const policy={...defaultInstagramPolicy,...(s.policy||{})},feed=s.feed,posts=(feed?.posts||[]).map(post=>`<article class="atlas-card atlas-post"><div class="atlas-post-media">${String(post.mediaType).toUpperCase()==="VIDEO"?`<video controls preload="metadata" src="${e(post.mediaUrl||post.thumbnailUrl)}" aria-label="Vídeo do Instagram"></video>`:`<img loading="lazy" src="${e(post.mediaUrl||post.thumbnailUrl)}" alt="Publicação do Instagram">`}</div><div><header><div><span class="atlas-eyebrow">INSTAGRAM · ${e(post.timestamp||"sem data")}</span><p>${Number(post.likeCount)||0} curtidas · ${Number(post.commentsCount)||post.comments.length} comentários</p></div><a href="${e(post.permalink)}" target="_blank" rel="noopener">Abrir publicação ↗</a></header><p>${e(post.caption||"Publicação sem legenda")}</p>${(post.comments||[]).map(comment=>{const active=comment.id===s.replyFor;return `<section class="atlas-comment"><header><b>@${e(comment.username||"perfil")}</b><time>${e(comment.timestamp||"")}</time></header><p>${e(comment.text)}</p><footer><span>${Number(comment.likeCount)||0} curtidas · ${(comment.replies||[]).length} respostas</span>${active?"":`<button type="button" data-comment-draft="${e(comment.id)}">Preparar resposta</button>`}</footer>${active?`<div class="atlas-reply"><textarea data-reply-draft>${e(s.replyDraft||"")}</textarea><div class="atlas-actions"><button type="button" data-comment-send="${e(comment.id)}">Enviar ao Instagram</button><button type="button" data-comment-cancel>Cancelar</button></div><small>O envio é externo e exige confirmação explícita.</small></div>`:""}</section>`;}).join("")||'<p class="atlas-muted">Nenhum comentário retornado pela API.</p>'}</div></article>`).join("");
    const instagram=s.tab==="instagram"?`<section class="atlas-panel"><header><div><span class="atlas-eyebrow">COMUNICAÇÃO · INSTAGRAM</span><h2>Publicações e comentários</h2><p class="atlas-muted">Leitura pela API oficial da Meta; rascunhos usam diretriz persistida.</p></div><div class="atlas-actions"><span>${s.feedLoading?"Atualizando…":feed?.source==="meta"?"API Meta conectada":"Conexão indisponível"}</span><button type="button" data-feed-refresh>Atualizar</button></div></header>${s.feedError?`<p role="alert">${e(s.feedError)}</p>`:""}<form data-policy-form><div class="atlas-policy"><label>Diretriz<select name="preset">${Object.entries(instagramPolicyPresets).map(([key,value])=>`<option value="${key}"${policy.preset===key?" selected":""}>${e(value.label)}</option>`).join("")}</select></label><label>Tom<input name="tone" maxlength="120" value="${e(policy.tone)}"></label><label class="wide">Instruções de resposta<textarea name="instructions" maxlength="1200">${e(policy.instructions)}</textarea></label></div><footer class="atlas-actions"><button type="submit" class="atlas-primary"${s.policySaving?" disabled":""}>${s.policySaving?"Salvando…":"Salvar diretriz"}</button><span class="atlas-muted">Rascunho assistido · aprovação humana obrigatória</span></footer></form>${s.feedback?`<p class="atlas-feedback" role="status">${e(s.feedback)}</p>`:""}</section><div class="atlas-post-grid">${s.feedLoading&&!feed?'<p class="atlas-empty">Consultando a API do Instagram…</p>':posts||'<p class="atlas-empty">Nenhuma publicação retornada. A ausência de dados não é substituída por conteúdo demonstrativo.</p>'}</div>`:"";
    this.innerHTML=`${leadsStyles}<main class="atlas-leads-shell"><header><div><span class="atlas-eyebrow">ATENDIMENTO COMERCIAL · CAPTAÇÃO</span><h1>Leads</h1><p>Contatos e reservas reais recebidos pelos canais conectados.</p></div><div class="atlas-actions"><button type="button" data-open-public>Página pública</button><button type="button" data-leads-refresh>Atualizar leads</button></div></header><nav class="atlas-tabs" aria-label="Conteúdo comercial"><button type="button" data-leads-tab="leads" aria-selected="${s.tab==="leads"}">Leads e reservas <small>${all.length}</small></button><button type="button" data-leads-tab="instagram" aria-selected="${s.tab==="instagram"}">Instagram</button></nav>${s.tab==="leads"?`<section class="atlas-leads-toolbar"><label>Buscar contato, lote ou objetivo<input type="search" data-leads-query value="${e(s.query)}" placeholder="Nome, telefone, lote…"></label><span class="atlas-muted">${visible.length} de ${all.length} contatos · leitura ${e(s.records?.readAt||"pendente")}</span></section><div class="atlas-cards">${list}</div>${profile}`:instagram}</main>`;
  }
  connectedCallback(): void {
    this.render();
    this.addEventListener("input", event=>{const target=event.target;if(target instanceof HTMLInputElement&&target.matches("[data-leads-query]")){const cursor=target.selectionStart;this.state.next(s=>({...s,query:target.value}));const next=this.querySelector<HTMLInputElement>("[data-leads-query]");next?.focus();if(cursor!==null)next?.setSelectionRange(cursor,cursor);return;}if(target instanceof HTMLTextAreaElement&&target.matches("[data-reply-draft]"))this.state.next(s=>({...s,replyDraft:target.value}));});
    this.addEventListener("click", event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest<HTMLButtonElement>("button");if(!button)return;if(button.dataset.leadsTab){this.state.next(s=>({...s,tab:button.dataset.leadsTab as LeadsState["tab"],feedback:""}));if(button.dataset.leadsTab==="instagram"&&!this.snapshot.feed){this.state.next(s=>({...s,feedLoading:true}));this.dispatchEvent(new CustomEvent("atlas:instagram-refresh",{bubbles:true,detail:{element:this}}));}return;}if(button.hasAttribute("data-leads-refresh")){this.dispatchEvent(new CustomEvent("atlas:leads-refresh",{bubbles:true,detail:{element:this}}));return;}if(button.hasAttribute("data-open-public")){this.dispatchEvent(new CustomEvent("atlas:leads-open-public",{bubbles:true,detail:{element:this}}));return;}if(button.hasAttribute("data-feed-refresh")){this.state.next(s=>({...s,feedLoading:true}));this.dispatchEvent(new CustomEvent("atlas:instagram-refresh",{bubbles:true,detail:{element:this}}));return;}const selection=button.dataset.leadSelect;if(selection){this.state.next(s=>({...s,selectedId:selection}));return;}if(button.hasAttribute("data-lead-chat")){const lead=this.currentRecords().find(row=>row.id===this.snapshot.selectedId);if(lead)this.dispatchEvent(new CustomEvent("atlas:lead-chat",{bubbles:true,detail:{element:this,lead}}));return;}if(button.hasAttribute("data-lead-map")){this.dispatchEvent(new CustomEvent("atlas:navigate",{bubbles:true,detail:{view:"map"}}));return;}if(button.dataset.commentDraft){const comment=this.snapshot.feed?.posts.flatMap(post=>post.comments||[]).find(item=>item.id===button.dataset.commentDraft);if(!comment)return;const policy={...defaultInstagramPolicy,...(this.snapshot.policy||{})},first=String(comment.username||"").replace(/^@/,"").split(/[._-]/)[0],greeting=first?`Olá, ${first}!`:"Olá!",draft=`${greeting} Obrigado por comentar no Aliança Park. ${policy.instructions} Fale com nossa equipe pelo Direct para receber as informações confirmadas do empreendimento em Amargosa, Bahia.`.replace(/\s+/g," ").slice(0,980);this.state.next(s=>({...s,replyFor:comment.id,replyDraft:draft}));return;}if(button.hasAttribute("data-comment-cancel")){this.state.next(s=>({...s,replyFor:"",replyDraft:""}));return;}const send=button.dataset.commentSend;if(send){if(!confirm("Enviar esta resposta publicamente no Instagram?"))return;button.disabled=true;this.dispatchEvent(new CustomEvent("atlas:instagram-reply",{bubbles:true,detail:{element:this,commentId:send,message:this.snapshot.replyDraft}}));}});
    this.addEventListener("submit",event=>{const form=event.target;if(!(form instanceof HTMLFormElement)||!form.matches("[data-policy-form]"))return;event.preventDefault();const data=new FormData(form),preset=String(data.get("preset")||"acolhedora"),payload={...defaultInstagramPolicy,preset,tone:String(data.get("tone")||"").trim(),instructions:String(data.get("instructions")||"").trim()};if(!payload.tone||!payload.instructions){this.setFeedback("Informe o tom e as instruções da diretriz.");return;}this.setPolicySaving(true);this.dispatchEvent(new CustomEvent("atlas:instagram-policy-save",{bubbles:true,detail:{element:this,policy:payload}}));});
    this.dispatchEvent(new CustomEvent("atlas:leads-connected",{bubbles:true,detail:{element:this}}));
  }
}
if (!customElements.get("atlas-leads")) customElements.define("atlas-leads", AtlasLeads);

type LotDevelopmentState = { profiles: LotDevelopmentProfile[] | null; cashEntries: CashFlowRecord[]; query: string; filter: "all" | "lot" | "common-area"; selectedId: string; formOpen: boolean; loading: boolean; saving: boolean; error: string; feedback: string };
const lotDevelopmentStyles = `<style>
  atlas-lot-development{display:block;min-width:0;color:#20283a}.atlas-lot-development{display:grid;gap:18px}.atlas-lot-development *{box-sizing:border-box}.atlas-lot-development h1,.atlas-lot-development h2,.atlas-lot-development p{margin-top:0}.atlas-lot-development .atlas-eyebrow{color:#3977d5;font:700 10px ui-monospace,monospace;letter-spacing:.08em}.atlas-lot-development header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.atlas-lot-development h1{margin:6px 0;font-size:clamp(24px,3vw,34px)}.atlas-lot-development .atlas-muted{color:#6d788a}.atlas-lot-development button,.atlas-lot-development input,.atlas-lot-development select,.atlas-lot-development textarea{font:inherit}.atlas-lot-development button{min-height:38px;padding:8px 13px;border:1px solid #d9e0eb;border-radius:9px;background:#fff;color:#26334b;cursor:pointer}.atlas-lot-development button:hover{border-color:#76a4ee;background:#f5f8fe}.atlas-lot-development .atlas-primary{background:#252938;color:white;border-color:#252938}.atlas-lot-development .atlas-panel,.atlas-lot-development .atlas-kpi{padding:17px;border:1px solid #e0e6ef;border-radius:14px;background:#fff;box-shadow:0 4px 16px #192b4910}.atlas-lot-development .atlas-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.atlas-lot-development .atlas-kpi small,.atlas-lot-development .atlas-kpi span{display:block;color:#778295;font-size:12px}.atlas-lot-development .atlas-kpi strong{display:block;margin:7px 0;font-size:24px}.atlas-lot-development .atlas-toolbar{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.atlas-lot-development label{display:grid;gap:6px;color:#637087;font-size:12px}.atlas-lot-development input,.atlas-lot-development select,.atlas-lot-development textarea{width:100%;min-height:40px;padding:9px 11px;border:1px solid #d9e0eb;border-radius:9px;color:#26334b;background:white}.atlas-lot-development textarea{min-height:120px;resize:vertical}.atlas-lot-development .atlas-search{flex:1 1 260px}.atlas-lot-development .atlas-filters,.atlas-lot-development .atlas-actions{display:flex;gap:7px;flex-wrap:wrap}.atlas-lot-development [aria-pressed=true]{border-color:#3478dc;background:#edf4ff;color:#1e59ad}.atlas-lot-development .atlas-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.atlas-lot-development .atlas-card{display:grid;align-content:start;gap:10px;min-width:0;text-align:left}.atlas-lot-development .atlas-card>button{display:grid;gap:9px;width:100%;text-align:left}.atlas-lot-development .atlas-card header{align-items:center}.atlas-lot-development .atlas-card h2{margin:0;font-size:17px}.atlas-lot-development .atlas-card p{margin:0;min-height:38px;color:#6d788a;font-size:13px}.atlas-lot-development dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}.atlas-lot-development dt{color:#788397;font-size:10px}.atlas-lot-development dd{margin:3px 0 0;font-weight:650;font-size:12px}.atlas-lot-development .atlas-form{display:grid;gap:14px}.atlas-lot-development .atlas-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.atlas-lot-development .wide{grid-column:1/-1}.atlas-lot-development .atlas-cash-list{display:grid;gap:8px;padding:0;list-style:none}.atlas-lot-development .atlas-cash-list li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #e7ebf1}.atlas-lot-development [role=alert]{color:#9b2935}.atlas-lot-development .atlas-empty{padding:24px;text-align:center;color:#6d788a}
  @media(max-width:900px){.atlas-lot-development .atlas-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:600px){.atlas-lot-development .atlas-kpis,.atlas-lot-development .atlas-cards,.atlas-lot-development .atlas-form-grid{grid-template-columns:1fr}.atlas-lot-development header{flex-wrap:wrap}.atlas-lot-development .atlas-panel,.atlas-lot-development .atlas-kpi{padding:14px}}
</style>`;

/** Loteamento directory/profile element. API orchestration remains in program.ts. */
export class AtlasLotDevelopment extends HTMLElement {
  private snapshot: LotDevelopmentState;
  private readonly state: AtomicState<LotDevelopmentState>;
  constructor(){super();const initial:LotDevelopmentState={profiles:null,cashEntries:[],query:"",filter:"all",selectedId:"",formOpen:false,loading:true,saving:false,error:"",feedback:""};function* state(value:LotDevelopmentState):Generator<LotDevelopmentState,never,StateSetter<LotDevelopmentState>>{while(true)value=(yield value)(value);}const iterator=state(initial);iterator.next();this.snapshot=initial;this.state={next:setter=>{this.snapshot=iterator.next(setter).value;this.render();return this.snapshot;}};}
  private esc(value:unknown):string{return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));}
  setData(profiles:LotDevelopmentProfile[],cashEntries:CashFlowRecord[],selectedId?:string):void{this.state.next(s=>({...s,profiles,cashEntries,selectedId:selectedId&&profiles.some(p=>p.id===selectedId)?selectedId:profiles.some(p=>p.id===s.selectedId)?s.selectedId:"",loading:false,error:""}));}
  profilesSnapshot():LotDevelopmentProfile[]{return (this.snapshot.profiles||[]).map(profile=>({...profile}));}
  setError(error:string):void{this.state.next(s=>({...s,loading:false,saving:false,error}));}
  setSaving(saving:boolean):void{this.state.next(s=>({...s,saving,error:""}));}
  setFeedback(feedback:string):void{this.state.next(s=>({...s,saving:false,feedback}));}
  private render():void{
    const s=this.snapshot,e=(value:unknown)=>this.esc(value),profiles=s.profiles||[],query=s.query.trim().toLocaleLowerCase("pt-BR"),visible=profiles.filter(p=>(s.filter==="all"||p.kind===s.filter)&&(!query||`${p.title} ${p.lotLabel} ${p.quadra} ${p.description}`.toLocaleLowerCase("pt-BR").includes(query))),lots=profiles.filter(p=>p.kind==="lot"),commons=profiles.filter(p=>p.kind==="common-area"),selected=profiles.find(p=>p.id===s.selectedId)||null;
    const cards=visible.map(p=>`<article class="atlas-panel atlas-card"><button type="button" data-profile-select="${e(p.id)}" aria-pressed="${p.id===s.selectedId}"><header><span class="atlas-eyebrow">${p.kind==="lot"?"LOTE":"ÁREA COMUM"}</span><span>${e(p.status||"Sem situação")}</span></header><h2>${e(p.title)}</h2><p>${e(p.description||"Sem descrição cadastrada.")}</p><dl>${p.kind==="lot"?`<div><dt>Quadra</dt><dd>${e(p.quadra||"—")}</dd></div><div><dt>Área</dt><dd>${Number(p.area).toLocaleString("pt-BR")} m²</dd></div><div><dt>Valor</dt><dd>${e(new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(p.value))}</dd></div>`:`<div><dt>Localização</dt><dd>${e(p.quadra||"—")}</dd></div><div><dt>Área</dt><dd>${p.area?`${Number(p.area).toLocaleString("pt-BR")} m²`:"Não informada"}</dd></div><div><dt>Origem</dt><dd>Cadastro</dd></div>`}</dl><footer>Ver perfil →</footer></button></article>`).join("");
    const creating=s.formOpen&&s.selectedId==="__new__",profile=creating?null:selected,form=selected||creating?`<section class="atlas-panel"><header><div><span class="atlas-eyebrow">${creating?"NOVO CADASTRO":profile?.kind==="lot"?"LOTE · PERFIL":"ÁREA COMUM · PERFIL"}</span><h2>${creating?"Adicionar área comum":e(profile?.title)}</h2><p class="atlas-muted">${profile?.kind==="lot"?"Quadra, área, preço e situação vêm das fontes comerciais oficiais.":"Dados editáveis são salvos no banco operacional."}</p></div><button type="button" data-close-profile>Fechar</button></header><form class="atlas-form" data-profile-form><div class="atlas-form-grid"><label class="wide">Nome<input name="title" required maxlength="120" value="${e(profile?.title||"")}" placeholder="Nome da área comum"></label>${profile?.kind==="lot"||creating?`<label>${profile?.kind==="lot"?"Quadra":"Localização / setor"}<input name="quadra" ${profile?.kind==="lot"?"readonly":""} maxlength="120" value="${e(profile?.quadra||"")}"></label><label>Área (m²)<input name="area" type="number" min="0" step="0.01" ${profile?.kind==="lot"?"readonly":""} value="${profile?.area||""}"></label>${creating?`<label>Orçamento de referência (R$)<input name="value" type="number" min="0" step="0.01" value=""></label><label>Situação<input name="status" maxlength="80" value="Em planejamento"></label>`:""}`:""}<label class="wide">Descrição<textarea name="description" maxlength="2000" rows="5" placeholder="Descrição factual, uso e contexto">${e(profile?.description||"")}</textarea></label></div>${profile?.kind==="lot"?`<section class="atlas-panel"><span class="atlas-eyebrow">CAIXA · ${e(profile.lotLabel)}</span><h2>Entradas de caixa</h2><ul class="atlas-cash-list">${s.cashEntries.filter(row=>row.kind==="entrada"&&row.lotKey===profile.lotLabel).map(row=>`<li><span><b>${e(row.category||"Entrada")}</b><small> ${e(row.date)} · ${e(row.description||"")}</small></span><strong>${e(new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(row.amountCents/100))}</strong></li>`).join("")||`<li class="atlas-muted">Nenhuma entrada persistida vinculada a este lote.</li>`}</ul><button type="button" data-cash-entry="${e(profile.lotLabel)}">Registrar entrada em Repasses</button></section>`:""}<footer class="atlas-actions">${profile&&(profile.kind==="common-area"||profile.customized)?`<button type="button" data-profile-delete="${e(profile.id)}" ${s.saving?"disabled":""}>${profile.kind==="lot"?"Restaurar descrição original":"Excluir área comum"}</button>`:""}<button type="submit" class="atlas-primary" ${s.saving?"disabled":""}>${s.saving?"Salvando…":"Salvar perfil"}</button></footer></form>${s.feedback?`<p role="status">${e(s.feedback)}</p>`:""}</section>`:"";
    this.innerHTML=`${lotDevelopmentStyles}<main class="atlas-lot-development" data-lot-development-page data-lot-development-profile><header><div><span class="atlas-eyebrow">EMPREENDIMENTO · PERFIS</span><h1>Loteamento</h1><p class="atlas-muted">Lotes vinculados ao quadro oficial e áreas comuns cadastradas no sistema.</p></div><button type="button" class="atlas-primary" data-profile-new>Adicionar área comum</button></header><section class="atlas-kpis"><article class="atlas-kpi"><small>LOTES NO QUADRO OFICIAL</small><strong>${lots.length}</strong><span>Valores e áreas sem edição local</span></article><article class="atlas-kpi"><small>ÁREAS COMUNS CADASTRADAS</small><strong>${commons.length}</strong><span>Registros persistidos</span></article><article class="atlas-kpi"><small>PERFIS ALTERADOS</small><strong>${profiles.filter(p=>p.updatedAt).length}</strong><span>Com atualização registrada</span></article></section><section class="atlas-panel atlas-toolbar"><label class="atlas-search">Buscar perfil<input type="search" data-profile-query value="${e(s.query)}" placeholder="Lote, quadra, área comum…"></label><nav class="atlas-filters" aria-label="Tipo de perfil">${(["all","lot","common-area"] as const).map((key,i)=>`<button type="button" data-profile-filter="${key}" aria-pressed="${s.filter===key}">${["Todos","Lotes","Áreas comuns"][i]}</button>`).join("")}</nav><span class="atlas-muted">${visible.length} de ${profiles.length}</span></section>${s.loading?`<p class="atlas-empty">Consultando os perfis persistidos e o quadro oficial de lotes…</p>`:s.error?`<p role="alert">${e(s.error)}</p>`:`<section class="atlas-cards">${cards||`<p class="atlas-empty">Nenhum perfil persistido corresponde à busca.</p>`}</section>`}${form}</main>`;
  }
  connectedCallback():void{this.render();this.addEventListener("input",event=>{const target=event.target;if(target instanceof HTMLInputElement&&target.matches("[data-profile-query]")){const cursor=target.selectionStart;this.state.next(s=>({...s,query:target.value}));const next=this.querySelector<HTMLInputElement>("[data-profile-query]");next?.focus();if(cursor!==null)next?.setSelectionRange(cursor,cursor);}});this.addEventListener("click",event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest<HTMLButtonElement>("button");if(!button)return;if(button.dataset.profileFilter){this.state.next(s=>({...s,filter:button.dataset.profileFilter as LotDevelopmentState["filter"]}));return;}if(button.dataset.profileSelect){this.dispatchEvent(new CustomEvent("atlas:lot-profile-open",{bubbles:true,detail:{element:this,id:button.dataset.profileSelect}}));return;}if(button.hasAttribute("data-profile-new")){this.state.next(s=>({...s,selectedId:"__new__",formOpen:true,feedback:"",error:""}));return;}if(button.hasAttribute("data-close-profile")){this.dispatchEvent(new CustomEvent("atlas:lot-profile-close",{bubbles:true,detail:{element:this}}));return;}if(button.dataset.profileDelete){if(!confirm(button.dataset.profileDelete.startsWith("lot:")?"Restaurar a descrição oficial deste lote?":"Excluir esta área comum persistida?"))return;this.dispatchEvent(new CustomEvent("atlas:lot-profile-delete",{bubbles:true,detail:{element:this,id:button.dataset.profileDelete}}));return;}if(button.dataset.cashEntry){this.dispatchEvent(new CustomEvent("atlas:lot-cash-entry",{bubbles:true,detail:{element:this,lotKey:button.dataset.cashEntry}}));}});this.addEventListener("submit",event=>{const form=event.target;if(!(form instanceof HTMLFormElement)||!form.matches("[data-profile-form]"))return;event.preventDefault();const data=new FormData(form),profile=this.snapshot.profiles?.find(item=>item.id===this.snapshot.selectedId),kind=profile?.kind||"common-area",payload={kind,...(profile?{id:profile.id,lotLabel:profile.lotLabel}:{}),title:String(data.get("title")||"").trim(),quadra:String(data.get("quadra")||"").trim(),area:Number(data.get("area")||0),value:Number(data.get("value")||0),status:String(data.get("status")||""),description:String(data.get("description")||"").trim()};this.setSaving(true);this.dispatchEvent(new CustomEvent("atlas:lot-profile-save",{bubbles:true,detail:{element:this,id:profile?.id||"",payload}}));});this.dispatchEvent(new CustomEvent("atlas:lot-development-connected",{bubbles:true,detail:{element:this,profileRoute:this.hasAttribute("data-profile-route"),selectedId:this.getAttribute("data-selected-profile")||""}}));}
}
if(!customElements.get("atlas-lot-development"))customElements.define("atlas-lot-development",AtlasLotDevelopment);

const projectDocumentCategories = ["Projeto e planta", "Memorial descritivo", "Licença e aprovação", "Topografia e levantamento", "Infraestrutura", "Institucional", "Outro"];
const projectDocumentFields: [keyof ProjectDocument, string][] = [["title","Título"],["category","Categoria"],["code","Código / revisão"],["issuer","Emissor / órgão"],["documentDate","Data do documento"],["fileName","Arquivo"],["description","Descrição"],["createdAt","Adicionado em"],["updatedAt","Última alteração"]];
const projectDocumentsStyles = `<style>
atlas-project-documents{display:block;min-width:0;color:#20283a}atlas-project-documents *{box-sizing:border-box}atlas-project-documents .atlas-documents{display:grid;gap:16px}atlas-project-documents header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}atlas-project-documents h1{margin:6px 0;font-size:clamp(24px,3vw,34px);color:#19243b}atlas-project-documents h2{margin:0 0 5px;color:#19243b;font-size:18px}atlas-project-documents p{margin:0;color:#657186}atlas-project-documents .eyebrow{color:#3977d5;font:700 10px ui-monospace,monospace;letter-spacing:.08em}atlas-project-documents .panel{border:1px solid #e0e6ef;border-radius:14px;background:#fff;padding:18px;box-shadow:0 4px 16px #192b490d}atlas-project-documents .summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}atlas-project-documents .summary article{border:1px solid #e0e6ef;border-radius:12px;padding:15px}atlas-project-documents .summary small,atlas-project-documents .summary strong{display:block}atlas-project-documents .summary small{color:#758197;font-size:11px}atlas-project-documents .summary strong{margin-top:8px;font-size:20px;color:#1b2a42}atlas-project-documents button,atlas-project-documents input,atlas-project-documents select,atlas-project-documents textarea{font:inherit}atlas-project-documents button{min-height:36px;border:1px solid #d9e0eb;background:#fff;color:#24334e;border-radius:8px;padding:7px 11px;cursor:pointer}atlas-project-documents button:hover{border-color:#78a6ed;background:#f5f8ff}atlas-project-documents button:disabled{opacity:.55;cursor:not-allowed}atlas-project-documents .primary{background:#246be0;border-color:#246be0;color:#fff}atlas-project-documents .toolbar,atlas-project-documents .actions{display:flex;flex-wrap:wrap;align-items:end;gap:9px}atlas-project-documents label{display:grid;gap:5px;color:#5c6a80;font-size:12px}atlas-project-documents .toolbar label{min-width:160px;flex:1}atlas-project-documents input,atlas-project-documents select,atlas-project-documents textarea{min-height:38px;width:100%;border:1px solid #d7deea;background:#fff;color:#1c2b44;padding:8px 10px;border-radius:8px}atlas-project-documents textarea{min-height:86px;resize:vertical}atlas-project-documents .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}atlas-project-documents .wide{grid-column:1/-1}atlas-project-documents .sheet{overflow:auto}atlas-project-documents table{width:100%;min-width:950px;border-collapse:collapse}atlas-project-documents th,atlas-project-documents td{padding:8px;text-align:left;border-bottom:1px solid #e8ecf2;font-size:12px}atlas-project-documents th{color:#66758d;background:#f6f8fb;white-space:nowrap}atlas-project-documents td button{width:100%;text-align:left;border:0;min-height:30px}atlas-project-documents td button[aria-selected=true]{background:#edf4ff;outline:1px solid #367be7}atlas-project-documents .muted{color:#718096;font-size:12px}atlas-project-documents [role=alert]{border:1px solid #ebc9c9;background:#fff5f5;color:#9e3039;padding:10px;border-radius:8px}atlas-project-documents details{position:relative}atlas-project-documents details>div{position:absolute;right:0;z-index:2;min-width:230px;padding:12px;border:1px solid #dce4ee;background:#fff;border-radius:10px;box-shadow:0 12px 24px #1b2b451c}atlas-project-documents details label{display:flex;align-items:center;gap:7px;margin:6px 0}atlas-project-documents details input[type=checkbox]{width:auto;min-height:0}@media(max-width:700px){atlas-project-documents .summary,atlas-project-documents .grid{grid-template-columns:1fr}atlas-project-documents .wide{grid-column:auto}atlas-project-documents header{flex-wrap:wrap}atlas-project-documents .panel{padding:13px}}
</style>`;

type ProjectDocumentsState = { documents: ProjectDocument[] | null; columns: ProjectDocumentColumn[]; query: string; category: string; fileFilter: string; hiddenColumns: string[]; editId: string; selectedCell: {id:string;field:string}|null; legacyCount: number; loading: boolean; saving: boolean; error: string; feedback: string };

/** Complete project archive surface; only temporary interaction lives in this element. */
export class AtlasProjectDocuments extends HTMLElement {
  private snapshot: ProjectDocumentsState;
  private readonly state: AtomicState<ProjectDocumentsState>;
  constructor(){super();const initial:ProjectDocumentsState={documents:null,columns:[],query:"",category:"all",fileFilter:"all",hiddenColumns:[],editId:"",selectedCell:null,legacyCount:0,loading:true,saving:false,error:"",feedback:""};function* state(value:ProjectDocumentsState):Generator<ProjectDocumentsState,never,StateSetter<ProjectDocumentsState>>{while(true)value=(yield value)(value);}const iterator=state(initial);iterator.next();this.snapshot=initial;this.state={next:setter=>{this.snapshot=iterator.next(setter).value;this.render();this.renderArchiveControls();return this.snapshot;}};}
  private esc(value:unknown):string{return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));}
  setData(documents:ProjectDocument[],columns:ProjectDocumentColumn[]):void{this.state.next(s=>({...s,documents,columns,loading:false,saving:false,error:"",editId:s.editId==="new"?"new":documents.some(row=>row.id===s.editId)?s.editId:""}));}
  setError(error:string):void{this.state.next(s=>({...s,loading:false,saving:false,error}));}
  setSaving(saving:boolean):void{this.state.next(s=>({...s,saving,error:""}));}
  setFeedback(feedback:string):void{this.state.next(s=>({...s,saving:false,editId:"",selectedCell:null,feedback}));}
  setLegacyImportCount(legacyCount:number):void{this.state.next(s=>({...s,legacyCount}));}
  getDocument(id:string):ProjectDocument|undefined{return this.snapshot.documents?.find(row=>row.id===id);}
  getColumns():ProjectDocumentColumn[]{return this.snapshot.columns;}
  private emit(name:string,detail:Record<string,unknown>={}):void{this.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:{element:this,...detail}}));}
  private renderArchiveControls():void{
    for(const button of this.querySelectorAll<HTMLButtonElement>("[data-document-delete]")){
      const row=this.getDocument(button.dataset.documentDelete||"");
      if(row&&(['doc-proj-exec','doc-proj-licenses','doc-presentation-v3'].includes(row.id)||row.sourceMaterialId))button.remove();
    }
    if(!this.snapshot.legacyCount)return;
    const header=this.querySelector("[data-project-documents-page]>header");if(!header)return;
    const button=document.createElement("button");button.type="button";button.dataset.documentImport="";button.textContent=`Importar ${this.snapshot.legacyCount} documento(s) do acervo anterior`;header.append(button);
  }
  private openCell(id:string,field:string):void{if(["fileName","createdAt","updatedAt"].includes(field)){if(field==="fileName")this.emit("atlas:document-open",{id});return;}this.state.next(s=>({...s,selectedCell:{id,field}}));}
  render():void{
    const s=this.snapshot,e=(value:unknown)=>this.esc(value),documents=s.documents||[],visible=documents.filter(row=>(s.category==="all"||row.category===s.category)&&(s.fileFilter==="all"||(s.fileFilter==="attached"?Boolean(row.fileName):!row.fileName))&&(!s.query||[row.title,row.category,row.code,row.issuer,row.description,row.fileName,...Object.values(row.properties||{})].some(value=>String(value||"").toLocaleLowerCase("pt-BR").includes(s.query.toLocaleLowerCase("pt-BR"))))),editing=documents.find(row=>row.id===s.editId),columns=[...projectDocumentFields.map(([id,label])=>({id,label})),...s.columns].filter(column=>!s.hiddenColumns.includes(column.id));
    const option=(value:string,label:string,current:string)=>`<option value="${e(value)}" ${value===current?"selected":""}>${e(label)}</option>`;
    const form=s.editId?`<form class="panel" data-document-form><header><div><span class="eyebrow">${editing?"EDITAR DOCUMENTO":"NOVO DOCUMENTO"}</span><h2>${editing?e(editing.title):"Adicionar ao acervo"}</h2></div><button type="button" data-document-cancel>Fechar</button></header><div class="grid"><label>Título<input name="title" required maxlength="140" value="${e(editing?.title)}"></label><label>Categoria<select name="category">${projectDocumentCategories.map(category=>option(category,category,editing?.category||projectDocumentCategories[0])).join("")}</select></label><label>Código / revisão<input name="code" maxlength="60" value="${e(editing?.code)}"></label><label>Emissor / órgão<input name="issuer" maxlength="100" value="${e(editing?.issuer)}"></label><label>Data do documento<input name="documentDate" type="date" value="${e(editing?.documentDate)}"></label><label>Item documental em Materiais<select name="sourceMaterialId">${option("","Sem vínculo",editing?.sourceMaterialId||"")}${option("proj-exec","Projeto executivo",editing?.sourceMaterialId||"")}${option("proj-licenses","Liberações / licenças",editing?.sourceMaterialId||"")}</select></label><label class="wide">Arquivo PDF, CAD, Office ou imagem<input name="file" type="file" accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" ${editing?"":"required"}><small>${editing?`Atual: ${e(editing.fileName)} · deixe vazio para manter`:"Até 25 MB"}</small></label><label class="wide">Descrição<textarea name="description" maxlength="800">${e(editing?.description)}</textarea></label>${s.columns.map(column=>`<label>${e(column.label)}<input name="property:${e(column.id)}" maxlength="500" value="${e(editing?.properties[column.id])}"></label>`).join("")}</div><footer class="actions"><button type="submit" class="primary" ${s.saving?"disabled":""}>${s.saving?"Salvando…":"Salvar documento"}</button></footer></form>`:"";
    const cell=s.selectedCell?(()=>{const row=documents.find(item=>item.id===s.selectedCell?.id),field=s.selectedCell.field,label=columns.find(column=>column.id===field)?.label||field,value=field.startsWith("custom-")?row?.properties[field]:(row as unknown as Record<string,string>)?.[field];return row?`<form class="panel" data-document-cell-form><span class="eyebrow">EDITAR CÉLULA</span><h2>${e(row.title)} · ${e(label)}</h2><label>${e(label)}${field==="category"?`<select name="value">${projectDocumentCategories.map(category=>option(category,category,String(value||""))).join("")}</select>`:field==="description"?`<textarea name="value">${e(value)}</textarea>`:`<input name="value" ${field==="documentDate"?"type=date":""} value="${e(value)}" ${field==="title"?"required":""}>`}</label><footer class="actions"><button type="button" data-cell-cancel>Cancelar</button><button type="submit" class="primary" ${s.saving?"disabled":""}>Confirmar alteração</button></footer></form>`:"";})():"";
    this.innerHTML=`${projectDocumentsStyles}<main class="atlas-documents" data-project-documents-page><header><div><span class="eyebrow">ALIANÇA PARK · ACERVO DO EMPREENDIMENTO</span><h1>Documentos do loteamento</h1><p>Projetos, plantas, memoriais, licenças e arquivos institucionais.</p></div><button type="button" class="primary" data-document-new>Adicionar documento</button></header><section class="summary"><article><small>DOCUMENTOS</small><strong>${documents.length}</strong></article><article><small>CATEGORIAS</small><strong>${new Set(documents.map(row=>row.category)).size}</strong></article><article><small>ARMAZENAMENTO</small><strong>Banco operacional</strong></article></section><section class="panel toolbar"><label>Pesquisar<input type="search" data-document-query value="${e(s.query)}" placeholder="Título, código, órgão, arquivo…"></label><label>Categoria<select data-document-category>${option("all","Todas",s.category)}${projectDocumentCategories.map(value=>option(value,value,s.category)).join("")}</select></label><label>Arquivo<select data-document-file-filter>${option("all","Todos",s.fileFilter)}${option("attached","Com arquivo",s.fileFilter)}${option("pending","Pendentes",s.fileFilter)}</select></label><details><summary>Configurar colunas</summary><div>${[...projectDocumentFields.map(([id,label])=>({id,label})),...s.columns].map(column=>`<label><input type="checkbox" data-document-column-toggle="${e(column.id)}" ${s.hiddenColumns.includes(column.id)?"":"checked"}>${e(column.label)}</label>${s.columns.some(item=>item.id===column.id)?`<button type="button" data-document-column-delete="${e(column.id)}">Excluir propriedade</button>`:""}`).join("")}<form data-document-column-form><input name="label" maxlength="50" required placeholder="Nova propriedade"><button type="submit">Adicionar coluna</button></form></div></details><span class="muted">${visible.length} de ${documents.length}</span></section>${s.error?`<p role="alert">${e(s.error)}</p>`:""}${s.feedback?`<p role="status">${e(s.feedback)}</p>`:""}${form}${cell}${s.loading?`<p class="panel">Carregando o acervo persistido…</p>`:`<section class="panel sheet"><div class="actions"><span class="muted">Selecione uma célula · Enter edita · Delete limpa · setas navegam</span></div><table><thead><tr><th>#</th>${columns.map(column=>`<th>${e(column.label)}</th>`).join("")}<th>Ações</th></tr></thead><tbody>${visible.map((row,index)=>`<tr data-document-row="${e(row.id)}"><th>${index+1}</th>${columns.map(column=>{const value=column.id.startsWith("custom-")?row.properties[column.id]:(row as unknown as Record<string,unknown>)[column.id];return `<td><button type="button" data-document-cell="${e(row.id)}" data-document-field="${e(column.id)}" aria-selected="${s.selectedCell?.id===row.id&&s.selectedCell.field===column.id}">${e(value||"—")}</button></td>`;}).join("")}<td><div class="actions"><button type="button" data-document-open="${e(row.id)}">Abrir</button><button type="button" data-document-edit="${e(row.id)}">Editar</button><button type="button" data-document-delete="${e(row.id)}">Excluir</button></div></td></tr>`).join("")||`<tr><td colspan="${columns.length+2}">Nenhum documento encontrado.</td></tr>`}</tbody></table></section>`}</main>`;
  }
  connectedCallback():void{
    this.render();this.renderArchiveControls();this.emit("atlas:documents-connected");
    this.addEventListener("click",event=>{if(event.target instanceof Element&&event.target.closest("[data-document-import]"))this.emit("atlas:documents-import");});
    this.addEventListener("input",event=>{const target=event.target;if(target instanceof HTMLInputElement&&target.matches("[data-document-query]")){const cursor=target.selectionStart;this.state.next(s=>({...s,query:target.value}));const next=this.querySelector<HTMLInputElement>("[data-document-query]");next?.focus();if(cursor!==null)next?.setSelectionRange(cursor,cursor);}});
    this.addEventListener("change",event=>{const target=event.target;if(!(target instanceof HTMLSelectElement||target instanceof HTMLInputElement))return;if(target.matches("[data-document-category]"))this.state.next(s=>({...s,category:target.value}));else if(target.matches("[data-document-file-filter]"))this.state.next(s=>({...s,fileFilter:target.value}));else if(target instanceof HTMLInputElement&&target.matches("[data-document-column-toggle]")){const field=target.dataset.documentColumnToggle||"";this.state.next(s=>({...s,hiddenColumns:target.checked?s.hiddenColumns.filter(id=>id!==field):[...s.hiddenColumns,field]}));}});
    this.addEventListener("click",event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest<HTMLButtonElement>("button");if(!button)return;if(button.hasAttribute("data-document-new")){this.state.next(s=>({...s,editId:"new",selectedCell:null,error:""}));return;}if(button.hasAttribute("data-document-cancel")){this.state.next(s=>({...s,editId:""}));return;}if(button.hasAttribute("data-cell-cancel")){this.state.next(s=>({...s,selectedCell:null}));return;}if(button.dataset.documentEdit){this.state.next(s=>({...s,editId:button.dataset.documentEdit||"",selectedCell:null,error:""}));return;}if(button.dataset.documentOpen){this.emit("atlas:document-open",{id:button.dataset.documentOpen});return;}if(button.dataset.documentDelete){const row=this.getDocument(button.dataset.documentDelete);if(row&&confirm(`Excluir permanentemente ${row.title}?`))this.emit("atlas:document-delete",{id:row.id});return;}if(button.dataset.documentColumnDelete){const column=this.snapshot.columns.find(item=>item.id===button.dataset.documentColumnDelete);if(column&&confirm(`Excluir a propriedade ${column.label} e todos os seus valores?`))this.emit("atlas:document-column-delete",{id:column.id});return;}if(button.dataset.documentCell&&button.dataset.documentField)this.openCell(button.dataset.documentCell,button.dataset.documentField);});
    this.addEventListener("dblclick",event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest<HTMLButtonElement>("[data-document-cell]");if(button)this.openCell(button.dataset.documentCell||"",button.dataset.documentField||"");});
    this.addEventListener("keydown",event=>{const target=event.target;if(!(target instanceof HTMLButtonElement)||!target.matches("[data-document-cell]"))return;if(event.key==="Enter"){event.preventDefault();this.openCell(target.dataset.documentCell||"",target.dataset.documentField||"");return;}if(["Delete","Backspace"].includes(event.key)){const field=target.dataset.documentField||"";if(!["title","category","createdAt","updatedAt","fileName"].includes(field)){event.preventDefault();const row=this.getDocument(target.dataset.documentCell||"");if(row&&confirm(`Limpar ${field} de ${row.title}?`))this.emit("atlas:document-cell-save",{id:row.id,field,value:""});}return;}const direction:{[key:string]:[number,number]}={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};const step=direction[event.key];if(!step)return;const rows=[...this.querySelectorAll<HTMLTableRowElement>("tbody tr[data-document-row]")],row=target.closest("tr"),rowIndex=rows.indexOf(row as HTMLTableRowElement),cells=[...row!.querySelectorAll<HTMLButtonElement>("[data-document-cell]")],columnIndex=cells.indexOf(target),nextRow=rows[Math.max(0,Math.min(rows.length-1,rowIndex+step[0]))],nextCells=[...nextRow.querySelectorAll<HTMLButtonElement>("[data-document-cell]")],next=nextCells[Math.max(0,Math.min(nextCells.length-1,columnIndex+step[1]))];if(next){event.preventDefault();next.focus();}});
    this.addEventListener("submit",event=>{const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();const data=new FormData(form);if(form.matches("[data-document-column-form]")){this.emit("atlas:document-column-create",{label:String(data.get("label")||"").trim()});return;}if(form.matches("[data-document-cell-form]")){const selection=this.snapshot.selectedCell;if(selection)this.emit("atlas:document-cell-save",{...selection,value:String(data.get("value")||"").trim()});return;}if(!form.matches("[data-document-form]"))return;const file=data.get("file");if(file instanceof File&&file.size>25*1024*1024){this.setError("O arquivo deve ter até 25 MB.");return;}const properties=Object.fromEntries(this.snapshot.columns.map(column=>[column.id,String(data.get(`property:${column.id}`)||"").trim()]));const payload={title:String(data.get("title")||"").trim(),category:String(data.get("category")||"").trim(),code:String(data.get("code")||"").trim(),issuer:String(data.get("issuer")||"").trim(),documentDate:String(data.get("documentDate")||"").trim(),sourceMaterialId:String(data.get("sourceMaterialId")||"").trim(),description:String(data.get("description")||"").trim(),properties};this.setSaving(true);this.emit("atlas:document-save",{id:this.snapshot.editId==="new"?"":this.snapshot.editId,payload,file:file instanceof File&&file.size?file:null});});
  }
}
if(!customElements.get("atlas-project-documents"))customElements.define("atlas-project-documents",AtlasProjectDocuments);
