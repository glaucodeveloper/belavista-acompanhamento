# Telas do Atlas

Catálogo do frontend administrativo e das superfícies públicas. Este inventário descreve as rotas e menus declarados no código TypeScript atual; não certifica o comportamento ponta a ponta de cada fluxo.

## Entrada e composição

- `frontend/src/main.ts` inicia `startAtlasDocumentEntryV1`.
- `frontend/src/program.ts` interpreta a rota, aplica a política de acesso, compõe a aplicação e instala os controladores das telas.
- `frontend/src/components.ts` define a camada visual, os elementos Atlas e os controladores de interação.
- `frontend/src/data/application-routes.json` declara rotas diretas e aliases.
- `frontend/src/data/sidebar-navigation.json` declara modos e itens da navegação lateral.
- `frontend/src/data/sidebar-page-presentations.json` define títulos, descrições e cabeçalho do shell para as páginas administrativas catalogadas.
- `frontend/src/data/admin-access-policy.json` declara perfis operacionais limitados e telas administrativas removidas da navegação.

## Navegação lateral

Os modos definidos são **Execução e acompanhamento**, **Leads e lotes** e **Comunicação e relacionamentos**. A ordem muda por modo; o destino continua usando a mesma chave de tela.

| Tela | Execução e acompanhamento | Leads e lotes | Comunicação e relacionamentos |
|---|:---:|:---:|:---:|
| Mapa (`map`) | ✓ | ✓ | ✓ |
| Loteamento (`lot-development`) | ✓ | ✓ | ✓ |
| Leads (`leads`) | ✓ | ✓ | ✓ |
| Documentos (`documents`) | ✓ | ✓ | ✓ |
| Dashboard (`control`) | ✓ | ✓ | ✓ |
| Agenda (`agenda`) | ✓ | ✓ | ✓ |
| Registros (`records`) | ✓ | ✓ | ✓ |
| Materiais (`materials`) | ✓ | ✓ | — |
| Lotes (`brokers-board`) | ✓ | ✓ | ✓ |
| Repasses (`repasses`) | ✓ | ✓ | — |
| Corretores (`brokers`) | ✓ | ✓ | ✓ |
| Histórico de movimentações (`sales-history`) | ✓ | ✓ | ✓ |
| Financeiro (`finance`) | ✓ | ✓ | — |
| Mensagens (`messages`) | — | — | ✓ |
| Configurações (`settings`) | ✓ | ✓ | ✓ |

`finance` é alias de `control`, portanto abre o Dashboard; não há rota direta de Financeiro separada. A navegação aplica os filtros de perfil definidos em `admin-access-policy.json`. Os destinos `personnel` e `reports` estão removidos da navegação administrativa; a resolução do menu redireciona esses destinos para o Mapa.

## Telas administrativas

| Tela / rota | Conteúdo apresentado | Dono da composição |
|---|---|---|
| **Mapa operacional** (`map`) | Mapa temático do empreendimento e estado operacional por camada. | `installMapOverviewRoute` + componente de mapa |
| **Loteamento** (`lot-development`) | Perfis dos lotes e áreas comuns. | `installLotDevelopmentRoute` + `atlas-lot-development` |
| **Leads** (`leads`) | Captação e intenção comercial, com leitura dos leads no CMS. | `installLeadsRoute` + `atlas-leads` |
| **Documentos do loteamento** (`documents`) | Arquivos institucionais, plantas, memoriais e licenças. | `installProjectDocumentsRoute` + `atlas-project-documents` |
| **Dashboard** (`control`) | Resumo comercial, caixa, etapas, agenda, repasses e materiais disponíveis para a visão consolidada. | `installDashboardRoute` + `atlas-dashboard` |
| **Agenda** (`agenda`) | Compromissos, responsáveis, calendário, atualização, exclusão e criação de registro ligado ao compromisso. | `installAgendaRoute` + `atlas-agenda` |
| **Registros** (`records`) | Diário operacional e evidências de campo. Em telas estreitas existe apresentação mobile própria. | `installRecordsRoute` + `atlas-records` |
| **Materiais** (`materials`) | Catálogo, quantidades, alocação por etapa, transições e anexos. | `installMaterialsRoute` + `atlas-materials` |
| **Lotes** (`brokers-board`) | Valores, situação comercial, pagamentos e distribuição por lote. | `installLotBoardRoute` + `atlas-lot-board` |
| **Repasses** (`repasses`) | Saídas vinculadas a comissões e distribuição entre sócios. | `installRepassesRoute` + `atlas-repasses` |
| **Corretores** (`brokers`) | Diretório, contatos e carteira; pode abrir o perfil individual do corretor. | `installBrokersRoute` + `atlas-brokers` |
| **Histórico de movimentações** (`sales-history`) | Vendas, transações, comissões e anexos. | `installSalesHistoryRoute` + `atlas-sales-history` |
| **Configurações** (`settings`) | Integrações e parâmetros operacionais. | `installSettingsRoute` + `atlas-settings` |
| **Mensagens** (`messages`) | Canal de comunicação instalado pelo controlador de comunicações; aparece no modo social. | `installCommunicationsPanel` + componente de comunicações |

## Telas e estados internos

Estas rotas e estados existem no catálogo do programa, mas não são itens principais em todos os modos da barra lateral:

- **Atividades** (`activities`): catálogo e detalhes de atividades, registros vinculados e materiais; pode ser aberto a partir de Agenda e de áreas de etapa.
- **Etapas** (`stages`): visão/canvas legado de execução e dependências. A ação de navegação `stages` é normalizada para `agenda`.
- **Andamento da obra** (`progress`): diário operacional e evidências por etapa.
- **Por encarregados** (`foremen`): leitura de responsáveis por etapa.
- **Ficha do lote** (`lot-profile` ou estado `lot-detail`): contexto comercial, pagamentos, histórico e documentos de um lote.
- **Perfil do corretor** (`broker-detail`): carteira, comissões, histórico e documentos do corretor selecionado.
- **Tarefa da agenda** (`agenda-detail`): foco em data ou compromisso, com retorno à Agenda.
- **Lançamento de caixa** (`cash-record`): detalhe de uma movimentação financeira.
- **Instalação de atividade** (`activity-installation`): fluxo guiado para estruturar uma atividade antes de incorporá-la ao planejamento.
- **PERT, RACI e RAID**: aliases de `agenda`; abrem a Agenda como destino canônico.
- **Contratos, propostas e negociação de comissão**: aliases de `control`; abrem o Dashboard como destino canônico.

## Superfícies fora do CMS

- **Página pública de leads** (`public-leads.html`, rota web `/leads`): apresentação do empreendimento, mapa público, captura de intenção, chat e início de reserva. Componentes públicos incluem `public-leads-surface`, `public-lead-chat`, `public-lead-form` e `public-reservation-flow`.
- **Configuração inicial do desktop** (`desktop-setup.html`): cadastro local da estação e do responsável inicial; não é uma página do menu administrativo.
- **Monitor de workers** (`admin-workers.html`): superfície técnica de monitoramento, fora do fluxo principal da barra lateral.

## Regras de acesso registradas

- Papéis `sales`, `commercial`, `broker` e `corretor` recebem navegação operacional limitada pela política do CMS.
- A política limita atores operacionais a Mapa, Agenda, Registros e Etapas; chaves de campo podem fornecer uma lista delegada de telas.
- `personnel` e `reports` estão configuradas como removidas da navegação administrativa.
- Rotas não reconhecidas retornam ao Mapa; destinos sem permissão são recuperados conforme o papel do ator.
