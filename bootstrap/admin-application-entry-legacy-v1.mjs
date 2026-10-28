// BELAVISTA_ORIGINAL_ADMIN_BOOTSTRAP_V5351

const boot=document.querySelector('#boot');

function setBoot(text,detail=''){
  if(!boot)return;
  const p=boot.querySelector('p')||boot.appendChild(document.createElement('p'));
  p.textContent=text;

  let detailNode=boot.querySelector('[data-boot-detail-v5351]');
  if(!detailNode){
    detailNode=document.createElement('pre');
    detailNode.dataset.bootDetailV5351='true';
    detailNode.style.cssText=
      'max-width:min(820px,calc(100vw - 40px));max-height:38vh;overflow:auto;'+
      'white-space:pre-wrap;text-align:left;font:11px/1.45 ui-monospace,monospace;'+
      'color:#ffb4b4;background:#08131f;border:1px solid #314254;padding:12px;'+
      'margin-top:14px;display:none';
    boot.append(detailNode);
  }

  detailNode.textContent=detail;
  detailNode.style.display=detail?'block':'none';
}

globalThis.__BELAVISTA_BOOT_V5351={
  startedAt:performance.now(),
  phase:'bootstrap',
  errors:[]
};

window.addEventListener('error',event=>{
  globalThis.__BELAVISTA_BOOT_V5351.errors.push({
    type:'error',
    message:event.message,
    source:event.filename,
    line:event.lineno,
    column:event.colno
  });
});

window.addEventListener('unhandledrejection',event=>{
  globalThis.__BELAVISTA_BOOT_V5351.errors.push({
    type:'unhandledrejection',
    message:String(event.reason?.stack||event.reason||'')
  });
});

setBoot('Abrindo administrativo original…');

const watchdog=setTimeout(()=>{
  const appDefined=Boolean(customElements.get('belavista-app'));
  const app=document.querySelector('belavista-app');

  if(!appDefined||app?.hidden){
    globalThis.__BELAVISTA_BOOT_V5351.phase='watchdog';
    setBoot(
      'O módulo principal ainda não concluiu.',
      JSON.stringify({
        appDefined,
        appExists:Boolean(app),
        appHidden:app?.hidden??null,
        errors:globalThis.__BELAVISTA_BOOT_V5351.errors
      },null,2)
    );
  }
},3500);

