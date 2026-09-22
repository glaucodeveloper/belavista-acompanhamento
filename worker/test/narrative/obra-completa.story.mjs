import {
  obraInteiraParaFazer,planejar,confirmar,diario,entrada,
  solicitarCompras,receberComprasDaAtividade,pedidosDaAtividade,
  titulo,explicar,esperar,assert,dinheiro
} from './story-tools.mjs';

let obra=obraInteiraParaFazer();

// ─────────────────────────────────────────────────────────────────────────────
// CAPÍTULO 1 — A obra existe inteira, mas ainda não há liberação de campo.
// ─────────────────────────────────────────────────────────────────────────────
titulo('1. OBRA INTEIRA PARA FAZER — SEM CAIXA, SEM ESTOQUE, SEM LIBERAÇÕES');
let relatorio=planejar(obra);
explicar(relatorio);
esperar(relatorio.blocked.some(item=>item.stageId==='terraplanagem'&&item.type==='stage-gate'),'Terraplanagem deve esperar a conferência topográfica.');
assert.equal(relatorio.uiState.phase,'planning');

// A primeira transformação não é financeira: é um quesito técnico.
obra=confirmar(obra,'terraplanagem','topografia-base');
relatorio=planejar(obra);
titulo('2. TOPOGRAFIA CONFIRMADA — TERRAPLANAGEM PODE SER CONFERIDA MESMO SEM CAIXA');
explicar(relatorio);
esperar(relatorio.canDoNow.some(item=>item.id==='terra-conferir-greide'),'A conferência de greide deve estar pronta.');

// O diário do encarregado fecha a primeira etapa e vira estado do software.
obra=diario(obra,{
  stageId:'terraplanagem',activityId:'terra-conferir-greide',progress:100,completed:true,
  evidence:['registro fotográfico do greide','conferência de cotas'],
  notes:'Greide conferido; frentes enterradas podem ser liberadas por inspeção.'
});

// As frentes técnicas são liberadas por seus quesitos próprios.
obra=confirmar(obra,'drenagem','trecho-liberado');
obra=confirmar(obra,'agua','eixo-agua-liberado');
obra=confirmar(obra,'eletrica','projeto-eletrico');

// ─────────────────────────────────────────────────────────────────────────────
// CAPÍTULO 2 — A inteligência conhece as quantidades, mas não inventa caixa.
// ─────────────────────────────────────────────────────────────────────────────
titulo('3. INFRAESTRUTURA LIBERADA — SEM CAIXA, O RETORNO É PEDIDO DE QUANTIDADE E COTAÇÃO');
relatorio=planejar(obra);
explicar(relatorio);
assert.equal(relatorio.uiState.phase,'waiting_cash');
const drenagem=pedidosDaAtividade(relatorio,'drenagem-assentar');
esperar(drenagem.some(item=>item.materialName==='Tubo/manilha de drenagem'&&item.quantity===160),'Deve pedir 160 m de tubo/manilha.');
esperar(drenagem.some(item=>item.materialName==='Brita'&&item.quantity===45),'Deve pedir 45 m³ de brita.');
esperar(relatorio.notifications.some(item=>item.role==='supplies'&&item.id==='NTF-QUOTE-drenagem-assentar'),'Suprimentos deve receber uma cotação mesmo antes de existir caixa.');
esperar(relatorio.notifications.some(item=>item.role==='admin'&&item.id==='NTF-CASH-drenagem-assentar'),'Administração deve receber o valor necessário para liberar a frente.');

// ─────────────────────────────────────────────────────────────────────────────
// CAPÍTULO 3 — Entrada de caixa muda a combinação possível.
// Reserva = R$ 150 mil. Entrada de R$ 200 mil deixa R$ 50 mil provisionáveis.
// Drenagem custa ~R$ 144,1 mil; Água ~R$ 39 mil; Elétrica ~R$ 34,8 mil.
// Água e Drenagem têm importância "unblocker"; entre elas a Água é a barata.
// Elétrica é barata, porém tem importância "infrastructure".
// ─────────────────────────────────────────────────────────────────────────────
obra=entrada(obra,200_000,'Capital para abrir a primeira frente material');
titulo('4. ENTRAM R$ 200 MIL — O SOFTWARE ESCOLHE O QUE CABE SEM QUEBRAR A RESERVA');
relatorio=planejar(obra);
explicar(relatorio);
const escolha=relatorio.fundingChoices.find(item=>item.recommended);
assert.equal(escolha?.activityId,'agua-rede-principal');
esperar(relatorio.procurement.some(item=>item.activityId==='agua-rede-principal'),'Rede principal de água deve gerar provisão de compra.');
esperar(!relatorio.procurement.some(item=>item.activityId==='eletrica-postes'),'Elétrica não deve consumir o caixa reservado antes da frente liberadora escolhida.');

