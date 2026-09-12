# Base de geração de agenda e cronograma físico-operacional · Aliança Park

**Versão de referência:** 2026-09-04  
**Escopo:** documentos de entrada para agenda, cronograma, requisições e reanálise do endpoint NVIDIA.
**Fonte cartográfica:** `assets/data/dwg-georeference.json` · EPSG:31984 · 298 lotes
**Catálogo real de execução:** `development-stage-catalog.mjs` · versão `2026.09.04`
**Fallback de demonstração:** `worker/src/demo-defaults.js` · configuração lite

## 1. Objetivo

Este documento define o conjunto de informações que o gerador de agenda e cronograma deve receber. A execução real usa o catálogo ampliado em `development-stage-catalog.mjs`, a base cartográfica publicada, a configuração versionada de pessoal/equipamentos e os fatos persistidos. O catálogo padrão em `worker/src/demo-defaults.js` permanece apenas como fallback lite para demonstração e testes.

A árvore de diretrizes em `agent-tree.js` define gatilhos e autonomia; a transição de estado é aplicada pelo Worker em `worker/src/operational-loop.js` e `worker/src/strict-nvidia-state.js`.

Quando existir configuração versionada no GitHub, ela substitui o catálogo padrão. Sem configuração remota, o Worker usa os valores padrão descritos aqui.

## 2. Sequência real que alimenta o cronograma

Esta é a sequência de referência do catálogo ampliado. A ordem não representa datas fixas: cada etapa só pode ser agendada quando seus `dependsOn`, `entryGates`, materiais, pessoal, equipamentos, localidade e autorizações estiverem liberados.

| Ordem | `stageId` | Etapa | Depende de | Unidade predominante | Gate de liberação |
|---:|---|---|---|---|---|
| 1 | `legal` | Viabilidade fundiária, urbanística e registral | — | documento, marco, área | enquadramento territorial e matrícula conferidos |
| 2 | `surveys` | Topografia, geotecnia, hidrologia e diagnóstico ambiental | `legal` | ponto, ensaio, relatório | base topográfica e escopo de ensaios aceitos |
| 3 | `design-approvals` | Projetos executivos, licenças e aprovações | `surveys` | prancha, revisão, protocolo | projeto vigente, licença e aprovação aplicável |
| 4 | `mobilization` | Mobilização, segurança e controle do canteiro | `design-approvals` | checklist, equipe, equipamento | autorização de início, PGR e canteiro liberados |
| 5 | `staking-clearing` | Locação, demarcação, limpeza e manejo ambiental | `mobilization` | ponto, m², m³, frente | polígono autorizado e áreas protegidas demarcadas |
| 6 | `earthworks` | Abertura de vias e terraplenagem | `staking-clearing` | m³, viagem, hora-máquina, trecho | eixos, seções, material e drenagem provisória liberados |
| 7 | `drainage` | Drenagem pluvial e proteção contra erosão | `earthworks` | m, unidade, m³, trecho | cota, lançamento e interferências conferidos |
| 8 | `sanitation` | Esgotamento sanitário ou solução individual licenciada | `earthworks`, `design-approvals` | m, unidade, ensaio, setor | solução sanitária aprovada e faixa liberada |
| 9 | `water` | Abastecimento de água para 298 lotes | `earthworks`, `design-approvals` | m, lote, ramal, cavalete, setor | projeto e materiais aprovados; setor liberado |
| 10 | `electrical-base` | Infraestrutura elétrica e iluminação pública — obra civil | `earthworks`, `design-approvals` | poste, m, unidade, ponto | projeto particular Coelba vigente e materiais homologados |
| 11 | `curbs-accessibility` | Meio-fio, sarjetas, calçadas e acessibilidade | `drainage`, `water`, `sanitation`, `electrical-base` | m, m², unidade, trecho | redes enterradas testadas e greide aceito |
| 12 | `paving` | Base e pavimentação em paralelepípedos | `curbs-accessibility` | m², pedra, caminhão, trecho | setor liberado, base e meio-fio aceitos |
| 13 | `social-green` | Áreas verdes, equipamentos, arborização e paisagismo | `paving` | muda, m², unidade, setor | tráfego pesado encerrado e projeto paisagístico liberado |
| 14 | `electrical-connection` | Inspeção, incorporação e ligação Neoenergia Coelba | `electrical-base`, `paving`, `social-green` | protocolo, pendência, inspeção | dossiê, as-built e acesso para vistoria disponíveis |
| 15 | `closeout` | Sinalização, as-built, inspeções e entrega | `paving`, `social-green`, `electrical-connection` | item, documento, aceite | punch list, dossiês e recebimentos consolidados |

