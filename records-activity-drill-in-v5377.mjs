// Thin host adapter: records UI, commands, policy, and route rendering belong to the TS monoliths.
const rootOwner = document.documentElement.dataset.atlasAdminBootstrapOwnerV1 || '';
if (rootOwner.startsWith('typescript') || document.documentElement.dataset.recordsActivityDrillAdapterV1) {
  // The application root owns this composition, or another compatibility entry started it.
} else {
  document.documentElement.dataset.recordsActivityDrillAdapterV1 = 'starting';
const [{appStore, demoData}, {apiFetch}] = await Promise.all([
  import('./state.js?v=system-metrics-v1-20260919&ts-state-catalogs-program-owner-v1'),
  import('./api-client.mjs'),
]);

const legacyUrl = new URL('./records-activity-drill-in-legacy-v5377.mjs?v=records-drill-ts-first-v1', import.meta.url);
const programUrl = new URL('./dist/frontend/program.js', import.meta.url);
const componentsUrl = new URL('./dist/frontend/components.js', import.meta.url);
let activation = null;

async function installTypeScriptOwners() {
  const [program, views] = await Promise.all([import(programUrl.href), import(componentsUrl.href)]);
  const stages = program.projectAtlasRecordsActivityCatalogV1();
  const demoStages = Array.isArray(demoData.activities) ? demoData.activities : [];
  const activeViewLayer = customElements.get('view-layer');
  const esc = views.escapeAtlasDomValueV1;
  const ico = views.renderAtlasIconMarkupV1;
  if (typeof activeViewLayer !== 'function' || typeof esc !== 'function' || typeof ico !== 'function') return false;
  const persistencePorts = program.createAtlasRecordsActivityPersistencePortsV1({apiFetch, appStore});
  const setRecordStatus = views.setAtlasRecordsActivityStatusV1;

  views.bindAtlasRecordsShellCommandsV1(document);
  program.installAtlasRecordsShellCommandsV1({host: document, appStore, stages, demoStages});
  program.installAtlasRecordsActivityDrillCommandsV1({
    host: document,
    appStore,
    stages,
    demoStages,
    propertyMapPort: {
      getMap: () => document.querySelector('map-scene[data-persistent-map="true"], map-scene'),
      setStatus: setRecordStatus,
    },
    recordEntryPort: {
      ...persistencePorts,
      setStatus: setRecordStatus,
    },
  });

  const installed = program.installAtlasRecordsActivityDrillRouteV1({
    host: document,
    ViewLayer: activeViewLayer,
    appStore,
    stages,
    demoStages,
    esc,
    ico,
  });
  if (!installed) return false;
  document.documentElement.dataset.recordsActivityDrillOwner = 'typescript';
  globalThis.__BELAVISTA_RECORDS_ACTIVITY_DRILL_IN_V5377 = {
    version: '5.3.77-ts-owner',
    installedAt: new Date().toISOString(),
  };
  return true;
}

async function activate() {
  try {
    await customElements.whenDefined('view-layer');
    if (await installTypeScriptOwners()) return true;
    throw new Error('O instalador TypeScript de Registros não aceitou a ViewLayer ativa.');
  } catch (error) {
    console.warn('[records-drill-in-v5377] owner TypeScript indisponível; carregando recuperação MJS.', error);
    await import(legacyUrl.href);
    return false;
  }
}

const installRecordsActivityDrillInV5377 = () => activation ||= activate();
globalThis.installBelavistaRecordsActivityDrillInV5377 = installRecordsActivityDrillInV5377;
void installRecordsActivityDrillInV5377();
}
