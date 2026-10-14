import { installStagesLandingEventsV5361 } from "./stages-landing-events-v5361.mjs";

export const registerBelavistaStagesLandingV5361 = ({
  globalRef = globalThis,
  ViewLayer,
  appStore,
  demoData,
  esc,
  ico,
  notify,
  windowRef = globalThis.window,
  consoleRef = globalThis.console,
  DateCtor = globalThis.Date,
}) => {
  globalRef.__BELAVISTA_STAGE_DETAIL_BASE_V5361 =
    globalRef.__BELAVISTA_STAGE_DETAIL_BASE_V5361 || ViewLayer.prototype.stages;

  globalRef.installBelavistaStagesLandingV5361 = () => {
    if (ViewLayer.prototype.__belavistaStagesLandingV5361Installed) return;
    ViewLayer.prototype.__belavistaStagesLandingV5361Installed = true;

    const detailTemplate =
      globalRef.__BELAVISTA_STAGE_DETAIL_BASE_V5361 ||
      ViewLayer.prototype.stages;

    const baseBind = ViewLayer.prototype.bind;
    const stageKey = (item) =>
      String(item?.id || item?.key || item?.name || "stage");
    const stages = () =>
      Array.isArray(demoData.activities) ? demoData.activities : [];

    const landing = () => {
      return `<section class="stages-landing-v5361">
      <header class="stages-landing-head-v5361">
        <div>
          <span>ETAPAS E CRONOGRAMA</span>
          <h1>Agenda e cronograma</h1>
          <p>Selecione uma etapa na linha do tempo acima para abrir sua página operacional.</p>
        </div>
        <button type="button" data-v5361-open-agenda-page>${ico("calendar-days")} Agenda completa</button>
      </header>
    </section>`;
    };

    ViewLayer.prototype.stages = function () {
      const state = appStore.get();
      if (state.stagesPageV5361 !== "detail") return landing();

      let html = "";
      try {
        html = detailTemplate.call(this);
      } catch (error) {
        consoleRef?.error?.("[Aliança Park v5.3.61] stage detail render", error);
        html = `<section class="stage-detail-error-v5361"><h2>Página da etapa indisponível</h2><p>${esc(error.message || String(error))}</p></section>`;
      }

      const selected = stages().find(
        (item) => stageKey(item) === String(appStore.get().stageSelected || ""),
      );
      return `<section class="stage-detail-shell-v5361">
      <header class="stage-detail-nav-v5361">
        <button type="button" data-v5361-stage-back>${ico("arrow-left")} Agenda e cronograma</button>
        <div><span>PÁGINA DA ETAPA</span><b>${esc(selected?.name || "Etapa em foco")}</b></div>
      </header>
      <div class="stage-detail-current-v5361">${html}</div>
    </section>`;
    };

    installStagesLandingEventsV5361(ViewLayer, {
      appStore,
      notify,
      window: windowRef,
    });

    globalRef.__BELAVISTA_STAGES_LANDING_V5361 = {
      version: "5.3.61",
      installedAt: new DateCtor().toISOString(),
      detailRendererCaptured: Boolean(detailTemplate),
    };

    if (appStore.get().view === "stages") {
      appStore.set({
        stagesPageV5361: appStore.get().stagesPageV5361 || "landing",
        lastAction: "Etapas v5.3.61 carregada",
      });
    }
  };
};
