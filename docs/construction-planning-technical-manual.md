# Manual técnico de planejamento e inferência operacional
## Aliança Park · configuração inicial de construção

**Versão documental:** 2026-09-04  
**Sistema:** `belavista-ai-monitor`  
**Escopo:** uso do planejamento inicial, estrutura de dados, diretrizes do agente e inferência no endpoint NVIDIA.

**RFC complementar:** [RFC-AP-0002 — Contrato de compreensão operacional por base cartográfica](rfc-compreensao-operacional-dwg.md). Ele especifica a passagem dos dados DWG para localidades, materiais, requisitos, pessoal, equipes e equipamentos enviados aos endpoints de inferência.

**Documento de entrada do cronograma:** [Base de geração de agenda e cronograma físico-operacional](initial-construction-planning.md). Ele define o conjunto único de atividades, gates e recursos que deve acompanhar cada transição enviada à NVIDIA.

## 1. Objetivo e fontes de autoridade

Este manual descreve como o sistema representa e reavalia a execução inicial de um loteamento rural. A inteligência não deve ser tratada como um chat que decide isoladamente: ela recebe fatos persistidos, interpreta relações entre etapas e devolve um novo estado operacional completo, explicável e auditável.

Fontes do comportamento:

| Arquivo | Função |
|---|---|
| `worker/src/demo-defaults.js` | configuração lite inicial de etapas, atividades, materiais e progresso |
| `agent-tree.js` | diretrizes declarativas, eventos e autonomia |
| `worker/src/operational-state.js` | normalização do estado completo |
| `worker/src/operational-loop.js` | orquestração da transição |
| `worker/src/strict-nvidia-state.js` | chamada NVIDIA, validação e auditoria |
| `worker/src/strict-realtime.js` | publicação no Firebase Realtime Database |
| `worker/src/github-store.js` | leitura e versionamento das configurações |

O arquivo `development-stage-catalog.mjs` contém a referência ampliada de implantação real, com 15 etapas e 90 atividades. O prompt de inferência deve receber essas atividades no mesmo contexto da situação vigente, e não somente as atividades que parecem prontas. O catálogo só entra na operação depois de ser salvo como configuração versionada.

Para a projeção física e os limites da base cartográfica, consulte também o [RFC-AP-0001 — Projeção operacional de construção por base DWG](rfc-dimensionamento-fisico-dwg.md). O contrato cartográfico não autoriza inventar vértices, comprimentos ou medições que não estejam presentes na fonte ou em registro validado.

## 2. Princípio de operação

```text
fato observado
  → evento normalizado
  → estado completo anterior
  → metadescrições e relações
  → inferência NVIDIA
  → estado completo novo
  → validação estrutural + auditoria
  → persistência, agenda e notificações
```

A compreensão da obra segue a cadeia:

```text
etapa → atividade → localidade → requisito → material/equipamento
      → unidade de produção → evidência → condição de liberação
```

Caixa, material ou percentual podem limitar ou liberar capacidade, mas não comprovam execução física. O avanço físico depende de medição, responsável e evidência ou justificativa registrada.

## 3. Configuração inicial vigente

Os valores abaixo são o cenário inicial do catálogo lite. Em ambiente conectado, os arquivos de configuração versionados no GitHub prevalecem sobre esses padrões.

| Ordem | ID | Etapa | Progresso demo | Dependências | Unidade principal |
|---:|---|---|---:|---|---|
| 1 | `terraplanagem` | Terraplanagem | 100% | nenhuma | m³, viagem, hora/máquina, trecho |
| 2 | `drenagem` | Drenagem Pluvial | 74% | terraplanagem | m, m³, trecho, ensaio |
| 3 | `agua` | Rede de Água | 41% | terraplanagem | m, unidade, lote, setor |
| 4 | `eletrica` | Rede Elétrica | 16% | terraplanagem e projeto elétrico | poste, m de cabo, transformador |
| 5 | `pavimentacao` | Pavimentação | 4% | drenagem e água liberadas | m², caminhão, trecho |
| 6 | `pracas` | Praças | 0% | pavimentação | m², unidade, área social |
| 7 | `arborizacao` | Arborização | 0% | pavimentação e área verde | muda, unidade, setor |

Essa tabela é ponto de partida; não é uma autorização automática. A decisão de execução deve considerar as relações descritas no estado e nas diretrizes.

### 3.1 Terraplanagem

Objetivo: regularizar áreas, conformar greide e preparar frentes para redes.

Atividade inicial: conferir greide e frentes liberadas.

Registro mínimo: trecho, cota, corte/aterro, máquina, hora de operação, viagens, volume em m³, responsável e foto da conferência.

