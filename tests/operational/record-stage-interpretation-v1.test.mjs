import test from 'node:test';
import assert from 'node:assert/strict';
import { extractInstantRecordOcr, runOperationalAssistant } from '../../worker/src/nvidia.js';
import { routeRequest } from '../../worker/src/routes.js';
import {
  buildRecordInterpretationV1,
  resolveRequestStageV1,
  resolveVisualStageV1
} from '../../record-stage-interpretation-v1.mjs';

const stages = [
  { key: 'earthwork', name: 'Terraplanagem', executionProfile: { typicalDescription: 'Corte, aterro e compactação do solo.', requestHints: ['Regularizar o terreno'] } },
  { key: 'water', name: 'Rede de Água', executionProfile: { typicalDescription: 'Assentamento, união e teste de tubulação de água.', requestHints: ['Tubo PEAD', 'Teste de estanqueidade'] }, activities: [{ id: 'water-pipe', name: 'Assentar tubulação', description: 'Instalação e conexão da rede de água' }] },
  { key: 'paving', name: 'Pavimentação', executionProfile: { typicalDescription: 'Execução de base e revestimento viário.' } }
];

test('a etapa escrita pela pessoa prevalece sobre a etapa selecionada e a sugestão do OCR', () => {
  const result = resolveVisualStageV1({
    message: 'Leia a nota e aloque na Rede de Água.',
    item: { stageKey: 'earthwork', stageName: 'Terraplanagem' },
    stages,
    selectedStageKey: 'earthwork'
  });
  assert.equal(result.stage.key, 'water');
  assert.equal(result.source, 'user-description');
});

test('sem etapa explícita no texto, usa a sugestão OCR canônica antes da etapa selecionada', () => {
  const result = resolveVisualStageV1({
    message: 'Leia esta nota fiscal.',
    item: { stageName: 'Rede de Agua' },
    stages,
    selectedStageKey: 'earthwork'
  });
  assert.equal(result.stage.key, 'water');
  assert.equal(result.source, 'ocr-suggestion');
});

test('anexo sem etapa explícita ou sugestão OCR não herda a etapa selecionada', () => {
  const result = resolveVisualStageV1({
    message: 'Leia esta nota fiscal.', item: {}, stages, selectedStageKey: 'earthwork'
  });
  assert.equal(result.stage, null);
  assert.equal(result.source, 'unresolved-attachment-stage');
});

test('OCR anexado sem correspondência não usa a etapa selecionada para abrir solicitação', () => {
  const result = resolveRequestStageV1({
    message: 'Registre a evidência anexa.', recordOcr: { documentType: 'service_evidence', items: [] },
    stages, selectedStageKey: 'water'
  });
  assert.equal(result.stage, null);
  assert.equal(result.source, 'unresolved-attachment-stage');
});

test('a solicitação registra a etapa explicitamente pedida em vez da etapa ativa', () => {
  const result = resolveRequestStageV1({
    message: 'Prepare o registro para Rede de Água.',
    recordOcr: { items: [{ stageKey: 'earthwork', stageName: 'Terraplanagem' }] },
    stages,
    selectedStageKey: 'earthwork'
  });
  assert.equal(result.stage.key, 'water');
});

test('uma etapa citada como exclusão não sobrepõe a etapa de destino explicitamente solicitada', () => {
  const result = resolveRequestStageV1({
    message: 'A observação da nota menciona terraplanagem; não use essa etapa. A etapa explicitamente solicitada é Rede de Água.',
    recordOcr: { items: [] },
    stages,
    selectedStageKey: 'earthwork'
  });
  assert.equal(result.stage.key, 'water');
  assert.equal(result.source, 'user-description');
});

test('menções conflitantes sem uma etapa de destino clara pedem esclarecimento', () => {
  const result = resolveRequestStageV1({
    message: 'A nota cita terraplanagem e Rede de Água.', recordOcr: { items: [] }, stages,
    selectedStageKey: 'earthwork'
  });
  assert.equal(result.stage, null);
  assert.equal(result.source, 'ambiguous-user-description');
});

