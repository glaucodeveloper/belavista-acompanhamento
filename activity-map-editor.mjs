import {ACTIVITY_MAP_STATUSES,physicalMapCatalog,inferActivityLocation} from './activity-map-intelligence.mjs';

const host=document.querySelector('[data-activity-map-editor]');
if(host&&!host.dataset.editorMounted){
  host.dataset.editorMounted='true';
  const stageKey=host.dataset.stage||'',activityId=host.dataset.activity||'',progress=Number(host.dataset.progress)||0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const actorHeaders=async()=>{const actor=globalThis.BELAVISTA_ADMIN_ACTOR||{};let token='';try{token=await globalThis.BELAVISTA_GET_ID_TOKEN?.()||'';}catch{}return {'content-type':'application/json','x-belavista-role':actor.role||'owner','x-belavista-user':actor.uid||'activity-map-editor',...(token?{authorization:`Bearer ${token}`}:{})};};
  const api=async(path,options={})=>{const response=await fetch(path,{cache:'no-store',...options,headers:{...(await actorHeaders()),...(options.headers||{})}});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);return payload;};
  await import('./components.js?v=ngrok-route-v1');
  await import('./public-leads-context-v521.mjs?v=activity-location-v3');
  await import('./activity-map-layer.mjs?v=activity-map-layer-v2');
  host.innerHTML=`<header class="activity-map-editor-head"><div><span class="eyebrow">LOCAL FÍSICO · LEITURA URBANA</span><h2>Onde esta atividade acontece</h2><p>Segure e arraste sobre o modelo para pintar lote por lote ou trecho por trecho.</p></div><span class="activity-map-source" data-map-source>aguardando mapa</span></header><div class="activity-map-understanding" data-map-understanding><span>Entrada</span><span>Avenida principal</span><span>Avenida lateral</span><span>Quadras numeradas</span><span>Área social</span></div><div class="activity-map-layout"><div class="activity-map-canvas"><map-scene data-public-map data-admin-shared-public-map="activity-editor" data-activity-location-editor data-base-map aria-label="Mapa 3D para marcar o local da atividade"></map-scene><div class="activity-map-wait" data-map-wait><i></i><b>Carregando geometria do loteamento</b><span>A marcação será liberada quando os polígonos estiverem prontos.</span></div></div><aside class="activity-map-tools"><label>Localidade compreendida<select data-map-zone><option value="custom">Seleção manual</option></select></label><label>Estado no mapa<select data-map-status>${Object.entries(ACTIVITY_MAP_STATUSES).map(([key,value])=>`<option value="${key}">${esc(value.label)}</option>`).join('')}</select></label><div class="activity-map-actions"><button type="button" class="button button-primary" data-map-paint>Ativar pintura</button><button type="button" class="button" data-map-infer>Sugerir pela IA</button><button type="button" class="button" data-map-clear>Limpar seleção</button></div><div class="activity-map-selection"><small>POLÍGONOS MARCADOS</small><strong data-map-selected>0</strong><span data-map-selected-copy>Nenhuma área vinculada.</span></div><label>Descrição do local<textarea rows="3" data-map-location-note placeholder="Ex.: trecho da avenida principal entre as quadras 2 e 3"></textarea></label><button type="button" class="button button-primary activity-map-save" data-map-save>Salvar marcação física</button><p class="activity-map-feedback" data-map-feedback>A marcação salva será refletida no mapa público e no dashboard.</p></aside></div>`;

  const map=host.querySelector('map-scene'),wait=host.querySelector('[data-map-wait]'),zoneSelect=host.querySelector('[data-map-zone]'),statusSelect=host.querySelector('[data-map-status]'),selectedCount=host.querySelector('[data-map-selected]'),selectedCopy=host.querySelector('[data-map-selected-copy]'),feedback=host.querySelector('[data-map-feedback]'),source=host.querySelector('[data-map-source]'),note=host.querySelector('[data-map-location-note]');
  let selected=new Set(),catalog=null,storedState=null,painting=false,currentSource='human';
  const statusFromProgress=progress>=100?'completed':progress>0?'in_progress':'scheduled';statusSelect.value=statusFromProgress;
  const update=()=>{const ids=[...selected],status=ACTIVITY_MAP_STATUSES[statusSelect.value]||ACTIVITY_MAP_STATUSES.scheduled;selectedCount.textContent=String(ids.length);selectedCopy.textContent=ids.length?`${ids.length} parte${ids.length===1?'':'s'} do loteamento vinculada${ids.length===1?'':'s'}.`:'Nenhuma área vinculada.';map.previewActivityLocationParts?.(ids,status.hex);};
  const setSelection=(ids=[],origin='human')=>{selected=new Set(ids.map(String));currentSource=origin;source.textContent=origin==='ai'?'sugestão da IA':'marcação do usuário';update();};

  await customElements.whenDefined('map-scene');
  const ready=await new Promise(resolve=>{const started=Date.now();const timer=setInterval(()=>{const modelReady=map.modelReady||map.dataset.modelReady==='true';const hasLotPolygons=Boolean(map.modelParts?.lots?.length)||Boolean(map.activityMapStandaloneParts?.some(part=>part?.userData?.partKind==='lots'))||/^lotes:\d+/.test(map.dataset.modelParts||'')||/^meshes:\d+/.test(map.dataset.modelParts||'');if(modelReady&&hasLotPolygons){clearInterval(timer);resolve(true);}else if(Date.now()-started>120000){clearInterval(timer);resolve(false);}},180);});
  if(!ready){wait.innerHTML='<b>O modelo ainda não ficou disponível.</b><span>Recarregue esta atividade ou tente novamente após abrir o mapa principal.</span>';source.textContent='mapa indisponível';}
  else{
    wait.hidden=true;catalog=physicalMapCatalog(map);source.textContent='mapa compreendido';
    // A cena é montada dentro deste painel depois do shell da atividade. O
    // enquadramento inicial calculado durante o boot pode ter usado o
    // viewport anterior (ou 0x0), deixando apenas um fragmento do GLB no
    // centro. Recalcule após o painel estar visível, usando o mesmo fit da
    // cena administrativa compartilhada.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      map.fitSceneView?.(false);
      map.syncThree?.();
    }));
    for(const zone of catalog.zones){const option=document.createElement('option');option.value=zone.key;option.textContent=`${zone.label} · ${zone.partIds.length}`;zoneSelect.appendChild(option);}
    storedState=(await api(`/api/workbench/state?stage=${encodeURIComponent(stageKey)}`)).state||{};
    const saved=storedState.activityLocations?.[activityId];
    if(saved){zoneSelect.value=saved.zoneKey||'custom';statusSelect.value=saved.status||statusFromProgress;note.value=saved.note||'';setSelection(saved.partIds||[],saved.source||'human');}
    else update();
  }

  statusSelect.addEventListener('change',update);
  host.querySelector('[data-map-paint]').addEventListener('click',event=>{if(!ready)return;painting=!painting;event.currentTarget.classList.toggle('is-active',painting);event.currentTarget.textContent=painting?'Pintando: segure no mapa':'Ativar pintura';map.setActivityLocationPaintMode?.(painting,area=>{selected.add(String(area.id));zoneSelect.value='custom';currentSource='human';source.textContent='marcação do usuário';update();});feedback.textContent=painting?'Segure o mouse ou o dedo e passe sobre os polígonos desejados.':'Pintura pausada; a seleção continua pronta para salvar.';});
  host.querySelector('[data-map-infer]').addEventListener('click',()=>{if(!ready)return;const inferred=inferActivityLocation(map,stageKey,activityId);zoneSelect.value=inferred.zoneKey;note.value=inferred.zoneLabel;feedback.textContent='A IA sugeriu o contexto. Confirme segurando e pintando os polígonos no modelo 3D; nenhuma peça foi marcada automaticamente.';});
  host.querySelector('[data-map-clear]').addEventListener('click',()=>{zoneSelect.value='custom';setSelection([],'human');feedback.textContent='Seleção limpa. Pinte novamente ou escolha uma localidade.';});
  host.querySelector('[data-map-save]').addEventListener('click',async event=>{if(!selected.size){feedback.textContent='Selecione pelo menos uma parte do mapa antes de salvar.';return;}const button=event.currentTarget;button.disabled=true;button.textContent='Salvando…';try{storedState=(await api(`/api/workbench/state?stage=${encodeURIComponent(stageKey)}`)).state||{};const zone=catalog?.zones.find(item=>item.key===zoneSelect.value);const activityLocations={...(storedState.activityLocations||{}),[activityId]:{partIds:[...selected],zoneKey:zoneSelect.value,zoneLabel:zone?.label||'Seleção manual',status:statusSelect.value,progress,source:currentSource,note:note.value.trim(),updatedAt:new Date().toISOString()}};await api(`/api/workbench/state?stage=${encodeURIComponent(stageKey)}`,{method:'PUT',body:JSON.stringify({layout:storedState.layout||{},links:storedState.links||[],activityLocations})});feedback.textContent='Marcação salva e propagada aos mapas compartilhados.';source.textContent=currentSource==='ai'?'IA confirmada pelo usuário':'salva pelo usuário';window.dispatchEvent(new Event('alianca:activity-map-updated'));}catch(error){feedback.textContent=`Não foi possível salvar: ${error.message}`;}finally{button.disabled=false;button.textContent='Salvar marcação física';}});
}
