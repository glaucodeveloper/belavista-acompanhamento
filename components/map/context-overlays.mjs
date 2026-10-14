export const installMapSceneContextExtensionsV1 = (dependencies) => {
  const {
    MapScene,
    appStore,
    demoData,
    publishMapPreview,
    normalizeStageOverlayKeysV1,
    blendStageOverlayColorV1,
    dashboardModeKeyV1,
    dashboardFilterForModeV1,
    stageOverlayLabelV1,
    syncCompactMapMirrors,
    notify,
    getSharedMapScene,
  } = dependencies;

MapScene.prototype.setMapContext = function (view) {
  this.dataset.mapContext = view;
  this.dataset.dashboardProgressMap =
    view === "assistant" || view === "map" ? "enabled" : "available";
  this.dataset.recordPolygonSelection =
    view === "records" ? "enabled" : "available";
  this.dataset.sharedMapContract = "public-scene · administrative-extensions";
  const state = appStore.get();
  // O painel de registros lê a mesma cena, mas troca a camada temática de
  // etapa pela camada de status dos registros. A barra inferior é somente um
  // seletor de resumo e não deve pintar ou selecionar polígonos no mapa.
  if (view === "records") {
    if (this.stageOverlayKey) this.clearStageOverlay(false);
  } else if ((view === "assistant" || view === "map") && this.modelReady) {
    const stage = demoData.activities.find(
      (item) => item.id === state.selectedStage,
    );
    if (stage) this.setStageOverlay(stage.name, false);
  }
  const badge = this.querySelector(".map-badge"),
    category = this.querySelector(".map-category-switcher"),
    legend = this.querySelector(".map-gesture-legend"),
    solar = this.querySelector(".map-solar-control");
  // O painel continua disponível no mapa administrativo para calibração fina
  // de inclinação, zoom, pan e rotação. A interface de impressão o esconde via
  // CSS; vistas sem mapa interativo apenas o deixam oculto.
  const controls = this.querySelector(".map-rotation-controls");
  const interactiveMapViews = new Set(["assistant", "map", "records", "leads"]);
  if (controls) controls.hidden = !interactiveMapViews.has(view);
  if (solar)
    solar.hidden = !["assistant", "map", "records", "leads"].includes(view);
  if (category) category.hidden = !interactiveMapViews.has(view);
  if (legend)
    legend.hidden = !["assistant", "map", "records", "leads"].includes(view);
  if (badge) {
    badge.hidden = !["assistant", "map", "records", "leads"].includes(view);
    const label = badge.querySelector("span");
    const contextLabel =
        view === "records"
          ? "Pintura de progresso · use o formulário do registro"
          : view === "leads"
            ? "Mapa comercial · OpenStreet + lotes 3D"
            : view === "assistant" || view === "map"
              ? "Consulta de status · arraste para selecionar"
              : "Mapa contextual";
    // O observer legado reaplica o contexto após alterações do DOM.
    // Evite produzir outra mutação quando a legenda já está sincronizada.
    if (label && label.textContent !== contextLabel) label.textContent = contextLabel;
  }
};
MapScene.prototype.centerSceneInContext = function () {
  if (this._contextSceneRefreshPending) return;
  this._contextSceneRefreshPending = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      this._contextSceneRefreshPending = false;
      const host = this.querySelector(".map-host");
      const width = Math.max(1, Math.round(host?.clientWidth || 0));
      const height = Math.max(1, Math.round(host?.clientHeight || 0));
      const key = `${width}x${height}`;
      if (this._lastContextSceneSize === key) {
        this.renderer?.render?.(this.scene, this.camera);
        return;
      }
      this._lastContextSceneSize = key;
      this.map?.invalidateSize?.({ pan: false, debounceMoveend: true });
      this.syncThree?.();
      this.renderer?.render?.(this.scene, this.camera);
      publishMapPreview();
    });
  });
};

// BELAVISTA_3D_LOOP_BREAKER_V5366
const __belavistaSyncThreeV5366 = MapScene.prototype.syncThree;
MapScene.prototype.syncThree = function (...args) {
  const stats = (globalThis.__BELAVISTA_3D_LOOP_GUARD__ ??= {
    version: "5.3.66",
    syncCalls: 0,
    syncDroppedReentrant: 0,
    syncDroppedBurst: 0,
    compactCalls: 0,
    compactDroppedReentrant: 0,
    startedAt: performance.now(),
  });

  stats.syncCalls++;

  if (this._syncThreeBusyV5366) {
    stats.syncDroppedReentrant++;
    this.dataset.syncThreeGuard = "reentrant-dropped";
    return;
  }

  const now = performance.now();
  if (this._lastSyncThreeV5366 && now - this._lastSyncThreeV5366 < 24) {
    stats.syncDroppedBurst++;
    this.dataset.syncThreeGuard = "burst-dropped";
    return;
  }

  this._lastSyncThreeV5366 = now;
  this._syncThreeBusyV5366 = true;
  try {
    return __belavistaSyncThreeV5366.apply(this, args);
  } finally {
    this._syncThreeBusyV5366 = false;
  }
};

