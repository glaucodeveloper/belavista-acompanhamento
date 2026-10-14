import { test, expect } from "@playwright/test";

test("Dashboard mantém adição de entrada e registra atividade na página dedicada", async ({ page }) => {
  await page.addInitScript(() => {
    const date = new Date();
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    localStorage.setItem("belavista.agenda-calendar.v3", JSON.stringify({
      version: 3,
      initialized: true,
      events: [{
        id: "e2e-activity-record",
        title: "Inspecionar rede de água",
        activityName: "Inspecionar rede de água",
        stageKey: "water",
        stageName: "Rede de Água",
        date: today,
        start: "08:00",
        owner: "Ana Costa",
        status: "Planejado",
        requirements: [],
        materials: [],
      }],
    }));
  });
  await page.goto("/?view=control&_bv=central-lot-analysis-v1");
  const chat = page.locator("[data-worker-context-assistant]");
  if (!(await chat.getAttribute("class")).includes("is-collapsed")) await chat.locator("[data-worker-chat-minimize]").click();

  await expect(page.locator("[data-stage-record-center]")).toBeVisible();
  await expect(page.locator("[data-stage-center-documents]")).toHaveCount(0);
  await expect(page.locator(".stage-record-table-section.stage-center-panel")).toHaveCount(0);
  await expect(page.locator(".stage-record-estimate-board")).toHaveCount(0);
  await expect(page.locator("[data-stage-dashboard-quick-capture]")).toBeVisible();
  await expect(page.locator("[data-dashboard-quick-entry]")).toBeVisible();
  await expect(page.locator("[data-dashboard-agenda]")).toBeVisible();
  await expect(page.locator("[data-dashboard-action-workspace] .action-workspace")).toBeVisible();
  await expect(page.locator("[data-dashboard-quick-record]")).toHaveCount(0);
  await expect(page.locator("[data-stage-center-lot-analysis]")).toBeVisible();
  await expect(page.getByText("Quadro de lotes, ocupação e valor", { exact: true })).toBeVisible();
  await expect(page.getByText("Resumo por quadra", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Etapas", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Abrir cronograma/i })).toHaveCount(0);

  const entry = page.locator("[data-dashboard-quick-entry]");
  await entry.locator('[name="lot"]').fill("QA-1");
  await entry.locator('[name="amount"]').fill("12500");
  await entry.getByRole("button", { name: /Adicionar entrada/i }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("belavista.ui-memory.v1") || "{}").state?.repasseEntries?.some((item) => item.lot === "QA-1" && item.gross === 12500))).toBe(true);

  await page.locator('[data-dashboard-agenda-open="e2e-activity-record"]').click();
  const detailForm = page.locator("[data-agenda-detail-form]"),
    recordForm = page.locator("[data-activity-quick-record]");
  await expect(detailForm).toBeVisible();
  await expect(recordForm).toBeVisible();
  await expect(recordForm.locator('[name="stageKey"]')).toHaveValue("water");
  await expect(recordForm.locator('[name="activity"]')).toHaveValue("Inspecionar rede de água");
  await expect(recordForm.locator('[name="responsible"]')).toHaveValue("Ana Costa");
  expect(await detailForm.evaluate((form) => Boolean(form.compareDocumentPosition(document.querySelector("[data-agenda-activity-record-panel]") ) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);

  await recordForm.locator('[name="detail"]').fill("Medição e inspeção visual concluídas.");
  await recordForm.getByRole("button", { name: /Adicionar registro/i }).click();
  await expect(page.locator("[data-activity-record-feedback]")).toContainText(/adicionado à etapa Rede de Água/);
  await expect.poll(() => page.evaluate(() => globalThis.__belavistaAppStore?.get().records?.some((item) => item.activityEventId === "e2e-activity-record" && item.stageKey === "water" && item.atividade === "Inspecionar rede de água" && item.detalhes === "Medição e inspeção visual concluídas."))).toBe(true);
});
