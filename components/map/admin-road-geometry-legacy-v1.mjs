const ADMIN_ROAD_GEOMETRY_CONFIG_V1 = [
  "ADMIN_REFERENCE_AERIAL_ASSET_V1",
  "ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1",
  "ROAD_HALF_LOT_SLICE_WORLD_V1",
];

const ADMIN_ROAD_GEOMETRY_FUNCTIONS_V1 = [
  "appendAdminReferenceAerialCurbPathV1",
  "createAdminReferenceAerialBezierCurbGuidesV1",
  "createAdminReferenceAerialNativeRoadGeometryV1",
  "createAdminReferenceAerialRoadPlaneGeometryV1",
  "roadPlanarAngleV1",
];

export const assertAdminRoadGeometryDependenciesV1 = (dependencies) => {
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Administrative road geometry requires injected dependencies.");
  for (const key of ADMIN_ROAD_GEOMETRY_CONFIG_V1)
    if (!(key in dependencies))
      throw new TypeError(`Administrative road geometry requires ${key}.`);
  for (const key of ADMIN_ROAD_GEOMETRY_FUNCTIONS_V1)
    if (typeof dependencies[key] !== "function")
      throw new TypeError(`Administrative road geometry requires ${key}().`);
  const browser = dependencies.browser;
  if (typeof browser?.fetch !== "function" ||
      typeof browser?.document?.createElement !== "function")
    throw new TypeError("Administrative road geometry requires fetch and document ports.");
  return dependencies;
};

