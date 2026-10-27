const programTsV1 = await import('./dist/frontend/program.js?operational-details-program-owner-v1').catch(() => null);
const projectTsV1 = programTsV1?.projectAtlasOperationalDetailsV1;
const recoveryV1 = typeof projectTsV1 === 'function'
  ? null
  : await import('./activity-operational-details-legacy-v1.mjs?operational-details-recovery-v1').catch(() => null);

/** Compatibility entry: typed program projection first, archived MJS recovery otherwise. */
export function operationalDetailsFor(item, stageKey) {
  if (typeof projectTsV1 === 'function') return projectTsV1(item, stageKey);
  if (typeof recoveryV1?.operationalDetailsFor === 'function') return recoveryV1.operationalDetailsFor(item, stageKey);
  throw new Error('Projeção de detalhes operacionais indisponível.');
}
