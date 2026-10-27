// TS-first adapter for the stage report and AI configuration workspace.
import { appStore } from './state.js?v=operations-v19&ts-stage-admin-program-owner-v1';
import { apiFetch } from './api-client.mjs';

if (!globalThis.__belavistaStageAdministrationControllerV1) {
  const program = await import('./dist/frontend/program.js').catch(() => null);
  let installed = false;
  try {
    if (typeof program?.installAtlasStageAdministrationV1 === 'function') {
      globalThis.__belavistaStageAdministrationControllerV1 = program.installAtlasStageAdministrationV1({ appStore, apiFetch, document, window });
      installed = true;
      document.documentElement.dataset.stageAdministrationOwnerV1 = 'typescript';
    }
  } catch (error) {
    console.warn('[stage-admin] owner TypeScript indisponível; mantendo recuperação MJS.', error);
  }
  if (!installed) {
    await import('./stage-admin-legacy-v10.js?v=stage-administration-recovery-v1');
    document.documentElement.dataset.stageAdministrationOwnerV1 = 'legacy-recovery';
  }
}
