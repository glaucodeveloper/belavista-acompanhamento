# RFC-AP-0002 — Contrato de compreensão operacional por base cartográfica

**Status:** Proposto para implementação e calibração  
**Versão:** 1.0.0  
**Data de referência:** 04/09/2026  
**Sistema:** Aliança Park · `belavista-ai-monitor`  
**Relaciona-se com:** [RFC-AP-0001 — Projeção operacional por base DWG](rfc-dimensionamento-fisico-dwg.md)  
**Público:** responsável técnico, Dono, Administrador, Encarregado, planejamento e manutenção dos endpoints de inferência

## Resumo

Este RFC define como a base cartográfica do loteamento é transformada em uma compreensão operacional para as etapas e atividades da obra. A compreensão vincula localidade, geometria, unidade de produção, requisito de entrada, material, pessoal, equipe, equipamento, evidência, caixa e dependências.

O endpoint de inferência recebe fatos e contexto. Ele pode sugerir agenda, requisição, bloqueio, alocação ou notificação, mas não substitui medição, projeto executivo, autorização financeira, aceite técnico ou confirmação humana.

```text
DWG/manifesto
  → normalização cartográfica
  → localidades e referências físicas
  → etapa e atividade
  → produção, materiais, pessoas e equipamentos
  → inferência NVIDIA
  → validação do Worker
  → estado completo, requisições, agenda e notificações
```

## 1. Linguagem normativa

As palavras **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY** e **OPTIONAL**, quando escritas em maiúsculas, indicam níveis de requisito conforme [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) e [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174).

Datas e horários de eventos SHOULD usar RFC 3339, por exemplo `2026-09-04T15:30:00-03:00`, preservando o fuso conhecido.

Este documento descreve o contrato de compreensão. Ele não declara certificação ISO, aprovação de projeto, licenciamento ou autorização de execução.

## 2. Escopo e não escopo

### 2.1 Incluído

- leitura da origem DWG publicada e de sua referência GPS/UTM;
- associação de lotes, vias, quadras, áreas sociais e pontos de infraestrutura a localidades de obra;
- projeção de volumes e unidades de produção com premissas identificadas;
- organização de materiais, requisitos, pessoal, equipes e equipamentos;
- preparação do contexto para inferência por etapa e por atividade;
- rastreabilidade entre dado cartográfico, cálculo, sugestão e confirmação;
- contratos de entrada e saída dos endpoints operacionais.

### 2.2 Não incluído

- criação de geometria que não esteja presente na fonte;
- substituição do projeto executivo, topografia, sondagem, licença ou laudo;
- confirmação automática de produção ou de documento;
- lançamento financeiro, compra, contratação ou ligação elétrica pela IA;
- uso de prioridade numérica como autorização de execução;
- conclusão de uma atividade apenas porque há dinheiro, material ou imagem no sistema.

## 3. Fontes, precedência e qualidade

| Fonte | Conteúdo | Uso na compreensão | Autoridade |
|---|---|---|---|
| `assets/data/dwg-georeference.json` | CRS, limites, pontos de controle, 298 lotes, áreas e centros GPS/UTM | referência geométrica publicada | cartográfica |
| DWG original | desenho técnico, camadas e geometrias de origem | conferência e atualização da base | cartográfica primária |
| PDF/memoriais de áreas verdes | referência visual e documental | conferência de apresentação e áreas | contextual |
| `development-stage-catalog.mjs` | objetivos, portões, atividades, requisitos, materiais, evidências e regras | compreensão ampliada das etapas | configurável |
| estado persistido | caixa, compras, estoque, pessoas, registros, agenda e evidências | situação vigente | operacional |
| `agent-tree.js` | gatilhos, autonomia e propagação | política de decisão | normativa interna |
| registro de campo | quantidade, unidade, localidade, responsável e comprovante | fato observado | evidência humana |
| resposta NVIDIA | análise, sugestão e justificativa | recomendação contextual | não autoritativa |

Quando houver conflito, o sistema MUST preservar as duas versões, indicar a divergência e encaminhar para confirmação. Um valor derivado nunca deve sobrescrever o dado observado.

