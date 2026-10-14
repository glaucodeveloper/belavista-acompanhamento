import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("mapa inicia com a planta PDF centralizada e com margem", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = {
      uid: "e2e-map-initial-framing",
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
    route.fulfill({ json: { ok: true, records: [], items: [], attachments: [], notifications: [], leads: [], reservations: [], entries: [], stages: [], events: [], requests: [], sales: [] } }),
  );
  await page.goto("/admin?demo=1&view=map", { waitUntil: "domcontentloaded" });

  const map = page.locator('map-scene[data-persistent-map="true"]');
  await expect(map).toBeVisible({ timeout: 20_000 });
  await expect(map).toHaveAttribute(
    "data-static-map-initial-fit",
    "masterplan-centered-with-margin",
    { timeout: 20_000 },
  );
  await expect(map).toHaveAttribute("data-public-static-image", "loaded", {
    timeout: 20_000,
  });
  const framing = await map.evaluate((node) => {
    const scene = node.getBoundingClientRect();
    const masterplan = node.querySelector(".admin-masterplan-transform")?.getBoundingClientRect();
    if (!masterplan) return null;
    return {
      zoom: Number.parseFloat(node.dataset.staticMapZoom || "0"),
      offsetX: Math.abs(masterplan.x + masterplan.width / 2 - (scene.x + scene.width / 2)),
      offsetY: Math.abs(masterplan.y + masterplan.height / 2 - (scene.y + scene.height / 2)),
      sceneWidth: scene.width,
      sceneHeight: scene.height,
      planWidth: masterplan.width,
      planHeight: masterplan.height,
    };
  });
  expect(framing).not.toBeNull();
  expect(framing.zoom).toBeGreaterThanOrEqual(1.5);
  expect(framing.offsetX / framing.sceneWidth).toBeLessThan(0.07);
  expect(framing.offsetY / framing.sceneHeight).toBeLessThan(0.07);
  expect(framing.planWidth).toBeLessThan(framing.sceneWidth * 0.92);
  expect(framing.planHeight).toBeLessThan(framing.sceneHeight * 0.92);
  await page.screenshot({ path: testInfo.outputPath("mapa-enquadramento-inicial.png"), fullPage: false });
});
