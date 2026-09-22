# Arquitetura do agente operacional Aliança Park

## 1. Princípio

O agente não trabalha por memória de conversa. Ele trabalha sobre fatos persistidos e relações entre entidades.

```text
entrada observada
  -> evento normalizado
  -> relações afetadas
  -> regra de completude/prioridade
  -> ação permitida
  -> notificação ou aprovação
  -> auditoria
```

O banco é a memória operacional. O agente interpreta o estado, mas não substitui o registro da obra, do caixa, do CRM ou da comissão.

## Árvore executável de diretrizes

Além desta especificação, a árvore usada pelo sistema está em `agent-tree.js` e
é entregue pelo endpoint local `GET /api/agent/tree`. Ela organiza as regras
em três raízes: **governança**, **obra e produção** e **lotes/CRM/comissões**.

Cada nó declara quatro partes:

```text
diretriz → requisitos verificáveis → evento de entrada → ação/autonomia
```

Exemplo: `lead.message.received` chega ao nó de atendimento, extrai os fatos
da conversa automaticamente e, se faltarem intenção ou lote, cria a pergunta
de completude. Já uma solicitação de reserva produz `CONFIRMAR`, nunca reserva
o lote sem decisão humana.

O endpoint `POST /api/agent/evaluate` recebe um evento e devolve quais ramos
foram acionados, os requisitos aplicáveis e se a ação exige aprovação. Isso
permite que formulário, CRM, cronjob ou encarregado disparem o mesmo fluxo.

## 2. Entidades e relações

```text
Obra
 └─ Etapa
     └─ Atividade
         ├─ produção/unidade
         ├─ material
         ├─ compra
         ├─ comprovante
         ├─ responsável
         └─ dependência

Lote
 ├─ disponibilidade
 ├─ cliente/lead
 ├─ venda/proposta/contrato
 └─ corretor/carteira

Caixa
 ├─ entrada
 ├─ saída
 ├─ compromisso
 └─ liberação financeira da etapa
```

Relações mínimas:

| Relação | Efeito operacional |
|---|---|
| atividade pertence à etapa | avanço da etapa |
| atividade depende de atividade | bloqueio/liberação |
| etapa consome caixa | prontidão financeira |
| atividade consome material | necessidade de compra |
| compra possui comprovante | rastreabilidade |
| lead demonstra interesse em lote | oportunidade comercial |
| venda pertence a lote e corretor | carteira e comissão |
| pagamento possui marco de comissão | repasse elegível |
| elétrica depende da pavimentação | última frente e prazo Coelba |

## 3. Entradas do agente

Todas as entradas devem gerar um `agent_event` idempotente.

```json
{
  "id": "EVT-...",
  "type": "cash.created",
  "entity": "cash_flow_entries",
  "entityId": "CX-...",
  "occurredAt": "2026-08-24T12:00:00Z",
  "actor": {"id": "warley", "role": "Administrador"},
  "payload": {},
  "source": "panel|crm|cron|import|webhook"
}
```

Tipos principais:

```text
cash.created / cash.updated
stage.updated / activity.created / activity.updated
production.measured
material.low / purchase.created / receipt.attached
lead.created / lead.message.received / lead.updated
lot.status.changed
sale.created / sale.updated / payment.received
commission.reason.updated
cron.completed / cron.failed
```

Entradas de Instagram e WhatsApp devem ser adaptadores locais. O adaptador observa a conversa, transforma a mensagem em `lead.message.received` e nunca grava apenas texto solto.

## 4. Ciclo de decisão

```text
1. Receber evento
2. Deduplicar por source + externalId
3. Recalcular fatos derivados
4. Consultar relações afetadas
5. Verificar completude
6. Verificar caixa, dependências e prioridade
7. Escolher autonomia da ação
8. Executar ou pedir aprovação
9. Gravar resultado e evidências
```

Cada execução produz:

```text
agent_runs
agent_run_events
agent_actions
agent_notifications
agent_approvals
```

Toda ação deve responder: dados usados, regra aplicada, entidade alterada e usuário que aprovou.

## 5. Regras de consciência operacional

### Obras

```text
prontidão = prioridade relacional
           × dependências liberadas
           × cobertura de caixa
           × materiais dimensionados
           × completude da atividade
```

Regras essenciais:

