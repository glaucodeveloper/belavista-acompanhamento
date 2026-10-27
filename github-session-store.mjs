import { createHash, randomBytes } from 'node:crypto';
import { db } from './persistence.mjs';
import { verifyRepositoryPat } from './github-pat-auth.mjs';
import { foremanAccessKeyActorV1, normalizeForemanAccessPermissionsV1 } from './foreman-access-key-policy.mjs';

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const nowIso = () => new Date().toISOString();
const tokenHash = value => createHash('sha256').update(String(value || '')).digest('hex');
const newToken = prefix => `${prefix}_${randomBytes(32).toString('hex')}`;
const repository = () => String(process.env.BELAVISTA_GITHUB_AUTH_REPO || 'glaucodeveloper/belavista-acompanhamento').trim();

db.exec(`
  CREATE TABLE IF NOT EXISTS github_auth_users (
    github_id INTEGER PRIMARY KEY, github_login TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL, user_type TEXT NOT NULL DEFAULT '', commercial_profile TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS github_auth_sessions (
    token_hash TEXT PRIMARY KEY, github_id INTEGER NOT NULL REFERENCES github_auth_users(github_id) ON DELETE CASCADE,
    created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, delegated_key_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_github_auth_sessions_user ON github_auth_sessions(github_id, expires_at);
  CREATE TABLE IF NOT EXISTS github_foreman_access_roles (
    id TEXT PRIMARY KEY, github_id INTEGER NOT NULL REFERENCES github_auth_users(github_id) ON DELETE CASCADE,
    name TEXT NOT NULL, permissions_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE(github_id, name)
  );
  CREATE TABLE IF NOT EXISTS github_foreman_access_keys (
    id TEXT PRIMARY KEY, github_id INTEGER NOT NULL REFERENCES github_auth_users(github_id) ON DELETE CASCADE,
    label TEXT NOT NULL, permissions_json TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, created_by TEXT NOT NULL DEFAULT '', role_id TEXT
  );
`);

const sessionUser = db.prepare(`SELECT u.github_id AS githubId,u.github_login AS githubLogin,u.role,
  u.user_type AS userType,u.commercial_profile AS commercialProfile,u.active,
  s.delegated_key_id AS delegatedKeyId,k.label AS delegatedKeyLabel,k.role_id AS delegatedRoleId,
  k.permissions_json AS delegatedPermissionsJson,r.name AS delegatedRoleName,r.permissions_json AS delegatedRolePermissionsJson,
  k.expires_at AS delegatedExpiresAt,k.revoked_at AS delegatedRevokedAt
  FROM github_auth_users u JOIN github_auth_sessions s ON s.github_id=u.github_id
  LEFT JOIN github_foreman_access_keys k ON k.id=s.delegated_key_id
  LEFT JOIN github_foreman_access_roles r ON r.id=k.role_id
  WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?`);

function actorFor(user, key = null) {
  const actor = {
    uid: `github:${user.githubId}`, githubId: user.githubId, githubLogin: user.githubLogin,
    name: user.githubLogin, role: user.role, userType: user.userType || '',
    commercialProfile: user.commercialProfile || '', mode: 'github-pat',
  };
  return key ? foremanAccessKeyActorV1(actor, key) : actor;
}

