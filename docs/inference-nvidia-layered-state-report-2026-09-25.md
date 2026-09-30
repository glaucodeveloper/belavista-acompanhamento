# Avaliação da geração NVIDIA por camadas

Data: 25/09/2026
Modelo exercitado: `openai/gpt-oss-20b` via NVIDIA NIM
Estado de execução: `persist:false`, `dryRun:true`

## Conclusão

A geração gradual por camadas é viável e foi exercitada contra o estado operacional real do aplicativo. A separação entre aplicação do evento, análise de atividades por etapa, reconciliação global do cronograma e auditoria tornou as falhas localizáveis e permitiu corrigi-las sem fallback determinístico.

O resultado ainda não equivale a uma certificação final de `33/33` na mesma execução após todas as mudanças. A bateria completa inicial teve 16 aprovados e 17 reprovados; depois, os casos reprovados foram isolados, corrigidos e repetidos, além de uma checagem adicional de conclusão de agenda. Todos os repros direcionados acabaram aprovados. A suíte completa deve ser repetida antes de declarar o pacote integral certificado.

## Fluxo avaliado

1. **Evento e patch** — o NVIDIA recebe o evento e gera apenas o delta de estado. O Worker faz merge por ID e fixa `eventApplied`, `lastEvent` e versão a partir do evento original.
2. **Análise por etapa** — todas as atividades são reavaliadas em lotes limitados por etapa. Os contratos verificam cobertura e metadados; respostas incompletas recebem reparo NVIDIA ou são subdivididas.
3. **Reconciliação global** — uma chamada NVIDIA compatibiliza as decisões de todas as etapas em agenda e bloqueios.
4. **Auditoria NVIDIA e validação factual** — a auditoria verifica a transição total. Em paralelo, validações locais conferem invariantes e, se necessário, devolvem o erro como `repairFeedback`; elas não aplicam o patch nem decidem atividades.

## O que a primeira bateria revelou

O snapshot real usado continha 8 etapas, 25 atividades, 10 materiais, 4 colaboradores, 5 compras, 1 registro e 6 movimentos de caixa. Foram exercitados 33 eventos. As falhas não tinham uma causa única:

- O auditor confundia acumulados de estoque com a quantidade incremental do recebimento/ajuste.
- Alguns patches omitiam o fato solicitado (por exemplo, entidade declarada, disponibilidade, impedimento ou comprovante).
- O teste de consumo relacionava cabo elétrico a uma atividade de drenagem, uma pré-condição incoerente.
- A aceitação e a conclusão de agenda precisavam de semânticas distintas; no evento de conclusão, o auditor confirmou a propagação para a atividade vinculada.
- O esquema JSON exato para um diário composto por evidências excedia o tempo disponível para a geração.

## Estratégias sucessivas e resultados

| Pista da falha | Estratégia seguinte | Resultado observado |
|---|---|---|
| Auditoria aritmética rejeitou recebimento multi-item e ajuste de inventário válidos | Enviar ao auditor os valores anteriores, deltas e valores esperados; explicitar a diferença entre recebimento, consumo e ajuste | Recebimento com múltiplos itens e ajuste de inventário passaram; o consumo também passou após corrigir a associação material/atividade do fixture |
| Prompt e feedback ainda permitiram omitir um material declarado | Esquema JSON NVIDIA por tipo de evento exigindo coleção, ID e campos factuais do objeto | Declarações de material, atividade e localidade passaram |
| Patches de metadata, comprovantes, disponibilidade, pedidos, impedimentos e agenda podiam sair incompletos | Validação factual local mais contrato de saída com os IDs/status esperados; reenvio ao modelo quando houver divergência | Os casos direcionados de metadados, comprovantes, disponibilidade, pedidos, impedimento e agenda passaram |
| `agenda.item.completed` deixou a atividade relacionada pendente | Conferir o evento e a resposta do auditor; exigir conclusão do item e da atividade indicada/vinculada. Aceitação continua sem concluir a atividade | Aceite e conclusão passaram com resultados distintos e coerentes |
| Esquema detalhado do diário expirou; o diário parcial passou | Reduzir o esquema ao mínimo estrutural obrigatório e manter evidências e semântica cobertas pela validação factual | Diário concluído com evidência e diário parcial passaram; ambos foram verificados novamente com o esquema compacto |

As reexecuções direcionadas cobriram os 17 casos sinalizados pela bateria inicial e a conclusão de agenda descoberta durante o diagnóstico. Houve 18 aprovações direcionadas ao longo das iterações; casos que exigiram mudança de estratégia foram reexecutados até passar. As confirmações finais do esquema compacto incluíram declaração de material e diários concluído/parcial.

## Integridade e limites

- Todos os casos direcionados usaram gravação desativada e conferiram a impressão digital do banco antes/depois; o banco local permaneceu inalterado.
- O snapshot final também passou sem disparar inferência e confirmou novamente as contagens do estado.
- A validação real desta rodada cobre `openai/gpt-oss-20b`; não certifica outros modelos NVIDIA.
- Não foi executada uma única bateria final de 33 casos após todas as correções. Assim, 16 aprovações da primeira rodada e os replays focados constituem evidência forte de progresso, mas não substituem a execução integral pós-correção.

## Arquivos do fluxo

- `worker/src/strict-nvidia-state.js` — patch em camadas, contratos JSON por evento, auditoria aritmética e validação/reparo factual.
- `worker/test/strict-nvidia-state.test.js` — testes de merge, camadas, contexto de auditoria e esquema de declaração.
- `tests/inference/application-state.run.mjs` — execução contra snapshot real, filtros por caso, dry-run e comparação do banco.
- `tests/inference/fixtures/application-state.mjs` e `tests/inference/fixtures/effect-validators.mjs` — casos e efeitos esperados.

## Verificações locais

- `npm run test:inference:source`: 18 testes aprovados, 0 falhos.
- `node --env-file-if-exists=.env tests/inference/application-state.run.mjs --snapshot-only`: snapshot aprovado, sem inferência e sem alteração no banco.
- `git diff --check` dos arquivos deste fluxo: sem erros de whitespace.
