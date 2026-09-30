const PROFILE_KEY = 'glauco.client-govbr.profiles.v1';
const pending = new Map();
let requestCounter = 0;

function nowId(prefix) {
  requestCounter += 1;
  return `${prefix}-${Date.now()}-${requestCounter}`;
}

function nativeAvailable() {
  return typeof globalThis.ipc?.postMessage === 'function';
}

function decode(raw) {
  let value = raw;

  for (let pass = 0; pass < 3; pass += 1) {
    if (typeof value !== 'string') break;
    try {
      value = JSON.parse(value);
    } catch {
      break;
    }
  }

  if (value && typeof value === 'object') return value;

  return {
    ok: false,
    error: `Invalid ClientGov native result: ${String(raw)}`,
  };
}

function request(op, fields = {}, timeoutMs = 15000) {
  if (!nativeAvailable()) {
    return Promise.reject(
      new Error('ClientGov secure native bridge is unavailable on this target.')
    );
  }

  const requestId = nowId('clientgov');

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`ClientGov ${op} timed out`));
    }, timeoutMs);

    pending.set(requestId, { resolve, reject, timer });

    const encoded = new URLSearchParams({
      requestId,
      op,
      ...Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, String(value ?? '')]),
      ),
    }).toString();

    globalThis.ipc.postMessage(`ruby:client-gov:request:${encoded}`);
  });
}

function readProfiles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProfiles(profiles) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

function normalizeName(value) {
  return String(value ?? '').trim().slice(0, 160);
}

function generateClientId() {
  if (globalThis.crypto?.randomUUID) {
    return `client-${crypto.randomUUID()}`;
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function upsertProfile(profile) {
  const profiles = readProfiles();
  const index = profiles.findIndex((item) => item.id === profile.id);

  if (index >= 0) profiles[index] = profile;
  else profiles.push(profile);

  profiles.sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
  );

  writeProfiles(profiles);
  return profile;
}

export function listProfiles() {
  return JSON.stringify(readProfiles());
}

export function getProfile(id) {
  return JSON.stringify(
    readProfiles().find((profile) => profile.id === String(id)) || null
  );
}

export async function saveProfile(options = {}) {
  const id = String(options.id || '').trim() || generateClientId();
  const name = normalizeName(options.name);

  if (!name) throw new Error('Client name is required');

  const previous =
    readProfiles().find((profile) => profile.id === id) || {};

  const folder = await request('ensure_folder', {
    clientId: id,
  });

  const login = String(options.login ?? '');
  const password = String(options.password ?? '');

  if (login) {
    await request('save_credential', {
      clientId: id,
      field: 'login',
      value: login,
    });
  }

  if (password) {
    await request('save_credential', {
      clientId: id,
      field: 'password',
      value: password,
    });
  }

  const [loginStatus, passwordStatus] = await Promise.all([
    request('has_credential', { clientId: id, field: 'login' }),
    request('has_credential', { clientId: id, field: 'password' }),
  ]);

  const profile = {
    ...previous,
    id,
    name,
    folderPath: folder.path || previous.folderPath || '',
    hasLogin: Boolean(loginStatus.exists),
    hasPassword: Boolean(passwordStatus.exists),
    updatedAt: new Date().toISOString(),
  };

  upsertProfile(profile);

  // Password/login values are intentionally not returned or persisted here.
  return JSON.stringify(profile);
}

export async function refreshProfile(options = {}) {
  const id = String(options.id || '');
  const profile =
    readProfiles().find((item) => item.id === id);

  if (!profile) return JSON.stringify(null);

  const [folder, loginStatus, passwordStatus] = await Promise.all([
    request('ensure_folder', { clientId: id }),
    request('has_credential', { clientId: id, field: 'login' }),
    request('has_credential', { clientId: id, field: 'password' }),
  ]);

  const next = {
    ...profile,
    folderPath: folder.path || profile.folderPath || '',
    hasLogin: Boolean(loginStatus.exists),
    hasPassword: Boolean(passwordStatus.exists),
  };

  upsertProfile(next);
  return JSON.stringify(next);
}

export async function openFolder(options = {}) {
  const result = await request('open_folder', {
    clientId: String(options.id || ''),
  });

  return JSON.stringify(result);
}

export async function deleteCredentials(options = {}) {
  const id = String(options.id || '');

  await Promise.all([
    request('delete_credential', { clientId: id, field: 'login' }),
    request('delete_credential', { clientId: id, field: 'password' }),
  ]);

  const profile =
    readProfiles().find((item) => item.id === id);

  if (profile) {
    upsertProfile({
      ...profile,
      hasLogin: false,
      hasPassword: false,
      updatedAt: new Date().toISOString(),
    });
  }

  return JSON.stringify({ ok: true });
}

export function removeProfile(options = {}) {
  const id = String(options.id || '');
  writeProfiles(readProfiles().filter((profile) => profile.id !== id));

  // Client documents are deliberately preserved on disk.
  return JSON.stringify({ ok: true, folderPreserved: true });
}

export async function fillNativeCredential(
  browserId,
  target,
  clientId,
  field,
) {
  return request('fill_credential', {
    browserId,
    target,
    clientId,
    field,
  });
}

export const clientGovService = {
  listProfiles,
  getProfile,
  saveProfile,
  refreshProfile,
  openFolder,
  deleteCredentials,
  removeProfile,
};

export function installClientGovBridge() {
  globalThis.RubyClientGovBridge = {
    resolve(requestId, raw) {
      const item = pending.get(String(requestId));
      if (!item) return false;

      pending.delete(String(requestId));
      clearTimeout(item.timer);

      const result = decode(raw);

      if (result?.ok === false) {
        item.reject(new Error(result.error || 'ClientGov operation failed'));
      } else {
        item.resolve(result);
      }

      return true;
    },
  };

  return true;
}