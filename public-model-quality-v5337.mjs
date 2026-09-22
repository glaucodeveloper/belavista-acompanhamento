// BELAVISTA_PUBLIC_MODEL_TEXTURE_QUALITY_V5337
(() => {
  const SELECTOR='map-scene[data-public-map],map-scene[data-public-presentation]';
  function textureList(material){
    if(!material)return [];
    return [['map',true],['emissiveMap',true],['normalMap',false],['roughnessMap',false],['metalnessMap',false],['aoMap',false],['alphaMap',false],['bumpMap',false],['displacementMap',false],['lightMap',false]]
      .map(([key,color])=>[material[key],color]).filter(([texture])=>texture);
  }
  function applyQuality(map){
    const THREE=map.THREE, renderer=map.renderer, model=map.masterplanModel||map.modelGroup;
    if(!THREE||!renderer||!model||!map.modelReady)return false;
    const ratio=Math.min(2.0,Math.max(1.65,window.devicePixelRatio||1));
    renderer.setPixelRatio(ratio);
    const canvas=map.querySelector('.three-overlay');
    const width=Math.max(1,canvas?.clientWidth||map.clientWidth||innerWidth);
    const height=Math.max(1,canvas?.clientHeight||map.clientHeight||innerHeight);
    renderer.setSize(width,height,false);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.06;
    const maxAniso=renderer.capabilities?.getMaxAnisotropy?.()||1;
    const anisotropy=Math.max(1,Math.min(12,maxAniso));
    const textures=new Set(); let materialCount=0;
    model.traverse(node=>{
      if(!node?.isMesh)return;
      const materials=Array.isArray(node.material)?node.material:[node.material];
      materials.filter(Boolean).forEach(material=>{
        materialCount++;
        for(const [texture,colorTexture] of textureList(material)){
          if(textures.has(texture))continue;
          textures.add(texture);
          texture.anisotropy=anisotropy;
          texture.magFilter=THREE.LinearFilter;
          texture.minFilter=THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps=true;
          if(colorTexture)texture.colorSpace=THREE.SRGBColorSpace;
          texture.needsUpdate=true;
        }
        material.needsUpdate=true;
      });
    });
    map.dataset.publicTextureQuality='anisotropic-mipmaps-v5337';
    map.dataset.publicTextureAnisotropy=String(anisotropy);
    map.dataset.publicTextureCount=String(textures.size);
    map.dataset.publicMaterialCount=String(materialCount);
    map.dataset.publicRenderPixelRatio=ratio.toFixed(2);
    renderer.render(map.scene,map.camera);
    return true;
  }
  function install(map,attempt=0){
    if(!map||map.dataset.publicTextureQuality==='anisotropic-mipmaps-v5337')return;
    if(applyQuality(map))return;
    if(attempt<18)setTimeout(()=>install(map,attempt+1),250+attempt*80);
  }
  function scan(){ document.querySelectorAll(SELECTOR).forEach(map=>install(map)); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true}); else scan();
  window.addEventListener('resize',()=>{
    document.querySelectorAll(SELECTOR).forEach(map=>{
      if(!map.renderer)return;
      const canvas=map.querySelector('.three-overlay');
      const width=Math.max(1,canvas?.clientWidth||map.clientWidth||innerWidth);
      const height=Math.max(1,canvas?.clientHeight||map.clientHeight||innerHeight);
      map.renderer.setSize(width,height,false);
      map.renderer.render?.(map.scene,map.camera);
    });
  },{passive:true});
})();
