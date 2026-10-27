// TS-first registration adapter for the Etapas landing and detail page.
const program = await import('../../dist/frontend/program.js').catch(() => null);
const useTypeScript = typeof program?.installAtlasStagesLandingV5361 === 'function';
const legacy = useTypeScript ? null : await import('./stages-landing-page-legacy-v5361.mjs?v=stages-landing-recovery-v1').catch(() => null);

export const registerBelavistaStagesLandingV5361 = (input = {}) => {
  const globalRef = input.globalRef || globalThis;
  if (useTypeScript) {
    try {
      const controller = program.installAtlasStagesLandingV5361({
        ViewLayer: input.ViewLayer,
        appStore: input.appStore,
        demoData: input.demoData,
        esc: input.esc,
        ico: input.ico,
        notify: input.notify,
        document: input.document || globalRef.document,
        window: input.windowRef || globalRef.window,
        globalRef,
        consoleRef: input.consoleRef || globalRef.console,
        DateCtor: input.DateCtor || globalRef.Date,
      });
      globalRef.__atlasStagesLandingControllerV5361 = controller;
      globalRef.__atlasStagesLandingOwnerV5361 = 'typescript';
      return globalRef.installBelavistaStagesLandingV5361;
    } catch (error) {
      globalRef.console?.warn?.('[stages-landing] owner TypeScript indisponível.', error);
      void import('./stages-landing-page-legacy-v5361.mjs?v=stages-landing-recovery-v1')
        .then(module => {
          if (typeof globalRef.installBelavistaStagesLandingV5361 === 'function') return;
          module.registerBelavistaStagesLandingV5361({ ...input, globalRef });
          globalRef.__atlasStagesLandingOwnerV5361 = 'legacy-recovery';
        })
        .catch(recoveryError => globalRef.console?.error?.('[stages-landing] fallback indisponível.', recoveryError));
    }
  }
  if (legacy?.registerBelavistaStagesLandingV5361) {
    globalRef.__atlasStagesLandingOwnerV5361 = 'legacy-recovery';
    return legacy.registerBelavistaStagesLandingV5361({ ...input, globalRef });
  }
  return undefined;
};
