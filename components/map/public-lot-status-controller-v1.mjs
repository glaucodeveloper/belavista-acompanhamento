/** Installs commercial status and filtering behavior for canonical lot meshes. */
export const installPublicLotStatusControllerV1 = (
  MapScene,
  { CustomEventImpl = globalThis.CustomEvent } = {},
) => {
  if (!MapScene?.prototype)
    throw new TypeError("Public lot status requires the MapScene class.");

  MapScene.prototype.canonicalPublicLotParts = function () {
    const lots = (this.modelParts?.lots || []).filter((lot) =>
      /^lote(?:[_ -]?\d+)$/i.test(String(lot?.name || "")),
    );
    return [...new Map(lots.map((lot) => [String(lot.name), lot])).values()];
  };

  MapScene.prototype.setPublicLotStatuses = function (entries = []) {
    const byPartId = new Map(
      (Array.isArray(entries) ? entries : []).map((entry) => [
        String(entry?.partId || ""),
        String(entry?.status || "available").toLowerCase(),
      ]),
    );
    const valid = new Set(["available", "reserved", "negotiation", "sold"]);
    const lots = this.canonicalPublicLotParts();
    this.publicLotStatusCounts = {
      available: 0,
      reserved: 0,
      negotiation: 0,
      sold: 0,
    };
    for (const lot of lots) {
      const key = String(lot.userData?.partId || lot.name);
      const status = valid.has(byPartId.get(key))
        ? byPartId.get(key)
        : "available";
      lot.userData.publicCommercialStatus = status;
      this.publicLotStatusCounts[status]++;
    }
    this.dataset.publicLotStatuses = "connected";
    this.dataset.publicLotStatusCount = String(lots.length);
    this.dataset.publicLotStatusCounts = JSON.stringify(
      this.publicLotStatusCounts,
    );
    this.dataset.publicLotStatusMapping =
      "canonical lot meshes only · duplicate GLB auxiliary meshes excluded";
    if (this.publicLotFilter) this.setPublicLotFilter(this.publicLotFilter);
    this.dispatchEvent(
      new CustomEventImpl("public-commercial-marker-statuses", {
        detail: { entries },
      }),
    );
  };

  MapScene.prototype.setPublicLotFilter = function (status = "available") {
    const valid = new Set(["available", "reserved", "negotiation", "sold"]);
    if (!valid.has(status)) return this.clearPublicLotFilter();
    const colors = {
      available: 0x42be65,
      reserved: 0xf1c21b,
      negotiation: 0x4589ff,
      sold: 0xfa4d56,
    };
    for (const lot of this.canonicalPublicLotParts()) {
      if (lot.userData.publicStatusMaterial) {
        delete lot.userData.publicStatusMaterial;
        this.restorePartMaterial(lot);
      }
      if (lot.userData.publicCommercialStatus !== status) continue;
      lot.userData.publicStatusMaterial = this.materialForColor(
        lot.userData.defaultMaterial,
        colors[status],
        0.98,
      );
      lot.material = lot.userData.publicStatusMaterial;
    }
    this.publicLotFilter = status;
    this.dataset.publicLotFilter = status;
    this.dataset.publicLotMatches = String(
      this.publicLotStatusCounts?.[status] || 0,
    );
    this.renderer?.render(this.scene, this.camera);
  };

  MapScene.prototype.clearPublicLotFilter = function () {
    for (const lot of this.canonicalPublicLotParts()) {
      if (!lot.userData.publicStatusMaterial) continue;
      delete lot.userData.publicStatusMaterial;
      this.restorePartMaterial(lot);
    }
    this.publicLotFilter = "";
    delete this.dataset.publicLotFilter;
    delete this.dataset.publicLotMatches;
    this.renderer?.render(this.scene, this.camera);
  };
};
