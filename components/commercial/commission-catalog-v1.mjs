// Compatibility fallback for hosts that have not loaded the typed program catalog.
import commissionProfilesCatalog from "../../frontend/src/data/commission-profiles.json" with { type: "json" };
import commissionDealsCatalog from "../../frontend/src/data/commission-deals.json" with { type: "json" };

export const commissionProfiles = commissionProfilesCatalog;
export const commissionDeals = commissionDealsCatalog;
