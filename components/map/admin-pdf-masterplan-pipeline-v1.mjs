/** Installs the full PDF/DWG masterplan texture, semantic geometry, and GLB loading pipeline. */
export const installAdminPdfMasterplanPipelineV1 = (MapScene, {
  ADMIN_REFERENCE_AERIAL_ASSET_V1,
  ADMIN_REFERENCE_AERIAL_VERSION_V1,
  ADMIN_SEMANTIC_3D_LAYER_VERSION_V1,
  DWG_PLAN_HEADING_DEG,
  DWG_PLAN_HEADING_RAD,
  MODEL_VERTICAL_EXAGGERATION,
  PDF_MASTERPLAN_MODEL_TEXTURE_VERSION,
  PDF_MASTERPLAN_PAGE_SIZE_V1,
  PDF_MASTERPLAN_SITE_FRAME_V1,
  PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1,
  PDF_MASTERPLAN_VEHICLE_ANCHORS_V1,
  PDF_MODEL_TEXTURE_BRIGHTNESS,
  SCENE_MODEL_BASE_Z,
  loadGlbWithClientCacheV14,
  runtimeRouteV1,
  browser = globalThis,
} = {}) => {
  if (!MapScene?.prototype) throw new TypeError("PDF masterplan pipeline requires MapScene.prototype.");
  for (const [name, value] of Object.entries({
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_VERSION_V1,
    ADMIN_SEMANTIC_3D_LAYER_VERSION_V1,
    DWG_PLAN_HEADING_DEG,
    DWG_PLAN_HEADING_RAD,
    MODEL_VERTICAL_EXAGGERATION,
    PDF_MASTERPLAN_MODEL_TEXTURE_VERSION,
    PDF_MASTERPLAN_PAGE_SIZE_V1,
    PDF_MASTERPLAN_SITE_FRAME_V1,
    PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1,
    PDF_MASTERPLAN_VEHICLE_ANCHORS_V1,
    PDF_MODEL_TEXTURE_BRIGHTNESS,
    SCENE_MODEL_BASE_Z,
    loadGlbWithClientCacheV14,
    runtimeRouteV1,
  })) if (value === undefined) throw new TypeError(`PDF masterplan pipeline requires ${name}.`);
  for (const name of ["document", "Image", "CustomEvent", "performance", "console"]) {
    if (browser?.[name] == null) throw new TypeError(`PDF masterplan pipeline requires browser.${name}.`);
  }
  const { document, Image, CustomEvent, performance, console } = browser;
  class AdminPdfMasterplanPipelineV1 {
  loadAdminPdfMasterplanUnderlayV1() {
    if (
      !this.hasAttribute("data-admin-shared-public-map") ||
      !this.THREE ||
      !this.sceneStage ||
      !this.masterplanModel
    )
      return;
    // A prancha não é uma segunda superfície de fundo. Ela é carregada uma
    // única vez como fonte de textura para os meshes semânticos do GLB.
    if (
      this.adminPdfMasterplanUnderlayTextureV1 ||
      this._adminPdfMasterplanUnderlayLoading
    )
      return;
    this._adminPdfMasterplanUnderlayLoading = true;
    this.dataset.adminPdfUnderlay = "loading";
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      try {
        const THREE = this.THREE,
          sourceSize = this.masterplanModel.userData?.sourceSize;
        const sourceWidth = Math.max(0.1, Number(sourceSize?.x) || 1),
          sourceDepth = Math.max(0.1, Number(sourceSize?.z) || 1);
        const imageWidth = Math.max(1, image.naturalWidth || image.width || 1),
          imageHeight = Math.max(1, image.naturalHeight || image.height || 1);
        const pageFrame = this.hasAttribute("data-admin-shared-public-map")
          ? this.adminReferenceAerialProjectionFrameV1(
              sourceWidth,
              sourceDepth,
              { naturalWidth: imageWidth, naturalHeight: imageHeight },
            )
          : this.pdfMasterplanPageFrameV1(sourceWidth, sourceDepth);
        // O documento entra como imagem original: não aplicamos crop, chroma
        // key, remoção de logo, contraste ou qualquer edição no conteúdo.
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.set(1, 1);
        texture.offset.set(0, 0);
        texture.center.set(0, 0);
        texture.rotation = 0;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        const textureRenderer =
          this._adminStandaloneRendererV5370 || this.renderer;
        texture.anisotropy = Math.max(
          1,
          Number(textureRenderer?.capabilities?.getMaxAnisotropy?.()) || 1,
        );
        texture.needsUpdate = true;
        texture.userData = {
          source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
          textureFrame: "full image · UV 0..1 · site window preserved",
          documentTreatment: "original user supplied aerial reference",
          usage: "single map surface + trees/structures/cars only",
          brightness: 1,
        };
        // A imagem entra uma única vez como chão da cena. Lotes e ruas ficam
        // livres para hit-test/seleção e não recebem uma segunda textura.
        this.adminReferenceAerialTextureV1 = texture;
        this.adminReferenceAerialImageV1 = image;
        this.adminPdfMasterplanUnderlayTextureV1 = texture;
        this.adminPdfMasterplanTextureImageV1 = image;
        this.dataset.adminPdfUnderlay = "texture-only";
        this.dataset.adminPdfUnderlaySource = ADMIN_REFERENCE_AERIAL_ASSET_V1;
        this.dataset.adminPdfUnderlayProjection =
          "single map surface · semantic 3D objects only";
        this.dataset.adminPdfUnderlayPlacement =
          "single surface · contain · no duplicate PDF/image plane";
        this.dataset.adminPdfUnderlayImage = `${imageWidth}x${imageHeight}`;
        this.dataset.adminPdfUnderlayResolution =
          `${imageWidth}x${imageHeight} · textura usada pelo modelo · anisotropia ${texture.anisotropy}`;
        this.dataset.adminPdfUnderlayFrame =
          "full image · UV 0..1 · original aspect ratio · no crop";
        this.dataset.adminPdfUnderlaySiteFrame = `${pageFrame.left.toFixed(3)},${pageFrame.top.toFixed(3)} → ${pageFrame.right.toFixed(3)},${pageFrame.bottom.toFixed(3)}`;
        this.dataset.adminPdfDocumentTreatment =
          "reference aerial · original · no crop";
        this.dataset.adminPdfTextureMode =
          "single reference aerial · semantic objects only";
        this.dataset.adminPdfTextureBrightness = "1";
        this.dataset.adminPdfTextureVerticalShift = "0";
        this.dataset.adminReferenceAerial = "loading-surface";
        this.syncAdminReferenceAerialSurfaceV1();
        this.buildPdfMasterplan3DLayerV1(THREE, texture);
        this.syncAdminPdfMasterplanUnderlayV1();
        this.dataset.adminReferenceAerial = "ready";
        this.syncAdminReferenceAerialSurfaceV1();
        // A cena pode ter criado o relevo de fallback enquanto o raster
        // carregava. A partir daqui a foto é a única base horizontal.
        this.syncPublicTerrainRelief?.();
        this.renderer?.render(this.scene, this.camera);
      } catch (error) {
        this.dataset.adminPdfUnderlay = "error";
        this.dataset.adminPdfUnderlayError = String(
          error?.message || error,
        ).slice(0, 160);
        console.warn(
          "[Belavista admin] projeção PDF do loteamento indisponível.",
          error,
        );
      } finally {
        this._adminPdfMasterplanUnderlayLoading = false;
      }
    };
    image.onerror = () => {
      this._adminPdfMasterplanUnderlayLoading = false;
      this.dataset.adminPdfUnderlay = "error";
      this.dataset.adminPdfUnderlayError = "asset-load-failed";
    };
    image.src = runtimeRouteV1(
      ADMIN_REFERENCE_AERIAL_ASSET_V1,
      `v=${ADMIN_REFERENCE_AERIAL_VERSION_V1}`,
    );
  }

  syncAdminPdfMasterplanUnderlayV1() {
    const group = this.adminPdfMasterplanUnderlayGroupV1,
      model = this.masterplanModel;
    if (!model?.matrix) return false;
    // Compatibilidade com sessões antigas: se houver um grupo legado,
    // remova-o para que a prancha nunca volte a ser desenhada como fundo.
    if (group) {
      group.removeFromParent?.();
      this.adminPdfMasterplanUnderlayGroupV1 = null;
      this.adminPdfMasterplanUnderlayPlaneV1 = null;
    }
    const elements = this.adminPdfMasterplan3DGroupV1;
    if (elements) {
      elements.matrix.copy(model.matrix);
      elements.matrixWorldNeedsUpdate = true;
    }
    this.syncAdminReferenceAerialSurfaceV1?.();
    this.dataset.adminPdfUnderlayProjectionMatrix =
      "not applicable · texture-only GLB scene";
    if (elements)
      this.dataset.adminPdf3dProjectionMatrix = "synced with masterplanModel";
    return Boolean(elements);
  }

  pdfMasterplanPageFrameV1(sourceWidth, sourceDepth) {
    const site = PDF_MASTERPLAN_SITE_FRAME_V1;
    const siteWidth = Math.max(0.01, site.right - site.left),
      siteDepth = Math.max(0.01, site.bottom - site.top);
    const pageWidth = Math.max(0.1, Number(sourceWidth) || 1) / siteWidth;
    const pageDepth = Math.max(0.1, Number(sourceDepth) || 1) / siteDepth;
    const siteCenterU = (site.left + site.right) / 2,
      siteCenterV = (site.top + site.bottom) / 2;
    return {
      ...site,
      width: PDF_MASTERPLAN_PAGE_SIZE_V1.width,
      height: PDF_MASTERPLAN_PAGE_SIZE_V1.height,
      siteWidth,
      siteDepth,
      siteCenterU,
      siteCenterV,
      pageWidth,
      pageDepth,
      offsetX: (0.5 - siteCenterU) * pageWidth,
      offsetZ: (siteCenterV - 0.5) * pageDepth,
      frame: "full PDF page with DWG-aligned site window",
    };
  }

  adminReferenceAerialProjectionFrameV1(sourceWidth, sourceDepth, image) {
    const site = this.adminReferenceAerialFrameV1(),
      width = Math.max(1, image?.naturalWidth || image?.width || 1672),
      height = Math.max(1, image?.naturalHeight || image?.height || 942);
    const pageWidth = Math.max(0.1, Number(sourceWidth) || 1) / site.siteWidth;
    const pageDepth = Math.max(0.1, Number(sourceDepth) || 1) / site.siteDepth;
    return {
      ...site,
      width,
      height,
      pageWidth,
      pageDepth,
      offsetX: (0.5 - site.siteCenterU) * pageWidth,
      offsetZ: (site.siteCenterV - 0.5) * pageDepth,
      frame: "user supplied aerial reference · semantic GLB alignment",
    };
  }

  projectPdfElementGeometryV1(
    THREE,
    node,
    model,
    sourceWidth,
    sourceDepth,
    pageFrame = this.pdfMasterplanPageFrameV1(sourceWidth, sourceDepth),
    options = {},
  ) {
    const geometry =
        options.cloneGeometry === false
          ? node?.geometry
          : node?.geometry?.clone?.(),
      position = geometry?.getAttribute?.("position");
    if (!geometry || !position?.count) return null;
    // Cada mesh recebe o mesmo frame local da página. A matriz relativa evita
    // reexportar o GLB e mantém a geometria original com suas espessuras.
    const relative = new THREE.Matrix4()
      .copy(model.matrixWorld)
      .invert()
      .multiply(node.matrixWorld);
    const currentUv = geometry.getAttribute?.("uv"),
      canReuseUv =
        currentUv?.count === position.count && currentUv.itemSize >= 2,
      uv = canReuseUv ? currentUv : new Float32Array(position.count * 2),
      point = new THREE.Vector3(),
      orientedPoint = new THREE.Vector3();
    const orientationMatrix = this.hasAttribute("data-admin-shared-public-map")
      ? model.userData?.publicDwgAffine?.orientationMatrix ||
        new THREE.Matrix4()
      : null;
    for (let index = 0; index < position.count; index++) {
      point
        .set(position.getX(index), position.getY(index), position.getZ(index))
        .applyMatrix4(relative);
      orientedPoint
        .copy(point)
        .applyMatrix4(orientationMatrix || new THREE.Matrix4());
      const imageU =
        pageFrame.siteCenterU +
        (orientedPoint.x / Math.max(0.01, sourceWidth)) * pageFrame.siteWidth;
      // O frame X/Z do GLB segue o frame do DWG: +Z aponta para baixo na
      // prancha. Usar o sinal oposto aqui espelhava a textura em relação aos
      // números e às ruas da imagem original.
      const imageV =
        pageFrame.siteCenterV +
        (orientedPoint.z / Math.max(0.01, sourceDepth)) * pageFrame.siteDepth +
        PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1;
      const normalizedU = Math.max(0, Math.min(1, imageU)),
        normalizedV = Math.max(0, Math.min(1, 1 - imageV));
      if (canReuseUv) {
        currentUv.setXY(index, normalizedU, normalizedV);
      } else {
        uv[index * 2] = normalizedU;
        uv[index * 2 + 1] = normalizedV;
      }
    }
    if (!canReuseUv)
      geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geometry.attributes.uv.needsUpdate = true;
    return { geometry, relative };
  }

  bindPdfMapTextureToMasterplanV1(THREE, texture) {
    if (
      !this.hasAttribute("data-admin-shared-public-map") ||
      !THREE ||
      !texture?.image ||
      !this.masterplanModel ||
      !this.modelParts
    )
      return 0;
    const model = this.masterplanModel,
      sourceSize = model.userData?.sourceSize;
    const sourceWidth = Math.max(0.1, Number(sourceSize?.x) || 1),
      sourceDepth = Math.max(0.1, Number(sourceSize?.z) || 1);
    const pageFrame = this.isAdminReferenceAerialV1?.()
      ? this.adminReferenceAerialProjectionFrameV1(
          sourceWidth,
          sourceDepth,
          texture.image,
        )
      : this.pdfMasterplanPageFrameV1(sourceWidth, sourceDepth);
    model.updateMatrixWorld(true);
    // O plano de contexto usa V invertido para a orientação do chão. O modelo
    // recebe uma textura normalizada separada: seus UVs já convertem a origem
    // superior do PDF para a convenção UV do Three.js.
    const modelTexture = texture.clone();
    modelTexture.name = "BelavistaPdfMasterplanModelTexture";
    modelTexture.userData = {
      ...(modelTexture.userData || {}),
      brightness: PDF_MODEL_TEXTURE_BRIGHTNESS,
      projection: "PDF site frame → source GLB X/Z",
    };
    modelTexture.wrapS = THREE.ClampToEdgeWrapping;
    modelTexture.wrapT = THREE.ClampToEdgeWrapping;
    modelTexture.repeat.set(1, 1);
    modelTexture.offset.set(0, 0);
    modelTexture.center.set(0, 0);
    modelTexture.rotation = 0;
    modelTexture.needsUpdate = true;
    const materials = new Map();
    const materialForKind = (kind) => {
      if (materials.has(kind)) return materials.get(kind);
      const material = new THREE.MeshBasicMaterial({
        map: modelTexture,
        color: new THREE.Color(
          PDF_MODEL_TEXTURE_BRIGHTNESS,
          PDF_MODEL_TEXTURE_BRIGHTNESS,
          PDF_MODEL_TEXTURE_BRIGHTNESS,
        ),
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
        alphaTest: 0,
        depthTest: true,
        depthWrite: true,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      material.name = `BelavistaPdfMasterplanModelMaterial_${kind}`;
      material.userData = {
        pdfSemanticKind: kind,
        pdfTextureSource: ADMIN_REFERENCE_AERIAL_ASSET_V1,
        pdfTextureVersion: PDF_MASTERPLAN_MODEL_TEXTURE_VERSION,
      };
      materials.set(kind, material);
      return material;
    };
    const candidates = [];
    const addCandidates = (items, kind) =>
      items?.forEach((node) => candidates.push({ node, kind }));
    // Lotes e ruas são superfícies de seleção, não elementos 3D texturizados.
    // Somente vegetação, estruturas e os ativos visuais recebem a imagem.
    addCandidates(this.modelLandscapeNodes, "tree");
    addCandidates(this.modelLeisureNodes, "structure");
    addCandidates(this.modelParts.other, "asset");
    const geometryReferences = new Map();
    candidates.forEach(({ node }) => {
      if (!node?.isMesh || !node.geometry) return;
      geometryReferences.set(
        node.geometry,
        (geometryReferences.get(node.geometry) || 0) + 1,
      );
    });
    const seen = new Set();
    let bound = 0;
    candidates.forEach(({ node, kind: hint }) => {
      if (
        !node?.isMesh ||
        seen.has(node) ||
        /^divisa(?:[_\s-]|$)/i.test(String(node.name || ""))
      )
        return;
      seen.add(node);
      const kind = this.classifyPdfElementKindV1(node, hint);
      if (!["tree", "structure", "asset"].includes(kind)) return;
      const projected = this.projectPdfElementGeometryV1(
        THREE,
        node,
        model,
        sourceWidth,
        sourceDepth,
        pageFrame,
        {
          // O GLB atual tem geometrias exclusivas por nó. Só copie quando um
          // futuro asset compartilhar a mesma geometria entre dois nós.
          cloneGeometry: (geometryReferences.get(node.geometry) || 0) > 1,
        },
      );
      if (!projected) return;
      node.geometry = projected.geometry;
      node.material = materialForKind(kind);
      node.userData.defaultMaterial = node.material;
      node.userData.pdfMapTextureBound = true;
      node.userData.pdfMapTextureSource = ADMIN_REFERENCE_AERIAL_ASSET_V1;
      node.userData.pdfMapTextureVersion = PDF_MASTERPLAN_MODEL_TEXTURE_VERSION;
      node.userData.pdfMapTextureProjection =
        "full PDF page · semantic UV 0..1";
      node.userData.pdfMapTextureKind = kind;
      bound++;
    });
    if (!bound) {
      modelTexture.dispose?.();
      return 0;
    }
    this.adminPdfMasterplanModelTextureV1 = modelTexture;
    this.dataset.adminPdfModelTexture = "bound to source GLB semantic meshes";
    this.dataset.adminPdfModelTextureVersion =
      PDF_MASTERPLAN_MODEL_TEXTURE_VERSION;
    this.dataset.adminPdfModelTextureSource = ADMIN_REFERENCE_AERIAL_ASSET_V1;
    this.dataset.adminPdfModelTextureFrame =
      "full PDF page · normalized UV 0..1 · no crop";
    this.dataset.adminPdfModelTextureElements = String(bound);
    model.userData.pdfMapTextureBinding = {
      source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
      version: PDF_MASTERPLAN_MODEL_TEXTURE_VERSION,
      elements: bound,
      frame: "full PDF page · normalized UV 0..1 · no crop",
    };
    return bound;
  }

  createPdfVehicleExtrusionsV1(
    THREE,
    group,
    image,
    sourceWidth,
    sourceDepth,
    pageFrame = this.pdfMasterplanPageFrameV1(sourceWidth, sourceDepth),
  ) {
    if (!image?.naturalWidth || !image?.naturalHeight) return 0;
    const vehicleGroup = new THREE.Group();
    vehicleGroup.name = "BelavistaPdfVehicleExtrusions";
    vehicleGroup.renderOrder = 13;
    const imageWidth = image.naturalWidth,
      imageHeight = image.naturalHeight;
    let count = 0;
    PDF_MASTERPLAN_VEHICLE_ANCHORS_V1.forEach((anchor, index) => {
      const cropWidth = 34,
        cropHeight = 24,
        canvas = document.createElement("canvas");
      canvas.width = 72;
      canvas.height = 52;
      const context = canvas.getContext("2d");
      if (!context) return;
      const sx = Math.max(
        0,
        Math.min(
          imageWidth - cropWidth,
          anchor.u * imageWidth - cropWidth * 0.5,
        ),
      );
      const sy = Math.max(
        0,
        Math.min(
          imageHeight - cropHeight,
          anchor.v * imageHeight - cropHeight * 0.5,
        ),
      );
      context.drawImage(
        image,
        sx,
        sy,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const patch = new THREE.CanvasTexture(canvas);
      patch.colorSpace = THREE.SRGBColorSpace;
      patch.minFilter = THREE.LinearFilter;
      patch.magFilter = THREE.LinearFilter;
      patch.needsUpdate = true;
      const material = new THREE.MeshBasicMaterial({
        map: patch,
        side: THREE.DoubleSide,
        transparent: false,
        depthTest: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      material.name = `BelavistaPdfVehicleTexture_${index + 1}`;
      const width = pageFrame.pageWidth * (cropWidth / pageFrame.width),
        depth = pageFrame.pageDepth * (cropHeight / pageFrame.height),
        height = 0.42;
      const car = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material,
      );
      car.name = `PDF3D_Veiculo_${String(index + 1).padStart(2, "0")}`;
      car.position.set(
        (anchor.u - 0.5) * pageFrame.pageWidth + pageFrame.offsetX,
        height * 0.5 + 0.08,
        (anchor.v - 0.5) * pageFrame.pageDepth + pageFrame.offsetZ,
      );
      car.rotation.y = Number(anchor.angle) || 0;
      car.renderOrder = 13;
      car.frustumCulled = false;
      car.raycast = () => {};
      car.userData = {
        pdf3dElement: true,
        pdfElementKind: "vehicle",
        pdfTextureSource: ADMIN_REFERENCE_AERIAL_ASSET_V1,
        textureRegion: {
          u: anchor.u,
          v: anchor.v,
          width: cropWidth / imageWidth,
          height: cropHeight / imageHeight,
        },
        extrusionDepth: height,
        placement: "reference aerial UV anchor · visible parking vehicle",
      };
      vehicleGroup.add(car);
      count++;
    });
    group.add(vehicleGroup);
    this.pdfVehicleExtrusionGroupV1 = vehicleGroup;
    this.dataset.adminPdf3dVehicleCount = String(count);
    return count;
  }

  classifyPdfElementKindV1(node, hint = "asset") {
    const data = node?.userData || {};
    const explicit = String(
      data.pdfSemanticKind || data.pdfElementKind || "",
    ).toLowerCase();
    const normalizedHint = String(hint || "asset").toLowerCase();
    const valid = new Set([
      "lot",
      "street",
      "tree",
      "structure",
      "leisure",
      "asset",
      "vehicle",
    ]);
    if (valid.has(explicit))
      return explicit === "leisure" ? "structure" : explicit;
    if (valid.has(normalizedHint) && normalizedHint !== "asset")
      return normalizedHint === "leisure" ? "structure" : normalizedHint;

    const name = String(node?.name || "").toLowerCase();
    const role = String(
      data.belavistaRole || data.partKind || "",
    ).toLowerCase();
    if (
      role === "lot" ||
      role === "lots" ||
      /(^|[_\s-])(lote|quadra|gleba)([_\s-]|$)/.test(name)
    )
      return "lot";
    if (
      role === "street" ||
      role === "streets" ||
      role === "road" ||
      role === "curb" ||
      role === "curbs" ||
      /(asfalto|rua|road|street|meio.?fio|guia|paviment|curb)/.test(name)
    )
      return "street";
    if (
      role === "landscape" ||
      /(arvore|tree|tronco|copa|folhagem|outer.?east.?row|upper.?median.?row)/.test(
        name,
      )
    )
      return "tree";
    if (
      role === "leisure" ||
      /(area.?de.?lazer|court|gym|pavilhao|play|praca|banco.?praca|estrutura|building|edificio)/.test(
        name,
      )
    )
      return "structure";
    return "asset";
  }

  pdfLotNumberV1(node) {
    const name = String(node?.userData?.partId || node?.name || "");
    const match =
      name.match(/(?:^|[_\s-])lote[_\s-]?0*(\d+)(?:$|[_\s-])/i) ||
      name.match(/lote\D*(\d+)/i);
    if (!match) return "";
    return String(Number(match[1])).padStart(3, "0");
  }

  findPdfLotIntegrationV1(number) {
    const token = String(number ?? "").match(/\d+/)?.[0];
    if (!token) return null;
    const normalized = String(Number(token)).padStart(3, "0");
    return (
      this.pdfLotIntegrationV1?.find((item) => item.number === normalized) ||
      null
    );
  }

  pdfElementImageAnchorV1(
    THREE,
    node,
    model,
    sourceWidth,
    sourceDepth,
    pageFrame,
  ) {
    if (!THREE || !node || !model || !pageFrame) return null;
    const bounds = new THREE.Box3().setFromObject(node);
    if (bounds.isEmpty()) return null;
    const center = model.worldToLocal(bounds.getCenter(new THREE.Vector3()));
    const u =
      pageFrame.siteCenterU +
      (center.x / Math.max(0.01, sourceWidth)) * pageFrame.siteWidth;
    const v =
      pageFrame.siteCenterV +
      (center.z / Math.max(0.01, sourceDepth)) * pageFrame.siteDepth;
    return {
      u: Number(Math.max(0, Math.min(1, u)).toFixed(6)),
      v: Number(Math.max(0, Math.min(1, v)).toFixed(6)),
      x: Number((Math.max(0, Math.min(1, u)) * pageFrame.width).toFixed(2)),
      y: Number((Math.max(0, Math.min(1, v)) * pageFrame.height).toFixed(2)),
      coordinateSpace: "full PDF page · top-left origin",
    };
  }

  buildPdfMasterplan3DLayerV1(THREE, texture) {
    if (
      !this.hasAttribute("data-admin-shared-public-map") ||
      !THREE ||
      !texture ||
      !this.sceneStage ||
      !this.masterplanModel ||
      !this.modelParts ||
      !["classified", "ready"].includes(
        String(this.dataset.modelEnrichment || ""),
      )
    )
      return false;
    if (this.adminPdfMasterplan3DGroupV1) return true;
    const model = this.masterplanModel,
      sourceSize = model.userData?.sourceSize;
    const sourceWidth = Math.max(0.1, Number(sourceSize?.x) || 1),
      sourceDepth = Math.max(0.1, Number(sourceSize?.z) || 1);
    const pageFrame = this.isAdminReferenceAerialV1?.()
      ? this.adminReferenceAerialProjectionFrameV1(
          sourceWidth,
          sourceDepth,
          texture.image,
        )
      : this.pdfMasterplanPageFrameV1(sourceWidth, sourceDepth);
    const sourceModelTextureCount = this.bindPdfMapTextureToMasterplanV1(
      THREE,
      texture,
    );
    model.updateMatrixWorld(true);
    this.sceneStage.updateMatrixWorld(true);
    // A camada PDF 3D substitui a vegetação sintética usada pelo fallback
    // satelital. Remover somente esses grupos evita duplicações e preserva o
    // relevo/base cartográfica que continua servindo de chão da cena.
    for (const key of [
      "publicVegetationGroup",
      "publicTerrainVegetationGroup",
      "publicForestGroup",
      "publicGreenReliefGroup",
      "publicSocialGrassGroup",
      "publicGpsContextEnvironment",
    ]) {
      const generated = this[key];
      generated?.removeFromParent?.();
      if (generated) generated.visible = false;
      this[key] = null;
    }
    const group = new THREE.Group();
    group.name = "BelavistaPdfMasterplan3DExtrusions";
    group.matrixAutoUpdate = false;
    group.matrix.copy(model.matrix);
    group.matrixWorldNeedsUpdate = true;
    group.renderOrder = 11;
    const materials = new Map();
    const materialForKind = (kind) => {
      if (materials.has(kind)) return materials.get(kind);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
        depthTest: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      material.name = `BelavistaPdfProjectedElementTexture_${kind}`;
      material.userData = {
        pdfSemanticKind: kind,
        pdfTextureSource: ADMIN_REFERENCE_AERIAL_ASSET_V1,
      };
      materials.set(kind, material);
      return material;
    };
    const candidates = [];
    const addCandidates = (items, kind) =>
      items?.forEach((node) => candidates.push({ node, kind }));
    // O raster já mostra lotes e ruas. Eles permanecem no modelParts para
    // seleção, mas não são duplicados como volumes 3D texturizados.
    addCandidates(this.modelLandscapeNodes, "tree");
    addCandidates(this.modelLeisureNodes, "structure");
    addCandidates(this.modelParts.other, "asset");
    const seen = new Set(),
      counts = { tree: 0, structure: 0, asset: 0 };
    const lotIntegration = (this.modelParts.lots || [])
      .map((node) => {
        const number = this.pdfLotNumberV1(node);
        if (!number) return null;
        return {
          number,
          pdfImageNumber: `Lote ${number}`,
          integrationKey: `lot:${number}`,
          sourceNode: String(node.name || ""),
          partId: String(node.userData?.partId || node.name || ""),
          imageAnchor: this.pdfElementImageAnchorV1(
            THREE,
            node,
            model,
            sourceWidth,
            sourceDepth,
            pageFrame,
          ),
          pdfTextureSource: ADMIN_REFERENCE_AERIAL_ASSET_V1,
        };
      })
      .filter(Boolean);
    candidates.forEach(({ node, kind: hint }) => {
      if (
        !node?.isMesh ||
        seen.has(node) ||
        /^divisa(?:[_\s-]|$)/i.test(String(node.name || ""))
      )
        return;
      seen.add(node);
      const kind = this.classifyPdfElementKindV1(node, hint);
      if (!Object.prototype.hasOwnProperty.call(counts, kind)) return;
      if (node.userData?.pdfMapTextureBound) {
        // A textura já está no mesh semântico nativo. Criar outro Mesh com a
        // mesma geometria apenas duplica buffers e pode derrubar o renderer.
        node.visible = true;
        node.userData.pdf3dNativeVisible = true;
        node.userData.pdfSemanticKind = kind;
        counts[kind]++;
        return;
      }
      const projected = this.projectPdfElementGeometryV1(
        THREE,
        node,
        model,
        sourceWidth,
        sourceDepth,
        pageFrame,
      );
      if (!projected) return;
      // O GLB/manifesto é a fonte semântica: ele já separa cada lote, trecho,
      // árvore, área social e ativo. O PDF não classifica por cor; ele fornece
      // a textura original projetada no footprint dessa geometria.
      node.visible = true;
      node.userData.pdf3dNativeVisible = true;
      node.userData.pdfSemanticKind = kind;
      const mesh = new THREE.Mesh(projected.geometry, materialForKind(kind));
      mesh.name = `PDF3D_${kind}_${String(counts[kind] + 1).padStart(3, "0")}`;
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(projected.relative);
      mesh.matrixWorldNeedsUpdate = true;
      mesh.renderOrder = 12;
      mesh.frustumCulled = true;
      mesh.raycast = () => {};
      // O modelo-fonte agora carrega a textura do mapa diretamente. Mantemos
      // esta camada projetada para veículos e diagnóstico, mas não desenhamos
      // a cópia do elemento por cima da malha original.
      mesh.visible = !sourceModelTextureCount;
      mesh.userData = {
        pdf3dElement: true,
        pdfElementKind: kind,
        pdfTextureSource: ADMIN_REFERENCE_AERIAL_ASSET_V1,
        sourceNode: String(node.name || ""),
        sourceGeometry: "native semantic GLB mesh with preserved volume",
        extrusion: "native tree/structure/asset geometry only",
        textureFrame: "reference aerial · projected UV 0..1",
        pageFrame,
      };
      group.add(mesh);
      counts[kind]++;
    });
    const vehicleCount = this.createPdfVehicleExtrusionsV1(
      THREE,
      group,
      texture.image,
      sourceWidth,
      sourceDepth,
      pageFrame,
    );
    group.userData = {
      pdf3dLayer: true,
      version: ADMIN_SEMANTIC_3D_LAYER_VERSION_V1,
      source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
      sourceManifest: "/assets/model/masterplan-manifest.json",
      policy:
        "trees + structures + vehicles in 3D · lots and streets remain selectable surfaces",
      geometrySource:
        "native semantic GLB meshes + reference aerial vehicle crops",
      classification:
        "manifest roles + modelParts + landscapeNodes + leisureNodes → semantic visual classes",
      sourceModelTextureBinding: sourceModelTextureCount,
      semanticGeometryPolicy: sourceModelTextureCount
        ? "reuse native semantic meshes · no projected duplicate buffers"
        : "projected overlay fallback · native texture binding unavailable",
      textureFrame: "reference aerial · UV 0..1 · original aspect ratio",
      pageFrame,
      counts: { ...counts, vehicle: vehicleCount },
      lotIntegration: {
        identity: "Lote_### / DWG glbObject",
        numberField: "lotNumber",
        keyField: "pdfLotIntegrationKey",
        imageAnchorField: "pdfImageAnchor",
        records: lotIntegration,
      },
      elementClasses: [
        "lot-selection",
        "street-selection",
        "tree",
        "structure",
        "vehicle",
      ],
    };
    this.sceneStage.add(group);
    this.adminPdfMasterplan3DGroupV1 = group;
    this.adminPdfMasterplan3DTextureV1 = texture;
    this.dataset.adminPdf3dLayer = "ready";
    this.dataset.adminPdf3dVersion = ADMIN_SEMANTIC_3D_LAYER_VERSION_V1;
    this.dataset.adminPdf3dSource = ADMIN_REFERENCE_AERIAL_ASSET_V1;
    this.dataset.adminPdf3dManifest = "/assets/model/masterplan-manifest.json";
    this.dataset.adminPdf3dTexture =
      "reference aerial projected only on trees/structures · cars use image crops";
    this.dataset.adminPdf3dSourceModelTexture = sourceModelTextureCount
      ? "bound · source GLB meshes"
      : "overlay only";
    this.dataset.adminPdf3dGeometryPolicy = sourceModelTextureCount
      ? "native semantic mesh reuse · projected duplicates disabled"
      : "projected overlay fallback · native binding unavailable";
    this.dataset.adminPdf3dVisibility =
      "trees + structures + cars only · lots/streets selection surfaces";
    this.dataset.adminPdf3dPolicy =
      "árvores, estruturas e carros em 3D · lotes e ruas selecionáveis";
    this.dataset.adminPdf3dElements = `lotes-selecao:${this.modelParts.lots?.length || 0}|ruas-selecao:${this.modelParts.streets?.length || 0}|arvores:${counts.tree}|estruturas:${counts.structure}|ativos:${counts.asset}|veiculos:${vehicleCount}`;
    this.dataset.adminPdf3dNativeGeometry =
      "only trees + structures + cars · no lot/street visual extrusion";
    this.dataset.adminPdf3dTexturePolicy =
      "single reference aerial surface · semantic visual objects only";
    this.pdfLotIntegrationV1 = lotIntegration.sort(
      (a, b) => Number(a.number) - Number(b.number),
    );
    this.dataset.adminPdfLotCount = String(this.pdfLotIntegrationV1.length);
    this.dataset.adminPdfLotNumbers = this.pdfLotIntegrationV1
      .map((item) => item.number)
      .join("|");
    this.dataset.adminPdfLotIntegration =
      "lotNumber + pdfLotIntegrationKey + pdfImageAnchor";
    this.dispatchEvent(
      new CustomEvent("pdf-lot-integration-ready", {
        bubbles: true,
        detail: {
          sourceManifest: "/assets/model/masterplan-manifest.json",
          textureSource: ADMIN_REFERENCE_AERIAL_ASSET_V1,
          records: this.pdfLotIntegrationV1,
        },
      }),
    );
    this.renderer?.render(this.scene, this.camera);
    return true;
  }

  loadMasterplan(THREE, GLTFLoader) {
    if (this._modelLoadStarted) return;
    this._modelLoadStarted = true;

    const perf = (globalThis.__BELAVISTA_ADMIN_MODEL_STATE__ = {
      version: "5.3.67",
      phase: "network",
      startedAt: performance.now(),
      progress: 0,
      meshCount: 0,
      processedMeshes: 0,
      operationalGeometry: "deferred",
    });

    const mark = (phase, extra = {}) => {
      perf.phase = phase;
      Object.assign(perf, extra);
      this.dataset.modelBootPhase = phase;
      this.dataset.modelBootVersion = "5.3.67";
      this.persist3dBootPhaseV5367(phase, extra);
    };

    const loader = new GLTFLoader();
    const modelUrl = runtimeRouteV1(
      "/assets/model/alianca_park_masterplan_preview.glb",
      "v=gpu-staged-5367",
    );
    this.dataset.modelSource = "loaded-glb";
    this.dataset.modelRender = "webgl-live-glb";
    this.dataset.modelRasterized = "false";
    // Nem todos os proxies informam Content-Length. Um progresso inicial e
    // fases internas evitam que a abertura fique congelada em 38% mesmo
    // quando o GLB esteja sendo transferido normalmente em chunked encoding.
    this.dataset.modelProgress = "2";

    loadGlbWithClientCacheV14(
      loader,
      modelUrl,
      (gltf) => {
        try {
          this.dataset.modelProgress = "42";
          mark("parsed", {
            parsedAt: performance.now(),
            downloadAndParseMs: Math.round(performance.now() - perf.startedAt),
          });

          const sourceModel = gltf.scene;
          const sourceBox = new THREE.Box3().setFromObject(sourceModel);
          const size = sourceBox.getSize(new THREE.Vector3());
          const sourceCenter = sourceBox.getCenter(new THREE.Vector3());

          sourceModel.position.set(
            -sourceCenter.x,
            -sourceBox.min.y,
            -sourceCenter.z,
          );

          const model = new THREE.Group();
          model.name = "MasterplanFrame";
          model.add(sourceModel);

          const largest = Math.max(size.x, size.y, size.z) || 1;
          const factor = 145 / largest;

          model.scale.set(factor, factor * MODEL_VERTICAL_EXAGGERATION, factor);
          model.rotation.set(Math.PI / 2, 0, DWG_PLAN_HEADING_RAD);
          model.updateMatrixWorld(true);

          const rawOrientedBox = new THREE.Box3().setFromObject(model);
          const baseLift =
            Math.max(0, -rawOrientedBox.min.z) + SCENE_MODEL_BASE_Z;
          model.position.z += baseLift;
          model.updateMatrixWorld(true);

          const orientedBox = new THREE.Box3().setFromObject(model);
          const groundedCenter = orientedBox.getCenter(new THREE.Vector3());
          const orientedSize = orientedBox.getSize(new THREE.Vector3());

          model.userData.baseScale = factor;
          model.userData.verticalExaggeration = MODEL_VERTICAL_EXAGGERATION;
          model.userData.sourceSize = size;
          model.userData.alignedToMapPlane = true;
          model.userData.planHeadingRad = DWG_PLAN_HEADING_RAD;
          model.userData.planHeadingDeg = DWG_PLAN_HEADING_DEG;
          model.userData.aerialGuideAlignment =
            "DWG affine heading · visual road-guide fit";
          model.userData.mapBaseZ = SCENE_MODEL_BASE_Z;
          model.userData.mapBaseLift = baseLift;
          model.userData.sourceBoundsCenter = sourceCenter.clone();
          model.userData.centeredBoundsCenter = groundedCenter.clone();
          model.userData.canonicalReference =
            "PDF-derived GLB checked against DWG lot geometry";

          this.modelSourceFootprint = {
            x: orientedSize.x,
            y: orientedSize.y,
            scale: factor,
          };
          this.masterplanModel = model;
          this.loadAdminPdfMasterplanUnderlayV1();
          this._solarShadowBounds = orientedBox.clone();
          this.configureSolarShadows(this._solarShadowBounds);
          this.masterplanLargest = largest;
          this.dataset.modelHeight = `${MODEL_VERTICAL_EXAGGERATION.toFixed(2)}x vertical · base no plano do mapa`;
          this.dataset.modelBaseZ = String(SCENE_MODEL_BASE_Z);
          this.dataset.modelBaseLift = baseLift.toFixed(3);
          this.dataset.modelLocalOrigin = `centered GLB frame · ${groundedCenter.x.toFixed(3)},${groundedCenter.y.toFixed(3)},${groundedCenter.z.toFixed(3)}`;
          this.dataset.modelAxis =
            "source Y → world +Z · footprint Y corrigido";
          this.dataset.modelPlanHeading =
            DWG_PLAN_HEADING_DEG.toFixed(3) + "° · DWG affine";
          this.dataset.modelAerialGuide =
            "lateral + superior · transformação geográfica aplicada";

          // v5.3.67: nenhum mesh toca a GPU em massa.
          const meshes = [];
          let triangleEstimate = 0;
          model.traverse((node) => {
            if (!node.isMesh) return;
            const geometry = node.geometry;
            const triangles = geometry?.index
              ? Math.floor((geometry.index.count || 0) / 3)
              : Math.floor(
                  (geometry?.getAttribute?.("position")?.count || 0) / 3,
                );
            node.userData.__v5367Triangles = Number(triangles) || 0;
            node.castShadow = true;
            node.receiveShadow = true;
            triangleEstimate += node.userData.__v5367Triangles;
            node.visible = false;
            node.frustumCulled = true;
            meshes.push(node);
          });

          meshes.sort(
            (a, b) =>
              (a.userData.__v5367Triangles || 0) -
              (b.userData.__v5367Triangles || 0),
          );

          perf.meshCount = meshes.length;
          perf.triangleEstimate = triangleEstimate;
          this.dataset.modelMeshCount = String(meshes.length);
          this.dataset.modelTriangleEstimate = String(triangleEstimate);

          this.modelGroup.add(model);
          this.modelGroup.visible = true;

          this.modelReady = false;
          this._modelGpuReady = false;
          this.dataset.modelReady = "false";
          this.dataset.modelGpuReady = "false";
          this.dataset.modelRender = "webgl-staging";
          this.dataset.modelParts = "staging GPU";
          this.classList.remove("model-ready");

          mark("gpu-staging", {
            meshCount: meshes.length,
            triangleEstimate,
          });

          // Primeiro render = cena sem nenhum mesh do GLB visível.
          this.renderer?.render(this.scene, this.camera);

          this.stageMasterplanGpuV5367(THREE, model, meshes, perf, mark).catch(
            (error) => {
              mark("gpu-stage-error", {
                error: String(error?.message || error),
              });
              this.dataset.modelError = "gpu-stage-failed";
              console.error(
                "[Aliança Park 3D v5.3.67] staging GPU falhou.",
                error,
              );
            },
          );
        } catch (error) {
          mark("processing-error", { error: String(error?.message || error) });
          this.dataset.modelError = "processamento-falhou";
          this.dataset.modelRender = "fallback";
          console.warn(
            "Modelo GLB carregado mas não pôde ser processado.",
            error,
          );
        }
      },
      (progress) => {
        if (progress.total) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          this.dataset.modelProgress = percent;
          perf.progress = percent;
          this.updateMap3DLoadingScreenV1("download", { progress: percent });
        }
      },
      (err) => {
        mark("network-error", { error: String(err?.message || err) });
        this.dataset.modelError = "arquivo-indisponivel";
        this.dataset.modelRender = "fallback";
        console.warn("Modelo GLB indisponível, mantendo mapa 2D.", err);
      },
    );
  }

  // GPU staging and semantic model enrichment are installed from model-gpu-enrichment-v5367.mjs.
  }
  for (const name of Object.getOwnPropertyNames(AdminPdfMasterplanPipelineV1.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(MapScene.prototype, name, Object.getOwnPropertyDescriptor(AdminPdfMasterplanPipelineV1.prototype, name));
  }
};
