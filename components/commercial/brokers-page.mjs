import { createServiceEventAdministrators } from "../events/service-event-admin.mjs?v=service-event-admin-v4";

const downloadCsvV1 = (filename, columns, rows) => {
  const csv = [columns, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const installBrokersPageV1 = (
  ViewLayer,
  {
    appStore,
    commissionProfiles,
    esc,
    ico,
  },
) => {
  ViewLayer.prototype.brokers = function () {
    return `<section class="broker-directory-page"><header class="broker-directory-head"><div><span class="activity-kind">CADASTRO COMERCIAL · PERFIS</span><h1>Perfis de corretores</h1><p>Consulte a identificação profissional e os dados de contato. Abra um perfil para ver a carteira, os documentos e o histórico do corretor.</p></div><button type="button" class="toolbar-primary" data-brokers-export>${ico("file-down")} Exportar perfis</button></header><div class="broker-directory-search"><label>Buscar perfil<input type="search" data-broker-search placeholder="Nome, CRECI, atuação ou contato"></label><span>${commissionProfiles.length} perfis</span></div><div class="broker-profile-directory" aria-label="Perfis de corretores">${commissionProfiles.map((person) => {
      const haystack = `${person.name} ${person.creci} ${person.role} ${person.phone} ${(person.emails || []).join(" ")}`.toLocaleLowerCase("pt-BR");
      return `<article class="broker-profile-directory-card" data-broker-row data-search="${esc(haystack)}"><header><i class="commission-avatar" style="background:${esc(person.avatar)}">${esc(person.initials)}</i><div><h2>${esc(person.name)}</h2><p>${esc(person.role)}</p></div></header><dl><div><dt>CRECI</dt><dd>${esc(person.creci || "Não informado")}</dd></div><div><dt>Contato</dt><dd>${person.phone ? `<a href="https://wa.me/${esc(person.phone)}" target="_blank" rel="noopener">${ico("message-circle")} ${esc(person.phone)}</a>` : "Não informado"}</dd></div><div><dt>E-mail</dt><dd>${esc((person.emails || []).join(", ") || "Não informado")}</dd></div></dl><footer><button type="button" class="toolbar-action" data-broker-open="${esc(person.id)}">Abrir perfil ${ico("arrow-right")}</button></footer></article>`;
    }).join("")}</div></section>`;
  };

  const previousBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = previousBind?.apply(this, args);
    this._brokersPageEventAdministratorsV1?.dispose();
    this._brokersPageEventAdministratorsV1 = null;
    const typedRouteOwnsBrokers = ViewLayer.prototype.__atlasBrokersRouteTsOwnerV1 === true &&
      globalThis.BELAVISTA_USE_LEGACY_BROKERS_PAGE_V1 !== true;
    if ((this.dataset.view || appStore.get().view) !== "brokers" || typedRouteOwnsBrokers) return result;

    this._brokersPageEventAdministratorsV1 = createServiceEventAdministrators({
      root: this,
      services: [
        {
          service: "brokers-directory-search",
          routes: [
            {
              eventType: "input",
              selector: "[data-broker-search]",
              action: "filter-directory",
              handler: ({ event, root }) => {
                const query = event.target.value.toLocaleLowerCase("pt-BR");
                root.querySelectorAll("[data-broker-row]").forEach((row) => {
                  row.hidden = !row.dataset.search.includes(query);
                });
              },
            },
          ],
        },
        {
          service: "brokers-profile-navigation",
          capture: true,
          routes: [
            {
              eventType: "click",
              selector: "[data-broker-open]",
              action: "open-broker-profile",
              handler: ({ event, target }) => {
                event.preventDefault();
                event.stopPropagation();
                target.blur();
                appStore.set({
                  view: "broker-detail",
                  selectedBrokerDirectoryId: target.dataset.brokerOpen,
                  lastAction: "Abriu a página dedicada do corretor",
                });
                requestAnimationFrame(() => window.scrollTo(0, 0));
              },
            },
          ],
        },
        {
          service: "brokers-export",
          routes: [
            {
              eventType: "click",
              selector: "[data-brokers-export]",
              action: "export-directory",
              handler: () =>
                downloadCsvV1(
                  "corretores-alianca-park.csv",
                  ["Nome", "Atuação", "CRECI", "Contato", "E-mail"],
                  commissionProfiles.map((person) => [
                    person.name,
                    person.role,
                    person.creci,
                    person.phone,
                    (person.emails || []).join(" / "),
                  ]),
                ),
            },
          ],
        },
      ],
    });
    return result;
  };
};

const brokerProfileRowsV9 = ({ profile, state, commissionDeals, brokerReasonsV9, brlToNumber }) => {
  const rules = brokerReasonsV9(state),
    all = [...commissionDeals, ...(state.commissionEntries || [])].filter(
      (item) => item.profile === profile.id,
    ),
    used = new Map();
  const keyFor = (deal) => {
    const text =
      `${deal.reason || ""} ${deal.payment || ""} ${deal.stage || ""}`.toLocaleLowerCase(
        "pt-BR",
      );
    if (/mensal|parcela mensal/.test(text)) return "monthly";
    if (/intermedi/.test(text)) return "intermediate";
    if (/sinal|entrada|reserva/.test(text)) return "signal";
    const index = used.get(profile.id) || 0;
    used.set(profile.id, index + 1);
    return rules[index % rules.length]?.id || "signal";
  };
  return all.map((deal) => {
    const reason = rules.find((item) => item.id === keyFor(deal)) || rules[0],
      value = brlToNumber(deal.value),
      commission = brlToNumber(deal.commission),
      warley = (commission * Number(reason.warley || 0)) / 100,
      partner = commission - warley;
    return {
      ...deal,
      reason,
      numberValue: value,
      numberCommission: commission,
      warley,
      partner,
    };
  });
};

const brokerPeriodKeyV2 = (value) => {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 7);
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2].padStart(2, "0")}` : "";
};
const BROKER_PROFILE_ATTACHMENT_KEY_V2 = "belavista.broker-profile-attachments.v2";

export const installBrokerProfilePageV2 = (
  ViewLayer,
  { appStore, commissionDeals, brokerReasonsV9, brlToNumber, formatBRL, esc, ico, notify, storage, fileToDataUrl, windowRef },
) => {
  for (const method of ["get", "set"])
    if (typeof appStore?.[method] !== "function")
      throw new TypeError(`Broker profile requires appStore.${method}().`);
  if (!Array.isArray(commissionDeals) || typeof brokerReasonsV9 !== "function" ||
      typeof brlToNumber !== "function" || typeof formatBRL !== "function" ||
      typeof esc !== "function" || typeof ico !== "function" || typeof notify !== "function" ||
      typeof fileToDataUrl !== "function" || typeof windowRef?.print !== "function")
    throw new TypeError("Broker profile requires its sales, rendering, notification, file, and print services.");
  for (const method of ["getItem", "setItem"])
    if (typeof storage?.[method] !== "function")
      throw new TypeError(`Broker profile storage requires storage.${method}().`);

  const readAttachments = () => {
    try {
      const data = JSON.parse(storage.getItem(BROKER_PROFILE_ATTACHMENT_KEY_V2) || "{}");
      return data && typeof data === "object" ? data : {};
    } catch { return {}; }
  };
  ViewLayer.prototype.commissionProfile = function (profile) {
    const state = appStore.get();
    const all = brokerProfileRowsV9({ profile, state, commissionDeals, brokerReasonsV9, brlToNumber });
    const latest = all.map((row) => brokerPeriodKeyV2(row.date)).filter(Boolean).sort().at(-1) || new Date().toISOString().slice(0, 7);
    const mode = state.brokerPrintMode === "monthly" ? "monthly" : "annual";
    const month = /^\d{4}-\d{2}$/.test(state.brokerPrintMonth || "") ? state.brokerPrintMonth : latest;
    const year = /^\d{4}$/.test(state.brokerPrintYear || "") ? state.brokerPrintYear : latest.slice(0, 4);
    const rows = all.filter((row) => {
      const key = brokerPeriodKeyV2(row.date);
      return key && (mode === "monthly" ? key === month : key.startsWith(year));
    });
    const sum = (key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    const attachments = readAttachments()[profile.id] || [];
    const periodLabel = mode === "monthly" ? new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : `Ano ${year}`;
    return `<section class="commission-profile-page broker-profile-dedicated broker-profile-v2" data-broker-id="${esc(profile.id)}"><div class="broker-profile-toolbar no-print"><button type="button" class="commission-back" data-commission-back>${ico("arrow-left")} Corretores</button><div class="broker-profile-toolbar-actions"><button type="button" data-broker-apply-rules>${ico("refresh-cw")} Aplicar regras</button><button type="button" data-broker-print-v2>${ico("printer")} Imprimir / PDF</button></div></div><header class="commission-profile-header broker-profile-header-v2"><div class="commission-avatar commission-avatar-large" style="background:${esc(profile.avatar)}">${esc(profile.initials)}</div><div><span class="activity-kind">CARTEIRA DEDICADA · ${esc(profile.creci)}</span><h1>${esc(profile.name)}</h1><p>${esc(profile.role)}</p><dl class="broker-profile-properties-v2"><div><dt>Telefone</dt><dd>${esc(profile.phone || "Não informado")}</dd></div><div><dt>E-mail</dt><dd>${esc((profile.emails || []).join(", ") || "Não informado")}</dd></div><div><dt>Conversão</dt><dd>${esc(profile.conversion || "—")}</dd></div></dl></div><aside class="broker-profile-attachments-v2"><header><span class="activity-kind">ANEXOS DO PERFIL</span><small>${attachments.length} arquivo(s)</small></header><ul>${attachments.map((item, index) => `<li><a href="${esc(item.dataUrl)}" download="${esc(item.name)}">${ico("paperclip")} ${esc(item.name)}</a><button type="button" data-broker-attachment-remove="${index}" aria-label="Remover ${esc(item.name)}">×</button></li>`).join("") || '<li class="empty-data">Nenhum anexo de perfil.</li>'}</ul><label class="no-print">${ico("plus")} Adicionar anexo<input type="file" data-broker-attachment multiple accept="application/pdf,image/jpeg,image/png,image/webp"></label><small class="no-print">PDF ou imagem · até 2 MB por arquivo</small></aside></header><div class="broker-print-period-v2 no-print"><fieldset><legend>Competência da comissão</legend><label><input type="radio" name="brokerPrintMode" value="monthly" ${mode === "monthly" ? "checked" : ""}> Mensal</label><label><input type="radio" name="brokerPrintMode" value="annual" ${mode === "annual" ? "checked" : ""}> Anual</label></fieldset><label>Mês<input type="month" data-broker-print-month value="${esc(month)}" ${mode === "annual" ? "disabled" : ""}></label><label>Ano<input type="number" min="2000" max="2100" data-broker-print-year value="${esc(year)}" ${mode === "monthly" ? "disabled" : ""}></label></div><div class="broker-print-heading-v2"><span>RELATÓRIO DE COMISSÕES · ${esc(periodLabel)}</span><small>${rows.length} lançamento(s) com data na competência</small></div><div class="commission-profile-summary"><div><small>Valor da carteira</small><b>${formatBRL(sum("numberValue"))}</b></div><div><small>Comissão</small><b>${formatBRL(sum("numberCommission"))}</b></div><div><small>Repasse</small><b>${formatBRL(sum("warley"))} / ${formatBRL(sum("partner"))}</b><span>Warley / contraparte</span></div></div><section class="commission-deal-section broker-profile-ledger"><header><div><span class="activity-kind">LANÇAMENTOS DA COMPETÊNCIA</span><h2>Negócios e comissões</h2></div><small>Registros sem data ficam fora dos totais mensal e anual.</small></header><div class="control-table-wrap"><table class="commission-ledger-table"><thead><tr><th>Data / contrato</th><th>Lote / cliente</th><th>Razão</th><th>Venda</th><th>Comissão</th><th>Warley</th><th>Contraparte</th><th>Situação</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(row.date)}<small>${esc(row.id)}</small></td><td>${esc(row.lot)}<small>${esc(row.client)}</small></td><td>${esc(row.reason.label)}</td><td>${formatBRL(row.numberValue)}</td><td>${formatBRL(row.numberCommission)}</td><td>${formatBRL(row.warley)}</td><td>${formatBRL(row.partner)}</td><td>${esc(row.status || row.stage || "—")}</td></tr>`).join("") || '<tr><td colspan="8">Nenhuma comissão nesta competência.</td></tr>'}</tbody><tfoot><tr><th colspan="3">TOTAL · ${esc(periodLabel)}</th><th>${formatBRL(sum("numberValue"))}</th><th>${formatBRL(sum("numberCommission"))}</th><th>${formatBRL(sum("warley"))}</th><th>${formatBRL(sum("partner"))}</th><th>${rows.length} negócio(s)</th></tr></tfoot></table></div></section><section class="broker-profile-deals no-print"><h2>Negociações do corretor</h2><div class="commission-deal-grid">${all.map((row) => `<button type="button" class="commission-deal-card" data-commission-contract="${esc(row.id)}"><b>${esc(row.lot)}</b><span>${esc(row.client)}</span><small>${esc(row.date || "Sem data")}</small></button>`).join("")}</div></section></section>`;
  };

  const previousBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = previousBind.apply(this, args);
    const page = this.querySelector(".broker-profile-v2");
    if (!page || page.dataset.brokerV2Bound) return result;
    page.dataset.brokerV2Bound = "1";
    page.querySelector("[data-broker-apply-rules]")?.addEventListener("click", () => {
      const appliedAt = new Date().toISOString();
      appStore.set({
        commissionRulesAppliedAt: appliedAt,
        lastAction: "Aplicou regras de repasse na carteira dedicada",
      });
      notify("Regras atuais aplicadas à tabela da carteira.", "success");
    });
    page.querySelectorAll('[name="brokerPrintMode"]').forEach((input) => input.addEventListener("change", () => { appStore.set({ brokerPrintMode: input.value }); this.render(); }));
    page.querySelector("[data-broker-print-month]")?.addEventListener("change", (event) => { appStore.set({ brokerPrintMonth: event.target.value }); this.render(); });
    page.querySelector("[data-broker-print-year]")?.addEventListener("change", (event) => { appStore.set({ brokerPrintYear: event.target.value }); this.render(); });
    page.querySelector("[data-broker-print-v2]")?.addEventListener("click", () => windowRef.print());
    page.querySelector("[data-broker-attachment]")?.addEventListener("change", async (event) => {
      const files = [...(event.target.files || [])];
      const stored = Object.values(readAttachments()).flat();
      if (files.some((file) => file.size > 2 * 1024 * 1024 || !/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type)) || stored.reduce((sum, item) => sum + Number(item.size || 0), 0) + files.reduce((sum, file) => sum + file.size, 0) > 2 * 1024 * 1024) {
        notify("Use PDF ou imagem; limite de 2 MB para os anexos de perfil nesta sessão.", "warning");
        event.target.value = "";
        return;
      }
      const id = page.dataset.brokerId;
      const added = await Promise.all(files.map(async (file) => ({ name: file.name, type: file.type, size: file.size, dataUrl: await fileToDataUrl(file) })));
      const current = readAttachments();
      try {
        storage.setItem(BROKER_PROFILE_ATTACHMENT_KEY_V2, JSON.stringify({ ...current, [id]: [...(current[id] || []), ...added] }));
        this.render();
      } catch { notify("Não foi possível salvar os anexos neste dispositivo. Libere espaço local.", "warning"); }
    });
    page.querySelectorAll("[data-broker-attachment-remove]").forEach((button) => button.addEventListener("click", () => {
      const id = page.dataset.brokerId, index = Number(button.dataset.brokerAttachmentRemove);
      const current = readAttachments();
      try {
        storage.setItem(BROKER_PROFILE_ATTACHMENT_KEY_V2, JSON.stringify({ ...current, [id]: (current[id] || []).filter((_, i) => i !== index) }));
        this.render();
      } catch { notify("Não foi possível atualizar os anexos neste dispositivo.", "warning"); }
    }));
    return result;
  };
  return ViewLayer;
};
