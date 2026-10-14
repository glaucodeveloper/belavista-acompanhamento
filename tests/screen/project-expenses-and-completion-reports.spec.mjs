import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("Relatório operacional agrupa materiais OCR, permite selecionar e imprime o documento timbrado", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = { uid: "reports-e2e", name: "Teste de relatórios", role: "developer", label: "Teste" };
  });
  await page.route("**/admin-auth.mjs*", (route) => route.fulfill({
    contentType: "text/javascript",
    body: "globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);",
  }));
  await page.route("**/api/**", (route) => route.fulfill({ json: {
    ok: true, records: [], items: [], attachments: [], notifications: [], leads: [], reservations: [], entries: [], stages: [], events: [], requests: [], sales: [],
  }}));

  await page.goto("/admin?demo=1&view=stages&visual-suite=material-report", { waitUntil: "domcontentloaded" });
  await expect(page.locator("view-layer")).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => globalThis.__belavistaAppStore.set({
    selectedStageV9: "water", selectedStage: "water", activityDedicated: false, controlStageCenterTab: "materials",
    records: [
      { id: "MAT-01", stageKey: "water", stageName: "Rede de Água", activityName: "Assentar ramal", allocationTarget: "material", source: "chat-visual", name: "Tubo PEAD", materialName: "Tubo PEAD", quantity: 120, unit: "m", status: "Conferido", scope: "Tubulação da rede", properties: [{ label: "NF", value: "18502" }] },
      { id: "MAT-02", stageKey: "water", stageName: "Rede de Água", activityName: "Instalar válvula", allocationTarget: "material", source: "chat-visual", name: "Válvula de retenção", materialName: "Válvula de retenção", quantity: 2, unit: "un", status: "Pendente", scope: "Conjunto de válvulas", properties: [{ label: "Fornecedor", value: "Bahia Materiais" }] },
      { id: "MAT-03", stageKey: "drainage", stageName: "Drenagem Pluvial", activityName: "Assentar manilha", allocationTarget: "material", source: "chat-visual", name: "Manilha", materialName: "Manilha", quantity: 8, unit: "un", status: "Conferido" },
    ],
    materialCatalogAdditions: [
      { id: "material:MAT-01", sourceRecordId: "MAT-01", source: "chat-visual", stageKey: "water", stageName: "Rede de Água", activityName: "Assentar ramal", name: "Tubo PEAD", quantity: 120, unit: "m", status: "Conferido", scope: "Tubulação da rede", properties: [{ label: "NF", value: "18502" }] },
      { id: "material:MAT-02", sourceRecordId: "MAT-02", source: "chat-visual", stageKey: "water", stageName: "Rede de Água", activityName: "Instalar válvula", name: "Válvula de retenção", quantity: 2, unit: "un", status: "Pendente", scope: "Conjunto de válvulas", properties: [{ label: "Fornecedor", value: "Bahia Materiais" }] },
      { id: "material:MAT-03", sourceRecordId: "MAT-03", source: "chat-visual", stageKey: "drainage", stageName: "Drenagem Pluvial", activityName: "Assentar manilha", name: "Manilha", quantity: 8, unit: "un", status: "Conferido" },
    ],
  }));
  const resources = page.locator("[data-stage-home-record-resources]");
  await expect(resources).toBeVisible({ timeout: 20_000 });
  await resources.locator("[data-stage-home-resource-stage]").selectOption("water");
  await expect(resources.locator("[data-stage-center-material-row]")).toHaveCount(2);
  await expect(resources).toContainText("Tubo PEAD");
  await expect(resources).toContainText("Válvula de retenção");

  await page.evaluate(() => {
    globalThis.__materialReportPrintCalls = 0;
    window.print = () => { globalThis.__materialReportPrintCalls += 1; };
  });
  await resources.locator("[data-stage-material-report-open]").click();
  const dialog = page.locator("dialog[data-stage-material-report-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Relatório de materiais");
  await dialog.locator("[data-material-report-search]").fill("Tubo");
  await expect(dialog.locator("[data-material-report-row-select]")).toHaveCount(1);
  await dialog.locator("[data-material-report-select-all]").click();
  await expect(dialog.locator("[data-material-report-selection-count]")).toContainText("1 selecionado");
  await expect(dialog.locator("[data-material-report-print-selected]")).toBeEnabled();
  await dialog.locator("[data-material-report-print-selected]").click();
  await expect.poll(() => page.evaluate(() => globalThis.__materialReportPrintCalls)).toBe(1);
  await expect(page.locator(".stage-material-report-print-root")).toContainText("ALIANÇA PARK · RELATÓRIO OPERACIONAL");
  await expect(page.locator(".stage-material-report-print-root")).toContainText("Tubo PEAD");
  await page.screenshot({ path: testInfo.outputPath("relatorio-materiais-timbrado.png"), fullPage: false });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator(".stage-material-report-print-root")).toHaveCount(0);
});
