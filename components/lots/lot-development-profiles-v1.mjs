/** Canonical lot-development profile projection and assistant upsert bridge. */
import * as atlasProgramTsV1 from "../../dist/frontend/program.js";
import lotDevelopmentCommonAreasData from "../../dist/frontend/data/lot-development-common-areas.json" with { type: "json" };

export const createLotDevelopmentProfilesLegacyV1 = ({
  appStore,
  REPASSE_PRICE_CATALOG,
  host = globalThis,
} = {}) => {
  if (!appStore?.get || !appStore?.set)
    throw new TypeError("Lot-development profiles require appStore.get() and appStore.set().");
  if (!Array.isArray(REPASSE_PRICE_CATALOG))
    throw new TypeError("Lot-development profiles require REPASSE_PRICE_CATALOG.");
  if (!host || typeof host !== "object")
    throw new TypeError("Lot-development profiles require the assistant bridge host.");
// LOT_DEVELOPMENT_PROFILES_V1: perfis comerciais e operacionais para a
// totalidade do loteamento. A origem é a tabela de lotes; inclusões do chat
// ficam como sobreposições persistidas, sem alterar o catálogo financeiro.
const LOT_DEVELOPMENT_COMMON_AREAS_V1 = lotDevelopmentCommonAreasData;

const normalizeLotDevelopmentTextV1 = (value) => String(value || "").trim().toLocaleLowerCase("pt-BR");
const lotDevelopmentBaseProfilesV1 = (state = appStore.get()) => {
  const statusByLot = state.lotStatuses || {};
  const lots = REPASSE_PRICE_CATALOG
    .filter((item) => Number(item?.lot) > 0)
    .map((item) => {
      const label = String(item.label || `${item.quadra}-${item.lot}`);
      const status = statusByLot[label]?.status || "Disponível";
      return {
        id: `lot:${label}`,
        kind: "lot",
        title: `Lote ${label}`,
        lotLabel: label,
        quadra: String(item.quadra || "Quadra a definir"),
        area: Number(item.area) || 0,
        value: Number(item.price) || 0,
        status,
        description: `Perfil comercial do ${label}, vinculado à tabela de preços e ao controle de lote.`,
        source: "Tabela de lotes",
      };
    });
  return [...lots, ...LOT_DEVELOPMENT_COMMON_AREAS_V1];
};
const lotDevelopmentProfilesV1 = (state = appStore.get()) => {
  const custom = new Map((state.developmentProfiles || []).filter(Boolean).map((item) => [String(item.id || ""), item]));
  const base = lotDevelopmentBaseProfilesV1(state).map((item) => ({ ...item, ...(custom.get(item.id) || {}) }));
  const additions = [...custom.values()].filter((item) => item?.id && !base.some((baseItem) => baseItem.id === item.id));
  return [...base, ...additions];
};
// Bridge consumida pelo worker-context-chat, que é carregado como módulo
// independente nas páginas de workers; o ai-chat administrativo recebe estas
// funções diretamente no seu service container abaixo.
host.__BELAVISTA_LOT_DEVELOPMENT_PROFILES_V1 = lotDevelopmentProfilesV1;
function upsertLotDevelopmentProfileV1(input = {}) {
  const state = appStore.get();
  const kind = /common|área|area/i.test(String(input.kind || "")) ? "common-area" : "lot";
  const requestedLot = String(input.lotLabel || input.lot || "").trim();
  const catalogLot = kind === "lot" && requestedLot
    ? REPASSE_PRICE_CATALOG.find((item) => normalizeLotDevelopmentTextV1(item.label) === normalizeLotDevelopmentTextV1(requestedLot))
      || REPASSE_PRICE_CATALOG.find((item) => Number(item.lot) === Number(requestedLot.replace(/\D/g, "")))
    : null;
  const title = String(input.title || (catalogLot ? `Lote ${catalogLot.label}` : input.name || "Área comum do loteamento")).trim().slice(0, 120);
  const id = String(input.id || (catalogLot ? `lot:${catalogLot.label}` : `common:custom-${Date.now().toString(36)}`));
  const existing = lotDevelopmentProfilesV1(state).find((item) => item.id === id) || {};
  const profile = {
    ...existing,
    id,
    kind,
    title,
    lotLabel: catalogLot ? String(catalogLot.label) : String(input.lotLabel || existing.lotLabel || ""),
    quadra: catalogLot ? String(catalogLot.quadra || "") : String(input.quadra || existing.quadra || ""),
    area: Number(input.area) || (catalogLot ? Number(catalogLot.area) || 0 : Number(existing.area) || 0),
    value: Number(input.value) || (catalogLot ? Number(catalogLot.price) || 0 : Number(existing.value) || 0),
    status: String(input.status || existing.status || "Em planejamento").slice(0, 80),
    description: String(input.description || existing.description || "Perfil criado para organizar informações do loteamento.").trim().slice(0, 2000),
    source: "Assistente operacional · revisão humana necessária",
    inferredAt: new Date().toISOString(),
  };
  const entries = [...(state.developmentProfiles || []).filter((item) => item?.id !== id), profile];
  appStore.set({
    developmentProfiles: entries,
    selectedDevelopmentProfileId: id,
    view: "lot-profile",
    lastAction: `Assistente preparou o perfil ${profile.title}`,
  });
  return profile;
}
host.__BELAVISTA_UPSERT_LOT_DEVELOPMENT_PROFILE_V1 = upsertLotDevelopmentProfileV1;
  return Object.freeze({
    lotDevelopmentProfilesV1,
    normalizeLotDevelopmentTextV1,
    upsertLotDevelopmentProfileV1,
  });
};

/** TypeScript owns the profile projection; this module remains its MJS fallback. */
export const createLotDevelopmentProfilesV1 = (dependencies = {}) => {
  const typedFactory = atlasProgramTsV1.createAtlasLotDevelopmentProfilesV1;
  if (typeof typedFactory === "function") return typedFactory({
    appStore: dependencies.appStore,
    REPASSE_PRICE_CATALOG: dependencies.REPASSE_PRICE_CATALOG,
    host: dependencies.host || globalThis,
  });
  return createLotDevelopmentProfilesLegacyV1(dependencies);
};

export const hasAtlasLotDevelopmentProfilesOwnerV1 =
  typeof atlasProgramTsV1.createAtlasLotDevelopmentProfilesV1 === "function";
