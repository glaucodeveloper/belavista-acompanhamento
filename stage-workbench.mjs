const root = document.querySelector('[data-worker-app]');
if (!root) throw new Error('A página do worker não encontrou sua superfície de montagem.');

const showFailure = message => {
  root.className = 'worker-app workbench-app mode-error';
  const main = document.createElement('main');
  main.className = 'workbench-main';
  const heading = document.createElement('h1');
  heading.textContent = 'Não foi possível abrir o acompanhamento';
  const detail = document.createElement('p');
  detail.textContent = String(message || 'Falha ao iniciar a rota.');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'button button-primary';
  retry.textContent = 'Tentar novamente';
  retry.addEventListener('click', () => location.reload());
  main.append(heading, detail, retry);
  root.replaceChildren(main);
};

const loadRecovery = async () => {
  await import('./stage-workbench-legacy-v1.mjs?v=worker-workbench-route-recovery-v1');
};

try {
  const cacheOwner = 'worker-workbench-route-program-owner-v1';
  const [componentsTs, programTs] = await Promise.all([
    import(`./dist/frontend/components.js?${cacheOwner}`),
    import(`./dist/frontend/program.js?${cacheOwner}`),
  ]);
  if (typeof programTs.mountAtlasWorkerWorkbenchRouteV1 !== 'function') {
    await loadRecovery();
  } else {
    const mounted = await programTs.mountAtlasWorkerWorkbenchRouteV1({
      root,
      pathname: location.pathname,
      hostname: location.hostname,
      search: location.search,
      fetcher: (path, init) => fetch(path, init),
      waitForAuth: () => globalThis.BELAVISTA_ADMIN_AUTH_READY || Promise.resolve(),
      currentActor: () => globalThis.BELAVISTA_ADMIN_ACTOR || {},
      currentIdToken: () => globalThis.BELAVISTA_GET_ID_TOKEN?.(),
      componentsTs,
      documentRef: document,
    });
    if (!mounted) await loadRecovery();
  }
} catch (error) {
  try {
    await loadRecovery();
  } catch (recoveryError) {
    showFailure(recoveryError instanceof Error ? recoveryError.message : error instanceof Error ? error.message : error);
  }
}
