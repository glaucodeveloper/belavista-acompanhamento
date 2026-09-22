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
TREE_RE = re.compile(r"arvore|tree|tronco|copa|folhagem|outer.?east.?row|upper.?median.?row", re.I)
LEISURE_RE = re.compile(r"area.?de.?lazer|pavilhao|play|praca|court|gym.?pad|quadra|esporte|piscina|clube", re.I)
ANNOTATION_RE = re.compile(r"^cota|label|text|annotation", re.I)
# The PDF is a presentation-grade masterplan: its vegetation, leisure area and
# access details are part of the spatial reading, not disposable decoration.
# Preserve them, but simplify their geometry enough for an interactive GLB.
KEEP_LANDSCAPE = True


def role_for(name: str) -> str:
    if ANNOTATION_RE.search(name):
        return "annotation"
    if ROAD_RE.search(name):
        return "street"
    if LOT_RE.search(name):
        return "lot"
    if TREE_RE.search(name):
        return "landscape"
    if LEISURE_RE.search(name):
        return "leisure"
    return "asset"


def material_for(obj, role: str):
    """Preserve source colors/textures and only improve PBR response.

    The previous preview replaced every source material with flat colors. That
    made a genuine GLB look like a diagram and lost the grey paving, green
    landscape and warm leisure/building accents visible in the PDF.
    """
    if role == "street":
        color = (0.075, 0.105, 0.13, 1.0)
        roughness = 0.78
    elif role == "lot":
        color = (0.18, 0.42, 0.22, 1.0)
        roughness = 0.92
    elif role == "landscape":
        color = (0.12, 0.34, 0.15, 1.0)
        roughness = 0.96
    elif role == "leisure":
        color = (0.46, 0.49, 0.43, 1.0)
        roughness = 0.72
    else:
        color = (0.45, 0.48, 0.43, 1.0)
        roughness = 0.86

    if not obj.data.materials:
        mat = bpy.data.materials.new(f"Belavista_{role}")
        obj.data.materials.append(mat)

    for mat in obj.data.materials:
        if not mat:
            continue
        mat.use_nodes = True
        principled = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
        if principled:
            # Only choose an art-directed base color for meshes without a
            # meaningful original material. Existing bitmap/vector-derived
            # color stays untouched to match the masterplan reference.
            has_image = any(node.type == "TEX_IMAGE" and node.image for node in mat.node_tree.nodes)
            if not has_image and mat.name.startswith("Belavista_"):
                principled.inputs["Base Color"].default_value = color
                mat.diffuse_color = color
            principled.inputs["Roughness"].default_value = roughness
            if "Specular IOR Level" in principled.inputs:
                principled.inputs["Specular IOR Level"].default_value = 0.28 if role == "street" else 0.18


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
        # The PDF places trees as spatial landmarks. Do not decimate these
        # meshes: the three-layer crowns and their local transforms are part
        # of the reference, not disposable decoration.
        return
    elif role == "leisure":
        # Courts, playgrounds, the pavilion and the circular plaza are the
        # recognizable leisure structures from the PDF. Keep every component.
        return
    elif role == "asset":
        # Buildings, playgrounds, sports courts and entrance elements are key
        # landmarks in the supplied PDF. Retain their silhouette and details.
        if re.search(r"pavilhao|portaria|quadra|court|play|lazer|praca|entrada", obj.name, re.I):
            return
        ratio = 0.48
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
    if image.size[0] > 1536 or image.size[1] > 1536:
        ratio = min(1536 / image.size[0], 1536 / image.size[1])
        image.scale(max(1, int(image.size[0] * ratio)), max(1, int(image.size[1] * ratio)))

manifest = {
    "source": os.path.basename(SOURCE),
    "version": 3,
    "roles": {"lots": [], "streets": [], "landscape": [], "leisure": [], "assets": []},
    "preserved": [],
    "placement": {
        "reference": "Demonstrativo_Software_Gestao_Loteamento_atualizado.pdf",
        "policy": "preserve-local-transforms",
        "treeGroups": ["Arvore_PDF", "Outer_East_Row", "Upper_Median_Row"],
        "leisureGroups": ["Area_de_lazer", "Pavilhao", "Play", "Praca", "Court", "Gym_Pad"],
    },
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
    key = "lots" if role == "lot" else "streets" if role == "street" else "landscape" if role == "landscape" else "leisure" if role == "leisure" else "assets"
    obj["belavistaRole"] = role
    obj["overlaySelectable"] = role in {"lot", "street", "leisure"}
    obj["overlayId"] = obj.name
    obj["sourceGeometry"] = "pdf-masterplan"
    if role in {"landscape", "leisure"}:
        # Keep the exact placement from the PDF-derived source. In particular,
        # do not apply origin, scale or rotation corrections object by object;
        # the parent masterplan frame performs the only global conversion.
        obj["placementSource"] = "pdf-masterplan"
        obj["placementPolicy"] = "locked-local-transform"
    manifest["roles"][key].append(obj.name)

    if role == "landscape" and not KEEP_LANDSCAPE:
        # Vegetation is ornamental in this preview and accounts for hundreds
        # of draw calls. Keep its names in the manifest for provenance, but
        # omit it from the interactive local GLB so lots and streets stay fast.
        bpy.data.objects.remove(obj, do_unlink=True)
        continue

    material_for(obj, role)
    if role in {"lot", "street"}:
        manifest["preserved"].append(obj.name)
        obj["geometryPolicy"] = "preserved"
        if role == "street":
            add_road_finish(obj)
    else:
        obj["geometryPolicy"] = "preserved-detailed" if role in {"landscape", "leisure"} else "simplified"
        simplify_noncritical(obj, role)

    for poly in obj.data.polygons:
        poly.use_smooth = role == "landscape"

with open(MANIFEST, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, ensure_ascii=False, indent=2)

bpy.ops.export_scene.gltf(
    filepath=TARGET,
    export_format="GLB",
    export_image_format="JPEG",
    export_jpeg_quality=88,
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
