# Aliança Park — bateria real de inferência integral

Esta suíte não contém um scheduler de referência. Ela não calcula decisão de obra no teste. Cada transição é pedida ao `/api/operational-loop`, e o teste apenas valida propriedades do estado retornado.

O teste exige `provider=nvidia-api` e rejeita fallback determinístico.

## Graus de estado cobertos

- estado puro → análise de todas as atividades → primeiro cronograma;
- provisão de materiais, pessoal e caixa;
- saída de caixa, aporte e mudança de reserva;
- recebimento de recibo e propagação ao inventário;
- consumo e correção de inventário;
- atraso de fornecedor;
- diário de serviço, evidência, foto, conclusão e continuidade;
- conclusão de setor de água liberando pavimentação;
- postes independentes da cobertura total de cabos;
- ausência, retorno e remanejamento explícito de encarregado por localidade;
- mudança de metadescrição de etapa e atividade;
- aprovação/rejeição de evidência;
- novos materiais e novas atividades;
- aceite/conclusão de agenda;
- nova localidade e novo encarregado;
- persistência opcional do estado inferido no Firebase RTDB.

A prova mais importante é contrafactual: o teste altera **somente uma metadescrição** e exige mudança da decisão. Isso demonstra que o modelo efetivamente leu a descrição/peculiaridade em vez de reproduzir uma regra fixa do Worker.
