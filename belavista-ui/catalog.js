import { allocateByPriority, can, createBelavistaEvent, formatBRL } from './src/system.js';
import './src/components.js';

const stages = [
  { key: 'projeto', name: 'Projeto executivo', progress: 72, priority: 100, budgetCents: 1100000, dependsOn: [], materials: ['Compatibilização de redes', 'Liberações'] },
  { key: 'terra', name: 'Terraplanagem', progress: 68, priority: 94, budgetCents: 42000000, dependsOn: ['projeto'], materials: ['Pá carregadeira', 'Escavadeira', 'Patrol'] },
  { key: 'agua', name: 'Rede de água', progress: 12, priority: 76, budgetCents: 18000000, dependsOn: ['terra'], materials: ['Tubos PEAD', 'Cavaletes', 'Ramais'] },
  { key: 'pavimento', name: 'Pavimentação', progress: 0, priority: 40, budgetCents: 32000000, dependsOn: ['agua'], materials: ['Paralelepípedo', 'Areia', 'Meio-fio'] }
];
const result = allocateByPriority({ cashCents: 4800000, reserveCents: 2000000, dependencyProgress: 100, stages });
const sequence = result.stages.map((stage, index) => ({ label: stage.name, kicker: `ETAPA ${String(index + 1).padStart(2, '0')} / ${String(result.stages.length).padStart(2, '0')}` }));
const toStageCard = (stage, index) => ({ ...stage, index, sequence, materials: stages.find(item => item.key === stage.key)?.materials || [] });
const stageDemo = document.querySelector('#stage-demo');
stageDemo.stage = toStageCard(result.stages[1], 1);
stageDemo.addEventListener('belavista-stage-page-change', event => { const index = event.detail.index; stageDemo.stage = toStageCard(result.stages[index], index); });

const ledger = document.querySelector('#ledger-demo');
ledger.columns = [{ key: 'id', label: 'ID', mono: true }, { key: 'natureza', label: 'Natureza' }, { key: 'etapa', label: 'Etapa' }, { key: 'valor', label: 'Valor', mono: true }, { key: 'situacao', label: 'Situação', status: true }];
ledger.rows = [
  { id: 'CX-0041', natureza: 'Entrada', etapa: 'Geral', valor: formatBRL(48000), situacao: 'confirmado' },
  { id: 'OB-0128', natureza: 'Alocação', etapa: 'Terraplanagem', valor: formatBRL(28000), situacao: 'parcial' },
  { id: 'MT-0284', natureza: 'Compra', etapa: 'Rede de água', valor: formatBRL(12750), situacao: 'planejado' }
];

const chat = document.querySelector('#chat-demo');
chat.messages = [{ role: 'assistant', text: 'Olá. Posso registrar a medição da frente ou solicitar comprovantes.' }, { role: 'user', text: 'A patrol concluiu a regularização da Rua L.' }];
chat.suggestions = ['Registrar produção', 'Anexar comprovante', 'Ver prioridade'];
chat.addEventListener('belavista-send', event => { chat.messages = [...chat.messages, { role: 'user', text: event.detail.text }, { role: 'assistant', text: 'Fato recebido. Vou vincular a etapa e solicitar a confirmação necessária.' }]; });
chat.addEventListener('belavista-suggestion', event => { chat.messages = [...chat.messages, { role: 'user', text: event.detail.suggestion.label || event.detail.suggestion }]; });

const output = document.querySelector('#system-output');
output.textContent = JSON.stringify({
  authority: { ownerCanMoveCash: can('owner', 'cash:write'), adminCanCalibrate: can('admin', 'calibration:write'), foremanCanMoveCash: can('foreman', 'cash:write') },
  allocation: result.stages.map(stage => ({ stage: stage.name, state: stage.state, coverage: `${stage.coverage}%`, allocated: formatBRL(stage.allocatedCents / 100), blockedBy: stage.blockedBy }))
}, null, 2);

document.querySelector('#theme-toggle').addEventListener('belavista-action', () => { const root = document.documentElement; root.dataset.belavistaTheme = root.dataset.belavistaTheme === 'light' ? 'dark' : 'light'; });
document.querySelector('#event-button').addEventListener('belavista-action', () => { const event = createBelavistaEvent('library.demo.triggered', { source: 'catalog' }, { role: 'admin', name: 'Aliança Park' }); output.textContent = `${output.textContent}\n\nEVENTO\n${JSON.stringify(event, null, 2)}`; });
