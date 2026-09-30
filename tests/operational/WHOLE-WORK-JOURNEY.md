# Bateria incremental da obra inteira

Objetivo: demonstrar a compreensão operacional passo a passo desde um loteamento
com caixa zero, estoque zero e todas as atividades pendentes até 100% de conclusão.

Cada checkpoint executa:

1. exatamente um fato novo;
2. reducer factual;
3. eventual fechamento de etapa pelo MiniCPM;
4. inferência global da obra pelo MiniCPM/OpenJEV;
5. construção derivada de agenda/notificação;
6. resposta conversacional NVIDIA explicando o ESTADO ATUAL DA OBRA e, em seguida, o PRÓXIMO PASSO;
7. assertions;
8. registro do transcript em `test-results/whole-work-journey-*.json`.

A sequência repete, para cada atividade principal:

- aporte de caixa;
- compra sem presumir recebimento;
- recebimento individual de cada material;
- construção/validação da agenda;
- atribuição da equipe;
- aceite;
- início;
- relato de progresso;
- envio da evidência;
- verificação;
- confirmação física;
- fechamento da etapa quando aplicável;
- explicação conversacional do próximo passo.

A obra demonstrativa contém:

- Preparação e topografia;
- Terraplanagem;
- Rede de água principal;
- Ramais e cavaletes dos 298 lotes;
- Drenagem;
- Rede elétrica;
- Base/meio-fio da pavimentação;
- Pavimentação asfáltica;
- Praça central;
- Paisagismo, sinalização e entrega.

## Execução

```powershell
$env:BELAVISTA_OPENJEV_LIVE='1'
$env:BELAVISTA_CONVERSATION_LIVE='1'
$env:BELAVISTA_WORKER_URL='https://SEU-WORKER'
$env:BELAVISTA_ADMIN_ID_TOKEN='<token vigente>'

npm run test:operational:obra:jornada
```

Também pode usar `BELAVISTA_API_TOKEN` no lugar do Firebase ID token.

Por padrão a bateria é estrita: o System Model precisa acertar `nextActivity`,
`nextAction`, agenda e notificação nos checkpoints definidos. Para diagnóstico
sem abortar por divergência semântica:

```powershell
$env:BELAVISTA_JOURNEY_STRICT='0'
npm run test:operational:obra:jornada
```

O relatório completo fica em `test-results/`.

## Contrato conversacional

Em cada checkpoint, a NVIDIA deve responder com `ESTADO ATUAL DA OBRA:` e depois `PRÓXIMO PASSO:`. O MiniCPM continua sendo a autoridade da decisão operacional; a NVIDIA explica o estado e traduz a decisão em linguagem natural.
