/** Sincroniza dados da aplicação pelo Worker, sem enviar credenciais do GitHub ao frontend. */
export function createSyncClient({ workerUrl, getToken, fetcher = fetch }) {
  const endpoint = new URL('/api/sync', workerUrl);
  async function request(method, body) {
    const token = await getToken();
    if (!token) throw new Error('Autenticação necessária para sincronizar.');
    const response = await fetcher(endpoint, {
      method,
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
