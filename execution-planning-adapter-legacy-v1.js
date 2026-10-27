// TS-first adapter for the cash, commission, outsourcing, and field-note surfaces.
import { appStore } from './state.js?v=system-metrics-v1-20260919&ts-state-catalogs-program-owner-v1';
import { apiFetch } from './api-client.mjs?v=github-pat-gateway-v1';

if (!globalThis.__belavistaExecutionPlanningControllerV1) {
  const program = await import('./dist/frontend/program.js').catch(() => null);
  let installed = false;
  try {
    if (typeof program?.installAtlasExecutionPlanningV1 === 'function') {
      globalThis.__belavistaExecutionPlanningControllerV1 = program.installAtlasExecutionPlanningV1({ appStore, apiFetch, document, window });
      document.documentElement.dataset.executionPlanningOwnerV1 = 'typescript';
      installed = true;
    }
  } catch (error) {
    console.warn('[execution-planning] owner TypeScript indisponível; mantendo recuperação MJS.', error);
  }
  if (!installed) {
    await import('./execution-planning-legacy-v8.js?v=execution-planning-recovery-v1');
    document.documentElement.dataset.executionPlanningOwnerV1 = 'legacy-recovery';
  }
}