### 3.1 Qualidade cartográfica publicada

O manifesto vigente declara:

| Indicador | Valor |
|---|---:|
| CRS | SIRGAS 2000 / UTM zona 24S · EPSG:31984 |
| Eixos | Easting, Northing |
| Lotes | 298 |
| Lotes residenciais/comerciais | 272 / 26 |
| Vias resumidas | 15 |
| Polilinhas de meio-fio/calçada | 109 |
| Pontos elétricos | 24 |
| Erro mediano do alinhamento GLB/DWG | 0,213 m |
| Erro máximo retido para revisão | 18,868 m |

Cada lote publicado possui, na ordem atual, os campos:

```text
glbObject, lat, lng, utmEast, utmNorth,
areaM2, alignmentErrorM, sourceLayer
```

O manifesto publicado contém centro, área e qualidade de alinhamento do lote. Ele não deve ser interpretado como uma coleção completa de vértices de polígonos, e o resumo de vias não deve ser interpretado como comprimento medido. Para calcular perímetro, extensão de rua, corte, aterro ou seleção polígono a polígono, o endpoint MUST receber a geometria vetorial correspondente ou uma medição de campo validada.

## 4. Modelo de compreensão

A unidade mínima de compreensão é uma atividade localizada:

```text
projeto
  → localidade física
  → etapa
  → atividade
  → unidade de produção
  → requisitos e dependências
  → materiais + pessoal/equipe + equipamentos
  → evidência
  → agenda e propagação
```

### 4.1 Identidade e origem dos dados

Todo valor enviado à inferência SHOULD carregar:

| Campo | Valores/uso |
|---|---|
| `origin` | `observed`, `derived`, `configured`, `suggested`, `confirmed` |
| `sourceRef` | arquivo, evento, registro, lote, camada ou documento de origem |
| `asOf` | data/hora do fato ou da versão |
| `confidence` | qualidade da leitura, nunca autorização |
| `review` | `required`, `pending`, `accepted` ou `rejected` |
| `unit` | unidade explícita e compatível com a atividade |

Um cálculo derivado MUST guardar sua fórmula e seus operandos. Exemplo: `m2Pavimentacao = areaLotesM2 × coeficienteSuperficieViaria` não pode ser apresentado como área medida de pavimento.

### 4.2 Resolução da localidade

A localidade da atividade é resolvida nesta ordem:

1. `event.payload.localityId` explícito e autorizado;
2. seleção física confirmada no modelo 3D, com `geometryRef` e `sourceFeatureIds`;
3. associação cartográfica do lote, quadra, via ou área social;
4. `stage.localityId` configurado;
5. `frente-principal`, somente como fallback visível e provisório.

O sistema MUST NOT deduzir uma quadra ou trecho apenas pela proximidade visual de um marcador quando não houver referência geométrica ou confirmação.

### 4.3 Decomposição cartográfica para a obra

| Elemento cartográfico | Compreensão possível | Etapas relacionadas | Limite |
|---|---|---|---|
| lote e área | quantidade de lotes, tipologia, área de referência e ponto de atendimento | água, comercial, pavimentação, entrega | centro não é polígono completo |
| quadra | agrupamento operacional para setorizar rede, pavimentação e atendimento | água, drenagem, meio-fio, pavimentação | exige vínculo de quadra na geometria |
| via/avenida | frente de serviço, eixo e setor de execução | terraplanagem, drenagem, meio-fio, pavimentação | resumo sem comprimento não gera metragem |
| meio-fio/calçada | linha de confinamento e acessibilidade | meio-fio, drenagem superficial, pavimentação | exige linha ou medição validada |
| ponto elétrico | ponto de poste/infraestrutura a conferir | elétrica-base, ligação Coelba | não prova cabo nem energização |
| área social/verde | localidade de praça, equipamento ou plantio | praças, arborização, paisagismo | exige limite da área e projeto |

## 5. Contrato de entrada para inferência

O Worker envia o estado completo anterior, um evento factual, a configuração e um catálogo de metadescrições. O contexto recomendado por etapa/atividade segue esta forma:

