import { expect, test } from "@playwright/test";

test("Histórico de movimentações não renderiza cabeçalho local e mantém a busca", async ({ page }, testInfo) => {
  await page.goto("/");
  const historyNav = page.locator('app-sidebar [data-view="sales-history"]');
  await expect(historyNav).toContainText("Histórico de movimentações");
  await historyNav.click();

  const view = page.locator('view-layer[data-view="sales-history"]');
  await expect(view.locator(".sales-history-head")).toHaveCount(0);
  await expect(view.locator(".sales-history-search-toolbar")).toBeVisible();
  await expect(view.locator("[data-history-search]")).toBeVisible();
  await expect(view.locator(":scope > .activity-header")).toContainText("Histórico de movimentações");
  await page.screenshot({ path: testInfo.outputPath("sales-history-without-page-head.png"), fullPage: false });
});

test("Histórico apresenta movimentações em cards detalhados com ação de relatório", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.locator('app-sidebar [data-view="sales-history"]').click();

  const cards = page.locator('view-layer[data-view="sales-history"] .sales-history-card');
  await expect(cards.first()).toBeVisible();
  await expect(cards.first().locator(".sales-history-card-summary")).toBeVisible();
  await expect(cards.first().locator(".sales-history-card-details")).toBeVisible();
  await expect(cards.first().locator("[data-history-open]")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("sales-history-carbon-cards.png"), fullPage: false });
});
