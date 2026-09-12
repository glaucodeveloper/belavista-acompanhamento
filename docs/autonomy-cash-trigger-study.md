# Estudo executável · agente autônomo Aliança Park

O cenário automatizado está em `tests/autonomy/cash-master-trigger-study.test.mjs` e é offline: não chama NVIDIA, Firebase ou WhatsApp reais. Ele valida o contrato que deve ser observado antes de um teste de integração.

## Gatilhos e autoridade

| Gatilho | Ação automática | Autoridade do fato | Saída esperada |
|---|---|---|---|
| `cash.changed` | recalcular prontidão e distribuição | Dono | snapshot de caixa, agenda e alerta |
| `cash.negative` | alertar risco financeiro | Dono | notificação crítica ao Dono |
| `calibration.changed` | recalcular regras e dependências | Administrador | nova versão auditável |
| `production.measured` | calcular produção e reavaliar etapas | Dono, Administrador ou Encarregado | avanço comprovado e nova decisão |
| `material.incomplete` | criar pendência de material | registro operacional | pedido/alerta de suprimentos |
| `activity.completed` | liberar a próxima relação | registro confirmado | reavaliação das etapas |
| `paving.completed` | solicitar ligação Coelba | confirmação humana | pedido pendente de aprovação |
| `coelba.deadline-near` | alertar prazo | sistema/cron | alerta de prazo |
| cron de caixa | executar panorama e planner | sistema | outbox + snapshot |
| cron de notificações | despachar outbox | sistema | RTDB/FCM; WhatsApp se configurado |

## Regra financeira testada

```text
caixa provisionável = entradas - saídas - compromissos - reserva mínima
```

As necessidades são ordenadas pelas regras do agente, e cada decisão consome o saldo restante. O teste falha se o mesmo dinheiro for alocado duas vezes. Um aporte novo deve mudar a decisão da frente sem cobertura.

O caixa libera capacidade financeira; ele não inventa avanço físico. Produção medida e evidência continuam sendo fatos separados.

## WhatsApp

O Worker usa somente pseudo-notificações. Quando uma regra gera um aviso comercial ou operacional, o evento é publicado no Firebase Realtime Database e os dispositivos autorizados fazem listen nos canais `notifications/<uid>` e `notificationAreas/<area>`. Nenhum webhook, token ou destinatário de WhatsApp é lido e nenhuma mensagem externa é enviada. O teste comprova que o adaptador nunca chama `fetch`, mesmo quando recebe configurações antigas.

Execute:

```bash
npm run test:autonomy:study
```

O teste não substitui o teste de integração com NVIDIA, Firebase Realtime Database, FCM ou gateway WhatsApp; ele comprova as relações e os gatilhos antes dessa etapa.
