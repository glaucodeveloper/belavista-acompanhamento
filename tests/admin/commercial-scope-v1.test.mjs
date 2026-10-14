import assert from "node:assert/strict";
import test from "node:test";
import {
  createBrokerWorkspaceStatsV1,
  createCommercialDealsForWorkspaceV1,
  createCommercialScopeV1,
} from "../../components/commercial/commercial-scope-v1.mjs";

const profiles = [
  { id: "broker-a", name: "Ana Lima", emails: ["ana@example.test"] },
  { id: "broker-b", name: "Bruno Reis", emails: ["bruno@example.test"] },
];
const deals = [
  { id: "deal-a", profile: "broker-a" },
  { id: "deal-b", profile: "broker-b" },
  { id: "deal-unassigned", profile: "" },
];
const scopeFor = (currentActor) => createCommercialScopeV1({
  appStore: { get: () => ({ currentActor }) },
  commissionProfiles: profiles,
  commissionDeals: deals,
});

test("commercial scope limits a broker to the profile selected by its email", () => {
  const scope = scopeFor({ role: "sales", email: "ANA@example.test" })();
  assert.equal(scope.elevated, false);
  assert.equal(scope.profile.id, "broker-a");
  assert.deepEqual(scope.profiles, [profiles[0]]);
  assert.deepEqual(scope.deals, [deals[0]]);
});

test("commercial scope accepts an explicit profile claim and denies unmatched actors", () => {
  const explicit = scopeFor({ role: "commercial", claims: { profileId: "BROKER-B" } })();
  assert.equal(explicit.profile.id, "broker-b");
  assert.deepEqual(explicit.deals, [deals[1]]);

  const unmatched = scopeFor({ role: "sales", email: "unknown@example.test" })();
  assert.equal(unmatched.profile, null);
  assert.deepEqual(unmatched.profiles, []);
  assert.deepEqual(unmatched.deals, []);
});

test("privileged commercial scope retains all configured profiles and deals", () => {
  const scope = scopeFor({ role: "owner", email: "owner@example.test" })();
  assert.equal(scope.elevated, true);
  assert.equal(scope.profile, null);
  assert.equal(scope.profiles, profiles);
  assert.equal(scope.deals, deals);
});

test("commercial workspace retains the negotiation-deal override and legacy merge", () => {
  const override = [{ id: "negotiated", profile: "broker-a" }];
  const overridden = createCommercialDealsForWorkspaceV1({
    commissionNegotiationDealsV1: () => override,
    commissionDeals: deals,
  });
  assert.equal(overridden({ commissionEntries: [] }), override);

  const legacy = createCommercialDealsForWorkspaceV1({ commissionDeals: deals });
  assert.deepEqual(legacy({ commissionEntries: [{ id: "new", profile: "broker-a" }] }), [
    ...deals,
    { id: "new", profile: "broker-a" },
  ]);
});

test("broker workspace metrics preserve scoped rows, totals, and pending status", () => {
  const formatMoney = (value) => Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
  const stats = createBrokerWorkspaceStatsV1({ brlToNumber: formatMoney })(
    { id: "broker-a" },
    [
      { profile: "broker-a", value: "R$ 1250.00", commission: "R$ 62.50", status: "Em análise" },
      { profile: "broker-a", value: "R$ 500.00", commission: "R$ 25.00", status: "Contrato assinado" },
      { profile: "broker-b", value: "R$ 900.00", commission: "R$ 45.00", status: "Em análise" },
    ],
  );
  assert.equal(stats.rows.length, 2);
  assert.equal(stats.sales, 1750);
  assert.equal(stats.commission, 87.5);
  assert.equal(stats.pending, 1);
});
