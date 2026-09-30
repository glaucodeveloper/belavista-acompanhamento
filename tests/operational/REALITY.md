# Testes de realidade do System Model

Há duas suítes diferentes.

## 1. `npm run test:operational`

É **unitário/offline**. Usa `FakeSystemModel` deliberadamente para testar reducer/reconciler em milissegundos.

Ele NÃO prova MiniCPM/OpenJEV.

## 2. `npm run test:operational:reality`

É o teste de realidade do modelo.

Requisitos:

- OpenJEV real em `http://127.0.0.1:8090` (ou `BELAVISTA_OPENJEV_URL`);
- checkpoint MiniCPM carregado;
- `/health` deve retornar `ready=true`;
- `health.model` deve conter `MiniCPM`;
- `BELAVISTA_OPENJEV_LIVE=1`.

Cada caso executa um `POST /v1/systemone` real. Não existe `FakeSystemModel`.

```powershell
$env:BELAVISTA_OPENJEV_LIVE = "1"
$env:BELAVISTA_OPENJEV_URL = "http://127.0.0.1:8090"

npm run test:operational:reality
```

Os cenários cobrem:

1. falta de material;
2. recebimento que satisfaz material;
3. atraso de fornecedor;
4. estresse de caixa;
5. aceite de serviço sem conclusão;
6. nota de serviço parcial;
7. imagem ainda pendente;
8. imagem verificada + confirmação;
9. etapa parcialmente concluída;
10. nota de compra com material + caixa + reavaliação.

O terminal imprime a escolha real do modelo, confiança/probabilidades quando disponíveis e latência.

## 3. Registry real, read-only

Este teste lê o estado produtivo do registry pelo Worker, pega um recorte real e pergunta ao MiniCPM. Não grava nada:

```powershell
$env:BELAVISTA_OPENJEV_LIVE = "1"
$env:BELAVISTA_ADMIN_ID_TOKEN = "<token vigente>"

npm run test:operational:registry-read
```

## 4. Tudo

```powershell
npm run test:operational:reality:all
```

A suíte de realidade é propositalmente mais lenta. Se 10 inferências MiniCPM terminarem em dezenas de milissegundos, algo está errado.
