import {
  escapeAtlasDomValueV1,
  notifyAtlasActionV1,
  renderAtlasIconMarkupV1,
} from "../../dist/frontend/components.js";

/** Compatibility exports for MJS modules still consuming the shared DOM helpers. */
export const esc = escapeAtlasDomValueV1;
export const ico = renderAtlasIconMarkupV1;
export const notify = notifyAtlasActionV1;
