// BELAVISTA_CHAT_CONTEXT_V5340
// BELAVISTA_SELECTION_TRANSITION_V5338
// BELAVISTA_PUBLIC_VISUAL_QUALITY_V5337
// BELAVISTA_CONTROLS_AFTER_FADE_V5336\n// BELAVISTA_SELECTION_PAN_GUARD_V5335
// BELAVISTA_COMMERCIAL_MARKERS_SCENE_LOCAL_V5334\n// BELAVISTA_SELECTION_FOCUS_WORLD_V5333
// BELAVISTA_PUBLIC_SALES_MAP_V5330
// Stable public context: single Three.js canvas, gated lot selection, focus widget.
// Replaces v5.2.1 MutationObserver + 180-frame self-reinstall loop.
import {runtimeUrlV1} from './runtime-url-v1.mjs?v=ngrok-route-v1';

const BRAND_MARK=runtimeUrlV1('/assets/public/alianca-park-logo-mark-transparent-v551.png?edited=20260915');
const PUBLIC_MAP_SELECTOR='map-scene[data-public-map],map-scene[data-public-presentation]';
const HERO_SELECTOR='[data-hero-letter],.public-hero-letter,.public-map-copy';
// Nível que corresponde à escala física inferida para o footprint do DWG.
// Ele preserva as vias e árvores reais da imagem, sem aproximar artificialmente
// a foto nem usar a prévia sintética como cartografia.
const PUBLIC_SATELLITE_DWG_ZOOM=18;
const VERSION='v5.3.30';
const SUNNY_SCENE_VERSION='v5.4.8';
const SATELLITE_UTM_TO_UV_HOMOGRAPHY_V1=[
  [-2.94306335e-7,-6.87434193e-8,7.15685809e-1],
  [3.56353169e-11,3.82122918e-7,-3.27219102],
  [7.83358933e-8,-1.2079129e-7,1]
];

const isPublicMap=map=>Boolean(map?.matches?.(PUBLIC_MAP_SELECTOR));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

function installStyles(){
  if(document.getElementById('belavista-public-selection-focus-v5318-style'))return;
  const style=document.createElement('style');
  style.id='belavista-public-selection-focus-v5318-style';
  style.textContent=`
    map-scene[data-public-map][data-public-selection-enabled="false"] .three-overlay,
    map-scene[data-public-presentation][data-public-selection-enabled="false"] .three-overlay{
      cursor:default;
    }
    map-scene[data-public-map][data-public-selection-enabled="true"] .three-overlay,
    map-scene[data-public-presentation][data-public-selection-enabled="true"] .three-overlay{
      cursor:pointer;
    }
    map-scene[data-public-map] .map-pan-pad,
    map-scene[data-public-presentation] .map-pan-pad{
      display:none!important;
    }
    map-scene[data-public-map] .map-gesture-legend,
    map-scene[data-public-presentation] .map-gesture-legend{
      pointer-events:none;
    }
    map-scene[data-public-static-only] .three-overlay,
    map-scene[data-public-static-only] .map-tint{
      display:none!important;
      opacity:0!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    map-scene[data-public-static-only] .map-host{
      display:block!important;
      visibility:visible!important;
      opacity:1!important;
      background-image:linear-gradient(90deg,rgba(3,17,12,.24),rgba(3,17,12,.02) 64%),url('/assets/public/dwg-satellite-treated-v5411.png')!important;
      background-size:cover,cover!important;
      background-position:center,center!important;
      background-repeat:no-repeat!important;
      background-color:#07101e!important;
      pointer-events:none!important;
      z-index:0!important;
    }
    map-scene[data-public-static-only] .public-static-lot-markers,
    body.public-leads-page .public-static-lot-markers{
      position:absolute;
      inset:0;
      z-index:12;
      pointer-events:none;
      overflow:hidden;
    }
    map-scene[data-public-static-only] .public-static-lot-marker,
    body.public-leads-page .public-static-lot-marker{
      position:absolute;
      width:18px;
      height:18px;
      padding:0;
      transform:translate(-50%,-50%);
      border:1px solid rgba(255,255,255,.82);
      border-radius:50%;
      background:#2fbd72;
      color:#071b12;
      box-shadow:0 1px 5px rgba(0,0,0,.42),0 0 0 1px rgba(0,0,0,.18);
      font:700 7px/16px ui-monospace,SFMono-Regular,Menlo,monospace;
      text-align:center;
      cursor:pointer;
      pointer-events:auto;
      transition:transform .16s ease,box-shadow .16s ease,filter .16s ease;
    }
    map-scene[data-public-static-only] .public-static-lot-marker[data-status="reserved"],
    body.public-leads-page .public-static-lot-marker[data-status="reserved"]{background:#f2c14e;color:#2e2100}
    map-scene[data-public-static-only] .public-static-lot-marker[data-status="negotiation"],
    body.public-leads-page .public-static-lot-marker[data-status="negotiation"]{background:#5e9ee8;color:#06182c}
    map-scene[data-public-static-only] .public-static-lot-marker[data-status="sold"],
    body.public-leads-page .public-static-lot-marker[data-status="sold"]{background:#e76557;color:#2c0906}
    map-scene[data-public-static-only] .public-static-lot-marker:hover,
    map-scene[data-public-static-only] .public-static-lot-marker:focus-visible,
    map-scene[data-public-static-only] .public-static-lot-marker.is-selected,
    body.public-leads-page .public-static-lot-marker:hover,
    body.public-leads-page .public-static-lot-marker:focus-visible,
    body.public-leads-page .public-static-lot-marker.is-selected{
      z-index:2;
      transform:translate(-50%,-50%) scale(1.45);
      filter:brightness(1.14);
      box-shadow:0 2px 10px rgba(0,0,0,.55),0 0 0 2px rgba(255,255,255,.95);
      outline:none;
    }
    map-scene[data-public-static-only] .map-rotation-controls,
    map-scene[data-public-static-only] .map-pan-pad,
    map-scene[data-public-static-only] [data-scene-pan]{
      display:none!important;
    }
    map-scene[data-public-static-only],
    .scene>map-scene[data-persistent-map="true"][data-public-static-only]{
      position:relative;
      pointer-events:auto!important;
    }
    map-scene[data-public-static-only] .public-static-lot-markers{
      pointer-events:auto!important;
    }
    map-scene[data-public-static-only] .public-lot-info-v5318{
      display:block;
      position:absolute;
      right:18px;
      bottom:18px;
      width:min(360px,calc(100% - 36px));
      max-height:calc(100% - 36px);
      overflow:auto;
      z-index:58;
      padding:18px 18px 16px;
      border:1px solid rgba(187,238,209,.30);
      background:rgba(2,35,27,.94);
      color:#e7f6ee;
      box-shadow:0 18px 50px rgba(0,0,0,.36);
      backdrop-filter:blur(16px);
      border-radius:4px;
    }
    map-scene[data-public-static-only] .public-lot-info-v5318[hidden]{display:none!important}
    .public-map-static-bg[data-three-texture-active="true"]{
      opacity:0!important;
      visibility:hidden!important;
    }
    body.public-leads-page .public-map-static-bg{
      background-image:linear-gradient(90deg,rgba(3,17,12,.24),rgba(3,17,12,.02) 64%),url('/assets/public/dwg-satellite-treated-v5411.png')!important;
      background-size:cover,cover!important;
      background-position:center,center!important;
      background-repeat:no-repeat!important;
      filter:none!important;
    }
    body.public-leads-page map-scene[data-public-satellite-base] .map-tint{
      opacity:.035!important;
      background:linear-gradient(165deg,rgba(13,38,48,.18),rgba(255,255,255,.035))!important;
      mix-blend-mode:soft-light!important;
    }
    body.public-leads-page map-scene[data-public-satellite-base] .three-overlay{
      filter:saturate(1.025) contrast(1.075) brightness(1.025)!important;
    }
    [data-selected-lot].public-lot-info-v5318{
      display:block;
      position:absolute;
      left:clamp(18px,4vw,64px);
      bottom:clamp(22px,5vh,70px);
      width:min(340px,calc(100vw - 36px));
      z-index:48;
      padding:18px 18px 16px;
      border:1px solid rgba(187,238,209,.30);
      background:rgba(2,35,27,.92);
      color:#e7f6ee;
      box-shadow:0 18px 50px rgba(0,0,0,.28);
      backdrop-filter:blur(16px);
      border-radius:4px;
    }
    [data-selected-lot].public-lot-info-v5318[hidden]{display:none!important}
    .public-lot-info-v5318 .lot-info-head{
      display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
      margin-bottom:14px;
    }
    .public-lot-info-v5318 .lot-info-head small{
      display:block;font-size:9px;letter-spacing:.18em;text-transform:uppercase;
      color:#82bca4;margin-bottom:5px;
    }
    .public-lot-info-v5318 .lot-info-head strong{
      font:500 24px/1.05 Georgia,serif;color:#f2fbf6;
    }
    .public-lot-info-v5318 [data-public-lot-close]{
      appearance:none;border:1px solid rgba(255,255,255,.18);background:transparent;
      color:#d9eee4;width:30px;height:30px;cursor:pointer;font-size:18px;
    }
    .public-lot-info-v5318 dl{
      display:grid;grid-template-columns:auto 1fr;gap:7px 14px;margin:0;
      font-size:12px;line-height:1.4;
    }
    .public-lot-info-v5318 dt{color:#78a991}
    .public-lot-info-v5318 dd{margin:0;color:#e6f2ec}
    .public-lot-info-v5318 .lot-info-note{
      margin:14px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,.10);
      color:#a8c8b8;font-size:11px;line-height:1.45;
    }
    .public-lot-info-v5318 .lot-info-facts{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
      margin:12px 0 0;
    }
    .public-lot-info-v5318 .lot-info-fact{
      min-width:0;
      padding:10px 11px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.035);
    }
    .public-lot-info-v5318 .lot-info-fact small{
      display:block;
      margin-bottom:4px;
      color:#78a991;
      font-size:8px;
      letter-spacing:.14em;
      text-transform:uppercase;
    }
    .public-lot-info-v5318 .lot-info-fact strong{
      display:block;
      overflow:hidden;
      text-overflow:ellipsis;
      color:#edf8f2;
      font-size:12px;
      font-weight:500;
      white-space:nowrap;
    }
    .public-lot-info-v5318 .lot-agent-actions{
      display:grid;
      grid-template-columns:1fr;
      gap:7px;
      margin-top:14px;
      padding-top:13px;
      border-top:1px solid rgba(255,255,255,.10);
    }
    .public-lot-info-v5318 .lot-agent-actions > small{
      color:#77aa92;
      font-size:8px;
      letter-spacing:.16em;
      text-transform:uppercase;
    }
    .public-lot-info-v5318 .lot-agent-actions-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:6px;
    }
    .public-lot-info-v5318 [data-public-lot-agent-action]{
      appearance:none;
      min-height:42px;
      padding:8px 7px;
      border:1px solid rgba(168,232,201,.22);
      background:rgba(9,62,47,.58);
      color:#dff3e8;
      font:500 9px/1.25 system-ui,sans-serif;
      letter-spacing:.04em;
      cursor:pointer;
      transition:background 120ms ease,border-color 120ms ease,transform 120ms ease;
    }
    .public-lot-info-v5318 [data-public-lot-agent-action]:hover{
      border-color:rgba(180,241,211,.56);
      background:rgba(16,92,69,.72);
      transform:translateY(-1px);
    }
    .public-lot-info-v5318 [data-public-lot-agent-action]:disabled{
      opacity:.48;
      cursor:wait;
      transform:none;
    }
    .public-map-state-v5330{
      position:absolute;
      z-index:34;
      left:clamp(18px,3vw,44px);
      top:clamp(18px,4vh,42px);
      width:min(410px,calc(100vw - 36px));
      padding:12px;
      border:1px solid rgba(190,236,211,.22);
      background:rgba(3,37,28,.84);
      box-shadow:0 16px 46px rgba(0,0,0,.18);
      backdrop-filter:blur(14px);
      transition:opacity 150ms ease,transform 180ms ease,visibility 150ms ease;
    }
    body:not([data-public-scroll-section="map"]) .public-map-state-v5330{
      opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-8px);
    }
    body[data-public-scroll-section="map"] .public-map-state-v5330{
      opacity:1;visibility:visible;pointer-events:auto;transform:none;
    }
    .public-map-construction-v5330{
      display:grid;gap:8px;margin:0 0 11px;padding:0 0 11px;
      border-bottom:1px solid rgba(255,255,255,.10);
    }
    .public-map-construction-v5330 .construction-head{
      display:flex;align-items:center;justify-content:space-between;gap:12px;
    }
    .public-map-construction-v5330 .construction-head span{display:grid;gap:2px}
    .public-map-construction-v5330 .construction-head small{
      color:#77aa92;font-size:8px;letter-spacing:.16em;text-transform:uppercase;
    }
    .public-map-construction-v5330 .construction-head b{
      color:#eef8f3;font:500 13px/1.2 Georgia,serif;
    }
    .public-map-construction-v5330 .construction-head em{
      color:#8db7a4;font:normal 8px/1.3 system-ui,sans-serif;
    }
    .public-map-construction-v5330 .construction-buttons{
      display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;
      scrollbar-width:thin;padding-bottom:1px;
    }
    .public-map-construction-v5330 [data-construction-stage]{
      display:grid!important;grid-template-columns:auto auto auto!important;
      align-items:center!important;flex:0 0 auto;min-height:34px!important;
      padding:7px 9px!important;gap:6px!important;white-space:nowrap;
    }
    .public-map-construction-v5330 [data-construction-stage] i{
      width:7px!important;height:7px!important;grid-row:auto!important;
      background:var(--stage-color,#42be65)!important;color:var(--stage-color,#42be65)!important;
    }
    .public-map-construction-v5330 [data-construction-stage] b{
      font-size:9px!important;font-weight:500!important;
    }
    .public-map-construction-v5330 [data-construction-stage] sup{
      color:#9dc7b4;font:8px ui-monospace,monospace;
    }
    .public-map-state-v5330 header{
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      padding:1px 2px 10px;
    }
    .public-map-state-v5330 header span{display:grid;gap:2px}
    .public-map-state-v5330 header small{
      font-size:8px;letter-spacing:.16em;color:#77aa92;text-transform:uppercase;
    }
    .public-map-state-v5330 header b{font:500 15px/1.2 Georgia,serif;color:#eef8f3}
    .public-map-state-v5330 header em{
      color:#8db7a4;font:normal 9px/1.3 system-ui,sans-serif;
    }
    .public-map-state-v5330 nav{
      display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;
    }
    .public-map-state-v5330 button{
      appearance:none;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;
      align-items:center;gap:1px 6px;min-width:0;padding:8px 7px;
      border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);
      color:#dfeee7;cursor:pointer;text-align:left;
    }
    .public-map-state-v5330 button.active{
      border-color:rgba(203,244,224,.44);background:rgba(255,255,255,.09);
    }
    .public-map-state-v5330 button i{
      grid-row:1/3;width:8px;height:8px;border-radius:50%;
      box-shadow:0 0 0 3px color-mix(in srgb,currentColor 18%,transparent);
    }
    .public-map-state-v5330 button b{
      overflow:hidden;text-overflow:ellipsis;font-size:9px;font-weight:500;white-space:nowrap;
    }
    .public-map-state-v5330 button strong{
      font:12px ui-monospace,monospace;color:#f4fbf7;
    }
    .public-map-state-v5330 button[data-map-state="available"]{color:#42be65}
    .public-map-state-v5330 button[data-map-state="reserved"]{color:#f1c21b}
    .public-map-state-v5330 button[data-map-state="sold"]{color:#fa4d56}
    .public-map-state-v5330 button[data-map-state="negotiation"]{color:#78a9ff}
    .public-map-state-v5330 footer{
      display:flex;align-items:center;gap:12px;margin-top:9px;padding:8px 2px 1px;
      border-top:1px solid rgba(255,255,255,.08);color:#8db7a4;font-size:8px;
    }
    .public-map-state-v5330 footer span{display:inline-flex;align-items:center;gap:4px}
    .public-map-state-v5330 footer i{width:6px;height:6px;border-radius:50%}
    body[data-public-lot-selection-ready="false"] [data-selected-lot]{
      pointer-events:none;
    }

    /* BELAVISTA_PUBLIC_FIXED_150VH_SCROLL_V5324 */
    html{scroll-behavior:smooth}
    body.public-leads-page .public-map-story{
      position:relative!important;
      min-height:150vh!important;
      height:150vh!important;
      overflow:visible!important;
      scroll-margin-top:0!important;
    }
    body.public-leads-page .public-map-sticky{
      position:absolute!important;
      top:0;
      left:0;
      width:100%;
      height:100vh!important;
      min-height:100vh!important;
      overflow:hidden!important;
      margin:0!important;
      transform:none;
    }
    body.public-leads-page .public-map-sticky[data-public-pin-state="fixed"]{
      position:fixed!important;
      top:0!important;
      z-index:20!important;
    }
    body.public-leads-page .public-map-sticky[data-public-pin-state="released"]{
      position:absolute!important;
      top:150vh!important;
      z-index:20!important;
    }
    body.public-leads-page .public-hero-letter{
      opacity:var(--v5330-title-opacity,1)!important;
      filter:blur(var(--v5330-title-blur,0px))!important;
      transform:translate3d(0,var(--v5330-title-lift,0px),0)!important;
      pointer-events:var(--v5330-title-events,auto)!important;
    }
    body.public-leads-page[data-public-scroll-section="title"] .public-scroll-caption-stack-v5319{
      opacity:0!important;visibility:hidden!important;pointer-events:none!important;
    }
    body.public-leads-page[data-public-scroll-section="map"] .public-scroll-caption-stack-v5319{
      opacity:1!important;visibility:visible!important;pointer-events:none!important;
    }
    body.public-leads-page .public-scrollpoints{
      display:none!important;
    }
    body.public-leads-page .public-scroll-legend{
      display:none!important;
    }
    body.public-leads-page .public-scroll-caption-stack-v5319{
      position:absolute;
      left:clamp(18px,4vw,66px);
      bottom:clamp(24px,5vh,72px);
      z-index:30;
      display:grid;
      grid-template-columns:repeat(2,minmax(180px,1fr));
      gap:10px;
      width:min(620px,calc(100vw - 36px));
      opacity:0;
      transform:translate3d(0,24px,0) scale(.985);
      filter:blur(4px);
      pointer-events:none;
      transition:opacity 240ms ease,filter 240ms ease,transform 420ms cubic-bezier(.2,.9,.2,1);
    }
    body[data-public-scroll-section="map"] .public-scroll-caption-stack-v5319{
      opacity:1;
      transform:translate3d(0,0,0) scale(1);
      filter:blur(0);
    }
    .public-scroll-caption-stack-v5319 article{
      min-height:78px;
      padding:12px 14px;
      border:1px solid rgba(186,235,211,.20);
      background:rgba(2,34,26,.68);
      backdrop-filter:blur(12px);
      color:#e9f6ef;
    }
    .public-scroll-caption-stack-v5319 article small{
      display:block;
      margin-bottom:5px;
      font-size:8px;
      letter-spacing:.16em;
      color:#75ab92;
    }
    .public-scroll-caption-stack-v5319 article b{
      display:block;
      margin-bottom:4px;
      font:500 15px/1.15 Georgia,serif;
    }
    .public-scroll-caption-stack-v5319 article span{
      display:block;
      font-size:10px;
      line-height:1.45;
      color:#abc9ba;
    }
    body.public-leads-page [data-hero-letter]{
      will-change:transform,opacity,filter;
    }
    body[data-public-scroll-section="map"] [data-hero-letter]{
      opacity:0!important;
      filter:blur(5px)!important;
      transform:translate3d(0,-34px,0)!important;
      pointer-events:none!important;
    }
    body[data-public-scroll-section="title"] map-scene[data-public-map] .map-rotation-controls,
    body[data-public-scroll-section="title"] map-scene[data-public-presentation] .map-rotation-controls{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    body[data-public-scroll-section="map"] map-scene[data-public-map] .map-rotation-controls,
    body[data-public-scroll-section="map"] map-scene[data-public-presentation] .map-rotation-controls{
      display:flex!important;
      visibility:visible!important;
      pointer-events:auto!important;
      opacity:1!important;
    }
    body[data-public-scroll-section="map"] map-scene[data-public-map] .map-pan-pad,
    body[data-public-scroll-section="map"] map-scene[data-public-presentation] .map-pan-pad,
    body[data-public-scroll-section="map"] map-scene[data-public-map] [data-scene-pan],
    body[data-public-scroll-section="map"] map-scene[data-public-presentation] [data-scene-pan]{
      display:none!important;
    }
    @media (max-width:720px){
      body.public-leads-page .public-scroll-caption-stack-v5319{
        grid-template-columns:1fr;
        width:min(360px,calc(100vw - 30px));
        left:15px;
        bottom:18px;
      }
      .public-scroll-caption-stack-v5319 article{min-height:0}
    }
  `;
  document.head.append(style);
}