### 2.1 Regras de precedência para agenda

- O cronograma deve preservar a dependência entre etapas, mas pode executar atividades paralelas quando elas não compartilham localidade, equipe, equipamento ou faixa de conflito.
- Drenagem, saneamento, água e travessias elétricas devem ser aceitos no setor antes de meio-fio e pavimentação.
- A rede de água deve diferenciar estoque, instalação, teste e atendimento efetivo dos 298 lotes.
- A infraestrutura elétrica pode ser construída antes do acabamento final, mas a ligação externa permanece dependência da Neoenergia Coelba e não é inferida como concluída.
- Áreas sociais e arborização devem ser agendadas depois do tráfego pesado incompatível; manutenção e irrigação continuam como agenda recorrente após o plantio.
- Caixa, material e disponibilidade de equipe alteram prontidão e capacidade; nenhum deles confirma avanço físico sozinho.

## 2.2 Configuração lite de demonstração

| Ordem | Frente | Situação inicial padrão | Dependências de entrada | Unidade predominante |
|---:|---|---:|---|---|
| 1 | Terraplanagem | 100% | levantamento topográfico base | m³, viagem, hora/máquina e trecho |
| 2 | Drenagem pluvial | 74% | terraplanagem | m, m³, trecho e ensaio |
| 3 | Rede de água | 41% | terraplanagem | m, unidade, lote e setor |
| 4 | Rede elétrica | 16% | terraplanagem + projeto elétrico | poste, m de cabo, transformador e ponto |
| 5 | Pavimentação | 4% | drenagem + água liberadas | m², caminhão e trecho |
| 6 | Praças | 0% | pavimentação | m², unidade e área social |
| 7 | Arborização | 0% | pavimentação + área verde liberada | muda, unidade e setor |

Essa ordem é uma base inicial, não uma autorização automática de execução. O agente deve considerar dependências, evidências, materiais, disponibilidade de pessoal, caixa disponível acima da reserva e peculiaridades do serviço.

### Regras de posicionamento operacional

- A rede de água deve ser testada e liberada antes da pavimentação do setor.
- Drenagem deve ser recomposta, compactada e aceita antes de fechar o trecho ou pavimentá-lo.
- A pavimentação só começa em setor com redes enterradas liberadas e base apta.
- A rede elétrica é uma frente tardia: deve respeitar projeto, materiais homologados, inspeção e prazo externo da Neoenergia Coelba.
- Praças e arborização ficam após a consolidação das frentes pesadas, para reduzir dano por trânsito de máquinas.
- O avanço físico vem de medições e evidências registradas; caixa libera capacidade, mas não cria avanço físico.

## 3. Atividades e materiais da configuração inicial

As atividades do catálogo real devem ser convertidas em fichas de agenda com os campos abaixo. Sem esses campos, a atividade pode permanecer como pendência de planejamento, mas não deve entrar como encaixe executável:

| Campo | Obrigatório para agenda | Finalidade |
|---|---|---|
| `stageId` / `activityId` | sim | identificar a frente e a atividade sem duplicidade |
| `localityId` / `localityRule` | sim | ligar a atividade ao lote, quadra, via, trecho, setor ou área social |
| `dependsOn` / `entryGates` | sim | impedir início antes de requisitos e relações liberados |
| `unit` / `targetQuantity` | sim quando houver produção | definir a unidade e o volume que serão planejados |
| `productionRate` | sim para atividade produtiva | converter equipe/equipamento em capacidade diária |
| `materials` | sim | separar necessidade, disponível, reservado, em trânsito e prazo de compra |
| `requiredRoles` / `assignedTeam` | sim | definir formação, quantidade, responsável e disponibilidade |
| `equipment` | sim | verificar máquina, ferramenta, capacidade, inspeção e conflito de uso |
| `durationMinutes` | sim | oferecer duração mínima ou validar a duração calculada |
| `evidenceRequirements` | sim | definir o que permite medição, aceite e propagação |
| `externalConstraints` | quando aplicável | controlar licenças, aprovações, concessionárias e prazos externos |

