import {
  atlasApplicationStateProgram,
  atlasApplicationSystemConfiguration,
  createAtlasWindowElement,
  driveAtlasApplicationStateProgram,
} from '../dist/frontend/program.js';

/** Compatibility exports for older bootstrap consumers; behavior is owned by program.ts. */
export const APPLICATION_SYSTEM_CONFIGURATION_V1 = atlasApplicationSystemConfiguration;
export const WindowElement = createAtlasWindowElement;
export const ApplicationStateProgramV1 = atlasApplicationStateProgram;
export const driveApplicationStateProgramV1 = driveAtlasApplicationStateProgram;
