import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCompactMapCoordinatorV1 } from "../../components/map/compact-map-coordinator-v1.mjs";

test("coordinator processa mirrors visíveis, um por frame, sem duplicar filas", () => {
  const frames = [];
  const calls = [];
  const coordinator = createCompactMapCoordinatorV1({
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
  });
  const sharedMapScene = { _modelGpuReady: true };
  const first = { _compactVisible: true, renderSharedMap: () => calls.push("first") };
  const hidden = { _compactVisible: false, renderSharedMap: () => calls.push("hidden") };
  const second = { _compactVisible: true, renderSharedMap: () => calls.push("second") };

  coordinator.syncCompactMapMirrors();
  assert.equal(frames.length, 0, "não inicia sem cena compartilhada");
  coordinator.setSharedMapScene(sharedMapScene);
  assert.equal(coordinator.getSharedMapScene(), sharedMapScene);
  coordinator.compactMapMirrors.add(first);
  coordinator.compactMapMirrors.add(hidden);
  coordinator.compactMapMirrors.add(second);

  coordinator.syncCompactMapMirrors();
  coordinator.syncCompactMapMirrors();
  coordinator.publishMapPreview();
  assert.equal(frames.length, 1, "chamadas concorrentes compartilham o frame pendente");

  frames.shift()();
  assert.deepEqual(calls, ["first"]);
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.deepEqual(calls, ["first", "second"]);
  assert.equal(frames.length, 0);

  coordinator.syncCompactMapMirrors();
  frames.shift()();
  assert.deepEqual(calls, ["first", "second", "first"]);
});

test("coordinator aguarda GPU e valida a dependência de animação", () => {
  const frames = [];
  const coordinator = createCompactMapCoordinatorV1({
    requestAnimationFrame: (callback) => (frames.push(callback), frames.length),
  });
  coordinator.setSharedMapScene({ _modelGpuReady: false });
  coordinator.compactMapMirrors.add({ _compactVisible: true, renderSharedMap() {} });
  coordinator.syncCompactMapMirrors();
  assert.equal(frames.length, 0);
  assert.throws(() => createCompactMapCoordinatorV1(), /requires requestAnimationFrame/);
});

test("components.js conecta coordenador aos ciclos e instaladores existentes", async () => {
  const composition = ((await readFile(new URL('../../components/map/map-scene-composition-v1.mjs', import.meta.url), 'utf8')) + (await readFile(new URL('../../components.js', import.meta.url), 'utf8')));
  const connection = await readFile(new URL("../../components/map/map-scene-connection-v1.mjs", import.meta.url), "utf8");

  assert.match(composition, /import \{ createCompactMapCoordinatorV1 \} from "\.\/components\/map\/compact-map-coordinator-v1\.mjs\?/);
  assert.match(composition, /const compactMapCoordinatorV1 = createCompactMapCoordinatorV1\(/);
  assert.match(connection, /setSharedMapScene\(this\)/);
  assert.match(composition, /compactMapMirrors,/);
  assert.match(composition, /getSharedMapScene,/);
  assert.match(composition, /syncCompactMapMirrors,/);
  assert.match(composition, /publishMapPreview,/);
  assert.doesNotMatch(composition, /let sharedMapScene = null/);
  assert.doesNotMatch(composition, /let compactMirrorFrame = 0/);
});
