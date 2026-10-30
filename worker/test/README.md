# Teste de inferência e destinação de notas

O fluxo usa o Worker Cloudflare real para `/api/inference/attachment` e `/api/inference/analysis-edit`, e abre a aplicação em Chromium móvel. Apenas `/api/sync` fica em memória durante o teste; nenhum lote, material ou serviço de teste é gravado no repositório remoto.

Os oito PNGs sintéticos ficam em `worker/test/fixtures/inference-allocation/` e são marcados sem validade fiscal. Cinco cobrem despesas completas de serviço e material; três cobrem descrição ausente, parcial e incompatível com o NCM. Nos três casos incompletos, a interface precisa perguntar no chat, não gravar antes da resposta, aceitar o detalhe digitado e salvar automaticamente na atividade correta.

Para executar com uma sessão válida do Worker:

```sh
ALIANCAPARK_SESSION_TOKEN_FILE=/caminho/seguro/da-sessao \
  npm run test:inference:allocation
```

O script não exibe nem remove o arquivo de sessão. Guarde-o fora do repositório e remova-o depois do teste. `ALIANCAPARK_WORKER_URL` troca o endpoint, `CHROME_PATH` aponta para o Chromium e `ALLOCATION_E2E_CLARIFICATIONS_ONLY=1` ou `ALLOCATION_E2E_BASE_ONLY=1` selecionam os casos.

As capturas do chat ficam em `.test-artifacts/inference-allocation/`, ignorado pelo Git. Para recriar as notas sintéticas:

```sh
python3 scripts/generate-inference-allocation-invoices.py
```
