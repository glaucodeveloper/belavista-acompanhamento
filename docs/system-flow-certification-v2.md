# Bateria de inicialização à entrega — sistema cognitivo operacional

**Versão:** 2.0  
**Data da inspeção:** 13/09/2026  
**Escopo:** Aliança Park — operação de obra, etapas, atividades, registros, caixa, agenda, notificações, leads, conversas e comissões.

## 1. Objetivo

Este documento reúne os fluxos completos do programa e define uma bateria repetível para certificar a passagem de uma entrada operacional até a entrega, preservando rastreabilidade, valores financeiros, evidências e decisões da IA.

“Certificado” aqui significa: há contrato de dados, implementação identificável e teste executável. Credenciais de produção, aprovação da Meta, Firebase real, NVIDIA real e disparo externo continuam dependentes de ambiente autorizado.

## 2. Corpo cognitivo aplicado

```text
entrada humana / webhook / evento
        ↓
normalização + contexto (obra, etapa, atividade, localidade, ator)
        ↓
compreensão da intenção e dos requisitos
        ↓
validação de conflito (tempo, deslocamento, duplicação, dependência, caixa)
        ↓
decisão explicável da IA
        ↓
agenda / atividade / registro / compra / notificação
        ↓
propagação para caixa, leads, responsáveis, histórico e canais
        ↓
confirmação, evidência, auditoria e próximo ciclo
```

Cada entrada deve manter, quando aplicável: `source`, ator, timestamp, `correlationId`, etapa, atividade, localidade, unidade/quantidade, área do mapa, evidência, valor monetário, status, autorização/consentimento e justificativa/confiança da decisão.

Documentos de referência: [arquitetura operacional](./agent-operational-architecture.md), [playbook cognitivo de construção](./ai-construction-operational-playbook.md), [manual de planejamento inteligente](./manual-usuario-planejamento-inteligente.md), [manual técnico de planejamento](./construction-planning-technical-manual.md) e [RFC de compreensão operacional](./rfc-compreensao-operacional-dwg.md).

## 3. Inventário dos fluxos de ponta a ponta

| ID | Fluxo | Inicialização | Resultado certificado | Evidência/teste |
|---|---|---|---|---|
| F0 | Boot, autenticação e ambiente | Servidor, sessão e `.env` | Aplicação carrega; segredo não vai para o navegador; token protege rotas administrativas | `server.mjs`, `admin-auth.mjs`, `auth-service.mjs`; `tests/admin-runtime/source-contract.test.mjs` |
| F1 | Lead público → CRM | Formulário público ou origem social | Lead normalizado, origem preservada e disponível em Leads sem vazar contexto administrativo | `public-lead-form.mjs`, `public-leads.html`, `worker/src/routes.js`; `tests/real/mock-worker-contract.test.mjs` |
| F2 | Instagram → conversa → lead | Webhook/evento de mensagem | Mensagem entra na caixa contextual; resposta só ocorre com credencial, permissão e endpoint válidos | `worker/src/social.js`, `worker/src/routes.js`, `desktop/instagram-bridge.mjs`, `admin-communications.mjs` |
| F3 | Etapa → requisitos → atividade | Etapa selecionada e requisitos textuais | Requisitos, condições, gatilhos, compras e unidade de produção alimentam atividades e agenda | `stage-workbench.mjs`, `production-planning.mjs`, `execution-planning-v8.js`; `tests/inference/01-contract-source.test.mjs` |
| F4 | Atividade → cronograma/PERT | Atividade dedicada | Aba descritiva, posição no cronograma, dependências e relações conectáveis; editar é ação explícita | `components.js`, `stage-workbench-data.mjs`, `tests/admin/stages-v9.test.mjs` |
| F5 | Registro → mapa → histórico | Entrada de produção, apontamento ou comprovante | Registro vincula atividade/etapa, área do mapa, quantidade, evidência e valida conflitos antes de propagar | `records-activity-drill-in-v5377.mjs`, `persistence.mjs`, `worker/src/operational-loop.js` |
| F6 | Registro/caixa/material → provisão | Compra, recibo, valor ou mudança de disponibilidade | Caixa livre, comprometido, reserva, materiais e agenda são recalculados; duplicação é rejeitada | `worker/src/cash-evidence.js`, `worker/src/budget.js`; `tests/inference/04-cash-and-provision.test.mjs`, `05-receipts-material-propagation.test.mjs` |
| F7 | Diário → continuação | Evidência confirmada no campo | Conclusão libera dependência correta, cria próximo passo e notifica apenas responsáveis/localidades pertinentes | `worker/src/operational-loop.js`, `worker/src/notifications.js`; `06-field-diary-continuation.test.mjs`, `07-stage-unlock-chain.test.mjs` |
| F8 | Pessoal/localidade → agenda | Responsável, função e disponibilidade | Alocação respeita localidade, função e sobreposição; agenda individual e evento de ciclo ficam auditáveis | `worker/src/planning-service.js`, `worker/src/operational-state.js`; `08-personnel-locality.test.mjs`, `09-event-matrix.test.mjs` |
| F9 | Trabalhador → ciclo operacional | Worker autenticado e estado anterior | IA produz próximo estado completo, racionalidade, agenda e notificações sem fallback silencioso | `worker/src/orchestrator.js`, `worker/src/operational-loop.js`; `01-contract-source.test.mjs`, `10-full-journey.test.mjs` |
| F10 | Conversa administrativa → ação segura | Mensagem no chat de workers/admin | Mensagem contextualiza a tela, observa eventos e dispara somente controles existentes; resposta local não finge integração | `worker-context-chat.mjs`, `worker-context-chat.css`; `tests/admin/worker-context-chat-v5407.test.mjs` |
| F11 | Contrato/lote → venda → comissão | Cliente, lote vendedor, corretor e condições | Proposta/contrato gera venda rastreável, divisão e comissão; valores fecham com o quadro comercial | `components.js`, módulos de propostas/comissões; `tests/real/mock-worker-contract.test.mjs` |
| F12 | Relatório/PDF → entrega | Estado consolidado e filtros | Exportação representa o mesmo estado operacional e financeiro usado na tela, com data e origem | `reports`, `commission` e módulos de exportação; validar visualmente no navegador |
| F13 | Deploy/health/realtime | Worker publicado e configuração externa | Endpoint responde, RTDB/Firebase mantém sincronização e webhook retorna confirmação sem expor segredo | `worker/src/index.js`, `worker/src/routes.js`, `worker/src/realtime.js`, `firebase-functions/index.js` |