// Pedido de compra é um estado intermediário: ainda não é estoque.
obra=solicitarCompras(obra,relatorio,'agua-rede-principal','2026-09-06');
titulo('5. PEDIDO DE COMPRA EMITIDO — MATERIAL A CAMINHO AINDA NÃO É MATERIAL DISPONÍVEL');
relatorio=planejar(obra);
explicar(relatorio);
const aguaPendente=relatorio.schedule.find(item=>item.id==='agua-rede-principal');
assert.equal(aguaPendente?.status,'conditional_material');
esperar((aguaPendente?.materials||[]).some(item=>item.incoming>0),'A atividade precisa enxergar material em trânsito.');

// Recibo transforma compra em estoque e caixa, depois a atividade fica pronta.
obra=receberComprasDaAtividade(obra,'agua-rede-principal',true);
titulo('6. RECIBO DA COMPRA — ESTOQUE ENTRA, CAIXA SAI, A FRENTE FICA EXECUTÁVEL');
relatorio=planejar(obra);
explicar(relatorio);
esperar(relatorio.canDoNow.some(item=>item.id==='agua-rede-principal'),'Após o recibo, a rede principal de água deve poder iniciar.');

// Diário consome materiais e avança a etapa.
obra=diario(obra,{
  stageId:'agua',activityId:'agua-rede-principal',progress:60,
  evidence:['foto da rede principal PEAD'],
  consumption:[{materialName:'Tubo PEAD',quantity:620,unit:'m'},{materialName:'Conexões PEAD',quantity:72,unit:'un'}],
  notes:'Rede principal concluída; seguir para ramais e cavaletes.'
});
titulo('7. DIÁRIO DE OBRA — O RETORNO DO ENCARREGADO ABRE A PRÓXIMA NECESSIDADE');
relatorio=planejar(obra);
explicar(relatorio);
esperar(relatorio.materialRequests.some(item=>item.activityId==='agua-ramais'),'O avanço deve revelar a próxima necessidade: ramais/cavaletes.');

// O caixa restante não cobre tudo; nova entrada destrava exatamente essa sequência.
obra=entrada(obra,30_000,'Complemento para ramais e cavaletes');
relatorio=planejar(obra);
esperar(relatorio.procurement.some(item=>item.activityId==='agua-ramais'),'Nova entrada deve disparar provisão para ramais/cavaletes.');
obra=solicitarCompras(obra,relatorio,'agua-ramais','2026-09-11');
obra=receberComprasDaAtividade(obra,'agua-ramais',true);
obra=diario(obra,{
  stageId:'agua',activityId:'agua-ramais',progress:90,
  evidence:['foto de ramais'],
  consumption:[{materialName:'Ramais de água',quantity:46,unit:'un'},{materialName:'Cavaletes',quantity:54,unit:'un'}],
  notes:'Ramais e cavaletes concluídos.'
});
relatorio=planejar(obra);
esperar(relatorio.schedule.some(item=>item.id==='agua-testar')&&!relatorio.materialRequests.some(item=>item.activityId==='agua-testar'),'Teste da água deve ser a próxima ação sem nova compra.');
obra=diario(obra,{
  stageId:'agua',activityId:'agua-testar',progress:100,completed:true,
  evidence:['teste da rede','termo de liberação do setor'],
  notes:'Rede testada e setor liberado.'
});

