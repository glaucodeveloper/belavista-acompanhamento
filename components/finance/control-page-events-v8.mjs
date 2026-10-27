import { createAtlasControlPageEvents } from "../../dist/frontend/program.js";

/** Compatibility adapter; cash and broker control events are owned by TS. */
export const createControlPageEventsV8 = dependencies => createAtlasControlPageEvents({
  ...dependencies,
  windowRef: globalThis.window,
  FormDataCtor: globalThis.FormData,
  FileReaderCtor: globalThis.FileReader,
});
