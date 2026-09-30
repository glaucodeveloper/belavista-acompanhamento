// BELAVISTA_PUBLIC_PDF_BRAND_CUTOUT_V1
// A variante transparente representa o resultado visual do PDF após remover
// a textura verde: somente a marca (símbolo + nome) permanece sobre a cena.
const PDF_SOURCE='./assets/public/alianca-park-masterplan-static-v535-no-photo.webp';
const BRAND_SOURCE='./assets/public/alianca-park-logo-full-transparent-v552.png';
const VERSION='pdf-logo-cutout-v1';

function mountPdfBrand(){
  const sticky=document.querySelector('.public-map-sticky');
  if(!sticky||sticky.querySelector('[data-public-pdf-brand]'))return Boolean(sticky);
  const layer=document.createElement('div');
  layer.className='public-pdf-brand-layer';
  layer.dataset.publicPdfBrand=VERSION;
  layer.dataset.pdfBackgroundSource=PDF_SOURCE;
  layer.dataset.pdfBackgroundTreatment='textura verde removida · logo + nome preservados';
  layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<img src="${BRAND_SOURCE}" alt="" decoding="async">`;
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
