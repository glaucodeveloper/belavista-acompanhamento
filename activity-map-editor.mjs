/** Compatibility entry for the worker activity map editor. */
export async function mountWorkerActivityMapEditorV1(input) {
  const host = input.host || document.querySelector('[data-activity-map-editor]');
  if (!host) return false;
  if (host.dataset.editorMounted === 'true') return true;

  const mount = input.programTs?.mountWorkerActivityMapEditorV1;
  if (typeof mount === 'function') {
    return mount({ host, request: input.request, componentsTs: input.componentsTs });
  }

  // Older cached workbench bundles continue through the complete historical editor.
  await import('./activity-map-editor-legacy-v1.mjs?v=1&ts-admin-map-sync-devtools-ts-owner-v1&ts-map-pdf-artwork-owner-v1&ts-map-scene-state-catalogs-direct-v1&ts-map-pure-admin-map-fallbacks-v1');
  host.dataset.activityMapEditorOwnerV1 = 'legacy-fallback';
  return true;
}