// ─────────────────────────────────────────────────────────────────────────────
// CAPÍTULO 4 — Repetimos o ciclo na drenagem.
// ─────────────────────────────────────────────────────────────────────────────
obra=entrada(obra,150_000,'Capital para drenagem pluvial');
titulo('8. ÁGUA LIBERADA — CAIXA NOVO PERMITE DRENAGEM; NOTIFICAÇÃO VIRA PEDIDO DE COMPRA');
relatorio=planejar(obra);
explicar(relatorio);
esperar(relatorio.procurement.some(item=>item.activityId==='drenagem-assentar'),'Drenagem deve ser provisionada.');
obra=solicitarCompras(obra,relatorio,'drenagem-assentar','2026-09-16');
obra=receberComprasDaAtividade(obra,'drenagem-assentar',true);
obra=diario(obra,{
  stageId:'drenagem',activityId:'drenagem-assentar',progress:80,
  evidence:['foto da vala','foto do assentamento'],
  consumption:[{materialName:'Tubo/manilha de drenagem',quantity:160,unit:'m'},{materialName:'Brita',quantity:45,unit:'m3'}],
  notes:'Assentamento concluído; falta reaterro e compactação.'
});
relatorio=planejar(obra);
esperar(relatorio.procurement.some(item=>item.activityId==='drenagem-compactar'),'A conclusão do assentamento deve revelar a areia da compactação.');
obra=solicitarCompras(obra,relatorio,'drenagem-compactar','2026-09-19');
obra=receberComprasDaAtividade(obra,'drenagem-compactar',true);
obra=diario(obra,{
  stageId:'drenagem',activityId:'drenagem-compactar',progress:100,completed:true,
  evidence:['registro de compactação'],
  consumption:[{materialName:'Areia',quantity:32,unit:'m3'}],
  notes:'Trecho recomposto e conferido.'
});

// O próprio retorno de campo libera os quesitos da pavimentação.
obra=confirmar(obra,'pavimentacao','setor-agua-liberado');
obra=confirmar(obra,'pavimentacao','setor-drenagem-liberado');

// ─────────────────────────────────────────────────────────────────────────────
// CAPÍTULO 5 — Últimas infraestruturas e pavimentação.
// A história não tenta fazer tudo de uma vez: cada entrada/recibo/diário muda o estado.
// ─────────────────────────────────────────────────────────────────────────────
obra=entrada(obra,80_000,'Capital para infraestrutura final');
titulo('9. REDES ENTERRADAS LIBERADAS — ELÉTRICA E PAVIMENTAÇÃO PASSAM A DISPUTAR RECURSOS REAIS');
relatorio=planejar(obra);
explicar(relatorio);
esperar(relatorio.fundingChoices.some(item=>item.activityId==='eletrica-postes'),'Elétrica deve aparecer como possibilidade.');
esperar(relatorio.fundingChoices.some(item=>item.activityId==='pav-base'),'Pavimentação deve aparecer como possibilidade após liberações.');

// Executa postes primeiro: custo menor e frente disponível no momento.
if(relatorio.procurement.some(item=>item.activityId==='eletrica-postes')){
  obra=solicitarCompras(obra,relatorio,'eletrica-postes','2026-09-24');
  obra=receberComprasDaAtividade(obra,'eletrica-postes',true);
}
obra=diario(obra,{
  stageId:'eletrica',activityId:'eletrica-postes',progress:55,
  evidence:['posição dos postes','conferência de projeto'],
  consumption:[{materialName:'Poste',quantity:24,unit:'un'}],
  notes:'Postes implantados.'
});

// Cabos/transformador exigem outra janela financeira.
obra=entrada(obra,80_000,'Cabos e transformador');
relatorio=planejar(obra);
esperar(relatorio.procurement.some(item=>item.activityId==='eletrica-cabos'),'Cabos/transformador devem virar provisão completa, sem compra parcial incoerente.');
obra=solicitarCompras(obra,relatorio,'eletrica-cabos','2026-10-03');
obra=receberComprasDaAtividade(obra,'eletrica-cabos',true);
obra=diario(obra,{
  stageId:'eletrica',activityId:'eletrica-cabos',progress:100,completed:true,
  evidence:['registro de ligação'],
  consumption:[{materialName:'Cabo elétrico',quantity:1700,unit:'m'},{materialName:'Transformador',quantity:1,unit:'un'}],
  notes:'Rede elétrica concluída.'
});

