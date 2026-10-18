# Continuação — frontend Atlas TypeScript

Atualizado em 18/10/2026. Branch: `codex/continuation-20260912`.

## Objetivo e contrato

Transpor admin, páginas públicas e APK por categorias funcionais completas, preservando a operação real. `frontend/src/components.ts` concentra Web Elements, helpers de apresentação e estado transitório local por iteradores `state.next()`. `frontend/src/program.ts` concentra serviços, catálogos derivados de APIs, eventos e a composição imperativa documentada em `frontend/PROGRAM.md`. O único iterador global de estado é `routeStateProgram`, exclusivo da identidade da rota. `models.ts` declara contratos e `main.ts` inicia o programa. Não introduzir `update` para avançar estado; não substituir entidades persistidas por dados demonstrativos.

Uma rota instalada ainda não equivale à categoria transposta: o shell, várias rotas públicas e o APK continuam parcialmente legados. Não remover módulos antigos até transpor e verificar seus últimos consumidores.

## Ponto de parada

- Os monólitos TypeScript e pontes de instalação das rotas administrativas estão no repositório. A cobertura e as lacunas de cada categoria constam em `frontend/README.md`; eventos, autenticação, políticas e endpoints constam em `frontend/PROGRAM.md`.
- Categoria em andamento: acervo do loteamento (`documents`). Há componente Atlas, orquestração, SQLite com metadados/arquivos/colunas, endpoints locais e equivalentes no Worker/D1. O teste local do acervo verificou CRUD, anexo, colunas e persistência após reinício independente do servidor, limpando as linhas QA.
- Migração remota `worker/migrations/0013_project_documents.sql` aplicada ao D1 `belavista-v10`. Worker publicado em 18/10/2026 na versão `73ca2d93-5270-4d8f-9ec1-809fc7e91fbe`. Publicação não é evidência de CRUD remoto validado.
- Permanecem pendentes: importação real do acervo anterior no navegador, ligação dos consumidores legados de `documentCatalog` ao serviço persistente, CRUD autenticado remoto no Worker, inspeção visual desktop/mobile, APK e eliminação dos módulos legados após a transposição completa.

## Próxima sequência

1. Inspecionar os consumidores restantes de `documentCatalog` e toda a categoria `documents` antes de alterá-la. A rota direta e o item administrativo de navegação foram restaurados, mas ainda precisam conferência visual e de permissões por perfil no shell.
2. Executar um ensaio reversível de importação com documento autorizado e conferir metadados, bytes, download e colunas após releitura/reinício. Não importar nem sobrescrever dados operacionais silenciosamente.
3. Validar o contrato D1/Worker com sessão autorizada sem expor tokens, incluindo leitura, criação/edição/exclusão QA identificável, arquivo e colunas. Limpar somente os registros QA criados no ensaio.
4. Conferir visualmente `documents` em desktop/mobile e depois no APK. Avançar às demais categorias inteiras, conforme a tabela de `frontend/README.md`; só substituir entradas legadas quando admin, público e APK mantiverem todos os fluxos.
5. Ao final de cada categoria, fazer uma rodada de build, testes relevantes, CRUD/persistência e conferência visual, sem ciclos de teste desnecessariamente frequentes.

## Reprodução e limites

`npm run build:frontend` compila os arquivos TypeScript em `dist/frontend` (artefatos ignorados pelo Git). `npm run build:public` inclui o build para a distribuição pública/APK; `npm run capacitor:sync` copia para o projeto Android. O servidor local precisa de build antes da inicialização. Não versionar `.env`, PATs, bancos operacionais, logs, arquivos de clientes ou capturas locais.

Outras modificações e arquivos não rastreados permaneciam no diretório de trabalho no momento deste registro. O commit desta continuação seleciona somente código, testes e documentação necessários à migração; não supõe que o restante da árvore esteja limpo nem reivindica validação de fluxos ainda pendentes.
