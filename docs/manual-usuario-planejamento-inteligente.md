# Manual do usuário · planejamento inteligente da obra
## Aliança Park

**Edição inicial:** 04/09/2026  
**Leitura:** usuário final, Dono, Administrador e Encarregado

## Apresentação

Este manual mostra como o Aliança Park transforma caixa, registros de campo, materiais, equipe e dependências em uma agenda explicável. A IA ajuda a compreender e organizar as próximas requisições da operação: material, compra, caixa, agenda, evidência, pendência e notificação.

Ela não substitui o responsável técnico nem confirma sozinha aquilo que não foi observado. Seu trabalho é transformar fatos da obra em uma leitura organizada para que a equipe saiba o que pode ser feito, o que falta e quem precisa agir.

## 1. Como a inteligência lê a obra

O sistema faz quatro perguntas para cada atividade:

1. **O que está sendo feito?** — etapa, atividade e descrição da execução.
2. **Onde está sendo feito?** — frente, setor, trecho, quadra, via ou área social.
3. **O que é necessário?** — dependência, material, equipamento, equipe, caixa e documento.
4. **Como se comprova?** — quantidade, unidade, data, responsável, foto, ensaio, certificado ou aceite.

O caminho da leitura é:

```text
registro → compreensão → relação → requisição → confirmação → propagação
```

### O que é cada palavra

| Palavra | Significado na operação |
|---|---|
| Registro | fato informado por uma pessoa ou recebido por documento |
| Compreensão | interpretação da execução, do requisito e da consequência |
| Relação | ligação entre atividade, etapa, local, material, pessoa, caixa e prazo |
| Requisição | pedido organizado de material, recurso, caixa, agenda ou informação |
| Confirmação | validação humana do fato ou da decisão que exige autoridade |
| Propagação | atualização das partes relacionadas do sistema |

## 2. Planejamento inicial da obra

Esta é a fotografia inicial do catálogo lite. Os percentuais são referências de demonstração; ao receber registros reais, a inteligência recalcula a situação.

| Ordem | Etapa | O que a inteligência compreende | Progresso inicial |
|---:|---|---|---:|
| 1 | Terraplanagem | greide, corte, aterro, viagens, máquinas, volumes e trechos liberados | 100% |
| 2 | Drenagem Pluvial | valas, tubos, cotas, declividade, reaterro, compactação e lançamento | 74% |
| 3 | Rede de Água | rede PEAD, setores, ramais, cavaletes, testes e lotes atendidos | 41% |
| 4 | Rede Elétrica | postes, cabos, transformadores, projeto e ligação Coelba | 16% |
| 5 | Pavimentação | base, colchão, pedras, m², meio-fio, perdas e trechos liberados | 4% |
| 6 | Praças | área social, piso, mobiliário, equipamentos e acabamento | 0% |
| 7 | Arborização | áreas verdes, mudas, irrigação, proteção e manutenção | 0% |

A ordem é uma referência de dependência. Ela não significa que a inteligência autoriza uma frente apenas porque ela está acima ou possui percentual maior.

## 3. Literatura operacional das etapas

### 3.1 Terraplanagem — preparar o lugar

**Compreensão da inteligência:** a terraplanagem transforma o terreno em uma base com forma, cota e capacidade para receber as redes e as vias.

**O usuário informa:** frente ou trecho, máquina utilizada, horas, viagens, volume em m³, corte/aterro, cota conferida e imagens.

**Requisições que podem surgir:** medição complementar, conferência topográfica, equipamento, material de aterro, ensaio ou liberação de um novo trecho.

**Não libera automaticamente:** o encerramento só é reconhecido quando a medição e a evidência do greide estiverem disponíveis.

### 3.2 Drenagem Pluvial — conduzir a água

**Compreensão da inteligência:** a drenagem precisa receber a água, conduzi-la e devolvê-la com segurança, sem abrir uma dependência para os lotes ou para a rua.

**Atividades iniciais:** assentar a rede do trecho e depois reaterrar e compactar.

**O usuário informa:** extensão, cota, declividade, tubo ou manilha, berço, juntas, reaterro, compactação, inspeção, máquina, equipe e destino da água.

