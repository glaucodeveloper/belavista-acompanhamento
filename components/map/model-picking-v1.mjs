const MODEL_PICKING_METHODS_V1 = Object.freeze([
  "physicalMapParts",
  "streetPaverPartAt",
  "renderActiveSceneV5370",
  "adminStandaloneModelPartsV5370",
  "adminStandalonePhysicalMapPartAtV5370",
  "adminStandaloneCollectModelPartsInRectV5370",
  "pickModelAt",
  "isDashboardStatusContext",
  "toggleCategoryFromPart",
  "selectModelPart",
]);

export const installMapModelPickingV1 = (MapScene, { appStore } = {}) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Map model picking requires the existing MapScene constructor.");
  if (typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("Map model picking requires appStore.get() and appStore.set().");
  const MapModelPickingMethodsV1 = class {
  physicalMapParts() {
    const regular = [
      ...(this.modelParts?.lots || []),
      ...(this.modelParts?.streets || []),
      ...(this._streetSourceCandidates || []),
      ...(this.modelParts?.other || []),
    ];
    const source = regular.length
        ? regular
        : this.activityMapStandaloneParts || [],
      seen = new Set();
    return source.filter((part) => {
      if (!part) return false;
      const id = String(part.userData?.partId || part.name || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return part.visible !== false || part.userData?.partKind === "streets";
    });
  }
  streetPaverPartAt(mesh, instanceId) {
    const part = mesh?.userData?.paverParts?.[instanceId];
    if (!part) return mesh || null;
    return {
      name: part.partId,
      material: mesh.material,
      _paverOwner: mesh,
      _paverInstanceId: instanceId,
      userData: { ...part, defaultMaterial: mesh.material },
    };
  }
  renderActiveSceneV5370() {
    if (this.isAdminStandaloneInteractiveV5370()) {
      this.ensureAdminStandaloneRoadSurfaceV1();
      this._adminStandaloneStageV5370.updateMatrixWorld?.(true);
      this._adminStandaloneRendererV5370.render(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370,
      );
      return;
    }
    this.renderer?.render(this.scene, this.camera);
  }
  adminStandaloneModelPartsV5370() {
    const parts = Array.isArray(this.activityMapStandaloneParts)
      ? this.activityMapStandaloneParts
      : [];
    const seen = new Set();
    return parts.filter((item) => {
      if (!item || item.visible === false || item.userData?.adminSatelliteBase)
        return false;
      const id = String(item.userData?.partId || item.name || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return Boolean(item.userData?.partKind);
    });
  }
  adminStandalonePhysicalMapPartAtV5370(point) {
    const THREE = this.THREE,
      canvas = this.querySelector(".three-overlay");
    const camera = this._adminStandaloneCameraV5370,
      stage = this._adminStandaloneStageV5370;
    const width = canvas?.clientWidth || 0,
      height = canvas?.clientHeight || 0;
    if (!THREE || !camera || !stage || !width || !height || !point) return null;
    this._adminStandaloneRaycasterV5370 ??= new THREE.Raycaster();
    this._adminStandaloneNdcV5370 ??= new THREE.Vector2();
    this._adminStandaloneNdcV5370.set(
      (Number(point.x) / width) * 2 - 1,
      -((Number(point.y) / height) * 2 - 1),
    );
    camera.updateMatrixWorld(true);
    stage.updateMatrixWorld(true);
    this._adminStandaloneRaycasterV5370.setFromCamera(
      this._adminStandaloneNdcV5370,
      camera,
    );
    const hit = this._adminStandaloneRaycasterV5370
      .intersectObject(stage, true)
      .find((entry) => {
        if (entry.object?.userData?.adminSatelliteBase) return false;
        let source = entry.object;
        while (source && !source.userData?.partKind) source = source.parent;
        return Boolean(source && source.visible !== false);
      });
    if (!hit) return null;
    let source = hit.object;
    while (source && !source.userData?.partKind) source = source.parent;
    if (source?.userData?.streetPaver && Number.isInteger(hit.instanceId)) {
      return this.streetPaverPartAt(source, hit.instanceId);
    }
    return source || null;
  }
  adminStandaloneCollectModelPartsInRectV5370(startClient, endClient) {
    const THREE = this.THREE,
      canvas = this.querySelector(".three-overlay");
    const camera = this._adminStandaloneCameraV5370;
    const start = this.pointFromClient(startClient?.x, startClient?.y);
    const end = this.pointFromClient(endClient?.x, endClient?.y);
    const width = canvas?.clientWidth || 0,
      height = canvas?.clientHeight || 0;
    if (!THREE || !camera || !start || !end || !width || !height) return [];
    const left = Math.min(start.x, end.x),
      right = Math.max(start.x, end.x);
    const top = Math.min(start.y, end.y),
      bottom = Math.max(start.y, end.y);
    camera.updateMatrixWorld(true);
    const selected = [];
    for (const item of this.adminStandaloneModelPartsV5370()) {
      const box = new THREE.Box3().setFromObject(item);
      if (box.isEmpty?.()) continue;
      const center = box.getCenter(new THREE.Vector3()).project(camera);
      const x = ((center.x + 1) * width) / 2,
        y = ((-center.y + 1) * height) / 2;
      if (x >= left && x <= right && y >= top && y <= bottom)
        selected.push(item);
    }
    return selected;
  }

  pickModelAt(point) {
    if (this.isAdminStandaloneInteractiveV5370()) {
      if (!this.modelReady) return false;
      const picked = this.adminStandalonePhysicalMapPartAtV5370(point);
      if (picked) {
        if (this.recordPaintMode) return this.selectRecordMapPart(picked);
        if (this.mapSelectionMode === "progress")
          return this.toggleProgressAreaSelectionV1(picked);
        if (picked.userData?.partKind === "lots")
          return this.toggleLotSelection(picked);
        this.toggleCategoryFromPart(picked);
        return true;
      }
      // Sem interseção real, o cursor está no vazio entre polígonos ou fora
      // de uma superfície selecionável. Não aproximar pelo centro do bounding
      // box: isso fazia espaços herdarem o lote/trecho mais próximo.
      return false;
    }
    if (!this.modelReady || !this.raycaster || !this.camera || !this.modelGroup)
      return false;
    const canvas = this.querySelector(".three-overlay"),
      rect = canvas?.getBoundingClientRect(),
      w = canvas?.clientWidth || 0,
      h = canvas?.clientHeight || 0;
    if (!w || !h || !point) return false;
    this.pointer.x = (point.x / w) * 2 - 1;
    this.pointer.y = -(point.y / h) * 2 + 1;
    this.camera.updateMatrixWorld(true);
    this.modelGroup.updateMatrixWorld(true);
    this.sceneStage?.updateMatrixWorld?.(true);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const root = this.sceneStage || this.modelGroup;
    const hits = this.raycaster.intersectObject(root, true);
    const hit = hits.find((item) => {
      let source = item.object;
      while (source && !source.userData?.partKind) source = source.parent;
      return Boolean(source);
    });
    if (hit?.object) {
      let source = hit.object;
      while (source && !source.userData?.partKind) source = source.parent;
      const picked =
        source?.userData?.streetPaver && Number.isInteger(hit.instanceId)
          ? this.streetPaverPartAt(source, hit.instanceId)
          : source;
      if (this.recordPaintMode)
        return this.selectRecordMapPart(picked || hit.object);
      if (this.mapSelectionMode === "progress")
        return this.toggleProgressAreaSelectionV1(picked || hit.object);
      if (picked?.userData?.partKind === "lots")
        return this.toggleLotSelection(picked);
      this.toggleCategoryFromPart(picked || hit.object);
      return true;
    }
    // O raycaster é a única fonte de verdade para seleção. O ponto pode
    // estar em um corredor, vazio ou área sem geometria operacional; nesses
    // casos o clique não deve selecionar um vizinho por proximidade.
    return false;
  }
  isDashboardStatusContext() {
    const view = appStore.get().view;
    return view === "assistant" || view === "map";
  }
  toggleCategoryFromPart(node) {
    let source = node;
    while (source && !source.userData?.partKind) source = source.parent;
    if (!source) return false;
    const category =
      source.userData.partKind === "streets"
        ? "pavimentacao"
        : source.userData.partKind === "lots"
          ? "terraplanagem"
          : "urbanizacao";
    if (
      this.dataset.highlightActive === "true" &&
      this.stageOverlayKey === category
    ) {
      this.clearStageOverlay(true);
      return true;
    }
    this.setStageOverlay(category, true);
    this.selectModelPart(source);
    return true;
  }
  selectModelPart(node, announce = true) {
    let source = node;
    while (source && !source.userData?.partKind) source = source.parent;
    if (!source) return;
    const kind = source.userData.partKind,
      partId = source.userData.partId;
    if (
      this.setStreetPaverInstanceColor(
        source,
        kind === "lots" ? 0x2fe6ae : kind === "streets" ? 0x78a9ff : 0xffb020,
      )
    ) {
      this.dataset.selectedPart =
        source.userData.partLabel || source.name || "Paralelepípedo · bloco";
      this.dataset.selectedKind = kind;
      if (announce)
        appStore.set({ lastAction: `Selecionou ${this.dataset.selectedPart}` });
      this.renderActiveSceneV5370();
      return;
    }
    this.physicalMapParts().forEach((item) => {
      if (item.userData.highlightMaterial) this.restorePartMaterial(item);
    });
    const matches = this.physicalMapParts().filter(
      (item) =>
        item.userData?.partKind === kind &&
        (item.userData.partId || item.name) === partId,
    );
    const color =
      kind === "lots" ? 0x2fe6ae : kind === "streets" ? 0x78a9ff : 0xffb020;
    matches.forEach((item) => {
      const original = item.userData.defaultMaterial,
        paint = (mat) => {
          const clone = mat.clone();
          if (clone.color) clone.color.setHex(color);
          if (clone.emissive) {
            clone.emissive.setHex(color);
            clone.emissiveIntensity = 0.72;
          }
          clone.transparent = true;
          clone.opacity = Math.max(0.68, clone.opacity ?? 1);
          return clone;
        };
      item.userData.highlightMaterial = Array.isArray(original)
        ? original.map(paint)
        : paint(original);
      item.material = item.userData.highlightMaterial;
    });
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
      this.selectionHalo.material.color.setHex(color);
      this.selectionHalo.visible = true;
    }
    const label =
      source.userData.partLabel ||
      source.name ||
      (kind === "streets"
        ? "Paralelepípedo · trecho"
        : "Elemento do empreendimento");
    this.dataset.selectedPart = label;
    this.dataset.selectedKind = kind;
    if (announce) appStore.set({ lastAction: `Selecionou ${label}` });
    const span = this.querySelector(".map-badge span");
    if (span) span.textContent = `${label} · selecionado`;
    // Seleção é somente estado/material do GLB. Não chame syncThree aqui:
    // esse método recompõe a base cartográfica e pode reprocessar os tiles
    // enquanto o usuário apenas está alternando um highlight.
    this.renderActiveSceneV5370();
  }
  };
  for (const name of MODEL_PICKING_METHODS_V1)
    Object.defineProperty(
      MapScene.prototype,
      name,
      Object.getOwnPropertyDescriptor(MapModelPickingMethodsV1.prototype, name),
    );
};
