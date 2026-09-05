// BELAVISTA_PUBLIC_MAP_NATURAL_V50
// Public commercial map: near-top-down plan view + material tuning.
const PUBLIC_VIEW={tilt:22,rotation:0,zoom:1.62,panX:0,panY:0};
const PALETTE={
  grass:[0x789168,0x6d885f,0x829a72,0x738c63,0x8aa078],
  road:[0xaaa8a1,0xb5b2aa,0x9e9d98],
  curb:0xd8d4cb,
  line:0x475547,
  foliage:[0x315b35,0x3b6840,0x294f30,0x497447],
  trunk:0x584432,
  sand:0xc8b894,
  clay:0x9c785b,
  concrete:0xb7b0a4
};
const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const materials=(material,fn)=>Array.isArray(material)?material.map(fn):fn(material);
const normalize=(material,color,{roughness=.93,emissive=0x000000,emissiveIntensity=0}={})=>{
  if(!material)return material;
  const clone=material.clone?.()||material;
  clone.color?.setHex?.(color);
  if('map' in clone)clone.map=null;
  if('aoMap' in clone)clone.aoMap=null;
  if('metalnessMap' in clone)clone.metalnessMap=null;
  if('roughnessMap' in clone)clone.roughnessMap=null;
  if('vertexColors' in clone)clone.vertexColors=false;
  if('roughness' in clone)clone.roughness=roughness;
  if('metalness' in clone)clone.metalness=0;
  if(clone.emissive){clone.emissive.setHex(emissive);clone.emissiveIntensity=emissiveIntensity;}
  clone.transparent=false; clone.opacity=1; clone.depthWrite=true; clone.depthTest=true;
  clone.needsUpdate=true;
  return clone;
};
const textured=(map,material,surface,color,opts={})=>materials(material,mat=>{
  let clone=map.makeSiteSurfaceMaterial?.(map.THREE,mat,surface)||mat?.clone?.()||mat;
  if(!clone)return clone;
  clone.color?.setHex?.(color);
  if('map' in clone)clone.map=null;
  if('aoMap' in clone)clone.aoMap=null;
  if('metalnessMap' in clone)clone.metalnessMap=null;
  if('roughnessMap' in clone)clone.roughnessMap=null;
  if('vertexColors' in clone)clone.vertexColors=false;
  if('roughness' in clone)clone.roughness=opts.roughness??.95;
  if('metalness' in clone)clone.metalness=0;
  if(clone.emissive){clone.emissive.setHex(opts.emissive??0x000000);clone.emissiveIntensity=opts.emissiveIntensity??0;}
  clone.transparent=false;clone.opacity=1;clone.depthWrite=true;clone.depthTest=true;clone.needsUpdate=true;
  clone.userData={...(clone.userData||{}),belavistaPublicSurface:`${surface}-natural-v50`};
  return clone;
});
function tuneLighting(map){
  if(!map?.scene||map.dataset.publicLightingV50==='true')return;
  map.dataset.publicLightingV50='true';
  if(map.renderer)map.renderer.toneMappingExposure=.82;
  map.scene.traverse?.(node=>{
    if(node.isHemisphereLight){node.intensity=.72;node.color?.setHex?.(0xf1f2e7);node.groundColor?.setHex?.(0x253223);}
    if(node.isDirectionalLight){node.intensity=1.18;node.color?.setHex?.(0xfff2db);}
  });
  if(map.mapSurface?.material){
    map.mapSurface.material.color?.setHex?.(0xffffff);
    map.mapSurface.material.opacity=1;
    map.mapSurface.material.transparent=false;
    map.mapSurface.material.needsUpdate=true;
  }
}
function tuneMaterials(map){
  if(!map?.THREE||!map.modelReady||!map.masterplanModel||map.dataset.publicMaterialsV50==='true')return false;
  // O componente principal já aplicou a implantação pública: foto aérea
  // contínua, contornos brancos e material importado de paralelepípedo. Não
  // volte a pintar lotes/ruas com a paleta antiga depois desse estágio.
  if(map.dataset.publicLotPresentation){
    map.dataset.publicPalette='white-lot-outlines + imported-cobble-v54';
    map.dataset.publicMaterialsV50='preserved-public-presentation-v54';
    return true;
  }
  map.dataset.publicMaterialsV50='true';
  const lots=map.modelParts?.lots||[];
  lots.forEach((node,index)=>{
    const name=String(node.name||node.userData?.partLabel||'').toLowerCase();
    const color=PALETTE.grass[(hash(name)+index)%PALETTE.grass.length];
    node.material=textured(map,node.material,'earth',color,{roughness:.955,emissive:0x102112,emissiveIntensity:.008});
    node.userData.defaultMaterial=node.material;
  });
  map.masterplanModel.traverse?.(node=>{
    if(!node?.isMesh)return;
    const name=String(node.name||'').toLowerCase();
    const role=String(node.userData?.belavistaRole||node.userData?.partKind||'').toLowerCase();
    const operational=Boolean(node.userData?.streetSegment);
    const social=role==='leisure'||/area.?de.?lazer|court|gym.?pad|gym.?post|gym.?beam|gym.?seat|pavilhao|play|praca|banco.?praca/.test(name);
    if(social&&typeof map.makeSocialAreaMaterial==='function'){
      node.material=materials(node.material,mat=>map.makeSocialAreaMaterial(map.THREE,mat,name));
      node.userData.defaultMaterial=node.material;
      node.userData.belavistaSocialSurface=true;
      return;
    }
    if(/contorno|outline|divisa|limite|borda|linha/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.line,{roughness:.9}));node.userData.defaultMaterial=node.material;return;
    }
    if((role==='streets'||role==='street'||/asfalto|rua|road|street|paviment/.test(name))&&!operational){
      const road=PALETTE.road[hash(name)%PALETTE.road.length];
      node.material=textured(map,node.material,'cobble',road,{roughness:.975});node.userData.defaultMaterial=node.material;return;
    }
    if(/meio.?fio|guia|curb/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.curb,{roughness:.94}));node.userData.defaultMaterial=node.material;return;
    }
    if(/tronco|trunk/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.trunk,{roughness:.98}));node.userData.defaultMaterial=node.material;return;
    }
    if(role==='landscape'||/arvore|tree|copa|folhagem|folha|paisag|grama|veget/.test(name)){
      const green=PALETTE.foliage[hash(name)%PALETTE.foliage.length];
      node.material=materials(node.material,mat=>normalize(mat,green,{roughness:.97,emissive:0x07180a,emissiveIntensity:.01}));node.userData.defaultMaterial=node.material;return;
    }
    if(role==='leisure'||/quadra|court|play|academia|gym|lazer|praca/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.sand,{roughness:.91}));node.userData.defaultMaterial=node.material;return;
    }
    if(/pavilhao|telhado|quiosque|estrutura/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.clay,{roughness:.89}));node.userData.defaultMaterial=node.material;return;
    }
    if(/concreto|base|calcada|passeio/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.concrete,{roughness:.95}));node.userData.defaultMaterial=node.material;
    }
  });
  // Keep operational selection slices subtle instead of opaque white plates.
  for(const node of map.modelParts?.streets||[]){
    if(!node?.userData?.streetSegment)continue;
    const mat=node.userData.defaultMaterial||node.material;
    const tone=PALETTE.road[hash(node.name)%PALETTE.road.length];
    node.userData.defaultMaterial=materials(mat,m=>{const c=normalize(m,tone,{roughness:.98});c.transparent=true;c.opacity=.16;c.depthWrite=false;return c;});
    if(!node.userData.overlayMaterial)node.material=node.userData.defaultMaterial;
  }
  map.dataset.publicPalette='natural-site-plan-v50';
  map.renderer?.render?.(map.scene,map.camera);
  return true;
}
function applyView(map){
  if(!map)return;
  const gapFitted=map.dataset.publicGapFrameStatus==='fitted-between-letter-and-chat'&&map.dataset.publicGapFrame;
  map.sceneManualRotation=PUBLIC_VIEW.rotation;
  map.sceneTiltAdjust=0;
  map.sceneUserInteracted=true;
  if(!gapFitted){
    map.sceneManualZoom=PUBLIC_VIEW.zoom;
    map.sceneManualPan={x:PUBLIC_VIEW.panX,y:PUBLIC_VIEW.panY};
    map.style.setProperty('--scene-pan-x','0px');map.style.setProperty('--scene-pan-y','0px');map.dataset.scenePan='0,0';
  }
  map.dataset.publicViewPreset='oblique-22deg-terrain-coverage-v55';
  if(map.sceneStage&&typeof map.setSceneVisual==='function'&&!gapFitted)map.setSceneVisual(PUBLIC_VIEW.tilt,PUBLIC_VIEW.rotation,PUBLIC_VIEW.zoom);
  map.fitPublicGapView?.();
  tuneLighting(map);tuneMaterials(map);
}
function boot(){
  let frames=0;
  const tick=()=>{
    const map=document.querySelector('map-scene[data-public-presentation],map-scene[data-public-map]');
    if(map){map.setAttribute('data-public-presentation','true');applyView(map);}
    frames++;
    if(frames<150&&(!map?.modelReady||!map?.dataset?.publicMaterialsV50))requestAnimationFrame(tick);
  };
  tick();
  const observer=new MutationObserver(()=>{const map=document.querySelector('map-scene[data-public-presentation],map-scene[data-public-map]');if(map)applyView(map);});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