### 3.1 Como uma atividade vira item de cronograma

O gerador deve seguir este fluxo para cada atividade:

```text
localidade cartográfica válida
  → requisitos e dependências liberados
  → material disponível ou compra com prazo compatível
  → equipe formada e disponível
  → equipamento disponível e inspecionado
  → capacidade produtiva calculada
  → duração e janela de execução
  → agenda por responsável e localidade
  → evidência de medição e critério de saída
```

Para atividades medidas, a duração deve ser calculada pela quantidade restante e pela menor capacidade efetiva:

```text
capacidade efetiva = menor(
  capacidade da equipe,
  capacidade do equipamento,
  material disponível por ciclo,
  frente liberada,
  produção máxima configurada
)

duração produtiva = teto(quantidade restante ÷ capacidade efetiva)
```

Caixa e prazo de compra são gates de prontidão e podem deslocar o início. Não devem ser tratados como uma taxa física de produção. A agenda deve ainda respeitar feriados, jornada, intervalo, indisponibilidade, sobreposição de recursos e prazo externo quando houver.

### 3.2 Localização na base cartográfica

O `localityId` deve apontar para a referência disponível na base DWG/GIS ou para uma localidade confirmada em campo. A classificação mínima é:

| Tipo de localidade | Uso no cronograma | Dado cartográfico atualmente disponível |
|---|---|---|
| `lot` | ramal, cavalete, atendimento e status de lote | 298 centros/áreas publicados |
| `road` / `road-segment` | abertura, drenagem, meio-fio e pavimentação | vias resumidas; geometria detalhada deve ser fornecida quando necessária |
| `curb-walkway` | meio-fio, sarjeta e acessibilidade | 109 polilinhas publicadas |
| `electric-point` | poste, travessia e inspeção elétrica | 24 pontos publicados |
| `sector` | redes e liberação por conjunto de lotes | setor definido pelo projeto/registro operacional |
| `social-green` | praça, arborização e paisagismo | limite deve vir do projeto ou de seleção validada |

O manifesto atual não contém todos os vértices dos polígonos nem comprimentos medidos das vias. Portanto, o gerador não deve inventar extensão, perímetro, corte, aterro ou quantidade a partir de um centro de lote. Quando a atividade exigir geometria detalhada, a agenda deve ficar como `aguardando_localidade` até receber vetor, medição ou confirmação humana.

### 3.3 Saída mínima do cronograma

Cada item agendado deve preservar:

```json
{
  "id": "agenda-earthworks-frente-01",
  "stageId": "earthworks",
  "activityId": "earthworks-internal-haul",
  "localityId": "road-segment-01",
  "status": "scheduled",
  "plannedStart": "2026-09-08T07:00:00-03:00",
  "plannedEnd": "2026-09-10T17:00:00-03:00",
  "unit": "m3",
  "plannedQuantity": 960,
  "productionRate": 320,
  "responsibleId": "foreman-01",
  "teamId": "earthworks-team-a",
  "equipmentIds": ["excavator-01", "truck-02"],
  "blockingRequirements": [],
  "sourceRefs": ["dwg:road-segment-01", "catalog:earthworks"],
  "requiresConfirmation": false
}
```

Uma sugestão da IA deve aparecer como `suggested` até ser validada pela autoridade definida. A agenda persistida deve manter a versão da configuração, o evento que a originou, a localidade, os recursos e os requisitos que permitiram o encaixe.

### Terraplanagem

