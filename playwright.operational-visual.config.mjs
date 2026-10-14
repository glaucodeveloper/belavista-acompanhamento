import { defineConfig } from "@playwright/test";
import base from "./playwright.config.mjs";

export default defineConfig({
  ...base,
  testMatch: [
    "map-lot-markers.spec.mjs",
    "record-ocr-dynamic-v21.spec.mjs",
    "lots-toolbar-modal.spec.mjs",
    "dashboard-agenda-day-view.spec.mjs",
    "project-expenses-and-completion-reports.spec.mjs",
    "worker-chat-speaker.spec.mjs",
  ],
  workers: 1,
  retries: 0,
  outputDir: "output/operational-visual-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/operational-visual-report", open: "never" }],
    ["json", { outputFile: "output/operational-visual-results.json" }],
  ],
  use: { ...base.use, serviceWorkers: "block", screenshot: "on" },
});
