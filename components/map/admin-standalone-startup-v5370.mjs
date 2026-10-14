/** Installs the complete administrative Three.js map startup flow on MapScene. */
export const installAdminStandaloneStartupV5370 = (MapScene, dependencies = {}) => {
  const {
    ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1,
    ADMIN_REFERENCE_AERIAL_ASSET_V1,
    ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1,
    ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1,
    ADMIN_GEO_MODEL_FINE_ROTATION_DEG,
    ADMIN_GEO_MODEL_FINE_SHIFT_X,
    ADMIN_GEO_MODEL_FINE_SHIFT_Y,
    ADMIN_STANDALONE_MODEL_ALIGNMENT_V1,
    ADMIN_STANDALONE_MODEL_TURN_DEG_V1,
    MAP_GEOREFERENCE_FALLBACK,
    MODEL_EXTRA_Y_ROTATION_RAD,
    MODEL_VERTICAL_EXAGGERATION,
    SCENE_MAP_Z,
    TILT_DRAG_SENSITIVITY,
    ZOOM_DRAG_SENSITIVITY,
    DateRef = Date,
    consoleRef = console,
    localStorageRef = {
      setItem: (...args) => globalThis.localStorage.setItem(...args),
    },
    requestAnimationFrameRef = globalThis.requestAnimationFrame,
    windowRef = globalThis.window,
    appStore,
    loadAdminDwgGeoreferenceV1,
    loadGlbWithClientCacheV14,
    runtimeRouteV1,
    solarStateForHour,
    warpAdminGlbToFixedAerialV1,
  } = dependencies;

  MapScene.prototype.persistAdminStandalonePhaseV5370 = function(phase, extra = {}) {
    const payload = {
      version: "5.3.70",
      phase,
      at: new DateRef().toISOString(),
      ...extra,
    };
    globalThis.__BELAVISTA_ADMIN_STANDALONE_3D_V5370 = payload;
    this.dataset.adminStandalonePhase = phase;
    this.updateMap3DLoadingScreenV1(phase, extra);
    try {
      localStorageRef.setItem(
        "belavista.3d.boot.last.v5370",
        JSON.stringify(payload),
      );
    } catch {}
    return payload;
  };

  MapScene.prototype.mountAdminStandalone3DV5370 = function() {
    if (this._adminStandaloneMountedV5370) return;
    this._adminStandaloneMountedV5370 = true;

    this.dataset.mapInit = "admin-static-first-v5370";
    this.dataset.adminStandaloneBoot = "static-first";
    this.dataset.three = "deferred";
    this.dataset.modelRender = "static-first-paint";
    this.dataset.modelBootVersion = "5.3.70";

    const host = this.querySelector(".map-host");
    if (host) {
      // A fotografia é aplicada como textura da malha de terreno da cena 3D.
      // O host legado fica inerte para não mascarar a renderização anterior.
      host.style.setProperty("background-image", "none", "important");
      host.style.backgroundColor = "transparent";
      host.style.opacity = "0";
      host.style.visibility = "hidden";
      host.style.display = "block";
      host.style.pointerEvents = "none";
      host.style.zIndex = "0";
      host.dataset.backgroundRole = "disabled-three-scene-only";
      this.dataset.adminSatelliteState = "waiting-three-terrain";
      this.dataset.adminSatelliteSource = `${ADMIN_REFERENCE_AERIAL_ASSET_V1} · scene texture only`;
    }

    this.style.setProperty("background-image", "none", "important");
    this.style.backgroundColor = "transparent";
    this.style.backgroundSize = "auto";
    this.style.backgroundPosition = "initial";

    // A tela de progresso só deve aparecer quando o operador pedir o 3D.
    // Mantê-la visível aqui reproduzia o sintoma "Aguardando o renderer"
    // mesmo quando o mapa-base já estava disponível.
    this.querySelector("[data-map-3d-loading]")?.setAttribute("hidden", "");

    const canvas = this.querySelector(".three-overlay");
    if (canvas) {
      canvas.style.opacity = "0";
      canvas.style.pointerEvents = "none";
    }
    this.installAdminMasterplanOverlayV1();
    this.installSatelliteLotPlanOverlayV1({ markers: true, outlines: false });
    const badge = this.querySelector(".map-badge");
    if (badge) {
      badge.insertAdjacentHTML(
        "afterend",
        `<button type="button"
          class="admin-3d-safe-activate-v5370"
          data-admin-3d-activate-v5370>
          <b>Ativar 3D</b>
          <small>Renderer isolado · sem Leaflet · sem loops</small>
        </button>`,
      );
    }

    const button = this.querySelector("[data-admin-3d-activate-v5370]");
    if (button) {
      // O 3D volta a iniciar automaticamente; o botão só aparece como
      // recuperação caso WebGL ou GLB falhe.
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
    }
    const start = () => {
      if (this.modelReady) return Promise.resolve(true);
      if (this._adminStandalonePromiseV5370) {
        return this._adminStandalonePromiseV5370;
      }
      if (this._adminStandaloneStartScheduledV5370) return null;

      this._adminStandaloneStartScheduledV5370 = true;
      if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.querySelector("b").textContent = "Carregando 3D…";
      }

      const promise = this.startAdminStandalone3DV5370();
      promise
        .then(() => {
          button?.remove();
        })
        .catch((error) => {
          this._adminStandaloneStartScheduledV5370 = false;
          if (button) {
            button.hidden = false;
            button.removeAttribute("aria-hidden");
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.querySelector("b").textContent = "Tentar 3D novamente";
            button.querySelector("small").textContent = String(
              error?.message || error,
            ).slice(0, 120);
          }
          this.updateMap3DLoadingScreenV1("three-init-error");
          consoleRef.error("[Aliança Park v5.3.70] 3D isolado falhou.", error);
        });
      return promise;
    };

    button?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        start();
      },
      true,
    );

    // Restaura o boot automático da cena administrativa anterior.
    this.dataset.admin3dAutostart = "after-static-first-paint";
    requestAnimationFrameRef(() =>
      requestAnimationFrameRef(() => {
        windowRef.setTimeout(() => start(), 350);
      }),
    );

    try {
      localStorageRef.setItem(
        "belavista.3d.boot.last.v5370",
        JSON.stringify({
          version: "5.3.70",
          phase: "static-ready",
          at: new DateRef().toISOString(),
        }),
      );
    } catch {}
  };

  MapScene.prototype.startAdminStandalone3DV5370 = async function() {
    if (this._adminStandalonePromiseV5370) {
      return this._adminStandalonePromiseV5370;
    }

    const run = async () => {
      this.dataset.roadSurfacePatchVersion = "integral-asphalt-slices-v16-curb-subtraction";
      this._adminStandaloneActivatedV5370 = true;
      this.persistAdminStandalonePhaseV5370("import-three");

      const THREE = await import("three");
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      this.THREE = THREE;

      this.persistAdminStandalonePhaseV5370("renderer");

      const canvas = this.querySelector(".three-overlay");
      if (!canvas) throw new Error("Canvas 3D ausente.");

      // A câmera ortográfica já produz a inclinação real do terreno. O CSS
      // global do mapa aplica rotateX ao canvas para o modo cartográfico 2D;
      // mantê-lo aqui criava uma segunda perspectiva e esticava a foto na
      // vertical. Nesta cena a inclinação deve existir somente na câmera.
      this.dataset.adminStandalone3d = "true";
      canvas.style.setProperty("transform", "none", "important");
      canvas.style.setProperty(
        "transform-origin",
        "center center",
        "important",
      );

      // Testa o contexto antes de inicializar o renderer. Em alguns
      // navegadores o WebGL falha durante a criação do WebGLRenderer e a
      // exceção interrompia o mapa administrativo inteiro, em vez de deixar
      // o mapa-base disponível como fallback.
      let webglContext = null;
      try {
        webglContext =
          canvas.getContext("webgl2", {
            alpha: true,
            antialias: false,
            powerPreference: "low-power",
          }) ||
          canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            powerPreference: "low-power",
          });
      } catch (error) {
        throw new Error(
          `WebGL indisponível no mapa administrativo: ${error?.message || error}`,
        );
      }
      if (!webglContext)
        throw new Error("WebGL indisponível no mapa administrativo.");

      const sceneWorld = this.querySelector(".scene-world");
      if (sceneWorld) {
        sceneWorld.style.display = "block";
        sceneWorld.style.visibility = "visible";
        sceneWorld.style.opacity = "1";
        sceneWorld.style.position = "absolute";
        sceneWorld.style.inset = "0";
        sceneWorld.style.zIndex = "2";
        sceneWorld.style.pointerEvents = "auto";
      }

      // Desliga qualquer contexto legado que tenha escapado de versões antigas.
      try {
        this._mapResizeObserver?.disconnect?.();
        this._compactResizeObserver?.disconnect?.();
      } catch {}

      const renderer = new THREE.WebGLRenderer({
        canvas,
        context: webglContext,
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
        precision: "mediump",
        preserveDrawingBuffer: false,
      });
      // A camada administrativa usa materiais sem textura/sombra. Desligar
      // o shadow map reduz alocações de GPU e evita crash em WebGL limitado.
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;

      const scene = new THREE.Scene();
      // O mapa administrativo usa projeção ortográfica para manter a escala
      // paralela entre a imagem aérea, o relevo e a planta de loteamento.
      const camera = new THREE.OrthographicCamera(
        -160,
        160,
        160,
        -160,
        0.1,
        4000,
      );
      // O mapa é Z-up. Definir o eixo superior antes do primeiro lookAt evita
      // que a câmera use o Y-up padrão e depois faça um roll quando o controle
      // de inclinação reaplica Z-up.
      camera.up.set(0, 0, 1);
      camera.position.set(0, -180, 165);
      camera.lookAt(0, 0, 0);
      this.dataset.adminStandaloneCameraProjection = "orthographic";
      this.dataset.adminStandaloneCameraProjectionMode = "parallel";

      const hemisphere = new THREE.HemisphereLight(0xe5f1ff, 0x203024, 2.3);
      const sun = new THREE.DirectionalLight(0xffffff, 3.2);
      sun.castShadow = true;
      sun.position.set(-100, -130, 220);
      sun.target.position.set(0, 0, 0);
      scene.add(hemisphere, sun, sun.target);
      this._adminStandaloneSolarHemisphere = hemisphere;
      this._adminStandaloneSolarLight = sun;
      this.applySolarLighting(
        solarStateForHour(
          this.solarHour ?? appStore.get().solarHour ?? 9,
          this.solarGeo || MAP_GEOREFERENCE_FALLBACK,
        ),
      );

      const stage = new THREE.Group();
      scene.add(stage);

      this._adminStandaloneRendererV5370 = renderer;
      this._adminStandaloneSceneV5370 = scene;
      this._adminStandaloneCameraV5370 = camera;
      this._adminStandaloneStageV5370 = stage;

      // NÃO preencher this.sceneStage/this.map/this.modelGroup:
      // isso mantém todo o runtime legado de syncThree/setSceneVisual inerte.

      const fit = () => {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(2, Math.round(rect.width));
        const height = Math.max(2, Math.round(rect.height));
        const sizeKey = `${width}x${height}`;
        if (this._adminStandaloneSizeV5370 === sizeKey) return;
        this._adminStandaloneSizeV5370 = sizeKey;
        renderer.setSize(width, height, false);
        if (camera.isOrthographicCamera) {
          const viewHeight = Math.max(
            2,
            Number(this._adminStandaloneOrthoViewHeightV5370) || 320,
          );
          const viewWidth = viewHeight * (width / height);
          camera.left = -viewWidth / 2;
          camera.right = viewWidth / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
        } else {
          camera.aspect = width / height;
        }
        camera.updateProjectionMatrix();
        this.ensureAdminStandaloneAerialCoverV9?.({
          clampPan: true,
          render: false,
        });
        renderer.render(scene, camera);
      };

      fit();

      if (window.ResizeObserver) {
        this._adminStandaloneResizeObserverV5370?.disconnect?.();
        this._adminStandaloneResizeObserverV5370 = new ResizeObserver(() =>
          requestAnimationFrame(fit),
        );
        this._adminStandaloneResizeObserverV5370.observe(this);
      }

      // A tela só fica visível depois que a imagem estiver em uma malha
      // Three.js; antes disso não há mapa pintado por CSS para encobrir a
      // ausência do terreno.
      canvas.style.opacity = "0";
      canvas.style.visibility = "hidden";
      canvas.style.display = "block";
      canvas.style.pointerEvents = "auto";
      canvas.style.touchAction = "none";
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.zIndex = "2";

      this.persistAdminStandalonePhaseV5370("download");

      // A fotografia precisa entrar na cena antes do GLB. Assim o mapa não
      // fica preto aguardando o modelo: a base já é uma malha Three.js
      // texturizada e depois será recalibrada para o envelope do loteamento.
      await this.prepareAdminStandaloneAerialPreviewV5380({
        THREE,
        stage,
        camera,
        canvas,
      }).catch((error) => {
        this.dataset.adminSatelliteState = "preview-unavailable";
        this.dataset.adminSatelliteSource =
          "three terrain preview unavailable · no DOM background fallback";
        this.dataset.adminSatelliteError = String(
          error?.message || error || "unknown aerial preview error",
        ).slice(0, 240);
        console.warn(
          "[Aliança Park v5.3.80] prévia aérea Three.js indisponível.",
          error,
        );
      });

      const loader = new GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loadGlbWithClientCacheV14(
          loader,
          runtimeRouteV1(
            "/assets/model/alianca_park_masterplan_preview.glb",
            "v=standalone-5371",
          ),
          resolve,
          (progress) => {
            if (progress.total) {
              this.persistAdminStandalonePhaseV5370("download", {
                percent: Math.round((progress.loaded / progress.total) * 100),
                loaded: progress.loaded,
                total: progress.total,
              });
            }
          },
          reject,
        );
      });

      this.persistAdminStandalonePhaseV5370("parsed");

      let source = gltf.scene;
      let adminFixedAerialGeoWarp = null;
      try {
        const georef = await loadAdminDwgGeoreferenceV1();
        const [traceResponse, roadTraceResponse] = await Promise.all([
          fetch(ADMIN_REFERENCE_AERIAL_LOT_TRACE_URL_V1),
          fetch(ADMIN_REFERENCE_AERIAL_ROAD_TRACE_URL_V1),
        ]);
        const trace = traceResponse.ok ? await traceResponse.json() : null;
        const roadTrace = roadTraceResponse.ok ? await roadTraceResponse.json() : null;
        this._adminStandaloneRoadTraceV1 = roadTrace;
        if (trace?.lotCount !== 298 || !Array.isArray(trace?.grid))
          throw new Error("Traçado aéreo dos 298 lotes indisponível ou inválido");
        if (!Array.isArray(roadTrace?.roads) || !roadTrace.roads.length)
          throw new Error("Contorno aéreo das ruas indisponível ou inválido");
        const warped = warpAdminGlbToFixedAerialV1({
          THREE,
          source,
          georef,
          image: this.adminReferenceAerialImageV1,
          trace,
          roadTrace,
        });
        if (warped) {
          source = warped;
          adminFixedAerialGeoWarp = warped.userData.adminReferenceAerialGeoWarp;
          this.dwgGeo = georef;
          this.dataset.adminReferenceAerialGeoWarp =
            ADMIN_REFERENCE_AERIAL_GEO_WARP_VERSION_V1;
          this.dataset.adminReferenceAerialTrace =
            `${trace.lotCount} lotes · ${Number(trace.snappedEdges) || 0} bordas tracejadas · erro ${Number(trace.scoreBefore).toFixed(2)}→${Number(trace.scoreAfter).toFixed(2)} px`;
          this.dataset.adminReferenceAerialRoadTrace =
            `${roadTrace.roads.length} contornos de rua fotográficos`;
          this.dataset.adminReferenceAerialLeveledFootprints =
            `${warped.userData.adminReferenceAerialGeoWarp.leveledLotMeshes} lot meshes · ${warped.userData.adminReferenceAerialGeoWarp.leveledStreetMeshes} street meshes`;
          this.dataset.adminReferenceAerialGeoEpsg = String(
            Number(georef?.crs?.epsg) || 31984,
          );
          this.dataset.adminReferenceAerialGeoError = "";
        }
      } catch (error) {
        this.dataset.adminReferenceAerialGeoWarp = "fallback-legacy";
        this.dataset.adminReferenceAerialGeoError = String(
          error?.message || error || "unknown georeference error",
        ).slice(0, 240);
        console.warn(
          "[Aliança Park fixed aerial] georreferência indisponível; usando encaixe legado.",
          error,
        );
      }

      const sourceBox = new THREE.Box3().setFromObject(source);
      const size = sourceBox.getSize(new THREE.Vector3());
      const center = sourceBox.getCenter(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z) || 1;
      const factor = 138 / largest;
      // No modo georreferenciado a geometria já está em XY da própria imagem;
      // no fallback legado o chão continua em X/Z.
      this._adminStandaloneGroundFootprintV5370 = {
        x: Math.max(1, Number(size.x) || 1),
        z: Math.max(1, Number(adminFixedAerialGeoWarp ? size.y : size.z) || 1),
      };

      const wrapper = new THREE.Group();
      let fineTransform = wrapper;
      if (adminFixedAerialGeoWarp) {
        // O modelo georreferenciado já está no mesmo XY da imagem. O pivô fino
        // precisa ser o centro do próprio modelo, não a origem da cena/imagem;
        // assim escala e rotação preservam o encaixe central e os shifts ficam
        // sendo o deslocamento final sobre o mapa.
        const finePivot = new THREE.Group();
        finePivot.name = "AdminFixedAerialFinePivot";
        finePivot.position.set(center.x, center.y, 0);
        source.position.set(-center.x, -center.y, 0);
        finePivot.add(source);
        wrapper.add(finePivot);
        fineTransform = finePivot;
      } else {
        source.position.set(-center.x, -sourceBox.min.y, -center.z);
        wrapper.add(source);
      }
      const standaloneAlignment = ADMIN_STANDALONE_MODEL_ALIGNMENT_V1,
        alignmentRotation = standaloneAlignment.rotationDeg || {},
        alignmentTranslation = standaloneAlignment.translation || {},
        alignmentScaleXY = standaloneAlignment.scaleXY || {},
        alignmentScale = Math.max(
          0.5,
          Math.min(1.5, Number(standaloneAlignment.scale) || 1),
        ),
        alignmentScaleX = Math.max(
          0.5,
          Math.min(2, Number(alignmentScaleXY.x) || 1),
        ),
        alignmentScaleY = Math.max(
          0.5,
          Math.min(2, Number(alignmentScaleXY.y) || 1),
        );
      if (adminFixedAerialGeoWarp) {
        fineTransform.quaternion.setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          (ADMIN_GEO_MODEL_FINE_ROTATION_DEG * Math.PI) / 180,
        );

        wrapper.position.set(
          ADMIN_GEO_MODEL_FINE_SHIFT_X,
          ADMIN_GEO_MODEL_FINE_SHIFT_Y,
          0,
        );

        wrapper.userData.adminReferenceAerialGeoWarp = adminFixedAerialGeoWarp;
        wrapper.userData.adminReferenceAerialFinePivot = {
          x: center.x,
          y: center.y,
          z: 0,
        };
      } else {
        wrapper.scale.set(
          factor * alignmentScale * alignmentScaleX,
          factor * MODEL_VERTICAL_EXAGGERATION * alignmentScale,
          factor * alignmentScale * alignmentScaleY,
        );
        // O GLB usa Y como cima e X/Z como chão. Componha a transformação como
        // quaternions explícitos: primeiro Y-up → Z-up e depois o rumo em torno
        // do Z mundial. A composição evita que a ordem Euler misture rumo com
        // inclinação e incline o plano do loteamento em relação à fotografia.
        const modelHeadingRad =
          MODEL_EXTRA_Y_ROTATION_RAD +
          (ADMIN_STANDALONE_MODEL_TURN_DEG_V1 * Math.PI) / 180;
        const zUpQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            Math.PI / 2,
          ),
          headingQuaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            modelHeadingRad,
          ),
          alignmentEuler = new THREE.Euler(
            ((Number(alignmentRotation.x) || 0) * Math.PI) / 180,
            ((Number(alignmentRotation.y) || 0) * Math.PI) / 180,
            ((Number(alignmentRotation.z) || 0) * Math.PI) / 180,
            "XYZ",
          ),
          alignmentQuaternion = new THREE.Quaternion().setFromEuler(
            alignmentEuler,
          );
        // Uma única composição, sempre na mesma ordem: conversão do GLB para
        // Z-up, rumo no plano do mapa e calibração local.
        wrapper.quaternion
          .copy(headingQuaternion)
          .multiply(zUpQuaternion)
          .multiply(alignmentQuaternion);
      }
      wrapper.updateMatrixWorld(true);

      const oriented = new THREE.Box3().setFromObject(wrapper);
      wrapper.position.z += Math.max(0, -oriented.min.z);
      wrapper.updateMatrixWorld(true);

      // Materiais administrativos simples: nenhuma textura GLB é enviada
      // para GPU. Isso remove o maior vetor de estouro/compilação no boot.
      const materials = {
        lots: new THREE.MeshBasicMaterial({
          color: 0x75c98a,
          side: THREE.DoubleSide,
        }),
        streets: new THREE.MeshBasicMaterial({
          color: 0x30363a,
          side: THREE.DoubleSide,
        }),
        landscape: new THREE.MeshBasicMaterial({
          color: 0x2f8b57,
          side: THREE.DoubleSide,
        }),
        leisure: new THREE.MeshBasicMaterial({
          color: 0xd8d0b6,
          side: THREE.DoubleSide,
        }),
        other: new THREE.MeshBasicMaterial({
          color: 0xaeb8ae,
          side: THREE.DoubleSide,
        }),
      };

      const meshes = [];
      const activityPartOrdinals = { lots: 0, streets: 0, other: 0 };
      let skippedHuge = 0;
      let totalTriangles = 0;

      source.traverse((node) => {
        if (!node.isMesh) return;

        const geometry = node.geometry;
        const triangles = geometry?.index
          ? Math.floor((geometry.index.count || 0) / 3)
          : Math.floor((geometry?.getAttribute?.("position")?.count || 0) / 3);

        node.userData.__v5370Triangles = Number(triangles) || 0;
        totalTriangles += node.userData.__v5370Triangles;

        const name = String(node.name || "").toLowerCase();
        const role = String(node.userData?.belavistaRole || "").toLowerCase();

        const kind =
          role === "lot" || role === "lots" || /(lote|quadra|gleba)/.test(name)
            ? "lots"
            : role === "street" ||
                role === "streets" ||
                role === "road" ||
                /(asfalto|rua|road|street|meio.?fio|guia|paviment)/.test(name)
              ? "streets"
              : role === "landscape" ||
                  /arvore|tree|tronco|copa|folhagem/.test(name)
                ? "landscape"
                : role === "leisure" ||
                    /lazer|court|gym|pavilhao|play|praca/.test(name)
                  ? "leisure"
                  : "other";

        // Descarta texturas/materiais originais no renderer administrativo.
        node.material = materials[kind];
        const physicalKind =
          kind === "lots" || kind === "streets" ? kind : "other";
        activityPartOrdinals[physicalKind]++;
        node.userData.partKind = physicalKind;
        const commonAreaFilterOnly =
          kind === "leisure" ||
          /area.?de.?lazer|court|gym|pavilhao|play|praca|paisag|social/i.test(
            String(node.name || ""),
          );
        node.userData.commonAreaFilterOnly = commonAreaFilterOnly;
        node.userData.partId =
          physicalKind === "lots"
            ? node.name
            : physicalKind === "streets"
              ? `street-source-${activityPartOrdinals.streets}`
              : node.name || `other-${activityPartOrdinals.other}`;
        node.userData.partLabel =
          physicalKind === "lots"
            ? `Lote ${String(node.name || "").replace(/^.*?lote[_ -]?/i, "")}`
            : physicalKind === "streets"
              ? `Trecho viário ${activityPartOrdinals.streets}`
              : kind === "leisure"
                ? "Área social"
                : String(node.name || "Elemento do empreendimento");
        node.userData.defaultMaterial = node.material;
        node.visible = false;
        node.frustumCulled = true;

        // Mesh extremamente grande fica fora da visualização segura.
        if (node.userData.__v5370Triangles > 220000) {
          node.userData.__v5370Skipped = "triangle-limit";
          skippedHuge++;
          return;
        }

        meshes.push(node);
      });

      meshes.sort(
        (a, b) =>
          (a.userData.__v5370Triangles || 0) -
          (b.userData.__v5370Triangles || 0),
      );

      stage.add(wrapper);
      // O mapa administrativo usa este renderer isolado, portanto a base
      // viária é instalada mais adiante diretamente sobre `surface`, o mesmo
      // plano UV da fotografia. O GLB permanece apenas como fonte semântica;
      // eixos/centros técnicos não entram na cena renderizada.
      this.dataset.modelOperationalGeometry = "waiting · asfalto integral georreferenciado";
      this.dataset.modelHeavyGeometry = "integral-asphalt-road-surface";

      // BELAVISTA_ADMIN_3D_CAMERA_FIT_V5372
      // Centraliza no plano e calcula câmera a partir do bounding sphere real.
      let fitBox = new THREE.Box3().setFromObject(wrapper);
      let fitCenter = fitBox.getCenter(new THREE.Vector3());

      wrapper.position.x -= fitCenter.x;
      wrapper.position.y -= fitCenter.y;
      wrapper.position.z -= fitBox.min.z;
      if (wrapper.userData?.adminReferenceAerialGeoWarp) {
        // O centro (0,0) do plano da fotografia também sofre a centralização
        // aplicada ao wrapper. Guarde essa posição para que a malha da imagem
        // use exatamente o mesmo referencial, independentemente de elementos
        // do GLB que extrapolem o limite oficial do DWG.
        wrapper.userData.adminReferenceAerialGeoWarp.surfaceCenterX =
          Number(wrapper.position.x) || 0;
        wrapper.userData.adminReferenceAerialGeoWarp.surfaceCenterY =
          Number(wrapper.position.y) || 0;
      }
      wrapper.updateMatrixWorld(true);

      fitBox = new THREE.Box3().setFromObject(wrapper);
      fitCenter = fitBox.getCenter(new THREE.Vector3());

      const fitSphere = fitBox.getBoundingSphere(new THREE.Sphere());
      const fitRadius = Math.max(1, fitSphere.radius);
      const fitDistance = camera.isOrthographicCamera
        ? fitRadius * 3.2
        : (fitRadius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) *
          1.35;

      // O pivô de câmera é o plano de contato, não o centro vertical do GLB.
      // Mirar o centro do volume faz a base da imagem deslizar quando a
      // inclinação muda, porque o lookAt passa a conter a altura do modelo.
      const groundFocus = new THREE.Vector3(
        fitCenter.x,
        fitCenter.y,
        SCENE_MAP_Z,
      );
      camera.position.set(
        groundFocus.x,
        groundFocus.y - fitDistance * 0.82,
        groundFocus.z + fitDistance * 0.62,
      );
      camera.near = Math.max(0.05, fitDistance / 1000);
      camera.far = Math.max(5000, fitDistance * 12);
      camera.zoom = 1;
      if (camera.isOrthographicCamera) {
        const viewportWidth = Math.max(
          2,
          canvas.clientWidth || this.clientWidth || 2,
        );
        const viewportHeight = Math.max(
          2,
          canvas.clientHeight || this.clientHeight || 2,
        );
        const viewHeight = Math.max(2, fitRadius * 2.75);
        const viewWidth = viewHeight * (viewportWidth / viewportHeight);
        this._adminStandaloneOrthoViewHeightV5370 = viewHeight;
        camera.left = -viewWidth / 2;
        camera.right = viewWidth / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
      }
      camera.updateProjectionMatrix();
      camera.lookAt(groundFocus);

      // O renderer administrativo mantém o mesmo estado de navegação da
      // cena compartilhada, mas em grupos/câmeras próprios. Registrar o
      // envelope do modelo aqui permite que pan e rotação sejam recalculados
      // sem depender do runtime legado do mapa.
      this._adminStandaloneWrapperV5370 = wrapper;
      this._adminStandaloneFitBoxV5370 = fitBox.clone();
      this._adminStandaloneFitCenterV5370 = groundFocus.clone();
      // O primeiro foco coincide com o enquadramento inicial. Depois que o
      // operador pan/zoom/gira a cena, a inclinação troca este valor pelo
      // ponto atualmente sob o centro da viewport.
      this._adminStandaloneFocusPointV5370 = groundFocus.clone();
      this._adminStandaloneFitRadiusV5370 = fitRadius;
      this._adminStandaloneCameraDistanceV5370 =
        camera.position.distanceTo(groundFocus);
      this._adminStandaloneTiltV5370 = this.adminStandaloneCurrentTiltV5370();
      this._adminStandaloneRotationV5370 = 0;
      this._adminStandalonePanV5370 = { x: 0, y: 0 };
      this.sceneManualRotation = 0;
      this.sceneManualPan = { x: 0, y: 0 };
      this.sceneManualZoom = Number(camera.zoom) || 1;
      // A câmera acabou de ser criada com a inclinação real do fit. Não
      // reaplicar um ajuste persistido antes da cena estar estável: isso
      // evita divergência entre o valor exibido e a posição efetiva.
      this.sceneTiltAdjust = 0;
      // Não renderizar uma segunda vez durante o boot: o GLB ainda está
      // concluindo a montagem do cenário e uma chamada precoce pode travar
      // o renderer em máquinas com WebGL/GPU mais sensível. O ajuste salvo
      // será aplicado somente quando o controle receber uma interação.
      this._adminStandaloneTiltV5370 = Math.max(
        0.5,
        Math.min(72, this._adminStandaloneTiltV5370),
      );
      this.dataset.sceneTilt = `${Math.round(this._adminStandaloneTiltV5370)}deg`;
      this.dataset.sceneRotation = "0deg";
      this.dataset.scenePan = "0,0";
      this.dataset.sceneZoom = `${Math.round(camera.zoom * 100)}%`;
      this.dataset.scenePanSpace =
        "world-translation · zoom-aware · standalone-fit-envelope";

      this.dataset.admin3dFitRadius = fitRadius.toFixed(2);
      this.dataset.admin3dFitDistance = fitDistance.toFixed(2);
      this.persistAdminStandalonePhaseV5370("camera-fit", {
        radius: Number(fitRadius.toFixed(2)),
        distance: Number(fitDistance.toFixed(2)),
        center: [
          Number(fitCenter.x.toFixed(2)),
          Number(fitCenter.y.toFixed(2)),
          Number(fitCenter.z.toFixed(2)),
        ],
      });

      // O renderer administrativo é isolado para não reativar os loops do
      // mapa legado. A textura aérea é uma etapa obrigatória da cena: o GLB
      // só continua o staging depois que a imagem já foi ligada ao terreno
      // Three.js. Se essa etapa falhar, o mapa fica explicitamente sem base
      // raster, em vez de voltar a desenhar a fotografia como background.
      await this.loadAdminStandaloneSatelliteBaseV5380({
        THREE,
        stage,
        fitBox,
        fitCenter,
      }).catch((error) => {
        this.dataset.adminSatelliteState = "unavailable";
        this.dataset.adminSatelliteSource =
          "three terrain unavailable · no DOM background fallback";
        this.dataset.adminSatelliteError = String(
          error?.message || error || "unknown satellite terrain error",
        ).slice(0, 240);
        console.warn(
          "[Aliança Park v5.3.80] mosaico satélite administrativo indisponível.",
          error,
        );
      });
      const nativeRoadSource = meshes.find(
        (node) => String(node?.name || "") === "Asfalto_tracado_do_PDF",
      );
      this.ensureAdminStandaloneRoadSurfaceV1(nativeRoadSource);

      // O GLB mantém sua geometria semântica integrada ao sistema.
      // V13 preserva UV/imageBounds apenas como metadados de seleção;
      // a fotografia aérea fica EXCLUSIVAMENTE no terreno e não é aplicada
      // como textura aos lotes/ruas do modelo.
      this.bindAdminStandaloneAerialTextureV5380?.({
        THREE,
        texture: this.adminReferenceAerialTextureV1,
        surface: this._adminStandaloneAerialSurfaceV5380,
        wrapper,
        meshes,
      });

      this.persistAdminStandalonePhaseV5370("gpu-staging", {
        meshCount: meshes.length,
        skippedHuge,
        totalTriangles,
      });

      // Cena renderizável, porém nenhum mesh do GLB está visível ainda.
      renderer.render(scene, camera);

      for (let index = 0; index < meshes.length; index++) {
        const node = meshes[index];
        this.persistAdminStandalonePhaseV5370("gpu-mesh", {
          meshNumber: index + 1,
          meshCount: meshes.length,
          meshName: String(node.name || "mesh").slice(0, 120),
          meshTriangles: node.userData.__v5370Triangles || 0,
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
          this.isPublicCustomerExperience() &&
          (node.userData?.publicRoadBaseHidden ||
            /^(street|road|streets|curb|curbs)$/.test(stagingRole) ||
            /(asfalto|rua|road|street|meio.?fio|guia|curb|paviment)/i.test(
              stagingName,
            ));
        const publicDividerSource =
          this.isPublicCustomerExperience() &&
          /^divisa(?:[_\s-]|$)/i.test(stagingName);
        const rasterMaskIsPrimary = Boolean(
          this._adminStandaloneRasterMaskModelV1,
        );
        const dividerGuide = /^divisa(?:[_\s-]|$)/i.test(stagingName);
        node.visible =
          !dividerGuide &&
          !node.userData.commonAreaFilterOnly &&
          (rasterMaskIsPrimary
            ? true
            : !(publicRoadSource || publicDividerSource));
        if (dividerGuide) {
          node.userData.referenceDividerHidden = true;
          node.raycast = () => {};
        }
        if (rasterMaskIsPrimary) {
          // O raster já desenha o loteamento no mesmo UV da fotografia.
          // Preserve o mesh para hit-test, sem desenhar um segundo footprint
          // cuja geometria foi ajustada por um referencial diferente.
          const selectionOnly = (material) => {
            if (!material) return material;
            material.colorWrite = false;
            material.depthWrite = false;
            return material;
          };
          if (Array.isArray(node.material))
            node.material.forEach(selectionOnly);
          else selectionOnly(node.material);
          const defaultMaterial = node.userData?.defaultMaterial;
          if (Array.isArray(defaultMaterial))
            defaultMaterial.forEach(selectionOnly);
          else selectionOnly(defaultMaterial);
          node.userData.rasterMaskSelectionOnly = true;
        }
        if (publicRoadSource) {
          node.userData.publicRoadBaseHidden = true;
          node.raycast = () => {};
        }
        if (publicDividerSource) {
          node.userData.publicInternalDividerHidden = true;
          node.raycast = () => {};
        }
        renderer.render(scene, camera);

        this.persistAdminStandalonePhaseV5370("gpu-mesh-visible", {
          meshNumber: index + 1,
          meshCount: meshes.length,
          meshName: String(node.name || "mesh").slice(0, 120),
          meshTriangles: node.userData.__v5370Triangles || 0,
        });

        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      }

      this.dataset.modelRender = "admin-standalone-live-v5370";
      this.activityMapStandaloneParts = meshes;
      this.buildAdminStandaloneStageOverlayTargetsV5370();
      this.dataset.modelReady = "true";
      this.modelReady = true;
      canvas.style.opacity = "1";
      canvas.style.visibility = "visible";
      sceneWorld?.style.setProperty("display", "block");
      sceneWorld?.style.setProperty("visibility", "visible");
      sceneWorld?.style.setProperty("opacity", "1");
      this.modelReady = true;
      canvas.style.opacity = "1";
      canvas.style.visibility = "visible";
      sceneWorld?.style.setProperty("display", "block");
      sceneWorld?.style.setProperty("visibility", "visible");
      sceneWorld?.style.setProperty("opacity", "1");
      this.dataset.modelParts = `meshes:${meshes.length}|ignorados:${skippedHuge}`;
      this.classList.add("model-ready");
      if (this._stageOverlaySelectionInitializedV1)
        this.setStageOverlays?.(this._requestedStageOverlayKeysV1 || [], false);
      else if (this.stageOverlayKey)
        this.applyAdminStandaloneStageOverlayV5370(this.stageOverlayKey);
      this.syncOperationalRecordMapV5370?.(appStore.get().records || []);
      this.paintProgressAreaSelectionV1(
        appStore.get().mapProgressSelection || [],
      );

      // Controle direto do renderer isolado: sem appStore, Leaflet,
      // syncThree, compact mirrors ou observers de runtime.
      let down = null;
      let last = null;
      let dragging = false;
      let mode = "";
      let selecting = false;

      canvas.addEventListener("contextmenu", (event) => event.preventDefault());

      canvas.addEventListener(
        "wheel",
        (event) => {
          event.preventDefault();
          const source = this;
          const factor = event.ctrlKey ? 1.06 : 1.12;
          source.setSceneZoomAt(
            source.sceneManualZoom *
              (event.deltaY < 0 ? factor : 1 / factor),
            event.clientX,
            event.clientY,
            false,
          );
          renderer.render(scene, camera);
        },
        { passive: false },
      );

      canvas.addEventListener("pointerdown", (event) => {
        down = last = { x: event.clientX, y: event.clientY };
        dragging = false;
        const altSelection = event.altKey && event.button === 0;
        selecting =
          (this.recordPaintMode ||
            this.mapSelectionMode === "progress" ||
            altSelection) &&
          event.button === 0;
        if (
          altSelection &&
          !this.recordPaintMode &&
          this.mapSelectionMode !== "progress"
        )
          this.setMapSelectionMode("progress");
        const zooming =
          !selecting &&
          event.button === 0 &&
          (event.shiftKey || event.ctrlKey);
        const tilting = false;
        mode = selecting
          ? "select"
          : zooming
            ? "zoom"
            : tilting
              ? "tilt"
              : event.button === 2
                ? "rotate"
                : "pan";
        this.dataset.mapGesture =
          mode === "select"
            ? "select-progress"
            : mode === "zoom"
              ? event.shiftKey
                ? "shift-drag-zoom"
                : "ctrl-drag-zoom"
              : mode;
        if (selecting) this.beginMapAreaSelection(event.clientX, event.clientY);
        canvas.setPointerCapture?.(event.pointerId);
      });

      canvas.addEventListener("pointermove", (event) => {
        if (!down || !last) return;
        const dx = event.clientX - last.x;
        const dy = event.clientY - last.y;
        if (
          !dragging &&
          Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6
        )
          dragging = true;

        if (dragging && mode === "select") {
          this.updateMapAreaSelection(event.clientX, event.clientY);
        } else if (dragging && mode === "zoom") {
          this.setSceneZoomAt(
            this.sceneManualZoom - dy * ZOOM_DRAG_SENSITIVITY,
            event.clientX,
            event.clientY,
            false,
          );
        } else if (dragging && mode === "tilt") {
          this.setSceneTiltAdjust(
            this.sceneTiltAdjust + dy * TILT_DRAG_SENSITIVITY,
            false,
          );
        } else if (dragging && mode === "rotate") {
          this.setSceneRotation(
            (this._adminStandaloneRotationV5370 || 0) - dx * 0.32,
            false,
          );
        } else if (dragging && mode === "pan") {
          const delta = this.screenDragPanDelta(
            last.x,
            last.y,
            event.clientX,
            event.clientY,
          );
          const pan = this.sceneManualPan || { x: 0, y: 0 };
          this.setScenePan(
            (Number(pan.x) || 0) + (Number(delta?.x) || 0),
            (Number(pan.y) || 0) + (Number(delta?.y) || 0),
            false,
          );
          this.dataset.mapPanBehavior =
            "world-translation · projected screen delta · rotation-safe v5378";
        }

        if (dragging) last = { x: event.clientX, y: event.clientY };
        renderer.render(scene, camera);
      });

      const release = (event) => {
        const total = down
          ? Math.hypot(event.clientX - down.x, event.clientY - down.y)
          : 0;
        if (down && mode === "select") {
          if (dragging) {
            if (this.recordPaintMode) {
              const parts = this.collectModelPartsInRect(down, {
                x: event.clientX,
                y: event.clientY,
              });
              if (parts.length > 1) this.selectRecordMapParts(parts);
              else if (parts.length === 1) this.selectRecordMapPart(parts[0]);
              else this.clearCurrentMapSelectionV1(true);
            } else {
              this.finishMapAreaSelection(event.clientX, event.clientY);
            }
          } else {
            this.removeMapAreaSelection();
            const point = this.pointFromClient(event.clientX, event.clientY);
            const picked = point ? this.pickModelAt(point) : false;
            if (!picked) this.clearCurrentMapSelectionV1(true);
          }
          this._suppressMapToggleUntil = performance.now() + 520;
        } else if (down && event.button !== 2 && !dragging && total <= 6) {
          const point = this.pointFromClient(event.clientX, event.clientY);
          const picked = point ? this.pickModelAt(point) : false;
          if (!picked) this.clearCurrentMapSelectionV1(true);
          this._suppressMapToggleUntil = performance.now() + 520;
        } else if (down && dragging) {
          this.constrainScenePan("standalone-pointer-release");
          this._suppressMapToggleUntil = performance.now() + 520;
        }
        if (canvas.hasPointerCapture?.(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        down = null;
        last = null;
        dragging = false;
        selecting = false;
        mode = "";
        delete this.dataset.mapGesture;
      };

      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointercancel", (event) => {
        this.removeMapAreaSelection();
        release(event);
      });

      this.persistAdminStandalonePhaseV5370("ready", {
        meshCount: meshes.length,
        skippedHuge,
        totalTriangles,
      });

      renderer.render(scene, camera);
      return true;
    };

    this._adminStandalonePromiseV5370 = run().finally(() => {
      this._adminStandalonePromiseV5370 = null;
    });

    return this._adminStandalonePromiseV5370;
  };
};

