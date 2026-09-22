import {test,expect} from '@playwright/test';

test('página pública de leads carrega como PWA e mantém o atendimento NVIDIA no backend',async({page})=>{
  const requests=[];
  page.on('request',request=>requests.push(request.url()));
  await page.goto('/leads',{waitUntil:'domcontentloaded'});
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','./lead-manifest.webmanifest');
  await expect(page.getByRole('heading',{name:/escolha seu lote/i})).toBeVisible();
  await expect(page.locator('public-lead-chat')).toBeVisible();
  await expect(page.locator('.public-chat-message')).toContainText(/bem-vindo ao aliança park/i);
  await expect(page.locator('map-scene[data-public-map]')).toBeVisible();
  expect(requests.some(url=>/NVIDIA_API_KEY/i.test(url))).toBe(false);
});
