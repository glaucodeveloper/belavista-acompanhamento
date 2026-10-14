/** Stage overview canvas nodes, relations, and dedicated activity-card navigation. */
export const installStageActivityCanvasV1 = (ViewLayer, {
  appStore,
  demoData,
  activityCatalog,
  esc,
  notify,
  document: documentRef = globalThis.document,
  window: windowRef = globalThis.window,
  prompt: promptRef = (...args) => globalThis.prompt(...args),
  FormData: FormDataRef = globalThis.FormData,
} = {}) => {
  ViewLayer.prototype.enhanceDedicatedSurface = function () {
    const canvas = this.querySelector(".dedicated-canvas");
    if (!canvas || canvas.dataset.calendarized) return;
    canvas.dataset.calendarized = "true";
    const days = [
      "03/06",
      "04/06",
      "05/06",
      "06/06",
      "07/06",
      "08/06",
      "09/06",
      "10/06",
      "11/06",
      "12/06",
      "13/06",
      "14/06",
    ];
    canvas.insertAdjacentHTML(
      "afterbegin",
      `<div class="surface-days">${days.map((d, i) => `<span><b>D${i + 1}</b><small>${d}</small></span>`).join("")}</div><div class="surface-toolbar"><span class="activity-kind">GRADE DE PLANEJAMENTO · 12 DIAS</span><button class="add-activity-sequence">＋ Adicionar atividade</button></div><svg class="surface-edges" aria-hidden="true"></svg><div class="activity-palette" hidden><b>Adicionar ao cronograma</b>${["Lançamento de gasto", "Agendar fornecedor", "Registrar material", "Designar responsável", "Medição de avanço", "Aprovar pagamento", "Enviar agenda WhatsApp", "Criar alerta", "Anexar documento", "Conferir orçamento", "Atualizar indicador", "Fechar atividade"].map((x, i) => `<button data-add-work="${x}" data-kind="${i % 3 === 0 ? "ADMINISTRAÇÃO" : i % 3 === 1 ? "CAMPO" : "CONTROLE"}">${x}</button>`).join("")}</div>`,
    );
    const nodes = [...canvas.querySelectorAll(".workflow-card")];
    nodes.forEach((card, i) => {
      card.dataset.nodeId = `workflow-${i}`;
      card.dataset.duration = String((i % 4) + 1);
      card.style.left = `${24 + i * 130}px`;
      card.style.top = `${105 + (i % 2) * 130}px`;
      card.style.width = `${100 + (i % 4) * 34}px`;
      card.insertAdjacentHTML(
        "beforeend",
        `<span class="surface-port" title="Conectar atividade">●</span><span class="surface-resize" title="Ajustar duração"></span>`,
      );
      this.makeSurfaceDrag(card, canvas);
    });
    let source = null;
    const draw = () => {
      const svg = canvas.querySelector(".surface-edges");
      svg.innerHTML = "";
      const relations = [...canvas.querySelectorAll(".surface-relation")];
      relations.forEach((r) => {
        const a = canvas.querySelector(`[data-node-id="${r.dataset.from}"]`),
          b = canvas.querySelector(`[data-node-id="${r.dataset.to}"]`);
        if (!a || !b) return;
        const x1 = a.offsetLeft + a.offsetWidth,
          y1 = a.offsetTop + a.offsetHeight / 2,
          x2 = b.offsetLeft,
          y2 = b.offsetTop + b.offsetHeight / 2,
          bend = Math.max(50, (x2 - x1) / 2);
        const path = documentRef.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute(
          "d",
          `M${x1} ${y1} C${x1 + bend} ${y1},${x2 - bend} ${y2},${x2} ${y2}`,
        );
        path.classList.add("surface-edge");
        svg.appendChild(path);
        const label = documentRef.createElement("button");
        label.className = "surface-edge-label";
        label.style.left = `${(x1 + x2) / 2 - 45}px`;
        label.style.top = `${(y1 + y2) / 2 - 12}px`;
        label.textContent = r.dataset.label;
        label.onclick = () => {
          const next = promptRef("Rótulo da relação:", r.dataset.label);
          if (next?.trim()) {
            r.dataset.label = next.trim();
            draw();
          }
        };
        canvas.appendChild(label);
      });
    };
    canvas.querySelectorAll(".surface-port").forEach((port) =>
      port.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = port.closest(".workflow-card");
        if (!source) {
          source = card;
          card.classList.add("relation-source");
          notify("Origem selecionada. Clique no ponto de outra atividade.");
          return;
        }
        if (source !== card) {
          const relation = documentRef.createElement("span");
          relation.className = "surface-relation";
          relation.dataset.from = source.dataset.nodeId;
          relation.dataset.to = card.dataset.nodeId;
          relation.dataset.label = "libera";
          canvas.appendChild(relation);
          source.classList.remove("relation-source");
          source = null;
          draw();
          notify("Atividades relacionadas por linha rotulada.", "success");
        }
      }),
    );
    canvas
      .querySelector(".add-activity-sequence")
      .addEventListener("click", () =>
        canvas.querySelector(".activity-palette").toggleAttribute("hidden"),
      );
    canvas.querySelectorAll("[data-add-work]").forEach((button) =>
      button.addEventListener("click", () => {
        const card = documentRef.createElement("button");
        card.className = "dedicated-activity workflow-card";
        card.dataset.nodeId = `workflow-${Date.now()}`;
        card.dataset.duration = "1";
        card.style.left = "24px";
        card.style.top = "420px";
        card.style.width = "130px";
        card.innerHTML = `<span class="activity-kind">${button.dataset.kind}</span><strong>${button.dataset.addWork}</strong><small>Dia previsto · responsável a definir</small><em>Fluxo da etapa →</em><span class="surface-port">●</span><span class="surface-resize"></span>`;
        canvas.appendChild(card);
        this.makeSurfaceDrag(card, canvas);
        canvas.querySelector(".activity-palette").hidden = true;
        notify("Atividade adicionada à superfície.", "success");
      }),
    );
    draw();
  };
  ViewLayer.prototype.bindDedicatedActivityClicks = function () {
  const canvas = this.querySelector(".dedicated-canvas");
  if (!canvas || canvas.dataset.activityClicksBound) return;
  canvas.dataset.activityClicksBound = "true";
  canvas.addEventListener(
    "click",
    (event) => {
      if (
        event.target.closest(
          ".surface-port,.surface-resize,.surface-edge-label",
        )
      )
        return;
      const card = event.target.closest(".dedicated-activity");
      if (!card || card.dataset.moved) return;
      const name = card.querySelector("strong")?.textContent?.trim();
      if (!name) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.openActivityPage(name);
    },
    true,
  );
};

