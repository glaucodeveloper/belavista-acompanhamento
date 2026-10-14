export const assertPublicModelPresentationDependenciesV1 = (MapScene) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Public model presentation requires the existing MapScene constructor.");
  return MapScene;
};

export const installPublicModelPresentationV1 = (MapScene) => {
  assertPublicModelPresentationDependenciesV1(MapScene);
  const PublicModelPresentationMethodsV1 = class {
    applyPublicPresentationStyle(THREE) {
      if (
        !this.isPublicMapVisual() ||
        this._publicPresentationStyleReady ||
        !this.modelParts
      )
        return;
      this._publicPresentationStyleReady = true;

      // A fotografia aérea é o chão da experiência pública. Os lotes não
      // recebem uma nova textura verde: ficam translúcidos e são definidos por
      // contornos brancos, como uma implantação comercial sobre o terreno real.
      const pdfProjectionMode = this.hasAttribute("data-admin-shared-public-map");
      const referenceAerialMode =
        this.isAdminReferenceAerialV1?.() ||
        this.hasAttribute("data-admin-shared-public-map");
      const lotFill = referenceAerialMode
        ? new THREE.MeshBasicMaterial({
            color: 0x78a9ff,
            transparent: true,
            opacity: 0.045,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true,
          })
        : new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.032,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
      this.publicLotSurfaceMaterial = lotFill;
      const lotOutline = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.84,
        depthWrite: false,
        depthTest: true,
      });
      let outlines = 0;
      // Os markers comerciais usam somente os nós canônicos Lote_###. Os
      // demais meshes classificados como lote são auxiliares/duplicatas do
      // GLB; desenhá-los aqui criava contornos que não correspondiam à âncora
      // do marker e dava a impressão de que o número estava fora do lote.
      const publicLots = this.canonicalPublicLotParts();
      for (const lot of publicLots) {
        lot.material = lotFill;
        lot.userData.defaultMaterial = lotFill;
        if (lot.userData.publicLotOutline || !lot.geometry) continue;
        try {
          const edge = new THREE.LineSegments(
            new THREE.EdgesGeometry(lot.geometry, 12),
            lotOutline,
          );
          edge.name = `${lot.name || "Lote"}__public_white_outline`;
          edge.position.z = 0.045;
          edge.renderOrder = 20;
          // Na projeção do PDF, as divisas e a numeração já vêm da própria
          // textura projetada. Preserve o mesh nativo, mas desligue a linha.
          edge.visible = !referenceAerialMode;
          edge.raycast = () => {};
          lot.add(edge);
          lot.userData.publicLotOutline = edge;
          outlines++;
        } catch {}
      }
      if (referenceAerialMode) {
        // Todo lote continua hit-testável sem cobrir a implantação de referência.
        for (const lot of this.modelParts.lots || []) {
          if (!lot || /^divisa(?:[_\s-]|$)/i.test(String(lot.name || "")))
            continue;
          lot.material = lotFill;
          lot.userData.defaultMaterial = lotFill;
          lot.userData.selectableMapArea = true;
          lot.userData.mapSelectionKind = "lot";
          lot.userData.mapSelectionSurface = "lot";
        }
      }
      // Remove os antigos selos/placas 2D do GLB; os marcadores 3D são a
      // representação comercial pública já montada pelo catálogo.
      for (const badge of this.lotStatusBadges || []) badge.removeFromParent?.();
      this.lotStatusBadges = [];
      this.masterplanModel?.traverse?.((node) => {
        if (
          /lote.*(?:status|badge)|(?:status|badge).*lote/i.test(
            String(node.name || ""),
          )
        )
          node.visible = false;
      });
      // Árvores antigas do GLB usam coordenadas de apresentação, não do DWG.
      let hiddenLegacyTrees = 0;
      for (const node of this.modelLandscapeNodes || []) {
        if (!node?.isMesh) continue;
        const name = String(node.name || "").toLowerCase();
        const box = new THREE.Box3().setFromObject(node),
          size = box.getSize(new THREE.Vector3());
        if (
          !referenceAerialMode &&
          (/arvore|tree|tronco|trunk|copa|folhagem|folha|row|fila/.test(name) ||
            (size.x < 8 && size.y < 8))
        ) {
          node.visible = false;
          hiddenLegacyTrees++;
        }
      }
      let hiddenReferenceGround = 0;
      if (referenceAerialMode) {
        // Pisos já presentes na foto não são duplicados como objetos 3D.
        const duplicatedGround =
          /area.?de.?lazer.?base|area.?verde|grama|grass|pavilhao.?base|court(?:center|[_ -]?[abc])|gym.?pad(?!.*border)|playground.?area/;
        for (const node of this.modelLeisureNodes || []) {
          const name = String(node?.name || "").toLowerCase();
          if (!node?.isMesh || !duplicatedGround.test(name)) continue;
          node.visible = false;
          node.userData.referenceAerialVisualHidden = true;
          node.userData.referenceAerialHiddenReason =
            "ground/social surface already present in aerial reference";
          node.raycast = () => {};
          hiddenReferenceGround++;
        }
      }
      this.dataset.publicReferenceGroundMeshesHidden = String(hiddenReferenceGround);
      this.dataset.publicLegacyTreesHidden = String(hiddenLegacyTrees);
      if (referenceAerialMode) {
        const large = [];
        this.masterplanModel?.traverse?.((node) => {
          if (!node?.isMesh || !node.visible) return;
          const box = new THREE.Box3().setFromObject(node),
            size = box.getSize(new THREE.Vector3());
          if (size.x < 18 && size.y < 18) return;
          large.push(
            `${String(node.name || "mesh").slice(0, 80)}:${size.x.toFixed(1)}x${size.y.toFixed(1)}x${size.z.toFixed(1)}`,
          );
        });
        this.dataset.publicReferenceLargeMeshes =
          large.slice(0, 80).join("|") || "none";
      }

      // Diagnóstico da camada pública sem abrir a cena Three.js ao visitante.
      if (this.isPublicMapVisual()) {
        const visibleOther = (this.modelParts.other || [])
          .filter((node) => node?.visible)
          .map((node) => String(node.name || "other"));
        this.dataset.publicVisibleOtherMeshes = visibleOther.length
          ? visibleOther.slice(0, 80).join("|")
          : "none";
        this.dataset.publicVisibleOtherCount = String(visibleOther.length);
      }

      // No mapa público a imagem aérea é a referência canônica das vias.
      const referenceStreetSelectionMaterial = referenceAerialMode
        ? (this.adminReferenceAerialStreetSelectionMaterialV1 ??=
            new THREE.MeshBasicMaterial({
              color: 0x78a9ff,
              transparent: true,
              opacity: 0.035,
              side: THREE.DoubleSide,
              depthWrite: false,
              depthTest: true,
            }))
        : null;
      for (const street of this.modelParts.streets || []) {
        if (this.isPublicMapVisual() && !referenceAerialMode) {
          const asphalt = this.makeSiteSurfaceMaterial(
            THREE,
            street.userData.defaultMaterial || street.material,
            "asphalt",
          );
          street.material = asphalt;
          street.userData.defaultMaterial = asphalt;
          street.visible = false;
          street.userData.publicRoadBaseHidden = true;
          street.raycast = () => {};
        } else if (referenceAerialMode) {
          street.material = referenceStreetSelectionMaterial;
          street.userData.defaultMaterial = referenceStreetSelectionMaterial;
          street.visible = true;
          delete street.userData.publicRoadBaseHidden;
          delete street.userData.publicSatelliteRoadHidden;
          street.userData.selectableMapArea = true;
          street.userData.mapSelectionKind = "street";
          delete street.raycast;
          street.userData.mapSelectionSurface = "street";
        }
      }

      // Pisos retangulares derivados de bounding boxes não fazem parte do GLB.
      if (this.publicLeisureConcreteGroup) {
        this.publicLeisureConcreteGroup.removeFromParent?.();
        this.publicLeisureConcreteGroup.traverse?.((node) => {
          node.geometry?.dispose?.();
        });
        this.publicLeisureConcreteGroup = null;
      }
      this.dataset.publicLotPresentation = referenceAerialMode
        ? `reference-aerial-selection-surfaces · native-outlines-hidden:${outlines}`
        : `white-outlines:${outlines}`;
      this.dataset.publicGround = referenceAerialMode
        ? "user aerial reference · no duplicate lot/street raster"
        : "satellite image · no synthetic grass under lots";
      this.dataset.publicLeisureGround =
        "original GLB social surfaces only · no synthetic planes";
      this.dataset.publicLeisurePadPolicy =
        "disabled · no bounding-box concrete pads";
      this.disablePublicSyntheticRoads();
      this.dataset.publicRoadTexture =
        "disabled · satellite image is the road surface";
      this.dataset.publicRoadTextureRequired = "false";
      this.dataset.publicRoadTextureSource =
        "DWG-centred aerial ground · native road geometry hidden";
      this.dataset.publicRoadPolicy = "satellite-only";
      this.dataset.publicModelAlignment =
        "DWG plan heading preserved · guide roads come from aerial image";
      this.disablePublicCobbleTexture();
      this.setPublicPavingView("satellite", 0);
    }
  };
  Object.defineProperty(
    MapScene.prototype,
    "applyPublicPresentationStyle",
    Object.getOwnPropertyDescriptor(
      PublicModelPresentationMethodsV1.prototype,
      "applyPublicPresentationStyle",
    ),
  );
  return MapScene;
};
