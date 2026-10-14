export const installOperationalRecordMapV1 = (MapScene) => {
  const OperationalRecordMapMethodsV1 = class {
    syncOperationalRecordMapV5370(records = []) {
      const parts = this.isAdminStandaloneInteractiveV5370()
        ? this.adminStandaloneModelPartsV5370()
        : this.physicalMapParts();
      if (!parts.length) {
        this.dataset.recordMapStatus = "waiting-model";
        return;
      }
      const statusByPart = new Map();
      const colorForStatus = (status) => {
        const normalized = String(status || "").toLowerCase();
        if (/conclu|finaliz|aprov/.test(normalized)) return 0x42be65;
        if (/execu|andamento|iniciado/.test(normalized)) return 0x0f62fe;
        if (/bloque|imped|atras/.test(normalized)) return 0xda1e28;
        return 0xf1c21b;
      };
      for (const record of Array.isArray(records) ? records : []) {
        let areas = record?.mapArea;
        if (typeof areas === "string") {
          try {
            areas = JSON.parse(areas);
          } catch {
            areas = [];
          }
        }
        if (!Array.isArray(areas)) areas = areas ? [areas] : [];
        const color = colorForStatus(record?.status || record?.situacao);
        for (const area of areas) {
          const ids = [
            area?.partId,
            ...(Array.isArray(area?.partIds) ? area.partIds : []),
          ].filter(Boolean);
          for (const id of ids) statusByPart.set(String(id), color);
        }
      }
      for (const item of parts) {
        const id = String(item.userData?.partId || item.name || "");
        const color = statusByPart.get(id);
        if (color) {
          item.userData.recordStatusMaterial = this.materialForColor(
            item.userData.defaultMaterial || item.material,
            color,
            0.9,
          );
          if (
            !item.userData.overlayMaterial &&
            !item.userData.selectionMaterial &&
            !item.userData.progressMaterial
          ) {
            item.material = item.userData.recordStatusMaterial;
          }
        } else if (item.userData.recordStatusMaterial) {
          delete item.userData.recordStatusMaterial;
          this.restorePartMaterial(item);
        }
      }
      this.dataset.recordMapStatus = "synced";
      this.dataset.recordMapStatusCount = String(statusByPart.size);
      this.renderActiveSceneV5370();
    }
    applyStreetPaverInstanceColors(ids = [], color = 0xffffff) {
      if (!this.THREE) return;
      const selected = new Set([...ids].map(String));
      for (const mesh of this._streetPaverMeshes || []) {
        const parts = mesh.userData?.paverParts || [];
        parts.forEach((part, index) => {
          if (typeof mesh.setColorAt === "function")
            mesh.setColorAt(
              index,
              new this.THREE.Color(
                selected.has(String(part.partId))
                  ? color
                  : mesh.userData?.paverDefaultColor || 0xffffff,
              ),
            );
        });
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    applyStreetPaverInstanceStatusMap(statuses = new Map()) {
      if (!this.THREE) return;
      for (const mesh of this._streetPaverMeshes || []) {
        const parts = mesh.userData?.paverParts || [];
        parts.forEach((part, index) => {
          const match = statuses.get(String(part.partId));
          if (typeof mesh.setColorAt === "function")
            mesh.setColorAt(
              index,
              new this.THREE.Color(
                match?.status?.hex ||
                  mesh.userData?.paverDefaultColor ||
                  0xffffff,
              ),
            );
          if (match) part.activityMapStatus = match.assignment?.status || "";
          else delete part.activityMapStatus;
        });
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    setStreetPaverInstanceColor(part, color = 0xffffff) {
      const owner = part?._paverOwner,
        index = part?._paverInstanceId;
      if (!owner || !Number.isInteger(index) || !this.THREE) return false;
      if (typeof owner.setColorAt !== "function") return false;
      owner.setColorAt(index, new this.THREE.Color(color));
      if (owner.instanceColor) owner.instanceColor.needsUpdate = true;
      return true;
    }
    physicalMapPartAt(point) {
      if (this.isAdminStandaloneInteractiveV5370()) {
        return this.adminStandalonePhysicalMapPartAtV5370(point);
      }
      if (!this.modelReady || !this.raycaster || !this.camera || !this.modelGroup)
        return null;
      const canvas = this.querySelector(".three-overlay"),
        w = canvas?.clientWidth || 0,
        h = canvas?.clientHeight || 0;
      if (!w || !h) return null;
      this.pointer.x = (point.x / w) * 2 - 1;
      this.pointer.y = -(point.y / h) * 2 + 1;
      this.camera.updateMatrixWorld(true);
      this.modelGroup.updateMatrixWorld(true);
      this.sceneStage?.updateMatrixWorld?.(true);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const root = this.sceneStage || this.modelGroup;
      for (const hit of this.raycaster.intersectObject(root, true)) {
        let source = hit.object;
        while (source && !source.userData?.partKind) source = source.parent;
        if (source?.userData?.streetPaver && Number.isInteger(hit.instanceId))
          return this.streetPaverPartAt(source, hit.instanceId);
        if (source) return source;
      }
      return null;
    }
    setActivityLocationPaintMode(enabled = false, onPaint = null) {
      const canvas = this.querySelector(".three-overlay");
      if (!canvas) return;
      this._activityLocationPaintEnabled = Boolean(enabled);
      this._activityLocationPaintCallback =
        typeof onPaint === "function" ? onPaint : null;
      this.dataset.activityLocationPaint = this._activityLocationPaintEnabled
        ? "true"
        : "false";
      canvas.classList.toggle(
        "activity-location-paint-active",
        this._activityLocationPaintEnabled,
      );
      if (this._activityPaintHandlersBound) return;
      this._activityPaintHandlersBound = true;
      let drawing = false,
        lastId = "";
      const paint = (event) => {
        if (!this._activityLocationPaintEnabled) return;
        const point = this.pointFromClient(event.clientX, event.clientY),
          part = point ? this.physicalMapPartAt(point) : null,
          id = part?.userData?.partId || part?.name || "";
        if (!part || !id || id === lastId) return;
        lastId = id;
        this._activityLocationPaintCallback?.({
          part,
          id,
          label: part.userData?.partLabel || part.name || id,
          kind: part.userData?.partKind || "other",
        });
      };
      canvas.addEventListener(
        "pointerdown",
        (event) => {
          if (!this._activityLocationPaintEnabled) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          drawing = true;
          lastId = "";
          canvas.setPointerCapture?.(event.pointerId);
          paint(event);
        },
        true,
      );
      canvas.addEventListener(
        "pointermove",
        (event) => {
          if (!drawing || !this._activityLocationPaintEnabled) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          paint(event);
        },
        true,
      );
      const stop = (event) => {
        if (!drawing) return;
        drawing = false;
        lastId = "";
        event?.stopImmediatePropagation?.();
      };
      canvas.addEventListener("pointerup", stop, true);
      canvas.addEventListener("pointercancel", stop, true);
    }
    previewActivityLocationParts(ids = [], color = 0x0f62fe) {
      const selected = new Set(ids.map(String));
      this.applyStreetPaverInstanceColors(selected, color);
      for (const part of this.physicalMapParts()) {
        const id = String(part.userData?.partId || part.name || "");
        const sourceStreetId = Number.isFinite(
          Number(part.userData?.streetSourceOrdinal),
        )
          ? `street-source-${Number(part.userData.streetSourceOrdinal)}`
          : "";
        if (
          selected.has(id) ||
          (sourceStreetId && selected.has(sourceStreetId))
        ) {
          if (!part.userData.activityLocationDefaultMaterial)
            part.userData.activityLocationDefaultMaterial = part.material;
          part.material = this.materialForColor(
            part.userData.activityLocationDefaultMaterial,
            color,
            0.92,
          );
        } else if (part.userData.activityLocationDefaultMaterial) {
          part.material = part.userData.activityLocationDefaultMaterial;
          delete part.userData.activityLocationDefaultMaterial;
        }
      }
      this.renderer?.render(this.scene, this.camera);
    }
  };
  const methods = Object.getOwnPropertyDescriptors(OperationalRecordMapMethodsV1.prototype);
  delete methods.constructor;
  Object.defineProperties(MapScene.prototype, methods);
};
