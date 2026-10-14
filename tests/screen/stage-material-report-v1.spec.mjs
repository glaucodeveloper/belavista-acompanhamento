import {test, expect} from "@playwright/test";

test("relatório da etapa seleciona, agrupa propriedades OCR e imprime a seleção", async ({page}, testInfo) => {
  await page.route("**/api/records", (route) => route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify({records: []})}));
  await page.goto("/?view=stages&_bv=stage-material-report-v1");
  await page.locator('.sidebar .nav-item[data-view="stages"]').click();
  const chat = page.locator("[data-worker-context-assistant]");
  if (await chat.count() && !(await chat.getAttribute("class")).includes("is-collapsed")) {
    await chat.locator("[data-worker-chat-minimize]").click();
  }

  await expect(page.locator("[data-stage-home-page]")).toBeVisible();
  await expect(page.locator("[data-stage-home-record-resources]")).toBeVisible();
  await expect(page.locator(".stage-view-links button")).toHaveCount(1);
  await expect(page.locator(".stage-view-links button")).toContainText("Gantt");
  await expect(page.locator(".stage-record-center-head")).toHaveCount(0);
  await page.evaluate(() => {
    const additions = [
      {
        id: "report-cimento",
        name: "Cimento CP-II",
        stageKey: "water",
        stageName: "Rede de Água",
        activityName: "Assentamento da adutora",
        scope: "Argamassa para assentamento",
        quantity: 18,
        unit: "sacos",
        status: "Conferido",
        source: "chat-visual",
        properties: [
          {id: "allocation_source", label: "Origem", value: "Assistente operacional · OCR"},
          {id: "supplier", label: "Fornecedor", value: "Obra Norte"},
        ],
      },
      {
        id: "report-areia",
        name: "Areia média",
        stageKey: "water",
        stageName: "Rede de Água",
        activityName: "Assentamento da adutora",
        scope: "Preparo de argamassa",
        quantity: 2.5,
        unit: "m³",
        status: "Planejado",
        source: "chat-visual",
        properties: [{id: "supplier", label: "Fornecedor", value: "Obra Norte"}],
      },
      {
        id: "report-tubo",
        name: "Tubo PVC DN 100",
        stageKey: "water",
        stageName: "Rede de Água",
        activityName: "Teste de pressão",
        scope: "Trecho principal",
        quantity: 24,
        unit: "m",
        status: "Em andamento",
        source: "chat-visual",
        properties: [{id: "supplier", label: "Fornecedor", value: "Hidromateriais"}],
      },
      {
        id: "report-outro-estagio",
        name: "Cabo flexível",
        stageKey: "electrical",
        stageName: "Rede Elétrica",
        activityName: "Instalação dos circuitos",
        scope: "Alimentação dos quadros",
        quantity: 30,
        unit: "m",
        status: "Planejado",
        source: "chat-visual",
      },
    ];
    globalThis.__belavistaAppStore.set({
      materialCatalogAdditions: additions,
      records: [{id: "report-service", stageKey: "water", stageName: "Rede de Água", activityName: "Instalação de válvula", detalhes: "Montagem registrada em campo", allocationTarget: "service", source: "chat-visual", status: "Em andamento", properties: [{id: "allocation_source", label: "Origem", value: "Assistente operacional · OCR"}], attachments: []}],
      selectedStageV9: "water",
      selectedStage: "water",
      controlStageCenterTab: "materials",
    });
    window.__reportPrintCount = 0;
    window.print = () => { window.__reportPrintCount += 1; };
  });

  await expect(page.locator("[data-stage-home-resource-stage]")).toHaveValue("water");
  await expect(page.locator("[data-stage-home-record-resources] [data-stage-center-material-row]")).toHaveCount(3);
  await expect(page.locator("[data-stage-home-record-resources]")).not.toContainText("Cabo flexível");

  const reportButton = page.locator("[data-stage-material-report-open]");
  await expect(reportButton).toBeVisible();
  await page.evaluate(() => document.querySelector("[data-stage-material-report-open]")?.click());
  const dialog = page.locator("[data-stage-material-report-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".stage-material-report-group")).toHaveCount(2);
  await expect(dialog.locator("[data-material-report-column='property:supplier']")).toBeVisible();
  await page.screenshot({path: testInfo.outputPath("stage-material-report-config.png"), fullPage: false});
  await page.setViewportSize({width: 390, height: 844});
  const mobileDialog = await dialog.boundingBox();
  expect(mobileDialog).not.toBeNull();
  expect(mobileDialog.x).toBeGreaterThanOrEqual(0);
  expect(mobileDialog.x + mobileDialog.width).toBeLessThanOrEqual(390);
  await page.setViewportSize({width: 1440, height: 900});

  const groupActivity = dialog.locator("[data-material-report-group-field='activity']");
  await groupActivity.evaluate((input) => input.click());
  await expect(dialog.locator(".stage-material-report-group")).toHaveCount(1);
  await dialog.locator("[data-material-report-group-field='property:supplier']").evaluate((input) => input.click());
  await expect(dialog.locator(".stage-material-report-group")).toHaveCount(2);
  await expect(dialog.locator(".stage-material-report-group h3").filter({hasText: "Obra Norte"})).toBeVisible();

  await dialog.locator("[data-material-report-row-select][value='report-cimento']").evaluate((input) => input.click());
  const printSelected = dialog.locator("[data-material-report-print-selected]");
  await expect(printSelected).toBeEnabled();
  await printSelected.click();
  await expect.poll(() => page.evaluate(() => window.__reportPrintCount)).toBe(1);
  await expect(dialog.locator("[data-material-report-groups] tbody tr")).toHaveCount(1);
  await expect(dialog.locator("[data-material-report-groups]")).toContainText("Cimento CP-II");
  await expect(dialog.locator("[data-material-report-groups]")).not.toContainText("Areia média");
  await expect(page.locator("body")).toHaveClass(/stage-material-report-printing/);
  await page.emulateMedia({media: "print"});
  await page.screenshot({path: testInfo.outputPath("stage-material-report-print.png"), fullPage: false});
  await page.emulateMedia({media: "screen"});
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("body")).not.toHaveClass(/stage-material-report-printing/);
  await dialog.locator("[data-material-report-close]").evaluate((button) => button.click());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Etapas mostra a lista de serviços assistidos associada à etapa selecionada", async ({page}) => {
  await page.route("**/api/records", (route) => route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify({records: []})}));
  await page.goto("/?view=stages&_bv=stage-home-services-v1");
  await page.locator('.sidebar .nav-item[data-view="stages"]').click();
  const chat = page.locator("[data-worker-context-assistant]");
  if (await chat.count() && !(await chat.getAttribute("class")).includes("is-collapsed")) {
    await chat.locator("[data-worker-chat-minimize]").click();
  }
  await page.evaluate(() => {
    const current = globalThis.__belavistaAppStore.get();
    globalThis.__belavistaAppStore.set({
      records: [{id: "stage-service-water", stageKey: "water", stageName: "Rede de Água", activityName: "Instalação de válvula", detalhes: "Montagem registrada em campo", allocationTarget: "service", source: "chat-visual", status: "Em andamento", properties: [{id: "allocation_source", label: "Origem", value: "Assistente operacional · OCR"}], attachments: []}],
      selectedStageV9: "water",
      selectedStage: "water",
      controlStageCenterTab: "services",
      lastAction: current.lastAction,
    });
  });
  await expect(page.locator("[data-stage-home-page]")).toBeVisible();
  await expect(page.locator("[data-stage-home-record-resources] [data-stage-record-center-tab='services']")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-stage-home-record-resources] [data-stage-center-service-row]")).toHaveCount(1);
  await expect(page.locator("[data-stage-home-record-resources]")).toContainText("Instalação de válvula");
});
