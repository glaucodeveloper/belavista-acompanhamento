import { formatBRL, formatPercent, BELAVISTA_ROLES, toneFor } from './system.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const json = (value, fallback = []) => { try { return JSON.parse(value || ''); } catch { return fallback; } };
const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));

class BelavistaElement extends HTMLElement {
  emit(name, detail = {}) { this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail })); }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
}

export class BelavistaButton extends BelavistaElement {
  static observedAttributes = ['label', 'kind', 'disabled', 'icon'];
  render() {
    const disabled = this.hasAttribute('disabled');
    this.innerHTML = `<button class="bv-button" type="button" data-kind="${esc(this.getAttribute('kind') || 'secondary')}" ${disabled ? 'disabled' : ''}>${this.getAttribute('icon') ? `<span aria-hidden="true">${esc(this.getAttribute('icon'))}</span>` : ''}<span>${esc(this.getAttribute('label') || this.textContent || 'Ação')}</span></button>`;
    this.querySelector('button')?.addEventListener('click', () => this.emit('belavista-action', { id: this.id || null, kind: this.getAttribute('kind') || 'secondary' }));
  }
}

export class BelavistaStatus extends BelavistaElement {
  static observedAttributes = ['label', 'tone'];
  render() { const label = this.getAttribute('label') || this.textContent || 'Sem status'; const tone = this.getAttribute('tone') || toneFor(label); this.innerHTML = `<span class="bv-status bv-tone-${esc(tone)}">${esc(label)}</span>`; }
}

export class BelavistaMetric extends BelavistaElement {
  static observedAttributes = ['label', 'value', 'helper', 'progress', 'tone'];
  render() {
    const progress = this.hasAttribute('progress') ? clamp(this.getAttribute('progress')) : null;
    this.innerHTML = `<article class="bv-metric"><span class="bv-metric-label">${esc(this.getAttribute('label') || 'Indicador')}</span><strong class="bv-metric-value" style="color:var(--bv-${esc(this.getAttribute('tone') || 'focus')})">${esc(this.getAttribute('value') || '—')}</strong>${progress !== null ? `<span class="bv-progress"><i style="width:${progress}%"></i></span>` : ''}<small class="bv-metric-helper">${esc(this.getAttribute('helper') || '')}</small></article>`;
  }
}

