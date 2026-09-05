const VERSION='5.3.2';
const SELECTOR='map-scene[data-public-presentation],map-scene[data-public-map]';
const SOFT_RELEASE_MS=2800;
const HARD_RELEASE_MS=5200;
const MAP_WAIT_MS=1800;
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number(v)||0));
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function markup(){
  const el=document.createElement('div');
  el.className='public-model-loading';
  el.dataset.modelLoading='active';
  el.dataset.loaderVersion=VERSION;
  el.setAttribute('role','status');
  el.setAttribute('aria-live','polite');
  el.innerHTML=`
    <div class="public-model-loading__wash" aria-hidden="true"></div>
    <div class="public-model-loading__grid" aria-hidden="true"></div>
    <div class="public-model-loading__shell">
      <header class="public-model-loading__head">
        <div class="public-model-loading__brand"><span class="public-model-loading__mark"><i></i></span><div><b>ALIANÇA PARK</b><small>LOTEAMENTO · EXPERIÊNCIA 3D</small></div></div>
        <span class="public-model-loading__online"><i></i> MODELO</span>
      </header>
      <div class="public-model-loading__body">
        <div class="public-model-loading__plan" aria-hidden="true"><svg viewBox="0 0 420 300" focusable="false"><g class="plan-outline"><path d="M82 28 L296 47 L362 91 L330 164 L366 232 L257 278 L134 251 L57 190 L74 111 Z"/><path d="M91 57 L279 69 L326 98 L303 130 L108 117 Z"/><path d="M101 133 L297 145 L318 177 L280 198 L119 187 Z"/><path d="M126 204 L274 211 L290 239 L249 256 L145 239 Z"/></g><g class="plan-lots">${Array.from({length:12},(_,i)=>`<path d="M${108+i*14} 72 L${118+i*14} 73 L${114+i*14} 108 L${104+i*14} 107 Z"/>`).join('')}${Array.from({length:11},(_,i)=>`<path d="M${117+i*15} 148 L${129+i*15} 149 L${132+i*15} 181 L${120+i*15} 180 Z"/>`).join('')}</g><path class="plan-scan" d="M36 152 H384"/></svg></div>
        <div class="public-model-loading__copy"><span class="public-model-loading__eyebrow">IMPLANTAÇÃO DIGITAL</span><h1>Preparando o<br><em>loteamento.</em></h1><p data-loader-phase>Abrindo a experiência comercial.</p></div>
      </div>
      <footer class="public-model-loading__foot"><div class="public-model-loading__meter-row"><span data-loader-detail>Preparando interface</span><strong data-loader-percent>0%</strong></div><div class="public-model-loading__meter"><i data-loader-bar></i></div><div class="public-model-loading__meta"><span>298 LOTES</span><span>BASE ESTÁTICA PRONTA</span><span>3D EM SEGUNDO PLANO</span></div></footer>
    </div>`;
  return el;
}

function isReady(map){return Boolean(map?.modelReady===true||map?.classList?.contains('model-ready')||map?.dataset?.modelReady==='true');}
function hasError(map){return Boolean(map?.dataset?.modelError||map?.dataset?.publicThree==='fallback'||map?.dataset?.three==='fallback'||map?.dataset?.threeContext==='lost');}
function progressOf(map){const n=Number(map?.dataset?.modelProgress);return Number.isFinite(n)?clamp(n):0;}
function snapshot(map){return {publicThree:map?.dataset?.publicThree||null,three:map?.dataset?.three||null,modelProgress:map?.dataset?.modelProgress||null,modelRender:map?.dataset?.modelRender||null,modelError:map?.dataset?.modelError||null,modelReady:isReady(map),renderer:Boolean(map?.renderer),modelLoadStarted:Boolean(map?._modelLoadStarted),mapTexture:map?.dataset?.mapTexture||null,publicStaticBase:map?.hasAttribute?.('data-public-static-base')||false};}

function installBackgroundStatus(map){
  if(!map||isReady(map)||hasError(map)||document.querySelector('[data-model-background-status]'))return;
  const chip=document.createElement('div');chip.className='public-model-background-status';chip.dataset.modelBackgroundStatus='loading';chip.innerHTML='<i></i><span>Modelo 3D carregando</span><b>…</b>';document.body.appendChild(chip);
  const label=chip.querySelector('b');
  const tick=()=>{if(!chip.isConnected)return;if(isReady(map)){chip.dataset.modelBackgroundStatus='ready';label.textContent='pronto';setTimeout(()=>chip.remove(),900);return;}if(hasError(map)){chip.dataset.modelBackgroundStatus='fallback';chip.querySelector('span').textContent='Base estática ativa';label.textContent='';setTimeout(()=>chip.remove(),1800);return;}const p=progressOf(map);label.textContent=p>0?`${Math.round(p)}%`:'…';setTimeout(tick,350);};tick();
}

