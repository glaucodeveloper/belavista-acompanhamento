import stageCatalog from './frontend/src/data/admin-stage-config-bridge.json' with { type: 'json' };

const stageNames = stageCatalog.stages.map(stage => stage.name);
const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function blankCashForm(today) {
  return `<form class="cash-entry-control" data-v8-cash-entry data-cash-evidence-v11><header><div><span class="activity-kind">NOVO LANÇAMENTO · COMPROVAÇÃO OBRIGATÓRIA</span><h2>Movimentar fluxo de caixa</h2></div><small>Qualquer sessão administrativa pode registrar; o fato só entra no ciclo após uma evidência.</small></header><div><label>Tipo<select name="kind"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label>Data<input type="date" name="date" value="${today}" required></label><label>Categoria<input name="category" placeholder="Venda, obra, ajuste…" required></label><label>Etapa<select name="stage"><option>Geral</option>${stageNames.map(name => `<option>${escape(name)}</option>`).join('')}</select></label><label>Valor (R$)<input name="amount" inputmode="decimal" placeholder="0,00" required></label><label class="wide">Origem / descrição<input name="description" placeholder="Identifique recebimento, pagamento, estorno ou ajuste" required></label></div><footer><span data-v8-cash-status>Inclua comprovante ou desenhe/assine no quadro.</span><button type="submit">Registrar fato e recalcular pela IA</button></footer></form>`;
}
function evidenceMarkup() {
  return `<section class="cash-evidence-v11" data-cash-evidence><div><span>COMPROVAÇÃO DO LANÇAMENTO</span><b>Comprovante ou assinatura/desenho</b><small>Uma das duas evidências é obrigatória.</small></div><label class="cash-proof-file">Imagem / PDF<input type="file" name="cashProof" accept="image/*,application/pdf"></label><div class="cash-signature"><header><span>ASSINATURA / DESENHO NO CANVAS</span><button type="button" data-cash-sign-clear>Limpar</button></header><canvas width="720" height="190" data-cash-signature aria-label="Área para assinatura ou desenho com o dedo"></canvas><small>Use mouse, caneta ou dedo. O desenho será salvo como PNG.</small></div></section>`;
}
function prepareCanvas(canvas) {
  if (!canvas || canvas.dataset.bound) return;
  canvas.dataset.bound = '1';
  const context = canvas.getContext('2d');
  if (!context) return;
  context.lineCap = 'round'; context.lineJoin = 'round'; context.lineWidth = 3; context.strokeStyle = '#f4f4f4';
  let active = false, last = null;
  const point = event => {
    const rect = canvas.getBoundingClientRect(), pointer = event.touches?.[0] || event;
    return { x: (pointer.clientX - rect.left) * canvas.width / rect.width, y: (pointer.clientY - rect.top) * canvas.height / rect.height };
  };
  const start = event => { event.preventDefault(); active = true; last = point(event); canvas.dataset.dirty = '1'; canvas.setPointerCapture?.(event.pointerId); };
  const move = event => {
    if (!active) return;
    event.preventDefault(); const next = point(event); context.beginPath(); context.moveTo(last.x, last.y); context.lineTo(next.x, next.y); context.stroke(); last = next;
  };
  const end = event => { active = false; last = null; try { canvas.releasePointerCapture?.(event.pointerId); } catch { /* already released */ } };
  canvas.addEventListener('pointerdown', start); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
}
function fileDataUrl(windowRef, file) {
  return new Promise((resolve, reject) => {
    const reader = new windowRef.FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler comprovante.'));
    reader.readAsDataURL(file);
  });
}
function amountToCents(value) {
  return Math.round((Number(String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0) * 100);
}

/** Recovery for old generated frontend bundles without the TypeScript cash owner. */
export function installLegacyAtlasAdminCashEvidenceV1({ documentRef, windowRef, apiFetch }) {
  const enhanceFinance = () => {
    const page = documentRef.querySelector('view-layer[data-view="finance"],.finance-control-page');
    if (!page) return;
    let form = page.querySelector('form[data-v8-cash-entry]');
    if (!form) {
      const boundary = page.querySelector('.role-boundary-notice');
      if (boundary) {
        const holder = documentRef.createElement('div');
        holder.innerHTML = blankCashForm(new windowRef.Date().toISOString().slice(0, 10));
        boundary.replaceWith(holder.firstElementChild);
        form = page.querySelector('form[data-v8-cash-entry]');
      }
    }
    if (!form) return;
    form.dataset.cashEvidenceV11 = '1';
    if (!form.querySelector('[data-cash-evidence]')) form.querySelector('footer')?.insertAdjacentHTML('beforebegin', evidenceMarkup());
    prepareCanvas(form.querySelector('[data-cash-signature]'));
    const clear = form.querySelector('[data-cash-sign-clear]');
    if (clear && !clear.dataset.cashClearBound) {
      clear.dataset.cashClearBound = '1';
      clear.addEventListener('click', () => {
        const canvas = form.querySelector('[data-cash-signature]');
        canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        if (canvas) delete canvas.dataset.dirty;
      });
    }
  };
  const submitCash = async form => {
    const status = form.querySelector('[data-v8-cash-status]'), button = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new windowRef.FormData(form)), amountCents = amountToCents(values.amount);
    if (!amountCents) { status.textContent = 'Informe um valor maior que zero.'; return; }
    const file = form.querySelector('input[name="cashProof"]')?.files?.[0], canvas = form.querySelector('[data-cash-signature]');
    if (!file && !canvas?.dataset.dirty) { status.textContent = 'Anexe um comprovante ou assine/desenhe no quadro.'; return; }
    button.disabled = true; status.textContent = 'Salvando evidência no GitHub…';
    try {
      let evidence;
      if (file) {
        if (file.size > 6 * 1024 * 1024) throw new Error('Comprovante deve ter no máximo 6 MB.');
        evidence = { kind: 'upload', fileName: text(file.name, 120), contentType: text(file.type || 'application/octet-stream', 100), dataUrl: await fileDataUrl(windowRef, file) };
      } else evidence = { kind: 'canvas-signature', fileName: `assinatura-caixa-${windowRef.Date.now()}.png`, contentType: 'image/png', dataUrl: canvas.toDataURL('image/png') };
      const proofResponse = await apiFetch('/api/admin/cash-evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence }) });
      const proof = await proofResponse.json();
      if (!proofResponse.ok) throw new Error(proof.error || `HTTP ${proofResponse.status}`);
      status.textContent = 'Evidência salva. Enviando o fato para a transição NVIDIA…';
      const stateResponse = await apiFetch('/api/admin/config/state', { cache: 'no-store' }), state = await stateResponse.json();
      if (!stateResponse.ok) throw new Error(state.error || `HTTP ${stateResponse.status}`);
      const event = {
        id: `cash-${windowRef.Date.now()}`, type: 'cash.entry.recorded', at: new windowRef.Date().toISOString(), actor: { id: 'admin-web', role: 'admin' },
        payload: { kind: values.kind === 'saida' ? 'saida' : 'entrada', stage: text(values.stage, 120) || 'Geral', category: text(values.category, 120),
          description: text(values.description, 500), date: text(values.date, 20), amountCents, evidence: proof.proof },
      };
      const loopResponse = await apiFetch('/api/operational-loop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'strict-ai-state-transition', persist: true, previousState: state.data ?? state, event,
          inference: { provider: 'nvidia', strict: true, requireFullState: true, requireMetaTrace: true, noDeterministicFallback: true } }),
      });
      const loop = await loopResponse.json();
      if (!loopResponse.ok) throw new Error(loop.error || `HTTP ${loopResponse.status}`);
      status.textContent = 'Lançamento comprovado e incorporado ao estado pela NVIDIA.';
      form.reset(); canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); if (canvas) delete canvas.dataset.dirty;
      windowRef.dispatchEvent(new windowRef.CustomEvent('belavista:operational-refresh', { detail: { source: 'cash-evidence-v11', loop } }));
      windowRef.setTimeout(() => windowRef.location.reload(), 650);
    } catch (error) {
      status.textContent = error?.message || 'Falha ao registrar o lançamento.'; button.disabled = false;
    }
  };
  const onSubmit = event => {
    const form = event.target?.closest?.('form[data-v8-cash-entry][data-cash-evidence-v11]');
    if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation(); void submitCash(form);
  };
  const observer = new windowRef.MutationObserver(enhanceFinance);
  documentRef.addEventListener('submit', onSubmit, true);
  if (documentRef.documentElement) observer.observe(documentRef.documentElement, { childList: true, subtree: true });
  windowRef.queueMicrotask(enhanceFinance);
  return () => { observer.disconnect(); documentRef.removeEventListener('submit', onSubmit, true); };
}