Regra: somente frente locada, medida e aceita pode liberar rede enterrada.

### 3.2 Drenagem pluvial

| Atividade | Duração referência | Materiais centrais |
|---|---:|---|
| Assentar rede pluvial do trecho | 3 dias | tubo/manilha e brita |
| Reaterro e compactação | 2 dias | areia; depende do assentamento |

O registro deve informar vala, cota, declividade, tubo, juntas, berço, reaterro, compactação, inspeção e ponto de lançamento. Não fechar nem medir o trecho sem evidência da inspeção e compactação.

### 3.3 Rede de água

| Atividade | Duração referência | Relação |
|---|---:|---|
| Executar rede principal PEAD | 4 dias | tubo PEAD e conexões |
| Executar ramais e cavaletes | 3 dias | depende da rede principal |
| Testar e liberar setor | 1 dia | depende dos ramais |

Meta de negócio: atender 298 lotes. Materiais: tubos PEAD por diâmetro/classe, conexões, ramais, cavaletes, registros, válvulas, caixas, hidrômetros ou esperas, areia de envoltória e fita de advertência.

O estado deve diferenciar estoque, material reservado, material instalado e lote atendido. Estoque parcial não equivale a rede executada. Teste, lavagem/desinfecção, evidências e aceite do setor são necessários antes de propagar a pavimentação.

### 3.4 Rede elétrica e Coelba

| Atividade | Duração referência | Relação |
|---|---:|---|
| Implantar postes disponíveis | 4 dias | projeto e locação conferidos |
| Lançar cabos e preparar transformadores | 4 dias | depende dos postes |

Materiais: postes e estruturas homologadas, cabos, ferragens, transformadores, proteção, dutos, caixas, luminárias, braços, quadros e aterramento.

O agente deve manter cinco estados distintos:

1. projeto aprovado e vigente;
2. material homologado e rastreado;
3. montagem física executada;
4. dossiê de inspeção e as-built disponível;
5. vistoria, incorporação e ligação externa pela Neoenergia Coelba concluídas.

Montagem física não significa energização. Protocolo, prazo externo, vistoria e pendência da distribuidora devem ser acompanhados separadamente.

### 3.5 Pavimentação

| Atividade | Duração referência | Relação |
|---|---:|---|
| Preparar base do setor | 3 dias | redes e greide aceitos |
| Assentar pavimento e meio-fio | 5 dias | depende da base |

Sequência: subleito, sub-base/base, colchão de assentamento, paralelepípedos, rejuntamento, compactação e acabamento junto a guias e caixas.

Referência de produção configurada: 5.000 pedras por caminhão e 45 pedras por m².

```text
produção teórica = 5.000 ÷ 45 = 111,11 m²/caminhão
```

O cálculo real desconta a perda cadastrada e é limitado pela menor capacidade entre material recebido, equipe, produção medida, trecho liberado e caixa. A unidade física é m² por trecho; caminhão e romaneio são evidências de suprimento.

### 3.6 Praças e arborização

Praças recebem pisos, mobiliário e equipamentos quando o entorno estiver estável para não sofrer dano por tráfego pesado.

Arborização exige mapa de plantio, espécies adequadas, preparo do solo, irrigação, tutoramento, proteção e manutenção inicial. Devem ser verificados afastamentos de postes, redes, acessos, visibilidade e circulação.

## 4. Estrutura do estado operacional

O ciclo estrito trabalha com estado completo, contendo:

```text
project, clock, localities, personnel, stages, activities, materials,
cash, purchases, evidence, agenda, notifications, resourceRequests,
cashRequests, diary, blockers, stageSectorState, constraints, commercial
```

### 4.1 Localidade

Toda atividade deve possuir `localityId`, que identifica frente, setor, trecho, quadra, via ou área social. Pessoa, máquina e atividade não podem ser transferidas entre localidades sem evento explícito.

### 4.2 Metadescrição

Etapas podem declarar:

```text
executionDescription
peculiarities
requirements
evidenceRequirements
notificationDestinations
```

Atividades podem declarar:

```text
executionDescription
peculiarities
requirements
evidenceRequirements
durationMinutes
localityId
```

Esses campos são contexto de inferência. Devem aparecer no `analysis.metaTrace` com a causa da consequência produzida.

## 5. Caixa e autoridade

```text
caixa provisionável = entradas - saídas - compromissos - reserva mínima
```

O caixa é usado para avaliar provisões, compras, agenda e capacidade de frente. Não pode ser usado como prova de avanço físico.

