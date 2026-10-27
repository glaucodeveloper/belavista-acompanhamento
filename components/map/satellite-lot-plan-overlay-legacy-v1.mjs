/** Installs the complete PDF/satellite lot overlay behavior on MapScene. */
export const installSatelliteLotPlanOverlayV1 = (MapScene, dependencies = {}) => {
  const {
    ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2,
    ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
    ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1,
    CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1,
    DWG_GEOREFERENCE_URL,
    INVALID_MASTERPLAN_LOT_IDS_V1,
    MASTERPLAN_COMMON_AREA_LABEL_V1,
    MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1,
    MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1,
    PDF_LOT_GREEN_MAPPING_URL_V1,
    PDF_LOT_LABELS_URL_V1,
    PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1,
    REPASSE_PRICE_CATALOG,
    appStore,
    createSatelliteLotProjectionV1,
    esc,
    ico,
    polygonCentroidV1,
    prepareAssistantLotStatusPromptV1,
    prepareAssistantMapAreaPromptV1,
    projectCanonicalLotTraceToMasterplanOverlayUvV1,
  } = dependencies;

  MapScene.prototype.installSatelliteLotPlanOverlayV1 = async function({ markers = true, outlines = true } = {}) {
    // Na página de leads a planta administrativa deve acompanhar o mesmo
    // elemento que recebe o zoom do scroll, junto com a imagem satélite.
    const surface = this.closest(".public-map-sticky") || this;
    if (!surface?.isConnected) return false;
    const isPublicLeadsMap = document.body.classList.contains("public-leads-page");

    // O traçado pode ser requisitado antes do primeiro frame da cena. Garante
    // que a camada visual oficial exista antes de decidir entre coordenadas
    // legadas e as etiquetas extraídas do PDF.
    if (!this.querySelector("[data-admin-masterplan-overlay]") && this.isAdminStandalone3DV5370?.()) {
      this.installAdminMasterplanOverlayV1?.();
    }

    // applyDwgSatelliteFrame pode ser solicitado por mais de uma extensão do
    // mapa durante a abertura. Reserva a camada antes do fetch para que as
    // respostas concorrentes não desenhem a planta três vezes.
    if (this._satelliteLotPlanInstallingV1) {
      this._satelliteLotPlanRequestedMarkersV1 ||= Boolean(markers);
      return Boolean(this._satelliteLotPlanOverlayV1);
    }
    this._satelliteLotPlanInstallingV1 = true;
    this._satelliteLotPlanRequestedMarkersV1 = Boolean(markers);

    let layer = surface.querySelector("[data-satellite-lot-plan-overlay]");
    if (
      layer &&
      this.isAdminStandalone3DV5370?.() &&
      !layer.dataset.pdfLotEnumerationV1
    ) {
      // Uma extensão pode ter instalado a camada antes do módulo principal.
      // Recria uma única vez para substituir a numeração derivada do GLB.
      layer.remove();
      layer = null;
      this._satelliteLotPlanOverlayV1 = null;
    }
    if (layer) {
      const wantsMarkers = Boolean(
        markers || this._satelliteLotPlanRequestedMarkersV1,
      );
      // Uma inicialização anterior pode ter desenhado somente as linhas. Ao
      // abrir um mapa retrátil, recriamos essa camada para materializar os
      // hit-areas que acionam o controle comercial do lote.
      if (wantsMarkers && !layer.querySelector(".satellite-lot-plan-marker, .satellite-lot-hit-area")) {
        layer.remove();
        layer = null;
        this._satelliteLotPlanOverlayV1 = null;
      } else {
        if (wantsMarkers) layer.dataset.markers = "true";
        if (!outlines) {
          layer.dataset.outlines = "false";
          layer.querySelector(".satellite-lot-plan-polygons")?.setAttribute(
            "hidden",
            "",
          );
        }
        this._satelliteLotPlanInstallingV1 = false;
        this._satelliteLotPlanRequestedMarkersV1 = false;
        return true;
      }
    }

    try {
      let trace, geo, masterplanPolygonAsset, pdfLotLabelsAsset, pdfLotGreenMappingAsset;
      if (typeof globalThis.belavistaLoadPublicMapGeometryAssets === "function") {
        const assets = await globalThis.belavistaLoadPublicMapGeometryAssets({
          trace: ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1,
          georeference: DWG_GEOREFERENCE_URL,
          masterplanPolygons: ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2,
          lotLabels: PDF_LOT_LABELS_URL_V1,
          greenMapping: PDF_LOT_GREEN_MAPPING_URL_V1,
        });
        ({ trace, georeference: geo, masterplanPolygons: masterplanPolygonAsset, lotLabels: pdfLotLabelsAsset, greenMapping: pdfLotGreenMappingAsset } = assets);
      } else {
        // Older shells retain the previous loader until the TS program is present.
        const [traceResponse, geoResponse, masterplanPolygonResponse, pdfLotLabelsResponse, pdfLotGreenMappingResponse] = await Promise.all([
          fetch(ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1, { cache: "no-store" }),
          fetch(DWG_GEOREFERENCE_URL, { cache: "no-store" }),
          fetch(ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2, { cache: "no-store" }),
          fetch(PDF_LOT_LABELS_URL_V1, { cache: "no-store" }),
          fetch(PDF_LOT_GREEN_MAPPING_URL_V1, { cache: "no-store" }),
        ]);
        if (!traceResponse.ok || !geoResponse.ok) throw new Error("Traçado de lotes ou georreferência indisponível");
        [trace, geo, masterplanPolygonAsset, pdfLotLabelsAsset, pdfLotGreenMappingAsset] = await Promise.all([
          traceResponse.json(), geoResponse.json(),
          masterplanPolygonResponse.ok ? masterplanPolygonResponse.json().catch(() => null) : Promise.resolve(null),
          pdfLotLabelsResponse.ok ? pdfLotLabelsResponse.json().catch(() => null) : Promise.resolve(null),
          pdfLotGreenMappingResponse.ok ? pdfLotGreenMappingResponse.json().catch(() => null) : Promise.resolve(null),
        ]);
      }
      const lots = trace?.lots;
      if (!lots || typeof lots !== "object")
        throw new Error("Prancha PDF sem polígonos de lote");

      layer = document.createElement("div");
      layer.className = "satellite-lot-plan-overlay";
      layer.dataset.satelliteLotPlanOverlay = "pdf-trace-v1";
      layer.dataset.markers = markers ? "true" : "false";
      layer.setAttribute("aria-label", "Planta de loteamento sobre satélite");

      const fit = document.createElement("div");
      fit.className = "satellite-lot-plan-fit";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 1000 1000");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      svg.style.pointerEvents = "auto";
      const commonAreaGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      commonAreaGroup.setAttribute("class", "satellite-common-area-polygons");
      commonAreaGroup.style.pointerEvents = "auto";
      const visualRecoveryGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      visualRecoveryGroup.setAttribute("class", "satellite-lot-visual-recovery-outlines");
      visualRecoveryGroup.style.pointerEvents = "none";
      const polygonGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      polygonGroup.setAttribute("class", "satellite-lot-plan-polygons");
      polygonGroup.style.pointerEvents = "auto";
      if (!outlines) polygonGroup.setAttribute("hidden", "");
      svg.append(commonAreaGroup, visualRecoveryGroup, polygonGroup);
      fit.append(svg);
      fit.style.pointerEvents = "auto";

      const markerLayer = document.createElement(customElements.get("atlas-map-lot-marker-layer") ? "atlas-map-lot-marker-layer" : "div");
      markerLayer.className = "satellite-lot-plan-markers";
      fit.append(markerLayer);
      const setSelectedLotMarker = (lotId) => {
        if (typeof markerLayer.setSelectedLot === "function") markerLayer.setSelectedLot(lotId || null);
        else {
          markerLayer.querySelectorAll(".satellite-lot-plan-marker.is-selected").forEach(node => node.classList.remove("is-selected"));
          if (lotId) [...markerLayer.querySelectorAll("[data-lot]")].find(node => node.dataset.lot === lotId)?.classList.add("is-selected");
        }
      };
      const syncLotMarkerStatuses = () => {
        const statuses = appStore.get().lotStatuses || {};
        if (typeof markerLayer.syncMarkerStatuses === "function") {
          markerLayer.syncMarkerStatuses(statuses);
          return;
        }
        const markers = [...markerLayer.querySelectorAll(".satellite-lot-plan-marker")];
        const projectedStatuses = globalThis.belavistaPublicLotMarkerStatuses?.(
          markers.map(marker => ({ lotId: marker.dataset.lot || "", lotNumber: marker.dataset.lotNumber || "" })),
          statuses,
        );
        if (projectedStatuses) {
          if (typeof markerLayer.setMarkerStatuses === "function") markerLayer.setMarkerStatuses(projectedStatuses);
          else {
            const byLot = new Map(projectedStatuses.map(row => [row.lotId, row.status]));
            markers.forEach(marker => {
              const status = byLot.get(marker.dataset.lot || "");
              if (!status) return;
              if (typeof marker.setMarkerStatus === "function") marker.setMarkerStatus(status);
              else {
                marker.dataset.lotStatus = status.status;
                marker.dataset.lotStatusTone = status.tone;
                marker.setAttribute("aria-label", status.ariaLabel);
                marker.title = status.ariaLabel;
              }
            });
          }
          return;
        }
        markers.forEach((marker) => {
          const markerStatus = globalThis.belavistaPublicLotMarkerStatus?.({
            lotNumber: marker.dataset.lotNumber || "",
            lotStatuses: statuses,
          });
          const status = markerStatus || (() => {
            const number = Number(marker.dataset.lotNumber);
            const matches = REPASSE_PRICE_CATALOG.filter((item) => Number(item.lot) === number);
            const match = matches.length === 1 ? matches[0] : null;
            const value = match ? String(statuses[match.label]?.status || "").trim() : "";
            const normalized = value.toLocaleLowerCase("pt-BR");
            const tone = normalized.includes("disponível") ? "available"
              : normalized.includes("reserv") || normalized.includes("análise") || normalized.includes("negocia") ? "reserved"
                : normalized.includes("vendid") || normalized.includes("quitad") ? "sold"
                  : normalized.includes("repasse") ? "transfer"
                    : normalized.includes("bloque") || normalized.includes("indispon") ? "blocked" : "unknown";
            return { status: value || "Não informado", tone, ariaLabel: `Lote ${marker.dataset.lotNumber} · status ${value || "não informado"}` };
          })();
          marker.dataset.lotStatus = status.status;
          marker.dataset.lotStatusTone = status.tone;
          marker.setAttribute("aria-label", status.ariaLabel);
          marker.title = status.ariaLabel;
        });
      };
      const lotWidget = document.createElement("atlas-map-lot-context");
      lotWidget.className = "satellite-lot-context-widget";
      lotWidget.hidden = true;
      lotWidget.setAttribute("aria-live", "polite");
      lotWidget.setAttribute("role", "region");
      const commonAreaWidget = document.createElement("atlas-map-common-area-context");
      commonAreaWidget.className = "satellite-lot-context-widget satellite-common-area-context-widget";
      commonAreaWidget.hidden = true;
      commonAreaWidget.setAttribute("aria-live", "polite");
      commonAreaWidget.addEventListener("atlas:map-common-area-widget-action", (event) => {
        if (event.detail?.action === "assistant") {
          prepareAssistantMapAreaPromptV1(event.detail.label || MASTERPLAN_COMMON_AREA_LABEL_V1);
        }
      });
      // Keep text cards out of the transformed raster/marker layer. Scaling a
      // DOM subtree up with the map and then counter-scaling it rasterizes its
      // text and makes the lot details visibly soft at high zoom.
      surface.append(lotWidget, commonAreaWidget);
      let lotWidgetHideTimer = 0;
      let pdfAreaByLotId = new Map();
      let lotWidgetUpgradeScheduled = false;
      const lotNumberFor = (lotId) => String(lotId).match(/\d+/g)?.at(-1)?.padStart(3, "0") || "";
      const createLotMarker = ({ lotId, lotNumber, label, title, source, selectionSource }) => {
        const marker = document.createElement(customElements.get("atlas-map-lot-marker") ? "atlas-map-lot-marker" : "button");
        if (typeof marker.setMarkerContext === "function") {
          marker.setMarkerContext({ lotId, lotNumber, label, title, source, selectionSource });
        } else {
          marker.type = "button";
          marker.className = "satellite-lot-plan-marker";
          marker.dataset.lot = lotId;
          marker.dataset.lotNumber = lotNumber;
          marker.dataset.lotSource = source;
          marker.dataset.mapSelectionSource = selectionSource || source;
          marker.textContent = lotNumber;
          marker.setAttribute("aria-label", label);
          marker.title = title || label;
        }
        return marker;
      };
      const appendLotMarker = (input) => {
        if (typeof markerLayer.createMarker === "function") return markerLayer.createMarker(input);
        const marker = createLotMarker(input);
        if (input.relativePosition) {
          marker.dataset.masterplanRelativeU = String(input.relativePosition.u);
          marker.dataset.masterplanRelativeV = String(input.relativePosition.v);
        }
        if (input.position.manualPosition) {
          marker.dataset.mapAdjustU = String(input.position.manualPosition.u);
          marker.dataset.mapAdjustV = String(input.position.manualPosition.v);
        }
        if (typeof marker.setMapPosition === "function") marker.setMapPosition(input.position);
        else {
          marker.style.zIndex = String(input.position.zIndex);
          marker.style.left = `${(input.position.u * 100).toFixed(4)}%`;
          marker.style.top = `${(input.position.v * 100).toFixed(4)}%`;
        }
        markerLayer.append(marker);
        return marker;
      };
      const bindLotMarkerInteractions = (marker, lotId, label) => {
        if (typeof markerLayer.bindMarkerFallbackInteractions === "function") {
          markerLayer.bindMarkerFallbackInteractions(marker, { lotId, label });
          return;
        }
        if (globalThis.__BELAVISTA_PUBLIC_MAP_MARKER_ACTIONS_INSTALLED) return;
        marker.addEventListener("pointerenter", () => showLotWidget(lotId, marker));
        marker.addEventListener("pointerleave", () => scheduleLotWidgetHide(lotId));
        marker.addEventListener("focus", () => showLotWidget(lotId, marker));
        marker.addEventListener("blur", () => scheduleLotWidgetHide(lotId));
        marker.addEventListener("click", (event) => {
          if (marker.dataset.mapAdjustSuppressClick === "true") {
            delete marker.dataset.mapAdjustSuppressClick;
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          marker.dispatchEvent(new CustomEvent("belavista:map-lot-marker-activate", {
            bubbles: true, composed: true,
            detail: { lotId, label, selectionSource: marker.dataset.mapSelectionSource },
          }));
        });
      };
      const showLotWidget = (lotId, marker, { pinned = false } = {}) => {
        const lotNumber = lotNumberFor(lotId);
        if (!lotNumber) return;
        const currentIsPinned = typeof lotWidget.isPinned === "function"
          ? lotWidget.isPinned(lotId)
          : lotWidget.dataset.lot === lotId && lotWidget.dataset.pinned === "true";
        if (!pinned && !lotWidget.hidden && lotWidget.dataset.lot === lotId && !currentIsPinned) {
          const position = { left: marker?.style.left || lotWidget.style.left, top: marker?.style.top || lotWidget.style.top };
          if (typeof lotWidget.setAnchor === "function") lotWidget.setAnchor(position);
          else { lotWidget.style.left = position.left; lotWidget.style.top = position.top; }
          return;
        }
        lotWidget.cancelScheduledHide?.();
        clearTimeout(lotWidgetHideTimer);
        const lotStatuses = appStore.get().lotStatuses || {};
        // This layer's numbered markers follow the original PDF. Never pair
        // that number with the unrelated DWG row index; it produces false areas.
        const pdfArea = Number(pdfAreaByLotId.get(lotId)) || null;
        const widgetPinned = Boolean(pinned || currentIsPinned);
        const widgetPosition = { left: marker?.style.left || "50%", top: marker?.style.top || "50%" };
        const typedWidget = this.closest("public-leads-surface")?.presentPublicPdfLotWidget?.({
          lotWidget,
          lotId,
          pdfArea,
          lotStatuses,
          position: widgetPosition,
          pinned: widgetPinned,
        });
        if (typedWidget) return;
        const typedContext = globalThis.belavistaProjectPublicMapLotWidgetContext?.({ lotId, pdfArea, lotStatuses, pinned: widgetPinned });
        const legacyMatches = REPASSE_PRICE_CATALOG.filter((item) => Number(item.lot) === Number(lotNumber));
        const legacyMatch = legacyMatches.length === 1 ? legacyMatches[0] : null;
        const legacyStatus = legacyMatch ? lotStatuses[legacyMatch.label]?.status : "";
        const legacyFacts = typedContext ? null : globalThis.belavistaPublicMapLotFacts?.({ lotId, lotNumber, pdfArea, status: legacyStatus || "" });
        const match = typedContext
          ? (typedContext.canOpenFicha ? { label: typedContext.catalogLabel, quadra: typedContext.block } : null)
          : legacyFacts ? (legacyFacts.canOpenFicha ? { label: legacyFacts.catalogLabel, quadra: legacyFacts.block } : null) : legacyMatch;
        const areaM2 = typedContext?.area || legacyFacts?.area || (legacyMatch && Number(legacyMatch.area) > 0
          ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(pdfArea) || Number(legacyMatch.area))} m²`
          : "Confira a metragem impressa na planta");
        const status = typedContext?.status || legacyFacts?.status || String(legacyStatus || "Não informado");
        const price = typedContext?.price || legacyFacts?.price || (match
          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(match.price) || 0)
          : "Sem vínculo comercial inequívoco");
        const context = typedContext || {
          label: legacyFacts?.label || match?.label || `Lote ${lotNumber}`,
          area: areaM2,
          status,
          price,
          block: legacyFacts?.block || match?.quadra || "",
          canOpenFicha: legacyFacts?.canOpenFicha ?? Boolean(match),
          pinned: widgetPinned,
          catalogLabel: legacyFacts?.catalogLabel || match?.label || "",
          accessibleLabel: `Controles de ${match?.label || `Lote ${lotNumber}`}`,
        };
        // The program projection already matches the widget presentation
        // contract; pass it through without reconstructing a second DTO here.
        const widgetContext = context;
        if (typeof lotWidget.presentLotContext === "function") {
          lotWidget.presentLotContext(widgetContext, widgetPosition);
        } else {
          lotWidget.dataset.lot = lotId;
          lotWidget.dataset.pinned = context.pinned ? "true" : "false";
          lotWidget.setAttribute("aria-label", context.accessibleLabel);
          lotWidget.style.left = widgetPosition.left;
          lotWidget.style.top = widgetPosition.top;
          lotWidget.style.setProperty("--map-context-widget-left", widgetPosition.left);
          lotWidget.style.setProperty("--map-context-widget-top", widgetPosition.top);
          lotWidget.hidden = false;
          if (typeof lotWidget.setLotContext === "function") lotWidget.setLotContext(widgetContext);
          else {
            // Compatibility renderer used only until the TS custom element loads.
            lotWidget.innerHTML = `<header><span class="activity-kind">LOTE ${esc(lotNumber)}</span><div class="satellite-lot-widget-controls"><button type="button" data-lot-widget-pin aria-pressed="${context.pinned}">${context.pinned ? "Fixado" : "Fixar"}</button><button type="button" data-lot-widget-close aria-label="Fechar widget do lote">×</button></div></header><strong>${esc(context.label)}</strong><dl><div><dt>Área</dt><dd>${esc(context.area || "Não informada")}</dd></div><div><dt>Status</dt><dd>${esc(context.status)}</dd></div><div><dt>Valor</dt><dd>${esc(context.price)}</dd></div>${context.block ? `<div><dt>Quadra</dt><dd>${esc(context.block)}</dd></div>` : ""}</dl><footer><button type="button" data-lot-widget-assistant>Perguntar à IA</button><button type="button" data-lot-widget-open class="primary">${context.canOpenFicha ? "Abrir ficha" : "Abrir controle"}</button></footer>`;
          }
        }
      };
      const bindLegacyLotWidgetActions = () => {
      lotWidget.addEventListener("atlas:map-lot-widget-action", (event) => {
        const detail = event.detail || {};
        const command = detail.command || globalThis.belavistaPublicMapLotWidgetCommand?.({
          action: detail.action,
          lotId: detail.lotId || lotWidget.dataset.lot,
          label: detail.label,
          pinned: detail.pinned,
        });
        if (command) {
          if (command.action === "pin") {
            lotWidget.dataset.pinned = command.pinned ? "true" : "false";
          } else if (command.action === "close") {
            lotWidget.setPinned?.(false);
            lotWidget.hidden = true;
          } else if (command.action === "assistant") {
            prepareAssistantLotStatusPromptV1(command.assistantLabel);
          } else if (command.action === "open") {
            if (command.canOpenFicha) {
              appStore.set({ view: "lot-detail", selectedLotDetailKey: command.catalogLabel, lastAction: `Abriu a ficha do lote ${command.catalogLabel} pelo mapa` });
            } else {
              this.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", { bubbles: true, composed: true, detail: { lotId: command.lotId, label: command.assistantLabel } }));
            }
          }
          return;
        }
        const lotId = String(detail.lotId || lotWidget.dataset.lot || "");
        const lotNumber = lotNumberFor(lotId);
        const matches = REPASSE_PRICE_CATALOG.filter((item) => Number(item.lot) === Number(lotNumber));
        const match = matches.length === 1 ? matches[0] : null;
        if (detail.action === "pin") {
          lotWidget.dataset.pinned = detail.pinned ? "true" : "false";
        } else if (detail.action === "close") {
          lotWidget.setPinned?.(false);
          lotWidget.hidden = true;
        } else if (detail.action === "assistant") {
          prepareAssistantLotStatusPromptV1(`Lote ${lotNumber}`);
        } else if (detail.action === "open") {
          if (match) {
            appStore.set({ view: "lot-detail", selectedLotDetailKey: match.label, lastAction: `Abriu a ficha do lote ${match.label} pelo mapa` });
          } else {
            this.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", { bubbles: true, composed: true, detail: { lotId, label: `Lote ${lotNumber}` } }));
          }
        }
      });
      lotWidget.addEventListener("click", (event) => {
        if (typeof lotWidget.setLotContext === "function") return;
        const button = event.target.closest?.("button");
        if (!button) return;
        const lotId = lotWidget.dataset.lot || "";
        const lotNumber = lotNumberFor(lotId);
        const catalogMatches = REPASSE_PRICE_CATALOG.filter((item) => Number(item.lot) === Number(lotNumber));
        const match = catalogMatches.length === 1 ? catalogMatches[0] : null;
        if (button.matches("[data-lot-widget-pin]")) {
          event.preventDefault(); event.stopPropagation();
          const pinned = lotWidget.dataset.pinned !== "true";
          lotWidget.dataset.pinned = String(pinned);
          lotWidget.setPinned?.(pinned);
        } else if (button.matches("[data-lot-widget-close]")) {
          event.stopPropagation(); lotWidget.dataset.pinned = "false"; lotWidget.setPinned?.(false); lotWidget.hidden = true;
        } else if (button.matches("[data-lot-widget-assistant]")) {
          event.stopPropagation(); prepareAssistantLotStatusPromptV1(`Lote ${lotNumber}`);
        } else if (button.matches("[data-lot-widget-open]")) {
          event.stopPropagation();
          if (match) {
            appStore.set({ view: "lot-detail", selectedLotDetailKey: match.label, lastAction: `Abriu a ficha do lote ${match.label} pelo mapa` });
          } else {
            this.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", { bubbles: true, composed: true, detail: { lotId, label: `Lote ${lotNumber}` } }));
          }
        }
      });
      };
      if (!lotWidgetUpgradeScheduled && typeof lotWidget.setLotContext !== "function") {
        lotWidgetUpgradeScheduled = true;
        customElements.whenDefined("atlas-map-lot-context").then(() => {
          if (lotWidget.isConnected && !lotWidget.hidden && lotWidget.dataset.lot) {
            showLotWidget(lotWidget.dataset.lot, { style: { left: lotWidget.style.left, top: lotWidget.style.top } }, { pinned: lotWidget.isPinned?.(lotWidget.dataset.lot) ?? lotWidget.dataset.pinned === "true" });
          }
        });
      }
      const showCommonAreaWidget = (position = {}, sourceId = "") => {
        const context = {
          sourceId,
          label: MASTERPLAN_COMMON_AREA_LABEL_V1,
          description: "Use o assistente para consultar uso, manutenção, ocorrências ou planejamento desta área.",
        };
        if (typeof commonAreaWidget.presentAreaContext === "function") {
          commonAreaWidget.presentAreaContext(context, { u: Number(position.u), v: Number(position.v) });
        } else {
          const u = Math.max(0, Math.min(1, Number(position.u) || 0.5));
          const v = Math.max(0, Math.min(1, Number(position.v) || 0.5));
          commonAreaWidget.dataset.sourceId = sourceId;
          commonAreaWidget.style.left = `${(u * 100).toFixed(4)}%`;
          commonAreaWidget.style.top = `${(v * 100).toFixed(4)}%`;
          commonAreaWidget.style.setProperty("--map-context-widget-left", commonAreaWidget.style.left);
          commonAreaWidget.style.setProperty("--map-context-widget-top", commonAreaWidget.style.top);
          commonAreaWidget.hidden = false;
          if (typeof commonAreaWidget.setAreaContext === "function") commonAreaWidget.setAreaContext(context);
          else {
            commonAreaWidget.innerHTML = `<header><span class="activity-kind">ÁREA COMPARTILHADA</span><button type="button" data-common-area-widget-close aria-label="Fechar contexto da área comum">×</button></header><strong>${esc(MASTERPLAN_COMMON_AREA_LABEL_V1)}</strong><p>Use o assistente para consultar uso, manutenção, ocorrências ou planejamento desta área.</p><footer><button type="button" class="primary" data-common-area-widget-assistant>${ico("message-circle")} Perguntar à IA</button></footer>`;
            commonAreaWidget.querySelector("[data-common-area-widget-close]")?.addEventListener("click", () => { commonAreaWidget.hidden = true; });
            commonAreaWidget.querySelector("[data-common-area-widget-assistant]")?.addEventListener("click", () => { prepareAssistantMapAreaPromptV1(MASTERPLAN_COMMON_AREA_LABEL_V1); });
          }
        }
      };
      const scheduleLotWidgetHide = (lotId) => {
        if (typeof lotWidget.scheduleHide === "function") {
          lotWidget.scheduleHide(lotId);
          return;
        }
        clearTimeout(lotWidgetHideTimer);
        if (lotWidget.dataset.lot === lotId && lotWidget.dataset.pinned === "true") return;
        lotWidgetHideTimer = window.setTimeout(() => {
          if (lotWidget.dataset.lot !== lotId || lotWidget.dataset.pinned !== "true") lotWidget.hidden = true;
        }, 180);
      };
      const bindLegacyMarkerInteractions = () => {
      markerLayer.addEventListener("belavista:map-lot-marker-activate", (event) => {
        const detail = event.detail || {};
        const marker = event.target instanceof Element
          ? event.target.closest(".satellite-lot-plan-marker")
          : null;
        const lotId = String(detail.lotId || marker?.dataset.lot || "");
        if (!marker || !lotId) return;
        const label = String(detail.label || marker.getAttribute("aria-label") || `Lote ${lotNumberFor(lotId)}`);
        const source = String(detail.selectionSource || marker.dataset.mapSelectionSource || "pdf-trace-satellite");
        const typedSelection = this.closest("public-leads-surface")?.selectPublicPdfMarker?.({
          mapHost: this,
          svgRoot: svg,
          marker,
          markerLayer,
          lotWidget,
          lotId,
          label,
          source,
          pdfArea: Number(pdfAreaByLotId.get(lotId)) || null,
          lotStatuses: appStore.get().lotStatuses || {},
        });
        if (typedSelection) {
          prepareAssistantLotStatusPromptV1(label);
          this.renderLotReservationPanel?.();
          appStore.set({ lastAction: typedSelection.feedback });
          return;
        }
        const selection = globalThis.belavistaPublicMapOverlayLotSelection?.({ lotId, label, source }) || {
          dataset: { selectedLot: lotId, selectedLotSource: source, selectedLotCount: "1", selectedLots: lotId },
          eventDetail: { lotId, label, source },
          feedback: `${label} selecionado no mapa`,
        };
        setSelectedLotMarker(lotId);
        selectLotHitArea(svg, lotId);
        prepareAssistantLotStatusPromptV1(label);
        Object.assign(this.dataset, selection.dataset);
        this.selectedLotIds = new Set([lotId]);
        Object.assign(surface.dataset, selection.dataset);
        showLotWidget(lotId, marker, { pinned: true });
        this.renderLotReservationPanel?.();
        marker.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", {
          bubbles: true,
          composed: true,
          detail: selection.eventDetail,
        }));
        appStore.set({ lastAction: selection.feedback });
      });
      markerLayer.addEventListener("belavista:map-lot-marker-presence", (event) => {
        const detail = event.detail || {};
        const marker = event.target instanceof Element ? event.target.closest(".satellite-lot-plan-marker") : null;
        const lotId = String(detail.lotId || marker?.dataset.lot || "");
        if (!marker || !lotId) return;
        if (detail.active) showLotWidget(lotId, marker);
        else scheduleLotWidgetHide(lotId);
      });
      if (typeof lotWidget.scheduleHide !== "function") {
        lotWidget.addEventListener("pointerenter", () => clearTimeout(lotWidgetHideTimer));
        lotWidget.addEventListener("pointerleave", () => scheduleLotWidgetHide(lotWidget.dataset.lot));
      }
      };
      layer.append(fit);
      surface.append(layer);
      if (!markers) {
        // A rota pública instala seus botões comerciais separadamente. Caso
        // ela tenha chegado antes deste fetch, reparentamos a camada para o
        // mesmo quadro quadrado da foto, preservando o clique e corrigindo o
        // recorte `cover` de telas retangulares.
        const publicMarkers = surface.querySelector(
          "[data-public-static-lot-markers]",
        );
        if (publicMarkers) fit.append(publicMarkers);
      }

      const imageSize = trace.imageSize || [1672, 941];
      const masterplanOverlay = surface.querySelector("[data-admin-masterplan-overlay]");
      const renderDomMarkers = (isPublicLeadsMap || !masterplanOverlay) && Boolean(markers || this._satelliteLotPlanRequestedMarkersV1);
      let markerOverrides = {};
      try {
        const stored = JSON.parse(localStorage.getItem("belavista.map.lot-marker-overrides.v1") || "{}");
        markerOverrides = stored && typeof stored === "object" ? stored : {};
      } catch {}
      const projectionInput = {
        traceLots: lots,
        imageSize,
        fallbackLots: lots,
        masterplanPolygonAsset,
        pdfLotLabelsAsset,
        pdfLotGreenMappingAsset,
        hasMasterplanOverlay: Boolean(masterplanOverlay),
        invalidLotIds: [...INVALID_MASTERPLAN_LOT_IDS_V1],
        geometryRepairLotIds: [...MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1],
        commonAreaSourceIds: [...MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1],
      };
      const projection = globalThis.belavistaProjectPublicSatelliteLots?.(projectionInput) || createSatelliteLotProjectionV1({
        trace,
        imageSize,
        lots,
        masterplanPolygonAsset,
        pdfLotLabelsAsset,
        pdfLotGreenMappingAsset,
        hasMasterplanOverlay: Boolean(masterplanOverlay),
        invalidLotIds: INVALID_MASTERPLAN_LOT_IDS_V1,
        geometryRepairLotIds: MASTERPLAN_PDF_GEOMETRY_REPAIR_LOT_IDS_V1,
        commonAreaSourceIds: MASTERPLAN_COMMON_AREA_SOURCE_IDS_V1,
        polygonCentroid: polygonCentroidV1,
        projectCanonicalTrace: projectCanonicalLotTraceToMasterplanOverlayUvV1,
      });
      const {
        masterplanLots,
        usesNativeMasterplanPolygons,
        officialMarkerByLot,
        greenMappingByLot,
        canonicalTraceMarkerByLot,
        usesGreenLotMapping,
        usesCanonicalTraceMarkers,
        hasOfficialPdfLabels,
        canRepairPdfGeometry,
        projectedLots,
        commonAreaPolygons,
        projectedBounds,
        masterplanMarkerPosition,
      } = projection;
      const projectedSvgPath = (points) => globalThis.belavistaPublicMapProjectedSvgPath?.(points)
        ?? `${points.map((point, index) => `${index ? "L" : "M"}${(point.u * 1000).toFixed(2)} ${(point.v * 1000).toFixed(2)}`).join(" ")} Z`;
      const projectedFrameSvgPath = (points, frame) => globalThis.belavistaPublicMapFrameSvgPath?.(points, frame)
        ?? (points.map((point, index) => {
          const position = masterplanMarkerPosition(point.u, point.v, frame);
          return `${index ? 'L' : 'M'}${position.u * 1000} ${position.v * 1000}`;
        }).join(' ') + ' Z');
      const pdfAreaLinks = [...greenMappingByLot.entries()].map(([lotId, mapping]) => ({
        lotId,
        greenPolygonId: String(mapping.greenPolygonId || ""),
      }));
      pdfAreaByLotId = globalThis.belavistaPublicMapLotPdfAreas?.(geo?.lots, pdfAreaLinks)
        ?? (() => {
          const geometryByLotId = new Map(
            (Array.isArray(geo?.lots) ? geo.lots : [])
              .filter((row) => Array.isArray(row) && row[0])
              .map((row) => [String(row[0]), row]),
          );
          return new Map(pdfAreaLinks.map(({ lotId, greenPolygonId }) => [
            lotId,
            Number(geometryByLotId.get(greenPolygonId)?.[5]) || null,
          ]));
        })();
      const masterplanFrame = (() => {
        const rawOverride = this.dataset.adminMasterplanFrame || "{}";
        const projectedFrame = globalThis.belavistaPublicMapFrameFromOverrides?.(
          ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
          rawOverride,
        );
        if (projectedFrame) return projectedFrame;
        try {
          return { ...ADMIN_MASTERPLAN_SATELLITE_FRAME_V1, ...JSON.parse(rawOverride) };
        } catch {
          return { ...ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 };
        }
      })();
      const publicMarkerBatch = globalThis.belavistaProjectPublicSatelliteLotMarkerBatch?.({
        projectedLots,
        greenMappingByLot,
        canonicalTraceMarkerByLot,
        officialMarkerByLot,
        projectedBounds,
        frame: masterplanFrame,
        usesNativeMasterplanPolygons,
        hasMasterplanOverlay: Boolean(masterplanOverlay),
        usesGreenLotMapping,
        usesCanonicalTraceMarkers,
        hasOfficialPdfLabels,
        renderDomMarkers,
        isPublicLeadsMap,
        manualOverrides: markerOverrides,
      });
      layer.dataset.markerModelOwner = publicMarkerBatch ? "program-ts" : "mjs-compatibility";
      const publicMarkerByLot = new Map((publicMarkerBatch?.lotMarkers || []).map(model => [model.lotId, model]));
      const publicFallbackMarkerByLot = new Map((publicMarkerBatch?.fallbackMarkers || []).map(model => [model.lotId, model]));
      const publicMarkersRendered = Boolean(publicMarkerBatch && this.closest("public-leads-surface")?.renderPublicSatelliteLotMarkers?.({
        markerLayer,
        batch: publicMarkerBatch,
      }) === true);
      if (publicMarkersRendered) layer.dataset.markerRenderOwner = "components-ts";
      if (masterplanOverlay && usesGreenLotMapping) {
        this.paintMasterplanLotLabelsV1?.([...greenMappingByLot.entries()].map(([lotId, mapping]) => {
          return {
            lotId,
            number: String(Number(mapping.number) || lotNumberFor(lotId)).padStart(2, "0"),
            u: Number(mapping.u),
            v: Number(mapping.v),
            // A associação revisada PDF → polígono aponta a área correspondente.
            // O número isolado se repete entre quadras na tabela de preços.
            areaM2: Number(pdfAreaByLotId.get(lotId)) || null,
          };
        }));
      }
      layer.dataset.pdfLotEnumerationV1 = usesCanonicalTraceMarkers
        ? String(canonicalTraceMarkerByLot.size)
        : usesGreenLotMapping
        ? String(greenMappingByLot.size)
        : hasOfficialPdfLabels
        ? String(officialMarkerByLot.size)
        : "fallback";
      layer.dataset.pdfGreenLotMappingV1 = usesGreenLotMapping
        ? String(greenMappingByLot.size)
        : "fallback";
      layer.dataset.canonicalLotTraceOverlayV1 = usesCanonicalTraceMarkers
        ? CANONICAL_LOT_TRACE_OVERLAY_ALIGNMENT_V1
        : "fallback";

      // Não desenhar o antigo traçado canônico como recuperação visual. Ele
      // era uma projeção de retângulos do DWG e criava falsos lotes onde a
      // prancha oficial não tem área verde. As únicas áreas de lote são as
      // geometrias revisadas da própria prancha/PDF, em `projectedLots`.
      // Mantemos o grupo no SVG apenas para compatibilidade da camada.
      layer.dataset.visualParcelOutlineRecovery = "0 · PDF-reviewed-only";
      const lotSvgRenderer = customElements.get("atlas-map-lot-svg-renderer")
        ? document.createElement("atlas-map-lot-svg-renderer")
        : null;
      const selectLotHitArea = (root, lotId) => {
        if (typeof lotSvgRenderer?.selectLotHitArea === "function") lotSvgRenderer.selectLotHitArea(root, lotId);
        else {
          root.querySelectorAll(".satellite-lot-hit-area.is-selected").forEach(node => node.classList.remove("is-selected"));
          [...root.querySelectorAll(".satellite-lot-hit-area[data-lot]")].find(node => node.dataset.lot === lotId)?.classList.add("is-selected");
        }
      };
      const selectCommonAreaHitArea = (root, sourceId) => {
        if (typeof lotSvgRenderer?.selectCommonAreaHitArea === "function") lotSvgRenderer.selectCommonAreaHitArea(root, sourceId);
        else {
          root.querySelectorAll(".satellite-common-area-hit-area.is-selected, .satellite-lot-hit-area.is-selected").forEach(node => node.classList.remove("is-selected"));
          [...root.querySelectorAll(".satellite-common-area-hit-area[data-common-area-source]")].find(node => node.dataset.commonAreaSource === sourceId)?.classList.add("is-selected");
        }
      };
      const clearSelectedCommonAreaHitArea = (root) => {
        if (typeof lotSvgRenderer?.clearSelectedCommonArea === "function") lotSvgRenderer.clearSelectedCommonArea(root);
        else root.querySelectorAll(".satellite-common-area-hit-area.is-selected").forEach(node => node.classList.remove("is-selected"));
      };
      const publicSurface = this.closest("public-leads-surface");
      const publicLotWidgetActionsOwned = publicSurface?.bindPublicSatelliteLotWidgetActions?.({
        mapHost: this,
        lotWidget,
        prepareAssistantLotStatusPrompt: prepareAssistantLotStatusPromptV1,
        openCatalogLot: catalogLabel => appStore.set({ view: "lot-detail", selectedLotDetailKey: catalogLabel, lastAction: `Abriu a ficha do lote ${catalogLabel} pelo mapa` }),
        dispatchUnlinkedLotSelection: (lotId, label) => this.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", { bubbles: true, composed: true, detail: { lotId, label } })),
      }) === true;
      if (!publicLotWidgetActionsOwned) bindLegacyLotWidgetActions();
      const publicMarkerInteractionsOwned = publicSurface?.bindPublicSatelliteLotMarkerInteractions?.({
        mapHost: this,
        svgRoot: svg,
        markerLayer,
        lotWidget,
        pdfAreaByLotId,
        lotStatuses: () => appStore.get().lotStatuses || {},
        prepareAssistantLotStatusPrompt: prepareAssistantLotStatusPromptV1,
        renderReservationPanel: () => this.renderLotReservationPanel?.(),
        onFeedback: feedback => appStore.set({ lastAction: feedback }),
      }) === true;
      if (!publicMarkerInteractionsOwned) bindLegacyMarkerInteractions();
      const publicOverlayInteractionsOwned = publicSurface?.bindPublicSatelliteOverlayInteractions?.({
        mapHost: this,
        svgRoot: svg,
        polygonGroup,
        commonAreaGroup,
        markerLayer,
        lotWidget,
        commonAreaWidget,
        lotStatuses: () => appStore.get().lotStatuses || {},
        pdfAreaByLotId,
        greenMappingByLot,
        officialMarkerByLot,
        projectedLots,
        frame: masterplanFrame,
        commonAreaLabel: MASTERPLAN_COMMON_AREA_LABEL_V1,
        prepareAssistantMapAreaPrompt: prepareAssistantMapAreaPromptV1,
        onFeedback: feedback => appStore.set({ lastAction: feedback }),
      }) === true;
      if (!publicOverlayInteractionsOwned) commonAreaGroup.addEventListener("belavista:map-common-area-activate", (event) => {
        const detail = event.detail || {};
        const path = event.target instanceof Element ? event.target.closest(".satellite-common-area-hit-area") : null;
        const sourceId = String(detail.sourceId || path?.dataset.commonAreaSource || "");
        if (!path || !sourceId || this.classList.contains("is-admin-masterplan-editing")) return;
        let projected = [];
        try { projected = JSON.parse(path.dataset.commonAreaUv || "[]"); } catch {}
        const typedSelection = this.closest("public-leads-surface")?.selectPublicCommonArea?.({
          mapHost: this,
          svgRoot: svg,
          path,
          markerLayer,
          commonAreaWidget,
          sourceId,
          label: MASTERPLAN_COMMON_AREA_LABEL_V1,
          projected,
          frame: masterplanFrame,
        });
        if (typedSelection) {
          prepareAssistantMapAreaPromptV1(typedSelection.label);
          appStore.set({ lastAction: typedSelection.feedback });
          return;
        }
        selectCommonAreaHitArea(svg, sourceId);
        setSelectedLotMarker(null);
        const selection = globalThis.belavistaPublicMapCommonAreaSelection?.({
          sourceId,
          label: MASTERPLAN_COMMON_AREA_LABEL_V1,
          projected,
          frame: masterplanFrame,
        });
        const center = selection?.center ?? globalThis.belavistaPublicMapPolygonMean?.(projected) ?? projected.reduce(
          (total, point) => ({ u: total.u + point.u / projected.length, v: total.v + point.v / projected.length }),
          { u: 0.5, v: 0.5 },
        );
        const label = selection?.label || MASTERPLAN_COMMON_AREA_LABEL_V1;
        const position = selection?.position || masterplanMarkerPosition(center.u, center.v, masterplanFrame);
        const selectionDataset = selection?.dataset || {
          selectedMapArea: label,
          selectedMapAreaSource: selection?.sourceId || sourceId,
        };
        Object.assign(this.dataset, selectionDataset);
        Object.assign(surface.dataset, selectionDataset);
        showCommonAreaWidget(position, sourceId);
        prepareAssistantMapAreaPromptV1(label);
        appStore.set({ lastAction: selection?.feedback || `${label} selecionada no mapa` });
      });
      const publicOverlayHitAreas = publicSurface?.renderPublicSatelliteOverlayHitAreas?.({
        svgRoot: svg,
        polygonGroup,
        commonAreaGroup,
        projectedLots,
        commonAreaPolygons,
        usesNativeMasterplanPolygons,
        projectedBounds,
        masterplanOverlay: Boolean(masterplanOverlay),
        commonAreaLabel: MASTERPLAN_COMMON_AREA_LABEL_V1,
        bindLotActivation: publicOverlayInteractionsOwned || !globalThis.__BELAVISTA_PUBLIC_MAP_MARKER_ACTIONS_INSTALLED,
        lotLabel: lotId => globalThis.belavistaPublicMapLotMarkerIdentity?.(lotId)?.label || `Lote ${lotNumberFor(lotId)}`,
      });
      const publicOverlayHitAreasRendered = Boolean(publicOverlayHitAreas);
      if (!publicOverlayHitAreasRendered) commonAreaPolygons.forEach(({ sourceId, projected }) => {
        const path = lotSvgRenderer?.createCommonAreaHitArea?.({
          sourceId,
          pathData: projectedSvgPath(projected),
          projected,
          label: `Consultar ${MASTERPLAN_COMMON_AREA_LABEL_V1}`,
        }) ?? document.createElementNS("http://www.w3.org/2000/svg", "path");
        if (!lotSvgRenderer) {
          path.setAttribute("d", projectedSvgPath(projected));
          path.dataset.commonAreaSource = sourceId;
          path.dataset.commonAreaUv = JSON.stringify(projected);
          path.classList.add("satellite-common-area-hit-area");
          path.style.pointerEvents = "auto";
          path.setAttribute("tabindex", "0");
          path.setAttribute("role", "button");
          path.setAttribute("aria-label", `Consultar ${MASTERPLAN_COMMON_AREA_LABEL_V1}`);
        }
        if (typeof lotSvgRenderer?.bindHitAreaActivation === "function") {
          lotSvgRenderer.bindHitAreaActivation(path, "belavista:map-common-area-activate", { sourceId });
        } else {
          const openCommonAreaContext = (event) => {
            event.preventDefault();
            event.stopPropagation();
            path.dispatchEvent(new CustomEvent("belavista:map-common-area-activate", { bubbles: true, composed: true, detail: { sourceId } }));
          };
          path.addEventListener("click", openCommonAreaContext);
          path.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") openCommonAreaContext(event);
          });
        }
        commonAreaGroup.append(path);
      });
      if (!publicOverlayInteractionsOwned) polygonGroup.addEventListener("belavista:map-lot-polygon-activate", (event) => {
        const detail = event.detail || {};
        const path = event.target instanceof Element ? event.target.closest(".satellite-lot-hit-area") : null;
        const lotId = String(detail.lotId || path?.dataset.lot || "");
        if (!path || !lotId || this.classList.contains("is-admin-masterplan-editing")) return;
        const label = String(detail.label || globalThis.belavistaPublicMapLotMarkerIdentity?.(lotId)?.label || `Lote ${lotNumberFor(lotId)}`);
        const projectedLot = projectedLots.find(row => row.lotId === lotId);
        const positionPlan = globalThis.belavistaPublicMapLotSelectionWidgetPosition?.({
          greenMapping: greenMappingByLot.get(lotId) || null,
          officialPdfMarker: officialMarkerByLot.get(lotId) || null,
          projectedPolygon: projectedLot?.projected[0] || null,
          frame: masterplanFrame,
        });
        const anchor = greenMappingByLot.get(lotId) || officialMarkerByLot.get(lotId);
        const position = positionPlan?.position || (anchor
          ? masterplanMarkerPosition(anchor.u, anchor.v, masterplanFrame)
          : { u: projectedLot?.projected[0]?.u ?? 0.5, v: projectedLot?.projected[0]?.v ?? 0.5 });
        const typedSelection = this.closest("public-leads-surface")?.selectPublicPdfLot?.({
          mapHost: this,
          svgRoot: svg,
          path,
          markerLayer,
          lotWidget,
          lotId,
          label,
          source: "pdf-uv-hit-area",
          position,
          pdfArea: Number(pdfAreaByLotId.get(lotId)) || null,
          lotStatuses: appStore.get().lotStatuses || {},
        });
        if (typedSelection) {
          appStore.set({ lastAction: typedSelection.feedback });
          return;
        }
        const selection = globalThis.belavistaPublicMapOverlayLotSelection?.({ lotId, label, source: "pdf-uv-hit-area" }) || {
          dataset: { selectedLot: lotId, selectedLotSource: "pdf-uv-hit-area", selectedLotCount: "1", selectedLots: lotId },
          eventDetail: { lotId, label, source: "pdf-uv-hit-area" },
          feedback: `${label} selecionado no mapa`,
        };
        selectLotHitArea(svg, lotId);
        setSelectedLotMarker(null);
        setSelectedLotMarker(lotId);
        Object.assign(this.dataset, selection.dataset);
        this.selectedLotIds = new Set([lotId]);
        Object.assign(surface.dataset, selection.dataset);
        showLotWidget(lotId, { style: {
          left: `${(position.u * 100).toFixed(4)}%`,
          top: `${(position.v * 100).toFixed(4)}%`,
        } }, { pinned: true });
        path.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", { bubbles: true, composed: true, detail: selection.eventDetail }));
        appStore.set({ lastAction: selection.feedback });
      });
      let count = 0;
      projectedLots.forEach(({ lotId, projected, greenMapping }, lotIndex) => {
        if (!publicOverlayHitAreasRendered) {
        const relativePolygon = globalThis.belavistaPublicMapRelativeLotPolygon?.(
          projected,
          usesNativeMasterplanPolygons,
          projectedBounds,
        ) ?? (usesNativeMasterplanPolygons
          ? projected
          : projected.map(point => ({
              u: (point.u - projectedBounds.minU) / (projectedBounds.maxU - projectedBounds.minU),
              v: (point.v - projectedBounds.minV) / (projectedBounds.maxV - projectedBounds.minV),
            })));
        const path = lotSvgRenderer?.createLotHitArea?.({
          lotId,
          pathData: projectedSvgPath(projected),
          relativePolygon,
          label: `Consultar ${lotId.replace('_', ' ')}`,
          interactive: Boolean(masterplanOverlay),
        }) ?? document.createElementNS("http://www.w3.org/2000/svg", "path");
        if (!lotSvgRenderer) {
          path.setAttribute("d", projectedSvgPath(projected));
          path.dataset.lot = lotId;
        }
        if (masterplanOverlay) {
          polygonGroup.removeAttribute("hidden");
          svg.removeAttribute("aria-hidden");
          if (!lotSvgRenderer) {
            path.dataset.lotUv = JSON.stringify(relativePolygon);
            path.dataset.lotSource = "pdf-reviewed-area";
            path.classList.add("satellite-lot-hit-area");
            path.style.pointerEvents = "auto";
            path.setAttribute("tabindex", "0");
            path.setAttribute("role", "button");
            path.setAttribute("aria-label", `Consultar ${lotId.replace('_', ' ')}`);
          }
          // A associação PDF -> área verde já foi revisada no arquivo de
          // mapeamento. Portanto a área preenchida real do lote é clicável;
          // linhas brancas e projeções geométricas legadas continuam fora da
          // interação porque não entram em `projectedLots`.
          if (publicOverlayInteractionsOwned || !globalThis.__BELAVISTA_PUBLIC_MAP_MARKER_ACTIONS_INSTALLED) {
            const detail = {
              lotId,
              label: globalThis.belavistaPublicMapLotMarkerIdentity?.(lotId)?.label || `Lote ${lotNumberFor(lotId)}`,
              selectionSource: "pdf-uv-hit-area",
            };
            if (typeof lotSvgRenderer?.bindHitAreaActivation === "function") {
              lotSvgRenderer.bindHitAreaActivation(path, "belavista:map-lot-polygon-activate", detail);
            } else {
              path.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                path.dispatchEvent(new CustomEvent("belavista:map-lot-polygon-activate", { bubbles: true, composed: true, detail }));
              });
              path.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  path.dispatchEvent(new CustomEvent("belavista:map-lot-polygon-activate", { bubbles: true, composed: true, detail }));
                }
              });
            }
          }
        }
        polygonGroup.append(path);
        }

        if (renderDomMarkers && !publicMarkersRendered) {
          // O centróide ponderado pela área fica dentro da geometria desenhada
          // na prancha PDF. A média simples dos vértices deslocava os números
          // em lotes de esquina e nos polígonos irregulares.
          const canonicalMarker = canonicalTraceMarkerByLot.get(lotId);
          const officialMarker = officialMarkerByLot.get(lotId);
          const useMappedAnchors = Boolean(masterplanOverlay || hasOfficialPdfLabels);
          const markerPlacement = publicMarkerBatch ? null : globalThis.belavistaPublicMapLotMarkerPlacement?.({
            projected,
            greenMapping,
            canonicalMarker,
            officialMarker,
            usesNativeMasterplanPolygons,
            useMappedAnchors,
            projectedBounds,
            frame: masterplanFrame,
          });
          const manualPosition = isPublicLeadsMap ? null : markerOverrides[lotId];
          const markerRenderModel = publicMarkerBatch
            ? publicMarkerByLot.get(lotId) || null
            : globalThis.belavistaPublicMapLotMarkerRenderModel?.({
                lotId,
                lotIndex,
                placement: markerPlacement,
                greenMapping,
                usesCanonicalTraceMarkers,
                manualPosition,
              });
          // Compatibilidade temporária: mantém o cálculo legado enquanto
          // runtime TS não for carregado em algum consumidor antigo.
          let center = markerRenderModel?.center ?? markerPlacement?.center ?? null;
          if (!center) {
            let signedArea = 0;
            let centroidU = 0;
            let centroidV = 0;
            projected.forEach((point, index) => {
              const next = projected[(index + 1) % projected.length];
              const cross = point.u * next.v - next.u * point.v;
              signedArea += cross;
              centroidU += (point.u + next.u) * cross;
              centroidV += (point.v + next.v) * cross;
            });
            const mean = projected.reduce(
              (total, point) => ({ u: total.u + point.u, v: total.v + point.v }),
              { u: 0, v: 0 },
            );
            mean.u /= projected.length;
            mean.v /= projected.length;
            const areaFactor = signedArea * 3;
            center = Math.abs(areaFactor) > 1e-9
              ? { u: centroidU / areaFactor, v: centroidV / areaFactor }
              : mean;
          }
          let markerU = center.u;
          let markerV = center.v;
          const markerIdentity = markerRenderModel || globalThis.belavistaPublicMapLotMarkerIdentity?.(lotId)
            || { lotNumber: String(lotId.match(/\d+/g)?.at(-1) || "").padStart(3, "0"), label: `Lote ${String(lotId.match(/\d+/g)?.at(-1) || "").padStart(3, "0") || lotId.replace(/^Lote_?/, "")}` };
          const { lotNumber, label } = markerIdentity;
          const markerSource = markerRenderModel?.source || (greenMapping
            ? "pdf-original-label"
            : usesCanonicalTraceMarkers
              ? "canonical-trace"
              : "pdf-green-mapping");
          let relativePosition = null;
          // Nas faixas onde a escala inicial comprime dois lotes vizinhos,
          // preserva-se a ordem numérica da prancha para que o alvo visível
          // não seja trocado pelo último elemento inserido.
          if (markerRenderModel) {
            if (markerRenderModel.relativeU != null && markerRenderModel.relativeV != null) {
              relativePosition = { u: markerRenderModel.relativeU, v: markerRenderModel.relativeV };
            }
            markerU = markerRenderModel.position.u;
            markerV = markerRenderModel.position.v;
          } else if (markerPlacement?.relativeU != null && markerPlacement?.relativeV != null) {
            relativePosition = { u: markerPlacement.relativeU, v: markerPlacement.relativeV };
            markerU = markerPlacement.u;
            markerV = markerPlacement.v;
          } else if (!markerPlacement && useMappedAnchors && projectedBounds.maxU > projectedBounds.minU && projectedBounds.maxV > projectedBounds.minV) {
            // O número impresso no PDF já foi associado a exatamente um
            // polígono verde. A projeção DWG é apenas contingência: sua
            // homografia desloca quase todos os números para outro lote.
            const relativeU = greenMapping
              ? Number(greenMapping.u)
              : canonicalMarker
              ? Number(canonicalMarker.u)
              : officialMarker
              ? Number(officialMarker.u)
              : usesNativeMasterplanPolygons
              ? center.u
              : (center.u - projectedBounds.minU) / (projectedBounds.maxU - projectedBounds.minU);
            const relativeV = greenMapping
              ? Number(greenMapping.v)
              : canonicalMarker
              ? Number(canonicalMarker.v)
              : officialMarker
              ? Number(officialMarker.v)
              : usesNativeMasterplanPolygons
              ? center.v
              : (center.v - projectedBounds.minV) / (projectedBounds.maxV - projectedBounds.minV);
            relativePosition = { u: relativeU, v: relativeV };
            const position = masterplanMarkerPosition(relativeU, relativeV, masterplanFrame);
            markerU = position.u;
            markerV = position.v;
          } else if (markerPlacement) {
            markerU = markerPlacement.u;
            markerV = markerPlacement.v;
          }
          const legacyManualPosition = markerRenderModel ? null : manualPosition;
          if (
            legacyManualPosition &&
            Number.isFinite(Number(legacyManualPosition.u)) &&
            Number.isFinite(Number(legacyManualPosition.v))
          ) {
            markerU = Number(legacyManualPosition.u);
            markerV = Number(legacyManualPosition.v);
          }
          const markerPosition = markerRenderModel?.position ?? {
            u: markerU,
            v: markerV,
            zIndex: 1000 - lotIndex,
            manualPosition: legacyManualPosition && Number.isFinite(Number(legacyManualPosition.u)) && Number.isFinite(Number(legacyManualPosition.v))
              ? { u: Number(legacyManualPosition.u), v: Number(legacyManualPosition.v) }
              : null,
          };
          const marker = appendLotMarker({
            lotId, lotNumber, label, title: markerRenderModel?.title, source: markerSource, selectionSource: markerRenderModel?.selectionSource || "pdf-trace-satellite",
            position: markerPosition, relativePosition,
          });
          bindLotMarkerInteractions(marker, lotId, label);
        }
        count++;
      });

      // Todos os números conferidos no PDF permanecem visíveis. Quando a
      // segmentação não cobre um lote, sua âncora vem do círculo original,
      // sem associar a ele o polígono de outro lote.
      if (renderDomMarkers && !publicMarkersRendered && (usesGreenLotMapping || usesCanonicalTraceMarkers)) {
        const renderedLotIds = new Set(projectedLots.map(({ lotId }) => lotId));
        const fallbackEntries = usesGreenLotMapping
          ? [...greenMappingByLot.entries()]
          : [...canonicalTraceMarkerByLot.entries()];
        fallbackEntries
          .filter(([lotId]) =>
            !renderedLotIds.has(lotId) && officialMarkerByLot.has(lotId),
          )
          .sort(([left], [right]) => left.localeCompare(right, "pt-BR", { numeric: true }))
          .forEach(([lotId, relative], fallbackIndex) => {
            const manualPosition = isPublicLeadsMap ? null : markerOverrides[lotId];
            const fallbackMarkerModel = publicMarkerBatch
              ? publicFallbackMarkerByLot.get(lotId) || null
              : globalThis.belavistaPublicMapFallbackLotMarkerModel?.({
                  lotId,
                  relativePosition: relative,
                  frame: masterplanFrame,
                  fallbackIndex,
                  usesGreenLotMapping,
                  manualPosition,
                });
            const markerIdentity = fallbackMarkerModel || globalThis.belavistaPublicMapLotMarkerIdentity?.(lotId)
              || { lotNumber: String(lotId.match(/\d+/g)?.at(-1) || "").padStart(3, "0"), label: `Lote ${String(lotId.match(/\d+/g)?.at(-1) || "").padStart(3, "0") || lotId.replace(/^Lote_?/, "")}` };
            const { lotNumber, label } = markerIdentity;
            const markerSource = fallbackMarkerModel?.source || (usesGreenLotMapping ? "pdf-circle-only" : "canonical-trace-fallback");
            const title = fallbackMarkerModel?.title || (usesGreenLotMapping ? `${label} · posição conferida no PDF` : `${label} · contorno recuperado da geometria oficial`);
            const relativePosition = fallbackMarkerModel?.relativePosition || relative;
            const legacyManual = fallbackMarkerModel ? null : manualPosition;
            const positioned = fallbackMarkerModel?.position || masterplanMarkerPosition(relative.u, relative.v, masterplanFrame);
            const markerPosition = fallbackMarkerModel?.position || {
              u: Number.isFinite(Number(legacyManual?.u)) ? Number(legacyManual.u) : positioned.u,
              v: Number.isFinite(Number(legacyManual?.v)) ? Number(legacyManual.v) : positioned.v,
              zIndex: 720 - fallbackIndex,
              manualPosition: Number.isFinite(Number(legacyManual?.u)) && Number.isFinite(Number(legacyManual?.v))
                ? { u: Number(legacyManual.u), v: Number(legacyManual.v) }
                : null,
            };
            const marker = appendLotMarker({
              lotId, lotNumber, label, title, source: markerSource, selectionSource: markerSource,
              position: markerPosition, relativePosition,
            });
            bindLotMarkerInteractions(marker, lotId, label);
            count++;
          });
      }

      const typedFitMounted = this.closest("public-leads-surface")?.mountPublicSatelliteLotOverlayFit?.({
        mapHost: this,
        surface,
        layer,
        fit,
      }) === true;
      if (!typedFitMounted) {
      const syncFit = () => {
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const side = Math.max(rect.width, rect.height);
        fit.style.width = `${side}px`;
        fit.style.height = `${side}px`;
        fit.style.maxWidth = "none";
        fit.style.maxHeight = "none";
        fit.style.left = `${(rect.width - side) / 2}px`;
        fit.style.top = `${(rect.height - side) / 2}px`;
        syncContextWidgetScale();
      };
      // A planta, os marcadores e o cartão vivem na mesma camada que recebe o
      // zoom do satélite. Sem compensação, um cartão de 218px vira um painel
      // gigantesco quando a pessoa aproxima o mapa. Mantemos uma proporção
      // confortável da viewport e aplicamos a razão inversa do zoom à camada.
      const syncContextWidgetScale = (requestedZoom) => {
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dataZoom = Number.parseFloat(
          String(this.dataset.staticMapZoom || "").replace("%", ""),
        ) / 100;
        const inlineZoom = Number.parseFloat(this.style.getPropertyValue("--static-map-zoom"));
        const scale = globalThis.belavistaPublicMapContextWidgetScale?.(
          rect.width,
          rect.height,
          Number(requestedZoom),
          inlineZoom,
          dataZoom,
        ) ?? (() => {
          const mapZoom = Math.max(0.92, Number(requestedZoom) || inlineZoom || dataZoom || 1);
          const viewportScale = Math.max(0.52, Math.min(0.8, Math.min(rect.width / 1180, rect.height / 760)));
          return { mapZoom, viewportScale, widgetScale: Math.max(0.18, Math.min(0.9, viewportScale / mapZoom)) };
        })();
        const { mapZoom, viewportScale, widgetScale } = scale;
        layer.style.setProperty(
          "--map-context-widget-scale",
          widgetScale.toFixed(3),
        );
        layer.dataset.mapContextWidgetScale = widgetScale.toFixed(3);
        layer.dataset.mapContextWidgetViewportScale = viewportScale.toFixed(3);
        layer.dataset.mapContextWidgetZoom = mapZoom.toFixed(3);
      };
      this.syncSatelliteLotContextWidgetScaleV1 = syncContextWidgetScale;
      syncFit();
      const observer = new ResizeObserver(syncFit);
      observer.observe(surface);
      this._satelliteLotPlanObserverV1 = observer;
      }
      this._satelliteLotPlanOverlayV1 = layer;
      const legacyFrameSync = () => {
        const frame = globalThis.belavistaPublicMapFrameFromOverrides?.(
          ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
          this.dataset.adminMasterplanFrame,
        ) ?? (() => {
          let fallbackFrame = { ...ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 };
          try { fallbackFrame = { ...fallbackFrame, ...JSON.parse(this.dataset.adminMasterplanFrame || "{}") }; } catch {}
          return fallbackFrame;
        })();
        const typedFrameSync = lotSvgRenderer?.syncMasterplanFrame?.({
          markerLayer,
          polygonGroup,
          commonAreaGroup,
          visualRecoveryGroup,
          frame,
        }) === true;
        if (typedFrameSync) return true;
        surface.querySelectorAll(".satellite-lot-plan-marker[data-masterplan-relative-u][data-masterplan-relative-v]").forEach((marker) => {
          const manualU = Number(marker.dataset.mapAdjustU);
          const manualV = Number(marker.dataset.mapAdjustV);
          if (Number.isFinite(manualU) && Number.isFinite(manualV)) {
            marker.style.left = `${(manualU * 100).toFixed(4)}%`;
            marker.style.top = `${(manualV * 100).toFixed(4)}%`;
            return;
          }
          const position = masterplanMarkerPosition(
            Number(marker.dataset.masterplanRelativeU),
            Number(marker.dataset.masterplanRelativeV),
            frame,
          );
          marker.style.left = `${(position.u * 100).toFixed(4)}%`;
          marker.style.top = `${(position.v * 100).toFixed(4)}%`;
        });
        polygonGroup.querySelectorAll("[data-lot-uv]").forEach(path => {
          const points = JSON.parse(path.dataset.lotUv);
          path.setAttribute("d", projectedFrameSvgPath(points, frame));
        });
        commonAreaGroup.querySelectorAll("[data-common-area-uv]").forEach(path => {
          const points = JSON.parse(path.dataset.commonAreaUv);
          path.setAttribute("d", projectedFrameSvgPath(points, frame));
        });
        visualRecoveryGroup.querySelectorAll("[data-lot-visual-outline-uv]").forEach(path => {
          const points = JSON.parse(path.dataset.lotVisualOutlineUv);
          path.setAttribute("d", projectedFrameSvgPath(points, frame));
        });
        return false;
      };
      const typedFrameSync = lotSvgRenderer?.bindMasterplanFrameSync?.({
        mapHost: this,
        markerLayer,
        polygonGroup,
        commonAreaGroup,
        visualRecoveryGroup,
        baseFrame: ADMIN_MASTERPLAN_SATELLITE_FRAME_V1,
      });
      this.syncAdminMasterplanLotMarkersV1 = typeof typedFrameSync === "function"
        ? typedFrameSync
        : legacyFrameSync;
      this.syncAdminMasterplanLotMarkersV1();
      const publicMapBackgroundOwned = publicSurface?.bindPublicSatelliteMapBackground?.({
        mapHost: this,
        svgRoot: svg,
        commonAreaWidget,
        commonAreaLabel: MASTERPLAN_COMMON_AREA_LABEL_V1,
        masterplanOverlay: Boolean(masterplanOverlay),
        prepareAssistantMapAreaPrompt: prepareAssistantMapAreaPromptV1,
        onFeedback: feedback => appStore.set({ lastAction: feedback }),
      }) === true;
      if (!publicMapBackgroundOwned) svg.addEventListener("belavista:map-background-activate", (event) => {
        if (masterplanOverlay || this.classList.contains("is-admin-masterplan-editing")) return;
        const position = event.detail || {};
        if (!Number.isFinite(Number(position.u)) || !Number.isFinite(Number(position.v))) return;
        clearSelectedCommonAreaHitArea(svg);
        showCommonAreaWidget(position, "map-background");
        prepareAssistantMapAreaPromptV1(MASTERPLAN_COMMON_AREA_LABEL_V1);
        appStore.set({ lastAction: `${MASTERPLAN_COMMON_AREA_LABEL_V1} selecionada no mapa` });
      });
      svg.addEventListener("click", (event) => {
        if (masterplanOverlay) return;
        if (event.defaultPrevented || this.classList.contains("is-admin-masterplan-editing")) return;
        if (event.target.closest(".satellite-lot-hit-area,.satellite-common-area-hit-area")) return;
        const rect = fit.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const position = globalThis.belavistaPublicMapBackgroundPosition?.(event.clientX, event.clientY, rect)
          ?? { u: (event.clientX - rect.left) / rect.width, v: (event.clientY - rect.top) / rect.height };
        if (position.u < 0 || position.u > 1 || position.v < 0 || position.v > 1) return;
        svg.dispatchEvent(new CustomEvent("belavista:map-background-activate", { bubbles: true, composed: true, detail: position }));
      });
      this.dataset.satelliteLotPlan = usesNativeMasterplanPolygons
        ? `${count} polígonos UV do masterplan · alinhados à arte v2`
        : `${count} polígonos PDF · ${PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1}`;
      this.dataset.satelliteLotMarkers = renderDomMarkers ? String(markerLayer.querySelectorAll(".satellite-lot-plan-marker").length) : "0 · rótulos no canvas";
      const publicMarkerStatusSyncMounted = publicSurface?.mountPublicSatelliteLotMarkerStatusSync?.({
        markerLayer,
        subscribe: listener => appStore.subscribe(listener),
        getLotStatuses: () => appStore.get().lotStatuses || {},
      }) === true;
      if (!publicMarkerStatusSyncMounted) {
        this._satelliteLotStatusUnsubscribeV1?.();
        this._satelliteLotStatusUnsubscribeV1 = appStore.subscribe(syncLotMarkerStatuses);
        syncLotMarkerStatuses();
      }
      this._satelliteLotPlanInstallingV1 = false;
      this._satelliteLotPlanRequestedMarkersV1 = false;
      return count > 0;
    } catch (error) {
      this._satelliteLotPlanInstallingV1 = false;
      this._satelliteLotPlanRequestedMarkersV1 = false;
      this.dataset.satelliteLotPlan = "indisponível";
      this.dataset.satelliteLotPlanError = String(error?.message || error).slice(0, 180);
      console.warn("[Aliança Park] planta PDF sobre satélite indisponível.", error);
      return false;
    }
  };
};