function ensureStaticFallback(){
  const sticky=document.querySelector('.public-map-sticky');
  const map=sticky?.querySelector(PUBLIC_MAP_SELECTOR)||document.querySelector(PUBLIC_MAP_SELECTOR);
  if(!map)return null;
  const satelliteImageOnly=document.body.classList.contains('public-leads-page');
  if(satelliteImageOnly){
    map.setAttribute('data-public-static-only','true');
    map.dataset.publicSatelliteImageOnly='true';
  }
  let bg=sticky?.querySelector('.public-map-static-bg');
  if(sticky&&!bg){
    bg=document.createElement('div');
    bg.className='public-map-static-bg';
    bg.setAttribute('aria-hidden','true');
    bg.style.backgroundImage="linear-gradient(90deg,rgba(3,17,12,.24),rgba(3,17,12,.02) 64%),url('/assets/public/dwg-satellite-treated-v5411.png')";
    bg.style.backgroundSize='cover,cover';
    bg.style.backgroundPosition='center,center';
    bg.dataset.publicFallback='DWG-centred treated satellite raster';
    sticky.prepend(bg);
  }
  const staticOnly=map.hasAttribute('data-public-static-only');
  const leaflet=map.querySelector('.map-host');
  if(leaflet){
    leaflet.style.backgroundImage="linear-gradient(90deg,rgba(3,17,12,.24),rgba(3,17,12,.02) 64%),url('/assets/public/dwg-satellite-treated-v5411.png')";
    leaflet.style.backgroundSize='cover,cover';
    leaflet.style.backgroundPosition='center,center';
    leaflet.style.backgroundRepeat='no-repeat';
    leaflet.style.setProperty('opacity',staticOnly?'1':'0','important');
    leaflet.style.setProperty('visibility',staticOnly?'visible':'hidden','important');
    leaflet.style.pointerEvents='none';
  }
  map.removeAttribute('data-base-map');
  if(staticOnly){
    map.style.setProperty('pointer-events','auto','important');
    map.setAttribute('data-public-static-base','true');
    map.removeAttribute('data-public-satellite-base');
    map.dataset.renderMode='static-satellite-markers';
    map.dataset.publicMapBase='static-treated-satellite';
  }else{
    // A tela "Dashboard Inicial" usa a leitura aérea do entorno. A mesma base
    // passa a ser renderizada no plano Three.js, alinhada ao GLB por GPS.
    map.removeAttribute('data-public-static-base');
    map.setAttribute('data-public-satellite-base','true');
    map.dataset.publicMapBase='satellite-georeferenced-dashboard-reference';
  }
  map.setAttribute('data-public-presentation','true');
  return {map,bg};
}

function applySunnyPublicScene(map,attempt=0){
  if(!map||!isPublicMap(map))return;
  if(!map.THREE||!map.scene||!map.renderer||!map.sceneStage){
    if(attempt<60&&!map.__publicSunnySceneTimer){
      map.__publicSunnySceneTimer=setTimeout(()=>{
        map.__publicSunnySceneTimer=null;
        applySunnyPublicScene(map,attempt+1);
      },300);
    }
    return;
  }
  const THREE=map.THREE;
  if(map.dataset.publicSunnyScene!==SUNNY_SCENE_VERSION){
    map.renderer.toneMappingExposure=1.16;
    if(map.scene.background?.isColor)map.scene.background.setHex(0x0b1713);
    else map.scene.background=new THREE.Color(0x0b1713);
    map.scene.traverse?.(node=>{
      if(node.isHemisphereLight){
        node.intensity=2.9;
        node.color?.setHex?.(0xdcefff);
        node.groundColor?.setHex?.(0x76634e);
      }
      if(node.isDirectionalLight){
        node.intensity=4.8;
        node.color?.setHex?.(0xffedbf);
        node.position?.set?.(-120,-160,260);
      }
      if(node.isAmbientLight)node.intensity=Math.max(Number(node.intensity)||0,.18);
    });
    if(!map.scene.getObjectByName('AliançaParkPublicSun')){
      const sun=new THREE.DirectionalLight(0xffd48a,1.05);
      sun.name='AliançaParkPublicSun';
      sun.position.set(150,-80,180);
      map.scene.add(sun);
    }
    map.dataset.publicSunnyScene=SUNNY_SCENE_VERSION;
    map.dataset.publicSunnyLighting='sunny-day · warm key + earth-tone horizon';
    map.dataset.publicSunnyBackdrop='earth-tone · no blue horizon gap';
  }

  // Remove os volumes verdes sintéticos do contexto. A imagem de satélite
  // georreferenciada é a única base do terreno; árvores e estruturas ficam.
  let hidden=Number(map.dataset.publicGreenMeshCount)||0;
  map.sceneStage.traverse?.(node=>{
    if(!node?.isMesh)return;
    const kind=String(node.userData?.kind||'').toLowerCase();
    const name=String(node.name||'').toLowerCase();
    if(node.userData?.publicContext&&(
      kind==='terrain-ring'||kind==='extruded-terrain'||/greenarea/.test(name)
    )){
      if(node.visible){node.visible=false;hidden++;}
      node.userData.publicGreenMeshRemoved=true;
    }
  });
  const relief=map.publicGreenReliefGroup||map.sceneStage.getObjectByName?.('BelavistaPublicGreenRelief');
  if(relief){
    if(relief.visible)hidden++;
    relief.visible=false;
  }
  map.dataset.publicGreenMesh='removed';
  map.dataset.publicGreenMeshCount=String(hidden);
  map.dataset.publicGreenMeshPolicy='satellite terrain only · no synthetic green base';
  map.renderer.render?.(map.scene,map.camera);
  const contextPending=map.dataset.publicEnvironment!=='ready';
  const contextNeedsCleanup=Boolean(map.publicGpsContextEnvironment)&&hidden===0;
  if((contextPending||contextNeedsCleanup)&&attempt<60&&!map.__publicSunnySceneTimer){
    map.__publicSunnySceneTimer=setTimeout(()=>{
      map.__publicSunnySceneTimer=null;
      applySunnyPublicScene(map,attempt+1);
    },300);
  }
}

async function applyDwgSatelliteFrame(map,attempt=0){
  if(!map)return;
  const staticOnly=map.hasAttribute('data-public-static-only');
  if(!staticOnly&&(!map.THREE||!map.mapSurface)){
    if(attempt<24)setTimeout(()=>applyDwgSatelliteFrame(map,attempt+1),350);
    return;
  }
  try{
    const response=await fetch(runtimeUrlV1('/assets/data/dwg-georeference.json'),{cache:'no-store'});
    if(!response.ok)throw new Error(`DWG HTTP ${response.status}`);
    const geo=await response.json();
    const center=(geo.controlPoints||[]).find(point=>point.id==='site-center')||geo.controlPoints?.[0];
    if(!Number.isFinite(Number(center?.lat))||!Number.isFinite(Number(center?.lng)))throw new Error('Centro GPS ausente no DWG');
    // A captura local é a única base visual do atendimento público. Não
    // consulte tiles, Leaflet, Google Maps ou Esri: a imagem foi capturada e
    // tratada no projeto e é enquadrada pelo mesmo centro/bounds do DWG.
    const mapMode='generated';
    const theme={center:[Number(center.lat),Number(center.lng)],zoom:PUBLIC_SATELLITE_DWG_ZOOM};
    map.dwgGeo=geo;
    map._publicGeoTheme=theme;
    map._publicDwgGeoBounds=geo.drawingBounds?.gps||null;
    map.dataset.publicDwgControlPoints=String((geo.controlPoints||[]).filter(point=>Number.isFinite(Number(point?.lat))&&Number.isFinite(Number(point?.lng))).length);
    const gpsBounds=geo.drawingBounds?.gps;
    if(gpsBounds&&['south','west','north','east'].every(key=>Number.isFinite(Number(gpsBounds[key])))){
      map.dataset.publicDwgBounds=`${Number(gpsBounds.south).toFixed(7)},${Number(gpsBounds.west).toFixed(7)}|${Number(gpsBounds.north).toFixed(7)},${Number(gpsBounds.east).toFixed(7)}`;
    }
    if(staticOnly){
      map.dataset.renderMode=map.dataset.publicSatelliteImageOnly==='true'?'static-satellite-image-only':'static-satellite-markers';
      map.dataset.mapRasterMode='static-css-background';
      map.dataset.publicMapTexture='local captured satellite image · static-only · no Maps';
      if(map.dataset.publicSatelliteImageOnly==='true'){
        const visualSurface=map.closest('.public-map-sticky')||map;
        visualSurface.querySelectorAll('.satellite-lot-plan-overlay,[data-public-static-lot-markers],.public-lot-info-v5318,[data-public-lot-details-v5335],[data-selected-lot]').forEach(node=>node.remove());
        map.dataset.publicStaticLotMarkers='0';
        map.dataset.publicLotPolygonCount='0';
        map.dataset.publicCommercialMarkerState='disabled-satellite-image-only';
        clearCommercialMarkers(map);
      }else{
        // A camada PDF e seus marcadores continuam disponíveis nos mapas
        // administrativos estáticos. A página pública pede somente a foto.
        await map.installSatelliteLotPlanOverlayV1?.({markers:false});
        installStaticLotMarkers(map,geo);
        loadPublicCommercialDeals()
          .then(entries=>updateStaticLotMarkerStatuses(map,entries))
          .catch(()=>{});
      }
      return;
    }
    // A base aérea não depende da URL nem de preferência persistida do shell.
    // Mantê-la fixa evita que uma navegação reative uma fonte cartográfica
    // externa ou substitua a captura local.
    map._publicRequestedMapTileMode=mapMode;
    map.mapSurface.visible=true;
    map.setMapTileMode?.(mapMode,false);
    map.refreshMapSurface?.(theme,window.innerWidth,window.innerHeight);
    map.dataset.publicDwgCenter=`${theme.center[0].toFixed(8)},${theme.center[1].toFixed(8)}`;
    map.dataset.publicDwgCrs=`EPSG:${geo.crs?.epsg||'31984'}`;
    map.dataset.publicMapTexture='local captured satellite image · DWG-centred source · no Maps';
  }catch(error){
    map.dataset.publicMapTexture='satellite unavailable · neutral base retained';
    console.warn('[Belavista public] base satélite do DWG indisponível.',error);
  }
}

function autoGrow(field){
  if(!field)return;
  field.style.height='auto';
  field.style.height=`${Math.min(Math.max(field.scrollHeight,58),190)}px`;
}

