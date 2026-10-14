/** Complete administrative lead directory and integrated Instagram feed. */
export const installAdminLeadsDirectoryV1 = (ViewLayer, {
  appStore, apiFetch, runtimeRouteV1, demoData, esc, ico, notify, storage, windowRef,
  getWorkerAssistant,
} = {}) => {
// ADMIN_LEADS_DIRECTORY_V5425
// A página administrativa usa os mesmos leads capturados pela experiência
// pública, mas com leitura compacta e um perfil dedicado para o atendimento.
const adminLeadRecordsV5425 = () => {
  const state = appStore.get(),
    reservations = Array.isArray(state.publicReservations)
      ? state.publicReservations
      : [],
    publicLeads = Array.isArray(state.publicLeads) ? state.publicLeads : [];
  const fromReservation = reservations.map((item) => ({
    id: item.id || `reservation-${Math.random()}`,
    name: item.client || "Cliente em análise",
    lot: item.lot || "A definir",
    status: item.status || "Reserva em análise",
    source: "Reserva",
    note: item.notes || "Reserva recebida pela página pública.",
    phone: item.phone || item.whatsapp || "",
    whatsapp: item.whatsapp || item.phone || "",
    instagramHandle: item.instagramHandle || item.instagram || "",
    email: item.email || "",
    objective: item.objective || "A definir",
    budget: item.budget || "A confirmar",
    createdAt: item.createdAt || item.date || "",
    conversation: item.conversation || item.messages || "",
    conversationSummary: item.conversationSummary || item.session?.conversationSummary || "",
  }));
  const fromPublic = publicLeads.map((item) => ({
    id: item.id || `lead-${Math.random()}`,
    name: item.name || "Novo interessado",
    lot: item.lot || "A definir",
    status: item.status || "Novo",
    source: "Página pública",
    note:
      item.conversation ||
      item.notes ||
      "Intenção recebida na conversa da página pública.",
    phone: item.phone || item.whatsapp || "",
    whatsapp: item.whatsapp || item.phone || "",
    instagramHandle: item.instagramHandle || item.instagram || "",
    email: item.email || "",
    objective: item.objective || "Moradia",
    budget: item.budget || "A confirmar",
    sun: item.sun || "A definir",
    terrain: item.terrain || "A definir",
    altitude: item.altitude || "—",
    createdAt: item.createdAt || item.date || "",
    conversation: item.conversation || item.messages || "",
    conversationSummary: item.conversationSummary || item.session?.conversationSummary || "",
  }));
  const demo = (demoData.leads || []).map((item, index) => ({
    ...item,
    id: `demo-lead-${index}`,
    source: "Demonstração",
    note: `Objetivo: ${item.objective || "não informado"}`,
  }));
  return [
    ...fromReservation,
    ...fromPublic,
    ...(fromReservation.length || fromPublic.length ? [] : demo),
  ];
};
const adminLeadStatusToneV5425 = (status) => {
  const value = String(status || "").toLowerCase();
  return value.includes("vend") || value.includes("convert")
    ? "sold"
    : value.includes("reserv") || value.includes("propost")
      ? "reserved"
      : value.includes("contat") || value.includes("qualif")
        ? "contact"
        : "new";
};
const adminLeadPropertiesV5425 = (lead) => [
  ["Lote desejado", lead.lot],
  ["Objetivo", lead.objective],
  ["Faixa de valor", lead.budget],
  ["WhatsApp", lead.whatsapp || lead.phone || "Não informado"],
  ["E-mail", lead.email || "Não informado"],
  ["Instagram", lead.instagramHandle || lead.instagram || "Não informado"],
  ["Orientação solar", lead.sun || "A definir"],
  ["Terreno", lead.terrain || "A definir"],
  ["Altitude", lead.altitude || "—"],
  ["Origem", lead.source],
  ["Cadastro", lead.createdAt || "Registro recente"],
];
const adminLeadConversationSummaryV1 = (lead) => {
  const summary = lead.conversationSummary || lead.conversation;
  const content = typeof summary === "string" ? summary.trim() : "";
  const note = typeof lead.note === "string" ? lead.note.trim() : "";
  const fallback = note && !/^(Intenção recebida|Reserva recebida|Objetivo:)/i.test(note)
    ? note : "";
  return {
    text: content || fallback,
    source: content ? "Resumo registrado na conversa pública" : fallback ? "Nota do cadastro público" : "Resumo ainda não disponível",
  };
};
ViewLayer.prototype.leads = function () {
  const state = appStore.get(),
    all = adminLeadRecordsV5425(),
    selectedIndex = Math.max(
      0,
      Math.min(all.length - 1, Number(state.selectedLead) || 0),
    ),
    lead = all[selectedIndex],
    profile = Boolean(state.adminLeadProfile),
    query = String(state.adminLeadQuery || "").toLowerCase();
  if (!lead)
    return `<section class="admin-leads-v5425"><header class="workspace-head-v5356"><div><span>CRM · CAPTAÇÃO PÚBLICA</span><h1>Leads</h1><p>Nenhum lead recebido ainda.</p></div></header><div class="admin-leads-empty-v5425">As conversas da página pública aparecerão aqui como perfis de contato.</div></section>`;
  if (profile)
    return `<section class="admin-leads-v5425"><header class="workspace-head-v5356"><div><span>CRM · PERFIL DO CONTATO</span><h1>${esc(lead.name)}</h1><p>Drill-in do lead gerado na conversa pública e pronto para continuidade comercial.</p></div><button type="button" data-admin-leads-back>${ico("arrow-left")} Voltar aos leads</button></header><div class="admin-lead-profile-v5425"><main class="admin-lead-paper-v5425"><header><div class="admin-lead-avatar-v5425">${esc((lead.name || "?")[0])}</div><div><span class="admin-lead-kicker-v5425">${esc(lead.source || "Página pública")}</span><h2>${esc(lead.name)}</h2><p>${esc(lead.status)} · ${esc(lead.lot)}</p></div><span class="admin-lead-status-v5425 ${adminLeadStatusToneV5425(lead.status)}">${esc(lead.status)}</span></header><section class="admin-lead-property-grid-v5425">${adminLeadPropertiesV5425(
      lead,
    )
      .map(
        ([label, value]) =>
          `<div><small>${esc(label)}</small><b>${esc(value || "—")}</b></div>`,
      )
      .join(
        "",
      )}</section><section class="admin-lead-conversation-v5425" aria-label="Resumo da conversa pública"><span class="admin-lead-kicker-v5425">ATENDIMENTO · PÁGINA PÚBLICA</span><h3>Resumo da conversa</h3><small>${esc(adminLeadConversationSummaryV1(lead).source)}</small><p>${esc(adminLeadConversationSummaryV1(lead).text || "Ainda não há resumo vinculado a este contato. A conversa não foi inferida a partir dos dados cadastrais.")}</p><dl><div><dt>Interesse registrado</dt><dd>${esc(lead.objective || "Não informado")}</dd></div><div><dt>Lote citado</dt><dd>${esc(lead.lot || "Não informado")}</dd></div><div><dt>Faixa declarada</dt><dd>${esc(lead.budget || "Não informada")}</dd></div></dl></section><footer><button type="button" class="admin-lead-primary-v5425" data-admin-lead-message>${ico("message-circle")} Abrir atendimento</button><button type="button" data-view="map">${ico("map-pinned")} Ver lote no mapa</button></footer></main><aside class="admin-lead-ai-summary-v5425"><span class="admin-lead-kicker-v5425">ORIENTAÇÃO COMERCIAL</span><h2>Próxima melhor ação</h2><p>Priorizar o contato com base no lote indicado, no objetivo de compra e na disponibilidade de retorno.</p><ul><li><b>Intenção:</b> ${esc(lead.objective || "não informada")}</li><li><b>Sinal comercial:</b> ${esc(lead.budget || "faixa ainda não informada")}</li><li><b>Origem:</b> ${esc(lead.source || "página pública")}</li></ul><div class="admin-lead-ai-note-v5425">Confirme os dados com o contato antes de reservar ou alterar o status.</div></aside></div></section>`;
  const filtered = all
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        !query || JSON.stringify(item).toLowerCase().includes(query),
    );
  const cards = filtered
    .map(
      ({ item, index }) =>
        `<button type="button" class="admin-lead-card-v5425 ${index === selectedIndex ? "selected" : ""}" data-admin-lead-index="${index}"><header><span class="admin-lead-avatar-v5425">${esc((item.name || "?")[0])}</span><span><b>${esc(item.name)}</b><small>${esc(item.source || "Página pública")}</small></span><em class="admin-lead-status-v5425 ${adminLeadStatusToneV5425(item.status)}">${esc(item.status)}</em></header><strong>${esc(item.lot)}</strong><p>${esc(item.objective || "Objetivo a confirmar")} · ${esc(item.budget || "Faixa a confirmar")}</p><footer><span>${ico("message-circle")} ${esc(item.whatsapp || item.phone || "Contato pendente")}</span><span>Abrir perfil ${ico("arrow-up-right")}</span></footer></button>`,
    )
    .join("");
  return `<section class="admin-leads-v5425"><header class="workspace-head-v5356"><div><span>CRM · CAPTAÇÃO PÚBLICA</span><h1>Leads</h1><p>Contatos gerados nas conversas da página pública, organizados para triagem e atendimento.</p></div><div class="admin-leads-header-actions-v5425"><button type="button" data-v5356-open-public>${ico("external-link")} Abrir página pública</button><span>${all.length} contatos</span></div></header><section class="admin-leads-toolbar-v5425"><label>${ico("search")} Buscar contato, lote ou objetivo<input type="search" value="${esc(state.adminLeadQuery || "")}" placeholder="Ex.: Juliana, Lote 54, investimento" data-admin-lead-search></label><span class="admin-leads-live-v5425"><i></i> Escuta da captação pública ativa</span></section><section class="admin-leads-grid-v5425">${cards || '<div class="admin-leads-empty-v5425">Nenhum lead corresponde à busca.</div>'}</section></section>`;
};
const adminLeadsBindV5425 = ViewLayer.prototype.bind;
ViewLayer.prototype.bind = function (...args) {
  const result = adminLeadsBindV5425?.apply(this, args),
    root = this.querySelector(".admin-leads-v5425");
  if (!root || root.dataset.bound === "true") return result;
  root.dataset.bound = "true";
  root.querySelectorAll("[data-admin-lead-index]").forEach((button) =>
    button.addEventListener("click", () =>
      appStore.set({
        selectedLead: Number(button.dataset.adminLeadIndex) || 0,
        adminLeadProfile: true,
        lastAction: "Abriu perfil do lead",
      }),
    ),
  );
  root.querySelector("[data-admin-leads-back]")?.addEventListener("click", () =>
    appStore.set({
      adminLeadProfile: false,
      lastAction: "Voltou à lista de leads",
    }),
  );
  root
    .querySelector("[data-admin-lead-search]")
    ?.addEventListener("input", (event) =>
      appStore.set({ adminLeadQuery: event.currentTarget.value }),
    );
  root
    .querySelector("[data-admin-lead-message]")
    ?.addEventListener("click", () => {
      const state = appStore.get(),
        lead =
          adminLeadRecordsV5425()[Math.max(0, Number(state.selectedLead) || 0)],
        chat = getWorkerAssistant();
      const name = lead?.name || "lead selecionado",
        lot = lead?.lot || "lote a definir",
        context = [
          `Atendimento do lead ${name}.`,
          `Lote: ${lot}.`,
          `Status: ${lead?.status || "Novo"}.`,
          `Objetivo: ${lead?.objective || "não informado"}.`,
          `Resumo: ${adminLeadConversationSummaryV1(lead || {}).text || "sem resumo registrado"}.`,
          "Apresente a próxima ação comercial e aguarde confirmação antes de alterar qualquer status.",
        ].join(" ");
      appStore.set({
        lastAction: `Abriu atendimento de ${name}`,
        selectedLead: Number(state.selectedLead) || 0,
      });
      chat?.root?.classList.remove("is-collapsed");
      if (chat?.submit) {
        chat.submit(context, null, null, [], {mode:"priority", requestContext:{source:"lead-follow-up",lead}});
        notify(`Atendimento de ${name} aberto no chat da IA.`, "success");
      } else {
        notify(
          "O chat de atendimento ainda está carregando. Tente novamente em instantes.",
          "warning",
        );
      }
    });
  root
    .querySelector("[data-v5356-open-public]")
    ?.addEventListener("click", () =>
      windowRef.open(runtimeRouteV1("/leads"), "_blank", "noopener"),
    );
  return result;
};

