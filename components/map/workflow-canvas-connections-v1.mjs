/** Install pointer-based relation creation on the operational workflow canvas. */
export const installWorkflowCanvasConnectionsV1 = (ViewLayer, {
  activityCatalog,
  appStore,
  esc,
  notify,
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
} = {}) => {
  ViewLayer.prototype.bindWorkflowFieldTrees = function () {
    const canvas = this.querySelector(".dedicated-canvas");
    if (!canvas) return;
    canvas.querySelectorAll(".workflow-card").forEach((card, index) => {
      if (card.dataset.treeBound) return;
      card.dataset.treeBound = "true";
      card.addEventListener("click", () => {
        const item = activityCatalog[index % activityCatalog.length],
          old = canvas.querySelector(".workflow-tree");
        old?.remove();
        const tree = documentRef.createElement("aside");
        tree.className = "workflow-tree";
        tree.innerHTML = `<button class="detail-close">×</button><span class="activity-kind">ÁRVORE DE PREENCHIMENTO · ${item.nature.toUpperCase()}</span><h3>${item.name}</h3><p>Preencha os dados iniciais e avance pelos ramos de execução relacionados.</p><div class="tree-branch"><b>01 · Dados iniciais</b>${item.initial.map((f) => `<label>${f}<input placeholder="Preencher ${f.toLowerCase()}"></label>`).join("")}</div><div class="tree-branch"><b>02 · Execução e evidências</b>${item.execution.map((f) => `<label>${f}<input placeholder="Registrar ${f.toLowerCase()}"></label>`).join("")}</div><div class="tree-branch"><b>03 · Associações administrativas</b><label>Responsável<select><option>Selecionar envolvido</option><option>Carlos Mendes</option><option>Paula Nascimento</option><option>Mariana Lopes</option></select></label><label>Compra associada<input placeholder="ID do pedido / fornecedor"></label><label>Material associado<input placeholder="Material · quantidade · unidade"></label><label>Comprovante<input type="file"></label></div><button class="tree-save">Salvar preenchimento</button>`;
        canvas.appendChild(tree);
        tree.querySelector(".detail-close").onclick = () => tree.remove();
        tree.querySelector(".tree-save").onclick = () => {
          notify(`${item.name}: preenchimento salvo.`, "success");
          appStore.set({ lastAction: `Preencheu ${item.name}` });
          tree.remove();
        };
      });
    });
  };

  ViewLayer.prototype.bindCatalogButtons = function () {
    const canvas = this.querySelector(".dedicated-canvas");
    canvas
      ?.querySelectorAll(".activity-palette [data-kind]")
      .forEach((button) => {
        if (button.dataset.bound) return;
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
          const item = activityCatalog.find(
              (x) => x.name === button.dataset.addWork,
            ),
            card = documentRef.createElement("button");
          card.className = "dedicated-activity workflow-card";
          card.dataset.nodeId = `workflow-${Date.now()}`;
          card.style.left = "24px";
          card.style.top = "420px";
          card.style.width = "150px";
          card.innerHTML = `<span class="activity-kind">${item.nature.toUpperCase()}</span><strong>${item.name}</strong><small>${item.initial.slice(0, 2).join(" · ")}</small><em>Preencher campos →</em><span class="surface-port">●</span><span class="surface-resize"></span>`;
          canvas.appendChild(card);
          this.makeSurfaceDrag(card, canvas);
          this.bindGhostConnections();
          notify(`${item.name} adicionada com campos iniciais.`, "success");
        });
      });
  };

  ViewLayer.prototype.addCatalogPalette = function () {
    const palette = this.querySelector(".activity-palette");
    if (!palette || palette.dataset.catalog) return;
    palette.dataset.catalog = "true";
    const title = documentRef.createElement("b");
    title.textContent = "Catálogo de atividades de obra";
    palette.appendChild(title);
    activityCatalog.forEach((item) => {
      const button = documentRef.createElement("button");
      button.dataset.addWork = item.name;
      button.dataset.kind = item.nature;
      button.textContent = `${item.nature} · ${item.name}`;
      button.title = `Inicial: ${item.initial.join(" · ")} | Execução: ${item.execution.join(" · ")}`;
      palette.appendChild(button);
    });
  };

  ViewLayer.prototype.watchSurfaceRelations = function () {
    const canvas = this.querySelector(".dedicated-canvas");
    if (canvas && !canvas.dataset.relationWatch) {
      canvas.dataset.relationWatch = "true";
      canvas.addEventListener("pointerup", () =>
        setTimeout(() => this.drawSurfaceRelations(canvas), 0),
      );
    }
  };

  ViewLayer.prototype.drawSurfaceRelations = function (canvas) {
    const svg = canvas.querySelector(".surface-edges");
    if (!svg) return;
    svg.innerHTML = "";
    canvas.querySelectorAll(".surface-edge-label").forEach((item) => item.remove());
    const relationLabels = [
      "depende de", "libera", "bloqueia", "precede", "alimenta", "gera", "valida", "aguarda", "associa",
    ];
    const cardOptions = activityCatalog.map((item) => `Criar card de · ${item.name}`);
    canvas.querySelectorAll(".surface-relation").forEach((relation) => {
      const from = canvas.querySelector(`[data-node-id="${relation.dataset.from}"]`),
        to = canvas.querySelector(`[data-node-id="${relation.dataset.to}"]`);
      if (!from || !to) return;
      const x1 = from.offsetLeft + from.offsetWidth,
        y1 = from.offsetTop + from.offsetHeight / 2,
        x2 = to.offsetLeft,
        y2 = to.offsetTop + to.offsetHeight / 2,
        bend = Math.max(50, (x2 - x1) / 2);
      const path = documentRef.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${x1} ${y1} C${x1 + bend} ${y1},${x2 - bend} ${y2},${x2} ${y2}`);
      path.classList.add("surface-edge");
      svg.appendChild(path);
      const editor = documentRef.createElement("label");
      editor.className = "surface-edge-label";
      editor.style.left = `${(x1 + x2) / 2 - 76}px`;
      editor.style.top = `${(y1 + y2) / 2 - 14}px`;
      const input = documentRef.createElement("input");
      input.type = "text";
      input.value = relation.dataset.label || "depende de";
      input.placeholder = "Rotular relação…";
      input.setAttribute("list", `relation-options-${Date.now()}-${Math.round(Math.random() * 1000)}`);
      const list = documentRef.createElement("datalist");
      list.id = input.getAttribute("list");
      [...relationLabels, ...cardOptions].forEach((value) => {
        const option = documentRef.createElement("option");
        option.value = value;
        list.appendChild(option);
      });
      editor.append(input, list);
      canvas.appendChild(editor);
      const apply = () => {
        const value = input.value.trim();
        if (!value) return;
        const prefix = "Criar card de · ";
        if (value.startsWith(prefix)) {
          const item = activityCatalog.find((entry) => `Criar card de · ${entry.name}` === value);
          this.insertConnectedActivityCard(canvas, relation, from, to, item || activityCatalog[0]);
          return;
        }
        relation.dataset.label = value;
        this.drawSurfaceRelations(canvas);
      };
      input.addEventListener("change", apply);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); apply(); }
        if (event.key === "Escape") { input.value = relation.dataset.label || "depende de"; input.blur(); }
      });
      ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick"].forEach((type) =>
        input.addEventListener(type, (event) => event.stopPropagation()),
      );
      editor.addEventListener("pointerdown", (event) => event.stopPropagation());
    });
  };

  ViewLayer.prototype.insertConnectedActivityCard = function (canvas, relation, from, to, item) {
    if (!from || !to || !item) return;
    const card = documentRef.createElement("button");
    card.type = "button";
    card.className = "dedicated-activity workflow-card";
    card.dataset.nodeId = `workflow-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    card.dataset.hours = "4";
    card.style.width = "176px";
    card.style.left = `${Math.max(12, Math.round((from.offsetLeft + from.offsetWidth + to.offsetLeft - 176) / 2))}px`;
    card.style.top = `${Math.max(76, Math.round((from.offsetTop + to.offsetTop) / 2 - 24))}px`;
    card.innerHTML = `<span class="activity-kind">${esc(item.nature || "ATIVIDADE")}</span><strong>${esc(item.name)}</strong><small>${esc(item.initial?.slice(0, 2).join(" · ") || "Dados iniciais a preencher")}</small><em>Card intermediário →</em><span class="surface-port" title="Conectar atividade">●</span><span class="surface-resize" title="Ajustar duração"></span>`;
    relation.remove();
    canvas.appendChild(card);
    const first = documentRef.createElement("span");
    first.className = "surface-relation";
    first.dataset.from = from.dataset.nodeId;
    first.dataset.to = card.dataset.nodeId;
    first.dataset.label = "gera";
    canvas.appendChild(first);
    const second = documentRef.createElement("span");
    second.className = "surface-relation";
    second.dataset.from = card.dataset.nodeId;
    second.dataset.to = to.dataset.nodeId;
    second.dataset.label = "alimenta";
    canvas.appendChild(second);
    this.makeSurfaceDrag(card, canvas);
    this.bindWorkflowFieldTrees();
    this.drawSurfaceRelations(canvas);
    notify(`Card intermediário ${item.name} criado e conectado.`, "success");
  };

  ViewLayer.prototype.addFineDurationControls = function () {
    this.querySelectorAll(".dedicated-canvas .surface-resize").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => {
        const card = handle.closest(".workflow-card"), startW = card.offsetWidth, startX = event.clientX;
        const move = (next) => {
          const hours = Math.max(1, Math.round((startW + next.clientX - startX) / 25));
          card.dataset.hours = String(hours);
          card.dataset.duration = `${Math.floor(hours / 8)}d ${hours % 8}h`;
        };
        const up = () => {
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", up);
          notify(`Duração: ${card.dataset.duration}.`);
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
      });
    });
  };

  ViewLayer.prototype.makeSurfaceDrag = function (card, canvas) {
    if (!card || card.dataset.surfaceDragBound) return;
    card.dataset.surfaceDragBound = "true";
    card.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".surface-port,.surface-resize")) return;
      event.preventDefault();
      event.stopPropagation();
      const origin = { x: event.clientX, y: event.clientY }, initial = { x: card.offsetLeft, y: card.offsetTop };
      let moved = false;
      const move = (next) => {
        const dx = next.clientX - origin.x, dy = next.clientY - origin.y;
        if (!moved && Math.hypot(dx, dy) < 2) return;
        moved = true;
        card.classList.add("dragging");
        card.style.left = `${Math.max(12, initial.x + dx)}px`;
        card.style.top = `${Math.max(72, initial.y + dy)}px`;
        this.drawSurfaceRelations(canvas);
      };
      const finish = () => {
        windowRef.removeEventListener("pointermove", move);
        windowRef.removeEventListener("pointerup", finish);
        windowRef.removeEventListener("pointercancel", finish);
        card.classList.remove("dragging");
        card.releasePointerCapture?.(event.pointerId);
        if (moved) {
          card.dataset.moved = "true";
          setTimeout(() => delete card.dataset.moved, 120);
          notify("Atividade reposicionada no canvas.");
        }
      };
      card.setPointerCapture?.(event.pointerId);
      windowRef.addEventListener("pointermove", move);
      windowRef.addEventListener("pointerup", finish, { once: true });
      windowRef.addEventListener("pointercancel", finish, { once: true });
    });
    const resize = card.querySelector(".surface-resize");
    resize?.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const originX = event.clientX, startW = card.offsetWidth;
      const move = (next) => {
        const width = Math.max(90, startW + next.clientX - originX);
        card.style.width = `${width}px`;
        card.dataset.duration = String(Math.max(1, Math.round(width / 100)));
        this.drawSurfaceRelations(canvas);
      };
      const finish = () => {
        windowRef.removeEventListener("pointermove", move);
        windowRef.removeEventListener("pointerup", finish);
        windowRef.removeEventListener("pointercancel", finish);
        resize.releasePointerCapture?.(event.pointerId);
        notify(`Duração ajustada para ${card.dataset.duration} dia(s).`);
      };
      resize.setPointerCapture?.(event.pointerId);
      windowRef.addEventListener("pointermove", move);
      windowRef.addEventListener("pointerup", finish, { once: true });
      windowRef.addEventListener("pointercancel", finish, { once: true });
    });
  };

  ViewLayer.prototype.bindGhostConnections = function () {
    const canvas = this.querySelector(".dedicated-canvas");
    if (!canvas || canvas.dataset.pointerConnections) return;
    const svg = canvas.querySelector(".surface-edges");
    if (!svg) return;
    canvas.dataset.pointerConnections = "true";

    const point = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left + canvas.scrollLeft,
        y: clientY - rect.top + canvas.scrollTop,
      };
    };
    const anchor = (node, side = "out") => {
      const x = node.offsetLeft + (side === "in" ? 0 : node.offsetWidth);
      return { x, y: node.offsetTop + node.offsetHeight / 2 };
    };
    const curve = (x1, y1, x2, y2) => {
      const bend = Math.max(56, Math.min(190, Math.abs(x2 - x1) * 0.45));
      return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
    };
    const targetAt = (clientX, clientY) => {
      const node = documentRef
        .elementFromPoint(clientX, clientY)
        ?.closest(".workflow-card");
      return node && canvas.contains(node) ? node : null;
    };
    const preview = (source, clientX, clientY, target) => {
      svg.querySelector(".connection-preview")?.remove();
      const from = anchor(source, "out"),
        to = target ? anchor(target, "in") : point(clientX, clientY);
      const path = documentRef.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("surface-edge", "connection-preview");
      path.setAttribute("d", curve(from.x, from.y, to.x, to.y));
      svg.appendChild(path);
    };
    const relation = (from, to, label = "depende de") => {
      if (!from || !to || from === to) return;
      const duplicate = [...canvas.querySelectorAll(".surface-relation")].some(
        (item) =>
          item.dataset.from === from.dataset.nodeId &&
          item.dataset.to === to.dataset.nodeId,
      );
      if (duplicate) return;
      const rel = documentRef.createElement("span");
      rel.className = "surface-relation";
      rel.dataset.from = from.dataset.nodeId;
      rel.dataset.to = to.dataset.nodeId;
      rel.dataset.label = label;
      canvas.appendChild(rel);
      this.drawSurfaceRelations(canvas);
    };
    const clearState = (source, target, ghost) => {
      source?.classList.remove("relation-source", "connection-dragging");
      target?.classList.remove("relation-target");
      ghost?.remove();
      svg.querySelector(".connection-preview")?.remove();
    };
    const showNewActivityForm = (source, clientX, clientY) => {
      const drop = point(clientX, clientY);
      const form = documentRef.createElement("form");
      form.className = "workflow-drop-form";
      form.style.left = `${Math.max(12, drop.x - 64)}px`;
      form.style.top = `${Math.max(76, drop.y - 18)}px`;
      const options = activityCatalog
        .slice(0, 8)
        .map(
          (item) =>
            `<option value="${esc(item.name)}">${esc(item.nature)} · ${esc(item.name)}</option>`,
        )
        .join("");
      form.innerHTML = `<b>Nova atividade conectada</b><small>Origem: ${esc(source.querySelector("strong")?.textContent || "atividade")}</small><label>Categoria<select name="categoria">${options}</select></label><label>Nome da atividade<input name="nome" required placeholder="Ex.: Validar execução da frente"></label><label>Tempo previsto <input name="horas" type="number" min="0.5" step="0.5" value="4"> h</label><div class="workflow-drop-actions"><button type="button" data-cancel>Cancelar</button><button type="submit">Criar e conectar</button></div>`;
      canvas.appendChild(form);
      form
        .querySelector("[data-cancel]")
        ?.addEventListener("click", () => form.remove());
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form),
          category = activityCatalog.find(
            (item) => item.name === data.get("categoria"),
          );
        const name = String(
          data.get("nome") || category?.name || "Nova atividade",
        ).trim();
        const card = documentRef.createElement("button");
        card.type = "button";
        card.className = "dedicated-activity workflow-card";
        card.dataset.nodeId = `workflow-${Date.now()}-${Math.round(Math.random() * 1000)}`;
        card.dataset.hours = String(data.get("horas") || 4);
        card.style.left = `${Math.max(12, drop.x - 64)}px`;
        card.style.top = `${Math.max(76, drop.y - 18)}px`;
        card.style.width = "154px";
        card.innerHTML = `<span class="activity-kind">${esc(category?.nature || "NOVA ATIVIDADE")}</span><strong>${esc(name)}</strong><small>${esc(data.get("horas") || 4)} hora(s) previstas · responsável a definir</small><em>Preencher campos →</em><span class="surface-port" title="Arrastar para conectar">●</span><span class="surface-resize" title="Ajustar duração"></span>`;
        form.replaceWith(card);
        this.makeSurfaceDrag(card, canvas);
        this.bindWorkflowFieldTrees();
        relation(source, card, "gera");
        notify("Card criado e conectado à atividade de origem.", "success");
      });
      form.querySelector('input[name="nome"]')?.focus();
    };
    // Keep the legacy click listener from competing with the pointer gesture.
    canvas.addEventListener(
      "click",
      (event) => {
        if (event.target.closest(".surface-port")) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (event.target.closest(".surface-edge-label")) return;
        const port = event.target.closest(".surface-port");
        if (!port || event.button !== 0) return;
        const source = port.closest(".workflow-card");
        if (!source) return;
        event.preventDefault();
        event.stopPropagation();
        port.setPointerCapture?.(event.pointerId);
        source.classList.add("relation-source", "connection-dragging");
        const ghost = documentRef.createElement("div");
        ghost.className = "connection-ghost connection-ghost-card";
        ghost.innerHTML =
          '<span class="activity-kind">NOVA ATIVIDADE</span><strong>Solte para preencher</strong><small>ou leve até outro card</small>';
        canvas.appendChild(ghost);
        let target = null;
        const move = (ev) => {
          target = targetAt(ev.clientX, ev.clientY);
          canvas
            .querySelectorAll(".workflow-card")
            .forEach((card) =>
              card.classList.toggle(
                "relation-target",
                card === target && card !== source,
              ),
            );
          const p = point(ev.clientX, ev.clientY);
          ghost.style.left = `${Math.max(12, p.x + 14)}px`;
          ghost.style.top = `${Math.max(76, p.y + 14)}px`;
          preview(
            source,
            ev.clientX,
            ev.clientY,
            target && target !== source ? target : null,
          );
        };
        const finish = (ev) => {
          windowRef.removeEventListener("pointermove", move);
          windowRef.removeEventListener("pointerup", finish);
          windowRef.removeEventListener("pointercancel", finish);
          port.releasePointerCapture?.(event.pointerId);
          const finalTarget = targetAt(ev.clientX, ev.clientY);
          clearState(source, finalTarget, ghost);
          if (finalTarget && finalTarget !== source) {
            relation(source, finalTarget, "depende de");
            notify(
              "Linha de relacionamento criada. Clique no rótulo para editar.",
              "success",
            );
          } else {
            showNewActivityForm(source, ev.clientX, ev.clientY);
            notify("Defina a nova atividade conectada.");
          }
        };
        windowRef.addEventListener("pointermove", move);
        windowRef.addEventListener("pointerup", finish, { once: true });
        windowRef.addEventListener("pointercancel", finish, { once: true });
        move(event);
      },
      true,
    );
  };
  return ViewLayer;
};
