# Resumo

A Agenda de obras registra compromissos com data, horário, descrição e vínculo visual às áreas do loteamento. Agora também permite reservar materiais já associados a uma etapa ou atividade e informar a quantidade prevista para cada compromisso. A página Etapas permite editar, excluir e realocar itens; as alterações são refletidas nos compromissos que os utilizam.

# Sumário

1. Agenda de obras, áreas e materiais
2. Itens de materiais e serviços nas etapas

# Capítulo 1 - Agenda de obras, áreas e materiais

Abra o menu de navegação no canto superior direito e escolha **Agenda**. A agenda mostra o dia selecionado, os compromissos daquele dia e o calendário mensal. Para começar, use **Novo compromisso** ou **Adicionar compromisso** no dia desejado.

Informe o título e a data. Os horários de início e fim são opcionais; sem horário, o compromisso aparece como **Dia todo**. Use **Detalhes** para registrar equipe, materiais, instruções ou contexto. A data pode ser passada quando o registro do compromisso precisar ser retroativo.

Na seção **Materiais da etapa**, escolha um material já associado a uma etapa ou atividade e pressione **Adicionar**. A lista informa a etapa, a atividade e a quantidade planejada. No compromisso, informe a quantidade que será reservada; ela é independente da quantidade total planejada para a etapa. Um mesmo material só pode ser incluído uma vez no compromisso. Use **×** para retirar uma alocação. A quantidade precisa ser maior que zero para salvar.

Materiais incluídos nas listas de etapas e materiais reconhecidos que já foram vinculados a uma etapa ou atividade aparecem como opções. Serviços não aparecem nessa lista de materiais. Ao consultar o compromisso, a seção **Materiais alocados** mostra o nome, a etapa, a atividade e a quantidade reservada. O cartão do dia também indica quantos materiais foram associados.

Na seção **Áreas do loteamento**, toque ou clique na planta para marcar as regiões relacionadas ao serviço. A legenda diferencia os três tipos. O contador mostra quantas áreas foram selecionadas; as etiquetas abaixo da planta identificam cada uma e permitem removê-la pelo botão **×** enquanto o compromisso está em edição.

Um lote é selecionado tocando dentro de seu polígono. Cada fatia de rua representa a frente de um lote, para que o serviço viário possa ser localizado por trecho. Lotes de esquina podem ter mais de uma frente, registrada em segmentos separados. A área social é um polígono único que acompanha os limites das quadras e das ruas que a contornam.

![Planta com as áreas de rua divididas em segmentos selecionáveis](areas-das-ruas.png)

No celular, use dois dedos para aproximar ou afastar a planta e arraste com um dedo para percorrê-la. No desktop, mantenha **Ctrl** pressionado enquanto arrasta verticalmente para aproximar ou afastar; **Ctrl + roda do mouse** também ajusta o zoom. **Enquadrar planta** retorna à visão completa e preserva as áreas já marcadas.

Confira título, data, detalhes e contador de áreas antes de salvar. **Salvar compromisso** fecha o formulário e mostra o novo cartão no dia escolhido. Abra o cartão para conferir descrição e áreas vinculadas. Em **Editar compromisso**, é possível alterar os campos e as marcações; **Excluir** remove o compromisso da agenda.

Os destaques de progresso no mapa usam os trechos e lotes associados aos compromissos da agenda. Assim, marcar um compromisso em uma área também deixa explícito onde o serviço deve ocorrer; para registrar um serviço já executado, informe a data correspondente e mantenha a área correta vinculada.

# Capítulo 2 - Itens de materiais e serviços nas etapas

Na página **Etapas**, abra uma etapa e selecione o item de material ou serviço que deseja alterar. O modal apresenta os campos reconhecidos ou cadastrados para aquele item. Ajuste nome, descrição, quantidade, unidade, preço unitário, total, fornecedor, número da nota ou data e escolha **Salvar detalhes**. Quantidade deve ser maior que zero; preço unitário e total não podem ser negativos. Ao alterar quantidade ou preço unitário, o total é recalculado. Se alterar o total, o preço unitário é recalculado.

Para remover um item, escolha **Excluir** no modal e confirme a ação. A exclusão é persistida nos dados da aplicação. Se o item for um material alocado em compromissos da agenda, ele também é retirado dessas alocações para não deixar referências quebradas.

Materiais reconhecidos que podem ser realocados exibem a ação **Mover**. Selecione a etapa ou atividade de destino e confirme. A agenda acompanha a nova associação e atualiza etapa, atividade, nome, unidade e quantidade planejada do material nos compromissos relacionados. A quantidade reservada em cada compromisso permanece a mesma; revise-a se a mudança de planejamento exigir outro valor.

As alterações e exclusões feitas por esses controles são sincronizadas com os dados remotos pelo Worker da aplicação. Depois de salvar, confira a mensagem de sucesso na página Etapas e, se o item estiver agendado, abra o compromisso para confirmar os dados atualizados.