export const installAdminRoadGeometryV1 = (MapScene, dependencies) => {
  assertAdminRoadGeometryDependenciesV1(dependencies);
  const {
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1,
    ROAD_HALF_LOT_SLICE_WORLD_V1,
    appendAdminReferenceAerialCurbPathV1,
    createAdminReferenceAerialBezierCurbGuidesV1,
    createAdminReferenceAerialNativeRoadGeometryV1,
    createAdminReferenceAerialRoadPlaneGeometryV1,
    roadPlanarAngleV1
  } = dependencies;
  const {
    fetch: fetchRoadTrace,
    document: browserDocument,
  } = dependencies.browser;
  const AdminRoadGeometryMethodsV1 = class {
    ensureOperationalStreetGeometry() {
      if (
        this.isPublicMapVisual() &&
        !this.hasAttribute("data-admin-shared-public-map")
      ) {
        // O recorte de ruas é útil para registros e progresso no painel
        // operacional, mas não pertence à apresentação pública. Nela, a
        // fotografia aérea já contém a orientação e as ruas de referência.
        this.disablePublicSyntheticRoads();
        this._streetOperationalGeometryReady = true;
        this.dataset.modelOperationalGeometry =
          "satellite-only · generated street geometry disabled";
        return false;
      }
      if (this._streetOperationalGeometryReady) return true;
      const sources =
        this._streetSourceCandidates || this.modelParts?.streets || [];
      if (!this.THREE || !sources.length) return false;
  
      this.dataset.modelOperationalGeometry = "building";
      const segments = this.segmentStreetMeshes(this.THREE, sources);
  
      if (segments.length) {
        this.modelParts.streets = segments;
        this._streetOperationalGeometryReady = true;
        this.dataset.modelOperationalGeometry = "ready-lazy";
        this.dataset.modelHeavyGeometry = "street-segments-lazy";
        this.buildStageOverlayTargets();
        return true;
      }
  
      this.dataset.modelOperationalGeometry = "source-meshes";
      return false;
    }
  
    ensureAdminStandaloneRoadSurfaceV1(nativeRoadSource = null) {
      const filterOnlyAdminMap =
        this.isAdminStandalone3DV5370?.() &&
        !this.isPublicCustomerExperience?.();
      if (filterOnlyAdminMap) {
        if (this._adminStandaloneRoadSurfaceGroupV1)
          this._adminStandaloneRoadSurfaceGroupV1.visible = false;
        this.dataset.publicRoadSurfaceState = "disabled-filter-only";
        this.dataset.publicRoadSurfaceMode =
          "somente filtro sobre a imagem · preenchimento 3D removido";
        this.dataset.publicRoadFill = "removed";
        return null;
      }
      if (
        this._adminStandaloneRoadSurfaceGroupV1 ||
        this._adminStandaloneRoadSurfacePromiseV1 ||
        this.dataset.publicRoadSurfaceState === "error"
      )
        return this._adminStandaloneRoadSurfaceGroupV1 || null;
  
      const THREE = this.THREE,
        stage = this._adminStandaloneStageV5370,
        surface = this._adminStandaloneAerialSurfaceV5380;
      if (!THREE || !stage || !surface) return null;
  
      const install = (roadTrace) => {
        if (!Array.isArray(roadTrace?.roads) || !roadTrace.roads.length)
          throw new Error("O traçado fotográfico das ruas está vazio.");
        this._adminStandaloneRoadTraceV1 = roadTrace;
        const group = this.buildAdminStandaloneRoadSurfaceV1({
          THREE,
          stage,
          surface,
          roadTrace,
          nativeRoadSource,
        });
        if (!group) throw new Error("A malha de asfalto não foi construída.");
        this.dataset.roadSurfacePatchVersion = "integral-asphalt-slices-v16-curb-subtraction";
        this.dataset.publicRoadSurfaceState = "ready";
        this.dataset.publicRoadTraceCount = String(roadTrace.roads.length);
        this._adminStandaloneRendererV5370?.render?.(
          this._adminStandaloneSceneV5370,
          this._adminStandaloneCameraV5370,
        );
        return group;
      };
  
      if (Array.isArray(this._adminStandaloneRoadTraceV1?.roads)) {
        try {
          return install(this._adminStandaloneRoadTraceV1);
        } catch (error) {
          this.dataset.publicRoadSurfaceState = "error";
          this.dataset.publicRoadSurfaceError = String(
            error?.message || error,
          ).slice(0, 220);
          console.warn("[Aliança Park] Falha ao montar o asfalto integral.", error);
          return null;
        }
      }
  
      this.dataset.publicRoadSurfaceState = "loading-trace";
      this._adminStandaloneRoadSurfacePromiseV1 = fetchRoadTrace(
        ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1,
      )
        .then((response) => {
          if (!response.ok)
            throw new Error(`Traçado viário indisponível (${response.status}).`);
          return response.json();
        })
        .then(install)
        .catch((error) => {
          this.dataset.publicRoadSurfaceState = "error";
          this.dataset.publicRoadSurfaceError = String(
            error?.message || error,
          ).slice(0, 220);
          console.warn("[Aliança Park] Falha ao carregar o traçado viário.", error);
          return null;
        });
      return null;
    }
  
    buildAdminStandaloneRoadSurfaceV1({
      THREE,
      stage,
      surface,
      roadTrace,
      nativeRoadSource = null,
    }) {
      if (!THREE || !stage || !surface || !Array.isArray(roadTrace?.roads))
        return null;
      const plane = createAdminReferenceAerialRoadPlaneGeometryV1(
        THREE,
        roadTrace,
      );
      if (!plane) return null;
      stage.updateMatrixWorld?.(true);
      surface.updateMatrixWorld?.(true);
      nativeRoadSource?.updateMatrixWorld?.(true);
      const nativeRoadGeometry = createAdminReferenceAerialNativeRoadGeometryV1(
          THREE,
          nativeRoadSource,
          surface,
        ),
        roadGeometry = nativeRoadGeometry || plane.geometry,
        geometrySource = nativeRoadGeometry
          ? "malha nativa selecionável Asfalto_tracado_do_PDF"
          : "polígonos vetoriais internos dos meio-fios",
        worldWidth = Math.max(1, Number(surface.scale?.x) || 1),
        worldHeight = Math.max(1, Number(surface.scale?.y) || 1),
        asphaltMaterial = new THREE.MeshBasicMaterial({
          color: 0x363a3d,
          side: THREE.DoubleSide,
          transparent: false,
          opacity: 1,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
        asphalt = new THREE.Mesh(roadGeometry, asphaltMaterial),
        group = new THREE.Group();
      group.name = "AliançaPark__asfalto-integral-tracado-aereo";
      group.position.copy(surface.position);
      group.rotation.copy(surface.rotation);
      group.scale.copy(surface.scale);
      group.renderOrder = 28;
      asphalt.name = "Asfalto_tracado_da_imagem__asfalto-integral";
      asphalt.frustumCulled = false;
      asphalt.userData = {
        publicRoadSurface: true,
        publicRoadSurfaceMode: "asfalto integral opaco por polígonos internos dos meio-fios",
        publicRoadCenterlineIgnored: true,
        publicRoadTraceSource: roadTrace.source || ADMIN_REFERENCE_AERIAL_ASSET_V1,
        publicRoadCoverage: "contornos completos das ruas",
        publicRoadUvMask: false,
        publicRoadVegetationFociIgnored: true,
        publicRoadGeometrySource: geometrySource,
        publicRoadSelectedContourParity: Boolean(nativeRoadGeometry),
      };
      group.add(asphalt);
  
      // A rua lateral direita já está contida no polígono vetorial acima. Não
      // reaplicamos sua antiga máscara UV: a grade rasterizada criava bordas
      // serrilhadas e quebras justamente nos trechos longos.
      const bezierGuides = createAdminReferenceAerialBezierCurbGuidesV1(
        THREE,
        roadTrace,
        worldWidth,
        worldHeight,
        0.06,
      );
      if (bezierGuides) group.add(bezierGuides);
  
      const dividerPositions = [],
        sliceSurfacePositions = [],
        sliceSurfaceColors = [],
        halfLot = ROAD_HALF_LOT_SLICE_WORLD_V1,
        slicePalette = [0x3b4043, 0x34383b];
      let dividerCount = 0,
        filledSliceCount = 0,
        filledFaceTriangleCount = 0;
      const clipAtU = (polygon, boundary, keepGreater) => {
        const output = [];
        for (let index = 0; index < polygon.length; index++) {
          const a = polygon[index],
            b = polygon[(index + 1) % polygon.length],
            aInside = keepGreater ? a.u >= boundary - 1e-8 : a.u <= boundary + 1e-8,
            bInside = keepGreater ? b.u >= boundary - 1e-8 : b.u <= boundary + 1e-8;
          if (aInside) output.push(a);
          if (aInside === bInside) continue;
          const ratio = (boundary - a.u) / (b.u - a.u);
          output.push({ u: boundary, v: a.v + (b.v - a.v) * ratio });
        }
        return output;
      };
      const nativePosition = nativeRoadGeometry?.getAttribute?.("position"),
        nativeIndex = nativeRoadGeometry?.getIndex?.(),
        pointInRing = (point, ring) => {
          let inside = false;
          for (
            let index = 0, previous = ring.length - 1;
            index < ring.length;
            previous = index++
          ) {
            const currentPoint = ring[index],
              previousPoint = ring[previous],
              intersects =
                currentPoint.z > point.z !== previousPoint.z > point.z &&
                point.x <
                  ((previousPoint.x - currentPoint.x) *
                    (point.z - currentPoint.z)) /
                    (previousPoint.z - currentPoint.z || 1e-9) +
                    currentPoint.x;
            if (intersects) inside = !inside;
          }
          return inside;
        },
        nativeTrianglesForRoad = (road, sourcePoints) => {
          if (!nativePosition?.count || !sourcePoints?.length) return [];
          const holes = (road.holes || [])
              .map((ring) =>
                Array.isArray(ring)
                  ? ring
                      .map((point) => ({
                        x:
                          ((Number(point?.[0]) || 0) / plane.imageWidth - 0.5) *
                          worldWidth,
                        z:
                          (0.5 - (Number(point?.[1]) || 0) / plane.imageHeight) *
                          worldHeight,
                      }))
                      .filter(
                        (point) =>
                          Number.isFinite(point.x) && Number.isFinite(point.z),
                      )
                  : [],
              )
              .filter((ring) => ring.length >= 3),
            triangles = [],
            triangleCount = nativeIndex
              ? Math.floor(nativeIndex.count / 3)
              : Math.floor(nativePosition.count / 3),
            pointAt = (vertexIndex) => ({
              x: nativePosition.getX(vertexIndex) * worldWidth,
              z: nativePosition.getY(vertexIndex) * worldHeight,
            });
          for (let triangle = 0; triangle < triangleCount; triangle++) {
            const points = [];
            for (let corner = 0; corner < 3; corner++) {
              const vertexIndex = nativeIndex
                ? nativeIndex.getX(triangle * 3 + corner)
                : triangle * 3 + corner;
              points.push(pointAt(vertexIndex));
            }
            const centroid = {
              x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
              z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
            };
            if (
              pointInRing(centroid, sourcePoints) &&
              !holes.some((ring) => pointInRing(centroid, ring))
            )
              triangles.push(points);
          }
          return triangles;
        };
      for (const [roadIndex, road] of roadTrace.roads.entries()) {
        const sourcePoints = Array.isArray(road.outer)
          ? road.outer
              .map((point) => {
                const [u, v] = [
                  (Number(point?.[0]) || 0) / plane.imageWidth - 0.5,
                  0.5 - (Number(point?.[1]) || 0) / plane.imageHeight,
                ];
                return { x: u * worldWidth, z: v * worldHeight };
              })
              .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.z))
          : [];
        if (sourcePoints.length < 3) continue;
        const angle = roadPlanarAngleV1(sourcePoints, 0),
          axisCos = Math.cos(angle),
          axisSin = Math.sin(angle),
          center = sourcePoints.reduce(
            (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
            { x: 0, z: 0 },
          );
        center.x /= sourcePoints.length;
        center.z /= sourcePoints.length;
        const local = sourcePoints.map((point) => ({
          u: (point.x - center.x) * axisCos + (point.z - center.z) * axisSin,
          v: -(point.x - center.x) * axisSin + (point.z - center.z) * axisCos,
        }));
        const nativeTriangles = nativeTrianglesForRoad(road, sourcePoints),
          nativeLocalTriangles = nativeTriangles.map((triangle) =>
            triangle.map((point) => ({
              u: (point.x - center.x) * axisCos + (point.z - center.z) * axisSin,
              v: -(point.x - center.x) * axisSin + (point.z - center.z) * axisCos,
            })),
          );
        const minU = Math.min(...local.map((point) => point.u)),
          maxU = Math.max(...local.map((point) => point.u));
        const bandCount = Math.max(1, Math.ceil((maxU - minU) / halfLot)),
          roadSlices = new Set(),
          asphaltColor = new THREE.Color();
        let sourceTriangles = nativeLocalTriangles;
        if (!sourceTriangles.length) {
          const roadShape = new THREE.Shape(),
            toPlane = (point) => [
              (Number(point?.[0]) || 0) / plane.imageWidth - 0.5,
              0.5 - (Number(point?.[1]) || 0) / plane.imageHeight,
            ];
          if (!appendAdminReferenceAerialCurbPathV1(roadShape, road.outer, toPlane))
            continue;
          for (const holePoints of road.holes || []) {
            const hole = new THREE.Path();
            if (appendAdminReferenceAerialCurbPathV1(hole, holePoints, toPlane))
              roadShape.holes.push(hole);
          }
          const traceRoadGeometry = new THREE.ShapeGeometry(roadShape),
            traceVertices = traceRoadGeometry.getAttribute("position"),
            traceIndex = traceRoadGeometry.getIndex(),
            traceTriangleCount = traceIndex
              ? traceIndex.count / 3
              : traceVertices.count / 3;
          sourceTriangles = [];
          for (let triangle = 0; triangle < traceTriangleCount; triangle++) {
            const trianglePoints = [];
            for (let corner = 0; corner < 3; corner++) {
              const vertexIndex = traceIndex
                  ? traceIndex.getX(triangle * 3 + corner)
                  : triangle * 3 + corner,
                planeX = traceVertices.getX(vertexIndex),
                planeY = traceVertices.getY(vertexIndex),
                worldX = planeX * worldWidth,
                worldZ = planeY * worldHeight;
              trianglePoints.push({
                u: (worldX - center.x) * axisCos + (worldZ - center.z) * axisSin,
                v: -(worldX - center.x) * axisSin + (worldZ - center.z) * axisCos,
              });
            }
            sourceTriangles.push(trianglePoints);
          }
          traceRoadGeometry.dispose();
        }
        // As faixas são recortadas pelos triângulos da própria malha selecionável
        // quando ela existe. O traçado vetorial só é fallback, nunca uma camada
        // que possa ultrapassar a seleção azul do asfalto.
        for (const trianglePoints of sourceTriangles) {
          const triangleMinU = Math.min(...trianglePoints.map((point) => point.u)),
            triangleMaxU = Math.max(...trianglePoints.map((point) => point.u)),
            firstBand = Math.max(0, Math.floor((triangleMinU - minU) / halfLot)),
            lastBand = Math.min(
              bandCount - 1,
              Math.floor((triangleMaxU - minU - 1e-8) / halfLot),
            );
          for (let band = firstBand; band <= lastBand; band++) {
            const lowU = minU + band * halfLot,
              highU = Math.min(maxU, lowU + halfLot),
              clipped = clipAtU(
                clipAtU(trianglePoints, lowU, true),
                highU,
                false,
              );
            if (clipped.length < 3) continue;
            let areaTwice = 0;
            for (let vertex = 0; vertex < clipped.length; vertex++) {
              const a = clipped[vertex],
                b = clipped[(vertex + 1) % clipped.length];
              areaTwice += a.u * b.v - b.u * a.v;
            }
            if (Math.abs(areaTwice) < 1e-8) continue;
            roadSlices.add(band);
            asphaltColor.setHex(slicePalette[band % slicePalette.length]);
            for (let fan = 1; fan + 1 < clipped.length; fan++) {
              for (const point of [clipped[0], clipped[fan], clipped[fan + 1]]) {
                const x = center.x + point.u * axisCos - point.v * axisSin,
                  z = center.z + point.u * axisSin + point.v * axisCos;
                sliceSurfacePositions.push(x / worldWidth, z / worldHeight, 0.042);
                sliceSurfaceColors.push(asphaltColor.r, asphaltColor.g, asphaltColor.b);
              }
              filledFaceTriangleCount++;
            }
          }
        }
        filledSliceCount += roadSlices.size;
  
        // Os cortes ficam exatamente a meia frente do início da via; assim
        // cada faixa cheia tem 5 m (e não uma meia-faixa inicial de 2,5 m).
        for (let targetU = minU + halfLot; targetU < maxU; targetU += halfLot) {
          const intersections = [];
          if (nativeLocalTriangles.length) {
            nativeLocalTriangles.forEach((triangle) => {
              for (let index = 0; index < triangle.length; index++) {
                const a = triangle[index],
                  b = triangle[(index + 1) % triangle.length],
                  delta = b.u - a.u;
                if (Math.abs(delta) < 0.000001) {
                  if (Math.abs(targetU - a.u) < 0.0005)
                    intersections.push(a.v, b.v);
                  continue;
                }
                const ratio = (targetU - a.u) / delta;
                if (ratio >= -0.000001 && ratio <= 1.000001)
                  intersections.push(a.v + (b.v - a.v) * ratio);
              }
            });
          } else {
            for (let index = 0; index < local.length; index++) {
              const a = local[index],
                b = local[(index + 1) % local.length],
                delta = b.u - a.u;
              if (Math.abs(delta) < 0.000001) {
                if (Math.abs(targetU - a.u) < 0.0005) {
                  intersections.push(a.v, b.v);
                }
                continue;
              }
              const ratio = (targetU - a.u) / delta;
              if (ratio >= -0.000001 && ratio <= 1.000001)
                intersections.push(a.v + (b.v - a.v) * ratio);
            }
          }
          intersections.sort((a, b) => a - b);
          for (let index = 0; index + 1 < intersections.length; index += 2) {
            const minV = intersections[index],
              maxV = intersections[index + 1];
            if (maxV - minV < 0.25) continue;
            const startX =
                center.x + targetU * axisCos - minV * axisSin,
              startZ = center.z + targetU * axisSin + minV * axisCos,
              endX = center.x + targetU * axisCos - maxV * axisSin,
              endZ = center.z + targetU * axisSin + maxV * axisCos;
            dividerPositions.push(
              startX / worldWidth,
              startZ / worldHeight,
              0.055,
              endX / worldWidth,
              endZ / worldHeight,
              0.055,
            );
            dividerCount++;
          }
        }
      }
      if (sliceSurfacePositions.length) {
        const sliceGeometry = new THREE.BufferGeometry();
        sliceGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(sliceSurfacePositions, 3),
        );
        sliceGeometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(sliceSurfaceColors, 3),
        );
        sliceGeometry.computeVertexNormals();
        const sliceMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          vertexColors: true,
          side: THREE.DoubleSide,
          transparent: false,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        });
        const filledSlices = new THREE.Mesh(sliceGeometry, sliceMaterial);
        filledSlices.name = "Asfalto_tracado_da_imagem__faces-cheias-meia-frente";
        filledSlices.frustumCulled = false;
        filledSlices.renderOrder = 29;
        filledSlices.userData = {
          publicRoadSurface: true,
          streetFilledHorizontalSlices: true,
          streetSliceThickness: halfLot,
          streetSliceOrientation: "faixas contínuas transversais ao eixo da rua",
          streetSliceCount: filledSliceCount,
          streetFaceTriangleCount: filledFaceTriangleCount,
          publicRoadCenterlineIgnored: true,
        };
        group.add(filledSlices);
      }
      if (dividerPositions.length) {
        const dividerGeometry = new THREE.BufferGeometry();
        dividerGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(dividerPositions, 3),
        );
        dividerGeometry.computeBoundingSphere();
        const dividerMaterial = new THREE.LineBasicMaterial({
          // A junta apenas indica o módulo: não pode parecer um vão sem asfalto.
          // O underlay integral permanece contínuo por baixo de todas as faixas.
          color: 0x252a2d,
          transparent: true,
          opacity: 0.48,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        });
        const dividers = new THREE.LineSegments(
          dividerGeometry,
          dividerMaterial,
        );
        dividers.name = "Asfalto_tracado_da_imagem__fatias-meio-lote";
        dividers.frustumCulled = false;
        dividers.renderOrder = 29;
        dividers.userData = {
          streetSliceDividers: true,
          streetSliceThickness: halfLot,
          streetSliceOrientation: "transversal ao eixo local da rua",
          publicRoadSurface: true,
          publicRoadCenterlineIgnored: true,
        };
        group.add(dividers);
      }
      group.userData = {
        publicRoadSurface: true,
        publicRoadSurfaceMode: "asfalto integral opaco por polígonos internos dos meio-fios",
        publicRoadCenterlineIgnored: true,
        publicRoadTraceCount: roadTrace.roads.length,
        publicRoadUvMask: false,
        publicRoadVegetationFociIgnored: true,
        publicRoadStraightRuns: "segmentos longos contínuos, sem arestas quebradas",
        publicRoadCornerGuides: Boolean(bezierGuides),
        publicRoadGeometrySource: geometrySource,
        publicRoadSelectedContourParity: Boolean(nativeRoadGeometry),
        publicRoadSliceCount: filledSliceCount,
        publicRoadFaceTriangleCount: filledFaceTriangleCount,
        publicRoadSliceDividerCount: dividerCount,
        publicRoadSliceThickness: halfLot,
        publicRoadCoverage: "contornos completos das ruas preenchidos",
        publicRoadSliceSurface: "faces contíguas sobre asfalto integral contínuo",
      };
      stage.add(group);
      this._adminStandaloneRoadSurfaceGroupV1 = group;
      this.dataset.modelOperationalGeometry =
        "ready · polígonos vetoriais de asfalto georreferenciados · focos ignorados";
      this.dataset.publicRoadSurfaceMode =
        "asfalto integral por contornos internos dos meio-fios · focos de vegetação ignorados";
      this.dataset.publicRoadCoverage = "contornos completos das ruas preenchidos";
      this.dataset.publicRoadSliceSurface =
        "faces contíguas · juntas discretas · asfalto sem vãos";
      this.dataset.publicStreetPaverRaster =
        `${filledSliceCount} faixas preenchidas · ${dividerCount} cortes · meia frente de lote ${halfLot.toFixed(2)}`;
      this.dataset.publicRoadFaceTriangleCount = String(filledFaceTriangleCount);
      this.dataset.publicRoadHalfLotSlice = halfLot.toFixed(2);
      this.dataset.publicRoadCenterlinePolicy =
        "centros ignorados · fatias calculadas no perímetro da rua";
      this.dataset.publicRoadUvPolicy =
        "polígonos vetoriais internos aos meio-fios · pequenos vazios vegetais ignorados · lazer preservado";
      this.dataset.publicRoadGeometrySource = geometrySource;
      this.dataset.publicRoadSelectedContourParity = nativeRoadGeometry
        ? "same-native-mesh-as-selected-road"
        : "vector-curb-fallback";
      this.dataset.publicRoadStraightPolicy =
        "trechos longos contínuos e retos · nenhuma cobertura UV rasterizada";
      this.dataset.publicRoadBezierPolicy =
        bezierGuides
          ? "tracejado Bézier somente nas esquinas · limite lateral da área social preservado"
          : "sem guias Bézier";
      return group;
    }
  
    addLotStatusBadges(THREE, model) {
      if (!model || !this.modelParts?.lots?.length) return;
      const reserved = new Set(
        (typeof commissionDeals !== "undefined" ? commissionDeals : [])
          .filter((item) => item.status === "Reserva")
          .map((item) =>
            String(item.lot || "")
              .replace(/[^0-9A-Za-z-]/g, "")
              .toLowerCase(),
          ),
      );
      const makeTexture = (label, color) => {
        const canvas = browserDocument.createElement("canvas");
        canvas.width = 96;
        canvas.height = 96;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 96, 96);
        ctx.beginPath();
        ctx.arc(48, 48, 39, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.fillStyle = "#13202b";
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label.slice(-3), 48, 49);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      };
      this.lotStatusBadges = [];
      // Os selos preservam numeração e reservas, com um teto seguro para GPUs integradas.
      this.modelParts.lots.slice(0, 48).forEach((lot, index) => {
        const bounds = new THREE.Box3().setFromObject(lot),
          world = bounds.getCenter(new THREE.Vector3()),
          raw = String(lot.userData.partLabel || lot.name || index + 1),
          label = (raw.match(/\d+(?:[-/]\d+)?/) || [String(index + 1)])[0],
          key = raw.replace(/[^0-9A-Za-z-]/g, "").toLowerCase(),
          isReserved = [...reserved].some(
            (item) => key.includes(item) || item.includes(key),
          );
        const material = new THREE.SpriteMaterial({
          map: makeTexture(label, isReserved ? "#f6c343" : "#32c58b"),
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.name = `Lote_${label}_status`;
        sprite.scale.set(3.2, 3.2, 1);
        model.worldToLocal(world);
        sprite.position.copy(world);
        sprite.position.z += 2.2;
        sprite.userData = {
          lotLabel: raw,
          lotNumber: label,
          glbObject: lot.name,
          status: isReserved ? "Reservado" : "Disponível",
        };
        model.add(sprite);
        this.lotStatusBadges.push(sprite);
      });
      this.dataset.lotStatusBadges = String(this.lotStatusBadges.length);
      this.applyDwgLotMetadata();
    }
    createNativeRoadPaverMesh(THREE, source, streetNo) {
      const geometry = source?.geometry,
        position = geometry?.getAttribute?.("position");
      if (!geometry || !position) return null;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const rawBounds = geometry.boundingBox;
      if (!rawBounds) return null;
      // O GLB legado usa XZ/Y-up; o modelo georreferenciado sobre a fotografia
      // usa XY/Z-up. Normalizamos ambos para XZ/Y-up durante a rasterização e
      // reconvertemos apenas ao emitir os vértices/linhas da cena.
      const groundInXY =
        rawBounds.max.z - rawBounds.min.z <
        Math.max(0.01, Math.min(rawBounds.max.x - rawBounds.min.x, rawBounds.max.y - rawBounds.min.y) * 0.12);
      const bounds = groundInXY
        ? {
            min: { x: rawBounds.min.x, y: rawBounds.min.z, z: rawBounds.min.y },
            max: { x: rawBounds.max.x, y: rawBounds.max.z, z: rawBounds.max.y },
          }
        : rawBounds;
      const readSurfacePoint = (vertexIndex) => {
        const px = position.getX(vertexIndex),
          py = position.getY(vertexIndex),
          pz = position.getZ(vertexIndex);
        return groundInXY
          ? { x: px, y: pz, z: py }
          : { x: px, y: py, z: pz };
      };
      const index = geometry.getIndex?.(),
        indexedCount = index?.count || position.count;
      const readIndex = (offset) => (index?.getX ? index.getX(offset) : offset);
      const triangles = [];
      for (let offset = 0; offset + 2 < indexedCount; offset += 3) {
        const ia = readIndex(offset),
          ib = readIndex(offset + 1),
          ic = readIndex(offset + 2);
        const pointA = readSurfacePoint(ia),
          pointB = readSurfacePoint(ib),
          pointC = readSurfacePoint(ic),
          ax = pointA.x,
          ay = pointA.y,
          az = pointA.z,
          bx = pointB.x,
          by = pointB.y,
          bz = pointB.z,
          cx = pointC.x,
          cy = pointC.y,
          cz = pointC.z;
        const abx = bx - ax,
          aby = by - ay,
          abz = bz - az,
          acx = cx - ax,
          acy = cy - ay,
          acz = cz - az;
        const nx = aby * acz - abz * acy,
          ny = abz * acx - abx * acz,
          nz = abx * acy - aby * acx,
          normalLength = Math.hypot(nx, ny, nz);
        // A rua canônica é uma malha muito triangulada. Só as faces do plano
        // viário participam do asfalto; eixos/centros de rua não são usados
        // como linha-guia nem como fonte de cobertura. Abs aceita as duas
        // orientações de winding presentes nos contornos georreferenciados.
        if (
          !Number.isFinite(normalLength) ||
          normalLength < 0.00001 ||
          Math.abs(ny) / normalLength < 0.35
        )
          continue;
        triangles.push({
          ax,
          az,
          bx,
          bz,
          cx,
          cz,
          centerX: (ax + bx + cx) / 3,
          centerZ: (az + bz + cz) / 3,
          minX: Math.min(ax, bx, cx),
          maxX: Math.max(ax, bx, cx),
          minZ: Math.min(az, bz, cz),
          maxZ: Math.max(az, bz, cz),
        });
      }
      if (!triangles.length) return null;
  
      const minX = bounds.min.x,
        maxX = bounds.max.x,
        minZ = bounds.min.z,
        maxZ = bounds.max.z;
      const globalRoadAngle = roadPlanarAngleV1(
        triangles.map((triangle) => ({
          x: triangle.centerX,
          z: triangle.centerZ,
        })),
        0,
      );
      const gridCos = Math.cos(globalRoadAngle),
        gridSin = Math.sin(globalRoadAngle);
      const toGrid = (x, z) => ({
        u: x * gridCos + z * gridSin,
        v: -x * gridSin + z * gridCos,
      });
      const gridCorners = [
        toGrid(minX, minZ),
        toGrid(minX, maxZ),
        toGrid(maxX, minZ),
        toGrid(maxX, maxZ),
      ];
      const gridMinU = Math.min(...gridCorners.map((point) => point.u)),
        gridMaxU = Math.max(...gridCorners.map((point) => point.u)),
        gridMinV = Math.min(...gridCorners.map((point) => point.v)),
        gridMaxV = Math.max(...gridCorners.map((point) => point.v));
      const orientationBinSize = Math.max(
        16,
        Math.min(30, Math.sqrt(Math.max(1, (maxX - minX) * (maxZ - minZ)) / 900)),
      );
      const orientationBins = new Map(),
        orientationKey = (x, z) =>
          [
            Math.floor((x - minX) / orientationBinSize),
            Math.floor((z - minZ) / orientationBinSize),
          ].join(":");
      triangles.forEach((triangle) => {
        const key = orientationKey(triangle.centerX, triangle.centerZ),
          bucket = orientationBins.get(key) || [];
        bucket.push({ x: triangle.centerX, z: triangle.centerZ });
        orientationBins.set(key, bucket);
      });
      const roadAngleCache = new Map(),
        roadAngleAt = (x, z) => {
          const ownKey = orientationKey(x, z),
            cached = roadAngleCache.get(ownKey);
          if (cached !== undefined) return cached;
          const binX = Math.floor((x - minX) / orientationBinSize),
            binZ = Math.floor((z - minZ) / orientationBinSize),
            points = [];
          for (let nearX = -1; nearX <= 1; nearX++)
            for (let nearZ = -1; nearZ <= 1; nearZ++) {
              const bucket = orientationBins.get(
                [binX + nearX, binZ + nearZ].join(":"),
              );
              if (bucket) points.push(...bucket);
            }
          const angle = roadPlanarAngleV1(points, globalRoadAngle);
          roadAngleCache.set(ownKey, angle);
          return angle;
        };
      const pointInTriangle = (x, z, triangle) => {
        const abx = triangle.bx - triangle.ax,
          abz = triangle.bz - triangle.az,
          bcx = triangle.cx - triangle.bx,
          bcz = triangle.cz - triangle.bz,
          cax = triangle.ax - triangle.cx,
          caz = triangle.az - triangle.cz;
        const apx = x - triangle.ax,
          apz = z - triangle.az,
          bpx = x - triangle.bx,
          bpz = z - triangle.bz,
          cpx = x - triangle.cx,
          cpz = z - triangle.cz;
        const c1 = abx * apz - abz * apx,
          c2 = bcx * bpz - bcz * bpx,
          c3 = cax * cpz - caz * cpx;
        return (
          (c1 >= -0.001 && c2 >= -0.001 && c3 >= -0.001) ||
          (c1 <= 0.001 && c2 <= 0.001 && c3 <= 0.001)
        );
      };
      const rasterize = (tileSize) => {
        const columns = Math.ceil((gridMaxU - gridMinU) / tileSize),
          rows = Math.ceil((gridMaxV - gridMinV) / tileSize);
        if (!columns || !rows || columns * rows > 180000) return [];
        const binSize = Math.max(12, tileSize * 6),
          bins = new Map();
        triangles.forEach((triangle, triangleIndex) => {
          const fromX = Math.floor((triangle.minX - minX) / binSize),
            toX = Math.floor((triangle.maxX - minX) / binSize),
            fromZ = Math.floor((triangle.minZ - minZ) / binSize),
            toZ = Math.floor((triangle.maxZ - minZ) / binSize);
          for (let bx = fromX; bx <= toX; bx++)
            for (let bz = fromZ; bz <= toZ; bz++) {
              const key = `${bx}:${bz}`,
                bucket = bins.get(key) || [];
              bucket.push(triangleIndex);
              bins.set(key, bucket);
            }
        });
        const samples = [
            [0, 0],
            [0.34, 0],
            [-0.34, 0],
            [0, 0.34],
            [0, -0.34],
          ],
          cells = [];
        for (let column = 0; column < columns; column++)
          for (let row = 0; row < rows; row++) {
            const centerU = gridMinU + (column + 0.5) * tileSize,
              centerV = gridMinV + (row + 0.5) * tileSize;
            const centerX = centerU * gridCos - centerV * gridSin,
              centerZ = centerU * gridSin + centerV * gridCos,
              cellBinX = Math.floor((centerX - minX) / binSize),
              cellBinZ = Math.floor((centerZ - minZ) / binSize),
              directCandidates = bins.get([cellBinX, cellBinZ].join(":")),
              candidates = directCandidates ? directCandidates.slice() : [];
            // A célula própria cobre quase todos os casos. Consultar vizinhas só
            // nas bordas evita buracos sem multiplicar o custo da malha composta.
            if (!candidates.length)
              for (let nearX = -1; nearX <= 1; nearX++)
                for (let nearZ = -1; nearZ <= 1; nearZ++) {
                  const bucket = bins.get(
                    [cellBinX + nearX, cellBinZ + nearZ].join(":"),
                  );
                  if (bucket) candidates.push(...bucket);
                }
            if (!candidates.length) continue;
            const angle = roadAngleAt(centerX, centerZ),
              angleCos = Math.cos(angle),
              angleSin = Math.sin(angle);
            let insideSamples = 0;
            for (const [sampleX, sampleZ] of samples) {
              const localX = sampleX * tileSize,
                localZ = sampleZ * tileSize,
                x = centerX + localX * angleCos - localZ * angleSin,
                z = centerZ + localX * angleSin + localZ * angleCos;
              if (
                candidates.some((triangleIndex) =>
                  pointInTriangle(x, z, triangles[triangleIndex]),
                )
              ) {
                insideSamples++;
              }
            }
            // Três pontos evitam que a última fiada de uma rua avance para dentro
            // do lote. O mesh nativo continua por baixo como limite físico exato.
            if (insideSamples >= 3)
              cells.push({ column, row, x: centerX, z: centerZ, angle });
          }
        // Converte as células validadas em fatias transversais contínuas. Cada
        // fatia ocupa a largura real do trecho naquele eixo e deixa apenas uma
        // junta curta entre as sucessivas seções da rua; isso evita a leitura
        // visual de um tabuleiro de quadrados e preserva o recorte por triângulo.
        const slices = [];
        const byColumn = new Map();
        cells.forEach((cell) => {
          const bucket = byColumn.get(cell.column) || [];
          bucket.push(cell);
          byColumn.set(cell.column, bucket);
        });
        for (const [column, bucket] of byColumn) {
          bucket.sort((a, b) => a.row - b.row);
          let runStart = null,
            runEnd = null;
          const flush = () => {
            if (runStart === null) return;
            const rowCount = runEnd - runStart + 1;
            const centerU = gridMinU + (column + 0.5) * tileSize;
            const centerV = gridMinV + (runStart + runEnd + 1) * 0.5 * tileSize;
            const centerX = centerU * gridCos - centerV * gridSin;
            const centerZ = centerU * gridSin + centerV * gridCos;
            slices.push({
              column,
              row: runStart,
              rowStart: runStart,
              rowEnd: runEnd,
              x: centerX,
              z: centerZ,
              angle: roadAngleAt(centerX, centerZ),
              // Comprimento no eixo da via; largura acompanha todas as células
              // contíguas da seção e não o envelope inteiro da malha.
              length: tileSize * 0.9,
              width: Math.max(tileSize * 0.74, rowCount * tileSize * 0.86),
              horizontalSlice: true,
            });
            runStart = null;
            runEnd = null;
          };
          for (const cell of bucket) {
            if (runStart === null) {
              runStart = cell.row;
              runEnd = cell.row;
              continue;
            }
            if (cell.row === runEnd + 1) {
              runEnd = cell.row;
              continue;
            }
            flush();
            runStart = cell.row;
            runEnd = cell.row;
          }
          flush();
        }
        slices.forEach((slice, index) => {
          slice.sliceNo = index + 1;
        });
        return slices;
      };
  
      const roadArea = Math.max(1, (maxX - minX) * (maxZ - minZ));
      // Mais seções por via, com dimensão menor e controlada. A largura útil de
      // cada seção é ampliada pela quantidade de células contíguas, enquanto o
      // comprimento permanece compacto para não invadir os lotes nas pontas.
      let tileSize = ROAD_HALF_LOT_SLICE_WORLD_V1,
        cells = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        cells = rasterize(tileSize);
        if (cells.length && cells.length <= 16000) break;
        tileSize *= 1.16;
      }
      // A cobertura integral não depende da rasterização das fatias. Se uma
      // rua estreita ou curva não gerar células suficientes, ainda assim sua
      // malha superior completa deve ser desenhada e receber as divisões que
      // forem possíveis.
  
      const paverHeight = Math.max(
        0.055,
        Math.min(0.14, (bounds.max.y - bounds.min.y) * 0.18 || 0.08),
      );
      const paverMaterial = new THREE.MeshBasicMaterial({
        // Asfalto integral: a geometria abaixo é formada por todas as faces
        // superiores da rua, não por um eixo central nem por um retângulo.
        color: 0x30363a,
        side: THREE.DoubleSide,
        transparent: false,
        // A superfície é formada pelos próprios triângulos superiores da rua.
        // Desenhar sem teste de profundidade faz o asfalto integral vencer
        // quando o piso verde do GLB ficou alguns milímetros acima da via.
        depthTest: false,
        depthWrite: false,
        vertexColors: false,
      });
      // A face superior do GLB é a fonte geométrica canônica. As caixas de uma
      // grade global pareciam práticas para contar pavers, mas seus cantos
      // avançavam sobre os lotes quando a rua mudava de direção. A apresentação
      // pública usa os mesmos triângulos da via, elevados só pela espessura
      // visual, portanto nenhum pixel pode escapar do polígono original.
      const roadCenterX = (minX + maxX) * 0.5,
        roadCenterZ = (minZ + maxZ) * 0.5;
      const roadAxisCos = Math.cos(globalRoadAngle),
        roadAxisSin = Math.sin(globalRoadAngle);
      // Projetar no eixo local da rua preserva a proporção quando a via muda
      // de direção. Um ciclo de textura ocupa aproximadamente 10 unidades do
      // modelo: pedras pequenas, mas legíveis, sem riscos pela paginação
      // excessiva em escala do mundo.
      const cobbleWorldCycle = 10;
      const surfacePositions = [],
        surfaceUvs = [],
        surfaceElevation = bounds.max.y + paverHeight * 0.48;
      triangles.forEach((triangle) => {
        [
          [triangle.ax, triangle.az],
          [triangle.bx, triangle.bz],
          [triangle.cx, triangle.cz],
        ].forEach(([x, z]) => {
          if (groundInXY) surfacePositions.push(x, z, surfaceElevation);
          else surfacePositions.push(x, surfaceElevation, z);
          const along =
            (x - roadCenterX) * roadAxisCos + (z - roadCenterZ) * roadAxisSin;
          const across =
            -(x - roadCenterX) * roadAxisSin + (z - roadCenterZ) * roadAxisCos;
          surfaceUvs.push(along / cobbleWorldCycle, across / cobbleWorldCycle);
        });
      });
      const surfaceGeometry = new THREE.BufferGeometry();
      surfaceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(surfacePositions, 3),
      );
      surfaceGeometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(surfaceUvs, 2),
      );
      surfaceGeometry.computeVertexNormals();
      const pavers = new THREE.Mesh(surfaceGeometry, paverMaterial);
      const paverParts = [],
        paverPartById = new Map();
      // Mantemos a indexação lógica das fatias para status, auditoria e seleção
      // futura. A camada visual é a superfície triangulada inteira, sem instâncias
      // retangulares que possam sangrar para dentro de lotes vizinhos.
      cells.forEach((cell, instanceId) => {
        // Compatibilidade do contrato histórico: quaternion.setFromAxisAngle(upAxis,cell.angle+Math.PI/4) representava a orientação anterior; a linha abaixo corrige o sinal no eixo Three.js.
        const partId = `street-${String(streetNo).padStart(2, "0")}-paver-${String(cell.column).padStart(3, "0")}-${String(cell.row).padStart(3, "0")}`,
          part = {
            partKind: "streets",
            streetPaver: true,
            streetHorizontalSlice: Boolean(cell.horizontalSlice),
            paverIndex: instanceId,
            streetSourceOrdinal: streetNo,
            streetAngle: cell.angle,
            streetSliceLength: cell.length,
            streetSliceWidth: cell.width,
            partId,
            partLabel: `Paralelepípedo · Rua ${String(streetNo).padStart(2, "0")} · fatia ${String(cell.sliceNo || instanceId + 1).padStart(3, "0")}`,
          };
        paverParts.push(part);
        paverPartById.set(partId, instanceId);
      });
      pavers.frustumCulled = false;
      pavers.renderOrder = 30;
      pavers.name = `${source.name || "Rua"}__asfalto-integral-com-fatias`;
      pavers.userData = {
        streetSegment: true,
        streetPaver: true,
        streetPaverSurface: "integral-asphalt-all-upward-road-faces",
        streetPaverIgnoresCenters: true,
        streetGroundPlane: groundInXY ? "xy/z-up" : "xz/y-up",
        streetHorizontalSlices: true,
        streetPaverCount: cells.length,
        streetSourceOrdinal: streetNo,
        streetSourceName: source.name || "Rua de asfalto",
        streetAlignment: "eixo local da via + 45deg de assentamento",
        streetPaverLayout:
          "asfalto integral · fatias horizontais contínuas · seção transversal da rua",
        streetAngle: globalRoadAngle,
        partKind: "streets",
        partId: `street-${String(streetNo).padStart(2, "0")}-paver-grid`,
        partLabel: `Rua ${String(streetNo).padStart(2, "0")} · fatias recortadas pela malha`,
        paverParts,
        paverPartById,
        paverTileSize: tileSize,
        publicRoadSurface: true,
        publicRoadOcclusionPolicy: "exact-road-triangles-over-social-floor",
        defaultMaterial: paverMaterial,
        paverDefaultColor: 0x30363a,
        publicRoadBase: "asfalto integral da malha viária",
        publicRoadCenterlineIgnored: true,
        publicRoadGroundPlane: groundInXY ? "xy/z-up" : "xz/y-up",
        cobbleWorldCycle,
      };
  
      source.updateWorldMatrix?.(true, false);
      this.sceneStage?.updateMatrixWorld?.(true);
      const overlay = new THREE.Group();
      overlay.name = `${source.name || "Rua"}__public-paver-overlay`;
      overlay.renderOrder = 12;
      overlay.userData = {
        publicRoadOverlay: true,
        publicRoadSource: source,
        streetSourceName: source.name || `Rua ${streetNo}`,
        publicPaverOverlay: true,
      };
      if (this.sceneStage?.matrixWorld?.clone) {
        const stageInverse = this.sceneStage.matrixWorld.clone().invert();
        overlay.matrix.copy(stageInverse.multiply(source.matrixWorld));
        overlay.matrixAutoUpdate = false;
        this.sceneStage.add(overlay);
      } else if (source.parent) {
        overlay.position.copy(source.position);
        overlay.quaternion.copy(source.quaternion);
        overlay.scale.copy(source.scale);
        source.parent.add(overlay);
      } else this.sceneStage?.add(overlay);
      overlay.add(pavers);
      // A rua permanece preenchida pela superfície triangulada integral acima.
      // As linhas abaixo materializam a paginação que antes existia somente nos
      // metadados: cada linha cruza a via perpendicularmente ao eixo local e as
      // seções consecutivas têm espessura longitudinal de meia frente de lote.
      const dividerCells = cells.filter(
        (cell) =>
          cell.horizontalSlice &&
          Number.isFinite(cell.width) &&
          cell.width > tileSize * 0.5,
      );
      this._streetPaverMeshes = this._streetPaverMeshes || [];
      if (dividerCells.length) {
        const dividerGeometry = new THREE.BoxGeometry(1, 1, 1);
        const dividerMaterial = new THREE.MeshBasicMaterial({
          color: 0x17324d,
          transparent: true,
          opacity: 0.82,
          depthTest: false,
          depthWrite: false,
        });
        const dividers = new THREE.InstancedMesh(
          dividerGeometry,
          dividerMaterial,
          dividerCells.length,
        );
        const dividerMatrix = new THREE.Matrix4(),
          dividerPosition = new THREE.Vector3(),
          dividerQuaternion = new THREE.Quaternion(),
          dividerScale = new THREE.Vector3(),
          dividerUp = groundInXY
            ? new THREE.Vector3(0, 0, 1)
            : new THREE.Vector3(0, 1, 0);
        dividerCells.forEach((cell, index) => {
          // O BoxGeometry cresce em X; +90° coloca a barra na seção transversal
          // da rua, enquanto cell.angle mantém o alinhamento local em curvas.
          if (groundInXY)
            dividerPosition.set(cell.x, cell.z, surfaceElevation + 0.012);
          else dividerPosition.set(cell.x, surfaceElevation + 0.012, cell.z);
          dividerQuaternion.setFromAxisAngle(
            dividerUp,
            -(cell.angle || globalRoadAngle) + Math.PI / 2,
          );
          dividerScale.set(Math.max(0.4, cell.width * 0.96), 0.018, 0.1);
          dividerMatrix.compose(
            dividerPosition,
            dividerQuaternion,
            dividerScale,
          );
          dividers.setMatrixAt(index, dividerMatrix);
        });
        dividers.instanceMatrix.needsUpdate = true;
        dividers.frustumCulled = false;
        dividers.renderOrder = 31;
        dividers.name = `${source.name || "Rua"}__divisoes-meio-lote`;
        dividers.userData = {
          streetSliceDividers: true,
          streetSliceThickness: ROAD_HALF_LOT_SLICE_WORLD_V1,
          streetSliceOrientation: "transversal ao eixo local da rua",
          streetSourceOrdinal: streetNo,
          publicRoadSurface: true,
        };
        overlay.add(dividers);
        this._streetPaverMeshes.push(dividers);
      }
      this._streetPaverMeshes.push(pavers);
      // A superfície original pode trazer paredes/tons escuros e fica por baixo
      // das fatias. Ocultá-la evita que as juntas revelem a malha preta, sem
      // alterar a geometria-fonte usada para recorte e auditoria.
      source.userData.publicRoadNative = true;
      source.userData.publicRoadBaseHidden = true;
      source.visible = false;
      source.raycast = () => {};
      this.dataset.publicStreetPaverRaster = `${cells.length} fatias horizontais · malha nativa integral · meia frente de lote ${tileSize.toFixed(2)}`;
      this.dataset.publicRoadCoverage = "todas as faces superiores das ruas preenchidas";
      this.dataset.publicRoadSurfaceMode = "asfalto integral · faces superiores completas · centros ignorados";
      this.dataset.publicRoadHalfLotSlice = tileSize.toFixed(2);
      this.dataset.publicRoadAlignment = `PCA local · eixo ${globalRoadAngle.toFixed(3)} rad · pedra +45deg`;
      return pavers;
    }
    segmentStreetMeshes(THREE, sources = []) {
      const segments = [];
      const streetEntries = [];
      let curbRowCount = 0;
  
      // O arquivo canônico já contém a topologia das ruas e dos meios-fios.
      // A malha viária composta é rasterizada pela face superior: cada célula
      // validada vira um bloco físico de paralelepípedo, sem usar envelope de
      // bounding box que possa avançar para dentro dos lotes.
      const nativeSources = sources.filter((source) => source?.isMesh);
      if (nativeSources.length) {
        this._streetPaverMeshes = [];
        const paverSegments = [];
        nativeSources.forEach((source) => {
          source.userData.publicRoadNative = true;
          source.userData.publicRoadBaseHidden = false;
          source.userData.publicRoadCompositeExcluded = false;
          source.visible = true;
          if (/centro|center|eixo.?rua|street.?center/i.test(String(source.name || ""))) {
            // O eixo/centro é apenas referência técnica. A cobertura deve vir
            // da área superior integral da rua, sem transformar o centro em
            // uma faixa independente.
            source.userData.publicRoadCenterlineIgnored = true;
            source.userData.publicRoadBaseHidden = true;
            source.visible = false;
            source.raycast = () => {};
            return;
          }
          if (/meio.?fio|guia|curb/i.test(String(source.name || ""))) {
            // As linhas Meio_fio_* do GLB são fontes técnicas castanhas, não a
            // apresentação do meio-fio. Se permanecerem visíveis junto do
            // overlay, cada faixa reaparece como uma lâmina escura/verde entre
            // os paralelepípedos. A borda pública é representada pelo recorte
            // das fatias e pelo contorno claro, mantendo a fonte original só
            // para auditoria/seleção interna.
            source.userData.publicRoadBaseHidden = true;
            source.visible = false;
            source.raycast = () => {};
            curbRowCount++;
            return;
          }
          const paverMesh = this.createNativeRoadPaverMesh(
            THREE,
            source,
            nativeSources.indexOf(source) + 1,
          );
          if (paverMesh) paverSegments.push(paverMesh);
          else source.raycast = THREE.Mesh.prototype.raycast;
        });
        this.dataset.streetSegmentation =
          "malha nativa · células recortadas por triângulos";
        this.dataset.streetSegmentCount = String(
          paverSegments.reduce(
            (total, mesh) => total + (mesh.userData?.streetPaverCount || 0),
            0,
          ),
        );
        this.dataset.publicStreetSourceBounds = "native-glb-meshes";
        this.dataset.publicStreetCompositeExcluded = "0";
        this.dataset.streetIntersectionCount = "0";
        this.dataset.publicCurbRows = String(curbRowCount);
        this.dataset.publicRoadEdgeTreatment =
          "blocos recortados na malha real + meios-fios nativos";
        this.dataset.publicRoadCenterlinePolicy =
          "centros ignorados · cobertura pela área integral da rua";
        return paverSegments.length
          ? paverSegments
          : nativeSources.filter(
              (source) => !source.userData?.publicRoadCompositeExcluded,
            );
      }
  
      sources.forEach((source, sourceIndex) => {
        const streetNo = sourceIndex + 1;
        const sourceGeometry = source?.geometry;
        const sourcePosition = sourceGeometry?.getAttribute?.("position");
        if (!sourceGeometry || !sourcePosition) return;
  
        if (!sourceGeometry.boundingBox) sourceGeometry.computeBoundingBox();
        const bounds = sourceGeometry.boundingBox;
        if (!bounds) return;
  
        const localRoadPoints = [],
          sourceGeometryIndex = sourceGeometry.getIndex?.(),
          sourceIndexCount = sourceGeometryIndex?.count || sourcePosition.count,
          readSourceIndex = (offset) =>
            sourceGeometryIndex?.getX ? sourceGeometryIndex.getX(offset) : offset;
        for (let offset = 0; offset + 2 < sourceIndexCount; offset += 3) {
          const ia = readSourceIndex(offset),
            ib = readSourceIndex(offset + 1),
            ic = readSourceIndex(offset + 2),
            ax = sourcePosition.getX(ia),
            ay = sourcePosition.getY(ia),
            az = sourcePosition.getZ(ia),
            bx = sourcePosition.getX(ib),
            by = sourcePosition.getY(ib),
            bz = sourcePosition.getZ(ib),
            cx = sourcePosition.getX(ic),
            cy = sourcePosition.getY(ic),
            cz = sourcePosition.getZ(ic),
            abx = bx - ax,
            aby = by - ay,
            abz = bz - az,
            acx = cx - ax,
            acy = cy - ay,
            acz = cz - az,
            nx = aby * acz - abz * acy,
            ny = abz * acx - abx * acz,
            nz = abx * acy - aby * acx,
            normalLength = Math.hypot(nx, ny, nz);
          if (
            Number.isFinite(normalLength) &&
            normalLength >= 0.00001 &&
            Math.abs(ny) / normalLength >= 0.72
          )
            localRoadPoints.push({
              x: (ax + bx + cx) / 3,
              z: (az + bz + cz) / 3,
            });
        }
        const roadAngle = roadPlanarAngleV1(localRoadPoints, 0);
        const width = Math.max(0.001, bounds.max.x - bounds.min.x);
        // No GLB de origem, X/Z formam o footprint e Y é a altura. O frame do
        // modelo faz a rotação para o plano público; o overlay herda esse frame
        // e deve ser calculado nos eixos locais X/Z.
        const depth = Math.max(0.001, bounds.max.z - bounds.min.z);
        // As duas últimas fontes do GLB são superfícies compostas do terreno
        // inteiro (não corredores viários). Fatiá-las criaria um plano de
        // paralelepípedo sobre toda a tela; elas ficam ocultas no público e não
        // participam da cobertura das ruas.
        if (Math.max(width, depth) > 420 || width * depth > 9000) {
          source.userData.publicRoadCompositeExcluded = true;
          source.userData.publicRoadBaseHidden = true;
          source.visible = false;
          return;
        }
        const axis = width >= depth ? "x" : "z";
        const longest = axis === "x" ? width : depth;
        const shortest = axis === "x" ? depth : width;
        const sliceCount = Math.max(
          4,
          Math.min(
            12,
            Math.round(Math.max(4, (longest / Math.max(shortest, 0.001)) * 1.1)),
          ),
        );
        // Shorten the generated surface at both ends and sides. The original
        // GLB streets slightly overlap the lot meshes; the public surface must
        // stop inside the road corridor instead of bleeding into the lots.
        const edgeMargin = Math.min(0.72, Math.max(0.12, shortest * 0.12));
        const sliceLength = longest / sliceCount;
        const crossLength = Math.max(0.2, shortest - edgeMargin * 2);
        // Y é a altura no espaço local do GLB; o MasterplanFrame a converte
        // para Z no mundo público.
        const elevation = bounds.max.y + 0.06;
  
        source.raycast = () => {};
        // Render the public paving as a sibling overlay and hide the original
        // GLB street mesh. This removes the dark/extruded side walls that were
        // visually dominating the imported cobblestone top surface.
        source.updateWorldMatrix?.(true, false);
        this.sceneStage?.updateMatrixWorld?.(true);
        const overlay = new THREE.Group();
        overlay.name = `${source.name || "Rua"}__public-cobble-overlay`;
        // Use the complete world matrix rather than only local position,
        // because the GLB is rotated/scaled by MasterplanFrame before it reaches
        // the shared scene. This keeps the overlay over the real street axis.
        if (this.sceneStage?.matrixWorld?.clone) {
          const stageInverse = this.sceneStage.matrixWorld.clone().invert();
          overlay.matrix.copy(stageInverse.multiply(source.matrixWorld));
          overlay.matrixAutoUpdate = false;
        } else {
          overlay.position.copy(source.position);
          overlay.quaternion.copy(source.quaternion);
          overlay.scale.copy(source.scale);
        }
        overlay.renderOrder = 12;
        this.sceneStage?.add(overlay);
        streetEntries.push({
          source,
          overlay,
          bounds,
          streetNo,
          axis,
          shortest,
          elevation,
          roadAngle,
        });
  
        for (let index = 0; index < sliceCount; index++) {
          const sliceNo = index + 1;
          const center =
            axis === "x"
              ? bounds.min.x + sliceLength * (index + 0.5)
              : bounds.min.z + sliceLength * (index + 0.5);
          const runLength = Math.max(0.2, sliceLength - edgeMargin * 1.35);
          // PlaneGeometry nasce no plano XY. O GLB usa X/Z como footprint e Y
          // como altura; gire a geometria para X/Z e aplique o heading planar da
          // própria via no Mesh. O overlay já carrega o frame completo do GLB;
          // somente a rotação em Y é aplicada aqui, sem tocar no frame vertical.
          const geometry =
            axis === "x"
              ? new THREE.PlaneGeometry(runLength, crossLength)
              : new THREE.PlaneGeometry(crossLength, runLength);
          geometry.rotateX(Math.PI / 2);
          const material = new THREE.MeshBasicMaterial({
            color: 0x78a9ff,
            transparent: true,
            opacity: 0.055,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
          });
          const segment = new THREE.Mesh(geometry, material);
          segment.name = `${source.name || "Asfalto"}__rect_slice_${String(sliceNo).padStart(2, "0")}`;
          if (axis === "x")
            segment.position.set(
              center,
              elevation,
              (bounds.min.z + bounds.max.z) / 2,
            );
          else
            segment.position.set(
              (bounds.min.x + bounds.max.x) / 2,
              elevation,
              center,
            );
          segment.rotation.y = roadAngle;
  
          segment.renderOrder = 30;
          segment.frustumCulled = source.frustumCulled;
          segment.userData = {
            streetSegment: true,
            streetRectangularSlice: true,
            streetSegmentIndex: index,
            streetSlice: sliceNo,
            streetSliceTotal: sliceCount,
            streetSourceOrdinal: streetNo,
            streetSourceName: source.name || "Rua de asfalto",
            streetSliceAxis: axis,
            streetAngle: roadAngle,
            partKind: "streets",
            partId: `street-${String(streetNo).padStart(2, "0")}-slice-${String(sliceNo).padStart(2, "0")}`,
            partLabel: `Paralelepípedo · Rua ${String(streetNo).padStart(2, "0")} · fatia ${String(sliceNo).padStart(2, "0")}`,
          };
          segment.userData.defaultMaterial = material;
          segment.userData.gravelMaterial = this.makeSiteSurfaceMaterial(
            THREE,
            new THREE.MeshStandardMaterial({
              color: 0x8b7659,
              roughness: 0.99,
              metalness: 0,
              side: THREE.DoubleSide,
              depthWrite: true,
            }),
            "gravel",
          );
          overlay.add(segment);
          segments.push(segment);
        }
  
        // Two raised rows of imported paving stones act as a visible
        // paralelepípedo curb. They follow the same local axis as the road, so
        // no fixed screen-space row can drift away from its street after the
        // model is rotated or projected over the aerial image.
        const curbMaterial = new THREE.MeshBasicMaterial({
          color: 0x8d8a82,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
        });
        const curbHeight = Math.max(0.16, Math.min(0.34, shortest * 0.09));
        const curbWidth = Math.max(0.16, Math.min(0.34, shortest * 0.075));
        const curbRun = Math.max(0.2, longest - edgeMargin * 2);
        const curbOffsets =
          axis === "x"
            ? [
                bounds.min.z + edgeMargin + curbWidth * 0.5,
                bounds.max.z - edgeMargin - curbWidth * 0.5,
              ]
            : [
                bounds.min.x + edgeMargin + curbWidth * 0.5,
                bounds.max.x - edgeMargin - curbWidth * 0.5,
              ];
        curbOffsets.forEach((offset, curbIndex) => {
          const row =
            axis === "x"
              ? new THREE.Mesh(
                  new THREE.BoxGeometry(curbRun, curbHeight, curbWidth),
                  curbMaterial,
                )
              : new THREE.Mesh(
                  new THREE.BoxGeometry(curbWidth, curbHeight, curbRun),
                  curbMaterial,
                );
          row.name = `${source.name || "Rua"}__meio-fio-paralelepipedo-${curbIndex + 1}`;
          row.position.set(
            axis === "x" ? (bounds.min.x + bounds.max.x) / 2 : offset,
            elevation + 0.1,
            axis === "x" ? offset : (bounds.min.z + bounds.max.z) / 2,
          );
          row.rotation.y = roadAngle;
          row.renderOrder = 31;
          row.raycast = () => {};
          row.userData = {
            partKind: "curbs",
            publicCurb: true,
            publicRoadSurface: true,
            streetSourceOrdinal: streetNo,
            streetAngle: roadAngle,
            partLabel: `Meio-fio em paralelepípedo · Rua ${streetNo}`,
          };
          overlay.add(row);
          curbRowCount++;
        });
        // O mesh original pode conter pontas/extrusões que invadem os lotes;
        // a superfície pública usa somente o recorte XY com margem.
        source.userData.publicRoadBaseHidden = true;
        source.visible = false;
        overlay.userData = {
          publicRoadOverlay: true,
          publicRoadSource: source,
          streetSourceName: source.name || `Rua ${streetNo}`,
        };
      });
  
      const intersections = [];
      streetEntries.forEach((entry) => {
        const center = new THREE.Vector3(
          (entry.bounds.min.x + entry.bounds.max.x) / 2,
          entry.elevation + 0.12,
          (entry.bounds.min.z + entry.bounds.max.z) / 2,
        );
        const side = Math.max(0.8, entry.shortest * 0.82);
        const material = new THREE.MeshBasicMaterial({
          color: 0xf1c21b,
          transparent: true,
          opacity: 0.075,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const junctionGeometry = new THREE.PlaneGeometry(side, side);
        junctionGeometry.rotateX(Math.PI / 2);
        const square = new THREE.Mesh(junctionGeometry, material);
        const number = intersections.length + 1;
  
        square.position.copy(center);
        square.rotation.y = entry.roadAngle || 0;
        square.name = `${entry.source.name || "Asfalto"}__intersection_${String(number).padStart(2, "0")}`;
        square.renderOrder = 12;
        square.frustumCulled = entry.source.frustumCulled;
        square.userData = {
          streetSegment: true,
          streetIntersection: true,
          streetRectangularSlice: true,
          streetSourceOrdinal: entry.streetNo,
          streetSourceName: entry.source.name || "Rua de asfalto",
          streetAngle: entry.roadAngle || 0,
          partKind: "streets",
          partId: `street-junction-${String(number).padStart(2, "0")}`,
          partLabel: `Paralelepípedo · núcleo da Rua ${String(entry.streetNo).padStart(2, "0")}`,
        };
        square.userData.defaultMaterial = material;
        square.userData.gravelMaterial = this.makeSiteSurfaceMaterial(
          THREE,
          new THREE.MeshStandardMaterial({
            color: 0x8b7659,
            roughness: 0.99,
            metalness: 0,
            side: THREE.DoubleSide,
            depthWrite: true,
          }),
          "gravel",
        );
        entry.overlay?.add(square);
        intersections.push(square);
      });
  
      segments.push(...intersections);
      this.dataset.streetSegmentation = "lazy · até 12 fatias por via + núcleo";
      this.dataset.streetSegmentCount = String(segments.length);
      this.dataset.publicStreetSourceBounds = streetEntries
        .map((entry) => {
          const size = new THREE.Vector3(
            entry.bounds.max.x - entry.bounds.min.x,
            entry.bounds.max.y - entry.bounds.min.y,
            entry.bounds.max.z - entry.bounds.min.z,
          );
          return `${entry.streetNo}:${size.x.toFixed(1)}x${size.y.toFixed(1)}x${size.z.toFixed(1)}`;
        })
        .join("|");
      this.dataset.publicStreetCompositeExcluded = String(
        sources.filter((source) => source?.userData?.publicRoadCompositeExcluded)
          .length,
      );
      this.dataset.streetIntersectionCount = String(intersections.length);
      this.dataset.publicCurbRows = String(curbRowCount);
      this.dataset.publicRoadEdgeTreatment =
        "recuo de pontas + duas filas de paralelepípedo por via";
      return segments;
    }
    syncPublicRoadOverlayTransforms() {
      if (!this.sceneStage) return;
      this.sceneStage.updateMatrixWorld?.(true);
      const inverse = this.sceneStage.matrixWorld?.clone?.().invert?.();
      if (!inverse) return;
      this.sceneStage.traverse?.((node) => {
        const source = node.userData?.publicRoadSource;
        if (!source || node === source || node.matrixAutoUpdate !== false) return;
        source.updateWorldMatrix?.(true, false);
        node.matrix.copy(inverse).multiply(source.matrixWorld);
        node.matrixWorldNeedsUpdate = true;
        node.updateMatrixWorld?.(true);
      });
    }
  };
  for (const name of Object.getOwnPropertyNames(AdminRoadGeometryMethodsV1.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      MapScene.prototype,
      name,
      Object.getOwnPropertyDescriptor(AdminRoadGeometryMethodsV1.prototype, name),
    );
  }
};

