let fallbackLoad = null;

async function mountLegacyPage() {
  if (document.documentElement.dataset.publicRecordsOwner === 'mjs-fallback') return;
  const app = document.querySelector('atlas-public-field-records');
  const template = document.querySelector<HTMLTemplateElement>('#public-records-legacy-template');
  await import('./components.js?v=map-area-three-importmap-v1&ts-stage-agenda-application-program-owner-v1&ts-map-coordinate-policy-v1').catch(() => null);
  if (app && template) app.replaceWith(template.content.cloneNode(true));
  document.documentElement.dataset.publicRecordsOwner = 'mjs-fallback';
  await import('./public-records-legacy.js?v=field-records-legacy-v1');
}

window.addEventListener('atlas:public-records-fallback-requested', () => {
  fallbackLoad ||= mountLegacyPage().catch(error => {
    console.error('Falha ao carregar a compatibilidade de Registros Públicos.', error);
  });
});
