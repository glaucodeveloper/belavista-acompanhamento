"""Render GLB asphalt onto the aerial for visual proportion diagnosis."""
import json
import struct
import sys
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
RAW = (ROOT / "assets/model/alianca_park_masterplan_preview.glb").read_bytes()
JSON_LENGTH = struct.unpack_from("<I", RAW, 12)[0]
DOC = json.loads(RAW[20:20 + JSON_LENGTH])
BIN_START = 20 + JSON_LENGTH + 8
GEO = json.loads((ROOT / "assets/data/dwg-georeference.json").read_text(encoding="utf-8"))
PHOTO = cv2.imread(str(ROOT / "assets/public/alianca-park-aerial-reference-expanded-v1.png"))
H, W = PHOTO.shape[:2]
MATRIX = np.asarray(GEO["alignment"]["glbToDwgMatrix"], dtype=np.float64)
TRANSLATION = np.asarray(GEO["alignment"]["translation"], dtype=np.float64)
HOMOGRAPHY = np.array([
    [-2.94306335e-7, -6.87434193e-8, 7.15685809e-1],
    [3.56353169e-11, 3.82122918e-7, -3.27219102],
    [7.83358933e-8, -1.2079129e-7, 1],
], dtype=np.float64)


def accessor_array(index):
    accessor = DOC["accessors"][index]
    view = DOC["bufferViews"][accessor["bufferView"]]
    offset = BIN_START + view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    dtype = {5126: "<f4", 5125: "<u4", 5123: "<u2"}[accessor["componentType"]]
    width = {"SCALAR": 1, "VEC3": 3}[accessor["type"]]
    return np.frombuffer(RAW, dtype=dtype, count=accessor["count"] * width, offset=offset).reshape(-1, width)


