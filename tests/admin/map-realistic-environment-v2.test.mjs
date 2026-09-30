import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.BELAVISTA_ROOT || path.resolve(testDirectory, "../..");
const components = fs.readFileSync(path.join(root, "components.js"), "utf8");

test("ambiente aéreo administrativo usa janela expandida e referencial único", () => {
  assert.match(components, /const ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2\s*=\s*\{/);
  assert.match(components, /left:\s*0\.268/);
  assert.match(components, /top:\s*0\.078/);
  assert.match(components, /right:\s*0\.721/);
  assert.match(components, /bottom:\s*0\.704/);
  assert.match(
    components,
    /adminReferenceAerialFrameV1\(\)[\s\S]{0,260}\.\.\.ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2/,
  );
  assert.match(
    components,
    /adminReferenceAerialAlignment[\s\S]{0,180}shared sceneStage transform/,
  );
  assert.match(components, /adminReferenceAerialFrameVersion\s*=\s*"site-window-v2"/);
  assert.match(
    components,
    /surface\.position\.set\([\s\S]{0,420}surface\.rotation\.set\(0, 0, 0\)[\s\S]{0,120}surface\.scale\.set\(/,
  );
  assert.match(
    components,
    /terrain\.position\.copy\(surface\.position\)[\s\S]{0,100}terrain\.rotation\.copy\(surface\.rotation\)[\s\S]{0,100}terrain\.scale\.copy\(surface\.scale\)/,
  );
  assert.match(components, /if \(rasterTerrain\.parent !== stage\) stage\.add\(rasterTerrain\)/);
  assert.match(components, /if \(terrain\.parent !== stage\) stage\.add\(terrain\)/);
});

test("imagem fica plana e não duplica casas como volumes artificiais", () => {
  assert.match(components, /ADMIN_REFERENCE_AERIAL_RELIEF_AMPLITUDE_V2\s*=\s*0/);
  assert.match(components, /const broad = Math\.sin\(/);
  assert.match(components, /const cross = Math\.cos\(/);
  assert.match(components, /const diagonal = Math\.sin\(/);
  assert.match(components, /const rolling =\s*\(broad \* 0\.48 \+ cross \* 0\.36 \+ diagonal\)/);
  assert.match(components, /reliefProfile:\s*"deterministic rolling undulation · presentation-only"/);
  assert.match(components, /vehicleGroup\.name\s*=\s*"BelavistaAdminReferenceAerialVehicles"/);
  assert.match(components, /kind:\s*"car"[\s\S]{0,220}aerial-vehicle-candidate/);
  assert.match(components, /environment\.add\(treeGroup, vehicleGroup\)/);
  assert.doesNotMatch(components, /environment\.add\(treeGroup, houseGroup, vehicleGroup\)/);
  assert.match(
    components,
    /árvores e carros derivados do raster · sem casas sintéticas · loteamento preservado como modelo semântico/,
  );
});

test("lotes e ruas continuam sendo a camada semântica selecionável", () => {
  assert.match(components, /lot\.userData\.selectableMapArea\s*=\s*true/);
  assert.match(components, /lot\.userData\.mapSelectionKind\s*=\s*"lot"/);
  assert.match(components, /street\.userData\.selectableMapArea\s*=\s*true/);
  assert.match(components, /street\.userData\.mapSelectionKind\s*=\s*"street"/);
  assert.match(components, /mapSelectionSurface\s*=\s*"lot"/);
  assert.match(components, /mapSelectionSurface\s*=\s*"street"/);
});
