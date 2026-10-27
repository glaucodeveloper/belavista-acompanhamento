/*
 * Shared activity form surface.
 *
 * The installation session and the worker activity editor intentionally use
 * the same semantic groups.  Keeping the component as a small iterator makes
 * the markup reusable without introducing a framework into the admin shell.
 */
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const optionMarkup=(items,selected)=>items.map(item=>{
  const option=typeof item==='string'?{key:item,name:item}:item||{};
  return `<option value="${esc(option.key||option.name)}"${String(option.key||option.name)===String(selected||'')?' selected':''}>${esc(option.name||option.key)}</option>`;
}).join('');

export const ActivityFormGroups=({props={},children=[]}={})=>({
  next(message={}){
    const model={...props,...message},draft=model.draft||{},stageOptions=Array.isArray(model.stageOptions)?model.stageOptions:[],natureOptions=Array.isArray(model.natureOptions)&&model.natureOptions.length?model.natureOptions:['Execução operacional'],stageName=model.stageName||stageOptions.find(item=>String(item?.key||item)===String(draft.stageKey||''))?.name||draft.stageKey||'Etapa não definida',lockedStage=model.lockStage===true,lockedNature=model.lockNature===true;
    const stageField=lockedStage
      ? `<input type="text" value="${esc(stageName)}" readonly><input type="hidden" name="stageKey" value="${esc(draft.stageKey||model.stageKey||'')}">`
      : `<select name="stageKey" data-installation-stage>${optionMarkup(stageOptions,draft.stageKey||model.stageKey)}</select>`;
    const natureField=lockedNature
      ? `<input type="text" name="nature" value="${esc(draft.nature||natureOptions[0]||'Execução operacional')}" readonly>`
      : `<select name="nature" data-installation-nature><option value="">Selecionar natureza</option>${optionMarkup(natureOptions,draft.nature)}</select>`;
    const releaseValue=draft.release||model.release||'';
    return {done:false,value:`<div class="activity-form-groups activity-form-groups-v1" data-activity-form-groups="${esc(model.mode||'activity')}">
      <fieldset class="activity-form-group"><legend><span>01</span> Identidade e vínculo</legend><div class="activity-form-grid">
        <label>Etapa${stageField}<small>A atividade nasce dentro desta frente.</small></label>
        <label>Natureza${natureField}<small>O tipo orienta os campos e as propagações.</small></label>
        <label class="wide">Nome da atividade<input name="name" value="${esc(draft.name||model.name||'')}" placeholder="Ex.: Registrar medição do trecho" required><small>Use uma ação observável: registrar, comprar, medir, fechar ou validar.</small></label>
      </div></fieldset>
      <fieldset class="activity-form-group"><legend><span>02</span> Descrição, medição e local</legend><div class="activity-form-grid">
        <label class="wide">Descrição operacional<textarea name="description" rows="4" placeholder="O que entra, o que acontece e qual saída deve alimentar o sistema?">${esc(draft.description||model.description||'')}</textarea><small>O worker usa este texto para orientar a execução e a leitura da IA.</small></label>
        <label>Unidade de produção<input name="unit" value="${esc(draft.unit||model.unit||'')}" placeholder="m, m², un., viagem, registro" required><small>Base usada no avanço e na agenda.</small></label>
        <label>Alvo / local inicial<input name="target" value="${esc(draft.target||model.target||'')}" placeholder="Trecho, lote, frente ou documento"><small>Vínculo espacial ou documental opcional.</small></label>
      </div></fieldset>
      <fieldset class="activity-form-group"><legend><span>03</span> Responsabilidade e saída</legend><div class="activity-form-grid">
        <label>Responsável / encarregado<input name="responsible" value="${esc(draft.responsible||model.responsible||'')}" placeholder="Nome ou equipe" required><small>Quem confirma o fato antes da propagação.</small></label>
        <label>Saída / critério de aceite<input name="release" value="${esc(releaseValue)}" placeholder="Ex.: Medição aceita e próximo trecho liberado"><small>Condição que alimenta a próxima atividade.</small></label>
        <label class="wide">Evidência e propagação<textarea name="evidence" rows="3" placeholder="Foto, medição, documento, aceite ou condição que deve ser propagada">${esc(draft.evidence||model.evidence||'')}</textarea><small>Registros e comprovantes permanecem auditáveis no diário do worker.</small></label>
      </div></fieldset>${children.join('')}
    </div>`};
  }
});

const renderActivityFormGroupsLegacyV1=props=>ActivityFormGroups({props}).next().value;

let atlasActivityFormGroupsRendererV1=null;

/** Register the typed renderer after the host loads the component monolith. */
export const setActivityFormGroupsRendererV1=renderer=>{
  atlasActivityFormGroupsRendererV1=typeof renderer==='function'?renderer:null;
  return atlasActivityFormGroupsRendererV1!==null;
};

/** Prefer the registered typed renderer; retain the local implementation as fallback. */
export const renderActivityFormGroupsV1=props=>
  typeof atlasActivityFormGroupsRendererV1==='function'
    ? atlasActivityFormGroupsRendererV1(props||{})
    : renderActivityFormGroupsLegacyV1(props);
