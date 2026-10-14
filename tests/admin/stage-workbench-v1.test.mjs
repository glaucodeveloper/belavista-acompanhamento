import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STAGE_WORKBENCH,findWorkbenchActivity} from '../../stage-workbench-data.mjs';

test('catálogo cobre as oito etapas e seus requisitos operacionais',()=>{
  assert.equal(STAGE_WORKBENCH.length,8);
  for(const stage of STAGE_WORKBENCH){
    assert.ok(stage.key);
    assert.ok(stage.title);
    assert.ok(stage.activities.length>=3,`${stage.key} precisa de atividades detalhadas`);
    for(const activity of stage.activities){
      assert.ok(activity.id);
      assert.ok(activity.title);
      assert.ok(activity.unit);
      assert.ok(activity.release);
      assert.ok(activity.materials.length>0);
      assert.ok(activity.weight>0);
      assert.equal(findWorkbenchActivity(stage.key,activity.id).activity.id,activity.id);
    }
  }
});

test('rotas, persistência e propagação do diário estão ligadas ao servidor',async()=>{
  const [server,persistence,client]=await Promise.all([
    readFile(new URL('../../server.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../persistence.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../stage-workbench.mjs',import.meta.url),'utf8')
  ]);
  assert.match(server,/\/api\/workbench\/state/);
  assert.match(server,/\/api\/workbench\/diary/);
  assert.match(server,/recalculateOperationalState/);
  assert.match(persistence,/stage_workbench_state/);
  assert.match(persistence,/workbench_diary/);
  assert.match(persistence,/workbench_attachments/);
  assert.match(server,/evidence\.attached/);
  assert.match(client,/data-flow-card/);
  assert.match(client,/data-link-label/);
  assert.match(client,/Registrar e propagar/);
  assert.match(client,/Fotografar ou selecionar arquivo/);
  assert.match(client,/data-notification-toggle/);
  assert.match(client,/Marcar como lida/);
});

test('build público inclui a navegação dedicada',async()=>{
  const build=await readFile(new URL('../../scripts/build-public-pages.mjs',import.meta.url),'utf8');
  for(const file of ['stage-workbench.css','stage-attachments.css','stage-notifications.css','stage-workbench.mjs','stage-workbench-data.mjs','activity-map-editor.mjs','activity-map-layer.mjs'])assert.match(build,new RegExp(file.replaceAll('.','\\.')));
});

test('atividade usa pintura persistente somente nos polígonos do modelo 3D',async()=>{
  const [components,editor,layer,persistence]=await Promise.all([
    readFile(new URL('../../components.js',import.meta.url),'utf8'),
    readFile(new URL('../../activity-map-editor.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../activity-map-layer.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../persistence.mjs',import.meta.url),'utf8')
  ]);
  const operationalMap=await readFile(new URL('../../components/map/operational-record-map-v1.mjs',import.meta.url),'utf8');
  assert.match(operationalMap,/setActivityLocationPaintMode/);
  assert.match(operationalMap,/physicalMapPartAt/);
  assert.match(editor,/pointer|segure|pintando/i);
  assert.match(editor,/activityLocations/);
  assert.match(layer,/data-activity-map-legend/);
  assert.match(persistence,/activity_locations_json/);
});

test('atividade dedicada oferece botão Voltar para o fluxo da etapa',async()=>{
  const client=await readFile(new URL('../../stage-workbench.mjs',import.meta.url),'utf8');
  assert.match(client,/class="button button-secondary detail-back"/);
  assert.match(client,/aria-label="Voltar ao fluxo da etapa"/);
  assert.match(client,/← Voltar ao fluxo da etapa/);
  assert.match(client,/runtimeRouteV1\('\/admin\/workers\/stage',`stage=\$\{definition\.key\}`\)/);
});

test('atividades oferece destino Nova atividade preservando a etapa',async()=>{
  const [components,page,events,client]=await Promise.all([
    readFile(new URL('../../components.js',import.meta.url),'utf8'),
    readFile(new URL('../../components/planning/stage-activity-page-v1.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../components/planning/stage-extension-events-v1.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../stage-workbench.mjs',import.meta.url),'utf8')
  ]);
  assert.match(page,/data-activity-new/);
  assert.match(events,/workers\/activity/);
  assert.match(events,/stageKey/);
  assert.match(events,/activity=new/);
  assert.match(client,/activityId==='new'/);
  assert.match(client,/title:'Nova atividade'/);
});

test('admin mostra a base leve antes do carregamento do modelo 3D',async()=>{
  const [styles,standaloneStartup,mapActivation]=await Promise.all([
    readFile(new URL('../../styles.css',import.meta.url),'utf8'),
    readFile(new URL('../../components/map/admin-standalone-startup-v5370.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../components/map/map-scene-activation-v1.mjs',import.meta.url),'utf8')
  ]);
  assert.match(standaloneStartup,/admin3dAutostart = "after-static-first-paint"/);
  assert.match(mapActivation,/mountAdminStandalone3DV5370\(\)/);
  assert.match(standaloneStartup,/startAdminStandalone3DV5370\(\)/);
  assert.match(standaloneStartup,/this\.installAdminMasterplanOverlayV1\(\)/);
  assert.match(standaloneStartup,/button\.hidden = true/);
  assert.match(styles,/data-admin-standalone-boot/);
});

test('atividades antigas e agenda encaminham para a atividade com mapa físico',async()=>{
  const [components,activityBridge,lifecycle,activityResolver]=await Promise.all([
    readFile(new URL('../../components.js',import.meta.url),'utf8'),
    readFile(new URL('../../components/planning/activity-route-bridge.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../components/planning/activity-route-bridge-lifecycle-v1.mjs',import.meta.url),'utf8'),
    readFile(new URL('../../components/planning/activity-route-resolver.mjs',import.meta.url),'utf8')
  ]);
  assert.match(components,/installActivityRouteBridgeLifecycleV1\(\{/);
  assert.match(activityBridge,/data-v5362-activity/);
  assert.match(activityBridge,/data-v5360-stage-card/);
  assert.match(activityBridge,/data-v5356-stage-activity/);
  assert.match(activityBridge,/data-activity-v9/);
  assert.match(activityBridge,/data-activity-detail/);
  assert.match(activityBridge,/data-activity-open/);
  assert.match(activityBridge,/data-agenda-item/);
  assert.match(components,/workbenchActivityRouteV1/);
  assert.match(activityResolver,/legacyStage/);
  assert.match(activityBridge,/data-activity-edit/);
  assert.match(lifecycle,/installActivityRouteBridgeV1\(this, workbenchActivityRouteV1\)/);
  assert.match(lifecycle,/installActivityRouteBridgeV1\(root, workbenchActivityRouteV1\)/);
  assert.match(activityBridge,/resolveActivityRoute\(activityValue, stageValue\)/);
  assert.match(activityResolver,/runtimeRouteV1\(\s*["']\/admin\/workers\/activity["'],/);
});