| Perfil | Operações autorizadas |
|---|---|
| Dono | entradas, saídas, estornos, ajustes e compromissos de caixa |
| Administrador | calibrações, reserva, requisitos, orçamento e políticas |
| Encarregado | produção, diário, evidências e confirmação de serviços |
| Sistema | reanálise, auditoria, sugestão, agenda e notificação |

Cada lançamento financeiro deve conter valor, natureza, data, origem, categoria, descrição e comprovante quando aplicável. O histórico não deve ser apagado por uma alteração posterior.

Nota de implementação: o servidor local aplica `owner` à rota de caixa. A rota administrativa do Worker atualmente valida sessão/token e allowlist de e-mail; antes da produção, deve-se conferir o vínculo do papel Dono na camada de identidade para manter a mesma restrição.

## 6. Diretrizes e gatilhos

A árvore `agent-tree.js` implementa a forma:

```text
diretriz → requisito → evento factual → ação → autonomia → auditoria
```

### Governança

| Evento | Ação |
|---|---|
| `cash.changed` | recalcular prontidão |
| `cash.negative` | notificar risco financeiro |
| `calibration.changed` | recalcular estado com nova versão |
| `record.created` | conferir completude do registro |
| `activity.incomplete` | solicitar fato faltante |
| `receipt.missing` | criar pendência de evidência |

### Produção

| Evento | Consequência |
|---|---|
| `production.measured` em terraplanagem | calcular volume por viagens, m³ e máquina |
| `material.incomplete` em água | criar pendência de tubos, ramais ou cavaletes |
| `activity.completed` em água | liberar relação posterior do setor |
| `activity.completed` em meio-fio | reavaliar liberação do pavimento |
| `production.measured` em pavimentação | calcular m² por pedras, caminhão e perdas |
| `paving.completed` | preparar solicitação Coelba com confirmação |
| `coelba.deadline-near` | alertar Dono e Administrador |

### CRM e comissões

`lead.message.received` extrai canal, contato, intenção, lote e próximo passo. `lead.incomplete` pergunta o fato ausente. Reserva, desconto, proposta, contrato e mudança de condição comercial exigem confirmação. `payment.received` calcula a razão de comissão e `month.closed` gera os relatórios.

## 7. Registro de fatos

O fato deve ser enviado como evento idempotente:

```json
{
  "id": "EVT-2026-09-04-0001",
  "type": "production.measured",
  "at": "2026-09-04T13:00:00Z",
  "actor": {"id": "encarregado-01", "role": "foreman"},
  "payload": {
    "stageId": "terraplanagem",
    "activityId": "terra-conferir-greide",
    "localityId": "frente-principal",
    "quantity": 320,
    "unit": "m3",
    "machineHours": 8,
    "evidenceIds": ["EVD-0001"]
  },
  "source": "field"
}
```

Regras: o ID permanece no reenvio; o tipo descreve o fato; o payload não contém uma decisão disfarçada; medição exige unidade e localidade; conclusão exige evidência ou justificativa.

Tipos principais:

```text
cash.inflow.recorded / cash.outflow.recorded
stage.updated / activity.updated / production.measured
material.received / material.incomplete / purchase.receipt.received
field.diary.recorded / activity.completed / paving.completed
coelba.deadline-near / lead.message.received / lot.reserve.requested
payment.received / operation.state.requested
```

## 8. Inferência NVIDIA

### 8.1 Transporte

```text
POST https://integrate.api.nvidia.com/v1/chat/completions
Authorization: Bearer $NVIDIA_API_KEY
Content-Type: application/json
```

Variáveis do Worker:

```text
NVIDIA_API_KEY
NVIDIA_API_URL
NVIDIA_STATE_MODEL
NVIDIA_STATE_MAX_TOKENS
NVIDIA_STATE_TIMEOUT_MS
NVIDIA_STATE_RETRIES
NVIDIA_STATE_TEMPERATURE
```

O modelo padrão do estado estrito é `google/diffusiongemma-26b-a4b-it`, substituível por `NVIDIA_STATE_MODEL`. A chave só permanece no Worker.

### 8.2 Rota de ciclo

```text
POST /api/operational-loop
```

O corpo deve conter um evento factual e, quando necessário, `persist: true`:

```json
{
  "mode": "strict-ai-state-transition",
  "event": {
    "id": "EVT-...",
    "type": "production.measured",
    "at": "2026-09-04T13:00:00Z",
    "actor": {"id": "encarregado-01", "role": "foreman"},
    "payload": {"activityId": "terra-conferir-greide", "quantity": 320, "unit": "m3"}
  },
  "persist": true,
  "inference": {
    "provider": "nvidia",
    "strict": true,
    "requireFullState": true,
    "requireMetaTrace": true,
    "noDeterministicFallback": true
  }
}
```

### 8.3 Prompt e resposta

