# Avaliação de design e uso — 15/10/2026

Escopo: CMS de acompanhamento de obra e página pública de lotes. Esta avaliação combina a navegação local de `/leads`, as telas do CMS fornecidas na conversa e a leitura da implementação. Não equivale à aprovação de entrega do produto.

## Estado de entrega

O produto já tem uma direção visual reconhecível: navegação lateral Atlas, tipografia compacta e mapa como peça central. A experiência ainda pede uma revisão integrada para que o usuário consiga entender o estado de um lote, registrar trabalho de obra e chegar ao atendimento sem depender de explicação externa. A validação de dados comerciais, automação de obra e canais de atendimento continua necessária, além dos ajustes visuais.

## Prioridades de uso

| Prioridade | Superfície | Achado e efeito | Critério de aceite |
| --- | --- | --- | --- |
| P0 | Pública | CREA, CNPJ e CNPJ da obra aparecem como “A informar”. São campos ainda sem dados oficiais. | Obter dados oficiais, revisar o texto jurídico e verificar a página publicada. |
| P0 | Pública e CMS | Preço, disponibilidade, reserva e status precisam ter uma origem comercial única e atualização observável nas duas superfícies. | Alterar um lote no CMS e confirmar valor/status correspondente na página pública, inclusive após recarga e em outra sessão. |
| P0 | Obra | Agenda, OCR e inferência ainda exigem validação com entradas reais e confirmação humana das propostas. | Registrar serviço e material reais, gerar proposta de compromisso, aprovar ou corrigir e confirmar persistência na agenda. |
| P0 | Atendimento | A conversa da página precisa chegar ao responsável e ter retorno verificável. | Enviar uma consulta real da página e confirmar recebimento, atribuição, resposta e histórico no CMS. |
| P1 | Pública | A apresentação inicial cobre a página até concluir seu carregamento. A entrada do mapa precisa permanecer direta e explícita após essa etapa. | Em rede lenta e celular, a pessoa alcança o mapa e entende como explorar os lotes sem esperar pelo modelo 3D. |
| P1 | CMS | As telas fornecidas mostram blocos escuros, cartões brancos e microtexto misturados. A hierarquia de ação varia entre Dashboard, Lotes, Etapas e Corretores. | Adotar escala consistente de títulos, texto, espaço, botões, estados vazios e feedback nas rotas principais. |
| P1 | CMS | Agenda, etapas e assistente têm muitos pontos de entrada. O estado vazio da agenda não orienta suficientemente a primeira ação. | Uma pessoa nova cria ou revisa um compromisso a partir de serviço/material sem instrução oral. |
| P1 | Ambas | Telas densas e controles pequenos exigem revisão em larguras menores e navegação por teclado. | Percorrer mapa, filtros, formulário, agenda e perfil em celular e com teclado; foco, alvo de toque e mensagens permanecem visíveis. |

## Correções aplicadas nesta rodada

- Entrada “Explorar lotes no mapa” na primeira tela e atalho de teclado para o mapa.
- Atendimento recolhido no celular, com botão visível; ao abrir, o campo de mensagem recebe foco.
- Ação de contato ligada ao atendimento da página, substituindo links sem destino real.
- Melhoria da leitura do chat e dos campos de formulário em celular.
- Ações e foco da apresentação inicial preservados; o mapa passa a receber foco quando acionado pelo atalho.

## Verificação realizada

Em `/leads` local, após a apresentação inicial, o botão “Explorar lotes no mapa” deslocou a página até o mapa, ocultou o título inicial e expôs os controles e 261 marcadores. No layout de celular do navegador, o atendimento começou recolhido; o botão abriu a conversa e focou a mensagem, com o painel dentro da área visível. A ação “Iniciar conversa” na seção de contato voltou ao atendimento. O mesmo caminho de entrada no mapa foi percorrido em tela ampla. O build público e a análise sintática passaram como verificações complementares.

A aba administrativa local não carregou para inspeção interativa nesta sessão. Os achados de design do CMS acima se baseiam nas capturas fornecidas e na implementação; ainda precisam ser confrontados com uma sessão real de uso antes de aprovar a experiência administrativa. A página Firebase publicada não foi alterada nesta rodada.