**Materiais compreendidos:** tubos/manilhas, brita, areia, concreto, aço, caixas, grelhas, tampões, geotêxtil, enrocamento e dissipadores quando previstos.

**Regra de propagação:** sem inspeção e compactação comprovadas, a inteligência mantém o trecho pendente e não libera a pavimentação dele.

### 3.3 Rede de Água — atender os lotes

**Compreensão da inteligência:** a rede de água é uma infraestrutura setorizada. O sistema acompanha o que foi comprado, o que foi instalado, o que foi testado e quantos dos 298 lotes estão realmente atendidos.

**Atividades iniciais:** rede principal PEAD, ramais e cavaletes, teste e liberação do setor.

**Materiais compreendidos:** tubos PEAD por diâmetro e classe, conexões, ramais, cavaletes, registros, válvulas, caixas, hidrômetros ou esperas, areia de envoltória e fita de advertência.

**Regra de propagação:** teste, lavagem/desinfecção, fotos e aceite do setor são o marco que permite preparar a pavimentação correspondente.

**Atenção:** estoque de tubos ou cavaletes não significa atendimento dos 298 lotes. A inteligência mantém separadas quantidade disponível, quantidade instalada e lotes atendidos.

### 3.4 Rede Elétrica — preparar e ligar com a concessionária

**Compreensão da inteligência:** a rede elétrica possui uma parte executada pela equipe e uma parte externa, dependente da Neoenergia Coelba.

**Atividades iniciais:** implantar postes disponíveis; depois lançar cabos e preparar transformadores.

**Materiais compreendidos:** postes, estruturas, cabos, ferragens, transformadores, proteção, dutos, caixas, luminárias, braços, quadros e aterramento.

**Estados que não podem ser confundidos:**

```text
projeto aprovado
→ material homologado
→ montagem física
→ dossiê e as-built
→ vistoria/incorporação
→ ligação e energização
```

Montar postes não significa que a ligação foi feita. A inteligência acompanha protocolo, prazo externo, vistoria e correções da Coelba como pendências próprias.

### 3.5 Pavimentação — transformar o setor em via utilizável

**Compreensão da inteligência:** a pavimentação só começa quando as redes enterradas e a base do setor foram liberadas.

**Atividades iniciais:** preparar a base; assentar pavimento e meio-fio.

**Materiais compreendidos:** base e sub-base, areia ou pó de pedra, paralelepípedos, água, meio-fio, peças de ajuste e sinalização temporária.

**Referência de produção:** 5.000 pedras por caminhão e 45 pedras por m².

```text
5.000 pedras ÷ 45 pedras por m² = 111,11 m² por caminhão
```

Esse valor é teórico. A inteligência desconta perdas e compara pedras recebidas, produção medida, equipe, trecho liberado e caixa. O resultado físico é registrado em m² por trecho.

### 3.6 Praças — entregar a área social

**Compreensão da inteligência:** a área social deve ser construída em um local estável, com circulação, drenagem, acessibilidade e manutenção previstas.

**Materiais compreendidos:** piso externo, concreto, agregados, mobiliário, equipamentos, iluminação, irrigação e itens de acabamento.

**Regra:** a inteligência evita agendar acabamento enquanto máquinas e tráfego pesado puderem danificar o espaço.

### 3.7 Arborização — formar o ambiente

**Compreensão da inteligência:** arborização é plantio mais manutenção, e não apenas compra de mudas.

**Materiais e cuidados:** mudas, terra vegetal, corretivos, cobertura morta, tutores, protetores, irrigação e reposição.

**Regra:** o mapa de plantio deve considerar rede elétrica, postes, acessos, visibilidade, calçadas, áreas verdes e crescimento futuro da copa.

## 4. Como nascem as requisições

Uma requisição não é um pedido genérico. Ela apresenta a causa e o contexto para que a equipe possa agir.

### Requisição de material

Surge quando a quantidade disponível ou recebida não cobre a próxima atividade.

```text
atividade + localidade + quantidade necessária - estoque/pedidos
→ material faltante + data necessária + custo de referência
```

