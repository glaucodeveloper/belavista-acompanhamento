/** Mounts the lead-map conversation and reservation widgets once per page. */
export const bindLeadsMapConversationV1 = (view, dependencies = {}) => {
  const {
    appStore,
    documentRef = globalThis.document,
    esc,
    FormDataCtor = globalThis.FormData,
    DateCtor = globalThis.Date,
    localStorageRef = globalThis.localStorage,
    notify,
  } = dependencies;
  const page = view.querySelector(".leads-reference-page"),
    mapFrame = page?.querySelector(".leads-map-frame"),
    sidebar = view.querySelector(".leads-floating-sidebar");
  if (!page || !mapFrame || page.dataset.leadWidgetsMounted) return;
  page.dataset.leadWidgetsMounted = "true";
  mapFrame
    .querySelectorAll(".lead-sidebar-widget")
    .forEach((widget) => widget.remove());
  sidebar?.classList.add("leads-sidebar-ready");
  if (sidebar && !sidebar.querySelector(".lead-conversation-widget")) {
    const box = documentRef.createElement("section");
    box.className = "lead-conversation-widget lead-ops-window";
    box.innerHTML =
      '<div class="lead-window-head"><div><span class="activity-kind">ATENDIMENTO ONLINE</span><h2>Olá! Como podemos ajudar?</h2></div><span class="lead-conversation-channel">online</span></div><div class="lead-welcome-message"><b>Bem-vindo ao Aliança Park.</b><p>Conte o que procura e nossa equipe vai ajudar a encontrar o lote ideal, informar valores e planejar sua reserva.</p></div><div class="lead-conversation-thread" data-lead-thread><p class="empty-data">Envie uma mensagem para iniciar o atendimento.</p></div><form class="lead-conversation-form" data-lead-conversation-form><input name="message" required placeholder="Ex.: Quero agendar uma visita ou reservar um lote"><select name="channel"><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="site">Site</option></select><button type="submit">Enviar</button></form>';
    sidebar.appendChild(box);
    const reservationFlow = documentRef.createElement("public-reservation-flow");
    reservationFlow.className = "sidebar-reservation-flow";
    sidebar.appendChild(reservationFlow);
    const prompt = documentRef.createElement("section");
    prompt.className = "lead-reservation-prompt";
    prompt.innerHTML = `<span>PRÓXIMO PASSO</span><b>Planeje sua visita e converse sobre a reserva.</b><small>Escolha um lote no mapa ou fale com nosso atendimento.</small><button type="button" data-lead-reservation-start>Quero agendar</button>`;
    sidebar.appendChild(prompt);
    prompt
      .querySelector("[data-lead-reservation-start]")
      ?.addEventListener("click", () => {
        const dialog = reservationFlow.querySelector("dialog");
        if (dialog && !dialog.open) dialog.showModal();
        else if (!dialog) box.querySelector('input[name="message"]')?.focus();
      });
    const renderThread = () => {
      const state = appStore.get(),
        lead = (state.publicLeads || []).map((x) => x.name).includes("")
          ? null
          : null;
      const key = `belavista.lead.thread.${state.selectedLead || 0}`,
        items = JSON.parse(localStorageRef.getItem(key) || "[]"),
        thread = box.querySelector("[data-lead-thread]");
      thread.innerHTML = items.length
        ? items
            .map(
              (item) =>
                `<div class="lead-message ${item.direction}"><small>${esc(item.channel)} · ${esc(item.at || "agora")}</small><p>${esc(item.body)}</p></div>`,
            )
            .join("")
        : '<p class="empty-data">Nenhuma mensagem registrada.</p>';
      thread.scrollTop = thread.scrollHeight;
      void lead;
    };
    box
      .querySelector("[data-lead-conversation-form]")
      .addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget,
          data = new FormDataCtor(form),
          body = String(data.get("message") || "").trim();
        if (!body) return;
        const state = appStore.get(),
          key = `belavista.lead.thread.${state.selectedLead || 0}`,
          items = JSON.parse(localStorageRef.getItem(key) || "[]");
        items.push({
          body,
          channel: data.get("channel"),
          direction: "outbound",
          at: new DateCtor().toLocaleString("pt-BR"),
        });
        localStorageRef.setItem(key, JSON.stringify(items));
        form.reset();
        renderThread();
        notify("Mensagem registrada no atendimento.", "success");
        appStore.set({
          lastAction: "Registrou mensagem no atendimento do lead",
        });
      });
    renderThread();
  }
};
