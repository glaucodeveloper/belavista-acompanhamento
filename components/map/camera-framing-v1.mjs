import * as atlasComponents from "../../dist/frontend/components.js";

const CAMERA_FRAMING_METHODS_V1 = Object.freeze(["updatePublicFocusFrame","fitPublicGapView","fitSceneView"]);
const CAMERA_FRAMING_CONFIG_V1 = Object.freeze(["ADMIN_FIXED_MAP_ROTATION_DEG","DEFAULT_SCENE_ZOOM","MAP_CAMERA_VIEW"]);

export const assertCameraFramingDependenciesV1 = (MapScene, dependencies) => {
  if (typeof atlasComponents.assertAtlasMapSceneCameraFramingDependencies === "function")
    return atlasComponents.assertAtlasMapSceneCameraFramingDependencies(MapScene, dependencies);
  if (typeof MapScene !== 'function' || !MapScene.prototype) throw new TypeError('Camera framing requires MapScene.');
  if (!dependencies || typeof dependencies !== 'object') throw new TypeError('Camera framing requires injected dependencies.');
  for (const key of CAMERA_FRAMING_CONFIG_V1) {
    const value = dependencies.config?.[key];
    if (key === 'MAP_CAMERA_VIEW' ? typeof value !== 'string' || !value : !Number.isFinite(value)) throw new TypeError('Camera framing requires config.' + key + '.');
  }
  const browser = dependencies.browser;
  if (!browser?.document || !browser?.window || typeof browser.getComputedStyle !== 'function' || typeof browser.setTimeout !== 'function') throw new TypeError('Camera framing requires document, window, getComputedStyle and setTimeout ports.');
  return dependencies;
};

