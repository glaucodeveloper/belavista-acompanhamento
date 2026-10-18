/** Contratos do banco operacional; nenhum catálogo de demonstração. */
export interface CommercialSaleFile {
  id: string;
  saleId: string;
  kind: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  fileUrl: string;
}

export interface CommercialSale {
  id: string;
  lot: string;
  client: string;
  clientPhone: string;
  broker: string;
  status: string;
  valueCents: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  files: CommercialSaleFile[];
}

export interface CashEntry {
  id: string;
  saleId?: string | null;
  kind: string;
  amountCents: number;
  description?: string;
  createdAt?: string;
}

export interface CashFlowAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileUrl: string;
  createdAt: string;
}

export interface CashFlowRecord {
  id: string;
  date: string;
  kind: 'entrada' | 'saida';
  lotKey: string;
  category: string;
  stage: string;
  description: string;
  amountCents: number;
  saleId: string;
  brokerName: string;
  repasseReasonId: string;
  fiscalDocumentType: string;
  fiscalDocumentNumber: string;
  fiscalIssuer: string;
  fiscalIssueDate: string;
  fiscalStatus: 'pendente' | 'em_conferencia' | 'conferido' | 'nao_aplicavel';
  attachments: CashFlowAttachment[];
  createdAt: string;
}

export interface CashFlowSummary {
  balanceCents: number;
  entriesCents: number;
  exitsCents: number;
  [key: string]: unknown;
}

export interface BrokerRule {
  brokerName: string;
  lotKey: string;
  commissionPercent: number;
  active: boolean;
}

