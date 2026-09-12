# RFC-AP-0001 — Projeção operacional de construção por base DWG

**Status:** Proposto / vigente para a configuração inicial
**Versão:** 1.0.0
**Data de referência:** 04/09/2026
**Sistema:** Aliança Park · `belavista-ai-monitor`
**Público:** dono, administradores, encarregados, responsável técnico, planejamento e manutenção do agente operacional

**Contrato complementar:** [RFC-AP-0002 — Contrato de compreensão operacional por base cartográfica](rfc-compreensao-operacional-dwg.md)

## Resumo

Este RFC define como o sistema transforma a base cartográfica do loteamento em uma projeção operacional de obra. A projeção combina áreas e contagens lidas do DWG, coeficientes iniciais de engenharia, materiais registrados, pessoas ativas, caixa provisionável, relações entre etapas e produção medida em campo.

O resultado é utilizado para formar as páginas de projeção, o cronograma, a agenda, as requisições e as recomendações do worker que consulta o endpoint de inferência NVIDIA. A projeção é uma base de planejamento: não substitui projeto executivo, medição topográfica, especificação de material, aceite do responsável técnico ou prazo externo da distribuidora de energia.

## 1. Linguagem normativa

As palavras-chave **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY** e **OPTIONAL** neste documento devem ser interpretadas como requisitos normativos quando aparecem em maiúsculas, conforme [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) e [RFC 8174](https://datatracker.ietf.org/doc/html/rfc8174).

## 2. Escopo e limites

O sistema MUST:

- manter a origem, a versão e a qualidade de cada quantidade projetada;
- separar dado observado, premissa calibrada, cálculo derivado, sugestão da IA e confirmação humana;
- recalcular agenda e prontidão quando caixa, material, equipe, produção, evidência ou relação de etapa mudar;
- expor falta de material, falta de equipe, dependência, sobreposição e risco de caixa;
- permitir que o responsável autorizado ajuste coeficientes e registre a justificativa;
- preservar histórico, comprovantes e eventos de propagação.

O sistema MUST NOT:

- tratar o valor do caixa como prova de serviço executado;
- afirmar que uma estimativa linear é medição do projeto executivo;
- concluir uma atividade física apenas pela resposta da NVIDIA;
- efetuar lançamento financeiro, compra, reserva, contrato ou ligação elétrica sem a autorização definida para o perfil;
- considerar a aprovação ou o protocolo da Neoenergia Coelba como energização concluída.

## 3. Fontes de dados e precedência

| Fonte | Conteúdo | Precedência operacional |
|---|---|---|
| `assets/data/dwg-georeference.json` | lotes, áreas, limites GPS/UTM, vias resumidas, polilinhas e pontos elétricos | fonte dos dados geométricos publicados |
| `state.js` | etapas, atividades, progresso e calibração inicial | padrão de execução quando não há edição persistida |
| `development-stage-catalog.mjs` | descrições, requisitos, evidências, materiais e regras de cada frente | catálogo de compreensão operacional |
| SQLite / `persistence.mjs` | caixa, compras, recebimentos, materiais, pessoas, atividades e registros | estado persistido vigente |
| `agent-tree.js` | diretrizes, gatilhos, autonomia e propagação | política de decisão do agente |
| registros do encarregado | produção, localização, diário, foto, certificado e aceite | evidência de campo e progresso confirmado |
| resposta NVIDIA | sugestão explicada, prioridade, agenda e próximos passos | recomendação; nunca autoridade final |

Quando fontes entrarem em conflito, o worker MUST preservar o conflito, apontar a fonte divergente e solicitar revisão. O sistema não deve esconder a diferença com uma média silenciosa.

## 4. Leitura inicial do loteamento

A base DWG vigente está em SIRGAS 2000 / UTM zona 24S (**EPSG:31984**). A leitura publicada contém:

| Elemento | Quantidade ou medida inicial |
|---|---:|
| Lotes | 298 |
| Lotes residenciais | 272 |
| Lotes comerciais | 26 |
| Área total dos lotes | 99.437,03 m² |
| Vias resumidas | 15 |
| Polilinhas de meio-fio/calçada | 109 |
| Pontos elétricos cartografados | 24 |
| Centro de referência | -13.00044486, -39.62315439 |
| Link de conferência | [Google Maps](https://www.google.com/maps/@-13.00044486,-39.62315439,17z) |

O sistema registra a qualidade geométrica do alinhamento, mas não infere, a partir da imagem do mapa, profundidade de subleito, seção típica, diâmetro hidráulico, classe de tubo, dimensionamento elétrico ou resistência de material.

## 5. Modelo físico e premissas calibráveis

Os lotes e as contagens são dados do DWG. Os comprimentos e coeficientes abaixo são premissas iniciais de planejamento até a validação do projeto executivo e da medição de campo.

| Parâmetro | Valor vigente | Uso |
|---|---:|---|
| Fração inicial de superfície viária | 0,322 | superfície viária / área dos lotes |
| Largura média inicial de via | 8 m | superfície viária / comprimento |
| Profundidade média inicial de terraplanagem | 0,511814375 m | superfície viária × profundidade |
| Participação inicial de drenagem | 20% do eixo viário | comprimento de rede de drenagem |
| Rede de água por lote | 10 m/lote | pré-dimensionamento linear |
| Cabo por ponto elétrico | 150 m/ponto | pré-dimensionamento da reserva de cabo |
| Pedras de paralelepípedo | 45 un/m² | consumo da pavimentação |
| Perda de pedras | 5% | reserva de compra |
| Capacidade de caminhão de pedras | 5.000 un | viagens de suprimento |
| Capacidade de caçamba | 12 m³ | viagens internas |
| Espaçamento preliminar de bocas de lobo | 82 m | contagem de pontos de drenagem |
| Areia/pó de pedra | 0,05 m³/m² | colchão e rejunte |

Os parâmetros MUST ser editáveis por um administrador ou responsável técnico autorizado, com versão, autor, data, justificativa e impacto recalculado. A mudança não deve apagar a versão anterior.

## 6. Projeção física vigente

As fórmulas são executadas pelo módulo `production-planning.mjs`.

| Etapa | Unidade principal | Volume físico inicial | Complementos de planejamento |
|---|---|---:|---|
| Projeto executivo | projeto | 1 conjunto | memoriais, aprovações, compatibilização e locação |
| Terraplanagem | m³ | 16.387,64 m³ | 1.366 viagens internas de 12 m³; referência de 384 m³/dia |
| Drenagem pluvial | m | 800,47 m | 49 bocas de lobo; referência de 25 m/dia |
| Rede de água | lote | 298 lotes | 2.980 m de PEAD, 298 cavaletes e 298 ramais |
| Meio-fio | m | 8.004,68 m | duas faces para aproximadamente 4.002,34 m de eixo viário |
| Pavimentação | m² | 32.018,72 m² | 1.512.885 pedras, 1.600,94 m³ de colchão/rejunte e 303 viagens |
| Rede elétrica | poste | 24 pontos mapeados | 3.600 m de cabo como reserva inicial; janela Coelba de 30 dias |
| Sinalização | frente | 15 frentes | uma frente inicial por via registrada |

### 6.1 Fórmulas de derivação

```text
superfície viária = área dos lotes × fração viária
comprimento viário = superfície viária ÷ largura média
meio-fio = comprimento viário × 2
drenagem = comprimento viário × participação de drenagem
volume de terra = superfície viária × profundidade média
viagens de terra = teto(volume de terra ÷ capacidade da caçamba)
rede de água = lotes × metros por lote
pedras = teto(superfície viária × pedras/m² × (1 + perda))
viagens de pedras = teto(pedras ÷ capacidade do caminhão)
cabo inicial = pontos elétricos × metros de cabo por ponto
```

Para uma atividade, a produção prevista é o menor limite entre trecho liberado, produção medida, capacidade de material, equipe efetiva e caixa provisionável. O cálculo pode recomendar uma quantidade menor que a meta da etapa; isso é uma contenção operacional, não uma alteração da meta física.

## 7. Equipes e unidade de produção

O planejamento registra a equipe necessária por função e relaciona pessoas cadastradas à especialidade da etapa. A quantidade cadastrada não confirma presença em campo; ela informa capacidade potencial até que o encarregado registre o serviço.

| Etapa | Composição inicial | Pessoas requeridas |
|---|---|---:|
| Projeto executivo | responsável técnico, projetistas/compatibilização, topografia/GIS | 4 |
| Terraplanagem | encarregado, escavadeira, pá-carregadeira, motoniveladora, rolo, caminhão-pipa, 3 motoristas de caçamba | 9 |
| Drenagem | encarregado, vala/assentamento, escavadeira, topografia | 7 |
| Rede de água | encarregado hidráulico, 2 soldadores PEAD, 3 montadores, 2 ajudantes, controle/testes | 9 |
| Meio-fio | encarregado, 4 assentadores, 2 serventes, topografia | 8 |
| Pavimentação | encarregado, 4 equipe de base, 8 assentadores, 2 compactação/acabamento | 15 |
| Rede elétrica | responsável técnico, 3 eletricistas credenciados, 2 ajudantes, segurança/sinalização | 7 |
| Sinalização | encarregado e equipe de sinalização | 4 |

Unidades de trabalho MUST acompanhar a natureza do serviço:

- terraplanagem: m³, viagem interna, hora-máquina e trecho;
- drenagem: metro assentado, boca de lobo, trecho, cota e ensaio;
- água: lote atendido, metro de PEAD, ramal, cavalete e setor testado;
- meio-fio: metro assentado, alinhamento, cota e trecho;
- pavimentação: m² executado, pedra consumida, viagem, base e trecho;
- elétrica: poste, metro de cabo, estrutura, dossiê e protocolo Coelba;
- sinalização: frente, placa e via.

## 8. Materiais, requisições e disponibilidade

Para qualquer item:

```text
disponível = máximo(0, recebido - utilizado)
falta = máximo(0, necessário - disponível)
cobertura = mínimo(100, disponível ÷ necessário × 100)
```

Faixas exibidas na projeção:

| Cobertura | Estado | Consequência sugerida |
|---:|---|---|
| 75% ou mais | suficiente | permitir planejamento condicionado aos demais fatores |
| 45% a 74,99% | atenção | gerar requisição parcial e revisar data |
| abaixo de 45% | crítica | bloquear a frente ou reduzir lote de produção |
| sem item necessário | pendente | pedir cadastro ou especificação antes da compra |

Snapshot inicial persistido de materiais, calculado como recebido menos utilizado:

| Material | Disponível inicial |
|---|---:|
| Caçambas | 60 viagens |
| Manilhas Ø600/800/1000 mm | 110 m |
| Bocas de lobo | 14 un |
| Tubos PEAD | 580 m |
| Cavaletes | 58 un |
| Ramais | 48 un |
| Meio-fio pré-moldado | 1.300 m |
| Paralelepípedo | 300.000 un |
| Postes | 32 un |
| Cabos elétricos | 0 m provisionado |
| Tubos cadastrados | 100 m |

Uma requisição MUST indicar etapa, atividade, localidade, item, unidade, quantidade, data necessária, prioridade, justificativa e responsável. Compra recebida MUST manter nota, fornecedor, data e comprovante; o comprovante de terceirização segue o mesmo princípio.

## 9. Caixa como atributo mestre

O caixa influencia a capacidade de compra, a reserva de material, a data de início e a prioridade relativa das frentes. O caixa não mede área executada.

```text
saldo = entradas - saídas
caixa provisionável = máximo(0, saldo - reserva mínima)
```

Snapshot inicial da base atual:

| Indicador | Valor |
|---|---:|
| Entradas | R$ 312.000,00 |
| Saídas | R$ 628.691,30 |
| Saldo | -R$ 316.691,30 |
| Reserva mínima configurada | R$ 20.000,00 |
| Caixa provisionável | R$ 0,00 |

Enquanto o caixa provisionável for zero, o worker MUST mostrar a contenção financeira, sugerir priorização e registrar notificações; ele MUST NOT criar saída financeira automaticamente. A autoridade vigente é: dono para lançamentos de caixa, administrador para calibrações/políticas e encarregado para produção, diário e evidências. Registros podem ser consultados pelos três grupos conforme a permissão.

## 10. Ritmo, prioridade e prontidão

O ritmo de cada frente parte de `baseRate` e é ajustado por quatro fatores:

```text
fator de prontidão =
  cobertura de material × 0,35
+ cobertura de caixa × 0,30
+ capacidade efetiva de equipe × 0,20
+ cobertura de evidências × 0,15
```

O resultado é limitado ao intervalo operacional de 15% a 100% do ritmo-base. Esse piso evita que a interface pare de explicar o plano, mas não autoriza iniciar uma frente bloqueada. A prioridade final combina calibração, dependências, urgência de material, risco, caixa e prazo externo.

Cada página de etapa MUST exibir, no mínimo: volume total, unidade, ritmo-base, ritmo ajustado, material necessário, disponível e falta, equipe necessária e registrada, caixa, progresso confirmado, bloqueios, relações, sobreposição e próxima ação.

## 11. Relações, sobreposições e ordem da obra

| Origem | Destino | Regra vigente |
|---|---|---|
| Projeto executivo | Terraplanagem | projeto libera locação e terraplanagem |
| Terraplanagem | Drenagem | sobreposição setorial somente com greide e rota interna liberados |
| Drenagem | Rede de água | rede de água entra após drenagem do setor aceita |
| Rede de água | Meio-fio | meio-fio acompanha setores com rede testada |
| Meio-fio | Pavimentação | pavimentação exige meio-fio e base liberados |
| Pavimentação | Rede elétrica | execução elétrica fica por último; aprovação e compra podem correr em paralelo |
| Rede elétrica | Sinalização | sinalização fecha a frente após rede e pavimento aceitos |

As sobreposições são setoriais, nunca globais. O sistema SHOULD dividir a obra em setores de frente e MUST evitar que duas atividades ocupem a mesma localidade incompatível sem uma regra de convivência registrada.

## 12. Páginas da projeção

### 12.1 Painel de workers — `/admin/workers`

É a página de leitura e monitoria. Deve apresentar:

1. resumo do DWG e qualidade da base;
2. caixa, material, equipe e alertas;
3. uma linha por etapa com volume, ritmo, equipe, falta e relação;
4. agenda do loop vivo;
5. histórico de ciclos, notificações e testes;
6. link para este RFC e para a página dedicada.

### 12.2 Página dedicada de etapa — `/admin/workers/stage?stage=<chave>`

Apresenta o fluxograma de atividades, datas do cronograma, requisitos, produção, materiais, disponibilidade, correlações e sobreposições. As atividades são navegáveis e o trabalhador autorizado pode abrir a edição de localização física no modelo 3D do loteamento.

### 12.3 Página dedicada de atividade — `/admin/workers/activity?stage=<chave>&activity=<id>`

Apresenta cabeçalho, linhas de status, orçamento proporcional, responsável, datas, unidade de produção, requisito de saída, diário de obra e sessão responsiva de anexos. A ação “Registrar e propagar” cria um fato, preserva o comprovante e solicita nova leitura operacional.

### 12.4 Contratos de leitura

| Recurso | Função |
|---|---|
| `GET /api/automation/monitor` | monitor de workers, jobs, agenda, notificações e projeção |
| `GET /api/automation/panorama` | panorama de caixa, etapas, materiais, equipe e projeção física |
| `POST /api/operational-loop` | executar ciclo de reanálise autorizado |
| `GET /api/workbench/state?stage=...` | contexto de uma etapa e atividades |
| `GET/POST /api/workbench/diary` | diário e anexos de atividade/etapa |

### 12.5 Contrato de compreensão da inferência

Este RFC define a projeção física, as premissas de dimensionamento e os limites da base cartográfica. O [RFC-AP-0002](rfc-compreensao-operacional-dwg.md) define como essa projeção é empacotada para a inferência por etapa e atividade, incluindo localidade, materiais, requisitos, pessoal, equipe, equipamentos, evidências e origem de cada valor.

O endpoint MUST distinguir dado cartográfico observado, cálculo derivado, configuração operacional, sugestão da IA e confirmação humana. O manifesto publicado deve ser usado com seus limites atuais: ele contém centros, áreas e indicadores de alinhamento dos 298 lotes, mas não deve ser tratado como se trouxesse todos os vértices dos polígonos ou comprimentos medidos de vias. Quando a atividade exigir perímetro, extensão, corte, aterro ou seleção polígono a polígono, a geometria vetorial ou a medição validada MUST ser fornecida como entrada adicional.

## 13. Contrato de inferência NVIDIA

O endpoint recebe um contexto normalizado. A estrutura mínima é:

```json
{
  "project": {"id": "alianca-park", "source": "dwg-georeference.json"},
  "baseline": {"lotCount": 298, "lotAreaM2": 99437.03},
  "stage": {"key": "paving", "localityId": "setor-a"},
  "production": {"quantity": 32018.72, "unit": "m²", "adjustedRate": 600},
  "resources": {"cashCoverage": 0, "materialCoverage": 19.83, "personnelCoverage": 0.25},
  "relations": [{"type": "dependency", "from": "curbs", "to": "paving"}],
  "overlap": {"mode": "sequencial", "withStages": []},
  "facts": ["production.measured", "material.received"],
  "requestedAction": "recalcular agenda e requisições"
}
```

A resposta MUST devolver a justificativa da recomendação, dados considerados, incertezas, impactos, próxima ação e nível de autonomia. A inferência MAY sugerir agenda, prioridade, requisição, pedido de evidência ou notificação. O worker é responsável por validar o formato, impedir transições proibidas, persistir o evento e enviar para confirmação humana quando necessário.

Fluxo:

```text
entrada factual
  → normalização
  → leitura física do DWG
  → cálculo de recursos e relações
  → inferência NVIDIA
  → validação do worker
  → sugestão / requisição / notificação
  → confirmação autorizada
  → persistência e nova leitura
```

## 14. Gatilhos e propagação

| Gatilho | Leitura | Propagação |
|---|---|---|
| `cash.changed` | recalcular caixa provisionável e prioridade | agenda, alerta financeiro e requisições |
| `material.received` | atualizar saldo físico do item | cobertura da etapa e previsão |
| `production.measured` | converter unidade de campo e atualizar avanço | diário, cronograma e próxima frente |
| `receipt.received` | validar comprovante e origem | custo, material e auditoria |
| `activity.incomplete` | localizar campo ausente | pergunta ao encarregado ou responsável |
| `activity.completed` | verificar requisito de saída | liberação condicionada da relação posterior |
| `coelba.deadline-near` | acompanhar prazo externo | alerta a dono e administrador |
| `navigation.changed` | atualizar contexto da tela | mensagem contextual no chat de IA |

Uma propagação MUST apontar o evento de origem, a regra aplicada, os registros afetados e o usuário ou worker que a executou.

## 15. Evidências, qualidade e aceitação

Para aceitar uma produção, o registro SHOULD conter atividade, etapa, localidade, unidade, quantidade, data/hora, responsável, condições da frente e evidência. A confirmação continua humana. OCR, se usado, apenas compara dados do documento e pode apontar divergências; não certifica sozinho a veracidade jurídica da identificação ou do serviço.

Critérios mínimos de aceite da projeção:

- o número de lotes e a área do DWG aparecem iguais no painel e na API;
- as fórmulas de volume apresentam premissas e unidade;
- uma alteração de material recalcula cobertura e falta sem apagar histórico;
- uma alteração de caixa recalcula a agenda sem gerar lançamento financeiro;
- um registro de produção exige localidade e unidade;
- a etapa posterior não é liberada sem o requisito correspondente;
- o prazo Coelba permanece separado da execução física;
- o resultado da NVIDIA é auditável e não conclui a obra sozinho.

## 16. Alinhamento com referências ISO

Este RFC usa as referências como orientação de gestão da informação e do projeto; ele não declara certificação do sistema.

| Referência | Aplicação no Aliança Park |
|---|---|
| [ISO 19650-1:2018](https://www.iso.org/standard/68078.html) | identificação da fonte, organização, versão, troca e registro de informação do DWG, evidências e requisições |
| [ISO 21502:2020](https://www.iso.org/standard/74947.html) | iniciação, planejamento, execução, controle e encerramento das frentes e do cronograma |
| [ISO 9001:2015](https://www.iso.org/standard/62085.html) | informação documentada, competência, recursos, monitoramento, não conformidade e melhoria |
| [ISO 31000:2018](https://www.iso.org/standard/65694.html?browse=tc) | identificação, tratamento, comunicação e monitoramento de riscos de caixa, material, prazo e dependência |

O registro do sistema deve manter identificador, versão, data, autor, fonte, status, decisão, evidência e vínculo com a atividade. A nomenclatura local pode ser adaptada ao sistema de gestão do empreendimento.

## 17. Glossário operacional

**Base DWG:** recorte publicado do desenho usado para extrair áreas, contagens, limites e pontos.

**Baseline físico:** conjunto versionado de quantidades e premissas que inicia a projeção.

**Calibração:** alteração autorizada de coeficiente, ritmo, prioridade ou requisito, sempre com justificativa.

**Unidade de produção:** unidade que permite medir o trabalho executado, como m³, m, m², lote, poste ou viagem.

**Cobertura:** proporção disponível de um recurso em relação ao necessário.

**Falta:** quantidade necessária que não está disponível para a frente.

**Capacidade efetiva:** equipe registrada e disponível, limitada para impedir que cadastro incompleto pare a explicação do plano.

**Relação:** dependência, liberação ou condição entre etapas.

**Sobreposição:** possibilidade controlada de duas frentes trabalharem em setores compatíveis.

**Fato:** ocorrência registrada, como caixa lançado, material recebido, produção medida ou anexo enviado.

**Propagação:** consequências persistidas e notificadas a partir de um fato.

**Inferência:** recomendação gerada pela NVIDIA a partir do contexto normalizado.

**Confirmação humana:** aceitação explícita de quem possui competência ou autoridade para validar o fato.

**Prontidão:** leitura combinada de caixa, material, equipe, dependências e evidências.

## 18. Controle de mudanças

Alterações na geometria, nos parâmetros, na composição de equipe, nos materiais, nas relações ou nas regras de autonomia MUST gerar nova versão do baseline ou da diretriz. A mudança deve indicar:

```text
id da mudança · autor · data · versão anterior · versão nova
motivo · fonte · impacto físico · impacto financeiro · confirmação
```

**Histórico:**

- `1.0.0` — 04/09/2026 — primeira formalização da projeção física derivada do DWG, integração de materiais, equipes, caixa, relações, páginas e inferência NVIDIA.