function installChat(){
  const box=document.querySelector('public-lead-chat .public-chatbox');
  if(!box||box.dataset.publicChatV5318==='true')return Boolean(box);
  box.dataset.publicChatV5318='true';
  const chatHost=box.closest('public-lead-chat');
  if(!box.id)box.id='public-leads-chatbox';

  box.querySelectorAll(
    '.public-chat-chrome,.public-chat-v52-chrome,.public-chat-capabilities.public-chat-v52-capabilities,.public-chat-microcopy'
  ).forEach(node=>node.remove());

  const legacyHeader=box.querySelector(':scope > header');
  if(legacyHeader)legacyHeader.dataset.publicLegacyHeader='true';

  const chrome=document.createElement('div');
  chrome.className='public-chat-v52-chrome';
  chrome.innerHTML=`<div class="public-chat-v52-brand"><img class="public-chat-v52-mark" src="${BRAND_MARK}" alt=""><span><b>CORRETAGEM · ALIANÇA PARK</b><small>VENDA DE LOTES · INFORMAÇÃO DO VENDEDOR</small></span></div><div class="public-chat-v52-live"><i></i><span>ATIVA</span></div><button type="button" class="public-chat-v52-collapse" data-public-chat-collapse aria-expanded="true" aria-controls="${box.id}" aria-label="Recolher atendimento para a direita"><span aria-hidden="true">›</span></button>`;
  box.prepend(chrome);

  const collapseButton=chrome.querySelector('[data-public-chat-collapse]');
  const setChatCollapsed=collapsed=>{
    const value=Boolean(collapsed);
    box.dataset.publicChatCollapsed=value?'true':'false';
    if(chatHost)chatHost.dataset.publicChatCollapsed=value?'true':'false';
    document.body.dataset.publicChatCollapsed=value?'true':'false';
    if(!collapseButton)return;
    collapseButton.setAttribute('aria-expanded',String(!value));
    collapseButton.setAttribute('aria-label',value?'Abrir atendimento':'Recolher atendimento para a direita');
    collapseButton.dataset.state=value?'collapsed':'expanded';
    const glyph=collapseButton.querySelector('span');
    if(glyph)glyph.textContent=value?'‹':'›';
  };
  collapseButton?.addEventListener('click',()=>setChatCollapsed(box.dataset.publicChatCollapsed!=='true'));
  setChatCollapsed(false);

  const message=box.querySelector('[data-chat-message]');
  if(message&&!message.dataset.salesSeedV5330){
    message.dataset.salesSeedV5330='true';
    message.innerHTML='';
    const kicker=document.createElement('span');
    kicker.className='public-chat-v52-kicker';
    kicker.textContent='BEM-VINDO · ATENDIMENTO ALIANÇA PARK';
    const copy=document.createElement('span');
    copy.className='public-chat-sales-question-v5330';
    const welcome='Bem-vindo ao Aliança Park! Posso ajudar você a encontrar um lote, consultar disponibilidade e valores ou iniciar uma reserva com o corretor.';
    copy.textContent=welcome;
    message.append(kicker,copy);
    globalThis.belavistaTypeAssistantMessage?.(copy,welcome);
  }

  const form=box.querySelector('[data-chat-form]');
  if(form){
    let field=form.elements?.message||form.querySelector('[name="message"]');
    if(field&&field.tagName!=='TEXTAREA'){
      const textarea=document.createElement('textarea');
      for(const attr of field.attributes)textarea.setAttribute(attr.name,attr.value);
      textarea.rows=1;
      textarea.value=field.value||'';
      field.replaceWith(textarea);
      field=textarea;
    }
    if(field){
      field.rows=1;
      field.setAttribute('aria-label','Pergunta comercial sobre lote do Aliança Park');
      field.placeholder='Lote, valor, entrada, condições ou reserva…';
      field.addEventListener('input',()=>autoGrow(field));
      field.addEventListener('keydown',event=>{
        if(event.key==='Enter'&&!event.shiftKey){
          event.preventDefault();
          form.requestSubmit?.();
        }
      });
      requestAnimationFrame(()=>autoGrow(field));
    }
    if(!box.querySelector('.public-chat-v52-capabilities')){
      const caps=document.createElement('div');
      caps.className='public-chat-capabilities public-chat-v52-capabilities';
      caps.setAttribute('aria-hidden','true');
      caps.innerHTML='<span>01 · ESCOLHA</span><span>02 · IDENTIFICAÇÃO</span><span>03 · RESERVA</span>';
      form.before(caps);
    }
  }

  const oldFoot=box.querySelector('[data-chat-foot]');
  if(oldFoot){
    oldFoot.hidden=false;
    oldFoot.classList.add('public-chat-v52-foot');
    oldFoot.textContent='CORRETAGEM CONECTADA · DISPONIBILIDADE · CONDIÇÕES · RESERVA';
  }
  return true;
}

function lotDetails(source){
  const data=source?.userData||{};
  const label=data.partLabel||data.label||source?.name||'Lote selecionado';
  const rows=[];
  const values={};
  const add=(name,value,key)=>{
    const text=String(value??'').trim();
    if(!text)return;
    rows.push([name,text]);
    if(key)values[key]=text;
  };
  add('Referência',data.partId||data.lotId||data.id,'id');
  add('Quadra',data.quadra||data.block||data.blockName,'block');
  add('Área',data.area||data.areaM2||data.squareMeters,'area');
  add('Situação',data.publicCommercialLabel||data.publicCommercialStatus||data.status||data.availability||data.lotStatus||data.state,'status');
  add('Orientação',data.sun||data.orientation||data.solarOrientation,'orientation');
  if(!values.status){
    values.status='Disponibilidade sob consulta';
    rows.push(['Situação',values.status]);
  }
  return {
    label,
    rows,
    values,
    partId:String(data.partId||data.lotId||data.id||source?.name||'').trim(),
    partKind:String(data.partKind||'lots'),
    sourceName:String(source?.name||'')
  };
}




const PUBLIC_STAGE_COLORS={
  terraplanagem:0xf1b832,drenagem:0x3f9cff,'rede-agua':0x32c5d9,
  'rede-eletrica':0x9b7cff,pavimentacao:0xff7c45,urbanizacao:0x42be65
};
const PUBLIC_STAGE_LABELS={
  terraplanagem:'Terraplanagem',drenagem:'Drenagem','rede-agua':'Rede de água',
  'rede-eletrica':'Rede elétrica',pavimentacao:'Pavimentação',urbanizacao:'Urbanização'
};
function publicStageKey(value=''){
  const text=String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(text.includes('terra'))return 'terraplanagem';
  if(text.includes('dren'))return 'drenagem';
  if(text.includes('agua'))return 'rede-agua';
  if(text.includes('eletric')||text.includes('ilumin'))return 'rede-eletrica';
  if(text.includes('paviment')||text.includes('meio')||text.includes('fio')||text.includes('guia'))return 'pavimentacao';
  if(text.includes('praca')||text.includes('urban')||text.includes('arbor')||text.includes('sinal'))return 'urbanizacao';
  return null;
}
function parseRecordMapArea(record){
  let value=record?.mapArea??record?.mapAreas??record?.areaMap??null;
  if(!value)return [];
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}}
  if(!Array.isArray(value))value=[value];
  return value.filter(Boolean).map(item=>typeof item==='string'?{partId:item,label:item}:item);
}
async function loadPublicConstructionRecords(){
  let snapshot=[];
  try{
    const response=await fetch(runtimeUrlV1('/assets/data/public-record-stage-state-v5330.json'),{cache:'no-store'});
    if(response.ok){const payload=await response.json();snapshot=Array.isArray(payload?.records)?payload.records:[];}
  }catch{}
  let live=[];
  try{
    const response=await fetch(runtimeUrlV1('/api/records'),{headers:{Accept:'application/json'},cache:'no-store'});
    if(response.ok){const payload=await response.json();live=Array.isArray(payload)?payload:(Array.isArray(payload?.records)?payload.records:[]);}
  }catch(error){
    console.info('[Belavista public v5.3.30] registros remotos indisponíveis; usando snapshot público.',error);
  }
  const byId=new Map();
  [...snapshot,...live].forEach((record,index)=>{
    const id=String(record?.id||`record-${index}`);
    byId.set(id,{id,
      stage:String(record?.etapa||record?.stage||record?.atividade||record?.activity||record?.categoria||''),
      activity:String(record?.atividade||record?.activity||''),
      category:String(record?.categoria||record?.natureza||''),
      status:String(record?.status||''),
      progress:Number(record?.progresso??record?.progress??0)||0,
      mapArea:record?.mapArea??record?.mapAreas??null
    });
  });
  return [...byId.values()];
}
function recordStageSummaries(records=[]){
  const result=new Map();
  for(const record of records){
    const key=publicStageKey(record.stage||record.activity||record.category);
    if(!key)continue;
    const areas=parseRecordMapArea(record);
    const current=result.get(key)||{key,label:PUBLIC_STAGE_LABELS[key],records:0,areas:0,progress:0};
    current.records++; current.areas+=areas.length; current.progress=Math.max(current.progress,Number(record.progress||0));
    result.set(key,current);
  }
  return [...result.values()];
}
function resolveRecordAreaParts(map,records,stageKey){
  const parts=[...(map.modelParts?.lots||[]),...(map.modelParts?.streets||[]),...(map.modelParts?.other||[])];
  const byId=new Map();
  for(const part of parts){
    [part.userData?.partId,part.userData?.partLabel,part.name].filter(Boolean).forEach(value=>byId.set(String(value),part));
  }
  const found=[];
  for(const record of records){
    if(publicStageKey(record.stage||record.activity||record.category)!==stageKey)continue;
    for(const area of parseRecordMapArea(record)){
      for(const candidate of [area.partId,area.id,area.label,area.name].filter(Boolean).map(String)){
        const part=byId.get(candidate);
        if(part){found.push(part);break;}
      }
    }
  }
  return [...new Map(found.map(part=>[(part.userData?.partId||part.name),part])).values()];
}
function clearConstructionRecordHighlight(map,render=true){
  for(const part of map.__publicRecordHighlightPartsV5330||[]){
    delete part.userData.overlayMaterial;
    map.restorePartMaterial?.(part);
  }
  map.__publicRecordHighlightPartsV5330=[];
  map.dataset.publicConstructionStage='';
  map.dataset.publicConstructionMapped='0';
  try{map.clearStageOverlay?.(false);}catch{}
  if(render)map.renderer?.render?.(map.scene,map.camera);
}
function setConstructionRecordHighlight(map,key){
  if(!key)return clearConstructionRecordHighlight(map);
  if(map.dataset.publicConstructionStage===key){
    clearConstructionRecordHighlight(map);
    renderMapStateExplorer(map);
    return;
  }
  clearConstructionRecordHighlight(map,false);
  const state=map.__publicConstructionStateV5330||{records:[]};
  const parts=resolveRecordAreaParts(map,state.records,key);
  const color=PUBLIC_STAGE_COLORS[key]||0x42be65;
  if(parts.length){
    for(const part of parts){
      part.userData.overlayMaterial=map.materialForColor?.(part.userData.defaultMaterial,color,.9);
      if(part.userData.overlayMaterial)part.material=part.userData.overlayMaterial;
    }
    map.__publicRecordHighlightPartsV5330=parts;
    map.dataset.publicConstructionMapped=String(parts.length);
  }else{
    try{
      if(!map.stageOverlayTargets||!Object.keys(map.stageOverlayTargets).length)map.buildStageOverlayTargets?.();
      map.setStageOverlay?.(key,false);
    }catch(error){
      console.info('[Belavista public v5.3.30] overlay temático da etapa não disponível.',key,error);
    }
  }
  map.dataset.publicConstructionStage=key;
  map.renderer?.render?.(map.scene,map.camera);
  renderMapStateExplorer(map);
}
async function installConstructionRecordState(map){
  if(!map||map.__publicConstructionStateLoadingV5330)return false;
  map.__publicConstructionStateLoadingV5330=true;
  try{
    const records=await loadPublicConstructionRecords();
    map.__publicConstructionStateV5330={records,stages:recordStageSummaries(records)};
    map.dataset.publicConstructionRecords=String(records.length);
    installPublicPavingControl(map);
    renderMapStateExplorer(map);
    return true;
  }finally{map.__publicConstructionStateLoadingV5330=false;}
}

function publicPavingProgress(map){
  const stage=(map?.__publicConstructionStateV5330?.stages||[])
    .find(item=>item.key==='pavimentacao');
  return Math.max(0,Math.min(100,Number(stage?.progress)||0));
}

function installPublicPavingControl(map){
  const sticky=document.querySelector('.public-map-sticky');
  if(!map)return;
  // A implantação pública não redesenha as vias. A fotografia aérea
  // georreferenciada pelo DWG é a superfície canônica da rua.
  sticky?.querySelector('[data-public-paving-control]')?.remove();
  map.setPublicPavingView?.('satellite',0);
}

const PUBLIC_STATUS_COLORS={
  available:0x42be65,
  reserved:0xf1c21b,
  sold:0xfa4d56,
  negotiation:0x4589ff
};
const PUBLIC_STATUS_LABELS={
  available:'Disponível',
  reserved:'Reservado',
  sold:'Vendido',
  negotiation:'Em negociação'
};
function normalizePublicMarkerStatus(value='available'){
  const status=String(value||'').trim().toLocaleLowerCase('pt-BR');
  return Object.prototype.hasOwnProperty.call(PUBLIC_STATUS_COLORS,status)?status:'available';
}
function publicStatusColorHex(status='available'){
  return `#${PUBLIC_STATUS_COLORS[normalizePublicMarkerStatus(status)].toString(16).padStart(6,'0')}`;
}
function classifyCommercialStatus(value=''){
  const status=String(value||'').trim().toLocaleLowerCase('pt-BR');
  if(/assin|vend|fechad|conclu|contrat/.test(status))return 'sold';
  if(/reserv/.test(status))return 'reserved';
  if(/propost|análise|analise|negocia|novo lead|intenção|intencao/.test(status))return 'negotiation';
  return 'available';
}

function lotDigits(value=''){
  return String(value||'').match(/\d+/g)?.map(Number)||[];
}

function normalizeCommercialLot(value=''){
  return String(value||'')
    .toUpperCase()
    .replace(/QUADRA|LOTE|QD/g,'')
    .replace(/[^A-Z0-9]/g,'');
}

function publicDwgLotRecords(map){
  const geo=map?.dwgGeo;
  const fields=Array.isArray(geo?.lotFields)?geo.lotFields:[];
  return (Array.isArray(geo?.lots)?geo.lots:[]).map(row=>{
    if(!Array.isArray(row))return row;
    return Object.fromEntries(fields.map((field,index)=>[field,row[index]]));
  }).filter(item=>item&&typeof item==='object');
}

function staticLotIdentity(record,index){
  const id=String(record?.glbObject||`Lote_${String(index+1).padStart(3,'0')}`).trim();
  const digits=lotDigits(id);
  const number=digits.length?digits[digits.length-1]:index+1;
  return {id,label:`Lote ${String(number).padStart(3,'0')}`};
}

function staticLotSource(record,index,status='available'){
  const identity=staticLotIdentity(record,index);
  const normalized=normalizePublicMarkerStatus(status);
  return {
    name:identity.id,
    userData:{
      partId:identity.id,
      lotId:identity.id,
      partLabel:identity.label,
      partKind:'lots',
      areaM2:Number(record?.areaM2)||null,
      publicCommercialStatus:normalized,
      publicCommercialLabel:PUBLIC_STATUS_LABELS[normalized],
      block:String(record?.sourceLayer||''),
      lat:Number(record?.lat)||null,
      lng:Number(record?.lng)||null,
      dwgAlignmentErrorM:Number(record?.alignmentErrorM)||0
    }
  };
}

function staticLotPosition(record,bounds,index,total){
  const utmEast=Number(record?.utmEast),northing=Number(record?.utmNorth);
  if(Number.isFinite(utmEast)&&Number.isFinite(northing)){
    const h=SATELLITE_UTM_TO_UV_HOMOGRAPHY_V1;
    const w=h[2][0]*utmEast+h[2][1]*northing+h[2][2];
    if(Number.isFinite(w)&&Math.abs(w)>1e-12){
      const u=(h[0][0]*utmEast+h[0][1]*northing+h[0][2])/w;
      const v=(h[1][0]*utmEast+h[1][1]*northing+h[1][2])/w;
      if(Number.isFinite(u)&&Number.isFinite(v))return {
        left:`${Math.max(0,Math.min(100,u*100))}%`,
        top:`${Math.max(0,Math.min(100,v*100))}%`
      };
    }
  }
  const south=Number(bounds?.south),west=Number(bounds?.west),north=Number(bounds?.north),east=Number(bounds?.east);
  const lat=Number(record?.lat),lng=Number(record?.lng);
  const validBounds=[south,west,north,east].every(Number.isFinite)&&north>south&&east>west;
  const fallbackTotal=Math.max(1,total||1);
  const x=validBounds&&Number.isFinite(lng)?((lng-west)/(east-west))*100:((index+.5)/fallbackTotal)*100;
  const y=validBounds&&Number.isFinite(lat)?((north-lat)/(north-south))*100:50;
  return {
    left:`${Math.max(1,Math.min(99,x))}%`,
    top:`${Math.max(1,Math.min(99,y))}%`
  };
}

