/** Installs scene-level line geometry overlays used by the 3D map. */
export const installSceneGeometryOverlaysV1 = (MapScene, { logger = console } = {}) => {
  MapScene.prototype.addCurbOutlines = function (THREE, sources = []) {
    if (this.curbOutlineGroup) {
      this.curbOutlineGroup.removeFromParent?.();
      this.curbOutlineGroup = null;
    }
    const group = new THREE.Group();
    group.name = "BelavistaCurbs";
    group.renderOrder = 14;
    const material = new THREE.LineBasicMaterial({
      color: 0xd9d3c6,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      depthTest: true,
    });
    let count = 0;
    for (const source of sources) {
      const geometry = source?.geometry;
      if (!geometry?.getAttribute?.("position")) continue;
      try {
        const edges = new THREE.EdgesGeometry(geometry, 18);
        if (!edges.getAttribute("position")?.count) {
          edges.dispose();
          continue;
        }
        const curb = new THREE.LineSegments(edges, material);
        curb.name = `MeioFio_${String(count + 1).padStart(2, "0")}`;
        curb.renderOrder = 14;
        curb.position.z = 0.085;
        curb.userData = {
          belavistaRole: "curb",
          partKind: "curbs",
          partLabel: `Meio-fio · trecho ${count + 1}`,
          defaultMaterial: material,
        };
        source.add(curb);
        count++;
      } catch (error) {
        logger.warn("Falha ao criar meio-fio visual.", error);
      }
    }
    this.curbOutlineGroup = group;
    this.dataset.curbOutlines = String(count);
    this.dataset.curbTarget = "aprox. 8000 m lineares · referência operacional";
  };

  MapScene.prototype.addFocusStructureOutlines = function (THREE, nodes) {
    nodes.forEach((node) => {
      if (!node?.geometry || node.userData.belavistaOutline) return;
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(node.geometry, 12),
        new THREE.LineBasicMaterial({
          color: 0xffd166,
          transparent: true,
          opacity: 0.95,
          depthTest: false,
        }),
      );
      outline.name = "Belavista_3D_structure_outline";
      outline.raycast = () => {};
      node.add(outline);
      node.userData.belavistaOutline = true;
    });
  };

  return MapScene;
};
