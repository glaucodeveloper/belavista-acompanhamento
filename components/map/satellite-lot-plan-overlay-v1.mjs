/** Installs the complete PDF/satellite lot overlay behavior on MapScene. */
export const installSatelliteLotPlanOverlayV1 = (MapScene, dependencies = {}) => {
  const formatBRL = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
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
      if (wantsMarkers && !layer.querySelector(".satellite-lot-plan-marker")) {
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
      const [traceResponse, geoResponse, masterplanPolygonResponse, pdfLotLabelsResponse, pdfLotGreenMappingResponse] = await Promise.all([
        fetch(ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1, { cache: "no-store" }),
        fetch(DWG_GEOREFERENCE_URL, { cache: "no-store" }),
        fetch(ADMIN_MASTERPLAN_LOT_POLYGONS_URL_V2, { cache: "no-store" }),
        fetch(PDF_LOT_LABELS_URL_V1, { cache: "no-store" }),
        fetch(PDF_LOT_GREEN_MAPPING_URL_V1, { cache: "no-store" }),
      ]);
      if (!traceResponse.ok || !geoResponse.ok)
        throw new Error("Traçado de lotes ou georreferência indisponível");
      const [trace, geo, masterplanPolygonAsset, pdfLotLabelsAsset, pdfLotGreenMappingAsset] = await Promise.all([
        traceResponse.json(),
        geoResponse.json(),
        masterplanPolygonResponse.ok
          ? masterplanPolygonResponse.json().catch(() => null)
          : Promise.resolve(null),
        pdfLotLabelsResponse.ok
          ? pdfLotLabelsResponse.json().catch(() => null)
          : Promise.resolve(null),
        pdfLotGreenMappingResponse.ok
          ? pdfLotGreenMappingResponse.json().catch(() => null)
          : Promise.resolve(null),
      ]);
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

      const markerLayer = document.createElement("div");
      markerLayer.className = "satellite-lot-plan-markers";
      fit.append(markerLayer);
      const lotWidget = document.createElement("aside");
      lotWidget.className = "satellite-lot-context-widget";
      lotWidget.hidden = true;
      lotWidget.setAttribute("aria-live", "polite");
      fit.append(lotWidget);
      const commonAreaWidget = document.createElement("aside");
      commonAreaWidget.className = "satellite-lot-context-widget satellite-common-area-context-widget";
      commonAreaWidget.hidden = true;
      commonAreaWidget.setAttribute("aria-live", "polite");
      fit.append(commonAreaWidget);
      let lotWidgetHideTimer = 0;
      let pinnedLotWidgetId = "";
      const lotNumberFor = (lotId) => String(lotId).match(/\d+/g)?.at(-1)?.padStart(3, "0") || "";
      const showLotWidget = (lotId, marker, { pinned = false } = {}) => {
        const lotNumber = lotNumberFor(lotId);
        if (!lotNumber) return;
        if (pinned) pinnedLotWidgetId = lotId;
        clearTimeout(lotWidgetHideTimer);
        const catalogMatches = REPASSE_PRICE_CATALOG.filter((item) => Number(item.lot) === Number(lotNumber));
        const match = catalogMatches.length === 1 ? catalogMatches[0] : null;
        const status = match ? appStore.get().lotStatuses?.[match.label] : null;
        const price = match
          ? formatBRL(match.price)
          : catalogMatches.length
          ? `${formatBRL(Math.min(...catalogMatches.map((item) => Number(item.price) || 0)))}–${formatBRL(Math.max(...catalogMatches.map((item) => Number(item.price) || 0)))}`
          : "Consultar tabela";
        lotWidget.dataset.lot = lotId;
        lotWidget.dataset.pinned = pinnedLotWidgetId === lotId ? "true" : "false";
        lotWidget.style.left = marker?.style.left || "50%";
        lotWidget.style.top = marker?.style.top || "50%";
        lotWidget.style.setProperty("--map-context-widget-left", lotWidget.style.left);
        lotWidget.style.setProperty("--map-context-widget-top", lotWidget.style.top);
        lotWidget.hidden = false;
        lotWidget.innerHTML = `<header><span class="activity-kind">LOTE ${esc(lotNumber)}</span><button type="button" data-lot-widget-close aria-label="Fechar widget do lote">×</button></header><strong>${esc(match?.label || `Lote ${lotNumber}`)}</strong><dl><div><dt>Status</dt><dd>${esc(status?.status || "Disponível")}</dd></div><div><dt>Valor</dt><dd>${esc(price)}</dd></div>${match ? `<div><dt>Quadra</dt><dd>${esc(match.quadra)} · ${esc(match.area)} m²</dd></div>` : ""}</dl><footer><button type="button" data-lot-widget-assistant>${ico("message-circle")} Perguntar à IA</button>${match ? `<button type="button" data-lot-widget-open class="primary">Abrir ficha</button>` : `<button type="button" data-lot-widget-open class="primary">Abrir controle</button>`}</footer>`;
        lotWidget.querySelector("[data-lot-widget-close]")?.addEventListener("click", () => {
          pinnedLotWidgetId = "";
          lotWidget.hidden = true;
        });
        lotWidget.querySelector("[data-lot-widget-assistant]")?.addEventListener("click", () => {
          prepareAssistantLotStatusPromptV1(`Lote ${lotNumber}`);
        });
        lotWidget.querySelector("[data-lot-widget-open]")?.addEventListener("click", () => {
          if (match) {
            appStore.set({ view: "lot-detail", selectedLotDetailKey: match.label, lastAction: `Abriu a ficha do lote ${match.label} pelo mapa` });
            return;
          }
          this.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", { bubbles: true, composed: true, detail: { lotId, label: `Lote ${lotNumber}` } }));
        });
      };
      const showCommonAreaWidget = (position = {}, sourceId = "") => {
        const u = Math.max(0, Math.min(1, Number(position.u) || 0.5));
        const v = Math.max(0, Math.min(1, Number(position.v) || 0.5));
        commonAreaWidget.dataset.sourceId = sourceId;
        commonAreaWidget.style.left = `${(u * 100).toFixed(4)}%`;
        commonAreaWidget.style.top = `${(v * 100).toFixed(4)}%`;
        commonAreaWidget.style.setProperty("--map-context-widget-left", commonAreaWidget.style.left);
        commonAreaWidget.style.setProperty("--map-context-widget-top", commonAreaWidget.style.top);
        commonAreaWidget.hidden = false;
        commonAreaWidget.innerHTML = `<header><span class="activity-kind">ÁREA COMPARTILHADA</span><button type="button" data-common-area-widget-close aria-label="Fechar contexto da área comum">×</button></header><strong>${esc(MASTERPLAN_COMMON_AREA_LABEL_V1)}</strong><p>Use o assistente para consultar uso, manutenção, ocorrências ou planejamento desta área.</p><footer><button type="button" class="primary" data-common-area-widget-assistant>${ico("message-circle")} Perguntar à IA</button></footer>`;
        commonAreaWidget.querySelector("[data-common-area-widget-close]")?.addEventListener("click", () => {
          commonAreaWidget.hidden = true;
        });
        commonAreaWidget.querySelector("[data-common-area-widget-assistant]")?.addEventListener("click", () => {
          prepareAssistantMapAreaPromptV1(MASTERPLAN_COMMON_AREA_LABEL_V1);
        });
      };
      const scheduleLotWidgetHide = (lotId) => {
        clearTimeout(lotWidgetHideTimer);
        if (pinnedLotWidgetId === lotId) return;
        lotWidgetHideTimer = window.setTimeout(() => {
          if (pinnedLotWidgetId !== lotId) lotWidget.hidden = true;
        }, 180);
      };
      lotWidget.addEventListener("pointerenter", () => clearTimeout(lotWidgetHideTimer));
      lotWidget.addEventListener("pointerleave", () => scheduleLotWidgetHide(lotWidget.dataset.lot));
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
      const records = new Map(
        (Array.isArray(geo?.lots) ? geo.lots : []).map((row) => [
          String(row?.[0] || ""),
          row,
        ]),
      );
      const masterplanOverlay = surface.querySelector("[data-admin-masterplan-overlay]");
      let markerOverrides = {};
      try {
        const stored = JSON.parse(localStorage.getItem("belavista.map.lot-marker-overrides.v1") || "{}");
        markerOverrides = stored && typeof stored === "object" ? stored : {};
      } catch {}
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
      } = createSatelliteLotProjectionV1({
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
      const masterplanFrame = (() => {
        try {
          return { ...ADMIN_MASTERPLAN_SATELLITE_FRAME_V1, ...JSON.parse(this.dataset.adminMasterplanFrame || "{}") };
        } catch {
          return { ...ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 };
        }
      })();
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
      commonAreaPolygons.forEach(({ sourceId, projected }) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const center = projected.reduce(
          (total, point) => ({ u: total.u + point.u / projected.length, v: total.v + point.v / projected.length }),
          { u: 0, v: 0 },
        );
        path.setAttribute(
          "d",
          `${projected.map((point, index) => `${index ? "L" : "M"}${(point.u * 1000).toFixed(2)} ${(point.v * 1000).toFixed(2)}`).join(" ")} Z`,
        );
        path.dataset.commonAreaSource = sourceId;
        path.dataset.commonAreaUv = JSON.stringify(projected);
        path.classList.add("satellite-common-area-hit-area");
        path.style.pointerEvents = "auto";
        path.setAttribute("tabindex", "0");
        path.setAttribute("role", "button");
        path.setAttribute("aria-label", `Consultar ${MASTERPLAN_COMMON_AREA_LABEL_V1}`);
        const openCommonAreaContext = (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (this.classList.contains("is-admin-masterplan-editing")) return;
          commonAreaGroup.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
          polygonGroup.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
          markerLayer.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
          path.classList.add("is-selected");
          const position = masterplanMarkerPosition(center.u, center.v, masterplanFrame);
          this.dataset.selectedMapArea = MASTERPLAN_COMMON_AREA_LABEL_V1;
          this.dataset.selectedMapAreaSource = sourceId;
          surface.dataset.selectedMapArea = MASTERPLAN_COMMON_AREA_LABEL_V1;
          surface.dataset.selectedMapAreaSource = sourceId;
          showCommonAreaWidget(position, sourceId);
          prepareAssistantMapAreaPromptV1(MASTERPLAN_COMMON_AREA_LABEL_V1);
          appStore.set({ lastAction: `${MASTERPLAN_COMMON_AREA_LABEL_V1} selecionada no mapa` });
        };
        path.addEventListener("click", openCommonAreaContext);
        path.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") openCommonAreaContext(event);
        });
        commonAreaGroup.append(path);
      });
      let count = 0;
      projectedLots.forEach(({ lotId, projected, greenMapping }, lotIndex) => {
        const relativePolygon = usesNativeMasterplanPolygons
          ? projected
          : projected.map(point => ({
              u: (point.u - projectedBounds.minU) / (projectedBounds.maxU - projectedBounds.minU),
              v: (point.v - projectedBounds.minV) / (projectedBounds.maxV - projectedBounds.minV),
            }));
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute(
          "d",
          `${projected.map((point, index) => `${index ? "L" : "M"}${(point.u * 1000).toFixed(2)} ${(point.v * 1000).toFixed(2)}`).join(" ")} Z`,
        );
        path.dataset.lot = lotId;
        if (masterplanOverlay) {
          polygonGroup.removeAttribute("hidden");
          svg.removeAttribute("aria-hidden");
          path.dataset.lotUv = JSON.stringify(relativePolygon);
          path.dataset.lotSource = "pdf-reviewed-area";
          path.classList.add("satellite-lot-hit-area");
          // A associação PDF -> área verde já foi revisada no arquivo de
          // mapeamento. Portanto a área preenchida real do lote é clicável;
          // linhas brancas e projeções geométricas legadas continuam fora da
          // interação porque não entram em `projectedLots`.
          path.style.pointerEvents = "auto";
          path.setAttribute("tabindex", "0");
          path.setAttribute("role", "button");
          path.setAttribute("aria-label", `Consultar ${lotId.replace('_', ' ')}`);
          path.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            polygonGroup.querySelectorAll(".is-selected").forEach(node => node.classList.remove("is-selected"));
            markerLayer.querySelectorAll(".is-selected").forEach(node => node.classList.remove("is-selected"));
            path.classList.add("is-selected");
            markerLayer.querySelector(`[data-lot="${lotId}"]`)?.classList.add("is-selected");
            const lotNumber = String(lotId.match(/\d+/g)?.at(-1) || "").padStart(3, "0");
            const label = `Lote ${lotNumber || lotId.replace(/^Lote_?/, "")}`;
            this.dataset.selectedLot = lotId;
            this.dataset.selectedLotSource = "pdf-uv-hit-area";
            this.selectedLotIds = new Set([lotId]);
            surface.dataset.selectedLot = lotId;
            showLotWidget(lotId, markerLayer.querySelector(`[data-lot="${lotId}"]`), { pinned: true });
            prepareAssistantLotStatusPromptV1(label);
            path.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", { bubbles: true, composed: true, detail: { lotId, label } }));
            appStore.set({ lastAction: `${label} selecionado no mapa` });
          });
          path.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              path.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            }
          });
        }
        polygonGroup.append(path);

        if (markers || this._satelliteLotPlanRequestedMarkersV1) {
          // O centróide ponderado pela área fica dentro da geometria desenhada
          // na prancha PDF. A média simples dos vértices deslocava os números
          // em lotes de esquina e nos polígonos irregulares.
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
          const center = Math.abs(areaFactor) > 1e-9
            ? { u: centroidU / areaFactor, v: centroidV / areaFactor }
            : mean;
          let markerU = center.u;
          let markerV = center.v;
          const marker = document.createElement("button");
          marker.type = "button";
          marker.className = "satellite-lot-plan-marker";
          marker.dataset.lot = lotId;
          marker.dataset.lotSource = greenMapping
            ? "pdf-original-label"
            : usesCanonicalTraceMarkers
              ? "canonical-trace"
              : "pdf-green-mapping";
          // Nas faixas onde a escala inicial comprime dois lotes vizinhos,
          // preserva-se a ordem numérica da prancha para que o alvo visível
          // não seja trocado pelo último elemento inserido.
          marker.style.zIndex = String(1000 - lotIndex);
          if ((masterplanOverlay || hasOfficialPdfLabels) && projectedBounds.maxU > projectedBounds.minU && projectedBounds.maxV > projectedBounds.minV) {
            const canonicalMarker = canonicalTraceMarkerByLot.get(lotId);
            const officialMarker = officialMarkerByLot.get(lotId);
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
            marker.dataset.masterplanRelativeU = String(relativeU);
            marker.dataset.masterplanRelativeV = String(relativeV);
            const position = masterplanMarkerPosition(relativeU, relativeV, masterplanFrame);
            markerU = position.u;
            markerV = position.v;
          }
          const manualPosition = isPublicLeadsMap ? null : markerOverrides[lotId];
          if (
            manualPosition &&
            Number.isFinite(Number(manualPosition.u)) &&
            Number.isFinite(Number(manualPosition.v))
          ) {
            marker.dataset.mapAdjustU = String(manualPosition.u);
            marker.dataset.mapAdjustV = String(manualPosition.v);
            markerU = Number(manualPosition.u);
            markerV = Number(manualPosition.v);
          }
          marker.style.left = `${(markerU * 100).toFixed(4)}%`;
          marker.style.top = `${(markerV * 100).toFixed(4)}%`;
          const lotNumber = String(lotId.match(/\d+/g)?.at(-1) || "").padStart(3, "0");
          const label = `Lote ${lotNumber || lotId.replace(/^Lote_?/, "")}`;
          marker.dataset.lotNumber = lotNumber;
          marker.textContent = lotNumber;
          marker.setAttribute("aria-label", label);
          marker.title = label;
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
            markerLayer
              .querySelectorAll(".satellite-lot-plan-marker.is-selected")
              .forEach((node) => node.classList.remove("is-selected"));
            marker.classList.add("is-selected");
            polygonGroup.querySelectorAll(".is-selected").forEach(node => node.classList.remove("is-selected"));
            path.classList.add("is-selected");
            prepareAssistantLotStatusPromptV1(label);
            this.dataset.selectedLot = lotId;
            this.dataset.selectedLotSource = "pdf-trace-satellite";
            this.selectedLotIds = new Set([lotId]);
            this.dataset.selectedLotCount = "1";
            this.dataset.selectedLots = lotId;
            surface.dataset.selectedLot = lotId;
            surface.dataset.selectedLotSource = "pdf-trace-satellite";
            surface.dataset.selectedLotCount = "1";
            surface.dataset.selectedLots = lotId;
            showLotWidget(lotId, marker, { pinned: true });
            this.renderLotReservationPanel?.();
            marker.dispatchEvent(
              new CustomEvent("belavista:lot-marker-selected", {
                bubbles: true,
                composed: true,
                detail: { lotId, label },
              }),
            );
            appStore.set({ lastAction: `${label} selecionado no mapa` });
          });
          markerLayer.append(marker);
        }
        count++;
      });

      // Todos os números conferidos no PDF permanecem visíveis. Quando a
      // segmentação não cobre um lote, sua âncora vem do círculo original,
      // sem associar a ele o polígono de outro lote.
      if ((markers || this._satelliteLotPlanRequestedMarkersV1) && (usesGreenLotMapping || usesCanonicalTraceMarkers)) {
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
            const marker = document.createElement("button");
            const lotNumber = String(lotId.match(/\d+/g)?.at(-1) || "").padStart(3, "0");
            const label = `Lote ${lotNumber || lotId.replace(/^Lote_?/, "")}`;
            const position = masterplanMarkerPosition(relative.u, relative.v, masterplanFrame);
            const manualPosition = isPublicLeadsMap ? null : markerOverrides[lotId];
            const markerU = Number.isFinite(Number(manualPosition?.u)) ? Number(manualPosition.u) : position.u;
            const markerV = Number.isFinite(Number(manualPosition?.v)) ? Number(manualPosition.v) : position.v;
            marker.type = "button";
            marker.className = "satellite-lot-plan-marker";
            marker.dataset.lot = lotId;
            marker.dataset.lotSource = usesGreenLotMapping ? "pdf-circle-only" : "canonical-trace-fallback";
            marker.dataset.masterplanRelativeU = String(relative.u);
            marker.dataset.masterplanRelativeV = String(relative.v);
            marker.dataset.lotNumber = lotNumber;
            if (Number.isFinite(Number(manualPosition?.u)) && Number.isFinite(Number(manualPosition?.v))) {
              marker.dataset.mapAdjustU = String(manualPosition.u);
              marker.dataset.mapAdjustV = String(manualPosition.v);
            }
            marker.style.zIndex = String(720 - fallbackIndex);
            marker.style.left = `${(markerU * 100).toFixed(4)}%`;
            marker.style.top = `${(markerV * 100).toFixed(4)}%`;
            marker.textContent = lotNumber;
            marker.setAttribute("aria-label", label);
            marker.title = usesGreenLotMapping ? `${label} · posição conferida no PDF` : `${label} · contorno recuperado da geometria oficial`;
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
              markerLayer.querySelectorAll(".satellite-lot-plan-marker.is-selected").forEach((node) => node.classList.remove("is-selected"));
              polygonGroup.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
              marker.classList.add("is-selected");
              prepareAssistantLotStatusPromptV1(label);
              this.dataset.selectedLot = lotId;
              this.dataset.selectedLotSource = marker.dataset.lotSource;
              this.selectedLotIds = new Set([lotId]);
              this.dataset.selectedLotCount = "1";
              this.dataset.selectedLots = lotId;
              surface.dataset.selectedLot = lotId;
              surface.dataset.selectedLotSource = marker.dataset.lotSource;
              surface.dataset.selectedLotCount = "1";
              surface.dataset.selectedLots = lotId;
              showLotWidget(lotId, marker, { pinned: true });
              this.renderLotReservationPanel?.();
              marker.dispatchEvent(new CustomEvent("belavista:lot-marker-selected", {
                bubbles: true,
                composed: true,
                detail: { lotId, label },
              }));
              appStore.set({ lastAction: `${label} selecionado no mapa` });
            });
            markerLayer.append(marker);
            count++;
          });
      }

      const syncFit = () => {
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const side = Math.max(rect.width, rect.height);
        fit.style.width = `${side}px`;
        fit.style.height = `${side}px`;
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
        const mapZoom = Math.max(
          0.92,
          Number(requestedZoom) ||
            Number.parseFloat(this.style.getPropertyValue("--static-map-zoom")) ||
            dataZoom ||
            1,
        );
        // A referência é a menor dimensão visível do mapa. Em telas pequenas
        // o cartão reduz antes de ocupar a leitura do lote; em desktops, fica
        // no máximo com 80% de seu tamanho-base na tela.
        const viewportScale = Math.max(
          0.52,
          Math.min(0.8, Math.min(rect.width / 1180, rect.height / 760)),
        );
        const widgetScale = Math.max(0.18, Math.min(0.9, viewportScale / mapZoom));
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
      this._satelliteLotPlanOverlayV1 = layer;
      this.syncAdminMasterplanLotMarkersV1 = () => {
        let frame = { ...ADMIN_MASTERPLAN_SATELLITE_FRAME_V1 };
        try {
          frame = { ...frame, ...JSON.parse(this.dataset.adminMasterplanFrame || "{}") };
        } catch {}
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
          path.setAttribute("d", points.map((point, index) => {
            const position = masterplanMarkerPosition(point.u, point.v, frame);
            return `${index ? 'L' : 'M'}${position.u * 1000} ${position.v * 1000}`;
          }).join(' ') + ' Z');
        });
        commonAreaGroup.querySelectorAll("[data-common-area-uv]").forEach(path => {
          const points = JSON.parse(path.dataset.commonAreaUv);
          path.setAttribute("d", points.map((point, index) => {
            const position = masterplanMarkerPosition(point.u, point.v, frame);
            return `${index ? 'L' : 'M'}${position.u * 1000} ${position.v * 1000}`;
          }).join(' ') + ' Z');
        });
        visualRecoveryGroup.querySelectorAll("[data-lot-visual-outline-uv]").forEach(path => {
          const points = JSON.parse(path.dataset.lotVisualOutlineUv);
          path.setAttribute("d", points.map((point, index) => {
            const position = masterplanMarkerPosition(point.u, point.v, frame);
            return `${index ? 'L' : 'M'}${position.u * 1000} ${position.v * 1000}`;
          }).join(' ') + ' Z');
        });
      };
      this.syncAdminMasterplanLotMarkersV1();
      svg.addEventListener("click", (event) => {
        if (event.defaultPrevented || this.classList.contains("is-admin-masterplan-editing")) return;
        if (event.target.closest(".satellite-lot-hit-area,.satellite-common-area-hit-area")) return;
        const rect = fit.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const position = {
          u: (event.clientX - rect.left) / rect.width,
          v: (event.clientY - rect.top) / rect.height,
        };
        if (position.u < 0 || position.u > 1 || position.v < 0 || position.v > 1) return;
        commonAreaGroup.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
        showCommonAreaWidget(position, "map-background");
        prepareAssistantMapAreaPromptV1(MASTERPLAN_COMMON_AREA_LABEL_V1);
        appStore.set({ lastAction: `${MASTERPLAN_COMMON_AREA_LABEL_V1} selecionada no mapa` });
      });
      this.dataset.satelliteLotPlan = usesNativeMasterplanPolygons
        ? `${count} polígonos UV do masterplan · alinhados à arte v2`
        : `${count} polígonos PDF · ${PDF_LOT_TRACE_SATELLITE_ALIGNMENT_V1}`;
      this.dataset.satelliteLotMarkers = (markers || this._satelliteLotPlanRequestedMarkersV1) ? String(count) : "delegados à camada pública";
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