function updateStaticLotMarkerStatuses(map,entries=[]){
  const markers=map?.__publicStaticLotMarkers||[];
  if(!markers.length)return;
  const byLot=new Map((Array.isArray(entries)?entries:[]).map(entry=>[
    normalizeCommercialLot(entry?.lot||entry?.lotId||''),entry
  ]).filter(([key])=>key));
  const counts={available:0,reserved:0,negotiation:0,sold:0};
  markers.forEach(marker=>{
    const entry=byLot.get(normalizeCommercialLot(marker.dataset.lotId||''));
    const status=normalizePublicMarkerStatus(entry?.status||'available');
    marker.dataset.status=status;
    marker.title=`${marker.dataset.lotLabel||marker.dataset.lotId} · ${PUBLIC_STATUS_LABELS[status]}`;
    counts[status]=(counts[status]||0)+1;
  });
  map.dataset.publicStaticLotStatusCounts=Object.entries(counts).map(([key,value])=>`${key}:${value}`).join('|');
}

function selectStaticLot(map,record,index,marker){
  if(!map||!marker)return false;
  clearPublicSelection(map,true);
  const source=staticLotSource(record,index,marker.dataset.status||'available');
  marker.classList.add('is-selected');
  map.__publicStaticLotMarker=marker;
  map.dataset.selectedPart=source.userData.partLabel;
  map.dataset.selectedKind='lots';
  map.dataset.selectedLotCount='1';
  map.dataset.selectedLots=source.userData.partId;
  map.dataset.publicSelectionFocus='static-marker';
  map.__publicSelectedLotContextV5330=selectedLotAgentContext(map,source);
  renderLotWidget(map,source);
  document.body.dataset.publicWidgetsVisible='true';
  document.body.dataset.publicControlsVisible='true';
  return true;
}

function installStaticLotMarkers(map,geo){
  const sticky=document.querySelector('.public-map-sticky');
  const surface=sticky||map;
  if(!map||!surface)return false;
  if(!document.__belavistaStaticLotMarkerClickV1){
    document.__belavistaStaticLotMarkerClickV1=true;
    document.addEventListener('click',event=>{
      const marker=event.target?.closest?.('[data-public-static-lot-marker]');
      const owner=marker?.closest?.('map-scene[data-public-static-only]');
      const selection=marker?.__publicStaticLotRecord;
      if(!marker||!owner||!selection)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      selectStaticLot(owner,selection.record,selection.index,marker);
    },true);
  }
  const records=publicDwgLotRecords({dwgGeo:geo});
  const fittedSatellite=surface.querySelector('.satellite-lot-plan-fit');
  const markerSurface=fittedSatellite||surface;
  let layer=markerSurface.querySelector('[data-public-static-lot-markers]');
  if(layer)layer.style.setProperty('pointer-events','auto','important');
  if(layer&&map.__publicStaticLotMarkers?.length)return true;
  if(!layer){
    layer=document.createElement('div');
    layer.className='public-static-lot-markers';
    layer.style.setProperty('pointer-events','auto','important');
    layer.dataset.publicStaticLotMarkers='true';
    layer.setAttribute('aria-label','Marcações dos lotes');
    markerSurface.append(layer);
  }
  layer.replaceChildren();
  const bounds=geo?.drawingBounds?.gps||{};
  const markers=[];
  records.forEach((record,index)=>{
    const identity=staticLotIdentity(record,index);
    const marker=document.createElement('button');
    marker.type='button';
    marker.className='public-static-lot-marker';
    marker.dataset.publicStaticLotMarker=identity.id;
    marker.dataset.lotId=identity.id;
    marker.dataset.lotLabel=identity.label;
    marker.dataset.status='available';
    marker.__publicStaticLotRecord={record,index};
    marker.setAttribute('aria-label',`${identity.label} · Disponível`);
    marker.textContent=identity.label.replace(/^Lote\s*/i,'');
    Object.assign(marker.style,staticLotPosition(record,bounds,index,records.length));
    marker.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      selectStaticLot(map,record,index,marker);
    });
    marker.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        selectStaticLot(map,record,index,marker);
      }
    });
    layer.append(marker);
    markers.push(marker);
  });
  map.__publicStaticLotMarkers=markers;
  map.dataset.publicStaticLotMarkers=String(markers.length);
  map.dataset.publicStaticLotMarkerMapping='DWG GPS bounds · treated satellite raster';
  return markers.length>0;
}

function commercialLotReference(value=''){
  const text=String(value||'');
  const lotMatch=text.match(/(?:^|[^a-z])(?:lote|lt)\s*[_ -]*0*(\d+)/i);
  const quadraMatch=text.match(/(?:^|[^a-z])(?:quadra|q)\s*[_ -]*0*(\d+)/i);
  const numbers=lotDigits(text);
  const lot=lotMatch?String(Number(lotMatch[1])):(numbers.length===1?String(numbers[0]):null);
  const quadra=quadraMatch?String(Number(quadraMatch[1])):null;
  return {lot,quadra,numbers};
}

function lotSearchText(map,lot){
  const geo=publicDwgLotRecords(map).find(item=>String(item.glbObject||'')===String(lot?.name||''));
  return [
    lot?.name,
    lot?.userData?.partLabel,
    lot?.userData?.partId,
    lot?.userData?.lotId,
    geo?JSON.stringify(geo):''
  ].filter(Boolean).join(' ');
}

function commercialLotScore(map,lot,lotCode){
  const search=lotSearchText(map,lot);
  const wanted=commercialLotReference(lotCode);
  const found=commercialLotReference(search);
  if(wanted.lot&&found.lot&&wanted.lot===found.lot)return wanted.quadra&&found.quadra&&wanted.quadra===found.quadra?135:105;
  const norm=normalizeCommercialLot(search),target=normalizeCommercialLot(lotCode);
  if(target&&norm&&target===norm)return 95;
  const wantedNumbers=wanted.numbers,foundNumbers=found.numbers;
  if(!wantedNumbers.length||!foundNumbers.length)return 0;
  const lotNumber=wantedNumbers[wantedNumbers.length-1];
  const block=wantedNumbers.length>1?wantedNumbers[0]:null;
  let score=0;
  if(foundNumbers.includes(lotNumber))score+=55;
  if(block!=null&&foundNumbers.includes(block))score+=35;
  if(wantedNumbers.every(number=>foundNumbers.includes(number)))score+=45;
  return score;
}

function resolveCommercialLot(map,lotCode){
  const lots=publicLotParts(map);
  const target=commercialLotReference(lotCode);
  if(target.lot){
    const exact=lots.find(lot=>{
      const reference=commercialLotReference(lotSearchText(map,lot));
      return reference.lot===target.lot&&(!target.quadra||!reference.quadra||reference.quadra===target.quadra);
    });
    if(exact)return exact;
  }
  let best=null,bestScore=0;
  for(const lot of lots){
    const score=commercialLotScore(map,lot,lotCode);
    if(score>bestScore){best=lot;bestScore=score;}
  }
  return bestScore>=55?best:null;
}

function publicLotParts(map){
  // O GLB também classifica meshes auxiliares (faces, quinas e linhas) como
  // `lots`. Para os markers usamos somente um nó de implantação por nome e
  // ordenamos pelo número do lote; assim o espaçamento de fallback não acaba
  // escolhendo dois lotes vizinhos por causa da ordem interna do GLB.
  const lots=(map?.modelParts?.lots||[]).filter(lot=>/^lote(?:[_ -]?\d+)$/i.test(String(lot?.name||'')));
  return [...new Map(lots.map(lot=>[String(lot.name),lot])).values()]
    .sort((a,b)=>(lotDigits(a?.name)[0]||0)-(lotDigits(b?.name)[0]||0));
}

async function loadPublicCommercialDeals(){
  let live=[];
  try{
    const response=await apiFetch('/api/public/catalog',{headers:{Accept:'application/json'},cache:'no-store'});
    if(response.ok){
      const payload=await response.json();
      live=Array.isArray(payload?.lots)?payload.lots:[];
    }
  }catch(error){
    console.info('[Belavista public v5.3.30] estado comercial remoto indisponível; usando snapshot público.',error);
  }

  const source=live;
  const byLot=new Map();
  const priority={available:0,negotiation:1,reserved:2,sold:3};
  for(const deal of source){
    const lot=String(deal?.lot||deal?.lotId||'').trim();
    if(!lot)continue;
    const status=classifyCommercialStatus(deal?.status);
    const key=normalizeCommercialLot(lot);
    const previous=byLot.get(key);
    if(!previous||priority[status]>=priority[previous.status]){
      byLot.set(key,{lot,status,rawStatus:String(deal?.status||''),id:String(deal?.id||'')});
    }
  }
  return [...byLot.values()];
}

function makeCommercialPointTexture(THREE,color,label=''){
  const canvas=document.createElement('canvas');
  canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,128,128);
  // Pino de destaque inspirado na referência comercial: corpo arredondado,
  // ponta inferior e contorno claro, em vez do antigo selo circular.
  ctx.clearRect(0,0,128,128);
  ctx.beginPath();
  ctx.moveTo(64,116);
  ctx.bezierCurveTo(58,106,28,91,28,57);
  ctx.bezierCurveTo(28,33,44,17,64,17);
  ctx.bezierCurveTo(84,17,100,33,100,57);
  ctx.bezierCurveTo(100,91,70,106,64,116);
  ctx.closePath();
  ctx.fillStyle=`#${Number(color).toString(16).padStart(6,'0')}`;ctx.fill();
  ctx.lineWidth=4;ctx.strokeStyle='rgba(255,255,255,.98)';ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(43,31);ctx.bezierCurveTo(50,24,61,22,71,25);
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=3;ctx.stroke();
  if(label){
    ctx.fillStyle='#10241e';ctx.font='700 23px system-ui,sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(label).slice(-3),64,61);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  return texture;
}

function lotMarkerLabel(lot,index){
  const raw=String(lot?.userData?.partLabel||lot?.name||index+1);
  return (raw.match(/\d+(?:[-/]\d+)?/)||[String(index+1)])[0];
}

function publicLotPolygonHull(points=[]){
  const unique=[];
  const seen=new Set();
  for(const point of points){
    const x=Number(point?.x),y=Number(point?.y),z=Number(point?.z)||0;
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    const key=`${x.toFixed(4)}:${y.toFixed(4)}`;
    if(seen.has(key))continue;
    seen.add(key);unique.push({x,y,z});
  }
  if(unique.length<=3)return unique;
  unique.sort((a,b)=>a.x-b.x||a.y-b.y);
  const cross=(origin,a,b)=>(a.x-origin.x)*(b.y-origin.y)-(a.y-origin.y)*(b.x-origin.x);
  const lower=[];
  for(const point of unique){
    while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],point)<=0)lower.pop();
    lower.push(point);
  }
  const upper=[];
  for(let index=unique.length-1;index>=0;index--){
    const point=unique[index];
    while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],point)<=0)upper.pop();
    upper.push(point);
  }
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}

function publicLotPolygonCentroid(points=[]){
  if(points.length<3){
    const average=points.reduce((sum,point)=>({x:sum.x+point.x,y:sum.y+point.y,z:sum.z+point.z}),{x:0,y:0,z:0});
    const count=Math.max(1,points.length);
    return {x:average.x/count,y:average.y/count,z:average.z/count,area:0};
  }
  let twiceArea=0,cx=0,cy=0,z=0;
  for(let index=0;index<points.length;index++){
    const current=points[index],next=points[(index+1)%points.length];
    const factor=current.x*next.y-next.x*current.y;
    twiceArea+=factor;
    cx+=(current.x+next.x)*factor;
    cy+=(current.y+next.y)*factor;
    z+=current.z;
  }
  if(Math.abs(twiceArea)<.0001){
    const average=points.reduce((sum,point)=>({x:sum.x+point.x,y:sum.y+point.y,z:sum.z+point.z}),{x:0,y:0,z:0});
    return {x:average.x/points.length,y:average.y/points.length,z:average.z/points.length,area:0};
  }
  return {x:cx/(3*twiceArea),y:cy/(3*twiceArea),z:z/points.length,area:Math.abs(twiceArea)/2};
}

function publicLotPolygonContains(point,polygon=[]){
  if(!point||polygon.length<3)return false;
  let inside=false;
  for(let index=0;index<polygon.length;index++){
    const current=polygon[index],next=polygon[(index+1)%polygon.length];
    const crosses=(current.y>point.y)!==(next.y>point.y);
    if(crosses&&point.x<(next.x-current.x)*(point.y-current.y)/((next.y-current.y)||Number.EPSILON)+current.x)inside=!inside;
  }
  return inside;
}

function publicLotPolygonInteriorPoint(polygon=[]){
  const centroid=publicLotPolygonCentroid(polygon);
  if(polygon.length<3||publicLotPolygonContains(centroid,polygon))return {...centroid,method:'shoelace-centroid'};
  const average=polygon.reduce((sum,point)=>({x:sum.x+point.x,y:sum.y+point.y,z:sum.z+point.z}),{x:0,y:0,z:0});
  average.x/=Math.max(1,polygon.length);average.y/=Math.max(1,polygon.length);average.z/=Math.max(1,polygon.length);
  if(publicLotPolygonContains(average,polygon))return {...average,area:centroid.area,method:'vertex-average'};
  const minX=Math.min(...polygon.map(point=>point.x)),maxX=Math.max(...polygon.map(point=>point.x));
  const minY=Math.min(...polygon.map(point=>point.y)),maxY=Math.max(...polygon.map(point=>point.y));
  const boxCenter={x:(minX+maxX)/2,y:(minY+maxY)/2,z:average.z};
  for(let blend=.1;blend<=1;blend+=.1){
    const candidate={x:centroid.x*(1-blend)+boxCenter.x*blend,y:centroid.y*(1-blend)+boxCenter.y*blend,z:average.z};
    if(publicLotPolygonContains(candidate,polygon))return {...candidate,area:centroid.area,method:'interior-corrected'};
  }
  return {...boxCenter,area:centroid.area,method:'bbox-center-fallback'};
}

function buildPublicLotPolygonIndex(map){
  const lots=publicLotParts(map);
  if(!map?.THREE||!map?.sceneStage||!lots.length)return new Map();
  if(map.__publicLotPolygonIndexV5337)return map.__publicLotPolygonIndexV5337;
  const THREE=map.THREE;
  map.sceneStage.updateMatrixWorld?.(true);
  const stageInverse=new THREE.Matrix4().copy(map.sceneStage.matrixWorld).invert();
  const dwgByObject=new Map(publicDwgLotRecords(map).map(item=>[String(item?.glbObject||''),item]));
  const index=new Map();
  let fallbackCount=0,vertexCount=0,reviewCount=0,interiorCorrectionCount=0;
  for(const lot of lots){
    const stagePoints=[];
    lot.traverse?.(node=>{
      const position=node?.geometry?.getAttribute?.('position');
      if(!node?.isMesh||!position?.count)return;
      node.updateMatrixWorld?.(true);
      for(let vertex=0;vertex<position.count;vertex++){
        const point=new THREE.Vector3().fromBufferAttribute(position,vertex)
          .applyMatrix4(node.matrixWorld)
          .applyMatrix4(stageInverse);
        stagePoints.push({x:point.x,y:point.y,z:point.z});
      }
    });
    const polygon=publicLotPolygonHull(stagePoints);
    const dwg=dwgByObject.get(String(lot.name||''));
    let centroid,source='GLB polygon footprint';
    if(polygon.length>=3){
      centroid=publicLotPolygonInteriorPoint(polygon);
      if(centroid.method!=='shoelace-centroid')interiorCorrectionCount++;
      vertexCount+=polygon.length;
    }else{
      const bounds=new THREE.Box3().setFromObject(lot),world=bounds.getCenter(new THREE.Vector3());
      world.z=bounds.max.z;
      const local=world.applyMatrix4(stageInverse);
      centroid={x:local.x,y:local.y,z:local.z,area:0};
      fallbackCount++;
      source='GLB bounds fallback';
    }
    if(Number(dwg?.alignmentErrorM)>2)reviewCount++;
    const minX=Math.min(...polygon.map(point=>point.x),centroid.x),maxX=Math.max(...polygon.map(point=>point.x),centroid.x);
    const minY=Math.min(...polygon.map(point=>point.y),centroid.y),maxY=Math.max(...polygon.map(point=>point.y),centroid.y);
    index.set(String(lot.name||''),{
      lot,polygon,centroid:new THREE.Vector3(centroid.x,centroid.y,centroid.z),
      areaWorld2:centroid.area,spanX:maxX-minX,spanY:maxY-minY,source,dwg,
      dwgAlignmentErrorM:Number(dwg?.alignmentErrorM)||0,
      dwgGps:dwg?[Number(dwg.lat),Number(dwg.lng)]:null
    });
  }
  map.__publicLotPolygonIndexV5337=index;
  map.getCanonicalLotPolygons=()=>index;
  map.dispatchEvent(new CustomEvent('alianca:lot-polygons-ready',{detail:{count:index.size}}));
  map.dataset.publicLotPolygonMapping=`${index.size}/${lots.length} · 1 polygon canônico por lote · DWG lot key`;
  map.dataset.publicLotPolygonCount=String(index.size);
  map.dataset.publicLotPolygonVertices=String(vertexCount);
  map.dataset.publicLotPolygonFallback=String(fallbackCount);
  map.dataset.publicLotPolygonReview=String(reviewCount);
  map.dataset.publicLotPolygonInteriorCorrections=String(interiorCorrectionCount);
  map.dataset.publicLotPolygonSource='GLB footprint vertices · DWG georeference lot key/area/GPS · raw rows normalized';
  return index;
}

