# Aliança Park · Acompanhamento com IA

Protótipo estático/PWA inspirado nas telas conceituais fornecidas para o sistema Aliança Park. O produto é centrado em **IA + mapa**, com módulos apresentados como cards flutuantes sobre uma cena espacial.

## Principais características

- OpenStreetMap em Leaflet como mapa-base.
- Camada transparente Three.js sobre o mapa para marcadores/elementos 3D.
- Sidebar e topbar em glassmorphism, seguindo a paleta escura das referências.
- Chatbox de IA persistente, arrastável e reposicionado automaticamente conforme o módulo.
- Etapas + cronograma em uma única página.
- Inventário, leads, compras, colaboradores e relatórios com cards contextuais.
- Web Components (`app-sidebar`, `app-topbar`, `map-scene`, `ai-chat`, `view-layer`, `glass-card`, `stat-pill`).
- Iterators/generators em `state.js` (`cycle`, `windows`, `stateTransitions`) para sequências de estado.
- Tela de instalação local com configuração opcional de repositório e PAT.
- PWA com service worker para cache do shell e recursos visitados.
- Navegação SPA sem reload entre módulos.

## Rodar localmente

A PWA e o Service Worker precisam de `localhost` ou HTTPS. Não abra apenas via `file://`.

```bash
cd belavista-ai-monitor
cp .env.example .env
# preencha GEMINI_API_KEY no ambiente (ou exporte-a)
export GEMINI_API_KEY="sua-chave"
npm start
```

Para usar a API operacional publicada no Cloudflare Worker sem alterar a UI atual:

```bash
export BELAVISTA_API_BASE="https://seu-worker.workers.dev"
export BELAVISTA_PUBLIC_BASE_URL="https://seu-worker.workers.dev"
```

Abra:

```text
http://localhost:8080
```

## Teste em celular / forwarding

O servidor aceita conexões da rede local. Neste ambiente, abra no celular conectado à mesma rede:

```text
http://10.75.216.173:8080/public-records.html?mode=mobile
```

Para câmera, Service Worker e o canal de notificações em tempo real funcionarem como PWA fora de `localhost`, use o hostname HTTPS entregue pelo seu serviço de forwarding/túnel. O servidor reconhece `X-Forwarded-Host` e `X-Forwarded-Proto`; se o proxy não repassar esses cabeçalhos, defina `PUBLIC_ORIGIN=https://seu-host-publico` antes de iniciar. Adicione esse hostname em **Firebase Authentication → Authorized domains**.

O chat usa o endpoint local `/api/gemini`, que encaminha a solicitação para a API Gemini. A chave nunca é enviada ao navegador. Sem `GEMINI_API_KEY`, o app permanece funcional em modo demonstração.

Para pular a tela de instalação e entrar direto na demonstração:

```text
http://localhost:8080/?demo=1
```

## Mapa e captação pública

- O dashboard inicial usa o mapa compartilhado com filtros de Execução, Colaboradores, Cronograma, Leads, Materiais e Riscos.
- A página pública exportada está em `public-leads.html` e pode ser aberta em `http://localhost:8080/public-leads.html`.
- `public-lead-form.mjs` envia as intenções para o Realtime Database Firebase em `publicLeads`, usando autenticação anônima antes da gravação.
- A entrada móvel de campo está em `public-records.html`: registra etapa, atividade, categoria, responsável, progresso, descrição, data/hora e uma fotografia capturada pela câmera do aparelho.
- O wrapper Android TWA está configurado em [`mobile/twa/`](mobile/twa/README.md), com destino para o GitHub Pages. Publique as regras de `firebase.database.rules.json` e `firebase.storage.rules` antes de liberar a coleta de evidências.
- Ative **Authentication → Sign-in method → Anonymous** no projeto Firebase e publique `firebase.database.rules.json` nas regras do Realtime Database.
- A configuração web do Firebase é pública por natureza; a proteção real fica nas regras, App Check e autenticação. Não coloque chaves privadas no frontend.

## GitHub + SSH

O projeto inclui `scripts/create-repo.sh`. O script usa GitHub CLI e configura Git para SSH sem gravar PAT no script.

```bash
bash scripts/create-repo.sh belavista-acompanhamento private
```

Se necessário, o script chama:

```bash
gh auth login --hostname github.com --git-protocol ssh --web
```

Depois cria/publica o repositório com `gh repo create` e `git@github.com:...`.

