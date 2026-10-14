import test from "node:test";
import assert from "node:assert/strict";
import { installAdminReferenceAerialFrameV1 } from "../../components/map/admin-reference-aerial-frame-v1.mjs";
import {
  ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1,
  ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1,
  ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2,
} from "../../components/map/georeference.mjs";

test("a moldura aérea preserva o frame legado de site e seus centros/dimensões", () => {
  class MapScene {
    hasAttribute(name) { return name === "data-admin-shared-public-map"; }
  }
  installAdminReferenceAerialFrameV1(MapScene);
  const frame = new MapScene().adminReferenceAerialFrameV1();
  const expected = { ...ADMIN_REFERENCE_AERIAL_SITE_FRAME_V1, ...ADMIN_REFERENCE_AERIAL_SITE_FRAME_V2 };
  assert.equal(frame.left, expected.left);
  assert.equal(frame.top, expected.top);
  assert.equal(frame.right, expected.right);
  assert.equal(frame.bottom, expected.bottom);
  assert.equal(frame.siteWidth, Math.max(0.01, expected.right - expected.left));
  assert.equal(frame.siteDepth, Math.max(0.01, expected.bottom - expected.top));
  assert.equal(frame.siteCenterU, (expected.left + expected.right) / 2);
  assert.equal(frame.siteCenterV, (expected.top + expected.bottom) / 2);
  assert.equal(frame.frame, "legacy user supplied aerial site window");
});

test("a cena georreferenciada deriva envelope dos quatro cantos e reconhece a camada aérea", () => {
  class MapScene {
    hasAttribute(name) { return name === "data-admin-shared-public-map"; }
  }
  installAdminReferenceAerialFrameV1(MapScene);
  const scene = new MapScene();
  scene.adminReferenceAerialTextureV1 = { image: {} };
  scene._adminStandaloneWrapperV5370 = { userData: { adminReferenceAerialGeoWarp: true } };
  const frame = scene.adminReferenceAerialFrameV1(),
    corners = Object.values(ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1);
  assert.equal(scene.isAdminReferenceAerialV1(), true);
  assert.equal(frame.left, Math.min(...corners.map((point) => Number(point.u))));
  assert.equal(frame.top, Math.min(...corners.map((point) => Number(point.v))));
  assert.equal(frame.right, Math.max(...corners.map((point) => Number(point.u))));
  assert.equal(frame.bottom, Math.max(...corners.map((point) => Number(point.v))));
  assert.deepEqual(frame.corners, ADMIN_REFERENCE_AERIAL_GEO_QUAD_UV_V1);
  assert.match(frame.frame, /EPSG:31984 four-corner projection/);
  scene.adminReferenceAerialTextureV1 = null;
  assert.equal(scene.isAdminReferenceAerialV1(), false);
});
