const VERSION='5.3';
const SELECTOR='map-scene[data-public-presentation],map-scene[data-public-map]';
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number(v)||0));
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));

function markup(){
  const el=document.createElement('div');
  el.className='public-model-loading';
  el.dataset.modelLoading='active';
  el.setAttribute('role','status');
  el.setAttribute('aria-live','polite');
  el.innerHTML=`
    <div class="public-model-loading__wash" aria-hidden="true"></div>
    <div class="public-model-loading__grid" aria-hidden="true"></div>
    <div class="public-model-loading__shell">
      <header class="public-model-loading__head">
        <div class="public-model-loading__brand">
          <span class="public-model-loading__mark"><i></i></span>
          <div><b>ALIANÇA PARK</b><small>LOTEAMENTO · EXPERIÊNCIA 3D</small></div>
        </div>
        <span class="public-model-loading__online"><i></i> MODELO</span>
      </header>

      <div class="public-model-loading__body">
        <div class="public-model-loading__plan" aria-hidden="true">
          <svg viewBox="0 0 420 300" focusable="false">
            <g class="plan-outline">
              <path d="M82 28 L296 47 L362 91 L330 164 L366 232 L257 278 L134 251 L57 190 L74 111 Z"/>
              <path d="M91 57 L279 69 L326 98 L303 130 L108 117 Z"/>
              <path d="M101 133 L297 145 L318 177 L280 198 L119 187 Z"/>
              <path d="M126 204 L274 211 L290 239 L249 256 L145 239 Z"/>
            </g>
            <g class="plan-lots">
              ${Array.from({length:12},(_,i)=>`<path d="M${108+i*14} 72 L${118+i*14} 73 L${114+i*14} 108 L${104+i*14} 107 Z"/>`).join('')}
              ${Array.from({length:11},(_,i)=>`<path d="M${117+i*15} 148 L${129+i*15} 149 L${132+i*15} 181 L${120+i*15} 180 Z"/>`).join('')}
              ${Array.from({length:8},(_,i)=>`<path d="M${145+i*15} 216 L${157+i*15} 217 L${162+i*15} 240 L${150+i*15} 239 Z"/>`).join('')}
            </g>
            <path class="plan-scan" d="M36 152 H384"/>
          </svg>
        </div>

        <div class="public-model-loading__copy">
          <span class="public-model-loading__eyebrow">IMPLANTAÇÃO DIGITAL</span>
          <h1>Preparando o<br><em>loteamento.</em></h1>
          <p data-loader-phase>Inicializando leitura espacial do empreendimento.</p>
        </div>
      </div>

      <footer class="public-model-loading__foot">
        <div class="public-model-loading__meter-row">
          <span data-loader-detail>Preparando cena</span>
          <strong data-loader-percent>0%</strong>
        </div>
        <div class="public-model-loading__meter"><i data-loader-bar></i></div>
        <div class="public-model-loading__meta">
          <span>298 LOTES</span><span>LEITURA ESPACIAL</span><span>MAPA + MODELO 3D</span>
        </div>
        <button type="button" class="public-model-loading__continue" data-loader-continue hidden>Continuar com a base estática</button>
      </footer>
    </div>`;
  return el;
}

function detectPhase(map){
  const error=map?.dataset?.modelError || map?.dataset?.publicThree==='fallback' || map?.dataset?.three==='fallback';
  if(error) return {state:'error',label:'Modelo 3D indisponível',detail:'A base estática continua disponível.',target:100};
  if(map?.classList?.contains('model-ready') || map?.modelReady===true) return {state:'ready',label:'Implantação pronta',detail:'Finalizando composição visual.',target:100};

  const raw=clamp(parseFloat(map?.dataset?.modelProgress||'0'));
  const publicThree=map?.dataset?.publicThree;
  const three=map?.dataset?.three;
  if(publicThree==='deferred' || !three) return {state:'boot',label:'Preparando implantação digital',detail:'Inicializando cena e renderização.',target:8};
  if(publicThree==='scheduled') return {state:'boot',label:'Preparando implantação digital',detail:'Agendando renderização 3D.',target:13};
  if(publicThree==='loading' || three==='loading') return {state:'runtime',label:'Preparando renderização',detail:'Carregando recursos do mapa 3D.',target:22};
  if(three==='ready' && raw<=0) return {state:'transfer',label:'Carregando o modelo do loteamento',detail:'Transferindo geometria e materiais.',target:30};
  if(raw>0 && raw<100) return {state:'transfer',label:'Carregando o modelo do loteamento',detail:`Geometria do empreendimento · ${Math.round(raw)}%`,target:30+raw*.60};
  if(three==='ready') return {state:'processing',label:'Organizando lotes e vias',detail:'Aplicando materiais, quadras, ruas e pontos de interesse.',target:94};
  return {state:'boot',label:'Preparando implantação digital',detail:'Inicializando experiência.',target:5};
}

