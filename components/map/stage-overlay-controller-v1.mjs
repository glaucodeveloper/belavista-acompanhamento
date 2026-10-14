export const installStageOverlayControllerV1 = (
  MapScene,
  {
    appStore,
    notify,
    performanceNow,
    requestAnimationFrame,
    setTimeout,
    stageOverlayColors,
    stageOverlayKey,
    stageOverlayLabels,
    STAGE_FILTER_TRANSITION_MS,
  },
) => {
  Object.assign(MapScene.prototype, {
    buildStageOverlayTargets() {
      if (!this.THREE || !this.modelGroup) return;
      const all = [
        ...(this.modelParts?.lots || []),
        ...(this.modelParts?.streets || []),
      ];
      if (!all.length) return;

      const scenic = [
        ...(this.modelLandscapeNodes || []),
        ...(this.modelLeisureNodes || []),
      ];
      this.scene?.updateMatrixWorld?.(true);

      const centers = [];
      for (const node of all) {
        const geometry = node?.geometry;
        if (!geometry?.getAttribute?.("position")) continue;
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (!box) continue;
        const center = box.getCenter(new this.THREE.Vector3());
        node.localToWorld(center);
        centers.push({ node, x: center.x, y: center.y });
      }
      if (!centers.length) return;

      const xs = centers.map((item) => item.x),
        ys = centers.map((item) => item.y);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const nx = (item) => (item.x - minX) / Math.max(1, maxX - minX),
        ny = (item) => (item.y - minY) / Math.max(1, maxY - minY);
      const zones = {
        terraplanagem: (item) => ny(item) > 0.64,
        drenagem: (item) => nx(item) < 0.58 && ny(item) > 0.24 && ny(item) < 0.82,
        "rede-agua": (item) =>
          nx(item) >= 0.34 &&
          nx(item) < 0.72 &&
          ny(item) > 0.18 &&
          ny(item) < 0.75,
        "rede-eletrica": (item) => nx(item) >= 0.62 && ny(item) > 0.28,
        pavimentacao: (item) =>
          ny(item) < 0.36 || (nx(item) > 0.48 && ny(item) < 0.54),
        urbanizacao: (item) => nx(item) < 0.34 && ny(item) < 0.42,
      };

      this.stageOverlayTargets = {};
      Object.entries(zones).forEach(([key, predicate], index) => {
        let selected = centers.filter(predicate).map((item) => item.node);
        if (selected.length < 4) {
          const start = Math.floor(
            (index / Math.max(1, all.length)) * all.length,
          );
          selected = all.slice(
            start,
            start + Math.max(8, Math.floor(all.length * 0.12)),
          );
        }
        if (key === "urbanizacao") selected = [...selected, ...scenic];
        this.stageOverlayTargets[key] = selected;
      });

      this.dataset.overlayManifest = "ready-lightweight-v5365";
      this.dataset.overlayTargetTotal = String(all.length);
      this.dataset.overlayScenicTargets = String(scenic.length);
    },
    buildAdminStandaloneStageOverlayTargetsV5370() {
      const all = Array.isArray(this.activityMapStandaloneParts)
        ? this.activityMapStandaloneParts.filter(Boolean)
        : [];
      if (!this.THREE || !all.length) return;
      this._adminStandaloneStageV5370?.updateMatrixWorld?.(true);
      const centers = [];
      for (const node of all) {
        const box = new this.THREE.Box3().setFromObject(node);
        if (box.isEmpty?.()) continue;
        const center = box.getCenter(new this.THREE.Vector3());
        centers.push({ node, x: center.x, y: center.y });
      }
      if (!centers.length) return;
      const xs = centers.map((item) => item.x),
        ys = centers.map((item) => item.y);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const nx = (item) => (item.x - minX) / Math.max(1, maxX - minX),
        ny = (item) => (item.y - minY) / Math.max(1, maxY - minY);
      const zones = {
        terraplanagem: (item) => ny(item) > 0.64,
        drenagem: (item) => nx(item) < 0.58 && ny(item) > 0.24 && ny(item) < 0.82,
        "rede-agua": (item) =>
          nx(item) >= 0.34 &&
          nx(item) < 0.72 &&
          ny(item) > 0.18 &&
          ny(item) < 0.75,
        "rede-eletrica": (item) => nx(item) >= 0.62 && ny(item) > 0.28,
        pavimentacao: (item) =>
          ny(item) < 0.36 || (nx(item) > 0.48 && ny(item) < 0.54),
        urbanizacao: (item) => nx(item) < 0.34 && ny(item) < 0.42,
      };
      this.stageOverlayTargets = {};
      Object.entries(zones).forEach(([key, predicate], index) => {
        let selected = centers.filter(predicate).map((item) => item.node);
        if (selected.length < 4) {
          const start = Math.floor(
            (index / Math.max(1, all.length)) * all.length,
          );
          selected = all.slice(
            start,
            start + Math.max(8, Math.floor(all.length * 0.12)),
          );
        }
        if (key === "urbanizacao")
          selected = [
            ...selected,
            ...all
              .filter((item) => item.userData?.partKind === "other")
              .slice(0, 80),
          ];
        this.stageOverlayTargets[key] = [...new Set(selected)];
      });
      this.dataset.overlayManifest = "ready-standalone-v5370";
      this.dataset.overlayTargetTotal = String(all.length);
    },
    applyAdminStandaloneStageOverlayV5370(targetKey = null) {
      const all = Array.isArray(this.activityMapStandaloneParts)
        ? this.activityMapStandaloneParts.filter(Boolean)
        : [];
      if (!all.length) return;
      if (
        !this.stageOverlayTargets ||
        !Object.keys(this.stageOverlayTargets).length
      )
        this.buildAdminStandaloneStageOverlayTargetsV5370();
      const targets = new Set(
          targetKey ? this.stageOverlayTargets?.[targetKey] || [] : [],
        ),
        color = stageOverlayColors[targetKey] || 0x2fe6ae;
      all.forEach((item) => {
        if (!item?.material) return;
        if (item.userData?.commonAreaFilterOnly)
          item.visible = targetKey === "urbanizacao";
        item.material = this.stageBaseMaterial(item);
        delete item.userData.overlayMaterial;
        if (targetKey && targets.has(item)) {
          item.userData.overlayMaterial = this.stageOverlayMaterial(
            item,
            targetKey,
            color,
          );
          item.material = item.userData.overlayMaterial;
        }
      });
      this.dataset.overlayTransition = targetKey ? "entering" : "exiting";
      this.dataset.overlayTransitionKey = targetKey || "none";
      this.dataset.overlayTransitionProgress = "100";
      this.dataset.overlayTargets = String(targets.size);
      this.dataset.overlayColor = `#${color.toString(16).padStart(6, "0")}`;
      this._adminStandaloneRendererV5370?.render?.(
        this._adminStandaloneSceneV5370,
        this._adminStandaloneCameraV5370,
      );
      this.dataset.overlayTransition = "settled";
    },
    stageBaseMaterial(item) {
      return (
        item.userData.progressMaterial ||
        item.userData.selectionMaterial ||
        item.userData.statusMaterial ||
        item.userData.recordStatusMaterial ||
        item.userData.publicStatusMaterial ||
        item.userData.defaultMaterial ||
        item.material
      );
    },
    stageOverlayMaterial(item, key, color) {
      const source =
        key === "terraplanagem"
          ? (item.userData.partKind === "streets"
              ? item.userData.gravelMaterial
              : item.userData.earthworkMaterial) || item.userData.defaultMaterial
          : this.stageBaseMaterial(item);
      const paint = (mat) => {
        if (!mat) return mat;
        const clone = mat.clone?.() || mat;
        if (clone.color) clone.color.setHex(color);
        if (clone.emissive) {
          clone.emissive.setHex(color);
          clone.emissiveIntensity = 0.6;
        }
        clone.transparent = true;
        clone.opacity = Math.max(0.72, Math.min(0.92, clone.opacity ?? 1));
        clone.depthWrite = false;
        return clone;
      };
      return Array.isArray(source) ? source.map(paint) : paint(source);
    },
    cloneStageMaterial(material) {
      return Array.isArray(material)
        ? material.map((item) => item?.clone?.() || item)
        : material?.clone?.() || material;
    },
    transitionStageOverlay(targetKey) {
      if (
        this.activityMapStandaloneParts?.length &&
        this._adminStandaloneStageV5370
      ) {
        this.applyAdminStandaloneStageOverlayV5370(targetKey);
        return;
      }
      const all = [
          ...(this.modelParts?.lots || []),
          ...(this.modelParts?.streets || []),
          ...(this.modelParts?.other || []),
        ],
        targets = new Set(
          targetKey ? this.stageOverlayTargets?.[targetKey] || [] : [],
        ),
        color = stageOverlayColors[targetKey] || 0x2fe6ae;
      const records = [];
      this._stageOverlayTransitionToken = Symbol("stage-filter");
      const token = this._stageOverlayTransitionToken;
      all.forEach((item) => {
        if (!item?.material) return;
        const previous = this.cloneStageMaterial(item.material);
        delete item.userData.overlayMaterial;
        const next =
          targetKey && targets.has(item)
            ? this.stageOverlayMaterial(item, targetKey, color)
            : this.stageBaseMaterial(item);
        if (!next) return;
        const fromParts = Array.isArray(previous) ? previous : [previous],
          toParts = Array.isArray(next) ? next : [next],
          parts = [];
        fromParts.forEach((from, index) => {
          const to = toParts[index] || toParts[toParts.length - 1] || from;
          if (!from) return;
          const entering = Boolean(targetKey && targets.has(item)),
            fromOpacity = entering ? 0 : Number(from.opacity ?? 1),
            toOpacity = Number(to.opacity ?? 1);
          from.transparent = true;
          from.opacity = fromOpacity;
          from.depthWrite = false;
          parts.push({
            from,
            to,
            fromColor: from.color?.clone?.(),
            toColor: to.color?.clone?.(),
            fromEmissive: from.emissive?.clone?.(),
            toEmissive: to.emissive?.clone?.(),
            fromOpacity,
            toOpacity,
          });
        });
        item.material = previous;
        if (targetKey && targets.has(item)) item.userData.overlayMaterial = next;
        records.push({ item, next, parts });
      });
      this.dataset.overlayTransition = targetKey ? "entering" : "exiting";
      this.dataset.overlayTransitionKey = targetKey || "none";
      this.dataset.overlayTransitionProgress = "0";
      this.dataset.overlayTransitionDuration = String(STAGE_FILTER_TRANSITION_MS);
      const started = performanceNow(),
        raf =
          requestAnimationFrame ||
          ((callback) => setTimeout(() => callback(performanceNow()), 16));
      const finish = () => {
        if (this._stageOverlayTransitionToken !== token) return;
        records.forEach(({ item, next, parts }) => {
          parts.forEach(({ from, to, toColor, toEmissive, toOpacity }) => {
            if (toColor && from.color) from.color.copy(toColor);
            if (toEmissive && from.emissive) from.emissive.copy(toEmissive);
            from.opacity = toOpacity;
          });
          item.material = next;
          if (!targetKey) delete item.userData.overlayMaterial;
        });
        this.dataset.overlayTransition = "settled";
        this.dataset.overlayTransitionProgress = "100";
        this.renderer?.render(this.scene, this.camera);
      };
      const tick = (now) => {
        if (this._stageOverlayTransitionToken !== token) return;
        const progress = Math.min(
            1,
            Math.max(0, (now - started) / STAGE_FILTER_TRANSITION_MS),
          ),
          eased = progress * progress * (3 - 2 * progress);
        this.dataset.overlayTransitionProgress = String(Math.round(eased * 100));
        records.forEach(({ parts }) =>
          parts.forEach(
            ({
              from,
              to,
              fromColor,
              toColor,
              fromEmissive,
              toEmissive,
              fromOpacity,
              toOpacity,
            }) => {
              if (fromColor && toColor && from.color)
                from.color.copy(fromColor).lerp(toColor, eased);
              if (fromEmissive && toEmissive && from.emissive)
                from.emissive.copy(fromEmissive).lerp(toEmissive, eased);
              from.opacity = fromOpacity + (toOpacity - fromOpacity) * eased;
              from.transparent = true;
              from.depthWrite = eased > 0.78 ? Boolean(to.depthWrite) : false;
            },
          ),
        );
        this.renderer?.render(this.scene, this.camera);
        if (progress < 1) raf(tick);
        else finish();
      };
      if (!records.length) {
        finish();
        return;
      }
      raf(tick);
    },
    setStageOverlay(stage, announce = false) {
      const key = stageOverlayLabels[stage] ? stage : stageOverlayKey(stage);
      if (
        announce &&
        this.dataset.highlightActive === "true" &&
        this.stageOverlayKey === key
      ) {
        this.clearStageOverlay(true);
        return;
      }
      this.stageOverlayKey = key;
      this.dataset.overlayKey = key;
      this.dataset.overlayLabel = stageOverlayLabels[key] || key;
      this.dataset.highlightActive = "true";
      this.querySelectorAll("[data-scene-overlay]").forEach((button) =>
        button.classList.toggle("active", button.dataset.sceneOverlay === key),
      );
      if (
        this.activityMapStandaloneParts?.length &&
        this._adminStandaloneStageV5370
      ) {
        this.applyAdminStandaloneStageOverlayV5370(key);
        if (announce) {
          notify(
            `Highlight de ${this.dataset.overlayLabel} aplicado no mapa.`,
            "success",
          );
          appStore.set({
            mapFilter: key,
            lastAction: `Aplicou highlight de ${this.dataset.overlayLabel}`,
          });
        }
        return;
      }
      if (!this.modelReady || !this.stageOverlayTargets) {
        if (announce) {
          notify(`Highlight de ${this.dataset.overlayLabel} ativado.`, "success");
          appStore.set({
            mapFilter: key,
            lastAction: `Ativou highlight de ${this.dataset.overlayLabel}`,
          });
        }
        return;
      }
      const targets = this.stageOverlayTargets[key] || [],
        color = stageOverlayColors[key] || 0x2fe6ae;
      this.dataset.overlayTargets = String(targets.length);
      this.dataset.overlayColor = `#${color.toString(16).padStart(6, "0")}`;
      const span = this.querySelector(".map-badge span");
      if (span && !this.dataset.selectedPart)
        span.textContent = `Highlight · ${this.dataset.overlayLabel}`;
      this.transitionStageOverlay(key);
      if (announce) {
        notify(
          `Highlight de ${this.dataset.overlayLabel} aplicado no mapa.`,
          "success",
        );
        appStore.set({
          mapFilter: key,
          lastAction: `Aplicou highlight de ${this.dataset.overlayLabel}`,
        });
      }
    },
    clearStageOverlay(announce = false) {
      this._stageOverlayTransitionToken = Symbol("stage-filter-clear");
      this.transitionStageOverlay(null);
      if (this.selectionHalo) this.selectionHalo.visible = false;
      this.stageOverlayKey = null;
      this.dataset.highlightActive = "false";
      this.dataset.overlayLabel = "Nenhum highlight";
      delete this.dataset.overlayKey;
      delete this.dataset.overlayTargets;
      delete this.dataset.overlayColor;
      delete this.dataset.selectedPart;
      delete this.dataset.selectedKind;
      this.querySelectorAll("[data-scene-overlay]").forEach((button) =>
        button.classList.remove("active"),
      );
      const span = this.querySelector(".map-badge span");
      if (span) span.textContent = "Satélite realista · visão temática";
      this.updatePublicCommercialMarkers?.();
      if (announce) {
        notify("Highlight desativado no mapa.");
        appStore.set({
          mapFilter: null,
          lastAction: "Desativou highlight do mapa",
        });
      }
    },
  });
};
