export function installControlRecordDrawerV2(
  ViewLayer,
  {
    appStore,
    ico,
    documentRef = globalThis.document,
    DateCtor = globalThis.Date,
  },
) {
  // CONTROL_CENTER_RECORD_DRAWER_V2
  // O registro geral deixa de disputar a pilha vertical da Central e passa a
  // compor uma coluna lateral retrátil ao lado do quadro de prioridades da IA.
  const ensureControlRecordDrawerStyleV2 = () => {
    if (document.getElementById("control-record-drawer-style-v2")) return;
    const style = document.createElement("style");
    style.id = "control-record-drawer-style-v2";
    style.textContent = `
      .control-center-workspace-v2 {
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(390px,32vw);
        gap:12px;
        align-items:start;
        margin:14px 0 16px;
        transition:grid-template-columns 180ms ease;
      }
      .control-center-workspace-v2.drawer-collapsed-v2 {
        grid-template-columns:minmax(0,1fr) 52px;
      }
      .control-center-workspace-main-v2 {
        min-width:0;
      }
      .control-center-workspace-main-v2 > .control-ai-priorities {
        display:block !important;
        margin:0 !important;
        width:100%;
        min-width:0;
      }
      .control-record-drawer-v2 {
        position:sticky;
        top:10px;
        min-width:0;
        max-height:calc(100dvh - 120px);
        border:1px solid #34475f;
        background:#111a27;
        overflow:hidden;
        box-sizing:border-box;
        transition:width 180ms ease,background 180ms ease,border-color 180ms ease;
      }
      .control-record-drawer-head-v2 {
        min-height:52px;
        display:flex;
        align-items:center;
        gap:10px;
        padding:8px 10px;
        border-bottom:1px solid #31445c;
        background:#0d1724;
        box-sizing:border-box;
      }
      .control-record-drawer-toggle-v2 {
        flex:0 0 32px;
        width:32px;
        height:32px;
        display:grid;
        place-items:center;
        border:1px solid #45617f;
        background:#132337;
        color:#dbe9fb;
        cursor:pointer;
      }
      .control-record-drawer-copy-v2 {min-width:0}
      .control-record-drawer-copy-v2 b {display:block;font-size:12px;color:#f0f6ff}
      .control-record-drawer-copy-v2 small {display:block;margin-top:2px;font-size:9px;color:#86a0bd}
      .control-record-drawer-body-v2 {
        max-height:calc(100dvh - 184px);
        overflow:auto;
        overscroll-behavior:contain;
        scrollbar-gutter:stable;
      }
      .control-record-drawer-v2 .control-general-event {
        display:block !important;
        margin:0 !important;
        border:0 !important;
        min-width:0;
        background:transparent !important;
      }
      .control-record-drawer-v2 .control-general-event > header {display:none !important}
      .control-record-drawer-v2 .control-record-accordion-v1 {
        display:block;
        border:0 !important;
        margin:0 !important;
        background:transparent !important;
      }
      .control-record-drawer-v2 .control-record-accordion-v1 > summary {display:none !important}
      .control-record-drawer-v2 [data-control-general-event] {padding:12px}
      .control-record-drawer-v2 .record-composer-v1 {
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:12px !important;
      }
      .control-record-drawer-v2 .record-composer-fields-v1,
      .control-record-drawer-v2 .control-general-event-grid {
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:9px !important;
        min-width:0;
      }
      .control-record-drawer-v2 .control-general-event-grid .wide {grid-column:1 !important}
      .control-record-drawer-v2 .record-dropin-v1 {min-height:190px}
      .control-record-drawer-v2 [data-control-general-event] footer {
        display:grid !important;
        grid-template-columns:1fr !important;
        gap:10px !important;
        align-items:stretch !important;
      }
      .control-record-drawer-v2 [data-control-general-event] footer button {width:100%}
      .control-record-drawer-v2 .control-general-event-history {padding:0 12px 14px}
      .control-center-workspace-v2.drawer-collapsed-v2 .control-record-drawer-copy-v2,
      .control-center-workspace-v2.drawer-collapsed-v2 .control-record-drawer-body-v2 {display:none !important}
      .control-center-workspace-v2.drawer-collapsed-v2 .control-record-drawer-head-v2 {
        justify-content:center;
        padding:9px;
        border-bottom:0;
      }
      @media (max-width:1180px) {
        .control-center-workspace-v2 {grid-template-columns:minmax(0,1fr) minmax(340px,42vw)}
      }
      @media (max-width:900px) {
        .control-center-workspace-v2,
        .control-center-workspace-v2.drawer-collapsed-v2 {display:block}
        .control-record-drawer-v2 {position:relative;top:auto;margin-top:10px;max-height:none}
        .control-record-drawer-body-v2 {max-height:none}
        .control-center-workspace-v2.drawer-collapsed-v2 .control-record-drawer-v2 {height:52px}
      }
    `;
    document.head.appendChild(style);
  };
  
  const mountControlRecordDrawerV2 = (layer) => {
    const root = layer?.querySelector?.(".control-center-page");
    if (!root) return;
  
    root.querySelectorAll(".cash-record-launcher").forEach((node) => node.remove());
    root.querySelectorAll(".control-event-tabs").forEach((node) => node.remove());
  
    const head = root.querySelector(":scope > .control-center-head"),
      kpis = root.querySelector(":scope > .control-center-kpis"),
      priorities = root.querySelector(".control-ai-priorities"),
      eventPanel = root.querySelector(".control-general-event");
    if (!head || !priorities || !eventPanel) return;
  
    ensureControlRecordDrawerStyleV2();
  
    let workspace = root.querySelector(":scope > .control-center-workspace-v2");
    if (!workspace) {
      workspace = document.createElement("section");
      workspace.className = "control-center-workspace-v2";
      workspace.innerHTML = `<div class="control-center-workspace-main-v2" data-control-workspace-main-v2></div><aside class="control-record-drawer-v2" data-control-record-drawer-v2><header class="control-record-drawer-head-v2"><button type="button" class="control-record-drawer-toggle-v2" data-control-record-drawer-toggle-v2 aria-label="Recolher novo registro" aria-expanded="true">${ico("panel-right-close")}</button><div class="control-record-drawer-copy-v2"><b>Novo registro</b><small>Evento geral · Central operacional</small></div></header><div class="control-record-drawer-body-v2" data-control-record-drawer-body-v2></div></aside>`;
      (kpis || head).insertAdjacentElement("afterend", workspace);
    }
  
    workspace.querySelector("[data-control-workspace-main-v2]")?.append(priorities);
    workspace.querySelector("[data-control-record-drawer-body-v2]")?.append(eventPanel);
  
    const details = eventPanel.querySelector(":scope > details.control-record-accordion-v1");
    if (details) {
      details.open = true;
      details.querySelector(":scope > summary")?.setAttribute("hidden", "");
    }
  
    if (layer._controlRecordDrawerOpenV2 == null)
      layer._controlRecordDrawerOpenV2 = true;
  
    const toggle = workspace.querySelector("[data-control-record-drawer-toggle-v2]");
    const sync = () => {
      const open = layer._controlRecordDrawerOpenV2 !== false;
      workspace.classList.toggle("drawer-collapsed-v2", !open);
      toggle?.setAttribute("aria-expanded", String(open));
      toggle?.setAttribute("aria-label", open ? "Recolher novo registro" : "Expandir novo registro");
      if (toggle) toggle.innerHTML = ico(open ? "panel-right-close" : "panel-right-open");
      window.lucide?.createIcons();
    };
  
    if (toggle && toggle.dataset.bound !== "true") {
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", () => {
        layer._controlRecordDrawerOpenV2 = !(layer._controlRecordDrawerOpenV2 !== false);
        sync();
      });
    }
    sync();
  };

  const mountControlRecordAccordionsV1 = (layer) => {
    const openState = layer._controlRecordAccordionOpenV1 ||= {};
    const wrap = (host, key, title, description) => {
      if (!host || host.querySelector(":scope > details.control-record-accordion-v1")) return;
      const header = host.querySelector(":scope > header");
      const details = documentRef.createElement("details");
      details.className = "control-record-accordion-v1";
      details.dataset.controlRecordAccordion = key;
      const summary = documentRef.createElement("summary");
      summary.innerHTML = `<span><b>${title}</b><small>${description}</small></span><span class="control-record-accordion-cue-v1" aria-hidden="true">⌄</span>`;
      details.append(summary);
      [...host.children].filter((child) => child !== header).forEach((child) => details.append(child));
      host.append(details);
      details.open = openState[key] ?? (key === "general" && Boolean(appStore.get().controlEventDraft?.title));
      details.addEventListener("toggle", () => { openState[key] = details.open; });
    };
    wrap(layer.querySelector(".control-general-event"), "general", "Novo registro de evento", "Evento geral · sem vínculo obrigatório a uma etapa");
    const stageRecord = layer.querySelector("[data-control-stage-inline-record]");
    if (stageRecord && !stageRecord.querySelector("[data-inline-record-date]")) {
      const now = new DateCtor();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      stageRecord.querySelector(":scope > header")?.insertAdjacentHTML("afterend", `<div class="control-inline-record-when-v1"><label>Data<input data-inline-record-date type="date" value="${date}"></label><label>Hora<input data-inline-record-time type="time" value="${time}"></label></div>`);
    }
    wrap(stageRecord, "stage", "Novo registro da etapa", "Propriedades, requisitos e execução · apontamento vinculado à frente");
  };
  
  const renderBeforeControlRecordDrawerV2 = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderBeforeControlRecordDrawerV2.apply(this, args);
    if (appStore.get().view === "control") {
      mountControlRecordAccordionsV1(this);
      mountControlRecordDrawerV2(this);
    }
    return result;
  };
}

