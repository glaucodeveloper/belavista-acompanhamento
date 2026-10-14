import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("assistente operacional troca o perfil de speaker e reproduz a prévia local", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {},
        getVoices: () => [
          { name: "Microsoft Francisca Online (Natural) - Portuguese (Brazil)", lang: "pt-BR" },
          { name: "Microsoft Daniel Online (Natural) - Portuguese (Brazil)", lang: "pt-BR" },
        ],
        speak: (utterance) => {
          globalThis.__speakerPreview = {
            text: utterance.text,
            voice: utterance.voice?.name || "",
            rate: utterance.rate,
            pitch: utterance.pitch,
          };
        },
      },
    });
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; this.lang = ""; this.rate = 1; this.pitch = 1; this.voice = null; }
    };
    globalThis.BELAVISTA_DISABLE_SERVICE_WORKER = true;
    globalThis.BELAVISTA_ADMIN_ACTOR = { uid: "e2e-speaker", name: "Teste", role: "developer" };
  });
  await page.route("**/admin-auth.mjs*", route => route.fulfill({
    contentType: "text/javascript",
    body: "globalThis.BELAVISTA_ADMIN_AUTH_REQUIRED=false;globalThis.BELAVISTA_ADMIN_AUTH_READY=Promise.resolve(true);",
  }));
  await page.route("**/api/**", route => route.fulfill({ json: { ok: true, records: [], items: [], attachments: [], notifications: [], leads: [], reservations: [], entries: [], stages: [], events: [], requests: [], sales: [] } }));
  await page.goto("/admin?demo=1&view=map", { waitUntil: "domcontentloaded" });

  const chat = page.locator("[data-worker-context-assistant]");
  await expect(chat).toBeVisible({ timeout: 20_000 });
  const speaker = chat.locator("[data-worker-chat-speaker]");
  await expect(speaker).toHaveValue("operacional");
  await speaker.selectOption("narradora");
  await expect(speaker).toHaveValue("narradora");
  await chat.locator("[data-worker-chat-speaker-preview]").click();
  await expect.poll(() => page.evaluate(() => globalThis.__speakerPreview)).toMatchObject({
    voice: "Microsoft Francisca Online (Natural) - Portuguese (Brazil)",
    rate: .94,
    pitch: 1.06,
  });
});
