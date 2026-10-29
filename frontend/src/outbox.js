const DATABASE = 'alianca-assistant-outbox-v1';
const STORE = 'jobs';

function openOutbox() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir a fila local.'));
  });
}

async function transact(mode, operation) {
  const database = await openOutbox();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    let result;
    if (request) {
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error('Falha na fila local.'));
    }
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error('Falha na fila local.')); };
    transaction.onabort = () => { database.close(); reject(transaction.error || new Error('Operação local cancelada.')); };
  });
}

export const readOutbox = owner => transact('readonly', store => store.getAll()).then(jobs => jobs.filter(job => job.owner === owner).sort((a, b) => a.createdAt - b.createdAt));
export const saveOutboxJob = job => transact('readwrite', store => store.put(job));
export const removeOutboxJob = id => transact('readwrite', store => store.delete(id));