export class BelavistaPager extends BelavistaElement {
  static observedAttributes = ['items', 'index'];
  get items() { return json(this.getAttribute('items'), []); }
  get index() { return Math.max(0, Math.min(this.items.length - 1, Number(this.getAttribute('index')) || 0)); }
  set index(value) { this.setAttribute('index', String(value)); }
  render() {
    const items = this.items, index = this.index, item = items[index] || { label: 'Sem item' };
    this.innerHTML = `<nav class="bv-pager" aria-label="Navegação entre itens"><button type="button" aria-label="Anterior" ${index <= 0 ? 'disabled' : ''}>‹</button><div><span>${String(item.kicker || `ITEM ${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`).toUpperCase()}</span><b>${esc(item.label || item.name || item)}</b></div><button type="button" aria-label="Próximo" ${index >= items.length - 1 ? 'disabled' : ''}>›</button></nav>`;
    const [previous, next] = this.querySelectorAll('button');
    previous?.addEventListener('click', () => this.go(index - 1)); next?.addEventListener('click', () => this.go(index + 1));
  }
  go(index) { if (index < 0 || index >= this.items.length) return; this.index = index; this.emit('belavista-page-change', { index, item: this.items[index] }); }
}

export class BelavistaCashCard extends BelavistaElement {
  static observedAttributes = ['balance-cents', 'reserve-cents', 'allocatable-cents', 'role'];
  render() {
    const balance = Number(this.getAttribute('balance-cents')) / 100 || 0, reserve = Number(this.getAttribute('reserve-cents')) / 100 || 0, allocatable = Number(this.getAttribute('allocatable-cents')) / 100 || 0;
    const role = BELAVISTA_ROLES[this.getAttribute('role') || 'owner'] || BELAVISTA_ROLES.owner;
    this.innerHTML = `<article class="bv-cash"><header><div><span class="bv-cash-label">CAIXA MESTRE · ${esc(role.label).toUpperCase()}</span><strong class="bv-cash-value">${formatBRL(balance)}</strong></div><belavista-status label="${balance >= 0 ? 'disponível' : 'déficit'}" tone="${balance >= 0 ? 'green' : 'red'}"></belavista-status></header><div class="bv-cash-facts"><div><small>Reserva operacional</small><b>${formatBRL(reserve)}</b></div><div><small>Disponível para alocar</small><b>${formatBRL(allocatable)}</b></div></div></article>`;
  }
}

export class BelavistaStageCard extends BelavistaElement {
  static observedAttributes = ['stage'];
  get stage() { return json(this.getAttribute('stage'), {}); }
  set stage(value) { this.setAttribute('stage', JSON.stringify(value)); }
  render() {
    const stage = this.stage, progress = clamp(stage.progress), need = Number(stage.needCents || 0) / 100, allocation = Number(stage.allocatedCents || 0) / 100;
    const materials = Array.isArray(stage.materials) ? stage.materials : [], blocked = Array.isArray(stage.blockedBy) ? stage.blockedBy : [];
    this.innerHTML = `<article class="bv-stage"><belavista-pager items='${esc(JSON.stringify(stage.sequence || [{ label: stage.name || 'Etapa' }]))}' index="${Number(stage.index) || 0}"></belavista-pager><div class="bv-stage-progress-copy"><span>Andamento comprovado</span><b>${formatPercent(progress)}</b></div><span class="bv-progress"><i style="width:${progress}%"></i></span><div class="bv-stage-allocation"><div><small>Necessidade restante</small><b>${formatBRL(need)}</b></div><div><small>Caixa alocado agora</small><b>${formatBRL(allocation)}</b></div><span>${formatPercent(stage.coverage)}</span></div><div class="bv-stage-blocker"><span>${blocked.length ? 'DEPENDÊNCIAS BLOQUEANDO' : 'FRENTE LIBERADA PARA PRIORIZAÇÃO'}</span><p>${esc(blocked.length ? `Aguardar: ${blocked.join(', ')}.` : `Prioridade ${Number(stage.priority) || 0}/100 · distribuição por caixa ativa.`)}</p></div><div class="bv-materials"><small>MATERIAIS / REQUISITOS</small>${materials.map(item => `<span>▧ ${esc(item)}</span>`).join('') || '<span>Nenhum requisito configurado</span>'}</div></article>`;
    this.querySelector('belavista-pager')?.addEventListener('belavista-page-change', event => this.emit('belavista-stage-page-change', event.detail));
  }
}

export class BelavistaNotification extends BelavistaElement {
  static observedAttributes = ['title', 'message', 'severity', 'time', 'action'];
  render() {
    const severity = this.getAttribute('severity') || 'info';
    this.innerHTML = `<article class="bv-notification bv-tone-${toneFor(severity)}"><i class="bv-notification-mark"></i><div class="bv-notification-copy"><b>${esc(this.getAttribute('title') || 'Notificação')}</b><p>${esc(this.getAttribute('message') || '')}</p><small>${esc(this.getAttribute('time') || 'agora')}</small></div>${this.getAttribute('action') ? `<button type="button" class="bv-button bv-notification-action" data-kind="ghost">${esc(this.getAttribute('action'))}</button>` : ''}</article>`;
    this.querySelector('button')?.addEventListener('click', () => this.emit('belavista-notification-action', { severity, title: this.getAttribute('title') }));
  }
}

export class BelavistaDataTable extends BelavistaElement {
  get columns() { return this._columns || []; } set columns(value) { this._columns = value; this.render(); }
  get rows() { return this._rows || []; } set rows(value) { this._rows = value; this.render(); }
  connectedCallback() { this._columns ||= json(this.getAttribute('columns'), []); this._rows ||= json(this.getAttribute('rows'), []); super.connectedCallback(); }
  render() {
    const columns = this.columns, rows = this.rows;
    this.innerHTML = `<div class="bv-table-wrap"><table class="bv-table"><thead><tr>${columns.map(column => `<th>${esc(column.label || column.key || column)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, rowIndex) => `<tr>${columns.map(column => { const key = column.key || column; const value = row[key] ?? '—'; return `<td ${column.mono ? 'data-mono' : ''}>${column.status ? `<belavista-status label="${esc(value)}"></belavista-status>` : esc(value)}</td>`; }).join('')}</tr>`).join('') || `<tr><td colspan="${Math.max(columns.length, 1)}">Nenhum registro.</td></tr>`}</tbody></table></div>`;
    this.querySelectorAll('tbody tr').forEach((row, index) => row.addEventListener('click', () => this.emit('belavista-row-select', { index, row: rows[index] })));
  }
}

export class BelavistaChat extends BelavistaElement {
  get messages() { return this._messages || []; } set messages(value) { this._messages = value; this.render(); }
  get suggestions() { return this._suggestions || []; } set suggestions(value) { this._suggestions = value; this.render(); }
  connectedCallback() { this._messages ||= json(this.getAttribute('messages'), []); this._suggestions ||= json(this.getAttribute('suggestions'), []); super.connectedCallback(); }
  render() {
    const messages = this.messages, suggestions = this.suggestions;
    this.innerHTML = `<section class="bv-chat"><header><div><b>${esc(this.getAttribute('title') || 'Atendimento operacional')}</b><small>${esc(this.getAttribute('status') || '● disponível')}</small></div><belavista-status label="ativo" tone="green"></belavista-status></header><div class="bv-chat-messages">${messages.map(message => `<p class="bv-message" data-role="${esc(message.role || 'assistant')}">${esc(message.text || message)}</p>`).join('')}</div><div class="bv-chat-chips">${suggestions.map((item, index) => `<button type="button" data-suggestion="${index}">${esc(item.label || item)}</button>`).join('')}</div><form class="bv-chat-form"><input class="bv-field" name="message" placeholder="Registrar informação, pergunta ou confirmação"><button type="submit" class="bv-button" data-kind="primary">↑</button></form></section>`;
    this.querySelectorAll('[data-suggestion]').forEach(button => button.addEventListener('click', () => this.emit('belavista-suggestion', { index: Number(button.dataset.suggestion), suggestion: suggestions[Number(button.dataset.suggestion)] })));
    this.querySelector('form')?.addEventListener('submit', event => { event.preventDefault(); const input = event.currentTarget.elements.message; const text = input.value.trim(); if (!text) return; input.value = ''; this.emit('belavista-send', { text }); });
  }
}

export class BelavistaRoleGrid extends BelavistaElement {
  static observedAttributes = ['current-role'];
  render() {
    const current = this.getAttribute('current-role') || 'owner';
    this.innerHTML = `<section class="bv-role-grid">${Object.values(BELAVISTA_ROLES).map(role => `<article class="bv-role" data-current="${role.id === current}"><span>${esc(role.label).toUpperCase()}</span><b>${esc(role.description)}</b><ul>${role.capabilities.map(capability => `<li>${esc(capability)}</li>`).join('')}</ul></article>`).join('')}</section>`;
  }
}

const registry = {
  'belavista-button': BelavistaButton, 'belavista-status': BelavistaStatus, 'belavista-metric': BelavistaMetric,
  'belavista-pager': BelavistaPager, 'belavista-cash-card': BelavistaCashCard, 'belavista-stage-card': BelavistaStageCard,
  'belavista-notification': BelavistaNotification, 'belavista-data-table': BelavistaDataTable, 'belavista-chat': BelavistaChat,
  'belavista-role-grid': BelavistaRoleGrid
};

export function registerBelavistaComponents() {
  Object.entries(registry).forEach(([name, component]) => { if (!customElements.get(name)) customElements.define(name, component); });
  return registry;
}

registerBelavistaComponents();
