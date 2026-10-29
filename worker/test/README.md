# Teste de alocação OCR por atividade

O conjunto contém cinco imagens versionadas de notas simuladas, marcadas **sem validade fiscal**, e as envia ao endpoint real `/api/inference/attachment` do Worker Cloudflare. Depois abre a aplicação em Chromium, envia os mesmos anexos pelo chat, aplica a sugestão retornada e confere que o item aparece na etapa e atividade esperadas. A interface usa sincronização em memória durante o teste, sem gravar dados de teste no repositório remoto.

As notas de entrada ficam em `worker/test/fixtures/inference-allocation/`. As capturas visuais geradas pelo teste ficam em `.test-artifacts/inference-allocation/`, ignorado pelo Git. Para recriar as cinco notas a partir do catálogo JSON, execute `python3 scripts/generate-inference-allocation-invoices.py [diretório]`.

Casos cobertos:

- Assentamento de tubulação pluvial → `drenagem-assentar`.
- Reaterro e compactação de vala → `drenagem-compactar`.
- Tubo PEAD da rede principal → `agua-rede-principal`.
- Cavalete e conexões para ramal de água → `agua-ramais`.
- Postes para rede elétrica → `eletrica-postes`.

Execute com uma sessão autenticada do Worker:

```sh
ALIANCAPARK_SESSION_TOKEN='token-de-sessao' npm run test:inference:allocation
```

As capturas de evidência da árvore de etapas ficam em `.test-artifacts/inference-allocation/evidence-<atividade>.png`. Para exercitar somente a interface e o salvamento visual, sem chamada de inferência NVIDIA, use `npm run test:inference:allocation -- --mock-inference`; esse modo não certifica a qualidade do modelo.

Opcionalmente, `ALIANCAPARK_WORKER_URL` troca o endpoint e `CHROME_PATH` aponta para o Chromium. A execução usa os PNGs versionados; apenas as capturas de evidência são geradas em `.test-artifacts/inference-allocation/`. O modo padrão chama a inferência NVIDIA real e pode consumir cota.
