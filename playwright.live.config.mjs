import { defineConfig } from '@playwright/test';
import base from './playwright.config.mjs';

const port = Number(process.env.PORT || 8080);

export default defineConfig({
  ...base,
  reporter: [['list'], ['html', { outputFolder: 'output/playwright-live-report', open: 'never' }]],
  use: {
    ...base.use,
    baseURL: process.env.BELAVISTA_E2E_URL || `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: 'node server.mjs',
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
