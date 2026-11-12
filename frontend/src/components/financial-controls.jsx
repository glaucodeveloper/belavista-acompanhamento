import React, { useMemo, useState } from 'react';

const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateText = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : 'Não informada';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const emptyPart = () => ({ mode: 'amount', input: '' });
const parts = [['broker', 'Corretagem'], ['office', 'Escritório'], ['stand', 'Stand'], ['iptu', 'IPTU'], ['tax', 'Imposto']];
export const defaultLotRules = { broker: 45, office: 0, stand: 8.547, iptu: 3.846, tax: 6.068 };

export const newLotEntry = (rules = defaultLotRules, partnerSettings) => ({ type: 'signal', amount: '', date: today(), description: '', installment: '', brokerName: '', roundWhole: true, distribution: Object.fromEntries(parts.map(([key]) => [key, { mode: 'percent', input: String(rules[key] ?? defaultLotRules[key]), usesRule: true }])), partners: (partnerSettings?.length ? partnerSettings : [{ name: 'Marival', percent: 33.33 }, { name: 'Warley', percent: 33.33 }, { name: 'Jullis', percent: 33.34 }]).map((partner, index) => ({ id: partner.id || crypto.randomUUID(), name: partner.name, part: { mode: 'percent', input: String(partner.percent ?? (index === 2 ? 33.34 : 33.33)) } })) });
function partAmount(part, base, roundWhole = false) {
  const value = Number(part?.input || 0);
  const result = part?.mode === 'percent' ? Number(base || 0) * value / 100 : value;
  return part?.mode === 'percent' && roundWhole ? Math.round(result) : round(result);
}
function validatePart(part) {
  const value = Number(part?.input || 0);
  return Number.isFinite(value) && value >= 0 && (part?.mode !== 'percent' || value <= 100);
}

export function AmountPercentField({ label, base, part, onChange, roundWhole = false }) {
  const current = part || emptyPart();
  const amount = current.mode === 'percent' ? (current.input === '' ? '' : partAmount(current, base, roundWhole).toFixed(2)) : current.input;
  return <fieldset className="amount-percent-field"><legend>{label}</legend><label>Valor (R$)<input aria-label={`${label} em reais`} type="number" min="0" step="0.01" value={amount} onChange={event => onChange({ mode: 'amount', input: event.target.value })} placeholder="0,00" /></label><label>Percentual (%)<input aria-label={`${label} em percentual`} type="number" min="0" max="100" step="0.001" value={current.mode === 'percent' ? current.input : ''} onChange={event => onChange({ mode: 'percent', input: event.target.value })} placeholder="Opcional" /></label></fieldset>;
}

export function LotEntryFields({ entry, onChange }) {
  const base = Number(entry.amount || 0);
  const assigned = parts.reduce((sum, [key]) => sum + partAmount(entry.distribution[key], base, entry.roundWhole), 0);
  const net = round(base - assigned);
  const partners = entry.partners || [];
  const partnerTotal = partners.reduce((sum, partner) => sum + partAmount(partner.part, net, entry.roundWhole), 0);
  return <div className="entry-fields"><h3>Registrar entrada</h3><div className="entry-lead"><label className="entry-amount">Valor recebido (R$)<input type="number" min="0" step="0.01" inputMode="decimal" value={entry.amount} onChange={event => onChange({ ...entry, amount: event.target.value })} placeholder="0,00" /></label><label className="entry-description">Descrição<textarea rows="3" value={entry.description} onChange={event => onChange({ ...entry, description: event.target.value })} placeholder="Descreva a entrada" /></label></div><div className="form-grid"><label>Tipo de entrada<select value={entry.type} onChange={event => onChange({ ...entry, type: event.target.value })}><option value="signal">Sinal</option><option value="installment">Parcela</option></select></label>{entry.type === 'installment' && <label>Número da parcela<input type="number" min="1" step="1" value={entry.installment} onChange={event => onChange({ ...entry, installment: event.target.value })} /></label>}<label>Data<input type="date" value={entry.date} onChange={event => onChange({ ...entry, date: event.target.value })} /></label><label>Corretor<input value={entry.brokerName} onChange={event => onChange({ ...entry, brokerName: event.target.value })} placeholder="Nome do corretor" /></label></div><p>Percentuais iniciais estimados da planilha de sinal, aplicados automaticamente.</p><label><input type="checkbox" checked={!!entry.roundWhole} onChange={event => onChange({ ...entry, roundWhole: event.target.checked })} /> Arredondar valores calculados para reais inteiros</label><div className="allocation-fields">{parts.map(([key, label]) => <AmountPercentField key={key} label={label} base={base} roundWhole={entry.roundWhole} part={entry.distribution[key]} onChange={part => onChange({ ...entry, distribution: { ...entry.distribution, [key]: part } })} />)}</div><p className="allocation-summary">Descontos: <strong>{money(assigned)}</strong> · Saldo para sócios: <strong>{money(net)}</strong></p><h3>Distribuição entre sócios</h3><p>Percentuais definidos em Configurações; aplicados sobre o saldo após os descontos.</p><div className="partner-allocation-summary">{partners.map(partner => <div key={partner.id}><span>{partner.name}<small>{partner.part?.input || 0}%</small></span><strong>{money(partAmount(partner.part, net, entry.roundWhole))}</strong></div>)}</div><p className="allocation-summary">Aos sócios: <strong>{money(partnerTotal)}</strong> · Saldo não distribuído: <strong>{money(round(net - partnerTotal))}</strong></p></div>;
}

