# Inventário funcional e verificação manual — 24/09/2026

Ambientes: painel local `http://localhost:8080/admin?demo=1` para o inventário inicial; `http://localhost:8091/admin-workers.html` com banco temporário isolado para os testes de solicitações. Verificação em navegador por clique, leitura do resultado visível e capturas PNG. No banco de produção não foram criados registros fictícios nem executadas exclusões, pagamentos, publicações ou alterações de acesso. As capturas mostram a interface de teste, inclusive respostas anteriores à correção quando isso ajuda a comparar o defeito.

## Fluxos por atividade do usuário

| Atividade | Entrada pela interface | Caminho esperado e saída | Verificação manual |
| --- | --- | --- | --- |
| Registrar fato geral | Central operacional → Novo registro de evento; chat: “Criar novo registro geral de evento” | Abrir ficha com categoria, data, responsável, descrição e anexo; revisão humana antes de registrar; histórico geral após salvar | Ficha aberta via chat, sem gravação — [01](01-entrada-evento.png), [04](04-chat-rascunho-evento.png) |
| Planejar obra | Etapas e Cronograma → etapa em foco → Agenda/Ações IA/Atividades/Registros/Andamento | Escolher etapa, acompanhar dependências, editar agenda/atividades e refletir confirmação de campo no progresso | Páginas e menu verificados; edição definitiva não executada — [10](10-etapas.png) |
| Receber produção de campo | Registro de atividade, evidência, apontamento e confirmação | Validar dados, evitar duplicata, associar etapa/atividade, recalcular agenda e alertar responsáveis | Formulários/páginas inspecionados; propagação coberta por testes de domínio, não por gravação manual |
| Gerir suprimentos | Materiais → novo material/etapa; compra → recebimento | Vincular material à atividade, registrar recebimento, atualizar estoque/caixa e liberar agenda quando suficiente | Novo material aberto via chat sem salvar — [05](05-chat-abre-material.png); propagação simulada por teste |
| Acervo do loteamento | Documentos → pesquisar/filtrar/colunas/células → adicionar documento | Catalogar PDF/DWG e metadados, vincular item documental, editar célula/linha sob revisão | Navegação e adição abertas via chat, sem salvar — [02](02-chat-alega-navegacao-sem-abrir.png), [03](03-chat-abre-documento.png) |
| Mapa da obra | Mapa → camadas, seleção, zoom e impressão | Consultar frentes e progresso sobre o modelo compartilhado | Página aberta no inventário; comandos gestuais e impressão não validados neste ciclo |
| Captar e acompanhar leads | Leads → contato/negociação | Qualificar, acompanhar conversa e reserva, avançar ao contrato | Página aberta e registrada — [09](09-leads.png); integração Instagram/WhatsApp não exercitada |
| Formalizar negócio | Contratos → negociação → comissões/corretores | Revisar dados e anexos, salvar contrato, calcular carteira/comissões | Páginas abertas; nenhuma assinatura ou salvamento — [08](08-negociacoes.png) |
| Controlar caixa | Financeiro → lançamentos/evidências | Dono registra entrada/saída; evidência e saldo influenciam prontidão operacional | Consulta de página — [07](07-financeiro.png); lançamento real não executado |
| Consultar e exportar indicadores | Relatórios → família → item → expandir/CSV/impressão | Relacionar dados da obra, documentos e recibos; explicar fonte e período | Família Financeiro e conteúdo visível — [06](06-relatorio-financeiro.png); exportação/impressão não executadas |
| Administrar pessoas e regras | Encarregados, Central operacional, Configurações | Gerir responsáveis, prioridades, orçamento, integrações e governança | Páginas inspecionadas; senha, permissões e segredos não alterados |

## Formas de entrada e disparo da IA

1. Entrada explícita do usuário no chat: um pedido de serviço com texto e até cinco arquivos cria uma solicitação persistida, com número, situação e arquivos acompanháveis. Comandos de navegação e de abertura de fichas continuam disponíveis, mas são secundários; ficha é rascunho, não gravação automática.
2. Entrada em formulários e tabelas: evento, documento, material, agenda, atividade, apontamento, negociação, contrato, caixa e configurações têm pontos de gravação próprios. Após confirmação, os fluxos operacionais propagam mudanças conforme regras de domínio.
3. Entrada externa: lead Instagram, confirmações de campo, recebimento de compra, anexos/evidências e mensagens podem disparar escuta/recalculo/notificações quando integrações estiverem configuradas. Não foram testados externamente nesta sessão.
4. Observação automática do chat é distinta de comando do usuário: texto informativo não deve clicar nem disparar ciclo. A resposta da IA não é prova de execução; a confirmação deve descrever o que a interface realmente fez.

## Cobertura do chat nesta rodada

