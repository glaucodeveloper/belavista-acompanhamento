/** Lot detail interactions and the original delegated form-submit fallback. */
import { openLotCashEntryV1 } from "./lot-cash-entry-v1.mjs";
export const installLotDetailEventsV1 = (ViewLayer, {
  REPASSE_PRICE_CATALOG,
  apiFetch,
  appStore,
  commissionProfiles,
  downloadBrandedLotExcelV1,
  formatBRL,
  lotExportRowV1,
  notify,
  operationalHeaders,
  prepareAssistantLotStatusPromptV1,
}) => {
  const lotDetailBindBaseV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = lotDetailBindBaseV1.apply(this, args), root = this.querySelector("[data-lot-detail-page]");
    if (!root) return result;
  
    const lotKey = String(root.dataset.lotKey || ""), lot = REPASSE_PRICE_CATALOG.find((item) => String(item.label) === lotKey);
    if (!lot) return result;
    root.querySelector("[data-lot-cash-entry]")?.addEventListener("click", () =>
      openLotCashEntryV1(appStore, lotKey, "lot-detail"));
    // A ficha é recomposta a cada alteração. Reinstale os handlers na árvore
    // nova para que planos, documentos e controles continuem utilizáveis no
    // mesmo fluxo, sem uma navegação intermediária.
    const saveLotDetail = (patch) => { appStore.set(patch); this.render(); this.bind(); };
    const appendHistory = (state, event) => ({
      ...(state.lotHistory || {}),
      [lotKey]: [...(state.lotHistory?.[lotKey] || []), { id: `LOT-${Date.now()}-${Math.random().toString(16).slice(2)}`, at: new Date().toISOString(), ...event }],
    });
    root.querySelector("[data-lot-detail-print]")?.addEventListener("click", () => {
      const cleanPrint = () => document.body.classList.remove("lot-detail-print-mode");
      document.body.classList.add("lot-detail-print-mode");
      window.addEventListener("afterprint", cleanPrint, { once: true });
      window.print();
    });
    root.querySelector("[data-lot-detail-excel]")?.addEventListener("click", () => {
      downloadBrandedLotExcelV1({ lots: [lotExportRowV1(lot, appStore.get())], title: `Ficha do lote ${lotKey}`, subtitle: "Cadastro comercial, pagamento e acompanhamento", filename: `alianca-park-ficha-${lotKey.toLowerCase()}` });
      notify?.(`Ficha do lote ${lotKey} exportada em Excel.`, "success");
    });
    const selectedMap = root.querySelector("[data-lot-detail-map]");
    if (selectedMap) {
      const installLotMap = () => {
        selectedMap.installAdminMasterplanOverlayV1?.();
        selectedMap.installSatelliteLotPlanOverlayV1?.({ markers: true, outlines: false });
      };
      requestAnimationFrame(installLotMap);
      selectedMap.closest("details")?.addEventListener("toggle", () => {
        if (selectedMap.closest("details")?.open) requestAnimationFrame(installLotMap);
      });
      const selectMarker = () => {
        const marker = [...selectedMap.querySelectorAll(".satellite-lot-plan-marker")]
          .find((node) => Number(String(node.dataset.lot || "").match(/\d+/g)?.at(-1)) === Number(lot.lot));
        if (!marker) return false;
        selectedMap.querySelectorAll(".satellite-lot-plan-marker.is-selected").forEach((node) => node.classList.remove("is-selected"));
        marker.classList.add("is-selected");
        selectedMap.dataset.selectedLot = marker.dataset.lot || lotKey;
        return true;
      };
      if (!selectMarker()) {
        const observer = new MutationObserver(() => { if (selectMarker()) observer.disconnect(); });
        observer.observe(selectedMap, { childList: true, subtree: true });
      }
      selectedMap.addEventListener("belavista:lot-marker-selected", (event) => {
        const lotNumber = Number(String(event.detail?.lotId || "").match(/\d+/g)?.at(-1));
        const target = REPASSE_PRICE_CATALOG.find((item) => item.quadra === lot.quadra && Number(item.lot) === lotNumber)
          || REPASSE_PRICE_CATALOG.find((item) => Number(item.lot) === lotNumber);
        prepareAssistantLotStatusPromptV1(target?.label || event.detail?.label || event.detail?.lotId);
        if (target) appStore.set({ view: "lot-detail", selectedLotDetailKey: target.label, lastAction: `Abriu a ficha do lote ${target.label} pelo mapa` });
      });
    }
  
    root.querySelector("[data-lot-detail-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget)), state = appStore.get(), seller = commissionProfiles.find((person) => person.id === values.sellerId), partner = (state.repassePartners || commissionProfiles).find((person) => person.id === values.repassePartnerId), existing = state.lotStatuses?.[lotKey] || {};
      const lotStatus = {
        ...existing,
        status: values.status,
        sellerId: values.sellerId,
        sellerName: seller?.name || "",
        client: String(values.client || "").trim(),
        repasse: { partnerId: values.repassePartnerId, partnerName: partner?.name || "" },
        payment: { status: values.paymentStatus, amount: Math.max(0, Number(values.paymentAmount) || 0), date: values.paymentDate || "" },
        note: String(values.note || "").trim(),
        updatedAt: new Date().toISOString(),
      };
      saveLotDetail({
        lotStatuses: { ...(state.lotStatuses || {}), [lotKey]: lotStatus },
        lotHistory: appendHistory(state, { type: "Ficha comercial salva", detail: `${lotStatus.status} · ${lotStatus.payment.status}` }),
        lastAction: `Salvou a ficha do lote ${lotKey}`,
      });
      notify?.(`Ficha do lote ${lotKey} atualizada.`, "success");
    });
  
    const planForm = root.querySelector("[data-lot-plan-form]"), planCancel = root.querySelector("[data-lot-plan-cancel]");
    const resetPlan = () => { planForm?.reset(); if (planForm?.elements.id) planForm.elements.id.value = ""; if (planCancel) planCancel.hidden = true; const submit = planForm?.querySelector('[type="submit"]'); if (submit) submit.textContent = "Adicionar parcela"; };
    planCancel?.addEventListener("click", resetPlan);
    planForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(planForm)), amount = Math.max(0, Number(values.amount) || 0);
      if (!amount) return;
      const state = appStore.get(), current = [...(state.lotPaymentPlans?.[lotKey] || [])], isEdit = Boolean(values.id), plan = { id: values.id || `PLAN-${Date.now()}`, description: String(values.description || "Parcela").trim(), dueDate: values.dueDate || "", amount, status: values.status || "Pendente", updatedAt: new Date().toISOString() };
      const next = isEdit ? current.map((item) => item.id === plan.id ? plan : item) : [...current, plan];
      saveLotDetail({ lotPaymentPlans: { ...(state.lotPaymentPlans || {}), [lotKey]: next }, lotHistory: appendHistory(state, { type: isEdit ? "Parcela atualizada" : "Parcela adicionada", detail: `${plan.description} · ${formatBRL(plan.amount)}` }), lastAction: `${isEdit ? "Editou" : "Adicionou"} parcela em ${lotKey}` });
    });
    root.querySelectorAll("[data-lot-plan-edit]").forEach((button) => button.addEventListener("click", () => {
      const plan = (appStore.get().lotPaymentPlans?.[lotKey] || []).find((item) => item.id === button.dataset.lotPlanEdit);
      if (!plan || !planForm) return;
      Object.entries(plan).forEach(([key, value]) => { if (planForm.elements[key]) planForm.elements[key].value = value ?? ""; });
      if (planCancel) planCancel.hidden = false;
      const submit = planForm.querySelector('[type="submit"]'); if (submit) submit.textContent = "Salvar parcela";
      planForm.scrollIntoView({ block: "center", behavior: "smooth" });
    }));
    root.querySelectorAll("[data-lot-plan-delete]").forEach((button) => button.addEventListener("click", () => {
      const state = appStore.get(), current = state.lotPaymentPlans?.[lotKey] || [], plan = current.find((item) => item.id === button.dataset.lotPlanDelete);
      if (!plan || !confirm(`Excluir a parcela “${plan.description}”?`)) return;
      saveLotDetail({ lotPaymentPlans: { ...(state.lotPaymentPlans || {}), [lotKey]: current.filter((item) => item.id !== plan.id) }, lotHistory: appendHistory(state, { type: "Parcela removida", detail: plan.description }), lastAction: `Removeu parcela de ${lotKey}` });
    }));
  
    const documentForm = root.querySelector("[data-lot-document-form]"), documentCancel = root.querySelector("[data-lot-document-cancel]"), documentUploadStatus = root.querySelector("[data-lot-document-upload-status]");
    const resetDocument = () => {
      documentForm?.reset();
      if (documentForm?.elements.id) documentForm.elements.id.value = "";
      if (documentForm?.elements.file) documentForm.elements.file.required = true;
      if (documentCancel) documentCancel.hidden = true;
      if (documentUploadStatus) documentUploadStatus.textContent = "PDF ou imagem de até 6 MB.";
      const submit = documentForm?.querySelector('[type="submit"]');
      if (submit) submit.textContent = "Enviar e associar";
    };
    documentCancel?.addEventListener("click", resetDocument);
    documentForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(documentForm), values = Object.fromEntries(formData), state = appStore.get(), current = [...(state.lotDocuments?.[lotKey] || [])], isEdit = Boolean(values.id), existing = current.find((item) => item.id === values.id), file = documentForm.elements.file?.files?.[0] || null;
      if (!file && !existing) { if (documentUploadStatus) documentUploadStatus.textContent = "Selecione um PDF ou uma imagem para enviar."; return; }
      const submit = documentForm.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      if (documentUploadStatus) documentUploadStatus.textContent = file ? `Enviando ${file.name} ao repositório…` : "Mantendo arquivo já enviado.";
      let uploaded = existing || {};
      try {
        if (file) {
          if (file.size > 6 * 1024 * 1024) throw new Error("O arquivo excede o limite de 6 MB.");
          const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Não foi possível ler o arquivo.")); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); });
          const response = await apiFetch("/api/lot-documents/upload", { method: "POST", headers: operationalHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ lotKey, fileName: file.name, contentType: file.type, dataUrl }) });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || `Falha no upload (HTTP ${response.status}).`);
          uploaded = payload.document || {};
        }
        const document = { id: values.id || uploaded.id || `DOC-${Date.now()}`, title: String(values.title || "Documento").trim(), kind: String(values.kind || "Documento").trim(), note: String(values.note || "").trim(), url: String(uploaded.url || existing?.url || "").trim(), fileName: uploaded.fileName || existing?.fileName || "", contentType: uploaded.contentType || existing?.contentType || "", githubPath: uploaded.path || existing?.githubPath || "", githubSha: uploaded.sha || existing?.githubSha || "", githubCommitSha: uploaded.commitSha || existing?.githubCommitSha || "", updatedAt: new Date().toISOString() };
        const next = isEdit ? current.map((item) => item.id === document.id ? document : item) : [...current, document];
        saveLotDetail({ lotDocuments: { ...(state.lotDocuments || {}), [lotKey]: next }, lotHistory: appendHistory(state, { type: isEdit ? "Documento atualizado" : "Documento associado", detail: document.title }), lastAction: `${isEdit ? "Editou" : "Associou"} documento em ${lotKey}` });
        resetDocument();
        if (documentUploadStatus) documentUploadStatus.textContent = "Arquivo salvo no repositório GitHub e vinculado ao lote.";
      } catch (error) {
        if (documentUploadStatus) documentUploadStatus.textContent = error.message || "Não foi possível enviar o arquivo.";
      } finally { if (submit) submit.disabled = false; }
    });
    root.querySelectorAll("[data-lot-document-edit]").forEach((button) => button.addEventListener("click", () => {
      const document = (appStore.get().lotDocuments?.[lotKey] || []).find((item) => item.id === button.dataset.lotDocumentEdit);
      if (!document || !documentForm) return;
      Object.entries(document).forEach(([key, value]) => { if (documentForm.elements[key]) documentForm.elements[key].value = value ?? ""; });
      if (documentForm.elements.file) documentForm.elements.file.required = false;
      if (documentCancel) documentCancel.hidden = false;
      if (documentUploadStatus) documentUploadStatus.textContent = "Selecione outro arquivo somente para substituí-lo no repositório.";
      const submit = documentForm.querySelector('[type="submit"]'); if (submit) submit.textContent = "Salvar documento";
      documentForm.scrollIntoView({ block: "center", behavior: "smooth" });
    }));
    root.querySelectorAll("[data-lot-document-delete]").forEach((button) => button.addEventListener("click", () => {
      const state = appStore.get(), current = state.lotDocuments?.[lotKey] || [], document = current.find((item) => item.id === button.dataset.lotDocumentDelete);
      if (!document || !confirm(`Excluir o documento “${document.title}”?`)) return;
      saveLotDetail({ lotDocuments: { ...(state.lotDocuments || {}), [lotKey]: current.filter((item) => item.id !== document.id) }, lotHistory: appendHistory(state, { type: "Documento removido", detail: document.title }), lastAction: `Removeu documento de ${lotKey}` });
    }));
    return result;
  };
  
  
  // Fallback delegado para a ficha comercial. Algumas extensões recompõem a
  // árvore da ficha enquanto o mapa é inicializado; neste intervalo o listener
  // local do formulário pode ainda não ter sido instalado. O delegado mantém o
  // upload como uma ação de interface, sem permitir o submit HTML/navegação.
  if (!globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__) {
    globalThis.__BELAVISTA_LOT_DOCUMENT_SUBMIT_FALLBACK_V1__ = true;
    document.addEventListener("submit", async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches("[data-lot-document-form],[data-lot-plan-form]") || event.defaultPrevented) return;
      const page = form.closest("[data-lot-detail-page]"), lotKey = String(page?.dataset.lotKey || "").trim();
      if (form.matches("[data-lot-plan-form]")) {
        if (!lotKey) return;
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const plan = {
          id: String(values.id || `PLAN-${Date.now()}`), description: String(values.description || "Parcela").trim(),
          dueDate: String(values.dueDate || ""), amount: Number(String(values.amount || 0).replace(",", ".")) || 0,
          status: String(values.status || "Pendente"), updatedAt: new Date().toISOString(),
        };
        appStore.update((current) => ({
          ...current,
          lotPaymentPlans: { ...(current.lotPaymentPlans || {}), [lotKey]: [...(current.lotPaymentPlans?.[lotKey] || []).filter((item) => String(item.id) !== plan.id), plan] },
          lastAction: `Registrou parcela em ${lotKey}`,
        }));
        return;
      }
      const file = form.elements.file?.files?.[0];
      if (!lotKey || !file) return;
      event.preventDefault();
      const status = form.querySelector("[data-lot-document-upload-status]"), submit = form.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      if (status) status.textContent = `Enviando ${file.name} ao repositório…`;
      try {
        if (file.size > 6 * 1024 * 1024) throw new Error("O arquivo excede o limite de 6 MB.");
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
          reader.onload = () => resolve(reader.result); reader.readAsDataURL(file);
        });
        const response = await apiFetch("/api/lot-documents/upload", {
          method: "POST", headers: operationalHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ lotKey, fileName: file.name, contentType: file.type, dataUrl }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Falha no upload (HTTP ${response.status}).`);
        const uploaded = payload.document || {}, values = Object.fromEntries(new FormData(form));
        const document = {
          id: uploaded.id || `DOC-${Date.now()}`, title: String(values.title || "Documento").trim(),
          kind: String(values.kind || "Documento").trim(), note: String(values.note || "").trim(),
          url: String(uploaded.url || "").trim(), fileName: uploaded.fileName || file.name,
          contentType: uploaded.contentType || file.type, githubPath: uploaded.path || "",
          githubSha: uploaded.sha || "", githubCommitSha: uploaded.commitSha || "", updatedAt: new Date().toISOString(),
        };
        appStore.update((current) => ({
          ...current,
          lotDocuments: { ...(current.lotDocuments || {}), [lotKey]: [...(current.lotDocuments?.[lotKey] || []), document] },
          lastAction: `Associou documento em ${lotKey}`,
        }));
      } catch (error) {
        if (status) status.textContent = error?.message || "Não foi possível enviar o arquivo.";
      } finally { if (submit) submit.disabled = false; }
    });
  }
};

