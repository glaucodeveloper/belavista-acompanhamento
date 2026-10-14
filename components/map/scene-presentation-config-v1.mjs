/** Map-scene presentation, camera, and calibration defaults. */
export const createScenePresentationConfigV1 = ({ search = globalThis.location?.search || "" } = {}) => {
const DEFAULT_SCENE_ZOOM = 1.12,
  INITIAL_SCENE_ZOOM = 1.68,
  MIN_SCENE_ZOOM = 0.16,
  MAX_SCENE_ZOOM = 20,
  MIN_SCENE_TILT = 0,
  MAX_SCENE_TILT = 72,
  SCENE_TILT_ADJUST_LIMIT = 72,
  SCENE_TILT_ZOOM_OUT_FACTOR = 1,
  TILT_DRAG_SENSITIVITY = 0.18,
  ZOOM_DRAG_SENSITIVITY = 0.012,
  DEFAULT_TILT_BOOST = 52,
  DASHBOARD_TILT_BOOST = 22,
  SCENE_SURFACE_SCALE = 2.7,
  PUBLIC_SATELLITE_VERTICAL_COVERAGE = 1.42,
  MODEL_FIT_RATIO = 1.32,
  MODEL_PUBLIC_FIT_RATIO = 1.1,
  MODEL_VERTICAL_EXAGGERATION = 1.33335,
  PUBLIC_SOCIAL_GREEN_LIFT_V1 = 0.14,
  SCENE_MAP_Z = 0,
  SCENE_MODEL_BASE_Z = 0,
  SCENE_VIEWPORT_COVERAGE = 2.5,
  SCENE_PAN_SAFETY = 1.18,
  SCENE_PUBLIC_PAN_SAFETY = 1.02,
  ADMIN_GEO_MODEL_FINE_ROTATION_DEG = 0,
  ADMIN_GEO_MODEL_FINE_SHIFT_X = 0,
  ADMIN_GEO_MODEL_FINE_SHIFT_Y = 0,
  DASHBOARD_PAN_SAFETY = 0.82,
  MAP_TILE_OVERSCAN = 1,
  MAP_RASTER_MAX = 1536,
  MAP_SCENE_STATE_VERSION = 10,
  STAGE_FILTER_TRANSITION_MS = 520;
const MAP_CAMERA_VIEW = "map";
const sceneTiltBoostForView = (view) =>
  view === "assistant" ? DASHBOARD_TILT_BOOST : DEFAULT_TILT_BOOST;
const DASHBOARD_INITIAL_SCENE_ZOOM = 0.28;
const ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM = 0.62;
const ADMIN_REFERENCE_AERIAL_VIEW_VERSION = 4;
const DASHBOARD_PAN_BOUNDING_SCREEN_RATIO = 0.5;
// Raster satelital tratado a partir do mosaico real centrado pelo DWG. Ele
// preserva ruas, vegetação e construções observadas; não é uma cartografia
// gerada nem deve ser substituído pela antiga placa aérea sintética.
const GENERATED_AERIAL_ASSET = "/assets/public/dwg-satellite-treated-v5411.png";
const GENERATED_AERIAL_VERSION = "dwg-satellite-treated-v5411";
// O raster foi capturado em 9×9 tiles no z18, a partir do mesmo centro GPS
// usado pelo DWG. Esses índices permitem projetá-lo no canvas pelos limites
// dos tiles, em vez de apenas centralizar uma imagem e perder o alinhamento
// das ruas de guia.
const DWG_SATELLITE_MOSAIC_ZOOM = 18;
const DWG_SATELLITE_MOSAIC_TILE_SIZE = 256;
const DWG_SATELLITE_MOSAIC_TILE_X0 = 102215;
const DWG_SATELLITE_MOSAIC_TILE_Y0 = 140616;
const DWG_SATELLITE_MOSAIC_TILES = 9;
// Correção horizontal extraída da matriz afim do DWG, em vez de um giro
// arbitrário. Ela acompanha o frame do GLB antes da perspectiva da câmera.
const DWG_PLAN_HEADING_RAD = Math.atan2(0.000266519504, 0.974619493957);
const DWG_PLAN_HEADING_DEG = (DWG_PLAN_HEADING_RAD * 180) / Math.PI;
// A saída da rua superior é a referência norte da apresentação pública. O
// GLB exportado está invertido no eixo X em relação a essa leitura; por isso
// a transformação pública aplica primeiro um giro anti-horário de 90° no
// plano horizontal e depois o espelhamento horizontal. A imagem de satélite
// permanece sem transformação: somente a implantação 3D é reorientada.

const PUBLIC_MODEL_NORTH_ROTATION_DEG = -90;
const PUBLIC_MODEL_NORTH_ROTATION_RAD =
  (PUBLIC_MODEL_NORTH_ROTATION_DEG * Math.PI) / 180;

// Reorientação legada solicitada para a implantação 3D pública: meia volta no
// eixo Y, preservando o frame horizontal dos elementos extrudados. O dashboard
// administrativo escolhe explicitamente o frame do loading logo abaixo.
const MODEL_EXTRA_Y_ROTATION_DEG = 180;
const MODEL_EXTRA_Y_ROTATION_RAD = (MODEL_EXTRA_Y_ROTATION_DEG * Math.PI) / 180;

// O mapa administrativo usa uma orientação canônica, sempre oposta ao frame
// inicial do loading. O mesmo giro é usado no encaixe do GLB para que a planta
// e a camada 3D continuem no mesmo referencial visual.
const ADMIN_FIXED_MAP_ROTATION_DEG = 180;
const ADMIN_FIXED_MAP_ROTATION_RAD =
  (ADMIN_FIXED_MAP_ROTATION_DEG * Math.PI) / 180;
const ADMIN_PDF_DISPLAY_Y_ROTATION_DEG = 0;
const ADMIN_PDF_DISPLAY_Y_ROTATION_RAD =
  (ADMIN_PDF_DISPLAY_Y_ROTATION_DEG * Math.PI) / 180;
// Parâmetros opcionais para calibração manual do GLB no dashboard. Eles são
// lidos da URL para permitir pequenos testes sem alterar a orientação fixa do
// mapa nem a fotografia de fundo:
//   modelRotate   = giro no plano do mapa (eixo vertical da cena, em graus)
//   modelRotateX/Y/Z = giros 3D adicionais, em graus
//   modelShiftX/Y/Z = deslocamento no espaço da cena
//   modelScale     = escala uniforme adicional
// Ex.: ?view=map&modelRotate=2&modelShiftX=-4&modelShiftY=3
// Edição permanente: altere somente este bloco para definir o padrão do
// modelo. A rotação no plano do mapa é `rotation.z`.
const ADMIN_MODEL_CALIBRATION_DEFAULTS_V1 = {
  // A orientação georreferenciada já resolve o giro do GLB em relação ao
  // raster. Um giro padrão adicional desloca toda a implantação no mapa.
  rotation: { x: 0, y: 0, z: 0 },
  shift: { x: 0, y: 0, z: 0 },
  scale: 1,
};
const readAdminModelCalibrationV1 = ({ search } = {}) => {
  let params = null;
  try {
    params = new URLSearchParams(search ?? globalThis.location?.search ?? "");
  } catch {}
  const number = (names, fallback = 0) => {
    for (const name of names) {
      const raw = params?.get(name);
      if (raw == null || raw.trim() === "") continue;
      const value = Number(raw);
      if (Number.isFinite(value)) return value;
    }
    return fallback;
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return {
    rotation: {
      // modelRotate is the ergonomic alias for the ground-plane rotation.
      x: clamp(
        number(
          ["modelRotateX"],
          ADMIN_MODEL_CALIBRATION_DEFAULTS_V1.rotation.x,
        ),
        -45,
        45,
      ),
      y: clamp(
        number(
          ["modelRotateY"],
          ADMIN_MODEL_CALIBRATION_DEFAULTS_V1.rotation.y,
        ),
        -45,
        45,
      ),
      z: clamp(
        number(
          ["modelRotate", "modelRotateZ"],
          ADMIN_MODEL_CALIBRATION_DEFAULTS_V1.rotation.z,
        ),
        -180,
        180,
      ),
    },
    shift: {
      x: clamp(
        number(["modelShiftX"], ADMIN_MODEL_CALIBRATION_DEFAULTS_V1.shift.x),
        -500,
        500,
      ),
      y: clamp(
        number(["modelShiftY"], ADMIN_MODEL_CALIBRATION_DEFAULTS_V1.shift.y),
        -500,
        500,
      ),
      z: clamp(
        number(["modelShiftZ"], ADMIN_MODEL_CALIBRATION_DEFAULTS_V1.shift.z),
        -100,
        100,
      ),
    },
    scale: clamp(
      number(["modelScale"], ADMIN_MODEL_CALIBRATION_DEFAULTS_V1.scale),
      0.5,
      1.5,
    ),
  };
};
const ADMIN_MODEL_CALIBRATION_V1 = readAdminModelCalibrationV1({ search });
const ADMIN_MODEL_CALIBRATION_INITIAL_V1 = {
  rotation: { ...ADMIN_MODEL_CALIBRATION_V1.rotation },
  shift: { ...ADMIN_MODEL_CALIBRATION_V1.shift },
  scale: ADMIN_MODEL_CALIBRATION_V1.scale,
};
// A rodovia que atravessa a faixa inferior da fotografia é a âncora visual do
// renderer administrativo. O GLB deve acompanhar essa linha, sem permanecer
// artificialmente abaixo dela por causa do ajuste de perspectiva anterior.
// A borda viária inferior da referência é a âncora angular do encaixe. A
// redução de 4° evita que o erro acumulado empurre as quadras superiores para
// a direita enquanto a rua de baixo parece alinhada.
const ADMIN_STANDALONE_MODEL_TURN_DEG_V1 = 168;
// Âncora visual: a rua inferior do GLB deve coincidir com a rodovia inferior
// da fotografia. O deslocamento atua somente no modelo, mantendo o terreno
// texturizado fixo na coordenada da imagem.
const ADMIN_STANDALONE_MODEL_STREET_DROP_V1 = 0;
const ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1 = { x: -0.03, y: 0 };
const ADMIN_STANDALONE_BASE_TILT_DEG_V1 = 37;

// V10 — acoplamento desinclinação -> zoom-out.
// O zoom acompanha proporcionalmente a redução da inclinação enquanto o
// controle estiver acima de 15% da inclinação máxima possível.
// Abaixo desse piso, reduzir ainda mais a inclinação NÃO retira mais zoom.
// O cover-lock V9 continua sendo soberano: nunca permite fundo descoberto.
const ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10 = 0.15;
const ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10 =
  MAX_SCENE_TILT * ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10;

// V11 — atraso perceptível entre desinclinar e retirar zoom.
// No slider, o timer funciona como debounce: enquanto o usuário continua
// arrastando para reduzir a inclinação, o zoom espera. Ao pausar, inicia.
// Nos botões/animações, o zoom começa após este atraso e "segue atrás" do tilt.
const ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11 = 180;
const ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11 = 220;
const ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11 = 520;

// V12 — reserva de zoom-out.
// A desinclinação automática usa só 85% do zoom-out proporcional calculado.
// Os 15% restantes ficam disponíveis para o usuário continuar dando zoom-out
// manualmente depois que a animação automática terminar.
const ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12 = 0.15;
const ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12 =
  1 - ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12;

// Edição manual do GLB no renderer 3D do /admin.
// rotationDeg = rotação adicional em graus (x/y/z).
// translation = deslocamento no espaço do mapa; não move a imagem de fundo.
// scale = escala uniforme adicional antes do encaixe automático.
// Ajuste estes valores e recarregue /admin?view=map.
const ADMIN_STANDALONE_MODEL_ALIGNMENT_V1 = {
  // A semântica de lote/rua deve permanecer coplanar com o chão da foto.
  // Inclinação pertence somente à câmera; um giro Y aqui deformava o encaixe
  // vertical e fazia a planta coincidir apenas em uma faixa da imagem.
  rotationDeg: { x: 0, y: 0, z: 0 },
  // O encaixe agora é resolvido pela janela semântica da própria imagem; não
  // manter um deslocamento manual que separe o GLB do seu plano UV comum.
  translation: { x: 0, y: 0, z: 0 },
  // O encaixe do novo modelo é determinado pela homografia da imagem, sem
  // multiplicadores manuais de escala no modelo semântico anterior.
  scaleXY: { x: 1, y: 1 },
  scale: 1,
};

  return Object.freeze({ DEFAULT_SCENE_ZOOM, INITIAL_SCENE_ZOOM, MIN_SCENE_ZOOM, MAX_SCENE_ZOOM, MIN_SCENE_TILT, MAX_SCENE_TILT, SCENE_TILT_ADJUST_LIMIT, SCENE_TILT_ZOOM_OUT_FACTOR, TILT_DRAG_SENSITIVITY, ZOOM_DRAG_SENSITIVITY, DEFAULT_TILT_BOOST, DASHBOARD_TILT_BOOST, SCENE_SURFACE_SCALE, PUBLIC_SATELLITE_VERTICAL_COVERAGE, MODEL_FIT_RATIO, MODEL_PUBLIC_FIT_RATIO, MODEL_VERTICAL_EXAGGERATION, PUBLIC_SOCIAL_GREEN_LIFT_V1, SCENE_MAP_Z, SCENE_MODEL_BASE_Z, SCENE_VIEWPORT_COVERAGE, SCENE_PAN_SAFETY, SCENE_PUBLIC_PAN_SAFETY, ADMIN_GEO_MODEL_FINE_ROTATION_DEG, ADMIN_GEO_MODEL_FINE_SHIFT_X, ADMIN_GEO_MODEL_FINE_SHIFT_Y, DASHBOARD_PAN_SAFETY, MAP_TILE_OVERSCAN, MAP_RASTER_MAX, MAP_SCENE_STATE_VERSION, STAGE_FILTER_TRANSITION_MS, MAP_CAMERA_VIEW, DASHBOARD_INITIAL_SCENE_ZOOM, ADMIN_REFERENCE_AERIAL_INITIAL_SCENE_ZOOM, ADMIN_REFERENCE_AERIAL_VIEW_VERSION, DASHBOARD_PAN_BOUNDING_SCREEN_RATIO, GENERATED_AERIAL_ASSET, GENERATED_AERIAL_VERSION, DWG_SATELLITE_MOSAIC_ZOOM, DWG_SATELLITE_MOSAIC_TILE_SIZE, DWG_SATELLITE_MOSAIC_TILE_X0, DWG_SATELLITE_MOSAIC_TILE_Y0, DWG_SATELLITE_MOSAIC_TILES, DWG_PLAN_HEADING_RAD, DWG_PLAN_HEADING_DEG, PUBLIC_MODEL_NORTH_ROTATION_DEG, PUBLIC_MODEL_NORTH_ROTATION_RAD, MODEL_EXTRA_Y_ROTATION_DEG, MODEL_EXTRA_Y_ROTATION_RAD, ADMIN_FIXED_MAP_ROTATION_DEG, ADMIN_FIXED_MAP_ROTATION_RAD, ADMIN_PDF_DISPLAY_Y_ROTATION_DEG, ADMIN_PDF_DISPLAY_Y_ROTATION_RAD, ADMIN_MODEL_CALIBRATION_DEFAULTS_V1, ADMIN_MODEL_CALIBRATION_V1, ADMIN_MODEL_CALIBRATION_INITIAL_V1, ADMIN_STANDALONE_MODEL_TURN_DEG_V1, ADMIN_STANDALONE_MODEL_STREET_DROP_V1, ADMIN_STANDALONE_MODEL_SCREEN_SHIFT_V1, ADMIN_STANDALONE_BASE_TILT_DEG_V1, ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_RATIO_V10, ADMIN_STANDALONE_DETILT_ZOOM_FLOOR_DEG_V10, ADMIN_STANDALONE_DETILT_ZOOM_DELAY_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_EASE_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_SESSION_GAP_MS_V11, ADMIN_STANDALONE_DETILT_ZOOM_OUT_RESERVE_RATIO_V12, ADMIN_STANDALONE_DETILT_ZOOM_OUT_AUTO_USAGE_V12, ADMIN_STANDALONE_MODEL_ALIGNMENT_V1, sceneTiltBoostForView, readAdminModelCalibrationV1 });
};
