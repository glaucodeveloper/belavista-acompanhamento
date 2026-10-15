# Continuação do projeto — 15/10/2026

## Instruções da última tarefa

Na página pública `/leads`, conferir cada número e posição de lote com a prancha original em `~/Downloads/Warley.pdf` (mesmo conteúdo de `~/Downloads/APRESENTACAO_MASTER_PLAN_AP.pdf`). Corrigir lotes sem marcador e marcadores sobrepostos. Manter a numeração no centro de cada lote e mostrar o círculo amarelo somente quando o mapa estiver suficientemente ampliado. Verificar o resultado no fluxo real da página antes de considerar a tarefa concluída.

## Estado atual da implementação

- A relação extraída da prancha contém os lotes de 1 a 272. O número 055 foi inferido entre 054 e 056, onde o texto da rua cobre parcialmente a marcação.
- O mapeamento associa 259 números a polígonos segmentados. Treze números permanecem com âncoras vindas dos círculos da prancha, sem atribuição de um polígono distante a outro lote.
- O mapa público renderiza os 272 números. Em zoom inicial, os marcadores circulares ficam ocultos e os números permanecem. O círculo amarelo aparece a partir do zoom total 2,2.
- As versões dos recursos da página foram atualizadas para evitar que o navegador use arquivos antigos do cache.
- `npm run build:public` passou. O teste de projeção dos lotes e a verificação visual completa da interação em `/leads` ainda devem ser confirmados antes de publicar a página. O envio ao Git remoto por si só não publica no Firebase Hosting.

## Histórico recente e direção do produto

1. O projeto local foi alinhado com a branch remota `codex/continuation-20260912`, preservando arquivos de ambiente para uso local. O usuário pediu explicitamente que atualizações do repositório sejam tratadas como pull quando essa for a direção indicada, sem publicação remota implícita.
2. A interface administrativa foi orientada pelo visual Atlas/Carbon. Foram pedidos ajustes de dashboard, corretores, configurações de compreensão de IA e agenda operacional, com geração de compromissos a partir de serviços, materiais, chat e OCR.
3. O produto foi avaliado como CMS de acompanhamento de obra e página publicitária. O usuário pediu atenção à consistência dos dados comerciais, à automação real, aos canais de atendimento, ao design e ao uso.
4. A página pública `/leads` recebeu o mapa de lotes da área administrativa, zoom por rolagem e controles de arrastar e ampliar. O usuário pediu para retirar os dois cards introdutórios sobre o mapa e manter widgets legíveis em tamanho proporcional à tela.
5. O usuário pediu revisão dos marcadores contra o PDF original, contração do chat ao ampliar o mapa e uso dos círculos amarelos da prancha como referência. A tarefa mais recente é eliminar faltas e sobreposições e preservar a numeração central.
6. Em trabalho anterior, o usuário pediu testes de ponta a ponta para OCR, criação de APK e publicação no Firebase Hosting. Estes são pedidos históricos; este registro não afirma que todos foram concluídos.

## Critérios para continuar

- Testar no navegador a página `/leads` em zoom baixo e alto, incluindo os controles de zoom, arrasto, seleção de lote e inspeção das posições contra a prancha.
- Não confundir commit/push no GitHub com publicação no Firebase Hosting. Confirmar o resultado da implantação separadamente quando ela for feita.
- Não incluir `.env`, `.env.example` ou arquivos gerados em `data/automation/` em commits desta correção sem revisar o conteúdo e a intenção dessas alterações.
