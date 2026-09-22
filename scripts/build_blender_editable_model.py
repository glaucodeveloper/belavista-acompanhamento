"""Build the image-registered Aliança Park model for Blender editing.

Run with Blender 5.x:
  blender --background --python scripts/build_blender_editable_model.py

The visible model is reconstructed from the same aerial image and tracing
datasets used by the administrative 3D map. It contains one 298-lot set;
the source GLB is deliberately not duplicated into this editable scene.
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "assets" / "model"
ROAD_TRACE_PATH = ROOT / "assets" / "data" / "aerial-road-trace-v1.json"
LOT_TRACE_PATH = ROOT / "assets" / "data" / "aerial-lot-trace-v1.json"
AERIAL_PATH = ROOT / "assets" / "public" / "alianca-park-aerial-reference-expanded-v1.png"
OUTPUT_BLEND = MODEL_DIR / "alianca_park_editable_v1.blend"
OUTPUT_GLB = MODEL_DIR / "alianca_park_editable_v1.glb"
OUTPUT_PREVIEW = MODEL_DIR / "alianca_park_editable_preview_v1.png"

WORLD_HEIGHT_M = 320.0
LOT_EXTRUSION_M = 0.42
IMAGE_GROUND_Z = -0.03
ROAD_BASE_Z = 0.015
ROAD_SEGMENT_Z = 0.025
LOT_BASE_Z = 0.005
LOT_TOP_Z = LOT_BASE_Z + LOT_EXTRUSION_M


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as source:
        return json.load(source)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection != bpy.context.scene.collection:
            bpy.data.collections.remove(collection)


def add_collection(name: str, parent=None):
    collection = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(collection)
    return collection


def material(name: str, rgba, *, alpha=1.0, roughness=0.9):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgba, alpha)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgba, alpha)
    shader.inputs["Alpha"].default_value = alpha
    shader.inputs["Roughness"].default_value = roughness
    if alpha < 0.999 and hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    return mat


def image_material(image):
    mat = bpy.data.materials.new("Textura · imagem aérea de referência")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    mat.node_tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
    mat.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return mat


def mesh_object(name, vertices, faces, collection, materials=(), face_materials=None):
    mesh = bpy.data.meshes.new(f"{name} · malha editável")
    mesh.from_pydata(vertices, [], faces)
    for mat in materials:
        mesh.materials.append(mat)
    mesh.update(calc_edges=True)
    if face_materials:
        for polygon, material_index in zip(mesh.polygons, face_materials):
            polygon.material_index = material_index
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def signed_area(points):
    return sum(
        points[index][0] * points[(index + 1) % len(points)][1]
        - points[(index + 1) % len(points)][0] * points[index][1]
        for index in range(len(points))
    ) * 0.5


def orient_ring(points, *, ccw):
    points = [(float(point[0]), float(point[1])) for point in points]
    is_ccw = signed_area(points) > 0
    return points if is_ccw == ccw else list(reversed(points))


def world_xy(point, image_width, image_height, world_width, world_height):
    px, py = float(point[0]), float(point[1])
    return (
        (px / image_width - 0.5) * world_width,
        (0.5 - py / image_height) * world_height,
    )


def make_ground(collection, image, world_width, world_height, material_image):
    z = IMAGE_GROUND_Z
    vertices = [
        (-world_width / 2, -world_height / 2, z),
        (world_width / 2, -world_height / 2, z),
        (world_width / 2, world_height / 2, z),
        (-world_width / 2, world_height / 2, z),
    ]
    ground = mesh_object(
        "Chão · imagem aérea texturizada",
        vertices,
        [(0, 1, 2, 3)],
        collection,
        [material_image],
    )
    uv_layer = ground.data.uv_layers.new(name="UV · imagem inteira")
    for loop, uv in zip(ground.data.polygons[0].loop_indices, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv_layer.data[loop].uv = uv
    ground["função"] = "Plano de chão; referência aérea aplicada como textura UV"
    ground["imagem_embutida"] = image.name
    ground["escala_vertical_m"] = world_height
    return ground


def triangulate_rings(rings):
    normalized = []
    for index, ring in enumerate(rings):
        if len(ring) < 3:
            continue
        normalized.append(orient_ring(ring, ccw=(index == 0)))
    if not normalized:
        return [], []
    vectors = [
        [Vector((point[0], point[1], 0.0)) for point in ring]
        for ring in normalized
    ]
    flat = [point for ring in vectors for point in ring]
    triangles = tessellate_polygon(vectors)
    return normalized, [(int(a), int(b), int(c)) for a, b, c in triangles]


def make_roads(road_data, collection, image_size, world_width, world_height, base_mat, segment_mat):
    image_width, image_height = image_size
    underlay_vertices, underlay_faces = [], []
    road_records = []

    for road_index, road in enumerate(road_data["roads"], start=1):
        source_rings = [road["outer"], *(road.get("holes") or [])]
        image_rings, _ = triangulate_rings(source_rings)
        world_rings = [
            orient_ring(
                [world_xy(point, image_width, image_height, world_width, world_height) for point in ring],
                ccw=(ring_index == 0),
            )
            for ring_index, ring in enumerate(image_rings)
        ]
        vectors = [[Vector((x, y, 0.0)) for x, y in ring] for ring in world_rings]
        flat_vectors = [point for ring in vectors for point in ring]
        triangles = tessellate_polygon(vectors)
        if not triangles:
            raise RuntimeError(f"Não foi possível triangular o contorno da via {road_index}.")

        expected_area = max(
            0.0,
            abs(signed_area(world_rings[0]))
            - sum(abs(signed_area(ring)) for ring in world_rings[1:]),
        )
        covered_area = sum(
            abs((flat_vectors[b] - flat_vectors[a]).cross(flat_vectors[c] - flat_vectors[a]).z) * 0.5
            for a, b, c in triangles
        )
        if expected_area and abs(covered_area - expected_area) / expected_area > 0.01:
            raise RuntimeError(
                f"O preenchimento da via {road_index} não cobre o contorno: "
                f"{covered_area:.3f} m² de {expected_area:.3f} m²."
            )

        segment_vertices, segment_faces = [], []
        for triangle in triangles:
            points = [
                (flat_vectors[index].x, flat_vectors[index].y)
                for index in triangle
            ]
            underlay_start = len(underlay_vertices)
            underlay_vertices.extend((x, y, ROAD_BASE_Z) for x, y in points)
            underlay_faces.append((underlay_start, underlay_start + 1, underlay_start + 2))
            segment_start = len(segment_vertices)
            segment_vertices.extend((x, y, ROAD_SEGMENT_Z) for x, y in points)
            segment_faces.append((segment_start, segment_start + 1, segment_start + 2))

        segment = mesh_object(
            f"Rua_{road_index:02d} · segmento reto preenchido",
            segment_vertices,
            segment_faces,
            collection,
            [segment_mat],
        )
        segment["tipo"] = "segmento de rua preenchido por uma face contínua"
        segment["segmento_trace"] = road_index
        segment["furos_preservados"] = len(world_rings) - 1
        road_records.append({
            "number": road_index,
            "triangles": len(triangles),
            "holes": len(world_rings) - 1,
            "areaM2": covered_area,
        })

    underlay = mesh_object(
        "Asfalto · base contínua sem vãos",
        underlay_vertices,
        underlay_faces,
        collection,
        [base_mat],
    )
    underlay["tipo"] = "preenchimento contínuo sob cada segmento reto"
    underlay["traçados"] = len(road_records)
    underlay["policy"] = "cada segmento preenchido; nenhuma junta abre o asfalto"
    return underlay, road_records


def make_lot(name, pixel_points, image_size, world_width, world_height, collection, side_mat, top_mat):
    image_width, image_height = image_size
    points = [world_xy(point, image_width, image_height, world_width, world_height) for point in pixel_points]
    if signed_area(points) < 0:
        points.reverse()
    vectors = [[Vector((x, y, 0.0)) for x, y in points]]
    triangles = tessellate_polygon(vectors)
    if not triangles:
        return None

    count = len(points)
    vertices = [(x, y, LOT_BASE_Z) for x, y in points]
    vertices.extend((x, y, LOT_TOP_Z) for x, y in points)
    faces, material_ids = [], []
    for triangle in triangles:
        faces.append(tuple(reversed(triangle)))
        material_ids.append(0)
        faces.append(tuple(index + count for index in triangle))
        material_ids.append(1)
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, next_index + count, index + count))
        material_ids.append(0)

    obj = mesh_object(name, vertices, faces, collection, [side_mat, top_mat], material_ids)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    obj["tipo"] = "lote traçado na imagem aérea"
    obj["altura_extrusao_m"] = LOT_EXTRUSION_M
    obj["fonte"] = "aerial-lot-trace-v1.json"
    return obj, points


def make_lot_outlines(lots, collection, material_outline):
    curve = bpy.data.curves.new("Limites editáveis · 298 lotes", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = 0.012
    curve.bevel_resolution = 0
    for points in lots:
        spline = curve.splines.new("POLY")
        spline.points.add(len(points) - 1)
        for item, (x, y) in zip(spline.points, points):
            item.co = (x, y, LOT_TOP_Z + 0.006, 1)
        spline.use_cyclic_u = True
    obj = bpy.data.objects.new("Divisas · contorno individual dos lotes", curve)
    collection.objects.link(obj)
    curve.materials.append(material_outline)
    obj["lotes_delimitados"] = len(lots)
    return obj


def make_camera_and_light(root_collection, world_width, world_height):
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("Câmera · vista geral ortográfica")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = world_width * 1.04
    camera_data.clip_end = max(world_width, world_height) * 5
    camera = bpy.data.objects.new("Câmera · vista geral ortográfica", camera_data)
    root_collection.objects.link(camera)
    camera.location = (0, 0, max(world_width, world_height) * 1.8)
    camera.rotation_euler = (0, 0, 0)
    scene.camera = camera

    light_data = bpy.data.lights.new("Luz ampla", "AREA")
    light_data.energy = 2500
    light_data.shape = "DISK"
    light_data.size = world_width * 0.8
    light = bpy.data.objects.new("Luz ampla", light_data)
    root_collection.objects.link(light)
    light.location = (0, 0, world_width * 0.7)


def configure_workspace(world_width, world_height):
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = round(1600 * world_height / world_width)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    scene.render.image_settings.color_mode = "RGBA"

    world = bpy.data.worlds.new("Fundo neutro") if not bpy.data.worlds else bpy.data.worlds[0]
    scene.world = world
    world.color = (0.035, 0.04, 0.05)

    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            space.region_3d.view_perspective = "ORTHO"
            space.region_3d.view_location = (0, 0, 0)
            space.region_3d.view_rotation = (1, 0, 0, 0)
            space.region_3d.view_distance = world_width * 1.22
            space.clip_end = 2000
            space.shading.type = "MATERIAL"


def main():
    for path in (ROAD_TRACE_PATH, LOT_TRACE_PATH, AERIAL_PATH):
        if not path.exists():
            raise FileNotFoundError(path)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    road_data = load_json(ROAD_TRACE_PATH)
    lot_data = load_json(LOT_TRACE_PATH)
    image_width, image_height = lot_data["imageSize"]
    world_height = WORLD_HEIGHT_M
    world_width = world_height * image_width / image_height
    if tuple(road_data["imageSize"]) != (image_width, image_height):
        raise ValueError("Os traçados de lotes e ruas não usam a mesma dimensão de imagem.")

    reset_scene()
    root = add_collection("ALIANÇA PARK · modelo editável alinhado à imagem")
    ground_collection = add_collection("01 · Chão e textura aérea", root)
    lot_collection = add_collection("02 · Lotes editáveis · 298", root)
    outline_collection = add_collection("03 · Divisas dos lotes", root)
    road_collection = add_collection("04 · Ruas · preenchimento contínuo", root)

    image = bpy.data.images.load(str(AERIAL_PATH), check_existing=True)
    if tuple(image.size) != (image_width, image_height):
        raise ValueError(f"Textura {tuple(image.size)} != traçados {(image_width, image_height)}")
    image.pack()
    ground_mat = image_material(image)
    road_base_mat = material("Asfalto · base integral", (0.105, 0.125, 0.15))
    road_segment_mat = material("Asfalto · segmentos preenchidos", (0.17, 0.19, 0.21))
    lot_side_mat = material("Lote · laterais", (0.19, 0.40, 0.27), alpha=0.50)
    lot_top_mat = material("Lote · face superior translúcida", (0.31, 0.68, 0.42), alpha=0.26)
    boundary_mat = material("Divisa · verde escuro", (0.10, 0.25, 0.16), alpha=0.72)

    make_ground(ground_collection, image, world_width, world_height, ground_mat)
    lot_outlines = []
    lot_count = 0
    for name, points in lot_data["lots"].items():
        result = make_lot(
            name,
            points,
            (image_width, image_height),
            world_width,
            world_height,
            lot_collection,
            lot_side_mat,
            lot_top_mat,
        )
        if result:
            _, outline = result
            lot_outlines.append(outline)
            lot_count += 1
    if lot_count != int(lot_data.get("lotCount", lot_count)):
        raise RuntimeError(f"Esperados {lot_data.get('lotCount')} lotes; construídos {lot_count}.")
    make_lot_outlines(lot_outlines, outline_collection, boundary_mat)

    underlay, roads = make_roads(
        road_data,
        road_collection,
        (image_width, image_height),
        world_width,
        world_height,
        road_base_mat,
        road_segment_mat,
    )
    underlay["segmentos_preenchidos"] = len(roads)
    underlay["area_coberta"] = "Todos os polígonos do traçado, inclusive cruzamentos"

    make_camera_and_light(root, world_width, world_height)
    configure_workspace(world_width, world_height)
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    bpy.context.view_layer.objects.active = None
    bpy.ops.file.pack_all()
    bpy.context.scene.render.filepath = str(OUTPUT_PREVIEW)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))

    bpy.ops.render.render(write_still=True)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.name.startswith(("Chão ·", "Lote_", "Divisas ·", "Asfalto ·", "Rua_")):
            obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects.get("Chão · imagem aérea texturizada")
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
    )
    print(
        "BLENDER_MODEL_READY",
        json.dumps(
            {
                "blend": str(OUTPUT_BLEND),
                "glb": str(OUTPUT_GLB),
                "preview": str(OUTPUT_PREVIEW),
                "lots": lot_count,
                "roadTraces": len(roads),
                "roadSegments": len(roads),
                "roadTriangles": sum(record["triangles"] for record in roads),
                "worldWidthM": round(world_width, 3),
                "worldHeightM": round(world_height, 3),
            },
            ensure_ascii=False,
        ),
    )


main()
