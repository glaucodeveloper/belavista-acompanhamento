import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { commissionDeals, commissionProfiles } from "../../components/commercial/commission-catalog-v1.mjs";

test("commercial catalog is imported by the composition root and retains its relationships", async () => {
  const composition = await readFile(new URL("../../components.js", import.meta.url), "utf8");
  assert.match(composition, /import \{ commissionProfiles, commissionDeals \} from "\.\/components\/commercial\/commission-catalog-v1\.mjs\?v=commission-catalog-v1"/);
  assert.doesNotMatch(composition, /const commissionProfiles\s*=/);
  assert.doesNotMatch(composition, /const commissionDeals\s*=/);
  assert.equal(commissionProfiles.length, 3);
  assert.equal(commissionDeals.length, 7);
  assert.deepEqual(commissionProfiles.map(({ id }) => id), ["marina", "lucas", "renata"]);
  assert.deepEqual(commissionDeals.map(({ id }) => id), [
    "CT-2026-041", "CT-2026-038", "CT-2026-034", "CT-2026-029",
    "CT-2026-027", "CT-2026-021", "CT-2026-018",
  ]);
  assert.ok(commissionDeals.every((deal) => commissionProfiles.some((profile) => profile.id === deal.profile)));
});
