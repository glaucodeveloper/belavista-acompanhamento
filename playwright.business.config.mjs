import {defineConfig} from '@playwright/test';
import base from './playwright.config.mjs';
export default defineConfig({
  ...base,testMatch:'business-interface.spec.mjs',workers:1,
  outputDir:'output/business-interface-results',
  reporter:[['list'],['html',{outputFolder:'output/business-interface-report',open:'never'}],['json',{outputFile:'output/business-interface-results.json'}]],
  use:{...base.use,serviceWorkers:'block'},
});
