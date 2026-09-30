# Imagens no chat e evidências

O navegador envia a imagem somente para `/api/ai` ou `/api/public/lead-chat`. O Worker valida PNG, JPEG e WEBP até 6 MB, grava o objeto privado no R2 e encaminha a imagem em memória ao modelo VLM NVIDIA. A resposta retorna apenas `attachment.id`, `attachment.key` e `attachment.reference`.

O chat administrativo apresenta duas ações explícitas depois da análise:

- `Usar em registro`: prepara o formulário geral de registros;
- `Usar como comprovação`: prepara o mesmo formulário com a finalidade de comprovação.

Em ambos os casos, a gravação só acontece quando uma pessoa confirma o formulário. A referência persistida no registro é `r2://BELAVISTA_UPLOADS/...`; a imagem não é tornada pública.

## Configuração do Worker

O binding `BELAVISTA_UPLOADS` está declarado em `worker/wrangler.jsonc`. Se o bucket ainda não existir, crie-o uma vez no ambiente correto:

```powershell
npx wrangler r2 bucket create belavista-uploads
npx wrangler secret put NVIDIA_API_KEY --config worker/wrangler.jsonc
npx wrangler deploy --config worker/wrangler.jsonc
```

O modelo de visão vem de `NVIDIA_VISION_MODEL` (ou `NVIDIA_VLM_MODEL`) e usa o endpoint OpenAI-compatible configurado em `NVIDIA_API_URL`, com padrão `https://integrate.api.nvidia.com/v1/chat/completions`.

Sem o binding R2, o Worker ainda pode analisar a imagem em memória, mas responde `attachment.stored=false` e a interface bloqueia o aceite como evidência permanente. Isso evita registrar uma referência que não possa ser recuperada.

O chat da landing reutiliza `/api/public/lead-chat`, aceita colagem e câmera em telas móveis e mantém a mesma regra: a imagem permanece no Worker/R2 e não é salva na sessão do navegador.