async function attach(){
  if(document.querySelector('[data-model-loading]')) return;
  let map=null;
  for(let i=0;i<160&&!map;i++){
    map=document.querySelector(SELECTOR);
    if(!map) await wait(50);
  }
  if(!map) return;

  const loader=markup();
  document.body.appendChild(loader);
  document.body.classList.add('public-model-loading-active');
  const phaseEl=loader.querySelector('[data-loader-phase]');
  const detailEl=loader.querySelector('[data-loader-detail]');
  const pctEl=loader.querySelector('[data-loader-percent]');
  const barEl=loader.querySelector('[data-loader-bar]');
  const continueBtn=loader.querySelector('[data-loader-continue]');

  let shown=0,target=5,closed=false,readySince=0;
  const started=performance.now();
  const close=(reason='ready')=>{
    if(closed)return;closed=true;
    loader.dataset.modelLoading=reason;
    loader.classList.add('is-leaving');
    document.body.classList.remove('public-model-loading-active');
    setTimeout(()=>loader.remove(),720);
  };
  continueBtn.addEventListener('click',()=>close('fallback'));

  // O runtime público v4.7+ deferia o GLB até a primeira interação. A tela de
  // loading passa a ser essa interação explícita e inicia o carregamento.
  const startModel=()=>{
    if(typeof map.startPublic3D==='function') map.startPublic3D();
    else if(typeof map.scheduleThree==='function' && !map.renderer) map.scheduleThree();
  };
  startModel();
  const starter=setInterval(()=>{
    if(closed){clearInterval(starter);return;}
    if(map.dataset.publicThree==='deferred' || (!map.renderer && !map.modelReady)) startModel();
    else clearInterval(starter);
  },220);

  const observer=new MutationObserver(()=>{});
  observer.observe(map,{attributes:true,attributeFilter:['class','data-three','data-public-three','data-model-progress','data-model-error','data-model-render']});

  const frame=()=>{
    if(closed){observer.disconnect();return;}
    const info=detectPhase(map);target=Math.max(target,info.target);
    const elapsed=performance.now()-started;
    if(info.state==='boot' && elapsed>900) target=Math.max(target,12);
    if(info.state==='runtime' && elapsed>1600) target=Math.max(target,20);
    if(info.state==='transfer' && !map.dataset.modelProgress && elapsed>2800) target=Math.max(target,36);
    if(info.state==='processing') target=Math.max(target,96);
    if(info.state==='ready'){target=100;if(!readySince)readySince=performance.now();}

    const speed=info.state==='ready'?0.18:0.075;
    shown += (target-shown)*speed;
    if(target-shown<.12)shown=target;
    shown=clamp(shown);
    loader.style.setProperty('--model-loading-progress',`${shown.toFixed(2)}%`);
    barEl.style.width=`${shown.toFixed(2)}%`;
    pctEl.textContent=`${Math.round(shown)}%`;
    phaseEl.textContent=info.label;
    detailEl.textContent=info.detail;
    loader.dataset.phase=info.state;

    if(info.state==='error'){
      continueBtn.hidden=false;
      pctEl.textContent='—';
      barEl.style.width='100%';
    }
    if(info.state==='ready' && shown>=99.5 && performance.now()-readySince>520) close('ready');
    else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
else attach();
