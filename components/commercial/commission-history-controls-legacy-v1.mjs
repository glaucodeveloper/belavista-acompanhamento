/** Installs return-aware contract navigation and commission portfolio controls. */
export const installCommissionHistoryControlsV1 = (ViewLayer, dependencies = {}) => {
  const {
    appStore,
    brlToNumber,
    commissionDeals,
    commissionProfiles,
    documentRef = globalThis.document,
    esc,
    formatBRL,
    ico,
    notify,
    setTimeoutRef = globalThis.setTimeout,
    windowRef = globalThis.window,
  } = dependencies;

  const commissionContractWithHistory = ViewLayer.prototype.commissionContract;
  ViewLayer.prototype.commissionContract = function(deal) {
    const profile = commissionProfiles.find((item) => item.id === deal.profile);
    const returnProfile = appStore.get().commissionContractReturn || "";
    const returnLabel = returnProfile
      ? commissionProfiles.find((item) => item.id === returnProfile)?.name ||
        "carteira anterior"
      : "lançamentos contratuais";
    return commissionContractWithHistory
      .call(this, deal)
      .replace(
        `data-commission-profile="${profile.id}"`,
        `data-contract-return data-commission-return="${esc(returnProfile)}"`,
      )
      .replace(`Voltar para ${profile.name}`, `Voltar para ${returnLabel}`);
  };

  const viewLayerBindCommissionControls = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function() {
    viewLayerBindCommissionControls.call(this);
    const page = this.querySelector(".commissions-page");
    if (page) {
      const portfolios = page.querySelector(".commission-profile-section"),
        transactions = page.querySelector(".commission-transaction-section");
      if (portfolios && transactions) transactions.before(portfolios);
      if (!page.querySelector(".commission-control-footer")) {
        (transactions || portfolios)?.insertAdjacentHTML(
          "afterend",
          `<footer class="commission-control-footer"><div><span class="activity-kind">CONTROLES DE CARTEIRA</span><b>Fechamento comercial e preparação de documentos</b><small>Imprima a carteira, inclua o mapa do loteamento ou troque dados com planilhas.</small></div><div class="commission-footer-actions"><button type="button" class="toolbar-action" data-commission-print>Imprimir</button><button type="button" class="toolbar-action" data-commission-print-map>${ico("map")} Com mapa</button><label class="toolbar-action commission-import-label">${ico("upload")} Importar Excel<input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-commission-import hidden></label><button type="button" class="toolbar-primary" data-commission-export-excel>${ico("download")} Exportar Excel</button></div><p class="commission-footer-suggestions">Sugestões: revise reservas pendentes, valide documentos de contratos e envie a previsão de repasse aos responsáveis.</p></footer>`,
        );
      }
      this.querySelector("[data-commission-print]")?.addEventListener(
        "click",
        () => windowRef.print(),
      );
      this.querySelector("[data-commission-print-map]")?.addEventListener(
        "click",
        () => {
          const shell = documentRef.querySelector(".app-shell");
          shell?.classList.add("print-with-map");
          windowRef.print();
          setTimeoutRef(() => shell?.classList.remove("print-with-map"), 300);
        },
      );
      this.querySelector("[data-commission-export-excel]")?.addEventListener(
        "click",
        () => this.querySelector("[data-commission-export]")?.click(),
      );
      this.querySelector("[data-commission-import]")?.addEventListener(
        "change",
        async (event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          if (!/\.csv$/i.test(file.name)) {
            notify(
              `Planilha ${file.name} adicionada à fila de importação. Para importar linhas automaticamente, exporte-a como CSV UTF-8.`,
              "warning",
            );
            return;
          }
          const [header, ...lines] = (await file.text())
              .split(/\r?\n/)
              .filter(Boolean),
            columns = header
              .split(/[;,\t]/)
              .map((value) => value.trim().toLocaleLowerCase());
          const read = (row, names) => {
            const values = row.split(/[;,\t]/);
            const index = columns.findIndex((column) =>
              names.some((name) => column.includes(name)),
            );
            return index >= 0 ? values[index]?.trim() : "";
          };
          const entries = lines
            .map((line, index) => {
              const profileName = read(line, [
                "respons",
                "consultor",
                "corretor",
              ]);
              const profile =
                commissionProfiles.find(
                  (item) =>
                    item.name.toLocaleLowerCase() ===
                    profileName.toLocaleLowerCase(),
                ) || commissionProfiles[0];
              const value = read(line, ["valor"]) || "0";
              const rate =
                Number(
                  String(read(line, ["taxa"]) || "6")
                    .replace(",", ".")
                    .replace(/[^\d.]/g, ""),
                ) || 6;
              return {
                id: `CT-IMP-${Date.now().toString().slice(-5)}${index}`,
                profile: profile.id,
                lot: read(line, ["lote"]) || `IMPORT-${index + 1}`,
                quadra: read(line, ["quadra"]) || "Lote importado",
                client:
                  read(line, ["cliente", "comprador"]) || "Cliente importado",
                status: read(line, ["status"]) || "Proposta",
                value: formatBRL(brlToNumber(value)),
                commission: formatBRL((brlToNumber(value) * rate) / 100),
                rate: `${rate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`,
                date: new Date().toLocaleDateString("pt-BR"),
                payment: "Importado de planilha",
                purpose: "A definir",
                stage: "Importação CSV",
              };
            })
            .filter((entry) => entry.lot || entry.client);
          if (!entries.length) {
            notify("Não encontrei linhas válidas na planilha CSV.", "warning");
            return;
          }
          appStore.set({
            commissionEntries: [
              ...(appStore.get().commissionEntries || []),
              ...entries,
            ],
            lastAction: `Importou ${entries.length} lançamentos da planilha`,
          });
          notify(
            `${entries.length} lançamentos importados para a carteira.`,
            "success",
          );
        },
      );
    }
    if (this.dataset.commissionHistoryBound) return;
    this.dataset.commissionHistoryBound = "true";
    this.addEventListener(
      "click",
      (event) => {
        const trigger = event.target.closest?.(
          "[data-commission-contract],[data-commission-open],[data-contract-return]",
        );
        if (!trigger) return;
        if (trigger.dataset.commissionContract) {
          event.stopImmediatePropagation();
          appStore.set({
            selectedCommissionContract: trigger.dataset.commissionContract,
            commissionContractReturn:
              appStore.get().selectedCommissionProfile || null,
            lastAction: `Abriu contrato ${trigger.dataset.commissionContract}`,
          });
        }
        if (trigger.dataset.commissionOpen) {
          event.stopImmediatePropagation();
          const deal = commissionDeals.find(
            (item) => item.id === trigger.dataset.commissionOpen,
          );
          if (deal)
            appStore.set({
              selectedCommissionContract: deal.id,
              commissionContractReturn: null,
              lastAction: `Abriu contrato ${deal.id}`,
            });
        }
        if (trigger.hasAttribute("data-contract-return")) {
          event.stopImmediatePropagation();
          appStore.set({
            selectedCommissionProfile: trigger.dataset.commissionReturn || null,
            selectedCommissionContract: null,
            commissionContractReturn: null,
            lastAction: "Voltou para a origem do lançamento",
          });
        }
      },
      true,
    );
  };
};