| Pedido manual | Resultado observado | Estado |
| --- | --- | --- |
| “Abra documentos do loteamento” | Antes: chat afirmava sucesso, página não mudava. Depois: menu Documentos ficou ativo e acervo apareceu. | Corrigido; [02](02-chat-alega-navegacao-sem-abrir.png), [03](03-chat-abre-documento.png) |
| “Adicionar documento” | Acervo e formulário de inclusão ficaram visíveis; nada salvo. | Validado; [03](03-chat-abre-documento.png) |
| “Criar novo registro geral de evento” | Ficha geral ficou aberta, sem registro criado. | Validado; [04](04-chat-rascunho-evento.png) |
| “Adicionar material” | Página Materiais e formulário Novo material ficaram visíveis; nada salvo. | Validado; [05](05-chat-abre-material.png) |
| “Abra relatório financeiro” | Família Financeiro e relatório visíveis; houve confirmação prematura antes do carregamento e o chat foi ajustado para aguardar o estado ativo. | Resultado visual validado; confirmação final ainda requer reteste após o último ajuste; [06](06-relatorio-financeiro.png) |
| Mapa: destacar camada, ajustar vista/base | Encaminhamento de ferramentas implementado no chat. | Não validado manualmente nesta rodada |
| Filtrar comissões | Encaminhamento de ferramenta implementado no chat. | Não validado manualmente nesta rodada |
| Criar/salvar lançamento, contrato, compra ou apagar dados por chat | Chat não grava nem exclui diretamente; conduz à área de revisão quando há formulário suportado. | Requer desenho de confirmação, autorização e teste com dados isolados |
| “Solicito revisar o cronograma da etapa de drenagem...” com PNG | Criou `SR-MUFQIK0B-WVD4` no banco de teste, com arquivo vinculado, link funcional e situação em triagem. | Validado; [11](11-chat-solicitacao-com-arquivo.png) |
| Recarregar a página e atualizar acompanhamento | Número, descrição, situação e anexo permaneceram; a atualização refletiu a mudança para “Planejada”. | Validado; [13](13-chat-pedidos-separados.png), [14](14-acompanhamento-status-atualizado.png) |
| “Qual é o estado da solicitação registrada?” | Responde com o estado do pedido atual sem abrir outro. O primeiro teste expôs uma classificação incorreta; a correção foi retestada. | Corrigido; [12](12-chat-resposta-unica-acompanhamento.png) registra o comportamento anterior |
| Múltiplos pedidos no mesmo chat | Um seletor “Meus pedidos” permite retomar cada solicitação sem transformar a conversa em log. | Validado; [13](13-chat-pedidos-separados.png) |
| Enviar uma pergunta ao assistente | Durante a espera surgiu indicador de carregamento, mensagem de andamento e botão desativado; após a resposta, o indicador saiu e o botão voltou. | Validado visualmente; [15](15-chat-feedback-concluido.png) |
| Compor mensagem com anexo | Campo de texto à esquerda e faixa separada à direita para imagem ou PDF/DWG/DXF; anexos escolhidos aparecem antes do envio. | Layout e controles verificados no navegador; [16](16-chat-input-rail.png) |
| Chat sobre o painel administrativo | Espaçamento do cabeçalho, resposta e campo de entrada revisto; aviso de notificações deslocado para não bloquear os anexos. | Validado visualmente; [17](17-chat-spacing-admin.png) |

## Correções feitas e limites

- O chat ativo antes processava somente `records.open_form`; as demais ferramentas devolvidas pelo endpoint eram ignoradas. Foi ligado à navegação, abertura de fichas, relatórios, filtros comerciais e comandos de mapa suportados.
- A interpretação textual antiga podia acionar notificações/ciclo por palavras na resposta mesmo quando o endpoint falhava. Essa execução implícita foi retirada; ação exige pedido explícito do usuário.
- O catálogo de ferramentas da API foi alinhado às páginas existentes e ganhou `ui.open_form`; comandos informativos não recebem ferramenta inferida.
- Uma resposta da IA que diga “aberto” não substitui a checagem do estado visível. O chat agora registra o resultado da ação, inclusive indisponibilidade, e não salva formulários sozinho.
- O painel do chat mostra apenas a resposta atual do assistente; não mantém histórico de mensagens visível. As solicitações ficam em um cartão separado, com escolha entre pedidos, estado atualizado e links dos arquivos.
- O compositor informa a etapa de processamento, mostra spinner, bloqueia envio duplicado, permite Enter para enviar e Shift+Enter para nova linha. Texto e anexos são preservados quando o registro do pedido falha.
- Pedidos de serviço explícitos são persistidos no banco local e só podem ser consultados pelo autor ou por perfis administrativos. Arquivos PDF, DWG, DXF e imagens podem acompanhar o pedido; foi verificada manualmente a abertura de um PNG.
- A criação de uma solicitação **não equivale à execução automática** da atividade: o fluxo atual registra e acompanha a triagem. Aplicação autônoma de mudanças, aprovação, vínculo profundo a cada entidade de negócio e cobertura manual de todos os tipos de arquivo ainda exigem implementação e certificação separadas.
- Cobertura **não exaustiva**: o inventário das 18 áreas do menu foi feito, mas não há certificação manual de todas as combinações de célula, filtro, modal, anexo, permissão e integração. Os fluxos de pagamento, senha, assinatura, comunicação externa e exclusão foram intencionalmente preservados sem execução.

## Testes suplementares

Os testes de domínio `mock-purchase-agenda-propagation` e `initial-to-delivery-certification` passaram (18/18). Eles verificam recebimento parcial/integral, estoque, caixa, agenda, notificações e contrato operacional; não substituem os testes manuais acima. O teste separado `cash-master-trigger-study` apresentou uma falha de inspeção textual preexistente e não foi usado como evidência de sucesso.
