const LOT_SELECTION_UI_METHODS_V1 = Object.freeze([
  "modelPartSource",
  "materialForColor",
  "restorePartMaterial",
  "toggleLotSelection",
  "removeMapSelectionPanel",
  "renderLotReservationPanel",
]);

export const assertLotSelectionUiDependenciesV1 = (dependencies) => {
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Map lot selection requires injected dependencies.");
  for (const key of ["appStore", "document", "FormData", "window"])
    if (!dependencies[key])
      throw new TypeError(`Map lot selection requires ${key}.`);
  if (typeof dependencies.appStore.set !== "function")
    throw new TypeError("Map lot selection requires appStore.set().");
  if (typeof dependencies.document.createElement !== "function")
    throw new TypeError("Map lot selection requires document.createElement().");
  for (const key of ["esc", "ico", "notify"])
    if (typeof dependencies[key] !== "function")
      throw new TypeError(`Map lot selection requires ${key}().`);
  return dependencies;
};

export const installMapLotSelectionUiV1 = (MapScene, dependencies) => {
  assertLotSelectionUiDependenciesV1(dependencies);
  const { appStore, document, esc, FormData, ico, notify, window } = dependencies;
  const MapLotSelectionUiMethodsV1 = class {
  modelPartSource(node) {
    let source = node;
    while (source && !source.userData?.partKind) source = source.parent;
    return source;
  }
  materialForColor(material, color, opacity = 0.84) {
    const paint = (mat) => {
      if (!mat) return mat;
      const clone = mat.clone?.() || mat;
      if (clone.color) clone.color.setHex(color);
      if (clone.emissive) {
        clone.emissive.setHex(color);
        clone.emissiveIntensity = 0.72;
      }
      clone.transparent = true;
      clone.opacity = Math.max(0.68, Math.min(0.94, opacity));
      clone.depthWrite = false;
      return clone;
    };
    return Array.isArray(material) ? material.map(paint) : paint(material);
  }
  restorePartMaterial(item) {
    item.material =
      item.userData.progressSelectionMaterial ||
      item.userData.progressMaterial ||
      item.userData.selectionMaterial ||
      item.userData.overlayMaterial ||
      item.userData.statusMaterial ||
      item.userData.recordStatusMaterial ||
      item.userData.publicStatusMaterial ||
      item.userData.defaultMaterial;
  }
  toggleLotSelection(node) {
    const source = this.modelPartSource(node);
    if (!source || source.userData.partKind !== "lots") return false;
    const partId = source.userData.partId || source.name,
      selected = this.selectedLotIds || new Set();
    this.selectedLotIds = selected;
    const matches = this.physicalMapParts().filter(
      (item) =>
        item.userData?.partKind === "lots" &&
        (item.userData.partId || item.name) === partId,
    );
    if (selected.has(partId)) {
      selected.delete(partId);
      matches.forEach((item) => {
        delete item.userData.selectionMaterial;
        this.restorePartMaterial(item);
      });
    } else {
      selected.add(partId);
      matches.forEach((item) => {
        item.userData.selectionMaterial = this.materialForColor(
          item.userData.defaultMaterial,
          0x2fe6ae,
          0.9,
        );
        item.material = item.userData.selectionMaterial;
      });
    }
    const label = source.userData.partLabel || source.name || "Lote";
    this.dataset.selectedPart = selected.size
      ? label
      : "Nenhum lote selecionado";
    this.dataset.selectedKind = selected.size ? "lots" : "";
    this.dataset.selectedLotCount = String(selected.size);
    this.dataset.selectedLots = [...selected].join("|");
    const bounds = new this.THREE.Box3().setFromObject(source),
      center = bounds.getCenter(new this.THREE.Vector3()),
      size = bounds.getSize(new this.THREE.Vector3());
    if (this.selectionHalo) {
      this.selectionHalo.position.set(
        center.x - (this.sceneStage?.position.x || 0),
        center.y - (this.sceneStage?.position.y || 0),
        2,
      );
      this.selectionHalo.scale.setScalar(
        Math.max(0.7, Math.min(4.5, Math.max(size.x, size.y) / 24)),
      );
      this.selectionHalo.material.color.setHex(0x2fe6ae);
      this.selectionHalo.visible = selected.size > 0;
    }
    if (selected.size) this.renderLotReservationPanel();
    else this.removeMapSelectionPanel();
    appStore.set({
      lastAction: selected.size
        ? `Selecionou ${selected.size} lote(s) para reserva`
        : "Limpou seleção de lotes",
    });
    this.sceneStage?.updateMatrixWorld(true);
    this.renderActiveSceneV5370();
    return true;
  }
  removeMapSelectionPanel() {
    this.querySelector("[data-map-selection-panel]")?.remove();
  }
  renderLotReservationPanel() {
    this.removeMapSelectionPanel();
    const ids = [...(this.selectedLotIds || [])],
      labels = ids.map(
        (id) =>
          this.physicalMapParts().find(
            (item) => (item.userData?.partId || item.name) === id,
          )?.userData?.partLabel || id,
      );
    const panel = document.createElement("aside");
    panel.className = "map-selection-panel";
    panel.dataset.mapSelectionPanel = "reservation";
    panel.innerHTML = `<div class="map-selection-panel-head"><div><span class="activity-kind">RESERVA DE LOTES</span><h2>${ids.length} lote${ids.length === 1 ? "" : "s"} selecionado${ids.length === 1 ? "" : "s"}</h2></div><button type="button" data-map-selection-clear aria-label="Limpar seleção">×</button></div><div class="map-selection-chips">${labels.map((label) => `<span class="map-selection-chip">${esc(label)}</span>`).join("")}</div><p class="map-selection-help">Clique em outros lotes para acumular a seleção. Clique novamente em um lote para removê-lo.</p><form data-lot-reservation-form><label>Interessado<input name="interessado" placeholder="Nome completo"></label><label>Objetivo<select name="objetivo"><option>Moradia</option><option>Investimento</option><option>Veraneio</option></select></label><label>Prazo de reserva<select name="prazo"><option>24 horas</option><option>48 horas</option><option>7 dias</option></select></label><label>Observações<textarea name="observacoes" rows="2" placeholder="Preferências, condições ou observações"></textarea></label><div class="map-selection-panel-actions"><button type="button" class="ghost" data-map-selection-progress>${ico("paintbrush")} Registrar progresso</button><button type="submit" class="primary">${ico("calendar-check")} Abrir reserva</button></div></form>`;
    this.appendChild(panel);
    panel
      .querySelector("[data-map-selection-clear]")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.clearLotSelection(true);
      });
    panel
      .querySelector("[data-map-selection-progress]")
      ?.addEventListener("click", (event) => {
        event.stopPropagation();
        this.setMapSelectionMode("progress");
      });
    panel
      .querySelector("[data-lot-reservation-form]")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget),
          reservation = {
            id: `RES-${Date.now()}`,
            lotes: labels,
            interessado: String(
              data.get("interessado") || "Interessado não informado",
            ),
            objetivo: String(data.get("objetivo") || "Moradia"),
            prazo: String(data.get("prazo") || "24 horas"),
            observacoes: String(data.get("observacoes") || ""),
            createdAt: new Date().toISOString(),
          };
        appStore.set({
          lastAction: `Abriu reserva para ${labels.join(", ")}`,
          mapReservation: reservation,
        });
        notify(
          `Janela de reserva aberta para ${labels.length} lote(s).`,
          "success",
        );
        panel.classList.add("is-confirmed");
        const submit = panel.querySelector('[type="submit"]');
        if (submit) submit.textContent = "Reserva preparada";
      });
    window.lucide?.createIcons();
  }

  };
  for (const name of LOT_SELECTION_UI_METHODS_V1)
    Object.defineProperty(
      MapScene.prototype,
      name,
      Object.getOwnPropertyDescriptor(MapLotSelectionUiMethodsV1.prototype, name),
    );
};
