// BELAVISTA_PUBLIC_PDF_BRAND_CUTOUT_V1
// Marca horizontal permanente durante a leitura do mapa.
const PDF_SOURCE='./assets/public/alianca-park-masterplan-static-v535-no-photo.webp';
const BRAND_SOURCE='./assets/public/alianca-park-logo-mark-transparent-v552.png';
const VERSION='map-brand-horizontal-v2';

function mountPdfBrand(){
  const sticky=document.querySelector('.public-map-sticky');
  if(!sticky||sticky.querySelector('[data-public-pdf-brand]'))return Boolean(sticky);
  const layer=document.createElement('div');
  layer.className='public-pdf-brand-layer';
  layer.dataset.publicPdfBrand=VERSION;
  layer.dataset.pdfBackgroundSource=PDF_SOURCE;
  layer.dataset.pdfBackgroundTreatment='marca horizontal sobre o mapa';
  layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<span class="public-pdf-brand-name">Aliança Park<small>LOTEAMENTO</small></span><img src="${BRAND_SOURCE}" alt="" decoding="async">`;
  sticky.append(layer);
  return true;
}

function boot(){
  if(mountPdfBrand())return;
  const observer=new MutationObserver(()=>{
    if(mountPdfBrand())observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