// Pavimentação: base, depois assentamento.
obra=entrada(obra,200_000,'Pavimentação do setor liberado');
relatorio=planejar(obra);
esperar(relatorio.procurement.some(item=>item.activityId==='pav-base'),'Base deve ser comprável após caixa e liberações.');
obra=solicitarCompras(obra,relatorio,'pav-base','2026-10-06');
obra=receberComprasDaAtividade(obra,'pav-base',true);
obra=diario(obra,{
  stageId:'pavimentacao',activityId:'pav-base',progress:45,
  evidence:['compactação da base'],
  consumption:[{materialName:'Base/Brita graduada',quantity:380,unit:'m3'}],
  notes:'Base preparada.'
});
relatorio=planejar(obra);
esperar(relatorio.procurement.some(item=>item.activityId==='pav-assentar'),'Assentamento deve aparecer depois da base.');
obra=solicitarCompras(obra,relatorio,'pav-assentar','2026-10-13');
obra=receberComprasDaAtividade(obra,'pav-assentar',true);
obra=diario(obra,{
  stageId:'pavimentacao',activityId:'pav-assentar',progress:100,completed:true,
  evidence:['medição de área executada','liberação das redes enterradas'],
  consumption:[{materialName:'Paralelepípedo',quantity:2400,unit:'m2'},{materialName:'Meio-fio',quantity:540,unit:'m'}],
  notes:'Setor pavimentado.'
});

// ─────────────────────────────────────────────────────────────────────────────
// CAPÍTULO 6 — Acabamentos: praça e arborização.
// ─────────────────────────────────────────────────────────────────────────────
obra=confirmar(obra,'pracas','entorno-estavel');
obra=confirmar(obra,'arborizacao','areas-verdes-liberadas');
obra=entrada(obra,50_000,'Praça e arborização');
titulo('10. OBRA PESADA ENCERRADA — ACABAMENTOS SÃO LIBERADOS PELOS QUESITOS DO ENTORNO');
relatorio=planejar(obra);
explicar(relatorio);

for(const activityId of ['praca-implantar','arbor-plantio']){
  relatorio=planejar(obra);
  if(relatorio.procurement.some(item=>item.activityId===activityId)){
    obra=solicitarCompras(obra,relatorio,activityId,'2026-10-20');
    obra=receberComprasDaAtividade(obra,activityId,true);
  }
  if(activityId==='praca-implantar')obra=diario(obra,{stageId:'pracas',activityId,progress:100,completed:true,evidence:['layout conferido','medição da área','registro de acabamento'],consumption:[{materialName:'Piso externo',quantity:420,unit:'m2'}],notes:'Praça concluída.'});
  else obra=diario(obra,{stageId:'arborizacao',activityId,progress:100,completed:true,evidence:['mapa de plantio','registro das mudas','checagem inicial de irrigação'],consumption:[{materialName:'Mudas',quantity:120,unit:'un'}],notes:'Arborização concluída.'});
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPÍTULO FINAL — Não há mais frente a comprar nem agendar.
// ─────────────────────────────────────────────────────────────────────────────
titulo('11. OBRA COMPLETA — O ESTADO FINAL DA UI É DERIVADO DA MESMA NARRATIVA');
relatorio=planejar(obra);
explicar(relatorio);
assert.equal(relatorio.uiState.phase,'completed');
assert.equal(relatorio.uiState.completionPercent,100);
assert.equal(relatorio.schedule.length,0);
assert.equal(relatorio.procurement.length,0);
esperar(relatorio.notifications.some(item=>item.id==='NTF-PROJECT-COMPLETE'),'Administração deve receber a conclusão da obra.');
esperar(relatorio.notifications.some(item=>item.id==='NTF-PROJECT-COMPLETE-FOREMAN'),'Encarregado deve receber o encerramento.');

console.log('\n✓ História ponta a ponta concluída: quesito → caixa → pedido → recibo → estoque → agenda → diário → nova frente → obra completa.');
console.log(`✓ Diários registrados: ${obra.state.fieldReturns.length}`);
console.log(`✓ Movimentos de estoque: ${obra.state.inventoryMovements.length}`);
console.log(`✓ Compras registradas: ${obra.state.purchaseRequests.length}`);
console.log(`✓ Caixa final: ${dinheiro(relatorio.cash.balanceCents)}`);
