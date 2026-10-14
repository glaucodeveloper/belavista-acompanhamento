import {test,expect} from '@playwright/test';

test('página pública de leads usa satélite estático com marcações de lotes e mantém o atendimento NVIDIA no backend',async({page})=>{
  const requests=[];
  page.on('request',request=>requests.push(request.url()));
  await page.goto('/leads',{waitUntil:'domcontentloaded'});
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','./lead-manifest.webmanifest');
  await expect(page.getByRole('heading',{name:/escolha seu lote/i})).toBeVisible();
  await expect(page.locator('public-lead-chat')).toBeVisible();
  await expect(page.locator('.public-chat-message')).toContainText(/bem-vindo ao aliança park/i);
  const map=page.locator('.public-map-sticky map-scene').first();
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-public-static-only','true');
  await expect(map).toHaveAttribute('data-render-mode','static-satellite-markers');
  await expect(map).toHaveAttribute('data-public-three','disabled-static-only');
  await expect(map).toHaveAttribute('data-public-static-state','static-base-loaded',{timeout:10_000});
  await expect(page.locator('.public-map-sticky .public-static-lot-markers')).toBeVisible({timeout:10_000});
  await expect.poll(()=>page.locator('.public-static-lot-marker').count(),{timeout:10_000}).toBeGreaterThan(0);
  expect(requests.some(url=>/NVIDIA_API_KEY/i.test(url))).toBe(false);
});

test('mapa público mantém a captura local e as marcações mesmo sem renderer 3D',async({page})=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.180.0/**',route=>route.abort());
  await page.goto('/leads',{waitUntil:'domcontentloaded'});

  const map=page.locator('.public-map-sticky map-scene').first();
  await expect(map).toHaveAttribute('data-public-static-only','true');
  await expect(map).toHaveAttribute('data-public-three','disabled-static-only');
  await expect(map).toHaveAttribute('data-public-static-base-ready','true',{timeout:10_000});
  await expect(map.locator('[data-map-3d-loading]')).toBeHidden();
  await expect(page.locator('.public-map-static-bg')).toBeVisible();
  await expect.poll(()=>page.locator('.public-static-lot-marker').count(),{timeout:10_000}).toBeGreaterThan(0);
  await expect(map).toHaveAttribute('data-public-static-state',/static-(base-loaded|base-ready|fallback)/);
});
