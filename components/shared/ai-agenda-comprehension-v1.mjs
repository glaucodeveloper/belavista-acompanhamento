/** User-editable guidance shared by the administrative and worker assistants. */
export const AI_AGENDA_COMPREHENSION_DEFAULTS_V1 = Object.freeze({
  reading: "Leia texto, chat, imagem e OCR em conjunto. Extraia serviço, material, quantidade, etapa, atividade, data, horário, responsável e evidência; marque o que não foi informado.",
  determination: "Associe serviço e material à etapa e atividade somente quando houver suporte claro. Diferencie fato observado, relato e inferência. Se a etapa ou a ação for ambígua, peça esclarecimento antes de criar um compromisso.",
  generation: "Quando houver ação operacional identificada, prepare um compromisso Pendente com título, etapa, atividade, materiais e detalhes conhecidos. Use data e horário informados; se faltarem, escolha uma janela livre e indique o que precisa de confirmação humana.",
  autoCreatePending: true,
});

export const normalizeAiAgendaComprehensionV1 = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    reading: String(source.reading ?? AI_AGENDA_COMPREHENSION_DEFAULTS_V1.reading).trim().slice(0, 1200),
    determination: String(source.determination ?? AI_AGENDA_COMPREHENSION_DEFAULTS_V1.determination).trim().slice(0, 1200),
    generation: String(source.generation ?? AI_AGENDA_COMPREHENSION_DEFAULTS_V1.generation).trim().slice(0, 1200),
    autoCreatePending: source.autoCreatePending !== false,
  };
};

export const aiAgendaInstructionV1 = (value) => {
  const config = normalizeAiAgendaComprehensionV1(value);
  return `Compreensão da agenda configurada pela operação. Leitura: ${config.reading} Determinação: ${config.determination} Geração: ${config.generation} ${config.autoCreatePending ? "É permitido criar apenas apontamentos Pendentes sustentados pelos dados conhecidos." : "Não chame agenda.create_pending nem crie apontamentos pela IA; apresente somente uma sugestão para revisão."}`;
};
