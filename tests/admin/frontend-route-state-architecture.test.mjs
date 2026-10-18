import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const programUrl = new URL('../../frontend/src/program.ts', import.meta.url);
const componentsUrl = new URL('../../frontend/src/components.ts', import.meta.url);
const contractUrl = new URL('../../frontend/PROGRAM.md', import.meta.url);
const shellUrl = new URL('../../components/index.mjs', import.meta.url);
const originalCatalogUrl = new URL('../../stage-workbench-data.mjs', import.meta.url);
const persistenceUrl = new URL('../../persistence.mjs', import.meta.url);
const serverUrl = new URL('../../server.mjs', import.meta.url);

test('the program has one state iterator and it owns route identity only', async () => {
  const program = await readFile(programUrl, 'utf8');
  const generators = [...program.matchAll(/function\*\s+(\w+)\s*\(/g)].map((match) => match[1]);

  assert.deepEqual(generators, ['routeStateProgram', 'program']);
  assert.equal((program.match(/routeState\.next\(/g) || []).length, 3); // initialize once, then sync + navigate in the route function
  assert.match(program, /type RouteState = \{ view: string; stageKey\?: string \| null; stageId\?: string \| number \| null; brokerId\?: string \| null; saleId\?: string \| null; lotProfileId\?: string \| null \}/);
  assert.match(program, /function navigateRoute\([\s\S]*?routeState\.next\(\{ type: 'sync'/);
  assert.match(program, /function navigateRoute\([\s\S]*?routeState\.next\(\{ type: 'navigate'/);
  assert.match(program, /selectedDevelopmentProfileId != null \? \{ lotProfileId: String\(raw\.selectedDevelopmentProfileId\) \}/);
  assert.match(program, /selectedDevelopmentProfileId: next\.lotProfileId \?\? null/);
  assert.doesNotMatch(program, /\b(?:session|records|materials|agendaEvents|loading|filters)\s*:\s*[^;\n]*RouteState/);
});

test('component state advances locally through next, not update methods or a global route iterator', async () => {
  const [components, contract] = await Promise.all([
    readFile(componentsUrl, 'utf8'),
    readFile(contractUrl, 'utf8'),
  ]);

  assert.match(components, /this\.state\.next\(/);
  assert.doesNotMatch(components, /\b(?:this\.)?state\.update\s*\(/);
  assert.doesNotMatch(components, /appStore\.update\s*\(/);
  assert.match(contract, /exactly one state iterator: `routeStateProgram`/);
  assert.match(contract, /Element-local transitions do not create\s+another program-level state iterator/);
});

test('settings inference serializes its persistence against workbench edits and verifies read-back', async () => {
  const [program, shell] = await Promise.all([readFile(programUrl, 'utf8'), readFile(shellUrl, 'utf8')]);
  const inference = program.match(/async function inferSettingsSession\(event: Event\): Promise<void> \{([\s\S]*?)\n  \}\n\n  \/\*\* Save or update a persisted dynamic access role/);
  assert.ok(inference, 'settings inference handler is present');
  assert.match(inference[1], /workbenchSaveQueues\.get\(detail\.stageKey\)/);
  assert.match(inference[1], /readApi<\{ state: StageWorkbenchState \}>\(path\)/);
  assert.match(inference[1], /writeApi<\{ state: StageWorkbenchState \}>\(path, state\)/);
  assert.match(inference[1], /currentStage\?\.workbenchSource === 'worker-defaults'/);
  assert.match(inference[1], /releitura não confirmou sua persistência/);
  assert.match(shell, /installSettingsRoute\(ViewLayer, appStore, document\)/);
});

test('the TypeScript settings program preserves the original Worker catalogue as a read-only fallback', async () => {
  const [program, originalModule] = await Promise.all([
    readFile(programUrl, 'utf8'),
    import(originalCatalogUrl.href),
  ]);
  const match = program.match(/const originalWorkbenchCatalog = (\[[\s\S]*?\]) as OriginalWorkbenchStage\[\];/);
  assert.ok(match, 'the original operational catalog is embedded in the program monolith');
  const migrated = JSON.parse(match[1]);
  const fields = ['description', 'responsibility', 'entryConditions', 'production', 'materials', 'equipment', 'evidence', 'acceptance', 'conditions', 'notifications', 'legalBasis', 'outputs'];
  const source = originalModule.STAGE_WORKBENCH.map(stage => ({
    ...stage,
    activities: stage.activities.map(activity => ({
      ...activity,
      operational: Object.fromEntries(fields.filter(key => activity.operational?.[key] !== undefined).map(key => [key, activity.operational[key]])),
    })),
  }));
  assert.deepEqual(migrated, source);
  assert.equal(migrated.length, 8);
  assert.equal(migrated.reduce((sum, stage) => sum + stage.activities.length, 0), 45);
  assert.match(program, /persisted\.length \? persisted : \(definition\?\.activities \|\| \[\]\)\.map/);
  assert.match(program, /workbenchSource: persisted\.length \? 'persisted' : definition \? 'worker-defaults' : 'unavailable'/);
});

test('repository contact editability matches the Worker contract without exposing key administration in native', async () => {
  const components = await readFile(componentsUrl, 'utf8');
  assert.match(components, /const contactWritable = \["owner", "admin", "developer"\]\.includes\(s\.actorRole\)/);
  assert.match(components, /roleAdmin=s\.actorRole==="owner"&&!s\.isNative/);
});

test('dashboard quick record is owned by its element and persists through the canonical records API', async () => {
  const [components, program] = await Promise.all([
    readFile(componentsUrl, 'utf8'),
    readFile(programUrl, 'utf8'),
  ]);
  assert.match(components, /data-record-form/);
  assert.match(components, /capture="environment"/);
  assert.match(components, /atlas:dashboard-record-create/);
  assert.match(components, /this\.state\.next\(/);
  assert.match(program, /async function createDashboardRecord\(event: Event\)/);
  assert.match(program, /mutateApi<OperationalRecord>\('\/api\/records', 'POST', detail\.payload\)/);
  assert.match(program, /await reloadDashboard\(\)/);
  assert.match(program, /atlas:dashboard-record-create/);
  assert.match(program, /ViewLayer\.prototype\.control = \(\) => '<atlas-dashboard><\/atlas-dashboard>'/);
  for (const endpoint of ['/api/cash-flow', '/api/stages-admin', '/api/records', '/api/notifications', '/api/agenda-events', '/api/materials', '/api/repasses'])
    assert.ok(program.includes(endpoint), `dashboard snapshot includes live ${endpoint} source`);
});

test('lot development is a TypeScript route over persisted profiles and cash, with the selected profile in route identity', async () => {
  const [program, components, persistence, server, shell] = await Promise.all([
    readFile(programUrl, 'utf8'), readFile(componentsUrl, 'utf8'),
    readFile(persistenceUrl, 'utf8'), readFile(serverUrl, 'utf8'), readFile(shellUrl, 'utf8'),
  ]);
  assert.match(program, /installLotDevelopmentRoute\(ViewLayer[\s\S]*?ViewLayer\.prototype\.lotDevelopment=\(\)=>'<atlas-lot-development>/);
  assert.match(program, /readApi<\{profiles:LotDevelopmentProfile\[\]\}>\('\/api\/lot-development\/profiles'\)/);
  assert.match(program, /readApi<\{entries:CashFlowRecord\[\]\}>\('\/api\/cash-flow'\)/);
  assert.match(program, /atlas:lot-profile-open/);
  assert.match(program, /lotProfileId:detail\.id/);
  assert.match(components, /export class AtlasLotDevelopment extends HTMLElement/);
  assert.match(components, /this\.state\.next\(/);
  assert.match(components, /atlas:lot-profile-save/);
  assert.doesNotMatch(program, /appStore\.get\(\)\.developmentProfiles/);
  assert.match(persistence, /CREATE TABLE IF NOT EXISTS lot_development_profiles/);
  assert.match(persistence, /export function listLotDevelopmentProfiles\(/);
  assert.match(persistence, /export function saveLotDevelopmentProfile\(/);
  assert.match(persistence, /export function deleteLotDevelopmentProfile\(/);
  assert.match(server, /requireRoles\(req,\['owner','admin','developer'\]\),profile=saveLotDevelopmentProfile/);
  assert.match(shell, /installLotDevelopmentRoute\(ViewLayer, appStore, document\)/);
});
