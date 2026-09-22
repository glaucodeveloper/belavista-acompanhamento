# Aliança Park · handoff de continuidade para Codex

Data do snapshot: 2026-09-12  
Branch de trabalho de origem: `codex/dashboard-firebase-leads`  
Remoto configurado: `git@github.com:glaucodeveloper/belavista-acompanhamento.git`

## Objetivo do projeto

Aplicação web/PWA de acompanhamento operacional do loteamento Aliança Park. O sistema combina atendimento público de leads, mapa/visualização do loteamento, etapas de obra, cronograma, registros de campo, caixa, materiais, pessoal, notificações e assistente de IA.

## Como continuar em outro ambiente

```bash
git clone git@github.com:glaucodeveloper/belavista-acompanhamento.git
cd belavista-ai-monitor
npm install
cp .env.example .env
# preencha os segredos localmente; nunca os versione
npm start
```

Servidor local: `http://localhost:8080`  
O servidor aceita acesso na rede local com `HOST=0.0.0.0`.

### Configuração mínima de IA

O exemplo está configurado para NVIDIA:

```dotenv
AI_PROVIDER=nvidia
NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
NVIDIA_API_KEY=\n+```

Use uma chave fornecida fora do repositório. O arquivo `.env` está ignorado e não faz parte deste snapshot. Para Firebase Functions/Worker, configure os segredos no ambiente do serviço.

## Rotas principais

- `/leads` — experiência pública de consulta e captação.
- `/admin` — dashboard administrativo.
- `/admin/workers` — monitoria e operação dos workers.
- `/admin/workers/stage?stage=project` — detalhe da etapa.
- `/admin/workers/activity?stage=earthwork&activity=road-opening` — atividade dedicada e localização no mapa.
- `/admin/records` e `/public-records.html` — registros de campo.
- `/docs/portfolio.html` — portfólio técnico e visual.

As áreas administrativas protegidas exigem sessão Firebase e perfil autorizado. Uma sessão local persistente deve ser reutilizada pelo navegador; não coloque credenciais de usuário em código, documentação ou testes.

## O que está incluído neste estado

- Componentes compartilhados de mapa para a experiência pública e o dashboard.
- Camada de loteamento/markers 3D, controles de pan/zoom e estados de carregamento progressivo.
- Fluxos administrativos para etapas, atividades, cronograma, diário, caixa, materiais, requisitos, pessoal, leads, comissões e relatórios.
- Página de atividade com seleção física de polígonos no mapa, associação ao registro e visualização operacional.
- Chat contextual persistente em áreas públicas/administrativas/workers.
- Integrações e contratos de inferência operacional, planejamento, notificações e propagação de registros.
- TWA administrativo e configuração de hosting Firebase.
- Testes unitários, de contrato e cenários Playwright em `tests/`.
- Composição do vídeo de produto em `video/product-intro/` (fontes e configuração); a saída renderizada é tratada como artefato local.

## Correções recentes verificadas

1. **Workers com rolagem:** `admin-workers.css` força uma página rolável, evita o travamento de viewport e mantém o conteúdo das páginas de etapa/atividade acessível.
2. **Modelo NVIDIA:** `server.mjs`, `firebase-functions/index.js` e `.env.example` usam `meta/llama-3.2-11b-vision-instruct`, modelo testado contra o endpoint NVIDIA. A chave continua apenas no ambiente.
3. **Rotas workers:** o servidor possui rotas para `/admin/workers`, `/stage` e `/activity`; a autenticação é tratada antes da superfície protegida.
4. **Separação público/administrativo:** o mapa público e o administrativo usam o mesmo componente-base com capacidades adicionais no dashboard e na edição de registros.

## Comandos de verificação

```bash
node --check server.mjs
node --check admin-workers.js
node --check stage-workbench.mjs
npm run test:screen
npm run test:chat
npm run test:public-map
```

Para validar apenas a disponibilidade local:

```bash
curl -I http://localhost:8080/leads
curl -I http://localhost:8080/admin/workers
```

## Pendências conhecidas para a próxima sessão

- Testar a navegação administrativa com uma sessão Firebase real e perfil `owner`, `admin` ou `foreman`; sem sessão, a tela de login é comportamento esperado.
- Revisar a expressão de seletor de abas no bloco mais recente de `components.js` antes de alterar a navegação das etapas.
- Revalidar o mapa 3D em GPU/browser limpo; avisos `GL_INVALID_VALUE` do Chromium podem ser diagnósticos de textura, não necessariamente erro de JavaScript.
- Confirmar as regras do Realtime Database, Storage e notificações no projeto Firebase antes de produção.
- Não fazer deploy automático sem revisar as mudanças pendentes e os segredos do ambiente.

## Higiene do snapshot

Este handoff descreve a sessão e o código disponível no branch. O diretório `.belavista-backup/`, arquivos temporários, `tmp/`, caches, `.env`, chaves TWA e artefatos renderizados grandes foram excluídos do commit. Se um artefato específico for necessário, gere-o novamente a partir dos fontes e das instruções do projeto.

## Contexto do Codex para continuidade

Skills que devem ser priorizadas conforme o tipo de tarefa:

- `browser:control-in-app-browser` para validar as rotas no navegador local.
- `hyperframes`, `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes` e `hyperframes-cli` para o vídeo de produto.
- `documents` e `pdf` para manuais, portfólio e evidências em PDF.
- `imagegen` para imagens/variações visuais solicitadas; manter referências e saídas fora de segredos.
- `sites:sites-building` e `sites:sites-hosting` para construção/publicação quando o projeto estiver sob o fluxo Sites.
- `openai-developers:openai-platform-api-key` e `openai-developers:openai-api-troubleshooting` somente para configuração/diagnóstico de APIs, sem inserir chaves no repositório.
- `visualize` quando a tarefa pedir simuladores, mapas ou visualizações exploráveis.

Integrações mencionadas nas sessões:

- HyperFrames já está declarado no `package.json` e a composição está em `video/product-intro/`.
- O bridge opcional de Camofox está em `desktop/instagram-bridge.mjs`; ele deve continuar desativado até haver credenciais e autorização explícita para atendimento do Instagram.
- A revisão de copy/marketing pode usar o repositório `coreyhaines31/marketingskills` como referência externa; ele não foi incorporado automaticamente ao código.
- O plugin/skill escolhido deve ser carregado antes de agir quando a tarefa seguinte corresponder à sua descrição. Plugins recomendados pelo ambiente, mas não instalados, não devem ser tratados como dependências presentes.

Ao retomar, preservar os contratos locais de segurança: nenhuma skill, plugin, bridge ou ferramenta deve registrar PAT, API key, senha Firebase ou token de usuário no branch.