const __belavistaRenderSharedMapV5366 = MapScene.prototype.renderSharedMap;
MapScene.prototype.renderSharedMap = function (...args) {
  const stats = (globalThis.__BELAVISTA_3D_LOOP_GUARD__ ??= {
    version: "5.3.66",
    syncCalls: 0,
    syncDroppedReentrant: 0,
    syncDroppedBurst: 0,
    compactCalls: 0,
    compactDroppedReentrant: 0,
    startedAt: performance.now(),
  });

  stats.compactCalls++;

  if (this._compactRenderBusyV5366) {
    stats.compactDroppedReentrant++;
    this.dataset.compactRenderGuard = "reentrant-dropped";
    return;
  }

  const now = performance.now();
  if (this._lastCompactRenderV5366 && now - this._lastCompactRenderV5366 < 33) {
    this.dataset.compactRenderGuard = "burst-dropped";
    return;
  }

  this._lastCompactRenderV5366 = now;
  this._compactRenderBusyV5366 = true;
  try {
    return __belavistaRenderSharedMapV5366.apply(this, args);
  } finally {
    this._compactRenderBusyV5366 = false;
  }
};

// Multi-camada do mapa operacional: a cena continua compartilhada, mas cada
// filtro mantém sua própria cor. Quando um polígono pertence a mais de uma
// etapa, as cores são mescladas para deixar a interseção visível.
MapScene.prototype.applyStageOverlaySetV1 = function (value = []) {
  const keys = normalizeStageOverlayKeysV1(value);
  const all = this.activityMapStandaloneParts?.length
    ? this.activityMapStandaloneParts.filter(Boolean)
    : [
        ...(this.modelParts?.lots || []),
        ...(this.modelParts?.streets || []),
        ...(this.modelParts?.other || []),
      ];
  if (!all.length) return;
  if (
    !this.stageOverlayTargets ||
    !Object.keys(this.stageOverlayTargets).length
  ) {
    if (this.activityMapStandaloneParts?.length)
      this.buildAdminStandaloneStageOverlayTargetsV5370?.();
    else this.buildStageOverlayTargets?.();
  }
  const targetSets = new Map(
    keys.map((key) => [key, new Set(this.stageOverlayTargets?.[key] || [])]),
  );
  let highlighted = 0;
  for (const item of all) {
    if (!item?.material) continue;
    if (
      !item.userData.__mapOverlayBaseMaterial &&
      !item.userData.overlayMaterial
    ) {
      item.userData.__mapOverlayBaseMaterial = this.stageBaseMaterial(item);
    }
    const base =
      item.userData.__mapOverlayBaseMaterial || this.stageBaseMaterial(item);
    item.material = base;
    delete item.userData.overlayMaterial;
    const matches = keys.filter((key) => targetSets.get(key)?.has(item));
    item.userData.overlayKeys = matches;
    if (!matches.length) continue;
    highlighted++;
    const color = blendStageOverlayColorV1(matches);
    item.userData.overlayMaterial = this.stageOverlayMaterial(
      item,
      matches[0],
      color,
    );
    item.material = item.userData.overlayMaterial;
  }
  const color = blendStageOverlayColorV1(keys);
  this.dataset.overlayTargets = String(highlighted);
  this.dataset.highlightTargets = String(highlighted);
  this.dataset.overlayLayerCount = String(keys.length);
  this.dataset.overlayColor = `#${color.toString(16).padStart(6, "0")}`;
  this.dataset.overlayTransition = keys.length ? "entering" : "exiting";
  this.dataset.overlayTransitionKey = keys.join(",") || "none";
  this.dataset.overlayTransitionProgress = "100";
  this._adminStandaloneRendererV5370?.render?.(
    this._adminStandaloneSceneV5370,
    this._adminStandaloneCameraV5370,
  );
  this.renderer?.render?.(this.scene, this.camera);
  this.dataset.overlayTransition = "settled";
};

