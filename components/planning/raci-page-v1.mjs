import RACI_DATA from "../../frontend/src/data/operational-raci.json" with { type: "json" };

const RACI_ACTORS = RACI_DATA.actors;
const RACI_TASKS = RACI_DATA.tasks;
const raciMeaning = RACI_DATA.meaning;
const roleOrder = RACI_DATA.roleOrder;
const defaultRaci = () => structuredClone(RACI_DATA.defaultAssignments);

/** RACI page renderer and event category, with application state injected. */
export const createRaciPageV1 = ({ appStore, extensionStage, esc, ico, notify, clone } = {}) => {
  const render = function () {
    const stage = extensionStage(),
      assignments = appStore.get().raciAssignments || defaultRaci(),
      selectedKey = appStore.get().selectedRaciCell || "t3:carlos",
      parts = selectedKey.split(":"),
      task = RACI_TASKS.find((item) => item.id === parts[0]) || RACI_TASKS[2],
      actor = RACI_ACTORS.find((item) => item.id === parts[1]) || RACI_ACTORS[0],
      role = assignments?.[task.id]?.[actor.id] || "—";
    const head = RACI_ACTORS.map(
      (item) => `<div class="raci-actor"><span class="avatar">${item.name[0]}</span><b>${esc(item.name)}</b><small>${esc(item.role)}</small></div>`,
    ).join("");
    const rows = RACI_TASKS.map(
      (item) => `<div class="raci-task"><span><b>${esc(item.label)}</b><small>${esc(stage.name)}</small></span></div>${RACI_ACTORS.map((person) => {
        const value = assignments?.[item.id]?.[person.id] || "—",
          key = `${item.id}:${person.id}`;
        return `<button type="button" class="raci-cell role-${value.toLowerCase()} ${key === selectedKey ? "selected" : ""}" data-raci-cell="${key}" title="Clique para inspecionar · duplo clique para alternar R/A/C/I"><b>${value}</b><small>${value === "—" ? "definir" : raciMeaning[value].split(" · ")[0]}</small></button>`;
      }).join("")}`,
    ).join("");
    return `<div class="stage-extension-page raci-page"><div class="extension-head"><div><span class="activity-kind">PESSOAS RESPONSÁVEIS · ${esc(stage.name)}</span><h1>RACI interativa da etapa</h1><p>Atividades nas linhas, pessoas e empresas nas colunas. A célula abre contrato, registros recentes, tarefas e o vínculo de responsabilidade.</p></div><div class="extension-head-actions"><button class="ghost" data-view="activities">${ico("sparkles")} Atividades</button><button class="ghost" data-view="agenda">${ico("calendar-days")} Agenda</button></div></div><div class="raci-layout"><section class="raci-table"><div class="raci-corner"><b>ATIVIDADE</b><small>R · A · C · I</small></div>${head}${rows}</section><aside class="raci-inspector"><span class="activity-kind">${role === "—" ? "SEM VÍNCULO" : raciMeaning[role]}</span><h2>${esc(actor.name)}</h2><p>${esc(task.label)} · ${esc(stage.name)}</p><div class="raci-inspector-grid"><div><small>FUNÇÃO</small><b>${esc(actor.role)}</b></div><div><small>CONTRATO / VÍNCULO</small><b>${esc(actor.contract)}</b></div><div><small>REGISTRO RECENTE</small><b>${esc(task.label)} · hoje 09:45</b></div><div><small>TAREFA RELACIONADA</small><b>Confirmar evidência e próximo responsável</b></div></div><div class="raci-role-legend"><span><b>R</b> executa</span><span><b>A</b> aprova</span><span><b>C</b> consultado</span><span><b>I</b> informado</span></div><div class="raci-actions"><button class="ghost" data-view="records">${ico("clipboard-pen-line")} Abrir registros</button><button class="primary" data-raci-cycle="${selectedKey}">${ico("refresh-cw")} Alterar papel</button></div><small class="raci-hint">Duplo clique em qualquer célula também alterna R → A → C → I → sem vínculo.</small></aside></div></div>`;
  };

  const bind = function (layer, view) {
    if (view !== "raci") return;
    const cycleCell = (key) => {
      const [taskId, actorId] = key.split(":"),
        assignments = clone(appStore.get().raciAssignments || defaultRaci()),
        order = roleOrder,
        current = assignments?.[taskId]?.[actorId] || "—",
        next = order[(order.indexOf(current) + 1) % order.length];
      assignments[taskId] ??= {};
      if (next === "—") delete assignments[taskId][actorId];
      else assignments[taskId][actorId] = next;
      appStore.set({
        raciAssignments: assignments,
        selectedRaciCell: key,
        lastAction: `Alterou RACI ${taskId}/${actorId} para ${next}`,
      });
      notify(`Papel RACI alterado para ${next}.`, "success");
    };
    layer.querySelectorAll("[data-raci-cell]").forEach((cell) => {
      cell.addEventListener("click", () => appStore.set({
        selectedRaciCell: cell.dataset.raciCell,
        lastAction: `Selecionou vínculo RACI ${cell.dataset.raciCell}`,
      }));
      cell.addEventListener("dblclick", (event) => {
        event.preventDefault();
        cycleCell(cell.dataset.raciCell);
      });
    });
    layer.querySelector("[data-raci-cycle]")?.addEventListener(
      "click",
      (event) => cycleCell(event.currentTarget.dataset.raciCycle),
    );
  };

  return Object.freeze({ render, bind });
};
