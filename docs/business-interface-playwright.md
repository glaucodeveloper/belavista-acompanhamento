# Bateria de interface — fluxos de negócio

Execute na raiz do projeto:

```powershell
npm run test:interface:business
npx playwright show-report output/business-interface-report
```

Configuração: `playwright.business.config.mjs`. Cenários: `tests/screen/business-interface.spec.mjs`.
O servidor local é iniciado pela configuração se não houver um em execução na porta 8080.

Última execução: 29/09/2026 — **16 aprovados, 0 falhas, 0 ignorados, 0 instáveis**, em 39 segundos. Foram anexados 24 prints. Duas verificações complementares (cabeçalho compartilhado e política de ferramentas da IA) também passaram; os cinco módulos alterados passaram na verificação de sintaxe. A política de IA foi testada com resposta simulada, não com inferência real do provedor.

## Cobertura

| Fluxo | Interações e verificações |
|---|---|
| Documentos | Adicionar PDF e DWG, pesquisar, conferir metadados, recarregar; impedir cadastro sem arquivo |
| Registros | Registrar evento, conferir payload e histórico da Central; simular erro, preservar preenchimento e habilitar tentativa |
| Atividades | Abrir detalhe pelo calendário e voltar à lista |
| Prioridades IA | Selecionar ponto, arrastar impacto/prontidão; card solicitar cadeia pela API, criar pendência e mostrar orientação |
| Encarregados | Validar WhatsApp, cadastrar, vincular etapa, recarregar, editar, cancelar exclusão e confirmar exclusão |
| Leads | Pesquisar, abrir perfil, solicitar atendimento no chat e voltar preservando pesquisa |
| Contratos | Criar com anexo e valores, abrir edição e alterar cliente |
| Comissões | Editar valor com centavos e conferir cálculo da comissão e payload monetário |
| Corretores | Abrir carteira, anexar comprovante, remover comprovante e voltar |
| Relatórios | Expandir/recolher item, alternar seis famílias e baixar CSV, verificando conteúdo do arquivo |
| Configurações | Salvar página inicial, densidade, animação e Pix; conferir aplicação e persistência; ausência de campos técnicos |
| Navegação | Ausência de Financeiro na sidebar e redirecionamento de endereço legado para Central |

## Evidências e limites

Cada cenário anexa screenshot final e requisições da interface. Formulários e relatório expandido têm prints adicionais. Falhas mantêm trace e screenshot. O CSV baixado fica anexado ao cenário.

Artefatos: `output/business-interface-report/index.html`, `output/business-interface-results/`, `output/business-interface-results.json`.

São testes automatizados de interface com cliques, teclado, arraste e upload pelo Playwright, não testes manuais. Cada cenário usa contexto de navegador isolado. Autenticação e APIs são substituídas por fixtures determinísticas; nenhuma gravação vai à base operacional. A pendência de agenda usa a resposta simulada da API e o executor real da interface.

Esta bateria não certifica autenticação Firebase, persistência real no servidor, inferência NVIDIA nem integridade CAD/PDF: os arquivos PDF/DWG são fixtures de transporte. O download testado é CSV; geração/impressão PDF exige cenário próprio. Dados de encarregados permanecem na memória local já usada pelo sistema, não provisionam automaticamente contas de autenticação.

## Alterações associadas

- Financeiro removido da navegação; rota antiga encaminha à Central. Fluxo de caixa e família financeira de relatórios permanecem.
- Configurações voltadas ao uso: página inicial, densidade, redução de animações, voz, contato, avisos e dados de reserva/Pix. Configurações técnicas não são exibidas; valores técnicos existentes são preservados ao salvar.
- Estado compartilhado entre imports com versões diferentes, evitando divergência do chat com a interface.
- A cadeia operacional usa ferramentas retornadas pela API sem substituição por atalhos locais; orientação textual continua visível.
- Atendimento de Leads e próximo passo das Ações IA usam o assistente ativo.
- Edição comercial preserva centavos e recalcula comissão.
- Cadastro de encarregado atualiza a lista, permite manutenção e persiste após recarga.
- Alterações de prioridade invalidam o cache da tela: seleção e arraste atualizam o painel de impacto/prontidão.
- Senhas iniciais de encarregados não são incluídas na memória persistida do navegador.
- Botão flutuante de mensagens reposicionado para não cobrir a confirmação comercial.
