# Aliança Park — testes reais v2

Há quatro camadas:

1. `source-contract.test.mjs`: contrato estático do Worker atual.
2. `mock-domain.test.mjs`: referência de domínio com todos os mocks presumidos; não acessa rede.
3. `mock-worker-contract.test.mjs`: Worker de referência + NVIDIA/GitHub/Firebase/Auth em memória; não acessa rede.
4. `live-*.test.mjs`: chamadas reais ao Worker/Hosting/Firebase quando as variáveis necessárias existem.

O mock não usa prioridade numérica para ordenar ou liberar atividades. `priority` existe propositalmente nos fixtures apenas para provar que um valor enorme não atravessa quesitos.

Regra de pessoal: `person.localityId === activity.localityId`. Transferência entre localidades não existe por inferência; se for necessária, deve ser um evento/configuração explícita fora do scheduler.