// INSTAGRAM_LEAD_FEED_V1
// Feed, comentários e diretrizes ficam na mesma superfície de triagem. O
// rascunho é imediato, mas o envio externo só acontece após ação explícita.
const instagramCommentPolicyPresetsV1 = {
  acolhedora: {
    label: "Acolhedora",
    tone: "acolhedor e objetivo",
    instructions:
      "Agradeça o comentário, responda somente com informações confirmadas do empreendimento e convide a pessoa a falar com a equipe para detalhes de lote e condições.",
  },
  comercial: {
    label: "Comercial",
    tone: "comercial e consultivo",
    instructions:
      "Reconheça a intenção, destaque a possibilidade de conhecer os lotes e peça apenas a informação necessária para encaminhar o atendimento comercial.",
  },
  institucional: {
    label: "Institucional",
    tone: "institucional e claro",
    instructions:
      "Responda com linguagem institucional, sem prometer preço, reserva, aprovação ou prazo, e direcione dúvidas específicas para a equipe responsável.",
  },
  visita: {
    label: "Visita",
    tone: "prático e convidativo",
    instructions:
      "Agradeça o interesse, convide para conhecer o empreendimento em Amargosa e peça o melhor canal ou horário para a equipe retornar.",
  },
};
const defaultInstagramCommentPolicyV1 = {
  preset: "acolhedora",
  tone: instagramCommentPolicyPresetsV1.acolhedora.tone,
  instructions: instagramCommentPolicyPresetsV1.acolhedora.instructions,
  autoDraft: true,
  requireApproval: true,
};
let instagramFeedRequestV1 = null,
  instagramPolicyRequestV1 = null;
