const VERSION='5.3.2.1';
const FLAG=Symbol.for('belavista.public.fast.runtime.v5321');
const SELECTOR='map-scene[data-public-presentation],map-scene[data-public-map]';

function patchPrototype(){
  const Ctor=customElements.get('map-scene');
  if(!Ctor||Ctor.prototype[FLAG])return false;
  const proto=Ctor.prototype;Object.defineProperty(proto,FLAG,{value:true});
  if(typeof proto.scheduleThree==='function'){
    const original=proto.scheduleThree;
    proto.scheduleThree=function(...args){
      if(!this.hasAttribute('data-public-static-base'))return original.apply(this,args);
      if(this._threeScheduled||this.renderer)return;
      this._threeScheduled=true;this.dataset.publicThree='scheduled';
      queueMicrotask(()=>{try{this.initThree?.();}catch(error){this.dataset.modelError='three-init-failed';console.warn('[Belavista fast runtime] initThree falhou',error);}});
    };
  }
  if(typeof proto.refreshMapSurface==='function'){
    const original=proto.refreshMapSurface;
    proto.refreshMapSurface=function(...args){
      if(this.hasAttribute('data-public-static-base')){
        this.dataset.mapRasterMode='static-css-background';this.dataset.mapTexture='static-css';this.dataset.mapTextureTiles='0/0';this.dataset.mapSurfaceVisible='false';
        if(this.mapSurface)this.mapSurface.visible=false;
        return;
      }
      return original.apply(this,args);
    };
  }
  console.info('[Belavista fast runtime]',VERSION,'prototype instalado');
  return true;
}

function prepare(map){
  if(!map)return;map.setAttribute('data-public-static-base','true');map.dataset.publicFastRuntime=VERSION;
  const host=map.querySelector?.('.map-host');if(host){host.style.opacity='0';host.style.pointerEvents='none';}
  try{if(typeof map.startPublic3D==='function')map.startPublic3D();else if(typeof map.scheduleThree==='function')map.scheduleThree();}catch(error){console.warn('[Belavista fast runtime] 3D seguirá progressivo',error);}
}

customElements.whenDefined('map-scene').then(()=>{patchPrototype();document.querySelectorAll(SELECTOR).forEach(prepare);}).catch(()=>{});
const observer=new MutationObserver(()=>{patchPrototype();document.querySelectorAll(SELECTOR).forEach(prepare);});
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),12000);