export const installCameraFramingV1 = (MapScene, dependencies) => {
  assertCameraFramingDependenciesV1(MapScene, dependencies);
  if (typeof atlasComponents.installAtlasMapSceneCameraFraming === "function")
    return atlasComponents.installAtlasMapSceneCameraFraming(MapScene, dependencies);
  const { config, browser } = dependencies;
  const { ADMIN_FIXED_MAP_ROTATION_DEG, DEFAULT_SCENE_ZOOM, MAP_CAMERA_VIEW } = config;
  const { document: documentRef, window: windowRef, getComputedStyle: getComputedStyleFn, setTimeout: schedule } = browser;
  const CameraFramingMethodsV1 = class {
  updatePublicFocusFrame() {
    if (
      !this.isPublicCustomerExperience?.() ||
      !this.THREE ||
      !this.camera ||
      !this.sceneStage ||
      !this.masterplanModel
    )
      return false;
    const canvas = this.querySelector(".three-overlay"),
      width = Math.max(
        1,
        canvas?.clientWidth || this.clientWidth || windowRef.innerWidth,
      ),
      height = Math.max(
        1,
        canvas?.clientHeight || this.clientHeight || windowRef.innerHeight,
      );
    const THREE = this.THREE;
    try {
      this.camera.updateMatrixWorld(true);
      this.sceneStage.updateMatrixWorld(true);
      this.masterplanModel.updateWorldMatrix?.(true, true);
      const box = new THREE.Box3().setFromObject(this.masterplanModel);
      if (box.isEmpty()) return false;
      const points = [];
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const point = new THREE.Vector3(x, y, z).project(this.camera);
            points.push({
              x: ((point.x + 1) * width) / 2,
              y: ((-point.y + 1) * height) / 2,
            });
          }
      const minX = Math.min(...points.map((point) => point.x)),
        maxX = Math.max(...points.map((point) => point.x));
      const minY = Math.min(...points.map((point) => point.y)),
        maxY = Math.max(...points.map((point) => point.y));
      const padX = Math.max(18, Math.min(42, width * 0.024)),
        padY = Math.max(18, Math.min(44, height * 0.028));
      const frameWidth = Math.min(
        width * 0.86,
        Math.max(180, maxX - minX + padX * 2),
      );
      const frameHeight = Math.min(
        height * 0.88,
        Math.max(150, maxY - minY + padY * 2),
      );
      const centerX = Math.max(
        frameWidth / 2,
        Math.min(width - frameWidth / 2, (minX + maxX) / 2),
      );
      const centerY = Math.max(
        frameHeight / 2,
        Math.min(height - frameHeight / 2, (minY + maxY) / 2),
      );
      this.style.setProperty("--public-focus-x", `${centerX.toFixed(1)}px`);
      this.style.setProperty("--public-focus-y", `${centerY.toFixed(1)}px`);
      this.style.setProperty("--public-focus-w", `${frameWidth.toFixed(1)}px`);
      this.style.setProperty("--public-focus-h", `${frameHeight.toFixed(1)}px`);
      this.dataset.publicFocusFrame = `${Math.round(centerX)},${Math.round(centerY)},${Math.round(frameWidth)},${Math.round(frameHeight)}`;
      this.dataset.publicFocusFrameSource = "projected loteamento footprint";
      return true;
    } catch (error) {
      this.dataset.publicFocusFrameStatus = `error · ${String(error?.message || error).slice(0, 80)}`;
      return false;
    }
  }
  fitPublicGapView() {
    if (
      !this.isPublicCustomerExperience() ||
      !this.THREE ||
      !this.camera ||
      !this.sceneStage ||
      !this.masterplanModel
    )
      return false;
    const canvas = this.querySelector(".three-overlay"),
      width = Math.max(
        1,
        canvas?.clientWidth || this.clientWidth || windowRef.innerWidth,
      ),
      height = Math.max(
        1,
        canvas?.clientHeight || this.clientHeight || windowRef.innerHeight,
      );
    const visible = (element) => {
      if (!element) return null;
      const style = getComputedStyleFn(element),
        rect = element.getBoundingClientRect();
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity || 1) < 0.05 ||
        rect.width < 2 ||
        rect.height < 2
      )
        return null;
      return rect;
    };
    const hero = visible(documentRef.querySelector(".public-hero-letter")),
      chat = visible(
        documentRef.querySelector("public-lead-chat .public-chatbox"),
      );
    const mobile = width <= 900;
    const margin = Math.max(18, Math.min(44, width * 0.026));
    let left = mobile ? width * 0.08 : (hero?.right ?? width * 0.22) + margin;
    let right = mobile ? width * 0.92 : (chat?.left ?? width * 0.78) - margin;
    if (!mobile && right - left < 180) {
      left = width * 0.26;
      right = width * 0.78;
    }
    const gapWidth = Math.max(180, right - left),
      targetX = mobile ? width / 2 : (left + right) / 2,
      targetY = height * 0.5;
    const visualTilt = Number(this._sceneVisual?.tilt || 22);
    const signature = [
      Math.round(width),
      Math.round(height),
      Math.round(left),
      Math.round(right),
      Math.round(visualTilt * 10),
      documentRef.body.dataset.publicScrollSection || "title",
    ].join("|");
    if (this.dataset.publicGapFrame === signature) return false;
    this.dataset.publicGapFrame = signature;
    this.dataset.publicGapFrameRect = `${Math.round(left)},${Math.round(height * 0.08)},${Math.round(gapWidth)},${Math.round(height * 0.84)}`;
    this.dataset.publicGapFrameSource = mobile
      ? "viewport-mobile"
      : hero && chat
        ? "hero-right · chat-left"
        : "public-safe-corridor";

    const THREE = this.THREE;
    const projection = () => {
      this.camera.updateMatrixWorld(true);
      this.sceneStage.updateMatrixWorld(true);
      this.masterplanModel.updateWorldMatrix?.(true, true);
      const box = new THREE.Box3().setFromObject(this.masterplanModel);
      if (box.isEmpty()) return null;
      const points = [];
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const point = new THREE.Vector3(x, y, z).project(this.camera);
            points.push({
              x: ((point.x + 1) * width) / 2,
              y: ((-point.y + 1) * height) / 2,
              depth: point.z,
            });
          }
      const xs = points.map((point) => point.x),
        ys = points.map((point) => point.y),
        center = box.getCenter(new THREE.Vector3()).project(this.camera);
      return {
        box,
        screen: {
          left: Math.min(...xs),
          right: Math.max(...xs),
          top: Math.min(...ys),
          bottom: Math.max(...ys),
          centerX: ((center.x + 1) * width) / 2,
          centerY: ((-center.y + 1) * height) / 2,
          depth: center.z,
        },
      };
    };
    const before = projection();
    if (!before) return false;
    const currentScale = Math.max(
      0.01,
      Number(this._sceneVisual?.scale || this.sceneManualZoom || 1.62),
    );
    // Quanto mais oblíqua a câmera, maior é a distorção vertical projetada.
    // A compensação cresce de forma suave com a inclinação para preencher o
    // corredor sem revelar o vazio acima do terreno.
    const tiltCompensation = 1 + Math.max(0, visualTilt - 18) * 0.018;
    const targetWidth = Math.max(
        360,
        Math.min(width * 0.82, gapWidth * 2.7 * tiltCompensation),
      ),
      targetHeight = Math.min(height * 0.94, height * 0.86 * tiltCompensation);
    const currentWidth = Math.max(1, before.screen.right - before.screen.left),
      currentHeight = Math.max(1, before.screen.bottom - before.screen.top);
    const ratio = Math.max(
      0.82,
      Math.min(
        1.55,
        Math.min(targetWidth / currentWidth, targetHeight / currentHeight),
      ),
    );
    const targetScale = Math.max(1.2, Math.min(3.6, currentScale * ratio));
    this.sceneManualZoom = targetScale;
    this.sceneUserInteracted = true;
    this.dataset.sceneZoom = String(targetScale);
    this.dataset.publicGapFrameZoom = targetScale.toFixed(3);
    this.dataset.publicGapFrameTilt = String(visualTilt);
    this.dataset.publicTiltZoomCompensation = tiltCompensation.toFixed(3);
    const visual = this._sceneVisual || {};
    this.setSceneVisual(Number(visual.tilt || 22), 0, targetScale);
    const afterScale = projection();
    if (afterScale) {
      // A correção usa o centro do corredor livre, não o centro da viewport.
      // Isso impede que o loteamento seja empurrado para baixo do chat quando
      // o letreiro ainda está visível.
      const projectedTarget = new THREE.Vector3(
        (targetX / width) * 2 - 1,
        -((targetY / height) * 2 - 1),
        afterScale.screen.depth,
      ).unproject(this.camera);
      const worldCenter = afterScale.box.getCenter(new THREE.Vector3()),
        delta = projectedTarget.sub(worldCenter);
      const pan = this.sceneManualPan || { x: 0, y: 0 };
      const nextPan = {
        x: (Number(pan.x) || 0) + delta.x,
        y: (Number(pan.y) || 0) + delta.y,
      };
      this.sceneManualPan = nextPan;
      this.style.setProperty("--scene-pan-x", `${nextPan.x}px`);
      this.style.setProperty("--scene-pan-y", `${nextPan.y}px`);
      this.dataset.scenePan = `${Math.round(nextPan.x)},${Math.round(nextPan.y)}`;
      this.setSceneVisual(Number(visual.tilt || 22), 0, targetScale);
    }
    this.updatePublicFocusFrame?.();
    this.dataset.publicGapFrameTarget = `${Math.round(targetX)},${Math.round(targetY)}`;
    this.dataset.publicGapFrameModel = `${Math.round(currentWidth)}x${Math.round(currentHeight)} → ${Math.round(targetWidth)}x${Math.round(targetHeight)}`;
    this.dataset.publicGapFrameStatus = "fitted-between-letter-and-chat";
    this.renderer?.render(this.scene, this.camera);
    return true;
  }
  fitSceneView(animate = true) {
    this.markAdminCameraInteracted();
    this.sceneManualRotation = this.hasAttribute("data-admin-shared-public-map")
      ? ADMIN_FIXED_MAP_ROTATION_DEG
      : 0;
    this.sceneManualZoom = this.isAdminStandaloneInteractiveV5370()
      ? 1
      : DEFAULT_SCENE_ZOOM;
    this.sceneManualPan = { x: 0, y: 0 };
    this.sceneTiltAdjust = 0;
    this.rememberMapView();
    this.dataset.sceneRotation = `${Math.round(this.sceneManualRotation)}deg`;
    this.dataset.sceneRotationLock = this.hasAttribute(
      "data-admin-shared-public-map",
    )
      ? `${ADMIN_FIXED_MAP_ROTATION_DEG}deg · fixo`
      : "";
    this.dataset.sceneZoom = `${Math.round(this.sceneManualZoom * 100)}%`;
    this.dataset.scenePan = "0,0";
    this.style.setProperty("--scene-pan-x", "0px");
    this.style.setProperty("--scene-pan-y", "0px");
    if (this.isAdminStandaloneInteractiveV5370()) {
      this._adminStandaloneTransitionV5370 = Symbol("standalone-fit");
      // O enquadramento é uma ação de recuperação: aplicar os três valores
      // no mesmo frame evita que as animações de rotação/zoom se cancelem.
      this.setAdminStandaloneRotationV5370(0, false);
      this.setAdminStandalonePanV5370(0, 0, false);
      // Não usar zoom=1 como valor absoluto: o mínimo depende do aspecto
      // atual do viewport. COVER calcula o zoom necessário automaticamente.
      this.ensureAdminStandaloneAerialCoverV9?.({
        clampPan: true,
        render: true,
      });
      return;
    }
    this.applySceneView(MAP_CAMERA_VIEW, animate);
    if (animate) schedule(() => this.syncThree(), 520);
  }
  };
  for (const method of CAMERA_FRAMING_METHODS_V1) Object.defineProperty(MapScene.prototype, method, Object.getOwnPropertyDescriptor(CameraFramingMethodsV1.prototype, method));
  return MapScene;
};