Atividade inicial: conferir greide e frentes liberadas, com topografia e encarregado. A medição precisa registrar trecho, cota, viagem, hora de máquina ou volume.

### Drenagem pluvial

1. Assentar a rede pluvial do trecho — 3 dias; tubo/manilha e brita.
2. Fazer reaterro e compactação — 2 dias; depende do assentamento e usa areia.

Requisitos críticos: foto da vala, assentamento, cota, juntas, compactação e aceite antes da liberação da camada seguinte.

### Rede de água

1. Executar a rede principal PEAD — 4 dias; tubo PEAD e conexões.
2. Executar ramais e cavaletes do setor — 3 dias; depende da rede principal.
3. Testar e liberar o setor — 1 dia; depende dos ramais.

O requisito de negócio é atender os **298 lotes**. O quantitativo inicial de demonstração é setorial; a cobertura de ramais e cavaletes deve ser recalculada conforme o cadastro efetivo dos lotes, sem tratar o estoque parcial como atendimento total.

### Rede elétrica

1. Implantar postes disponíveis — 4 dias.
2. Lançar cabos e preparar transformadores — 4 dias; depende dos postes.

Materiais: postes, cabos elétricos e transformador. O sistema deve manter separados:

- montagem física concluída;
- projeto aprovado e vigente;
- materiais homologados e rastreados;
- dossiê de inspeção;
- solicitação, vistoria e ligação da Coelba.

### Pavimentação

1. Preparar a base do setor — 3 dias.
2. Assentar pavimento e meio-fio — 5 dias; depende da base.

Referência produtiva configurada: **5.000 pedras por caminhão** e **45 pedras por m²**. A produção teórica é:

```text
m² por caminhão = 5.000 ÷ 45 = 111,11 m²
```

O cálculo efetivo deve descontar a perda cadastrada e limitar a programação pela menor capacidade entre material, equipe, máquina e caixa. A unidade física do registro é m² por trecho; caminhões e peças recebidas são evidências de suprimento.

### Praças e arborização

Praças usam piso externo e acabamento após a estabilização do entorno. Arborização usa mudas por setor, mapa de plantio, irrigação inicial, proteção e manutenção. A execução deve respeitar afastamentos de redes, postes, visibilidade e circulação.

## 4. Fonte mestre: caixa

O caixa operacional é o atributo financeiro mestre para prontidão e distribuição de recursos.

```text
caixa provisionável = entradas - saídas - compromissos - reserva mínima
```

O caixa:

- pode ser alterado somente pelo perfil Dono;
- precisa manter origem, valor, data, categoria e descrição;
- quando aplicável, deve conter comprovante;
- pode reduzir ou liberar compras, agenda e capacidade de frente;
- não substitui medição de produção, aceite ou evidência;
- deve gerar snapshot, auditoria e notificação quando mudar a leitura operacional.

Calibrações de prioridade, orçamento, reserva mínima, requisitos e notificações pertencem ao Administrador. Registros de campo podem ser feitos pelo Encarregado, pelo Dono ou por Administrador conforme a permissão do sistema; todos retornam à mesma análise central.

## 5. Diretrizes declarativas do agente

A árvore em `agent-tree.js` organiza as regras em três raízes:

### Governança

- **Caixa controlado pelo Dono:** `cash.changed` recalcula prontidão; `cash.negative` gera risco financeiro.
- **Calibração administrada:** `calibration.changed` recalcula o estado, mantendo uma nova versão auditável.
- **Completude e evidências:** registros incompletos geram pendência; comprovante ausente impede confirmação automática.

### Obra e produção

- **Terraplanagem:** `production.measured` calcula volume por viagens internas, m³ por caçamba e corte/aterro.
- **Rede de água:** falta de material cria pendência; atividade aceita libera a relação seguinte.
- **Meio-fio:** metragem linear e medição aceita liberam a verificação da pavimentação.
- **Pavimentação:** `production.measured` calcula produção pela relação de pedras, área e perdas.
- **Rede elétrica e Coelba:** `paving.completed` cria solicitação de ligação com confirmação humana; prazo próximo gera alerta automático.

### Lotes, CRM e comissões

