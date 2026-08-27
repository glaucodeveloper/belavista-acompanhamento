# Belavista V10 · Cloudflare Workers + NVIDIA

Esta camada mantém a UI atual e move a API operacional para Cloudflare Workers, com:

- `D1` como fonte de verdade para registros, agenda, caixa, orçamento e notificações.
- `R2` reservado para fotos, recibos e anexos de obra.
- `Queues` para digestão assíncrona das pontas visuais.
- `Workers AI` com `@cf/nvidia/nemotron-3-120b-a12b` para explicações relacionais.
- `NVIDIA NIM` vision para fotos de obra, comprovantes e recibos.

## Estrutura

```text
worker/
  src/
  migrations/
  scripts/
  wrangler.jsonc.example
```

## Endpoints principais

- `GET /api/health`
- `GET /api/runtime`
- `GET /api/ai/status`
- `POST /api/ai`
- `GET|POST /api/records`
- `PUT|DELETE /api/records/:id`
- `GET|POST /api/cash-flow`
- `GET|POST /api/budget-lines`
- `GET|POST /api/stage-agenda`
- `GET /api/notifications`
- `GET /api/operational-state`
- `POST /api/intake/record-photo`
- `POST /api/intake/purchase-receipt`

## Frontend

O frontend continua fazendo chamadas para `/api`. Há duas formas mínimas de integração:

1. Definir `BELAVISTA_API_BASE` no servidor local para ele atuar como proxy até o Worker.
2. Definir `window.BELAVISTA_API_BASE`, `?apiBase=` ou `localStorage["belavista.api-base"]` para páginas estáticas.

## Variáveis esperadas

- `NVIDIA_NIM_API_KEY`
- `NVIDIA_NIM_MODEL` opcional
- `NVIDIA_NIM_API_URL` opcional
- `WORKERS_AI_MODEL` opcional
- binding `BELAVISTA_DB`
- binding `BELAVISTA_MEDIA`
- binding `BELAVISTA_QUEUE`
- binding `AI`
