// Compatibility edge for MapScene. The composition and port assembly live in TS.
import * as atlasMapComponentsTsV1 from "../../dist/frontend/components.js";
import { createAtlasMapSceneGeoreferenceBindingsV1 } from "../../dist/frontend/program.js";

const workerContextChatVersionV1 = "worker-chat-lot-development-v1&ts-settings-ai-agenda-v1&ts-worker-context-chat-inference-v1&ts-worker-chat-observation-controller-v1&ts-worker-chat-submit-orchestration-v1&ts-worker-chat-voice-program-v1&ts-worker-chat-response-persistence-v1&ts-worker-chat-record-review-v1&ts-worker-chat-map-context-ts-owner-v1&ts-worker-chat-tab-state-ts-owner-v1&ts-worker-chat-attachment-renderer-owner-v1&ts-worker-chat-record-drawer-owner-v1&ts-worker-chat-quick-actions-owner-v1&ts-worker-chat-record-saved-event-owner-v1&ts-worker-chat-pending-state-owner-v1&ts-worker-chat-attachment-removal-owner-v1&worker-chat-visual-clarification-ts-owner-v1&ts-chat-component-controller-v1&ts-chat-component-actions-v1&ts-chat-component-shell-mount-v1&ts-chat-composer-state-component-v1&ts-chat-conversation-state-component-v1";
const typedOwner = atlasMapComponentsTsV1.installAtlasMapSceneCompositionV1;
let georeferenceBindings;

if (typeof typedOwner === "function") {
  try {
    if (typeof createAtlasMapSceneGeoreferenceBindingsV1 !== "function") {
      throw new TypeError("Typed map georeference composer is unavailable.");
    }
    georeferenceBindings = createAtlasMapSceneGeoreferenceBindingsV1();
  } catch (error) {
    globalThis.console?.warn?.("[Aliança Park] Typed map georeference composition unavailable; loading MJS recovery.", error);
    georeferenceBindings = await import("./georeference-legacy-v1.mjs?v=admin-map-georeference-v2-map-projection-json&pdf-yellow-circles-v4&ts-map-projection-math-v1&ts-admin-map-georeference-config-v1&ts-admin-dwg-georeference-loader-v1&ts-admin-georeference-bindings-owner-v1");
  }
}

/** Use the TypeScript composition root; retain the prior full MJS owner as recovery. */
export async function installMapSceneCompositionV1(MapScene, dependencies) {
  if (typeof typedOwner !== "function") {
    const legacy = await import("./map-scene-composition-legacy-v1.mjs?v=map-scene-composition-lazy-recovery-v1&ts-map-async-recovery-v1");
    return legacy.installMapSceneCompositionV1(MapScene, dependencies);
  }

  return await typedOwner({
    MapScene,
    dependencies,
    georeferenceBindings,
    recovery: {
      installAdminMasterplanAdjustmentV1: async (...args) => {
        const recovery = await import("./admin-masterplan-adjustment-v1.mjs?v=admin-masterplan-adjustment-lazy-recovery-v1&ts-map-async-recovery-v1");
        return recovery.installAdminMasterplanAdjustmentLegacyV1(...args);
      },
      installAdminPdfMasterplanPipelineV1: async (...args) => {
        const recovery = await import("./admin-pdf-masterplan-pipeline-legacy-v1.mjs?v=admin-pdf-masterplan-pipeline-lazy-recovery-v1&ts-map-async-recovery-v1");
        return recovery.installAdminPdfMasterplanPipelineV1(...args);
      },
    },
    loadWorkerContextChat: () => import(`../../worker-context-chat.mjs?v=${workerContextChatVersionV1}`),
    importThree: () => import("three"),
    importGltfLoader: () => import("three/addons/loaders/GLTFLoader.js"),
  });
}
