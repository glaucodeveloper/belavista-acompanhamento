# Teste de inferência e destinação de notas

O fluxo usa o Worker Cloudflare real para `/api/inference/attachment` e `/api/inference/analysis-edit`, e abre a aplicação em Chromium móvel. Apenas `/api/sync` fica em memória durante o teste; nenhum lote, material ou serviço de teste é gravado no repositório remoto.

Os onze PNGs sintéticos de notas ficam em `worker/test/fixtures/inference-allocation/` e são marcados sem validade fiscal. Os casos incluem serviços de obra classificados pela NFS-e e pelo conteúdo da imagem, serviço administrativo destinado a Escritório, materiais com vínculo de obra e descrições ausentes, parciais ou incompatíveis com o NCM. Nos casos incompletos, a interface deve perguntar no chat, não gravar antes da resposta, aceitar o detalhe digitado e salvar no destino correto.

Três fotografias sintéticas adicionais ficam em `worker/test/fixtures/service-evidence/`: pavimentação/meio-fio, drenagem pluvial e rede PEAD de água. São fixtures de teste, não retratam serviço real. O teste passa pelo chat móvel e pelo Worker real; verifica a atividade e a localização quando informada, aceita localização ausente e confirma que foto de campo não cria lançamento financeiro nem atualiza o progresso da etapa.

Para executar com uma sessão válida do Worker:

```sh
ALIANCAPARK_SESSION_TOKEN_FILE=/caminho/seguro/da-sessao \
  npm run test:inference:allocation
```

O script não exibe, revoga nem remove a sessão ou o arquivo de sessão. Guarde-o fora do repositório. `ALIANCAPARK_WORKER_URL` troca o endpoint, `CHROME_PATH` aponta para o Chromium, `ALLOCATION_E2E_CLARIFICATIONS_ONLY=1` ou `ALLOCATION_E2E_BASE_ONLY=1` selecionam os grupos e `ALLOCATION_E2E_CASES=id1,id2` filtra casos específicos.

Para testar uma nota escolhida pela pessoa com o catálogo de drenagem, use `node scripts/test-manual-material-example.mjs` com `ALIANCAPARK_SESSION_TOKEN` e `ALIANCAPARK_EXAMPLE_IMAGE` definidos. `ALIANCAPARK_EXPECTED_TOTAL` altera o total esperado (padrão: `2869.54`); o script também aceita `ALIANCAPARK_WORKER_URL` e `CHROME_PATH`. A sessão e a inferência usam o Worker indicado, enquanto os dados de Materiais ficam isolados em memória. O valor usado é apenas de exemplo e não é gravado no repositório da obra.

As capturas do chat ficam em `.test-artifacts/inference-allocation/`, ignorado pelo Git. Para recriar as notas sintéticas no diretório de fixtures, use:

```sh
python3 scripts/generate-inference-allocation-invoices.py worker/test/fixtures/inference-allocation
```

O gerador aceita uma lista opcional de IDs separados por vírgula para recriar só alguns fixtures.

O E2E também executa `worker/test/service-evidence-cases.json`; fotos sintéticas não precisam ser regeneradas.
