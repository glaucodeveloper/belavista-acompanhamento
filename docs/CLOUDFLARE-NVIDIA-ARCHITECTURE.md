# Aliança Park V10 · Cloudflare + NVIDIA

Atualizado em 29 de agosto de 2026.

## Objetivo

Esta camada move a operação do Aliança Park para Cloudflare Worker + D1 + R2, mantendo a interface atual intacta. O foco é registrar evidências de campo, recibos, agenda, orçamento e notificações sem depender do backend local para produção.

## Estrutura

```text
worker/
├── src/
│   ├── index.js
│   ├── routes.js
│   ├── db.js
│   ├── nvidia.js
│   ├── budget.js
│   ├── correlation.js
│   ├── notifications.js
│   ├── workflows.js
│   └── json.js
├── migrations/
│   ├── 0001_core.sql
│   ├── 0002_budget_purchases.sql
│   └── 0003_ai_notifications.sql
└── wrangler.jsonc.example
```

## Fluxos principais

1. `POST /api/records`
   Salva o registro em D1, envia foto para R2 e cria job de digestão visual na fila.

2. `POST /api/purchase-receipts`
   Salva comprovante em D1/R2 e agenda extração de itens com NVIDIA VLM.

3. `GET /api/stage-correlations?stageId=...&explain=1`
   Calcula fatos determinísticos e, opcionalmente, pede explicação causal ao modelo de raciocínio.

4. `GET/POST /api/budget-lines`
   Mantém linhas orçamentárias com cálculo direto por `quantidade × custo unitário`.

5. `GET/POST /api/agenda-items`
   Mantém compromissos, responsável, prioridade e estado.

6. `GET/PUT /api/notifications`
   Consolida alertas de obra, orçamento e digestão visual.

7. `POST /api/operational-loop`
   Recebe um envio único da situação global da obra e usa isso para planejar compras, materiais, atividades, cronograma, caixa e notificações em um único ciclo de inferência.

## Integração com o projeto atual

O servidor local agora pode encaminhar chamadas selecionadas para `BELAVISTA_API_BASE`. Assim, a UI existente continua usando `/api/...`, mas o destino real pode ser o Worker publicado.

## Variáveis

```text
BELAVISTA_API_BASE=https://belavista.example.workers.dev
BELAVISTA_PUBLIC_BASE_URL=https://belavista.example.workers.dev
NVIDIA_API_KEY=...
NVIDIA_VLM_MODEL=meta/llama-3.2-90b-vision-instruct
NVIDIA_REASONING_MODEL=@cf/nvidia/nemotron-3-120b-a12b
FIREBASE_DATABASE_URL=...
FIREBASE_SERVICE_ACCOUNT_JSON=...
GITHUB_PAT=...
```

## Próximos passos sugeridos

- ligar autenticação operacional do Worker;
- publicar as migrações D1 e o bucket R2;
- apontar a interface para o Worker com `BELAVISTA_API_BASE`;
- migrar gradualmente os endpoints ainda locais conforme a operação evoluir.

## Situação Global Da Obra

O ciclo operacional único não depende de uma etapa selecionada. A inferência recebe o estado consolidado da obra inteira, incluindo:

- caixa e suas movimentações;
- materiais disponíveis, materiais recém-adicionados e cobertura por frente;
- compras, comprovantes e evidências;
- progresso registrado em campo;
- peculiaridades e contexto operacional de cada etapa;
- relações e dependências entre etapas.

## Contexto Por Etapa

Cada etapa carrega um bloco de contexto que entra nesse envio global da obra:

- `typicalDescription`: como a etapa costuma ser executada e quais são suas peculiaridades.
- `requestHints`: pistas para compras, agenda, atividades e sequência de execução.
- `evidenceFocus`: comprovações esperadas para aceitar avanço e liberar caixa.
- `procurementFocus`: materiais, serviços e riscos de suprimentos que devem entrar na inferência.
- `materialsTable`: tabela de materiais com nome, descrição, quantidade, unidade e estado.
- `notificationTargets`: áreas de chegada em tempo real, como desktop do dono, desktop administrativo e app do encarregado via Realtime Database.

Esse bloco evita rotas separadas por inteligência: o cliente apenas atualiza o estado operacional total da obra, e o Worker decide a consequência sobre cronograma, compras, agenda e notificações.

## Regras Operacionais Confirmadas

- comprovação de compra resulta em adição de material ao estado operacional;
- registro de atividade pelo encarregado resulta em progresso registrado da atividade;
- entradas de material, caixa, compras, comprovantes e progresso retornam para a inferência central;
- a IA gera novas atividades e atualiza atividades existentes já ciente de materiais, caixa e peculiaridades das etapas.

## Propagação Em Tempo Real

Os destinos de notificação e as propagações internas ficam programados nos cron jobs do Worker.

Os jobs:

- recalculam a situação global da obra;
- geram notificações operacionais;
- escrevem mudanças no Firebase Realtime Database;
- a escuta dos clientes transforma essas mudanças em notificações em tempo real.
