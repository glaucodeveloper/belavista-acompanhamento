# Aliança Park · TWA

O app Android abre a página pública de lotes e atendimento:

`https://belavista-3f887.web.app/`

O `assetlinks.json` é verificado na raiz do **host**. Para o host padrão, publique o arquivo final em `https://belavista-3f887.web.app/.well-known/assetlinks.json` como parte do deploy do Firebase Hosting.

## Pré-requisitos para uma TWA confiável

1. Faça `npm run build:public` e publique `dist-pages` com Firebase Hosting.
2. Gere ou escolha o certificado de release Android e obtenha o SHA-256.
3. Copie `assetlinks.json.template` para `dist-pages/.well-known/assetlinks.json`, substitua o SHA-256 e faça o deploy. A TWA só remove a barra do navegador depois dessa verificação.
4. Inicialize o projeto Android com Bubblewrap a partir de `lead-manifest.webmanifest`:

```bash
npx --yes @bubblewrap/cli init \
  --manifest=https://belavista-3f887.web.app/lead-manifest.webmanifest \
  --directory=mobile/twa/android
```

5. Compare/atualize os valores gerados com `twa-manifest.json`, assine e gere o AAB:

```bash
cd mobile/twa/android
npx --yes @bubblewrap/cli build
```

Sem `assetlinks.json` válido, o Android abre a URL em Custom Tab; com a verificação publicada, ela abre como Trusted Web Activity sem barra do navegador.

## TWA administrativo · login e campo

O TWA administrativo usa `admin-twa-manifest.webmanifest`, abre em `/admin?twa=admin` e exige Firebase Auth. O claim customizado `role` deve ser `admin`, `foreman` (ou `owner` no painel geral). O portal móvel `/encarregados.html` aceita `foreman` e `admin`; o encarregado recebe uma tela compacta de confirmação, chat e evidências.

Inicialização do pacote administrativo:

```bash
npx --yes @bubblewrap/cli init \
  --manifest=https://belavista-3f887.web.app/admin-twa-manifest.webmanifest \
  --directory=mobile/twa/android-admin
cd mobile/twa/android-admin
npx --yes @bubblewrap/cli build
```

Publique `mobile/twa/admin-assetlinks.json.template` preenchido em `dist-pages/.well-known/assetlinks.json` para o pacote `com.belavista.aliancapark.admin`.

### Login persistente e notificações nativas

O painel `/admin` configura `browserLocalPersistence` do Firebase Auth antes de restaurar o usuário. Assim, o TWA não solicita login novamente após fechar e abrir o aplicativo, sem armazenar senha no dispositivo. A role continua sendo validada pelo custom claim `role` do token.

O `admin-twa-runtime.mjs` registra o `sw.js` e exibe a ativação de notificações somente depois da autenticação. O botão solicita a permissão do sistema, obtém o token FCM com a chave pública VAPID e grava o dispositivo em `operationalDevices/{uid}/{installationId}`. As mudanças publicadas em `notifications/{uid}` continuam chegando pelo Realtime Database e, quando o aplicativo está em segundo plano, o `push` do Service Worker exibe a notificação na bandeja do celular.

Para habilitar o push real no domínio publicado:

1. Gere uma chave pública Web Push em Firebase Console → Project Settings → Cloud Messaging → Web configuration.
2. Configure essa chave em `meta[name="belavista-fcm-vapid-key"]` ou na tela de configurações do sistema. A chave privada nunca vai para o navegador.
3. No Android 13 ou superior, aceite a permissão de notificações no primeiro toque. `enableNotifications: true` no manifesto Bubblewrap inclui `POST_NOTIFICATIONS` no TWA.
4. Publique o `assetlinks.json` com o SHA-256 do certificado de release; isso mantém o `/admin` como Trusted Web Activity sem barra do navegador.

## Firebase e atendimento NVIDIA

Publique as regras do Realtime Database e do Storage, e faça deploy das Cloud Functions. O atendimento de leads usa a Function `leadAssistant`, que lê `NVIDIA_API_KEY` no Secret Manager do Firebase. As notificações de WhatsApp são somente pseudo-notificações: o Worker grava o evento no RTDB e os dispositivos autenticados fazem listen; não há webhook, token ou mensagem externa.