- caixa só pode ser alterado por Administrador;
- saldo negativo reduz a prontidão e cria alerta;
- uma atividade sem unidade, quantidade ou produtividade não pode ser propagada;
- produção de terraplanagem usa viagens internas × m³/viagem;
- pavimentação usa caminhões × pedras/caminhão ÷ pedras/m², descontando perdas;
- rede de água exige PEAD dimensionado, 298 cavaletes e 298 ramais;
- elétrica permanece por último, depende da pavimentação e possui marcos Coelba;
- comprovante ausente gera pendência, não confirmação automática.

### CRM de lotes e clientes

```text
mensagem recebida
 -> identificar canal e contato
 -> associar ou criar lead
 -> extrair fatos
 -> associar lote/interesse
 -> calcular completude
 -> perguntar somente fatos faltantes
 -> sugerir lote/plano
 -> pedir aprovação antes de condição comercial
```

Categorias de completude:

```text
intenção, orçamento, prazo, finalidade, localização,
posição solar, lote, forma de pagamento, canal,
corretor, próximo passo
```

O agente pode registrar e perguntar automaticamente. Reserva, desconto, proposta formal, contrato e mudança de condição exigem confirmação.

## 6. Autonomia por ação

| Ação | Nível |
|---|---|
| registrar mensagem, lead ou fato | AUTO |
| recalcular completude e prioridade | AUTO |
| criar pendência ou alerta | AUTO |
| perguntar dado faltante | AUTO |
| preparar sugestão de lote ou resposta | SUGERIR |
| enviar disponibilidade confirmada | CONFIRMAR |
| reservar lote | CONFIRMAR |
| oferecer desconto/alterar plano | CONFIRMAR |
| emitir contrato | CONFIRMAR |
| registrar entrada/saída de caixa | ADMINISTRADOR |

## 7. Cronjobs

### Inicialização

```text
startup-health
  verifica banco, filas, diretórios e integrações

startup-reconcile
  recalcula fatos derivados, caixa, prontidão e completude

startup-broker-report
  gera o mês corrente e o acumulado por corretor
```

### Rotina

```text
crm-sync               a cada 5 min
agent-event-dispatch   a cada 1 min
stage-readiness        a cada 15 min
cash-snapshot          na inicialização e a cada 1 h
broker-monthly-report  diariamente às 06:00
broker-accumulated     diariamente às 06:10
commission-audit       diariamente às 06:20
receipts-review        diariamente às 07:00
coelba-deadline-check  diariamente às 07:15
```

Os jobs devem ser reexecutáveis. Cada execução usa `job_runs(job, period, startedAt, finishedAt, status, fingerprint)` para não duplicar relatórios ou notificações.

## 8. Relatórios de corretores

Para cada corretor e competência:

```text
vendas do mês
entradas recebidas
marcos elegíveis
razões de comissão
repasse Warley
repasse contraparte
total do mês
total acumulado
pendências documentais
```

As razões permanecem editáveis e versionadas:

```text
Sinal
Parcela intermediária
Mensal
À vista
```

O relatório deve guardar o snapshot da regra usada no momento do cálculo. Assim uma alteração futura não reescreve o histórico.

Saídas:

```text
output/broker-reports/YYYY-MM/<corretor>-YYYY-MM.xlsx
output/broker-reports/YYYY-MM/<corretor>-YYYY-MM.pdf
```

## 9. Notificações

Toda notificação deve conter:

```text
origem
entidade
fato observado
regra acionada
ação recomendada
botões: Completar | Aprovar | Ignorar | Abrir contexto
```

Exemplo:

```text
Rede Elétrica
Faltam 45 dias para solicitar a ligação da Coelba.
Faltam: projeto aprovado, ART/RRT e padrão de entrada.
[Abrir etapa] [Criar pendência]
```

## 10. Primeira demonstração reproduzível

1. Administrador registra uma saída de caixa para postes.
2. O agente recalcula a cobertura da Rede Elétrica.
3. A etapa continua bloqueada até a pavimentação e os requisitos Coelba.
4. Uma mensagem fictícia de WhatsApp cria um lead e associa interesse a um lote.
5. O agente identifica orçamento ausente e gera pergunta.
6. Uma venda de teste recebe corretor e plano.
7. O cronjob gera XLSX/PDF mensal e acumulado.
8. A auditoria mostra eventos, regras e ações executadas.