### Requisição de compra

É a organização do material faltante em uma compra sugerida. Ela deve indicar etapa, atividade, unidade, quantidade, valor, prazo de chegada, motivo e estado da aprovação.

Compra sugerida não é compra aprovada. A aprovação continua humana.

### Requisição de caixa

É criada quando existe uma necessidade operacional, mas o caixa disponível acima da reserva não cobre a provisão. Ela explica qual atividade, material, valor e prazo estão aguardando recurso.

### Requisição de evidência

Surge quando o registro informa avanço, mas ainda falta foto, ensaio, certificado, romaneio, aceite ou justificativa. Enquanto a evidência não chega, a inteligência mantém a pendência visível.

### Requisição de agenda

Organiza uma atividade somente quando dependências, material, pessoal, localidade e caixa permitem encaixe. O item deve mostrar data, responsável, etapa, atividade e causa do agendamento.

### Requisição de completude

É uma pergunta para completar a compreensão do fato. Exemplos: “qual foi a unidade?”, “em qual trecho?”, “qual foi a quantidade?”, “qual comprovante?” ou “qual etapa foi afetada?”.

## 5. Caixa: a fonte financeira da operação

O caixa é a fonte que mede a capacidade de provisão, mas não substitui a medição física.

```text
caixa disponível para provisão
= entradas - saídas - compromissos - reserva mínima
```

Quando o caixa muda, a inteligência reavalia materiais, compras, agendas e necessidades das etapas. Se o saldo ficar negativo ou abaixo da reserva, ela cria alerta e pode bloquear novas provisões.

### Quem pode alterar

| Perfil | Responsabilidade |
|---|---|
| Dono | lançar e corrigir entradas, saídas, estornos e compromissos |
| Administrador | calibrar regras, etapas, requisitos, orçamentos e notificações |
| Encarregado | registrar fatos da execução, produção, diário e evidências |
| Inteligência | recalcular, explicar, organizar requisições e notificar |

Todo lançamento precisa de natureza, valor, data, origem, categoria e descrição. O comprovante deve permanecer ligado ao lançamento.

## 6. Como registrar um fato de campo

1. Escolha a etapa.
2. Escolha a atividade.
3. Marque a localidade: frente, setor, trecho, quadra, via ou área social.
4. Informe quantidade e unidade.
5. Informe responsável, equipe, máquina e data/hora quando aplicável.
6. Escreva o que foi observado.
7. Anexe foto, certificado, ensaio, romaneio ou comprovante.
8. Confirme o envio.

Um bom registro responde: **o quê, onde, quanto, quando, quem e como foi comprovado**.

## 7. O que a inteligência pode e não pode fazer

### Pode fazer automaticamente

- conferir a completude de um registro;
- relacionar uma atividade com sua etapa e localidade;
- recalcular materiais, dependências, agenda e cobertura;
- criar pendência, pedido sugerido e notificação;
- identificar que uma etapa seguinte ainda está bloqueada;
- preparar relatório, snapshot e explicação.

### Precisa de confirmação humana

- reserva de lote;
- desconto, proposta ou mudança de condição comercial;
- contrato;
- compra ou pagamento, conforme a autoridade definida;
- aceitação de documento ou evidência como marco oficial;
- ligação e aceite externo da Coelba;
- alteração de caixa por pessoa não autorizada.

## 8. Como interpretar uma notificação

Leia sempre cinco partes:

```text
fato observado
→ regra relacionada
→ consequência
→ ação sugerida
→ pessoa responsável
```

Exemplo:

```text
Rede de água do Setor 02 foi testada.
Regra: água aceita libera a pavimentação do mesmo setor.
Consequência: base pode entrar em verificação.
Ação sugerida: conferir greide e material da base.
Responsável: encarregado da frente de pavimentação.
```

Uma notificação crítica, como caixa abaixo da reserva, material essencial faltante ou prazo Coelba próximo, deve ser tratada antes das tarefas que dependem dela.

## 9. Glossário da operação inteligente

