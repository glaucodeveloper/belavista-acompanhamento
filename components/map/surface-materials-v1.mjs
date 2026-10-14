export const assertSurfaceMaterialsDependenciesV1 = (MapScene) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Surface materials require the existing MapScene constructor.");
  return MapScene;
};

export const installSurfaceMaterialsV1 = (MapScene) => {
  assertSurfaceMaterialsDependenciesV1(MapScene);
  const SurfaceMaterialMethodsV1 = class {
  makeSiteSurfaceMaterial(THREE, material, surface = "cobble") {
    if (!material) return material;
    const clone = material.clone?.() || material;
    const palette = {
      cobble: { color: 0xa7a49a, roughness: 0.985, metalness: 0 },
      gravel: { color: 0x8b7659, roughness: 0.99, metalness: 0 },
      earth: { color: 0x9b5d39, roughness: 0.98, metalness: 0 },
      grass: { color: 0x286b37, roughness: 0.99, metalness: 0 },
      asphalt: { color: 0x30363a, roughness: 0.93, metalness: 0 },
      concrete: { color: 0xb9b5aa, roughness: 0.92, metalness: 0 },
      sand: { color: 0xcbb98e, roughness: 0.99, metalness: 0 },
      rubber: { color: 0x283536, roughness: 0.91, metalness: 0 },
      wood: { color: 0x865334, roughness: 0.88, metalness: 0 },
      sport: { color: 0x8f5a43, roughness: 0.9, metalness: 0 },
      roof: { color: 0x9d5438, roughness: 0.9, metalness: 0 },
    }[surface] || { color: 0x666666, roughness: 0.95, metalness: 0 };
    clone.color?.setHex?.(palette.color);
    if ("roughness" in clone) clone.roughness = palette.roughness;
    if ("metalness" in clone) clone.metalness = palette.metalness;
    clone.transparent = false;
    clone.opacity = 1;
    clone.depthWrite = true;
    clone.side = THREE.DoubleSide;
    clone.userData = {
      ...(clone.userData || {}),
      belavistaSurface: surface,
      proceduralNoUv: true,
    };
    const surfaceCode =
      surface === "cobble"
        ? `
      vec2 bvP=vBelavistaSurfacePos.xy*vec2(0.34,0.52);
      float bvShift=mod(floor(bvP.y),2.0)*0.5;
      vec2 bvCell=fract(vec2(bvP.x+bvShift,bvP.y));
      float bvEdge=min(min(bvCell.x,1.0-bvCell.x),min(bvCell.y,1.0-bvCell.y));
      float bvJoint=1.0-smoothstep(0.045,0.105,bvEdge);
      float bvStone=bvNoise(vBelavistaSurfacePos*0.38);
      float bvFine=bvNoise(vBelavistaSurfacePos*2.7);
      vec3 bvTone=vec3(0.72+0.22*bvStone+0.08*bvFine);
      diffuseColor.rgb*=mix(bvTone,vec3(0.20),bvJoint);
    `
        : surface === "gravel"
          ? `
      float bvCoarse=bvNoise(vBelavistaSurfacePos*0.72);
      float bvGrain=bvNoise(vBelavistaSurfacePos*5.2);
      float bvPebble=smoothstep(0.68,0.92,bvGrain);
      diffuseColor.rgb*=vec3(0.78+0.20*bvCoarse+0.10*bvPebble);
    `
          : surface === "grass"
            ? `
      float bvField=bvNoise(vBelavistaSurfacePos*0.17);
      float bvPatch=bvNoise(vBelavistaSurfacePos*1.45);
      float bvClump=bvNoise(vBelavistaSurfacePos*3.8);
      float bvFine=bvNoise(vBelavistaSurfacePos*11.5);
      float bvFiber=bvNoise(vBelavistaSurfacePos*21.0);
      // Variação orgânica em várias escalas, sem a faixa senoidal que fazia
      // o piso social parecer riscado quando visto de cima.
      diffuseColor.rgb*=vec3(.68+.18*bvField+.12*bvPatch+.065*bvClump+.03*bvFine);
      diffuseColor.rgb+=vec3(.012,.028,.008)*(bvFiber-.5);
    `
            : surface === "sand"
              ? `
      float bvDune=bvNoise(vBelavistaSurfacePos*.32);
      float bvGrain=bvNoise(vBelavistaSurfacePos*8.6);
      float bvPebble=smoothstep(.76,.96,bvNoise(vBelavistaSurfacePos*3.9));
      diffuseColor.rgb*=vec3(.82+.12*bvDune+.055*bvGrain-.045*bvPebble);
    `
              : surface === "rubber"
                ? `
      float bvBase=bvNoise(vBelavistaSurfacePos*.62);
      float bvSpeck=smoothstep(.77,.94,bvNoise(vBelavistaSurfacePos*11.0));
      diffuseColor.rgb*=mix(vec3(.79+.12*bvBase),vec3(1.25),bvSpeck*.34);
    `
                : surface === "wood"
                  ? `
      float bvGrain=.5+.5*sin(vBelavistaSurfacePos.x*2.5+bvNoise(vBelavistaSurfacePos*.34)*5.0);
      float bvKnot=smoothstep(.72,.93,bvNoise(vBelavistaSurfacePos*.86));
      diffuseColor.rgb*=vec3(.72+.20*bvGrain-.13*bvKnot);
    `
                  : surface === "sport"
                    ? `
      float bvWear=bvNoise(vBelavistaSurfacePos*.44);
      float bvAggregate=bvNoise(vBelavistaSurfacePos*7.2);
      diffuseColor.rgb*=vec3(.82+.12*bvWear+.045*bvAggregate);
    `
                    : surface === "roof"
                      ? `
      vec2 bvTile=vBelavistaSurfacePos.xy*vec2(.42,.72);
      float bvOffset=mod(floor(bvTile.y),2.0)*.5;
      vec2 bvCell=fract(vec2(bvTile.x+bvOffset,bvTile.y));
      float bvJoint=1.0-smoothstep(.035,.09,min(min(bvCell.x,1.0-bvCell.x),min(bvCell.y,1.0-bvCell.y)));
      float bvClay=bvNoise(vBelavistaSurfacePos*.8);
      diffuseColor.rgb*=mix(vec3(.78+.2*bvClay),vec3(.36),bvJoint);
    `
                      : surface === "asphalt"
                        ? `
      float bvAggregate=bvNoise(vBelavistaSurfacePos*3.6);
      float bvPatch=bvNoise(vBelavistaSurfacePos*.32);
      float bvSeam=1.0-smoothstep(.018,.055,abs(fract(vBelavistaSurfacePos.y*.085)-.5));
      diffuseColor.rgb*=vec3(.72+.18*bvAggregate+.10*bvPatch-.11*bvSeam);
    `
                        : surface === "concrete"
                          ? `
      float bvSlab=bvNoise(vBelavistaSurfacePos*.52);
      float bvGrain=bvNoise(vBelavistaSurfacePos*5.4);
      float bvJointX=1.0-smoothstep(.012,.04,abs(fract(vBelavistaSurfacePos.x*.12)-.5));
      float bvJointY=1.0-smoothstep(.012,.04,abs(fract(vBelavistaSurfacePos.y*.12)-.5));
      diffuseColor.rgb*=vec3(.86+.10*bvSlab+.035*bvGrain-.17*max(bvJointX,bvJointY));
    `
                          : `
      float bvWide=bvNoise(vBelavistaSurfacePos*0.18);
      float bvSoil=bvNoise(vBelavistaSurfacePos*1.15);
      float bvFine=bvNoise(vBelavistaSurfacePos*4.8);
      float bvTrack=0.5+0.5*sin((vBelavistaSurfacePos.x+vBelavistaSurfacePos.y)*1.35+bvWide*2.5);
      diffuseColor.rgb*=vec3(0.72+0.18*bvWide+0.08*bvSoil-0.045*bvTrack+0.035*bvFine);
    `;
    const rough =
      surface === "cobble"
        ? ".94 + .055*bvNoise(vBelavistaSurfacePos*3.4)"
        : surface === "gravel"
          ? ".97 + .025*bvNoise(vBelavistaSurfacePos*4.8)"
          : surface === "grass"
            ? ".965 + .03*bvNoise(vBelavistaSurfacePos*4.6)"
            : surface === "rubber"
              ? ".86 + .09*bvNoise(vBelavistaSurfacePos*7.0)"
              : surface === "wood"
                ? ".82 + .12*bvNoise(vBelavistaSurfacePos*2.3)"
                : surface === "sport" || surface === "roof"
                  ? ".84 + .11*bvNoise(vBelavistaSurfacePos*4.0)"
                  : surface === "sand"
                    ? ".97 + .025*bvNoise(vBelavistaSurfacePos*8.0)"
                    : surface === "asphalt"
                      ? ".89 + .06*bvNoise(vBelavistaSurfacePos*5.2)"
                      : surface === "concrete"
                        ? ".88 + .07*bvNoise(vBelavistaSurfacePos*4.3)"
                        : ".955 + .04*bvNoise(vBelavistaSurfacePos*3.1)";
    clone.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vBelavistaSurfacePos;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvBelavistaSurfacePos=position;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vBelavistaSurfacePos;
float bvHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float bvNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(bvHash(i+vec3(0,0,0)),bvHash(i+vec3(1,0,0)),f.x),mix(bvHash(i+vec3(0,1,0)),bvHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(bvHash(i+vec3(0,0,1)),bvHash(i+vec3(1,0,1)),f.x),mix(bvHash(i+vec3(0,1,1)),bvHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`,
        )
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\n" + surfaceCode,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
roughnessFactor=clamp(${rough},0.0,1.0);`,
        );
    };
    clone.customProgramCacheKey = () => `belavista-site-${surface}-v9`;
    clone.needsUpdate = true;
    return clone;
  }
  makeSocialAreaMaterial(THREE, material, objectName = "") {
    if (!material) return material;
    const name = String(objectName || "").toLowerCase();
    let surface = "concrete",
      color = 0xb8b3a8,
      metalness = 0,
      roughness = 0.92;
    if (/area.?de.?lazer.?base|grama|jardim|paisag/.test(name)) {
      surface = "grass";
      color = 0x397944;
      roughness = 0.985;
    } else if (/playground.?areia|areia/.test(name)) {
      surface = "sand";
      color = 0xd0b982;
      roughness = 0.99;
    } else if (/gym.?pad(?!.*border)|academia.?base/.test(name)) {
      surface = "rubber";
      color = 0x334747;
      roughness = 0.9;
    } else if (
      /court.?border|court.?center|gym.?pad.?border|linha/.test(name)
    ) {
      surface = "sport";
      color = 0xe7e3d8;
      roughness = 0.88;
    } else if (/court[_ -]?[abc]|quadra/.test(name)) {
      surface = "sport";
      color = /court[_ -]?b/.test(name)
        ? 0x5c765f
        : /court[_ -]?c/.test(name)
          ? 0x9a694e
          : 0x9b7858;
      roughness = 0.9;
    } else if (/pavilhao.?telhado|cobertura|telhado|quiosque/.test(name)) {
      surface = "roof";
      color = 0xa95738;
      roughness = 0.9;
    } else if (/banco.?praca|play.?torre|play.?plataforma/.test(name)) {
      surface = "wood";
      color = 0x8c5735;
      roughness = 0.87;
    } else if (/play.?escorregador/.test(name)) {
      surface = "rubber";
      color = 0xd99925;
      roughness = 0.72;
    } else if (/pavilhao.?coluna|play.?coluna|gym.?post|gym.?beam/.test(name)) {
      surface = "rubber";
      color = 0x355c66;
      metalness = 0.34;
      roughness = 0.58;
    } else if (/gym.?seat/.test(name)) {
      surface = "rubber";
      color = 0x255e52;
      roughness = 0.78;
    } else if (
      /praca.?circular|pavilhao.?base|base|passeio|calcada/.test(name)
    ) {
      surface = "concrete";
      color = 0xbdb7aa;
      roughness = 0.93;
    }
    const clone = this.makeSiteSurfaceMaterial(THREE, material, surface);
    clone?.color?.setHex?.(color);
    if (clone && "metalness" in clone) clone.metalness = metalness;
    if (clone && "roughness" in clone) clone.roughness = roughness;
    if (clone?.emissive) {
      clone.emissive.setHex(0x000000);
      clone.emissiveIntensity = 0;
    }
    if (clone) {
      clone.userData = {
        ...(clone.userData || {}),
        belavistaSocialSurface: surface,
        belavistaSocialMaterialVersion: "social-pbr-v553",
      };
      if (surface === "grass") {
        // Mantém a grama visualmente separada do relevo satélite mesmo onde
        // os dois planos ficam muito próximos após a triangulação do GLB.
        clone.polygonOffset = true;
        // A superfície viária é o limite físico da área social. Mantê-la
        // atrás no depth buffer permite que o recorte exato da rua cubra a
        // grama quando os dois materiais compartilham uma borda.
        clone.polygonOffsetFactor = 1;
        clone.polygonOffsetUnits = 1;
      }
      clone.needsUpdate = true;
    }
    return clone;
  }
  };
  for (const method of ["makeSiteSurfaceMaterial", "makeSocialAreaMaterial"])
    Object.defineProperty(
      MapScene.prototype,
      method,
      Object.getOwnPropertyDescriptor(SurfaceMaterialMethodsV1.prototype, method),
    );
  return MapScene;
};