export interface BrokerProfile {
  id: string;
  name: string;
  creci: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalStage {
  id: number;
  key?: string;
  name: string;
  status: string;
  progress: number;
  owner?: string;
  week?: string;
  description?: string;
  dependsOn?: string[];
  activities?: OperationalActivity[];
}

/** Persisted stage-comprehension configuration returned by `/api/stages-admin/:id`. */
export interface StageAIConfig {
  requirements: string[];
  conditions: string[];
  executionProfile: {
    materialsTable?: StageComprehensionMaterial[];
    expectedActivities?: string[];
    production?: { quantity: number | null; unit: string; rate: number | null; rateUnit: string };
    [key: string]: unknown;
  };
  notificationTargets: Record<string, string[]>;
  procurementFocus: string[];
  evidenceFocus: string[];
  requestHints: string[];
  typicalDescription: string;
  organizationRequest: string;
  organizationContext: string;
  updatedAt?: string;
}

export interface StageComprehensionMaterial {
  name: string;
  description: string;
  quantity: string;
  unit: string;
  status: string;
  activityName?: string;
  [key: string]: unknown;
}

export interface WorkbenchMaterial {
  id: string;
  name: string;
  description: string;
  usage: string;
  quantity: string;
  unit: string;
  [key: string]: unknown;
}

export interface WorkbenchProperty { id: string; label: string; value: string }
export interface WorkbenchCondition {
  kind?: string;
  label: string;
  trigger: string;
  severity: 'info' | 'warning' | 'critical' | string;
  [key: string]: unknown;
}

/** Original Worker activity comprehension and its persisted user configuration. */
export interface WorkbenchSession {
  id: string;
  activityId: string;
  title: string;
  text: string;
  unit: string;
  materials: Array<WorkbenchMaterial | string>;
  release: string;
  responsible: string;
  properties: WorkbenchProperty[];
  automation: Record<string, unknown>;
  programming: Record<string, unknown>;
  inference: Record<string, unknown> | null;
  operational?: Record<string, unknown>;
  order: number;
  custom: boolean;
  [key: string]: unknown;
}

export interface StageWorkbenchState {
  stageKey: string;
  layout: Record<string, unknown>;
  links: unknown[];
  activityLocations: Record<string, unknown>;
  inputSessions: WorkbenchSession[];
  calendarDate: string | null;
  updatedAt: string | null;
}

export interface ConfiguredStage extends OperationalStage {
  stageKey: string;
  aiConfig: StageAIConfig | null;
  workbenchState: StageWorkbenchState;
  workbenchSessions: WorkbenchSession[];
  workbenchSource: 'persisted' | 'worker-defaults' | 'unavailable';
}

export interface DelegatedAccessRole {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DelegatedAccessKey {
  id: string;
  label: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  createdBy: string;
  /** Present only in the creation response; never returned by subsequent reads. */
  token?: string;
}

export interface PublicLeadContactSettings {
  whatsappNumber: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** Sanitized administrative projection of a public lead or reservation. */
export interface PublicCommercialLead {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  instagramHandle: string;
  lot: string;
  status: string;
  source: string;
  objective: string;
  budget: string;
  sun: string;
  terrain: string;
  altitude: string;
  conversationSummary: string;
  documentType: string;
  documentLast4: string;
  createdAt: string;
  updatedAt: string;
  recordKind: 'lead' | 'reservation';
}

export interface PublicCommercialRecords {
  leads: PublicCommercialLead[];
  reservations: PublicCommercialLead[];
  source: 'github';
  branch: string;
  readAt: string;
}

/** Persisted profile over the official lot price catalog or a shared area. */
export interface LotDevelopmentProfile {
  id: string;
  kind: 'lot' | 'common-area';
  title: string;
  lotLabel: string;
  quadra: string;
  area: number;
  value: number;
  status: string;
  description: string;
  source: string;
  customized?: boolean;
  inferredAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface InstagramComment {
  id: string;
  mediaId: string;
  text: string;
  username: string;
  timestamp: string;
  likeCount: number;
  replies: InstagramComment[];
}

export interface InstagramPost {
  id: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  caption: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
  comments: InstagramComment[];
  commentsError?: string;
}

export interface InstagramFeed {
  source: 'meta' | 'unavailable';
  accountId?: string;
  posts: InstagramPost[];
  updatedAt?: string;
  configured?: boolean;
  error?: string;
  metaCode?: string | number;
}

export interface InstagramCommentPolicy {
  preset: string;
  tone: string;
  instructions: string;
  autoDraft: boolean;
  requireApproval: true;
  updatedAt?: string | null;
  source?: string;
}

export interface SettingsSnapshot {
  stages: ConfiguredStage[];
  roles: DelegatedAccessRole[];
  keys: DelegatedAccessKey[];
  contact: PublicLeadContactSettings | null;
  actorRole: string;
  isNative: boolean;
}

/** Persisted activity row returned by the administrative stage API. */
export interface OperationalActivity {
  id: string;
  stageId: number;
  stage?: string;
  name: string;
  category: string;
  status: string;
  progress: number;
  ownerId?: string | null;
  owner?: string | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  properties?: Record<string, unknown>;
}

export interface OperationalRecord {
  id: string;
  data?: string;
  hora?: string;
  obra?: string;
  etapa?: string;
  stageId?: number | null;
  stageKey?: string;
  activityId?: string | null;
  atividade?: string;
  responsavel?: string;
  status?: string;
  detalhes?: string;
  evidenceUri?: string | null;
  mapArea?: string | null;
  createdAt?: string;
  properties?: Array<{ id: string; label: string; type?: string; value: unknown }>;
  [key: string]: unknown;
}

export interface OperationalNotification {
  id: string;
  title?: string;
  message?: string;
  status?: string;
  read?: boolean;
  [key: string]: unknown;
}

export interface DashboardSnapshot {
  cashBalanceCents: number;
  cashEntries: CashFlowRecord[];
  stages: OperationalStage[];
  records: OperationalRecord[];
  notifications: OperationalNotification[];
  agendaEvents: OperationalAgendaEvent[];
  materials: OperationalMaterial[];
  repasses: RepasseOperations;
}

export interface OperationalMaterial {
  id: string;
  name: string;
  unit: string;
  plannedQuantity: number;
  receivedQuantity: number;
  usedQuantity: number;
  status: string;
  stageId: number | null;
  stageName: string | null;
  activityName: string;
  scope: string;
  updatedAt: string;
  properties: Record<string, string>;
}

export interface MaterialCustomColumn {
  id: string;
  label: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalAgendaEvent {
  id: string;
  title: string;
  stageKey: string;
  stageName: string;
  activityId: string;
  activityName: string;
  owner: string;
  date: string;
  start: string;
  durationHours: number;
  spanDays: number;
  status: string;
  relatedFrom: string;
  notes: string;
  materialIds: string[];
  userEdited?: boolean;
}

export interface RepasseOperations {
  sales: RepasseSale[];
  entries: RepasseReceipt[];
  brokerRules: BrokerRule[];
  reasons: CommissionReason[];
}

export interface CommissionReason {
  id: string;
  label: string;
  active: boolean;
  sharePercent: number;
}

export interface RepassePlan {
  saleId: string;
  contractPriceCents: number;
  annualInterestPercent: number | null;
  monthlyInstallments: number;
  semiannualInstallments: number;
  semiannualPrincipalPercent: number;
  monthlyFirstDueDate: string | null;
  semiannualFirstDueDate: string | null;
}

export interface RepasseReceipt extends CashEntry {
  date: string;
  lotKey: string;
  repasseReasonId: string;
  brokerName: string;
  description: string;
}

export interface RepasseSale extends CommercialSale {
  tablePrice: { label: string; price: number; area: number; quadra: string } | null;
  plan: RepassePlan | null;
  brokerRule: BrokerRule | null;
  receipts: RepasseReceipt[];
}

export interface RepasseForecastRow {
  date: string;
  reasonId: string;
  reasonLabel: string;
  principalCents: number;
  interestCents: number;
  amountCents: number;
  balanceCents: number;
  commissionCents: number | null;
  primaryCents: number | null;
  partnerCents: number | null;
}

export interface RepasseCurrentRow extends RepasseReceipt {
  reasonLabel: string;
  commissionCents: number | null;
  primaryCents: number | null;
  partnerCents: number | null;
}

export interface RepasseReport {
  saleId: string;
  basePriceCents: number;
  receivedCents: number;
  remainingCents: number;
  current: RepasseCurrentRow[];
  future: RepasseForecastRow[];
  forecastStatus: 'ready' | 'settled' | 'commission-rule-required' | 'payment-plan-required' | 'payment-plan-incomplete';
}

/** Project archive metadata; file bytes live in the persistent document service. */
export interface ProjectDocument {
  id: string;
  title: string;
  category: string;
  code: string;
  issuer: string;
  documentDate: string;
  description: string;
  sourceMaterialId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocumentColumn {
  id: string;
  label: string;
  position: number;
  createdAt: string;
}
