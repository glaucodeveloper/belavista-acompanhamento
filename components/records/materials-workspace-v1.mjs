export function installMaterialsWorkspaceV1(ViewLayer, {
  appStore,
  controlCenterMaterialRowsV1,
  controlCenterPublishV1,
  controlCenterRecordChangeV1,
  esc,
  executionModel,
  ico,
  normalizeActivityRouteTextV1,
  notify,
  stageProfileSettingsFor,
  stageV9FlowPackets,
}) {
  // MATERIALS_AI_APPLICATION_PREVIEW_V7 — substitui a lista simples da etapa
  // por uma projeção do ciclo operacional sobre como cada material tende a entrar
  // na geração da frente. A agenda do Worker vence; contexto da etapa é fallback.
  const materialsStageAiTokenV7 = (value) =>
    normalizeActivityRouteTextV1(String(value || ""));
  const materialsStageAiArrayV7 = (value) =>
    Array.isArray(value) ? value : [];
  const materialsStageAiRequirementV7 = (entry) =>
    typeof entry === "string"
      ? { name: entry, description: entry }
      : entry && typeof entry === "object"
        ? entry
        : {};
  const materialsStageAiPreviewV7 = (stage, connectedItems, state) => {
    const savedProfile = stageProfileSettingsFor(stage.key) || {},
      profile = { ...(stage.executionProfile || {}), ...savedProfile },
      stageToken = materialsStageAiTokenV7(stage.name),
      agenda = materialsStageAiArrayV7(state.operationalAgenda).filter((item) => {
        const key = String(item?.stageKey || item?.stage?.key || ""),
          name = materialsStageAiTokenV7(item?.stageName || item?.stage || "");
        return key === stage.key || (name && name === stageToken);
      }),
      procurement = materialsStageAiArrayV7(profile.procurementFocus).filter(Boolean),
      hints = materialsStageAiArrayV7(profile.requestHints).filter(Boolean),
      configured = materialsStageAiArrayV7(profile.materialsTable),
      packets = stageV9FlowPackets(stage),
      candidates = connectedItems.length
        ? connectedItems
        : configured.length
          ? configured.map((item) => ({
              ...item,
              id: "",
              stageKey: stage.key,
              stageName: stage.name,
              scope: item.description || item.scope || "",
            }))
          : materialsStageAiArrayV7(stage.materials).map((name) => ({
              id: "",
              name,
              stageKey: stage.key,
              stageName: stage.name,
              quantity: null,
              unit: "",
              status: "Previsto",
              scope: "Requisito modelado da etapa",
            })),
      requirements = agenda.flatMap((action) => {
        const normal = materialsStageAiArrayV7(action?.materialRequirements).map((entry) => ({
            action,
            shortage: false,
            requirement: materialsStageAiRequirementV7(entry),
          })),
          shortages = materialsStageAiArrayV7(action?.materialShortfalls).map((entry) => ({
            action,
            shortage: true,
            requirement: materialsStageAiRequirementV7(entry),
          }));
        return [...normal, ...shortages];
      });
    const entries = candidates.map((material, index) => {
      const materialToken = materialsStageAiTokenV7(material.name || material.description || material.scope),
        matched = requirements.find(({ requirement }) => {
          const requirementToken = materialsStageAiTokenV7(
            [
              requirement.name,
              requirement.material,
              requirement.description,
              requirement.scope,
            ]
              .filter(Boolean)
              .join(" "),
          );
          return Boolean(
            materialToken &&
              requirementToken &&
              (requirementToken.includes(materialToken) ||
                materialToken.includes(requirementToken)),
          );
        }),
        action = matched?.action || (agenda.length ? agenda[index % agenda.length] : null),
        kind = String(action?.kind || action?.properties?.kind || ""),
        actionStatus = String(action?.status || ""),
        packet = packets[
          /governance|evidence/i.test(kind)
            ? Math.min(2, packets.length - 1)
            : /planning/i.test(kind)
              ? 0
              : action?.decisionBand === "material-block" || matched?.shortage
                ? 0
                : /conclu|finaliz|liberad/i.test(actionStatus)
                  ? Math.max(0, packets.length - 1)
                  : Math.min(1, packets.length - 1)
        ] || packets[0],
        phase = matched?.shortage
          ? "SUPRIMENTO"
          : /governance|evidence/i.test(kind)
            ? "VALIDAR"
            : /planning/i.test(kind)
              ? "PREPARAR"
              : /conclu|finaliz|liberad/i.test(actionStatus)
                ? "LIBERAR"
                : "EXECUTAR",
        application =
          matched?.requirement?.description ||
          matched?.requirement?.scope ||
          action?.referenceDescription ||
          action?.nextStep ||
          material.scope ||
          procurement[index % Math.max(1, procurement.length)] ||
          hints[index % Math.max(1, hints.length)] ||
          packet?.detail ||
          "Aplicação a confirmar pelo próximo registro operacional.",
        quantity =
          material.quantity == null || material.quantity === ""
            ? "A dimensionar"
            : `${material.quantity} ${material.unit || ""}`.trim(),
        timing = action?.plannedStart || action?.date || stage.week || packet?.trigger || "A programar",
        status = matched?.shortage
          ? "Bloqueio material"
          : action?.status || material.status || "Previsto";
      return {
        id: material.id || "",
        name: material.name || matched?.requirement?.name || `Material ${index + 1}`,
        phase,
        application,
        quantity,
        timing,
        status,
        connected: Boolean(material.id),
      };
    });
    return {
      source: agenda.length
        ? "ciclo operacional atual"
        : configured.length
          ? "contexto IA da etapa"
          : "modelo operacional da etapa",
      entries,
    };
  };
  const materialsStageAiPreviewMarkupV7 = (stage, items, state) => {
    const preview = materialsStageAiPreviewV7(stage, items, state);
    return `<section class="materials-stage-ai-preview-v7" data-material-stage-ai-preview="${esc(stage.key)}"><div class="materials-stage-ai-preview-head-v7"><span>PRÉVIA IA · APLICAÇÃO DOS MATERIAIS</span><small>${esc(preview.source)}</small></div><div class="materials-stage-ai-preview-flow-v7">${preview.entries.length ? preview.entries.map((entry) => `<article class="materials-stage-ai-preview-item-v7"${entry.connected ? ` data-material-ai-entry="${esc(entry.id)}"` : ""}><span>${esc(entry.phase)}</span><div>${entry.connected ? `<button type="button" data-material-edit="${esc(entry.id)}"><b>${esc(entry.name)}</b></button>` : `<b>${esc(entry.name)}</b>`}<p>${esc(entry.application)}</p><small>${esc(entry.quantity)} · ${esc(entry.timing)}</small></div><em>${esc(entry.status)}</em>${entry.connected ? `<button type="button" class="materials-stage-ai-unlink-v7" data-material-unlink-stage="${esc(entry.id)}" aria-label="Remover ${esc(entry.name)} desta etapa" title="Remover vínculo com esta etapa">${ico("unlink-2")}</button>` : ""}</article>`).join("") : '<div class="materials-stage-ai-preview-empty-v7"><b>Aguardando materiais</b><p>Adicione ou vincule um material para a IA projetar sua aplicação nesta frente.</p></div>'}</div><small class="materials-stage-ai-preview-note-v7">Prévia operacional: registros, bloqueios, materiais e contexto da etapa podem alterar esta aplicação no próximo ciclo.</small></section>`;
  };
  const ensureMaterialsStageAiPreviewStyleV7 = () => {
    if (document.getElementById("materials-stage-ai-preview-style-v7")) return;
    const style = document.createElement("style");
    style.id = "materials-stage-ai-preview-style-v7";
    style.textContent = `
      .materials-stage-ai-preview-v7{display:grid;gap:8px;margin:8px 0 10px;padding:9px;border:1px solid rgba(127,127,127,.24);background:rgba(127,127,127,.045)}
      .materials-stage-ai-preview-head-v7{display:flex;align-items:center;justify-content:space-between;gap:8px}.materials-stage-ai-preview-head-v7>span{font-size:10px;font-weight:800;letter-spacing:.08em}.materials-stage-ai-preview-head-v7>small{opacity:.66;text-align:right}
      .materials-stage-ai-preview-flow-v7{display:grid;gap:6px}.materials-stage-ai-preview-item-v7{display:grid;grid-template-columns:64px minmax(0,1fr) auto auto;align-items:start;gap:8px;padding:7px 0;border-top:1px solid rgba(127,127,127,.18)}.materials-stage-ai-preview-item-v7:first-child{border-top:0}
      .materials-stage-ai-preview-item-v7>span{font-size:9px;font-weight:800;letter-spacing:.06em;opacity:.72}.materials-stage-ai-preview-item-v7>div{min-width:0}.materials-stage-ai-preview-item-v7>div>b,.materials-stage-ai-preview-item-v7>div>button{display:block;font:inherit;text-align:left}.materials-stage-ai-preview-item-v7>div>button{padding:0;border:0;background:none;color:inherit;cursor:pointer}.materials-stage-ai-preview-item-v7 p{margin:2px 0 3px;font-size:11px;line-height:1.3;opacity:.78}.materials-stage-ai-preview-item-v7 small{display:block;opacity:.62}.materials-stage-ai-preview-item-v7>em{font-size:9px;font-style:normal;white-space:nowrap;opacity:.72}.materials-stage-ai-unlink-v7{border:0;background:none;color:inherit;opacity:.55;cursor:pointer;padding:0}.materials-stage-ai-unlink-v7:hover{opacity:1}
      .materials-stage-ai-preview-note-v7{opacity:.55;line-height:1.25}.materials-stage-ai-preview-empty-v7{padding:8px 0}.materials-stage-ai-preview-empty-v7 p{margin:3px 0 0;opacity:.65}
      .materials-canvas-stages{display:flex!important;flex-direction:column!important;align-items:stretch!important;align-content:flex-start!important;gap:10px!important}
      .materials-canvas-stages>h3{flex:0 0 auto!important}
      .materials-stage-card{display:flex!important;flex-direction:column!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;flex:0 0 auto!important;align-self:stretch!important;box-sizing:border-box!important}
      .materials-stage-card>.materials-stage-ai-preview-v7,.materials-stage-ai-preview-flow-v7,.materials-stage-ai-preview-item-v7{height:auto!important;min-height:0!important;max-height:none!important}
      .materials-stage-card>.materials-stage-ai-preview-v7{overflow:visible!important;flex:0 0 auto!important}
    `;
    document.head.appendChild(style);
  };
  
  // MATERIALS_WORKSPACE_V1 — uma única coleção para canvas por etapa e catálogo.
  ViewLayer.prototype.materials = function () {
    ensureMaterialsStageAiPreviewStyleV7();
    const state = appStore.get(),
      all = controlCenterMaterialRowsV1(state),
      tab = state.materialsPageTab === "list" ? "list" : "canvas",
      query = String(state.materialsPageQuery || "").trim().toLocaleLowerCase("pt-BR"),
      stageFilter = String(state.materialsPageStage || "all"),
      statusFilter = String(state.materialsPageStatus || "all"),
      rows = all.filter((item) =>
        (stageFilter === "all" || item.stageKey === stageFilter) &&
        (statusFilter === "all" || item.status === statusFilter) &&
        (!query || [item.name, item.scope, item.stageName, item.activityName, item.status]
          .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(query)))),
      pageSize = 15,
      pages = Math.max(1, Math.ceil(rows.length / pageSize)),
      page = Math.max(1, Math.min(pages, Number(state.materialsPageNumber) || 1)),
      visible = rows.slice((page - 1) * pageSize, page * pageSize),
      editing = state.materialsEditId === "new" ? {} : all.find((item) => item.id === state.materialsEditId),
      option = (value, selected) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(value)}</option>`,
      stageOptions = (executionModel.stages || []).map((stage) => option(stage.key, editing?.stageKey || state.materialsNewStage)).join(""),
      statusOptions = [...new Set([editing?.status, "Planejado", "Em andamento", "Atenção", "Concluído", "Dimensionar"].filter(Boolean))]
        .map((status) => option(status, editing?.status || "Planejado")).join("");
    const stageCards = (executionModel.stages || []).map((stage) => {
      const items = rows.filter((item) => item.stageKey === stage.key && item.materialDraftV1 !== true),
        aiPreview = materialsStageAiPreviewMarkupV7(stage, items, state);
      return `<article class="materials-stage-card" data-material-stage-card="${esc(stage.key)}" data-material-drop-stage="${esc(stage.key)}"><header><span>ETAPA · ${esc(stage.key)}</span><h2>${esc(stage.name)}</h2><small>${items.length} material(is) alocado(s)</small></header>${aiPreview}<footer><button type="button" data-material-add-stage="${esc(stage.key)}">＋ Adicionar à etapa</button></footer></article>`;
    }).join("");
    const draftMaterialV1 = all.find((item) => item.materialDraftV1 === true),
      stageOrderV2 = new Map(
        (executionModel.stages || []).map((stage, index) => [stage.key, index]),
      ),
      canvasRowsWithoutDraftV2 = rows
        .filter((item) => item.id !== draftMaterialV1?.id)
        .map((item, index) => ({ item, index }))
        .sort((left, right) => {
          const leftStage = stageOrderV2.get(left.item.stageKey) ?? Number.MAX_SAFE_INTEGER,
            rightStage = stageOrderV2.get(right.item.stageKey) ?? Number.MAX_SAFE_INTEGER;
          return leftStage - rightStage || left.index - right.index;
        })
        .map(({ item }) => item),
      draftStageIndexV2 = draftMaterialV1
        ? stageOrderV2.get(draftMaterialV1.stageKey) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER,
      draftStageTailV2 = draftMaterialV1
        ? canvasRowsWithoutDraftV2.reduce(
            (lastIndex, item, index) =>
              item.stageKey === draftMaterialV1.stageKey ? index : lastIndex,
            -1,
          )
        : -1,
      draftStageInsertionV2 = !draftMaterialV1
        ? -1
        : draftStageTailV2 >= 0
          ? draftStageTailV2 + 1
          : (() => {
              const nextStage = canvasRowsWithoutDraftV2.findIndex(
                (item) =>
                  (stageOrderV2.get(item.stageKey) ?? Number.MAX_SAFE_INTEGER) >
                  draftStageIndexV2,
              );
              return nextStage >= 0 ? nextStage : canvasRowsWithoutDraftV2.length;
            })(),
      canvasRowsV1 = !draftMaterialV1
        ? canvasRowsWithoutDraftV2
        : [
            ...canvasRowsWithoutDraftV2.slice(0, draftStageInsertionV2),
            draftMaterialV1,
            ...canvasRowsWithoutDraftV2.slice(draftStageInsertionV2),
          ];
    const materialCards = canvasRowsV1.map((item) => item.materialDraftV1 === true
      ? `<article class="materials-link-card" data-material-link-card="${esc(item.id)}" data-material-linked-stage="${esc(item.stageKey || "")}" data-material-draft-v1="true"><div><span>NOVO MATERIAL</span><b></b><small></small></div></article>`
      : `<article class="materials-link-card" data-material-link-card="${esc(item.id)}" data-material-linked-stage="${esc(item.stageKey || "")}"><div><span>MATERIAL · ${esc(item.id)}</span><b>${esc(item.name)}</b><small>${item.quantity == null ? "A dimensionar" : esc(item.quantity)} ${esc(item.unit || "")} · ${esc(item.status || "Planejado")}</small></div>${item.stageKey ? `<button type="button" class="materials-link-unlink-stage-v1" data-material-unlink-stage="${esc(item.id)}" aria-label="Remover ${esc(item.name)} da etapa ${esc(item.stageName || item.stageKey)}" title="Remover da etapa">${ico("unlink-2")}</button>` : ""}<button type="button" data-material-link-start="${esc(item.id)}" aria-label="Arrastar ${esc(item.name)} até uma etapa" title="Arraste para conectar à etapa">●</button></article>`).join("") || '<p class="materials-empty">Nenhum material corresponde aos filtros.</p>';
    return `<section class="materials-page" data-materials-page><header class="materials-head"><div><span class="activity-kind">SUPRIMENTOS · CATÁLOGO OPERACIONAL</span><h1>Materiais</h1><p>Alocação por etapa e cadastro geral na mesma base da Central operacional.</p></div><button type="button" class="toolbar-primary" data-material-new>＋ Novo material</button></header><nav class="materials-tabs" aria-label="Visões de materiais"><button type="button" data-material-tab="canvas" class="${tab === "canvas" ? "active" : ""}">Canvas por etapa</button><button type="button" data-material-tab="list" class="${tab === "list" ? "active" : ""}">Lista corrida</button></nav><div class="materials-toolbar"><label>Pesquisar<input type="search" data-material-search value="${esc(state.materialsPageQuery || "")}" placeholder="Nome, atividade, descrição…"></label><label>Etapa<select data-material-stage-filter>${option("all", stageFilter).replace(">all<", ">Todas as etapas<")}${(executionModel.stages || []).map((stage) => `<option value="${esc(stage.key)}" ${stage.key === stageFilter ? "selected" : ""}>${esc(stage.name)}</option>`).join("")}</select></label><label>Situação<select data-material-status-filter><option value="all">Todas</option>${["Planejado", "Em andamento", "Atenção", "Concluído", "Dimensionar"].map((status) => option(status, statusFilter)).join("")}</select></label><span>${rows.length} de ${all.length} materiais</span></div>${editing ? `<form class="materials-editor" data-material-form><header><h2>${state.materialsEditId === "new" ? "Novo material" : "Editar material"}</h2><button type="button" data-material-cancel>Fechar</button></header><input type="hidden" name="id" value="${esc(editing.id || "")}"><div><label>Nome<input name="name" value="${esc(editing.name || "")}" required maxlength="120"></label><label>Etapa<select name="stageKey">${stageOptions}</select></label><label>Atividade<input name="activityName" value="${esc(editing.activityName || "")}" placeholder="Atividade principal"></label><label>Quantidade<input name="quantity" type="number" min="0" step="any" value="${editing.quantity == null ? "" : esc(editing.quantity)}"></label><label>Unidade<input name="unit" value="${esc(editing.unit || "un.")}" maxlength="20"></label><label>Situação<select name="status">${statusOptions}</select></label><label class="wide">Descrição / escopo<textarea name="scope" rows="2">${esc(editing.scope || "")}</textarea></label></div><footer><button type="submit" class="toolbar-primary">Salvar material</button></footer></form>` : ""}${tab === "canvas" ? `<div class="materials-canvas-shell"><p>Arraste o ponto azul de um material até uma etapa para alterar sua alocação. As curvas mostram as ligações atuais.</p><div class="materials-canvas" data-materials-canvas><svg class="materials-canvas-links" data-materials-links aria-hidden="true"></svg><div class="materials-canvas-column materials-canvas-materials"><h3>Materiais</h3>${materialCards}</div><div class="materials-canvas-column materials-canvas-stages"><h3>Etapas</h3>${stageCards}</div></div></div>` : `<div class="materials-list-wrap"><table class="materials-table"><thead><tr><th>ID</th><th>Material / descrição</th><th>Etapa</th><th>Atividade</th><th>Quantidade</th><th>Unidade</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${visible.map((item) => `<tr><td><code>${esc(item.id)}</code></td><td><b>${esc(item.name)}</b><small>${esc(item.scope || "—")}</small></td><td>${esc(item.stageName)}</td><td>${esc(item.activityName || "Atividade principal")}</td><td>${item.quantity == null ? "—" : esc(item.quantity)}</td><td>${esc(item.unit || "—")}</td><td>${esc(item.status || "Planejado")}</td><td><button type="button" data-material-edit="${esc(item.id)}">Editar</button><button type="button" data-material-delete="${esc(item.id)}">Excluir</button></td></tr>`).join("") || '<tr><td colspan="8">Nenhum material encontrado.</td></tr>'}</tbody></table></div><footer class="materials-pagination"><span>Página ${page} de ${pages}</span><button type="button" data-material-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Anterior</button><button type="button" data-material-page="${page + 1}" ${page >= pages ? "disabled" : ""}>Próxima</button></footer>`}</section>`;
  };
  
  const bindMaterialsCanvasLinksV1 = (root) => {
    const board = root.querySelector("[data-materials-canvas]");
    const svg = board?.querySelector("[data-materials-links]");
    if (!board || !svg) return null;
    const stageNodes = [...board.querySelectorAll("[data-material-drop-stage]")];
    const materialNodes = [...board.querySelectorAll("[data-material-link-card]")];
    const coordinates = (node, side) => {
      const bounds = node.getBoundingClientRect();
      const frame = board.getBoundingClientRect();
      return {
        x: (side === "right" ? bounds.right : bounds.left) - frame.left,
        y: bounds.top + bounds.height / 2 - frame.top,
      };
    };
    const curve = (from, to) => {
      const bend = Math.max(42, Math.abs(to.x - from.x) * 0.42);
      return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
    };
    let dragging = null;
    const draw = () => {
      const width = Math.max(1, board.clientWidth);
      const height = Math.max(1, board.scrollHeight);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      const materialConnectorPoint = (card) => {
        const handle = card.querySelector("[data-material-link-start]");
        if (!handle) return coordinates(card, "right");
        const bounds = handle.getBoundingClientRect(),
          frame = board.getBoundingClientRect();
        return {
          x: bounds.left + bounds.width / 2 - frame.left,
          y: bounds.top + bounds.height / 2 - frame.top,
        };
      };
      const materialStageTarget = (card) => {
        const stage = stageNodes.find(
          (node) =>
            node.dataset.materialDropStage === card.dataset.materialLinkedStage,
        );
        if (!stage) return null;
        return (
          [...stage.querySelectorAll("[data-material-ai-entry]")].find(
            (entry) =>
              entry.dataset.materialAiEntry === card.dataset.materialLinkCard,
          ) || stage
        );
      };
      const paths = materialNodes.flatMap((card) => {
        const target = materialStageTarget(card);
        if (!target || dragging?.id === card.dataset.materialLinkCard) return [];
        return `<path d="${curve(materialConnectorPoint(card), coordinates(target, "left"))}" class="materials-canvas-link"/>`;
      });
      if (dragging) {
        const card = materialNodes.find((node) => node.dataset.materialLinkCard === dragging.id);
        if (card) paths.push(`<path d="${curve(materialConnectorPoint(card), dragging.point)}" class="materials-canvas-link materials-canvas-link-drag"/>`);
      }
      svg.innerHTML = paths.join("");
    };
    const pointAt = (event) => {
      const frame = board.getBoundingClientRect();
      return { x: event.clientX - frame.left, y: event.clientY - frame.top };
    };
    const stageAt = (event) => {
      const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-material-drop-stage]");
      return hit && board.contains(hit) ? hit : null;
    };
    for (const handle of board.querySelectorAll("[data-material-link-start]")) {
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        dragging = { id: handle.dataset.materialLinkStart, point: pointAt(event) };
        board.dataset.linking = "true";
        draw();
      });
      handle.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        dragging.point = pointAt(event);
        const candidate = stageAt(event);
        for (const node of stageNodes) node.classList.toggle("materials-stage-drop-target", node === candidate);
        draw();
      });
      const finish = (event) => {
        if (!dragging) return;
        const id = dragging.id;
        const target = event.type === "pointerup" ? stageAt(event) : null;
        dragging = null;
        delete board.dataset.linking;
        for (const node of stageNodes) node.classList.remove("materials-stage-drop-target");
        draw();
        if (!target) return;
        const stage = (executionModel.stages || []).find((item) => item.key === target.dataset.materialDropStage);
        const material = controlCenterMaterialRowsV1(appStore.get()).find((item) => item.id === id);
        if (!stage || !material || material.stageKey === stage.key) return;
        const updated = { ...material, stageKey: stage.key, stageName: stage.name, activityName: "Atividade principal" };
        appStore.update((current) => ({
          ...current,
          controlMaterialOverrides: {
            ...(current.controlMaterialOverrides || {}),
            [id]: { ...(current.controlMaterialOverrides || {})[id], stageKey: stage.key, stageName: stage.name, activityName: "Atividade principal" },
          },
          lastAction: `Vinculou ${material.name} à etapa ${stage.name}`,
        }));
        const entry = controlCenterRecordChangeV1("Material vinculado à etapa", `${material.name} · ${material.stageName} → ${stage.name}`, { entity: "material", entityId: id });
        controlCenterPublishV1("control.material.updated", "material", id, { material: updated, changeId: entry.id });
        notify(`${material.name} vinculado à etapa ${stage.name}.`, "success");
      };
      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", finish);
    }
    const observer = new ResizeObserver(draw);
    observer.observe(board);
    for (const node of [...materialNodes, ...stageNodes]) observer.observe(node);
    requestAnimationFrame(draw);
    return observer;
  };
  
  const bindBeforeMaterialsWorkspaceV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeMaterialsWorkspaceV1?.apply(this, args),
      root = this.querySelector("[data-materials-page]");
    if (!root) {
      this._materialsCanvasResizeObserverV1?.disconnect();
      this._materialsCanvasResizeObserverV1 = null;
      return result;
    }
    if (!this._materialsAiPreviewRequestedV7) {
      this._materialsAiPreviewRequestedV7 = true;
      const previewLoop = this.runOperationalLoop?.("materials.preview", { quiet: true });
      previewLoop?.catch?.(() => {});
    }
    if (root.dataset.materialsBound) return result;
    this._materialsCanvasResizeObserverV1?.disconnect();
    root.dataset.materialsBound = "true";
    this._materialsCanvasResizeObserverV1 = bindMaterialsCanvasLinksV1(root);
    for (const doc of appStore.get().documentCatalog || []) {
      if (!doc.sourceMaterialId) continue;
      root.querySelectorAll(`[data-material-edit="${doc.sourceMaterialId}"]`).forEach((editButton) => {
        const host = editButton.closest("li, td, .materials-stage-ai-preview-item-v7");
        if (!host) return;
        const link = document.createElement("button");
        link.type = "button";
        link.className = "materials-document-link";
        link.textContent = doc.fileName ? "PDF / DWG" : "Documento pendente";
        link.title = `Abrir ${doc.title} no acervo do loteamento`;
        link.addEventListener("click", () => appStore.set({ view: "documents", documentsEditId: doc.id, lastAction: `Abriu documento ${doc.title}` }));
        host.append(link);
      });
    }
    const patch = (value) => appStore.set({ ...value, lastAction: "Atualizou a página de materiais" });
    root.querySelectorAll("[data-material-tab]").forEach((button) => button.addEventListener("click", () => patch({ materialsPageTab: button.dataset.materialTab, materialsPageNumber: 1 })));
    root.querySelector("[data-material-search]")?.addEventListener("input", (event) => {
      const value = event.currentTarget.value, position = event.currentTarget.selectionStart;
      patch({ materialsPageQuery: value, materialsPageNumber: 1 });
      requestAnimationFrame(() => {
        const input = this.querySelector("[data-material-search]");
        input?.focus();
        input?.setSelectionRange(position, position);
      });
    });
    root.querySelector("[data-material-stage-filter]")?.addEventListener("change", (event) => patch({ materialsPageStage: event.currentTarget.value, materialsPageNumber: 1 }));
    root.querySelector("[data-material-status-filter]")?.addEventListener("change", (event) => patch({ materialsPageStatus: event.currentTarget.value, materialsPageNumber: 1 }));
    root.querySelectorAll("[data-material-page]").forEach((button) => button.addEventListener("click", () => patch({ materialsPageNumber: Number(button.dataset.materialPage) })));
    root.querySelector("[data-material-new]")?.addEventListener("click", () => patch({ materialsEditId: "new" }));
    const startMaterialDraftForStageV1 = (stageKey) => {
      const stage = (executionModel.stages || []).find((item) => item.key === stageKey);
      if (!stage) return;
      const now = new Date().toISOString(),
        id = `material-draft-${Date.now().toString(36)}`,
        draft = {
          id, name: "", stageKey: stage.key, stageName: stage.name,
          activityName: "Atividade principal", scope: "", quantity: null, unit: "un.",
          status: "Dimensionar", properties: {}, createdAt: now, updatedAt: now,
          materialDraftV1: true,
        };
      appStore.update((current) => ({
        ...current,
        materialCatalogAdditions: [
          ...(current.materialCatalogAdditions || []).filter((item) => item.materialDraftV1 !== true),
          draft,
        ],
        materialTransitionId: id,
        materialsEditId: null,
        materialsNewStage: null,
        materialsPageTab: "canvas",
        lastAction: `Criou novo material vazio para ${stage.name}`,
      }));
    };
    root.querySelectorAll("[data-material-stage-card]").forEach((card) => card.addEventListener("click", (event) => {
      if (event.target.closest("[data-material-edit],[data-material-add-stage],[data-material-unlink-stage],a,input,select,textarea,label")) return;
      startMaterialDraftForStageV1(card.dataset.materialStageCard);
    }));
    root.querySelectorAll("[data-material-add-stage]").forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startMaterialDraftForStageV1(button.dataset.materialAddStage);
    }));
    root.querySelectorAll("[data-material-edit]").forEach((button) => button.addEventListener("click", () => patch({ materialsEditId: button.dataset.materialEdit })));
    root.querySelector("[data-material-cancel]")?.addEventListener("click", () => patch({ materialsEditId: null, materialsNewStage: null }));
    root.querySelector("[data-material-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries()),
        stageKey = String(values.stageKey || appStore.get().materialsNewStage || ""),
        stage = (executionModel.stages || []).find((item) => item.key === stageKey);
      if (!stage || !String(values.name || "").trim()) return;
      const id = String(values.id || `material-${Date.now().toString(36)}`),
        material = {
          id, name: String(values.name).trim(), stageKey, stageName: stage.name,
          activityName: String(values.activityName || "").trim() || "Atividade principal",
          scope: String(values.scope || "").trim(), quantity: values.quantity === "" ? null : Number(values.quantity),
          unit: String(values.unit || "un.").trim(), status: String(values.status || "Planejado"),
          properties: Object.fromEntries((appStore.get().materialSheetCustomColumns || []).map((entry) => [entry.id, String(values[`property:${entry.id}`] || "").trim()])),
          createdAt: controlCenterMaterialRowsV1(appStore.get()).find((item) => item.id === id)?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        custom = (appStore.get().materialCatalogAdditions || []).some((item) => item.id === id);
      appStore.update((current) => ({
        ...current,
        materialCatalogAdditions: custom || !values.id
          ? [...(current.materialCatalogAdditions || []).filter((item) => item.id !== id), material]
          : current.materialCatalogAdditions || [],
        controlMaterialOverrides: {
          ...(current.controlMaterialOverrides || {}),
          [id]: { ...(current.controlMaterialOverrides || {})[id], ...material },
        },
        materialsEditId: null, materialsNewStage: null,
        lastAction: `Salvou material ${material.name}`,
      }));
      const entry = controlCenterRecordChangeV1("Material salvo", `${material.name} · ${stage.name}`, { entity: "material", entityId: id });
      controlCenterPublishV1("control.material.updated", "material", id, { material, changeId: entry.id });
      notify("Material salvo na coleção operacional.", "success");
    });
    root.querySelectorAll("[data-material-delete]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.materialDelete,
        material = controlCenterMaterialRowsV1(appStore.get()).find((item) => item.id === id);
      if (!material || !confirm(`Excluir ${material.name} do catálogo?`)) return;
      appStore.update((current) => ({
        ...current,
        materialCatalogAdditions: (current.materialCatalogAdditions || []).filter((item) => item.id !== id),
        controlMaterialOverrides: { ...(current.controlMaterialOverrides || {}), [id]: { ...(current.controlMaterialOverrides || {})[id], deleted: true } },
        lastAction: `Excluiu material ${material.name}`,
      }));
      const entry = controlCenterRecordChangeV1("Material excluído", material.name, { entity: "material", entityId: id });
      controlCenterPublishV1("control.material.deleted", "material", id, { changeId: entry.id });
    }));
    return result;
  };
  
  // A Lista corrida compartilha as mesmas linhas, overrides e eventos do canvas.
  const MATERIAL_SHEET_COLUMNS_V1 = [
    ["id", "ID"], ["name", "Material"], ["stageKey", "Etapa"],
    ["activityName", "Atividade"], ["quantity", "Quantidade"], ["unit", "Unidade"],
    ["status", "Situação"], ["scope", "Descrição"],
    ["createdAt", "Adicionado em"], ["updatedAt", "Última alteração"],
  ];
  const materialSheetDateV1 = (value) => value ? new Date(value).toLocaleString("pt-BR") : "—";
  const materialsBeforeSheetV1 = ViewLayer.prototype.materials;
  ViewLayer.prototype.materials = function () {
    let html = materialsBeforeSheetV1.call(this);
    const state = appStore.get();
    if (state.materialsPageTab !== "list") return html;
    const all = controlCenterMaterialRowsV1(state);
    const query = String(state.materialsPageQuery || "").trim().toLocaleLowerCase("pt-BR");
    const rows = all.filter((item) =>
      (state.materialsPageStage === "all" || !state.materialsPageStage || item.stageKey === state.materialsPageStage) &&
      (state.materialsPageStatus === "all" || !state.materialsPageStatus || item.status === state.materialsPageStatus) &&
      (!query || [item.name, item.scope, item.stageName, item.activityName, item.status, ...Object.values(item.properties || {})]
        .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(query))));
    const page = Math.max(1, Math.min(Math.max(1, Math.ceil(rows.length / 15)), Number(state.materialsPageNumber) || 1));
    const visibleRows = rows.slice((page - 1) * 15, page * 15);
    const custom = Array.isArray(state.materialSheetCustomColumns) ? state.materialSheetCustomColumns : [];
    const columns = [...MATERIAL_SHEET_COLUMNS_V1, ...custom.map((entry) => [entry.id, entry.label])];
    const hidden = Array.isArray(state.materialSheetHiddenColumns) ? state.materialSheetHiddenColumns : [];
    const shown = columns.filter(([id]) => !hidden.includes(id));
    const toolbar = `<div class="materials-sheet-settings"><details><summary>Configurar colunas</summary>${columns.map(([id, label]) => `<div><label><input type="checkbox" data-material-sheet-toggle="${esc(id)}" ${hidden.includes(id) ? "" : "checked"}> ${esc(label)}</label>${custom.some((entry) => entry.id === id) ? `<button type="button" data-material-sheet-column-delete="${esc(id)}">Excluir</button>` : ""}</div>`).join("")}<form data-material-sheet-column-form><input name="label" maxlength="50" required placeholder="Nova propriedade"><button type="submit">Adicionar coluna</button></form></details></div><div class="materials-sheet-tools"><span data-material-sheet-selection>Selecione uma célula · Enter edita · Delete limpa · setas navegam</span><button type="button" data-material-sheet-document hidden>Documento</button><button type="button" data-material-sheet-edit data-material-edit hidden>Editar material</button><button type="button" data-material-sheet-clear hidden>Limpar célula</button><button type="button" data-material-sheet-delete data-material-delete hidden>Excluir linha</button><button type="button" data-material-sheet-column-action hidden>Ocultar coluna</button></div>`;
    const table = `<div class="materials-list-wrap"><table class="materials-table materials-sheet-table"><thead><tr><th class="materials-sheet-number">#</th>${shown.map(([id, label]) => `<th tabindex="0" data-material-sheet-header="${esc(id)}" title="Selecionar coluna">${esc(label)}</th>`).join("")}</tr></thead><tbody>${visibleRows.map((item, index) => `<tr><th scope="row" tabindex="0" class="materials-sheet-number" data-material-sheet-row="${esc(item.id)}" title="Selecionar linha">${(page - 1) * 15 + index + 1}</th>${shown.map(([field]) => { const raw = custom.some((entry) => entry.id === field) ? item.properties?.[field] : field === "stageKey" ? item.stageName : ["createdAt", "updatedAt"].includes(field) ? materialSheetDateV1(item[field]) : item[field]; return `<td><button type="button" class="materials-sheet-cell" data-material-sheet-cell="${esc(item.id)}" data-material-sheet-field="${esc(field)}">${esc(raw == null || raw === "" ? "—" : raw)}</button></td>`; }).join("")}</tr>`).join("") || `<tr><td colspan="${shown.length + 1}">Nenhum material encontrado.</td></tr>`}</tbody></table></div>`;
    html = html.replace(/<div class="materials-list-wrap">[\s\S]*?<\/table><\/div>/, toolbar + table);
    if (custom.length) html = html.replace(/(<form class="materials-editor"[\s\S]*?<\/textarea><\/label>)(<\/div><footer>)/,
      (_, before, after) => `${before}${custom.map((entry) => `<label>${esc(entry.label)}<input name="property:${esc(entry.id)}" value="${esc((all.find((item) => item.id === state.materialsEditId)?.properties || {})[entry.id] || "")}" maxlength="500"></label>`).join("")}${after}`);
    return html;
  };
  
  const bindBeforeMaterialsSheetV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeMaterialsSheetV1?.apply(this, args);
    const root = this.querySelector("[data-materials-page]");
    const table = root?.querySelector(".materials-sheet-table");
    if (!table || table.dataset.sheetBound) return result;
    table.dataset.sheetBound = "true";
    const patch = (value) => appStore.set({ ...value, lastAction: "Atualizou planilha de materiais" });
    const customColumns = () => appStore.get().materialSheetCustomColumns || [];
    const currentRow = (id) => controlCenterMaterialRowsV1(appStore.get()).find((item) => item.id === id);
    const selected = { type: null, id: null, field: null };
    const action = (name, visible) => { const button = root.querySelector(`[data-material-sheet-${name}]`); if (button) button.hidden = !visible; return button; };
    const select = (type, id, field, target) => {
      root.querySelectorAll(".materials-sheet-selected").forEach((node) => node.classList.remove("materials-sheet-selected"));
      target.classList.add("materials-sheet-selected");
      if (type === "cell") target.closest("td")?.classList.add("materials-sheet-selected");
      Object.assign(selected, { type, id, field });
      const row = currentRow(id);
      const label = customColumns().find((entry) => entry.id === field)?.label || MATERIAL_SHEET_COLUMNS_V1.find(([key]) => key === field)?.[1] || field;
      root.querySelector("[data-material-sheet-selection]").textContent = type === "row" ? `Linha: ${row?.name || id}` : type === "column" ? `Coluna: ${label}` : `${row?.name || id} · ${label}`;
      const edit = action("edit", type !== "column");
      if (edit) edit.dataset.materialEdit = id || "";
      const del = action("delete", type === "row");
      if (del) del.dataset.materialDelete = id || "";
      action("clear", type === "cell" && !["id", "name", "stageKey", "createdAt", "updatedAt"].includes(field));
      const doc = (appStore.get().documentCatalog || []).find((entry) => entry.sourceMaterialId === id);
      action("document", type !== "column" && Boolean(doc));
      const column = action("column-action", type === "column");
      if (column) column.textContent = customColumns().some((entry) => entry.id === field) ? "Excluir coluna" : "Ocultar coluna";
    };
    const updateCell = (row, field, value) => {
      const custom = customColumns().some((entry) => entry.id === field);
      const stage = field === "stageKey" ? (executionModel.stages || []).find((item) => item.key === value) : null;
      const patchValue = custom ? { properties: { ...(row.properties || {}), [field]: value } } : field === "stageKey" ? { stageKey: stage.key, stageName: stage.name } : { [field]: field === "quantity" ? (value === "" ? null : Number(value)) : value };
      const material = { ...row, ...patchValue, updatedAt: new Date().toISOString() };
      appStore.update((current) => ({
        ...current,
        controlMaterialOverrides: { ...(current.controlMaterialOverrides || {}), [row.id]: { ...(current.controlMaterialOverrides || {})[row.id], ...patchValue, updatedAt: material.updatedAt } },
        lastAction: `Editou material ${row.name}`,
      }));
      const entry = controlCenterRecordChangeV1("Material salvo", `${material.name} · ${material.stageName}`, { entity: "material", entityId: row.id });
      controlCenterPublishV1("control.material.updated", "material", row.id, { material, changeId: entry.id });
    };
    const openCell = () => {
      if (selected.type !== "cell" || ["id", "createdAt", "updatedAt"].includes(selected.field)) return;
      const row = currentRow(selected.id);
      if (!row) return;
      const label = customColumns().find((entry) => entry.id === selected.field)?.label || MATERIAL_SHEET_COLUMNS_V1.find(([key]) => key === selected.field)?.[1] || selected.field;
      const field = selected.field;
      const button = [...table.querySelectorAll("[data-material-sheet-cell]")].find((entry) => entry.dataset.materialSheetCell === selected.id && entry.dataset.materialSheetField === field);
      if (!button || button.parentElement.querySelector(".materials-sheet-inline-editor")) return;
      const input = ["stageKey", "status"].includes(field) ? document.createElement("select") : document.createElement(field === "scope" ? "textarea" : "input");
      if (field === "stageKey") (executionModel.stages || []).forEach((stage) => input.add(new Option(stage.name, stage.key)));
      if (field === "status") [...new Set([row.status, "Planejado", "Em andamento", "Atenção", "Concluído", "Dimensionar"].filter(Boolean))].forEach((status) => input.add(new Option(status, status)));
      if (field === "quantity") { input.type = "number"; input.min = "0"; input.step = "any"; }
      input.required = ["name", "stageKey"].includes(field);
      input.className = "materials-sheet-inline-editor";
      input.setAttribute("aria-label", `Editar ${label} de ${row.name}`);
      input.value = field.startsWith("custom-") ? row.properties?.[field] || "" : row[field] ?? "";
      button.hidden = true;
      button.after(input);
      input.focus();
      input.select?.();
      let finished = false;
      const cancel = () => { if (finished) return; finished = true; input.remove(); button.hidden = false; button.focus(); };
      const commit = () => {
        if (finished || !input.reportValidity()) return;
        const value = input.value.trim();
        if (!confirm(`Salvar alteração em ${row.name}?`)) return;
        finished = true;
        updateCell(row, field, value);
      };
      input.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); cancel(); }
        else if (event.key === "Enter" && (input.tagName !== "TEXTAREA" || event.ctrlKey)) { event.preventDefault(); commit(); }
      });
      input.addEventListener("blur", () => { if (!finished) cancel(); });
    };
    const clearCell = () => {
      if (selected.type !== "cell" || ["id", "name", "stageKey", "createdAt", "updatedAt"].includes(selected.field)) return;
      const row = currentRow(selected.id);
      if (row && confirm(`Limpar esta célula de ${row.name}?`)) updateCell(row, selected.field, "");
    };
    table.querySelectorAll("[data-material-sheet-cell]").forEach((button) => {
      button.addEventListener("click", () => select("cell", button.dataset.materialSheetCell, button.dataset.materialSheetField, button));
      button.addEventListener("dblclick", () => { select("cell", button.dataset.materialSheetCell, button.dataset.materialSheetField, button); openCell(); });
    });
    table.querySelectorAll("[data-material-sheet-row]").forEach((header) => header.addEventListener("click", () => {
      select("row", header.dataset.materialSheetRow, "", header);
      patch({ materialsEditId: header.dataset.materialSheetRow });
      requestAnimationFrame(() => this.querySelector("[data-material-form]")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }));
    table.querySelectorAll("[data-material-sheet-header]").forEach((header) => header.addEventListener("click", () => select("column", "", header.dataset.materialSheetHeader, header)));
    root.querySelector("[data-material-sheet-clear]")?.addEventListener("click", clearCell);
    root.querySelector("[data-material-sheet-document]")?.addEventListener("click", () => {
      const doc = (appStore.get().documentCatalog || []).find((entry) => entry.sourceMaterialId === selected.id);
      if (doc) patch({ view: "documents", documentsEditId: doc.id });
    });
    root.querySelector("[data-material-sheet-column-action]")?.addEventListener("click", () => {
      if (selected.type !== "column") return;
      const button = root.querySelector(`[data-material-sheet-column-delete="${selected.field}"]`);
      if (button) button.click();
      else if (confirm("Ocultar esta coluna? Os dados serão preservados.")) patch({ materialSheetHiddenColumns: [...new Set([...(appStore.get().materialSheetHiddenColumns || []), selected.field])] });
    });
    table.addEventListener("keydown", (event) => {
      if (!selected.type || !["Enter", "Delete", "Backspace", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      if (event.key === "Escape") { root.querySelectorAll(".materials-sheet-selected").forEach((node) => node.classList.remove("materials-sheet-selected")); selected.type = null; return; }
      if (event.key === "Enter") { event.preventDefault(); if (selected.type === "cell") openCell(); else if (selected.type === "row") root.querySelector("[data-material-sheet-edit]")?.click(); return; }
      if (["Delete", "Backspace"].includes(event.key)) { event.preventDefault(); if (selected.type === "cell") clearCell(); else if (selected.type === "row") root.querySelector("[data-material-sheet-delete]:not([hidden])")?.click(); else root.querySelector("[data-material-sheet-column-action]:not([hidden])")?.click(); return; }
      if (selected.type !== "cell") return;
      event.preventDefault();
      const rows = [...table.querySelectorAll("tbody tr")].map((row) => [...row.querySelectorAll("[data-material-sheet-cell]")]);
      const r = rows.findIndex((cells) => cells.some((cell) => cell.dataset.materialSheetCell === selected.id));
      const c = rows[r]?.findIndex((cell) => cell.dataset.materialSheetField === selected.field) ?? -1;
      const nextRow = Math.max(0, Math.min(rows.length - 1, r + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0)));
      const nextColumn = Math.max(0, Math.min((rows[nextRow]?.length || 1) - 1, c + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0)));
      const next = rows[nextRow]?.[nextColumn];
      if (next) { next.focus(); select("cell", next.dataset.materialSheetCell, next.dataset.materialSheetField, next); }
    });
    root.querySelectorAll("[data-material-sheet-toggle]").forEach((input) => input.addEventListener("change", () => {
      const hidden = new Set(appStore.get().materialSheetHiddenColumns || []);
      if (input.checked) hidden.delete(input.dataset.materialSheetToggle); else hidden.add(input.dataset.materialSheetToggle);
      patch({ materialSheetHiddenColumns: [...hidden] });
    }));
    root.querySelector("[data-material-sheet-column-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const label = String(new FormData(event.currentTarget).get("label") || "").trim();
      if (!label || customColumns().some((entry) => entry.label.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"))) return;
      patch({ materialSheetCustomColumns: [...customColumns(), { id: `custom-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)}`, label }] });
    });
    root.querySelectorAll("[data-material-sheet-column-delete]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.materialSheetColumnDelete;
      if (!confirm("Excluir esta propriedade personalizada e todos os seus valores?")) return;
      appStore.update((current) => ({
        ...current,
        materialSheetCustomColumns: (current.materialSheetCustomColumns || []).filter((entry) => entry.id !== id),
        controlMaterialOverrides: Object.fromEntries(Object.entries(current.controlMaterialOverrides || {}).map(([key, value]) => {
          const properties = { ...(value.properties || {}) }; delete properties[id]; return [key, { ...value, properties }];
        })),
        lastAction: "Excluiu coluna da planilha de materiais",
      }));
    }));
    return result;
  };
}

