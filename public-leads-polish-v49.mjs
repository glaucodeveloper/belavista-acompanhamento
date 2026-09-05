const MAP_PRESET={tilt:70,rotation:0,zoom:1.68,panX:0,panY:0};
const PDF_PALETTE={
  grass:[0x266734,0x376a46,0x1f5f39,0x2f7547],
  road:0x909690,
  roadDark:0x565f58,
  border:0xe8e7e3,
  foliage:[0x1f5b35,0x2f7547,0x3f7f48],
  trunk:0x55412f,
  clay:0x9b6e4f,
  leisure:0xe1b094,
  marker:0xd77a32,
  reserved:0xf0c45a
};

const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const eachMaterial=(material,fn)=>Array.isArray(material)?material.map(fn):fn(material);
const cloneMaterial=(material,color,{roughness=.9,metalness=0,emissive=null,emissiveIntensity=.04,opacity=1}={})=>{
  if(!material)return material;
  const clone=material.clone?.()||material;
  clone.color?.setHex?.(color);
  if('roughness' in clone)clone.roughness=roughness;
  if('metalness' in clone)clone.metalness=metalness;
  if(clone.emissive&&emissive!=null){clone.emissive.setHex(emissive);clone.emissiveIntensity=emissiveIntensity;}
  clone.transparent=opacity<.995;clone.opacity=opacity;clone.depthWrite=true;
  clone.needsUpdate=true;
  return clone;
};

function installChatAdornments(root=document){
  const box=root.querySelector?.('public-lead-chat .public-chatbox');
  if(!box||box.dataset.visualPolishV49==='true')return false;
  box.dataset.visualPolishV49='true';
  const chrome=document.createElement('div');
  chrome.className='public-chat-chrome';
  chrome.setAttribute('aria-hidden','true');
  chrome.innerHTML=`<div class="public-chat-brandrail"><span class="public-chat-sigil">✦</span><span><b>NVIDIA IA</b><small>ALIANÇA PARK · ORIENTAÇÃO COMERCIAL</small></span></div><span class="public-chat-live"><i></i>ATIVA</span>`;
  box.prepend(chrome);
  const form=box.querySelector('[data-chat-form]');
  if(form){
    const rail=document.createElement('div');
    rail.className='public-chat-capabilities';
    rail.setAttribute('aria-hidden','true');
    rail.innerHTML='<span>01 · ESCOLHA</span><span>02 · IDENTIFICAÇÃO</span><span>03 · RESERVA</span>';
    form.before(rail);
    const foot=document.createElement('div');
    foot.className='public-chat-microcopy';
    foot.setAttribute('aria-hidden','true');
    foot.innerHTML='<span>MAPA CONECTADO</span><i></i><span>DISPONIBILIDADE POR CONVERSA</span><i></i><span>RESERVA ASSISTIDA</span>';
    form.after(foot);
  }
  return true;
}

function tunePublicLighting(map){
  if(!map?.THREE||!map.scene||map.dataset.publicLightingV49==='true')return;
  map.dataset.publicLightingV49='true';
  if(map.renderer){map.renderer.toneMappingExposure=.94;}
  map.scene.traverse?.(node=>{
    if(node.isHemisphereLight){node.intensity=1.45;node.color?.setHex?.(0xe8f2e5);node.groundColor?.setHex?.(0x1b2e20);}
    if(node.isDirectionalLight){node.intensity=2.35;node.color?.setHex?.(0xfff7e8);}
  });
  if(map.mapSurface?.material?.color)map.mapSurface.material.color.setHex(0xc4cbbd);
}

function grassMaterial(map,material,name,index){
  const THREE=map.THREE;
  const base=PDF_PALETTE.grass[(hash(name)+index)%PDF_PALETTE.grass.length];
  const fn=mat=>{
    let clone=map.makeSiteSurfaceMaterial?.(THREE,mat,'earth')||mat?.clone?.()||mat;
    if(!clone)return clone;
    clone.color?.setHex?.(base);
    if('roughness' in clone)clone.roughness=.92;
    if('metalness' in clone)clone.metalness=0;
    if(clone.emissive){clone.emissive.setHex(0x0a2d1a);clone.emissiveIntensity=.035;}
    clone.transparent=false;clone.opacity=1;clone.depthWrite=true;
    clone.userData={...(clone.userData||{}),belavistaSurface:'pdf-grass-v49'};
    clone.needsUpdate=true;
    return clone;
  };
  return eachMaterial(material,fn);
}

function roadMaterial(map,material){
  const THREE=map.THREE;
  const fn=mat=>{
    let clone=map.makeSiteSurfaceMaterial?.(THREE,mat,'cobble')||mat?.clone?.()||mat;
    if(!clone)return clone;
    clone.color?.setHex?.(PDF_PALETTE.road);
    if('roughness' in clone)clone.roughness=.965;
    if('metalness' in clone)clone.metalness=0;
    clone.transparent=false;clone.opacity=1;clone.depthWrite=true;clone.needsUpdate=true;
    clone.userData={...(clone.userData||{}),belavistaSurface:'pdf-road-v49'};
    return clone;
  };
  return eachMaterial(material,fn);
}

