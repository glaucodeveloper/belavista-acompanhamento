import { test, expect } from '@playwright/test';

test('web asks for PAT when session is invalid and stores only encrypted PAT locally', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('belavista.github.session.v1', `bvs_${'0'.repeat(64)}`));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Conectar ao repositório' })).toBeVisible();
  await expect(page.locator('.belavista-auth-status')).toHaveText('Informe um PAT com acesso ao repositório.');
  const screenshot = testInfo.outputPath('github-pat-auth-gate.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach('github-pat-auth-gate.png', { path: screenshot, contentType: 'image/png' });

  const result = await page.evaluate(async () => {
    const { saveGithubPat, readGithubPat, clearGithubPat } = await import('/github-pat-vault-v1.mjs');
    const marker = 'github_pat_codex_vault_probe_20261017';
    try {
      await saveGithubPat(marker);
      const restored = await readGithubPat();
      const localStorageText = Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index);
        return `${key || ''}:${key ? localStorage.getItem(key) || '' : ''}`;
      }).join('\n');
      const records = await new Promise((resolve, reject) => {
        const request = indexedDB.open('belavista-auth-v1', 1);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('secrets', 'readonly');
          const getAll = transaction.objectStore('secrets').getAll();
          getAll.onsuccess = () => { resolve(getAll.result); database.close(); };
          getAll.onerror = () => { reject(getAll.error); database.close(); };
        };
        request.onerror = () => reject(request.error);
      });
      return {
        restored,
        localStorageContainsPat: localStorageText.includes(marker),
        indexedDbContainsPlainPat: JSON.stringify(records).includes(marker),
      };
    } finally {
      await clearGithubPat();
    }
  });

  expect(result.restored).toBe('github_pat_codex_vault_probe_20261017');
  expect(result.localStorageContainsPat).toBe(false);
  expect(result.indexedDbContainsPlainPat).toBe(false);
});
