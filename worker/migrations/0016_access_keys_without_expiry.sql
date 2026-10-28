-- Access keys stay active until an administrator revokes them.
-- Preserve revoked and already expired keys as-is.
UPDATE github_foreman_access_keys
SET expires_at = '9999-12-31T23:59:59.999Z'
WHERE revoked_at IS NULL
  AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