test('o contexto de interpretação leva texto, OCR e etapas candidatas ao modelo, marcando seleção como não autoritativa', () => {
  const interpretation = buildRecordInterpretationV1({
    message: 'Foto do serviço da Rede de Água, feita hoje às 7h.',
    stages,
    selectedStageKey: 'earthwork',
    recordOcr: {
      documentType: 'purchase_invoice', confidence: 0.93,
      properties: [{ key: 'supplier', label: 'Fornecedor', value: 'Hidro Rede' }],
      items: [{ description: 'Tubo PEAD', itemKind: 'material', quantity: 20, unit: 'm' }]
    }
  });
  assert.deepEqual(interpretation.explicitStage, { key: 'water', name: 'Rede de Água' });
  assert.equal(interpretation.selectedStage.role, 'navigation-context-only');
  assert.equal(interpretation.items[0].description, 'Tubo PEAD');
  assert.equal(interpretation.userDescription, 'Foto do serviço da Rede de Água, feita hoje às 7h.');
  assert.equal(interpretation.stageCandidates.length, 3);
  assert.match(interpretation.stageCandidates[1].executionDescription, /Assentamento, união e teste/);
  assert.match(interpretation.stageCandidates[1].activityHints.join(' '), /Teste de estanqueidade/);
  assert.equal(interpretation.stageCandidates[1].activities[0].name, 'Assentar tubulação');
});