function installCommercialMarkers(map,statuses=new Map()){
  const lots=publicLotParts(map);
  if(!map?.THREE||!map?.sceneStage||!lots.length)return;
  clearCommercialMarkers(map);
  const THREE=map.THREE,group=new THREE.Group();
  group.name='BelavistaPublicLotMarkers';group.renderOrder=80;group.visible=true;
  const polygonIndex=buildPublicLotPolygonIndex(map);
  const featured=new Set([...statuses.keys()]);
  // Cada mesh Lote_### é uma unidade canônica da implantação. Não reduzir a
  // amostra: o visitante precisa conseguir conferir o número exatamente no
  // centro do lote correspondente, inclusive quando o lote não tem negócio
  // comercial registrado ainda.
  const markerShape=new THREE.Shape();
  markerShape.moveTo(0,-1.18);
  markerShape.bezierCurveTo(-.16,-.96,-.78,-.64,-.78,-.02);
  markerShape.bezierCurveTo(-.78,.66,-.44,1.18,0,1.18);
  markerShape.bezierCurveTo(.44,1.18,.78,.66,.78,-.02);
  markerShape.bezierCurveTo(.78,-.64,.16,-.96,0,-1.18);
  markerShape.closePath();
  const paddleGeometry=new THREE.ExtrudeGeometry(markerShape,{depth:.18,bevelEnabled:true,bevelSize:.055,bevelThickness:.04,bevelSegments:2});
  const borderGeometry=new THREE.EdgesGeometry(paddleGeometry,.02);
  const pinGeometry=new THREE.CylinderGeometry(.032,.055,.26,8);
  const paddleMaterials=new Map(),borderMaterial=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.95,depthTest:false,depthWrite:false});
  const getPaddleMaterial=status=>{
    const normalized=normalizePublicMarkerStatus(status);
    if(!paddleMaterials.has(normalized)){
      const color=PUBLIC_STATUS_COLORS[normalized];
      paddleMaterials.set(normalized,new THREE.MeshStandardMaterial({color,roughness:.34,metalness:.06,emissive:color,emissiveIntensity:.08,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
    }
    return paddleMaterials.get(normalized);
  };
  const getPinMaterial=status=>getPaddleMaterial(status);
  group.userData.sharedGeometries=[paddleGeometry,borderGeometry,pinGeometry];
  lots.forEach((lot,index)=>{
    try{
      map.sceneStage.updateMatrixWorld?.(true);
      const polygon=polygonIndex.get(String(lot.name||''));
      const local=polygon?.centroid?.clone()||(()=>{
        const bounds=new THREE.Box3().setFromObject(lot),world=bounds.getCenter(new THREE.Vector3());
        world.z=bounds.max.z;
        return map.sceneStage.worldToLocal(world.clone());
      })();
      const lotSize={x:polygon?.spanX||0,y:polygon?.spanY||0};
      const status=normalizePublicMarkerStatus(lot.userData?.publicCommercialStatus);
      const marker=new THREE.Group();
      marker.name=`Marcador_3D_${lotMarkerLabel(lot,index)}`;
      // No masterplan orientado, X/Y são o plano do lote e Z é a altura. O
      // deslocamento vertical mantém a palheta sobre o polígono sem usar o
      // centro da caixa envolvente, que deslocava lotes diagonais para a rua.
      // A origem do grupo é o centróide do polígono. O corpo e o número da
      // palheta ficam centrados nessa origem; a haste se estende abaixo sem
      // alterar a âncora do marcador em relação ao lote.
      const lift=Math.max(.45,Math.min(1.05,Math.max(lotSize.x,lotSize.y)*.035));
      marker.position.copy(local);marker.position.z+=lift;
      marker.userData={commercialStatus:status,statusColor:publicStatusColorHex(status),lotPartId:lot.userData?.partId||lot.name,lotNumber:lotMarkerLabel(lot,index),lotAreaM2:Number(polygon?.dwg?.areaM2)||null,faceCamera:true,baseZ:marker.position.z,baseLift:lift,anchor:'lot-polygon-centroid',bodyCenter:'lot-polygon-centroid',polygonPoints:polygon?.polygon||[],polygonVertexCount:polygon?.polygon?.length||0,polygonSource:polygon?.source||'GLB bounds fallback',dwgAlignmentErrorM:polygon?.dwgAlignmentErrorM||0,dwgGps:polygon?.dwgGps||null,phase:index*.67,statusLabel:PUBLIC_STATUS_LABELS[status]||PUBLIC_STATUS_LABELS.available,fixedScreenPx:featured.has(lot)?26:18};
      const visual=new THREE.Group();
      // O centro gráfico da palheta coincide com o centróide do lote. A haste
      // fica abaixo do corpo sem deslocar o número para a rua ou para o lote
      // vizinho, mesmo em quadras diagonais.
      visual.position.y=0;
      // A placa é uma pequena palheta plástica extrudada: ganha volume e
      // contorno, mas fica de frente para a câmera como no material de venda.
      const paddle=new THREE.Mesh(paddleGeometry,getPaddleMaterial(status));
      paddle.userData.publicCommercialMarkerPart='paddle';
      paddle.renderOrder=80;paddle.frustumCulled=false;paddle.raycast=()=>{};
      const border=new THREE.LineSegments(borderGeometry,borderMaterial);
      border.position.z=.14;border.renderOrder=81;border.frustumCulled=false;border.raycast=()=>{};
      const pin=new THREE.Mesh(pinGeometry,getPinMaterial(status));
      pin.userData.publicCommercialMarkerPart='pin';
      pin.position.set(0,-1.31,-.02);pin.renderOrder=80;pin.frustumCulled=false;pin.raycast=()=>{};
      const label=new THREE.Sprite(new THREE.SpriteMaterial({
        map:makeCommercialPointTexture(THREE,PUBLIC_STATUS_COLORS[status]||PUBLIC_STATUS_COLORS.available,lotMarkerLabel(lot,index)),transparent:true,depthTest:false,depthWrite:false,sizeAttenuation:true
      }));
      label.userData.publicCommercialMarkerPart='label';
      label.position.set(0,.02,.21);label.scale.set(1.72,1.72,1);label.renderOrder=82;label.frustumCulled=false;label.raycast=()=>{};
      visual.add(paddle,border,pin,label);
      marker.add(visual);
      group.add(marker);
    }catch(error){map.dataset.publicCommercialMarkerBuildErrors=String((Number(map.dataset.publicCommercialMarkerBuildErrors)||0)+1);console.warn('[Aliança Park public] marker 3D não criado.',error);}
  });
  group.userData.sharedMaterials=[...paddleMaterials.values(),borderMaterial];
  map.sceneStage.add(group);
  map.__publicCommercialMarkersV5330=group;
  // Preserve the resolved status map so a scene reset can remount the
  // markers without reloading the catalog or losing their commercial state.
  map.__publicCommercialMarkerStatusMapV5330=new Map(statuses);
  map.dataset.publicCommercialMarkers=String(group.children.length);
  map.dataset.publicCommercialMarkersVisible='true';
  map.dataset.publicCommercialMarkerStyle='plastic-teardrop-pin-3d · white edge · lot-polygon-centroid · camera billboard · floating · fixed-screen-size';
  map.dataset.publicCommercialMarkerElevation='lot polygon centroid + 0.45–1.05 world units · bob ±0.13';
  map.dataset.publicCommercialMarkerAnchor='marker body and number centered at each lot polygon centroid; DWG record keyed by glbObject';
  const markerStatusCounts={available:0,reserved:0,negotiation:0,sold:0};
  group.children.forEach(marker=>{const status=marker.userData?.commercialStatus||'available';markerStatusCounts[status]=(markerStatusCounts[status]||0)+1;});
  map.dataset.publicCommercialMarkerStatusCounts=JSON.stringify(markerStatusCounts);
  map.dataset.publicCommercialMarkerColorCode=Object.entries(PUBLIC_STATUS_COLORS).map(([status,color])=>`${status}:${publicStatusColorHex(status)}`).join('|');
  map.dataset.publicCommercialMarkerMapping=`${group.children.length} markers visíveis / ${lots.length} lotes canônicos · centro do polígono`;
  const updateMarkerStatuses=(entries=[])=>{
    const byPartId=new Map((Array.isArray(entries)?entries:[]).map(entry=>[String(entry?.partId||''),normalizePublicMarkerStatus(entry?.status)]));
    const nextCounts={available:0,reserved:0,negotiation:0,sold:0};
    group.children.forEach(marker=>{
      const nextStatus=byPartId.has(String(marker.userData?.lotPartId||''))
        ?byPartId.get(String(marker.userData?.lotPartId||''))
        :normalizePublicMarkerStatus(marker.userData?.commercialStatus);
      marker.userData.commercialStatus=nextStatus;
      marker.userData.statusLabel=PUBLIC_STATUS_LABELS[nextStatus];
      marker.userData.statusColor=publicStatusColorHex(nextStatus);
      nextCounts[nextStatus]++;
      marker.traverse?.(node=>{
        if(node.userData?.publicCommercialMarkerPart==='paddle'||node.userData?.publicCommercialMarkerPart==='pin'){
          node.material=getPaddleMaterial(nextStatus);
        }
        if(node.userData?.publicCommercialMarkerPart==='label'){
          node.material.map?.dispose?.();
          node.material.map=makeCommercialPointTexture(THREE,PUBLIC_STATUS_COLORS[nextStatus],marker.userData.lotNumber);
          node.material.needsUpdate=true;
        }
      });
      marker.visible=(map.dataset.publicMapStateFilter||'all')==='all'||map.dataset.publicMapStateFilter===nextStatus;
    });
    map.dataset.publicCommercialMarkerStatusCounts=JSON.stringify(nextCounts);
    map.dataset.publicCommercialMarkerColorCode=Object.entries(PUBLIC_STATUS_COLORS).map(([status,color])=>`${status}:${publicStatusColorHex(status)}`).join('|');
    map.updatePublicCommercialMarkers?.();
    map.renderer?.render?.(map.scene,map.camera);
  };
  map.updatePublicCommercialMarkerStatuses=updateMarkerStatuses;
  const statusListener=event=>updateMarkerStatuses(event.detail?.entries||[]);
  map.__publicCommercialMarkerStatusListenerV5330=statusListener;
  map.addEventListener('public-commercial-marker-statuses',statusListener);
  map.updatePublicCommercialMarkers=()=>{
    if(!map.camera||!group.parent)return;
    map.camera.updateMatrixWorld?.(true);
    map.sceneStage?.updateMatrixWorld?.(true);
    const viewportHeight=Math.max(1,map.clientHeight||map.querySelector?.('canvas')?.clientHeight||window.innerHeight||1);
    const projection=[];
    const projectionAll=[];
    let inside=0;
    group.children.forEach(marker=>{
      if(marker.userData?.faceCamera){
        marker.quaternion.copy(map.camera.quaternion);
        marker.rotateZ(Math.sin(performance.now()*.0012+(marker.userData.phase||0))*.035);
      }
      // O grupo está dentro do stage que acompanha o zoom. Recalcular a
      // escala pela projeção de uma altura conhecida mantém a palheta com
      // tamanho constante na tela, sem importar a distância ou o zoom.
      marker.scale.setScalar(1);
      marker.updateMatrixWorld?.(true);
      const markerCenter=marker.getWorldPosition(new THREE.Vector3());
      const markerTop=marker.localToWorld(new THREE.Vector3(0,1.25,0));
      const centerNdc=markerCenter.clone().project(map.camera);
      const topNdc=markerTop.clone().project(map.camera);
      const currentPixels=Math.abs(topNdc.y-centerNdc.y)*viewportHeight/2;
      // A palheta continua independente do zoom, mas não pode ser maior que
      // a área projetada do lote. Isso evita que o corpo de um marker cubra
      // os lotes vizinhos no enquadramento inicial.
      let lotPixels=Infinity;
      const polygonPoints=marker.userData?.polygonPoints||[];
      if(polygonPoints.length>=3&&map.sceneStage){
        const projectedLot=polygonPoints.map(point=>new THREE.Vector3(point.x,point.y,point.z||0).applyMatrix4(map.sceneStage.matrixWorld).project(map.camera));
        const xs=projectedLot.map(point=>point.x),ys=projectedLot.map(point=>point.y);
        const lotWidth=Math.abs(Math.max(...xs)-Math.min(...xs))*((map.clientWidth||window.innerWidth||1)/2);
        const lotHeight=Math.abs(Math.max(...ys)-Math.min(...ys))*viewportHeight/2;
        lotPixels=Math.min(lotWidth,lotHeight);
      }
      const requestedPixels=Math.max(14,Math.min(28,Number(marker.userData?.fixedScreenPx)||18));
      const desiredPixels=Math.max(12,Math.min(requestedPixels,Number.isFinite(lotPixels)?Math.max(12,lotPixels*.64):requestedPixels));
      if(Number.isFinite(currentPixels)&&currentPixels>.01){
        marker.scale.setScalar(Math.max(.001,Math.min(100,desiredPixels/currentPixels)));
        marker.updateMatrixWorld?.(true);
      }
      const projected=marker.getWorldPosition(new THREE.Vector3()).project(map.camera);
      if(Number.isFinite(projected.x)&&Number.isFinite(projected.y)){
        if(Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1)inside++;
        projectionAll.push(projected);
        if(projection.length<3)projection.push(`${projected.x.toFixed(2)},${projected.y.toFixed(2)},${projected.z.toFixed(2)}`);
      }
    });
    map.dataset.publicCommercialMarkerProjection=`${inside}/${group.children.length} · ${projection.join('|')}`;
    if(projectionAll.length){
      const xs=projectionAll.map(point=>point.x),ys=projectionAll.map(point=>point.y);
      map.dataset.publicCommercialMarkerSpread=`x ${Math.min(...xs).toFixed(2)}..${Math.max(...xs).toFixed(2)} · y ${Math.min(...ys).toFixed(2)}..${Math.max(...ys).toFixed(2)}`;
    }
    map.dataset.publicCommercialMarkerScale='fixed-screen-pixels · zoom-independent · lot-footprint-capped · 12–28px · all canonical lots';
  };
  map.updatePublicCommercialMarkers();
  if(map.__publicCommercialMarkerAnimationFrame)cancelAnimationFrame(map.__publicCommercialMarkerAnimationFrame);
  const animateMarkers=now=>{
    if(map.__publicCommercialMarkersV5330!==group)return;
    if(group.parent!==map.sceneStage){
      ensurePublicCommercialMarkers(map);
      if(map.__publicCommercialMarkersV5330?.parent!==map.sceneStage) scheduleCommercialMapState(map);
      return;
    }
    group.children.forEach(marker=>{marker.position.z=(marker.userData.baseZ||marker.position.z)+Math.sin(now*.0015+(marker.userData.phase||0))*.13;});
    map.updatePublicCommercialMarkers();
    map.renderer?.render?.(map.scene,map.camera);
    map.__publicCommercialMarkerAnimationFrame=requestAnimationFrame(animateMarkers);
  };
  map.__publicCommercialMarkerAnimationFrame=requestAnimationFrame(animateMarkers);
  applyCommercialMarkerFilter(map);
}

function clearCommercialMarkers(map){
  const group=map?.__publicCommercialMarkersV5330;
  if(!group)return;
  if(map.__publicCommercialMarkerAnimationFrame)cancelAnimationFrame(map.__publicCommercialMarkerAnimationFrame);
  delete map.__publicCommercialMarkerAnimationFrame;
  group.traverse?.(node=>{
    node.material?.map?.dispose?.();
  });
  for(const material of group.userData?.sharedMaterials||[])material?.dispose?.();
  for(const geometry of group.userData?.sharedGeometries||[])geometry?.dispose?.();
  group.removeFromParent?.();
  if(map.__publicCommercialMarkerStatusListenerV5330){
    map.removeEventListener('public-commercial-marker-statuses',map.__publicCommercialMarkerStatusListenerV5330);
    delete map.__publicCommercialMarkerStatusListenerV5330;
  }
  delete map.__publicCommercialMarkersV5330;
  delete map.updatePublicCommercialMarkerStatuses;
}

function ensurePublicCommercialMarkers(map){
  if(map?.dataset?.publicSatelliteImageOnly==='true'){
    clearCommercialMarkers(map);
    map.dataset.publicCommercialMarkerState='disabled-satellite-image-only';
    return false;
  }
  if(!map?.THREE||!map?.sceneStage||!map.modelReady||!map.modelParts?.lots?.length)return false;
  const expected=publicLotParts(map).length;
  const group=map.__publicCommercialMarkersV5330;
  const mounted=Boolean(group&&group.parent===map.sceneStage&&group.children?.length===expected);
  if(mounted){
    group.visible=true;
    applyCommercialMarkerFilter(map);
    map.dataset.publicCommercialMarkerState='ready';
    return true;
  }
  const cachedStatuses=map.__publicCommercialMarkerStatusMapV5330;
  if(cachedStatuses instanceof Map){
    installCommercialMarkers(map,cachedStatuses);
    map.__publicCommercialStateReadyV5330=true;
    map.dataset.publicCommercialMarkerState='recovered-after-scene-reset';
    return Boolean(map.__publicCommercialMarkersV5330?.parent);
  }
  map.__publicCommercialStateReadyV5330=false;
  return false;
}

function applyCommercialMarkerFilter(map){
  const group=map?.__publicCommercialMarkersV5330;
  if(!group)return;
  const filter=map.dataset.publicMapStateFilter||'all';
  // Os marcadores fazem parte da própria leitura aérea e permanecem visíveis
  // mesmo durante a transição do letreiro para o mapa.
  const interactive=true;
  map.dataset.publicCommercialVisiblePhase=document.body.dataset.publicStickyPhase||'';
  group.visible=interactive;
  group.children.forEach(marker=>{
    const status=marker.userData?.commercialStatus;
    marker.visible=interactive&&(filter==='all'||filter===status);
  });
  map.dataset.publicCommercialMarkersVisible=group.visible&&[...group.children].some(marker=>marker.visible)?'true':'false';
  map.updatePublicCommercialMarkers?.();
  map.renderer?.render?.(map.scene,map.camera);
}

function renderMapStateExplorer(map,counts=null){
  // The old dashboard-like explorer duplicated the public story and exposed
  // native marker controls.  Availability is now rendered by the map itself
  // and explained by the scroll legend in public-lead-form.mjs.
  document.querySelector('[data-public-map-state]')?.remove();
}

async function installCommercialMapState(map){
  if(!map?.THREE||!map?.modelReady||!map?.modelParts?.lots?.length)return false;
  if(map.__publicCommercialStateLoadingV5330)return false;
  map.__publicCommercialStateLoadingV5330=true;

  try{
    const THREE=map.THREE;
    const deals=await loadPublicCommercialDeals();
    map.dataset.publicCommercialCatalog=`api/public/catalog · ${deals.length} registros comerciais`;
    map.dataset.publicCommercialStatusSource=deals.length?'API catalog · status comercial aplicado por lote':'API catalog vazio · todos os lotes exibidos como Disponível';
    clearCommercialMarkers(map);
    const statuses=new Map();

    for(const deal of deals){
      const lot=resolveCommercialLot(map,deal.lot);
      if(!lot)continue;
      const previous=statuses.get(lot);
      const priority={negotiation:1,reserved:2,sold:3};
      if(previous&&priority[previous.status]>=priority[deal.status])continue;
      statuses.set(lot,deal);
    }

    const publicLots=publicLotParts(map);
    const total=publicLots.length;
    const counts={available:total,reserved:0,sold:0,negotiation:0,total};
    for(const [,deal] of statuses){
      if(deal.status!=='available'){
        counts[deal.status]=(counts[deal.status]||0)+1;
        counts.available=Math.max(0,counts.available-1);
      }
    }
    map.__publicCommercialCountsV5330=counts;
    map.__publicCommercialMarkerStatusMapV5330=new Map(statuses);
    map.setPublicLotStatuses?.([...statuses].map(([lot,deal])=>({partId:lot.userData?.partId||lot.name,status:deal.status,lot:deal.lot})));
    installCommercialMarkers(map,statuses);
    map.dataset.publicCommercialMarkerState='ready';
    renderMapStateExplorer(map,counts);
    return true;
  }finally{
    map.__publicCommercialStateLoadingV5330=false;
  }
}

function scheduleCommercialMapState(map,attempt=0){
  if(!map)return;
  if(map.dataset?.publicSatelliteImageOnly==='true'){
    clearCommercialMarkers(map);
    map.dataset.publicCommercialMarkerState='disabled-satellite-image-only';
    return;
  }
  const current=map.__publicCommercialMarkersV5330;
  const expected=map.modelParts?.lots?.length?publicLotParts(map).length:0;
  if(map.__publicCommercialStateReadyV5330&&current?.parent===map.sceneStage&&current.children?.length===expected)return;
  if(map.__publicCommercialStateLoadingV5330)return;
  if(map.__publicCommercialStateReadyV5330)map.__publicCommercialStateReadyV5330=false;
  const modelReady=Boolean(map.modelReady||map.dataset?.modelReady==='true');
  if(modelReady&&map.THREE&&map.modelParts?.lots?.length){
    if(ensurePublicCommercialMarkers(map))return;
    installCommercialMapState(map).then(ok=>{
      if(ok)map.__publicCommercialStateReadyV5330=true;
    });
    return;
  }
  // The GLB is intentionally staged across frames to protect integrated GPUs.
  // Keep waiting for that lifecycle instead of giving up before lots exist.
  map.dataset.publicCommercialMarkerState='waiting-for-canonical-lot-geometry';
  if(attempt<240)setTimeout(()=>scheduleCommercialMapState(map,attempt+1),420+Math.min(attempt,8)*90);
}

const LOT_AGENT_REQUESTS={
  availability:{
    label:'Disponibilidade',
    prompt:info=>`Como corretor vendedor do Aliança Park, informe ao comprador a disponibilidade atual de ${info.label}, se o lote pode ser reservado agora e qual confirmação comercial ainda é necessária.`
  },
  characteristics:{
    label:'Características',
    prompt:info=>`Apresente ${info.label} como imóvel à venda: área, quadra, orientação, posição no loteamento e os atributos relevantes para o comprador.`
  },
  conditions:{
    label:'Condições',
    prompt:info=>`Como vendedor/corretor, informe as condições de venda disponíveis para ${info.label}, incluindo valor quando disponível, entrada, negociação e o próximo passo para reserva.`
  }
};

function selectedLotAgentContext(map,source,requestKind=''){
  const info=lotDetails(source);
  return {
    kind:'lot-selection',
    requestKind,
    selectedLot:info.label,
    selectedLotId:info.partId,
    selectedLotData:{
      label:info.label,
      id:info.partId,
      block:info.values.block||'',
      area:info.values.area||'',
      status:info.values.status||'',
      orientation:info.values.orientation||'',
      partKind:info.partKind,
      sourceName:info.sourceName
    }
  };
}

function sendSelectedLotToAgent(map,source,requestKind){
  const request=LOT_AGENT_REQUESTS[requestKind];
  if(!request)return false;
  const info=lotDetails(source);
  const chat=document.querySelector('public-lead-chat .public-chatbox');
  const form=chat?.querySelector('[data-chat-form]');
  const field=form?.elements?.message||form?.querySelector('[name="message"]');
  if(!form||!field)return false;

  form.__publicAgentContextV5330=selectedLotAgentContext(map,source,requestKind);
  form.dataset.publicAgentRequest=requestKind;
  field.value=request.prompt(info);
  autoGrow(field);

  const state=chat.querySelector('[data-chat-state]');
  if(state){
    state.hidden=false;
    state.textContent=`${request.label.toLowerCase()} · lote selecionado`;
  }

  form.requestSubmit?.();
  return true;
}

function renderLotWidget(map,source){
  let host=document.querySelector('[data-public-lot-details-v5335]');
  const sticky=document.querySelector('.public-map-sticky');
  const surface=sticky||map;
  if(!host&&surface){
    host=document.createElement('aside');
    host.setAttribute('data-public-lot-details-v5335','');
    surface.append(host);
  }
  if(!host)return;
  const info=lotDetails(source);
  map.__publicSelectedLotContextV5330=selectedLotAgentContext(map,source);
  host.className='public-selected-lot public-lot-info-v5318';
  host.hidden=false;
  const facts=info.rows.slice(0,4);
  host.innerHTML=`
    <div class="lot-info-head">
      <div><small>LOTE SELECIONADO</small><strong>${esc(info.label)}</strong></div>
      <button type="button" data-public-lot-close aria-label="Fechar informações">×</button>
    </div>
    <div class="lot-info-facts">
      ${facts.map(([name,value])=>`<div class="lot-info-fact"><small>${esc(name)}</small><strong title="${esc(value)}">${esc(value)}</strong></div>`).join('')}
    </div>
    <div class="lot-agent-actions">
      <small>Perguntar à NVIDIA IA sobre esta seleção</small>
      <div class="lot-agent-actions-grid">
        <button type="button" data-public-lot-agent-action="availability">Disponibilidade</button>
        <button type="button" data-public-lot-agent-action="characteristics">Características</button>
        <button type="button" data-public-lot-agent-action="conditions">Condições</button>
      </div>
    </div>
    <p class="lot-info-note">Clique novamente no lote ou feche este card para retornar ao enquadramento anterior.</p>
  `;

  host.querySelector('[data-public-lot-close]')?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    clearPublicSelection(map,true);
  },{once:true});

  host.querySelectorAll('[data-public-lot-agent-action]').forEach(button=>{
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      const action=button.dataset.publicLotAgentAction;
      host.querySelectorAll('[data-public-lot-agent-action]').forEach(item=>item.disabled=true);
      const sent=sendSelectedLotToAgent(map,source,action);
      if(!sent){
        host.querySelectorAll('[data-public-lot-agent-action]').forEach(item=>item.disabled=false);
      }else{
        setTimeout(()=>{
          host.querySelectorAll('[data-public-lot-agent-action]').forEach(item=>item.disabled=false);
        },700);
      }
    });
  });
}

