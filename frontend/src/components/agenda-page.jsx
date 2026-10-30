import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Trash2, X } from 'lucide-react';
import { mountLotMap } from '../map.js';
import mapLotIndex from '../assets/mapeamento.json';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = value => new Date(`${value}T12:00:00`);
const formatDate = value => parseDate(value).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const monthTitle = value => value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

function AgendaMap({ selectedLotIds = [], focusLotIds = [], onLotSelect, className = '' }) {
  const hostRef = useRef(null), mapRef = useRef(null), selectRef = useRef(onLotSelect);
  selectRef.current = onLotSelect;
  const selectedKey = selectedLotIds.join('|'), focusKey = focusLotIds.join('|');
  useEffect(() => {
    let disposed = false, map;
    mountLotMap(hostRef.current, { onLotSelect: area => selectRef.current?.(area) }).then(instance => {
      map = instance;
      if (disposed) { map.destroy(); return; }
      mapRef.current = map;
      map.setSelectedLotIds(selectedLotIds);
      if (focusLotIds.length) map.focusLots(focusLotIds);
    }).catch(error => { if (!disposed && hostRef.current) hostRef.current.textContent = error.message; });
    return () => { disposed = true; mapRef.current = null; map?.destroy(); };
  }, []);
  useEffect(() => { mapRef.current?.setSelectedLotIds(selectedLotIds); }, [selectedKey]);
  useEffect(() => { if (focusLotIds.length) mapRef.current?.focusLots(focusLotIds); }, [focusKey]);
  return <div ref={hostRef} className={`agenda-map ${className}`} aria-label="Mapa para selecionar áreas do compromisso" />;
}

function CalendarGrid({ month, selectedDate, events, onPickDate, onOpenEvent }) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell); date.setDate(firstCell.getDate() + index);
    const key = dateKey(date), dayEvents = events.filter(event => event.date === key);
    return { date, key, dayEvents };
  });
  const today = dateKey(new Date());
  return <div className="agenda-calendar-grid" role="grid" aria-label={`Calendário de ${monthTitle(month)}`}>
    {WEEKDAYS.map(day => <div key={day} className="agenda-weekday" role="columnheader">{day}</div>)}
    {days.map(({ date, key, dayEvents }) => <div key={key} role="gridcell" className={`agenda-day ${date.getMonth() === month.getMonth() ? '' : 'is-outside'} ${key === selectedDate ? 'is-selected' : ''} ${key === today ? 'is-today' : ''}`}>
      <button className="agenda-day-number" type="button" aria-label={`Selecionar ${formatDate(key)}`} aria-pressed={key === selectedDate} onClick={() => onPickDate(key)}>{date.getDate()}</button>
      <div className="agenda-day-events">{dayEvents.slice(0, 2).map(event => <button key={event.id} className="agenda-event-chip" type="button" onClick={() => onOpenEvent(event)} title={event.title}><span>{event.startTime || 'Dia todo'}</span>{event.title}</button>)}{dayEvents.length > 2 && <span className="agenda-more-events">+{dayEvents.length - 2} compromissos</span>}</div>
    </div>)}
  </div>;
}

