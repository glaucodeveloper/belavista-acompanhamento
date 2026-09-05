/* BELAVISTA_PAT_FREEZE_GUARD_V5364 */
(() => {
  if (globalThis.__BELAVISTA_PAT_FREEZE_GUARD_V5364) return;
  globalThis.__BELAVISTA_PAT_FREEZE_GUARD_V5364 = true;

  const TOKEN_RE = /^(?:github_pat_|ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]+$/;
  const SECRET_KEYS = new Set([
    'pat',
    'githubpat',
    'github_pat',
    'githubtoken',
    'github_token',
    'githubpersonalaccesstoken',
    'workersecretgithubpat'
  ]);

  const looksLikePat = value => TOKEN_RE.test(String(value || '').trim());

  const sanitizeObject = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 12) return value;

    if (Array.isArray(value)) {
      return value.map(item => sanitizeObject(item, depth + 1));
    }

    const out = {};
    for (const [key, raw] of Object.entries(value)) {
      const normalized = String(key).replace(/[^a-z0-9_]/gi, '').toLowerCase();

      if (normalized === 'workersecretgithubpat') {
        // This field stores the NAME of the Worker secret, never its value.
        out[key] = looksLikePat(raw) ? 'GITHUB_PAT' : (String(raw || '').trim() || 'GITHUB_PAT');
        continue;
      }

      if (SECRET_KEYS.has(normalized) && looksLikePat(raw)) {
        continue;
      }

      if (typeof raw === 'string' && looksLikePat(raw)) {
        // A PAT accidentally pasted into any normal configuration field is removed.
        continue;
      }

      out[key] = sanitizeObject(raw, depth + 1);
    }
    return out;
  };

  const rewriteJsonKey = key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const safe = sanitizeObject(parsed);
      const next = JSON.stringify(safe);
      if (next !== raw) {
        localStorage.setItem(key, next);
        return true;
      }
    } catch (error) {
      console.info(`[Belavista v5.3.64] não foi possível sanear ${key}`, error);
    }
    return false;
  };

  const changed = [
    'belavista.integrations.v1',
    'belavista.ui-memory.v1',
    'belavista.install.v1'
  ].some(rewriteJsonKey);

  try {
    localStorage.setItem(
      'belavista.pat-recovery.v5364',
      JSON.stringify({
        version: '5.3.64',
        changed,
        at: new Date().toISOString()
      })
    );
  } catch {}

  globalThis.BelavistaPatGuardV5364 = {
    looksLikePat,
    sanitizeObject,
    changed
  };
})();
