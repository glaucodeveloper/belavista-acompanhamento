import {test,expect} from '@playwright/test';

async function enterDemo(page){
  const demo=page.getByRole('button',{name:/abrir modo demonstração/i});
  try{await demo.waitFor({state:'visible',timeout:5000});await demo.click();}catch{}
  await expect(page.locator('belavista-app')).toBeVisible({timeout:10_000});
}

test('admin reutiliza o mapa satélite estático de leads com marcações de lotes',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await enterDemo(page);

  const map=page.locator('map-scene[data-persistent-map="true"]');
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-public-static-only','true');
  await expect(map).toHaveAttribute('data-render-mode','static-satellite-markers');
  await expect(map).toHaveAttribute('data-public-three','disabled-static-only');
  await expect.poll(()=>map.locator('.public-static-lot-marker').count(),{timeout:10_000}).toBeGreaterThan(0);
  await expect(map).toHaveAttribute('data-public-static-lot-markers',/\d+/);

  await map.locator('.public-static-lot-marker').first().click();
  await expect(map).toHaveAttribute('data-selected-kind','lots');
  await expect(map.locator('[data-public-lot-details-v5335]')).toBeVisible();
});