## Sobre o PAT no navegador

A tela de instalação oferece a opção solicitada de salvar o PAT no `localStorage`. Isso **não é recomendado para produção**, porque qualquer JavaScript executado na mesma origem pode acessar esse valor. Para produção, prefira backend/BFF, credenciais de curta duração ou autenticação GitHub App/OAuth.

O service worker **não armazena em cache chamadas à API do GitHub**.

## PWA / Offline

O service worker mantém o shell do app e recursos visitados em cache. Tiles do OpenStreetMap e bibliotecas CDN são armazenados conforme forem usados; portanto, o mapa offline só terá tiles previamente visitados.

## Referências visuais

As imagens fornecidas estão copiadas em `assets/reference/` apenas como referência de design:

- `dashboard.png`
- `cronograma.png`
- `inventario.png`
- `leads.png`
- `compras.png`

## Estrutura

```text
belavista-ai-monitor/
├── index.html
├── styles.css
├── app.js
├── components.js
├── state.js
├── manifest.webmanifest
├── sw.js
├── assets/
│   ├── icons/
│   └── reference/
├── worker/
│   ├── src/
│   └── migrations/
└── scripts/
    └── create-repo.sh
```

## Cloudflare Worker + NVIDIA

- A arquitetura V10 da operação está descrita em [`docs/CLOUDFLARE-NVIDIA-ARCHITECTURE.md`](docs/CLOUDFLARE-NVIDIA-ARCHITECTURE.md).
- O manual do usuário final, com a literatura e o glossário das compreensões usadas nas requisições, está em [`docs/manual-usuario-planejamento-inteligente.md`](docs/manual-usuario-planejamento-inteligente.md).
- A versão navegável do manual está publicada como asset em [`/assets/docs/manual-usuario-planejamento-inteligente.html`](assets/docs/manual-usuario-planejamento-inteligente.html).
- A referência técnica de implementação do planejamento e do contrato de inferência NVIDIA está em [`docs/construction-planning-technical-manual.md`](docs/construction-planning-technical-manual.md).
- A base única de atividades, gates e recursos usada para gerar agenda e cronograma está em [`docs/initial-construction-planning.md`](docs/initial-construction-planning.md); a sequência ampliada de 15 etapas e 90 atividades é mantida em [`development-stage-catalog.mjs`](development-stage-catalog.mjs).
- A especificação RFC/ISO da projeção física derivada do DWG está em [`docs/rfc-dimensionamento-fisico-dwg.md`](docs/rfc-dimensionamento-fisico-dwg.md) e sua versão navegável está publicada como asset em [`/assets/docs/rfc-dimensionamento-fisico-dwg.html`](assets/docs/rfc-dimensionamento-fisico-dwg.html).
- O contrato RFC da compreensão cartográfica enviada aos endpoints de inferência — materiais, requisitos, pessoal, equipes e equipamentos — está em [`docs/rfc-compreensao-operacional-dwg.md`](docs/rfc-compreensao-operacional-dwg.md).
- O servidor local pode atuar como ponte para o Worker via `BELAVISTA_API_BASE`, preservando o frontend atual.
- A pasta `worker/` concentra os endpoints para registros, recibos, orçamento, agenda, correlação entre etapas e notificações.
- A regra operacional é: Cloudflare concentra automação, orçamento, agenda, correlação entre etapas e registro auditável; o Firebase Realtime Database fica restrito ao espelhamento de mudanças para notificações e atualização ao vivo dos apps nas pontas.
- O ciclo operacional único recebe a situação global da obra, não uma etapa isolada. Entram caixa, compras, comprovantes, materiais disponíveis, progresso registrado em campo e o contexto de todas as etapas.
- Cada etapa mantém um contexto operacional próprio: descrição típica da execução, requisitos, focos de evidência, focos de suprimentos, tabela de materiais e destinos de notificação. Esse contexto é editado nas páginas dedicadas das etapas e segue junto no ciclo operacional único para orientar a inferência.
- Comprovação de compra resulta em adição de material ao estado operacional; registro do encarregado resulta em progresso registrado da atividade.
- Os cron jobs do Worker fazem a propagação interna: recalculam o estado da obra, escrevem no Firebase Realtime Database e disparam a atualização em tempo real dos clientes.
- Os segredos ficam no Worker. Os nomes padrão esperados pelo projeto são `NVIDIA_API_KEY`, `FIREBASE_DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON` e `GITHUB_PAT`.