const instagramFeedItemsV1 = () =>
  Array.isArray(appStore.get().instagramFeed?.posts)
    ? appStore.get().instagramFeed.posts
    : [];
const findInstagramCommentV1 = (id) => {
  for (const post of instagramFeedItemsV1())
    for (const comment of post.comments || [])
      if (String(comment.id) === String(id))
        return { ...comment, postId: post.id };
  return null;
};
const draftInstagramCommentV1 = (comment, policy) => {
  const name = String(comment?.username || "")
    .replace(/^@/, "")
    .split(/[._-]/)[0];
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  return `${greeting} Obrigado por comentar no Aliança Park. ${policy.instructions} Fale com nossa equipe pelo Direct para receber as informações confirmadas do empreendimento em Amargosa, Bahia.`
    .replace(/\s+/g, " ")
    .slice(0, 980);
};
const ensureInstagramFeedV1 = () => {
  const state = appStore.get();
  if (
    instagramFeedRequestV1 ||
    state.instagramFeedStatus === "ready" ||
    state.instagramFeedStatus === "loading"
  )
    return;
  appStore.set({ instagramFeedStatus: "loading", instagramFeedError: "" });
  instagramFeedRequestV1 = apiFetch(
    "/api/instagram/feed?limit=6&commentsLimit=8",
  )
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok && payload.source !== "unavailable")
        throw new Error(payload.error || `HTTP ${response.status}`);
      appStore.set({
        instagramFeed: payload,
        instagramFeedStatus: "ready",
        instagramFeedError: payload.error || "",
        lastAction:
          payload.source === "meta"
            ? "Atualizou feed do Instagram"
            : "Feed demonstrativo carregado",
      });
    })
    .catch((error) => {
      appStore.set({
        instagramFeedStatus: "error",
        instagramFeedError: error.message || "Feed indisponível.",
      });
    })
    .finally(() => {
      instagramFeedRequestV1 = null;
    });
};
const ensureInstagramPolicyV1 = () => {
  const state = appStore.get();
  if (instagramPolicyRequestV1 || state.instagramPolicy) return;
  appStore.set({ instagramPolicy: { ...defaultInstagramCommentPolicyV1 } });
  instagramPolicyRequestV1 = apiFetch("/api/instagram/automation-policy")
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.instructions)
        appStore.set({
          instagramPolicy: { ...defaultInstagramCommentPolicyV1, ...payload },
        });
    })
    .catch(() => null)
    .finally(() => {
      instagramPolicyRequestV1 = null;
    });
};
const instagramFeedMediaV1 = (post) =>
  String(post?.mediaType || "").toUpperCase() === "VIDEO"
    ? `<video controls preload="metadata" src="${esc(post.mediaUrl || post.thumbnailUrl || "")}" aria-label="Vídeo do Instagram"></video>`
    : `<img loading="lazy" src="${esc(post.mediaUrl || post.thumbnailUrl || "")}" alt="Publicação do empreendimento">`;
