import { createAtlasCompactMapCoordinatorV1 } from "../../dist/frontend/program.js";

/** Compatibility export; mutable map coordination state is owned by program.ts. */
export const createCompactMapCoordinatorV1 = (dependencies = {}) =>
  createAtlasCompactMapCoordinatorV1({
    requestAnimationFrame: dependencies.requestAnimationFrame,
  });
