export function installActivityCalendarCanvasV1(ViewLayer, {
  appStore,
  esc,
  executionModel,
  extensionStage,
  ico,
  runtimeRouteV1,
  stageV9FlowPackets,
  stageV9LiveFor,
  stageViewTabs,
}) {
  // Etapas: atividades reais da frente em uma superfície de calendário livre.
  // Posições e vínculos são organização local; a execução continua no detalhe.
  const activitiesBeforeCalendarCanvasV1 = ViewLayer.prototype.activities;
  ViewLayer.prototype.activities = function (...args) {
    if (appStore.get().stageActivityDedicatedV9)
      return activitiesBeforeCalendarCanvasV1.apply(this, args);
    const selected = extensionStage();
    const model = (executionModel.stages || []).find((item) =>
      String(item.name).toLocaleLowerCase("pt-BR") === String(selected?.name).toLocaleLowerCase("pt-BR"),
    ) || executionModel.stages?.[0];
    if (!model) return activitiesBeforeCalendarCanvasV1.apply(this, args);
    const packets = stageV9FlowPackets(model);
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate() + index);
      return `<span><b>${esc(date.toLocaleDateString("pt-BR", { weekday: "short" }))}</b><small>${esc(date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }))}</small></span>`;
    }).join("");
    return `<section class="activity-calendar-page-v1" data-activity-calendar="${esc(model.key)}"><header><div><span class="activity-kind">ETAPA · ${esc(model.name)}</span><h1>Atividades</h1><p>Mova os cards sobre os dias e conecte os passos da execução. Clique em Abrir para registrar e conferir a atividade.</p></div><button type="button" data-view="stages">${ico("arrow-left")} Etapas</button></header>${stageViewTabs("activities")}<div class="activity-calendar-toolbar-v1"><label>Pesquisar<input type="search" data-activity-canvas-search placeholder="Nome ou detalhe"></label><label>Situação<select data-activity-canvas-status><option value="">Todas</option><option value="Em andamento">Em andamento</option><option value="Planejada">Planejada</option></select></label><button type="button" data-activity-canvas-connect>Relacionar cards</button><button type="button" data-activity-canvas-reset>Reorganizar</button><button type="button" data-activity-canvas-export>Exportar CSV</button></div><p class="activity-calendar-hint-v1" data-activity-canvas-hint>Arraste pelo topo de cada card. Para criar uma relação, clique em “Relacionar cards” e selecione origem e destino.</p><div class="activity-calendar-scroll-v1"><div class="activity-calendar-board-v1" data-activity-board><div class="activity-calendar-days-v1">${days}</div><div class="activity-calendar-grid-v1"></div><svg class="activity-calendar-links-v1" data-activity-links aria-hidden="true"></svg>${packets.map((item, index) => `<article class="activity-calendar-card-v1" data-activity-node="${esc(item.key)}" data-activity-index="${index}" data-status="${index === 0 && Number(stageV9LiveFor(model)?.progress) > 0 ? "Em andamento" : "Planejada"}"><div class="activity-calendar-drag-v1" data-activity-drag><span>${String(index + 1).padStart(2, "0")} · ${esc(item.unit)}</span><span>⠿</span></div><div><h2>${esc(item.label)}</h2><p>${esc(item.detail)}</p><small>${esc(item.trigger)}</small></div><footer><span>${index === 0 && Number(stageV9LiveFor(model)?.progress) > 0 ? "Em andamento" : "Planejada"}</span><a href="/admin?view=activities&amp;activity=${encodeURIComponent(`${model.key}:${item.key}`)}" data-activity-canvas-open="${esc(item.key)}">Abrir ↗</a></footer></article>`).join("")}</div></div><footer class="activity-calendar-foot-v1"><span data-activity-canvas-count>${packets.length} atividades</span><span data-activity-canvas-page>Calendário de 14 dias · posição local</span></footer><div class="activity-calendar-relations-v1" data-activity-relations></div></section>`;
  };
  
  const renderBeforeActivityCalendarV1 = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderBeforeActivityCalendarV1.apply(this, args);
    this.querySelectorAll('[data-stage-view="pert"], [data-stage-view="raid"], [data-stage-view="raci"], [data-view="pert"], [data-view="raid"], [data-view="raci"]').forEach((button) => {
      if (button.closest(".stage-view-tabs, .stages-organizer-raid")) button.remove();
    });
    this.querySelectorAll("[data-stages-organizer-raid]").forEach((section) => section.remove());
    const page = this.querySelector("[data-activity-calendar]");
    if (!page) return result;
    const newActivity = document.createElement("button");
    newActivity.type = "button";
    newActivity.textContent = "+ Nova atividade";
    newActivity.addEventListener("click", () => window.location.assign(
      runtimeRouteV1("/admin/workers/activity", `stage=${encodeURIComponent(page.dataset.activityCalendar)}&activity=new`),
    ));
    page.querySelector(".activity-calendar-toolbar-v1")?.append(newActivity);
    if (!document.getElementById("activity-calendar-v1-style")) {
      const style = document.createElement("style");
      style.id = "activity-calendar-v1-style";
      style.textContent = `.activity-calendar-page-v1{padding:22px;color:#eaf0f1}.activity-calendar-page-v1>header{display:flex;justify-content:space-between;gap:20px;align-items:start}.activity-calendar-page-v1 h1{margin:5px 0;font-size:28px}.activity-calendar-page-v1>header p{color:#aab7b9}.activity-calendar-page-v1 button{cursor:pointer}.activity-calendar-page-v1>header button,.activity-calendar-toolbar-v1 button,.activity-calendar-card-v1 a{background:#243139;color:#eaf0f1;border:1px solid #536269;border-radius:8px;padding:9px 12px}.activity-calendar-toolbar-v1{display:flex;flex-wrap:wrap;gap:10px;align-items:end;background:#20282b;border:1px solid #39484a;border-radius:12px;padding:12px;margin:16px 0}.activity-calendar-toolbar-v1 label{display:grid;gap:4px;color:#b8c6c8;font-size:11px}.activity-calendar-toolbar-v1 input,.activity-calendar-toolbar-v1 select{background:#101a1d;color:#eaf0f1;border:1px solid #536269;border-radius:8px;padding:9px;min-width:160px}.activity-calendar-toolbar-v1 button[data-active="true"]{border-color:#8ccfa8;color:#aaf0c6}.activity-calendar-hint-v1{color:#aab7b9;font-size:12px}.activity-calendar-scroll-v1{overflow:auto;border:1px solid #39484a;border-radius:14px;background:#142023}.activity-calendar-board-v1{position:relative;min-width:1300px;height:620px;background:#152124}.activity-calendar-days-v1{position:absolute;top:0;left:0;right:0;height:54px;display:grid;grid-template-columns:repeat(14,1fr);background:#1f2b2d;z-index:2}.activity-calendar-days-v1 span{text-align:center;border-right:1px solid #3b4b4d;padding:7px 2px}.activity-calendar-days-v1 b,.activity-calendar-days-v1 small{display:block}.activity-calendar-days-v1 small{color:#9caeb0}.activity-calendar-grid-v1{position:absolute;inset:54px 0 0;background-image:linear-gradient(to right,#344144 1px,transparent 1px),linear-gradient(to bottom,#293638 1px,transparent 1px);background-size:calc(100% / 14) 100%,100% 94px}.activity-calendar-links-v1{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible}.activity-calendar-card-v1{position:absolute;width:225px;min-height:146px;z-index:3;background:#20312e;border:1px solid #4a6960;border-radius:13px;box-shadow:0 10px 24px #0006;overflow:hidden}.activity-calendar-card-v1[data-selected="true"]{outline:2px solid #93d9b1}.activity-calendar-drag-v1{display:flex;justify-content:space-between;background:#2a4339;padding:9px 12px;color:#b6e4c9;font-size:11px;cursor:grab;touch-action:none}.activity-calendar-card-v1>div:nth-child(2){padding:10px 12px}.activity-calendar-card-v1 h2{font-size:15px;margin:0 0 5px}.activity-calendar-card-v1 p{font-size:11px;color:#c1cdcb;margin:0 0 7px}.activity-calendar-card-v1 small{font-size:10px;color:#9db3ad}.activity-calendar-card-v1 footer{display:flex;justify-content:space-between;align-items:center;padding:0 10px 10px;font-size:10px;color:#a9d5bd}.activity-calendar-card-v1 footer a{padding:5px 8px;text-decoration:none}.activity-calendar-foot-v1{display:flex;justify-content:space-between;gap:12px;padding:12px;color:#aebebf;font-size:12px}.activity-calendar-relations-v1{display:flex;flex-wrap:wrap;gap:8px}.activity-calendar-relations-v1 button{background:#253831;color:#d8e9df;border:1px solid #476456;border-radius:8px;padding:7px 9px}@media(max-width:700px){.activity-calendar-page-v1{padding:12px}.activity-calendar-toolbar-v1{display:grid;grid-template-columns:1fr 1fr}.activity-calendar-toolbar-v1 label:first-child{grid-column:1/-1}}`;
      document.head.append(style);
    }
    const key = `alianca-activity-canvas-v1:${page.dataset.activityCalendar}`;
    const board = page.querySelector("[data-activity-board]");
    const nodes = [...page.querySelectorAll("[data-activity-node]")];
    const valid = new Set(nodes.map((node) => node.dataset.activityNode));
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { saved = {}; }
    const positions = saved.positions && typeof saved.positions === "object" ? saved.positions : {};
    let links = Array.isArray(saved.links) ? saved.links.filter((link) => valid.has(link[0]) && valid.has(link[1]) && link[0] !== link[1]) : [];
    if (!saved.links) links = nodes.slice(1).map((node, index) => [nodes[index].dataset.activityNode, node.dataset.activityNode]);
    const persist = () => { try { localStorage.setItem(key, JSON.stringify({ positions, links })); } catch { /* storage unavailable */ } };
    nodes.forEach((node, index) => {
      const point = positions[node.dataset.activityNode] || { x: 35 + index * 285, y: 90 + (index % 2) * 188 };
      node.style.left = `${Math.max(0, Math.min(1075, Number(point.x) || 0))}px`;
      node.style.top = `${Math.max(58, Math.min(450, Number(point.y) || 58))}px`;
    });
    const svg = page.querySelector("[data-activity-links]");
    const relations = page.querySelector("[data-activity-relations]");
    const draw = () => {
      svg.replaceChildren(); relations.replaceChildren();
      links.forEach(([source, target], index) => {
        const a = nodes.find((node) => node.dataset.activityNode === source), b = nodes.find((node) => node.dataset.activityNode === target);
        if (!a || !b || a.hidden || b.hidden) return;
        const x1 = a.offsetLeft + a.offsetWidth / 2, y1 = a.offsetTop + a.offsetHeight / 2;
        const x2 = b.offsetLeft + b.offsetWidth / 2, y2 = b.offsetTop + b.offsetHeight / 2;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`);
        path.setAttribute("fill", "none"); path.setAttribute("stroke", "#79bb95"); path.setAttribute("stroke-width", "2"); path.setAttribute("stroke-dasharray", "6 4"); svg.append(path);
        const button = document.createElement("button"); button.type = "button";
        button.textContent = `${a.querySelector("h2")?.textContent} → ${b.querySelector("h2")?.textContent} ×`;
        button.title = "Remover relação"; button.addEventListener("click", () => { links.splice(index, 1); persist(); draw(); }); relations.append(button);
      });
    };
    const filter = () => {
      const query = page.querySelector("[data-activity-canvas-search]").value.toLocaleLowerCase("pt-BR");
      const status = page.querySelector("[data-activity-canvas-status]").value;
      nodes.forEach((node) => { node.hidden = Boolean((query && !node.textContent.toLocaleLowerCase("pt-BR").includes(query)) || (status && node.dataset.status !== status)); });
      page.querySelector("[data-activity-canvas-count]").textContent = `${nodes.filter((node) => !node.hidden).length} de ${nodes.length} atividades`;
      draw();
    };
    page.querySelector("[data-activity-canvas-search]").addEventListener("input", filter);
    page.querySelector("[data-activity-canvas-status]").addEventListener("change", filter);
    let connecting = false, origin = null;
    page.querySelector("[data-activity-canvas-connect]").addEventListener("click", (event) => {
      connecting = !connecting; origin = null; nodes.forEach((node) => delete node.dataset.selected);
      event.currentTarget.dataset.active = String(connecting);
      page.querySelector("[data-activity-canvas-hint]").textContent = connecting ? "Selecione o card de origem e depois o card de destino." : "Arraste pelo topo de cada card. Para criar uma relação, clique em “Relacionar cards” e selecione origem e destino.";
    });
    page.querySelector("[data-activity-canvas-reset]").addEventListener("click", () => {
      nodes.forEach((node, index) => { node.style.left = `${35 + index * 285}px`; node.style.top = `${90 + (index % 2) * 188}px`; positions[node.dataset.activityNode] = { x: node.offsetLeft, y: node.offsetTop }; });
      persist(); draw();
    });
    page.querySelector("[data-activity-canvas-export]").addEventListener("click", () => {
      const data = [["Etapa", "Atividade", "Situação", "Dia aproximado", "Relacionada a"], ...nodes.filter((node) => !node.hidden).map((node) => [page.dataset.activityCalendar, node.querySelector("h2")?.textContent || "", node.dataset.status, Math.floor(node.offsetLeft / (board.clientWidth / 14)) + 1, links.filter((link) => link[0] === node.dataset.activityNode).map((link) => link[1]).join(", ")])];
      const csv = "\uFEFF" + data.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = `atividades-${page.dataset.activityCalendar}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    nodes.forEach((node) => {
      node.addEventListener("click", (event) => {
        if (!connecting || event.target.closest("button, [data-activity-drag]")) return;
        const id = node.dataset.activityNode;
        if (!origin) { origin = id; node.dataset.selected = "true"; return; }
        if (origin !== id && !links.some((link) => link[0] === origin && link[1] === id)) { links.push([origin, id]); persist(); draw(); }
        nodes.forEach((item) => delete item.dataset.selected); origin = null;
      });
      node.querySelector("[data-activity-canvas-open]").addEventListener("click", (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const model = (executionModel.stages || []).find((item) => item.key === page.dataset.activityCalendar);
        if (!model) return;
        appStore.set({ view: "activities", selectedStageV9: model.key, selectedActivity: `${model.key}:${node.dataset.activityNode}`, stageSelected: true, activityDedicated: false, stageActivityDedicatedV9: true, lastAction: `Abriu ${node.querySelector("h2")?.textContent}` });
      });
      const handle = node.querySelector("[data-activity-drag]");
      handle.addEventListener("pointerdown", (event) => {
        if (connecting) return;
        event.preventDefault(); handle.setPointerCapture(event.pointerId);
        const left = node.offsetLeft, top = node.offsetTop, x = event.clientX, y = event.clientY;
        const move = (motion) => { node.style.left = `${Math.max(0, Math.min(board.clientWidth - node.offsetWidth, left + motion.clientX - x))}px`; node.style.top = `${Math.max(58, Math.min(board.clientHeight - node.offsetHeight, top + motion.clientY - y))}px`; draw(); };
        const end = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", end); handle.removeEventListener("pointercancel", end); positions[node.dataset.activityNode] = { x: node.offsetLeft, y: node.offsetTop }; persist(); };
        handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", end);
      });
    });
    draw();
    return result;
  };
}