try{
  globalThis.__BELAVISTA_BOOT_V5351.phase='import-app';
  // Module scripts in index.html may finish out of order. Install the auth gate
  // before app.js checks BELAVISTA_ADMIN_AUTH_REQUIRED and mounts API-backed views.
  // Reuse the same module URL as index.html. A second auth module instance
  // would replace the session invalidator with stale behavior.
  await import('../admin-auth.mjs?v=github-pat-session-timeout-v18-leads-route-owner&ts-admin-auth-gate-projection-v1&ts-admin-auth-session-flow-v1&ts-admin-auth-runtime-owner-v1&ts-admin-auth-application-owner-v1&desktop-local-demo-v1&ts-dashboard-organic-layout-v1&ts-dashboard-crm-summary-v1&ts-progress-diary-form-v1&local-demo-user-v1&local-demo-signout-v1');
  await import('../app.js?v=atlas-admin-ts-reports-workspace-v136-view-layer-ts-exclusive&ts-commercial-workspace-projections-v1&ts-state-catalogs-program-owner-v1&ts-runtime-state-bootstrap-owner-v1&ts-ai-chat-component-owner-v1&ts-stage-record-center-owner-v1&ts-sidebar-routes-composition-v1&auth-pat-gate-v18&ts-map-scene-connection-v1&ts-map-three-foundation-v1&ts-map-three-gestures-v1&ts-map-three-init-owner-v1&ts-map-dwg-georeference-owner-v1&ts-map-masterplan-glb-loader-v1&ts-map-masterplan-gpu-enrichment-v1&ts-map-model-client-cache-v1&ts-map-pdf-geometry-projection-v1&ts-admin-pdf-texture-binding-v1&ts-admin-pdf-layer-builder-v1&ts-admin-pdf-underlay-v1&ts-admin-pdf-anchor-projection-v1&ts-finance-application-composition-v1&ts-commercial-application-composition-v1&ts-project-documents-chat-navigation-v1&ts-project-documents-sheet-navigation-v1&ts-settings-usage-preferences-v1&ts-sidebar-direct-adapter-v1&ts-planning-pages-composition-v1&ts-stage-composition-v1&ts-leads-route-owner-v1&ts-settings-ai-agenda-v1&ts-agenda-store-snapshot-v1&ts-map-scene-navigation-owner-v1&ts-map-stage-overlay-owner-v1&ts-map-dashboard-mode-highlight-owner-v1&ts-map-application-registration-owner-v1&ts-stage-composition-v1&ts-leads-route-owner-v1&ts-map-interaction-composition-v1&ts-map-asset-composition-v1&ts-map-foundation-composition-v1&ts-record-application-composition-v1&ts-record-service-projections-v1&ts-material-report-v1&ts-stage-service-rows-v1&ts-stage-resources-view-v1&ts-map-pdf-three-admin-owners-v1&ts-contracts-page-ts-owner-v1&ts-public-map-presentation-owners-v1&ts-admin-road-geometry-owner-v1&ts-admin-standalone-map-owners-v1&ts-ai-chat-component-owner-v1&ts-stage-record-center-owner-v1&ts-control-center-page-owner-v1&ts-map-camera-lifecycle-owner-v1&ts-map-scene-sync-owner-v1&ts-map-raster-context-owner-v1&ts-map-camera-lifecycle-owner-v1&ts-compact-map-owners-v1&ts-reference-aerial-scene-owner-v1&ts-operational-record-map-owner-v1&ts-admin-model-calibration-owner-v1&ts-map-gpu-enrichment-owner-v1&ts-view-layer-owner-v1&ts-admin-deferred-loader-v1&ts-admin-runtime-owner-v1&ts-admin-shell-lifecycle-v1&ts-stage-activity-page-owner-v1&ts-stage-operational-model-owner-v1&ts-stage-agenda-page-owner-v1&ts-stage-agenda-program-owner-v1&ts-stage-panorama-page-owner-v1&ts-pert-workspace-owner-v1&ts-stage-context-chrome-owner-v1&ts-dashboard-home-owner-v1&ts-component-application-program-v1&ts-usage-preferences-runtime-bridge-v1&ts-cash-record-shortcuts-owner-v1&ts-admin-access-policy-owner-v1&ts-control-record-drawer-owner-v1&ts-planning-runtime-context-owners-v1&ts-planning-context-markup-owner-v1&ts-planning-runtime-context-program-owner-v1&ts-stage-extension-events-owner-v1&ts-lot-development-profile-model-v1&ts-activity-form-groups-renderer-v1&ts-activity-installation-steps-json-v1&ts-stage-navigation-program-owner-v1&ts-commercial-scope-owner-v1&ts-worker-context-chat-inference-v1&ts-repasse-catalog-map-owner-v1&ts-agenda-calendar-program-domain-v1&ts-admin-application-bootstrap-adapter-v1&ts-agenda-stage-options-v1&ts-dashboard-organic-layout-v1&ts-dashboard-crm-summary-v1&ts-progress-diary-form-v1&atlas-dashboard-organic-chart-layout-v3');
  globalThis.__BELAVISTA_BOOT_V5351.phase='app-imported';
  globalThis.__BELAVISTA_BOOT_V5351.importedAt=performance.now();
  clearTimeout(watchdog);

  // app.js owns removal of #boot. If it imported but did not enter startApp,
  // leave an explicit diagnostic instead of an endless generic spinner.
  setTimeout(()=>{
    const stillBoot=document.querySelector('#boot');
    if(!stillBoot)return;

    const app=document.querySelector('belavista-app');
    const install=document.querySelector('cloudflare-bootstrap');

    if(app?.hidden && install?.hidden===false){
      setBoot('Configuração administrativa necessária.');
      return;
    }

    setBoot(
      'app.js carregou, mas startApp() não liberou o painel.',
      JSON.stringify({
        appDefined:Boolean(customElements.get('belavista-app')),
        appExists:Boolean(app),
        appHidden:app?.hidden??null,
        installExists:Boolean(install),
        installHidden:install?.hidden??null,
        deferred:globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351||null,
        errors:globalThis.__BELAVISTA_BOOT_V5351.errors
      },null,2)
    );
  },1200);

}catch(error){
  clearTimeout(watchdog);
  const detail=String(error?.stack||error?.message||error);
  globalThis.__BELAVISTA_BOOT_V5351.phase='app-import-failed';
  globalThis.__BELAVISTA_BOOT_V5351.errors.push({
    type:'app-import',
    message:detail
  });

  console.error('[Belavista admin bootstrap v5.3.51]',error);
  setBoot(
    'Falha ao carregar o administrativo original.',
    detail
  );
}
