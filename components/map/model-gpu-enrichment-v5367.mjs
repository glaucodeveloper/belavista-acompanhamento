/** Installs the GPU staging and semantic model-enrichment pipeline on MapScene. */
export const installMapModelGpuEnrichmentV5367 = (MapScene, {
  PUBLIC_SOCIAL_GREEN_LIFT_V1,
  appStore,
  publishMapPreview,
  syncCompactMapMirrors,
  browser = globalThis,
} = {}) => {
  if (!MapScene?.prototype) throw new TypeError("Model enrichment requires MapScene.prototype.");
  for (const [name, value] of Object.entries({ PUBLIC_SOCIAL_GREEN_LIFT_V1, appStore, publishMapPreview, syncCompactMapMirrors })) {
    if (value === undefined) throw new TypeError(`Model enrichment requires ${name}.`);
  }
  if (typeof browser?.requestAnimationFrame !== "function" || typeof browser?.setTimeout !== "function" || typeof browser?.performance?.now !== "function") {
    throw new TypeError("Model enrichment requires requestAnimationFrame, setTimeout, and performance.now().");
  }
  const requestAnimationFrame = browser.requestAnimationFrame.bind(browser),
    setTimeout = browser.setTimeout.bind(browser),
    performance = { now: () => browser.performance.now() };
  class MapModelGpuEnrichmentV5367 {
  async stageMasterplanGpuV5367(THREE, model, meshes, perf, mark) {
    if (this._modelGpuStagePromiseV5367) return this._modelGpuStagePromiseV5367;

    const nextFrame = () =>
      new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const run = async () => {
      const total = meshes.length;
      this.dataset.modelProgress = "46";

      for (let index = 0; index < total; index++) {
        const node = meshes[index];
        const triangles = Number(node.userData.__v5367Triangles) || 0;

        mark("gpu-mesh", {
          meshIndex: index,
          meshNumber: index + 1,
          meshCount: total,
          meshName: String(node.name || "mesh").slice(0, 120),
          meshTriangles: triangles,
        });

        // No modo público a fonte viária do GLB não pode aparecer durante o
        // staging. Ela é a geometria escura/verde que atravessa o terreno
        // antes de a camada de paralelepípedos ser construída. O overlay
        // segmentado entra depois, já recortado pelo eixo real da rua.
        const stagingName = String(node.name || "");
        const stagingRole = String(
          node.userData?.belavistaRole || node.userData?.partKind || "",
        ).toLowerCase();
        const publicRoadSource =
          this.isPublicMapVisual() &&
          (node.userData?.publicRoadBaseHidden ||
            /^(street|road|streets|curb|curbs)$/.test(stagingRole) ||
            /(asfalto|rua|road|street|meio.?fio|guia|curb|paviment)/i.test(
              stagingName,
            ));
        const publicDividerSource =
          this.isPublicMapVisual() && /^divisa(?:[_\s-]|$)/i.test(stagingName);
        const rasterMaskIsPrimary = Boolean(
          this._adminStandaloneRasterMaskModelV1,
        );
        node.visible = rasterMaskIsPrimary
          ? false
          : !(publicRoadSource || publicDividerSource);
        if (rasterMaskIsPrimary) {
          node.userData.rasterMaskSourceHidden = true;
          node.raycast = () => {};
        }
        if (publicRoadSource) {
          node.userData.publicRoadBaseHidden = true;
          node.raycast = () => {};
        }
        if (publicDividerSource) {
          node.userData.publicInternalDividerHidden = true;
          node.raycast = () => {};
        }

        const started = performance.now();
        this.renderer?.render(this.scene, this.camera);
        const renderMs = performance.now() - started;

        perf.stagedMeshes = index + 1;
        this.dataset.modelProcessedMeshes = `${index + 1}/${total}`;
        // O staging é trabalho real de geometria/GPU. Ele alimenta a mesma
        // barra de carregamento que antes só recebia bytes da rede.
        const stagedProgress =
          46 + Math.round(((index + 1) / Math.max(1, total)) * 30);
        this.dataset.modelProgress = String(Math.min(76, stagedProgress));
        this.dataset.modelLastGpuRenderMs = renderMs.toFixed(1);

        mark("gpu-mesh-visible", {
          meshIndex: index,
          meshNumber: index + 1,
          meshCount: total,
          meshName: String(node.name || "mesh").slice(0, 120),
          meshTriangles: triangles,
          renderMs: Number(renderMs.toFixed(1)),
          stagedMeshes: index + 1,
        });

        await nextFrame();
      }

      this.modelReady = true;
      this._modelGpuReady = false;
      this.dataset.modelReady = "true";
      this.dataset.modelGpuReady = "false";
      this.dataset.modelProgress = "78";
      this.dataset.modelRender = "webgl-live-glb";
      this.classList.add("model-ready");

      mark("gpu-visible", {
        meshCount: total,
        stagedMeshes: total,
      });

      await nextFrame();

      return this.enrichMasterplanProgressively(THREE, model, meshes, perf);
    };

    this._modelGpuStagePromiseV5367 = run().finally(() => {
      this._modelGpuStagePromiseV5367 = null;
    });

    return this._modelGpuStagePromiseV5367;
  }

  async enrichMasterplanProgressively(THREE, model, meshes, perf) {
    if (this._modelEnrichmentPromise) return this._modelEnrichmentPromise;

    const nextFrame = () =>
      new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const run = async () => {
      const lots = [],
        streets = [],
        other = [];
      const leisureNodes = [],
        landscapeNodes = [],
        structureNodes = [];
      let hiddenPublicDividers = 0;
      const chunkSize = 18;

      this.dataset.modelEnrichment = "classifying";
      perf.phase = "classifying";

      for (let cursor = 0; cursor < meshes.length; cursor += chunkSize) {
        const end = Math.min(meshes.length, cursor + chunkSize);

        for (let index = cursor; index < end; index++) {
          const node = meshes[index];
          node.frustumCulled = true;
          node.renderOrder = 8;

          const prepare = (mat) => {
            if (!mat) return mat;
            const clone = mat.clone();
            clone.opacity = Math.max(0.86, Math.min(1, clone.opacity ?? 1));
            clone.transparent = clone.opacity < 0.98;
            clone.side = THREE.DoubleSide;
            clone.depthWrite = true;
            return clone;
          };

          node.material = Array.isArray(node.material)
            ? node.material.map(prepare)
            : prepare(node.material);
          node.userData.defaultMaterial = node.material;

          const name = String(node.name || "").toLowerCase();
          const role = String(node.userData?.belavistaRole || "").toLowerCase();
          const isLotDivider = /^divisa(?:[_\s-]|$)/.test(name);
          const isSocial =
            role === "leisure" ||
            /area.?de.?lazer|court|gym.?pad|gym.?post|gym.?beam|gym.?seat|pavilhao|play|praca|banco.?praca/.test(
              name,
            );

          if (/pavilhao.?telhado|pavilhao.?base/.test(name)) {
            node.userData.focusStructure = true;
            node.renderOrder = 18;
            structureNodes.push(node);
          }

          const kind =
            this.isPublicMapVisual() && isLotDivider
              ? "other"
              : role === "lot" || role === "lots"
                ? "lots"
                : role === "street" || role === "streets" || role === "road"
                  ? "streets"
                  : isSocial
                    ? "other"
                    : /(lote|quadra|gleba)/.test(name)
                      ? "lots"
                      : /(asfalto|rua|road|street|meio.?fio|guia|paviment)/.test(
                            name,
                          )
                        ? "streets"
                        : "other";

          // A superfície original das vias é apenas uma fonte geométrica.
          // No mapa público ela fica invisível para não vazar por baixo das
          // fatias de pedra que serão criadas logo adiante.
          if (
            kind === "streets" &&
            this.isPublicMapVisual() &&
            !this.hasAttribute("data-admin-shared-public-map")
          ) {
            node.visible = false;
            node.userData.publicRoadBaseHidden = true;
            node.raycast = () => {};
          }

          // O GLB também traz Divisa_* como linhas físicas das divisas dos
          // lotes. No mapa público elas eram interpretadas como lotes verdes
          // e apareciam como riscos/malha sobre o satélite; os contornos
          // públicos dos lotes já são desenhados separadamente em branco.
          if (isLotDivider && this.isPublicMapVisual()) {
            node.visible = false;
            node.userData.publicInternalDividerHidden = true;
            node.raycast = () => {};
            hiddenPublicDividers++;
          }

          if (kind === "streets") {
            const pave = (mat) =>
              this.makeSiteSurfaceMaterial(
                THREE,
                mat,
                this.isPublicMapVisual() ? "asphalt" : "cobble",
              );
            node.material = Array.isArray(node.material)
              ? node.material.map(pave)
              : pave(node.material);
            node.userData.defaultMaterial = node.material;
          } else if (kind === "lots") {
            const grass = (mat) =>
              this.makeSiteSurfaceMaterial(THREE, mat, "grass");
            node.material = Array.isArray(node.material)
              ? node.material.map(grass)
              : grass(node.material);
            node.userData.defaultMaterial = node.material;
            const earth = (mat) =>
              this.makeSiteSurfaceMaterial(THREE, mat, "earth");
            node.userData.earthworkMaterial = Array.isArray(node.material)
              ? node.material.map(earth)
              : earth(node.material);
          }

          if (isSocial) {
            const social = (mat) =>
              this.makeSocialAreaMaterial(THREE, mat, name);
            node.material = Array.isArray(node.material)
              ? node.material.map(social)
              : social(node.material);
            node.userData.defaultMaterial = node.material;
            node.userData.belavistaSocialSurface = true;
            const socialMaterials = Array.isArray(node.material)
              ? node.material
              : [node.material];
            const isGreenSocialSurface = socialMaterials.some(
              (mat) => mat?.userData?.belavistaSocialSurface === "grass",
            );
            if (
              isGreenSocialSurface &&
              !node.userData.publicGrassSurfaceLiftApplied
            ) {
              // Levanta somente o piso verde social; estruturas, quadras e
              // ruas continuam nas cotas originais do modelo do loteamento.
              node.position.z += PUBLIC_SOCIAL_GREEN_LIFT_V1;
              node.userData.publicGrassSurfaceLiftApplied = true;
              node.userData.publicGrassSurfaceLift =
                PUBLIC_SOCIAL_GREEN_LIFT_V1;
            }
            node.castShadow = true;
            node.receiveShadow = true;
          }

          node.userData.partKind = kind;
          node.userData.partId =
            kind === "lots"
              ? node.name
              : kind === "streets"
                ? `street-source-${streets.length + 1}`
                : node.name || `other-${other.length + 1}`;
          node.userData.partLabel =
            kind === "lots"
              ? `Lote ${node.name.replace(/^.*?lote[_ -]?/i, "").replace(/[_ -]?mesh.*$/i, "")}`
              : kind === "streets"
                ? `Paralelepípedo · trecho original ${streets.length + 1}`
                : node.name || "Elemento do empreendimento";
          if (kind === "lots" || kind === "streets") {
            node.userData.selectableMapArea = true;
            node.userData.mapSelectionKind = kind === "lots" ? "lot" : "street";
            node.userData.mapSelectionSource =
              "canonical GLB footprint · no 3D visual extrusion";
          }

          if (kind === "lots") lots.push(node);
          else if (kind === "streets") streets.push(node);
          else other.push(node);

          if (
            role === "landscape" ||
            /arvore|tree|tronco|copa|folhagem|outer.?east.?row|upper.?median.?row/.test(
              name,
            )
          )
            landscapeNodes.push(node);
          if (isSocial) leisureNodes.push(node);
        }

        perf.processedMeshes = end;
        this.dataset.modelProcessedMeshes = `${end}/${meshes.length}`;
        const enrichedProgress =
          78 + Math.round((end / Math.max(1, meshes.length)) * 17);
        this.dataset.modelProgress = String(Math.min(95, enrichedProgress));
        this.renderer?.render(this.scene, this.camera);
        await nextFrame();
      }

      this.modelParts = { lots, streets, other };
      this._streetSourceCandidates = streets.slice();
      this.modelLandscapeNodes = landscapeNodes;
      this.modelLeisureNodes = leisureNodes;
      this.modelLeisureFocusNodes = structureNodes.length
        ? structureNodes
        : leisureNodes;

      this.dataset.modelParts = `lotes:${lots.length}|ruas:${streets.length}|outros:${other.length}`;
      this.dataset.mapSelectionAreas = `lotes:${lots.length}|ruas:${streets.length}`;
      this.dataset.mapSelectionPolicy =
        "lotes e ruas como áreas selecionáveis · sem modelo 3D adicional";
      this.dataset.publicInternalDividersHidden = String(hiddenPublicDividers);
      this.dataset.landscapeNodes = String(landscapeNodes.length);
      this.dataset.leisureNodes = String(leisureNodes.length);
      this.dataset.focusStructureNodes = String(
        this.modelLeisureFocusNodes.length,
      );
      this.dataset.socialMaterials = `${leisureNodes.length}:social-pbr-v552`;
      this.dataset.modelEnrichment = "classified";

      await nextFrame();
      this.applyPublicPresentationStyle(THREE);
      // No mapa administrativo, a malha viária precisa nascer junto da cena:
      // superfície integral primeiro, divisões transversais de meio lote por
      // cima. A versão pública continua usando apenas a fotografia aérea.
      if (
        !this.isPublicMapVisual() ||
        this.hasAttribute("data-admin-shared-public-map")
      ) {
        // A apresentação pública marca esta flag como pronta ao esconder seus
        // overlays. No mapa compartilhado do admin, reabra a construção.
        this._streetOperationalGeometryReady = false;
        this.ensureOperationalStreetGeometry();
      }
      this.buildPdfMasterplan3DLayerV1(
        THREE,
        this.adminPdfMasterplanUnderlayTextureV1,
      );
      this.buildStageOverlayTargets();
      if (this._stageOverlaySelectionInitializedV1)
        this.setStageOverlays?.(this._requestedStageOverlayKeysV1 || [], false);
      else if (this.stageOverlayKey)
        this.setStageOverlay(this.stageOverlayKey, false);
      this.syncDashboardModeHighlightV1?.();

      this.dataset.modelEnrichment = "ready";
      this.dataset.modelOperationalGeometry = "source-meshes";
      this.paintProgressAreaSelectionV1(
        appStore.get().mapProgressSelection || [],
      );
      perf.phase = "ready";
      perf.readyAt = performance.now();
      perf.readyMs = Math.round(performance.now() - perf.startedAt);
      perf.lots = lots.length;
      perf.streets = streets.length;
      perf.other = other.length;

      this._modelGpuReady = true;
      this.dataset.modelGpuReady = "true";
      this.dataset.modelProgress = "96";
      this.dataset.publicModelSyncState = `model:${this.masterplanModel ? "1" : "0"}|largest:${Number.isFinite(this.masterplanLargest) ? "1" : "0"}|group:${this.modelGroup ? "1" : "0"}|geo:${this.dwgGeo ? "1" : "0"}|lots:${lots.length}`;
      // O GLB do loteamento termina primeiro. Árvores, relevo e entorno são
      // enriquecimento visual e entram depois do primeiro enquadramento.
      this.schedulePublicEnvironmentLoadingV1();
      this.persist3dBootPhaseV5367("gpu-ready", {
        meshCount: meshes.length,
        processedMeshes: meshes.length,
        lots: lots.length,
        streets: streets.length,
        other: other.length,
      });
      setTimeout(() => syncCompactMapMirrors(), 1800);

      // Sync geográfico sai do callback de parse/classificação.
      setTimeout(() => this.syncThree(), 0);
      publishMapPreview();
      return true;
    };

    this._modelEnrichmentPromise = run().finally(() => {
      this._modelEnrichmentPromise = null;
    });
    return this._modelEnrichmentPromise;
  }
  }
  for (const name of Object.getOwnPropertyNames(MapModelGpuEnrichmentV5367.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(MapScene.prototype, name, Object.getOwnPropertyDescriptor(MapModelGpuEnrichmentV5367.prototype, name));
  }
};