function hideLotWidget(){
  const host=document.querySelector('[data-public-lot-details-v5335]');
  if(host){
    host.hidden=true;
    host.innerHTML='';
    host.classList.remove('public-lot-info-v5318');
  }
}

function saveView(map){
  if(map.__publicSelectionViewV5318)return;
  map.__publicSelectionViewV5318={
    zoom:Number(map.sceneManualZoom||1),
    pan:{
      x:Number(map.sceneManualPan?.x||0),
      y:Number(map.sceneManualPan?.y||0)
    },
    rotation:Number(map.sceneManualRotation||0),
    tilt:Number(map.sceneTiltAdjust||0)
  };
}

function allowProgrammaticPan(map,fn){
  map.__publicAllowPanV5318=true;
  try{return fn();}finally{map.__publicAllowPanV5318=false;}
}

function restoreView(map){
  map.__publicSelectionTransitionTokenV5338=Symbol('selection-camera-cancel-v5338');
  const view=map.__publicSelectionViewV5318;
  delete map.__publicSelectionViewV5318;
  if(!view)return;
  allowProgrammaticPan(map,()=>map.setScenePan?.(view.pan.x,view.pan.y,true));
  map.setSceneZoom?.(view.zoom,true);
  map.setSceneRotation?.(view.rotation,true);
  map.setSceneTiltAdjust?.(view.tilt,true);
}

function clearPublicSelection(map,restore=true){
  if(!map)return false;
  map.__publicStaticLotMarker?.classList.remove('is-selected');
  delete map.__publicStaticLotMarker;
  delete map.dataset.publicSelectionFocus;
  const ids=map.selectedLotIds||new Set();
  for(const id of ids){
    const matches=(map.modelParts?.lots||[]).filter(item=>(item.userData?.partId||item.name)===id);
    for(const item of matches){
      delete item.userData.selectionMaterial;
      map.restorePartMaterial?.(item);
    }
  }
  ids.clear?.();
  map.selectedLotIds=ids;
  if(map.selectionHalo)map.selectionHalo.visible=false;
  map.removeMapSelectionPanel?.();
  delete map.dataset.selectedPart;
  delete map.dataset.selectedKind;
  map.dataset.selectedLotCount='0';
  map.dataset.selectedLots='';
  delete map.__publicSelectedLotContextV5330;
  const chatForm=document.querySelector('public-lead-chat [data-chat-form]');
  if(chatForm){
    delete chatForm.__publicAgentContextV5330;
    delete chatForm.dataset.publicAgentRequest;
  }
  hideLotWidget();
  if(restore)restoreView(map);
  map.sceneStage?.updateMatrixWorld?.(true);
  map.renderer?.render?.(map.scene,map.camera);
  return true;
}

function selectionWorldDeltaV5338(map,source){
  try{
    const THREE=map.THREE;
    const canvas=map.querySelector('.three-overlay');
    const rect=canvas?.getBoundingClientRect();
    if(!THREE||!rect?.width||!rect?.height||!source||!map.camera)return null;

    map.sceneStage?.updateMatrixWorld?.(true);
    source.updateWorldMatrix?.(true,false);

    const worldCenter=new THREE.Box3()
      .setFromObject(source)
      .getCenter(new THREE.Vector3());

    const projected=worldCenter.clone().project(map.camera);
    const targetScreenX=rect.width*.53;
    const targetScreenY=rect.height*.50;
    const desiredWorld=new THREE.Vector3(
      (targetScreenX/rect.width)*2-1,
      -((targetScreenY/rect.height)*2-1),
      projected.z
    ).unproject(map.camera);

    const delta=desiredWorld.sub(worldCenter);
    return Number.isFinite(delta.x)&&Number.isFinite(delta.y)?delta:null;
  }catch{
    return null;
  }
}

function applySelectionCameraFrameV5338(map,zoom,pan){
  map.sceneUserInteracted=true;
  map.sceneManualZoom=zoom;
  map.sceneManualPan={x:pan.x,y:pan.y};
  map.style.setProperty('--scene-pan-x',`${pan.x}px`);
  map.style.setProperty('--scene-pan-y',`${pan.y}px`);
  map.dataset.scenePan=`${Math.round(pan.x)},${Math.round(pan.y)}`;
  map.dataset.sceneZoom=`${Math.round(zoom*100)}%`;

  const visual=map._sceneVisual||{};
  const tilt=Number(visual.tilt ?? Number.parseFloat(map.dataset.sceneTilt) ?? 40);
  const rotation=Number(visual.rotation ?? map.sceneManualRotation ?? 0);

  map.setSceneVisual?.(tilt,rotation,zoom);
}

