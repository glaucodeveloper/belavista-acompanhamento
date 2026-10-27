// BELAVISTA_WORKER_CONTEXT_CHAT_V5414
// Assistente local e persistente para o monitor de workers e suas rotas
// dedicadas. O módulo não depende do shell que cada página reconstrói.
const workerChatRootOwnerV1 = document.documentElement.dataset.atlasWorkerContextChatRootOwnerV1 || '';
const workerChatForceLegacyV1 = document.documentElement.dataset.atlasWorkerContextChatForceLegacyV1 === 'true';

if (workerChatRootOwnerV1.startsWith('typescript') && !workerChatForceLegacyV1) {
  document.documentElement.dataset.atlasWorkerContextChatAdapterV1 = 'typescript-root';
} else {
const { apiFetch } = await import('./api-client.mjs');
const workerChatRendererTsV1 = await import('./dist/frontend/components.js?ts-worker-chat-map-context-reader-v1&ts-worker-chat-safe-actions-owner-v1&ts-worker-chat-dom-mount-v1&ts-worker-chat-bindings-v1&ts-worker-chat-record-saved-owner-v1&ts-worker-chat-conversation-render-v1').catch(() => null);
const needsWorkerChatLogRecoveryV1 = typeof workerChatRendererTsV1?.renderAtlasWorkerContextChatLogV1 !== 'function';
const workerChatLogRecoveryV1 = needsWorkerChatLogRecoveryV1
  ? await import('./worker-chat-log-legacy-v1.mjs?v=worker-chat-log-recovery-v1').catch(() => null)
  : null;
const needsWorkerChatMapContextRecoveryV1 = typeof workerChatRendererTsV1?.applyAtlasWorkerContextChatMapContextV1 !== 'function';
const workerChatMapContextRecoveryV1 = needsWorkerChatMapContextRecoveryV1
  ? await import('./worker-chat-map-context-legacy-v1.mjs?v=worker-chat-map-context-recovery-v1').catch(() => null)
  : null;
const workerChatUiRecoveryOwnersV1 = [
  'applyAtlasWorkerContextChatCollapsedStateV1',
  'applyAtlasWorkerContextChatTabV1',
  'applyAtlasWorkerContextChatPendingStateV1',
  'openAtlasWorkerContextChatRecordDrawerV1',
  'runAtlasWorkerContextChatQuickActionV1',
  'applyAtlasWorkerContextChatEditV1',
  'installAtlasWorkerContextChatInteractionEventsV1',
  'installAtlasWorkerContextChatComposerEventsV1',
];
const workerChatSwipeSheetRecoveryV1 = typeof workerChatRendererTsV1?.installAtlasWorkerChatSwipeSheetV1 === 'function'
  ? null
  : await import('./components/chat/worker-chat-swipe-sheet-v1.mjs?v=worker-chat-swipe-sheet-recovery-v1').catch(() => null);
const installWorkerChatSwipeSheetV1 = workerChatRendererTsV1?.installAtlasWorkerChatSwipeSheetV1 || workerChatSwipeSheetRecoveryV1?.installWorkerChatSwipeSheetV1;
const workerChatProgramTsV1 = await import('./dist/frontend/program.js?ts-worker-chat-clarification-policy-v1&ts-worker-chat-storage-catalog-v1&ts-worker-chat-inference-controller-v1&ts-worker-chat-operational-controller-v3&ts-worker-chat-runtime-composition-v1&ts-worker-chat-host-runtime-owner-v2&ts-worker-chat-submit-runtime-owner-v1&ts-worker-chat-port-factories-v1&ts-worker-chat-component-state-program-v7&ts-worker-chat-host-adapters-v1&ts-worker-chat-host-storage-ports-v1&ts-worker-chat-ui-wait-program-v1').catch(() => null);
let workerChatHostStorageV1 = null;
try { workerChatHostStorageV1 = localStorage; } catch {}
const workerChatHostAdaptersV1 = workerChatProgramTsV1?.createAtlasWorkerContextChatHostAdaptersV1?.({
  documentRef: document,
  pathname: () => location.pathname,
  search: () => location.search,
  readStages: () => Array.isArray(globalThis.__BELAVISTA_RECORD_OCR_BRIDGE_V21?.stages)
    ? globalThis.__BELAVISTA_RECORD_OCR_BRIDGE_V21.stages : [],
  readOperationalContext: workerChatRendererTsV1?.readAtlasWorkerContextChatOperationalContextV1,
  storage: workerChatHostStorageV1,
});
const readHostStorageV1 = key => {
  const read = workerChatHostAdaptersV1?.readStorage;
  return typeof read === 'function' ? read(key) : localStorage.getItem(key);
};
const writeHostStorageV1 = (key, value) => {
  const write = workerChatHostAdaptersV1?.writeStorage;
  if (typeof write === 'function') return write(key, value);
  try { localStorage.setItem(key, value); return true; } catch { return false; }
};
const removeHostStorageV1 = key => {
  const remove = workerChatHostAdaptersV1?.removeStorage;
  return typeof remove === 'function' ? remove(key) : localStorage.removeItem(key);
};
const needsWorkerChatUiRecoveryV1 = workerChatUiRecoveryOwnersV1.some(name => typeof workerChatRendererTsV1?.[name] !== 'function')
  || typeof workerChatProgramTsV1?.projectAtlasWorkerContextChatEditCommandV1 !== 'function';
const workerChatUiRecoveryV1 = needsWorkerChatUiRecoveryV1
  ? await import('./worker-chat-interactions-legacy-v1.mjs?v=worker-chat-interactions-recovery-v3-composer-events').catch(() => null)
  : null;
const workerChatRecordReviewRecoveryV1 = typeof workerChatProgramTsV1?.applyAtlasWorkerContextChatRecordReviewFlowV1 === 'function'
  ? null
  : await import('./worker-chat-record-review-legacy-v1.mjs?v=worker-chat-record-review-recovery-v1').catch(() => null);
const needsWorkerChatInferenceRecoveryV1 = typeof workerChatProgramTsV1?.requestAtlasWorkerContextChatWorkspaceReplyV1 !== 'function'
  && typeof workerChatProgramTsV1?.requestAtlasWorkerContextChatReplyV1 !== 'function';
const workerChatInferenceRecoveryV1 = needsWorkerChatInferenceRecoveryV1
  ? await import('./worker-chat-inference-legacy-v1.mjs?v=worker-chat-inference-recovery-v1').catch(() => null)
  : null;
const needsWorkerChatServiceRequestRecoveryV1 = [
  'createAtlasWorkerContextChatServiceRequestV1',
  'refreshAtlasWorkerContextChatServiceRequestV1',
  'refreshAtlasWorkerContextChatServiceRequestsV1',
].some(name => typeof workerChatProgramTsV1?.[name] !== 'function');
const workerChatServiceRequestRecoveryV1 = needsWorkerChatServiceRequestRecoveryV1
  ? await import('./worker-chat-service-requests-legacy-v1.mjs?v=worker-chat-service-requests-recovery-v1').catch(() => null)
  : null;
const workerChatLotStatusRecoveryV1 = typeof workerChatProgramTsV1?.parseAtlasLotStatusCommandV1 === 'function' && typeof workerChatProgramTsV1?.applyAtlasLotStatusCommandV1 === 'function'
  ? null
  : await import('./lot-status-command.mjs?v=worker-chat-lot-status-command-recovery-v1').catch(() => null);
const workerChatAccessPolicyRecoveryV1 = typeof workerChatProgramTsV1?.isAtlasLimitedOperationalActorV1 === 'function'
  ? null
  : await import('./admin-role-policy.mjs?v=worker-chat-access-policy-recovery-v1').catch(() => null);
const isLimitedOperationalActor = workerChatProgramTsV1?.isAtlasLimitedOperationalActorV1 || workerChatAccessPolicyRecoveryV1?.isLimitedOperationalActor;
const needsWorkerChatRecordStageInterpretationRecoveryV1 = [
  'resolveAtlasWorkerContextChatStageMentionV1',
  'resolveAtlasWorkerContextChatRequestStageV1',
  'resolveAtlasWorkerContextChatVisualStageV1',
  'buildAtlasWorkerContextChatRecordInterpretationV1',
].some(name => typeof workerChatProgramTsV1?.[name] !== 'function');
const workerChatRecordStageInterpretationRecoveryV1 = needsWorkerChatRecordStageInterpretationRecoveryV1
  ? await import('./record-stage-interpretation-v1.mjs?v=worker-chat-record-stage-interpretation-recovery-v1').catch(() => null)
  : null;
const needsWorkerChatAgendaPolicyRecoveryV1 = typeof workerChatProgramTsV1?.aiAgendaInstructionV1 !== 'function' || typeof workerChatProgramTsV1?.normalizeAiAgendaComprehensionV1 !== 'function';
const workerChatAgendaPolicyRecoveryV1 = needsWorkerChatAgendaPolicyRecoveryV1
  ? await import('./components/shared/ai-agenda-comprehension-v1.mjs?v=worker-chat-agenda-policy-recovery-v1').catch(() => null)
  : null;
const aiAgendaInstructionV1 = value => {
  const policy = workerChatProgramTsV1?.aiAgendaInstructionV1 || workerChatAgendaPolicyRecoveryV1?.aiAgendaInstructionV1;
  if (typeof policy !== 'function') throw new Error('Política de compreensão da agenda indisponível.');
  return policy(value);
};
const normalizeAiAgendaComprehensionV1 = value => {
  const normalize = workerChatProgramTsV1?.normalizeAiAgendaComprehensionV1 || workerChatAgendaPolicyRecoveryV1?.normalizeAiAgendaComprehensionV1;
  if (typeof normalize !== 'function') throw new Error('Normalização da compreensão da agenda indisponível.');
  return normalize(value);
};
const workerChatCommandExecutorRecoveryV1 = typeof workerChatProgramTsV1?.executeAtlasWorkerContextChatCommandsV1 === 'function'
  ? null
  : await import('./worker-chat-command-executor-legacy-v1.mjs?v=worker-chat-command-executor-recovery-v1').catch(() => null);
const needsWorkerChatResponseRecoveryV1 = typeof workerChatProgramTsV1?.createAtlasWorkerContextChatAssistantResponseV1 !== 'function';
const workerChatResponseRecoveryV1 = needsWorkerChatResponseRecoveryV1
  ? await import('./worker-chat-response-legacy-v1.mjs?v=worker-chat-response-recovery-v1').catch(() => null)
  : null;
const workerChatPresentationTsV1 = workerChatRendererTsV1?.ATLAS_WORKER_CONTEXT_CHAT_PRESENTATION_V1;
const workerChatPolicyTsV1 = workerChatProgramTsV1?.ATLAS_WORKER_CONTEXT_CHAT_POLICY_V1;
const resolveWorkerChatRecordStagePolicyV1 = (typedName, recoveryName, args) => {
  const owner = workerChatProgramTsV1?.[typedName];
  if (typeof owner === 'function') return owner(...args);
  const recovery = workerChatRecordStageInterpretationRecoveryV1?.[recoveryName];
  if (typeof recovery === 'function') return recovery(...args);
  throw new Error(`Política de interpretação operacional indisponível: ${typedName}.`);
};
const resolveRequestStageV1 = (...args) => resolveWorkerChatRecordStagePolicyV1('resolveAtlasWorkerContextChatRequestStageV1', 'resolveRequestStageV1', args);
const buildRecordInterpretationV1 = (...args) => resolveWorkerChatRecordStagePolicyV1('buildAtlasWorkerContextChatRecordInterpretationV1', 'buildRecordInterpretationV1', args);
const parseLotStatusCommandV1 = message => {
  const typedParser = workerChatProgramTsV1?.parseAtlasLotStatusCommandV1;
  const parser = typeof typedParser === 'function' ? typedParser : workerChatLotStatusRecoveryV1?.parseLotStatusCommand;
  return typeof parser === 'function' ? parser(message) : null;
};
const applyLotStatusCommandV1 = (store, command) => {
  const typedApply = workerChatProgramTsV1?.applyAtlasLotStatusCommandV1;
  return typeof typedApply === 'function'
    ? typedApply(store, command, { documentRef: document })
    : workerChatLotStatusRecoveryV1?.applyLotStatusCommand?.(store, command);
};

const workerChatStorageV1 = workerChatProgramTsV1?.ATLAS_WORKER_CONTEXT_CHAT_STORAGE_V1 || {
  responseKey: 'belavista.worker-context-chat.v1',
  serviceRequestKey: 'belavista.worker-context-chat.service-id.v1',
  voiceEnabledKey: 'belavista.worker-context-chat.voice.v1',
  speakerProfileKey: 'belavista.worker-context-chat.speaker-profile.v1',
  lastRouteKey: 'belavista.worker-context-chat.last-route.v1',
  messageLimit: 60,
  defaultSpeakerProfile: 'operacional',
};
const THREAD_KEY = workerChatStorageV1.responseKey;
const SERVICE_KEY = workerChatStorageV1.serviceRequestKey;
const VOICE_KEY = workerChatStorageV1.voiceEnabledKey;
const SPEAKER_PROFILE_KEY = workerChatStorageV1.speakerProfileKey;
const NAV_KEY = workerChatStorageV1.lastRouteKey;
const MAX_MESSAGES = Number(workerChatStorageV1.messageLimit) || 60;
const CHAT_IMAGE_MAX_BYTES = Number(workerChatPresentationTsV1?.maxImageBytes) || 6 * 1024 * 1024;
// Perfis são uma camada sobre as vozes instaladas no navegador/dispositivo.
// Eles não exigem chave de TTS nem enviam o conteúdo da conversa a terceiros.
const LEGACY_SPEAKER_PROFILES = [
  { id: 'operacional', label: 'Operacional · neutra', rate: .98, pitch: 1, terms: [] },
  { id: 'narradora', label: 'Narradora · clara', rate: .94, pitch: 1.06, terms: ['maria', 'francisca', 'luciana', 'helena', 'female', 'femin'] },
  { id: 'diretoria', label: 'Diretoria · grave', rate: .92, pitch: .9, terms: ['daniel', 'antonio', 'felipe', 'ricardo', 'male', 'mascul'] },
  { id: 'natural', label: 'Natural · preferir neural', rate: .96, pitch: 1, terms: ['natural', 'neural', 'online', 'google'] }
];
const SPEAKER_PROFILES = Array.isArray(workerChatPresentationTsV1?.speakerProfiles)
  ? workerChatPresentationTsV1.speakerProfiles
  : LEGACY_SPEAKER_PROFILES;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const qs = (selector, scope = document) => scope.querySelector(selector);
const now = () => new Date().toISOString();
const serviceStatusLabel = status => {
  const typedAdapter = workerChatHostAdaptersV1?.serviceStatusLabel;
  if (typeof typedAdapter === 'function') return typedAdapter(status);
  const typedProjector = workerChatProgramTsV1?.projectAtlasWorkerContextChatStatusLabelV1;
  if (typeof typedProjector === 'function') return typedProjector(status);
  return ({triage:'Em triagem',planned:'Planejada',in_progress:'Em execução',waiting_files:'Aguardando arquivos',completed:'Concluída',cancelled:'Cancelada'}[status]||status);
};
const waitForUi = async (predicate, timeout = 1200) => {
  const typedWait = workerChatProgramTsV1?.waitForAtlasWorkerContextChatUiV1;
  if (typeof typedWait === 'function') {
    return typedWait(predicate, { host: globalThis, timeoutMs: timeout });
  }
  const until = performance.now() + timeout;
  while (performance.now() < until) {
    if (predicate()) return true;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  return Boolean(predicate());
};
const labelForPath = path => {
  const typedAdapter = workerChatHostAdaptersV1?.labelForPath;
  if (typeof typedAdapter === 'function') return typedAdapter(path);
  const typedLabel = workerChatProgramTsV1?.projectAtlasWorkerContextChatSurfaceLabelV1;
  if (typeof typedLabel === 'function') return typedLabel(path);
  if (/\/activity/.test(path)) return 'atividade dedicada';
  if (/\/stage/.test(path)) return 'etapa dedicada';
  return 'monitoria dos workers';
};

function readJson(key, fallback) {
  const typedReader = workerChatHostAdaptersV1?.readJson;
  if (typeof typedReader === 'function') return typedReader(key, fallback);
  try {
    const value = JSON.parse(localStorage.getItem(key) || '');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function currentContext() {
  const typedAdapter = workerChatHostAdaptersV1?.readContext;
  if (typeof typedAdapter === 'function') {
    const context = typedAdapter();
    const root = document.querySelector('[data-worker-context-assistant]');
    if (root) root.dataset.chatContextReaderOwnerV1 = 'typescript';
    return context;
  }
  const stages = Array.isArray(globalThis.__BELAVISTA_RECORD_OCR_BRIDGE_V21?.stages)
    ? globalThis.__BELAVISTA_RECORD_OCR_BRIDGE_V21.stages
    : [];
  const typedReader = workerChatRendererTsV1?.readAtlasWorkerContextChatOperationalContextV1;
  if (typeof typedReader === 'function') {
    const context = typedReader({ document, pathname: location.pathname, search: location.search, stages });
    const root = document.querySelector('[data-worker-context-assistant]');
    if (root) root.dataset.chatContextReaderOwnerV1 = 'typescript';
    return context;
  }
  const root = document.querySelector('[data-worker-context-assistant]');
  if (root) root.dataset.chatContextReaderOwnerV1 = 'typescript-unavailable';
  return {
    route: `${location.pathname}${location.search}`,
    surface: labelForPath(location.pathname),
    heading: '', worker: '', cycle: '', connection: '', cash: '', events: '', agenda: '', records: '',
    stage: '', activity: '',
    stages
  };
}

function contextSummary(context) {
  const typedAdapter = workerChatHostAdaptersV1?.contextSummary;
  if (typeof typedAdapter === 'function') return typedAdapter(context);
  const typedSummary = workerChatProgramTsV1?.projectAtlasWorkerContextChatContextSummaryV1;
  if (typeof typedSummary === 'function') return typedSummary(context);
  return 'estado operacional ainda não informado';
}

function visualClarificationForV1(ocr) {
  const typedAdapter = workerChatHostAdaptersV1?.visualClarification;
  if (typeof typedAdapter === 'function') return typedAdapter(ocr);
  const typedProjector = workerChatProgramTsV1?.projectAtlasWorkerContextChatVisualClarificationV1;
  if (typeof typedProjector === 'function') return typedProjector(ocr);
  return String(workerChatPresentationTsV1?.clarification?.stage || '');
}

class WorkerContextChat {
  constructor() {
    this.observationController = null;
    this.pasteHandler = null;
    const createHostRuntime = workerChatProgramTsV1?.createAtlasWorkerContextChatHostRuntimeV1;
    if (typeof createHostRuntime === 'function') {
      let voiceStorageV1 = null;
      let observationStorageV1 = null;
      try { voiceStorageV1 = localStorage; } catch {}
      try { observationStorageV1 = sessionStorage; } catch {}
      const runtimeControllerV1 = createHostRuntime({
        controller: this,
        pathname: location.pathname,
        search: location.search,
        serviceKey: SERVICE_KEY,
        labelForPath,
        speakerProfiles: SPEAKER_PROFILES,
        apiFetch,
        getApplicationState: () => globalThis.__belavistaAppStore?.get?.() || {},
        getContext: currentContext,
        getMapContext: () => this.readMapContext(),
        getRouteActivityId: () => new URLSearchParams(location.search).get('activity'),
        getServiceRequestPorts: () => this.serviceRequestPorts(),
        currentPathname: () => location.pathname,
        parseLotStatusCommand: parseLotStatusCommandV1,
        applyLotStatusCommand: command => {
          const store = globalThis.__belavistaAppStore;
          return store ? applyLotStatusCommandV1(store, command) : 'A alteração de status está disponível apenas no painel administrativo.';
        },
        serviceRequestId: () => readHostStorageV1(SERVICE_KEY),
        visualClarification: visualClarificationForV1,
        observationHost: {
          eventTarget: globalThis,
          documentRef: document,
          storage: observationStorageV1,
          setTimeout: globalThis.setTimeout.bind(globalThis),
          clearTimeout: globalThis.clearTimeout.bind(globalThis),
          requestAnimationFrame: globalThis.requestAnimationFrame.bind(globalThis),
          cancelAnimationFrame: globalThis.cancelAnimationFrame.bind(globalThis),
          requestIdleCallback: globalThis.requestIdleCallback?.bind(globalThis),
          MutationObserverCtor: globalThis.MutationObserver,
        },
        getCommandPorts: () => this.commandExecutionPorts(),
        voiceStorage: voiceStorageV1,
        speechSynthesis: globalThis.speechSynthesis || null,
        utteranceConstructor: globalThis.SpeechSynthesisUtterance || null,
      });
      this.runtimeControllerV1 = runtimeControllerV1;
      this.sessionStateOwnerV1 = runtimeControllerV1.sessionStateOwnerV1;
      this.voiceController = runtimeControllerV1.voice;
      this.serviceRequestControllerV1 = runtimeControllerV1.serviceRequests;
      this.inferenceControllerV1 = runtimeControllerV1.inference;
      this.commandControllerV1 = runtimeControllerV1.commands;
      this.componentStateControllerV1 = runtimeControllerV1.componentStateControllerV1;
      return;
    }
    // A conversa é uma área de trabalho da página, não um histórico de auditoria.
    // A resposta mais recente permanece persistida, sem restaurar mensagens antigas na abertura.
    const createSessionTs = workerChatProgramTsV1?.createAtlasWorkerContextChatSessionV1;
    const attachSessionStateTs = workerChatProgramTsV1?.attachAtlasWorkerContextChatSessionStateV1;
    let voiceStorage = null;
    try { voiceStorage = localStorage; } catch {}
    const createVoiceController = workerChatProgramTsV1?.createAtlasWorkerContextChatVoiceControllerV1;
    const voiceConfig = {
      enabledStorageKey: VOICE_KEY,
      profileStorageKey: SPEAKER_PROFILE_KEY,
      defaultProfile: 'operacional',
      profiles: SPEAKER_PROFILES.map(item => ({ ...item, terms: [...(item.terms || [])] })),
    };
    const voicePorts = {
      storage: voiceStorage,
      speechSynthesis: globalThis.speechSynthesis || null,
      utteranceConstructor: globalThis.SpeechSynthesisUtterance || null,
      setStatus: message => { if (this.status) this.status.textContent = message; },
    };
    const createOperationalController = workerChatProgramTsV1?.createAtlasWorkerContextChatOperationalControllerV1;
    const createRuntime = workerChatProgramTsV1?.createAtlasWorkerContextChatRuntimeV1;
    const serviceRequestPorts = {
      serviceKey: SERVICE_KEY,
      getApplicationState: () => globalThis.__belavistaAppStore?.get?.() || {},
      getContext: currentContext,
      getRouteActivityId: () => new URLSearchParams(location.search).get('activity'),
      getPorts: () => this.serviceRequestPorts(),
    };
    const inferencePorts = {
      apiFetch,
      pathname: () => location.pathname,
      getContext: currentContext,
      getApplicationState: () => globalThis.__belavistaAppStore?.get?.() || {},
      getMapContext: () => this.readMapContext(),
    };
    const runtimeController = typeof createRuntime === 'function'
      ? createRuntime({
          controller: this,
          pathname: location.pathname,
          search: location.search,
          serviceKey: SERVICE_KEY,
          labelForPath,
          speakerProfiles: SPEAKER_PROFILES,
          apiFetch,
          getApplicationState: () => globalThis.__belavistaAppStore?.get?.() || {},
          getContext: currentContext,
          getMapContext: () => this.readMapContext(),
          getRouteActivityId: () => new URLSearchParams(location.search).get('activity'),
          getServiceRequestPorts: () => this.serviceRequestPorts(),
          currentPathname: () => location.pathname,
          parseLotStatusCommand: parseLotStatusCommandV1,
          applyLotStatusCommand: command => {
            const store = globalThis.__belavistaAppStore;
            return store ? applyLotStatusCommandV1(store, command) : 'A alteração de status está disponível apenas no painel administrativo.';
          },
          serviceRequestId: () => readHostStorageV1(SERVICE_KEY),
          visualClarification: visualClarificationForV1,
          voice: { config: voiceConfig, ports: voicePorts },
          getCommandPorts: () => this.commandExecutionPorts(),
        })
      : null;
    this.runtimeControllerV1 = runtimeController;
    const operationalController = runtimeController || (typeof createOperationalController === 'function'
      ? createOperationalController({
          session: { pathname: location.pathname, search: location.search },
          serviceRequests: serviceRequestPorts,
          inference: inferencePorts,
          voice: { config: voiceConfig, ports: voicePorts },
          getCommandPorts: () => this.commandExecutionPorts(),
        })
      : null);
    const initialSessionState = runtimeController ? null : operationalController?.session || (typeof createSessionTs === 'function'
      ? createSessionTs({ pathname: location.pathname, search: location.search })
      : null);
    if (runtimeController) {
      this.sessionStateOwnerV1 = runtimeController.sessionStateOwnerV1;
    } else if (initialSessionState && typeof attachSessionStateTs === 'function') {
      attachSessionStateTs(this, initialSessionState);
      this.sessionStateOwnerV1 = operationalController ? 'typescript-operational-controller' : 'typescript-session';
    } else {
      this.messages = [];
      this.persistenceWarning = '';
      this.editingId = null;
      this.legacyVoiceEnabled = false;
      this.legacySpeakerProfile = 'operacional';
      this.route = `${location.pathname}${location.search}`;
      this.attachment = null;
      this.files = [];
      this.currentRequest = null;
      this.requests = [];
      this.pending = false;
      this.pendingLabel = '';
      this.recordDraft = null;
      this.sessionStateOwnerV1 = 'mjs-fallback';
    }
    this.voiceController = operationalController?.voice || null;
    this.serviceRequestControllerV1 = operationalController?.serviceRequests || null;
    this.inferenceControllerV1 = operationalController?.inference || null;
    this.commandControllerV1 = operationalController?.commands || null;
    if (!operationalController) {
      const createServiceRequestController = workerChatProgramTsV1?.createAtlasWorkerContextChatServiceRequestControllerV1;
      const createInferenceController = workerChatProgramTsV1?.createAtlasWorkerContextChatInferenceControllerV1;
      this.serviceRequestControllerV1 = typeof createServiceRequestController === 'function'
        ? createServiceRequestController(serviceRequestPorts)
        : null;
      this.inferenceControllerV1 = typeof createInferenceController === 'function'
        ? createInferenceController(inferencePorts)
        : null;
      this.commandControllerV1 = null;
    }
    if (!this.voiceController && typeof createVoiceController === 'function') {
      this.voiceController = createVoiceController(voiceConfig, voicePorts);
    }
    if (!this.voiceController) {
      this.legacyVoiceEnabled = readJson(VOICE_KEY, false) === true;
      const storedSpeakerProfile = readJson(SPEAKER_PROFILE_KEY, 'operacional');
      this.legacySpeakerProfile = SPEAKER_PROFILES.some(item => item.id === storedSpeakerProfile)
        ? storedSpeakerProfile
        : 'operacional';
    }
    const createComponentStateController = workerChatProgramTsV1?.createAtlasWorkerContextChatComponentStateControllerV1;
    this.componentStateControllerV1 = runtimeController?.componentStateControllerV1
      || (typeof createComponentStateController === 'function' ? createComponentStateController(this) : null);
  }

  mount() {
    let storage = null;
    try { storage = localStorage; } catch {}
    const mountRuntime = this.runtimeControllerV1?.mountComponent;
    if (typeof mountRuntime === 'function' && mountRuntime({ documentRef: document, storage })) return;
    if (!document.body || document.querySelector('[data-worker-context-assistant]')) return;
    const mountComponent = workerChatRendererTsV1?.mountAtlasWorkerContextChatV1;
    if (typeof mountComponent === 'function') {
      const prepareMount = workerChatProgramTsV1?.prepareAtlasWorkerContextChatMountV1;
      const mobileDefaultCollapsed = typeof prepareMount === 'function'
        ? prepareMount({ storage, serviceKey: SERVICE_KEY }).mobileDefaultCollapsed
        : true;
      if (mountComponent({
        documentRef: document,
        controller: this,
        pathname: location.pathname,
        labelForPath,
        speakerProfiles: SPEAKER_PROFILES,
        mobileDefaultCollapsed,
      })) return;
    }
    const mountLegacyTs = workerChatProgramTsV1?.mountAtlasWorkerContextChatV1;
    if (typeof mountLegacyTs === 'function' && mountLegacyTs({
      documentRef: document,
      controller: this,
      componentOwners: workerChatRendererTsV1,
      pathname: location.pathname,
      serviceKey: SERVICE_KEY,
      storage,
      labelForPath,
      speakerProfiles: SPEAKER_PROFILES,
    })) return;
    this.mountLegacy();
  }

  mountLegacy() {
    if (document.querySelector('[data-worker-context-assistant]')) return;
    const prepareMountTs = workerChatProgramTsV1?.prepareAtlasWorkerContextChatMountV1;
    let mobileDefaultCollapsed = true;
    if (typeof prepareMountTs === 'function') {
      let storage = null;
      try { storage = localStorage; } catch {}
      mobileDefaultCollapsed = prepareMountTs({ storage, serviceKey: SERVICE_KEY }).mobileDefaultCollapsed;
    } else {
      // Não recuperar pedidos antigos no assistente ao abrir a aplicação.
      try { removeHostStorageV1(SERVICE_KEY); } catch {}
    }
    const shellInput = {
      monitorLabel: labelForPath(location.pathname),
      voiceEnabled: this.getVoiceState().enabled,
      speakerProfile: this.getVoiceState().profile,
      speakerProfiles: SPEAKER_PROFILES,
      mobileDefaultCollapsed,
    };
    const chatElement = document.createElement('atlas-worker-context-chat');
    if (typeof chatElement.mountShell === 'function' && chatElement.mountShell(shellInput)) {
      document.body.append(chatElement);
    } else {
      const renderShellTs = workerChatRendererTsV1?.renderAtlasWorkerContextChatShellV1;
      const shellMarkup = typeof renderShellTs === 'function' ? renderShellTs(shellInput) : '';
      if (shellMarkup) document.body.insertAdjacentHTML('beforeend', shellMarkup);
      else document.body.insertAdjacentHTML('beforeend', `
      <aside id="worker-context-chat" class="worker-context-assistant${mobileDefaultCollapsed ? ' is-collapsed' : ''}" data-worker-context-assistant data-collapsed="${String(mobileDefaultCollapsed)}" data-chat-tab="conversation" aria-label="Assistente operacional dos workers">
        <header class="worker-context-chat-head">
          <div><span class="worker-context-mark">✦</span><div><strong>IA · worker operacional</strong><small data-worker-chat-monitor>Observando ${esc(labelForPath(location.pathname))}</small></div></div>
          <div class="worker-context-chat-head-actions"><button type="button" data-worker-chat-voice aria-pressed="${String(this.getVoiceState().enabled)}" title="Ativar avisos falados">◖</button><button type="button" data-worker-chat-minimize aria-label="${mobileDefaultCollapsed ? 'Restaurar assistente' : 'Minimizar assistente'}">${mobileDefaultCollapsed ? '+' : '−'}</button></div>
        </header>
        <div class="worker-context-chat-body">
          <div class="worker-chat-tabs" role="tablist" aria-label="Chat operacional"><button type="button" role="tab" data-worker-chat-tab="conversation" aria-selected="true">Conversa</button><button type="button" role="tab" data-worker-chat-tab="register" aria-selected="false">Registrar por câmera</button></div>
          <div class="worker-chat-register-panel" data-worker-chat-register-panel role="tabpanel" hidden><strong>Registro com evidência</strong><p>Capture uma foto ou selecione um arquivo. Descreva o fato e envie para leitura; confirme a alocação antes de salvar o registro.</p><button type="button" data-worker-chat-capture> Abrir câmera</button></div>
          <div class="worker-context-chat-intro"><strong>Resposta atual</strong><span>Peça um serviço de qualquer área; solicitações e arquivos ficam acompanháveis pelo número gerado.</span></div>
          <div class="worker-chat-speaker-panel" data-worker-chat-speaker-panel>
            <label><span>Modelo de speaker</span><select data-worker-chat-speaker aria-label="Modelo de voz do assistente">${SPEAKER_PROFILES.map(item => `<option value="${item.id}" ${item.id === this.getVoiceState().profile ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label>
            <button type="button" data-worker-chat-speaker-preview>Testar voz</button>
          </div>
          <div class="worker-context-fade" data-worker-context-fade aria-live="polite" aria-atomic="true" hidden></div>
          <div class="worker-context-chat-log" data-worker-chat-log aria-live="polite" aria-busy="false"></div>
          <div class="worker-context-chat-quick" aria-label="Ações rápidas">
            <button type="button" data-worker-chat-action="cycle">Executar ciclo</button>
            <button type="button" data-worker-chat-action="tests">Rodar suíte</button>
            <button type="button" data-worker-chat-action="alerts">Abrir alertas</button>
            <button type="button" data-worker-chat-action="requirements">Revisar requisitos</button>
          </div>
          <form class="worker-context-chat-form" data-worker-chat-form>
            <div class="worker-context-chat-attachment" data-worker-chat-attachment aria-live="polite" hidden></div>
            <div class="worker-context-chat-input-shell">
              <textarea name="message" rows="2" maxlength="2000" placeholder="Descreva um fato, peça uma ação ou revise uma diretriz…" aria-label="Mensagem para o assistente dos workers"></textarea>
              <div class="worker-chat-attachment-rail" role="group" aria-label="Ações da mensagem">
                <button type="button" data-worker-chat-file aria-label="Anexar arquivo" title="Anexar arquivo"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3.5h7l4 4V20H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M14 3.5V8h4M9 12h6M9 15h6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span class="sr-only">Anexar arquivo</span></button>
                <button type="button" data-worker-chat-camera aria-label="Tirar foto" title="Tirar foto"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg><span class="sr-only">Tirar foto</span></button>
              </div>
              <input type="file" class="worker-context-chat-image-input" data-worker-chat-file-input accept="image/png,image/jpeg,image/webp,application/pdf,.pdf,.dwg,.dxf" aria-label="Selecionar anexo">
              <input type="file" class="worker-context-chat-image-input" data-worker-chat-camera-input accept="image/*" capture="environment" aria-label="Capturar foto">
            </div>
            <span class="worker-chat-key-hint">Enter envia · Shift+Enter quebra linha</span>
            <div><small data-worker-chat-status role="status" aria-live="polite">Pronto para observar e organizar.</small><button type="submit" data-worker-chat-submit>Enviar</button></div>
          </form>
        </div>
      </aside>`);
    }
    this.root = qs('[data-worker-context-assistant]');
    if (this.root) this.root.dataset.chatSessionStateOwnerV1 = this.sessionStateOwnerV1 || 'mjs-fallback';
    if (this.root && !this.root.dataset.chatShellRendererOwnerV1) this.root.dataset.chatShellRendererOwnerV1 = 'mjs-fallback';
    if (this.root) this.root.dataset.chatVoiceOwnerV1 = this.voiceController ? 'typescript' : 'mjs-fallback';
    this.log = qs('[data-worker-chat-log]', this.root);
    this.input = qs('textarea', this.root);
    this.status = qs('[data-worker-chat-status]', this.root);
    this.render();
    this.bind();
    this.installRecordSavedEvent();
    this.installObservation();
    // Não reabrir solicitações antigas no chat ao iniciar a aplicação.
    // Novas solicitações continuam sendo acompanhadas após o envio.
  }

  installRecordSavedEvent() {
    const installSavedEventComponentTsV1 = workerChatRendererTsV1?.installAtlasWorkerContextChatRecordSavedEventV1;
    const installSavedEventProgramTsV1 = workerChatProgramTsV1?.installAtlasWorkerContextChatRecordSavedEventProgramV1;
    const ports = {
      isDialogOpen: () => Boolean(this.recordDialog?.open),
      getDraft: () => this.readRecordDraft(),
      setDraft: draft => { this.writeRecordDraft(draft); },
      addAssistant: message => { this.add('assistant', message); },
      setStatus: message => { if (this.status) this.status.textContent = message; },
      closeDialog: () => this.recordDialog?.close(),
    };
    const installRuntimeEvent = this.runtimeControllerV1?.installRecordSavedEvent;
    if (typeof installRuntimeEvent === 'function' && installRuntimeEvent(window, ports)) return;
    if (typeof installSavedEventComponentTsV1 === 'function' && this.root) {
      installSavedEventComponentTsV1(window, ports);
      this.root.dataset.chatRecordSavedEventOwnerV1 = 'typescript';
      return;
    }
    if (typeof installSavedEventProgramTsV1 === 'function' && installSavedEventProgramTsV1({
      eventTarget: window,
      root: this.root,
      componentOwners: workerChatRendererTsV1,
      ports,
    })) {
      return;
    }
    if (this.root) this.root.dataset.chatRecordSavedEventOwnerV1 = 'mjs-fallback';
    window.addEventListener('belavista:chat-record-saved', event => {
      if (!this.recordDialog?.open) return;
      const draft = this.readRecordDraft();
      const record = event.detail || {};
      this.writeRecordDraft(null);
      const id = record.id || 'sem identificador';
      const items = Array.isArray(record.propagatedItems) ? record.propagatedItems : Array.isArray(record.properties) ? (record.properties.find(item => item?.key === 'items')?.value || []) : (draft?.ocr?.items || []);
      const allocations = items.map(item => {
        const itemName = item.description || item.materialName || item.materialId || 'item sem descrição';
        const stage = item.stageName || item.stageKey || 'etapa a confirmar';
        const activity = item.activityName || item.activityId || 'serviço a confirmar';
        const kind = item.itemKind || 'item';
        return `${itemName} → ${stage} · ${activity} · ${kind}`;
      });
      const allocationText = allocations.length ? ` Alocação registrada: ${allocations.join(' | ')}.` : ' Nenhuma alocação detalhada foi retornada; confira os itens no registro.';
      this.add('assistant', `Registro ${id} confirmado no sistema.${allocationText}`);
      this.status.textContent = `Registro ${id} salvo com retorno de alocação.`;
      this.recordDialog.close();
    });
  }

  bind() {
    const bindRuntime = this.runtimeControllerV1?.bindComponent;
    if (typeof bindRuntime === 'function' && bindRuntime({
      componentOwners: workerChatRendererTsV1,
      setStorage: writeHostStorageV1,
      native: globalThis.Capacitor?.isNativePlatform?.() === true,
      installSwipeSheet: installWorkerChatSwipeSheetV1,
    })) {
      this.root.dataset.chatBindingsOwnerV1 = 'typescript-runtime';
      return;
    }
    const installBindingsTs = workerChatRendererTsV1?.installAtlasWorkerContextChatBindingsV1
      || workerChatProgramTsV1?.installAtlasWorkerContextChatBindingsV1;
    if (typeof installBindingsTs === 'function' && installBindingsTs({
      root: this.root,
      controller: this,
      programOwners: workerChatProgramTsV1,
      componentOwners: workerChatRendererTsV1,
      serviceKey: SERVICE_KEY,
      setStorage: writeHostStorageV1,
      native: globalThis.Capacitor?.isNativePlatform?.() === true,
      installSwipeSheet: installWorkerChatSwipeSheetV1,
    })) {
      this.root.dataset.chatBindingsOwnerV1 = 'typescript';
      return;
    }
    if (this.root) this.root.dataset.chatBindingsOwnerV1 = 'mjs-recovery';
    this.bindLegacy();
  }

  bindLegacy() {
    this.root.dataset.chatRecordReviewOwnerV1 = typeof workerChatProgramTsV1?.applyAtlasWorkerContextChatRecordReviewFlowV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatRecordDrawerOwnerV1 = typeof workerChatRendererTsV1?.openAtlasWorkerContextChatRecordDrawerV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatPendingStateOwnerV1 = typeof workerChatRendererTsV1?.applyAtlasWorkerContextChatPendingStateV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatTabStateOwnerV1 = typeof workerChatRendererTsV1?.applyAtlasWorkerContextChatTabV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatMapContextOwnerV1 = typeof workerChatRendererTsV1?.applyAtlasWorkerContextChatMapContextV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatAttachmentRendererOwnerV1 = typeof workerChatRendererTsV1?.renderAtlasWorkerContextChatAttachmentListV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatComposerSubmissionOwnerV1 = typeof workerChatProgramTsV1?.projectAtlasWorkerContextChatComposerSubmissionV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatComposerSubmitBindingOwnerV1 = typeof workerChatRendererTsV1?.installAtlasWorkerContextChatComposerEventsV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatQuickActionOwnerV1 = typeof workerChatRendererTsV1?.runAtlasWorkerContextChatQuickActionV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatIntentPlanOwnerV1 = typeof workerChatProgramTsV1?.projectAtlasWorkerContextChatActionPlanV1 === 'function' ? 'typescript' : 'legacy';
    this.root.dataset.chatCommandExecutorOwnerV1 = typeof workerChatProgramTsV1?.executeAtlasWorkerContextChatCommandsV1 === 'function' ? 'typescript' : 'legacy';
    this.root.dataset.chatFileReaderOwnerV1 = typeof workerChatRendererTsV1?.readAtlasWorkerContextChatFileV1 === 'function' ? 'typescript' : 'unavailable';
    this.root.dataset.chatServiceRequestsOwnerV1 = typeof workerChatProgramTsV1?.createAtlasWorkerContextChatServiceRequestV1 === 'function' ? 'typescript' : 'legacy';
    this.root.dataset.chatVisualAllocationOwnerV1 = typeof workerChatProgramTsV1?.projectAtlasWorkerContextChatVisualAllocationCallsV1 === 'function' ? 'typescript' : 'mjs-recovery';
    this.root.dataset.chatStageInterpretationOwnerV1 = typeof workerChatProgramTsV1?.resolveAtlasWorkerContextChatVisualStageV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatRecordInterpretationOwnerV1 = typeof workerChatProgramTsV1?.buildAtlasWorkerContextChatRecordInterpretationV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatVisualClarificationOwnerV1 = typeof workerChatProgramTsV1?.projectAtlasWorkerContextChatVisualClarificationV1 === 'function' ? 'typescript' : 'mjs-fallback';
    this.root.dataset.chatInferenceRequestOwnerV1 = typeof workerChatProgramTsV1?.requestAtlasWorkerContextChatReplyV1 === 'function' ? 'typescript-program-ready' : 'legacy';
    installWorkerChatSwipeSheetV1?.({
      root: this.root,
      setCollapsed: collapsed => this.setCollapsed(collapsed),
      native: globalThis.Capacitor?.isNativePlatform?.() === true,
    });
    const installInteractionEventsTs = workerChatRendererTsV1?.installAtlasWorkerContextChatInteractionEventsV1;
    if (typeof installInteractionEventsTs === 'function') {
      installInteractionEventsTs(this.root, {
        discardRecord: () => this.discardRecord(),
        applyRecord: () => this.applyRecord(),
        minimize: () => this.setCollapsed(!this.root.classList.contains('is-collapsed')),
        openCollapsedHead: () => this.setCollapsed(false),
        toggleVoice: () => this.toggleVoice(),
        selectSpeaker: profile => this.selectSpeaker(profile),
        setStatus: message => { if (this.status) this.status.textContent = message; },
        previewSpeaker: () => this.speak('Olá. Sou o assistente operacional do Aliança Park. Esta é uma prévia da voz selecionada.'),
        refreshServiceRequest: () => this.refreshServiceRequest(),
        startEdit: messageId => this.startEdit(messageId),
        speak: text => this.speak(text),
        selectService: serviceId => {
          writeHostStorageV1(SERVICE_KEY, serviceId);
          this.refreshServiceRequest();
        },
      });
      this.root.dataset.chatInteractionEventsOwnerV1 = 'typescript';
    }
    if (typeof installInteractionEventsTs !== 'function') {
      const installInteractionRecovery = workerChatUiRecoveryV1?.installWorkerChatInteractionEventsLegacyV1;
      const installed = typeof installInteractionRecovery === 'function' && installInteractionRecovery(this.root, {
        discardRecord: () => this.discardRecord(),
        applyRecord: () => this.applyRecord(),
        minimize: () => this.setCollapsed(!this.root.classList.contains('is-collapsed')),
        isCollapsed: () => this.root.classList.contains('is-collapsed'),
        openCollapsedHead: () => this.setCollapsed(false),
        toggleVoice: () => this.toggleVoice(),
        selectSpeaker: profile => this.selectSpeaker(profile),
        setStatus: message => { if (this.status) this.status.textContent = message; },
        previewSpeaker: () => this.speak('Olá. Sou o assistente operacional do Aliança Park. Esta é uma prévia da voz selecionada.'),
        refreshServiceRequest: () => this.refreshServiceRequest(),
        startEdit: messageId => this.startEdit(messageId),
        speak: text => this.speak(text),
        runAction: action => this.runAction(action),
        selectService: serviceId => {
          writeHostStorageV1(SERVICE_KEY, serviceId);
          this.refreshServiceRequest();
        },
      });
      this.root.dataset.chatInteractionEventsOwnerV1 = installed ? 'mjs-recovery' : 'unavailable';
    }
    const installComposerEventsTs = workerChatRendererTsV1?.installAtlasWorkerContextChatComposerEventsV1;
    if (typeof installComposerEventsTs === 'function') {
      installComposerEventsTs(this.root, {
        readFiles: (files, source) => files.forEach(file => this.readImage(file, source)),
        readSubmission: () => this.readComposerSubmission(this.input?.value || ''),
        clearSubmission: () => this.clearComposerSubmission(),
        submit: submission => {
          void this.submit(submission.text, submission.editingId, submission.attachment, submission.files);
        },
        isPending: () => this.readComposerState().pending,
        removeAttachment: index => this.removeAttachmentAt(index),
        selectTab: tab => this.setTab(tab),
      });
      this.root.dataset.chatComposerEventsOwnerV1 = 'typescript';
    } else {
      const installComposerRecovery = workerChatUiRecoveryV1?.installWorkerChatComposerEventsLegacyV1;
      this.pasteHandler = typeof installComposerRecovery === 'function'
        ? installComposerRecovery(this.root, {
            selectTab: tab => this.setTab(tab),
            readImage: (file, source) => this.readImage(file, source),
            submitComposer: () => this.submitComposer(),
          })
        : null;
      this.root.dataset.chatComposerEventsOwnerV1 = this.pasteHandler ? 'mjs-recovery' : 'unavailable';
    }
  }

  discardRecord() {
    const projectDiscardTs = workerChatProgramTsV1?.projectAtlasWorkerContextChatDiscardRecordCommandV1;
    if (typeof projectDiscardTs === 'function') {
      const command = projectDiscardTs();
      this.writeRecordDraft(command.recordDraft);
      if (this.status) this.status.textContent = command.status;
      this.root.dataset.chatRecordDiscardOwnerV1 = 'typescript';
      this.render();
      return;
    }
    if (this.root) this.root.dataset.chatRecordDiscardOwnerV1 = 'mjs-fallback';
    this.writeRecordDraft(null);
    this.status.textContent = 'Leitura descartada; o anexo original permanece disponível no histórico.';
    this.render();
  }

  applyRecord() {
    const draft = this.readRecordDraft();
    if (!draft) return;
    const store = globalThis.__BELAVISTA_RECORD_OCR_BRIDGE_V21?.appStore || globalThis.__belavistaAppStore;
    if (!store) return;
    const applyReviewTs = workerChatProgramTsV1?.applyAtlasWorkerContextChatRecordReviewFlowV1;
    if (typeof applyReviewTs === 'function') {
      applyReviewTs({
        draft,
        store,
        ports: {
          setStatus: message => { if (this.status) this.status.textContent = message; },
          setCollapsed: collapsed => this.setCollapsed(collapsed),
          openItem: itemKey => setTimeout(() => {
            const row = document.querySelector(`[data-stage-center-item-open="${CSS.escape(itemKey)}"]`);
            row?.click();
          }, 0),
          clearDraft: () => { this.writeRecordDraft(null); },
          render: () => this.render(),
        },
      });
      return;
    }
    const recover = workerChatRecordReviewRecoveryV1?.applyWorkerChatRecordReviewLegacyV1;
    if (typeof recover === 'function') recover(this, isLimitedOperationalActor);
    else if (this.status) this.status.textContent = 'A revisão OCR está indisponível neste carregamento.';
  }

  getVoiceState() {
    return this.voiceController?.getState?.() || {
      enabled: this.legacyVoiceEnabled === true,
      profile: this.legacySpeakerProfile || 'operacional',
    };
  }

  toggleVoice() {
    if (this.voiceController) return this.voiceController.toggleEnabled();
    this.legacyVoiceEnabled = !this.legacyVoiceEnabled;
    try { writeHostStorageV1(VOICE_KEY, JSON.stringify(this.legacyVoiceEnabled)); } catch {}
    if (!this.legacyVoiceEnabled) globalThis.speechSynthesis?.cancel();
    return { enabled: this.legacyVoiceEnabled, status: this.legacyVoiceEnabled ? 'Avisos falados ativados neste dispositivo.' : 'Avisos falados desativados.' };
  }

  selectSpeaker(profile) {
    const next = String(profile || 'operacional');
    if (this.voiceController) return this.voiceController.selectProfile(next);
    this.legacySpeakerProfile = SPEAKER_PROFILES.some(item => item.id === next) ? next : 'operacional';
    let saved = false;
    try { saved = writeHostStorageV1(SPEAKER_PROFILE_KEY, JSON.stringify(this.legacySpeakerProfile)); } catch {}
    const label = SPEAKER_PROFILES.find(item => item.id === this.legacySpeakerProfile)?.label || 'Operacional';
    return { profile: this.legacySpeakerProfile, status: saved ? `Speaker selecionado: ${label}.` : `Speaker selecionado: ${label}; a preferência não pôde ser salva.` };
  }

  readComposerState() {
    if (typeof this.componentStateControllerV1?.readComposerState === 'function') {
      return this.componentStateControllerV1.readComposerState();
    }
    const readComponentState = this.root?.getComposerState;
    if (typeof readComponentState === 'function') return readComponentState.call(this.root);
    return {
      editingId: this.editingId ?? null,
      attachment: this.attachment || null,
      files: Array.isArray(this.files) ? this.files : [],
      pending: Boolean(this.pending),
      pendingLabel: this.pendingLabel || '',
    };
  }

  readConversationPresentation() {
    if (typeof this.componentStateControllerV1?.readConversationPresentation === 'function') {
      return this.componentStateControllerV1.readConversationPresentation();
    }
    const readComponentPresentation = this.root?.getConversationPresentation;
    if (typeof readComponentPresentation === 'function') return readComponentPresentation.call(this.root);
    return {
      message: this.messages?.at(-1) || null,
      persistenceWarning: this.persistenceWarning || '',
      request: this.currentRequest || null,
      requests: this.requests || [],
      recordDraft: this.recordDraft || null,
    };
  }

  readConversationRequestState() {
    if (typeof this.componentStateControllerV1?.readConversationRequestState === 'function') {
      return this.componentStateControllerV1.readConversationRequestState();
    }
    const readComponentState = this.root?.getConversationRequestState;
    if (typeof readComponentState === 'function') return readComponentState.call(this.root);
    return { currentRequest: this.currentRequest || null, requests: this.requests || [] };
  }

  writeConversationRequestState(patch) {
    if (typeof this.componentStateControllerV1?.writeConversationRequestState === 'function') {
      this.componentStateControllerV1.writeConversationRequestState(patch);
      return;
    }
    const writeComponentState = this.root?.setConversationRequestState;
    if (typeof writeComponentState === 'function') {
      writeComponentState.call(this.root, patch);
      this.root.dataset.chatServiceRequestStateOwnerV1 = 'typescript-component';
      return;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'currentRequest')) this.currentRequest = patch.currentRequest;
    if (Object.prototype.hasOwnProperty.call(patch, 'requests')) this.requests = patch.requests;
  }

  setConversationMessage(message, persistenceWarning = '') {
    if (typeof this.componentStateControllerV1?.setConversationMessage === 'function') {
      this.componentStateControllerV1.setConversationMessage(message, persistenceWarning);
      return;
    }
    const setComponentMessage = this.root?.setConversationMessage;
    if (typeof setComponentMessage === 'function') {
      setComponentMessage.call(this.root, message, persistenceWarning);
      this.root.dataset.chatConversationStateOwnerV1 = 'typescript-component';
      return;
    }
    this.messages = message ? [message] : [];
    this.persistenceWarning = String(persistenceWarning || '');
  }

  readRecordDraft() {
    if (typeof this.componentStateControllerV1?.readRecordDraft === 'function') {
      return this.componentStateControllerV1.readRecordDraft();
    }
    const readComponentDraft = this.root?.getRecordDraft;
    return typeof readComponentDraft === 'function'
      ? readComponentDraft.call(this.root)
      : this.recordDraft || null;
  }

  writeRecordDraft(draft) {
    if (typeof this.componentStateControllerV1?.writeRecordDraft === 'function') {
      this.componentStateControllerV1.writeRecordDraft(draft);
      return;
    }
    const setComponentDraft = this.root?.setRecordDraft;
    if (typeof setComponentDraft === 'function') {
      setComponentDraft.call(this.root, draft || null);
      this.root.dataset.chatRecordDraftStateOwnerV1 = 'typescript-component';
      return;
    }
    this.recordDraft = draft || null;
  }

  readComposerSubmission(text = this.input?.value || '') {
    if (typeof this.componentStateControllerV1?.readComposerSubmission === 'function') {
      return this.componentStateControllerV1.readComposerSubmission(text);
    }
    const readComponentSubmission = this.root?.readComposerSubmission;
    if (typeof readComponentSubmission === 'function') return readComponentSubmission.call(this.root, text);
    const state = this.readComposerState();
    const projectSubmission = workerChatProgramTsV1?.projectAtlasWorkerContextChatComposerSubmissionV1;
    if (typeof projectSubmission === 'function') return projectSubmission({ text, ...state });
    const files = [...state.files];
    const normalizedText = String(text || '').trim();
    return {
      shouldSubmit: Boolean(normalizedText || files.length),
      text: normalizedText || 'Analise os arquivos anexados e descreva os fatos visíveis e seus impactos operacionais.',
      editingId: state.editingId == null ? null : String(state.editingId),
      attachment: state.attachment,
      files,
    };
  }

  clearComposerSubmission() {
    if (typeof this.componentStateControllerV1?.clearComposerSubmission === 'function') {
      this.componentStateControllerV1.clearComposerSubmission();
      return;
    }
    const clearComponentSubmission = this.root?.clearComposerSubmission;
    if (typeof clearComponentSubmission === 'function') {
      clearComponentSubmission.call(this.root);
      return;
    }
    this.editingId = null;
    this.attachment = null;
    this.files = [];
    if (this.input) this.input.value = '';
    this.renderAttachment();
  }

  restoreComposerSubmission(text, attachment, files) {
    if (typeof this.componentStateControllerV1?.restoreComposerSubmission === 'function') {
      this.componentStateControllerV1.restoreComposerSubmission(text, attachment, files);
      return;
    }
    const restoreComponentSubmission = this.root?.restoreComposerSubmission;
    if (typeof restoreComponentSubmission === 'function') {
      restoreComponentSubmission.call(this.root, text, attachment, files);
      return;
    }
    if (this.input) this.input.value = String(text || '');
    this.files = [...files];
    this.attachment = attachment;
    this.renderAttachment();
  }

  submitComposer() {
    const state = this.readComposerState();
    if (state.pending) return;
    const submission = this.readComposerSubmission(this.input?.value || '');
    if (!submission.shouldSubmit) return;
    this.clearComposerSubmission();
    void this.submit(submission.text, submission.editingId, submission.attachment, submission.files);
  }

  removeAttachmentAt(index) {
    if (typeof this.componentStateControllerV1?.removeAttachmentAt === 'function') {
      this.componentStateControllerV1.removeAttachmentAt(index);
      return;
    }
    const removeComponentAttachment = this.root?.removeComposerAttachment;
    if (typeof removeComponentAttachment === 'function') {
      removeComponentAttachment.call(this.root, index);
      this.root.dataset.chatAttachmentRemovalOwnerV1 = 'typescript-component';
      return;
    }
    const removeAttachmentTs = workerChatProgramTsV1?.removeAtlasWorkerContextChatAttachmentV1;
    if (typeof removeAttachmentTs === 'function') {
      const state = removeAttachmentTs(this.files, index);
      this.files = state.files;
      this.attachment = state.attachment;
    } else {
      this.files.splice(Number(index), 1);
      this.attachment = this.files.find(file => /^image\//.test(file.mimeType)) || null;
    }
    const input = qs('[data-worker-chat-camera-input]', this.root);
    if (input) input.value = '';
    this.renderAttachment();
    this.status.textContent = 'Arquivo removido.';
  }

  setCollapsed(collapsed) {
    if (this.componentStateControllerV1?.setCollapsed?.(
      collapsed,
      workerChatRendererTsV1,
      workerChatUiRecoveryV1?.applyWorkerChatCollapsedStateLegacyV1,
      globalThis.BELAVISTA_CAPACITOR_NATIVE === true,
      document,
    ) === true) return;
    if (!this.root) return;
    const componentApply = this.root.applyCollapsedState;
    if (typeof componentApply === 'function' && componentApply.call(this.root, collapsed, globalThis.BELAVISTA_CAPACITOR_NATIVE === true)) {
      this.root.dataset.chatCollapseStateOwnerV1 = 'typescript-component';
      return;
    }
    const applyCollapsedTs = workerChatRendererTsV1?.applyAtlasWorkerContextChatCollapsedStateV1;
    if (typeof applyCollapsedTs === 'function') {
      applyCollapsedTs(this.root, collapsed, globalThis.BELAVISTA_CAPACITOR_NATIVE === true);
      this.root.dataset.chatCollapseStateOwnerV1 = 'typescript';
      return;
    }
    const applyRecovery = workerChatUiRecoveryV1?.applyWorkerChatCollapsedStateLegacyV1;
    const applied = typeof applyRecovery === 'function'
      && applyRecovery(this.root, collapsed, globalThis.BELAVISTA_CAPACITOR_NATIVE === true, document);
    this.root.dataset.chatCollapseStateOwnerV1 = applied ? 'mjs-recovery' : 'unavailable';
  }

  setTab(tab) {
    if (this.componentStateControllerV1?.setTab?.(
      tab,
      workerChatRendererTsV1,
      workerChatUiRecoveryV1?.applyWorkerChatTabLegacyV1,
    ) === true) return;
    if (!this.root) return;
    const componentSelect = this.root.selectTab;
    if (typeof componentSelect === 'function') {
      componentSelect.call(this.root, tab);
      this.root.dataset.chatTabStateOwnerV1 = 'typescript-component';
      return;
    }
    const applyTabTs = workerChatRendererTsV1?.applyAtlasWorkerContextChatTabV1;
    if (typeof applyTabTs === 'function') {
      applyTabTs(this.root, this.input || null, tab);
      this.root.dataset.chatTabStateOwnerV1 = 'typescript';
      return;
    }
    const applyRecovery = workerChatUiRecoveryV1?.applyWorkerChatTabLegacyV1;
    const applied = typeof applyRecovery === 'function' && applyRecovery(this.root, this.input || null, tab);
    this.root.dataset.chatTabStateOwnerV1 = applied ? 'mjs-recovery' : 'unavailable';
  }

  openLotStatusContext(lotLabel) {
    if (!this.root) this.mount();
    const label = String(lotLabel || 'lote selecionado').trim();
    if (this.componentStateControllerV1?.applyMapContext?.(
      'lot', label, workerChatRendererTsV1,
      workerChatMapContextRecoveryV1?.applyWorkerChatMapContextLegacyV1,
    )) return true;
    const root = this.root || qs('[data-worker-context-assistant]');
    const input = this.input || qs('textarea[name="message"]', root);
    if (!root || !input) return false;

    // O contexto só prepara a interface; o envio continua manual.
    this.setCollapsed(false);
    const componentContext = root.applyMapContext;
    if (typeof componentContext === 'function' && componentContext.call(root, { kind: 'lot', label })) {
      root.dataset.chatMapContextOwnerV1 = 'typescript-component';
      return true;
    }
    const applyMapContextTs = workerChatRendererTsV1?.applyAtlasWorkerContextChatMapContextV1;
    if (typeof applyMapContextTs === 'function' && applyMapContextTs(root, input, { kind: 'lot', label })) {
      root.dataset.chatMapContextOwnerV1 = 'typescript';
      return true;
    }
    const applyRecovery = workerChatMapContextRecoveryV1?.applyWorkerChatMapContextLegacyV1;
    const applied = typeof applyRecovery === 'function' && applyRecovery(root, input, { kind: 'lot', label });
    root.dataset.chatMapContextOwnerV1 = applied ? 'mjs-recovery' : 'unavailable';
    return Boolean(applied);
  }

  openMapAreaContext(areaLabel) {
    if (!this.root) this.mount();
    const label = String(areaLabel || 'área comum do loteamento').trim();
    if (this.componentStateControllerV1?.applyMapContext?.(
      'common-area', label, workerChatRendererTsV1,
      workerChatMapContextRecoveryV1?.applyWorkerChatMapContextLegacyV1,
    )) return true;
    const root = this.root || qs('[data-worker-context-assistant]');
    const input = this.input || qs('textarea[name="message"]', root);
    if (!root || !input) return false;

    this.setCollapsed(false);
    const componentContext = root.applyMapContext;
    if (typeof componentContext === 'function' && componentContext.call(root, { kind: 'common-area', label })) {
      root.dataset.chatMapContextOwnerV1 = 'typescript-component';
      return true;
    }
    const applyMapContextTs = workerChatRendererTsV1?.applyAtlasWorkerContextChatMapContextV1;
    if (typeof applyMapContextTs === 'function' && applyMapContextTs(root, input, { kind: 'common-area', label, status: this.status })) {
      root.dataset.chatMapContextOwnerV1 = 'typescript';
      return true;
    }
    const applyRecovery = workerChatMapContextRecoveryV1?.applyWorkerChatMapContextLegacyV1;
    const applied = typeof applyRecovery === 'function' && applyRecovery(root, input, { kind: 'common-area', label, status: this.status });
    root.dataset.chatMapContextOwnerV1 = applied ? 'mjs-recovery' : 'unavailable';
    return Boolean(applied);
  }

  render() {
    if (!this.log) return;
    const composer = this.readComposerState();
    const presentation = this.readConversationPresentation();
    const logInput = {
      message: presentation.message,
      pending: composer.pending,
      pendingLabel: composer.pendingLabel,
      request: presentation.request,
      requests: presentation.requests,
      persistenceWarning: presentation.persistenceWarning,
      recordDraft: presentation.recordDraft,
      limitedOperationalActor: isLimitedOperationalActor(globalThis.__belavistaAppStore?.get?.()?.currentActor || {}),
    };
    const renderConversationTsV1 = workerChatRendererTsV1?.renderAtlasWorkerContextChatConversationV1;
    if (typeof renderConversationTsV1 === 'function') {
      const renderedLog = renderConversationTsV1({ root: this.root, log: this.log, conversation: logInput });
      if (renderedLog) {
        this.log = renderedLog;
        return;
      }
    }
    const componentRender = this.root?.renderConversation;
    if (typeof componentRender === 'function' && componentRender.call(this.root, logInput)) {
      this.root.dataset.chatLogRendererOwnerV1 = 'typescript-component';
      this.log = this.root.querySelector('[data-worker-chat-log]');
      return;
    }
    const renderTs = workerChatRendererTsV1?.renderAtlasWorkerContextChatLogV1;
    const renderRecovery = workerChatLogRecoveryV1?.renderWorkerContextChatLogLegacyV1;
    const renderLog = typeof renderTs === 'function' ? renderTs : renderRecovery;
    if (typeof renderLog !== 'function') {
      this.log.textContent = 'A conversa precisa ser atualizada para carregar o painel.';
      if (this.root) this.root.dataset.chatLogRendererOwnerV1 = 'unavailable';
      return;
    }
    this.log.innerHTML = renderLog(logInput, { escape: esc, serviceStatusLabel });
    if (this.root) this.root.dataset.chatLogRendererOwnerV1 = typeof renderTs === 'function' ? 'typescript' : 'mjs-recovery';
    this.log.scrollTop = this.log.scrollHeight;
  }

  openRecordDrawer() {
    const componentDrawer = this.root?.openRecordDrawer;
    if (typeof componentDrawer === 'function') {
      this.recordDialog = componentDrawer.call(this.root, this.readRecordDraft());
      this.root.dataset.chatRecordDrawerOwnerV1 = 'typescript-component';
      return;
    }
    const openDrawerTs = workerChatRendererTsV1?.openAtlasWorkerContextChatRecordDrawerV1;
    if (typeof openDrawerTs === 'function') {
      if (this.root) this.root.dataset.chatRecordDrawerOwnerV1 = 'typescript';
      this.recordDialog = openDrawerTs(this.readRecordDraft(), { documentRef: document, statusElement: this.status });
      return;
    }
    const openRecovery = workerChatUiRecoveryV1?.openWorkerChatRecordDrawerLegacyV1;
    const recoveredDialog = typeof openRecovery === 'function'
      ? openRecovery(this.readRecordDraft(), { documentRef: document, statusElement: this.status, previousDialog: this.recordDialog })
      : null;
    if (recoveredDialog) this.recordDialog = recoveredDialog;
    if (this.root) this.root.dataset.chatRecordDrawerOwnerV1 = recoveredDialog ? 'mjs-recovery' : 'unavailable';
  }

  add(kind, text, options = {}) {
    const commitResponseTs = workerChatProgramTsV1?.commitAtlasWorkerContextChatAssistantResponseV1;
    if (typeof commitResponseTs === 'function') {
      let storage = null;
      try { storage = localStorage; } catch {}
      const message = commitResponseTs({ kind, text, options }, {
        storage,
        now: () => new Date(),
        random: () => Math.random(),
        setConversationMessage: (response, warning) => this.setConversationMessage(response, warning),
        render: () => this.render(),
      });
      if (message && this.root) this.root.dataset.chatResponseCommitOwnerV1 = 'typescript-program';
      return message;
    }
    const createResponseTs = workerChatProgramTsV1?.createAtlasWorkerContextChatAssistantResponseV1;
    if (typeof createResponseTs === 'function') {
      let storage = null;
      try { storage = localStorage; } catch {}
      const result = createResponseTs({ kind, text, options }, {
        storage,
        now: () => new Date(),
        random: () => Math.random(),
      });
      if (!result?.message) return null;
      this.setConversationMessage(
        result.message,
        result.persisted ? '' : 'Resposta exibida, mas não foi possível salvar a cópia local.',
      );
      this.render();
      return result.message;
    }
    const createResponseLegacy = workerChatResponseRecoveryV1?.createWorkerChatAssistantResponseLegacyV1;
    let storage = null;
    try { storage = localStorage; } catch {}
    const result = typeof createResponseLegacy === 'function'
      ? createResponseLegacy({ kind, text, options }, { storage, storageKey: THREAD_KEY, now: () => new Date(), random: () => Math.random() })
      : null;
    if (!result?.message) return null;
    this.setConversationMessage(
      result.message,
      result.persisted ? '' : 'Resposta exibida, mas não foi possível salvar a cópia local.',
    );
    this.render();
    return result.message;
  }

  startEdit(id) {
    const presentation = this.readConversationPresentation();
    const messages = presentation.message ? [presentation.message] : this.messages || [];
    const projectEditTs = workerChatProgramTsV1?.projectAtlasWorkerContextChatEditCommandV1;
    const command = typeof projectEditTs === 'function'
      ? projectEditTs(messages, id)
      : workerChatUiRecoveryV1?.projectWorkerChatEditCommandLegacyV1?.(messages, id);
    if (!command) return;
    const componentEdit = this.root?.applyMessageEdit;
    if (typeof componentEdit === 'function' && componentEdit.call(this.root, command)) {
      this.root.dataset.chatEditOwnerV1 = 'typescript-component';
      return;
    }
    this.editingId = command.editingId;
    const applyEditTs = workerChatRendererTsV1?.applyAtlasWorkerContextChatEditV1;
    if (typeof applyEditTs === 'function' && applyEditTs(this.root, command)) {
      this.root.dataset.chatEditOwnerV1 = 'typescript';
      return;
    }
    const appliedByRecovery = workerChatUiRecoveryV1?.applyWorkerChatEditLegacyV1?.(this.root, command) === true;
    this.root.dataset.chatEditOwnerV1 = appliedByRecovery ? 'mjs-recovery' : 'unavailable';
  }

  async submit(text, editingId = null, attachment = null, files = [], options = {}) {
    const runtimeSubmit = this.runtimeControllerV1?.submitMessage;
    if (typeof runtimeSubmit === 'function') {
      this.root.dataset.chatSubmitOwnerV1 = 'typescript-program-runtime';
      await runtimeSubmit({ text, attachment, files, options });
      return;
    }
    const submitTs = workerChatProgramTsV1?.submitAtlasWorkerContextChatMessageV1;
    if (typeof submitTs !== 'function') {
      this.root.dataset.chatSubmitOwnerV1 = 'typescript-unavailable';
      this.restoreComposerSubmission(text, attachment, files);
      this.add('assistant', 'Atualize a aplicação para carregar o fluxo TypeScript do assistente.');
      if (this.status) this.status.textContent = 'Fluxo TypeScript indisponível.';
      return;
    }
    this.root.dataset.chatSubmitOwnerV1 = 'typescript';
    await submitTs({
      text,
      attachment,
      files,
      options,
    }, {
        isPending: () => this.readComposerState().pending,
        setPending: (value, label) => this.setPending(value, label),
        getApplicationState: () => globalThis.__belavistaAppStore?.get?.() || null,
        getContext: currentContext,
        pathname: () => location.pathname,
        parseLotStatusCommand: parseLotStatusCommandV1,
        applyLotStatusCommand: command => {
          const store = globalThis.__belavistaAppStore;
          return store ? applyLotStatusCommandV1(store, command) : 'A alteração de status está disponível apenas no painel administrativo.';
        },
        serviceRequestId: () => readHostStorageV1(SERVICE_KEY),
        refreshServiceRequest: () => this.refreshServiceRequest(),
        getCurrentRequest: () => this.readConversationRequestState().currentRequest,
        ask: (message, file, requestOptions) => this.ask(message, file, requestOptions),
        createServiceRequest: (message, requestFiles, requestOptions) => this.createServiceRequest(message, requestFiles, requestOptions),
        executeToolCalls: (calls, context) => this.executeToolCalls(calls, context),
        getRecordDraft: () => this.readRecordDraft(),
        setRecordDraft: draft => { this.writeRecordDraft(draft); },
        visualClarification: recordOcr => visualClarificationForV1(recordOcr),
        addAssistant: (message, messageOptions) => this.add('assistant', message, messageOptions || {}),
        setStatus: message => { if (this.status) this.status.textContent = message; },
        restoreComposer: (message, file, requestFiles) => this.restoreComposerSubmission(message, file, requestFiles),
        voiceEnabled: () => this.getVoiceState().enabled,
        speak: message => this.speak(message),
        now: () => new Date(),
    });
  }

  setPending(value,label='') {
    if (this.componentStateControllerV1?.setPending?.(value, label, workerChatRendererTsV1) === true) return;
    const componentPending = this.root?.applyPendingState;
    if (typeof componentPending === 'function' && componentPending.call(this.root, value, label)) {
      this.root.dataset.chatPendingStateOwnerV1 = 'typescript-component';
    } else {
      this.pending = value;
      this.pendingLabel = label;
      const applyPendingTs = workerChatRendererTsV1?.applyAtlasWorkerContextChatPendingStateV1;
      if (typeof applyPendingTs === 'function') {
        if (this.root) this.root.dataset.chatPendingStateOwnerV1 = 'typescript';
        applyPendingTs(this.root, this.log, qs('[data-worker-chat-submit]', this.root), this.status, value, label);
      } else {
        const applyRecovery = workerChatUiRecoveryV1?.applyWorkerChatPendingStateLegacyV1;
        const applied = typeof applyRecovery === 'function'
          && applyRecovery(this.root, this.log, qs('[data-worker-chat-submit]', this.root), this.status, value, label);
        if (this.root) this.root.dataset.chatPendingStateOwnerV1 = applied ? 'mjs-recovery' : 'unavailable';
      }
    }
    this.render();
  }

  serviceRequestPorts() {
    const createPorts = workerChatProgramTsV1?.createAtlasWorkerContextChatServiceRequestPortsV1;
    if (typeof createPorts === 'function') return createPorts({
      host: globalThis,
      apiFetch,
      getChatState: () => this.readConversationRequestState(),
      setChatState: patch => { this.writeConversationRequestState(patch); },
      render: () => this.render(),
      setStatus: message => { if (this.status) this.status.textContent = message; },
    });
    return {
      apiFetch,
      storageGet: readHostStorageV1,
      storageSet: writeHostStorageV1,
      getChatState: () => this.readConversationRequestState(),
      setChatState: patch => { this.writeConversationRequestState(patch); },
      render: () => this.render(),
      setStatus: message => { if (this.status) this.status.textContent = message; },
    };
  }

  async createServiceRequest(text, files = [], { recordOcr = null } = {}) {
    if (this.serviceRequestControllerV1) {
      if (this.root) this.root.dataset.chatServiceRequestLifecycleOwnerV1 = 'typescript-program';
      return this.serviceRequestControllerV1.create({ text, files, recordOcr });
    }
    const createTs = workerChatProgramTsV1?.createAtlasWorkerContextChatServiceRequestV1;
    if (typeof createTs === 'function') {
      return createTs({
        text, files, recordOcr,
        applicationState: globalThis.__belavistaAppStore?.get?.() || {},
        context: currentContext(),
        routeActivityId: new URLSearchParams(location.search).get('activity'),
        serviceKey: SERVICE_KEY,
      }, this.serviceRequestPorts());
    }
    const createLegacy = workerChatServiceRequestRecoveryV1?.createLegacyWorkerChatServiceRequestV1;
    if (typeof createLegacy !== 'function') throw new Error('Criação de solicitação indisponível.');
    return createLegacy({
      text, files, recordOcr,
      routeActivityId: new URLSearchParams(location.search).get('activity'),
      serviceKey: SERVICE_KEY,
    }, {
      apiFetch,
      getApplicationState: () => globalThis.__belavistaAppStore?.get?.() || {},
      getContext: currentContext,
      resolveRequestStage: resolveRequestStageV1,
      storageGet: readHostStorageV1,
      storageSet: writeHostStorageV1,
      getRequests: () => this.readConversationRequestState().requests,
      setRequests: requests => { this.writeConversationRequestState({ requests }); },
      setCurrentRequest: currentRequest => { this.writeConversationRequestState({ currentRequest }); },
      refreshServiceRequests: () => this.refreshServiceRequests(),
      render: () => this.render(),
    });
  }

  async refreshServiceRequest() {
    if (this.serviceRequestControllerV1) {
      if (this.root) this.root.dataset.chatServiceRequestLifecycleOwnerV1 = 'typescript-program';
      return this.serviceRequestControllerV1.refreshSelected();
    }
    const refreshTs = workerChatProgramTsV1?.refreshAtlasWorkerContextChatServiceRequestV1;
    if (typeof refreshTs === 'function') return refreshTs(SERVICE_KEY, this.serviceRequestPorts());
    const refreshLegacy = workerChatServiceRequestRecoveryV1?.refreshLegacyWorkerChatServiceRequestV1;
    if (typeof refreshLegacy !== 'function') return;
    return refreshLegacy(SERVICE_KEY, {
      apiFetch,
      storageGet: readHostStorageV1,
      setCurrentRequest: currentRequest => { this.writeConversationRequestState({ currentRequest }); },
      render: () => this.render(),
      setStatus: message => { if (this.status) this.status.textContent = message; },
    });
  }

  async refreshServiceRequests() {
    if (this.serviceRequestControllerV1) {
      if (this.root) this.root.dataset.chatServiceRequestLifecycleOwnerV1 = 'typescript-program';
      return this.serviceRequestControllerV1.refreshAll();
    }
    const refreshTs = workerChatProgramTsV1?.refreshAtlasWorkerContextChatServiceRequestsV1;
    if (typeof refreshTs === 'function') return refreshTs(SERVICE_KEY, this.serviceRequestPorts());
    const refreshLegacy = workerChatServiceRequestRecoveryV1?.refreshLegacyWorkerChatServiceRequestsV1;
    if (typeof refreshLegacy !== 'function') return;
    return refreshLegacy(SERVICE_KEY, {
      apiFetch,
      storageGet: readHostStorageV1,
      storageSet: writeHostStorageV1,
      getRequests: () => this.readConversationRequestState().requests,
      setRequests: requests => { this.writeConversationRequestState({ requests }); },
      setCurrentRequest: currentRequest => { this.writeConversationRequestState({ currentRequest }); },
      render: () => this.render(),
    });
  }

  commandExecutionPorts() {
    const createPorts = workerChatProgramTsV1?.createAtlasWorkerContextChatExecutionPortsV1;
    if (typeof createPorts === 'function') return createPorts({ host: globalThis, apiFetch });
    return {
      pathname: location.pathname,
      getStore: () => globalThis.__belavistaAppStore || null,
      querySelector: selector => document.querySelector(selector),
      waitForUi,
      nextPaint: () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      apiFetch,
      setLocalStorage: writeHostStorageV1,
      now: () => Date.now(),
      getLotDevelopmentProfileUpsert: () => globalThis.__BELAVISTA_UPSERT_LOT_DEVELOPMENT_PROFILE_V1 || null,
      allocateVisualRecord: () => globalThis.__BELAVISTA_ALLOCATE_VISUAL_RECORD_V1 || null,
    };
  }

  async executeToolCalls(calls, context = {}) {
    if (typeof this.commandControllerV1?.execute === 'function') {
      return this.commandControllerV1.execute(calls, context);
    }
    const executionPorts = this.commandExecutionPorts();
    const executeTs = workerChatProgramTsV1?.executeAtlasWorkerContextChatCommandsV1;
    if (typeof executeTs === 'function') return executeTs(calls, context, executionPorts);
    const executeLegacy = workerChatCommandExecutorRecoveryV1?.executeLegacyWorkerChatCommandsV1;
    if (typeof executeLegacy !== 'function') return calls.length ? ['Ações do chat indisponíveis.'] : [];
    return executeLegacy(calls, context, { ...executionPorts, normalizeAiAgendaComprehensionV1 });
  }

  readImage(file, source = 'file') {
    const componentRead = this.root?.readFile;
    if (typeof componentRead === 'function' && componentRead.call(this.root, file, source)) {
      this.root.dataset.chatFileReaderOwnerV1 = 'typescript-component';
      return;
    }
    const readFileTs = workerChatRendererTsV1?.readAtlasWorkerContextChatFileV1;
    if (typeof readFileTs !== 'function') {
      this.root.dataset.chatFileReaderOwnerV1 = 'unavailable';
      if (file && this.status) this.status.textContent = 'Leitor de anexos TypeScript indisponível. Recarregue o chat e tente novamente.';
      return;
    }
    this.root.dataset.chatFileReaderOwnerV1 = 'typescript';
    if (!file) return;
    readFileTs(file, source, {
      setFiles: files => { this.files = files; },
      setAttachment: attachment => { this.attachment = attachment; },
      setStatus: message => { if (this.status) this.status.textContent = message; },
      renderAttachment: () => this.renderAttachment(),
      selectTab: tab => this.setTab(tab),
    });
  }

  renderAttachment() {
    const componentRender = this.root?.renderAttachments;
    if (typeof componentRender === 'function' && componentRender.call(this.root)) {
      this.root.dataset.chatAttachmentRendererOwnerV1 = 'typescript-component';
      return;
    }
    const files = this.readComposerState().files;
    const slot = qs('[data-worker-chat-attachment]', this.root);
    if (!slot) return;
    const renderAttachmentsTs = workerChatRendererTsV1?.renderAtlasWorkerContextChatAttachmentListV1;
    if (typeof renderAttachmentsTs === 'function') {
      renderAttachmentsTs(slot, files);
      this.root.dataset.chatAttachmentRendererOwnerV1 = 'typescript';
    } else {
      this.root.dataset.chatAttachmentRendererOwnerV1 = 'mjs-fallback';
      slot.hidden = !files.length;
      slot.innerHTML = files.map((file,index)=>`<span><b>${esc(file.name)}</b><small>${esc(file.mimeType)}</small></span><button type="button" data-worker-chat-attachment-remove="${index}" aria-label="Remover ${esc(file.name)}">×</button>`).join('');
    }
    if (this.root?.dataset.chatComposerEventsOwnerV1 === 'typescript') return;
    slot.querySelectorAll('[data-worker-chat-attachment-remove]').forEach(button=>button.addEventListener('click', () => {
      this.removeAttachmentAt(button.dataset.workerChatAttachmentRemove);
    }));
  }

  readMapContext() {
    if (typeof this.componentStateControllerV1?.readMapContext === 'function') {
      return this.componentStateControllerV1.readMapContext(workerChatRendererTsV1);
    }
    let mapContext = this.root?.getMapContext?.() || null;
    if (!mapContext && this.root) {
      const typedReader = workerChatRendererTsV1?.readAtlasWorkerContextChatMapContextV1;
      if (typeof typedReader === 'function') {
        mapContext = typedReader(this.root, this.input);
      } else {
        const label = String(this.root.dataset.mapContextLabel || this.input?.dataset.mapContextLabel || '').trim();
        const kind = String(this.root.dataset.mapContextKind || this.input?.dataset.mapContextKind || '').trim();
        mapContext = label ? { kind: kind || 'map', label } : null;
      }
    }
    return mapContext;
  }

  async ask(message, attachment = null, options = {}) {
    const inferenceController = this.inferenceControllerV1;
    if (typeof inferenceController?.ask === 'function') {
      if (this.root) this.root.dataset.chatInferenceRequestOwnerV1 = 'typescript-program-controller';
      return inferenceController.ask({ message, attachment, options });
    }
    const context = currentContext();
    const appState=globalThis.__belavistaAppStore?.get?.()||{};
    const mapContext = this.readMapContext();
    const workspaceRequestTs = workerChatProgramTsV1?.requestAtlasWorkerContextChatWorkspaceReplyV1;
    if (typeof workspaceRequestTs === 'function') {
      if (this.root) this.root.dataset.chatInferenceRequestOwnerV1 = 'typescript-program';
      return workspaceRequestTs({
        apiFetch,
        pathname: location.pathname,
        message,
        attachment,
        options,
        applicationState: appState,
        context,
        mapContext,
      });
    }
    const selectedStageKey=String(appState.selectedStageV9||appState.selectedStage?.key||appState.selectedStage||context.stage||'').trim();
    const selectedStage=(context.stages||[]).find(stage=>String(stage.key)===selectedStageKey)||null;
    const recordInterpretation=attachment?buildRecordInterpretationV1({message,stages:context.stages,selectedStageKey}):null;
    const requestTs = workerChatProgramTsV1?.requestAtlasWorkerContextChatReplyV1;
    if (typeof requestTs === 'function') {
      if (this.root) this.root.dataset.chatInferenceRequestOwnerV1 = 'typescript-program';
      return requestTs({
        apiFetch,
        pathname: location.pathname,
        message,
        attachment,
        options,
        applicationState: appState,
        context,
        selectedStageKey,
        selectedStageName: String(selectedStage?.name || ''),
        mapContext,
        recordInterpretation,
        agendaInstruction: aiAgendaInstructionV1(appState.aiAgendaComprehensionV1),
      });
    }
    if (this.root) this.root.dataset.chatInferenceRequestOwnerV1 = 'legacy';
    const requestLegacy = workerChatInferenceRecoveryV1?.requestLegacyWorkerContextChatReplyV1;
    if (typeof requestLegacy !== 'function') throw new Error('Owner TypeScript e recuperação de inferência indisponíveis.');
    return requestLegacy({
      apiFetch,
      pathname: location.pathname,
      message,
      attachment,
      options,
      applicationState: appState,
      context,
      selectedStageKey,
      selectedStageName: String(selectedStage?.name || ''),
      mapContext,
      recordInterpretation,
      agendaInstruction: aiAgendaInstructionV1(appState.aiAgendaComprehensionV1),
      defaultInstruction: workerChatPolicyTsV1?.operationalExecutionInstruction,
      summary: contextSummary(context),
    });
  }

  runAction(action) {
    const componentAction = this.root?.runQuickAction;
    if (typeof componentAction === 'function' && componentAction.call(this.root, action)) {
      this.root.dataset.chatQuickActionOwnerV1 = 'typescript-component';
      return;
    }
    const runQuickActionTs = workerChatRendererTsV1?.runAtlasWorkerContextChatQuickActionV1;
    if (typeof runQuickActionTs === 'function' && this.root) {
      this.root.dataset.chatQuickActionOwnerV1 = 'typescript';
      runQuickActionTs(this.root, action, document);
      return;
    }
    const runRecovery = workerChatUiRecoveryV1?.runWorkerChatQuickActionLegacyV1;
    const applied = Boolean(this.root && typeof runRecovery === 'function' && runRecovery(this.root, action, document));
    if (this.root) this.root.dataset.chatQuickActionOwnerV1 = applied ? 'mjs-recovery' : 'unavailable';
  }

  executeSafeActions(text) {
    const typedAction = workerChatRendererTsV1?.runAtlasWorkerContextChatSafeActionsV1;
    if (typeof typedAction === 'function') {
      if (this.root) this.root.dataset.chatSafeActionsOwnerV1 = 'typescript-component';
      typedAction(text, document);
      return;
    }
    if (this.root) this.root.dataset.chatSafeActionsOwnerV1 = 'mjs-recovery';
    const lower = String(text).toLocaleLowerCase('pt-BR');
    if (/abrir.*alert|notifica/.test(lower)) qs('[data-notification-toggle]')?.click() || qs('[data-open-communications="notifications"]')?.click();
    if (/abrir.*contato|mensag/.test(lower)) qs('[data-open-communications="messages"]')?.click();
    if (/requis|cat[aá]logo/.test(lower)) qs('[data-requirements-catalog]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (/execut.*ciclo/.test(lower)) qs('[data-run-cycle]')?.click();
  }

  speak(text) {
    if (this.voiceController) return this.voiceController.speak(text);
    const synth = globalThis.speechSynthesis;
    if (!synth || typeof globalThis.SpeechSynthesisUtterance !== 'function') {
      this.status.textContent = 'Este navegador não disponibiliza avisos falados.';
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = 'pt-BR';
    const profile = SPEAKER_PROFILES.find(item => item.id === this.getVoiceState().profile) || SPEAKER_PROFILES[0];
    const voices = synth.getVoices?.() || [];
    const portuguese = voices.filter(voice => /^pt(?:-|_)/i.test(String(voice.lang || '')));
    const preferred = profile.terms.length
      ? portuguese.find(voice => profile.terms.some(term => String(voice.name || '').toLocaleLowerCase('pt-BR').includes(term)))
      : null;
    utterance.voice = preferred || portuguese.find(voice => /natural|neural|online/i.test(String(voice.name || ''))) || portuguese[0] || null;
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    synth.speak(utterance);
  }

  installObservation() {
    const installRuntimeObservation = this.runtimeControllerV1?.installObservation;
    if (typeof installRuntimeObservation === 'function') {
      const stop = installRuntimeObservation();
      if (typeof stop === 'function') {
        this.observationController = stop;
        return;
      }
    }
    let storage = null;
    try { storage = sessionStorage; } catch {}
    const installProgram = workerChatProgramTsV1?.installAtlasWorkerContextChatObservationProgramV1;
    if (typeof installProgram === 'function') {
      const stop = installProgram({
        host: {
          eventTarget: globalThis,
          documentRef: document,
          storage,
          setTimeout: globalThis.setTimeout.bind(globalThis),
          clearTimeout: globalThis.clearTimeout.bind(globalThis),
          requestAnimationFrame: globalThis.requestAnimationFrame.bind(globalThis),
          cancelAnimationFrame: globalThis.cancelAnimationFrame.bind(globalThis),
          requestIdleCallback: globalThis.requestIdleCallback?.bind(globalThis),
          MutationObserverCtor: globalThis.MutationObserver,
        },
        root: this.root,
        route: this.route,
        routeStorageKey: NAV_KEY,
        pathname: () => location.pathname,
        readContext: currentContext,
        labelForPath,
        componentOwners: workerChatRendererTsV1,
        voiceEnabled: () => this.getVoiceState().enabled,
        speak: message => this.speak(message),
      });
      if (typeof stop === 'function') {
        this.observationController = stop;
        return;
      }
    }
    this.root.dataset.chatObservationOwnerV1 = 'typescript-unavailable';
  }
}

const assistant = new WorkerContextChat();
assistant.mount();
globalThis.belavistaWorkerAssistant = assistant;
}
