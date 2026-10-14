import test from "node:test";
import assert from "node:assert/strict";
import {
  ROAD_HALF_LOT_SLICE_WORLD_V1,
  roadPlanarAngleV1,
} from "../../components/map/road-geometry-math-v1.mjs";

test("road geometry math preserves frontage segmentation and dominant road angle", () => {
  assert.equal(ROAD_HALF_LOT_SLICE_WORLD_V1, 5);
  const expected = Math.PI / 6;
  const points = Array.from({ length: 9 }, (_, index) => {
    const distance = (index - 4) * 20;
    return {
      x: Math.cos(expected) * distance,
      z: Math.sin(expected) * distance,
    };
  });
  points.push({ x: Number.NaN, z: 10 }, null);
  assert.ok(Math.abs(roadPlanarAngleV1(points) - expected) < 1e-10);
});

test("road geometry math uses its fallback for sparse or directionless traces", () => {
  const fallback = 0.37;
  assert.equal(roadPlanarAngleV1([{ x: 0, z: 0 }], fallback), fallback);
  assert.equal(
    roadPlanarAngleV1(
      [
        { x: -1, z: -1 },
        { x: -1, z: 1 },
        { x: 1, z: -1 },
        { x: 1, z: 1 },
      ],
      fallback,
    ),
    fallback,
  );
});
