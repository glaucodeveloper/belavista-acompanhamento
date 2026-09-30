# Glauco Asked Ruby — shared Ruby/WASM frontend reboot

## Port do Aliança Park (F:\\belavista-acompanhamento)

Este diretório agora executa telas nativas da DSL Ruby em `web/public/ruby/native-pages.rb`; a camada principal não incorpora mais `/admin` em WebView. O Browser JEV permanece para o Instagram Direct. `npm run dev` e `npm run build` exportam dados-base diretamente de `state.js` e `repasse-price-catalog.mjs` para `web/public/data/original-snapshot.json` (7 etapas, 298 lotes válidos). A página de prompt do atendente configura as instruções e o proxy local NVIDIA.

Para conferir no navegador (PowerShell):

```powershell
cd F:\belavista-acompanhamento\glauco-ruby-port\web
npm install # apenas na primeira execução
npm run dev -- --port 5176 --host 127.0.0.1
```

Abra `http://127.0.0.1:5176/`. Para o desktop nativo, execute `..\scripts\windows\build-desktop.ps1` a partir de `web` (requer Rust/MSVC e WebView2). **Não use `run-example.ps1` neste projeto:** ele substitui `web/public/ruby/application.rb` pelo exemplo.

Nesta etapa há Dashboard, Central, Etapas/agenda/materiais, Registros, Lotes/modal, Financeiro e páginas Instagram em Ruby. A prévia aérea usa o asset do projeto original; o mapa 3D interativo, o CRUD persistente e as telas comerciais completas ainda não foram portados. O snapshot não é dado operacional em tempo real. Não registre vendas, pagamentos ou status neste port até a API original estar integrada. O backend JS existente não foi alterado.

Este pacote implementa a direção combinada definida para o framework:

```ruby
application "Belavista" do
  targets :desktop, :android
  frontend :webview
  capabilities :filesystem, :camera, :location
end
```

A linguagem pública continua sendo **Ruby**. `glauco` descreve a distribuição/estilo do Ruby, não vira namespace obrigatório da aplicação.

## Arquitetura

```text
application.rb + components Ruby
            |
         ruby.wasm
            |
       Ruby DOM DSL
            |
       WebView runtime
        /          \
 Desktop/Wry    Android/Capacitor
        |          |
 WebView2/GTK   Android WebView
```

O HTML é apenas bootstrap. O renderer real é `core/framework/ruby/browser_runtime.rb`: ele usa `require "js"` e cria/muta o DOM diretamente a partir de Ruby.

### `machine`

`machine` continua sendo Ruby. `command` envia o estado e os métodos permitidos para o System One browser. `web/src/semif.mjs` implementa o mesmo caminho de direct readout usado pelo demo SemIf/OpenJev para Qwen3 0.6B: uma opção A..T, logprobs e softmax só entre as opções declaradas.

```ruby
machine :Work do
  state :idle
  method(:start, "Start or resume") { state :working }
  method(:wait, "Wait for a dependency") { state :waiting }
end

Work.command "the material has not arrived"
```

O modelo escolhe a operação; Ruby executa a operação.

### Capacidades

O manifesto declara capacidades, não implementações:

```text
filesystem -> Capacitor Filesystem no Android
location   -> Capacitor Geolocation no Android
camera     -> Capacitor Camera no Android
```

No desktop as mesmas APIs são resolvidas pelo host/bridge correspondente.

### Modelo generativo

O frontend WASM não precisa de RubyLLM. A API pública é `Ruby::Platform.model`.

* Desktop: `RubyPlatform.model.complete` fala com um `llama-server` OpenAI-compatible em localhost.
* Android: a ponte `RubyModel` deve ser conectada ao binding oficial `llama.cpp/examples/llama.android` (`AiChat` / `InferenceEngine`). O template está em `android-plugin/RubyModelPlugin.kt.template`.

### Memória Metis

A DSL de memória permanece independente do frontend. No browser, `RubyPlatform.memory` espera o bridge Metis HTTP configurado por `RubyConfig.memoryEndpoint`; isto preserva o lifecycle nativo do Metis em um processo apropriado sem colocar Python/PyTorch dentro do ruby.wasm.

## Instalação no repositório

```bash
./scripts/install-into-repo.sh /home/icarogdo/dev/glauco-asked-ruby
```

## Android

```bash
./scripts/build-android.sh
```

ou manualmente:

```bash
cd web
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## Desktop

Dependências Linux típicas: Rust/Cargo, GTK3 e WebKitGTK. Depois:

```bash
./scripts/build-desktop.sh
```

O host usa Wry; em Linux o código usa `gtk::Fixed`/`build_gtk`, preservando funcionamento GTK em X11/Wayland.

## Arquivos principais

```text
core/framework/glauco_asked_ruby.rb
core/framework/ruby/application.rb       # manifesto para MRI/core legado
core/framework/ruby/browser_runtime.rb   # runtime Ruby/WASM compartilhado
web/src/main.mjs                         # boot do CRuby/WASM
web/src/platform.mjs                     # host capabilities, model, memory
web/src/semif.mjs                        # Qwen3 0.6B System One browser
web/public/ruby/application.rb           # aplicação exemplo executada no WASM
native/ruby-webview-host/                # host Wry desktop
android-plugin/RubyModelPlugin.kt.template
```

## Estado desta entrega

Validado aqui: sintaxe Ruby, sintaxe JavaScript/ESM e estrutura do pacote. O build Vite usa `web/index.html` e copia `ruby+stdlib.wasm` localmente no `postinstall`. O host Rust não foi compilado neste ambiente porque Cargo não está instalado. O plugin Android de llama.cpp é deliberadamente um contrato/template: o binding oficial precisa ser incorporado no projeto Android gerado antes de `RubyPlatform.model` executar inferência nativa.

## Windows / PowerShell

After downloading the ZIP from ChatGPT, PowerShell can extract and install it:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
$zip = "$env:USERPROFILE\Downloads\glauco-ruby-wasm-capacitor-reboot-windows.zip"
Expand-Archive -Path $zip -DestinationPath "$env:USERPROFILE\Downloads\glauco-ruby-reboot" -Force
cd "$env:USERPROFILE\Downloads\glauco-ruby-reboot\glauco-ruby-wasm-capacitor-reboot"
.\scripts\windows\install-into-repo.ps1 -RepoRoot "C:\dev\glauco-asked-ruby"
```

Or let the package unzip + install in one command:

```powershell
.\scripts\windows\unzip-and-install.ps1 `
  -ZipPath "$env:USERPROFILE\Downloads\glauco-ruby-wasm-capacitor-reboot-windows.zip" `
  -RepoRoot "C:\dev\glauco-asked-ruby"
```

Desktop example:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\windows\run-example.ps1 -Target desktop
```

Android preparation on Windows:

```powershell
.\scripts\windows\run-example.ps1 -Target android -OpenAndroidStudio
```

Desktop build prerequisites are Node.js LTS, Rust via rustup with the MSVC toolchain, Microsoft C++ Build Tools, and the Microsoft Edge WebView2 Runtime. Android additionally requires Android Studio/SDK and a supported JDK.
