// Compatibility bootstrap for older public page shells. The application entry
// and all route orchestration belong to the TypeScript program.
const leadSurface = document.querySelector('public-leads-surface');
if (leadSurface && leadSurface.dataset.appEntry !== 'public-leads') {
  leadSurface.dataset.appEntry = 'public-leads';
}

await import('./dist/frontend/main.js?v=atlas-public-compat-entry-ts-v2&ts-public-program-entry-owner-v2&ts-public-map-registration-program-owner-v1&ts-ui-memory-lot-board-json-v1');
