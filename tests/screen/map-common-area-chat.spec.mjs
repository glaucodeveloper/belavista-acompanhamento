import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function openAdmin(page) {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = {
      uid: "e2e-common-area",
      name: "Teste",
      role: "developer",
      label: "Teste",
    };
  });
  await page.route("**/admin-auth.mjs*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);",
    }),
  );
  await page.route("**/api/**", (route) =>
    route.fulfill({
      json: {
        ok: true,
        records: [], items: [], attachments: [], notifications: [], leads: [],
        reservations: [], entries: [], stages: [], events: [], requests: [], sales: [],
      },
    }),
  );
  await page.goto("/admin?demo=1&view=map", { waitUntil: "domcontentloaded" });
}

test("área comum abre o chat sem envio automático e envia contexto somente quando a pessoa pergunta", async ({ page }, testInfo) => {
  await openAdmin(page);
  const map = page.locator('map-scene[data-persistent-map="true"]').first();
  await expect(map).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => map.getAttribute("data-static-map-initial-fit"), { timeout: 20_000 }).toBe("masterplan-centered-with-margin");
  await expect.poll(async () => Number.parseInt((await map.getAttribute("data-static-map-zoom")) || "0", 10)).toBeGreaterThan(150);
  const initialPlacement = await map.evaluate((node) => {
    const mapRect = node.getBoundingClientRect();
    const planRect = node.querySelector("[data-admin-masterplan-transform]")?.getBoundingClientRect();
    return planRect ? {
      horizontalOffset: planRect.left + planRect.width / 2 - (mapRect.left + mapRect.width / 2),
      verticalOffset: planRect.top + planRect.height / 2 - (mapRect.top + mapRect.height / 2),
      mapWidth: mapRect.width,
      mapHeight: mapRect.height,
    } : null;
  });
  expect(initialPlacement).toBeTruthy();
  expect(Math.abs(initialPlacement.horizontalOffset)).toBeLessThan(initialPlacement.mapWidth * 0.08);
  expect(Math.abs(initialPlacement.verticalOffset)).toBeLessThan(initialPlacement.mapHeight * 0.08);
  await page.screenshot({ path: testInfo.outputPath("mapa-inicial-enquadrado.png"), fullPage: false });

  const areas = map.locator(".satellite-common-area-hit-area");
  await expect.poll(() => areas.count(), { timeout: 20_000 }).toBeGreaterThan(0);

  const chatInput = page.locator('[data-worker-context-assistant] textarea[name="message"]');
  await areas.first().click({ force: true });

  await expect(map.locator(".satellite-common-area-context-widget")).toBeVisible();
  const mapOverlay = map.locator("[data-satellite-lot-plan-overlay]");
  await expect.poll(() => mapOverlay.getAttribute("data-map-context-widget-scale")).toMatch(/^0\./);
  const widget = map.locator(".satellite-common-area-context-widget");
  const marker = map.locator(".satellite-lot-plan-marker").first();
  await expect.poll(async () => Number(await widget.evaluate((node) => getComputedStyle(node).zIndex))).toBeGreaterThan(
    Number(await marker.evaluate((node) => getComputedStyle(node).zIndex)),
  );
  await expect(chatInput).toHaveAttribute("data-map-context-kind", "common-area");
  await expect(chatInput).toHaveAttribute("data-map-context-label", "Área comum do loteamento");
  await expect(chatInput).toHaveValue("");
  await expect(chatInput).toHaveAttribute("placeholder", "Pergunte sobre Área comum do loteamento…");
  const scaleAtBaseZoom = Number(await mapOverlay.getAttribute("data-map-context-widget-scale"));
  const baseMapZoom = Number.parseInt((await map.getAttribute("data-static-map-zoom")) || "100", 10) / 100;
  const targetMapZoom = Math.min(3.8, baseMapZoom * 1.35);
  await map.evaluate((node, targetZoom) => {
    node.style.setProperty("--static-map-zoom", String(targetZoom));
    node.dataset.staticMapZoom = `${Math.round(targetZoom * 100)}%`;
    node.syncSatelliteLotContextWidgetScaleV1?.(targetZoom);
  }, targetMapZoom);
  await expect.poll(() => mapOverlay.getAttribute("data-map-context-widget-zoom")).toBe(targetMapZoom.toFixed(3));
  const scaleAtDoubleZoom = Number(await mapOverlay.getAttribute("data-map-context-widget-scale"));
  expect(scaleAtDoubleZoom).toBeLessThan(scaleAtBaseZoom);
  expect(await widget.evaluate((node) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return matrix.a;
  })).toBeCloseTo(scaleAtDoubleZoom, 2);
  await page.screenshot({ path: testInfo.outputPath("area-comum-chat-contexto.png"), fullPage: false });

  let requestBody = null;
  await page.route("**/api/ai", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ json: { text: "Contexto da área comum recebido.", toolCalls: [] } });
  });
  await chatInput.fill("Qual é a manutenção prevista para esta área?");
  await page.locator("[data-worker-chat-submit]").click();
  await expect.poll(() => requestBody).toBeTruthy();
  expect(requestBody.context.mapContext).toEqual({
    kind: "common-area",
    label: "Área comum do loteamento",
  });
});

test("preserva a fileira de borda do PDF original sem reconstruir contornos e abre o contexto do lote", async ({ page }, testInfo) => {
  await openAdmin(page);
  const map = page.locator('map-scene[data-persistent-map="true"]').first();
  await expect(map).toBeVisible({ timeout: 20_000 });
  const markers = map.locator(".satellite-lot-plan-marker");
  // No technical fallback parcels or white replacement rectangles. The
  // commercial markers are independent of the original artwork coverage.
  await expect.poll(() => markers.count(), { timeout: 20_000 }).toBe(261);
  await expect(map.locator('[data-lot-source="canonical-trace-fallback"]')).toHaveCount(0);
  await expect(map.locator('.satellite-lot-visual-recovery-outline')).toHaveCount(0);
  const artwork=map.locator('[data-masterplan-original-pdf]');
  await expect.poll(()=>artwork.evaluate(img=>img.complete&&img.naturalWidth)).toBe(5840);
  // Sample the actual decoded asset at original-PDF coordinates: both
  // formerly erased exterior strips must be opaque and green.
  const samples=await artwork.evaluate(img=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    return [[4250,1050],[4500,1370],[4780,1690],[5360,2330],[6240,3480],[2440,4480],[2140,4780],[1830,5100],[1610,5420],[1330,5670]].map(([x,y])=>{
      ctx.clearRect(0,0,1,1);ctx.drawImage(img,x-800,y-400,1,1,0,0,1,1);
      return Array.from(ctx.getImageData(0,0,1,1).data);
    });
  });
  for(const [r,g,b,alpha] of samples) {
    expect(alpha).toBe(255);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  }
  const lot003 = map.locator('.satellite-lot-plan-marker[data-lot="Lote_003"]');
  await expect(lot003).toBeVisible();
  await lot003.click({ force: true });
  await expect(map.locator(".satellite-lot-context-widget").filter({ hasText: "Lote 003" }).last()).toBeVisible();
  await expect(page.locator('[data-worker-context-assistant] textarea[name="message"]'))
    .toHaveAttribute("placeholder", "Pergunte sobre o status do Lote 003…");
  await page.screenshot({ path: testInfo.outputPath("lotes-de-borda-recuperados.png"), fullPage: false });
});
