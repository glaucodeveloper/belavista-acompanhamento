/** Loteamento profile directory, profile editor, and their event bindings. */
import { openLotCashEntryV1, renderLotCashEntriesV1 } from "./lot-cash-entry-v1.mjs";
export const installLotDevelopmentPageV1 = (ViewLayer, dependencies = {}) => {
  const {
    appStore, esc, Event, FormData, formatBRL, host, ico,
    lotDevelopmentProfilesV1, normalizeLotDevelopmentTextV1, notify,
    upsertLotDevelopmentProfileV1,
  } = dependencies;
  const document = host.document;

  const LotDevelopmentCardV1 = ({ profile }) => ({
    next() {
      const kindLabel = profile.kind === "lot" ? "LOTE" : "ÁREA COMUM";
      const metrics = profile.kind === "lot"
        ? `<dl><div><dt>Quadra</dt><dd>${esc(profile.quadra || "—")}</dd></div><div><dt>Área</dt><dd>${Number(profile.area || 0).toLocaleString("pt-BR")} m²</dd></div><div><dt>Valor</dt><dd>${formatBRL(profile.value)}</dd></div></dl>`
        : `<dl><div><dt>Classificação</dt><dd>Uso comum</dd></div><div><dt>Situação</dt><dd>${esc(profile.status || "Em planejamento")}</dd></div><div><dt>Origem</dt><dd>${esc(profile.source || "Cadastro base")}</dd></div></dl>`;
      return { done: false, value: `<button type="button" class="lot-development-card" data-development-profile-open="${esc(profile.id)}" data-kind="${esc(profile.kind)}"><header><span class="lot-development-icon">${ico(profile.kind === "lot" ? "map-pin" : "trees")}</span><span><small>${kindLabel}</small><strong>${esc(profile.status || "Em planejamento")}</strong></span><i aria-hidden="true">${ico("arrow-up-right")}</i></header><h2>${esc(profile.title)}</h2><p>${esc(profile.description || "Sem descrição cadastrada.")}</p>${metrics}<footer><span>Abrir perfil</span>${ico("arrow-right")}</footer></button>` };
    },
  });
  
  ViewLayer.prototype.lotDevelopment = function () {
    const state = appStore.get();
    const query = normalizeLotDevelopmentTextV1(state.developmentProfileQuery);
    const profiles = lotDevelopmentProfilesV1(state).filter((profile) => !query || normalizeLotDevelopmentTextV1(`${profile.title} ${profile.lotLabel} ${profile.quadra} ${profile.description}`).includes(query));
    const lots = profiles.filter((profile) => profile.kind === "lot");
    const commons = profiles.filter((profile) => profile.kind === "common-area");
    const cards = profiles.map((profile) => LotDevelopmentCardV1({ profile }).next().value).join("");
    return `<section class="lot-development-page" data-lot-development-page><header class="lot-development-head atlas-page-heading"><div><span class="atlas-eyebrow">EMPREENDIMENTO · PERFIS</span><h1>Loteamento</h1><p>Perfis comerciais dos lotes e perfis operacionais das áreas comuns. As informações sugeridas pelo assistente ficam sempre disponíveis para revisão.</p></div><button type="button" class="atlas-dark-button" data-development-new>${ico("add")} Adicionar área comum</button></header><section class="lot-development-kpis atlas-repasse-metrics" aria-label="Resumo do loteamento"><article><small>PERFIS DE LOTES</small><b>${lots.length}</b><span>originados da tabela de valores</span></article><article><small>ÁREAS COMUNS</small><b>${commons.length}</b><span>cadastros de uso compartilhado</span></article><article><small>ALTERAÇÕES</small><b>${(state.developmentProfiles || []).length}</b><span>preparadas no chat ou editadas</span></article></section><div class="lot-development-toolbar atlas-data-card" role="search"><label class="lot-development-search">${ico("search")}<span>Buscar perfil</span><input type="search" value="${esc(state.developmentProfileQuery || "")}" placeholder="Lote, quadra, área comum…" data-development-profile-search></label><div class="lot-development-filters" aria-label="Filtrar perfis"><button type="button" data-development-show="all">Todos</button><button type="button" data-development-show="lot">Lotes</button><button type="button" data-development-show="common-area">Áreas comuns</button></div></div><div class="lot-development-grid" data-development-grid>${cards || `<p class="lot-development-empty atlas-empty-state">Nenhum perfil encontrado.</p>`}</div><aside class="lot-development-hint"><span>${ico("ai")}</span><p>Você também pode pedir ao assistente: “crie o perfil da área comum playground” ou “descreva o lote QA-12”. A sugestão é registrada como pendente de revisão.</p></aside></section>`;
  };
  
  ViewLayer.prototype.lotProfile = function () {
    const state = appStore.get();
    const profile = lotDevelopmentProfilesV1(state).find((item) => item.id === state.selectedDevelopmentProfileId) || lotDevelopmentProfilesV1(state)[0];
    if (!profile) return `<section class="lot-profile-page"><p>Nenhum perfil disponível.</p><button type="button" data-view="lot-development">Voltar ao loteamento</button></section>`;
    const kindLabel = profile.kind === "lot" ? "LOTE" : "ÁREA COMUM";
    return `<section class="lot-profile-page" data-lot-development-profile data-profile-id="${esc(profile.id)}"><header class="lot-profile-head atlas-page-heading"><div><span class="atlas-eyebrow">${kindLabel} · PERFIL DO LOTEAMENTO</span><h1>${esc(profile.title)}</h1><p>Atualize o perfil e mantenha o histórico de origem da informação.</p></div><button type="button" class="atlas-outline-button" data-view="lot-development">${ico("arrow-left")} Voltar ao loteamento</button></header><form class="lot-profile-form atlas-data-card" data-development-profile-form><section class="lot-profile-section"><header><span>01</span><div><h2>Identificação</h2><p>Dados que identificam o lote ou a área comum.</p></div></header><div class="lot-profile-grid"><label><span>Tipo de perfil</span><input value="${kindLabel}" readonly></label><label><span>${profile.kind === "lot" ? "Lote" : "Referência"}</span><input value="${esc(profile.kind === "lot" ? profile.lotLabel || "—" : profile.id)}" readonly></label><label class="lot-profile-wide"><span>Nome do perfil</span><input name="title" required value="${esc(profile.title)}"></label></div></section><section class="lot-profile-section"><header><span>02</span><div><h2>Propriedades</h2><p>Campos comerciais e operacionais editáveis.</p></div></header><div class="lot-profile-grid"><label><span>${profile.kind === "lot" ? "Quadra" : "Localização / setor"}</span><input name="quadra" value="${esc(profile.quadra || "")}" placeholder="${profile.kind === "lot" ? "Quadra" : "Ex.: área central"}"></label><label><span>Área (m²)</span><input name="area" type="number" min="0" step="0.01" value="${Number(profile.area || 0) || ""}" placeholder="Não informada"></label><label><span>${profile.kind === "lot" ? "Valor de referência" : "Orçamento de referência"}</span><input name="value" type="number" min="0" step="0.01" value="${Number(profile.value || 0) || ""}" placeholder="Não informado"></label><label><span>Situação</span><select name="status"><option ${profile.status === "Disponível" ? "selected" : ""}>Disponível</option><option ${profile.status === "Em planejamento" ? "selected" : ""}>Em planejamento</option><option ${profile.status === "Em acompanhamento" ? "selected" : ""}>Em acompanhamento</option><option ${profile.status === "Reservado" ? "selected" : ""}>Reservado</option><option ${profile.status === "Vendido" ? "selected" : ""}>Vendido</option></select></label></div></section><section class="lot-profile-section"><header><span>03</span><div><h2>Descrição e contexto</h2><p>Informe uso, características, restrições, histórico e orientações operacionais.</p></div></header><label class="lot-profile-field-wide"><span>Descrição</span><textarea name="description" rows="7" placeholder="Descreva o contexto deste perfil">${esc(profile.description || "")}</textarea></label></section><footer class="lot-profile-form-actions"><div><span class="atlas-eyebrow">ORIGEM E RASTREABILIDADE</span><small>${esc(profile.source || "Tabela de lotes")}${profile.inferredAt ? ` · sugestão recebida em ${new Date(profile.inferredAt).toLocaleString("pt-BR")}` : " · perfil base do loteamento"}</small></div><div><button type="button" class="atlas-outline-button" data-development-ask-chat>${ico("message-circle")} Pedir ajuste à IA</button><button type="submit" class="atlas-dark-button">${ico("save")} Salvar perfil</button></div></footer></form>${profile.kind === "lot" && profile.lotLabel ? `<section class="lot-profile-cash atlas-data-card"><header><span class="atlas-eyebrow">CAIXA · ${esc(profile.lotLabel)}</span><h2>Entradas de caixa</h2></header>${renderLotCashEntriesV1({ state, lotKey: profile.lotLabel, esc, formatBRL, ico })}</section>` : ""}</section>`;
  };
  
  const lotDevelopmentBindBaseV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = lotDevelopmentBindBaseV1.apply(this, args);
    const page = this.querySelector("[data-lot-development-page]");
    page?.querySelector("[data-development-profile-search]")?.addEventListener("input", (event) => appStore.set({ developmentProfileQuery: event.currentTarget.value }));
    page?.querySelectorAll("[data-development-show]").forEach((button) => button.addEventListener("click", () => {
      const kind = button.dataset.developmentShow;
      page.querySelectorAll("[data-development-profile-open]").forEach((card) => { card.hidden = kind !== "all" && card.dataset.kind !== kind; });
    }));
    page?.querySelectorAll("[data-development-profile-open]").forEach((button) => button.addEventListener("click", () => appStore.set({ view: "lot-profile", selectedDevelopmentProfileId: button.dataset.developmentProfileOpen, lastAction: `Abriu o perfil ${button.textContent.trim()}` })));
    page?.querySelector("[data-development-new]")?.addEventListener("click", () => upsertLotDevelopmentProfileV1({ kind: "common-area", title: "Nova área comum", description: "Descreva a finalidade, localização e regras de uso desta área." }));
    const profilePage = this.querySelector("[data-lot-development-profile]");
    profilePage?.querySelector("[data-lot-cash-entry]")?.addEventListener("click", (event) =>
      openLotCashEntryV1(appStore, event.currentTarget.dataset.lotCashEntry, "lot-profile"));
    profilePage?.querySelector("[data-development-profile-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const current = lotDevelopmentProfilesV1(appStore.get()).find((item) => item.id === profilePage.dataset.profileId);
      upsertLotDevelopmentProfileV1({ ...current, ...values, id: profilePage.dataset.profileId, kind: current?.kind });
      notify("Perfil do loteamento salvo.", "success");
    });
    profilePage?.querySelector("[data-development-ask-chat]")?.addEventListener("click", () => {
      const profile = lotDevelopmentProfilesV1(appStore.get()).find((item) => item.id === profilePage.dataset.profileId);
      const chat = document.querySelector("[data-worker-context-assistant] textarea[name=message]");
      if (!chat || !profile) return;
      chat.focus();
      chat.value = `Atualizar o perfil ${profile.title}: `;
      chat.dispatchEvent(new Event("input", { bubbles: true }));
    });
    return result;
  };
};

