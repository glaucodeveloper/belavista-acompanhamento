# Bundled OpenJEV / MiniCPM system model

O runtime é instalado **dentro do projeto**, não globalmente:

```text
vendor/
  openjev/
    bin/decision-test.exe
    models/MiniCPM5-2B-Q4_K_M.gguf
    third_party/llama.cpp/b11056/llama-server.exe
```

O `npm start` antigo em `localhost:8080` permanece intacto.

## Primeira instalação

```powershell
npm run system-model:install
```

Esse comando:

1. baixa `axsh/openjev` e fixa o commit definido pelo projeto;
2. baixa o `llama-server` Windows CUDA pinado pelo OpenJEV;
3. baixa o GGUF MiniCPM5-2B Q4_K_M;
4. usa Go do PATH ou baixa Go portátil em `vendor/tools/go`;
5. roda os unit tests do OpenJEV;
6. compila `vendor/openjev/bin/decision-test.exe`.

## Iniciar

```powershell
npm run system-model:start
```

Serviços:

- Belavista: `127.0.0.1:8080`
- llama-server: `127.0.0.1:18080`
- OpenJEV Decision API: `127.0.0.1:8090`

## Health

```powershell
npm run system-model:health
```

## Parar

```powershell
npm run system-model:stop
```

## Testes de realidade

```powershell
$env:BELAVISTA_OPENJEV_LIVE = "1"
npm run test:operational:reality
```
