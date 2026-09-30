import {defineConfig} from '@playwright/test';
import base from './playwright.config.mjs';
export default defineConfig({...base,testMatch:'map-pdf-legends.spec.mjs',workers:1,timeout:60000,outputDir:'output/map-pdf-legends',reporter:[['list']]});
