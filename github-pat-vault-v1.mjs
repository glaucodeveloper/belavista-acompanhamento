const DATABASE = "belavista-auth-v1";
const STORE = "secrets";
const KEY_ID = "github-pat-key";
const PAT_ID = "github-pat";

function openDatabase() {
  if (!globalThis.indexedDB || !globalThis.crypto?.subtle) {
    throw new Error("Este navegador não oferece armazenamento local protegido para o PAT.");
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha ao abrir o cofre local."));
    request.onblocked = () => reject(new Error("Feche outras abas do Aliança Park e tente novamente."));
  });
}

function transact(database, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try { result = operation(store); } catch (error) { reject(error); return; }
    transaction.oncomplete = () => resolve(result?.result);
    transaction.onerror = () => reject(transaction.error || result?.error || new Error("Falha no cofre local."));
    transaction.onabort = () => reject(transaction.error || new Error("Operação do cofre local cancelada."));
  });
}

async function get(database, key) {
  return transact(database, "readonly", store => store.get(key));
}

async function put(database, key, value) {
  await transact(database, "readwrite", store => store.put(value, key));
}

export async function saveGithubPat(pat) {
  const value = String(pat || "").trim();
  if (!value) throw new Error("Informe o PAT antes de salvar.");
  const database = await openDatabase();
  try {
    let key = await get(database, KEY_ID);
    if (!key) {
      key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      await put(database, KEY_ID, key);
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
    await put(database, PAT_ID, { version: 1, iv, ciphertext });
  } finally {
    database.close();
  }
}

export async function readGithubPat() {
  const database = await openDatabase();
  try {
    const [key, record] = await Promise.all([get(database, KEY_ID), get(database, PAT_ID)]);
    if (!record) return "";
    if (!key || record.version !== 1 || !record.iv || !record.ciphertext) {
      throw new Error("O PAT salvo não pôde ser aberto. Informe-o novamente.");
    }
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: record.iv }, key, record.ciphertext);
    return new TextDecoder().decode(clear);
  } finally {
    database.close();
  }
}

export async function clearGithubPat() {
  const database = await openDatabase();
  try {
    await transact(database, "readwrite", store => {
      store.delete(PAT_ID);
      store.delete(KEY_ID);
    });
  } finally {
    database.close();
  }
}
