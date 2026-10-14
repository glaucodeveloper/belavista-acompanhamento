const MAP_PDF_INTERFACE_METHODS_V1 = Object.freeze(["openMapCanvasPrintV1"]);

export const assertMapPdfInterfaceDependenciesV1 = (MapScene, dependencies) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Map PDF interface requires the existing MapScene constructor.");
  if (!dependencies || typeof dependencies !== "object")
    throw new TypeError("Map PDF interface requires injected dependencies.");
  for (const method of ["get"])
    if (typeof dependencies.appStore?.[method] !== "function")
      throw new TypeError(`Map PDF interface requires appStore.${method}().`);
  for (const service of ["ensureMapPdfLegendStyles", "renderMapPdfLegends", "esc", "ico", "notify"])
    if (typeof dependencies[service] !== "function")
      throw new TypeError(`Map PDF interface requires ${service}().`);
  if (!dependencies.stageOverlayLabels || !dependencies.stageOverlayColors)
    throw new TypeError("Map PDF interface requires the stage overlay labels and colors.");
  const { document, window, requestAnimationFrame } = dependencies.browser || {};
  if (typeof document?.querySelector !== "function" || typeof document?.createElement !== "function" ||
      typeof document?.body?.append !== "function" || !window ||
      !["addEventListener", "removeEventListener", "print"].every((method) => typeof window?.[method] === "function") ||
      typeof requestAnimationFrame !== "function")
    throw new TypeError("Map PDF interface requires document, print window and animation-frame ports.");
  return dependencies;
};

export const installMapPdfInterfaceV1 = (MapScene, dependencies) => {
  assertMapPdfInterfaceDependenciesV1(MapScene, dependencies);
  const {
    appStore,
    ensureMapPdfLegendStyles,
    renderMapPdfLegends,
    stageOverlayLabels,
    stageOverlayColors,
    esc,
    ico,
    notify,
  } = dependencies;
  const { document: documentRef, window: windowRef, requestAnimationFrame: requestFrame } = dependencies.browser;

  const MapPdfInterfaceMethodsV1 = class {
    openMapCanvasPrintV1() {
      const shell = documentRef.querySelector(".app-shell");
      if (!shell) return;
      this._mapPdfInterfaceCleanupV1?.();
      const canvas = this.querySelector(".three-overlay"),
        rect = canvas?.getBoundingClientRect?.();
      shell.classList.remove("map-canvas-print-mode");
      shell.classList.add("map-pdf-interface-mode");
      documentRef.body.classList.add("map-pdf-interface-open");
      this.dataset.mapPrintState = "prepared";
      this.dataset.mapPrintViewport = `${Math.round(rect?.width || 0)}x${Math.round(rect?.height || 0)}`;
      this.dataset.mapPrintCamera = `${Math.round(Number(this.sceneManualZoom || 0) * 100)}% · ${Math.round(Number(this.sceneManualRotation || 0))}° · tilt ${Math.round(Number(this._sceneVisual?.tilt || 0))}°`;
      this.setAttribute("data-map-print-target", "true");
      const interfaceNode = documentRef.createElement("section");
      interfaceNode.className = "map-pdf-interface";
      interfaceNode.dataset.mapPdfInterface = "true";
      interfaceNode.setAttribute("data-map-pdf-interface", "true");
      interfaceNode.setAttribute("role", "dialog");
      interfaceNode.setAttribute("aria-modal", "true");
      interfaceNode.setAttribute("aria-label", "Interface PDF do mapa");
      ensureMapPdfLegendStyles();
      interfaceNode.innerHTML = `<header class="map-pdf-interface-toolbar"><div><span>INTERFACE PDF · MAPA CONFIGURADO</span><strong>Mapa operacional</strong><small>${esc(this.dataset.mapPrintViewport)} · ${esc(this.dataset.mapPrintCamera)}</small></div><div><button type="button" class="map-pdf-interface-print" data-map-pdf-print>${ico("printer")} Imprimir PDF</button><button type="button" class="map-pdf-interface-close" data-map-pdf-close aria-label="Fechar interface PDF">${ico("x")} Fechar</button></div></header>`;
      interfaceNode.querySelector('.map-pdf-interface-toolbar small')?.remove();
      interfaceNode.querySelector('.map-pdf-interface-toolbar>div:first-child').insertAdjacentHTML('beforeend', renderMapPdfLegends({ map: this, state: appStore.get(), labels: stageOverlayLabels, colors: stageOverlayColors }));
      documentRef.body.append(interfaceNode);
      let closed = false;
      const restore = () => {
        if (closed) return;
        closed = true;
        shell.classList.remove("map-pdf-interface-mode");
        documentRef.body.classList.remove("map-pdf-interface-open");
        this.removeAttribute("data-map-print-target");
        this.dataset.mapPrintState = "idle";
        windowRef.removeEventListener("keydown", onKey);
        windowRef.removeEventListener("afterprint", markReady);
        interfaceNode.remove();
        if (this._mapPdfInterfaceCleanupV1 === restore)
          this._mapPdfInterfaceCleanupV1 = null;
        requestFrame(() => {
          this.syncThree?.();
          this._adminStandaloneRendererV5370?.render(
            this._adminStandaloneSceneV5370,
            this._adminStandaloneCameraV5370,
          );
        });
      };
      const markReady = () => {
        if (!closed) this.dataset.mapPrintState = "ready";
      };
      const onKey = (event) => {
        if (event.key === "Escape") restore();
      };
      this._mapPdfInterfaceCleanupV1 = restore;
      interfaceNode
        .querySelector("[data-map-pdf-close]")
        ?.addEventListener("click", restore);
      interfaceNode
        .querySelector("[data-map-pdf-print]")
        ?.addEventListener("click", () => {
          this.dataset.mapPrintState = "printing";
          requestFrame(() => windowRef.print());
        });
      windowRef.addEventListener("keydown", onKey);
      windowRef.addEventListener("afterprint", markReady);
      windowRef.lucide?.createIcons();
      notify(
        "Interface PDF aberta com o mapa e o enquadramento configurados.",
        "success",
      );
      requestFrame(() =>
        requestFrame(() => {
          this.renderer?.render?.(this.scene, this.camera);
          this._adminStandaloneRendererV5370?.render(
            this._adminStandaloneSceneV5370,
            this._adminStandaloneCameraV5370,
          );
          this.syncThree?.();
          this.dataset.mapPrintState = "ready";
        }),
      );
    }
  };

  for (const method of MAP_PDF_INTERFACE_METHODS_V1)
    Object.defineProperty(MapScene.prototype, method, Object.getOwnPropertyDescriptor(MapPdfInterfaceMethodsV1.prototype, method));
  return MapScene;
};
