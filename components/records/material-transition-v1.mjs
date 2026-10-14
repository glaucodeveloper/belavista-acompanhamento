export function installMaterialTransitionV1(ViewLayer, {
  apiFetch,
  appStore,
  controlCenterMaterialRowsV1,
  controlCenterPublishV1,
  controlCenterRecordChangeV1,
  esc,
  notify,
  operationalHeaders,
}) {
  // O card de material abre uma transição auditável, não a edição silenciosa da
  // célula. A API confirma registro, comprovantes e recálculo antes do estado UI.
  const materialsBeforeTransitionV1 = ViewLayer.prototype.materials;
  ViewLayer.prototype.materials = function (...args) {
    const html = materialsBeforeTransitionV1.apply(this, args);
    const state = appStore.get();
    const material = controlCenterMaterialRowsV1(state).find((item) => item.id === state.materialTransitionId);
    if (!material) return html;
    const isDraftMaterialV1 = material.materialDraftV1 === true;
    const statuses = [...new Set([material.status, "Planejado", "Em andamento", "Atenção", "Concluído", "Dimensionar"].filter(Boolean))];
    const updated = material.updatedAt ? new Date(material.updatedAt).toLocaleString("pt-BR") : "Estado inicial do catálogo";
    const modal = `<dialog class="material-transition-dialog-v1" data-material-transition-dialog aria-label="${isDraftMaterialV1 ? "Cadastrar novo material" : `Alterar estado do material ${esc(material.name)}`}"><header><div><small>REGISTRO ADITIVO · MATERIAL ${esc(material.id)}</small><h2>${isDraftMaterialV1 ? "Novo material" : esc(material.name)}</h2><p>${esc(material.stageName)} · ${esc(material.activityName || "Atividade principal")}</p></div><button type="button" data-material-transition-close aria-label="Fechar">×</button></header><div class="material-transition-body-v1"><section class="material-transition-before-v1"><span>${isDraftMaterialV1 ? "NOVO MATERIAL" : "ESTADO ANTERIOR"}</span><strong>${isDraftMaterialV1 ? "Ainda sem cadastro" : `${material.quantity == null ? "A dimensionar" : esc(material.quantity)} ${esc(material.unit || "un.")}`}</strong><b>${esc(material.status || "Planejado")}</b><p>${isDraftMaterialV1 ? "Card vazio criado a partir da etapa. Preencha o estado inicial ao lado." : esc(material.scope || "Sem descrição anterior registrada.")}</p><small>${isDraftMaterialV1 ? "Rascunho ainda não confirmado" : `Última alteração: ${esc(updated)}`}</small><div class="material-transition-history-v1" data-material-transition-history>${isDraftMaterialV1 ? "Nenhum histórico: este material ainda é um rascunho." : "Carregando registros e comprovantes associados…"}</div></section><div class="material-transition-arrow-v1" aria-hidden="true">→</div><form data-material-transition-form data-material-transition-draft-v1="${isDraftMaterialV1 ? "true" : "false"}"><span>${isDraftMaterialV1 ? "EDIÇÃO INICIAL" : "NOVO ESTADO"} · ${esc(material.id)}</span>${isDraftMaterialV1 ? `<label>Nome do material<input name="name" value="" required maxlength="120" autocomplete="off" autofocus placeholder="Ex.: Tubo PEAD 60 mm"></label>` : ""}<label>Número do material associado<input name="materialNumber" value="${esc(material.id)}" required maxlength="80"></label><div class="material-transition-pair-v1"><label>Quantidade / unidades<input name="quantity" type="number" min="0" step="any" value="${material.quantity == null ? "" : esc(material.quantity)}" required></label><label>Unidade<input name="unit" value="${esc(material.unit || "un.")}" required maxlength="20"></label></div><label>Situação<select name="status">${statuses.map((value) => `<option ${value === material.status ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label><label>Descrição escrita da mudança<textarea name="description" required rows="4" maxlength="4000" placeholder="Descreva o que mudou e por quê."></textarea></label><div class="material-transition-proof-v1"><b>Adicionar comprovantes</b><label>Número do documento<input name="documentNumber" maxlength="80" placeholder="NF, recibo ou referência"></label><label>Descrição do documento<input name="documentDescription" maxlength="1000" placeholder="O que este comprovante demonstra"></label><label>Arquivos PDF ou imagem<input name="documents" type="file" accept=".pdf,image/jpeg,image/png,image/webp" multiple></label><small>Até 3 arquivos de 6 MB cada. Os comprovantes ficam associados ao registro.</small></div><div role="status" data-material-transition-status>Ao salvar, o registro e o cronograma serão atualizados.</div><footer><button type="button" data-material-transition-close>Cancelar</button><button type="submit" class="toolbar-primary">Confirmar novo estado e gerar cronograma</button></footer></form></div></dialog>`;
    const end = html.lastIndexOf("</section>");
    return end < 0 ? html + modal : html.slice(0, end) + modal + html.slice(end);
  };
  
  const bindBeforeMaterialTransitionV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeMaterialTransitionV1.apply(this, args);
    const root = this.querySelector("[data-materials-page]");
    if (!root) return result;
    const draftSlotCardV2 = root.querySelector('[data-material-draft-v1="true"]');
    if (draftSlotCardV2) {
      const animatedDraftsV2 =
        (globalThis.__belavistaMaterialDraftSlotAnimatedV2 ||= new Set()),
        draftIdV2 = draftSlotCardV2.dataset.materialLinkCard;
      if (draftIdV2 && !animatedDraftsV2.has(draftIdV2)) {
        animatedDraftsV2.add(draftIdV2);
        const targetHeightV2 = Math.max(1, draftSlotCardV2.getBoundingClientRect().height);
        draftSlotCardV2.animate(
          [
            {
              height: "0px",
              minHeight: "0px",
              opacity: 0,
              transform: "translateY(-8px)",
              overflow: "hidden",
            },
            {
              height: `${targetHeightV2}px`,
              opacity: 1,
              transform: "translateY(0)",
              overflow: "hidden",
            },
          ],
          { duration: 180, easing: "cubic-bezier(.22,.61,.36,1)" },
        );
        requestAnimationFrame(() =>
          draftSlotCardV2.scrollIntoView({ behavior: "smooth", block: "nearest" }),
        );
      }
    }
    root.querySelectorAll("[data-material-link-card]").forEach((card) => {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-expanded", "false");
      card.setAttribute("aria-label", `Abrir estado e comprovantes de ${card.querySelector("b")?.textContent || "material"}`);
      const open = () => appStore.set({materialTransitionId:card.dataset.materialLinkCard,materialsEditId:null,lastAction:"Abriu controle de unidades do material"});
      card.addEventListener("click", (event) => {if (!event.target.closest("[data-material-link-start],[data-material-unlink-stage]")) open();});
      card.addEventListener("keydown", (event) => {if (["Enter", " "].includes(event.key) && !event.target.closest("button")) {event.preventDefault();open();}});
    });
    root.querySelectorAll("[data-material-unlink-stage]").forEach((button) => {
      if (button.dataset.materialUnlinkBoundV1 === "true") return;
      button.dataset.materialUnlinkBoundV1 = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = button.dataset.materialUnlinkStage,
          material = controlCenterMaterialRowsV1(appStore.get()).find((item) => item.id === id);
        if (!material || !material.stageKey || material.materialDraftV1 === true) return;
        const previousStage = {
          key: material.stageKey,
          name: material.stageName || material.stageKey,
          activityName: material.activityName || "Atividade principal",
        };
        if (!confirm(`Remover ${material.name} da etapa ${previousStage.name}? O material continuará no catálogo e a IA receberá a alteração.`)) return;
        const updatedAt = new Date().toISOString(),
          detachedMaterial = {
            ...material,
            stageKey: "",
            stageName: "",
            activityName: "",
            updatedAt,
          };
        appStore.update((current) => ({
          ...current,
          materialCatalogAdditions: (current.materialCatalogAdditions || []).map((item) =>
            item.id === id
              ? { ...item, stageKey: "", stageName: "", activityName: "", updatedAt }
              : item,
          ),
          controlMaterialOverrides: {
            ...(current.controlMaterialOverrides || {}),
            [id]: {
              ...(current.controlMaterialOverrides || {})[id],
              stageKey: "",
              stageName: "",
              activityName: "",
              updatedAt,
            },
          },
          materialTransitionId:
            current.materialTransitionId === id ? null : current.materialTransitionId,
          lastAction: `Removeu ${material.name} da etapa ${previousStage.name}`,
        }));
        const entry = controlCenterRecordChangeV1(
          "Material removido da etapa",
          `${material.name} · ${previousStage.name} → sem etapa`,
          {
            entity: "material",
            entityId: id,
            stageKey: previousStage.key,
          },
        );
        controlCenterPublishV1("control.material.unlinked", "material", id, {
          material: detachedMaterial,
          previousStage,
          aiReason: "material.changed",
          changeId: entry.id,
        });
        const materialLoop = this.runOperationalLoop?.("material.changed", {
          quiet: true,
        });
        materialLoop?.catch?.(() => {});
        notify(
          `${material.name} removido de ${previousStage.name}; alteração propagada para a IA.`,
          "success",
        );
      });
    });
    const dialog = root.querySelector("[data-material-transition-dialog]");
    if (!dialog) return result;
    const material = controlCenterMaterialRowsV1(appStore.get()).find((item) => item.id === appStore.get().materialTransitionId);
    if (!material) return result;
    const isDraftMaterialV1 = material.materialDraftV1 === true;
    const activeCard=[...root.querySelectorAll("[data-material-link-card]")].find((card)=>card.dataset.materialLinkCard===material.id);
    if(activeCard){activeCard.classList.add("material-link-card-expanded-v1");activeCard.setAttribute("aria-expanded","true");activeCard.insertAdjacentHTML("beforeend",`<div class="material-link-card-expanded-note-v1">${esc(material.quantity==null?"A dimensionar":material.quantity)} ${esc(material.unit||"un.")} · ${esc(material.status||"Planejado")} · histórico e comprovantes abertos</div>`);}
    dialog.showModal();
    if (isDraftMaterialV1) requestAnimationFrame(() => dialog.querySelector('input[name="name"]')?.focus());
    let transitionCloseCommittedV1 = false;
    const finalizeTransitionCloseV1 = () => {
      if (transitionCloseCommittedV1) return;
      transitionCloseCommittedV1 = true;
      appStore.update((current) => {
        const next = {
          ...current,
          materialTransitionId: null,
          materialCatalogAdditions: isDraftMaterialV1
            ? (current.materialCatalogAdditions || []).filter((item) => item.id !== material.id)
            : current.materialCatalogAdditions || [],
          lastAction: isDraftMaterialV1
            ? "Descartou novo material vazio"
            : "Fechou controle do material",
        };
        if (isDraftMaterialV1) {
          const overrides = { ...(current.controlMaterialOverrides || {}) };
          delete overrides[material.id];
          next.controlMaterialOverrides = overrides;
        }
        return next;
      });
    };
    const requestTransitionCloseV1 = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (dialog.open) dialog.close("cancel");
      else finalizeTransitionCloseV1();
    };
    dialog.querySelectorAll("[data-material-transition-close]").forEach((button) =>
      button.addEventListener("click", requestTransitionCloseV1),
    );
    dialog.addEventListener("cancel", requestTransitionCloseV1, { once: true });
    dialog.addEventListener("close", finalizeTransitionCloseV1, { once: true });
    const history = dialog.querySelector("[data-material-transition-history]");
    if (!isDraftMaterialV1) apiFetch(`/api/workbench/diary?resource=material-transition&materialId=${encodeURIComponent(material.id)}&stage=${encodeURIComponent(material.stageKey||"")}`,{headers:operationalHeaders()})
      .then(async (response) => {if (!response.ok) throw new Error(`HTTP ${response.status}`);return response.json();})
      .then(({transitions=[],attachments=[]}) => {
        if (!history.isConnected) return;
        history.innerHTML = transitions.length ? `<h3>Registros anteriores</h3>${transitions.map((record) => {
          const prop = (id) => record.properties?.find((entry) => entry.id === id)?.value || "";
          let ids=[];try{ids=JSON.parse(prop("document_ids")||"[]");}catch{}
          const proofs=attachments.filter((item) => ids.includes(item.id));
          return `<article><b>${esc(record.id)} · ${esc(record.data)} ${esc(record.hora||"")}</b><span>${esc(prop("before_quantity")||"—")} → ${esc(prop("after_quantity")||"—")} ${esc(prop("after_unit"))}</span><p>${esc(prop("after_description"))}</p>${proofs.length?`<ul>${proofs.map((item)=>`<li><a href="${esc(item.fileUrl)}" target="_blank" rel="noopener">${esc(item.title||"Comprovante")} · ${esc(item.fileName)}</a><small>${esc(item.notes||"")}</small></li>`).join("")}</ul>`:"<small>Sem comprovantes.</small>"}</article>`;
        }).join("")}` : "<p>Nenhum registro anterior para este material.</p>";
      }).catch(() => {if(history.isConnected)history.textContent="Histórico indisponível no momento; o estado atual permanece visível.";});
    dialog.querySelector("[data-material-transition-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),status=form.querySelector("[data-material-transition-status]");
      const data=new FormData(form),quantity=Number(data.get("quantity")),files=[...form.elements.documents.files],
        materialName=String(data.get("name")||material.name||"").trim();
      if (!materialName){status.textContent="Informe o nome do material.";form.elements.name?.focus();return;}
      if (!Number.isFinite(quantity)||quantity<0||files.length>3||files.some((file)=>file.size>6*1024*1024||!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type))){status.textContent="Informe quantidade válida e até três arquivos PDF/JPG/PNG/WebP de 6 MB.";return;}
      button.disabled=true;status.textContent="Salvando registro, comprovantes e recalculando cronograma…";
      try{
        const documents=await Promise.all(files.map((file)=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({fileName:file.name,dataUrl:String(reader.result||""),documentNumber:String(data.get("documentNumber")||"").trim(),description:String(data.get("documentDescription")||"").trim()});reader.onerror=()=>reject(new Error(`Não foi possível ler ${file.name}.`));reader.readAsDataURL(file);})));
        const response=await apiFetch("/api/workbench/diary?resource=material-transition",{method:"POST",headers:operationalHeaders({"Content-Type":"application/json"}),body:JSON.stringify({materialId:material.id,materialNumber:String(data.get("materialNumber")||material.id).trim(),name:materialName,stageKey:material.stageKey,stageName:material.stageName,unit:String(data.get("unit")||"un.").trim(),before:{quantity:material.quantity,unit:material.unit,description:material.scope,status:material.status,updatedAt:material.updatedAt},after:{quantity,status:String(data.get("status")||"Planejado"),description:String(data.get("description")||"").trim()},documents})});
        const payload=await response.json();if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);
        const updatedAt=payload.material?.updatedAt||new Date().toISOString();
        appStore.update((current)=>({...current,materialCatalogAdditions:(current.materialCatalogAdditions||[]).map((item)=>item.id===material.id?{...item,name:materialName,materialDraftV1:false,quantity,unit:String(data.get("unit")||"un.").trim(),status:String(data.get("status")||"Planejado"),scope:String(data.get("description")||"").trim(),updatedAt}:item),controlMaterialOverrides:{...(current.controlMaterialOverrides||{}),[material.id]:{...(current.controlMaterialOverrides||{})[material.id],name:materialName,materialDraftV1:false,quantity,unit:String(data.get("unit")||"un.").trim(),status:String(data.get("status")||"Planejado"),scope:String(data.get("description")||"").trim(),updatedAt}},records:[payload.record,...(current.records||[]).filter((record)=>record.id!==payload.record.id)],materialTransitionId:null,lastAction:`Registrou transição do material ${materialName}` }));
        const entry=controlCenterRecordChangeV1(isDraftMaterialV1?"Material criado":"Material atualizado",`${materialName} · ${material.quantity??"—"} → ${quantity} ${data.get("unit")}`,{entity:"material",entityId:material.id,recordId:payload.record.id});
        controlCenterPublishV1("control.material.transition", "material", material.id,{recordId:payload.record.id,material:payload.material,plannerStatus:payload.plannerStatus,changeId:entry.id});
        notify(payload.plannerStatus==="generated"?"Registro salvo; cronograma recalculado.":"Registro salvo; recálculo do cronograma pendente.",payload.plannerStatus==="generated"?"success":"warning");
      }catch(error){status.textContent=`Não foi possível salvar: ${error.message}`;button.disabled=false;}
    });
    return result;
  };
  
}

