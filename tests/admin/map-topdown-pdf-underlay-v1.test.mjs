import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.BELAVISTA_ROOT||process.cwd());
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('mapa administrativo libera vista superior sem travar no preset público',()=>{
  const components=read('components.js');
  assert.match(components,/MIN_SCENE_TILT=0, MAX_SCENE_TILT=72, SCENE_TILT_ADJUST_LIMIT=72/);
  assert.match(components,/return this\.isPublicCustomerExperience\(\)&&this\.dataset\.publicCameraInteracted!==\'true\';/);
  assert.match(components,/this\.hasAttribute\(\'data-admin-shared-public-map\'\)\?22/);
  assert.match(components,/Math\.max\(\.5,Math\.min\(89\.5,90-tilt\)\)/);
});

test('zoom out não reduz nem altera automaticamente a faixa de inclinação',()=>{
  const components=read('components.js');
  assert.match(components,/SCENE_TILT_ZOOM_OUT_FACTOR=1/);
  assert.match(components,/this\.dataset\.sceneTiltZoomPolicy='independente do zoom · zoom out preserva inclinação'/);
  assert.match(components,/return \{min:MIN_SCENE_TILT,max:Math\.min\(MAX_SCENE_TILT,MAX_SCENE_TILT\*tiltZoomFactor\)\}/);
  assert.doesNotMatch(components,/const coverageMax=coverage>=3\.2\?MAX_SCENE_TILT:coverage>=2\.4\?44:38/);
});

test('perímetro verde sintético fica removido e áreas sociais seguem DWG',()=>{
  const components=read('components.js');
  assert.match(components,/ring\.visible=false/);
  assert.match(components,/publicGreenMeshRemoved:true/);
  assert.match(components,/6 DWG-aligned green clearings · rectangular perimeter disabled/);
});

test('PDF do loteamento é usado uma única vez como textura do GLB',()=>{
  const components=read('components.js');
  assert.match(components,/PDF_MASTERPLAN_UNDERLAY_ASSET='\/assets\/public\/alianca-park-masterplan-static-v535-no-photo\.webp'/);
  assert.match(components,/PDF_MASTERPLAN_PAGE_SIZE_V1=\{width:1800,height:2098\}/);
  assert.match(components,/PDF_MASTERPLAN_SITE_FRAME_V1=\{left:\.10,top:\.045,right:\.935,bottom:\.945\}/);
  assert.match(components,/PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1=\.018/);
  assert.match(components,/const pageFrame=this\.pdfMasterplanPageFrameV1\(sourceWidth,sourceDepth\)/);
  assert.match(components,/frame:'full PDF page with DWG-aligned site window'/);
  assert.match(components,/this\.syncAdminPdfMasterplanUnderlayV1\(\);/);
  assert.match(components,/this\.dataset\.adminPdfUnderlayPlacement='none · cena quadrada · modelo centralizado · textura única'/);
  assert.match(components,/this\.dataset\.adminPdfTextureMode='source image única · materiais dos objetos GLB'/);
  assert.match(components,/this\.dataset\.adminPdfTextureVerticalShift=String\(PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1\)/);
  assert.match(components,/const imageV=pageFrame\.siteCenterV\+\(point\.z\/Math\.max\(\.01,sourceDepth\)\)\*pageFrame\.siteDepth\+PDF_MASTERPLAN_TEXTURE_SHIFT_UP_V1/);
  assert.match(components,/const v=pageFrame\.siteCenterV\+\(center\.z\/Math\.max\(\.01,sourceDepth\)\)\*pageFrame\.siteDepth/);
  assert.match(components,/not rendered · source image bound to GLB semantic meshes/);
  assert.match(components,/if\(group\)\{group\.removeFromParent\?\.\(\);/);
  assert.match(components,/this\.dataset\.adminPdfDocumentTreatment='full page · photograph removed only'/);
  assert.ok(fs.existsSync(path.join(root,'assets/public/alianca-park-masterplan-static-v535-no-photo.webp')));
  assert.match(components,/texture\.wrapS=THREE\.ClampToEdgeWrapping;texture\.wrapT=THREE\.ClampToEdgeWrapping/);
  assert.match(components,/texture\.repeat\.set\(1,ADMIN_PDF_DISPLAY_TEXTURE_V_FLIP\?-1:1\)/);
  assert.match(components,/texture\.offset\.set\(0,ADMIN_PDF_DISPLAY_TEXTURE_V_FLIP\?1:0\)/);
  assert.match(components,/textureFrame:'full image · UV 0\.\.1'/);
  assert.match(components,/full page · UV 0\.\.1 · \$\{ADMIN_PDF_DISPLAY_TEXTURE_V_FLIP\?'eixo V corrigido':'sem inversão V'\} · sem crop/);
  assert.doesNotMatch(components,/const plane=new THREE\.Mesh\(geometry,material\)/);
});

test('elementos visíveis da prancha recebem camada 3D texturizada sem rasterizar o GLB',()=>{
  const components=read('components.js');
  assert.match(components,/PDF_MASTERPLAN_3D_LAYER_VERSION='pdf-derived-elements-v1'/);
  assert.match(components,/BelavistaPdfMasterplan3DExtrusions/);
  assert.match(components,/classifyPdfElementKindV1/);
  assert.match(components,/pdfLotNumberV1/);
  assert.match(components,/findPdfLotIntegrationV1/);
  assert.match(components,/pdfElementImageAnchorV1/);
  assert.match(components,/projectPdfElementGeometryV1/);
  assert.match(components,/native semantic GLB mesh projected to the PDF page/);
  assert.match(components,/semantic GLB elements identified first · full PDF page used as faithful texture/);
  assert.match(components,/full page · projected UV 0\.\.1/);
  assert.match(components,/BelavistaPdfVehicleExtrusions/);
  assert.match(components,/pdfElementKind:'vehicle'/);
  assert.match(components,/adminPdf3dElements=`lotes:\$\{counts\.lot\}\|ruas:\$\{counts\.street\}\|arvores:\$\{counts\.tree\}/);
  assert.match(components,/node\.visible=true/);
  assert.match(components,/materialForKind=kind=>/);
  assert.match(components,/this\.createPdfVehicleExtrusionsV1\(THREE,group,texture\.image,sourceWidth,sourceDepth,pageFrame\)/);
  assert.match(components,/pdfLotIntegrationKey=`lot:\$\{lotNumber\}`/);
  assert.match(components,/pdfImageNumber:`Lote \$\{lotNumber\}`/);
  assert.match(components,/imageAnchorField:'pdfImageAnchor'/);
  assert.match(components,/this\.dataset\.adminPdfLotIntegration='lotNumber \+ pdfLotIntegrationKey \+ pdfImageAnchor'/);
  assert.match(components,/pdf-lot-integration-ready/);
  assert.match(components,/adminPdf3dTexturePolicy='full PDF page · projected per semantic element · no color-only inference'/);
  assert.match(components,/metadata-only · source GLB visible/);
  assert.match(components,/group\.traverse\(node=>\{if\(node\.isMesh\)node\.visible=false;\}\)/);
  assert.match(components,/PDF_MODEL_TEXTURE_BRIGHTNESS=1\.35/);
  assert.match(components,/transparent:false,\s*opacity:1,\s*alphaTest:0/);
  assert.match(components,/bindPdfMapTextureToMasterplanV1/);
  assert.match(components,/adminPdfModelTexture='bound to source GLB semantic meshes'/);
  assert.match(components,/sourceModelTextureBinding:sourceModelTextureCount/);
  assert.doesNotMatch(components,/buildPdfRasterExtrusionModelV1/);
  assert.match(components,/publicRoadPolicy='pdf-derived-3d-elements'/);
  assert.match(components,/!pdf3d/);
  assert.match(components,/elements\.matrix\.copy\(model\.matrix\)/);
});

test('mapa administrativo e modelo 3D usam giro fixo de 180 graus no eixo Y',()=>{
  const components=read('components.js');
  assert.match(components,/const MODEL_EXTRA_Y_ROTATION_DEG=180/);
  assert.match(components,/const MODEL_EXTRA_Y_ROTATION_RAD=\s*MODEL_EXTRA_Y_ROTATION_DEG\*Math\.PI\/180/);
  assert.match(components,/const ADMIN_FIXED_MAP_ROTATION_DEG=180/);
  assert.match(components,/const ADMIN_PDF_DISPLAY_Y_ROTATION_DEG=180/);
  assert.match(components,/const ADMIN_PDF_DISPLAY_Y_ROTATION_RAD=\s*ADMIN_PDF_DISPLAY_Y_ROTATION_DEG\*Math\.PI\/180/);
  assert.match(components,/makeRotationY\(extraRotationRad\)/);
  assert.match(components,/const extraRotationRad=this\.hasAttribute\('data-admin-shared-public-map'\)/);
  assert.match(components,/adminPdfDisplay=this\.hasAttribute\('data-admin-shared-public-map'\)/);
  assert.match(components,/adminPdfDisplay\s*\?ADMIN_PDF_DISPLAY_Y_ROTATION_RAD\s*:MODEL_EXTRA_Y_ROTATION_RAD/);
  assert.match(components,/wrapper\.rotation\.set\(Math\.PI\/2,MODEL_EXTRA_Y_ROTATION_RAD,0\)/);
   assert.match(components,/const ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP=1/);
   assert.match(components,/const horizontalFlip=adminPdfDisplay\s*\?ADMIN_PDF_DISPLAY_HORIZONTAL_FLIP\s*:PUBLIC_MODEL_HORIZONTAL_FLIP/);
  assert.match(components,/this\.dataset\.publicModelOrientation=adminPdfDisplay/);
  assert.match(components,/dwg-affine\|source-xz-frame\|flipX-1\|y\+\$\{extraRotationDeg\}deg\|north=loading-reference/);
  assert.match(components,/similaridade 2D: translação \+ rotação \+ uma única/);
  assert.match(components,/publicModelScalePolicy='similarity-2d · escala horizontal uniforme · proporção do PDF preservada'/);
  assert.match(components,/const horizontalScale=publicGeoFrame\s*\?\(adminPdfDisplay\?localFrameScale:Math\.sqrt\(Math\.max\(\.0001,Math\.abs\(publicScaleX\*publicScaleZ\)\)\)\)/);
  assert.match(components,/this\._adminPdfSourceFrameScale=localFrameScale/);
  assert.match(components,/pdf-local-frame · escala uniforme X\/Z · proporção da prancha preservada/);
   assert.match(components,/const horizontalScale=Math\.hypot\(cosScale,sinScale\)/);
   assert.doesNotMatch(components,/const solveAxis=key=>/);
   assert.match(components,/publicModelGeoFitScale=`similarity \$\{publicAffine\.horizontalScale\.toFixed\(3\)\}/);
  assert.match(components,/extraRotationYDeg:extraRotationDeg/);
  assert.match(components,/publicAffine\.orientation\.extraRotationYDeg===0/);
  assert.match(components,/orientação do loading/);
  assert.match(components,/elements\.matrix\.copy\(model\.matrix\)/);
  const styles=read('styles.css');
  assert.match(styles,/map-3d-loading-backdrop-page\{[^}]*transform:none/);
});

test('dashboard usa o frame X/Z do GLB sem inverter a implantação georreferenciada',()=>{
  const components=read('components.js');
  assert.match(components,/const orientationMatrix=adminPdfDisplay\s*\?new THREE\.Matrix4\(\)/);
  assert.match(components,/const sourcePlaneY=adminPdfDisplay\s*\?\s*Number\(orientedLocal\.z\)\s*:\s*-Number\(orientedLocal\.z\)/);
  assert.match(components,/source-xz-frame\|flipX-1\|y\+\$\{extraRotationDeg\}deg\|north=loading-reference/);
  assert.match(components,/O export do GLB usa X\/Z como plano da implantação/);
});
