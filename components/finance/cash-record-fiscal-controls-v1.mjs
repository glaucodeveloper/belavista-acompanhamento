/** Adds fiscal fields and owner-only cash-entry shortcuts to the cash workspace. */
export const installCashRecordFiscalControlsV1 = (
  ViewLayer,
  {
    appStore,
    document: documentRef = globalThis.document,
    mountRecordDropinV1 = () => {},
  } = {},
) => {
  if (!ViewLayer?.prototype || !appStore?.get || !appStore?.set)
    throw new TypeError("Cash fiscal controls require the view layer and application store.");

  const cashRecordBeforeFiscalV1 = ViewLayer.prototype["cash-record"];
  ViewLayer.prototype["cash-record"] = function (...args) {
    const html = cashRecordBeforeFiscalV1.apply(this, args);
    return html.replace(/<label class="cash-record-attachment">/, `<section class="cash-fiscal-control-v1"><header><span class="activity-kind">CONTROLE FISCAL</span><h2>Documento do lançamento</h2><p>Preencha os dados disponíveis. O anexo não altera o estado de conferência sozinho.</p></header><div><label>Tipo de documento<select name="fiscalDocumentType"><option value="">Não informado</option><option value="nota_fiscal">Nota fiscal</option><option value="recibo">Recibo</option><option value="contrato">Contrato</option><option value="outro">Outro</option></select></label><label>Número do documento<input name="fiscalDocumentNumber" maxlength="80" placeholder="Número ou referência"></label><label>Emitente<input name="fiscalIssuer" maxlength="160" placeholder="Nome ou razão social"></label><label>Data de emissão<input name="fiscalIssueDate" type="date"></label><label>Conferência<select name="fiscalStatus"><option value="pendente">Pendente</option><option value="em_conferencia">Em conferência</option><option value="conferido">Conferido</option><option value="nao_aplicavel">Não aplicável</option></select></label></div><small>“Conferido” exige tipo, número, emitente, data e documento anexado; não substitui análise contábil.</small></section><label class="cash-record-attachment">`);
  };

  const renderBeforeFiscalCashV1 = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderBeforeFiscalCashV1.apply(this, args);
    const actor = appStore.get().currentActor || { role: "owner" };
    if (actor.role === "owner") {
      const targets = [
        [this.querySelector(".control-general-event > header"), "Geral"],
        [this.querySelector("[data-control-stage-inline-record] > header"), this.querySelector("[data-control-stage-inline-record]")?.dataset.controlStageInlineRecordName || "Geral"],
      ];
      targets.forEach(([header, stageName]) => {
        if (!header || header.querySelector("[data-quick-cash-entry]")) return;
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = "record-quick-cash-v1";
        button.dataset.quickCashEntry = stageName;
        button.textContent = "＋ Nova entrada de caixa";
        button.addEventListener("click", () => appStore.set({
          view: "cash-record", cashRecordReturnView: "control",
          cashRecordDraft: { kind: "entrada", stage: stageName },
          lastAction: "Abriu entrada de caixa com controle fiscal",
        }));
        header.append(button);
      });
    }
    const cashForm = this.querySelector("[data-cash-record-form]");
    if (cashForm) {
      const draft = appStore.get().cashRecordDraft || {};
      if (draft.kind) cashForm.elements.kind.value = draft.kind;
      if (draft.stage) cashForm.elements.stage.value = draft.stage;
      mountRecordDropinV1(cashForm, cashForm.elements.attachment, "cash");
    }
    return result;
  };
};