/** Keep legacy render extensions from replacing the lot-development routes. */
export const installLotDevelopmentRenderGuardV1 = (ViewLayer, { appStore, windowRef } = {}) => {
  if (!ViewLayer?.prototype || typeof ViewLayer.prototype.render !== "function")
    throw new TypeError("Lot development render guard requires ViewLayer.prototype.render().");
  if (typeof appStore?.get !== "function")
    throw new TypeError("Lot development render guard requires appStore.get().");
  if (!windowRef)
    throw new TypeError("Lot development render guard requires windowRef.");

  const baseRender = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = baseRender.apply(this, args);
    const state = appStore.get();
    if (!["lot-development", "lot-profile"].includes(state.view)) return result;
    const isProfile = state.view === "lot-profile",
      selector = isProfile ? "[data-lot-development-profile]" : "[data-lot-development-page]";
    if (this.querySelector(selector)) return result;
    const title = isProfile ? "Perfil do loteamento" : "Loteamento",
      subtitle = isProfile ? "Propriedades, contexto e acompanhamento" : "Perfis de lotes e áreas comuns";
    this.dataset.view = state.view;
    this.innerHTML = `<div class="activity-header"><div><span>${title}</span><small>${subtitle}</small></div><div class="activity-state"><i></i> Em acompanhamento <b>·</b> ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div></div>${isProfile ? this.lotProfile() : this.lotDevelopment()}`;
    windowRef.lucide?.createIcons();
    this.bind();
    return result;
  };
  return ViewLayer;
};
