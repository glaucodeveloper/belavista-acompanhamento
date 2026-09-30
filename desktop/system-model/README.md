# Belavista Desktop System Model

Camada local que separa fatos autoritativos, decisão operacional MiniCPM5-2B/OpenJEV e reconciliação derivada.

OpenJEV padrão:
- `http://127.0.0.1:8090`
- `POST /v1/systemone`
- modelo `MiniCPM5-2B`
- método `direct`

## Testes

```powershell
npm run test:operational
```

Cada teste imprime no terminal um grafo mostrando FIELD/CAPACITOR -> FACT REDUCER -> MINICPM/OpenJEV -> RECONCILER -> GITHUB REGISTRY e os checks naquele ponto.

Teste real do OpenJEV:

```powershell
$env:BELAVISTA_OPENJEV_LIVE = "1"
npm run test:operational:live
```

Daemon:

```powershell
npm run system-model:once
npm run system-model:daemon
```