## 4. Bateria executável

### 4.1 Inicialização local

```powershell
cd F:\belavista-acompanhamento
npm install
node --check app.js
node --check components.js
node --check worker/src/index.js
node --check worker/src/routes.js
npm run start
```

Smoke mínimo: abrir `/admin`, `/admin/workers`, `/admin/workers/activity`, `/admin/communications` e confirmar que o shell responde, que a seleção de etapa permanece estável e que nenhum mapa captura eventos fora de sua área.

### 4.2 Contratos e domínio

```powershell
npm run test:inference:source
npm run test:real:mock
npm run test:chat
node --test tests/admin/stages-v9.test.mjs
```

Critérios: estado completo, NVIDIA/IA estrita quando exigida, dependências preservadas, localidade correta, caixa respeitado, notificações direcionadas, GitHub sem vazamento de PAT e chat sem fallback silencioso.

### 4.3 Jornada funcional manual

1. Criar/selecionar etapa e confirmar requisitos, unidade e responsável.
2. Abrir uma atividade pelo card; confirmar que o card não navega para Worker e que somente **Editar** abre a edição.
3. Inserir um registro pela tela de registros, selecionar área no mapa e anexar evidência.
4. Tentar duplicar a mesma atividade/data/área e tentar sobrepor horário; ambas devem ser sinalizadas.
5. Confirmar registro; verificar histórico, caixa/material, agenda e notificação do responsável.
6. Fechar a evidência necessária; confirmar desbloqueio somente da dependência correta.
7. Rodar o ciclo operacional; comparar estado anterior, decisão da IA, próximo estado e notificações.
8. Criar uma venda, conferir proposta/contrato, comissão e total do corretor.
9. Exportar relatório/PDF e conferir totais, período, origem e identificação da obra.

### 4.4 Integrações externas — certificação condicionada

| Integração | Pré-condição | Verificação | Não aprovado sem |
|---|---|---|---|
| Instagram | App ID/secret, token, verify token, permissões e callback HTTPS | validar `GET /instagram/webhook`, enviar evento real, receber conversa e responder | credenciais Meta e conta de teste |
| Firebase/RTDB | projeto, URL/database, credenciais e regras | autenticar, ler/gravar estado, ouvir notificação e confirmar reconexão | sessão Firebase válida e regras publicadas |
| NVIDIA/IA | endpoint/modelo e segredo do Worker | inferir com contexto completo, registrar racionalidade e rejeitar fallback | segredo e endpoint acessíveis |
| GitHub | PAT interno e repositório | round-trip restrito a dados operacionais, sem segredo no payload | PAT válido e permissão do repositório |

## 5. Resultado da inspeção atual

| Área | Resultado | Classificação |
|---|---|---|
| Contrato da inferência | 6/6 testes passaram | PASS |
| Domínio mock e propagação | 30/30 testes passaram | PASS |
| Chat de workers | 5/6 passaram; 1 expectativa do teste procura markup antigo (`data-worker-chat-action`) | PENDENTE DE ALINHAMENTO |
| Fonte pública | teste executado sem `BELAVISTA_ROOT`; falhou por caminho indefinido, não por regra de negócio | PENDENTE DE FIXTURE |
| Instagram/Firebase reais | não executados neste ambiente | BLOQUEADO POR CREDENCIAIS |
| Jornada visual, mapa, PDF e browser | requer execução manual/E2E com navegador | A EXECUTAR |

Portanto, a base cognitiva e o domínio simulado estão aprovados; a entrega completa do produto ainda deve fechar os itens pendentes e as integrações reais.

## 6. Critérios de aceite da entrega

- Cada entrada tem origem, ator, tempo, contexto e correlação.
- Nenhum registro confirmado duplica ou desloca atividade sem alerta/decisão explícita.
- Caixa e materiais não liberam mais do que o saldo permitido.
- Dependências liberam somente após condição e evidência.
- Notificação chega ao responsável/localidade corretos.
- IA expõe compreensão, impacto, ação proposta e motivo; não inventa resposta local.
- Instagram e Firebase têm logs de sucesso/erro, retry seguro e segredo apenas no Worker.
- Relatórios e documentos de valores fecham com o estado persistido.
- Os testes automatizados ficam verdes e os cenários bloqueados ficam identificados por ambiente, nunca mascarados.

## 7. Evidências a arquivar

Guardar em `output/certification/<timestamp>/`: saída dos comandos, versão/commit, cópia sanitizada da configuração, screenshots das telas principais, payloads anonimizados de webhook, IDs de correlação, resultado de exportação e decisão final PASS/PENDENTE/BLOQUEADO. Nunca arquivar tokens, App Secret, PAT ou sessão Firebase.

