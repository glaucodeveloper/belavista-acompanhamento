/** Planning-domain PERT graph projection, page renderer, and pointer interactions. */
export const createPertNodeServiceV1 = ({ appStore, graph } = {}) => {
  if (typeof appStore?.get !== "function")
    throw new TypeError("PERT node service requires appStore.get().");
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges))
    throw new TypeError("PERT node service requires graph nodes and edges.");

  return () => {
    const current = appStore.get(),
      overrides = current.pertOverrides || {},
      base = [...graph.nodes, ...(current.pertCustomNodes || [])].map((node) => ({
        ...node,
        ...(overrides[node.id] || {}),
      })),
      complete = new Set(
        base.filter((node) => node.progress >= 100).map((node) => node.id),
      );
    return base.map((node) => {
      const incoming = [...graph.edges, ...(current.pertRelations || []).map((item) => [item.from, item.to])]
        .filter(([, to]) => to === node.id)
        .map(([from]) => from);
      const unlocked = !incoming.length || incoming.every((id) => complete.has(id));
      const state =
        node.progress >= 100
          ? "done"
          : node.progress > 0
            ? "active"
            : unlocked
              ? "available"
              : "locked";
      return { ...node, state };
    });
  };
};

export const createPertPageRendererV1 = ({
  graph,
  appStore,
  extensionStage,
  currentPertNodes,
  esc,
  ico,
} = {}) => {
  for (const [name, implementation] of Object.entries({
    extensionStage, currentPertNodes, esc, ico,
  })) {
    if (typeof implementation !== "function")
      throw new TypeError(`PERT renderer requires ${name}().`);
  }
  if (typeof appStore?.get !== "function")
    throw new TypeError("PERT renderer requires appStore.get().");
  if (!Array.isArray(graph?.edges))
    throw new TypeError("PERT renderer requires graph edges.");

  return function renderPertV1() {
    const stage = extensionStage(),
      nodes = currentPertNodes(),
      selectedId =
        appStore.get().selectedPertNode ||
        nodes.find((node) => node.state === "active")?.id ||
        nodes[0].id,
      selected = nodes.find((node) => node.id === selectedId) || nodes[0];
    const edges = graph.edges
      .map(([from, to]) => {
        const a = nodes.find((node) => node.id === from),
          b = nodes.find((node) => node.id === to);
        if (!a || !b) return "";
        const x1 = a.x + 7,
          y1 = a.y + 8,
          x2 = b.x,
          y2 = b.y + 8,
          m = (x1 + x2) / 2;
        return `<path d="M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}"/><circle cx="${x2}" cy="${y2}" r="0.7"/>`;
      })
      .join("");
    const cards = nodes
      .map(
        (node) =>
          `<button type="button" class="pert-node state-${node.state} ${node.id === selected.id ? "selected" : ""}" data-pert-node="${node.id}" style="--x:${node.x}%;--y:${node.y}%"><span class="pert-state-icon">${node.state === "done" ? "✓" : node.state === "locked" ? "⌁" : node.state === "available" ? "○" : "●"}</span><span><small>${node.state === "done" ? "CONCLUÍDA" : node.state === "active" ? "EM EXECUÇÃO" : node.state === "available" ? "AÇÃO DISPONÍVEL" : "BLOQUEADA"}</small><strong>${esc(node.label)}</strong><em>${node.progress}% · ${esc(node.owner)}</em></span></button>`,
      )
      .join("");
    return `<div class="stage-extension-page pert-page"><div class="extension-head"><div><span class="activity-kind">PERT · ${esc(stage.name)}</span><h1>Dependências vivas da etapa</h1><p>O grafo mostra o que já foi concluído, o que pode começar agora e quais atividades ainda dependem de liberações anteriores.</p></div><div class="extension-head-actions"><button class="ghost" data-view="stages">${ico("arrow-left")} Gantt da etapa</button><button class="primary" data-view="activities">${ico("sparkles")} Atividades</button></div></div><div class="pert-layout"><section class="pert-canvas"><div class="pert-canvas-head"><span>FLUXO OPERACIONAL</span><div class="pert-legend"><i class="done"></i> concluída <i class="active"></i> execução <i class="available"></i> disponível <i class="locked"></i> bloqueada</div></div><svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${cards}</section><aside class="pert-inspector"><span class="activity-kind">NÓ SELECIONADO · ${selected.state.toUpperCase()}</span><h2>${esc(selected.label)}</h2><div class="pert-progress"><i style="width:${selected.progress}%"></i></div><div class="pert-properties"><div><small>RESPONSÁVEL</small><b>${esc(selected.owner)}</b></div><div><small>MATERIAIS / EVIDÊNCIAS</small><b>${esc(selected.material)}</b></div><div><small>CONTRATO / DOCUMENTO</small><b>${esc(selected.contract)}</b></div><div><small>ÚLTIMA ATUALIZAÇÃO</small><b>Hoje · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b></div></div><div class="pert-inspector-actions"><button class="ghost" data-view="records">${ico("images")} Ver evidências</button><button class="ghost" data-view="activities">${ico("panel-right-open")} Abrir atividade</button>${selected.state !== "done" ? `<button class="primary" data-pert-complete="${selected.id}">${ico("check-check")} Marcar concluída</button>` : '<span class="pert-complete-note">Próximas dependências foram reavaliadas.</span>'}</div></aside></div></div>`;
  };
};

