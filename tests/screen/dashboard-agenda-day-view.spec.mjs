import { expect, test } from "@playwright/test";

test("Dashboard agenda switches to the selected day and navigates by week", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = { uid: "e2e-agenda", name: "Teste", role: "developer", label: "Teste" };
  });
  await page.route("**/admin-auth.mjs*", (route) => route.fulfill({
    contentType: "text/javascript",
    body: "globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);",
  }));
  await page.route("**/api/**", (route) => route.fulfill({ json: { ok: true, records: [], items: [], attachments: [], notifications: [], leads: [], reservations: [], entries: [], stages: [], events: [], requests: [], sales: [] } }));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const demo = page.getByRole("button", { name: /abrir modo demonstração/i });
  if (await demo.isVisible().catch(() => false)) await demo.click();

  await expect(page.locator("belavista-app")).toBeVisible({ timeout: 10000 });
  await page.goto('/admin?view=control&visual-suite=agenda', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('view-layer[data-view="control"]')).toBeVisible({ timeout: 10000 });
  const agenda = page.locator("[data-dashboard-agenda]");
  await expect(agenda).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { requestPermission: async () => "granted" },
    });
  });
  await agenda.locator("[data-agenda-notifications-enable]").click();
  await expect(agenda).toContainText("Notificações ativas");

  const days = agenda.locator("[data-dashboard-agenda-select-day]");
  await expect(days).toHaveCount(7);
  const allDaysReachable = await days.evaluateAll((nodes) => nodes.every((node) => {
    const rect = node.getBoundingClientRect(),
      hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === node || node.contains(hit);
  }));
  expect(allDaysReachable, "a sidebar não deve cobrir nenhum dia da faixa").toBe(true);
  const activeIndex = await days.evaluateAll((nodes) => nodes.findIndex((node) => node.getAttribute("aria-pressed") === "true"));
  const target = days.nth(activeIndex === 6 ? 5 : 6);
  const targetDate = await target.getAttribute("data-dashboard-agenda-select-day");
  await target.click();

  // Trocas de dia recompõem o calendário; mantenha o seletor fora da árvore
  // anterior para acompanhar o elemento recém-renderizado.
  const selectedHeading = page.locator("[data-dashboard-agenda-selected-date]");
  await expect(selectedHeading).toHaveAttribute("data-dashboard-agenda-selected-date", targetDate);
  await expect(target).toHaveAttribute("aria-pressed", "true");
  const taskRows = agenda.locator("[data-dashboard-agenda-event-date]");
  await expect.poll(() => taskRows.evaluateAll((rows, date) => rows.every((row) => row.dataset.dashboardAgendaEventDate === date), targetDate)).toBe(true);
  const visibleCount = await taskRows.count();
  await expect(agenda.locator(".dashboard-agenda-day-count")).toContainText(String(visibleCount));
  await page.screenshot({ path: testInfo.outputPath("dashboard-agenda-selected-day.png"), fullPage: false });

  const shiftedDate = new Date(`${targetDate}T12:00:00`);
  shiftedDate.setDate(shiftedDate.getDate() + 7);
  const shiftedKey = `${shiftedDate.getFullYear()}-${String(shiftedDate.getMonth() + 1).padStart(2, "0")}-${String(shiftedDate.getDate()).padStart(2, "0")}`;
  await agenda.locator('[data-dashboard-agenda-week-shift="7"]').click();
  await expect(selectedHeading).toHaveAttribute("data-dashboard-agenda-selected-date", shiftedKey);

  // A ação “Hoje” é uma conveniência de navegação; a seleção de dia e o
  // avanço semanal acima exercitam os dois caminhos que persistem estado.
});