function tunePublicMaterials(map){
  if(!map?.THREE||!map.modelReady||!map.masterplanModel||map.dataset.publicMaterialsV49==='true')return false;
  map.dataset.publicMaterialsV49='true';
  const lots=map.modelParts?.lots||[];
  lots.forEach((node,index)=>{
    const name=String(node.name||node.userData?.partLabel||'').toLowerCase();
    if(/linha|contorno|outline|divisa|borda/.test(name)){
      node.material=eachMaterial(node.material,mat=>cloneMaterial(mat,PDF_PALETTE.border,{roughness:.84,opacity:.96}));
    }else node.material=grassMaterial(map,node.material,name,index);
    node.userData.defaultMaterial=node.material;
  });

  // Os retângulos de seleção operacional continuam discretos. Só a malha-base
  // da via recebe cinza/cobblestone; overlays de raycast não viram placas opacas.
  map.masterplanModel.traverse?.(node=>{
    if(!node?.isMesh)return;
    const name=String(node.name||'').toLowerCase();
    const role=String(node.userData?.belavistaRole||node.userData?.partKind||'').toLowerCase();
    const isOperationalSlice=Boolean(node.userData?.streetSegment);
    if((role==='streets'||role==='street'||/asfalto|rua|road|street|paviment|meio.?fio|guia/.test(name))&&!isOperationalSlice){
      node.material=roadMaterial(map,node.material);node.userData.defaultMaterial=node.material;return;
    }
    if(/tronco|trunk/.test(name)){
      node.material=eachMaterial(node.material,mat=>cloneMaterial(mat,PDF_PALETTE.trunk,{roughness:.96}));node.userData.defaultMaterial=node.material;return;
    }
    if(role==='landscape'||/arvore|tree|copa|folhagem|folha|paisag|grama/.test(name)){
      const green=PDF_PALETTE.foliage[hash(name)%PDF_PALETTE.foliage.length];
      node.material=eachMaterial(node.material,mat=>cloneMaterial(mat,green,{roughness:.94,emissive:0x0a2415,emissiveIntensity:.025}));node.userData.defaultMaterial=node.material;return;
    }
    if(role==='leisure'||/quadra|court|play|academia|gym|lazer/.test(name)){
      node.material=eachMaterial(node.material,mat=>cloneMaterial(mat,PDF_PALETTE.leisure,{roughness:.86}));node.userData.defaultMaterial=node.material;return;
    }
    if(/pavilhao|telhado|quiosque|estrutura/.test(name)){
      node.material=eachMaterial(node.material,mat=>cloneMaterial(mat,PDF_PALETTE.clay,{roughness:.83}));node.userData.defaultMaterial=node.material;
    }
  });

  // Marcadores compactos em laranja queimado, próximos da leitura do material
  // de venda do PDF, sem alterar a semântica de disponibilidade/reserva.
  for(const badge of map.lotStatusBadges||[]){
    const canvas=badge.material?.map?.image;
    if(!(canvas instanceof HTMLCanvasElement))continue;
    const ctx=canvas.getContext('2d');if(!ctx)continue;
    const reserved=badge.userData?.status==='Reservado';const label=String(badge.userData?.lotNumber||'');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,canvas.width*.31,0,Math.PI*2);
    ctx.fillStyle=reserved?'#f0c45a':'#d77a32';ctx.fill();
    ctx.lineWidth=Math.max(2,canvas.width*.035);ctx.strokeStyle='rgba(255,255,255,.88)';ctx.stroke();
    ctx.fillStyle='#f7f3e8';ctx.font=`700 ${Math.round(canvas.width*.23)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label.slice(-3),canvas.width/2,canvas.height/2+1);
    badge.material.map.needsUpdate=true;badge.scale.set(2.35,2.35,1);
  }
  map.dataset.publicPalette='pdf-warley-page-1-v49';
  map.renderer?.render?.(map.scene,map.camera);
  return true;
}

function applyPublicPreset(map){
  if(!map||map.dataset.publicPresetV49==='true')return;
  map.dataset.publicPresetV49='true';
  map.sceneManualRotation=MAP_PRESET.rotation;
  map.sceneManualZoom=MAP_PRESET.zoom;
  map.sceneManualPan={x:MAP_PRESET.panX,y:MAP_PRESET.panY};
  map.sceneTiltAdjust=0;
  map.sceneUserInteracted=true;
  map.style.setProperty('--scene-pan-x','0px');map.style.setProperty('--scene-pan-y','0px');
  map.dataset.scenePan='0,0';map.dataset.publicViewPreset='portrait-70deg-168-v49';
  const apply=()=>{
    if(map.sceneStage&&typeof map.setSceneVisual==='function'){
      map.setSceneVisual(MAP_PRESET.tilt,MAP_PRESET.rotation,MAP_PRESET.zoom);
      map.constrainScenePan?.('public-preset-v49');
    }
    tunePublicLighting(map);tunePublicMaterials(map);
  };
  apply();
  let attempts=0;
  const tick=()=>{attempts++;apply();if((!map.modelReady||!map.THREE)&&attempts<120)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
}

function boot(){
  const install=()=>{
    installChatAdornments(document);
    const map=document.querySelector('map-scene[data-public-presentation],map-scene[data-public-map]');
    if(map){map.setAttribute('data-public-presentation','true');applyPublicPreset(map);}
  };
  install();
  const observer=new MutationObserver(()=>install());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),18000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