node = next(node for node in DOC["nodes"] if node.get("name") == "Asfalto_tracado_do_PDF")
primitive = DOC["meshes"][node["mesh"]]["primitives"][0]
vertices = accessor_array(primitive["attributes"]["POSITION"])
indices = accessor_array(primitive["indices"]).reshape(-1, 3)
utm = np.column_stack((vertices[:, 0], -vertices[:, 2])) @ MATRIX.T + TRANSLATION
hom = np.column_stack((utm, np.ones(len(utm)))) @ HOMOGRAPHY.T
pixels = np.round((hom[:, :2] / hom[:, 2:3]) * [W, H]).astype(np.int32)
leisure_node = next(node for node in DOC["nodes"] if node.get("name") == "Area_de_lazer_base")
leisure_primitive = DOC["meshes"][leisure_node["mesh"]]["primitives"][0]
leisure_vertices = accessor_array(leisure_primitive["attributes"]["POSITION"])
leisure_utm = np.column_stack((leisure_vertices[:, 0], -leisure_vertices[:, 2])) @ MATRIX.T + TRANSLATION
leisure_hom = np.column_stack((leisure_utm, np.ones(len(leisure_utm)))) @ HOMOGRAPHY.T
leisure_pixels = (leisure_hom[:, :2] / leisure_hom[:, 2:3]) * [W, H]
# The original GLB leisure plate projects too far into adjacent lots. Trace
# the visible recreation block on the aerial instead of using that plate.
leisure_mask = np.zeros((H, W), np.uint8)
cv2.fillPoly(leisure_mask, [np.array([[688, 370], [754, 341], [809, 390], [751, 448], [678, 419]], np.int32)], 255)
print("leisure_bounds", np.min(leisure_pixels, axis=0).round(1).tolist(), np.max(leisure_pixels, axis=0).round(1).tolist())
triangles = pixels[indices]
mask = np.zeros((H, W), np.uint8)
cv2.fillPoly(mask, triangles, 255)
outline = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
rgb = cv2.cvtColor(PHOTO, cv2.COLOR_BGR2RGB)
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
road_color = ((hsv[:, :, 1] < 58) & (gray > 68) & (gray < 225)).astype(np.uint8) * 255
road_color = cv2.morphologyEx(road_color, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
corridor = cv2.dilate(mask, np.ones((31, 31), np.uint8))
road_color = cv2.bitwise_and(road_color, corridor)
yy, xx = np.indices((H, W))
road_color[yy > .57 * xx + 320] = 0
# The raster has cars, tree shadows and curb texture. Close short gaps without
# changing the long straight road axes, then remove one-pixel branches.
road_color = cv2.morphologyEx(road_color, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
road_color = cv2.morphologyEx(road_color, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
# The brochure's leisure court is not asphalt. Preserve the entrance road at
# its edge by excluding only the interior of the PDF-derived leisure footprint.
leisure_interior = cv2.erode(leisure_mask, np.ones((9, 9), np.uint8))
road_color[leisure_interior != 0] = 0
component_count, components, stats, _ = cv2.connectedComponentsWithStats(road_color)
for label in range(1, component_count):
    if stats[label, cv2.CC_STAT_AREA] < 80:
        road_color[components == label] = 0

# A máscara verde aprovada é a base exata. Apenas as duas retas indicadas
# recebem preenchimento adicional onde as fileiras de objetos interrompem o
# cinza da pista; nenhuma suavização muda os demais contornos.
UV_CELL_SIZE = 2
mask_for_uv = road_color.copy()
# Eixo longo central: a fotografia contém árvores e sombras no meio da via.
# As quatro quinas seguem as duas bordas de asfalto, sem recortes internos.
MANUAL_STRAIGHT_ROADS = [
    [[780, 230], [1007, 427], [1007, 452], [780, 255]],
]
straight_road_raster = np.zeros_like(mask_for_uv)
for segment in MANUAL_STRAIGHT_ROADS:
    cv2.fillPoly(straight_road_raster, [np.asarray(segment, np.int32)], 255)
mask_for_uv[straight_road_raster != 0] = 255
# Junção ao lado da rotatória: duas retas oblíquas acompanham as guias
# visíveis, fechando a cunha entre o acesso oeste e a via central.
MANUAL_INTERSECTION_PATCHES = [
    [[739, 218], [751, 216], [778, 237], [778, 248], [765, 245]],
    [[737, 225], [747, 224], [765, 238], [761, 246], [749, 236]],
]
intersection_raster = np.zeros_like(mask_for_uv)
for patch in MANUAL_INTERSECTION_PATCHES:
    cv2.fillPoly(intersection_raster, [np.asarray(patch, np.int32)], 255)
mask_for_uv[intersection_raster != 0] = 255
# A rua central superior tem falhas menores entre suas duas bordas brancas.
# Uma linha interna estreita fecha essas lacunas sem avançar sobre os lotes.
upper_street_raster = np.zeros_like(mask_for_uv)
cv2.line(upper_street_raster, (818, 193), (1055, 388), 255, thickness=7)
mask_for_uv[upper_street_raster != 0] = 255
# Via perimetral direita: uma única faixa contínua. Os vértices percorrem
# primeiro a borda interna (lotes) e voltam pela borda externa da pista.
MANUAL_RIGHT_STREET = [
    [1121, 348], [1077, 380], [1030, 414], [984, 447],
    [939, 480], [895, 513], [849, 547], [805, 580],
    [760, 614], [718, 644], [680, 672],
    [677, 697], [730, 660], [776, 626], [820, 592],
    [866, 558], [911, 524], [956, 490], [1000, 457],
    [1045, 425], [1090, 392], [1137, 360],
]
right_street_raster = np.zeros_like(mask_for_uv)
cv2.fillPoly(right_street_raster, [np.asarray(MANUAL_RIGHT_STREET, np.int32)], 255)
cv2.fillPoly(mask_for_uv, [np.asarray(MANUAL_RIGHT_STREET, np.int32)], 255)
# Lacunas pontuais marcadas sobre a prévia. Fecha apenas onde o verde já toca
# os dois lados do trecho, dentro de pequenas janelas; as demais ruas e os
# limites dos lotes não passam por um filtro global.
LOCAL_REPAIR_WINDOWS = [
    # O traçado da via central agora segue os dois meios-fios brancos.
    # Reparos morfológicos locais nessa faixa criavam dentes nos lotes.
]
local_repair_roi = np.zeros_like(mask_for_uv)
for x, y, rx, ry in LOCAL_REPAIR_WINDOWS:
    cv2.ellipse(local_repair_roi, (x, y), (rx, ry), 0, 0, 360, 255, -1)
before_local_repair = mask_for_uv.copy()
locally_closed = cv2.morphologyEx(
    mask_for_uv, cv2.MORPH_CLOSE,
    cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)),
)
# A janela sozinha alcançava lotes e meio-fios. O reparo pode atravessar uma
# falha interna, mas não criar uma nova borda distante do asfalto existente.
near_existing_asphalt = cv2.dilate(
    before_local_repair, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
)
local_repair_mask = cv2.bitwise_and(locally_closed, local_repair_roi)
local_repair_mask = cv2.bitwise_and(local_repair_mask, near_existing_asphalt)
mask_for_uv[local_repair_mask != 0] = 255
local_repair_additions = (mask_for_uv != 0) & (before_local_repair == 0)
mask_for_uv[leisure_interior != 0] = 0
# Medidas dos meios-fios na fotografia sem destaque: x=820 -> y=265/290,
# x=900 -> y=333/358 e x=980 -> y=404/430. A classificação por cor e a
# antiga face tinham outra inclinação; ambas são cortadas por essas guias.
central_curb_top = .87 * xx - 449
central_curb_bottom = central_curb_top + 25
central_curb_zone = (
    (xx >= 800) & (xx <= 985)
    & (yy >= central_curb_top - 9) & (yy <= central_curb_bottom + 10)
)
central_curb_excess = central_curb_zone & (
    (yy <= central_curb_top) | (yy >= central_curb_bottom)
)
central_curb_clipped_pixels = int(np.sum((mask_for_uv != 0) & central_curb_excess))
mask_for_uv[central_curb_excess] = 0
# Penúltima rua de cima: as duas guias brancas são retas paralelas na foto.
# Amostras visuais: x=900 -> y=247/262; x=1000 -> y=331/346.
# Recortar só o trecho entre cruzamentos evita levar asfalto sobre os lotes.
upper_street_curb_top = .84 * xx - 509
upper_street_curb_bottom = upper_street_curb_top + 15
upper_street_curb_zone = (
    (xx >= 850) & (xx <= 1045)
    & (yy >= upper_street_curb_top - 6)
    & (yy <= upper_street_curb_bottom + 8)
)
upper_street_curb_excess = upper_street_curb_zone & (
    (yy <= upper_street_curb_top) | (yy >= upper_street_curb_bottom)
)
upper_street_clipped_pixels = int(np.sum((mask_for_uv != 0) & upper_street_curb_excess))
mask_for_uv[upper_street_curb_excess] = 0
added_pixels = (mask_for_uv != 0) & (road_color == 0)
allowed_pixels = (
    (straight_road_raster != 0) | (right_street_raster != 0)
    | (upper_street_raster != 0) | (local_repair_mask != 0)
    | (intersection_raster != 0)
)
if np.any(added_pixels & ~allowed_pixels):
    raise RuntimeError("O preenchimento alterou ruas fora das duas retas solicitadas.")
straight_expected = (straight_road_raster != 0) & ~central_curb_excess
if np.any(mask_for_uv[straight_expected] == 0) or np.any(
    mask_for_uv[right_street_raster != 0] == 0
):
    raise RuntimeError("Uma fileira de objetos reabriu uma falha no asfalto.")
right_component_count, _ = cv2.connectedComponents(right_street_raster)
if right_component_count != 2:
    raise RuntimeError("A rua direita deve permanecer um único segmento contínuo.")

def encode_uv_mask(mask, cell_size):
    height, width = mask.shape[:2]
    grid_width = (width + cell_size - 1) // cell_size
    grid_height = (height + cell_size - 1) // cell_size
    rows = []
    for grid_y in range(grid_height):
        y0 = grid_y * cell_size
        y1 = min(height, y0 + cell_size)
        row = []
        active = None
        for grid_x in range(grid_width):
            x0 = grid_x * cell_size
            x1 = min(width, x0 + cell_size)
            occupied = bool(np.any(mask[y0:y1, x0:x1] != 0))
            if occupied and active is None:
                active = grid_x
            if not occupied and active is not None:
                row.append([active, grid_x])
                active = None
        if active is not None:
            row.append([active, grid_width])
        rows.append(row)
    return {
        "version": 1,
        "cellSize": cell_size,
        "imageSize": [int(width), int(height)],
        "gridSize": [int(grid_width), int(grid_height)],
        "rows": rows,
        "policy": "máscara verde original; apenas as duas fileiras de objetos cobertas; quadras preservadas",
    }
if "--preview" in sys.argv:
    if "--grid" in sys.argv:
        grid_preview = PHOTO.copy()
        for x in range(0, W, 50):
            cv2.line(grid_preview, (x, 0), (x, H - 1), (225, 225, 225), 1)
            cv2.putText(grid_preview, str(x), (x + 2, 18), cv2.FONT_HERSHEY_SIMPLEX, .42, (255, 255, 255), 1)
        for y in range(0, H, 50):
            cv2.line(grid_preview, (0, y), (W - 1, y), (225, 225, 225), 1)
            cv2.putText(grid_preview, str(y), (3, y + 15), cv2.FONT_HERSHEY_SIMPLEX, .42, (255, 255, 255), 1)
        cv2.imwrite(str(ROOT / "assets/data/aerial-road-coordinate-grid.png"), grid_preview)
    road_preview = PHOTO.copy()
    road_preview[mask != 0] = (40, 40, 240)
    road_preview[road_color != 0] = (40, 240, 40)
    road_preview[leisure_interior != 0] = (230, 60, 230)
    cv2.imwrite(str(ROOT / "assets/data/aerial-road-color-preview.png"), road_preview)
    green_filled_preview = PHOTO.copy()
    green_filled_preview[mask_for_uv != 0] = (40, 240, 40)
    green_filled_preview[leisure_interior != 0] = (230, 60, 230)
    cv2.imwrite(str(ROOT / "assets/data/aerial-road-green-filled-preview.png"), green_filled_preview)
    repair_preview = PHOTO.copy()
    repair_preview[road_color != 0] = (40, 240, 40)
    repair_preview[added_pixels] = (230, 140, 30)
    repair_preview[(upper_street_raster != 0) & (road_color == 0)] = (0, 215, 245)
    repair_preview[local_repair_additions] = (190, 30, 230)
    repair_preview[(intersection_raster != 0) & (road_color == 0)] = (0, 165, 255)
    repair_preview[leisure_interior != 0] = (230, 60, 230)
    cv2.imwrite(str(ROOT / "assets/data/aerial-road-two-repairs-preview.png"), repair_preview)
    uv_preview = PHOTO.copy()
    uv_preview[mask_for_uv != 0] = cv2.addWeighted(
        PHOTO[mask_for_uv != 0], .35,
        np.full_like(PHOTO[mask_for_uv != 0], (255, 150, 25)), .65, 0,
    )
    uv_preview[leisure_interior != 0] = (230, 60, 230)
    cv2.imwrite(str(ROOT / "assets/data/aerial-road-uv-mask-preview.png"), uv_preview)
    asphalt_preview = PHOTO.copy()
    asphalt_preview[mask_for_uv != 0] = (61, 58, 54)
    cv2.imwrite(str(ROOT / "assets/data/aerial-road-opaque-preview.png"), asphalt_preview)
    right_preview = asphalt_preview.copy()
    right_preview[right_street_raster != 0] = (190, 100, 35)
    cv2.imwrite(str(ROOT / "assets/data/aerial-road-right-segment-preview.png"), right_preview)
    overlay = PHOTO.copy()
    overlay[mask != 0] = cv2.addWeighted(PHOTO, .55, np.full_like(PHOTO, (235, 65, 0)), .45, 0)[mask != 0]
    overlay[outline != 0] = (0, 0, 255)
    cv2.imwrite(str(ROOT / "assets/data/aerial-road-proportion-preview.png"), overlay)
    cv2.imwrite(str(ROOT / "assets/data/aerial-leisure-crop-preview.png"), PHOTO[300:540, 600:940])
print("road_vertices", len(vertices), "road_triangles", len(triangles), "mask_pixels", int(np.sum(mask != 0)))
print("road_photo_pixels", int(np.sum(road_color != 0)), "overlap", int(np.sum((road_color != 0) & (mask != 0))))
print("new_asphalt_pixels", int(np.sum(added_pixels)), "local_repairs", int(np.sum(local_repair_additions)), "central_curb_clipped", central_curb_clipped_pixels, "upper_street_curb_clipped", upper_street_clipped_pixels)
contours, hierarchy = cv2.findContours(mask_for_uv, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
print("road_contours", len(contours), "outer", sum(1 for item in hierarchy[0] if item[3] < 0) if hierarchy is not None else 0)
if "--preview" in sys.argv and hierarchy is not None:
    print("road_holes", [
        (round(cv2.contourArea(contour)), cv2.boundingRect(contour))
        for index, contour in enumerate(contours) if hierarchy[0][index][3] >= 0
    ])
roads = []
if hierarchy is not None:
    contour_info = hierarchy[0]
    for index, contour in enumerate(contours):
        if contour_info[index][3] >= 0 or cv2.contourArea(contour) < 80:
            continue
        outer = cv2.approxPolyDP(contour, 2.8, True)[:, 0, :].tolist()
        holes = []
        child = contour_info[index][2]
        while child >= 0:
            if cv2.contourArea(contours[child]) >= 80:
                holes.append(cv2.approxPolyDP(contours[child], 2.8, True)[:, 0, :].tolist())
            child = contour_info[child][0]
        if len(outer) >= 3:
            roads.append({"outer": outer, "holes": holes})
result_path = ROOT / "assets/data/aerial-road-trace-v1.json"
uv_mask = encode_uv_mask(mask_for_uv, UV_CELL_SIZE)
right_uv_mask = encode_uv_mask(right_street_raster, UV_CELL_SIZE)
# Os contornos são extraídos da mesma máscara verde, acrescida das duas retas.
result_path.write_text(json.dumps({
    "version": 16,
    "source": "alianca-park-aerial-reference-expanded-v1.png",
    "reference": "alianca-park-masterplan-static-v535-no-photo.webp",
    "imageSize": [W, H],
    "method": "original aerial road mask clipped to photographed white curbs on central and upper streets; perimeter unchanged",
    "manualTrace": {
        "straightRoads": MANUAL_STRAIGHT_ROADS,
        "centralStreetWhiteCurbs": {"topY": "0.87*x-449", "bottomOffsetPixels": 25, "clipX": [800, 985]},
        "angledIntersectionFaces": MANUAL_INTERSECTION_PATCHES,
        "upperStreetCenterline": [[818, 193], [1055, 388]],
        "upperStreetWhiteCurbs": {"topY": "0.84*x-509", "bottomOffsetPixels": 15, "clipX": [850, 1045]},
        "localGapWindows": LOCAL_REPAIR_WINDOWS,
        "rightStreet": MANUAL_RIGHT_STREET,
        "vegetationAndMedianObjectsIgnored": True,
    },
    "uvMask": uv_mask,
    "rightStreetUvMask": right_uv_mask,
    "roads": roads,
}, separators=(",", ":")), encoding="utf-8")
print("road_shapes", len(roads), "vertices", sum(len(road["outer"]) + sum(len(hole) for hole in road["holes"]) for road in roads))
print("uv_mask", uv_mask["gridSize"], "uv_spans", sum(len(row) for row in uv_mask["rows"]))
