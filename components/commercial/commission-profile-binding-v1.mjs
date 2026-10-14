export const installCommissionProfileBindingV1 = (ViewLayer, dependencies = {}) => {
  const {
    viewLayerBindWithCommissions,
    appStore,
    commissionDeals,
    commissionProfiles,
    notify,
    documentRef = globalThis.document,
    windowRef = globalThis.window,
  } = dependencies;

  ViewLayer.prototype.bind = function () {
  viewLayerBindWithCommissions.call(this);
  this.querySelectorAll(".commission-profile-card").forEach((card) => {
    if (card.querySelector(".commission-profile-map")) return;
    const map = documentRef.createElement("map-scene");
    map.setAttribute("compact", "");
    map.dataset.stage = `${card.querySelector("h2")?.textContent || "Carteira"} · lotes`;
    map.dataset.overlay = "terraplanagem";
    map.className = "commission-profile-map";
    map.setAttribute("aria-label", "Mapa 3D dos lotes desta carteira");
    card
      .querySelector(".commission-profile-top")
      ?.insertAdjacentElement("afterend", map);
  });
  this.querySelectorAll(
    ".commission-deal-card[data-commission-contract]",
  ).forEach((card) => {
    if (card.nextElementSibling?.matches("[data-commission-proposal]")) return;
    const proposal = documentRef.createElement("button");
    proposal.type = "button";
    proposal.className = "commission-proposal-inline";
    proposal.dataset.commissionProposal = card.dataset.commissionContract;
    proposal.textContent = "Abrir proposta";
    card.insertAdjacentElement("afterend", proposal);
  });
  this.querySelectorAll("[data-commission-profile]").forEach((button) =>
    button.addEventListener("click", () =>
      appStore.set({
        selectedCommissionProfile: button.dataset.commissionProfile,
        selectedCommissionContract: null,
        lastAction: `Abriu carteira de comissões`,
      }),
    ),
  );
  this.querySelectorAll("[data-commission-contract]").forEach((button) =>
    button.addEventListener("click", () =>
      appStore.set({
        selectedCommissionContract: button.dataset.commissionContract,
        lastAction: `Abriu contrato ${button.dataset.commissionContract}`,
      }),
    ),
  );
  this.querySelectorAll("[data-commission-proposal]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      appStore.set({
        selectedCommissionProposal: button.dataset.commissionProposal,
        selectedCommissionProfile: null,
        selectedCommissionContract: null,
        lastAction: `Abriu proposta ${button.dataset.commissionProposal}`,
      });
    }),
  );
  this.querySelector("[data-commission-back]")?.addEventListener("click", () =>
    appStore.set({
      selectedCommissionProfile: null,
      selectedCommissionContract: null,
      lastAction: "Voltou para a carteira de comissões",
    }),
  );
  this.querySelector("[data-proposal-back]")?.addEventListener("click", () =>
    appStore.set({
      selectedCommissionProposal: null,
      selectedCommissionProfile: null,
      selectedCommissionContract: null,
      lastAction: "Voltou da proposta",
    }),
  );
  this.querySelector("[data-proposal-print]")?.addEventListener("click", () =>
    windowRef.print(),
  );
  this.querySelector("[data-proposal-save]")?.addEventListener("click", () =>
    notify("Proposta salva como minuta para revisão.", "success"),
  );
  this.querySelector("[data-contract-print]")?.addEventListener("click", () =>
    windowRef.print(),
  );
  this.querySelector("[data-contract-whatsapp]")?.addEventListener(
    "click",
    () => {
      const deal = commissionDeals.find(
        (item) => item.id === appStore.get().selectedCommissionContract,
      );
      if (deal) {
        const profile = commissionProfiles.find(
          (item) => item.id === deal.profile,
        );
        windowRef.open(
          `https://wa.me/${profile.phone}?text=${encodeURIComponent(`Olá, ${deal.client}. Segue a minuta do contrato ${deal.id} referente ao ${deal.quadra}, no valor de ${deal.value}.`)}`,
          "_blank",
          "noopener",
        );
      }
    },
  );
  this.querySelector("[data-commission-new]")?.addEventListener("click", () =>
    notify(
      "Novo lançamento de comissão: escolha um perfil comercial para associar o negócio.",
    ),
  );
  this.querySelector(".leads-lot-interest")?.addEventListener("click", () => {
    const target = this.querySelector('public-lead-form input[name="name"]');
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus();
    appStore.set({
      lastAction: "Selecionou QD02-L18 para registrar interesse",
    });
    notify(
      "Lote QD02-L18 selecionado. Preencha seus dados para registrar o interesse.",
      "success",
    );
  });
};
};

