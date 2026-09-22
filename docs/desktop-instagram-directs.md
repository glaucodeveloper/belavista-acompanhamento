# Desktop + Instagram Direct

## Propósito

A versão Electron abre o Aliança Park como estação local de atendimento. Ela mantém a autenticação administrativa já existente e adiciona um onboarding local: responsável inicial, empreendimento e @ do Instagram.

O primeiro acesso **não salva senha do Instagram**. O responsável abre a sessão local e autentica a conta pessoalmente.

## Fluxo

1. O Electron inicia o servidor em `127.0.0.1` e usa uma pasta de dados própria do usuário do aplicativo.
2. `/desktop/setup` registra o responsável da estação e o Instagram do empreendimento.
3. A ponte Camofox é iniciada localmente e abre a caixa de Directs.
4. Um conector autorizado envia cada Direct para `POST /api/instagram/directs/inbound`.
5. O sistema deduplica pelo `messageId`, cria/atualiza o lead e persiste o histórico no CRM.
6. A IA cria somente um rascunho. A aprovação grava uma saída auditável, com entrega `awaiting-operator-send`; o operador confirma o envio no Instagram.

## Contrato local de entrada

```json
{
  "messageId": "ig-message-0001",
  "senderId": "instagram-user-id",
  "username": "cliente",
  "name": "Nome do cliente",
  "threadId": "thread-123",
  "body": "Quero saber os lotes disponíveis."
}
```

Use `Authorization: Bearer $INSTAGRAM_BRIDGE_TOKEN` quando a chamada não vier de localhost. A rota não aceita uma ponte remota sem esse token.

## Relatórios

- `GET /api/instagram/leads`: lista dos relatórios de leads originados em Direct.
- `GET /api/instagram/leads/:leadId/report`: lead, conversa e resumo.
- `POST /api/instagram/leads/:leadId/draft`: obtém novo rascunho da IA.
- `POST /api/instagram/leads/:leadId/approve-reply`: registra a aprovação, sem enviar a mensagem externamente.

## Camofox

A ponte deve ficar em loopback. Exemplo:

```bash
CAMOFOX_BASE_URL=http://127.0.0.1:9377
npm run instagram:bridge
```

A primeira execução pode baixar o navegador. Faça login manualmente na janela aberta e não importe cookies, use proxy nem armazene credenciais no projeto.

## Executar o desktop

```bash
npm install
npm run desktop:start
```

Para empacotar no Linux:

```bash
npm run desktop:package
```

## Produção

A integração local serve como estação assistida por operador. Para comunicação automatizada em produção, use a API oficial e Webhooks da Meta com os consentimentos, escopos e retenção de dados adequados.

