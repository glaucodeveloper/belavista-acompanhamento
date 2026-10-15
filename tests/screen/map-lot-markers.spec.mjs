import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function openAdmin(page, view) {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = {
      uid: "e2e-map-lot-markers",
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
        records: [],
        items: [],
        attachments: [],
        notifications: [],
        leads: [],
        reservations: [],
        entries: [],
        stages: [],
        events: [],
        requests: [],
        sales: [],
      },
    }),
  );
  await page.goto(`/admin?demo=1&view=${view}`, { waitUntil: "domcontentloaded" });
}

test("mapa principal libera números de lotes a partir de 1,5× e envia o contexto ao chat", async ({ page }, testInfo) => {
  await openAdmin(page, "map");
  const map = page.locator('map-scene[data-persistent-map="true"]').first();
  await expect(map).toBeVisible({ timeout: 20_000 });

  const markers = map.locator(".satellite-lot-plan-marker");
  // Os 272 números da prancha recebem marcador. Treze deles não possuem
  // polígono segmentado confiável, mas mantêm a âncora do círculo original.
  await expect.poll(() => markers.count(), { timeout: 20_000 }).toBe(272);
  const parcelHitAreas = map.locator(".satellite-lot-hit-area");
  await expect.poll(() => parcelHitAreas.count(), { timeout: 20_000 }).toBe(259);
  await expect(map).toHaveAttribute(
    "data-satellite-lot-plan",
    /polígonos UV do masterplan · alinhados à arte v2/,
  );
  await expect(map).toHaveAttribute("data-satellite-lot-markers", "272");
  // O enquadramento inicial aproxima a prancha com uma margem visual; por
  // isso os marcadores comerciais já podem estar disponíveis ao abrir.
  await expect(markers.first()).toBeVisible();
  const box = await map.boundingBox();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  // O mapa limita cada gesto de roda; faça os mesmos gestos que o usuário
  // faria até ultrapassar o limiar visual de 1,5×.
  for (let step = 0; step < 8; step += 1) await page.mouse.wheel(0, -420);
  await expect.poll(() => map.getAttribute("data-static-map-zoom"), { timeout: 10_000 }).toMatch(/1[5-9]\d%|[2-4]\d\d%/);
  await expect(markers.first()).toBeVisible();
  await expect(markers.first()).toHaveText("001");
  await expect(markers.last()).toHaveText("272");

  // A fileira de lotes sem verde contínuo continua usando o polígono
  // revisado da prancha, e não o retângulo de recuperação do DWG.
  const lot003Area = map.locator('.satellite-lot-hit-area[data-lot="Lote_003"]');
  await expect(lot003Area).toHaveCount(1);
  await expect(lot003Area).toHaveAttribute("data-lot-source", "pdf-reviewed-area");

  // O enquadramento central pode deixar os extremos da prancha fora do
  // viewport. Exercitamos um marcador que esteja realmente visível, como o
  // usuário faria, em vez de forçar o primeiro ID técnico da lista.
  const lotId = await markers.evaluateAll((nodes) => {
    const mapRect = nodes[0]?.closest("map-scene")?.getBoundingClientRect();
    if (!mapRect) return null;
    const node = nodes.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        rect.left >= mapRect.left && rect.right <= mapRect.right &&
        rect.top >= mapRect.top && rect.bottom <= mapRect.bottom;
    });
    return node?.dataset.lot || null;
  });
  expect(lotId).toMatch(/^Lote_\d{3}$/);
  const lotNumber = String(lotId).match(/\d+/)?.[0];
  const selectedMarker = map.locator(`.satellite-lot-plan-marker[data-lot="${lotId}"]`);
  await map.evaluate((mapNode) => {
    const node = mapNode.closest(".public-map-sticky") || mapNode;
    globalThis.__selectedMapLot = null;
    node.addEventListener("belavista:lot-marker-selected", (event) => {
      globalThis.__selectedMapLot = event.detail?.lotId || null;
    }, { once: true });
  });
  await selectedMarker.click();
  await expect.poll(() => page.evaluate(() => globalThis.__selectedMapLot)).toBe(lotId);
  await expect.poll(() => map.evaluate((mapNode) =>
    (mapNode.closest(".public-map-sticky") || mapNode).dataset.selectedLot,
  )).toBe(lotId);
  const chatInput = page.locator('[data-worker-context-assistant] textarea[name="message"]');
  await expect(chatInput).toHaveAttribute("data-lot-status-context", `Lote ${lotNumber}`);
  await expect(chatInput).toHaveAttribute("placeholder", `Pergunte sobre o status do Lote ${lotNumber}…`);
  await expect(chatInput).toHaveValue("");
  await page.screenshot({ path: testInfo.outputPath("mapa-uv-lote-001-chat.png"), fullPage: false });
});

test("mapa seletor em Valores por lote mostra e abre o controle pelo marcador", async ({ page }) => {
  await openAdmin(page, "brokers-board");
  const catalog = page.locator("[data-lot-price-catalog]");
  await expect(catalog).toBeVisible({ timeout: 20_000 });
  await expect(catalog.locator("header")).toContainText("01 · TABELA DE LOTES");
  await expect(catalog.locator("header")).toContainText("Valores por lote");

  const drawer = catalog.locator(".lot-catalog-map-drawer");
  await drawer.locator("summary").click();
  const map = drawer.locator("[data-lot-catalog-map]");
  await expect(map).toBeVisible();

  const markers = map.locator(".satellite-lot-plan-marker");
  await expect.poll(() => markers.count(), { timeout: 20_000 }).toBe(272);
  await expect(markers.first()).toBeVisible();
  await markers.first().click({ force: true });

  const modal = page.locator("body > .lot-status-modal[data-lot-floating-control]");
  await expect(modal).toBeVisible();
  await expect(modal.locator('[data-lot-flow-step="0"]')).toHaveClass(/is-active/);
  await expect(modal).toContainText("Marcador Lote 001 · selecione a quadra");
  const chatInput = page.locator('[data-worker-context-assistant] textarea[name="message"]');
  await expect(chatInput).toHaveAttribute("placeholder", "Pergunte sobre o status do Lote 001…");
  await expect(chatInput).toHaveValue("");
});
