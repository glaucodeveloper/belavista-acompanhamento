import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("components.js composes lot-profile state from its catalog module before installing page routes", async () => {
  const [components, registration, profiles, page] = await Promise.all([
    readFile(new URL("../../components/index.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/lots/lot-project-workspaces-registration-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/lots/lot-development-profiles-v1.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../components/lots/lot-development-page-v1.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(components, /installLotProjectWorkspacesRegistrationV1\(\{/);
  assert.match(registration, /createLotDevelopmentProfilesV1\(/);
  assert.match(registration, /installLotDevelopmentPageV1\(ViewLayer/);
  assert.doesNotMatch(components, /const lotDevelopmentProfilesV1\s*=/);
  assert.doesNotMatch(components, /function upsertLotDevelopmentProfileV1\(/);
  assert.match(page, /lotDevelopmentProfilesV1, normalizeLotDevelopmentTextV1, notify/);
  assert.match(page, /upsertLotDevelopmentProfileV1/);

  for (const contract of [
    "LOT_DEVELOPMENT_COMMON_AREAS_V1",
    "REPASSE_PRICE_CATALOG",
    "state.lotStatuses",
    "state.developmentProfiles",
    "selectedDevelopmentProfileId",
    "host.__BELAVISTA_LOT_DEVELOPMENT_PROFILES_V1",
    "host.__BELAVISTA_UPSERT_LOT_DEVELOPMENT_PROFILE_V1",
  ]) assert.ok(profiles.includes(contract), `missing lot-profile contract: ${contract}`);
  assert.match(profiles, /appStore\.set\(\{[\s\S]*developmentProfiles:\s*entries/);
});
