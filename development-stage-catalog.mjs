import catalogData from './frontend/src/data/worker-development-stage-catalog.json' with { type: 'json' };

// Compatibility exports for the legacy renderer and external module consumers.
export const DEVELOPMENT_STAGE_CATALOG_VERSION = catalogData.version;
export const DEVELOPMENT_STAGE_CATALOG = catalogData.stages;
export const DEVELOPMENT_STAGE_SOURCES = catalogData.sources;