export const installPertInteractiveV1 = (ViewLayer, {
  appStore,
  beginCardCanvasLink,
  currentPertNodes,
  documentRef,
  windowRef,
  esc,
  notify,
} = {}) => {
  for (const [name, implementation] of Object.entries({
    beginCardCanvasLink, currentPertNodes, esc, notify,
  })) {
    if (typeof implementation !== "function")
      throw new TypeError(`PERT interactions require ${name}().`);
  }
  if (typeof appStore?.get !== "function" || typeof appStore?.set !== "function")
    throw new TypeError("PERT interactions require appStore.get() and set().");
  if (typeof documentRef?.createElement !== "function" ||
      typeof windowRef?.addEventListener !== "function" ||
      typeof windowRef?.setTimeout !== "function" ||
      typeof windowRef?.prompt !== "function" ||
      !ViewLayer?.prototype)
    throw new TypeError("PERT interactions require document, window, and ViewLayer.");

  const pertInteractiveBaseV1 = ViewLayer.prototype.pert;
  const relationMarkup = () => {
    const relations = appStore.get().pertRelations || [],
      nodes = currentPertNodes();
    if (!relations.length)
      return '<div class="pert-relation-editor-empty">Arraste o ponto ＋ de um card até outro para criar uma relação rotulada.</div>';
    return `<div class="pert-relation-editor-list">${relations
      .map((relation, index) => {
        const from = nodes.find((node) => node.id === relation.from),
          to = nodes.find((node) => node.id === relation.to);
        return `<button type="button" data-pert-relation-edit="${index}"><span>${esc(from?.label || relation.from)} → ${esc(to?.label || relation.to)}</span><b>${esc(relation.label || "relação")}</b></button>`;
      })
      .join("")}</div>`;
  };
  const relationEdges = () => {
    const nodes = currentPertNodes(),
      relations = appStore.get().pertRelations || [];
    return relations
      .map((relation) => {
        const from = nodes.find((node) => node.id === relation.from),
          to = nodes.find((node) => node.id === relation.to);
        if (!from || !to) return "";
        const x1 = from.x + 7,
          y1 = from.y + 8,
          x2 = to.x,
          y2 = to.y + 8,
          m = (x1 + x2) / 2;
        return `<path class="pert-custom-edge" d="M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}"/><text class="pert-custom-label" x="${m}" y="${(y1 + y2) / 2 - 1}">${esc(relation.label || "relação")}</text>`;
      })
      .join("");
  };

  ViewLayer.prototype.pert = function (...args) {
    const html = pertInteractiveBaseV1?.apply(this, args) || "";
    const tools = `<div class="pert-interaction-tools"><span>PERT EDITÁVEL</span><small>Arraste ＋ até outro card ou solte no canvas para criar um novo</small></div><div class="pert-relation-editor">${relationMarkup()}</div><form class="pert-link-form" data-pert-link-form hidden><header><b>Finalizar card e relação</b><button type="button" data-pert-link-cancel aria-label="Cancelar">×</button></header><label>Nome do card<input name="name" required maxlength="100" placeholder="Nova atividade"></label><label>Relação<input name="label" required maxlength="80" value="libera"></label><label>Responsável<input name="owner" maxlength="100" placeholder="Responsável"></label><footer><button type="submit">Criar card e conexão</button></footer></form>`;
    return html
      .replace("</svg>", relationEdges() + "</svg>")
      .replace('<div class="pert-canvas">', '<div class="pert-canvas">' + tools);
  };

  const bindPertInteractiveV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindPertInteractiveV1?.apply(this, args);
    if (appStore.get().view !== "pert") return result;
    const canvas = this.querySelector(".pert-canvas");
    if (!canvas || canvas.dataset.pertInteractiveBound === "true") return result;
    canvas.dataset.pertInteractiveBound = "true";
    const nodes = [...canvas.querySelectorAll("[data-pert-node]")];
    const linkForm = canvas.querySelector("[data-pert-link-form]");
    let pendingLink = null;
    linkForm?.querySelector("[data-pert-link-cancel]")?.addEventListener("click", () => {
      pendingLink = null;
      linkForm.hidden = true;
    });
    linkForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!pendingLink) return;
      const name = String(linkForm.elements.name.value || "").trim(),
        label = String(linkForm.elements.label.value || "").trim(),
        owner = String(linkForm.elements.owner.value || "").trim();
      if (!name || !label) return;
      const id = `pert-${Date.now().toString(36)}`;
      appStore.set({
        pertCustomNodes: [...(appStore.get().pertCustomNodes || []), {
          id, label: name, owner: owner || "A definir", progress: 0,
          x: pendingLink.x, y: pendingLink.y, material: "A definir", contract: "A definir",
        }],
        pertRelations: [...(appStore.get().pertRelations || []), {
          from: pendingLink.source, to: id, label,
        }],
        selectedPertNode: id,
        lastAction: `Criou card ${name} ligado no PERT`,
      });
      pendingLink = null;
      linkForm.hidden = true;
    });
    nodes.forEach((node) => {
      const handle = documentRef.createElement("button");
      handle.type = "button";
      handle.className = "pert-connect-handle";
      handle.textContent = "＋";
      handle.title = "Arraste para conectar";
      handle.dataset.pertConnectFrom = node.dataset.pertNode;
      node.appendChild(handle);
      node.addEventListener("pointerdown", (event) => {
        if (event.target === handle || event.button !== 0) return;
        event.preventDefault();
        let moved = false;
        const rect = canvas.getBoundingClientRect(),
          start = { x: event.clientX, y: event.clientY },
          base = {
            x: parseFloat(node.style.getPropertyValue("--x")) || 0,
            y: parseFloat(node.style.getPropertyValue("--y")) || 0,
          };
        node.setPointerCapture?.(event.pointerId);
        node.classList.add("dragging");
        const move = (ev) => {
          const nextX = Math.max(2, Math.min(90, base.x + ((ev.clientX - start.x) / rect.width) * 100)),
            nextY = Math.max(5, Math.min(76, base.y + ((ev.clientY - start.y) / rect.height) * 100));
          node.style.setProperty("--x", `${nextX}%`);
          node.style.setProperty("--y", `${nextY}%`);
          moved = true;
        };
        const up = () => {
          node.classList.remove("dragging");
          node.releasePointerCapture?.(event.pointerId);
          node.removeEventListener("pointermove", move);
          node.removeEventListener("pointerup", up);
          if (moved) {
            node.dataset.dragged = "true";
            windowRef.setTimeout(() => delete node.dataset.dragged, 0);
            const id = node.dataset.pertNode,
              overrides = {
                ...(appStore.get().pertOverrides || {}),
                [id]: {
                  ...(appStore.get().pertOverrides || {})[id],
                  x: parseFloat(node.style.getPropertyValue("--x")),
                  y: parseFloat(node.style.getPropertyValue("--y")),
                },
              };
            appStore.set({ pertOverrides: overrides, lastAction: `Reposicionou nó PERT ${id}` });
          }
        };
        node.addEventListener("pointermove", move);
        node.addEventListener("pointerup", up, { once: true });
      });
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const source = node.dataset.pertNode;
        beginCardCanvasLink({
          event, source, surface: canvas,
          from: () => {
            const rect = handle.getBoundingClientRect();
            return { x: rect.right, y: rect.top + rect.height / 2 };
          },
          onDrop: (ev, element) => {
            const target = element?.closest?.("[data-pert-node]");
            if (target && target !== node) {
              const relations = [...(appStore.get().pertRelations || [])].filter(
                (item) => !(item.from === source && item.to === target.dataset.pertNode),
              );
              relations.push({ from: source, to: target.dataset.pertNode, label: "libera" });
              appStore.set({ pertRelations: relations, lastAction: "Criou relação PERT entre cards" });
              notify("Relação criada no PERT.", "success");
            } else if (canvas.contains(element) && !element?.closest?.("[data-pert-link-form]")) {
              const rect = canvas.getBoundingClientRect();
              pendingLink = {
                source,
                x: Math.max(2, Math.min(90, ((ev.clientX - rect.left) / rect.width) * 100)),
                y: Math.max(5, Math.min(76, ((ev.clientY - rect.top - 52) / Math.max(1, rect.height)) * 100)),
              };
              linkForm.reset();
              linkForm.hidden = false;
              linkForm.elements.name.focus();
            }
          },
        });
      });
    });
    canvas.querySelectorAll("[data-pert-relation-edit]").forEach((button) =>
      button.addEventListener("click", () => {
        const index = Number(button.dataset.pertRelationEdit),
          relations = [...(appStore.get().pertRelations || [])],
          next = windowRef.prompt("Novo rótulo da relação", relations[index]?.label || "");
        if (next !== null && next.trim()) {
          relations[index] = { ...relations[index], label: next.trim() };
          appStore.set({ pertRelations: relations, lastAction: "Editou rótulo da relação PERT" });
        }
      }),
    );
    return result;
  };
};
