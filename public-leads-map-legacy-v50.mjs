// BELAVISTA_PUBLIC_MAP_NATURAL_V50
// Public commercial map: near-top-down plan view + material tuning.
import publicMapEnvironmentData from './dist/frontend/data/public-map-environment.json' with { type: 'json' };
const color=value=>typeof value==='number'?value:Number.parseInt(String(value).replace(/^0x/i,''),16);
const publicEnvironment=publicMapEnvironmentData.scene;
const legacyFallback=publicMapEnvironmentData.legacyFallback;
const sourcePalette=legacyFallback.palette;
const PALETTE={...sourcePalette,grass:sourcePalette.grass.map(color),road:sourcePalette.road.map(color),curb:color(sourcePalette.curb),line:color(sourcePalette.line),foliage:sourcePalette.foliage.map(color),trunk:color(sourcePalette.trunk),sand:color(sourcePalette.sand),clay:color(sourcePalette.clay),concrete:color(sourcePalette.concrete)};
const lighting=legacyFallback.lighting;
const materialDefaults=legacyFallback.materialDefaults;
const normalizeDefaults={...materialDefaults.normalize,emissive:color(materialDefaults.normalize.emissive)};
const texturedDefaults={...materialDefaults.textured,emissive:color(materialDefaults.textured.emissive)};
const materialProfiles=Object.fromEntries(Object.entries(materialDefaults.surfaces).map(([key,value])=>[key,{...value,...(value.emissive===undefined?{}:{emissive:color(value.emissive)})}]));
const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const materials=(material,fn)=>Array.isArray(material)?material.map(fn):fn(material);
const normalize=(material,color,options={})=>{
  if(!material)return material;
  const roughness=options.roughness??normalizeDefaults.roughness,emissive=options.emissive??normalizeDefaults.emissive,emissiveIntensity=options.emissiveIntensity??normalizeDefaults.emissiveIntensity;
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
  if('roughness' in clone)clone.roughness=opts.roughness??texturedDefaults.roughness;
  if('metalness' in clone)clone.metalness=0;
  if(clone.emissive){clone.emissive.setHex(opts.emissive??texturedDefaults.emissive);clone.emissiveIntensity=opts.emissiveIntensity??texturedDefaults.emissiveIntensity;}
  clone.transparent=false;clone.opacity=1;clone.depthWrite=true;clone.depthTest=true;clone.needsUpdate=true;
  clone.userData={...(clone.userData||{}),belavistaPublicSurface:`${surface}-natural-v50`};
  return clone;
});
function tuneLighting(map){
  if(!map?.scene||map.dataset.publicLightingV50==='true')return;
  map.dataset.publicLightingV50='true';
  if(map.renderer)map.renderer.toneMappingExposure=lighting.rendererExposure;
  map.scene.traverse?.(node=>{
    if(node.isHemisphereLight){node.intensity=lighting.hemisphereLight.intensity;node.color?.setHex?.(color(lighting.hemisphereLight.color));node.groundColor?.setHex?.(color(lighting.hemisphereLight.groundColor));}
    if(node.isDirectionalLight){node.intensity=lighting.directionalLight.intensity;node.color?.setHex?.(color(lighting.directionalLight.color));}
  });
  if(map.mapSurface?.material){
    map.mapSurface.material.color?.setHex?.(color(publicEnvironment.surface.color));
    map.mapSurface.material.opacity=publicEnvironment.surface.opacity;
    map.mapSurface.material.transparent=publicEnvironment.surface.transparent;
    map.mapSurface.material.needsUpdate=true;
  }
}
function tuneMaterials(map){
  if(!map?.THREE||!map.modelReady||!map.masterplanModel)return false;
  const publicSatellite=map.dataset.publicRoadPolicy==='satellite-only'||map.matches?.('map-scene[data-public-presentation],map-scene[data-public-map]');
  if(publicSatellite){
    map.disablePublicCobbleTexture?.();
    map.disablePublicSyntheticRoads?.();
    map.dataset.publicPalette=publicEnvironment.labels.satellitePalette;
    map.dataset.publicRoadTexture=publicEnvironment.labels.disabledRoadTexture;
    map.dataset.publicRoadTextureSource=publicEnvironment.labels.removedSyntheticRoadTexture;
    map.dataset.publicMaterialsV50=publicEnvironment.labels.preservedSatelliteMaterials;
    map.dataset.publicModelAlignment=publicEnvironment.labels.modelAlignment;
    return true;
  }
  if(map.dataset.publicMaterialsV50==='true')return false;
  if(map.dataset.publicRoadPolicy==='satellite-only'){
    map.disablePublicSyntheticRoads?.();
    map.dataset.publicPalette=publicEnvironment.labels.satellitePalette;
    map.dataset.publicMaterialsV50=publicEnvironment.labels.preservedSatelliteMaterials;
    map.dataset.publicModelAlignment=publicEnvironment.labels.modelAlignment;
    return true;
  }
  // O componente principal já aplicou a implantação pública: foto aérea
  // contínua, contornos brancos e sem uma malha viária sintética. Não
  // volte a pintar lotes/ruas com a paleta antiga depois desse estágio.
  if(map.dataset.publicLotPresentation){
    map.dataset.publicPalette=publicEnvironment.labels.satellitePalette;
    map.dataset.publicMaterialsV50=legacyFallback.labels.preservedMaterials;
    return true;
  }
  map.dataset.publicMaterialsV50='true';
  const lots=map.modelParts?.lots||[];
  lots.forEach((node,index)=>{
    const name=String(node.name||node.userData?.partLabel||'').toLowerCase();
    const color=PALETTE.grass[(hash(name)+index)%PALETTE.grass.length];
    node.material=textured(map,node.material,'earth',color,materialProfiles.earth);
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
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.line,materialProfiles.outline));node.userData.defaultMaterial=node.material;return;
    }
    if((role==='streets'||role==='street'||/asfalto|rua|road|street|paviment/.test(name))&&!operational){
      const road=PALETTE.road[hash(name)%PALETTE.road.length];
      node.material=textured(map,node.material,'cobble',road,materialProfiles.road);node.userData.defaultMaterial=node.material;return;
    }
    if(/meio.?fio|guia|curb/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.curb,materialProfiles.curb));node.userData.defaultMaterial=node.material;return;
    }
    if(/tronco|trunk/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.trunk,materialProfiles.trunk));node.userData.defaultMaterial=node.material;return;
    }
    if(role==='landscape'||/arvore|tree|copa|folhagem|folha|paisag|grama|veget/.test(name)){
      const green=PALETTE.foliage[hash(name)%PALETTE.foliage.length];
      node.material=materials(node.material,mat=>normalize(mat,green,materialProfiles.foliage));node.userData.defaultMaterial=node.material;return;
    }
    if(role==='leisure'||/quadra|court|play|academia|gym|lazer|praca/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.sand,materialProfiles.leisure));node.userData.defaultMaterial=node.material;return;
    }
    if(/pavilhao|telhado|quiosque|estrutura/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.clay,materialProfiles.roof));node.userData.defaultMaterial=node.material;return;
    }
    if(/concreto|base|calcada|passeio/.test(name)){
      node.material=materials(node.material,mat=>normalize(mat,PALETTE.concrete,materialProfiles.concrete));node.userData.defaultMaterial=node.material;
    }
  });
  // Keep operational selection slices subtle instead of opaque white plates.
  for(const node of map.modelParts?.streets||[]){
    if(!node?.userData?.streetSegment)continue;
    const mat=node.userData.defaultMaterial||node.material;
    const tone=PALETTE.road[hash(node.name)%PALETTE.road.length];
    node.userData.defaultMaterial=materials(mat,m=>{const c=normalize(m,tone,materialProfiles.streetOverlay);c.transparent=true;c.opacity=materialProfiles.streetOverlay.opacity;c.depthWrite=false;return c;});
    if(!node.userData.overlayMaterial)node.material=node.userData.defaultMaterial;
  }
    map.dataset.publicPalette=legacyFallback.labels.naturalPalette;
  map.renderer?.render?.(map.scene,map.camera);
  return true;
}
function boot(){
  let frames=0;
  const tick=()=>{
    const map=document.querySelector('map-scene[data-public-presentation],map-scene[data-public-map]');
    if(map&&!map.dataset.publicMapTsOwner){map.setAttribute('data-public-presentation','true');tuneLighting(map);tuneMaterials(map);}
    frames++;
    if(frames<150&&(!map?.modelReady||!map?.dataset?.publicMaterialsV50))requestAnimationFrame(tick);
  };
  tick();
  const observer=new MutationObserver(()=>{const map=document.querySelector('map-scene[data-public-presentation],map-scene[data-public-map]');if(map&&!map.dataset.publicMapTsOwner){tuneLighting(map);tuneMaterials(map);}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
