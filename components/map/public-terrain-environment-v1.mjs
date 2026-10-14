const PUBLIC_TERRAIN_CONFIG_V1 = [
  "GENERATED_AERIAL_ASSET",
  "GENERATED_AERIAL_VERSION",
  "PUBLIC_SOCIAL_GREEN_LIFT_V1",
  "SCENE_MAP_Z",
];

export const assertPublicTerrainEnvironmentDependenciesV1 = (dependencies) => {
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Public terrain environment requires injected dependencies.");
  for (const key of PUBLIC_TERRAIN_CONFIG_V1)
    if (!(key in dependencies))
      throw new TypeError(`Public terrain environment requires ${key}.`);
  if (typeof dependencies.runtimeRouteV1 !== "function")
    throw new TypeError("Public terrain environment requires runtimeRouteV1().");
  const browser = dependencies.browser;
  if (typeof browser?.Image !== "function" ||
      typeof browser?.setTimeout !== "function" ||
      typeof browser?.document?.createElement !== "function")
    throw new TypeError("Public terrain environment requires image, document and timer ports.");
  return dependencies;
};

export const installPublicTerrainEnvironmentV1 = (MapScene, dependencies) => {
  assertPublicTerrainEnvironmentDependenciesV1(dependencies);
  const {
    GENERATED_AERIAL_ASSET,
    GENERATED_AERIAL_VERSION,
    PUBLIC_SOCIAL_GREEN_LIFT_V1,
    SCENE_MAP_Z,
    runtimeRouteV1
  } = dependencies;
  const {
    Image: ImageConstructor,
    document: browserDocument,
    setTimeout: scheduleTimeout,
  } = dependencies.browser;
  const PublicTerrainEnvironmentMethodsV1 = class {
    ensurePublicTerrainRelief() {
      if (this.isPublicMapVisual() && !this._publicEnvironmentAllowed) {
        this.dataset.publicTerrainRelief = "queued-after-first-open";
        return;
      }
      if (
        !this.isPublicMapVisual() ||
        !this.THREE ||
        !this.sceneStage ||
        !this.mapSurface
      )
        return;
      const THREE = this.THREE;
      if (!this.publicTerrainRelief) {
        const geometry = new THREE.PlaneGeometry(1, 1, 72, 72);
        const position = geometry.getAttribute("position");
        for (let index = 0; index < position.count; index++) {
          const x = position.getX(index),
            y = position.getY(index);
          // Relevo suave apenas no terreno de fundo; a cota fica sempre abaixo
          // da implantação para não cobrir lotes, ruas ou equipamentos.
          const ridge =
            Math.sin((x + 0.12) * Math.PI * 2.1) * 0.16 +
            Math.cos((y - 0.18) * Math.PI * 2.7) * 0.11 +
            Math.sin((x + y) * Math.PI * 4.2) * 0.045;
          // O terreno é uma camada de fundo, mas precisa permanecer próximo ao
          // plano da implantação para continuar visível na câmera inclinada.
          // A versão anterior ficava quase uma unidade abaixo do GLB e sumia
          // quando o enquadramento público era recomposto.
          position.setZ(index, -0.18 + ridge * 0.11);
        }
        position.needsUpdate = true;
        geometry.computeVertexNormals();
        // A imagem aérea georreferenciada é a única base horizontal do mapa.
        // Não há fallback de grama: enquanto as tiles não chegam, o terreno
        // fica oculto para não criar um pano verde sob os lotes.
        const satelliteReady =
          this.dataset.mapTexture === "ready" && this.mapSurfaceTexture?.image;
        const groundTexture = satelliteReady ? this.mapSurfaceTexture : null;
        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: groundTexture || null,
          roughness: 1,
          metalness: 0,
          side: THREE.DoubleSide,
          depthWrite: true,
          depthTest: true,
          transparent: !groundTexture,
          opacity: groundTexture ? 1 : 0,
        });
        const terrain = new THREE.Mesh(geometry, material);
        terrain.name = "BelavistaPublicTerrainRelief";
        terrain.renderOrder = -5;
        terrain.frustumCulled = false;
        terrain.receiveShadow = true;
        terrain.visible = Boolean(groundTexture);
        terrain.userData = {
          publicTerrain: true,
          source: satelliteReady
            ? "satellite tile mosaic · DWG GPS centre"
            : "hidden while satellite loads",
          relief: "low-amplitude visual relief · satellite source",
          coordinateSource: "DWG-aligned-map-surface",
        };
        this.sceneStage.add(terrain);
        this.publicTerrainRelief = terrain;
      }
      this.queueGeneratedTerrainHeightmapV5391();
      this.syncPublicTerrainRelief();
      this.dataset.publicTerrainRelief =
        "3D · satélite georreferenciado pelo DWG · relevo visual de baixa amplitude";
      this.dataset.publicTerrainSurface =
        this.dataset.mapTexture === "ready" && this.mapSurfaceTexture?.image
          ? this.mapTileMode === "generated"
            ? "treated satellite mosaic · DWG GPS centre"
            : "satellite tile mosaic · DWG GPS centre"
          : "satellite pending · terrain hidden";
    }
    queueGeneratedTerrainHeightmapV5391() {
      if (
        !this.isPublicMapVisual() ||
        !this.publicTerrainRelief ||
        this._generatedTerrainHeightmapStateV5391 === "loading" ||
        this._generatedTerrainHeightmapStateV5391 === "ready"
      )
        return;
      if (this.mapTileMode === "satellite") {
        this._generatedTerrainHeightmapStateV5391 = "skipped-satellite";
        this.publicGeneratedTerrainHeightmapV5391 = null;
        this.dataset.publicTerrainHeightmap =
          "não utilizado · superfície satélite georreferenciada";
        this.publicTerrainRelief.userData = {
          ...(this.publicTerrainRelief.userData || {}),
          relief: "low-amplitude visual relief · satellite source",
          heightmap: "not-used · no synthetic raster",
        };
        return;
      }
      this._generatedTerrainHeightmapStateV5391 = "loading";
      this.dataset.publicTerrainHeightmap =
        "carregando imagem gerada para relevo";
      const image = new ImageConstructor();
      image.decoding = "async";
      image.onload = () => {
        try {
          const size = 96,
            canvas = browserDocument.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) throw new Error("canvas indisponível");
          context.drawImage(image, 0, 0, size, size);
          const pixels = context.getImageData(0, 0, size, size).data,
            values = new Float32Array(size * size);
          for (let y = 0; y < size; y++)
            for (let x = 0; x < size; x++) {
              const offset = (y * size + x) * 4,
                r = pixels[offset],
                g = pixels[offset + 1],
                b = pixels[offset + 2];
              // A estimativa visual privilegia sombras, bordas de mata e vales;
              // ela produz relevo de apresentação, não cota topográfica medida.
              values[y * size + x] = Math.max(
                0,
                Math.min(1, (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255),
              );
            }
          for (let pass = 0; pass < 3; pass++) {
            const blurred = new Float32Array(values);
            for (let y = 1; y < size - 1; y++)
              for (let x = 1; x < size - 1; x++) {
                const i = y * size + x;
                blurred[i] =
                  (values[i] * 4 +
                    values[i - 1] +
                    values[i + 1] +
                    values[i - size] +
                    values[i + size]) /
                  8;
              }
            values.set(blurred);
          }
          this.publicGeneratedTerrainHeightmapV5391 = {
            size,
            values,
            source: GENERATED_AERIAL_ASSET,
            version: GENERATED_AERIAL_VERSION,
          };
          this._generatedTerrainHeightmapStateV5391 = "ready";
          this.applyGeneratedTerrainHeightmapV5391();
          this.reliftPublicTreesToTerrainV5391();
          this.__publicSatelliteVegetationTransformKey = "";
          this.syncPublicSatelliteVegetationV1();
          this.dataset.publicTerrainHeightmap = `imagem gerada ${image.naturalWidth}×${image.naturalHeight} · grade ${size}×${size} · relevo visual`;
          this.renderer?.render(this.scene, this.camera);
        } catch (error) {
          this._generatedTerrainHeightmapStateV5391 = "fallback";
          this.dataset.publicTerrainHeightmap =
            "fallback procedural · imagem indisponível";
          console.warn(
            "[Aliança Park public] relevo da imagem gerada indisponível.",
            error,
          );
        }
      };
      image.onerror = () => {
        this._generatedTerrainHeightmapStateV5391 = "fallback";
        this.dataset.publicTerrainHeightmap =
          "fallback procedural · imagem indisponível";
      };
      image.src = runtimeRouteV1(
        GENERATED_AERIAL_ASSET,
        "v=" + GENERATED_AERIAL_VERSION,
      );
    }
    sampleGeneratedTerrainHeightV5391(u, v) {
      const map = this.publicGeneratedTerrainHeightmapV5391;
      if (!map) return -0.18;
      const size = map.size,
        x = Math.max(0, Math.min(size - 1, Number(u) * (size - 1))),
        y = Math.max(0, Math.min(size - 1, Number(v) * (size - 1))),
        x0 = Math.floor(x),
        y0 = Math.floor(y),
        x1 = Math.min(size - 1, x0 + 1),
        y1 = Math.min(size - 1, y0 + 1),
        fx = x - x0,
        fy = y - y0;
      const at = (px, py) => map.values[py * size + px],
        top = at(x0, y0) * (1 - fx) + at(x1, y0) * fx,
        bottom = at(x0, y1) * (1 - fx) + at(x1, y1) * fx,
        luma = top * (1 - fy) + bottom * fy;
      // Mantém a camada de relevo sob a implantação. A imagem gerada orienta
      // apenas a variação visual de altitude; ela não substitui levantamento
      // topográfico nem deve atravessar lotes, ruas ou equipamentos.
      return -0.5 + (luma - 0.5) * 0.44;
    }
    publicTerrainElevationAtV5391(x, y) {
      const terrain = this.publicTerrainRelief;
      if (!terrain) return Number(this.mapSurface?.position?.z) || SCENE_MAP_Z;
      const dx = Number(x) - Number(terrain.position.x || 0),
        dy = Number(y) - Number(terrain.position.y || 0),
        angle = -(Number(terrain.rotation?.z) || 0),
        c = Math.cos(angle),
        s = Math.sin(angle),
        localX = dx * c - dy * s,
        localY = dx * s + dy * c;
      const u = Math.max(
          0,
          Math.min(
            1,
            localX / Math.max(0.001, Number(terrain.scale.x) || 1) + 0.5,
          ),
        ),
        v = Math.max(
          0,
          Math.min(
            1,
            0.5 - localY / Math.max(0.001, Number(terrain.scale.y) || 1),
          ),
        );
      return (
        Number(terrain.position.z || 0) +
        this.sampleGeneratedTerrainHeightV5391(u, v)
      );
    }
    applyGeneratedTerrainHeightmapV5391() {
      const terrain = this.publicTerrainRelief,
        position = terrain?.geometry?.getAttribute?.("position");
      if (!terrain || !position) return;
      for (let index = 0; index < position.count; index++) {
        const u = position.getX(index) + 0.5,
          v = 0.5 - position.getY(index);
        position.setZ(index, this.sampleGeneratedTerrainHeightV5391(u, v));
      }
      position.needsUpdate = true;
      terrain.geometry.computeVertexNormals();
      terrain.geometry.computeBoundingSphere();
      terrain.userData.relief =
        "generated-image-heightmap · visual estimate · low amplitude";
    }
    reliftPublicTreesToTerrainV5391() {
      for (const group of [
        this.publicVegetationGroup,
        this.publicTerrainVegetationGroup,
        this.publicForestGroup,
      ])
        group?.traverse?.((tree) => {
          const anchor = tree?.userData?.terrainAnchorV5391;
          if (!anchor) return;
          const next =
            (anchor.useGeneratedHeightmap
              ? this.publicTerrainElevationAtV5391(anchor.x, anchor.y) + 0.035
              : Number(anchor.baseZ) || 0) + Number(anchor.verticalLift || 0);
          const previous = Number(anchor.sampleZ) || 0;
          tree.position.z += next - previous;
          anchor.sampleZ = next;
        });
    }
    loadPublicTerrainTextureV1() {
      if (!this.isPublicMapVisual() || !this.THREE) return;
      // Removido o fallback local de grama. O mosaico satélite, ao chegar,
      // aciona syncPublicTerrainRelief() e revela a camada de terreno.
      this.publicTerrainTexture = null;
      this.dataset.publicTerrainTexture = "disabled · satellite-only ground";
      this.dataset.publicTerrainSource =
        this.mapTileMode === "generated"
          ? "treated satellite mosaic · DWG GPS centre"
          : "satellite tile mosaic · Esri World Imagery · DWG GPS centre";
      this.syncPublicTerrainRelief?.();
    }
    extractPublicVegetationSamplesV1(texture) {
      if (!this.isPublicMapVisual() || !texture?.image) return;
      try {
        const size = 128,
          canvas = browserDocument.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(texture.image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data,
          candidates = [],
          samples = [];
        const readPixel = (x, y) => {
          const px = Math.max(0, Math.min(size - 1, x)),
            py = Math.max(0, Math.min(size - 1, y)),
            offset = (py * size + px) * 4;
          return {
            r: pixels[offset],
            g: pixels[offset + 1],
            b: pixels[offset + 2],
          };
        };
        for (let y = 2; y < size - 2; y += 2)
          for (let x = 2; x < size - 2; x += 2) {
            const center = readPixel(x, y),
              r = center.r,
              g = center.g,
              b = center.b,
              brightness = (r + g + b) / 3;
            const ring = [
              [x - 2, y],
              [x + 2, y],
              [x, y - 2],
              [x, y + 2],
            ].map(([px, py]) => readPixel(px, py));
            const ringBrightness =
              ring.reduce(
                (sum, pixel) => sum + (pixel.r + pixel.g + pixel.b) / 3,
                0,
              ) / ring.length;
            const canopyContrast = Math.max(0, ringBrightness - brightness);
            const greenScore = g - Math.max(r, b) * 0.82;
            // A imagem aérea é reduzida a candidatos de copa: verde predominante,
            // contraste local de copa e distância mínima entre pontos para não
            // plantar dezenas de árvores sobre a mesma mancha de vegetação.
            if (
              g > r * 1.05 &&
              g > b * 0.98 &&
              greenScore > 9 &&
              brightness > 20 &&
              brightness < 238 &&
              (canopyContrast > 2.5 || brightness < 112)
            )
              candidates.push({
                u: x / (size - 1),
                v: y / (size - 1),
                score: greenScore + canopyContrast * 0.35,
              });
          }
        candidates.sort((a, b) => b.score - a.score);
        const crownSpacing = 0.055;
        for (const candidate of candidates) {
          if (
            samples.every(
              (sample) =>
                Math.hypot(sample.u - candidate.u, sample.v - candidate.v) >=
                crownSpacing,
            )
          )
            samples.push(candidate);
          if (samples.length >= 320) break;
        }
        const source =
          texture === this.mapSurfaceTexture
            ? this.mapTileMode === "generated"
              ? "treated satellite mosaic · DWG GPS centre"
              : "satellite tile mosaic · Esri World Imagery · DWG GPS centre"
            : sourceFromTerrainTexture(texture);
        this.dataset.publicVegetationImageSampling = `${samples.length} candidatos de copa espaçados · ${source}`;
        this.publicVegetationSamples = samples;
      } catch (error) {
        this.publicVegetationSamples = [];
        this.dataset.publicVegetationImageSampling =
          "indisponível · amostragem protegida";
        console.warn(
          "[Aliança Park public] amostragem vegetal do terreno indisponível.",
          error,
        );
      }
      function sourceFromTerrainTexture(value) {
        return value?.image?.src?.split("/").pop() || "textura local";
      }
    }
    scanPublicSatelliteContextV1(texture) {
      if (
        !this.isPublicMapVisual() ||
        !this.THREE ||
        !this.sceneStage ||
        !this.masterplanModel ||
        !this.mapSurface ||
        !texture?.image ||
        !this.publicGpsContextEnvironment
      )
        return;
      if (this.__publicSatelliteContextTexture === texture) return;
      const THREE = this.THREE;
      try {
        this.sceneStage.updateMatrixWorld(true);
        this.masterplanModel.updateMatrixWorld(true);
        const stageInverse = new THREE.Matrix4()
          .copy(this.sceneStage.matrixWorld)
          .invert();
        const toStageBox = (worldBox) => {
          const local = new THREE.Box3();
          for (const x of [worldBox.min.x, worldBox.max.x])
            for (const y of [worldBox.min.y, worldBox.max.y])
              for (const z of [worldBox.min.z, worldBox.max.z]) {
                local.expandByPoint(
                  new THREE.Vector3(x, y, z).applyMatrix4(stageInverse),
                );
              }
          return local;
        };
        const siteBounds = toStageBox(
          new THREE.Box3().setFromObject(this.masterplanModel),
        );
        const siteSize = siteBounds.getSize(new THREE.Vector3());
        const width = Math.max(1, siteSize.x),
          height = Math.max(1, siteSize.y),
          short = Math.min(width, height);
        const centerX = (siteBounds.min.x + siteBounds.max.x) / 2,
          centerY = (siteBounds.min.y + siteBounds.max.y) / 2;
        const surface = this.mapSurface;
        const surfaceWidth = Math.max(
          width * 1.7,
          Math.abs(Number(surface.scale.x) || 0),
        );
        const surfaceHeight = Math.max(
          height * 1.7,
          Math.abs(Number(surface.scale.y) || 0),
        );
        const groundZ =
          Math.max(Number(surface.position.z) || 0, siteBounds.min.z) + 0.055;
        const blockerBoxes = [
          ...(this.modelParts?.lots || []),
          ...(this.modelParts?.streets || []),
        ].map((node) => toStageBox(new THREE.Box3().setFromObject(node)));
        const isBlocked = (x, y, margin = Math.max(0.35, short * 0.006)) =>
          blockerBoxes.some(
            (box) =>
              x >= box.min.x - margin &&
              x <= box.max.x + margin &&
              y >= box.min.y - margin &&
              y <= box.max.y + margin,
          );
  
        const size = 192,
          canvas = browserDocument.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context2d = canvas.getContext("2d", { willReadFrequently: true });
        if (!context2d) return;
        context2d.drawImage(texture.image, 0, 0, size, size);
        const pixels = context2d.getImageData(0, 0, size, size).data,
          grid = 32,
          cell = size / grid;
        const cells = [],
          cellByKey = new Map();
        for (let gy = 0; gy < grid; gy++)
          for (let gx = 0; gx < grid; gx++) {
            let count = 0,
              sumR = 0,
              sumG = 0,
              sumB = 0,
              sumBrightness = 0;
            const minX = Math.floor(gx * cell),
              maxX = Math.min(size, Math.floor((gx + 1) * cell));
            const minY = Math.floor(gy * cell),
              maxY = Math.min(size, Math.floor((gy + 1) * cell));
            for (let y = minY; y < maxY; y++)
              for (let x = minX; x < maxX; x++) {
                const offset = (y * size + x) * 4,
                  r = pixels[offset],
                  g = pixels[offset + 1],
                  b = pixels[offset + 2],
                  brightness = (r + g + b) / 3;
                sumR += r;
                sumG += g;
                sumB += b;
                sumBrightness += brightness;
                count++;
              }
            if (!count) continue;
            const r = sumR / count,
              g = sumG / count,
              b = sumB / count,
              brightness = sumBrightness / count,
              spread = Math.max(r, g, b) - Math.min(r, g, b);
            let variance = 0;
            for (let y = minY; y < maxY; y++)
              for (let x = minX; x < maxX; x++) {
                const offset = (y * size + x) * 4;
                variance += Math.abs(
                  (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3 -
                    brightness,
                );
              }
            variance /= count;
            const greenDominance = g - Math.max(r, b),
              neutral = Math.max(0, 1 - spread / 110),
              uniformity = Math.max(0, 1 - variance / 52);
            const u = (gx + 0.5) / grid,
              v = (gy + 0.5) / grid;
            const x = Number(surface.position.x || 0) + (u - 0.5) * surfaceWidth;
            const y = Number(surface.position.y || 0) + (0.5 - v) * surfaceHeight;
            const outside =
              Math.abs((x - centerX) / width) > 0.69 ||
              Math.abs((y - centerY) / height) > 0.69;
            // Pads e construções são candidatos claros, pouco saturados e com
            // baixa variação local. Vegetação e lavouras ficam fora da lista.
            const candidate =
              brightness > 132 &&
              brightness < 246 &&
              r > 92 &&
              g > 88 &&
              b > 72 &&
              greenDominance < 22 &&
              neutral > 0.3 &&
              uniformity > 0.34 &&
              outside &&
              !isBlocked(x, y, short * 0.012);
            const item = {
              gx,
              gy,
              u,
              v,
              x,
              y,
              brightness,
              neutral,
              uniformity,
              candidate,
              score: brightness * 0.2 + neutral * 42 + uniformity * 28,
            };
            cells.push(item);
            cellByKey.set(`${gx}:${gy}`, item);
          }
        const candidates = cells.filter((item) => item.candidate);
        candidates.forEach((item) => {
          let neighbours = 0;
          for (const [dx, dy] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ])
            if (cellByKey.get(`${item.gx + dx}:${item.gy + dy}`)?.candidate)
              neighbours++;
          item.neighbours = neighbours;
          item.score += neighbours * 17;
        });
        candidates.sort((a, b) => b.score - a.score);
        const selected = [];
        const minSpacing = 0.095;
        for (const item of candidates) {
          if (
            selected.every(
              (other) =>
                Math.hypot(item.u - other.u, item.v - other.v) >= minSpacing,
            )
          )
            selected.push(item);
          if (selected.length >= 10) break;
        }
  
        const previous = this.publicSatelliteContextFeaturesGroup;
        if (previous) {
          previous.removeFromParent?.();
          previous.traverse?.((node) => {
            node.geometry?.dispose?.();
            if (node.material && !node.material.map) node.material.dispose?.();
          });
        }
        const featureGroup = new THREE.Group();
        featureGroup.name = "BelavistaPublicSatelliteContextFeatures";
        featureGroup.renderOrder = 3;
        featureGroup.userData = {
          publicContext: true,
          satelliteDerived: true,
          source: "satellite tile raster scan · DWG-aligned",
          coordinateSpace: "sceneStage local",
        };
        const pads = new THREE.Group();
        pads.name = "BelavistaPublicSatellitePads";
        pads.renderOrder = 3;
        const structures = new THREE.Group();
        structures.name = "BelavistaPublicSatelliteStructures";
        structures.renderOrder = 4;
        const padMaterial = new THREE.MeshStandardMaterial({
          color: 0xd6d0c2,
          roughness: 0.9,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: 0x8a8b82,
          roughness: 0.88,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        const roofMaterial = new THREE.MeshStandardMaterial({
          color: 0x5f665f,
          roughness: 0.92,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        selected.forEach((item, index) => {
          const tileWorldX = surfaceWidth / grid,
            tileWorldY = surfaceHeight / grid;
          const padWidth = Math.max(
            short * 0.022,
            Math.min(
              short * 0.105,
              tileWorldX * (1.35 + (item.neighbours || 0) * 0.18),
            ),
          );
          const padDepth = Math.max(
            short * 0.018,
            Math.min(
              short * 0.085,
              tileWorldY * (1.25 + (item.neighbours || 0) * 0.16),
            ),
          );
          const rotation = (((item.gx * 17 + item.gy * 11) % 7) - 3) * 0.035;
          const pad = new THREE.Mesh(
            new THREE.BoxGeometry(padWidth, padDepth, 0.075),
            padMaterial,
          );
          pad.name = `AliançaPark_SatellitePad_${String(index + 1).padStart(2, "0")}`;
          pad.position.set(item.x, item.y, groundZ + 0.0375);
          pad.rotation.z = rotation;
          pad.castShadow = false;
          pad.receiveShadow = true;
          pad.raycast = () => {};
          pad.userData = {
            publicContext: true,
            satelliteDerived: true,
            kind: "satellite-concrete-pad",
            source: "bright low-variance satellite feature",
            score: Number(item.score.toFixed(2)),
            coordinateSpace: "sceneStage local",
          };
          pads.add(pad);
          // A vizinhança retangular dá evidência suficiente para levantar um
          // volume baixo. O restante permanece somente como pad de referência,
          // evitando inventar edificações sobre áreas naturais claras.
          if ((item.neighbours || 0) >= 1 || index < 3) {
            const bodyHeight = Math.max(
              short * 0.014,
              Math.min(short * 0.034, Math.max(padWidth, padDepth) * 0.44),
            );
            const building = new THREE.Group();
            building.name = `AliançaPark_SatelliteStructure_${String(index + 1).padStart(2, "0")}`;
            building.position.set(item.x, item.y, groundZ + 0.075);
            building.rotation.z = rotation;
            building.userData = {
              publicContext: true,
              satelliteDerived: true,
              kind: "satellite-extruded-structure",
              source: "bright rectangular satellite feature",
              score: Number(item.score.toFixed(2)),
              coordinateSpace: "sceneStage local",
            };
            const body = new THREE.Mesh(
              new THREE.BoxGeometry(padWidth * 0.72, padDepth * 0.72, bodyHeight),
              wallMaterial,
            );
            body.position.z = bodyHeight / 2;
            body.castShadow = true;
            body.receiveShadow = true;
            const roof = new THREE.Mesh(
              new THREE.BoxGeometry(
                padWidth * 0.8,
                padDepth * 0.8,
                Math.max(0.045, bodyHeight * 0.16),
              ),
              roofMaterial,
            );
            roof.position.z = bodyHeight * 1.03;
            roof.castShadow = true;
            roof.receiveShadow = true;
            building.add(body, roof);
            structures.add(building);
          }
        });
        featureGroup.add(pads, structures);
        this.publicGpsContextEnvironment.add(featureGroup);
        this.publicSatelliteContextFeaturesGroup = featureGroup;
        this.__publicSatelliteContextTexture = texture;
        this.dataset.publicSatelliteContextScan = `${selected.length} áreas claras · raster ${size}×${size} · DWG aligned`;
        this.dataset.publicSatelliteContextFeatures = String(selected.length);
        this.dataset.publicContextPads = String(pads.children.length);
        this.dataset.publicContextStructures = String(structures.children.length);
        this.dataset.publicContextFeatureSource =
          "satellite tile image · low-variance bright rectangular scan";
        this.dataset.publicContextFeaturePolicy =
          "environment-only · outside 3D loteamento · lot/street blockers";
        this.renderer?.render(this.scene, this.camera);
      } catch (error) {
        this.dataset.publicSatelliteContextScan =
          "indisponível · amostragem protegida";
        console.warn(
          "[Aliança Park public] leitura de estruturas/pads do satélite indisponível.",
          error,
        );
      }
    }
    publicSatelliteSamplePointV1(sample, width, height) {
      const surface = this.mapSurface;
      if (!surface) return { x: 0, y: 0 };
      const localX =
        (Number(sample?.u || 0) - 0.5) * Number(surface.scale.x || width * 2);
      const localY =
        (0.5 - Number(sample?.v || 0)) * Number(surface.scale.y || height * 2);
      // Se a superfície for girada pelo enquadramento, a amostra também gira
      // ao redor do mesmo centro. Assim a árvore permanece sobre a copa lida
      // no satélite, em vez de usar apenas a translação da textura.
      const angle = Number(surface.rotation?.z) || 0,
        c = Math.cos(angle),
        s = Math.sin(angle);
      return {
        x: Number(surface.position.x || 0) + localX * c - localY * s,
        y: Number(surface.position.y || 0) + localX * s + localY * c,
      };
    }
    syncPublicSatelliteVegetationV1() {
      if (
        !this.isPublicMapVisual() ||
        !this.publicTerrainVegetationGroup ||
        !this._publicTreeBuilder ||
        !this._publicTreeContext ||
        !this.mapSurface
      )
        return;
      const { bounds, width, height, groundZ, isBlocked, treeHeight } =
        this._publicTreeContext;
      const centerX = (bounds.min.x + bounds.max.x) / 2,
        centerY = (bounds.min.y + bounds.max.y) / 2,
        surface = this.mapSurface;
      const textureKey =
        this.mapSurfaceTexture?.uuid || this.dataset.mapSurfaceKey || "satellite";
      const sampleKey = (this.publicVegetationSamples || [])
        .map(
          (sample) =>
            `${Number(sample.u).toFixed(4)},${Number(sample.v).toFixed(4)}`,
        )
        .join(";");
      const transformKey = [
        textureKey,
        sampleKey,
        Number(surface.position.x || 0).toFixed(3),
        Number(surface.position.y || 0).toFixed(3),
        Number(surface.scale.x || 0).toFixed(3),
        Number(surface.scale.y || 0).toFixed(3),
        Number(surface.rotation?.z || 0).toFixed(4),
        this._generatedTerrainHeightmapStateV5391 || "pending",
      ].join("|");
      if (this.__publicSatelliteVegetationTransformKey === transformKey) return;
      this.__publicSatelliteVegetationTransformKey = transformKey;
      for (const child of [...this.publicTerrainVegetationGroup.children]) {
        if (child.userData?.source !== "satellite-vegetation-candidate") continue;
        this.publicTerrainVegetationGroup.remove(child);
      }
      const selected = [];
      for (const sample of this.publicVegetationSamples || []) {
        const { x, y } = this.publicSatelliteSamplePointV1(sample, width, height);
        const outside =
          Math.abs((x - centerX) / width) > 0.58 ||
          Math.abs((y - centerY) / height) > 0.58;
        if (
          !outside ||
          isBlocked(x, y, 0.2) ||
          selected.some(
            (point) =>
              Math.hypot(x - point[0], y - point[1]) <
              Math.min(width, height) * 0.025,
          )
        )
          continue;
        selected.push([
          x,
          y,
          Number(sample.score) || 0,
          Number(sample.u) || 0,
          Number(sample.v) || 0,
        ]);
        if (selected.length >= 120) break;
      }
      selected.forEach(([x, y, score, u, v], index) => {
        const tree = this._publicTreeBuilder(
          x,
          y,
          groundZ,
          treeHeight * (0.6 + (index % 4) * 0.04),
          index + 401,
        );
        tree.userData = {
          ...(tree.userData || {}),
          source: "satellite-vegetation-candidate",
          coordinateSource: "DWG-aligned satellite image",
          satelliteUv: [u, v],
          canopyScore: score,
        };
        this.publicTerrainVegetationGroup.add(tree);
      });
      this.dataset.publicTerrainSampleTreeCount = String(selected.length);
      this.dataset.publicSatelliteTreeCount = String(selected.length);
      this.dataset.publicSatelliteTreeCandidates = String(
        this.publicVegetationSamples?.length || 0,
      );
      this.dataset.publicTreeCount = String(
        (this.publicVegetationGroup?.children.length || 0) +
          (this.publicTerrainVegetationGroup?.children.length || 0) +
          (this.publicForestGroup?.children.length || 0),
      );
      this.dataset.publicSatelliteVegetationRefresh =
        this.mapTileMode === "generated"
          ? "treated satellite mosaic applied after load"
          : "satellite tile mosaic applied after load";
      this.dataset.publicSatelliteTreePlacement =
        this.mapTileMode === "generated"
          ? "AI aerial canopy samples · same DWG-aligned map surface transform"
          : "satellite canopy samples · same DWG-aligned map surface transform";
      this.dataset.publicSatelliteTreeSampleSpace =
        "texture UV → mapSurface position/scale/rotation → sceneStage local";
      this.renderer?.render(this.scene, this.camera);
    }
    syncPublicTerrainRelief() {
      const terrain = this.publicTerrainRelief,
        surface = this.mapSurface;
      if (!surface) return;
      if (this.isAdminReferenceAerialV1?.()) {
        // No dashboard autenticado a referência aérea já é o chão definitivo.
        // O relevo sintético não pode ocultar nem duplicar essa superfície.
        if (terrain) terrain.visible = false;
        this.syncAdminReferenceAerialSurfaceV1();
        this.dataset.publicTerrainSurface =
          "single user aerial reference · synthetic terrain disabled";
        return;
      }
      // O mosaico satélite é a base visível até que o relevo 3D exista. A
      // versão anterior escondia o plano no upload da textura e deixava só o
      // fallback azul quando o enriquecimento pós-abertura era adiado.
      if (!terrain) {
        if (this.isPublicMapVisual() && this.dataset.mapTexture === "ready") {
          surface.visible = true;
          this.dataset.mapSurfaceVisible = "true";
          this.dataset.publicTerrainSurface =
            "satellite tile mosaic · DWG GPS centre · direct surface";
        }
        return;
      }
      terrain.position.copy(surface.position);
      terrain.rotation.copy(surface.rotation);
      terrain.scale.copy(surface.scale);
      terrain.position.z = (Number(surface.position.z) || 0) - 0.035;
      const satelliteReady =
        this.dataset.mapTexture === "ready" && this.mapSurfaceTexture?.image;
      const texture = satelliteReady ? this.mapSurfaceTexture : null;
      if (terrain.material) {
        terrain.material.map = texture;
        terrain.material.transparent = !texture;
        terrain.material.opacity = texture ? 1 : 0;
        terrain.material.needsUpdate = true;
      }
      terrain.visible = Boolean(texture);
      if (
        satelliteReady &&
        this.__publicVegetationSamplingTexture !== this.mapSurfaceTexture
      ) {
        // A máscara é recalculada a partir da mesma imagem aérea posicionada no
        // plano do DWG, e não da textura local de grama usada como fallback.
        this.extractPublicVegetationSamplesV1(this.mapSurfaceTexture);
        this.__publicVegetationSamplingTexture = this.mapSurfaceTexture;
        this.scanPublicSatelliteContextV1(this.mapSurfaceTexture);
        this.dataset.publicSatelliteTexture =
          this.mapTileMode === "generated"
            ? "ready · treated satellite mosaic · DWG GPS centre"
            : "ready · DWG-centred tile mosaic";
        this.dataset.publicTerrainSource =
          this.mapTileMode === "generated"
            ? "treated satellite mosaic · DWG GPS centre"
            : "satellite tile mosaic · Esri World Imagery · DWG GPS centre";
        this.dataset.publicSatelliteTreatment = this.dataset.publicGeoFrameSource
          ? "applied after DWG capture and envelope fit · warm daylight grade"
          : "waiting for DWG envelope fit before treatment";
        browserDocument.querySelectorAll(".public-map-static-bg").forEach((bg) => {
          bg.setAttribute("data-three-texture-active", "true");
          bg.setAttribute("data-satellite-source", "dwg-georeference");
        });
        terrain.userData.source =
          this.mapTileMode === "generated"
            ? "treated satellite mosaic · DWG GPS centre"
            : "satellite tile mosaic · Esri World Imagery · DWG GPS centre";
      }
      // Também sincroniza fora da troca de textura: resize, reenquadramento e
      // pan podem alterar a posição/escala da superfície mantendo o mesmo
      // objeto Texture. O guard em syncPublicSatelliteVegetationV1 evita
      // recriar árvores quando nada mudou.
      this.syncPublicSatelliteVegetationV1();
      this.dataset.publicTerrainSurface = satelliteReady
        ? this.mapTileMode === "generated"
          ? "treated satellite mosaic · DWG GPS centre"
          : "satellite tile mosaic · Esri World Imagery · DWG GPS centre"
        : "satellite pending · terrain hidden";
      // O plano original é mantido apenas como fonte de textura; o relevo passa
      // a ser a única base aérea 3D da apresentação pública.
      surface.visible = false;
    }
    buildPublicGpsContextEnvironmentV2() {
      if (
        !this.isPublicMapVisual() ||
        this._publicGpsContextEnvironmentV2 ||
        !this.THREE ||
        !this.sceneStage ||
        !this.masterplanModel
      )
        return;
      if (this.isAdminReferenceAerialV1?.()) {
        // O dashboard administrativo usa a fotografia aérea como superfície
        // única; clearings/contexto sintético pertencem apenas ao modo público.
        this._publicGpsContextEnvironmentV2 = true;
        this.dataset.publicGpsEnvironment = "disabled · semantic reference scene";
        this.dataset.publicContextTerrain =
          "disabled · no synthetic green surfaces";
        return;
      }
      const THREE = this.THREE;
      this._publicGpsContextEnvironmentV2 = true;
      this.dataset.publicEnvironment = "loading-context-3d";
      try {
        this.sceneStage.updateMatrixWorld(true);
        this.masterplanModel.updateMatrixWorld(true);
        const stageInverse = new THREE.Matrix4()
          .copy(this.sceneStage.matrixWorld)
          .invert();
        const worldBounds = new THREE.Box3().setFromObject(this.masterplanModel);
        const bounds = new THREE.Box3();
        for (const x of [worldBounds.min.x, worldBounds.max.x])
          for (const y of [worldBounds.min.y, worldBounds.max.y])
            for (const z of [worldBounds.min.z, worldBounds.max.z])
              bounds.expandByPoint(
                new THREE.Vector3(x, y, z).applyMatrix4(stageInverse),
              );
        const size = bounds.getSize(new THREE.Vector3());
        const width = Math.max(1, size.x),
          height = Math.max(1, size.y),
          short = Math.min(width, height);
        const centerX = (bounds.min.x + bounds.max.x) / 2,
          centerY = (bounds.min.y + bounds.max.y) / 2;
        const groundZ =
          Math.max(Number(this.mapSurface?.position.z) || 0, bounds.min.z) +
          0.025;
        const context = new THREE.Group();
        context.name = "AliançaPark_GPSContextEnvironment";
        context.renderOrder = -2;
        context.userData = {
          source:
            "DWG GPS control points + satellite image aligned to map surface",
          gpsCenter:
            this.dwgGeo?.controlPoints?.find(
              (point) => point.id === "site-center",
            ) || null,
          imageSource:
            "satellite tile mosaic · Esri World Imagery · DWG GPS centre",
          composition:
            "extruded terrain, vegetation clearings and low-poly context structures",
          coordinateSpace: "sceneStage local",
        };
        const colors = {
          green: [0x274b32, 0x315c3a, 0x3b6943],
          structure: [0x807b70, 0x989183, 0x5e625d],
          roof: [0x3c4843, 0x4e5449],
        };
        const material = (color, roughness = 0.98) =>
          new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness: 0,
            side: THREE.DoubleSide,
          });
        const pick = (list, index) => list[Math.abs(index) % list.length];
        const addExtrudedPatch = (points, depth, color, name) => {
          const shape = new THREE.Shape();
          points.forEach((point, index) =>
            index
              ? shape.lineTo(point[0], point[1])
              : shape.moveTo(point[0], point[1]),
          );
          shape.closePath();
          const mesh = new THREE.Mesh(
            new THREE.ExtrudeGeometry(shape, {
              depth,
              bevelEnabled: true,
              bevelSize: 0.08,
              bevelThickness: 0.035,
              bevelSegments: 1,
            }),
            material(color),
          );
          mesh.position.z = groundZ - 0.08;
          mesh.name = name;
          mesh.renderOrder = -1;
          mesh.raycast = () => {};
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = {
            publicContext: true,
            kind: "extruded-terrain",
            source: "DWG-aligned footprint + satellite frame",
          };
          context.add(mesh);
          return mesh;
        };
        // O anel possui espessura real e um vazio central para preservar a
        // implantação do GLB e os lotes selecionáveis.
        const outerX = width * 0.72,
          outerY = height * 0.72,
          innerX = width * 0.56,
          innerY = height * 0.56;
        const ringShape = new THREE.Shape();
        ringShape.moveTo(-outerX, -outerY);
        ringShape.lineTo(outerX, -outerY);
        ringShape.lineTo(outerX, outerY);
        ringShape.lineTo(-outerX, outerY);
        ringShape.closePath();
        const hole = new THREE.Path();
        hole.moveTo(-innerX, -innerY);
        hole.lineTo(-innerX, innerY);
        hole.lineTo(innerX, innerY);
        hole.lineTo(innerX, -innerY);
        hole.closePath();
        ringShape.holes.push(hole);
        const ring = new THREE.Mesh(
          new THREE.ExtrudeGeometry(ringShape, {
            depth: 0.34,
            bevelEnabled: true,
            bevelSize: 0.14,
            bevelThickness: 0.08,
            bevelSegments: 2,
          }),
          material(0x344a3b),
        );
        // O AABB verde ao redor do loteamento era um marcador de contexto, não
        // uma área real do DWG. Mantemos o objeto auditável, mas nunca o
        // adicionamos à cena visível para que o modelo fique recortado apenas
        // pelas áreas sociais e pelo terreno aéreo georreferenciado.
        ring.position.set(centerX, centerY, groundZ - 0.11);
        ring.name = "AliançaPark_GPS_ExtrudedTerrainRing";
        ring.renderOrder = -2;
        ring.raycast = () => {};
        ring.castShadow = true;
        ring.receiveShadow = true;
        ring.visible = false;
        ring.userData = {
          publicContext: true,
          kind: "terrain-ring",
          gpsAligned: true,
          publicGreenMeshRemoved: true,
          visibility: "disabled · rectangular perimeter removed",
        };
        context.add(ring);
        const clearings = [
          [-0.66, -0.52, 0.22, 0.16],
          [-0.34, 0.62, 0.28, 0.13],
          [0.42, 0.57, 0.24, 0.19],
          [0.65, -0.29, 0.18, 0.28],
          [-0.69, 0.24, 0.16, 0.29],
          [0.18, -0.7, 0.34, 0.12],
        ];
        clearings.forEach(([px, py, sx, sy], index) => {
          const cx = centerX + px * width,
            cy = centerY + py * height;
          const points = [];
          for (let corner = 0; corner < 8; corner++) {
            const angle = (corner / 8) * Math.PI * 2;
            const wobble = 1 + Math.sin(index * 2.1 + corner * 1.7) * 0.13;
            points.push([
              cx + Math.cos(angle) * width * sx * wobble,
              cy + Math.sin(angle) * height * sy * wobble,
            ]);
          }
          addExtrudedPatch(
            points,
            0.2,
            pick(colors.green, index),
            "AliançaPark_GPS_GreenArea_" + String(index + 1).padStart(2, "0"),
          );
        });
        // Não invente construções em um anel fixo ao redor do AABB. Os volumes
        // soltos e os pads claros são derivados do raster de satélite depois que
        // o mosaico termina, evitando estruturas flutuando em posições erradas.
        const structures = [];
        this.sceneStage.add(context);
        this.publicGpsContextEnvironment = context;
        this.dataset.publicGpsEnvironment =
          "DWG-aligned satellite image + extruded context";
        this.dataset.publicGpsCenter =
          this.dwgGeo?.controlPoints?.find((point) => point.id === "site-center")
            ?.id || "site-center";
        this.dataset.publicContextTerrain =
          "6 DWG-aligned green clearings · rectangular perimeter disabled";
        this.dataset.publicContextStructures = String(structures.length);
        this.dataset.publicContextCoordinateSpace =
          "sceneStage local · DWG aligned";
        this.dataset.publicContextImage =
          "satellite tile mosaic centred by DWG GPS control point";
        if (this.dataset.mapTexture === "ready" && this.mapSurfaceTexture?.image)
          this.scanPublicSatelliteContextV1(this.mapSurfaceTexture);
        this.dataset.publicEnvironment = "ready";
        this.renderer?.render(this.scene, this.camera);
      } catch (error) {
        this._publicGpsContextEnvironmentV2 = false;
        this.dataset.publicGpsEnvironment = "fallback";
        this.dataset.publicEnvironment = "ready";
        console.warn(
          "[Aliança Park public] contexto 3D do entorno indisponível.",
          error,
        );
      }
    }
    schedulePublicEnvironmentLoadingV1() {
      if (!this.isPublicMapVisual() || this._publicEnvironmentScheduled) return;
      this._publicEnvironmentScheduled = true;
      this.dataset.publicEnvironment = "queued-after-first-open";
      const run = () => {
        if (!this.isConnected || !this.masterplanModel) {
          this._publicEnvironmentScheduled = false;
          return;
        }
        this._publicEnvironmentAllowed = true;
        this.dataset.publicEnvironment = "loading";
        this.ensurePublicTerrainRelief();
        this.loadPublicTerrainTextureV1();
        this.buildPublicGpsContextEnvironmentV2();
        // A vegetação do entorno precisa ler a imagem aérea final. Aguarda o
        // upload do mosaico satélite para que a máscara não seja derivada do
        // fallback local de grama.
        this.queuePublicVegetationAfterSatelliteV1();
      };
      // requestIdleCallback pode permanecer indefinido em abas em segundo plano
      // ou em WebViews. O relevo não pode ser o único caminho para revelar o
      // mosaico, por isso use um atraso determinístico e reencaminhe caso o GLB
      // ainda esteja terminando a classificação.
      scheduleTimeout(() => {
        if (!this.isConnected) {
          this._publicEnvironmentScheduled = false;
          return;
        }
        if (!this.masterplanModel) {
          this._publicEnvironmentScheduled = false;
          scheduleTimeout(() => this.schedulePublicEnvironmentLoadingV1(), 350);
          return;
        }
        run();
      }, 900);
    }
    queuePublicVegetationAfterSatelliteV1(attempt = 0) {
      if (
        !this.isPublicMapVisual() ||
        this.publicVegetationGroup ||
        this._publicVegetationLoading
      )
        return;
      if (this._publicVegetationQueueTimer) return;
      const satelliteReady =
        this.dataset.mapTexture === "ready" && this.mapSurfaceTexture?.image;
      const satelliteFinished = ["partial", "fallback-color"].includes(
        String(this.dataset.mapTexture || ""),
      );
      if (satelliteReady || satelliteFinished || attempt >= 36) {
        this._publicVegetationQueueTimer = null;
        this.addPublicVegetation();
        return;
      }
      this._publicVegetationQueueTimer = scheduleTimeout(() => {
        this._publicVegetationQueueTimer = null;
        this.queuePublicVegetationAfterSatelliteV1(attempt + 1);
      }, 350);
    }
    addPublicVegetation() {
      if (
        !this.isPublicMapVisual() ||
        this._publicVegetationLoading ||
        this.publicVegetationGroup ||
        !this.THREE ||
        !this.GLTFLoader ||
        !this.masterplanModel
      )
        return;
      // No dashboard administrativo a vegetação canônica vem do próprio GLB
      // derivado da prancha. Evite duplicar árvores sintéticas do mosaico quando
      // a camada PDF 3D já foi montada.
      if (
        this.hasAttribute("data-admin-shared-public-map") &&
        this.adminPdfMasterplan3DGroupV1
      ) {
        this.dataset.publicEnvironment = "pdf-derived-3d-elements";
        this.dataset.publicVegetationPolicy =
          "native PDF-derived trees preserved";
        return;
      }
      this._publicVegetationLoading = true;
      this.dataset.publicEnvironment = "loading";
      const THREE = this.THREE,
        loader = new this.GLTFLoader();
      loader.load(
        runtimeRouteV1("/assets/model/vegetation/tree-cc0.glb"),
        (gltf) => {
          try {
            this.ensurePublicTerrainRelief();
            const template = gltf.scene;
            template.rotation.x = Math.PI / 2;
            template.updateMatrixWorld(true);
            this.sceneStage.updateMatrixWorld(true);
            this.masterplanModel.updateMatrixWorld(true);
            // Box3 retorna coordenadas de mundo. Como a vegetação é filha do
            // mesmo sceneStage do GLB, todas as posições precisam voltar para o
            // espaço local do stage; usar o mundo diretamente deslocava as
            // árvores para fora do loteamento depois do enquadramento.
            const stageInverse = new THREE.Matrix4()
              .copy(this.sceneStage.matrixWorld)
              .invert();
            const toStageBox = (worldBox) => {
              const local = new THREE.Box3();
              for (const x of [worldBox.min.x, worldBox.max.x])
                for (const y of [worldBox.min.y, worldBox.max.y])
                  for (const z of [worldBox.min.z, worldBox.max.z])
                    local.expandByPoint(
                      new THREE.Vector3(x, y, z).applyMatrix4(stageInverse),
                    );
              return local;
            };
            const worldBounds = new THREE.Box3().setFromObject(
              this.masterplanModel,
            );
            const bounds = toStageBox(worldBounds);
            const width = Math.max(1, bounds.max.x - bounds.min.x),
              height = Math.max(1, bounds.max.y - bounds.min.y);
            const groundZ =
              Math.max(Number(this.mapSurface?.position.z) || 0, bounds.min.z) +
              0.06;
            const blockerBoxes = [
              ...(this.modelParts?.lots || []),
              ...(this.modelParts?.streets || []),
            ].map((node) => toStageBox(new THREE.Box3().setFromObject(node)));
            const isBlocked = (
              x,
              y,
              margin = Math.max(0.55, Math.min(width, height) * 0.008),
            ) =>
              blockerBoxes.some(
                (box) =>
                  x >= box.min.x - margin &&
                  x <= box.max.x + margin &&
                  y >= box.min.y - margin &&
                  y <= box.max.y + margin,
              );
            const templateBounds = new THREE.Box3().setFromObject(template),
              templateHeight = Math.max(
                0.001,
                templateBounds.max.z - templateBounds.min.z,
              );
            const prepareTree = (
              x,
              y,
              baseZ,
              targetHeight,
              index,
              verticalLift = 0,
            ) => {
              const tree = template.clone(true);
              tree.position.set(x, y, 0);
              tree.rotation.z = (index * 2.3999632297) % (Math.PI * 2);
              tree.scale.setScalar(Math.max(0.01, targetHeight / templateHeight));
              tree.updateMatrixWorld(true);
              const treeBounds = new THREE.Box3().setFromObject(tree);
              // O mesmo heightmap da cena também serve para ancorar a base da
              // árvore. Assim a vegetação acompanha o relevo quando a imagem
              // gerada termina de carregar, sem deixar copas flutuando no plano.
              const useGeneratedHeightmap = true;
              const terrainLift = Number(verticalLift) || 0;
              const treeBaseZ =
                (this.publicGeneratedTerrainHeightmapV5391
                  ? this.publicTerrainElevationAtV5391(x, y) + 0.035
                  : Number(baseZ) || 0) + terrainLift;
              tree.position.z += treeBaseZ - treeBounds.min.z + 0.015;
              tree.userData = {
                ...(tree.userData || {}),
                terrainAnchorV5391: {
                  x,
                  y,
                  baseZ: Number(baseZ) || 0,
                  sampleZ: treeBaseZ,
                  verticalLift: terrainLift,
                  useGeneratedHeightmap,
                },
              };
              tree.traverse((node) => {
                node.visible = true;
                if (!node.isMesh) return;
                node.castShadow = true;
                node.receiveShadow = true;
                node.frustumCulled = true;
                node.renderOrder = 6;
                const material = node.material;
                if (material?.transparent) {
                  material.alphaTest = Math.max(material.alphaTest || 0, 0.22);
                  material.depthWrite = true;
                }
              });
              return tree;
            };
            const treeHeight = Math.max(
              2.4,
              Math.min(5.4, Math.min(width, height) * 0.045),
            );
            // Guarda o construtor no mapa para que uma nova textura satélite possa
            // substituir a máscara provisória sem duplicar árvores nem reabrir o
            // GLB do loteamento.
            this._publicTreeBuilder = prepareTree;
            this._publicTreeContext = {
              bounds,
              width,
              height,
              groundZ,
              isBlocked,
              treeHeight,
            };
            // Primeiro tenta áreas verdes nomeadas ou com material verde no GLB.
            // A leitura não depende apenas de modelLandscapeNodes, pois muitos
            // GLBs guardam praças e taludes como meshes "other".
            const areaCandidates = [];
            const seenAreas = new Set();
            const greenName =
              /verde|green|parque|praca|praça|lazer|paisag|talude|area.?externa|area.?verde/;
            this.masterplanModel.traverse((node) => {
              if (!node?.geometry || seenAreas.has(node)) return;
              seenAreas.add(node);
              const name = String(node.name || "").toLowerCase();
              const role = String(
                node.userData?.belavistaRole || node.userData?.partKind || "",
              ).toLowerCase();
              if (
                role === "lots" ||
                role === "lot" ||
                role === "streets" ||
                role === "street" ||
                /rua|street|road|asfalto|paviment|meio.?fio|guia|lote|tree|arvore|tronco|copa|folhagem|folha/.test(
                  name,
                )
              )
                return;
              const material = Array.isArray(node.material)
                ? node.material[0]
                : node.material;
              const color = material?.color;
              const greenMaterial = Boolean(
                color && color.g > color.r * 1.08 && color.g > color.b * 1.03,
              );
              if (!greenName.test(name) && !greenMaterial) return;
              const areaBox = toStageBox(new THREE.Box3().setFromObject(node)),
                areaSize = areaBox.getSize(new THREE.Vector3());
              const area = areaSize.x * areaSize.y;
              if (area < 12 || areaSize.x < 2 || areaSize.y < 2) return;
              areaCandidates.push({
                node,
                box: areaBox,
                size: areaSize,
                area,
                role,
              });
            });
            areaCandidates.sort((a, b) => b.area - a.area);
            const greenAreas = areaCandidates.slice(0, 18);
            const group = new THREE.Group();
            group.name = "BelavistaPublicVegetation";
            group.renderOrder = 6;
            const terrainGroup = new THREE.Group();
            terrainGroup.name = "BelavistaPublicTerrainVegetation";
            terrainGroup.renderOrder = 6;
            const forestGroup = new THREE.Group();
            forestGroup.name = "BelavistaPublicSurroundingForest";
            forestGroup.renderOrder = 6;
            const relief = new THREE.Group();
            relief.name = "BelavistaPublicGreenRelief";
            relief.renderOrder = 5;
            const reliefMaterial = new THREE.MeshStandardMaterial({
              color: 0x2c6135,
              roughness: 0.98,
              metalness: 0,
              transparent: true,
              opacity: 0.94,
            });
            const centerX = (bounds.min.x + bounds.max.x) / 2,
              centerY = (bounds.min.y + bounds.max.y) / 2;
            const socialNames =
              /lazer|parque|praca|praça|quadra|play|social|paisag/;
            const isSocialGreenArea = (area) =>
              this.modelLeisureNodes?.includes(area.node) ||
              socialNames.test(String(area.node?.name || "").toLowerCase());
            const placements = [];
            greenAreas.forEach((area, index) => {
              const { box, size } = area;
              const cx = (box.min.x + box.max.x) / 2,
                cy = (box.min.y + box.max.y) / 2;
              if (
                !isBlocked(
                  cx,
                  cy,
                  Math.max(0.25, Math.min(size.x, size.y) * 0.12),
                )
              )
                placements.push({
                  cx,
                  cy,
                  baseZ: groundZ,
                  size,
                  index,
                  isSocial: isSocialGreenArea(area),
                });
            });
            placements.forEach(({ cx, cy, baseZ, size, index, isSocial }) => {
              const shape = new THREE.Shape();
              const radius = Math.max(
                1.4,
                Math.min(size.x * 0.48, size.y * 0.38),
              );
              for (let point = 0; point < 9; point++) {
                const angle = (point / 8) * Math.PI * 2;
                const wobble = 1 + Math.sin(point * 2.17 + index) * 0.16;
                const px = Math.cos(angle) * radius * wobble,
                  py = Math.sin(angle) * radius * 0.66 * wobble;
                if (point === 0) shape.moveTo(px, py);
                else shape.lineTo(px, py);
              }
              const mound = new THREE.Mesh(
                new THREE.ExtrudeGeometry(shape, {
                  depth: 0.16 + (index % 3) * 0.06,
                  bevelEnabled: true,
                  bevelSize: 0.1,
                  bevelThickness: 0.06,
                  bevelSegments: 1,
                }),
                reliefMaterial,
              );
              const verticalLift = isSocial ? PUBLIC_SOCIAL_GREEN_LIFT_V1 : 0;
              mound.position.set(cx, cy, baseZ + verticalLift);
              mound.renderOrder = 5;
              mound.raycast = () => {};
              relief.add(mound);
              group.add(
                prepareTree(
                  cx,
                  cy,
                  baseZ + 0.2 + (index % 3) * 0.05,
                  treeHeight * (0.72 + (index % 4) * 0.06),
                  index,
                  verticalLift,
                ),
              );
            });
            // A área social recebe uma cobertura de grama 3D leve. Os tufos são
            // instanciados sobre as caixas das praças verdes do próprio modelo,
            // com variação determinística de rotação, altura e tom; os bloqueios
            // do DWG impedem que a vegetação atravesse lotes, ruas ou estruturas.
            const socialGrassGroup = new THREE.Group();
            socialGrassGroup.name = "BelavistaPublicSocialGrass3D";
            socialGrassGroup.renderOrder = 7;
            const socialAreas = greenAreas.filter(isSocialGreenArea);
            const grassAreas = socialAreas.length
              ? socialAreas
              : greenAreas.slice(0, 4);
            const grassPalette = [0x245f31, 0x327c3d, 0x459548, 0x1f522b];
            // As lâminas são construídas diretamente no eixo Z, que é o eixo
            // vertical do loteamento, para manter os tufos em pé em qualquer
            // orientação da câmera.
            const grassGeometry = new THREE.BufferGeometry();
            grassGeometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(
                [
                  -0.075, 0, 0, 0.075, 0, 0, -0.075, 0, 0.45, 0.075, 0, 0.45, 0,
                  -0.075, 0, 0, 0.075, 0, 0, -0.075, 0.45, 0, 0.075, 0.45,
                ],
                3,
              ),
            );
            grassGeometry.setIndex([0, 2, 1, 2, 3, 1, 4, 5, 6, 6, 5, 7]);
            grassGeometry.computeVertexNormals();
            const maxGrass = Math.min(
              960,
              Math.max(
                72,
                grassAreas.reduce(
                  (total, area) => total + Math.floor(area.area / 1.8),
                  0,
                ),
              ),
            );
            const grassInstances = grassPalette.map((color) => {
              const mesh = new THREE.InstancedMesh(
                grassGeometry,
                new THREE.MeshStandardMaterial({
                  color,
                  roughness: 0.96,
                  metalness: 0,
                  side: THREE.DoubleSide,
                }),
                maxGrass,
              );
              mesh.name = "GrassTufts";
              mesh.castShadow = false;
              mesh.receiveShadow = true;
              mesh.frustumCulled = true;
              mesh.count = 0;
              mesh.userData = {
                publicContext: true,
                kind: "social-grass-3d",
                source: "social green floor geometry",
              };
              socialGrassGroup.add(mesh);
              return mesh;
            });
            const grassDummy = new THREE.Object3D();
            let grassCount = 0,
              grassSeed = 0x2f6e4a;
            const grassRandom = () => {
              grassSeed = (grassSeed + 0x6d2b79f5) | 0;
              let t = grassSeed;
              t = Math.imul(t ^ (t >>> 15), t | 1);
              t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
              return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
            grassAreas.forEach((area, areaIndex) => {
              const { box, size } = area,
                margin = Math.max(0.35, Math.min(size.x, size.y) * 0.12);
              const count = Math.min(
                280,
                Math.max(18, Math.floor(area.area / 2.15)),
              );
              const isSocialArea = isSocialGreenArea(area);
              const grassBaseZ =
                Math.max(groundZ, box.max.z) +
                0.06 +
                (isSocialArea ? PUBLIC_SOCIAL_GREEN_LIFT_V1 : 0);
              for (
                let index = 0;
                index < count && grassCount < maxGrass;
                index++
              ) {
                const x =
                  box.min.x +
                  margin +
                  grassRandom() * Math.max(0.1, size.x - margin * 2);
                const y =
                  box.min.y +
                  margin +
                  grassRandom() * Math.max(0.1, size.y - margin * 2);
                if (isBlocked(x, y, 0.26) && !isSocialArea) continue;
                const height = 0.32 + grassRandom() * 0.24,
                  scale = 0.72 + grassRandom() * 0.42;
                grassDummy.position.set(x, y, grassBaseZ + 0.008);
                grassDummy.rotation.set(0, 0, grassRandom() * Math.PI * 2);
                grassDummy.scale.set(scale, scale, Math.max(0.78, height / 0.45));
                grassDummy.updateMatrix();
                const instance =
                  grassInstances[(areaIndex + index) % grassInstances.length];
                instance.setMatrixAt(instance.count, grassDummy.matrix);
                instance.count++;
                grassCount++;
              }
            });
            grassInstances.forEach((mesh) => {
              mesh.instanceMatrix.needsUpdate = true;
              mesh.computeBoundingSphere();
            });
            this.sceneStage.add(socialGrassGroup);
            this.publicSocialGrassGroup = socialGrassGroup;
            this.dataset.publicSocialGrass3D =
              "crossed upright instanced grass blades over lifted social green floors v554";
            this.dataset.publicSocialGrassLift = `${PUBLIC_SOCIAL_GREEN_LIFT_V1} stage units above the model floor`;
            this.dataset.publicSocialGreenLift = String(
              PUBLIC_SOCIAL_GREEN_LIFT_V1,
            );
            this.dataset.publicSocialGrassAreas = String(grassAreas.length);
            this.dataset.publicSocialGrassCount = String(grassCount);
            // Vegetação existente: usa os centros das árvores do arquivo como
            // pontos de referência, mas troca a geometria antiga pelo asset CC0.
            const existingTreePoints = [];
            for (const node of this.modelLandscapeNodes || []) {
              const name = String(node?.name || "").toLowerCase();
              if (
                !node?.geometry ||
                !/arvore|tree|tronco|copa|folhagem/.test(name)
              )
                continue;
              const box = toStageBox(new THREE.Box3().setFromObject(node)),
                center = box.getCenter(new THREE.Vector3());
              if (!isBlocked(center.x, center.y, 0.35))
                existingTreePoints.push([center.x, center.y]);
            }
            existingTreePoints
              .slice(0, 36)
              .forEach(([x, y], index) =>
                group.add(
                  prepareTree(
                    x,
                    y,
                    groundZ,
                    treeHeight * (0.62 + (index % 3) * 0.05),
                    index + 31,
                  ),
                ),
              );
            // A imagem de fundo também é lida como uma máscara de cobertura
            // vegetal. Os pontos são convertidos da textura para o plano local
            // do DWG e só sobrevivem fora da implantação e fora das caixas de
            // lotes/ruas.
            const sampledTerrainPoints = [];
            const surface = this.mapSurface;
            for (const sample of this.publicVegetationSamples || []) {
              const { x, y } = this.publicSatelliteSamplePointV1(
                sample,
                width,
                height,
              );
              const outside =
                Math.abs((x - centerX) / width) > 0.58 ||
                Math.abs((y - centerY) / height) > 0.58;
              if (outside && !isBlocked(x, y, 0.2))
                sampledTerrainPoints.push([
                  x,
                  y,
                  sample.score,
                  Number(sample.u) || 0,
                  Number(sample.v) || 0,
                ]);
              if (sampledTerrainPoints.length >= 120) break;
            }
            sampledTerrainPoints.forEach(([x, y, score, u, v], index) => {
              const tree = prepareTree(
                x,
                y,
                groundZ,
                treeHeight * (0.6 + (index % 4) * 0.04),
                index + 401,
              );
              tree.userData = {
                ...(tree.userData || {}),
                source: "satellite-vegetation-candidate",
                coordinateSource: "DWG-aligned satellite image",
                satelliteUv: [u, v],
                canopyScore: Number(score) || 0,
              };
              terrainGroup.add(tree);
            });
            // O entorno é uma faixa irregular baseada no footprint real do GLB,
            // não uma fileira reta. Isso cria relevo visual nas áreas verdes ao
            // redor sem plantar árvores sobre lotes ou eixos de rua.
            const perimeter = [];
            for (let index = 0; index < 96; index++) {
              const angle = index * 2.3999632297;
              const ring = 1.08 + (index % 7) * 0.045;
              const x = centerX + Math.cos(angle) * width * 0.53 * ring;
              const y = centerY + Math.sin(angle) * height * 0.53 * ring;
              if (!isBlocked(x, y, 0.2)) perimeter.push([x, y]);
            }
            perimeter.forEach(([x, y], index) =>
              terrainGroup.add(
                prepareTree(
                  x,
                  y,
                  groundZ,
                  treeHeight * (0.68 + (index % 5) * 0.045),
                  index + 101,
                ),
              ),
            );
            // Faixas de floresta ao redor do empreendimento. O anel é elíptico e
            // recebe um pequeno ruído determinístico para parecer cobertura
            // vegetal natural, mantendo cada árvore fora das caixas de lotes e
            // ruas. A posição é derivada do footprint já alinhado ao DWG e a
            // textura aérea continua sendo usada como amostra complementar.
            const forestPoints = [];
            const forestSeed = () => {
              let value = 0x9e3779b9;
              return () => {
                value = (value + 0x6d2b79f5) | 0;
                let t = value;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
              };
            };
            const randomForest = forestSeed();
            for (let index = 0; index < 144; index++) {
              const side = index % 4,
                along = (index / 144 + 0.025 + randomForest() * 0.92) % 1;
              const jitter =
                (randomForest() - 0.5) * Math.min(width, height) * 0.08;
              const offset =
                Math.min(width, height) * (0.075 + randomForest() * 0.12);
              let x = centerX,
                y = centerY;
              if (side === 0) {
                x = bounds.min.x - offset;
                y = bounds.min.y + along * height + jitter;
              }
              if (side === 1) {
                x = bounds.max.x + offset;
                y = bounds.min.y + along * height + jitter;
              }
              if (side === 2) {
                x = bounds.min.x + along * width + jitter;
                y = bounds.min.y - offset;
              }
              if (side === 3) {
                x = bounds.min.x + along * width + jitter;
                y = bounds.max.y + offset;
              }
              // Estes quatro corredores são gerados fora do AABB do footprint;
              // não dependem de caixas internas potencialmente superdimensionadas
              // pelo GLB e, portanto, não podem invadir lotes ou ruas.
              forestPoints.push([x, y]);
            }
            forestPoints.forEach(([x, y], index) => {
              const undulation =
                Math.sin(index * 1.73) * 0.07 + Math.cos(index * 0.83) * 0.045;
              forestGroup.add(
                prepareTree(
                  x,
                  y,
                  groundZ + undulation,
                  treeHeight * (0.62 + (index % 9) * 0.055),
                  index + 801,
                ),
              );
            });
            // A fotografia aérea é o chão da apresentação pública. O grupo verde
            // extrudado era apenas um placeholder de relevo e reaparecia quando
            // o enriquecimento tardio terminava; mantenha-o no grafo para
            // auditoria, mas sempre invisível neste modo.
            relief.visible = false;
            relief.userData = {
              ...(relief.userData || {}),
              publicGreenMeshRemoved: true,
              source: "disabled synthetic green base · satellite remains visible",
            };
            this.sceneStage.add(relief);
            this.sceneStage.add(group);
            this.sceneStage.add(terrainGroup);
            this.sceneStage.add(forestGroup);
            this.publicVegetationGroup = group;
            this.publicTerrainVegetationGroup = terrainGroup;
            this.publicForestGroup = forestGroup;
            this.publicGreenReliefGroup = relief;
            this.dataset.publicVegetation = "cc0-tree-glb";
            this.dataset.publicTreeCount = String(placements.length);
            this.dataset.publicTerrainTreeCount = String(
              terrainGroup.children.length,
            );
            this.dataset.publicForestTreeCount = String(
              forestGroup.children.length,
            );
            this.dataset.publicForestPlacement =
              "perimeter forest bands · DWG footprint + satellite vegetation mask";
            this.dataset.publicTerrainSampleTreeCount = String(
              sampledTerrainPoints.length,
            );
            this.dataset.publicSatelliteTreeCount = String(
              terrainGroup.children.filter(
                (tree) =>
                  tree.userData?.source === "satellite-vegetation-candidate",
              ).length,
            );
            this.dataset.publicSatelliteTreeScan =
              "green-canopy + local-contrast raster scan · DWG-aligned surface";
            this.dataset.publicSatelliteTreeCandidates = String(
              this.publicVegetationSamples?.length || 0,
            );
            this.dataset.publicSatelliteTreePlacement =
              "satellite canopy samples · same DWG-aligned map surface transform";
            this.dataset.publicSatelliteTreeSampleSpace =
              "texture UV → mapSurface position/scale/rotation → sceneStage local";
            this.dataset.publicTerrainTreeSource =
              "assets/model/vegetation/tree-cc0.glb";
            this.dataset.publicVegetationDetection =
              "meshes verdes + árvores do GLB/DWG + malha irregular do entorno";
            this.dataset.publicSocialGrassDetection =
              "tufos 3D instanciados sobre o piso verde das áreas sociais";
            this.dataset.publicExistingTreeCount = String(
              existingTreePoints.length,
            );
            this.dataset.publicTreeCount = String(
              group.children.length +
                terrainGroup.children.length +
                forestGroup.children.length,
            );
            this.dataset.publicVegetationPlacement = greenAreas.length
              ? "GLB/DWG green areas + existing tree points + terrain perimeter + surrounding forest"
              : "existing tree points + terrain perimeter + surrounding forest · no street rows";
            this.dataset.publicGreenRelief = String(relief.children.length);
            this.dataset.publicGreenMesh = "removed";
            this.dataset.publicGreenMeshPolicy =
              "satellite terrain only · synthetic green relief hidden after environment load";
            this.dataset.publicTerrainGroundZ = groundZ.toFixed(3);
            this.dataset.publicVegetationCoordinateSpace =
              "sceneStage local · derived from world bounds · DWG-aligned";
            this.dataset.publicEnvironment = "ready";
            this.renderer?.render(this.scene, this.camera);
          } catch (error) {
            this.dataset.publicEnvironment = "fallback";
            console.warn(
              "[Aliança Park public] vegetação 3D indisponível.",
              error,
            );
          } finally {
            this._publicVegetationLoading = false;
          }
        },
        undefined,
        (error) => {
          this._publicVegetationLoading = false;
          this.dataset.publicEnvironment = "fallback";
          console.warn("[Aliança Park public] árvore 3D indisponível.", error);
        },
      );
    }
  };
  for (const name of Object.getOwnPropertyNames(PublicTerrainEnvironmentMethodsV1.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      MapScene.prototype,
      name,
      Object.getOwnPropertyDescriptor(PublicTerrainEnvironmentMethodsV1.prototype, name),
    );
  }
};