const instagramCommentHtmlV1 = (post, comment, state) => {
  const active = String(state.instagramReplyFor || "") === String(comment.id),
    replies = (comment.replies || [])
      .map(
        (reply) =>
          `<div class="instagram-reply-v1"><b>@${esc(reply.username || "Aliança Park")}</b><span>${esc(reply.text || "")}</span></div>`,
      )
      .join("");
  const draft = active
    ? `<div class="instagram-reply-editor-v1"><textarea data-instagram-reply-text aria-label="Rascunho de resposta">${esc(state.instagramReplyDraft || "")}</textarea><div><button type="button" data-instagram-reply-send="${esc(comment.id)}">Enviar resposta</button><button type="button" data-instagram-reply-cancel>Cancelar</button></div><small>Envio externo exige confirmação explícita e usa a diretriz atual.</small></div>`
    : "";
  return `<article class="instagram-comment-v1"><div class="instagram-comment-head-v1"><b>@${esc(comment.username || "perfil")}</b><time>${esc(comment.timestamp ? new Date(comment.timestamp).toLocaleDateString("pt-BR") : "agora")}</time></div><p>${esc(comment.text || "")}</p><footer><span>${Number(comment.likeCount) || 0} curtidas${replies ? ` · ${comment.replies.length} resposta(s)` : ""}</span>${active ? "" : `<button type="button" data-instagram-comment-draft="${esc(comment.id)}">Gerar resposta</button>`}</footer>${replies}${draft}</article>`;
};
const instagramFeedPanelV1 = (state) => {
  const policy = {
      ...defaultInstagramCommentPolicyV1,
      ...(state.instagramPolicy || {}),
    },
    feed = state.instagramFeed || {},
    status = state.instagramFeedStatus || "idle";
  const posts = (feed.posts || [])
    .map(
      (post) =>
        `<article class="instagram-post-v1"><div class="instagram-post-media-v1">${instagramFeedMediaV1(post)}<span>${esc(String(post.mediaType || "post"))}</span></div><div class="instagram-post-body-v1"><header><div><span>INSTAGRAM · PUBLICAÇÃO</span><time>${esc(post.timestamp ? new Date(post.timestamp).toLocaleDateString("pt-BR") : "sem data")}</time></div><a href="${esc(post.permalink || "#")}" target="_blank" rel="noopener">Abrir publicação ${ico("external-link")}</a></header><p class="instagram-caption-v1">${esc(post.caption || "Sem legenda registrada.")}</p><div class="instagram-post-meta-v1"><span>${Number(post.likeCount) || 0} curtidas</span><span>${(post.comments || []).length || Number(post.commentsCount) || 0} comentários</span></div><section class="instagram-comments-v1"><div class="instagram-comments-title-v1"><b>Comentários</b><span>${(post.comments || []).length} carregados</span></div>${(post.comments || []).map((comment) => instagramCommentHtmlV1(post, comment, state)).join("") || '<p class="instagram-empty-v1">Nenhum comentário retornado nesta publicação.</p>'}</section></div></article>`,
    )
    .join("");
  const unavailable = feed.source === "unavailable",
    feedError =
      feed.error ||
      state.instagramFeedError ||
      "A API do Instagram recusou a credencial atual.",
    feedContent =
      status === "loading"
        ? '<div class="instagram-feed-state-v1"><b>Consultando o Instagram…</b><span>Buscando publicações e comentários na API oficial da Meta.</span></div>'
        : status === "error" || unavailable
          ? `<div class="instagram-feed-state-v1 is-error"><b>Conexão do Instagram bloqueada</b><span>${esc(feedError)}</span>${feed.metaCode ? `<small>Meta OAuth · código ${esc(feed.metaCode)}</small>` : ""}<button type="button" data-instagram-feed-retry>Revalidar conexão</button></div>`
          : posts ||
            '<div class="instagram-feed-state-v1"><b>Nenhuma publicação encontrada</b><span>Quando a conta estiver conectada, as publicações aparecerão aqui.</span></div>';
  const sourceLabel =
    feed.source === "meta"
      ? "API Meta conectada"
      : unavailable
        ? "API Meta recusou a credencial"
        : "Modo demonstrativo local";
  return `<section class="instagram-lead-feed-v1"><header class="instagram-feed-header-v1"><div><span class="activity-kind">COMUNICAÇÃO · INSTAGRAM</span><h2>Posts e comentários</h2><p>Leia o conteúdo público, aplique uma diretriz e prepare respostas rápidas para a equipe.</p></div><div class="instagram-feed-source-v1"><i></i><b>${sourceLabel}</b><small>${feed.updatedAt ? `Atualizado ${new Date(feed.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "aguardando consulta"}</small></div></header><div class="instagram-comment-toolbar-v1"><div class="instagram-policy-fields-v1"><label>Diretriz<select data-instagram-policy-preset>${Object.entries(
    instagramCommentPolicyPresetsV1,
  )
    .map(
      ([key, item]) =>
        `<option value="${key}" ${policy.preset === key ? "selected" : ""}>${item.label}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Tom<input data-instagram-policy-tone value="${esc(policy.tone)}"></label><label class="wide">Resposta imediata<textarea data-instagram-policy-instructions rows="2">${esc(policy.instructions)}</textarea></label></div><div class="instagram-policy-actions-v1"><button type="button" data-instagram-policy-save>${ico("save")} Aplicar diretriz</button><span><i></i> Rascunho automático ativo</span><small>Enviar sempre requer confirmação</small></div></div><div class="instagram-post-grid-v1">${feedContent}</div></section>`;
};
const baseAdminLeadsWithInstagramV1 = ViewLayer.prototype.leads;
ViewLayer.prototype.leads = function () {
  const state = appStore.get();
  if (state.adminLeadProfile) return baseAdminLeadsWithInstagramV1.call(this);
  const activeContentTab =
    state.leadContentTab === "instagram" ? "instagram" : "leads";
  const all = adminLeadRecordsV5425(),
    selectedIndex = Math.max(
      0,
      Math.min(Math.max(0, all.length - 1), Number(state.selectedLead) || 0),
    ),
    query = String(state.adminLeadQuery || "").toLowerCase(),
    filtered = all
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) =>
          !query || JSON.stringify(item).toLowerCase().includes(query),
      );
  const cards = filtered
    .map(
      ({ item, index }) =>
        `<button type="button" class="admin-lead-card-v5425 ${index === selectedIndex ? "selected" : ""}" data-admin-lead-index="${index}"><header><span class="admin-lead-avatar-v5425">${esc((item.name || "?")[0])}</span><span><b>${esc(item.name)}</b><small>${esc(item.source || "Página pública")}</small></span><em class="admin-lead-status-v5425 ${adminLeadStatusToneV5425(item.status)}">${esc(item.status)}</em></header><strong>${esc(item.lot)}</strong><p>${esc(item.objective || "Objetivo a confirmar")} · ${esc(item.budget || "Faixa a confirmar")}</p><footer><span>${ico("message-circle")} ${esc(item.whatsapp || item.phone || "Contato pendente")}</span><span>Abrir perfil ${ico("arrow-up-right")}</span></footer></button>`,
    )
    .join("");
  const contentTabs = `<nav class="admin-leads-content-tabs-v1" aria-label="Conteúdo de leads"><button type="button" class="${activeContentTab === "leads" ? "active" : ""}" aria-selected="${activeContentTab === "leads"}" data-lead-content-tab="leads">${ico("users-round")} Leads <small>${all.length}</small></button><button type="button" class="${activeContentTab === "instagram" ? "active" : ""}" aria-selected="${activeContentTab === "instagram"}" data-lead-content-tab="instagram">${ico("instagram")} Postagens e comentários <small>Instagram</small></button></nav>`;
  const leadsContent = `<section class="admin-leads-content-v1 admin-leads-split-v1"><section class="admin-leads-admin-map-panel-v1" aria-label="Mapa administrativo no CRM de leads"><header><div><strong>Mapa administrativo</strong><small>Modelo 3D do loteamento · ruas e lotes corrigidos</small></div><div class="admin-leads-map-actions-v1"><button type="button" data-view="map">Abrir mapa completo ${ico("arrow-up-right")}</button><a href="${esc(runtimeRouteV1("/leads"))}" target="_blank" rel="noopener">Abrir página pública</a></div></header><div class="admin-leads-admin-map-window-v1" aria-hidden="true"><span>${ico("layers-3")} Mapa compartilhado com a administração</span><small>Arraste, gire ou ajuste a inclinação diretamente na cena.</small></div></section><div class="admin-leads-list-pane-v1"><section class="admin-leads-toolbar-v5425"><label>${ico("search")} Buscar contato, lote ou objetivo<input type="search" value="${esc(state.adminLeadQuery || "")}" placeholder="Ex.: Juliana, Lote 54, investimento" data-admin-lead-search></label><span class="admin-leads-live-v5425"><i></i> Escuta da captação pública ativa</span></section><section class="admin-leads-grid-v5425">${cards || '<div class="admin-leads-empty-v5425">Nenhum lead corresponde à busca.</div>'}</section></div></section>`;
  const instagramContent = `<section class="admin-leads-content-v1 admin-leads-instagram-content-v1">${instagramFeedPanelV1(state)}</section>`;
  return `<section class="admin-leads-v5425 admin-leads-social-v1"><header class="workspace-head-v5356"><div><span>CRM · CAPTAÇÃO PÚBLICA</span><h1>Leads</h1><p>Separe a triagem comercial do acompanhamento de postagens e comentários do Instagram.</p></div><div class="admin-leads-header-actions-v5425"><button type="button" data-v5356-open-public>${ico("external-link")} Abrir página pública</button><span>${all.length} contatos</span></div></header>${contentTabs}${activeContentTab === "instagram" ? instagramContent : leadsContent}</section>`;
};
const baseAdminLeadsSocialBindV1 = ViewLayer.prototype.bind;
ViewLayer.prototype.bind = function (...args) {
  const result = baseAdminLeadsSocialBindV1?.apply(this, args),
    root = this.querySelector(".admin-leads-social-v1");
  if (!root || root.dataset.instagramFeedBound === "true") return result;
  root.dataset.instagramFeedBound = "true";
  ensureInstagramFeedV1();
  ensureInstagramPolicyV1();
  root.addEventListener("change", (event) => {
    const preset = event.target?.closest?.("[data-instagram-policy-preset]");
    if (!preset) return;
    const selected =
      instagramCommentPolicyPresetsV1[preset.value] ||
      instagramCommentPolicyPresetsV1.acolhedora;
    const tone = root.querySelector("[data-instagram-policy-tone]"),
      instructions = root.querySelector("[data-instagram-policy-instructions]");
    if (tone) tone.value = selected.tone;
    if (instructions) instructions.value = selected.instructions;
  });
  root.addEventListener("click", async (event) => {
    const contentTab = event.target?.closest?.("[data-lead-content-tab]");
    if (contentTab) {
      const nextTab =
        contentTab.dataset.leadContentTab === "instagram"
          ? "instagram"
          : "leads";
      appStore.set({
        leadContentTab: nextTab,
        lastAction:
          nextTab === "instagram"
            ? "Abriu postagens e comentários do Instagram"
            : "Abriu a lista de leads",
      });
      return;
    }
    const retry = event.target?.closest?.("[data-instagram-feed-retry]");
    if (retry) {
      appStore.set({ instagramFeedStatus: "idle" });
      ensureInstagramFeedV1();
      return;
    }
    const save = event.target?.closest?.("[data-instagram-policy-save]");
    if (save) {
      const preset =
          root.querySelector("[data-instagram-policy-preset]")?.value ||
          "acolhedora",
        policy = {
          preset,
          tone: root.querySelector("[data-instagram-policy-tone]")?.value || "",
          instructions:
            root.querySelector("[data-instagram-policy-instructions]")?.value ||
            "",
          autoDraft: true,
          requireApproval: true,
        };
      save.disabled = true;
      try {
        const response = await apiFetch("/api/instagram/automation-policy", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(policy),
          }),
          payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.error || `HTTP ${response.status}`);
        appStore.set({
          instagramPolicy: { ...policy, ...payload },
          lastAction: "Aplicou diretriz de resposta do Instagram",
        });
        notify("Diretriz aplicada aos próximos rascunhos.", "success");
      } catch (error) {
        appStore.set({ instagramPolicy: policy });
        storage.setItem(
          "belavista.instagram.comments.policy.v1",
          JSON.stringify(policy),
        );
        notify(`Diretriz salva localmente: ${error.message}`, "warning");
      } finally {
        save.disabled = false;
      }
      return;
    }
    const draftButton = event.target?.closest?.(
      "[data-instagram-comment-draft]",
    );
    if (draftButton) {
      const comment = findInstagramCommentV1(
          draftButton.dataset.instagramCommentDraft,
        ),
        policy = {
          ...defaultInstagramCommentPolicyV1,
          ...(appStore.get().instagramPolicy || {}),
        };
      if (comment)
        appStore.set({
          instagramReplyFor: comment.id,
          instagramReplyDraft: draftInstagramCommentV1(comment, policy),
          lastAction: "Preparou resposta para comentário",
        });
      return;
    }
    const cancel = event.target?.closest?.("[data-instagram-reply-cancel]");
    if (cancel) {
      appStore.set({ instagramReplyFor: null, instagramReplyDraft: "" });
      return;
    }
    const send = event.target?.closest?.("[data-instagram-reply-send]");
    if (send) {
      const comment = findInstagramCommentV1(send.dataset.instagramReplySend),
        text = String(
          root.querySelector("[data-instagram-reply-text]")?.value || "",
        ).trim();
      if (!comment || !text) return;
      send.disabled = true;
      try {
        const response = await apiFetch(
            `/api/instagram/comments/${encodeURIComponent(comment.id)}/reply`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ message: text }),
            },
          ),
          payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.error || `HTTP ${response.status}`);
        const current = appStore.get(),
          feed = current.instagramFeed,
          posts = (feed?.posts || []).map((post) =>
            post.id === comment.postId
              ? {
                  ...post,
                  comments: (post.comments || []).map((item) =>
                    item.id === comment.id
                      ? {
                          ...item,
                          replies: [
                            ...(item.replies || []),
                            {
                              id: payload.replyId || `local-${Date.now()}`,
                              username: "Aliança Park",
                              text,
                              createdAt:
                                payload.createdAt || new Date().toISOString(),
                            },
                          ],
                        }
                      : item,
                  ),
                }
              : post,
          );
        appStore.set({
          instagramFeed: { ...feed, posts },
          instagramReplyFor: null,
          instagramReplyDraft: "",
          lastAction: "Respondeu comentário do Instagram",
        });
        notify("Resposta enviada ao Instagram.", "success");
      } catch (error) {
        notify(error.message || "Resposta mantida como rascunho.", "warning");
      } finally {
        send.disabled = false;
      }
      return;
    }
  });
  root.addEventListener("input", (event) => {
    if (event.target?.matches?.("[data-instagram-reply-text]"))
      appStore.set({ instagramReplyDraft: event.target.value });
  });
  return result;
};


};