function focusSelectedLot(map,source){
  saveView(map);
  const original=map.__publicSelectionViewV5318;
  if(!original||!map.sceneStage||!map.camera)return;

  const token=Symbol('selection-camera-v5338');
  map.__publicSelectionTransitionTokenV5338=token;
  map._sceneTransition=token;

  const startZoom=Number(map._sceneVisual?.scale||map.sceneManualZoom||original.zoom||1);
  const targetZoom=Math.min(Math.max(Number(original.zoom||1)+1.05,2.65),3.25);
  const pan={
    x:Number(map.sceneManualPan?.x||0),
    y:Number(map.sceneManualPan?.y||0)
  };

  const duration=720;
  const started=performance.now();
  let previous=started;

  map.dataset.publicSelectionTransition='pan-zoom-smooth-v5338';
  map.dataset.publicSelectionTransitionState='running';

  const tick=now=>{
    if(map.__publicSelectionTransitionTokenV5338!==token)return;

    const dt=Math.max(1,Math.min(34,now-previous));
    previous=now;
    const t=Math.min(1,(now-started)/duration);
    const ease=1-Math.pow(1-t,3);

    const delta=selectionWorldDeltaV5338(map,source);
    if(delta){
      const gain=1-Math.exp(-dt/92);
      pan.x+=delta.x*gain;
      pan.y+=delta.y*gain;
    }

    const zoom=startZoom+(targetZoom-startZoom)*ease;
    applySelectionCameraFrameV5338(map,zoom,pan);

    if(t<1){
      requestAnimationFrame(tick);
      return;
    }

    requestAnimationFrame(()=>{
      if(map.__publicSelectionTransitionTokenV5338!==token)return;
      const finalDelta=selectionWorldDeltaV5338(map,source);
      if(finalDelta){
        pan.x+=finalDelta.x;
        pan.y+=finalDelta.y;
      }
      applySelectionCameraFrameV5338(map,targetZoom,pan);
      map.rememberMapView?.();
      map.dataset.publicSelectionTransitionState='settled';
      map.dataset.publicSelectionFocus='camera-follow-pan-zoom-v5338';
      map.dataset.publicSelectionFocusHeading=
        `${Number(map.sceneManualRotation||0).toFixed(1)}deg`;
      map.dataset.publicSelectionFocusTilt=
        `${Number(map._sceneVisual?.tilt||0).toFixed(1)}deg`;
    });
  };

  requestAnimationFrame(tick);
}

function installPrototypeGuards(){
  const Ctor=customElements.get('map-scene');
  const proto=Ctor?.prototype;
  if(!proto||proto.__belavistaPublicV5318)return false;
  proto.__belavistaPublicV5318=true;

  const originalSetMapContext=proto.setMapContext;
  if(typeof originalSetMapContext==='function'){
    proto.setMapContext=function(view){
      const result=originalSetMapContext.call(this,view);
      if(isPublicMap(this)){
        queueMicrotask(()=>syncPublicMapControls(
          this,
          document.body.dataset.publicScrollSection==='map'
        ));
      }
      return result;
    };
  }

  const originalSetScenePan=proto.setScenePan;
  if(typeof originalSetScenePan==='function'){
    proto.setScenePan=function(x,y,animate=false){
      if(!isPublicMap(this))return originalSetScenePan.call(this,x,y,animate);
      const canvas=this.querySelector('.three-overlay');
      const width=Math.max(1,canvas?.clientWidth||this.clientWidth||window.innerWidth);
      const height=Math.max(1,canvas?.clientHeight||this.clientHeight||window.innerHeight);
      // O pan vive no espaço local do stage. O limite precisa acompanhar a
      // área coberta depois do zoom; usar metade fixa do viewport fazia o
      // arrasto parar cedo e dava a impressão de que o zoom era ignorado.
      const sceneBounds=typeof this.getScenePanBounds==='function'
        ? this.getScenePanBounds()
        : {x:width/2,y:height/2};
      const maxX=Math.max(0,Number(sceneBounds?.x)||width/2);
      const maxY=Math.max(0,Number(sceneBounds?.y)||height/2);
      const boundedX=Math.max(-maxX,Math.min(maxX,Number(x)||0));
      const boundedY=Math.max(-maxY,Math.min(maxY,Number(y)||0));
      this.dataset.publicPanLimit=`±${Math.round(maxX)}px × ±${Math.round(maxY)}px · zoom ${Number(this._sceneVisual?.scale||this.sceneManualZoom||1).toFixed(2)}x`;
      this.dataset.mapPanBehavior='bounded-world-translation-zoom-aware-v5332';
      return originalSetScenePan.call(this,boundedX,boundedY,animate);
    };
  }

  const originalPickModelAt=proto.pickModelAt;
  if(typeof originalPickModelAt==='function'){
    proto.pickModelAt=function(point){
      if(!isPublicMap(this))return originalPickModelAt.call(this,point);
      if(this.dataset.publicSelectionEnabled!=='true')return false;
      if(!this.modelReady||!this.raycaster||!this.camera||!this.modelGroup)return false;
      const canvas=this.querySelector('.three-overlay');
      const w=canvas?.clientWidth||0,h=canvas?.clientHeight||0;
      if(!w||!h||!point)return false;

      this.pointer.x=(point.x/w)*2-1;
      this.pointer.y=-(point.y/h)*2+1;
      this.camera.updateMatrixWorld(true);
      this.modelGroup.updateMatrixWorld(true);
      this.raycaster.setFromCamera(this.pointer,this.camera);

      for(const hit of this.raycaster.intersectObject(this.modelGroup,true)){
        const source=this.modelPartSource?.(hit.object)||hit.object;
        if(source?.userData?.partKind==='lots')return this.toggleLotSelection(source);
      }

      let nearest=null,best=Infinity;
      for(const lot of this.modelParts?.lots||[]){
        const box=new this.THREE.Box3().setFromObject(lot);
        const center=box.getCenter(new this.THREE.Vector3()).project(this.camera);
        const sx=(center.x+1)*w/2,sy=(-center.y+1)*h/2;
        const size=box.getSize(new this.THREE.Vector3());
        const radius=Math.max(18,Math.min(58,Math.max(size.x,size.y)/2));
        const distance=Math.hypot(point.x-sx,point.y-sy);
        if(distance<=radius&&distance<best){best=distance;nearest=lot;}
      }
      if(nearest)return this.toggleLotSelection(nearest);
      if((this.selectedLotIds?.size||0)>0)clearPublicSelection(this,true);
      return false;
    };
  }

  const originalToggleLotSelection=proto.toggleLotSelection;
  if(typeof originalToggleLotSelection==='function'){
    proto.toggleLotSelection=function(node){
      if(!isPublicMap(this))return originalToggleLotSelection.call(this,node);
      if(this.dataset.publicSelectionEnabled!=='true')return false;

      const source=this.modelPartSource?.(node)||node;
      if(!source||source.userData?.partKind!=='lots')return false;

      const partId=source.userData.partId||source.name;
      const current=this.selectedLotIds||new Set();
      const wasSelected=current.has(partId);

      // Public UX is single-selection.
      clearPublicSelection(this,false);
      if(wasSelected){
        restoreView(this);
        return true;
      }

      this.selectedLotIds=new Set([partId]);
      const matches=(this.modelParts?.lots||[]).filter(
        item=>(item.userData.partId||item.name)===partId
      );
      for(const item of matches){
        item.userData.selectionMaterial=this.materialForColor?.(
          item.userData.defaultMaterial,
          0x2fe6ae,
          .92
        );
        if(item.userData.selectionMaterial)item.material=item.userData.selectionMaterial;
      }

      const label=source.userData.partLabel||source.name||'Lote';
      this.dataset.selectedPart=label;
      this.dataset.selectedKind='lots';
      this.dataset.selectedLotCount='1';
      this.dataset.selectedLots=partId;

      try{
        const bounds=new this.THREE.Box3().setFromObject(source);
        const center=bounds.getCenter(new this.THREE.Vector3());
        const size=bounds.getSize(new this.THREE.Vector3());
        if(this.selectionHalo){
          this.selectionHalo.position.set(
            center.x-(this.sceneStage?.position.x||0),
            center.y-(this.sceneStage?.position.y||0),
            2
          );
          this.selectionHalo.scale.setScalar(
            Math.max(.7,Math.min(4.5,Math.max(size.x,size.y)/24))
          );
          this.selectionHalo.material.color.setHex(0x2fe6ae);
          this.selectionHalo.visible=true;
        }
      }catch{}

      // Remove the generic reservation panel and present the public information widget.
      const selectedFromTitle=this.dataset.publicTitleSelectionEnabled==='true';
      this.removeMapSelectionPanel?.();
      renderLotWidget(this,source);
      focusSelectedLot(this,source);

      if(selectedFromTitle){
        this.dataset.publicSelectionFromTitle='true';
        const scrollTarget=
          elasticBreakpoints.threshold+
          Math.max(8,Math.min(22,window.innerHeight*.018));

        document.body.dataset.publicWidgetsVisible='true';
        document.body.dataset.publicControlsVisible='true';
        setScrollSection('map');
        window.scrollTo({
          top:scrollTarget,
          left:0,
          behavior:'smooth'
        });
      }else{
        delete this.dataset.publicSelectionFromTitle;
      }
      this.sceneStage?.updateMatrixWorld?.(true);
      this.renderer?.render?.(this.scene,this.camera);
      return true;
    };
  }

  return true;
}

let gateFrame=0;
function updateSelectionGate(){
  gateFrame=0;
  const map=document.querySelector(PUBLIC_MAP_SELECTOR);
  if(!map)return;

  const y=window.scrollY;
  const sceneSelectable=
    y>=elasticBreakpoints.top-4&&
    y<elasticBreakpoints.end+window.innerHeight;
  const controlsEnabled=
    document.body.dataset.publicControlsVisible==='true'||
    document.body.dataset.publicScrollSection==='map';

  map.dataset.publicSelectionEnabled=sceneSelectable?'true':'false';
  map.dataset.publicTitleSelectionEnabled=
    sceneSelectable&&!controlsEnabled?'true':'false';
  document.body.dataset.publicLotSelectionReady=sceneSelectable?'true':'false';
  syncPublicMapControls(map,controlsEnabled);

  map.dataset.publicSelectionPersistence='explicit-user-dismiss-v5338';
}

function scheduleSelectionGate(){
  if(gateFrame)return;
  gateFrame=requestAnimationFrame(updateSelectionGate);
}



let publicPinFrame=0;
let publicPinBounds={top:0,release:0,left:0,width:0};

let elasticInstalled=false;
let elasticTouchStart=null;
let elasticResizeFrame=0;
let nativeSmoothTarget=null; // legacy compatibility; snap disabled v5.3.36
let nativeSmoothIssued=false;
let elasticLastY=0;
let elasticBreakpoints={top:0,threshold:0,second:0,end:0};

function ensureCaptionStack(){
  const sticky=document.querySelector('.public-map-sticky');
  if(!sticky)return null;
  let stack=sticky.querySelector('[data-public-scroll-captions]');
  if(stack)return stack;
  const legacy=sticky.querySelector('[data-scroll-legend]');
  const legacyTitle=legacy?.querySelector('[data-legend-title]')?.textContent?.trim()||'Implantação';
  const legacyText=legacy?.querySelector('[data-legend-text]')?.textContent?.trim()||'Leia o loteamento inteiro na mesma cena do modelo 3D.';
  stack=document.createElement('div');
  stack.className='public-scroll-caption-stack-v5319';
  stack.dataset.publicScrollCaptions='true';
  stack.setAttribute('aria-live','polite');
  stack.innerHTML=`
    <article><small>01 · LEITURA DO MAPA</small><b>${esc(legacyTitle)}</b><span>${esc(legacyText)}</span></article>
    <article><small>02 · INTERAÇÃO</small><b>Escolha um lote</b><span>Rotacione, incline ou aproxime. Clique em um lote para abrir suas informações.</span></article>
  `;
  sticky.append(stack);
  return stack;
}

function syncPublicMapControls(map,enabled){
  const controls=map?.querySelector('.map-rotation-controls');
  if(controls){
    controls.hidden=!enabled;
    controls.dataset.publicScrollControls=enabled?'visible':'hidden';
  }
  map?.querySelectorAll('.map-pan-pad,[data-scene-pan]').forEach(node=>{
    node.hidden=true;
    node.setAttribute('aria-hidden','true');
    node.tabIndex=-1;
  });
}



function measurePublicPinnedScene(){
  const story=document.querySelector('[data-map-story],.public-map-story');
  const sticky=story?.querySelector('.public-map-sticky');
  if(!story||!sticky)return null;
  const rect=story.getBoundingClientRect();
  const top=rect.top+window.scrollY;
  const width=rect.width;
  const left=rect.left;
  publicPinBounds={
    top,
    release:top+window.innerHeight*2,
    left,
    width
  };
  sticky.style.setProperty('--v5324-pin-left',`${left}px`);
  sticky.style.setProperty('--v5324-pin-width',`${width}px`);
  return {story,sticky};
}

function syncPublicPinnedScene(){
  publicPinFrame=0;
  const story=document.querySelector('[data-map-story],.public-map-story');
  const sticky=story?.querySelector('.public-map-sticky');
  if(!story||!sticky)return;
  if(!publicPinBounds.width)measurePublicPinnedScene();
  const y=window.scrollY;
  const {top,release,left,width}=publicPinBounds;

  if(y<top){
    sticky.dataset.publicPinState='before';
    sticky.style.position='absolute';
    sticky.style.top='0px';
    sticky.style.left='0px';
    sticky.style.width='100%';
    return;
  }

  if(y<release){
    sticky.dataset.publicPinState='fixed';
    sticky.style.position='fixed';
    sticky.style.top='0px';
    sticky.style.left=`${left}px`;
    sticky.style.width=`${width}px`;
    return;
  }

  // Release at the exact end of the second 100vh. At y===release this
  // document-space top maps to viewport top 0, so there is no visual jump.
  sticky.dataset.publicPinState='released';
  sticky.style.position='absolute';
  sticky.style.top=`${release-top}px`;
  sticky.style.left='0px';
  sticky.style.width='100%';
}

function schedulePublicPinnedScene(){
  if(publicPinFrame)return;
  publicPinFrame=requestAnimationFrame(syncPublicPinnedScene);
}

function refreshElasticBreakpoints(){
  elasticResizeFrame=0;
  const story=document.querySelector('[data-map-story],.public-map-story');
  if(!story)return;
  const top=story.getBoundingClientRect().top+window.scrollY;
  const vh=Math.max(480,window.innerHeight);
  elasticBreakpoints={
    top,
    threshold:top+vh*.30,
    second:top+vh,
    end:top+vh*2
  };
  publicPinBounds={
    top,
    release:elasticBreakpoints.end,
    left:story.getBoundingClientRect().left,
    width:story.getBoundingClientRect().width
  };
}

function setScrollSection(section){
  const normalized=section==='map'?'map':'title';
  document.body.dataset.publicScrollSection=normalized;
  const surface=document.querySelector('public-leads-surface');
  if(surface)surface.dataset.publicElasticSection=normalized;
  const map=document.querySelector(PUBLIC_MAP_SELECTOR);
  ensureCaptionStack();
  if(map){
    syncPublicMapControls(map,normalized==='map');
    map.fitPublicGapView?.();
    if(map.dataset.publicSatelliteImageOnly!=='true'&&!ensurePublicCommercialMarkers(map))scheduleCommercialMapState(map);
  }
  scheduleSelectionGate();
}

function titleFadeForY(y=window.scrollY){
  const {top,threshold}=elasticBreakpoints;
  const span=Math.max(1,threshold-top);
  return Math.max(0,Math.min(1,(y-top)/span));
}

function applyScrollVisuals(){
  const progress=titleFadeForY();
  const style=document.body.style;

  for(const name of [
    '--v5330-title-opacity','--v5331-title-opacity','--v5332-title-opacity',
    '--v5333-title-opacity','--v5334-title-opacity','--v5335-title-opacity',
    '--v5336-title-opacity'
  ])style.setProperty(name,String(1-progress));
  for(const name of [
    '--v5330-title-blur','--v5331-title-blur','--v5332-title-blur',
    '--v5333-title-blur','--v5334-title-blur','--v5335-title-blur',
    '--v5336-title-blur'
  ])style.setProperty(name,`${(progress*7).toFixed(2)}px`);
  for(const name of [
    '--v5330-title-lift','--v5331-title-lift','--v5332-title-lift',
    '--v5333-title-lift','--v5334-title-lift','--v5335-title-lift',
    '--v5336-title-lift'
  ])style.setProperty(name,`${(-progress*64).toFixed(1)}px`);
  for(const name of [
    '--v5330-title-events','--v5331-title-events','--v5332-title-events',
    '--v5333-title-events','--v5334-title-events','--v5335-title-events',
    '--v5336-title-events'
  ])style.setProperty(name,progress>.88?'none':'auto');

  document.body.dataset.publicScrollProgress=progress.toFixed(4);
  const surface=document.querySelector('public-leads-surface');
  if(surface)surface.dataset.scrollProgress=progress.toFixed(4);

  const y=window.scrollY;
  const afterFade=y>=elasticBreakpoints.threshold;
  const sceneStillVisible=y<elasticBreakpoints.end+window.innerHeight;
  const interactive=afterFade&&sceneStillVisible;

  document.body.dataset.publicWidgetsVisible=interactive?'true':'false';
  document.body.dataset.publicControlsVisible=interactive?'true':'false';
  setScrollSection(interactive?'map':'title');

  document.body.dataset.publicStickyPhase=
    !afterFade?'title-fade':(
      y>=elasticBreakpoints.end?'release-visible':'interactive-after-fade'
    );

  const sticky=document.querySelector('.public-map-sticky');
  if(sticky){
    sticky.dataset.publicStickyPhase=document.body.dataset.publicStickyPhase;
    sticky.dataset.publicControlsThreshold='30vh';
  }
}