// Highlights comerciais e sociais usam os próprios polígonos canônicos do
// GLB. A cor não altera o documento: apenas pinta temporariamente a malha
// correspondente ao widget ativo.
const dashboardLotHighlightV1 = {
  "commercial-leads": { statuses: ["lead"], color: 0x4589ff },
  "commercial-contracts": { statuses: ["reserved", "installments", "paid"] },
  "commercial-lots": { statuses: ["lead", "reserved", "installments", "paid"] },
  "commercial-reservations": { statuses: ["reserved"], color: 0xf1c21b },
  "commercial-installments": { statuses: ["installments"], color: 0xf08b2d },
  "commercial-paid": { statuses: ["paid"], color: 0x42be65 },
  "social-instagram": { statuses: ["lead"], color: 0x9b7cff },
  "social-personal": { statuses: ["lead", "reserved", "installments", "paid"] },
  "social-clients": { statuses: ["reserved", "installments", "paid"] },
  "social-brokers": { statuses: ["lead", "reserved"] },
  "social-staff-operating": { staffStatus: "operating", color: 0x24a148 },
  "social-staff-services": { staffStatus: "services", color: 0x4589ff },
  "social-staff-planned": { staffStatus: "planned", color: 0xf1c21b },
};
const dashboardLotPartsV1 = (scene) => {
  const canonical = scene.canonicalPublicLotParts?.() || [];
  if (canonical.length) return canonical;
  return (
    scene.activityMapStandaloneParts ||
    scene.physicalMapParts?.() ||
    []
  ).filter((item) => item?.userData?.partKind === "lots");
};
const dashboardLotIdV1 = (lot) =>
  String(lot?.userData?.partId || lot?.name || "");
const dashboardLotKeyV1 = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
const dashboardLotMatchesV1 = (item, lotKey) => {
  const candidate = dashboardLotKeyV1(
    item?.lot || item?.lotId || item?.partId || item?.property || "",
  );
  if (!candidate || !lotKey) return false;
  if (
    candidate === lotKey ||
    candidate.includes(lotKey) ||
    lotKey.includes(candidate)
  )
    return true;
  const candidateDigits = candidate.match(/\d+/g)?.join(""),
    lotDigits = lotKey.match(/\d+/g)?.join("");
  return Boolean(candidateDigits && lotDigits && candidateDigits === lotDigits);
};
const dashboardLotStatusV1 = (scene, lot, index) => {
  if (!lot.userData.dashboardStaffStatus)
    lot.userData.dashboardStaffStatus = ["operating", "services", "planned"][
      index % 3
    ];
  const state = appStore.get(),
    id = dashboardLotKeyV1(dashboardLotIdV1(lot));
  const sales = [
      ...(state.commercialSales || []),
      ...(state.publicReservations || []),
    ],
    sale = sales.find((item) => dashboardLotMatchesV1(item, id));
  const leads = Array.isArray(state.publicLeads) ? state.publicLeads : [],
    lead = leads.find((item) => dashboardLotMatchesV1(item, id));
  const saleStatus = String(sale?.status || "").toLowerCase();
  const payment = String(sale?.payment || sale?.notes || "").toLowerCase();
  const publicStatus = String(
    lot.userData.publicCommercialStatus || "",
  ).toLowerCase();
  const modelStatus =
    {
      available: "lead",
      negotiation: "lead",
      reserved: "reserved",
      sold: "paid",
    }[publicStatus] || "";
  const status = /quit|assinado|pago/.test(saleStatus)
    ? "paid"
    : /reserva/.test(saleStatus)
      ? "reserved"
      : /parcela|sinal|financ/.test(`${saleStatus} ${payment}`)
        ? "installments"
        : sale || lead
          ? "lead"
          : modelStatus || "";
  const result =
    status || ["lead", "reserved", "installments", "paid"][index % 4];
  lot.userData.dashboardLotStatus = result;
  lot.userData.dashboardLotStatusSource =
    sale || lead ? "crm" : modelStatus ? "model" : "fallback";
  lot.userData.dashboardStaffStatus = ["operating", "services", "planned"][
    index % 3
  ];
  return result;
};
MapScene.prototype.clearDashboardModeHighlightV1 = function ({
  render = true,
} = {}) {
  for (const lot of dashboardLotPartsV1(this)) {
    if (!lot.userData?.dashboardModeMaterial) continue;
    delete lot.userData.dashboardModeMaterial;
    this.restorePartMaterial(lot);
  }
  delete this.dataset.dashboardModeHighlight;
  delete this.dataset.dashboardModeHighlightMatches;
  delete this.dataset.dashboardModeHighlightColor;
  if (render) this.renderer?.render?.(this.scene, this.camera);
};
MapScene.prototype.applyDashboardModeHighlightV1 = function (key = null) {
  this.clearDashboardModeHighlightV1({ render: false });
  const config = dashboardLotHighlightV1[key];
  this.dataset.dashboardModeHighlight = key || "none";
  if (!config) {
    this.renderer?.render?.(this.scene, this.camera);
    return;
  }
  const lots = dashboardLotPartsV1(this),
    matches = [];
  lots.forEach((lot, index) => {
    const status = dashboardLotStatusV1(this, lot, index),
      staffStatus = lot.userData.dashboardStaffStatus;
    const match = config.staffStatus
      ? staffStatus === config.staffStatus
      : config.statuses?.includes(status);
    if (!match) return;
    const color =
      config.color ||
      {
        lead: 0x4589ff,
        reserved: 0xf1c21b,
        installments: 0xf08b2d,
        paid: 0x42be65,
      }[status] ||
      0x32c5d9;
    lot.userData.dashboardModeMaterial = this.materialForColor(
      lot.userData.defaultMaterial || lot.material,
      color,
      0.96,
    );
    lot.material = lot.userData.dashboardModeMaterial;
    matches.push(lot);
  });
  this.dataset.dashboardModeHighlightMatches = String(matches.length);
  this.dataset.dashboardModeHighlightColor = config.color
    ? `#${config.color.toString(16).padStart(6, "0")}`
    : "status-palette";
  this.renderer?.render?.(this.scene, this.camera);
};
MapScene.prototype.syncDashboardModeHighlightV1 = function () {
  const state = appStore.get(),
    mode = dashboardModeKeyV1(state.dashboardMode),
    key = dashboardFilterForModeV1(state.mapFilter, mode)
      ? state.mapFilter
      : null;
  this.dataset.dashboardMode = mode;
  if (mode === "tracking" || !key) {
    this.clearDashboardModeHighlightV1();
    return;
  }
  this.applyDashboardModeHighlightV1(key);
};

