import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const code = readFileSync(new URL('components.js', root), 'utf8');
const liveReports = readFileSync(new URL('components/finance/live-report-builders-v1.mjs', root), 'utf8');
const contracts = readFileSync(new URL('components/commercial/contracts-page-v1.mjs', root), 'utf8');
const styles = readFileSync(new URL('styles.css', root), 'utf8');

test('system report derives metrics from current operational state', () => {
  assert.match(liveReports, /const syncLiveSystemReportV1 = \(state\) =>/);
  assert.match(liveReports, /state\.cashSummary\?\.balanceCents/);
  assert.match(liveReports, /state\.operationalState\?\.stages/);
  assert.match(liveReports, /state\.publicLeads/);
  assert.match(liveReports, /id: "system-live"/);
  assert.match(code, /syncLiveSystemReportV1\(appStore\.get\(\)\);/);
});

test('finance exports and prints; contracts rows open the editable form', () => {
  assert.match(code, /data-v7-finance-print/);
  assert.match(code, /data-v7-finance-export/);
  assert.match(contracts, /page\.querySelectorAll\("\[data-contract-row\]"\)/);
  assert.match(contracts, /data-contract-preview-tab/);
});

test('leads embeds public page at two-thirds width and control accepts evidence', () => {
  assert.match(code, /admin-leads-public-frame-v1/);
  assert.match(code, /runtimeRouteV1\("\/leads"\)/);
  assert.match(styles, /grid-template-columns:minmax\(0,2fr\) minmax\(310px,1fr\)/);
  assert.match(code, /data-control-field-record/);
  assert.match(code, /data-control-field-status/);
  assert.match(code, /evidenceUri: evidenceUri \|\| undefined/);
});