export async function openGithubSession(pat) {
  const value = String(pat || '').trim();
  let identity, delegatedKey = null;
  if (value.startsWith('bvk_')) {
    delegatedKey = db.prepare(`SELECT k.id,k.github_id AS githubId,k.label,k.role_id AS roleId,
      k.permissions_json AS permissionsJson,r.name AS roleName,r.permissions_json AS rolePermissionsJson,
      k.expires_at AS expiresAt,k.revoked_at AS revokedAt FROM github_foreman_access_keys k
      LEFT JOIN github_foreman_access_roles r ON r.id=k.role_id WHERE k.token_hash=?`).get(tokenHash(value));
    if (!delegatedKey || delegatedKey.revokedAt || delegatedKey.expiresAt <= nowIso()) throw fail('Chave de encarregado expirada ou revogada.', 401);
    identity = db.prepare(`SELECT github_id AS githubId,github_login AS githubLogin FROM github_auth_users WHERE github_id=? AND active=1`).get(delegatedKey.githubId);
    if (!identity) throw fail('Conta administradora da chave inativa.', 401);
    delegatedKey.permissions = JSON.parse(delegatedKey.rolePermissionsJson || delegatedKey.permissionsJson || '[]');
  } else {
    identity = await verifyRepositoryPat(value, repository());
  }

  const timestamp = nowIso();
  db.prepare(`INSERT INTO github_auth_users(github_id,github_login,role,user_type,commercial_profile,active,created_at,updated_at)
    VALUES(?,?,'owner','','',1,?,?) ON CONFLICT(github_id) DO UPDATE SET github_login=excluded.github_login,
    role='owner',user_type='',commercial_profile='',active=1,updated_at=excluded.updated_at`)
    .run(identity.githubId, identity.githubLogin, timestamp, timestamp);
  const user = db.prepare(`SELECT github_id AS githubId,github_login AS githubLogin,role,user_type AS userType,
    commercial_profile AS commercialProfile,active FROM github_auth_users WHERE github_id=?`).get(identity.githubId);
  const token = newToken('bvs'), expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO github_auth_sessions(token_hash,github_id,created_at,expires_at,delegated_key_id) VALUES(?,?,?,?,?)`)
    .run(tokenHash(token), identity.githubId, timestamp, expiresAt, delegatedKey?.id || null);
  return { token, expiresAt, actor: actorFor(user, delegatedKey) };
}

export function actorFromGithubSession(token) {
  if (!/^bvs_[a-f0-9]{64}$/.test(String(token || ''))) throw fail('Sessão obrigatória.', 401);
  const user = sessionUser.get(tokenHash(token), nowIso());
  if (!user || !user.active || (user.delegatedKeyId && (!user.delegatedKeyLabel || user.delegatedRevokedAt || user.delegatedExpiresAt <= nowIso()))) {
    throw fail('Sessão expirada ou acesso revogado.', 401);
  }
  const key = user.delegatedKeyId ? {
    id: user.delegatedKeyId, label: user.delegatedKeyLabel, roleId: user.delegatedRoleId || '',
    roleName: user.delegatedRoleName || '',
    permissions: JSON.parse(user.delegatedRolePermissionsJson || user.delegatedPermissionsJson || '[]'),
  } : null;
  return actorFor(user, key);
}

export function revokeGithubSession(token) {
  if (!/^bvs_[a-f0-9]{64}$/.test(String(token || ''))) return false;
  return db.prepare(`UPDATE github_auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL`)
    .run(nowIso(), tokenHash(token)).changes > 0;
}

export function listForemanAccessKeys(githubId) {
  return db.prepare(`SELECT k.id,k.label,k.role_id AS roleId,r.name AS roleName,
    COALESCE(r.permissions_json,k.permissions_json) AS permissionsJson,k.created_at AS createdAt,
    k.expires_at AS expiresAt,k.revoked_at AS revokedAt,k.created_by AS createdBy
    FROM github_foreman_access_keys k LEFT JOIN github_foreman_access_roles r ON r.id=k.role_id
    WHERE k.github_id=? ORDER BY k.created_at DESC`).all(Number(githubId))
    .map(row => ({ ...row, permissions: JSON.parse(row.permissionsJson || '[]') }));
}

export function createForemanAccessKey({ githubId, label, createdBy = '', roleId = '' } = {}) {
  const cleanLabel = String(label || '').trim().replace(/\s+/g, ' ');
  const role = db.prepare(`SELECT id,name,permissions_json AS permissionsJson FROM github_foreman_access_roles WHERE id=? AND github_id=?`)
    .get(String(roleId), Number(githubId));
  if (!role) throw fail('Selecione um papel válido da sua conta.', 400);
  const permissions = normalizeForemanAccessPermissionsV1(JSON.parse(role.permissionsJson || '[]'));
  if (cleanLabel.length < 2 || cleanLabel.length > 60) throw fail('Dê à chave um nome entre 2 e 60 caracteres.', 400);
  if (!permissions.length) throw fail('Selecione ao menos uma permissão.', 400);
  const id = `FKEY-${randomBytes(16).toString('hex')}`, token = newToken('bvk'), createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO github_foreman_access_keys(id,github_id,label,permissions_json,token_hash,created_at,expires_at,created_by,role_id)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(id, Number(githubId), cleanLabel, JSON.stringify(permissions), tokenHash(token), createdAt, expiresAt, String(createdBy), String(roleId));
  return { id, label: cleanLabel, roleId: String(roleId), permissions, token, createdAt, expiresAt, revokedAt: null };
}

export function revokeForemanAccessKey(githubId, id) {
  return db.prepare(`UPDATE github_foreman_access_keys SET revoked_at=? WHERE id=? AND github_id=? AND revoked_at IS NULL`)
    .run(nowIso(), String(id || ''), Number(githubId)).changes > 0;
}
