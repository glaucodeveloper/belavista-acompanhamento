const $ = (selector) => document.querySelector(selector);
const form = $('#setup-form');
const status = $('#setup-status');
const openInstagram = $('#open-instagram');
const openAdmin = $('#open-admin');
const environmentSwitch = $('#environment-switch');
const environmentLabel = $('#environment-label');
const environmentDescription = $('#environment-description');
const environmentToggle = $('#environment-toggle');

async function api(path, init = {}) {
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}
function setStatus(message, tone = '') {
  status.textContent = message;
  status.className = 'status' + (tone ? ' ' + tone : '');
}
function applySetup(setup) {
  if (!setup?.complete) return;
  $('#owner-name').value = setup.owner?.name || '';
  $('#owner-email').value = setup.owner?.email || '';
  $('#enterprise-name').value = setup.enterprise?.name || 'Aliança Park';
  $('#instagram-handle').value = String(setup.instagram?.handle || '').replace(/^@/, '');
  $('#instagram-consent').checked = Boolean(setup.instagram?.consent);
  openInstagram.disabled = false;
  setStatus('Esta estação está pronta. O Direct local pode ser aberto quando a ponte estiver ativa.', 'success');
}
async function hydrate() {
  try {
    const { setup } = await api('/api/desktop/setup');
    applySetup(setup);
  } catch (error) {
    setStatus(error.message, 'error');
  }
  try {
    const runtime = await window.aliancaDesktop?.runtime?.();
    if (!runtime?.availableModes?.includes('router') || !runtime.availableModes.includes('local')) return;
    environmentSwitch.hidden = false;
    environmentLabel.textContent = runtime.mode === 'local' ? 'Ambiente de teste local' : 'Ambiente conectado ao Router';
    environmentDescription.textContent = runtime.mode === 'local'
      ? 'Gravações ficam isoladas neste computador.'
      : 'Usa os dados compartilhados pelo Router.';
    environmentToggle.textContent = runtime.mode === 'local' ? 'Usar Router remoto' : 'Usar teste local';
    environmentToggle.dataset.nextMode = runtime.mode === 'local' ? 'router' : 'local';
  } catch { /* O seletor existe só no aplicativo Electron configurado. */ }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    ownerName: $('#owner-name').value,
    ownerEmail: $('#owner-email').value,
    enterpriseName: $('#enterprise-name').value,
    instagramHandle: $('#instagram-handle').value,
    instagramConsent: $('#instagram-consent').checked
  };
  setStatus('Preparando a estação local…');
  try {
    const { setup } = await api('/api/desktop/setup', { method: 'POST', body: JSON.stringify(payload) });
    applySetup(setup);
  } catch (error) {
    setStatus(error.message, 'error');
  }
});
openInstagram.addEventListener('click', async () => {
  setStatus('Solicitando a abertura da sessão local…');
  try {
    const result = await api('/api/instagram/bridge/open-inbox', { method: 'POST' });
    setStatus(result.message || 'A sessão local foi aberta. Faça login manualmente no Instagram.', 'success');
  } catch (error) {
    setStatus(error.message + ' Inicie a ponte com npm run instagram:bridge.', 'error');
  }
});
openAdmin.addEventListener('click', () => {
  if (window.aliancaDesktop?.goAdmin) window.aliancaDesktop.goAdmin();
  else window.location.assign('/admin?desktop=ready');
});
environmentToggle.addEventListener('click', async () => {
  const nextMode = environmentToggle.dataset.nextMode;
  if (!nextMode || !window.aliancaDesktop?.switchEnvironment) return;
  environmentToggle.disabled = true;
  setStatus(nextMode === 'local' ? 'Conectando ao ambiente de teste local…' : 'Conectando ao Router…');
  try {
    await window.aliancaDesktop.switchEnvironment(nextMode);
  } catch (error) {
    setStatus(error.message || 'Não foi possível alternar o ambiente.', 'error');
    environmentToggle.disabled = false;
  }
});
hydrate();
