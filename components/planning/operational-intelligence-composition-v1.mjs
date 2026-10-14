import { createActionsPageV1 } from "./actions-page-v1.mjs?v=actions-page-v2";
import { createRaciPageV1 } from "./raci-page-v1.mjs?v=raci-page-v2";
import { createRaidPageV1 } from "./raid-page-v1.mjs?v=raid-page-v2";
import { createPertNodeServiceV1, createPertPageRendererV1 } from "./pert-workspace-v1.mjs?v=pert-workspace-v2";

/** Compose the shared PERT, actions, RACI, and RAID projections over app state. */
export const createOperationalIntelligenceCompositionV1 = ({
  ViewLayer,
  appStore,
  demoData,
  extensionStage,
  esc,
  ico,
  notify,
  browser = globalThis,
} = {}) => {
  const OPERATIONAL_PHASES = [
    "Identificar",
    "Preparar",
    "Liberar",
    "Executar",
    "Verificar",
  ];
  const OPERATIONAL_ACTIONS = [
    {
      id: "AI-A01",
      label: "Pavimentar Q3",
      impact: 92,
      readiness: 84,
      phase: 2,
      track: "Frente de execução",
      owner: "Carlos Mendes",
      eta: "Hoje · 14:00",
      blocker: "Medição anterior validada",
      relation: "Pavimentação",
    },
    {
      id: "AI-A02",
      label: "Instalar postes · rua B",
      impact: 86,
      readiness: 72,
      phase: 1,
      track: "Responsabilidade",
      owner: "Paula Nascimento",
      eta: "Amanhã · 08:00",
      blocker: "Confirmar equipe da concessionária",
      relation: "Rede elétrica",
    },
    {
      id: "AI-A03",
      label: "Comprar tubos PEAD",
      impact: 79,
      readiness: 47,
      phase: 1,
      track: "Suprimento",
      owner: "Mariana Lopes",
      eta: "Hoje · 11:30",
      blocker: "Aprovar cotação final",
      relation: "Drenagem",
    },
    {
      id: "AI-A04",
      label: "Liberar medição drenagem",
      impact: 88,
      readiness: 91,
      phase: 3,
      track: "Frente de execução",
      owner: "Carlos Mendes",
      eta: "Agora",
      blocker: "Sem bloqueios",
      relation: "Drenagem",
    },
    {
      id: "AI-A06",
      label: "Conferir estoque de brita",
      impact: 61,
      readiness: 68,
      phase: 2,
      track: "Suprimento",
      owner: "Mariana Lopes",
      eta: "Hoje · 16:30",
      blocker: "Contagem física em andamento",
      relation: "Pavimentação",
    },
  ];
  const ACTION_TRACK_STEPS = {
    "Frente de execução": [
      "Validar predecessora",
      "Confirmar equipe e frente",
      "Liberar execução",
      "Executar e medir",
      "Registrar evidência e liberar próxima",
    ],
    Suprimento: [
      "Detectar necessidade",
      "Validar saldo e especificação",
      "Cotar / aprovar compra",
      "Receber e inspecionar",
      "Reservar material e liberar frente",
    ],
    Responsabilidade: [
      "Detectar atividade sem dono",
      "Definir R/A/C/I",
      "Confirmar agenda e contrato",
      "Executar atribuição",
      "Confirmar entrega e evidência",
    ],
  };
  const PERT_GRAPH = {
    nodes: [
      { id: "scope", label: "Preparar frente", x: 7, y: 18, owner: "Mariana Lopes", material: "Projeto · equipe", contract: "Ordem de serviço", progress: 100 },
      { id: "survey", label: "Conferir locação e cotas", x: 29, y: 9, owner: "Carlos Mendes", material: "Topografia", contract: "Serviço técnico", progress: 100 },
      { id: "materials", label: "Confirmar materiais", x: 29, y: 52, owner: "Mariana Lopes", material: "Tubos · brita · cimento", contract: "PE-2025-040", progress: 76 },
      { id: "execute", label: "Executar frente principal", x: 53, y: 30, owner: "Carlos Mendes", material: "Equipe + equipamentos", contract: "Contrato de execução", progress: 62 },
      { id: "measure", label: "Medição de avanço", x: 73, y: 12, owner: "Carlos Mendes", material: "Boletim de medição", contract: "BM-06/2024", progress: 25 },
      { id: "inspect", label: "Inspeção / validação", x: 73, y: 55, owner: "Paula Nascimento", material: "Checklist · fotos", contract: "Controle de qualidade", progress: 0 },
      { id: "release", label: "Liberar frente seguinte", x: 89, y: 33, owner: "Mariana Lopes", material: "Agenda · equipe", contract: "Liberação operacional", progress: 0 },
    ],
    edges: [
      ["scope", "survey"], ["scope", "materials"], ["survey", "execute"],
      ["materials", "execute"], ["execute", "measure"], ["execute", "inspect"],
      ["measure", "release"], ["inspect", "release"],
    ],
  };
  const operationalActions = () => {
    const state = appStore.get();
    const agenda = Array.isArray(state.operationalAgenda)
      ? state.operationalAgenda
      : [];
    if (agenda.length) {
      return agenda.slice(0, 18).map((item, index) => {
        const blocked = Array.isArray(item.logicalRequirements)
          ? item.logicalRequirements.filter(Boolean)
          : [];
        const shortages = Array.isArray(item.materialShortfalls)
          ? item.materialShortfalls.map((entry) => entry?.name || entry?.description).filter(Boolean)
          : [];
        const ready = !/bloqueado|aguardando/i.test(String(item.status || ""));
        const progress = Math.max(0, Math.min(100, Number(item.stageProgress) || 0));
        const kind = item.kind || item.properties?.kind || "execution";
        return {
          id: item.id || `agenda-action-${index + 1}`,
          label: item.title || "Ação operacional",
          impact: Math.max(35, Math.min(98, 92 - index * 3)),
          readiness: ready ? Math.max(55, Math.min(96, 70 + progress * 0.25)) : Math.max(15, 48 - blocked.length * 8 - shortages.length * 5),
          phase: /governance|evidence/i.test(kind) ? 4 : /planning/i.test(kind) ? 1 : ready ? 3 : 2,
          track: item.decisionBand === "execute"
            ? "Frente de execução"
            : item.decisionBand === "material-block"
              ? "Suprimento"
              : "Responsabilidade",
          owner: item.owner || "Responsável a definir",
          eta: item.plannedStart || "A programar",
          blocker: blocked.concat(shortages).join(" · ") || item.nextStep || "Sem bloqueio operacional",
          relation: item.stageName || "Etapa operacional",
          referenceDescription: item.referenceDescription || "",
          requirements: item.requirements || [],
          materialRequirements: item.materialRequirements || [],
        };
      });
    }
    const saved = state.aiActions;
    return Array.isArray(saved) && saved.length
      ? saved.map((item) => ({ ...item }))
      : OPERATIONAL_ACTIONS.map((item) => ({ ...item }));
  };

  const currentPertNodes = createPertNodeServiceV1({ appStore, graph: PERT_GRAPH });
  ViewLayer.prototype.pert = createPertPageRendererV1({
    graph: PERT_GRAPH,
    appStore,
    extensionStage,
    currentPertNodes,
    esc,
    ico,
  });

  const actionsPageV1 = createActionsPageV1({
    appStore,
    extensionStage,
    operationalActions,
    ACTION_TRACK_STEPS,
    OPERATIONAL_PHASES,
    esc,
    ico,
    notify,
    window: browser.window,
    getWorkerAssistant: () => browser.belavistaWorkerAssistant,
    Date: browser.Date,
  });

  const raciPageV1 = createRaciPageV1({
    appStore,
    extensionStage,
    esc,
    ico,
    notify,
    clone: (value) => browser.structuredClone(value),
  });
  ViewLayer.prototype.raci = raciPageV1.render;
  const raidPageV1 = createRaidPageV1({
    appStore,
    extensionStage,
    esc,
    ico,
    notify,
    prompt: (...args) => browser.prompt(...args),
    Date: browser.Date,
  });
  const operationalRaid = raidPageV1.operationalRaid;
  ViewLayer.prototype.raid = raidPageV1.render;

  return Object.freeze({
    operationalActions,
    currentPertNodes,
    actionsPageV1,
    raciPageV1,
    raidPageV1,
    operationalRaid,
  });
};