O Worker envia estado completo anterior, evento, configurações e catálogo de metadados de todas as etapas/atividades. A IA deve aplicar somente o fato informado, preservar o restante, reavaliar todas as atividades e gerar nova versão.

A resposta obrigatória possui `eventApplied`, `state` completo e `analysis`. A análise contém `possibleActivities`, `schedule`, `blocked`, `metaTrace` e `summary`.

Cada atividade deve ter uma decisão, inclusive se bloqueada. O `metaTrace` deve mencionar cada etapa e cada atividade, campos utilizados e consequência causal. A agenda deve conter somente encaixes executáveis.

### 8.4 Validação

O Worker rejeita a resposta se faltar chave do estado, array obrigatório, nova versão, entidade existente, evento correspondente, decisão de atividade ou rastreio de metadados. Depois uma segunda chamada NVIDIA audita fidelidade do evento, preservação do estado, relações de localidade, pedidos, notificações e uso das metadescrições.

Falha de transporte, JSON, estrutura ou auditoria encerra o ciclo após as tentativas configuradas. O modo estrito não fabrica decisão por fallback determinístico.

## 9. Saídas e propagação

A inferência pode gerar:

- agenda com etapa, atividade, localidade, responsável, data e relação;
- bloqueio com causa verificável;
- pedido de material, recurso ou caixa;
- notificação com severidade, entidade, regra e versão;
- atualização de diário, evidências e estado comercial.

Com `persist: true`, o Worker publica no Firebase RTDB:

```text
<namespace>/operationalSnapshots/fullState
<namespace>/operationalEvents/<eventId>
<namespace>/notifications/<recipient>/<notificationId>
<namespace>/agenda/<personId>/<agendaId>
```

O RTDB é espelho e canal de escuta para dashboard, TWA e dispositivos autorizados. Não é uma autorização independente para alterar caixa, lote ou condição comercial.

## 10. Procedimentos de uso

### Dono

1. Conferir saldo, compromissos e reserva.
2. Registrar entrada ou saída com a origem e o comprovante.
3. Confirmar o lançamento.
4. Revisar prontidão, pedidos, bloqueios e agenda produzidos pela nova versão.

### Administrador

1. Abrir a configuração da etapa ou atividade.
2. Editar descrição, peculiaridades, requisitos, materiais, unidade, produtividade, duração, dependências e notificações.
3. Salvar versão nova.
4. Disparar recalibração.
5. Conferir `metaTrace` e a decisão de todas as atividades.

### Encarregado

1. Selecionar etapa e localidade.
2. Informar quantidade, unidade, equipe, máquina e data/hora.
3. Anexar fotos, certificados, romaneios, ensaios e comprovantes.
4. Confirmar os serviços observados.
5. Enviar e conferir pendências ou propagação.

## 11. Cronjobs e idempotência

No runtime local:

| Job | Disparo |
|---|---|
| snapshot de caixa/prontidão/automação | inicialização + 1 hora |
| despacho de notificações | inicialização + 1 minuto |
| relatório mensal de corretores | inicialização + rotina diária às 06:00 |

Cada job deve guardar `job`, período, início, fim, status, fingerprint e resultado/erro. Reexecução do mesmo período não pode duplicar agenda, compra, notificação ou relatório. No ciclo NVIDIA, o cron deve disparar `operation.state.requested` ou evento equivalente para o estado global.

## 12. Aceite técnico

- toda atividade possui unidade, localidade, requisito, responsável e evidência esperada;
- nenhuma etapa é liberada somente por caixa ou texto de IA;
- água, drenagem e travessias são aceitas antes do pavimento do setor;
- produção da pavimentação considera pedras, área e perda;
- elétrica distingue montagem, inspeção, incorporação e ligação Coelba;
- comprovantes permanecem ligados aos fatos;
- caixa abaixo da reserva reduz provisão e notifica;
- mudança de metadescrição gera nova análise causal;
- resposta NVIDIA contém estado total, nova versão e auditoria válida;
- falha de inferência permanece visível e não é mascarada.

Verificações locais:

```bash
npm run check:worker
npm run test:worker
npm run test:autonomy:study
npm run test:purchase:mock
```

Os testes de estudo são offline. Integração real com NVIDIA e Firebase exige credenciais e ambiente configurados.

## 13. Limite de responsabilidade

A inteligência organiza fatos, relações, agenda, pendências e notificações. Ela não substitui responsável técnico, aprovação municipal, licenciamento, ensaio, inspeção da concessionária, conferência humana de documentos ou decisão financeira autorizada. O produto da inferência deve ser sempre uma decisão explicada, rastreável e sujeita à autoridade definida para o fato.
