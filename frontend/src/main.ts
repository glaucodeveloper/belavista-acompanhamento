/** Load the imperative owner, then resolve the pre-shell host for this document. */
async function startDocument(): Promise<void> {
  const isAdminDocument = document.body.classList.contains('admin-shell-page');
  if (isAdminDocument) {
    document.documentElement.dataset.atlasAdminBootstrapOwnerV1 = 'typescript-pending';
    document.documentElement.dataset.atlasWorkerContextChatRootOwnerV1 = 'typescript-pending';
  }
  const programModuleUrl = new URL('./program.js?v=ts-public-lead-upload-direct-v1&ts-firebase-sdk-runtime-recovery-v1&ts-map-geometry-loader-program-owner-v1&ts-map-overlay-direct-program-projections-v3&ts-activity-map-overlay-services-v1&ts-agenda-command-projections-v1&ts-agenda-week-gesture-v1&ts-ai-agenda-proposal-contract-v1&ts-agenda-pending-command-owner-v1&ts-agenda-shared-event-projection-v1&ts-agenda-calendar-event-mutation-v1&ts-agenda-inline-editor-mutation-v1&ts-stage-agenda-create-event-program-v1&ts-agenda-calendar-gesture-event-write-v1&ts-agenda-status-transition-program-v1&ts-activity-installation-card-policy-v1&ts-activity-installation-form-policy-v1&ts-record-ocr-form-component-owner-v1&ts-record-ocr-review-dto-program-v1&ts-chat-submission-program-owner-v1&ts-chat-attachment-action-program-owner-v1&ts-ai-chat-contextual-suggestions-program-v1&ts-dashboard-lot-analysis-chart-program-v1&ts-dashboard-agenda-material-join-v1&ts-dashboard-operational-overview-program-v1&ts-dashboard-control-table-projection-v1&ts-dashboard-record-submission-program-v1&ts-dashboard-cash-chart-scaling-program-v1&ts-dashboard-agenda-navigation-program-v1&ts-activity-form-projections-program-v1&ts-progress-page-projection-program-v1&ts-activities-page-projection-program-v1&ts-materials-page-projection-program-v1&ts-agenda-page-projections-program-v1&ts-repasses-page-projection-program-v1&ts-sales-history-page-projection-program-v1&ts-broker-directory-page-projection-program-v1&ts-lot-board-page-projection-program-v1&ts-dashboard-page-projection-program-v1&ts-leads-page-projection-program-v1&ts-project-documents-page-projection-program-v1&ts-settings-page-projection-program-v1&ts-lot-development-page-projection-program-v1&ts-records-page-projection-program-v1&ts-communications-page-projection-program-v1&ts-operational-map-page-projection-program-v1&ts-agenda-calendar-display-program-v1&ts-materials-page-display-program-v1&ts-cash-record-command-program-v1&ts-public-field-record-draft-context-program-v1&ts-cash-record-page-projection-v1&ts-instagram-reply-draft-program-v1&ts-lot-development-save-draft-program-v1&ts-material-save-draft-program-v1&ts-material-transition-inline-edit-program-v1&ts-agenda-status-transition-program-v1&ts-project-document-save-draft-program-v1&ts-project-document-cell-mutation-program-v1&ts-repasse-form-command-program-v1&ts-settings-form-drafts-program-v1&ts-progress-activity-record-form-program-v1&ts-report-builder-model-program-v1&ts-report-cash-upload-program-v1&ts-public-lead-reservation-drafts-program-v1&ts-public-lead-chat-events-program-v1&ts-activity-installation-command-owners-v1&ts-activity-admin-crud-program-owner-v1&ts-desktop-setup-form-program-owner-v1&ts-dashboard-quick-record-program-owner-v1&ts-progress-record-command-program-owner-v1&ts-control-stage-context-save-program-owner-v1&ts-control-inline-record-program-owner-v1&ts-control-center-edit-commands-program-owner-v1&ts-control-center-realtime-lifecycle-program-owner-v1&ts-control-stage-context-save-duplicate-binding-owner-v1&ts-control-stage-context-single-form-binding-v1&ts-control-center-component-no-api-port-v1&ts-stage-activity-loader-program-owner-v1&ts-stage-activity-navigation-program-owner-v1&ts-operational-loop-program-owner-v1&ts-operational-notifications-lifecycle-program-owner-v1&ts-report-cash-evidence-program-ports-v1&ts-agenda-event-loader-program-owner-v1&ts-agenda-navigation-state-commands-v1&ts-report-workspace-commands-program-owner-v1&ts-map-filter-rail-commands-program-owner-v1&ts-map-spatial-selection-state-commands-v1&ts-map-lot-selection-state-commands-v1&ts-map-ts-only-composition-v1&ts-map-scene-state-command-owners-v1&ts-agenda-page-component-controller-v2&ts-agenda-page-projection-component-v1&ts-commercial-page-projections-component-v1&ts-data-table-display-component-v1&ts-project-documents-page-projection-component-v1&ts-ai-chat-contextual-suggestion-component-v1&ts-map-pdf-number-labels-v1&ts-settings-form-draft-component-v1&ts-settings-workbench-presentation-component-v1&ts-agenda-event-form-draft-v1&ts-agenda-record-draft-v1&ts-agenda-status-command-v1&ts-agenda-gesture-canonical-write-v1', import.meta.url);
  programModuleUrl.searchParams.set('ts-sidebar-agenda-hidden-v1', '');
  programModuleUrl.searchParams.set('ts-stage-dedicated-navigation-command-v1', '');
  programModuleUrl.searchParams.set('ts-component-store-write-commands-v1', '');
  programModuleUrl.searchParams.set('ts-map-camera-widget-store-commands-v1', '');
  programModuleUrl.searchParams.set('ts-map-pdf-lot-assets-298-v1', '');
  programModuleUrl.searchParams.set('ts-admin-standalone-geospatial-program-v1', '');
  programModuleUrl.searchParams.set('ts-map-marker-overrides-program-storage-v1', '');
  programModuleUrl.searchParams.set('ts-admin-map-geometry-loader-required-v1', '');
  programModuleUrl.searchParams.set('ts-admin-map-startup-persistence-program-only-v1', '');
  const application = await import(programModuleUrl.href) as typeof import('./program.js');
  const root = document.querySelector<HTMLElement>('#app,[data-app-entry],belavista-app');
  if (!root) throw new Error('Elemento de entrada da aplicação não encontrado.');
  await application.startAtlasDocumentEntryV1(root);
}

void startDocument().catch(error => {
  if (document.body.classList.contains('admin-shell-page')) {
    document.documentElement.dataset.atlasAdminBootstrapOwnerV1 = 'typescript-failed';
    document.documentElement.dataset.atlasWorkerContextChatRootOwnerV1 = 'typescript-failed';
  }
  console.error('Não foi possível iniciar a aplicação TypeScript.', error);
  throw error;
});
