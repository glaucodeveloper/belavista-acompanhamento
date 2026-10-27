// Compatibility export. The 301 catalog values are canonical JSON; runtime
// consumers retain this module path until their migrations are complete.
import catalog from "./frontend/src/data/repasse-price-catalog.json" with { type: "json" };

export const REPASSE_PRICE_CATALOG = catalog;
