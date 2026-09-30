import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { demoData, executionModel, activityCatalog, cashFlowSeed, appStore } from '../../../state.js';
import { REPASSE_PRICE_CATALOG } from '../../../repasse-price-catalog.mjs';

// Keep the Ruby UI's initial catalogue derived from the original JS sources.
const output = fileURLToPath(new URL('../public/data/original-snapshot.json', import.meta.url));
const snapshot = {
  generatedFrom: ['state.js', 'repasse-price-catalog.mjs'],
  project: demoData.project,
  metrics: demoData.metrics,
  activities: demoData.activities,
  materials: demoData.materials,
  stageMaterials: demoData.stageMaterials,
  purchases: demoData.purchases,
  records: appStore.get().records,
  stages: executionModel.stages,
  activityCatalog,
  cashFlowSeed,
  lots: REPASSE_PRICE_CATALOG.filter((lot) => lot.lot > 0 && lot.area > 0 && lot.price > 0),
};
await mkdir(fileURLToPath(new URL('../public/data/', import.meta.url)), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot)}\n`);
console.log(`Exported ${snapshot.stages.length} stages and ${snapshot.lots.length} lots to ${output}`);
