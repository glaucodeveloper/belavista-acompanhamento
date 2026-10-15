import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({ serviceWorkers: 'block' });

test('mapa aplica os pixels completos do PDF e mantém a calibração, sem contornos substitutos', async ({page}) => {
  test.setTimeout(60_000);
  // Authentication fixture only. The map/image, modules, geometry and API
  // reads are served by the running application, not fulfilled by this test.
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = {uid:'pdf-artwork-visual-test',name:'Teste visual',role:'developer'};
  });
  await page.route('**/admin-auth.mjs*', route => route.fulfill({contentType:'text/javascript',
    body:'globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);'}));
  await page.goto('/admin?demo=1&view=map&original-pdf-artwork-v3=1',{waitUntil:'domcontentloaded'});
  const map=page.locator('map-scene[data-persistent-map="true"]').first();
  await expect(map).toBeVisible({timeout:30_000});
  const artwork=map.locator('[data-masterplan-original-pdf]');
  await expect(artwork).toBeVisible();
  await expect.poll(()=>artwork.evaluate(img=>img.complete&&img.naturalWidth),{timeout:30_000}).toBe(5840);
  await expect(artwork).toHaveAttribute('src','/assets/public/alianca-park-masterplan-lot-overlay-v3.webp');
  const alignment=await artwork.evaluate(img=>{
    const reference=img.parentElement.getBoundingClientRect(), rect=img.getBoundingClientRect();
    const scale=Math.min(reference.width/2886,reference.height/3468);
    return {
      xError:Math.abs(rect.x-reference.x-((reference.width-2886*scale)/2-16.9*scale)),
      yError:Math.abs(rect.y-reference.y-((reference.height-3468*scale)/2-37.2*scale)),
      widthError:Math.abs(rect.width-5840*.512*scale),
      heightError:Math.abs(rect.height-7360*.512*scale),
      frame:JSON.parse(img.closest('map-scene').dataset.adminMasterplanFrame),
    };
  });
  for(const name of ['xError','yError','widthError','heightError']) expect(alignment[name],name).toBeLessThan(.1);
  expect(alignment.frame.left).toBeCloseTo(.2110515272100637,12);
  expect(alignment.frame.top).toBeCloseTo(.4572318077949459,12);
  await expect(map.locator('.satellite-lot-visual-recovery-outlines path')).toHaveCount(0);
  await expect.poll(()=>map.locator('.satellite-lot-plan-marker').count()).toBe(272);
  const syntheticStrokes=await map.locator('.satellite-lot-hit-area, .satellite-common-area-hit-area').evaluateAll(nodes=>
    nodes.filter(node=>getComputedStyle(node).stroke!=='none').length);
  expect(syntheticStrokes,'only the original PDF white lines may be drawn').toBe(0);
  // Reveal the whole map through the same minimize control the user uses.
  const minimize=page.getByRole('button',{name:'Minimizar assistente'});
  if(await minimize.isVisible()) await minimize.click();
  await expect(page.locator('[data-worker-context-assistant]')).toHaveClass(/is-collapsed/);
  const output=path.resolve('output/map-pdf-original');
  await fs.mkdir(output,{recursive:true});
  await page.screenshot({path:path.join(output,'mapa-original-completo.png')});

  async function zoomAtSource(x,y,filename) {
    const r=await artwork.boundingBox();
    const point={x:r.x+(x-800)/5840*r.width,y:r.y+(y-400)/7360*r.height};
    await page.mouse.move(point.x,point.y);
    const previous=await map.getAttribute('data-static-map-zoom');
    for(let i=0;i<3;i++) await page.mouse.wheel(0,-180);
    await expect.poll(()=>map.getAttribute('data-static-map-zoom')).not.toBe(previous);
    await page.mouse.move(20,200);
    await expect(map.locator('.satellite-lot-context-widget').first()).toBeHidden();
    await page.screenshot({path:path.join(output,filename)});
    for(let i=0;i<3;i++) await page.mouse.wheel(0,180);
  }
  await zoomAtSource(4880,1780,'fileira-norte-original.png');
  await zoomAtSource(1670,5240,'fileira-sudoeste-original.png');
});