```json
{
  "schemaVersion": "ap-comprehension/v1",
  "requestId": "REQ-2026-09-04-0001",
  "trigger": "production.measured",
  "project": {
    "id": "project-alianca-park",
    "name": "Aliança Park",
    "cartography": {
      "sourceRef": "assets/data/dwg-georeference.json",
      "dwgRef": "PROJETO GEOMÉTRICO - ALIANÇA PARK LOTEAMENTO-PARA MEMORIAIS DAS ÁREAS VERDES.DWG",
      "crs": "EPSG:31984",
      "featureIds": ["Lote_131", "road:RUA-B"],
      "geometryQuality": "canonical-centers-plus-alignment"
    }
  },
  "locality": {
    "id": "setor-02",
    "type": "sector",
    "geometryRef": "dwg:sector:setor-02",
    "sourceFeatureIds": ["Lote_131", "Lote_132"],
    "selection": "confirmed"
  },
  "stage": {
    "key": "earthworks",
    "title": "Abertura de vias e terraplenagem",
    "executionDescription": "Executar cortes, aterros e greide por trechos estáveis.",
    "requirements": ["eixos locados", "material de aterro aprovado"],
    "evidenceRequirements": ["horímetro", "viagens", "cubagem", "greide"]
  },
  "activity": {
    "id": "earthworks-internal-haul",
    "title": "Escavação, carga e viagens internas",
    "localityId": "setor-02",
    "unitOfProduction": "m³",
    "plannedQuantity": 960,
    "measuredQuantity": 240,
    "lossRate": 0.05,
    "durationMinutes": 960
  },
  "requirements": [
    {"id":"gate-greide","kind":"entry","label":"frente locada e liberada","blocking":true,"status":"accepted"},
    {"id":"gate-soil","kind":"quality","label":"material de aterro aprovado","blocking":true,"status":"pending"}
  ],
  "materials": [
    {"id":"soil-selected","name":"Solo selecionado","unit":"m³","required":960,"available":600,"reserved":120,"leadTimeDays":2,"sourceRef":"material.received:MT-001"}
  ],
  "personnel": {
    "requiredRoles": [{"role":"encarregado","count":1},{"role":"terraplanagem","count":1}],
    "assignedTeam": [{"personId":"p-terra-1","role":"terraplanagem","localityId":"setor-02"}],
    "availability": "2026-09-04/2026-09-05",
    "capacity": {"unit":"m³","perDay":384}
  },
  "equipment": [
    {"type":"escavadeira","count":1,"available":true,"calibration":"valid","productionRate":{"unit":"m³/dia","value":160}},
    {"type":"caminhao-basculante","count":2,"available":true,"productionRate":{"unit":"m³/dia","value":240}},
    {"type":"motoniveladora","count":1,"available":false,"reason":"manutenção"}
  ],
  "cash": {"provisionableCents": 0,"reserveCents": 2000000},
  "event": {"id":"EV-001","type":"production.measured","at":"2026-09-04T12:00:00-03:00","actor":{"role":"foreman"}}
}
```

O exemplo é um contrato documental. Campos não disponíveis no estado real MUST ser marcados como ausentes, pendentes ou estimados; nunca preenchidos por invenção.

### 5.1 Prompt único para agenda e cronograma

O endpoint NVIDIA MUST receber uma única solicitação de transição contendo o contexto completo da obra. Etapas, atividades, localidade cartográfica, materiais, requisitos, pessoal, equipe, equipamentos, caixa, evidências, dependências e evento factual não devem ser distribuídos em prompts independentes, pois a agenda precisa avaliar as relações entre todos esses dados no mesmo ciclo.

O corpo lógico da solicitação deve conter, no mínimo:

```text
mode + inference policy
previousState completo
event factual único
metadataCatalog de todas as etapas e atividades
comprehensionContext único com cartografia, localidades, etapas, atividades,
materiais, pessoal, equipes, equipamentos, caixa, evidências e restrições
configuration.cartography
configuration.stages
configuration.personnel / teams
configuration.materials
configuration.equipment
configuration.constraints
repairFeedback, quando houver tentativa anterior inválida
```

