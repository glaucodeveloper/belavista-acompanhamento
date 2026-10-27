import RAID_DATA from "../../frontend/src/data/operational-raid.json" with { type: "json" };

const RAID_DEFAULTS = RAID_DATA.items;
const RAID_TARGETS = RAID_DATA.targets;

/** Complete RAID workspace: source renderer and its drag, link, and add interactions. */
export const createRaidPageV1 = ({
  appStore,
  extensionStage,
  esc,
  ico,
  notify,
  prompt: promptFn = (...args) => globalThis.prompt(...args),
  Date: DateCtor = Date,
} = {}) => {
  const operationalRaid = () => {
    const saved = appStore.get().raidItems;
    return Array.isArray(saved) && saved.length
      ? saved.map((item) => ({ ...item }))
      : RAID_DEFAULTS.map((item) => ({ ...item }));
  };

  const render = function () {
    const stage = extensionStage(),
      items = operationalRaid(),
      selectedId = appStore.get().selectedRaidItem || items[0].id,
      selected = items.find((item) => item.id === selectedId) || items[0],
      zones = [
        ["risk", "Riscos", "Probabilidade × impacto"],
        ["assumption", "Premissas", "Hipóteses que sustentam o plano"],
        ["issue", "Problemas", "Ocorrências que exigem ação"],
        ["dependency", "Dependências", "Condições antes do próximo passo"],
      ];
    const zoneHtml = zones
      .map(
        ([kind, label, desc]) =>
          `<section class="raid-zone zone-${kind}" data-raid-zone="${kind}"><header><span>${esc(label)}</span><small>${esc(desc)}</small><b>${items.filter((item) => item.kind === kind).length}</b></header><div class="raid-zone-list">${items
            .filter((item) => item.kind === kind)
            .map(
              (item) =>
                `<article class="raid-card level-${item.level} ${item.id === selected.id ? "selected" : ""}" draggable="true" data-raid-card="${item.id}"><div><span>${item.level.toUpperCase()}</span><small>${esc(item.linked || "Sem vínculo")}</small></div><b>${esc(item.title)}</b><p>${esc(item.detail)}</p></article>`,
            )
            .join("")}</div><button type="button" class="raid-add" data-raid-add="${kind}">＋ Adicionar</button></section>`,
      )
      .join("");
    const targets = RAID_TARGETS;
    return `<div class="stage-extension-page raid-page"><div class="extension-head"><div><span class="activity-kind">RAID · ${esc(stage.name)}</span><h1>Pendências e atenção operacional</h1><p>Riscos, premissas, problemas e dependências ficam no mesmo workspace e podem ser movidos entre zonas ou vinculados diretamente a uma atividade.</p></div><div class="extension-head-actions"><button class="ghost" data-view="pert">${ico("git-branch")} Dependências PERT</button><button class="primary" data-view="activities">${ico("sparkles")} Abrir atividades</button></div></div><div class="raid-workspace">${zoneHtml}</div><div class="raid-bottom"><section class="raid-activity-targets"><div><span class="activity-kind">VINCULAR À ATIVIDADE</span><h2>Arraste uma pendência para uma entidade</h2></div><div>${targets.map((target) => `<button type="button" data-raid-target="${esc(target)}">${ico("link-2")} ${esc(target)}</button>`).join("")}</div></section><aside class="raid-inspector"><span class="activity-kind">${selected.kind.toUpperCase()} · ${selected.level.toUpperCase()}</span><h2>${esc(selected.title)}</h2><p>${esc(selected.detail)}</p><dl><dt>Vínculo atual</dt><dd>${esc(selected.linked || "Sem vínculo")}</dd><dt>Etapa</dt><dd>${esc(stage.name)}</dd><dt>Origem</dt><dd>IA + registros + cronograma</dd></dl><button class="ghost" data-view="records">${ico("clipboard-pen-line")} Abrir evidências</button></aside></div></div>`;
  };

  const bind = function (layer, view) {
    if (view !== "raid") return;
    let draggingId = "";
    layer.querySelectorAll("[data-raid-card]").forEach((card) => {
      card.addEventListener("click", () =>
        appStore.set({
          selectedRaidItem: card.dataset.raidCard,
          lastAction: `Selecionou pendência ${card.dataset.raidCard}`,
        }),
      );
      card.addEventListener("dragstart", (event) => {
        draggingId = card.dataset.raidCard;
        event.dataTransfer?.setData("text/plain", draggingId);
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });
    const getId = (event) => event.dataTransfer?.getData("text/plain") || draggingId;
    layer.querySelectorAll("[data-raid-zone]").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("drag-over");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("drag-over");
        const id = getId(event),
          items = operationalRaid().map((item) => item.id === id ? { ...item, kind: zone.dataset.raidZone } : item);
        appStore.set({
          raidItems: items,
          selectedRaidItem: id,
          lastAction: `Moveu ${id} para ${zone.dataset.raidZone}`,
        });
        notify("Item RAID movido para a nova zona.", "success");
      });
    });
    layer.querySelectorAll("[data-raid-target]").forEach((target) => {
      target.addEventListener("dragover", (event) => {
        event.preventDefault();
        target.classList.add("drag-over");
      });
      target.addEventListener("dragleave", () => target.classList.remove("drag-over"));
      target.addEventListener("drop", (event) => {
        event.preventDefault();
        target.classList.remove("drag-over");
        const id = getId(event),
          linked = target.dataset.raidTarget,
          items = operationalRaid().map((item) => item.id === id ? { ...item, linked } : item);
        appStore.set({
          raidItems: items,
          selectedRaidItem: id,
          lastAction: `Vinculou ${id} a ${linked}`,
        });
        notify(`Pendência vinculada a ${linked}.`, "success");
      });
    });
    layer.querySelectorAll("[data-raid-add]").forEach((button) =>
      button.addEventListener("click", () => {
        const title = promptFn("Título da nova pendência:");
        if (!title?.trim()) return;
        const detail = promptFn("Descrição / condição observada:") || "Sem descrição adicional.",
          item = {
            id: `RAID-${DateCtor.now().toString(36).toUpperCase()}`,
            kind: button.dataset.raidAdd,
            title: title.trim(),
            detail: detail.trim(),
            level: "médio",
            linked: extensionStage().name,
          };
        appStore.set({
          raidItems: [...operationalRaid(), item],
          selectedRaidItem: item.id,
          lastAction: `Criou item RAID ${item.title}`,
        });
        notify("Nova pendência adicionada ao RAID.", "success");
      }),
    );
  };

  return Object.freeze({ render, bind, operationalRaid });
};