test('o payload multimodal do system model inclui a interpretação estruturada recebida do OCR', async () => {
  const interpretation = buildRecordInterpretationV1({
    message: 'Leia a nota e aloque na Rede de Água.',
    stages,
    selectedStageKey: 'earthwork',
    recordOcr: {
      documentType: 'purchase_invoice', confidence: 0.96,
      properties: [{ key: 'invoiceNumber', label: 'Número da NF', value: '18452' }],
      items: [{ itemKind: 'material', description: 'Tubo PEAD', quantity: 120, unit: 'm' }]
    }
  });
  const previousFetch = globalThis.fetch;
  let requestBody = null;
  globalThis.fetch = async (_url, init = {}) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ text: 'Leitura pronta para revisão.', toolCalls: [] }) } }] }), { status: 200 });
  };
  try {
    await runOperationalAssistant({
      NVIDIA_API_KEY: 'test-key',
      NVIDIA_API_URL: 'https://model.test/chat/completions',
      NVIDIA_MODEL: 'test-model',
      NVIDIA_VISION_MODEL: 'test-vision-model'
    }, {
      message: 'Leia a nota e aloque na Rede de Água.',
      context: { stages, selectedStageKey: 'earthwork', recordInterpretation: interpretation },
      requestContext: { recordInterpretation: interpretation },
      attachment: { name: 'nota.png', mimeType: 'image/png', dataUrl: 'data:image/png;base64,YQ==' }
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
  const prompt = requestBody.messages[1].content[0].text;
  assert.match(prompt, /INTERPRETAÇÃO DE ANEXO \(OCR \+ DESCRIÇÃO\)/);
  assert.match(prompt, /Tubo PEAD/);
  assert.match(prompt, /Rede de Água/);
  assert.match(prompt, /navigation-context-only/);
  assert.match(prompt, /etapa explicitamente citada pela pessoa prevalece/i);
});

test('a rota do Worker executa OCR antes do system model e devolve recordOcr estruturado', async () => {
  const previousFetch = globalThis.fetch;
  const upstreamCalls = [];
  globalThis.fetch = async (_url, init = {}) => {
    const request = JSON.parse(init.body);
    upstreamCalls.push(request);
    const isOcr = JSON.stringify(request.messages).includes('extrator OCR multimodal');
    const content = isOcr
      ? JSON.stringify({ documentType: 'purchase_invoice', confidence: 0.96, invoiceNumber: '18452', items: [{ itemKind: 'material', description: 'Tubo PEAD', quantity: 120, unit: 'm', stageKey: 'earthwork', stageName: 'Terraplanagem' }], dynamicFields: [] })
      : JSON.stringify({ text: 'Nota lida; item pronto para revisão.', toolCalls: [] });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  try {
    const response = await routeRequest(new Request('https://worker.test/api/ai/vision-reasoning', {
      method: 'POST',
      headers: { authorization: 'Bearer test-service-token', 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'Leia a nota e aloque na Rede de Água.',
        view: 'workers',
        context: { stages, selectedStageKey: 'earthwork', selectedStageName: 'Terraplanagem' },
        attachment: { name: 'nf-18452.png', mimeType: 'image/png', dataUrl: `data:image/png;base64,${'A'.repeat(128)}` }
      })
    }), {
      BELAVISTA_API_TOKEN: 'test-service-token',
      NVIDIA_API_KEY: 'test-key',
      NVIDIA_API_URL: 'https://model.test/chat/completions',
      NVIDIA_REASONING_API_URL: 'https://model.test/chat/completions',
      NVIDIA_MODEL: 'test-model',
      NVIDIA_VISION_MODEL: 'test-vision-model',
      NVIDIA_RECORD_OCR_MODELS: 'test-ocr-model',
      NVIDIA_RECORD_OCR_RETRIES: '0'
    }, { waitUntil() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(upstreamCalls.length, 2);
    assert.match(JSON.stringify(upstreamCalls[0].messages), /userDescription/);
    assert.match(JSON.stringify(upstreamCalls[0].messages), /Rede de Água/);
    assert.match(JSON.stringify(upstreamCalls[1].messages), /INTERPRETAÇÃO DE ANEXO/);
    assert.match(JSON.stringify(upstreamCalls[1].messages), /Tubo PEAD/);
    assert.match(JSON.stringify(upstreamCalls[1].messages), /navigation-context-only/);
    assert.equal(payload.recordOcr.items[0].description, 'Tubo PEAD');
    assert.equal(payload.recordOcr.items[0].stageName, 'Terraplanagem');
    assert.match(JSON.stringify(upstreamCalls[0].messages), /Assentamento, união e teste de tubulação de água/);
    assert.match(JSON.stringify(upstreamCalls[0].messages), /descrição típica das etapas/);
    assert.match(JSON.stringify(upstreamCalls[0].messages), /never-allocation-fallback/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('o prompt multimodal lê a descrição junto com a foto de serviço e normaliza evidência de serviço', async () => {
  const previousFetch = globalThis.fetch;
  let requestBody = null;
  globalThis.fetch = async (_url, init = {}) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      documentType: 'service_evidence', confidence: 0.92,
      serviceEvidence: {
        actionDescription: 'Assentamento de tubulação de água',
        visualDescription: 'Equipe posicionando tubo em vala aberta.',
        observedDate: '', observedTime: '', stageKey: 'water', stageName: 'Rede de Água',
        activityId: 'water-pipe', activityName: 'Assentar tubulação', confidence: 0.9
      }, items: []
    }) } }] }), { status: 200 });
  };
  try {
    const result = await extractInstantRecordOcr({
      NVIDIA_API_KEY: 'test-key', NVIDIA_API_URL: 'https://model.test/chat/completions',
      NVIDIA_RECORD_OCR_MODELS: 'test-ocr-model', NVIDIA_RECORD_OCR_RETRIES: '0'
    }, {
      attachment: { name: 'foto-servico.jpg', mimeType: 'image/jpeg', dataUrl: `data:image/jpeg;base64,${'A'.repeat(128)}` },
      context: {
        userDescription: 'Foto de hoje: equipe assentando tubo da rede de água na vala.',
        selectedStageKey: 'earthwork', selectedStageName: 'Terraplanagem', stages
      }
    });
    const prompt = requestBody.messages[0].content[0].text;
    assert.match(prompt, /descrição escrita pela pessoa/);
    assert.match(prompt, /equipe assentando tubo da rede de água na vala/);
    assert.match(prompt, /etapa selecionada.*NUNCA a use como destino automático/i);
    assert.match(prompt, /Assentamento, união e teste de tubulação de água/);
    assert.equal(result.documentType, 'service_evidence');
    assert.equal(result.serviceEvidence.actionDescription, 'Assentamento de tubulação de água');
    assert.equal(result.items[0].itemKind, 'servico');
    assert.equal(result.items[0].activityName, 'Assentar tubulação');
    assert.equal(result.items[0].quantity, null);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
