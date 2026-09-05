const VERSION='5.5.0';
const SELECTOR='map-scene[data-public-presentation],map-scene[data-public-map]';
// A cena pública só é apresentada depois de carregar o GLB, a imagem aérea
// georreferenciada e a vegetação. A abertura só entrega a interface quando
// a própria progressão chega ao ponto de transferência configurado.
// A abertura apresenta a primeira fatia do trabalho. O restante continua
// visível no spinner sobre o mapa, sem transformar a tela inicial em uma
// espera indefinida.
const LOADER_SHARE=80;
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
    <div class="public-model-loading__backdrop" aria-hidden="true"></div>
    <div class="public-model-loading__bloom" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i>
    </div>
    <div class="public-model-loading__shell">
      <header class="public-model-loading__head">
        <img class="public-model-loading__logo" src="./assets/public/alianca-park-logo-full-transparent-v551.png" alt="Aliança Park Loteamento">
        <span class="public-model-loading__place">AMARGOSA <i></i> BAHIA</span>
      </header>
      <div class="public-model-loading__body">
        <div class="public-model-loading__copy">
          <span class="public-model-loading__eyebrow">UM NOVO JEITO DE VIVER BEM</span>
          <h1>Seu lugar para<br><em>crescer e florescer.</em></h1>
          <p class="public-model-loading__lead">Natureza, tranquilidade e espaço para construir novos capítulos em Amargosa.</p>
          <p class="public-model-loading__phase" data-loader-phase>Preparando sua visita ao empreendimento.</p>
        </div>
        <figure class="public-model-loading__portrait" aria-hidden="true">
          <img src="./assets/public/alianca-park-masterplan-static-v534.webp" alt="">
          <figcaption><b>298</b><span>oportunidades para<br>escolher o seu lugar</span></figcaption>
          <span class="public-model-loading__leaf public-model-loading__leaf--one"></span>
          <span class="public-model-loading__leaf public-model-loading__leaf--two"></span>
        </figure>
      </div>
      <footer class="public-model-loading__foot">
        <div class="public-model-loading__meter-row">
          <span data-loader-detail>Preparando sua experiência</span>
          <strong data-loader-percent>0%</strong>
        </div>
        <div class="public-model-loading__meter"><i data-loader-bar></i></div>
        <div class="public-model-loading__meta">
          <span>LOTES PARA VIVER</span><span>NATUREZA POR PERTO</span><span>AMARGOSA, BAHIA</span>
        </div>
        <button type="button" class="public-model-loading__continue" data-loader-continue hidden>Conhecer o loteamento</button>
      </footer>
    </div>`;
  return el;
}

function isModelReady(map){
  return Boolean(
    map?.modelReady===true ||
    map?.classList?.contains('model-ready') ||
    map?.dataset?.modelReady==='true'
  );
}

function ensureModelAreaSpinner(map){
  if(!map)return null;
  let spinner=map.querySelector('[data-model-area-spinner]');
  if(spinner)return spinner;
  spinner=document.createElement('div');
  spinner.className='public-model-area-spinner';
  spinner.dataset.modelAreaSpinner='loading';
  spinner.setAttribute('role','status');
  spinner.setAttribute('aria-live','polite');
  spinner.innerHTML='<span class="public-model-area-spinner__ring" aria-hidden="true"></span><span class="public-model-area-spinner__copy"><b>Quase lá</b><small data-model-area-spinner-detail>Cuidando dos últimos detalhes…</small></span>';
  map.appendChild(spinner);
  return spinner;
}

function syncModelAreaSpinner(spinner,map){
  if(!spinner)return false;
  const modelReady=isModelReady(map),complete=isReady(map),fallback=hasError(map);
  const satelliteReady=isSatelliteReady(map),vegetationReady=isVegetationReady(map),roadReady=isRoadTextureReady(map);
  const completion=modelReady
    ? (satelliteReady&&vegetationReady&&roadReady?100:80+(Number(satelliteReady)+Number(vegetationReady)+Number(roadReady))/3*20)
    : Math.min(79,Number(map?.dataset?.modelProgress||0)*.55+20);
  map.dataset.modelAreaProgress=completion.toFixed(1);
  spinner.style.setProperty('--model-area-progress',`${completion.toFixed(1)}%`);
  spinner.hidden=complete||fallback;
  spinner.dataset.modelAreaSpinner=complete?'ready':fallback?'fallback':'loading';
  const detail=spinner.querySelector('[data-model-area-spinner-detail]');
  if(detail)detail.textContent=complete?'Sua visita está pronta':fallback?'Abrindo uma versão mais leve':`Preparando sua visita… ${Math.round(completion)}%`;
  spinner.setAttribute('aria-hidden',String(complete||fallback));
  return !(complete||fallback);
}

function tileProgress(map){
  const [loaded,total]=String(map?.dataset?.mapTextureTiles||'').split('/').map(value=>Number(value));
  return {
    loaded:Number.isFinite(loaded)?loaded:0,
    total:Number.isFinite(total)?total:0
  };
}

function isSatelliteReady(map){
  if(!map?.hasAttribute?.('data-public-satellite-base')) return true;
  const {loaded,total}=tileProgress(map);
  return Boolean(
    map?.dataset?.publicDwgCenter &&
    total>0 &&
    loaded>=total &&
    map?.dataset?.mapTexture==='ready'
  );
}

function isVegetationReady(map){
  if(!map?.hasAttribute?.('data-public-presentation')) return true;
  return map?.dataset?.publicVegetation==='cc0-tree-glb' && Number(map?.dataset?.publicTreeCount||0)>0;
}

function isRoadTextureReady(map){
  if(!map?.hasAttribute?.('data-public-presentation')) return true;
  // "fallback" continua a liberar a página se o CDN/local asset falhar,
  // mas a tela contabiliza a tentativa de importar a textura antes disso.
  return ['ready','fallback'].includes(map?.dataset?.publicRoadTexture||'');
}

function isReady(map){
  return isModelReady(map) && isSatelliteReady(map) && isVegetationReady(map) && isRoadTextureReady(map);
}

function hasError(map){
  return Boolean(
    map?.dataset?.modelError ||
    map?.dataset?.publicThree==='fallback' ||
    map?.dataset?.three==='fallback' ||
    map?.dataset?.threeContext==='lost'
  );
}

function snapshot(map){
  return {
    publicThree:map?.dataset?.publicThree||null,
    three:map?.dataset?.three||null,
    modelProgress:map?.dataset?.modelProgress||null,
    modelRender:map?.dataset?.modelRender||null,
    modelError:map?.dataset?.modelError||null,
    modelReady:isModelReady(map),
    presentationReady:isReady(map),
    classReady:Boolean(map?.classList?.contains('model-ready')),
    renderer:Boolean(map?.renderer),
    modelLoadStarted:Boolean(map?._modelLoadStarted),
    publicDwgCenter:map?.dataset?.publicDwgCenter||null,
    mapTexture:map?.dataset?.mapTexture||null,
    mapTextureTiles:map?.dataset?.mapTextureTiles||null,
    publicVegetation:map?.dataset?.publicVegetation||null,
    publicTreeCount:map?.dataset?.publicTreeCount||null,
    publicForestTreeCount:map?.dataset?.publicForestTreeCount||null,
    modelAreaProgress:map?.dataset?.modelAreaProgress||null,
    publicRoadTexture:map?.dataset?.publicRoadTexture||null
  };
}

function detectPhase(map,elapsed){
  if(hasError(map)) return {state:'error',label:'Abrindo uma versão mais leve',detail:'Você já poderá conhecer o empreendimento.',target:100};
  if(isReady(map)) return {state:'ready',label:'Sua visita está pronta',detail:'Bem-vindo ao Aliança Park.',target:100};

  const raw=clamp(parseFloat(map?.dataset?.modelProgress||'0'));
  const publicThree=map?.dataset?.publicThree;
  const three=map?.dataset?.three;

  if(publicThree==='deferred' || (!three && !map?.renderer)) return {state:'boot',label:'Abrindo os caminhos do Aliança Park',detail:'Sua visita começa em instantes.',target:10};
  if(publicThree==='scheduled') return {state:'boot',label:'Abrindo os caminhos do Aliança Park',detail:'Preparando uma experiência feita para você.',target:15};
  if(publicThree==='loading' || three==='loading') return {state:'runtime',label:'Cuidando dos primeiros detalhes',detail:'Organizando sua chegada ao empreendimento.',target:24};
  if(three==='ready' && raw<=0) return {state:'transfer',label:'Apresentando cada espaço',detail:'Lotes, áreas verdes e novos caminhos.',target:38};
  if(raw>0 && raw<100) return {state:'transfer',label:'Apresentando cada espaço',detail:`Sua visita está sendo preparada · ${Math.round(raw)}%`,target:38+raw*.50};
  if(isModelReady(map) && !isSatelliteReady(map)){
    const {loaded,total}=tileProgress(map);
    const progress=total>0?loaded/total:0;
    return {
      state:'satellite',
      label:'Situando você em Amargosa',
      detail:total>0?'Conectando o empreendimento à paisagem ao redor.':'Descobrindo cada detalhe da localização.',
      target:82+progress*14
    };
  }
  if(isModelReady(map) && isSatelliteReady(map) && !isVegetationReady(map)){
    return {state:'vegetation',label:'Trazendo a natureza para perto',detail:'Áreas verdes e paisagem ganhando vida.',target:98};
  }
  if(isModelReady(map) && isSatelliteReady(map) && isVegetationReady(map) && !isRoadTextureReady(map)){
    return {state:'road-texture',label:'Abrindo novos caminhos',detail:'Finalizando a experiência pelo loteamento.',target:99};
  }
  if(raw>=100 || map?._modelLoadStarted) return {state:'processing',label:'Preparando sua visita',detail:'Lotes, caminhos e lugares para viver bem.',target:96};
  if(three==='ready') return {state:'processing',label:'Preparando sua visita',detail:'Seu próximo capítulo começa aqui.',target:92};
  return {state:'boot',label:'Bem-vindo ao Aliança Park',detail:'Sua visita começa em instantes.',target:7};
}

async function attach(){
  if(document.querySelector('[data-model-loading]')) return;
  let map=null;
  for(let i=0;i<160&&!map;i++){
    map=document.querySelector(SELECTOR);
    if(!map) await wait(50);
  }
  if(!map){
    console.warn('[Aliança Park loader 5.5.0] mapa público não encontrado; abertura não será exibida.');
    return;
  }

  const areaSpinner=ensureModelAreaSpinner(map);
  const loader=markup();
  document.body.appendChild(loader);
  document.body.classList.add('public-model-loading-active');
  const phaseEl=loader.querySelector('[data-loader-phase]');
  const detailEl=loader.querySelector('[data-loader-detail]');
  const pctEl=loader.querySelector('[data-loader-percent]');
  const barEl=loader.querySelector('[data-loader-bar]');
  const continueBtn=loader.querySelector('[data-loader-continue]');

  let shown=0,target=5,closed=false,lastState='',spinnerFrame=0;
  const started=performance.now();
  const watchModelArea=()=>{
    if(!syncModelAreaSpinner(areaSpinner,map))return;
    spinnerFrame=requestAnimationFrame(watchModelArea);
  };
  watchModelArea();
  const close=(reason='ready')=>{
    if(closed)return;
    closed=true;
    loader.dataset.modelLoading=reason;
    loader.classList.add('is-leaving');
    document.body.classList.remove('public-model-loading-active');
    syncModelAreaSpinner(areaSpinner,map);
    window.__BELAVISTA_MODEL_LOADER_STATE__={version:VERSION,closed:true,reason,map:snapshot(map)};
    setTimeout(()=>loader.remove(),260);
  };
  continueBtn.addEventListener('click',()=>close('fallback-manual'));

  const safeStart=()=>{
    if(closed || isModelReady(map) || hasError(map)) return;
    try{
      if(typeof map.startPublic3D==='function') map.startPublic3D();
      else if(typeof map.scheduleThree==='function') map.scheduleThree();
    }catch(error){
      console.warn('[Aliança Park loader 5.5.0] falha ao iniciar 3D; aguardando sinal de erro da cena.',error);
      map.dataset.modelError='loader-start-failed';
    }
  };

  // Aguarda o upgrade do Web Component. O intervalo tenta iniciar a cena
  // enquanto ela estiver sendo definida, sem impor um limite temporal.
  customElements.whenDefined('map-scene').catch(()=>{}).then(safeStart);
  safeStart();

  const starter=setInterval(()=>{
    if(closed || isModelReady(map) || hasError(map)){
      clearInterval(starter);
      return;
    }
    safeStart();
  },500);

  const frame=()=>{
    if(closed)return;
    const elapsed=performance.now()-started;
    const info=detectPhase(map,elapsed);
    target=Math.max(target,info.target);

    if(info.state==='processing')target=Math.max(target,70);
    if(info.state==='satellite')target=Math.max(target,68);
    if(info.state==='vegetation')target=Math.max(target,72);
    if(info.state==='road-texture')target=Math.max(target,74);
    if(info.state==='ready'){
      target=LOADER_SHARE;
    }

    const speed=info.state==='ready'?.22:.07;
    shown+=(target-shown)*speed;
    if(target-shown<.12)shown=target;
    shown=Math.min(LOADER_SHARE,clamp(shown));

    loader.style.setProperty('--model-loading-progress',`${shown.toFixed(2)}%`);
    barEl.style.width=`${shown.toFixed(2)}%`;
    pctEl.textContent=info.state==='error'?'—':`${Math.round(shown)}%`;
    phaseEl.textContent=info.label;
    detailEl.textContent=info.detail;
    loader.dataset.phase=info.state;

    if(info.state!==lastState){
      lastState=info.state;
      window.__BELAVISTA_MODEL_LOADER_STATE__={version:VERSION,closed:false,state:info.state,elapsed:Math.round(elapsed),map:snapshot(map)};
      console.info('[Aliança Park loader 5.5.0]',window.__BELAVISTA_MODEL_LOADER_STATE__);
    }

    if(info.state==='error'){
      continueBtn.hidden=false;
      barEl.style.width=`${LOADER_SHARE}%`;
      setTimeout(()=>close('fallback-error'),1400);
      return;
    }
    // O handoff não depende de relógio: a tela sai apenas quando a própria
    // progressão chega aos 80%. Os 20% restantes continuam sobre o mapa.
    if(info.target>=LOADER_SHARE && shown>=LOADER_SHARE-.6){
      close(info.state==='ready'?'ready':'handoff-80');
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
else attach();
