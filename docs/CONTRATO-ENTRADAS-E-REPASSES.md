# Contrato atual: entradas e repasses

Este documento descreve o comportamento encontrado no frontend e no servidor em 27/10/2026. É um registro do contrato implementado; não altera regras nem define comportamento futuro.

## Modelo persistido

Entradas e saídas compartilham `cash_flow_entries`. A direção fica em `kind` (`entrada` ou `saida`); valores são guardados em centavos. O registro contém data, lote, categoria, etapa de destino, descrição, vínculo de venda, corretor, razão do repasse e campos fiscais. Arquivos ficam em `cash_flow_attachments`, ligados ao lançamento e armazenados no diretório operacional.

`GET /api/cash-flow` devolve `{ entries, summary }`. O resumo soma entradas e saídas e calcula o saldo como `entriesCents - exitsCents`. Cada lançamento expõe anexos e URL de leitura protegida.

## Lançamento comum de caixa

A página `AtlasCashRecord` implementa **saídas**: nome, etapa, valor, descrição, dados fiscais e anexo opcional. O programa converte reais para centavos e envia `POST /api/cash-flow`. Essa escrita exige perfil `owner`. O anexo escolhido na interface aceita PDF, JPG, PNG ou WEBP até 6 MB; o servidor aceita até 12 MB. Marcar o documento como `conferido` exige tipo, número, emitente, data de emissão e arquivo.

Embora a tabela e `createCashFlowEntry` aceitem ambos os sentidos, essa tela não cria entradas comerciais. A interface informa que entradas comerciais e repasses são registrados em **Repasses**. O endpoint geral força qualquer `kind` diferente de `entrada` para `saida`; se o lançamento vier associado a lote, deve ser uma entrada vinculada a lote oficial.

## Registro de entrada em Repasses

`GET /api/repasses` exige `owner` ou `admin`. A resposta compõe vendas persistidas, preço oficial do lote, plano, regra de corretagem, etapas, razões e entradas já registradas. Uma entrada aparece em `entries` quando tem `saleId`; dentro de uma venda, aparece em `receipts` quando o `saleId` coincide e `kind` é `entrada`.

O formulário seleciona uma venda existente e apresenta lote e corretor daquela venda. Exige destino (etapa), razão ativa, valor positivo, data e descrição. A projeção TypeScript converte reais para centavos e envia `POST /api/repasses/entries`. O servidor fixa `kind: entrada` e `category: Repasse`, exige `owner` ou `admin`, persiste no mesmo livro-caixa e publica o evento `cash.changed`, que recalcula o estado operacional.

O servidor confirma que o lote pertence à tabela oficial e corresponde à venda persistida; o corretor corresponde ao da venda; existe regra de comissão ativa para o par corretor/lote; a razão está ativa; e a etapa de destino existe no projeto. Se a etapa não vier no payload de criação, o backend tenta usar a etapa configurada como destino do Escritório e ainda valida que ela está cadastrada. A interface, porém, pede seleção explícita.

Editar (`PUT /api/repasses/entries/:id`) só aceita lançamentos existentes ligados a uma venda. Revalida lote, venda, corretor, regra ativa, razão ativa, data ISO válida, valor positivo e etapa cadastrada. Excluir (`DELETE`) só remove entradas vinculadas a venda; também remove os anexos físicos e emite `cash.changed`.

## Regras, plano e projeções

- A regra de corretagem é configurada por venda existente e par corretor/lote. O percentual deve ficar entre 0% e 100%; salvar reativa a regra.
- O plano pertence a uma venda e registra preço contratual, juros anuais, quantidade de parcelas mensais e semestrais, divisão do principal e primeiros vencimentos. O backend exige preço positivo, juros de 0% a 100%, ao menos uma parcela, limites de 600 parcelas mensais e 100 semestrais, divisão consistente e vencimentos atuais ou futuros.
- Comissão corrente por entrada: `valor recebido × percentual da regra × percentual da razão`, com arredondamento para centavos. A divisão entre participante principal e parceiro vem da política operacional; na ausência de configuração, usa 100% / 0%.
- A projeção futura divide o principal entre parcelas mensais e semestrais conforme o plano. Converte taxa efetiva anual em taxa mensal equivalente, calcula juros sobre o saldo entre vencimentos e ajusta a última parcela para absorver arredondamentos. A projeção é relatório: não cria lançamentos no livro-caixa.
- A interface recarrega o estado persistido após mutações e projeta relatórios atuais e futuros. O valor de tabela oficial serve de referência quando não há preço contratual/plano.

## Rotas e permissões encontradas

| Operação | Endpoint | Permissão na rota |
| --- | --- | --- |
| Consultar ledger e resumo | `GET /api/cash-flow` | autorização geral da superfície de API |
| Criar lançamento comum de caixa | `POST /api/cash-flow` | `owner` |
| Ler vendas, regras, razões, etapas e entradas para repasse | `GET /api/repasses` | `owner`, `admin` |
| Registrar entrada de repasse | `POST /api/repasses/entries` | `owner`, `admin` |
| Editar ou excluir entrada de repasse | `PUT` / `DELETE /api/repasses/entries/:id` | `owner`, `admin` |
| Salvar/remover regra de corretagem | `PUT` / `DELETE /api/repasses/broker-rule` | `owner`, `admin` |
| Salvar/remover plano da venda | `PUT` / `DELETE /api/repasses/sales/:id/plan` | `owner`, `admin` |
| Anexar/ler comprovante de caixa | `POST /api/cash-flow/:id/attachments`, `GET .../file` | `owner`/`admin`; leitura também `developer` |

## Limite semântico importante

No código atual, **Repasse** é lançado como entrada de caixa recebida, vinculada a venda, lote, corretor e razão. A comissão e sua divisão são calculadas para relatório. Não há, nesse fluxo, uma saída financeira separada que efetive o pagamento da comissão ao corretor.

## Referências de implementação

- Interface e contratos TypeScript: `frontend/src/components.ts`, `frontend/src/program.ts`.
- Rotas e autorização: `server.mjs` (`repassesApi`, `cashFlowApi`).
- Persistência, validação e auditoria: `persistence.mjs` (`createCashFlowEntry`, `updateRepasseEntryV1`, `listRepasseOperationsV1`, regras e planos).