const legacySetStageOverlayV1 = MapScene.prototype.setStageOverlay;
MapScene.prototype.setStageOverlay = function (stage, announce = false) {
  this._stageOverlaySelectionInitializedV1 = true;
  this._requestedStageOverlayKeysV1 = normalizeStageOverlayKeysV1([stage]);
  this.stageOverlayKeys = this._requestedStageOverlayKeysV1.slice();
  delete this.dataset.overlayKeys;
  return legacySetStageOverlayV1.call(this, stage, announce);
};
const legacyClearStageOverlayV1 = MapScene.prototype.clearStageOverlay;
MapScene.prototype.clearStageOverlay = function (announce = false) {
  this._stageOverlaySelectionInitializedV1 = true;
  this._requestedStageOverlayKeysV1 = [];
  this.stageOverlayKeys = [];
  delete this.dataset.overlayKeys;
  return legacyClearStageOverlayV1.call(this, announce);
};

MapScene.prototype.setStageOverlays = function (
  value = [],
  announce = false,
  options = {},
) {
  const keys = normalizeStageOverlayKeysV1(value);
  const compactMirror = Boolean(
    this.hasAttribute("compact") && getSharedMapScene() && getSharedMapScene() !== this,
  );
  if (compactMirror) {
    this._stageOverlaySelectionInitializedV1 = true;
    this._requestedStageOverlayKeysV1 = keys;
    this.stageOverlayKeys = keys;
    this.stageOverlayKey = keys.at(-1) || null;
    this.dataset.overlayKeys = keys.join(",");
    this.dataset.overlayKey = this.stageOverlayKey || "";
    this.dataset.overlayLabel = stageOverlayLabelV1(keys);
    this.dataset.highlightActive = String(Boolean(keys.length));
    getSharedMapScene().setStageOverlays(keys, false, { fromCompact: true });
    this.renderSharedMap?.();
    if (announce)
      notify(
        keys.length
          ? `Camadas ${stageOverlayLabelV1(keys)} aplicadas no mapa.`
          : "Camadas removidas do mapa.",
        "success",
      );
    return;
  }
  this._stageOverlaySelectionInitializedV1 = true;
  this._requestedStageOverlayKeysV1 = keys;
  this.stageOverlayKeys = keys;
  this.stageOverlayKey = keys.at(-1) || null;
  this.dataset.overlayKeys = keys.join(",");
  this.dataset.overlayKey = this.stageOverlayKey || "";
  this.dataset.overlayLabel = stageOverlayLabelV1(keys);
  this.dataset.highlightActive = String(Boolean(keys.length));
  this.querySelectorAll("[data-scene-overlay]").forEach((button) =>
    button.classList.toggle(
      "active",
      keys.includes(button.dataset.sceneOverlay),
    ),
  );
  this.applyStageOverlaySetV1(keys);
  syncCompactMapMirrors();
  const span = this.querySelector(".map-badge span");
  if (span && !this.dataset.selectedPart)
    span.textContent = keys.length
      ? `Highlights · ${stageOverlayLabelV1(keys)}`
      : "Captura satélite local · visão temática";
  if (announce)
    notify(
      keys.length
        ? `Camadas ${stageOverlayLabelV1(keys)} aplicadas no mapa.`
        : "Camadas removidas do mapa.",
      "success",
    );
};
};