| Termo | Leitura para o usuário |
|---|---|
| Aceite | confirmação de que o trecho ou requisito foi conferido |
| Agenda | atividade organizada em uma data e localidade possíveis |
| As-built | desenho do que foi realmente executado |
| Atividade | ação concreta dentro de uma etapa |
| Bloqueio | condição que impede a execução ou o reconhecimento do avanço |
| Caixa provisionável | dinheiro que pode ser considerado depois de compromissos e reserva |
| Cavalete | conjunto de entrada/medição de água do lote |
| Cobertura | quanto da necessidade de material ou atendimento já está disponível |
| Completude | quantidade de informações necessárias para compreender um fato |
| Dependência | relação que precisa ser atendida antes de outra atividade |
| Evidência | documento, foto, ensaio, medida ou aceite que sustenta o registro |
| Frente | local de trabalho onde uma equipe atua |
| Greide | cota e forma projetada da superfície da via ou terreno |
| Localidade | identificação física do lugar da atividade |
| Metadescrição | explicação da etapa ou atividade usada pela inteligência |
| Pedido de caixa | solicitação de recurso financeiro associada a uma necessidade |
| Perda | diferença prevista entre material recebido e material aproveitado |
| Propagação | atualização das atividades e painéis relacionados após um fato |
| Requisição | pedido contextualizado que precisa de resposta da operação |
| Setor | parte organizada do loteamento usada para executar e liberar redes |
| Trecho | segmento físico medido de uma via ou rede |
| Unidade de produção | medida que torna o avanço comparável, como m³, m, m², viagem ou unidade |
| Vistoria Coelba | inspeção externa necessária para a ligação/incorporação elétrica |

## 10. A inteligência por trás do sistema

Quando o sistema precisa reavaliar a obra, o Worker envia o estado completo e o novo fato ao endpoint NVIDIA configurado. A inteligência recebe as descrições das etapas, peculiaridades, requisitos, evidências, localidades, materiais, caixa e pessoal.

Ela devolve:

- a interpretação do evento aplicado;
- a situação completa atualizada;
- atividades possíveis e bloqueadas;
- agenda possível;
- requisições de material, recurso e caixa;
- notificações;
- explicação dos campos usados e da consequência.

O sistema valida essa resposta antes de propagar a mudança. Se a resposta não trouxer todas as etapas, atividades e relações necessárias, a transição não deve ser aceita como planejamento válido.

### 10.1 Como o mapa entra na compreensão

O mapa não serve apenas para mostrar o loteamento. Ele ajuda a indicar onde uma atividade acontece e quais dados precisam ser considerados. A base publicada usa SIRGAS 2000 / UTM zona 24S (EPSG:31984), com 298 lotes, vias resumidas, linhas de meio-fio/calçada e pontos de infraestrutura.

Ao selecionar ou registrar uma área, o sistema deve organizar a compreensão nesta ordem:

| Pergunta | O que a inteligência procura |
|---|---|
| Onde? | lote, quadra, trecho, via, área social ou ponto de infraestrutura |
| O quê? | etapa e atividade relacionada ao local |
| Quanto? | área, extensão, volume ou outra unidade de produção disponível |
| Com o quê? | materiais, equipamentos, pessoal e formação da equipe |
| Em quais condições? | requisitos de entrada, dependências, caixa, evidências e restrições |
| O que confirma? | medida, foto, documento, comprovante ou aceite humano |

O mapa pode sugerir uma relação, mas não confirma sozinho uma execução. O manifesto atual publica centro, área e qualidade de alinhamento dos lotes; não se deve inventar vértices, perímetros ou comprimentos de vias quando esses dados não estiverem disponíveis. Para a regra completa usada pelos endpoints, consulte o [RFC-AP-0002 — Contrato de compreensão operacional por base cartográfica](rfc-compreensao-operacional-dwg.md).

## 11. Regra final de uso

Alimente o sistema com fatos pequenos, completos e localizados. Uma foto sem trecho, uma quantidade sem unidade ou um “concluído” sem evidência não oferece compreensão suficiente para a inteligência.

Quanto melhor o fato, melhor a requisição. Quanto melhor a requisição, mais claro fica o próximo passo da obra.