ViewLayer.prototype.bindDedicatedWorkflow = function () {
    const canvas = this.querySelector(".dedicated-canvas");
    if (!canvas) return;
    const steps = [
      [
        "01",
        "Criar lançamento",
        "Registrar data, etapa, subetapa e descrição",
        "Lançamentos",
      ],
      [
        "02",
        "Vincular fornecedor",
        "Associar fornecedor e documento fiscal",
        "Lançamentos",
      ],
      [
        "03",
        "Conferir quantidade",
        "Validar quantidade, unidade e valor unitário",
        "Lançamentos",
      ],
      [
        "04",
        "Aprovar pagamento",
        "Confirmar forma de pagamento e responsável",
        "Lançamentos",
      ],
      [
        "05",
        "Medição da etapa",
        "Relacionar gasto ao avanço físico e afazer",
        "Resumo Mensal",
      ],
      [
        "06",
        "Conciliar orçamento",
        "Comparar previsto, realizado e saldo",
        "Orçamento",
      ],
      [
        "07",
        "Atualizar indicador",
        "Consolidar consumo e variação mensal",
        "Indicadores",
      ],
      [
        "08",
        "Fechar etapa",
        "Gerar relatório e liberar próxima etapa",
        "Como Usar",
      ],
    ];
    canvas.querySelectorAll(".dedicated-activity").forEach((x) => x.remove());
    const guide = canvas.querySelector(".canvas-guide");
    steps.forEach((step, i) => {
      const card = documentRef.createElement("button");
      card.className = "dedicated-activity workflow-card";
      card.style.left = `${30 + (i % 4) * 260}px`;
      card.style.top = `${90 + Math.floor(i / 4) * 160}px`;
      card.innerHTML = `<span class="activity-kind">${step[0]} · ${step[3]}</span><strong>${step[1]}</strong><small>${step[2]}</small><em>Fluxo da etapa →</em>`;
      canvas.appendChild(card);
      card.addEventListener("click", () => {
        if (card.dataset.moved) return;
        let detail = canvas.querySelector(".workflow-detail");
        if (!detail) {
          detail = documentRef.createElement("aside");
          detail.className = "workflow-detail";
          canvas.appendChild(detail);
        }
        detail.innerHTML = `<button class="detail-close" aria-label="Fechar">×</button><span class="activity-kind">${step[3]}</span><h3>${step[1]}</h3><p>${step[2]}.</p><div><small>ENTRADAS</small><b>Data · etapa · fornecedor · valor</b></div><div><small>SAÍDA</small><b>${i < steps.length - 1 ? steps[i + 1][1] : "Etapa finalizada e relatório disponível"}</b></div><button class="workflow-complete">${i < steps.length - 1 ? "Concluir e avançar" : "Finalizar etapa"}</button>`;
        detail.querySelector(".detail-close").onclick = () => detail.remove();
        detail.querySelector(".workflow-complete").onclick = () => {
          notify(`${step[1]} concluído. Próximo fluxo liberado.`, "success");
          appStore.set({ lastAction: `Concluiu ${step[1]}` });
          detail.remove();
        };
      });
      let start = null;
      card.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        card.setPointerCapture?.(e.pointerId);
        start = {
          x: card.offsetLeft,
          y: card.offsetTop,
          cx: e.clientX,
          cy: e.clientY,
        };
        const move = (ev) => {
          card.style.left = `${Math.max(10, start.x + ev.clientX - start.cx)}px`;
          card.style.top = `${Math.max(55, start.y + ev.clientY - start.cy)}px`;
          card.dataset.moved = "true";
        };
        const up = () => {
          card.releasePointerCapture?.(e.pointerId);
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerup", up);
          setTimeout(() => delete card.dataset.moved, 0);
        };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerup", up);
      });
    });
    windowRef.lucide?.createIcons();
};
ViewLayer.prototype.addActivityNodes = function () {
  const canvas = this.querySelector(".stage-canvas");
  if (!canvas || canvas.querySelector(".activity-layer")) return;
  const stageCard = this.querySelector(".stage-detail-card");
  if (stageCard && !stageCard.querySelector(".stage-item-breakdown")) {
    const selected =
      demoData.activities.find(
        (item) => item.id === appStore.get().selectedStage,
      ) || demoData.activities[1];
    stageCard.insertAdjacentHTML(
      "beforeend",
      `<details class="stage-item-breakdown"><summary>Destrinchar etapa: escopo, registros e relações</summary><div><section><small>ESCOPO E ENTREGAS</small><b>Frente ${esc(selected.name)} · avanço físico de ${selected.progress}%</b><span>Subitens: preparação, execução, medição, aceite e liberação da próxima frente.</span></section><section><small>REGISTROS E EVIDÊNCIAS</small><b>Diário de obra, fotos, medições e ocorrências</b><span>Todo registro deve informar data, responsável, trecho/lote, quantidade e comprovação associada.</span></section><section><small>SUPRIMENTOS E FINANÇAS</small><b>2 compras · 8 materiais · custo previsto R$ 24.850,00</b><span>Conferir pedido, fornecedor, quantidade consumida, saldo e vínculo com o orçamento.</span></section><section><small>GOVERNANÇA</small><b>${esc(selected.owner)} · responsável pela confirmação</b><span>Próxima decisão: validar qualidade, registrar aceite e notificar envolvidos.</span></section></div></details>`,
    );
    stageCard
      .querySelector(".stage-item-breakdown")
      ?.addEventListener("click", (event) => event.stopPropagation());
  }
  const layer = documentRef.createElement("div");
  layer.className = "activity-layer";
  layer.innerHTML = `<div class="activity-layer-title">ATIVIDADES RELACIONADAS <small>Arraste o card para mover · arraste ● para conectar</small></div>
    <article class="activity-node workflow-card" data-node-id="overview-act-drenagem" data-activity-id="act-drenagem" data-stage="Drenagem Pluvial" style="left:34px;top:560px"><span class="activity-kind">ATIVIDADE · DRENAGEM</span><strong>Executar rede principal</strong><small>Responsável: Carlos Mendes · 82%</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <article class="activity-node workflow-card" data-node-id="overview-act-bocas" data-activity-id="act-bocas" data-stage="Drenagem Pluvial" style="left:310px;top:590px"><span class="activity-kind">SUBATIVIDADE</span><strong>Validar bocas de lobo</strong><small>Dependência: rede principal</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <article class="activity-node workflow-card" data-node-id="overview-act-pav" data-activity-id="act-pav" data-stage="Pavimentação" style="left:590px;top:790px"><span class="activity-kind">ATIVIDADE · PAVIMENTAÇÃO</span><strong>Liberar frente de pavimentação</strong><small>Aguardando drenagem · 35%</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span></article>
    <svg class="activity-edges" aria-hidden="true"></svg>`;
  canvas.appendChild(layer);

  layer.addEventListener(
    "click",
    (event) => {
      if (
        event.target.closest(
          ".activity-connect,.surface-port,.surface-edge-label",
        )
      )
        return;
      const card = event.target.closest(".activity-node");
      if (!card) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.openActivityPage(
        card.querySelector("strong")?.textContent?.trim() ||
          card.dataset.activityId ||
          "Atividade",
        card.dataset.stage || "",
      );
    },
    true,
  );

  const nodes = [...layer.querySelectorAll(".workflow-card")];
  const relations = [
    { from: nodes[0], to: nodes[2], label: "Drenagem → Pavimentação" },
  ];
  const point = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left + canvas.scrollLeft,
      y: clientY - rect.top + canvas.scrollTop,
    };
  };
  const anchor = (node, side = "out") => ({
    x: node.offsetLeft + (side === "in" ? 0 : node.offsetWidth),
    y: node.offsetTop + node.offsetHeight / 2,
  });
  const curve = (x1, y1, x2, y2) => {
    const bend = Math.max(56, Math.min(190, Math.abs(x2 - x1) * 0.45));
    return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
  };
  const svg = layer.querySelector(".activity-edges");
  const draw = () => {
    svg.innerHTML = "";
    layer
      .querySelectorAll(".overview-relation-label")
      .forEach((label) => label.remove());
    relations.forEach((rel, index) => {
      if (!rel.from.isConnected || !rel.to.isConnected) return;
      const from = anchor(rel.from, "out"),
        to = anchor(rel.to, "in");
      const path = documentRef.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.classList.add("activity-edge");
      path.dataset.relationIndex = String(index);
      path.setAttribute("d", curve(from.x, from.y, to.x, to.y));
      svg.appendChild(path);
      const label = documentRef.createElement("button");
      label.type = "button";
      label.className = "activity-relation overview-relation-label";
      label.dataset.relationIndex = String(index);
      label.textContent = rel.label;
      label.style.left = `${Math.max(18, (from.x + to.x) / 2 - 70)}px`;
      label.style.top = `${Math.max(520, (from.y + to.y) / 2 - 12)}px`;
      label.title = "Editar rótulo da relação";
      label.addEventListener("click", (event) => {
        event.stopPropagation();
        const next = promptRef("Rótulo da relação:", rel.label);
        if (next?.trim()) {
          rel.label = next.trim();
          draw();
        }
      });
      layer.appendChild(label);
    });
  };
  const bindNodeDrag = (node) => {
    if (node.dataset.overviewDragBound) return;
    node.dataset.overviewDragBound = "true";
    node.addEventListener("pointerdown", (event) => {
      if (
        event.button !== 0 ||
        event.target.closest(".surface-port,.activity-connect")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const origin = { x: event.clientX, y: event.clientY },
        initial = { x: node.offsetLeft, y: node.offsetTop };
      let moved = false;
      const move = (ev) => {
        const dx = ev.clientX - origin.x,
          dy = ev.clientY - origin.y;
        if (!moved && Math.hypot(dx, dy) < 2) return;
        moved = true;
        node.classList.add("dragging");
        node.style.left = `${Math.max(8, initial.x + dx)}px`;
        node.style.top = `${Math.max(520, initial.y + dy)}px`;
        draw();
      };
      const finish = () => {
        windowRef.removeEventListener("pointermove", move);
        windowRef.removeEventListener("pointerup", finish);
        windowRef.removeEventListener("pointercancel", finish);
        node.classList.remove("dragging");
        if (moved) {
          node.dataset.dragged = "true";
          setTimeout(() => delete node.dataset.dragged, 120);
          appStore.set({
            lastAction: `Reposicionou atividade ${node.querySelector("strong")?.textContent || ""}`,
          });
        }
      };
      node.setPointerCapture?.(event.pointerId);
      windowRef.addEventListener("pointermove", move);
      windowRef.addEventListener("pointerup", finish, { once: true });
      windowRef.addEventListener("pointercancel", finish, { once: true });
    });
  };
  nodes.forEach(bindNodeDrag);
  const targetAt = (clientX, clientY) => {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest(".workflow-card");
    return target && canvas.contains(target) ? target : null;
  };
  const addRelation = (from, to, label = "depende de") => {
    if (
      !from ||
      !to ||
      from === to ||
      relations.some((rel) => rel.from === from && rel.to === to)
    )
      return;
    relations.push({ from, to, label });
    draw();
  };
  const showNewActivityForm = (source, clientX, clientY) => {
    const drop = point(clientX, clientY),
      form = documentRef.createElement("form");
    form.className = "workflow-drop-form";
    form.style.left = `${Math.max(12, drop.x - 64)}px`;
    form.style.top = `${Math.max(520, drop.y - 18)}px`;
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
      const data = new FormDataRef(form),
        category = activityCatalog.find(
          (item) => item.name === data.get("categoria"),
        ),
        card = documentRef.createElement("article");
      card.className = "activity-node workflow-card";
      card.dataset.nodeId = `overview-workflow-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      card.dataset.stage = category?.nature || "Nova atividade";
      card.style.left = `${Math.max(12, drop.x - 64)}px`;
      card.style.top = `${Math.max(520, drop.y - 18)}px`;
      card.innerHTML = `<span class="activity-kind">${esc(category?.nature || "NOVA ATIVIDADE")}</span><strong>${esc(String(data.get("nome") || category?.name || "Nova atividade").trim())}</strong><small>${esc(data.get("horas") || 4)} hora(s) previstas · responsável a definir</small><span class="surface-port activity-connect" title="Arrastar para conectar" aria-label="Arrastar para conectar">●</span>`;
      form.replaceWith(card);
      bindNodeDrag(card);
      nodes.push(card);
      addRelation(source, card, "gera");
      notify("Card criado e conectado à atividade de origem.", "success");
    });
    form.querySelector('input[name="nome"]')?.focus();
  };
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      const port = event.target.closest(".surface-port,.activity-connect");
      if (!port || event.button !== 0) return;
      const source = port.closest(".workflow-card");
      if (!source) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      port.setPointerCapture?.(event.pointerId);
      source.classList.add("relation-source", "connection-dragging");
      const ghost = documentRef.createElement("div");
      ghost.className = "connection-ghost connection-ghost-card";
      ghost.innerHTML =
        '<span class="activity-kind">NOVA ATIVIDADE</span><strong>Solte para preencher</strong><small>ou leve até outro card</small>';
      canvas.appendChild(ghost);
      let target = null;
      const preview = (ev) => {
        target = targetAt(ev.clientX, ev.clientY);
        nodes.forEach((node) =>
          node.classList.toggle(
            "relation-target",
            node === target && node !== source,
          ),
        );
        const from = anchor(source, "out"),
          to =
            target && target !== source
              ? anchor(target, "in")
              : point(ev.clientX, ev.clientY),
          path =
            svg.querySelector(".overview-connection-preview") ||
            documentRef.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("activity-edge", "overview-connection-preview");
        path.setAttribute("d", curve(from.x, from.y, to.x, to.y));
        if (!path.parentNode) svg.appendChild(path);
        const p = point(ev.clientX, ev.clientY);
        ghost.style.left = `${Math.max(12, p.x + 14)}px`;
        ghost.style.top = `${Math.max(520, p.y + 14)}px`;
      };
      const finish = (ev) => {
        windowRef.removeEventListener("pointermove", preview);
        windowRef.removeEventListener("pointerup", finish);
        windowRef.removeEventListener("pointercancel", finish);
        port.releasePointerCapture?.(event.pointerId);
        svg.querySelector(".overview-connection-preview")?.remove();
        nodes.forEach((node) => node.classList.remove("relation-target"));
        source.classList.remove("relation-source", "connection-dragging");
        ghost.remove();
        const finalTarget = targetAt(ev.clientX, ev.clientY);
        if (finalTarget && finalTarget !== source) {
          addRelation(source, finalTarget, "depende de");
          notify(
            "Linha de relacionamento criada. Clique no rótulo para editar.",
            "success",
          );
        } else showNewActivityForm(source, ev.clientX, ev.clientY);
      };
      windowRef.addEventListener("pointermove", preview);
      windowRef.addEventListener("pointerup", finish, { once: true });
      windowRef.addEventListener("pointercancel", finish, { once: true });
      preview(event);
    },
    true,
  );
  draw();
};
  return ViewLayer;
};

