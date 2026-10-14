import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { installSceneGeometryOverlaysV1 } from "../../components/map/scene-geometry-overlays-v1.mjs";

test("os overlays de geometria são instalados antes de map-scene e saem do monólito", () => {
  const source = fs.readFileSync(path.resolve("components.js"), "utf8"),
    installAt = source.indexOf("installSceneGeometryOverlaysV1(MapScene);"),
    defineAt = source.indexOf('customElements.define("map-scene", MapScene);');
  assert.notEqual(installAt, -1);
  assert.notEqual(defineAt, -1);
  assert.ok(installAt < defineAt);
  assert.doesNotMatch(source, /^\s{2}addCurbOutlines\(/m);
  assert.doesNotMatch(source, /^\s{2}addFocusStructureOutlines\(/m);
});

test("meio-fios derivam arestas de geometrias válidas e substituem o grupo anterior", () => {
  const warnings = [];
  class Group {
    removeFromParent() { this.removed = true; }
  }
  class LineBasicMaterial { constructor(options) { this.options = options; } }
  class EdgesGeometry {
    constructor(geometry, threshold) {
      if (geometry.failEdges) throw new Error("edge generation failed");
      this.geometry = geometry;
      this.threshold = threshold;
    }
    getAttribute() { return { count: this.geometry.empty ? 0 : 8 }; }
    dispose() { this.disposed = true; }
  }
  class LineSegments {
    constructor(geometry, material) { this.geometry = geometry; this.material = material; this.position = {}; this.userData = {}; }
  }
  const THREE = { Group, LineBasicMaterial, EdgesGeometry, LineSegments },
    firstSource = { geometry: { getAttribute: () => ({ count: 1 }), empty: false }, add(line) { this.line = line; } },
    emptySource = { geometry: { getAttribute: () => ({ count: 1 }), empty: true }, add() { assert.fail("aresta vazia não é anexada"); } },
    badSource = { geometry: { getAttribute: () => ({ count: 1 }), failEdges: true }, add() { assert.fail("geometria inválida não é anexada"); } };
  class MapScene { dataset = {}; }
  installSceneGeometryOverlaysV1(MapScene, { logger: { warn: (...args) => warnings.push(args) } });
  const scene = new MapScene();
  scene.curbOutlineGroup = { removeFromParent() { this.removed = true; } };
  const previous = scene.curbOutlineGroup;
  scene.addCurbOutlines(THREE, [
    { geometry: null },
    emptySource,
    badSource,
    firstSource,
  ]);
  assert.equal(previous.removed, true);
  assert.equal(scene.curbOutlineGroup.name, "BelavistaCurbs");
  assert.equal(scene.curbOutlineGroup.renderOrder, 14);
  assert.equal(scene.dataset.curbOutlines, "1");
  assert.equal(scene.dataset.curbTarget, "aprox. 8000 m lineares · referência operacional");
  assert.equal(firstSource.line.name, "MeioFio_01");
  assert.equal(firstSource.line.renderOrder, 14);
  assert.equal(firstSource.line.position.z, 0.085);
  assert.equal(firstSource.line.userData.partKind, "curbs");
  assert.equal(emptySource.geometry.disposed, undefined);
  assert.equal(warnings.length, 1);
});

test("contornos de estruturas ignoram nós repetidos e ficam fora do raycast", () => {
  class EdgesGeometry { constructor(geometry, threshold) { this.geometry = geometry; this.threshold = threshold; } }
  class LineBasicMaterial { constructor(options) { this.options = options; } }
  class LineSegments {
    constructor(geometry, material) { this.geometry = geometry; this.material = material; this.name = ""; }
  }
  const THREE = { EdgesGeometry, LineBasicMaterial, LineSegments },
    node = {
      geometry: { name: "estrutura" },
      userData: {},
      children: [],
      add(child) { this.children.push(child); },
    };
  class MapScene {}
  installSceneGeometryOverlaysV1(MapScene);
  const scene = new MapScene();
  scene.addFocusStructureOutlines(THREE, [null, { userData: {} }, node]);
  assert.equal(node.children.length, 1);
  assert.equal(node.children[0].geometry.threshold, 12);
  assert.equal(node.children[0].name, "Belavista_3D_structure_outline");
  assert.equal(node.children[0].raycast(), undefined);
  assert.equal(node.userData.belavistaOutline, true);
  scene.addFocusStructureOutlines(THREE, [node]);
  assert.equal(node.children.length, 1);
});
