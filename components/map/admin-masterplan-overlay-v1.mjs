/** Install the calibrated original-PDF overlay lifecycle on the shared map. */
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
    if (this.querySelector("[data-admin-masterplan-overlay]")) return true;

    const layer = document.createElement("div");
    layer.className = "admin-masterplan-overlay";
    layer.dataset.adminMasterplanOverlay = "true";
    layer.setAttribute("aria-hidden", "false");
    layer.innerHTML = `<div class="admin-masterplan-fit"><div class="admin-masterplan-transform" data-admin-masterplan-transform><img src="${artwork.url}" data-masterplan-original-pdf alt="Planta original do loteamento, com todos os preenchimentos e divisões do PDF"></div></div>`;
    this.append(layer);
    const fit = layer.querySelector(".admin-masterplan-fit");
    const transform = layer.querySelector("[data-admin-masterplan-transform]");
    const image = transform.querySelector('[data-masterplan-original-pdf]');
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
      fit.style.left = `${(rect.width - side) / 2}px`;
      fit.style.top = `${(rect.height - side) / 2}px`;
      const frame = readFrame();
      fit.style.setProperty("--masterplan-left", `${frame.left * 100}%`);
      fit.style.setProperty("--masterplan-top", `${frame.top * 100}%`);
      fit.style.setProperty("--masterplan-width", `${frame.width * 100}%`);
      fit.style.setProperty("--masterplan-height", `${frame.height * 100}%`);
      fit.style.setProperty("--masterplan-rotation", `${Number(frame.rotation || 0)}deg`);
      const imageRect = masterplanPdfImageRect(side * frame.width, side * frame.height);
      Object.assign(image.style, {
        inset: "auto", objectFit: "fill",
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
    this.installAdminMasterplanDevToolsV1({ layer, fit, transform, defaultFrame, frameStorageKey, readFrame, sync });
    this.fitStaticSatelliteMasterplanV1?.();
    return true;
  };
};