- Mensagens de lead são convertidas em fatos estruturados, associadas a lote e completude.
- Reserva, desconto, proposta, contrato e mudança de condição comercial exigem confirmação.
- Pagamento recebido calcula a razão de comissão; fechamento do mês gera o relatório do corretor.

Cada diretriz deve ser lida como:

```text
diretriz → requisitos verificáveis → evento factual → ação → autonomia → auditoria
```

## 6. Eventos que disparam a inferência

Os eventos devem possuir `id`, `type`, data/hora, ator e payload factual. Exemplos:

```text
cash.inflow.recorded / cash.outflow.recorded
stage.updated / activity.updated
production.measured
material.received / material.incomplete
purchase.receipt.received
field.diary.recorded
activity.completed
paving.completed
coelba.deadline-near
lead.message.received / lot.reserve.requested
payment.received / commission.reason.updated
operation.state.requested
```

O Worker deve reprocessar o evento de forma idempotente e preservar o histórico. O payload não deve carregar uma decisão disfarçada: ele informa o fato; a inferência determina consequências.

## 7. Aplicação no endpoint NVIDIA

O ciclo vigente é uma transição estrita de estado completo:

```text
previousState completo + event factual + catálogo de metadados
    ↓
POST NVIDIA_API_URL
    ↓
estado completo novo + análise + rastreio de metadados
```

### Transporte

Por padrão, o Worker usa:

```text
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_API_KEY=...
NVIDIA_STATE_MODEL ou NVIDIA_MODEL
```

O modelo padrão do ciclo estrito é `google/diffusiongemma-26b-a4b-it`, substituível por `NVIDIA_STATE_MODEL`. O segredo permanece no Worker e nunca deve ser exposto ao navegador.

### Contrato de entrada

O endpoint recebe um **prompt único de contexto operacional**. Não devem ser feitas chamadas separadas para etapa, atividade, material, equipe ou equipamento: todos os dados necessários para gerar agenda e cronograma seguem no mesmo JSON da transição.

Esse prompt envia:

- estado completo anterior;
- um único evento factual;
- configuração completa de projeto, cartografia, etapas, pessoal, equipes, equipamentos, materiais e restrições;
- catálogo de metadados de todas as etapas e atividades, incluindo as atividades bloqueadas;
- localidade cartográfica, geometria disponível, unidade de produção, requisitos, evidências e dependências;
- modo `strict-ai-state-transition`;
- exigência de estado total, nova versão e rastreio causal.

A forma conceitual do corpo enviado é:

```json
{
  "mode": "strict-ai-state-transition",
  "inference": {
    "provider": "nvidia",
    "strict": true,
    "requireFullState": true,
    "requireMetaTrace": true,
    "noDeterministicFallback": true
  },
  "previousState": {
    "project": {"id": "alianca-park"},
    "localities": [],
    "stages": [],
    "activities": [],
    "materials": [],
    "personnel": [],
    "agenda": [],
    "cash": {},
    "evidence": []
  },
  "event": {"id": "EV-001", "type": "production.measured", "payload": {}},
  "metadataCatalog": {
    "stages": [],
    "activities": []
  },
  "comprehensionContext": {
    "cartography": {"sourceRef": "assets/data/dwg-georeference.json", "crs": "EPSG:31984"},
    "localities": [],
    "stages": [],
    "activities": [],
    "materials": [],
    "personnel": [],
    "teams": [],
    "equipment": [],
    "cash": {},
    "evidence": [],
    "constraints": []
  },
  "configuration": {
    "cartography": {
      "sourceRef": "assets/data/dwg-georeference.json",
      "crs": "EPSG:31984",
      "features": []
    },
    "stages": [],
    "personnel": [],
    "materials": [],
    "equipment": []
  }
}
```

Quando uma informação cartográfica ainda não estiver disponível em `previousState.localities` ou em `configuration.cartography`, ela deve ser marcada como `pending`, `estimated` ou `requiresConfirmation`. O prompt não pode completar vértices, comprimentos, volumes ou áreas por imaginação.

### Regras exigidas à resposta