O Worker pode montar esses blocos internamente, mas deve enviá-los na mesma mensagem de usuário da chamada NVIDIA. A resposta deve reavaliar todas as atividades, inclusive as bloqueadas, e produzir a agenda somente com os encaixes executáveis. A ausência de geometria, quantidade, equipe, equipamento, requisito ou evidência deve aparecer como bloqueio ou pendência rastreável; nunca como valor inventado.

## 6. Materiais e requisitos

### 6.1 Requisitos

Cada requisito deve declarar:

```text
id · kind · label · blocking · status · sourceRef · evidenceRequired
```

Os tipos recomendados são `entry`, `execution`, `quality`, `safety`, `material`, `personnel`, `equipment`, `evidence`, `release` e `external`. Um requisito bloqueante impede a sugestão de início, mas não impede a criação de uma requisição para resolvê-lo.

### 6.2 Material

Cada material deve separar necessidade, disponibilidade e comprovação:

| Campo | Significado |
|---|---|
| `required` | quantidade planejada para a atividade/localidade |
| `available` | quantidade recebida e utilizável |
| `reserved` | quantidade comprometida com outra frente |
| `consumed` | quantidade registrada como consumida |
| `shortage` | `máximo(0, required - available + reserved)` conforme a regra vigente |
| `unit` | m, m², m³, un, viagem, kg ou outra unidade explícita |
| `leadTimeDays` | prazo de suprimento conhecido ou estimado |
| `evidenceRefs` | nota, romaneio, certificado ou comprovante |

A inferência pode sugerir compra, remanejamento ou alerta. Ela MUST NOT converter sugestão em compra aprovada.

Materiais centrais do catálogo atual incluem solo selecionado, brita, areia, tubos/manilhas, tubos PEAD, conexões, ramais, cavaletes, postes, cabos, transformadores, meio-fio, paralelepípedos, base granular, mudas, terra vegetal, equipamentos e itens de acabamento. A lista deve ser refinada por atividade, setor e unidade, e não apenas pela etapa.

## 7. Pessoal, equipes e equipamentos

### 7.1 Pessoal e equipe

A unidade de alocação é uma pessoa ou equipe identificada. A entrada SHOULD conter:

```text
personId/teamId · role/function · count · localityId
availability · capacity · qualification · documents · sourceRef
```

Regras:

- uma pessoa MUST permanecer na `localityId` atribuída durante o intervalo agendado;
- função incompatível, indisponibilidade, documento vencido ou falta de treinamento gera bloqueio ou alerta;
- a equipe deve ser avaliada pela capacidade efetiva, não somente pela quantidade cadastrada;
- duas atividades não podem ocupar a mesma pessoa no mesmo período sem evento explícito de compartilhamento;
- registro de equipe não comprova produção sem unidade, quantidade e evidência.

O estado atual possui `personnel` como coleção de referência. A forma estruturada de `requiredRoles`, `assignedTeam` e `capacity` deste RFC deve ser mantida na configuração ou normalizada antes da chamada de inferência.

### 7.2 Equipamentos

Equipamento é um recurso físico com capacidade e condição, não apenas uma palavra na descrição. A estrutura recomendada é:

```text
equipmentId · type · count · localityId · available
capacity/unit · productionRate · calibration · maintenanceUntil
operatorRequired · sourceRef
```

O Worker SHOULD bloquear ou sinalizar:

- equipamento obrigatório indisponível;
- calibração ou inspeção vencida;
- capacidade inferior ao ritmo solicitado;
- equipamento alocado em outra localidade incompatível;
- máquina sem operador habilitado;
- manutenção que altere o prazo estimado.

Para terraplanagem, a unidade de produção pode ser `m³`, `viagem`, `hora-máquina` ou `caçamba`. Para pavimentação, pode ser `m²`, `pedra`, `caminhão` ou `trecho`, mas a medição física em m² deve ser mantida como referência de avanço.

## 8. Regras de cálculo e inferência

O endpoint deve distinguir quatro camadas:

