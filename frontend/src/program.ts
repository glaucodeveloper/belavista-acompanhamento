/**
 * Application program — imperative composition root for the TypeScript frontend.
 *
 * Responsibilities are deliberately centralized here: runtime/API configuration,
 * bearer-authenticated service access, catalogs composed from persisted records,
 * CRUD orchestration, route installation, exports, and startup. `components.ts`
 * owns Web Element DOM and transient interaction state (advanced only by
 * `state.next(...)`); it publishes `atlas:*` events and never calls services.
 * `models.ts` owns the data contracts crossing this boundary. `main.ts` obtains
 * this iterator's API and starts the application; it does not own domain logic.
 *
 * `program()` creates one scoped application instance and yields its immutable
 * SystemAPI. The existing shell installs category routes against its ViewLayer;
 * `start(root)` is the standalone history entry point. Reloads read authoritative
 * backend data and reject stale concurrent responses. Mutations are accepted only
 * from the mounted element, sent to authenticated persistent APIs, and followed
 * by a canonical reload—never by a demo-data or optimistic-success fallback.
 * Credentials are requested from the host for each operation, never cached here;
 * HTTP 401 invalidates host auth. Missing config/auth, invalid responses, and
 * service failures are surfaced to the owning element.
 *
 * Commission priority, split ratios, and forecast math below are program policy,
 * not operational data. Sales, rules, receipts, plans, broker profiles, stages,
 * materials, and agenda events always come from the configured persistent API.
 *
 * Function contracts, endpoint/event matrix, lifecycle, failure/concurrency
 * rules, financial formulas, export behavior, and known validation limits are
 * documented in ../PROGRAM.md. Keep that reference synchronized with every
 * program change; this module's JSDoc explains local function intent while the
 * reference records cross-function and externally visible behavior.
 */
import { AtlasActivities, AtlasAgenda, AtlasBrokers, AtlasCashRecord, AtlasDashboard, AtlasLeads, AtlasLotDevelopment, AtlasMaterials, AtlasProgress, AtlasProjectDocuments, AtlasRepasses, AtlasSalesHistory, AtlasSettings } from './components.js';
import type {
  BrokerProfile, CommercialSale, RepasseCurrentRow, RepasseForecastRow, RepasseOperations,
  RepasseReport, RepasseSale, OperationalMaterial, OperationalStage, OperationalActivity, MaterialCustomColumn, OperationalAgendaEvent,
  DashboardSnapshot, OperationalRecord, OperationalNotification, CashFlowRecord, CashFlowSummary,
  ConfiguredStage, DelegatedAccessKey, DelegatedAccessRole, PublicLeadContactSettings, SettingsSnapshot,
  StageWorkbenchState, WorkbenchSession,
  PublicCommercialRecords, PublicCommercialLead, InstagramFeed, InstagramCommentPolicy, LotDevelopmentProfile,
  ProjectDocument, ProjectDocumentColumn,
} from './models.js';

type Runtime = typeof globalThis & {
  BELAVISTA_API_BASE?: string;
  BELAVISTA_CAPACITOR_NATIVE?: boolean;
  BELAVISTA_ADMIN_AUTH_READY?: Promise<unknown>;
  BELAVISTA_GET_ID_TOKEN?: () => Promise<string | null>;
  BELAVISTA_ADMIN_AUTH_INVALIDATE?: () => void;
  belavistaWorkerAssistant?: { root?: HTMLElement; submit?: (context: string, attachment?: unknown, image?: unknown, files?: unknown[], options?: Record<string, unknown>) => void };
  __BELAVISTA_LOT_DEVELOPMENT_PROFILES_V1?: () => LotDevelopmentProfile[];
  __BELAVISTA_UPSERT_LOT_DEVELOPMENT_PROFILE_V1?: (input: Record<string, unknown>) => Promise<LotDevelopmentProfile>;
};

type RouteState = { view: string; stageKey?: string | null; stageId?: string | number | null; brokerId?: string | null; saleId?: string | null; lotProfileId?: string | null };
type RouteMessage = { type: 'sync'; state: RouteState } | { type: 'navigate'; patch: Partial<RouteState> };

/** The application's one global state iterator owns route identity only. */
function* routeStateProgram(): Generator<RouteState, never, RouteMessage> {
  let current: RouteState = { view: 'map' };
  while (true) {
    const message = yield current;
    current = message.type === 'sync'
      ? { ...message.state }
      : { ...current, ...message.patch };
  }
}

export interface SystemAPI {
  /** Mount the standalone sales-history interface and load its persisted data. */
  start(root: HTMLElement): Promise<void>;
  /** Read persisted sales, receipts, and broker/lot commission rules. */
  reloadSalesHistory(): Promise<void>;
  /** Read the repasse ledger and recalculate current and projected report rows. */
  reloadRepasses(): Promise<void>;
  /** Install shell renderer and navigation/CRUD event bindings for sales history. */
  installSalesHistoryRoute(
    ViewLayer: { prototype: HTMLElement & Record<string, unknown> },
    appStore: { get(): { selectedSalesHistoryId?: string | null }; set(state: Record<string, unknown>): void },
    host: Document,
  ): void;
  /** Install the repasses route and its refresh, mutation, and export bindings. */
  installRepassesRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, host: Document): void;
  /** Read sales, financial operations, and persisted broker profile records. */
  reloadBrokers(): Promise<void>;
  /** Install the broker directory/detail shell routes and their event bindings. */
  installBrokersRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void;
  /** Install the materials route and its CRUD/allocation/schema/transition bindings. */
  installMaterialsRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, host: Document): void;
  /** Read agenda records together with stage and material catalogs for its editor. */
  reloadAgenda(): Promise<void>;
  /** Install the agenda route and its persistent create/edit/delete bindings. */
  installAgendaRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, host: Document): void;
  /** Install persistent activity list/detail and CRUD event bindings. */
  installActivitiesRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void;
  /** Install the operational dashboard route and its live snapshot/report handlers. */
  installDashboardRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void;
  /** Read the dashboard's canonical financial and operational data. */
  reloadDashboard(): Promise<void>;
  /** Read persisted records, stages, materials, and agenda for the progress diary. */
  reloadProgress(): Promise<void>;
  /** Install the progress diary route and its persisted record creation flow. */
  installProgressRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void;
  /** Install the owner-only persistent cash-exit form. */
  installCashRecordRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void;
  /** Install stage comprehension, Worker workbench, delegated-key and public-contact settings. */
  installSettingsRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void;
  /** Install the lead/reservation CRM and Instagram moderation over their real authenticated APIs. */
  installLeadsRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void;
  /** Install persisted lot-development profiles and the cash-entry handoff. */
  installLotDevelopmentRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void;
  /** Install the persisted project-document catalog, custom columns, file and cell editors. */
  installProjectDocumentsRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown> }, host: Document): void;
}

/**
 * Composition/lifecycle generator: creates one scoped program instance and yields
 * its public API. It is not an application-state iterator; routeStateProgram is
 * the only application-wide state iterator and stores route identity only.
 */
