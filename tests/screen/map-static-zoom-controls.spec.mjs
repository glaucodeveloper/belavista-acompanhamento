import { test, expect } from "@playwright/test";

test("mapa satélite estático amplia e desloca a planta pela interação direta", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const map = page.locator('map-scene[data-public-static-only="true"]').first();
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute(
    "data-static-map-gestures",
    "drag-pan + wheel + shift-drag-zoom",
    { timeout: 15_000 },
  );

  const bounds = await map.boundingBox();
  expect(bounds?.width).toBeGreaterThan(200);
  expect(bounds?.height).toBeGreaterThan(200);

  const initialScale = await map.evaluate(
    (element) => Number(element.style.getPropertyValue("--static-map-zoom") || 1),
  );
  await page.mouse.move(bounds.x + bounds.width * 0.42, bounds.y + bounds.height * 0.42);
  await page.mouse.wheel(0, -120);
  await expect(map).toHaveAttribute("data-static-map-zoom", /\d+%/);

  const wheelScale = await map.evaluate((element) =>
    Number(element.style.getPropertyValue("--static-map-zoom")),
  );
  expect(wheelScale).toBeGreaterThan(initialScale);

  const dragStartX = bounds.x + bounds.width * 0.05;
  await page.mouse.move(dragStartX, bounds.y + bounds.height * 0.88);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(dragStartX, bounds.y + bounds.height * 0.82, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Shift");

  const dragScale = await map.evaluate((element) =>
    Number(element.style.getPropertyValue("--static-map-zoom")),
  );
  expect(dragScale).toBeGreaterThan(wheelScale);

  const panBefore = await map.getAttribute("data-static-map-pan");
  await page.mouse.move(bounds.x + bounds.width * 0.61, bounds.y + bounds.height * 0.54);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.46, bounds.y + bounds.height * 0.42, { steps: 5 });
  await page.mouse.up();
  await expect(map).toHaveAttribute("data-static-map-pan", /-?\d+,-?\d+/);
  expect(await map.getAttribute("data-static-map-pan")).not.toBe(panBefore);

  await page.mouse.move(bounds.x + bounds.width * 0.42, bounds.y + bounds.height * 0.42);
  await page.mouse.wheel(0, 120);
  const wheelOutScale = await map.evaluate((element) =>
    Number(element.style.getPropertyValue("--static-map-zoom")),
  );
  expect(wheelOutScale).toBeLessThan(dragScale);

  const transforms = await map.evaluate((element) => [
    getComputedStyle(element.querySelector(".map-host")).transform,
    getComputedStyle(element.querySelector(".admin-masterplan-overlay")).transform,
  ]);
  expect(transforms[0]).not.toBe("none");
  expect(transforms[0]).toBe(transforms[1]);
});