1. **Observado:** medição, recebimento, disponibilidade, foto, certificado ou seleção de localidade.
2. **Derivado:** área, volume, conversão, cobertura, falta, capacidade ou prazo calculado.
3. **Configurado:** requisito, material padrão, unidade, ritmo, função, dependência ou coeficiente calibrado.
4. **Sugerido:** agenda, compra, requisição, prioridade relativa, alerta ou próxima ação gerada pela IA.

As relações mínimas são:

```text
quantidade necessária
  → cobertura de material
  → capacidade de pessoal/equipe
  → capacidade de equipamento
  → caixa provisionável
  → dependências e evidências
  → encaixe possível no calendário
```

O cálculo de prontidão pode usar as coberturas configuradas no RFC-AP-0001, mas nenhuma média ou prioridade numérica pode liberar uma atividade que possui requisito bloqueante pendente.

Exemplos de conversões documentadas:

```text
viagens internas = teto(volume medido ÷ capacidade da caçamba)
m²/caminhão = pedras por caminhão ÷ pedras por m²
produção ajustada = produção teórica × (1 - perda cadastrada)
falta = máximo(0, necessário - disponível)
```

Cada fórmula deve indicar unidade, fonte, versão e tolerância. Se uma medida real divergir da projeção, a medição real permanece como fato e abre revisão da premissa.

## 9. Endpoints e responsabilidades

### 9.1 Ciclo de inferência estrita

| Método e rota | Entrada | Saída |
|---|---|---|
| `POST /api/operational-loop` | estado anterior ou estado persistido, evento factual, configuração e opções de persistência | `eventApplied`, estado completo, `analysis`, auditoria e efeitos |
| `GET /api/operational-state` | nenhuma | snapshot operacional e correlações |
| `GET /api/automation/panorama` | nenhuma | panorama de caixa, etapas, materiais, equipe e projeção |
| `POST /api/automation/run` | execução autorizada da automação | ciclo, agenda, notificações e propagação |

No Worker Cloudflare, o ciclo estrito exige autenticação administrativa em `POST /api/operational-loop`, usa NVIDIA configurada no Worker e não possui fallback determinístico. A resposta deve ser um estado total, nunca apenas um patch.

### 9.2 Alimentação da compreensão

| Método e rota | Fato/configuração alimentada |
|---|---|
| `GET/PUT /api/admin/config/stages` | metadescrições, requisitos, atividades e regras das etapas |
| `GET/PUT /api/admin/config/personnel` | pessoas, funções, disponibilidade e capacidade |
| `GET/PUT /api/admin/config/state` | baseline, caixa, materiais e estado de referência |
| `POST /api/admin/cash-flow` | entrada ou saída de caixa que dispara nova leitura |
| `GET/POST /api/records` | registro de campo, produção e evidência |
| `GET/POST /api/material-requirements` | necessidade de material por atividade |
| `GET/POST /api/inventory-movements` | recebimento, consumo e saldo físico |
| `GET/POST /api/stage-agenda` | encaixes de agenda que devem ser reavaliados |
| `GET/POST /api/activities` | cadastro de atividades |
| `GET/POST /api/activity-dependencies` | relação entre atividades |

Os endpoints de configuração e execução devem preservar ator, versão, data, origem e justificativa. Alterar configuração não deve apagar o histórico da execução anterior.

## 10. Contrato de saída

O endpoint NVIDIA deve devolver:

```json
{
  "eventApplied": {"id":"EV-001","type":"production.measured"},
  "state": "estado operacional completo",
  "analysis": {
    "possibleActivities": [],
    "schedule": [],
    "blocked": [],
    "materialRequests": [],
    "personnelAllocation": [],
    "equipmentAllocation": [],
    "notifications": [],
    "metaTrace": [],
    "summary": "..."
  }
}
```

O Worker valida:

- todas as chaves obrigatórias do estado completo;
- preservação de projeto, etapas, atividades e histórico;
- aplicação exata do evento recebido;
- uma decisão em `possibleActivities` para cada atividade;
- uma entrada de `metaTrace` para cada etapa e atividade;
- localidade, pessoa e equipamento sem transferência implícita;
- requisitos bloqueantes respeitados;
- versão nova do estado;
- auditoria da segunda chamada NVIDIA.

