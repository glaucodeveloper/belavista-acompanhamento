import {
  AI_AGENDA_COMPREHENSION_DEFAULTS_V1,
  normalizeAiAgendaComprehensionV1,
} from "./ai-agenda-comprehension-v1.mjs?v=1";
import { createServiceEventAdministrators } from "../events/service-event-admin.mjs?v=service-event-admin-v4";

/** Expose the guidance used by both assistant routes in Settings. */
export const installAiAgendaSettingsV1 = (ViewLayer, { appStore, esc, notify }) => {
  const previousSettings = ViewLayer.prototype.settings;
  ViewLayer.prototype.settings = function (...args) {
    const config = normalizeAiAgendaComprehensionV1(appStore.get().aiAgendaComprehensionV1);
    const panel = `<section class="ai-agenda-settings" aria-labelledby="ai-agenda-settings-title">
      <header class="ai-agenda-settings-header">
        <div><span class="activity-kind">CONFIGURAÇÕES · INTELIGÊNCIA OPERACIONAL</span><h2 id="ai-agenda-settings-title">Compreensão da IA para a agenda</h2><p>Oriente como os assistentes interpretam entradas, decidem a etapa e preparam compromissos.</p></div>
        <span class="ai-agenda-settings-scope">Aplica-se ao chat e à leitura visual</span>
      </header>
      <form data-ai-agenda-settings-form>
        <div class="ai-agenda-settings-steps">
          <label class="ai-agenda-step-card"><span class="ai-agenda-step-heading"><em>01</em><strong>Leitura</strong></span><small>Informações a extrair de texto, imagem e OCR.</small><textarea name="reading" rows="5" maxlength="1200" required>${esc(config.reading)}</textarea></label>
          <label class="ai-agenda-step-card"><span class="ai-agenda-step-heading"><em>02</em><strong>Determinação</strong></span><small>Critérios para reconhecer etapa, atividade e lacunas.</small><textarea name="determination" rows="5" maxlength="1200" required>${esc(config.determination)}</textarea></label>
          <label class="ai-agenda-step-card"><span class="ai-agenda-step-heading"><em>03</em><strong>Geração da agenda</strong></span><small>Dados e pendências de cada compromisso sugerido.</small><textarea name="generation" rows="5" maxlength="1200" required>${esc(config.generation)}</textarea></label>
        </div>
        <div class="ai-agenda-settings-policy"><label class="ai-agenda-settings-check"><input type="checkbox" name="autoCreatePending" ${config.autoCreatePending ? "checked" : ""}><span><strong>Criação de apontamentos pela IA</strong><small>Permitir compromissos Pendentes; a equipe revisa antes da execução.</small></span></label><span class="ai-agenda-settings-local">Salvo neste navegador</span></div>
        <footer><button type="button" data-ai-agenda-reset>Restaurar orientações</button><button type="button" class="toolbar-primary" data-ai-agenda-save>Salvar compreensão</button></footer>
      </form>
    </section>`
    return `${panel}${previousSettings?.apply(this, args) || ""}`;
  };

  const previousBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = previousBind?.apply(this, args);
    this._aiAgendaSettingsEventsV1?.dispose();
    if ((this.dataset.view || appStore.get().view) !== "settings") return result;
    this._aiAgendaSettingsEventsV1 = createServiceEventAdministrators({
      root: this,
      services: [{ service: "ai-agenda-settings", capture: true, routes: [
        { eventType: "click", selector: "[data-ai-agenda-save]", action: "save", handler: ({ event, target }) => {
          event.preventDefault(); event.stopPropagation();
          const form = target.closest("form");
          if (!form?.reportValidity()) return;
          appStore.set({
            aiAgendaComprehensionV1: normalizeAiAgendaComprehensionV1({
              reading: form.elements.reading.value,
              determination: form.elements.determination.value,
              generation: form.elements.generation.value,
              autoCreatePending: form.elements.autoCreatePending.checked,
            }),
            lastAction: "Salvou a compreensão da IA para a agenda",
          });
          notify("Compreensão da IA para a agenda salva neste navegador.", "success");
        } },
        { eventType: "click", selector: "[data-ai-agenda-reset]", action: "reset", handler: ({ event, target }) => {
          event.preventDefault(); event.stopPropagation();
          const form = target.closest("form");
          for (const key of ["reading", "determination", "generation"])
            form.elements[key].value = AI_AGENDA_COMPREHENSION_DEFAULTS_V1[key];
          form.elements.autoCreatePending.checked = true;
        } },
      ] }],
    });
    return result;
  };
};
