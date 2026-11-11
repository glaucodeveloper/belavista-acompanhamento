import React, { useState } from 'react';

const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateText = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : 'Não informada';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const emptyPart = () => ({ mode: 'amount', input: '' });
const parts = [['broker', 'Corretagem'], ['stand', 'Stand'], ['iptu', 'IPTU'], ['tax', 'Imposto']];

export const newLotEntry = () => ({ type: 'signal', amount: '', date: today(), description: '', installment: '', brokerName: '', distribution: Object.fromEntries(parts.map(([key]) => [key, emptyPart()])) });
function partAmount(part, base) {
  const value = Number(part?.input || 0);
  return round(part?.mode === 'percent' ? Number(base || 0) * value / 100 : value);
}
function validatePart(part) {
  const value = Number(part?.input || 0);
  return Number.isFinite(value) && value >= 0 && (part?.mode !== 'percent' || value <= 100);
}

export function AmountPercentField({ label, base, part, onChange }) {
  const current = part || emptyPart();
  const amount = current.mode === 'percent' ? (current.input === '' ? '' : partAmount(current, base).toFixed(2)) : current.input;
  return <fieldset className="amount-percent-field"><legend>{label}</legend><label>Valor (R$)<input aria-label={`${label} em reais`} type="number" min="0" step="0.01" value={amount} onChange={event => onChange({ mode: 'amount', input: event.target.value })} placeholder="0,00" /></label><label>Percentual (%)<input aria-label={`${label} em percentual`} type="number" min="0" max="100" step="0.01" value={current.mode === 'percent' ? current.input : ''} onChange={event => onChange({ mode: 'percent', input: event.target.value })} placeholder="Opcional" /></label></fieldset>;
}

export function LotEntryFields({ entry, onChange }) {
  const base = Number(entry.amount || 0);
  const assigned = parts.reduce((sum, [key]) => sum + partAmount(entry.distribution[key], base), 0);
  return <div className="entry-fields"><h3>Registrar entrada</h3><div className="form-grid"><label>Tipo de entrada<select value={entry.type} onChange={event => onChange({ ...entry, type: event.target.value })}><option value="signal">Sinal</option><option value="installment">Parcela</option></select></label>{entry.type === 'installment' && <label>Número da parcela<input type="number" min="1" step="1" value={entry.installment} onChange={event => onChange({ ...entry, installment: event.target.value })} /></label>}<label>Valor recebido<input type="number" min="0" step="0.01" value={entry.amount} onChange={event => onChange({ ...entry, amount: event.target.value })} placeholder="0,00" /></label><label>Data<input type="date" value={entry.date} onChange={event => onChange({ ...entry, date: event.target.value })} /></label><label>Corretor<input value={entry.brokerName} onChange={event => onChange({ ...entry, brokerName: event.target.value })} placeholder="Nome do corretor" /></label><label>Descrição<input value={entry.description} onChange={event => onChange({ ...entry, description: event.target.value })} placeholder="Observação da entrada" /></label></div><div className="allocation-fields">{parts.map(([key, label]) => <AmountPercentField key={key} label={label} base={base} part={entry.distribution[key]} onChange={part => onChange({ ...entry, distribution: { ...entry.distribution, [key]: part } })} />)}</div><p className="allocation-summary">Distribuído: <strong>{money(assigned)}</strong> · Saldo: <strong>{money(round(base - assigned))}</strong></p><small>Digite o valor ou o percentual sobre esta entrada em cada destino.</small></div>;
}

