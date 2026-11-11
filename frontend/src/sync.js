/** Sincroniza dados da aplicação pelo Worker, sem enviar credenciais do GitHub ao frontend. */
export function createSyncClient({ workerUrl, getToken, getLocalMode = () => false, fetcher = fetch }) {
  const endpoint = new URL('/api/sync', workerUrl);
  async function request(method, body) {
    if (getLocalMode()) {
      const key = 'alianca-desktop-dev-data-v1';
      const stored = JSON.parse(localStorage.getItem(key) || '{"data":{},"revision":0}');
      if (method === 'GET') return { data: stored.data, revision: String(stored.revision) };
      if (String(body.revision) !== String(stored.revision)) { const error = new Error('Os dados locais foram alterados. Atualize antes de salvar.'); error.status = 409; throw error; }
      const next = { data: body.data, revision: stored.revision + 1 };
      localStorage.setItem(key, JSON.stringify(next));
      return { data: next.data, revision: String(next.revision) };
    }
    const token = await getToken();
    if (!token) throw new Error('Autenticação necessária para sincronizar.');
    const response = await fetcher(endpoint, {
      method,
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || `Falha na sincronização (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return result;
  }
  return {
    read: () => request('GET'),
    write: (data, revision) => request('PUT', { data, revision }),
  };
}