O `metaTrace` deve indicar os campos que causaram a decisão, por exemplo:

```json
{
  "entityType": "activity",
  "entityId": "earthworks-internal-haul",
  "fieldsUsed": ["localityId", "requirements", "durationMinutes", "equipment"],
  "sourceRefs": ["dwg:Lote_131", "material.received:MT-001"],
  "consequence": "motoniveladora indisponível mantém a regularização bloqueada e sugere reprogramação"
}
```

## 11. Eventos que alimentam os endpoints

Eventos devem informar fatos, não decisões pré-fabricadas:

```text
production.measured
material.received
material.consumed
personnel.assigned
personnel.availability.changed
equipment.inspected
equipment.maintenance.changed
field.diary.recorded
evidence.attached
activity.completed
stage.meta.updated
activity.meta.updated
cash.inflow.recorded
cash.outflow.recorded
navigation.changed
```

Um evento mínimo contém:

```json
{
  "id": "EV-...",
  "type": "production.measured",
  "at": "2026-09-04T15:30:00-03:00",
  "actor": {"id":"encarregado-01","role":"foreman"},
  "payload": {
    "stageId": "earthworks",
    "activityId": "earthworks-internal-haul",
    "localityId": "setor-02",
    "quantity": 120,
    "unit": "m³",
    "evidenceRefs": ["diary:DI-001", "photo:PH-001"]
  }
}
```

O mesmo evento pode alimentar diário, progresso, materiais, agenda, bloqueios e notificações, mas cada consequência deve citar a origem e a regra usada.

## 12. Critérios de aceitação

- um lote ou trecho selecionado no mapa consegue ser rastreado até `sourceFeatureIds`;
- o endpoint não transforma centro de lote em polígono ou comprimento inexistente;
- toda unidade de produção possui quantidade e localidade;
- material necessário é separado de material disponível, reservado, consumido e comprovado;
- equipe e equipamento possuem função, capacidade, disponibilidade e localidade;
- a rede de água considera os 298 lotes sem confundir estoque com atendimento;
- pavimentação só é sugerida após os requisitos de redes e meio-fio do setor;
- a rede elétrica mantém montagem física separada de vistoria e ligação da Neoenergia Coelba;
- mudança de caixa reavalia capacidade, mas não inventa avanço físico;
- toda atividade aparece em `possibleActivities`, mesmo bloqueada;
- o histórico do fato, inferência, resposta e confirmação permanece auditável.

## 13. Alinhamento RFC/ISO

| Referência | Aplicação nesta especificação |
|---|---|
| RFC 2119 / RFC 8174 | níveis de obrigação e proibição do contrato |
| RFC 3339 | representação de data/hora de eventos e versões |
| [ISO 19650-1:2018](https://www.iso.org/standard/68078.html) | identificação, versão, origem e troca controlada da informação cartográfica |
| [ISO 21502:2020](https://www.iso.org/standard/74947.html) | decomposição, planejamento, execução, controle e encerramento |
| [ISO 9001:2015](https://www.iso.org/standard/62085.html) | informação documentada, competência, evidência e melhoria |
| [ISO 31000:2018](https://www.iso.org/standard/65694.html?browse=tc) | riscos de qualidade cartográfica, recurso, prazo, caixa e dependência |

As referências são usadas como orientação de organização e rastreabilidade. O projeto não deve declarar conformidade ou certificação sem avaliação formal aplicável.

## 14. Controle de mudanças

Alterações no schema, no cálculo, nas localidades, nos requisitos, nos materiais, nas equipes, nos equipamentos ou na autonomia MUST gerar versão nova e registrar:

```text
id da mudança · autor · data RFC3339 · versão anterior · versão nova
fonte · motivo · impacto cartográfico · impacto físico · impacto financeiro
endpoint afetado · teste realizado · confirmação
```

**Histórico:**

- `1.0.0` — 04/09/2026 — contrato inicial de compreensão operacional por DWG, materiais, requisitos, pessoal, equipes, equipamentos e endpoints de inferência.