function commandNativeSmoothScroll(){
  return false;
}

function maybeElasticSnap(){
  return false;
}

function syncElasticSection(){
  syncPublicPinnedScene();
  applyScrollVisuals();
}

function onElasticWheel(){
  // v5.3.36: natural wheel scrolling only.
}

function installElasticTouch(){
  // v5.3.36: no scroll snapping on touch.
}

function installElasticScroll(){
  if(elasticInstalled)return;
  elasticInstalled=true;
  refreshElasticBreakpoints();
  syncPublicPinnedScene();
  ensureCaptionStack();
  elasticLastY=window.scrollY;

  window.addEventListener('scroll',syncElasticSection,{passive:true,capture:true});
  window.addEventListener('resize',()=>{
    if(elasticResizeFrame)return;
    elasticResizeFrame=requestAnimationFrame(()=>{
      refreshElasticBreakpoints();
      syncPublicPinnedScene();
      applyScrollVisuals();
    });
  },{passive:true});

  applyScrollVisuals();
}

const PUBLIC_CHAT_MEMORY_KEY_V5340='belavista.public.chat.memory.v5340';
const PUBLIC_CHAT_MEMORY_TTL_V5340=12*60*60*1000;
const PUBLIC_CHAT_MAX_TURNS_V5340=16;
const PUBLIC_CHAT_MAX_CONTEXT_CHARS_V5340=5600;

function newPublicChatMemoryV5340(){
  return {
    version:'v5.3.40',
    id:globalThis.crypto?.randomUUID?.()||`chat-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    createdAt:Date.now(),
    updatedAt:Date.now(),
    turns:[]
  };
}

function loadPublicChatMemoryV5340(){
  try{
    const parsed=JSON.parse(localStorage.getItem(PUBLIC_CHAT_MEMORY_KEY_V5340)||'null');
    if(
      !parsed||
      parsed.version!=='v5.3.40'||
      !Array.isArray(parsed.turns)||
      Date.now()-Number(parsed.updatedAt||0)>PUBLIC_CHAT_MEMORY_TTL_V5340
    )return newPublicChatMemoryV5340();

    parsed.turns=parsed.turns
      .filter(turn=>turn&&['user','assistant'].includes(turn.role)&&String(turn.content||'').trim())
      .slice(-PUBLIC_CHAT_MAX_TURNS_V5340);
    return parsed;
  }catch{
    return newPublicChatMemoryV5340();
  }
}

function savePublicChatMemoryV5340(memory){
  memory.updatedAt=Date.now();
  memory.turns=(memory.turns||[]).slice(-PUBLIC_CHAT_MAX_TURNS_V5340);
  try{
    localStorage.setItem(PUBLIC_CHAT_MEMORY_KEY_V5340,JSON.stringify(memory));
  }catch{}
}

function publicChatSelectionV5340(form){
  const map=document.querySelector(PUBLIC_MAP_SELECTOR);
  const transient=form.__publicAgentContextV5330||{};
  const persistent=map?.__publicSelectedLotContextV5330||{};
  const merged={...persistent,...transient};

  return {
    selectedLot:String(merged.selectedLot||map?.dataset.selectedPart||'').trim(),
    selectedLotId:String(merged.selectedLotId||map?.dataset.selectedPart||'').trim(),
    requestKind:String(merged.requestKind||'').trim(),
    selectedLotData:merged.selectedLotData||null
  };
}

function compactPublicChatTurnsV5340(turns=[]){
  const selected=turns.slice(-10);
  const compact=[];
  let chars=0;

  for(let index=selected.length-1;index>=0;index--){
    const turn=selected[index];
    const content=String(turn.content||'').trim().slice(0,1200);
    if(!content)continue;
    const lot=String(turn.selectedLot||'').trim();
    const cost=content.length+lot.length+32;
    if(chars+cost>PUBLIC_CHAT_MAX_CONTEXT_CHARS_V5340)break;
    chars+=cost;
    compact.unshift({
      role:turn.role,
      content,
      selectedLot:lot,
      selectedLotId:String(turn.selectedLotId||'').trim()
    });
  }

  return compact;
}

function contextualPublicChatMessageV5340(userMessage,history,selection){
  const lines=[
    '[CONTEXTO DE CONTINUIDADE — não reproduzir estes rótulos na resposta]',
    `Lote atualmente selecionado: ${selection.selectedLot||'nenhum'}${selection.selectedLotId&&selection.selectedLotId!==selection.selectedLot?` (${selection.selectedLotId})`:''}.`,
    'Regra: a seleção estruturada atual é autoritativa. Se ela divergir de lotes citados em respostas anteriores, responda sobre a seleção atual, salvo se o usuário nomear explicitamente outro lote.',
    'Regra: respostas anteriores do assistente servem como contexto conversacional, não como fonte autoritativa para atributos do imóvel.'
  ];

  if(history.length){
    lines.push('Histórico recente:');
    for(const turn of history){
      const who=turn.role==='user'?'Cliente':'Corretor';
      const lot=turn.selectedLot?` [contexto: ${turn.selectedLot}]`:'';
      lines.push(`${who}${lot}: ${turn.content}`);
    }
  }

  lines.push('Pergunta atual do cliente:');
  lines.push(userMessage);
  return lines.join('\n');
}

function exposePublicChatMemoryV5340(){
  globalThis.belavistaPublicChatContext={
    get(){
      return loadPublicChatMemoryV5340();
    },
    clear(){
      const memory=newPublicChatMemoryV5340();
      savePublicChatMemoryV5340(memory);
      return memory;
    }
  };
}

function installStableChatTransport(){
  const box=document.querySelector('public-lead-chat .public-chatbox');
  const form=box?.querySelector('[data-chat-form]');
  if(!form||form.dataset.workerTransportV5340==='true')return Boolean(form);

  form.dataset.workerTransportV5340='true';
  form.dataset.chatContextV5340='persistent-thread';
  exposePublicChatMemoryV5340();

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();

    const field=form.elements?.message||form.querySelector('[name="message"]');
    const userMessage=String(field?.value||'').trim();
    if(!userMessage)return;

    const output=box.querySelector('[data-chat-message]');
    const state=box.querySelector('[data-chat-state]');
    const memory=loadPublicChatMemoryV5340();
    const selection=publicChatSelectionV5340(form);
    const history=compactPublicChatTurnsV5340(memory.turns);
    const contextualMessage=contextualPublicChatMessageV5340(
      userMessage,
      history,
      selection
    );

    form.dataset.publicConversationId=memory.id;
    form.dataset.publicConversationTurn=String(memory.turns.length+1);

    if(output)output.textContent='Consultando disponibilidade e contexto do Aliança Park…';
    if(state){state.hidden=false;state.textContent='consultando';}
    if(field)field.disabled=true;

    try{
      const configured=
        document.querySelector('meta[name="belavista-api-base"]')?.content?.trim()||
        document.querySelector('meta[name="belavista-ai-base"]')?.content?.trim()||
        '';
      const endpoint=configured
        ? new URL('/api/public/lead-chat',configured).href
        : new URL(runtimeUrlV1('/api/public/lead-chat'),location.origin).href;

      const response=await fetch(endpoint,{
        method:'POST',
        mode:'cors',
        headers:{
          'Content-Type':'application/json',
          'Accept':'application/json'
        },
        body:JSON.stringify({
          message:contextualMessage,
          context:{
            source:'public-map',
            scenario:'real-estate-brokerage-sale',
            perspective:'seller-broker',
            project:'Aliança Park',
            conversationId:memory.id,
            conversationTurn:memory.turns.length+1,
            conversationHistory:history,
            currentSelection:selection,
            rawUserMessage:userMessage,
            continuityPolicy:[
              'Preserve semantic continuity across turns.',
              'Resolve pronouns and short follow-ups from recent conversation.',
              'Current structured lot selection overrides stale lot references from earlier assistant turns.',
              'Do not invent property facts from prior assistant prose when structured lot data differs.'
            ],
            responsePolicy:'Responda como corretor vendedor do loteamento. Continue naturalmente a conversa anterior. Para perguntas curtas, use o histórico recente. A seleção estruturada atual do mapa é a referência principal para o lote; se houve mudança de seleção, não continue falando do lote anterior salvo menção explícita do cliente.',
            selectedLot:selection.selectedLot,
            selectedLotId:selection.selectedLotId,
            selectedLotData:selection.selectedLotData,
            requestKind:selection.requestKind
          },
          requireNvidia:true
        })
      });

      const raw=await response.text();
      let payload=null;
      try{
        payload=raw?JSON.parse(raw):{};
      }catch{
        throw new Error(`Worker respondeu ${response.status} sem JSON válido.`);
      }

      if(!response.ok){
        throw new Error(payload?.error||`Worker respondeu HTTP ${response.status}.`);
      }

      const reply=String(payload?.reply||payload?.message||'').trim();
      if(!reply){
        throw new Error('Worker respondeu sem conteúdo de orientação.');
      }

      if(output){
        const animate=globalThis.belavistaTypeAssistantMessage;
        if(typeof animate==='function')await animate(output,reply);
        else output.textContent=reply;
      }
      if(state){state.hidden=true;state.textContent='';}
      if(field){field.value='';autoGrow(field);}

      memory.turns.push({
        role:'user',
        content:userMessage,
        selectedLot:selection.selectedLot,
        selectedLotId:selection.selectedLotId,
        at:Date.now()
      });
      memory.turns.push({
        role:'assistant',
        content:reply,
        selectedLot:selection.selectedLot,
        selectedLotId:selection.selectedLotId,
        at:Date.now()
      });
      savePublicChatMemoryV5340(memory);

      form.dataset.publicConversationTurn=String(memory.turns.length);
      form.dataset.publicConversationTurnsStored=String(memory.turns.length);
    }catch(error){
      if(output){
        const failure='Não foi possível consultar a IA agora. O mapa continua disponível para exploração.';
        const animate=globalThis.belavistaTypeAssistantMessage;
        if(typeof animate==='function')await animate(output,failure);
        else output.textContent=failure;
      }
      if(state){state.hidden=true;state.textContent='';}
      console.warn('[Belavista public v5.3.40] lead-chat Worker falhou.',error);
    }finally{
      delete form.__publicAgentContextV5330;
      delete form.dataset.publicAgentRequest;
      if(field){
        field.disabled=false;
        field.focus();
      }
    }
  },{capture:true});

  return true;
}

function installMap(){
  const found=ensureStaticFallback();
  if(!found)return false;
  const {map,bg}=found;

  map.dataset.publicPanLocked='false';
  map.dataset.publicPanBounds='half-viewport-x-y';
  map.dataset.publicSelectionVersion=VERSION;
  if(!map.dataset.publicSelectionEnabled)map.dataset.publicSelectionEnabled='false';

  installPrototypeGuards();
  if(map.hasAttribute('data-public-static-only')){
    if(!document.getElementById('belavista-static-only-final-v1')){
      const style=document.createElement('style');
      style.id='belavista-static-only-final-v1';
      style.textContent=`
        body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-rotation-controls,
        body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-gesture-legend,
        body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-category-switcher{
          display:none!important;
          visibility:hidden!important;
          pointer-events:none!important;
        }
      `;
      document.head.append(style);
    }
    map.dataset.renderMode='static-satellite-markers';
    map.dataset.publicThree='disabled-static-only';
    applyDwgSatelliteFrame(map);
    updateSelectionGate();
    return true;
  }
  // O mapa é uma única cena: imagem aérea real no plano inferior e o modelo
  // vivo por cima, sem a antiga malha verde sintética.
  applyDwgSatelliteFrame(map);
  applySunnyPublicScene(map);
  scheduleCommercialMapState(map);
  installConstructionRecordState(map);
  reinforcePublicVisualComposition(map);
  updateSelectionGate();
  return true;
}

function reinforcePublicVisualComposition(map,attempt=0){
  if(!map)return;
  applySunnyPublicScene(map);
  if(map.modelReady&&(
    map.dataset.publicRoadTexture==='ready'||
    map.dataset.publicRoadPolicy==='satellite-only'
  )){
    map.reassertPublicPresentationStyle?.();
    return;
  }
  if(attempt<80)setTimeout(()=>reinforcePublicVisualComposition(map,attempt+1),400);
}

function installOnce(){
  installStyles();
  installChat();
  installStableChatTransport();
  installMap();
  installElasticScroll();
  schedulePublicPinnedScene();
}

// No MutationObserver, no recursive frame installer.
// Initialization is driven by component definitions + a small fixed set of lifecycle events.

// The public page must not expose administration data.  The catalog endpoint
// contains only lot code, availability and public pricing metadata.
import {apiFetch} from './api-client.mjs';

  const stableSelectionStyle=document.createElement('style');
  stableSelectionStyle.id='belavista-selection-stable-v5335';
  stableSelectionStyle.textContent=`
    body.public-leads-page .public-map-sticky > [data-selected-lot]{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    body.public-leads-page [data-public-lot-details-v5335]{
      display:block;
      visibility:visible;
      z-index:58!important;
    }
    body.public-leads-page [data-public-lot-details-v5335][hidden]{
      display:none!important;
    }
    map-scene[data-public-map] .three-overlay,
    map-scene[data-public-presentation] .three-overlay{
      touch-action:none!important;
      overscroll-behavior:contain!important;
      user-select:none!important;
      -webkit-user-select:none!important;
    }
  `;
  document.head.append(stableSelectionStyle);


  const lotVisualStyle=document.createElement('style');
  lotVisualStyle.id='belavista-lot-left-v5337';
  lotVisualStyle.textContent=`
    body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-rotation-controls,
    body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-gesture-legend,
    body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-category-switcher{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    body.public-leads-page [data-public-lot-details-v5335].public-lot-info-v5318,
    body.public-leads-page [data-public-lot-details-v5335],
    body.public-leads-page [data-selected-lot].public-lot-info-v5318{
      position:absolute!important;
      left:clamp(22px,3vw,52px)!important;
      right:auto!important;
      top:50%!important;
      bottom:auto!important;
      width:min(390px,calc(42vw - 32px))!important;
      max-height:min(68vh,680px)!important;
      overflow:auto!important;
      transform:translateY(-46%)!important;
      z-index:58!important;
    }
    @media(max-width:980px){
      body.public-leads-page [data-public-lot-details-v5335].public-lot-info-v5318,
      body.public-leads-page [data-public-lot-details-v5335],
      body.public-leads-page [data-selected-lot].public-lot-info-v5318{
        left:18px!important;
        width:min(340px,calc(100vw - 36px))!important;
        top:auto!important;
        bottom:104px!important;
        transform:none!important;
      }
    }
  `;
  document.head.append(lotVisualStyle);


  const titlePickStyle=document.createElement('style');
  titlePickStyle.id='belavista-title-pick-v5338';
  titlePickStyle.textContent=`
    body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-rotation-controls,
    body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-gesture-legend,
    body[data-public-scroll-section="map"] map-scene[data-public-static-only] .map-category-switcher{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }
    body.public-leads-page .public-hero-letter{
      pointer-events:none!important;
    }
    body.public-leads-page map-scene[data-public-map] .three-overlay,
    body.public-leads-page map-scene[data-public-presentation] .three-overlay{
      cursor:grab;
    }
    body.public-leads-page[data-public-scroll-section="title"]
      map-scene[data-public-map] .three-overlay,
    body.public-leads-page[data-public-scroll-section="title"]
      map-scene[data-public-presentation] .three-overlay{
      cursor:pointer;
    }
  `;
  document.head.append(titlePickStyle);

function boot(){
  installStyles();

  installElasticScroll();

  const promises=[];
  if(globalThis.customElements){
    promises.push(customElements.whenDefined('map-scene').catch(()=>{}));
    promises.push(customElements.whenDefined('public-lead-chat').catch(()=>{}));
  }

  Promise.allSettled(promises).then(()=>{
    requestAnimationFrame(installOnce);
    setTimeout(installOnce,350);
  });

  installOnce();
  window.addEventListener('load',installOnce,{once:true});
  setTimeout(installOnce,1200);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}