function EventModal({ event, initialDate, onClose, onSave, onDelete }) {
  const isDetails = event?.mode === 'details';
  const existing = event?.item || null;
  const [draft, setDraft] = useState(() => existing ? { ...existing, areaIds: [...(existing.areaIds || [])], areaNumbers: [...(existing.areaNumbers || [])] } : { id: crypto.randomUUID(), title: '', date: initialDate, startTime: '', endTime: '', description: '', areaIds: [], areaNumbers: [] });
  const [editing, setEditing] = useState(!isDetails);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [focusLotIds, setFocusLotIds] = useState(isDetails ? (existing?.areaIds || []) : []);
  const areaToggle = area => setDraft(current => {
    const areaIds = current.areaIds || [], areaNumbers = current.areaNumbers || [];
    const index = areaIds.indexOf(area.lotId);
    if (index >= 0) return { ...current, areaIds: areaIds.filter(id => id !== area.lotId), areaNumbers: areaNumbers.filter((_, i) => i !== index) };
    return { ...current, areaIds: [...areaIds, area.lotId], areaNumbers: [...areaNumbers, area.number] };
  });
  async function submit(formEvent) {
    formEvent.preventDefault();
    if (!draft.title.trim()) { setError('Informe o título do compromisso.'); return; }
    if (draft.endTime && draft.startTime && draft.endTime < draft.startTime) { setError('O horário final precisa ser posterior ao inicial.'); return; }
    setBusy(true); setError('');
    try { await onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim(), areaIds: draft.areaIds || [], areaNumbers: draft.areaNumbers || [] }); onClose(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const selectArea = editing ? areaToggle : undefined;
  const selectedAreaTags = draft.areaIds.map((lotId, index) => {
    const mapEntry = mapLotIndex.mappings.find(entry => entry.lotId === lotId);
    const number = draft.areaNumbers[index] ?? mapEntry?.number;
    return { lotId, number, label: mapEntry?.officialLabel || `Lote ${number ?? ''}` };
  });
  const timeText = draft.startTime ? `${draft.startTime}${draft.endTime ? `–${draft.endTime}` : ''}` : 'Dia todo';
  return <div className="modal-backdrop agenda-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="agenda-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title">
    <header className="agenda-modal-header"><div><p className="eyebrow">AGENDA DE OBRA</p><h2 id="agenda-modal-title">{editing ? (existing ? 'Editar compromisso' : 'Novo compromisso') : draft.title}</h2><p>{formatDate(draft.date)}{!editing && ` · ${timeText}`}</p></div><button type="button" className="quiet-button agenda-close" aria-label="Fechar modal" onClick={onClose}><X size={18} /></button></header>
    {editing ? <form className="agenda-form" onSubmit={submit}>
      <div className="agenda-fields"><label>Título<input autoFocus required maxLength={120} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Concretagem da quadra QA" /></label><div className="agenda-time-fields"><label>Data<input type="date" required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label><label>Início<input type="time" value={draft.startTime || ''} onChange={event => setDraft({ ...draft, startTime: event.target.value })} /></label><label>Fim<input type="time" value={draft.endTime || ''} onChange={event => setDraft({ ...draft, endTime: event.target.value })} /></label></div><label>Detalhes<textarea rows={3} maxLength={1200} value={draft.description || ''} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Equipe, materiais, instruções…" /></label></div>
      <section className="agenda-map-selection"><div className="agenda-map-title"><div><h3>Áreas do loteamento</h3><p>Clique ou toque e segure nos lotes para incluir ou remover áreas.</p></div><span>{draft.areaIds.length} selecionada{draft.areaIds.length === 1 ? '' : 's'}</span></div><AgendaMap selectedLotIds={draft.areaIds} onLotSelect={selectArea} /></section>
      {!!selectedAreaTags.length && <div className="agenda-area-tags" aria-label="Áreas selecionadas">{selectedAreaTags.map(({ lotId, number, label }) => <span key={lotId}><MapPin size={12} /> {label}<button type="button" aria-label={`Remover ${label}`} onClick={() => areaToggle({ lotId, number })}><X size={12} /></button></span>)}</div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <footer className="agenda-modal-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar compromisso'}</button></footer>
    </form> : <div className="agenda-event-details">
      {draft.description && <p className="agenda-description">{draft.description}</p>}
      <div className="agenda-detail-meta"><span><CalendarDays size={15} /> {formatDate(draft.date)}</span><span><Clock3 size={15} /> {timeText}</span><span><MapPin size={15} /> {draft.areaIds.length} áreas</span></div>
      {draft.areaIds.length ? <section className="agenda-map-selection"><div className="agenda-map-title"><div><h3>Áreas do compromisso</h3><p>Lotes destacados no mapa.</p></div><span>{draft.areaIds.length} selecionada{draft.areaIds.length === 1 ? '' : 's'}</span></div><AgendaMap selectedLotIds={draft.areaIds} focusLotIds={focusLotIds} /></section> : <div className="agenda-no-area">Este compromisso não tem áreas vinculadas.</div>}
      <footer className="agenda-modal-actions"><button type="button" className="quiet-button danger-button" onClick={onDelete}><Trash2 size={15} /> Excluir</button><button type="button" className="quiet-button" onClick={onClose}>Fechar</button><button type="button" className="primary-button" onClick={() => { setEditing(true); setFocusLotIds([]); }}>Editar compromisso</button></footer>
    </div>}
  </section></div>;
}

export function AgendaPage({ events = [], onSave }) {
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [modal, setModal] = useState(null), [saveError, setSaveError] = useState('');
  const sortedEvents = useMemo(() => [...events].sort((a, b) => `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`)), [events]);
  const dayEvents = sortedEvents.filter(event => event.date === selectedDate);
  function changeMonth(delta) { setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1)); }
  async function saveEvent(event) {
    const next = events.some(item => item.id === event.id) ? events.map(item => item.id === event.id ? event : item) : [...events, event];
    await onSave(next); setSaveError('');
  }
  async function deleteEvent(event) {
    await onSave(events.filter(item => item.id !== event.id)); setModal(null);
  }
  return <div className="agenda-page">
    <header className="page-intro agenda-page-intro"><div><p className="eyebrow">PLANEJAMENTO</p><h2>Agenda de obra</h2><p>Organize compromissos e vincule cada atividade às áreas do mapa.</p></div><button className="primary-button" type="button" onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Novo compromisso</button></header>
    {saveError && <p className="error-message" role="alert">{saveError}</p>}
    <div className="agenda-layout"><section className="agenda-calendar-panel" aria-label="Calendário de compromissos"><div className="agenda-month-toolbar"><div><h3>{monthTitle(month)}</h3><span>{sortedEvents.length} compromisso{sortedEvents.length === 1 ? '' : 's'} no calendário</span></div><div className="agenda-month-controls"><button type="button" className="quiet-button" aria-label="Mês anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button><button type="button" className="quiet-button" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(dateKey(today)); }}>Hoje</button><button type="button" className="quiet-button" aria-label="Próximo mês" onClick={() => changeMonth(1)}><ChevronRight size={17} /></button></div></div>
      <CalendarGrid month={month} selectedDate={selectedDate} events={sortedEvents} onPickDate={setSelectedDate} onOpenEvent={event => setModal({ mode: 'details', item: event })} />
    </section><aside className="agenda-day-panel"><div className="agenda-day-heading"><div><p className="eyebrow">DIA SELECIONADO</p><h3>{parseDate(selectedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</h3><p>{formatDate(selectedDate)}</p></div><button type="button" className="quiet-button" aria-label="Adicionar compromisso neste dia" onClick={() => setModal({ mode: 'create', date: selectedDate })}><Plus size={17} /></button></div>
      {dayEvents.length ? <div className="agenda-day-list">{dayEvents.map(event => <button type="button" className="agenda-day-event" key={event.id} onClick={() => setModal({ mode: 'details', item: event })}><span className="agenda-event-time">{event.startTime || 'Dia todo'}</span><strong>{event.title}</strong>{event.description && <small>{event.description}</small>}{!!event.areaIds?.length && <span className="agenda-event-area"><MapPin size={12} /> {event.areaIds.length} áreas do mapa</span>}</button>)}</div> : <div className="agenda-empty-day"><CalendarDays size={22} /><p>Nenhum compromisso neste dia.</p><button type="button" className="quiet-button" onClick={() => setModal({ mode: 'create', date: selectedDate })}>Adicionar compromisso</button></div>}</aside></div>
    {modal && <EventModal event={modal} initialDate={modal.date || selectedDate} onClose={() => setModal(null)} onSave={async event => { try { await saveEvent(event); } catch (err) { setSaveError(err.message); throw err; } }} onDelete={async () => { try { await deleteEvent(modal.item); } catch (err) { setSaveError(err.message); } }} />}
  </div>;
}
