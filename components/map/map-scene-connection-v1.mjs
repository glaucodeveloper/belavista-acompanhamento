import { initializeMapSceneStateV1 } from "./map-scene-state-initializer-v1.mjs";
import { createMapSceneShellMarkupV1 } from "./map-scene-shell-markup-v1.mjs";
import { applyMapSceneCoverLayoutV1 } from "./map-scene-cover-layout-v1.mjs";
import { activateMapSceneV1 } from "./map-scene-activation-v1.mjs";

/** Installs the full MapScene connection lifecycle on the custom element. */
export const installMapSceneConnectionV1 = (MapScene, dependencies = {}) => {
  const {
    ADMIN_FIXED_MAP_ROTATION_DEG,
    ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM,
    ADMIN_REFERENCE_AERIAL_VIEW_VERSION,
    DASHBOARD_INITIAL_SCENE_ZOOM,
    INITIAL_SCENE_ZOOM,
    MAP_SCENE_STATE_VERSION,
    MAX_SCENE_ZOOM,
    MIN_SCENE_ZOOM,
    appStore,
    demoData,
    esc,
    ico,
    performanceRef = globalThis.performance,
    setSharedMapScene,
    stageOverlayKey,
    stageOverlayLabels,
  } = dependencies;

  MapScene.prototype.connectedCallback = function() {
    // O shell da SPA mantém esta mesma instância entre as páginas. O guard
    // evita que uma reconexão acidental descarte Leaflet, tiles e o contexto
    // WebGL já carregados.
    if (this._persistentMapMounted) return;
    this._persistentMapMounted = true;
    this.dataset.mapLifecycle = "persistent-mounted";
    this.dataset.mapInstanceId = `map-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.selectedLotIds = new Set();
    this.mapSelectionMode = null;
    this.progressSelectionParts = [];
    initializeMapSceneStateV1(this, {
      ADMIN_FIXED_MAP_ROTATION_DEG,
      ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM,
      ADMIN_REFERENCE_AERIAL_VIEW_VERSION,
      DASHBOARD_INITIAL_SCENE_ZOOM,
      INITIAL_SCENE_ZOOM,
      MAP_SCENE_STATE_VERSION,
      MAX_SCENE_ZOOM,
      MIN_SCENE_ZOOM,
      appStore,
      demoData,
      stageOverlayKey,
    });
    if (this.hasAttribute("compact")) {
      const full3d = true;
      if (!full3d) {
        const stage = esc(this.getAttribute("data-stage") || "Etapa");
        this.dataset.renderMode = "safe-thumbnail";
        this.dataset.mapInit = "safe-thumbnail";
        this.innerHTML = `<div class="safe-map-thumbnail"><span>MAPA OPERACIONAL</span><b>${stage}</b><small>Visualização segura</small></div>`;
        return;
      }
      this.renderCompact();
      return;
    }
    // Modo seguro padrão: não cria Leaflet/WebGL durante a abertura da SPA.
    // A cena pesada fica isolada: exige confirmação dupla no endereço, para
    // que uma navegação normal nunca crie WebGL nem carregue o GLB de 22 MB.
    if (false) {
      this.dataset.renderMode = "safe-map";
      this.dataset.mapInit = "safe-placeholder";
      this.innerHTML =
        '<div class="safe-map-placeholder"><span>ALIANÇA PARK</span><strong>Mapa operacional</strong><small>Visualização segura ativada</small></div>';
      return;
    }
    setSharedMapScene(this);
    const { solarMarkup, mapMarkup } = createMapSceneShellMarkupV1({
      stageOverlayLabels,
      ico,
      persistent: this.hasAttribute("data-persistent-map"),
    });
    this.innerHTML = mapMarkup;
    applyMapSceneCoverLayoutV1(this);
    activateMapSceneV1(this, { appStore, demoData, performanceRef, solarMarkup });
  };
};
