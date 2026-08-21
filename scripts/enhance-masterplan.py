"""Build a faithful, lightweight masterplan preview from the source GLB.

Critical geometry (lots, asphalt and curbs) is preserved. Only vegetation and
decorative assets are simplified. The script also writes a small semantic
manifest consumed by the UI overlay layer.
"""

import json
import os
import re

import bpy


SOURCE = "/home/icarogdo/dev/WWW/alianca_park_masterplan_pdf_3d.glb"
TARGET = "/home/icarogdo/dev/WWW/belavista-ai-monitor/assets/model/alianca_park_masterplan_preview.glb"
MANIFEST = "/home/icarogdo/dev/WWW/belavista-ai-monitor/assets/model/masterplan-manifest.json"

ROAD_RE = re.compile(r"asfalto|rua|road|street|meio.?fio|guia|paviment", re.I)
LOT_RE = re.compile(r"lote|quadra|gleba|divisa", re.I)
TREE_RE = re.compile(r"arvore|tree|tronco|copa|folhagem", re.I)
ANNOTATION_RE = re.compile(r"^cota|label|text|annotation", re.I)


def role_for(name: str) -> str:
    if ANNOTATION_RE.search(name):
        return "annotation"
    if ROAD_RE.search(name):
        return "street"
    if LOT_RE.search(name):
        return "lot"
    if TREE_RE.search(name):
        return "landscape"
    return "asset"


def material_for(obj, role: str):
    if role == "street":
        color = (0.075, 0.105, 0.13, 1.0)
        roughness = 0.78
    elif role == "lot":
        color = (0.18, 0.42, 0.22, 1.0)
        roughness = 0.92
    elif role == "landscape":
        color = (0.10, 0.28, 0.13, 1.0)
        roughness = 1.0
    else:
        color = (0.45, 0.48, 0.43, 1.0)
        roughness = 0.86

    if not obj.data.materials:
        mat = bpy.data.materials.new(f"Belavista_{role}")
        obj.data.materials.append(mat)

    for mat in obj.data.materials:
        if not mat:
            continue
        mat.diffuse_color = color
        mat.roughness = roughness
        mat.use_nodes = True
        principled = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
        if principled:
            principled.inputs["Base Color"].default_value = color
            principled.inputs["Roughness"].default_value = roughness


def apply_modifier(obj, name: str):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.modifier_apply(modifier=name)
    finally:
        obj.select_set(False)


def add_road_finish(obj):
    """Give flat PDF-derived roads a small, clean physical edge."""
    if obj.name.lower().startswith("asfalto"):
        solidify = obj.modifiers.new("street-surface-depth", "SOLIDIFY")
        solidify.thickness = 0.72
        solidify.offset = -1.0
        bevel = obj.modifiers.new("street-edge-softness", "BEVEL")
        bevel.width = 0.22
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        apply_modifier(obj, solidify.name)
        apply_modifier(obj, bevel.name)
    elif "meio" in obj.name.lower() or "guia" in obj.name.lower():
        bevel = obj.modifiers.new("curb-edge-softness", "BEVEL")
        bevel.width = 0.16
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        apply_modifier(obj, bevel.name)


def simplify_noncritical(obj, role: str):
    if role == "landscape":
        ratio = 0.16
    elif role == "asset":
        ratio = 0.34
    else:
        return
    if len(obj.data.polygons) <= 120:
        return
    modifier = obj.modifiers.new("preview-safe-decimate", "DECIMATE")
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = False
    apply_modifier(obj, modifier.name)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)

# Keep the local first-load budget bounded while retaining crisp map detail.
for image in bpy.data.images:
    if image.size[0] > 1024 or image.size[1] > 1024:
        ratio = min(1024 / image.size[0], 1024 / image.size[1])
        image.scale(max(1, int(image.size[0] * ratio)), max(1, int(image.size[1] * ratio)))

manifest = {
    "source": os.path.basename(SOURCE),
    "version": 2,
    "roles": {"lots": [], "streets": [], "landscape": [], "assets": []},
    "preserved": [],
}

for obj in list(bpy.context.scene.objects):
    if obj.type != "MESH":
        continue

    role = role_for(obj.name)
    if role == "annotation":
        # Lot dimension labels are represented by the UI overlay and are
        # extremely expensive triangulated text meshes in the source GLB.
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    key = "lots" if role == "lot" else "streets" if role == "street" else "landscape" if role == "landscape" else "assets"
    obj["belavistaRole"] = role
    obj["overlaySelectable"] = role in {"lot", "street"}
    obj["overlayId"] = obj.name
    obj["sourceGeometry"] = "pdf-masterplan"
    manifest["roles"][key].append(obj.name)

    material_for(obj, role)
    if role in {"lot", "street"}:
        manifest["preserved"].append(obj.name)
        obj["geometryPolicy"] = "preserved"
        if role == "street":
            add_road_finish(obj)
    else:
        obj["geometryPolicy"] = "simplified"
        simplify_noncritical(obj, role)

    for poly in obj.data.polygons:
        poly.use_smooth = role == "landscape"

with open(MANIFEST, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, ensure_ascii=False, indent=2)

bpy.ops.export_scene.gltf(
    filepath=TARGET,
    export_format="GLB",
    export_image_format="JPEG",
    export_jpeg_quality=78,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_extras=True,
)

print(
    "MASTERPLAN_PREVIEW_READY",
    f"lots={len(manifest['roles']['lots'])}",
    f"streets={len(manifest['roles']['streets'])}",
    f"landscape={len(manifest['roles']['landscape'])}",
    f"assets={len(manifest['roles']['assets'])}",
    f"target={TARGET}",
    f"manifest={MANIFEST}",
)
