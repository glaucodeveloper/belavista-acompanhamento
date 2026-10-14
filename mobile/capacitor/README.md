# Aliança Park · Capacitor Android

Este é o shell Capacitor da aplicação original JS. O frontend atual é copiado para dentro do APK a cada build; ele não usa o Firebase Hosting, que pode estar em versão diferente do checkout.

As chamadas operacionais são direcionadas ao Worker publicado em `https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev`. Firebase continua sendo acessado diretamente pelo cliente, como na aplicação web.

## Gerar o APK

Na raiz do repositório:

```powershell
Set-Location F:\belavista-acompanhamento\mobile\capacitor
npm install
npm run cap:sync
cd android
.\gradlew.bat assembleDebug
```

Depois da primeira inicialização do Android, o build pode ser repetido diretamente pela raiz:

```powershell
npm run capacitor:apk
```

O Capacitor 8 precisa de JDK 21 a 25. O script procura primeiro um JDK compatível em `JAVA_HOME`, nas instalações do Windows e no diretório temporário usado pelo ambiente de build.

O arquivo gerado fica em:

`android\app\build\outputs\apk\debug\app-debug.apk`

Para instalar em um dispositivo com depuração USB habilitada:

```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

O build executa `scripts/build-capacitor-web.mjs`, que refaz `dist-pages`, copia o resultado para `www` e injeta apenas a configuração mobile da base da API. Para trocar o Worker, altere `workerBase` nesse script e execute `npm run capacitor:apk` novamente.

O mapa mobile é estático, com imagem de satélite e marcadores de lotes. Por isso os modelos GLB do renderizador 3D são excluídos somente do APK; eles continuam disponíveis no build web.

O ícone e a tela de abertura nativos são gerados de `resources/icon.png`, a marca oficial circular do Aliança Park. Use `npm run assets:generate` depois de substituir esse arquivo.