A resposta NVIDIA precisa conter:

```json
{
  "eventApplied": {},
  "state": {},
  "analysis": {
    "possibleActivities": [],
    "schedule": [],
    "blocked": [],
    "metaTrace": [],
    "summary": ""
  }
}
```

O `state` deve preservar projeto, localidades, pessoal, etapas, atividades, materiais, caixa, compras, evidências, agenda, diário, bloqueios, restrições e comercial. O `analysis.possibleActivities` deve reavaliar todas as atividades, inclusive as bloqueadas. O `analysis.metaTrace` deve citar cada etapa e cada atividade e explicar qual metadescrição causou a consequência.

O Worker valida JSON, campos obrigatórios, preservação das entidades, mudança de versão e evento aplicado. Depois usa uma segunda chamada NVIDIA como auditor. Se a resposta falhar, o ciclo termina com erro: **não há fallback determinístico para a transição estrita**.

## 8. Rotas de acionamento

### Ciclo global

```text
POST /api/operational-loop
```

Recebe `event`, estado opcional, configurações opcionais e `persist: true` quando autorizado. O ciclo global pode atualizar agenda, recursos, caixa solicitado, bloqueios, notificações e diário no estado produzido pela IA.

### Registro de caixa administrativo

```text
POST /api/admin/cash-flow
```

O Worker autentica o usuário, cria `cash.inflow.recorded` ou `cash.outflow.recorded` e passa o evento pela mesma transição estrita. O controle de autoridade deve continuar no backend.

### Status do agente

```text
GET /api/ai/status
```

Expõe somente o estado de configuração do runtime, modelo e modo estrito, nunca a chave NVIDIA.

## 9. Saídas e propagação

Após uma transição persistida, o Worker:

1. grava a configuração/estado versionado;
2. publica o estado completo e o evento no Firebase Realtime Database;
3. distribui notificações para os destinatários definidos no próprio estado;
4. distribui agenda por encarregado/pessoa associada;
5. mantém a leitura disponível para dashboard, TWA e página pública conforme suas permissões.

Os canais de tempo real são espelhamento e notificação. Eles não substituem o estado versionado nem autorizam alteração de caixa, reserva ou aprovação comercial.

## 10. Cronjobs e manutenção

O runtime local mantém jobs idempotentes para:

- snapshot de caixa, prontidão e automação na inicialização e a cada hora;
- despacho do outbox de notificações na inicialização e a cada minuto;
- relatórios mensais de corretores na inicialização e na rotina diária;
- relatórios acumulados, auditoria de comissões, comprovantes e prazos externos em rotinas próprias.

No ciclo estrito NVIDIA, o cron pode disparar `operation.state.requested`; a agenda final deve ser a produzida e auditada pela transição, não por um planejador paralelo que concorra com ela.

## 11. Critérios de aceite do planejamento

- Cada avanço físico possui unidade, quantidade, trecho/localidade, responsável e evidência ou justificativa pendente.
- Nenhuma etapa é liberada apenas por caixa ou por texto de IA.
- Água, drenagem e travessias são verificadas antes da pavimentação do setor.
- A elétrica mantém seu prazo externo Coelba separado da conclusão da montagem.
- Recebimento de compra atualiza material e preserva comprovante.
- Caixa negativo ou abaixo da reserva reduz capacidade e gera notificação.
- Uma mudança de material, medição, comprovante, caixa ou diretriz altera a análise seguinte de forma rastreável.
- Cada transição NVIDIA retorna estado total, nova versão, `metaTrace` completo e auditoria válida.
- Falhas de inferência estrita são visíveis e não são mascaradas por uma decisão local diferente.

## 12. Limites desta documentação

O catálogo inicial de sete frentes é a configuração lite usada para planejamento operacional. O arquivo `development-stage-catalog.mjs` contém um catálogo ampliado de referência real para viabilidade, projetos, licenciamento, mobilização, saneamento, comissionamento e entrega. Ele não deve ser confundido com a fotografia inicial de execução acima; sua adoção precisa ser versionada na configuração de etapas antes de entrar no ciclo NVIDIA.
