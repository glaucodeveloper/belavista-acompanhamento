# Belavista · Acompanhamento com IA

Protótipo estático/PWA inspirado nas telas conceituais fornecidas para o sistema Belavista. O produto é centrado em **IA + mapa**, com módulos apresentados como cards flutuantes sobre uma cena espacial.

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

Abra:

```text
http://localhost:8080
```

O chat usa `/api/ai` e `/api/gemini`. Sem `BELAVISTA_API_BASE`, o servidor local continua respondendo a API básica e pode usar Gemini. Com `BELAVISTA_API_BASE`, ele encaminha `/api/*` para o Worker Cloudflare, preservando a UI atual.

Para pular a tela de instalação e entrar direto na demonstração:

```text
http://localhost:8080/?demo=1
```

## Mapa e captação pública

- O dashboard inicial usa o mapa compartilhado com filtros de Execução, Colaboradores, Cronograma, Leads, Materiais e Riscos.
- A página pública exportada está em `public-leads.html` e pode ser aberta em `http://localhost:8080/public-leads.html`.
- `public-lead-form.mjs` envia as intenções para o Realtime Database Firebase em `publicLeads`, usando autenticação anônima antes da gravação.
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
├── api-client.js
├── worker/
│   ├── src/
│   ├── migrations/
│   └── wrangler.jsonc.example
├── docs/
│   └── CLOUDFLARE-NVIDIA-ARCHITECTURE.md
├── apply-overlay.sh
├── install-and-push.sh
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
└── scripts/
    └── create-repo.sh
```

## Worker Cloudflare V10

- Configure `BELAVISTA_API_BASE` para apontar para o Worker publicado quando quiser manter o frontend local consumindo a API remota.
- A arquitetura e os bindings esperados estão em `docs/CLOUDFLARE-NVIDIA-ARCHITECTURE.md`.
- A base do Worker fica em `worker/`, com D1 para dados operacionais, filas para digestão assíncrona e integração NVIDIA preparada.

## Validação

```bash
npm run check
```