export function materializeLotEntry(entry) {
  if (!String(entry.amount || '').trim()) return null;
  const amount = Number(entry.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor recebido maior que zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')) throw new Error('Informe a data da entrada.');
  if (!['signal', 'installment'].includes(entry.type)) throw new Error('Selecione sinal ou parcela.');
  if (entry.installment && (!Number.isInteger(Number(entry.installment)) || Number(entry.installment) < 1)) throw new Error('Informe um número de parcela válido.');
  if (parts.some(([key]) => !validatePart(entry.distribution[key]))) throw new Error('Informe valores e percentuais válidos entre zero e 100%.');
  const distribution = Object.fromEntries(parts.map(([key]) => { const part = entry.distribution[key]; return [key, { amount: partAmount(part, amount), percent: part.mode === 'percent' && part.input !== '' ? Number(part.input) : null }]; }));
  const total = Object.values(distribution).reduce((sum, item) => sum + item.amount, 0);
  if (round(total) > round(amount)) throw new Error('A soma dos destinos não pode superar o valor recebido.');
  return { id: crypto.randomUUID(), type: entry.type, amount: round(amount), date: entry.date, description: entry.description.trim(), installment: entry.type === 'installment' && entry.installment ? Number(entry.installment) : null, brokerName: entry.brokerName.trim(), distribution };
}

export function periodKey(value, mode) {
  const date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(`${date}T12:00:00`).getTime())) return 'undated';
  return mode === 'semester' ? `${date.slice(0, 4)}-S${Number(date.slice(5, 7)) <= 6 ? 1 : 2}` : date.slice(0, 7);
}
export function periodLabel(key, mode) {
  if (key === 'undated') return 'Sem data';
  if (!key || key === 'all') return 'Todos os períodos';
  if (mode === 'semester') return `${key.endsWith('S1') ? '1º' : '2º'} semestre de ${key.slice(0, 4)}`;
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 2).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
export function periodSelection(rows, mode, selected) {
  if (mode === 'all') return { options: [], active: 'all' };
  const options = [...new Set(rows.map(row => periodKey(row.date, mode)))].sort((a, b) => a === 'undated' ? 1 : b === 'undated' ? -1 : b.localeCompare(a));
  return { options, active: options.includes(selected) ? selected : options[0] || '' };
}
export function PeriodNavigator({ rows, mode, selected, onMode, onSelect, label = 'Período' }) {
  const { options, active } = periodSelection(rows, mode, selected);
  const index = options.indexOf(active);
  return <div className="period-navigator"><label>{label}<select aria-label={`${label} - agrupamento`} value={mode} onChange={event => { onMode(event.target.value); onSelect(''); }}><option value="all">Todos</option><option value="month">Mensal</option><option value="semester">Semestral</option></select></label>{mode !== 'all' && <div className="period-navigation"><button type="button" className="quiet-button" aria-label="Período anterior" disabled={index < 0 || index === options.length - 1} onClick={() => onSelect(options[index + 1])}>‹</button><label><span className="sr-only">Selecionar período</span><select aria-label={`${label} selecionado`} value={active} onChange={event => onSelect(event.target.value)}>{!options.length && <option value="">Nenhum período</option>}{options.map(key => <option key={key} value={key}>{periodLabel(key, mode)}</option>)}</select></label><button type="button" className="quiet-button" aria-label="Próximo período" disabled={index <= 0} onClick={() => onSelect(options[index - 1])}>›</button></div>}</div>;
}

export function TransferPeriodSummary({ rows, mode }) {
  const grouping = mode === 'semester' ? 'semester' : 'month';
  const groups = new Map();
  for (const row of rows) {
    const period = periodKey(row.date, grouping);
    const category = row.reason === 'signal' ? 'Sinal' : ['installment', 'intermediate', 'monthly'].includes(row.reason) ? 'Parcelas' : 'Não classificado';
    const key = `${period}:${category}`;
    const item = groups.get(key) || { period, category, count: 0, amount: 0, tax: 0, expenses: 0, allocations: 0, net: 0 };
    item.count += 1;
    item.amount += Number(row.amount || 0);
    item.tax += Number(row.taxAmount || 0);
    item.expenses += Number(row.fixedExpenses || 0);
    const allocations = row.automaticLotEntry ? Number(row.allocatedBroker || 0) + Number(row.allocatedOther || 0) : 0;
    item.allocations += allocations;
    item.net += Number(row.amount || 0) - Number(row.taxAmount || 0) - Number(row.fixedExpenses || 0) - allocations;
    groups.set(key, item);
  }
  const items = [...groups.values()].sort((a, b) => b.period.localeCompare(a.period) || a.category.localeCompare(b.category, 'pt-BR'));
  return <section className="transfer-period-summary" aria-label="Distribuição dos repasses por período"><div className="transfer-period-heading"><div><h3>Distribuição por período</h3><p>{grouping === 'semester' ? 'Totais semestrais' : 'Totais mensais'} dos repasses exibidos, separados por sinal e parcelas.</p></div></div>{items.length ? <div className="table-wrap"><table><thead><tr><th>Período</th><th>Origem</th><th>Registros</th><th>Recebido</th><th>Imposto</th><th>Despesas</th><th>Distribuído</th><th>Repasse líquido</th></tr></thead><tbody>{items.map(item => <tr key={`${item.period}:${item.category}`}><td data-label="Período">{periodLabel(item.period, grouping)}</td><td data-label="Origem">{item.category}</td><td data-label="Registros">{item.count}</td><td data-label="Recebido">{money(round(item.amount))}</td><td data-label="Imposto">{money(round(item.tax))}</td><td data-label="Despesas">{money(round(item.expenses))}</td><td data-label="Distribuído">{money(round(item.allocations))}</td><td data-label="Repasse líquido">{money(round(item.net))}</td></tr>)}</tbody></table></div> : <p className="transfer-period-empty">Nenhum repasse no período selecionado.</p>}</section>;
}

