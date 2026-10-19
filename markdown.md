# Continuação do projeto — 18/10/2026

## Pedido em andamento

Na página pública `/leads`, usar o mapa de lotes como parte de uma página comercial responsiva. Retirar controles visuais do mapa e apresentar apenas uma legenda leve no canto inferior, expandida ao passar o cursor ou ao tocar. Os gestos indicados são: arrastar para mover, Shift + arrastar para zoom, Ctrl + arrastar para inclinar, Alt + arrastar para girar e clique duplo para recentralizar.

Conferir a posição e o número de cada lote com a prancha original em `~/Downloads/Warley.pdf` (mesmo conteúdo de `~/Downloads/APRESENTACAO_MASTER_PLAN_AP.pdf`). Manter a numeração no centro dos lotes e exibir o círculo amarelo somente no zoom de detalhe. Verificar o fluxo na interface antes de declarar funcionamento.

## Estado da implementação local

- O pull de `origin/codex/continuation-20260912` foi aplicado por avanço rápido até `696812d`. Alterações locais prévias de `.env.example` e `data/automation/` foram preservadas e não pertencem a esta correção.
- A prancha contém 271 círculos numerados. A posição anteriormente inferida para **055** corresponde ao texto **RUA A**, sem círculo de lote. O conjunto possui 258 números ligados a polígonos e 13 com âncoras dos círculos da prancha. Os 271 marcadores são clicáveis em `/leads`.
- Na apresentação inicial, os números permanecem sobre os lotes; no zoom de detalhe aparecem os círculos amarelos. O enquadramento do loteamento foi ajustado para a largura de celular.
- Os botões de zoom e reposição da página pública foram removidos. A legenda de gestos fica no canto inferior do mapa e pode ser aberta por toque. Os manipuladores de arrasto, zoom, inclinação, rotação e reposição por clique duplo foram implementados; os gestos com modificadores ainda aguardam teste direto.
- O enquadramento do mapa agora parte da extensão dos centros de lote: ajusta escala e centro à viewport, limita o deslocamento lateral e vertical conforme a ampliação e restringe o zoom manual a 0,75–3,2 vezes a escala inicial calculada. Na transição de rolagem, a vista começa na imagem aérea e chega ao enquadramento dos lotes.
- As versões dos recursos foram atualizadas para invalidar o cache da página pública. O build público foi corrigido para ignorar dois arquivos suplementares que não existem no repositório.

## Verificação executada

- `npm run build:public`: passou após a correção das entradas inexistentes.
- `node --test --test-reporter=dot tests/admin/satellite-lot-projection-v1.test.mjs`: passou.
- No Firebase Hosting Emulator local (`http://127.0.0.1:5000/leads`), a página carregou sem erros de console. Foram observados 271 marcadores, ausência dos botões antigos, legenda visível no mapa, expansão da legenda ao toque e movimento observável por arrasto. Após arrastar, o clique duplo zerou o deslocamento. Em viewport estreito, o loteamento e a legenda ficaram dentro da área útil.
- Após o ajuste do enquadramento, no desktop de 1600 × 900 os centros ficaram entre x=556–1044 e y=126–774; a imagem da planta ficou entre y=107–887. Um arrasto lateral longo parou em +128 px e o inverso em −128 px; clique duplo devolveu o deslocamento a zero. No teste estreito de 487 × 1055, os centros ficaram entre x=24–420 e y=263–789. As medidas vieram da geometria DOM da página carregada; a captura visual do desktop também foi inspecionada.
- A automação de navegador disponível não mantém teclas modificadoras durante o arrasto. Shift/Ctrl/Alt + arrasto ainda precisam de verificação manual no navegador; compilação e leitura do código não comprovam esses três gestos.
- `npm start` da raiz está bloqueado por importação de `github-session-store.mjs` ausente. A página pública foi exercitada pelo Hosting Emulator, que serve o build de `dist-pages` com a rota `/leads`.

## Histórico e cuidados

1. O projeto local foi atualizado por pull da branch remota, preservando arquivos de ambiente. Commit/push no GitHub e publicação no Firebase Hosting são ações distintas.
2. A área administrativa seguiu o visual Atlas/Carbon. Foram pedidos ajustes no dashboard, corretores, configurações de compreensão de IA e agenda operacional alimentada por serviços, materiais, chat e OCR.
3. O produto foi avaliado como CMS de acompanhamento de obra e página publicitária. Permanecem relevantes a consistência dos dados comerciais, a automação real, os canais de atendimento, o design e o uso.
4. `/leads` recebeu o mapa de lotes administrativo com zoom por rolagem. O usuário pediu retirar dois cards introdutórios do mapa, manter widgets legíveis em tamanho proporcional à tela, recolher o chat durante o zoom e revisar os marcadores contra o PDF original.
5. Em trabalho anterior, foram pedidos testes de ponta a ponta para OCR, APK e publicação no Firebase Hosting. Este registro não afirma a conclusão desses itens.
6. Não incluir `.env`, `.env.example` ou arquivos gerados em `data/automation/` em um commit desta correção sem revisar separadamente seu conteúdo e intenção.

## Continuação — identidade e enquadramento do mapa (18/10/2026)

- Ao entrar na seção do mapa, a marca fica fixa no canto superior esquerdo, com “Aliança Park” e “LOTEAMENTO” à esquerda do símbolo. A marca anterior da animação, que aparecia no canto oposto, é ocultada nessa seção para evitar duplicidade.
- A posição inicial usa o centro dos 271 lotes e ajusta a escala à viewport. Na inspeção mobile em 467 × 712, a área da planta permaneceu dentro do mapa e a marca ficou visível durante a rolagem.
- A faixa inferior da imagem aérea foi ampliada para mostrar mais terreno ao sul. `assets/public/dwg-satellite-south-extension-v2.png` é uma continuação visual gerada; a imagem satélite e a planta originais permanecem sobre a área original. A extensão não acrescenta informação cartográfica verificada além da imagem fonte.
- Na interface local, percorri “Explorar lotes no mapa”: a seção mudou para `map`, a rolagem interna do quadro fixo ficou em zero, a marca permaneceu dentro da viewport e a extensão inferior carregou. O Hosting Emulator respondeu em `http://127.0.0.1:5000/leads`.
- `npm run build:public`, `git diff --check` e inspeção interativa no Hosting Emulator local foram executados para esta atualização. Não houve publicação no Firebase nem envio ao Git remoto.