export function materializeLotEntry(entry) {
  if (!String(entry.amount || '').trim()) return null;
  const amount = Number(entry.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor recebido maior que zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')) throw new Error('Informe a data da entrada.');
  if (!['signal', 'installment'].includes(entry.type)) throw new Error('Selecione sinal ou parcela.');
  if (entry.installment && (!Number.isInteger(Number(entry.installment)) || Number(entry.installment) < 1)) throw new Error('Informe um número de parcela válido.');
  if (parts.some(([key]) => !validatePart(entry.distribution[key]))) throw new Error('Informe valores e percentuais válidos entre zero e 100%.');
  const distribution = Object.fromEntries(parts.map(([key]) => { const part = entry.distribution[key] || emptyPart(); return [key, { amount: partAmount(part, amount, entry.roundWhole), percent: part.mode === 'percent' && part.input !== '' ? Number(part.input) : null, usesRule: !!part.usesRule }]; }));
  const total = Object.values(distribution).reduce((sum, item) => sum + item.amount, 0);
  if (round(total) > round(amount)) throw new Error('A soma dos destinos não pode superar o valor recebido.');
  const remaining = round(amount - total);
  if ((entry.partners || []).some(p => !p.name.trim() || !validatePart(p.part))) throw new Error('Confira os nomes e valores dos sócios.');
  const partners = (entry.partners || []).map(p => ({ id: p.id, name: p.name.trim(), amount: partAmount(p.part, remaining, entry.roundWhole), percent: p.part.mode === 'percent' && p.part.input !== '' ? Number(p.part.input) : null }));
  if (round(partners.reduce((sum, p) => sum + p.amount, 0)) > remaining) throw new Error('A soma dos repasses aos sócios não pode superar o saldo. Ajuste os valores arredondados.');
  return { id: crypto.randomUUID(), type: entry.type, amount: round(amount), date: entry.date, description: entry.description.trim(), installment: entry.type === 'installment' && entry.installment ? Number(entry.installment) : null, brokerName: entry.brokerName.trim(), distribution, partners, roundWhole: !!entry.roundWhole };
}

export function resolveLotEntry(entry, rules = defaultLotRules) {
  const distribution = Object.fromEntries(parts.map(([key]) => { const item = entry.distribution?.[key] || { amount: 0 }; const usesRule = item.usesRule || (entry.example && item.percent != null); return [key, usesRule ? { ...item, amount: partAmount({ mode: 'percent', input: rules[key] ?? defaultLotRules[key] }, entry.amount, entry.roundWhole ?? true), percent: Number(rules[key] ?? defaultLotRules[key]) } : item]; }));
  const balance = round(Number(entry.amount || 0) - Object.values(distribution).reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const partners = (entry.partners || []).map(partner => partner.percent == null ? partner : { ...partner, amount: partAmount({ mode: 'percent', input: partner.percent }, balance, entry.roundWhole ?? true) });
  return { ...entry, distribution, partners };
}

export function periodKey(value, mode) {
  const date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(`${date}T12:00:00`).getTime())) return 'undated';
  return mode === 'year' ? date.slice(0, 4) : mode === 'semester' ? `${date.slice(0, 4)}-S${Number(date.slice(5, 7)) <= 6 ? 1 : 2}` : date.slice(0, 7);
}
export function periodLabel(key, mode) {
  if (key === 'undated') return 'Sem data';
  if (!key || key === 'all') return 'Todos os períodos';
  if (mode === 'year') return key;
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
  return <div className="period-navigator"><div className="balance-tabs" role="group" aria-label={label + ' - agrupamento'}>{[['all','Todos'],['month','Mensal'],['semester','Semestral'],['year','Anual']].map(([value,title]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => { onMode(value); onSelect(''); }}>{title}</button>)}</div>{mode !== 'all' && <div className="period-navigation"><button type="button" className="quiet-button" aria-label="Período anterior" disabled={index < 0 || index === options.length - 1} onClick={() => onSelect(options[index + 1])}>‹</button><label><span className="sr-only">Selecionar período</span><select aria-label={label + ' selecionado'} value={active} onChange={event => onSelect(event.target.value)}>{!options.length && <option value="">Nenhum período</option>}{options.map(key => <option key={key} value={key}>{periodLabel(key, mode)}</option>)}</select></label><button type="button" className="quiet-button" aria-label="Próximo período" disabled={index <= 0} onClick={() => onSelect(options[index - 1])}>›</button></div>}</div>;
}
export function BalanceTypeTabs({ value, onChange, label = 'Tipo de entrada' }) {
  return <div className="balance-tabs" role="group" aria-label={label}>{[['all','Todas'],['signal','Sinais'],['installment','Parcelas']].map(([id,title]) => <button type="button" key={id} aria-pressed={value === id} onClick={() => onChange(id)}>{title}</button>)}</div>;
}

