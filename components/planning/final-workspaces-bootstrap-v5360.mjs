// TS-first registration adapter for the final stage calendar workspace.
const program = await import('../../dist/frontend/program.js').catch(() => null);
const useTypeScript = typeof program?.installAtlasFinalWorkspacesV5360 === 'function';
const legacy = useTypeScript ? null : await import('./final-workspaces-bootstrap-legacy-v5360.mjs?v=final-workspaces-recovery-v1').catch(() => null);

export const installBelavistaFinalWorkspacesBootstrapV5360 = (input = {}) => {
  const globalRef = input.globalRef || globalThis;
  if (useTypeScript) {
    try {
      const controller = program.installAtlasFinalWorkspacesV5360({
        ViewLayer: input.ViewLayer,
        appStore: input.appStore,
        demoData: input.demoData,
        esc: input.esc,
        document: input.document || globalRef.document,
        window: input.windowRef || globalRef.window,
        globalRef,
        DateCtor: input.DateCtor || globalRef.Date,
      });
      globalRef.__atlasFinalWorkspacesControllerV5360 = controller;
      globalRef.__atlasFinalWorkspacesOwnerV5360 = 'typescript';
      return globalRef.installBelavistaFinalWorkspacesV5360;
    } catch (error) {
      globalRef.console?.warn?.('[final-workspaces] owner TypeScript indisponível.', error);
      void import('./final-workspaces-bootstrap-legacy-v5360.mjs?v=final-workspaces-recovery-v1')
        .then(module => {
          if (typeof globalRef.installBelavistaFinalWorkspacesV5360 === 'function') return;
          module.installBelavistaFinalWorkspacesBootstrapV5360({ ...input, globalRef });
          globalRef.__atlasFinalWorkspacesOwnerV5360 = 'legacy-recovery';
        })
        .catch(recoveryError => globalRef.console?.error?.('[final-workspaces] fallback indisponível.', recoveryError));
    }
  }
  if (legacy?.installBelavistaFinalWorkspacesBootstrapV5360) {
    globalRef.__atlasFinalWorkspacesOwnerV5360 = 'legacy-recovery';
    return legacy.installBelavistaFinalWorkspacesBootstrapV5360({ ...input, globalRef });
  }
  return undefined;
};
