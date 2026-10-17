/** Install the calibrated original-PDF overlay lifecycle on the shared map. */
import { mapMasterplanArtworkSourceV1 } from "./map-asset-profile-v1.mjs";

export const installAdminMasterplanOverlayV1 = (MapScene, {
  artwork,
  defaultFrame: defaultFrameV1,
  masterplanPdfImageRect,
  document: documentRef = globalThis.document,
  localStorage: localStorageRef = globalThis.localStorage,
  ResizeObserver: ResizeObserverRef = globalThis.ResizeObserver,
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
      !this.isAdminPublicMapV1?.()
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
    const artworkUrl = mapMasterplanArtworkSourceV1({
      artworkUrl: artwork.url,
      isPublicLeadsPage: document.body.classList.contains("public-leads-page"),
      browser: globalThis,
    });
    layer.innerHTML = `<div class="admin-masterplan-fit"><div class="admin-masterplan-transform" data-admin-masterplan-transform><img src="${artworkUrl}" data-masterplan-original-pdf alt="" hidden><canvas data-masterplan-canvas role="img" aria-label="Planta original do loteamento com número e metragem dos lotes"></canvas></div></div>`;
    surface.append(layer);
    const fit = layer.querySelector(".admin-masterplan-fit");
    const transform = layer.querySelector("[data-admin-masterplan-transform]");
    const image = transform.querySelector('[data-masterplan-original-pdf]');
    const canvas = transform.querySelector('[data-masterplan-canvas]');
    image.decoding = "async";
    let labels = [];
    const paint = () => {
      if (!image.naturalWidth || !canvas) return false;
      const width = Math.min(3072, image.naturalWidth);
      const height = Math.round(width * image.naturalHeight / image.naturalWidth);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) return false;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const legacy = masterplanPdfImageRect(artwork.legacyWidth, artwork.legacyHeight);
      if (legacy.width > 0 && legacy.height > 0) {
        const scaleX = width / legacy.width;
        const scaleY = height / legacy.height;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        for (const label of labels) {
          const x = (label.u * artwork.legacyWidth - legacy.left) * scaleX;
          const y = (label.v * artwork.legacyHeight - legacy.top) * scaleY;
          if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > width || y < 0 || y > height) continue;
          const unit = width / 2048;
          context.font = `700 ${Math.max(9, Math.round(12 * unit))}px sans-serif`;
          context.lineWidth = 2.5 * unit;
          context.strokeStyle = "rgba(4, 26, 16, .92)";
          context.fillStyle = "#fff";
          context.strokeText(label.number, x, y - 5 * unit);
          context.fillText(label.number, x, y - 5 * unit);
          if (label.areaM2 != null) {
            context.font = `600 ${Math.max(6, Math.round(8 * unit))}px sans-serif`;
            context.lineWidth = 2 * unit;
            const area = `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(label.areaM2)} m²`;
            context.strokeText(area, x, y + 5 * unit);
            context.fillText(area, x, y + 5 * unit);
          }
        }
      }
      canvas.dataset.masterplanCanvasReady = "true";
      canvas.dataset.masterplanLotLabels = String(labels.length);
      return true;
    };
    image.addEventListener("load", paint);
    if (image.complete && image.naturalWidth) paint();
    this.paintMasterplanLotLabelsV1 = (entries) => {
      labels = Array.isArray(entries) ? entries : [];
      return paint();
    };
    const defaultFrame = { ...defaultFrameV1 };
    const frameStorageKey = "belavista.map.masterplan-frame.v1";
    let savedFrame = {};
    try {
      const value = JSON.parse(localStorage.getItem(frameStorageKey) || "{}");
      savedFrame = value && typeof value === "object" ? value : {};
    } catch {}
    this.dataset.adminMasterplanFrame = JSON.stringify({ ...defaultFrame, ...savedFrame });
    const readFrame = () => {
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
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(this);
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
