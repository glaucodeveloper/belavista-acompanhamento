/** Event binding for the legacy Control workspace (cash and broker ledgers). */
export const createControlPageEventsV8 = ({
  appStore,
  apiFetch,
  operationalHeaders,
  apiUrl,
  ico,
  esc,
  notify,
}) => function () {
  this.querySelectorAll("[data-cash-record-open]").forEach((button) => {
    if (button.dataset.cashRecordBound) return;
    button.dataset.cashRecordBound = "1";
    button.addEventListener("click", () => {
      appStore.set({
        view: "cash-record",
        cashRecordReturnView: button.dataset.returnView || "finance",
        cashRecordDraft: null,
        activityDedicated: false,
        selectedActivity: null,
        lastAction: "Abriu novo registro de caixa",
      });
    });
  });
  this.querySelectorAll("[data-cash-record-back]").forEach((button) => {
    if (button.dataset.cashRecordBackBound) return;
    button.dataset.cashRecordBackBound = "1";
    button.addEventListener("click", () => {
      appStore.set({
        view: button.dataset.returnView || "finance",
        cashRecordReturnView: null,
        cashRecordDraft: null,
        activityDedicated: false,
        selectedActivity: null,
        lastAction: "Voltou para o caixa",
      });
    });
  });
  const root = this.querySelector(".control-page");
  if (!root || root.dataset.controlBound) return;
  root.dataset.controlBound = "1";
  const cashRecordForm = this.querySelector("[data-cash-record-form]");
  if (cashRecordForm) {
    cashRecordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = cashRecordForm.querySelector("[data-cash-record-status]"),
        button = cashRecordForm.querySelector('button[type="submit"]'),
        data = Object.fromEntries(new FormData(cashRecordForm)),
        amountCents =
          Math.round(
            Number(
              String(data.amount || "")
                .replace(/\./g, "")
                .replace(",", ".")
                .replace(/[^\d.]/g, ""),
            ) * 100,
          ) || 0,
        file = cashRecordForm.querySelector('input[name="attachment"]')
          ?.files?.[0];
      if (!data.name?.trim()) {
        status.textContent = "Informe o nome do registro.";
        return;
      }
      if (!amountCents) {
        status.textContent = "Informe um valor maior que zero.";
        return;
      }
      if (file && file.size > 6 * 1024 * 1024) {
        status.textContent = "O anexo deve ter no máximo 6 MB.";
        return;
      }
      if (data.fiscalStatus === "conferido" && (!data.fiscalDocumentType || !String(data.fiscalDocumentNumber || "").trim() || !String(data.fiscalIssuer || "").trim() || !data.fiscalIssueDate || !file)) {
        status.textContent = "Para marcar como conferido, informe tipo, número, emitente, data e anexe o documento fiscal.";
        return;
      }
      button.disabled = true;
      status.textContent = "Salvando registro…";
      try {
        let attachment = null;
        if (file) {
          attachment = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                dataUrl: String(reader.result || ""),
              });
            reader.onerror = () => reject(new Error("Falha ao ler o anexo."));
            reader.readAsDataURL(file);
          });
        }
        const response = await apiFetch("/api/cash-flow", {
            method: "POST",
            headers: operationalHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              kind: data.kind,
              lotKey: data.lotKey || "",
              date: data.date,
              category: data.name,
              stage: data.stage || "Geral",
              description: data.description,
              amountCents,
              attachment,
              fiscalDocumentType: data.fiscalDocumentType || "",
              fiscalDocumentNumber: String(data.fiscalDocumentNumber || "").trim(),
              fiscalIssuer: String(data.fiscalIssuer || "").trim(),
              fiscalIssueDate: data.fiscalIssueDate || "",
              fiscalStatus: data.fiscalStatus || "pendente",
            }),
          }),
          payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || `HTTP ${response.status}`);
        appStore.set({
          view: appStore.get().cashRecordReturnView || "finance",
          cashRecordReturnView: null,
          cashRecordDraft: null,
          cashSummary: payload.summary,
          cashFlowLocal: [
            payload.entry,
            ...(appStore.get().cashFlowLocal || []),
          ],
          operationalState: payload.operational,
          lastAction: `Registrou ${data.name}`,
        });
        await this.runOperationalLoop?.("cash.changed");
        notify("Registro de caixa salvo e frentes recalculadas.", "success");
      } catch (error) {
        status.textContent =
          error.message || "Falha ao registrar o lançamento.";
        button.disabled = false;
      }
    });
  }
  root
    .querySelector("[data-v8-broker-ledger-search]")
    ?.addEventListener("input", (event) => {
      const q = event.target.value.toLowerCase();
      root
        .querySelectorAll("[data-v8-broker-ledger-row]")
        .forEach((row) => (row.hidden = !row.dataset.search.includes(q)));
    });
  root
    .querySelector("[data-v8-finance-search]")
    ?.addEventListener("input", (event) => {
      const q = event.target.value.toLowerCase();
      root
        .querySelectorAll("[data-v8-finance-row]")
        .forEach((row) => (row.hidden = !row.dataset.search.includes(q)));
    });
  const reportHost = root.querySelector("[data-v8-broker-files]");
  if (reportHost)
    apiFetch("/api/broker-reports")
      .then((response) => response.json())
      .then((payload) => {
        reportHost.innerHTML = `<span>ARQUIVOS GERADOS</span><div>${
          (payload.files || [])
            .slice(0, 12)
            .map(
              (file) =>
                `<a href="${apiUrl(file.url)}" target="_blank" rel="noopener">${ico(file.name.endsWith(".pdf") ? "file-text" : "sheet")}<b>${esc(file.name)}</b><small>${esc(file.month)}</small></a>`,
            )
            .join("") || "<p>Nenhum arquivo disponível.</p>"
        }</div>`;
        window.lucide?.createIcons();
      })
      .catch(() => {
        reportHost.innerHTML =
          "<span>ARQUIVOS GERADOS</span><p>Serviço de relatórios indisponível.</p>";
      });
  root
    .querySelector("[data-v8-broker-reports]")
    ?.addEventListener("click", () =>
      reportHost?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  root
    .querySelector("[data-broker-rule-focus]")
    ?.addEventListener("click", () =>
      root
        .querySelector(".broker-rule-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  const ruleHeaderButton = root.querySelector(
    '.broker-control-page .control-head-actions [data-view="commissions"]',
  );
  ruleHeaderButton?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      root
        .querySelector(".broker-rule-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    true,
  );
  root
    .querySelector("[data-v8-cash-entry]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        status = form.querySelector("[data-v8-cash-status]"),
        data = Object.fromEntries(new FormData(form)),
        amountCents =
          Math.round(
            Number(
              String(data.amount || "")
                .replace(/\./g, "")
                .replace(",", ".")
                .replace(/[^\d.]/g, ""),
            ) * 100,
          ) || 0;
      if (!amountCents) {
        status.textContent = "Informe um valor maior que zero.";
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      status.textContent = "Registrando e recalculando relações…";
      try {
        const response = await apiFetch("/api/cash-flow", {
            method: "POST",
            headers: operationalHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ ...data, amountCents }),
          }),
          payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || `HTTP ${response.status}`);
        appStore.set({
          cashSummary: payload.summary,
          cashFlowLocal: [
            payload.entry,
            ...(appStore.get().cashFlowLocal || []),
          ],
          operationalState: payload.operational,
          lastAction: `Dono registrou ${data.kind} de caixa`,
        });
        await this.runOperationalLoop("cash.changed");
        notify("Caixa registrado e frentes recalculadas.", "success");
      } catch (error) {
        status.textContent = error.message;
        button.disabled = false;
      }
    });
};