export function LotBalanceTable({ lots }) {
  const [mode, setMode] = useState('month'), [selected, setSelected] = useState('');
  const entries = lots.flatMap(lot => (lot.entryHistory || []).map(entry => ({ ...entry, lotLabel: lot.label || 'Lote', quadra: lot.quadra || '' })));
  const { active } = periodSelection(entries, mode, selected);
  const visible = entries.filter(entry => mode === 'all' || (active && periodKey(entry.date, mode) === active)).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const total = visible.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  return <section className="period-balance" aria-label="Balanço das entradas"><header><div><p className="eyebrow">RECEBIMENTOS DOS LOTES</p><h2>Balanço por período</h2><p>Sinais e parcelas registrados na ficha de cada lote.</p></div><PeriodNavigator rows={entries} mode={mode} selected={selected} onMode={setMode} onSelect={setSelected} /></header><div className="period-balance-total"><span>{mode === 'all' ? 'Todos os períodos' : periodLabel(active, mode)}</span><strong>{money(total)}</strong><small>{visible.length} entradas</small></div>{visible.length ? <div className="table-wrap period-balance-table"><table><thead><tr><th>Data</th><th>Lote</th><th>Entrada</th><th>Recebido</th><th>Corretagem</th><th>Stand</th><th>IPTU</th><th>Imposto</th><th>Saldo</th></tr></thead><tbody>{visible.map(entry => { const values = parts.map(([key]) => Number(entry.distribution?.[key]?.amount || 0)); const balance = round(Number(entry.amount || 0) - values.reduce((a, b) => a + b, 0)); return <tr key={entry.id}><td data-label="Data">{dateText(entry.date)}</td><td data-label="Lote">{entry.lotLabel}</td><td data-label="Entrada">{entry.type === 'signal' ? 'Sinal' : entry.type === 'installment' ? `Parcela${entry.installment ? ` ${entry.installment}` : ''}` : 'Não classificada'}</td><td data-label="Recebido">{money(entry.amount)}</td>{values.map((value, index) => <td key={parts[index][0]} data-label={parts[index][1]}>{money(value)}</td>)}<td data-label="Saldo">{money(balance)}</td></tr>; })}</tbody></table></div> : <p className="period-balance-empty">Nenhuma entrada registrada neste período.</p>}</section>;
}

export function TransferEditor({ row, isNew, lots, reasons, busy, error, onCancel, onSubmit }) {
  const [draft, setDraft] = useState(() => ({ ...row, reason: row.reason || 'signal', date: row.date || today() }));
  const [tax, setTax] = useState(() => row.taxPercent != null ? { mode: 'percent', input: String(row.taxPercent) } : { mode: 'amount', input: row.taxAmount == null ? '' : String(row.taxAmount) });
  const [validation, setValidation] = useState('');
  const amount = Number(draft.amount || 0), taxValue = partAmount(tax, amount), expenses = Number(draft.fixedExpenses || 0);
  const net = round(amount - taxValue - expenses);
  function submit(event) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0 || !validatePart(tax) || !Number.isFinite(expenses) || expenses < 0 || net < 0) { setValidation('Confira os valores: imposto e despesas não podem superar a entrada.'); return; }
    setValidation('');
    onSubmit({ ...draft, amount: round(amount), commissionPercent: Number(draft.commissionPercent), taxAmount: taxValue, taxPercent: tax.mode === 'percent' && tax.input !== '' ? Number(tax.input) : null, fixedExpenses: round(expenses), netTransfer: net });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}><form className="record-form transfer-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-modal-title" onSubmit={submit}><div className="form-heading"><div><p className="eyebrow">REPASSE</p><h3 id="transfer-modal-title">{isNew ? 'Adicionar repasse' : 'Editar repasse'}</h3></div><button type="button" className="quiet-button" disabled={busy} onClick={onCancel}>Fechar</button></div><div className="form-grid"><label>Corretor<input required value={draft.broker || ''} onChange={event => setDraft({ ...draft, broker: event.target.value })} /></label><label>Lote<select required value={draft.lotLabel || ''} onChange={event => setDraft({ ...draft, lotLabel: event.target.value })}><option value="">Selecione o lote</option>{lots.map(lot => <option value={lot.label} key={lot.id}>{lot.label} · {lot.quadra}</option>)}</select></label><label>Tipo da entrada<select value={draft.reason} onChange={event => setDraft({ ...draft, reason: event.target.value })}>{reasons.map(reason => <option value={reason.id} key={reason.id}>{reason.label}</option>)}</select></label><label>Data<input required type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label><label>Entrada recebida<input required type="number" min="0.01" step="0.01" value={draft.amount ?? ''} onChange={event => setDraft({ ...draft, amount: event.target.value })} /></label><label>Comissão do corretor (%)<input required type="number" min="0" max="100" step="0.01" value={draft.commissionPercent ?? ''} onChange={event => setDraft({ ...draft, commissionPercent: event.target.value })} /></label><AmountPercentField label={draft.reason === 'signal' ? 'Imposto do sinal' : 'Imposto da parcela'} base={amount} part={tax} onChange={setTax} /><label>Despesas fixas (R$)<input type="number" min="0" step="0.01" value={draft.fixedExpenses ?? ''} onChange={event => setDraft({ ...draft, fixedExpenses: event.target.value })} /></label></div><p className="transfer-net">Entrada {money(amount)} − imposto {money(taxValue)} − despesas {money(expenses)} = <strong>Repasse líquido {money(net)}</strong></p>{(validation || error) && <p className="error-message" role="alert">{validation || error}</p>}<div className="form-actions"><button type="button" className="quiet-button" disabled={busy} onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar repasse'}</button></div></form></div>;
}
