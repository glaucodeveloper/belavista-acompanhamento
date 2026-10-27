/** Recovery inference request for Worker chat when its TypeScript owner is absent. */
const LEGACY_OPERATIONAL_EXECUTION_INSTRUCTION_V1 = `Trate pedidos operacionais como intenção de execução, não apenas como perguntas. Leia cada imagem junto com o texto disponível e primeiro distinga nota/recibo de compra, foto de evidência de serviço e outro documento. Em nota, extraia todos os itens físicos como materiais e linhas de mão de obra faturada como serviço. Em foto de campo, quando a pessoa informar somente a etapa, use essa informação apenas como destino e identifique a ação pela imagem; separe observação visual e não invente data/hora, equipe, quantidade ou conclusão. Se a ação não estiver visualmente identificável com segurança, pergunte qual atividade representa a evidência, sem criar registro. Compare a ação visual com a descrição típica, pistas e atividades de todas as etapas candidatas e associe a atividade quando houver suporte. A etapa aberta/selecionada é somente navegação, nunca destino automático. Só grave a sugestão sustentada por uma candidata canônica; se não houver um único encaixe seguro, não chame ferramenta nem crie solicitação/registro órfão: pergunte qual etapa ou atividade deve receber a evidência. Mantenha toda leitura como Pendente para revisão humana. Quando compreender etapa ou atividade mas faltarem dados, prepare um apontamento Pendente e pergunte só o que falta. Não fabrique fatos ou execução; diferencie fato observado, relato da pessoa, inferência e dado a confirmar.`;

const LEGACY_CAPABILITIES_V1 = [
  'observar eventos', 'editar entradas', 'organizar agenda', 'programar cronograma',
  'recalcular materiais e equipe', 'preparar notificações locais',
  'criar apontamento pendente', 'solicitar documento operacional',
];

export async function requestLegacyWorkerContextChatReplyV1(input) {
  const summary = String(input.summary || 'estado operacional ainda não informado');
  try {
    const endpoint = input.attachment ? '/api/ai/vision-reasoning' : '/api/ai';
    const response = await input.apiFetch(endpoint, {
      method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: input.message,
        view: input.pathname.startsWith('/admin') ? (input.applicationState?.view || 'control') : 'workers',
        instruction: `${String(input.options?.instruction || input.defaultInstruction || LEGACY_OPERATIONAL_EXECUTION_INSTRUCTION_V1)} ${input.agendaInstruction}`,
        requestContext: input.options?.requestContext && typeof input.options.requestContext === 'object' ? input.options.requestContext : null,
        context: {
          ...input.context,
          selectedStageKey: input.selectedStageKey,
          selectedStageName: input.selectedStageName,
          mapContext: input.mapContext,
          recordInterpretation: input.recordInterpretation,
          summary,
          capabilities: LEGACY_CAPABILITIES_V1,
        },
        attachment: input.attachment
          ? { name: input.attachment.name, mimeType: input.attachment.mimeType, dataUrl: input.attachment.dataUrl }
          : null,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return {
      text: String(payload.text || '').trim() || 'O endpoint de IA retornou uma resposta vazia.',
      toolCalls: Array.isArray(payload.toolCalls) ? payload.toolCalls : [],
      recordOcr: payload.recordOcr || null,
      attachment: payload.attachment || null,
      source: 'endpoint',
      audit: `Endpoint consultado${payload.vision ? ` · NVIDIA ${payload.model || 'multimodal reasoning'}` : ''} · ${summary}`,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      text: `Endpoint de IA indisponível · ${detail}`,
      source: 'error',
      audit: `Nenhuma resposta local foi usada · ${summary}`,
    };
  }
}
