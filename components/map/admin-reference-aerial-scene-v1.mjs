/** Installs the aerial base-plane and raster-derived environment synchronization on MapScene. */
export const installAdminReferenceAerialSceneV1 = (MapScene, {
  ADMIN_REFERENCE_AERIAL_ASSET_V1,
  ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1,
  ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1,
  ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
  ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
  ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
  SCENE_MAP_Z,
  document: documentRef = globalThis.document,
} = {}) => {
  if (!MapScene?.prototype) throw new TypeError("Reference aerial scene requires MapScene.prototype.");
  if (!documentRef?.createElement) throw new TypeError("Reference aerial scene requires document.createElement().");
  for (const [name, value] of Object.entries({
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1,
    ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1,
    ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
    ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
    ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
    SCENE_MAP_Z,
  })) if (value === undefined) throw new TypeError(`Reference aerial scene requires ${name}.`);
  const document = documentRef;
  class AdminReferenceAerialSceneV1 {
  syncAdminReferenceAerialEnvironmentV1() {
    const THREE = this.THREE,
      stage = this.sceneStage,
      surface = this.mapSurface,
      texture = this.adminReferenceAerialTextureV1,
      image = texture?.image;
    if (!THREE || !stage || !surface || !image) return false;

    const imageWidth = Math.max(1, image.naturalWidth || image.width || 1),
      imageHeight = Math.max(1, image.naturalHeight || image.height || 1),
      rasterWidth = 192,
      rasterHeight = Math.max(
        64,
        Math.round((rasterWidth * imageHeight) / imageWidth),
      ),
      rasterCanvas = document.createElement("canvas");
    rasterCanvas.width = rasterWidth;
    rasterCanvas.height = rasterHeight;
    const rasterContext = rasterCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!rasterContext) return false;
    try {
      rasterContext.drawImage(image, 0, 0, rasterWidth, rasterHeight);
    } catch {
      return false;
    }
    const pixels = rasterContext.getImageData(
      0,
      0,
      rasterWidth,
      rasterHeight,
    ).data;
    const sampleAt = (u, v) => {
      const x = Math.max(
          0,
          Math.min(rasterWidth - 1, Math.round(Number(u) * (rasterWidth - 1))),
        ),
        y = Math.max(
          0,
          Math.min(
            rasterHeight - 1,
            Math.round(Number(v) * (rasterHeight - 1)),
          ),
        ),
        offset = (y * rasterWidth + x) * 4,
        r = pixels[offset],
        g = pixels[offset + 1],
        b = pixels[offset + 2],
        luma = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255,
        green = Math.max(0, Math.min(1, (g - Math.max(r, b) + 18) / 92));
      return { r, g, b, luma, green };
    };
    let terrainContactOffset = 0;
    const terrainHeightRawAt = (u, v) => {
      const sample = sampleAt(u, v);
      // A fotografia informa a leitura de cobertura e iluminação; as ondas
      // abaixo dão continuidade espacial ao terreno entre os pixels. A
      // amplitude fica abaixo da implantação para que a topografia não
      // atravesse lotes, ruas ou a camada semântica do loteamento.
      const broad = Math.sin((u * 1.35 + v * 0.42) * Math.PI * 2);
      const cross = Math.cos((u * 0.68 - v * 1.18) * Math.PI * 2 + 0.7);
      const diagonal = Math.sin((u + v) * Math.PI * 5.4 + 1.15) * 0.34;
      const rolling =
        (broad * 0.48 + cross * 0.36 + diagonal) *
        ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2;
      return -0.36 + sample.luma * 0.2 + sample.green * 0.06 + rolling;
    };
    const terrainHeightAt = (u, v) =>
      terrainHeightRawAt(u, v) + terrainContactOffset;

    const surfaceWidth = Math.max(1, Math.abs(Number(surface.scale.x) || 1)),
      surfaceHeight = Math.max(1, Math.abs(Number(surface.scale.y) || 1)),
      terrainKey = [
        texture.uuid || "reference-aerial",
        Number(surface.position.x || 0).toFixed(3),
        Number(surface.position.y || 0).toFixed(3),
        surfaceWidth.toFixed(3),
        surfaceHeight.toFixed(3),
      ].join("|");

    let terrain = this.adminReferenceAerialTerrainV1;
    if (!terrain) {
      const geometry = new THREE.PlaneGeometry(
        1,
        1,
        ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1,
        ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1,
      );
      terrain = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: texture,
          side: THREE.DoubleSide,
          transparent: false,
          depthTest: true,
          depthWrite: true,
          toneMapped: false,
        }),
      );
      terrain.name = "BelavistaAdminReferenceAerialBasePlane";
      terrain.renderOrder = -30;
      terrain.frustumCulled = false;
      terrain.receiveShadow = true;
      terrain.userData = {
        adminReferenceEnvironment: true,
        kind: "terrain",
        source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
        texturePolicy: "single full-image aerial texture",
        geometry: "subdivided relief from aerial luminance and vegetation",
        reliefProfile: "deterministic rolling undulation · presentation-only",
        reliefAmplitude: ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2,
      };
      stage.add(terrain);
      this.adminReferenceAerialTerrainV1 = terrain;
    }
    // O método pode ser chamado após uma montagem pública/legada. A textura
    // administrativa precisa estar no stage que será realmente renderizado.
    if (terrain.parent !== stage) stage.add(terrain);
    if (terrain.material?.type !== "MeshBasicMaterial") {
      const previousMaterial = terrain.material;
      terrain.material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
        side: THREE.DoubleSide,
        transparent: false,
        depthTest: true,
        depthWrite: true,
        toneMapped: false,
      });
      if (Array.isArray(previousMaterial))
        previousMaterial.forEach((item) => item?.dispose?.());
      else previousMaterial?.dispose?.();
    }
    terrain.position.copy(surface.position);
    terrain.rotation.copy(surface.rotation);
    terrain.scale.copy(surface.scale);
    // A única fotografia fica nesta malha subdividida. O plano original é
    // ocultado depois da criação para não desenhar o fundo duas vezes.
    // O modelo foi apoiado com a base em Z=0. O antigo -0.52 criava uma
    // segunda altura artificial: a foto parecia um plano abaixo do GLB e a
    // separação aumentava conforme a câmera baixava. Recalibramos o relevo
    // abaixo para que o ponto mais alto fique logo sob a base do modelo.
    terrain.position.z = 0;
    terrain.material.map = texture;
    terrain.material.color?.setRGB?.(1, 1, 1);
    terrain.material.needsUpdate = true;
    const terrainPosition = terrain.geometry.getAttribute("position");
    let terrainMaxRawHeight = -Infinity;
    for (let index = 0; index < terrainPosition.count; index++) {
      const u = terrainPosition.getX(index) + 0.5,
        v = 0.5 - terrainPosition.getY(index);
      terrainMaxRawHeight = Math.max(
        terrainMaxRawHeight,
        terrainHeightRawAt(u, v),
      );
    }
    terrainContactOffset = -terrainMaxRawHeight;
    for (let index = 0; index < terrainPosition.count; index++) {
      const u = terrainPosition.getX(index) + 0.5,
        v = 0.5 - terrainPosition.getY(index);
      // A fotografia e a base do GLB precisam compartilhar um único plano
      // físico. O relevo calculado do raster continua disponível para a
      // camada semântica, mas não deforma a textura-base nem a deixa abaixo
      // do modelo.
      terrainPosition.setZ(index, 0);
    }
    terrainPosition.needsUpdate = true;
    terrain.geometry.computeVertexNormals();
    terrain.geometry.computeBoundingSphere();
    terrain.visible = true;
    this.dataset.adminReferenceAerialTerrain = `${ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_X_V1 + 1}×${ADMIN_REFERENCE_AERIAL_TERRAIN_SEGMENTS_Y_V1 + 1} · textura aérea plana em Z=0 · relevo semântico separado`;
    this.dataset.adminReferenceAerialGroundPlane =
      "flat textured aerial plane · Z=0 · model base coplanar";

    if (this.__adminReferenceAerialEnvironmentKeyV1 === terrainKey) {
      surface.visible = false;
      this.dataset.mapSurfaceVisible = "false";
      this.dataset.adminReferenceAerialEnvironment = "ready";
      return true;
    }

    const previous = this.adminReferenceAerialEnvironmentV1;
    if (previous) {
      previous.removeFromParent?.();
      previous.traverse?.((node) => {
        node.geometry?.dispose?.();
        const material = node.material;
        if (!material) return;
        const materials = Array.isArray(material) ? material : [material];
        materials.forEach((item) => {
          if (item?.map?.userData?.adminReferenceAerialCrop)
            item.map.dispose?.();
          item?.dispose?.();
        });
      });
    }

    const environment = new THREE.Group();
    environment.name = "BelavistaAdminReferenceAerialEnvironment";
    environment.renderOrder = 3;
    environment.userData = {
      adminReferenceEnvironment: true,
      version: ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1,
      source: ADMIN_REFERENCE_AERIAL_ASSET_V1,
      policy:
        "entire aerial image · terrain texture + raster-derived trees only",
      coordinateSpace: "sceneStage local · same surface transform",
    };
    const toScenePoint = (u, v, lift = 0) => ({
      x: Number(surface.position.x || 0) + (u - 0.5) * surfaceWidth,
      y: Number(surface.position.y || 0) + (0.5 - v) * surfaceHeight,
      z:
        Number(terrain.position.z || 0) +
        terrainHeightAt(u, v) +
        Number(lift || 0),
    });
    const frame = this.adminReferenceAerialFrameV1();
    const insideSiteWindow = (u, v) =>
      u >= frame.left - 0.018 &&
      u <= frame.right + 0.018 &&
      v >= frame.top - 0.018 &&
      v <= frame.bottom + 0.018;

    const treeMaterials = [0x1d542e, 0x2e7138, 0x438a45].map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 1,
          metalness: 0,
          side: THREE.DoubleSide,
        }),
    );
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x684a31,
      roughness: 1,
      metalness: 0,
    });
    const trunkGeometry = new THREE.CylinderGeometry(0.07, 0.11, 0.72, 6);
    const crownGeometry = new THREE.ConeGeometry(0.34, 0.78, 7);
    const crownTopGeometry = new THREE.ConeGeometry(0.24, 0.58, 7);
    const treeGroup = new THREE.Group();
    treeGroup.name = "BelavistaAdminReferenceAerialTrees";
    treeGroup.userData = {
      source: "green-canopy candidates from full aerial image",
      kind: "trees",
    };
    const treeCandidates = [];
    const scanWidth = 64,
      scanHeight = Math.max(
        24,
        Math.round((scanWidth * imageHeight) / imageWidth),
      );
    for (let gy = 1; gy < scanHeight - 1; gy++)
      for (let gx = 1; gx < scanWidth - 1; gx++) {
        const u = (gx + 0.5) / scanWidth,
          v = (gy + 0.5) / scanHeight,
          sample = sampleAt(u, v);
        if (insideSiteWindow(u, v) || sample.green < 0.33) continue;
        const score =
          sample.green * 100 +
          Math.max(0, 0.72 - sample.luma) * 24 +
          ((gx * 17 + gy * 11) % 13) * 0.25;
        treeCandidates.push({ u, v, sample, score });
      }
    treeCandidates.sort((a, b) => b.score - a.score);
    const selectedTrees = [];
    for (const candidate of treeCandidates) {
      if (
        selectedTrees.every(
          (other) =>
            Math.hypot(candidate.u - other.u, candidate.v - other.v) >= 0.035,
        )
      )
        selectedTrees.push(candidate);
      if (selectedTrees.length >= 150) break;
    }
    const treeWorldSize = Math.max(
      2.2,
      Math.min(surfaceWidth, surfaceHeight) * 0.012,
    );
    selectedTrees.forEach((candidate, index) => {
      const point = toScenePoint(candidate.u, candidate.v, 0.018),
        tree = new THREE.Group(),
        size = treeWorldSize * (0.72 + ((index * 7) % 9) * 0.045);
      tree.position.set(point.x, point.y, point.z);
      tree.rotation.z = (index * 2.3999632297) % (Math.PI * 2);
      tree.scale.setScalar(size);
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial),
        crown = new THREE.Mesh(crownGeometry, treeMaterials[index % 3]),
        crownTop = new THREE.Mesh(
          crownTopGeometry,
          treeMaterials[(index + 1) % treeMaterials.length],
        );
      trunk.position.z = 0.36;
      crown.position.z = 0.82;
      crownTop.position.z = 1.28;
      tree.add(trunk, crown, crownTop);
      tree.userData = {
        adminReferenceEnvironment: true,
        kind: "tree",
        source: "aerial-green-canopy",
        imageUv: [
          Number(candidate.u.toFixed(4)),
          Number(candidate.v.toFixed(4)),
        ],
        terrainAnchor: [point.x, point.y, point.z],
      };
      tree.traverse((node) => {
        node.castShadow = true;
        node.receiveShadow = true;
        node.raycast = () => {};
      });
      treeGroup.add(tree);
    });

    // A fotografia já contém as casas reais: sem projeções sintéticas.
    // Veículos são detectados em uma grade mais fina que a usada para casas:
    // isso permite capturar os pontos claros/coloridos das vias e do
    // estacionamento sem transformar a textura inteira em geometria. Cada
    // candidato recebe um volume pequeno e não selecionável, sempre ancorado
    // no mesmo relevo e no mesmo UV da imagem de fundo.
    const vehicleGroup = new THREE.Group();
    vehicleGroup.name = "BelavistaAdminReferenceAerialVehicles";
    vehicleGroup.userData = {
      source: "bright/color vehicle candidates from full aerial image",
      kind: "cars",
      coordinateSpace: "full image UV → shared terrain frame",
    };
    const vehicleCandidates = [],
      vehicleScanWidth = 128,
      vehicleScanHeight = Math.max(
        48,
        Math.round((vehicleScanWidth * imageHeight) / imageWidth),
      ),
      sampleVehicleSignal = (u, v) => {
        const sample = sampleAt(u, v),
          du = 1 / vehicleScanWidth,
          dv = 1 / vehicleScanHeight,
          neighbours = [
            sampleAt(u - du, v),
            sampleAt(u + du, v),
            sampleAt(u, v - dv),
            sampleAt(u, v + dv),
          ],
          contrast =
            neighbours.reduce(
              (sum, other) => sum + Math.abs(sample.luma - other.luma),
              0,
            ) / neighbours.length,
          saturation =
            (Math.max(sample.r, sample.g, sample.b) -
              Math.min(sample.r, sample.g, sample.b)) /
            255,
          roadLike = sample.green < 0.3 && sample.luma > 0.16;
        return {
          sample,
          contrast,
          saturation,
          roadLike,
          colorful:
            saturation > 0.2 && Math.max(sample.r, sample.g, sample.b) > 100,
          bright: sample.luma > 0.74,
        };
      };
    for (let gy = 1; gy < vehicleScanHeight - 1; gy++)
      for (let gx = 1; gx < vehicleScanWidth - 1; gx++) {
        const u = (gx + 0.5) / vehicleScanWidth,
          v = (gy + 0.5) / vehicleScanHeight,
          signal = sampleVehicleSignal(u, v);
        if (
          !signal.roadLike ||
          signal.contrast < 0.045 ||
          (!signal.colorful && !signal.bright)
        )
          continue;
        vehicleCandidates.push({
          gx,
          gy,
          u,
          v,
          signal,
          score:
            signal.contrast * 120 +
            signal.saturation * 24 +
            (signal.bright ? 12 : 0) +
            ((gx * 19 + gy * 7) % 11) * 0.18,
        });
      }
    vehicleCandidates.sort((a, b) => b.score - a.score);
    const selectedVehicles = [],
      vehicleSpacing = 0.022;
    for (const candidate of vehicleCandidates) {
      if (
        selectedVehicles.every(
          (other) =>
            Math.hypot(candidate.u - other.u, candidate.v - other.v) >=
            vehicleSpacing,
        )
      )
        selectedVehicles.push(candidate);
      if (selectedVehicles.length >= 42) break;
    }
    const vehicleLength = Math.max(
        1.15,
        Math.min(surfaceWidth, surfaceHeight) * 0.0085,
      ),
      vehicleWidth = vehicleLength * 0.42,
      vehicleBodyHeight = Math.max(0.14, vehicleLength * 0.12),
      vehicleBodyGeometry = new THREE.BoxGeometry(
        vehicleLength,
        vehicleWidth,
        vehicleBodyHeight,
      ),
      vehicleCabinGeometry = new THREE.BoxGeometry(
        vehicleLength * 0.54,
        vehicleWidth * 0.76,
        vehicleBodyHeight * 0.72,
      ),
      vehicleWheelGeometry = new THREE.CylinderGeometry(
        vehicleWidth * 0.13,
        vehicleWidth * 0.13,
        vehicleWidth * 0.09,
        8,
      ),
      vehicleWheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x172028,
        roughness: 0.9,
        metalness: 0.05,
      });
    selectedVehicles.forEach((candidate, index) => {
      const point = toScenePoint(candidate.u, candidate.v, 0.028),
        sample = candidate.signal.sample,
        color =
          sample.r > sample.g * 1.15 && sample.r > sample.b * 1.12
            ? 0xb84c32
            : sample.b > sample.r * 1.1
              ? 0x4e83bb
              : sample.luma > 0.72
                ? 0xe9e3d2
                : 0x59656a,
        bodyMaterial = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.7,
          metalness: 0.12,
        }),
        cabinMaterial = new THREE.MeshStandardMaterial({
          color: 0xaac3c9,
          roughness: 0.34,
          metalness: 0.08,
          transparent: true,
          opacity: 0.88,
        }),
        car = new THREE.Group();
      car.name = `AliançaPark_AdminAerialCar_${String(index + 1).padStart(2, "0")}`;
      car.position.set(point.x, point.y, point.z + vehicleBodyHeight / 2);
      car.rotation.z =
        (candidate.u > 0.5 ? 0.56 : -0.56) +
        (((candidate.gx * 13 + candidate.gy * 7) % 7) - 3) * 0.035;
      const body = new THREE.Mesh(vehicleBodyGeometry, bodyMaterial),
        cabin = new THREE.Mesh(vehicleCabinGeometry, cabinMaterial);
      cabin.position.z = vehicleBodyHeight * 0.78;
      body.castShadow = true;
      body.receiveShadow = true;
      cabin.castShadow = true;
      cabin.receiveShadow = true;
      car.add(body, cabin);
      for (const x of [-vehicleLength * 0.3, vehicleLength * 0.3])
        for (const y of [-vehicleWidth * 0.48, vehicleWidth * 0.48]) {
          const wheel = new THREE.Mesh(
            vehicleWheelGeometry,
            vehicleWheelMaterial,
          );
          wheel.position.set(x, y, -vehicleBodyHeight * 0.12);
          car.add(wheel);
        }
      car.userData = {
        adminReferenceEnvironment: true,
        kind: "car",
        source: "aerial-vehicle-candidate",
        imageUv: [
          Number(candidate.u.toFixed(4)),
          Number(candidate.v.toFixed(4)),
        ],
        terrainAnchor: [point.x, point.y, point.z],
        extrusion: "low-poly vehicle · non-selectable",
      };
      car.traverse((node) => {
        node.castShadow = true;
        node.receiveShadow = true;
        node.raycast = () => {};
      });
      vehicleGroup.add(car);
    });

    environment.add(treeGroup, vehicleGroup);
    stage.add(environment);
    this.adminReferenceAerialEnvironmentV1 = environment;
    this.__adminReferenceAerialEnvironmentKeyV1 = terrainKey;
    surface.visible = false;
    this.dataset.mapSurfaceVisible = "false";
    this.dataset.adminReferenceAerialEnvironment = "ready";
    this.dataset.adminReferenceAerialEnvironmentVersion =
      ADMIN_REFERENCE_AERIAL_ENVIRONMENT_VERSION_V1;
    this.dataset.adminReferenceAerialEnvironmentTexture =
      "single full-image aerial texture · terrain mesh";
    this.dataset.adminReferenceAerialEnvironmentTrees = String(
      treeGroup.children.length,
    );
    this.dataset.adminReferenceAerialEnvironmentHouses = "0";
    this.dataset.adminReferenceAerialEnvironmentVehicles = String(
      vehicleGroup.children.length,
    );
    this.dataset.adminReferenceAerialEnvironmentRelief =
      "rolling undulation · luminance + deterministic field · presentation-only";
    this.dataset.adminReferenceAerialEnvironmentSource = `${imageWidth}×${imageHeight} · UV 0..1 · sem segundo fundo`;
    this.dataset.adminReferenceAerialEnvironmentPolicy =
      "árvores e carros derivados do raster · sem casas sintéticas · loteamento preservado como modelo semântico";
    this.renderer?.render(this.scene, this.camera);
    return true;
  }

  syncAdminReferenceAerialSurfaceV1() {
    const THREE = this.THREE,
      stage = this.sceneStage,
      model = this.masterplanModel,
      surface = this.mapSurface,
      texture = this.adminReferenceAerialTextureV1;
    if (!THREE || !stage || !model || !surface || !texture?.image) return false;
    // No mapa administrativo a fotografia é a única base horizontal. O
    // contexto GPS antigo criava clearings verdes fora da janela da imagem;
    // essas superfícies não são elementos semânticos e não devem competir
    // com árvores, estruturas ou carros derivados do modelo.
    if (this.publicGpsContextEnvironment) {
      this.publicGpsContextEnvironment.removeFromParent?.();
      this.publicGpsContextEnvironment.visible = false;
      this.publicGpsContextEnvironment = null;
    }
    this.dataset.publicContextGround =
      "disabled · reference aerial is the only map base";
    stage.updateMatrixWorld(true);
    model.updateMatrixWorld(true);
    const stageInverse = new THREE.Matrix4().copy(stage.matrixWorld).invert();
    const worldBox = new THREE.Box3().setFromObject(model),
      localBox = new THREE.Box3();
    for (const x of [worldBox.min.x, worldBox.max.x])
      for (const y of [worldBox.min.y, worldBox.max.y])
        for (const z of [worldBox.min.z, worldBox.max.z]) {
          localBox.expandByPoint(
            new THREE.Vector3(x, y, z).applyMatrix4(stageInverse),
          );
        }
    if (localBox.isEmpty()) return false;
    const frame = this.adminReferenceAerialFrameV1(),
      size = localBox.getSize(new THREE.Vector3()),
      center = localBox.getCenter(new THREE.Vector3());
    const planeWidth = Math.max(1, size.x / frame.siteWidth),
      planeHeight = Math.max(1, size.y / frame.siteDepth);
    // A janela do empreendimento na foto precisa coincidir com o envelope
    // sem girar ou esticar a fotografia. O entorno excede o modelo e continua
    // disponível durante pan/zoom.
    surface.position.set(
      center.x - (frame.siteCenterU - 0.5) * planeWidth,
      center.y - (0.5 - frame.siteCenterV) * planeHeight,
      SCENE_MAP_Z,
    );
    surface.rotation.set(0, 0, 0);
    surface.scale.set(planeWidth, planeHeight, 1);
    surface.material.map = texture;
    surface.material.color?.setRGB?.(1, 1, 1);
    surface.material.toneMapped = false;
    surface.material.needsUpdate = true;
    surface.visible = true;
    surface.renderOrder = -20;
    texture.needsUpdate = true;
    this.dataset.mapSurfaceVisible = "true";
    this.dataset.mapSurfaceWorld = `${Math.round(planeWidth)}x${Math.round(planeHeight)} @ ${SCENE_MAP_Z}`;
    this.dataset.mapRasterMode = "single-reference-aerial + semantic-3d";
    this.dataset.mapTexture = "ready";
    this.dataset.adminReferenceAerialFrame = `${frame.left.toFixed(3)},${frame.top.toFixed(3)} → ${frame.right.toFixed(3)},${frame.bottom.toFixed(3)}`;
    this.dataset.adminReferenceAerialWorld = `${planeWidth.toFixed(2)}x${planeHeight.toFixed(2)} · ${size.x.toFixed(2)}x${size.y.toFixed(2)} site`;
    this.dataset.adminReferenceAerialDisplayScale = `${ADMIN_REFERENCE_AERIAL_DISPLAY_SCALE_V1.toFixed(2)}× · cena uniforme · aspecto original preservado`;
    this.dataset.adminReferenceAerialPlacement =
      "single Three.js surface · site window aligned to semantic GLB envelope";
    this.dataset.adminReferenceAerialAlignment =
      "reference aerial V2 ↔ terrain ↔ semantic GLB · shared sceneStage transform";
    this.dataset.adminReferenceAerialFrameVersion = "site-window-v2";
    const environmentReady =
      this.syncAdminReferenceAerialEnvironmentV1?.() === true;
    if (environmentReady) {
      // O terreno subdividido assumiu a textura integral; manter o plano
      // original oculto evita qualquer duplicação visual da fotografia.
      surface.visible = false;
      this.dataset.mapSurfaceVisible = "false";
    }
    return true;
  }
  }
  for (const name of Object.getOwnPropertyNames(AdminReferenceAerialSceneV1.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(MapScene.prototype, name, Object.getOwnPropertyDescriptor(AdminReferenceAerialSceneV1.prototype, name));
  }
};