export function* program(): Generator<SystemAPI, never, void> {
  const runtime = globalThis as Runtime;
  const machine = { lastError: null as string | null, requestId: 0 };
  let salesHistory: AtlasSalesHistory | null = null;
  let repassesElement: AtlasRepasses | null = null;
  let repassesRequestId = 0;
  let brokersElement: AtlasBrokers | null = null;
  let brokersRequestId = 0;
  let materialsElement: AtlasMaterials | null = null;
  let materialsRequestId = 0;
  let agendaElement: AtlasAgenda | null = null;
  let agendaRequestId = 0;
  let agendaEvents: OperationalAgendaEvent[] = [];
  let dashboardElement: AtlasDashboard | null = null;
  let dashboardRequestId = 0;
  let activitiesElement: AtlasActivities | null = null;
  let activitiesRequestId = 0;
  let progressElement: AtlasProgress | null = null;
  let progressRequestId = 0;
  let cashRecordElement: AtlasCashRecord | null = null;
  let settingsElement: AtlasSettings | null = null;
  let settingsRequestId = 0;
  let leadsElement: AtlasLeads | null = null;
  let leadsRequestId = 0;
  let lotDevelopmentElement: AtlasLotDevelopment | null = null;
  let lotDevelopmentRequestId = 0;
  let lotDevelopmentProfilesCache: LotDevelopmentProfile[] = [];
  let projectDocumentsElement: AtlasProjectDocuments | null = null;
  let projectDocumentsRequestId = 0;
  type LegacyProjectDocument = Partial<ProjectDocument> & {id:string;sourceUrl?:string;builtIn?:boolean};
  let legacyProjectDocuments:()=>{documents:LegacyProjectDocument[];columns:{id:string;label:string}[]} =()=>({documents:[],columns:[]});
  let instagramRequestId = 0;
  let instagramPolicyRequestId = 0;
  const workbenchSaveQueues = new Map<string, Promise<unknown>>();
  const routeState = routeStateProgram();
  routeState.next();

  /** Advance the single route iterator, then mirror only its route fields to the legacy shell. */
  function navigateRoute(appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, patch: Partial<RouteState>, nonRouteState: Record<string, unknown> = {}): void {
    const raw = appStore.get();
    const current: RouteState = {
      view: String(raw.view || 'map'),
      ...(raw.selectedStageV9 != null ? { stageKey: String(raw.selectedStageV9) } : {}),
      ...(raw.selectedStage != null ? { stageId: String(raw.selectedStage) } : {}),
      ...(raw.selectedBrokerDirectoryId != null ? { brokerId: String(raw.selectedBrokerDirectoryId) } : {}),
      ...(raw.selectedSalesHistoryId != null ? { saleId: String(raw.selectedSalesHistoryId) } : {}),
      ...(raw.selectedDevelopmentProfileId != null ? { lotProfileId: String(raw.selectedDevelopmentProfileId) } : {}),
    };
    routeState.next({ type: 'sync', state: current });
    const next = routeState.next({ type: 'navigate', patch }).value;
    const stageId = next.stageId == null ? null : /^\d+$/.test(String(next.stageId)) ? Number(next.stageId) : String(next.stageId);
    // Shell flags may accompany navigation, but route fields always come from
    // the single route iterator. A caller cannot overwrite its yielded route.
    const shellOnly = { ...nonRouteState };
    for (const field of ['view', 'selectedStageV9', 'selectedStage', 'selectedBrokerDirectoryId', 'selectedSalesHistoryId', 'selectedDevelopmentProfileId']) delete shellOnly[field];
    appStore.set({
      view: next.view,
      ...(next.stageKey ? { selectedStageV9: next.stageKey } : {}),
      ...(stageId == null ? {} : { selectedStage: stageId }),
      ...(next.brokerId == null ? {} : { selectedBrokerDirectoryId: next.brokerId }),
      selectedSalesHistoryId: next.saleId ?? null,
      selectedDevelopmentProfileId: next.lotProfileId ?? null,
      ...shellOnly,
    });
  }

  /** Resolve API origin for local, ngrok, deployed-web, or native Capacitor runtime. */
  function apiBase(): string {
    if (/\.ngrok-free\.dev$/i.test(location.hostname)) {
      const portPrefix = location.pathname.match(/^\/\d+(?=\/|$)/)?.[0] || '/8080';
      return location.origin + portPrefix;
    }
    if (runtime.BELAVISTA_CAPACITOR_NATIVE) {
      const base = String(runtime.BELAVISTA_API_BASE || '').replace(/\/$/, '');
      if (!base) throw new Error('API do aplicativo não configurada.');
      return base;
    }
    if (/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)) return '';
    const base = String(runtime.BELAVISTA_API_BASE ||
      document.querySelector<HTMLMetaElement>('meta[name="belavista-api-base"]')?.content || '').replace(/\/$/, '');
    if (!base) throw new Error('API do aplicativo não configurada.');
    return base;
  }

  /** Join a service path to the configured API origin. */
  function apiUrl(path: string): string {
    // The local server owns the operational SQLite API, but administrative CRM
    // rows are stored in the GitHub-backed Worker. Route this one read directly
    // to the already configured Worker origin (the same origin used for AI),
    // retaining the caller's Firebase bearer token and avoiding a fake local
    // repository path. Other localhost APIs remain same-origin.
    if (path === '/api/admin/public-leads' && /^(localhost|127\.0\.0\.1)$/i.test(location.hostname)) {
      const workerBase = String(runtime.BELAVISTA_API_BASE ||
        document.querySelector<HTMLMetaElement>('meta[name="belavista-ai-base"]')?.content || '').replace(/\/$/, '');
      if (!workerBase) throw new Error('Worker não configurado para consultar leads do repositório.');
      return workerBase + path;
    }
    return apiBase() + path;
  }

  /** Authenticated uncached GET; invalidates host auth on 401 and propagates errors. */
  async function readApi<T>(path: string): Promise<T> {
    await runtime.BELAVISTA_ADMIN_AUTH_READY;
    const token = await runtime.BELAVISTA_GET_ID_TOKEN?.();
    if (!token) throw new Error('Autenticação necessária para consultar o histórico.');
    const response = await fetch(apiUrl(path), {
      cache: 'no-store',
      headers: { Authorization: 'Bearer ' + token },
    });
    if (response.status === 401) runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || 'Serviço indisponível (HTTP ' + response.status + ').');
    }
    return response.json() as Promise<T>;
  }

  /** Authenticated JSON PUT for backend replacement/upsert endpoints. */
  async function writeApi<T>(path: string, payload: unknown): Promise<T> {
    await runtime.BELAVISTA_ADMIN_AUTH_READY;
    const token = await runtime.BELAVISTA_GET_ID_TOKEN?.();
    if (!token) throw new Error('Autenticação necessária para atualizar a venda.');
    const response = await fetch(apiUrl(path), {
      method: 'PUT', cache: 'no-store',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.status === 401) runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();
    if (!response.ok) {
      const error = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(error?.error || 'Não foi possível salvar a venda (HTTP ' + response.status + ').');
    }
    return response.json() as Promise<T>;
  }

  /** Authenticated domain CRUD request with response and error validation. */
  async function mutateApi<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', payload?: unknown): Promise<T> {
    await runtime.BELAVISTA_ADMIN_AUTH_READY;
    const token = await runtime.BELAVISTA_GET_ID_TOKEN?.();
    if (!token) throw new Error('Autenticação necessária para alterar materiais.');
    const response = await fetch(apiUrl(path), { method, cache: 'no-store', headers: {
      Authorization: 'Bearer ' + token, ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
    }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    if (response.status === 401) runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();
    const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
    if (!response.ok) throw new Error(result?.error || `Não foi possível alterar material (HTTP ${response.status}).`);
    if (!result) throw new Error('Resposta inválida ao salvar material.');
    return result;
  }

  /** Load persisted materials, stages, property schema, and agenda links concurrently. */
  async function reloadMaterials(): Promise<void> {
    const target=materialsElement;
    if(!target)return;
    const requestId=++materialsRequestId;
    try {
      const [materialPayload,stagePayload,columnPayload,agendaPayload]=await Promise.all([
        readApi<{materials:OperationalMaterial[]}>('/api/materials'),
        readApi<{stages:OperationalStage[]}>('/api/stages-admin'),
        readApi<{columns:MaterialCustomColumn[]}>('/api/materials/schema'),
        readApi<{events:OperationalAgendaEvent[]}>('/api/agenda-events'),
      ]);
      if(requestId===materialsRequestId&&target===materialsElement)target.setData(materialPayload.materials,stagePayload.stages,columnPayload.columns,agendaPayload.events);
    } catch(error) {
      if(requestId===materialsRequestId&&target===materialsElement)target.setError(error instanceof Error?error.message:String(error));
    }
  }

  /** Load canonical agenda events plus real stage/material context; discard stale reads. */
  async function reloadAgenda(): Promise<void> {
    const target=agendaElement;
    if(!target)return;
    const requestId=++agendaRequestId;
    try{
      const [agenda,stages,materials]=await Promise.all([
        readApi<{events:OperationalAgendaEvent[]}>('/api/agenda-events'),
        readApi<{stages:OperationalStage[]}>('/api/stages-admin'),
        readApi<{materials:OperationalMaterial[]}>('/api/materials'),
      ]);
      if(requestId!==agendaRequestId||target!==agendaElement)return;
      agendaEvents=agenda.events;
      target.setData(agenda.events,stages.stages,materials.materials);
    }catch(error){if(requestId===agendaRequestId&&target===agendaElement)target.setError(error instanceof Error?error.message:String(error));}
  }

  /** Upsert one event in the server snapshot, then reload canonical agenda state. */
  async function saveAgendaEvent(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasAgenda;payload:OperationalAgendaEvent}>).detail;
    if(!detail||detail.element!==agendaElement)return;
    try{
      const previous=agendaEvents.find(item=>item.id===detail.payload.id),next={...previous,...detail.payload};
      const events=previous?agendaEvents.map(item=>item.id===next.id?next:item):[...agendaEvents,next];
      await writeApi<{events:OperationalAgendaEvent[]}>('/api/agenda-events',{events});
      await reloadAgenda();
    }catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Remove only the selected event from the persistent snapshot and reload it. */
  async function deleteAgendaEvent(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasAgenda;id:string}>).detail;
    if(!detail||detail.element!==agendaElement)return;
    try{
      await writeApi<{events:OperationalAgendaEvent[]}>('/api/agenda-events',{events:agendaEvents.filter(item=>item.id!==detail.id)});
      await reloadAgenda();
    }catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Create or update one backend material from the component's validated form. */
  async function saveMaterial(event:Event):Promise<void> {
    const detail=(event as CustomEvent<{element:AtlasMaterials;id:string|null;payload:Partial<OperationalMaterial>}>).detail;
    if(!detail||detail.element!==materialsElement)return;
    try {
      await mutateApi(`/api/materials${detail.id?'/'+encodeURIComponent(detail.id):''}`,detail.id?'PUT':'POST',detail.payload);
      await reloadMaterials();
    } catch(error) { detail.element.setError(error instanceof Error?error.message:String(error)); }
  }

  /** Delete one material through the authenticated operational API. */
  async function deleteMaterial(event:Event):Promise<void> {
    const detail=(event as CustomEvent<{element:AtlasMaterials;id:string}>).detail;
    if(!detail||detail.element!==materialsElement)return;
    try { await mutateApi(`/api/materials/${encodeURIComponent(detail.id)}`,'DELETE'); await reloadMaterials(); }
    catch(error) { detail.element.setError(error instanceof Error?error.message:String(error)); }
  }

  /** Persist allocation of a material to a stage, or null to unlink it. */
  async function allocateMaterial(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasMaterials;id:string;stageId:number|null}>).detail;
    if(!detail||detail.element!==materialsElement)return;
    try{const material=detail.element.getMaterial(detail.id);if(!material)throw new Error('Material não encontrado.');await mutateApi(`/api/materials/${encodeURIComponent(material.id)}`,'PUT',{...material,stageId:detail.stageId});await reloadMaterials();}
    catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Add a persisted custom property to the material schema. */
  async function saveMaterialColumn(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasMaterials;label:string}>).detail;if(!detail||detail.element!==materialsElement)return;
    try{await mutateApi('/api/materials/schema','POST',{label:detail.label});await reloadMaterials();}
    catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Remove a custom material property through the backend schema contract. */
  async function deleteMaterialColumn(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasMaterials;id:string}>).detail;if(!detail||detail.element!==materialsElement)return;
    try{await mutateApi(`/api/materials/schema/${encodeURIComponent(detail.id)}`,'DELETE');await reloadMaterials();}
    catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Load the actual material-transition audit history and persisted attachments. */
  async function openMaterialTransition(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasMaterials;material:OperationalMaterial}>).detail;if(!detail||detail.element!==materialsElement)return;
    const material=detail.material;if(!detail.element.isDraftMaterial(material.id)){
      try{const payload=await readApi<{transitions:Array<Record<string,unknown>>;attachments:Array<Record<string,unknown>>}>(`/api/workbench/diary?resource=material-transition&materialId=${encodeURIComponent(material.id)}&stage=${encodeURIComponent(material.stageName||'')}`);detail.element.setTransitionHistory(material.id,payload.transitions,payload.attachments);}
      catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
    }
  }

  /** Persist a material transition and its files; report planner failure separately. */
  async function saveMaterialTransition(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasMaterials;material:OperationalMaterial;draft:boolean;stage:OperationalStage;after:{name:string;materialNumber:string;stageId:number;activityName:string;quantity:number;unit:string;status:string;description:string;documentNumber:string;documentDescription:string;files:File[]}}>).detail;
    if(!detail||detail.element!==materialsElement)return;
    try{
      const documents=await Promise.all(detail.after.files.map(async file=>({fileName:file.name,dataUrl:await fileDataUrl(file),documentNumber:detail.after.documentNumber,description:detail.after.documentDescription})));
      const payload=await mutateApi<{plannerStatus:string;plannerError?:string}>('/api/workbench/diary?resource=material-transition','POST',{
        materialId:detail.material.id,materialNumber:detail.after.materialNumber,name:detail.after.name,stageId:detail.stage.id,stageKey:detail.stage.name,stageName:detail.stage.name,activityName:detail.after.activityName,unit:detail.after.unit,
        before:{quantity:detail.material.plannedQuantity,unit:detail.material.unit,description:detail.material.scope,status:detail.material.status,updatedAt:detail.material.updatedAt},
        after:{quantity:detail.after.quantity,unit:detail.after.unit,status:detail.after.status,description:detail.after.description},documents,
      });
      await reloadMaterials();detail.element.closeTransition();
      if(payload.plannerStatus!=='generated')detail.element.setError(`Registro persistido; geração da agenda pendente: ${payload.plannerError||'serviço operacional indisponível.'}`);
    }catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Download a same-origin material attachment using the current bearer credential. */
  async function downloadMaterialAttachment(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasMaterials;fileUrl:string;fileName:string}>).detail;if(!detail||detail.element!==materialsElement)return;
    try{const fileUrl=new URL(detail.fileUrl,location.href);if(fileUrl.origin!==location.origin)throw new Error('O comprovante não pertence ao serviço operacional.');await runtime.BELAVISTA_ADMIN_AUTH_READY;const token=await runtime.BELAVISTA_GET_ID_TOKEN?.();if(!token)throw new Error('Autenticação necessária para abrir o comprovante.');const response=await fetch(fileUrl,{cache:'no-store',headers:{Authorization:'Bearer '+token}});if(response.status===401)runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();if(!response.ok)throw new Error(`Não foi possível abrir o comprovante (HTTP ${response.status}).`);const blobUrl=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=blobUrl;link.download=detail.fileName.replace(/[\\/]/g,'-');link.click();setTimeout(()=>URL.revokeObjectURL(blobUrl),60_000);}
    catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Encode a user-selected file for the backend's existing JSON upload contract. */
  function fileDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo ' + file.name + '.'));
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result) : reject(new Error('Arquivo inválido: ' + file.name + '.'));
      reader.readAsDataURL(file);
    });
  }

  /** Save sale status/notes and validated attachments for the selected persisted sale. */
  async function saveSale(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{
      element: AtlasSalesHistory; id: string; status: string; notes: string;
      contract: File[]; client: File[];
    }>).detail;
    if (!detail || detail.element !== salesHistory) return;
    try {
      if (!detail.status || detail.status.length > 160) throw new Error('Informe um status válido.');
      const selected = [
        ...detail.contract.map(file => ({ kind: 'contract', file })),
        ...detail.client.map(file => ({ kind: 'client', file })),
      ];
      if (selected.length > 8 || selected.some(item => item.file.size > 12_000_000) ||
          selected.reduce((sum, item) => sum + item.file.size, 0) > 30_000_000)
        throw new Error('Os anexos excedem o limite de 8 arquivos, 12 MB por arquivo ou 30 MB no total.');
      const files = await Promise.all(selected.map(async item => ({
        kind: item.kind, fileName: item.file.name, dataUrl: await fileDataUrl(item.file),
      })));
      await writeApi<{ sale: CommercialSale }>('/api/commercial-sales/' + encodeURIComponent(detail.id), {
        status: detail.status, notes: detail.notes, files,
      });
      await reloadSalesHistory();
    } catch (error) {
      if (detail.element === salesHistory)
        detail.element.setMutationError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Download a sale attachment only when its URL belongs to the trusted service. */
  async function downloadSaleFile(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{
      element: AtlasSalesHistory; fileUrl?: string; fileName?: string;
    }>).detail;
    if (!detail || detail.element !== salesHistory) return;
    try {
      const expected = new URL(apiUrl('/api/commercial-sales/'), location.href).href;
      const fileUrl = new URL(String(detail.fileUrl || ''), location.href).href;
      if (!fileUrl.startsWith(expected)) throw new Error('Endereço do anexo não pertence ao serviço comercial.');
      await runtime.BELAVISTA_ADMIN_AUTH_READY;
      const token = await runtime.BELAVISTA_GET_ID_TOKEN?.();
      if (!token) throw new Error('Autenticação necessária para obter o anexo.');
      const response = await fetch(fileUrl, { cache: 'no-store', headers: { Authorization: 'Bearer ' + token } });
      if (response.status === 401) runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();
      if (!response.ok) throw new Error('Não foi possível obter o anexo (HTTP ' + response.status + ').');
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = String(detail.fileName || 'anexo').replace(/[\\/]/g, '-');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      if (detail.element === salesHistory) detail.element.setDocumentError(null);
    } catch (error) {
      if (detail.element === salesHistory)
        detail.element.setDocumentError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Read and shape-check persisted sales; resolve each attachment URL for this runtime. */
  async function sales(): Promise<CommercialSale[]> {
    const payload = await readApi<{ sales: CommercialSale[] }>('/api/commercial-sales');
    if (!Array.isArray(payload.sales)) throw new Error('Resposta de vendas inválida.');
    return payload.sales.map(sale => ({
      ...sale,
      files: (sale.files || []).map(file => ({ ...file, fileUrl: apiUrl(file.fileUrl) })),
    }));
  }

  /** Read and shape-check the persistent repasse ledger. */
  async function repasses(): Promise<RepasseOperations> {
    const payload = await readApi<RepasseOperations>('/api/repasses');
    if (!Array.isArray(payload.entries) || !Array.isArray(payload.brokerRules))
      throw new Error('Resposta de repasses inválida.');
    return payload;
  }

  /** Compose broker directory from persisted sales, repasses, and professional profiles. */
  async function reloadBrokers(): Promise<void> {
    if (!brokersElement) return;
    const target=brokersElement,requestId=++brokersRequestId;target.setLoading();
    try {
      const [operations,saleRows,profilePayload]=await Promise.all([repasses(),sales(),readApi<{profiles:BrokerProfile[]}>('/api/broker-profiles')]);
      if(requestId!==brokersRequestId||target!==brokersElement)return;
      const saleById=new Map(saleRows.map(sale=>[sale.id,sale]));
      const connected={...operations,sales:operations.sales.map(sale=>({...sale,...saleById.get(sale.id)}))};
      target.setData(connected,calculateRepasseReports(connected.sales,connected.reasons),profilePayload.profiles);
    } catch(error) {
      if(requestId!==brokersRequestId||target!==brokersElement)return;
      target.setError(error instanceof Error?error.message:String(error));
    }
  }

  /** Persist professional profile fields without changing linked sales or ledger entries. */
  async function saveBrokerProfile(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasBrokers;name:string;profile:Omit<BrokerProfile,'id'|'name'|'createdAt'|'updatedAt'>}>).detail;
    if(!detail||detail.element!==brokersElement)return;
    try{
      await writeApi<{profile:BrokerProfile}>('/api/broker-profiles/'+encodeURIComponent(detail.name),detail.profile);
      await reloadBrokers();
      detail.element.setMessage('Cadastro profissional salvo no banco operacional.');
    }catch(error){detail.element.setProfileSaveState(false,error instanceof Error?error.message:String(error));}
  }

  /** Delete the professional-profile record only; preserve related financial records. */
  async function deleteBrokerProfile(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasBrokers;name:string}>).detail;
    if(!detail||detail.element!==brokersElement)return;
    try{
      await runtime.BELAVISTA_ADMIN_AUTH_READY;
      const token=await runtime.BELAVISTA_GET_ID_TOKEN?.();if(!token)throw new Error('Autenticação necessária para excluir o cadastro.');
      const response=await fetch(apiUrl('/api/broker-profiles/'+encodeURIComponent(detail.name)),{method:'DELETE',cache:'no-store',headers:{Authorization:'Bearer '+token}});
      if(response.status===401)runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();
      if(!response.ok){const payload=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(payload?.error||'Não foi possível excluir o cadastro (HTTP '+response.status+').');}
      await reloadBrokers();detail.element.setMessage('Cadastro profissional excluído. Vendas e repasses foram preservados.');
    }catch(error){detail.element.setMessage(error instanceof Error?error.message:String(error));}
  }

  /** Export loaded persisted broker profiles and derived portfolio values as branded CSV. */
  function exportBrokers(event:Event):void {
    const detail=(event as CustomEvent<{element:AtlasBrokers}>).detail;
    if(!detail||detail.element!==brokersElement)return;
    const data=detail.element.snapshotData();if(!data)return;
    const rows:unknown[][]=[['ATLAS · GESTÃO DE OBRAS & VENDAS','ALIANÇA PARK'],['PERFIS DE CORRETORES','DADOS DERIVADOS DE VENDAS PERSISTIDAS'],['GERADO EM',new Date().toLocaleString('pt-BR')],[],['Corretor','Vendas vinculadas','Lotes','Valor registrado (R$)','Entradas recebidas (R$)','CRECI','Telefone','E-mail']];
    for(const profile of detail.element.profiles())rows.push([profile.name,profile.sales.length,profile.lots.join(' · '),(profile.valueCents/100).toFixed(2).replace('.',','),(profile.receivedCents/100).toFixed(2).replace('.',','),profile.record?.creci||'Não registrado',profile.record?.phone||'Não registrado',profile.record?.email||'Não registrado']);
    const csv='\uFEFF'+rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""').replace(/[\r\n]+/g,' ')}"`).join(';')).join('\r\n');
    const blobUrl=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=blobUrl;link.download='perfis-corretores-alianca-park-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
    detail.element.setMessage(`CSV timbrado exportado com ${detail.element.profiles().length} perfis derivados dos registros persistidos.`);
  }

  /** Download a broker's sale-origin document after trusted-origin validation. */
  async function downloadBrokerFile(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasBrokers;fileUrl?:string;fileName?:string}>).detail;
    if(!detail||detail.element!==brokersElement)return;
    try{
      const expected=new URL(apiUrl('/api/commercial-sales/'),location.href).href,fileUrl=new URL(String(detail.fileUrl||''),location.href).href;
      if(!fileUrl.startsWith(expected))throw new Error('Endereço do documento não pertence ao serviço comercial.');
      await runtime.BELAVISTA_ADMIN_AUTH_READY;const token=await runtime.BELAVISTA_GET_ID_TOKEN?.();if(!token)throw new Error('Autenticação necessária para obter o documento.');
      const response=await fetch(fileUrl,{cache:'no-store',headers:{Authorization:'Bearer '+token}});
      if(response.status===401)runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();if(!response.ok)throw new Error('Não foi possível obter o documento (HTTP '+response.status+').');
      const blobUrl=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=blobUrl;link.download=String(detail.fileName||'documento').replace(/[\\/]/g,'-');document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(blobUrl),60_000);detail.element.setMessage(null);
    }catch(error){detail.element.setMessage(error instanceof Error?error.message:String(error));}
  }

  /** Stable repasse application order used to present already-persisted receipts. */
  const reasonPriority: Record<string, number> = { signal: 0, intermediate: 1, monthly: 2 };
  /** Primary/partner commission split policy by payment reason. */
  const reasonSplit: Record<string, [number, number]> = { signal: [50, 50], intermediate: [50, 50], monthly: [70, 30] };
  /** Normalize amounts to integer cents for deterministic financial calculations. */
  const cents = (value: unknown) => Math.round(Number(value) || 0);
  /** Parse YYYY-MM-DD at UTC noon to avoid local timezone date shifts. */
  function asDate(value: unknown): Date | null {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? new Date(`${value}T12:00:00Z`) : null;
  }
  /** Serialize a date as the backend's YYYY-MM-DD calendar representation. */
  function isoDate(date: Date): string { return date.toISOString().slice(0, 10); }
  /** Add calendar months and clamp end-of-month days (for example Jan 31 to Feb 28). */
  function addMonths(value: string, months: number): string | null {
    const date = asDate(value); if (!date) return null;
    const day = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay)); return isoDate(date);
  }
  /** Count non-negative whole calendar months between valid ISO dates. */
  function monthsBetween(from: string, to: string): number {
    const a = asDate(from), b = asDate(to);
    return a && b ? Math.max(0, (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()) : 0;
  }
  /**
   * Derive current and future repasse report rows from real sales, receipts,
   * commission rules, and payment plans. Current receipts sort by Sinal,
   * Intermediária, Mensal; future installments use plan dates, the configured
   * annual interest rate compounded monthly, and per-reason commission shares.
   * Missing rules/plans/dates remain explicit statuses instead of invented totals.
   */
  function calculateRepasseReports(sales: RepasseSale[], reasons: RepasseOperations['reasons'], today = new Date().toISOString().slice(0, 10)): RepasseReport[] {
    const reasonById = new Map(reasons.map(reason => [String(reason.id), reason]));
    return sales.map(sale => {
      const rate = Number(sale.brokerRule?.commissionPercent), configured = sale.brokerRule?.active === true && Number.isFinite(rate);
      const receipts = [...(sale.receipts || [])].sort((a,b) => (reasonPriority[a.repasseReasonId] ?? 9) - (reasonPriority[b.repasseReasonId] ?? 9) || String(a.date).localeCompare(String(b.date)));
      const receivedCents = receipts.reduce((sum,item) => sum + cents(item.amountCents),0);
      const basePriceCents = cents(sale.plan?.contractPriceCents || Number(sale.tablePrice?.price) * 100 || sale.valueCents);
      const remainingCents = Math.max(0,basePriceCents-receivedCents);
      const current: RepasseCurrentRow[] = receipts.map(receipt => {
        const reason = reasonById.get(receipt.repasseReasonId);
        if (!configured || !reason) return {...receipt,reasonLabel:reason?.label||'Razão não configurada',commissionCents:null,primaryCents:null,partnerCents:null};
        const commissionCents = Math.round(cents(receipt.amountCents)*rate/100*Number(reason.sharePercent||0)/100);
        const [primary,partner] = reasonSplit[reason.id]||[100,0], primaryCents=Math.round(commissionCents*primary/100);
        return {...receipt,reasonLabel:reason.label,commissionCents,primaryCents,partnerCents:commissionCents-primaryCents};
      });
      const plan=sale.plan;
      if(!configured||!plan||remainingCents<=0)return {saleId:sale.id,basePriceCents,receivedCents,remainingCents,current,future:[],forecastStatus:!configured?'commission-rule-required':!plan?'payment-plan-required':'settled'};
      const monthlyCount=Number(plan.monthlyInstallments)||0,semiannualCount=Number(plan.semiannualInstallments)||0;
      if((monthlyCount&&!asDate(plan.monthlyFirstDueDate))||(semiannualCount&&!asDate(plan.semiannualFirstDueDate)))return {saleId:sale.id,basePriceCents,receivedCents,remainingCents,current,future:[],forecastStatus:'payment-plan-incomplete'};
      const semiannualShare=Number(plan.semiannualPrincipalPercent)/100,buckets:Array<{reasonId:string;date:string;principalCents:number}> = [];
      if(monthlyCount)for(let i=0;i<monthlyCount;i++){const date=addMonths(plan.monthlyFirstDueDate||'',i);if(date)buckets.push({reasonId:'monthly',date,principalCents:Math.round(remainingCents*(1-semiannualShare)/monthlyCount)});}
      if(semiannualCount)for(let i=0;i<semiannualCount;i++){const date=addMonths(plan.semiannualFirstDueDate||'',i*6);if(date)buckets.push({reasonId:'intermediate',date,principalCents:Math.round(remainingCents*semiannualShare/semiannualCount)});}
      buckets.sort((a,b)=>a.date.localeCompare(b.date)||(reasonPriority[a.reasonId]??9)-(reasonPriority[b.reasonId]??9));
      const annualRate=Number(plan.annualInterestPercent)/100;let balance=remainingCents,accruedFrom=today,principalAssigned=0;
      const future:RepasseForecastRow[]=buckets.map((bucket,index)=>{
        const principalCents=index===buckets.length-1?Math.max(0,remainingCents-principalAssigned):Math.min(bucket.principalCents,Math.max(0,remainingCents-principalAssigned));principalAssigned+=principalCents;
        const periods=monthsBetween(accruedFrom,bucket.date),monthlyRate=Math.pow(1+annualRate,1/12)-1,interestCents=Math.max(0,Math.round(balance*(Math.pow(1+monthlyRate,periods)-1))),amountCents=principalCents+interestCents;
        const reason=reasonById.get(bucket.reasonId),commissionCents=reason?Math.round(amountCents*rate/100*Number(reason.sharePercent||0)/100):null,[primary]=reasonSplit[bucket.reasonId]||[100,0];
        balance=Math.max(0,balance-principalCents);accruedFrom=bucket.date;
        return {date:bucket.date,reasonId:bucket.reasonId,reasonLabel:reason?.label||bucket.reasonId,principalCents,interestCents,amountCents,balanceCents:balance,commissionCents,primaryCents:commissionCents===null?null:Math.round(commissionCents*primary/100),partnerCents:commissionCents===null?null:commissionCents-Math.round(commissionCents*primary/100)};
      });
      return {saleId:sale.id,basePriceCents,receivedCents,remainingCents,current,future,forecastStatus:'ready'};
    });
  }

  /** Refresh the persistent ledger and its derived report, ignoring stale responses. */
  async function reloadRepasses(): Promise<void> {
    if (!repassesElement) return;
    const target=repassesElement,requestId=++repassesRequestId;target.setLoading();
    try { const payload=await repasses();if(requestId!==repassesRequestId||target!==repassesElement)return;target.setData(payload,calculateRepasseReports(payload.sales,payload.reasons)); }
    catch(error){if(requestId!==repassesRequestId||target!==repassesElement)return;target.setError(error instanceof Error?error.message:String(error));}
  }

  /** Route a component intent to its corresponding persisted repasse CRUD endpoint. */
  async function mutateRepasse(event: Event): Promise<void> {
    const detail=(event as CustomEvent<{element:AtlasRepasses;action:string;payload:Record<string,unknown>}>).detail;
    if(!detail||detail.element!==repassesElement)return;
    const {action,payload}=detail;let path='',method='POST',body:unknown=payload;
    if(action==='create-entry')path='/api/repasses/entries';
    else if(action==='update-entry'){path='/api/repasses/entries/'+encodeURIComponent(String(payload.id));method='PUT';}
    else if(action==='delete-entry'){path='/api/repasses/entries/'+encodeURIComponent(String(payload.id));method='DELETE';body=undefined;}
    else if(action==='save-rule'){path='/api/repasses/broker-rule';method='PUT';}
    else if(action==='delete-rule'){path='/api/repasses/broker-rule?brokerName='+encodeURIComponent(String(payload.brokerName))+'&lotKey='+encodeURIComponent(String(payload.lotKey));method='DELETE';body=undefined;}
    else if(action==='save-plan'){path='/api/repasses/sales/'+encodeURIComponent(String(payload.saleId))+'/plan';method='PUT';}
    else if(action==='delete-plan'){path='/api/repasses/sales/'+encodeURIComponent(String(payload.saleId))+'/plan';method='DELETE';body=undefined;}
    else {detail.element.setMessage('Ação financeira desconhecida.');return;}
    try {
      await runtime.BELAVISTA_ADMIN_AUTH_READY;
      const token=await runtime.BELAVISTA_GET_ID_TOKEN?.();if(!token)throw new Error('Autenticação necessária para modificar repasses.');
      const response=await fetch(apiUrl(path),{method,cache:'no-store',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      if(response.status===401)runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();
      const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Operação recusada (HTTP '+response.status+').');
      await reloadRepasses();detail.element.setMessage('Alteração persistida; relatórios recalculados.');
    }catch(error){detail.element.setMessage(error instanceof Error?error.message:String(error));}
  }

  /** Export branded CSV rows for persisted receipts and calculable plan projections. */
  function exportRepasseCsv(event:Event):void {
    const detail=(event as CustomEvent<{element:AtlasRepasses}>).detail;if(!detail||detail.element!==repassesElement)return;
    const data=detail.element.snapshotData();if(!data)return;
    const reports=calculateRepasseReports(data.sales,data.reasons),saleById=new Map(data.sales.map(sale=>[String(sale.id),sale])),width=15;
    const forecastLabel=(status:RepasseReport['forecastStatus'])=>({ready:'Projeção calculada',settled:'Contrato liquidado','commission-rule-required':'Configurar comissão do corretor e lote','payment-plan-required':'Configurar plano de pagamento','payment-plan-incomplete':'Completar datas do plano'})[status];
    const cell=(value:unknown)=>`"${String(value??'').replaceAll('"','""').replace(/[\r\n]+/g,' ')}"`,money=(value:number)=>(Number(value||0)/100).toFixed(2).replace('.',','),line=(...values:unknown[])=>[...values,...Array(Math.max(0,width-values.length)).fill('')];
    const rows:unknown[][]=[line('ATLAS · GESTÃO DE OBRAS & VENDAS','ALIANÇA PARK'),line('RELATÓRIO DE REPASSES','ENTRADAS REALIZADAS E PROJEÇÕES CONFIGURADAS'),line('GERADO EM',new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})),line('LEGENDA','Realizado = entrada persistida · Projetado = parcela prevista · Sem movimento = sem entradas ou plano'),line(),line('DADOS DO RELATÓRIO'),['Tipo','Venda','Lote','Cliente','Corretor','Data','Prioridade','Entrada recebida (R$)','Principal (R$)','Juros (R$)','Parcela (R$)','Comissão (R$)','Warley (R$)','Contraparte (R$)','Situação']];
    for(const report of reports){const sale=saleById.get(String(report.saleId));if(!sale)continue;
      for(const item of report.current)rows.push(['Realizado',sale.id,sale.lot,sale.client,sale.broker,item.date,item.reasonLabel,money(item.amountCents),'','','',item.commissionCents==null?'':money(item.commissionCents),item.primaryCents==null?'':money(item.primaryCents),item.partnerCents==null?'':money(item.partnerCents),'Recebido']);
      for(const item of report.future)rows.push(['Projetado',sale.id,sale.lot,sale.client,sale.broker,item.date,item.reasonLabel,'',money(item.principalCents),money(item.interestCents),money(item.amountCents),item.commissionCents==null?'':money(item.commissionCents),item.primaryCents==null?'':money(item.primaryCents),item.partnerCents==null?'':money(item.partnerCents),report.forecastStatus]);
      if(!report.current.length&&!report.future.length)rows.push(['Sem movimento',sale.id,sale.lot,sale.client,sale.broker,'','','','','','','','','',forecastLabel(report.forecastStatus)]);
    }
    const blobUrl=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
    link.href=blobUrl;link.download='relatorio-repasses-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
    detail.element.setMessage(`CSV timbrado exportado com ${reports.length} vendas e suas entradas e projeções disponíveis.`);
  }

  /** Load the real repository-backed CRM projection; confidential document payloads are never returned by this API. */
  async function reloadLeads(): Promise<void> {
    const target = leadsElement;
    if (!target) return;
    const requestId = ++leadsRequestId;
    try {
      const result = await readApi<PublicCommercialRecords>('/api/admin/public-leads');
      if (requestId === leadsRequestId && target === leadsElement) target.setRecords(result);
    } catch (error) {
      if (requestId === leadsRequestId && target === leadsElement) target.setRecordsError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Fetch Instagram data without converting an explicit provider-unavailable response into fake/empty success. */
  async function readInstagramFeed(): Promise<InstagramFeed> {
    await runtime.BELAVISTA_ADMIN_AUTH_READY;
    const token = await runtime.BELAVISTA_GET_ID_TOKEN?.();
    if (!token) throw new Error('Autenticação necessária para consultar o Instagram.');
    const response = await fetch(apiUrl('/api/instagram/feed?limit=6&commentsLimit=8'), { cache: 'no-store', headers: { Authorization: 'Bearer ' + token } });
    if (response.status === 401) runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();
    const payload = await response.json().catch(() => null) as InstagramFeed | null;
    if (payload?.source === 'unavailable') return payload;
    if (!response.ok || !payload) throw new Error((payload as (InstagramFeed & { error?: string }) | null)?.error || `Instagram indisponível (HTTP ${response.status}).`);
    return payload;
  }

  /** Refresh provider feed and persistent moderation policy only for the currently mounted leads element. */
  async function reloadInstagram(element = leadsElement): Promise<void> {
    if (!element || element !== leadsElement) return;
    const requestId = ++instagramRequestId;
    try {
      const feed = await readInstagramFeed();
      if (requestId === instagramRequestId && element === leadsElement) element.setFeed(feed);
    } catch (error) {
      if (requestId === instagramRequestId && element === leadsElement) element.setFeedError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Load the comment response policy from its Worker-backed persistent row. */
  async function reloadInstagramPolicy(element = leadsElement): Promise<void> {
    if (!element || element !== leadsElement) return;
    const requestId = ++instagramPolicyRequestId;
    try {
      const policy = await readApi<InstagramCommentPolicy>('/api/instagram/automation-policy');
      if (requestId === instagramPolicyRequestId && element === leadsElement) element.setPolicy(policy);
    } catch (error) {
      if (requestId === instagramPolicyRequestId && element === leadsElement) element.setFeedback(error instanceof Error ? error.message : String(error));
    }
  }

  /** Persist Instagram moderation policy and require an authoritative read-back before success. */
  async function saveInstagramPolicy(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasLeads; policy: InstagramCommentPolicy }>).detail;
    if (!detail || detail.element !== leadsElement) return;
    try {
      const saved = await mutateApi<InstagramCommentPolicy>('/api/instagram/automation-policy', 'PUT', detail.policy);
      if (saved.source !== 'worker') throw new Error('Worker não confirmou persistência da diretriz no banco.');
      const confirmed = await readApi<InstagramCommentPolicy>('/api/instagram/automation-policy');
      if (confirmed.preset !== saved.preset || confirmed.tone !== saved.tone || confirmed.instructions !== saved.instructions) throw new Error('A releitura não confirmou a diretriz salva.');
      detail.element.setPolicy(confirmed); detail.element.setPolicySaving(false); detail.element.setFeedback('Diretriz salva e confirmada no Worker.');
    } catch (error) { detail.element.setPolicySaving(false); detail.element.setFeedback(error instanceof Error ? error.message : String(error)); }
  }

  /** Send only the explicitly approved comment draft to Meta, then reread the provider feed. */
  async function sendInstagramReply(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasLeads; commentId: string; message: string }>).detail;
    if (!detail || detail.element !== leadsElement) return;
    try {
      const sent = await mutateApi<{ sent: boolean }>('/api/instagram/comments/' + encodeURIComponent(detail.commentId) + '/reply', 'POST', { message: detail.message });
      if (!sent.sent) throw new Error('Meta não confirmou o envio da resposta.');
      detail.element.setReplyResult('Resposta enviada à Meta. Atualizando comentários.');
      await reloadInstagram(detail.element);
    } catch (error) { detail.element.setReplyResult(error instanceof Error ? error.message : String(error), true); }
  }

  /** Open the existing host chat with persisted lead context; no state change is reported as a sent message. */
  function openLeadChat(event: Event): void {
    const detail = (event as CustomEvent<{ element: AtlasLeads; lead: PublicCommercialLead }>).detail;
    if (!detail || detail.element !== leadsElement) return;
    const chat = runtime.belavistaWorkerAssistant;
    if (!chat?.submit) { detail.element.setFeedback('O chat operacional ainda não está disponível.'); return; }
    const lead = detail.lead;
    const context = [`Atendimento do lead ${lead.name || 'contato não identificado'}.`, `Lote: ${lead.lot || 'não informado'}.`, `Status: ${lead.status}.`, `Objetivo: ${lead.objective || 'não informado'}.`, `Resumo registrado: ${lead.conversationSummary || 'sem resumo de conversa disponível'}.`, 'Proponha a próxima ação comercial e aguarde confirmação antes de qualquer alteração.'].join(' ');
    chat.root?.classList.remove('is-collapsed');
    chat.submit(context, null, null, [], { mode: 'priority', requestContext: { source: 'lead-follow-up', lead } });
  }

  /** Reload persisted sales and repasse metadata for the history component. */
  async function reloadSalesHistory(): Promise<void> {
    if (!salesHistory) return;
    const target = salesHistory;
    const requestId = ++machine.requestId;
    machine.lastError = null;
    try {
      const [saleRows, repasseRows] = await Promise.all([sales(), repasses()]);
      if (requestId === machine.requestId && target === salesHistory)
        target.setData(saleRows, repasseRows.entries, repasseRows.brokerRules);
    } catch (error) {
      machine.lastError = error instanceof Error ? error.message : String(error);
      if (requestId === machine.requestId && target === salesHistory)
        target.setError(machine.lastError);
    }
  }

  /** Replace the shell history renderer and bind navigation plus history events. */
  function installSalesHistoryRoute(
    ViewLayer: { prototype: HTMLElement & Record<string, unknown> },
    appStore: { get(): { selectedSalesHistoryId?: string | null }; set(state: Record<string, unknown>): void },
    host: Document,
  ): void {
    ViewLayer.prototype['sales-history'] = () => '<atlas-sales-history></atlas-sales-history>';
    host.addEventListener('atlas:history-connected', event => {
      const element = (event as CustomEvent<{ element: AtlasSalesHistory }>).detail?.element;
      if (!(element instanceof AtlasSalesHistory)) return;
      salesHistory = element;
      element.selectSale(appStore.get().selectedSalesHistoryId || null);
      void reloadSalesHistory();
    });
    host.addEventListener('atlas:navigate', event => {
      const detail = (event as CustomEvent<{ view: string; id?: string }>).detail;
      if (!detail || !['commission-deal', 'sales-history'].includes(detail.view)) return;
      navigateRoute(appStore, { view: detail.view, ...(detail.id ? { saleId: detail.id } : {}) }, {
        ...(detail.id ? { selectedCommissionNegotiation: detail.id } : {}),
        lastAction: 'Abriu o cadastro completo da venda',
      });
    });
    host.addEventListener('atlas:history-selection', event => {
      const id = (event as CustomEvent<{ id: string | null }>).detail?.id || null;
      navigateRoute(appStore, { saleId: id }, { selectedSalesHistoryId: id });
    });
    host.addEventListener('atlas:history-save', event => { void saveSale(event); });
    host.addEventListener('atlas:history-file', event => { void downloadSaleFile(event); });
  }

  /** Install repasses route and bind refresh, CRUD, and CSV actions. */
  function installRepassesRoute(ViewLayer:{prototype:HTMLElement&Record<string,unknown>},host:Document):void {
    ViewLayer.prototype.repasses=()=>'<atlas-repasses></atlas-repasses>';
    host.addEventListener('atlas:repasse-connected',event=>{
      const element=(event as CustomEvent<{element:AtlasRepasses}>).detail?.element;
      if(!(element instanceof AtlasRepasses))return;
      repassesElement=element;void reloadRepasses();
    });
    host.addEventListener('atlas:repasse-refresh',event=>{
      const element=(event as CustomEvent<{element:AtlasRepasses}>).detail?.element;
      if(element!==repassesElement)return;void reloadRepasses();
    });
    host.addEventListener('atlas:repasse-mutation',event=>{void mutateRepasse(event);});
    host.addEventListener('atlas:repasse-export',event=>exportRepasseCsv(event));
  }

  /** Install broker directory/detail routes; own URL/store selection and domain listeners. */
  function installBrokersRoute(ViewLayer:{prototype:HTMLElement&Record<string,unknown>},appStore:{get():Record<string,unknown>;set(state:Record<string,unknown>):void},host:Document):void{
    let selectedBrokerId=String(appStore.get().selectedBrokerDirectoryId||'');
    const persistSelectionInUrl=()=>{if(typeof globalThis.history==='undefined')return;const url=new URL(location.href);if(selectedBrokerId)url.searchParams.set('broker',selectedBrokerId);else url.searchParams.delete('broker');globalThis.history.replaceState(globalThis.history.state,'',url);};
    const directory=()=>{selectedBrokerId='';persistSelectionInUrl();return '<atlas-brokers></atlas-brokers>';};
    const detail=()=>`<atlas-brokers data-selected-broker="${String(selectedBrokerId||new URL(location.href).searchParams.get('broker')||appStore.get().selectedBrokerDirectoryId||'').replace(/[&<>"']/g,'')}"></atlas-brokers>`;
    ViewLayer.prototype.brokers=directory;
    ViewLayer.prototype['brokers-board']=directory;
    ViewLayer.prototype['broker-detail']=detail;
    host.addEventListener('atlas:brokers-connected',event=>{const element=(event as CustomEvent<{element:AtlasBrokers}>).detail?.element;if(!(element instanceof AtlasBrokers))return;brokersElement=element;void reloadBrokers();});
    host.addEventListener('atlas:brokers-refresh',event=>{const element=(event as CustomEvent<{element:AtlasBrokers}>).detail?.element;if(element===brokersElement)void reloadBrokers();});
    host.addEventListener('atlas:brokers-export',event=>exportBrokers(event));
    host.addEventListener('atlas:broker-profile-save',event=>{void saveBrokerProfile(event);});
    host.addEventListener('atlas:broker-profile-delete',event=>{void deleteBrokerProfile(event);});
    host.addEventListener('atlas:brokers-file',event=>{void downloadBrokerFile(event);});
    host.addEventListener('atlas:navigate',event=>{const navigation=(event as CustomEvent<{view:string;id?:string}>).detail;if(!navigation||!['brokers','broker-detail'].includes(navigation.view))return;selectedBrokerId=navigation.view==='broker-detail'?String(navigation.id||''):'';persistSelectionInUrl();navigateRoute(appStore,{view:navigation.view,brokerId:selectedBrokerId},{selectedBrokerDirectoryId:selectedBrokerId,lastAction:navigation.view==='broker-detail'?'Abriu o perfil do corretor':'Voltou à listagem de corretores'});});
  }

  /** Install the TS materials route and bind CRUD, allocation, schema, and transitions. */
  function installMaterialsRoute(ViewLayer:{prototype:HTMLElement&Record<string,unknown>},host:Document):void {
    ViewLayer.prototype.materials=()=>'<atlas-materials></atlas-materials>';
    host.addEventListener('atlas:materials-connected',event=>{
      const element=(event as CustomEvent<{element:AtlasMaterials}>).detail?.element;
      if(!(element instanceof AtlasMaterials))return;
      materialsElement=element;void reloadMaterials();
    });
    host.addEventListener('atlas:materials-refresh',event=>{if((event as CustomEvent<{element:AtlasMaterials}>).detail?.element===materialsElement)void reloadMaterials();});
    host.addEventListener('atlas:material-save',event=>{void saveMaterial(event);});
    host.addEventListener('atlas:material-delete',event=>{void deleteMaterial(event);});
    host.addEventListener('atlas:material-allocate',event=>{void allocateMaterial(event);});
    host.addEventListener('atlas:material-column-save',event=>{void saveMaterialColumn(event);});
    host.addEventListener('atlas:material-column-delete',event=>{void deleteMaterialColumn(event);});
    host.addEventListener('atlas:material-transition-open',event=>{void openMaterialTransition(event);});
    host.addEventListener('atlas:material-transition-save',event=>{void saveMaterialTransition(event);});
    host.addEventListener('atlas:material-file',event=>{void downloadMaterialAttachment(event);});
  }

  /** Install the TS agenda renderer and bind canonical event create/edit/delete actions. */
  function installAgendaRoute(ViewLayer:{prototype:HTMLElement&Record<string,unknown>},host:Document):void{
    ViewLayer.prototype.agenda=()=>'<atlas-agenda></atlas-agenda>';
    host.addEventListener('atlas:agenda-connected',event=>{
      const element=(event as CustomEvent<{element:AtlasAgenda}>).detail?.element;
      if(!(element instanceof AtlasAgenda))return;
      agendaElement=element;void reloadAgenda();
    });
    host.addEventListener('atlas:agenda-refresh',event=>{if((event as CustomEvent<{element:AtlasAgenda}>).detail?.element===agendaElement)void reloadAgenda();});
    host.addEventListener('atlas:agenda-save',event=>{void saveAgendaEvent(event);});
    host.addEventListener('atlas:agenda-delete',event=>{void deleteAgendaEvent(event);});
  }

  /** Load real stage activities, linked records, and materials for list/detail views. */
  async function reloadActivities(appStore: { get(): Record<string, unknown> }): Promise<void> {
    const target = activitiesElement;
    if (!target) return;
    const requestId = ++activitiesRequestId;
    target.setLoading();
    try {
      const [stagePayload, recordPayload, materialPayload] = await Promise.all([
        readApi<{ stages: OperationalStage[] }>('/api/stages-admin'),
        readApi<{ records: OperationalRecord[] }>('/api/records'),
        readApi<{ materials: OperationalMaterial[] }>('/api/materials'),
      ]);
      if (!Array.isArray(stagePayload.stages) || !Array.isArray(recordPayload.records) || !Array.isArray(materialPayload.materials))
        throw new Error('O serviço não retornou etapas, registros e materiais no formato esperado.');
      if (requestId !== activitiesRequestId || target !== activitiesElement) return;
      const actor = appStore.get().currentActor as { role?: string } | undefined;
      target.setData(stagePayload.stages, recordPayload.records, materialPayload.materials, String(actor?.role || ''));
    } catch (error) {
      if (requestId === activitiesRequestId && target === activitiesElement)
        target.setError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Persist an activity create/update through the owner/admin API and reload it. */
  async function saveActivity(event: Event, appStore: { get(): Record<string, unknown> }): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasActivities; id: string | null; payload: Partial<OperationalActivity> }>).detail;
    if (!detail || detail.element !== activitiesElement) return;
    try {
      await mutateApi(`/api/activities${detail.id ? '/' + encodeURIComponent(detail.id) : ''}`, detail.id ? 'PUT' : 'POST', detail.payload);
      await reloadActivities(appStore);
    } catch (error) { detail.element.setSavingError(error instanceof Error ? error.message : String(error)); }
  }

  /** Delete a persisted activity and reload the canonical stage list. */
  async function deleteActivity(event: Event, appStore: { get(): Record<string, unknown> }): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasActivities; id: string }>).detail;
    if (!detail || detail.element !== activitiesElement) return;
    try {
      await mutateApi(`/api/activities/${encodeURIComponent(detail.id)}`, 'DELETE');
      await reloadActivities(appStore);
    } catch (error) { detail.element.setSavingError(error instanceof Error ? error.message : String(error)); }
  }

  /** Create a field record linked to the selected persisted activity and refresh the diary. */
  async function createActivityRecord(event: Event, appStore: { get(): Record<string, unknown> }): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasActivities; payload: Record<string, unknown> }>).detail;
    if (!detail || detail.element !== activitiesElement) return;
    try {
      await mutateApi('/api/records', 'POST', detail.payload);
      await reloadActivities(appStore);
    } catch (error) { detail.element.setSavingError(error instanceof Error ? error.message : String(error)); }
  }

  /** Install the Atlas activity list/detail route and authenticated persistent operations. */
  function installActivitiesRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void {
    ViewLayer.prototype.activities = () => '<atlas-activities></atlas-activities>';
    host.addEventListener('atlas:activities-connected', event => {
      const element = (event as CustomEvent<{ element: AtlasActivities }>).detail?.element;
      if (!(element instanceof AtlasActivities)) return;
      activitiesElement = element;
      // This route owns its selected-activity detail locally. Clear the legacy
      // stage-detail chrome/selection so stale shell state cannot mask the list.
      const navigationState = appStore.get();
      if (navigationState.activityDedicated || navigationState.stageActivityDedicatedV9 || navigationState.selectedActivity)
        appStore.set({ activityDedicated: false, stageActivityDedicatedV9: false, selectedActivity: null });
      void reloadActivities(appStore);
    });
    host.addEventListener('atlas:activities-refresh', event => {
      if ((event as CustomEvent<{ element: AtlasActivities }>).detail?.element === activitiesElement) void reloadActivities(appStore);
    });
    host.addEventListener('atlas:activity-save', event => { void saveActivity(event, appStore); });
    host.addEventListener('atlas:activity-delete', event => { void deleteActivity(event, appStore); });
    host.addEventListener('atlas:activity-record-create', event => { void createActivityRecord(event, appStore); });
  }

  /** Read each dashboard metric from its owning operational service; never infer missing sources. */
  async function reloadDashboard(): Promise<void> {
    const target = dashboardElement;
    if (!target) return;
    const requestId = ++dashboardRequestId;
    try {
      const [cashPayload, stagePayload, recordPayload, notificationPayload, agendaPayload, materialPayload, repassePayload] = await Promise.all([
        readApi<{ summary: { balanceCents: number }; entries: CashFlowRecord[] }>('/api/cash-flow'),
        readApi<{ stages: OperationalStage[] }>('/api/stages-admin'),
        readApi<{ records: OperationalRecord[] }>('/api/records'),
        readApi<{ notifications: OperationalNotification[] }>('/api/notifications'),
        readApi<{ events: OperationalAgendaEvent[] }>('/api/agenda-events'),
        readApi<{ materials: OperationalMaterial[] }>('/api/materials'),
        readApi<RepasseOperations>('/api/repasses'),
      ]);
      if (!Number.isFinite(Number(cashPayload.summary?.balanceCents)) || !Array.isArray(stagePayload.stages) ||
          !Array.isArray(recordPayload.records) || !Array.isArray(notificationPayload.notifications) ||
          !Array.isArray(agendaPayload.events) || !Array.isArray(cashPayload.entries) || !Array.isArray(materialPayload.materials) ||
          !Array.isArray(repassePayload.sales) || !Array.isArray(repassePayload.entries) || !Array.isArray(repassePayload.brokerRules) ||
          !Array.isArray(repassePayload.reasons)) throw new Error('Resposta inválida ao compor a Central de operação.');
      if (requestId !== dashboardRequestId || target !== dashboardElement) return;
      const snapshot: DashboardSnapshot = {
        cashBalanceCents: Number(cashPayload.summary.balanceCents),
        cashEntries: cashPayload.entries,
        stages: stagePayload.stages,
        records: recordPayload.records,
        notifications: notificationPayload.notifications,
        agendaEvents: agendaPayload.events,
        materials: materialPayload.materials,
        repasses: repassePayload,
      };
      target.setData(snapshot);
    } catch (error) {
      if (requestId === dashboardRequestId && target === dashboardElement)
        target.setError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Generate a CSV from a fresh authenticated read of the requested operational collection. */
  async function exportDashboardReport(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasDashboard; kind: string }>).detail;
    if (!detail || detail.element !== dashboardElement) return;
    try {
      const report = detail.kind === 'records'
        ? { path: '/api/records', key: 'records', filename: 'registros-de-campo.csv', columns: ['id','data','hora','obra','etapa','atividade','responsavel','status','detalhes'] as const }
        : detail.kind === 'agenda'
          ? { path: '/api/agenda-events', key: 'events', filename: 'agenda-por-estado.csv', columns: ['id','status','date','start','title','stageName','activityName','owner','durationHours','spanDays','notes'] as const }
          : null;
      if (!report) throw new Error('Tipo de relatório não reconhecido.');
      const payload = await readApi<Record<string, unknown>>(report.path);
      const rows = payload[report.key];
      if (!Array.isArray(rows)) throw new Error('O serviço não retornou a lista esperada para exportação.');
      if (detail.kind === 'agenda') {
        const priority = ['pendente','em andamento','planejado','aguardando material','bloqueado','concluído'];
        rows.sort((left, right) => {
          const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
          const leftStatus = String(a.status || 'Planejado').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const rightStatus = String(b.status || 'Planejado').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const leftRank = priority.indexOf(leftStatus), rightRank = priority.indexOf(rightStatus);
          return (leftRank < 0 ? priority.length : leftRank) - (rightRank < 0 ? priority.length : rightRank) ||
            leftStatus.localeCompare(rightStatus, 'pt-BR') || `${a.date || ''}T${a.start || ''}`.localeCompare(`${b.date || ''}T${b.start || ''}`);
        });
      }
      if (!rows.length) { detail.element.setFeedback('A fonte persistida não contém registros para exportar.'); return; }
      const cell = (value: unknown) => {
        const text = String(value ?? '').replace(/[\r\n]+/g, ' ');
        return `"${(/^[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
      };
      const csv = '\uFEFF' + [report.columns.map(cell).join(';'), ...rows.map(row => {
        const record = row as Record<string, unknown>;
        return report.columns.map(key => cell(record[key])).join(';');
      })].join('\r\n');
      const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = report.filename;
      document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      detail.element.setFeedback(`CSV gerado a partir de ${rows.length} registro(s) persistido(s).`);
    } catch (error) {
      detail.element.setFeedback(`Relatório não gerado: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Create a real diary record from the dashboard capture and refresh canonical sources. */
  async function createDashboardRecord(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasDashboard; payload: Record<string, unknown> }>).detail;
    if (!detail || detail.element !== dashboardElement) return;
    try {
      await mutateApi<OperationalRecord>('/api/records', 'POST', detail.payload);
      if (detail.element !== dashboardElement) return;
      await reloadDashboard();
      if (detail.element === dashboardElement) detail.element.setRecordResult('Registro confirmado pelo serviço do diário. Os indicadores foram atualizados.');
    } catch (error) {
      if (detail.element === dashboardElement) {
        detail.element.setRecordSaving(false);
        detail.element.setError(error instanceof Error ? error.message : String(error));
      }
    }
  }

  /** Install the TypeScript dashboard renderer and bridge its navigation/report intents to the host. */
  function installDashboardRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void {
    ViewLayer.prototype.control = () => '<atlas-dashboard></atlas-dashboard>';
    host.addEventListener('atlas:dashboard-connected', event => {
      const element = (event as CustomEvent<{ element: AtlasDashboard }>).detail?.element;
      if (!(element instanceof AtlasDashboard)) return;
      dashboardElement = element; void reloadDashboard();
    });
    host.addEventListener('atlas:dashboard-refresh', event => {
      if ((event as CustomEvent<{ element: AtlasDashboard }>).detail?.element === dashboardElement) void reloadDashboard();
    });
    host.addEventListener('atlas:dashboard-report', event => { void exportDashboardReport(event); });
    host.addEventListener('atlas:dashboard-record-create', event => { void createDashboardRecord(event); });
    host.addEventListener('atlas:navigate', event => {
      if (event.target !== dashboardElement) return;
      const navigation = (event as CustomEvent<{ view: string; stageKey?: string; newRecord?: boolean }>).detail;
      if (!navigation || !['assistant','map','reports','records','progress','activities','materials','leads','brokers','brokers-board','finance','repasses','cash-record','settings','stages','agenda'].includes(navigation.view)) return;
      const stageId = navigation.stageKey && /^\d+$/.test(navigation.stageKey) ? Number(navigation.stageKey) : null;
      navigateRoute(appStore, { view: navigation.view, ...(navigation.stageKey ? { stageKey: navigation.stageKey, ...(stageId === null ? {} : { stageId }) } : {}) }, { ...(navigation.stageKey ? { stageSelected: true } : {}), ...(navigation.view === 'stages' && navigation.stageKey ? { activityDedicated: true, stageActivityDedicatedV9: false } : {}), ...(navigation.newRecord ? { activityDedicated: false, selectedActivity: null, selectedRecordsActivityV5377: null, recordsRegistrationRequestedV5377: true, editingRecord: null, recordContext: null, lastAction: 'Abriu novo registro' } : { lastAction: `Abriu ${navigation.view} pelo panorama operacional` }) });
    });
  }

  /** Register an immutable cash exit through the owner-authorized ledger API. */
  async function createCashRecord(event: Event, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasCashRecord; payload: Record<string, unknown> }>).detail;
    if (!detail || detail.element !== cashRecordElement) return;
    const actor = appStore.get().currentActor as { role?: string } | undefined;
    if (actor?.role !== 'owner') { detail.element.setError('A API autoriza lançamentos de caixa somente para o perfil Dono.'); return; }
    try {
      const { file, ...fields } = detail.payload;
      const attachment = file instanceof File ? { fileName: file.name, mimeType: file.type, dataUrl: await fileDataUrl(file) } : null;
      const result = await mutateApi<{ entry: CashFlowRecord; summary: CashFlowSummary; operational: unknown }>('/api/cash-flow', 'POST', { ...fields, attachment });
      const route = appStore.get(), rawReturn = String(route.cashRecordReturnView || 'finance');
      const returnView = ['finance', 'control', 'repasses'].includes(rawReturn) ? rawReturn : 'finance';
      const target = cashRecordElement;
      let canonical: { entries: CashFlowRecord[]; summary: CashFlowSummary };
      try {
        canonical = await readApi<{ entries: CashFlowRecord[]; summary: CashFlowSummary }>('/api/cash-flow');
        if (!Array.isArray(canonical.entries)) throw new Error('O serviço retornou uma lista canônica inválida.');
      } catch {
        appStore.set({ cashSummary: result.summary, cashFlowLocal: [result.entry, ...((route.cashFlowLocal as CashFlowRecord[] | undefined) || [])], operationalState: result.operational, cashRecordReturnView: null, cashRecordDraft: null, lastAction: `Saída ${result.entry.id} foi salva; reconferência do caixa indisponível. Não reenvie.` });
        if (target === detail.element) navigateRoute(appStore, { view: returnView });
        return;
      }
      appStore.set({ cashSummary: canonical.summary, cashFlowLocal: canonical.entries, operationalState: result.operational, cashRecordReturnView: null, cashRecordDraft: null, lastAction: `Registrou saída ${result.entry.id}` });
      if (target === detail.element) navigateRoute(appStore, { view: returnView });
    } catch (error) {
      if (detail.element === cashRecordElement) detail.element.setError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Install the owner-only cash-record view and bind it to the persistent ledger. */
  function installCashRecordRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void {
    ViewLayer.prototype['cash-record'] = () => '<atlas-cash-record></atlas-cash-record>';
    host.addEventListener('atlas:cash-record-connected', event => {
      const element = (event as CustomEvent<{ element: AtlasCashRecord }>).detail?.element;
      if (!(element instanceof AtlasCashRecord)) return;
      cashRecordElement = element;
      const state = appStore.get(), actor = state.currentActor as { role?: string; label?: string } | undefined;
      const returnView = String(state.cashRecordReturnView || 'finance');
      element.setContext({ actorLabel: String(actor?.label || actor?.role || 'Sem identificação'), allowed: actor?.role === 'owner', stages: [], returnView });
      void readApi<{ stages: OperationalStage[] }>('/api/stages-admin').then(payload => {
        if (cashRecordElement === element && Array.isArray(payload.stages)) element.setContext({ actorLabel: String(actor?.label || actor?.role || 'Sem identificação'), allowed: actor?.role === 'owner', stages: payload.stages, returnView });
      }).catch(error => { if (cashRecordElement === element) element.setError(error instanceof Error ? error.message : String(error)); });
    });
    host.addEventListener('atlas:cash-record-create', event => { void createCashRecord(event, appStore); });
    host.addEventListener('atlas:cash-record-back', event => {
      const detail = (event as CustomEvent<{ element: AtlasCashRecord; view?: string }>).detail;
      if (!detail || detail.element !== cashRecordElement) return;
      const requested = String(detail.view || 'finance'), view = ['finance', 'control', 'repasses'].includes(requested) ? requested : 'finance';
      appStore.set({ cashRecordReturnView: null, cashRecordDraft: null, lastAction: 'Voltou do formulário de caixa' });
      navigateRoute(appStore, { view });
    });
  }

  /** Read the real records and their persisted stage, material, and agenda context. */
  async function reloadProgress(): Promise<void> {
    const target = progressElement;
    if (!target) return;
    const requestId = ++progressRequestId;
    target.setLoading();
    try {
      const [stagePayload, recordPayload, materialPayload, agendaPayload] = await Promise.all([
        readApi<{ stages: OperationalStage[] }>('/api/stages-admin'),
        readApi<{ records: OperationalRecord[] }>('/api/records'),
        readApi<{ materials: OperationalMaterial[] }>('/api/materials'),
        readApi<{ events: OperationalAgendaEvent[] }>('/api/agenda-events'),
      ]);
      if (!Array.isArray(stagePayload.stages) || !Array.isArray(recordPayload.records) || !Array.isArray(materialPayload.materials) || !Array.isArray(agendaPayload.events))
        throw new Error('O serviço não retornou etapas, registros, materiais e compromissos no formato esperado.');
      if (requestId !== progressRequestId || target !== progressElement) return;
      target.setData({ stages: stagePayload.stages, records: recordPayload.records, materials: materialPayload.materials, agendaEvents: agendaPayload.events });
    } catch (error) {
      if (requestId === progressRequestId && target === progressElement)
        target.setError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Persist a stage diary record and verify it by rereading the canonical services. */
  async function createProgressRecord(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasProgress; payload: Record<string, unknown> }>).detail;
    if (!detail || detail.element !== progressElement) return;
    try {
      const result = await mutateApi<{ id?: string }>('/api/records', 'POST', detail.payload);
      await reloadProgress();
      const target = progressElement;
      if (target === detail.element) target.setFeedback(`Registro ${result?.id || 'criado'} salvo pelo serviço persistente.`);
    } catch (error) {
      if (detail.element === progressElement) detail.element.setError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Install the Atlas stage diary; route changes use the host's single navigation state. */
  function installProgressRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void {
    ViewLayer.prototype.progress = () => '<atlas-progress></atlas-progress>';
    host.addEventListener('atlas:progress-connected', event => {
      const element = (event as CustomEvent<{ element: AtlasProgress }>).detail?.element;
      if (!(element instanceof AtlasProgress)) return;
      progressElement = element;
      const route = appStore.get(), stageKey = String(route.selectedStageV9 || route.selectedStage || '');
      element.setRouteStage(stageKey);
      void reloadProgress();
    });
    host.addEventListener('atlas:progress-refresh', event => {
      if ((event as CustomEvent<{ element: AtlasProgress }>).detail?.element === progressElement) void reloadProgress();
    });
    host.addEventListener('atlas:progress-record-create', event => { void createProgressRecord(event); });
    host.addEventListener('atlas:navigate', event => {
      if (event.target !== progressElement) return;
      const navigation = (event as CustomEvent<{ view?: string; stageKey?: string }>).detail;
      if (!navigation || !['agenda', 'materials', 'records', 'stages'].includes(String(navigation.view))) return;
      const stageKey = String(navigation.stageKey || ''), stageId = /^\d+$/.test(stageKey) ? Number(stageKey) : null;
      navigateRoute(appStore, { view: navigation.view, ...(stageKey ? { stageKey, ...(stageId === null ? {} : { stageId }) } : {}) }, stageKey ? { stageSelected: true } : {});
    });
  }

  type OriginalWorkbenchActivity = { id: string; title: string; unit: string; materials: string[]; release: string; weight: number; operational: Record<string, unknown> };
  type OriginalWorkbenchStage = { key: string; title: string; aliases: string[]; activities: OriginalWorkbenchActivity[] };
  // Source catalogue migrated from the original Worker comprehension; it is read-only fallback content, never a substitute for persisted edits.
  const originalWorkbenchCatalog = [{"key":"project","title":"Preparação e projeto","aliases":["design-approvals"],"activities":[{"id":"survey","title":"Levantamento, DWG e GPS","unit":"projeto","materials":["DWG georreferenciado","receptor GNSS","marcos topográficos"],"release":"Coordenadas, cotas e setores conferidos","weight":1.1,"operational":{"description":"Levantamento, DWG e GPS executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Topógrafo sob responsabilidade do RT","support":"Encarregado de campo e equipe GNSS","approval":"RT de topografia/engenharia"},"entryConditions":["Limites do imóvel, sistema de coordenadas e pontos de controle definidos","DWG de referência e autorização de acesso disponíveis"],"production":{"unit":"projeto","method":"Contar pontos/eixos levantados e aceitos, vinculando coordenada, cota e precisão","formula":"pontos aceitos = pontos medidos - pontos reprovados ou sem rastreabilidade","rate":"calibrar pontos/dia por equipe e complexidade"},"materials":["DWG georreferenciado","receptor GNSS","marcos topográficos"],"equipment":["DWG georreferenciado","receptor GNSS","marcos topográficos"],"evidence":["Arquivo bruto GNSS/estação total","Relatório de processamento e planta assinada","Fotos dos marcos e relatório de conferência"],"acceptance":["Coordenadas e cotas compatíveis com o sistema do projeto","Desvios dentro da tolerância definida pelo RT","DWG/PDF e versão publicada identificados"],"conditions":["Divergência de coordenada ou cota bloqueia a locação","Alteração do projeto exige nova revisão e versionamento"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Lei Federal 6.766/1979 e legislação municipal de parcelamento do solo","Projeto executivo, memorial e ART/RRT do responsável técnico","Licenciamento ambiental e condicionantes aplicáveis ao imóvel"],"outputs":["Coordenadas, cotas e setores conferidos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"clearing","title":"Limpeza e preparação da área","unit":"ha","materials":["máquinas de limpeza","sinalização","caçambas"],"release":"Frentes e áreas protegidas demarcadas","weight":1,"operational":{"description":"Limpeza e preparação da área executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de terraplenagem","support":"RT ambiental, operador de máquinas e sinalizador","approval":"RT ambiental quando houver manejo"},"entryConditions":["Áreas de preservação, árvores, cursos d’água e áreas sociais delimitados","Autorização de supressão/manejo e plano de destinação verificados, quando exigíveis"],"production":{"unit":"ha","method":"Medir hectares ou setores efetivamente limpos e aceitos pelo RT","formula":"área limpa = setores liberados - áreas protegidas ou pendentes","rate":"calibrar ha/dia por máquina e condição do terreno"},"materials":["máquinas de limpeza","sinalização","caçambas"],"equipment":["máquinas de limpeza","sinalização","caçambas"],"evidence":["Autorização/condicionante ambiental quando aplicável","Mapa da área liberada e registro fotográfico antes/durante/depois","Comprovante de transporte e destinação de resíduos"],"acceptance":["Nenhum marco, área protegida ou drenagem danificado","Área limpa coincide com o polígono autorizado","Resíduos separados e destinados com comprovante"],"conditions":["Achado ambiental, árvore protegida ou resíduo desconhecido bloqueia o setor","Chuva intensa ou solo instável exige replanejamento"],"notifications":["Notificar dono e RT ambiental em qualquer desvio de limite ou condicionante"],"legalBasis":["Lei Federal 6.766/1979 e legislação municipal de parcelamento do solo","Projeto executivo, memorial e ART/RRT do responsável técnico","Licenciamento ambiental e condicionantes aplicáveis ao imóvel"],"outputs":["Frentes e áreas protegidas demarcadas","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"staking","title":"Locação de eixos e lotes","unit":"ponto","materials":["piquetes","estacas","equipamento topográfico"],"release":"Eixos, offsets e lotes materializados","weight":0.9,"operational":{"description":"Locação de eixos e lotes executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Topógrafo/RT de locação","support":"Encarregado e equipe de apoio","approval":"RT de engenharia"},"entryConditions":["Levantamento conferido e projeto executivo liberado","Marcos de referência protegidos e acessíveis"],"production":{"unit":"ponto","method":"Contar pontos, eixos ou lotes materializados e conferidos","formula":"pontos aceitos = pontos materializados com coordenada e conferência","rate":"calibrar pontos/dia pela densidade do loteamento"},"materials":["piquetes","estacas","equipamento topográfico"],"equipment":["piquetes","estacas","equipamento topográfico"],"evidence":["Caderneta/arquivo de locação","Planta com pontos e offsets","Fotos dos marcos e checklist de conferência"],"acceptance":["Eixos e lotes no lugar definido pelo projeto","Identificação legível e protegida","RT registra aceite ou pendência"],"conditions":["Ponto deslocado, marco perdido ou DWG divergente bloqueia a frente"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Lei Federal 6.766/1979 e legislação municipal de parcelamento do solo","Projeto executivo, memorial e ART/RRT do responsável técnico","Licenciamento ambiental e condicionantes aplicáveis ao imóvel"],"outputs":["Eixos, offsets e lotes materializados","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"soil-tests","title":"Sondagem e ensaios iniciais","unit":"ensaio","materials":["kits de coleta","laboratório de solos"],"release":"Resultados aceitos pelo responsável técnico","weight":0.8,"operational":{"description":"Sondagem e ensaios iniciais executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Laboratório geotécnico e RT","support":"Encarregado de campo e coletor","approval":"RT de geotecnia"},"entryConditions":["Plano de amostragem e pontos definidos","Acesso seguro e material representativo disponível"],"production":{"unit":"ensaio","method":"Contar ensaios válidos por ponto/camada, não apenas amostras coletadas","formula":"ensaios aceitos = ensaios realizados - ensaios inválidos ou sem cadeia de custódia","rate":"calibrar ensaios/dia pelo laboratório"},"materials":["kits de coleta","laboratório de solos"],"equipment":["kits de coleta","laboratório de solos"],"evidence":["Plano e cadeia de custódia","Laudo laboratorial assinado","Mapa de pontos e fotos da coleta"],"acceptance":["Amostras identificadas e rastreáveis","Resultados comparados ao critério do projeto","RT registra a decisão de liberar, corrigir ou repetir"],"conditions":["Resultado fora do critério ou amostra sem rastreio bloqueia a camada/frente"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Lei Federal 6.766/1979 e legislação municipal de parcelamento do solo","Projeto executivo, memorial e ART/RRT do responsável técnico","Licenciamento ambiental e condicionantes aplicáveis ao imóvel"],"outputs":["Resultados aceitos pelo responsável técnico","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"release-design","title":"Liberação do projeto executivo","unit":"projeto","materials":["projetos assinados","ART/RRT","licenças"],"release":"Projeto e cotas formalmente liberados","weight":1.2,"operational":{"description":"Liberação do projeto executivo executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Responsável técnico do empreendimento","support":"Projetistas, jurídico, ambiental e dono","approval":"Órgão licenciador/município/concessionária aplicável"},"entryConditions":["Levantamentos, ensaios e compatibilização concluídos","Documentos de propriedade, licenças e pareceres organizados"],"production":{"unit":"projeto","method":"Contar pacotes de projeto aprovados e vigentes","formula":"pacotes liberados = pacotes aprovados - pacotes vencidos ou com ressalva impeditiva","rate":"calibrar processos/semana, respeitando prazo externo"},"materials":["projetos assinados","ART/RRT","licenças"],"equipment":["projetos assinados","ART/RRT","licenças"],"evidence":["Projetos e memoriais assinados","ART/RRT, licenças, protocolos e aprovações","Matriz de revisão e registro de pendências"],"acceptance":["Nenhuma interface crítica sem responsável","Aprovações vigentes vinculadas à versão executada","Dono e RT confirmam a liberação"],"conditions":["Ressalva impeditiva, licença vencida ou projeto incompatível bloqueia a obra"],"notifications":["Notificar o dono quando protocolo externo ultrapassar o prazo configurado"],"legalBasis":["Lei Federal 6.766/1979 e legislação municipal de parcelamento do solo","Projeto executivo, memorial e ART/RRT do responsável técnico","Licenciamento ambiental e condicionantes aplicáveis ao imóvel"],"outputs":["Projeto e cotas formalmente liberados","Registro de medição, evidência e aceite disponível para a próxima atividade"]}}]},{"key":"earthwork","title":"Abertura de ruas e terraplenagem","aliases":["earthworks"],"activities":[{"id":"road-opening","title":"Abertura dos corredores viários","unit":"m","materials":["escavadeira","pá-carregadeira","patrol"],"release":"Eixos abertos dentro da geometria aprovada","weight":1,"operational":{"description":"Abertura dos corredores viários executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de terraplenagem","support":"Topografia, operador de escavadeira, pá-carregadeira e patrol","approval":"RT de terraplenagem"},"entryConditions":["Eixos e offsets locados, áreas protegidas sinalizadas","Projeto de geometria e drenagem liberado; interferências identificadas"],"production":{"unit":"m","method":"Medir metros lineares de eixo aberto e aceito por trecho","formula":"produção = comprimento do eixo liberado - trechos fora da seção ou pendentes","rate":"metros/dia = horas produtivas × rendimento da equipe e máquina"},"materials":["escavadeira","pá-carregadeira","patrol"],"equipment":["escavadeira","pá-carregadeira","patrol"],"evidence":["Boletim diário de máquinas e trechos","Levantamento de conferência e fotos georreferenciadas","Registro de interferências e aceite do RT"],"acceptance":["Eixo, largura, greide e limites conferidos","Acesso e drenagem provisória seguros","Nenhuma ponta da rua invade o polígono de lote"],"conditions":["Interferência não cadastrada, chuva/solo instável ou desvio de geometria bloqueia o trecho"],"notifications":["Disparar alerta ao dono e RT se a produção ficar abaixo do ritmo ou houver invasão de lote"],"legalBasis":["Projeto de terraplenagem, geometria e drenagem aprovados","Licença/condicionante ambiental e autorização de movimentação de solo, quando exigível","NR-18, PGR do canteiro e destinação regular de resíduos conforme aplicável"],"outputs":["Eixos abertos dentro da geometria aprovada","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"cut-load","title":"Corte e carregamento","unit":"m³","materials":["escavadeira","pá-carregadeira","combustível"],"release":"Volume medido e origem identificada","weight":1.25,"operational":{"description":"Corte e carregamento executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de terraplenagem","support":"Operadores de escavadeira/pá-carregadeira e apontador","approval":"RT de terraplenagem"},"entryConditions":["Frente de corte e destino do material definidos","Caminhões autorizados, rota interna e controle de volume disponíveis"],"production":{"unit":"m³","method":"Medir m³ compactados ou soltos conforme o critério do projeto, sem misturar bases","formula":"volume produzido = seção medida × comprimento aceito; validar fator de empolamento com RT","rate":"m³/dia = ciclos válidos × volume médio × horas produtivas"},"materials":["escavadeira","pá-carregadeira","combustível"],"equipment":["escavadeira","pá-carregadeira","combustível"],"evidence":["Boletim de corte, carregamento e destino","Romaneios/viagens vinculados à origem","Levantamentos antes/depois e fotos"],"acceptance":["Cota e taludes conforme projeto","Volume reconciliado com viagens e medição","Material inadequado segregado e destinado"],"conditions":["Diferença entre romaneio e medição, talude inseguro ou material contaminado bloqueia o lançamento"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de terraplenagem, geometria e drenagem aprovados","Licença/condicionante ambiental e autorização de movimentação de solo, quando exigível","NR-18, PGR do canteiro e destinação regular de resíduos conforme aplicável"],"outputs":["Volume medido e origem identificada","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"internal-haul","title":"Viagens internas de caçamba","unit":"viagem interna","materials":["caminhões-caçamba","boletim de viagens"],"release":"Viagens e volumes rastreados","weight":1.2,"operational":{"description":"Viagens internas de caçamba executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de logística de obra","support":"Apontador, motoristas e encarregado de terraplenagem","approval":"RT/controle de medição"},"entryConditions":["Origem, destino e rota interna definidos","Caçambas identificadas e carga/volume de referência calibrados"],"production":{"unit":"viagem interna","method":"Contar viagens internas válidas e associar volume estimado por caçamba","formula":"m³ transportados = viagens aceitas × capacidade média calibrada × fator de carga","rate":"viagens/dia = ciclos completos sem rejeição"},"materials":["caminhões-caçamba","boletim de viagens"],"equipment":["caminhões-caçamba","boletim de viagens"],"evidence":["Boletim de viagens/romaneios","Registro de origem/destino e fotos de descarga","Conciliação com medição de corte/aterro"],"acceptance":["Toda viagem possui origem, destino e responsável","Volume não é duplicado no diário","Rota não interfere em lotes, drenagens ou segurança"],"conditions":["Viagem sem rastreio, carga incompatível ou rota interditada bloqueia a apropriação"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de terraplenagem, geometria e drenagem aprovados","Licença/condicionante ambiental e autorização de movimentação de solo, quando exigível","NR-18, PGR do canteiro e destinação regular de resíduos conforme aplicável"],"outputs":["Viagens e volumes rastreados","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"spread-moisture","title":"Espalhamento e umidificação","unit":"m³","materials":["patrol","caminhão-pipa","água"],"release":"Camada e umidade prontas para compactar","weight":1,"operational":{"description":"Espalhamento e umidificação executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de terraplenagem","support":"Operador de patrol, caminhão-pipa e controle tecnológico","approval":"RT de terraplenagem"},"entryConditions":["Material aprovado e camada/espessura definidas","Base drenada e equipamento de espalhamento disponível"],"production":{"unit":"m³","method":"Medir m³ ou m² de camada espalhada, umidificada e aprovada","formula":"camada pronta = área aceita × espessura medida; não contar trecho apenas molhado","rate":"m³/dia = área preparada × espessura × ciclos produtivos"},"materials":["patrol","caminhão-pipa","água"],"equipment":["patrol","caminhão-pipa","água"],"evidence":["Boletim de umidificação e consumo de água","Controle de espessura/cotas","Fotos da camada antes da compactação"],"acceptance":["Espessura e greide conferidos","Umidade homogênea dentro do critério do ensaio","Sem poças, segregação ou material orgânico"],"conditions":["Chuva, falta de água, segregação ou umidade fora do critério bloqueia a compactação"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de terraplenagem, geometria e drenagem aprovados","Licença/condicionante ambiental e autorização de movimentação de solo, quando exigível","NR-18, PGR do canteiro e destinação regular de resíduos conforme aplicável"],"outputs":["Camada e umidade prontas para compactar","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"compaction","title":"Compactação por camada","unit":"m³","materials":["rolo compactador","laboratório de solos"],"release":"Ensaio de compactação aceito","weight":1.25,"operational":{"description":"Compactação por camada executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de terraplenagem e controle tecnológico","support":"Operador de rolo, laboratório e topografia","approval":"RT de geotecnia/terraplenagem"},"entryConditions":["Camada espalhada com espessura e umidade conferidas","Rolo, passadas de referência e ensaio definidos"],"production":{"unit":"m³","method":"Medir m³ de camada compactada e aceita com ensaio vinculado","formula":"produção válida = volume da camada × percentual de ensaios aceitos","rate":"m³/dia = área aceita × espessura compactada"},"materials":["rolo compactador","laboratório de solos"],"equipment":["rolo compactador","laboratório de solos"],"evidence":["Laudos de densidade/compactação","Mapa de ensaios por camada","Boletim do rolo e fotos"],"acceptance":["Grau de compactação e umidade atendem ao projeto","Cotas, inclinações e espessura finais conferidas","Trechos reprovados possuem correção registrada"],"conditions":["Ensaio reprovado, camada molhada ou ausência de rastreabilidade bloqueia o avanço"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de terraplenagem, geometria e drenagem aprovados","Licença/condicionante ambiental e autorização de movimentação de solo, quando exigível","NR-18, PGR do canteiro e destinação regular de resíduos conforme aplicável"],"outputs":["Ensaio de compactação aceito","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"subgrade","title":"Regularização do subleito","unit":"m²","materials":["motoniveladora","rolo","apoio topográfico"],"release":"Greide, inclinações e subleito liberados","weight":1.1,"operational":{"description":"Regularização do subleito executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de terraplenagem","support":"Patrol, rolo, topografia e controle tecnológico","approval":"RT de pavimentação/terraplenagem"},"entryConditions":["Camadas inferiores aceitas e drenagem provisória funcionando","Seção-tipo, greide e caimentos disponíveis"],"production":{"unit":"m²","method":"Medir m² de subleito regularizado e aceito por trecho","formula":"m² aceitos = área dentro da seção - áreas com correção pendente","rate":"m²/dia = faixa liberada × comprimento produtivo"},"materials":["motoniveladora","rolo","apoio topográfico"],"equipment":["motoniveladora","rolo","apoio topográfico"],"evidence":["Levantamento de cotas e seção","Ensaios/controle tecnológico","Fotos e checklist de liberação"],"acceptance":["Greide, inclinação e largura conforme projeto","Sem pontos moles ou erosão ativa","Aceite formal para receber a base"],"conditions":["Drenagem insuficiente, solo mole ou cota divergente bloqueia a base"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de terraplenagem, geometria e drenagem aprovados","Licença/condicionante ambiental e autorização de movimentação de solo, quando exigível","NR-18, PGR do canteiro e destinação regular de resíduos conforme aplicável"],"outputs":["Greide, inclinações e subleito liberados","Registro de medição, evidência e aceite disponível para a próxima atividade"]}}]},{"key":"drainage","title":"Drenagem pluvial","aliases":["drainage"],"activities":[{"id":"drain-layout","title":"Locação e abertura de valas","unit":"m","materials":["escavadeira","escoramento","topografia"],"release":"Cota de fundo e interferências conferidas","weight":1,"operational":{"description":"Locação e abertura de valas executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de drenagem","support":"Topografia, escavadeira e sinalização","approval":"RT de drenagem"},"entryConditions":["Projeto de drenagem compatibilizado com redes e lotes","Interferências e cotas de jusante conferidas"],"production":{"unit":"m","method":"Medir metros lineares de vala aberta e liberada para berço","formula":"produção = comprimento com cota de fundo conferida e escavação segura","rate":"m/dia = comprimento aberto por equipe com frente segura"},"materials":["escavadeira","escoramento","topografia"],"equipment":["escavadeira","escoramento","topografia"],"evidence":["Caderneta topográfica e cotas de fundo","Checklist de escavação/escoramento","Fotos e registro de interferências"],"acceptance":["Eixo, cota, largura e taludes compatíveis","Interferências tratadas e vala segura","Berço pode ser executado sem retrabalho"],"conditions":["Água na vala, interferência desconhecida ou escoramento ausente bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto hidrológico e de drenagem aprovado pelo responsável técnico","Licença ambiental e autorizações para interferência em recursos hídricos, quando aplicáveis","NR-18 e controle de escavações, escoramentos e sinalização"],"outputs":["Cota de fundo e interferências conferidas","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"bedding","title":"Berço e regularização de fundo","unit":"m","materials":["brita","areia","concreto magro"],"release":"Berço inspecionado antes do assentamento","weight":0.8,"operational":{"description":"Berço e regularização de fundo executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de drenagem","support":"Equipe de apoio, topografia e fornecedor de agregados","approval":"RT de drenagem"},"entryConditions":["Vala limpa, estável e com cota liberada","Brita/areia/concreto magro rastreados e disponíveis"],"production":{"unit":"m","method":"Medir metros lineares de berço executado e aceito","formula":"m aceitos = comprimento com espessura, cota e apoio contínuos","rate":"m/dia = trechos de berço aceitos por equipe"},"materials":["brita","areia","concreto magro"],"equipment":["brita","areia","concreto magro"],"evidence":["Nota/romaneio do agregado ou concreto","Fotos do fundo e do berço","Conferência de espessura e cotas"],"acceptance":["Apoio contínuo, sem pontos ocos","Caimento e cota dentro do projeto","Trecho pronto para assentamento"],"conditions":["Fundo saturado, espessura irregular ou material sem rastreio bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto hidrológico e de drenagem aprovado pelo responsável técnico","Licença ambiental e autorizações para interferência em recursos hídricos, quando aplicáveis","NR-18 e controle de escavações, escoramentos e sinalização"],"outputs":["Berço inspecionado antes do assentamento","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"pipes","title":"Assentamento de tubos e manilhas","unit":"m","materials":["manilhas Ø600/800/1000","juntas","equipamento de içamento"],"release":"Alinhamento, juntas e declividade aceitos","weight":1.35,"operational":{"description":"Assentamento de tubos e manilhas executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de drenagem","support":"Equipe de assentamento, içamento e topografia","approval":"RT de drenagem"},"entryConditions":["Berço aceito e tubos/manilhas conferidos","Plano de içamento, juntas e sequência de montagem definidos"],"production":{"unit":"m","method":"Medir metros lineares de tubo/manilha assentados e aceitos","formula":"m aceitos = comprimento instalado com junta, alinhamento e declividade conferidos","rate":"m/dia = peças assentadas × comprimento útil"},"materials":["manilhas Ø600/800/1000","juntas","equipamento de içamento"],"equipment":["manilhas Ø600/800/1000","juntas","equipamento de içamento"],"evidence":["Romaneio/lote do fabricante","Checklist de juntas e cotas","Fotos internas, juntas e trecho concluído"],"acceptance":["Diâmetro e material conforme projeto","Declividade, alinhamento e juntas aprovados","Interior limpo e sem peça danificada"],"conditions":["Junta aberta, peça trincada, cota divergente ou água impedindo inspeção bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto hidrológico e de drenagem aprovado pelo responsável técnico","Licença ambiental e autorizações para interferência em recursos hídricos, quando aplicáveis","NR-18 e controle de escavações, escoramentos e sinalização"],"outputs":["Alinhamento, juntas e declividade aceitos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"drain-boxes","title":"Caixas, PVs e bocas de lobo","unit":"un","materials":["blocos","cimento","aço","grelhas"],"release":"Cotas de entrada e saída conferidas","weight":1.1,"operational":{"description":"Caixas, PVs e bocas de lobo executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de drenagem","support":"Pedreiro, armador, formas e topografia","approval":"RT de drenagem"},"entryConditions":["Tubulação e cotas de conexão conferidas","Detalhe estrutural, aço, formas e grelhas disponíveis"],"production":{"unit":"un","method":"Contar unidades construídas, conectadas e aceitas","formula":"un aceitas = caixas/PVs com cota, conexão, tampa e inspeção concluídas","rate":"un/dia = unidades liberadas por equipe"},"materials":["blocos","cimento","aço","grelhas"],"equipment":["blocos","cimento","aço","grelhas"],"evidence":["Romaneios de blocos, aço, grelhas e concreto","Fotos de armadura, conexões e acabamento","Ficha de cota e coordenada"],"acceptance":["Entrada/saída e fundo nas cotas","Tampa/grelha nivelada, segura e acessível","Conexões sem obstrução"],"conditions":["Caixa sem cota, grelha insegura ou conexão obstruída bloqueia o trecho"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto hidrológico e de drenagem aprovado pelo responsável técnico","Licença ambiental e autorizações para interferência em recursos hídricos, quando aplicáveis","NR-18 e controle de escavações, escoramentos e sinalização"],"outputs":["Cotas de entrada e saída conferidas","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"backfill","title":"Reaterro e compactação localizada","unit":"m³","materials":["solo selecionado","compactador de placa"],"release":"Trecho fechado com controle por camada","weight":1,"operational":{"description":"Reaterro e compactação localizada executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de drenagem","support":"Equipe de reaterro, compactador e controle tecnológico","approval":"RT de drenagem/terraplenagem"},"entryConditions":["Tubulação/caixas inspecionadas e fotografadas","Material selecionado e camadas de compactação definidos"],"production":{"unit":"m³","method":"Medir m³ de reaterro compactado e aceito","formula":"m³ aceitos = volume geométrico reaterrado com camadas e ensaios liberados","rate":"m³/dia = volume por camada × ciclos de compactação"},"materials":["solo selecionado","compactador de placa"],"equipment":["solo selecionado","compactador de placa"],"evidence":["Comprovante de origem do solo selecionado","Boletim de camadas/ensaios","Fotos antes do fechamento e superfície final"],"acceptance":["Tubulação não deslocada ou danificada","Camadas e compactação dentro do critério","Superfície recomposta sem abatimento"],"conditions":["Material inadequado, recalque ou dano à rede bloqueia o fechamento"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto hidrológico e de drenagem aprovado pelo responsável técnico","Licença ambiental e autorizações para interferência em recursos hídricos, quando aplicáveis","NR-18 e controle de escavações, escoramentos e sinalização"],"outputs":["Trecho fechado com controle por camada","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"drain-test","title":"Inspeção e teste de vazão","unit":"trecho","materials":["equipamento de inspeção","água de teste"],"release":"Vazão, cotas e as-built aprovados","weight":0.75,"operational":{"description":"Inspeção e teste de vazão executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT de drenagem","support":"Encarregado, equipe de inspeção e topografia","approval":"Dono/órgão responsável quando aplicável"},"entryConditions":["Trecho fechado, caixas acessíveis e as-built preliminar disponível","Equipamento e água de teste autorizados"],"production":{"unit":"trecho","method":"Contar trechos/setores testados e aprovados","formula":"setores aceitos = testes aprovados - testes com pendência aberta","rate":"trechos/dia = testes completos com relatório"},"materials":["equipamento de inspeção","água de teste"],"equipment":["equipamento de inspeção","água de teste"],"evidence":["Relatório de teste e vazão","Vídeo/fotos da inspeção","As-built com cotas e coordenadas"],"acceptance":["Vazão e continuidade sem obstrução","Cotas compatíveis e sem vazamento impeditivo","RT assina o aceite"],"conditions":["Obstrução, vazão insuficiente ou as-built divergente bloqueia a liberação"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto hidrológico e de drenagem aprovado pelo responsável técnico","Licença ambiental e autorizações para interferência em recursos hídricos, quando aplicáveis","NR-18 e controle de escavações, escoramentos e sinalização"],"outputs":["Vazão, cotas e as-built aprovados","Registro de medição, evidência e aceite disponível para a próxima atividade"]}}]},{"key":"water","title":"Rede de água — 298 lotes","aliases":["water"],"activities":[{"id":"water-trench","title":"Valas e envoltória da rede","unit":"m","materials":["escavadeira","areia de envoltória","fita de advertência"],"release":"Vala e separação sanitária aceitas","weight":0.9,"operational":{"description":"Valas e envoltória da rede executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de rede de água","support":"Equipe de vala, topografia e segurança","approval":"RT/supervisão da rede de água"},"entryConditions":["Projeto hidráulico, faixa da rede e separação sanitária definidos","Interferências e profundidade de recobrimento conferidas"],"production":{"unit":"m","method":"Medir metros lineares de vala com envoltória e cota aceitas","formula":"m aceitos = vala pronta com recobrimento/afastamento conferidos","rate":"m/dia = comprimento de vala segura e liberada"},"materials":["escavadeira","areia de envoltória","fita de advertência"],"equipment":["escavadeira","areia de envoltória","fita de advertência"],"evidence":["Cotas, seção e fotos da vala","Romaneio da areia/envoltória","Checklist de separação sanitária"],"acceptance":["Profundidade, recobrimento e afastamentos atendidos","Fundo estável e envoltória contínua","Sem risco de dano às redes vizinhas"],"conditions":["Interferência, água na vala ou separação insuficiente bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de abastecimento e padrão da autoridade/operadora local","Licença ambiental e autorização de uso de água, quando aplicáveis","ART/RRT, rastreabilidade de materiais e ensaios de estanqueidade/potabilidade"],"outputs":["Vala e separação sanitária aceitas","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"pead-main","title":"Rede principal PEAD","unit":"m","materials":["tubos PEAD","conexões","máquina de termofusão"],"release":"Soldas rastreadas e trecho montado","weight":1.3,"operational":{"description":"Rede principal PEAD executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado hidráulico habilitado","support":"Operador da termofusora, equipe de assentamento e RT","approval":"RT/operadora de água quando aplicável"},"entryConditions":["Tubos PEAD, conexões e parâmetros de termofusão conferidos","Vala/berço liberados e plano de setorização disponível"],"production":{"unit":"m","method":"Medir metros lineares de rede PEAD com soldas rastreadas","formula":"m aceitos = comprimento instalado - juntas reprovadas ou trecho sem registro","rate":"m/dia = comprimento de tubo instalado e inspecionado"},"materials":["tubos PEAD","conexões","máquina de termofusão"],"equipment":["tubos PEAD","conexões","máquina de termofusão"],"evidence":["Certificados/romaneios dos tubos e conexões","Ficha de termofusão por junta","Fotos de juntas e trecho"],"acceptance":["Material e diâmetro conforme projeto","Juntas íntegras e rastreáveis","Rede sem dobra, contaminação ou dano"],"conditions":["Junta sem ficha, parâmetro fora do fabricante ou material divergente bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de abastecimento e padrão da autoridade/operadora local","Licença ambiental e autorização de uso de água, quando aplicáveis","ART/RRT, rastreabilidade de materiais e ensaios de estanqueidade/potabilidade"],"outputs":["Soldas rastreadas e trecho montado","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"valves","title":"Registros, válvulas e caixas","unit":"un","materials":["registros","válvulas","ventosas","caixas"],"release":"Setorização e acessibilidade conferidas","weight":0.9,"operational":{"description":"Registros, válvulas e caixas executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado hidráulico","support":"Montador, pedreiro e topografia","approval":"RT/operadora de água"},"entryConditions":["Rede principal e setorização definidas","Registros, válvulas, ventosas e caixas conferidos"],"production":{"unit":"un","method":"Contar unidades instaladas, acessíveis e operacionais","formula":"un aceitas = componentes instalados + caixa/tampa + identificação + teste","rate":"un/dia = unidades completas por equipe"},"materials":["registros","válvulas","ventosas","caixas"],"equipment":["registros","válvulas","ventosas","caixas"],"evidence":["Romaneio e certificados dos componentes","Fotos de montagem e tampa","Mapa de setorização e teste de operação"],"acceptance":["Componente no sentido e cota corretos","Acesso seguro e tampa nivelada","Identificação compatível com o as-built"],"conditions":["Válvula inacessível, sem identificação ou sem teste bloqueia o setor"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de abastecimento e padrão da autoridade/operadora local","Licença ambiental e autorização de uso de água, quando aplicáveis","ART/RRT, rastreabilidade de materiais e ensaios de estanqueidade/potabilidade"],"outputs":["Setorização e acessibilidade conferidas","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"branches","title":"Ramais dos 298 lotes","unit":"ramal/lote","materials":["tubos de ramal","conexões","kits de ligação"],"release":"298 ramais identificados por lote","weight":1.2,"operational":{"description":"Ramais dos 298 lotes executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado da rede de água","support":"Equipe de ramais, cadastro de lotes e RT","approval":"RT/operadora de água"},"entryConditions":["Cadastro dos 298 lotes e pontos de entrega conferidos","Rede principal testada no trecho e kits de ligação disponíveis"],"production":{"unit":"ramal/lote","method":"Contar ramais completos e identificados por lote","formula":"ramais aceitos = ramais instalados com teste e cadastro / 298 lotes","rate":"ramais/dia = ligações completas por equipe"},"materials":["tubos de ramal","conexões","kits de ligação"],"equipment":["tubos de ramal","conexões","kits de ligação"],"evidence":["Mapa dos 298 lotes e planilha de rastreio","Romaneios de tubos/conexões/kits","Fotos e fichas de teste por ramal"],"acceptance":["Ponto correto do lote e sem invasão de faixa","Ramal protegido, estanque e identificado","Cadastro atualizado e conferido"],"conditions":["Lote sem cadastro, ramal sem teste ou conexão incompatível bloqueia a entrega"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de abastecimento e padrão da autoridade/operadora local","Licença ambiental e autorização de uso de água, quando aplicáveis","ART/RRT, rastreabilidade de materiais e ensaios de estanqueidade/potabilidade"],"outputs":["298 ramais identificados por lote","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"meters","title":"Cavaletes e esperas","unit":"cavalete/lote","materials":["298 cavaletes","hidrômetros/esperas","conexões"],"release":"Cavaletes instalados e protegidos","weight":1,"operational":{"description":"Cavaletes e esperas executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado hidráulico","support":"Equipe de cavaletes, cadastro e fiscalização","approval":"RT/operadora de água"},"entryConditions":["Ramais aceitos e padrão de ligação definido","Cavaletes/esperas e caixas de proteção disponíveis"],"production":{"unit":"cavalete/lote","method":"Contar cavaletes/esperas instalados e aceitos por lote","formula":"cavaletes aceitos = unidades com proteção, identificação e teste / 298","rate":"un/dia = pontos completos por equipe"},"materials":["298 cavaletes","hidrômetros/esperas","conexões"],"equipment":["298 cavaletes","hidrômetros/esperas","conexões"],"evidence":["Romaneio dos 298 cavaletes/esperas","Ficha por lote e fotos","Checklist de padrão e teste"],"acceptance":["Alinhamento, proteção e acesso atendidos","Identificação não ambígua","Cadastro do lote atualizado"],"conditions":["Ponto fora do padrão, sem proteção ou sem identificação bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de abastecimento e padrão da autoridade/operadora local","Licença ambiental e autorização de uso de água, quando aplicáveis","ART/RRT, rastreabilidade de materiais e ensaios de estanqueidade/potabilidade"],"outputs":["Cavaletes instalados e protegidos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"pressure-test","title":"Teste, lavagem e desinfecção","unit":"setor","materials":["bomba de teste","água","desinfetante aprovado"],"release":"Teste de pressão e potabilidade aceitos","weight":0.95,"operational":{"description":"Teste, lavagem e desinfecção executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT da rede de água","support":"Encarregado, equipe de teste e laboratório","approval":"Operadora/autoridade de água quando aplicável"},"entryConditions":["Setor fechado, componentes instalados e extremidades controladas","Plano de pressão, lavagem e desinfecção aprovado"],"production":{"unit":"setor","method":"Contar setores ensaiados, lavados e aprovados","formula":"setores aceitos = testes aprovados + laudo de lavagem/desinfecção","rate":"setores/dia = ciclos completos com registro"},"materials":["bomba de teste","água","desinfetante aprovado"],"equipment":["bomba de teste","água","desinfetante aprovado"],"evidence":["Certificado de calibração dos instrumentos","Relatório de pressão, lavagem e desinfecção","Laudos de qualidade/potabilidade quando exigidos"],"acceptance":["Pressão mantida no critério","Sem vazamento ou contaminação impeditiva","Laudo e as-built do setor assinados"],"conditions":["Queda de pressão, vazamento ou laudo pendente bloqueia a conexão"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de abastecimento e padrão da autoridade/operadora local","Licença ambiental e autorização de uso de água, quando aplicáveis","ART/RRT, rastreabilidade de materiais e ensaios de estanqueidade/potabilidade"],"outputs":["Teste de pressão e potabilidade aceitos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}}]},{"key":"curbs","title":"Meio-fio, base e acessibilidade","aliases":["curbs-accessibility"],"activities":[{"id":"curb-layout","title":"Locação, linha e cota","unit":"m","materials":["topografia","linha","gabaritos"],"release":"Geometria e raios conferidos","weight":0.8,"operational":{"description":"Locação, linha e cota executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de meio-fio","support":"Topografia, gabaritos e equipe de sinalização","approval":"RT viário"},"entryConditions":["Subleito/base e drenagem liberados","Linha, raio, cotas e pontos de acessibilidade definidos"],"production":{"unit":"m","method":"Medir metros lineares locados e aceitos para execução","formula":"m aceitos = linha/raio conferidos sem invasão dos lotes","rate":"m/dia = comprimento de locação concluída"},"materials":["topografia","linha","gabaritos"],"equipment":["topografia","linha","gabaritos"],"evidence":["Caderneta de locação e fotos","Planta de raios/rebaixamentos","Checklist de interferências"],"acceptance":["Linha, raio e cota conforme projeto","Sem invasão ou estrangulamento de lote","Rebaixamentos identificados"],"conditions":["Desvio geométrico ou interferência não tratada bloqueia o assentamento"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto viário, drenagem superficial e acessibilidade aprovados","Normas de acessibilidade e legislação municipal aplicáveis","NR-18, sinalização de frente e controle de circulação"],"outputs":["Geometria e raios conferidos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"curb-base","title":"Preparação da base","unit":"m","materials":["brita","areia","compactador"],"release":"Base contínua e compactada","weight":0.9,"operational":{"description":"Preparação da base executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de meio-fio","support":"Equipe de base, compactador e controle tecnológico","approval":"RT viário"},"entryConditions":["Locação aprovada e subleito estável","Brita/areia/concreto e compactador disponíveis"],"production":{"unit":"m","method":"Medir metros lineares de base contínua e compactada","formula":"m aceitos = faixa com espessura/cota verificadas e sem pontos moles","rate":"m/dia = comprimento de base liberada"},"materials":["brita","areia","compactador"],"equipment":["brita","areia","compactador"],"evidence":["Romaneios de agregados","Boletim de compactação","Fotos e cotas da base"],"acceptance":["Base contínua, compactada e na cota","Sem material orgânico ou erosão","Apoio uniforme para o meio-fio"],"conditions":["Base desagregada, fora de cota ou sem controle bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto viário, drenagem superficial e acessibilidade aprovados","Normas de acessibilidade e legislação municipal aplicáveis","NR-18, sinalização de frente e controle de circulação"],"outputs":["Base contínua e compactada","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"curb-install","title":"Assentamento de meio-fio","unit":"m","materials":["meios-fios","argamassa","concreto"],"release":"Alinhamento sem invasão dos lotes","weight":1.25,"operational":{"description":"Assentamento de meio-fio executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de meio-fio","support":"Equipe de assentamento, pedreiro e topografia","approval":"RT viário"},"entryConditions":["Base e locação aceitas","Peças, argamassa/concreto e ferramentas conferidos"],"production":{"unit":"m","method":"Medir metros lineares de meio-fio alinhado e aceito","formula":"m aceitos = comprimento instalado sem ponta invadindo lote e com juntas/travamento concluídos","rate":"m/dia = comprimento assentado e conferido"},"materials":["meios-fios","argamassa","concreto"],"equipment":["meios-fios","argamassa","concreto"],"evidence":["Romaneio das peças","Fotos de linha, juntas e arremates","Levantamento de alinhamento e cotas"],"acceptance":["Alinhamento, raio e cota uniformes","Juntas e travamento executados","Margem do lote preservada e sem pontas"],"conditions":["Peça quebrada, ponta invadindo lote ou cota divergente bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto viário, drenagem superficial e acessibilidade aprovados","Normas de acessibilidade e legislação municipal aplicáveis","NR-18, sinalização de frente e controle de circulação"],"outputs":["Alinhamento sem invasão dos lotes","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"gutters","title":"Sarjetas e entradas hidráulicas","unit":"m","materials":["concreto","formas","agregados"],"release":"Drenagem superficial funcional","weight":1,"operational":{"description":"Sarjetas e entradas hidráulicas executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de pavimentação/drenagem","support":"Equipe de concreto, formas e topografia","approval":"RT viário/drenagem"},"entryConditions":["Meio-fio aceito e pontos de descarga definidos","Formas, concreto e acabamento disponíveis"],"production":{"unit":"m","method":"Medir metros lineares de sarjeta funcional e aceita","formula":"m aceitos = comprimento com seção, caimento e descarga funcionando","rate":"m/dia = sarjeta acabada e testada"},"materials":["concreto","formas","agregados"],"equipment":["concreto","formas","agregados"],"evidence":["Nota/romaneio do concreto","Fotos de seção, caimento e cura","Registro de teste de escoamento"],"acceptance":["Seção e caimento conforme projeto","Sem poças ou descontinuidade","Conexão com drenagem desobstruída"],"conditions":["Caimento invertido, concreto sem cura ou descarga obstruída bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto viário, drenagem superficial e acessibilidade aprovados","Normas de acessibilidade e legislação municipal aplicáveis","NR-18, sinalização de frente e controle de circulação"],"outputs":["Drenagem superficial funcional","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"accessibility","title":"Rampas e acessibilidade","unit":"un","materials":["piso tátil","concreto","sinalização"],"release":"Checklist de acessibilidade aceito","weight":0.85,"operational":{"description":"Rampas e acessibilidade executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT de acessibilidade/obra","support":"Encarregado, equipe de concreto e sinalização","approval":"Fiscalização municipal quando aplicável"},"entryConditions":["Projeto de acessibilidade compatibilizado com meio-fio e calçadas","Rotas, rampas, piso tátil e sinalização definidos"],"production":{"unit":"un","method":"Contar unidades/pontos de acessibilidade completos e aceitos","formula":"pontos aceitos = rampas e travessias sem descontinuidade + checklist aprovado","rate":"un/dia = pontos completos por equipe"},"materials":["piso tátil","concreto","sinalização"],"equipment":["piso tátil","concreto","sinalização"],"evidence":["Checklist e medições de inclinação/largura","Fotos antes/depois","Registro de vistoria"],"acceptance":["Rota contínua, sinalizada e sem obstáculos","Inclinações e dimensões conforme projeto/norma aplicável","Ponto identificado no mapa"],"conditions":["Obstáculo, inclinação fora do critério ou piso incompleto bloqueia a liberação"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto viário, drenagem superficial e acessibilidade aprovados","Normas de acessibilidade e legislação municipal aplicáveis","NR-18, sinalização de frente e controle de circulação"],"outputs":["Checklist de acessibilidade aceito","Registro de medição, evidência e aceite disponível para a próxima atividade"]}}]},{"key":"paving","title":"Pavimentação em paralelepípedos","aliases":["paving"],"activities":[{"id":"paving-base","title":"Regularização e base granular","unit":"m²","materials":["brita graduada","água","rolo"],"release":"Base ensaiada e liberada","weight":1.15,"operational":{"description":"Regularização e base granular executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de pavimentação","support":"Patrol, rolo, laboratório e topografia","approval":"RT de pavimentação"},"entryConditions":["Subleito, drenagem e meio-fio aceitos","Agregado, água, seção-tipo e ensaios definidos"],"production":{"unit":"m²","method":"Medir m² de base granular compactada e aceita","formula":"m² aceitos = área com espessura, densidade, cota e caimento aprovados","rate":"m²/dia = faixa aceita por camada"},"materials":["brita graduada","água","rolo"],"equipment":["brita graduada","água","rolo"],"evidence":["Romaneios e origem do agregado","Ensaios de granulometria/compactação quando previstos","Levantamento e fotos da base"],"acceptance":["Espessura e compactação atendem ao projeto","Caimentos levam água à drenagem","Sem segregação ou pontos moles"],"conditions":["Ensaio reprovado, base molhada ou meio-fio desalinhado bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de pavimentação, seção-tipo e especificação de materiais aprovados","Controle tecnológico e aceite do responsável técnico","NR-18, sinalização de tráfego e destinação regular de resíduos"],"outputs":["Base ensaiada e liberada","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"sand-bed","title":"Colchão de assentamento","unit":"m²","materials":["areia/pó de pedra","guias de nível"],"release":"Espessura e perfil conferidos","weight":0.9,"operational":{"description":"Colchão de assentamento executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de pavimentação","support":"Equipe de guias e topografia","approval":"RT de pavimentação"},"entryConditions":["Base granular e meio-fio aceitos","Areia/pó de pedra limpos e guias de nível disponíveis"],"production":{"unit":"m²","method":"Medir m² de colchão na espessura e perfil aceitos","formula":"m² aceitos = área preparada com espessura uniforme e sem tráfego indevido","rate":"m²/dia = área de colchão imediatamente pavimentável"},"materials":["areia/pó de pedra","guias de nível"],"equipment":["areia/pó de pedra","guias de nível"],"evidence":["Romaneio do material","Medição de espessura e perfil","Fotos antes do assentamento"],"acceptance":["Espessura uniforme","Perfil e caimento corretos","Sem contaminação, chuva ou deformação"],"conditions":["Colchão encharcado, fora de espessura ou exposto sem proteção bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de pavimentação, seção-tipo e especificação de materiais aprovados","Controle tecnológico e aceite do responsável técnico","NR-18, sinalização de tráfego e destinação regular de resíduos"],"outputs":["Espessura e perfil conferidos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"stone-logistics","title":"Recebimento de paralelepípedos","unit":"caminhão de 5.000 pedras","materials":["paralelepípedos","romaneios","área de descarga"],"release":"Quantidade, perda e lote de origem registrados","weight":0.8,"operational":{"description":"Recebimento de paralelepípedos executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de suprimentos/pavimentação","support":"Apontador, motorista e equipe de descarga","approval":"RT/controle de recebimento"},"entryConditions":["Trechos liberados e área de descarga definida","Fornecedor, romaneio e unidade de consumo calibrados"],"production":{"unit":"caminhão de 5.000 pedras","method":"Contar caminhões e pedras aceitas, convertendo para m² úteis","formula":"m² úteis = pedras recebidas × (1 - perda confirmada) ÷ consumo real de pedras/m²","rate":"caminhões/dia = entregas conferidas e alocadas"},"materials":["paralelepípedos","romaneios","área de descarga"],"equipment":["paralelepípedos","romaneios","área de descarga"],"evidence":["Romaneio e nota fiscal","Fotos do lote/descarga","Registro de perdas e conciliação com área pavimentada"],"acceptance":["Quantidade e qualidade conferidas","Perda registrada e justificada","Material associado ao trecho e à compra"],"conditions":["Material divergente, quebra anormal ou descarga em área insegura bloqueia o uso"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de pavimentação, seção-tipo e especificação de materiais aprovados","Controle tecnológico e aceite do responsável técnico","NR-18, sinalização de tráfego e destinação regular de resíduos"],"outputs":["Quantidade, perda e lote de origem registrados","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"stone-setting","title":"Assentamento de paralelepípedos","unit":"m²","materials":["45 pedras/m²","linha de paginação","equipe de calceteiros"],"release":"Paginação, juntas e arremates aceitos","weight":1.35,"operational":{"description":"Assentamento de paralelepípedos executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de calcetaria","support":"Equipe de calceteiros, guias e topografia","approval":"RT de pavimentação"},"entryConditions":["Base e colchão aceitos; pedras conferidas","Paginação, alinhamento, juntas e arremates definidos"],"production":{"unit":"m²","method":"Medir m² de paralelepípedo assentado e aceito","formula":"m² aceitos = área entre meios-fios com paginação, juntas e caimento conferidos","rate":"m²/dia = equipe de calceteiros × rendimento calibrado"},"materials":["45 pedras/m²","linha de paginação","equipe de calceteiros"],"equipment":["45 pedras/m²","linha de paginação","equipe de calceteiros"],"evidence":["Boletim de equipe e produção","Fotos de paginação, bordas e encontros","Medição por trecho com perdas"],"acceptance":["Peças estáveis, sem juntas excessivas ou vazios","Caimento para sarjeta e drenagem","Margens contidas entre meios-fios, sem invasão dos lotes"],"conditions":["Colchão deslocado, ponta solta, junta irregular ou drenagem obstruída bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de pavimentação, seção-tipo e especificação de materiais aprovados","Controle tecnológico e aceite do responsável técnico","NR-18, sinalização de tráfego e destinação regular de resíduos"],"outputs":["Paginação, juntas e arremates aceitos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"grout-compact","title":"Rejuntamento e compactação","unit":"m²","materials":["areia/pó de pedra","placa vibratória","rolo"],"release":"Superfície estabilizada e drenante","weight":1.05,"operational":{"description":"Rejuntamento e compactação executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de calcetaria","support":"Equipe de rejunte, placa vibratória/rolo e limpeza","approval":"RT de pavimentação"},"entryConditions":["Assentamento inspecionado e área sem peças soltas","Material de rejunte e equipamento de compactação disponíveis"],"production":{"unit":"m²","method":"Medir m² rejuntado, compactado e aceito","formula":"m² aceitos = área com juntas preenchidas + superfície estável + caimento mantido","rate":"m²/dia = área compactada sem retrabalho"},"materials":["areia/pó de pedra","placa vibratória","rolo"],"equipment":["areia/pó de pedra","placa vibratória","rolo"],"evidence":["Romaneio do rejunte","Boletim de passadas/equipamento","Fotos da superfície final"],"acceptance":["Juntas preenchidas e peças estáveis","Sem ondulação ou deslocamento","Drenagem superficial preservada"],"conditions":["Peça deslocada, junta aberta ou água acumulada bloqueia a liberação"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de pavimentação, seção-tipo e especificação de materiais aprovados","Controle tecnológico e aceite do responsável técnico","NR-18, sinalização de tráfego e destinação regular de resíduos"],"outputs":["Superfície estabilizada e drenante","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"paving-release","title":"Limpeza e liberação ao tráfego","unit":"trecho","materials":["sinalização temporária","equipamento de limpeza"],"release":"Trecho vistoriado e liberado","weight":0.75,"operational":{"description":"Limpeza e liberação ao tráfego executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT de pavimentação","support":"Encarregado, sinalização e fiscalização de tráfego","approval":"Dono/município quando aplicável"},"entryConditions":["Trecho rejuntado, compactado e sem pendências críticas","Sinalização temporária e plano de abertura disponíveis"],"production":{"unit":"trecho","method":"Contar trechos vistoriados e liberados ao tráfego","formula":"trechos aceitos = inspeções sem pendência impeditiva e sinalização instalada","rate":"trechos/dia = inspeções completas"},"materials":["sinalização temporária","equipamento de limpeza"],"equipment":["sinalização temporária","equipamento de limpeza"],"evidence":["Checklist de liberação","Fotos do trecho e sinalização","Termo/registro de vistoria"],"acceptance":["Superfície segura e estável","Drenagem e acessibilidade preservadas","Liberação formal registrada"],"conditions":["Defeito de superfície, drenagem obstruída ou sinalização ausente bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto de pavimentação, seção-tipo e especificação de materiais aprovados","Controle tecnológico e aceite do responsável técnico","NR-18, sinalização de tráfego e destinação regular de resíduos"],"outputs":["Trecho vistoriado e liberado","Registro de medição, evidência e aceite disponível para a próxima atividade"]}}]},{"key":"electrical","title":"Rede elétrica e ligação Coelba","aliases":["electrical-base","electrical-connection"],"activities":[{"id":"electrical-approval","title":"Projeto e aprovação Coelba","unit":"processo","materials":["projeto particular","ART","protocolos"],"release":"Projeto aprovado e vigente","weight":1.25,"operational":{"description":"Projeto e aprovação Coelba executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT eletricista do empreendimento","support":"Projetista, dono e documentação administrativa","approval":"Neoenergia Coelba/órgão competente"},"entryConditions":["Demanda, ponto de entrega e cadastro do empreendimento definidos","Projeto, memorial, ART/RRT e formulários exigidos preparados"],"production":{"unit":"processo","method":"Contar processos/projetos aprovados e vigentes","formula":"processos liberados = aprovações válidas - processos com ressalva impeditiva ou vencidos","rate":"processos/mês, respeitando análise externa"},"materials":["projeto particular","ART","protocolos"],"equipment":["projeto particular","ART","protocolos"],"evidence":["Carta/formulário de solicitação","Projeto, memorial, cálculos e ART/RRT","Protocolo, aprovação e comunicações da distribuidora"],"acceptance":["Projeto aprovado e vigente","Exigências encerradas ou formalmente tratadas","Versão aprovada vinculada ao canteiro"],"conditions":["Projeto reprovado, prazo externo vencido ou mudança sem reapresentação bloqueia a obra"],"notifications":["Notificar dono e RT no protocolo, na exigência e no vencimento do prazo externo"],"legalBasis":["Projeto elétrico particular aprovado pela Neoenergia Coelba quando aplicável","ART/RRT, documentação do empreendimento e materiais/equipamentos homologados","NR-18, procedimentos de segurança elétrica e empresa credenciada quando exigida"],"outputs":["Projeto aprovado e vigente","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"crossings-bases","title":"Travessias, dutos e bases","unit":"trecho","materials":["dutos","caixas","concreto","aterramento"],"release":"Obra civil inspecionada antes do pavimento","weight":1,"operational":{"description":"Travessias, dutos e bases executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de infraestrutura elétrica","support":"Equipe civil, topografia e segurança","approval":"RT eletricista/concessionária quando aplicável"},"entryConditions":["Projeto elétrico aprovado e interferências compatibilizadas","Dutos, caixas, concreto e aterramento conferidos"],"production":{"unit":"trecho","method":"Medir trechos/unidades de obra civil elétrica aceitos","formula":"produção = travessias e bases completas com recobrimento, identificação e inspeção","rate":"trechos/dia ou unidades/dia conforme projeto"},"materials":["dutos","caixas","concreto","aterramento"],"equipment":["dutos","caixas","concreto","aterramento"],"evidence":["Romaneio de dutos, caixas e concreto","Fotos antes do reaterro","Checklist de recobrimento e coordenadas"],"acceptance":["Duto contínuo, caixa acessível e base na posição","Recobrimento/proteção conforme projeto","Nenhuma interferência com drenagem/água"],"conditions":["Duto obstruído, recobrimento insuficiente ou base fora da posição bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto elétrico particular aprovado pela Neoenergia Coelba quando aplicável","ART/RRT, documentação do empreendimento e materiais/equipamentos homologados","NR-18, procedimentos de segurança elétrica e empresa credenciada quando exigida"],"outputs":["Obra civil inspecionada antes do pavimento","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"poles-network","title":"Postes e montagem da rede","unit":"un/projeto","materials":["itens do projeto aprovado","materiais homologados"],"release":"Montagem conforme projeto e empresa credenciada","weight":1.35,"operational":{"description":"Postes e montagem da rede executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Empresa elétrica credenciada quando exigida","support":"RT eletricista, equipe de montagem e sinalização","approval":"Neoenergia Coelba"},"entryConditions":["Projeto aprovado, materiais homologados e empresa habilitada","Bases, faixas e plano de segurança liberados"],"production":{"unit":"un/projeto","method":"Contar postes/trechos montados, inspecionados e aceitos","formula":"un/trechos aceitos = montagem conforme projeto + aterramento + inspeção","rate":"un/dia ou trecho/projeto, conforme equipe credenciada"},"materials":["itens do projeto aprovado","materiais homologados"],"equipment":["itens do projeto aprovado","materiais homologados"],"evidence":["Notas e certificados de materiais homologados","Boletim de montagem e fotos","Laudos/ensaios e checklists de segurança"],"acceptance":["Montagem conforme projeto aprovado","Afastamentos, prumo, aterramento e identificação conferidos","Pendências da inspeção encerradas"],"conditions":["Material não homologado, equipe não habilitada ou montagem diferente do projeto bloqueia"],"notifications":["Notificar o dono antes de qualquer alteração que exija reapresentação à Coelba"],"legalBasis":["Projeto elétrico particular aprovado pela Neoenergia Coelba quando aplicável","ART/RRT, documentação do empreendimento e materiais/equipamentos homologados","NR-18, procedimentos de segurança elétrica e empresa credenciada quando exigida"],"outputs":["Montagem conforme projeto e empresa credenciada","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"lighting","title":"Iluminação pública e proteção","unit":"ponto","materials":["itens do projeto aprovado","aterramento e proteção"],"release":"Ensaios e identificação concluídos","weight":1,"operational":{"description":"Iluminação pública e proteção executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT eletricista","support":"Equipe de iluminação, montagem e ensaios","approval":"Neoenergia Coelba/município"},"entryConditions":["Rede e projeto de iluminação aprovados","Luminárias, proteção, aterramento e instrumentos disponíveis"],"production":{"unit":"ponto","method":"Contar pontos de iluminação instalados, testados e aceitos","formula":"pontos aceitos = luminárias + comando/proteção + ensaio + identificação","rate":"pontos/dia = pontos completos por equipe"},"materials":["itens do projeto aprovado","aterramento e proteção"],"equipment":["itens do projeto aprovado","aterramento e proteção"],"evidence":["Romaneio e certificados dos equipamentos","Fichas de ensaio e fotos","Mapa de pontos e relatório de acionamento"],"acceptance":["Ponto, potência e proteção conforme projeto","Aterramento/ensaios registrados","Acionamento e identificação funcionando"],"conditions":["Ensaio reprovado, proteção ausente ou ponto divergente bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projeto elétrico particular aprovado pela Neoenergia Coelba quando aplicável","ART/RRT, documentação do empreendimento e materiais/equipamentos homologados","NR-18, procedimentos de segurança elétrica e empresa credenciada quando exigida"],"outputs":["Ensaios e identificação concluídos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"inspection","title":"Vistoria e correções","unit":"processo","materials":["dossiê as-built","laudos","sobressalentes"],"release":"Pendências da vistoria encerradas","weight":0.9,"operational":{"description":"Vistoria e correções executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT eletricista e responsável pela interface com a distribuidora","support":"Encarregado, empresa executora e documentação","approval":"Neoenergia Coelba"},"entryConditions":["Rede concluída, as-built preliminar e dossiê disponíveis","Lista de pendências e protocolo de vistoria abertos"],"production":{"unit":"processo","method":"Contar pendências encerradas e vistoria aprovada","formula":"pendências resolvidas = itens aceitos pela vistoria - itens reabertos","rate":"pendências/dia ou processo/ciclo externo"},"materials":["dossiê as-built","laudos","sobressalentes"],"equipment":["dossiê as-built","laudos","sobressalentes"],"evidence":["Protocolo e relatório de vistoria","Fotos/laudos de correção","Dossiê as-built atualizado"],"acceptance":["Pendências críticas zeradas","Vistoria aprovada ou aceite formal","Documentos vinculados ao protocolo correto"],"conditions":["Pendência de segurança, documentação ou obra divergente bloqueia a ligação"],"notifications":["Notificar dono e RT a cada exigência crítica, rejeição ou prazo perdido"],"legalBasis":["Projeto elétrico particular aprovado pela Neoenergia Coelba quando aplicável","ART/RRT, documentação do empreendimento e materiais/equipamentos homologados","NR-18, procedimentos de segurança elétrica e empresa credenciada quando exigida"],"outputs":["Pendências da vistoria encerradas","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"coelba-connection","title":"Incorporação e ligação Coelba","unit":"processo externo","materials":["protocolos","termos de incorporação"],"release":"Rede energizada e liberação formal recebida","weight":1.1,"operational":{"description":"Incorporação e ligação Coelba executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Dono/RT responsável pelo processo de incorporação","support":"Empresa executora credenciada e administrativo","approval":"Neoenergia Coelba"},"entryConditions":["Projeto aprovado, obra inspecionada e documentação completa","Termo de intenção/incorporação, protocolos e certificados preparados"],"production":{"unit":"processo externo","method":"Controlar processo externo por marcos: protocolado, aprovado, incorporado e ligado","formula":"processo concluído = protocolo + aceite documental + incorporação/ligação formal","rate":"marcos por ciclo, sujeito ao prazo da distribuidora"},"materials":["protocolos","termos de incorporação"],"equipment":["protocolos","termos de incorporação"],"evidence":["Protocolo e comunicações oficiais","Termo de incorporação/aceite","Relatório de energização e dossiê final"],"acceptance":["Liberação formal recebida da distribuidora","Responsabilidade e ativo transferidos quando aplicável","Prazo/validade registrados no sistema"],"conditions":["Documento faltante, material fora da especificação ou obra não aprovada bloqueia"],"notifications":["Disparar alerta ao dono para protocolo, exigência, aprovação, atraso e ligação"],"legalBasis":["Projeto elétrico particular aprovado pela Neoenergia Coelba quando aplicável","ART/RRT, documentação do empreendimento e materiais/equipamentos homologados","NR-18, procedimentos de segurança elétrica e empresa credenciada quando exigida"],"outputs":["Rede energizada e liberação formal recebida","Registro de medição, evidência e aceite disponível para a próxima atividade"]}}]},{"key":"signage","title":"Entrega, as-built e encerramento","aliases":["closeout"],"activities":[{"id":"as-built","title":"As-built integrado","unit":"dossiê","materials":["levantamentos finais","memoriais","mídia digital"],"release":"Executado compatível com cadastro final","weight":1.15,"operational":{"description":"As-built integrado executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT de documentação/as-built","support":"Topografia, responsáveis de cada rede e encarregados","approval":"Dono, município e concessionárias quando aplicável"},"entryConditions":["Registros finais de todas as frentes disponíveis","Pendências críticas encerradas ou formalmente aceitas"],"production":{"unit":"dossiê","method":"Controlar dossiês/disciplinas entregues e aprovados","formula":"dossiê completo = disciplinas conferidas + arquivos editáveis/PDF + assinaturas + evidências","rate":"pacotes/semana por equipe de documentação"},"materials":["levantamentos finais","memoriais","mídia digital"],"equipment":["levantamentos finais","memoriais","mídia digital"],"evidence":["Levantamento final georreferenciado","Plantas, memoriais, fotos e laudos","Matriz de documentos e assinaturas"],"acceptance":["Executado compatível com cadastro final","Arquivos versionados e legíveis","Aceites dos responsáveis registrados"],"conditions":["Divergência física, arquivo sem assinatura ou evidência ausente bloqueia a entrega"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projetos e termos de aceite do município, concessionárias e demais órgãos aplicáveis","As-built, memoriais, garantias e comprovação de encerramento das condicionantes","NR-18 até a desmobilização completa do canteiro"],"outputs":["Executado compatível com cadastro final","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"signage-final","title":"Sinalização e identificação","unit":"un","materials":["placas","marcos definitivos","sinalização viária"],"release":"Itens instalados e conferidos","weight":0.85,"operational":{"description":"Sinalização e identificação executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Encarregado de sinalização","support":"Equipe de instalação, RT viário e fiscalização","approval":"Município/órgão de trânsito quando aplicável"},"entryConditions":["Projeto de sinalização e nomenclatura aprovados","Placas, marcos, suportes e posições conferidos"],"production":{"unit":"un","method":"Contar placas/marcos instalados e aceitos","formula":"un aceitas = instalação + posição + legibilidade + cadastro + vistoria","rate":"un/dia = pontos completos"},"materials":["placas","marcos definitivos","sinalização viária"],"equipment":["placas","marcos definitivos","sinalização viária"],"evidence":["Romaneio de placas/marcos","Fotos e coordenadas","Checklist/vistoria de sinalização"],"acceptance":["Posição, orientação e legibilidade corretas","Fixação segura e sem conflito com acessibilidade","Cadastro final atualizado"],"conditions":["Placa ilegível, posição divergente ou risco à circulação bloqueia"],"notifications":["Disparar notificação ao dono e ao encarregado quando houver bloqueio, rendimento abaixo do ritmo ou requisito vencido"],"legalBasis":["Projetos e termos de aceite do município, concessionárias e demais órgãos aplicáveis","As-built, memoriais, garantias e comprovação de encerramento das condicionantes","NR-18 até a desmobilização completa do canteiro"],"outputs":["Itens instalados e conferidos","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"punch-list","title":"Inspeções e correção de pendências","unit":"item","materials":["materiais de reparo","checklists"],"release":"Punch list zerada ou formalmente aceita","weight":1.1,"operational":{"description":"Inspeções e correção de pendências executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"RT/coordenador de entrega","support":"Encarregados de todas as frentes, dono e fiscalização","approval":"Dono/órgão responsável"},"entryConditions":["Obra fisicamente concluída por frente","Checklists, projetos e evidências reunidos"],"production":{"unit":"item","method":"Contar itens encerrados, não apenas visitados","formula":"pendências abertas = itens identificados - itens aceitos; punch list encerrada quando zero impeditivos","rate":"itens/dia = correções aceitas"},"materials":["materiais de reparo","checklists"],"equipment":["materiais de reparo","checklists"],"evidence":["Checklist assinado","Fotos antes/depois","Registro de reinspeção e aceite"],"acceptance":["Pendências impeditivas zeradas ou aceitas formalmente","Cada item tem responsável e evidência","Impactos no caixa/cronograma registrados"],"conditions":["Pendência de segurança, licença, rede ou acesso mantém a entrega bloqueada"],"notifications":["Notificar dono quando surgir item crítico ou houver atraso de correção"],"legalBasis":["Projetos e termos de aceite do município, concessionárias e demais órgãos aplicáveis","As-built, memoriais, garantias e comprovação de encerramento das condicionantes","NR-18 até a desmobilização completa do canteiro"],"outputs":["Punch list zerada ou formalmente aceita","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"receipts-close","title":"Comprovantes, garantias e manuais","unit":"dossiê","materials":["notas","certificados","contratos","garantias"],"release":"Dossiê completo e rastreável","weight":0.9,"operational":{"description":"Comprovantes, garantias e manuais executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Administrativo de contratos/documentação","support":"RT, compras, fornecedores e encarregados","approval":"Dono/gestor financeiro"},"entryConditions":["Serviços e compras conferidos com o caixa","Comprovantes, certificados, notas e garantias disponíveis"],"production":{"unit":"dossiê","method":"Contar documentos válidos e conciliados por pacote","formula":"dossiês válidos = documentos presentes - documentos ilegíveis, vencidos ou sem vínculo","rate":"documentos/dia ou pacotes/semana"},"materials":["notas","certificados","contratos","garantias"],"equipment":["notas","certificados","contratos","garantias"],"evidence":["Notas fiscais, recibos e contratos","Certificados, garantias e comprovantes de terceirização","Assinatura/aceite e conciliação financeira"],"acceptance":["Documento legível, íntegro e vinculado","Valor/quantidade conciliados com caixa e material","Garantia/validade monitorável"],"conditions":["Comprovante ausente, divergência de valor ou fornecedor não identificado bloqueia o fechamento"],"notifications":["Notificar dono sobre comprovante faltante, valor divergente ou certificado vencendo"],"legalBasis":["Projetos e termos de aceite do município, concessionárias e demais órgãos aplicáveis","As-built, memoriais, garantias e comprovação de encerramento das condicionantes","NR-18 até a desmobilização completa do canteiro"],"outputs":["Dossiê completo e rastreável","Registro de medição, evidência e aceite disponível para a próxima atividade"]}},{"id":"handover","title":"Aceites e entrega operacional","unit":"termo","materials":["termos de recebimento","registro fotográfico"],"release":"Aceites assinados e responsabilidades transferidas","weight":1,"operational":{"description":"Aceites e entrega operacional executada em sequência controlada, com medição, evidência, aceite e liberação para a próxima frente.","responsibility":{"primary":"Coordenador de entrega e RT","support":"Dono, encarregados, operação e órgãos/concessionárias","approval":"Dono/recebedor formal"},"entryConditions":["Punch list encerrada, dossiê completo e aceites externos reunidos","Caixa, contratos, garantias e responsabilidades conciliados"],"production":{"unit":"termo","method":"Controlar termos/disciplinas aceitos e responsabilidades transferidas","formula":"entrega concluída = aceites + dossiê + transferência formal + pendências não impeditivas tratadas","rate":"pacotes/termos por ciclo de entrega"},"materials":["termos de recebimento","registro fotográfico"],"equipment":["termos de recebimento","registro fotográfico"],"evidence":["Termos de recebimento assinados","Dossiê final e manuais","Registro fotográfico e ata de entrega"],"acceptance":["Responsável pelo ativo e manutenção definido","Documentação e garantias entregues","Pendências restantes têm prazo e aceite formal"],"conditions":["Aceite ausente, ativo sem responsável ou documento crítico pendente bloqueia o encerramento"],"notifications":["Notificar dono para assinatura, transferência de responsabilidade e pendências de garantia"],"legalBasis":["Projetos e termos de aceite do município, concessionárias e demais órgãos aplicáveis","As-built, memoriais, garantias e comprovação de encerramento das condicionantes","NR-18 até a desmobilização completa do canteiro"],"outputs":["Aceites assinados e responsabilidades transferidas","Registro de medição, evidência e aceite disponível para a próxima atividade"]}}]}] as OriginalWorkbenchStage[];

  /** Recreate the original Worker defaults for an uncustomized activity session. */
  function defaultWorkbenchProgramming(session: WorkbenchSession): Record<string, unknown> {
    const unit = String(session.unit || '').trim().toLocaleLowerCase('pt-BR');
    const text = `${session.title || ''} ${session.text || ''} ${session.release || ''} ${session.materials.map(item => typeof item === 'string' ? item : item.name).join(' ')}`.toLocaleLowerCase('pt-BR');
    const quantified = /m³|m²|\bm\b|un|ponto|trecho|setor|viagem|lote|ramal|cavalete|ensaio|processo/.test(unit);
    const physical = !/processo|dossiê|termo|ensaio/.test(unit) && !/aprova[cç][aã]o|protocolo|dossi[eê]|termo/.test(text);
    const dependency = Boolean(session.release) || /antes|depois|libera|depend|aceite|bloque/.test(text);
    const productionBasis = /m³/.test(unit) ? 'volume' : /m²/.test(unit) ? 'area' : /\bm\b/.test(unit) ? 'comprimento' : /viagem|lote|ramal|cavalete|un|ponto|trecho|setor|ensaio|processo/.test(unit) ? 'contagem' : 'registro';
    return { scheduleMode: quantified ? 'production' : dependency ? 'sequential' : 'parallel', productionModeEnabled: quantified, productionBasis, mapLocation: physical, requireAcceptance: dependency };
  }

  /** Preserve the original session property set without persisting it until edited. */
  function defaultWorkbenchProperties(session: WorkbenchSession): WorkbenchSession['properties'] {
    const operational = session.operational || {};
    const responsibility = (operational.responsibility || {}) as Record<string, unknown>;
    const production = (operational.production || {}) as Record<string, unknown>;
    const materialSummary = session.materials.map(item => typeof item === 'string' ? item : [item.name, item.description, item.usage].filter(Boolean).join(' — ')).filter(Boolean).join(', ');
    const list = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
    const rows: Array<[string, unknown]> = [
      ['Unidade de produção', session.unit || production.unit || 'registro'],
      ['Materiais e equipamentos', materialSummary || 'A definir'],
      ['Requisito de liberação', session.release || 'Sem requisito informado'],
      ['Responsabilidade principal', responsibility.primary || session.responsible || 'Responsável técnico da frente'],
      ['Equipe e apoio', responsibility.support || 'Encarregado e equipe executora'],
      ['Condições de entrada', list(operational.entryConditions).join(' · ') || 'Projeto e área liberados'],
      ['Forma de medição', production.method || 'Medir produção confirmada por frente, local e data'],
      ['Fórmula de produção', production.formula || 'quantidade válida = soma das medições confirmadas'],
      ['Evidência e aceite', list(operational.evidence || operational.acceptance).join(' · ') || 'Registro, fotos e confirmação do responsável'],
      ['Base legal/técnica', list(operational.legalBasis).join(' · ') || 'Projeto, licença e norma aplicável'],
    ];
    return rows.map(([label, value], index) => ({ id: `${session.id}-property-${index}`, label, value: String(value) }));
  }

  /** Map the persisted stage name/key to the stable worker-state partition key. */
  function settingsStageKey(stage: OperationalStage): string {
    if (stage.key) return String(stage.key).trim().toLowerCase();
    const name = String(stage.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const mappings: Array<[RegExp, string]> = [
      [/projeto|preparacao|preparacao/, 'project'], [/terra|earthwork/, 'earthwork'],
      [/drenagem|drainage/, 'drainage'], [/rede de agua|abastecimento|water/, 'water'],
      [/meio.?fio|acessibilidade|curbs?/, 'curbs'], [/paviment|paving/, 'paving'],
      [/eletric|coelba|electrical/, 'electrical'], [/sinal|encerramento|as.?built|closeout/, 'signage'],
    ];
    return mappings.find(([pattern]) => pattern.test(name))?.[1] || String(stage.id);
  }

  /** Read settings from their authoritative stage, Worker, repository and access-control services. */
  async function reloadSettings(): Promise<void> {
    const target = settingsElement;
    if (!target) return;
    const requestId = ++settingsRequestId;
    const actor = (globalThis as Runtime & { BELAVISTA_ADMIN_ACTOR?: { role?: string } }).BELAVISTA_ADMIN_ACTOR;
    try {
      const stagePayload = await readApi<{ stages: OperationalStage[] }>('/api/stages-admin');
      if (!Array.isArray(stagePayload.stages)) throw new Error('O serviço de etapas não retornou a lista persistida.');
      const stages: ConfiguredStage[] = await Promise.all(stagePayload.stages.map(async raw => {
        const stageKey = settingsStageKey(raw);
        const [detailPayload, workbenchPayload] = await Promise.all([
          readApi<{ stage: OperationalStage & { aiConfig?: ConfiguredStage['aiConfig'] } }>(`/api/stages-admin/${encodeURIComponent(String(raw.id))}`),
          readApi<{ state: StageWorkbenchState }>(`/api/workbench/state?stage=${encodeURIComponent(stageKey)}`),
        ]);
        if (!detailPayload.stage || !workbenchPayload.state || !Array.isArray(workbenchPayload.state.inputSessions))
          throw new Error(`O serviço não retornou a compreensão persistida de ${raw.name}.`);
        const state = workbenchPayload.state;
        const definition = originalWorkbenchCatalog.find(item => item.key === stageKey || item.aliases.includes(stageKey));
        const persisted = state.inputSessions;
        const sourceSessions: WorkbenchSession[] = persisted.length ? persisted : (definition?.activities || []).map((activity, index) => ({
          id: `input-${activity.id}`, activityId: activity.id, title: activity.title,
          text: `Entrada base: ${activity.release}. Equipamentos e materiais: ${activity.materials.join(', ')}.`,
          unit: activity.unit, materials: activity.materials, release: activity.release,
          responsible: String((activity.operational.responsibility as Record<string, unknown> | undefined)?.primary || ''),
          operational: activity.operational, properties: [],
          automation: { propagateRelations: true, generateSchedule: true, generateResources: true, notifyWorker: true },
          programming: {}, inference: null, order: index, custom: false,
        }));
        const sessions = sourceSessions.map(session => ({
          ...session,
          automation: { propagateRelations: true, generateSchedule: true, generateResources: true, notifyWorker: true, ...(session.automation || {}) },
          programming: { ...defaultWorkbenchProgramming(session), ...(session.programming || {}) },
          properties: session.properties?.length ? session.properties : defaultWorkbenchProperties(session),
        })).sort((a, b) => Number(a.order) - Number(b.order));
        return {
          ...raw, ...detailPayload.stage, stageKey,
          aiConfig: detailPayload.stage.aiConfig || null,
          workbenchState: state,
          workbenchSessions: sessions,
          workbenchSource: persisted.length ? 'persisted' : definition ? 'worker-defaults' : 'unavailable',
        };
      }));
      let roles: DelegatedAccessRole[] = [], keys: DelegatedAccessKey[] = [], contact: PublicLeadContactSettings | null = null;
      if (actor?.role === 'owner' && !runtime.BELAVISTA_CAPACITOR_NATIVE) {
        const [roleResult, keyResult] = await Promise.allSettled([
          readApi<{ roles: DelegatedAccessRole[] }>('/api/access-roles'),
          readApi<{ keys: DelegatedAccessKey[] }>('/api/access-keys'),
        ]);
        if (roleResult.status === 'fulfilled') roles = roleResult.value.roles;
        else target.setFeedback(`Papéis não carregados: ${roleResult.reason instanceof Error ? roleResult.reason.message : String(roleResult.reason)}`);
        if (keyResult.status === 'fulfilled') keys = keyResult.value.keys;
        else target.setFeedback(`Chaves não carregadas: ${keyResult.reason instanceof Error ? keyResult.reason.message : String(keyResult.reason)}`);
      }
      if (['owner', 'admin', 'developer'].includes(String(actor?.role || ''))) {
        try { contact = await readApi<PublicLeadContactSettings>('/api/settings/public-lead-contact'); }
        catch (error) { target.setFeedback(`Contato público não carregado: ${error instanceof Error ? error.message : String(error)}`); }
      }
      if (requestId !== settingsRequestId || target !== settingsElement) return;
      const snapshot: SettingsSnapshot = { stages, roles, keys, contact, actorRole: String(actor?.role || ''), isNative: Boolean(runtime.BELAVISTA_CAPACITOR_NATIVE) };
      target.setData(snapshot);
    } catch (error) {
      if (requestId === settingsRequestId && target === settingsElement)
        target.setError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Verify a save by reading the canonical stage collection again. */
  async function saveSettingsStage(event: Event, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; stageId: number | null; payload: Record<string, unknown> }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    const actor = appStore.get().currentActor as { role?: string } | undefined;
    if (!['owner', 'admin'].includes(String(actor?.role || ''))) { detail.element.setError('Seu perfil não pode alterar o cadastro das etapas.'); return; }
    try {
      const path = detail.stageId == null ? '/api/stages-admin' : `/api/stages-admin/${encodeURIComponent(String(detail.stageId))}`;
      const result = await mutateApi<{ stage: OperationalStage }>(path, detail.stageId == null ? 'POST' : 'PUT', detail.payload);
      await reloadSettings();
      detail.element.setFeedback(`Etapa ${result.stage?.name || ''} confirmada na fonte persistida.`);
    } catch (error) { detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  /** Delete a stage only through the server's referential-integrity checks. */
  async function deleteSettingsStage(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; stageId: number }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    try {
      await mutateApi(`/api/stages-admin/${encodeURIComponent(String(detail.stageId))}`, 'DELETE');
      await reloadSettings();
      detail.element.setFeedback('Etapa removida; a fonte persistente confirmou a exclusão.');
    } catch (error) { detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  /** Persist stage AI comprehension and re-read the API-owned row. */
  async function saveStageComprehension(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; stageId: number; payload: unknown }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    try {
      await mutateApi(`/api/stages-admin/${encodeURIComponent(String(detail.stageId))}/ai`, 'PUT', detail.payload);
      await reloadSettings();
      detail.element.setFeedback('Compreensão da etapa salva e relida do banco operacional.');
    } catch (error) { detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  /** Serialize workbench writes per stage, preserving concurrent state fields and verifying the response. */
  async function saveSettingsWorkbench(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; stageId: string; stageKey: string; state: StageWorkbenchState; sessions: WorkbenchSession[] }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    const prior = workbenchSaveQueues.get(detail.stageKey) || Promise.resolve();
    const save = prior.catch(() => undefined).then(async () => {
      const path = `/api/workbench/state?stage=${encodeURIComponent(detail.stageKey)}`;
      const current = await readApi<{ state: StageWorkbenchState }>(path);
      if (!current.state) throw new Error('A API não retornou o estado atual do Worker; a edição não foi substituída.');
      const payload = { ...current.state, inputSessions: detail.sessions };
      const result = await writeApi<{ state: StageWorkbenchState }>(path, payload);
      if (!result.state || !Array.isArray(result.state.inputSessions)) throw new Error('O Worker não confirmou as sessões persistidas.');
      const canonical = await readApi<{ state: StageWorkbenchState }>(path);
      if (!canonical.state || JSON.stringify(canonical.state.inputSessions) !== JSON.stringify(result.state.inputSessions))
        throw new Error('A releitura não confirmou as sessões de compreensão salvas.');
      if (settingsElement === detail.element) {
        detail.element.setStageWorkbench(detail.stageId, canonical.state, canonical.state.inputSessions);
        detail.element.setFeedback('Compreensões do Worker salvas e verificadas no banco.');
      }
      return canonical.state;
    });
    workbenchSaveQueues.set(detail.stageKey, save);
    try { await save; }
    catch (error) { if (settingsElement === detail.element) detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  /** Run the real Worker inference and persist its result as part of the stage workbench state. */
  async function inferSettingsSession(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; stageKey: string; session: WorkbenchSession }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    try {
      const stage = detail.element.getStage(detail.stageKey);
      if (!stage) throw new Error('Etapa não encontrada na configuração carregada.');
      const result = await mutateApi<Record<string, unknown>>('/api/workbench/infer', 'POST', {
        stage: detail.stageKey, activityId: detail.session.activityId || detail.session.id,
        title: detail.session.title, text: detail.session.text || '',
        calendarDate: stage.workbenchState.calendarDate, activities: stage.workbenchSessions,
        automation: detail.session.automation || {}, programming: detail.session.programming || {}, properties: detail.session.properties || [],
      });
      const prior = workbenchSaveQueues.get(detail.stageKey) || Promise.resolve();
      const persist = prior.catch(() => undefined).then(async () => {
        const path = `/api/workbench/state?stage=${encodeURIComponent(detail.stageKey)}`;
        const latest = await readApi<{ state: StageWorkbenchState }>(path);
        if (!latest.state || !Array.isArray(latest.state.inputSessions)) throw new Error('O estado atual do Worker não está disponível para salvar a inferência.');
        const currentStage = detail.element.getStage(detail.stageKey);
        const sessionExists = latest.state.inputSessions.some(item => item.id === detail.session.id);
        const sessionsForWrite = sessionExists
          ? latest.state.inputSessions
          : currentStage?.workbenchSource === 'worker-defaults' && currentStage.workbenchSessions.some(item => item.id === detail.session.id)
            ? currentStage.workbenchSessions
            : null;
        if (!sessionsForWrite) throw new Error('A atividade foi removida durante a inferência; nenhum estado foi sobrescrito.');
        const state = { ...latest.state, inputSessions: sessionsForWrite.map(item => item.id === detail.session.id ? { ...item, inference: result } : item) };
        await writeApi<{ state: StageWorkbenchState }>(path, state);
        const canonical = await readApi<{ state: StageWorkbenchState }>(path);
        const saved = canonical.state?.inputSessions?.find(item => item.id === detail.session.id);
        if (!saved?.inference) throw new Error('A inferência retornou, mas a releitura não confirmou sua persistência.');
        if (settingsElement === detail.element) {
          detail.element.setStageWorkbench(String(stage.id), canonical.state, canonical.state.inputSessions);
          detail.element.setFeedback(String(result.summary || 'Inferência concluída e persistida pelo Worker.'));
        }
      });
      workbenchSaveQueues.set(detail.stageKey, persist);
      await persist;
    } catch (error) {
      if (settingsElement === detail.element) detail.element.setError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Save or update a persisted dynamic access role in the repository-backed Worker. */
  async function saveAccessRole(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; id: string | null; name: string; permissions: string[] }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    try {
      await mutateApi('/api/access-roles', detail.id ? 'PUT' : 'POST', { ...(detail.id ? { id: detail.id } : {}), name: detail.name, permissions: detail.permissions });
      await reloadSettings();
      detail.element.setFeedback('Papel persistido e confirmado no Worker.');
    } catch (error) { detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  async function deleteAccessRole(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; id: string }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    try { await mutateApi(`/api/access-roles/${encodeURIComponent(detail.id)}`, 'DELETE'); await reloadSettings(); detail.element.setFeedback('Papel removido do Worker.'); }
    catch (error) { detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  async function createAccessKey(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; label: string; roleId: string }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    try {
      const result = await mutateApi<{ key: DelegatedAccessKey }>('/api/access-keys', 'POST', { label: detail.label, roleId: detail.roleId });
      if (!result.key?.token) throw new Error('O Worker não retornou o segredo de uso único da chave.');
      await reloadSettings();
      detail.element.showCreatedKey(result.key.token);
    } catch (error) { detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  async function revokeAccessKey(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; id: string }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    try { await mutateApi(`/api/access-keys/${encodeURIComponent(detail.id)}`, 'DELETE'); await reloadSettings(); detail.element.setFeedback('Chave revogada no Worker.'); }
    catch (error) { detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  async function savePublicLeadContact(event: Event): Promise<void> {
    const detail = (event as CustomEvent<{ element: AtlasSettings; whatsappNumber: string }>).detail;
    if (!detail || detail.element !== settingsElement) return;
    try {
      const saved = await mutateApi<PublicLeadContactSettings>('/api/settings/public-lead-contact', 'PUT', { whatsappNumber: detail.whatsappNumber });
      const check = await readApi<PublicLeadContactSettings>('/api/settings/public-lead-contact');
      if (check.whatsappNumber !== saved.whatsappNumber) throw new Error('A releitura no repositório não confirmou o telefone salvo.');
      detail.element.setContact(check);
      detail.element.setFeedback('Contato WhatsApp salvo e relido do repositório.');
    } catch (error) { detail.element.setError(error instanceof Error ? error.message : String(error)); }
  }

  /** Reload the official lot-price projection, saved profile changes and cash ledger. */
  async function reloadLotDevelopment(selectedId?: string): Promise<void> {
    if (!lotDevelopmentElement) return;
    const target=lotDevelopmentElement,requestId=++lotDevelopmentRequestId;
    try {
      const [profiles,ledger]=await Promise.all([
        readApi<{profiles:LotDevelopmentProfile[]}>('/api/lot-development/profiles'),
        readApi<{entries:CashFlowRecord[]}>('/api/cash-flow'),
      ]);
      if(!Array.isArray(profiles.profiles)||!Array.isArray(ledger.entries))throw new Error('O serviço retornou um catálogo de perfis inválido.');
      if(requestId!==lotDevelopmentRequestId||target!==lotDevelopmentElement)return;
      lotDevelopmentProfilesCache=profiles.profiles.map(profile=>({...profile}));
      target.setData(profiles.profiles,ledger.entries,selectedId);
    } catch(error) {
      if(requestId===lotDevelopmentRequestId&&target===lotDevelopmentElement)target.setError(error instanceof Error?error.message:String(error));
    }
  }

  /** Persist a lot override or create/update a common area, then read it back. */
  async function saveLotDevelopmentProfile(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasLotDevelopment;id:string;payload:Record<string,unknown>}>).detail;
    if(!detail||detail.element!==lotDevelopmentElement)return;
    try{
      const path=detail.id?`/api/lot-development/profiles/${encodeURIComponent(detail.id)}`:'/api/lot-development/profiles';
      const result=await mutateApi<{profile:LotDevelopmentProfile}>(path,detail.id?'PUT':'POST',detail.payload);
      await reloadLotDevelopment(result.profile.id);
      detail.element.setFeedback('Perfil persistido e confirmado pela releitura do serviço.');
    }catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Delete only a persisted area or reset the persisted lot-description override. */
  async function deleteLotDevelopmentProfile(event:Event,appStore:{get():Record<string,unknown>;set(state:Record<string,unknown>):void}):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasLotDevelopment;id:string}>).detail;
    if(!detail||detail.element!==lotDevelopmentElement)return;
    try{await mutateApi(`/api/lot-development/profiles/${encodeURIComponent(detail.id)}`,'DELETE');navigateRoute(appStore,{view:'lot-development',lotProfileId:null},{selectedDevelopmentProfileId:null});await reloadLotDevelopment();detail.element.setFeedback('Alteração persistida; catálogo atualizado.');}
    catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Install the TypeScript Loteamento route and its persistent CRUD/cash handoff. */
  function installLotDevelopmentRoute(ViewLayer:{prototype:HTMLElement&Record<string,unknown>},appStore:{get():Record<string,unknown>;set(state:Record<string,unknown>):void},host:Document):void{
    ViewLayer.prototype.lotDevelopment=()=>'<atlas-lot-development></atlas-lot-development>';
    ViewLayer.prototype.lotProfile=()=>`<atlas-lot-development data-profile-route data-selected-profile="${String(appStore.get().selectedDevelopmentProfileId||'').replace(/[&<>"']/g,'')}"></atlas-lot-development>`;
    runtime.__BELAVISTA_LOT_DEVELOPMENT_PROFILES_V1=()=>lotDevelopmentProfilesCache.map(profile=>({...profile}));
    runtime.__BELAVISTA_UPSERT_LOT_DEVELOPMENT_PROFILE_V1=async(input)=>{
      const requestedId=String(input.id||'').trim(),payload={...input,kind:input.kind==='common-area'?'common-area':'lot'};
      const path=requestedId?`/api/lot-development/profiles/${encodeURIComponent(requestedId)}`:'/api/lot-development/profiles';
      const result=await mutateApi<{profile:LotDevelopmentProfile}>(path,requestedId?'PUT':'POST',payload);
      if(lotDevelopmentElement)await reloadLotDevelopment(result.profile.id);
      navigateRoute(appStore,{view:'lot-profile',lotProfileId:result.profile.id},{lastAction:`Preparou o perfil persistido ${result.profile.title} para revisão`});
      return result.profile;
    };
    host.addEventListener('atlas:lot-development-connected',event=>{
      const detail=(event as CustomEvent<{element:AtlasLotDevelopment;profileRoute:boolean;selectedId:string}>).detail,element=detail?.element;
      if(!(element instanceof AtlasLotDevelopment))return;lotDevelopmentElement=element;void reloadLotDevelopment(detail.profileRoute?detail.selectedId:undefined);
    });
    host.addEventListener('atlas:lot-profile-open',event=>{
      const detail=(event as CustomEvent<{element:AtlasLotDevelopment;id:string}>).detail;
      if(!detail||detail.element!==lotDevelopmentElement||!lotDevelopmentProfilesCache.some(profile=>profile.id===detail.id))return;
      navigateRoute(appStore,{view:'lot-profile',lotProfileId:detail.id},{lastAction:`Abriu perfil persistido ${detail.id}`});
    });
    host.addEventListener('atlas:lot-profile-close',event=>{
      const detail=(event as CustomEvent<{element:AtlasLotDevelopment}>).detail;
      if(!detail||detail.element!==lotDevelopmentElement)return;
      navigateRoute(appStore,{view:'lot-development',lotProfileId:null},{selectedDevelopmentProfileId:null});
    });
    host.addEventListener('atlas:lot-profile-save',event=>{void saveLotDevelopmentProfile(event);});
    host.addEventListener('atlas:lot-profile-delete',event=>{void deleteLotDevelopmentProfile(event,appStore);});
    host.addEventListener('atlas:lot-cash-entry',event=>{
      const detail=(event as CustomEvent<{element:AtlasLotDevelopment;lotKey:string}>).detail;
      if(!detail||detail.element!==lotDevelopmentElement)return;
      navigateRoute(appStore,{view:'repasses'},{repasseSelectedLotKey:detail.lotKey,repasseSelectedSaleId:null,lastAction:`Abriu Repasses para registrar entrada do lote ${detail.lotKey}`});
    });
  }

  /** Reload project archive metadata and its editable property schema from SQLite. */
  async function reloadProjectDocuments():Promise<void>{
    const target=projectDocumentsElement,requestId=++projectDocumentsRequestId;
    if(!target)return;
    try{
      const payload=await readApi<{documents:ProjectDocument[];columns:ProjectDocumentColumn[]}>('/api/project-documents');
      if(projectDocumentsElement===target&&requestId===projectDocumentsRequestId){
        target.setData(payload.documents,payload.columns);
        const existing=new Set(payload.documents.map(row=>row.id));
        target.setLegacyImportCount(legacyProjectDocuments().documents.filter(row=>!existing.has(row.id)).length);
      }
    }catch(error){if(projectDocumentsElement===target&&requestId===projectDocumentsRequestId)target.setError(error instanceof Error?error.message:String(error));}
  }

  /** Encode a selected local file only for transport; the server stores its bytes. */
  async function projectDocumentDataUrl(file:File):Promise<string>{
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler o arquivo.'));reader.readAsDataURL(file);});
  }

  /** Create/update one document, then replace the element's catalog with the persisted readback. */
  async function saveProjectDocumentEvent(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasProjectDocuments;id:string;payload:Record<string,unknown>;file:File|null}>).detail;
    if(!detail||detail.element!==projectDocumentsElement)return;
    try{
      const dataUrl=detail.file?await projectDocumentDataUrl(detail.file):undefined;
      const path=detail.id?`/api/project-documents/${encodeURIComponent(detail.id)}`:'/api/project-documents';
      const saved=await mutateApi<{document:ProjectDocument}>(path,detail.id?'PUT':'POST',{...detail.payload,...(dataUrl?{dataUrl,fileName:detail.file?.name}:{})});
      if(detail.element!==projectDocumentsElement)return;
      await reloadProjectDocuments();detail.element.setFeedback(`Documento ${saved.document.title} salvo no acervo.`);
    }catch(error){if(detail.element===projectDocumentsElement)detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Preserve all metadata and custom values while editing a spreadsheet cell. */
  async function saveProjectDocumentCell(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasProjectDocuments;id:string;field:string;value:string}>).detail;
    if(!detail||detail.element!==projectDocumentsElement)return;
    const row=detail.element.getDocument(detail.id),custom=detail.element.getColumns().some(column=>column.id===detail.field);
    if(!row||(!custom&&!['title','category','code','issuer','documentDate','description','sourceMaterialId'].includes(detail.field)))return;
    const payload={...row,properties:{...row.properties}} as Record<string,unknown>;
    if(custom)(payload.properties as Record<string,string>)[detail.field]=detail.value;
    else payload[detail.field]=detail.value;
    try{detail.element.setSaving(true);await mutateApi(`/api/project-documents/${encodeURIComponent(row.id)}`,'PUT',payload);if(detail.element!==projectDocumentsElement)return;await reloadProjectDocuments();detail.element.setFeedback('Célula salva no acervo.');}
    catch(error){if(detail.element===projectDocumentsElement)detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Download through authenticated fetch so the archive never exposes an unguarded file URL. */
  async function openProjectDocument(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasProjectDocuments;id:string}>).detail;
    if(!detail||detail.element!==projectDocumentsElement)return;
    const row=detail.element.getDocument(detail.id);if(!row)return;
    try{
      await runtime.BELAVISTA_ADMIN_AUTH_READY;
      const token=await runtime.BELAVISTA_GET_ID_TOKEN?.();if(!token)throw new Error('Autenticação necessária para abrir o arquivo.');
      const response=await fetch(apiUrl(`/api/project-documents/${encodeURIComponent(row.id)}/file`),{cache:'no-store',headers:{Authorization:'Bearer '+token}});
      if(response.status===401)runtime.BELAVISTA_ADMIN_AUTH_INVALIDATE?.();
      if(!response.ok)throw new Error(`Arquivo indisponível (HTTP ${response.status}).`);
      const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download=row.fileName;link.rel='noopener';link.click();setTimeout(()=>URL.revokeObjectURL(url),60_000);
    }catch(error){if(detail.element===projectDocumentsElement)detail.element.setError(error instanceof Error?error.message:String(error));}
  }

  /** Read a previous browser-local attachment solely for an explicit one-time import. */
  async function readLegacyDocumentBlob(id:string):Promise<Blob|null>{
    if(!globalThis.indexedDB)throw new Error('O acervo anterior do navegador não está disponível neste dispositivo.');
    return new Promise((resolve,reject)=>{
      const opening=indexedDB.open('alianca-park-project-documents-v1',1);
      opening.onupgradeneeded=()=>opening.result.createObjectStore('files',{keyPath:'id'});
      opening.onerror=()=>reject(opening.error||new Error('Falha ao abrir o acervo anterior.'));
      opening.onsuccess=()=>{const db=opening.result,transaction=db.transaction('files','readonly'),request=transaction.objectStore('files').get(id);request.onsuccess=()=>{db.close();resolve(request.result?.blob||null);};request.onerror=()=>{db.close();reject(request.error||new Error('Falha ao ler o arquivo anterior.'));};};
    });
  }

  /** Import legacy rows only after the user requests it; preserve names, IDs and custom values. */
  async function importLegacyProjectDocuments(event:Event):Promise<void>{
    const detail=(event as CustomEvent<{element:AtlasProjectDocuments}>).detail,target=detail?.element;
    if(!target||target!==projectDocumentsElement)return;
    target.setSaving(true);
    try{
      const legacy=legacyProjectDocuments(),current=await readApi<{documents:ProjectDocument[];columns:ProjectDocumentColumn[]}>('/api/project-documents');
      const columnIds=new Map<string,string>();
      for(const column of legacy.columns){
        let persisted=current.columns.find(item=>item.label.toLocaleLowerCase('pt-BR')===column.label.toLocaleLowerCase('pt-BR'));
        if(!persisted){const created=await mutateApi<{column:ProjectDocumentColumn}>('/api/project-documents/columns','POST',{label:column.label});persisted=created.column;current.columns.push(persisted);}
        columnIds.set(column.id,persisted.id);
      }
      const existing=new Set(current.documents.map(row=>row.id));let imported=0;
      for(const row of legacy.documents){
        if(existing.has(row.id))continue;
        let file:File|null=null;
        if(row.fileName){
          let blob:Blob|null;
          if(row.sourceUrl){const response=await fetch(new URL(row.sourceUrl,location.href));if(!response.ok)throw new Error(`Arquivo ${row.fileName} indisponível (HTTP ${response.status}).`);blob=await response.blob();}
          else blob=await readLegacyDocumentBlob(row.id);
          if(!blob)throw new Error(`Arquivo ${row.fileName} não encontrado no acervo anterior. A importação foi interrompida sem apagar o original.`);
          file=new File([blob],row.fileName,{type:row.fileType||blob.type||'application/octet-stream'});
        }
        const properties=Object.fromEntries(Object.entries(row.properties||{}).filter(([id])=>columnIds.has(id)).map(([id,value])=>[columnIds.get(id)!,String(value)]));
        await mutateApi('/api/project-documents','POST',{
          id:row.id,title:row.title||'',category:row.category||'Outro',code:row.code||'',issuer:row.issuer||'',
          documentDate:row.documentDate||'',description:row.description||'',sourceMaterialId:row.sourceMaterialId||'',properties,
          ...(file?{fileName:file.name,dataUrl:await projectDocumentDataUrl(file)}:{}),
        });
        imported+=1;
      }
      await reloadProjectDocuments();target.setFeedback(`${imported} documento(s) importado(s) para o acervo persistido.`);
    }catch(error){await reloadProjectDocuments();target.setError(error instanceof Error?error.message:String(error));}
  }

  /** Register the full document route; each mutation uses the canonical archive service. */
  function installProjectDocumentsRoute(ViewLayer:{prototype:HTMLElement&Record<string,unknown>},appStore:{get():Record<string,unknown>},host:Document):void{
    legacyProjectDocuments=()=>{const state=appStore.get();return {documents:Array.isArray(state.documentCatalog)?state.documentCatalog as LegacyProjectDocument[]:[],columns:Array.isArray(state.documentsCustomColumns)?state.documentsCustomColumns as {id:string;label:string}[]:[]};};
    ViewLayer.prototype.documents=()=>'<atlas-project-documents></atlas-project-documents>';
    host.addEventListener('atlas:documents-connected',event=>{const element=(event as CustomEvent<{element:AtlasProjectDocuments}>).detail?.element;if(!(element instanceof AtlasProjectDocuments))return;projectDocumentsElement=element;void reloadProjectDocuments();});
    host.addEventListener('atlas:document-save',event=>{void saveProjectDocumentEvent(event);});
    host.addEventListener('atlas:document-cell-save',event=>{void saveProjectDocumentCell(event);});
    host.addEventListener('atlas:document-open',event=>{void openProjectDocument(event);});
    host.addEventListener('atlas:documents-import',event=>{void importLegacyProjectDocuments(event);});
    host.addEventListener('atlas:document-delete',event=>{void (async()=>{const detail=(event as CustomEvent<{element:AtlasProjectDocuments;id:string}>).detail;if(!detail||detail.element!==projectDocumentsElement)return;try{await mutateApi(`/api/project-documents/${encodeURIComponent(detail.id)}`,'DELETE');await reloadProjectDocuments();detail.element.setFeedback('Documento excluído do acervo.');}catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}})();});
    host.addEventListener('atlas:document-column-create',event=>{void (async()=>{const detail=(event as CustomEvent<{element:AtlasProjectDocuments;label:string}>).detail;if(!detail||detail.element!==projectDocumentsElement)return;try{await mutateApi('/api/project-documents/columns','POST',{label:detail.label});await reloadProjectDocuments();detail.element.setFeedback('Propriedade adicionada.');}catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}})();});
    host.addEventListener('atlas:document-column-delete',event=>{void (async()=>{const detail=(event as CustomEvent<{element:AtlasProjectDocuments;id:string}>).detail;if(!detail||detail.element!==projectDocumentsElement)return;try{await mutateApi(`/api/project-documents/columns/${encodeURIComponent(detail.id)}`,'DELETE');await reloadProjectDocuments();detail.element.setFeedback('Propriedade excluída.');}catch(error){detail.element.setError(error instanceof Error?error.message:String(error));}})();});
  }

  /** Install the TypeScript settings page and delegate all domain events to persistent services. */
  function installSettingsRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void {
    ViewLayer.prototype.settings = () => '<atlas-settings></atlas-settings>';
    host.addEventListener('atlas:settings-connected', event => {
      const element = (event as CustomEvent<{ element: AtlasSettings }>).detail?.element;
      if (!(element instanceof AtlasSettings)) return;
      settingsElement = element;
      void reloadSettings();
    });
    host.addEventListener('atlas:settings-stage-save', event => { void saveSettingsStage(event, appStore); });
    host.addEventListener('atlas:settings-stage-delete', event => { void deleteSettingsStage(event); });
    host.addEventListener('atlas:settings-comprehension-save', event => { void saveStageComprehension(event); });
    host.addEventListener('atlas:settings-workbench-save', event => { void saveSettingsWorkbench(event); });
    host.addEventListener('atlas:settings-infer', event => { void inferSettingsSession(event); });
    host.addEventListener('atlas:settings-role-save', event => { void saveAccessRole(event); });
    host.addEventListener('atlas:settings-role-delete', event => { void deleteAccessRole(event); });
    host.addEventListener('atlas:settings-key-create', event => { void createAccessKey(event); });
    host.addEventListener('atlas:settings-key-revoke', event => { void revokeAccessKey(event); });
    host.addEventListener('atlas:settings-contact-save', event => { void savePublicLeadContact(event); });
  }

  /** Install the real lead CRM, service-backed Instagram feed, policy and externally confirmed reply flow. */
  function installLeadsRoute(ViewLayer: { prototype: HTMLElement & Record<string, unknown> }, appStore: { get(): Record<string, unknown>; set(state: Record<string, unknown>): void }, host: Document): void {
    ViewLayer.prototype.leads = () => '<atlas-leads></atlas-leads>';
    host.addEventListener('atlas:leads-connected', event => {
      const element = (event as CustomEvent<{ element: AtlasLeads }>).detail?.element;
      if (!(element instanceof AtlasLeads)) return;
      leadsElement = element;
      void reloadLeads();
    });
    host.addEventListener('atlas:leads-refresh', event => {
      const element = (event as CustomEvent<{ element: AtlasLeads }>).detail?.element;
      if (element === leadsElement) void reloadLeads();
    });
    host.addEventListener('atlas:instagram-refresh', event => {
      const element = (event as CustomEvent<{ element: AtlasLeads }>).detail?.element;
      if (element === leadsElement) { void reloadInstagram(element); void reloadInstagramPolicy(element); }
    });
    host.addEventListener('atlas:instagram-policy-save', event => { void saveInstagramPolicy(event); });
    host.addEventListener('atlas:instagram-reply', event => { void sendInstagramReply(event); });
    host.addEventListener('atlas:lead-chat', event => { openLeadChat(event); });
    host.addEventListener('atlas:leads-open-public', event => {
      const element = (event as CustomEvent<{ element: AtlasLeads }>).detail?.element;
      if (element !== leadsElement) return;
      window.open(new URL('/leads', location.origin).href, '_blank', 'noopener');
    });
    host.addEventListener('atlas:navigate', event => {
      const detail = (event as CustomEvent<{ view: string }>).detail;
      if (detail?.view !== 'map' || !(event.target instanceof AtlasLeads)) return;
      navigateRoute(appStore, { view: 'map' }, { lastAction: 'Abriu o mapa a partir do perfil de lead' });
    });
  }

  /** Mount the standalone history entry point, wire local events, and load backend state. */
  async function start(root: HTMLElement): Promise<void> {
    if (salesHistory) throw new Error('O programa já está montado.');
    salesHistory = new AtlasSalesHistory();
    root.replaceChildren(salesHistory);
    salesHistory.addEventListener('atlas:navigate', event => {
      const detail = (event as CustomEvent<{ view: string; id?: string }>).detail;
      const url = new URL(location.href);
      url.searchParams.set('view', detail.view);
      if (detail.id) url.searchParams.set('saleId', detail.id);
      location.assign(url.href);
    });
    salesHistory.addEventListener('atlas:history-save', event => { void saveSale(event); });
    salesHistory.addEventListener('atlas:history-file', event => { void downloadSaleFile(event); });
    await reloadSalesHistory();
  }

  /** Freeze the public control surface so host routes cannot mutate orchestration methods. */
  const api: SystemAPI = Object.freeze({ start, reloadSalesHistory, reloadRepasses, installSalesHistoryRoute, installRepassesRoute, reloadBrokers, installBrokersRoute, installMaterialsRoute, reloadAgenda, installAgendaRoute, installActivitiesRoute, reloadDashboard, installDashboardRoute, reloadProgress, installProgressRoute, installCashRecordRoute, installSettingsRoute, installLeadsRoute, installLotDevelopmentRoute, installProjectDocumentsRoute });
  // The app program yields its API once, then remains the live owner of this instance.
  while (true) yield api;
}
