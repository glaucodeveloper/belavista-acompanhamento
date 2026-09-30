import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { REPASSE_PRICE_CATALOG } from '../../../repasse-price-catalog.mjs';
import { executionModel } from '../../../state.js';

const read = async (relative) => readFile(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
const snapshot = JSON.parse(await read('../public/data/original-snapshot.json'));
const application = await read('../public/ruby/application.rb');
const pages = await read('../public/ruby/native-pages.rb');

assert.equal(snapshot.lots.length, REPASSE_PRICE_CATALOG.filter((lot) => lot.lot > 0 && lot.area > 0 && lot.price > 0).length);
assert.equal(snapshot.stages.length, executionModel.stages.length);
assert.ok(snapshot.records.length > 0);
assert.ok(!application.includes('url: legacy_url'));
assert.ok(application.includes('render_original_page'));
assert.ok(pages.includes('def render_instagram_prompt_page'));
assert.ok(application.includes('id: "instagram-browser"'));
console.log('Ruby port: original data parity and native page dispatch verified.');
