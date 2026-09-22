# Plugin do Codex: context-mode

Registro reprodutível da dependência de ambiente usada durante o desenvolvimento e validação deste projeto.

## Identificação

- **Plugin:** `context-mode`
- **Versão observada:** `1.0.169`
- **Repositório:** https://github.com/mksglu/context-mode
- **Manifesto Codex:** `.codex-plugin/plugin.json`
- **MCP:** `.codex-plugin/mcp.json`
- **Skills:** `skills/`
- **Ferramentas usadas nesta sessão:** `ctx_execute`, `ctx_execute_file`

O plugin é instalado e gerenciado pelo ambiente do Codex, fora deste repositório. O cache observado nesta sessão foi:

```text
/home/icarogdo/.codex/plugins/cache/context-mode/context-mode/1.0.169
```

O cache não é copiado para o projeto porque contém dependências compiladas, estado de sessão e arquivos específicos da máquina. Este arquivo funciona como lock de proveniência para outro Codex instalar a mesma dependência pelo catálogo de plugins e conferir a versão antes de continuar.

## Verificação

Depois de instalar o plugin pelo catálogo do Codex, confirme que estes recursos estão disponíveis:

```text
context-mode 1.0.169
ctx_execute
ctx_execute_file
```

Para conferir a instalação localmente, verifique:

```text
$CODEX_HOME/plugins/cache/context-mode/context-mode/1.0.169/.codex-plugin/plugin.json
```

O projeto não depende de `context-mode` em produção. A dependência serve ao trabalho do Codex para análise de logs, inspeção de saídas grandes, execução controlada de testes e continuidade de contexto durante compactações.

## Relação com o código do projeto

Os comandos de produto permanecem executáveis sem o plugin, usando Node.js e as dependências do `package.json`. O plugin não deve ser empacotado no Firebase Hosting, no TWA, no Electron ou em qualquer artefato de produção.

## Estado registrado em 2026-09-12

- A branch `codex/continuation-20260912` foi verificada com o plugin ativo.
- O plugin foi usado para consolidar o estado Git e separar código de artefatos gerados antes do commit.
- Não há tokens, credenciais, banco local ou cache de sessão neste registro.
