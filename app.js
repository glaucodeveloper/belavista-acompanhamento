// Host adapter: imperative admin composition belongs to the TypeScript monoliths.
import * as componentOwners from './dist/frontend/components.js';
import { startAtlasAdminApplicationCompositionV1 } from './dist/frontend/program.js';

startAtlasAdminApplicationCompositionV1({
  globalRef: globalThis,
  windowRef: globalThis.window,
  documentRef: globalThis.document,
  moduleBaseUrl: new URL('./', import.meta.url).href,
  componentOwners,
});
