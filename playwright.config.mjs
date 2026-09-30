import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/screen',
  timeout:30_000,
  retries:0,
  reporter:[['list'],['html',{outputFolder:'output/playwright-report',open:'never'}]],
  use:{baseURL:process.env.BELAVISTA_E2E_URL||'http://127.0.0.1:8080',viewport:{width:1440,height:900},screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--disable-gpu','--disable-dev-shm-usage']}},
  webServer:{command:'node server.mjs',url:'http://127.0.0.1:8080/api/health',reuseExistingServer:true,timeout:15_000}
});
