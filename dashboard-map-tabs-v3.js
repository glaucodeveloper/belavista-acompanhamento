// TS-first adapter for the administrative map's visualization/progress tabs.
if (!globalThis.__belavistaDashboardMapTabsControllerV1) {
  const program = await import('./dist/frontend/program.js').catch(() => null);
  let installed = false;
  try {
    if (typeof program?.installAtlasDashboardMapTabsV1 === 'function') {
      globalThis.__belavistaDashboardMapTabsControllerV1 = program.installAtlasDashboardMapTabsV1({ document, window });
      document.documentElement.dataset.dashboardMapTabsOwnerV1 = 'typescript';
      installed = true;
    }
  } catch (error) {
    console.warn('[dashboard-map-tabs] owner TypeScript indisponível; mantendo recuperação MJS.', error);
  }
  if (!installed) {
    await import('./dashboard-map-tabs-legacy-v3.js?v=dashboard-map-tabs-recovery-v1');
    document.documentElement.dataset.dashboardMapTabsOwnerV1 = 'legacy-recovery';
  }
}