async function attach(){
  if(document.querySelector('[data-model-loading]'))return;
  const loader=markup();document.body.appendChild(loader);document.body.classList.add('public-model-loading-active');
  const phaseEl=loader.querySelector('[data-loader-phase]'),detailEl=loader.querySelector('[data-loader-detail]'),pctEl=loader.querySelector('[data-loader-percent]'),barEl=loader.querySelector('[data-loader-bar]');
  let map=document.querySelector(SELECTOR);const seekStart=performance.now();while(!map&&performance.now()-seekStart<MAP_WAIT_MS){await wait(50);map=document.querySelector(SELECTOR);}
  let shown=4,target=12,closed=false,lastState='';const started=performance.now();
  const close=(reason='background')=>{if(closed)return;closed=true;loader.dataset.modelLoading=reason;loader.classList.add('is-leaving');document.body.classList.remove('public-model-loading-active');window.__BELAVISTA_MODEL_LOADER_STATE__={version:VERSION,closed:true,reason,map:snapshot(map)};if(map)installBackgroundStatus(map);setTimeout(()=>loader.remove(),520);};
  if(!map){phaseEl.textContent='Abrindo o loteamento';detailEl.textContent='A base estática está pronta.';target=100;shown=100;barEl.style.width='100%';pctEl.textContent='100%';setTimeout(()=>close('no-map-static'),240);return;}
  const safeStart=()=>{if(closed||isReady(map)||hasError(map))return;try{if(typeof map.startPublic3D==='function')map.startPublic3D();else if(typeof map.scheduleThree==='function')map.scheduleThree();}catch(error){console.warn('[Belavista loader 5.3.2] 3D seguirá em segundo plano.',error);}};
  safeStart();customElements.whenDefined('map-scene').then(safeStart).catch(()=>{});
  const frame=()=>{
    if(closed)return;const elapsed=performance.now()-started,p=progressOf(map),three=map?.dataset?.three,publicThree=map?.dataset?.publicThree;
    let state='boot',label='Preparando implantação digital',detail='Inicializando a experiência.',next=16;
    if(hasError(map)){state='fallback';label='Abrindo o loteamento';detail='Base estática pronta para uso.';next=100;}
    else if(isReady(map)){state='ready';label='Implantação pronta';detail='Modelo 3D carregado.';next=100;}
    else if(three==='ready'&&(map?._modelLoadStarted||p>0)){state='background';label='Abrindo o loteamento';detail=p>0?`Modelo 3D carregando em segundo plano · ${Math.round(p)}%`:'Modelo 3D carregando em segundo plano.';next=100;}
    else if(three==='loading'||publicThree==='loading'){state='runtime';label='Preparando renderização';detail='Inicializando o modelo 3D.';next=42;}
    else if(publicThree==='scheduled'||publicThree==='deferred'){state='scheduled';label='Preparando implantação digital';detail='Agendando renderização 3D.';next=28;}
    if(elapsed>=SOFT_RELEASE_MS&&state!=='ready'&&state!=='fallback'){state='background';label='Abrindo o loteamento';detail='A base estática já está pronta; o 3D continua em segundo plano.';next=100;}
    if(elapsed>=HARD_RELEASE_MS){state='background';next=100;}
    target=Math.max(target,next);shown+=(target-shown)*(state==='background'||state==='ready'||state==='fallback'?.34:.13);if(target-shown<.2)shown=target;shown=clamp(shown);
    loader.style.setProperty('--model-loading-progress',`${shown.toFixed(2)}%`);barEl.style.width=`${shown.toFixed(2)}%`;pctEl.textContent=`${Math.round(shown)}%`;phaseEl.textContent=label;detailEl.textContent=detail;loader.dataset.phase=state;
    if(state!==lastState){lastState=state;window.__BELAVISTA_MODEL_LOADER_STATE__={version:VERSION,closed:false,state,elapsed:Math.round(elapsed),map:snapshot(map)};console.info('[Belavista loader 5.3.2]',window.__BELAVISTA_MODEL_LOADER_STATE__);}
    if((state==='background'||state==='ready'||state==='fallback')&&shown>=98.8){close(state);return;}requestAnimationFrame(frame);
  };requestAnimationFrame(frame);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
