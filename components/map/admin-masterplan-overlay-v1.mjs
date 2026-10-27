/** Install the calibrated original-PDF overlay lifecycle on the shared map. */
import { mapMasterplanArtworkSourceV1 } from "./map-asset-profile-v1.mjs?v=pdf-map-assets-v3&ts-map-asset-profile-owner-v1";
import { atlasAdminMasterplanOverlayPolicy, createAtlasAdminMasterplanZoomControllerV1, installAtlasAdminMasterplanOverlayV1 } from "../../dist/frontend/components.js";

const installAdminMasterplanOverlayLegacyV1 = (MapScene, {
  artwork,
  defaultFrame: defaultFrameV1,
  masterplanPdfImageRect,
  document: documentRef = globalThis.document,
  localStorage: localStorageRef = globalThis.localStorage,
  ResizeObserver: ResizeObserverRef = globalThis.ResizeObserver,
  MutationObserver: MutationObserverRef = globalThis.MutationObserver,
  browser: browserRef = globalThis,
} = {}) => {
  if (!MapScene?.prototype) throw new TypeError("Masterplan overlay requires MapScene.prototype.");
  if (!artwork || typeof artwork.url !== "string" || !artwork.url)
    throw new TypeError("Masterplan overlay requires the original artwork URL.");
  if (!defaultFrameV1 || typeof defaultFrameV1 !== "object" || Array.isArray(defaultFrameV1))
    throw new TypeError("Masterplan overlay requires the calibrated default frame.");
  if (typeof masterplanPdfImageRect !== "function")
    throw new TypeError("Masterplan overlay requires masterplanPdfImageRect().");
  if (!documentRef?.createElement) throw new TypeError("Masterplan overlay requires document.createElement().");
  if (!localStorageRef || typeof localStorageRef.getItem !== "function")
    throw new TypeError("Masterplan overlay requires localStorage.getItem().");
  if (typeof ResizeObserverRef !== "function")
    throw new TypeError("Masterplan overlay requires ResizeObserver().");

  const document = documentRef, localStorage = localStorageRef, ResizeObserver = ResizeObserverRef;
  MapScene.prototype.installAdminMasterplanOverlayV1 = function () {
    if (
      !this.isAdminStandalone3DV5370?.() &&
      !this.isAdminPublicMapV1?.() &&
      !this.hasAttribute?.("data-admin-shared-public-map")
    )
      return false;
    const surface = document.body.classList.contains("public-leads-page")
      ? this.closest(".public-map-sticky") || this
      : this;
    if (surface.querySelector("[data-admin-masterplan-overlay]")) return true;

    const layer = document.createElement("div");
    layer.className = "admin-masterplan-overlay";
    layer.dataset.adminMasterplanOverlay = "true";
    layer.setAttribute("aria-hidden", "false");
    const initialArtworkUrl = mapMasterplanArtworkSourceV1({
      artworkUrl: artwork.url,
      browser: browserRef,
    });
    const detailArtworkUrl = mapMasterplanArtworkSourceV1({
      artworkUrl: artwork.url,
      detailZoom: true,
      browser: browserRef,
    });
    layer.innerHTML = `<div class="admin-masterplan-fit"><div class="admin-masterplan-transform" data-admin-masterplan-transform><img src="${initialArtworkUrl}" data-masterplan-original-pdf alt="" hidden><canvas data-masterplan-canvas role="img" aria-label="Planta original do loteamento"></canvas><svg class="admin-masterplan-labels" data-masterplan-labels viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"></svg></div></div>`;
    surface.append(layer);
    const fit = layer.querySelector(".admin-masterplan-fit");
    const transform = layer.querySelector("[data-admin-masterplan-transform]");
    const image = transform.querySelector('[data-masterplan-original-pdf]');
    const canvas = transform.querySelector('[data-masterplan-canvas]');
    const labelsLayer = transform.querySelector('[data-masterplan-labels]');
    const legacyAspect = artwork.legacyHeight / artwork.legacyWidth;
    labelsLayer?.setAttribute("viewBox", `0 0 1000 ${1000 * legacyAspect}`);
    labelsLayer?.setAttribute("preserveAspectRatio", "xMidYMid meet");
    image.decoding = "async";
    let labels = [];
    const paint = () => {
      if (!image.naturalWidth || !canvas) return false;
      // Keep as many source pixels as the loaded raster provides. Mobile starts
      // light, then upgrades to the original PDF raster on detail zoom.
      const width = Math.min(8192, image.naturalWidth);
      const height = Math.round(width * image.naturalHeight / image.naturalWidth);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) return false;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      canvas.dataset.masterplanCanvasReady = "true";
      canvas.dataset.masterplanLotLabels = String(labels.length);
      return true;
    };
    image.addEventListener("load", paint);
    if (image.complete && image.naturalWidth) paint();
    this.paintMasterplanLotLabelsV1 = (entries) => {
      labels = Array.isArray(entries) ? entries : [];
      // As áreas vêm do mapeamento revisado PDF → polígono e devem aparecer
      // nas duas superfícies que usam esta planta: /leads e /admin.
      const renderVectorAreas = true;
      const legacy = masterplanPdfImageRect(artwork.legacyWidth, artwork.legacyHeight);
      if (labelsLayer && legacy.width > 0 && legacy.height > 0) {
        labelsLayer.replaceChildren(...labels.map((label) => {
          const x = ((label.u * artwork.legacyWidth - legacy.left) / legacy.width) * 100;
          const y = ((label.v * artwork.legacyHeight - legacy.top) / legacy.height) * 100;
          if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) return null;
          const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
          group.classList.add("admin-masterplan-lot-label-group");
          if (label.lotId) group.setAttribute("data-lot-id", String(label.lotId));
          const mask = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          mask.classList.add("admin-masterplan-lot-mask");
          mask.setAttribute("x", String(x * 10 - 8));
          mask.setAttribute("y", String(y * 10 * legacyAspect - 8));
          mask.setAttribute("width", "16");
          mask.setAttribute("height", "16");
          mask.setAttribute("data-lot-number", String(label.number ?? ""));
          const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
          node.classList.add("admin-masterplan-lot-number");
          node.setAttribute("x", String(x * 10));
          node.setAttribute("y", String(y * 10 * legacyAspect));
          node.setAttribute("text-anchor", "middle");
          node.setAttribute("dominant-baseline", "central");
          node.setAttribute("data-lot-number", String(label.number ?? ""));
          const number = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
          number.classList.add("admin-masterplan-lot-number-value");
          number.setAttribute("x", String(x * 10));
          number.textContent = String(label.number ?? "");
          node.append(number);
          group.append(mask, node);
          const areaM2 = Number(label.areaM2);
          if (renderVectorAreas && Number.isFinite(areaM2) && areaM2 > 0) {
            const area = document.createElementNS("http://www.w3.org/2000/svg", "text");
            area.classList.add("admin-masterplan-lot-area-value");
            area.setAttribute("x", String(x * 10));
            area.setAttribute("y", String(y * 10 * legacyAspect + 15));
            area.setAttribute("text-anchor", "middle");
            area.setAttribute("dominant-baseline", "central");
            area.setAttribute("data-area-m2", String(areaM2));
            area.textContent = `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(areaM2)} m²`;
            group.append(area);
          }
          return group;
        }).filter(Boolean));
      }
      return paint();
    };
    const defaultFrame = { ...defaultFrameV1 };
    const frameStorageKey = atlasAdminMasterplanOverlayPolicy.frameStorageKey;
    const calibrationStorage = globalThis.belavistaPublicMapCalibrationStorage;
    let savedFrame = calibrationStorage?.readFrame(frameStorageKey, defaultFrame);
    if (!savedFrame) {
      try {
        const value = JSON.parse(localStorage.getItem(frameStorageKey) || "{}");
        savedFrame = value && typeof value === "object" ? { ...defaultFrame, ...value } : { ...defaultFrame };
      } catch { savedFrame = { ...defaultFrame }; }
    }
    this.dataset.adminMasterplanFrame = JSON.stringify(savedFrame);
    const readFrame = () => {
      const typedFrame = globalThis.belavistaPublicMapFrameFromOverrides?.(defaultFrame, this.dataset.adminMasterplanFrame || "{}");
      if (typedFrame) return typedFrame;
      try {
        const stored = JSON.parse(this.dataset.adminMasterplanFrame || "{}");
        return Object.fromEntries(
          Object.entries(defaultFrame).map(([key, value]) => [
            key,
            Number.isFinite(Number(stored[key])) ? Number(stored[key]) : value,
          ]),
        );
      } catch {
        return { ...defaultFrame };
      }
    };
    const sync = () => {
      const rect = this.getBoundingClientRect();
      if (!fit || !rect.width || !rect.height) return;
      // A base satélite é renderizada como `cover`: o quadro de referência
      // continua quadrado, centralizado e eventualmente recortado. A planta
      // usa o mesmo quadro para preservar a calibração do mapa.
      const side = Math.max(rect.width, rect.height);
      fit.style.width = `${side}px`;
      fit.style.height = `${side}px`;
      fit.style.maxWidth = "none";
      fit.style.maxHeight = "none";
      fit.style.left = `${(rect.width - side) / 2}px`;
      fit.style.top = `${(rect.height - side) / 2}px`;
      const frame = readFrame();
      fit.style.setProperty("--masterplan-left", `${frame.left * 100}%`);
      fit.style.setProperty("--masterplan-top", `${frame.top * 100}%`);
      fit.style.setProperty("--masterplan-width", `${frame.width * 100}%`);
      fit.style.setProperty("--masterplan-height", `${frame.height * 100}%`);
      fit.style.setProperty("--masterplan-rotation", `${Number(frame.rotation || 0)}deg`);
      const imageRect = masterplanPdfImageRect(side * frame.width, side * frame.height);
      Object.assign(canvas.style, {
        inset: "auto",
        left: `${imageRect.left}px`, top: `${imageRect.top}px`,
        width: `${imageRect.width}px`, height: `${imageRect.height}px`,
      });
      Object.assign(labelsLayer.style, {
        left: `${imageRect.left}px`, top: `${imageRect.top}px`,
        width: `${imageRect.width}px`, height: `${imageRect.height}px`,
      });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(this);
    const syncDetailZoom = createAtlasAdminMasterplanZoomControllerV1({
      scene: this,
      labelsLayer,
      image,
      detailArtworkUrl,
      hasLoadedDetailArtwork: initialArtworkUrl === detailArtworkUrl,
      isPublicLeadsMap: document.body?.classList.contains("public-leads-page") === true,
      paint,
    });
    syncDetailZoom();
    if (typeof MutationObserverRef === "function") {
      const zoomObserver = new MutationObserverRef(syncDetailZoom);
      zoomObserver.observe(this, {
        attributes: true,
        attributeFilter: ["data-scene-zoom", "data-static-map-zoom"],
      });
      this._adminMasterplanZoomObserverV1?.disconnect?.();
      this._adminMasterplanZoomObserverV1 = zoomObserver;
    }
    this._adminMasterplanOverlayObserverV1 = observer;
    this.dataset.adminMasterplanOverlay = "true";
    this.dataset.adminMasterplanAsset =
      "alianca-park-masterplan-lot-overlay-v3.webp · original PDF pixels · outside-perimeter alpha only";
    if (!this.hasAttribute("data-public-static-only"))
      this.installAdminMasterplanDevToolsV1({ layer, fit, transform, defaultFrame, frameStorageKey, readFrame, sync });
    this.fitStaticSatelliteMasterplanV1?.();
    return true;
  };
};

/** Prefer TypeScript for the map overlay; preserve the original implementation as fallback. */
export const installAdminMasterplanOverlayV1 = (MapScene, options = {}) => {
  const { artwork, defaultFrame, masterplanPdfImageRect } = options;
  if (artwork && typeof artwork.url === "string" && artwork.url) {
    const browser = options.browser || globalThis;
    const initialArtworkUrl = mapMasterplanArtworkSourceV1({ artworkUrl: artwork.url, browser });
    const detailArtworkUrl = mapMasterplanArtworkSourceV1({ artworkUrl: artwork.url, detailZoom: true, browser });
    const installed = installAtlasAdminMasterplanOverlayV1?.(MapScene, {
      artwork,
      initialArtworkUrl,
      detailArtworkUrl,
      defaultFrame,
      document: options.document,
      ResizeObserver: options.ResizeObserver,
      MutationObserver: options.MutationObserver,
    }) === true;
    if (installed) return true;
  }
  return installAdminMasterplanOverlayLegacyV1(MapScene, options);
};