export function TransferPeriodSummary({ rows, mode }) {
  const grouping = mode === 'semester' ? 'semester' : mode === 'year' ? 'year' : 'month';
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
  return <section className="transfer-period-summary" aria-label="Distribuição dos repasses por período"><div className="transfer-period-heading"><div><h3>Distribuição por período</h3><p>{grouping === 'year' ? 'Totais anuais' : grouping === 'semester' ? 'Totais semestrais' : 'Totais mensais'} dos repasses exibidos, separados por sinal e parcelas.</p></div></div>{items.length ? <div className="table-wrap"><table><thead><tr><th>Período</th><th>Origem</th><th>Registros</th><th>Recebido</th><th>Imposto</th><th>Despesas</th><th>Distribuído</th><th>Repasse líquido</th></tr></thead><tbody>{items.map(item => <tr key={`${item.period}:${item.category}`}><td data-label="Período">{periodLabel(item.period, grouping)}</td><td data-label="Origem">{item.category}</td><td data-label="Registros">{item.count}</td><td data-label="Recebido">{money(round(item.amount))}</td><td data-label="Imposto">{money(round(item.tax))}</td><td data-label="Despesas">{money(round(item.expenses))}</td><td data-label="Distribuído">{money(round(item.allocations))}</td><td data-label="Repasse líquido">{money(round(item.net))}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Total</th><th>{items.reduce((sum, item) => sum + item.count, 0)}</th>{['amount','tax','expenses','allocations','net'].map(key => <th key={key}>{money(round(items.reduce((sum, item) => sum + item[key], 0)))}</th>)}</tr></tfoot></table></div> : <p className="transfer-period-empty">Nenhum repasse no período selecionado.</p>}</section>;
}

export function PartnerTransferTable({ rows }) {
  const entries = rows.filter(row => row.automaticLotEntry && row.partners?.length);
  if (!entries.length) return null;
  return <section className="transfer-period-summary" aria-label="Distribuição entre sócios"><div className="transfer-period-heading"><h3>Distribuição entre sócios</h3><p>Calculada sobre o saldo de cada entrada, após os descontos registrados.</p></div><div className="table-wrap"><table><thead><tr><th>Data</th><th>Lote</th><th>Entrada</th><th>Sócio</th><th>Repasse</th></tr></thead><tbody>{entries.flatMap(row => row.partners.map((partner, index) => <tr key={`${row.id}:${partner.id || index}`}><td>{dateText(row.date)}</td><td>{row.lotLabel}</td><td>{row.reason === 'signal' ? 'Sinal' : 'Parcela'}</td><td>{partner.name}</td><td>{money(partner.amount)}</td></tr>))}</tbody></table></div></section>;
}

export function LotBalanceTable({ lots, rules }) {
  const [mode, setMode] = useState('month'), [selected, setSelected] = useState(''), [type, setType] = useState('all');
  const entries = lots.flatMap(lot => (lot.entryHistory || []).map(entry => ({ ...resolveLotEntry(entry, rules), lotLabel: lot.label || 'Lote', quadra: lot.quadra || '' })));
  const typed = entries.filter(entry => type === 'all' || entry.type === type);
  const { active } = periodSelection(typed, mode, selected);
  const visible = typed.filter(entry => mode === 'all' || (active && periodKey(entry.date, mode) === active)).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const total = visible.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const deductions = parts.map(([key]) => visible.reduce((sum, entry) => sum + Number(entry.distribution?.[key]?.amount || 0), 0));
  const remaining = total - deductions.reduce((sum, value) => sum + value, 0);
  return <section className="period-balance" aria-label="Balanço das entradas"><header><div><p className="eyebrow">RECEBIMENTOS DOS LOTES</p><h2>Balanço por período</h2><p>Sinais e parcelas registrados na ficha de cada lote.</p></div><PeriodNavigator rows={typed} mode={mode} selected={selected} onMode={setMode} onSelect={setSelected} /></header><BalanceTypeTabs value={type} onChange={value => { setType(value); setSelected(''); }} /><div className="period-balance-total"><span>{mode === 'all' ? 'Todos os períodos' : periodLabel(active, mode)}</span><strong>{money(total)}</strong><small>{visible.length} entradas</small></div>{visible.length ? <div className="table-wrap period-balance-table"><table><thead><tr><th>Data</th><th>Lote</th><th>Entrada</th><th>Descrição</th><th>Recebido</th><th>Corretagem</th><th>Escritório</th><th>Stand</th><th>IPTU</th><th>Imposto</th><th>Saldo</th></tr></thead><tbody>{visible.map(entry => { const values = parts.map(([key]) => Number(entry.distribution?.[key]?.amount || 0)); const balance = round(Number(entry.amount || 0) - values.reduce((a, b) => a + b, 0)); return <tr key={entry.id}><td data-label="Data">{dateText(entry.date)}</td><td data-label="Lote">{entry.lotLabel}</td><td data-label="Entrada">{entry.type === 'signal' ? 'Sinal' : entry.type === 'installment' ? `Parcela${entry.installment ? ` ${entry.installment}` : ''}` : 'Não classificada'}</td><td data-label="Descrição">{entry.description || '—'}</td><td data-label="Recebido">{money(entry.amount)}</td>{values.map((value, index) => <td key={parts[index][0]} data-label={parts[index][1]}>{money(value)}</td>)}<td data-label="Saldo">{money(balance)}</td></tr>; })}</tbody><tfoot><tr><th colSpan={4}>Total do período</th><th>{money(total)}</th>{deductions.map((value, index) => <th key={parts[index][0]}>{money(value)}</th>)}<th>{money(remaining)}</th></tr></tfoot></table></div> : <p className="period-balance-empty">Nenhuma entrada registrada neste período.</p>}</section>;
}

export function TransferEditor({ row, isNew, lots, reasons, busy, error, defaultIptuPercent = 0, onCancel, onSubmit }) {
  const [draft, setDraft] = useState(() => ({ ...row, reason: row.reason || 'signal', date: row.date || today() }));
  const [lotSearch, setLotSearch] = useState(row.lotLabel || '');
  const [commissionOverride, setCommissionOverride] = useState(row.commissionAmount == null ? null : String(row.commissionAmount));
  const [iptuPercent, setIptuPercent] = useState(String(row.iptuPercent ?? defaultIptuPercent));
  const [editingIptuPercent, setEditingIptuPercent] = useState(false);
  const [validation, setValidation] = useState('');
  const amount = Number(draft.amount || 0), reason = reasons.find(item => item.id === draft.reason);
  const defaultCommissionPercent = Number(reason?.sharePercent || 0) * Number(draft.commissionPercent || 100) / 100;
  const commissionAmount = commissionOverride == null ? round(amount * defaultCommissionPercent / 100) : Number(commissionOverride || 0);
  const iptuAmount = round(amount * Number(iptuPercent || 0) / 100), expenses = Number(draft.fixedExpenses || 0);
  const net = round(amount - iptuAmount - expenses - commissionAmount);
  const matchingLots = useMemo(() => lots.filter(lot => `${lot.label} ${lot.quadra || ''}`.toLocaleLowerCase('pt-BR').includes(lotSearch.toLocaleLowerCase('pt-BR'))).slice(0, 30), [lots, lotSearch]);
  function submit(event) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(Number(iptuPercent)) || Number(iptuPercent) < 0 || Number(iptuPercent) > 100 || !Number.isFinite(commissionAmount) || commissionAmount < 0 || !Number.isFinite(expenses) || expenses < 0 || net < 0) { setValidation('Confira os valores: comissão, IPTU e despesas não podem superar a entrada.'); return; }
    setValidation('');
    onSubmit({ ...draft, amount: round(amount), commissionAmount: round(commissionAmount), commissionPercent: amount ? round(commissionAmount / amount * 100) : 0, iptuAmount, iptuPercent: Number(iptuPercent), taxAmount: iptuAmount, taxPercent: Number(iptuPercent), fixedExpenses: round(expenses), netTransfer: net });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}><form className="record-form transfer-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-modal-title" onSubmit={submit}><div className="form-heading"><div><p className="eyebrow">REPASSE</p><h3 id="transfer-modal-title">{isNew ? 'Adicionar entrada' : 'Editar entrada'}</h3></div><button type="button" className="quiet-button" disabled={busy} onClick={onCancel}>Fechar</button></div><div className="transfer-entry-lead"><label>Entrada recebida (R$)<input autoFocus required type="number" min="0.01" step="0.01" value={draft.amount ?? ''} onChange={event => { setDraft({ ...draft, amount: event.target.value }); setCommissionOverride(null); }} placeholder="0,00" /></label><label>Data<input required type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label></div><div className="form-grid"><label className="transfer-lot-search">Buscar lote<input required list="transfer-lot-options" value={lotSearch} onChange={event => { setLotSearch(event.target.value); setDraft({ ...draft, lotLabel: matchingLots.find(lot => `${lot.label} · ${lot.quadra || ''}` === event.target.value)?.label || event.target.value }); }} placeholder="Número, quadra ou lote" /><datalist id="transfer-lot-options">{matchingLots.map(lot => <option key={lot.id} value={`${lot.label} · ${lot.quadra || ''}`} />)}</datalist></label><label>Corretor<input required value={draft.broker || ''} onChange={event => setDraft({ ...draft, broker: event.target.value })} /></label><label>Tipo da entrada<select value={draft.reason} onChange={event => { setDraft({ ...draft, reason: event.target.value }); setCommissionOverride(null); }}>{reasons.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label className="commission-value-field"><span>Comissão do corretor · {amount ? (commissionAmount / amount * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : defaultCommissionPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</span><input type="number" min="0" step="0.01" value={commissionAmount || ''} onChange={event => setCommissionOverride(event.target.value)} placeholder="0,00" /></label><label className="iptu-value-field"><span>IPTU · {editingIptuPercent ? <input aria-label="Percentual de IPTU" type="number" min="0" max="100" step="0.001" autoFocus value={iptuPercent} onChange={event => setIptuPercent(event.target.value)} onBlur={() => setEditingIptuPercent(false)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); setEditingIptuPercent(false); } }} /> : <button type="button" className="inline-percent" onClick={() => setEditingIptuPercent(true)}>{iptuPercent}%</button>}</span><input aria-label="Valor calculado de IPTU" type="number" readOnly value={iptuAmount.toFixed(2)} /></label><label>Despesas fixas (R$)<input type="number" min="0" step="0.01" value={draft.fixedExpenses ?? ''} onChange={event => setDraft({ ...draft, fixedExpenses: event.target.value })} /></label></div><p className="transfer-net">Entrada {money(amount)} − IPTU {money(iptuAmount)} − corretagem {money(commissionAmount)} − despesas {money(expenses)} = <strong>Saldo {money(net)}</strong></p>{(validation || error) && <p className="error-message" role="alert">{validation || error}</p>}<div className="form-actions"><button type="button" className="quiet-button" disabled={busy} onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar entrada'}</button></div></form></div>;
}
