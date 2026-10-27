import { createAtlasMapTileSourceCatalogV1 } from "../../dist/frontend/program.js";

/** Compatibility export; tile URL policy and catalog creation belong to program.ts. */
export const createMapTileSourceCatalogV1 = (input = {}) =>
  createAtlasMapTileSourceCatalogV1(input);
