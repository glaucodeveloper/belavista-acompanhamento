const PUBLIC_ROAD_SURFACE_POLICY_METHODS_V1 = Object.freeze(["reassertPublicPresentationStyle","disablePublicSyntheticRoads","ensurePublicTextureUv","disablePublicCobbleTexture","getPublicCobbleMaterial","loadPublicCobbleTexture","setPublicPavingView","reassertPublicRoadMaterial","enforcePublicTechnicalVisibility"]);

export const assertPublicRoadSurfacePolicyDependenciesV1 = (dependencies) => {
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Public road surface policy requires injected dependencies.");
  if (typeof dependencies.runtimeRouteV1 !== "function")
    throw new TypeError("Public road surface policy requires runtimeRouteV1().");
  if (typeof dependencies.logger?.warn !== "function")
    throw new TypeError("Public road surface policy requires logger.warn().");
  return dependencies;
};

export const installPublicRoadSurfacePolicyV1 = (MapScene, dependencies) => {
  assertPublicRoadSurfacePolicyDependenciesV1(dependencies);
  const { runtimeRouteV1, logger } = dependencies;
  const PublicRoadSurfacePolicyMethodsV1 = class {
  reassertPublicPresentationStyle() {
    if (!this.isPublicMapVisual() || !this.modelParts) return;
    const fill = this.publicLotSurfaceMaterial;
    if (fill) {
      for (const lot of this.modelParts.lots || []) {
        lot.material = fill;
        lot.userData.defaultMaterial = fill;
      }
    }
    // A apresentação pode ser reaplicada depois de uma troca de textura,
    // de um evento de dados ou de uma navegação. Em todos esses casos a
    // regra continua sendo: o satélite desenha as ruas; o modelo não.
    this.disablePublicSyntheticRoads();
    this.disablePublicCobbleTexture();
    this.dataset.publicRoadTexture =
      "disabled · satellite image is the road surface";
    this.dataset.publicRoadTextureRequired = "false";
    this.dataset.publicRoadPolicy = "satellite-only";
    this.dataset.publicModelAlignment =
      "DWG plan heading preserved · guide roads come from aerial image";
    this.setPublicPavingView("satellite", 0);
    this.dataset.publicVisualRefresh =
      "white-lot-outlines + satellite-ground-only";
  }
  disablePublicSyntheticRoads() {
    if (!this.isPublicMapVisual()) return 0;
    if (
      this.hasAttribute("data-admin-shared-public-map") &&
      this.adminPdfMasterplan3DGroupV1
    ) {
      this.dataset.publicRoadPolicy =
        "satellite-only · street hit areas retained";
      this.dataset.publicSyntheticRoads = "selection-surfaces-only";
      this.dataset.publicRoadTexture =
        "disabled · satellite image is the road surface";
      this.dataset.publicRoadTextureSource =
        "reference aerial · no road mesh texture";
      return 0;
    }
    const hiddenNodes = this._publicSyntheticRoadsHidden || new Set();
    this._publicSyntheticRoadsHidden = hiddenNodes;
    let hidden = 0;
    const hide = (node) => {
      if (!node || hiddenNodes.has(node)) return;
      const data = node.userData || {};
      const role = String(
        data.partKind || data.belavistaRole || "",
      ).toLowerCase();
      const name = String(node.name || "");
      const roadLike =
        data.streetPaver ||
        data.publicRoadOverlay ||
        data.publicCurb ||
        data.streetSegment ||
        data.streetRectangularSlice ||
        data.streetIntersection ||
        data.publicRoadBaseHidden ||
        role === "streets" ||
        role === "street" ||
        role === "curbs" ||
        role === "curb" ||
        /(^|[_\s-])(rua|road|street|asfalto|paviment|meio.?fio|guia|curb)([_\s-]|$)/i.test(
          name,
        );
      if (!roadLike) return;
      hiddenNodes.add(node);
      if (node.visible) hidden++;
      node.visible = false;
      node.raycast = () => {};
      node.userData.publicSatelliteRoadHidden = true;
    };

    // Fontes viárias do GLB: ocultar o grupo inteiro mantém os triângulos
    // disponíveis para o modo operacional, mas não deixa suas faces escuras
    // vencerem a imagem de satélite no modo público.
    for (const source of [
      ...(this._streetSourceCandidates || []),
      ...(this.modelParts?.streets || []),
    ])
      hide(source);
    this.masterplanModel?.traverse?.(hide);

    // Overlays de paralelepípedo, meios-fios e interseções ficam como irmãos
    // do GLB em sceneStage; por isso precisam ser varridos separadamente.
    this.sceneStage?.traverse?.(hide);
    for (const paver of this._streetPaverMeshes || []) hide(paver);
    this._streetPaverMeshes = [];

    this._streetOperationalGeometryReady = true;
    this.dataset.publicRoadPolicy = "satellite-only";
    this.dataset.publicSyntheticRoads = "hidden";
    this.dataset.publicSyntheticRoadCount = String(hiddenNodes.size);
    this.dataset.publicPaverVisibleCount = "0";
    this.dataset.publicRoadOcclusionPolicy = "satellite-road-base-only";
    this.dataset.publicRoadTexture =
      "disabled · satellite image is the road surface";
    this.dataset.publicRoadTextureRequired = "false";
    this.dataset.publicRoadTextureRotation = "not-applicable";
    this.renderer?.render?.(this.scene, this.camera);
    return hidden;
  }
  ensurePublicTextureUv(geometry, force = false) {
    if (
      !geometry?.getAttribute?.("position") ||
      (!force && geometry.getAttribute("uv"))
    )
      return;
    const position = geometry.getAttribute("position");
    if (!position.count) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const spans = [
      {
        axis: "x",
        min: box?.min.x || 0,
        span: Math.max(0.001, (box?.max.x || 1) - (box?.min.x || 0)),
      },
      {
        axis: "y",
        min: box?.min.y || 0,
        span: Math.max(0.001, (box?.max.y || 1) - (box?.min.y || 0)),
      },
      {
        axis: "z",
        min: box?.min.z || 0,
        span: Math.max(0.001, (box?.max.z || 1) - (box?.min.z || 0)),
      },
    ].sort((a, b) => b.span - a.span);
    // GLBs de implantação normalmente usam X/Z como plano horizontal,
    // enquanto uma PlaneGeometry recém-criada usa X/Y antes da rotação. Os
    // dois maiores eixos cobrem ambos os casos sem projetar a pedra na altura.
    const horizontalU = spans[0],
      horizontalV = spans[1];
    const aspectCompensation = Math.min(
      28,
      Math.max(1, horizontalU.span / Math.max(0.001, horizontalV.span)),
    );
    const coordinate = (index, axis) =>
      axis === "x"
        ? position.getX(index)
        : axis === "y"
          ? position.getY(index)
          : position.getZ(index);
    const uv = new Float32Array(position.count * 2);
    for (let index = 0; index < position.count; index++) {
      // A repetição fica no material. Manter o UV normalizado evita somar
      // duas escalas e produzir blocos de pedra grandes demais nas vias.
      // Como a rua é mais longa que larga, repetir igualmente os dois eixos
      // estica cada pedra no comprimento. A compensação gera peças quadradas
      // e fiadas transversais, inclusive nos meios-fios longos.
      uv[index * 2] =
        ((coordinate(index, horizontalU.axis) - horizontalU.min) /
          horizontalU.span) *
        aspectCompensation;
      uv[index * 2 + 1] =
        (coordinate(index, horizontalV.axis) - horizontalV.min) /
        horizontalV.span;
    }
    geometry.setAttribute("uv", new this.THREE.BufferAttribute(uv, 2));
    geometry.attributes.uv.needsUpdate = true;
  }
  disablePublicCobbleTexture() {
    const texture = this.publicCobbleTexture;
    const material = this._publicCobbleMaterial;
    this.publicCobbleTexture = null;
    this._publicCobbleMaterial = null;
    this._publicCobbleTextureLoading = false;
    texture?.dispose?.();
    if (material) {
      material.map = null;
      material.needsUpdate = true;
      material.dispose?.();
    }
    this.dataset.publicCobbleTexture = "disabled";
    this.dataset.publicCobbleTextureSource = "none · satellite-only";
    this.dataset.publicRoadTextureRotation = "not-applicable";
  }
  getPublicCobbleMaterial() {
    if (this.isPublicMapVisual() || this.isPublicCustomerExperience())
      return null;
    if (!this.THREE || !this.publicCobbleTexture) return null;
    if (this._publicCobbleMaterial?.map === this.publicCobbleTexture) {
      this._publicCobbleMaterial.depthTest = false;
      this._publicCobbleMaterial.depthWrite = false;
      this._publicCobbleMaterial.transparent = false;
      this._publicCobbleMaterial.needsUpdate = true;
      return this._publicCobbleMaterial;
    }
    // MeshBasicMaterial keeps the imported stone visible over the dark
    // satellite/GLB lighting. The texture itself remains the real
    // paralelepípedo surface; only its exposure is made deterministic.
    this._publicCobbleMaterial = new this.THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: this.publicCobbleTexture,
      side: this.THREE.DoubleSide,
      transparent: false,
      // O mesh é triangulado a partir da própria face superior da rua. Ele
      // pode, portanto, ser desenhado sobre o piso social sem criar um
      // retângulo extra: só cobre os pixels que pertencem à via canônica.
      depthWrite: false,
      depthTest: false,
    });
    this._publicCobbleMaterial.name = "BelavistaImportedCobblePublic";
    return this._publicCobbleMaterial;
  }
  loadPublicCobbleTexture() {
    if (this.isPublicMapVisual()) {
      this.disablePublicSyntheticRoads();
      this.disablePublicCobbleTexture();
      this.dataset.publicRoadTexture =
        "disabled · satellite image is the road surface";
      this.dataset.publicRoadTextureRequired = "false";
      return;
    }
    if (
      this.publicCobbleTexture ||
      this._publicCobbleTextureLoading ||
      !this.THREE
    )
      return;
    this._publicCobbleTextureLoading = true;
    this.dataset.publicRoadTexture = "loading";
    new this.THREE.TextureLoader().load(
      runtimeRouteV1("/assets/textures/cobblestone-pavement-polyhaven-1k.jpg"),
      (texture) => {
        // A carga pode ter começado antes de a experiência mudar para o
        // modo público. Nunca retenha nem aplique a textura nesse caso.
        if (this.isPublicMapVisual() || this.isPublicCustomerExperience()) {
          texture.dispose?.();
          this._publicCobbleTextureLoading = false;
          this.disablePublicCobbleTexture();
          return;
        }
        texture.colorSpace = this.THREE.SRGBColorSpace;
        texture.wrapS = this.THREE.RepeatWrapping;
        texture.wrapT = this.THREE.RepeatWrapping;
        // A superfície triangulada já calcula UVs em unidades do modelo. Uma
        // repetição adicional multiplicava a escala e transformava as juntas
        // em linhas pretas. Uma única paginação mantém pedras pequenas,
        // quadradas e legíveis sem criar uma malha visual sobre os lotes.
        texture.repeat.set(1, 1);
        // A paginação da pedra fica diagonal em relação ao eixo das vias,
        // como na referência visual do loteamento. O centro evita deslocar o
        // padrão ao aplicar a rotação no material compartilhado.
        texture.center.set(0.5, 0.5);
        texture.rotation = Math.PI / 4;
        this.dataset.publicRoadTextureRotation = "45deg";
        texture.anisotropy = Math.min(
          4,
          this.renderer?.capabilities?.getMaxAnisotropy?.() || 1,
        );
        texture.needsUpdate = true;
        this.publicCobbleTexture = texture;
        this._publicCobbleTextureLoading = false;
        this.dataset.publicRoadTexture = "ready";
        this.dataset.publicRoadTextureSource =
          "Poly Haven · Cobblestone Pavement · CC0";
        // A apresentação pública já pode ter sido montada enquanto a imagem
        // chegava. Nesse caso reassertPublicPresentationStyle() sai cedo por
        // _publicPresentationStyleReady e deixava os meshes nativos no
        // material escuro original. Reaplique somente a camada de rua agora.
        this.reassertPublicRoadMaterial();
        this.setPublicPavingView("cobble", 100);
      },
      undefined,
      (error) => {
        this._publicCobbleTextureLoading = false;
        this.dataset.publicRoadTexture = "fallback";
        logger.warn(
          "[Aliança Park public] textura importada de paralelepípedo indisponível.",
          error,
        );
      },
    );
  }
  setPublicPavingView(mode = "cobble", progress = 0) {
    if (!this.isPublicMapVisual() || !this.THREE) return;
    // A experiência pública usa a foto aérea centrada pelo DWG como chão.
    // O controle de paralelepípedo continua existindo para os contextos
    // operacionais/administrativos, mas nunca deve criar uma rua sobre a
    // fotografia da página de leads.
    if (
      this.dataset.publicRoadPolicy === "satellite-only" ||
      this.isPublicCustomerExperience()
    ) {
      this.disablePublicSyntheticRoads();
      this.disablePublicCobbleTexture();
      this.dataset.publicPavingView = "satellite-only";
      this.dataset.publicPavingProgress = "0";
      this.dataset.publicCobbleSegments = "0/0 · satellite ground";
      this.dataset.publicPaverDiagnostic = "disabled · no generated roads";
      this.dataset.publicRoadOcclusionPolicy = "satellite-road-base-only";
      return;
    }
    // Alguns GLBs compartilham a fonte viária entre mais de um agrupamento.
    // Reafirmar a visibilidade aqui evita que uma reaplicação de material
    // reative a malha escura depois da construção do overlay.
    const publicSources = [
      ...(this._streetSourceCandidates || []),
      ...(this.modelParts?.streets || []),
    ];
    const hidePublicRoadSource = (node) => {
      if (
        node?.userData?.publicRoadBaseHidden &&
        !node.userData?.streetPaver &&
        !node.userData?.publicRoadOverlay
      ) {
        node.visible = false;
        node.raycast = () => {};
      }
    };
    publicSources.forEach((source) => source?.traverse?.(hidePublicRoadSource));
    this.masterplanModel?.traverse?.(hidePublicRoadSource);
    this.ensureOperationalStreetGeometry();
    const generated = (this.modelParts?.streets || []).filter(
      (item) => item.userData?.streetSegment,
    );
    // Alguns GLBs trazem ruas compostas sem uma geometria retangular que
    // possa ser fatiada. Neles, o fallback é por via inteira — ainda respeita
    // a medição e evita deixar todos os trechos em paralelepípedo.
    const segmented = generated.length > 0;
    const segments = segmented
      ? generated
      : this._streetSourceCandidates || this.modelParts?.streets || [];
    const normalized = Math.max(0, Math.min(100, Number(progress) || 0));
    const appliedProgress = mode === "cobble" ? 100 : normalized;
    const completed =
      mode === "asphalt"
        ? 0
        : Math.round((segments.length * appliedProgress) / 100);
    segments.forEach((segment, index) => {
      if (!segment.userData?.streetPaverSurface)
        this.ensurePublicTextureUv(segment.geometry, true);
      if (!segment.userData.publicCobbleMaterial) {
        const baseMaterial =
          this.getPublicCobbleMaterial() ||
          new this.THREE.MeshBasicMaterial({
            color: 0x8d8a82,
            side: this.THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
          });
        segment.userData.publicCobbleMaterial = segment.userData.streetPaver
          ? Object.assign(baseMaterial.clone(), { vertexColors: false })
          : baseMaterial;
      }
      // Reaplica a política também nos clones criados antes da textura
      // terminar de carregar.
      segment.userData.publicCobbleMaterial.depthTest = false;
      segment.userData.publicCobbleMaterial.depthWrite = false;
      segment.userData.publicCobbleMaterial.transparent = false;
      segment.userData.publicCobbleMaterial.needsUpdate = true;
      if (
        this.publicCobbleTexture &&
        segment.userData.publicCobbleMaterial.map !== this.publicCobbleTexture
      ) {
        segment.userData.publicCobbleMaterial.map = this.publicCobbleTexture;
        segment.userData.publicCobbleMaterial.needsUpdate = true;
      }
      if (segmented) {
        segment.visible = index < completed;
        segment.renderOrder = 30;
        if (index < completed)
          segment.material = segment.userData.publicCobbleMaterial;
      } else {
        segment.visible = true;
        segment.renderOrder = 30;
        segment.material =
          index < completed
            ? segment.userData.publicCobbleMaterial
            : segment.userData.defaultMaterial;
      }
    });
    // A textura das superfícies-fatia já foi atribuída acima. Não reentre em
    // reassertPublicRoadMaterial aqui: esse método chama setPublicPavingView
    // durante o carregamento da textura e a recursão fazia o renderer perder
    // a camada das ruas.
    this.dataset.publicPavingView =
      mode === "asphalt"
        ? "all-asphalt"
        : mode === "cobble"
          ? "all-cobble"
          : "progress-only-cobble";
    this.dataset.publicPavingProgress = String(appliedProgress);
    this.dataset.publicCobbleSegments = `${completed}/${segments.length}${segmented ? " trechos" : " vias"}`;
    this.dataset.publicPaverDiagnostic = "exact-road-surface";
    this.dataset.publicRoadOcclusionPolicy =
      "exact-road-triangles-over-social-floor";
    this.renderer?.render(this.scene, this.camera);
  }
  reassertPublicRoadMaterial() {
    if (this.isPublicMapVisual()) {
      this.disablePublicSyntheticRoads();
      this.disablePublicCobbleTexture();
      this.dataset.publicRoadTexture =
        "disabled · satellite image is the road surface";
      this.dataset.publicRoadTextureRequired = "false";
      return;
    }
    const material = this.getPublicCobbleMaterial();
    if (!material) return;
    material.depthTest = false;
    material.depthWrite = false;
    material.transparent = false;
    material.needsUpdate = true;
    const apply = (node) => {
      if (!node?.isMesh) return;
      const role = String(node.userData?.partKind || "").toLowerCase();
      if (
        node.userData?.streetSegment ||
        node.userData?.publicCurb ||
        role === "streets" ||
        role === "curbs"
      ) {
        if (
          node.userData?.publicRoadBaseHidden &&
          !node.userData?.streetSegment &&
          !node.userData?.publicCurb &&
          !node.userData?.streetPaver &&
          !node.userData?.publicRoadOverlay
        ) {
          node.visible = false;
          node.raycast = () => {};
        }
        if (!node.userData?.streetPaverSurface)
          this.ensurePublicTextureUv(node.geometry, true);
        if (node.userData?.streetPaver) {
          const paverMaterial =
            node.userData.publicCobbleMaterial ||
            (node.userData.publicCobbleMaterial = material.clone());
          paverMaterial.vertexColors = false;
          paverMaterial.depthTest = false;
          paverMaterial.depthWrite = false;
          paverMaterial.transparent = false;
          paverMaterial.needsUpdate = true;
          node.material = paverMaterial;
          node.renderOrder = 30;
        } else node.material = material;
        node.userData.defaultMaterial = node.material;
        node.userData.publicRoadSurface = true;
      }
    };
    for (const source of [
      ...(this._streetSourceCandidates || []),
      ...(this.modelParts?.streets || []),
    ])
      source?.traverse?.(apply);
    this.masterplanModel?.traverse?.(apply);
    this.dataset.publicRoadMaterial = "imported-cobble-meshbasic-v55";
  }
  enforcePublicTechnicalVisibility() {
    if (!this.isPublicMapVisual() || !this.masterplanModel) return;
    this.disablePublicSyntheticRoads();
    const pdf3d =
      this.hasAttribute("data-admin-shared-public-map") &&
      Boolean(this.adminPdfMasterplan3DGroupV1);
    let hiddenRoadSources = 0,
      hiddenDividers = 0,
      visiblePavers = 0;
    const visibleKinds = new Map();
    this.masterplanModel.traverse?.((node) => {
      const name = String(node.name || "");
      const isGeneratedPaver = Boolean(node.userData?.streetPaver);
      const isPublicRoadSource =
        !isGeneratedPaver &&
        !node.userData?.publicRoadOverlay &&
        (node.userData?.publicRoadBaseHidden ||
          /^(asfalto|rua|street|road|meio.?fio|guia|curb)(?:[_\s-]|$)/i.test(
            name,
          )) &&
        !pdf3d;
      const isInternalDivider =
        /^divisa(?:[_\s-]|$)/i.test(name) ||
        node.userData?.publicInternalDividerHidden;
      if (isPublicRoadSource) {
        if (node.visible) hiddenRoadSources++;
        node.visible = false;
        node.raycast = () => {};
      }
      if (isInternalDivider) {
        if (node.visible) hiddenDividers++;
        node.visible = false;
        node.raycast = () => {};
      }
      if (isGeneratedPaver && node.visible) visiblePavers++;
      if (node.visible && (node.isMesh || node.isLine || node.isPoints)) {
        const kind = isGeneratedPaver
          ? "generated-paver"
          : node.userData?.partKind || "unclassified";
        visibleKinds.set(kind, (visibleKinds.get(kind) || 0) + 1);
      }
    });
    // Os pavers nativos são overlays irmãos do modelo principal; eles não
    // aparecem no traverse acima, mas são a camada que efetivamente cobre a
    // interseção entre a rua e o piso social.
    for (const paver of this._streetPaverMeshes || []) {
      if (paver.visible) {
        visiblePavers++;
        visibleKinds.set(
          "generated-paver",
          (visibleKinds.get("generated-paver") || 0) + 1,
        );
      }
    }
    this.dataset.publicTechnicalVisibility = "enforced-before-render";
    this.dataset.publicTechnicalRoadsHidden = String(hiddenRoadSources);
    this.dataset.publicTechnicalDividersHidden = String(hiddenDividers);
    this.dataset.publicPaverVisibleCount = String(visiblePavers);
    this.dataset.publicVisibleKinds =
      [...visibleKinds].map(([kind, count]) => `${kind}:${count}`).join("|") ||
      "none";
  }
  };
  for (const name of PUBLIC_ROAD_SURFACE_POLICY_METHODS_V1) {
    Object.defineProperty(
      MapScene.prototype,
      name,
      Object.getOwnPropertyDescriptor(PublicRoadSurfacePolicyMethodsV1.prototype, name),
    );
  }
};
