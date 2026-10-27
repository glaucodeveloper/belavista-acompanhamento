import { ATLAS_STATE_CATALOGS_V1, atlasCycle, atlasStateTransitions, atlasWindows, clearAtlasUiState, createAtlasApplicationStore, initializeAtlasApplicationRuntimeV1, persistAtlasUiState, restoreAtlasUiState } from './dist/frontend/program.js';
export const {demoData,executionModel,personnelModel,commissionReasonDefaults,cashFlowSeed,viewThemes,dashboardModes,spreadsheetSchema,reportCatalog,activityCatalog,activityInstallationDefaults}=ATLAS_STATE_CATALOGS_V1;

export {atlasCycle as cycle,atlasWindows as windows,atlasStateTransitions as stateTransitions};

export const UI_MEMORY_KEY = 'belavista.ui-memory.v1';
export const restoreUiState = (...args) => restoreAtlasUiState(...args);
export const persistUiState = (...args) => persistAtlasUiState(...args);
export const clearUiState = (...args) => clearAtlasUiState(...args);
export function createStore(initial) {
  return createAtlasApplicationStore(initial);
}

const browserStorage = key => {
  try { return globalThis[key]; }
  catch { return null; }
};
export const {appStore} = initializeAtlasApplicationRuntimeV1({
  globalRef:globalThis,
  localStorage:browserStorage('localStorage'),
  sessionStorage:browserStorage('sessionStorage'),
});
