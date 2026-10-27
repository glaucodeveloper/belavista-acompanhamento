import { projectAtlasMapScenePresentationConfig } from "../../dist/frontend/program.js";

/** Thin compatibility adapter; the settings and URL projection now live in TypeScript. */
export const createScenePresentationConfigV1 = (input = {}) => projectAtlasMapScenePresentationConfig(input);
