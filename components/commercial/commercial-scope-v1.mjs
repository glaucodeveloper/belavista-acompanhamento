/** Resolves the commercial data scope associated with the authenticated actor. */
export const createCommercialScopeV1 = ({ appStore, commissionProfiles, commissionDeals } = {}) => () => {
  const actor = appStore.get().currentActor || {}, profiles = commissionProfiles;
  const explicit = String(
    actor.commercialProfile ||
      actor.claims?.commercialProfile ||
      actor.claims?.profileId ||
      "",
  ).trim().toLowerCase();
  const email = String(actor.email || "").trim().toLowerCase(), local = email.split("@")[0];
  const profile = profiles.find((item) =>
    item.id === explicit ||
    item.emails?.some((value) => value.toLowerCase() === email) ||
    item.name.toLowerCase().split(" ")[0] === local,
  ) || null;
  const elevated = ["owner", "admin", "developer"].includes(actor.role);
  return {
    actor,
    profile,
    elevated,
    profiles: elevated ? profiles : profile ? [profile] : [],
    deals: elevated ? commissionDeals : commissionDeals.filter((item) => item.profile === profile?.id),
  };
};

export const createCommercialDealsForWorkspaceV1 = ({ commissionNegotiationDealsV1, commissionDeals } = {}) => (state) =>
  typeof commissionNegotiationDealsV1 === "function"
    ? commissionNegotiationDealsV1(state)
    : [...commissionDeals, ...(state.commissionEntries || [])];

export const createBrokerWorkspaceStatsV1 = ({ brlToNumber } = {}) => (person, deals) => {
  const rows = deals.filter((deal) => String(deal.profile || "") === String(person.id));
  return {
    rows,
    sales: rows.reduce((sum, deal) => sum + brlToNumber(deal.value), 0),
    commission: rows.reduce((sum, deal) => sum + brlToNumber(deal.commission), 0),
    pending: rows.filter((deal) => !/assinado|confirmada|conclu/i.test(String(deal.status || ""))).length,
  };
};
